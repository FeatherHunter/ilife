#!/usr/bin/env node
/** #87 变异自证（可复跑）：故意破坏命名逻辑 → 对应测试变红 → 逐字节还原 → 复绿。
 *
 * 用法：`node docs/research/t87-mutation-evidence.mjs`
 *   - 自持 `D:\ilife\.scratch\locks\gate.lock`（协议 §2：build / node --test 必须持锁），finally 必释放；
 *   - 每个变异：记 sha256 → 改一处字符串 → `pnpm build` → `node --test test/output-naming-87.test.mjs`
 *     → 断言「预期用例名」出现在失败集里 → 逐字节还原 → 复跑断言全绿 → 断言还原后 sha256 不变；
 *   - **输出写 `.scratch/t87/`（施工草稿，gitignore），不覆写被跟踪的 `docs/research/t87-mutation-evidence.md`**
 *     —— 否则每次复跑都会把工作树弄脏（返修 F7 修的正是这个）；
 *   - 变异 M5 的「固定落点名」落在**本脚本独占的临时根**（票号 + 随机后缀）内，跑完按路径守卫删除，
 *     不在仓库根遗留 `calorie_html_flat.html`（返修 F7）；收尾再自证仓库根无该残留。
 *   - 退出码非 0 即自证失败。
 *
 * 纪律：只改本票独占路径（`src/output.ts`／`src/cli/cmd_read.ts`），改完必还原（逐字节 ＋ sha256 双证）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LOCK = join(ROOT, '.scratch', 'locks', 'gate.lock');
const TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 'output-naming-87.test.mjs');
const SCRATCH = join(ROOT, '.scratch', 't87');

const OUTPUT_TS = join(ROOT, 'packages', 'skill-calorie', 'src', 'output.ts');
const CMD_READ_TS = join(ROOT, 'packages', 'skill-calorie', 'src', 'cli', 'cmd_read.ts');

/** 独占临时根（票号 + 随机后缀，协议 §2.1-4）：M5 的固定落点名落在这里，不落仓库。 */
const TMP_ROOT = mkdtempSync(join(tmpdir(), 't87-mutation-'));
const FLAT_PATH = join(TMP_ROOT, 'calorie_html_flat.html');
const FLAT_LITERAL = FLAT_PATH.replace(/\\/g, '/');

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
    id: 'M5 CLI 默认落点改成固定名（不跟随 SKILLS_DB_PATH；落在独占临时根内）',
    file: CMD_READ_TS,
    from: '        htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string);',
    to: "        htmlTarget = o.output ?? o.html ?? resolveExplicitHtmlPath('" + FLAT_LITERAL + "');",
    expectFail: '#87 ⑥',
  },
  {
    id: 'M6 截断改回按 UTF-16 码元（返修 F1）',
    file: OUTPUT_TS,
    from: '  return [...s].slice(0, 32).join(\'\');',
    to: '  return s.slice(0, 32);',
    expectFail: '#87 ①b',
  },
  {
    id: 'M7 同秒计数改回大小写敏感（返修 F2）',
    file: OUTPUT_TS,
    from: [
      "  const prefix = (command + '_' + stamp).toLowerCase();",
      '  const ext = HTML_EXT.toLowerCase();',
      '  return names.filter((n) => {',
      '    const lower = n.toLowerCase();',
      '    return lower.startsWith(prefix) && lower.endsWith(ext);',
      '  }).length;',
    ].join('\n'),
    to: [
      "  const prefix = command + '_' + stamp;",
      '  const ext = HTML_EXT;',
      '  return names.filter((n) => {',
      '    const lower = n;',
      '    return lower.startsWith(prefix) && lower.endsWith(ext);',
      '  }).length;',
    ].join('\n'),
    expectFail: '#87 ④b',
  },
  {
    id: 'M8 落点解析失败不包渲染失败（返修 F4，退回「未知失败」exit 4）',
    file: CMD_READ_TS,
    from: [
      '      let htmlTarget: string;',
      '      try {',
      '        htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string);',
      '      } catch (e) {',
      "        fail(5, '渲染失败：HTML 落点解析失败（' + (o.output ?? o.html ?? '默认目录 <SKILLS_DB_PATH>/' + HTML_DIR_NAME)",
      "          + '）：' + (e as Error).message);",
      '      }',
    ].join('\n'),
    to: '      const htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string);',
    expectFail: '#87 ⑨',
  },
];

/** 路径守卫（协议 §2.1-3）：递归删除前断言目标在本次独占临时根之下（或即该根）。 */
function guardedRm(p) {
  const abs = resolve(p);
  const root = resolve(TMP_ROOT);
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error('路径守卫失败，拒绝删除：' + abs);
  rmSync(abs, { recursive: true, force: true });
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);
}

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

/** 取某条失败用例的 TAP 诊断（断言消息），用于记录「破坏后实测行为」。 */
function diagFor(out, name) {
  const lines = out.split('\n');
  const i = lines.findIndex((l) => l.startsWith('not ok ') && l.includes(name));
  if (i < 0) return '';
  const block = [];
  for (let j = i + 1; j < lines.length && !/^(not ok|ok|# )/.test(lines[j]); j++) block.push(lines[j]);
  const msg = block.filter((l) => /error:|expected|actual|须|不得/.test(l)).map((l) => l.trim()).filter(Boolean);
  return (msg.join(' | ') || block.join(' ')).replace(/\s+/g, ' ').slice(0, 300);
}

const results = [];
const files = [OUTPUT_TS, CMD_READ_TS];
const backups = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const shaBefore = new Map(files.map((f) => [f, sha256(f)]));
let bad = 0;

mkdirSync(SCRATCH, { recursive: true });
acquireLock();
try {
  touchLock();
  const green0 = failingNames();
  if (green0.status !== 0) {
    console.error('FAIL: 变更前本票测试未全绿，变异自证不成立\n' + green0.out.slice(-2000));
    bad++;
  } else {
    console.log('基线：本票测试全绿（' + green0.names.length + ' 条失败）；sha256 ' +
      files.map((f) => f.split(sep).pop() + '=' + shaBefore.get(f)).join(' '));
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
    const diag = diagFor(red.out, m.expectFail);
    writeFileSync(m.file, original, 'utf8');
    touchLock();
    const b2 = run('pnpm', ['build']);
    const green = failingNames();
    const restoredBytes = readFileSync(m.file, 'utf8') === original;
    const shaAfter = sha256(m.file);
    const restored = restoredBytes && shaAfter === shaBefore.get(m.file);
    const ok = red.status !== 0 && hit && b2.status === 0 && green.status === 0 && restored;
    if (!ok) bad++;
    results.push({ ...m, redNames: red.names, redStatus: red.status, hit, diag, greenStatus: green.status, restored, shaAfter, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ': ' + m.id + ' 红=' + red.names.length + ' 命中预期=' + hit +
      ' 还原(字节+sha)=' + restored + ' 复绿=' + (green.status === 0));
  }
} finally {
  for (const [f, txt] of backups) { try { writeFileSync(f, txt, 'utf8'); } catch { /* ignore */ } }
  releaseLock();
}

// 收尾自证：仓库根不得有 M5 的残留（返修 F7）
const stray = join(ROOT, 'calorie_html_flat.html');
const strayExists = existsSync(stray);
if (strayExists) { console.error('FAIL: 仓库根残留 ' + stray); bad++; }
guardedRm(TMP_ROOT);

const rel = (f) => f.replace(ROOT + sep, '').replace(/\\/g, '/');
const lines = [
  '# #87 变异自证（输出命名规范复刻 · 返修轮）',
  '',
  '复跑：`node docs/research/t87-mutation-evidence.mjs`（自持 `gate.lock`，finally 释放）。',
  '**本文件由脚本写到 `.scratch/t87/`（施工草稿，gitignore），不覆写被跟踪的 `docs/research/t87-mutation-evidence.md`**（返修 F7）。',
  '',
  '口径：每个变异只改**本票独占路径**的一处字符串 → `pnpm build` → `node --test packages/skill-calorie/test/output-naming-87.test.mjs`',
  '→ 断言预期用例出现在 TAP 失败集 → 逐字节还原 → 复跑断言全绿 → 断言还原后 sha256 与跑前相同。',
  '',
  '| 变异 | 文件 | 破坏点 | 预期红 | 实际红用例数 | 命中 | 还原(字节+sha256) | 复绿 | 结论 |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.id} | \`${rel(r.file)}\` | \`${r.from.trim().replace(/\n/g, ' ')}\` → \`${r.to.trim().replace(/\n/g, ' ')}\` | ${r.expectFail} | ${r.redNames.length} | ${r.hit ? '是' : '否'} | ${r.restored ? '是' : '否'} | ${r.greenStatus === 0 ? '是' : '否'} | ${r.ok ? 'PASS' : 'FAIL'} |`),
  '',
  '## 还原自证（sha256 前 16 位）',
  '',
  '| 文件 | 跑前 sha256 | 跑后 sha256 | 相同 |',
  '| --- | --- | --- | --- |',
  ...files.map((f) => `| \`${rel(f)}\` | \`${shaBefore.get(f)}\` | \`${sha256(f)}\` | ${shaBefore.get(f) === sha256(f) ? '是' : '否'} |`),
  '',
  '## 实际红用例 ＋ 破坏后实测诊断（逐条）',
  '',
  ...results.flatMap((r) => ['### ' + r.id, '', '```', ...r.redNames, '```', '', r.diag ? '破坏后诊断：`' + r.diag + '`' : '', '']),
  '## 工作区残留自证',
  '',
  '- 仓库根 `calorie_html_flat.html` 残留：**' + (strayExists ? '有（FAIL）' : '无') + '**',
  '- 变异用独占临时根（跑完按路径守卫删除）：`' + TMP_ROOT + '`',
  '',
  bad === 0 ? '**总判：PASS（' + results.length + '/' + MUTATIONS.length + ' 变异全部红→绿闭环）**' : '**总判：FAIL（' + bad + ' 处未闭环）**',
  '',
];
const outMd = join(SCRATCH, 'mutation-evidence-' + Date.now() + '.md');
writeFileSync(outMd, lines.join('\n'), 'utf8');
console.log('wrote ' + outMd);
process.exit(bad === 0 ? 0 : 1);
