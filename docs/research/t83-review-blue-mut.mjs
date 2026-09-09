/** #83 蓝队独立变异（审查席）——每个变异「立即还原 ＋ 重建 ＋ sha256 逐字节自证」，不留到批末。
 *
 *  与实施者 `t83-mutation.mjs`（M1／M2）和红队新增 M3 的差别：本脚本三支都打**既有脚本未覆盖**的面
 *   （`--html` legacy 别名 / `template` 结构判定次序 / R-1 归一化是否真承重），并额外核对
 *  **dist 级 sha256**（证明「重建真的生效」＋「还原真的逐字节回到原样」）。
 *
 *  运行（须经持锁包装器，内部 build/test 复用同一把锁）：
 *    node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-review-blue-mut.mjs
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'packages', 'skill-calorie', 'src', 'output.ts');
const CMD = join(ROOT, 'packages', 'skill-calorie', 'src', 'cli', 'cmd_read.ts');
const ENV = join(ROOT, 'packages', 'skill-calorie', 'src', 'render', 'envelope.ts');
const DIST_OUT = join(ROOT, 'packages', 'skill-calorie', 'dist', 'output.js');
const DIST_CMD = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const DIST_ENV = join(ROOT, 'packages', 'skill-calorie', 'dist', 'render', 'envelope.js');
const TARGETED = [
  'packages/skill-calorie/test/delivery-83.test.mjs',
  'packages/skill-calorie/test/cmd-read-t11.test.mjs',
  'packages/skill-calorie/test/render-copy-90.test.mjs',
  'packages/skill-calorie/test/help-center-91.test.mjs',
  'packages/skill-calorie/test/skill-t11.test.mjs',
  'packages/skill-calorie/test/output-naming-87.test.mjs',
];

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
  return { status: r.status, out: String(r.stdout) + String(r.stderr) };
}
function build() {
  const r = run('pnpm', ['build']);
  if (r.status !== 0) throw new Error('pnpm build 失败：' + r.out.slice(-800));
  return r;
}
function targeted() {
  const r = run('node', ['--test', ...TARGETED]);
  const counts = {};
  for (const m of r.out.matchAll(/^(?:#|\u2139)\s*(tests|pass|fail)\s+(\d+)$/gm)) counts[m[1]] = Number(m[2]);
  const failLine = r.out.split('\n')
    .filter((l) => /^\s*(?:\u2716|not ok)\s+/.test(l))
    .map((l) => l.replace(/^\s*/, '').slice(0, 110));
  return { status: r.status, counts, failLine, tail: r.out.slice(-300) };
}

const MUTS = [
  {
    id: 'MUT-83B-1',
    file: OUT, dist: DIST_OUT,
    what: 'R-1 归一化不承重（还原「原样回传」）——验证返修是否真被测试钉住',
    from: '    const written = resolve(target);',
    to: '    const written = target; // MUT-83B-1',
    expectRed: true,
  },
  {
    id: 'MUT-83B-2',
    file: CMD, dist: DIST_CMD,
    what: '摘掉 `--html` legacy 别名（`explicit: o.output ?? o.html` → `o.output`）——两份既有脚本都只用 `--output`',
    from: '          key: o.key as string, shape: shape as EnvelopeShape, out, params, explicit: o.output ?? o.html,',
    to: '          key: o.key as string, shape: shape as EnvelopeShape, out, params, explicit: o.output, // MUT-83B-2',
    expectRed: true,
  },
  {
    id: 'MUT-83B-3',
    file: ENV, dist: DIST_ENV,
    what: '`deliveryTemplateOf` 判定次序：把 `shape==="receipt"` 提到 `<!DOCTYPE` 之前——既有脚本无覆盖',
    from: "  if (/^\\s*<!DOCTYPE/i.test(s)) return 'doc-shell';\n  if (shape === 'receipt') return 'receipt';",
    to: "  if (shape === 'receipt') return 'receipt'; // MUT-83B-3\n  if (/^\\s*<!DOCTYPE/i.test(s)) return 'doc-shell';",
    expectRed: true,
  },
  {
    id: 'MUT-83B-4',
    file: OUT, dist: DIST_OUT,
    what: '独立复核实施者 M1（摘掉只读回退）——是否真红',
    from: '    if (isReadOnlyWriteFailure(e)) return { mode: \'inline\', reason: (e as Error).message, bytes };',
    to: '    if (isReadOnlyWriteFailure(e) && false) return { mode: \'inline\', reason: (e as Error).message, bytes }; // MUT-83B-4',
    expectRed: true,
  },
  {
    id: 'MUT-83B-5',
    file: ENV, dist: DIST_ENV,
    what: '独立复核实施者 M2（摘掉 delivery 注入）——是否真红',
    from: '  return { ...env, delivery };',
    to: '  return { ...env }; // MUT-83B-5',
    expectRed: true,
  },
  {
    id: 'MUT-83B-6',
    file: CMD, dist: DIST_CMD,
    what: '回执落盘态**也**回传正文（`html: delivery.mode === "inline" ? receiptHtml : undefined` → 恒给）——测既有断言是否恒真',
    from: "      ok: false, ...receipt, delivery, html: delivery.mode === 'inline' ? receiptHtml : undefined,",
    to: "      ok: false, ...receipt, delivery, html: receiptHtml, // MUT-83B-6",
    expectRed: true,
  },
];

console.log('# 蓝队变异轮（每支：变异 → 重建 → 靶向 → 还原 → 重建 → 靶向 ＋ sha256 自证）');
let allOk = true;
for (const m of MUTS) {
  const srcBefore = readFileSync(m.file, 'utf8');
  const shaBefore = sha(m.file);
  const distBefore = sha(m.dist);
  const occ = srcBefore.split(m.from).length - 1;
  if (occ !== 1) { console.log('MUT-SKIP ' + m.id + ' 锚点命中 ' + occ + ' 次（须 1）'); allOk = false; continue; }
  writeFileSync(m.file, srcBefore.replace(m.from, m.to), 'utf8');
  const shaMut = sha(m.file);
  build();
  const distMut = sha(m.dist);
  const red = targeted();
  // 立即还原
  writeFileSync(m.file, srcBefore, 'utf8');
  const shaBack = sha(m.file);
  build();
  const distBack = sha(m.dist);
  const green = targeted();
  const restored = shaBack === shaBefore && distBack === distBefore;
  const redOk = m.expectRed ? red.status !== 0 : true;
  const greenOk = green.status === 0 && (green.counts.fail ?? 0) === 0;
  const distMoved = distMut !== distBefore;
  const ok = restored && greenOk && redOk && distMoved;
  if (!ok) allOk = false;
  console.log('MUT ' + m.id + ' ' + (ok ? 'OK' : '**CHECK**')
    + ' | ' + m.what
    + ' | src ' + shaBefore.slice(0, 12) + '→' + shaMut.slice(0, 12) + '→还原' + (shaBack === shaBefore ? '逐字节相同' : '**不同**')
    + ' | dist ' + distBefore.slice(0, 12) + '→' + distMut.slice(0, 12) + '→还原' + (distBack === distBefore ? '逐字节相同' : '**不同**')
    + ' | 变异轮 exit=' + red.status + ' ' + JSON.stringify(red.counts) + (red.failLine.length ? ' red=[' + red.failLine.slice(0, 3).join(' ; ') + ']' : '')
    + ' | 还原轮 exit=' + green.status + ' ' + JSON.stringify(green.counts));
}
console.log('RESULT-MUT-BLUE: ' + (allOk ? 'ALL OK' : 'SEE ABOVE'));
process.exit(allOk ? 0 : 1);
