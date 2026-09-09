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

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

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
    ['看食品来源统计', 'calorie.view.library'],
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
    for (const needle of ['饮食总览 2026-09-05 ~ 2026-09-07', '2689', '餐别分布', '加餐=下午茶+夜宵', '按日汇总', '2026-09-06', '窗口明细', '米饭', '复制数据']) {
      assert.ok(out.html.includes(needle), 'view.diet 缺：' + needle);
    }
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
    for (const needle of ['今日饮食 2026-09-07', '今日明细', '鸡胸', '营养配比', '餐别热量占比']) {
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
    for (const needle of ['饮食复盘 2026-09-05 ~ 2026-09-07', '每日热量趋势', '营养配比', '高频食物 TOP5', '米饭', '按餐汇总', '早餐']) {
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
    for (const needle of ['热量炸弹榜', '米饭', '复制榜单', '餐均']) {
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
    for (const needle of ['查食品 鸡胸', '关键词', '鸡胸肉', '165', '复制数据']) {
      assert.ok(s.html.includes(needle), 'search 缺：' + needle);
    }
    const lib = dispatch('calorie.view.library', {}, db);
    assertDoc(lib.html, 'library');
    for (const needle of ['食品库', '米饭', '分类', '复制数据']) {
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
    for (const needle of ['去重报告', '重复组', '重复组列表', '米饭', '处理建议', '下架']) {
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
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('#108 命名底座可用：排行动态段落点＋回传一致＋产物为全文档', () => {
  const { dir } = mkDietDb();
  const r = run(BIN, 'calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07', category: 'high_calorie', topN: 5 }, { SKILLS_DB_PATH: dir });
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
