#!/usr/bin/env node
/**
 * #354 立门 · #445 扩面：本包告警线检查——**台账齐全且与实况逐件一致**即绿，
 * 漏挂号一个超线件、或台账某行行数与实况不符，都必红。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ①②③ 静态三条（#354 口径，原样保留）：
 *     ① `packages/skill-calorie/AGENTS.md` 含告警线数字 350；
 *     ② 含数法（LF 口径，只数换行符）；
 *     ③ 含超线原话「已超线，需要根据规则进行重构。」。
 *   ④ 台账解析源可读：AGENTS.md 里 `warning-line-ledger:begin/end` 之间那张四列表
 *      （`件`／`挂号值`／`当场实测`／`结论`）至少一行、四列齐全。
 *   ⑤ **陈化**（逐行）：台账每行点名的件都在扫描面内，且该行「当场实测」列
 *      **等于**当刻盘上数出来的 LF（节点口径 `split('\n').length - 1`）。
 *   ⑥ **漏报**（逐件）：扫描面（本包 `src/**\/*.ts` ＋ 包内 `scripts/**\/*.mjs`）里
 *      每个 LF > 350 的件，都必须在台账里有一行（#445 的主判据：硬清单只查「清单里的
 *      行存在」，拦不住「盘上另有超线件没进台账」）。
 *   ⑦ 挂号台账两行齐全：`REQUIRED` 列的件仍在台账里、且其「挂号值」列等于冻结值
 *      （删台账任意一行必红——#354 的负向对照继续成立）。
 *
 * 口径两说（AGENTS.md 里同义写明）：
 *   · **挂号值**＝第一次挂号时写的 LF，是历史事实，不随实况回改（`REQUIRED` 的 457／729
 *     是 #354 的冻结挂号值，来源＝需求原文 `docs/skills/skill-calorie/t169-设计定稿.md`
 *     票 2 票面）；本脚本只核对它**没被改写**，不拿它跟实况比。
 *   · **当场实测**＝当刻盘上数出来的 LF；本脚本核对的就是这一列。
 *
 * 用法：
 *   node packages/skill-calorie/scripts/check-warning-line.mjs
 *   node packages/skill-calorie/scripts/check-warning-line.mjs --agents <另一份 AGENTS.md>   # 变异／夹具用
 *   node packages/skill-calorie/scripts/check-warning-line.mjs --root <另一个包根>          # 夹具用（扫的是它下面的 src/ 与 scripts/）
 *
 * `--agents`／`--root` 只是夹具与变异入口：**真实门禁一律无参运行**（无参＝扫本包根、
 * 读本包 `AGENTS.md`）。脚本每次都会把自己扫的根与读的台账打印出来（`SCAN-ROOT:`／`LEDGER:`），
 * 复核者照这两行认口，不用猜。本脚本**不提供**关掉扫描面的开关（缩面＝放宽，协议 §2.4-4）。
 *
 * 末行机器可读摘要：`RESULT: n/m`（n=通过项数，m=总项数）。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
const DEFAULT_AGENTS = join(PKG_ROOT, 'AGENTS.md');

/** 告警线：数字由包内 `AGENTS.md` 定（#354 落 350／LF 数法），本脚本只读不改。 */
const WARN_LINE = 350;
/** 数法：LF 口径，只数换行符（与 AGENTS.md 一致）。 */
const countLf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;
const OVER_LINE = '已超线，需要根据规则进行重构。';

/** 台账解析源标记：包内 AGENTS.md 里那张表，两头夹住，脚本只认这一块。 */
const LEDGER_BEGIN = '<!-- warning-line-ledger:begin -->';
const LEDGER_END = '<!-- warning-line-ledger:end -->';

/** 挂号台账（#354 口径）：期望值来源＝需求原文（t169-设计定稿 票 2 票面：457／729）。 */
const REQUIRED = [
  { path: 'src/render/wizardPort.ts', lf: 457 },
  { path: 'scripts/gen-cli.mjs', lf: 729 },
];

const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const AGENTS_PATH = resolve(flag('--agents', DEFAULT_AGENTS));
const SCAN_ROOT = resolve(flag('--root', PKG_ROOT));

/** 扫描面：`<根>/src/**\/*.ts` ＋ `<根>/scripts/**\/*.mjs`（AGENTS.md「范围」一节逐字口径）。 */
function walk(dir, ext, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, ext, out);
    else if (e.isFile() && e.name.endsWith(ext)) out.push(abs);
  }
  return out;
}

function scanFace(root) {
  const abs = [...walk(join(root, 'src'), '.ts'), ...walk(join(root, 'scripts'), '.mjs')];
  return abs
    .map((f) => ({ path: relative(root, f).split(sep).join('/'), lf: countLf(f) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * 解析台账解析源。返回 `{ rows, problems }`；`rows` 每行
 * `{ path, 挂号值, 实测, 结论 }`（`挂号值` 未登记过时为 `—`）。
 */
function parseLedger(text) {
  const begin = text.indexOf(LEDGER_BEGIN);
  const end = text.indexOf(LEDGER_END);
  if (begin < 0 || end < 0 || end < begin) {
    return { rows: [], problems: [`台账解析源缺标记（${LEDGER_BEGIN} / ${LEDGER_END}）`] };
  }
  const rows = [];
  const problems = [];
  const body = text.slice(begin + LEDGER_BEGIN.length, end);
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 分隔行
    if (cells[0].replace(/`/g, '') === '件') continue; // 表头
    if (cells.length < 4) {
      problems.push(`台账行不是四列：${line}`);
      continue;
    }
    rows.push({ path: cells[0].replace(/`/g, '').trim(), 挂号值: cells[1], 实测: cells[2], 结论: cells[3], raw: line });
  }
  if (rows.length === 0) problems.push('台账解析源里没有数据行');
  return { rows, problems };
}

let text;
try {
  text = readFileSync(AGENTS_PATH, 'utf8');
} catch (e) {
  console.error('FAIL: 读不到 AGENTS.md：' + AGENTS_PATH + '（' + e.message + '）');
  console.log('RESULT: 0/1');
  process.exit(1);
}

const checks = [];
/** 记一条判据：`name`＝判据名，`ok`＝是否过，`detail`＝红时点名的明细行。 */
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  return ok;
}

// ①②③ 静态三条（#354 口径原样保留）
check('告警线数字', text.includes(String(WARN_LINE)), `缺告警线数字 ${WARN_LINE}`);
check('数法 LF 口径', text.includes('LF'), '缺数法 LF 口径');
check('超线原话', text.includes(OVER_LINE), `缺超线原话「${OVER_LINE}」`);

// ④ 台账解析源
const ledger = parseLedger(text);
for (const p of ledger.problems) check('台账解析源', false, p);
if (ledger.problems.length === 0) check('台账解析源', true);
const ledgerPaths = new Set(ledger.rows.map((r) => r.path));

// ⑤ 陈化：台账逐行的件在盘上、且「当场实测」列＝实况
const face = scanFace(SCAN_ROOT);
const faceMap = new Map(face.map((f) => [f.path, f.lf]));
for (const row of ledger.rows) {
  const actual = faceMap.get(row.path);
  if (actual === undefined) {
    check(`台账件在扫描面内：${row.path}`, false, `台账点名了扫描面内不存在的件：${row.path}`);
    continue;
  }
  const claimed = Number(row.实测);
  if (!Number.isInteger(claimed)) {
    check(`台账行可读：${row.path}`, false, `台账行「当场实测」不是整数：${row.raw}`);
    continue;
  }
  check(
    `台账与实况一致：${row.path}`,
    claimed === actual,
    `台账陈化：${row.path} 台账=${claimed} 实况=${actual}（把该行第 3 列改成 ${actual} 即同步）`,
  );
}

// ⑥ 漏报：扫描面里每个超线件都必须在台账里
const overLine = face.filter((f) => f.lf > WARN_LINE);
for (const f of overLine) {
  check(`超线件已挂号：${f.path}`, ledgerPaths.has(f.path), `漏报（台账没有）：${f.path} LF=${f.lf}`);
}

// ⑦ 挂号台账两行齐全：件仍在台账里、挂号值＝冻结值（删任意一行必红）
let requiredHit = 0;
for (const r of REQUIRED) {
  const row = ledger.rows.find((x) => x.path === r.path);
  if (!row) {
    check(`挂号台账行：${r.path}`, false, `台账缺行：${r.path}`);
    continue;
  }
  if (row.挂号值 !== String(r.lf)) {
    check(
      `挂号台账行：${r.path}`,
      false,
      `挂号值被改写：${r.path}（台账 ${row.挂号值} ≠ 需求原文冻结值 ${r.lf}）`,
    );
    continue;
  }
  requiredHit += 1;
  check(`挂号台账行：${r.path}`, true);
}

for (const f of overLine) {
  console.log('OVER ' + f.path + ' LF=' + f.lf + ' ' + OVER_LINE + '（本次先不拆，见台账）');
}
const overPaths = new Set(overLine.map((f) => f.path));
for (const row of ledger.rows) {
  if (overPaths.has(row.path)) continue;
  console.log('IN-LINE ' + row.path + ' 挂号=' + row.挂号值 + ' 实测=' + row.实测 + '（已落回线内，挂号行保留）');
}
console.log('SCAN-ROOT: ' + SCAN_ROOT);
console.log('LEDGER: ' + AGENTS_PATH);
console.log(
  'AGENTS.md：' + AGENTS_PATH + '（台账 ' + ledger.rows.length + ' 行；扫描面 ' + face.length
  + ' 件，超线 ' + overLine.length + ' 件；挂号台账命中 ' + requiredHit + '/' + REQUIRED.length + '）',
);

const failed = checks.filter((c) => !c.ok);
for (const c of failed) console.log('RED ' + (c.detail || c.name));
console.log('RESULT: ' + (checks.length - failed.length) + '/' + checks.length);
if (failed.length > 0) {
  console.error('FAIL: 告警线台账未过（删台账任意一行、漏挂号一个超线件、'
    + '或台账行数与实况不符，都必红；补齐即绿）');
  process.exit(1);
}
console.log('PASS: 告警线台账齐全且与实况一致');
