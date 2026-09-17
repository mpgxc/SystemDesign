import type { XYPosition } from '@xyflow/react';
import type { AppNode } from '@/domain/types';

export interface Size {
  width: number;
  height: number;
}

export const DEFAULT_SIZE: Record<AppNode['type'] & string, Size> = {
  component: { width: 212, height: 96 },
  context: { width: 460, height: 320 },
  note: { width: 236, height: 132 },
};

/** Dimensao efetiva do no, tolerando os varios lugares onde ela pode estar. */
export function sizeOf(node: AppNode): Size {
  const fallback = DEFAULT_SIZE[node.type ?? 'component'] ?? DEFAULT_SIZE.component;
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined;
  return {
    width: node.width ?? node.measured?.width ?? styleWidth ?? fallback.width,
    height: node.height ?? node.measured?.height ?? styleHeight ?? fallback.height,
  };
}

/** Posicao absoluta no canvas, somando a cadeia de contextos pai. */
export function absolutePosition(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const guard = new Set<string>([node.id]);

  while (parentId && !guard.has(parentId)) {
    guard.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

export function centerOf(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  const { x, y } = absolutePosition(node, byId);
  const { width, height } = sizeOf(node);
  return { x: x + width / 2, y: y + height / 2 };
}

export function isDescendant(candidateId: string, ancestorId: string, byId: Map<string, AppNode>): boolean {
  let current = byId.get(candidateId)?.parentId;
  const guard = new Set<string>();
  while (current && !guard.has(current)) {
    if (current === ancestorId) return true;
    guard.add(current);
    current = byId.get(current)?.parentId;
  }
  return false;
}

/**
 * Contexto mais interno que contem o ponto informado. Contextos aninhados sao
 * resolvidos pelo menor: o ultimo da lista ordenada por area.
 */
export function findContextAt(nodes: AppNode[], point: XYPosition, ignoreIds: string[] = []): AppNode | undefined {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ignore = new Set(ignoreIds);

  return nodes
    .filter((n) => n.type === 'context' && !ignore.has(n.id) && !ignoreIds.some((id) => isDescendant(n.id, id, byId)))
    .filter((n) => {
      const pos = absolutePosition(n, byId);
      const size = sizeOf(n);
      return point.x >= pos.x && point.x <= pos.x + size.width && point.y >= pos.y && point.y <= pos.y + size.height;
    })
    .sort((a, b) => sizeOf(b).width * sizeOf(b).height - sizeOf(a).width * sizeOf(a).height)
    .at(-1);
}

/** Contextos primeiro: o React Flow exige o pai antes dos filhos na lista. */
export function sortNodes(nodes: AppNode[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = (node: AppNode): number => {
    let d = 0;
    let parentId = node.parentId;
    const guard = new Set<string>();
    while (parentId && !guard.has(parentId)) {
      guard.add(parentId);
      d += 1;
      parentId = byId.get(parentId)?.parentId;
    }
    return d;
  };

  const rank = (node: AppNode): number => (node.type === 'context' ? 0 : 1);

  return [...nodes].sort((a, b) => depth(a) - depth(b) || rank(a) - rank(b));
}
