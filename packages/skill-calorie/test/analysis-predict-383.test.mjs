/** #383 · 预测模拟参数补齐：冻结表 order 138–152 共 15 条接住命令＋133–137 回归。
 *
 * 照抄：packages/skill-calorie/test/trend-misc-port-113.test.mjs（唤醒词命中＋CLI 落盘＋完整文档断言）
 * ＋ g2g4-103.test.mjs（tmp 隔离＋种子 20 天以上＋dispatch 口径）。
 * 运行：先 pnpm build，再 node packages/skill-calorie/test/analysis-predict-383.test.mjs
 * （门禁全链见票面：pnpm build && pnpm gen && pnpm build && pnpm help:build／pnpm gen:check）。
 *
 * 参数形状（边界票 #382 未定，本票先定，写进注释，不默默定）：
 * - 预测体重(自定义目标 order138)：{"target":65,"window":"14d"} → weightTarget（目标体重达成日＋可行性）
 * - 模拟减重(每天-300/500/700卡 139–141)：{"cut_kcal":300/500/700,"window":"14d"} → weightSimCut
 * - 模拟减重(30/60/90天减Xkg 142–144)：{"target_loss":2/4/6,"days_target":30/60/90,"window":"14d"} → weightSimTarget
 * - 模拟减重(自定义天数减Xkg 145)：{"target_loss":3,"days_target":45,"window":"14d"} → weightSimTarget
 * - 摄入预测(按当前速率 1周/1月/3月 146–148)：{"kind":"calorie_forecast","horizonDays":7/30/90,"window":"14d"} → calorieForecast
 * - 摄入预测(自定义 149)：{"kind":"calorie_forecast","horizonDays":60,"window":"14d"} → calorieForecast
 * - 摄入预测(营养目标达成预测 150)：{"kind":"calorie_goal","window":"30d"} → calorieGoalEta
 * - 摄入预测(卡路里缺口预测 151)：{"kind":"calorie_deficit","window":"30d"} → calorieDeficitEta
 * - 摄入预测(摄入稳定性预测 152)：{"kind":"calorie_stability","window":"30d"} → calorieStability
 * - 回归 133–137：{"horizonDays":7/30/90/180/60,"window":"14d"} → weightForecast（原口径不动）
 * 输出字段名照冻结表 data_fields（target/eta/days_left/feasible；cut_kcal/weekly_loss/forecast；
 * calories/forecast/goal；avg/goal/gap/on_target；avg_deficit/weekly_loss；avg/sigma/stable），
 * 布尔统一按 1/0 进 metrics（沿 calorie.view.goal-predict 的 feasible?1:0 口径），字符串日期只进 HTML。
 * SIM_MIN_DAYS=14 口径不变：不足 14 天仍 missing-data（exit 4），本测试种子给足 30 天。
 *
 * 变异证据（源码级， ticket §自证两行）：
 * - MUT-RED: commands.ts 参数装配 target→targetX → tests 3/pass 2/fail 1（缺 metrics.target），runId 4cd4fd90-4314-4cf0-b70c-f16b77c79245 exit=1
 * - MUT-GREEN: 改回后 tests 3/pass 3/fail 0，runId 4bf1c28f-0aa2-422f-98fe-ef354d50cbc1 exit=0（文件 sha 与改前一致）
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { routesFor } from '../dist/triggers/routing.js';
import { calorieConfigDir, configTestBase, pinProcessClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

pinProcessClock('2026-09-07'); // #676：CALORIE_TODAY 退役，改钉整只钟（当刻进程＋后续子进程）

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.predict';

/** 15 条目标＋5 条回归：唤醒词→期望 params（与冻结表 cli 逐字一致，由测试反推 cli 解析）。 */
const CASES_15 = [
  { word: '预测体重(自定义目标)', params: { target: 65, window: '14d' }, metrics: ['target', 'days_left', 'feasible'], html: ['预计达成', '可行'] },
  { word: '模拟减重(每天-300卡)', params: { cut_kcal: 300, window: '14d' }, metrics: ['cut_kcal', 'weekly_loss', 'feasible'], html: ['每周', '可行'] },
  { word: '模拟减重(每天-500卡)', params: { cut_kcal: 500, window: '14d' }, metrics: ['cut_kcal', 'weekly_loss', 'feasible'], html: ['每周', '可行'] },
  { word: '模拟减重(每天-700卡)', params: { cut_kcal: 700, window: '14d' }, metrics: ['cut_kcal', 'weekly_loss', 'feasible'], html: ['每周', '可行'] },
  { word: '模拟减重(30天减Xkg)', params: { target_loss: 2, days_target: 30, window: '14d' }, metrics: ['target_loss', 'needed_deficit', 'feasible'], html: ['缺口', '可行'] },
  { word: '模拟减重(60天减Xkg)', params: { target_loss: 4, days_target: 60, window: '14d' }, metrics: ['target_loss', 'needed_deficit', 'feasible'], html: ['缺口', '可行'] },
  { word: '模拟减重(90天减Xkg)', params: { target_loss: 6, days_target: 90, window: '14d' }, metrics: ['target_loss', 'needed_deficit', 'feasible'], html: ['缺口', '可行'] },
  { word: '模拟减重(自定义天数减Xkg)', params: { target_loss: 3, days_target: 45, window: '14d' }, metrics: ['target_loss', 'needed_deficit', 'feasible'], html: ['缺口', '可行'] },
  { word: '摄入预测(按当前速率 1 周)', params: { kind: 'calorie_forecast', horizonDays: 7, window: '14d' }, metrics: ['calories', 'goal'], html: ['摄入', '目标'] },
  { word: '摄入预测(按当前速率 1 月)', params: { kind: 'calorie_forecast', horizonDays: 30, window: '14d' }, metrics: ['calories', 'goal'], html: ['摄入', '目标'] },
  { word: '摄入预测(按当前速率 3 月)', params: { kind: 'calorie_forecast', horizonDays: 90, window: '14d' }, metrics: ['calories', 'goal'], html: ['摄入', '目标'] },
  { word: '摄入预测(自定义)', params: { kind: 'calorie_forecast', horizonDays: 60, window: '14d' }, metrics: ['calories', 'goal'], html: ['摄入', '目标'] },
  { word: '摄入预测(营养目标达成预测)', params: { kind: 'calorie_goal', window: '30d' }, metrics: ['avg', 'goal', 'gap', 'on_target'], html: ['目标', '在轨'] },
  { word: '摄入预测(卡路里缺口预测)', params: { kind: 'calorie_deficit', window: '30d' }, metrics: ['avg_deficit', 'weekly_loss'], html: ['缺口', '每周'] },
  { word: '摄入预测(摄入稳定性预测)', params: { kind: 'calorie_stability', window: '30d' }, metrics: ['avg', 'sigma', 'stable'], html: ['稳定', '波动'] },
];

const CASES_REG = [
  { word: '预测体重(1 周后)', params: { horizonDays: 7, window: '14d' } },
  { word: '预测体重(1 月后)', params: { horizonDays: 30, window: '14d' } },
  { word: '预测体重(3 月后)', params: { horizonDays: 90, window: '14d' } },
  { word: '预测体重(6 月后)', params: { horizonDays: 180, window: '14d' } },
  { word: '预测体重(自定义时间)', params: { horizonDays: 60, window: '14d' } },
];

function seed383(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.parse('2026-08-09T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, '12:00:00', '米饭', 200, 1800, 90, 200, 60);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg) VALUES (?, ?, ?)').run(d, '07:00:00', Math.round((71.5 - i * 0.1) * 10) / 10);
  }
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-01', '跑步', 30, 300, '有氧')").run();
}

function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 't383-'));
  const db = openDb(join(dir, DB_FILENAME));
  seed383(db);
  db.close();
  return dir;
}

function runCli(dir, params, htmlPath) {
  const a = [KEY, '--params', JSON.stringify(params), '--html', htmlPath];
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) } });
}

/** 模板**未填充**的槽位标记（逐字表＝`base-render/src/spec/template.ts::TEMPLATE_MARKERS` 里由
 *  `fillTemplate` 填充的五个装配槽位）——与 `test/doc-page-assert.mjs:17` 的 `TEMPLATE_RESIDUE`
 *  同源同判据（同族 `trend-homogeneity-110.test.mjs`／`trend-misc-port-113.test.mjs` 三处一致，#160 收窄）。 */
const TEMPLATE_RESIDUE = ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CHARTS-HELPERS-->', '<!--INJECT-DATA-->'];

function assertFullDoc(html, what) {
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  /* 判据＝「**无未填充的模板残留标记**」，**不是**「全文一条 HTML 注释都不许有」——上面那五个槽位
   * 是 `fillTemplate` 必须换掉的，残留即未装配完；这条照旧必红。
   * 但本族整页产物**允许有意保留的口径注释**（#160 定稿：读者用不上的技术口径不进可见正文、改住
   * HTML 注释）：例如组合配对页 `src/render/trendDocs.ts::buildCombinedDoc` 的 `techNote`
   * （`<!-- 配对<key> 窗口<window> … -->`）、热量趋势页
   * `src/render/trendMiscPortDocs.ts::buildCalorieTrendDoc` 的 `techNote`
   * （`<!-- calorie.view.calorie-trend window <起> <止> … -->`）——其中 `配对…`／`窗口…`／
   * `calorie.view.calorie-trend` 正是 e2e（`.scratch/t381/e2e-check.mjs`）与 #380 查「入参真的落进产物」
   * 的**唯一**落点。故判据不能写成 `!html.includes('<!--')`——那是个**过宽的替身**，会把有意保留的
   * 口径注释一起判死。
   * 本票 15 页当刻实测 `<!--` 命中 **0** 条（收窄前后判读一致，未放宽任何东西：槽位残留照旧必红）。 */
  assert.ok(TEMPLATE_RESIDUE.every((m) => !html.includes(m)), what + ' 有残留标记');
  assert.ok(html.includes('复制数据'), what + ' 缺复制区');
  assert.ok(html.includes('data-fmt-open="1"'), what + ' 缺三格式菜单开合器');
  assert.deepEqual([...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'], what + ' 三格式菜单缺项');
}

test('#383 判据：15 条有命令可执行（routesFor exec＋cli 与冻结表同形）', () => {
  for (const c of CASES_15) {
    const hits = routesFor(c.word).filter((r) => r.kind === 'exec');
    assert.ok(hits.length > 0, '唤醒词没有命令可执行：' + c.word);
    const hit = hits[0];
    assert.equal(hit.key, KEY, '唤醒词错键：' + c.word);
    const cliParams = JSON.parse(String(hit.cli).split('--params ')[1].replace(/^'|'$/g, ''));
    assert.deepEqual(cliParams, c.params, '唤醒词 cli 参数与冻结表不一致：' + c.word);
  }
});

test('#383 15 条逐条跑通：exit 0＋绝对路径＋完整文档＋各自字段', () => {
  const dir = mkSeededDir();
  let i = 0;
  for (const c of CASES_15) {
    i += 1;
    const out = join(dir, 't383-' + i + '.html');
    const r = runCli(dir, c.params, out);
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
    assert.ok(basename(out).length > 0, c.word + ' 落点名异常');
  }
});

test('#383 回归：133–137 五条仍绿', () => {
  const dir = mkSeededDir();
  let i = 0;
  for (const c of CASES_REG) {
    i += 1;
    const hits = routesFor(c.word).filter((r) => r.kind === 'exec');
    assert.ok(hits.length > 0, '回归词没有命令可执行：' + c.word);
    assert.equal(hits[0].key, KEY, '回归词错键：' + c.word);
    const out = join(dir, 't383-reg-' + i + '.html');
    const r = runCli(dir, c.params, out);
    assert.equal(r.status, 0, c.word + ' 回归红：status=' + r.status + ' stderr=' + String(r.stderr || '').slice(-500));
    const env = JSON.parse(String(r.stdout));
    assert.ok(isAbsolute(env.data.output), c.word + ' data.output 非绝对路径');
    const html = readFileSync(out, 'utf8');
    assertFullDoc(html, c.word);
    assert.ok(typeof env.data.metrics.forecastValue === 'number', c.word + ' 缺 forecastValue');
  }
});
