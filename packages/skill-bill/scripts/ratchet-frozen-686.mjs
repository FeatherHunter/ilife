#!/usr/bin/env node
/** #686 · 饼干记账机器面 · **棘轮的事实与量法**（唯一定义地：两份棘轮与收紧守卫都读这一份）。
 *
 * 为什么要有这一份：卡路里那两条棘轮「今天都在绿，但牙齿已经松了」——`FROZEN_LEGACY_KEYS` 冻着
 * 92 个键、上限 92，而实况是 0 条 / 0 行；断言用 `<=` 所以一路绿，92 个键搬完一个都没从冻结集里删。
 * **棘轮的判据是「搬一条、下调一格」，没人下调就退化成摆设。**
 *
 * 所以本件的口径是**恒等**（实况 ≤ 冻结值 **且** 冻结值 ≤ 实况 ⇒ 两边逐项相等），不是 `<=`：
 *   · 实况多于冻结值（分派层／过渡表长出新的键、行数上涨）⇒ 红；
 *   · 冻结值高于实况（搬走了却没同步下调）⇒ 红——这一条就是「收紧守卫」。
 *
 * 量三件东西（都不看时间戳，只看当刻盘上的内容）：
 *   ① **分派层**：`src/cli` **全目录**（含将来按域拆出来的姊妹件）里**按键分派**的 `bill.…` 字面量集
 *      （行为口径：`case`／`===`／就地键集查询三类都数，双引号与 `if` 阶梯一视同仁；具名键集／默认值／注释不数）；
 *   ② **过渡表**：`src/render/envelope.ts` 的 `TRANSITIONAL_KEY_SHAPES` 键集（未搬迁的键仍住在那里）；
 *   ③ **键总数与注册表**：`dist/triggers/wakeTable.js` 的 `WAKE_TABLE` 键集（**域声明合并出来的派生面**，
 *      是 16 键的独立事实源；#689 搬迁前这一读数取自 `dist/policy/index.js`，那件已随 `policy/` 拆散删除）
 *      与 `dist/cli/registry.js` 的 `REGISTRY_KEYS`（生成物）。
 *
 * 未搬迁的键**恰恰住两处**（过渡表有形状行、分派层有 case）：搬一条＝两处同窗消失 ＋ 冻结值同窗下调。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 冻结基线（只许随搬迁同步下调；本票 #686 交付当刻实测所得，出处见 `docs/skills/skill-bill/t686-机器面-证据.md`）。 */
export const FROZEN = {
  /** 未搬迁的键集：住 `src/render/envelope.ts` 的 `TRANSITIONAL_KEY_SHAPES`（8 条）。 */
  legacyKeys: [
    'bill.analysis.compare',
    'bill.analysis.overview',
    'bill.analysis.trend',
    'bill.goal.query',
    'bill.goal.write',
    'bill.help.lookup',
    'bill.link.submit',
    'bill.setup.run',
  ],
  /** 分派层按键分派的字面量集（`src/cli` **全目录**）：与 `legacyKeys` 同集（未搬迁的键才在分派层有 case）。 */
  dispatchKeys: [
    'bill.analysis.compare',
    'bill.analysis.overview',
    'bill.analysis.trend',
    'bill.goal.query',
    'bill.goal.write',
    'bill.help.lookup',
    'bill.link.submit',
    'bill.setup.run',
  ],
  /** 已搬进能力目录、进生成物注册表的键数：搬一条 ⇒ +1，同窗上调这里。 */
  registryKeyCount: 8,
  /** 7 域 16 联动的键总数（搬迁不改这个数）：注册表 ∪ 未搬迁 ＝ 全集。 */
  totalKeyCount: 16,
  /** 分派层两件的行数上限（**等于当刻实况**：改一行就同窗改这里，否则收紧守卫红）。 */
  lineCaps: {
    'src/cli/cmd_read.ts': 455,
    'src/render/envelope.ts': 62,
  },
};

export const DISPATCH_FILES = ['src/cli/cmd_read.ts', 'src/render/envelope.ts'];

/* ── 量法 ─────────────────────────────────────────────────────────────────────────────── */

const QUOTE_CHARS = new Set(["'", '"', '`']);
const CMP_BEFORE = /(?:\bcase\s*|(?:===|!==|==|!=)\s*)$/;
const CMP_AFTER = /^\s*(?:===|!==|==|!=)/;
const INLINE_QUERY_AFTER = /^\s*\)?\s*\.\s*(?:has|includes|indexOf|get)\s*\(/;

/** 按键分派的 `bill.…` 字面量集（行为口径；判据与卡路里 `cmd-registry-294` 同形，只换命名空间）。 */
export function dispatchLiteralsOf(text) {
  const found = new Set();
  const brackets = [];
  let code = '';
  for (let i = 0; i < text.length;) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
      continue;
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    const c = text[i];
    if (QUOTE_CHARS.has(c)) {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      const lit = text.slice(i + 1, j);
      if (lit.startsWith('bill.')) {
        if (CMP_BEFORE.test(code) || CMP_AFTER.test(text.slice(j + 1, j + 33))) found.add(lit);
        for (const b of brackets) b.push(lit);
      }
      code += text.slice(i, Math.min(j + 1, text.length));
      i = j + 1;
      continue;
    }
    if (c === '[') brackets.push([]);
    if (c === ']') {
      const b = brackets.pop();
      if (b && b.length > 0 && INLINE_QUERY_AFTER.test(text.slice(i + 1, i + 25))) for (const k of b) found.add(k);
    }
    code += c;
    i += 1;
  }
  return found;
}

/** 过渡表 `TRANSITIONAL_KEY_SHAPES` 的键集（取那个对象字面量里的字符串键）。 */
export function transitionKeysOf(text) {
  const decl = /TRANSITIONAL_KEY_SHAPES[^=]*=\s*\{/.exec(text);
  if (decl === null) throw new Error('src/render/envelope.ts 里找不到 TRANSITIONAL_KEY_SHAPES 的对象字面量');
  const start = decl.index + decl[0].length - 1;
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  let body = null;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote !== null) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) { body = text.slice(start, i + 1); break; }
    }
  }
  if (body === null) throw new Error('src/render/envelope.ts 的 TRANSITIONAL_KEY_SHAPES 花括号不配平');
  const keys = new Set();
  for (const m of body.matchAll(/'([^']+)'\s*:/g)) keys.add(m[1]);
  return keys;
}

export const lfOf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;

/** 分派层＝`src/cli` **全目录**（照卡路里 `cmd-registry-294` 的口径；只盯 `cmd_read.ts` 一件会留一个洞：
 *  把 `case` 挪进同目录的姊妹件就绕开了判据）。`cmd_read.ts` 将来按域拆件时，这条判据跟着走、不失明。 */
export function cliDispatchKeysOf(root = PKG_DIR) {
  const found = new Set();
  const walk = (dir) => {
    // 读不到就**抛**，不许静默当空（#686 实测：把 ReferenceError 吞掉会让判据读到 0 条而假红／假绿）。
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile() && e.name.endsWith('.ts')) {
        for (const k of dispatchLiteralsOf(readFileSync(abs, 'utf8'))) found.add(k);
      }
    }
  };
  walk(join(root, 'src', 'cli'));
  return [...found].sort();
}

/** 当刻实况。`root` 缺省＝本包根；夹具可指另一棵小树（`src/`＋`dist/` 两件 stub 即可）。 */
export async function measure(root = PKG_DIR) {
  const readSrc = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) throw new Error('缺源件：' + abs);
    return readFileSync(abs, 'utf8');
  };
  const dispatchKeys = cliDispatchKeysOf(root);
  const legacyKeys = [...transitionKeysOf(readSrc('src/render/envelope.ts'))].sort();
  const registryDist = join(root, 'dist', 'cli', 'registry.js');
  const wakeTableDist = join(root, 'dist', 'triggers', 'wakeTable.js');
  for (const p of [registryDist, wakeTableDist]) {
    if (!existsSync(p)) throw new Error('缺编译产物：' + p + '（先 `pnpm build`／`tsc -b`）');
  }
  const reg = await import(pathToFileURL(registryDist).href);
  const wakeTable = await import(pathToFileURL(wakeTableDist).href);
  if (!Array.isArray(reg.REGISTRY_KEYS)) throw new Error('dist/cli/registry.js 缺 REGISTRY_KEYS 数组');
  if (!Array.isArray(wakeTable.WAKE_TABLE)) throw new Error('dist/triggers/wakeTable.js 缺 WAKE_TABLE 数组');
  const lines = {};
  for (const rel of Object.keys(FROZEN.lineCaps)) lines[rel] = lfOf(join(root, rel));
  return {
    dispatchKeys,
    legacyKeys,
    registryKeys: [...reg.REGISTRY_KEYS].sort(),
    wakeKeys: [...new Set(wakeTable.WAKE_TABLE.map((e) => e.key))].sort(),
    lines,
  };
}

/* ── 判据（恒等，不是 ≤） ─────────────────────────────────────────────────────────────── */

const diff = (a, b) => a.filter((x) => !b.includes(x));

function setCheck(name, actual, frozen) {
  const extra = diff(actual, frozen);
  const left = diff(frozen, actual);
  if (extra.length === 0 && left.length === 0) return { name, ok: true, detail: '冻结=' + frozen.length + ' 实况=' + actual.length };
  const parts = [];
  if (extra.length > 0) {
    parts.push('实况多出 ' + extra.length + ' 条（' + extra.join('、') + '）——棘轮只许随搬迁变短：新命令要住能力目录 `src/<能力>/commands.ts`，别往分派层加分支');
  }
  if (left.length > 0) {
    parts.push('冻结值仍有 ' + left.length + ' 条而实况没有（' + left.join('、') + '）——搬走一条就同窗把冻结值删掉、上限下调（卡路里 #294 的病：`<=` 一路绿，冻结集从不缩）');
  }
  return { name, ok: false, detail: '冻结=' + frozen.length + ' 实况=' + actual.length + '；' + parts.join('；') };
}

function countCheck(name, actual, frozen, upHint) {
  const ok = actual === frozen;
  const why = ok
    ? '冻结=' + frozen + ' 实况=' + actual
    : '冻结=' + frozen + ' 实况=' + actual
      + (actual > frozen
        ? '（' + (upHint || '实况上涨：棘轮只许变短') + '）'
        : '（实况已降 ' + (frozen - actual) + ' 而冻结值没下调：棘轮的牙齿松了）');
  return { name, ok, detail: why };
}

/** 逐条判据。夹具可喂合成读数（`ratchetProblems(measured, frozen)`）。 */
export function ratchetProblems(m, frozen = FROZEN) {
  const out = [];
  out.push(setCheck('dispatchKeys（分派层按键分派字面量集）', m.dispatchKeys, frozen.dispatchKeys));
  out.push(setCheck('legacyKeys（过渡表 TRANSITIONAL_KEY_SHAPES 键集）', m.legacyKeys, frozen.legacyKeys));
  out.push({
    name: 'dispatchEqualsLegacy（未搬迁的键恰住两处：分派层 case ＋ 过渡表形状行）',
    ok: JSON.stringify(m.dispatchKeys) === JSON.stringify(m.legacyKeys),
    detail: JSON.stringify(m.dispatchKeys) === JSON.stringify(m.legacyKeys)
      ? '两处同集（' + m.dispatchKeys.length + ' 条）'
      : '两处不同集（分派层 ' + m.dispatchKeys.length + '／过渡表 ' + m.legacyKeys.length + '）——搬一条必须两处同窗消失',
  });
  out.push(countCheck('registryKeyCount（生成物注册表键数）', m.registryKeys.length, frozen.registryKeyCount));
  out.push(countCheck('totalKeyCount（口径层 WAKE_TABLE 的键总数）', m.wakeKeys.length, frozen.totalKeyCount,
    '16 联动 key 是票面冻结的契约（键字符串后续票落表时冻结）：要加新命令得同窗改本冻结值并在票面说明，不是在这里悄悄长出来'));
  const both = [...new Set([...m.registryKeys, ...m.legacyKeys])].sort();
  out.push({
    name: 'unionIsTotal（注册表 ∪ 未搬迁 ＝ 全量声明）',
    ok: JSON.stringify(both) === JSON.stringify(m.wakeKeys),
    detail: JSON.stringify(both) === JSON.stringify(m.wakeKeys)
      ? '并集恰为全量声明（' + both.length + ' 条）'
      : '并集 ≠ 全量声明：只在一处（' + diff(m.wakeKeys, both).join('、') + '）／多出来的（' + diff(both, m.wakeKeys).join('、') + '）',
  });
  const dup = m.registryKeys.filter((k) => m.legacyKeys.includes(k));
  out.push({
    name: 'registryDisjointLegacy（一个键恰住一处：注册表与过渡表不相交）',
    ok: dup.length === 0,
    detail: dup.length === 0 ? '无交叠' : '两处都在（搬迁没删过渡表那一行？）：' + dup.join('、'),
  });
  for (const [rel, cap] of Object.entries(frozen.lineCaps)) out.push(countCheck('lineCaps ' + rel, m.lines[rel], cap));
  return out;
}
