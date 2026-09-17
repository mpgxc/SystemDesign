import type { FieldSpec, ProtocolSpec, ProtocolStyle } from './types';

const text = (key: string, label: string, placeholder?: string): FieldSpec => ({ key, label, type: 'text', placeholder });
const select = (key: string, label: string, options: string[]): FieldSpec => ({ key, label, type: 'select', options });

export interface ProtocolStyleSpec {
  id: ProtocolStyle;
  label: string;
  color: string;
  dash?: string;
  /** Velocidade base da particula, em segundos por volta. */
  speed: number;
  description: string;
}

/**
 * A natureza da comunicacao define a leitura visual da aresta:
 * cor, traco e ritmo da animacao.
 */
export const PROTOCOL_STYLES: Record<ProtocolStyle, ProtocolStyleSpec> = {
  sync: { id: 'sync', label: 'Sincrono', color: '#38bdf8', speed: 1.6, description: 'Quem chama espera a resposta — acopla disponibilidade.' },
  async: { id: 'async', label: 'Assincrono', color: '#fbbf24', dash: '9 7', speed: 2.6, description: 'Mensagem entregue depois — desacopla e absorve pico.' },
  stream: { id: 'stream', label: 'Streaming', color: '#a78bfa', dash: '2 5', speed: 1.1, description: 'Canal continuo de dados ou eventos.' },
  schedule: { id: 'schedule', label: 'Agendado', color: '#f472b6', dash: '14 6 3 6', speed: 3.2, description: 'Disparado pelo relogio, nao por um usuario.' },
  data: { id: 'data', label: 'Acesso a dados', color: '#4ade80', speed: 1.3, description: 'Leitura ou escrita em um repositorio de estado.' },
};

export const PROTOCOLS: ProtocolSpec[] = [
  {
    kind: 'rest',
    label: 'HTTP / REST',
    short: 'REST',
    style: 'sync',
    icon: 'Globe',
    description: 'Request/response sobre HTTP.',
    defaults: { method: 'POST', timeout: '3s' },
    fields: [
      select('method', 'Metodo', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      text('path', 'Rota', '/api/v1/orders'),
      text('timeout', 'Timeout', '3s'),
      select('retry', 'Retentativa', ['sem retry', '3x backoff exponencial', 'circuit breaker', 'retry + fallback']),
      select('auth', 'Autenticacao', ['JWT', 'mTLS', 'API key', 'OAuth2', 'interna / sem auth']),
      text('idempotency', 'Idempotencia', 'Idempotency-Key'),
    ],
  },
  {
    kind: 'graphql',
    label: 'GraphQL',
    short: 'GQL',
    style: 'sync',
    icon: 'Braces',
    description: 'Query, mutation ou subscription.',
    fields: [select('operation', 'Operacao', ['query', 'mutation', 'subscription']), text('name', 'Nome', 'createOrder'), text('timeout', 'Timeout', '3s')],
  },
  {
    kind: 'grpc',
    label: 'gRPC',
    short: 'gRPC',
    style: 'sync',
    icon: 'Binary',
    description: 'RPC binario com contrato protobuf.',
    fields: [text('method', 'Metodo', 'OrderService/CreateOrder'), text('deadline', 'Deadline', '500ms'), select('streaming', 'Streaming', ['unary', 'server streaming', 'client streaming', 'bidirecional'])],
  },
  {
    kind: 'websocket',
    label: 'WebSocket',
    short: 'WS',
    style: 'stream',
    icon: 'RadioTower',
    description: 'Canal persistente e bidirecional.',
    duplex: true,
    fields: [text('event', 'Mensagem', 'order.status.changed'), text('heartbeat', 'Heartbeat', 'ping a cada 30s')],
  },
  {
    kind: 'sse',
    label: 'Server-Sent Events',
    short: 'SSE',
    style: 'stream',
    icon: 'Rss',
    description: 'Fluxo unidirecional do servidor para o cliente.',
    fields: [text('event', 'Evento', 'order.updated'), text('reconnect', 'Reconexao', 'retry: 3000ms')],
  },
  {
    kind: 'webhook',
    label: 'Webhook',
    short: 'HOOK',
    style: 'async',
    icon: 'Webhook',
    description: 'Callback HTTP disparado por um evento.',
    fields: [text('event', 'Evento', 'payment.approved'), text('url', 'URL de destino', 'https://parceiro/hooks/pagamentos'), text('signature', 'Assinatura', 'HMAC SHA-256'), select('retry', 'Retentativa', ['3x backoff', '5x backoff + DLQ', 'sem retry'])],
  },
  {
    kind: 'queue-message',
    label: 'Mensagem em fila',
    short: 'QUEUE',
    style: 'async',
    icon: 'Inbox',
    description: 'Comando ponto-a-ponto processado por um consumidor.',
    defaults: { delivery: 'at-least-once' },
    fields: [
      text('message', 'Mensagem', 'ProcessPaymentCommand'),
      select('delivery', 'Garantia', ['at-least-once', 'at-most-once', 'exactly-once (efetivo)']),
      text('orderingKey', 'Chave de ordenacao', 'orderId'),
      text('dlq', 'DLQ', 'apos 5 tentativas'),
    ],
  },
  {
    kind: 'pubsub-event',
    label: 'Evento pub/sub',
    short: 'EVENT',
    style: 'async',
    icon: 'Radio',
    description: 'Evento de dominio publicado para N assinantes.',
    fields: [text('event', 'Evento', 'OrderPlaced'), text('version', 'Versao do schema', 'v1'), text('payload', 'Payload', '{ orderId, total, items[] }')],
  },
  {
    kind: 'stream-event',
    label: 'Stream de eventos',
    short: 'STREAM',
    style: 'stream',
    icon: 'Waves',
    description: 'Registro append-only, reprocessavel por offset.',
    fields: [text('topic', 'Topico', 'orders.v1'), text('partitionKey', 'Chave de particao', 'orderId'), select('offset', 'Consumo', ['latest', 'earliest', 'committed offset'])],
  },
  {
    kind: 'sql-query',
    label: 'Query / transacao',
    short: 'SQL',
    style: 'data',
    icon: 'Database',
    description: 'Leitura ou escrita em banco de dados.',
    defaults: { operation: 'SELECT' },
    fields: [select('operation', 'Operacao', ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'transacao']), text('target', 'Tabela / colecao', 'orders'), select('consistency', 'Leitura', ['primaria', 'replica de leitura', 'eventual'])],
  },
  {
    kind: 'cache-access',
    label: 'Acesso a cache',
    short: 'CACHE',
    style: 'data',
    icon: 'MemoryStick',
    description: 'Hit, escrita ou invalidacao de chave.',
    fields: [select('operation', 'Operacao', ['GET', 'SET', 'DEL / invalidar', 'GET + fallback']), text('key', 'Chave', 'order:{id}'), text('ttl', 'TTL', '60s')],
  },
  {
    kind: 'cron-trigger',
    label: 'Disparo agendado',
    short: 'CRON',
    style: 'schedule',
    icon: 'CalendarClock',
    description: 'O relogio inicia a execucao.',
    defaults: { expression: '*/5 * * * *' },
    fields: [text('expression', 'Expressao', '*/5 * * * *'), text('timezone', 'Timezone', 'America/Sao_Paulo'), text('job', 'Acao', 'varrer pedidos pendentes')],
  },
  {
    kind: 'batch-transfer',
    label: 'Carga em lote',
    short: 'BATCH',
    style: 'schedule',
    icon: 'FileStack',
    description: 'Transferencia de grande volume em janela.',
    fields: [select('format', 'Formato', ['CSV', 'Parquet', 'JSON Lines', 'Avro']), text('volume', 'Volume', '~2M linhas'), text('window', 'Janela', 'diario 03:00')],
  },
  {
    kind: 'tcp',
    label: 'TCP / Socket',
    short: 'TCP',
    style: 'sync',
    icon: 'Cable',
    description: 'Conexao de baixo nivel entre processos.',
    fields: [text('port', 'Porta', '5432'), text('pool', 'Pool', 'max 20 conexoes')],
  },
  {
    kind: 'internal-call',
    label: 'Chamada interna',
    short: 'IN-PROC',
    style: 'sync',
    icon: 'CornerDownRight',
    description: 'Invocacao no mesmo processo ou deploy.',
    fields: [text('method', 'Metodo', 'OrderService.create()')],
  },
];

export const PROTOCOL_BY_KIND = new Map(PROTOCOLS.map((p) => [p.kind, p]));

export function getProtocolSpec(kind: string): ProtocolSpec {
  return PROTOCOL_BY_KIND.get(kind) ?? PROTOCOLS[0];
}

export function protocolColor(kind: string): string {
  return PROTOCOL_STYLES[getProtocolSpec(kind).style].color;
}

export function protocolDash(kind: string): string | undefined {
  return PROTOCOL_STYLES[getProtocolSpec(kind).style].dash;
}

/**
 * Sugere o protocolo mais provavel a partir dos componentes ligados,
 * para que arrastar uma conexao ja produza uma aresta com sentido.
 */
export function suggestProtocol(sourceKind: string | undefined, targetKind: string | undefined): string {
  const target = targetKind ?? '';
  const source = sourceKind ?? '';

  const byTarget: Record<string, string> = {
    queue: 'queue-message',
    dlq: 'queue-message',
    topic: 'pubsub-event',
    'event-bus': 'pubsub-event',
    'event-stream': 'stream-event',
    'sql-database': 'sql-query',
    'nosql-database': 'sql-query',
    'data-warehouse': 'batch-transfer',
    'vector-database': 'sql-query',
    cache: 'cache-access',
    'search-engine': 'sql-query',
    'object-storage': 'batch-transfer',
    'grpc-service': 'grpc',
    'graphql-api': 'graphql',
    'websocket-server': 'websocket',
    'external-system': 'webhook',
  };

  const bySource: Record<string, string> = {
    'cron-job': 'cron-trigger',
    'delayed-job': 'cron-trigger',
    'batch-job': 'batch-transfer',
    queue: 'queue-message',
    dlq: 'queue-message',
    topic: 'pubsub-event',
    'event-bus': 'pubsub-event',
    'event-stream': 'stream-event',
    outbox: 'pubsub-event',
    'websocket-server': 'websocket',
  };

  return bySource[source] ?? byTarget[target] ?? 'rest';
}
