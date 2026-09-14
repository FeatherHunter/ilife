/** #333 页面① 曲线／明细／备注 18 词逐条真跑（窗口接对＋三标注＋备注筛选）。
 *
 * 口径：tmp 隔离种子库（SKILLS_DB_PATH 指临时目录，真实 DB 零触碰），CALORIE_TODAY 钉死
 * 2026-09-07（周一），体重逐日 2025-09-01~2026-09-07（降 0.03kg／天，5kg／10kg 里程碑
 * 皆达成）＋ 3 条备注 ＋ 目标 68.0kg。严格串行 spawnSync（Windows 并行 spawn 配额抖动）。
 *
 * 判据（只断言 exit 0 不够——本票修的正是 exit 0 但窗口错）：每条另断言产物窗口区间
 * （HTML 标题 `体重历史 <range>`）与唤醒词语义一致，且逐日种子下 metrics.rows 等于
 * 窗内天数（退回缺省 30 天即红）。空窗／坏参另起两个用例钉缺失阻断口径。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { DB_FILENAME } from '../dist/paths.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const TODAY = '2026-09-07';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test(String(p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't333')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)").run();
  const t0 = Date.parse('2025-09-01T12:00:00Z');
  const t1 = Date.parse('2026-09-07T12:00:00Z');
  let i = 0;
  for (let t = t0; t <= t1; t += 86400000, i += 1) {
    const d = new Date(t).toISOString().slice(0, 10);
    const w = Math.round((78.0 - i * 0.03) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 22.9, ?)').run(d, '07:00:00', w, '');
  }
  for (const [d, note] of [['2026-09-05', '晨起空腹'], ['2026-09-06', '运动后'], ['2026-09-07', '睡前']]) {
    db.prepare('UPDATE weight_log SET note = ? WHERE date = ?').run(note, d);
  }
}

/** 18 条＝唤醒词 → cli 参数 → 期望区间（硬编码，逐日种子独立可算）→ 期望行数。 */
const CASES = [
  ['看本周体重', { window: '本周' }, '2026-09-07', 1],
  ['看上周体重', { window: '上周' }, '2026-08-31 ~ 2026-09-06', 7],
  ['看本月体重', { window: '本月' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看上月体重', { window: '上月' }, '2026-08-01 ~ 2026-08-31', 31],
  ['看最近 7 天体重', { window: '7d' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看最近 90 天体重', { window: '90d' }, '2026-06-10 ~ 2026-09-07', 90],
  ['看某段时间体重', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看体重曲线', { window: '30d' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带目标）', { window: '30d', overlay: 'target' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带里程碑）', { window: '30d', overlay: 'milestone' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带异常点）', { window: '30d', overlay: 'anomaly' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看「有备注」的体重记录', { window: '30d', noteOnly: true }, '2026-08-09 ~ 2026-09-07', 3],
  ['看本月体重曲线', { window: '本月' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看上月体重曲线', { window: '上月' }, '2026-08-01 ~ 2026-08-31', 31],
  ['看最近 90 天体重曲线', { window: '90d' }, '2026-06-10 ~ 2026-09-07', 90],
  ['看最近 180 天体重曲线', { window: '180d' }, '2026-03-12 ~ 2026-09-07', 180],
  ['看最近 365 天体重曲线', { window: '365d' }, '2025-09-08 ~ 2026-09-07', 365],
  ['看某段时间体重曲线', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }, '2026-09-01 ~ 2026-09-07', 7],
];

function runOne(dir, word, params, htmlPath) {
  return spawnSync(NODE, [CLI, 'calorie.view.weight-history', '--params', JSON.stringify(params), '--html', htmlPath], {
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
    encoding: 'utf8',
  });
}

test('#333 页面① 18 词逐条真跑（exit 0＋完整文档＋窗口区间一致）', () => {
  assert.equal(CASES.length, 18);
  const dir = mkdtempSync(join(tmpdir(), 't333-hist-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  let pass = 0;
  for (const [word, params, range, rows] of CASES) {
    const safe = String(word).replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_');
    const htmlPath = join(dir, safe + '.html');
    const r = runOne(dir, word, params, htmlPath);
    assert.equal(r.status, 0, word + ' exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 500));
    let env;
    try {
      env = JSON.parse(String(r.stdout).trim());
    } catch (e) {
      throw new Error(word + ' stdout 非 JSON：' + ((e && e.message) || String(e)));
    }
    assert.equal(env.key, 'calorie.view.weight-history', word + ' 信封键');
    assert.equal(env.data.metrics.rows, rows, word + ' 窗内行数（退回缺省即红）');
    assert.ok(existsSync(htmlPath), word + ' HTML 未落盘');
    const html = readFileSync(htmlPath, 'utf8');
    assert.ok(html.startsWith('<!doctype html>'), word + ' 非完整文档');
    assert.ok(html.includes('ilife-page'), word + ' 缺页面壳');
    // 区间逐字比 h1（单日窗的区间串＝那一天本身，口径在 `records.ts:98`）；用 includes 会被前缀骗过。
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '';
    assert.equal(h1, '体重历史 ' + range, word + ' 区间与语义不一致（要 ' + range + '，实测 ' + h1 + '）');
    assert.ok(html.includes('备注'), word + ' 缺备注列');
    if (word === '看体重曲线（带目标）') assert.ok(html.includes('目标线') && html.includes('68'), word + ' 缺目标标注');
    if (word === '看体重曲线（带里程碑）') assert.ok(html.includes('里程碑') && html.includes('减重 5kg 那天'), word + ' 缺里程碑标注');
    if (word === '看体重曲线（带异常点）') assert.ok(html.includes('异常点'), word + ' 缺异常点标注');
    if (word === '看「有备注」的体重记录') assert.ok(html.includes('备注筛选') && html.includes('晨起空腹'), word + ' 缺备注筛选');
    pass += 1;
  }
  console.log('RESULT: ' + pass + '/18');
});

test('#333 空窗缺失阻断（无备注窗 noteOnly 不落盘、missing-data）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't333-empty-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't333e')").run();
  const t0 = Date.parse('2026-08-09T12:00:00Z');
  for (let t = t0; t <= Date.parse('2026-09-07T12:00:00Z'); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 22.9, ?)').run(d, '07:00:00', 70.0, '');
  }
  db.close();
  const htmlPath = join(dir, 'empty.html');
  const r = runOne(dir, '备注空窗', { window: '30d', noteOnly: true }, htmlPath);
  assert.equal(r.status, 4, '备注空窗应 exit 4（实测 ' + r.status + '）');
  assert.equal(existsSync(htmlPath), false, '空窗不得落盘');
});

test('#333 旧口径兼容（days／显式起止仍可用）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't333-compat-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  for (const params of [[{ days: 7 }, 7], [{ start: '2026-09-01', end: '2026-09-07' }, 7]]) {
    const htmlPath = join(dir, 'c' + params[1] + Math.random().toString(36).slice(2, 6) + '.html');
    const r = runOne(dir, '兼容', params[0], htmlPath);
    assert.equal(r.status, 0, '旧口径 exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 300));
    const env = JSON.parse(String(r.stdout).trim());
    assert.equal(env.data.metrics.rows, params[1], '旧口径行数');
  }
});
