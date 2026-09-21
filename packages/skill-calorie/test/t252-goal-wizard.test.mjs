/** #252 · 预检确认页 11 条写词执行接线断言（`calorie.view.goal-wizard`）。
 *
 * 判据（复核 next 原样）：
 *   ① 11 条有库 exit0 完整文档；定类 8 条空库 exit0 完整文档；
 *   ② 3 条自动算词路由桶为 exec（`src/goal/routes.ts`＋生成物逐字同）；
 *   ③ 空库无假数字（不出推荐数字、无「推荐方案与依据」段、有「未设置」）；
 *   ④ 改类 3 条空库 exit4 不落盘；
 *   ⑤ 暂停／重启两条走 exit2 不出页（空库＋有库各一遍）。
 *
 * 运行：先持锁编译，再 node --test packages/skill-calorie/test/t252-goal-wizard.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { openDb } from '../dist/index.js';
import { GOAL_ROUTES } from '../dist/goal/routes.js';
import { WAKE_ROUTES } from '../dist/triggers/routes.generated.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.goal-wizard';

/** 11 条写词的 wizard 入参（自动算 3 条带 profile cut，其余只给 wake）。 */
const ELEVEN = [
  { wake: '定营养目标', params: { wake: '定营养目标' } },
  { wake: '定营养目标(自动算)', params: { profile: 'cut', wake: '定营养目标(自动算)' } },
  { wake: '定体重目标', params: { wake: '定体重目标' } },
  { wake: '定体重目标(自动算截止)', params: { wake: '定体重目标(自动算截止)' } },
  { wake: '定体重目标(含起始日)', params: { wake: '定体重目标(含起始日)' } },
  { wake: '定饮水目标', params: { wake: '定饮水目标' } },
  { wake: '定饮水目标(自动算)', params: { profile: 'cut', wake: '定饮水目标(自动算)' } },
  { wake: '一键定全套目标', params: { profile: 'cut', wake: '一键定全套目标' } },
  { wake: '改营养目标', params: { wake: '改营养目标' } },
  { wake: '改体重目标', params: { wake: '改体重目标' } },
  { wake: '改饮水目标', params: { wake: '改饮水目标' } },
];
const DING = ELEVEN.slice(0, 8);
const GAI = ELEVEN.slice(8);
const AUTO3 = ['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标'];

/** 一份全新库；seed 给真则写一份档案＋体重＋已有目标（改类有库场景）。 */
function mkDb(seed) {
  const dir = mkdtempSync(join(tmpdir(), 't252-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) {
    db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 34, 'female', 163, 'moderate')").run();
    db.prepare("INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES ('2026-09-07', '07:00:00', 62.5, 163, 23.5)").run();
    db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1500, 120, 150, 45, 2200, 58, '2026-12-31')").run();
  }
  db.close();
  return dir;
}

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

function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

describe('#252 预检确认页 11 条写词接线', () => {
  it('11 条有库 exit0 完整文档', () => {
    for (const { wake, params } of ELEVEN) {
      const dir = mkDb(true);
      const r = runCli(dir, params, 'w-' + Buffer.from(wake).toString('hex').slice(0, 12));
      assert.equal(r.status, 0, wake + ' 有库应 exit 0，实测 ' + r.status + ' ' + r.stderr);
      assertDocPage(r.file, wake + ' 有库');
      assert.ok(r.file.length > 20000, wake + ' 完整文档应远大于片段（实测 ' + r.file.length + ' 字节）');
    }
  });

  it('定类 8 条空库 exit0 完整文档', () => {
    for (const { wake, params } of DING) {
      const dir = mkDb(false);
      const r = runCli(dir, params, 'e-' + Buffer.from(wake).toString('hex').slice(0, 12));
      assert.equal(r.status, 0, wake + ' 空库应 exit 0，实测 ' + r.status + ' ' + r.stderr);
      assertDocPage(r.file, wake + ' 空库');
    }
  });

  it('3 条自动算词路由桶为 exec（本件＋生成物逐字同）', () => {
    for (const wake of AUTO3) {
      const hit = GOAL_ROUTES.find((x) => x.wakeWord === wake);
      assert.ok(hit, wake + ' 在 GOAL_ROUTES 缺失');
      assert.equal(hit.kind, 'exec', wake + ' 本件应为 exec');
      assert.equal(hit.key, 'calorie.view.goal-wizard', wake + ' 入口应是预检页命令');
      const gen = WAKE_ROUTES.find((x) => x.wakeWord === wake);
      assert.ok(gen, wake + ' 在生成物缺失');
      assert.equal(gen.kind, 'exec', wake + ' 生成物应为 exec');
      assert.equal(gen.key, 'calorie.view.goal-wizard', wake + ' 生成物入口应是预检页命令');
    }
  });

  it('空库无假数字：不出推荐数字、无推荐段、有未设置', () => {
    const dir = mkDb(false);
    const r = runCli(dir, { profile: 'cut', wake: '定营养目标(自动算)' });
    assert.equal(r.status, 0, '空库定类应 exit 0');
    assertDocPage(r.file, '空库无假数字');
    const html = r.file;
    assert.ok(html.includes('不出推荐数字') || html.includes('不算推荐数字'), '缺项时应写明不出推荐数字');
    assert.equal(html.includes('推荐方案与依据'), false, '缺项时不应出「推荐方案与依据」那一段');
    assert.ok(html.includes('未设置'), '空库现值应写「未设置」不编 0');
  });

  it('改类 3 条空库 exit4 不落盘', () => {
    for (const { wake, params } of GAI) {
      const dir = mkDb(false);
      const r = runCli(dir, params);
      assert.equal(r.status, 4, wake + ' 空库应 exit 4，实测 ' + r.status + ' ' + r.stderr);
      assert.equal(r.file, null, wake + ' exit 4 不得落盘');
      assert.match(r.stderr, /尚无目标/, wake + ' 报错应指名先定目标');
    }
  });

  it('暂停／重启两条走 exit2 不出页（空库＋有库各一遍）', () => {
    for (const wake of ['暂停所有目标', '重启所有目标']) {
      for (const [label, seed] of [['空库', false], ['有库', true]]) {
        const dir = mkDb(seed);
        const r = runCli(dir, { wake });
        assert.equal(r.status, 2, wake + label + '应 exit 2，实测 ' + r.status + ' ' + r.stderr);
        assert.equal(r.file, null, wake + label + ' exit 2 不得出页');
        assert.match(r.stderr, /不出预检页/, wake + label + ' 报错应指名不出预检页');
      }
    }
  });
});
