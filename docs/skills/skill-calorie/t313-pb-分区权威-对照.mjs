#!/usr/bin/env node
/**
 * docs/skills/skill-calorie/t313-pb-分区权威-对照.mjs —— #313 A 段「未搬迁清单按场景分区」的
 * **独立对照物（P-B）**：不采信 A 段复核脚本的结论，也不读它的 scratch 基线，自己从**两处原始事实**重算：
 *   ① 旧单文件：`git show <旧 revision>:packages/skill-calorie/src/cli/legacyCommands.ts`（默认 `58c3e14^`）
 *      —— 分区**前**的 92 条声明的唯一权威来源（git 对象，不是任何人的中转 JSON）；
 *   ② 新分片：`packages/skill-calorie/src/cli/legacy/scene-NN.ts` 的源码数组字面量（直接求值，不经中间产物）；
 *   ③ 归属依据：`packages/skill-calorie/dist/triggers/routing.js`（路由执行面，键 → 场景的独立依据）。
 *
 * 三件事：
 *   **PB-KEYS**  键集完整性：旧 vs 新逐条**六字段**（kind／key／shape／title／wakeWord／example）比对
 *                —— 条数／键集（missing／extra）／重复键／字段差异，全量、不看顺序（分区按设计改了顺序）。
 *   **PB-GEN**   顺带核 A 段「生成物逐字节不变」的落点：四件生成物在 `--old-rev` 与 `--after-rev` 两处的
 *                sha256 是否相同（自己算，不抄它的表）。
 *   **PB-SCENE** 场景归属单一权威：按 `WAKE_ROUTES` ＞ `NEW_KEY_ROUTES` ＞ `COVERAGE_REPAIR_ROUTES`
 *                优先级、表内取**场景号最小**（只看带 `key` 的 `kind:'exec'` 记录）独立算每键场景，
 *                与分片文件的**实际归属**逐键比对；无路由记录的键单列（并给出可指依据或报「依据缺失」）。
 *
 * 用法（仓库根；路由面需先 `pnpm build`）：
 *   node docs/skills/skill-calorie/t313-pb-分区权威-对照.mjs
 * **对账窗口**：本对照是「**分区那一刻**」的一次性交叉证据——旧件＝`--old-rev` 的 git 对象、新面＝**当前**分片目录。
 *   #314+ 合法搬走命令后（new < old）会按设计变红，那时须以当时的基线重跑；它不是常驻不变量。
 * 变异探针用开关（只换输入，判定逻辑一字不改；副本放 `.scratch/`，冻结件不动）：
 *   --old-file <路径>    用某个文件当「旧件」（默认走 git）
 *   --legacy-src <目录>  換分片目录
 *   --routing <路径>     换路由模块
 *   --old-rev/--after-rev 换比对的两个 revision（生成物面用）
 * 退出码：0＝三门全绿；1＝有差异。摘要行以 `RESULT: PB-` 开头。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const PKG = path.join(REPO, 'packages', 'skill-calorie');
const OLD_REL = 'packages/skill-calorie/src/cli/legacyCommands.ts';
const LEGACY_SRC_DEFAULT = path.join(PKG, 'src', 'cli', 'legacy');
const ROUTING_DEFAULT = path.join(PKG, 'dist', 'triggers', 'routing.js');
/** 六字段（一条声明的全量字段；缺失以 `<缺失>` 记） */
const FIELDS = ['kind', 'key', 'shape', 'title', 'wakeWord', 'example'];
/** 表优先级（P-B 口径） */
const TABLE_RANK = { WAKE_ROUTES: 0, NEW_KEY_ROUTES: 1, COVERAGE_REPAIR_ROUTES: 2 };
/** A 段「生成物逐字节不变」声称落到的四件（自己重算 sha256，不抄表） */
const GEN_ARTIFACTS = [
  'packages/skill-calorie/src/cli/keys.ts',
  'packages/skill-calorie/src/cli/registry.ts',
  'packages/base-combos/combos.yaml',
  'packages/skill-calorie/scripts/build-help.mjs',
];
/** 无路由依据时，去这些文件里找「可指依据」（只报命中文件名＋行号，正文不抄） */
const BASIS_DOCS = [
  'docs/skills/skill-calorie/t313a-分区-证据.md',
  'docs/research/t71-old-baseline-inventory.md',
];
const MAX_LINES = 12;
const ABSENT = '<缺失>';

const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const short = (h) => (typeof h === 'string' ? h.slice(0, 12) : '<无>');

function parseArgs(argv) {
  const o = { oldRev: '58c3e14^', afterRev: 'HEAD', oldFile: '', legacySrc: LEGACY_SRC_DEFAULT, routing: ROUTING_DEFAULT };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const take = (k) => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`${k} 缺少取值`);
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') { o.help = true; continue; }
    if (a === '--old-rev') { o.oldRev = take(a); continue; }
    if (a === '--after-rev') { o.afterRev = take(a); continue; }
    if (a === '--old-file') { o.oldFile = path.resolve(REPO, take(a)); continue; }
    if (a === '--legacy-src') { o.legacySrc = path.resolve(REPO, take(a)); continue; }
    if (a === '--routing') { o.routing = path.resolve(REPO, take(a)); continue; }
    throw new Error(`未知参数：${a}`);
  }
  return o;
}

/** `git show <rev>:<path>` → Buffer（不走 shell，避免代码页损坏中文） */
function gitShow(rev, r) {
  try {
    return execFileSync('git', ['show', `${rev}:${r}`], { cwd: REPO, maxBuffer: 1 << 28 });
  } catch (err) {
    return null;
  }
}

/** 取 `export const <名>` 的**初始化数组字面量**（跳过类型注解里的 `[]`；括号配对时跳过字符串与注释） */
function arrayLiteralAfter(src, name) {
  const at = src.indexOf(`export const ${name}`);
  if (at < 0) return null;
  const eq = src.indexOf('=', at); // 类型注解 `: readonly LegacyCommandDecl[]` 里也有 `[]`，必须先过 `=`
  if (eq < 0) return null;
  const start = src.indexOf('[', eq);
  if (start < 0) return null;
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    const n = src[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

/** 从源文抽声明数组（返回 { list, parseOk, keyTokens }） */
function declsFromSource(src, constName, where) {
  const literal = arrayLiteralAfter(src, constName);
  if (literal === null) throw new Error(`${where}：找不到 ${constName} 的数组字面量`);
  const keyTokens = (literal.match(/\bkey\s*:/g) ?? []).length;
  const list = Function(`return (${literal});`)();
  if (!Array.isArray(list)) throw new Error(`${where}：字面量求值不是数组`);
  // 空分片是**合法状态**（某场景的未搬迁命令被 #314+ 全部搬走时），故不把「0 条」当解析失败；
  // 解析失败由「记录数 ≠ 字面量里 key: 的个数」「记录缺字符串 key」「全局 missing／extra」兜。
  const parseOk = list.length === keyTokens
    && list.every((d) => d && typeof d === 'object' && typeof d.key === 'string');
  return { list, parseOk, keyTokens };
}

const fieldOf = (d, f) => (Object.prototype.hasOwnProperty.call(d, f) ? d[f] : ABSENT);
const fmt = (v) => (typeof v === 'string' ? JSON.stringify(v.length > 90 ? `${v.slice(0, 90)}…` : v) : String(v));

function basisFor(key) {
  for (const r of BASIS_DOCS) {
    const p = path.join(REPO, r);
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, 'utf8').split(/\r?\n/);
    const i = lines.findIndex((l) => l.includes(key));
    if (i >= 0) return `${r}:${i + 1}`;
  }
  return '';
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log('用法：node docs/skills/skill-calorie/t313-pb-分区权威-对照.mjs [--old-rev <rev>] [--old-file <路径>] [--legacy-src <目录>] [--routing <路径>]'); return 0; }

  /* ── 旧件（git 对象优先；--old-file 供变异探针） ───────────────────────────────────── */
  let oldBuf;
  let oldProvenance;
  if (o.oldFile) {
    if (!existsSync(o.oldFile)) { console.error(`FAIL: 旧件不存在：${rel(o.oldFile)}`); return 2; }
    oldBuf = readFileSync(o.oldFile);
    oldProvenance = `--old-file ${rel(o.oldFile)}`;
  } else {
    oldBuf = gitShow(o.oldRev, OLD_REL);
    if (oldBuf === null) { console.error(`FAIL: git show ${o.oldRev}:${OLD_REL} 取不到旧件（revision／路径写错？）`); return 2; }
    oldProvenance = `git show ${o.oldRev}:${OLD_REL}`;
  }
  const oldSrc = oldBuf.toString('utf8');
  const old = declsFromSource(oldSrc, 'LEGACY_COMMANDS', '旧件');
  console.log(`INFO: old=${oldProvenance} bytes=${oldBuf.length} sha256=${sha256(oldBuf)} records=${old.list.length}`);

  /* ── 新分片 ─────────────────────────────────────────────────────────────────────── */
  if (!existsSync(o.legacySrc)) { console.error(`FAIL: 分片目录不存在：${rel(o.legacySrc)}`); return 2; }
  const files = readdirSync(o.legacySrc).filter((f) => /^scene-\d\d\.ts$/.test(f)).sort();
  if (files.length === 0) { console.error(`FAIL: ${rel(o.legacySrc)} 下没有 scene-NN.ts`); return 2; }
  const perFile = new Map();
  let parseOk = old.parseOk;
  for (const f of files) {
    const scene = /^scene-(\d\d)\.ts$/.exec(f)[1];
    const src = readFileSync(path.join(o.legacySrc, f), 'utf8');
    const parsed = declsFromSource(src, `LEGACY_SCENE_${scene}`, f);
    parseOk = parseOk && parsed.parseOk;
    perFile.set(f, { scene, list: parsed.list });
  }
  const newList = [...perFile.values()].flatMap((v) => v.list);
  console.log(`INFO: new-src=${rel(o.legacySrc)} files=${files.length} records=${newList.length} parseOk=${parseOk}`);

  /* ── 门 1：键集完整性（六字段逐条） ───────────────────────────────────────────────── */
  const oldByKey = new Map();
  for (const d of old.list) oldByKey.set(d.key, (oldByKey.get(d.key) ?? 0) + 1);
  const newByKey = new Map();
  for (const d of newList) newByKey.set(d.key, (newByKey.get(d.key) ?? 0) + 1);
  const missing = [...oldByKey.keys()].filter((k) => !newByKey.has(k));
  const extra = [...newByKey.keys()].filter((k) => !oldByKey.has(k));
  const dupKeys = [...newByKey.entries()].filter(([, n]) => n > 1).map(([k]) => k)
    .concat([...oldByKey.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  const oldMap = new Map(old.list.map((d) => [d.key, d]));
  const newMap = new Map(newList.map((d) => [d.key, d]));
  const fieldDiffs = [];
  for (const k of [...new Set([...oldByKey.keys(), ...newByKey.keys()])]) {
    if (!oldMap.has(k) || !newMap.has(k)) continue;
    const a = oldMap.get(k);
    const b = newMap.get(k);
    for (const f of FIELDS) {
      if (fieldOf(a, f) !== fieldOf(b, f)) {
        fieldDiffs.push({ key: k, field: f, old: fieldOf(a, f), now: fieldOf(b, f) });
      }
    }
    const extraFields = Object.keys(b).filter((f) => !FIELDS.includes(f));
    const goneFields = Object.keys(a).filter((f) => !FIELDS.includes(f));
    if (extraFields.length || goneFields.length) {
      fieldDiffs.push({ key: k, field: '(字段集)', old: goneFields.join('|') || '—', now: extraFields.join('|') || '—' });
    }
  }
  const keysFail = missing.length + extra.length + dupKeys.length + fieldDiffs.length + (parseOk ? 0 : 1);
  console.log(`RESULT: PB-KEYS old=${old.list.length} new=${newList.length} missing=${missing.length} extra=${extra.length} dupKeys=${dupKeys.length} fieldDiff=${fieldDiffs.length} parseOk=${parseOk ? 'yes' : 'no'}`);
  for (const k of missing.slice(0, MAX_LINES)) console.log(`  PB-KEYS-MISSING ${k}`);
  for (const k of extra.slice(0, MAX_LINES)) console.log(`  PB-KEYS-EXTRA ${k}`);
  for (const k of [...new Set(dupKeys)].slice(0, MAX_LINES)) console.log(`  PB-KEYS-DUP ${k}`);
  for (const d of fieldDiffs.slice(0, MAX_LINES)) console.log(`  PB-KEYS-DIFF ${d.key} field=${d.field} old=${fmt(d.old)} new=${fmt(d.now)}`);

  /* ── 门 1b：生成物逐字节不变（顺带核 A 段的落点；自己算 sha256） ─────────────────────── */
  const genRows = [];
  for (const r of GEN_ARTIFACTS) {
    const a = gitShow(o.oldRev, r);
    const b = gitShow(o.afterRev, r);
    if (a === null || b === null) { genRows.push({ r, ok: false, note: a === null ? `${o.oldRev} 无此路径` : `${o.afterRev} 无此路径` }); continue; }
    genRows.push({ r, ok: a.equals(b), old: sha256(a), now: sha256(b) });
  }
  const genSame = genRows.filter((x) => x.ok).length;
  console.log(`RESULT: PB-GEN artifacts=${genRows.length} same=${genSame}（${o.oldRev} vs ${o.afterRev}）`
    + genRows.map((x) => ` ${path.basename(x.r)}=${x.ok ? '同' : '异'}`).join(''));
  for (const x of genRows.filter((y) => !y.ok)) {
    console.log(`  PB-GEN-DIFF ${x.r} old=${short(x.old) || x.note} now=${short(x.now) || ''}`);
  }

  /* ── 门 2：场景归属单一权威（P-B） ─────────────────────────────────────────────────── */
  if (!existsSync(o.routing)) { console.error(`FAIL: 路由模块不存在：${rel(o.routing)}（先 pnpm build）`); return 2; }
  const routingSha = sha256(readFileSync(o.routing));
  const routing = await import(pathToFileURL(o.routing).href);
  const candidates = new Map();
  for (const table of Object.keys(TABLE_RANK)) {
    const rows = routing[table];
    if (!Array.isArray(rows)) { console.error(`FAIL: 路由模块缺表 ${table}（${rel(o.routing)}）`); return 2; }
    for (const rec of rows) {
      if (rec.kind !== 'exec' || typeof rec.key !== 'string') continue;
      const list = candidates.get(rec.key) ?? [];
      list.push({ table, rank: TABLE_RANK[table], scene: rec.scene, wakeWord: rec.wakeWord });
      candidates.set(rec.key, list);
    }
  }
  const sceneByRule = (key) => {
    const list = candidates.get(key);
    if (!list || list.length === 0) return null;
    const sorted = [...list].sort((a, b) => a.rank - b.rank || (a.scene < b.scene ? -1 : a.scene > b.scene ? 1 : 0));
    const cand = sorted.map((c) => `${c.scene}(${c.table === 'WAKE_ROUTES' ? 'WAKE' : c.table === 'NEW_KEY_ROUTES' ? 'NEW_KEY' : 'REPAIR'})`);
    return {
      scene: sorted[0].scene,
      basis: `${sorted[0].table} 唤醒词「${sorted[0].wakeWord}」`,
      candidates: [...new Set(cand)],
      scenes: [...new Set(sorted.map((c) => c.scene))].sort(),
    };
  };
  console.log(`INFO: routing=${rel(o.routing)} sha256=${routingSha} 可定场景的键=${candidates.size}`);

  const rows = [];
  let noEvidence = 0;
  let mismatch = 0;
  let multiScene = 0;
  for (const [f, v] of perFile) {
    for (const d of v.list) {
      const rule = sceneByRule(d.key);
      if (rule === null) {
        noEvidence += 1;
        rows.push({ key: d.key, actual: v.scene, file: f, rule: 'NO-EVIDENCE', basis: basisFor(d.key), ok: false });
        continue;
      }
      if (rule.scenes.length > 1) multiScene += 1;
      const ok = rule.scene === v.scene;
      if (!ok) mismatch += 1;
      rows.push({ key: d.key, actual: v.scene, file: f, rule: rule.scene, basis: rule.basis, candidates: rule.candidates, scenes: rule.scenes, ok });
    }
  }
  const sceneFail = mismatch + noEvidence;
  console.log(`RESULT: PB-SCENE keys=${rows.length} ok=${rows.length - sceneFail} mismatch=${mismatch} noRouteEvidence=${noEvidence} multiSceneKeys=${multiScene}`);
  for (const r of rows.filter((x) => !x.ok).slice(0, MAX_LINES)) {
    console.log(`  PB-SCENE-${r.rule === 'NO-EVIDENCE' ? 'NO-EVIDENCE' : 'DIFF'} ${r.key} 规则=${r.rule} 实际=${r.actual}（${r.file}）依据=${r.basis || '（依据缺失：路由三表都没这条键的 exec 记录，且候选文档里也没命中）'}`);
  }
  const sizes = files.map((f) => `${perFile.get(f).scene}:${perFile.get(f).list.length}`).join(' ');
  console.log(`RESULT: PB-SCENE-SIZES ${sizes}`);
  /* 稳健性诊断：若**不看表优先级**、一律取场景号最小，结论会变几个键？（表优先级是不是真吃重） */
  const altDiff = [];
  for (const [f, v] of perFile) {
    for (const d of v.list) {
      const list = candidates.get(d.key);
      if (!list || list.length === 0) continue;
      const alt = [...list].map((c) => c.scene).sort()[0];
      const rule = sceneByRule(d.key).scene;
      if (alt !== rule) altDiff.push(`${d.key}（表优先级⇒${rule}；不看优先级⇒${alt}；实际=${v.scene}）`);
    }
  }
  console.log(`RESULT: PB-SCENE-ALT 表优先级吃重的键=${altDiff.length}（不看优先级时结论会变）`);
  for (const s of altDiff.slice(0, MAX_LINES)) console.log(`  PB-SCENE-ALT ${s}`);
  for (const r of rows.filter((x) => x.scenes && x.scenes.length > 1).slice(0, MAX_LINES)) {
    console.log(`  PB-SCENE-TIE ${r.key} 候选场景 ${r.candidates.join('／')} → 先按表优先级（WAKE＞NEW_KEY＞REPAIR）、表内取场景号最小 ⇒ ${r.rule}（实际 ${r.actual}）`);
  }

  const fail = keysFail + (genRows.length - genSame) + sceneFail;
  console.log(`RESULT: PB-SUMMARY ${fail === 0 ? 'PASS' : 'FAIL'}（失败项 ${fail}：keys=${keysFail} gen=${genRows.length - genSame} scene=${sceneFail}）`);
  if (fail !== 0) {
    console.error(`FAIL: 分区对照未通过（keys=${keysFail} gen=${genRows.length - genSame} scene=${sceneFail}）——见上方 PB- 明细行。`);
    process.exitCode = 1;
  }
  return fail === 0 ? 0 : 1;
}

try {
  const code = await main();
  if (process.exitCode === undefined) process.exitCode = code;
} catch (err) {
  console.error(`FAIL: ${err && err.message ? err.message : err}`);
  process.exitCode = 2;
}
