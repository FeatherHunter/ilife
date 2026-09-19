#!/usr/bin/env node
/** #686 · **加一条命令探针**（判据 1 自证）：加一条命令的 `git status` 里，除声明与生成物之外没有手写件。
 *
 * 判据要的是**加命令碰了几处**，所以本探针在真树上走两种加法，读 `git status --porcelain -- packages/skill-bill`
 * 的**新增项**（与探前快照做差集——别席在飞的未提交件不算本次探针的账），随后逐字节复位：
 *
 *   A · 往**已有能力**（`query`）加一条命令 ⇒ 新增项**只有声明件那一件**：生成物 `src/cli/registry.ts`
 *       是「一能力一行」的汇总，加一条命令不会让它变（所以也不需要人去手改它）。
 *   B · **新开一个能力目录**（`src/probe/`）⇒ 新增项恰为三件：两件手写声明（`commands.ts` ＋ `index.ts`）
 *       ＋ 一件生成物（`src/cli/registry.ts` 由此派生：多一行 import 与一行 SOURCES）。
 *
 * 复位一律照**生成器的既定流程**（改回声明 → 重建 `tsc -b` → 重打内容印记 `--stamp` → 重跑生成器），
 * 不靠 git 取回；复位判据＝三件 sha256 逐字节回位 ＋ `git status` 新增项为空 ＋ 探针自建目录逐条删净
 * （含它编译出来的 `dist/probe/`）。
 *
 * 运行（**必须持锁**，它会写工作区）：`node docs/skills/skill-bill/t686-加命令探针.mjs`
 * 退出码：0＝两种加法的新增项都与预期逐条相符且复位干净；1＝有第三处手写件，或复位不干净。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-bill');
const DECL = 'packages/skill-bill/src/query/commands.ts';
const NEW_DECL = 'packages/skill-bill/src/probe/commands.ts';
const NEW_INDEX = 'packages/skill-bill/src/probe/index.ts';
const GEN = 'packages/skill-bill/src/cli/registry.ts';
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (rel) => readFileSync(join(REPO, rel), 'utf8');
const write = (rel, text) => writeFileSync(join(REPO, rel), text, 'utf8');

function statusSet() {
  const r = spawnSync('git', ['status', '--porcelain', '-uall', '--', 'packages/skill-bill'], { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('git status 失败：' + (r.stderr || ''));
  return new Set(r.stdout.split('\n').map((l) => l.slice(3).trim().replace(/\\/g, '/')).filter(Boolean));
}

const diffPlus = (after, before) => [...after].filter((p) => !before.has(p)).sort();

/** 生成器读的是**编译后**的声明：改声明必须重建 ＋ 重打内容印记（`--stamp` 挂在 `build` 里），
 *  否则 `GEN-STALE` 就地拦下——那是设计行为（拦的是「拿旧声明当事实」的假绿），不是本门要放宽的。 */
const runTsc = () => spawnSync(process.execPath, [join(REPO, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', 'packages/skill-bill'], { cwd: REPO, encoding: 'utf8' });
const runStamp = () => spawnSync(process.execPath, [join(PKG, 'scripts', 'gen-cli.mjs'), '--stamp'], { cwd: REPO, encoding: 'utf8' });
const runGen = () => spawnSync(process.execPath, [join(PKG, 'scripts', 'gen-cli.mjs')], { cwd: REPO, encoding: 'utf8' });
const buildAndGen = () => ({ build: runTsc(), stamp: runStamp(), gen: runGen() });
const allOk = (r) => r.build.status === 0 && r.stamp.status === 0 && r.gen.status === 0;
const tail = (r) => ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-2).join(' ｜ ');

const results = [];
const record = (name, ok, detail) => {
  results.push(ok);
  console.log((ok ? 'PROBE ok   ' : 'PROBE FAIL ') + name + '：' + detail);
};

const before = statusSet();
const declText = read(DECL);
const genText = read(GEN);
const declSha = sha(declText);
const genSha = sha(genText);

/* ── A · 往已有能力加一条命令 ─────────────────────────────────────────────────────────── */

const mutated = declText.replace(/\n\] satisfies readonly CommandSpec\[\];\s*$/, `
  {
    kind: 'read',
    key: 'bill.record.probe',
    shape: 'list',
    title: '探针命令',
    wakeWord: '查今天',
    example: 'bill-cmd-read bill.record.probe --params \\'{"date":"2026-09-06"}\\'',
    run: viewRecordToday,
  },
] satisfies readonly CommandSpec[];
`);
if (mutated === declText) throw new Error('探针 A 没改到声明件（`] satisfies readonly CommandSpec[];` 没匹配上）');
write(DECL, mutated);
const a = buildAndGen();
const aAdded = diffPlus(statusSet(), before);
const aOk = allOk(a) && JSON.stringify(aAdded) === JSON.stringify([DECL]) && sha(read(GEN)) === genSha;
record('A 往已有能力加一条命令：新增项只有声明件一件（生成物一字节不变）', aOk,
  JSON.stringify(aAdded) + ' ｜ 生成物 sha256 不变=' + (sha(read(GEN)) === genSha) + ' ｜ 生成器 ' + tail(a.gen));

write(DECL, declText);
const restoreA = buildAndGen();
record('A 复位：声明与生成物逐字节回位、工作区无新增项', allOk(restoreA) && sha(read(DECL)) === declSha && sha(read(GEN)) === genSha
  && diffPlus(statusSet(), before).length === 0, '重建 ' + restoreA.build.status + '／重签 ' + restoreA.stamp.status + '／生成 ' + restoreA.gen.status);

/* ── B · 新开一个能力目录 ────────────────────────────────────────────────────────────── */

const PROBE_DECL = `import type { CommandSpec } from '../shared/commandSpec.js';
import { viewRecordToday } from '../query/read.js';

export const PROBE_COMMANDS = [
  {
    kind: 'read',
    key: 'bill.probe.one',
    shape: 'list',
    title: '探针命令',
    wakeWord: '查今天',
    example: 'bill-cmd-read bill.probe.one --params \\'{"date":"2026-09-06"}\\'',
    run: viewRecordToday,
  },
] satisfies readonly CommandSpec[];
`;
mkdirSync(join(PKG, 'src', 'probe'), { recursive: true });
write(NEW_DECL, PROBE_DECL);
write(NEW_INDEX, "export { PROBE_COMMANDS } from './commands.js';\n");
const b = buildAndGen();
const bAdded = diffPlus(statusSet(), before);
const bWant = [NEW_DECL, NEW_INDEX, GEN].sort();
const bOk = allOk(b) && JSON.stringify(bAdded) === JSON.stringify(bWant);
record('B 新开一个能力目录：新增项恰为「两份手写声明 ＋ 一件生成物」', bOk,
  JSON.stringify(bAdded) + '（期望 ' + JSON.stringify(bWant) + '）｜ 生成器 ' + tail(b.gen));

// 复位：逐条点名删掉本探针新建的三处（两份声明 ＋ 它编出来的 dist/probe/），
// **先把生成物复位再重建**（生成的 registry 还 import 着 probe，先编译会因缺件红——那是顺序问题，不是缺陷）。
for (const rel of [NEW_DECL, NEW_INDEX]) rmSync(join(REPO, rel), { force: true });
rmSync(join(PKG, 'dist', 'probe'), { recursive: true, force: true });
rmSync(join(PKG, 'src', 'probe'), { recursive: true, force: true });
const regenB = runGen();
const restoreB = { gen: regenB, ...buildAndGen() };
const bClean = !existsSync(join(PKG, 'src', 'probe')) && !existsSync(join(PKG, 'dist', 'probe'));
record('B 复位：探针自建目录删净、生成物逐字节回位、工作区无新增项',
  allOk(restoreB) && bClean && sha(read(GEN)) === genSha && diffPlus(statusSet(), before).length === 0,
  '删净=' + bClean + ' ｜ 生成物 sha256 不变=' + (sha(read(GEN)) === genSha) + ' ｜ git status 新增项='
  + JSON.stringify(diffPlus(statusSet(), before)));

const ok = results.filter(Boolean).length;
console.log('RESULT: ' + ok + '/' + results.length);
process.exit(ok === results.length ? 0 : 1);
