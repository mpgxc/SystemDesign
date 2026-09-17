import { Pause, Play, Repeat, SkipBack, SkipForward, X } from 'lucide-react';
import clsx from 'clsx';

import { toneOf } from '@/domain/tones';
import { useDesigner } from '@/store/designer';

/** Controle de reproducao do fluxo, ancorado na base do canvas. */
export default function FlowHud() {
  const playback = useDesigner((s) => s.playback);
  const flow = useDesigner((s) => s.flows.find((f) => f.id === s.playback.flowId));
  const playFlow = useDesigner((s) => s.playFlow);
  const pausePlayback = useDesigner((s) => s.pausePlayback);
  const stopPlayback = useDesigner((s) => s.stopPlayback);
  const stepForward = useDesigner((s) => s.stepForward);
  const stepBackward = useDesigner((s) => s.stepBackward);
  const setPlaybackIndex = useDesigner((s) => s.setPlaybackIndex);
  const setPlaybackOption = useDesigner((s) => s.setPlaybackOption);

  if (!flow || !flow.steps.length) return null;

  const tone = toneOf(flow.tone);
  const step = flow.steps[playback.index];

  return (
    <div className="panel animate-fade-rise flex items-center gap-3 rounded-xl border border-slate-700/80 px-3 py-2 shadow-2xl">
      <div className="flex min-w-0 max-w-[260px] flex-col">
        <span className="truncate text-[12px] font-semibold" style={{ color: tone.accent }}>
          {flow.name}
        </span>
        <span className="truncate text-[10.5px] text-slate-500">
          passo {playback.index + 1}/{flow.steps.length}
          {step?.caption ? ` · ${step.caption}` : ''}
        </span>
      </div>

      <div className="h-7 w-px bg-slate-700/70" />

      <div className="flex items-center gap-1">
        <button type="button" className="icon-button" title="Passo anterior" onClick={stepBackward}>
          <SkipBack size={14} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-950 transition hover:brightness-110"
          style={{ background: tone.accent }}
          title={playback.playing ? 'Pausar' : 'Reproduzir'}
          onClick={() => (playback.playing ? pausePlayback() : playFlow(flow.id))}
        >
          {playback.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <button type="button" className="icon-button" title="Proximo passo" onClick={stepForward}>
          <SkipForward size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        {flow.steps.map((s, index) => (
          <button
            key={s.id}
            type="button"
            title={s.caption || `Passo ${index + 1}`}
            onClick={() => setPlaybackIndex(index)}
            className={clsx('h-1.5 rounded-full transition-all', index === playback.index ? 'w-5' : 'w-1.5')}
            style={{ background: index === playback.index ? tone.accent : '#334155' }}
          />
        ))}
      </div>

      <div className="h-7 w-px bg-slate-700/70" />

      <button
        type="button"
        className={clsx('icon-button', playback.loop && 'text-sky-400')}
        title="Repetir em loop"
        onClick={() => setPlaybackOption('loop', !playback.loop)}
      >
        <Repeat size={13} />
      </button>

      <label className="flex items-center gap-1.5" title="Duracao de cada passo">
        <input
          type="range"
          min={400}
          max={4000}
          step={200}
          value={playback.stepDuration}
          onChange={(event) => setPlaybackOption('stepDuration', Number(event.target.value))}
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-700 accent-sky-400"
        />
        <span className="w-9 font-mono text-[10px] text-slate-500">{(playback.stepDuration / 1000).toFixed(1)}s</span>
      </label>

      <button type="button" className="icon-button hover:text-rose-300" title="Encerrar" onClick={stopPlayback}>
        <X size={14} />
      </button>
    </div>
  );
}
