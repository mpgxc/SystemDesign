import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { create } from 'zustand';

import { getComponentSpec } from '@/domain/catalog';
import { getProtocolSpec, suggestProtocol } from '@/domain/protocols';
import type {
  AppEdge,
  AppNode,
  ComponentNode,
  ComponentNodeData,
  ConnectionData,
  ContextNode,
  ContextTone,
  DesignDocument,
  DesignFlow,
  NoteNode,
} from '@/domain/types';
import { absolutePosition, centerOf, DEFAULT_SIZE, findContextAt, isDescendant, sizeOf, sortNodes } from '@/lib/geometry';
import { newId } from '@/lib/id';
import { buildDocument, loadFromStorage, saveToStorage } from '@/lib/persistence';

export type EdgeShape = 'smoothstep' | 'bezier' | 'straight';

export interface Settings {
  animate: boolean;
  speed: number;
  snapToGrid: boolean;
  showMinimap: boolean;
  showGrid: boolean;
  showLabels: boolean;
  edgeShape: EdgeShape;
  dimOutsideFlow: boolean;
}

export interface Playback {
  flowId: string | null;
  index: number;
  playing: boolean;
  loop: boolean;
  /** Duracao de cada passo, em ms. */
  stepDuration: number;
}

interface Snapshot {
  nodes: AppNode[];
  edges: AppEdge[];
  flows: DesignFlow[];
  name: string;
}

const TONES: ContextTone[] = ['violet', 'sky', 'emerald', 'amber', 'rose', 'slate'];
const HISTORY_LIMIT = 80;

const cloneSnapshot = (s: Snapshot): Snapshot => ({
  nodes: structuredClone(s.nodes),
  edges: structuredClone(s.edges),
  flows: structuredClone(s.flows),
  name: s.name,
});

export interface DesignerState {
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  flows: DesignFlow[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  past: Snapshot[];
  future: Snapshot[];
  settings: Settings;
  playback: Playback;
  clipboard: { nodes: AppNode[]; edges: AppEdge[] } | null;

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  selectOnly: (nodeIds: string[], edgeIds: string[]) => void;
  groupSelection: () => string | null;
  fitContexts: () => void;

  addComponent: (kind: string, position: XYPosition) => string;
  addContext: (position: XYPosition) => string;
  addNote: (position: XYPosition) => string;
  updateNodeData: (id: string, patch: Partial<ComponentNodeData & { text: string; tone: ContextTone }>) => void;
  updateNodeProp: (id: string, key: string, value: string) => void;
  updateEdgeData: (id: string, patch: Partial<ConnectionData>) => void;
  updateEdgeProp: (id: string, key: string, value: string) => void;
  changeProtocol: (id: string, protocol: string) => void;
  reverseEdge: (id: string) => void;

  reparentNode: (id: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  paste: (position?: XYPosition) => void;

  createFlow: (name?: string) => string;
  updateFlow: (id: string, patch: Partial<Omit<DesignFlow, 'id' | 'steps'>>) => void;
  deleteFlow: (id: string) => void;
  addStep: (flowId: string, edgeId: string, caption?: string) => void;
  removeStep: (flowId: string, stepId: string) => void;
  moveStep: (flowId: string, stepId: string, direction: -1 | 1) => void;
  setStepCaption: (flowId: string, stepId: string, caption: string) => void;
  captureSelectedEdges: (flowId: string) => void;

  playFlow: (flowId?: string) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaybackIndex: (index: number) => void;
  setPlaybackOption: <K extends keyof Playback>(key: K, value: Playback[K]) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setName: (name: string) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  loadDocument: (doc: DesignDocument) => void;
  resetDocument: () => void;
  toDocument: () => DesignDocument;
  persist: () => void;
}

function createComponentNode(kind: string, position: XYPosition): ComponentNode {
  const spec = getComponentSpec(kind);
  return {
    id: newId('n'),
    type: 'component',
    position,
    data: {
      kind,
      label: spec.label,
      description: '',
      tech: spec.techHint ?? '',
      scale: '',
      status: 'default',
      props: { ...(spec.defaults ?? {}) },
    },
  };
}

function createConnection(connection: Connection, nodes: AppNode[]): AppEdge {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const source = byId.get(connection.source);
  const target = byId.get(connection.target);
  const sourceKind = source?.type === 'component' ? (source.data as ComponentNodeData).kind : undefined;
  const targetKind = target?.type === 'component' ? (target.data as ComponentNodeData).kind : undefined;
  const protocol = suggestProtocol(sourceKind, targetKind);
  const spec = getProtocolSpec(protocol);

  return {
    ...connection,
    id: newId('e'),
    type: 'connection',
    data: {
      protocol,
      label: '',
      props: { ...(spec.defaults ?? {}) },
      bidirectional: spec.duplex ?? false,
    },
  };
}

/** Remove os nos pedidos junto de seus descendentes, arestas e passos de fluxo. */
function pruneGraph(state: Snapshot, nodeIds: string[], edgeIds: string[]): Snapshot {
  const byId = new Map(state.nodes.map((n) => [n.id, n]));
  const doomed = new Set(nodeIds);
  for (const node of state.nodes) {
    if (nodeIds.some((id) => isDescendant(node.id, id, byId))) doomed.add(node.id);
  }

  const nodes = state.nodes.filter((n) => !doomed.has(n.id));
  const removedEdges = new Set(edgeIds);
  for (const edge of state.edges) {
    if (doomed.has(edge.source) || doomed.has(edge.target)) removedEdges.add(edge.id);
  }

  const edges = state.edges.filter((e) => !removedEdges.has(e.id));
  const flows = state.flows.map((flow) => ({ ...flow, steps: flow.steps.filter((s) => !removedEdges.has(s.edgeId)) }));

  return { ...state, nodes, edges, flows };
}

const INITIAL_SETTINGS: Settings = {
  animate: true,
  speed: 1,
  snapToGrid: true,
  showMinimap: true,
  showGrid: true,
  showLabels: true,
  edgeShape: 'smoothstep',
  dimOutsideFlow: true,
};

const INITIAL_PLAYBACK: Playback = { flowId: null, index: 0, playing: false, loop: true, stepDuration: 1600 };

export const useDesigner = create<DesignerState>()((set, get) => {
  const snapshot = (): Snapshot => {
    const { nodes, edges, flows, name } = get();
    return cloneSnapshot({ nodes, edges, flows, name });
  };

  const commit = () => {
    set((state) => ({ past: [...state.past, snapshot()].slice(-HISTORY_LIMIT), future: [] }));
  };

  return {
    name: 'Nova arquitetura',
    nodes: [],
    edges: [],
    flows: [],
    selectedNodeIds: [],
    selectedEdgeIds: [],
    past: [],
    future: [],
    settings: INITIAL_SETTINGS,
    playback: INITIAL_PLAYBACK,
    clipboard: null,

    onNodesChange: (changes) => {
      const removals = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removals.length) commit();

      set((state) => {
        const nodes = applyNodeChanges<AppNode>(changes, state.nodes);
        if (!removals.length) return { nodes: sortNodes(nodes) };
        const pruned = pruneGraph({ nodes, edges: state.edges, flows: state.flows, name: state.name }, removals, []);
        return { nodes: sortNodes(pruned.nodes), edges: pruned.edges, flows: pruned.flows };
      });
      get().persist();
    },

    onEdgesChange: (changes) => {
      const removals = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removals.length) commit();

      set((state) => {
        const edges = applyEdgeChanges<AppEdge>(changes, state.edges);
        if (!removals.length) return { edges };
        const removed = new Set(removals);
        return { edges, flows: state.flows.map((f) => ({ ...f, steps: f.steps.filter((s) => !removed.has(s.edgeId)) })) };
      });
      get().persist();
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      commit();
      set((state) => ({ edges: addEdge(createConnection(connection, state.nodes), state.edges) }));
      get().persist();
    },

    setSelection: (nodeIds, edgeIds) => set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds }),

    selectOnly: (nodeIds, edgeIds) => {
      const nodeSet = new Set(nodeIds);
      const edgeSet = new Set(edgeIds);
      set((state) => ({
        nodes: state.nodes.map((n) => ({ ...n, selected: nodeSet.has(n.id) }) as AppNode),
        edges: state.edges.map((e) => ({ ...e, selected: edgeSet.has(e.id) })),
        selectedNodeIds: nodeIds,
        selectedEdgeIds: edgeIds,
      }));
    },

    /**
     * Redimensiona cada contexto para caber os filhos. Depende das medidas
     * reais dos nos, entao so faz sentido depois que o canvas ja renderizou.
     */
    fitContexts: () => {
      const state = get();
      const contexts = state.nodes.filter((n) => n.type === 'context');
      if (!contexts.length) return;

      const padding = { top: 68, side: 26, bottom: 28 };
      let changed = false;
      const sizes = new Map<string, { width: number; height: number }>();
      const shifts = new Map<string, { x: number; y: number }>();

      // Do mais profundo para o mais raso: um contexto aninhado precisa estar
      // dimensionado antes de o pai medir a propria area.
      const ordered = [...contexts].reverse();

      for (const context of ordered) {
        const children = state.nodes.filter((n) => n.parentId === context.id);
        if (!children.length) continue;

        const boxes = children.map((child) => {
          const size = sizes.get(child.id) ?? sizeOf(child);
          return {
            x1: child.position.x,
            y1: child.position.y,
            x2: child.position.x + size.width,
            y2: child.position.y + size.height,
          };
        });

        const minX = Math.min(...boxes.map((b) => b.x1));
        const minY = Math.min(...boxes.map((b) => b.y1));
        const shiftX = padding.side - minX;
        const shiftY = padding.top - minY;

        const width = Math.round(Math.max(...boxes.map((b) => b.x2)) + shiftX + padding.side);
        const height = Math.round(Math.max(...boxes.map((b) => b.y2)) + shiftY + padding.bottom);
        const current = sizeOf(context);

        if (Math.abs(shiftX) > 1 || Math.abs(shiftY) > 1) {
          for (const child of children) shifts.set(child.id, { x: shiftX, y: shiftY });
          changed = true;
        }
        if (Math.abs(current.width - width) > 1 || Math.abs(current.height - height) > 1) {
          sizes.set(context.id, { width, height });
          changed = true;
        }
      }

      if (!changed) return;
      commit();
      set((current) => ({
        nodes: current.nodes.map((node) => {
          const size = sizes.get(node.id);
          const shift = shifts.get(node.id);
          if (!size && !shift) return node;
          return {
            ...node,
            ...(size ? { width: size.width, height: size.height, style: { ...node.style, width: size.width, height: size.height } } : {}),
            ...(shift ? { position: { x: node.position.x + shift.x, y: node.position.y + shift.y } } : {}),
          } as AppNode;
        }),
      }));
      get().persist();
    },

    /** Envolve a selecao atual em um novo contexto, preservando as posicoes. */
    groupSelection: () => {
      const state = get();
      const selected = state.nodes.filter((n) => state.selectedNodeIds.includes(n.id) && n.type !== 'context');
      if (selected.length < 1) return null;

      const byId = new Map(state.nodes.map((n) => [n.id, n]));
      const boxes = selected.map((node) => {
        const pos = absolutePosition(node, byId);
        const size = sizeOf(node);
        return { x1: pos.x, y1: pos.y, x2: pos.x + size.width, y2: pos.y + size.height };
      });

      const padding = { x: 28, y: 52 };
      const x1 = Math.min(...boxes.map((b) => b.x1)) - padding.x;
      const y1 = Math.min(...boxes.map((b) => b.y1)) - padding.y;
      const x2 = Math.max(...boxes.map((b) => b.x2)) + padding.x;
      const y2 = Math.max(...boxes.map((b) => b.y2)) + padding.y;

      commit();
      const index = state.nodes.filter((n) => n.type === 'context').length;
      const context: ContextNode = {
        id: newId('ctx'),
        type: 'context',
        position: { x: x1, y: y1 },
        width: Math.round(x2 - x1),
        height: Math.round(y2 - y1),
        dragHandle: '.context-handle',
        data: { label: `Contexto ${index + 1}`, description: '', tone: TONES[index % TONES.length] },
      };

      const members = new Set(selected.map((n) => n.id));
      set((current) => ({
        nodes: sortNodes([
          ...current.nodes.map((node) => {
            if (!members.has(node.id)) return node;
            const absolute = absolutePosition(node, byId);
            return {
              ...node,
              parentId: context.id,
              position: { x: absolute.x - x1, y: absolute.y - y1 },
            } as AppNode;
          }),
          context,
        ]),
      }));
      get().persist();
      return context.id;
    },

    addComponent: (kind, position) => {
      commit();
      const node = createComponentNode(kind, position);
      set((state) => {
        const parent = findContextAt(state.nodes, position);
        if (parent) {
          const origin = absolutePosition(parent, new Map(state.nodes.map((n) => [n.id, n])));
          node.parentId = parent.id;
          node.position = { x: position.x - origin.x, y: position.y - origin.y };
        }
        return { nodes: sortNodes([...state.nodes, node]) };
      });
      get().persist();
      return node.id;
    },

    addContext: (position) => {
      commit();
      const index = get().nodes.filter((n) => n.type === 'context').length;
      const node: ContextNode = {
        id: newId('ctx'),
        type: 'context',
        position,
        width: DEFAULT_SIZE.context.width,
        height: DEFAULT_SIZE.context.height,
        dragHandle: '.context-handle',
        data: { label: `Contexto ${index + 1}`, description: '', tone: TONES[index % TONES.length] },
      };
      set((state) => ({ nodes: sortNodes([...state.nodes, node]) }));
      get().persist();
      return node.id;
    },

    addNote: (position) => {
      commit();
      const node: NoteNode = {
        id: newId('note'),
        type: 'note',
        position,
        width: DEFAULT_SIZE.note.width,
        data: { text: 'Anotacao: decisao, trade-off ou risco.', tone: 'amber' },
      };
      set((state) => ({ nodes: sortNodes([...state.nodes, node]) }));
      get().persist();
      return node.id;
    },

    updateNodeData: (id, patch) => {
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n)),
      }));
      get().persist();
    },

    updateNodeProp: (id, key, value) => {
      set((state) => ({
        nodes: state.nodes.map((n) => {
          if (n.id !== id || n.type !== 'component') return n;
          const data = n.data as ComponentNodeData;
          return { ...n, data: { ...data, props: { ...data.props, [key]: value } } } as AppNode;
        }),
      }));
      get().persist();
    },

    updateEdgeData: (id, patch) => {
      set((state) => ({
        edges: state.edges.map((e) =>
          e.id === id ? { ...e, data: { ...(e.data ?? { protocol: 'rest', props: {} }), ...patch } } : e,
        ),
      }));
      get().persist();
    },

    updateEdgeProp: (id, key, value) => {
      set((state) => ({
        edges: state.edges.map((e) => {
          if (e.id !== id) return e;
          const data = e.data ?? { protocol: 'rest', props: {} };
          return { ...e, data: { ...data, props: { ...data.props, [key]: value } } };
        }),
      }));
      get().persist();
    },

    changeProtocol: (id, protocol) => {
      commit();
      const spec = getProtocolSpec(protocol);
      set((state) => ({
        edges: state.edges.map((e) => {
          if (e.id !== id) return e;
          const data = e.data ?? { protocol, props: {} };
          return { ...e, data: { ...data, protocol, props: { ...(spec.defaults ?? {}) }, bidirectional: spec.duplex ?? false } };
        }),
      }));
      get().persist();
    },

    reverseEdge: (id) => {
      commit();
      set((state) => ({
        edges: state.edges.map((e) =>
          e.id === id
            ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle }
            : e,
        ),
      }));
      get().persist();
    },

    /**
     * Reavalia o contexto dono do no depois do arraste. Os filhos nao usam
     * `extent: 'parent'` de proposito: preso ao pai seria impossivel tirar um
     * componente do contexto arrastando.
     */
    reparentNode: (id) => {
      const state = get();
      const node = state.nodes.find((n) => n.id === id);
      if (!node) return;

      const byId = new Map(state.nodes.map((n) => [n.id, n]));
      const center = centerOf(node, byId);
      const context = findContextAt(state.nodes, center, [id]);
      const nextParent = context?.id;
      if (nextParent === node.parentId) return;

      commit();
      const absolute = absolutePosition(node, byId);
      const origin = context ? absolutePosition(context, byId) : { x: 0, y: 0 };

      set((current) => ({
        nodes: sortNodes(
          current.nodes.map((n) =>
            n.id === id
              ? ({
                  ...n,
                  parentId: nextParent,
                  position: { x: absolute.x - origin.x, y: absolute.y - origin.y },
                } as AppNode)
              : n,
          ),
        ),
      }));
      get().persist();
    },

    deleteSelection: () => {
      const { selectedNodeIds, selectedEdgeIds } = get();
      if (!selectedNodeIds.length && !selectedEdgeIds.length) return;
      commit();
      set((state) => {
        const pruned = pruneGraph(
          { nodes: state.nodes, edges: state.edges, flows: state.flows, name: state.name },
          selectedNodeIds,
          selectedEdgeIds,
        );
        return { ...pruned, selectedNodeIds: [], selectedEdgeIds: [] };
      });
      get().persist();
    },

    copySelection: () => {
      const { nodes, edges, selectedNodeIds } = get();
      if (!selectedNodeIds.length) return;
      const picked = new Set(selectedNodeIds);
      set({
        clipboard: {
          nodes: structuredClone(nodes.filter((n) => picked.has(n.id))),
          edges: structuredClone(edges.filter((e) => picked.has(e.source) && picked.has(e.target))),
        },
      });
    },

    paste: (position) => {
      const clipboard = get().clipboard;
      if (!clipboard?.nodes.length) return;
      commit();

      const idMap = new Map(clipboard.nodes.map((n) => [n.id, newId(n.type === 'context' ? 'ctx' : 'n')]));
      const offset = position ?? { x: 48, y: 48 };
      const anchor = clipboard.nodes[0].position;

      const nodes = clipboard.nodes.map((n) => ({
        ...n,
        id: idMap.get(n.id) as string,
        parentId: n.parentId ? idMap.get(n.parentId) : undefined,
        selected: true,
        position: position
          ? { x: offset.x + (n.position.x - anchor.x), y: offset.y + (n.position.y - anchor.y) }
          : { x: n.position.x + offset.x, y: n.position.y + offset.y },
      })) as AppNode[];

      const edges = clipboard.edges.map((e) => ({
        ...e,
        id: newId('e'),
        source: idMap.get(e.source) as string,
        target: idMap.get(e.target) as string,
      }));

      set((state) => ({
        nodes: sortNodes([...state.nodes.map((n) => ({ ...n, selected: false }) as AppNode), ...nodes]),
        edges: [...state.edges, ...edges],
        selectedNodeIds: nodes.map((n) => n.id),
      }));
      get().persist();
    },

    duplicateSelection: () => {
      get().copySelection();
      get().paste();
    },

    createFlow: (name) => {
      commit();
      const index = get().flows.length;
      const flow: DesignFlow = {
        id: newId('flow'),
        name: name ?? `Fluxo ${index + 1}`,
        description: '',
        tone: TONES[index % TONES.length],
        steps: [],
      };
      set((state) => ({ flows: [...state.flows, flow] }));
      get().persist();
      return flow.id;
    },

    updateFlow: (id, patch) => {
      set((state) => ({ flows: state.flows.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
      get().persist();
    },

    deleteFlow: (id) => {
      commit();
      set((state) => ({
        flows: state.flows.filter((f) => f.id !== id),
        playback: state.playback.flowId === id ? INITIAL_PLAYBACK : state.playback,
      }));
      get().persist();
    },

    addStep: (flowId, edgeId, caption) => {
      commit();
      set((state) => ({
        flows: state.flows.map((f) =>
          f.id === flowId ? { ...f, steps: [...f.steps, { id: newId('step'), edgeId, caption: caption ?? '' }] } : f,
        ),
      }));
      get().persist();
    },

    removeStep: (flowId, stepId) => {
      commit();
      set((state) => ({
        flows: state.flows.map((f) => (f.id === flowId ? { ...f, steps: f.steps.filter((s) => s.id !== stepId) } : f)),
      }));
      get().persist();
    },

    moveStep: (flowId, stepId, direction) => {
      commit();
      set((state) => ({
        flows: state.flows.map((flow) => {
          if (flow.id !== flowId) return flow;
          const index = flow.steps.findIndex((s) => s.id === stepId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= flow.steps.length) return flow;
          const steps = [...flow.steps];
          [steps[index], steps[target]] = [steps[target], steps[index]];
          return { ...flow, steps };
        }),
      }));
      get().persist();
    },

    setStepCaption: (flowId, stepId, caption) => {
      set((state) => ({
        flows: state.flows.map((f) =>
          f.id === flowId ? { ...f, steps: f.steps.map((s) => (s.id === stepId ? { ...s, caption } : s)) } : f,
        ),
      }));
      get().persist();
    },

    captureSelectedEdges: (flowId) => {
      const { selectedEdgeIds, edges } = get();
      if (!selectedEdgeIds.length) return;
      commit();
      const ordered = edges.filter((e) => selectedEdgeIds.includes(e.id));
      set((state) => ({
        flows: state.flows.map((f) =>
          f.id === flowId
            ? { ...f, steps: [...f.steps, ...ordered.map((e) => ({ id: newId('step'), edgeId: e.id, caption: '' }))] }
            : f,
        ),
      }));
      get().persist();
    },

    playFlow: (flowId) => {
      const state = get();
      const id = flowId ?? state.playback.flowId ?? state.flows[0]?.id ?? null;
      if (!id) return;
      const flow = state.flows.find((f) => f.id === id);
      if (!flow || !flow.steps.length) return;
      const restart = state.playback.flowId !== id || state.playback.index >= flow.steps.length;
      set({ playback: { ...state.playback, flowId: id, playing: true, index: restart ? 0 : state.playback.index } });
    },

    pausePlayback: () => set((state) => ({ playback: { ...state.playback, playing: false } })),
    stopPlayback: () => set((state) => ({ playback: { ...state.playback, playing: false, index: 0, flowId: null } })),

    stepForward: () => {
      const { flows, playback } = get();
      const flow = flows.find((f) => f.id === playback.flowId);
      if (!flow || !flow.steps.length) return;
      const next = playback.index + 1;
      if (next < flow.steps.length) {
        set({ playback: { ...playback, index: next } });
      } else if (playback.loop) {
        set({ playback: { ...playback, index: 0 } });
      } else {
        set({ playback: { ...playback, playing: false, index: flow.steps.length - 1 } });
      }
    },

    stepBackward: () => {
      const { flows, playback } = get();
      const flow = flows.find((f) => f.id === playback.flowId);
      if (!flow || !flow.steps.length) return;
      const prev = playback.index - 1;
      set({ playback: { ...playback, index: prev < 0 ? flow.steps.length - 1 : prev } });
    },

    setPlaybackIndex: (index) => set((state) => ({ playback: { ...state.playback, index } })),
    setPlaybackOption: (key, value) => set((state) => ({ playback: { ...state.playback, [key]: value } })),

    updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
    setName: (name) => {
      set({ name });
      get().persist();
    },

    commit,

    undo: () => {
      const { past } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set((state) => ({
        past: state.past.slice(0, -1),
        future: [...state.future, snapshot()].slice(-HISTORY_LIMIT),
        nodes: previous.nodes,
        edges: previous.edges,
        flows: previous.flows,
        name: previous.name,
      }));
      get().persist();
    },

    redo: () => {
      const { future } = get();
      const next = future.at(-1);
      if (!next) return;
      set((state) => ({
        future: state.future.slice(0, -1),
        past: [...state.past, snapshot()].slice(-HISTORY_LIMIT),
        nodes: next.nodes,
        edges: next.edges,
        flows: next.flows,
        name: next.name,
      }));
      get().persist();
    },

    loadDocument: (doc) => {
      commit();
      set({
        name: doc.name,
        nodes: sortNodes(doc.nodes),
        edges: doc.edges,
        flows: doc.flows ?? [],
        selectedNodeIds: [],
        selectedEdgeIds: [],
        playback: INITIAL_PLAYBACK,
      });
      get().persist();
    },

    resetDocument: () => {
      commit();
      set({
        name: 'Nova arquitetura',
        nodes: [],
        edges: [],
        flows: [],
        selectedNodeIds: [],
        selectedEdgeIds: [],
        playback: INITIAL_PLAYBACK,
      });
      get().persist();
    },

    toDocument: () => {
      const { name, nodes, edges, flows } = get();
      return buildDocument(name, nodes, edges, flows);
    },

    persist: () => {
      saveToStorage(get().toDocument());
    },
  };
});

/** Documento salvo na sessao anterior, se existir. */
export const restoreDocument = (): DesignDocument | null => loadFromStorage();

export const selectActiveFlow = (state: DesignerState): DesignFlow | undefined =>
  state.flows.find((f) => f.id === state.playback.flowId);

export const selectActiveStepEdgeId = (state: DesignerState): string | null => {
  const flow = selectActiveFlow(state);
  return flow?.steps[state.playback.index]?.edgeId ?? null;
};
