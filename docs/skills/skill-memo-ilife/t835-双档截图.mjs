#!/usr/bin/env node
/** #835 · 终审双档截图器（零第三方依赖：headless Chrome ＋ CDP）。
 *
 * 票面第 1 步原话：「`vision_html_screenshot` 逐页出 **390×844** 与 **1280×900** 两张（看细节用
 * `vision_crop`，原图像素框）。**必须两端都看。**」
 *
 * 本件是那一档的批量执行体：逐页 × 两档各出一张**整页**截图（`clip` 到文档全高，
 * 与 `vision_html_screenshot --fullPage` 同一形状），落进 `.dsh-vision-router/artifacts/`。
 * 为什么不调 68 次 `vision_html_screenshot`：票面同时写着「已知工具风险」——复核一次即止、
 * 坏了改走「自写零依赖 CDP 截图器」；一次起浏览器出 68 张，比 68 次起工具可控，且读数逐张可复算。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t835-双档截图.mjs --pages <页群目录> [--out <目录>] [--widths 390,1280]
 * 读数：末行 `RESULT:`；逐张一行（页名／档宽／文档高／字节）。任一页任一档没出图即 exit 1。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PAGES = resolve(argOf('--pages', 'packages/skill-memo-ilife/.scratch/t834/源'));
const OUT = resolve(argOf('--out', '.dsh-vision-router/artifacts'));
/** 票面两档：手机 390×844 ／ 桌面 1280×900（「格」＝该档视口宽 ；高只定可视区，整页截图照文档高）。 */
const SPEC = Object.freeze([
  { width: 390, height: 844, tag: '390x844' },
  { width: 1280, height: 900, tag: '1280x900' },
]);
const WIDTHS = argOf('--widths', '').split(',').filter(Boolean).map(Number);
const shots = WIDTHS.length > 0 ? SPEC.filter((s) => WIDTHS.includes(s.width)) : SPEC;
if (shots.length === 0) { console.error('--widths 没匹配上 390／1280'); process.exit(2); }

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
const PORT = 9701 + (process.pid % 280);
const profile = mkdtempSync(join(tmpdir(), 't835-shot-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function devtoolsUrl() {
  for (let waited = 0; waited < 30000; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* not ready */ }
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

const devUrl = await devtoolsUrl();
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
    const out = join(OUT, `t835-${stem}-${tag}-fullpage.png`);
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

const report = join(OUT, 't835-双档截图读数.json');
writeFileSync(report, JSON.stringify({ at: new Date().toISOString(), pages: PAGES, out: OUT, shots, rows }, null, 1), 'utf8');
cdp.close();
chrome.kill();
console.log(`RESULT: ${pages.length} 页 × ${shots.length} 档 = ${rows.length} 张；空页 ${bad}；读数 ${report}`);
process.exit(bad === 0 && rows.length === pages.length * shots.length ? 0 : 1);
