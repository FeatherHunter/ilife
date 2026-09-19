/** #722 · 归因电池：两条 RED 是**本票引入**还是**他席在途**？
 *
 * 做法（协议 §3.2.4：先量现场、再自判完成度）：在同一个加锁窗口里
 *   ① 备份当前工作副本（我的版本）到 `.scratch/t722/pre-image/`；
 *   ② 把 `git show HEAD:<件>` 的**已提交**版本写回原路径；
 *   ③ 重跑那两条判据；
 *   ④ 无论结果如何，在 `finally` 里把工作副本逐字节还原并自证 sha 相同。
 *
 * 若 HEAD 版本也是红 ⇒ 两条 RED 与本票无关（他席在途）；若 HEAD 版本绿 ⇒ 是本票引入，必须修。
 * 用法（必须持外层锁）：
 *   node tooling/run-locked.mjs --ticket 722 -- node .scratch/t722/baseline.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PRE = join(ROOT, '.scratch', 't722', 'pre-image');
mkdirSync(PRE, { recursive: true });

const sha = (b) => createHash('sha256').update(b).digest('hex');
const lines = [];
let bad = 0;
const judge = (ok, label, detail) => { if (!ok) bad += 1; lines.push((ok ? 'OK   ' : 'RED  ') + label + ' :: ' + detail); };

const FILES = [
  'packages/skill-calorie/SKILL.md',
  'packages/skill-calorie/test/skill-t11.test.mjs',
];

const before = new Map(FILES.map((f) => [f, sha(readFileSync(join(ROOT, f)))]));
// ① 备份工作副本
for (const f of FILES) copyFileSync(join(ROOT, f), join(PRE, f.replace(/[\/\\]/g, '__')));

function runNode(args, logName) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(join(ROOT, '.scratch', 't722', logName),
    '# HEAD-baseline: node ' + args.join(' ') + '\n' + (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''), 'utf8');
  return r;
}
const counts = (t) => {
  const g = (re) => { const m = String(t).match(re); return m ? Number(m[1]) : -1; };
  return { pass: g(/^[#\u2139]\s*pass\s+(\d+)/m), fail: g(/^[#\u2139]\s*fail\s+(\d+)/m) };
};
const tail = (t, n = 2) => String(t || '').trim().split('\n').slice(-n).join(' | ').slice(0, 260);

let head = null;
try {
  // ② 写回 HEAD 版本
  for (const f of FILES) {
    const r = spawnSync('git', ['show', 'HEAD:' + f], { cwd: ROOT, encoding: 'buffer' });
    if (r.status !== 0 || !r.stdout || r.stdout.length === 0) throw new Error('git show 取不到 ' + f + '：exit=' + r.status);
    writeFileSync(join(ROOT, f), r.stdout);
  }
  // ③ 重跑两条判据
  const tsc = runNode(['node_modules/typescript/bin/tsc', '-b', 'packages/skill-calorie'], 'base-tsc.log');
  const c43 = runNode(['--test', 'packages/skill-calorie/test/calorie-c43.test.mjs'], 'base-c43.log');
  const ex = runNode(['packages/skill-calorie/scripts/check-examples.mjs'], 'base-examples.log');
  head = {
    tsc: tsc.status,
    c43: { status: c43.status, ...counts((c43.stdout || '') + (c43.stderr || '')) },
    ex: { status: ex.status, line: tail([...(ex.stdout || '').split('\n')].filter((l) => /^RESULT|^示例行数/.test(l)), 2) },
  };
} finally {
  // ④ 还原工作副本 ＋ 自证
  for (const f of FILES) writeFileSync(join(ROOT, f), readFileSync(join(PRE, f.replace(/[\/\\]/g, '__'))));
  const tsc2 = runNode(['node_modules/typescript/bin/tsc', '-b', 'packages/skill-calorie'], 'restore-tsc.log');
  for (const f of FILES) {
    const now = sha(readFileSync(join(ROOT, f)));
    judge(now === before.get(f), '还原逐字节一致 · ' + f, 'sha=' + now.slice(0, 16));
  }
  lines.push('INFO 还原后重编 exit=' + tsc2.status);
}

judge(head !== null, 'HEAD 基线跑完', head ? 'tsc=' + head.tsc : '没跑成');
if (head) {
  lines.push('INFO HEAD 基线 · calorie-c43 exit=' + head.c43.status + ' pass=' + head.c43.pass + ' fail=' + head.c43.fail);
  lines.push('INFO HEAD 基线 · check-examples exit=' + head.ex.status + ' ' + head.ex.line);
  judge(head.c43.fail > 0, '归因 · calorie-c43 在 HEAD 也是红 ⇒ 与他席在途改动同源，非本票引入',
    'HEAD fail=' + head.c43.fail);
  judge(head.ex.status !== 0, '归因 · check-examples 在 HEAD 也是红 ⇒ 与他席在途改动同源，非本票引入',
    'HEAD exit=' + head.ex.status);
}

console.log(lines.join('\n'));
const judged = lines.filter((l) => l.startsWith('OK ') || l.startsWith('RED'));
console.log('RESULT: ' + judged.filter((l) => l.startsWith('OK')).length + '/' + judged.length + ' ' + (bad === 0 ? 'PASS' : 'FAIL'));
process.exit(bad === 0 ? 0 : 1);
