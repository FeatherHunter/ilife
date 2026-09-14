#!/usr/bin/env node
/** #484 · 场景 09 响应式度量工具（三档视口横向溢出归零）——**本票的验收工具**。
 *
 * 量什么：在 390／768／1440 三档视口宽度下，逐件读 `document.documentElement.scrollWidth − window.innerWidth`；
 * 归零即 PASS：任一件任一档「溢出／图放不下／视口守卫」任一破即 exit 1；逐格标记走同一条判据，失败格印 `✗ ＋原因`。读数走真浏览器（headless Chrome ＋ CDP
 * `Emulation.setDeviceMetricsOverride`），不是静态 HTML 文本比对——横向溢出是版面事实。
 *
 * 用法（仓根，先 `pnpm build`）：
 *   node packages/skill-calorie/scripts/measure-responsive.mjs <a.html> <b.html> …   # 量一组现成页面
 *   node packages/skill-calorie/scripts/measure-responsive.mjs --dir <目录> --label after   # 量一目录的 .html
 *   node packages/skill-calorie/scripts/measure-responsive.mjs --seed --out <目录>   # 自造页（隔离临时库）再量
 *
 * 选项：`--widths 390,768,1440`（缺省三档）／`--json <文件>`（读数写 JSON）／`--label <名>`（写进表头与
 * JSON）／`--timeout <毫秒>`（等浏览器就绪，缺省 30000）／`--exclude <名片段,…>`（**范围外件**：本票写集外
 * 的页，读数照常逐档打印并进 JSON、只是不计入退出码——没有缺省的放宽，要放宽必须逐件写在命令行上）。
 *
 * 依赖（缺一即 exit 2，不静默变绿）：① 仓内 `pnpm build` 出过 `packages/skill-calorie/dist`（只有
 * `--seed` 才用得上）；② 本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）；③ Node ≥ 22
 * （内建 `WebSocket`／`fetch`）。**零第三方 npm 依赖。**
 *
 * 页种子（`--seed`，口径抄 `scripts/gen-photo-baseline.mjs` 的十页）：每页新鲜临时库，落 3 张**真 PNG**
 * （自带大尺寸 IHDR，天然像素 900×1200／1200×1600／2048×3072）——图不按天然像素渲出来才看得见溢出，
 * 故不能拿 1×1 占位图凑数（`#484` 取证口径）。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

const LF = String.fromCharCode(10);
const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DEFAULT_WIDTHS = [390, 768, 1440];
const DEFAULT_OUT = join(ROOT, '.scratch', 't484', 'pages');
const SOURCE = join(ROOT, 'packages', 'skill-calorie', 'dist');

/* ── 参数 ─────────────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const SEED = process.argv.includes('--seed');
const OUT_DIR = resolve(argOf('--out', DEFAULT_OUT));
const LABEL = argOf('--label', 'run');
const JSON_OUT = argOf('--json', '');
const TIMEOUT_MS = Number(argOf('--timeout', '30000'));
const WIDTHS = argOf('--widths', '').split(',').filter((s) => s !== '').map(Number);
if (WIDTHS.length === 0) WIDTHS.push(...DEFAULT_WIDTHS);
/** 范围外件（只对本票**写集外**的页生效，且必须逐件写在命令行上——没有缺省的放宽）：
 *  读数照常逐档打印、照常进 JSON（标 `inScope:false`），只是不计入退出码。 */
const EXCLUDE = argOf('--exclude', '').split(',').filter((s) => s !== '');
const FLAGS = ['--seed', '--out', '--label', '--json', '--timeout', '--widths', '--dir', '--exclude'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));

function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

/* ── 夹具：真大尺寸 PNG（IHDR 声明 900×1200 级；文件字节仍小，不触发 1 MiB 预算退让） ── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
/** 单色真彩 PNG（宽度／高度写进 IHDR，Chrome 按天然像素布局——溢出就是这么来的）。 */
function bigPng(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * stride;
    for (let x = 0; x < w; x += 1) {
      raw[row + 1 + x * 3] = rgb[0] + (x % 7);
      raw[row + 2 + x * 3] = rgb[1] + (y % 5);
      raw[row + 3 + x * 3] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 十页＋候选页（键＋参数；`photosDir` 每次新鲜）。 */
function pagesOf(photosDir, seedA) {
  return [
    { key: 'calorie.help.center', kind: 'read', params: { q: '记身材照' } },
    { key: 'calorie.photo.add', kind: 'write', params: { srcPaths: [seedA], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir } },
    { key: 'calorie.photo.compare', kind: 'read', params: { id1: 1, id2: 2, photosDir } },
    { key: 'calorie.photo.detail', kind: 'read', params: { id: 1, photosDir } },
    { key: 'calorie.photo.gif', kind: 'read', params: { tag: '正面', days: 36500, photosDir } },
    { key: 'calorie.photo.list', kind: 'read', params: { tag: '正面', today: '2026-09-06', photosDir } },
    { key: 'calorie.photo.remove', kind: 'write', params: { id: 3, photosDir } },
    { key: 'calorie.photo.tag', kind: 'write', params: { id: 1, op: 'add', tag: '晨起', photosDir } },
    { key: 'calorie.view.gif-planner', kind: 'read', params: { tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir } },
    { key: 'calorie.view.photo-log-wizard', kind: 'read', params: {} },
    { key: 'calorie.view.photo-picker', kind: 'read', params: { id: 2, photosDir } },
  ];
}

async function seedPages() {
  if (!existsSync(join(SOURCE, 'index.js'))) die(2, '缺 dist：' + SOURCE + '（先 pnpm build）');
  const { openDb } = await import(pathToFileURL(join(SOURCE, 'index.js')).href);
  const { addPhotos } = await import(pathToFileURL(join(SOURCE, 'photo', 'photos.js')).href);
  const { dispatch } = await import(pathToFileURL(join(SOURCE, 'cli', 'cmd_read.js')).href);
  const { dispatchWrite } = await import(pathToFileURL(join(SOURCE, 'cli', 'write.js')).href);
  process.env.CALORIE_TODAY = '2026-09-06';
  mkdirSync(OUT_DIR, { recursive: true });
  const made = [];
  for (const page of pagesOf('__PHOTOS__', '__A__')) {
    const root = mkdtempSync(join(tmpdir(), 't484-'));
    const photosDir = join(root, 'photos');
    mkdirSync(photosDir, { recursive: true });
    const sizes = [[900, 1200, [200, 180, 170]], [1200, 1600, [180, 200, 170]], [2048, 3072, [170, 180, 200]]];
    const srcs = sizes.map(([w, h, rgb], i) => {
      const p = join(root, 's' + (i + 1) + '.png');
      writeFileSync(p, bigPng(w, h, rgb));
      return p;
    });
    const db = openDb(join(root, 'calorie_data.db'));
    addPhotos(db, photosDir, { srcPaths: [srcs[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [srcs[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [srcs[2]], tag: '侧面', today: '2026-09-06', nowTime: '08:00:00' });
    const real = pagesOf(photosDir, srcs[0]).find((p) => p.key === page.key);
    try {
      const got = real.kind === 'write' ? dispatchWrite(real.key, real.params, db) : dispatch(real.key, real.params, db);
      const file = join(OUT_DIR, real.key + '.html');
      writeFileSync(file, got.html, 'utf8');
      made.push(file);
      console.log('SEEDED ' + real.key + ' bytes=' + Buffer.byteLength(got.html, 'utf8') + ' → ' + file);
    } finally {
      try { db.close(); } catch { /* 关不掉的临时库不掩盖结论 */ }
    }
  }
  return made;
}

/* ── 找浏览器（找不到即显式失败，不静默跳过） ───────────────────────────── */
const BROWSER = [process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：本票验收面是**真浏览器里的版面事实**，静态 HTML 查不到 → 实证缺失。用 DSH_BROWSER=<路径> 指定。');

/* ── 起 headless Chrome ＋ CDP ────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const PORT = 9511 + (process.pid % 300);
const profile = mkdtempSync(join(tmpdir(), 't484-profile-'));
const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
  '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
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

/** 页内读数：横向溢出＝`docScrollWidth − innerWidth`。四路取证：
 *  ① `blame`＝越出视口右边界的元素（最宽的 3 个）——
 *  ② `imgs`＝每张 `<img>` 的实际渲染宽 vs 所在容器内容宽（`fits:false` 即图被裁／要横滑才看得全）；
 *  ③ `clipped`＝`scrollWidth > clientWidth` 且 `overflow-x` 为 hidden／clip 的元素（**悄悄裁掉**的那一类）；
 *  ④ `scrollers`＝同类但 `overflow-x` 为 auto／scroll（表格／命令块的**设计内**横滑，只报不计）。
 *  判据只看 ①（doc 溢出归零）与 ②（图都放得下）：③④ 单独打印，好与既有版面比对。 */
const PROBE = `(function () {
  var doc = document.documentElement;
  var blame = [], imgs = [], clipped = [], scrollers = [];
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i += 1) {
    var el = els[i];
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var rec = { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 50),
      cw: el.clientWidth, sw: el.scrollWidth, ox: cs.overflowX };
    if (r.right > window.innerWidth + 1) blame.push({ tag: rec.tag, cls: rec.cls,
      w: Math.round(r.width), right: Math.round(r.right) });
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') clipped.push(rec);
      else if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') scrollers.push(rec);
    }
    if (rec.tag === 'img') {
      var box = el.parentElement ? el.parentElement.clientWidth : window.innerWidth;
      imgs.push({ w: Math.round(r.width), h: Math.round(r.height), box: box,
        fits: r.width <= box + 1 && r.right <= window.innerWidth + 1 });
    }
  }
  blame.sort(function (a, b) { return b.right - a.right; });
  return { innerWidth: window.innerWidth, docScrollWidth: doc.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth, images: document.images.length,
    blame: blame.slice(0, 3), imgs: imgs, clipped: clipped.slice(0, 4), clippedCount: clipped.length,
    scrollers: scrollers.slice(0, 4), scrollerCount: scrollers.length };
}())`;

/** 格判据（**唯一事实源**）：溢出／图放不下／视口守卫任一破即该格失败，返回人读原因（空串＝过）——计数与逐格标记都只走这里。 */
const cellWhy = (o, uf, got, want) => [o > 0 ? 'overflow+' + o : '', uf > 0 ? 'img-not-fit=' + uf : '',
  Math.abs(got - want) > 0.5 ? 'viewport=' + got + '≠' + want : ''].filter((s) => s !== '').join('｜');

const files = SEED ? await seedPages() : await (async () => {
  const dir = argOf('--dir', '');
  const fromDir = dir === '' ? [] : readdirSync(resolve(dir)).filter((f) => f.toLowerCase().endsWith('.html'))
    .map((f) => join(resolve(dir), f));
  return [...positional, ...fromDir].map((p) => resolve(p));
})();
if (files.length === 0) die(2, '没有输入页面：给一组 HTML 路径，或用 --dir <目录>／--seed。');

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

console.log('# 响应式读数 label=' + LABEL + ' widths=' + WIDTHS.join('/') + ' browser=' + BROWSER);
if (EXCLUDE.length > 0) {
  console.log('# SCOPE-OUT 范围外件（本票写集外，读数照打、不进判据）：' + EXCLUDE.join('、'));
}
const rows = [];
let failed = 0;
let outFailed = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const name = basename(file);
  const inScope = !EXCLUDE.some((x) => name.includes(x));
  const row = {
    file: file.slice(ROOT.length + 1).replace(/\\/g, '/'), name, inScope,
    bytes: Buffer.byteLength(html, 'utf8'), sha256: createHash('sha256').update(html).digest('hex'),
    images: (html.match(/<img /g) ?? []).length, widths: {},
  };
  for (const width of WIDTHS) {
    await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await s('Page.navigate', { url: pathToFileURL(file).href });
    for (let i = 0; i < 80; i += 1) {
      if (await evaluate('document.readyState === "complete"') === true) break;
      await sleep(50);
    }
    for (let i = 0; i < 40; i += 1) {
      if (await evaluate('Array.prototype.every.call(document.images, function (im) { return im.complete; })') === true) break;
      await sleep(50);
    }
    await sleep(120);
    const probe = await evaluate(PROBE);
    const overflow = probe.docScrollWidth - probe.innerWidth;
    const unfitted = probe.imgs.filter((im) => !im.fits).length;
    const why = cellWhy(overflow, unfitted, probe.innerWidth, width);
    row.widths[width] = { ...probe, overflow, unfitted, why, ok: why === '', bodyOverflow: probe.bodyScrollWidth - probe.innerWidth };
    if (why !== '') { if (inScope) failed += 1; else outFailed += 1; }
  }
  rows.push(row);
  const totalImgs = row.widths[WIDTHS[0]].imgs.length;
  const badImgs = WIDTHS.map((w) => row.widths[w].unfitted).reduce((a, b) => Math.max(a, b), 0);
  console.log('  ' + row.name.padEnd(40) + WIDTHS.map((w) => {
    const c = row.widths[w];
    return String(w).padStart(4) + '档:' + (c.overflow > 0 ? '+' + c.overflow : '0').padStart(7) + (c.ok ? ' ✓' : ' ✗ ' + c.why);
  }).join('  ') + '   img=' + row.images + '(' + (totalImgs - badImgs) + '/' + totalImgs + ' 放得下)'
    + ' clip=' + row.widths[WIDTHS[0]].clippedCount + ' bytes=' + row.bytes + (inScope ? '' : '  [范围外]'));
  for (const w of WIDTHS) {
    const c = row.widths[w];
    if (c.blame.length > 0 && c.overflow > 0) console.log('      blame@' + w + ' ' + JSON.stringify(c.blame));
    const bad = c.imgs.filter((im) => !im.fits);
    if (bad.length > 0) console.log('      img-not-fit@' + w + ' ' + JSON.stringify(bad));
    if (c.clippedCount > 0) console.log('      clipped@' + w + ' ' + JSON.stringify(c.clipped));
  }
}
cdp.close();
chrome.kill();
for (let i = 0; i < 10; i += 1) {
  try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); }
}
if (JSON_OUT !== '') {
  const out = resolve(JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ label: LABEL, widths: WIDTHS, at: new Date().toISOString(), rows }, null, 2) + LF, 'utf8');
  console.log('JSON-WROTE ' + out);
}
const cells = rows.length * WIDTHS.length;
console.log('OVERFLOW-' + (failed === 0 ? 'ZERO' : 'NONZERO') + ' pages=' + rows.length + ' cells=' + cells
  + ' failed=' + failed + ' scopeOutFailed=' + outFailed + ' label=' + LABEL);
process.exit(failed === 0 ? 0 : 1);
