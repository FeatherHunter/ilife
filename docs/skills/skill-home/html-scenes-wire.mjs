#!/usr/bin/env node
/**
 * 本图（居家管家场景页）的接线与**票图自检**脚本。
 *
 * 六件事，顺序固定：
 *   1. 建（缺才建）：map 与子票——票面一律以**文件**提交（`--body-file`）；
 *   2. 票面**双向同步**：本地正文文件与 issue 正文不一致就推（以文件为准）；
 *   3. 原生**子议题边**：`issues/<map>/sub_issues -X POST -F sub_issue_id=<数据库 id>`；
 *   4. 原生**阻塞边**：对每张票做**双向收敛**——缺的补、多的删（`dependencies/blocked_by` 的 POST／DELETE）。
 *      旧脚本只会补不会删，因此改 blockedBy 会留下旧边、进而成环；这条是 v3 的硬修。
 *   5. 回写地图正文里的任务清单表（`<!-- PLAN-TABLE:BEGIN/END -->` 之间）；
 *   6. **四道机器门**：①无环（传递闭包）②写集干涉（无序票之间必须不相交）③frontier 非空 ④计数与表行数。
 *
 * 用法：
 *   node docs/skills/skill-home/html-scenes-wire.mjs           # 建＋同步＋收敛＋自检（可重复跑）
 *   node docs/skills/skill-home/html-scenes-wire.mjs --check   # 只自检，不写任何东西
 *
 * 写集口径（票源 `scope`／`families`／`domain`）：
 *   - `families` 按约定展开成两条路径：`packages/skill-home/templates/<域>/<族>.html`、
 *     `packages/skill-home/src/<域>/pages/<族>.ts`；
 *   - `scope` 是显式路径（文件或目录，目录以 `/` 结尾）；
 *   - 任一张票写集为空即判红——写不出写集的票不许开。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const REPO = 'FeatherHunter/ilife';
const CHECK_ONLY = process.argv.includes('--check');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const ticketsPath = join(here, 'html-scenes-tickets.json');
const state = JSON.parse(readFileSync(ticketsPath, 'utf8'));
const tickets = state.tickets;
const active = tickets.filter((t) => !t.retired);
const byN = new Map(tickets.map((t) => [t.n, t]));

const gh = (...args) => execFileSync('gh', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');
const save = () => writeFileSync(ticketsPath, JSON.stringify(state, null, 2) + '\n', 'utf8');
const normTail = (s) => s.replace(/\n+$/, '');
const url = (n) => `https://github.com/${REPO}/issues/${n}`;
const dbIdOf = (issueNo) => Number(gh('api', `repos/${REPO}/issues/${issueNo}`, '--jq', '.id'));

// ── 票图计算（本地即可算，不依赖网络） ─────────────────────────────────────────

/** 展开一张票的写集。 */
function scopesOf(t) {
  const out = [...(t.scope ?? [])];
  for (const f of t.families ?? []) {
    out.push(`packages/skill-home/templates/${t.domain}/${f}.html`);
    out.push(`packages/skill-home/src/${t.domain}/pages/${f}.ts`);
  }
  return out;
}

/** 两段写集路径是否相撞（相等；或目录前缀包含）。 */
function clashes(a, b) {
  if (a === b) return true;
  if (a.endsWith('/') && b.startsWith(a)) return true;
  if (b.endsWith('/') && a.startsWith(b)) return true;
  return false;
}

/** child 的传递阻塞集（按 n）。 */
function ancestorsOf(n, seen = new Set()) {
  const t = byN.get(n);
  if (!t) return seen;
  for (const b of t.blockedBy ?? []) {
    if (seen.has(b)) continue;
    seen.add(b);
    ancestorsOf(b, seen);
  }
  return seen;
}

function gates() {
  const problems = [];

  // ① 无环
  for (const t of active) {
    if (ancestorsOf(t.n).has(t.n)) problems.push(`P0 成环：票 ${t.n} 出现在自己的祖先集合里`);
  }

  // ② 写集干涉：无序（互不为祖先）的两票写集必须不相交
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const A = active[i];
      const B = active[j];
      const ordered = ancestorsOf(A.n).has(B.n) || ancestorsOf(B.n).has(A.n);
      if (ordered) continue;
      for (const sa of scopesOf(A)) {
        for (const sb of scopesOf(B)) {
          if (clashes(sa, sb)) problems.push(`P0 写集干涉：票 ${A.n} 与票 ${B.n}（无序）都写 ${sa === sb ? sa : sa + ' × ' + sb}`);
        }
      }
    }
  }

  // 写集不许为空
  for (const t of active) {
    if (scopesOf(t).length === 0) problems.push(`P0 写集为空：票 ${t.n}（写不出写集的票不许开）`);
  }

  return problems;
}

// ── 网络侧：建票、同步、连线 ──────────────────────────────────────────────────

function createMap() {
  if (state.map.issue) return;
  const out = gh('issue', 'create', '--repo', REPO, '--title', state.map.title, '--body-file', join(here, state.map.bodyFile), '--label', state.map.label);
  state.map.issue = Number(String(out).match(/\/issues\/(\d+)/)[1]);
  save();
  console.log(`建 map：#${state.map.issue}`);
}

function createTickets() {
  for (const t of tickets) {
    if (t.issue) continue;
    const out = gh('issue', 'create', '--repo', REPO, '--title', t.title, '--body-file', join(here, t.body), '--label', `wayfinder:${t.type}`);
    t.issue = Number(String(out).match(/\/issues\/(\d+)/)[1]);
    save();
    console.log(`建子票 ${t.n}：#${t.issue}  ${t.title}`);
  }
}

function syncBodies() {
  const mapBody = readFileSync(join(here, state.map.bodyFile), 'utf8');
  const remoteMap = gh('issue', 'view', String(state.map.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (normTail(mapBody) !== normTail(remoteMap)) {
    gh('issue', 'edit', String(state.map.issue), '--repo', REPO, '--body-file', join(here, state.map.bodyFile));
    console.log(`同步地图正文 → #${state.map.issue}`);
  }
  for (const t of tickets) {
    const local = readFileSync(join(here, t.body), 'utf8');
    const cur = JSON.parse(gh('issue', 'view', String(t.issue), '--repo', REPO, '--json', 'body,title'));
    const bodyDiffers = normTail(local) !== normTail(cur.body);
    const titleDiffers = cur.title !== t.title;
    if (!bodyDiffers && !titleDiffers) continue;
    const args = ['issue', 'edit', String(t.issue), '--repo', REPO];
    if (titleDiffers) args.push('--title', t.title);
    if (bodyDiffers) args.push('--body-file', join(here, t.body));
    gh(...args);
    console.log(`同步子票${titleDiffers ? '标题' : ''}${bodyDiffers ? '正文' : ''}：#${t.issue}（票 ${t.n}）`);
  }
}

function reconcileSubIssues() {
  const map = state.map.issue;
  const have = new Set(ghJson('api', `repos/${REPO}/issues/${map}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of tickets) {
    if (have.has(t.issue)) continue;
    gh('api', `repos/${REPO}/issues/${map}/sub_issues`, '-X', 'POST', '-F', `sub_issue_id=${dbIdOf(t.issue)}`);
    console.log(`建子议题边：#${t.issue} → map #${map}`);
  }
}

/** 阻塞边双向收敛：缺的补、多的删。 */
function reconcileBlockedBy() {
  for (const t of tickets) {
    const want = new Set((t.blockedBy ?? []).map((n) => byN.get(n).issue));
    const have = new Map(ghJson('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by`, '--paginate').map((i) => [i.number, i.id]));
    for (const [num, id] of have) {
      if (want.has(num)) continue;
      try {
        gh('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by/${id}`, '-X', 'DELETE');
        console.log(`删多余阻塞边：#${t.issue} ⊄ #${num}（票源里没有这条）`);
      } catch (e) {
        console.log(`删边失败（#${t.issue} ← #${num}）：${String(e.stderr || e.message).split('\n')[0]}`);
      }
    }
    for (const num of want) {
      if (have.has(num)) continue;
      gh('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by`, '-X', 'POST', '-F', `issue_id=${dbIdOf(num)}`);
      console.log(`建阻塞边：#${t.issue} ← #${num}`);
    }
  }
}

function syncPlanTable() {
  const rows = tickets.map((t) => {
    const blockers = (t.blockedBy ?? []).length ? t.blockedBy.map((n) => `[票 ${n}](${url(byN.get(n).issue)})`).join(' ＋ ') : '—';
    const name = t.retired ? `~~${t.title}~~（已退役）` : `[${t.title}](${url(t.issue)})`;
    return `| ${t.n} | ${name} | ${t.type} | ${blockers} |`;
  });
  const table = ['| 序 | 票 | 类型 | 被谁阻塞 |', '|---|---|---|---|', ...rows].join('\n');
  const p = join(here, state.map.bodyFile);
  const src = readFileSync(p, 'utf8');
  const BEGIN = '<!-- PLAN-TABLE:BEGIN -->';
  const END = '<!-- PLAN-TABLE:END -->';
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i < 0 || j < 0) throw new Error('地图正文里找不到任务清单标记 ' + BEGIN);
  const next = src.slice(0, i + BEGIN.length) + '\n' + table + '\n' + src.slice(j);
  if (next !== src) writeFileSync(p, next, 'utf8');
  const remote = gh('issue', 'view', String(state.map.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (normTail(remote) !== normTail(next)) {
    gh('issue', 'edit', String(state.map.issue), '--repo', REPO, '--body-file', p);
    console.log(`推送地图正文（${rows.length} 行任务清单表）→ #${state.map.issue}`);
  }
}

// ── 自检与读数 ────────────────────────────────────────────────────────────────

function validate() {
  const map = state.map.issue;
  const problems = gates();

  const sub = ghJson('api', `repos/${REPO}/issues/${map}/sub_issues`, '--paginate');
  if (sub.length !== tickets.length) problems.push(`子议题边：expected=${tickets.length} actual=${sub.length}`);

  const rows = [];
  for (const t of active) {
    const expected = (t.blockedBy ?? []).length;
    const actual = ghJson('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by`, '--paginate').length;
    rows.push(`  票 ${String(t.n).padStart(2, '0')} #${t.issue}  阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`票 ${t.n} #${t.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }

  const body = gh('issue', 'view', String(map), '--repo', REPO, '--json', 'body', '--jq', '.body');
  const tableRows = body.split('\n').filter((l) => /^\| \d+ \| /.test(l)).length;
  if (tableRows !== tickets.length) problems.push(`任务清单表行数：expected=${tickets.length} actual=${tableRows}`);
  if (normTail(readFileSync(join(here, state.map.bodyFile), 'utf8')) !== normTail(body)) {
    problems.push('地图正文：本地文件与 issue 正文不一致（跑一次不带 --check 的脚本即可推送）');
  }
  for (const t of tickets) {
    const local = readFileSync(join(here, t.body), 'utf8');
    if (!local.trim()) problems.push(`子票 ${t.n} 正文文件为空`);
    if (/\uFEFF/.test(local)) problems.push(`子票 ${t.n} 正文文件带 BOM`);
    if (/\\n/.test(local)) problems.push(`子票 ${t.n} 正文里有字面 \\n 转义`);
    const remote = gh('issue', 'view', String(t.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
    if (normTail(local) !== normTail(remote)) problems.push(`子票 ${t.n} #${t.issue}：本地正文文件与 issue 正文不一致`);
  }

  // ③ frontier 非空（开放、无开放阻塞者、未认领）
  const closed = new Set(sub.filter((i) => i.state === 'closed').map((i) => i.number));
  const assigned = new Set(sub.filter((i) => (i.assignees ?? []).length > 0).map((i) => i.number));
  const frontier = active.filter(
    (t) => !closed.has(t.issue) && !assigned.has(t.issue) && (t.blockedBy ?? []).every((n) => closed.has(byN.get(n).issue)),
  );
  if (frontier.length === 0) problems.push('frontier 为空：没有任何一张票可做（饿死）');
  const afk = frontier.filter((t) => t.type !== 'grilling');

  console.log(`\n地图 #${map}（数据库 id ${dbIdOf(map)}）  ${state.map.title}`);
  console.log(`子议题边：expected=${tickets.length} actual=${sub.length}（含退役 ${tickets.length - active.length} 张）`);
  console.log(`子议题 closed/total = ${sub.filter((i) => i.state === 'closed').length}/${sub.length}`);
  console.log(`任务清单表行数：expected=${tickets.length} actual=${tableRows}`);
  console.log(`frontier（${frontier.length} 张，其中不依赖人 ${afk.length} 张）：${frontier.map((t) => `票 ${t.n}(#${t.issue},${t.type})`).join('、') || '（空）'}`);
  console.log('阻塞边：');
  console.log(rows.join('\n'));
  console.log('写集：');
  for (const t of active) console.log(`  票 ${String(t.n).padStart(2, '0')}  ${scopesOf(t).length} 条路径`);

  if (problems.length) {
    console.error('\nFAIL：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：无环、写集不相交、frontier 非空、边与表逐项一致。');
}

function main() {
  if (CHECK_ONLY) {
    if (!state.map.issue) throw new Error('地图还没建，--check 无事可做');
    validate();
    return;
  }
  createMap();
  createTickets();
  reconcileSubIssues();
  reconcileBlockedBy();
  syncBodies();
  syncPlanTable();
  validate();
}

main();
