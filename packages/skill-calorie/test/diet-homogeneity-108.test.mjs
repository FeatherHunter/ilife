/** #108 · 营养/饮食域同质：唤醒词命中＋HTML 同质＋无假数据＋命名底座可用。
 * 范围（t71「新版已有」饮食域 8 键）：calorie.today／view.diet／view.diet-review／
 * view.ranking（单榜＋全榜）／view.search／view.library／view.health／view.dedupe。
 * 不碰：nutrition_ratio／nutrition_detail／source_stats／today_water（→ #112），
 * 缺口/组合/异常/禁忌（→ #110），运动/体重/身体（→ #109）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/diet-homogeneity-108.test.mjs
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
import { routeWakeword } from '../dist/triggers/help-lookup.js';
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
// 2026-09-05 ~ 2026-09-07，而路由 cli 带的是**相对窗**（`7d`／`本周`），锚点＝进程内「当刻」。
// 不钉锚，墙钟一滑过种子末日，窗口就整个落到种子之外 → `missing-data`（exit 4）。
// 机制、为何钉 `Date` 而不钉 `CALORIE_TODAY`、为何另起一件，见 `pin-clock.mjs` 头注。
pinClockTo(SEED_TODAY);

function seedDiet(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
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
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '测试')").run();
  // 去重表路径：同名同品牌第二条
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核')").run();
}

function mkDietDb() {
  const dir = mkdtempSync(join(tmpdir(), 't108-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedDiet(db);
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

test('#108 域内唤醒词命中：代表词→饮食域 8 键（路由不断）', () => {
  const pairs = [
    ['看今日饮食', 'calorie.today'],
    ['看饮食总览', 'calorie.view.diet'],
    ['看本周饮食', 'calorie.view.diet'],
    ['看早餐（最近 7 天）', 'calorie.view.diet'],
    ['看全部餐别分布（最近 7 天）', 'calorie.view.diet'],
    ['看营养结构', 'calorie.view.diet-review'],
    ['看今日营养', 'calorie.view.diet-review'],
    ['饮食复盘（本周）', 'calorie.view.diet-review'],
    ['看高热量榜', 'calorie.view.ranking'],
    ['看全部排行榜', 'calorie.view.ranking'],
    ['查食品', 'calorie.view.search'],
    ['查食品（按分类）', 'calorie.view.library'],
    // #250 · 命令接错改正：该词要的是「按来源分组的统计」（`data_fields=[source,count,pct,total]`），
    // 专面键是 `view.source-stats`（原先错接「分类食品列表」`view.library`，正是登记册 §4.2 记的那一条）。
    ['看食品来源统计', 'calorie.view.source-stats'],
    ['看食品库（去重）', 'calorie.view.dedupe'],
    ['看健康报告(最近 7 天)', 'calorie.view.health'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#108 唤醒词→key→HTML 链：路由 cli 直跑产出对应全文档', () => {
  const { db } = mkDietDb();
  try {
    // 钉锚生效自证：本链两条相对窗在钉锚下＝种子窗。锚若没钉住，这里会算出当刻窗而红——
    // 故此断言不是空转，它把「窗口由钉住的锚点算出」钉成判据。
    assert.deepEqual(resolveWindow('7d'), ['2026-09-01', '2026-09-07'], '钉锚未生效：7d 非种子窗');
    assert.deepEqual(resolveWindow('本周'), ['2026-09-07', '2026-09-07'], '钉锚未生效：本周 非种子窗');
    for (const word of ['看饮食总览', '饮食复盘（本周）', '看高热量榜']) {
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

test('#108 饮食总览＋餐别分布：区块对照（KPI＋双图＋按日表＋明细折叠＋复制）', () => {
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.view.diet', { start: '2026-09-05', end: '2026-09-07', date: '2026-09-07' }, db);
    assert.equal(out.data.metrics.totalCalories, 2689);
    assertDoc(out.html, 'view.diet');
    // #496＋#551：页名无日期（H1 逐字「饮食总览」）；窗口不住副题，住页顶窗口条（`diet-window`）。
    for (const needle of ['2689', '餐别分布', '加餐时段：下午茶和夜宵', '按日汇总', '2026-09-06', '全部记录', '米饭', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.diet 缺：' + needle);
    }
    assert.ok(out.html.includes('<h1 class="ilife-block-page-shell-title">饮食总览</h1>'), 'view.diet 页名不是无日期的「饮食总览」');
    assert.ok(!out.html.includes('饮食总览 2026-09-05'), 'view.diet 页名又带回窗口日期');
    assert.ok(out.html.includes('diet-window'), 'view.diet 正文首件缺窗口条');
    // 复制文本为 stat 投影（含 totalCalories），动作 id 走冻结缺省
    assert.ok(out.html.includes('totalCalories'), 'view.diet 复制文本缺指标');
    assert.ok(out.html.includes('data-action-id') || out.html.includes('data-copy'), 'view.diet 复制按钮缺绑定属性');
  } finally {
    db.close();
  }
});

test('#108 今日饮食：明细表＋配比环＋餐别图', () => {
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.today', { date: '2026-09-07' }, db);
    assert.equal(out.data.total, 4);
    assertDoc(out.html, 'today');
    // #496：那张图画的是四餐的卡数、也没有百分比，标题「餐别热量占比」名实不符 ⇒ 改「各餐热量（卡）」。
    for (const needle of ['今日饮食', '今日明细', '鸡胸', '营养配比', '各餐热量（卡）']) {
      assert.ok(out.html.includes(needle), 'today 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#108 饮食复盘：趋势折线＋配比环＋TOP5＋按餐汇总', () => {
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.view.diet-review', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.ok(out.data.metrics.loggedDays >= 2);
    assertDoc(out.html, 'diet-review');
    for (const needle of ['饮食复盘', '每日热量趋势', '营养配比', '高频食物 TOP5', '米饭', '按餐汇总', '早餐']) {
      assert.ok(out.html.includes(needle), 'diet-review 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#108 食品排行：单榜表＋复制榜单／全榜五折叠', () => {
  const { db } = mkDietDb();
  try {
    const one = dispatch('calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07', category: 'high_calorie', topN: 5 }, db);
    assertDoc(one.html, 'ranking-one');
    /* 表题收成「榜单明细」（D1）：引擎侧 `RANK_TITLES` 的「热量炸弹榜」不再上屏，
       页名以文档侧 `RANK_ZH` 为准（两套榜名统一归收口票）。 */
    for (const needle of ['高热量榜', '米饭', '复制榜单', '餐均']) {
      assert.ok(one.html.includes(needle), 'ranking 单榜缺：' + needle);
    }
    const all = dispatch('calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07', topN: 5 }, db);
    assert.equal(all.data.metrics.okCount, 5);
    assertDoc(all.html, 'ranking-all');
    for (const needle of ['全部排行', '高热量榜', '低热量榜', '常吃榜', '高碳水榜', '高蛋白榜', '<details']) {
      assert.ok(all.html.includes(needle), 'ranking 全榜缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#108 查食品／食品库：参数表单＋结果表＋复制', () => {
  const { db } = mkDietDb();
  try {
    const s = dispatch('calorie.view.search', { keyword: '鸡胸' }, db);
    assertDoc(s.html, 'search');
    // #496：「查食品 鸡胸」这类内部计数说法改成「搜索：鸡胸 · 找到 1 条」；食品库页的分类输入框
    // 改成按名称／品牌搜（本页找的是名称），页头改写「全部食品 · 库内 N 条」。
    for (const needle of ['搜索：鸡胸', '关键词', '鸡胸肉', '165', '复制数据']) {
      assert.ok(s.html.includes(needle), 'search 缺：' + needle);
    }
    const lib = dispatch('calorie.view.library', {}, db);
    assertDoc(lib.html, 'library');
    for (const needle of ['食品库', '米饭', '全部食品', '复制数据']) {
      assert.ok(lib.html.includes(needle), 'library 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#108 健康盘：四维＋今日该做什么＋复制回 AI（数据驱动建议）', () => {
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.view.health', { start: '2026-09-05', end: '2026-09-07' }, db);
    assertDoc(out.html, 'health');
    for (const needle of ['健康盘 2026-09-05 ~ 2026-09-07', '日均摄入', '日均缺口', '四维', '今日该做什么', '复制回 AI']) {
      assert.ok(out.html.includes(needle), 'health 缺：' + needle);
    }
    // 种子库：摄入不足（日均 896 vs 目标 1800，ratio<0.7）→ 建议条必须出现；不编假数
    assert.ok(out.html.includes('摄入不足'), 'health 建议条缺（种子比 0.50 应触发摄入不足）');
  } finally {
    db.close();
  }
});

test('#108 去重报告：KPI＋重复组表＋处理建议（种子含 1 组重复）', () => {
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.view.dedupe', {}, db);
    assert.equal(out.data.metrics.groupCount, 1);
    assertDoc(out.html, 'dedupe');
    // #496：页名原写「去重报告」（内部说法），现写「📦 食品库去重」。
    for (const needle of ['食品库去重', '重复组', '重复组列表', '米饭', '处理建议', '下架']) {
      assert.ok(out.html.includes(needle), 'dedupe 缺：' + needle);
    }
  } finally {
    db.close();
  }
});

test('#108 无假数据：8 键空库一律 exit 4 且 stdout 纯净', () => {
  const dir = mkdtempSync(join(tmpdir(), 't108-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.today', { date: '2026-09-07' }],
    ['calorie.view.diet', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.diet-review', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07', category: 'high_calorie' }],
    ['calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.search', { keyword: '鸡胸' }],
    ['calorie.view.library', {}],
    ['calorie.view.health', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.dedupe', {}],
  ];
  for (const [k, p] of cases) {
    const r = run(BIN, k, p, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#108 命名底座可用：排行动态段落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkDietDb();
  const r = run(BIN, 'calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07', category: 'high_calorie', topN: 5 }, { ...homeEnvOf(calorieConfigDir(dir))});
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^食物排行_高热量_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'ranking 落盘');
});

test('#108 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkDietDb();
  try {
    const out = dispatch('calorie.view.diet', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.ok(out.html.includes('【calorie · calorie.view.diet】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
