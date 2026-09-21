/**
 * #785 · 查询与浏览·范围与跨天：区间汇总／24h 概览／查多日计划／周视图 出页。
 *
 * 本域 8 行（`场景清单.json` 的 `domain=query` 里判）：`summary_range_default`／`summary_range_full`／
 * `range_default`／`range_this_week`／`range_text`（f02 区间族）、`query_plans_today`／`query_plans_multi`
 * （f11 多日 24h 概览）、`week_view`（f08 周视图）。逐行的产物与「有意不出」清单在探针
 * `docs/skills/skill-schedule/t785-探针.mjs` 里；本件锁的是**页契约**：
 *
 *   V1 区间汇总页：真页 ＋ 三块必现块 ＋ **人话分组**（页上不出现 `l1.` 这种原始键）
 *   V2 载荷不动：`metrics` 仍是 `l1.x` 与三个数字（页面文案换了，载荷口径没换）
 *   V3 单日区间：7 维趋势退化成 7 根柱，件序列不变
 *   V4 空区间：缺失阻断（exit 4），不落盘、不给阻断态造页
 *   V5 周视图唤醒词：路由落 `schedule.record.range` ＋ `view=week`，真出口出 7×24 整页
 *   V6 24h 概览：聚合载荷真画出来（一排空卡的病），口径行说清丢了哪几样
 *   V7 同小时合并：同一小时的两条在页上是 `+` 并起来的一格
 *   V8 查多日计划：一天一行 + 逐日 24 格（多日聚合），且**不顶掉**缺省档「查日程」
 *   V9 唤醒词进 SKILL.md frontmatter ＋ 速查表（构建期注入的那一行）
 *
 * 现场数据**自己种**（#763 家目录隔离，不碰真库、也不依赖 #844 的种子库）：
 * 2026-09-14 ~ 09-20 一周每天都有记录、一级分类铺满 8 个；计划表在 09-15 那天的 07 点放两条
 * （同小时合并要看得见），09-16／09-17 各一条（多日那一支要看得见）。
 *
 * 「改坏必红」：把 `renderRangeSummaryPage` 换回 `html: ''` → V1 红；把周视图 preset 拿掉 → V5 红；
 * 把 `renderPlanOverviewPage` 换回空串 → V6 红（探针里的变异自证不在本件）。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword, buildHelpLookup } from '../dist/index.js';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const bin = join(PKG, 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);
const D1 = '2026-09-15';
const D2 = '2026-09-16';
const WEEK = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'];
let HOME = '';

/** 一周的记录：每天都有，一级分类铺满 8 个（分类聚合与 7 维趋势才有东西可画）。 */
const RECORDS = [
  [WEEK[0], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[0], '09:00', '11:00', '写代码', '工作.开发'],
  [WEEK[1], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[1], '07:30', '08:00', '晨间冥想', '健康.冥想'],
  [WEEK[1], '09:00', '11:00', '写代码', '工作.开发'],
  [WEEK[1], '12:30', '13:00', '散步', '调整.散步'],
  [WEEK[2], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[2], '20:00', '21:00', '读书', '学习.读书'],
  [WEEK[3], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[3], '16:00', '17:00', '陪家人', '投入.家人'],
  [WEEK[4], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[4], '14:00', '15:00', '收拾屋子', '日常.收拾'],
  [WEEK[5], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[5], '10:00', '11:00', '写文章', '创作.文字'],
  [WEEK[6], '00:00', '06:30', '睡眠', '维持.睡眠'],
  [WEEK[6], '09:00', '10:00', '写代码', '工作.开发'],
];
/** 计划：09-15 的 07 点两条（同小时合并），09-16／09-17 各一条（多日那一支）。 */
const PLANS = [
  [WEEK[1], '07:30', '08:00', '晨间冥想'],
  [WEEK[1], '07:40', '08:00', '晨间拉伸'],
  [WEEK[1], '09:00', '11:00', '深度开发'],
  [WEEK[2], '09:00', '10:00', '写周报'],
  [WEEK[3], '09:00', '10:00', '写周报'],
];

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: homeEnvOf(HOME),
  });
}
function page(args) {
  const r = run(args);
  assert.equal(r.status, 0, '须 exit 0：' + String(r.stderr).slice(0, 300));
  const env = JSON.parse(String(r.stdout));
  const out = env.delivery?.path;
  assert.ok(typeof out === 'string' && out !== '', '缺省调用须回 delivery.path');
  assert.equal(statSync(out).size, env.delivery.bytes, '盘上字节须等于回执 bytes');
  const html = readFileSync(out, 'utf8');
  assert.match(html, /^<!doctype html>/i, '须是整页（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须是整页（</html> 收）');
  return { env, html, out };
}
/** 剥样式与脚本与注释，**留标签与属性**（数块标记用这一档）。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
/** 再剥标签＝**可见文本**（判文案用这一档：分隔符门同口径）。 */
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
/** 数「一个块件出现了几次」：类名要连着引号一起数（`ilife-block-dist-row` 是 `-name`／`-bar` 的前缀）。 */
const count = (s, re) => (s.match(re) ?? []).length;
const DIST_ROW = /class="ilife-block-dist-row"/g;
const LIST_ROW = /class="ilife-block-list-rows-row"/g;

before(() => {
  HOME = mkdtempSync(join(tmpdir(), 'sched785-'));
  for (const [date, s, e, activity, category] of RECORDS) {
    const r = run(['schedule.record.write', '--params', P({ op: 'add', date, time_start: s, time_end: e, activity, category })]);
    assert.equal(r.status, 0, '记录种子失败（' + date + '）：' + String(r.stderr).slice(0, 200));
  }
  for (const [date, s, e, title] of PLANS) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date, time_start: s, time_end: e, title, feishu: 'skip' })]);
    assert.equal(r.status, 0, '计划种子失败（' + date + '）：' + String(r.stderr).slice(0, 200));
  }
});

test('#785 V1 区间汇总：真页 ＋ 三块必现块 ＋ 人话分组（页上不见 l1. 原始键）', () => {
  const { html } = page(['schedule.record.range', '--params', P({ start: WEEK[0], end: WEEK[6] })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(text.includes('汇总作息'), '页头是「汇总作息」');
  assert.ok(marks.includes('ilife-block-page-shell-body') && marks.includes('ilife-page-ui'), '走整页壳与页面级配方');
  assert.ok(text.includes('分类聚合'), '必现块①：分类聚合有段名');
  assert.ok(text.includes('7 维趋势'), '必现块②：7 维趋势');
  assert.ok(text.includes('夜间睡眠') && text.includes('午睡') && text.includes('合计'), '必现块③：睡眠统计三格');
  assert.ok(!text.includes('l1.'), '页上不许出现 l1.工作 这类原始键（人话分组）');
  assert.ok(text.includes('维持') && text.includes('工作') && text.includes('创作'), '分类聚合用一级分类名');
  assert.equal(count(marks, DIST_ROW), 8, '分类聚合＝8 个一级分类各一行');
  assert.ok(marks.includes('ilife-block-chart-block'), '7 维趋势走图表块');
  assert.equal(count(marks, LIST_ROW), 7, '每日明细＝7 行（一天一行）');
  console.log('#785 V1 读数：分布行 ' + count(marks, DIST_ROW) + ' 条，页字节 ' + Buffer.byteLength(html, 'utf8'));
});

test('#785 V2 载荷不动：metrics 仍是 l1.x 与三个数字（页面文案换了，载荷口径没换）', () => {
  const r = run(['schedule.record.range', '--params', P({ start: WEEK[0], end: WEEK[6] })]);
  const d = JSON.parse(String(r.stdout)).data;
  assert.ok(d.metrics['l1.维持'] > 0, '载荷里仍是一级分类原始键');
  for (const key of ['days', 'total', 'blocks']) assert.equal(typeof d.metrics[key], 'number', 'metrics.' + key + ' 须是数');
  assert.equal(d.metrics.days, 7, '覆盖天数＝7');
  assert.equal(d.metrics.blocks, RECORDS.length, '块数＝种下的记录数');
});

test('#785 V3 单日区间：7 维趋势退化成 7 根柱，件序列不变', () => {
  const one = page(['schedule.record.range', '--params', P({ start: D1, end: D1 })]);
  const text = textOf(one.html);
  assert.ok(text.includes('7 维趋势'), '段名不变');
  assert.ok(one.html.includes('data-chart-kind="bar"'), '单日走柱（一天没有趋势可言）');
  for (const dim of ['维持', '健康', '工作', '学习', '调整', '日常', '投入']) assert.ok(text.includes(dim), '7 维里有 ' + dim);
  const many = page(['schedule.record.range', '--params', P({ start: WEEK[0], end: WEEK[6] })]);
  assert.ok(many.html.includes('data-chart-kind="line"'), '多日走折线（7 条序列）');
  console.log('#785 V3 读数：单日=bar 多日=line');
});

test('#785 V4 空区间仍是缺失阻断：exit 4，产物一个字都不落', () => {
  const dir = join(HOME, '.ilife', 'data', 'schedule_html');
  const before = readdirSync(dir).length;
  const r = run(['schedule.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]);
  assert.equal(r.status, 4, '区间无记录＝缺失阻断');
  assert.match(String(r.stderr), /SCHEDULE_EMPTY_RANGE|区间无记录/, '报文点名缺失阻断');
  assert.equal(readdirSync(dir).length, before, '阻断态不落盘');
});

test('#785 V5 周视图：唤醒词落 schedule.record.range ＋ view=week，真出口出 7×24 整页', () => {
  const route = routeWakeword('周视图');
  assert.equal(route.key, 'schedule.record.range');
  assert.equal(route.params.view, 'week');
  const { env, html } = page(['schedule.record.range', '--params', P({ view: 'week', date: D1 })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.equal(env.data.metrics.days, 7, '一周七天都有记录');
  assert.ok(text.includes('7×24 全分类热力图'), '矩阵段名（老侧 f08 必现块①）');
  assert.equal(count(marks, /class="heat-cell"/g), 7 * 24, '7 行 × 24 格 ＝ 168 格');
  assert.ok(marks.includes('heat-legend'), '图例');
  assert.equal(count(marks, DIST_ROW), 8, '分类总览（必现块②）');
  assert.ok(text.includes('健康分'), '健康分（必现块③）');
  assert.equal(count(marks, LIST_ROW), 7, '每日汇总 7 行（必现块④）');
  assert.ok(text.includes('复制给 AI'), '复制 prompt 位（必现块⑤）');
  assert.ok(text.includes('2026-09-14 至 2026-09-20'), '窗口＝锚点那周的周一至周日');
  console.log('#785 V5 读数：key=' + route.key + ' preset=' + JSON.stringify(route.params) + ' 格数=' + count(marks, /class="heat-cell"/g));
});

test('#785 V6 24h 概览：聚合载荷真画出来（不再是薄模板那一排空卡）', () => {
  const { html } = page(['schedule.plan.today', '--params', P({ view: 'aggregate', date: D1 })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(marks.includes('ilife-block-page-shell-body'), '是整页（薄模板页没有页壳）');
  assert.ok(text.includes('24h 概览'), '页头＝24h 概览');
  assert.ok(text.includes('这一页是 24h 聚合视图'), '口径行说清这是聚合视图');
  assert.ok(text.includes('不含备注与完成状态'), '口径行点名丢了 completion');
  assert.ok(text.includes('也不含飞书同步状态'), '口径行点名丢了飞书同步状态');
  assert.equal(count(marks, /class="item"/g), 0, '不再是薄模板的空卡（`.item` 一个都不该有）');
  assert.equal(count(marks, LIST_ROW), 24, '一天 24 格都在（空桶也占格）');
  assert.ok(text.includes('未规划'), '空桶出人话（口径给的词）');
  console.log('#785 V6 读数：24 格行=' + count(marks, LIST_ROW));
});

test('#785 V7 同小时合并：同一小时的两条在页上并成一格', () => {
  const { env, html } = page(['schedule.plan.today', '--params', P({ view: 'aggregate', date: D1 })]);
  const text = textOf(html);
  const hour7 = env.data.items[0].hours[7].text;
  assert.ok(hour7.includes('+'), '口径里同一小时已并成一串：' + hour7);
  assert.equal(hour7.split('+').length, 2, '并的两条：' + hour7);
  for (const piece of hour7.split('+')) assert.ok(text.includes(piece.trim()), '并起来的每一条都在页上：' + piece);
  console.log('#785 V7 读数：07 格＝' + hour7);
});

test('#785 V8 查多日计划：一天一行 ＋ 逐日 24 格，且不顶掉缺省档「查日程」', () => {
  const { env, html } = page(['schedule.plan.today', '--params', P({ view: 'aggregate', dates: [D1, D2, '2026-09-17'] })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.equal(env.data.view, 'aggregate', '载荷仍是聚合视图那一档');
  assert.ok(text.includes('查多日计划'), '页头＝查多日计划（多日那一支）');
  assert.equal(count(marks, /<tr>/g), 4, '多日概览表＝1 行表头 ＋ 3 行日期');
  assert.equal(count(marks, LIST_ROW), 3 * 24, '逐日 24 格 × 3 天');
  // 缺省档（查日程）不许被顶掉：仍是薄模板分节页（本票只动 view=aggregate 那一支）。
  const list = page(['schedule.plan.today', '--params', P({ date: D1 })]);
  assert.ok(list.html.includes('<section data-skill="schedule"'), '缺省档仍是分节页');
  assert.ok(!list.html.includes('ilife-block-page-shell-body'), '缺省档没被换成整页');
  console.log('#785 V8 读数：多日表行=' + count(marks, /<tr>/g) + ' 24 格段=3');
});

test('#785 V9 唤醒词进 frontmatter 与速查表（判据＝读 SKILL.md 与构建期注入的那张表）', () => {
  const skill = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
  const fm = skill.slice(0, skill.indexOf('\n---', 4));
  assert.ok(fm.includes('周视图'), 'SKILL.md frontmatter 的触发词列表须含「周视图」');
  assert.ok(skill.includes('| 周视图 | schedule.record.range | stat |'), '构建期注入的速查表须有这一行');
  const hit = buildHelpLookup().find((h) => h.phrase === '周视图');
  assert.ok(hit, '速查表（运行时）须能查到「周视图」');
  assert.match(hit.cli, /--params '\{"view":"week"\}'/, '速查表给的示例要落在周视图那一档');
  const r = run(['schedule.record.range', '--params', '{"view":"week"}']);
  assert.equal(r.status, 0, '速查表示例照抄即能跑：' + String(r.stderr).slice(0, 200));
  console.log('#785 V9 读数：' + hit.cli);
});
