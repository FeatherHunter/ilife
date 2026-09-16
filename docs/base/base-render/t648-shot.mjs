#!/usr/bin/env node
/** t648 截图抽拍器（真浏览器、整页截图 ＋ 页高读数）：给「四档不裁」的人眼旁证与页高不涨的机器读数。
 *
 *  用法：node .scratch/t648/shot.mjs <页面目录> <输出目录> <页名,页名> <宽度,宽度>
 *  例：  node .scratch/t648/shot.mjs .scratch/t648/before .scratch/t648/shots-before 看营养结构,饮食复盘（本月） 390,1440
 *  产物：<输出目录>/<页名>-<宽>.png ＋ <输出目录>/heights.json（页高 ＋ 截图字节）
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [dirArg, outArg, namesArg, widthsArg] = process.argv.slice(2);
if (!dirArg || !outArg || !namesArg || !widthsArg) {
  console.log('用法：node .scratch/t648/shot.mjs <页面目录> <输出目录> <页名,页名> <宽度,宽度>');
  process.exit(2);
}
const DIR = resolve(dirArg);
const OUT = resolve(outArg);
const NAMES = namesArg.split(',');
const WIDTHS = widthsArg.split(',').map(Number);
mkdirSync(OUT, { recursive: true });

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) { console.log('ABORT 未找到 Chrome／Edge'); process.exit(2); }

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9711 + (process.pid % 200);
const profile = mkdtempSync(join(tmpdir(), 't648-shot-'));
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
    } catch { /* 未就绪 */ }
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
    ws.addEventListener('error', () => reject(new Error('CDP 连接失败')));
  });
  return { ready, send: (method, params, sessionId) => {
    const id = nextId++;
    return new Promise((res, reject) => {
      pending.set(id, { resolve: res, reject });
      ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
    });
  }, close: () => ws.close() };
}

const devUrl = await devtoolsUrl();
if (devUrl === null) { chrome.kill(); console.log('ABORT CDP 未就绪'); process.exit(2); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
const evaluate = async (expression) => {
  const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('evaluate 抛错 ' + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result ? r.result.value : undefined;
};
await s('Page.enable');
await s('Runtime.enable');

const rows = [];
for (const name of NAMES) {
  const file = join(DIR, name + '.html');
  if (!existsSync(file)) { console.log('SKIP 缺页：' + file); continue; }
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 80; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    const h = await evaluate('document.documentElement.scrollHeight');
    const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, optimizeForSpeed: false });
    const buf = Buffer.from(shot.data, 'base64');
    const out = join(OUT, name + '-' + width + '.png');
    writeFileSync(out, buf);
    rows.push({ page: name, width, pageHeight: h, png: basename(out), bytes: buf.length });
    console.log('SHOT ' + name.padEnd(14) + ' w=' + String(width).padStart(4) + ' pageHeight=' + String(h).padStart(5)
      + ' png=' + buf.length + ' → ' + out);
  }
}
writeFileSync(join(OUT, 'heights.json'), JSON.stringify({ at: new Date().toISOString(), source: DIR, rows }, null, 2) + '\n', 'utf8');
cdp.close();
chrome.kill();
for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
console.log('HEIGHTS-WROTE ' + join(OUT, 'heights.json'));
