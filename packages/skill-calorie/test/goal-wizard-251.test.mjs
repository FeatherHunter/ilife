/** #251 · 场景 06 目标管理：写前预检页（`calorie.view.goal-wizard`）。
 *
 * 本票只测**共用件与新命令本身**，不测 25 条词是否全跑通（那是本图后续三张页面票的事）。
 * 四组判据：
 *   ① 新命令实跑 exit 0、`data.output` 是绝对路径、字节如实、产物是**完整文档**（空库与有数据各一遍）；
 *   ② **缺项不编数字**：档案不全时不出任何推荐值，页面写「缺×，不算」——这是 #176／#177 的裁定；
 *   ③ **活动量接真实档位**：同一个人的档案只改活动量，推荐热量必须跟着变——本次重构正是修这一处
 *      （改前写死 ×1.55，三档给出同一个数）；
 *   ④ 方向非法 exit 2 且不落盘。
 *
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/goal-wizard-251.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.goal-wizard';

/** 一份全新库；`seed` 给真则写一份「档案 ＋ 体重 ＋ 已有目标」（模拟改类词的场景）。 */
function mkDb(seed, level = 'moderate') {
  const dir = mkdtempSync(join(tmpdir(), 't251-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) {
    db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 34, \'female\', 163, ?)').run(level);
    db.prepare("INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES ('2026-09-07', '07:00:00', 62.5, 163, 23.5)").run();
    db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1500, 120, 150, 45, 2200, 58, \'2026-12-31\')').run();
  }
  db.close();
  return dir;
}

/** 真 CLI 跑一次并落盘，顺带回 stdout（信封 JSON）。 */
function runCli(dir, params, outName = 'goal') {
  const out = join(dir, outName + '.html');
  const r = spawnSync(NODE_BIN, [BIN, KEY, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock('2026-09-07') },
  });
  return {
    status: r.status, out,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 完整文档五断言（沿 profile-doc-179.test.mjs:52-60 的判据）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

/** 页面「推荐方案与依据」那一段里，热量(卡)那一格的推荐值。
 *  必须**限定在推荐段内**取——库内现值段也有一行「热量(卡)」，不限定会取到改前值。 */
function recommendedCalorie(html) {
  const i = html.indexOf('推荐方案与依据');
  if (i < 0) return null;
  const m = /热量\(卡\)<\/td><td[^>]*>(\d+)/.exec(html.slice(i));
  return m === null ? null : Number(m[1]);
}

test('#251 新命令实跑出完整文档：空库一遍 ＋ 有档案体重目标一遍（绝对路径 ＋ 字节如实）', () => {
  for (const [label, seeded, params] of [
    ['空库 · 不传方向', false, { wake: '定营养目标' }],
    ['空库 · 传方向', false, { profile: 'cut', wake: '定营养目标(自动算)' }],
    ['有档案体重目标 · 传方向', true, { profile: 'cut', wake: '改营养目标' }],
  ]) {
    const dir = mkDb(seeded);
    const r = runCli(dir, params);
    assert.equal(r.status, 0, label + ' 应 exit 0，实测 ' + r.status + ' ' + r.stderr);
    assertDocPage(r.file, label);
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, KEY, label + ' 信封 key 应是本命令');
    assert.ok(typeof env.data.output === 'string' && /^([A-Za-z]:\\|\/)/.test(env.data.output), label + ' data.output 应是绝对路径');
    assert.equal(readFileSync(env.data.output, 'utf8').length, r.file.length, label + ' 回执路径与产物字节应一致');
    assert.ok(r.file.length > 20000, label + ' 完整文档应远大于片段（实测 ' + r.file.length + ' 字节）');
  }
});

test('#251 缺项不编数字：档案不全时不出推荐值，页面写「缺×，不算」', () => {
  const dir = mkDb(false);
  const html = runCli(dir, { profile: 'cut', wake: '定营养目标(自动算)' }).file;
  assertDocPage(html, '空库·传方向');
  assert.ok(html.includes('不出推荐数字'), '缺项时应写明不出推荐数字');
  assert.equal(html.includes('推荐方案与依据'), false, '缺项时不应出「推荐方案与依据」那一段');
  assert.equal(recommendedCalorie(html), null, '缺项时不应有推荐热量数字');
  // 反向：四要素齐备的那一档必须**有**数字，否则上面那条断言会因「永远没有数字」而白过。
  const seeded = runCli(mkDb(true), { profile: 'cut' }).file;
  assert.ok(recommendedCalorie(seeded) !== null, '档案齐备时应给出推荐热量数字');
});

test('#251 活动量接真实档位：同一个人的档案只改活动量，推荐热量应跟着变', () => {
  const got = ['sedentary', 'moderate', 'very_active'].map((lv) => recommendedCalorie(runCli(mkDb(true, lv), { profile: 'cut' }).file));
  assert.ok(got.every((v) => v !== null), '三档都应给出推荐热量：' + JSON.stringify(got));
  assert.equal(new Set(got).size, 3, '三档必须给出三个不同的数（写死 ×1.55 时会同值）：' + JSON.stringify(got));
  assert.ok(got[0] < got[1] && got[1] < got[2], '档位越高推荐热量应越高：' + JSON.stringify(got));
});

test('#251 方向非法：exit 2 且不落盘', () => {
  const dir = mkDb(true);
  const r = runCli(dir, { profile: 'bulk2' });
  assert.equal(r.status, 2, 'profile 非法应 exit 2');
  assert.equal(r.file, null, 'exit 2 不得落盘');
  assert.match(r.stderr, /profile 非法/, '报错文案应指名字段');
});
