#!/usr/bin/env node
/** #525 · 触摸探针（真 Chrome ＋ CDP）：量每个可点元素的命中区，顺便量**字号下限**。
 *
 *  为什么入仓（`docs/agents/视觉验收墙.md` §5「生成器脚本：入仓」）：判据工具要能**重出**，
 *  只活在 `.scratch/` 的下一次用不上。
 *
 *  **同源副本**：这一份与 `.scratch/t525/touch-probe.mjs` 逐字同源（同一份逻辑两条路径），
 *  入仓这份是**唯一权威**——`.scratch/` 那份是工作草稿，改了逻辑以本件为准、草稿跟着重抄。
 *
 *  判据（写清，免得各人一把尺）：可点元素 = `a[href]／button／input／select／textarea／
 *  `[role=button]／summary`，且当刻有面积、`visibility` 非 hidden、`opacity` 非 0、不带 `disabled`。
 *  命中区 = 那个矩形的 w×h，**两者都要 ≥44**（用户裁定「触摸区 ≥44×44」，全宽档口径）。
 *  字号下限：只数**有直接文本节点**的元素（排除 svg 与 svg 内的件）。
 *
 *  用法（在仓根跑）：
 *    node docs/skills/skill-calorie/t525-触摸探针.mjs --dir <目录> [--widths 390,768,1440] [--json <out>] [--min 44]
 *  退出码：0＝全部达标；1＝有命中；2＝缺浏览器／没有输入件。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const DIR = resolve(argOf('--dir', '.'));
const JSON_OUT = argOf('--json', '');
const WIDTHS = argOf('--widths', '390,768,1440').split(',').filter((s) => s !== '').map(Number);
const MIN = Number(argOf('--min', '44'));
const PORT = 9333 + (process.pid % 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
if (BROWSER === undefined) { console.log('RESULT: ABORT 缺浏览器（可用 DSH_BROWSER 指一个）'); process.exit(2); }

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(DIR, f));
if (files.length === 0) { console.log('RESULT: ABORT 目录里没有 .html :: ' + DIR); process.exit(2); }

const profile = mkdtempSync(join(tmpdir(), 't525-cdp-'));
const chrome = spawn(BROWSER, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
{ stdio: 'ignore' });

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
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP WebSocket 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}
async function devtoolsUrl() {
  for (let w = 0; w < 20000; w += 250) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) return (await r.json()).webSocketDebuggerUrl; } catch { /* 端口未就绪 */ }
    await sleep(250);
  }
  return null;
}

const PROBE = `(function () {
  var SEL = 'a[href],button,input,select,textarea,[role=button],summary';
  var out = [];
  var els = document.querySelectorAll(SEL);
  for (var i = 0; i < els.length; i += 1) {
    var el = els[i];
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (el.disabled === true) continue;
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || ''), w: Math.round(r.width),
      h: Math.round(r.height), text: String(el.textContent || '').trim().slice(0, 18) });
  }
  var fonts = [];
  var all = document.querySelectorAll('body *');
  for (var j = 0; j < all.length; j += 1) {
    var e2 = all[j];
    if (e2.tagName.toLowerCase() === 'svg' || e2.closest('svg') !== null) continue;
    var own = '';
    for (var k = 0; k < e2.childNodes.length; k += 1) {
      if (e2.childNodes[k].nodeType === 3) own += e2.childNodes[k].nodeValue;
    }
    if (own.trim() === '') continue;
    var cs2 = getComputedStyle(e2);
    if (cs2.visibility === 'hidden' || cs2.display === 'none') continue;
    var px = parseFloat(cs2.fontSize);
    if (!isFinite(px)) continue;
    fonts.push({ tag: e2.tagName.toLowerCase(), cls: String(e2.className || '').slice(0, 44), px: px,
      text: own.trim().slice(0, 14) });
  }
  fonts.sort(function (a, b) { return a.px - b.px; });
  return { click: out, minFontPx: fonts.length === 0 ? null : fonts[0].px, minFontOwner: fonts.slice(0, 3) };
})()`;

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); console.log('RESULT: ABORT CDP 未建立（端口 ' + PORT + '）'); process.exit(2); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
async function evaluate(expression) {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result ? r.result.value : undefined;
}
await s('Page.enable');
await s('Runtime.enable');

console.log('# 触摸与字号读数 dir=' + DIR + ' widths=' + WIDTHS.join('/') + ' min=' + MIN + 'px browser=' + BROWSER);
const rows = [];
let totalSmall = 0;
let worstFont = null;
for (const file of files) {
  const row = { name: basename(file), widths: {} };
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 80; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(150);
    const probe = await evaluate(PROBE);
    const small = probe.click.filter((e) => e.w < MIN || e.h < MIN);
    const byKind = {};
    for (const e of small) { const k = e.tag + '.' + e.cls.split(' ')[0]; byKind[k] = (byKind[k] || 0) + 1; }
    row.widths[width] = { clickable: probe.click.length, small: small.length, byKind,
      minFontPx: probe.minFontPx, minFontOwner: probe.minFontOwner, sample: small.slice(0, 4) };
    totalSmall += small.length;
    if (probe.minFontPx !== null && (worstFont === null || probe.minFontPx < worstFont.px)) {
      worstFont = { px: probe.minFontPx, file: basename(file), width };
    }
    console.log(String(width).padStart(4) + '  ' + String(probe.click.length).padStart(4) + ' 可点  <' + MIN
      + 'px 命中=' + String(small.length).padStart(4) + '  最小字号=' + probe.minFontPx + 'px  '
      + basename(file) + (small.length === 0 ? '' : '   ' + JSON.stringify(byKind)));
  }
  rows.push(row);
}
cdp.close();
chrome.kill();
if (JSON_OUT !== '') writeFileSync(JSON_OUT, JSON.stringify({ at: new Date().toISOString(), dir: DIR, widths: WIDTHS, min: MIN, rows }, null, 2) + '\n', 'utf8');
console.log('RESULT: touch pages=' + files.length + ' widths=' + WIDTHS.join('/') + ' small=' + totalSmall
  + ' minFontPx=' + (worstFont === null ? '-' : worstFont.px + '(' + worstFont.file + '@' + worstFont.width + ')')
  + ' ' + (totalSmall === 0 ? 'PASS 全部 ≥' + MIN + 'px' : 'FAIL'));
process.exit(totalSmall === 0 ? 0 : 1);
