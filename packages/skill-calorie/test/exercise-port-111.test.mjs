/** #111 · 运动移植 6 键：唤醒词命中＋HTML 移植＋无假数据＋命名底座可用。
 * 范围（t71「需移植」运动 6 项）：calorie.view.exercise-strength／view.exercise-cardio／
 * view.exercise-distribution／view.exercise-recap／view.exercise-review／
 * view.exercise-trend。
 * 不碰：process_progress（落地/训记二期，O3 命中但不执行）／营养 4（→ #112）／
 * 趋势 2＋其他 6（→ #113）／47 页已有（#108–#110 已关）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/exercise-port-111.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { CALORIE_COMBOS, ENVELOPE_VERSION, CALORIE_SKILL } from '../dist/cli/keys.js';
import { routesFor } from '../dist/triggers/routing.js';

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function seedPort(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  const ex = [
    // date, time, type, min, cal, cat, distKm, hr, loadKg, reps, setIndex
    ['2026-08-31', '07:00:00', '户外跑', 30, 300, '有氧', null, null, null, null, null],
    ['2026-09-02', '19:00:00', '卧推', 40, 180, '力量', null, null, 60, 10, 1],
    ['2026-09-05', '07:00:00', '跑步', 30, 300, '有氧', 5.0, 140, null, null, null],
    ['2026-09-05', '18:00:00', '卧推', 40, 150, '力量', null, null, 60, 10, 1],
    ['2026-09-05', '18:40:00', '卧推', 40, 150, '力量', null, null, 60, 8, 2],
    ['2026-09-06', '07:10:00', '骑行', 45, 350, '有氧', 12.0, 130, null, null, null],
    ['2026-09-06', '21:00:00', '瑜伽', 20, 50, '柔韧', null, null, null, null, null],
    ['2026-09-07', '07:05:00', '跑步', 35, 320, '有氧', 6.0, 145, null, null, null],
  ];
  for (const [d, t, type, min, cal, cat, dist, hr, load, reps, si] of ex) {
    db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, avg_heart_rate, load_kg, reps, set_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, type, min, cal, cat, dist, hr, load, reps, si);
  }
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5],
    ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '15:00:00', '苹果', 200, 100, 1, 25, 0],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  // 计划（周一起算：wk1d1→08-31 上肢[户外跑]／wk1d3→09-02 下肢[卧推]／wk2d1→09-07 上肢[硬拉]）。
  db.prepare('INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, \'port计划\', \'v1\', \'desc\', 2, \'2026-08-31\')').run();
  const sessions = [
    [1, 1, '上肢', [{ name: '户外跑', part: '腿', type: '有氧', sets: [{}, {}] }]],
    [1, 3, '下肢', [{ name: '卧推', part: '胸', type: '力量', sets: [{}, {}, {}] }]],
    [2, 1, '上肢', [{ name: '硬拉', part: '背', type: '力量', sets: [{}] }]],
  ];
  for (const [w, d, label, moves] of sessions) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(w, d, label, JSON.stringify(moves));
  }
}

function mkPortDb() {
  const dir = mkdtempSync(join(tmpdir(), 't111-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedPort(db);
  return { dir, db };
}

function run(bin, key, params, envExtra) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, [bin, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function docChecks(h) {
  return {
    doctype: h.startsWith('<!doctype html>'),
    noResidue: !h.includes('<!--'),
    page: h.includes('ilife-page'),
    block: h.includes('ilife-block'),
    style: h.includes('<style>'),
    helpers: h.includes('<script>'),
  };
}

function assertDoc(h, what) {
  const c = docChecks(h);
  for (const [k, v] of Object.entries(c)) assert.ok(v, what + ' 缺 ' + k);
}

const WIN = { start: '2026-09-05', end: '2026-09-07' };

test('#111 域内唤醒词命中：16 词→运动移植 6 键（促进 10＋新拟 6）', () => {
  const pairs = [
    ['看力量训练总览', 'calorie.view.exercise-strength'],
    ['看运动记录（按力量筛选）', 'calorie.view.exercise-strength'],
    ['看力量总览', 'calorie.view.exercise-strength'],
    ['看有氧训练总览', 'calorie.view.exercise-cardio'],
    ['看运动记录（按有氧筛选）', 'calorie.view.exercise-cardio'],
    ['看有氧总览', 'calorie.view.exercise-cardio'],
    ['看运动分类占比', 'calorie.view.exercise-distribution'],
    ['看运动复盘', 'calorie.view.exercise-recap'],
    ['计划复盘（本周）', 'calorie.view.exercise-review'],
    ['计划复盘（本月）', 'calorie.view.exercise-review'],
    ['计划复盘（全部）', 'calorie.view.exercise-review'],
    ['看计划完成率', 'calorie.view.exercise-review'],
    ['看未完成训练', 'calorie.view.exercise-review'],
    ['看动作完成率', 'calorie.view.exercise-review'],
    ['看训练计划复盘', 'calorie.view.exercise-review'],
    ['看运动消耗趋势', 'calorie.view.exercise-trend'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#111 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档', () => {
  const { db } = mkPortDb();
  try {
    for (const word of ['看力量训练总览', '计划复盘（本周）', '看运动消耗趋势']) {
      const hit = execRoute(word);
      assert.ok(hit, '唤醒词未命中：' + word);
      const m = /^calorie-cmd-read (\S+)(?: --params '(\{.*\})')?$/.exec(hit.cli);
      assert.ok(m, 'cli 解析失败：' + hit.cli);
      const out = dispatch(m[1], m[2] ? JSON.parse(m[2]) : {}, db);
      assertDoc(out.html, word);
    }
  } finally {
    db.close();
  }
});

test('#111 力量总览：按动作聚合＋重量轨迹＋逐条记录', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-strength', WIN, db);
    assert.equal(out.data.metrics.movementCount, 1);
    assert.equal(out.data.metrics.totalSets, 2);
    assert.equal(out.data.metrics.totalVolumeKg, 1080);
    assert.equal(out.data.metrics.totalReps, 18);
    assertDoc(out.html, 'exercise-strength');
    for (const needle of ['力量训练总览 2026-09-05 ~ 2026-09-07', '1080', '卧推', '重量轨迹', '按动作聚合', '逐条记录', '复制数据']) {
      assert.ok(out.html.includes(needle), 'strength 缺：' + needle);
    }
    assert.ok(out.html.includes('totalVolumeKg'), 'strength 复制文本缺指标');
  } finally {
    db.close();
  }
});

test('#111 有氧总览：按类型聚合＋配速＋逐条记录', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-cardio', WIN, db);
    assert.equal(out.data.metrics.sessions, 3);
    assert.equal(out.data.metrics.totalMinutes, 110);
    assert.equal(out.data.metrics.totalDistanceKm, 23);
    assert.equal(out.data.metrics.avgPaceMinPerKm, 4.78);
    assertDoc(out.html, 'exercise-cardio');
    for (const needle of ['有氧训练总览 2026-09-05 ~ 2026-09-07', '4.78 分/公里', '跑步', '骑行', '按类型聚合', '逐条记录', '复制数据']) {
      assert.ok(out.html.includes(needle), 'cardio 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#111 类型分布：分类占比双 bar＋摄入/TDEE 联动', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-distribution', WIN, db);
    assert.equal(out.data.metrics.sessions, 6);
    assert.equal(out.data.metrics.totalBurned, 1320);
    assert.equal(out.data.metrics.intakeCal, 2689);
    assert.equal(out.data.metrics.deficit, out.data.metrics.tdeeTotal + 1320 - 2689);
    assertDoc(out.html, 'exercise-distribution');
    for (const needle of ['运动类型分布 2026-09-05 ~ 2026-09-07', '按分类热量分布', '按分类次数占比', '分类明细', '摄入/TDEE 联动', '柔韧', '复制数据']) {
      assert.ok(out.html.includes(needle), 'distribution 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#111 运动复盘：KPI＋分类＋TOP5＋日趋势＋一句话', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-recap', WIN, db);
    assert.equal(out.data.metrics.sessions, 6);
    assert.equal(out.data.metrics.totalBurned, 1320);
    assert.equal(out.data.metrics.activeDays, 3);
    assertDoc(out.html, 'exercise-recap');
    for (const needle of ['运动复盘 2026-09-05 ~ 2026-09-07', '每日消耗趋势', '高频 TOP5', '跑步', '6 次', '累计消耗 1320 卡', '复制数据']) {
      assert.ok(out.html.includes(needle), 'recap 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#111 计划复盘：计划 vs 实绩＋双完成率＋未完成清单', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-review', { start: '2026-08-31', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.plannedSessions, 3);
    assert.equal(out.data.metrics.hitSessions, 3);
    assert.equal(out.data.metrics.completionPct, 100);
    assert.equal(out.data.metrics.plannedMovements, 3);
    assert.equal(out.data.metrics.hitMovements, 2);
    assert.equal(out.data.metrics.movementPct, 66.67);
    assertDoc(out.html, 'exercise-review');
    for (const needle of ['计划复盘', 'port计划', '计划 vs 实做', '每日明细', '硬拉', '户外跑', '复制数据']) {
      assert.ok(out.html.includes(needle), 'review 缺：' + needle);
    }
    // 本周窗：仅 wk2d1 一场（09-07 上肢[硬拉]，有记录命中、动作未命中）。
    const week = dispatch('calorie.view.exercise-review', { start: '2026-09-07', end: '2026-09-07' }, db);
    assert.equal(week.data.metrics.plannedSessions, 1);
    assert.equal(week.data.metrics.hitSessions, 1);
    assert.equal(week.data.metrics.movementPct, 0);
  } finally {
    db.close();
  }
});

test('#111 运动趋势：日序列＋周频次＋峰值（空日断点）', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-trend', WIN, db);
    assert.equal(out.data.metrics.activeDays, 3);
    assert.equal(out.data.metrics.totalBurned, 1320);
    assert.equal(out.data.metrics.totalMinutes, 210);
    assert.equal(out.data.metrics.peakBurned, 600);
    assertDoc(out.html, 'exercise-trend');
    for (const needle of ['运动趋势 2026-09-05 ~ 2026-09-07', '每日消耗＋时长', '每周运动频次', '2026-09-05', '复制数据']) {
      assert.ok(out.html.includes(needle), 'trend 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#111 无假数据：6 键空库一律 exit 4 且 stdout 纯净', () => {
  const dir = mkdtempSync(join(tmpdir(), 't111-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.view.exercise-strength', WIN],
    ['calorie.view.exercise-cardio', WIN],
    ['calorie.view.exercise-distribution', WIN],
    ['calorie.view.exercise-recap', WIN],
    ['calorie.view.exercise-review', WIN],
    ['calorie.view.exercise-trend', WIN],
  ];
  for (const [k, p] of cases) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#111 非法窗：start 晚于 end 即 exit 2', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.exercise-trend', { start: '2026-09-07', end: '2026-09-05' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 2, '非法窗未拒收（status=' + r.status + '）');
});

test('#111 命名底座可用：力量训练总览落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.exercise-strength', WIN, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^力量训练总览_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'strength 落盘');
});

test('#111 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.exercise-trend', WIN, db);
    assert.ok(out.html.includes('【calorie · calorie.view.exercise-trend】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
