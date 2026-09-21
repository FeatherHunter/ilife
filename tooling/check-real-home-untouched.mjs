#!/usr/bin/env node
/**
 * tooling/check-real-home-untouched.mjs —— 「跑测试没写真实 `~/.ilife`」这道判据的机器面（票 #763）。
 *
 * 它守的是**目的**：一次全量测试跑完，真实 `~/.ilife` 的树（路径 ＋ 大小 ＋ mtime）逐字不变。
 * `ILIFE_CONFIG_DIR` 退役之后，测试隔离改走「把子进程的家目录指到临时目录」，
 * 「不写真实数据」不再有生产期守卫可守（那道守卫只能被已退役的变量满足）——这道门就是它的替代品。
 *
 * 用法：
 *   node tooling/check-real-home-untouched.mjs --write <文件>      只落一份基线快照（不动测试）
 *   node tooling/check-real-home-untouched.mjs --compare <文件>    拿当刻真实树与基线比（不跑测试）
 *   node tooling/check-real-home-untouched.mjs --run [选项] [-- 命令…]
 *       快照 → 跑命令 → 再快照 → 比对。不给命令即跑本件内置的全量测试表（与 `package.json` 的
 *       `test` 脚本同一份 glob，`SUITE_GLOBS`）。
 *   node tooling/check-real-home-untouched.mjs --selftest
 *       自证：在一次性沙盒里造一棵假「真实配置目录」，跑三种情形（零写⇒绿／新增件⇒红／
 *       改内容⇒红），逐条核对判据真的会红会绿。**证明这道门不是摆设**。
 *
 * 选项：
 *   --baseline <文件>   `--run` 的改动前快照落点（缺省 `.scratch/t763/real-home-before.snapshot`）
 *   --after <文件>      `--run` 的改动后快照落点（缺省 `.scratch/t763/real-home-after.snapshot`）
 *   --timeout-ms <n>    子命令超时（毫秒，缺省 3600000＝60 分钟）→ 超时杀树并 exit 124
 *   --home <目录>       把「家目录」指到别处（**只给自证与变异用**；生产判据一律走真实家目录）
 *
 * 读数（逐行，机读）：
 *   REAL-HOME dir=<真实家目录> config-dir=<真实 ~/.ilife>
 *   SNAPSHOT label=before|after n=<件数> files=<n> dirs=<n> bytes=<n> sha=<16 位>
 *   RUN cmd=<命令> exit=<n> ms=<n>
 *   DIFF added=|removed=|changed=<件>          —— 只在有差异时逐条打
 *   RESULT: PASS|FAIL …                        —— 末行结账（PASS 时给指纹，FAIL 时给原因）
 * 退出码：0＝快照逐字相同且（跑了命令时）命令 exit 0；1＝快照有差异或命令失败；2＝用法／守卫失败。
 *
 * 纪律：本件是**门禁**，不是测试件（不在 `test/*.test.mjs` 的 glob 内）；
 * 全量测试经 `node tooling/run-locked.mjs --ticket <票号> -- node tooling/check-real-home-untouched.mjs --run`
 * 排队跑。
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_DIR_NAME, diffSnapshots, realConfigDir, realHomeDir, serializeSnapshot, snapshotFingerprint, snapshotTree,
} from '../test/helpers/real-home-snapshot.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_REL = 'tooling/check-real-home-untouched.mjs';

/** 全量测试表：与 `package.json` 的 `test` 脚本逐字同一份 glob（改这里＝改本门的判据面）。 */
export const SUITE_GLOBS = [
  'test/*.test.mjs',
  'packages/base-render/test/*.test.mjs',
  'packages/skill-calorie/test/*.test.mjs',
  'packages/skill-memo-ilife/test/*.test.mjs',
  'packages/skill-schedule/test/*.test.mjs',
  'packages/skill-home/test/*.test.mjs',
  'packages/skill-bill/test/*.test.mjs',
  'packages/skill-chef/test/*.test.mjs',
  'packages/plugin-manager/test/*.test.mjs',
  'packages/plugin-calorie/test/*.test.mjs',
  'packages/plugin-memo-ilife/test/*.test.mjs',
  'packages/plugin-schedule-ilife/test/*.test.mjs',
  'packages/plugin-home-ilife/test/*.test.mjs',
  'packages/plugin-chef/test/*.test.mjs',
  'packages/plugin-bill-ilife/test/*.test.mjs',
];

const DEFAULT_BASELINE = '.scratch/t763/real-home-before.snapshot';
const DEFAULT_AFTER = '.scratch/t763/real-home-after.snapshot';

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : SCRIPT_REL;
}

function parseArgs(argv) {
  const opts = { mode: '', file: '', baseline: DEFAULT_BASELINE, after: DEFAULT_AFTER, timeoutMs: 3600000, home: '', selftest: false, command: [], help: false };
  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') { i++; break; }
    if (arg === '--help' || arg === '-h') { opts.help = true; return opts; }
    if (arg === '--selftest') { opts.selftest = true; continue; }
    if (arg === '--write' || arg === '--compare') {
      opts.mode = arg === '--write' ? 'write' : 'compare';
      const value = argv[++i];
      if (value === undefined) throw new Error(arg + ' 缺少取值（快照文件路径）');
      opts.file = value;
      continue;
    }
    if (arg === '--run') { opts.mode = 'run'; continue; }
    if (arg === '--baseline' || arg === '--after' || arg === '--timeout-ms' || arg === '--home') {
      const value = argv[++i];
      if (value === undefined) throw new Error(arg + ' 缺少取值');
      if (arg === '--baseline') opts.baseline = value;
      else if (arg === '--after') opts.after = value;
      else if (arg === '--home') opts.home = value;
      else opts.timeoutMs = Number(value);
      continue;
    }
    throw new Error('未知选项：' + arg);
  }
  opts.command = argv.slice(i);
  if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs < 0) throw new Error('--timeout-ms 必须是非负数字');
  if (!opts.selftest && opts.mode === '') throw new Error('必须给一个模式：--write <文件> / --compare <文件> / --run / --selftest');
  if (opts.command.length > 0 && opts.mode !== 'run') throw new Error('只有 --run 能带命令');
  if (opts.home !== '' && opts.selftest) throw new Error('--home 与 --selftest 互斥');
  return opts;
}

/** 机读字段值：含空白或引号时用 JSON 双引号包裹（与 tooling/run-locked.mjs 同形）。 */
const fieldValue = (value) => (/[\s"]/.test(String(value ?? '')) ? JSON.stringify(String(value ?? '')) : String(value ?? ''));
const short = (sha) => (sha ? sha.slice(0, 16) : '无');

function writeSnapshot(file, label, configRoot) {
  const snap = snapshotTree(configRoot);
  const fp = snapshotFingerprint(snap);
  const abs = path.resolve(REPO_ROOT, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, serializeSnapshot(snap), 'utf8');
  console.log('SNAPSHOT label=' + label + ' file=' + fieldValue(file)
    + ' n=' + fp.n + ' files=' + fp.files + ' dirs=' + fp.dirs + ' bytes=' + fp.bytes + ' sha=' + short(fp.sha));
  return { snap, fp };
}

function readSnapshot(file) {
  const abs = path.resolve(REPO_ROOT, file);
  const text = fs.readFileSync(abs, 'utf8');
  const lines = text.split('\n').filter((l) => l !== '');
  const root = String(lines.shift() ?? '').replace(/^root\t/, '');
  const entries = lines.map((l) => {
    const [kind, rel, size, mtimeMs, sha] = l.split('\t');
    return { kind, rel, size: Number(size), mtimeMs: Number(mtimeMs), sha: sha ?? '' };
  });
  return { root, entries };
}

/** 跑子命令（进程树可杀）；返回 `{ exit, ms, timedOut }`。 */
function runCommand(command, timeoutMs, env = process.env) {
  const line = command.map((a) => (/[\s"&|<>^]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a)).join(' ');
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(line, { cwd: REPO_ROOT, stdio: 'inherit', shell: true, env });
    let timedOut = false;
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        console.error('TIMEOUT: 子命令超时（--timeout-ms=' + timeoutMs + '）→ 终止进程树');
        if (process.platform === 'win32') {
          try {
            spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
          } catch { /* 兜底 kill */ }
        }
        try { child.kill('SIGKILL'); } catch { /* 已退出 */ }
      }, timeoutMs);
    }
    child.on('error', () => {
      if (timer) clearTimeout(timer);
      resolve({ exit: 127, ms: Date.now() - started, timedOut });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ exit: timedOut ? 124 : (code === null ? 1 : code), ms: Date.now() - started, timedOut });
    });
  });
}

/**
 * 自证（`--selftest`）：在一次性沙盒里造一棵假「真实配置目录」，三种情形各跑一次本件自己，
 * 逐条核对判据真的会红会绿——**证明这道门不是摆设**（本仓门禁的惯例：自证与门同住）。
 */
async function selftest() {
  const sandbox = fs.mkdtempSync(path.join(tmpdir(), 't763-selftest-'));
  const fakeHome = path.join(sandbox, 'home');
  const cfgDir = path.join(fakeHome, CONFIG_DIR_NAME);
  fs.mkdirSync(path.join(cfgDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(cfgDir, 'keep.txt'), 'A', 'utf8');
  fs.writeFileSync(path.join(cfgDir, 'data', 'db.bin'), 'D', 'utf8');

  const probes = {
    零写: 'process.exit(0);\n',
    新增件: "import fs from 'node:fs';import {join} from 'node:path';fs.writeFileSync(join(process.env.ILIFE_T763_CONFIG_ROOT,'probe-new.txt'),'x');\n",
    改内容: "import fs from 'node:fs';import {join} from 'node:path';fs.writeFileSync(join(process.env.ILIFE_T763_CONFIG_ROOT,'keep.txt'),'B');\n",
  };
  const cases = [
    { name: '零写', expectExit: 0, expectIn: 'RESULT: PASS' },
    { name: '新增件', expectExit: 1, expectIn: 'DIFF added=' },
    { name: '改内容', expectExit: 1, expectIn: 'DIFF changed=' },
  ];
  let failed = 0;
  for (const [i, c] of cases.entries()) {
    const probe = path.join(sandbox, 'probe-' + i + '.mjs');
    fs.writeFileSync(probe, probes[c.name], 'utf8');
    const r = spawnSync(process.execPath, [
      fileURLToPath(import.meta.url), '--home', fakeHome, '--run',
      '--baseline', path.join(sandbox, 'before-' + i + '.snapshot'),
      '--after', path.join(sandbox, 'after-' + i + '.snapshot'),
      '--', process.execPath, probe,
    ], { encoding: 'utf8', env: { ...process.env } });
    const out = String(r.stdout ?? '');
    const ok = r.status === c.expectExit && out.includes(c.expectIn);
    if (!ok) failed += 1;
    console.log('SELFTEST ' + (ok ? 'PASS' : 'FAIL') + ' 情形=' + c.name
      + ' 期望exit=' + c.expectExit + ' 实测exit=' + r.status + ' 命中=' + fieldValue(c.expectIn)
      + (ok ? '' : ' 输出尾=' + JSON.stringify(out.slice(-400))));
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
  if (failed === 0) {
    console.log('RESULT: PASS 门禁自证 3/3（零写⇒绿／新增件⇒红／改内容⇒红）');
    return 0;
  }
  console.log('RESULT: FAIL 门禁自证 ' + (cases.length - failed) + '/' + cases.length);
  return 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }
  if (opts.selftest) return await selftest();
  const home = realHomeDir();
  const config = realConfigDir();
  const configRoot = opts.home === '' ? config.dir : path.join(path.resolve(opts.home), CONFIG_DIR_NAME);
  console.log('REAL-HOME dir=' + fieldValue(home.dir) + ' source=' + fieldValue(home.source)
    + ' config-dir=' + fieldValue(configRoot) + (opts.home === '' ? '' : ' （--home 覆盖，仅自证/变异用）'));

  if (opts.mode === 'write') {
    const { fp } = writeSnapshot(opts.file, 'baseline', configRoot);
    console.log('RESULT: PASS 基线快照已落盘 n=' + fp.n + ' sha=' + short(fp.sha));
    return 0;
  }

  if (opts.mode === 'compare') {
    const before = readSnapshot(opts.file);
    const after = snapshotTree(configRoot);
    const diff = diffSnapshots(before, after);
    for (const line of diff.added) console.log('DIFF added=' + fieldValue(line));
    for (const line of diff.removed) console.log('DIFF removed=' + fieldValue(line));
    for (const line of diff.changed) console.log('DIFF changed=' + fieldValue(line));
    const fp = snapshotFingerprint(after);
    if (diff.same) {
      console.log('RESULT: PASS 与 ' + fieldValue(opts.file) + ' 逐字相同 n=' + fp.n + ' sha=' + short(fp.sha));
      return 0;
    }
    console.log('RESULT: FAIL 与 ' + fieldValue(opts.file) + ' 不一致 新增=' + diff.added.length
      + ' 删除=' + diff.removed.length + ' 改动=' + diff.changed.length + ' sha=' + short(fp.sha));
    return 1;
  }

  // --run：快照 → 跑命令 → 再快照 → 比对
  const before = writeSnapshot(opts.baseline, 'before', configRoot);
  const command = opts.command.length > 0 ? opts.command : [process.execPath, '--test', ...SUITE_GLOBS];
  const run = await runCommand(command, opts.timeoutMs, { ...process.env, ILIFE_T763_CONFIG_ROOT: configRoot });
  console.log('RUN cmd=' + fieldValue(command.join(' ')) + ' exit=' + run.exit + ' ms=' + run.ms + (run.timedOut ? ' timeout=1' : ''));
  const after = writeSnapshot(opts.after, 'after', configRoot);

  const diff = diffSnapshots(before.snap, after.snap);
  for (const line of diff.added) console.log('DIFF added=' + fieldValue(line));
  for (const line of diff.removed) console.log('DIFF removed=' + fieldValue(line));
  for (const line of diff.changed) console.log('DIFF changed=' + fieldValue(line));

  const fingerprint = before.fp.sha === after.fp.sha ? short(after.fp.sha) : short(before.fp.sha) + '→' + short(after.fp.sha);
  if (diff.same && run.exit === 0) {
    console.log('RESULT: PASS 快照逐字相同且命令 exit 0 n=' + after.fp.n + ' sha=' + fingerprint);
    return 0;
  }
  if (!diff.same) {
    console.log('RESULT: FAIL 真实配置目录被动过 新增=' + diff.added.length + ' 删除=' + diff.removed.length
      + ' 改动=' + diff.changed.length + ' sha=' + fingerprint + (run.exit === 0 ? '' : ' 命令exit=' + run.exit));
    return 1;
  }
  console.log('RESULT: FAIL 快照逐字相同但命令未过 exit=' + run.exit + ' sha=' + fingerprint);
  return 1;
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error('FAIL: ' + (err?.message ?? err));
  process.exitCode = 2;
}
