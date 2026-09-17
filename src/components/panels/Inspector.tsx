import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import { ArrowLeftRight, Crosshair, Group, ListPlus, MousePointerSquareDashed, Trash2 } from 'lucide-react';
import clsx from 'clsx';

import { CATEGORY_BY_ID, getComponentSpec } from '@/domain/catalog';
import { iconFor } from '@/domain/icons';
import { getProtocolSpec, PROTOCOL_STYLES, PROTOCOLS } from '@/domain/protocols';
import { TONE_SPECS, toneOf } from '@/domain/tones';
import type {
  AppEdge,
  AppNode,
  ComponentNodeData,
  ContextNodeData,
  FieldSpec,
  NodeStatus,
  NoteNodeData,
} from '@/domain/types';
import { useDesigner } from '@/store/designer';
import { EmptyState, SelectField, Section, TextAreaField, TextField, Toggle } from '../ui/fields';

/** Nome legivel de cada no, para exibir as pontas de uma conexao. */
function buildLabelMap(nodes: AppNode[]): Map<string, string> {
  return new Map(nodes.map((n) => [n.id, ((n.data as ComponentNodeData).label as string | undefined) ?? n.id]));
}

const STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: 'default', label: 'Ativo' },
  { value: 'critical', label: 'Critico' },
  { value: 'planned', label: 'Planejado' },
  { value: 'deprecated', label: 'Legado' },
];

function DynamicFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {fields.map((field) => {
        const value = values[field.key] ?? '';
        if (field.type === 'select') {
          return (
            <SelectField
              key={field.key}
              label={field.label}
              value={value}
              options={field.options ?? []}
              help={field.help}
              onChange={(next) => onChange(field.key, next)}
            />
          );
        }
        if (field.type === 'textarea') {
          return (
            <TextAreaField
              key={field.key}
              label={field.label}
              value={value}
              placeholder={field.placeholder}
              onChange={(next) => onChange(field.key, next)}
            />
          );
        }
        return (
          <TextField
            key={field.key}
            label={field.label}
            value={value}
            placeholder={field.placeholder}
            help={field.help}
            mono
            onChange={(next) => onChange(field.key, next)}
          />
        );
      })}
    </>
  );
}

function ComponentInspector({ node }: { node: AppNode }) {
  const data = node.data as ComponentNodeData;
  const spec = getComponentSpec(data.kind);
  const category = CATEGORY_BY_ID.get(spec.category);
  const Icon = iconFor(spec.icon);

  const updateNodeData = useDesigner((s) => s.updateNodeData);
  const updateNodeProp = useDesigner((s) => s.updateNodeProp);
  const selectOnly = useDesigner((s) => s.selectOnly);
  const allEdges = useDesigner((s) => s.edges);
  const allNodes = useDesigner((s) => s.nodes);

  const connections = useMemo(
    () => allEdges.filter((e) => e.source === node.id || e.target === node.id),
    [allEdges, node.id],
  );
  const nodeLabels = useMemo(() => buildLabelMap(allNodes), [allNodes]);

  return (
    <>
      <div className="flex items-start gap-2.5 border-b border-slate-800 px-3.5 py-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            borderColor: `${category?.accent}55`,
            background: `${category?.accent}1c`,
            color: category?.accent,
          }}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-100">{data.label}</p>
          <p className="truncate text-[10.5px] text-slate-500">
            {spec.label} · {category?.label}
          </p>
        </div>
      </div>

      <Section title="Identidade">
        <TextField label="Nome" value={data.label} onChange={(value) => updateNodeData(node.id, { label: value })} />
        <TextAreaField
          label="Responsabilidade"
          value={data.description ?? ''}
          rows={2}
          placeholder="O que este componente faz no sistema"
          onChange={(value) => updateNodeData(node.id, { description: value })}
        />
        <TextField
          label="Stack"
          value={data.tech ?? ''}
          placeholder={spec.techHint ?? 'Node.js 22 + NestJS'}
          onChange={(value) => updateNodeData(node.id, { tech: value })}
        />
        <TextField
          label="Escala"
          value={data.scale ?? ''}
          placeholder="3 replicas · 500 rps"
          mono
          onChange={(value) => updateNodeData(node.id, { scale: value })}
        />
        <SelectField
          label="Situacao"
          value={data.status ?? 'default'}
          allowEmpty={false}
          options={STATUS_OPTIONS.map((s) => s.value)}
          onChange={(value) => updateNodeData(node.id, { status: value as NodeStatus })}
        />
      </Section>

      {spec.fields.length ? (
        <Section title={`Configuracao · ${spec.label}`}>
          <DynamicFields
            fields={spec.fields}
            values={data.props ?? {}}
            onChange={(key, value) => updateNodeProp(node.id, key, value)}
          />
        </Section>
      ) : null}

      <Section title={`Conexoes (${connections.length})`}>
        {connections.length === 0 ? (
          <p className="text-[11.5px] text-slate-600">
            Arraste de qualquer borda do componente para criar uma conexao.
          </p>
        ) : (
          <ul className="space-y-1">
            {connections.map((edge) => {
              const protocol = getProtocolSpec(edge.data?.protocol ?? 'rest');
              const color = PROTOCOL_STYLES[protocol.style].color;
              const outgoing = edge.source === node.id;
              const otherId = outgoing ? edge.target : edge.source;
              return (
                <li key={edge.id}>
                  <button
                    type="button"
                    onClick={() => selectOnly([], [edge.id])}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-800 px-2 py-1.5 text-left transition hover:border-slate-600 hover:bg-slate-800/60"
                  >
                    <span className="font-mono text-[9px]" style={{ color }}>
                      {protocol.short}
                    </span>
                    <span className="text-[10px] text-slate-600">{outgoing ? '→' : '←'}</span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-300">
                      {nodeLabels.get(otherId) ?? otherId}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}

function ContextInspector({ node }: { node: AppNode }) {
  const data = node.data as ContextNodeData;
  const updateNodeData = useDesigner((s) => s.updateNodeData);
  const members = useDesigner((s) => s.nodes.filter((n) => n.parentId === node.id).length);

  return (
    <>
      <Section title={`Contexto · ${members} componente(s)`}>
        <TextField label="Nome" value={data.label} onChange={(value) => updateNodeData(node.id, { label: value })} />
        <TextAreaField
          label="Descricao"
          value={data.description ?? ''}
          rows={2}
          placeholder="Limite do dominio, responsabilidade do time"
          onChange={(value) => updateNodeData(node.id, { description: value })}
        />
        <TextField
          label="Time responsavel"
          value={data.owner ?? ''}
          placeholder="squad-checkout"
          mono
          onChange={(value) => updateNodeData(node.id, { owner: value })}
        />
      </Section>

      <Section title="Cor">
        <div className="grid grid-cols-6 gap-1.5">
          {TONE_SPECS.map((tone) => (
            <button
              key={tone.id}
              type="button"
              title={tone.label}
              onClick={() => updateNodeData(node.id, { tone: tone.id })}
              className={clsx(
                'h-7 rounded-md border-2 transition',
                data.tone === tone.id ? 'scale-105' : 'border-transparent opacity-60 hover:opacity-100',
              )}
              style={{
                background: `${tone.accent}26`,
                borderColor: data.tone === tone.id ? tone.accent : 'transparent',
              }}
            />
          ))}
        </div>
      </Section>
    </>
  );
}

function NoteInspector({ node }: { node: AppNode }) {
  const data = node.data as NoteNodeData;
  const updateNodeData = useDesigner((s) => s.updateNodeData);

  return (
    <Section title="Anotacao">
      <TextAreaField
        label="Texto"
        value={data.text}
        rows={5}
        onChange={(value) => updateNodeData(node.id, { text: value })}
      />
      <div className="grid grid-cols-6 gap-1.5">
        {TONE_SPECS.map((tone) => (
          <button
            key={tone.id}
            type="button"
            title={tone.label}
            onClick={() => updateNodeData(node.id, { tone: tone.id })}
            className={clsx('h-7 rounded-md border-2', data.tone === tone.id ? '' : 'border-transparent opacity-60')}
            style={{ background: `${tone.accent}26`, borderColor: data.tone === tone.id ? tone.accent : 'transparent' }}
          />
        ))}
      </div>
    </Section>
  );
}

function EdgeInspector({ edge }: { edge: AppEdge }) {
  const data = edge.data ?? { protocol: 'rest', props: {} };
  const protocol = getProtocolSpec(data.protocol);
  const styleSpec = PROTOCOL_STYLES[protocol.style];

  const updateEdgeData = useDesigner((s) => s.updateEdgeData);
  const updateEdgeProp = useDesigner((s) => s.updateEdgeProp);
  const changeProtocol = useDesigner((s) => s.changeProtocol);
  const reverseEdge = useDesigner((s) => s.reverseEdge);
  const flows = useDesigner((s) => s.flows);
  const addStep = useDesigner((s) => s.addStep);
  const createFlow = useDesigner((s) => s.createFlow);
  const allNodes = useDesigner((s) => s.nodes);
  const labels = useMemo(() => buildLabelMap(allNodes), [allNodes]);

  const grouped = Object.values(PROTOCOL_STYLES).map((style) => ({
    style,
    items: PROTOCOLS.filter((p) => p.style === style.id),
  }));

  return (
    <>
      <div className="border-b border-slate-800 px-3.5 py-3">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="min-w-0 flex-1 truncate text-slate-300">{labels.get(edge.source) ?? edge.source}</span>
          <span className="font-mono text-[10px]" style={{ color: styleSpec.color }}>
            {data.bidirectional ? '↔' : '→'}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-slate-300">
            {labels.get(edge.target) ?? edge.target}
          </span>
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-600">{styleSpec.description}</p>
      </div>

      <Section title="Tipo de comunicacao">
        <div className="space-y-2">
          {grouped.map(({ style, items }) => (
            <div key={style.id}>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                <span className="h-1.5 w-4 rounded-full" style={{ background: style.color }} />
                {style.label}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {items.map((item) => {
                  const Icon = iconFor(item.icon);
                  const active = item.kind === data.protocol;
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      title={item.description}
                      onClick={() => changeProtocol(edge.id, item.kind)}
                      className={clsx(
                        'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition',
                        active
                          ? 'border-transparent text-white'
                          : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200',
                      )}
                      style={active ? { background: `${style.color}24`, borderColor: style.color } : undefined}
                    >
                      <Icon size={12} style={{ color: active ? style.color : undefined }} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Detalhes">
        <TextField
          label="Rotulo no diagrama"
          value={data.label ?? ''}
          placeholder="cria pedido"
          onChange={(value) => updateEdgeData(edge.id, { label: value })}
        />
        <DynamicFields
          fields={protocol.fields}
          values={data.props ?? {}}
          onChange={(key, value) => updateEdgeProp(edge.id, key, value)}
        />
        <TextAreaField
          label="Observacoes"
          value={data.description ?? ''}
          rows={2}
          placeholder="Trade-off, risco, contrato"
          onChange={(value) => updateEdgeData(edge.id, { description: value })}
        />
      </Section>

      <Section title="Comportamento">
        <Toggle
          label="Bidirecional"
          help="Trafego nos dois sentidos"
          checked={Boolean(data.bidirectional)}
          onChange={(checked) => updateEdgeData(edge.id, { bidirectional: checked })}
        />
        <Toggle
          label="Sem animacao"
          help="Congela as particulas nesta conexao"
          checked={Boolean(data.muted)}
          onChange={(checked) => updateEdgeData(edge.id, { muted: checked })}
        />
        <button type="button" className="toolbar-button w-full justify-center" onClick={() => reverseEdge(edge.id)}>
          <ArrowLeftRight size={13} /> Inverter direcao
        </button>
      </Section>

      <Section title="Fluxos">
        <div className="flex flex-wrap gap-1">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              className="toolbar-button"
              onClick={() => addStep(flow.id, edge.id)}
              title={`Adicionar como proximo passo de ${flow.name}`}
            >
              <ListPlus size={12} style={{ color: toneOf(flow.tone).accent }} />
              {flow.name}
            </button>
          ))}
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              const id = createFlow();
              addStep(id, edge.id);
            }}
          >
            + Novo fluxo
          </button>
        </div>
      </Section>
    </>
  );
}

function MultiSelection({ nodeCount, edgeCount }: { nodeCount: number; edgeCount: number }) {
  const groupSelection = useDesigner((s) => s.groupSelection);
  const duplicateSelection = useDesigner((s) => s.duplicateSelection);
  const deleteSelection = useDesigner((s) => s.deleteSelection);

  return (
    <Section title="Selecao">
      <p className="text-[12px] text-slate-400">
        {nodeCount} componente(s) e {edgeCount} conexao(oes) selecionados.
      </p>
      <button type="button" className="toolbar-button w-full justify-center" onClick={() => groupSelection()}>
        <Group size={13} /> Agrupar em um contexto
      </button>
      <button type="button" className="toolbar-button w-full justify-center" onClick={() => duplicateSelection()}>
        Duplicar selecao
      </button>
      <button
        type="button"
        className="toolbar-button w-full justify-center hover:!border-rose-500/60 hover:!text-rose-300"
        onClick={() => deleteSelection()}
      >
        <Trash2 size={13} /> Excluir selecao
      </button>
    </Section>
  );
}

function DocumentOverview() {
  const nodes = useDesigner((s) => s.nodes);
  const edges = useDesigner((s) => s.edges);
  const flows = useDesigner((s) => s.flows);
  const { fitView } = useReactFlow();

  const components = nodes.filter((n) => n.type === 'component').length;
  const contexts = nodes.filter((n) => n.type === 'context').length;

  const stats = [
    { label: 'Componentes', value: components },
    { label: 'Conexoes', value: edges.length },
    { label: 'Contextos', value: contexts },
    { label: 'Fluxos', value: flows.length },
  ];

  return (
    <>
      <Section title="Resumo da arquitetura">
        <div className="grid grid-cols-2 gap-1.5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2">
              <p className="font-mono text-[18px] leading-none text-slate-200">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
        <button type="button" className="toolbar-button w-full justify-center" onClick={() => void fitView({ padding: 0.2, duration: 400 })}>
          <Crosshair size={13} /> Enquadrar tudo
        </button>
      </Section>

      <Section title="Legenda das conexoes">
        <ul className="space-y-1.5">
          {Object.values(PROTOCOL_STYLES).map((style) => (
            <li key={style.id} className="flex items-start gap-2">
              <svg width="26" height="12" className="mt-1 shrink-0">
                <line
                  x1="1"
                  y1="6"
                  x2="25"
                  y2="6"
                  stroke={style.color}
                  strokeWidth="2"
                  strokeDasharray={style.dash}
                  strokeLinecap="round"
                />
              </svg>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-slate-300">{style.label}</span>
                <span className="block text-[10px] leading-snug text-slate-600">{style.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Atalhos">
        <ul className="space-y-1 font-mono text-[10.5px] text-slate-500">
          <li><span className="chip">Del</span> remove a selecao</li>
          <li><span className="chip">Ctrl+D</span> duplica</li>
          <li><span className="chip">Ctrl+G</span> agrupa em contexto</li>
          <li><span className="chip">Ctrl+Z</span> / <span className="chip">Ctrl+Shift+Z</span> desfaz e refaz</li>
          <li><span className="chip">Espaco</span> reproduz o fluxo ativo</li>
        </ul>
      </Section>
    </>
  );
}

export default function Inspector() {
  const selectedNodeIds = useDesigner((s) => s.selectedNodeIds);
  const selectedEdgeIds = useDesigner((s) => s.selectedEdgeIds);
  const node = useDesigner((s) => (s.selectedNodeIds.length === 1 ? s.nodes.find((n) => n.id === s.selectedNodeIds[0]) : undefined));
  const edge = useDesigner((s) => (s.selectedEdgeIds.length === 1 ? s.edges.find((e) => e.id === s.selectedEdgeIds[0]) : undefined));

  const hasContent = useDesigner((s) => s.nodes.length > 0);

  const total = selectedNodeIds.length + selectedEdgeIds.length;

  if (total > 1) return <MultiSelection nodeCount={selectedNodeIds.length} edgeCount={selectedEdgeIds.length} />;
  if (edge) return <EdgeInspector edge={edge} />;
  if (node?.type === 'component') return <ComponentInspector node={node} />;
  if (node?.type === 'context') return <ContextInspector node={node} />;
  if (node?.type === 'note') return <NoteInspector node={node} />;
  if (hasContent) return <DocumentOverview />;

  return (
    <EmptyState icon={<MousePointerSquareDashed size={18} />} title="Comece pela paleta">
      Arraste um componente para o canvas, ligue as bordas para criar conexoes e agrupe tudo em contextos.
    </EmptyState>
  );
}
