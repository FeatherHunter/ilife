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
 *   ⑤ key 抽取不到就报「抽不出 key」而不是绿（正则失配＝门失明，照 check-data-absence 的「缺标记即红」口径）；
 *   ⑥ 词条值是空串／纯空白：直接判红（#1306）——空串不是「显式空白」，是待译漏记；缺英文不许留空串顶替。
 *      与 packages/base-entries/src/resolve.ts 同口径：空白值视同未录，回退链取下一站；门禁则两头都不放行。
 *   ⑦ 范围清单 allowlist 里的「文件＋串」对**不进「该进词条」的判据**（#1205／#1320）：豁免只给「语义上本就不该
 *      进词条的位」——命令关键字冻结、协议字段值、派生件。豁免按「这件文件里的这个字面量」生效，抽取阶段就剔除，
 *      不是判红后再放过；同一串在没登记的文件里照旧判缺词条（见 tooling/i18n-allowlist.mjs）。
 *   ⑧ **按包判归属**（#1199 S10）：key 在「本包表 ∪ 这件文件显式 import 的别包 catalog」里有没有，
 *      不是全仓并集有没有。命名空间＝包名（ADR-0004 §3）：跨包同名 key 不是同一条词条，拿别包的表判
 *      「本包有没有」会把缺失藏掉。
 *      归属怎么判：① 本包表（`packages/<本包>/src/entries/<语言>.*`）**始终**算一处；
 *      ② 相对 import 进 `…/entries/(index|<语言>).js` 的，按解析后的包再算一处；import 里点名的
 *      catalog 标识（`import { X_CATALOG } from '…/entries/index.js'`）要在目标包的 `src/entries/index.ts`
 *      里真导出过，拼错／指错包 ⇒ 报盲（门判不了这个 import，不许当有）。
 *      判不出归属（仓库根夹具件只 import base-entries）→ 回退跨包并集，夹具口径，真范围不出现。
 *
 * 用法：
 *   node tooling/check-i18n-entries.mjs             # 门禁口径（范围为空＝EMPTY-SCOPE 显式报 + exit 0）
 *   node tooling/check-i18n-entries.mjs --list       # 只列范围与抽到的 key，不判
 *   node tooling/check-i18n-entries.mjs --selftest   # 变异自证：塞一件缺词条必红、还原必绿
 *   node tooling/check-i18n-entries.mjs --scope <文件> --root <目录>   # 夹具／变异入口
 * 末行固定：RESULT: files=<n> keys=<n> missing=<n> blanks=<n>
 * 依赖：零第三方；读源码与词条表，**不写任何文件**。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANGUAGES, DEFAULT_LANGUAGE, EMPTY_SCOPE_VERDICT } from './i18n-langs.mjs';
import { entryTableFiles, loadEntryTable, loadTablesByPackage } from './i18n-tables.mjs';
import { allowlistPathProblems, compileAllowlist, parseAllowlist } from './i18n-allowlist.mjs';

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
  // key 形状：小写开头、点分、最后一段是词（`progress-list.state.blank`／`progress-list.remain`／
  // `status-badge.text.ok`）。为什么按形状而不按调用形态：key 既可能直接当 resolve 的实参，也可能先落进
  // 「闭集→key」的常量表（const X_ID = { ok: … } as const satisfies …）再被下标取用；按调用点抽会漏掉
  // 常量表那一路（#1202 的两处硬缝正是这一路）。
  const KEY = new RegExp("^[a-z][A-Za-z0-9-]*(?:\\.[A-Za-z0-9-]+)*\\.[a-z][a-z0-9-]*$");
  // 冻结的命令键（`bill.record.add`／`calorie.view.home`）也是点分小写：三段以上、**每段都是纯小写**、
  // **一段 camelCase 都没有**即判它是命令键，排除掉。词条 key 的中间段是 kebab（`progress-list`／
  // `status-badge`），命令键的中间段也是 kebab，故再补一条：命令键的**首段是包名**——用「全部小写且无
  // 连字符以外的记号」判不出来，改判「首段在冻结前缀表里」。
  const CMD_PREFIX = new RegExp("^(bill|calorie|chef|home|memo|schedule|life|ilife)\\.");
  let m;
  while ((m = STR.exec(source)) !== null) {
    if (KEY.test(m[1]) && !CMD_PREFIX.test(m[1])) keys.add(m[1]);
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

/** 源文件相对路径 → 所属包名（`packages/<包>/…`）；不在 packages 下 → undefined（夹具件）。 */
export function packageOfSource(rel) {
  const norm = rel.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const m = /^packages\/([^/]+)\//.exec(norm);
  return m ? m[1] : undefined;
}

/** 把 `./` `../` 相对路径按 posix 语义归一到仓库根相对路径（不碰盘：门只读源码）。 */
function resolvePosix(baseDir, spec) {
  const out = baseDir.split('/').filter(Boolean);
  for (const part of spec.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop(); else out.push(part);
  }
  return out.join('/');
}

/** 某个包的 `src/entries/index.ts` 是否导出过这个标识（catalog 名）。
 *  返回 true／false；文件不在（还没建索引）返回 null——判不了就不判，不猜缺也不猜有。 */
export function catalogExports(root, pkg, id) {
  for (const ext of ['ts', 'js']) {
    const p = join(root, 'packages', pkg, 'src', 'entries', 'index.' + ext);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    // `export * from`：再导出集合看不出来，按「有」算（不猜缺；真缺由词条表判据兜）。
    if (/export\s*\*\s*from/.test(src)) return true;
    const decl = new RegExp('export\\s+(?:declare\\s+)?(?:const|let|var|function|class|type|interface|enum)\\s+' + id + '\\b');
    if (decl.test(src)) return true;
    const named = /export\s*\{([^}]*)\}/g;
    let g;
    while ((g = named.exec(src)) !== null) {
      if (new RegExp('\\b' + id + '\\b').test(g[1])) return true;
    }
    return false;
  }
  return null;
}

/** 从 import 子句里摘 `{ A, type B, C as D }` 的本地标识（`type` 前缀剥掉；`* as ns` 摘不出就不摘）。 */
function namedIds(clause) {
  const t = String(clause || '').trim();
  if (!t.startsWith('{')) return [];
  return t.replace(/^\{/, '').replace(/\}$/, '').split(',')
    .map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim())
    .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
}

/**
 * 一件源文件的词条表归属（#1199 S10：命名空间＝包名，key 得在**本包表 ∪ 显式 import 的别包 catalog**里）。
 *
 *   ① 本包表**始终**算一处（文件自身所属包）；
 *   ② 相对 import 进 `…/entries/(index|<语言>).js`：按解析后的路径再算一处（组件跨包复用表时也不问错表）；
 *   ③ import 里点名的 catalog 标识要在目标包的 `src/entries/index.ts` 里真导出过——拼错／指错包就报盲
 *      （分不清这份 import 指哪张表，判不了，不当有）；
 *   ④ 判不出归属（仓库根夹具件只 import base-entries）：返回 `{ packages: null }`，调用方回退跨包并集；
 *   ⑤ import 了非相对路径的词条表：返回 `{ foreign }` 让调用方报盲（门不做 node 解析，不静默猜）。
 *
 *  返回 { packages: [包名…] | null, foreign, blind: [{why}] }。
 */
export function catalogsOfSource(rel, source, root = ROOT_DIR) {
  const norm = rel.replace(/\\/g, '/');
  const dir = norm.includes('/') ? norm.slice(0, norm.lastIndexOf('/')) : '';
  const pkgs = new Set();
  const blind = [];
  let foreign = null;
  const own = packageOfSource(norm);
  if (own !== undefined) pkgs.add(own); // ① 本包表始终算一处
  const impRe = /import\s+(?:type\s+)?([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = impRe.exec(source)) !== null) {
    const clause = m[1];
    const spec = m[2];
    if (!/\/entries\/(?:index|[a-z-]+)\.js$/.test(spec)) continue;
    if (!spec.startsWith('.')) { foreign = spec; continue; } // ⑤ 非相对路径：判不出归属
    const target = resolvePosix(dir, spec);
    const hit = /^packages\/([^/]+)\/(?:src|dist)\/entries\//.exec(target);
    if (!hit) continue;
    const pkg = hit[1];
    pkgs.add(pkg); // ② 被 import 的那份表
    if (!target.includes('/src/entries/')) continue; // dist 引用：只认包，不查标识
    for (const id of namedIds(clause)) {
      if (!/_CATALOG$/.test(id)) continue; // 只查 catalog 标识（类型名与 m 之类不查）
      const ok = catalogExports(root, pkg, id); // ③ 标识必须真导出
      if (ok === false) {
        blind.push({ why: 'import 的 catalog 标识 ' + id + ' 在 packages/' + pkg + '/src/entries/index.ts 里没导出（拼错或指错包）' });
      }
    }
  }
  const list = [...pkgs].sort();
  if (list.length > 0) return { packages: list, foreign: null, blind };
  if (foreign !== null) return { packages: null, foreign, blind };
  return { packages: null, foreign, blind };
}

/** 词条表在哪儿／长什么样／哪些值算「未录」：唯一实现搬到 tooling/i18n-tables.mjs（占位符门同用一份）。
 *  这里转出旧名 entryTableCandidates，供既有引用与自证测试沿用（改名不是本票的目的）。 */
export { entryTableFiles as entryTableCandidates, loadEntryTable };

/** 主判据：返回 {files, keys, missing:[{file,key,lang}], blind:[{file,why}], stray, tableErrors, blanks, tableSizes, emptyTables}。 */
export function audit(scope, root = ROOT_DIR, langs = LANGUAGES) {
  const allow = compileAllowlist(parseAllowlist(scope.allowlist || [], '范围清单的 allowlist'));
  const files = [];
  const missing = [];
  const blind = [];
  const stray = [];
  const keys = new Set();
  const tableErrors = [];
  const blanks = [];
  const emptyTables = [];
  // 逐包逐语言读表（#1199 S10）：缺词条按「这件文件 import 的那份表」判，不是全仓并集。
  const byPkg = loadTablesByPackage(root, langs);
  for (const e of byPkg.errors) tableErrors.push({ lang: '', why: '词条表读不出：' + e.path + ' → ' + e.why });
  for (const [pkg, byLang] of byPkg.packages) {
    for (const [lang, table] of byLang) {
      for (const blank of table.blanks) blanks.push({ lang, key: blank.key, path: blank.path });
      for (const path of table.emptyFiles) emptyTables.push({ lang, path });
    }
  }
  // 语言×包覆盖矩阵（#1322）：某门语言只在一部分包有表时，这门语言在其余包会回退 zh——
  // 那是合法暂态（翻译分批次），但不能静默：读数里显式印出「几包有/共几包」。
  const coverage = new Map(langs.map((lang) => [lang, new Set()]));
  for (const [pkg, byLang] of byPkg.packages) {
    for (const lang of langs) if (byLang.has(lang)) coverage.get(lang).add(pkg);
  }
  const coveragePackages = byPkg.packages.size;
  // 跨包并集只留给两处：判不出归属的夹具件；表里多出来的 key（stray）读数。
  const unions = new Map();
  for (const lang of langs) {
    const union = new Map();
    for (const [, byLang] of byPkg.packages) {
      const table = byLang.get(lang);
      if (!table) continue;
      for (const [key, value] of table.entries) if (!union.has(key)) union.set(key, value);
    }
    unions.set(lang, union);
  }
  // 词条表只在**范围非空**时是硬前提：范围 0 件时没有要判的 key，缺表是「词条层还没建」，
  // 报出声但不拦（起步必须绿）；范围一旦非空，缺表就是硬红（没有表就无从判定缺词条）。
  if (scope.files.length > 0) {
    for (const lang of langs) {
      if (entryTableFiles(root, lang).length === 0) {
        tableErrors.push({ lang, why: '这门语言的词条表一份都没有（找过 packages/*/src/entries/<语言>.{ts,json} 与 <分册>.<语言>.{ts,json}）' });
      }
    }
  }
  const missingTablesOfPkg = new Set();
  for (const rel of scope.files) {
    const p = join(root, rel);
    if (!existsSync(p)) { blind.push({ file: rel, why: '清单里的件在盘上不存在（删了/改名了：显式更新清单）' }); continue; }
    const src = readFileSync(p, 'utf8');
    if (!importsEntries(src)) { blind.push({ file: rel, why: '没 import 词条层（没迁完就挂号）' }); continue; }
    const extracted = extractKeys(src);
    if (extracted.length === 0) { blind.push({ file: rel, why: '抽不出任何 key（正则失配＝门失明，不许当绿）' }); continue; }
    // 冻结位／协议字段值（allowlist）不是「该进词条」的串：按「这件文件＋这个串」在抽取阶段剔除（#1205／#1320）。
    const allowed = allow.textsFor(rel);
    const ks = extracted.filter((k) => !allowed.has(k));
    files.push({ file: rel, keys: ks });
    for (const k of ks) keys.add(k);
    const cat = catalogsOfSource(rel, src, root);
    // ③ 标识对不上（import 点名的 catalog 在目标包里没导出）：门判不了这份 import 指哪张表，报盲。
    for (const b of cat.blind) blind.push({ file: rel, why: b.why });
    if (cat.packages === null && cat.foreign !== null) {
      blind.push({ file: rel, why: 'import 了非相对路径的词条表（' + cat.foreign + '），门判不出归属：词条表须按包就近相对 import' });
      continue;
    }
    // #1322：语言按包发现——只判「这件文件 import 的 catalog 里真有的语言」。
    // 单包加 ja 时，其余包对 ja 跳过（回退 zh），不再把「别的包还没 ja」误报成缺词条。
    const catLangs = cat.packages === null
      ? langs.filter((lang) => (unions.get(lang)?.size ?? 0) > 0)
      : langs.filter((lang) => cat.packages.some((pkg) => byPkg.packages.get(pkg)?.has(lang)));
    // 判据包一份词条表都没有（任何语言）：catLangs 会空，下面的缺词条循环一次都不跑——
    // 这正是「失明必红」要抓的：没有表不是「不欠词条」，是判不了。旧写法只在逐语言循环里报，这里先兜底。
    if (cat.packages !== null && catLangs.length === 0) {
      const tag = cat.packages.join('+');
      if (!missingTablesOfPkg.has(tag)) {
        missingTablesOfPkg.add(tag);
        tableErrors.push({ lang: '*', why: '包 ' + cat.packages.join('、') + ' 一份词条表都没有（' + langs.join('／') + ' 都找不到）——没有表就判不了缺词条（失明）' });
      }
      continue;
    }
    for (const k of ks) {
      for (const lang of catLangs) {
        // 判不出归属（仓库根夹具件只 import base-entries）：回退跨包并集——夹具口径，真范围不出现。
        if (cat.packages === null) {
          if (!unions.get(lang).has(k)) missing.push({ file: rel, key: k, lang });
          continue;
        }
        // 本包表 ∪ 显式 import 的别包 catalog：**任一处**有这个 key 就算有（同一 key 跨包各自有值也兼容）。
        const tables = [];
        for (const pkg of cat.packages) {
          const table = byPkg.packages.get(pkg)?.get(lang);
          if (table) tables.push({ pkg, table });
        }
        if (tables.length === 0) {
          const tag = cat.packages.join('+') + '@' + lang;
          if (!missingTablesOfPkg.has(tag)) {
            missingTablesOfPkg.add(tag);
            tableErrors.push({ lang, why: '包 ' + cat.packages.join('、') + ' 都没建 ' + lang + ' 词条表（没有表就判不了缺词条）' });
          }
          continue;
        }
        if (!tables.some(({ table }) => table.entries.has(k))) {
          missing.push({ file: rel, key: k, lang, pkg: tables.map((t) => t.pkg).join('+') });
        }
      }
    }
  }
  // 词条表里多出来的 key（没人在用）：只报数不判红——那是翻译批次的产物，不是这次迁入的漏记。
  const used = keys;
  for (const lang of langs) for (const k of unions.get(lang).keys()) if (!used.has(k)) stray.push({ lang, key: k });
  const tableSizes = new Map(langs.map((lang) => [lang, unions.get(lang).size]));
  return { files, keys: [...keys].sort(), missing, blind, stray, tableErrors, blanks, tableSizes, emptyTables, coverage, coveragePackages };
}

function main() {
  let scope;
  try { scope = loadScope(); } catch (e) { console.error('FAIL: ' + e.message); process.exit(2); }
  let allow;
  try {
    allow = compileAllowlist(parseAllowlist(scope.allowlist || [], SCOPE_PATH + ' 的 allowlist'));
  } catch (e) { console.error('FAIL: ' + e.message); process.exit(2); }

  if (SELFTEST) return selftest(scope);

  const r = audit(scope);
  const empty = scope.files.length === 0;
  console.log('# #1199 缺词条门（语言列：' + LANGUAGES.join('／') + '；基准语言 ' + DEFAULT_LANGUAGE + '）');
  console.log('SCOPE: ' + SCOPE_PATH + ' files=' + scope.files.length + ' allowlist=' + allow.records.length + '（文件·串对 ' + allow.pairs + '）');
  if (empty) console.log('EMPTY-SCOPE ' + EMPTY_SCOPE_VERDICT + '（清单：' + SCOPE_PATH + '）');
  // allowlist 的路径落点必须可复核：登记了不在范围清单里的件／盖不住任何件的目录前缀＝红（#1320）。
  const pathProblems = allowlistPathProblems(allow.records, scope.files, scope.files);
  if (pathProblems.length > 0) {
    for (const p of pathProblems) console.error('RED allowlist 落点不可复核：' + p.why);
    console.error('FAIL: allowlist 落点不可复核（' + pathProblems.length + ' 条；登记的文件必须真在范围清单里）');
    process.exit(1);
  }
  if (LIST) {
    for (const f of r.files) console.log('KEY ' + f.file + '  ' + f.keys.length + ' 个：' + f.keys.join(','));
    console.log('RESULT: files=' + r.files.length + ' keys=' + r.keys.length + ' missing=' + r.missing.length
      + ' blanks=' + r.blanks.length + ' empty=' + r.emptyTables.length);
    return;
  }
  let bad = 0;
  for (const t of r.tableErrors) { console.error('RED 词条表不可用：' + t.lang + ' → ' + t.why); bad += 1; }
  for (const b of r.blind) { console.error('RED 抽不出/没迁完：' + b.file + ' → ' + b.why); bad += 1; }
  for (const m of r.missing) {
    const where = m.pkg ? '（判据表：包 ' + m.pkg + '）' : '';
    console.error('RED 缺词条：' + m.file + ' 的 key ' + m.key + ' 在语言 ' + m.lang + ' 的词条表里没有' + where);
    bad += 1;
  }
  for (const b of r.blanks) { console.error('RED 空白词条：语言 ' + b.lang + ' 的表 ' + b.path + ' 里 key ' + b.key + ' 的值是空串／纯空白（不是「显式空白」，是待译漏记）'); bad += 1; }
  console.log('TABLES: ' + [...LANGUAGES].map((l) => l + '=' + (r.tableSizes.get(l) ?? 'MISSING')).join(' '));
  console.log('COVERAGE: ' + [...LANGUAGES].map((l) => l + '=' + (r.coverage.get(l)?.size ?? 0) + '/' + r.coveragePackages).join(' ')
    + '（有该语言词条表的包数／已建词条表的包数；缺的包回退 zh，属翻译批次暂态，不判红）');
  const emptyGroups = new Map();
  for (const { lang, path } of r.emptyTables) {
    const rel = path.startsWith(ROOT_DIR) ? path.slice(ROOT_DIR.length).replace(/^[\\/]/, '').replace(/\\/g, '/') : path;
    if (!emptyGroups.has(lang)) emptyGroups.set(lang, []);
    emptyGroups.get(lang).push(rel);
  }
  if (emptyGroups.size > 0) {
    console.log('EMPTY-TABLES: ' + [...emptyGroups].map(([l, files]) => l + '=' + files.length + '（' + files.join('、') + '）').join(' ')
      + '——0 条空表是迁移期暂态（这一包还没迁 / 这一门语言还没录），显式报数，不算「查过没问题」');
  }
  console.log('RESULT: files=' + r.files.length + ' keys=' + r.keys.length + ' missing=' + r.missing.length
    + ' blanks=' + r.blanks.length + ' empty=' + r.emptyTables.length);
  if (bad > 0) {
    console.error('FAIL: 缺词条门未过（' + bad + ' 处；缺词条／空白词条＝迁移漏记，补词条表或补迁入，不许删清单行）');
    process.exit(1);
  }
  console.log(empty
    ? 'PASS: 范围 0 件（显式报数：这一轮什么都没查，不是「查过没问题」）'
    : 'PASS: ' + r.files.length + ' 件已迁入文件 × ' + LANGUAGES.length + ' 门语言，词条齐全');
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
    // ⑦ 空白词条值（空串／纯空白）→ 必须报 blanks；填上真实译文 → 必须零空白（#1306）
    writeFileSync(join(srcDir, 'en.json'), JSON.stringify({ 'demo.title': '', 'demo.missing': '   ' }), 'utf8');
    const six = audit({ files: ['demo.ts'] }, tmp);
    want(six.blanks.length === 2, '空串与纯空白两个值都必须报 blanks（实得 ' + six.blanks.length + '）');
    want(six.blanks.every((b) => b.lang === 'en' && b.path.endsWith('en.json')), '空白词条必须点名语言与表文件');
    console.log('SELFTEST 空白读数：blanks=' + six.blanks.length + '（' + six.blanks.map((b) => b.key).join(',') + '）');
    writeFileSync(join(srcDir, 'en.json'), JSON.stringify({ 'demo.title': 'Title', 'demo.missing': 'Added' }), 'utf8');
    const seven = audit({ files: ['demo.ts'] }, tmp);
    want(seven.blanks.length === 0, '填上译文后必须零空白（实得 ' + seven.blanks.length + '）');
    // ⑧ allowlist 里的串不判缺词条（#1205）：同一件、同一串，登记前缺 2 处、登记后缺 0 处。
    const nl = String.fromCharCode(10);
    writeFileSync(fixture, ['import { e } from \'base-entries\';', "export const a = e('demo.title');", "export const k = 'demo.protocol';"].join(nl), 'utf8');
    writeFileSync(join(srcDir, 'zh.json'), JSON.stringify({ 'demo.title': '标题' }), 'utf8');
    const noAllow = audit({ files: ['demo.ts'] }, tmp);
    want(noAllow.missing.length === 2, 'allowlist 未登记时 demo.protocol 必须在 2 门语言里判缺（实得 ' + noAllow.missing.length + '）');
    const withAllow = audit({ files: ['demo.ts'], allowlist: [{ files: ['demo.ts'], texts: ['demo.protocol'], why: '夹具：协议字段值' }] }, tmp);
    want(withAllow.missing.length === 0, '登记 allowlist 后必须零缺词条（实得 ' + withAllow.missing.length + '）');
    want(withAllow.keys.length === 1, 'allowlist 串不许进 keys 读数（实得 ' + withAllow.keys.length + '）');
    // ⑫ 同串两用（#1320）：同一个协议字段值在数据位登记过，界面位（当 key 用）再出现必须照旧判缺；豁免按「文件＋串」。
    writeFileSync(join(tmp, 'data.ts'), ["import { e } from 'base-entries';", "export const a = e('demo.title');", "export const protocol = 'demo.protocol';"].join(nl), 'utf8');
    writeFileSync(join(tmp, 'ui.ts'), ["import { e } from 'base-entries';", "export const a = e('demo.title');", "export const y = e('demo.protocol');"].join(nl), 'utf8');
    const sameText = audit({ files: ['data.ts', 'ui.ts'], allowlist: [{ files: ['data.ts'], texts: ['demo.protocol'], why: '夹具：数据位协议值' }] }, tmp);
    want(sameText.missing.length === 2 && sameText.missing.every((m) => m.file === 'ui.ts'), '同串两用必须只剔除数据位那一件、界面位照旧判缺 2 门语言（实得 ' + JSON.stringify(sameText.missing.map((m) => m.file + ':' + m.lang)) + '）');
    const wrongFile = audit({ files: ['data.ts', 'ui.ts'], allowlist: [{ files: ['ui.ts'], texts: ['demo.protocol'], why: '夹具：登记错文件' }] }, tmp);
    want(wrongFile.missing.length === 2 && wrongFile.missing.every((m) => m.file === 'data.ts'), '豁免登记在另一件文件时必须不管用（实得 ' + JSON.stringify(wrongFile.missing.map((m) => m.file)) + '）');
    const pathProblems = allowlistPathProblems([{ files: ['nope.ts'], texts: ['demo.protocol'], why: '夹具：不存在的件' }], ['data.ts', 'ui.ts'], ['data.ts', 'ui.ts']);
    want(pathProblems.length === 1, 'allowlist 登记了范围外/不存在的件必须报落点问题（实得 ' + pathProblems.length + '）');
    console.log('SELFTEST allowlist 读数：未登记 missing=' + noAllow.missing.length + '／登记后 missing=' + withAllow.missing.length + '／同串两用界面位 missing=' + sameText.missing.length + '／登记错文件 missing=' + wrongFile.missing.length);
    // ⑨ 按包判归属（#1199 S10）：alpha 包表里有 demo.title，beta 包表里没有——
    //     beta 包的文件用这个 key 必须判缺 2 处（两门语言），跨包并集不许把它藏掉。
    const alphaDir = join(tmp, 'packages', 'alpha', 'src', 'entries');
    const betaDir = join(tmp, 'packages', 'beta', 'src', 'entries');
    mkdirSync(alphaDir, { recursive: true });
    mkdirSync(betaDir, { recursive: true });
    writeFileSync(join(alphaDir, 'zh.json'), JSON.stringify({ 'demo.title': '标题' }), 'utf8');
    writeFileSync(join(alphaDir, 'en.json'), JSON.stringify({ 'demo.title': 'Title' }), 'utf8');
    writeFileSync(join(betaDir, 'zh.json'), JSON.stringify({ 'demo.other': '别的' }), 'utf8');
    writeFileSync(join(betaDir, 'en.json'), JSON.stringify({ 'demo.other': 'Other' }), 'utf8');
    const betaSrc = join(tmp, 'packages', 'beta', 'src', 'use.ts');
    writeFileSync(betaSrc, [
      "import { resolve } from 'base-entries';",
      "import { BETA_CATALOG } from '../entries/index.js';",
      "export const a = resolve(BETA_CATALOG, 'zh', 'demo.title');",
    ].join(nl), 'utf8');
    const betaBad = audit({ files: ['packages/beta/src/use.ts'] }, tmp);
    want(betaBad.missing.length === 2, '跨包并集不许藏缺失：beta 包表里没有 demo.title 必须在 2 门语言里判缺（实得 ' + betaBad.missing.length + '）');
    want(betaBad.missing.every((m) => m.pkg === 'beta'), '缺词条必须点名判据包（实得 ' + JSON.stringify(betaBad.missing.map((m) => m.pkg)) + '）');
    writeFileSync(join(betaDir, 'zh.json'), JSON.stringify({ 'demo.other': '别的', 'demo.title': '标题' }), 'utf8');
    writeFileSync(join(betaDir, 'en.json'), JSON.stringify({ 'demo.other': 'Other', 'demo.title': 'Title' }), 'utf8');
    const betaGood = audit({ files: ['packages/beta/src/use.ts'] }, tmp);
    want(betaGood.missing.length === 0, '本包表补上后必须零缺（实得 ' + betaGood.missing.length + '）');
    console.log('SELFTEST 按包归属读数：跨包藏缺 missing=' + betaBad.missing.length + '／本包补上后 missing=' + betaGood.missing.length);
    // ⑩ 本包表 ∪ 显式 import 的别包 catalog（#1199 S10 补强）：gamma 包自己没有词条表，
    //     文件显式 import delta 包的 DELTA_CATALOG —— key 在 delta 表里有＝有（绿），没有＝缺（红）。
    const deltaDir = join(tmp, 'packages', 'delta', 'src', 'entries');
    const gammaDir = join(tmp, 'packages', 'gamma', 'src');
    mkdirSync(deltaDir, { recursive: true });
    mkdirSync(join(gammaDir, 'entries'), { recursive: true });
    writeFileSync(join(deltaDir, 'zh.json'), JSON.stringify({ 'demo.shared': '共享' }), 'utf8');
    writeFileSync(join(deltaDir, 'en.json'), JSON.stringify({ 'demo.shared': 'Shared' }), 'utf8');
    writeFileSync(join(deltaDir, 'index.ts'), "import { zh } from './zh.js';\nimport { en } from './en.js';\nexport const DELTA_CATALOG = defineCatalog({ zh, en });\n", 'utf8');
    writeFileSync(join(gammaDir, 'entries', 'index.ts'), "export const GAMMA_CATALOG = defineCatalog({ zh: {}, en: {} });\n", 'utf8');
    writeFileSync(join(gammaDir, 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { DELTA_CATALOG } from '../../delta/src/entries/index.js';",
      "export const a = resolve(DELTA_CATALOG, 'zh', 'demo.shared');",
    ].join(nl), 'utf8');
    const viaImport = audit({ files: ['packages/gamma/src/use.ts'] }, tmp);
    want(viaImport.missing.length === 0, '显式 import 的别包 catalog 里有这个 key 必须算有（实得 missing=' + viaImport.missing.length + '）');
    want(viaImport.blind.length === 0, 'catalog 标识真导出过就不许报盲（实得 ' + JSON.stringify(viaImport.blind) + '）');
    writeFileSync(join(deltaDir, 'zh.json'), JSON.stringify({ 'demo.other': '别的' }), 'utf8');
    writeFileSync(join(deltaDir, 'en.json'), JSON.stringify({ 'demo.other': 'Other' }), 'utf8');
    const importMiss = audit({ files: ['packages/gamma/src/use.ts'] }, tmp);
    want(importMiss.missing.length === 2, 'import 的那张表里没有这个 key 必须在 2 门语言里判缺（实得 ' + importMiss.missing.length + '）');
    want(importMiss.missing.every((m) => m.pkg === 'delta'), '缺词条必须点名判据包 delta（实得 ' + JSON.stringify(importMiss.missing.map((m) => m.pkg)) + '）');
    console.log('SELFTEST 别包 catalog 读数：表里有 missing=' + viaImport.missing.length + '／表里没有 missing=' + importMiss.missing.length);
    // ⑪ import 点名的 catalog 标识在目标包里没导出：门判不了这份 import 指哪张表 → 必须报盲，不许当有。
    const gammaWrite = join(gammaDir, 'write');
    mkdirSync(gammaWrite, { recursive: true });
    writeFileSync(join(gammaWrite, 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { NOPE_CATALOG } from '../entries/index.js';",
      "export const a = resolve(NOPE_CATALOG, 'zh', 'demo.shared');",
    ].join(nl), 'utf8');
    const idBlind = audit({ files: ['packages/gamma/src/write/use.ts'] }, tmp);
    want(idBlind.blind.some((b) => /NOPE_CATALOG/.test(b.why)), 'import 的 catalog 标识没导出必须报盲（实得 ' + JSON.stringify(idBlind.blind) + '）');
    console.log('SELFTEST 标识核对读数：blind=' + idBlind.blind.length + '（' + idBlind.blind.map((b) => b.why).join('；') + '）');
    // ⑬ 单包加第三语言（#1322）：epsilon 有 ja，zeta 只有 zh/en——zeta 不许因「别的包有 ja」被判缺 ja。
    const epsDir = join(tmp, 'packages', 'epsilon', 'src', 'entries');
    const zetaDir = join(tmp, 'packages', 'zeta', 'src', 'entries');
    mkdirSync(epsDir, { recursive: true });
    mkdirSync(zetaDir, { recursive: true });
    writeFileSync(join(epsDir, 'zh.json'), JSON.stringify({ 'demo.eps': '艾普西龙' }), 'utf8');
    writeFileSync(join(epsDir, 'en.json'), JSON.stringify({ 'demo.eps': 'Epsilon' }), 'utf8');
    writeFileSync(join(epsDir, 'ja.json'), JSON.stringify({ 'demo.eps': 'イプシロン' }), 'utf8');
    writeFileSync(join(epsDir, 'index.ts'), "export const EPS_CATALOG = defineCatalog({ zh, en, ja });" + nl, 'utf8');
    writeFileSync(join(zetaDir, 'zh.json'), JSON.stringify({ 'demo.zeta': '泽塔' }), 'utf8');
    writeFileSync(join(zetaDir, 'en.json'), JSON.stringify({ 'demo.zeta': 'Zeta' }), 'utf8');
    writeFileSync(join(zetaDir, 'index.ts'), "export const ZETA_CATALOG = defineCatalog({ zh, en });" + nl, 'utf8');
    writeFileSync(join(tmp, 'packages', 'epsilon', 'src', 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { EPS_CATALOG } from '../entries/index.js';",
      "export const a = resolve(EPS_CATALOG, 'zh', 'demo.eps');",
    ].join(nl), 'utf8');
    writeFileSync(join(tmp, 'packages', 'zeta', 'src', 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { ZETA_CATALOG } from '../entries/index.js';",
      "export const a = resolve(ZETA_CATALOG, 'zh', 'demo.zeta');",
    ].join(nl), 'utf8');
    const third = audit({ files: ['packages/epsilon/src/use.ts', 'packages/zeta/src/use.ts'] }, tmp, ['zh', 'en', 'ja']);
    want(third.missing.length === 0, '有 ja 的包判 ja、没 ja 的包跳过 ja，必须零缺（实得 ' + JSON.stringify(third.missing) + '）');
    writeFileSync(join(tmp, 'packages', 'zeta', 'src', 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { ZETA_CATALOG } from '../entries/index.js';",
      "export const a = resolve(ZETA_CATALOG, 'zh', 'demo.gone');",
    ].join(nl), 'utf8');
    const zetaGap = audit({ files: ['packages/zeta/src/use.ts'] }, tmp, ['zh', 'en', 'ja']);
    want(zetaGap.missing.length === 2 && zetaGap.missing.every((m) => m.lang !== 'ja'),
      '没 ja 的包对 ja 跳过，缺词条只报 zh/en 两门（实得 ' + JSON.stringify(zetaGap.missing.map((m) => m.lang)) + '）');
    console.log('SELFTEST 单包第三语言读数：全齐 missing=' + third.missing.length + '／没 ja 的包跳过 ja 后 missing=' + zetaGap.missing.length);
    // ⑭ 判据包一份词条表都没有（#1322）：不能因为「没有语言可判」就绿——必须报 tableErrors（失明必红）。
    const etaDir = join(tmp, 'packages', 'eta', 'src', 'entries');
    mkdirSync(etaDir, { recursive: true });
    writeFileSync(join(etaDir, 'index.ts'), 'export const ETA_CATALOG = defineCatalog({ zh: {}, en: {} });' + nl, 'utf8');
    writeFileSync(join(tmp, 'packages', 'eta', 'src', 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { ETA_CATALOG } from '../entries/index.js';",
      "export const a = resolve(ETA_CATALOG, 'zh', 'demo.eta');",
    ].join(nl), 'utf8');
    const noTables = audit({ files: ['packages/eta/src/use.ts'] }, tmp);
    want(noTables.tableErrors.some((t) => /一份词条表都没有/.test(t.why) && /eta/.test(t.why)), '判据包没有任何词条表必须报 tableErrors（失明必红）（实得 ' + JSON.stringify(noTables.tableErrors) + '）');
    console.log('SELFTEST 判据包无表读数：tableErrors=' + noTables.tableErrors.length);
    // ⑮ 空白词条的自证必须覆盖真实表形态 .ts（#1328；#1306 复核 P3「自证只覆盖 JSON」）。
    //    先红：en.ts 里一条空串、一条纯空白（含 \t 转义）→ blanks=2；补译文后必绿。
    const thetaDir = join(tmp, 'packages', 'theta', 'src', 'entries');
    mkdirSync(thetaDir, { recursive: true });
    writeFileSync(join(thetaDir, 'zh.ts'), "export const zh = {\n  'demo.tsblank': '标题',\n  'demo.tsspace': '有值',\n};\n", 'utf8');
    writeFileSync(join(thetaDir, 'en.ts'), "export const en = {\n  'demo.tsblank': '',\n  'demo.tsspace': '  \\t ', // 纯空白\n};\n", 'utf8');
    writeFileSync(join(thetaDir, 'index.ts'), 'export const THETA_CATALOG = defineCatalog({ zh, en });\n', 'utf8');
    writeFileSync(join(tmp, 'packages', 'theta', 'src', 'use.ts'), [
      "import { resolve } from 'base-entries';",
      "import { THETA_CATALOG } from '../entries/index.js';",
      "export const a = resolve(THETA_CATALOG, 'zh', 'demo.tsblank');",
      "export const b = resolve(THETA_CATALOG, 'zh', 'demo.tsspace');",
    ].join(nl), 'utf8');
    const tsBlanks = audit({ files: ['packages/theta/src/use.ts'] }, tmp);
    want(tsBlanks.blanks.length === 2, '.ts 表形态的空串与纯空白两个值都必须报 blanks=2（实得 ' + tsBlanks.blanks.length + '）');
    want(tsBlanks.blanks.every((b) => b.lang === 'en' && b.path.endsWith('en.ts')), '.ts 空白词条必须点名语言与表文件（实得 ' + JSON.stringify(tsBlanks.blanks.map((b) => b.path)) + '）');
    console.log('SELFTEST 空白 .ts 读数：blanks=' + tsBlanks.blanks.length + '（' + tsBlanks.blanks.map((b) => b.key).join(',') + '）');
    // ⑮补：票面契约是「造空白 → blanks=2 exit 1；补译文 → exit 0」——进程内 audit() 读数不能证明 exit 码，
    //      故在同一夹具上真跑一遍本门 CLI（子进程），钉住退出码与红行。
    const thetaScope = join(tmp, 'scope-theta.json');
    writeFileSync(thetaScope, JSON.stringify({ files: ['packages/theta/src/use.ts'], allowlist: [] }), 'utf8');
    const runThetaCli = () => spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--scope', thetaScope, '--root', tmp], { encoding: 'utf8' });
    const cliRed = runThetaCli();
    const resultLineOf = (r) => String(r.stdout).split(nl).find((l) => l.startsWith('RESULT:')) ?? '(无 RESULT 行)';
    want(cliRed.status === 1, 'CLI 契约：.ts 空白词条必须 exit 1（实得 ' + String(cliRed.status) + '）');
    want(/blanks=2/.test(String(cliRed.stdout)), 'CLI 契约：RESULT 行必须报 blanks=2（实得 ' + resultLineOf(cliRed) + '）');
    want(/RED 空白词条/.test(String(cliRed.stderr)), 'CLI 契约：stderr 必须点名空白词条（实得 ' + String(cliRed.stderr).slice(0, 200) + '）');
    console.log('SELFTEST 空白 .ts CLI 读数：exit=' + String(cliRed.status) + '／' + resultLineOf(cliRed));
    writeFileSync(join(thetaDir, 'en.ts'), "export const en = {\n  'demo.tsblank': 'Title',\n  'demo.tsspace': 'Some value',\n};\n", 'utf8');
    const tsFilled = audit({ files: ['packages/theta/src/use.ts'] }, tmp);
    want(tsFilled.blanks.length === 0, '补上 .ts 译文后必须零空白（实得 ' + tsFilled.blanks.length + '）');
    const cliGreen = runThetaCli();
    want(cliGreen.status === 0, 'CLI 契约：补上译文后必须 exit 0（实得 ' + String(cliGreen.status) + '）');
    want(/blanks=0/.test(String(cliGreen.stdout)), 'CLI 契约：补上后 RESULT 行必须报 blanks=0（实得 ' + resultLineOf(cliGreen) + '）');
    console.log('SELFTEST 空白 .ts CLI 还原读数：exit=' + String(cliGreen.status) + '／' + resultLineOf(cliGreen));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 空范围显式报数／缺词条必红／补上必绿／没迁完必红／缺表必红／失明必红／空白词条必红／allowlist 剔除／按包归属／别包 catalog 计入／catalog 标识核对／同串两用（数据位剔除·界面位判缺）／单包第三语言（有 ja 判 ja·没 ja 跳过）／判据包无表失明／空白词条 .ts 形态＋CLI 退出码契约（#1328；#1306 复核 P3） 十五条自证 OK');
}

/** 入口守卫（照 tooling/i18n-langs.mjs／skill-html-snapshot.mjs 的先例）：本件被别处 import 时**不跑** CLI，
 *  免得一红就把 import 它的那道门与测试一起吃掉。 */
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
