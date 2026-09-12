#!/usr/bin/env node
/**
 * 私家大厨HELP 地图的建票＋接线＋自校验脚本。
 *
 * 做四件事：
 *   1. 把 tickets-draft.md 拆成每票一个正文文件，落 docs/skills/skill-chef/t<N>-body.md；
 *   2. 建票（可跳过：已有 map-chef-tickets.json 时只接线）；
 *   3. 建原生**子议题**边（ticket → map）与原生**阻塞**边（ticket → 阻塞它的票）；
 *   4. 把 expected 与 actual 逐项对到相等——对不上就非零退出并打印差在哪。
 *
 * 为什么要脚本：一边建边一边数，数不对不能当成功。手点 UI 建不出可校验的 counts。
 *
 * 用法：
 *   node .scratch/chef-help/draft/build-map.mjs --map <地图号> [--create]
 * 依赖：`gh` 已登录（scopes 含 repo）。
 *
 * 阻塞边的形参是**数据库 id**（`gh api .../issues/<n> --jq .id`），不是 #号码、也不是 node_id。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const docDir = join(repoRoot, 'docs', 'skills', 'skill-chef');
const ticketsJsonPath = join(docDir, 'map-chef-tickets.json');
const draftPath = join(here, 'tickets-draft.md');
const draftMapPath = join(here, 'map-chef-body.md');
const mapBodyOut = join(docDir, 'map-chef-body.md');

/** 阻塞关系（本图唯一真相源；票面正文里的 `Blocked by:` 行只作降级兜底）：child ← [blockers] */
const BLOCKED_BY = {
  4: [1],
  5: [2, 12],
  6: [1, 3, 12],
  7: [4, 6, 12, 13],
  8: [7],
  9: [7],
  11: [8, 9, 10],
};

const MAP = Number(argValue('--map'));
const CREATE = process.argv.includes('--create');
if (!Number.isInteger(MAP) || MAP <= 0) {
  console.error('用法：node build-map.mjs --map <地图号> [--create]');
  process.exit(2);
}
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : '';
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');

/** 把 tickets-draft.md 拆成 [{n, type, title, body, bodyFile}]。分隔行形如 `<!-- TICKET 1 | research | 标题 -->`。 */
function parseDraft() {
  const raw = readFileSync(draftPath, 'utf8').replace(/^\uFEFF/, '');
  const sep = /^<!--\s*TICKET\s+(\d+)\s*\|\s*([a-z]+)\s*\|\s*(.+?)\s*-->\s*$/gm;
  const marks = [...raw.matchAll(sep)];
  if (!marks.length) throw new Error('tickets-draft.md 里没有找到分隔行');
  const out = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : raw.length;
    const body = raw.slice(start, end).replace(/^\s*\n/, '').trimEnd() + '\n';
    out.push({ n: Number(marks[i][1]), type: marks[i][2], title: marks[i][3], body });
  }
  return out;
}

/** 每张票都必须是 `## Question` 起、`## 进度：0%` ＋ 下一步 收尾。 */
function checkShape(t) {
  const problems = [];
  if (!t.body.startsWith('## Question')) problems.push(`t${t.n} 正文不是以 "## Question" 开头`);
  if (!/^## 进度：0%$/m.test(t.body)) problems.push(`t${t.n} 缺 "## 进度：0%" 行`);
  if (!/^下一步：/m.test(t.body)) problems.push(`t${t.n} 缺 "下一步：" 行`);
  if (/\\n/.test(t.body.replace(/\\n(?=[^'])/g, '')) && !t.body.includes('`\\n`')) {
    // 只查「本该是真实换行却写成字面 \n」的粗错
    const blank = t.body.split('\n').length;
    if (blank <= 3) problems.push(`t${t.n} 疑似把换行写成了字面 \\n`);
  }
  if (t.body.startsWith('\uFEFF')) problems.push(`t${t.n} 正文带 BOM`);
  return problems;
}

const ghIssue = (n, ...fields) => JSON.parse(gh('api', `repos/${REPO}/issues/${n}`, '--jq', fields.join(' ')) || '{}');
const dbIdOf = (issue) => Number(gh('api', `repos/${REPO}/issues/${issue}`, '--jq', '.id'));

function ensure(missingCheck, postPath, field, value) {
  if (!missingCheck()) return false;
  gh('api', `repos/${REPO}/${postPath}`, '-X', 'POST', '-F', `${field}=${value}`);
  return true;
}

function main() {
  const tickets = parseDraft();

  // ── 0. 形状自查 ──
  const shapeProblems = tickets.flatMap(checkShape);
  if (shapeProblems.length) {
    console.error('正文形状不过关，未建任何票：');
    for (const p of shapeProblems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log(`草稿解析：${tickets.length} 张票 —— ${tickets.map((t) => `${t.n}:${t.type}`).join(', ')}`);

  // 阻塞关系里的票必须在草稿里
  for (const [child, blockers] of Object.entries(BLOCKED_BY)) {
    if (!tickets.some((t) => t.n === Number(child))) throw new Error(`BLOCKED_BY 里的票 ${child} 不在草稿里`);
    for (const b of blockers) if (!tickets.some((t) => t.n === b)) throw new Error(`BLOCKED_BY 引用了不存在的票 ${b}`);
  }

  // ── 1. 落正文文件（每票一个，真实换行；同时是建票的 --body-file）──
  // 只在 --create 时重写：票建好之后，票面的最新正文以 docs/ 下那份为准（可能已被就地改过并推回 GitHub），
  // 无条件重写会把 GitHub 上的票面回滚成草稿内容。
  for (const t of tickets) t.bodyFile = join(docDir, `t${t.n}-body.md`);
  if (CREATE) {
    mkdirSync(docDir, { recursive: true });
    for (const t of tickets) writeFileSync(t.bodyFile, t.body, 'utf8');
    console.log(`正文文件已落：${docDir}\\t{1..${tickets.length}}-body.md`);
  }

  // ── 2. 建票（只建一次；已建则读回映射）──
  if (CREATE) {
    if (existsSync(ticketsJsonPath)) {
      console.error(`FAIL：${ticketsJsonPath} 已存在——建票只能跑一次，避免重复建票。先删掉它再跑 --create。`);
      process.exit(1);
    }
    for (const t of tickets) {
      const url = gh(
        'issue', 'create',
        '--repo', REPO,
        '--title', t.title,
        '--body-file', t.bodyFile,
        '--label', `wayfinder:${t.type}`,
      ).trim();
      t.issue = Number(url.split('/').pop());
      console.log(`  票 ${t.n} → #${t.issue}  ${t.title}`);
    }
    writeFileSync(ticketsJsonPath, JSON.stringify(tickets.map(({ n, issue, type, title }) => ({ n, issue, type, title })), null, 4) + '\n', 'utf8');
    console.log(`映射已落：${ticketsJsonPath}`);
  } else {
    const saved = JSON.parse(readFileSync(ticketsJsonPath, 'utf8').replace(/^\uFEFF/, ''));
    for (const t of tickets) {
      const hit = saved.find((s) => s.n === t.n);
      if (!hit) throw new Error(`map-chef-tickets.json 里缺票 ${t.n}`);
      t.issue = hit.issue;
    }
  }

  const byN = new Map(tickets.map((t) => [t.n, t]));

  // ── 3. 钉数据库 id（阻塞边的形参）──
  const dbId = new Map();
  for (const t of tickets) dbId.set(t.n, dbIdOf(t.issue));

  // ── 4. 原生子议题边 ──
  const subNumbers = () =>
    new Set(ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of tickets) {
    if (ensure(() => !subNumbers().has(t.issue), `issues/${MAP}/sub_issues`, 'sub_issue_id', dbId.get(t.n))) {
      console.log(`  子议题边已建：票 ${t.n} #${t.issue} → map #${MAP}`);
    }
  }

  // ── 5. 原生阻塞边 ──
  const blockersOf = (issue) =>
    new Set(ghJson('api', `repos/${REPO}/issues/${issue}/dependencies/blocked_by`, '--paginate').map((i) => i.number));
  for (const [childKey, blockers] of Object.entries(BLOCKED_BY)) {
    const child = byN.get(Number(childKey));
    for (const b of blockers) {
      if (ensure(() => !blockersOf(child.issue).has(byN.get(b).issue), `issues/${child.issue}/dependencies/blocked_by`, 'issue_id', dbId.get(b))) {
        console.log(`  阻塞边已建：票 ${b} #${byN.get(b).issue} → 票 ${childKey} #${child.issue}`);
      }
    }
  }

  // ── 6. 校验：expected 与 actual 逐项对 ──
  const problems = [];
  const subActual = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate');
  const subExpected = tickets.length;
  if (subActual.length !== subExpected) problems.push(`子议题边：expected=${subExpected} actual=${subActual.length}`);

  const expectedBlockEdges = Object.values(BLOCKED_BY).reduce((a, b) => a + b.length, 0);
  const rows = [];
  let actualBlockEdges = 0;
  for (const t of tickets) {
    const expected = (BLOCKED_BY[t.n] ?? []).length;
    const actual = blockersOf(t.issue).size;
    actualBlockEdges += actual;
    rows.push(`  t${String(t.n).padStart(2, '0')} #${t.issue}  被阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`t${t.n} #${t.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }
  if (expectedBlockEdges !== actualBlockEdges) {
    problems.push(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  }

  const closedCount = subActual.filter((i) => i.state === 'closed').length;
  if (subActual.length > 0 && closedCount + subActual.filter((i) => i.state === 'open').length === 0) {
    problems.push('面板列表 closed/total = 0/0');
  }

  console.log(`\nmap #${MAP}（数据库 id ${gh('api', `repos/${REPO}/issues/${MAP}`, '--jq', '.id')}）`);
  console.log(`子议题边：expected=${subExpected} actual=${subActual.length}`);
  console.log(`子议题 closed/total = ${closedCount}/${subActual.length}`);
  console.log(`阻塞边总数：expected=${expectedBlockEdges} actual=${actualBlockEdges}`);
  console.log('阻塞边：');
  console.log(rows.join('\n'));

  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：子议题边与阻塞边逐项一致。');

  // ── 7. 把计划表填成真链接并推回地图正文（以文件方式提交，正文里是真实换行）──
  if (process.argv.includes('--push-map')) {
    if (!existsSync(draftMapPath)) throw new Error(`找不到地图正文草稿：${draftMapPath}`);
    const rows = tickets
      .map((t) => {
        const blocked = (BLOCKED_BY[t.n] ?? [])
          .map((b) => `[票 ${b}](https://github.com/${REPO}/issues/${byN.get(b).issue})`)
          .join(' ＋ ') || '—';
        return `| ${t.n} | [${t.title}](https://github.com/${REPO}/issues/${t.issue}) | ${t.type} | ${blocked} |`;
      })
      .join('\n');
    const src = readFileSync(draftMapPath, 'utf8');
    const marker = /<!-- PLAN-ROWS-START -->[\s\S]*?<!-- PLAN-ROWS-END -->/;
    if (!marker.test(src)) throw new Error('地图草稿里缺 PLAN-ROWS 标记');
    const filled = src.replace(marker, `<!-- PLAN-ROWS-START -->\n${rows}\n<!-- PLAN-ROWS-END -->`);
    writeFileSync(mapBodyOut, filled, 'utf8');
    gh('issue', 'edit', String(MAP), '--repo', REPO, '--body-file', mapBodyOut);
    console.log(`\n地图正文已推回：#${MAP}（正文文件 ${mapBodyOut}）`);
    console.log(`  计划表 ${tickets.length} 行；正文 ${filled.length} 字符；无 BOM=${!filled.startsWith('\uFEFF')}`);
  }
}

main();
