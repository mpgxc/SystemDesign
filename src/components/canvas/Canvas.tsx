import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Connection,
  type IsValidConnection,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useCallback, useRef, type DragEvent } from 'react';

import { accentOf } from '@/domain/catalog';
import { toneOf } from '@/domain/tones';
import type { AppEdge, AppNode, ComponentNodeData } from '@/domain/types';
import { useDesigner } from '@/store/designer';
import ComponentNodeView from './nodes/ComponentNodeView';
import ContextNodeView from './nodes/ContextNodeView';
import NoteNodeView from './nodes/NoteNodeView';
import ConnectionEdge from './edges/ConnectionEdge';
import EdgeMarkers from './EdgeMarkers';
import FlowHud from './FlowHud';

export const PALETTE_MIME = 'application/x-system-design-component';

const nodeTypes: NodeTypes = {
  component: ComponentNodeView,
  context: ContextNodeView,
  note: NoteNodeView,
};

const edgeTypes: EdgeTypes = { connection: ConnectionEdge };

const NODE_OFFSET = { x: 106, y: 48 };

function minimapColor(node: AppNode): string {
  // Contextos entram translucidos para nao cobrir os componentes de dentro.
  if (node.type === 'context') return `${toneOf(node.data.tone as never).accent}33`;
  if (node.type === 'note') return '#fbbf24';
  return accentOf((node.data as ComponentNodeData).kind);
}

export default function Canvas() {
  const nodes = useDesigner((s) => s.nodes);
  const edges = useDesigner((s) => s.edges);
  const settings = useDesigner((s) => s.settings);
  const onNodesChange = useDesigner((s) => s.onNodesChange);
  const onEdgesChange = useDesigner((s) => s.onEdgesChange);
  const onConnect = useDesigner((s) => s.onConnect);
  const addComponent = useDesigner((s) => s.addComponent);
  const setSelection = useDesigner((s) => s.setSelection);
  const reparentNode = useDesigner((s) => s.reparentNode);
  const commit = useDesigner((s) => s.commit);

  const { screenToFlowPosition } = useReactFlow<AppNode, AppEdge>();
  const draggingRef = useRef(false);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(PALETTE_MIME);
      if (!kind) return;
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addComponent(kind, { x: point.x - NODE_OFFSET.x, y: point.y - NODE_OFFSET.y });
    },
    [addComponent, screenToFlowPosition],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams<AppNode, AppEdge>) => {
      setSelection(
        selectedNodes.map((n) => n.id),
        selectedEdges.map((e) => e.id),
      );
    },
    [setSelection],
  );

  const isValidConnection: IsValidConnection<AppEdge> = useCallback(
    (connection: Connection | AppEdge) => connection.source !== connection.target,
    [],
  );

  return (
    <div className="relative h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <EdgeMarkers />
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        isValidConnection={isValidConnection}
        onNodeDragStart={() => {
          if (draggingRef.current) return;
          draggingRef.current = true;
          commit();
        }}
        onNodeDragStop={(_, node) => {
          draggingRef.current = false;
          reparentNode(node.id);
        }}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={28}
        connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 2, strokeDasharray: '4 4' }}
        selectionMode={SelectionMode.Partial}
        snapToGrid={settings.snapToGrid}
        snapGrid={[12, 12]}
        minZoom={0.15}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: false }}
        className="bg-[var(--color-canvas)]"
      >
        {settings.showGrid ? (
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#1b2533" />
        ) : null}

        <Controls
          className="!rounded-lg !border !border-slate-800 !shadow-xl"
          showInteractive={false}
          position="bottom-left"
        />

        {settings.showMinimap ? (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={minimapColor}
            nodeStrokeWidth={2}
            maskColor="rgba(7,11,20,0.78)"
          />
        ) : null}

        <Panel position="bottom-center" className="!mb-3">
          <FlowHud />
        </Panel>
      </ReactFlow>
    </div>
  );
}
