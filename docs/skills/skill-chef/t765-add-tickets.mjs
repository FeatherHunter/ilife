#!/usr/bin/env node
/**
 * #765 补票：研究票 #769 关票时毕业出两张裁定票（14／15），本脚本负责
 *   1. 建这两张票（正文已按票面体例写好，落 t765-t14-body.md／t765-t15-body.md）；
 *   2. 把它们并进 t765-tickets.json（本图「票序 → 票号」的唯一映射）；
 *   3. 建原生子议题边与原生阻塞边；
 *   4. **全量**重校验 15 张票的边（expected 与 actual 逐项对，不一致即非零退出）；
 *   5. --push-map：把 15 行计划表写回地图正文并推回 GitHub。
 *
 * 用法：
 *   node docs/skills/skill-chef/t765-add-tickets.mjs --map 765 --create
 *   node docs/skills/skill-chef/t765-add-tickets.mjs --map 765 --push-map
 *
 * 注意：BLOCKED_BY 是全图 15 张票的**唯一真相源**（build-map.mjs 那一份停在 13 张，
 * 是它落地那一刻的快照）。两张新票毕业自 #769 的解决评论。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const ticketsJsonPath = join(here, 't765-tickets.json');
const mapBodyOut = join(here, 'map-chef-parity-body.md');

/** 本次要补的两张票（毕业自 #769）。 */
const NEW = [
  { n: 14, type: 'grilling', title: '【裁定】老库三条 NOT NULL 与卡面「选填」的冲突：9 张卡怎么落', bodyFile: join(here, 't765-t14-body.md') },
  { n: 15, type: 'grilling', title: '【裁定】数据库层两处全局缺口：recipes.name 唯一约束在老库未生效 ＋ 新技能未开 foreign_keys', bodyFile: join(here, 't765-t15-body.md') },
];

/** 全图阻塞关系（15 张，唯一真相源）：child ← [blockers]。票 8／9／10／11 另被 14／15 挡。 */
const BLOCKED_BY = {
  1: [],
  2: [],
  3: [1],
  4: [],
  5: [1, 2, 3],
  6: [1, 2, 3],
  7: [1, 2, 3],
  8: [1, 2, 3, 4, 14, 15],
  9: [1, 2, 3, 4, 14, 15],
  10: [1, 2, 3, 4, 14],
  11: [1, 2, 3, 4, 14, 15],
  12: [5, 6, 7, 8, 9, 10, 11],
  13: [12],
  14: [],
  15: [],
};

const MAP = Number(argValue('--map'));
const CREATE = process.argv.includes('--create');
if (!Number.isInteger(MAP) || MAP <= 0) {
  console.error('用法：node t765-add-tickets.mjs --map <地图号> [--create] [--push-map]');
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
  const required = ['## Question', '## 目标', '## 验收命令', '## 不许动的东西', '## 交付物路径', '## 遗留出口'];
  for (const sec of required) if (!body.includes('\n' + sec + '\n') && !body.startsWith(sec + '\n')) problems.push(`票 ${n} 缺段落 "${sec}"`);
  if (!body.startsWith('## Question')) problems.push(`票 ${n} 正文不是以 "## Question" 开头`);
  if (!/^## 进度：0%$/m.test(body)) problems.push(`票 ${n} 缺 "## 进度：0%" 行`);
  if (!/^下一步：/m.test(body)) problems.push(`票 ${n} 缺 "下一步：" 行`);
  if (body.startsWith('\uFEFF')) problems.push(`票 ${n} 正文带 BOM`);
  return problems;
}

function ensure(missingCheck, postPath, field, value) {
  if (!missingCheck()) return false;
  gh('api', `repos/${REPO}/${postPath}`, '-X', 'POST', '-F', `${field}=${value}`);
  return true;
}

function main() {
  // ── 0. 形状自查 ──
  const shapeProblems = NEW.flatMap((t) => checkShape(t.bodyFile, t.n));
  if (shapeProblems.length) {
    console.error('正文形状不过关，未建任何票：');
    for (const p of shapeProblems) console.error('  - ' + p);
    process.exit(1);
  }
  for (const t of NEW) if (!existsSync(t.bodyFile)) throw new Error(`找不到票正文：${t.bodyFile}`);

  const saved = JSON.parse(readFileSync(ticketsJsonPath, 'utf8').replace(/^\uFEFF/, ''));

  // ── 1. 建票 ──
  if (CREATE) {
    for (const t of NEW) {
      if (saved.some((s) => s.n === t.n)) {
        console.error(`FAIL：票 ${t.n} 已在 t765-tickets.json 里——补票只能跑一次。`);
        process.exit(1);
      }
      const url = gh('issue', 'create', '--repo', REPO, '--title', t.title, '--body-file', t.bodyFile, '--label', `wayfinder:${t.type}`).trim();
      t.issue = Number(url.split('/').pop());
      console.log(`  票 ${t.n} → #${t.issue}  ${t.title}`);
      saved.push({ n: t.n, issue: t.issue, type: t.type, title: t.title });
    }
    saved.sort((a, b) => a.n - b.n);
    writeFileSync(ticketsJsonPath, JSON.stringify(saved, null, 4) + '\n', 'utf8');
    console.log(`映射已更新：${ticketsJsonPath}（${saved.length} 张）`);
  } else {
    for (const t of NEW) {
      const hit = saved.find((s) => s.n === t.n);
      if (!hit) throw new Error(`t765-tickets.json 里缺票 ${t.n}`);
      t.issue = hit.issue;
    }
  }

  const byN = new Map(saved.map((s) => [s.n, s.issue]));
  for (const [child, blockers] of Object.entries(BLOCKED_BY)) {
    if (!byN.has(Number(child))) throw new Error(`BLOCKED_BY 里的票 ${child} 不在映射里`);
    for (const b of blockers) if (!byN.has(b)) throw new Error(`BLOCKED_BY 引用了不存在的票 ${b}`);
  }

  // ── 2. 钉数据库 id ──
  const dbId = new Map();
  for (const s of saved) dbId.set(s.n, dbIdOf(s.issue));

  // ── 3. 原生子议题边（补齐缺的）──
  const subNumbers = () => new Set(ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of NEW) {
    if (ensure(() => !subNumbers().has(t.issue), `issues/${MAP}/sub_issues`, 'sub_issue_id', dbId.get(t.n))) {
      console.log(`  子议题边已建：票 ${t.n} #${t.issue} → map #${MAP}`);
    }
  }

  // ── 4. 原生阻塞边（补齐缺的）──
  const blockersOf = (issue) => new Set(ghJson('api', `repos/${REPO}/issues/${issue}/dependencies/blocked_by`, '--paginate').map((i) => i.number));
  for (const [childKey, blockers] of Object.entries(BLOCKED_BY)) {
    const child = byN.get(Number(childKey));
    for (const b of blockers) {
      if (ensure(() => !blockersOf(child).has(byN.get(b)), `issues/${child}/dependencies/blocked_by`, 'issue_id', dbId.get(b))) {
        console.log(`  阻塞边已建：票 ${b} #${byN.get(b)} → 票 ${childKey} #${child}`);
      }
    }
  }

  // ── 5. 全量校验 ──
  const problems = [];
  const subActual = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate');
  if (subActual.length !== saved.length) problems.push(`子议题边：expected=${saved.length} actual=${subActual.length}`);
  const expectedBlockEdges = Object.values(BLOCKED_BY).reduce((a, b) => a + b.length, 0);
  const rows = [];
  let actualBlockEdges = 0;
  for (const s of saved) {
    const expected = (BLOCKED_BY[s.n] ?? []).length;
    const actual = blockersOf(s.issue).size;
    actualBlockEdges += actual;
    rows.push(`  t${String(s.n).padStart(2, '0')} #${s.issue}  被阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`t${s.n} #${s.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }
  if (expectedBlockEdges !== actualBlockEdges) problems.push(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  const closedCount = subActual.filter((i) => i.state === 'closed').length;

  console.log(`\nmap #${MAP}`);
  console.log(`子议题边：expected=${saved.length} actual=${subActual.length}`);
  console.log(`子议题 closed/total = ${closedCount}/${subActual.length}`);
  console.log(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  console.log(rows.join('\n'));
  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：15 张票的子议题边与阻塞边逐项一致。');

  // ── 6. 计划表写回地图正文 ──
  if (process.argv.includes('--push-map')) {
    const planRows = saved.map((s) => {
      const blocked = (BLOCKED_BY[s.n] ?? []).map((b) => `[票 ${b}](https://github.com/${REPO}/issues/${byN.get(b)})`).join(' ＋ ') || '—';
      return `| ${s.n} | [${s.title}](https://github.com/${REPO}/issues/${s.issue}) | ${s.type} | ${blocked} |`;
    }).join('\n');
    const src = readFileSync(mapBodyOut, 'utf8').replace(/^\uFEFF/, '');
    const marker = /<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/;
    if (!marker.test(src)) throw new Error('地图正文里缺 PLAN-ROWS 标记');
    const filled = src.replace(marker, `<!-- PLAN-ROWS-START -->\n${planRows}\n<!-- PLAN-ROWS-END -->`);
    writeFileSync(mapBodyOut, filled, 'utf8');
    gh('issue', 'edit', String(MAP), '--repo', REPO, '--body-file', mapBodyOut);
    console.log(`\n地图正文已推回：#${MAP}（${filled.length} 字符；计划表 ${saved.length} 行；无 BOM=${!filled.startsWith('\uFEFF')}；含 Destination=${filled.includes('## Destination')}）`);
  }
}

main();
