#!/usr/bin/env node
/**
 * #354 立门 · #445 扩面：本包告警线检查——**台账齐全且与实况逐件一致**即绿，
 * 漏挂号一个超线件、或台账某行行数与实况不符，都必红。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ①②③ 静态三条（#354 口径原样保留）：含告警线数字 350；含数法（LF 口径，只数换行符）；
 *      含超线原话「已超线，需要根据规则进行重构。」。
 *   ④ 台账解析源可读：`AGENTS.md` 里 `warning-line-ledger:begin/end` 之间那张四列表
 *      （`件`／`挂号值`／`当场实测`／`结论`）至少一行、四列齐全。
 *   ⑤ **陈化**（逐行）：台账点名的件都在扫描面内，且该行「当场实测」**等于**当刻盘上的 LF。
 *   ⑥ **漏报**（逐件）：扫描面（本包 `src/**\/*.ts` ＋ `scripts/**\/*.mjs`，**生成物除外**）里
 *      每个 LF > 350 的件都必须在台账里有一行（#445 主判据：硬清单只查「清单里的行存在」，
 *      拦不住「盘上另有超线件没进台账」）。
 *   ⑦ 挂号台账两行齐全：`REQUIRED` 的件仍在、其「挂号值」等于冻结值（删台账任意一行必红）。
 *   ⑧ 生成物剔除法自证：剔出名单**只来自生成器自己的输出声明**（`scripts/gen-*.mjs` 里名字带
 *      `OUT`／`TARGET(S)`／`DST`／`DEST`／`GEN…` 段的 `const <名> = join(SRC_DIR, …)`，与
 *      `targets` 里的 `path: join(SRC_DIR, …)`），不许手写一份会过期的名单。两条自证：本包有
 *      生成器却一条输出声明都抽不到即红；扫描面里带「勿手改」印记却没被认出的件即红。
 *
 * 口径两说（AGENTS.md 里同义写明）：**挂号值**＝第一次挂号时的 LF，历史事实、永不回改（冻结值
 * 457／729 来源＝需求原文 `docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面），本脚本只核对它
 * 没被改写；**当场实测**＝当刻盘上的 LF（节点口径 `split('\n').length - 1`），台账里只有这一列对实况。
 *
 * 用法：无参＝真实门禁；`--sync --dry`＝只演练（打印要改的行、不落盘）；`--sync`＝落盘同步台账；
 * `--agents <…> --root <…>`＝夹具／变异入口。`--sync` 纪律（§2.5-1）：先在内存算新全文 → 跑完
 * 全部断言 → 全过才落盘；只改 `begin/end` 之间那块表，块外一个字不动（落盘前断言块外前后缀逐字节
 * 相同）。**真实门禁一律无参运行**，脚本每次自报 `SCAN-ROOT:`／`LEDGER:` 两行认口；本脚本**不提供**
 * 关掉扫描面的开关（缩面＝放宽，§2.4-4）。末行 `RESULT: n/m`；`--sync` 另打 `SYNC-PLAN … 改=／增=／删=`。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
/** 告警线：数字由包内 `AGENTS.md` 定（#354 落 350／LF 数法），本脚本只读不改。 */
const WARN_LINE = 350;
const OVER_LINE = '已超线，需要根据规则进行重构。';
const LEDGER_BEGIN = '<!-- warning-line-ledger:begin -->';
const LEDGER_END = '<!-- warning-line-ledger:end -->';
/** 挂号台账冻结值（#354）：来源＝需求原文 `docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面。 */
const REQUIRED = [
  { path: 'src/render/wizardPort.ts', lf: 457 },
  { path: 'scripts/gen-cli.mjs', lf: 729 },
];
/** 同步器给新补的行写这句，提醒人补超因／拆法（不许静默替人下判断）。 */
const AUTO_WHY = '超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。';
/** 生成器识别口径＝本包 `scripts/gen-*.mjs`；生成物印记＝ `gen-cli`／`gen-routes` 写进产物件头那句。 */
const GENERATOR_RE = /^gen-.*\.mjs$/;
const GENERATED_STAMP = '勿手改';
const FIX_HINT = '修法：node packages/skill-calorie/scripts/check-warning-line.mjs --sync';

const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.indexOf(name) >= 0 && argv[argv.indexOf(name) + 1]
  ? argv[argv.indexOf(name) + 1] : dflt);
const AGENTS_PATH = resolve(flag('--agents', join(PKG_ROOT, 'AGENTS.md')));
const SCAN_ROOT = resolve(flag('--root', PKG_ROOT));
const SYNC = argv.includes('--sync');
const DRY = argv.includes('--dry');

const countLf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;
const rel = (root, abs) => relative(root, abs).split(sep).join('/');

/** 扫描面原件：`<根>/src/**\/*.ts` ＋ `<根>/scripts/**\/*.mjs`（AGENTS.md「范围」逐字口径）。 */
function walk(dir, ext, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, ext, out);
    else if (e.isFile() && e.name.endsWith(ext)) out.push(abs);
  }
  return out;
}
const rawFace = (root) => [...walk(join(root, 'src'), '.ts'), ...walk(join(root, 'scripts'), '.mjs')]
  .map((f) => ({ path: rel(root, f), abs: f, lf: countLf(f) }))
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

/**
 * 生成物判据：读生成器自己的输出声明。认两种写法——名字带 `OUT`／`TARGET(S)`／`DST`／`DEST`／
 * `GEN…` 段的 `const <名> = join(SRC_DIR, 'a', 'b.ts')`，与 `path: join(SRC_DIR, 'a', 'b.ts')`。
 * 认不出的段（变量、模板串、拼接）一律放弃：**宁可漏剔，不可误剔**（误剔＝放宽这道门）。
 */
function scanFace(root) {
  const outputs = new Map();
  const generators = walk(join(root, 'scripts'), '.mjs')
    .map((f) => rel(root, f)).filter((r) => GENERATOR_RE.test(r.split('/').pop())).sort();
  const add = (p, by) => {
    if (!/^(src|scripts)\/[A-Za-z0-9_./-]+\.(ts|mjs)$/.test(p)) return;
    if (!outputs.has(p)) outputs.set(p, []);
    if (!outputs.get(p).includes(by)) outputs.get(p).push(by);
  };
  const joinToRel = (argsText) => {
    const segs = [];
    for (const part of argsText.split(',').map((s) => s.trim())) {
      const lit = part.match(/^'([^']*)'$/);
      if (lit) { segs.push(lit[1]); continue; }
      if (part === 'SRC_DIR') { segs.push('src'); continue; }
      return null;
    }
    return segs.join('/');
  };
  for (const gen of generators) {
    const src = readFileSync(join(root, gen), 'utf8');
    const outConst = /^[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*join\(([^)]*)\)[ \t]*;?[ \t]*$/gm;
    for (const m of src.matchAll(outConst)) {
      const isOut = m[1].split('_')
        .some((s) => ['OUT', 'TARGET', 'TARGETS', 'DST', 'DEST'].includes(s) || s.startsWith('GEN'));
      if (isOut) { const p = joinToRel(m[2]); if (p) add(p, gen); }
    }
    for (const m of src.matchAll(/(?:path|outPath|targetPath)[ \t]*:[ \t]*join\(([^)]*)\)/g)) {
      const p = joinToRel(m[1]);
      if (p) add(p, gen);
    }
  }
  const all = rawFace(root);
  return {
    face: all.filter((f) => !outputs.has(f.path)),
    skipped: all.filter((f) => outputs.has(f.path)).map((f) => ({ ...f, by: outputs.get(f.path) })),
    generators,
    declaredCount: outputs.size,
  };
}

/** 解析台账解析源。`rows` 每行 `{ path, 挂号值, 实测, 结论 }`（未登记过时挂号值 `—`）。 */
function parseLedger(text) {
  const begin = text.indexOf(LEDGER_BEGIN);
  const end = text.indexOf(LEDGER_END);
  if (begin < 0 || end < 0 || end < begin) {
    return { rows: [], problems: [`台账解析源缺标记（${LEDGER_BEGIN} / ${LEDGER_END}）`] };
  }
  const rows = [];
  const problems = [];
  for (const raw of text.slice(begin + LEDGER_BEGIN.length, end).split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 分隔行
    if (cells[0].replace(/`/g, '') === '件') continue; // 表头
    if (cells.length < 4) { problems.push(`台账行不是四列：${line}`); continue; }
    rows.push({ path: cells[0].replace(/`/g, '').trim(), 挂号值: cells[1], 实测: cells[2], 结论: cells[3] });
  }
  if (rows.length === 0) problems.push('台账解析源里没有数据行');
  return { rows, problems };
}
const renderTable = (rows) => ['| 件 | 挂号值 | 当场实测 | 结论 |', '|---|---|---|---|',
  ...rows.map((r) => `| \`${r.path}\` | ${r.挂号值} | ${r.实测} | ${r.结论} |`)].join('\n');

/** 同步计划（内存里算，**不落盘**）：台账行留（实测照实况）、不在扫描面内的行剔（改名／搬走／
 * 变生成物）、超线无行的补行（挂号值 `—`）、冻结行缺了补回（挂号值＝冻结值）；排序＝LF 降序、
 * 同 LF 按路径（与台账既有次序一致，重排不来回抖）。 */
function planSync(face, faceMap, overLine) {
  const begin = text.indexOf(LEDGER_BEGIN);
  const end = text.indexOf(LEDGER_END);
  if (begin < 0 || end < 0 || end < begin) return { problems: ['台账解析源缺标记，先手工补上 begin/end'] };
  const changed = []; const added = []; const dropped = []; const rows = []; const seen = new Set();
  for (const r of parseLedger(text).rows) {
    if (!faceMap.has(r.path)) { dropped.push(r.path); continue; }
    const live = String(faceMap.get(r.path));
    if (r.实测 !== live) changed.push({ path: r.path, from: r.实测, to: live });
    rows.push({ path: r.path, 挂号值: r.挂号值, 实测: live, 结论: r.结论 });
    seen.add(r.path);
  }
  const push = (p, 挂号值, lf, 结论) => {
    rows.push({ path: p, 挂号值, 实测: String(lf), 结论 });
    seen.add(p);
  };
  for (const f of overLine) {
    if (seen.has(f.path)) continue;
    push(f.path, '—', f.lf, `${OVER_LINE}${AUTO_WHY}`);
    added.push({ path: f.path, lf: f.lf });
  }
  for (const r of REQUIRED) {
    if (seen.has(r.path) || faceMap.get(r.path) === undefined) continue;
    push(r.path, String(r.lf), faceMap.get(r.path), `${OVER_LINE}${AUTO_WHY}`);
    added.push({ path: r.path, lf: faceMap.get(r.path) });
  }
  rows.sort((a, b) => (Number(b.实测) - Number(a.实测)) || (a.path < b.path ? -1 : 1));
  return {
    problems: [], rows, changed, added, dropped, begin, end,
    newText: text.slice(0, begin + LEDGER_BEGIN.length) + '\n' + renderTable(rows) + '\n' + text.slice(end),
  };
}

/** 判据全跑一遍（对给定 AGENTS.md 文本）；返回 `{ checks, rows, requiredHit }`。 */
function runChecks(agentsText, ctx) {
  const { face, faceMap, overLine, generators, declaredCount } = ctx;
  const checks = [];
  const check = (name, ok, detail) => checks.push({ name, ok, detail });
  check('告警线数字', agentsText.includes(String(WARN_LINE)), `缺告警线数字 ${WARN_LINE}`);
  check('数法 LF 口径', agentsText.includes('LF'), '缺数法 LF 口径');
  check('超线原话', agentsText.includes(OVER_LINE), `缺超线原话「${OVER_LINE}」`);
  const parsed = parseLedger(agentsText);
  for (const p of parsed.problems) check('台账解析源', false, p);
  if (parsed.problems.length === 0) check('台账解析源', true);
  for (const row of parsed.rows) {
    const actual = faceMap.get(row.path);
    if (actual === undefined) {
      check(`台账件在扫描面内：${row.path}`, false,
        `台账件在扫描面内不成立：${row.path}（不在盘上、或已判为生成物）；${FIX_HINT}`);
      continue;
    }
    const claimed = Number(row.实测);
    if (!Number.isInteger(claimed)) {
      check(`台账行可读：${row.path}`, false, `台账行「当场实测」不是整数：${row.path} ${row.实测}；${FIX_HINT}`);
      continue;
    }
    check(`台账与实况一致：${row.path}`, claimed === actual,
      `台账陈化：${row.path} 台账=${claimed} 实况=${actual}；${FIX_HINT}`);
  }
  const inLedger = new Set(parsed.rows.map((r) => r.path));
  for (const f of overLine) {
    check(`超线件已挂号：${f.path}`, inLedger.has(f.path), `漏报（台账没有）：${f.path} LF=${f.lf}；${FIX_HINT}`);
  }
  let requiredHit = 0;
  for (const r of REQUIRED) {
    const row = parsed.rows.find((x) => x.path === r.path);
    if (!row) { check(`挂号台账行：${r.path}`, false, `台账缺行：${r.path}；${FIX_HINT}`); continue; }
    if (row.挂号值 !== String(r.lf)) {
      check(`挂号台账行：${r.path}`, false,
        `挂号值被改写：${r.path}（台账 ${row.挂号值} ≠ 需求原文冻结值 ${r.lf}）`
        + `；挂号值是历史事实不回改，该改的是「当场实测」列；${FIX_HINT}`);
      continue;
    }
    requiredHit += 1;
    check(`挂号台账行：${r.path}`, true);
  }
  if (generators.length > 0 && declaredCount === 0) {
    check('生成物判据自证', false,
      `生成物判据自证：本包有生成器（${generators.join('／')}）却一条输出声明都抽不到——判据会静默失效，`
      + '请把生成器的输出写成 `const OUT = join(SRC_DIR, …)` 或 `targets` 里的 `path: join(…)` 形式');
  } else {
    check('生成物判据自证', true);
  }
  for (const f of face) {
    if (readFileSync(f.abs, 'utf8').split('\n').slice(0, 3).join('\n').includes(GENERATED_STAMP)) {
      check('生成物印记已认领：' + f.path, false,
        `生成物印记已认领：${f.path} 件头带「${GENERATED_STAMP}」印记，却不在生成器声明的输出清单里：`
        + '把生成器的输出声明写成 `const OUT = join(SRC_DIR, …)` 形式，或把它正式划出扫描面');
    }
  }
  for (const r of REQUIRED) {
    if (faceMap.get(r.path) === undefined) {
      check(`冻结件在扫描面内：${r.path}`, false, `冻结挂号件不在扫描面内：${r.path}`);
    }
  }
  return { checks, rows: parsed.rows, requiredHit };
}

let text;
try {
  text = readFileSync(AGENTS_PATH, 'utf8');
} catch (e) {
  console.error('FAIL: 读不到 AGENTS.md：' + AGENTS_PATH + '（' + e.message + '）');
  console.log('RESULT: 0/1');
  process.exit(1);
}

const { face, skipped, generators, declaredCount } = scanFace(SCAN_ROOT);
const faceMap = new Map(face.map((f) => [f.path, f.lf]));
const overLine = face.filter((f) => f.lf > WARN_LINE);
const ctx = { face, faceMap, overLine, generators, declaredCount };
const live = runChecks(text, ctx);

function report(result, rows, requiredHit) {
  const failed = result.filter((c) => !c.ok);
  console.log(
    'AGENTS.md：' + AGENTS_PATH + '（台账 ' + rows + ' 行；扫描面 ' + face.length
    + ' 件，超线 ' + overLine.length + ' 件，剔出生成物 ' + skipped.length + ' 件；挂号台账命中 '
    + requiredHit + '/' + REQUIRED.length + '）',
  );
  console.log('RESULT: ' + (result.length - failed.length) + '/' + result.length);
  return failed;
}

for (const s of skipped) {
  console.log(`GENERATED-SKIP ${s.path} LF=${s.lf}（由 ${s.by.join('／')} 生成，不在扫描面内）`);
}
for (const f of overLine) {
  console.log('OVER ' + f.path + ' LF=' + f.lf + ' ' + OVER_LINE + '（本次先不拆，见台账）');
}
for (const row of live.rows) {
  if (overLine.some((f) => f.path === row.path) || !faceMap.has(row.path)) continue;
  console.log('IN-LINE ' + row.path + ' 挂号=' + row.挂号值 + ' 实测=' + row.实测 + '（已落回线内，挂号行保留）');
}
console.log('SCAN-ROOT: ' + SCAN_ROOT);
console.log('LEDGER: ' + AGENTS_PATH);

if (!SYNC) {
  const failed = report(live.checks, live.rows.length, live.requiredHit);
  for (const c of failed) console.log('RED ' + (c.detail || c.name));
  if (failed.length > 0) {
    console.error('FAIL: 告警线台账未过（删台账任意一行、漏挂号一个超线件、'
      + '或台账行数与实况不符，都必红；跑 `--sync` 即补齐）');
    process.exit(1);
  }
  console.log('PASS: 告警线台账齐全且与实况一致');
  process.exit(0);
}

// ── --sync：先在内存算 → 跑完全部断言 → 全过才落盘（§2.5-1） ──────────────
const plan = planSync(face, faceMap, overLine);
if (plan.problems.length > 0) {
  for (const p of plan.problems) console.log('RED SYNC ' + p);
  console.log('RESULT: 0/1');
  console.error('FAIL: 同步没做成（不落盘）');
  process.exit(1);
}
console.log(`SYNC-PLAN mode=${DRY ? 'dry' : 'write'} 行=${plan.rows.length}`
  + ` 改=${plan.changed.length} 增=${plan.added.length} 删=${plan.dropped.length}`);
for (const x of plan.changed) console.log(`SYNC-CHANGE ${x.path} 台账=${x.from} 实况=${x.to}`);
for (const x of plan.added) console.log(`SYNC-ADD ${x.path} LF=${x.lf}`);
for (const x of plan.dropped) console.log(`SYNC-DROP ${x}`);

const after = runChecks(plan.newText, ctx);
const asserts = [];
const want = (cond, msg) => asserts.push([cond, msg]);
for (const c of after.checks) want(c.ok, c.detail || c.name);
want(parseLedger(plan.newText).rows.length === plan.rows.length, '新台账行数与计划不符');
want(plan.newText.slice(0, plan.begin + LEDGER_BEGIN.length)
  === text.slice(0, plan.begin + LEDGER_BEGIN.length), '台账块之前的内容被动过');
want(plan.newText.slice(plan.newText.indexOf(LEDGER_END)) === text.slice(plan.end), '台账块之后的内容被动过');
const bad = asserts.filter(([cond]) => !cond);
if (bad.length > 0) {
  for (const [, msg] of bad) console.log('RED SYNC 断言 ' + msg);
  console.log('RESULT: 0/1');
  console.error('FAIL: 同步断言有红，本次不落盘');
  process.exit(1);
}
if (DRY) {
  console.log('SYNC-DRY ok（未落盘；去掉 --dry 即写）');
} else {
  writeFileSync(AGENTS_PATH, plan.newText, 'utf8');
  if (readFileSync(AGENTS_PATH, 'utf8') !== plan.newText) {
    console.log('RED SYNC 落盘后回读不一致');
    console.log('RESULT: 0/1');
    console.error('FAIL: 同步落盘后回读不一致');
    process.exit(1);
  }
  console.log('SYNC-WRITE ' + AGENTS_PATH);
  console.log(`SYNC-VERIFY ok（回读逐字节等于计划；台账 ${plan.rows.length} 行）`);
}
const failedAfter = report(after.checks, plan.rows.length, after.requiredHit);
for (const c of failedAfter) console.log('RED ' + (c.detail || c.name));
process.exit(failedAfter.length > 0 ? 1 : 0);
