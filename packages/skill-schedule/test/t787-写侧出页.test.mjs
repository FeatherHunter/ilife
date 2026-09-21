/**
 * #787 · 日程与计划·写侧：补／改／删计划回执 ＋ 商量计划预览（过程型）＋ 制定次日计划结果出页。
 *
 * 本域 19 行（`场景清单.json` 的 `domain=plan` 里判）：#13 补计划 3 行（`ensure_event_basic`／
 * `ensure_event_idempotent`／`ensure_event_with_notes`）、#17 商量计划 10 行（`plan_discuss_tomorrow`／
 * `plan_with_locked`／`plan_result_tomorrow`／`plan_result_adjust`／`plan_result_history_none`／
 * `plan_result_conflict`／`plan_result_drift` 出页；`plan_with_wish`／`plan_24h_coverage_fail`／
 * `plan_feishu_sync` 三行有意不出，理由写进探针）、#18 改计划 4 行、#19 删计划 2 行。
 * 逐行的产物在探针 `docs/skills/skill-schedule/t787-探针.mjs` 里；本件锁的是**页契约**：
 *
 *   V1 补计划（新建）：真页 ＋ f15 两块必现块（新事件回执；幂等命中注记位这一档**不出现**）
 *   V2 补计划（幂等命中）：同一条再补一次 → 认回原来那条，页上给出「这一步没有新建」
 *   V3 批量补计划（`dates[]`）：逐天结果表 ＋ 汇总，两天各自命中／新建分得清
 *   V4 改计划回执：字段前后对照（蓝调面板）＋ 改时段那句「远端删旧建新」的说明
 *   V5 删计划回执：软删的对照 ＋ 「原件还在库里」那句；这一天少一件
 *   V6 商量计划预览：候选事件表 ＋ 锁定事件区 ＋ 空隙提示三块必现；**这一趟不写库**
 *   V7 制定次日计划结果：时间轴与分类色带 ＋ 历史贴合提示 ＋ 冲突与警告 ＋ 偏离警示（拿记录种出历史）
 *   V8 无历史参考那一档：往前 7 天没有记录 → 贴合率写「—」，逐段按无参考算
 *   V9 页上可见文本不出现命令键、库列名、参数名，也不出现分隔符门那几种并列符号
 *
 * 现场数据**自己种**（#763 家目录隔离，不碰真库、也不依赖 #844 的种子库）：一天一条记录 ＋ 三条计划；
 * 历史那一段在 V7 那一组里现种（往前 7 天各一条记录）。
 *
 * 「改坏必红」：把 `handlers.ts` 的 `pageOf` 换回 `''` → V1／V4／V5／V6／V7 全红；把幂等那一支的
 * `created` 判反 → V2 红；把 `assertCoverage24h` 的产出直接当空隙 → V6 红；把 `fitOf` 的三档合并 → V7 红
 * （探针里的变异自证不在本件）。
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);
const DAY = '2026-09-15';
/** 商量计划那一天（比 DAY 晚一周，且这一天自己有一条既有事件，用来种出「与已有重叠」与「锁定事件区」）。 */
const NEXT = '2026-09-22';

let HOME = '';
let FIRST_ID = 0;

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: homeEnvOf(HOME),
  });
}

/** 一条写命令的真出口跑法：回执 ＋ 缺省落盘那一份真页（整页两份断言都在这里）。 */
function page(params, opts = {}) {
  const r = run(['schedule.plan.write', '--params', P(params)]);
  assert.equal(r.status, opts.exit ?? 0, '须 exit ' + (opts.exit ?? 0) + '：' + String(r.stderr).slice(0, 300));
  const env = JSON.parse(String(r.stdout));
  const out = env.delivery?.path;
  assert.ok(typeof out === 'string' && out !== '', '缺省调用须回 delivery.path');
  assert.equal(statSync(out).size, env.delivery.bytes, '盘上字节须等于回执 bytes');
  const html = readFileSync(out, 'utf8');
  assert.match(html, /^<!doctype html>/i, '须是整页（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须是整页（</html> 收）');
  return { env, html, out };
}

const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const count = (s, re) => (s.match(re) ?? []).length;

/** 商量计划的一版候选：00:00 至 24:00 一段接一段（校验口径要求整天连续）。 */
const CANDIDATES = [
  ['00:00', '07:30', '睡眠', '维持.睡眠'],
  ['07:30', '08:00', '晨间冥想', '健康.冥想'],
  ['08:00', '09:00', '早餐与通勤', '维持.通勤'],
  ['09:00', '11:30', '深度开发', '工作.开发'],
  ['11:30', '12:30', '午饭', '维持.用餐'],
  ['12:30', '13:00', '午间散步', '调整.散步'],
  ['13:00', '14:00', '午睡', '调整.午睡'],
  ['14:00', '16:00', '需求评审会', '工作.会议'],
  ['16:00', '16:30', '休息', '调整.休息'],
  ['16:30', '18:00', '写周报', '工作.文案'],
  ['18:00', '19:00', '晚饭', '维持.用餐'],
  ['19:00', '20:00', '打游戏', '调整.游戏'],
  ['20:00', '21:00', '读书一小时', '学习.读书'],
  ['21:00', '21:30', '洗漱', '维持.洗漱'],
  ['21:30', '22:30', '剪辑视频', '创作.视频'],
  ['22:30', '24:00', '睡前放松', '调整.休息'],
];
const events = (spec) => spec.map(([time_start, time_end, title, category]) => ({ time_start, time_end, title, category }));

/** 一个日期往前 7 天各一条同样作息的记录（结果页的「历史贴合」要的东西）。 */
function seedHistory(anchor) {
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(anchor + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const r = run(['schedule.record.write', '--params', P({
      op: 'add', date, time_start: '09:00', time_end: '11:30', activity: '写代码', category: '工作.开发',
    })]);
    assert.equal(r.status, 0, '历史记录种子失败：' + String(r.stderr).slice(0, 200));
  }
}

before(() => {
  HOME = mkdtempSync(join(tmpdir(), 'sched787-'));
  seedHistory(NEXT);
  for (const [s, e, title] of [['07:30', '08:00', '晨间冥想'], ['09:00', '11:30', '深度开发'], ['21:30', '22:30', '旧版视频']]) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: DAY, time_start: s, time_end: e, title, feishu: 'skip' })]);
    assert.equal(r.status, 0, '计划种子失败：' + String(r.stderr).slice(0, 200));
  }
  const items = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: DAY })]).stdout)).data.items;
  assert.equal(items.length, 3, '这一天种下三条计划');
  FIRST_ID = items.find((x) => x.title === '晨间冥想').id;
  // 商量计划那一天自己也有一条既有事件（「锁定事件区」与「与已有重叠」都要看它）。
  const n = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: NEXT, time_start: '09:00', time_end: '11:30', title: '深度开发', feishu: 'skip' })]);
  assert.equal(n.status, 0, '商量计划那一天的计划种子失败：' + String(n.stderr).slice(0, 200));
});

test('#787 V1 补计划（新建）：真页 ＋ f15 两块必现块（新事件回执；幂等注记位不出现）', () => {
  const { env, html } = page({ op: 'ensure', date: DAY, time_start: '12:30', time_end: '13:00', title: '午间散步', feishu: 'skip' });
  const text = textOf(html);
  assert.ok(text.includes('补计划回执'), '页头是「补计划回执」');
  assert.ok(text.includes('这一趟的结果'), '必现块①：新事件回执（结论条 ＋ 读数格）');
  assert.ok(!text.includes('这一步没有新建'), '必现块②：新建那一档不许出现幂等注记位');
  assert.equal(env.data.local, 'created', '本地这一半＝新建');
  assert.ok(text.includes('12:30 至 13:00'), '时段写「起 至 止」');
  console.log('#787 V1 读数：页字节 ' + Buffer.byteLength(html, 'utf8') + '，local=' + env.data.local);
});

test('#787 V2 补计划（幂等命中）：认回原来那条，页上给出注记位', () => {
  const first = page({ op: 'ensure', date: DAY, time_start: '15:00', time_end: '15:30', title: '闭眼休息', feishu: 'skip' });
  const again = page({ op: 'ensure', date: DAY, time_start: '15:00', time_end: '15:30', title: '闭眼休息', feishu: 'skip' });
  assert.equal(first.env.data.local, 'created');
  assert.equal(again.env.data.local, 'found', '同一天同一段起止再补一次＝命中已有');
  assert.equal(again.env.data.id, first.env.data.id, '认回原来那条（编号不换）');
  assert.ok(markupOf(again.html).includes('ilife-block-feedback-block-title">这一步没有新建'), '必现块②：幂等命中注记位在页上（按它自己那一块的标题认，结论条里那句不算）');
  console.log('#787 V2 读数：两次都落在 #' + String(again.env.data.id) + '，第二次 local=' + again.env.data.local);
});

test('#787 V3 批量补计划：逐天结果表 ＋ 两天各自分得清', () => {
  const { env, html } = page({
    op: 'ensure', feishu: 'skip',
    dates: [
      { date: '2026-09-23', time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动' },
      { date: '2026-09-24', time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动' },
    ],
  });
  const text = textOf(html);
  assert.ok(text.includes('批量补计划回执'), '页头是「批量补计划回执」');
  assert.ok(text.includes('逐天结果'), '必现块：逐天结果表');
  assert.ok(text.includes('2026-09-23') && text.includes('2026-09-24'), '两天都上屏');
  assert.equal(env.data.counts.days, 2, '载荷口径：两天');
  console.log('#787 V3 读数：两天都出页，页字节 ' + Buffer.byteLength(html, 'utf8'));
});

test('#787 V4 改计划回执：字段前后对照 ＋ 改时段那句说明', () => {
  const { env, html } = page({
    op: 'update', id: FIRST_ID, time_start: '07:15', time_end: '07:45', title: '晨间冥想与拉伸', feishu: 'skip',
  });
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(text.includes('改计划回执'), '页头是「改计划回执」');
  assert.ok(marks.includes('sch-pl-diff'), '必现块①：字段前后对照走蓝调面板');
  assert.ok(marks.includes('ilife-block-change-row'), '对照逐格成行');
  assert.ok(text.includes('时段变了，飞书那条也换过'), '必现块②：飞书询问位（时段变了要说清远端怎么做）');
  assert.ok(text.includes('07:30 至 08:00') && text.includes('07:15 至 07:45'), '改前改后两个时段都在页上');
  assert.deepEqual(Object.keys(env.data).sort(), ['achieved', 'counts', 'date', 'errors', 'local', 'message', 'notes', 'ok', 'op', 'remote', 'remoteId', 'id'].sort(), '载荷字段只多不少（口径没改）');
  console.log('#787 V4 读数：对照 ' + count(marks, /ilife-block-change-row/g) + ' 行');
});

test('#787 V5 删计划回执：软删的对照 ＋ 原件还在库里', () => {
  const before = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: DAY })]).stdout)).data.total;
  const { html } = page({ op: 'deactivate', id: FIRST_ID, feishu: 'skip' });
  const after = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: DAY })]).stdout)).data.total;
  const text = textOf(html);
  assert.ok(text.includes('删计划回执'), '页头是「删计划回执」');
  assert.ok(text.includes('这是软删，不是抹掉'), '必现块：软删的语义在页上');
  assert.ok(text.includes('这一条的前后'), '必现块：前后对照');
  assert.equal(after, before - 1, '软删之后这一天少一件');
  console.log('#787 V5 读数：' + String(before) + ' 件 → ' + String(after) + ' 件');
});

test('#787 V6 商量计划预览：三块必现（候选事件表／锁定事件区／空隙提示），且不写库', () => {
  const before = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: NEXT })]).stdout)).data.total;
  const { html } = page({ op: 'preview', date: NEXT, feishu: 'skip', events: events(CANDIDATES) });
  const after = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: NEXT })]).stdout)).data.total;
  const marks = markupOf(html);
  const text = textOf(html);
  assert.ok(text.includes('商量计划预览'), '页头是「商量计划预览」');
  assert.ok(text.includes('候选事件'), '必现块①：候选事件表');
  assert.ok(text.includes('锁定事件区'), '必现块②：锁定事件区');
  assert.ok(text.includes('空隙提示'), '必现块③：空隙提示');
  assert.ok(marks.includes('ilife-block-data-table'), '候选事件表走公共层表格');
  assert.equal(count(marks, /data-label="标题"/g), CANDIDATES.length, '候选一行一段');
  assert.equal(after, before, '预览不写库（这一天的事件数一件不变）');
  console.log('#787 V6 读数：候选 ' + String(CANDIDATES.length) + ' 段，库内 ' + String(before) + ' 件不变');
});

test('#787 V7 制定次日计划结果：色带 ＋ 贴合 ＋ 冲突 ＋ 偏离四块必现', () => {
  const { env, html } = page({ op: 'upsert', date: NEXT, feishu: 'skip', events: events(CANDIDATES) });
  const text = textOf(html);
  assert.ok(text.includes('制定次日计划结果'), '页头是「制定次日计划结果」');
  assert.ok(text.includes('24 小时时间轴与分类色带'), '必现块①：时间轴与分类色带');
  assert.ok(text.includes('历史贴合提示'), '必现块②：历史贴合提示');
  assert.ok(text.includes('冲突与警告'), '必现块③：冲突与警告（红徽章位）');
  assert.ok(text.includes('偏离警示'), '必现块④：偏离警示位（拿记录种出了历史）');
  assert.ok(text.includes('9:00 至 11:30') || text.includes('09:00 至 11:30'), '历史那一格报的是同一时段');
  assert.equal(env.data.local, 'upserted', '本地这一半＝整日覆盖');
  console.log('#787 V7 读数：页字节 ' + Buffer.byteLength(html, 'utf8') + '，贴合率在页上');
});

test('#787 V8 无历史参考那一档：贴合率写「—」，逐段按无参考算', () => {
  const far = '2026-10-05';
  const { html } = page({ op: 'upsert', date: far, feishu: 'skip', events: events(CANDIDATES) });
  const text = textOf(html);
  assert.ok(text.includes('这一版没有历史可参照'), '无参考那一档有交代');
  assert.ok(text.includes('无参考'), '逐段按无参考算');
  console.log('#787 V8 读数：' + far + ' 往前 7 天没有记录 → 贴合率写「—」');
});

test('#787 V9 页上可见文本无内部标识、无并列分隔符债', () => {
  const { html } = page({ op: 'ensure', date: DAY, time_start: '17:00', time_end: '17:30', title: '买菜', category: '维持.采购', feishu: 'skip' });
  const text = textOf(html);
  for (const bad of ['schedule.', 'time_start', 'time_end', 'completion', 'is_active', 'feishu_event_id', 'op=']) {
    assert.ok(!text.includes(bad), '页上不许出现内部标识：' + bad);
  }
  for (const ch of ['·', '；', '～', '~']) {
    assert.ok(!text.includes(ch), '页上不许出现分隔符门点名的并列符号：' + ch);
  }
  assert.ok(!/t\d{3,}/.test(text) && !/#\d{2,}/.test(text), '页上不许出现票号');
  console.log('#787 V9 读数：可见文本 ' + String(text.length) + ' 字，零内部标识');
});
