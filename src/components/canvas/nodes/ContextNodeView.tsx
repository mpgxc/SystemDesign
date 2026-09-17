import { NodeResizer, type NodeProps } from '@xyflow/react';
import { Group } from 'lucide-react';
import { memo } from 'react';
import clsx from 'clsx';

import { toneOf } from '@/domain/tones';
import type { ContextNode } from '@/domain/types';

/**
 * Contexto delimitado: agrupa componentes, acompanha o arraste do grupo e
 * aceita novos nos soltos dentro da area.
 */
function ContextNodeView({ data, selected }: NodeProps<ContextNode>) {
  const tone = toneOf(data.tone);

  return (
    <>
      <NodeResizer
        color={tone.accent}
        isVisible={Boolean(selected)}
        minWidth={240}
        minHeight={160}
        lineStyle={{ borderWidth: 1 }}
        handleStyle={{ background: tone.accent }}
      />

      <div
        className={clsx(
          'h-full w-full rounded-2xl border-2 border-dashed transition',
          selected ? 'border-solid' : 'hover:border-solid',
        )}
        style={{
          borderColor: selected ? tone.accent : `${tone.accent}66`,
          background: tone.soft,
        }}
      >
        <div
          className="context-handle flex cursor-grab items-center gap-2 rounded-t-xl px-3 py-2 active:cursor-grabbing"
          style={{ background: `${tone.accent}14` }}
        >
          <Group size={13} style={{ color: tone.accent }} />
          <span className="truncate text-[12px] font-semibold tracking-wide" style={{ color: tone.accent }}>
            {data.label}
          </span>
          {data.owner ? (
            <span className="ml-auto truncate font-mono text-[10px] text-slate-500">{data.owner}</span>
          ) : null}
        </div>

        {data.description ? (
          <p className="max-w-[80%] px-3 pt-1.5 text-[11px] leading-snug text-slate-500">{data.description}</p>
        ) : null}
      </div>
    </>
  );
}

export default memo(ContextNodeView);
