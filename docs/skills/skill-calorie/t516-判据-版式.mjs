#!/usr/bin/env node
/** #516 · 场景 10 的 31 页「版式与形状」判据探针（四档真 Chrome ＋ CDP `Emulation.setDeviceMetricsOverride`）。
 *
 * 为什么必须走真浏览器：横向溢出、同排卡等高、字号的**实际渲染值**、grid 列数都是版面事实，
 * 静态 HTML 文本比对查不到（同口径说明见 `packages/skill-calorie/scripts/measure-responsive.mjs` 件头
 * 与 `.scratch/t467/browser.mjs` 的「为什么要 CDP 覆写设备度量」）。**本件只读、只出读数**，不改任何件。
 *
 * 与 `measure-responsive.mjs` 的分工（两者口径不同，别混用）：
 *   `measure-responsive.mjs` —— **横向溢出门**（`docScrollWidth − innerWidth` ＋ 逐图放得下），本票把它
 *     当**回归底线**（改前四档 124 格已全绿，没有识别力）。
 *   本件 —— **版式与形状读数**：越界元素逐个数（不截断）、主内容列对余量的利用、页上实际字号阶梯、
 *     同排 KPI 卡等高与孤行、参数表单在窄宽两档是否同一套排版、公共层形状类命中、触摸区、表格主次、
 *     以及「390 档 vs 1440 档地标元素属性差异项数」（照要求②「手机端参考 HELP」，量法见基准件 §手机端同档）。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-calorie/t516-判据-版式.mjs --dir <目录> [--widths 390,512,820,1440] [--json <路径>]
 *   node docs/skills/skill-calorie/t516-判据-版式.mjs <a.html> [<b.html> …] [--json <路径>]
 * 依赖：本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）＋ Node ≥ 22（内建 `WebSocket`／`fetch`）。
 *      缺浏览器即 **exit 2**，不静默变绿。
 * 退出码：0＝读数完整落盘；1＝有页面读不动；2＝用法错／缺浏览器。**本件不判红绿**——判据与阈值写在
 *       `docs/skills/skill-calorie/t516-场景10-视觉整改基准.md`，读数供其红绿两向对照。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/* ── 参数 ─────────────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const FLAGS = ['--dir', '--json', '--widths', '--timeout'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));
const DIR = argOf('--dir', '');
const JSON_OUT = argOf('--json', '');
const TIMEOUT_MS = Number(argOf('--timeout', '30000'));
const WIDTHS = argOf('--widths', '390,512,820,1440').split(',').filter((s) => s !== '').map(Number);

function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}
let files = positional.map((p) => resolve(p));
if (DIR !== '') {
  const d = resolve(DIR);
  if (!statSync(d).isDirectory()) die(2, '--dir 不是目录 ' + DIR);
  files = readdirSync(d).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(d, f));
}
if (files.length === 0) die(2, '没有输入件：给一组 HTML 路径，或用 --dir <目录>。');

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：本件量的是真浏览器里的版面事实，静态 HTML 查不到。用 DSH_BROWSER=<路径> 指定。');

/* ── 页内读数（一次求值取齐） ────────────────────────────────────────────── */
const SHAPES = ['ilife-block-conclusion', 'ilife-block-toc', 'ilife-block-caliber', 'ilife-block-disclosure',
  'ilife-block-chip', 'ilife-empty', 'ilife-status-badge', 'ilife-block-copy-block', 'ilife-list-rows',
  'ilife-block-kpi-card', 'ilife-block-param-form', 'ilife-block-data-table', 'ilife-charts'];
const LANDMARKS = {
  shell: '.ilife-block-page-shell', title: '.ilife-block-page-shell-title', eyebrow: '.ilife-block-page-shell-eyebrow',
  subtitle: '.ilife-block-page-shell-subtitle', kpiGrid: '.ilife-block-kpi-card-grid', kpiLabel: '.ilife-block-kpi-card-label',
  kpiValue: '.ilife-block-kpi-card-value', kpiDetail: '.ilife-block-kpi-card-detail', toc: '.ilife-block-toc',
  caliber: '.ilife-block-caliber', conclusion: '.ilife-block-conclusion', cap: '.ilife-block-page-shell-caption',
  table: '.ilife-block-data-table-table', th: '.ilife-block-data-table-table th', td: '.ilife-block-data-table-table td',
  caption: '.ilife-block-data-table-caption', paramForm: '.ilife-block-param-form', paramLabel: '.ilife-block-param-form-label',
  paramDesc: '.ilife-block-param-form-description', copyBtn: '.ilife-copy-btn', ghost: '.ilife-action-row-ghost',
  nav: 'nav.ilife-block-toc', blockTitle: '.ilife-block-title',
};

function expr() {
  return `(function () {
  var LAND = ${JSON.stringify(LANDMARKS)};
  var SHAPES = ${JSON.stringify(SHAPES)};
  function rect(el) { if (!el) return null; var b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; }
  function cs(el, props) { if (!el) return null; var s = getComputedStyle(el); var o = {};
    props.forEach(function (p) { o[p] = s.getPropertyValue(p); }); return o; }
  var de = document.documentElement;
  var out = { vw: de.clientWidth, docScrollW: de.scrollWidth, bodyScrollW: document.body.scrollWidth };

  // ① 逐元素越界（不截断）
  var wide = [];
  document.querySelectorAll('*').forEach(function (el) {
    var b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return;
    if (b.right > de.clientWidth + 1 || b.left < -1) {
      wide.push(el.tagName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0] + '@' + Math.round(b.x) + '+' + Math.round(b.width));
    }
  });
  out.outOfBounds = wide.length; out.outOfBoundsList = wide.slice(0, 12);

  // ② 主内容列对余量的利用
  var shell = document.querySelector('.ilife-block-page-shell');
  out.shell = rect(shell);
  out.shellMaxWidth = shell ? getComputedStyle(shell).maxWidth : null;
  out.shellPadding = shell ? getComputedStyle(shell).paddingLeft + '/' + getComputedStyle(shell).paddingRight : null;

  // ③ 页上**实际渲染**的可见字号分布（不读样式段声明值：那是全族共用的一份，量不出页面差异）
  var hist = {}; var measured = [];
  document.querySelectorAll('body *').forEach(function (el) {
    var own = '';
    for (var i = 0; i < el.childNodes.length; i += 1) { var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim() !== '') own += n.textContent; }
    if (own.trim() === '') return;
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return;
    if (el.getBoundingClientRect().height === 0) return;
    var isSvg = !!(el.ownerSVGElement || el.tagName.toLowerCase() === 'svg');
    var px = Math.round(parseFloat(s.fontSize) * 100) / 100;
    hist[px] = (hist[px] || 0) + 1;
    measured.push({ px: px, svg: isSvg, cls: String(el.getAttribute('class') || '').split(' ')[0], tag: el.tagName.toLowerCase() });
  });
  out.fontHist = hist;
  out.fontSizes = Object.keys(hist).map(Number).sort(function (a, b) { return a - b; });
  out.minFontPx = out.fontSizes.length ? Math.min.apply(null, out.fontSizes) : null;
  var htmlOnly = measured.filter(function (m) { return !m.svg; });
  out.minFontPxNoSvg = htmlOnly.length ? Math.min.apply(null, htmlOnly.map(function (m) { return m.px; })) : null;
  out.minFontOwner = htmlOnly.filter(function (m) { return m.px === out.minFontPxNoSvg; }).slice(0, 3)
    .map(function (m) { return m.tag + '.' + m.cls; });

  // ④ KPI 卡：同排（同一 top）张数、卡宽、同排等高极差
  var cards = [];
  document.querySelectorAll('.ilife-block-kpi-card').forEach(function (c) {
    var b = c.getBoundingClientRect();
    cards.push({ top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) });
  });
  var byTop = {};
  cards.forEach(function (c) { (byTop[c.top] = byTop[c.top] || []).push(c); });
  out.kpiCards = cards.length;
  out.kpiRows = Object.keys(byTop).sort(function (a, b) { return a - b; }).map(function (k) {
    var hs = byTop[k].map(function (c) { return c.h; });
    return { top: Number(k), n: byTop[k].length, widths: byTop[k].map(function (c) { return c.w; }),
      hMin: Math.min.apply(null, hs), hMax: Math.max.apply(null, hs), hSpread: Math.max.apply(null, hs) - Math.min.apply(null, hs) };
  });
  out.kpiPerRow = out.kpiRows.map(function (r) { return r.n; });
  out.kpiMaxSpread = out.kpiRows.length ? Math.max.apply(null, out.kpiRows.map(function (r) { return r.hSpread; })) : 0;

  // ⑤ 参数表单：窄宽两档是不是同一套排版（列数 ＋ 每个字段是不是「标签与输入同行」）
  var pf = document.querySelector('.ilife-block-param-form');
  out.paramFormCols = pf ? getComputedStyle(pf).gridTemplateColumns : null;
  out.paramRows = [];
  if (pf) { pf.querySelectorAll(':scope > *').forEach(function (r) {
    var b = r.getBoundingClientRect();
    out.paramRows.push({ tag: r.tagName.toLowerCase(), cls: String(r.getAttribute('class') || '').split(' ')[0], w: Math.round(b.width), y: Math.round(b.y) });
  }); }

  // ⑥ 公共层形状类命中（渲染后 DOM 计数）
  var shapes = {};
  SHAPES.forEach(function (c) { shapes[c] = document.querySelectorAll('.' + c).length; });
  out.shapes = shapes;

  // ⑦ 触摸区（可点元素的短边 < 44px 的个数）与安全区
  var small = [];
  document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]').forEach(function (el) {
    var b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return;
    if (b.height < 44 || b.width < 44) small.push(el.tagName.toLowerCase() + '.' + String(el.getAttribute('class') || '').split(' ')[0]
      + '@' + Math.round(b.width) + 'x' + Math.round(b.height));
  });
  out.touchSmall = small.length; out.touchSmallList = small.slice(0, 8);

  // ⑧ 数据表主次（列头弱、数据强）
  var th = document.querySelector('.ilife-block-data-table-table th');
  var td = document.querySelector('.ilife-block-data-table-table td');
  var P = ['font-size', 'font-weight', 'color', 'font-family', 'font-variant-numeric'];
  out.tableTh = cs(th, P); out.tableTd = cs(td, P);
  out.tableThText = th ? th.textContent.trim().slice(0, 20) : null;

  // ⑨ 地标元素的「两档差异」取样：字号／内距／行高／grid 列／最小高度
  var M = ['font-size', 'line-height', 'padding-top', 'padding-left', 'padding-bottom', 'grid-template-columns', 'min-height', 'max-width'];
  out.landmarks = {};
  Object.keys(LAND).forEach(function (k) {
    var el = document.querySelector(LAND[k]);
    if (!el) { out.landmarks[k] = null; return; }
    var s = getComputedStyle(el); var o = {};
    M.forEach(function (p) { o[p] = s.getPropertyValue(p); });
    o.__w = Math.round(el.getBoundingClientRect().width);
    o.__h = Math.round(el.getBoundingClientRect().height);
    out.landmarks[k] = o;
  });
  out.svgCount = document.querySelectorAll('svg').length;
  return JSON.stringify(out);
})()`;
}

/* ── headless Chrome ＋ CDP ───────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9711 + (process.pid % 200);
const profile = mkdtempSync(join(tmpdir(), 't516-profile-'));
const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'],
  { stdio: 'ignore' });

/** 连**页面目标**（`/json/list` 里的 `type=page`），不是浏览器目标——`Page.*` 域只在页面会话上有。 */
async function devtoolsUrl() {
  for (let waited = 0; waited < TIMEOUT_MS; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      if (r.ok) {
        const list = await r.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch { /* 端口未就绪 */ }
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
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')));
  });
  return {
    ready,
    send(method, params) {
      const id = nextId++;
      return new Promise((res, reject) => { pending.set(id, { resolve: res, reject }); ws.send(JSON.stringify({ id, method, params })); });
    },
    close() { ws.close(); },
  };
}

const wsUrl = await devtoolsUrl();
if (wsUrl === null) { chrome.kill(); die(2, '等不到 headless 浏览器的调试端口（' + TIMEOUT_MS + 'ms 超时）。'); }
const cdp = connect(wsUrl);
await cdp.ready;
await cdp.send('Page.enable');

const rows = [];
let unreadable = 0;
for (const f of files) {
  const row = { path: f, name: f.replace(/\\/g, '/').split('/').pop(), widths: {} };
  for (const w of WIDTHS) {
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 2000, deviceScaleFactor: 1, mobile: false });
      // 不等事件、只轮询 `document.readyState`：本件要的是「版面量得出来」，不是加载时序。
      await cdp.send('Page.navigate', { url: pathToFileURL(f).href });
      let state = '';
      for (let i = 0; i < 60; i += 1) {
        const r = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
        state = r.result.value;
        if (state === 'complete') break;
        await sleep(120);
      }
      await sleep(350);
      const res = await cdp.send('Runtime.evaluate', { expression: expr(), returnByValue: true });
      row.widths[w] = JSON.parse(res.result.value);
    } catch (e) {
      row.widths[w] = { error: String(e.message) };
      unreadable += 1;
    }
  }
  rows.push(row);
  const a = row.widths[WIDTHS[0]] || {};
  const b = row.widths[WIDTHS[WIDTHS.length - 1]] || {};
  console.log('FILE ' + row.name + '  窄档字号=' + (a.minFontPxNoSvg ?? '-') + '（' + (a.fontSizes || []).length + '档）'
    + '  kpi每排=' + (a.kpiPerRow || []).join('+') + '  kpi极差=' + (a.kpiMaxSpread ?? '-')
    + '  1440列宽=' + ((b.shell && b.shell.w) ?? '-') + '/' + (b.vw ?? '-') + '  toc=' + (b.shapes && b.shapes['ilife-block-toc'])
    + ' caliber=' + (b.shapes && b.shapes['ilife-block-caliber']) + ' conclusion=' + (b.shapes && b.shapes['ilife-block-conclusion'])
    + ' 越界=' + (b.outOfBounds ?? '-'));
}
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* 清不掉临时 profile 不掩盖结论 */ }

const payload = { at: new Date().toISOString(), dir: DIR, widths: WIDTHS, files: rows.length, unreadable, rows };
if (JSON_OUT !== '') writeFileSync(resolve(JSON_OUT), JSON.stringify(payload, null, 1), 'utf8');
console.log('RESULT: ' + (rows.length - unreadable) + '/' + rows.length + ' 件读数完成（四档=' + WIDTHS.join('/') + '）'
  + (JSON_OUT !== '' ? ' → ' + JSON_OUT : ''));
process.exit(unreadable === 0 ? 0 : 1);
