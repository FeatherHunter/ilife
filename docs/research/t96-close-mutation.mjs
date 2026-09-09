#!/usr/bin/env node
/**
 * #96 收尾 · R-S3-1 修复的变异自证（**src 级**）。
 *
 * 被证命题：`tooling/skill-html-snapshot.mjs` 的 `--write` 是**先校验后落盘**——
 * 影响面标记命中时 exit 1 且**受跟踪快照逐字节不变**（红队 R-S3-1）。
 *
 * 变异：把 `compare` 的标记判定**挪回落盘之后**（即复现修复前的缺陷顺序）。
 * 期望：`tooling/test/skill-html-snapshot.test.mjs` 的用例
 *       「--write 先校验后落盘：标记命中时快照文件 sha256 不变（R-S3-1）」**变红**。
 * 随后逐字节还原 → sha256 与跑前相同 → 复跑自证**复绿**。
 *
 * 说明：变异目标是 `.mjs` 工具源码，**无编译产物**，故不涉及 `pnpm build`（`dist/` 级例外不适用）。
 *
 * **用法（必须经持锁包装器；脚本自证在锁内）**：
 *   node tooling/run-locked.mjs --ticket 96 --run-id <nonce> -- \
 *     node docs/research/t96-close-mutation.mjs --expect-run-id <nonce>
 * 读 `.scratch/locks/owner.json` 断言 `runId === --expect-run-id`：对不上即 exit ≠ 0。
 *
 * 纪律：只改本票路径内的 `tooling/skill-html-snapshot.mjs`；逐字节还原 ＋ sha256 双证 ＋
 * `finally` 兜底还原；日志只写 gitignored 的 `.scratch/t96/`。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRATCH = join(ROOT, '.scratch', 't96');
const OWNER = join(ROOT, '.scratch', 'locks', 'owner.json');
const TARGET = 'tooling/skill-html-snapshot.mjs';
const TEST = 'tooling/test/skill-html-snapshot.test.mjs';

const argv = process.argv.slice(2);
const expectRunId = (() => { const i = argv.indexOf('--expect-run-id'); return i >= 0 ? argv[i + 1] : ''; })();

/** 变异：把标记判定从「落盘前」挪到「落盘后」（＝修复前顺序）。 */
const A = '  if (cmp.markers.length) return { written: false, markers: cmp.markers, snap };\n';
const B = '  return { written: true, markers: [], snap };\n';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  return { status: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
};
const tail = (s, n = 6) => s.trim().split('\n').slice(-n).join(' | ');

mkdirSync(SCRATCH, { recursive: true });
const lines = [];
const say = (s) => { lines.push(s); console.log(s); };
let bad = 0;

// ---------------------------------------------------------------- 锁内自证
if (!existsSync(OWNER)) {
  console.error('FAIL: 未发现 .scratch/locks/owner.json —— 本脚本必须经持锁包装器运行（见文件头用法）');
  process.exit(2);
}
const owner = JSON.parse(readFileSync(OWNER, 'utf8'));
if (!expectRunId || owner.runId !== expectRunId) {
  console.error(`FAIL: 锁归属自证不通过（owner.runId=${owner.runId} expect=${expectRunId}）——变异未落在持锁区内`);
  process.exit(2);
}
say(`LOCK-SELF-CHECK: runId=${owner.runId} ticket=${owner.ticket} pid=${owner.pid} cmd=${owner.cmd} → OK`);

const abs = join(ROOT, TARGET);
const backup = readFileSync(abs);
const shaBefore = sha(backup);
let restoredOk = false;

function restore() {
  writeFileSync(abs, backup);
  return sha(readFileSync(abs)) === shaBefore;
}
function porcelain() {
  return run('git', ['status', '--porcelain', '--', TARGET]).out.trim();
}

try {
  // 0. 前置：变异前自证必须绿（否则红/绿无法判别）
  const g0 = run('node', ['--test', TEST]);
  if (g0.status !== 0 || !/fail 0/.test(g0.out)) {
    say(`FAIL: 变异前自证未全绿（exit=${g0.status}）`); bad++;
  } else {
    say('BASELINE: node --test tooling/test/skill-html-snapshot.test.mjs → exit=0 fail 0');
  }
  if (porcelain()) { say(`FAIL: 变异目标有未提交改动（拒绝覆盖）：${TARGET}`); bad++; }

  if (!bad) {
    const text = backup.toString('utf8');
    const hitsA = text.split(A).length - 1;
    const hitsB = text.split(B).length - 1;
    if (hitsA !== 1 || hitsB !== 1) {
      say(`FAIL: 锚点命中 A=${hitsA} B=${hitsB}（各须 1）`); bad++;
    } else {
      const mutated = text.replace(A, '').replace(B, A + B);
      writeFileSync(abs, Buffer.from(mutated, 'utf8'));
      say(`MUTATION: ${TARGET} 标记判定「落盘前 → 落盘后」（复现修复前顺序）`);

      const gRed = run('node', ['--test', TEST]);
      const red = gRed.status !== 0 && /fail [1-9]/.test(gRed.out);
      const hitTest = gRed.out.includes('先校验后落盘');
      say(`RED: exit=${gRed.status} fail>0=${red} 命中用例=${hitTest}`);

      // 还原（逐字节）＋ 复绿
      const restored = restore();
      restoredOk = restored;
      const shaAfter = sha(readFileSync(abs));
      const clean = porcelain() === '';
      const gGreen = run('node', ['--test', TEST]);
      const green = gGreen.status === 0 && /fail 0/.test(gGreen.out);

      const ok = red && hitTest && restored && shaAfter === shaBefore && clean && green;
      if (!ok) { bad++; say('  变异轮输出尾部：' + tail(gRed.out)); }
      say(`${ok ? 'PASS' : 'FAIL'} R-S3-1 [src] ${TARGET} sha256=${shaBefore.slice(0, 16)}→${shaAfter.slice(0, 16)} restored=${restored} porcelain_clean=${clean} green=${green}`);
    }
  }
} finally {
  if (sha(readFileSync(abs)) !== shaBefore) { restore(); say('RESTORE-FALLBACK: ' + TARGET); }
}

// 收尾：目标干净 ＋ 自证绿
if (porcelain()) { say(`FAIL: 残留改动 ${TARGET}`); bad++; }
const gEnd = run('node', ['--test', TEST]);
if (gEnd.status !== 0) { say('FAIL: 收尾自证未绿：' + tail(gEnd.out)); bad++; }

const shaEnd = sha(readFileSync(abs));
const restoredFinal = restoredOk && shaEnd === shaBefore && porcelain() === '';
say(`RESULT: mutations=1 bad=${bad} red_then_green=${bad ? 0 : 1} restored=${restoredFinal ? 1 : 0} sha256_16=${shaEnd.slice(0, 16)} selftest_exit=${gEnd.status}`);
writeFileSync(join(SCRATCH, 'rs3-1-mutation.log'), lines.join('\n') + '\n', 'utf8');
process.exit(bad ? 1 : 0);
