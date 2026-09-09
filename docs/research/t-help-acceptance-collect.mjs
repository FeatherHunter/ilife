#!/usr/bin/env node
/**
 * t-help-acceptance-collect.mjs · 整图验收「静态对账层」采集器（地图 #63 · 本方案 §2／§4 的可复算落地）
 *
 * 定位（**只读、零写入、零网络、零第三方依赖**）：
 *   本脚本是 `docs/research/t-help-acceptance-plan.md` §2 判据的**静态子集**实现——
 *   凡「不 spawn CLI、不渲染页面」就能判的计数／契约／冻结物，都在这里一次算清并给机读摘要行。
 *   **它不替代**主线判据：exec 逐条实跑（`t81-exec-smoke.mjs`）、HELP 数据模型（`help-center-*.test.mjs`）、
 *   视觉锁（`t105-check-rulers.mjs`）仍须各自复跑；本脚本只保证「**计数与冻结物不许悄悄漂移**」。
 *
 * 跑法（协议 §2.4：读 dist 的判据一律经持锁包装器）：
 *   node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance-collect.mjs
 *
 * 退出码：0 ＝ 全部核对通过；1 ＝ 有漂移（逐条打印 expected/actual）；2 ＝ 缺 `dist/`（先 `pnpm build`，**不静默变绿**）。
 * 末行：`RESULT: n/m`（机器可读摘要行，口径与 `t83-evidence.mjs:251` 同形）。
 *
 * 判据来源（每条都在输出里带出处）：
 *   - `docs/research/t71-old-trigger-records.csv`（旧版 436 条 SoT，受跟踪）
 *   - `docs/research/t71-old-baseline-inventory.md:226-234,283-295`（73／67 判定计数，E3 台账）
 *   - `packages/skill-calorie/{dist,src}`（TRIGGERS／路由两桶／99 键）
 *   - `packages/base-render/src/spec/index.ts`（`SPEC_FROZEN_SURFACE` 130 条）
 *   - `fixtures/help-instances/{SHA256SUMS.txt,*.html}`（旧 HELP 实例冻结物）
 *   - `docs/visual-spec-help.md`／`docs/visual-spec-blocks.md`（B1 20 条／12 区块）
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const p = (...s) => join(ROOT, ...s);
const read = (rel) => readFileSync(p(rel), 'utf8');

let pass = 0;
let fail = 0;
const rows = [];
function check(id, what, cond, expected, actual, src) {
  rows.push({ id, what, ok: !!cond, expected, actual, src });
  if (cond) pass += 1;
  else fail += 1;
  console.log(
    (cond ? 'PASS ' : 'FAIL ') + id + ' · ' + what + ' · 期望=' + expected + ' 实测=' + actual + ' · ' + src,
  );
}
function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

/* ── 前置：dist 必须存在（本脚本消费 CLI 出口与冻结面，不 import 技能源码） ───────── */
const DIST = {
  triggers: p('packages', 'skill-calorie', 'dist', 'triggers', 'index.js'),
  routing: p('packages', 'skill-calorie', 'dist', 'triggers', 'routing.js'),
  keys: p('packages', 'skill-calorie', 'dist', 'cli', 'keys.js'),
  spec: p('packages', 'base-render', 'dist', 'spec', 'index.js'),
};
for (const [k, v] of Object.entries(DIST)) {
  if (!existsSync(v)) die(2, '缺 dist 产物：' + k + '（先 `pnpm build`）');
}

const { TRIGGERS } = await import(pathToFileURL(DIST.triggers).href);
const routing = await import(pathToFileURL(DIST.routing).href);
const keys = await import(pathToFileURL(DIST.keys).href);
const spec = await import(pathToFileURL(DIST.spec).href);

/* ── A 段 · 主线① 的静态面（计数，不含实跑） ─────────────────────────────────── */
const sotCsv = read('docs/research/t71-old-trigger-records.csv').split(/\r?\n/).filter((l) => l.trim() !== '');
check('A1', '旧版 SoT 唤醒词条数（CSV 数据行 = 总行 − 表头）', sotCsv.length - 1 === 436, 436, sotCsv.length - 1, 'docs/research/t71-old-trigger-records.csv');
check('A2', 'TRIGGERS 条数 = SoT', TRIGGERS.length === 436, 436, TRIGGERS.length, 'packages/skill-calorie/dist/triggers/index.js');
check('A3', 'WAKE_ROUTES 条数 = SoT', routing.WAKE_ROUTES.length === 436, 436, routing.WAKE_ROUTES.length, 'dist/triggers/routing.js');
check('A4', 'exec 桶', routing.EXEC_ROUTES.length === 341, 341, routing.EXEC_ROUTES.length, 'routing.ts EXEC_ROUTES ＋ help-center-106.test.mjs:66');
check('A5', 'non-exec 桶', routing.HIT_NOT_EXEC_ROUTES.length === 95, 95, routing.HIT_NOT_EXEC_ROUTES.length, 'routing.ts HIT_NOT_EXEC_ROUTES ＋ help-center-106.test.mjs:67');
check('A6', '两桶之和 = 436（互斥且完备）', routing.EXEC_ROUTES.length + routing.HIT_NOT_EXEC_ROUTES.length === 436, 436, routing.EXEC_ROUTES.length + routing.HIT_NOT_EXEC_ROUTES.length, '同上两条');
check('A7', '新拟入口（#111–#113／#86 追加后）', routing.NEW_KEY_ROUTES.length === 56, 56, routing.NEW_KEY_ROUTES.length, 'routing.ts NEW_KEY_ROUTES');
check('A8', '覆盖修复入口', routing.COVERAGE_REPAIR_ROUTES.length === 1, 1, routing.COVERAGE_REPAIR_ROUTES.length, 'routing.ts COVERAGE_REPAIR_ROUTES');
check('A9', 'ALL_ROUTES = 436 ＋ 56 ＋ 1', routing.ALL_ROUTES.length === 493, 493, routing.ALL_ROUTES.length, 'routing.ts:680');
check('A10', '门面 description 含「卡路里HELP」', read('packages/skill-calorie/SKILL.md').includes('卡路里HELP'), true, read('packages/skill-calorie/SKILL.md').includes('卡路里HELP'), 'SKILL.md:3（#82）');

/* ── B 段 · 主线② 的静态面（尺子与冻结物，不含渲染／浏览器） ─────────────────── */
const descLine = read('packages/skill-calorie/SKILL.md').match(/^description:\s*(.+)$/m);
const desc = descLine ? descLine[1].trim().replace(/^"|"$/g, '') : '';
check('B1', 'description 字符数 ≤ 500（宿主截断预算）', desc.length > 0 && desc.length <= 500, '≤500', desc.length, 'SKILL.md:3 ＋ #82 票面（实测余量 4）');
const helpSpec = read('docs/visual-spec-help.md');
const hItems = [...helpSpec.matchAll(/^### (H-\d\d) /gm)].map((m) => m[1]);
check('B2', 'B1 逐值条目数', hItems.length === 20, 20, hItems.length, 'docs/visual-spec-help.md:47-49');
check('B3', 'B1 编号连续 H-01…H-20 且无重复', new Set(hItems).size === 20 && hItems[0] === 'H-01' && hItems[19] === 'H-20', 'H-01…H-20', hItems.join(','), '同上');
const blkSpec = read('docs/visual-spec-blocks.md');
const bItems = [...blkSpec.matchAll(/^### (B-\d\d) /gm)].map((m) => m[1]);
check('B4', '内容页区块数', bItems.length === 12, 12, bItems.length, 'docs/visual-spec-blocks.md:26-41');
check('B5', '区块编号连续 B-01…B-12 且无重复', new Set(bItems).size === 12 && bItems[0] === 'B-01' && bItems[11] === 'B-12', 'B-01…B-12', bItems.join(','), '同上');

/* 旧 HELP 实例冻结物：sha256 自校验（只读，禁改写） */
const sums = read('fixtures/help-instances/SHA256SUMS.txt').split(/\r?\n/).filter((l) => l.trim() !== '');
check('B6', '冻结 HELP 实例条数', sums.length === 2, 2, sums.length, 'fixtures/help-instances/README.md:15-16');
let hashOk = 0;
for (const line of sums) {
  const m = line.match(/^([0-9a-f]{64})\s{2}(.+)$/);
  if (!m) continue;
  const actual = createHash('sha256').update(readFileSync(p('fixtures', 'help-instances', m[2]))).digest('hex');
  if (actual === m[1]) hashOk += 1;
  else console.log('  ↳ 哈希不符：' + m[2] + ' 期望=' + m[1] + ' 实测=' + actual);
}
check('B7', '冻结 HELP 实例 sha256 逐件相符', hashOk === sums.length, sums.length, hashOk, 'SHA256SUMS.txt 自校验');

/* ── C 段 · 主线③ 的静态面（冻结面 ＋ 键表 ＋ 旧侧台账一致性） ───────────────── */
check('C1', '冻结面条目数', spec.SPEC_FROZEN_SURFACE.length === 130, 130, spec.SPEC_FROZEN_SURFACE.length, 'packages/base-render/src/spec/index.ts');
const impl = spec.SPEC_FROZEN_SURFACE.filter((e) => e.status === 'implemented').length;
const pend = spec.SPEC_FROZEN_SURFACE.filter((e) => e.status === 'pending').length;
check('C2', '冻结面 implemented', impl === 130, 130, impl, '同上（#75 收官口径）');
check('C3', '冻结面 pending', pend === 0, 0, pend, '同上');
const allKeys = Object.keys(keys.CALORIE_COMBOS);
const writeKeys = Object.keys(keys.CALORIE_WRITE_COMBOS);
check('C4', '注册键总数（读＋写）', allKeys.length === 99, 99, allKeys.length, 'cmd-read-t11.test.mjs:79-80');
check('C5', '写键数', writeKeys.length === 35, 35, writeKeys.length, 'cmd-write-40.test.mjs:72');
check('C6', '读键数 = 99 − 35', allKeys.length - writeKeys.length === 64, 64, allKeys.length - writeKeys.length, 'db-readonly-93.test.mjs:287');
check('C7', '路由覆盖键 ⊇ 全部注册键（#81 D2③；non-exec 桶 key=null 不计）', new Set(routing.ALL_ROUTES.map((r) => r.key).filter(Boolean)).size === 99, 99, new Set(routing.ALL_ROUTES.map((r) => r.key).filter(Boolean)).size, 'routing.ts ＋ 99 键注册表');
check('C8', 'non-exec 桶 key 恒为 null（命中但不执行＝无入口键）', routing.HIT_NOT_EXEC_ROUTES.every((r) => r.key == null), '全部 null', routing.HIT_NOT_EXEC_ROUTES.filter((r) => r.key != null).length + ' 条非 null', 'routing.ts HIT_NOT_EXEC_ROUTES');

/* 旧侧台账（E3）一致性：只核对「台账声明的数字」与地图口径一致，**不重算**（旧树不在仓） */
const inv = read('docs/research/t71-old-baseline-inventory.md');
const declared = (re) => (inv.match(re) ?? [null])[0];
check('C9', 'E3 台账：模板 73 判定 47／18／5／3', /新版已有 \| \*\*47\*\*/.test(inv) && /\| 需移植 \| \*\*18\*\*/.test(inv) && /\| 新架构不适用 \| \*\*5\*\*/.test(inv) && /\| 明确不做 \| \*\*3\*\*/.test(inv), '47/18/5/3', '见台账', 't71-old-baseline-inventory.md:226-234');
check('C10', 'E3 台账：渲染脚本 46 映射／19 无对应', /\| 已映射（NEW 键／渲染器） \| \*\*46\*\*/.test(inv) && /未映射数 = 16（需移植）\+ 3（明确不做）= 19/.test(inv), '46/19', '见台账', 't71-old-baseline-inventory.md:283-295');
/* ── 摘要 ───────────────────────────────────────────────────────────────── */
const total = pass + fail;
const byPrefix = (pfx) => {
  const rs = rows.filter((r) => r.id.startsWith(pfx));
  return rs.filter((r) => r.ok).length + '/' + rs.length;
};
console.log('');
console.log('小计：A 段（主线① 静态面）=' + byPrefix('A') + '　B 段（主线② 静态面）=' + byPrefix('B') + '　C 段（主线③ 静态面）=' + byPrefix('C'));
console.log('说明：本脚本只判「计数／契约／冻结物」；exec 逐条实跑、HELP 数据模型、视觉锁与浏览器交互见方案 §2 对应命令。');
console.log('RESULT: ' + pass + '/' + total + (fail === 0 ? ' PASS' : ' FAIL'));
process.exit(fail === 0 ? 0 : 1);
