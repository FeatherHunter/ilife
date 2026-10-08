#!/usr/bin/env node
/**
 * #1199 · 缺词条门（语言列：逐语言各一份词条表）。
 *
 * 它守什么：清单里每一件**已迁入词条层**的源文件，它用到的每个 key 都必须在**每一门语言的词条表**里有词条；
 * 缺一条就红，并逐条点名「哪个文件、哪个 key、哪门语言缺」。
 *
 * 为什么不许空转绿（#1199 票面硬要求）：范围清单为空时，本门**显式**印
 *   EMPTY-SCOPE 范围 0 件：扫描面为空——缩面＝放宽，不许空转当绿（先登记范围清单）
 * 照 tooling/check-base-floor.mjs:22／:139 的先例。空范围也 exit 0（起步必须绿），但读数必须让人看见
 * 「这一轮什么都没查」，不许把「没查」读成「没问题」。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ① 范围清单可读：tooling/i18n-scope.json 的 files 数组（缺文件／坏 JSON → exit 2，不静默）；
 *   ② 清单里每件在盘上存在，且真的 import 了词条层（缺 import＝没迁完就挂号，红）；
 *   ③ 每件用到的每个 key：在**每门语言**的词条表里都有词条（entryTables 由 tooling/i18n-langs.mjs 的 LANGUAGES 决定）；
 *   ④ 缺词条表的语言：报「这门语言还没建词条表」（不是缺词条，但同样红——没有表就无从判定）；
 *   ⑤ key 抽取不到就报「抽不出 key」而不是绿（正则失配＝门失明，照 check-data-absence 的「缺标记即红」口径）。
 *
 * 用法：
 *   node tooling/check-i18n-entries.mjs             # 门禁口径（范围为空＝EMPTY-SCOPE 显式报 + exit 0）
 *   node tooling/check-i18n-entries.mjs --list       # 只列范围与抽到的 key，不判
 *   node tooling/check-i18n-entries.mjs --selftest   # 变异自证：塞一件缺词条必红、还原必绿
 *   node tooling/check-i18n-entries.mjs --scope <文件> --root <目录>   # 夹具／变异入口
 * 末行固定：RESULT: files=<n> keys=<n> missing=<n>
 * 依赖：零第三方；读源码与词条表，**不写任何文件**。
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANGUAGES, DEFAULT_LANGUAGE, EMPTY_SCOPE_VERDICT, normalizeLang } from './i18n-langs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DEFAULT_SCOPE = join(HERE, 'i18n-scope.json');

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const LIST = argv.includes('--list');
const SELFTEST = argv.includes('--selftest');
const SCOPE_PATH = flag('--scope', DEFAULT_SCOPE);
const ROOT_DIR = flag('--root', ROOT);

/** 词条表的语言列顺序＝tooling/i18n-langs.mjs 的 LANGUAGES（加语言＝加一条名册，本门不改）。 */
export { LANGUAGES };

/** 读范围清单。缺文件／坏 JSON → 抛（exit 2，不静默）。 */
export function loadScope(path = SCOPE_PATH) {
  if (!existsSync(path)) {
    throw new Error('范围清单不存在：' + path + '（本门的状态账号本必须入仓；空清单也要有文件）');
  }
  const raw = readFileSync(path, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { throw new Error('范围清单 JSON 坏：' + path + ' → ' + e.message); }
  if (!Array.isArray(data.files)) throw new Error('范围清单缺 files 数组：' + path);
  return data;
}

/** 一件已迁入词条层的源文件：源文本 → 用到的 key 集（按 #1200 冻结的接口形态抽）。
 *
 *  两条调用形态（#1202 试点落地的正是这两条，见 base-render 的 status.ts／model.ts）：
 *   ① resolve(CATALOG, language, 常量 key, params?)——第三位是字符串常量 key；
 *   ② const X_ID = { ok: 常量 key, … } as const satisfies …——闭集→key 的常量表。
 *  另兼容早先那套 e／t 两形态（JSON 词条表路线）。
 *  只认字符串常量实参：拼出来的 key 抽不到 ⇒ 调用方按「抽不出 key＝门失明」报红，不当绿。 */
export function extractKeys(source) {
  const keys = new Set();
  // 口径：**形状判据**——源码里每个字符串字面量，凡形如「至少两段点分、小写开头」（progress-list.state.blank、
  // status-badge.text.ok）即算一个词条 key。为什么按形状而不按调用形态：key 既可能直接当 resolve 的实参，
  // 也可能先落进「闭集→key」的常量表（const X_ID = { ok: … } as const satisfies …）再被下标取用；
  // 按调用点抽会漏掉常量表那一路（#1202 的两处硬缝正是这一路）。形状判据不会漏，代价是可能把别处的同形串
  // 也数进来——那由「每门语言的词条表里都得有这一条」判红兜住（多收一条＝缺词条红，不会静默放过）。
  const STR = new RegExp("['\"]([A-Za-z0-9_.-]+)['\"]", "g");
  const KEY = new RegExp("^[a-z][A-Za-z0-9-]*(?:[.][A-Za-z0-9-]+)+$");
  let m;
  while ((m = STR.exec(source)) !== null) {
    if (KEY.test(m[1])) keys.add(m[1]);
  }
  return [...keys].sort();
}

/** 这一件是否真的 import 了词条层（没 import＝没迁完就挂号）。 */
/** 这一件是否真的 import 了词条层（没 import＝没迁完就挂号）。
 *
 *  两种形态都算：① 直接 from base-entries（走冻结接口）；
 *  ② 相对 import 进本包词条表 …/entries/index.js 或 …/entries/<语言>.js（表随包存放，组件就近取）。
 *  只认这两条：别的 import 不算「已迁入」，免得没迁完的件挂号后当绿。 */
export function importsEntries(source) {
  return /from\s*['"][^'"]*base-entries[^'"]*['"]/.test(source)
    || /from\s*['"][^'"]*\/entries\/(?:index|[a-z-]+)\.js['"]/.test(source);
}

/** 词条表：**逐包现找**（词条随包存放，ADR-0004 §3）——`packages/<包>/src/entries/<语言>.{ts,json}`。
 *
 *  为什么不是写死一条路径：词条表按包分命名空间，加一个包＝多一处表；写死路径会让「表不在那儿」被读成
 *  「没有表」。#1202 试点落在 base-render，JSON 路线（base-entries 的 entries/*.json）也认，两条一起扫。 */
export function entryTableCandidates(root, lang) {
  const want = normalizeLang(lang);
  const pkgs = join(root, "packages");
  const out = [];
  if (!existsSync(pkgs)) return out;
  for (const dirent of readdirSync(pkgs, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    for (const ext of [".ts", ".json"]) {
      const p = join(pkgs, dirent.name, "src", "entries", want + ext);
      if (existsSync(p)) out.push(p);
    }
  }
  return out;
}

/** 读一门语言的词条表（可跨包多份：并集）。一份都没有 → {ok:false}（由调用方决定报法，不静默）。 */
export function loadEntryTable(root, lang) {
  const paths = entryTableCandidates(root, lang);
  if (paths.length === 0) return { ok: false, why: "这门语言的词条表一份都没有（找过 packages/*/src/entries/<语言>.{ts,json}）" };
  const keys = new Set();
  for (const p of paths) {
    const raw = readFileSync(p, "utf8");
    if (p.endsWith(".json")) {
      let data;
      try { data = JSON.parse(raw); } catch (e) { return { ok: false, why: "词条表 JSON 坏：" + p + " → " + e.message }; }
      if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, why: "词条表必须是对象（key → 词条）：" + p };
      for (const k of Object.keys(data)) keys.add(k);
      continue;
    }
    // .ts 形态：抽对象字面量里的字符串 key（`key: 值`）。抽不到 key ⇒ 形状变了，报红不许当绿。
    const ENT = new RegExp("['\"]([A-Za-z0-9_.-]+)['\"]\\s*:", "g");
    let m;
    let n = 0;
    while ((m = ENT.exec(raw)) !== null) { keys.add(m[1]); n += 1; }
    if (n === 0) return { ok: false, why: "词条表抽不出 key（形状变了：期望 `key: 值`）：" + p };
  }
  return { ok: true, path: paths.join(", "), keys };
}


/** 主判据：返回 {files, keys, missing:[{file,key,lang}], blind:[{file,why}], tableErrors:[{lang,why}]}。 */
export function audit(scope, root = ROOT_DIR, langs = LANGUAGES) {
  const files = [];
  const missing = [];
  const blind = [];
  const stray = [];
  const keys = new Set();
  const tables = new Map();
  for (const lang of langs) tables.set(lang, loadEntryTable(root, lang));
  // 词条表只在**范围非空**时是硬前提：范围 0 件时没有要判的 key，缺表是「词条层还没建」，
  // 报出声但不拦（起步必须绿）；范围一旦非空，缺表就是硬红（没有表就无从判定缺词条）。
  const tableErrors = scope.files.length === 0
    ? []
    : [...tables].filter(([, t]) => !t.ok).map(([lang, t]) => ({ lang, why: t.why }));

  for (const rel of scope.files) {
    const p = join(root, rel);
    if (!existsSync(p)) { blind.push({ file: rel, why: '清单里的件在盘上不存在（删了/改名了：显式更新清单）' }); continue; }
    const src = readFileSync(p, 'utf8');
    if (!importsEntries(src)) { blind.push({ file: rel, why: '没 import 词条层（没迁完就挂号）' }); continue; }
    const ks = extractKeys(src);
    if (ks.length === 0) { blind.push({ file: rel, why: '抽不出任何 key（正则失配＝门失明，不许当绿）' }); continue; }
    files.push({ file: rel, keys: ks });
    for (const k of ks) keys.add(k);
    for (const k of ks) {
      for (const [lang, t] of tables) {
        if (!t.ok) continue;
        if (!t.keys.has(k)) missing.push({ file: rel, key: k, lang });
      }
    }
  }
  // 词条表里多出来的 key（没人在用）：只报数不判红——那是翻译批次的产物，不是这次迁入的漏记。
  const used = keys;
  for (const [lang, t] of tables) {
    if (!t.ok) continue;
    for (const k of t.keys) if (!used.has(k)) stray.push({ lang, key: k });
  }
  return { files, keys: [...keys].sort(), missing, blind, stray, tableErrors };
}

function main() {
  let scope;
  try { scope = loadScope(); } catch (e) { console.error('FAIL: ' + e.message); process.exit(2); }

  if (SELFTEST) return selftest(scope);

  const r = audit(scope);
  const empty = scope.files.length === 0;
  console.log('# #1199 缺词条门（语言列：' + LANGUAGES.join('／') + '；基准语言 ' + DEFAULT_LANGUAGE + '）');
  console.log('SCOPE: ' + SCOPE_PATH + ' files=' + scope.files.length + ' allowlist=' + (scope.allowlist || []).length);
  if (empty) console.log('EMPTY-SCOPE ' + EMPTY_SCOPE_VERDICT + '（清单：' + SCOPE_PATH + '）');
  if (LIST) {
    for (const f of r.files) console.log('KEY ' + f.file + '  ' + f.keys.length + ' 个：' + f.keys.join(','));
    console.log('RESULT: files=' + r.files.length + ' keys=' + r.keys.length + ' missing=' + r.missing.length);
    return;
  }
  let bad = 0;
  for (const t of r.tableErrors) { console.error('RED 词条表不可用：' + t.lang + ' → ' + t.why); bad += 1; }
  for (const b of r.blind) { console.error('RED 抽不出/没迁完：' + b.file + ' → ' + b.why); bad += 1; }
  for (const m of r.missing) { console.error('RED 缺词条：' + m.file + ' 的 key ' + m.key + ' 在语言 ' + m.lang + ' 的词条表里没有'); bad += 1; }
  console.log('TABLES: ' + [...LANGUAGES].map((l) => { const t = auditTables(l); return l + '=' + t; }).join(' '));
  console.log('RESULT: files=' + r.files.length + ' keys=' + r.keys.length + ' missing=' + r.missing.length);
  if (bad > 0) {
    console.error('FAIL: 缺词条门未过（' + bad + ' 处；缺词条＝迁移漏记，补词条表或补迁入，不许删清单行）');
    process.exit(1);
  }
  console.log(empty
    ? 'PASS: 范围 0 件（显式报数：这一轮什么都没查，不是「查过没问题」）'
    : 'PASS: ' + r.files.length + ' 件已迁入文件 × ' + LANGUAGES.length + ' 门语言，词条齐全');
}

function auditTables(lang) {
  const t = loadEntryTable(ROOT_DIR, lang);
  return t.ok ? t.keys.size : 'MISSING';
}

function selftest(scope) {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  // ① 范围为空：必须过，但读数必须显式
  const emptyAudit = audit({ ...scope, files: [] });
  want(emptyAudit.files.length === 0 && emptyAudit.missing.length === 0, '空范围必须零缺词条');
  want(EMPTY_SCOPE_VERDICT.includes('范围 0 件'), '空范围判词必须显式说「范围 0 件」');
  // ② 变异：在临时目录里造一件已迁入文件 + 词条表（缺一条）→ 必须报 missing
  const tmp = mkdtempSync(join(tmpdir(), 't1199-entries-'));
  try {
    const srcDir = join(tmp, 'packages', 'base-entries', 'src', 'entries');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'zh.json'), JSON.stringify({ 'demo.title': '标题' }), 'utf8');
    writeFileSync(join(srcDir, 'en.json'), JSON.stringify({ 'demo.title': 'Title' }), 'utf8');
    const fixture = join(tmp, 'demo.ts');
    writeFileSync(fixture, 'import { e } from \'base-entries\';\nexport const a = e(\'demo.title\');\nexport const b = e(\'demo.missing\');\n', 'utf8');
    const one = audit({ files: ['demo.ts'] }, tmp);
    want(one.files.length === 1, '夹具应抽到 1 件（实得 ' + one.files.length + '）');
    want(one.keys.length === 2, '夹具应抽到 2 个 key（实得 ' + one.keys.length + '）');
    want(one.missing.length === 2, 'demo.missing 在 2 门语言里都缺＝2 处（实得 ' + one.missing.length + '）');
    console.log('SELFTEST 变异读数：files=' + one.files.length + ' keys=' + one.keys.length + ' missing=' + one.missing.length
      + '（' + one.missing.map((m) => m.key + '@' + m.lang).join(',') + '）');
    // ③ 还原：把缺的那条补进两门语言 → 必须零缺
    writeFileSync(join(srcDir, 'zh.json'), JSON.stringify({ 'demo.title': '标题', 'demo.missing': '补上' }), 'utf8');
    writeFileSync(join(srcDir, 'en.json'), JSON.stringify({ 'demo.title': 'Title', 'demo.missing': 'Added' }), 'utf8');
    const two = audit({ files: ['demo.ts'] }, tmp);
    want(two.missing.length === 0, '补上词条后必须零缺（实得 ' + two.missing.length + '）');
    console.log('SELFTEST 还原读数：missing=' + two.missing.length);
    // ④ 没 import 词条层 → 报「没迁完」，不许当绿
    writeFileSync(join(tmp, 'raw.ts'), 'export const x = 1;\n', 'utf8');
    const three = audit({ files: ['raw.ts'] }, tmp);
    want(three.blind.length === 1, '没 import 词条层必须报 blind（实得 ' + three.blind.length + '）');
    // ⑤ 缺词条表 → 报 tableErrors
    rmSync(join(srcDir, 'en.json'));
    const four = audit({ files: ['demo.ts'] }, tmp);
    want(four.tableErrors.length === 1 && four.tableErrors[0].lang === 'en', '缺英文词条表必须报 tableErrors');
    // ⑥ 抽不出 key → blind，不许绿
    writeFileSync(join(tmp, 'weird.ts'), 'import { e } from \'base-entries\';\nexport const y = e(someVar);\n', 'utf8');
    const five = audit({ files: ['weird.ts'] }, tmp);
    want(five.blind.length === 1, '抽不出 key 必须报 blind（实得 ' + five.blind.length + '）');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 空范围显式报数／缺词条必红／补上必绿／没迁完必红／缺表必红／失明必红 六条自证 OK');
}

/** 入口守卫（照 tooling/i18n-langs.mjs／skill-html-snapshot.mjs 的先例）：本件被别处 import 时**不跑** CLI，
 *  免得一红就把 import 它的那道门与测试一起吃掉。 */
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
