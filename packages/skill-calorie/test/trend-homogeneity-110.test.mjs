/** #110 · 趋势/分析域同质：唤醒词命中＋HTML 同质＋无假数据＋combined 落差闭合。
 * 范围（t71「新版已有」趋势/分析域 6 键）：calorie.view.combined（11 配对×白名单窗口）／
 * view.deficit／view.anomaly（23 种诊断）／view.contraindication／view.predict／
 * view.goal-predict。
 * 不碰：calorie_trend／long_trend／nutrition_analysis／six_factors 等 18 项需移植
 * （→ #111–#113），calorie.history（趋势遗留词归宿），饮食域（#108 已关）、
 * 运动/身体域（#109 已关）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/trend-homogeneity-110.test.mjs
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

function isoDay(baseMs, i) {
  return new Date(baseMs + i * 86400000).toISOString().slice(0, 10);
}

function seedTrend(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, '2026-10-01', 300)").run();
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5],
    ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  // 14 天体重（2026-08-25 ~ 2026-09-07，71.5 → 70.2，满足 predict/goal-predict ≥14 条门槛）。
  const base = Date.parse('2026-08-25T12:00:00Z');
  for (let i = 0; i < 14; i++) {
    const d = isoDay(base, i);
    const kg = Math.round((71.5 - i * 0.1) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 23.0, ?)').run(d, '08:00:00', kg, '晨起');
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-05', '07:00:00', '跑步', 30, 300, '有氧'), ('2026-09-06', '07:10:00', '骑行', 45, 350, '有氧'), ('2026-09-07', '07:05:00', '跑步', 35, 320, '有氧')").run();
  db.prepare("INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES ('2026-09-05', 'gym', 19.5, ''), ('2026-09-07', 'gym', 19.2, '')").run();
  db.prepare("INSERT INTO body_measurements (date, chest_cm, waist_cm, abdomen_cm, hip_cm, note) VALUES ('2026-09-05', 95, 80, 82, 96, ''), ('2026-09-07', 94.5, 79, 81, 95.5, '')").run();
  // 禁忌扫描种子：颈后推举（肩·error）＋跑步（安全）。
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, ?, ?, ?)').run(1, 1, 1, '上肢', JSON.stringify([{ name: '颈后推举' }, { name: '跑步' }]));
}

function mkTrendDb() {
  const dir = mkdtempSync(join(tmpdir(), 't110-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedTrend(db);
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

test('#110 域内唤醒词命中：代表词→趋势/分析域 6 键（路由不断）', () => {
  const pairs = [
    ['看体重 vs 摄入(最近 7 天)', 'calorie.view.combined'],
    ['看体重 vs 运动(最近 30 天)', 'calorie.view.combined'],
    ['看体重 vs 蛋白(最近 30 天)', 'calorie.view.combined'],
    ['看体重 vs 缺口(最近 7 天)', 'calorie.view.combined'],
    ['看摄入 vs 运动(最近 30 天)', 'calorie.view.combined'],
    ['看体重 vs 体脂(最近 30 天)', 'calorie.view.combined'],
    ['查热量缺口', 'calorie.view.deficit'],
    ['看热量缺口', 'calorie.view.deficit'],
    ['诊断体重波动原因', 'calorie.view.anomaly'],
    ['为什么我没瘦', 'calorie.view.anomaly'],
    ['综合健康评估', 'calorie.view.anomaly'],
    ['看异常诊断', 'calorie.view.anomaly'],
    ['扫禁忌', 'calorie.view.contraindication'],
    ['看禁忌扫描', 'calorie.view.contraindication'],
    ['预测体重(1 月后)', 'calorie.view.predict'],
    ['看体重预测', 'calorie.view.predict'],
    ['看目标预测达成', 'calorie.view.goal-predict'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#110 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档', () => {
  const { db } = mkTrendDb();
  try {
    for (const word of ['看体重 vs 摄入(最近 7 天)', '查热量缺口', '看异常诊断']) {
      const hit = execRoute(word);
      assert.ok(hit, '唤醒词未命中：' + word);
      const m = /^calorie-cmd-read (\S+)(?: --params '(\{.*\})')?$/.exec(hit.cli);
      assert.ok(m, 'cli 解析失败：' + hit.cli);
      // 路由日期为旧快照窗，改用种子窗直跑同键同参形。
      const key = m[1];
      const params = m[2] ? JSON.parse(m[2]) : {};
      if (params.start) { params.start = '2026-09-05'; params.end = '2026-09-07'; }
      const out = dispatch(key, params, db);
      assertDoc(out.html, word);
    }
  } finally {
    db.close();
  }
});

test('#110 组合分析落差闭合：KPI＋双轴＋散点回归＋延迟＋分层＋明细＋复制', () => {
  const { db } = mkTrendDb();
  try {
    const out = dispatch('calorie.view.combined', { pair: 'weight_calorie', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.days, 7);
    assert.equal(out.data.metrics.aCount, 7);
    assert.equal(out.data.metrics.correlationN, 3);
    assertDoc(out.html, 'view.combined');
    for (const needle of ['组合分析', '相关系数 r', '对齐样本', '双轴走势', '相关性与回归', '延迟相关性', '分层对比', '逐日双指标明细', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.combined 缺：' + needle);
    }
    assert.ok(out.html.includes('correlationR') || out.html.includes('correlationN'), 'view.combined 复制文本缺指标');
    assert.ok(out.html.includes('data-action-id') || out.html.includes('data-copy'), 'view.combined 复制按钮缺绑定属性');
  } finally {
    db.close();
  }
});

test('#110 热量缺口：KPI＋摄入消耗双线＋目标线＋明细表＋复制', () => {
  const { db } = mkTrendDb();
  try {
    const out = dispatch('calorie.view.deficit', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(out.data.metrics.avgIntake, 863);
    assertDoc(out.html, 'view.deficit');
    for (const needle of ['热量缺口 2026-09-05 ~ 2026-09-07', '日均摄入', '日均消耗', '日均缺口', '理论减重', '每日摄入 vs 消耗', '缺口明细', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.deficit 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#110 异常诊断：参数表单＋发现全量列表＋insight＋复制', () => {
  const { db } = mkTrendDb();
  try {
    const out = dispatch('calorie.view.anomaly', { kind: 'diet_under', start: '2026-09-05', end: '2026-09-07' }, db);
    assert.ok(out.data.metrics.findingCount >= 1, '种子摄入不足应有发现');
    assertDoc(out.html, 'view.anomaly');
    for (const needle of ['异常诊断', 'diet_under', '发现', '证据', '建议', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.anomaly 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#110 禁忌扫描：概览＋命中表＋替代建议＋复制修改指令（种子含 1 error）', () => {
  const { db } = mkTrendDb();
  try {
    const out = dispatch('calorie.view.contraindication', { part: 'all' }, db);
    assert.ok(out.data.metrics.errorCount >= 1, '颈后推举应命中 error');
    assertDoc(out.html, 'view.contraindication');
    for (const needle of ['禁忌扫描', '有错误', '颈后推举', '替换', '复制修改指令']) {
      assert.ok(out.html.includes(needle), 'view.contraindication 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#110 双预测：点预测 KPI＋insight＋复制（曲线归组合分析）', () => {
  const { db } = mkTrendDb();
  try {
    const p = dispatch('calorie.view.predict', { start: '2026-08-25', end: '2026-09-07', horizonDays: 30 }, db);
    assert.equal(p.data.metrics.current, 70.2);
    assertDoc(p.html, 'view.predict');
    for (const needle of ['体重预测', '当前', '区间', '复制数据']) {
      assert.ok(p.html.includes(needle), 'view.predict 缺：' + needle);
    }
    const g = dispatch('calorie.view.goal-predict', { start: '2026-08-25', end: '2026-09-07' }, db);
    assert.equal(g.data.metrics.targetKg, 65);
    assertDoc(g.html, 'view.goal-predict');
    for (const needle of ['目标预测达成', '预计达成', '剩余', '复制数据']) {
      assert.ok(g.html.includes(needle), 'view.goal-predict 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#110 无假数据：6 键空库一律 exit 4 且 stdout 纯净', () => {
  const dir = mkdtempSync(join(tmpdir(), 't110-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.view.combined', { pair: 'weight_calorie', window: '7d', start: '2026-09-01', end: '2026-09-07' }],
    ['calorie.view.deficit', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.anomaly', { kind: 'diet_over', start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.contraindication', { part: 'all' }],
    ['calorie.view.predict', { start: '2026-08-25', end: '2026-09-07', horizonDays: 30 }],
    ['calorie.view.goal-predict', { start: '2026-08-25', end: '2026-09-07' }],
  ];
  for (const [k, p] of cases) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#110 combined 窗口白名单：99d 拒收 exit 2（#103 G4，不静默回退）', () => {
  const { dir } = mkTrendDb();
  const r = run(BIN, 'calorie.view.combined', { pair: 'weight_calorie', window: '99d' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 2, '非法窗未拒收（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
  assert.equal(r.stdout, '', '非法窗 stdout 非空');
});

test('#110 多配对同键直出：weight_deficit 分桶节＋custom 窗（子集→同质）', () => {
  const { db } = mkTrendDb();
  try {
    const w = dispatch('calorie.view.combined', { pair: 'weight_deficit', window: 'custom', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(w.html, 'weight_deficit');
    assert.ok(w.html.includes('缺口分桶'), 'weight_deficit 缺分桶节');
    const e = dispatch('calorie.view.combined', { pair: 'weight_exercise', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(e.html, 'weight_exercise');
    assert.ok(e.html.includes('延迟相关性'), 'weight_exercise 应有延迟节（三配对之一）');
    const r = dispatch('calorie.view.combined', { pair: 'protein_carbs', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(r.html, 'protein_carbs');
    assert.ok(!r.html.includes('延迟相关性'), 'protein_carbs 不应有延迟节（节级门控）');
  } finally {
    db.close();
  }
});

test('#110 命名底座可用：组合分析动态段落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkTrendDb();
  const r = run(BIN, 'calorie.view.combined', { pair: 'weight_calorie', window: '7d', start: '2026-09-01', end: '2026-09-07' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^组合分析_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'combined 落盘');
});

test('#110 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkTrendDb();
  try {
    const out = dispatch('calorie.view.combined', { pair: 'weight_calorie', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assert.ok(out.html.includes('【calorie · calorie.view.combined】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
