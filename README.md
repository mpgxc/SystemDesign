# System Design Studio

Editor visual para desenhar arquiteturas de sistemas distribuidos: voce arrasta componentes
(API, fila, cron, banco, cache, stream...) para um canvas, liga um no outro escolhendo o **tipo
de comunicacao**, agrupa tudo em **contextos** e grava **fluxos animados** que mostram uma
requisicao percorrendo o desenho passo a passo.

Feito para a conversa que todo backend tem no quadro branco — so que com o diagrama vivo,
versionavel em JSON e exportavel em PNG.

## O que da para fazer

**Canvas**
- Arrastar da paleta para o canvas, ou clicar para adicionar no centro da viewport.
- Conectar arrastando de qualquer uma das quatro bordas de um componente para outro.
- Mover, redimensionar, selecionar por area, duplicar, copiar/colar e excluir.
- Desfazer/refazer com historico de 80 passos.
- Minimapa, zoom, grade com snap, tres formatos de aresta (ortogonal, curva, reta).

**Componentes (43 no catalogo, em 8 categorias)**
- *Clientes & canais*: web app, mobile, sistema externo.
- *Borda*: API gateway, load balancer, BFF, reverse proxy, CDN.
- *Aplicacao*: REST, GraphQL, gRPC, WebSocket, microservico, worker/consumer,
  funcao serverless, saga orchestrator, monolito modular.
- *Agendamento*: cron/scheduler, delayed/retry scheduler, batch/ETL.
- *Mensageria*: fila, topico pub/sub, event stream, event bus, DLQ, transactional outbox.
- *Dados*: relacional, NoSQL, cache, search, object storage, data warehouse, vector DB.
- *Observabilidade*: logs, metricas, tracing, alertas.
- *Seguranca & config*: auth/identity, secret manager, rate limiter, feature flags,
  config service, WAF.

Cada componente tem campos proprios no inspector — a fila pergunta broker, ordenacao,
visibility timeout e DLQ; o cron pergunta expressao, timezone e estrategia de lock; o banco
pergunta engine, replicacao e nivel de isolamento.

**Tipos de comunicacao (15)** agrupados por natureza, cada uma com cor, traco e ritmo proprios:

| Natureza | Protocolos |
| --- | --- |
| Sincrono | HTTP/REST, GraphQL, gRPC, TCP/Socket, chamada interna |
| Assincrono | mensagem em fila, evento pub/sub, webhook |
| Streaming | WebSocket, Server-Sent Events, stream de eventos |
| Agendado | disparo agendado (cron), carga em lote |
| Acesso a dados | query/transacao, acesso a cache |

Ao ligar dois componentes o protocolo provavel ja vem escolhido: ligar num topico sugere
evento pub/sub, num banco sugere query, saindo de um cron sugere disparo agendado.

**Contextos**
Caixas redimensionaveis que representam limites de dominio ou de time. Soltar um componente
dentro agrupa; arrastar para fora desagrupa. `Ctrl+G` envolve a selecao atual num contexto novo,
e o botao de ajuste redimensiona cada contexto para caber exatamente o que tem dentro.

**Fluxos animados**
Um fluxo e uma sequencia ordenada de conexoes com uma legenda por passo. Durante a reproducao
a aresta do passo atual ganha brilho e particulas, os participantes sao realcados, o resto do
desenho escurece e um HUD controla play/pause, passo a passo, loop e velocidade. Serve tanto
para explicar o caminho feliz quanto para mostrar o que acontece quando o downstream cai.

**Persistencia e exportacao**
Salvamento automatico em `localStorage`, exportacao/importacao em JSON e exportacao em PNG
(o desenho inteiro, independente do zoom da tela). Dois exemplos completos vem prontos:
*Checkout event-driven* e *Streaming + CQRS*.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + bundle de producao em dist/
npm run preview    # serve o bundle em http://localhost:4173
npm run typecheck  # so a checagem de tipos
```

### Teste de fumaca

`e2e/smoke.mjs` dirige o app de verdade num Chromium e cobre o caminho completo: arrastar da
paleta, conectar, trocar protocolo, agrupar em contexto, desfazer/refazer, criar e reproduzir
um fluxo, e sobreviver a um reload.

```bash
npm run build && npm run preview &   # servidor em 4173
npm run test:e2e
```

Se ja existir um Chromium no ambiente, aponte para ele e pule o download do Playwright:

```bash
CHROMIUM=/caminho/para/chromium npm run test:e2e
```

## Como o codigo esta organizado

```
src/
  domain/          modelo do dominio, sem React
    types.ts         nos, arestas, fluxos e o documento salvo
    catalog.ts       catalogo de componentes: categoria, icone, forma e campos
    protocols.ts     tipos de comunicacao, estilo visual e inferencia de protocolo
    templates.ts     arquiteturas de exemplo
    tones.ts         paleta dos contextos e fluxos
    icons.tsx        registro explicito de icones (nome invalido quebra no build)
  store/
    designer.ts      store Zustand: grafo, historico, contextos, fluxos e playback
    selectors.ts     hooks derivados (papel de cada no/aresta no fluxo em reproducao)
  lib/
    geometry.ts      posicao absoluta, contencao em contexto e ordenacao pai-antes-do-filho
    persistence.ts   localStorage, parse e download do JSON
    export-image.ts  exportacao em PNG
  components/
    canvas/          ReactFlow, nos, aresta animada e HUD de reproducao
    panels/          paleta, inspector e painel de fluxos
    ui/              campos de formulario e dropdown
```

O dominio nao conhece React nem React Flow: o catalogo e uma lista de dados e a UI so o
renderiza. Toda mutacao do grafo passa pelo store, que e quem decide quando empilhar um
snapshot no historico e quando gravar no `localStorage`.

### Adicionar um componente novo ao catalogo

Um item em `src/domain/catalog.ts` e o icone correspondente em `src/domain/icons.tsx`:

```ts
{
  kind: 'graph-database',
  label: 'Banco de Grafos',
  category: 'data',
  icon: 'Share2',
  shape: 'cylinder',
  description: 'Relacionamentos como cidadao de primeira classe.',
  keywords: ['neo4j', 'grafo'],
  fields: [
    select('engine', 'Engine', ['Neo4j', 'ArangoDB', 'Neptune']),
    text('traversal', 'Consulta tipica', 'shortestPath(a, b)'),
  ],
}
```

Ele aparece na paleta, na busca, no inspector e no minimapa sem mais nenhuma alteracao.

### Adicionar um tipo de comunicacao

Um item em `src/domain/protocols.ts`, reusando uma das cinco naturezas (ou criando outra em
`PROTOCOL_STYLES`, o que tambem cria os marcadores de seta e a legenda). Para que ele seja
sugerido automaticamente, mapeie o componente de origem ou destino em `suggestProtocol`.

### Formato do arquivo

O JSON exportado e o mesmo objeto guardado no `localStorage`:

```jsonc
{
  "version": 1,
  "name": "Checkout event-driven",
  "nodes": [ /* nos do React Flow; data.kind aponta para o catalogo */ ],
  "edges": [ /* data.protocol aponta para o catalogo de protocolos */ ],
  "flows": [ { "id": "...", "name": "...", "steps": [{ "edgeId": "...", "caption": "..." }] } ],
  "updatedAt": "2026-09-17T12:00:00.000Z"
}
```

## Atalhos

| Atalho | Acao |
| --- | --- |
| `Del` / `Backspace` | remove a selecao |
| `Ctrl+D` | duplica |
| `Ctrl+G` | agrupa a selecao num contexto |
| `Ctrl+C` / `Ctrl+V` | copia e cola |
| `Ctrl+Z` / `Ctrl+Shift+Z` | desfaz e refaz |
| `Espaco` | reproduz/pausa o fluxo ativo |
| arrastar com `Shift` | selecao por area |
| botao do meio / direito | move o canvas |

## Stack

React 19, TypeScript, Vite 6, [React Flow](https://reactflow.dev) (`@xyflow/react`),
Zustand 5, Tailwind CSS 4, lucide-react e html-to-image.
