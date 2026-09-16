#!/usr/bin/env node
/** #619 · 场景02验收墙**当刻产物截图件**（本票入仓的可复跑脚本；只读墙产物、只写本票草稿目录的 PNG）。
 *
 *  为什么要有这一件：负责人要亲手打开 HTML 看样式；截图是「当刻产物长什么样」的旁证，也是抽检用的图。
 *  浏览器与 CDP 口径抄 `packages/skill-calorie/scripts/measure-responsive.mjs`（headless Chrome ＋
 *  `Emulation.setDeviceMetricsOverride` ＋ `Page.captureScreenshot`），不走第三方依赖。
 *
 *  两趟：
 *    ① 整页档（`captureBeyondViewport`，页高上限 9000px）：四处复验页 × 三档（1440／834／390）＋墙 4 件 1440；
 *    ② 首屏档（视口图）：两张墙＋总索引＋链路总表＋看营养分析＋看每日六因素 ×（1440×900／390×844）。
 *
 *  跑法：node docs/skills/skill-calorie/t619-截图.mjs [--out .scratch/t619/shots2]
 *  末行 `SHOTS-OK n=<张数> dir=<目录>`；缺浏览器即 exit 2（不静默变绿）。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const WALL = join(ROOT, 'docs', 'skills', 'skill-calorie', 'scene02-验收墙');
const argOf = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const OUT = resolve(argOf('--out', join('.scratch', 't619', 'shots2')));
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 整页档：四处复验面 ＋ 墙 4 件。 */
const FULL = [
  ['F1-看营养分析', '看营养分析.html', [1440, 834, 390]],
  ['F2-看每日六因素', '看每日六因素.html', [1440, 834, 390]],
  ['F3-拍营养表记一餐', '拍营养表记一餐.html', [1440, 834, 390]],
  ['F3b-拍营养表补记一餐', '拍营养表补记一餐.html', [1440]],
  ['F4-看本周饮食', '看本周饮食.html', [1440, 834, 390]],
  ['F4b-看上周饮食', '看上周饮食.html', [1440, 834, 390]],
  ['D2-看今日营养', '看今日营养.html', [1440, 390]],
  ['W-桌面墙', '桌面墙-1280.html', [1440]],
  ['W-手机墙', '手机墙-390.html', [1440]],
  ['W-总索引', '总索引.html', [1440]],
  ['W-链路总表', '链路总表.html', [1440]],
];
/** 首屏档：一眼看排布的那几张（整页图在 1440 宽下会缩到看不清）。 */
const FIRST_SCREEN = ['桌面墙-1280.html', '手机墙-390.html', '总索引.html', '链路总表.html', '看营养分析.html', '看每日六因素.html'];

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) { console.log('RESULT: ABORT exit=2 :: 未找到 Chrome／Edge（可用 DSH_BROWSER=<路径> 指定）'); process.exit(2); }

const PORT = 9811 + (process.pid % 300);
const profile = mkdtempSync(join(tmpdir(), 't619-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* 端口未就绪 */ }
    await sleep(250);
  }
  return null;
}
const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); console.log('RESULT: ABORT exit=2 :: CDP 未建立（端口 ' + PORT + '）'); process.exit(2); }
const ws = new WebSocket(devUrl);
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
await new Promise((res, rej) => { ws.addEventListener('open', () => res()); ws.addEventListener('error', () => rej(new Error('CDP 连接失败'))); });
const send = (method, params, sid) => {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify(sid === undefined ? { id, method, params } : { id, method, params, sessionId: sid }));
  });
};
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
const evaluate = async (expression) => {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result ? r.result.value : undefined;
};
await s('Page.enable');
await s('Runtime.enable');
mkdirSync(OUT, { recursive: true });

async function ready(file) {
  await s('Page.navigate', { url: pathToFileURL(join(WALL, file)).href });
  for (let i = 0; i < 80; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
  for (let i = 0; i < 40; i += 1) {
    if (await evaluate('Array.prototype.every.call(document.images, function (im) { return im.complete; })') === true) break;
    await sleep(50);
  }
  await sleep(150);
}

let n = 0;
const rows = [];
for (const [label, file, widths] of FULL) {
  const path = join(WALL, file);
  if (!existsSync(path)) { console.log('SHOTS-FAIL 缺件 ' + file); continue; }
  const sha = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
  for (const w of widths) {
    const h = w === 390 ? 844 : (w === 834 ? 1112 : 900);
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await ready(file);
    const size = await evaluate('({ h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth })');
    const r = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: Math.min(size.h, 9000), scale: 1 } });
    const out = join(OUT, label + '-' + w + '.png');
    writeFileSync(out, Buffer.from(r.data, 'base64'));
    n += 1;
    rows.push({ label, file, w, png: out, pageH: size.h, pageW: size.sw, innerW: size.iw, bytes: statSync(out).size, sha });
    console.log('SHOT ' + basename(out).padEnd(34) + ' 页高=' + String(size.h).padStart(6)
      + ' scrollW=' + String(size.sw).padStart(5) + ' innerW=' + String(size.iw).padStart(5)
      + ' 溢出=' + (size.sw - size.iw) + ' 产物sha=' + sha);
  }
}
for (const file of FIRST_SCREEN) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await ready(file);
    const r = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const out = join(OUT, file.replace('.html', '') + '-首屏' + w + '.png');
    writeFileSync(out, Buffer.from(r.data, 'base64'));
    n += 1;
    rows.push({ label: file.replace('.html', '') + '-首屏', file, w, png: out, bytes: statSync(out).size });
    console.log('VP ' + basename(out).padEnd(32) + ' ' + w + '×' + h + ' bytes=' + statSync(out).size);
  }
}
ws.close();
chrome.kill();
for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ at: new Date().toISOString(), rows }, null, 2) + '\n', 'utf8');
console.log('SHOTS-OK n=' + n + ' dir=' + OUT);
