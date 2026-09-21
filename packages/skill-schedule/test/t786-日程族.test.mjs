/**
 * #786 · 查询与浏览·日程族：查日程／标题搜索／时段查重／已软删／作息详情（含按 ID）出页。
 *
 * 本域 9 行（`场景清单.json` 的 `domain=query` 里判）：`list_events_today`／`list_events_specific`（f10 查日程）、
 * `search_event_title`／`search_event_triplet`／`list_events_inactive`（老侧只出 JSON 的那三行）、
 * `detail_day`／`detail_record`／`detail_with_reasoning`／`get_record_basic`（f06 单条详情）。
 * 逐行的产物在探针 `docs/skills/skill-schedule/t786-探针.mjs` 里；本件锁的是**页契约**：
 *
 *   V1 查日程缺省：真页 ＋ f10 三块必现块（24h 时间轴／事件卡／筛选位）＋ 载荷不动
 *   V2 按标题搜索：命中的那几件进列表，全天读数仍是全貌；0 命中给对的话且不崩
 *   V3 时段查重：与窗口重叠即算；空时段明说「没有安排」
 *   V4 已软删：软删的那一条上同一张页并标「已软删」，缺省档一颗都不上屏
 *   V5 作息详情（按日）：每条 11 字段全展开（10 事实格 ＋ AI 推理链那一段），空的写「（无）」
 *   V6 作息详情（按 ID）：单条，推理链照全文摆出来
 *   V7 老词「按 ID 查记录」（带空格）路由命中同键同槽位（两条短语并存）
 *   V8 文案债已清：页上可见文本不出现 `·`／`｜`／`~`／`、`／`；`（分隔符门 #516 的那几种）
 *   V9 唤醒词进 SKILL.md frontmatter 与构建期注入的速查表，且照抄即跑
 *
 * 现场数据**自己种**（#763 家目录隔离，不碰真库、也不依赖 #844 的种子库）：一天三条记录
 * （其中一条补上 AI 推理链）＋ 四条计划（其中一条软删）。
 *
 * 「改坏必红」：把 `renderPlanDayPage` 换回 `html: ''` → V1 红；把窗口那一支的过滤拿掉 → V3 红；
 * 把 `include_inactive` 那一支拿掉 → V4 红；把详情页换回空串 → V5 红（探针里的变异自证不在本件）。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword, buildHelpLookup } from '../dist/index.js';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const bin = join(PKG, 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);
const DAY = '2026-09-15';
const REASONING = '修正：这条原来归错了，按当刻实际做的事重记';

let HOME = '';
let AMENDED_ID = 0;
let PLAIN_ID = 0;

const RECORDS = [
  ['09:00', '11:00', '写代码', '工作.开发'],
  ['12:30', '13:00', '散步', '调整.散步'],
  ['20:00', '21:00', '读书', '学习.读书'],
];
/** 四条计划：前三条活跃（覆盖 5h／空档 4 段），第四条种完就软删（V4 要看的就这一条）。 */
const PLANS = [
  ['07:30', '08:00', '晨间冥想'],
  ['09:00', '11:30', '深度开发'],
  ['14:00', '16:00', '需求评审会'],
  ['21:30', '22:30', '旧版复盘'],
];
const ACTIVE_PLANS = 3;
const GAPS = 4;

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
const count = (s, re) => (s.match(re) ?? []).length;
const LIST_ROW = /class="ilife-block-list-rows-row"/g;
const FACT_ITEM = /class="ilife-block-fact-strip-item"/g;
/** **事件卡**的行数：空档那几行也走同一个行列表类，且收在 `<details>` 里——按折叠区的起点切一刀，
 *  只数折叠区之前的那一段（本页事件卡在前、空档在后，件序列由 #782 冻死）。 */
const eventRows = (html) => {
  const m = markupOf(html);
  const cut = m.indexOf('<details');
  return count(cut < 0 ? m : m.slice(0, cut), LIST_ROW);
};
/** AI 推理链那一段的段名出现几次（页面标题里的「带 AI 推理链」不算——只数段名标记本身）。 */
const REASONING_SECTION = /<h2 class="heat-title">AI 推理链<\/h2>/g;

before(() => {
  HOME = mkdtempSync(join(tmpdir(), 'sched786-'));
  for (const [s, e, activity, category] of RECORDS) {
    const r = run(['schedule.record.write', '--params', P({ op: 'add', date: DAY, time_start: s, time_end: e, activity, category })]);
    assert.equal(r.status, 0, '记录种子失败：' + String(r.stderr).slice(0, 200));
  }
  for (const [s, e, title] of PLANS) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: DAY, time_start: s, time_end: e, title, feishu: 'skip' })]);
    assert.equal(r.status, 0, '计划种子失败：' + String(r.stderr).slice(0, 200));
  }
  // 记录号：按当日查回去拿（写命令的回执只给消息，不逐条列 id）。
  const items = JSON.parse(String(run(['schedule.record.today', '--params', P({ date: DAY })]).stdout)).data.items;
  assert.equal(items.length, RECORDS.length, '当日记录数＝种下的条数');
  AMENDED_ID = items.find((x) => x.activity === '写代码').id;
  PLAIN_ID = items.find((x) => x.activity === '散步').id;
  // 一条补上 AI 推理链（f06「查看 AI 推理链」那一行要的东西），另一条留空（看「（无）」那一支）。
  const a = run(['schedule.record.write', '--params', P({ op: 'amend', id: AMENDED_ID, analysis_reasoning: REASONING })]);
  assert.equal(a.status, 0, '补推理链失败：' + String(a.stderr).slice(0, 200));
  // 第四条计划软删（老侧「查已软删事件」那一行要的东西）。
  const events = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: DAY })]).stdout)).data.items;
  const dead = events.find((x) => x.title === '旧版复盘');
  assert.ok(dead !== undefined, '软删那一条要在当日日程里');
  const d = run(['schedule.plan.write', '--params', P({ op: 'deactivate', id: dead.id, feishu: 'skip' })]);
  assert.equal(d.status, 0, '软删失败：' + String(d.stderr).slice(0, 200));
});

test('#786 V1 查日程缺省：真页 ＋ f10 三块必现块（24h 时间轴／事件卡／筛选位）', () => {
  const { env, html } = page(['schedule.plan.today', '--params', P({ date: DAY })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(marks.includes('ilife-block-page-shell-body') && marks.includes('ilife-page-ui'), '走整页壳与页面级配方');
  assert.ok(text.includes('查日程'), '页头是「查日程」');
  assert.ok(text.includes('24 小时覆盖'), '必现块①：24h 时间轴＝覆盖条（置顶）');
  assert.ok(marks.includes('ilife-block-chart-block'), '覆盖条走图表块');
  assert.equal(eventRows(html), ACTIVE_PLANS, '必现块②：事件卡一行一件');
  assert.ok(marks.includes('ilife-block-param-form'), '必现块③：筛选位');
  assert.ok(text.includes('空档'), '空档折叠区在页上');
  assert.equal(count(marks, LIST_ROW), ACTIVE_PLANS + GAPS, '事件卡 ' + ACTIVE_PLANS + ' ＋ 空档 ' + GAPS);
  assert.ok(text.includes('07:30 至 08:00'), '事件行首槽写「起 至 止」（`~` 是分隔符门点名的符号）');
  // 载荷不动：仍是 `buildPlanToday` 那份（本票只换 HTML）。
  assert.deepEqual(Object.keys(env.data).sort(), ['date', 'items', 'total']);
  assert.equal(env.data.total, ACTIVE_PLANS, '载荷口径＝活跃事件数（软删那条不算）');
  console.log('#786 V1 读数：事件卡 ' + eventRows(html) + ' 行，页字节 ' + Buffer.byteLength(html, 'utf8'));
});

test('#786 V2 按标题搜索：命中的进列表，全天读数仍是全貌；0 命中给对的话', () => {
  const hit = page(['schedule.plan.today', '--params', P({ date: DAY, title: '开发' })]);
  assert.equal(hit.env.data.total, 1, '载荷＝命中集合');
  assert.equal(eventRows(hit.html), 1, '列表只有命中的那一件');
  assert.ok(textOf(hit.html).includes('按标题「开发」搜到 1 件'), '页头明说这一趟是怎么查的');
  const miss = page(['schedule.plan.today', '--params', P({ date: DAY, title: '健身' })]);
  assert.equal(miss.env.data.total, 0, '0 命中不抛（老侧那条提示「今天有健身吗」的答案就是「没有」）');
  assert.ok(textOf(miss.html).includes('这一天没有标题命中的事件'), '空列表那句话随查法变');
  assert.ok(textOf(miss.html).includes('空档 ' + GAPS + ' 段'), '全天读数仍是全貌（空档按活跃事件算，不按命中集合算）');
  console.log('#786 V2 读数：命中 1／0 命中两趟都出页');
});

test('#786 V3 时段查重：与窗口重叠即算；空时段明说「没有安排」', () => {
  const one = page(['schedule.plan.today', '--params', P({ date: DAY, time_start: '09:00', time_end: '11:30' })]);
  assert.equal(one.env.data.total, 1, '整段落在窗口里');
  assert.ok(textOf(one.html).includes('09:00 至 11:30 这一段里有 1 件'), '页头给窗口与件数');
  const over = page(['schedule.plan.today', '--params', P({ date: DAY, time_start: '11:00', time_end: '14:30' })]);
  assert.equal(over.env.data.total, 2, '搭着边的两件都算（重叠即命中，不要求整段包住）');
  const none = page(['schedule.plan.today', '--params', P({ date: DAY, time_start: '22:40', time_end: '23:00' })]);
  assert.equal(none.env.data.total, 0, '空时段不抛');
  assert.ok(textOf(none.html).includes('这一时段没有安排'), '空时段给一句人话，不留空块');
  const whole = page(['schedule.plan.today', '--params', P({ date: DAY, time_start: '00:00', time_end: '24:00' })]);
  assert.equal(whole.env.data.total, ACTIVE_PLANS, '整天窗口＝全部活跃事件（24:00 是「到这一天末尾」）');
  console.log('#786 V3 读数：1／2／0／' + whole.env.data.total + ' 四趟');
});

test('#786 V4 已软删：软删的那一条上同一张页并标「已软删」，缺省档一颗都不上屏', () => {
  const off = page(['schedule.plan.today', '--params', P({ date: DAY })]);
  const on = page(['schedule.plan.today', '--params', P({ date: DAY, include_inactive: true })]);
  assert.equal(eventRows(off.html), ACTIVE_PLANS, '缺省档只有活跃事件');
  assert.ok(!textOf(off.html).includes('旧版复盘'), '缺省档不把软删的摆出来');
  assert.equal(eventRows(on.html), ACTIVE_PLANS + 1, '带已软删那一趟多一行');
  assert.ok(textOf(on.html).includes('旧版复盘') && textOf(on.html).includes('已软删'), '软删那一行标着身份');
  assert.ok(textOf(on.html).includes('另有 1 件已软删'), '结论条报条数');
  assert.equal(on.env.data.total, off.env.data.total, '载荷不动：软删那一条不上载荷');
  assert.ok(textOf(on.html).includes('空档 ' + GAPS + ' 段'), '软删的不占覆盖（全天读数不变）');
  console.log('#786 V4 读数：' + ACTIVE_PLANS + ' → ' + (ACTIVE_PLANS + 1) + ' 行');
});

test('#786 V5 作息详情（按日）：每条 11 字段全展开，空的推理链写「（无）」', () => {
  const { env, html } = page(['schedule.record.detail', '--params', P({ date: DAY })]);
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(text.includes('作息详情'), '页头是「作息详情」');
  assert.equal(env.data.item.id, JSON.parse(String(run(['schedule.record.today', '--params', P({ date: DAY })]).stdout)).data.items[0].id,
    '载荷不动：仍是当日第一条（`buildRecordDetail`）');
  // 老侧那 11 个字段：10 个落事实格 ＋ analysis_reasoning 落它自己那一段。
  assert.equal(count(marks, FACT_ITEM), RECORDS.length * 10, '每条 10 个事实格 × ' + RECORDS.length + ' 条');
  for (const label of ['记录号', '日期', '开始', '结束', '时长', '活动', '分类', '消息原文', '消息时间戳', '创建时间']) {
    assert.ok(text.includes(label), '字段「' + label + '」要在页上');
  }
  assert.equal(count(marks, REASONING_SECTION), RECORDS.length, '第 11 个字段（AI 推理链）每条一段');
  assert.ok(text.includes(REASONING), '补上的那条推理链照全文摆出来');
  assert.ok(text.includes('（无）'), '没留推理链的那几条写「（无）」（老侧页同一个写法）');
  assert.equal(text.includes('这一批记录都没有留 AI 推理链'), false, '有一条带推理链时不说「都没有」');
  console.log('#786 V5 读数：事实格 ' + count(marks, FACT_ITEM) + ' 个，AI 推理链 ' + count(marks, REASONING_SECTION) + ' 段');
});

test('#786 V6 作息详情（按 ID）：单条，推理链照全文摆出来', () => {
  const one = page(['schedule.record.detail', '--params', P({ id: AMENDED_ID })]);
  const text = textOf(one.html);
  assert.equal(one.env.data.item.id, AMENDED_ID, '载荷＝点上那一条');
  assert.equal(count(markupOf(one.html), FACT_ITEM), 10, '一条就是 10 个事实格');
  assert.ok(text.includes('记录号 ' + AMENDED_ID), '段名点出记录号');
  assert.ok(text.includes(REASONING), '推理链全文');
  const plain = page(['schedule.record.detail', '--params', P({ id: PLAIN_ID })]);
  assert.ok(textOf(plain.html).includes('（无）'), '没留推理链的那一条写「（无）」');
  assert.ok(textOf(plain.html).includes('这一条没有留 AI 推理链'), '结论条如实说这一条没有');
  console.log('#786 V6 读数：' + AMENDED_ID + '／' + PLAIN_ID + ' 两条都出页');
});

test('#786 V7 老词「按 ID 查记录」（带空格）路由命中同键同槽位', () => {
  const spaced = routeWakeword('按 ID 查记录', { id: 7 });
  assert.equal(spaced.key, 'schedule.record.detail');
  assert.deepEqual(spaced.params, { id: 7 });
  const tight = routeWakeword('按ID查记录', { id: 7 });
  assert.equal(tight.key, 'schedule.record.detail');
  assert.deepEqual(tight.params, { id: 7 });
  // 缺槽位仍是既有口径（不是新造通道）。
  assert.throws(() => routeWakeword('按 ID 查记录', {}), /缺槽位 id/);
  console.log('#786 V7 读数：带空格与不带空格两条都命中 schedule.record.detail');
});

test('#786 V8 文案债已清：页上可见文本不出现分隔符门那几种并列符号', () => {
  const pages = [
    page(['schedule.plan.today', '--params', P({ date: DAY })]),
    page(['schedule.plan.today', '--params', P({ date: DAY, title: '开发' })]),
    page(['schedule.plan.today', '--params', P({ date: DAY, include_inactive: true })]),
    page(['schedule.record.detail', '--params', P({ id: AMENDED_ID })]),
  ];
  for (const [i, p] of pages.entries()) {
    const text = textOf(p.html);
    for (const ch of ['·', '｜', '~', '、', '；']) {
      assert.equal(text.includes(ch), false, '第 ' + (i + 1) + ' 张页的可见文本里不许出现「' + ch + '」');
    }
  }
  // 反面判据要能红：拿 #782 那张旧页的写法复核一次（`·` 与 `~` 当时都在）。
  assert.equal(textOf(pages[0].html).includes('至'), true, '范围一律写「至」');
  console.log('#786 V8 读数：4 张页 × 5 个符号＝零命中');
});

test('#786 V9 唤醒词进 frontmatter 与速查表，且照抄即跑', () => {
  const skill = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
  const fm = skill.slice(0, skill.indexOf('\n---', 4));
  assert.ok(fm.includes('按 ID 查记录'), 'SKILL.md frontmatter 的触发词列表须含「按 ID 查记录」');
  assert.ok(fm.includes('按ID查记录'), '不带空格那条也留着（路由里有它）');
  assert.ok(skill.includes('| 按 ID 查记录 | schedule.record.detail | detail |'), '构建期注入的速查表须有这一行');
  const hit = buildHelpLookup().find((h) => h.phrase === '按 ID 查记录');
  assert.ok(hit, '速查表（运行时）须能查到「按 ID 查记录」');
  assert.match(hit.cli, /--params '\{"id":1\}'/, '速查表给的示例要落在按 ID 那一档');
  const r = run(['schedule.record.detail', '--params', P({ id: AMENDED_ID })]);
  assert.equal(r.status, 0, '速查表示例照抄即能跑：' + String(r.stderr).slice(0, 200));
  console.log('#786 V9 读数：' + hit.cli);
});
