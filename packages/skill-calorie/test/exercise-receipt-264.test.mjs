/** #264 · 场景 04 运动写后回执：13 条写词逐条完整文档（以唤醒词为起点）。
 *
 * 每条参数取冻结表 `src/triggers/scene-04-exercise.ts` 的 `main_prompt.cli`
 * （`<日期>` 填真实日期，其余逐字；复制昨日运动按冻结原文不带日期，目标即今天，
 * 故先在昨日落一条再复制）。逐条断言：exit 0、`data.output` 是绝对路径、
 * 产物以 `<!doctype html>` 起、含 `charset="utf-8"`、含样式段、含版面、
 * 含三格式复制菜单；并按老实物 `crud_receipt.html` 补区块：
 * 逐条明细／改类的改前→改后／批量类的写入跳过失败数。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t264-*.md`）：
 * - 变异红：把 `src/exercise/receipt.ts` 的 `assembleDocPage` 入口改坏一处
 *   （如 `eyebrow` 改字）→ 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-receipt-264.test.mjs`
 * （先验形状：先跑 `记运动` 一条，再跑全量；`--test-name-pattern=记运动` 即单条）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const D1 = '2026-09-05';
const D2 = '2026-09-06';
const D3 = '2026-09-07';

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't264-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘，回信封 ＋ 产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 13 条写词共用的完整文档＋交付断言（五连走共用助手，三格式菜单在这里钉）。 */
function assertReceipt(r, what) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  assert.ok(r.file.includes('运动写后回执'), what + ' 缺运动眉标');
  assert.ok(r.file.includes('对账信息'), what + ' 缺页尾对账折叠区');
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}
function todayISO() {
  // #676：CALORIE_TODAY 已退役，本件只用真实时钟（父进程与子进程同一天，不靠环境变量对齐）。
  return new Date().toISOString().slice(0, 10);
}

test('#264 记运动（单条起点，先验形状第一条）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 }, 'add');
  assertReceipt(r, '记运动');
  assert.ok(r.file.includes('本次明细'), '缺单条明细表');
  assert.ok(r.file.includes('慢跑'), '明细缺运动类型值');
  assert.ok(r.file.includes('当日累计'), '缺当日累计表');
});

test('#264 记运动（含备注）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, note: '夜跑' }, 'add-note');
  assertReceipt(r, '记运动（含备注）');
  assert.ok(r.file.includes('夜跑'), '明细缺备注值');
});

test('#264 记力量训练', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '卧推', calories: 150, category: '力量', loadKg: 60, reps: 10 }, 'strength');
  assertReceipt(r, '记力量训练');
  assert.ok(r.file.includes('卧推'), '明细缺动作名');
  assert.ok(r.file.includes('60'), '明细缺重量值');
});

test('#264 记有氧运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5 }, 'cardio');
  assertReceipt(r, '记有氧运动');
  assert.ok(r.file.includes('户外跑'), '明细缺运动类型值');
  assert.ok(r.file.includes('5'), '明细缺距离值');
});

test('#264 记日常活动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000 }, 'daily');
  assertReceipt(r, '记日常活动');
  assert.ok(r.file.includes('步行'), '明细缺活动类型值');
  assert.ok(r.file.includes('3000'), '明细缺步数值');
});

test('#264 补记运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D1 }, 'backfill');
  assertReceipt(r, '补记运动');
  assert.ok(r.file.includes(D1), '明细缺补记日期');
});

test('#264 批量补记运动', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { items: [{ type: '慢跑', calories: 320, minutes: 30, date: D1 }] }, 'batch');
  assertReceipt(r, '批量补记运动');
  assert.ok(r.file.includes('批量计数'), '缺批量计数表');
  assert.ok(r.file.includes('写入'), '计数缺写入行');
  assert.ok(r.file.includes('跳过'), '计数缺跳过行');
  assert.ok(r.file.includes('失败'), '计数缺失败行');
  assert.ok(r.file.includes('逐条明细'), '缺逐条明细表');
  assert.ok(r.file.includes('慢跑'), '明细缺类型值');
});

test('#264 复制昨日运动', () => {
  const dir = mkDir();
  const today = todayISO();
  const yesterday = shiftISO(today, -1);
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: yesterday }, 'seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.add', { copyFrom: 'yesterday' }, 'copy');
  assertReceipt(r, '复制昨日运动');
  assert.ok(r.file.includes('复制'), '缺复制计数');
  assert.ok(r.file.includes('跳过'), '缺跳过计数');
  assert.ok(r.file.includes('目标日期'), '缺目标日期行');
  assert.ok(r.file.includes('逐条明细'), '缺逐条明细表');
});

test('#264 改运动记录', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, 'seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const id = seed.envelope.data.receipt.recordId;
  const r = runCli(dir, 'calorie.exercise.update', { id, minutes: 40 }, 'update');
  assertReceipt(r, '改运动记录');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照区');
  assert.ok(r.file.includes('→'), '对照区缺箭头');
  assert.ok(r.file.includes('30') && r.file.includes('40'), '对照区缺 30→40 的真内容');
});

test('#264 改某日运动', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, 'seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.update', { note: '补记', date: D2 }, 'update-day');
  assertReceipt(r, '改某日运动');
  assert.ok(r.file.includes('命中条数'), '缺命中计数');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照区');
  assert.ok(r.file.includes('补记'), '对照区缺新值');
});

test('#264 删运动记录', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, 'seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const id = seed.envelope.data.receipt.recordId;
  const r = runCli(dir, 'calorie.exercise.remove', { id }, 'remove');
  assertReceipt(r, '删运动记录');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes('慢跑'), '快照缺被删类型');
});

test('#264 删某日运动', () => {
  const dir = mkDir();
  const seed = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 }, 'seed');
  assert.equal(seed.status, 0, 'seed stderr=' + seed.stderr.slice(-200));
  const r = runCli(dir, 'calorie.exercise.remove', { date: D2 }, 'remove-day');
  assertReceipt(r, '删某日运动');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes(D2), '快照缺日期');
});

test('#264 批量删运动', () => {
  const dir = mkDir();
  for (const d of [D1, D2, D3]) {
    const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: d }, 'seed-' + d);
    assert.equal(s.status, 0, 'seed ' + d + ' stderr=' + s.stderr.slice(-200));
  }
  const r = runCli(dir, 'calorie.exercise.remove', { from: D1, to: D2 }, 'remove-range');
  assertReceipt(r, '批量删运动');
  assert.ok(r.file.includes('删除条数'), '缺删除计数');
  assert.ok(r.file.includes('2 条'), '范围删应命中 2 条');
  assert.ok(r.file.includes('逐条明细'), '缺删除快照明细');
});
