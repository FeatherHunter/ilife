// #820 备忘录场景 HTML 全量开发（wayfinder map）：把子议题边与阻塞边**同步到目标图**，并逐项自校验。
//
// 与第一版的区别：第一版只会「补边」，这一版会**删边** —— 因为目标图里有些边被第一性重推解掉了
// （见 docs/skills/skill-memo-ilife/t820-图重设计-第一性.md §七 变更清单）。
// 脚本按「期望图」做一次 diff：缺的 POST、多的 DELETE、最后逐票核对总数。
//
// 口径（照 docs/agents/issue-tracker.md「Wayfinding operations」）：
//   · 子议题边：POST repos/{owner}/{repo}/issues/<map>/sub_issues  -F sub_issue_id=<子议题数据库 id>
//   · 阻塞边  ：POST   repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<阻塞票数据库 id>
//   · 删阻塞边：DELETE repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by/<阻塞票数据库 id>
//   · 校验    ：`total_blocked_by` ＝**声明的全部边**（用它核「边建没建对」）；
//               `blocked_by` ＝**只数未关的**（那是现场闸门，随关票会下降，**不能**拿来核边数）。
//
// 跑法：node docs/skills/skill-memo-ilife/t820-wire-edges.mjs
import { execFileSync } from 'node:child_process';

const REPO = 'FeatherHunter/ilife';
const MAP = 820;

/** 子票：序 -> 议题号。`closed` 只作备注，不参与 diff。 */
const CHILDREN = {
  1: 821, 2: 822, 3: 823, 4: 824, 5: 825,
  6: 826, 7: 827, 8: 828, 9: 829, 10: 830, 11: 831, 12: 832, 13: 833,
  14: 834, 15: 835,
  16: 837, 17: 838, 18: 842,
  // 2026-09-21 补：字典原先落后于现场（848／850／855／856 已挂上、849／851 没挂）。
  // 一并补到现场一致，否则本脚本的删除分支会把它们原地删掉。
  19: 848, 20: 849, 21: 850, 22: 855, 23: 856, 24: 851,
  // #851 按 #838 先例分解成四张（#820 任务清单序 25–28），四张即视觉基准三件 ＋ 读数链。
  25: 867, 26: 868, 27: 869, 28: 870,
  // 2026-09-21 补：#834 收口逐格看出的 11 格要改项归七张新票（#820 任务清单序 29–35），
  // 它们是「把关票前的优化」这半截活，必须挂上，否则终审会提前跑在带缺陷的产物上。
  29: 876, 30: 877, 31: 878, 32: 879, 33: 880, 34: 881, 35: 882,
};

/** ★ 目标图（第一性重推后的定稿）：子票序 -> 阻塞它的那些子票序。这就是权威。 */
const BLOCKED_BY = {
  1: [],   // 已关
  2: [],   // 册子冻结：份数来自 HELP types、命名与目录已有裁决 ⇒ 真无前置
  3: [16], // 结构规格：只等命令面四问
  4: [],   // 视觉基准：与份数命名正交 ⇒ 无前置
  5: [2],  // 验收形制：要消费册子的清单字段
  // 8 张域票：关票要过两门（机审 ＋ 五维尺），两门的件住 25–28 四张 ⇒ 真依赖，补上。
  6: [2, 3, 4, 25, 26, 27, 28], 7: [2, 3, 4, 25, 26, 27, 28],
  8: [2, 3, 4, 25, 26, 27, 28], 9: [2, 3, 4, 25, 26, 27, 28],
  10: [2, 3, 4, 25, 26, 27, 28], 11: [2, 3, 4, 25, 26, 27, 28],
  12: [2, 3, 4, 25, 26, 27, 28], 13: [2, 3, 4, 25, 26, 27, 28],
  14: [5, 6, 7, 8, 9, 10, 11, 12, 13],
  // 终审：先等收口 14；收口逐格翻出的 11 格要改项（七张票）也是「优化落地」这半截，
  // 未关就开终审＝拿带缺陷的产物打分（本票票面写的是「在全部优化落地之后」）⇒ 一并挡在前面。
  15: [14, 29, 30, 31, 32, 33, 34, 35],
  16: [],  // 命令面四问：frontier
  17: [16], // 已关（活分解到 #823 与各域票），保留边作历史
  18: [16], // 路由表清理：与命令面四问有关联 ⇒ 挂在它后面
  19: [],   // 规格：#822 册子冻结实施（已关，活已由 #848 承接）
  20: [],   // 规格：#824 结论固化（已关）
  21: [16], // 规格：命令面四问实施（等 837 定稿）
  22: [3],  // 规格：src 按 8 域重排实施（等 823 的形状）
  23: [],   // 规格：验收形制实施
  24: [],   // #851：已按 #838 先例分解成 25–28，只留历史位置
  25: [],   // 读数链：只吃既有形状 ⇒ 无前置（与 26 并行）
  26: [],   // 判分引擎：冻结值与夹具都在本票内 ⇒ 无前置
  27: [],   // 六列机审：只消费 t856 名单 ⇒ 无前置
  28: [27], // 形状件接线：判据先于被它判的活（拿机审当尺）
  // #834 收口翻出的 11 格要改项（七张票）：都是「只等开工」的活 ⇒ 真无前置，各可并行。
  29: [], 30: [], 31: [], 32: [], 33: [], 34: [], 35: [],
};

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...opts }).trim();
const api = (path, method, fields = []) => {
  const args = ['api', path];
  if (method) args.push('--method', method);
  for (const [k, v] of fields) args.push('-F', `${k}=${v}`);
  return gh(args);
};
const dbIdOf = (n) => Number(gh(['api', `repos/${REPO}/issues/${n}`, '--jq', '.id']));

const ok = [];
const fail = [];

// ── 1 数据库 id ──────────────────────────────────────────────────────────────
const ids = new Map();
for (const [seq, n] of Object.entries(CHILDREN)) ids.set(Number(seq), dbIdOf(n));
ok.push(`取到 ${ids.size} 张子票的数据库 id`);

// ── 2 子议题边：同步 ────────────────────────────────────────────────────────
const wantSub = new Set(Object.values(CHILDREN));
const haveSub = new Set(JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate'])).map((x) => x.number));
let addedSub = 0;
for (const n of wantSub) {
  if (haveSub.has(n)) continue;
  try { api(`repos/${REPO}/issues/${MAP}/sub_issues`, 'POST', [['sub_issue_id', dbIdOf(n)]]); addedSub++; console.log(`  + 子议题边 #${MAP} <- #${n}`); }
  catch (e) { fail.push(`建子议题边失败 #${MAP} <- #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
}
const liveSub = new Set(JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate'])).map((x) => x.number));
for (const n of liveSub) {
  if (wantSub.has(n)) continue;
  try { api(`repos/${REPO}/issues/${MAP}/sub_issues/${dbIdOf(n)}`, 'DELETE'); console.log(`  - 子议题边 #${MAP} <- #${n}（目标图里没有）`); }
  catch (e) { fail.push(`删子议题边失败 #${MAP} <- #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
}
const finalSub = JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate']));
if (finalSub.length === wantSub.size) ok.push(`子议题边 expected ${wantSub.size} = actual ${finalSub.length}（新增 ${addedSub}）`);
else fail.push(`子议题边 expected ${wantSub.size} ≠ actual ${finalSub.length}`);

// ── 3 阻塞边：按目标图 diff（补缺 ＋ 删多）────────────────────────────────
const blockersOf = (child) => {
  try { return JSON.parse(gh(['api', `repos/${REPO}/issues/${child}/dependencies/blocked_by`, '--paginate'])).map((x) => x.number); }
  catch { return []; }
};
let addedDep = 0, removedDep = 0;
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  const seq = Number(seqStr);
  const child = CHILDREN[seq];
  const wantNums = blockers.map((b) => CHILDREN[b]);
  const haveNums = blockersOf(child);
  for (const n of wantNums) {
    if (haveNums.includes(n)) continue;
    try { api(`repos/${REPO}/issues/${child}/dependencies/blocked_by`, 'POST', [['issue_id', dbIdOf(n)]]); addedDep++; console.log(`  + 阻塞边 #${child} blocked_by #${n}`); }
    catch (e) { fail.push(`建阻塞边失败 #${child} blocked_by #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
  }
  for (const n of haveNums) {
    if (wantNums.includes(n)) continue;
    try { api(`repos/${REPO}/issues/${child}/dependencies/blocked_by/${dbIdOf(n)}`, 'DELETE'); removedDep++; console.log(`  - 阻塞边 #${child} blocked_by #${n}（目标图里解掉了）`); }
    catch (e) { fail.push(`删阻塞边失败 #${child} blocked_by #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
  }
}

// ── 4 逐票核对（用 total_blocked_by ＝声明的全部边；blocked_by 只数未关的）──
let totalExpected = 0, totalActual = 0, openGate = 0;
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  const seq = Number(seqStr);
  const child = CHILDREN[seq];
  const raw = JSON.parse(gh(['api', `repos/${REPO}/issues/${child}`, '--paginate']));
  const s = raw.issue_dependencies_summary ?? {};
  const actual = Number(s.total_blocked_by ?? 0);
  totalExpected += blockers.length;
  totalActual += actual;
  openGate += Number(s.blocked_by ?? 0);
  if (actual !== blockers.length) fail.push(`#${child}（序 ${seq}）阻塞边 expected ${blockers.length} ≠ actual ${actual}`);
}
if (totalActual === totalExpected) ok.push(`阻塞边合计 expected ${totalExpected} = actual ${totalActual}（新增 ${addedDep}／删除 ${removedDep}）`);
else fail.push(`阻塞边合计 expected ${totalExpected} ≠ actual ${totalActual}`);
ok.push(`其中未关的阻塞票合计 ${openGate} 条（＝当前真实闸门）`);

// ── 汇总 ────────────────────────────────────────────────────────────────────
console.log('');
for (const l of ok) console.log(`  OK   ${l}`);
for (const l of fail) console.log(`  FAIL ${l}`);
console.log('');
if (fail.length) { console.log(`结果：${fail.length} 项对不上 -> 不可发`); process.exit(1); }
console.log(`结果：子议题边 ${finalSub.length}/${wantSub.size} 张；阻塞边 ${totalActual}/${totalExpected} 条；缺失 0 -> 可发`);
