/** #722 · check-examples 归因 A/B：56 红里有多少是**说明面**引起的？
 *
 * 背景：判据电池里 `check-examples` 红 56 条；随后把 `SKILL.md` 换成 HEAD 版本再跑，红 35 条。
 * 两个读数不同 ⇒ 必须判定差值是不是我改的说明面造成的（不能拿「反正门本来就红」了事）。
 *
 * 做法：同一个加锁窗口里，**同一份当刻 dist** 上，只切 `SKILL.md` 一个变量，跑两轮：
 *   A 轮＝我的版本（含 #722 改写）；B 轮＝`git show HEAD:` 的版本；A／B／A／B 交错跑两遍取一致读数。
 *   check-examples 的 harness 自己起隔离库并灌 `docs/research/t81-seed.mjs` 种子，两轮的库状态同源，
 *   故差异只可能来自说明面或**他席在途的 dist**；后者由「同一窗口内 dist 指纹不变」一条排掉。
 *
 * 用法（必须持外层锁）：
 *   node tooling/run-locked.mjs --ticket 722 -- node .scratch/t722/ab-examples.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LOG = join(ROOT, '.scratch', 't722');
const SKILL = 'packages/skill-calorie/SKILL.md';
const SKILL_ABS = join(ROOT, SKILL);

const sha = (b) => createHash('sha256').update(b).digest('hex');
const lines = [];
let bad = 0;
const judge = (ok, label, detail) => { if (!ok) bad += 1; lines.push((ok ? 'OK   ' : 'RED  ') + label + ' :: ' + detail); };

/** dist 全量指纹：证「两轮跑在同一份编译产物上」——差异不可能是 dist 漂移。 */
function distFingerprint() {
  const dir = join(ROOT, 'packages', 'skill-calorie', 'dist');
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p); else if (statSync(p).isFile()) files.push(p);
    }
  };
  walk(dir);
  files.sort();
  const h = createHash('sha256');
  for (const f of files) h.update(relative(ROOT, f).replace(/\\/g, '/')).update('\0').update(readFileSync(f));
  return { count: files.length, sha: h.digest('hex') };
}

const mine = readFileSync(SKILL_ABS);
const headVer = (() => {
  const r = spawnSync('git', ['show', 'HEAD:' + SKILL], { cwd: ROOT, encoding: 'buffer' });
  if (r.status !== 0 || !r.stdout || r.stdout.length === 0) throw new Error('git show 取不到 HEAD 版 SKILL.md');
  return r.stdout;
})();

function runExamples(tag) {
  const r = spawnSync(process.execPath, ['packages/skill-calorie/scripts/check-examples.mjs'], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
  writeFileSync(join(LOG, 'ab-' + tag + '.log'), out, 'utf8');
  const summary = (out.match(/示例行数：(\d+)（通过 (\d+)，白名单跳过 (\d+)，红 (\d+)/) || []);
  return { status: r.status, total: Number(summary[1]), pass: Number(summary[2]), skip: Number(summary[3]), red: Number(summary[4]) };
}

const fpBefore = distFingerprint();
const runs = { A: [], B: [] };
try {
  // 交错两遍：A（我的）→ B（HEAD）→ A → B
  for (const round of [1, 2]) {
    writeFileSync(SKILL_ABS, mine);
    runs.A.push({ round, ...runExamples('A' + round) });
    writeFileSync(SKILL_ABS, headVer);
    runs.B.push({ round, ...runExamples('B' + round) });
  }
} finally {
  writeFileSync(SKILL_ABS, mine);
}

const fpAfter = distFingerprint();
judge(fpAfter.sha === fpBefore.sha && fpAfter.count === fpBefore.count,
  '窗口内 skill-calorie/dist 无漂移（两轮跑在同一份编译产物上）',
  'before=' + fpBefore.sha.slice(0, 16) + '/' + fpBefore.count + ' after=' + fpAfter.sha.slice(0, 16) + '/' + fpAfter.count);
judge(sha(readFileSync(SKILL_ABS)) === sha(mine), '还原我的 SKILL.md 版本', 'sha=' + sha(mine).slice(0, 16));

const aRed = [...new Set(runs.A.map((r) => r.red))];
const bRed = [...new Set(runs.B.map((r) => r.red))];
lines.push('INFO A 轮（#722 改写版）红数：' + runs.A.map((r) => 'r' + r.round + '=' + r.red + '/' + r.total).join(' '));
lines.push('INFO B 轮（HEAD 版）红数：' + runs.B.map((r) => 'r' + r.round + '=' + r.red + '/' + r.total).join(' '));
judge(aRed.length === 1 && bRed.length === 1, '两轮各自重复读数一致（同一份说明面两次跑红数相同）',
  'A=' + aRed.join(',') + ' B=' + bRed.join(',') + '（重复不稳定 ⇒ 本实验不成立）');
judge(aRed.length === 1 && bRed.length === 1 && aRed[0] === bRed[0],
  '归因 · 说明面换来换去红数不变 ⇒ 那批红与本票的 SKILL.md 改写无关',
  'A红=' + aRed.join(',') + ' vs B红=' + bRed.join(',') + '（差 ' + (aRed[0] - bRed[0]) + '）');

console.log(lines.join('\n'));
const judged = lines.filter((l) => l.startsWith('OK ') || l.startsWith('RED'));
console.log('RESULT: ' + judged.filter((l) => l.startsWith('OK')).length + '/' + judged.length + ' ' + (bad === 0 ? 'PASS' : 'FAIL'));
process.exit(bad === 0 ? 0 : 1);
