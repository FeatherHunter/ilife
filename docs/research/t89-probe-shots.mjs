/** #89（89b 视觉锁验收）· **逐条截图 ＋ 浏览器 computed 采集探针**（H-01…H-20 每条一张以上证据图）。
 *
 *  跑法（仓根，必须持锁——本脚本读共享 dist 并渲染真实产物）：
 *    node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-shots.mjs --out <目录>
 *  退出码：0＝逐条采集项全绿；1＝有项红（**只说明当前态抽样不达标，不是验收结论**）；
 *          **2＝缺产物／缺 dist／缺浏览器／CDP 起不来（链路不可用，绝不静默变绿）**。
 *
 *  与 `t89-probe-help-static.mjs`（CSS 文本面）／`t89-probe-help-interactive.mjs`（交互时序面）的关系：
 *    本脚本补的是**截图证据 ＋ 渲染后 computed 值**——静态探针判不了「渲染后长什么样」，
 *    交互探针只覆盖 H-12／16／19／20。两者已证的面这里**只做交叉引用**，不重复造断言。
 *
 *  判据收窄（#88 台账 L-17／D-10）：H-04 渐变、H-10 圆角、H-01 禁色**都按 CSS 区判**——
 *    charts 区的 `repeating-linear-gradient` 与 2px 圆角属冻结图表资产，全量 grep 会假红。
 *
 *  产物：`<out>/H-<NN>/<step>.png` ＋ `<out>/probe-shots.json` ＋ `<out>/probe-shots.log`。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(ROOT, outArg > 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '.scratch/t89/evidence/shots');
const ARTIFACT = resolve(ROOT, '.scratch/t89/help-file.html');
const EMPTY_SAMPLE = resolve(ROOT, '.scratch/t89/empty-state.html');

const transcript = [];
const log = (line = '') => { transcript.push(line); console.log(line); };
const flush = () => { try { writeFileSync(join(OUT, 'probe-shots.log'), transcript.join(LF) + LF, 'utf8'); } catch { /* 落盘失败不掩盖结论 */ } };
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

/* ── 前置守卫（无浏览器必须显式失败，不得静默变绿） ─────────────────────── */
const DIST_INDEX = join(ROOT, 'packages/base-render/dist/index.js');
if (!existsSync(DIST_INDEX)) die(2, '缺 dist：' + DIST_INDEX + '（先 pnpm build）');
if (!existsSync(ARTIFACT)) die(2, '缺 HELP 产物：' + ARTIFACT + '（先按 evidence-plan CMD-A 生成）');
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
  die(2, '未找到 Chrome／Edge（或 T89_NO_BROWSER=1）：逐条截图与 computed 采集**必须真实渲染**，'
    + '无浏览器即无证据 → 显式失败（不静默跳过）。用 DSH_BROWSER=<路径> 指定。');
}
const artifactBuf = readFileSync(ARTIFACT);
const sha16 = createHash('sha256').update(artifactBuf).digest('hex').slice(0, 16).toUpperCase();
log('# #89 逐条截图 ＋ computed 采集探针（H-01…H-20）');
log('artifact=' + ARTIFACT.slice(ROOT.length + 1).replace(/\\/g, '/') + ' bytes=' + artifactBuf.length + ' sha256_16=' + sha16);

/* ── H-18 空态样本：由冻结控件 renderEmptyState ＋ buildStyleSheet 现场构造 ───────── */
const base = await import(pathToFileURL(DIST_INDEX).href);
const sheet = base.buildStyleSheet();
const emptyHtml = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
  + '<style>' + sheet.css + '</style></head><body>'
  + '<section class="ilife-help-shell"><div class="ilife-help-shell-grid">'
  + base.renderEmptyState({ text: '暂无数据', icon: '📭', hint: '换个筛选条件试试' })
  + '</div></section></body></html>';
writeFileSync(EMPTY_SAMPLE, emptyHtml, 'utf8');

/* ── headless ＋ CDP（启动参数集沿用 t121／CMD-B） ─────────────────────────── */
const PORT = 9911 + (process.pid % 200);
const profile = join(OUT, '_profile-shots');
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
await s('DOM.enable');
const bv = await cdp.send('Browser.getVersion');
log('browser=' + BROWSER + ' version=' + bv.product);

/* ── 截图工具 ───────────────────────────────────────────────────────────── */
async function viewportShot(item, step) {
  const dir = join(OUT, item); mkdirSync(dir, { recursive: true });
  const file = join(dir, step + '.png');
  const r = await s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push({ item, step, file: file.slice(OUT.length + 1).replace(/\\/g, '/'), bytes: readFileSync(file).length });
  return file;
}
async function clipShot(item, step, sel, pad = 12) {
  const dir = join(OUT, item); mkdirSync(dir, { recursive: true });
  const file = join(dir, step + '.png');
  const rect = await evalJson(`(function () { var el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
    el.scrollIntoView({ block: 'center' }); var b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, vw: window.innerWidth, vh: window.innerHeight }; }())`);
  if (rect === null) { log('# WARN ' + item + ' 选择器未命中：' + sel); return null; }
  await sleep(150);
  const r2 = await evalJson(`(function () { var el = document.querySelector(${JSON.stringify(sel)}); var b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, vw: window.innerWidth, vh: window.innerHeight }; }())`);
  const clip = {
    x: Math.max(0, Math.floor(r2.x - pad)), y: Math.max(0, Math.floor(r2.y - pad)),
    width: Math.max(1, Math.min(Math.ceil(r2.w + pad * 2), r2.vw - Math.max(0, Math.floor(r2.x - pad)))),
    height: Math.max(1, Math.min(Math.ceil(r2.h + pad * 2), r2.vh - Math.max(0, Math.floor(r2.y - pad)))),
    scale: 1,
  };
  const r = await s('Page.captureScreenshot', { format: 'png', clip });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  shots.push({ item, step, file: file.slice(OUT.length + 1).replace(/\\/g, '/'), bytes: readFileSync(file).length, clip, sel });
  return file;
}
async function openPage(url, waitSel) {
  await s('Page.navigate', { url });
  for (let i = 0; i < 300; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
  await sleep(700);
  if (waitSel) { for (let i = 0; i < 60; i += 1) { if (await evaluate('!!document.querySelector(' + JSON.stringify(waitSel) + ')') === true) break; await sleep(100); } }
}

/* ══ HELP 页：H-01…H-17、H-19、H-20 ══════════════════════════════════════ */
await openPage(pathToFileURL(ARTIFACT).href, '.ilife-help-shell-card');
const domCounts = await evalJson(`({ kpi: document.querySelectorAll('.ilife-kpi').length,
  svg: document.querySelectorAll('svg').length, table: document.querySelectorAll('table').length,
  pre: document.querySelectorAll('pre').length, details: document.querySelectorAll('details').length,
  inputs: document.querySelectorAll('input').length, buttons: document.querySelectorAll('button').length,
  cards: document.querySelectorAll('.ilife-help-shell-card').length, empty: document.querySelectorAll('.ilife-empty').length })`);
log('domCounts=' + JSON.stringify(domCounts));
observed.dom = domCounts;
await viewportShot('H-01', 'viewport');
await viewportShot('H-03', 'viewport');

/* ── H-01 单主色 ─────────────────────────────────────────────────────────── */
const h01 = await evalJson(`(function () {
  var root = document.documentElement, shell = document.querySelector('.ilife-help-shell');
  var rs = getComputedStyle(root), ss = getComputedStyle(shell);
  return { blueRoot: rs.getPropertyValue('--blue').trim(), blueShell: ss.getPropertyValue('--blue').trim(),
    heroBg: getComputedStyle(document.querySelector('.ilife-help-shell-hero')).backgroundColor,
    titleColor: getComputedStyle(document.querySelector('.ilife-help-shell-title')).color }; }())`);
observed['H-01'] = h01;
check('H-01.1', '渲染页 computed --blue 逐字 #007aff（根 ＋ 壳）',
  h01.blueRoot === '#007aff' && h01.blueShell === '#007aff', h01, '#007aff');
const h01shot = await clipShot('H-01', 'element', '.ilife-help-shell-hero');
check('H-01.2', '页头主色块元素级截图已取证', h01shot !== null, h01shot ? h01shot.slice(OUT.length + 1) : null, '非 null');

/* ── H-02 灰阶三步（冻结 token 口径） ───────────────────────────────────── */
const h02 = await evalJson(`(function () {
  var rs = getComputedStyle(document.documentElement);
  var fg = rs.getPropertyValue('--fg').trim(), fg2 = rs.getPropertyValue('--fg2').trim(), fg3 = rs.getPropertyValue('--fg3').trim();
  var pick = function (sel) { var el = document.querySelector(sel); return el ? getComputedStyle(el).color : null; };
  /* 逐元素清点：所有 computed color === --fg3 的元素（判「谁在承载最浅灰」） */
  var all = document.querySelectorAll('.ilife-help-shell *');
  var fg3Hits = [];
  var seen = {};
  for (var i = 0; i < all.length; i += 1) {
    var el = all[i]; var cs = getComputedStyle(el);
    if (cs.color !== 'rgb(134, 134, 139)') continue;
    var key = String(el.className).slice(0, 56) + '|' + cs.fontSize;
    if (seen[key]) continue; seen[key] = 1;
    fg3Hits.push({ cls: String(el.className).slice(0, 56), tag: el.tagName, size: cs.fontSize,
      text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28) });
  }
  /* token 是 hex，computed color 是 rgb() 串——必须归一后比较（否则恒假红） */
  var toRgb = function (hex) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return null;
    var n = parseInt(m[1], 16); return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; };
  return { fg: fg, fg2: fg2, fg3: fg3, fgRgb: toRgb(fg), fg2Rgb: toRgb(fg2), fg3Rgb: toRgb(fg3),
    title: pick('.ilife-help-shell-title'), lead: pick('.ilife-help-shell-lead'),
    cardTitle: pick('.ilife-help-shell-card-title'), subtitle: pick('.ilife-help-shell-subtitle'),
    prompt: pick('.ilife-help-shell-prompt'), fieldLabel: pick('.ilife-help-shell-field-label'), fg3Hits: fg3Hits,
    fieldCounts: { fields: document.querySelectorAll('.ilife-help-shell-field').length,
      label: document.querySelectorAll('.ilife-help-shell-field-label').length,
      value: document.querySelectorAll('.ilife-help-shell-field-value').length,
      hint: document.querySelectorAll('.ilife-help-shell-field-hint').length } }; }())`);
observed['H-02'] = h02;
const h02shot = await clipShot('H-02', 'element', '.ilife-help-shell-card');
check('H-02.1', '正文面（h1／卡标题／副标题／命令）computed color ∈ {--fg, --fg2}（hex→rgb 归一后比较）',
  [h02.title, h02.cardTitle, h02.subtitle, h02.prompt].every((c) => c === h02.fgRgb || c === h02.fg2Rgb),
  { title: h02.title, cardTitle: h02.cardTitle, subtitle: h02.subtitle, prompt: h02.prompt, fieldLabel: h02.fieldLabel, fgRgb: h02.fgRgb, fg2Rgb: h02.fg2Rgb }, '∈{--fg,--fg2}');
check('H-02.2', '最浅一档灰 --fg3 只落在提示层（≤13px），不承载正文',
  h02.fg3Hits.every((x) => parseFloat(x.size) <= 13),
  { fg3: h02.fg3, hits: h02.fg3Hits }, '全部 ≤13px');
await clipShot('H-02', 'lead', '.ilife-help-shell-lead');
check('H-02.3', '卡面元素级截图已取证', h02shot !== null, h02shot ? h02shot.slice(OUT.length + 1) : null, '非 null');

/* ── H-03 页底与卡面可区分 ───────────────────────────────────────────────── */
const h03 = await evalJson(`(function () {
  var body = getComputedStyle(document.body).backgroundColor;
  var shell = getComputedStyle(document.querySelector('.ilife-help-shell')).backgroundColor;
  var card = getComputedStyle(document.querySelector('.ilife-help-shell-card')).backgroundColor;
  var rs = getComputedStyle(document.documentElement);
  return { body: body, shell: shell, card: card, bg: rs.getPropertyValue('--bg').trim(), cardToken: rs.getPropertyValue('--card').trim() }; }())`);
observed['H-03'] = h03;
check('H-03.1', '页底 ≠ 卡面且卡面为纯白（computed）',
  h03.card === 'rgb(255, 255, 255)' && h03.shell !== h03.card && h03.bg !== h03.cardToken, h03, 'card=rgb(255,255,255) 且 shell≠card');
await clipShot('H-03', 'card', '.ilife-help-shell-card');

/* ── H-04 零渐变（按 CSS 区判） ─────────────────────────────────────────── */
const h04 = await evalJson(`(function () {
  var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\\n');
  var cs = css.indexOf('/* charts */'), ce = css.indexOf('/* help-shell */');
  var help = (cs >= 0 && ce > cs) ? css.slice(0, cs) + css.slice(ce) : css;
  function n(x) { return (x.match(/linear-gradient|radial-gradient/g) || []).length; }
  return { gradAll: n(css), gradHelp: n(help), gradCharts: n(css.slice(cs, ce)) }; }())`);
observed['H-04'] = h04;
check('H-04.1', 'HELP 页自身 CSS 区零渐变（charts 区按 D-10 例外，须同时打印两值）',
  h04.gradHelp === 0, h04, '{gradHelp:0}');
await clipShot('H-04', 'element', '.ilife-help-shell-card');

/* ── H-05 字号阶梯 ───────────────────────────────────────────────────────── */
const h05 = await evalJson(`(function () {
  var pick = function (sel) { var el = document.querySelector(sel); if (!el) return null;
    var cs = getComputedStyle(el); return { size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10), text: (el.textContent || '').trim().slice(0, 18) }; };
  var h2s = Array.prototype.slice.call(document.querySelectorAll('h2')).map(function (h) {
    var cs = getComputedStyle(h); return { size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10), text: (h.textContent || '').trim().slice(0, 18) }; });
  return { h1: pick('.ilife-help-shell-title'), h3: pick('.ilife-help-shell-card-title'), lead: pick('.ilife-help-shell-lead'),
    subtitle: pick('.ilife-help-shell-subtitle'), hint: pick('.ilife-help-shell-chip'), badge: pick('.ilife-help-shell-badge'),
    count: pick('.ilife-help-shell-count'), h2s: h2s }; }())`);
observed['H-05'] = h05;
const allSizes = [...new Set([h05.h1, h05.h3, h05.lead, h05.hint, h05.subtitle, h05.count].filter(Boolean).map((x) => x.size))].sort((a, b) => a - b);
const maxSize = Math.max(...allSizes);
check('H-05.1', 'HELP 页无 ≥48px 大数字（D-9 不要求）', maxSize < 48, { maxSize, sizes: allSizes }, '<48');
check('H-05.2', '四档逐值：h2 17px／600 ＋ 正文 15px ＋ 提示 12–13px',
  h05.h2s.length > 0 && h05.h2s.every((x) => x.size === 17 && x.weight === 600)
  && h05.subtitle !== null && h05.subtitle.size === 15
  && [h05.count, h05.lead].filter(Boolean).every((x) => x.size >= 12 && x.size <= 13),
  { h2: h05.h2s, subtitle: h05.subtitle, count: h05.count, lead: h05.lead }, '17/600 + 15 + 12–13');
check('H-05.3', 'h1 32px／700（D-9 推荐 a：28–32px 区间）', h05.h1.size >= 28 && h05.h1.size <= 32 && h05.h1.weight === 700, h05.h1, '28–32px/700');
await clipShot('H-05', 'element', '.ilife-help-shell-hero');

/* ── H-06 字体栈（**如实判**：新侧无正文栈） ─────────────────────────────── */
const h06 = await evalJson(`(function () {
  var pick = function (sel) { var el = document.querySelector(sel); return el ? getComputedStyle(el).fontFamily : null; };
  var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\\n');
  return { body: pick('body'), shell: pick('.ilife-help-shell'), lead: pick('.ilife-help-shell-lead'),
    pre: pick('pre'), cli: pick('.ilife-help-shell-cli'), cssSfPro: (css.match(/SF Pro Display/g) || []).length,
    cssConsolas: (css.match(/Consolas/g) || []).length, cssSfMono: (css.match(/SF Mono/g) || []).length }; }())`);
observed['H-06'] = h06;
check('H-06.1', '等宽面 computed 以 "SF Mono" 开头且无 Consolas（D-13）',
  typeof h06.pre === 'string' && h06.pre.indexOf('"SF Mono"') === 0 && h06.cssConsolas === 0, { pre: h06.pre, cssConsolas: h06.cssConsolas }, '"SF Mono" 开头 / Consolas 0');
check('H-06.2', '正文面 computed 含 "SF Pro Display"（H-06 规格值）',
  [h06.body, h06.shell, h06.lead].some((f) => typeof f === 'string' && f.indexOf('SF Pro Display') >= 0),
  { body: h06.body, shell: h06.shell, lead: h06.lead, cssSfPro: h06.cssSfPro }, '含 SF Pro Display');
await clipShot('H-06', 'element', '.ilife-help-shell-lead');

/* ── H-07 tnum ───────────────────────────────────────────────────────────── */
const h07 = await evalJson(`(function () {
  var pick = function (sel) { var el = document.querySelector(sel); return el ? getComputedStyle(el).fontFeatureSettings : null; };
  return { shell: pick('.ilife-help-shell'), count: pick('.ilife-help-shell-count'), badge: pick('.ilife-help-shell-badge'),
    cardTitle: pick('.ilife-help-shell-card-title') }; }())`);
observed['H-07'] = h07;
check('H-07.1', '数值面 computed font-feature-settings 含 tnum（继承生效）',
  String(h07.shell).indexOf('tnum') >= 0 && String(h07.count || h07.badge).indexOf('tnum') >= 0, h07, '含 tnum');
await clipShot('H-07', 'element', '.ilife-help-shell-card-top');

/* ── H-08 标题禁 emoji ───────────────────────────────────────────────────── */
const h08 = await evalJson(`(function () {
  var re = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/gu;
  var hs = Array.prototype.slice.call(document.querySelectorAll('h1,h2'));
  var bad = hs.filter(function (h) { return re.test(h.textContent || ''); }).map(function (h) { return (h.textContent || '').trim().slice(0, 24); });
  return { total: hs.length, bad: bad, h1: (document.querySelector('h1') || {}).textContent }; }())`);
observed['H-08'] = h08;
check('H-08.1', 'h1／h2 textContent emoji 命中 = 0', h08.bad.length === 0, h08, '[]');
await clipShot('H-08', 'element', '.ilife-help-shell-title');

/* ── H-09 容器宽度与页边距 ───────────────────────────────────────────────── */
const h09 = await evalJson(`(function () {
  var el = document.querySelector('.ilife-help-shell'); var cs = getComputedStyle(el); var r = el.getBoundingClientRect();
  return { paddingTop: cs.paddingTop, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, paddingBottom: cs.paddingBottom,
    maxWidth: cs.maxWidth, marginLeft: cs.marginLeft, marginRight: cs.marginRight,
    leftGap: Math.round(r.left), rightGap: Math.round(window.innerWidth - r.right), innerWidth: window.innerWidth }; }())`);
observed['H-09'] = h09;
check('H-09.1', '容器 computed padding 逐值 32px 20px 80px ＋ max-width 960px',
  h09.paddingTop === '32px' && h09.paddingLeft === '20px' && h09.paddingRight === '20px' && h09.paddingBottom === '80px' && h09.maxWidth === '960px',
  h09, '32/20/20/80 + 960px');
check('H-09.2', '1440px 视口下内容列居中、两侧留白可见',
  h09.leftGap > 0 && h09.rightGap > 0 && Math.abs(h09.leftGap - h09.rightGap) <= 2, { leftGap: h09.leftGap, rightGap: h09.rightGap }, '两侧 >0 且差 ≤2');
await clipShot('H-09', 'element', '.ilife-help-shell-hero');

/* ── H-10 形状 token 规定集（**排除 charts 区**） ────────────────────────── */
const h10 = await evalJson(`(function () {
  var allowed = ['8px', '14px', '20px', '999px', '50%'];
  var all = document.querySelectorAll('.ilife-help-shell *');
  var bad = [];
  var seen = {};
  for (var i = 0; i < all.length; i += 1) {
    var el = all[i]; var cs = getComputedStyle(el);
    var rad = cs.borderRadius;
    if (!rad || rad === '0px') continue;
    var parts = rad.split(/\\s+/);
    for (var j = 0; j < parts.length; j += 1) {
      if (allowed.indexOf(parts[j]) < 0) {
        var key = parts[j] + '|' + String(el.className).slice(0, 48);
        if (!seen[key]) { seen[key] = 1; bad.push({ radius: parts[j], cls: String(el.className).slice(0, 48), tag: el.tagName }); }
      }
    }
  }
  var shadows = {};
  for (var k = 0; k < all.length; k += 1) { var sh = getComputedStyle(all[k]).boxShadow; if (sh && sh !== 'none') shadows[sh] = (shadows[sh] || 0) + 1; }
  /* CSS 文本面（HELP 区，排除 charts 区）：逐条列出超出规定集的声明及其选择器 */
  var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\\n');
  var cs0 = css.indexOf('/* charts */'), ce0 = css.indexOf('/* help-shell */');
  var helpCss = (cs0 >= 0 && ce0 > cs0) ? css.slice(0, cs0) + css.slice(ce0) : css;
  var cssBad = [];
  var reRule = /([^{}]+)\\{([^}]*)\\}/g; var m;
  while ((m = reRule.exec(helpCss)) !== null) {
    var body = m[2]; var rr = /border-radius:\\s*([^;}]+)/.exec(body);
    if (!rr) continue;
    var val = rr[1].trim();
    var parts2 = val.split(/\\s+/);
    for (var p = 0; p < parts2.length; p += 1) {
      if (allowed.indexOf(parts2[p]) < 0) cssBad.push({ sel: m[1].trim().replace(/\\s+/g, ' ').slice(0, 60), radius: parts2[p] });
    }
  }
  return { bad: bad.slice(0, 12), badCount: bad.length, shadowSet: Object.keys(shadows), cssBad: cssBad,
    cardMarkInDom: document.querySelectorAll('.ilife-help-shell-card-mark').length }; }())`);
observed['H-10'] = h10;
check('H-10.1', 'HELP 页自身 CSS 区 border-radius 声明 ⊆ {8,14,20,999px,50%}（charts 区按 D-10 例外）',
  h10.cssBad.length === 0, { cssBad: h10.cssBad, badCount: h10.badCount, bad: h10.bad }, '[]');
check('H-10.2', 'HELP 壳内所有元素 computed border-radius ∈ 规定集', h10.badCount === 0, { badCount: h10.badCount, bad: h10.bad }, '[]');
await clipShot('H-10', 'element', '.ilife-help-shell-card');

/* ── H-11 列表分隔线 ─────────────────────────────────────────────────────── */
const h11 = await evalJson(`(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('.ilife-help-shell-about-row'));
  var out = rows.map(function (r, i) { var cs = getComputedStyle(r);
    return { i: i, top: cs.borderTopWidth, color: cs.borderTopColor, style: cs.borderTopStyle }; });
  var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\\n');
  return { rows: out, firstChildRule: (css.match(/:first-child[^{]*\\{[^}]*border-top:\\s*0/g) || []).length }; }())`);
observed['H-11'] = h11;
const rowsOk = h11.rows.length > 0 && h11.rows[0].top === '0px' && h11.rows.slice(1).every((r) => r.top === '1px');
check('H-11.1', '列表首行 computed border-top 0、后续行 1px 软描边',
  rowsOk && h11.firstChildRule > 0, h11, '首行 0px／后续 1px ＋ :first-child 规则 >0');
await clipShot('H-11', 'element', '.ilife-help-shell-about-list');

/* ── H-12 断点（交互面由 CMD-I 主证，这里补 computed top 内距） ──────────── */
const h12 = [];
for (const w of [1440, 640, 400]) {
  await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const snap = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell'); var cs = getComputedStyle(el);
    var grid = document.querySelector('.ilife-help-shell-grid');
    return { innerWidth: window.innerWidth, pt: cs.paddingTop, pl: cs.paddingLeft, pr: cs.paddingRight, pb: cs.paddingBottom,
      maxWidth: cs.maxWidth, gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null }; }())`);
  h12.push({ w, ...snap });
  await viewportShot('H-12', 'viewport-' + w);
}
await s('Emulation.clearDeviceMetricsOverride');
observed['H-12'] = h12;
const n640 = h12.find((x) => x.w === 640); const n400 = h12.find((x) => x.w === 400); const n1440 = h12.find((x) => x.w === 1440);
check('H-12.1', '≤640px computed 内距四值 = 20px 16px 60px（含 top）',
  n640 && n640.pt === '20px' && n640.pl === '16px' && n640.pr === '16px' && n640.pb === '60px', n640, '20/16/16/60');
check('H-12.2', '≤400px computed 内距四值 = 20px 16px 60px（400 层不另改容器）',
  n400 && n400.pt === '20px' && n400.pl === '16px' && n400.pr === '16px' && n400.pb === '60px', n400, '20/16/16/60');
check('H-12.3', '宽屏 computed 内距四值 = 32px 20px 80px',
  n1440 && n1440.pt === '32px' && n1440.pl === '20px' && n1440.pr === '20px' && n1440.pb === '80px', n1440, '32/20/20/80');

/* ── H-13／H-14 HELP 页 N/A ─────────────────────────────────────────────── */
log('[N/A ] H-13 HELP 页 KPI 卡 → 转内容页区块尺 B-02（实测 .ilife-kpi 命中 ' + domCounts.kpi + '）');
log('[N/A ] H-14 HELP 页进度环 → 转内容页区块尺 B-04（实测 <svg> 命中 ' + domCounts.svg + '）');
await viewportShot('H-13', 'na');
await viewportShot('H-14', 'na');

/* ── H-15 逐字命令板 ─────────────────────────────────────────────────────── */
const h15 = await evalJson(`(function () {
  var pre = document.querySelector('pre'); if (!pre) return null; var cs = getComputedStyle(pre);
  return { tag: pre.tagName, fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight,
    whiteSpace: cs.whiteSpace, overflowX: cs.overflowX, borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor }; }())`);
observed['H-15'] = h15;
check('H-15.1', '命令块载体 tagName = PRE', h15 !== null && h15.tag === 'PRE', h15 && h15.tag, 'PRE');
check('H-15.2', 'computed 等宽栈／字号 ∈[11.5,12]px／line-height 比值 1.55／pre-wrap／overflow-x auto／圆角 8px',
  h15 !== null && h15.fontFamily.indexOf('SF Mono') >= 0 && parseFloat(h15.fontSize) >= 11.5 && parseFloat(h15.fontSize) <= 12
  && Math.abs(parseFloat(h15.lineHeight) / parseFloat(h15.fontSize) - 1.55) < 0.005
  && h15.whiteSpace === 'pre-wrap' && h15.overflowX === 'auto' && h15.borderRadius === '8px',
  h15 === null ? null : { ...h15, lineHeightRatio: Math.round((parseFloat(h15.lineHeight) / parseFloat(h15.fontSize)) * 1000) / 1000 },
  '全部满足（line-height 用比值判：computed 恒为 px）');
await clipShot('H-15', 'element', '.ilife-help-shell-prompt');

/* ── H-16 双反馈（交互时序由 CMD-I／t121 主证，这里补 before/after 截图） ── */
await evaluate(`(function () { var el = document.querySelector('.ilife-help-shell-card-copy') || document.querySelector('.ilife-help-shell-btn-prompt');
  el.scrollIntoView({ block: 'center' }); return true; }())`);
await sleep(300);
await clipShot('H-16', 'before', '.ilife-help-shell-card');
const t16 = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-card-copy') || document.querySelector('.ilife-help-shell-btn-prompt');
  var b = el.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; }())`);
await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: t16.x, y: t16.y, button: 'left', clickCount: 1 });
await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: t16.x, y: t16.y, button: 'left', clickCount: 1 });
await sleep(220);
const h16 = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-card-copy') || document.querySelector('.ilife-help-shell-btn-prompt');
  return { cls: el.className, copied: el.className.indexOf('copied') >= 0, toasts: document.querySelectorAll('.ilife-toast').length,
    toastText: (document.querySelector('.ilife-toast') || {}).textContent || null }; }())`);
observed['H-16'] = h16;
await viewportShot('H-16', 'after');
check('H-16.1', '真手势后按钮进入 copied 态（截图 after 已取证）', h16.copied === true, h16, 'copied=true');
check('H-16.2', '同一时刻恰 1 枚 toast 出现（双反馈第二通道）', h16.toasts === 1, h16.toasts, 1);

/* ── H-17 表格：HELP 页 N/A（D-18b） ────────────────────────────────────── */
observed['H-17'] = { tables: domCounts.table };
log('[N/A ] H-17 表格：HELP 页 <table> 实测 ' + domCounts.table + ' → 按 D-18b 判 HELP 页 N/A，转内容页区块尺 B-03');
await clipShot('H-17', 'na', '.ilife-help-shell-card');

/* ── H-19 回顶按钮（时序由 CMD-I／t88 主证，这里补 before/after 截图） ──── */
await evaluate('window.scrollTo(0, 0)');
await sleep(400);
const bt0 = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-btn-backtop'); if (!el) return null; var cs = getComputedStyle(el); var r = el.getBoundingClientRect();
  return { opacity: cs.opacity, pe: cs.pointerEvents, w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderRadius, position: cs.position,
    right: Math.round(window.innerWidth - r.right), bottom: Math.round(window.innerHeight - r.bottom) }; }())`);
observed['H-19'] = { initial: bt0 };
await viewportShot('H-19', 'before');
check('H-19.1', '回顶按钮几何 42×42／圆形／fixed／right=bottom=24',
  bt0 !== null && bt0.w === 42 && bt0.h === 42 && bt0.radius === '50%' && bt0.position === 'fixed' && bt0.right === 24 && bt0.bottom === 24,
  bt0, '42×42/50%/fixed/24,24');
check('H-19.2', 'scrollY=0 时不可见（opacity 0 ＋ pointer-events none）', bt0 !== null && bt0.opacity === '0' && bt0.pe === 'none', bt0 && { o: bt0.opacity, pe: bt0.pe }, '0/none');
await evaluate('window.scrollTo(0, 500)');
await sleep(500);
const bt1 = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-btn-backtop'); var cs = getComputedStyle(el);
  return { scrollY: Math.round(window.scrollY), opacity: cs.opacity, pe: cs.pointerEvents }; }())`);
observed['H-19'].shown = bt1;
await viewportShot('H-19', 'after');
check('H-19.3', 'scrollY>400 后出现（opacity 1 ＋ 可点，截图 after 已取证）', bt1.opacity === '1' && bt1.pe !== 'none', bt1, 'opacity 1 / 可点');
await evaluate('window.scrollTo(0, 0)');
await sleep(300);

/* ── H-20 焦点可见 ＋ 动效可关（时序由 CMD-I 主证，这里补焦点环截图） ──── */
await evaluate('document.body.focus(); window.scrollTo(0, 0);');
await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
await s('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
await sleep(200);
const fv = await evalJson(`(function () { var el = document.activeElement; if (!el || el === document.body) return { tag: 'BODY' };
  var cs = getComputedStyle(el); return { tag: el.tagName, cls: String(el.className).slice(0, 48), matchesFV: el.matches(':focus-visible'),
    outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }; }())`);
await viewportShot('H-20', 'focus');
check('H-20.1', 'Tab 后活动元素 matches(:focus-visible) 且 outline ≥1px（截图 focus 已取证）',
  fv.matchesFV === true && parseFloat(fv.outlineWidth) >= 1 && fv.outlineStyle !== 'none', fv, 'matchesFV=true / outline ≥1px');
/* Tab 遍历 10 次：逐控件清点焦点环来源（自定义 2px solid --blue ／ UA auto） */
const tabSamples = [];
for (let i = 0; i < 10; i += 1) {
  await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await s('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await sleep(140);
  tabSamples.push(await evalJson(`(function () { var el = document.activeElement; if (!el || el === document.body) return { tag: 'BODY' };
    var cs = getComputedStyle(el); return { tag: el.tagName, cls: String(el.className).slice(0, 44), matchesFV: el.matches(':focus-visible'),
      outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }; }())`));
}
const controls = tabSamples.filter((x) => x.tag !== 'BODY');
const customRing = controls.filter((x) => x.outlineColor === 'rgb(0, 122, 255)');
const anyRing = controls.filter((x) => x.matchesFV === true && parseFloat(x.outlineWidth) > 0 && x.outlineStyle !== 'none');
observed['H-20'] = { focus: fv, tab: tabSamples, controls: controls.length, customRing: customRing.length, anyRing: anyRing.length };
check('H-20.2', 'Tab 遍历到的每个可交互控件焦点环均可见（outline ≥1px 且 :focus-visible）',
  controls.length >= 4 && anyRing.length === controls.length, { controls: controls.length, anyRing: anyRing.length, samples: tabSamples.map((x) => x.tag + '.' + x.cls + ' ' + x.outlineStyle + '/' + x.outlineWidth + '/' + x.outlineColor) }, '每个控件都有环');
await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await sleep(300);
const rm = await evalJson(`(function () { var pick = function (sel) { var el = document.querySelector(sel); if (!el) return null;
  var cs = getComputedStyle(el); return { transition: cs.transitionDuration, anim: cs.animationDuration, name: cs.animationName }; };
  return { copy: pick('.ilife-help-shell-card-copy'), backtop: pick('.ilife-help-shell-btn-backtop'), toast: pick('.ilife-toast') }; }())`);
observed['H-20'].reduced = rm;
await s('Emulation.setEmulatedMedia', { features: [] });
check('H-20.3', 'prefers-reduced-motion:reduce 下复制按钮过渡归零（computed）',
  rm.copy === null || rm.copy.transition.split(',').every((v) => parseFloat(v) === 0), rm.copy, '0s');

/* ══ H-18 空态（现场构造样本，冻结 renderEmptyState ＋ buildStyleSheet） ═══ */
await openPage(pathToFileURL(EMPTY_SAMPLE).href, '.ilife-empty');
const h18 = await evalJson(`(function () {
  var root = document.querySelector('.ilife-empty'); if (!root) return null;
  var cs = getComputedStyle(root);
  var icon = document.querySelector('.ilife-empty-icon');
  var text = document.querySelector('.ilife-empty-text');
  var hint = document.querySelector('.ilife-empty-hint');
  var ic = icon ? getComputedStyle(icon) : null; var tc = text ? getComputedStyle(text) : null; var hc = hint ? getComputedStyle(hint) : null;
  return { tag: root.tagName, cls: root.className, padding: cs.paddingTop + '/' + cs.paddingRight + '/' + cs.paddingBottom + '/' + cs.paddingLeft,
    background: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopStyle, radius: cs.borderRadius, textAlign: cs.textAlign,
    iconTag: icon ? icon.tagName : null, iconSize: ic ? ic.fontSize : null, iconOpacity: ic ? ic.opacity : null,
    textTag: text ? text.tagName : null, textSize: tc ? tc.fontSize : null, textWeight: tc ? tc.fontWeight : null,
    hintTag: hint ? hint.tagName : null, hintSize: hc ? hc.fontSize : null, hintColor: hc ? hc.color : null }; }())`);
observed['H-18'] = h18;
check('H-18.1', '空态根含卡片外观（背景／圆角／描边 ＋ 居中）',
  h18 !== null && h18.background !== 'rgba(0, 0, 0, 0)' && parseFloat(h18.radius) > 0 && h18.border.indexOf('1px') === 0 && h18.textAlign === 'center',
  h18 && { background: h18.background, radius: h18.radius, border: h18.border, textAlign: h18.textAlign }, '卡片外观');
check('H-18.2', '空态 computed padding = 48px 20px',
  h18 !== null && h18.padding === '48px/20px/48px/20px', h18 && h18.padding, '48/20/48/20');
check('H-18.3', '图标 40px ＋ opacity .5', h18 !== null && h18.iconSize === '40px' && h18.iconOpacity === '0.5', h18 && { size: h18.iconSize, opacity: h18.iconOpacity }, '40px/0.5');
check('H-18.4', '标题 17px／600、说明 13px 最浅灰',
  h18 !== null && h18.textSize === '17px' && h18.textWeight === '600' && h18.hintSize === '13px',
  h18 && { text: h18.textSize + '/' + h18.textWeight, hint: h18.hintSize, hintColor: h18.hintColor }, '17/600 + 13');
await viewportShot('H-18', 'viewport');
await clipShot('H-18', 'element', '.ilife-empty');

/* ── 汇总 ───────────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.ok).length;
log('');
log('shots=' + shots.length + ' bytes=' + shots.reduce((a, x) => a + x.bytes, 0));
log('RESULT: ' + pass + '/' + results.length + ' PASS, ' + (results.length - pass) + ' FAIL');
if (pass !== results.length) log('FAILED: ' + results.filter((r) => !r.ok).map((r) => r.id).join(' '));
writeFileSync(join(OUT, 'probe-shots.json'), JSON.stringify({
  artifact: ARTIFACT.slice(ROOT.length + 1), sha256_16: sha16, browser: bv.product, observed, results, shots,
}, null, 2), 'utf8');
flush();
chrome.kill();
cdp.close();
process.exit(pass === results.length ? 0 : 1);
