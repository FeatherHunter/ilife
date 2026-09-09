/** #121 复制按钮 `copied` 态（H-16 JS 侧）——真实浏览器实证（headless Chrome ＋ **CDP 真手势**）。
 *
 *  跑法（仓根）：`node tooling/run-locked.mjs --ticket 121 -- node docs/research/t121-browser-evidence.mjs [--label before|after]`
 *  （**必须经持锁包装器**：本脚本读共享 `dist/`，他席的变异构建窗口会污染读数——红队 S3-2／`t121-review-red.md:57`。）
 *  退出码：0＝全部断言通过；1＝有断言失败；2＝**缺浏览器／缺 dist**（实证未完成，绝不静默变绿）。
 *
 *  被验对象：`packages/base-render/dist/controls.js` 的 `buildSharedHelpersJs()` 复制反馈路径
 *  ——点击复制按钮成功后给**被点击的按钮**加 `copied` 类（H-16 双反馈的按钮通道），
 *  ~450ms 后移除；失败路径**不得**加类（不得静默变绿）。
 *
 *  为什么用 CDP 而不是 `--dump-dom`：本票的验收面是**真实手势 → 类名 → computed 背景 → 450ms 回落**
 *  的时序；`--dump-dom` 无真实时间轴、无命中测试（`docs/research/t88-browser-evidence-b.mjs:12-15` 同口径）。
 *  页面侧**零产品改动**（不替换 navigator.clipboard／不改产品代码）；页面侧只装**只读观测器**：
 *  ① 捕获阶段 click 时间戳；② 目标按钮上的 `MutationObserver`（`class` 属性）记录 `copied` 被加／被移除的
 *  精确 `performance.now()`——存活时长**以此为准**（驱动侧 CDP 采样只用于**背景过渡**取证；S2-1：~31ms 粒度会
 *  低估存活时长，实测曾出现 394/395/398ms < 400 下界的伪红，`t121-review-red.md:55`）。
 *
 *  指纹：`dist/index.js` ＋ `dist/controls.js` ＋ **`dist/style.js`**（S3-1：CSS 产出面必须入指纹，
 *  否则 `.copied` 被换成别的 token 时指纹不变＝对 CSS 面失明，`t121-review-red.md:56`）。
 *
 *  四个观测面：
 *    A 卡级复制按钮（`.ilife-help-shell-card-copy`，helpers 运行时注入）——H-16「每行恰一个行内复制按钮」；
 *    B Sheet 内 prompt 复制按钮（`.ilife-help-shell-btn-prompt`，静态渲染）；
 *    C 通用复制按钮（`.ilife-copy-btn`，`renderActionBar` 产出）——#75 的 CSS 侧命中面；
 *    D 失败路径（通道 1 拒 ＋ `execCommand` 假）：**不得**出现 `copied` 类，必须出 danger toast。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SCRATCH = resolve(ROOT, '.scratch', 't121', 'browser');
const labelArg = process.argv.indexOf('--label');
const LABEL = labelArg > 0 && process.argv[labelArg + 1] ? process.argv[labelArg + 1] : 'run';
const LOG = join(SCRATCH, 'evidence-' + LABEL + '.log');

const transcript = [];
function log(line = '') {
  transcript.push(line);
  console.log(line);
}
function flush() {
  try { writeFileSync(LOG, transcript.join(LF) + LF, 'utf8'); } catch { /* 证据落盘失败不掩盖结论 */ }
}
const results = [];
function check(id, name, ok, actual, expect) {
  results.push({ id, name, ok: ok === true });
  log('[ASSERT] ' + id + ' ' + name + ' → ' + (ok ? 'PASS' : 'FAIL')
    + '  实测=' + JSON.stringify(actual) + '  期望=' + JSON.stringify(expect));
  return ok === true;
}
function die(code, message) {
  log('RESULT: ABORT exit=' + code + ' :: ' + message);
  flush();
  process.exit(code);
}
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/* ── 0. 路径守卫 ＋ 产物指纹（这份证据验的是哪一份 dist 字节） ─────────────── */

if (!SCRATCH.replace(/\\/g, '/').includes('/.scratch/t121/browser')) die(2, '输出目录路径守卫失败：' + SCRATCH);
mkdirSync(SCRATCH, { recursive: true });
const DIST = join(ROOT, 'packages', 'base-render', 'dist', 'index.js');
const DIST_CONTROLS = join(ROOT, 'packages', 'base-render', 'dist', 'controls.js');
const DIST_STYLE = join(ROOT, 'packages', 'base-render', 'dist', 'style.js');
if (!existsSync(DIST)) die(2, '缺 dist：' + DIST + '（先 pnpm build）');
/* S3-1（红队 `t121-review-red.md:56`）：指纹必须覆盖 **CSS 产出面** `dist/style.js`——
 * 只记 `index.js`＋`controls.js` 时，他席把 `.copied` 改成 `var(--blue)` 的变异构建指纹**完全一致**（对 CSS 面失明）。 */
const fingerprint = [DIST, DIST_CONTROLS, DIST_STYLE].map((p) => {
  const buf = readFileSync(p);
  return {
    file: p.slice(ROOT.length + 1).replace(/\\/g, '/'),
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
});

/* ── 1. 找浏览器（找不到 → 显式失败） ─────────────────────────────────────── */

const BROWSER = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) {
  die(2, '未找到 Chrome／Edge：本票的验收面是「真手势 → 类名 → computed 背景 → 450ms 回落」，'
    + '静态 HTML 查不到 → 实证**缺失**（不静默跳过）。用 DSH_BROWSER=<路径> 指定。');
}

/* ── 2. 夹具：真实 HELP 壳（renderHelpShell ＋ 同一份 style／helpers 产出） ── */

const base = await import(pathToFileURL(DIST).href);
const { renderHelpShell, buildStyleSheet, buildSharedHelpersJs, renderActionBar, COPY_ACTION_IDS } = base;

const SCENES = 8;
const PROMPT = (i) => '请你执行第 ' + i + ' 项：帮我复盘今天的饮食。' + LF + LF + '天数:7';
function sceneData() {
  const groups = [];
  for (let g = 0; g < 2; g += 1) {
    const subgroups = [];
    for (let s = 0; s < 2; s += 1) {
      const scenes = [];
      for (let k = 0; k < SCENES / 4; k += 1) {
        const i = (g * 2 + s) * (SCENES / 4) + k;
        scenes.push({
          id: 't121.scene.' + i,
          title: '场景 ' + i,
          wake_word: '唤醒 ' + i,
          status: '',
          prompt_template: PROMPT(i),
          types: ['结果'],
        });
      }
      subgroups.push({ id: 'g' + g + '_' + s, label: '子功能 ' + g + '-' + s, scenes });
    }
    groups.push({ id: 'g' + g, label: '分组 ' + g, icon: '📁', subgroups });
  }
  return { skill_name: '#121 夹具', title: '复制按钮 copied 态', subtitle: 'H-16 双反馈', groups };
}

const HELPERS = buildSharedHelpersJs();
const CSS = buildStyleSheet().css;
const HELP_PAGE = join(SCRATCH, 'help.html');
const HELP_HTML = renderHelpShell({
  sceneData: sceneData(),
  assets: { sharedHelpersJs: HELPERS, sharedCssText: CSS },
}).html;
writeFileSync(HELP_PAGE, HELP_HTML, 'utf8');

/** C 面：通用复制按钮页（`renderActionBar` 的 `.ilife-copy-btn`，helpers 委派同一路径）。 */
const PRE_PAGE = join(SCRATCH, 'pre.html');
const preHtml = '<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>#121 C 面</title><style>'
  + CSS + '</style></head><body>'
  + renderActionBar({
    buttons: [{ label: '打开', kind: 'primary', actionId: 'ilife-demo-open' }],
    copyData: { actionId: COPY_ACTION_IDS.actionBar.copyData, text: 'calorie-cmd-read help.lookup {}' },
  })
  + '<script>' + LF + HELPERS + LF + '</script></body></html>';
writeFileSync(PRE_PAGE, preHtml, 'utf8');

/* ── 3. 起 headless Chrome ＋ CDP ───────────────────────────────────────── */

const PORT = 9411 + (process.pid % 300);
const profile = join(SCRATCH, '_profile-' + LABEL);
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
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
      if (msg.error) reject(new Error(msg.error.message + '（' + JSON.stringify(msg.error.data ?? '') + '）'));
      else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', (e) => reject(new Error('WS 错误：' + String(e && e.message))));
  });
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
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪 ' + PORT); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
async function evaluate(expression) {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
const evalJson = async (expr) => {
  const raw = await evaluate('JSON.stringify(' + expr + ')');
  return raw === undefined ? undefined : JSON.parse(raw);
};

await s('Page.enable');
await s('Runtime.enable');
await s('DOM.enable');
await cdp.send('Browser.grantPermissions', {
  origin: 'file://',
  permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
}).catch((e) => log('# WARN grantPermissions(file://) 失败：' + e.message + '（继续，由观测结果裁决）'));

log('# #121 复制按钮 copied 态 —— 真实浏览器实证（label=' + LABEL + '）');
log('browser=' + BROWSER);
log('fingerprint=' + JSON.stringify(fingerprint));
log('helpersBytes=' + Buffer.byteLength(HELPERS, 'utf8') + ' cssBytes=' + Buffer.byteLength(CSS, 'utf8'));

/** 打开一个页面并等 load ＋ helpers 跑完。 */
async function open(url) {
  await s('Page.navigate', { url: pathToFileURL(url).href });
  await cdp.send('Target.activateTarget', { targetId });
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate('document.readyState === "complete"') === true) break;
    await sleep(50);
  }
  await sleep(250);
}

/** 读一次按钮现场：类名 ＋ computed 背景 ＋ 弹簧过渡。 */
const probeExpr = (selector, nth = 0) => `(function () {
  var el = document.querySelectorAll(${JSON.stringify(selector)})[${nth}];
  if (!el) return null;
  var cs = getComputedStyle(el);
  return { cls: el.className, bg: cs.backgroundColor, transformTransition: cs.transitionProperty + " / " + cs.transitionDuration };
}())`;

/** 真手势点击 ＋ **驱动侧**时间线采样（背景过渡用）＋ **页面侧 MutationObserver 精确计时**（类名存活时长）。
 *  页面侧只装**只读观测器**（`MutationObserver` ＋ 捕获阶段 click 时间戳），不替换任何产品行为。 */
async function clickAndTrack(selector, nth = 0) {
  const rect = await evalJson(`(function () {
    var els = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(selector)}));
    var el = els[${nth}];
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
  }())`);
  if (rect === null || rect.w === 0 || rect.h === 0) return null;
  // 两个**页面侧只读**计时器（S2-1 修法：提高采样率，不放宽阈值）：
  //   ① 1ms 轮询（主口径）——记录 `copied` 首次出现／首次消失的 `performance.now()`（偏差 ≤ 一拍）；
  //   ② `MutationObserver`（交叉校验）——独立第二条时间线，两者互证。
  const observed = await evaluate(`(function () {
    var el = document.querySelectorAll(${JSON.stringify(selector)})[${nth}];
    if (!el) return false;
    var st = { pollAdd: null, pollRemove: null, obsAdd: null, obsRemove: null, polls: 0, clickT: null, cls0: el.className };
    window.__t121obs = st;
    var on = function () { return (" " + el.className + " ").indexOf(" copied ") > -1; };
    var tick = function () {
      var t = performance.now();
      st.polls += 1;
      if (on() && st.pollAdd === null) st.pollAdd = t;
      if (!on() && st.pollAdd !== null && st.pollRemove === null) st.pollRemove = t;
      if (t - st.installedAt < 900) setTimeout(tick, 1); else st.done = true;
    };
    var obs = new MutationObserver(function () {
      var t = performance.now();
      if (on() && st.obsAdd === null) st.obsAdd = t;
      if (!on() && st.obsAdd !== null && st.obsRemove === null) st.obsRemove = t;
    });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("click", function () { if (st.clickT === null) st.clickT = performance.now(); }, true);
    st.installedAt = performance.now();
    setTimeout(tick, 1);
    return true;
  }())`);
  if (observed !== true) return null;
  const t0 = Date.now();
  await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
  await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  const timeline = [];
  while (Date.now() - t0 < 950) {
    const st = await evalJson(probeExpr(selector, nth));
    if (st === null) break;
    timeline.push({ t: Date.now() - t0, cls: st.cls, bg: st.bg, tt: st.transformTransition });
    await sleep(20);
  }
  const obs = await evalJson(`(function () {
    var st = window.__t121obs || {};
    var nz = function (v) { return v === undefined ? null : v; };
    return { pollAdd: nz(st.pollAdd), pollRemove: nz(st.pollRemove), obsAdd: nz(st.obsAdd), obsRemove: nz(st.obsRemove),
      polls: st.polls || 0, clickT: nz(st.clickT), done: st.done === true, cls0: st.cls0 || null };
  }())`);
  return { rect, timeline, obs };
}

/** 时间线 → 可断言摘要（`copied` 首/末次命中、背景稳定后的绿值、回落态）。 */
function summarize(track) {
  const tl = track.timeline;
  const obs = track.obs ?? { pollAdd: null, pollRemove: null, obsAdd: null, obsRemove: null, clickT: null, polls: 0 };
  const on = tl.filter((x) => (' ' + x.cls + ' ').includes(' copied '));
  const settled = on.filter((x) => x.t >= 260 && x.t <= 430);
  const green = settled.find((x) => x.bg === 'rgb(52, 199, 89)') ?? null;
  const last = tl[tl.length - 1] ?? null;
  const first = tl[0] ?? null;
  const round2 = (v) => (v === null || v === undefined ? null : Number(v.toFixed(2)));
  const pollCopiedMs = obs.pollAdd !== null && obs.pollRemove !== null ? obs.pollRemove - obs.pollAdd : 0;
  const obsCopiedMs = obs.obsAdd !== null && obs.obsRemove !== null ? obs.obsRemove - obs.obsAdd : 0;
  const addLatency = obs.pollAdd !== null && obs.clickT !== null ? obs.pollAdd - obs.clickT : null;
  return {
    samples: tl.length,
    firstOn: on.length ? on[0].t : null,
    lastOn: on.length ? on[on.length - 1].t : null,
    copiedMs: on.length ? on[on.length - 1].t - on[0].t : 0,
    pollCopiedMs: round2(pollCopiedMs),
    obsCopiedMs: round2(obsCopiedMs),
    instrumentDelta: round2(Math.abs(pollCopiedMs - obsCopiedMs)),
    pollAdd: round2(obs.pollAdd),
    pollRemove: round2(obs.pollRemove),
    addLatency: round2(addLatency),
    polls: obs.polls,
    settledBg: settled.length ? settled[0].bg : null,
    greenSettled: green !== null,
    spring: (on[0] ?? first)?.tt ?? null,
    after: last ? { t: last.t, cls: last.cls, bg: last.bg } : null,
    track: tl.map((x) => x.t + ':' + ((' ' + x.cls + ' ').includes(' copied ') ? 'C' : '-') + '/' + x.bg),
  };
}

/* ── A. 卡级复制按钮（helpers 运行时注入，H-16「行内复制按钮」） ───────────── */

await open(HELP_PAGE);
const cardSel = '.ilife-help-shell-card-copy';
const cardCount = await evaluate('document.querySelectorAll("' + cardSel + '").length');
log('');
log('## A 卡级复制按钮（' + cardSel + '，注入数=' + cardCount + '）');
const cardBefore = await evalJson(probeExpr(cardSel));
const cardTrack = await clickAndTrack(cardSel);
if (cardTrack === null) die(2, 'A 面：卡级复制按钮不可见／不可点（rect=null）');
const cardSum = summarize(cardTrack);
const cardClip = await evaluate('navigator.clipboard.readText()');
const cardToasts = await evaluate('document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length');
log('A 现场：before=' + JSON.stringify(cardBefore));
log('A 摘要：' + JSON.stringify({ ...cardSum, track: undefined }));
log('A 时间线：' + cardSum.track.join(' '));
log('A 剪贴板回读=' + JSON.stringify(cardClip) + ' toasts=' + cardToasts);
check('A1', '真手势点击卡级复制按钮（真实命中测试）', cardTrack !== null, cardTrack.rect, 'rect 非空');
check('A2', '点击后按钮获得 `copied` 类', cardSum.firstOn !== null, cardSum.firstOn, '非 null');
check('A3', 'copied 态 computed 背景 = 成功色 --ok（过渡结束后采样）', cardSum.greenSettled === true, cardSum.settledBg, 'rgb(52, 199, 89)');
check('A4', '450ms 后回落（类名移除）', cardSum.after !== null && !(' ' + cardSum.after.cls + ' ').includes(' copied '), cardSum.after, '不含 copied');
check('A5', '回落背景 ≠ 成功色（回到常态底色）', cardSum.after !== null && cardSum.after.bg !== 'rgb(52, 199, 89)', cardSum.after && cardSum.after.bg, '≠ rgb(52, 199, 89)');
check('A6', 'copied 类存活 440–520ms（**页面侧 1ms 轮询**主口径；下界 440 比红队要求的 400 更严，上界只容忍浏览器定时器抖动）',
  cardSum.pollCopiedMs >= 440 && cardSum.pollCopiedMs <= 520,
  cardSum.pollCopiedMs + 'ms（MutationObserver ' + cardSum.obsCopiedMs + 'ms／驱动侧 ' + cardSum.copiedMs + 'ms）', '440–520ms');
check('A7', '弹簧过渡在按钮上（450ms spring）', typeof cardSum.spring === 'string' && /0\.45s|450ms/.test(cardSum.spring),
  cardSum.spring, '含 .45s');
const norm = (s) => (typeof s === 'string' ? s.replace(/\r\n/g, '\n') : s);
check('A8', '真剪贴板回读 = 该卡 <pre> 原文（双反馈的另一通道真的也成立）',
  norm(cardClip) === PROMPT(0), norm(cardClip).slice(0, 40), PROMPT(0).slice(0, 40));
check('A9', '一次点击只出一枚 toast（委派不倍增）', cardToasts === 1, cardToasts, 1);
check('A10', '两条独立页面侧计时器互证（轮询 vs MutationObserver 差 ≤ 25ms；点击→加类延迟 < 30ms）',
  cardSum.pollAdd !== null && cardSum.pollRemove !== null && cardSum.obsCopiedMs > 0
    && cardSum.instrumentDelta <= 25 && cardSum.addLatency !== null && cardSum.addLatency < 30,
  { pollAdd: cardSum.pollAdd, pollRemove: cardSum.pollRemove, addLatency: cardSum.addLatency, polls: cardSum.polls, delta: cardSum.instrumentDelta },
  '两计时器差 ≤ 25ms 且 addLatency < 30ms');

/* ── B. Sheet 内 prompt 复制按钮（静态渲染面） ───────────────────────────── */

log('');
log('## B Sheet 内 prompt 复制按钮（.ilife-help-shell-btn-prompt）');
await evaluate('(function () { var d = document.querySelector(".ilife-help-shell-sheet"); if (d) d.open = true; }())');
await sleep(150);
const sheetSel = '.ilife-help-shell-btn-prompt';
const sheetTrack = await clickAndTrack(sheetSel);
if (sheetTrack === null) die(2, 'B 面：Sheet prompt 按钮不可见／不可点');
const sheetSum = summarize(sheetTrack);
log('B 摘要：' + JSON.stringify({ ...sheetSum, track: undefined }));
log('B 时间线：' + sheetSum.track.join(' '));
check('B1', '真手势点击 Sheet prompt 复制按钮', sheetTrack !== null, sheetTrack.rect, 'rect 非空');
check('B2', '点击后按钮获得 `copied` 类', sheetSum.firstOn !== null, sheetSum.firstOn, '非 null');
check('B3', 'copied 态 computed 背景 = rgb(52, 199, 89)', sheetSum.greenSettled === true, sheetSum.settledBg, 'rgb(52, 199, 89)');
check('B4', '450ms 后回落', sheetSum.after !== null && !(' ' + sheetSum.after.cls + ' ').includes(' copied '), sheetSum.after, '不含 copied');

/* ── C. 通用 `.ilife-copy-btn`（#75 的 CSS 命中面 ＋ 同一 helpers 委派） ──── */

log('');
log('## C 通用复制按钮（.ilife-copy-btn，renderActionBar 产出）');
await open(PRE_PAGE);
const genericSel = '.ilife-copy-btn';
const genericTrack = await clickAndTrack(genericSel);
if (genericTrack === null) die(2, 'C 面：通用复制按钮不可见／不可点');
const genericSum = summarize(genericTrack);
log('C 摘要：' + JSON.stringify({ ...genericSum, track: undefined }));
log('C 时间线：' + genericSum.track.join(' '));
check('C1', '真手势点击通用复制按钮', genericTrack !== null, genericTrack.rect, 'rect 非空');
check('C2', '点击后获得 `copied` 类（#75 CSS 的命中面）', genericSum.firstOn !== null, genericSum.firstOn, '非 null');
check('C3', 'copied 态 computed 背景 = rgb(52, 199, 89)', genericSum.greenSettled === true, genericSum.settledBg, 'rgb(52, 199, 89)');
check('C4', '450ms 后回落', genericSum.after !== null && !(' ' + genericSum.after.cls + ' ').includes(' copied '), genericSum.after, '不含 copied');

/* ── D. 失败路径：不得静默变绿 ─────────────────────────────────────────── */

log('');
log('## D 失败路径（通道 1 拒 ＋ execCommand 假）→ 不得静默变绿');
await open(HELP_PAGE);
await evaluate(`(function () {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: function () { return Promise.reject(new Error("denied")); } } });
  document.execCommand = function () { return false; };
  return true;
}())`);
const failTrack = await clickAndTrack(cardSel);
if (failTrack === null) die(2, 'D 面：卡级复制按钮不可见／不可点');
const failSum = summarize(failTrack);
const failToast = await evalJson(`(function () {
  var box = document.querySelector(".ilife-toast-stack > .ilife-toast");
  if (!box) return null;
  var t = box.querySelector(".ilife-toast-title");
  return { title: t ? t.textContent : null, danger: box.className.indexOf("danger") > -1, count: document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length };
}())`);
log('D 摘要：' + JSON.stringify({ ...failSum, track: undefined }) + ' toast=' + JSON.stringify(failToast));
log('D 时间线：' + failSum.track.join(' '));
check('D1', '复制失败时**不得**出现 `copied` 类（不静默变绿）', failSum.firstOn === null, failSum.firstOn, null);
check('D2', '复制失败时背景**不得**为成功色',
  failSum.track.every((x) => !x.endsWith('rgb(52, 199, 89)')), failSum.settledBg, '≠ rgb(52, 199, 89)');
check('D3', '复制失败必须出危险态 toast（显式失败）',
  failToast !== null && failToast.danger === true, failToast, 'danger toast');
check('D4', '失败 toast 文案 = 冻结 failMessage', failToast !== null && typeof failToast.title === 'string' && failToast.title.length > 0,
  failToast && failToast.title, '非空（冻结文案）');

/* ── 4. 收尾 ───────────────────────────────────────────────────────────── */

chrome.kill();
const failed = results.filter((r) => !r.ok);
log('');
log('RESULT: ' + (results.length - failed.length) + '/' + results.length + ' PASS, ' + failed.length + ' FAIL'
  + ' label=' + LABEL + ' browser=' + BROWSER);
if (failed.length) log('FAILED: ' + failed.map((f) => f.id + ' ' + f.name).join(' | '));
flush();
process.exit(failed.length ? 1 : 0);
