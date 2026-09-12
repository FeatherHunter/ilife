#!/usr/bin/env node
/**
 * 本图（#183「居家管家HELP真标准」）的原生边接线脚本。
 *
 * 只做两件事：
 *   1. 把缺的边补上——原生**子议题**边（ticket → map）与原生**阻塞**边（ticket → 阻塞它的票）；
 *   2. 把 expected 与 actual 对到相等：对不上就非零退出并打印差在哪。
 *
 * 为什么要脚本：一边建边一边数，数不对不能当成功。手点 UI 建不出可校验的 counts。
 *
 * 用法：node docs/skills/skill-home/t183-wire-edges.mjs
 * 依赖：`gh` 已登录（scopes 含 repo）；同目录 map-183-tickets.json 是建票时的映射。
 *
 * 阻塞边的形参是**数据库 id**（`gh api .../issues/<n> --jq .id`），不是 #号码、也不是 node_id。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = 'FeatherHunter/ilife';
const MAP = 183;

/** 阻塞关系（本图唯一真相源；票面正文里的 `Blocked by:` 行只作降级兜底）：child ← [blockers] */
const BLOCKED_BY = {
  4: [1],
  5: [2, 12],
  6: [1, 3, 12],
  7: [4, 6],
  8: [7],
  9: [7],
  11: [8, 9, 10],
  12: [2],
};

const here = dirname(fileURLToPath(import.meta.url));
const tickets = JSON.parse(readFileSync(join(here, 'map-183-tickets.json'), 'utf8'));
const byN = new Map(tickets.map((t) => [t.n, t]));

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ghJson = (...args) => JSON.parse(gh(...args) || '[]');

/** 数据库 id：阻塞边的形参。 */
const dbIdOf = (n) => Number(gh('api', `repos/${REPO}/issues/${byN.get(n).issue}`, '--jq', '.id'));

/** 建边：缺哪个补哪个（脚本可重复跑）。haveOf 给的是**号码**集合，故比对的也是号码。 */
function ensure(missingCheck, postPath, field, value) {
  if (!missingCheck()) return;
  gh('api', `repos/${REPO}/${postPath}`, '-X', 'POST', '-F', `${field}=${value}`);
}

function main() {
  // ── 0. 先钉住每张票的数据库 id（阻塞边的形参是数据库 id，不是 #号码） ──
  const dbId = new Map();
  for (const t of tickets) dbId.set(t.n, dbIdOf(t.n));

  // ── 1. 原生子议题边：每张票都要挂到 #183 之下 ──
  const subNumbers = () =>
    new Set(ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').map((i) => i.number));
  for (const t of tickets) {
    ensure(() => !subNumbers().has(t.issue), `issues/${MAP}/sub_issues`, 'sub_issue_id', dbId.get(t.n));
  }

  // ── 2. 原生阻塞边 ──
  const blockersOf = (childIssue) =>
    new Set(
      ghJson('api', `repos/${REPO}/issues/${childIssue}/dependencies/blocked_by`, '--paginate').map((i) => i.number),
    );
  for (const [childKey, blockers] of Object.entries(BLOCKED_BY)) {
    const child = byN.get(Number(childKey));
    if (!child) throw new Error(`BLOCKED_BY 里的票 ${childKey} 不在 tickets 映射里`);
    for (const b of blockers) {
      const blockerIssue = byN.get(b).issue;
      ensure(
        () => !blockersOf(child.issue).has(blockerIssue),
        `issues/${child.issue}/dependencies/blocked_by`,
        'issue_id',
        dbId.get(b),
      );
    }
  }

  // ── 3. 校验：expected 与 actual 逐项对 ──
  const problems = [];
  const subActual = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate');
  const subExpected = tickets.length;
  if (subActual.length !== subExpected) {
    problems.push(`子议题边：expected=${subExpected} actual=${subActual.length}`);
  }
  const rows = [];
  for (const t of tickets) {
    const expected = (BLOCKED_BY[t.n] ?? []).length;
    const actual = blockersOf(t.issue).size;
    rows.push(`  t${String(t.n).padStart(2, '0')} #${t.issue}  被阻塞 expected=${expected} actual=${actual}`);
    if (expected !== actual) problems.push(`t${t.n} #${t.issue} 阻塞边：expected=${expected} actual=${actual}`);
  }

  console.log(`map #${MAP}（数据库 id ${gh('api', `repos/${REPO}/issues/${MAP}`, '--jq', '.id')}）`);
  console.log(`子议题边：expected=${subExpected} actual=${subActual.length}`);
  console.log(`子议题 closed/total = ${subActual.filter((i) => i.state === 'closed').length}/${subActual.length}`);
  console.log('阻塞边：');
  console.log(rows.join('\n'));

  if (problems.length) {
    console.error('\nFAIL（expected 与 actual 不一致）：');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('\nPASS：子议题边与阻塞边逐项一致。');
}

main();
