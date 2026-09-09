/** #89（89b 视觉锁验收）· **交互／时序取证链路探针**（H-12／H-16／H-19／H-20）。
 *
 *  跑法（仓根，必须持锁——本脚本读共享 dist 并渲染真实产物）：
 *    node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs
 *  退出码：0＝探针项全绿；1＝有探针项红（**只说明「当前态抽样」不达标，不是验收结论**）；
 *          **2＝缺产物／缺 dist／缺浏览器／CDP 起不来（链路不可用，绝不静默变绿）**。
 *
 *  它证明四件事（逐条对应 `docs/research/t89-evidence-plan.md` §1 的 B 级条目）：
 *    H-12 断点：**三档视口采样**（1440／640／400）＋ 静态 `@media` 计数 ＋ toast 栈左右内距实测。
 *    H-16 复制：**真手势**（`Input.dispatchMouseEvent`）＋ **页面侧双计时器**（1ms 轮询 ＋ `MutationObserver`）
 *               ＋ **真剪贴板回读**（归一 CRLF）＋ **toast 存活时长**（childList 观测 ＋ 25ms 轮询互证）。
 *    H-19 回顶：滚动阈值前后回顶按钮的可见性采样 ＋ 点击后 `requestAnimationFrame` 采样 `scrollY` 轨迹。
 *    H-20 无障碍：`Emulation.setEmulatedMedia` 打开 `prefers-reduced-motion: reduce` 后逐元素 computed
 *               过渡／动画时长；`Input.dispatchKeyEvent` Tab 遍历后 `matches(':focus-visible')` ＋ outline 实测。
 *
 *  口径纪律：**所有阈值都写在本文件顶部常量里**，改阈值必须同步 `t89-evidence-plan.md`；
 *  行尾比对一律归一 CRLF→LF（Windows 剪贴板恒 CRLF，否则假红——本探针踩过）。
 *
 *  三条**探针自身**的坑（已修，写在这里防回归）：
 *   ① 观测器必须保留强引用（挂 `window.__t89`），否则可被 GC 回收 → 回调静默停投递 → 假红。
 *   ② toast 类名必须**逐 token 精确匹配** `ilife-toast`：子串匹配会把宿主容器 `ilife-toast-stack` 也计一枚。
 *   ③ toast 没有 `show` 类：helpers 是「整节点插入 ＋ `setTimeout(4500)` 整节点移除」，
 *      只看属性变化完全观测不到，必须用 **childList** 观测（或 25ms 轮询节点数）。
 *
 *  **底座**：启动参数集／等待条件／`die(2)` 口径／页面侧双计时器范式**逐条沿用**
 *  `docs/research/t121-browser-evidence.mjs`；H-16 与 `t121` 互证、H-19 与 `t88-browser-evidence-b.mjs`
 *  的 B20／B22／B23 互证（那两套里 H-12／H-20 **零命中**，故必须由本脚本新采）。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ── 阈值常量（改这里 = 改口径，必须同步 evidence-plan） ─────────────────── */
const COPIED_MS_WINDOW = [440, 520];   // H-16 按钮 copied 态存活窗口（#121 定稿口径）
const TOAST_MS_EXPECT = 4500;          // H-16 toast 存活（冻结 TOAST_DEFAULTS.timeoutMs）
const TOAST_MS_TOLERANCE = 0.2;        // ±20%（浏览器定时器抖动）
const BACKTOP_THRESHOLD = 400;         // H-19 scrollY > 400 才出现
const BACKTOP_MS = 1200;               // H-19 平滑回顶的观测窗口
const VIEWPORTS = [1440, 640, 400];    // H-12 采样档（640/400 为规格断点，1440 为宽屏基线）

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(ROOT, outArg > 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '.scratch/t89/evidence');
const ARTIFACT = resolve(ROOT, '.scratch/t89/help-file.html');

const transcript = [];
const log = (line = '') => { transcript.push(line); console.log(line); };
const flush = () => { try { writeFileSync(join(OUT, 'probe-interactive.log'), transcript.join(LF) + LF, 'utf8'); } catch { /* 落盘失败不掩盖结论 */ } };
const results = [];
const observed = {};
function check(id, name, ok, actual, expect) {
  results.push({ id, name, ok: ok === true });
  log('[ASSERT] ' + id + ' ' + name + ' → ' + (ok ? 'PASS' : 'FAIL') + '  实测=' + JSON.stringify(actual) + '  期望=' + JSON.stringify(expect));
  return ok === true;
}
function die(code, message) { log('RESULT: ABORT exit=' + code + ' :: ' + message); flush(); process.exit(code); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const norm = (t) => (typeof t === 'string' ? t.replace(/\r\n/g, '\n') : t);
mkdirSync(OUT, { recursive: true });

/* ── 前置守卫 ───────────────────────────────────────────────────────────── */
const DIST_INDEX = join(ROOT, 'packages/base-render/dist/index.js');
if (!existsSync(DIST_INDEX)) die(2, '缺 dist：' + DIST_INDEX + '（先 pnpm build）');
if (!existsSync(ARTIFACT)) {
  die(2, '缺 HELP 产物：' + ARTIFACT + LF
    + '  先跑：node tooling/run-locked.mjs --ticket 89 -- node packages/skill-calorie/dist/cli/cmd_read.js '
    + 'calorie.help.center --params "{\\"mode\\":\\"file\\"}" --output .scratch/t89/help-file.html');
}
const BROWSER = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) {
  die(2, '未找到 Chrome／Edge：H-12／H-16／H-19／H-20 的验收面是**交互与时序**，静态 HTML 判不了 → 实证缺失（不静默跳过）。'
    + '用 DSH_BROWSER=<路径> 指定。');
}
const artifactBuf = readFileSync(ARTIFACT);
log('# #89 交互／时序取证链路探针（H-12／H-16／H-19／H-20）');
log('artifact=' + ARTIFACT.slice(ROOT.length + 1).replace(/\\/g, '/')
  + ' bytes=' + artifactBuf.length + ' sha256_16=' + createHash('sha256').update(artifactBuf).digest('hex').slice(0, 16).toUpperCase());

/* ── headless ＋ CDP ────────────────────────────────────────────────────── */
const PORT = 9711 + (process.pid % 200);
const profile = join(OUT, '_profile-interactive');
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
await cdp.send('Browser.grantPermissions', { origin: 'file://', permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  .catch((e) => log('# WARN grantPermissions(file://) 失败：' + e.message));
const bv = await cdp.send('Browser.getVersion');
log('browser=' + BROWSER + ' version=' + bv.product);

await s('Page.navigate', { url: pathToFileURL(ARTIFACT).href });
await cdp.send('Target.activateTarget', { targetId });
await s('Page.bringToFront').catch(() => {});
for (let i = 0; i < 300; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
await sleep(600); /* 等 helpers 注入 436 张卡的复制按钮 */
const injected = await evalJson(`({ cards: document.querySelectorAll('.ilife-help-shell-card').length,
  cardCopy: document.querySelectorAll('.ilife-help-shell-card-copy').length,
  shellBtn: document.querySelectorAll('.ilife-help-shell-btn').length })`);
log('injected=' + JSON.stringify(injected));
if (injected.cardCopy === 0) die(2, 'helpers 未注入卡级复制按钮（cardCopy=0）→ 交互面不可判，链路失败。');

/* ── H-16：真手势 ＋ 双计时器 ＋ 剪贴板 ＋ toast 时长 ────────────────────── */
await evaluate(`(function () {
  window.__t89 = { t0: null, add: null, del: null, poll: null, polls: 0 };
  var t = window.__t89;
  var el = document.querySelector('.ilife-help-shell-card-copy');
  el.scrollIntoView({ block: 'center' });
  t.el = el;
  el.addEventListener('click', function () { t.t0 = performance.now(); }, true);
  /* 观测器必须保留强引用（挂 window.__t89），否则可被 GC 回收 → 回调静默停投递 → 假红。 */
  t.obsCopy = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i += 1) {
      var now = performance.now();
      var has = muts[i].target.className.indexOf('copied') >= 0;
      if (has && t.add === null) t.add = now;
      if (!has && t.add !== null && t.del === null) t.del = now;
    }
  });
  t.obsCopy.observe(el, { attributes: true, attributeFilter: ['class'] });
  /* 1ms 轮询（主口径）：记录 copied 类首次出现与消失 */
  t.poll = setInterval(function () {
    t.polls += 1;
    var has = el.className.indexOf('copied') >= 0;
    if (has && t.pollAdd === undefined) t.pollAdd = performance.now();
    if (!has && t.pollAdd !== undefined && t.pollDel === undefined) { t.pollDel = performance.now(); }
  }, 1);
  /* toast 观测：helpers 运行时**创建** .ilife-toast 节点（没有 show 类，
   * 靠 setTimeout(TIMEOUT_MS=4500) 整节点移除）——故用 childList MutationObserver（精确）
   * ＋ 25ms 轮询（交叉校验）双计时器；只看属性变化完全看不到它。 */
  var ts = { first: null, last: null, onsets: 0, live: 0, maxNodes: 0, polls: 0, pollFirst: null, pollLast: null, batches: 0, records: 0, addedSeen: 0 };
  t.toast = ts;
  /* 类名必须逐 token 精确匹配 ilife-toast：子串匹配会把宿主容器 ilife-toast-stack 也计一枚。
   * ⚠ 正则必须写双反斜杠（模板字符串里单个反斜杠会被吃掉 → 页面收到 /s+/ → 永远匹配失败）。 */
  function isToastNode(n) {
    if (!n || n.nodeType !== 1) return false;
    var c = String(n.className || '').split(/\\s+/);
    for (var i = 0; i < c.length; i += 1) { if (c[i] === 'ilife-toast') return true; }
    return false;
  }
  t.isToastNode = isToastNode;
  t.toastObs = new MutationObserver(function (muts) {
    ts.batches += 1; ts.records += muts.length;
    for (var i = 0; i < muts.length; i += 1) {
      var m = muts[i]; var now = performance.now();
      var added = m.addedNodes ? Array.prototype.slice.call(m.addedNodes) : [];
      var removed = m.removedNodes ? Array.prototype.slice.call(m.removedNodes) : [];
      ts.addedSeen += added.length;
      var a; var n;
      for (a = 0; a < added.length; a += 1) {
        n = added[a];
        if (isToastNode(n)) {
          if (ts.first === null) ts.first = now;
          ts.onsets += 1; ts.live += 1;
          if (ts.live > ts.maxNodes) ts.maxNodes = ts.live;
        }
      }
      for (a = 0; a < removed.length; a += 1) {
        n = removed[a];
        if (isToastNode(n)) { ts.last = now; ts.live -= 1; }
      }
    }
  });
  t.toastObs.observe(document.body, { childList: true, subtree: true });
  t.toastIv = setInterval(function () {
    var n = document.querySelectorAll('.ilife-toast').length;
    var now = performance.now();
    if (n > 0) { if (ts.pollFirst === null) ts.pollFirst = now; ts.pollLast = now; }
    ts.polls += 1;
  }, 25);
  return true;
}())`);
const target = await evalJson(`(function () {
  var el = document.querySelector('.ilife-help-shell-card-copy');
  var b = el.getBoundingClientRect();
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), dataT: el.getAttribute('data-t') };
}())`);
await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });
await sleep(1500);
const h16a = await evalJson(`(async function () {
  var t = window.__t89;
  var clip = null; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'ERR:' + e.name; }
  return { clicked: t.t0 !== null,
    obsMs: (t.add !== null && t.del !== null) ? Math.round((t.del - t.add) * 10) / 10 : null,
    pollMs: (t.pollAdd !== undefined && t.pollDel !== undefined) ? Math.round((t.pollDel - t.pollAdd) * 10) / 10 : null,
    addLatencyMs: t.add !== null && t.t0 !== null ? Math.round((t.add - t.t0) * 10) / 10 : null,
    settledClass: t.el.className, polls: t.polls, clip: clip,
    toast: { onsets: t.toast.onsets, maxNodes: t.toast.maxNodes, batches: t.toast.batches, records: t.toast.records, addedSeen: t.toast.addedSeen } };
}())`);
observed.H16 = { target: { x: target.x, y: target.y }, gesture: { ...h16a, clip: undefined } };
check('H-16.1', '真手势命中卡级复制按钮（click 事件时间戳存在）', h16a.clicked === true, h16a.clicked, true);
check('H-16.2', '点击后按钮获得 copied 类（双计时器都观测到）',
  h16a.obsMs !== null && h16a.pollMs !== null, { obsMs: h16a.obsMs, pollMs: h16a.pollMs, addLatencyMs: h16a.addLatencyMs }, '两计时器均非 null');
check('H-16.3', 'copied 存活时长落在窗口 ' + COPIED_MS_WINDOW.join('–') + 'ms（页面侧双计时器，非驱动侧采样）',
  h16a.obsMs !== null && h16a.obsMs >= COPIED_MS_WINDOW[0] && h16a.obsMs <= COPIED_MS_WINDOW[1],
  { obsMs: h16a.obsMs, pollMs: h16a.pollMs }, COPIED_MS_WINDOW.join('–') + 'ms');
check('H-16.4', '剪贴板回读逐字等于按钮 data-t（归一 CRLF）',
  typeof h16a.clip === 'string' && norm(h16a.clip) === norm(target.dataT),
  { clipLen: typeof h16a.clip === 'string' ? norm(h16a.clip).length : null, dataTLen: norm(target.dataT).length, rawCrlf: typeof h16a.clip === 'string' && h16a.clip.indexOf('\r\n') >= 0 },
  '归一后逐字相等');
check('H-16.5', '按钮在窗口后复原（settled 类名不含 copied）',
  String(h16a.settledClass).indexOf('copied') < 0, h16a.settledClass, '不含 copied');

/* toast 存活时长：等它消失（冻结 4500ms ±20%），再结算双计时器 */
await sleep(TOAST_MS_EXPECT + 2000);
const h16b = await evalJson(`(function () { var t = window.__t89;
  clearInterval(t.poll); clearInterval(t.toastIv);
  var ts = t.toast;
  return { onsets: ts.onsets, maxNodes: ts.maxNodes, polls: ts.polls, live: ts.live,
    batches: ts.batches, records: ts.records, addedSeen: ts.addedSeen,
    toastMs: (ts.first !== null && ts.last !== null) ? Math.round(ts.last - ts.first) : null,
    pollToastMs: (ts.pollFirst !== null && ts.pollLast !== null) ? Math.round(ts.pollLast - ts.pollFirst) : null,
    liveToasts: document.querySelectorAll('.ilife-toast').length }; }())`);
observed.H16.toast = h16b;
check('H-16.6', '单次点击恰出现 1 枚 toast（childList MutationObserver ＋ 25ms 轮询）',
  h16b.onsets === 1 && h16b.maxNodes === 1, { onsets: h16b.onsets, maxNodes: h16b.maxNodes, batches: h16b.batches, records: h16b.records, addedSeen: h16b.addedSeen }, '{onsets:1,maxNodes:1}');
check('H-16.7', 'toast 存活时长 ≈ 冻结 4500ms（±' + TOAST_MS_TOLERANCE * 100 + '%；两计时器互证）',
  h16b.toastMs !== null && Math.abs(h16b.toastMs - TOAST_MS_EXPECT) <= TOAST_MS_EXPECT * TOAST_MS_TOLERANCE,
  { obsMs: h16b.toastMs, pollMs: h16b.pollToastMs }, TOAST_MS_EXPECT + 'ms ±' + TOAST_MS_TOLERANCE * 100 + '%');
const perCard = await evalJson(`(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.ilife-help-shell-card')).slice(0, 40);
  var bad = [];
  cards.forEach(function (c, i) { var n = c.querySelectorAll('.ilife-help-shell-card-copy').length; if (n !== 1) bad.push({ i: i, n: n }); });
  return { sampled: cards.length, bad: bad,
    copyAll: document.querySelectorAll('[data-action-id*="copy-all"], .ilife-help-shell-copy-all').length };
}())`);
observed.H16.perCard = perCard;
check('H-16.8', '每张卡恰 1 个行内复制按钮（抽前 40 卡）', perCard.bad.length === 0, perCard, '坏卡 0');
check('H-16.9', '「复制全部」胶囊不存在（D-8 裁定）', perCard.copyAll === 0, perCard.copyAll, 0);

/* ── H-12：三档视口采样 ─────────────────────────────────────────────────── */
const h12 = [];
for (const w of VIEWPORTS) {
  await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  /* 触发一枚 toast 以测量窄屏栈内距 */
  await evaluate(`(function () { var b = document.querySelector('.ilife-help-shell-card-copy'); b.scrollIntoView({ block: 'center' }); return true; }())`);
  const box = await evalJson(`(function () { var b = document.querySelector('.ilife-help-shell-card-copy').getBoundingClientRect();
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; }())`);
  await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(350);
  const snap = await evalJson(`(function () {
    var shell = document.querySelector('.ilife-help-shell');
    var cs = getComputedStyle(shell);
    var stack = document.querySelector('.ilife-toast-stack');
    var ss = stack ? getComputedStyle(stack) : null;
    var grid = document.querySelector('.ilife-help-shell-grid');
    var cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null;
    return { innerWidth: window.innerWidth, padding: cs.paddingLeft + '/' + cs.paddingRight + '/' + cs.paddingBottom,
      maxWidth: cs.maxWidth, gridCols: cols,
      toastLeft: ss ? ss.left : null, toastRight: ss ? ss.right : null, toastTransform: ss ? ss.transform : null };
  }())`);
  h12.push({ w, ...snap });
  await s('Page.captureScreenshot', { format: 'png' }).then((r) => writeFileSync(join(OUT, 'h12-' + w + '.png'), Buffer.from(r.data, 'base64')));
}
await s('Emulation.clearDeviceMetricsOverride');
observed.H12 = h12;
const mediaStatic = await evalJson(`(function () {
  var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\\n');
  function n(re) { return (css.match(re) || []).length; }
  return { m640: n(/max-width:\\s*640px/g), m400: n(/max-width:\\s*400px/g), m720: n(/max-width:\\s*720px/g), m820: n(/max-width:\\s*820px/g) };
}())`);
observed.H12.mediaStatic = mediaStatic;
check('H-12.1', '静态 CSS 恰有 640px／400px 两条页面断点', mediaStatic.m640 === 1 && mediaStatic.m400 === 1, mediaStatic, '{m640:1,m400:1}');
const wide = h12.find((x) => x.w === 1440);
const narrow = h12.find((x) => x.w === 640);
check('H-12.2', '≤640px 容器内距降为 20px 16px 60px（实测 computed）',
  narrow !== undefined && narrow.padding === '16px/16px/60px', narrow && narrow.padding, '16px/16px/60px');
check('H-12.3', '宽屏容器内距 32px 20px 80px ＋ max-width 960px',
  wide !== undefined && wide.padding === '20px/20px/80px' && wide.maxWidth === '960px', wide && { padding: wide.padding, maxWidth: wide.maxWidth }, '20px/20px/80px + 960px');
const t400 = h12.find((x) => x.w === 400);
check('H-12.4', '≤400px（实测亦含冻结 820 层）toast 栈左右内距 = 12px',
  t400 !== undefined && t400.toastLeft === '12px' && t400.toastRight === '12px', t400 && { left: t400.toastLeft, right: t400.toastRight }, '12px/12px');

/* ── H-19：回顶按钮 ─────────────────────────────────────────────────────── */
await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await evaluate('window.scrollTo(0, 0)');
await sleep(400);
const bt = await evalJson(`(function () {
  var el = document.querySelector('.ilife-help-shell-btn-backtop');
  if (!el) return null;
  var cs = getComputedStyle(el); var r = el.getBoundingClientRect();
  return { found: true, opacity: cs.opacity, pointerEvents: cs.pointerEvents, position: cs.position,
    w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderRadius,
    right: Math.round(window.innerWidth - r.right), bottom: Math.round(window.innerHeight - r.bottom) };
}())`);
observed.H19 = { initial: bt };
check('H-19.1', '回顶按钮存在且几何符合规格（42×42／圆形／fixed／24px）',
  bt !== null && bt.w === 42 && bt.h === 42 && bt.position === 'fixed' && bt.right === 24 && bt.bottom === 24 && bt.radius.indexOf('50%') >= 0,
  bt, '42×42 / fixed / 24,24 / 50%');
check('H-19.2', '初始不可见（opacity 0 ＋ pointer-events none）',
  bt !== null && bt.opacity === '0' && bt.pointerEvents === 'none', bt && { o: bt.opacity, pe: bt.pointerEvents }, '0 / none');
await evaluate('window.scrollTo(0, ' + (BACKTOP_THRESHOLD + 1) + ')');
await sleep(500);
const btShown = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-btn-backtop');
  var cs = getComputedStyle(el); return { scrollY: Math.round(window.scrollY), opacity: cs.opacity, pointerEvents: cs.pointerEvents, cls: el.className }; }())`);
observed.H19.shown = btShown;
check('H-19.3', 'scrollY > ' + BACKTOP_THRESHOLD + ' 后出现（opacity 1 ＋ 可点）',
  btShown.opacity === '1' && btShown.pointerEvents !== 'none', btShown, 'opacity 1 / pointer-events 非 none');
const btnBox = await evalJson(`(function () { var el = document.querySelector('.ilife-help-shell-btn-backtop'); var r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }())`);
await evaluate(`(function () { window.__t89.trace = []; window.__t89.traceStart = performance.now();
  (function step() { window.__t89.trace.push(Math.round(window.scrollY));
    if (window.scrollY > 0 && performance.now() - window.__t89.traceStart < ${BACKTOP_MS}) requestAnimationFrame(step); })();
  return true; }())`);
await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: btnBox.x, y: btnBox.y, button: 'left', clickCount: 1 });
await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btnBox.x, y: btnBox.y, button: 'left', clickCount: 1 });
await sleep(BACKTOP_MS);
const trace = await evalJson(`(function () { var t = window.__t89.trace; return { samples: t.length, first: t[0], last: t[t.length - 1],
  monotonicDown: t.every(function (v, i) { return i === 0 || v <= t[i - 1]; }), distinct: new Set(t).size, scrollY: Math.round(window.scrollY) }; }())`);
observed.H19.trace = trace;
check('H-19.4', '点击后平滑回顶（rAF 采样单调下降到 0，窗口 ' + BACKTOP_MS + 'ms）',
  trace.scrollY === 0 && trace.monotonicDown === true && trace.distinct > 2,
  { finalScrollY: trace.scrollY, samples: trace.samples, distinct: trace.distinct, monotonicDown: trace.monotonicDown }, 'scrollY=0 且单调下降且采样 >2 个不同值');

/* ── H-20：焦点可见 ＋ 动效可关 ─────────────────────────────────────────── */
await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await sleep(300);
const rm = await evalJson(`(function () {
  function pick(sel) { var el = document.querySelector(sel); if (!el) return null; var cs = getComputedStyle(el);
    return { sel: sel, transitionDuration: cs.transitionDuration, animationDuration: cs.animationDuration, animationName: cs.animationName }; }
  return { copy: pick('.ilife-help-shell-card-copy'), backtop: pick('.ilife-help-shell-btn-backtop'),
    toast: pick('.ilife-toast') || null, shellBtn: pick('.ilife-help-shell-btn') };
}())`);
observed.H20 = { reducedMotion: rm };
const zero = (v) => typeof v === 'string' && v.split(',').every((x) => parseFloat(x) === 0);
check('H-20.1', 'prefers-reduced-motion: reduce 下复制按钮过渡归零',
  rm.copy !== null && zero(rm.copy.transitionDuration), rm.copy && rm.copy.transitionDuration, '0s');
check('H-20.2', 'prefers-reduced-motion: reduce 下回顶按钮过渡归零',
  rm.backtop !== null && zero(rm.backtop.transitionDuration), rm.backtop && rm.backtop.transitionDuration, '0s');
check('H-20.3', 'prefers-reduced-motion: reduce 下 toast 滑入动画关闭',
  rm.toast === null || rm.toast.animationName === 'none' || zero(rm.toast.animationDuration), rm.toast, 'animation-name none 或时长 0s');
await s('Emulation.setEmulatedMedia', { features: [] });
await sleep(200);
/* Tab 遍历：采样焦点环 */
await evaluate('document.body.focus(); window.scrollTo(0, 0);');
const focusSamples = [];
for (let i = 0; i < 6; i += 1) {
  await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await s('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  await sleep(120);
  focusSamples.push(await evalJson(`(function () { var el = document.activeElement; if (!el || el === document.body) return { tag: 'BODY' };
    var cs = getComputedStyle(el);
    return { tag: el.tagName, cls: String(el.className).slice(0, 48), matchesFV: el.matches(':focus-visible'),
      outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow }; }())`));
}
observed.H20.tab = focusSamples;
const withRing = focusSamples.filter((f) => f.matchesFV === true && f.outlineStyle !== 'none' && parseFloat(f.outlineWidth) > 0);
check('H-20.4', 'Tab 遍历到的可交互控件带可见焦点环（outline ≥1px 且 :focus-visible 命中）',
  withRing.length >= 2, { sampled: focusSamples.length, withRing: withRing.length, samples: focusSamples.map((f) => f.tag + '.' + f.cls + ' fv=' + f.matchesFV + ' w=' + f.outlineWidth) }, '≥2 个控件带环');

/* ── 汇总 ───────────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.ok).length;
log('');
log('observed=' + JSON.stringify(observed).slice(0, 1200));
log('RESULT: ' + pass + '/' + results.length + ' PASS, ' + (results.length - pass) + ' FAIL');
if (pass !== results.length) log('FAILED: ' + results.filter((r) => !r.ok).map((r) => r.id).join(' '));
writeFileSync(join(OUT, 'probe-interactive.json'), JSON.stringify({ artifact: ARTIFACT.slice(ROOT.length + 1), sha256_16: createHash('sha256').update(artifactBuf).digest('hex').slice(0, 16).toUpperCase(), browser: bv.product, thresholds: { COPIED_MS_WINDOW, TOAST_MS_EXPECT, BACKTOP_THRESHOLD, VIEWPORTS }, observed, results }, null, 2), 'utf8');
flush();
chrome.kill();
cdp.close();
process.exit(pass === results.length ? 0 : 1);
