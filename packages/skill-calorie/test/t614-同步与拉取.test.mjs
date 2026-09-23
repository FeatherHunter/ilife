/** #614 · 同步到训记／拉训记实绩两条薄命令（训记对外命令的薄包装 ＋ 过程页／结果页）。
 *
 * 一律挡板：**不许打真实训记接口**（真机联调另票）。外调跑道（`invokeXunji`）spawn 的是包内
 * `dist/xunji/cli.js`；#676 删掉 `CALORIE_XUNJI_STUB` 之后它没有可配出口，故实跑一律走
 * **没配 KEY 的真路径**（`attempts: 0`，不调网）——本件标的正是「本地缺 KEY 必须判成没调远端」
 * 与两条 dryRun 过程页。`fail()` 即 `process.exit`，失败路径一律走真子进程断言（in-process 调会自杀）。
 *
 * 票面验收（各有独立用例）：
 * ① 两条各走通 dryRun（push ＋ backfill，真子进程转换，远端未调用）；
 * ② 真出口读数：真 CLI 落盘，`data.output` 绝对路径存在；
 * ③ 任一步失败非 0 点名（用法 2／本地缺 KEY 3，stderr 点名步骤与分类）；
 * ④ 本地成远端没成分得清（无 KEY 即使子进程退 3 也判本地缺 KEY，`attempts: 0` 作证）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't614-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** 种子计划（同 `docs/research/t81-seed.mjs` 的训练计划两段：周1周三 下肢［深蹲］／周2周一 上肢［硬拉］）。 */
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

const PUSH_OK_STUB = {
  code: 0,
  data: {
    date: '2026-09-07', session_count: 1, ok_count: 1, fail_count: 0, verify_note: VERIFY_NOTE,
    results: [{ session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: true, verified: false, resp: { dry_run: false } }],
  },
};

const BACKFILL_OK_STUB = {
  code: 0,
  data: {
    end_date: '2026-09-07', days: 1, total_inserted: 2, total_updated: 0,
    results: [{
      date: '2026-09-07', fetch_ok: true, trains_count: 2, inserted: 2, updated: 0,
      skipped_empty: false, body_weight_kg: 70.5, errors: [], err: null, failure: null,
    }],
  },
};

const PUSH_NOKEY_STUB = {
  code: 3,
  data: {
    date: '2026-09-07', session_count: 1, ok_count: 0, fail_count: 1, verify_note: VERIFY_NOTE,
    results: [{
      session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: false, verified: false,
      resp: { err: true, error_type: 'auth', message: '未配置训记 KEY', retry_after: null, raw_body: null, code: null, attempts: 0 },
    }],
  },
};

let dispatchWrite = null;
let openDb = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  ({ dispatchWrite } = await import('../dist/cli/write.js'));
  ({ openDb } = await import('../dist/index.js'));
});

function seedDir() {
  const dir = tmp('db');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedPlan(db);
  return { dir, db };
}

/** 训记入口指向 fixture（见 `helpers/land-fixture.mjs` 件头；#757 起跨技能两出口删键，本件不测落地链，无需文件缝）。 */
const LAND_FIXTURE = join(HERE, 'helpers', 'land-fixture.mjs');

/** 一份「库目录 ＋ 训记入口指向 fixture」的配置目录。 */
function cfg(dir) {
  return calorieConfigDir(dir, {
    xunji: { cli: LAND_FIXTURE },
  });
}

describe('#614 同步与拉取', () => {
  it('①a push dryRun 走通（真子进程转换）：审计＋待推送段＋远端未调用', () => {
    const { dir, db } = seedDir();
    try {
      calorieConfigDir(dir);
      const out = dispatchWrite('calorie.workout.xunji-push', { date: '2026-09-07', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /预演：2026-09-07 1 段待推送（远端未调用）/);
      assert.equal(out.data.receipt.op, 'create');
      assert.match(out.html, /过程页/);
      assert.match(out.html, /硬拉/);
      assert.match(out.html, /训记可识别/);
      assert.match(out.html, /远端.*未调用/);
      assert.match(out.html, /ilife-page/);
    } finally {
      db.close();
    }
  });

  it('①b push 空天回「无事可做」页（#943 第三选项）：exit 0 ＋ 说明页，回执不写成功，子进程一次不调', () => {
    const { dir, db } = seedDir();
    db.close();
    const log = join(dir, 'fixture-calls.jsonl');
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-04', dryRun: true }, {
      ...homeEnvOf(cfg(dir)), T676_LAND_FIXTURE_LOG: log,
    });
    assert.equal(r.code, 0, r.stderr.slice(-300));
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, 'calorie.workout.xunji-push');
    assert.equal(env.data.ok, true, '命令没出错（既不算成功、也不算失败）');
    assert.match(env.data.message, /没有可落地的训练段：这天是休息日/);
    assert.equal(env.data.receipt.noChange, true, '什么都没发生：回执按全仓既有口径标 noChange');
    assert.deepEqual(env.data.receipt.writtenFields, []);
    assert.equal(env.data.receipt.items[0].status, '没有安排', '状态串不写「成功」');
    const html = readFileSync(env.data.output, 'utf8');
    assert.match(html, /这天没有安排（无事可做）/);
    assert.match(html, /这天是休息日/);
    assert.ok(!existsSync(log), '空天不该起推送子进程：' + (existsSync(log) ? readFileSync(log, 'utf8') : ''));
  });

  it('①c push dryRun 审计只提示不拦推（深蹲不在库：不通过＋建议名＋仍出页）', () => {
    const { dir, db } = seedDir();
    try {
      calorieConfigDir(dir);
      const out = dispatchWrite('calorie.workout.xunji-push', { date: '2026-09-02', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.html, /深蹲/);
      assert.match(out.html, /训记不识别（仍会原样推送）/);
    } finally {
      db.close();
    }
  });

  it('①d backfill dryRun 走通（不调子进程）：区间＋三步预告＋幂等口径', () => {
    const { dir, db } = seedDir();
    try {
      const out = dispatchWrite('calorie.workout.xunji-backfill', { date: '2026-09-07', days: 1, dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /预演：从训记拉 2026-09-07 往前 1 天/);
      assert.equal(out.data.receipt.op, 'update');
      assert.match(out.html, /过程页/);
      assert.match(out.html, /三步预告/);
      assert.match(out.html, /重复拉取/);
      assert.match(out.html, /ilife-page/);
    } finally {
      db.close();
    }
  });

  it('①e push 结果页走通（fixture 回执）：逐段结局＋本地远端分清', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-07' }, { ...homeEnvOf(cfg(dir))});
    assert.equal(r.code, 0, r.stderr.slice(-400));
    const out = JSON.parse(r.stdout).data;
    assert.match(out.message, /已同步 2026-09-07.*1 段成功/);
    assert.match(readFileSync(out.output, 'utf8'), /结果页/);
    assert.match(readFileSync(out.output, 'utf8'), /逐段推送结局/);
    assert.match(readFileSync(out.output, 'utf8'), /训记落笔 1 段/);
  });

  it('①f backfill 结果页走通（fixture 回执）：逐天结局＋新增更新合计', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.xunji-backfill', { date: '2026-09-07', days: 1 }, { ...homeEnvOf(cfg(dir))});
    assert.equal(r.code, 0, r.stderr.slice(-400));
    const out = JSON.parse(r.stdout).data;
    assert.match(out.message, /新增 2，更新 0/);
    const html = readFileSync(out.output, 'utf8');
    assert.match(html, /结果页/);
    assert.match(html, /逐天回写结局/);
    assert.match(html, /2 条训练/);
  });

  it('② 真出口读数：真 CLI 落盘，回执绝对路径存在（两条 dryRun 各一次）', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.xunji-push', { date: '2026-09-07', dryRun: true }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(a.code, 0, a.stderr.slice(-400));
    const enva = JSON.parse(a.stdout);
    assert.equal(enva.key, 'calorie.workout.xunji-push');
    assert.ok(isAbsolute(enva.data.output), '回执路径须为绝对路径：' + enva.data.output);
    assert.ok(existsSync(enva.data.output), '回执页未落盘：' + enva.data.output);
    assert.match(readFileSync(enva.data.output, 'utf8'), /ilife-page/);
    const b = cli('calorie.workout.xunji-backfill', { date: '2026-09-07', days: 1, dryRun: true }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(b.code, 0, b.stderr.slice(-400));
    const envb = JSON.parse(b.stdout);
    assert.ok(isAbsolute(envb.data.output) && existsSync(envb.data.output), '回执页未落盘');
  });

  it('③a 用法错 exit 2 点名（坏 days／非布尔 dryRun／非真实日历日）', () => {
    const { dir, db } = seedDir();
    db.close();
    assert.equal(cli('calorie.workout.xunji-backfill', { days: 0 }, { ...homeEnvOf(calorieConfigDir(dir))}).code, 2);
    assert.equal(cli('calorie.workout.xunji-push', { dryRun: 'yes' }, { ...homeEnvOf(calorieConfigDir(dir))}).code, 2);
    // 形状过（YYYY-MM-DD）但日历上没这一天：算不出周次，会被人话误判成「这天是休息日」——
    // 故父进程在用法层就拦（exit 2）。旧口径这一档由子进程的现实校验拦，退 4。
    const bad = cli('calorie.workout.xunji-push', { date: '2026-13-40' }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(bad.code, 2, bad.stderr.slice(-300));
    assert.match(bad.stderr, /date 不是真实日历日（实际：2026-13-40）/);
  });

  it('③b 无计划 exit 4 点名（空库，不调外部）', () => {
    const dir = tmp('empty');
    openDb(join(dir, 'calorie_data.db')).close();
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-07', dryRun: true }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(r.code, 4);
    assert.match(r.stderr, /无训练计划/);
  });

  it('③c 本地缺 KEY exit 3 点名没调远端（配置里没配 xunji.key：push／backfill 都判本地）', () => {
    const { dir, db } = seedDir();
    db.close();
    const noKey = { ...homeEnvOf(calorieConfigDir(dir))};
    const a = cli('calorie.workout.xunji-push', { date: '2026-09-07' }, noKey);
    assert.equal(a.code, 3, a.stderr.slice(-300));
    assert.match(a.stderr, /本地缺 KEY（没调远端）/);
    const b = cli('calorie.workout.xunji-backfill', { date: '2026-09-07', days: 1 }, noKey);
    assert.equal(b.code, 3, b.stderr.slice(-300));
    assert.match(b.stderr, /本地缺 KEY（没调远端）/);
  });

  it('③d fixture 远端失败 exit 4 点名段数（push fail_count 走远端档）', () => {
    const { dir, db } = seedDir();
    db.close();
    const fail = {
      code: 3,
      data: {
        date: '2026-09-07', session_count: 2, ok_count: 1, fail_count: 1, verify_note: VERIFY_NOTE,
        results: [
          { session_label: '上肢', ok: true, verified: false, resp: {} },
          { session_label: '下肢', ok: false, verified: false, resp: { err: true, error_type: 'server', code: 500, attempts: 3 } },
        ],
      },
    };
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-07' }, {
      ...homeEnvOf(cfg(dir)), T676_LAND_FIXTURE: JSON.stringify({ 'push-plan': fail }),
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /远端推送失败/);
  });

  it('③e 无 KEY 退 3 数据也判本地（push 全 attempts 0 鉴权错；训记入口仍走真子进程）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.xunji-push', { date: '2026-09-07' }, {
      ...homeEnvOf(calorieConfigDir(dir)),
    });
    assert.equal(r.code, 3, r.stderr.slice(-300));
    assert.match(r.stderr, /本地缺 KEY（没调远端）/);
  });

  it('④ 码翻译表：2→3，其余→4（跑道纯函数，无外部）', async () => {
    const { xunjiExitToCmd, XUNJI_SPAWN_TIMEOUT_MS } = await import('../dist/workout/xunjiRunner.js');
    assert.equal(xunjiExitToCmd(1), 4);
    assert.equal(xunjiExitToCmd(2), 3);
    assert.equal(xunjiExitToCmd(3), 4);
    assert.equal(xunjiExitToCmd(4), 4);
    assert.ok(XUNJI_SPAWN_TIMEOUT_MS >= 60000);
  });
});
