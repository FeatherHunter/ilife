#!/usr/bin/env node
/**
 * #765 全图校验器械（收口用，可随时重跑）。
 *
 * 一次跑清八件事，任一条不成立即非零退出：
 *   ① 拓扑无环（死锁检查）  ② 子议题边数量  ③ 阻塞边逐票对账  ④ 每张票的票面形状
 *   ⑤ 票面里没有残留占位（`<票号>`／`<本票号>`）  ⑥ 票面里没有字面 `\n` 转义
 *   ⑦ 地图正文含 `## Destination`、计划表行数＝票数  ⑧ 打印当前 frontier（可开工的票）
 *
 * 用法：node docs/skills/skill-chef/t765-verify.mjs --map 765
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const MAP = Number(process.argv[process.argv.indexOf('--map') + 1]);
if (!Number.isInteger(MAP) || MAP <= 0) {
  console.error('用法：node t765-verify.mjs --map <地图号>');
  process.exit(2);
}

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...a) => JSON.parse(gh(...a) || '[]');

/** 本图唯一阻塞真相源（与 t765-v2.mjs 一致；票 4 已关，留作来历）。 */
const BLOCKED_BY = {
  1: [], 2: [], 3: [1, 16], 4: [],
  5: [1, 2, 3, 16, 17, 20], 6: [1, 2, 3, 16, 17, 20], 7: [1, 2, 3, 16, 17, 20],
  8: [1, 2, 3, 4, 16, 17, 14, 15, 20], 9: [1, 2, 3, 4, 16, 17, 14, 15, 20],
  10: [1, 2, 3, 4, 16, 17, 14, 20], 11: [1, 2, 3, 4, 16, 17, 14, 15, 20],
  12: [5, 6, 7, 8, 9, 10, 11], 13: [12, 21],
  14: [], 15: [], 16: [1], 17: [], 18: [2, 5, 6, 7, 8, 9, 10, 11],
  19: [], 20: [], 21: [],
};

/* 票面体例豁免：票 19＝#854（G1/G2 规格线并入本图，票面照那条线自己的体例写；本图只校它的边与状态）。 */
const SHAPE_EXEMPT = new Set([19]);
const SECTIONS = ['## Question', '## 目标', '## 验收命令', '## 不许动的东西', '## 交付物路径', '## 遗留出口'];
const problems = [];
const saved = JSON.parse(readFileSync(join(here, 't765-tickets.json'), 'utf8').replace(/^\uFEFF/, ''));
const byN = new Map(saved.map((s) => [s.n, s.issue]));

// ① 拓扑
{
  const indeg = new Map(Object.keys(BLOCKED_BY).map((k) => [Number(k), BLOCKED_BY[k].length]));
  const kids = new Map(Object.keys(BLOCKED_BY).map((k) => [Number(k), []]));
  for (const [c, bs] of Object.entries(BLOCKED_BY)) for (const b of bs) kids.get(b).push(Number(c));
  const q = [...indeg].filter(([, d]) => d === 0).map(([k]) => k);
  let seen = 0;
  while (q.length) { const k = q.shift(); seen++; for (const c of kids.get(k)) { indeg.set(c, indeg.get(c) - 1); if (indeg.get(c) === 0) q.push(c); } }
  if (seen !== indeg.size) problems.push('阻塞关系里有环（死锁）');
  else console.log(`① 拓扑：${seen} 张票的阻塞关系无环`);
}

// ②③④⑤⑥ 逐票
const openBlockers = new Map();
let edgeTotal = 0;
for (const { n, issue } of saved) {
  const expected = (BLOCKED_BY[n] ?? []).length;
  const bb = ghJson('api', `repos/${REPO}/issues/${issue}/dependencies/blocked_by`, '--paginate');
  edgeTotal += bb.length;
  openBlockers.set(n, bb.filter((x) => x.state === 'open').length);
  if (bb.length !== expected) problems.push(`t${n} #${issue} 阻塞边：expected=${expected} actual=${bb.length}`);

  const body = gh('issue', 'view', String(issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (!SHAPE_EXEMPT.has(n)) for (const sec of SECTIONS) if (!body.includes(sec)) problems.push(`t${n} #${issue} 缺段落 ${sec}`);
  if (!/^## 进度：\d+%$/m.test(body)) problems.push(`t${n} #${issue} 缺 "## 进度：N%"（N 为当前进度）`);
  if (!SHAPE_EXEMPT.has(n) && !/^下一步：/m.test(body)) problems.push(`t${n} #${issue} 缺 "下一步："`);
  if (body.includes('<票号>') || body.includes('<本票号>')) problems.push(`t${n} #${issue} 残留占位`);
  if (body.includes('\\n')) problems.push(`t${n} #${issue} 疑似字面 \\n`);
  if (n >= 16 && body.includes(`skill-chef/t${n}-`)) problems.push(`t${n} #${issue} 引用票序文件名`);
}
console.log(`②③④⑤⑥ 逐票：${saved.length} 张，阻塞边 ${edgeTotal} 条`);

// ⑦ 地图正文
{
  const mb = ghJson('api', `repos/${REPO}/issues/${MAP}`);
  if (!mb.body.includes('## Destination')) problems.push('地图正文缺 ## Destination');
  const rows = [...mb.body.matchAll(/^\| \d+ \| \[/gm)].length;
  if (rows !== saved.length) problems.push(`地图计划表 ${rows} 行 ≠ ${saved.length} 张票`);
  console.log(`⑦ 地图正文：${mb.body.length} 字符，计划表 ${rows} 行`);
  const stateOf = new Map(ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').map((i) => [i.number, i.state]));
  if (stateOf.size !== saved.length) problems.push(`子议题 ${stateOf.size} ≠ ${saved.length}`);
  console.log(`   子议题 ${stateOf.size}／${saved.length}，closed/total = ${[...stateOf.values()].filter((s) => s === 'closed').length}/${stateOf.size}`);
}

// ⑧ frontier
const frontier = saved.filter((s) => {
  const st = ghJson('api', `repos/${REPO}/issues/${s.issue}`).state;
  return st === 'open' && openBlockers.get(s.n) === 0 && (ghJson('api', `repos/${REPO}/issues/${s.issue}`).assignees || []).length === 0;
});
console.log(`⑧ frontier（${frontier.length} 张）：`);
for (const f of frontier) console.log(`   #${f.issue}  ${f.title}`);

if (problems.length) {
  console.error('\nFAIL：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nPASS：全图 ' + saved.length + ' 张票的形状、边、拓扑、地图正文逐项一致。');
