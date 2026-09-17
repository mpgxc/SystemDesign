import type { Edge, Node } from '@xyflow/react';

/** Categorias usadas para agrupar o catalogo e derivar as cores do canvas. */
export type ComponentCategory =
  | 'client'
  | 'edge'
  | 'compute'
  | 'scheduling'
  | 'messaging'
  | 'data'
  | 'observability'
  | 'security';

/** Formato visual do bloco desenhado no canvas. */
export type ComponentShape = 'rect' | 'cylinder' | 'stadium' | 'hexagon';

export type FieldType = 'text' | 'textarea' | 'number' | 'select';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
}

export interface ComponentSpec {
  kind: string;
  label: string;
  category: ComponentCategory;
  icon: string;
  shape: ComponentShape;
  description: string;
  /** Termos alternativos usados pela busca da paleta. */
  keywords?: string[];
  fields: FieldSpec[];
  defaults?: Record<string, string>;
  /** Sugestao de stack exibida no inspector. */
  techHint?: string;
}

/** Natureza da comunicacao — define cor, traco e animacao da aresta. */
export type ProtocolStyle = 'sync' | 'async' | 'stream' | 'schedule' | 'data';

export interface ProtocolSpec {
  kind: string;
  label: string;
  short: string;
  style: ProtocolStyle;
  icon: string;
  description: string;
  fields: FieldSpec[];
  defaults?: Record<string, string>;
  /** Conexoes bidirecionais por natureza (ex.: WebSocket). */
  duplex?: boolean;
}

export type NodeStatus = 'default' | 'critical' | 'planned' | 'deprecated';

export interface ComponentNodeData extends Record<string, unknown> {
  kind: string;
  label: string;
  description?: string;
  tech?: string;
  scale?: string;
  status?: NodeStatus;
  props: Record<string, string>;
}

export type ContextTone = 'violet' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface ContextNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  tone: ContextTone;
  owner?: string;
}

export interface NoteNodeData extends Record<string, unknown> {
  text: string;
  tone: ContextTone;
}

export type ComponentNode = Node<ComponentNodeData, 'component'>;
export type ContextNode = Node<ContextNodeData, 'context'>;
export type NoteNode = Node<NoteNodeData, 'note'>;
export type AppNode = ComponentNode | ContextNode | NoteNode;

export interface ConnectionData extends Record<string, unknown> {
  protocol: string;
  label?: string;
  description?: string;
  props: Record<string, string>;
  bidirectional?: boolean;
  /** Desliga a animacao apenas nesta aresta. */
  muted?: boolean;
}

export type AppEdge = Edge<ConnectionData, 'connection'>;

export interface FlowStep {
  id: string;
  edgeId: string;
  caption?: string;
}

export interface DesignFlow {
  id: string;
  name: string;
  description?: string;
  tone: ContextTone;
  steps: FlowStep[];
}

export interface DesignDocument {
  version: 1;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  flows: DesignFlow[];
  updatedAt: string;
}
