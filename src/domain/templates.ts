import type { AppEdge, AppNode, ComponentNodeData, ContextTone, DesignDocument, DesignFlow } from './types';

/* --------------------------------------------------------------- layout --
 * Os exemplos precisam nascer alinhados, entao as posicoes sao calculadas a
 * partir da altura real de cada no (medida no canvas) em vez de chutadas.
 */

const NODE_WIDTH = 212;
const PAD = { top: 68, side: 26, bottom: 28, gap: 24 };
const CTX_WIDTH = NODE_WIDTH + PAD.side * 2;

/** Empilha uma coluna de nos e devolve os Y de cada um e a altura do contexto. */
function column(heights: number[]): { ys: number[]; height: number } {
  const ys: number[] = [];
  let y = PAD.top;
  for (const height of heights) {
    ys.push(y);
    y += height + PAD.gap;
  }
  return { ys, height: y - PAD.gap + PAD.bottom };
}

interface NodeOptions {
  parentId?: string;
  description?: string;
  tech?: string;
  scale?: string;
  status?: ComponentNodeData['status'];
  props?: Record<string, string>;
}

const component = (
  id: string,
  kind: string,
  label: string,
  position: { x: number; y: number },
  options: NodeOptions = {},
): AppNode => ({
  id,
  type: 'component',
  position,
  parentId: options.parentId,
  data: {
    kind,
    label,
    description: options.description ?? '',
    tech: options.tech ?? '',
    scale: options.scale ?? '',
    status: options.status ?? 'default',
    props: options.props ?? {},
  },
});

const context = (
  id: string,
  label: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  tone: ContextTone,
  extra: { description?: string; owner?: string } = {},
): AppNode => ({
  id,
  type: 'context',
  position,
  width: size.width,
  height: size.height,
  dragHandle: '.context-handle',
  data: { label, tone, description: extra.description ?? '', owner: extra.owner ?? '' },
});

type Side = 'top' | 'right' | 'bottom' | 'left';

const link = (
  id: string,
  source: string,
  target: string,
  protocol: string,
  options: { label?: string; from?: Side; to?: Side; props?: Record<string, string>; bidirectional?: boolean } = {},
): AppEdge => ({
  id,
  source,
  target,
  type: 'connection',
  sourceHandle: options.from ?? 'right',
  targetHandle: options.to ?? 'left',
  data: {
    protocol,
    label: options.label ?? '',
    props: options.props ?? {},
    bidirectional: options.bidirectional ?? false,
  },
});

const flow = (id: string, name: string, tone: ContextTone, description: string, steps: [string, string][]): DesignFlow => ({
  id,
  name,
  tone,
  description,
  steps: steps.map(([edgeId, caption], index) => ({ id: `${id}-s${index + 1}`, edgeId, caption })),
});

/** Checkout assincrono com outbox, fan-out de eventos e retentativa. */
function checkoutTemplate(): DesignDocument {
  // Alturas medidas no canvas para cada no desta coluna.
  const canais = column([104, 80]);
  const borda = column([105, 105]);
  const pedidos = column([175, 130, 129]);
  const plataforma = column([80, 105, 80]);
  const mensageria = column([105, 105, 80]);
  const pagamentos = column([129, 105]);
  const agendamento = column([130]);

  const nodes: AppNode[] = [
    context('ctx-canais', 'Canais', { x: -40, y: 200 }, { width: CTX_WIDTH, height: canais.height }, 'sky', {
      description: 'Quem inicia a jornada',
    }),
    component('n-web', 'web-app', 'Loja Web', { x: PAD.side, y: canais.ys[0] }, {
      parentId: 'ctx-canais',
      description: 'Carrinho e checkout',
      props: { platform: 'React + Vite', auth: 'OIDC + PKCE' },
    }),
    component('n-mobile', 'mobile-app', 'App Mobile', { x: PAD.side, y: canais.ys[1] }, {
      parentId: 'ctx-canais',
      props: { platform: 'iOS / Android' },
    }),

    context('ctx-borda', 'Borda', { x: 300, y: 200 }, { width: CTX_WIDTH, height: borda.height }, 'violet', {
      description: 'Autenticacao e roteamento',
    }),
    component('n-gateway', 'api-gateway', 'API Gateway', { x: PAD.side, y: borda.ys[0] }, {
      parentId: 'ctx-borda',
      tech: 'Kong',
      props: { provider: 'Kong', authMode: 'JWT', routes: '/orders/* -> orders-api' },
    }),
    component('n-auth', 'auth-service', 'Identity', { x: PAD.side, y: borda.ys[1] }, {
      parentId: 'ctx-borda',
      props: { protocol: 'OAuth2 / OIDC', provider: 'Keycloak', tokenTtl: 'access 15min' },
    }),

    context('ctx-pedidos', 'Contexto: Pedidos', { x: 640, y: 60 }, { width: CTX_WIDTH, height: pedidos.height }, 'emerald', {
      description: 'Dono do ciclo de vida do pedido',
      owner: 'squad-checkout',
    }),
    component('n-orders-api', 'rest-api', 'Orders API', { x: PAD.side, y: pedidos.ys[0] }, {
      parentId: 'ctx-pedidos',
      tech: 'Node.js 22 + NestJS',
      scale: '4 replicas · 800 rps',
      description: 'Recebe e valida o pedido',
      props: { basePath: '/api/v1/orders', runtime: 'Node.js 22 + NestJS', slo: 'p99 < 200ms' },
    }),
    component('n-orders-db', 'sql-database', 'orders-db', { x: PAD.side, y: pedidos.ys[1] }, {
      parentId: 'ctx-pedidos',
      status: 'critical',
      props: { engine: 'PostgreSQL', replication: 'primaria + replica de leitura', isolation: 'read committed' },
    }),
    component('n-outbox', 'outbox', 'Outbox', { x: PAD.side, y: pedidos.ys[2] }, {
      parentId: 'ctx-pedidos',
      description: 'Publica so o que foi commitado',
      props: { table: 'outbox_messages', publisher: 'polling publisher', interval: '500ms' },
    }),

    context('ctx-plataforma', 'Plataforma', { x: 1000, y: 60 }, { width: CTX_WIDTH, height: plataforma.height }, 'slate', {
      description: 'Compartilhado entre contextos',
    }),
    component('n-cache', 'cache', 'Redis', { x: PAD.side, y: plataforma.ys[0] }, {
      parentId: 'ctx-plataforma',
      props: { engine: 'Redis', strategy: 'cache-aside', ttl: '60s' },
    }),
    component('n-search', 'search-engine', 'Busca de pedidos', { x: PAD.side, y: plataforma.ys[1] }, {
      parentId: 'ctx-plataforma',
      props: { engine: 'OpenSearch', index: 'orders-v2', sync: 'via evento' },
    }),
    component('n-metrics', 'metrics', 'Observabilidade', { x: PAD.side, y: plataforma.ys[2] }, {
      parentId: 'ctx-plataforma',
      props: { tool: 'Prometheus + Grafana' },
    }),

    context('ctx-msg', 'Mensageria', { x: 640, y: 700 }, { width: CTX_WIDTH, height: mensageria.height }, 'amber', {
      description: 'Desacopla os contextos',
    }),
    component('n-topic', 'topic', 'order.events', { x: PAD.side, y: mensageria.ys[0] }, {
      parentId: 'ctx-msg',
      props: { broker: 'SNS', name: 'order.events', delivery: 'at-least-once' },
    }),
    component('n-queue', 'queue', 'payments-queue', { x: PAD.side, y: mensageria.ys[1] }, {
      parentId: 'ctx-msg',
      props: { broker: 'SQS', name: 'payments-queue', ordering: 'FIFO por chave', dlq: 'apos 5 tentativas' },
    }),
    component('n-dlq', 'dlq', 'payments-dlq', { x: PAD.side, y: mensageria.ys[2] }, {
      parentId: 'ctx-msg',
      props: { source: 'payments-queue', retention: '14 dias' },
    }),

    context('ctx-pagamentos', 'Contexto: Pagamentos', { x: 1000, y: 700 }, { width: CTX_WIDTH, height: pagamentos.height }, 'rose', {
      owner: 'squad-payments',
    }),
    component('n-pay-worker', 'worker', 'Payments Worker', { x: PAD.side, y: pagamentos.ys[0] }, {
      parentId: 'ctx-pagamentos',
      description: 'Cobra e confirma o pagamento',
      props: { source: 'payments-queue', concurrency: '10', retry: 'exponential backoff', idempotency: 'chave de idempotencia' },
    }),
    component('n-psp', 'external-system', 'Adquirente', { x: PAD.side, y: pagamentos.ys[1] }, {
      parentId: 'ctx-pagamentos',
      props: { owner: 'Gateway de pagamento', sla: '99.9% / p99 800ms' },
    }),

    context('ctx-scheduler', 'Agendamento', { x: 300, y: 700 }, { width: CTX_WIDTH, height: agendamento.height }, 'amber'),
    component('n-cron', 'cron-job', 'Varredura de pendentes', { x: PAD.side, y: agendamento.ys[0] }, {
      parentId: 'ctx-scheduler',
      props: {
        expression: '*/5 * * * *',
        timezone: 'America/Sao_Paulo',
        job: 'reprocessa pedidos travados',
        lock: 'lock distribuido (Redis)',
      },
    }),
  ];

  const edges: AppEdge[] = [
    link('e-web-gw', 'n-web', 'n-gateway', 'rest', { label: 'confirma carrinho', props: { method: 'POST', path: '/orders', timeout: '3s', auth: 'JWT' } }),
    link('e-mob-gw', 'n-mobile', 'n-gateway', 'rest', { props: { method: 'POST', path: '/orders' } }),
    link('e-gw-auth', 'n-gateway', 'n-auth', 'rest', { label: 'valida token', from: 'bottom', to: 'top', props: { method: 'GET', path: '/introspect', timeout: '300ms' } }),
    link('e-gw-orders', 'n-gateway', 'n-orders-api', 'rest', { label: 'roteia', props: { method: 'POST', path: '/api/v1/orders', retry: 'sem retry', idempotency: 'Idempotency-Key' } }),
    link('e-orders-db', 'n-orders-api', 'n-orders-db', 'sql-query', { label: 'transacao', from: 'bottom', to: 'top', props: { operation: 'transacao', target: 'orders + outbox_messages' } }),
    link('e-db-outbox', 'n-orders-db', 'n-outbox', 'internal-call', { from: 'bottom', to: 'top', label: 'mesma transacao' }),
    link('e-outbox-topic', 'n-outbox', 'n-topic', 'pubsub-event', { label: 'OrderPlaced', from: 'bottom', to: 'top', props: { event: 'OrderPlaced', version: 'v1' } }),
    link('e-topic-queue', 'n-topic', 'n-queue', 'pubsub-event', { label: 'fan-out', from: 'bottom', to: 'top' }),
    link('e-queue-worker', 'n-queue', 'n-pay-worker', 'queue-message', { label: 'ProcessPayment', props: { message: 'ProcessPaymentCommand', delivery: 'at-least-once', orderingKey: 'orderId' } }),
    link('e-worker-psp', 'n-pay-worker', 'n-psp', 'rest', { label: 'cobranca', from: 'bottom', to: 'top', props: { method: 'POST', path: '/charges', timeout: '5s', retry: 'circuit breaker', idempotency: 'Idempotency-Key' } }),
    link('e-worker-topic', 'n-pay-worker', 'n-topic', 'pubsub-event', { label: 'PaymentApproved', from: 'top', to: 'right', props: { event: 'PaymentApproved', version: 'v1' } }),
    link('e-queue-dlq', 'n-queue', 'n-dlq', 'queue-message', { label: 'apos 5 falhas', from: 'bottom', to: 'top', props: { delivery: 'at-least-once' } }),
    link('e-orders-cache', 'n-orders-api', 'n-cache', 'cache-access', { label: 'consulta', props: { operation: 'GET + fallback', key: 'order:{id}', ttl: '60s' } }),
    link('e-topic-search', 'n-topic', 'n-search', 'pubsub-event', { label: 'indexa', from: 'right', to: 'bottom', props: { event: 'OrderPlaced' } }),
    link('e-cron-orders', 'n-cron', 'n-orders-api', 'cron-trigger', { label: 'a cada 5 min', from: 'top', to: 'left', props: { expression: '*/5 * * * *', job: 'reprocessa pendentes' } }),
    link('e-orders-metrics', 'n-orders-api', 'n-metrics', 'internal-call', { label: 'metricas', from: 'right', to: 'left' }),
  ];

  const flows: DesignFlow[] = [
    flow('flow-checkout', 'Checkout ponta a ponta', 'emerald', 'Do clique ate a confirmacao do pagamento', [
      ['e-web-gw', 'Cliente confirma o carrinho na loja'],
      ['e-gw-auth', 'Gateway valida o token antes de rotear'],
      ['e-gw-orders', 'Requisicao chega no servico de pedidos'],
      ['e-orders-db', 'Pedido e evento gravados na mesma transacao'],
      ['e-db-outbox', 'Evento fica pendente na outbox'],
      ['e-outbox-topic', 'Publisher publica OrderPlaced depois do commit'],
      ['e-topic-queue', 'Fan-out entrega o evento aos assinantes'],
      ['e-queue-worker', 'Worker consome o comando de pagamento'],
      ['e-worker-psp', 'Cobranca no adquirente com idempotency-key'],
      ['e-worker-topic', 'PaymentApproved fecha o ciclo'],
    ]),
    flow('flow-falha', 'Falha e retentativa', 'rose', 'O que acontece quando o adquirente cai', [
      ['e-queue-worker', 'Worker recebe a mensagem'],
      ['e-worker-psp', 'Adquirente responde 5xx — circuit breaker abre'],
      ['e-queue-worker', 'Mensagem volta para a fila com backoff'],
      ['e-queue-dlq', 'Depois de 5 tentativas vai para a DLQ'],
      ['e-cron-orders', 'Cron varre pendentes e reprocessa'],
    ]),
  ];

  return { version: 1, name: 'Checkout event-driven', nodes, edges, flows, updatedAt: new Date().toISOString() };
}

/** Ingestao em streaming alimentando read models (CQRS). */
function streamingTemplate(): DesignDocument {
  const ingest = column([80, 104]);
  const backbone = column([105, 80]);
  const write = column([129, 80]);
  const read = column([104, 80]);
  const serve = column([80, 80]);

  const nodes: AppNode[] = [
    context('ctx-ingest', 'Ingestao', { x: 0, y: 220 }, { width: CTX_WIDTH, height: ingest.height }, 'sky'),
    component('n-producers', 'external-system', 'Dispositivos / Parceiros', { x: PAD.side, y: ingest.ys[0] }, {
      parentId: 'ctx-ingest',
      props: { sla: '1M eventos/min' },
    }),
    component('n-ingest-api', 'rest-api', 'Ingest API', { x: PAD.side, y: ingest.ys[1] }, {
      parentId: 'ctx-ingest',
      description: 'Valida e publica no stream',
      props: { basePath: '/v1/events', slo: 'p99 < 50ms' },
    }),

    context('ctx-stream', 'Backbone de eventos', { x: 360, y: 220 }, { width: CTX_WIDTH, height: backbone.height }, 'amber'),
    component('n-stream', 'event-stream', 'events.raw', { x: PAD.side, y: backbone.ys[0] }, {
      parentId: 'ctx-stream',
      props: {
        broker: 'Kafka',
        topic: 'events.raw',
        partitions: '24 (chave = deviceId)',
        retention: '7 dias',
        semantics: 'at-least-once',
      },
    }),
    component('n-dlq2', 'dlq', 'events.dlq', { x: PAD.side, y: backbone.ys[1] }, {
      parentId: 'ctx-stream',
      props: { source: 'events.raw', retention: '30 dias' },
    }),

    context('ctx-write', 'Write model', { x: 720, y: 40 }, { width: CTX_WIDTH, height: write.height }, 'emerald'),
    component('n-processor', 'worker', 'Stream Processor', { x: PAD.side, y: write.ys[0] }, {
      parentId: 'ctx-write',
      description: 'Normaliza e deduplica',
      props: { source: 'events.raw', concurrency: '24 particoes', idempotency: 'dedupe por event id' },
    }),
    component('n-write-db', 'sql-database', 'events-db', { x: PAD.side, y: write.ys[1] }, {
      parentId: 'ctx-write',
      props: { engine: 'PostgreSQL', replication: 'multi-AZ' },
    }),

    context('ctx-read', 'Read model', { x: 720, y: 420 }, { width: CTX_WIDTH, height: read.height }, 'violet'),
    component('n-projector', 'worker', 'Projector', { x: PAD.side, y: read.ys[0] }, {
      parentId: 'ctx-read',
      description: 'Materializa as visoes de leitura',
      props: { source: 'events.raw', retry: 'retry + DLQ' },
    }),
    component('n-read-db', 'nosql-database', 'read-model', { x: PAD.side, y: read.ys[1] }, {
      parentId: 'ctx-read',
      props: { engine: 'MongoDB', consistency: 'eventual' },
    }),

    context('ctx-serve', 'Consulta', { x: 1080, y: 250 }, { width: CTX_WIDTH, height: serve.height }, 'slate'),
    component('n-query-api', 'graphql-api', 'Query API', { x: PAD.side, y: serve.ys[0] }, {
      parentId: 'ctx-serve',
      props: { endpoint: '/graphql', federation: 'nao' },
    }),
    component('n-ws', 'websocket-server', 'Realtime', { x: PAD.side, y: serve.ys[1] }, {
      parentId: 'ctx-serve',
      props: { channel: 'device:{id}', scaleOut: 'Redis adapter' },
    }),

    component('n-batch', 'batch-job', 'Carga diaria', { x: 60, y: 640 }, {
      props: { window: 'D-1 completo', source: 'events.raw', sink: 'ClickHouse' },
    }),
    component('n-warehouse', 'data-warehouse', 'Analytics', { x: 400, y: 640 }, {
      props: { engine: 'ClickHouse', dataset: 'analytics.events' },
    }),
  ];

  const edges: AppEdge[] = [
    link('s-prod-api', 'n-producers', 'n-ingest-api', 'rest', { label: 'POST /v1/events', from: 'bottom', to: 'top', props: { method: 'POST', path: '/v1/events' } }),
    link('s-api-stream', 'n-ingest-api', 'n-stream', 'stream-event', { label: 'publica', props: { topic: 'events.raw', partitionKey: 'deviceId' } }),
    link('s-stream-proc', 'n-stream', 'n-processor', 'stream-event', { label: 'consome', props: { offset: 'committed offset' } }),
    link('s-proc-db', 'n-processor', 'n-write-db', 'sql-query', { label: 'upsert', from: 'bottom', to: 'top', props: { operation: 'transacao', target: 'events' } }),
    link('s-stream-proj', 'n-stream', 'n-projector', 'stream-event', { label: 'projeta', from: 'bottom', to: 'left' }),
    link('s-proj-read', 'n-projector', 'n-read-db', 'sql-query', { label: 'materializa', from: 'bottom', to: 'top', props: { operation: 'UPDATE' } }),
    link('s-read-query', 'n-read-db', 'n-query-api', 'sql-query', { label: 'leitura', from: 'right', to: 'bottom', props: { operation: 'SELECT', consistency: 'eventual' } }),
    link('s-proj-ws', 'n-projector', 'n-ws', 'websocket', { label: 'push', from: 'right', to: 'left', props: { event: 'device.updated' }, bidirectional: true }),
    link('s-proc-dlq', 'n-processor', 'n-dlq2', 'queue-message', { label: 'falha permanente', from: 'left', to: 'right' }),
    link('s-stream-batch', 'n-stream', 'n-batch', 'batch-transfer', { from: 'bottom', to: 'top' }),
    link('s-batch-wh', 'n-batch', 'n-warehouse', 'batch-transfer', { label: 'diario 03:00', props: { format: 'Parquet', window: 'diario 03:00' } }),
  ];

  const flows: DesignFlow[] = [
    flow('flow-ingest', 'Evento ate a tela', 'sky', 'Da ingestao ao push em tempo real', [
      ['s-prod-api', 'Dispositivo envia o evento'],
      ['s-api-stream', 'API publica no topico particionado por deviceId'],
      ['s-stream-proj', 'Projector consome o mesmo stream'],
      ['s-proj-read', 'Read model e materializado'],
      ['s-proj-ws', 'Cliente conectado recebe o push'],
    ]),
  ];

  return { version: 1, name: 'Streaming + CQRS', nodes, edges, flows, updatedAt: new Date().toISOString() };
}

export interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  build: () => DesignDocument;
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'checkout',
    name: 'Checkout event-driven',
    description: 'API, outbox, fan-out de eventos, worker, DLQ e cron de reprocessamento.',
    build: checkoutTemplate,
  },
  {
    id: 'streaming',
    name: 'Streaming + CQRS',
    description: 'Ingestao em Kafka, write model, projector, read model e push via WebSocket.',
    build: streamingTemplate,
  },
];
