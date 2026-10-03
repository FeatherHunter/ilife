// #1073 物证冻结 · 归一化结构比对脚本（**辅助定位，不是还原判据**）
//
// 它回答「哪里不一样」（字符级定位），不回答「看起来一不一样」（像素级）。
// #1079／#1080 只在像素已经有差异时用它缩小范围。
// **它绿而像素不绿，照样算红。**
//
// 归一化六条规则（票面写死，本脚本只实现、不增、不删、不改）：
//   1 删运行期属性：data-*-id／data-generated-at／data-seq／data-ticket-no／id="r-<数字>"
//   2 文本节点数值占位（只替换可见文本，不碰属性值）：金额与数量 → #N#（后随单位一并吞）；
//     日期时间 → #D#；百分比 → #P#
//   3 枚举值占位：分类名／账户名／场景名 → #CAT#／#ACC#／#SCENE#（取值表从判地原型件里抽，不许手写）
//   4 class 去 hash 后缀 -[0-9a-f]{6,}
//   5 CSS 声明排序：每个选择器内声明按字典序重排，选择器块按字典序重排（消顺序差异、留内容差异）
//   6 折叠空白：连续空白→单空格；标签之间的纯空白删除；> 与 < 之间的换行删除
//
// 实施口径（票面未写死处，取最窄的一种读法，逐条记在 proto/归一化规则.md）：
//   · 「可见文本」＝不在 <script>／<style>／<title>／注释里的文本节点。
//   · 规则 3 不带范围限定（票面只对规则 2 写了「只替换可见文本」），故规则 3 作用在
//     文本节点与 <script> 载荷上，不碰属性值与 <style>——枚举取值表本身就住在 <script> 载荷里，
//     排除 <script> 会让规则 3 够不着它自己点名的那些值。
//   · 规则 6 的「标签之间的纯空白删除」与「> 与 < 之间的换行删除」在 HTML 里是同一件事：
//     夹在两个标签之间的纯空白文本节点，删掉。文本节点**内部**的首尾空白票面没写要删，不删。
//
// 用法：node 1073-proto-same.mjs <实际件目录> <判地原型目录> <manifest.json> [--domain <域>] [--kind <kind>]
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const pos = [argv[0], argv[1], argv[2]].filter((x) => x && !x.startsWith('--'));
const [actualArg, baseArg, manifestArg] = pos;
if (!actualArg || !baseArg || !manifestArg) {
  process.stderr.write('用法：node 1073-proto-same.mjs <实际件目录> <判地原型目录> <manifest.json> [--domain <域>] [--kind <kind>]\n');
  process.exit(2);
}
const ACTUAL = resolve(actualArg), BASE = resolve(baseArg);
const MANIFEST = resolve(manifestArg);
const DOMAIN = flag('--domain');
const KIND = flag('--kind') ?? 'proto';

const M = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let items = M.items.filter((i) => i.kind === KIND);
if (DOMAIN) items = items.filter((i) => i.domain === DOMAIN);
if (!items.length) { console.error(`RED: 清单里没有 kind=${KIND}${DOMAIN ? ` domain=${DOMAIN}` : ''} 的条目`); process.exit(1); }

/* ══ 规则 3 的取值表：从「判地原型件」里抽，不许手写 ══════════════════════ */
const catSet = new Set(), accSet = new Set(), sceneSet = new Set();
for (const it of items) {
  if (it.wake) sceneSet.add(it.wake);
  const p = join(BASE, it.rel);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  for (const m of src.matchAll(/"category"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) catSet.add(m[1]);
  for (const m of src.matchAll(/"account"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) accSet.add(m[1]);
  // 载荷里的 scene/kind 键也可能是枚举来源
  for (const m of src.matchAll(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) catSet.has(m[1]) || accSet.add(m[1]);
}
// 长串优先；同长时 CAT > ACC > SCENE，保证替换顺序确定
const ENUM_TABLE = [
  ...[...catSet].map((v) => [v, '#CAT#', 0]),
  ...[...accSet].map((v) => [v, '#ACC#', 1]),
  ...[...sceneSet].map((v) => [v, '#SCENE#', 2]),
].filter(([v]) => v && v.length > 0)
  .sort((a, b) => b[0].length - a[0].length || a[2] - b[2]);
const ENUM_RE = ENUM_TABLE.length
  ? new RegExp(ENUM_TABLE.map(([v]) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
  : null;
const ENUM_MAP = new Map(ENUM_TABLE.map(([v, t]) => [v, t]));

/* ══ 分段：标签／可见文本／script·style 原文 ═══════════════════════════ */
function segment(html) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<title\b[^>]*>[\s\S]*?<\/title\s*>|<\/?[a-zA-Z][^>]*>|[^<]+/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const s = m[0];
    if (s.startsWith('<!--')) { out.push({ t: 'opaque', s }); continue; }
    let done = false;
    // <script>/<style> 若没有配对的闭合标签（原件里出现过），整段当不透明原样保留
    for (const [t, tag] of [['script', 'script'], ['style', 'style'], ['opaque', 'title']]) {
      if (!new RegExp(`^<${tag}\\b`, 'i').test(s)) continue;
      const openM = /^<[a-zA-Z][^>]*>/.exec(s);
      const closeM = new RegExp(`</${tag}\\s*>$`, 'i').exec(s);
      out.push(openM && closeM ? { t, s, open: openM[0], body: s.slice(openM[0].length, s.length - closeM[0].length) } : { t: 'opaque', s });
      done = true;
      break;
    }
    if (done) continue;
    out.push(s[0] === '<' ? { t: 'tag', s } : { t: 'text', s });
  }
  return out;
}
const rejoin = (segs) => segs.map((g) => (typeof g === 'string' ? g : g.s)).join('');

/* ══ 规则 1 · 删运行期属性 ══════════════════════════════════════════════ */
const RUNTIME_ATTR = /^(?:data-(?:[a-z0-9-]*-)?id|data-generated-at|data-seq|data-ticket-no)$/i;
const RUNTIME_ID = /^r-\d+$/;
function rule1DropRuntimeAttrs(tagText) {
  const selfClosing = tagText.endsWith('/>');
  const inner = tagText.replace(/^<[a-zA-Z]/, '').replace(/\/?>$/, '');
  const nameMatch = /^[a-zA-Z][\w:-]*/.exec(inner);
  if (!nameMatch) return tagText;
  const name = nameMatch[0];
  const rest = inner.slice(name.length);
  const kept = [];
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = attrRe.exec(rest)) !== null) {
    const attr = m[1];
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    if (RUNTIME_ATTR.test(attr)) continue;
    if (attr.toLowerCase() === 'id' && RUNTIME_ID.test(val)) continue;
    kept.push(m[2] !== undefined ? `${attr}="${val}"` : m[3] !== undefined ? `${attr}='${val}'` : m[4] !== undefined ? `${attr}=${val}` : attr);
  }
  return `<${name}${kept.length ? ' ' + kept.join(' ') : ''}${selfClosing ? '/>' : '>'}`;
}

/* ══ 规则 4 · class 去 hash 后缀 ═══════════════════════════════════════ */
function rule4StripClassHash(tagText) {
  return tagText.replace(/(\sclass\s*=\s*)(["'])([^"']*)\2/gi,
    (_, pre, q, v) => pre + q + v.split(/\s+/).map((t) => t.replace(/-[0-9a-f]{6,}$/i, '')).join(' ') + q);
}

/* ══ 规则 2 · 文本节点数值占位（票面写死的三条正则，逐字实现）══════════ */
// 票面原文：「金额与数量 -?\d{1,3}(,\d{3})*(\.\d+)? → #N#（后随 元|笔|个月|天|条 时一并吞掉单位）」
// 「后随」不限紧邻：原型正文里写的是「共 2 笔」「35.00 元」，数字与单位之间有空格，
// 所以单位前允许一个可选空白。整数部分严格照票面写死 \d{1,3}（**不擅自扩成 \d{1,}**）——
// 由此产生的「8000.00 → #N##N#」缺陷已记进票面遗留出口并开票，由人裁，本席不许私自加豁免。
const RE_DATE = /\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/g;
const RE_PCT = /\d+(?:\.\d+)?%/g;
const RE_AMT_UNIT = /-?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:元|笔|个月|天|条)/g;
const RE_AMT = /-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;
function rule2Numbers(text) {
  return text.replace(RE_DATE, '#D#').replace(RE_PCT, '#P#').replace(RE_AMT_UNIT, '#N#').replace(RE_AMT, '#N#');
}
/* ══ 规则 3 · 枚举值占位 ═══════════════════════════════════════════════ */
function rule3Enums(text) {
  if (!ENUM_RE) return text;
  ENUM_RE.lastIndex = 0;
  return text.replace(ENUM_RE, (m) => ENUM_MAP.get(m) ?? m);
}

/* ══ 规则 5 · CSS 声明排序 ════════════════════════════════════════════ */
const splitDecls = (body) => {
  const out = []; let cur = ''; let q = null;
  for (const ch of body) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ';') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => d.trim().replace(/\s+/g, ' ')).filter(Boolean).sort();
};
const splitTopRules = (css) => {
  const out = []; let cur = ''; let q = null; let depth = 0;
  for (const ch of css) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '{') { depth++; cur += ch; if (depth === 1) continue; continue; }
    if (ch === '}') { depth--; cur += ch; if (depth === 0) { out.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
};
function sortCss(css) {
  return splitTopRules(css).map((rule) => {
    const open = rule.indexOf('{'), close = rule.lastIndexOf('}');
    if (open < 0 || close < open) return rule.trim();
    const prelude = rule.slice(0, open).trim();
    const body = rule.slice(open + 1, close);
    // @ 开头的块（@media/@keyframes/…）内部是嵌套规则，递归同样处理
    if (prelude.startsWith('@')) {
      const inner = sortCss(body);
      return `${prelude}{${inner}}`;
    }
    return `${prelude}{${splitDecls(body).join(';')}}`;
  }).sort().join('');
}

/* ══ 规则 6 · 折叠空白 ════════════════════════════════════════════════ */
// 「标签之间的纯空白删除」与「> 与 < 之间的换行删除」在 HTML 里是同一件事：
// 它就是**夹在两个标签之间的纯空白文本节点**，直接删掉。
// 文本节点内部的首尾空白票面没写要删，不删（宁可少归一化，不多归一化）。
function rule6Whitespace(text, { whitespaceOnlyBetweenTags }) {
  if (whitespaceOnlyBetweenTags) return '';
  return text.replace(/\s+/g, ' ');
}

/* ══ 归一化全流程（顺序即票面条号 1→6）════════════════════════════════ */
function normalize(html) {
  const segs = segment(html);
  const parts = segs.map((g, i) => {
    if (g.t === 'tag') {
      let s = rule1DropRuntimeAttrs(g.s);   // 规则 1
      s = rule4StripClassHash(s);           // 规则 4
      // 规则 5 也要管 style="…" 内联样式
      s = s.replace(/(style\s*=\s*)(["'])([^"']*)\2/gi, (_, pre, q, v) => pre + q + sortCss(v) + q);
      return s;
    }
    if (g.t === 'style') return g.open + sortCss(g.body) + '</style>';   // 规则 5；规则 2/3 不进 <style>
    if (g.t === 'script') return g.open + rule3Enums(g.body) + '</script>';   // 规则 3 覆盖 <script> 载荷（见文件头口径）
    if (g.t === 'opaque') return g.s;       // 注释与 <title>：逐字保留
    const solo = /^\s+$/.test(g.s) && i > 0 && i < segs.length - 1
      && segs[i - 1].t === 'tag' && segs[i + 1].t === 'tag';
    return rule6Whitespace(rule3Enums(rule2Numbers(g.s)), { whitespaceOnlyBetweenTags: solo });   // 规则 2 → 3 → 6
  });
  const out = rejoin(parts);
  // 自护栏：非空原件归一化后不得变成空串——否则「所有页都归一化成同一个空串」会让
  // 本脚本永远绿，等于没有判据。曾经真发生过（rejoin 读错了字段），这里钉死。
  if (html.trim() && !out.trim()) throw new Error(`归一化把非空原件压成了空串（${html.length} 字节 -> 0）：分段 ${segment(html).length} 段`);
  return out;
}

/* ══ 逐页比较 ═════════════════════════════════════════════════════════ */
const around = (s, i, span = 200) => {
  const from = Math.max(0, i - span);
  return (from > 0 ? '…' : '') + s.slice(from, i) + '⟪此处不同⟫' + s.slice(i, i + span) + (i + span < s.length ? '…' : '');
};
const lineAt = (s, i) => {
  const nl = s.lastIndexOf('\n', i), nr = s.indexOf('\n', i);
  const line = s.slice(nl + 1, nr < 0 ? s.length : nr);
  const at = i - (nl + 1);
  const W = 1000;
  const from = Math.max(0, at - W);
  return { line, at, shown: (from > 0 ? '…' : '') + line.slice(from, from + W * 2) + (from + W * 2 < line.length ? '…' : '') };
};

let same = 0; const diffs = [], missing = [];
for (const it of items) {
  const ap = join(ACTUAL, it.rel), bp = join(BASE, it.rel);
  if (!existsSync(ap)) { missing.push(`实际侧缺件：${it.rel}`); continue; }
  if (!existsSync(bp)) { missing.push(`判地侧缺件：${it.rel}`); continue; }
  const A = normalize(readFileSync(ap, 'utf8'));
  const B = normalize(readFileSync(bp, 'utf8'));
  if (A === B) { same++; continue; }
  let i = 0; const n = Math.min(A.length, B.length);
  while (i < n && A[i] === B[i]) i++;
  const la = lineAt(A, i), lb = lineAt(B, i);
  diffs.push({ rel: it.rel, i, a: A, b: B, la, lb });
}

const N = items.length;
if (!missing.length && !diffs.length) {
  console.log(`${same}/${N} 结构同构（kind=${KIND}${DOMAIN ? ` domain=${DOMAIN}` : ''}；规则 1–6 归一化后逐字节相同）`);
  console.log(`RESULT: PASS same=${same}/${N} diff=0 missing=0`);
  process.exit(0);
}
console.log(`${same}/${N} 结构同构；不同 ${diffs.length} 页、缺件 ${missing.length} 页 -> 不可发`);
for (const m of missing) console.log(`  RED: ${m}`);
for (const d of diffs.slice(0, 20)) {
  console.log(`  ── 第 ${d.rel} 页不同`);
  console.log(`     首个不同字符位置：${d.i}（实际侧长 ${d.a.length} / 判地侧长 ${d.b.length}）`);
  console.log(`     所在行（实际侧，长 ${d.la.line.length} 字符，列 ${d.la.at}）：${d.la.shown}`);
  console.log(`     所在行（判地侧，长 ${d.lb.line.length} 字符，列 ${d.lb.at}）：${d.lb.shown}`);
  console.log(`     实际侧附近：${around(d.a, d.i)}`);
  console.log(`     判地侧附近：${around(d.b, d.i)}`);
}
if (diffs.length > 20) console.log(`  （只列前 20 页，共 ${diffs.length} 页不同）`);
console.log(`RESULT: FAIL same=${same}/${N} diff=${diffs.length} missing=${missing.length}`);
process.exit(1);
