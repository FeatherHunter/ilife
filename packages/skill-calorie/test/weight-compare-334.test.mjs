/** #334 · 页面②两段对比：情景面 8 锚点＋窗口面回归（tmp 隔离，真实 DB 零触碰）。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/weight-compare-334.test.mjs
 * 种子与 .scratch/334/run-compare18.mjs 同形（平台期 08-01..08-14＋3 天缺口＋缺口后下降）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/schema.js';
import { runWeightView } from '../dist/weight/index.js';

const TODAY = '2026-09-07';
const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't334-')), 't.db'));
const dstr = (t) => new Date(t).toISOString().slice(0, 10);
const r1 = (n) => Math.round(n * 10) / 10;
const wig = (i) => [0, 0.12, -0.1, 0.08, -0.06, 0.14, -0.12][i % 7];
const GAP = new Set(['2026-08-15', '2026-08-16', '2026-08-17']);

function weightOn(d, i) {
  if (d >= '2026-08-01' && d <= '2026-08-14') return r1(70.5 + wig(i));
  if (d >= '2026-08-18') {
    const k = Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse('2026-08-18T12:00:00Z')) / 86400000);
    return r1(70.3 - k * 0.067 + wig(i) * 0.3);
  }
  return r1(84.5 - i * 0.042 + wig(i) * 0.5);
}

function seed(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal, goal_deadline) VALUES (1, 1800, 65.0, '2026-12-31')").run();
  const t0 = Date.parse('2025-09-01T12:00:00Z');
  const n = Math.round((Date.parse(TODAY + 'T12:00:00Z') - t0) / 86400000);
  for (let i = 0; i <= n; i++) {
    const d = dstr(t0 + i * 86400000);
    if (GAP.has(d)) continue;
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, weightOn(d, i));
  }
  for (let k = 0; k < 3; k++) db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-07-0" + (k + 1) + "', '跑步', 100)").run();
  for (let k = 0; k < 10; k++) db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-08-" + String(k + 1).padStart(2, '0') + "', '跑步', 500)").run();
}

const run = (db, params) => runWeightView('calorie.view.weight-compare', params, db);
const isDoc = (html) => html.startsWith('<!doctype html>') && html.includes('ilife-page');
/** **可见面**的正文（去掉页内样式、脚本载荷、复制区、标签本身）：分隔符判据只认这里。
 *  为什么要去样式：形状词汇的类名与 CSS 文件注释里带着 `·`（如 `weightUi.ts` 件头那几行），
 *  它们不是「正文里的串」。 */
const visibleBody = (html) => html
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<section[^>]*ilife-block-copy-block[\s\S]*?<\/section>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');
/** 可见面正文里的分隔符计数：`·`（形状化要清的串）与全角分号。
 *  文档标题里那一个 `·` 是**共享层眉标** `卡路里·体重`（`plateDocs.ts:30` 的 `DOC_TITLE`），
 *  全仓同形、不在本票写集 ⇒ 断言按「可见面恰 1 处」收紧。 */
const countOf = (html, ch) => (visibleBody(html).match(new RegExp(ch, 'g')) || []).length;

test('情景面 8 锚点：逐条完整文档＋锚点日期印出', () => {
  const db = tmpDb();
  seed(db);
  const cases = [
    ['b8', { scenario: 'b8', today: TODAY }, '平台期第一天', '2026-08-01'],
    ['e1', { scenario: 'e1', today: TODAY }, '历史最低', null],
    ['e2', { scenario: 'e2', today: TODAY }, '历史最高', '2025-09-01'],
    ['e3d5', { scenario: 'e3', delta: 5, today: TODAY }, '减重 5 kg 那天', null],
    ['e3d10', { scenario: 'e3', delta: 10, today: TODAY }, '减重 10 kg 那天', null],
    ['e5', { scenario: 'e5', today: TODAY }, '今夏以来最低', '2026-08-31'],
    ['e6', { scenario: 'e6', today: TODAY }, '今冬以来最低', null],
    ['c5', { scenario: 'c5', today: TODAY }, '运动最少', '2026-07'],
  ];
  for (const [id, params, segLabel, anchorNeedle] of cases) {
    const r = run(db, params);
    assert.ok(isDoc(r.html), id + ' 应为完整文档');
    assert.ok(r.html.includes(segLabel), id + ' 应印段标签 ' + segLabel);
    assert.ok(r.html.includes('结论'), id + ' 应有结论句');
    assert.ok(!r.html.includes('情景 ' + id), id + ' 眉标不许印内部情景代号');
    assert.ok(!r.html.includes('情景 b8') && !r.html.includes('情景 e1'), id + ' 情景页眉标整行应删');
    assert.ok(!r.html.includes('无从对照') && !r.html.includes('n=1') && !r.html.includes('仅一天'), id + ' 旧记号（无从对照／n=1／仅一天）命中数须为 0');
    assert.ok(!r.html.includes('g/天'), id + ' 每天变化量单位统一「克」（不许 g/天）');
    assert.ok(!r.html.includes('kg/天'), id + ' 每天变化量单位统一「克」（不许 kg/天）');
    assert.ok(r.html.includes('每天变化'), id + ' 应有「每天变化」卡');
    assert.ok(/\d{4}-\d{2}-\d\d/.test(r.html), id + ' 应印出锚点日期');
    if (anchorNeedle) assert.ok(r.html.includes(anchorNeedle), id + ' 应印出锚点 ' + anchorNeedle);
    // #503 形状化与手机端：正文里不许再用 `·`／`；` 把几件事串成一句——
    // 允许项只有共享层的文档标题 `卡路里·体重`（恰 1 处）与日期区间的 `~`。
    assert.equal(countOf(r.html, '·'), 1, id + ' 正文 `·` 只许剩共享眉标那 1 处');
    assert.equal(countOf(r.html, '；'), 0, id + ' 正文不许再出现 `；` 串');
    if (r.html.includes('记录与说明')) {
      assert.ok(r.html.includes('wui-bullets') && r.html.includes('<li>两段各要 3 条以上'),
        id + ' 页顶前提须落成逐条列表（bulletList）');
    }
    assert.ok(r.html.includes('class="wui-verdict"'), id + ' 结论须落成一句话判语块（verdict）');
    assert.ok(r.html.includes('.wui-verdict{') && r.html.includes('.wui-bullets li{'),
      id + ' 页内样式须把 weightUiCss() 放进装配第一项（形状词汇只有一处样式源）');
  }
  // 副标题已压成两段区间（业务名删重）⇒ 这里改判「区间那一句还在」，别让删重把锚点日期带走；
  // 同时守「情景业务名在整页只印一次」（删重前是 2~3 处：副标题／情景卡副说明／表题）。
  const e3 = run(db, { scenario: 'e3', delta: 5, today: TODAY });
  assert.match(e3.html, /减重 5 kg 那天 \d{4}-\d\d-\d\d vs 今天 \d{4}-\d\d-\d\d/, 'e3 副标题应印「两段 ＋ 各自区间」（含锚点日，段标签带空格）');
  assert.ok(e3.html.includes('减重 5 kg 那天'), 'e3 段标签按口径带空格（数字与单位一个空格）');
  assert.ok(e3.html.includes('减重 5 kg 那天 vs 今天'), 'e3 表题／情景卡印实际减重数（不是模板占位符 N）');
  assert.ok(!e3.html.includes('N kg'), 'e3 不许印模板占位符：字面 `N kg` 命中数须为 0');
  // 删重后整页只剩 1 处：表题（编排者再收一轮：情景卡的值槽改印段标签、副说明改「今天 vs 那一天」，
  // 那两处不再复述情景名；删重前是 3 处：副标题／情景卡／表题）。
  assert.ok((e3.html.match(/减重 5 kg 那天 vs 今天/g) || []).length === 1, 'e3 情景业务名整页只剩 1 处（删到只剩表题）');
  db.close();
});

test('窗口面回归：显式日期与 9 条窗口参数照旧', () => {
  const db = tmpDb();
  seed(db);
  const r = run(db, { start: '2026-09-01', end: '2026-09-07', compareStart: '2026-08-23', compareEnd: '2026-08-29' });
  assert.ok(isDoc(r.html));
  assert.ok(r.html.includes('本期 2026-09-01 ~ 2026-09-07'));
  const w = run(db, { window: '30d', compareWindow: 'prev', today: TODAY });
  assert.ok(isDoc(w.html));
  const d4 = run(db, { window: '工作日', compareWindow: '周末', today: TODAY });
  assert.ok(isDoc(d4.html));
  db.close();
});

test('缺失阻断与用法错：不编日期顶上', () => {
  const db = tmpDb();
  seed(db);
  assert.throws(() => run(db, { scenario: 'e3', delta: 50, today: TODAY }), /还没减到/);
  assert.throws(() => run(db, { scenario: 'zz', today: TODAY }), /未知对比情景/);
  db.close();
});

/* ── #503 · 形状化（去 `·`／`；` 串）与手机端（断点 820）的机器判据 ──
 * 逐页读数由 `scan-separators.py` 与手机 390 探针复核；这里守的是**形状本身还在**这件事。 */

test('#503 窗口面：卡片副说明／结论／每天变化量都成形，正文零分隔符串', () => {
  const db = tmpDb();
  seed(db);
  const w = run(db, { window: '30d', compareWindow: 'prev', today: TODAY });
  // 结论与每天变化量都用**段名**指段（不是含糊的「这两段」）：窗口面未必给得出「最近 30 天」这种
  // 口径名（`windowRange()` 不给名时两段就叫「本期／对比期」，页上转写成「最近这段／对比那段」）。
  assert.ok(/最近这段|最近 ?30 ?天/.test(w.html),
    '窗口面结论须用读者认得出的段名（最近这段／最近 30 天）');
  assert.ok(w.html.includes('wui-strip'), '每天变化量须落成事实条（factStrip）');
  assert.ok(!w.html.includes('class="wui-window"'), '卡片副说明的区间槽只收纯文本（公共层 esc(detail)），不许塞形状 HTML');
  assert.ok(!w.html.includes('&lt;div class="wui-'), '卡片副说明不许把形状 HTML 原样印成字');
  assert.equal(countOf(w.html, '·'), 1, '窗口面正文 `·` 只许剩共享眉标那 1 处');
  assert.equal(countOf(w.html, '；'), 0, '窗口面正文不许再出现 `；` 串');
  db.close();
});

test('#503 情景面 57／53：段标签去 `·`、轨迹行去 `·`、每天变化量成形', () => {
  const db = tmpDb();
  seed(db);
  const c5 = run(db, { scenario: 'c5', today: TODAY });
  assert.ok(!/ · 运动(最多|最少)/.test(c5.html), 'c5 段标签不许再带 ` · `（原 `2026-09 · 运动最多`）');
  assert.ok(/运动(最多|最少)/.test(c5.html), 'c5 段标签的判语槽还在（删符号不删事实）');
  assert.ok(c5.html.includes('平均每天'), 'c5 每天变化量应带「平均每天」前缀（形状条的值）');
  assert.equal(countOf(c5.html, '·'), 1, 'c5 可见面 `·` 只许剩共享眉标那 1 处');
  assert.equal(countOf(c5.html, '；'), 0, 'c5 可见面不许再出现 `；` 串');

  const e3 = run(db, { scenario: 'e3', delta: 5, today: TODAY });
  assert.ok(!/体重变化曲线<\/span><span[^>]*>[\d.]+ → [\d.]+ kg · \d+ 天/.test(e3.html),
    'e3 轨迹行不许再用 `· N 天` 串（天数另有「用时」一行）');
  assert.ok(/体重变化曲线/.test(e3.html) && /用时/.test(e3.html), 'e3 轨迹行与「用时」行都还在（删符号不删事实）');
  assert.equal(countOf(e3.html, '·'), 1, 'e3 正文 `·` 只许剩共享眉标那 1 处');
  db.close();
});
