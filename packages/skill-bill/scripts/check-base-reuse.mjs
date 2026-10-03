#!/usr/bin/env node
/** #1072 · **复用门禁**（黑名单 grep 门）：页面席只许调 `base-paint/blocks` 的公开接口。
 *
 *  被机器化的那句铁律（handoff §4／票 1072 读数 3）：
 *
 *      页面席**只许调 base 公开接口**；禁手写 `--paper`／圆角／投影／复制三件（黑名单 grep 门）。
 *
 *  在此之前它只是一句文字约定，没有机器执行；本件是它第一次有退出码。
 *
 *  ## 扫描面（缩面＝放宽，本件不提供缩面开关）
 *
 *  `packages/skill-`＋包名＋`/src/` 下的全部 `.ts`（含 `*Css.ts`）。**明确不扫 `packages/base-render/`**：
 *  base 席改自己的公共件是合法工作（1024 §1-1／§1-2 已批 `copy-button` 的 `▾` 口径与宽解绑、
 *  `action-bar` 的 ghost 行改 flex 左起）——扫到 base 会让这道门第一版就自伤（票 1072 读数 6）。
 *
 *  ## 命中面四类（票 1072 原文，逐条对应）
 *
 *  | 规则 | 抓什么 | 放行什么 |
 *  |---|---|---|
 *  | 甲 | 自定义纸色／面色变量（`--paper:`、`--card-bg:` 之类**自造件**） | `base-paint/blocks` 导出的 token（`--ilife-*` 皮肤 token ＋ 11 个冻结旧名） |
 *  | 乙 | 圆角字面量（`border-radius` **直接写 px**） | 走皮肤 token 的 `var(--ilife-radius-*)`；重置值 `0`／圆形 `50%`（都不是"写 px 的圆角"） |
 *  | 丙 | `box-shadow` 手写投影 | `var(--ilife-shadow*)`／`var(--shadow)`（读 token）与 `none`（关投影，不是写投影） |
 *  | 丁 | 重写复制按钮／行动条的**样式块** | 只**调** base 公开接口的正常写法（`renderSheetFrame`／`promptBoxCss` 这类符号名一个都不碰） |
 *
 *  ## 已登记例外（票 1072 关键设计，不许省）
 *
 *  例外表是**人读随维护**的一份 Markdown：`docs/base/base-render/base-reuse-例外.md`。
 *  本件**只读那一处**（例外的事实只有一处），逐条点名输出，并守三条：
 *  每条必须带一个裁定票号；票号指向已关闭的票 ⇒ 门禁自己 `exit 1`；条目 > 5 ⇒ 门禁自己 `exit 1`。
 *  **不许为了门禁变绿而把新违规登记成例外**——每条新例外都要有独立裁定票（票 1072 原文）。
 *
 *  ## 存量基线（棘轮，两向恒等，不是 ≤）
 *
 *  这道门第一版落地时，仓里**已经有**大量存量违规（其他五家技能的历史页面）。它们不是本门的失职，
 *  是历史欠债。按仓规既有形状（`scripts/ratchet-frozen-686.mjs`＋`check-ratchet-tight.mjs`）处理：
 *
 *  · **冻结基线**住 `docs/base/base-render/base-reuse-存量基线.md`（人读随维护），键＝`件｜规则｜匹配文本`（**不含行号**：
 *    行号会随别席改文件漂移，拿它当键会造假红）；行号只在报告里点名。
 *  · 判据是**恒等**：`实况 ≤ 冻结值` **且** `冻结值 ≤ 实况` ⇒ 逐项相等。
 *      —— 实况多出 ⇒ **红**（新增违规，棘轮不许涨）；
 *      —— 冻结值有而实况没有 ⇒ **红**（有人修好了却没下调冻结值，棘轮退化成摆设）。
 *  · 这与「已登记例外」是**两件不同的东西**：例外＝有裁定票的**故意**违规；基线＝**无裁定票的历史欠债**，
 *    每条都在票 1072 的「遗留出口」开票挂着，只许随修好逐条删除，不许新增。
 *
 *  ## 跑法（workdir＝仓根；不经 shell、不依赖 PATH）
 *
 *     node packages/skill-bill/scripts/check-base-reuse.mjs                    # 门
 *     node packages/skill-bill/scripts/check-base-reuse.mjs --print-exceptions  # 加打例外表逐条
 *     node packages/skill-bill/scripts/check-base-reuse.mjs --report            # 只报实况（基线对账之外的读数面）
 *
 *  本件只读 `packages/skill-<包名>/src/**` 与两份人读表，**不 import 任何构建产物**、不写工作区。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');                       // 仓根
const PKG = 'packages';

/** 例外表与存量基线表（**事实各只住一处**，本件只读）。 */
export const EXCEPTION_DOC = 'docs/base/base-render/base-reuse-例外.md';
export const BASELINE_DOC = 'docs/base/base-render/base-reuse-存量基线.md';
/** 例外条目上限（票 1072：> 5 条 ⇒ 门禁自己 exit 1，防止例外机制被当成万能豁免）。 */
export const MAX_EXCEPTIONS = 5;

/* ── base 导出的 token 名单（甲规则的放行面） ───────────────────────── */

/**
 * 皮肤 token 名单＝`base-paint/blocks` 导出的那一份，**转抄自**
 * `packages/base-render/src/components/skin/contract.ts` 的 `SKIN_TOKENS` 键集
 * （那张表是唯一事实；本件转抄是为了让门禁不依赖编译产物即可运行，
 *  `check-token-mirror.mjs` 式的对账由 base-render 自己的门负责）。
 */
const SKIN_TOKEN_NAMES = [
  'ground', 'surface', 'surface-2', 'line', 'edge',
  'ink', 'ink-2', 'ink-3',
  'accent', 'accent-text', 'accent-ink', 'accent-soft',
  'ok', 'ok-soft', 'warn', 'warn-soft', 'danger', 'danger-soft',
  'radius', 'radius-sm', 'radius-pill', 'shadow', 'shadow-pop',
  'font', 'font-num', 'font-display',
  'fs-body', 'fs-sm', 'fs-xs', 'fs-h1', 'fs-h2', 'fs-h3',
  'space', 'pad-x',
];
/** 11 个冻结旧名（`skin/index.ts` 的 `LEGACY_MAP` 键集）：老页面注入的那批，也算 base 导出的。 */
const LEGACY_TOKENS = ['--fg', '--fg2', '--fg3', '--bg', '--card', '--line', '--blue', '--blue2', '--soft', '--ok', '--shadow'];

/** 甲规则的放行集：`--ilife-<皮肤 token>` ＋ 11 个旧名。 */
const ALLOWED_VARS = new Set([
  ...SKIN_TOKEN_NAMES.map((n) => '--ilife-' + n),
  ...LEGACY_TOKENS,
]);

/* ── 四条规则 ────────────────────────────────────────────────────── */

/** 甲 · 自造 CSS 自定义属性**声明**（`--x:` 才是声明；`var(--x)` 不是）。 */
const RE_VAR_DECL = /(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g;
/** 乙 · 圆角**直接写 px**（`border-radius` 与四个角 longhand；`0`／`50%`／`var()` 不算"写 px"）。 */
const RE_RADIUS_PX = /border(?:-[a-z]+)*-radius\s*:\s*([^;{}"']*)/g;
const RE_RADIUS_PX_VAL = /(^|[\s(,])\d*\.?\d+px/;
/** 丙 · `box-shadow` 手写投影（`var(...)` 读 token 放行，`none` 是关投影不是写投影）。 */
const RE_BOX_SHADOW = /box-shadow\s*:\s*([^;{}"']*)/g;
/** 丁 · 重写复制按钮／行动条的样式块：选择器里有那三个类名，后面跟着一个声明块。 */
const RE_COPY_STYLE = /([^{};]{0,400}?\.(?:ilife-copy-btn|ilife-action-row-ghost|ilife-copy-menu-wrap)[^{};]{0,400})\{([^{}]{1,4000})\}/g;

const RULES = [
  { id: '甲', what: '自造纸色／面色变量（不是 base-paint/blocks 导出的 token）' },
  { id: '乙', what: '圆角字面量（border-radius 直接写 px，不走皮肤 token）' },
  { id: '丙', what: 'box-shadow 手写投影（不走皮肤 token）' },
  { id: '丁', what: '重写复制按钮／行动条的样式块（只许调 base 公开接口，不许自己画）' },
];

/* ── 读文件：注释置空但保留行号（否则注释里的话会被当成违规＝假红） ── */

/** 注释内容换成空格，换行原样留下 ⇒ 行号与字节偏移都不漂。 */
export function stripComments(text) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (quote !== null) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
    if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (c === '/' && n === '*') {
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i] === '\n' ? '\n' : ' '; i += 1; }
      out += '  '; i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** 偏移 → 1 基行号。 */
function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

/* ── 扫描 ────────────────────────────────────────────────────────── */

/** 扫描面＝`packages/skill-<包名>/src/` 下的全部 `.ts`。**不含 `packages/base-render/`**（票 1072 读数 6）。 */
export function scanFiles(root = ROOT) {
  const out = [];
  const pkgsDir = join(root, PKG);
  for (const e of readdirSync(pkgsDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!e.isDirectory() || !e.name.startsWith('skill-')) continue;
    const walk = (dir) => {
      for (const f of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const abs = join(dir, f.name);
        if (f.isDirectory()) walk(abs);
        else if (f.isFile() && f.name.endsWith('.ts')) out.push(abs);
      }
    };
    walk(join(pkgsDir, e.name, 'src'));
  }
  return out;
}

/** 一件源文件 → 命中列表 `{ file, line, rule, key, evidence }`。 */
export function scanFile(abs, root = ROOT) {
  const text = stripComments(readFileSync(abs, 'utf8').replace(/\r\n/g, '\n'));
  const file = relative(root, abs).split(sep).join('/');
  const hits = [];
  const push = (rule, index, evidence) => {
    hits.push({
      file,
      line: lineAt(text, index),
      rule,
      evidence: evidence.replace(/\s+/g, ' ').trim().slice(0, 160),
    });
  };
  for (const m of text.matchAll(RE_VAR_DECL)) {
    const name = m[2];
    if (ALLOWED_VARS.has(name)) continue;
    push('甲', m.index, name + ': …');
  }
  for (const m of text.matchAll(RE_RADIUS_PX)) {
    if (!RE_RADIUS_PX_VAL.test(m[1])) continue;
    push('乙', m.index, m[0].trim());
  }
  for (const m of text.matchAll(RE_BOX_SHADOW)) {
    const v = m[1].trim();
    if (v === '' || v === 'none' || /^var\(/.test(v)) continue;
    push('丙', m.index, m[0].trim());
  }
  for (const m of text.matchAll(RE_COPY_STYLE)) {
    push('丁', m.index, m[1].trim() + ' { … }');
  }
  return hits;
}

/** 扫描面全量命中（顺序稳定：按文件、再按行、再按规则）。 */
export function measure(root = ROOT) {
  const files = scanFiles(root);
  const hits = [];
  for (const abs of files) hits.push(...scanFile(abs, root));
  hits.sort((a, b) => (a.file === b.file ? (a.line - b.line || a.rule.localeCompare(b.rule)) : (a.file < b.file ? -1 : 1)));
  return { files, hits };
}

/**
 * 命中 → **基线键**（不含行号：行号会随别席改文件漂移，拿它当键＝假红）。
 * 同键的重复命中折叠成一条（同一件里同一处写法重复两遍是同一条欠债）。
 */
export const keyOf = (h) => [h.file, h.rule, h.evidence].join('｜');

/* ── 人读表解析（例外表 ＋ 存量基线表） ──────────────────────────── */

/** 取一份 Markdown 里 `<!--<marker>:begin -->` 与 `<!--<marker>:end -->` 之间那块的表格行。 */
export function tableRows(text, marker) {
  const from = '<!--' + marker + ':begin -->';
  const to = '<!--' + marker + ':end -->';
  const i = text.indexOf(from);
  const j = text.indexOf(to);
  if (i < 0 || j < 0) return [];
  return text.slice(i + from.length, j)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[\s:|-]+\|$/.test(l))
    .slice(1)                                            // 表头
    .map((l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
}

const readDoc = (root, rel) => {
  const abs = join(root, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8').replace(/\r\n/g, '\n') : null;
};

/* ── 裁定票状态（票 1072：票号缺失或指向已关闭的票 ⇒ 门禁自己 exit 1） ── */

/**
 * 查票状态。**离线可复核**：读仓内登记的票状态快照 `docs/base/base-render/base-reuse-票状态.md`。
 *
 *  为什么不用 `gh api`：这道门要进 `pnpm gen:check`（CI 每轮真跑），挂网络查询会让门禁在离线上
 * 「查不到就当没事」——那正是它要拦的病（例外指向已关闭的票却没人发现）。改成**票状态住一份入仓快照**：
 * 开着的票写 `open`，本件逐条核对；快照过期由票面维护者更新（票 1072 遗留出口里记着这件事）。
 */
export const TICKET_STATE_DOC = 'docs/base/base-render/base-reuse-票状态.md';
export function ticketStates(root = ROOT) {
  const text = readDoc(root, TICKET_STATE_DOC);
  const map = new Map();
  if (text === null) return map;
  for (const cells of tableRows(text, '票状态')) {
    const n = cells[0].replace(/^#/, '').trim();
    if (/^\d+$/.test(n)) map.set(n, cells[1].trim());
  }
  return map;
}

/* ── 报告 ────────────────────────────────────────────────────────── */

function fmt(h) { return h.file + ':' + String(h.line) + '  [' + h.rule + ']  ' + h.evidence; }

export function run(root = ROOT, opts = {}) {
  const reds = [];
  const m = measure(root);

  // ① 例外表
  const excText = readDoc(root, EXCEPTION_DOC);
  const excRows = excText === null ? [] : tableRows(excText, '例外');
  const states = ticketStates(root);
  const exceptions = [];
  for (const cells of excRows) {
    const [file, lines, ticket, why] = cells;
    const n = String(ticket).trim().replace(/^#/, '');
    exceptions.push({ file, lines, ticket: n, why });
    if (!/^\d+$/.test(n)) {
      reds.push('RED 例外缺裁定票号：' + file + ' ' + lines + '（票 1072：每条例外必须带一个裁定票号，缺失即门禁自己 exit 1）');
    } else if (!states.has(n)) {
      reds.push('RED 例外的裁定票号查不到状态：' + file + ' ' + lines + ' → #' + n
        + '（票状态快照 ' + TICKET_STATE_DOC + ' 里没有这一条；票 1072：票号缺失即门禁自己 exit 1）');
    } else if (states.get(n) !== 'open') {
      reds.push('RED 例外的裁定票已关闭：' + file + ' ' + lines + ' → #' + n + '（状态 ' + states.get(n)
        + '）。裁定既已落定，这条例外就该删掉或改成公共件，不是继续挂着');
    }
  }
  if (exceptions.length > MAX_EXCEPTIONS) {
    reds.push('RED 已登记例外 ' + exceptions.length + ' 条 > 上限 ' + MAX_EXCEPTIONS
      + '（票 1072：例外机制不许被当成万能豁免，超限门禁自己 exit 1）');
  }

  // ② 存量基线（两向恒等）
  const baseText = readDoc(root, BASELINE_DOC);
  if (baseText === null) {
    reds.push('RED 存量基线表不在：' + BASELINE_DOC + '（棘轮的事实必须住一份入仓的人读表；没有它，这道门分不出「新违规」与「历史欠债」）');
  }
  const frozen = new Set(baseText === null ? [] : tableRows(baseText, '基线').map((c) => c.join('｜')));
  const actual = new Map();
  for (const h of m.hits) {
    const k = keyOf(h);
    if (!actual.has(k)) actual.set(k, h);
  }
  const newKeys = [...actual.keys()].filter((k) => !frozen.has(k));
  const staleKeys = [...frozen].filter((k) => !actual.has(k));

  // ③ 例外命中：落在例外表登记的（件＋行段）里的，不判红
  // 行段支持 `*`（整件）、`Lx-Ly` 区间、`Lx,Ly` 多段（逗号分隔，可混用区间与单行）。
  const coversLine = (lines, line) => {
    const s = String(lines ?? '').trim();
    if (s === '*') return true;
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return false;
    for (const p of parts) {
      const mm = p.match(/^L(\d+)(?:\s*-\s*L?(\d+))?$/);
      if (!mm) continue;
      const a = Number(mm[1]);
      const b = mm[2] === undefined ? a : Number(mm[2]);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (line >= lo && line <= hi) return true;
    }
    return false;
  };
  const coveredBy = (e, h) => h.file === e.file && coversLine(e.lines, h.line);
  const inException = (h) => exceptions.some((e) => coveredBy(e, h));
  const viol = m.hits.filter((h) => !inException(h));

  console.log('SCAN-ROOT: ' + root);
  console.log('SURFACE: packages/skill-*/src/**/*.ts（不含 packages/base-render/）');
  console.log('MEASURE 件=' + m.files.length + ' 命中=' + m.hits.length
    + '（甲 ' + m.hits.filter((h) => h.rule === '甲').length
    + '／乙 ' + m.hits.filter((h) => h.rule === '乙').length
    + '／丙 ' + m.hits.filter((h) => h.rule === '丙').length
    + '／丁 ' + m.hits.filter((h) => h.rule === '丁').length + '）');
  console.log('RATCHET 冻结=' + frozen.size + ' 实况=' + actual.size
    + '；新增 ' + newKeys.length + ' 条／已修好未下调 ' + staleKeys.length + ' 条');

  console.log('');
  console.log('── 页面件违规（新写进来的，棘轮不许涨） ' + newKeys.length + ' 条 ──');
  for (const k of newKeys) console.log('RED ' + fmt(actual.get(k)) + '  ← ' + k);
  if (newKeys.length === 0) console.log('（无）');

  console.log('');
  console.log('── 已登记例外 ' + exceptions.length + ' 条（不判红，但每次都点名，让人知道它还在那儿） ──');
  if (exceptions.length === 0) console.log('（无）');
  for (const e of exceptions) {
    console.log('EXC ' + e.file + ':' + e.lines + '  裁定票 #' + (e.ticket || '（缺！）') + '  ' + e.why);
  }
  if (opts.printExceptions === true) {
    for (const e of exceptions) {
      const at = m.hits.filter((h) => coveredBy(e, h));
      console.log('EXC-HIT ' + e.file + ' 当刻命中 ' + at.length + ' 处：'
        + (at.length === 0 ? '（当前已无命中）' : at.map((h) => h.line + '[' + h.rule + ']').join('、')));
    }
  }
  console.log('已登记例外 ' + exceptions.length + ' 条（上限 ' + MAX_EXCEPTIONS + '）');

  if (staleKeys.length > 0) {
    console.log('');
    console.log('── 已修好但冻结值没下调（棘轮退化成摆设：卡路里 #294 的病） ' + staleKeys.length + ' 条 ──');
    for (const k of staleKeys) console.log('RED ' + k);
  }
  if (baseText !== null) {
    const covered = m.hits.length - newKeys.length;
    console.log('');
    console.log('── 存量欠债（已进基线，只许随修好逐条删除） ' + covered + ' 条 ──');
  }

  console.log('');
  console.log('RESULT: ' + (newKeys.length + staleKeys.length + reds.length) + '/'
    + (newKeys.length + staleKeys.length + reds.length));
  if (newKeys.length + staleKeys.length + reds.length > 0) {
    for (const r of reds) console.error(r);
    console.error('RED: 复用门禁 ' + (newKeys.length + staleKeys.length) + ' 条越界、' + reds.length + ' 条例外机制不成立');
    console.error('  修法：① 新写进来的违规 → 改调用侧走 base-paint/blocks 公开接口，别自己画；');
    console.error('       ② 已修好的 → 同窗把 ' + BASELINE_DOC + ' 里那一行删掉（棘轮只许变短）；');
    console.error('       ③ 确实该留在页面侧的 → 走裁定票，登记进 ' + EXCEPTION_DOC + '（上限 ' + MAX_EXCEPTIONS + ' 条）。');
    return 1;
  }
  console.log('PASS: 页面席没有新写进的黑名单命中（存量 ' + (m.hits.length - newKeys.length) + ' 条已进基线，例外 '
    + exceptions.length + ' 条已登记）');
  return 0;
}

function main(argv) {
  const args = new Set(argv);
  const unknown = argv.filter((a) => a.startsWith('--') && a !== '--print-exceptions' && a !== '--report');
  if (unknown.length > 0) {
    console.error('未知参数：' + unknown.join('、') + '（可用：--print-exceptions，--report）');
    return 2;
  }
  try {
    const code = run(ROOT, { printExceptions: args.has('--print-exceptions') });
    if (args.has('--report')) {
      // --report 只看实况读数面，不判红（探针用：量某一版到底有多少命中）。
      const m = measure(ROOT);
      console.log('');
      console.log('REPORT 命中 ' + m.hits.length + ' 条：');
      for (const h of m.hits) console.log('  ' + fmt(h));
    }
    return code;
  } catch (e) {
    console.error('RED: ' + String(e && e.stack ? e.stack : e));
    return 1;
  }
}

const invokedDirectly = (() => {
  if (process.argv[1] === undefined) return false;
  try { return readFileSync(process.argv[1], 'utf8') === readFileSync(fileURLToPath(import.meta.url), 'utf8'); } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
