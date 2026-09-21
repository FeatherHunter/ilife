/** #384 · 8 报告子形态页：冻结表 order 331–338 接住命令（先验 BMI，再铺其余 7 条）。
 *
 * 照抄：packages/skill-calorie/test/analysis-predict-383.test.mjs（同族姊妹票）
 * ＋ trend-misc-port-113.test.mjs（唤醒词命中＋CLI 落盘＋完整文档断言）。
 * 运行：先 pnpm build，再 node packages/skill-calorie/test/analysis-report-384.test.mjs
 * （门禁全链见票面：pnpm build && pnpm gen && pnpm build && pnpm help:build／pnpm gen:check）。
 *
 * 判据先行（开工前实测，必须红）：8 条词当刻 `routesFor` 全指 `kind:'non-exec'`、
 * 没有 `exec` 记录 ⇒ 第一条断言「唤醒词没有命令可执行」当场红。
 *
 * 形状（编排者裁决 3，票面明令）：命令层 8 条独立命令、渲染层 1 个多态底座。
 * 一词一条命令 ⇒ 8 个键；不向 `calorie.view.health` 塞形态参数。
 * 命令名取 HELP 下一级＝「报告」：`calorie.report.<形态>`（形态名逐字来自老侧
 * `render_analysis.py` 的 `--kind` 表 bmi/tdee/bmr/protein/water/score/trend/compare）。
 *
 * 唤起窗口（老侧 `data_source` 自带缺省）：BMI 90 天、TDEE/BMR/评分 30 天、
 * 蛋白/水分 30 天、趋势 90 天、对比 本期 7 天 vs 紧邻前 7 天。命令一律**不要求**参数
 * （照抄即能跑），`window` 可覆盖。
 *
 * 各自字段（票面点名）：BMI＝逐日体重与 BMI 列表；TDEE＝每日总消耗与活动量系数；
 * BMR＝基础代谢与低于基础代谢的天数；蛋白＝每日蛋白量与达标率；水分＝每日饮水量与达成率；
 * 评分＝综合评分与评分历史；趋势＝评分序列与变化方向；对比＝两期变化量与前 3 项。
 *
 * 变异证据（源码级，票面 §自证两行）见 `.scratch/t384/` 证据件。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { routesFor } from '../dist/triggers/routing.js';
import { calorieConfigDir, configTestBase, pinProcessClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

pinProcessClock('2026-09-07'); // #676：CALORIE_TODAY 退役，改钉整只钟（当刻进程＋后续子进程）

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

/** 8 条：唤醒词 → 键 ＋ 参数 ＋ 该页必须出现的 metrics 键与正文文案。 */
const CASES = [
  {
    word: '看BMI报告', key: 'calorie.report.bmi', kind: 'bmi', title: 'BMI 报告', params: {},
    metrics: ['bmi', 'heightCm', 'weightKg', 'points'],
    html: ['BMI 分级', '偏瘦', '正常', '超重', '肥胖', '逐日体重与 BMI'],
  },
  {
    word: '看TDEE报告', key: 'calorie.report.tdee', kind: 'tdee', title: 'TDEE 报告', params: {},
    metrics: ['tdee', 'avgIntake', 'deficit', 'activityFactor'],
    html: ['每日总消耗', '活动量系数', 'Mifflin-St Jeor'],
  },
  {
    word: '看BMR报告', key: 'calorie.report.bmr', kind: 'bmr', title: 'BMR 报告', params: {},
    metrics: ['bmr', 'tdee', 'underBmrDays'],
    html: ['基础代谢', '低于基础代谢', '危险'],
  },
  {
    word: '看蛋白质摄入报告', key: 'calorie.report.protein', kind: 'protein', title: '蛋白质摄入报告', params: {},
    metrics: ['avgProtein', 'proteinGoal', 'hitDays', 'hitRate'],
    html: ['每日蛋白量', '达标率'],
  },
  {
    word: '看水分摄入报告', key: 'calorie.report.water', kind: 'water', title: '水分摄入报告', params: {},
    metrics: ['avgWater', 'waterGoal', 'hitDays', 'hitRate'],
    html: ['每日饮水量', '达标率'],
  },
  {
    word: '看综合评分', key: 'calorie.report.score', kind: 'score', title: '综合评分', params: {},
    metrics: ['score', 'historyDays', 'weakest'],
    html: ['综合评分', '评分历史'],
  },
  {
    word: '看健康趋势', key: 'calorie.report.trend', kind: 'trend', title: '健康趋势', params: {},
    metrics: ['seriesDays', 'earlyAvg', 'lateAvg', 'turns'],
    html: ['评分序列', '变化方向', '前段均分', '后段均分'],
  },
  {
    word: '看健康报告(含对比)', key: 'calorie.report.compare', kind: 'compare', title: '健康报告（含对比）', params: {},
    metrics: ['days', 'tdee', 'weightKg', 'deltaTdee', 'deltaWeightKg'],
    html: ['两期变化量', '对比期'],
  },
];

function seed384(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  // 100 天窗：覆盖 BMI(90)／趋势(90)／对比(7d vs prev 7d) 与全部 30 天窗。
  for (let i = 0; i < 100; i++) {
    const d = new Date(Date.parse('2026-05-31T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, '12:00:00', '米饭', 200, 1750, 140, 200, 60);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, '15:00:00', '💧水', 2100, 0, 0, 0, 0);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg) VALUES (?, ?, ?)').run(d, '07:00:00', Math.round((72.0 - i * 0.05) * 100) / 100);
    db.prepare('INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?)').run(d, '跑步', 30, 300, '有氧');
  }
  // 「低于基础代谢的天数」：窗口里挑 4 天给极低摄入，BMR 危险信号必须触发。
  for (const d of ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']) {
    db.prepare("UPDATE food_log SET calories = 900 WHERE date = ? AND food_name = '米饭'").run(d);
  }
}

function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 't384-'));
  const db = openDb(join(dir, DB_FILENAME));
  seed384(db);
  db.close();
  return dir;
}

/** 真跑：键 ＋ params ＋ --html 落点（照 383 同款）。 */
function runKey(key, params, htmlPath, dir) {
  return spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params), '--html', htmlPath], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))},
  });
}

/** ISO 日 ±N 天（测试自用，与页面 `shiftISODate` 同口径）。 */
function shift(iso, n) {
  return new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}

function assertFullDoc(html, what) {
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
  assert.ok(html.includes('复制数据'), what + ' 缺复制区');
  assert.ok(html.includes('data-fmt-open="1"'), what + ' 缺三格式菜单开合器');
  assert.deepEqual([...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'], what + ' 三格式菜单缺项');
}

test('#384 判据：8 条词各有命令可执行（routesFor exec＋键逐条对得上）', () => {
  for (const c of CASES) {
    const hits = routesFor(c.word).filter((r) => r.kind === 'exec');
    assert.ok(hits.length > 0, '唤醒词没有命令可执行：' + c.word);
    assert.equal(hits[0].key, c.key, '唤醒词错键：' + c.word);
  }
});

test('#384 8 条逐条跑通：exit 0＋绝对路径＋完整文档＋各自字段', () => {
  const dir = mkSeededDir();
  let i = 0;
  for (const c of CASES) {
    i += 1;
    const out = join(dir, 't384-' + i + '.html');
    const r = runKey(c.key, c.params, out, dir);
    assert.equal(r.status, 0, c.word + ' 非 exit 0：status=' + r.status + ' stderr=' + String(r.stderr || '').slice(-500));
    const env = JSON.parse(String(r.stdout));
    assert.ok(typeof env.data.output === 'string', c.word + ' 缺 data.output');
    assert.ok(isAbsolute(env.data.output), c.word + ' data.output 非绝对路径：' + env.data.output);
    assert.equal(env.data.output, out, c.word + ' 落点不是本次 --html');
    assert.ok(existsSync(out), c.word + ' 产物不在盘上');
    const html = readFileSync(out, 'utf8');
    assertFullDoc(html, c.word);
    for (const k of c.metrics) {
      assert.ok(typeof env.data.metrics[k] === 'number', c.word + ' 缺 metrics.' + k + '（实得 ' + JSON.stringify(env.data.metrics) + '）');
    }
    for (const needle of c.html) {
      assert.ok(html.includes(needle), c.word + ' 产物缺字段文案：' + needle);
    }
    // 拿错页即红：8 页各有自己那一页的形态名（`KIND_LABELS`），不许落回 full 健康盘。
    /* #519 授权改写（编排者 2026-09-16，`gh issue view 519 --comments` 的《编排者授权（2026-09-16 ·
     * 报告族 4 条冻结断言的形状改写）》；**一次性、具名、不类推**）：题名两段不再拿 `·` 串
     * （#516 判据 R1 的债），改「卡路里 ＋ 半角空格 ＋ 形态名」。语义一件不少——仍逐字钉住
     * 「这一页是它自己那个形态、不是 full 健康盘」。before／after 对照见
     * `docs/skills/skill-calorie/t519-W1-报告族-证据.md` §授权改写。 */
    assert.ok(html.includes('<title>卡路里 ' + c.title + '</title>'), c.word + ' 缺页面标题（疑似落回 full 健康盘）');
    /* 同一条授权：徽章只写一个词「报告」（#516 §3.2 D04，拿掉 `·` 串）。 */
    assert.ok(html.includes('<div class="type-badge">报告</div>'), c.word + ' 缺类型徽标');
    assert.ok(html.includes('calorie.report.' + c.kind), c.word + ' 缺本形态命令回执行');
    /* #519 新增（对偶，只加强不删减；授权条件 ② 要求的那条）：**可见文本**里不得再出现旧写法。
     * 口径与 `audit-separators.mjs` 同源：先剥 `<style>`／`<script>`／注释／全部标签。
     * 题名那处 `·` 住 `<title>`，剥标签后仍在可见文本里（标签页上就是给读者看的），故一并判。 */
    const vis = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
    assert.ok(!vis.includes('·'), c.word + ' 可见文本里出现 `·`（#516 判据 R1 的债）');
    assert.ok(!html.includes('卡路里 · 报告'), c.word + ' 产物里仍有旧徽章串「卡路里 · 报告」');
    assert.ok(!vis.includes('~'), c.word + ' 可见文本里出现 `~`（#516 判据 R6 的债）');
  }
});

test('#384 拿错页即红：8 条产物互不相同，且都不是 full 健康盘', () => {
  const dir = mkSeededDir();
  const docs = new Map();
  for (const c of CASES) {
    const out = join(dir, 't384-uniq-' + c.key + '.html');
    const r = runKey(c.key, c.params, out, dir);
    assert.equal(r.status, 0, c.word + ' 非 exit 0');
    docs.set(c.key, readFileSync(out, 'utf8'));
  }
  const v = [...docs.values()];
  for (let a = 0; a < v.length; a++) {
    for (let b = a + 1; b < v.length; b++) {
      assert.notEqual(v[a], v[b], '两张报告产物逐字节相同（形状没分开）：' + CASES[a].word + ' vs ' + CASES[b].word);
    }
  }
});

test('#384f 日均总消耗两期同源真体重：Δ 随窗口变，不再是与体重无关的常量', () => {
  const dir = mkSeededDir();
  // 对账口径＝**权威声明**（`src/analysis/utils.ts:59-63`）：Mifflin-St Jeor
  // （10w ＋ 6.25h − 5×age ＋ 5（男））× 活动系数（`TDEE_ACTIVITY_FACTORS`，moderate = 1.55）；
  // 体重取该期窗口**最后一次称重**（＝页面口径注「该期窗口内最后一次称重」）。
  // 不手写 2635／2639 这类计数，只把权威算式在测试里再算一遍，与页面读数对账。
  // （身高／年龄／性别／系数取自本夹具的档案 `seed384`：175 cm／30 岁／male／moderate。）
  const TO_TDEE = (kg) => Math.round((10 * kg + 6.25 * 175 - 5 * 30 + 5) * 1.55);
  const lastWeightIn = (start, end) => {
    const db = openDb(join(dir, DB_FILENAME));
    const rows = db.prepare(
      'SELECT weight_kg FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date ASC, time ASC, id ASC',
    ).all(start, end);
    db.close();
    assert.ok(rows.length > 0, '夹具缺称重：' + start + ' ~ ' + end);
    return rows[rows.length - 1].weight_kg;
  };
  const tableRow = (html, label) => {
    const tr = [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((m) => m[0])
      .find((s) => s.includes('>' + label + '<'));
    assert.ok(tr !== undefined, '逐项 Δ 表里没有「' + label + '」行');
    return tr.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').split('|').map((s) => s.trim()).filter((s) => s !== '');
  };
  const seen = [];
  const rowsOf = {};
  for (const win of ['7d', '30d']) {
    const out = join(dir, 't384f-' + win + '.html');
    const r = runKey('calorie.report.compare', { window: win }, out, dir);
    assert.equal(r.status, 0, win + ' 非 exit 0：' + String(r.stderr || '').slice(-400));
    const env = JSON.parse(String(r.stdout));
    const html = readFileSync(out, 'utf8');
    const cells = tableRow(html, '日均总消耗');   // [label, cur, prev, delta, dir]
    const days = Number(/^([0-9]+)d$/.exec(win)[1]);
    // 窗口不自己算：取**页面自述的两期**（KPI 卡「本期」＝cur.start 至 cur.end，「对比期」＝prev.start 至 prev.end）
    /* #519 授权改写（同一条授权，条件 ①②）：只把**判据里那个分隔符**从 `~` 换成「至」
     * （#516 判据 R6：拿 `~` 顶替「至」判债）。语义一件不少——仍是「页面上恰好自述两期」＋
     * 「第二期＝紧邻本期的等长窗口」，`spans` 的内部拼法（用 `~` 拼接）是测试自用中间量、不是产物文本，一字未动。 */
    const spans = [...new Set([...html.matchAll(/(\d{4}-\d{2}-\d{2}) 至 (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1] + '~' + m[2]))];
    assert.equal(spans.length, 2, win + ' 页面没给出两期窗口：' + JSON.stringify(spans));
    /* #519 新增（对偶，只加强不删减；授权条件 ② 要求的那条）：可见文本里不得再出现 `~`。 */
    const vis = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
    assert.ok(!vis.includes('~'), win + ' 可见文本里出现 `~`（#516 判据 R6 的债）');
    const [curStart, curEnd] = spans[0].split('~');
    const [prevStart, prevEnd] = [shift(curStart, -days), shift(curStart, -1)];
    assert.equal(spans[1], prevStart + '~' + prevEnd, win + ' 对比期不是紧邻本期的等长窗口：' + spans[1]);
    const prevTdee = TO_TDEE(lastWeightIn(prevStart, prevEnd));   // 对比期：真体重档，独立复算
    const curTdee = TO_TDEE(lastWeightIn(curStart, curEnd));      // 本期：同源口径，独立复算
    assert.equal(env.data.metrics.tdee, curTdee,
      win + ' 本期总消耗不等于「档案 ＋ 本期窗口末次体重」：metrics.tdee=' + env.data.metrics.tdee + ' 期望=' + curTdee);
    const expected = Math.round((curTdee - prevTdee) * 10) / 10;  // Δ＝本期 − 对比期（页面自述契约）
    assert.equal(env.data.metrics.deltaTdee, expected,
      win + ' Δ 不等于「本期总消耗 − 对比期（真体重）总消耗」：deltaTdee=' + env.data.metrics.deltaTdee + ' 期望=' + expected);
    assert.notEqual(env.data.metrics.deltaTdee, 79, win + ' 仍是以 70 kg 常量算出的恒定 Δ=+79');
    // 表与投影同一份读数：表格单元格对得上 metrics；R-51 撤方向列后方向只由 Δ 符号编码（+＝上升／-＝下降／0＝持平）。
    assert.equal(Number(cells[3]), env.data.metrics.deltaTdee, win + ' 逐项 Δ 表与 metrics.deltaTdee 不一致：' + JSON.stringify(cells));
    assert.equal(cells.length, 4, win + ' 逐项 Δ 表应为4格（项／本期／对比期／Δ，R-51撤方向列）：' + JSON.stringify(cells));
    assert.equal(Number(cells[3]) > 0 ? '上升' : Number(cells[3]) < 0 ? '下降' : '持平', expected > 0 ? '上升' : expected < 0 ? '下降' : '持平', win + ' Δ符号与期望方向不同号：' + JSON.stringify(cells));
    seen.push(env.data.metrics.deltaTdee);
    rowsOf[win] = { cells, prevTdee, curTdee, expected, prevStart, prevEnd };
  }
  // 页头摘要不得再出现「由 70 kg 常量产生的恒定 Δ」：两窗读数必须不同（本期与对比期都随窗口变）
  assert.notEqual(seen[0], seen[1], '7d 与 30d 的 Δ 相同（仍不随窗口变化）：' + JSON.stringify(seen));
  assert.notEqual(rowsOf['7d'].prevTdee, rowsOf['30d'].prevTdee,
    '两窗对比期总消耗相同（仍是常量口径）：' + JSON.stringify([rowsOf['7d'].prevTdee, rowsOf['30d'].prevTdee]));
});

test('#384 回归：full 健康盘 11 条窗口词行为不变（`calorie.view.health`）', () => {
  // 窗口逐字照冻结表；「自定义」那条表里是 `<开始日期>`／`<结束日期>` 占位，真跑换成实日期
  // （其余 10 条照抄即能跑，故照抄执行）。
  const cases = [
    ['看健康报告(本周)', { window: '本周' }], ['看健康报告(上周)', { window: '上周' }],
    ['看健康报告(最近 7 天)', { window: '7d' }], ['看健康报告(最近 30 天)', { window: '30d' }],
    ['看健康报告(最近 90 天)', { window: '90d' }], ['看健康报告(最近 180 天)', { window: '180d' }],
    ['看健康报告(最近 365 天)', { window: '365d' }], ['看健康报告(本月)', { window: '本月' }],
    ['看健康报告(上月)', { window: '上月' }], ['看健康报告(今年)', { window: '今年' }],
    ['看健康报告(自定义)', { window: 'custom', start: '2026-08-01', end: '2026-09-07' }],
  ];
  const dir = mkSeededDir();
  let i = 0;
  for (const [w, params] of cases) {
    i += 1;
    const hits = routesFor(w).filter((r) => r.kind === 'exec');
    assert.ok(hits.length > 0, '回归词没有命令可执行：' + w);
    assert.equal(hits[0].key, 'calorie.view.health', '回归词错键：' + w);
    const out = join(dir, 't384-reg-' + i + '.html');
    const r = runKey('calorie.view.health', params, out, dir);
    assert.equal(r.status, 0, w + ' 回归红：status=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
    const html = readFileSync(out, 'utf8');
    assertFullDoc(html, '回归 ' + w);
  }
});
