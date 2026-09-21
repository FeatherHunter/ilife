/** #826 · facts.json 生成件（`t827-facts.mjs` 的过渡复制件：口径一行未动，只换读数目录。
 *  复制理由见 t849 §4「过渡期用判分复制件」；#868 公共层引擎落成后由它统一收编，本件退役。
 *  跑法（仓根）：node docs/skills/skill-memo-ilife/t826-facts.mjs   # 读 `.scratch/memo-826/gates/pages/`，写同目录顶层 facts.json
 *
 *  契约来源：`docs/skills/skill-calorie/t524-判分.mjs`（只读参考，本件不改它）。
 *  字段契约（字段名 → 读它的行）：
 *    facts.pages[key]            :163 (`facts.pages[k]`，key 由 :56 `keyOf(name)` 给)
 *    .dupFacts                   :93  → H3 命中处数；:108 参与 D3 压顶；:218 参与硬扣分
 *    .english                    :97  → H7 命中处数；:218 参与硬扣分
 *    .d1 / .d2                   :129 / :130（**扣分值**，D1=15−d1、D2=20−d2）
 *    .d4cut                      :115（D4 的人核位，缺省 0）
 *    .tables / .tdDataLabel      :121 / :122（有无数据表、有没有列头数据标签）
 *    .tocEl / .scrollMargin      :124（页内定位两件）
 *    .imgTags / .aspectRatio     :125（图片容器两件）
 *    .inherit                    :50（可选，借 sep/resp/fmt 的目录；本件不产）
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { visibleText } from '../../../packages/base-render/test/separator-probe.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DIR = join(ROOT, '.scratch', 'memo-826', 'gates');
const PAGES = join(DIR, 'pages');
const SENT = '\u0000';

// ── 可见文本口径：**不重写**，直接 import `separator-probe.mjs:208` 导出的同一函数（它 = 件内 :70-75）──
/** 实体解码表：与 `separator-probe.mjs:51-55` 同。 */
const ENT = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
};
const decode = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, d, h) => {
  if (d !== undefined) return String.fromCodePoint(Number(d));
  if (h !== undefined) return String.fromCodePoint(parseInt(h, 16));
  return Object.prototype.hasOwnProperty.call(ENT, m.toLowerCase()) ? ENT[m.toLowerCase()] : m;
});
/** 归一化：哨兵→空格（与探针 `:132` 同）、`\s+`→单个空格、去首尾。 */
const norm = (piece) => decode(piece.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim();

/** 页内区域：`</head>` 之前算 head（`<title>` 等不渲染成页面的读在 head）。 */
const headEndOf = (html) => { const i = html.search(/<\/head\s*>/i); return i < 0 ? 0 : i; };
/** 归属元素 class：与 `separator-probe.mjs:80-84` 同。 */
function ownerOf(html, offset) {
  const before = html.slice(Math.max(0, offset - 4000), offset);
  const opens = [...before.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*class="([^"]*)"[^>]*>/g)];
  return opens.length ? opens[opens.length - 1][2].trim() : '';
}

/** 可见文本节点表。口径：探针的剥壳 → 哨兵切段 → 归一去空 → 序号 1 起。 */
function nodesOf(html) {
  const vis = visibleText(html);
  const headEnd = headEndOf(html);
  const out = [];
  let offset = 0; let n = 0;
  for (const piece of vis.split(SENT)) {
    const at = offset;
    offset += piece.length + SENT.length;
    const text = norm(piece);
    if (text === '') continue;
    n += 1;
    out.push({ n, at, line: vis.slice(0, at).split('\n').length, text, zone: at < headEnd ? 'head' : 'body', owner: ownerOf(html, at) });
  }
  return out;
}

// ── 机械口径（逐条进 facts.json 的 method）────────────────────────────────────
/** H3 用：重复的可见文本节点（正文域、去首尾后长度 ≥ DUP_MIN）。 */
const DUP_MIN = 4;
/** H7 用：英文词（连续 ASCII 字母）。 */
const RE_WORD = /[A-Za-z]+/g;
/** H7 用：半角标点候选集。 */
const RE_PUNC = /[,.;:!?()"'@#$%^&*_+=~|/\\<>{}\[\]-]/g;
/** H7 排除项 ①：严格夹在两位数字之间的半角标点（日期／时刻／小数，是**取值**不是标点债）。 */
const RE_NUMRUN = /(?<=\d)[.:/\-](?=\d)/g;
/** H7 排除项 ②：`#数字` 形式的标识（列表主键，是**取值**不是标点债）。 */
const RE_IDTOK = /#\d+/g;

function dupOf(nodes) {
  const tally = new Map();
  for (const x of nodes) if (x.zone === 'body' && x.text.length >= DUP_MIN) tally.set(x.text, (tally.get(x.text) ?? 0) + 1);
  const dups = [...tally.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
  return { hits: dups.reduce((a, [, c]) => a + c - 1, 0), kinds: dups.map(([t, c]) => ({ text: t.slice(0, 80), count: c })) };
}

function englishOf(nodes) {
  const hitNodes = [];
  for (const x of nodes) {
    if (x.zone === 'head') continue;
    // 英文词；排除项：`#` 后紧跟的纯数字词（列表主键）
    const words = [...x.text.matchAll(RE_WORD)]
      .filter((m) => !(x.text[m.index - 1] === '#' && /^\d+$/.test(m[0])))
      .map((m) => m[0]);
    // 半角标点：逐个按位置判，排除严格夹在两位数字之间的 . : / -（日期／时刻／小数）
    const punc = [];
    for (const m of x.text.matchAll(RE_PUNC)) {
      const a = x.text[m.index - 1]; const b = x.text[m.index + 1];
      if ('.:/-'.includes(m[0]) && /\d/.test(a ?? '') && /\d/.test(b ?? '')) continue;
      punc.push(m[0]);
    }
    if (!words.length && !punc.length) continue;
    hitNodes.push({ n: x.n, owner: x.owner, words: [...new Set(words)], punc: [...new Set(punc)], text: x.text.slice(0, 100) });
  }
  return { hits: hitNodes.length, occurrences: hitNodes.reduce((a, h) => a + h.words.length + h.punc.length, 0), nodes: hitNodes };
}

const count = (s, re) => (s.match(re) ?? []).length;

// ── 逐页取值 ────────────────────────────────────────────────────────────────
const files = readdirSync(PAGES).filter((f) => f.toLowerCase().endsWith('.html')).sort();
const pages = {};
const log = [];

for (const f of files) {
  const html = readFileSync(join(PAGES, f), 'utf8');
  const nodes = nodesOf(html);
  const dup = dupOf(nodes);
  const en = englishOf(nodes);
  const key = f.replace(/\.html$/i, '').split('_')[0];
  if (pages[key]) throw new Error('页键撞车：' + key);
  pages[key] = {
    note: '真产物：.scratch/memo-826/gates/pages/' + f,
    file: f,
    visibleTextNodes: nodes.length,
    // ── 机械取值（正则见 method）──
    tables: count(html, /<table\b/gi),
    imgTags: count(html, /<img\b/gi),
    tdDataLabel: count(html, /td[^>]*\bdata-label=/g),
    tocEl: count(html, /class="[^"]*\bilife-block-toc\b/g),
    aspectRatio: count(html, /aspect-ratio/g),
    scrollMargin: count(html, /scroll-margin-top/g),
    // ── 判分位 ──
    dupFacts: dup.hits,
    english: en.hits,
    // ── 人核位：本件不取值（不许编数字）──
    d1: null,
    d2: null,
    d4cut: null,
    // ── 证据（判分件读不到，不影响）──
    evidence: {
      dupKinds: dup.kinds,
      englishNodes: en.nodes,
      englishOccurrences: en.occurrences,
    },
  };
  log.push(`${f}  nodes=${nodes.length} dup=${dup.hits} ${JSON.stringify(dup.kinds.map((k) => k.text + '×' + k.count))} english=${en.hits}(occ=${en.occurrences}) tables=${pages[key].tables} toc=${pages[key].tocEl} scrollMargin=${pages[key].scrollMargin} img=${pages[key].imgTags}`);
}

const facts = {
  at: new Date().toISOString(),
  dir: DIR,
  ticket: '#826 · skill-memo-ilife 过渡期五维尺判分（判分件见 docs/skills/skill-memo-ilife/t827-判分.mjs）',
  method: {
    visibleText: '与 packages/base-render/test/separator-probe.mjs:70-75 同一函数（本件直接 import 其 :208 导出，不重写）：① <style>/<script> 整段（含 <script type="application/json"> 注入载荷）② <!-- --> 注释 ③ 全部 <…> 标签（属性随之消失）④ 解 HTML 实体。剥壳用等长哨兵 \\u0000，换行原样保留。',
    nodeSplit: '哨兵切段；每段 replace(/\\u0000+/g," ") 后 replace(/\\s+/g," ").trim()，空段丢弃，非空段编号 1 起。',
    normalization: '实体解码表同 separator-probe.mjs:51-55；空白折叠为单个半角空格；首尾去空。',
    zone: 'pos < </head> 的位置算 head 域，否则 body 域（<title> 只进 head 域，被判为「不渲染成页面的读」，不进 H3／H7 计数）。',
    dupFacts: 'H3 口径：**body 域** + 归一化后长度 ≥4 的可见文本节点，按文本全等分组；每组 count≥2 记 count−1 处；合计 Σ(count−1)。排除项：head 域（<title>）、长度 <4 的节点。',
    english: 'H7 口径：**body 域**每个可见文本节点，命中「英文词 /[A-Za-z]+/」或「半角标点 /[,.;:!?()"\\\'@#$%^&*_+=~|/\\\\<>{}\\[\\]-]/」即算 **1 处**（按节点计处，不按字符计）。排除项：① head 域 ② 严格夹在两位数字之间的 . : / -（日期／时刻／小数，是取值）③ #数字 形式的列表主键。逐词出现次数另记 evidence.englishOccurrences 备查。',
    domCounts: 'tables=<table\\b／imgTags=<img\\b／tdDataLabel=td[^>]*\\bdata-label=／tocEl=class="[^"]*\\bilife-block-toc\\b（元素级，不是 CSS 规则）／aspectRatio=aspect-ratio／scrollMargin=scroll-margin-top —— 正则逐字取 docs 外的小件 .scratch/t524/correction-probe.mjs:25-27,31（其读数即 t524-判分.mjs:19 指的 correction-probe.mjs）。',
    humanSlots: 'd1／d2／d4cut 三位是**人核位**（t524-判分.mjs:128-130 注「由人核扣分表给」、:113-115 注「人核位」）：本件**不取值，显式写 null**。判分件用 ?? 0 兜底 ⇒ 未取值位等于「不扣分」，页分是**乐观上界**，不是实测满分。',
  },
  pages,
};

writeFileSync(join(DIR, 'facts.json'), JSON.stringify(facts, null, 1), 'utf8');
for (const l of log) console.log(l);
console.log('FACTS-WROTE ' + join(DIR, 'facts.json') + '  页数=' + Object.keys(pages).length);
console.log('keys: ' + Object.keys(pages).join(' ／ '));
