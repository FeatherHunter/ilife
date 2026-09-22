/** 查／设／清训记 KEY 三条命令（缺 KEY 自救链）＋ 预演页 KEY 行与缺 KEY 下一步。
 *
 * 背景：落地链天天要 KEY，但 DSH 会话里没有 `node`、调不了 `xunji key …` 子命令，
 * 旧报错只说「先看训记 KEY 状态再重试」却没给可跑的命令，预演页也不看 KEY。
 * 本件断言（真子进程，不打真网；KEY 面只读写临时家目录的配置文件）：
 * ① 查状态：没配／配了都 exit 0 出页（未配不是失败）；② 设 KEY：写入后状态变已配，
 *    KEY 全串不进 stdout／HTML；③ 用法错 exit 2（空／超长／清缺 confirm）；
 * ④ 缺 KEY 时同步 exit 3 且 stderr 带可复制的下一步；⑤ 预演页带训记 KEY 行。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// 测试隔离基座：当刻进程家目录先接到临时目录，真库与真实家目录零接触。
configTestBase();

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 'xkey-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

function cli(key, params, env = {}) {
  try {
    const stdout = execFileSync(NODE_BIN, [CLI, key, '--params', JSON.stringify(params)], {
      encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env },
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') };
  }
}

function seedPlan(db) {
  db.exec('CREATE TABLE IF NOT EXISTS workout_plan_config (id INTEGER PRIMARY KEY, title TEXT, version TEXT, description TEXT, total_weeks INTEGER, start_date TEXT)');
  db.exec('CREATE TABLE IF NOT EXISTS workout_plans (week_number INTEGER, day_of_week INTEGER, session_index INTEGER, session_label TEXT, time_start TEXT, time_end TEXT, is_rest_day INTEGER, total_sets INTEGER, movements TEXT)');
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-01')").run();
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (2, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
}

let dispatchWrite = null;
let dispatchRead = null;
let openDb = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  ({ dispatchWrite } = await import('../dist/cli/write.js'));
  ({ dispatch: dispatchRead } = await import('../dist/cli/cmd_read.js'));
  ({ openDb } = await import('../dist/index.js'));
});

const FAKE_KEY = 'TESTKEY-abc123';

describe('训记 KEY 自救链', () => {
  it('① 查状态：没配也 exit 0（未配是答案，不是失败）＋ 给下一步', () => {
    const dir = tmp('empty');
    const db = openDb(join(dir, 'calorie_data.db'));
    try {
      calorieConfigDir(dir);
      const out = dispatchRead('calorie.view.xunji-key', {}, db);
      assert.equal(out.data.configured, false);
      assert.match(out.html, /未配/);
      assert.match(out.html, /设训记KEY/);
      assert.match(out.html, /ilife-page/);
    } finally {
      db.close();
    }
  });

  it('② 设 KEY：写入后查状态变已配，KEY 全串不进 stdout／HTML', () => {
    const dir = tmp('set');
    const db = openDb(join(dir, 'calorie_data.db'));
    try {
      const env = homeEnvOf(calorieConfigDir(dir));
      const r = cli('calorie.workout.xunji-key-set', { xunjiKey: FAKE_KEY }, env);
      assert.equal(r.code, 0, r.stderr.slice(-400));
      assert.ok(!r.stdout.includes(FAKE_KEY), 'stdout 含 KEY 全串');
      const out = JSON.parse(r.stdout).data;
      assert.match(out.message, /已写入/);
      const html = readFileSync(out.output, 'utf8');
      assert.ok(!html.includes(FAKE_KEY), 'HTML 含 KEY 全串');
      assert.match(html, /\*\*\*/);
      const s = cli('calorie.view.xunji-key', {}, env);
      assert.equal(s.code, 0, s.stderr.slice(-400));
      const status = JSON.parse(s.stdout).data;
      assert.equal(status.configured, true);
      assert.equal(status.preview, 'TEST...23');
    } finally {
      db.close();
    }
  });

  it('③ 用法错 exit 2（空 KEY／超长 KEY／清缺 confirm）', () => {
    const dir = tmp('bad');
    const env = homeEnvOf(calorieConfigDir(dir));
    assert.equal(cli('calorie.workout.xunji-key-set', { xunjiKey: '  ' }, env).code, 2);
    assert.equal(cli('calorie.workout.xunji-key-set', { xunjiKey: 'k'.repeat(1025) }, env).code, 2);
    assert.equal(cli('calorie.workout.xunji-key-set', {}, env).code, 2);
    const c = cli('calorie.workout.xunji-key-clear', {}, env);
    assert.equal(c.code, 2);
    assert.match(c.stderr, /confirm/);
  });

  it('④ 清 KEY：confirm:true 才清，清完回未配', () => {
    const dir = tmp('clear');
    const env = homeEnvOf(calorieConfigDir(dir));
    assert.equal(cli('calorie.workout.xunji-key-set', { xunjiKey: FAKE_KEY }, env).code, 0);
    const c = cli('calorie.workout.xunji-key-clear', { confirm: true }, env);
    assert.equal(c.code, 0, c.stderr.slice(-400));
    const s = cli('calorie.view.xunji-key', {}, env);
    assert.equal(JSON.parse(s.stdout).data.configured, false);
  });

  it('⑤ 缺 KEY 时同步 exit 3，且 stderr 带可复制的下一步（查状态→设 KEY）', () => {
    const dir = tmp('nokey');
    const db = openDb(join(dir, 'calorie_data.db'));
    seedPlan(db);
    db.close();
    const env = homeEnvOf(calorieConfigDir(dir));
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-07' }, env);
    assert.equal(r.code, 3, r.stderr.slice(-300));
    assert.match(r.stderr, /本地缺 KEY（没调远端）/);
    assert.match(r.stderr, /calorie\.view\.xunji-key/);
    assert.match(r.stderr, /calorie\.workout\.xunji-key-set/);
  });

  it('⑥ 预演页带训记 KEY 行（未配即警告实跑会停）', () => {
    const dir = tmp('dry');
    const db = openDb(join(dir, 'calorie_data.db'));
    seedPlan(db);
    try {
      calorieConfigDir(dir);
      const push = dispatchWrite('calorie.workout.xunji-push', { date: '2026-09-07', dryRun: true }, db);
      assert.match(push.html, /训记 KEY/);
      assert.match(push.html, /未配/);
      const week = dispatchWrite('calorie.workout.land-weekend', { date: '2026-09-07', dryRun: true }, db);
      assert.match(week.html, /训记 KEY/);
      assert.match(week.html, /预演说明/);
    } finally {
      db.close();
    }
  });

  it('⑦ 批量预演 0 段有点名原因（开始日期＋看完整计划），不是空页', () => {
    const dir = tmp('zero');
    const db = openDb(join(dir, 'calorie_data.db'));
    seedPlan(db);
    try {
      calorieConfigDir(dir);
      // 2026-09-22 起 6 天在种子计划里全是空天（第 4 周，周二起无排练）。
      const out = dispatchWrite('calorie.workout.land-weekend', { date: '2026-09-22', dryRun: true }, db);
      assert.match(out.data.message, /6 天 0 段/);
      assert.match(out.html, /0 段说明/);
      assert.match(out.html, /看完整计划/);
    } finally {
      db.close();
    }
  });
});
