#!/usr/bin/env node
/**
 * #765 第二轮机（并发设计版）：补票 ＋ 改票 ＋ 接线 ＋ 自校验。
 *
 * 第一性原理（本脚本按它组织）：
 *   1. 死锁的根源是**环** ⇒ 建边前先做拓扑排序，有环即拒绝并非零退出。
 *   2. 干扰的根源是**两张票同写一个文件** ⇒ 先设计写集；由此得出「整包落位」
 *      必须**前置**（票 16 早于 7 张域票），否则 7 张票会在同一批共用文件上互相踩。
 *   3. 结构票只验「行为不变」、功能票只验「功能变对」 ⇒ 两类判据不打架。
 *
 * 做五件事：
 *   1. 按锚点给既有票面打补丁（锚点必须**恰好出现一次**，改过即幂等跳过），并推回 GitHub；
 *   2. 新建三张票（16 落位／17 运行面沙箱／18 说明面同步），正文已按票面体例写好；
 *   3. 建原生子议题边与原生阻塞边（全图 18 张票的唯一阻塞真相源）；
 *   4. 全量校验：拓扑无环 ＋ 子议题 expected＝actual ＋ 阻塞边逐票 expected＝actual；
 *   5. --push-map：把 18 行计划表写回地图正文并推回。
 *
 * 用法：
 *   node docs/skills/skill-chef/t765-v2.mjs --map 765
 *   node docs/skills/skill-chef/t765-v2.mjs --map 765 --push-map
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const ticketsJsonPath = join(here, 't765-tickets.json');
const mapBodyOut = join(here, 'map-chef-parity-body.md');

/** 本次要新建的三张票：16 整包落位（前置）／17 运行面沙箱／18 说明面同步。 */
const NEW = [
  { n: 16, type: 'task', title: '【规格·落位】整包按形状落位：其余 9 域只搬不改 ＋ 四个工种目录定去留（并发前提）', bodyFile: join(here, 't765-t16-body.md') },
  { n: 17, type: 'task', title: '【实施】运行面沙箱：副本库器械 ＋ 本机配置指向真实库 ＋ 端到端读数', bodyFile: join(here, 't765-t17-body.md') },
  { n: 18, type: 'task', title: '【实施】说明面同步：SKILL.md 快照 37→50 ＋ HELP 页 14 张卡【待开发】翻可用', bodyFile: join(here, 't765-t18-body.md') },
];

/** 全图阻塞关系（18 张，唯一真相源）：child ← [blockers]。
 *  注：8／9／10／11 另带一条到票 4（#769，已关）的边——那四张票用的是它交出来的字段对账，
 *  边留作**来历**（已关不构成门）；活的闸门是 14／15 两张裁定票。 */
const BLOCKED_BY = {
  1: [],
  2: [],
  3: [1, 16],                       // 页面族住在共用位 ⇒ 与「整包落位」串行，避免同写一个渲染层
  4: [],
  5: [1, 2, 3, 16, 17],
  6: [1, 2, 3, 16, 17],
  7: [1, 2, 3, 16, 17],
  8: [1, 2, 3, 4, 16, 17, 14, 15],
  9: [1, 2, 3, 4, 16, 17, 14, 15],
  10: [1, 2, 3, 4, 16, 17, 14],
  11: [1, 2, 3, 4, 16, 17, 14, 15],
  12: [5, 6, 7, 8, 9, 10, 11],      // 收口 A：聚合 7 份册子片段
  13: [12],                          // 收口 B：只读册子出墙
  14: [],
  15: [],
  16: [1],                           // 落位跟在形状试点之后
  17: [],                            // 沙箱是 frontier：7 张域票都等它
  18: [2, 5, 6, 7, 8, 9, 10, 11],    // 说明面收在所有功能票之后
};

/** 既有票面的补丁：锚点必须恰好出现一次；marker 已存在则视为打过补丁（幂等）。 */
const GOAL_INSERT = [
  '另加三条本图口径（并发与收口，逐条可判）：',
  '',
  '- **过程性 vision 审查**：本票产物须过一次 vision_router 视觉审查，把查出的不合理之处**当场改掉**（缺陷不许拖到收口票）。',
  '- **册子片段**：本票产物登记成 `docs/skills/skill-chef/t<票号>-册子片段.json`（字段：卡 id／唤醒词／命令／参数／产物绝对路径／exit／bytes／sha256），供收口 A 合并；**不许直接改共用册子**。',
  '- **副本库沙箱**：数据一律走票 17 交的沙箱器械，复制到自己票号下的 `.scratch/t<票号>/`；**不许与其他票共用同一份副本**。',
  '',
  '## 验收命令',
  '',
].join('\n');

const ACCEPT_INSERT = [
  '- 判据（片段与视觉）：本票运行脚本带 `--check` 时必须同时打印「片段行数＝本票卡数」与「vision 审查缺陷 0（或逐条已改）」，两者缺一即红。',
  '',
  '## 不许动的东西',
  '',
].join('\n');

const PATCHES = [
  // ── 票 1：派生链必须扫域目录（并发前提的机器判据）──
  { n: 1, find: '4. 交「必报五步」全额：', marker: '派生链必须**扫域目录**',
    replace: '4. 派生链必须**扫域目录**（不是逐域登记）：新增一个域**只许碰该域自己的目录**，共用位零改动——这是后面 7 张域票能并行开工的前提。\n5. 交「必报五步」全额：' },
  { n: 1, find: '- 反例（必跑）：把 `html.sceneDir` 默认值改坏 → 配置测试必须红', marker: '本票核心判据',
    replace: '- 反例（必跑）：把 `html.sceneDir` 默认值改坏 → 配置测试必须红\n- 正例（本票核心判据）：临时加一个空域目录（只放三件空声明）→ 跑 `pnpm gen` → 生成物出现该域，且 `git diff --name-only` 只出现该域目录与生成物（**共用位零改动**）\n- 反例（必跑）：把生成器的扫描根去掉一个域目录 → `pnpm gen:check` 必须 exit 1 并点名缺哪个域' },
  // ── 票 3：扩容成「页面族 ＋ 页面质量门」──
  { n: 3, find: '5. 形状由**维护者裁过**再铺开。', marker: '页面质量门',
    replace: '5. 形状由**维护者裁过**再铺开。\n6. 交出**页面质量门**：把机审六列各做成一条可跑判据——双端自适应（横向溢出）／触摸目标／触屏三件／分隔符懒政／英文裸词／重复句。\n7. 交出**代码层 UI 审查清单**（这是「代码层面审查 UI 审美」，与看图打分不是一回事）：CSS 与结构层面的硬编码样式、内联样式、字号与间距是否走统一标尺、组件是否复用、有无重复样式块。' },
  { n: 3, find: '## 不许动的东西', marker: '判据（质量门）',
    replace: '- 判据（质量门）：`node docs/skills/skill-chef/t768-质量门.mjs <产物目录>` 必须逐列打印六列读数；反例：把某个触摸目标改成 24px → 该列必须红并点名。\n\n## 不许动的东西' },
  // ── 票 12：合并册子片段 ＋ 点击实测 ──
  { n: 12, find: '4. **覆盖对账**：打印 `词 50／卡 48／缺 0`；任何缺项点名并 exit 1。', marker: '点击实测',
    replace: '4. **覆盖对账**：打印 `词 50／卡 48／缺 0`；任何缺项点名并 exit 1。\n5. **合并册子片段**：把 7 张域票交的 `t<票号>-册子片段.json` 合并成全量册子（同一份产物只记一格），并做覆盖对账——① 50 条唤醒词条条有产物；② 48 张卡逐卡有落点。\n6. **点击实测**：在真实浏览器里打开链路总表页，**点绝对路径的 URL 真能打开那份 HTML**，逐行核；不许只写路径不实测。' },
  { n: 12, find: '## 不许动的东西', marker: '点击实测）',
    replace: '- 正例（点击实测）：`node docs/skills/skill-chef/t777-链路总表.mjs --open-check` 逐行打开链接并打印 `可打开 N／死链 0` 且 exit 0\n- 反例（必跑）：故意把一行路径指向不存在的文件 → `--open-check` 必须 exit 1 并点名那一行\n\n## 不许动的东西' },
];

/** 7 张域票的通用补丁。 */
for (const n of [5, 6, 7, 8, 9, 10, 11]) {
  PATCHES.push({ n, find: '## 验收命令', marker: '另加三条本图口径', replace: GOAL_INSERT });
  PATCHES.push({ n, find: '## 不许动的东西', marker: '判据（片段与视觉）', replace: ACCEPT_INSERT });
}

const MAP = Number(argValue('--map'));
if (!Number.isInteger(MAP) || MAP <= 0) {
  console.error('用法：node t765-v2.mjs --map <地图号> [--push-map]');
  process.exit(2);
}
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : '';
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');
const dbIdOf = (issue) => Number(gh('api', `repos/${REPO}/issues/${issue}`, '--jq', '.id'));

function checkShape(path, n) {
  const body = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const problems = [];
  for (const sec of ['## Question', '## 目标', '## 验收命令', '## 不许动的东西', '## 交付物路径', '## 遗留出口']) {
    if (!body.includes('\n' + sec + '\n') && !body.startsWith(sec + '\n')) problems.push(`票 ${n} 缺段落 "${sec}"`);
  }
  if (!/^## 进度：0%$/m.test(body)) problems.push(`票 ${n} 缺 "## 进度：0%" 行`);
  if (!/^下一步：/m.test(body)) problems.push(`票 ${n} 缺 "下一步：" 行`);
  if (body.startsWith('\uFEFF')) problems.push(`票 ${n} 正文带 BOM`);
  return problems;
}

/** 死锁检查：Kahn 拓扑排序，有环即返回环上节点。 */
function assertAcyclic(graph) {
  const indeg = new Map(Object.keys(graph).map((k) => [Number(k), graph[k].length]));
  const children = new Map(Object.keys(graph).map((k) => [Number(k), []]));
  for (const [child, blockers] of Object.entries(graph)) {
    for (const b of blockers) children.get(b).push(Number(child));
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([k]) => k);
  let seen = 0;
  while (queue.length) {
    const k = queue.shift();
    seen++;
    for (const c of children.get(k)) {
      indeg.set(c, indeg.get(c) - 1);
      if (indeg.get(c) === 0) queue.push(c);
    }
  }
  if (seen !== indeg.size) {
    const stuck = [...indeg.entries()].filter(([, d]) => d > 0).map(([k]) => k);
    throw new Error(`阻塞关系里有环（死锁）：涉及票 ${stuck.join('、')}`);
  }
  return seen;
}

function ensure(missingCheck, postPath, field, value) {
  if (!missingCheck()) return false;
  gh('api', `repos/${REPO}/${postPath}`, '-X', 'POST', '-F', `${field}=${value}`);
  return true;
}

function main() {
  // ── 0. 拓扑先验：有环就什么也不做 ──
  const nodeCount = assertAcyclic(BLOCKED_BY);
  console.log(`拓扑校验通过：${nodeCount} 张票的阻塞关系是 DAG（无环、无死锁）。`);

  const saved = JSON.parse(readFileSync(ticketsJsonPath, 'utf8').replace(/^\uFEFF/, ''));
  const issueOf = new Map(saved.map((s) => [s.n, s.issue]));

  // ── 1. 打补丁（锚点唯一性断言 ＋ 幂等）──
  const pushed = [];
  for (const p of PATCHES) {
    const path = join(here, `t765-t${p.n}-body.md`);
    if (!existsSync(path)) throw new Error(`找不到票正文：${path}`);
    const before = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    if (before.includes(p.marker)) continue;                  // 幂等：已打过
    const hits = before.split(p.find).length - 1;
    if (hits !== 1) throw new Error(`票 ${p.n} 的锚点出现 ${hits} 次（要求恰好 1 次）：${p.find.slice(0, 40)}`);
    writeFileSync(path, before.replace(p.find, p.replace), 'utf8');
    pushed.push(p.n);
  }
  console.log(`补丁已落：${pushed.length === 0 ? '（无差异）' : pushed.map((n) => `t${n}`).join('，')}`);
  const changed = [...new Set(pushed)];
  for (const n of changed) {
    const issue = issueOf.get(n);
    const path = join(here, `t765-t${n}-body.md`);
    gh('issue', 'edit', String(issue), '--repo', REPO, '--body-file', path);
    const online = gh('issue', 'view', String(issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
    const marker = PATCHES.filter((p) => p.n === n).map((p) => p.marker);
    const ok = marker.every((m) => online.includes(m));
    console.log(`  #${issue} 补丁推回：${ok ? 'ok' : 'FAIL'}（${online.length} 字符）`);
    if (!ok) throw new Error(`#${issue} 线上正文缺少补丁标记，退回重推`);
  }

  // ── 2. 新建三张票 ──
  const shapeProblems = NEW.flatMap((t) => checkShape(t.bodyFile, t.n));
  if (shapeProblems.length) {
    console.error('正文形状不过关，未建任何票：');
    for (const p of shapeProblems) console.error('  - ' + p);
    process.exit(1);
  }
  for (const t of NEW) {
    const hit = saved.find((s) => s.n === t.n);
    if (hit) { t.issue = hit.issue; console.log(`  票 ${t.n} 已存在 → #${hit.issue}（跳过建票）`); continue; }
    const url = gh('issue', 'create', '--repo', REPO, '--title', t.title, '--body-file', t.bodyFile, '--label', `wayfinder:${t.type}`).trim();
    t.issue = Number(url.split('/').pop());
    saved.push({ n: t.n, issue: t.issue, type: t.type, title: t.title });
    console.log(`  票 ${t.n} → #${t.issue}  ${t.title}`);
  }
  saved.sort((a, b) => a.n - b.n);
  writeFileSync(ticketsJsonPath, JSON.stringify(saved, null, 4) + '\n', 'utf8');

  const byN = new Map(saved.map((s) => [s.n, s.issue]));
  for (const [child, blockers] of Object.entries(BLOCKED_BY)) {
    if (!byN.has(Number(child))) throw new Error(`BLOCKED_BY 里的票 ${child} 不在映射里`);
    for (const b of blockers) if (!byN.has(b)) throw new Error(`BLOCKED_BY 引用了不存在的票 ${b}`);
  }

  // ── 3. 钉数据库 id ──
  const dbId = new Map();
  for (const s of saved) dbId.set(s.n, dbIdOf(s.issue));

  // ── 4. 原生子议题边 ＋ 原生阻塞边（补齐缺的）──
  const subNumbers = () => new Set(ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of NEW) {
    if (ensure(() => !subNumbers().has(t.issue), `issues/${MAP}/sub_issues`, 'sub_issue_id', dbId.get(t.n))) {
      console.log(`  子议题边已建：票 ${t.n} #${t.issue} → map #${MAP}`);
    }
  }
  const blockersOf = (issue) => new Set(ghJson('api', `repos/${REPO}/issues/${issue}/dependencies/blocked_by`, '--paginate').map((i) => i.number));
  let added = 0;
  for (const [childKey, blockers] of Object.entries(BLOCKED_BY)) {
    for (const b of blockers) {
      if (ensure(() => !blockersOf(byN.get(Number(childKey))).has(byN.get(b)), `issues/${byN.get(Number(childKey))}/dependencies/blocked_by`, 'issue_id', dbId.get(b))) added++;
    }
  }
  console.log(`  阻塞边新补：${added} 条`);

  // ── 5. 全量校验 ──
  const problems = [];
  const subActual = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate');
  if (subActual.length !== saved.length) problems.push(`子议题边：expected=${saved.length} actual=${subActual.length}`);
  const expectedBlockEdges = Object.values(BLOCKED_BY).reduce((a, b) => a + b.length, 0);
  let actualBlockEdges = 0;
  const rows = [];
  for (const s of saved) {
    const expected = (BLOCKED_BY[s.n] ?? []).length;
    const actual = blockersOf(s.issue).size;
    actualBlockEdges += actual;
    rows.push(`  t${String(s.n).padStart(2, '0')} #${s.issue}  被阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`t${s.n} #${s.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }
  if (expectedBlockEdges !== actualBlockEdges) problems.push(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  console.log(`\nmap #${MAP}`);
  console.log(`子议题边：expected=${saved.length} actual=${subActual.length}；closed/total = ${subActual.filter((i) => i.state === 'closed').length}/${subActual.length}`);
  console.log(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  console.log(rows.join('\n'));
  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：18 张票的子议题边与阻塞边逐项一致，且拓扑无环。');

  // ── 6. 计划表写回 ──
  if (process.argv.includes('--push-map')) {
    const planRows = saved.map((s) => {
      const blocked = (BLOCKED_BY[s.n] ?? []).map((b) => `[票 ${b}](https://github.com/${REPO}/issues/${byN.get(b)})`).join(' ＋ ') || '—';
      return `| ${s.n} | [${s.title}](https://github.com/${REPO}/issues/${s.issue}) | ${s.type} | ${blocked} |`;
    }).join('\n');
    const src = readFileSync(mapBodyOut, 'utf8').replace(/^\uFEFF/, '');
    const marker = /<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/;
    if (!marker.test(src)) throw new Error('地图正文里缺 PLAN-ROWS 标记');
    const filled = src.replace(/<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/, `<!-- PLAN-ROWS-START -->\n${planRows}\n<!-- PLAN-ROWS-END -->`);
    writeFileSync(mapBodyOut, filled, 'utf8');
    gh('issue', 'edit', String(MAP), '--repo', REPO, '--body-file', mapBodyOut);
    console.log(`\n地图正文已推回：#${MAP}（${filled.length} 字符；计划表 ${saved.length} 行；含 Destination=${filled.includes('## Destination')}）`);
  }
}

main();
