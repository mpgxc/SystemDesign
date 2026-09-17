import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { toPng } from 'html-to-image';

const PADDING = 80;
const MAX_SIDE = 4096;

/** Exporta o desenho inteiro como PNG, independente do zoom atual da tela. */
export async function exportToPng(nodes: Node[], name: string): Promise<void> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl || nodes.length === 0) return;

  const bounds = getNodesBounds(nodes);
  const width = Math.min(Math.round(bounds.width + PADDING * 2), MAX_SIDE);
  const height = Math.min(Math.round(bounds.height + PADDING * 2), MAX_SIDE);
  const viewport = getViewportForBounds(bounds, width, height, 0.2, 2, 0.08);

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: '#070b14',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arquitetura';
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${slug}.png`;
  link.click();
}
