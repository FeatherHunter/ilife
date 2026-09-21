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
import { resolveWindow } from '../dist/analysis/series.js';
import { pinClockTo } from './pin-clock.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 种子锚点＝本件 fixture 的「今天」（种子末日 2026-09-07）。 */
const SEED_TODAY = '2026-09-07';

// 本件整件跑在**种子锚点**这一天（日期腐坏修复 · #326 同款手法）：本件种子是**绝对日**
// 2026-08-25 ~ 2026-09-07，而路由 cli 带的是**相对窗**（`7d`），锚点＝进程内「当刻」。
// 不钉锚，墙钟一滑过种子末日，窗口就整个落到种子之外 → `missing-data`（exit 4）。
// 机制、为何钉 `Date` 而不钉 `CALORIE_TODAY`、为何另起一件，见 `pin-clock.mjs` 头注。
pinClockTo(SEED_TODAY);

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

/** 模板**未填充**的槽位标记（逐字表＝`base-render/src/spec/template.ts::TEMPLATE_MARKERS`，
 *  与 `test/doc-page-assert.mjs` 的「残留即未装配完」同源，只是那份判据现在写成 `!h.includes('<!--')`）。 */
const TEMPLATE_RESIDUE = ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CHARTS-HELPERS-->', '<!--INJECT-DATA-->'];

function docChecks(h) {
  return {
    doctype: h.startsWith('<!doctype html>'),
    /* 判据＝「**无未填充的模板残留标记**」，不是「全文一条 HTML 注释都不许有」——
     * `assembleDocPage` 的 `fillTemplate` 应把上面那五个槽位全换掉，残留即未装配完；这条照旧。
     * 但组合配对页另有一条**有意保留**的口径注释（`src/render/trendDocs.ts::buildCombinedDoc` 的
     * `techNote`，形如 `<!-- 配对<key> 窗口<window> … -->`）：#160 返工把「不进可见正文、读者也
     * 用不上的技术口径」（白名单窗口／数列唯一源／相关系数与斜率／各节取舍）折进了这条注释，
     * 且 `配对…`／`窗口…` 两个字面量是 **e2e（`.scratch/t381/e2e-check.mjs`）与 #380 查「入参真的
     * 落进产物」的唯一落点**。它在本轮之前就在（`git show HEAD:packages/skill-calorie/src/render/trendDocs.ts`
     * 同一行），故判据不能写成 `!h.includes('<!--')`——那会把有意保留的口径注释一起判死。 */
    noResidue: TEMPLATE_RESIDUE.every((m) => !h.includes(m)),
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
    // 钉锚生效自证：本链的相对窗在钉锚下＝种子窗。锚若没钉住，这里会算出当刻窗而红——
    // 故此断言不是空转，它把「窗口由钉住的锚点算出」钉成判据。
    assert.deepEqual(resolveWindow('7d'), ['2026-09-01', '2026-09-07'], '钉锚未生效：7d 非种子窗');
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
    /* #160 文本返工后的成稿（逐条对账见 `.scratch/t160f/t1/receipt-t160t1.md` ① 表；字数按
     *  `src/render/trendDocs.ts::buildCombinedDoc` 实际拼法取，含随配对名生成的表名）。第 5 项的
     *  图题与第 6 项（散点）自带单位，是因为散点图公共层没有轴名能力（口径在注释里）。 */
    for (const needle of ['看体重与摄入', '一起变的程度', '平均体重', '平均摄入', '两项都有记录的天数', '体重与摄入', '体重(kg)和摄入(卡)的关系', '往前推几天会不会更清楚', '工作日和周末，差多少', '每天一行', '复制数据']) {
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
    const r = run(BIN, k, p, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#110 combined 窗口：未知窗拒收 exit 2（#103 G4 / #250 契约：收任意 Nd，仍拒未知值）', () => {
  const { dir } = mkTrendDb();
  const r = run(BIN, 'calorie.view.combined', { pair: 'weight_calorie', window: '99x' }, { ...homeEnvOf(calorieConfigDir(dir))});
  assert.equal(r.status, 2, '未知窗未拒收（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
  assert.equal(r.stdout, '', '未知窗 stdout 非空');
});

test('#110 多配对同键直出：weight_deficit 分桶节＋custom 窗（子集→同质）', () => {
  const { db } = mkTrendDb();
  try {
    const w = dispatch('calorie.view.combined', { pair: 'weight_deficit', window: 'custom', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(w.html, 'weight_deficit');
    /* #160 文本返工：旧表名 `缺口分桶（仅 weight_deficit 配对有此节）` 连同列名 `缺口分桶` 一并改名
     *  （表名给读者看的那件事＝`按缺口大小分组…`；作者才需要的「仅某某配对有此节」已删）。 */
    assert.ok(w.html.includes('按缺口大小分组'), 'weight_deficit 缺分桶节（表名）');
    assert.ok(w.html.includes('缺口多大'), 'weight_deficit 缺分桶节（列名）');
    const e = dispatch('calorie.view.combined', { pair: 'weight_exercise', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(e.html, 'weight_exercise');
    /* #160 文本返工：`延迟相关性` → 表名 `往前推几天会不会更清楚`（同一节，节级门控不变）。 */
    assert.ok(e.html.includes('往前推几天会不会更清楚'), 'weight_exercise 应有延迟节（三配对之一）');
    const r = dispatch('calorie.view.combined', { pair: 'protein_carbs', window: '7d', start: '2026-09-01', end: '2026-09-07' }, db);
    assertDoc(r.html, 'protein_carbs');
    assert.ok(!r.html.includes('往前推几天会不会更清楚'), 'protein_carbs 不应有延迟节（节级门控）');
  } finally {
    db.close();
  }
});

test('#110 命名底座可用：组合分析动态段落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkTrendDb();
  const r = run(BIN, 'calorie.view.combined', { pair: 'weight_calorie', window: '7d', start: '2026-09-01', end: '2026-09-07' }, { ...homeEnvOf(calorieConfigDir(dir))});
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
