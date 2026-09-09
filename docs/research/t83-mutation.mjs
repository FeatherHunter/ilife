/** #83 · 变异自证（src 级，单锁内「变异 → 重建 → 红 → 立即还原 → 重建 → 绿」＋ sha256）。
 *
 * 运行（协议 §2.4：持锁包装器，全程单锁）：
 *   node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-mutation.mjs
 * 变异点（均在本票新增逻辑上）：
 *   M1 `output.ts:deliverHtml`  只读类写失败回退 inline 被摘掉 → 内联态必红
 *   M2 `cmd_read.ts:buildDeliveredEnvelope` 交付信号注入被摘掉 → delivery 断言必红
 * 判据：变异轮 `node --test packages/skill-calorie/test/delivery-83.test.mjs` exit ≠ 0；
 *       还原后 sha256 与变异前**逐字节相同**，重建后同一测试 exit 0。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHELL = process.platform === 'win32';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();
const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: SHELL });
const countOf = (out, name) => {
  const m = new RegExp('^\\s*[ℹ#]\\s*' + name + ' (\\d+)', 'm').exec(String(out));
  return m ? m[1] : '?';
};

const MUTATIONS = [
  {
    id: 'M1',
    file: 'packages/skill-calorie/src/output.ts',
    find: "    if (isReadOnlyWriteFailure(e)) return { mode: 'inline', reason: (e as Error).message, bytes };\n    throw e;",
    replace: '    throw e;',
    why: '摘掉只读/沙箱回退（② 内联态）',
  },
  {
    id: 'M2',
    file: 'packages/skill-calorie/src/cli/cmd_read.ts',
    find: '  return withDelivery(buildEnvelope(key, shape, data), buildDelivery({\n'
      + "    mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape, html, bytes: d.bytes,\n  }));",
    replace: '  return buildEnvelope(key, shape, data);',
    why: '摘掉 delivery 注入（交付信号）',
  },
];

let ok = 0;
let bad = 0;
const verdict = (cond, line) => { if (cond) { ok += 1; console.log('PASS ' + line); } else { bad += 1; console.log('FAIL ' + line); } };

const build = () => run('pnpm', ['build']);
const test = () => run('node', ['--test', 'packages/skill-calorie/test/delivery-83.test.mjs']);

for (const m of MUTATIONS) {
  const path = join(ROOT, m.file);
  const original = readFileSync(path, 'utf8');
  const before = sha(path);
  if (!original.includes(m.find)) { verdict(false, m.id + ' 变异锚点未命中：' + m.file); continue; }
  try {
    writeFileSync(path, original.replace(m.find, m.replace), 'utf8');
    const b = build();
    verdict(b.status === 0, m.id + ' 变异后重建 exit=' + b.status);
    const red = test();
    verdict(red.status !== 0, m.id + ' 变异轮测试红（' + m.why + '）exit=' + red.status
      + ' fail=' + countOf(red.stdout, 'fail'));
  } finally {
    writeFileSync(path, original, 'utf8');
  }
  const after = sha(path);
  verdict(after === before, m.id + ' 还原逐字节自证 sha256 ' + before + ' → ' + after);
  const b2 = build();
  verdict(b2.status === 0, m.id + ' 还原后重建 exit=' + b2.status);
  const green = test();
  verdict(green.status === 0, m.id + ' 还原后测试绿 exit=' + green.status
    + ' pass=' + countOf(green.stdout, 'pass'));
}

console.log('RESULT-MUT: ' + ok + '/' + (ok + bad) + (bad === 0 ? ' PASS' : ' FAIL'));
process.exit(bad === 0 ? 0 : 1);
