#!/usr/bin/env node
/**
 * 交付面对齐图的开图器（照 `docs/skills/skill-chef/t765-add-tickets.mjs` 的体例）：
 *
 *   1. 建**地图**（`--label wayfinder:map`，正文＝`map-body.md`）；
 *   2. 建三张子票（正文＝`t1..t3-body.md`，先过票面形状自查）；
 *   3. 钉**原生子议题边**与**原生阻塞边**（GitHub 原生依赖，UI 上看得见边界）；
 *   4. **全量重校验**（expected 与 actual 逐项对，不一致即非零退出）；
 *   5. `--push-map`：把三行计划表写回地图正文并推回 GitHub。
 *
 * 用法：
 *   node docs/agents/交付面-缺省落点对齐/chart.mjs --create      # 建图 ＋ 建票 ＋ 连边（只跑一次）
 *   node docs/agents/交付面-缺省落点对齐/chart.mjs               # 只校验现场
 *   node docs/agents/交付面-缺省落点对齐/chart.mjs --push-map    # 计划表写回地图
 *
 * 票面形状（`checkShape`，缺一段即拒建）：`## Question` 打头 ＋ 目标／验收命令／不许动的东西／
 * 交付物路径／遗留出口五段 ＋ `## 进度：0%` ＋ 一行 `下一步：`，且正文不带 BOM。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const mapBodyFile = join(here, 'map-body.md');
const stateFile = join(here, 'map-state.json');
const MAP_TITLE = '[wayfinder] 六家技能交付面对齐：非 HELP 命令缺省落点与回执';

/** 本图的三张票（票序 → 标题；正文各自一件）。 */
const TICKETS = [
  { n: 1, type: 'grilling', title: '【裁定】饼干记账页面产物的落点与命名：与 HELP 分家、一处定义', bodyFile: join(here, 't1-body.md') },
  { n: 2, type: 'task', title: '交付面探针：六家技能缺省落点与回执的常驻判据', bodyFile: join(here, 't2-body.md') },
  { n: 3, type: 'task', title: '饼干记账：非 HELP 命令缺省落点与回执', bodyFile: join(here, 't3-body.md') },
];

/** 全图阻塞关系（唯一真相源）：票 ← [阻塞它的票]。 */
const BLOCKED_BY = {
  1: [],
  2: [],
  3: [1, 2],
};

const CREATE = process.argv.includes('--create');
const PUSH_MAP = process.argv.includes('--push-map');

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');
const dbIdOf = (issue) => Number(gh('api', `repos/${REPO}/issues/${issue}`, '--jq', '.id'));

function checkShape(path, label) {
  const raw = readFileSync(path, 'utf8');
  const body = raw.replace(/^\uFEFF/, '');
  const problems = [];
  if (raw.startsWith('\uFEFF')) problems.push(`${label} 正文带 BOM`);
  const required = ['## Question', '## 目标', '## 验收命令', '## 不许动的东西', '## 交付物路径', '## 遗留出口'];
  const hasLine = (sec) => new RegExp('^' + sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm').test(body);
  for (const sec of required) if (!hasLine(sec)) problems.push(`${label} 缺段落 "${sec}"`);
  if (!body.startsWith('## Question\n')) problems.push(`${label} 正文不是以 "## Question" 开头`);
  if (!/^## 进度：0%$/m.test(body)) problems.push(`${label} 缺 "## 进度：0%" 行`);
  if (!/^下一步：/m.test(body)) problems.push(`${label} 缺 "下一步：" 行`);
  return problems;
}

/** 地图正文的形状（与票面不同：Destination／Notes／Decisions／Fog／Out of scope ＋ 计划表标记）。 */
function checkMapShape(path) {
  const raw = readFileSync(path, 'utf8');
  const body = raw.replace(/^\uFEFF/, '');
  const problems = [];
  if (raw.startsWith('\uFEFF')) problems.push('地图正文带 BOM');
  for (const sec of ['## Destination', '## Notes', '## Decisions so far', '## Not yet specified', '## Out of scope']) {
    if (!new RegExp('^' + sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm').test(body)) problems.push(`地图正文 缺段落 "${sec}"`);
  }
  if (!/<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/.test(body)) problems.push('地图正文 缺 PLAN-ROWS 标记');
  return problems;
}

function ensure(missingCheck, postPath, field, value) {
  if (!missingCheck()) return false;
  gh('api', `repos/${REPO}/${postPath}`, '-X', 'POST', '-F', `${field}=${value}`);
  return true;
}

function main() {
  const shapeProblems = [
    ...checkMapShape(mapBodyFile),
    ...TICKETS.flatMap((t) => (existsSync(t.bodyFile) ? checkShape(t.bodyFile, `票 ${t.n}`) : [`票 ${t.n} 找不到正文 ${t.bodyFile}`])),
  ];
  if (shapeProblems.length) {
    console.error('正文形状不过关，未建任何票：');
    for (const p of shapeProblems) console.error('  - ' + p);
    process.exit(1);
  }

  let state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8').replace(/^\uFEFF/, '')) : { map: 0, tickets: [] };

  // ── 1. 建图（一步）＋ 2. 建票 ──
  if (CREATE) {
    if (state.map) {
      console.error(`FAIL：地图已存在（#${state.map}）——--create 只能跑一次；改边或校验请直接跑不带 --create。`);
      process.exit(1);
    }
    const url = gh('issue', 'create', '--repo', REPO, '--title', MAP_TITLE, '--body-file', mapBodyFile, '--label', 'wayfinder:map').trim();
    state.map = Number(url.split('/').pop());
    console.log(`地图 → #${state.map}  ${MAP_TITLE}`);
    for (const t of TICKETS) {
      if (state.tickets.some((s) => s.n === t.n)) {
        console.error(`FAIL：票 ${t.n} 已建过——建票只能跑一次。`);
        process.exit(1);
      }
      const u = gh('issue', 'create', '--repo', REPO, '--title', t.title, '--body-file', t.bodyFile, '--label', `wayfinder:${t.type}`).trim();
      const issue = Number(u.split('/').pop());
      state.tickets.push({ n: t.n, issue, type: t.type, title: t.title });
      console.log(`  票 ${t.n} → #${issue}  ${t.title}`);
    }
    state.tickets.sort((a, b) => a.n - b.n);
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
    console.log(`映射已落：${stateFile}`);
  }

  if (!state.map || state.tickets.length !== TICKETS.length) {
    console.error('现场残缺：先跑 --create 建图建票。');
    process.exit(1);
  }

  const byN = new Map(state.tickets.map((s) => [s.n, s.issue]));
  for (const [child, blockers] of Object.entries(BLOCKED_BY)) {
    if (!byN.has(Number(child))) throw new Error(`BLOCKED_BY 里的票 ${child} 不在映射里`);
    for (const b of blockers) if (!byN.has(b)) throw new Error(`BLOCKED_BY 引用了不存在的票 ${b}`);
  }

  // ── 3. 钉数据库 id ──
  const dbId = new Map();
  for (const s of state.tickets) dbId.set(s.n, dbIdOf(s.issue));

  // ── 4. 原生子议题边（补齐缺的）──
  const subNumbers = () => new Set(ghJson('api', `repos/${REPO}/issues/${state.map}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of state.tickets) {
    if (ensure(() => !subNumbers().has(t.issue), `issues/${state.map}/sub_issues`, 'sub_issue_id', dbId.get(t.n))) {
      console.log(`  子议题边已建：票 ${t.n} #${t.issue} → 地图 #${state.map}`);
    }
  }

  // ── 5. 原生阻塞边（补齐缺的）──
  const blockersOf = (issue) => new Set(ghJson('api', `repos/${REPO}/issues/${issue}/dependencies/blocked_by`, '--paginate').map((i) => i.number));
  for (const [childKey, blockers] of Object.entries(BLOCKED_BY)) {
    const child = byN.get(Number(childKey));
    for (const b of blockers) {
      if (ensure(() => !blockersOf(child).has(byN.get(b)), `issues/${child}/dependencies/blocked_by`, 'issue_id', dbId.get(b))) {
        console.log(`  阻塞边已建：票 ${b} #${byN.get(b)} → 票 ${childKey} #${child}`);
      }
    }
  }

  // ── 6. 全量校验 ──
  const problems = [];
  const subActual = ghJson('api', `repos/${REPO}/issues/${state.map}/sub_issues`, '--paginate');
  if (subActual.length !== state.tickets.length) problems.push(`子议题边：expected=${state.tickets.length} actual=${subActual.length}`);
  let expectedBlockEdges = 0;
  let actualBlockEdges = 0;
  const rows = [];
  for (const s of state.tickets) {
    const expected = (BLOCKED_BY[s.n] ?? []).length;
    const actual = blockersOf(s.issue).size;
    expectedBlockEdges += expected;
    actualBlockEdges += actual;
    rows.push(`  t${s.n} #${s.issue}  被阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`t${s.n} #${s.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }
  if (expectedBlockEdges !== actualBlockEdges) problems.push(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);

  console.log(`\nmap #${state.map}`);
  console.log(`子议题边：expected=${state.tickets.length} actual=${subActual.length}`);
  console.log(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  console.log(rows.join('\n'));
  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：三张票的子议题边与阻塞边逐项一致。');

  // ── 7. 计划表写回地图正文 ──
  if (PUSH_MAP) {
    const planRows = state.tickets.map((s) => {
      const blocked = (BLOCKED_BY[s.n] ?? []).map((b) => `[票 ${b}](https://github.com/${REPO}/issues/${byN.get(b)})`).join(' ＋ ') || '—';
      return `| ${s.n} | [${s.title}](https://github.com/${REPO}/issues/${s.issue}) | ${s.type} | ${blocked} |`;
    });
    const table = ['| 票 | 名字 | 类型 | 被谁挡 |', '|---|---|---|---|', ...planRows].join('\n');
    const src = readFileSync(mapBodyFile, 'utf8').replace(/^\uFEFF/, '');
    const marker = /<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/;
    if (!marker.test(src)) throw new Error('地图正文里缺 PLAN-ROWS 标记');
    const filled = src.replace(marker, `<!-- PLAN-ROWS-START -->\n${table}\n<!-- PLAN-ROWS-END -->`);
    writeFileSync(mapBodyFile, filled, 'utf8');
    gh('issue', 'edit', String(state.map), '--repo', REPO, '--body-file', mapBodyFile);
    console.log(`\n地图正文已推回：#${state.map}（${filled.length} 字符；计划表 ${state.tickets.length} 行；无 BOM=${!filled.startsWith('\uFEFF')}；含 Destination=${filled.includes('## Destination')}）`);
  }
}

main();
