import type { AppEdge, AppNode, DesignDocument, DesignFlow } from '@/domain/types';

const STORAGE_KEY = 'system-design-studio:document:v1';

export function buildDocument(name: string, nodes: AppNode[], edges: AppEdge[], flows: DesignFlow[]): DesignDocument {
  return { version: 1, name, nodes, edges, flows, updatedAt: new Date().toISOString() };
}

export function saveToStorage(doc: DesignDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // modo privado / cota estourada: o editor segue funcionando em memoria
  }
}

export function loadFromStorage(): DesignDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDocument(raw);
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorado de proposito
  }
}

/** Le um documento externo com validacao minima antes de entrar no editor. */
export function parseDocument(raw: string): DesignDocument | null {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object') return null;

  const candidate = data as Partial<DesignDocument>;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return null;

  return {
    version: 1,
    name: typeof candidate.name === 'string' ? candidate.name : 'Arquitetura sem nome',
    nodes: candidate.nodes as AppNode[],
    edges: candidate.edges as AppEdge[],
    flows: Array.isArray(candidate.flows) ? (candidate.flows as DesignFlow[]) : [],
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  };
}

export function downloadDocument(doc: DesignDocument): void {
  const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arquitetura';
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
