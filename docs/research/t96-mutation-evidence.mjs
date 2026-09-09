#!/usr/bin/env node
/**
 * #96 · 鉴别力自证（受控变异 → 红 → 逐字节还原 → 绿）。
 *
 * 目的：证明新门「其余 5 技能 HTML 不回归门」**真的有鉴别力**，而不是一个恒绿脚本。
 *   · 3 个「快照门」变异（T1／T2／T3）：改 5 技能页面产物 → `pnpm snapshot:html:check` 必须红；
 *     T3 是 **src 级**变异（含重建 dist），证明 src → dist → 产物 整条链被门覆盖；
 *     T2 打的是**影响面断言**（注入 base-paint 命名空间标记 `ilife-`）。
 *   · 2 个「边界门」变异（B1／B2）：改依赖闭包／加 import → `pnpm boundaries` 必须红。
 *   · 每个变异都：记跑前 sha256 → 断言锚点恰命中 1 次 → 变异 → 断言门红且命中预期 → 逐字节还原
 *     → 断言 sha256 与跑前相同 ＋ `git status --porcelain` 干净 → 断言门复绿。
 *
 * **用法（必须经持锁包装器；脚本自证在锁内）**：
 *   node tooling/run-locked.mjs --ticket 96 --run-id <nonce> -- \
 *     node docs/research/t96-mutation-evidence.mjs --expect-run-id <nonce>
 * 脚本会读 `.scratch/locks/owner.json` 并断言 `runId === --expect-run-id`：对不上即 exit ≠ 0
 * （＝变异没有落在持锁区内，本证据不成立）。
 *
 * 纪律：
 *   · 变异目标全部**逐字节还原**（备份 Buffer 回写 ＋ sha256 双证），`finally` 里兜底还原；
 *   · 变异前断言目标文件 `git status --porcelain` 为空（不得覆盖他人在途 WIP）；
 *   · 只写 `.scratch/t96/`（gitignore）下的运行日志；不写任何被跟踪文件。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRATCH = join(ROOT, '.scratch', 't96');
const OWNER = join(ROOT, '.scratch', 'locks', 'owner.json');
const argv = process.argv.slice(2);
const expectRunId = (() => { const i = argv.indexOf('--expect-run-id'); return i >= 0 ? argv[i + 1] : ''; })();

/** 变异清单。expect 为门输出里必须出现的一行子串（＝命中预期的那条断言／那件产物）。 */
const MUTATIONS = [
  {
    id: 'T1', gate: 'snapshot', label: '模板页文本（无重建）',
    file: 'packages/skill-bill/templates/record_today.html',
    from: '<p class="cmd">bill-cmd-read bill.record.today</p>',
    to: '<p class="cmd">bill-cmd-read bill.record.today</p><p data-mut="t96">MUT-T96-T1</p>',
    build: false, expect: 'bill/tpl/record_today',
  },
  {
    id: 'T2', gate: 'snapshot', label: '影响面断言：注入 base-paint 命名空间标记',
    file: 'packages/skill-bill/templates/help.html',
    from: '<!--CONTENT-->',
    to: '<div class="ilife-probe">MUT-T96-T2</div><!--CONTENT-->',
    build: false, expect: 'ilife-',
  },
  {
    id: 'T3', gate: 'snapshot', label: 'src 级变异（空态文案，含 pnpm build 重建 dist）',
    file: 'packages/skill-home/src/render/html.ts',
    from: "'<div class=\"hm-empty\">\u6682\u65e0\u8bb0\u5f55</div>'",
    to: "'<div class=\"hm-empty\" data-mut=\"t96\">\u6682\u65e0\u8bb0\u5f55</div>'",
    build: true, expect: 'home/shape/list-empty',
  },
  {
    id: 'B1', gate: 'boundaries', label: '依赖闭包加入 base-paint',
    file: 'packages/skill-bill/package.json',
    from: '"dependencies": {\n    "base-link-core": "^0.1.0"\n  },',
    to: '"dependencies": {\n    "base-link-core": "^0.1.0",\n    "base-paint": "^0.2.0"\n  },',
    build: false, expect: 'skill-bill 依赖闭包不含 base-*',
  },
  {
    id: 'B2', gate: 'boundaries', label: '源码 import base-paint',
    file: 'packages/skill-bill/src/render/html.ts',
    from: "import { BillRenderError } from './errors.js';",
    to: "import { BillRenderError } from './errors.js';\nimport type { Envelope as BpEnvelope } from 'base-paint';",
    build: false, expect: '不 import base-*',
  },
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  return { status: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
};

// ---------------------------------------------------------------- 锁内自证

mkdirSync(SCRATCH, { recursive: true });
const lines = [];
const say = (s) => { lines.push(s); console.log(s); };

let bad = 0;
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

const backups = new Map();

function restore(file) {
  const abs = join(ROOT, file);
  const buf = backups.get(file);
  if (buf) writeFileSync(abs, buf);
  return sha(readFileSync(abs)) === sha(buf);
}

function porcelain(file) {
  const r = run('git', ['status', '--porcelain', '--', file]);
  return r.out.trim();
}

try {
  // 0. 前置：两个门当前必须绿（否则变异前后无法判别）
  const g0 = run('node', ['tooling/skill-html-snapshot.mjs', '--check']);
  const b0 = run('node', ['tooling/check-boundaries.mjs']);
  if (g0.status !== 0 || b0.status !== 0) {
    say(`FAIL: 变更前门未全绿（snapshot:html=${g0.status} boundaries=${b0.status}）`);
    bad++;
  } else {
    say(`BASELINE: snapshot:html=0 boundaries=0（变异前双绿）`);
  }

  for (const m of MUTATIONS) {
    if (bad) break;
    const abs = join(ROOT, m.file);
    if (!existsSync(abs)) { say(`FAIL: ${m.id} 目标不存在 ${m.file}`); bad++; break; }
    if (porcelain(m.file)) { say(`FAIL: ${m.id} 目标有未提交改动（拒绝覆盖他人在途 WIP）：${m.file}`); bad++; break; }

    const buf = readFileSync(abs);
    backups.set(m.file, buf);
    const shaBefore = sha(buf);
    const text = buf.toString('utf8');
    const hits = text.split(m.from).length - 1;
    if (hits !== 1) { say(`FAIL: ${m.id} 锚点命中 ${hits} 次（须 1）`); bad++; break; }

    // 变异
    writeFileSync(abs, Buffer.from(text.replace(m.from, m.to), 'utf8'));
    let buildOut = 'skip';
    if (m.build) {
      const b = run('pnpm', ['build']);
      buildOut = 'exit=' + b.status;
      if (b.status !== 0) { restore(m.file); say(`FAIL: ${m.id} 变异后 pnpm build 非 0`); bad++; break; }
    }

    // 断言红 ＋ 命中预期
    const g = m.gate === 'snapshot'
      ? run('node', ['tooling/skill-html-snapshot.mjs', '--check'])
      : run('node', ['tooling/check-boundaries.mjs']);
    const hit = g.out.includes(m.expect);
    const red = g.status !== 0;

    // 还原（逐字节）＋ 复绿
    const restoredBytes = restore(m.file);
    const shaAfter = sha(readFileSync(abs));
    let build2Out = 'skip';
    if (m.build) {
      const b2 = run('pnpm', ['build']);
      build2Out = 'exit=' + b2.status;
      if (b2.status !== 0) { say(`FAIL: ${m.id} 还原后 pnpm build 非 0`); bad++; break; }
    }
    const g2 = m.gate === 'snapshot'
      ? run('node', ['tooling/skill-html-snapshot.mjs', '--check'])
      : run('node', ['tooling/check-boundaries.mjs']);
    const green = g2.status === 0;
    const clean = porcelain(m.file) === '';
    const restored = restoredBytes && shaAfter === shaBefore && clean;
    const ok = red && hit && green && restored;
    if (!ok) bad++;
    say(`${ok ? 'PASS' : 'FAIL'} ${m.id} [${m.gate}] ${m.label}`);
    say(`      file=${m.file} sha256(16)=${shaBefore}→${shaAfter} restored=${restored}(bytes+sha+porcelain) build=${buildOut}/${build2Out}`);
    say(`      red=${red} hit_expected=${hit}("${m.expect}") green_after_restore=${green}`);
    if (!ok) say('      门输出尾部：' + g.out.trim().split('\n').slice(-6).join(' | '));
  }
} finally {
  // 兜底还原：任何异常路径都不得把变异留在工作区
  for (const [file] of backups) {
    try {
      const abs = join(ROOT, file);
      const want = backups.get(file);
      if (sha(readFileSync(abs)) !== sha(want)) { writeFileSync(abs, want); say(`RESTORE-FALLBACK: ${file}`); }
    } catch { /* ignore */ }
  }
}

// 收尾：变异目标全部干净 ＋ 门全绿
const strays = MUTATIONS.filter((m) => existsSync(join(ROOT, m.file)) && porcelain(m.file) !== '').map((m) => m.file);
if (strays.length) { say('FAIL: 残留改动 ' + strays.join(', ')); bad++; }
const gEnd = run('node', ['tooling/skill-html-snapshot.mjs', '--check']);
const bEnd = run('node', ['tooling/check-boundaries.mjs']);
if (gEnd.status !== 0 || bEnd.status !== 0) { say(`FAIL: 收尾门未全绿（${gEnd.status}/${bEnd.status}）`); bad++; }

const restoredCount = backups.size;
say(`RESULT: mutations=${MUTATIONS.length} bad=${bad} restored_targets=${restoredCount} snapshot:html=${gEnd.status} boundaries=${bEnd.status}`);
writeFileSync(join(SCRATCH, 'mutation-evidence.log'), lines.join('\n') + '\n', 'utf8');
process.exit(bad ? 1 : 0);
