/** #613 · 批量落地宿主命令（今天→本周日／今天→本月末自算天数，逐天复用单日链）。
 *
 * 隔离口径（#676）：跨技能那两步（补计划＝作息、记心愿＝备忘）经配置里的两个出口
 * `land.scheduleCli`／`land.memoCli` 指向 `test/helpers/land-fixture.mjs`（**不许真调**，
 * 会写用户的真库）；训记那两步走包内 `dist/xunji/cli.js`，本票没给它配出口，故实跑会在
 * 「没配 KEY」处**确定性失败**（`attempts: 0`，不调网）——逐天读取与 fail-fast 因此仍是可判的。
 * `fail()` 即 `process.exit`，失败路径一律走真子进程断言（in-process 调会自杀）。
 *
 * 票面验收（各有独立用例）：
 * ① 给定日期 → 天数正确（含跨月：周末批可进下月；闰月月末收敛）；
 * ② 7 天全过 → 推送与回写各 7 天（同一份天数，修老“批量只进 Step3”）；
 * ③ 第 3 天失败 → 回执点名第 3 天且退出非 0；
 * ④ 真出口读数：真 CLI 落盘，`data.output` 绝对路径存在（过程页 dryRun＋结果页实跑）；
 * ⑤ R3 双桥真实现（作息／备忘缺省走真合成写，可注入 `RunSyncDeps` 同形函数）。
 */
import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

/** 跨技能出口 fixture（见 `helpers/land-fixture.mjs` 件头）。 */
const LAND_FIXTURE = join(HERE, 'helpers', 'land-fixture.mjs');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't613-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** 种子计划（同 `t612`：周1周三 下肢［深蹲］／周2周一 上肢［硬拉］，2026-09-07 落后者）。 */
function seedPlan(db) {
  db.exec('CREATE TABLE IF NOT EXISTS workout_plan_config (id INTEGER PRIMARY KEY, title TEXT, version TEXT, description TEXT, total_weeks INTEGER, start_date TEXT)');
  db.exec('CREATE TABLE IF NOT EXISTS workout_plans (week_number INTEGER, day_of_week INTEGER, session_index INTEGER, session_label TEXT, time_start TEXT, time_end TEXT, is_rest_day INTEGER, total_sets INTEGER, movements TEXT)');
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-01')").run();
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (2, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
}

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

const SCHED_OK = { code: 0, data: { ok: true, message: '批量补计划', op: 'ensure', local: 'created', remote: 'found_feishu', remoteId: 'fs_1', achieved: true, errors: [], notes: [] } };
const SCHED_FAIL = { code: 4, data: { ok: false, message: '批量补计划没达成', op: 'ensure', local: 'created', remote: 'unavailable', remoteId: null, achieved: false, errors: ['2026-09-07：远端没成'], notes: [] } };
const MEMO_OK = { code: 0, data: { ok: true, message: '已记一条：1', local: 'created', remote: 'synced', remoteId: 'task_1' } };
const MEMO_FAIL = { code: 4, data: { ok: false, message: '远端没成', local: 'created', remote: 'unavailable', remoteId: null } };
const PUSH_OK = {
  code: 0,
  data: {
    date: '2026-09-07', session_count: 1, ok_count: 1, fail_count: 0, verify_note: '挡板',
    results: [{ session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: true, verified: false, resp: { dry_run: false } }],
  },
};
const BACKFILL_OK = {
  code: 0,
  data: {
    end_date: '2026-09-07', days: 1, total_inserted: 2, total_updated: 0,
    results: [{
      date: '2026-09-07', fetch_ok: true, trains_count: 2, inserted: 2, updated: 0,
      skipped_empty: false, body_weight_kg: 70.5, errors: [], err: null, failure: null,
    }],
  },
};

function seedDir() {
  const dir = tmp('db');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedPlan(db);
  return { dir, db };
}

function seedFile() {
  const dir = tmp('filedb');
  const file = join(dir, 'calorie_data.db');
  const db = openDb(file);
  seedPlan(db);
  db.close();
  return file;
}

/** 一份「库目录 ＋ 三处外调（跨技能两出口／训记入口）都指向 fixture」的配置目录。 */
function cfg(dir) {
  return calorieConfigDir(dir, {
    land: { scheduleCli: LAND_FIXTURE, memoCli: LAND_FIXTURE },
    xunji: { cli: LAND_FIXTURE },
  }) && dir;
}

let dispatchWrite = null;
let openDb = null;
let batchDates = null;
let runLandBatchDays = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  assert.ok(existsSync(LAND_FIXTURE), '缺跨技能出口 fixture：' + LAND_FIXTURE);
  ({ dispatchWrite } = await import('../dist/cli/write.js'));
  ({ openDb } = await import('../dist/index.js'));
  ({ batchDates, runLandBatchDays } = await import('../dist/workout/landBatch.js'));
});

describe('#613 批量落地', () => {
  it('①a 本周末天数：周四→4 天（今天到周日，含两端）', () => {
    assert.deepEqual(batchDates('2026-09-17', 'weekend'), ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']);
  });

  it('①b 本周末天数：周一→7 天／周日→1 天（两端收敛）', () => {
    assert.deepEqual(
      batchDates('2026-09-07', 'weekend'),
      ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'],
    );
    assert.deepEqual(batchDates('2026-09-13', 'weekend'), ['2026-09-13']);
  });

  it('①c 本周末天数：跨月（09-30 周三→10-04 周日，5 天）', () => {
    assert.deepEqual(
      batchDates('2026-09-30', 'weekend'),
      ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
    );
  });

  it('①d 本月底天数：09-17→14 天／09-30→1 天（月末收敛）', () => {
    const days = batchDates('2026-09-17', 'monthend');
    assert.equal(days.length, 14);
    assert.equal(days[0], '2026-09-17');
    assert.equal(days[13], '2026-09-30');
    assert.deepEqual(batchDates('2026-09-30', 'monthend'), ['2026-09-30']);
  });

  it('①e 本月底天数：闰月（2024-02-15→29，共 15 天）', () => {
    const days = batchDates('2024-02-15', 'monthend');
    assert.equal(days.length, 15);
    assert.equal(days[14], '2024-02-29');
  });

  it('①f 坏日期抛错（调用方按用法错 exit 2）', () => {
    assert.throws(() => batchDates('2026-13-40', 'weekend'));
    assert.throws(() => batchDates('今天', 'monthend'));
  });

  it('② 7 天全过 → 推送与回写各 7 天（同一份天数）', () => {
    const dates = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
    const seen = [];
    const out = runLandBatchDays(dates, (date) => {
      seen.push(date);
      return { code: 0, message: '已落地 ' + date, stderr: '', stubbed: true };
    });
    assert.deepEqual(seen, dates);
    assert.equal(out.pushDays, 7);
    assert.equal(out.backfillDays, 7);
    assert.equal(out.failed, null);
    assert.equal(out.reads.filter((r) => r.ok).length, 7);
  });

  it('③ 第 3 天失败 → 点名第 3 天（fail-fast，前两天计入）', () => {
    const dates = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
    const out = runLandBatchDays(dates, (date) => (
      date === '2026-09-09'
        ? { code: 4, message: '', stderr: '单日链没过', stubbed: false }
        : { code: 0, message: '已落地 ' + date, stderr: '', stubbed: true }
    ));
    assert.ok(out.failed !== null);
    assert.equal(out.failed.index, 3);
    assert.equal(out.failed.date, '2026-09-09');
    assert.equal(out.pushDays, 2);
    assert.equal(out.backfillDays, 2);
    assert.equal(out.reads.length, 3);
  });

  it('④a dryRun 走通（零子进程）：7 天 1 段＋可复制实跑指令＋远端未调用', () => {
    const { dir, db } = seedDir();
    try {
      cfg(dir);
      const out = dispatchWrite('calorie.workout.land-weekend', { date: '2026-09-07', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /预演：2026-09-07 至本周末 7 天 1 段待落地（远端未调用）/);
      assert.match(out.html, /过程页/);
      assert.match(out.html, /复制实跑指令/);
      assert.match(out.html, /远端.*未调用/);
      assert.match(out.html, /ilife-page/);
    } finally {
      db.close();
    }
  });

  it('④b dryRun 月末走通（09-30→1 天，同一条链）', () => {
    const { dir, db } = seedDir();
    try {
      cfg(dir);
      const out = dispatchWrite('calorie.workout.land-monthend', { date: '2026-09-30', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /预演：2026-09-30 至本月底 1 天/);
    } finally {
      db.close();
    }
  });

  it('④c 真出口读数：真 CLI dryRun 落盘，回执绝对路径存在', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.land-weekend', { date: '2026-09-07', dryRun: true }, { ILIFE_CONFIG_DIR: cfg(dir) });
    assert.equal(a.code, 0, a.stderr.slice(-400));
    const env = JSON.parse(a.stdout);
    assert.equal(env.key, 'calorie.workout.land-weekend');
    assert.ok(isAbsolute(env.data.output), '回执路径须为绝对路径：' + env.data.output);
    assert.ok(existsSync(env.data.output), '回执页未落盘：' + env.data.output);
    assert.match(readFileSync(env.data.output, 'utf8'), /ilife-page/);
  });

  it('④d 真出口实跑 7 天（三处外调全走 fixture）：推送 7 天 回写 7 天', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.land-weekend', { date: '2026-09-07' }, { ILIFE_CONFIG_DIR: cfg(dir) });
    assert.equal(a.code, 0, a.stderr.slice(-500));
    const env = JSON.parse(a.stdout);
    assert.match(env.data.message, /共 7 天 推送 7 天 回写 7 天/);
    assert.ok(existsSync(env.data.output), '回执页未落盘：' + env.data.output);
    assert.match(readFileSync(env.data.output, 'utf8'), /逐天结局/);
  });

  it('④e 真出口实跑月末 1 天（09-30）：推送 1 天 回写 1 天', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.land-monthend', { date: '2026-09-30' }, { ILIFE_CONFIG_DIR: cfg(dir) });
    assert.equal(a.code, 0, a.stderr.slice(-500));
    const env = JSON.parse(a.stdout);
    assert.match(env.data.message, /共 1 天 推送 1 天 回写 1 天/);
  });

  it('③b 真 CLI 第 3 天失败 → exit 非 0 且点名第 3 天日期（fail-fast，前两天计入）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land-weekend', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: cfg(dir), T676_LAND_FIXTURE_FAIL_DATE: '2026-09-09',
    });
    assert.notEqual(r.code, 0, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在第 3 天 2026-09-09/);
  });

  it('③c 真 CLI 用法错 exit 2（非布尔 dryRun）＋ 空库 exit 4 ＋ 缺开始日期 exit 4', () => {
    const { dir, db } = seedDir();
    db.close();
    assert.equal(cli('calorie.workout.land-weekend', { dryRun: 'yes' }, { ILIFE_CONFIG_DIR: cfg(dir) }).code, 2);
    const empty = tmp('empty');
    openDb(join(empty, 'calorie_data.db')).close();
    const r = cli('calorie.workout.land-weekend', { date: '2026-09-07', dryRun: true }, { ILIFE_CONFIG_DIR: cfg(empty) });
    assert.equal(r.code, 4);
    assert.match(r.stderr, /无训练计划/);
    const nostart = tmp('nostart');
    const ndb = openDb(join(nostart, 'calorie_data.db'));
    seedPlan(ndb);
    ndb.prepare("UPDATE workout_plan_config SET start_date = '' WHERE id = 1").run();
    ndb.close();
    const n = cli('calorie.workout.land-weekend', { date: '2026-09-07', dryRun: true }, { ILIFE_CONFIG_DIR: cfg(nostart) });
    assert.equal(n.code, 4);
    assert.match(n.stderr, /缺开始日期/);
  });

  it('⑤a R3 作息桥真实现（fixture 成功）：不再恒 skip，真写段', async () => {
    const { landPlanStep } = await import('../dist/workout/land.js');
    const file = seedFile();
    cfg(tmp('cfg-a'));
    delete process.env.T676_LAND_FIXTURE;
    const r = await landPlanStep(['2026-09-07'], { dbFile: file });
    assert.equal(r.ok, true);
    assert.equal(r.skipped, undefined);
    assert.match(r.note ?? '', /已写 1 段/);
  });

  it('⑤b R3 备忘桥真实现（fixture 成功）：不再恒 skip，真记条', async () => {
    const { landWishStep } = await import('../dist/workout/land.js');
    const file = seedFile();
    cfg(tmp('cfg-b'));
    delete process.env.T676_LAND_FIXTURE;
    const r = await landWishStep(['2026-09-07'], { dbFile: file });
    assert.equal(r.ok, true);
    assert.equal(r.skipped, undefined);
    assert.match(r.note ?? '', /已记 1 条/);
  });

  it('⑤c R3 双桥失败回结局（fixture 回 4→code 3；无库→code 1）', async () => {
    const { landPlanStep, landWishStep } = await import('../dist/workout/land.js');
    const file = seedFile();
    cfg(tmp('cfg-c'));
    process.env.T676_LAND_FIXTURE = JSON.stringify({ 'schedule.plan.write': SCHED_FAIL });
    const p = await landPlanStep(['2026-09-07'], { dbFile: file });
    assert.equal(p.ok, false);
    assert.equal(p.code, 3);
    process.env.T676_LAND_FIXTURE = JSON.stringify({ 'memo.create': MEMO_FAIL });
    const w = await landWishStep(['2026-09-07'], { dbFile: file });
    assert.equal(w.ok, false);
    assert.equal(w.code, 3);
    const missing = await landPlanStep(['2026-09-07'], { dbFile: join(tmp('nope'), 'calorie_data.db') });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, 1);
  });

  it('⑤d R3 双桥可注入（RunSyncDeps 同形函数优先于缺省实现）', async () => {
    const { landPlanStep, landWishStep } = await import('../dist/workout/land.js');
    const p = await landPlanStep(['2026-09-07'], { plan: async (ds) => ({ ok: true, note: '注入 ' + ds.length + ' 天' }) });
    assert.equal(p.ok, true);
    assert.match(p.note ?? '', /注入 1 天/);
    const w = await landWishStep(['2026-09-07'], { wish: async () => ({ ok: false, code: 3, error: '注入失败' }) });
    assert.equal(w.ok, false);
    assert.equal(w.code, 3);
  });
});
