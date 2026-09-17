import { NodeResizer, type NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { toneOf } from '@/domain/tones';
import type { NoteNode } from '@/domain/types';
import { useDesigner } from '@/store/designer';

/** Anotacao livre: decisoes, trade-offs e riscos anotados no proprio desenho. */
function NoteNodeView({ id, data, selected }: NodeProps<NoteNode>) {
  const tone = toneOf(data.tone);
  const updateNodeData = useDesigner((s) => s.updateNodeData);

  return (
    <>
      <NodeResizer color={tone.accent} isVisible={Boolean(selected)} minWidth={160} minHeight={90} />
      <div
        className="h-full w-full rounded-lg border px-2.5 py-2 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)]"
        style={{ borderColor: `${tone.accent}55`, background: `${tone.accent}12` }}
      >
        <textarea
          className="nodrag nowheel h-full w-full resize-none border-0 bg-transparent text-[11.5px] leading-snug text-slate-200 outline-none placeholder:text-slate-600"
          value={data.text}
          placeholder="Anotacao..."
          onChange={(event) => updateNodeData(id, { text: event.target.value })}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </div>
    </>
  );
}

export default memo(NoteNodeView);
