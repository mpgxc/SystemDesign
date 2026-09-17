import { Handle, NodeToolbar, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Copy, Trash2 } from 'lucide-react';
import { memo, type CSSProperties } from 'react';
import clsx from 'clsx';

import { CATEGORY_BY_ID, getComponentSpec } from '@/domain/catalog';
import { iconFor } from '@/domain/icons';
import type { ComponentNode, ComponentShape } from '@/domain/types';
import { useDesigner } from '@/store/designer';
import { useNodeSpotlight } from '@/store/selectors';

const HANDLES: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: 'critico', className: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  planned: { label: 'planejado', className: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  deprecated: { label: 'legado', className: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
};

function shapeStyle(shape: ComponentShape): CSSProperties {
  switch (shape) {
    case 'stadium':
      return { borderRadius: 999 };
    case 'cylinder':
      return { borderRadius: '28px 28px 16px 16px / 22px 22px 14px 14px' };
    case 'hexagon':
      return { clipPath: 'polygon(6% 0%, 94% 0%, 100% 50%, 94% 100%, 6% 100%, 0% 50%)', borderRadius: 6 };
    default:
      return { borderRadius: 14 };
  }
}

function ComponentNodeView({ id, data, selected }: NodeProps<ComponentNode>) {
  const spec = getComponentSpec(data.kind);
  const category = CATEGORY_BY_ID.get(spec.category);
  const accent = category?.accent ?? '#38bdf8';
  const Icon = iconFor(spec.icon);
  const spotlight = useNodeSpotlight(id);
  const { deleteElements } = useReactFlow();
  const duplicate = useDesigner((s) => s.duplicateSelection);

  const highlights = spec.fields
    .map((field) => ({ field, value: data.props?.[field.key] }))
    .filter((entry): entry is { field: (typeof spec.fields)[number]; value: string } => Boolean(entry.value))
    .slice(0, 3);

  const status = data.status && data.status !== 'default' ? STATUS_BADGE[data.status] : undefined;
  const isHexagon = spec.shape === 'hexagon';

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-xl">
          <button type="button" className="icon-button" title="Duplicar (Ctrl+D)" onClick={() => duplicate()}>
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="icon-button hover:text-rose-300"
            title="Excluir (Del)"
            onClick={() => void deleteElements({ nodes: [{ id }] })}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </NodeToolbar>

      {HANDLES.map((position) => (
        <Handle key={position} type="source" position={position} id={position} />
      ))}

      <div
        className={clsx(
          'relative w-[212px] border bg-[#0e1626] px-3 py-2.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] transition',
          isHexagon && 'px-6',
          spotlight === 'outside' && 'node-dimmed',
          spotlight === 'active' && 'node-spotlight',
          selected ? 'border-sky-400/80' : 'border-slate-700/80 hover:border-slate-500',
        )}
        style={{
          ...shapeStyle(spec.shape),
          boxShadow:
            spotlight === 'active'
              ? `0 0 0 2px ${accent}, 0 0 28px -4px ${accent}`
              : selected
                ? `0 0 0 1px ${accent}66`
                : undefined,
          background: `linear-gradient(160deg, ${category?.soft ?? 'transparent'} 0%, rgba(14,22,38,0.96) 55%)`,
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
            style={{ borderColor: `${accent}55`, background: `${accent}1f`, color: accent }}
          >
            <Icon size={15} strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-100" title={data.label}>
              {data.label}
            </p>
            <p className="truncate text-[10.5px] leading-tight text-slate-500" title={spec.label}>
              {data.tech || spec.label}
            </p>
          </div>

          {status ? (
            <span className={clsx('shrink-0 rounded border px-1 py-px text-[9px] font-semibold uppercase', status.className)}>
              {status.label}
            </span>
          ) : null}
        </div>

        {data.description ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-400">{data.description}</p>
        ) : null}

        {highlights.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {highlights.map(({ field, value }) => (
              <span key={field.key} className="chip max-w-[180px] truncate" title={`${field.label}: ${value}`}>
                {value}
              </span>
            ))}
          </div>
        ) : null}

        {data.scale ? (
          <p className="mt-1.5 font-mono text-[10px] text-slate-500">{data.scale}</p>
        ) : null}
      </div>
    </>
  );
}

export default memo(ComponentNodeView);
