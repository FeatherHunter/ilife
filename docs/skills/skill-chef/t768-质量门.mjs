#!/usr/bin/env node
/** t768 页面质量门 · 机审六列（票 #768 验收面第 6 条）。
 *
 * 判什么（六列，逐列可跑、可红、可点名）：
 *   ① 双端自适应（横向溢出）  真浏览器 390／1280：`documentElement.scrollWidth − innerWidth` 必须 0，越界即点名越界元素
 *   ② 触摸目标                真浏览器 390 档：页内可点件的**渲染**命中区最短边 ≥44px，不足即点名到「哪个件、多少 px」
 *   ③ 触屏三件                页内样式里 `-webkit-tap-highlight-color`／`touch-action` 是否齐（第三件只报读数，见下）
 *   ④ 分隔符懒政              **版式位**的可见文本里出现 `·`／`；`／`;`／`|` 即红（正文与数据区只报读数，照 t417:65-67 先例）
 *   ⑤ 英文裸词                可见文本里的 ASCII 词（白名单：单位与惯用缩写），命中即红并点名
 *   ⑥ 重复句                  同一句可见文本（≥8 字）在**同一变体**里出现 ≥2 次即红，点名重复句
 *
 * 另出一节**代码层读数**（不入红判据，供「代码层 UI 审查清单」逐条对照）：
 *   产物样式块数／原型壳样式块数／内联 style 数／活色值数／字号档数／类名前缀覆盖率／重复声明块数。
 *
 * 单位是**页面**：一个文件里带 `<!--VARIANT-BEGIN:X-->` 的，逐个变体各算一行（变体是同一路由的不同版本，
 * 各自的版式与文案要分别判）；不带标记的整页算一行。
 *
 * 用法：
 *   node docs/skills/skill-chef/t768-质量门.mjs <产物目录或 HTML 路径…>            # 默认量 390／1280 两档
 *   node docs/skills/skill-chef/t768-质量门.mjs <目录> --widths 390,1280 --json <路径>
 *   node docs/skills/skill-chef/t768-质量门.mjs <目录> --no-browser               # 只跑静态四列＋代码层读数
 *   node docs/skills/skill-chef/t768-质量门.mjs --inject 触摸目标 --out <目录>      # 反例：造一份坏页再判（应红并点名）
 *
 * 依赖：本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）＋ Node ≥22（内建 WebSocket／fetch）。
 * 缺浏览器即 exit 2，不静默变绿（只跑静态列必须显式写 `--no-browser`）。
 * 退出码：0 全绿；1 有列红；2 用法错或环境缺件。
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const WIDTHS_DEFAULT = [390, 1280];
/** 触摸档（44px 只在触摸档扣；桌面档不硬扣，照 t524 §3.2 的 H6 口径）。 */
const TOUCH_WIDTH = 390;
const MIN_HIT_PX = 44;

/* ── 版式位清单（第 ④ 列的判水面）─────────────────────────────────────────
 * 为什么只判版式位：正文与数据区里出现 `;` 是**用户写的内容**（老库里步骤正文、做菜反馈都带分号），
 * 那不是「拿符号偷懒」，判它会把真数据判成缺陷。版式位才是「本该用版式承担分隔」的地方。 */
const LAYOUT_CLASS_PARTS = [
  'ilife-block-page-shell-eyebrow', 'ilife-block-page-shell-title', 'ilife-block-page-shell-subtitle',
  'ilife-block-chip', 'ilife-block-conclusion', 'ilife-block-caliber',
  'ilife-block-kpi-card-label', 'ilife-block-kpi-card-value', 'ilife-block-kpi-card-unit', 'ilife-block-kpi-card-detail',
  'ilife-block-list-rows-left', 'ilife-block-list-rows-right', 'ilife-block-data-table-caption',
  'ilife-block-disclosure-summary', 'ilife-block-copy-block-title', 'ilife-block-fact-strip',
  'ilife-block-change-row-label', 'ilife-toast-title', 'ilife-toast-detail',
  'ilife-status-badge', 'ilife-action-btn', 'ilife-copy-btn', 'ilife-block-media-caption',
];
/** 纯数据容器：里面的分隔符只报读数（用户写的内容长什么样就是什么样）。 */
const DATA_CLASS_PARTS = ['ilife-block-data-table-table', 'ilife-block-disclosure-body', 'ilife-block-timeline', 'ilife-block-list-rows'];
const SEP_CHARS = ['·', '；', ';', '|'];
/** 英文裸词白名单：单位与惯用缩写（命中它们只报读数）。
 *  另收 `json`／`csv`：三格式菜单的冻结标签（公共层 `COPY_FORMAT_LABELS`，卡路里同款「复制数据 ▾」菜单逐字同形）。
 *  它们与已收的 `html`／`css`／`pdf`／`gif` 同类——都是格式名，不是该中文化的正文；句里若另有英文实词（如 click／button）仍照常判红，白名单只放过这两个 token 本身。 */
const ASCII_OK = new Set(['g', 'ml', 'kg', 'mg', 'l', 'min', 'h', 's', 'ok', 'id', 'ai', 'html', 'css', 'pdf', 'gif', 'usb', 'os', 'json', 'csv']);
const REPEAT_MIN_CHARS = 8;

/* ── HTML 小件（无依赖、够用即止）──────────────────────────────────────── */
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const stripComments = (s) => s.replace(/<!--(?!VARIANT-)[\s\S]*?-->/g, '');
const stripAssets = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const stripTags = (s) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/[ \t]+/g, ' ').trim();
/** 可见文本按行切（块级标签与换行当行界）。 */
function visibleLines(html) {
  const body = stripAssets(stripComments(html)).replace(/<\/(p|div|li|tr|h1|h2|h3|section|details|summary|td|th|figcaption|nav)>/gi, '\n');
  return stripTags(body.replace(/\n/g, ' \n ')).split(/\n+/).map((l) => l.trim()).filter((l) => l !== '');
}
/** 取「命中这些类名的最外层元素」的文本（栈式扫描：子件文本并进最近的命中祖先）。
 *
 *  为什么不用一条正则：`<div class="…-kpi-card-value-row"><span class="…-kpi-card-value">3</span></div>`
 *  这种嵌套里，正则匹配外层后会吃掉内层，逐个统计必然漏（本门第一版就漏过——读数偏小＝假绿灯）。
 *  栈式扫描逐个开闭标签记账，命中件按「父件不命中」判为最外层，子件文本并进它。 */
const VOID_TAGS = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const normalize = (s) => decode(s).replace(/\s+/g, ' ').trim();
function textsIn(html, classParts) {
  const body = stripAssets(stripComments(html));
  const stack = [{ own: false, buf: '' }];
  const out = [];
  const re = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    const top = stack[stack.length - 1];
    if (tok.startsWith('</')) {
      const el = stack.pop();
      if (el === undefined) continue;
      if (el.own) { const t = normalize(el.buf); if (t !== '') out.push(t); }
      const now = stack[stack.length - 1];
      if (now !== undefined) now.buf += ' ' + el.buf;
      continue;
    }
    if (tok.startsWith('<')) {
      const name = (tok.match(/^<([a-zA-Z0-9]+)/) ?? [, ''])[1].toLowerCase();
      const cls = (tok.match(/class="([^"]*)"/) ?? [, ''])[1];
      const hit = classParts.some((p) => cls.includes(p));
      if (VOID_TAGS.has(name) || /\/>$/.test(tok)) { if (hit && top.own === false) out.push(name); continue; }
      stack.push({ own: hit && top.own === false, buf: '' });
      continue;
    }
    if (top !== undefined) top.buf += tok;
  }
  while (stack.length > 1) { const el = stack.pop(); if (el.own) { const t = normalize(el.buf); if (t !== '') out.push(t); } }
  return out;
}
/** 兼容旧名（对外的判据函数）。 */
const textOfClasses = textsIn;
/** 页面里登记了哪些变体（`<!--VARIANT-BEGIN:X--> … <!--VARIANT-END:X-->`）。 */
function variantsOf(html) {
  const out = [];
  const re = /<!--VARIANT-BEGIN:([A-Za-z0-9]+)-->/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = m[1];
    const start = m.index;
    const end = html.indexOf('<!--VARIANT-END:' + key + '-->', start);
    const stop = end === -1 ? html.length : end + ('<!--VARIANT-END:' + key + '-->').length;
    out.push({ key, html: html.slice(start, stop) });
  }
  return out;
}

/* ── 静态四列 ──────────────────────────────────────────────────────────── */
function staticColumns(scopeHtml, wholeHtml) {
  const layoutText = textOfClasses(scopeHtml, LAYOUT_CLASS_PARTS);
  const dataText = textOfClasses(scopeHtml, DATA_CLASS_PARTS);
  // ④ 分隔符懒政
  const lazy = [];
  for (const [i, t] of layoutText.entries()) {
    for (const ch of SEP_CHARS) if (t.includes(ch)) lazy.push({ ch, text: t.slice(0, 60), at: i });
  }
  // ④ 读数：数据区里出现的那几个字符（用户写的内容，不判红）
  const dataHits = [];
  for (const t of dataText) for (const ch of SEP_CHARS) if (t.includes(ch)) dataHits.push({ ch, text: t.slice(0, 40) });
  // ⑤ 英文裸词
  const lines = visibleLines(scopeHtml);
  const ascii = [];
  const asciiOk = [];
  for (const line of lines) {
    for (const tok of line.match(/[A-Za-z]{2,}/g) ?? []) {
      if (ASCII_OK.has(tok.toLowerCase())) asciiOk.push(tok);
      else ascii.push({ tok, line: line.slice(0, 60) });
    }
  }
  // ⑥ 重复句：≥8 字（去空白）的同一行出现 ≥2 次即红；短行（标签、数据格值，如「锅温200度」）
  //    是数据巧合不是文案冗余，只进读数——判据与读数分开报，别把它们混成一处。
  const seen = new Map();
  for (const line of lines) {
    const key = line.replace(/\s+/g, '');
    if (key.length < 2) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const repeats = [...seen.entries()].filter(([t, n]) => n > 1 && t.length >= REPEAT_MIN_CHARS).map(([t, n]) => ({ text: t.slice(0, 60), n }));
  const shortRepeats = [...seen.entries()].filter(([t, n]) => n > 1 && t.length < REPEAT_MIN_CHARS).map(([t, n]) => ({ text: t.slice(0, 30), n }));
  // ③ 触屏三件（页内样式；原型壳的样式块单列，不算进产物）
  const styles = [...wholeHtml.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)].map((m) => ({ attrs: m[1], css: m[2].replace(/\/\*[\s\S]*?\*\//g, ' ') }));
  const productCss = styles.filter((s) => !/data-prototype/.test(s.attrs)).map((s) => s.css).join(LF);
  const touch = {
    tapHighlight: /-webkit-tap-highlight-color\s*:\s*transparent/.test(productCss),
    touchAction: /touch-action\s*:\s*manipulation/.test(productCss),
    callout: /-webkit-touch-callout/.test(productCss),
    viewportFit: /viewport-fit=cover/.test(wholeHtml),
    safeArea: /env\(safe-area-inset/.test(productCss),
  };
  return { lazy, dataHits, ascii, asciiOk, repeats, shortRepeats, touch, layoutCount: layoutText.length };
}

/* ── 代码层读数（整件一次，不入红判据）────────────────────────────────── */
function codeReadings(html) {
  const styles = [...html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)];
  // 注掉样式段里的注释再读数：注释里引用的 `class="…"`／`font-size:0`／色值都会把读数冲虚（第一版吃过这个误报）。
  const product = styles.filter((m) => !/data-prototype/.test(m[1])).map((m) => m[2].replace(/\/\*[\s\S]*?\*\//g, ' ')).join(LF);
  const shell = styles.filter((m) => /data-prototype/.test(m[1])).length;
  const inline = [...html.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1]);
  const colors = new Set((product.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((c) => c.toLowerCase()));
  const fontSize = new Set((product.match(/font-size\s*:\s*[^;}]+/g) ?? []).map((s) => s.replace(/\s+/g, '')));
  // 类名只在**标签面**里数：样式段与脚本段里出现 `class="…"` 是注释引文，不是页面用的类（第一版就吃过这个误报）。
  const markup = stripAssets(html);
  const classes = new Set((markup.match(/class="([^"]*)"/g) ?? []).flatMap((c) => c.slice(7, -1).split(/\s+/)).filter((x) => x !== ''));
  const nonIlife = [...classes].filter((c) => !c.startsWith('ilife-') && !c.startsWith('p768-') && !c.startsWith('v768-'));
  const decls = new Map();
  for (const m of product.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/gi)) {
    if (m[1].startsWith('--')) continue;
    const key = m[1].toLowerCase() + ':' + m[2].trim();
    decls.set(key, (decls.get(key) ?? 0) + 1);
  }
  const dupDecls = [...decls.entries()].filter(([, n]) => n > 5).map(([d, n]) => d + ' ×' + n);
  return { productStyleBlocks: styles.length - shell, shellStyleBlocks: shell, inline: inline.length, inlineSample: inline.slice(0, 3), colors: [...colors].length, colorSample: [...colors].slice(0, 6), fontSizeLevels: fontSize.size, nonIlifeClasses: nonIlife, dupDecls: dupDecls.length };
}

/* ── 浏览器（真渲染）两列 ─────────────────────────────────────────────── */
function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
}

/** 一条探针取齐：文档横向溢出、越界元素、可点件命中区、触屏声明是否真生效。 */
const PROBE = `(function () {
  var doc = document.documentElement, blame = [], hits = [], bad = [];
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i += 1) {
    var el = els[i], r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1) blame.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 60), w: Math.round(r.width), right: Math.round(r.right) });
  }
  var clickable = document.querySelectorAll('a[href],button,summary,input,select,[role="button"]');
  for (var j = 0; j < clickable.length; j += 1) {
    var c = clickable[j];
    if (c.closest('[data-prototype]') !== null) continue;            // 原型壳（悬浮切换条）不算页面设计
    var cr = c.getBoundingClientRect();
    if (cr.width === 0 && cr.height === 0) continue;
    var rec = { tag: c.tagName.toLowerCase(), cls: String(c.className || '').slice(0, 60), text: String(c.textContent || '').trim().slice(0, 24), w: Math.round(cr.width), h: Math.round(cr.height) };
    hits.push(rec);
    if (Math.min(cr.width, cr.height) < 44) bad.push(rec);
  }
  blame.sort(function (a, b) { return b.right - a.right; });
  return { innerWidth: window.innerWidth, docScrollWidth: doc.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
    blame: blame.slice(0, 3), blameCount: blame.length, hits: hits.length, bad: bad.slice(0, 8), badCount: bad.length,
    hitMin: hits.reduce(function (m, x) { return Math.min(m, Math.min(x.w, x.h)); }, 9999) };
}())`;

async function withBrowser(fn) {
  const browser = findBrowser();
  if (browser === undefined) return { error: '未找到 Chrome／Edge（本门两列是**真浏览器里的版面事实**）' };
  const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
  const port = 9700 + (process.pid % 200);
  const profile = mkdtempSync(join(tmpdir(), 't768-profile-'));
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
  try { return await fn({ s, sleep, browser }); } finally {
    try { ws.close(); } catch { /* 已关 */ }
    chrome.kill();
    for (let i = 0; i < 8; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
  }
}

/* ── 反例注入（每条列一个真例：造得出来 = 这一列真的会红）───────────────── */
export const INJECTIONS = ['横向溢出', '触摸目标', '触屏三件', '分隔符懒政', '英文裸词', '重复句'];

function inject(dir, kind) {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html')).map((f) => join(dir, f));
  if (files.length === 0) throw new Error('注入反例：目录里没有 HTML');
  const target = files[0];
  let html = readFileSync(target, 'utf8');
  const before = html;
  if (kind === '横向溢出') {
    // 一张比视口宽的表格塞进正文：390 档必溢出（本仓既有读法：docScrollWidth − innerWidth）
    html = html.replace(/<!--VARIANT-BEGIN:([A-Za-z0-9]+)-->/, '<!--VARIANT-BEGIN:$1--><div class="p768-inject"><table style="width:2400px"><tr><td>注入反例·超宽表</td></tr></table></div>');
  } else if (kind === '触摸目标') {
    html = html.replace('</head>', '<style data-prototype="1">.p768-inject{position:fixed;left:0;top:0;z-index:99}.p768-inject a{display:inline-block;min-height:24px;height:24px;line-height:24px;width:60px}</style></head>')
      .replace(/<!--VARIANT-BEGIN:([A-Za-z0-9]+)-->/, '<!--VARIANT-BEGIN:$1--><div class="p768-inject"><a href="#x">注入反例：小号可点件</a></div>');
  } else if (kind === '触屏三件') {
    const at = html.lastIndexOf('<style');
    html = html.slice(0, at) + '<style data-prototype="1">.p768-inject{outline:1px solid #000}</style>' + html.slice(at)
      + '<style data-prototype="0">.p768-inject{}</style>';
    html = html.replace(/-webkit-tap-highlight-color\s*:\s*transparent/g, '').replace(/touch-action\s*:\s*manipulation/g, '');
  } else if (kind === '分隔符懒政') {
    html = html.replace(/(<h1 class="ilife-block-page-shell-title">)/, '$1快手菜 · 2 人份 · 18 分钟 ');
  } else if (kind === '英文裸词') {
    html = html.replace(/(<h1 class="ilife-block-page-shell-title">)/, '$1Chef Run ');
  } else if (kind === '重复句') {
    // 复制页内那句结论（≥6 字的可见行）再放一次：同一句话在一页里出现两遍＝这一列必须红。
    const hit = /<p class="ilife-block-conclusion">([^<]{6,})<\/p>/.exec(html);
    if (hit === null) throw new Error('注入反例：这一页没有可复制的结论条');
    html = html.replace(hit[0], hit[0] + '<p class="ilife-block-caliber">' + hit[1] + '</p>');
  } else throw new Error('未知注入项：' + kind + '（可用：' + INJECTIONS.join('／') + '）');
  if (html === before) throw new Error('注入反例未命中（锚点没找到）：' + kind);
  writeFileSync(target, html, 'utf8');
  return target;
}

/* ── 主流程 ────────────────────────────────────────────────────────────── */
async function runGate(opts) {
  const widths = opts.widths ?? WIDTHS_DEFAULT;
  const files = opts.files;
  const useBrowser = opts.browser !== false;
  const browserCols = new Map();
  if (useBrowser) {
    const got = await withBrowser(async ({ s, sleep }) => {
      const rows = [];
      for (const f of files) {
        for (const v of (variantsOf(readFileSync(f, 'utf8')).length > 0 ? variantsOf(readFileSync(f, 'utf8')).map((x) => x.key) : [null])) {
          const url = pathToFileURL(f).href + (v === null ? '' : '?variant=' + v);
          const per = {};
          for (const w of widths) {
            await s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
            await s('Page.navigate', { url });
            for (let i = 0; i < 80; i += 1) { const r = await s('Runtime.evaluate', { expression: 'document.readyState === "complete"', returnByValue: true }); if (r.result && r.result.value === true) break; await sleep(50); }
            await sleep(120);
            const r = await s('Runtime.evaluate', { expression: PROBE, returnByValue: true });
            if (r.exceptionDetails) throw new Error('探针抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 200));
            per[w] = r.result.value;
          }
          rows.push({ file: f, variant: v, per });
        }
      }
      return rows;
    });
    if (got.error !== undefined) return { fatal: got.error };
    for (const r of got) browserCols.set(r.file + (r.variant === null ? '' : '#' + r.variant), r.per);
  }

  const results = [];
  for (const f of files) {
    const whole = readFileSync(f, 'utf8');
    const code = codeReadings(whole);
    const variants = variantsOf(whole);
    const scopes = variants.length > 0 ? variants : [{ key: null, html: whole }];
    for (const scope of scopes) {
      const st = staticColumns(scope.html, whole);
      const br = browserCols.get(f + (scope.key === null ? '' : '#' + scope.key)) ?? null;
      const overflow = {};
      const touch = {};
      if (br !== null) {
        for (const w of widths) {
          const p = br[w];
          overflow[w] = p.docScrollWidth - p.innerWidth;
          if (w === TOUCH_WIDTH) { touch.count = p.hits; touch.bad = p.bad; touch.badCount = p.badCount; touch.min = p.hitMin; touch.blame = p.blame; }
        }
      }
      const cols = {
        横向溢出: { red: br !== null && widths.some((w) => overflow[w] > 0), detail: widths.map((w) => w + '档 ' + (br === null ? '未量' : overflow[w])).join('｜'), blame: (br !== null && br[TOUCH_WIDTH] ? br[TOUCH_WIDTH].blame : []) },
        触摸目标: { red: br !== null && (touch.badCount ?? 0) > 0, detail: br === null ? '未量' : touch.count + ' 件可点，最短边 ' + touch.min + 'px', bad: touch.bad ?? [] },
        触屏三件: { red: !(st.touch.tapHighlight && st.touch.touchAction), detail: 'tap-highlight ' + (st.touch.tapHighlight ? '有' : '缺') + '／touch-action ' + (st.touch.touchAction ? '有' : '缺'), note: '第三件 touch-callout ' + (st.touch.callout ? '有' : '读数为 0（口径待裁，照 t407:51 不进红判据）') + '／viewport-fit ' + (st.touch.viewportFit ? '有' : '缺') + '／安全区 ' + (st.touch.safeArea ? '有' : '缺') },
        分隔符懒政: { red: st.lazy.length > 0, detail: st.lazy.length + ' 处（版式位 ' + st.layoutCount + ' 个）', hits: st.lazy, dataHits: st.dataHits },
        英文裸词: { red: st.ascii.length > 0, detail: st.ascii.length + ' 处', hits: st.ascii, ok: st.asciiOk.length },
        重复句: { red: st.repeats.length > 0, detail: st.repeats.length + ' 处' + (st.shortRepeats.length ? '（另 ' + st.shortRepeats.length + ' 处短行重复只报读数）' : ''), hits: st.repeats, short: st.shortRepeats },
      };
      results.push({ file: f, variant: scope.key, cols, code, overflow });
    }
  }
  return { results, widths, browser: useBrowser };
}

/* ── 打印 ──────────────────────────────────────────────────────────────── */
const COL_NAMES = ['横向溢出', '触摸目标', '触屏三件', '分隔符懒政', '英文裸词', '重复句'];
const rel = (p) => p.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/') + '/', '');
const mark = (col) => (col.red ? '✗' : '✓');

export function printGate(out, opts = {}) {
  const { results, widths } = out;
  console.log('# t768 页面质量门 · 机审六列 · 视口 ' + widths.join('／') + ' 宽' + (opts.label ? ' · ' + opts.label : ''));
  console.log('');
  console.log('| 页面 | 变体 | ① 横向溢出 | ② 触摸目标 | ③ 触屏三件 | ④ 分隔符懒政 | ⑤ 英文裸词 | ⑥ 重复句 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    console.log('| ' + rel(r.file) + ' | ' + (r.variant ?? '—') + ' | '
      + COL_NAMES.map((n) => mark(r.cols[n]) + ' ' + r.cols[n].detail).join(' | ') + ' |');
  }
  console.log('');
  for (const name of COL_NAMES) {
    const bad = results.filter((r) => r.cols[name].red);
    console.log(name + '：' + (bad.length === 0 ? '0 处' : bad.length + ' 页有命中'));
    for (const r of bad) {
      const c = r.cols[name];
      console.log('  ✗ ' + rel(r.file) + (r.variant ? '#' + r.variant : '') + ' — ' + c.detail);
      for (const h of c.hits ?? []) console.log('      · ' + (h.ch ? '「' + h.ch + '」' : '') + (h.text ?? '') + (h.line ? ' ← ' + h.line : '') + (h.n ? ' ×' + h.n : ''));
      for (const h of c.short ?? []) console.log('      （读数）短行重复 ' + h.text + ' ×' + h.n);
      for (const b of c.bad ?? []) console.log('      · 可点件 ' + b.tag + '.' + b.cls + ' 命中区 ' + b.w + '×' + b.h + 'px（<44）文本「' + b.text + '」');
      for (const b of c.blame ?? []) console.log('      · 越界元素 ' + b.tag + '.' + b.cls + ' 宽 ' + b.w + ' 右缘 ' + b.right);
    }
  }
  console.log('');
  console.log('代码层读数（不入红判据，供「代码层 UI 审查清单」对照）：');
  const seenFiles = new Set();
  for (const r of results.filter((x) => (seenFiles.has(x.file) ? false : (seenFiles.add(x.file), true)))) {
    const c = r.code;
    console.log('  ' + rel(r.file) + ' 产物样式块 ' + c.productStyleBlocks + '／原型壳样式块 ' + c.shellStyleBlocks
      + '／内联 style ' + c.inline + ' 处' + (c.inlineSample.length ? '（例：' + c.inlineSample[0].slice(0, 40) + '）' : '')
      + '／活色值 ' + c.colors + (c.colorSample.length ? ' ' + c.colorSample.join(' ') : '')
      + '／字号档 ' + c.fontSizeLevels + '／非 ilife- 类名 ' + (c.nonIlifeClasses.length === 0 ? '0' : c.nonIlifeClasses.join('、'))
      + '／高频重复声明 ' + c.dupDecls);
  }
  console.log('');
  const reds = results.flatMap((r) => COL_NAMES.filter((n) => r.cols[n].red).map((n) => n));
  const count = (n) => results.reduce((a, r) => a + (r.cols[n].red ? 1 : 0), 0);
  console.log('汇总：' + COL_NAMES.map((n) => n + ' ' + count(n)).join('／') + '（页 × 变体 ' + results.length + ' 行）');
  console.log('横向溢出 ' + count('横向溢出') + '／分隔符懒政 ' + count('分隔符懒政') + '／英文裸词 ' + count('英文裸词'));
  return reds.length === 0;
}

/* ── CLI ───────────────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
async function main() {
  const flags = ['--widths', '--json', '--inject', '--out', '--label'];
  const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !flags.includes(all[i - 1]));
  const widths = (argOf('--widths', '') === '' ? WIDTHS_DEFAULT : argOf('--widths', '').split(',').map(Number));
  const label = argOf('--label', '');
  const injectKind = argOf('--inject', '');
  const outDir = argOf('--out', '');
  const noBrowser = process.argv.includes('--no-browser');
  if (injectKind !== '' && outDir === '' && positional.length === 0) { console.log('注入反例须给 --out <目录> 或一个源目录'); process.exit(2); }
  let files = [];
  const dirs = [];
  for (const p of positional) { const a = resolve(p); if (statSync(a).isDirectory()) dirs.push(a); else files.push(a); }
  for (const d of dirs) files.push(...readdirSync(d).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(d, f)));
  if (files.length === 0) { console.log('没有输入页面：给一个目录或若干 HTML 路径'); process.exit(2); }

  if (injectKind !== '') {
    if (!INJECTIONS.includes(injectKind)) { console.log('未知注入项：' + injectKind + '（可用：' + INJECTIONS.join('／') + '）'); process.exit(2); }
    const src = dirs[0] ?? dirname(files[0]);
    const dst = resolve(outDir === '' ? join(src, '..', basename(src) + '-inject-' + injectKind) : outDir);
    rmSync(dst, { recursive: true, force: true });
    mkdirSync(dst, { recursive: true });
    // 只带 HTML（源目录里还有副本库与隔离家目录，不搬）
    for (const f of readdirSync(src).filter((x) => x.toLowerCase().endsWith('.html'))) cpSync(join(src, f), join(dst, f));
    const touched = inject(dst, injectKind);
    console.log('注入反例「' + injectKind + '」→ ' + rel(touched) + '（副本目录 ' + rel(dst) + '）');
    files = readdirSync(dst).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(dst, f));
  }

  const out = await runGate({ files, widths, browser: !noBrowser });
  if (out.fatal !== undefined) { console.log('RESULT: ABORT exit=2 :: ' + out.fatal); process.exit(2); }
  const green = printGate(out, { label: label === '' ? (injectKind === '' ? '' : '反例·' + injectKind) : label });
  const jsonPath = argOf('--json', '');
  if (jsonPath !== '') {
    const p = resolve(jsonPath);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ at: new Date().toISOString(), widths, inject: injectKind, results: out.results }, null, 2) + LF, 'utf8');
    console.log('JSON-WROTE ' + rel(p));
  }
  if (injectKind !== '') console.log('反例结论：' + (green ? '未变红 —— 这一列判不出缺陷（假绿灯）' : '已变红并点名（符合预期）'));
  process.exit(green ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
export { runGate, withBrowser, findBrowser, textOfClasses, visibleLines, variantsOf, codeReadings };
