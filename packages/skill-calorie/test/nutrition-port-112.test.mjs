/** #112 · 营养移植 4 键：唤醒词命中＋HTML 移植＋无假数据＋命名底座可用。
 * 范围（t71「需移植」营养 4 项，#108 R4 记账回收）：calorie.view.nutrition-ratio／
 * view.nutrition-detail／view.source-stats／view.today-water。
 * 不碰：批量导入预览／lint_health／营养六因子／nutrition_analysis／calorie_trend／
 * long_trend／process_progress／review_template（→ #113）／47 页已有（#108–#110 已关）／
 * 运动 6（#111 已关）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/nutrition-port-112.test.mjs
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
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sugar, dietary_fiber, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 0.3, 1.2, 2, '主食', '自建')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sugar, dietary_fiber, sodium, category, source) VALUES ('牛奶', '测试', 60, 3.2, 3.2, 4.8, 5, 0, 50, '饮品', '自建')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sugar, dietary_fiber, sodium, category, source) VALUES ('鸡胸', '测试', 165, 31, 3.6, 0, 0, 0, 70, '蛋白类', '导入')").run();
  const meals = [
    // date, time, name, grams, cal, protein, carbs, fat
    ['2026-09-05', '08:00:00', '米饭', 200, 260, 5.5, 56, 0.5],
    ['2026-09-05', '12:30:00', '牛奶', 250, 150, 8, 12, 8],
    ['2026-09-06', '12:00:00', '米饭', 200, 260, 5.5, 56, 0.5],
    ['2026-09-06', '15:00:00', '未知餐', 100, 100, 1, 20, 2],
    ['2026-09-06', '18:00:00', '米饭团', 100, 100, 1, 20, 2],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  for (const [d, t, ml] of [
    ['2026-09-06', '08:00:00', 1000],
    ['2026-09-07', '08:00:00', 500],
    ['2026-09-07', '12:00:00', 300],
  ]) {
    db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, '💧水', ?, 0, 0, 0, 0)").run(d, t, ml);
  }
}

function mkPortDb() {
  const dir = mkdtempSync(join(tmpdir(), 't112-'));
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

const WIN = { start: '2026-09-05', end: '2026-09-06' };

test('#112 域内唤醒词命中：5 词→营养移植 4 键（促进 1＋新拟 4）', () => {
  const pairs = [
    ['看营养素深度', 'calorie.view.nutrition-detail'],
    ['查营养配比', 'calorie.view.nutrition-ratio'],
    ['看营养素明细', 'calorie.view.nutrition-detail'],
    ['看食品来源分布', 'calorie.view.source-stats'],
    ['看今日饮水', 'calorie.view.today-water'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#112 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档', () => {
  const { db } = mkPortDb();
  try {
    for (const word of ['看营养素深度', '看食品来源分布', '看今日饮水']) {
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

test('#112 营养配比：3 维 KPI＋热量占比 donut＋推荐范围对比', () => {
  const { db } = mkPortDb();
  try {
    // 窗内合计：cal 870／p 21／cb 164／f 13 → p10%／c75%／f13%（balance=warn：仅碳水超 70）。
    const out = dispatch('calorie.view.nutrition-ratio', WIN, db);
    assert.equal(out.data.metrics.totalCalorie, 870);
    assert.equal(out.data.metrics.proteinG, 21);
    assert.equal(out.data.metrics.proteinPct, 10);
    assert.equal(out.data.metrics.carbPct, 75);
    assert.equal(out.data.metrics.fatPct, 13);
    assert.equal(out.data.metrics.targetProteinG, 300);
    assert.equal(out.data.metrics.targetCarbG, 400);
    assert.equal(out.data.metrics.targetFatG, 100);
    assertDoc(out.html, 'nutrition-ratio');
    for (const needle of ['营养配比 2026-09-05 ~ 2026-09-06', '热量来源占比', '推荐范围对比', '↑ 偏高', '复制数据']) {
      assert.ok(out.html.includes(needle), 'ratio 缺：' + needle);
    }
    assert.ok(out.html.includes('proteinPct'), 'ratio 复制文本缺指标');
  } finally {
    db.close();
  }
});

test('#112 营养素深度：纤维/钠/糖明细＋缺数据盒（精确名匹配）', () => {
  const { db } = mkPortDb();
  try {
    // 米饭×2（纤维 1.2/钠 2/糖 0.3 每 100g，200g/餐）＋牛奶 250g（纤维 0/钠 50/糖 5）；
    // 未知餐／米饭团精确名无命中 → missing 2 种（米饭团不吃“米饭”子串红利）。
    const out = dispatch('calorie.view.nutrition-detail', WIN, db);
    assert.equal(out.data.metrics.days, 2);
    assert.equal(out.data.metrics.matchedMeals, 3);
    assert.equal(out.data.metrics.missingFoods, 2);
    assert.equal(out.data.metrics.fiberAvg, 2.4);
    assert.equal(out.data.metrics.sodiumAvg, 66.5);
    assert.equal(out.data.metrics.sugarAvg, 6.9);
    assertDoc(out.html, 'nutrition-detail');
    for (const needle of ['营养素深度 2026-09-05 ~ 2026-09-06', '膳食纤维', '缺数据食物', '米饭团', '复制数据']) {
      assert.ok(out.html.includes(needle), 'detail 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#112 食品来源统计：来源数＋总数＋按来源分组', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.source-stats', {}, db);
    assert.equal(out.data.metrics.total, 3);
    assert.equal(out.data.metrics.sources, 2);
    assertDoc(out.html, 'source-stats');
    for (const needle of ['食品来源统计', '按来源分组', '自建', '导入', '66.7', '复制数据']) {
      assert.ok(out.html.includes(needle), 'source 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#112 今日饮水：进度＋7 天窗＋每杯明细', () => {
  const { db } = mkPortDb();
  try {
    // 09-07 两杯 500+300=800／目标 2000 → 40%，还差 1200；7 天窗 09-01~07 仅 09-06/07 有水。
    const out = dispatch('calorie.view.today-water', { date: '2026-09-07' }, db);
    assert.equal(out.data.metrics.todayMl, 800);
    assert.equal(out.data.metrics.targetMl, 2000);
    assert.equal(out.data.metrics.pct, 40);
    assert.equal(out.data.metrics.remainMl, 1200);
    assert.equal(out.data.metrics.cups, 2);
    assertDoc(out.html, 'today-water');
    for (const needle of ['今日饮水 2026-09-07', '还差 1200 ml', '本周 7 天', '今日每杯', '复制数据']) {
      assert.ok(out.html.includes(needle), 'water 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#112 R11 收敛：饮水 7 天窗为自然日回退（不做周一派生）', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.today-water', { date: '2026-09-07' }, db);
    // 09-06（周六）1000＋09-07 800；若按周一派生会丢 09-06 之前的天，本窗照收。
    assert.ok(out.html.includes('09-06'), 'water 周窗缺 09-06');
    assert.ok(out.html.includes('09-01'), 'water 周窗缺 09-01（7 天回退起点）');
  } finally {
    db.close();
  }
});

test('#112 无假数据：4 键空库一律 exit 4 且 stdout 纯净', () => {
  const dir = mkdtempSync(join(tmpdir(), 't112-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.view.nutrition-ratio', WIN],
    ['calorie.view.nutrition-detail', WIN],
    ['calorie.view.source-stats', {}],
    ['calorie.view.today-water', { date: '2026-09-07' }],
  ];
  for (const [k, p] of cases) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#112 非法窗：start 晚于 end 即 exit 2', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.nutrition-ratio', { start: '2026-09-06', end: '2026-09-05' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 2, '非法窗未拒收（status=' + r.status + '）');
});

test('#112 非法 date：饮水 date 非 ISO 即 exit 2', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.today-water', { date: '昨天' }, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 2, '非法 date 未拒收（status=' + r.status + '）');
});

test('#112 命名底座可用：营养配比落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.nutrition-ratio', WIN, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^营养配比_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'ratio 落盘');
});

test('#112 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.today-water', { date: '2026-09-07' }, db);
    assert.ok(out.html.includes('【calorie · calorie.view.today-water】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
