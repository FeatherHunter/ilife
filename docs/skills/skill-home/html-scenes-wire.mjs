#!/usr/bin/env node
/**
 * 本图（居家管家场景页）的接线脚本：建 map ＋ 建子票 ＋ 建原生边 ＋ 回写任务清单 ＋ 自校验。
 *
 * 做四件事，顺序固定：
 *   1. 建（缺才建）：map 与 20 张子票——票面正文一律以**文件**提交（`--body-file`），不内联字符串；
 *   2. 原生子议题边：`gh api repos/<owner>/<repo>/issues/<map>/sub_issues -X POST -F sub_issue_id=<数据库 id>`；
 *   3. 原生阻塞边：`gh api repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -X POST -F issue_id=<阻塞票的数据库 id>`；
 *      ——数据库 id 用 `gh api .../issues/<n> --jq .id` 取，不是 #号码、也不是 node_id。**仅当后端明确不支持原生边**
 *      时才把 `Blocked by: #<n>` 写进子票正文首行作降级兜底（脚本会自己判，不是默认就写）。
 *   4. 校验：子议题边数 ＝ 票数、每张票的阻塞边数与票源一致、任务清单表 20 行——expected 与 actual 对不上就非零退出。
 *
 * 用法：
 *   node docs/skills/skill-home/html-scenes-wire.mjs           # 建＋连线＋回写＋自校验（可重复跑）
 *   node docs/skills/skill-home/html-scenes-wire.mjs --check   # 只校验，不写任何东西
 *
 * 依赖：`gh` 已登录（scopes 含 repo）；同目录 `html-scenes-tickets.json` 是票源与票号映射（脚本会把新建的 issue 号写回）。
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

const gh = (...args) => execFileSync('gh', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');
const save = () => writeFileSync(ticketsPath, JSON.stringify(state, null, 2) + '\n', 'utf8');

const byN = new Map(state.tickets.map((t) => [t.n, t]));
const issueOf = (n) => byN.get(n).issue;
const numFromUrl = (s) => {
  const m = String(s).match(/\/issues\/(\d+)/);
  if (!m) throw new Error('建票回执里找不到 issue 号：' + s);
  return Number(m[1]);
};

/** 数据库 id：原生边的形参。 */
const dbIdOf = (issueNo) => Number(gh('api', `repos/${REPO}/issues/${issueNo}`, '--jq', '.id'));

function createMap() {
  if (state.map.issue) return;
  const body = join(here, state.map.bodyFile);
  const out = gh('issue', 'create', '--repo', REPO, '--title', state.map.title, '--body-file', body, '--label', state.map.label);
  state.map.issue = numFromUrl(out);
  save();
  console.log(`建 map：#${state.map.issue}`);
}

function createTickets() {
  for (const t of state.tickets) {
    if (t.issue) continue;
    const body = join(here, t.body);
    const out = gh('issue', 'create', '--repo', REPO, '--title', t.title, '--body-file', body, '--label', `wayfinder:${t.type}`);
    t.issue = numFromUrl(out);
    save();
    console.log(`建子票 ${String(t.n).padStart(2, '0')}：#${t.issue}  ${t.title}`);
  }
}

function ensureSubIssueEdges() {
  const map = state.map.issue;
  const have = () => new Set(ghJson('api', `repos/${REPO}/issues/${map}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of state.tickets) {
    if (have().has(t.issue)) continue;
    gh('api', `repos/${REPO}/issues/${map}/sub_issues`, '-X', 'POST', '-F', `sub_issue_id=${dbIdOf(t.issue)}`);
    console.log(`建子议题边：#${t.issue} → map #${map}`);
  }
}

/** 后端明确不支持原生边时的兜底：把 `Blocked by: #n` 写进子票正文首行。 */
function fallbackBlockedByLine(child, blockerIssues) {
  const t = state.tickets.find((x) => x.issue === child.issue);
  const src = readFileSync(join(here, t.body), 'utf8');
  if (/^Blocked by: /m.test(src)) return;
  const line = `Blocked by: ${blockerIssues.map((i) => '#' + i).join('、')}\n\n`;
  writeFileSync(join(here, t.body), line + src, 'utf8');
  gh('issue', 'edit', String(child.issue), '--repo', REPO, '--body-file', join(here, t.body));
  console.log(`降级兜底：子票 #${child.issue} 正文首行写入 Blocked by`);
}

function ensureBlockedByEdges() {
  const unsupported = new Set();
  const blockersOf = (issueNo) =>
    new Set(ghJson('api', `repos/${REPO}/issues/${issueNo}/dependencies/blocked_by`, '--paginate').map((i) => i.number));

  for (const t of state.tickets) {
    if (!t.blockedBy.length) continue;
    const have = blockersOf(t.issue);
    for (const b of t.blockedBy) {
      const blockerIssue = issueOf(b);
      if (have.has(blockerIssue)) continue;
      try {
        gh('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by`, '-X', 'POST', '-F', `issue_id=${dbIdOf(blockerIssue)}`);
        console.log(`建阻塞边：#${t.issue} ← #${blockerIssue}`);
      } catch (e) {
        const msg = String(e.stderr || e.message || '');
        if (/not supported|not found|deprecated|unsupported/i.test(msg)) {
          unsupported.add(t.n);
          console.log(`原生阻塞边不可用（#${t.issue} ← #${blockerIssue}）：${msg.split('\n')[0]}`);
          continue;
        }
        throw e;
      }
    }
    if (unsupported.has(t.n)) fallbackBlockedByLine(t, t.blockedBy.map(issueOf));
  }
}

/** 票面**以本地文件为准**：文件与 issue 正文不一致就推一次（`--body-file`，真实换行、不带 BOM）。 */
function syncTicketBodies() {
  for (const t of state.tickets) {
    const local = readFileSync(join(here, t.body), 'utf8');
    const remote = gh('issue', 'view', String(t.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
    if (normTail(local) !== normTail(remote)) {
      gh('issue', 'edit', String(t.issue), '--repo', REPO, '--body-file', join(here, t.body));
      console.log(`同步子票正文：#${t.issue}（票 ${t.n}）`);
    }
  }
}

/** `gh` 打印字符串时会自带一个行尾换行，故只规范化**尾换行**；正文任何一处真差异仍判红。 */
const normTail = (s) => s.replace(/\n+$/, '');

function syncMapBody() {
  const url = (n) => `https://github.com/${REPO}/issues/${n}`;
  const rows = state.tickets.map((t) => {
    const blockers = t.blockedBy.length ? t.blockedBy.map((n) => `[票 ${n}](${url(issueOf(n))})`).join(' ＋ ') : '—';
    return `| ${t.n} | [${t.title}](${url(t.issue)}) | ${t.type} | ${blockers} |`;
  });
  const table = ['| 序 | 票 | 类型 | 被谁阻塞 |', '|---|---|---|---|', ...rows].join('\n');

  const mapBodyPath = join(here, state.map.bodyFile);
  const src = readFileSync(mapBodyPath, 'utf8');
  const BEGIN = '<!-- PLAN-TABLE:BEGIN -->';
  const END = '<!-- PLAN-TABLE:END -->';
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i < 0 || j < 0) throw new Error('地图正文里找不到任务清单标记 ' + BEGIN);
  const next = src.slice(0, i + BEGIN.length) + '\n' + table + '\n' + src.slice(j);
  if (next !== src) writeFileSync(mapBodyPath, next, 'utf8');

  // 正文**以文件为准**：本地文件与 issue 正文不一致就推一次（真实换行、不带 BOM 由文件本身保证）。
  const remote = gh('issue', 'view', String(state.map.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (remote !== next) {
    gh('issue', 'edit', String(state.map.issue), '--repo', REPO, '--body-file', mapBodyPath);
    console.log(`推送地图正文（${rows.length} 行任务清单表）→ map #${state.map.issue}`);
  } else {
    console.log('地图正文：本地文件与 issue 正文一致，无需推送');
  }
}

function validate() {
  const map = state.map.issue;
  const problems = [];
  const sub = ghJson('api', `repos/${REPO}/issues/${map}/sub_issues`, '--paginate');
  if (sub.length !== state.tickets.length) problems.push(`子议题边：expected=${state.tickets.length} actual=${sub.length}`);

  const rows = [];
  for (const t of state.tickets) {
    const expected = t.blockedBy.length;
    const actual = ghJson('api', `repos/${REPO}/issues/${t.issue}/dependencies/blocked_by`, '--paginate').length;
    rows.push(`  票 ${String(t.n).padStart(2, '0')} #${t.issue}  阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`票 ${t.n} #${t.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }

  const body = gh('issue', 'view', String(map), '--repo', REPO, '--json', 'body', '--jq', '.body');
  const tableRows = body.split('\n').filter((l) => /^\| \d+ \| \[/.test(l)).length;
  if (tableRows !== state.tickets.length) problems.push(`任务清单表行数：expected=${state.tickets.length} actual=${tableRows}`);

  const localBody = readFileSync(join(here, state.map.bodyFile), 'utf8');
  if (normTail(localBody) !== normTail(body)) {
    problems.push('地图正文：本地文件与 issue 正文不一致（改文件后跑一次不带 --check 的脚本即可推送）');
  }
  for (const t of state.tickets) {
    const local = readFileSync(join(here, t.body), 'utf8');
    if (!local.trim()) problems.push(`子票 ${t.n} 正文文件为空`);
    if (/\uFEFF/.test(local)) problems.push(`子票 ${t.n} 正文文件带 BOM`);
    if (/\\n/.test(local)) problems.push(`子票 ${t.n} 正文里有字面 \\n 转义`);
    const remoteBody = gh('issue', 'view', String(t.issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
    if (normTail(local) !== normTail(remoteBody)) problems.push(`子票 ${t.n} #${t.issue}：本地正文文件与 issue 正文不一致`);
  }

  console.log(`\n地图 #${map}（数据库 id ${dbIdOf(map)}）  ${state.map.title}`);
  console.log(`子议题边：expected=${state.tickets.length} actual=${sub.length}`);
  console.log(`子议题 closed/total = ${sub.filter((i) => i.state === 'closed').length}/${sub.length}`);
  console.log(`任务清单表行数：expected=${state.tickets.length} actual=${tableRows}`);
  console.log('阻塞边：');
  console.log(rows.join('\n'));

  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：子议题边、阻塞边、任务清单表逐项一致。');
}

function main() {
  if (CHECK_ONLY) {
    if (!state.map.issue) throw new Error('地图还没建（票源里 issue 为 null），--check 无事可做');
    validate();
    return;
  }
  createMap();
  createTickets();
  ensureSubIssueEdges();
  ensureBlockedByEdges();
  syncTicketBodies();
  syncMapBody();
  validate();
}

main();
