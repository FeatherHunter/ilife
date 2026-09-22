#!/usr/bin/env node
/** #869 · 备忘录六列机审（版式位、允许清单与口径按备忘录域重写，不是改两行名单）。
 *
 * 形状照 `docs/skills/skill-bill/t407-v8-style-audit.mjs`（有的四件：逐件一行读数 ＋ 逐条汇总 ＋
 * 逐行明细 ＋ 0／1／2 退出码），位置四分与「共享层 vs 本页」两套读数照
 * `docs/skills/skill-bill/t417-query-audit.mjs`，摘要行 `RESULT: …` 形照
 * `packages/skill-home/scripts/audit-separators.mjs`（同族先例）。
 * 本件**不碰**被审产物，只出读数与红绿；也不碰账单域那件（它只给形状）。
 *
 * 六列（口径出处 `docs/skills/skill-memo-ilife/t849-视觉基准.md` §2／§3／§4）：
 *   ① 双端断点     共享层与本页两处有没有 820 断点；断点集是否落在仓内集合（读数）——全页无 820 即红
 *   ② 手机端手法   触摸目标 ≥44px（红）／自约束 max-width／塌列／窄屏内距／触屏两件／viewport-fit（读数）
 *   ③ 代码层面     页内自造样式块数、内联 style 数、本页字面色值数（本页样式块 > 0 或本页字面色值 > 0 即红）
 *   ④ 重复句       同一文案在一页出现 ≥2 次即红（「同事实一页一处」）
 *   ⑤ 分隔符懒政   `·`／`|`／`｜` 落在版式位或正文位即红（数据位、载荷位、眉头与页标题写法位豁免）
 *   ⑥ 英文裸词与半角标点  文案面里出允许清单之外的 ASCII 字母或半角标点即红
 *
 * 三处按备忘录域重定的口径（本件与被审产物都不改，只按它判）：
 *   1. **文案面三分**：静态可见文本按最内元素类名分「版式位／标题写法位／数据位／载荷位／正文位」；
 *      载荷（`<script id="payload">` 里那份 JSON，运行时渲染成页面的源）按键路径分「文案／数据／载荷」。
 *      **单元格与回显槽位的 `·` 算数据不算文案**（明细行 `#编号 · [分类] · 内容 · 时间` 是数据本来的样子）；
 *      载荷里的 `meta`／`copy_log`／`generated_at` 是载荷位（复制日志正文不上屏，不判）。
 *   2. **标题写法口径**：眉头（`eyebrow`）与页标题（`hero` ／ 裸 `h1` ／ `<title>` ／ 载荷 `title`）
 *      允许保留一个 `·`（照 t407 整改裁定），逐处照打、不进红；章节标题与其余可见文案不豁免。
 *   3. **允许清单**：文案面里「日期／时间／记录号 `#数字`／通用术语 `AI`」按允许清单放过，
 *      其余 ASCII 字母算英文裸词、其余半角标点算半角标点。理由逐条写在下面的 `ALLOW` 里。
 *
 * 名单（不许在件里手抄）：名单来自 `t856-manifest.json` 派生的 `t856-audit-list.json`
 * （`t856-gen-audit-list.mjs` 产出，34 件；排除手机墙／桌面墙／总索引／链路总表）。本件只消费：
 *   - 批目录模式（目录里有 `t856-audit-list.json`）：名单点名的件逐件必须在，缺一件即红（点名）。
 *   - 页群目录模式（目录里没有名单 json，名单退回仓内 `t856-manifest.json`）：只审名单 ∩ 目录，
 *     缺件不判（本目录不是整批），只报「命中 N／名单 M」；一件都没命中即 exit 2。
 *
 * 用法（仓根）：
 *   node tooling/run-locked.mjs --ticket <票号> -- node docs/skills/skill-memo-ilife/t869-机审.mjs --dir <页群目录>
 *   node docs/skills/skill-memo-ilife/t869-机审.mjs --dir <不存在的目录>     → 反例，exit 2
 * 选项：`--dir <目录>`（必给）／`--json <落点>`（逐件读数落盘）／`--quiet`（不打逐行明细）。
 * 退出码：0 全绿；1 有命中或缺件；2 用法错。
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 名单的产出者（只读消费；本件不生成、不改写）。 */
const MANIFEST = join(HERE, 't856-manifest.json');
const LIST_NAME = 't856-audit-list.json';
/** 仓内既有断点集合（`t849-视觉基准.md` §2：断点只许用既有的 400／640／820／1001／1200；500 是通用帮助模板那一档）。 */
const BREAKPOINTS = new Set([400, 500, 640, 820, 1001, 1200]);
/** 版式位：分隔符落在这里就是拿标点当版式（徽章／副标题／说明行／卡片副行／表头说明／阻断条标题）。 */
const DESIGN_CLS = new Set(['badge', 'badges', 'detail-badge', 'pill', 'chip', 'lead', 'subtitle',
  'hint', 'kpi', 'kpi-hint', 'kpi-label', 'hm-empty-hint', 'hm-toast-title', 'hm-toast-detail',
  'hm-error-title', 'status-title', 'status-sub', 'status-desc', 'status-meta', 'fact', 'facts',
  'meta', 'small', 'notice', 'err-list', 'caption', 'data-table-caption',
  'ilife-block-chip', 'ilife-block-kpi-card-title', 'ilife-block-fact-strip-label',
  'ilife-block-media-caption', 'ilife-block-timeline-note', 'ilife-block-copy-block-title']);
/** 标题写法位：眉头与页标题允许保留一个分隔符（进读数、不进红）。 */
const TITLE_CLS = new Set(['hero', 'eyebrow', 'page-shell-eyebrow', 'page-shell-title']);
const TITLE_TAGS = new Set(['h1', 'title']);
/** 数据位：单元格／明细行／回显槽位／键值行／读屏专用文案——`·` 在这里是数据本来的样子。 */
const DATA_CLS = new Set(['rows', 'kv', 'content', 'item-content', 'note-content', 'wish-content',
  'data-panel', 'detail-body', 'item-head', 'note-head', 'wish-head', 'item-id', 'note-id', 'wish-id',
  'item-list', 'item', 'note', 'wish', 'data-table-cell', 'param-form-input', 'param-form-label',
  'param-form-required', 'sr-only']);
/** 载荷位：复制载荷、写库指令、复制区按钮那一排（标点是载荷本来的样子，不是页面文案）。 */
const PAYLOAD_CLS = new Set(['pre-block-code', 'copy-btn', 'copy-menu', 'cmd', 'hm-actions']);
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'col', 'area', 'base', 'wbr']);
/** ⑤ 命中字符：间隔号、半角竖线、全角竖线（`；`／`;` 不进红——大量是正经句末分号，t407 同口径）。 */
const SEP_CHARS = /[·|｜]/g;
/** ⑥ 允许清单（逐条带理由）：放过之后还剩下的 ASCII 字母＝英文裸词，剩下的半角标点＝半角标点。 */
const ALLOW = [
  [/\d{4}-\d{2}-\d{2}/g, '日期（2026-09-21）'],
  [/\d{1,2}:\d{2}(?::\d{2})?/g, '时间（19:26:06）'],
  [/#\d+/g, '记录号（#2）：数据引用，不是标点懒政'],
  [/\bAI\b/g, '通用术语 AI（页面写「粘贴给 AI」，无更清楚的中文替词）'],
  [/\b(?:JSON|CSV)\b/g, '复制数据三格式菜单的两个格式名（#820 起与卡路里同形，#247）：用户点的就是它们，'
    + '同属面向用户的专名而不是内部标识符（同一条裁定见卡路里 test/t401c-页面机器话探针.test.mjs 的 「JSON 是复制数据三格式菜单里的格式名」）'],
];
/** 半角标点集：中文文案里冒出这几个即命中（`.` 只在不紧贴数字时算，故先把小数抹掉）。 */
const HALF = /[,;:!?()[\]{}"'<>/\\~.`]/;
const HALF_SKIP_CTX = /\d+\.\d+/g;
/** 共用件债：同一行里既有「复制数据／复制日志」又有版式位的分隔符＝复制区说明行那一族（归 #870 清）。 */
const SHARED_COPY_HINT = /复制数据|复制日志/;
/** 符号顶替文字（`t849-视觉基准.md` §3：范围符一律写「至」、`→` 写「到」）：只出旁证读数，红由五维尺 H4 扣。 */
const SYMBOL_SUB = /[→←~～]/;
/** 零宽字符与字面 BOM：比句时先抹掉（照 t407）。 */
const MASK = /[\u200b\ufeff]/g;

const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : '';
};
const DIR = argOf('--dir');
const JSON_OUT = argOf('--json');
const QUIET = process.argv.includes('--quiet');
const usage = '用法：node docs/skills/skill-memo-ilife/t869-机审.mjs --dir <页群目录> [--json <落点>] [--quiet]';

if (DIR === '') {
  console.log(usage);
  console.log('RESULT: ABORT exit=2 :: 必须显式给 --dir <页群目录>');
  process.exit(2);
}
const dir = resolve(DIR);
if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.log(usage);
  console.log('RESULT: ABORT exit=2 :: --dir 不是目录 ' + DIR);
  process.exit(2);
}

/* ── 名单（只消费；机器派生，不手抄） ───────────────────────────────────── */
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^\ufeff/, ''));
const listPath = join(dir, LIST_NAME);
const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html')).sort();
let register;
let mode;
let registerNote;
let notShipped = [];
if (existsSync(listPath)) {
  mode = '批目录';
  const list = readJson(listPath);
  register = Array.isArray(list.files) ? list.files : [];
  notShipped = Array.isArray(list.notShipped) ? list.notShipped : [];
  registerNote = '名单来源 ' + LIST_NAME + '（' + (list.batch ?? '未标批名') + '）· 排除 '
    + (list.excludes ?? []).length + ' 项 · 豁免 ' + notShipped.length + ' 项';
  if (register.length === 0) {
    console.log(usage);
    console.log('RESULT: ABORT exit=2 :: 名单里没有 files：' + LIST_NAME);
    process.exit(2);
  }
} else {
  mode = '页群目录';
  if (!existsSync(MANIFEST)) {
    console.log(usage);
    console.log('RESULT: ABORT exit=2 :: 目录里没有 ' + LIST_NAME + '，仓内又没有册子清单 ' + MANIFEST);
    process.exit(2);
  }
  const mf = readJson(MANIFEST);
  register = (mf.rows ?? []).map((r) => r.file).filter((x) => typeof x === 'string' && x !== '');
  notShipped = Array.isArray(mf.notShipped) ? mf.notShipped : [];
  registerNote = '名单来源 ' + MANIFEST.split(/[\\/]/).pop() + '（' + (mf.batch ?? '未标批名')
    + '，册子派生的 ' + LIST_NAME + ' 不在本目录）';
}
/** 名单对册子：名单里出现册子没有的名字＝手抄名单与册子漂了（缺什么就报什么，不进白）。 */
const drift = [];
if (existsSync(MANIFEST)) {
  const known = new Set((readJson(MANIFEST).rows ?? []).map((r) => r.file));
  for (const n of register) if (!known.has(n)) drift.push(n);
}
/** 盘上实例名：名单名逐字相同，或「名单主体 ＋ 下划线 ＋ 时间戳 ＋ .html」（造册前的盘上实例名）。
 *  时间戳只接在主体后面（`搜备忘_20260921_192606.html`），`备忘改分类-批量` 不会冒充 `备忘改分类`。 */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchesName = (file, name) => {
  if (file === name) return true;
  const body = name.replace(/\.html$/i, '');
  return new RegExp('^' + escapeRe(body) + '_\\d{8}[T_]?\\d{0,6}\\.html$').test(file);
};
const audited = [];
const missing = [];
for (const name of register) {
  const hits = files.filter((f) => matchesName(f, name));
  if (hits.length === 0) missing.push(name);
  for (const h of hits) audited.push({ file: h, name });
}
const dropped = files.filter((f) => !audited.some((a) => a.file === f));
if (audited.length === 0) {
  console.log(usage);
  console.log('RESULT: ABORT exit=2 :: 本目录里没有名单点名的产物（目录 ' + files.length
    + ' 件 .html，名单 ' + register.length + ' 件；先按名单名造册）');
  process.exit(2);
}

/* ── 位置四分与可见文本 ─────────────────────────────────────────────────── */
/** 抹掉整段但不挪动偏移（换行原样留下），用于「先把样式与脚本挖空再找 <body>」。 */
const blankKeepLines = (s) => s.replace(/[^\n]/g, ' ');
const stripBlocks = (html) => html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blankKeepLines);
const classTokens = (cls) => String(cls).split(/\s+/).filter(Boolean);
const posOf = (cls, tag) => {
  const tokens = classTokens(cls);
  if (tokens.some((t) => DATA_CLS.has(t))) return '数据位';
  if (tokens.some((t) => PAYLOAD_CLS.has(t))) return '载荷位';
  if (tokens.some((t) => TITLE_CLS.has(t)) || TITLE_TAGS.has(tag)) return '标题写法位';
  if (tokens.some((t) => DESIGN_CLS.has(t))) return '版式位';
  return '正文位';
};
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

/** 单遍标签栈扫描：逐段可见文本，带上「最内一个带 class 的元素」与行号（照 t417 的扫描器口径）。 */
function walkSegments(area) {
  const out = [];
  const stack = [];
  let cursor = 0;
  const take = (end) => {
    const raw = area.slice(cursor, end);
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text !== '') {
      const inner = [...stack].reverse().find((x) => x.cls);
      out.push({
        text,
        cls: inner ? inner.cls : '',
        tag: stack.length ? stack[stack.length - 1].name : '',
        at: cursor,
      });
    }
    cursor = end;
  };
  for (const t of area.matchAll(/<[^>]*>/g)) {
    take(t.index);
    cursor = t.index + t[0].length;
    const name = (t[0].match(/^<\/?\s*([a-z0-9]+)/i) ?? [])[1]?.toLowerCase() ?? '';
    if (t[0].startsWith('</')) {
      const keep = stack.lastIndexOf(name);
      if (keep >= 0) stack.length = keep;
    } else if (!VOID.has(name) && !t[0].endsWith('/>')) {
      stack.push({ name, cls: (t[0].match(/class="([^"]*)"/) ?? [])[1] ?? '' });
    }
  }
  take(area.length);
  return out;
}

/** 载荷面（运行时渲染文本的源）：`<script id="payload">` 那份 JSON 按键路径分文案／数据／载荷。 */
function payloadFace(html) {
  const m = html.match(/<script[^>]*id="payload"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return { state: '无载荷块', copy: [], data: [] };
  const raw = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
  let p;
  try {
    p = JSON.parse(raw);
  } catch (e) {
    return { state: '载荷未注入或解析失败（' + String(e.message).slice(0, 60) + '）', copy: [], data: [] };
  }
  const copy = [];
  const data = [];
  const push = (list, key, value) => {
    if (typeof value === 'string' && value.trim() !== '') list.push({ key, text: value });
  };
  const d = p.data ?? {};
  const snap = (d.scene ?? {}).snapshot ?? null;
  push(copy, 'message（副标题）', p.message ?? d.subtitle);
  if (snap) {
    push(copy, 'title（页标题）', snap.title);
    (snap.summary ?? []).forEach((s, i) => push(copy, 'summary[' + i + ']（卡片副行）', s));
    (snap.sections ?? []).forEach((sec, i) => {
      push(copy, 'heading[' + i + ']（章节标题）', sec.heading);
      (sec.rows ?? []).forEach((r, j) => push(data, 'rows[' + i + '][' + j + ']（明细行）', r));
    });
  } else {
    push(copy, 'data.title（页标题）', d.title);
    push(copy, 'data.subtitle（副标题）', d.subtitle);
    for (const k of ['items', 'item', 'rows', 'errors', 'list']) {
      const v = d[k];
      if (typeof v === 'string') push(data, k + '（明细行）', v);
      else if (Array.isArray(v)) {
        v.forEach((it, i) => {
          if (typeof it === 'string') push(data, k + '[' + i + ']（明细行）', it);
          else if (it && typeof it === 'object') {
            for (const [kk, vv] of Object.entries(it)) push(data, k + '[' + i + '].' + kk + '（明细字段）', vv);
          }
        });
      }
    }
  }
  return { state: '载荷已解析（文案 ' + copy.length + ' 段／数据 ' + data.length + ' 段）', copy, data };
}

/** 单件读数。 */
function auditFile(file) {
  const html = readFileSync(join(dir, file), 'utf8');
  const bodyAt = stripBlocks(html).search(/<body\b/i);
  const headHtml = bodyAt < 0 ? '' : html.slice(0, bodyAt);
  const pageHtml = bodyAt < 0 ? html : html.slice(bodyAt);
  const stylesOf = (s) => [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const headCss = stylesOf(headHtml);
  const pageCss = stylesOf(pageHtml);
  const inlineCss = [...pageHtml.matchAll(/\sstyle="([^"]*)"/g)].map((m) => m[1]).join(';\n');
  const ownCss = pageCss + '\n' + inlineCss;
  const css = headCss + '\n' + ownCss;
  const live = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const colorsOf = (s) => new Set((live(s).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [])
    .map((c) => c.toLowerCase().replace(/\s+/g, '')));
  const breakpoints = [...new Set((live(css).match(/(?:max|min)-width:\s*(\d+)px/g) ?? [])
    .map((s) => Number(s.replace(/\D/g, ''))))].sort((a, b) => a - b);

  // ① 双端断点
  const bp820 = /@media[^{]*max-width:\s*820px/.test(live(css));
  const bp820Head = /@media[^{]*max-width:\s*820px/.test(live(headCss));
  const bp820Page = /@media[^{]*max-width:\s*820px/.test(live(ownCss));
  const bpOutlaw = breakpoints.filter((n) => !BREAKPOINTS.has(n));

  // ② 手机端四条手法 ＋ 触屏两件 ＋ 视口
  const seg820 = (live(css).match(/@media[^{]*max-width:\s*820px[^{]*\{([\s\S]{0,4000})/) ?? [])[1] ?? '';
  // 触摸目标：`min-height|min-width` 落 44–99px 才算（照 t407 口径）。
  // 不取 `\d{3,}`：`min-width:300px` 那种是容器宽，拿它当触摸目标会把每一页都判绿。
  const touch44 = /(min-height|min-width):\s*(4[4-9]|[5-9]\d)px/.test(live(css));
  const selfWidth = /max-width:\s*\d+/.test(live(css));
  const collapse = /flex-wrap|grid-template-columns/.test(live(css));
  const innerPad = /padding:/.test(live(css));
  const padIn820 = /padding:/.test(seg820);
  const tapThree = /-webkit-tap-highlight-color/.test(live(css)) && /touch-action/.test(live(css));
  const viewportFit = /viewport-fit=cover/.test(html);

  // ③ 代码层面
  const ownBlocks = (pageHtml.match(/<style/gi) ?? []).length;
  const inlineCount = (pageHtml.match(/\sstyle="/g) ?? []).length;
  const ownColors = colorsOf(ownCss);

  // 可见文本（挖掉样式／脚本／复制载荷）与载荷面
  // 注释也要先剥：同步报告页里那条 `<!-- … err>0 … -->` 带一个 `>`，不先剥就会把注释尾巴
  // 当可见文本点名（同 t407／居家件的口径：注释不是文案）。顺序＝样式脚本 → 复制载荷 → 注释。
  const area = pageHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[\s\S]*?"/g, '')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const segments = walkSegments(area)
    .map((s) => ({ ...s, pos: posOf(s.cls, s.tag), line: lineOf(area, s.at) }));
  const face = payloadFace(html);
  /** 文案面＝静态可见文本里非数据、非载荷的段 ＋ 载荷文案面（数据位与载荷位不进判据）。 */
  const judgement = [];
  for (const s of segments) {
    if (s.pos === '数据位' || s.pos === '载荷位') continue;
    judgement.push({
      where: s.pos + (s.cls ? '<' + s.cls + '>' : '<' + (s.tag || '无 class') + '>'),
      line: 'L' + s.line,
      text: s.text,
    });
  }
  for (const c of face.copy) {
    judgement.push({
      where: (c.key.startsWith('title') ? '标题写法位·载荷 ' : '版式位·载荷 ') + c.key,
      line: '—',
      text: c.text,
      isPayloadTitle: c.key.startsWith('title'),
    });
  }
  // ⑤ 分隔符懒政（版式位／正文位命中；标题写法位只照打）——下面 segments 与载荷文案一起走
  const sepDesign = [];
  const sepTitle = [];
  const collect = (where, line, text, isTitle) => {
    const seps = text.match(SEP_CHARS);
    if (!seps) return;
    const item = { where, line, text: text.slice(0, 200), hits: seps.length };
    if (isTitle) sepTitle.push(item);
    else sepDesign.push(item);
  };
  for (const s of segments) {
    if (s.pos === '数据位' || s.pos === '载荷位') continue;
    collect(s.pos + (s.cls ? '<' + s.cls + '>' : '<' + s.tag + '>'), 'L' + s.line, s.text, s.pos === '标题写法位');
  }
  for (const c of face.copy) {
    const isTitle = c.key.startsWith('title');
    collect((isTitle ? '标题写法位·载荷 ' : '版式位·载荷 ') + c.key, '—', c.text, isTitle);
  }
  const sharedCopyDebt = sepDesign.filter((s) => SHARED_COPY_HINT.test(s.text)).length;

  // ④ 重复句（同事实一页一处；数据位与载荷位不参与）
  //    载荷 `title` 不进这一列：它是页标题的**源**（模板里运行时由它覆写静态页标题那一处），
  //    不是「同一条事实在同页又显示了一遍」；既不算它的份，也不拿它把静态标题判成重复。
  const dupProse = judgement
    .filter((j) => !j.isPayloadTitle)
    .map((j) => j.text.replace(MASK, '').trim())
    .filter((t) => t.length > 6);
  const dupes = [...new Set(dupProse.filter((s) => dupProse.filter((x) => x === s).length > 1))];

  // ⑥ 英文裸词与半角标点
  const asciiHits = [];
  const halfHits = [];
  for (const s of judgement) {
    const rest = ALLOW.reduce((acc, [re]) => acc.replace(re, ' '), s.text);
    if (/[A-Za-z]/.test(rest)) asciiHits.push({ where: s.where, line: s.line, text: s.text.slice(0, 200) });
    if (HALF.test(rest.replace(HALF_SKIP_CTX, ' '))) {
      halfHits.push({ where: s.where, line: s.line, text: s.text.slice(0, 200) });
    }
  }
  // 旁证：符号顶替文字（`→`／`~`）——只报读数，红由五维尺 H4 扣，本件不进红（t849 §3）。
  const symbolSub = judgement
    .filter((s) => SYMBOL_SUB.test(s.text))
    .map((s) => ({ where: s.where, line: s.line, text: s.text.slice(0, 200) }));

  return {
    file, name: file, bytes: Buffer.byteLength(html, 'utf8'),
    bp820, bp820Head, bp820Page, breakpoints, bpOutlaw,
    touch44, selfWidth, collapse, innerPad, padIn820, tapThree, viewportFit,
    ownBlocks, inlineCount, ownColors: ownColors.size, ownColorList: [...ownColors].slice(0, 8),
    headCss: headCss.length, face: face.state,
    sepDesign, sepTitle, sharedCopyDebt, dupes, asciiHits, halfHits, symbolSub,
    judged: judgement.map((j) => ({ where: j.where, line: j.line, text: j.text.slice(0, 200), payloadTitle: !!j.isPayloadTitle })),
    judgementCount: judgement.length,
  };
}

/* ── 跑 ─────────────────────────────────────────────────────────────────── */
const rows = [];
let broke = 0;
for (const a of audited) {
  try {
    rows.push(auditFile(a.file));
  } catch (e) {
    broke += 1;
    rows.push({ file: a.file, name: a.file, error: String(e.message) });
    console.log('FILE ' + a.file + '  PARSE-FAIL :: ' + e.message);
  }
}

const isRed = (r) => !!r.error || !r.bp820 || !r.touch44 || r.ownBlocks > 0 || r.ownColors > 0
  || r.dupes.length > 0 || r.sepDesign.length > 0 || r.asciiHits.length > 0 || r.halfHits.length > 0;
const green = rows.filter((r) => !isRed(r)).length;
const listMiss = mode === '批目录' ? missing.filter((m) => !notShipped.includes(m)) : [];
const failed = green !== rows.length || listMiss.length > 0 || broke > 0 || drift.length > 0;

console.log('备忘录六列机审 · 目录=' + dir);
console.log('执行模式：' + mode + '（' + (mode === '批目录'
  ? '名单点名的件逐件必须在，缺件即红'
  : '只审名单 ∩ 目录，缺件不判——本目录不是整批') + '）');
console.log(registerNote + '；本目录 .html ' + files.length + ' 件，名单命中 ' + audited.length + ' 件');
if (dropped.length > 0) {
  console.log('名单外未审 ' + dropped.length + ' 件（墙／索引／链路／对照／老样不进判据）：' + dropped.join('、'));
}
for (const r of rows) {
  if (r.error) continue;
  console.log('FILE ' + r.file
    + '  ①' + (r.bp820 ? '0' : '1') + ' ②' + (r.touch44 ? '0' : '1')
    + ' ③' + (r.ownBlocks > 0 || r.ownColors > 0 ? '1' : '0')
    + ' ④' + (r.dupes.length > 0 ? '1' : '0') + ' ⑤' + (r.sepDesign.length > 0 ? '1' : '0')
    + ' ⑥' + (r.asciiHits.length + r.halfHits.length > 0 ? '1' : '0')
    + '   [断点 ' + (r.breakpoints.join('/') || '无') + (r.bpOutlaw.length ? ' 越界 ' + r.bpOutlaw.join('/') : '')
    + '｜触摸44 ' + (r.touch44 ? '有' : '无') + '｜塌列 ' + (r.collapse ? '有' : '无')
    + '｜窄屏内距 ' + (r.padIn820 ? '有' : '无') + '｜触屏两件 ' + (r.tapThree ? '有' : '无')
    + '｜viewport-fit ' + (r.viewportFit ? '有' : '无')
    + '｜本页样式块 ' + r.ownBlocks + ' 内联 ' + r.inlineCount + ' 本页色值 ' + r.ownColors
    + '｜共享层CSS ' + r.headCss + '｜' + r.face + ']');
}
if (!QUIET) {
  const dump = (label, pick) => {
    const has = rows.filter((r) => !r.error && pick(r).length > 0);
    if (has.length === 0) return;
    console.log('\n' + label);
    for (const r of has) {
      const hits = pick(r);
      console.log('  [' + r.file + '  ' + hits.length + ' 处]');
      for (const h of hits) console.log('      ' + h.line + '  ' + h.where + '  ' + h.text);
    }
  };
  dump('① 双端断点缺失（点名页）：', (r) => (r.bp820 ? [] : [{ line: '—', where: '全页样式', text: '找不到 @media (max-width: 820px)' }]));
  dump('② 触摸目标缺失（点名页）：', (r) => (r.touch44 ? [] : [{ line: '—', where: '全页样式', text: '找不到任何 ≥44px 的 min-height／min-width' }]));
  dump('③ 代码层面（点名页）：', (r) => [
    ...(r.ownBlocks > 0 ? [{ line: '—', where: '页内样式块', text: r.ownBlocks + ' 块（外观该全部来自共享层）' }] : []),
    ...(r.ownColors > 0 ? [{ line: '—', where: '本页字面色值', text: r.ownColorList.join(' ') }] : []),
  ]);
  dump('④ 重复句（点名页）：', (r) => r.dupes.map((d) => ({ line: '—', where: '同页 ≥2 次', text: d.slice(0, 200) })));
  dump('⑤ 分隔符懒政（版式位与正文位，点名页与位置）：', (r) => r.sepDesign.map((s) => ({
    ...s,
    where: s.where + (SHARED_COPY_HINT.test(s.text) ? '  ← 共用件债·复制区说明行（归 #870）' : ''),
  })));
  dump('⑤b 标题写法位保留的分隔符（允许，逐处照打）：', (r) => r.sepTitle.map((s) => ({ ...s, where: s.where + '（允许保留一个）' })));
  dump('⑤c 符号顶替文字（`→`／`~` 旁证，归五维尺 H4，不进本件红）：', (r) => r.symbolSub.map((s) => ({ ...s, where: s.where + '（符号顶替）' })));
  dump('⑥ 英文裸词（点名页与位置）：', (r) => r.asciiHits.map((s) => ({ ...s, where: s.where + '（英文裸词）' })));
  dump('⑥b 半角标点（点名页与位置）：', (r) => r.halfHits.map((s) => ({ ...s, where: s.where + '（半角标点）' })));
}

console.log('\n===== 逐列汇总（共 ' + rows.length + ' 件）=====');
const col = (pick) => rows.filter((r) => !r.error && pick(r)).map((r) => r.file);
const cols = [
  ['① 双端断点缺失', col((r) => !r.bp820)],
  ['② 触摸目标缺失', col((r) => !r.touch44)],
  ['③ 页内自造样式或字面色值', col((r) => r.ownBlocks > 0 || r.ownColors > 0)],
  ['④ 重复句', col((r) => r.dupes.length > 0)],
  ['⑤ 分隔符懒政', col((r) => r.sepDesign.length > 0)],
  ['⑥ 英文裸词或半角标点', col((r) => r.asciiHits.length + r.halfHits.length > 0)],
  ['读不动的件（PARSE-FAIL）', rows.filter((r) => r.error).map((r) => r.file)],
];
for (const [k, v] of cols) console.log(k + '：' + (v.length === 0 ? '0 件' : v.length + ' 件 → ' + v.join('、')));
const sum = (pick) => rows.reduce((a, r) => a + (r.error ? 0 : pick(r)), 0);
console.log('  合计：④ ' + sum((r) => r.dupes.length) + ' 句；⑤ ' + sum((r) => r.sepDesign.length)
  + ' 处（其中共用件债·复制区说明行 ' + sum((r) => r.sharedCopyDebt) + ' 处）；'
  + '⑤b 标题写法位 ' + sum((r) => r.sepTitle.length) + ' 处；'
  + '⑤c 符号顶替（旁证）' + sum((r) => r.symbolSub.length) + ' 处；'
  + '⑥ 英文裸词 ' + sum((r) => r.asciiHits.length) + ' 处／半角标点 ' + sum((r) => r.halfHits.length) + ' 处');
if (mode === '批目录') {
  console.log('缺件（名单点名而目录里没有）：' + (listMiss.length === 0 ? '0 件' : listMiss.length + ' 件 → ' + listMiss.join('、')));
  if (notShipped.length > 0) console.log('  豁免（名单 notShipped）：' + notShipped.join('、'));
} else if (missing.length > 0) {
  console.log('名单里本目录没有的 ' + missing.length + ' 件（页群目录模式，不判缺件）：'
    + missing.slice(0, 8).join('、') + (missing.length > 8 ? ' …' : ''));
}
console.log('名单对册子：' + (drift.length === 0 ? '0 处漂移' : drift.length + ' 件册子里没有的名字 → ' + drift.join('、')));
console.log('\nRESULT: ' + green + '/' + rows.length + (failed ? ' FAIL' : ' PASS')
  + ' ①' + cols[0][1].length + ' ②' + cols[1][1].length + ' ③' + cols[2][1].length
  + ' ④' + cols[3][1].length + ' ⑤' + cols[4][1].length + ' ⑥' + cols[5][1].length
  + ' 缺件' + (mode === '批目录' ? listMiss.length : '—') + ' 名单=' + mode);

if (JSON_OUT !== '') {
  writeFileSync(resolve(JSON_OUT), JSON.stringify({
    at: new Date().toISOString(), dir, mode, registerNote,
    register: register.length, audited: rows.map((r) => r.file), dropped, missing: listMiss, drift,
    green, total: rows.length, failed, rows,
  }, null, 1), 'utf8');
}
process.exit(failed ? 1 : 0);
