#!/usr/bin/env node
/** #87 变异自证（可复跑）：故意破坏命名逻辑 → 对应测试变红 → 恢复 → 变绿。
 *
 * 用法：node docs/research/t87-mutation-evidence.mjs
 *   - 自行持 `D:\ilife\.scratch\locks\gate.lock`（协议 §2：build / node --test 必须持锁），finally 必释放；
 *   - 每个变异：改一个文件的一处字符串 → `pnpm build` → `node --test test/output-naming-87.test.mjs`
 *     → 断言「预期用例名」出现在失败集里 → 还原 → 复跑断言全绿；
 *   - 结果写入 `docs/research/t87-mutation-evidence.md`，退出码非 0 即自证失败。
 *
 * 纪律：只改本票独占路径（`src/output.ts`／`src/cli/cmd_read.ts`），改完必还原（逐字节比对）。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LOCK = join(ROOT, '.scratch', 'locks', 'gate.lock');
const TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 'output-naming-87.test.mjs');
const OUT_MD = join(HERE, 't87-mutation-evidence.md');

const OUTPUT_TS = join(ROOT, 'packages', 'skill-calorie', 'src', 'output.ts');
const CMD_READ_TS = join(ROOT, 'packages', 'skill-calorie', 'src', 'cli', 'cmd_read.ts');

const MUTATIONS = [
  {
    id: 'M1 同秒冲突计数改成「不加 1」',
    file: OUTPUT_TS,
    from: "    : command + '_' + stamp + '_' + String(n + 1) + HTML_EXT;",
    to: "    : command + '_' + stamp + '_' + String(n) + HTML_EXT;",
    expectFail: '#87 ④',
  },
  {
    id: 'M2 输出目录名 calorie_html → html_out',
    file: OUTPUT_TS,
    from: "export const HTML_DIR_NAME = 'calorie_html';",
    to: "export const HTML_DIR_NAME = 'html_out';",
    expectFail: '#87 ⑤',
  },
  {
    id: 'M3 <中文command> 真值从 title 改成 registry key',
    file: OUTPUT_TS,
    from: '  return sanitizeFilenamePart(hit.title);',
    to: '  return sanitizeFilenamePart(key);',
    expectFail: '#87 ③',
  },
  {
    id: 'M4 时间戳去掉零填充',
    file: OUTPUT_TS,
    from: '  const p = (n: number): string => String(n).padStart(2, \'0\');',
    to: '  const p = (n: number): string => String(n);',
    expectFail: '#87 ②',
  },
  {
    id: 'M5 CLI 默认落点改成固定名（不跟随 SKILLS_DB_PATH）',
    file: CMD_READ_TS,
    from: '      const htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string);',
    to: "      const htmlTarget = o.output ?? o.html ?? resolveExplicitHtmlPath('calorie_html_flat.html');",
    expectFail: '#87 ⑥',
  },
];

function acquireLock() {
  mkdirSync(dirname(LOCK), { recursive: true });
  for (;;) {
    try {
      mkdirSync(LOCK);
      return;
    } catch { /* 已被占 */ }
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > 10 * 60 * 1000) { rmSync(LOCK, { recursive: true, force: true }); continue; }
    } catch { continue; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
}
function releaseLock() { try { rmSync(LOCK, { recursive: true, force: true }); } catch { /* 已释放 */ } }
function touchLock() { try { const now = new Date(); utimesSync(LOCK, now, now); } catch { /* ignore */ } }

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  return { status: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

function failingNames() {
  const r = run('node', ['--test', '--test-reporter=tap', TEST]);
  const names = r.out.split('\n').filter((l) => l.startsWith('not ok ')).map((l) => l.replace(/^not ok \d+ - /, '').trim());
  return { status: r.status, names, out: r.out };
}

const results = [];
const backups = new Map([[OUTPUT_TS, readFileSync(OUTPUT_TS, 'utf8')], [CMD_READ_TS, readFileSync(CMD_READ_TS, 'utf8')]]);
let bad = 0;

acquireLock();
try {
  touchLock();
  const green0 = failingNames();
  if (green0.status !== 0) {
    console.error('FAIL: 变更前本票测试未全绿，变异自证不成立\n' + green0.out.slice(-2000));
    bad++;
  } else {
    console.log('基线：本票测试全绿（' + green0.names.length + ' 条失败）');
  }

  for (const m of MUTATIONS) {
    if (bad > 0) break;
    const original = backups.get(m.file);
    const hits = original.split(m.from).length - 1;
    if (hits !== 1) { console.error('FAIL: ' + m.id + ' 锚点命中 ' + hits + ' 次（须 1）'); bad++; continue; }
    writeFileSync(m.file, original.replace(m.from, m.to), 'utf8');
    touchLock();
    const b = run('pnpm', ['build']);
    if (b.status !== 0) {
      console.error('FAIL: ' + m.id + ' 变异后 build 非 0\n' + b.out.slice(-1500));
      writeFileSync(m.file, original, 'utf8');
      bad++;
      continue;
    }
    const red = failingNames();
    const hit = red.names.some((n) => n.includes(m.expectFail));
    writeFileSync(m.file, original, 'utf8');
    touchLock();
    const b2 = run('pnpm', ['build']);
    const green = failingNames();
    const restored = readFileSync(m.file, 'utf8') === original;
    const ok = red.status !== 0 && hit && b2.status === 0 && green.status === 0 && restored;
    if (!ok) bad++;
    results.push({ ...m, redNames: red.names, redStatus: red.status, hit, greenStatus: green.status, restored, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ': ' + m.id + ' 红=' + red.names.length + ' 命中预期=' + hit + ' 还原=' + restored + ' 复绿=' + (green.status === 0));
  }
} finally {
  for (const [f, txt] of backups) { try { writeFileSync(f, txt, 'utf8'); } catch { /* ignore */ } }
  releaseLock();
}

const lines = [
  '# #87 变异自证（输出命名规范复刻）',
  '',
  '复跑：`node docs/research/t87-mutation-evidence.mjs`（自持 `gate.lock`，finally 释放）。',
  '',
  '口径：每个变异只改**本票独占路径**的一处字符串 → `pnpm build` → `node --test packages/skill-calorie/test/output-naming-87.test.mjs`',
  '→ 断言预期用例出现在 TAP 失败集 → 逐字节还原 → 复跑断言全绿。',
  '',
  '| 变异 | 文件 | 破坏点 | 预期红 | 实际红用例数 | 命中 | 还原 | 复绿 | 结论 |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.id} | \`${r.file.replace(ROOT + '\\', '').replace(/\\/g, '/')}\` | \`${r.from.trim()}\` → \`${r.to.trim()}\` | ${r.expectFail} | ${r.redNames.length} | ${r.hit ? '是' : '否'} | ${r.restored ? '是' : '否'} | ${r.greenStatus === 0 ? '是' : '否'} | ${r.ok ? 'PASS' : 'FAIL'} |`),
  '',
  '## 实际红用例（逐条）',
  '',
  ...results.flatMap((r) => ['### ' + r.id, '', '```', ...r.redNames, '```', '']),
  bad === 0 ? '**总判：PASS（' + results.length + '/' + MUTATIONS.length + ' 变异全部红→绿闭环）**' : '**总判：FAIL（' + bad + ' 处未闭环）**',
  '',
];
writeFileSync(OUT_MD, lines.join('\n'), 'utf8');
console.log('wrote ' + OUT_MD);
process.exit(bad === 0 ? 0 : 1);
