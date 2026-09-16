// #512 · 折线轴标签四档实渲读数（CDP 实测，非算式）＋ 390 档不退化。
//
// 用法（口径同票面验收 ②③）：
//   node docs/base/base-render/t512-轴标签-读数.mjs 512 820 1000 1440
//   node docs/base/base-render/t512-轴标签-读数.mjs 390
//
// 量法：无头 Chrome ＋ CDP。样张页由本包 dist 现场拼出（折线 9 点，labels:'all' 出 9 条横轴标签，
// yTicks:5 出纵轴刻度；卡片几何照产品页：页边 16px／≥721px 后 20px，卡居中上限 960，画布左右各 15px）。
// 每档读：svg 盒宽（getBoundingClientRect，实测）＋ 轴标签 computed font-size（用户单位）＋
// 正文参照 15px；实渲像素 ＝ 用户单位 × 盒宽 ÷ viewBox 宽（580，实测 viewBox）；出片 PNG 同步落盘。
//
// 判据：
//   ② 给出 512／820／1000／1440 四档时：512 ≤ 820 ≤ 1000 ≤ 1440 且四档均 ≥ 15px，否则 exit 1。
//   ③ 给出 390 时：9 条横轴标签两两间距 ≥ 0 且不顶出 viewBox 左右沿，否则 exit 1。
// 退出码：全 PASS→0；任一 FAIL→1；读不到读数（Chrome 缺失／页面报错）→2。

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { charts, chartsCss } from '../../../packages/base-render/dist/charts.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const OUT = join(ROOT, '.scratch/t512-wavec');
const SHOTS = join(OUT, 'shots');

const widths = process.argv.slice(2).map(Number).filter((w) => Number.isFinite(w) && w > 0);
if (widths.length === 0) {
  console.error('用法：node docs/base/base-render/t512-轴标签-读数.mjs 512 820 1000 1440');
  process.exit(2);
}

/* ── 样张页（dist 现场拼，不读任何技能代码） ── */
const ITEMS = [
  { label: '09-01', value: 70.5 }, { label: '09-02', value: 71 },
  { label: '09-03', value: 70.2 }, { label: '09-04', value: 69.8 },
  { label: '09-05', value: 70.1 }, { label: '09-06', value: 70.9 },
  { label: '09-07', value: 71.2 }, { label: '09-08', value: 70.4 },
  { label: '09-09', value: 70.7 },
];
const line = charts.line({ items: ITEMS, options: { labels: 'all', yTicks: 5, showValues: false, grid: true } }).html;
const PAGE = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<style>html,body{margin:0;padding:0;background:#fff}'
  + '.page{padding:0 16px}'
  + '@media (min-width:721px){.page{padding:0 20px}}'
  + '.card{max-width:960px;margin:0 auto}'
  + '.canvas{padding:0 15px}'
  + '#bodyref{font-size:15px;margin:0 0 8px}'
  + chartsCss('ilife-')
  + '</style></head><body><div class="page"><div class="card">'
  + '<p id="bodyref">正文参照</p><div class="canvas">' + line + '</div>'
  + '</div></div></body></html>';
mkdirSync(SHOTS, { recursive: true });
const PAGE_PATH = join(OUT, 'fixture-t512.html');
writeFileSync(PAGE_PATH, PAGE, 'utf8');
const PAGE_URL = 'file:///' + PAGE_PATH.replace(/\\/g, '/');

const CHROME = [
  process.env.CHROME_PATH ?? '',
  process.env.DSH_BROWSER ?? '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (CHROME === undefined) { console.error('读不到读数：找不到 Chrome（可用 CHROME_PATH 指定）'); process.exit(2); }

/* ── CDP 会话（口径沿用 .scratch/t512-recheck/复量.mjs） ── */
const PORT = 9921 + (process.pid % 60);
const profile = join(OUT, '_profile-' + String(process.pid));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--allow-file-access-from-files', '--remote-debugging-port=' + String(PORT),
  '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
async function devtoolsUrl() {
  for (let i = 0; i < 160; i += 1) {
    try {
      const r = await fetch('http://127.0.0.1:' + String(PORT) + '/json/version');
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* 未就绪 */ }
    await sleep(250);
  }
  return null;
}
const wsUrl = await devtoolsUrl();
if (wsUrl === null) { chrome.kill(); console.error('读不到读数：Chrome 调试端口未就绪'); process.exit(2); }
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
  }
});
await new Promise((res) => ws.addEventListener('open', () => res()));
const raw = (method, params, sessionId) => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
  });
};
const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
const send = (m, p) => raw(m, p, sessionId);
await send('Page.enable'); await send('Runtime.enable');
const evalJson = async (expr) => {
  const r = await send('Runtime.evaluate', {
    expression: '(async function () { return JSON.stringify(await (' + expr + ')); }())',
    returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? JSON.parse(r.result.value) : undefined;
};

const EXPR = `(function () {
  var round = function (v) { return Math.round(v * 100) / 100; };
  var svg = document.querySelector('.ilife-charts-line .ilife-charts-svg');
  if (svg === null) return { error: 'no-line-svg' };
  var sr = svg.getBoundingClientRect();
  var vb = (svg.getAttribute('viewBox') || '').trim().split(/\\s+/).map(Number);
  var ticks = svg.querySelectorAll('.ilife-charts-tick');
  var tickPx = ticks.length ? parseFloat(getComputedStyle(ticks[0]).fontSize) : NaN;
  var bodyPx = parseFloat(getComputedStyle(document.getElementById('bodyref')).fontSize);
  var xls = Array.prototype.map.call(svg.querySelectorAll('.ilife-charts-xlabel'), function (e) {
    var b = e.getBoundingClientRect();
    return { l: round(b.left), r: round(b.right), cx: round((b.left + b.right) / 2), w: round(b.width) };
  });
  return {
    boxW: round(sr.width), boxL: round(sr.left), boxR: round(sr.right),
    vbW: vb[2], tickUnits: tickPx, bodyPx: bodyPx,
    tickN: ticks.length, xlabelN: xls.length, xlabels: xls,
  };
}())`;

const rows = [];
let fail = 0;
for (const w of widths) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE_URL });
  for (let i = 0; i < 200; i += 1) {
    if (await evalJson('document.readyState') === 'complete') break;
    await sleep(50);
  }
  await sleep(300);
  let d;
  try {
    d = await evalJson(EXPR);
  } catch (e) {
    console.error('读不到读数 @' + w + '：' + String(e).slice(0, 200));
    process.exit(2);
  }
  if (d.error) { console.error('读不到读数 @' + w + '：' + d.error); process.exit(2); }
  const scale = d.boxW / d.vbW;
  const rendered = d.tickUnits * scale;
  let verdict = 'PASS';
  let note = '';
  if (!(d.bodyPx === 15)) { verdict = 'FAIL'; note += '正文参照=' + d.bodyPx + 'px非15;'; }
  if (widths.length === 4 || !widths.includes(390)) {
    if (!(rendered >= 15)) { verdict = 'FAIL'; note += '实渲<15px;'; }
  }
  if (w === 390) {
    if (d.xlabelN !== 9) { verdict = 'FAIL'; note += '横轴标签=' + d.xlabelN + '非9;'; }
    const xs = d.xlabels.slice().sort((a, b) => a.cx - b.cx);
    let minGap = Infinity;
    for (let i = 1; i < xs.length; i += 1) minGap = Math.min(minGap, xs[i].l - xs[i - 1].r);
    let inside = true;
    for (const x of xs) {
      if (x.l < d.boxL - 0.5 || x.r > d.boxR + 0.5) { inside = false; break; }
    }
    d.minGap = Math.round(minGap * 100) / 100;
    d.inside = inside;
    if (!(minGap >= 0)) { verdict = 'FAIL'; note += '相撞minGap=' + d.minGap + ';'; }
    if (!inside) { verdict = 'FAIL'; note += '顶出左右沿;'; }
  }
  if (verdict === 'FAIL') fail += 1;
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = join(SHOTS, 'shot-' + w + '.png');
  writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  const row = {
    vw: w, boxW: d.boxW, vbW: d.vbW, tickUnits: d.tickUnits,
    scale: Math.round(scale * 10000) / 10000, rendered: Math.round(rendered * 100) / 100,
    bodyPx: d.bodyPx, tickN: d.tickN, xlabelN: d.xlabelN,
    ...(w === 390 ? { minGap: d.minGap, inside: d.inside } : {}),
    shot: 'shots/shot-' + w + '.png', verdict, note,
  };
  rows.push(row);
  console.log('T512 vw=' + w + ' box=' + d.boxW + ' units=' + d.tickUnits
    + ' scale=' + row.scale + ' rendered=' + row.rendered + 'px body=' + d.bodyPx
    + (w === 390 ? ' xlabels=' + d.xlabelN + ' minGap=' + d.minGap + ' inside=' + d.inside : '')
    + ' -> ' + verdict + (note ? ' ' + note : ''));
}

/* 四档单调判据（一次给了 512／820／1000／1440 才判） */
const need = [512, 820, 1000, 1440];
if (need.every((w) => widths.includes(w))) {
  const seq = need.map((w) => rows.find((r) => r.vw === w));
  for (let i = 1; i < seq.length; i += 1) {
    if (!(seq[i].rendered >= seq[i - 1].rendered - 1e-9)) {
      console.error('FAIL 单调：' + seq[i].vw + '档' + seq[i].rendered + 'px < '
        + seq[i - 1].vw + '档' + seq[i - 1].rendered + 'px');
      fail += 1;
    }
  }
  if (fail === 0) console.log('T512 四档单调不降且 ≥15px：PASS');
}

const outPath = join(OUT, '读数-' + widths.join('-') + '.json');
writeFileSync(outPath, JSON.stringify({ page: PAGE_PATH, rows }, null, 1) + '\n', 'utf8');
console.log('读数落 ' + outPath);
chrome.kill(); ws.close();
process.exit(fail === 0 ? 0 : 1);
