/** #612 · 落地训练宿主命令（读计划 → 补计划 → 记心愿 → 推送 → 回写，同一命令）。
 *
 * 一律挡板：**不许打真实训记接口／真飞书**（真机联调另票）。四路挡板全经环境变量短路，
 * 生产调用方永远不设它们：
 * ① `CALORIE_LAND_SCHEDULE_STUB`（作息合成写）② `CALORIE_LAND_MEMO_STUB`（备忘合成写）
 * ③ `CALORIE_LAND_PUSH_STUB` ④ `CALORIE_LAND_BACKFILL_STUB`（训记两步，本票缝）。
 * `fail()` 即 `process.exit`，失败路径一律走真子进程断言（in-process 调会自杀）。
 *
 * 票面验收（各有独立用例）：
 * ① 四步走通一遍（dryRun 过程页 ＋ 四挡板全绿结果页 ＋ 空天零段）；
 * ② 真出口读数：真 CLI 落盘，`data.output` 绝对路径存在；
 * ③ 任一步失败非 0 点名（用法 2／无计划 4／第二步记心愿 4／补计划 4／推送缺 KEY 3／回写 4／坏挡板 4）；
 * ④ 计划读得到（种子库 1 段＋动作名上页；本地成远端没成分得清两行分开写）。
 */
import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

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

const SCHED_OK = { code: 0, data: { ok: true, message: '批量补计划', op: 'ensure', local: 'created', remote: 'found_feishu', remoteId: 'fs_1', achieved: true, errors: [], notes: [] } };
const SCHED_FAIL = { code: 4, data: { ok: false, message: '批量补计划没达成', op: 'ensure', local: 'created', remote: 'unavailable', remoteId: null, achieved: false, errors: ['2026-09-07：远端没成'], notes: [] } };
const MEMO_OK = { code: 0, data: { ok: true, message: '已记一条：1', local: 'created', remote: 'synced', remoteId: 'task_1' } };
const MEMO_FAIL = { code: 4, data: { ok: false, message: '远端没成', local: 'created', remote: 'unavailable', remoteId: null } };
const PUSH_OK = {
  code: 0,
  data: {
    date: '2026-09-07', session_count: 1, ok_count: 1, fail_count: 0, verify_note: VERIFY_NOTE,
    results: [{ session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: true, verified: false, resp: { dry_run: false } }],
  },
};
const PUSH_NOKEY = {
  code: 3,
  data: {
    date: '2026-09-07', session_count: 1, ok_count: 0, fail_count: 1, verify_note: VERIFY_NOTE,
    results: [{
      session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: false, verified: false,
      resp: { err: true, error_type: 'auth', message: '未配置训记 KEY', retry_after: null, raw_body: null, code: null, attempts: 0 },
    }],
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
const BACKFILL_FAIL = {
  code: 3,
  data: {
    end_date: '2026-09-07', days: 1, total_inserted: 0, total_updated: 0,
    results: [{ date: '2026-09-07', fetch_ok: false, trains_count: 0, inserted: 0, updated: 0, skipped_empty: false, err: null, failure: { message: '超时' } }],
  },
};

const STUB_KEYS = ['SKILLS_DB_PATH', 'CALORIE_LAND_SCHEDULE_STUB', 'CALORIE_LAND_MEMO_STUB', 'CALORIE_LAND_PUSH_STUB', 'CALORIE_LAND_BACKFILL_STUB', 'CALORIE_XUNJI_STUB'];
const savedEnv = {};
for (const k of STUB_KEYS) savedEnv[k] = process.env[k];

let dispatchWrite = null;
let openDb = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  ({ dispatchWrite } = await import('../dist/cli/write.js'));
  ({ openDb } = await import('../dist/index.js'));
});

afterEach(() => {
  for (const k of STUB_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function seedDir() {
  const dir = tmp('db');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedPlan(db);
  return { dir, db };
}

const ALL_OK = {
  CALORIE_LAND_SCHEDULE_STUB: JSON.stringify(SCHED_OK),
  CALORIE_LAND_MEMO_STUB: JSON.stringify(MEMO_OK),
  CALORIE_LAND_PUSH_STUB: JSON.stringify(PUSH_OK),
  CALORIE_LAND_BACKFILL_STUB: JSON.stringify(BACKFILL_OK),
};

describe('#612 落地训练', () => {
  it('①a dryRun 走通（不进子进程）：1 段＋动作名＋可复制 prompt＋远端未调用', () => {
    const { dir, db } = seedDir();
    try {
      process.env.SKILLS_DB_PATH = dir;
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
      process.env.SKILLS_DB_PATH = dir;
      const out = dispatchWrite('calorie.workout.land', { date: '2026-09-04', dryRun: true }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /0 段待落地/);
      assert.match(out.html, /空天/);
    } finally {
      db.close();
    }
  });

  it('①c 四步走通（四挡板全绿）：四步结局＋新增更新合计＋本地远端分清', () => {
    const { dir, db } = seedDir();
    try {
      Object.assign(process.env, { SKILLS_DB_PATH: dir, ...ALL_OK });
      const out = dispatchWrite('calorie.workout.land', { date: '2026-09-07' }, db);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /已落地 2026-09-07/);
      assert.match(out.html, /结果页/);
      assert.match(out.html, /四步结局/);
      assert.match(out.html, /补计划/);
      assert.match(out.html, /记心愿/);
      assert.match(out.html, /本地挡板/);
    } finally {
      db.close();
    }
  });

  it('② 真出口读数：真 CLI 落盘，回执绝对路径存在（dryRun）', () => {
    const { dir, db } = seedDir();
    db.close();
    const a = cli('calorie.workout.land', { date: '2026-09-07', dryRun: true }, { SKILLS_DB_PATH: dir });
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
    assert.equal(cli('calorie.workout.land', { dryRun: 'yes' }, { SKILLS_DB_PATH: dir }).code, 2);
  });

  it('③b 无计划 exit 4 点名（空库，不调外部）', () => {
    const dir = tmp('empty');
    openDb(join(dir, 'calorie_data.db')).close();
    const r = cli('calorie.workout.land', { date: '2026-09-07', dryRun: true }, { SKILLS_DB_PATH: dir });
    assert.equal(r.code, 4);
    assert.match(r.stderr, /无训练计划/);
  });

  it('③c 第二步记心愿失败 exit 4 点名（备忘挡板 4）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      SKILLS_DB_PATH: dir,
      CALORIE_LAND_SCHEDULE_STUB: JSON.stringify(SCHED_OK),
      CALORIE_LAND_MEMO_STUB: JSON.stringify(MEMO_FAIL),
      CALORIE_LAND_PUSH_STUB: JSON.stringify(PUSH_OK),
      CALORIE_LAND_BACKFILL_STUB: JSON.stringify(BACKFILL_OK),
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在记心愿/);
  });

  it('③d 补计划失败 exit 4 点名（作息挡板 4）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      SKILLS_DB_PATH: dir,
      CALORIE_LAND_SCHEDULE_STUB: JSON.stringify(SCHED_FAIL),
      CALORIE_LAND_MEMO_STUB: JSON.stringify(MEMO_OK),
      CALORIE_LAND_PUSH_STUB: JSON.stringify(PUSH_OK),
      CALORIE_LAND_BACKFILL_STUB: JSON.stringify(BACKFILL_OK),
    });
    assert.equal(r.code, 4, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在补计划/);
  });

  it('③e 推送缺 KEY exit 3 点名没调远端（挡板 fail_count 全 attempts 0）', () => {
    const { dir, db } = seedDir();
    db.close();
    const r = cli('calorie.workout.land', { date: '2026-09-07' }, {
      SKILLS_DB_PATH: dir,
      CALORIE_LAND_SCHEDULE_STUB: JSON.stringify(SCHED_OK),
      CALORIE_LAND_MEMO_STUB: JSON.stringify(MEMO_OK),
      CALORIE_LAND_PUSH_STUB: JSON.stringify(PUSH_NOKEY),
      CALORIE_LAND_BACKFILL_STUB: JSON.stringify(BACKFILL_OK),
    });
    assert.equal(r.code, 3, r.stderr.slice(-300));
    assert.match(r.stderr, /失败在推送/);
    assert.match(r.stderr, /本地缺 KEY（没调远端）/);
  });

  it('③f 回写失败 exit 4 点名（回写挡板 3）＋ 坏挡板 exit 4', () => {
    const { dir, db } = seedDir();
    db.close();
    const bad = cli('calorie.workout.land', { date: '2026-09-07' }, {
      SKILLS_DB_PATH: dir,
      CALORIE_LAND_SCHEDULE_STUB: JSON.stringify(SCHED_OK),
      CALORIE_LAND_MEMO_STUB: JSON.stringify(MEMO_OK),
      CALORIE_LAND_PUSH_STUB: JSON.stringify(PUSH_OK),
      CALORIE_LAND_BACKFILL_STUB: JSON.stringify(BACKFILL_FAIL),
    });
    assert.equal(bad.code, 4, bad.stderr.slice(-300));
    assert.match(bad.stderr, /失败在回写/);
    const broken = cli('calorie.workout.land', { date: '2026-09-07' }, {
      SKILLS_DB_PATH: dir, CALORIE_LAND_SCHEDULE_STUB: '{坏json',
    });
    assert.equal(broken.code, 4);
    assert.match(broken.stderr, /挡板数据不是合法 JSON/);
  });

  it('⑤ R3 双桥真实现（#613 收口：缺省走真合成写，不再恒 skip；行为矩阵见 t613 ⑤）', async () => {
    const { landPlanStep, landWishStep } = await import('../dist/workout/land.js');
    const dir = tmp('bridge');
    const db = openDb(join(dir, 'calorie_data.db'));
    seedPlan(db);
    db.close();
    const file = join(dir, 'calorie_data.db');
    process.env.SKILLS_DB_PATH = dir;
    process.env.CALORIE_LAND_SCHEDULE_STUB = JSON.stringify(SCHED_OK);
    process.env.CALORIE_LAND_MEMO_STUB = JSON.stringify(MEMO_OK);
    const p = await landPlanStep(['2026-09-07'], { dbFile: file });
    const w = await landWishStep(['2026-09-07'], { dbFile: file });
    assert.equal(p.ok, true);
    assert.equal(p.skipped, undefined);
    assert.equal(w.ok, true);
    assert.equal(w.skipped, undefined);
  });
});
