import { useReactFlow } from '@xyflow/react';
import { ChevronDown, Group, Search, StickyNote, X } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import clsx from 'clsx';

import { CATEGORIES, searchComponents } from '@/domain/catalog';
import { iconFor } from '@/domain/icons';
import type { ComponentSpec } from '@/domain/types';
import { useDesigner } from '@/store/designer';
import { PALETTE_MIME } from '../canvas/Canvas';

export default function Palette() {
  const [term, setTerm] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const addComponent = useDesigner((s) => s.addComponent);
  const addContext = useDesigner((s) => s.addContext);
  const addNote = useDesigner((s) => s.addNote);
  const { screenToFlowPosition } = useReactFlow();

  const results = useMemo(() => searchComponents(term), [term]);

  const grouped = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        items: results.filter((c) => c.category === category.id),
      })).filter((group) => group.items.length > 0),
    [results],
  );

  /** Ponto util quando o componente e adicionado por clique, e nao por arraste. */
  const centerOfViewport = () => {
    const point = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    return { x: point.x - 106 + (Math.random() * 80 - 40), y: point.y - 48 + (Math.random() * 80 - 40) };
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>, spec: ComponentSpec) => {
    event.dataTransfer.setData(PALETTE_MIME, spec.kind);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="panel flex h-full w-[268px] shrink-0 flex-col border-r border-slate-800">
      <div className="border-b border-slate-800 px-3 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="field-input pl-8 pr-8"
            placeholder="Buscar componente..."
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          {term ? (
            <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-button" onClick={() => setTerm('')}>
              <X size={13} />
            </button>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button type="button" className="toolbar-button justify-center" onClick={() => addContext(centerOfViewport())}>
            <Group size={13} /> Contexto
          </button>
          <button type="button" className="toolbar-button justify-center" onClick={() => addNote(centerOfViewport())}>
            <StickyNote size={13} /> Anotacao
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {grouped.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-slate-600">Nenhum componente para "{term}".</p>
        ) : null}

        {grouped.map(({ category, items }) => {
          const isCollapsed = collapsed.has(category.id) && !term;
          return (
            <section key={category.id} className="mb-1.5">
              <button
                type="button"
                onClick={() => toggle(category.id)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-800/50"
              >
                <ChevronDown
                  size={12}
                  className={clsx('text-slate-600 transition-transform', isCollapsed && '-rotate-90')}
                />
                <span className="h-2 w-2 rounded-sm" style={{ background: category.accent }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{category.label}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-600">{items.length}</span>
              </button>

              {!isCollapsed ? (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((spec) => {
                    const Icon = iconFor(spec.icon);
                    return (
                      <button
                        key={spec.kind}
                        type="button"
                        draggable
                        onDragStart={(event) => onDragStart(event, spec)}
                        onClick={() => addComponent(spec.kind, centerOfViewport())}
                        title={`${spec.description}\n\nArraste para o canvas ou clique para adicionar`}
                        className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-slate-700 hover:bg-slate-800/60 active:cursor-grabbing"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition"
                          style={{ borderColor: `${category.accent}44`, background: `${category.accent}18`, color: category.accent }}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-slate-200">{spec.label}</span>
                          <span className="block truncate text-[10px] leading-tight text-slate-600 group-hover:text-slate-500">
                            {spec.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="border-t border-slate-800 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-slate-600">
          Arraste para o canvas. Solte dentro de um <span className="text-slate-400">contexto</span> para agrupar.
        </p>
      </div>
    </aside>
  );
}
