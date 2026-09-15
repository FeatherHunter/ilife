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

/** 取段卡（`renderKpiCard` 那四槽）里的某一槽：按卡根切开，槽只在**本卡那一段**里找，
 *  不会串到下一张卡去（对照块里三枚卡是同一份卡形）。缺卡或缺槽回 null。 */
function slotOf(html, label, slot) {
  for (const seg of html.split('<div class="ilife-block ilife-block-kpi-card">').slice(1)) {
    if (!seg.startsWith('<div class="ilife-block-kpi-card-label">' + label + '</div>')) continue;
    const m = new RegExp('ilife-block-kpi-card-' + slot + '">([^<]*)<').exec(seg);
    return m ? m[1] : null;
  }
  return null;
}

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
  // 两段的段名与区间（本轮）改住对照块里那两枚卡：区间那一槽（`detail`）必须把锚点日带上，
  // 别因为页题副标题撤了就丢掉日期；情景业务名（「A 与 B」那一份）只许出现在表题一处。
  const e3 = run(db, { scenario: 'e3', delta: 5, today: TODAY });
  assert.match(slotOf(e3.html, '减重 5 kg 那天', 'detail') ?? '', /^\d{4}-\d\d-\d\d$/,
    'e3 段卡的区间槽应印锚点日（原来这一对在页题副标题里）');
  assert.ok(e3.html.includes('减重 5 kg 那天'), 'e3 段标签按口径带空格（数字与单位一个空格）');
  assert.ok(e3.html.includes('减重 5 kg 那天与今天'), 'e3 表题印实际减重数（不是模板占位符 N）；两段之间写「与」，不再写 ` vs `');
  assert.ok(!e3.html.includes('N kg'), 'e3 不许印模板占位符：字面 `N kg` 命中数须为 0');
  // 删重后整页只剩 1 处：表题（情景卡已整张删、页题副标题本轮也撤了 ⇒ 情景业务名只此一处）。
  assert.ok((e3.html.match(/减重 5 kg 那天与今天/g) || []).length === 1, 'e3 情景业务名整页只剩 1 处（删到只剩表题）');
  // #481 本轮：e2「这段时间平均」符号须与「已下降」同向（下降印「−」，不许印「+」）。
  const e2 = run(db, { scenario: 'e2', today: TODAY });
  assert.ok(e2.html.includes('已下降'), 'e2 应有「已下降」行');
  assert.ok(e2.html.includes('平均每天 -'), 'e2 这段时间平均应与下降同向（印「平均每天 -」）');
  assert.ok(!e2.html.includes('平均每天 +'), 'e2 下降时不许印「平均每天 +」（与已下降打架）');
  db.close();
});

test('窗口面回归：显式日期与 9 条窗口参数照旧', () => {
  const db = tmpDb();
  seed(db);
  const r = run(db, { start: '2026-09-01', end: '2026-09-07', compareStart: '2026-08-23', compareEnd: '2026-08-29' });
  assert.ok(isDoc(r.html));
  // 两段的段名与区间（本轮）住对照块的两枚段卡：原来那一对印在页题那句 `本期 X ~ Y vs 对比期 Z ~ W` 上。
  assert.equal(slotOf(r.html, '本期', 'detail'), '2026-09-01 ~ 2026-09-07', '窗口面段卡的区间槽应印本期区间');
  assert.equal(slotOf(r.html, '对比期', 'detail'), '2026-08-23 ~ 2026-08-29', '窗口面段卡的区间槽应印对比期区间');
  assert.ok(!visibleBody(r.html).includes(' vs '), '窗口面正文不许再有字面 ` vs `');
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

/* ── #510 · 设计视角审查整改：同屏事实收敛（整改单第三节）的机器判据 ──
 * 审查席实测：判语块把「两段各自的均值 ＋ 差值 ＋ 方向词 ＋ 幅度」逐条复述一遍（同一屏第三、四处）。
 * 收敛口径：方向词只留一处；差值那一个数只住连接件的值槽与表内变化列；判语只说「差别算不算大」。
 * 本轮把这「一处」从「体重对比」卡搬到了两段对照块的连接件（同一事实仍只一处，见 `compareLink()`）。 */
test('#510 同屏事实收敛：判语块不给数不给方向词、表题与卡副行不再复述差值／方向', () => {
  const db = tmpDb();
  seed(db);
  const w = run(db, { window: '30d', compareWindow: 'prev', today: TODAY });
  const verdict = (w.html.match(/<p class="wui-verdict">([\s\S]*?)<\/p>/g) || [])[0] ?? '';
  assert.ok(verdict.length > 0, '缺判语块（`verdict()` 未上屏）');
  assert.ok(!/\d/.test(verdict), '判语块复述了数字：' + verdict);
  assert.ok(!/(上升|下降|持平)/.test(verdict), '判语块复述了方向词：' + verdict);
  assert.ok(!/平均差|差值 [+-]/.test(w.html), '表题仍在复述差值那个数');
  assert.ok(!/上升 ↑|下降 ↓|持平 →/.test(w.html), '差值卡副行仍印方向词与箭头（方向只许留一处）');
  // 本轮：方向（与「差值算不出」那一档）在可见面**恰 1 枚胶囊**——它住对照块的连接件。
  assert.equal((w.html.match(/<span class="wui-chip[^"]*">(?:上升|下降|持平|差值算不出)<\/span>/g) || []).length, 1,
    '方向胶囊在可见面须恰 1 枚（住两段对照块的连接件）');
  // 本轮：差值卡与两段卡撤了 ⇒「体重对比」那个标签不再作为 KPI 卡的标签出现（页题 H1 另有「体重对比」四字）。
  assert.equal((w.html.match(/class="ilife-block-kpi-card-label">体重对比</g) || []).length, 0,
    '差值卡应撤（差值那一个数只住连接件的值槽与表内变化列）');
  // 节奏条改竖排：两段各自成行（`wui-strip-v`），单日锚点页不再读成「今天 算不出 减重 5 kg 那天 算不出」。
  assert.ok(w.html.includes('wui-strip-v'), '两段的每天变化量未走竖排（两半并排会连读成一句）');
  const e3 = run(db, { scenario: 'e3', delta: 5, today: TODAY });
  assert.ok(e3.html.includes('wui-strip-v'), 'e3 的每天变化量未走竖排');
  assert.ok(!/（差值 /.test(e3.html), 'e3 表题仍在复述差值');
  db.close();
});

/* ── 本轮 · 两段对照块（负责人第三轮第 3 条）的机器判据 ──
 * 负责人原话：`本期 X ~ Y vs 对比期 Z ~ W` 这种**直接文本写 VS** 的效果非常差，要设计好的 UI 表现。
 * 判据：`weight-compare` 族产物**可见文本里 `vs` 只允许住在 `<title>`（文档名）与机器面载荷里**，
 * 正文（页题副标题／表题／正文块）一处都不许再有字面 ` vs `；两段之间由**形状**承担。 */
test('两段对照：正文零字面 ` vs `，两枚段卡 ＋ 连接件取代原来那句页题副标题', () => {
  const db = tmpDb();
  seed(db);
  const pages = [
    ['窗口面', run(db, { window: '30d', compareWindow: 'prev', today: TODAY }), /class="ilife-block-kpi-card-label">本期</],
    ['b8', run(db, { scenario: 'b8', today: TODAY }), /class="ilife-block-kpi-card-label">当前</],
    ['e3', run(db, { scenario: 'e3', delta: 5, today: TODAY }), /class="ilife-block-kpi-card-label">今天</],
    ['c5', run(db, { scenario: 'c5', today: TODAY }), /class="ilife-block-kpi-card-label">[^<]*运动最多/],
  ];
  /** `<title>` 与机器面（脚本载荷／复制区）之外的全部产物：判据只认这一块为零命中。 */
  const withoutTitleAndPayload = (html) => html
    .replace(/<title>[\s\S]*?<\/title>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<section[^>]*ilife-block-copy-block[\s\S]*?<\/section>/gi, ' ');
  for (const [id, r, nearLabel] of pages) {
    assert.ok(!visibleBody(r.html).includes(' vs '), id + ' 可见文本仍有字面 ` vs `');
    assert.ok(!withoutTitleAndPayload(r.html).includes(' vs '), id + ' 正文（`<title>` 与机器面之外）仍有字面 ` vs `');
    // 两段对照块：两枚段卡 ＋ 一枚连接件（两段连接线 ＋「对比」胶囊 ＋ 差值 ＋ 方向胶囊）。
    assert.equal((r.html.match(/class="wui-cmp-side"/g) || []).length, 2, id + ' 两段对照块须恰两枚段卡');
    assert.equal((r.html.match(/class="wui-cmp-rule"/g) || []).length, 2, id + ' 连接件须两段连接线');
    assert.equal((r.html.match(/class="wui-cmp-pill">对比</g) || []).length, 1, id + ' 连接件中心须恰一枚「对比」胶囊');
    assert.equal((r.html.match(/class="wui-cmp-delta"/g) || []).length, 1, id + ' 连接件须印差值那一个数');
    // 方向住在连接件上（`chip()` 出的胶囊），且与差值同一件（`wui-cmp-node`）。
    assert.match(r.html, /<span class="wui-cmp-node">[\s\S]{0,240}?<span class="wui-chip/,
      id + ' 方向胶囊须挂在连接件的中心节点上');
    // 两段的段名与区间都住段卡：卡标签 ＋ 区间槽（`renderKpiCard` 的 label／detail 两槽）。
    assert.match(r.html, nearLabel, id + ' 近段卡没上屏（段名应住对照块的左段卡）');
    assert.match(r.html, /ilife-block-kpi-card-detail">\d{4}-\d\d-\d\d/,
      id + ' 段卡的区间槽应印日期（原来那一对在页题副标题里）');
    // 页题副标题撤掉；四张卡收成一块对照块 ⇒ 共享 KPI 网格不再出现（块尾那一枚「每天变化」也在块内）。
    assert.ok(!r.html.includes('class="ilife-block-page-shell-subtitle"'), id + ' 页题副标题应撤（两段已住对照块）');
    assert.equal((r.html.match(/class="ilife-block-kpi-card-grid"/g) || []).length, 0,
      id + ' 四张卡已收进对照块 ⇒ 共享 KPI 网格应撤');
    assert.ok(r.html.includes('class="wui-cmp-foot"') && r.html.includes('>每天变化<'),
      id + '「每天变化」那一枚应挂在对照块的块尾');
  }
  db.close();
});
