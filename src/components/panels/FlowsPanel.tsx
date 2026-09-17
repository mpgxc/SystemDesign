import { ChevronDown, ChevronUp, ListPlus, Play, Plus, Route, Trash2, Waypoints } from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';

import { getProtocolSpec, PROTOCOL_STYLES } from '@/domain/protocols';
import { TONE_SPECS, toneOf } from '@/domain/tones';
import type { ComponentNodeData } from '@/domain/types';
import { useDesigner } from '@/store/designer';
import { EmptyState, TextField } from '../ui/fields';

export default function FlowsPanel() {
  const flows = useDesigner((s) => s.flows);
  const nodes = useDesigner((s) => s.nodes);
  const edges = useDesigner((s) => s.edges);
  const playback = useDesigner((s) => s.playback);
  const selectedEdgeIds = useDesigner((s) => s.selectedEdgeIds);

  const createFlow = useDesigner((s) => s.createFlow);
  const updateFlow = useDesigner((s) => s.updateFlow);
  const deleteFlow = useDesigner((s) => s.deleteFlow);
  const removeStep = useDesigner((s) => s.removeStep);
  const moveStep = useDesigner((s) => s.moveStep);
  const setStepCaption = useDesigner((s) => s.setStepCaption);
  const captureSelectedEdges = useDesigner((s) => s.captureSelectedEdges);
  const playFlow = useDesigner((s) => s.playFlow);
  const selectOnly = useDesigner((s) => s.selectOnly);
  const setPlaybackIndex = useDesigner((s) => s.setPlaybackIndex);

  const [openId, setOpenId] = useState<string | null>(flows[0]?.id ?? null);

  const describe = useMemo(() => {
    const labels = new Map(nodes.map((n) => [n.id, ((n.data as ComponentNodeData).label as string | undefined) ?? n.id]));
    const edgeById = new Map(edges.map((e) => [e.id, e]));
    return (edgeId: string) => {
      const edge = edgeById.get(edgeId);
      if (!edge) return null;
      const protocol = getProtocolSpec(edge.data?.protocol ?? 'rest');
      return {
        from: labels.get(edge.source) ?? edge.source,
        to: labels.get(edge.target) ?? edge.target,
        protocol,
        color: PROTOCOL_STYLES[protocol.style].color,
        label: edge.data?.label,
      };
    };
  }, [nodes, edges]);

  const activeFlowId = openId && flows.some((f) => f.id === openId) ? openId : (flows[0]?.id ?? null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3.5 py-2.5">
        <p className="flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Fluxos animados
        </p>
        <button type="button" className="toolbar-button" onClick={() => setOpenId(createFlow())}>
          <Plus size={13} /> Novo
        </button>
      </div>

      {flows.length === 0 ? (
        <EmptyState icon={<Route size={18} />} title="Nenhum fluxo ainda">
          Um fluxo e uma sequencia de conexoes. Crie um, selecione conexoes no canvas e capture-as como passos para
          ver a requisicao percorrer a arquitetura.
        </EmptyState>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {flows.map((flow) => {
          const tone = toneOf(flow.tone);
          const isOpen = flow.id === activeFlowId;
          const isPlaying = playback.flowId === flow.id;

          return (
            <section key={flow.id} className="border-b border-slate-800/80">
              <div
                className={clsx('flex items-center gap-2 px-3 py-2 transition', isOpen && 'bg-slate-800/30')}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => setOpenId(isOpen ? null : flow.id)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: tone.accent }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-slate-200">{flow.name}</span>
                    <span className="block text-[10px] text-slate-600">
                      {flow.steps.length} passo(s){isPlaying ? ' · em reproducao' : ''}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className="icon-button"
                  title="Reproduzir"
                  onClick={() => playFlow(flow.id)}
                  disabled={!flow.steps.length}
                >
                  <Play size={13} />
                </button>
                <button
                  type="button"
                  className="icon-button hover:text-rose-300"
                  title="Excluir fluxo"
                  onClick={() => deleteFlow(flow.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {isOpen ? (
                <div className="space-y-2.5 px-3.5 pb-3">
                  <TextField label="Nome" value={flow.name} onChange={(value) => updateFlow(flow.id, { name: value })} />
                  <TextField
                    label="Descricao"
                    value={flow.description ?? ''}
                    placeholder="Checkout: do clique ate a confirmacao"
                    onChange={(value) => updateFlow(flow.id, { description: value })}
                  />

                  <div className="grid grid-cols-6 gap-1.5">
                    {TONE_SPECS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => updateFlow(flow.id, { tone: item.id })}
                        className={clsx('h-6 rounded-md border-2', flow.tone === item.id ? '' : 'border-transparent opacity-60')}
                        style={{
                          background: `${item.accent}26`,
                          borderColor: flow.tone === item.id ? item.accent : 'transparent',
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="toolbar-button w-full justify-center"
                    disabled={!selectedEdgeIds.length}
                    onClick={() => captureSelectedEdges(flow.id)}
                    title="Adiciona as conexoes selecionadas como passos"
                  >
                    <ListPlus size={13} />
                    Capturar {selectedEdgeIds.length || ''} conexao(oes) selecionada(s)
                  </button>

                  <ol className="space-y-1.5">
                    {flow.steps.map((step, index) => {
                      const info = describe(step.edgeId);
                      const isCurrent = isPlaying && playback.index === index;

                      return (
                        <li
                          key={step.id}
                          className={clsx(
                            'rounded-lg border px-2 py-1.5 transition',
                            isCurrent ? 'border-slate-600 bg-slate-800/60' : 'border-slate-800',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold text-slate-950"
                              style={{ background: tone.accent }}
                              onClick={() => {
                                playFlow(flow.id);
                                setPlaybackIndex(index);
                                selectOnly([], [step.edgeId]);
                              }}
                              title="Ir para este passo"
                            >
                              {index + 1}
                            </button>

                            {info ? (
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate text-left text-[11px] text-slate-300 hover:text-white"
                                onClick={() => selectOnly([], [step.edgeId])}
                                title={`${info.from} → ${info.to}`}
                              >
                                {info.from}
                                <span className="mx-1 font-mono text-[9px]" style={{ color: info.color }}>
                                  {info.protocol.short}
                                </span>
                                {info.to}
                              </button>
                            ) : (
                              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                                conexao removida
                              </span>
                            )}

                            <button
                              type="button"
                              className="icon-button !h-5 !w-5"
                              onClick={() => moveStep(flow.id, step.id, -1)}
                              disabled={index === 0}
                              title="Subir"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              className="icon-button !h-5 !w-5"
                              onClick={() => moveStep(flow.id, step.id, 1)}
                              disabled={index === flow.steps.length - 1}
                              title="Descer"
                            >
                              <ChevronDown size={12} />
                            </button>
                            <button
                              type="button"
                              className="icon-button !h-5 !w-5 hover:text-rose-300"
                              onClick={() => removeStep(flow.id, step.id)}
                              title="Remover passo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <input
                            className="mt-1 w-full rounded border-0 bg-transparent px-0 text-[10.5px] text-slate-500 outline-none placeholder:text-slate-700 focus:text-slate-300"
                            value={step.caption ?? ''}
                            placeholder="descreva o que acontece neste passo..."
                            onChange={(event) => setStepCaption(flow.id, step.id, event.target.value)}
                          />
                        </li>
                      );
                    })}
                  </ol>

                  {flow.steps.length === 0 ? (
                    <p className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-800 px-2.5 py-3 text-[11px] text-slate-600">
                      <Waypoints size={13} /> Selecione conexoes no canvas e capture-as aqui.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
