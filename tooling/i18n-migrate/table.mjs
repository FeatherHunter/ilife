/** #1197 · 词条表（`packages/<包>/src/entries/<语言>.ts`）的读与写：迁移器与回填器共用的**唯一定义地**。
 *
 *  只认这一种形状：`export const <语言> = {` … `};`，里面每行一条 `'key': '值',`，
 *  外加表头注释与 `/* ── … ── *\/` 分节注释。逐行读、逐行写：改动时只动被改的那几行，其余字节不动
 *  （行尾逗号、缩进、分节顺序、表头逐行保留）。
 *
 *  为什么单独一件：迁移器要往表里**追加一节**，回填器要按 zh 的顺序**重写 en**；两处写同一批文件，
 *  读法写两份＝两套口径（一处认得出 \' 与 \n 这类转义、另一处认不出，写回去的值就变了）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 表文件路径：`packages/<包>/src/entries/<语言>.ts`。 */
export function tablePath(root, pkg, lang) {
  return join(root, 'packages', pkg, 'src', 'entries', lang + '.ts');
}

/** 一行词条：`  'key': '值',`。key 与值都只认带引号的单行字面量——不是就报红，不许猜。 */
const ENTRY_RE = /^(\s*)(['"])([^'"\n]+)\2\s*:\s*(('(?:\\.|[^'\\])*')|("(?:\\.|[^"\\])*"))\s*(,?)\s*$/;
/** 块注释起始行：`/* …`（分节注释与多行说明都从这里起；写回时逐字照抄）。 */
const COMMENT_START_RE = /^\s*\/\*/;
/** 表头结束行：`export const <语言> = {`。 */
const OPEN_RE = /^\s*export const [A-Za-z0-9_]+ = \{\s*$/;
/** 表结束行：`};`。 */
const CLOSE_RE = /^\s*\}\s*;?\s*$/;
/** 迁移期空表（单行）：`export const zh = {} as const satisfies MessageTable;`——第一次迁入时展开成多行。 */
const EMPTY_ONE_LINE_RE = /^(\s*)export const ([A-Za-z0-9_]+) = \{\} as const satisfies MessageTable;\s*$/;

/** 解一个带引号的字符串字面量（raw 含首尾引号）。转义口径与 tooling/i18n-tables.mjs 的 decodeEscape 同。 */
export function decodeLiteral(raw) {
  const quote = raw[0];
  let out = '';
  let i = 1;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) {
        out += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      }
      if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(raw.slice(i + 2, i + 4))) {
        out += String.fromCharCode(parseInt(raw.slice(i + 2, i + 4), 16));
        i += 4;
        continue;
      }
      const table = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
      out += table[next] === undefined ? (next === undefined ? '\\' : next) : table[next];
      i += 2;
      continue;
    }
    if (ch === quote) return out;
    out += ch;
    i += 1;
  }
  return out;
}

/** 把一段值写成字面量（默认双引号，与仓内 #1205 既成节的写法一致；值里含 " 而不含 ' 时改用单引号省转义）。
 *  写回去能被 decodeLiteral 原样解回来；换行／回车／制表写成转义。
 */
export function quoteLiteral(text) {
  const raw = String(text);
  const quote = raw.indexOf('"') >= 0 && raw.indexOf("'") < 0 ? "'" : '"';
  const escaped = raw
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote === '"' ? '"' : "'", 'g'), '\\' + quote)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return quote + escaped + quote;
}

/** 把 key 写成字面量键（key 形状由迁移器保证：小写字母数字与 . -）。 */
export function quoteKey(key) {
  return "'" + String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/**
 * 读一份表：返回 `{ok, why?, head, items, tail, entries}`。
 *  · head＝从文件首行到 `export const … = {` 行（含）；
 *  · items＝表内逐行（kind: 'section' | 'entry' | 'blank' | 'other'，raw 逐字保留）；
 *  · tail＝从 `};` 到文件末（含）；
 *  · entries＝`[{key, value, literal}]`，按表内顺序。
 */
export function parseTableText(text, path) {
  if (!text.endsWith('\n')) return { ok: false, why: '表文件末行没有换行（形状与仓内其余表不一致）：' + path };
  const lines = text.split('\n');
  const emptyAt = lines.findIndex((line) => EMPTY_ONE_LINE_RE.test(line));
  if (emptyAt >= 0) {
    // 迁移期空表：就地展开成标准形状（head＝打开行、tail＝带断言的收尾行），后续按常规路径追加
    const m = EMPTY_ONE_LINE_RE.exec(lines[emptyAt]);
    const openLine = m[1] + 'export const ' + m[2] + ' = {';
    const closeLine = '} as const satisfies MessageTable;';
    return { ok: true, path, head: lines.slice(0, emptyAt).concat([openLine]), items: [], tail: [closeLine] };
  }
  const openAt = lines.findIndex((line) => OPEN_RE.test(line));
  if (openAt < 0) return { ok: false, why: '表里找不到 `export const <语言> = {` 行：' + path };
  let closeAt = -1;
  for (let i = lines.length - 1; i > openAt; i -= 1) {
    if (CLOSE_RE.test(lines[i])) { closeAt = i; break; }
  }
  if (closeAt < 0) return { ok: false, why: '表里找不到收尾的 `};` 行：' + path };
  const items = [];
  const entries = [];
  let inComment = false;
  for (let i = openAt + 1; i < closeAt; i += 1) {
    const raw = lines[i];
    // 块注释可以跨行（仓内确有：多行说明夹在词条之间），注释里的每一行都逐字保留、按 secion 记
    if (inComment) {
      items.push({ kind: 'section', raw });
      if (raw.indexOf('*/') >= 0) inComment = false;
      continue;
    }
    if (raw.trim() === '') { items.push({ kind: 'blank', raw }); continue; }
    if (COMMENT_START_RE.test(raw)) {
      items.push({ kind: 'section', raw });
      if (raw.indexOf('*/') < 0) inComment = true;
      continue;
    }
    const m = ENTRY_RE.exec(raw);
    if (m === null) return { ok: false, why: '表里这一行既不是词条也不是注释（形状变了，不许猜）：' + path + ' 第 ' + (i + 1) + ' 行：' + raw };
    const key = m[3];
    const literal = m[4];
    const value = decodeLiteral(literal);
    if (entries.some((e) => e.key === key)) return { ok: false, why: '同一份表里 key 重复：' + key + '（' + path + '）' };
    const item = { kind: 'entry', raw, key, literal, value, comma: m[7] };
    items.push(item);
    entries.push(item);
  }
  if (inComment) return { ok: false, why: '表里有一段块注释没有收尾的 */：' + path };
  return { ok: true, path, head: lines.slice(0, openAt + 1), items, tail: lines.slice(closeAt), entries };
}

/** 读一份表文件（不存在 → `{ok:false, why}`）。 */
export function readTable(root, pkg, lang) {
  const path = tablePath(root, pkg, lang);
  if (!existsSync(path)) return { ok: false, why: '表文件不存在：' + path };
  return parseTableText(readFileSync(path, 'utf8'), path);
}

/** 把表渲染回文本（未插入新条目的表渲染后与原文逐字节相同）。 */
export function renderTable(table) {
  return [...table.head, ...table.items.map((item) => item.raw), ...table.tail].join('\n');
}

/** 表里已有的 key 集合。 */
export function tableKeys(table) {
  return new Set(table.entries.map((entry) => entry.key));
}

/**
 * 往表尾**追加一节**（分节注释 ＋ 若干词条），不改既有条目、不重排。
 *  · comment＝分节注释整行（含 `/* ── … ── *\/` 记号，调用方写好）；
 *  · entries＝`[{key, value}]`，按给定顺序写。
 *  · 表里**已有逐字相同的分节注释**时（本件上一轮迁过一部分），条目接在该节末尾，不再重复插注释；
 *  返回 `{text, added, duplicates, conflicts}`：duplicates＝表里已有同 key 同值的（幂等跳过），
 *  conflicts＝表里已有同 key 但值不同的（**不许覆盖**，调用方按红线处理）。
 */
export function appendSection(table, comment, entries) {
  const have = new Map(table.entries.map((entry) => [entry.key, entry.value]));
  const duplicates = [];
  const conflicts = [];
  const fresh = [];
  for (const entry of entries) {
    if (have.has(entry.key)) {
      if (have.get(entry.key) === entry.value) duplicates.push(entry.key);
      else conflicts.push({ key: entry.key, had: have.get(entry.key), want: entry.value });
      continue;
    }
    fresh.push(entry);
  }
  if (fresh.length === 0) return { text: renderTable(table), added: 0, duplicates, conflicts };
  const items = table.items.slice();
  const marker = '  ' + comment;
  const added = fresh.map((entry) => ({ kind: 'entry', raw: '  ' + quoteKey(entry.key) + ': ' + quoteLiteral(entry.value) + ',' }));
  const sectionAt = items.findIndex((item) => item.kind === 'section' && item.raw === marker);
  if (sectionAt >= 0) {
    // 本件已有分节：条目接在该节末尾（下一节注释之前），分节注释不重复插
    let at = sectionAt + 1;
    while (at < items.length && items[at].kind !== 'section') at += 1;
    while (at > sectionAt + 1 && items[at - 1].kind === 'blank') at -= 1;
    items.splice(at, 0, ...added);
    return { text: renderTable({ ...table, items }), added: fresh.length, duplicates, conflicts, reusedSection: true };
  }
  let at = items.length;
  while (at > 0 && items[at - 1].kind === 'blank') at -= 1;
  items.splice(at, 0, { kind: 'section', raw: marker }, ...added);
  return { text: renderTable({ ...table, items }), added: fresh.length, duplicates, conflicts, reusedSection: false };
}

/** 写一份表（写前用 backupFile 备份）。 */
export function writeTable(path, text) {
  writeFileSync(path, text, 'utf8');
}

/**
 * 写前备份：把 <root>/<rel> 的原文拷到 .scratch/i18n-migrate-backup/<路径折成 __>。
 * 同名已存在就**不再覆盖**——备份永远是「第一次动它之前」的原文，重跑不会把备份刷成半成品。
 */
export function backupFile(root, rel) {
  const dir = join(root, '.scratch', 'i18n-migrate-backup');
  mkdirSync(dir, { recursive: true });
  const target = join(dir, rel.replace(/[\\/]/g, '__'));
  if (!existsSync(target)) writeFileSync(target, readFileSync(join(root, rel)), 'utf8');
  return target;
}
