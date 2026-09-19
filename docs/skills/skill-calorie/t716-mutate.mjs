/**
 * #716 变异自证：证明「逐页逐字节相同」这条判据**有识别力**，且识别面**分得开**。
 *
 * 三轮，打三块互不重叠的页族（照 `docs/skills/skill-calorie/t715-mutate.mjs` 的做法：
 * 改坏 → 重编 → 重出必红；**逐字节写回原文** → 重编 → 重出必绿）：
 *   ① `src/photo/wizardPortDocs.ts` 的身材照页副标题 —— 只该红**身材照向导**那一族；
 *   ② `src/photo/templates.ts` 的 `CALORIE_TEMPLATES` 成员 —— 只该红**速查台**那一族；
 *   ③ `src/photo/helpShell.ts` 透传给公共层壳的 `data` —— 只该红 **HELP 文件**那一页。
 * 三轮合起来覆盖本窗四个搬走件的产出面；**面外页一条都不许红**（红了说明归因不成立）。
 *
 * 必须在**持锁窗口**里跑（脚本自己要重编）：
 *   node tooling/run-locked.mjs --ticket 716 -- node .scratch/t716/mutate.mjs
 * 用法：node .scratch/t716/mutate.mjs [--rounds 3]
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const rounds = [
  {
    tag: 'MUT1-向导页副标题',
    file: 'src/photo/wizardPortDocs.ts',
    from: "    subtitle: '先核对要登记的照片与标签，再复制指令给 AI。照片本身不会被动。',",
    to: "    subtitle: '先核对要登记的照片与标签，再复制指令给 AI。照片本身不会被动（改坏）。',",
    expectRed: '向导两页那一族',
  },
  {
    tag: 'MUT2-模板清单',
    file: 'src/photo/templates.ts',
    from: "  'photo-gallery',\n",
    to: '',
    expectRed: '速查台那一族',
  },
  {
    tag: 'MUT3-HELP壳载荷',
    file: 'src/photo/helpShell.ts',
    from: '    return renderBaseHelpShellHtml(data);',
    to: "    return renderBaseHelpShellHtml({ ...data, title: data.title + '（改坏）' });",
    expectRed: 'HELP 文件那一页',
  },
];

const sha12 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 12);

/** 跑一条子进程；返回 `{status, seconds, stdout}`。红不算失败（比对轮红是预期）。 */
function run(args, tag) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 1800000 });
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0 && !args.includes('--compare')) {
    console.log(`FAIL ${tag} exit=${r.status} (${seconds}s)`);
    console.log('  ' + String(r.stderr || r.stdout || '').trimEnd().split(/\r?\n/).slice(-6).join('\n  '));
    process.exitCode = 1;
  }
  return { status: r.status, seconds, stdout: String(r.stdout || '') };
}
const build = (tag) => run([TSC, '-b', 'packages/skill-calorie'], tag);
function regen(tag) {
  const r = run(['.scratch/t716/regen.mjs', '--tag', tag, '--compare', '.scratch/t716/基线.json'], tag);
  const line = (r.stdout.match(/^.*byte-identical.*$/m) ?? ['（无读数行）'])[0];
  const total = (r.stdout.match(/^\s+total_before=.*$/m) ?? [''])[0].trim();
  return { status: r.status, line, total };
}

const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const limit = Number(argOf('--rounds', '3')) || 3;

for (const [i, r] of rounds.entries()) {
  if (i >= limit) break;
  const abs = join(PKG, r.file);
  const original = readFileSync(abs, 'utf8');
  const hits = original.split(r.from).length - 1;
  if (hits !== 1) {
    console.log(`FAIL ${r.tag} 锚点命中 ${hits} 次（要求 1）：${JSON.stringify(r.from.slice(0, 80))}`);
    process.exitCode = 1;
    break;
  }

  console.log(`\n【${r.tag}】${r.file} —— 该红面＝${r.expectRed}`);
  writeFileSync(abs, original.replace(r.from, r.to), 'utf8');
  build(`build-${r.tag}`);
  const red = regen(`${r.tag}-RED`);
  console.log(`${r.tag}-RED   ${red.line}`);
  if (red.total) console.log(`  ${red.total}`);
  if (red.status === 0) { console.log('  ✗ 判据没红 —— 这一轮没有识别力'); process.exitCode = 1; }

  writeFileSync(abs, original, 'utf8');
  const back = readFileSync(abs, 'utf8');
  console.log(`RESTORE-${i + 1} 相等=${back === original} sha256_12=${sha12(back)}`);
  build(`build-${r.tag}-restore`);
  const green = regen(`GREEN${i + 1}`);
  console.log(`GREEN${i + 1}   ${green.line}`);
  if (green.line.includes('DIFF=none')) console.log('  ✓ 逐字节写回后回绿');
  else { console.log('  ✗ 还原后没回绿'); process.exitCode = 1; }
}

console.log(`\nRESULT: 变异自证 ${process.exitCode ? '有失败项' : '全绿'}`);
