// #63 主线①终局取证 · 返修 R-5 ① ：**全量 exec 桶实跑 × 墙钟钉死**（证据脚本，只读仓内文件）。
//
// 目的：在**最终代码**上做一次与 `docs/research/t81-exec-smoke.mjs` 同面的全量实跑（398 条 exec 记录
// ＋ 99 键裸跑），但把「今天」钉死到指定时刻，用来证明：
//   ① 真实墙钟下 `t81-exec-smoke.mjs` 的红点集合 = {复制昨日运动}（唯一墙钟依赖）；
//   ② 把「今天」钉死到种子窗口内的一天，同一条命令集**全绿**（＝除该条外无任何墙钟依赖）；
//   ③ 把「今天」钉死到远期（种子窗口外），红点集合**仍然只有** {复制昨日运动}（＝不随日期漂移扩大）。
//
// 手法：复用 `t81-seed.mjs::createHarness`（与 #81/#86 **同一份**种子库与占位符替换口径），
// 仅额外通过 `NODE_OPTIONS=--require <preload>` 把子进程 `Date` 钉死（`todayISO()` =
// `new Date().toISOString()`，故钉 `Date` 即钉「今天」）。本脚本不改产品代码、不写仓内文件。
//
// 跑法（必须持锁）：
//   node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-smoke-pinned.mjs --now 2026-09-08T04:00:00Z
// 退出码：0 全部 exec 记录 exit 0；1 有非零（打印红点集合）。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  COVERAGE_REPAIR_ROUTES,
  NEW_KEY_ROUTES,
  WAKE_ROUTES,
} from '../../packages/skill-calorie/dist/triggers/routing.js';
import { createHarness } from './t81-seed.mjs';

const nowIdx = process.argv.indexOf('--now');
const NOW = nowIdx >= 0 ? process.argv[nowIdx + 1] : '';
if (!NOW || !Number.isFinite(Date.parse(NOW))) {
  console.error('用法：node docs/research/t63-line1-smoke-pinned.mjs --now <ISO8601>');
  process.exit(2);
}

// ── Date 钉死预载（子进程经 NODE_OPTIONS 继承；只写系统 tmp） ────────────────────
const workDirRoot = mkdtempSync(join(tmpdir(), 't63-r5-pinned-'));
const preload = join(workDirRoot, 'freeze-date.cjs');
writeFileSync(preload, [
  'const FAKE = process.env.T63_FAKE_NOW;',
  'if (FAKE) {',
  '  const RealDate = Date; const fixed = RealDate.parse(FAKE);',
  '  class FakeDate extends RealDate {',
  '    constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }',
  '    static now() { return fixed; }',
  '    static parse(s) { return RealDate.parse(s); }',
  '    static UTC(...a) { return RealDate.UTC(...a); }',
  '  }',
  '  globalThis.Date = FakeDate;',
  '}',
  '',
].join('\n'));
process.env.T63_FAKE_NOW = NOW;
const requireArg = /[\s"]/.test(preload) ? `--require ${JSON.stringify(preload)}` : `--require ${preload}`;
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, requireArg].filter(Boolean).join(' ');

const { runCli, workDir } = createHarness();

// ── 与 t81-exec-smoke.mjs 逐字同面的记录集 ──────────────────────────────────────
const EXEC = [
  ...WAKE_ROUTES.map((r) => ({ ...r, src: 'SoT' })),
  ...NEW_KEY_ROUTES.map((r) => ({ ...r, src: '新拟' })),
  ...COVERAGE_REPAIR_ROUTES.map((r) => ({ ...r, src: '修复' })),
].filter((r) => r.kind === 'exec');

console.log('# #63 R-5 · 全量 exec 实跑（墙钟钉死）');
console.log(`# now=${NOW}（T63_FAKE_NOW 经 NODE_OPTIONS=--require 注入子进程）`);
console.log(`# 记录集与 t81-exec-smoke.mjs 同面：SoT ${WAKE_ROUTES.filter((r) => r.kind === 'exec').length} ＋ 新拟 ${NEW_KEY_ROUTES.filter((r) => r.kind === 'exec').length} ＋ 修复 ${COVERAGE_REPAIR_ROUTES.filter((r) => r.kind === 'exec').length} ＝ ${EXEC.length}`);

// 钉死有效性自证：`复制昨日运动` 的源日由「今天 − 1」推出，钉死窗口内日期后应 exit 0。
const probe = runCli("calorie-cmd-read calorie.exercise.add --params '{\"copyFrom\":\"yesterday\"}'");
console.log(`# 钉死自证 复制昨日运动 exit=${probe.status}（期望：窗口内日期 0／远期非 0）`);
if (NOW.startsWith('2026-09-08') && probe.status !== 0) {
  console.error(`钉死失效：窗口内日期 ${NOW} 下探针仍 exit=${probe.status}（${probe.stderr}）——不得据此判绿。`);
  process.exit(3);
}

// ── 逐条实跑（每条一个全新种子库） ──────────────────────────────────────────────
const rows = [];
const bad = [];
for (const r of EXEC) {
  const res = runCli(r.cli);
  const ok = res.status === 0 && res.envelopeKey === r.key;
  rows.push({ ...r, ...res, ok });
  if (!ok) bad.push({ wakeWord: r.wakeWord, key: r.key, exit: res.status, envelopeKey: res.envelopeKey ?? null, stderr: res.stderr, cli: r.cli });
}

// ── 无参裸跑（每键一次；与 smoke §3 同面） ──────────────────────────────────────
const KEYS = [...new Set(EXEC.map((r) => r.key))].sort();
const bareRows = KEYS.map((key) => {
  const res = runCli('calorie-cmd-read ' + key);
  return { key, status: res.status };
});

const plainZero = rows.filter((r) => r.ok && r.substituted.length === 0).length;
const substZero = rows.filter((r) => r.ok && r.substituted.length > 0).length;

console.log('');
console.log('| 指标 | 值 |');
console.log('|---|---|');
console.log(`| exec 桶记录数 | ${rows.length} |`);
console.log(`| 原样实跑 exit 0（envelope key 一致） | ${plainZero} |`);
console.log(`| 占位符替换后 exit 0 | ${substZero} |`);
console.log(`| **非零（失败）** | ${bad.length} |`);
console.log(`| 涉及键数 | ${KEYS.length} |`);
console.log(`| 无参裸跑非零的键（＝需要参数） | ${bareRows.filter((r) => r.status !== 0).length} |`);
console.log('');
console.log('## 红点集合');
console.log('| 唤醒词 | key | exit | envelope key | stderr |');
console.log('|---|---|---|---|---|');
if (bad.length === 0) console.log('| —（全绿） | — | — | — | — |');
for (const b of bad) console.log(`| ${b.wakeWord} | \`${b.key}\` | ${b.exit} | ${b.envelopeKey ?? '—'} | ${b.stderr} |`);
console.log('');
console.log(`SUMMARY now=${NOW} exec=${rows.length} 绿=${plainZero + substZero} 红=${bad.length} 红点=${bad.map((b) => b.wakeWord).join('／') || '（无）'}`);
console.log(`RESULT: ${plainZero + substZero}/${rows.length}`);

// 钉死自证失败（非窗口外场景）时保留现场，便于排查。
if (bad.length === 0) console.log(`# 临时种子库：${workDir.replace(workDir, '<tmp>')}`);
if (bad.length) {
  console.error('非零记录：');
  for (const b of bad) console.error(`- ${b.wakeWord} (${b.key}) exit=${b.exit} :: ${b.stderr}`);
  console.error(`（tmp 种子库保留：${workDir}）`);
  process.exit(1);
}
