/** #337 · 场景 03 体重页面⑤⑥：今日体重盘 2 条读 ＋ 写后回执 9 条写（以唤醒词为起点）。
 *
 * 每条参数取 `src/weight/routes.ts` 的 `cli`（`<日期>` 填真实日期，其余逐字）。
 * 逐条断言：exit 0、信封 `data.output` 是本次 `--html` 的绝对路径、产物是完整文档
 * （`assertDocPage` 五连）、含体重眉标与对账信息＋三格式复制菜单；并按老实物
 * （`docs/skills/skill-calorie/t165-老页面实物结构.md`）补三变体区块：
 * 单条（本次体重／较上次／距目标／备注）／批量（写入跳过失败数＋逐条明细）／
 * 改类（改前 → 改后）／删类（删除快照＋硬删除口径）。写词另断言写前写后库真的变了
 * （同一临时库内回读，**不碰真库**：`SKILLS_DB_PATH` 指向本次临时目录）。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t337-体重盘与回执-证据.md`）：
 * - 变异红：把 `src/weight/receipt.ts` 的 `assembleDocPage` 入口改坏一处
 *   （如 `eyebrow` 改字）→ 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/weight-receipt-337.test.mjs`
 * （先验形状：先跑 `记体重` 一条，再跑全量；`--test-name-pattern=记体重$` 即单条）。
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

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(iso, delta) {
  const t = Date.parse(iso + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't337-weight-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘，回信封 ＋ 产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
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

/** 只读回查（写前写后对账用；库由本测试的临时目录供给，不碰真库）。 */
function q1(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILENAME));
  try {
    return db.prepare(sql).get(...args);
  } finally {
    db.close();
  }
}

/** 11 条共用的完整文档＋交付断言（五连走共用助手，三格式菜单在这里钉）。 */
function assertReceipt(r, what) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  assert.ok(r.file.includes('体重 · 写后回执'), what + ' 缺体重眉标');
  assert.ok(r.file.includes('对账信息'), what + ' 缺页尾对账折叠区');
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
}

/** 今日盘 2 条读共用的完整文档＋交付断言（读页眉标与写后回执不同）。 */
function assertDashboard(r, what) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');
  for (const needle of ['今日体重', '较上次', '结论', '体重曲线', '复制数据']) {
    assert.ok(r.file.includes(needle), what + ' 缺：' + needle);
  }
}

/** 一份可跑的种子库（7 天批量史 ＋ 今日一条 ＋ 前天备注一条），回今日与备注行的记录号。 */
function seedBasic(dir) {
  const today = todayISO();
  const items = [];
  for (let d = 9; d >= 3; d--) items.push({ date: shiftISO(today, -d), kg: Math.round((70.9 - (9 - d) * 0.1) * 10) / 10 });
  const b = runCli(dir, 'calorie.weight.batch', { items }, 'seed-batch');
  assert.equal(b.status, 0, '种子批量 exit ' + b.status + ' stderr=' + b.stderr.slice(-300));
  const t = runCli(dir, 'calorie.weight.log', { kg: 70.1, date: today, time: '07:00:00' }, 'seed-today');
  assert.equal(t.status, 0, '种子今日 exit ' + t.status + ' stderr=' + t.stderr.slice(-300));
  const n = runCli(dir, 'calorie.weight.log', { kg: 70.2, date: shiftISO(today, -2), time: '07:00:00', note: '晨起空腹' }, 'seed-note');
  assert.equal(n.status, 0, '种子备注 exit ' + n.status + ' stderr=' + n.stderr.slice(-300));
  return {
    todayId: t.envelope.data.receipt.recordId,
    noteId: n.envelope.data.receipt.recordId,
    noteDate: shiftISO(today, -2),
  };
}

// ---------------------------------------------------------------- ⑤ 今日体重盘（2 条读）

test('#337 看今日体重', () => {
  const dir = mkDir();
  seedBasic(dir);
  const r = runCli(dir, 'calorie.view.weight', { window: '今日' }, 'view-today');
  assertDashboard(r, '看今日体重');
  assert.ok(r.file.includes(todayISO()), '缺今日日期');
  assert.ok(r.file.includes('70.1'), '今日卡缺今日值');
});

test('#337 看体重总览', () => {
  const dir = mkDir();
  seedBasic(dir);
  const r = runCli(dir, 'calorie.view.weight', { window: '30d' }, 'view-overview');
  assertDashboard(r, '看体重总览');
  assert.ok(r.file.includes('体重盘'), '缺体重盘卡');
});

// ---------------------------------------------------------------- ⑥ 写后回执（9 条写）

test('#337 记体重', () => {
  const dir = mkDir();
  const before = q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n;
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5 }, 'log');
  assertReceipt(r, '记体重');
  for (const needle of ['本次体重', '70.5', '较上次差值', '距目标差', '备注']) {
    assert.ok(r.file.includes(needle), '记体重缺：' + needle);
  }
  assert.ok(r.envelope.data.receipt.recordId > 0, '回执缺记录号');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n, before + 1, '写后库行数未 +1');
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE id = ?', r.envelope.data.receipt.recordId).w, 70.5, '落库值不对');
});

test('#337 记体重（含备注）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5, note: '晨起空腹' }, 'log-note');
  assertReceipt(r, '记体重（含备注）');
  assert.ok(r.file.includes('晨起空腹'), '明细缺备注值');
  assert.equal(q1(dir, 'SELECT note AS v FROM weight_log WHERE id = ?', r.envelope.data.receipt.recordId).v, '晨起空腹', '备注未落库');
});

test('#337 补录体重', () => {
  const dir = mkDir();
  const d = shiftISO(todayISO(), -1);
  const r = runCli(dir, 'calorie.weight.log', { kg: 70.5, date: d }, 'log-backfill');
  assertReceipt(r, '补录体重');
  assert.ok(r.file.includes(d), '缺补录日期');
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE date = ?', d).w, 70.5, '补录行未落库');
});

test('#337 批量补录体重', () => {
  const dir = mkDir();
  const today = todayISO();
  // 先占住 -5 那一天，批量里那一条才真的走「跳过」（新库什么都不跳过，三态就只剩写入与失败）。
  const seed = runCli(dir, 'calorie.weight.log', { kg: 70.9, date: shiftISO(today, -5) }, 'batch-seed');
  assert.equal(seed.status, 0, '批量种子 exit ' + seed.status + ' stderr=' + seed.stderr.slice(-300));
  const items = [
    { date: shiftISO(today, -4), kg: 70.8 },
    { date: shiftISO(today, -5), kg: 70.5 },
    { date: 'xx', kg: 1 },
  ];
  const r = runCli(dir, 'calorie.weight.batch', { items }, 'batch');
  assertReceipt(r, '批量补录体重');
  for (const needle of ['批量计数', '写入', '跳过', '失败', '逐条明细']) {
    assert.ok(r.file.includes(needle), '批量补录体重缺：' + needle);
  }
  assert.match(r.envelope.data.message, /写入 1，跳过 1，失败 1/, '批量计数摘要不对：' + r.envelope.data.message);
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE date = ?', shiftISO(today, -4)).w, 70.8, '批量行未落库');
});

test('#337 改体重记录', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.update', { id: seed.todayId, kg: 70 }, 'update-id');
  assertReceipt(r, '改体重记录');
  for (const needle of ['改前 → 改后', '70.1', '70']) {
    assert.ok(r.file.includes(needle), '改体重记录缺：' + needle);
  }
  assert.equal(q1(dir, 'SELECT weight_kg AS w FROM weight_log WHERE id = ?', seed.todayId).w, 70, '改后值未落库');
});

test('#337 改某日体重', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.update', { date: seed.noteDate, kg: 70, note: '改后' }, 'update-date');
  assertReceipt(r, '改某日体重');
  assert.ok(r.file.includes('改前 → 改后'), '缺改前改后对照');
  const row = q1(dir, 'SELECT weight_kg AS w, note AS v FROM weight_log WHERE date = ?', seed.noteDate);
  assert.equal(row.w, 70, '按日改后值未落库');
  assert.equal(row.v, '改后', '按日改备注未落库');
});

test('#337 删体重记录', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const before = q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n;
  const r = runCli(dir, 'calorie.weight.remove', { id: seed.todayId }, 'remove-id');
  assertReceipt(r, '删体重记录');
  for (const needle of ['删除快照', '硬删除，不可恢复']) {
    assert.ok(r.file.includes(needle), '删体重记录缺：' + needle);
  }
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE id = ?', seed.todayId).n, 0, '按 id 未硬删');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log').n, before - 1, '写后库行数未 -1');
});

test('#337 删某日体重', () => {
  const dir = mkDir();
  const seed = seedBasic(dir);
  const r = runCli(dir, 'calorie.weight.remove', { date: seed.noteDate }, 'remove-date');
  assertReceipt(r, '删某日体重');
  assert.ok(r.file.includes('硬删除，不可恢复'), '缺硬删除口径');
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE date = ?', seed.noteDate).n, 0, '按日未硬删干净');
});

test('#337 批量删体重', () => {
  const dir = mkDir();
  seedBasic(dir);
  const today = todayISO();
  const r = runCli(dir, 'calorie.weight.remove', { start: shiftISO(today, -9), end: shiftISO(today, -8) }, 'remove-range');
  assertReceipt(r, '批量删体重');
  assert.match(r.envelope.data.message, /2 条/, '批量删摘要不对：' + r.envelope.data.message);
  assert.equal(q1(dir, 'SELECT COUNT(*) AS n FROM weight_log WHERE date BETWEEN ? AND ?', shiftISO(today, -9), shiftISO(today, -8)).n, 0, '按范围未硬删干净');
});
