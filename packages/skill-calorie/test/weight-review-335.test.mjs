/** #335 · 体重复盘三形态（目标复核既有／窗口复盘／里程碑回溯）：判别式＋窗口区间＋回溯语义。
 * tmp 隔离，真实 DB 零触碰。冻结心脏（6 条的 cli／data_source）逐字钉死。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CalorieRenderError } from '../dist/render/index.js';
import {
  buildWeightMilestonesView,
  buildWeightReviewPeriodView,
  buildWeightReviewView,
  viewWeightReview,
} from '../dist/weight/review.js';
import { WEIGHT_ROUTES } from '../dist/weight/routes.js';
import { ROUTES_SCENE_03 } from '../dist/cli/legacy/routes/scene-03.js';
import { SCENE_03_WEIGHT } from '../dist/triggers/scene-03-weight.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't335-')), 't.db'));

function seedBase(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 'test')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)").run();
}

/** 瘦种子：16 天 71.5→70.0kg（无已达成里程碑：距最高仅 1.5kg）。 */
function seedThin(db) {
  seedBase(db);
  for (let i = 0; i < 16; i++) {
    const d = new Date(Date.parse('2026-08-23T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    const w = Math.round((71.5 - i * 0.1) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
}

/** 富种子：120 天 75.5→69.5kg（恰达成减重 5kg：首达 2026-08-18，距首条 100 天）。 */
function seedRich(db) {
  seedBase(db);
  for (let i = 0; i < 120; i++) {
    const d = new Date(Date.parse('2026-05-10T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    const w = Math.round((75.5 - i * 0.05) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
}

const T = '2026-09-07';

function missingData(fn) {
  assert.throws(fn, (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
}

test('#335 判别式①：today／date／无参仍走目标复核形态（既有行为不动）', () => {
  const db = tmpDb();
  seedThin(db);
  const v = buildWeightReviewView(db, T);
  assert.equal(v.today, T);
  assert.ok(v.milestone.estDays !== undefined);
  const r = viewWeightReview({ today: T }, db);
  assert.ok(r.html.includes('体重复核'));
  assert.ok(!r.html.includes('体重趋势'));
  assert.ok(!r.html.includes('里程碑'));
  assert.ok(Number.isFinite(r.data.metrics.weightGoal));
  db.close();
});

test('#335／#482 判别式②：五窗口逐条走窗口形态（标题＋区间＋指标，不读目标）', () => {
  const db = tmpDb();
  seedThin(db);
  /* 副标题（#482 文本审查）：只留窗口区间；条数归页脚来源行（口径 §3.1），故这里不再带「N 条记录」。 */
  const cases = [
    [{ window: '本周', today: T }, '体重复盘（本周）', '2026-09-07 ~ 2026-09-07', 1, 0, 70],
    [{ window: '本月', today: T }, '体重复盘（本月）', '2026-09-01 ~ 2026-09-07', 7, -0.6, 70.3],
    [{ window: '90d', today: T }, '体重复盘（最近 90 天）', '2026-06-10 ~ 2026-09-07', 16, -1.5, 70.8],
    [{ window: '今年', today: T }, '体重复盘（今年）', '2026-01-01 ~ 2026-09-07', 16, -1.5, 70.8],
    [{ window: 'custom', start: '2026-09-01', end: '2026-09-07', today: T }, '体重复盘（自定义时间）', '2026-09-01 ~ 2026-09-07', 7, -0.6, 70.3],
  ];
  for (const [params, title, subtitle, rows, delta, avg] of cases) {
    const r = viewWeightReview(params, db);
    assert.ok(r.html.includes(title), title);
    assert.ok(r.html.includes(subtitle), subtitle);
    assert.ok(!r.html.includes(subtitle + ' · ' + rows + ' 条记录'), title + ' 副标题不得再复述条数');
    assert.ok(r.html.includes('体重趋势'));
    assert.ok(r.html.includes('结论'));
    assert.ok(!r.html.includes('预计达成'), title + ' 不得带前向预测');
    assert.equal(r.data.metrics.rows, rows);
    assert.equal(r.data.metrics.delta, delta);
    assert.equal(r.data.metrics.avg, avg);
  }
  db.close();
});

test('#335 窗口区间：本周 vs 上周均值差读数（瘦种子 pin 值）', () => {
  const db = tmpDb();
  seedThin(db);
  const r = viewWeightReview({ window: '本周', today: T }, db);
  assert.equal(r.data.metrics.vsLast, -0.1);
  assert.ok(r.html.includes('比上周'), '对照区间用读者话命名（#482：`vs 上周` 换「比上周」）');
  const m = viewWeightReview({ window: '本月', today: T }, db);
  assert.equal(m.data.metrics.vsLast, -0.7);
  db.close();
});

test('#335 窗口形态：空窗不落盘（missing-data，不编默认值）', () => {
  const db = tmpDb();
  seedThin(db);
  missingData(() => viewWeightReview({ window: 'custom', start: '2026-01-01', end: '2026-01-05', today: T }, db));
  missingData(() => buildWeightReviewPeriodView(db, '2026-01-01', '2026-01-05', '体重复盘（自定义时间）'));
  db.close();
});

test('#335 回溯形态：富种子列出已达成项（与前向预测不相交）', () => {
  const db = tmpDb();
  seedRich(db);
  const v = buildWeightMilestonesView(db, '2026-09-06');
  assert.equal(v.hits.length, 1);
  assert.deepEqual(v.hits[0], { name: '减重 5 kg', date: '2026-08-18', kg: 70.5, elapsedDays: 100 });
  assert.equal(v.maxWeight, 75.5);
  const r = viewWeightReview({ mode: 'milestones', today: '2026-09-06' }, db);
  assert.ok(r.html.includes('看里程碑回溯'));
  assert.ok(r.html.includes('减重 5 kg'));
  assert.ok(r.html.includes('2026-08-18'));
  assert.ok(r.html.includes('每减 5 kg 记一次'), '副标题改说这页的读法（#482）');
  assert.ok(!r.html.includes('5/10/15/20kg'), '内部记号不上屏（#482）');
  assert.ok(!r.html.includes('预计达成'));
  assert.equal(r.data.metrics.milestones, 1);
  db.close();
});

test('#335 回溯形态：无已达成里程碑出可读原因（missing-data，不算失败）', () => {
  const db = tmpDb();
  seedThin(db);
  assert.throws(
    () => buildWeightMilestonesView(db, T),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data' && e.message === '尚未达成任何减重里程碑',
  );
  db.close();
});

test('#335 判别式③：mode 非法即 bad-input；显式起止无 window 也走窗口形态', () => {
  const db = tmpDb();
  seedThin(db);
  assert.throws(
    () => viewWeightReview({ mode: 'week' }, db),
    (e) => e instanceof CalorieRenderError && e.code === 'bad-input',
  );
  const r = viewWeightReview({ start: '2026-09-01', end: '2026-09-07' }, db);
  assert.ok(r.html.includes('体重复盘（自定义时间）'));
  db.close();
});

test('#335 心脏：6 条冻结 cli／data_source 逐字（改这里即改 AI 真出口）', () => {
  const byWake = new Map(SCENE_03_WEIGHT.map((t) => [t.wake_word, t]));
  const cliOf = (w) => 'calorie-cmd-read calorie.view.weight-review --params ' + w;
  const expected = [
    ['体重复盘（本周）', cliOf('\'{"window":"本周"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"window":"本周"}\''],
    ['体重复盘（本月）', cliOf('\'{"window":"本月"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"window":"本月"}\''],
    ['体重复盘（最近 90 天）', cliOf('\'{"window":"90d"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"window":"90d"}\''],
    ['体重复盘（今年）', cliOf('\'{"window":"今年"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"window":"今年"}\''],
    ['体重复盘（自定义时间）', cliOf('\'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\''],
    ['看里程碑回溯', cliOf('\'{"mode":"milestones"}\''), 'calorie-cmd-read calorie.view.weight-review --params \'{"mode":"milestones"}\''],
  ];
  for (const [wake, cli, dataSource] of expected) {
    const t = byWake.get(wake);
    assert.ok(t, '冻结表缺词：' + wake);
    assert.equal(t.main_prompt.cli, cli, wake + ' main_prompt.cli');
    assert.equal(t.data_source, dataSource, wake + ' data_source');
  }
});

test('#482 文本审查：6 页旧句归零、页脚同一句式、结论句不再复述卡片数字', () => {
  const db = tmpDb();
  seedRich(db);
  /* 富种子最后一条是 2026-09-06，故「本周」这一格把当天定在 09-06（09-07 那天一条记录都没有，会走空窗阻断）。 */
  const pages = [
    ['本周', viewWeightReview({ window: '本周', today: '2026-09-06' }, db).html],
    ['本月', viewWeightReview({ window: '本月', today: T }, db).html],
    ['最近 90 天', viewWeightReview({ window: '90d', today: T }, db).html],
    ['今年', viewWeightReview({ window: '今年', today: T }, db).html],
    ['自定义时间', viewWeightReview({ window: 'custom', start: '2026-09-01', end: '2026-09-07', today: T }, db).html],
    ['看里程碑回溯', viewWeightReview({ mode: 'milestones', today: T }, db).html],
  ];
  /* 页脚（#482 裁定 F）：只留人话来源，库文件名与表名退出**可见文本**——可见面从每个块标签之间取，
   * 库文件名照旧写在复制日志第 3 段（`shared/copyArea.ts:170` 的 `DB_FILENAME ｜ source`，数据面不算可见面）。 */
  const dead = ['📊 数据来源:', '上一段等长区间', '样本与口径', '距首条', '5/10/15/20kg', '月均值表', '均值差 vs', '共达成', '覆盖 ',
    '期间均值', '满窗', '首末 ', '单点无变化，'];
  const visibleOf = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\u0001');
  for (const [who, html] of pages) {
    for (const s of dead) assert.ok(!html.includes(s), who + ' 仍有旧句：' + s);
    assert.ok(!visibleOf(html).includes('calorie_data.db'), who + ' 可见文本仍有库文件名');
    assert.ok(!visibleOf(html).includes('weight_log'), who + ' 可见文本仍有表名');
    assert.ok(html.includes('calorie_data.db'), who + ' 复制日志丢了库文件名（机器面不许丢）');
    assert.ok(html.includes('📊 数据来源：体重记录 ｜ '), who + ' 页脚未统一句式（裁定 F：只留人话来源）');
    assert.ok(/｜ 共 \d+ 条/.test(html), who + ' 页脚缺条数');
    assert.equal((html.match(/<summary[^>]*>结论<\/summary>/g) || []).length, 1, who + ' 结论块恰一处');
  }
  /* 缺陷 1：单点页结论不再复述「只有 1 条记录」（同屏第 3 次）——警示句／`1 天` 卡／页脚已经说过。
   * 富种子的「本周」是 7 条，落不到单点档 ⇒ 这档另用瘦种子（那一天只有 1 条记录）单独钉。 */
  const thin = tmpDb();
  seedThin(thin);
  const single = viewWeightReview({ window: '本周', today: T }, thin).html;
  assert.ok(single.includes('看不出这段时间是涨是跌。'), '单点页结论未换成人话');
  assert.ok(!single.includes('只有 1 条记录'), '单点页结论仍在复述条数');
  /* 缺陷 7：单点页「记录天数」卡不再挂「单点」徽章（那枚与副说明同说一件事）；
   * 副说明也说人话——`单点` 是圈内词（口径 §3.2 要求换读者能懂的话），全页可见文本不再出现它。 */
  assert.ok(!single.includes('>单点<'), '单点页记录天数卡仍有「单点」徽章');
  assert.ok(single.includes('只有 1 个点，没法算变化'), '单点页副说明没说人话');
  assert.ok(!single.includes('单点'), '单点页可见文本不该再出现「单点」这个词');
  thin.close();
  /* 缺陷 2：卡名与图上横线标签同一套词（`期间平均值`／`平均值`），不再混用「均值」。 */
  assert.ok(pages[1][1].includes('期间平均值'), '卡名未统一为「期间平均值」');
  assert.ok(pages[1][1].includes('平均值 '), '图上横线标签未统一为「平均值」');
  /* 缺陷 3：徽章去内部口径词 `满窗`（富种子「本周」那一页 7 天逐日全有记录，落满窗那档）。 */
  assert.ok(pages[0][1].includes('整段都记了'), '记录天数徽章未换人话');
  assert.ok(!pages.some(([, html]) => html.includes('满窗')), '仍有内部口径词「满窗」');
  /* 缺陷 4：月份数同屏两槽只留一处（表注不再写「共 N 个月」）。 */
  assert.ok(!pages[3][1].includes('按月平均体重（单位 kg，共 '), '表注仍在复述月份数');
  assert.ok(pages[3][1].includes('按月平均体重（单位 kg）'), '表注被误删');
  assert.ok(pages[3][1].includes('>月份数<'), '月份数卡被误删');
  /* 缺陷 6：期间变化卡副说明去缩写「首末」（首末对只在值槽那一页出现，写作「开头 … → 最后 …」）。 */
  assert.ok(pages[3][1].includes('开头 '), '期间变化副说明未去缩写');
  /* 缺陷 8：对照段日期从 KPI 卡挪到卡下一行小字（口径行），卡内不再塞注释句。
   * 富种子各页里只有「本周」这一页的对照段有记录（其余各页的对照段一条记录都没有）。 */
  assert.ok(pages[0][1].includes('对照段：'), '对照段未落到卡下那行');
  assert.ok(!pages[0][1].includes('前面同样长的 '), '对照段日期仍在 KPI 卡里');
  /* 结论句换人话：窗口页只说卡片上没有的事（走得多快），里程碑页说最近一次达标离今天多久。 */
  assert.ok(pages[2][1].includes('平均每天'), '窗口页结论未换成速度句');
  assert.ok(!pages[2][1].includes('（最近 90 天）变化'), '窗口页结论仍在复述卡片数字');
  /* 缺陷 5：往上走那一侧不再补「在往上走」（那话与「增重」徽章同屏重复）；往下走那侧照旧说清走得稳不稳。 */
  assert.ok(!pages.some(([, html]) => html.includes('在往上走')), '仍有「在往上走」与徽章重复');
  assert.ok(pages[3][1].includes('在稳步往下走'), '往下走那侧的方向句被误删');
  assert.ok(pages[5][1].includes('最近一次达标'), '里程碑页结论未换人话');
  /* 一页只留一套方向词：里程碑页只剩「已减／回涨／持平」，不再混用「减重」。 */
  assert.equal((pages[5][1].match(/>减重</g) || []).length, 0, '里程碑页徽章仍混用「减重」');
  assert.ok(pages[5][1].includes('>已减<'), '里程碑页缺「已减」方向徽章');
  db.close();
});

test('#482 零差值写法：单点窗口的期间变化写「0 kg」不写「0.0 kg」', () => {
  const db = tmpDb();
  seedThin(db);
  const html = viewWeightReview({ window: '本周', today: T }, db).html;
  assert.ok(/>0 kg</.test(html), '零差值未按 §3.3 写 0 kg');
  assert.ok(!/>0\.0 kg</.test(html), '值槽里仍有 0.0 kg');
  db.close();
});

test('#335 原子改动：路由声明 6 条 exec（order 131–136）＋场景分片恰删 6 条', () => {
  const mine = WEIGHT_ROUTES.filter((r) => r.key === 'calorie.view.weight-review' && r.list === 'wake' && typeof r.order === 'number' && r.order >= 131 && r.order <= 136);
  assert.equal(mine.length, 6);
  assert.deepEqual(mine.map((r) => r.order), [131, 132, 133, 134, 135, 136]);
  for (const r of mine) {
    assert.equal(r.kind, 'exec');
    assert.equal(r.scene, '03');
    assert.ok(!('bucket' in r) && !('reason' in r), r.wakeWord + ' 不得留 bucket/reason');
    assert.match(r.cli, /^calorie-cmd-read calorie\.view\.weight-review/);
  }
  const legacyWords = new Set(ROUTES_SCENE_03.map((r) => r.wakeWord));
  for (const w of ['体重复盘（本周）', '体重复盘（本月）', '体重复盘（最近 90 天）', '体重复盘（今年）', '体重复盘（自定义时间）', '看里程碑回溯']) {
    assert.ok(!legacyWords.has(w), '场景分片应已删：' + w);
  }
});
