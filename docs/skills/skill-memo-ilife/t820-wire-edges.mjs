// #820 备忘录场景 HTML 全量开发（wayfinder map）：把子议题边与阻塞边**同步到目标图**，并逐项自校验。
//
// 与第一版的区别：第一版只会「补边」，这一版会**删边** —— 因为目标图里有些边被第一性重推解掉了
// （见 docs/skills/skill-memo-ilife/t820-图重设计-第一性.md §七 变更清单）。
// 脚本按「期望图」做一次 diff：缺的照 POST。
//
// 2026-09-22 改（收口调查翻出）：**字典之外只报不改**。原先「字典之外的边一律 DELETE」是条雷 ——
// 字典停在序 37，而现场又挂上 #858／#874／#875／#885，谁重跑一次就把刚挂的票（含挡住收口的两条边）
// 原地摘掉，输出还照样报「缺失 0 -> 可发」。现在：字典外的一律只报、并让脚本 exit 1；要摘边得先把
// 字典补齐或走人的裁定。新增 `--dry-run`：只读差分，一字不写。
//
// 口径（照 docs/agents/issue-tracker.md「Wayfinding operations」）：
//   · 子议题边：POST repos/{owner}/{repo}/issues/<map>/sub_issues  -F sub_issue_id=<子议题数据库 id>
//   · 阻塞边  ：POST   repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<阻塞票数据库 id>
//   · 删阻塞边：**已退役**（2026-09-22）。老版本会用 DELETE 把「字典之外的边」删掉，
//               那正是「重跑摘票」的雷；现在字典外只报不改，脚本里不再有任何 DELETE 调用。
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
  // 2026-09-21 补（#835 派活前的写集验算）：26–28 那三张判据票关票时留了两片没主的活
  // （渲染面读不到的判据面／两列表右缘几何读数）。判据面按仓例只由公共层件承接 ⇒ 另开两票，
  // 各自附在提出它的那张票后面，且**不进关键路径**（#835 不依赖它们）。
  36: 883,  // ← #878 的遗留：渲染面与 CSS 生成内容的分隔符／文字判据
  37: 884,  // ← #879 的遗留：两列表「表头与同列值右缘差 ≤2px」机器读数
  // 2026-09-22 补（收口调查翻出）：本图收口期又挂上四张，本字典原先没有它们 ——
  // 而旧行为是「字典之外一律 DELETE」，谁重跑一次就会把它们原地摘掉（含挡住收口的两条边）。
  // 序 38–40 由地图正文点名；序 41（#874）是 #855 拆件留下的包内红，它自己的正文写「无所属地图」，
  // 边与票面口径的矛盾**在地图上待裁**，本字典如实登记现场状态（边在）。
  38: 875,  // 失败态那一页的文案（挡收口）
  39: 858,  // 路由表清理四问实施（路线余款，不挡收口）
  40: 885,  // 向导两模板条件分支与载荷（挡收口）
  41: 874,  // 门太宽：包内长期红（#855 拆件的余债）
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
  // 但**七张里有四张共用 `packages/skill-memo-ilife/templates/` 那五份每页一份的模板件**
  // （写集验算件 `.scratch/t835/写集-验算.mjs`，2026-09-21）：#877／#878／#880 都要动
  // wish 向导族与 `change_category.html`／`memo_query.html` 这几份 ⇒ 三条串行边，
  // 让「同一时刻只许一张票写这批模板」由阻塞图保证，不靠派活时人工避让。
  29: [], 30: [], 31: [], 32: [], 33: [30, 31], 34: [33], 35: [],
  36: [31],  // 判据面·渲染面读不到的：附在 #878 后
  37: [32],  // 判据面·两列表几何读数：附在 #879 后
  // 2026-09-22 补：收口期四张都无前置。
  // 注意 #875／#885 挡的是**地图自身**（收口闸门第 3 条），不在这一段，见 MAP_BLOCKED_BY。
  38: [], 39: [], 40: [], 41: [],
};

/** ★ 地图自身的目标边：收口闸门第 3 条写的就是这两条（关掉才准关图）。 */
const MAP_BLOCKED_BY = [875, 885];

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

/** 老行为是「字典之外一律 DELETE」——2026-09-22 收口调查量出这条会**把字典没登记的真边摘掉**
 *  （#858／#874／#875／#885 正被摘）。改成：补缺照做，**字典之外只报不改**，并让它在汇总里报红。 */
const DRY = process.argv.includes('--dry-run');

// ── 1 数据库 id ──────────────────────────────────────────────────────────────
const ids = new Map();
for (const [seq, n] of Object.entries(CHILDREN)) ids.set(Number(seq), dbIdOf(n));
ok.push(`取到 ${ids.size} 张子票的数据库 id`);

// ── 2 子议题边：补缺；字典之外只报不改 ──────────────────────────────────────
const wantSub = new Set(Object.values(CHILDREN));
const haveSub = new Set(JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate'])).map((x) => x.number));
let addedSub = 0;
for (const n of wantSub) {
  if (haveSub.has(n)) continue;
  if (DRY) { console.log(`  ? 缺子议题边 #${MAP} <- #${n}（--dry-run 未写）`); continue; }
  try { api(`repos/${REPO}/issues/${MAP}/sub_issues`, 'POST', [['sub_issue_id', dbIdOf(n)]]); addedSub++; console.log(`  + 子议题边 #${MAP} <- #${n}`); }
  catch (e) { fail.push(`建子议题边失败 #${MAP} <- #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
}
const finalSub = JSON.parse(gh(['api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate']));
const extraSub = finalSub.map((x) => x.number).filter((n) => !wantSub.has(n));
for (const n of extraSub) console.log(`  ! 子议题边字典外 #${MAP} <- #${n}（只报不改：要摘得先把字典补齐或走人的裁定）`);
if (finalSub.length - extraSub.length === wantSub.size) ok.push(`子议题边 expected ${wantSub.size} = actual ${finalSub.length - extraSub.length}（新增 ${addedSub}；字典外 ${extraSub.length} 条只报不改）`);
else fail.push(`子议题边 expected ${wantSub.size} ≠ actual ${finalSub.length - extraSub.length}`);

// ── 3 阻塞边：补缺；字典之外只报不改 ────────────────────────────────────────
const blockersOf = (child) => {
  try { return JSON.parse(gh(['api', `repos/${REPO}/issues/${child}/dependencies/blocked_by`, '--paginate'])).map((x) => x.number); }
  catch { return []; }
};
let addedDep = 0;
const addDep = (child, n) => {
  if (DRY) { console.log(`  ? 缺阻塞边 #${child} blocked_by #${n}（--dry-run 未写）`); return; }
  try { api(`repos/${REPO}/issues/${child}/dependencies/blocked_by`, 'POST', [['issue_id', dbIdOf(n)]]); addedDep++; console.log(`  + 阻塞边 #${child} blocked_by #${n}`); }
  catch (e) { fail.push(`建阻塞边失败 #${child} blocked_by #${n}：${String(e.stderr ?? e.message).trim().split('\n')[0]}`); }
};
const extraDep = [];
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  const child = CHILDREN[Number(seqStr)];
  const wantNums = blockers.map((b) => CHILDREN[b]);
  const haveNums = blockersOf(child);
  for (const n of wantNums) if (!haveNums.includes(n)) addDep(child, n);
  for (const n of haveNums) if (!wantNums.includes(n)) extraDep.push([child, n]);
}
/* 地图自身的边（收口闸门第 3 条）也走同一套：目标图写在 MAP_BLOCKED_BY */
for (const n of MAP_BLOCKED_BY) if (!blockersOf(MAP).includes(n)) addDep(MAP, n);
for (const n of blockersOf(MAP)) if (!MAP_BLOCKED_BY.includes(n)) extraDep.push([MAP, n]);
for (const [child, n] of extraDep) console.log(`  ! 阻塞边字典外 #${child} blocked_by #${n}（只报不改）`);

// ── 4 逐票核对（用 total_blocked_by ＝声明的全部边；blocked_by 只数未关的）──
let totalExpected = 0, totalActual = 0, openGate = 0;
const verifyOne = (label, child, wantLen) => {
  const s = JSON.parse(gh(['api', `repos/${REPO}/issues/${child}`, '--paginate'])).issue_dependencies_summary ?? {};
  const actual = Number(s.total_blocked_by ?? 0);
  totalExpected += wantLen;
  totalActual += actual;
  openGate += Number(s.blocked_by ?? 0);
  if (actual !== wantLen) fail.push(`${label} 阻塞边 expected ${wantLen} ≠ actual ${actual}`);
};
for (const [seqStr, blockers] of Object.entries(BLOCKED_BY)) {
  verifyOne(`#${CHILDREN[Number(seqStr)]}（序 ${seqStr}）`, CHILDREN[Number(seqStr)], blockers.length);
}
verifyOne(`#${MAP}（地图自身）`, MAP, MAP_BLOCKED_BY.length);
if (totalActual === totalExpected) ok.push(`阻塞边合计 expected ${totalExpected} = actual ${totalActual}（新增 ${addedDep}／删除 0，字典外只报不改）`);
else fail.push(`阻塞边合计 expected ${totalExpected} ≠ actual ${totalActual}`);
ok.push(`其中未关的阻塞票合计 ${openGate} 条（＝当前真实闸门）`);

// ── 汇总 ────────────────────────────────────────────────────────────────────
console.log('');
for (const l of ok) console.log(`  OK   ${l}`);
for (const l of fail) console.log(`  FAIL ${l}`);
console.log('');
const extra = extraSub.length + extraDep.length;
if (extra > 0) {
  console.log(`结果：字典外 ${extra} 条（子议题 ${extraSub.length}／阻塞 ${extraDep.length}）—— 只报不改；把字典补齐或说明它们为什么留在现场`);
  process.exit(1);
}
if (fail.length) { console.log(`结果：${fail.length} 项对不上 -> 不可发`); process.exit(1); }
console.log(`结果：子议题边 ${finalSub.length}/${wantSub.size} 张；阻塞边 ${totalActual}/${totalExpected} 条；缺失 0、字典外 0 -> 可发${DRY ? '（--dry-run：一字未写）' : ''}`);
