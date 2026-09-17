/**
 * Roteiro de fumaca do editor, dirigindo o app de verdade num Chromium.
 *
 *   npm run build && npm run preview     # em um terminal
 *   npm run test:e2e                     # em outro
 *
 * Variaveis opcionais:
 *   BASE_URL   endereco do preview (padrao http://localhost:4173)
 *   CHROMIUM   caminho de um Chromium ja instalado (pula o download do Playwright)
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const STORAGE_KEY = 'system-design-studio:document:v1';

const launchOptions = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM) launchOptions.executablePath = process.env.CHROMIUM;

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('dialog', (dialog) => dialog.accept());

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS ' : 'FALHA'} · ${name}${detail ? ` — ${detail}` : ''}`);
}

const count = () =>
  page.evaluate(() => ({
    comp: document.querySelectorAll('.react-flow__node-component').length,
    ctx: document.querySelectorAll('.react-flow__node-context').length,
    edges: document.querySelectorAll('.react-flow__edge').length,
  }));

const savedDocument = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);

/** Arrasta um item da paleta ate um ponto do canvas. */
async function dragFromPalette(label, x, y) {
  const item = page.locator('aside button[draggable="true"]', { hasText: label }).first();
  await item.hover();
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(280);
}

/** Ponto na tela correspondente ao meio do caminho da primeira aresta. */
const firstEdgeMidpoint = () =>
  page.evaluate(() => {
    const path = document.querySelector('.react-flow__edge path.react-flow__edge-interaction');
    const middle = path.getPointAtLength(path.getTotalLength() / 2);
    const point = path.ownerSVGElement.createSVGPoint();
    point.x = middle.x;
    point.y = middle.y;
    const screen = point.matrixTransform(path.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });

await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check('primeira visita abre um exemplo navegavel', (await count()).comp > 0);

await page.getByRole('button', { name: 'Exemplos' }).click();
await page.getByText('Comecar do zero').click();
await page.waitForTimeout(700);
check('"Comecar do zero" limpa o canvas', (await count()).comp === 0);

await dragFromPalette('REST API', 650, 280);
await dragFromPalette('Fila (Queue)', 650, 540);
await dragFromPalette('Worker / Consumer', 1050, 540);
check('arrastar da paleta cria componentes', (await count()).comp === 3);

const pairs = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('.react-flow__node-component')];
  const handle = (node, side) => {
    const rect = node.querySelector(`.react-flow__handle-${side}`).getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };
  return [
    [handle(nodes[0], 'bottom'), handle(nodes[1], 'top')],
    [handle(nodes[1], 'right'), handle(nodes[2], 'left')],
  ];
});
for (const [from, to] of pairs) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}
check('conectar arrastando entre as bordas', (await count()).edges === 2);

const labels = await page.evaluate(() =>
  [...document.querySelectorAll('.react-flow__edgelabel-renderer > div')].map((el) => el.textContent.trim()),
);
check('protocolo inferido pelos componentes ligados', labels.some((l) => l.includes('QUEUE')), labels.join(' | '));

const midpoint = await firstEdgeMidpoint();
await page.mouse.click(midpoint.x, midpoint.y);
await page.waitForTimeout(400);
check('clicar na aresta abre o seletor de protocolo', await page.getByText('Tipo de comunicacao').isVisible());

await page.getByRole('button', { name: 'gRPC', exact: true }).click();
await page.waitForTimeout(350);
const afterSwap = await page.evaluate(() => document.querySelector('.react-flow__edgelabel-renderer').textContent);
check('trocar o tipo de comunicacao atualiza a aresta', afterSwap.includes('gRPC'));

await page.mouse.click(400, 810);
await page.getByRole('button', { name: 'Contexto', exact: true }).click();
await page.waitForTimeout(400);
const contextBox = await page.locator('.react-flow__node-context').first().boundingBox();
await dragFromPalette('Banco Relacional', contextBox.x + contextBox.width / 2, contextBox.y + contextBox.height / 2);
const grouped = (await savedDocument()).nodes.find((n) => n.data?.kind === 'sql-database');
check('soltar dentro do contexto agrupa o componente', Boolean(grouped?.parentId));

const dbBox = await page.locator('.react-flow__node-component', { hasText: 'Banco Relacional' }).first().boundingBox();
await page.mouse.move(dbBox.x + 60, dbBox.y + 12);
await page.mouse.down();
await page.mouse.move(dbBox.x + 60, contextBox.y + contextBox.height + 200, { steps: 18 });
await page.mouse.up();
await page.waitForTimeout(500);
const detached = (await savedDocument()).nodes.find((n) => n.data?.kind === 'sql-database');
check('arrastar para fora do contexto desagrupa', Boolean(detached) && !detached.parentId);

await page.keyboard.down('Shift');
await page.mouse.move(300, 130);
await page.mouse.down();
await page.mouse.move(1450, 920, { steps: 18 });
await page.mouse.up();
await page.keyboard.up('Shift');
await page.waitForTimeout(400);
const selected = await page.evaluate(() => document.querySelectorAll('.react-flow__node.selected').length);
check('selecao por area pega varios nos', selected >= 4, `selecionados=${selected}`);

const beforeGroup = await count();
await page.keyboard.press('Control+g');
await page.waitForTimeout(500);
const afterGroup = await count();
check('Ctrl+G agrupa a selecao num contexto', afterGroup.ctx === beforeGroup.ctx + 1);

await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
const undone = await count();
await page.keyboard.press('Control+Shift+z');
await page.waitForTimeout(400);
const redone = await count();
check('desfazer e refazer', undone.ctx === beforeGroup.ctx && redone.ctx === afterGroup.ctx);

await page.locator('header input[placeholder="Nome da arquitetura"]').fill('Arquitetura de teste');
await page.getByRole('button', { name: /Fluxos/ }).click();
await page.getByRole('button', { name: 'Novo' }).click();
await page.waitForTimeout(400);
await page.mouse.click(midpoint.x, midpoint.y);
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Fluxos/ }).click();
await page.getByRole('button', { name: /Capturar/ }).click();
await page.waitForTimeout(400);
await page.locator('section button[title="Reproduzir"]').first().click();
await page.waitForTimeout(900);
const hud = await page.locator('text=/passo \\d+\\/\\d+/').first().textContent();
check('criar fluxo, capturar passos e reproduzir', Boolean(hud), hud ?? '');

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const restored = await page.evaluate(() => ({
  name: document.querySelector('header input')?.value,
  comp: document.querySelectorAll('.react-flow__node-component').length,
}));
check('o desenho sobrevive ao reload', restored.name === 'Arquitetura de teste' && restored.comp === 4);

check('nenhum erro de runtime', errors.length === 0, errors.slice(0, 3).join(' | '));

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} verificacoes passaram`);

await browser.close();
process.exit(passed === results.length ? 0 : 1);
