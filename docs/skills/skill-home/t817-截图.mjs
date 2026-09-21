#!/usr/bin/env node
/** 收口 #817 · 双端截图（390／1280）：70 份产物各两档 ＋ 两张墙与索引首屏。
 *
 * 用途：vision 逐页复核（票面 ⑥）的输入 —— 评分席看的就是这些图；改与评分开，
 * 评分席只信重跑出来的产物，故本件每次对**当刻盘上的产物目录**重出图。
 *
 * 形状照 `docs/skills/skill-chef/t778-截图.mjs`（同一个「真 Chrome ＋ CDP」的做法，
 * 本件自带 `withBrowser`，不跨技能引别家文档目录的脚本）。
 *
 * 用法：node docs/skills/skill-home/t817-截图.mjs <产物目录> [截图目录]
 *   两档都出：`<序>-<页名>-390.png`／`-1280.png`（整页长图，判「双端不塌」）；
 *   `…-390v.png`／`-1280v.png`（首屏，尺寸＝墙格子 390×820／1280×860，判「墙上看的样子」）。
 * 退出码：0 全出；2 用法错或环境缺浏览器。
 */
import { mkdtempSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] ?? '.scratch/817');
const out = resolve(process.argv[3] ?? join(dir, 'shots'));
const VP_ONLY = process.argv.includes('--viewport-only');
const manifest = join(dir, 'manifest.json');
if (!existsSync(manifest)) { console.error('没有清单：' + manifest); process.exit(2); }
mkdirSync(out, { recursive: true });

const rows = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, '')).rows;

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
}

async function withBrowser(fn) {
  const browser = findBrowser();
  if (browser === undefined) return { error: '未找到 Chrome／Edge' };
  const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
  const port = 9800 + (process.pid % 150);
  const profile = mkdtempSync(join(tmpdir(), 't817-shot-'));
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-breakpad', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
    '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let waited = 0; waited < 30000; waited += 250) {
    try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) { wsUrl = (await r.json()).webSocketDebuggerUrl; break; } } catch { /* 未就绪 */ }
    await sleep(250);
  }
  if (wsUrl === null) { chrome.kill(); return { error: 'CDP 端口未就绪' }; }
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 1;
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
    }
  });
  await new Promise((res, rej) => { ws.addEventListener('open', () => res()); ws.addEventListener('error', () => rej(new Error('CDP 连接失败'))); });
  const send = (method, params, sessionId) => new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  try { return await fn({ s, sleep }); } finally {
    try { ws.close(); } catch { /* 已关 */ }
    chrome.kill();
    for (let i = 0; i < 8; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
  }
}

const jobs = [];
rows.forEach((r, i) => {
  const file = join(dir, r.file);
  if (!existsSync(file)) return;
  const seq = String(i + 1).padStart(2, '0');
  const stem = basename(r.file, '.html');
  for (const w of [390, 1280]) {
    if (!VP_ONLY) jobs.push({ name: seq + '-' + stem + '-' + w + '.png', file, w, h: 900, full: true });
    jobs.push({ name: seq + '-' + stem + '-' + w + 'v.png', file, w, h: w <= 500 ? 820 : 860, full: false });
  }
});
for (const [f, w] of [['手机墙-390.html', 1220], ['桌面墙-1280.html', 680], ['总索引.html', 1120], ['链路总览.html', 1120]]) {
  if (existsSync(join(dir, f))) jobs.push({ name: 'wall-' + basename(f, '.html') + '-' + w + '.png', file: join(dir, f), w, h: 1400, full: false });
}

const got = await withBrowser(async ({ s, sleep }) => {
  const made = [];
  for (const j of jobs) {
    await s('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h, deviceScaleFactor: 1, mobile: j.w < 768 });
    await s('Page.navigate', { url: pathToFileURL(j.file).href });
    for (let i = 0; i < 80; i += 1) {
      const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true });
      if (r.result && r.result.value === true) break;
      await sleep(50);
    }
    await sleep(140);
    const shot = await s('Page.captureScreenshot', j.full ? { format: 'png', captureBeyondViewport: true } : { format: 'png' });
    const p = join(out, j.name);
    writeFileSync(p, Buffer.from(shot.data, 'base64'));
    made.push({ name: j.name, bytes: statSync(p).size });
  }
  return made;
});
if (got.error !== undefined) { console.error('截图跳过：' + got.error); process.exit(2); }
const big = got.filter((x) => x.bytes > 2 * 1024 * 1024).length;
console.log('截图 ' + got.length + ' 张 -> ' + out + '（产物 ' + rows.length + ' 份 × 两档' + (VP_ONLY ? '首屏' : '整页＋首屏') + '；>2MB 的 ' + big + ' 张）');
