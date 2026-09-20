// #820 备忘录场景 HTML 全量开发（wayfinder map）：建原生子议题边 ＋ 原生阻塞依赖边，并逐项自校验。
//
// 口径（照 docs/agents/issue-tracker.md「Wayfinding operations」）：
//   · 子议题边：POST repos/{owner}/{repo}/issues/<map>/sub_issues  -F sub_issue_id=<子议题数据库 id>
//   · 阻塞边  ：POST repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<阻塞票数据库 id>
//   · 校验    ：子议题边数 = GET issues/<map>/sub_issues 的 length；阻塞边数 = GET issues/<child> 的
//              issue_dependencies_summary.blocked_by（后端口径是「未关的阻塞票数」）。
//
// 本脚本**自己校验**：expected 与 actual 对不上就非零退出并点名差在哪。
// 跑法：node docs/skills/skill-memo-ilife/t820-wire-edges.mjs
import { execFileSync } from 'node:child_process';

const REPO = 'FeatherHunter/ilife';
const MAP = 820;

/** 子票：序 -> 议题号。序即计划里的序。 */
const CHILDREN = {
  1: 821, 2: 822, 3: 823, 4: 824, 5: 825,
  6: 826, 7: 827, 8: 828, 9: 829, 10: 830, 11: 831, 12: 832, 13: 833,
  14: 834, 15: 835,
  // 执行期新增（票 1 关票时顺势开出）
  16: 837, 17: 838,
};

/** 阻塞图：子票序 -> 阻塞它的那些子票序。 */
const BLOCKED_BY = {
  1: [],
  2: [1, 16],
  3: [1, 2, 16],
  4: [2],
  5: [2],
  6: [2, 3, 4, 17], 7: [2, 3, 4, 17], 8: [2, 3, 4, 17], 9: [2, 3, 4, 17],
  10: [2, 3, 4, 17], 11: [2, 3, 4, 17], 12: [2, 3, 4, 17], 13: [2, 3, 4, 17],
  14: [5, 6, 7, 8, 9, 10, 11, 12, 13],
  15: [14],
  16: [],
  17: [16],
};

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
const api = (path, method, fields = []) => {
  const args = ['api', path];
  if (method) args.push('--method', method);
  for (const [k, v] of fields) args.push('-F', `${k}=${v}`);
  return gh(args);
};

const fail = [];
const ok = [];

// ── 1 取数据库 id ────────────────────────────────────────────────────────────
const dbIdOf = (n) => Number(gh(['api', `repos/${REPO}/issues/${n}`, '--jq', '.id']));

const ids = new Map();
for (const [seq, n] of Object.entries(CHILDREN)) {
  const id = dbIdOf(n);
  if (!Number.isFinite(id) || id <= 0) fail.push(`取不到 #${n}（序 ${seq}）的数据库 id`);
  ids.set(Number(seq), id);
}
console.log(`[1/4] 取到 ${ids.size} 张子票的数据库 id`);

// ── 2 建子议题边（幂等：已在里面的不重复建）────────────────────────────────
const before = JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate']));
const existing = new Set(before.map((x) => x.number));
let added = 0;
for (const [seq, n] of Object.entries(CHILDREN)) {
  if (existing.has(n)) continue;
  try {
    api(`repos/${REPO}/issues/${MAP}/sub_issues`, 'POST', [['sub_issue_id', ids.get(Number(seq))]]);
    added++;
    console.log(`       + 子议题边 #${MAP} <- #${n}`);
  } catch (e) {
    fail.push(`建子议题边失败 #${MAP} <- #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`);
  }
}
const afterSub = JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate']));
const actualSub = afterSub.length;
const expectedSub = Object.keys(CHILDREN).length;
if (actualSub === expectedSub) ok.push(`子议题边 expected ${expectedSub} = actual ${actualSub}（新增 ${added}）`);
else fail.push(`子议题边 expected ${expectedSub} ≠ actual ${actualSub}`);

// ── 3 建原生阻塞边（幂等：已在里面的不重复建）───────────────────────────────
let addedDep = 0;
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  const seq = Number(seqStr);
  const child = CHILDREN[seq];
  if (!blockers.length) continue;
  let live = [];
  try {
    live = JSON.parse(gh(['api', `repos/${REPO}/issues/${child}/dependencies/blocked_by`, '--paginate'])).map((x) => x.number);
  } catch {
    live = [];
  }
  for (const b of blockers) {
    const blocker = CHILDREN[b];
    if (live.includes(blocker)) continue;
    try {
      api(`repos/${REPO}/issues/${child}/dependencies/blocked_by`, 'POST', [['issue_id', ids.get(b)]]);
      addedDep++;
      console.log(`       + 阻塞边 #${child} blocked_by #${blocker}`);
    } catch (e) {
      fail.push(`建阻塞边失败 #${child} blocked_by #${blocker}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`);
    }
  }
}

// ── 4 逐票校验阻塞边数 ──────────────────────────────────────────────────────
// ⚠️ 口径（踩过一次）：GitHub 的 `blocked_by` **只数未关的**阻塞票，是「现场闸门」；
//    `total_blocked_by` 才数**声明的全部边**（含已关的）。校验「边建了没有」必须用后者，
//    前者随阻塞票关票会变小 —— 那是正常的，不是漏建。
let depTotal = 0;
let depExpectedTotal = 0;
let openGate = 0;
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  const seq = Number(seqStr);
  const child = CHILDREN[seq];
  const raw = JSON.parse(gh(['api', `repos/${REPO}/issues/${child}`, '--paginate']));
  const summary = raw.issue_dependencies_summary ?? {};
  const actual = Number(summary.total_blocked_by ?? 0);
  const expected = blockers.length;
  depTotal += actual;
  depExpectedTotal += expected;
  openGate += Number(summary.blocked_by ?? 0);
  if (actual !== expected) fail.push(`#${child}（序 ${seq}）阻塞边 expected ${expected} ≠ actual ${actual}`);
}
if (depTotal === depExpectedTotal) ok.push(`阻塞边合计 expected ${depExpectedTotal} = actual ${depTotal}（新增 ${addedDep}）`);
else fail.push(`阻塞边合计 expected ${depExpectedTotal} ≠ actual ${depTotal}`);
ok.push(`其中未关的阻塞票合计 ${openGate} 条（＝当前真实闸门，随关票会下降）`);

// ── 汇总 ────────────────────────────────────────────────────────────────────
console.log('');
for (const line of ok) console.log(`  OK   ${line}`);
for (const line of fail) console.log(`  FAIL ${line}`);
console.log('');
if (fail.length) {
  console.log(`结果：${fail.length} 项对不上 -> 不可发`);
  process.exit(1);
}
console.log(`结果：子议题边 ${actualSub}/${expectedSub} 张；阻塞边 ${depTotal}/${depExpectedTotal} 条；缺失 0 -> 可发`);
