#!/usr/bin/env node
/**
 * #1322 · 词条目录发现：语言文件在哪儿、属于哪个包、导出什么符号。
 *
 * 为什么单独一个件：生成器（tooling/gen-entry-catalogs.mjs）与门禁（tooling/i18n-langs.mjs）
 * 必须按同一套命名口径发现语言文件；两处各写一份正则，加语言时迟早一处看见、另一处看不见。
 *
 * 口径（与 docs/base/base-entries/端口契约.md §5 一致）：
 *   packages/<包>/src/entries/<语言>.ts|json          基准形态
 *   packages/<包>/src/entries/<分册>.<语言>.ts|json    分册形态
 * 语言段是**文件名最后一个点之后**的那一段，形如 BCP 47 的低写 canonical 形（ja、zh-hant；
 * 区域子标签一律小写，大写区域段如 en-US 不是合法文件名，先转小写）；
 * 只认 .ts／.json；index.ts、catalog.generated.ts 这类逻辑件不参与语言发现。
 *
 * 本件只读；不写文件、不判红绿。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** 仓库根（tooling/ 的上一级）。 */
export const ROOT = resolve(HERE, '..');

/** 基准语言：与 packages/base-entries/src/catalog.ts 的 BASE_LANGUAGE 同值。 */
export const DEFAULT_LANGUAGE = 'zh';

/** 语言段形状：低写主语言（2–3 字母）＋可选低写子标签（最多 8 字符）；正则字符串与文件名正则共用一份。 */
const LANGUAGE_SEGMENT = '[a-z]{2,3}(?:-[a-z0-9]{1,8})*';
const LANGUAGE_TAG = new RegExp('^' + LANGUAGE_SEGMENT + '$');

/** 词条文件名：<语言>.ts|json 或 <分册>.<语言>.ts|json。 */
const ENTRY_FILE = new RegExp('^(?:(.+)\\.)?(' + LANGUAGE_SEGMENT + ')\\.(ts|json)$');

/** 是不是语言标签形状（不查是否已在名册里）。 */
export function isLanguageTag(tag) {
  return LANGUAGE_TAG.test(String(tag));
}

/** 文件名 → { part, lang, ext }；不是词条文件返回 null。 */
export function parseEntryFileName(name) {
  const m = ENTRY_FILE.exec(String(name));
  if (!m) return null;
  return { part: m[1] ?? null, lang: m[2], ext: m[3] };
}

/** 从 .ts 表文件里读它导出的那份表的标识（第一个 export const）。 */
export function tableSymbolOf(source) {
  const m = /export\s+const\s+([A-Za-z_$][\w$]*)/.exec(String(source));
  return m ? m[1] : null;
}

/**
 * 扫全部包：返回 [{ pkg, dir, files: [{ file, lang, part, ext, symbol }], languages: Map<lang, files[]> }]。
 * 包按目录名排序、文件按文件名排序；不读 dist。
 */
export function scanEntryTables(root = ROOT) {
  const pkgsDir = join(root, 'packages');
  if (!existsSync(pkgsDir)) return [];
  const out = [];
  for (const dirent of readdirSync(pkgsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dir = join(pkgsDir, dirent.name, 'src', 'entries');
    if (!existsSync(dir)) continue;
    const files = [];
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (!f.isFile()) continue;
      const parsed = parseEntryFileName(f.name);
      if (!parsed) continue;
      const source = readFileSync(join(dir, f.name), 'utf8');
      const symbol = parsed.ext === 'ts' ? tableSymbolOf(source) : null;
      files.push({ file: f.name, lang: parsed.lang, part: parsed.part, ext: parsed.ext, symbol });
    }
    if (files.length === 0) continue;
    files.sort((a, b) => a.file.localeCompare(b.file));
    const languages = new Map();
    for (const file of files) {
      if (!languages.has(file.lang)) languages.set(file.lang, []);
      languages.get(file.lang).push(file);
    }
    out.push({ pkg: dirent.name, dir, files, languages });
  }
  out.sort((a, b) => a.pkg.localeCompare(b.pkg));
  return out;
}

/** 全仓语言并集：基准语言排第一，其余按字母序（保证 AVAILABLE_LANGUAGES 与门侧清单逐字可复跑）。 */
export function entryLanguages(root = ROOT) {
  const seen = new Set();
  for (const pkg of scanEntryTables(root)) for (const lang of pkg.languages.keys()) seen.add(lang);
  const rest = [...seen].filter((l) => l !== DEFAULT_LANGUAGE).sort();
  return [DEFAULT_LANGUAGE, ...rest];
}
