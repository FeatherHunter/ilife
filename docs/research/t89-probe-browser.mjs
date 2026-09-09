/** #89（89b 视觉锁验收）· 取证链路探针 —— **能力自证**，不产出验收结论。
 *
 *  跑法（仓根）：
 *    node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-browser.mjs
 *    （必须经持锁包装器：本脚本读共享 dist 产物，他席变异构建窗口会污染读数。）
 *  退出码：0＝链路全部可用；1＝有探针项红；**2＝缺浏览器／缺 dist／CDP 起不来（链路不可用，绝不静默变绿）**。
 *
 *  探针回答四个问题（`docs/research/t89-evidence-plan.md` §3 的实跑依据）：
 *    P1 本机有没有可用的 Chrome／Edge，版本多少（`--version` ＋ CDP `Browser.getVersion`）。
 *    P2 CDP 能不能建（`Target.createTarget` ＋ `Target.attachToTarget` ＋ `Page.enable`）。
 *    P3 能不能对 `file://` 产物截图（`Page.captureScreenshot` 视口图 ＋ 元素级 clip 图），字节数多少。
 *    P4 能不能做**真手势**（`Input.dispatchMouseEvent`）＋ **剪贴板回读**（`navigator.clipboard.readText()`），
 *       并用**页面侧双计时器**（1ms 轮询 ＋ `MutationObserver`）取时序。
 *  另加 P5：**无浏览器时显式失败**——以 `T89_NO_BROWSER=1` 重跑本脚本自身，断言子进程 exit=2 且打印 `RESULT: ABORT`。
 *
 *  **底座**：启动参数集／等待条件／`die(2)` 口径／CDP 连接与断言范式**逐条沿用**
 *  `docs/research/t121-browser-evidence.mjs`（#121 已 22/22 通过的真机脚本），不另造框架、零第三方依赖。
 *  与之的关系：t121／t88 是**交叉校验底座**，本脚本是**B1 20 条**的能力自证入口。
 *
 *  产物：默认写 `.scratch/t89/evidence/`（不入库）；`--out <目录>` 可改（入库时指 `docs/research/t89-evidence/<runId>/B`）。
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
const OUT = resolve(ROOT, outArg > 0 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '.scratch/t89/evidence');
const HELP_ARTIFACT = resolve(ROOT, '.scratch/t89/help-file.html');

const transcript = [];
function log(line = '') { transcript.push(line); console.log(line); }
function flush() { try { writeFileSync(join(OUT, 'probe-browser.log'), transcript.join(LF) + LF, 'utf8'); } catch { /* 落盘失败不掩盖结论 */ } }
const results = [];
function check(id, name, ok, actual, expect) {
  results.push({ id, name, ok: ok === true });
  log('[ASSERT] ' + id + ' ' + name + ' → ' + (ok ? 'PASS' : 'FAIL') + '  实测=' + JSON.stringify(actual) + '  期望=' + JSON.stringify(expect));
  return ok === true;
}
function die(code, message) { log('RESULT: ABORT exit=' + code + ' :: ' + message); flush(); process.exit(code); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

mkdirSync(OUT, { recursive: true });

/* ── P1 找浏览器 ────────────────────────────────────────────────────────── */
/* 负样本开关：`T89_NO_BROWSER=1` 强制「无浏览器」路径（用于 P5 自证 exit=2，而不是靠本机恰好没装）。 */
const CANDIDATES = process.env.T89_NO_BROWSER === '1' ? [] : [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p));
const BROWSER = CANDIDATES[0];

log('# #89 取证链路探针（能力自证；**不是**验收结论）');
log('node=' + process.version + ' platform=' + process.platform + ' out=' + OUT);

/* P5 先跑（无浏览器路径必须先证明「会显式失败」）—— 只在未强制时做，避免自递归。 */
if (process.env.T89_NO_BROWSER !== '1') {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--out', join(OUT, 'nobrowser')], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, T89_NO_BROWSER: '1' }, timeout: 60000,
  });
  const sawAbort = ((r.stdout || '') + (r.stderr || '')).includes('RESULT: ABORT');
  check('P5', '无浏览器时显式失败（T89_NO_BROWSER=1 子进程 exit=2 ＋ RESULT: ABORT，不静默变绿）',
    r.status === 2 && sawAbort, { exit: r.status, abort: sawAbort, stderr: (r.stderr || '').slice(-160) }, { exit: 2, abort: true });
}

if (BROWSER === undefined) {
  die(2, '未找到 Chrome／Edge（候选：' + CANDIDATES.length + ' 个命中 0）→ 取证链路**不可用**；'
    + '用 DSH_BROWSER=<chrome 路径> 指定。本脚本绝不静默跳过浏览器断言。');
}
/* P1：浏览器可执行文件存在即可判；**版本以 CDP `Browser.getVersion` 为准**
 *  （Windows 上 `chrome --version` 会把请求转给已运行的实例并打印一句中文提示，既不可解析、还会打扰用户会话）。 */
check('P1', '找到浏览器可执行文件（版本见 P2 的 CDP product）', existsSync(BROWSER), BROWSER, '存在的路径');

/* ── P2 起 headless ＋ CDP ───────────────────────────────────────────────── */
const PORT = 9511 + (process.pid % 300);
const profile = join(OUT, '_profile');
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let i = 0; i < 120; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch { /* 端口未就绪 */ }
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
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口 ' + PORT + ' 未就绪 → 链路不可用。'); }
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
/* 同步／异步表达式通吃：包一层 async IIFE，配合 `awaitPromise: true` 拿到**已结算**的值再序列化。
 *  （踩过的坑：直接 `JSON.stringify(promise)` 得到 `{}` → 真手势断言恒 undefined 假红。） */
const evalJson = async (expr) => {
  const raw = await evaluate('(async function () { return JSON.stringify(await (' + expr + ')); }())');
  return raw === undefined ? undefined : JSON.parse(raw);
};

await s('Page.enable');
await s('Runtime.enable');
await s('DOM.enable');
const bv = await cdp.send('Browser.getVersion');
const browserVersion = String(bv.product || '') + ' / protocol ' + String(bv.protocolVersion || '');
check('P2', 'CDP 建连（Browser.getVersion ＋ Target.attach ＋ Page.enable）',
  typeof bv.product === 'string' && bv.product.length > 0, browserVersion, '非空 product');
await cdp.send('Browser.grantPermissions', { origin: 'file://', permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  .catch((e) => log('# WARN grantPermissions(file://) 失败：' + e.message + '（由 P4 结果裁决）'));

/* ── 夹具：用真实 HELP 产物；缺产物则现场渲染（仍只读产品） ──────────────── */
if (!existsSync(HELP_ARTIFACT)) {
  log('# 缺 .scratch/t89/help-file.html → 现场生成（只读产品 dist）');
  const dist = await import(pathToFileURL(join(ROOT, 'packages/base-render/dist/index.js')).href);
  const calorie = await import(pathToFileURL(join(ROOT, 'packages/skill-calorie/dist/render/index.js')).href);
  const built = calorie.renderHelpCenterHtml({ mode: 'file' });
  writeFileSync(HELP_ARTIFACT, built.html, 'utf8');
  log('# 生成来源 renderHelpCenterHtml(mode=file) bytes=' + Buffer.byteLength(built.html, 'utf8') + ' css=' + dist.buildStyleSheet().css.length);
}
const artifactBytes = readFileSync(HELP_ARTIFACT).length;
const artifactSha = createHash('sha256').update(readFileSync(HELP_ARTIFACT)).digest('hex').slice(0, 16).toUpperCase();

async function open(url) {
  await s('Page.navigate', { url: pathToFileURL(url).href });
  await cdp.send('Target.activateTarget', { targetId });
  await s('Page.bringToFront').catch(() => {});
  for (let i = 0; i < 200; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
  await sleep(300);
}

/* ── P3 file:// 截图 ────────────────────────────────────────────────────── */
await open(HELP_ARTIFACT);
const shot = await s('Page.captureScreenshot', { format: 'png' });
const shotBuf = Buffer.from(shot.data, 'base64');
const SHOT = join(OUT, 'probe-viewport.png');
writeFileSync(SHOT, shotBuf);
check('P3a', 'file:// 产物视口截图（PNG 字节 > 0）', shotBuf.length > 1000,
  { bytes: shotBuf.length, file: SHOT.slice(ROOT.length + 1).replace(/\\/g, '/') }, '>1000 B');

/* 元素级截图（验收最常用的证据形态：单条尺子对一个元素） */
const rect = await evalJson(`(function () {
  var el = document.querySelector('.ilife-help-shell-hero') || document.body.firstElementChild;
  el.scrollIntoView({ block: 'start' });
  var r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}())`);
const elShot = await s('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.w, height: rect.h, scale: 1 } });
const elBuf = Buffer.from(elShot.data, 'base64');
const ELSHOT = join(OUT, 'probe-element-hero.png');
writeFileSync(ELSHOT, elBuf);
check('P3b', '元素级 clip 截图（H-01…H-11 的逐条截图证据形态）', elBuf.length > 500,
  { bytes: elBuf.length, rect, file: ELSHOT.slice(ROOT.length + 1).replace(/\\/g, '/') }, '>500 B');

/* ── P4 真手势 ＋ 剪贴板回读 ＋ 双计时器 ────────────────────────────────── */
const COPY_SEL = '.ilife-help-shell-card-copy, .ilife-help-shell-btn, .ilife-copy-btn';
const hasCopy = await evaluate(`document.querySelectorAll(${JSON.stringify(COPY_SEL)}).length`);
check('P4a', '产物里存在可点击的复制按钮（helpers 运行时注入后）', hasCopy > 0, hasCopy, '>0');

let gesture = null;
if (hasCopy > 0) {
  /* 装只读观测器：捕获阶段 click 时间戳 ＋ 目标按钮 class 的 MutationObserver ＋ 剪贴板文本记录。 */
  await evaluate(`(function () {
    var el = document.querySelector(${JSON.stringify(COPY_SEL)});
    el.scrollIntoView({ block: 'center' });
    window.__t89 = { t0: null, add: null, del: null, clipboard: null };
    el.addEventListener('click', function () { window.__t89.t0 = performance.now(); }, true);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i += 1) {
        var now = performance.now();
        if (muts[i].target.className.indexOf('copied') >= 0) { if (window.__t89.add === null) window.__t89.add = now; }
        else if (window.__t89.add !== null && window.__t89.del === null) { window.__t89.del = now; }
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
    return true;
  }())`);
  const r2 = await evalJson(`(function () {
    var el = document.querySelector(${JSON.stringify(COPY_SEL)});
    var b = el.getBoundingClientRect();
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), text: el.getAttribute('data-t') };
  }())`);
  await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: r2.x, y: r2.y, button: 'left', clickCount: 1 });
  await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r2.x, y: r2.y, button: 'left', clickCount: 1 });
  await sleep(1200);
  gesture = await evalJson(`(async function () {
    var t = window.__t89;
    var clip = null;
    try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'ERR:' + e.name; }
    return { clicked: t.t0 !== null, copiedAdded: t.add !== null, copiedMs: (t.add !== null && t.del !== null) ? Math.round((t.del - t.add) * 10) / 10 : null, clip: clip === null ? null : String(clip), expect: ${JSON.stringify(r2.text)} };
  }())`);
  check('P4b', '真手势命中（Input.dispatchMouseEvent 触发 click）', gesture.clicked === true, gesture.clicked, true);
  check('P4c', '页面侧 MutationObserver 观测到 copied 加/移除（双计时器之一）',
    gesture.copiedAdded === true, { copiedAdded: gesture.copiedAdded, copiedMs: gesture.copiedMs }, 'true（时长按 #121 口径 440–520ms）');
  /* **行尾归一**：Windows 剪贴板回读恒为 CRLF，而 `data-t` 原文是 LF——
   * 逐字比对前必须 `\r\n`→`\n` 归一，否则 H-16 的「剪贴板回读逐字相等」会**假红**
   *（#121 A8 的 CRLF 夹具瑕疵同一根因；口径写进 t89-evidence-plan.md §1 H-16）。 */
  const norm = (t) => (typeof t === 'string' ? t.replace(/\r\n/g, '\n') : t);
  const a = norm(gesture.clip);
  const b = norm(gesture.expect);
  let diff = -1;
  if (typeof a === 'string' && typeof b === 'string') {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) { if (a[i] !== b[i]) { diff = i; break; } }
  }
  check('P4d', '剪贴板回读逐字等于按钮 data-t（归一 CRLF 后）',
    typeof a === 'string' && typeof b === 'string' && a === b,
    {
      rawCrlf: typeof gesture.clip === 'string' && gesture.clip.indexOf('\r\n') >= 0,
      clipLen: typeof a === 'string' ? a.length : null, expectLen: typeof b === 'string' ? b.length : null,
      firstDiffAt: diff,
      clipAt: diff >= 0 ? JSON.stringify(a.slice(Math.max(0, diff - 24), diff + 24)) : null,
      expectAt: diff >= 0 ? JSON.stringify(b.slice(Math.max(0, diff - 24), diff + 24)) : null,
    },
    '归一后逐字相等');
  /* 视口切换能力（H-12 断点证据形态） */
  const vp = [];
  for (const w of [1440, 640, 400]) {
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(200);
    vp.push({ w, innerWidth: await evaluate('window.innerWidth') });
  }
  await s('Emulation.clearDeviceMetricsOverride');
  check('P4e', 'Emulation.setDeviceMetricsOverride 切视口（H-12 断点采样）',
    vp.every((v) => v.innerWidth === v.w), vp, 'innerWidth 逐档相等');
}

/* ── 汇总 ───────────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.ok).length;
log('');
log('browser=' + BROWSER);
log('browserVersion=' + browserVersion);
log('artifact=' + HELP_ARTIFACT.slice(ROOT.length + 1).replace(/\\/g, '/') + ' bytes=' + artifactBytes + ' sha256_16=' + artifactSha);
log('evidenceDir=' + OUT.slice(ROOT.length + 1).replace(/\\/g, '/'));
log('RESULT: ' + pass + '/' + results.length + ' PASS, ' + (results.length - pass) + ' FAIL');
if (pass !== results.length) { log('FAILED: ' + results.filter((r) => !r.ok).map((r) => r.id).join(' ')); }
flush();
chrome.kill();
cdp.close();
process.exit(pass === results.length ? 0 : 1);
