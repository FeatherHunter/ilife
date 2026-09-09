/** #89（89b 视觉锁验收）· **内容页区块级验收探针**（B-01…B-12，12 区块）。
 *
 *  跑法（仓根，必须持锁——本脚本调用 cmd_read 生成样本并渲染真实产物）：
 *    node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-blocks.mjs --out <目录>
 *  退出码：0＝区块锚点全绿；1＝有锚点缺失（**当前态抽样，不是验收结论**）；
 *          **2＝缺 dist／缺浏览器／样本生成失败（链路不可用，绝不静默变绿）**。
 *
 *  纪律（`docs/visual-spec-blocks.md` §0）：
 *    ① **不锚 DOM 同构**：只锚「命名空间 ＋ 必需属性 ＋ 状态取值 ＋ 数值规格」。
 *    ② 能引用就不重述：数值引用冻结常量（`TOAST_DEFAULTS`／`STYLE_PREFIX`／`renderEmptyState`…）。
 *    ③ 控件 vs 区块分层：区块只组合控件，不重定义控件签名。
 *
 *  **H-13／H-14／H-17 的落点**：HELP 页判 N/A（`.kpi`=0／`<svg>`=0／`<table>`=0），
 *  转由本探针在**内容页**上按 B-02（KPI）／B-04（图表）／B-03（表格）判——即 D-15／D-18b 的裁定口径。
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(ROOT, outArg > 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '.scratch/t89/evidence/blocks');
const SAMPLES = resolve(ROOT, '.scratch/t89/blocks');
const CLI = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const DIST_INDEX = join(ROOT, 'packages/base-render/dist/index.js');
const HELP = resolve(ROOT, '.scratch/t89/help-file.html');
const EMPTY_SAMPLE = resolve(ROOT, '.scratch/t89/empty-state-blocks.html');

/* 样本页：每条区块至少有一个承载页（可复算——`calorie-cmd-read <key>`） */
const PAGES = {
  'page-shell': 'calorie.view.ranking',
  'kpi': 'calorie.view.ranking',
  'table': 'calorie.view.diet',
  'charts': 'calorie.view.nutrition-ratio',
  'pre': 'calorie.view.diet',
  'detail': 'calorie.view.diet',
  'fold': 'calorie.view.ranking',
  'form': 'calorie.view.measure-wizard',
  'copy': 'calorie.view.measure-wizard',
  'rich': 'calorie.today',
};

const transcript = [];
const log = (line = '') => { transcript.push(line); console.log(line); };
const flush = () => { try { writeFileSync(join(OUT, 'probe-blocks.log'), transcript.join(LF) + LF, 'utf8'); } catch { /* 落盘失败不掩盖结论 */ } };
const results = [];
const observed = {};
const shots = [];
function check(id, name, ok, actual, expect) {
  results.push({ id, name, ok: ok === true });
  log('[ASSERT] ' + id + ' ' + name + ' → ' + (ok ? 'PASS' : 'FAIL') + '  实测=' + JSON.stringify(actual) + '  期望=' + JSON.stringify(expect));
  return ok === true;
}
function die(code, message) { log('RESULT: ABORT exit=' + code + ' :: ' + message); flush(); process.exit(code); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
mkdirSync(OUT, { recursive: true });
mkdirSync(SAMPLES, { recursive: true });

if (!existsSync(DIST_INDEX)) die(2, '缺 dist：' + DIST_INDEX + '（先 pnpm build）');
if (!existsSync(CLI)) die(2, '缺 CLI：' + CLI + '（先 pnpm build）');
const BROWSER = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined || process.env.T89_NO_BROWSER === '1') {
  die(2, '未找到 Chrome／Edge（或 T89_NO_BROWSER=1）：B-02／B-03／B-06／B-08／B-09 的判据是渲染后 computed，'
    + '无浏览器即无证据 → 显式失败（不静默跳过）。用 DSH_BROWSER=<路径> 指定。');
}

/* ── 样本生成（一次持锁内跑完） ──────────────────────────────────────────── */
const base = await import(pathToFileURL(DIST_INDEX).href);
log('# #89 内容页区块级验收探针（B-01…B-12）');
log('STYLE_PREFIX=' + base.STYLE_PREFIX + ' TOAST_DEFAULTS=' + JSON.stringify(base.TOAST_DEFAULTS));
const artifacts = {};
for (const [alias, key] of Object.entries(PAGES)) {
  const file = join(SAMPLES, key + '.html');
  const r = spawnSync('node', [CLI, key, '--output', file], { encoding: 'utf8', cwd: ROOT });
  if (r.status !== 0 || !existsSync(file)) die(2, '样本生成失败：' + key + ' exit=' + r.status + ' ' + String(r.stderr || '').slice(0, 200));
  const buf = readFileSync(file);
  artifacts[alias] = { key, file, bytes: buf.length, sha256_16: createHash('sha256').update(buf).digest('hex').slice(0, 16).toUpperCase(), html: buf.toString('utf8') };
  log('sample ' + alias + ' <- ' + key + ' bytes=' + buf.length + ' sha256_16=' + artifacts[alias].sha256_16);
}
const count = (s, re) => (s.match(re) || []).length;

/* ══ 静态锚点（不锚 DOM 同构，只锚命名空间／属性／状态／数值） ═════════════ */
const shell = artifacts['page-shell'].html;
/* ── B-01 页面壳／标题区 ─────────────────────────────────────────────────── */
const b01 = {
  residual: count(shell, /<!--[A-Z][A-Z0-9-]+-->/g),
  ids: (() => { const ids = shell.match(/\sid="[^"]+"/g) || []; return { uniq: new Set(ids).size, total: ids.length }; })(),
  rootCls: (shell.match(/<body>\s*<[a-z]+[^>]*class="([^"]+)"/i) || [])[1],
  shellNs: count(shell, /ilife-block-page-shell/g), pageNs: count(shell, /ilife-page/g),
  payloadSlot: count(shell, /data-script-id=/g),
};
observed['B-01'] = b01;
check('B-01.1', '占位符零残留（<!--[A-Z0-9-]+--> 命中 0）', b01.residual === 0, b01.residual, 0);
check('B-01.2', '元素 id 全唯一', b01.ids.uniq === b01.ids.total, b01.ids, 'n/n');
check('B-01.3', '根节点含以冻结 STYLE_PREFIX 开头的类名（实测 class="wrap ilife-page"）',
  typeof b01.rootCls === 'string' && String(b01.rootCls).split(/\s+/).some((c) => c.indexOf(String(base.STYLE_PREFIX)) === 0), b01.rootCls, '含 ilife- 前缀类');
check('B-01.4', '页面壳命名空间存在（ilife-block-page-shell ＋ ilife-page）', b01.shellNs > 0 && b01.pageNs > 0, { shellNs: b01.shellNs, pageNs: b01.pageNs }, '两者 >0');

/* ── B-02 KPI 卡（HELP 页 N/A → 本区块承接 H-13） ────────────────────────── */
const kpi = artifacts['kpi'].html;
const b02 = {
  card: count(kpi, /ilife-block-kpi-card(?![-a-z])/g), label: count(kpi, /ilife-block-kpi-label/g),
  valueRow: count(kpi, /ilife-block-kpi-value-row/g), value: count(kpi, /ilife-block-kpi-value(?![-a-z])/g),
  unit: count(kpi, /ilife-block-kpi-unit/g), detail: count(kpi, /ilife-block-kpi-detail/g),
  badge: count(kpi, /ilife-status-badge/g), grid: count(kpi, /ilife-block-kpi-card-grid/g),
  legacyKpi: count(kpi, /ilife-kpi/g),
};
observed['B-02'] = b02;
check('B-02.1', 'KPI 四槽齐（label／value／unit／detail 各 ≥1）',
  b02.label > 0 && b02.value > 0 && b02.unit > 0 && b02.detail > 0, b02, '四槽各 >0');
check('B-02.2', 'value 与 unit 同基线容器（value-row）存在', b02.valueRow > 0 && b02.grid > 0, { valueRow: b02.valueRow, grid: b02.grid }, '两者 >0');
/* 非法 status → 降级 empty（冻结 renderStatusBadge） */
const badBadge = base.renderStatusBadge({ status: 'bogus', text: 'x' });
const b02b = { fallback: String(badBadge).slice(0, 120), hasEmpty: /ilife-status-badge-empty/.test(String(badBadge)) };
observed['B-02'].badgeFallback = b02b;
check('B-02.3', '非法 status 降级 empty（冻结 renderStatusBadge 回落）', b02b.hasEmpty, b02b, '含 ilife-status-badge-empty');

/* ── B-03 表格（HELP 页 N/A → 本区块承接 H-17／D-18b） ───────────────────── */
const tbl = artifacts['table'].html;
const b03 = {
  table: count(tbl, /<table[\s>]/gi), thead: count(tbl, /<thead[\s>]/gi), th: count(tbl, /<th[\s>]/gi),
  td: count(tbl, /<td[\s>]/gi), tr: count(tbl, /<tr[\s>]/gi),
  ns: count(tbl, /ilife-block-data-table(?![-a-z])/g), caption: count(tbl, /ilife-block-data-table-caption/g),
  divTable: count(tbl, /ilife-block-data-table-(?:row|cell)(?![-a-z])/g),
};
observed['B-03'] = b03;
check('B-03.1', '强制语义标签：<table>/<thead>/<th>/<td> 各 >0（DB-3）',
  b03.table > 0 && b03.thead > 0 && b03.th > 0 && b03.td > 0, b03, '四者各 >0');
check('B-03.2', '整表在卡片容器内（ilife-block-data-table 命名空间 ＋ caption）', b03.ns > 0 && b03.caption > 0, { ns: b03.ns, caption: b03.caption }, '两者 >0');

/* ── B-04 图表（HELP 页 N/A → 本区块承接 H-14） ──────────────────────────── */
const ch = artifacts['charts'].html;
const b04 = {
  ns: count(ch, /ilife-charts(?![-a-z])/g), svg: count(ch, /ilife-charts-svg/g), canvas: count(ch, /<canvas[\s>]/gi),
  viewBox: count(ch, /viewBox="/g), kinds: count(ch, /ilife-charts-(?:bar|line|donut|ring|pie|scatter|area|stack)/g),
  anim: count(ch, /ilife-charts-anim/g), emptyRule: base.CHART_EMPTY_RULE, kindsFrozen: base.CHART_KINDS.length,
};
observed['B-04'] = b04;
check('B-04.1', '图表命名空间存在且 `<canvas>` 命中 0（DB-6：纯 CSS＋SVG）', b04.ns > 0 && b04.svg > 0 && b04.canvas === 0, b04, 'ns>0 / svg>0 / canvas=0');
check('B-04.2', 'SVG 含 viewBox（坐标系自洽）', b04.viewBox > 0, b04.viewBox, '>0');
const chartApi = Object.keys(base.charts || {});
const emptyChart = base.charts && base.charts.bar ? base.charts.bar({ items: [] }) : null;
let illegalChart = null;
try { base.charts.bar({ items: 'bogus' }); illegalChart = 'no-throw'; } catch (e) { illegalChart = e.name || String(e).slice(0, 40); }
observed['B-04'].api = { keys: chartApi, emptyShape: emptyChart ? Object.keys(emptyChart) : null, emptyFlag: emptyChart ? emptyChart.empty : null, illegal: illegalChart };
check('B-04.3', '冻结 charts API 8 种 kind 齐全且空数据走空态（empty=true）＋ 非法输入抛错',
  chartApi.length === base.CHART_KINDS.length && emptyChart !== null && emptyChart.empty === true && illegalChart === 'ChartError',
  observed['B-04'].api, base.CHART_KINDS.length + ' 种 + empty=true + ChartError');

/* ── B-05 列表（行） ─────────────────────────────────────────────────────── */
const rich = artifacts.rich.html;
const b05 = {
  listNs: count(rich, /ilife-list|ilife-block-list|ilife-row(?![-a-z])/g),
  blockNs: count(rich, /ilife-block(?![-a-z])/g),
};
observed['B-05'] = b05;
check('B-05.1', '列表命名空间可识别（ilife-list／ilife-block-list／ilife-row）', b05.listNs > 0, b05, '>0');

/* ── B-06 指令块 <pre> ───────────────────────────────────────────────────── */
const pre = artifacts['pre'].html;
const b06 = {
  pre: count(pre, /<pre[\s>]/gi), copyBtn: count(pre, /ilife-copy-btn/g),
  actionId: count(pre, /data-action-id=/g), dataT: count(pre, /data-t=/g),
};
observed['B-06'] = b06;
check('B-06.1', '指令块载体是 <pre>', b06.pre > 0, b06.pre, '>0');
check('B-06.2', '带复制则按钮必带 data-action-id ＋ data-t（两属性计数相等且 >0）',
  b06.actionId > 0 && b06.actionId === b06.dataT, b06, '相等且 >0');

/* ── B-07 详情区（场景 schema，用 HELP 产物判） ──────────────────────────── */
const helpHtml = existsSync(HELP) ? readFileSync(HELP, 'utf8') : '';
const sceneSchema = base.SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups.items.properties.scenes.items;
const sceneRequired = sceneSchema.required || [];
const sceneProps = Object.keys(sceneSchema.properties || {});
const b07 = {
  required: sceneRequired, props: sceneProps, typeField: base.SCENE_TYPE_FIELD, statusSet: base.SCENE_STATUS,
  helpScenes: count(helpHtml, /ilife-help-shell-card-title/g), helpFields: count(helpHtml, /ilife-help-shell-field-label/g),
  pluralField: sceneProps.indexOf(base.SCENE_TYPE_FIELD) >= 0,
};
observed['B-07'] = b07;
check('B-07.1', '场景必填字段含 id／title／wake_word／status／prompt_template 逐字',
  ['id', 'title', 'wake_word', 'status', 'prompt_template'].every((k) => sceneRequired.indexOf(k) >= 0), sceneRequired, '五字段在册');
check('B-07.2', '类型字段取冻结 SCENE_TYPE_FIELD（复数，无单数别名）',
  String(base.SCENE_TYPE_FIELD) === 'types' && b07.pluralField && sceneProps.indexOf('type') < 0, { field: b07.typeField, props: sceneProps }, 'types');
check('B-07.3', 'SCENE_STATUS 为两值闭集', Array.isArray(base.SCENE_STATUS) && base.SCENE_STATUS.length === 2, b07.statusSet, '2 值');

/* ── B-08 折叠区（原生 details／summary） ────────────────────────────────── */
const fold = artifacts['fold'].html;
const b08 = {
  details: count(fold, /<details[\s>]/gi), summary: count(fold, /<summary[\s>]/gi),
  ns: count(fold, /ilife-block-disclosure/g), divFold: count(fold, /ilife-block-disclosure-(?:body|summary)/g),
};
observed['B-08'] = b08;
check('B-08.1', '原生 <details>/<summary>（DB-4），details 与 summary 计数相等且 >0',
  b08.details > 0 && b08.details === b08.summary, b08, '相等且 >0');

/* ── B-09 表单／参数区 ───────────────────────────────────────────────────── */
const form = artifacts['form'].html;
const fieldInputs = [...form.matchAll(/<input\b[^>]*>/gi)].map((m) => m[0]);
const b09 = {
  ns: count(form, /ilife-block-param-form(?![-a-z])/g), label: count(form, /ilife-block-param-form-label/g),
  input: count(form, /ilife-block-param-form-input/g), inputs: fieldInputs.length,
  placeholders: fieldInputs.map((t) => (t.match(/placeholder="([^"]*)"/) || [])[1] || '').slice(0, 6),
  names: fieldInputs.map((t) => (t.match(/name="([^"]*)"/) || [])[1] || ''),
  namesNonEmpty: fieldInputs.filter((t) => /name="[^"]+"/.test(t)).length,
};
observed['B-09'] = b09;
check('B-09.1', '参数区命名空间 ＋ label ＋ input 齐（每个字段带 name）',
  b09.ns > 0 && b09.label > 0 && b09.inputs > 0 && b09.namesNonEmpty === b09.inputs,
  { ns: b09.ns, label: b09.label, inputs: b09.inputs, namesNonEmpty: b09.namesNonEmpty }, 'ns/label >0 且 name 齐');

/* ── B-10 空态（冻结 renderEmptyState） ─────────────────────────────────── */
const emptyMarkup = base.renderEmptyState({ text: '暂无数据', icon: '📭', hint: '换个筛选条件试试' });
const b10 = {
  markup: emptyMarkup, root: /class="ilife-empty"/.test(emptyMarkup), icon: /ilife-empty-icon/.test(emptyMarkup),
  text: /ilife-empty-text/.test(emptyMarkup), hint: /ilife-empty-hint/.test(emptyMarkup),
  actionOptional: base.renderEmptyState({ text: 'x' }).indexOf('empty-action') < 0,
};
observed['B-10'] = b10;
check('B-10.1', '空态根 ilife-empty ＋ 子节点 icon／text／hint（text 必填，action 可选）',
  b10.root && b10.icon && b10.text && b10.hint && b10.actionOptional, { root: b10.root, icon: b10.icon, text: b10.text, hint: b10.hint, actionOptional: b10.actionOptional }, '四者齐');

/* ── B-11 复制区 ─────────────────────────────────────────────────────────── */
const b11 = {
  actionBar: count(form, /ilife-action-bar/g), actionRow: count(form, /ilife-action-row/g),
  copyBtn: count(form, /ilife-copy-btn/g), actionId: count(form, /data-action-id=/g), dataT: count(form, /data-t=/g),
  idAttr: base.ACTION_ID_ATTR, dataAttr: base.DEFAULT_DATA_ATTR, ids: Object.keys(base.COPY_ACTION_IDS),
};
observed['B-11'] = b11;
check('B-11.1', '复制按钮必带 data-action-id 与 data-t（两个不同属性）',
  b11.actionId > 0 && b11.actionId === b11.dataT && b11.idAttr === 'data-action-id' && b11.dataAttr === 'data-t', b11, 'data-action-id / data-t');
check('B-11.2', '空文本短路：copyText 返回 ok:false（reason=empty）且**不调**写入端口', await (async () => {
  const calls = [];
  const r = await base.copyText('', { fallback: async (t) => { calls.push(t); return true; } });
  observed['B-11'].emptyText = { result: r, portCalls: calls.length };
  return r.ok === false && r.reason === 'empty' && calls.length === 0;
})(), (() => { const e = observed['B-11'].emptyText; return e === undefined ? null : e; })(), 'ok:false / 端口零调用');

/* ── B-12 反馈区（toast ＋ 错误回执） ────────────────────────────────────── */
const toastDefaults = base.TOAST_DEFAULTS || {};
const errReceipt = base.renderErrorReceipt ? base.renderErrorReceipt({ title: '错误', message: 'm' }) : '';
const b12 = {
  defaults: toastDefaults, role: toastDefaults.role, live: toastDefaults.ariaLive,
  nsInSections: (Array.isArray(base.CONTROL_STYLE_SECTIONS) ? base.CONTROL_STYLE_SECTIONS : Object.keys(base.CONTROL_STYLE_SECTIONS || {})).filter((k) => /^(toast|errorReceipt)$/.test(k)),
  allSections: Array.isArray(base.CONTROL_STYLE_SECTIONS) ? base.CONTROL_STYLE_SECTIONS : Object.keys(base.CONTROL_STYLE_SECTIONS || {}),
  receiptNoBtn: String(errReceipt).indexOf('data-action-id') < 0,
};
observed['B-12'] = b12;
check('B-12.1', 'toast 冻结 role／aria-live 在册（status／polite）',
  b12.role === 'status' && b12.live === 'polite', { role: b12.role, live: b12.live }, 'status/polite');
check('B-12.2', 'toast／errorReceipt 在冻结控件样式闭集内（8 区闭集）',
  b12.nsInSections.length === 2 && b12.allSections.length === 8, { hit: b12.nsInSections, sections: b12.allSections }, '2 个 / 闭集 8');
check('B-12.3', '错误回执缺 dataText／logText 时不渲染复制按钮', b12.receiptNoBtn, b12.receiptNoBtn, true);

/* ══ 浏览器 computed ＋ 截图（B-02／B-03／B-04／B-06／B-08／B-09） ═════════ */
const PORT = 10111 + (process.pid % 200);
const profile = join(OUT, '_profile-blocks');
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });
async function devtoolsUrl() {
  for (let i = 0; i < 120; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
    await sleep(250);
  }
  return null;
}
function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => { ws.addEventListener('open', () => res()); ws.addEventListener('error', (e) => reject(new Error('WS 错误：' + String(e && e.message)))); });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId++;
      return new Promise((res, reject) => {
        pending.set(id, { resolve: res, reject });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}
const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口 ' + PORT + ' 未就绪。'); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
async function evaluate(expression) {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
const evalJson = async (expr) => {
  const raw = await evaluate('(async function () { return JSON.stringify(await (' + expr + ')); }())');
  return raw === undefined ? undefined : JSON.parse(raw);
};
await s('Page.enable');
await s('Runtime.enable');
const bv = await cdp.send('Browser.getVersion');
log('browser=' + BROWSER + ' version=' + bv.product);
async function viewportShot(block, step) {
  const dir = join(OUT, block); mkdirSync(dir, { recursive: true });
  const file = join(dir, step + '.png');
  const r = await s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push({ block, step, file: file.slice(OUT.length + 1).replace(/\\/g, '/'), bytes: readFileSync(file).length });
  return file;
}
async function openPage(url, waitSel) {
  await s('Page.navigate', { url });
  for (let i = 0; i < 300; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
  await sleep(600);
  if (waitSel) { for (let i = 0; i < 60; i += 1) { if (await evaluate('!!document.querySelector(' + JSON.stringify(waitSel) + ')') === true) break; await sleep(100); } }
}

/* ── B-02 computed（KPI 四槽 ＋ tnum ＋ 值档） ───────────────────────────── */
await openPage(pathToFileURL(artifacts['kpi'].file).href, '.ilife-block-kpi-card');
const c02 = await evalJson(`(function () {
  var card = document.querySelector('.ilife-block-kpi-card'); if (!card) return null;
  var q = function (sel) { var el = card.querySelector(sel); if (!el) return null; var cs = getComputedStyle(el);
    return { text: (el.textContent || '').trim().slice(0, 16), size: cs.fontSize, weight: cs.fontWeight, color: cs.color, tnum: cs.fontFeatureSettings }; };
  var cs = getComputedStyle(card);
  return { padding: cs.padding, radius: cs.borderRadius, background: cs.backgroundColor, border: cs.borderTopWidth,
    label: q('.ilife-block-kpi-label'), value: q('.ilife-block-kpi-value'), unit: q('.ilife-block-kpi-unit'),
    detail: q('.ilife-block-kpi-detail'), valueRow: !!card.querySelector('.ilife-block-kpi-value-row') }; }())`);
observed['B-02'].computed = c02;
check('B-02.4', 'KPI 卡 computed 四槽齐（label／value／unit／detail 文本节点）',
  c02 !== null && c02.label !== null && c02.value !== null && c02.unit !== null && c02.detail !== null, c02, '四槽齐');
check('B-02.5', 'KPI 数值 computed 含 tnum（H-13「数值带 tnum」）',
  c02 !== null && c02.value !== null && String(c02.value.tnum).indexOf('tnum') >= 0, c02 && c02.value, '含 tnum');
await viewportShot('B-02', 'viewport');

/* ── B-03 computed（th／td／末行） ───────────────────────────────────────── */
await openPage(pathToFileURL(artifacts['table'].file).href, '.ilife-block-data-table-table');
const c03 = await evalJson(`(function () {
  var t = document.querySelector('.ilife-block-data-table-table') || document.querySelector('table'); if (!t) return null;
  var th = t.querySelector('th'), td = t.querySelector('td');
  var rows = t.querySelectorAll('tbody tr');
  var lastTd = rows.length ? rows[rows.length - 1].querySelector('td') : null;
  var g = function (el) { if (!el) return null; var cs = getComputedStyle(el);
    return { textTransform: cs.textTransform, fontSize: cs.fontSize, fontWeight: cs.fontWeight, background: cs.backgroundColor,
      borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle, padding: cs.paddingTop + '/' + cs.paddingLeft, color: cs.color }; };
  return { th: g(th), td: g(td), lastTd: g(lastTd), rows: rows.length, inCard: !!t.closest('.ilife-block-data-table') }; }())`);
observed['B-03'].computed = c03;
check('B-03.3', 'th computed 大写 ＋ 透明背景 ＋ 1px 下边框 ＋ 字号 ∈[11.5,12]px ＋ 600',
  c03 !== null && c03.th.textTransform === 'uppercase' && c03.th.background === 'rgba(0, 0, 0, 0)'
  && c03.th.borderBottom.indexOf('1px') === 0 && parseFloat(c03.th.fontSize) >= 11.5 && parseFloat(c03.th.fontSize) <= 12
  && String(c03.th.fontWeight) === '600', c03 && c03.th, 'uppercase/transparent/1px/11.5–12/600');
check('B-03.4', 'td 内距 ∈[12,14]px ＋ 1px 软描边 ＋ 末行无下边框',
  c03 !== null && c03.td !== null && parseFloat(c03.td.padding.split('/')[1]) >= 12 && parseFloat(c03.td.padding.split('/')[1]) <= 14
  && c03.td.borderBottom.indexOf('1px') === 0 && c03.lastTd !== null && c03.lastTd.borderBottom.indexOf('0px') === 0,
  c03 && { td: c03.td, lastTd: c03.lastTd }, '12–14px/1px/末行 0px');
check('B-03.5', '整表在卡片容器内', c03 !== null && c03.inCard === true, c03 && c03.inCard, true);
await viewportShot('B-03', 'viewport');

/* ── B-04 computed（无 canvas ＋ viewBox） ───────────────────────────────── */
await openPage(pathToFileURL(artifacts['charts'].file).href, '.ilife-charts-svg');
const c04 = await evalJson(`(function () { var svg = document.querySelector('.ilife-charts-svg');
  return { canvas: document.querySelectorAll('canvas').length, viewBox: svg ? svg.getAttribute('viewBox') : null,
    containerPadding: svg && svg.parentElement ? getComputedStyle(svg.parentElement).padding : null }; }())`);
observed['B-04'].computed = c04;
check('B-04.4', '渲染后 <canvas> 命中 0 且 SVG 带 viewBox（纯 CSS＋SVG，DB-6）',
  c04.canvas === 0 && typeof c04.viewBox === 'string' && c04.viewBox.split(/\\s+/).length === 4, c04, 'canvas=0 / viewBox 4 值');
await viewportShot('B-04', 'viewport');

/* ── B-06 computed（<pre> 数值规格） ─────────────────────────────────────── */
await openPage(pathToFileURL(artifacts['pre'].file).href, 'pre');
const c06 = await evalJson(`(function () { var p = document.querySelector('pre'); if (!p) return null; var cs = getComputedStyle(p);
  return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeightRatio: Math.round((parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)) * 1000) / 1000,
    whiteSpace: cs.whiteSpace, overflowX: cs.overflowX, borderRadius: cs.borderRadius, background: cs.backgroundColor }; }())`);
observed['B-06'].computed = c06;
check('B-06.3', 'pre computed 等宽／字号 ∈[11.5,12]／行高比 1.55／pre-wrap／overflow-x auto／圆角 8px',
  c06 !== null && c06.fontFamily.indexOf('SF Mono') >= 0 && parseFloat(c06.fontSize) >= 11.5 && parseFloat(c06.fontSize) <= 12
  && Math.abs(c06.lineHeightRatio - 1.55) < 0.005 && c06.whiteSpace === 'pre-wrap' && c06.overflowX === 'auto' && c06.borderRadius === '8px',
  c06, '全部满足');
await viewportShot('B-06', 'viewport');

/* ── B-08 交互：点复制不得触发折叠 toggle ───────────────────────────────── */
await openPage(pathToFileURL(artifacts['fold'].file).href, 'details');
const d0 = await evalJson(`(function () { var d = document.querySelector('details');
  var btn = d ? d.querySelector('.ilife-copy-btn') : null; return { open: d ? d.open : null, hasBtn: !!btn,
    btnCls: btn ? String(btn.className) : null }; }())`);
let d1 = null;
if (d0.hasBtn) {
  const box = await evalJson(`(function () { var b = document.querySelector('details .ilife-copy-btn'); b.scrollIntoView({ block: 'center' });
    var r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }())`);
  await sleep(200);
  const box2 = await evalJson(`(function () { var r = document.querySelector('details .ilife-copy-btn').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }())`);
  await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box2.x, y: box2.y, button: 'left', clickCount: 1 });
  await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box2.x, y: box2.y, button: 'left', clickCount: 1 });
  await sleep(80);
  d1 = await evalJson(`(function () { var d = document.querySelector('details'); return { open: d.open, copied: !!d.querySelector('.copied') }; }())`);
}
observed['B-08'].interactive = { before: d0, after: d1 };
check('B-08.2', '点复制按钮后 80ms 内 <details> open 状态不变（不误触折叠）',
  d1 !== null && d0.open === d1.open, { before: d0.open, after: d1 && d1.open }, 'open 不变');
await viewportShot('B-08', 'viewport');

/* ── B-09 computed（placeholder === hint ＋ 空值拒绝复制） ───────────────── */
await openPage(pathToFileURL(artifacts['form'].file).href, '.ilife-block-param-form-input');
const c09 = await evalJson(`(function () { var ins = Array.prototype.slice.call(document.querySelectorAll('.ilife-block-param-form-input'));
  return { n: ins.length, sample: ins.slice(0, 5).map(function (i) { return { name: i.getAttribute('name'), placeholder: i.getAttribute('placeholder'), value: i.value }; }) }; }())`);
observed['B-09'].computed = c09;
check('B-09.2', '每个参数字段 input 带 name 与 placeholder（渲染齐）', c09.n > 0 && c09.sample.every((x) => x.name && x.placeholder !== null), c09, 'name + placeholder');
await viewportShot('B-09', 'viewport');

/* ── B-10 computed（空态样本渲染） ──────────────────────────────────────── */
const emptyPage = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + base.buildStyleSheet().css
  + '</style></head><body><div class="ilife-page">' + emptyMarkup + '</div></body></html>';
writeFileSync(EMPTY_SAMPLE, emptyPage, 'utf8');
await openPage(pathToFileURL(EMPTY_SAMPLE).href, '.ilife-empty');
const c10 = await evalJson(`(function () { var root = document.querySelector('.ilife-empty'); if (!root) return null; var cs = getComputedStyle(root);
  var icon = document.querySelector('.ilife-empty-icon'); var text = document.querySelector('.ilife-empty-text'); var hint = document.querySelector('.ilife-empty-hint');
  return { padding: cs.paddingTop + '/' + cs.paddingLeft, radius: cs.borderRadius, align: cs.textAlign,
    iconSize: icon ? getComputedStyle(icon).fontSize : null, iconOpacity: icon ? getComputedStyle(icon).opacity : null,
    textSize: text ? getComputedStyle(text).fontSize : null, textWeight: text ? getComputedStyle(text).fontWeight : null,
    hintSize: hint ? getComputedStyle(hint).fontSize : null }; }())`);
observed['B-10'].computed = c10;
check('B-10.2', '空态 computed 内距 48px 20px／图标 40px opacity .5／标题 17px 600／说明 13px',
  c10 !== null && c10.padding === '48px/20px' && c10.iconSize === '40px' && c10.iconOpacity === '0.5'
  && c10.textSize === '17px' && String(c10.textWeight) === '600' && c10.hintSize === '13px', c10, '全部满足');
await viewportShot('B-10', 'viewport');

/* ── B-11／B-12 computed（复制区 ＋ 反馈区） ────────────────────────────── */
await openPage(pathToFileURL(artifacts['copy'].file).href, '.ilife-action-bar');
const c11 = await evalJson(`(function () { var bar = document.querySelector('.ilife-action-bar');
  var btns = document.querySelectorAll('[data-action-id]');
  var out = []; for (var i = 0; i < btns.length; i += 1) out.push({ id: btns[i].getAttribute('data-action-id'), hasT: btns[i].hasAttribute('data-t') });
  return { bar: !!bar, btnCount: btns.length, ids: out.slice(0, 8) }; }())`);
observed['B-11'].computed = c11;
check('B-11.3', '渲染后每个复制按钮同时带 data-action-id 与 data-t', c11.btnCount > 0 && c11.ids.every((x) => x.id && x.hasT === true), c11, '全部带两属性');
await viewportShot('B-11', 'viewport');
const box11 = await evalJson(`(function () { var b = document.querySelector('[data-action-id]'); if (!b) return null;
  b.scrollIntoView({ block: 'center' }); var r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }())`);
let c12 = null;
if (box11) {
  await sleep(200);
  const b2 = await evalJson(`(function () { var r = document.querySelector('[data-action-id]').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }())`);
  await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: b2.x, y: b2.y, button: 'left', clickCount: 1 });
  await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b2.x, y: b2.y, button: 'left', clickCount: 1 });
  await sleep(250);
  c12 = await evalJson(`(function () { var t = document.querySelector('.ilife-toast');
    return { toasts: document.querySelectorAll('.ilife-toast').length, role: t ? t.getAttribute('role') : null,
      live: t ? t.getAttribute('aria-live') : null, cls: t ? String(t.className) : null }; }())`);
}
observed['B-12'].computed = c12;
check('B-12.4', '运行时 toast 带 role=status ＋ aria-live=polite（冻结值）',
  c12 !== null && c12.role === 'status' && c12.live === 'polite', c12, 'status/polite');
await viewportShot('B-12', 'viewport');

/* ── 汇总 ───────────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.ok).length;
log('');
log('shots=' + shots.length + ' bytes=' + shots.reduce((a, x) => a + x.bytes, 0));
log('RESULT: ' + pass + '/' + results.length + ' PASS, ' + (results.length - pass) + ' FAIL');
if (pass !== results.length) log('FAILED: ' + results.filter((r) => !r.ok).map((r) => r.id).join(' '));
writeFileSync(join(OUT, 'probe-blocks.json'), JSON.stringify({
  browser: bv.product, samples: Object.fromEntries(Object.entries(artifacts).map(([k, v]) => [k, { key: v.key, bytes: v.bytes, sha256_16: v.sha256_16 }])),
  observed, results, shots,
}, null, 2), 'utf8');
flush();
chrome.kill();
cdp.close();
process.exit(pass === results.length ? 0 : 1);
