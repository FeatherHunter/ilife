#!/usr/bin/env node
/**
 * #1306 · 词条表：两道门共用的唯一读法（表在哪儿、长什么样、哪些值算「未录」、占位符怎么抽）。
 *
 * 为什么单独一个件：缺词条门（check-i18n-entries.mjs）与占位符门（check-i18n-params.mjs）判的是同一批表。
 * 两份各自解析＝两套口径，迟早一个记住的事另一个忘掉（占位符正则一变，两门读数就分家）。
 * 本件只读：不写文件、不判红绿、不打印——判据与报法留在各自的门里。
 *
 * 表在哪儿（ADR-0004 §3「词条随包存放，命名空间＝包名」）：
 *   packages/<包>/src/entries/<语言>.{ts,json}        基准形态（手写：zh.ts／en.ts）
 *   packages/<包>/src/entries/<分册>.<语言>.{ts,json}  分册形态（写模式产出：i18n_<区段>.zh.ts）
 * 两种都是「这门语言的表」，按包内同一语言并集读；加一门语言＝加一份文件，本件不改。
 *
 * 空表是合法暂态（#1197 迁移期）：每包先立 zh／en 空表（`export const zh = {} as const satisfies MessageTable`），
 *   迁移票再往里追加条目。**空表必须显式报数**（EMPTY-TABLES／空表名单），不许当成「查过没问题」——
 *   0 条与「表形状变了读不出」是两件事：前者是还没迁，后者是门失明，后者仍判红。
 *
 * 哪些值算「未录」（#1306 的口径，与 packages/base-entries/src/resolve.ts 的 templateOf 同口径）：
 *   · 缺 key＝未录；
 *   · 值是空串或纯空白＝未录——空串不是「显式空白」，是待译漏记；resolve 沿回退链取下一站，
 *     门禁把这种值直接判红（缺英文不许留空串顶替）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { DEFAULT_LANGUAGE, LANGUAGES, ROSTER_SOURCE } from './i18n-langs.mjs';
import { isLanguageTag } from './entry-languages.mjs';

/**
 * 语言值的唯一解析口：空值落基准语言，形状不对就抛（带可用语言清单与清单出处）。
 *
 * 为什么按词条文件形状（isLanguageTag）而不是按名册闭集：selftest 在临时仓库里造「仓库还没有的第三语言」，
 * 名册是**产品仓的**闭集，不能拿来拒临时仓库的语言；真仓里出现的语言一定同时进 LANGUAGES（同源派生，
 * 见 tooling/entry-languages.mjs），故这里放宽形状不会让真仓绕过名册。
 */
function tableLang(raw) {
  const want = (raw === undefined || raw === null || raw === '') ? DEFAULT_LANGUAGE : String(raw);
  if (!isLanguageTag(want)) {
    throw new Error('未识别语言：' + want + '（可用：' + LANGUAGES.join('、') + '；词条文件形状见 ' + ROSTER_SOURCE + ' 同源口径）');
  }
  return want;
}

/** 具名占位符：与 packages/base-entries/src/evaluate.ts 的 PLACEHOLDER 同形（只认 {name}）。 */
const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** 一条词条的具名占位符集合（去重、排序；\{0\} 与复数选择属于求值端口，不算占位符）。 */
export function placeholdersOf(template) {
  const out = new Set();
  for (const m of template.matchAll(PLACEHOLDER)) out.add(m[1]);
  return [...out].sort();
}

/** 这门语言的表文件（按包现找，不写死路径；返回绝对路径，已排序保证读数可复跑）。 */
export function entryTableFiles(root, lang) {
  const want = tableLang(lang);
  const pkgs = join(root, 'packages');
  const out = [];
  if (!existsSync(pkgs)) return out;
  // 命名口径：`<lang>.ts|json` 或 `<分册>.<lang>.ts|json`——分册名里不许再出现点号歧义。
  const escaped = want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = new RegExp('(?:^|\\.)' + escaped + '\\.(?:ts|json)$');
  for (const dirent of readdirSync(pkgs, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dir = join(pkgs, dirent.name, 'src', 'entries');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isFile() && suffix.test(file.name)) out.push(join(dir, file.name));
    }
  }
  // 空结果 ＋ 不在名册里＝多半是语言值拼错：显式抛，不静默读成「零张表」（#1322 spec 评审）。
  if (out.length === 0 && !LANGUAGES.includes(want)) {
    throw new Error('未识别语言：' + want + '（可用：' + LANGUAGES.join('、') + '；仓库里也没有任何词条文件叫 ' + want + '）');
  }
  return out.sort();
}

/** 表文件所属的包名（`packages/<包>/…` 的第二段）；不在 packages 下则 undefined（调用方报红）。 */
export function packageOfTablePath(root, path) {
  const rel = path.startsWith(root) ? path.slice(root.length) : path;
  const parts = rel.split(sep).filter((s) => s !== '');
  const at = parts.indexOf('packages');
  return at >= 0 && parts[at + 1] !== undefined ? parts[at + 1] : undefined;
}

/** 解一个 JS 转义序列：返回 {text, end}（end 指向转义序列之后）。表文件是源码，值里会有 \\' ／ \\n 这类写法。 */
function decodeEscape(raw, at) {
  const next = raw[at + 1];
  if (next === undefined) return { text: '\\', end: at + 1 };
  if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(at + 2, at + 6))) {
    return { text: String.fromCharCode(parseInt(raw.slice(at + 2, at + 6), 16)), end: at + 6 };
  }
  if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(raw.slice(at + 2, at + 4))) {
    return { text: String.fromCharCode(parseInt(raw.slice(at + 2, at + 4), 16)), end: at + 4 };
  }
  const table = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
  return { text: table[next] ?? next, end: at + 2 };
}

/** 从 at 起读一个带引号的字符串值；不是字符串字面量／没闭合 → null（形状变了，调用方报红）。 */
function readQuoted(raw, at) {
  const quote = raw[at];
  if (quote !== "'" && quote !== '"') return null;
  let text = '';
  let i = at + 1;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') { const decoded = decodeEscape(raw, i); text += decoded.text; i = decoded.end; continue; }
    if (ch === quote) return { text, end: i + 1 };
    text += ch;
    i += 1;
  }
  return null;
}

/** 空表声明形态：`export const zh = {} as const satisfies MessageTable`（#1197 迁移期每包先立的空表）。 */
const EMPTY_TS_TABLE = /\{\s*\}\s*as\s+const\s+satisfies\s+MessageTable/;

/**
 * `.ts` 表解析：按 `'key': '值'` 逐条读。
 * 值必须紧跟冒号且是字符串字面量——不是就报红，**不许猜**（猜出来的值会把「表形状变了」藏成一条假词条）。
 * 读完一条把扫描位置跳到值之后：值里出现的同形串不会被误读成词条。
 */
function parseTsTable(raw, path) {
  const keyRe = /(['"])([A-Za-z0-9_.-]+)\1\s*:/g;
  const entries = new Map();
  let m;
  while ((m = keyRe.exec(raw)) !== null) {
    let at = keyRe.lastIndex;
    while (at < raw.length && /\s/.test(raw[at])) at += 1;
    const value = readQuoted(raw, at);
    if (value === null) {
      return { ok: false, why: '词条值不是字符串字面量（门读不出值，表形状变了）：' + path + ' 的 key ' + m[2] };
    }
    if (entries.has(m[2])) return { ok: false, why: '同一份表里 key 重复：' + m[2] + '（' + path + '）' };
    entries.set(m[2], value.text);
    keyRe.lastIndex = value.end;
  }
  if (entries.size === 0) {
    // 空表＝合法暂态（0 条，还没迁）；不是空表形状才算「形状变了」——那一格是门失明，必须判红。
    if (EMPTY_TS_TABLE.test(raw)) return { ok: true, entries, empty: true };
    return { ok: false, why: '词条表抽不出词条（表形状变了：期望 `key: 值`）：' + path };
  }
  return { ok: true, entries };
}
/**
 * 读一份表文件 → `{ok, entries: Map<key, 值>}` 或 `{ok:false, why}`。
 * 值的空白判定交给调用方（reading 与判据分开：本件不判红，只把值原样交出来）。
 */
export function parseEntryTableText(raw, path) {
  if (path.endsWith('.json')) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return { ok: false, why: '词条表 JSON 坏：' + path + ' → ' + e.message }; }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, why: '词条表必须是对象（key → 词条）：' + path };
    }
    const entries = new Map();
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') return { ok: false, why: '词条值必须是字符串（' + key + '）：' + path };
      entries.set(key, value);
    }
    return { ok: true, entries };
  }
  return parseTsTable(raw, path);
}

/** 一份表里的空白词条（空串／纯空白）：`[{key, value}]`。 */
export function blanksOf(entries) {
  const out = [];
  for (const [key, value] of entries) if (value.trim() === '') out.push({ key, value });
  return out;
}

/**
 * 读一门语言的全部表（跨包并集；同一门语言的多份表是同一命名空间的不同分册）。
 * 一份都没有 → `{ok:false}`（由调用方决定报法，不静默当绿）。
 * 返回值带上 `blanks`（**逐文件**收集，跨包并集不会把某一包的空白值藏掉）。
 */
export function loadEntryTable(root, lang) {
  const paths = entryTableFiles(root, lang);
  if (paths.length === 0) {
    return { ok: false, why: '这门语言的词条表一份都没有（找过 packages/*/src/entries/<语言>.{ts,json} 与 <分册>.<语言>.{ts,json}）' };
  }
  const keys = new Set();
  const entries = new Map();
  const owners = new Map();
  const blanks = [];
  const emptyFiles = [];
  for (const path of paths) {
    const parsed = parseEntryTableText(readFileSync(path, 'utf8'), path);
    if (!parsed.ok) return { ok: false, why: parsed.why };
    if (parsed.empty) emptyFiles.push(path);
    for (const [key, value] of parsed.entries) {
      if (keys.has(key)) {
        return { ok: false, why: '同一语言的多份表里 key 重复：' + key + '（' + owners.get(key) + ' 与 ' + path + '）' };
      }
      keys.add(key);
      entries.set(key, value);
      owners.set(key, path);
    }
    for (const blank of blanksOf(parsed.entries)) blanks.push({ ...blank, path });
  }
  return { ok: true, paths, keys, entries, blanks, emptyFiles };
}

/**
 * 逐包逐语言读表（占位符门要按包比：key 的命名空间＝包名，跨包同名 key 不是同一条词条）。
 * 返回 `{packages: Map<包名, Map<语言, {files, entries, blanks}>>, errors: [{path, why}]}`。
 */
export function loadTablesByPackage(root, langs) {
  const packages = new Map();
  const errors = [];
  const owners = new Map();
  for (const lang of langs) {
    const want = tableLang(lang);
    for (const path of entryTableFiles(root, want)) {
      const pkg = packageOfTablePath(root, path);
      if (pkg === undefined) { errors.push({ path, why: '表文件不在 packages/<包>/src/entries 下，判不了归属' }); continue; }
      const parsed = parseEntryTableText(readFileSync(path, 'utf8'), path);
      if (!parsed.ok) { errors.push({ path, why: parsed.why }); continue; }
      if (!packages.has(pkg)) packages.set(pkg, new Map());
      const byLang = packages.get(pkg);
      const table = byLang.get(want) ?? { files: [], entries: new Map(), blanks: [], emptyFiles: [] };
      table.files.push(path);
      if (parsed.empty) table.emptyFiles.push(path);
      for (const [key, value] of parsed.entries) {
        const owner = pkg + '/' + want + '/' + key;
        if (owners.has(owner)) {
          errors.push({ path, why: '同一包同一语言的多份表里 key 重复：' + key + '（' + owners.get(owner) + ' 与 ' + path + '）' });
          continue;
        }
        owners.set(owner, path);
        table.entries.set(key, value);
      }
      for (const blank of blanksOf(parsed.entries)) table.blanks.push({ ...blank, path });
      byLang.set(want, table);
    }
  }
  return { packages, errors };
}