/** #622 · 两条 vs 目标词目标预检确认页判据（判据先行，先红后绿）。
 *
 * 范围：两条唤醒词「看今日运动（vs 目标）」「看本周运动（vs 目标）」
 * （同命令 `calorie.view.exercise-goal`，窗口 今日／本周）在无目标时出预检确认页
 * （过程型 HTML，exit 0 ＋落盘完整文档：现值缺席说明＋目标值输入指引＋确认后复制指令），
 * 确认后调 #621 的 `calorie.goal.exercise` 写入再出终页；有目标直出终页不变；
 * 不画 0% 空环假页面。
 *
 * 三态（程序判真假，与票面一一对应）：
 *   ① 无目标→预检页 exit 0 完整文档（有运动记录但 `exercise_goal` 为 NULL）；
 *   ② 未答不给终页有结构化断言（预检页 metrics 置 hasGoal 0 且无环无判决胶囊）；
 *   ③ 有目标→终页与现形状逐字节同口径（写后重跑出环卡＋判决胶囊两态）。
 *
 * 目标值的读写走目标能力的公开接口：读经 `getNutritionGoal`（不重写目标 SQL），
 * 写经 `calorie.goal.exercise`（#621）。运动窗口无记录时仍走原缺失阻断（保 #267 空库档）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node tooling/run-locked.mjs --ticket 622 -- node --test packages/skill-calorie/test/exercise-goal-precheck-622.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addRecord } from '../dist/exercise/exerciseStore.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const VIEW_CMD = 'calorie.view.exercise-goal';
const WRITE_CMD = 'calorie.goal.exercise';
const TODAY = '2026-09-14';
const GOAL_VALUE = 300;

const dbFile = (dir) => join(dir, DB_FILENAME);

function mkDirWithExercise() {
  const dir = mkdtempSync(join(tmpdir(), 't622-exercise-precheck-'));
  const db = openDb(dbFile(dir));
  try {
    addRecord(db, { date: TODAY, exerciseType: '慢跑', caloriesBurned: 320, minutes: 30 });
    addRecord(db, { date: TODAY, exerciseType: '慢跑', caloriesBurned: 120, minutes: 20 });
  } finally {
    db.close();
  }
  return dir;
}

function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? 'out') + '.html');
  const args = [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out];
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(TODAY) },
  });
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    out,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
    envelope: String(r.stdout || '').trim().startsWith('{') ? JSON.parse(String(r.stdout || '').trim()) : null,
  };
}

function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

test('t622 无目标出预检页：两条词 exit 0 完整文档（现值缺席＋输入指引＋确认后复制指令）', () => {
  for (const [word, params, tag] of [
    ['看今日运动（vs 目标）', { window: '今日' }, 'today'],
    ['看本周运动（vs 目标）', { window: '本周' }, 'week'],
  ]) {
    const dir = mkDirWithExercise();
    const r = runCli(dir, VIEW_CMD, params, 'precheck-' + tag);
    assert.equal(r.status, 0, 't622 ' + word + ' 无目标应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
    assert.ok(r.stdout.startsWith('{'), 't622 ' + word + ' stdout 应是信封 JSON');
    assert.ok(r.envelope !== null, 't622 ' + word + ' 信封解析失败');
    assert.equal(r.envelope.data.output, r.out, 't622 ' + word + ' 信封交付路径不是本次 --html 那一份');
    assert.ok(isAbsolute(r.envelope.data.output), 't622 ' + word + ' 交付路径不是绝对路径');
    assertDocPage(r.file, 't622 ' + word + '预检页');
    assert.ok(r.file.includes('还没设每日运动消耗目标'), 't622 ' + word + ' 预检页缺现值缺席说明');
    assert.ok(r.file.includes('目标值'), 't622 ' + word + ' 预检页缺目标值输入指引');
    assert.ok(r.file.includes('正整数'), 't622 ' + word + ' 预检页缺目标值口径（正整数）');
    assert.ok(r.file.includes('确认后'), 't622 ' + word + ' 预检页缺确认后复制指令说明');
    assert.ok(r.file.includes(WRITE_CMD), 't622 ' + word + ' 预检页缺确认后写命令 ' + WRITE_CMD);
    assert.ok(!hasClass(r.file, 'ilife-block-ring-wrap'), 't622 ' + word + ' 预检页不许画空环');
    assert.ok(!r.file.includes('conic-gradient'), 't622 ' + word + ' 预检页不许出环形进度');
    assert.ok(!hasClass(r.file, 'ilife-block-verdict'), 't622 ' + word + ' 预检页不许出判决胶囊');
  }
});

test('t622 未答不给终页：预检页 metrics 置 hasGoal 0 且无终页结构', () => {
  const dir = mkDirWithExercise();
  const r = runCli(dir, VIEW_CMD, { window: '今日' }, 'precheck-struct');
  assert.equal(r.status, 0, 't622 预检页应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  const metrics = r.envelope?.data?.metrics ?? null;
  assert.ok(metrics !== null && typeof metrics === 'object', 't622 预检页缺 metrics 结构化断言');
  assert.equal(metrics.hasGoal, 0, 't622 未答时 metrics.hasGoal 应为 0');
  assert.equal(metrics.precheck, 1, 't622 未答时 metrics.precheck 应为 1');
  assert.ok(!('pct' in metrics), 't622 未答不给终页：metrics 不许带 pct');
  assert.ok(!hasClass(r.file, 'ilife-block-ring-wrap'), 't622 未答不给终页：不许有环形容器');
  assert.ok(!hasClass(r.file, 'ilife-block-verdict'), 't622 未答不给终页：不许有判决胶囊');
});

test('t622 有目标出终页：确认后调写命令写入再出终页（环卡＋判决胶囊）', () => {
  const dir = mkDirWithExercise();
  const pre = runCli(dir, VIEW_CMD, { window: '今日' }, 'precheck-before');
  assert.equal(pre.status, 0, 't622 前置预检页应 exit 0，实测 ' + pre.status);
  const w = runCli(dir, WRITE_CMD, { goal: GOAL_VALUE }, 'write-goal');
  assert.equal(w.status, 0, 't622 ' + WRITE_CMD + ' 应 exit 0，实测 ' + w.status + ' ' + w.stderr.slice(-300));
  for (const [word, params, tag] of [
    ['看今日运动（vs 目标）', { window: '今日' }, 'today'],
    ['看本周运动（vs 目标）', { window: '本周' }, 'week'],
  ]) {
    const r = runCli(dir, VIEW_CMD, params, 'final-' + tag);
    assert.equal(r.status, 0, 't622 ' + word + ' 有目标应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
    assertDocPage(r.file, 't622 ' + word + '终页');
    assert.ok(hasClass(r.file, 'ilife-block-ring-wrap'), 't622 ' + word + ' 终页缺环形进度容器');
    assert.ok(hasClass(r.file, 'ilife-block-ring-pct'), 't622 ' + word + ' 终页环心缺百分比读数');
    assert.ok(hasClass(r.file, 'ilife-block-verdict'), 't622 ' + word + ' 终页缺判决胶囊');
    assert.ok(/class="[^"]*ilife-block-verdict (ok|no)"/.test(r.file), 't622 ' + word + ' 判决胶囊没有档（ok/no）');
    const metrics = r.envelope?.data?.metrics ?? {};
    assert.equal(metrics.dailyGoal, GOAL_VALUE, 't622 ' + word + ' 终页 metrics.dailyGoal 应为写入值');
    assert.ok(typeof metrics.pct === 'number', 't622 ' + word + ' 终页 metrics 应带 pct');
  }
});

test('t626 自定义窗预检页隐去唤醒词行：start/end 直调无 window 不编唤醒词', () => {
  const dir = mkDirWithExercise();
  const r = runCli(dir, VIEW_CMD, { start: '2026-09-08', end: TODAY }, 'precheck-custom');
  assert.equal(r.status, 0, 't626 自定义窗预检页应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  assertDocPage(r.file, 't626 自定义窗预检页');
  const metrics = r.envelope?.data?.metrics ?? null;
  assert.ok(metrics !== null && typeof metrics === 'object', 't626 自定义窗预检页缺 metrics 结构化断言');
  assert.equal(metrics.hasGoal, 0, 't626 自定义窗 metrics.hasGoal 应为 0');
  assert.equal(metrics.precheck, 1, 't626 自定义窗 metrics.precheck 应为 1');
  assert.ok(r.file.includes('2026-09-08'), 't626 自定义窗应照查询窗显窗口起点');
  assert.ok(!r.file.includes('唤醒词'), 't626 自定义窗应隐去唤醒词行，实测仍有唤醒词行');
  assert.ok(!r.file.includes('看今日运动（vs 目标）'), 't626 自定义窗不许误标看今日运动（vs 目标）');
  assert.ok(!r.file.includes('看本周运动（vs 目标）'), 't626 自定义窗不许误标看本周运动（vs 目标）');
});
