#!/usr/bin/env node
/** 居家管家 · 双端自适应与触摸目标判据件（票 #803）。
 *
 * 覆盖 `docs/agents/视觉验收墙.md` §0 机审六列里本图原来没人负责的两列：
 * 「双端自适应」与「触摸目标」。照 `.scratch/t351-preview/gen-scene09-wall.mjs`
 * 「把横向溢出读数挂在墙上」的先例：本件只出逐页机器读数，不替人判美丑。
 *
 * 量什么（390／1280 两档，缺省可改）：
 * ① 横向溢出像素＝`documentElement.scrollWidth − innerWidth`（版面事实）；
 * ② 最窄触控目标尺寸＝全部可点件（`a,button,input,select,textarea,summary,[role=button]`）
 *    里最短边的最小值（可点件为 0 的页记「无可点件」，不判红——照 t417「自造可点件为 0
 *    的页，本页不写 ≥44px 是对的」）；
 * ③ 横滚是否被藏＝`scrollWidth > clientWidth` 且 `overflow-x` 为 `hidden`／`clip` 的元素
 *    个数（悄悄裁掉的那一类，t161 G5 口径）＋ `auto`／`scroll` 的设计内横滑只报不计。
 *
 * 红判据＝任一档溢出＞0 或任一可点件短边＜44。藏匿只报告（`--fail-on-clip` 才进红：
 * 省略号截断等合法写法也会进 `clipped`，默认不当缺陷）。
 *
 * 视口说明：`Emulation.setDeviceMetricsOverride` 只覆写档宽，不碰 `mobile` 行为——
 * `mobile:true` 会让布局视口跟内容走（1200px 定宽块直接把 `innerWidth` 撑到 1208，
 * 溢出永远量成 0），故本件恒传 `mobile:false`：档宽即真值，内容溢出就是溢出。
 * 另：居家 21 张普通模板今天没有 `<meta name=viewport>`（HELP 分支的共享模板有），
 * 真手机上会按缺省 980 宽排——每页的 `vp有/vp无` 照打（只报告不进红，模板冻结在
 * 本票不许动，补 viewport 归票 2 契约）；`--fail-on-viewport` 是给未来收紧留的。
 *
 * 实现照 `packages/skill-calorie/scripts/measure-responsive.mjs` 的 harness：
 * 真浏览器（headless Chrome ＋ CDP `Emulation.setDeviceMetricsOverride`）＋ 零第三方依赖。
 * 缺浏览器即 exit 2，不静默变绿。
 *
 * 用法（仓根，经排队）：
 *   node tooling/run-locked.mjs --ticket 803 --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-responsive.mjs --dir <样例产物目录> [--widths 390,1280] [--json <路径>] [--fail-on-clip]
 * 退出码：0＝全绿；1＝有读数超标或有页面读不动；2＝用法错／缺浏览器。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const FAIL_ON_CLIP = process.argv.includes('--fail-on-clip');
const FAIL_ON_VIEWPORT = process.argv.includes('--fail-on-viewport');
const LABEL = argOf('--label', 'home-responsive');
const JSON_OUT = argOf('--json', '');
const TIMEOUT_MS = Number(argOf('--timeout', '30000'));
const WIDTHS = argOf('--widths', '390,1280').split(',').filter((s) => s !== '').map(Number);
const FLAGS = ['--dir', '--json', '--widths', '--timeout', '--label', '--fail-on-clip', '--fail-on-viewport'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));

function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

const dir = argOf('--dir', '');
let files = positional.map((p) => resolve(p));
if (dir !== '') {
  const d = resolve(dir);
  if (!existsSync(d) || !statSyncDir(d)) die(2, '--dir 不是目录 ' + dir);
  files = readdirSync(d).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(d, f));
}
function statSyncDir(d) {
  try { return readdirSync(d) !== null; } catch { return false; }
}
if (files.length === 0) die(2, '没有输入页面：给一组 HTML 路径，或用 --dir <目录>。');
if (WIDTHS.some((w) => !Number.isFinite(w) || w <= 0)) die(2, '--widths 非法：' + argOf('--widths', ''));
const gone = files.filter((f) => !existsSync(f));
if (gone.length > 0) die(2, '输入文件不存在 ' + gone.length + ' 件 → ' + gone.slice(0, 3).join('、'));

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：本件量的是真浏览器里的版面事实，静态 HTML 查不到。用 DSH_BROWSER=<路径> 指定。');

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9571 + (process.pid % 300);
const profile = mkdtempSync(join(tmpdir(), 'home-resp-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < TIMEOUT_MS; waited += 250) {
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
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')));
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

const PROBE = `(function () {
  var doc = document.documentElement;
  var blame = [], clipped = [], scrollers = [], taps = [];
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i += 1) {
    var el = els[i];
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1) blame.push({ tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 40), w: Math.round(r.width), right: Math.round(r.right) });
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      var rec = { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 40),
        cw: el.clientWidth, sw: el.scrollWidth, ox: cs.overflowX };
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') clipped.push(rec);
      else if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') scrollers.push(rec);
    }
  }
  var sel = document.querySelectorAll('a,button,input,select,textarea,summary,[role="button"]');
  for (var j = 0; j < sel.length; j += 1) {
    var t = sel[j];
    var tr = t.getBoundingClientRect();
    if (tr.width <= 0 || tr.height <= 0) continue;
    var st = getComputedStyle(t);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    taps.push({ tag: t.tagName.toLowerCase(), cls: String(t.className || '').slice(0, 40),
      w: Math.round(tr.width), h: Math.round(tr.height), side: Math.round(Math.min(tr.width, tr.height)) });
  }
  taps.sort(function (a, b) { return a.side - b.side; });
  var under = taps.filter(function (t) { return t.side < 44; });
  return { innerWidth: window.innerWidth, docScrollWidth: doc.scrollWidth,
    bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
    blame: blame.sort(function (a, b) { return b.right - a.right; }).slice(0, 3),
    clipped: clipped.slice(0, 4), clippedCount: clipped.length,
    scrollers: scrollers.slice(0, 4), scrollerCount: scrollers.length,
    tapTotal: taps.length, under44: under.length, under44List: under.slice(0, 5),
    minTouch: taps.length > 0 ? taps[0].side : null };
}())`;

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪（' + PORT + '）'); }
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
await s('Page.enable');
await s('Runtime.enable');

console.log('# 双端读数 label=' + LABEL + ' widths=' + WIDTHS.join('/') + ' browser=' + BROWSER
  + (FAIL_ON_CLIP ? ' fail-on-clip=开' : ' fail-on-clip=关（藏匿只报告不进红）'));
const rows = [];
let failed = 0;
function cleanup() {
  try { cdp.close(); } catch { /* 已断即不管 */ }
  try { chrome.kill(); } catch { /* 已退即不管 */ }
  for (let i = 0; i < 10; i += 1) {
    try { rmSync(profile, { recursive: true, force: true }); break; } catch { /* 删不掉由系统回收 */ }
  }
}
let exitCode = 0;
try {
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const name = basename(file);
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  const row = { name, bytes: Buffer.byteLength(html, 'utf8'), hasViewport, widths: {} };
  let bad = false;
  let unreadable = false;
  for (const width of WIDTHS) {
    let cell;
    try {
      /* mobile 恒 false：true 会让布局视口跟内容走（宽内容把 innerWidth 撑开），溢出量不到。 */
      await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await s('Page.navigate', { url: pathToFileURL(file).href });
      for (let i = 0; i < 80; i += 1) {
        if (await evaluate('document.readyState === "complete"') === true) break;
        await sleep(50);
      }
      await sleep(120);
      const probe = await evaluate(PROBE);
      const overflow = probe.docScrollWidth - probe.innerWidth;
      const vwOk = Math.abs(probe.innerWidth - width) <= 0.5;
      const hiddenScroll = probe.bodyScrollWidth > probe.innerWidth && overflow <= 0;
      const why = [overflow > 0 ? 'overflow+' + overflow : '',
        probe.under44 > 0 ? 'touch<' + probe.minTouch : '',
        FAIL_ON_CLIP && (probe.clippedCount > 0 || hiddenScroll) ? 'clip=' + probe.clippedCount : '',
        FAIL_ON_VIEWPORT && !vwOk ? 'viewport=' + probe.innerWidth + '≠' + width : '']
        .filter((x) => x !== '').join('｜');
      cell = { ...probe, overflow, hiddenScroll, vwOk, why, ok: why === '' };
    } catch (e) {
      unreadable = true;
      cell = { error: String(e.message).slice(0, 200), ok: false };
    }
    row.widths[width] = cell;
    if (!cell.ok) bad = true;
  }
  rows.push(row);
  if (bad) failed += 1;
  console.log('  ' + name.padEnd(44) + WIDTHS.map((w) => {
    const c = row.widths[w];
    if (c.error) return String(w).padStart(4) + '档:读不动';
    const touch = c.tapTotal === 0 ? '无可点件' : '最窄' + c.minTouch + 'px' + (c.under44 > 0 ? '(' + c.under44 + '件<44)' : '');
    const vw = c.vwOk ? '' : ' [视口未生效 iw=' + c.innerWidth + ']';
    return String(w).padStart(4) + '档:溢出' + (c.overflow > 0 ? '+' + c.overflow : '0').padStart(5)
      + ' ' + touch + ' 藏匿' + c.clippedCount + vw + (hasViewport ? '' : ' vp无') + (c.ok ? ' ✓' : ' ✗ ' + c.why);
  }).join('  ') + (unreadable ? '  [读不动]' : ''));
  for (const w of WIDTHS) {
    const c = row.widths[w];
    if (c.error || c.ok) continue;
    if (c.blame && c.blame.length > 0 && c.overflow > 0) console.log('      blame@' + w + ' ' + JSON.stringify(c.blame));
    if (c.under44List && c.under44List.length > 0) console.log('      touch@' + w + ' ' + JSON.stringify(c.under44List));
    if (c.clipped && c.clipped.length > 0) console.log('      clipped@' + w + ' ' + JSON.stringify(c.clipped));
  }
} /* end for files */
} catch (e) {
  console.log('ABORT-RUN :: ' + String((e && e.message) || e).slice(0, 300));
  exitCode = 1;
  rows.push({ name: '<run>', error: String((e && e.message) || e).slice(0, 300) });
  failed += 1;
} finally {
  cleanup();
}
if (JSON_OUT !== '') {
  const out = resolve(JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ label: LABEL, widths: WIDTHS, failOnClip: FAIL_ON_CLIP, failOnViewport: FAIL_ON_VIEWPORT, at: new Date().toISOString(), rows }, null, 2) + LF, 'utf8');
  console.log('JSON-WROTE ' + out);
}
const cells = rows.length * WIDTHS.length;
const okRows = rows.length - failed;
console.log('RESULT: ' + okRows + '/' + rows.length + ' cells=' + cells);
console.log(failed === 0 && exitCode === 0 ? 'PASS' : 'FAIL');
process.exit(failed === 0 && exitCode === 0 ? 0 : 1);
