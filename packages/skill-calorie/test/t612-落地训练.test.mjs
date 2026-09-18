/** #612 · 落地训练宿主命令（读计划 → 补计划 → 记心愿 → 推送 → 回写，同一命令）。
 *
 * 隔离口径（#676）：跨技能那两步（补计划＝作息、记心愿＝备忘）**绝不真调**——配置里的两个出口
 * `land.scheduleCli`／`land.memoCli` 指向 `test/helpers/land-fixture.mjs`，让它吐出要的回执；
 * 训记那两步（推送／回写）走包内 `dist/xunji/cli.js`，本票没给它配出口，故这盘跑到那里会以
 * **「没配 KEY」确定性失败**（`attempts: 0`，不调网）——测的正是「本地缺 KEY 不许当真调远端」这条。
 * `fail()` 即 `process.exit`，失败路径一律走真子进程断言（in-process 调会自杀）。
 *
 * 票面验收（各有独立用例）：
 * ① 前两步真跑（dryRun 过程页 ＋ 合成写经 fixture 成功 ＋ 推送缺 KEY 即停）；
 * ② 真出口读数：真 CLI 落盘，`data.output` 绝对路径存在；
 * ③ 任一步失败非 0 点名（用法 2／无计划 4／记心愿 4／补计划 4／推送缺 KEY 3）；
 * ④ 计划读得到（种子库 1 段＋动作名上页）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't612-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** 种子计划（同 `t614`：周1周三 下肢［深蹲］／周2周一 上肢［硬拉］，2026-09-07 落后者）。 */
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

const VERIFY_NOTE = '响应里 verified=True 的表示训记已显式回执；verified=False 的实际可能已写入，'
  + '但训记 v2 接口响应缺陷导致 trains 为空——用 fetch --full 二次确认（归 #608）';

/** 跨技能出口 fixture（见 `helpers/land-fixture.mjs` 件头）。 */
const LAND_FIXTURE = join(HERE, 'helpers', 'land-fixture.mjs');

const SCHED_OK = { code: 0, data: { ok: true, message: '批量补计划', op: 'ensure', local: 'created', remote: 'found_feishu', remoteId: 'fs_1', achieved: true, errors: [], notes: [] } };
const SCHED_FAIL = { code: 4, data: { ok: false, message: '批量补计划没达成', op: 'ensure', local: 'created', remote: 'unavailable', remoteId: null, achieved: false, errors: ['2026-09-07：远端没成'], notes: [] } };
const MEMO_OK = { code: 0, data: { ok: true, message: '已记一条：1', local: 'created', remote: 'synced', remoteId: 'task_1' } };
const MEMO_FAIL = { code: 4, data: { ok: false, message: '远端没成', local: 'created', remote: 'unavailable', remoteId: null } };

let dispatchWrite = null;
let openDb = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  assert.ok(existsSync(LAND_FIXTURE), '缺跨技能出口 fixture：' + LAND_FIXTURE);
  ({ dispatchWrite } = await import('../dist/cli/write.js'));
  ({ openDb } = await import('../dist/index.js'));
});

/** 一份「库目录 ＋ 三处外调（跨技能两出口／训记入口）都指向 fixture」的配置目录；`responses` 决定 fixture 吐什么。 */
function cfg(dir, responses = {}) {
  if (Object.keys(responses).length > 0) process.env.T676_LAND_FIXTURE = JSON.stringify(responses);
  return calorieConfigDir(dir, {
    land: { scheduleCli: LAND_FIXTURE, memoCli: LAND_FIXTURE },
    xunji: { cli: LAND_FIXTURE },
  }) && dir;
}

/** 交给子进程的 fixture 行为表（JSON 串）。 */
function fixtureEnv(responses) {
  writeFileSync(join(tmpdir(), '.t676-land-probe'), '', { flag: 'a' });
  return { T676_LAND_FIXTURE: JSON.stringify(responses) };
}

function seedDir() {
  const dir = tmp('db');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedPlan(db);
  return { dir, db };
}

describe('#612 落地训练', () => {
  it('①a dryRun 走通（不进子进程）：1 段＋动作名＋可复制 prompt＋远端未调用', () => {
    const { dir, db } = seedDir();
    try {
      cfg(dir);
      const out = dispatchWrite('calorie.workout.land', { date: '2026-09-07', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /预演：2026-09-07 1 段待落地（远端未调用）/);
      assert.match(out.html, /过程页/);
      assert.match(out.html, /硬拉/);
      assert.match(out.html, /上肢/);
      assert.match(out.html, /复制实跑指令/);
      assert.match(out.html, /远端.*未调用/);
      assert.match(out.html, /ilife-page/);
    } finally {
      db.close();
    }
  });

  it('①b dryRun 空天走通（这天没排练，0 段，仍 exit 0 口径）', () => {
    const { dir, db } = seedDir();
    try {
      cfg(dir);
      const out = dispatchWrite('calorie.workout.land', { date: '2026-09-04', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /0 段待落地/);
      assert.match(out.html, /空天/);
    } finally {
      db.close();
    }
  });

  it('①c 四步走通（三处外调全走 fixture）：四步结局＋本地远端分清＋调用面留痕', () => {
    const { dir, db } = seedDir();
    db.close();
    const log = join(dir, 'fixture-calls.jsonl');
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: cfg(dir), T676_LAND_FIXTURE_LOG: log,
    });
    assert.equal(r.code, 0, r.stderr.slice(-400));
    const out = JSON.parse(r.stdout).data;
    assert.match(out.message, /已落地 2026-09-07/);
    const html = readFileSync(out.output, 'utf8');
    assert.match(html, /结果页/);
    assert.match(html, /四步结局/);
    assert.match(html, /补计划/);
    assert.match(html, /记心愿/);
    assert.match(html, /训记落笔 1 段/);
    // 调用面：补计划＋记心愿＋推送＋回写，各一次、按序（训记两条走配置里的 `xunji.cli`）。
    const calls = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(calls.map((c) => c.key), ['schedule.plan.write', 'memo.create', 'push-plan', 'backfill']);
    assert.equal(calls[0].params.dates.length, 1, '当天 1 段 → 批量一条');
    assert.equal(calls[1].params.category, '心愿');
    assert.equal(calls[2].rest.join(' '), '--date 2026-09-07');
    assert.equal(calls[3].rest.join(' '), '--date 2026-09-07 --days 1', '回写单日与落地天数同源');
  });

  it('② 真出口读数：真 CLI 落盘，回执绝对路径存在（dryRun）', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.land', { date: '2026-09-07', dryRun: true }, { ILIFE_CONFIG_DIR: calorieConfigDir(dir) });
    assert.equal(a.code, 0, a.stderr.slice(-400));
    const env = JSON.parse(a.stdout);
    assert.equal(env.key, 'calorie.workout.land');
    assert.ok(isAbsolute(env.data.output), '回执路径须为绝对路径：' + env.data.output);
    assert.ok(existsSync(env.data.output), '回执页未落盘：' + env.data.output);
    assert.match(readFileSync(env.data.output, 'utf8'), /ilife-page/);
  });

  it('③a 用法错 exit 2 点名（非布尔 dryRun）', () => {
    const { dir, db } = seedDir();
    db.close();
    assert.equal(cli('calorie.workout.land', { dryRun: 'yes' }, { ILIFE_CONFIG_DIR: calorieConfigDir(dir) }).code, 2);
  });

  it('③b 无计划 exit 4 点名（空库，不调外部）', () => {
    const dir = tmp('empty');
    openDb(join(dir, 'calorie_data.db')).close();
    const r = cli('calorie.workout.land', { date: '2026-09-07', dryRun: true }, { ILIFE_CONFIG_DIR: calorieConfigDir(dir) });
    assert.equal(r.code, 4);
    assert.match(r.stderr, /无训练计划/);
  });

  it('③c 第二步记心愿失败 exit 4 点名（fixture 备忘回 4）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: cfg(dir), T676_LAND_FIXTURE: JSON.stringify({ 'memo.create': MEMO_FAIL }),
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在记心愿/);
  });

  it('③d 补计划失败 exit 4 点名（fixture 作息回 4）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: cfg(dir), T676_LAND_FIXTURE: JSON.stringify({ 'schedule.plan.write': SCHED_FAIL }),
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在补计划/);
  });

  it('③e 推送缺 KEY exit 3 点名没调远端（不配 `xunji.cli`：真入口无 KEY 即判本地）', () => {
    const { dir, db } = seedDir();
    db.close();
    // 这一条要的就是真入口那一支：出口只配跨技能两处，训记入口留空（＝包内真入口）。
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: calorieConfigDir(dir, {
        land: { scheduleCli: LAND_FIXTURE, memoCli: LAND_FIXTURE },
      }),
    });
    assert.equal(r.code, 3, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在推送/);
    assert.match(r.stderr, /本地缺 KEY（没调远端）/);
  });

  it('③f fail-fast：推送没过就不会跑到回写（同一份读数只报第一个失败步）', () => {
    const { dir, db } = seedDir();
    db.close();
    const log = join(dir, 'fixture-calls.jsonl');
    const pushFail = {
      code: 3,
      data: {
        date: '2026-09-07', session_count: 1, ok_count: 0, fail_count: 1, verify_note: 'fixture',
        results: [{ session_label: '上肢', ok: false, verified: false, resp: { err: true, error_type: 'server', code: 500, attempts: 3 } }],
      },
    };
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      ILIFE_CONFIG_DIR: cfg(dir), T676_LAND_FIXTURE: JSON.stringify({ 'push-plan': pushFail }), T676_LAND_FIXTURE_LOG: log,
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在推送/);
    assert.match(r.stderr, /远端推送失败|成功 0 段/, '远端档要点出段数');
    assert.ok(!/失败在回写/.test(r.stderr), '第一个失败步之后不许再报后面的步');
    // 补计划／记心愿／推送各调一次；回写一次都没有（推送一失败即停）。
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l).key),
      ['schedule.plan.write', 'memo.create', 'push-plan']);
  });

  it('⑤ R3 双桥真实现（#613 收口：缺省走真合成写，不再恒 skip；行为矩阵见 t613 ⑤）', async () => {
    const { landPlanStep, landWishStep } = await import('../dist/workout/land.js');
    const dir = tmp('bridge');
    const db = openDb(join(dir, 'calorie_data.db'));
    seedPlan(db);
    db.close();
    const file = join(dir, 'calorie_data.db');
    cfg(dir);
    const p = await landPlanStep(['2026-09-07'], { dbFile: file });
    const w = await landWishStep(['2026-09-07'], { dbFile: file });
    assert.equal(p.ok, true);
    assert.equal(p.skipped, undefined);
    assert.equal(w.ok, true);
    assert.equal(w.skipped, undefined);
  });
});
