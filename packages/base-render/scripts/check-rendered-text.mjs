#!/usr/bin/env node
/** #883 · 渲染面文字门（公共层判据件）：静态面读不到的那两个面，在这里补上。
 *
 * 为什么要有这一件：文本判据（分隔符门、机审 ⑤⑥ 列）只消费静态文件里的可见文本 ——
 * 样式块与脚本块整段剥离后再取文本。于是三类屏上真实可见的文本永远进不了判据：
 * CSS 伪元素生成的符号、运行时脚本写入的文本（含整族列表页的 JS 渲染正文）、
 * 非 ASCII 标点。#834 收口实测：静态 english 4 处／dup 5 处 → 渲染后 58 处／46 处，
 * 而 ⑤ 列 34 件全 0（假绿）。本件把**同一套 ⑤⑥ 规则**搬到渲染后的页面上跑，
 * 逐页列出「静态面命中 vs 渲染面命中」的差，差项逐条点名。
 *
 * 两列规则与静态面逐字对齐（只补面、不扩语义；Q1 裁定）：
 *  · ⑤ 分隔符懒政：`[·|｜]` 落在版式位／正文位即红，标题写法位只照打，数据位／载荷位豁免
 *    —— 口径出处 `docs/skills/skill-memo-ilife/t869-机审.mjs` 的 SEP_CHARS 与位置四分。
 *    注意分隔符门（`test/separator-probe.mjs` R1–R3）是另一把尺，本件不碰、不重算。
 *  · ⑥ 英文裸词与半角标点：ALLOW 四条＋ASCII 字母＋HALF 半角集（含数字小数点豁免）
 *    —— 口径出处同上。半角括号静态已有，本件只是同一规则换个面。
 * 位置名册初值取 t869（备忘录域重写，#869 自述名册按域重写），渲染面新增装饰位：
 * `.status-icon` 的装饰字形是图形、不是并列分隔符（Q2 裁定，出处 #878 评论），
 * 进允许清单并逐条写理由；同一字符按角色判。
 *
 * 复用（不另写第二份渲染管线）：静态剥壳用 `test/separator-probe.mjs` 导出的
 * `visibleText`（既有先例 `t867-dom-probe.mjs` 同方向引用）；渲染用真浏览器
 * （CDP 驱动与 `check-two-col-align.mjs` 同形——第二处用法，若再有第三处，
 * 抽 `scripts/cdp-page.mjs`，抽的同时把那一件也迁过来）。
 *
 * 用法（仓根）：
 *   node packages/base-render/scripts/check-rendered-text.mjs --dir <页群目录> [--width 1280] [--json <落点>] [--quiet]
 *   node packages/base-render/scripts/check-rendered-text.mjs <a.html> [<b.html> ...]
 * 报法：逐页行（静态⑤⑥ → 渲染⑤⑥ → 差，绿页也印）＋ 差项逐条点名 ＋ RESULT 汇总。
 * 退出码：0 全页无差项；1 有差项（逐条点名）；2 用法错／无浏览器／读数失败（不静默变绿）。
 * 本门只对差项判红：静态面既有债归机审与分隔符门，本件只报数、不改它们的读数。
 * 依赖：本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）、Node ≥ 22。**零第三方依赖。**
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { visibleText } from '../test/separator-probe.mjs';

const LF = String.fromCharCode(10);

/* ── 口径（出处见件头；逐条理由写在位上） ─────────────────────────────── */
/** ⑤ 命中字符：间隔号、半角竖线、全角竖线（出处 t869 SEP_CHARS）。 */
const SEP_CHARS = /[·|｜]/g;
/** ⑥ 允许清单（出处 t869 ALLOW，逐条带理由；放过之后还剩下的 ASCII 字母＝英文裸词）。 */
const ALLOW = [
  [/\d{4}-\d{2}-\d{2}/g, '日期（2026-09-21）'],
  [/\d{1,2}:\d{2}(?::\d{2})?/g, '时间（19:26:06）'],
  [/#\d+/g, '记录号（#2）：数据引用，不是标点懒政'],
  [/\bAI\b/g, '通用术语 AI（页面写「粘贴给 AI」，无更清楚的中文替词）'],
];
/** ⑥ 半角标点集（出处 t869 HALF；`.` 只在不紧贴数字时算，故先把小数抹掉）。 */
const HALF = /[,;:!?()[\]{}"'<>/\\~.`]/;
const HALF_SKIP_CTX = /\d+\.\d+/g;
/** 版式位：分隔符落在这里就是拿标点当版式（出处 t869 DESIGN_CLS，备忘录域）。 */
const DESIGN_CLS = new Set(['badge', 'badges', 'detail-badge', 'pill', 'chip', 'lead', 'subtitle',
  'hint', 'kpi', 'kpi-hint', 'kpi-label', 'hm-empty-hint', 'hm-toast-title', 'hm-toast-detail',
  'hm-error-title', 'status-title', 'status-sub', 'status-desc', 'status-meta', 'fact', 'facts',
  'meta', 'small', 'notice', 'err-list', 'caption', 'data-table-caption',
  'ilife-block-chip', 'ilife-block-kpi-card-title', 'ilife-block-fact-strip-label',
  'ilife-block-media-caption', 'ilife-block-timeline-note', 'ilife-block-copy-block-title']);
/** 标题写法位：眉头与页标题的分隔符只照打、不进红（出处 t869 TITLE_CLS／TITLE_TAGS）。 */
const TITLE_CLS = new Set(['hero', 'eyebrow', 'page-shell-eyebrow', 'page-shell-title']);
const TITLE_TAGS = new Set(['h1', 'title']);
/** 数据位：单元格／明细行／回显槽位／键值行——`·` 在这里是数据本来的样子（出处 t869 DATA_CLS）。 */
const DATA_CLS = new Set(['rows', 'kv', 'content', 'item-content', 'note-content', 'wish-content',
  'data-panel', 'detail-body', 'item-head', 'note-head', 'wish-head', 'item-id', 'note-id', 'wish-id',
  'item-list', 'item', 'note', 'wish', 'data-table-cell', 'param-form-input', 'param-form-label',
  'param-form-required', 'sr-only']);
/** 载荷位：复制载荷、写库指令、复制区按钮那一排（出处 t869 PAYLOAD_CLS）。 */
const PAYLOAD_CLS = new Set(['pre-block-code', 'copy-btn', 'copy-menu', 'cmd', 'hm-actions']);
/** 装饰位（渲染面新增）：图形符号，不是文本并列——放过但照打，理由逐条在位上。 */
const DECOR_REASON = {
  'status-icon': '状态图标的装饰字形（圆圈里的占位符，不是并列分隔符；出处 #878 评论）',
};

/** 位置四分（顺序即优先级：装饰 → 数据 → 载荷 → 标题 → 版式 → 正文；出处 t869 posOf，装饰为渲染面新增）。 */
export function classifyPos(cls, tag) {
  const tokens = String(cls ?? '').split(/\s+/).filter(Boolean);
  if (tokens.some((t) => Object.prototype.hasOwnProperty.call(DECOR_REASON, t))) return '装饰位';
  if (tokens.some((t) => DATA_CLS.has(t))) return '数据位';
  if (tokens.some((t) => PAYLOAD_CLS.has(t))) return '载荷位';
  if (tokens.some((t) => TITLE_CLS.has(t)) || TITLE_TAGS.has(String(tag ?? '').toLowerCase())) return '标题写法位';
  if (tokens.some((t) => DESIGN_CLS.has(t))) return '版式位';
  return '正文位';
}

/** 单串判据：⑤ 分隔符个数＋⑥ 英文／半角（ALLOW 先行放过；出处 t869 ⑤⑥）。 */
export function judgeString(text) {
  const t = String(text ?? '');
  const seps = t.match(SEP_CHARS);
  const rest = ALLOW.reduce((acc, [re]) => acc.replace(re, ' '), t);
  return {
    sep: seps ? seps.length : 0,
    ascii: /[A-Za-z]/.test(rest),
    half: HALF.test(rest.replace(HALF_SKIP_CTX, ' ')),
  };
}

/** CSS content 原字面 → 文本（`none`／`normal`／空 → ''；引号脱壳；`\B7 ` 形转义解码；
 *  未解析的 `attr()` 回 ''——页内探针已提前解析，落到这里的是防御分支）。 */
export function decodeCssContent(raw) {
  const s = String(raw ?? '').trim();
  if (s === '' || s === 'none' || s === 'normal') return '';
  if (/^attr\(/i.test(s)) return '';
  const q = s.match(/^(['"])([\s\S]*)\1$/);
  const inner = q ? q[2] : s;
  return inner
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\(.)/g, '$1');
}

/* ── 静态面取串（机制同 t869：样式脚本 → data-t 载荷 → 注释；归属＝最近的带 class 开标签） ── */
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
};
const normPiece = (piece) => piece.replace(/\u0000+/g, ' ')
  .replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, dec, hex) => {
    if (dec !== undefined) return String.fromCodePoint(Number(dec));
    if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
    return Object.prototype.hasOwnProperty.call(ENTITIES, m.toLowerCase()) ? ENTITIES[m.toLowerCase()] : m;
  })
  .replace(/\s+/g, ' ').trim();

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'col', 'area', 'base', 'wbr']);

/** 归属＝包住该偏移的最内一个带 class 的元素（标签栈纪律，机制同 t869 walkSegments：
 *  只看"最近开标签"不管闭合，会把已闭合元素的类名算到后面的兄弟上——上文 span/h1 实测）。
 *  窗口只看前 6000 字符，深层嵌套超出窗口时归属可能上浮，行号不受影响。 */
function ownerAt(html, offset) {
  const before = html.slice(Math.max(0, offset - 6000), offset);
  const stack = [];
  for (const m of before.matchAll(/<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const name = m[1].toLowerCase();
    if (m[0].startsWith('</')) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].name === name) { stack.length = i; break; }
      }
      continue;
    }
    if (/\/>$/.test(m[0]) || VOID_TAGS.has(name)) continue;
    stack.push({ name, cls: (m[0].match(/class="([^"]*)"/) ?? [])[1] ?? '' });
  }
  const inner = [...stack].reverse().find((x) => x.cls);
  const top = stack[stack.length - 1];
  return { cls: inner ? inner.cls.trim().replace(/\s+/g, ' ') : '', tag: top ? top.name : '' };
}

export function staticStrings(html) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const area = String(html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, blank)
    .replace(/<script[\s\S]*?<\/script>/gi, blank)
    .replace(/data-t="[\s\S]*?"/g, '')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const vis = visibleText(area);
  const out = [];
  let offset = 0;
  let n = 0;
  for (const piece of vis.split('\u0000')) {
    const at = offset;
    offset += piece.length + 1;
    const text = normPiece(piece);
    if (text === '') continue;
    n += 1;
    const own = ownerAt(area, at);
    out.push({ n, line: 'L' + vis.slice(0, at).split('\n').length, text: text.slice(0, 200), cls: own.cls, tag: own.tag });
  }
  return out;
}

/** 单文件静态面（读盘＋取串＋命中；main 与测试共用这一个入口）。 */
export function auditStaticFile(absPath) {
  return applyHits(staticStrings(readFileSync(absPath, 'utf8')));
}

/** 一组串 → 命中（数据位／载荷位跳过；装饰位放过但照打；标题写法位的 ⑤ 照打、⑥ 照红）。 */
export function applyHits(strings) {
  const red = [];
  const title = [];
  const deco = [];
  for (const s of strings) {
    const pos = classifyPos(s.cls, s.tag);
    if (pos === '数据位' || pos === '载荷位') continue;
    const j = judgeString(s.text);
    if (!j.sep && !j.ascii && !j.half) continue;
    const where = pos + (s.cls ? '<' + s.cls.split(' ').slice(0, 3).join(' ') + '>' : '<' + (s.tag || '无名') + '>');
    const item = { where, line: s.line, text: s.text.slice(0, 120), sep: j.sep, ascii: j.ascii, half: j.half };
    if (pos === '装饰位') { deco.push(item); continue; }
    if (j.sep > 0) (pos === '标题写法位' ? title : red).push({ ...item, kind: '⑤' });
    if (j.ascii) red.push({ ...item, kind: '⑥英文' });
    if (j.half) red.push({ ...item, kind: '⑥半角' });
  }
  return { red, title, deco };
}

/** 差＝渲染面红命中里静态面没有的文本（按归一文本比对；标题照打与装饰放过不进差）。 */
export function diffHits(staticRed, renderedRed) {
  const key = (h) => h.text.replace(/\s+/g, ' ').trim();
  const known = new Set(staticRed.map(key));
  const seen = new Set(renderedRed.map(key));
  return {
    diff: renderedRed.filter((h) => !known.has(key(h))),
    staticOnly: staticRed.filter((h) => !seen.has(key(h))).length,
  };
}

/* ── 渲染面取串（真浏览器里跑；隐藏子树剪除＋伪元素 content 提取） ─────────── */
const PROBE_JS = `(function () {
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  function concealed(el) {
    var chain = [], cur = el;
    while (cur && cur !== document.body && !cur.__visKnown) { chain.push(cur); cur = cur.parentElement; }
    var base = (cur && cur !== document.body) ? !!cur.__visHidden : false;
    for (var i = chain.length - 1; i >= 0; i -= 1) {
      var a = chain[i];
      var hide = base || !!a.hidden;
      if (!hide) {
        var cs = getComputedStyle(a);
        hide = cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse';
      }
      a.__visKnown = true; a.__visHidden = hide; base = hide;
    }
    el.__visKnown = true;
    if (el.__visHidden === undefined) el.__visHidden = base;
    return !!el.__visHidden;
  }
  function nearestCls(el) {
    var c = el, steps = 0;
    while (c && c !== document.body && steps < 6) {
      if (typeof c.className === 'string' && c.className.trim() !== '') return c.className.trim().replace(/\\s+/g, ' ');
      c = c.parentElement; steps += 1;
    }
    return '';
  }
  var nodes = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var tn, ord = 0;
  while ((tn = walker.nextNode())) {
    var p = tn.parentElement;
    if (!p || SKIP_TAGS[p.tagName]) continue;
    var t = tn.nodeValue.replace(/\\s+/g, ' ').trim();
    if (t === '' || concealed(p)) continue;
    ord += 1;
    nodes.push({ n: ord, line: '#' + ord, text: t.slice(0, 200), cls: nearestCls(p), tag: p.tagName.toLowerCase() });
  }
  var pseudos = [];
  var all = Array.prototype.slice.call(document.body.querySelectorAll('*'));
  all.unshift(document.body);
  for (var k = 0; k < all.length; k += 1) {
    var el = all[k];
    if (concealed(el)) continue;
    var cls = nearestCls(el);
    for (var pi = 0; pi < 2; pi += 1) {
      var pseudo = pi === 0 ? '::before' : '::after';
      var content = getComputedStyle(el, pseudo).getPropertyValue('content');
      if (!content || content === 'none' || content === 'normal') continue;
      var m = content.match(/^(['"])([\\s\\S]*)\\1$/);
      var inner = m ? m[2] : content;
      if (/^attr\\(/i.test(inner)) {
        var an = inner.match(/^attr\\(\\s*([^)]+?)\\s*\\)$/i);
        inner = an ? (el.getAttribute(an[1]) || '') : '';
      }
      inner = inner
        .replace(/\\\\([0-9a-fA-F]{1,6})\\s?/g, function (mm, h) { return String.fromCodePoint(parseInt(h, 16)); })
        .replace(/\\\\(.)/g, '$1');
      var pt = inner.replace(/\\s+/g, ' ').trim();
      if (pt === '') continue;
      pseudos.push({ line: pseudo, text: pt.slice(0, 200), cls: cls, tag: el.tagName.toLowerCase() + pseudo });
    }
  }
  return { nodes: nodes, pseudos: pseudos, elements: all.length };
}())`;

/* ── CLI（参数解析只在 main 里做，import 无副作用） ───────────────────────── */
function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

async function main() {
  const argOf = (name, dflt) => {
    const i = process.argv.indexOf(name);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
  };
  const FLAGS = ['--dir', '--width', '--json', '--quiet'];
  const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));
  const DIR = argOf('--dir', '');
  const WIDTH = Number(argOf('--width', '1280')) || 1280;
  const JSON_OUT = argOf('--json', '');
  const QUIET = process.argv.includes('--quiet');

  const FILES = [];
  if (DIR !== '') {
    const dir = resolve(DIR);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) die(2, '目录不存在：' + DIR);
    for (const f of readdirSync(dir)) if (f.toLowerCase().endsWith('.html')) FILES.push(join(dir, f));
  }
  for (const p of positional) FILES.push(resolve(p));
  for (const f of FILES) if (!existsSync(f)) die(2, '文件不存在：' + f);
  if (FILES.length === 0) die(2, '没有输入页面：给一组 HTML 路径，或用 --dir <页群目录>');

  const BROWSER = [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p.length > 0 && existsSync(p))[0];
  if (BROWSER === undefined) die(2, '未找到 Chrome／Edge：渲染面必须量在真浏览器里。用 DSH_BROWSER=<路径> 指定。');

  const PORT = 9621 + (process.pid % 300);
  const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
    '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT, '--window-size=' + WIDTH + ',900', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
  const TIMEOUT_MS = 30000;
  let devUrl = null;
  for (let waited = 0; waited < TIMEOUT_MS; waited += 250) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) { devUrl = (await r.json()).webSocketDebuggerUrl; break; }
    } catch { /* 端口未就绪 */ }
    await sleep(250);
  }
  if (devUrl === null) { chrome.kill(); die(2, 'CDP 未建立：DevTools 端口未就绪（' + PORT + '）'); }
  const ws = new WebSocket(devUrl);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
    }
  });
  await new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP WebSocket 连接失败')));
  });
  const send = (method, params, sessionId) => {
    const id = nextId++;
    return new Promise((res, rej) => {
      pending.set(id, { res, rej });
      ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
    });
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable');
  const evaluate = async (expression) => {
    const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.exceptionDetails).slice(0, 240));
    return r.result.value;
  };

  await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false });
  const diffs = [];
  const failures = [];
  const report = [];
  let statSep = 0;
  let statEng = 0;
  let rendSep = 0;
  let rendEng = 0;
  console.log('渲染面文字门 · 页数=' + FILES.length + ' 宽=' + WIDTH + ' 浏览器=' + BROWSER);
  for (const f of FILES) {
    const page = basename(f);
    let st;
    try {
      st = auditStaticFile(f);
    } catch (e) {
      failures.push(page + ' 静态取串失败：' + String(e.message).slice(0, 120));
      continue;
    }
    let probe;
    try {
      await s('Page.navigate', { url: 'file:///' + f.replace(/\\/g, '/') });
      let ready = false;
      for (let waited = 0; waited < 15000; waited += 250) {
        try {
          if ((await evaluate('document.readyState')) === 'complete') { ready = true; break; }
        } catch { break; }
        await sleep(250);
      }
      if (!ready) throw new Error('页面未进入 complete（15s）');
      await sleep(900);
      probe = await evaluate(PROBE_JS);
    } catch (e) {
      failures.push(page + ' 渲染取串失败：' + String(e.message).slice(0, 120));
      continue;
    }
    const rendered = [...probe.nodes, ...probe.pseudos];
    const rd = applyHits(rendered);
    const { diff, staticOnly } = diffHits(st.red, rd.red);
    statSep += st.red.filter((h) => h.kind === '⑤').length;
    statEng += st.red.filter((h) => h.kind !== '⑤').length;
    rendSep += rd.red.filter((h) => h.kind === '⑤').length;
    rendEng += rd.red.filter((h) => h.kind !== '⑤').length;
    report.push({
      page, static: st.red, staticTitle: st.title.length, staticDeco: st.deco.length,
      rendered: rd.red, renderedTitle: rd.title.length, renderedDeco: rd.deco.length,
      renderedElements: probe.elements, diff, staticOnly,
    });
    for (const d of diff) diffs.push({ page, ...d });
    console.log('FILE ' + page + '  静态⑤' + st.red.filter((h) => h.kind === '⑤').length
      + '⑥' + st.red.filter((h) => h.kind !== '⑤').length
      + ' → 渲染⑤' + rd.red.filter((h) => h.kind === '⑤').length
      + '⑥' + rd.red.filter((h) => h.kind !== '⑤').length
      + ' 差' + diff.length + '［标题照打' + rd.title.length + ' 装饰放过' + rd.deco.length + '］');
  }
  if (!QUIET) {
    for (const d of diffs) {
      console.log('  ✗ ' + d.page + ' ' + d.line + ' ' + d.where + '「' + d.text + '」［' + d.kind + '］');
    }
    for (const fl of failures) console.log('  ✗ ' + fl);
  }
  console.log('RESULT: ' + (FILES.length - report.filter((r) => r.diff.length > 0).length) + '/' + FILES.length + ' CLEAN'
    + ' ｜静态⑤' + statSep + '⑥' + statEng + ' → 渲染⑤' + rendSep + '⑥' + rendEng
    + ' 差' + diffs.length + ' 读数失败' + failures.length);
  if (JSON_OUT !== '') {
    const out = resolve(JSON_OUT);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({
      gate: 'rendered-text', width: WIDTH, at: new Date().toISOString(),
      pages: report, diffs, failures,
    }, null, 2) + LF, 'utf8');
    console.log('JSON-WROTE ' + out);
  }
  ws.close();
  chrome.kill();
  if (failures.length > 0) process.exit(2);
  process.exit(diffs.length === 0 ? 0 : 1);
}

const isMainEntry = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainEntry) {
  main().catch((e) => die(2, '异常退出：' + String((e && e.message) || e).slice(0, 200)));
}
