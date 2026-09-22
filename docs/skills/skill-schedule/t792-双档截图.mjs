#!/usr/bin/env node
/** #792 · 作息域终审双档截图器（零第三方依赖：headless Chrome ＋ CDP）。
 *
 *  口径出处：`docs/skills/skill-memo-ilife/t835-视觉终审.md` §三（逐页整页截图，`clip` 到文档全高，
 *  与 `vision_html_screenshot --fullPage` 同形状）。本件照那一件的形状写，只改两处域参数：
 *    · 档位＝**390×844 与 1440×900**（1440 是判分引擎的判据最宽档，`CRITERION_WIDTHS` 的第三档）；
 *    · 落点与命名带 `t792-` 前缀，避免与 t835 那一批混在一起。
 *  为什么批量出图而不逐页调 `vision_html_screenshot`：与 t835 同一理由（一次起浏览器出 122 张，
 *  比 122 次起工具可控，且逐张读数可复算）。
 *
 *  用法（仓根）：
 *    node docs/skills/skill-schedule/t792-双档截图.mjs --pages <页群目录> --out <落点目录> [--widths 390,1440]
 *  读数：逐张一行（页名／档宽／文档高／字节）＋末行 `RESULT:`；任一页任一档没出图即 exit 1。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PAGES = resolve(argOf('--pages', '.scratch/t792/产物'));
const OUT = resolve(argOf('--out', '.dsh-vision-router/artifacts/t792'));
/** 双档：手机 390×844 ／ 桌面 1440×900（「档」＝该档视口宽，高只定可视区，整页截图照文档高）。 */
const SPEC = Object.freeze([
  { width: 390, height: 844, tag: '390x844' },
  { width: 1440, height: 900, tag: '1440x900' },
]);
const WIDTHS = argOf('--widths', '').split(',').filter(Boolean).map(Number);
const shots = WIDTHS.length > 0 ? SPEC.filter((s) => WIDTHS.includes(s.width)) : SPEC;
if (shots.length === 0) { console.error('--widths 没匹配上 390／1440'); process.exit(2); }

const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) { console.error('ABORT: no browser'); process.exit(2); }
if (!existsSync(PAGES)) { console.error('页群目录不存在：' + PAGES); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const pages = readdirSync(PAGES).filter((f) => f.endsWith('.html')).sort();
if (pages.length === 0) { console.error('页群目录里没有 .html'); process.exit(2); }

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
/* 端口走临时端口（`--remote-debugging-port=0`）＋ 从 `DevToolsActivePort` 读回：
 * 固定 pid 派生端口在同机并发另一只 Chrome 时会互踩（`t516-判据-版式.mjs` 件头记过这个坑）。 */
const profile = mkdtempSync(join(tmpdir(), 't792-shot-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=0', '--user-data-dir=' + profile,
  '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsPort() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const line = (await import('node:fs')).readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim();
      if (/^\d+$/.test(line) && Number(line) > 0) return Number(line);
    } catch { /* 端口文件还没写出来 */ }
    await sleep(250);
  }
  return 0;
}
async function devtoolsUrl(port) {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (r.ok) { const v = await r.json(); if (v.webSocketDebuggerUrl) return v.webSocketDebuggerUrl; }
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
    ws.addEventListener('error', () => reject(new Error('CDP ws failed')));
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

const port = await devtoolsPort();
if (port === 0) { chrome.kill(); console.error('ABORT: 等不到调试端口'); process.exit(2); }
const devUrl = await devtoolsUrl(port);
if (devUrl === null) { chrome.kill(); console.error('ABORT: CDP not ready'); process.exit(2); }
const cdp = connect(devUrl);
await cdp.ready;
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => cdp.send(m, p, sessionId);
await s('Page.enable');
await s('Runtime.enable');

const rows = [];
let bad = 0;
for (const file of pages) {
  const stem = file.replace(/\.html$/, '');
  for (const { width, height, tag } of shots) {
    await s('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: width <= 640,
    });
    await s('Page.navigate', { url: pathToFileURL(join(PAGES, file)).href });
    await sleep(1200);
    const metrics = await s('Page.getLayoutMetrics');
    const css = metrics.cssContentSize || metrics.contentSize;
    const fullH = Math.ceil(css.height);
    const fullW = Math.ceil(css.width);
    const shot = await s('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: Math.max(height, fullH), scale: 1 },
    });
    const out = join(OUT, `t792-${stem}-${tag}.png`);
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    const probe = await s('Runtime.evaluate', {
      returnByValue: true,
      expression: '({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})',
    });
    const v = probe.result.value;
    const overflow = v.scrollWidth - v.innerWidth;
    rows.push({
      file, stem, tag, width, height, fullWidth: fullW, fullHeight: fullH,
      innerWidth: v.innerWidth, scrollWidth: v.scrollWidth, overflowPx: overflow,
      bytes: Buffer.from(shot.data, 'base64').length, out,
    });
    console.log(`SHOT ${stem} 【${tag}】 doc=${fullW}×${fullH} 溢出=${overflow}px 字节=${rows[rows.length - 1].bytes}`);
    if (rows[rows.length - 1].bytes < 2000) { bad += 1; console.error('   ↑ 图太小，疑似空页'); }
  }
}

const report = join(OUT, 't792-双档截图读数.json');
writeFileSync(report, JSON.stringify({ at: new Date().toISOString(), pages: PAGES, out: OUT, shots, rows }, null, 1), 'utf8');
cdp.close();
chrome.kill();
console.log(`RESULT: ${pages.length} 页 × ${shots.length} 档 = ${rows.length} 张；空页 ${bad}；读数 ${report}`);
process.exit(bad === 0 && rows.length === pages.length * shots.length ? 0 : 1);
