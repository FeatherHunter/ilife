/** #109 · 运动/身体域同质：唤醒词命中＋HTML 同质＋无假数据＋命名底座可用。
 * 范围（t71「新版已有」运动/身体域 9 键）：calorie.view.exercise／view.exercise-goal／
 * view.weight／view.weight-history／view.weight-compare／view.weight-review／
 * view.volatility／view.body-composition／view.body-measure。
 * 不碰：exercise 6 项需移植（→ #111），训练计划/向导（→ #86），体脂/围度两期对比
 * helpers（无 CLI 键，随组合分析消费），缺口/组合/异常/禁忌（→ #110），饮食域（#108 已关）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/sport-homogeneity-109.test.mjs
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

function seedSport(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  const ex = [
    ['2026-09-05', '07:00:00', '跑步', 30, 300, '有氧', 5.0, 140],
    ['2026-09-05', '18:00:00', '卧推', 40, 150, '力量', null, null],
    ['2026-09-06', '07:10:00', '骑行', 45, 350, '有氧', 12.0, 130],
    ['2026-09-07', '07:05:00', '跑步', 35, 320, '有氧', 6.0, 145],
  ];
  for (const [d, t, type, min, cal, cat, dist, hr] of ex) {
    db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, avg_heart_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, type, min, cal, cat, dist, hr);
  }
  const w = [
    ['2026-08-05', '08:00:00', 71.0, '出差'],
    ['2026-08-06', '08:00:00', 70.9, '出差'],
    ['2026-08-07', '08:00:00', 70.8, '出差'],
    ['2026-09-05', '08:00:00', 70.5, '晨起'],
    ['2026-09-06', '08:00:00', 70.3, '晨起'],
    ['2026-09-07', '08:00:00', 70.1, '晨起'],
  ];
  for (const [d, t, kg, note] of w) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 23.0, ?)').run(d, t, kg, note);
  }
  db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES (\'2026-09-05\', \'gym\', 19.5, \'\'), (\'2026-09-07\', \'gym\', 19.2, \'\')').run();
  db.prepare('INSERT INTO body_measurements (date, chest_cm, waist_cm, abdomen_cm, hip_cm, note) VALUES (\'2026-09-05\', 95, 80, 82, 96, \'\'), (\'2026-09-07\', 94.5, 79, 81, 95.5, \'\')').run();
}

function mkSportDb() {
  const dir = mkdtempSync(join(tmpdir(), 't109-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedSport(db);
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

test('#109 域内唤醒词命中：代表词→运动/身体域 9 键（路由不断）', () => {
  const pairs = [
    ['看今日运动', 'calorie.view.exercise'],
    ['看本周运动', 'calorie.view.exercise'],
    ['看运动类型分布', 'calorie.view.exercise'],
    ['看运动趋势', 'calorie.view.exercise'],
    ['运动复盘（本周）', 'calorie.view.exercise'],
    ['看今日运动（vs 目标）', 'calorie.view.exercise-goal'],
    ['看运动目标', 'calorie.view.exercise-goal'],
    ['看体重总览', 'calorie.view.weight'],
    ['看今日体重', 'calorie.view.weight'],
    ['看体重曲线', 'calorie.view.weight-history'],
    ['看最近 7 天体重', 'calorie.view.weight-history'],
    ['看体重对比', 'calorie.view.weight-compare'],
    ['对比体重：本月 vs 上月', 'calorie.view.weight-compare'],
    ['看体重复核', 'calorie.view.weight-review'],
    ['看体重稳不稳（增强版）', 'calorie.view.volatility'],
    ['看波动异常点', 'calorie.view.volatility'],
    ['看体脂', 'calorie.view.body-composition'],
    ['看体成分', 'calorie.view.body-composition'],
    ['看围度', 'calorie.view.body-measure'],
    ['看围度趋势', 'calorie.view.body-measure'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#109 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档', () => {
  const { db } = mkSportDb();
  try {
    for (const word of ['看本周运动', '看体重曲线', '看体脂']) {
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

test('#109 运动总览：汇总＋双图＋按日表＋类型明细＋分类折叠＋复制', () => {
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.exercise', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.totalBurned, 1120);
    assert.equal(out.data.metrics.sessions, 4);
    assertDoc(out.html, 'view.exercise');
    for (const needle of ['运动总览 2026-09-05 ~ 2026-09-07', '1120', '每日消耗', '类型消耗分布', '按日消耗', '按类型明细', '跑步', '卧推', '有氧', '力量', '按分类汇总', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.exercise 缺：' + needle);
    }
    // 复制文本为 stat 投影（含 totalBurned），动作 id 走冻结缺省
    assert.ok(out.html.includes('totalBurned'), 'view.exercise 复制文本缺指标');
    assert.ok(out.html.includes('data-action-id') || out.html.includes('data-copy'), 'view.exercise 复制按钮缺绑定属性');
  } finally {
    db.close();
  }
});

test('#109 运动目标：目标 vs 实际＋完成度＋达成判定', () => {
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.exercise-goal', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.achieved, 1);
    assert.equal(out.data.metrics.goalTotal, 900);
    assertDoc(out.html, 'exercise-goal');
    for (const needle of ['运动目标 2026-09-05 ~ 2026-09-07', '900', '1120', '124.44', '已达成', '目标 vs 实际']) {
      assert.ok(out.html.includes(needle), 'exercise-goal 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 体重盘：首末＋均值＋变化＋曲线＋记录表', () => {
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.changeKg, -0.4);
    assert.equal(out.data.metrics.recordCount, 3);
    assertDoc(out.html, 'view.weight');
    for (const needle of ['体重盘 2026-09-05 ~ 2026-09-07', '70.5 → 70.1', '70.3', '下降', '65', '体重曲线', '晨起', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.weight 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 体重历史：曲线＋全量记录表（时间/BMI/备注列）', () => {
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.weight-history', { startDate: '2026-09-05', endDate: '2026-09-07' }, db);
    assert.equal(out.data.metrics.rows, 3);
    assert.equal(out.data.metrics.delta, -0.4);
    assertDoc(out.html, 'weight-history');
    for (const needle of ['体重历史', '70.1', '23', '晨起', '体重曲线', '备注', '复制数据']) {
      assert.ok(out.html.includes(needle), 'weight-history 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 对比＋复核＋波动：两期表＋里程碑＋基线预警', () => {
  const { db } = mkSportDb();
  try {
    const c = dispatch('calorie.view.weight-compare', { start: '2026-09-05', end: '2026-09-07', compareStart: '2026-08-05', compareEnd: '2026-08-07' }, db);
    assertDoc(c.html, 'weight-compare');
    for (const needle of ['体重对比', '本期', '对比期', '节奏', '两期对比', '复制数据']) {
      assert.ok(c.html.includes(needle), 'weight-compare 缺：' + needle);
    }
    const r = dispatch('calorie.view.weight-review', {}, db);
    assert.equal(r.data.metrics.currentWeight, 70.1);
    assertDoc(r.html, 'weight-review');
    for (const needle of ['体重复核', '70.1', '65', '5.1', '预计达成', '热量调整', '复制数据']) {
      assert.ok(r.html.includes(needle), 'weight-review 缺：' + needle);
    }
    const v = dispatch('calorie.view.volatility', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(v.data.metrics.points, 3);
    assertDoc(v.html, 'volatility');
    for (const needle of ['波动分析', '基线', '阈值', '预警', '近期异常', '偏离基线', '复制数据']) {
      assert.ok(v.html.includes(needle), 'volatility 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 体成分：来源表单＋趋势＋记录表＋复制', () => {
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.body-composition', {}, db);
    assert.equal(out.data.metrics.total, 2);
    assertDoc(out.html, 'body-composition');
    for (const needle of ['体成分看', 'gym', '19.2', '体脂趋势', '来源', '复制数据']) {
      assert.ok(out.html.includes(needle), 'body-composition 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 围度：单项趋势＋全量表（胸腰腹臀）＋复制', () => {
  const { db } = mkSportDb();
  try {
    const one = dispatch('calorie.view.body-measure', { metric: 'waist_cm' }, db);
    assert.equal(one.data.metrics.latestVal, 79);
    assertDoc(one.html, 'body-measure-one');
    for (const needle of ['围度看', '腰围', '79', '腰围趋势', '复制数据']) {
      assert.ok(one.html.includes(needle), 'body-measure 单项缺：' + needle);
    }
    const all = dispatch('calorie.view.body-measure', {}, db);
    assert.equal(all.data.metrics.total, 2);
    assertDoc(all.html, 'body-measure-all');
    for (const needle of ['全部围度', '95', '80', '复制数据']) {
      assert.ok(all.html.includes(needle), 'body-measure 全量缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#109 无假数据：9 键空库一律 exit 4 且 stdout 纯净', () => {
  const dir = mkdtempSync(join(tmpdir(), 't109-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.view.exercise', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.exercise-goal', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.weight-history', { startDate: '2026-09-05', endDate: '2026-09-07' }],
    ['calorie.view.weight-compare', { start: '2026-09-05', end: '2026-09-07', compareStart: '2026-08-05', compareEnd: '2026-08-07' }],
    ['calorie.view.weight-review', {}],
    ['calorie.view.volatility', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.body-composition', {}],
    ['calorie.view.body-measure', {}],
    ['calorie.view.body-measure', { metric: 'waist_cm' }],
  ];
  for (const [k, p] of cases) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#109 命名底座可用：运动总览落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkSportDb();
  const r = run(BIN, 'calorie.view.exercise', { start: '2026-09-05', end: '2026-09-07' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^运动总览_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'exercise 落盘');
});

test('#109 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkSportDb();
  try {
    const out = dispatch('calorie.view.exercise', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.ok(out.html.includes('【calorie · calorie.view.exercise】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
