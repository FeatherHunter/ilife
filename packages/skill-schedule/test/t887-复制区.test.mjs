/** #887 复制区用例：**八域每张页的复制区都是「三格式菜单 ＋ 六段日志」**，且一页只有一个复制区。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t887-复制区.test.mjs`。
 *
 *  这一件量的是**主判据 1／2／3**（机判口径逐条落成断言）：
 *   ① 三格式在页上：`data-fmt-open="1"` ＋ 三个格式项齐（纯文本／JSON／CSV），且旧形态的 `data-t`
 *      不再直接挂在「复制数据」按钮上（菜单形态下那颗按钮只开合菜单）；
 *   ② 按钮文案不重复：每张页 `>复制数据<`／`>复制日志<` 各 ≤1 颗，任一复制区块内不出现两颗同名按钮；
 *   ③ 日志六段齐：「复制日志」按钮的 `data-t` 含六个段名。
 *  数据是**临时库 ＋ 内联记录**（任何机器都能跑）；**61 件真产物**那一条由
 *  `docs/skills/skill-schedule/t887-探针.mjs` 走（那不是用例）。
 *
 *  「改坏必红」：把任意一张页的 `dataFormats` 退回 `dataText`（或抽掉 JSON 那一项）→ 本件点名那一张页；
 *  把某个复制区标题换回旧的「复制数据／复制日志」两段文本 → ② 红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openScheduleDb, closeScheduleDb, addRecord, ensurePlanEvent } from '../dist/fetch/db.js';
import { scheduleCopyArea, scheduleCopyLog, scheduleNowStamp } from '../dist/render/copyArea.js';
import { viewRecordDetail, viewRecordRange, viewRecordToday, viewPlanToday } from '../dist/query/handlers.js';
import { writeRecord } from '../dist/write/handlers.js';
import { writePlan } from '../dist/plan/handlers.js';
import { viewRecordCompare } from '../dist/analyze/handlers.js';
import { renderFirstUsePage, renderInitReceiptPage } from '../dist/admin/adminDocs.js';

const DAY = '2026-09-21';
const NEXT = '2026-09-22';
const BASE = {
  source_contents: null, source_timestamps: null, analysis_reasoning: null,
  created_at: '2026-09-21 08:00:00', updated_at: '2026-09-21 08:00:00', edit_count: 0,
};
const rec = (id, date, start, end, minutes, activity, category) => ({
  ...BASE, id, date, time_start: start, time_end: end, duration_minutes: minutes, activity, category,
});
const DAY_RECORDS = [
  rec(1, DAY, '00:00', '06:30', 390, '睡眠', '维持.睡眠'),
  rec(2, DAY, '06:30', '07:30', 60, '早餐', '维持.用餐'),
  rec(3, DAY, '09:00', '12:00', 180, '写代码', '工作.开发'),
  rec(4, DAY, '13:00', '13:30', 30, '午睡', '调整.午睡'),
  rec(5, DAY, '23:00', '23:59', 59, '睡前阅读', '学习.读书'),
  // 对比那一支要**两个月都有记录**（`kind=months` 缺数据即阻断），故另摆两条。
  rec(6, '2026-08-15', '09:00', '12:00', 180, '写代码', '工作.开发'),
  rec(7, '2026-09-10', '09:00', '12:00', 180, '写代码', '工作.开发'),
];

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ');
const count = (body, re) => (body.match(re) ?? []).length;

/** 复制区块那一段的边界（标记形态，取最后一处：样式表里也有同名类名）。 */
const COPY_OPEN = '<section class="ilife-block ilife-block-copy-block">';
function copyBlocks(body) {
  const out = [];
  let at = body.indexOf(COPY_OPEN);
  while (at >= 0) {
    const end = body.indexOf('</section>', at);
    out.push(body.slice(at, end + '</section>'.length));
    at = body.indexOf(COPY_OPEN, end);
  }
  return out;
}

/** 六段段名（公共层 `LOG_SECTION_TITLES` 的逐字口径）。 */
const LOG_SECTIONS = ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常'];
/** 三格式菜单项的三个可见名（`COPY_FORMATS` 的逐字口径）。 */
const FORMAT_LABELS = ['纯文本', 'JSON', 'CSV'];

/** 主判据 1／2／3 的机判（每张页都过这一套）。 */
function assertCopyContract(html, label) {
  const body = markupOf(html);
  // ① 三格式在页上
  assert.equal(count(body, /data-fmt-open="1"/g), 1, label + '：复制数据按钮须是菜单形态（data-fmt-open="1" 恰一处）');
  for (const name of FORMAT_LABELS) {
    assert.ok(body.includes('<span class="ilife-copy-menu-label">' + name + '</span>'),
      label + '：三格式菜单缺 ' + name + ' 那一项');
  }
  for (const fmt of ['text', 'json', 'csv']) {
    assert.ok(body.includes('data-fmt="' + fmt + '"'), label + '：菜单缺 data-fmt="' + fmt + '" 那一项');
  }
  const dataButton = (body.match(/<button[^>]*data-fmt-open="1"[^>]*>复制数据<\/button>/) ?? [])[0];
  assert.ok(dataButton !== undefined, label + '：复制数据按钮的形态不是「开合菜单」（找不到那颗按钮）');
  assert.ok(!dataButton.includes('data-t='),
    label + '：菜单形态下复制数据按钮只许开合菜单，不许直接挂 data-t（旧形态）');
  // ② 按钮文案不重复
  assert.equal(count(body, />复制数据</g), 1, label + '：一页只许一颗「复制数据」');
  assert.equal(count(body, />复制日志</g), 1, label + '：一页只许一颗「复制日志」');
  for (const block of copyBlocks(body)) {
    const names = [...block.matchAll(/>([^<>]{1,8})<\/button>/g)].map((m) => m[1]);
    for (const name of new Set(names)) {
      assert.equal(names.filter((n) => n === name).length, 1, label + '：复制区块里出现了两颗同名按钮「' + name + '」');
    }
  }
  // ③ 日志六段齐
  const logButton = (body.match(/<button[^>]*>复制日志<\/button>/) ?? [])[0];
  assert.ok(logButton !== undefined, label + '：缺「复制日志」按钮');
  for (const section of LOG_SECTIONS) {
    assert.ok(logButton.includes(section), label + '：复制日志的载荷缺第「' + section + '」段');
  }
  return body;
}

/** 一页的复制区读数（判据 2 的 before／after 计数就取这一对）。 */
function copyCounts(html) {
  const body = markupOf(html);
  return {
    blocks: copyBlocks(body).length,
    data: count(body, />复制数据</g),
    log: count(body, />复制日志</g),
  };
}

/** 临时库：一天的记录 ＋ 两条计划（八域的代表页都从它出）。 */
function withDb(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't887-test-'));
  const handle = openScheduleDb(join(dir, 'schedule_data.db'));
  try {
    for (const r of DAY_RECORDS) {
      addRecord(handle, {
        date: r.date, time_start: r.time_start, time_end: r.time_end,
        duration_minutes: r.duration_minutes, activity: r.activity, category: r.category,
      });
    }
    for (const [start, end, title, category] of [
      ['09:00', '10:00', '写代码', '工作'], ['14:00', '15:00', '复盘', '日常'],
    ]) {
      ensurePlanEvent(handle, { date: DAY, time_start: start, time_end: end, title, category });
    }
    return fn(handle);
  } finally {
    closeScheduleDb(handle);
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 八域代表页（每域至少一张；覆盖六张页型与各能力目录自己装配的页）。 */
function pagesOf(handle) {
  const today = viewRecordToday({ date: DAY }, handle);
  const week = viewRecordRange({ view: 'week', date: DAY }, handle);
  const range = viewRecordRange({ start: '2026-09-01', end: '2026-09-30' }, handle);
  const overview = viewPlanToday({ view: 'aggregate', date: DAY }, handle);
  const planDay = viewPlanToday({ date: DAY }, handle);
  const detail = viewRecordDetail({ date: DAY }, handle);
  const written = writeRecord({
    op: 'add', date: NEXT, time_start: '08:00', time_end: '09:00', activity: '写用例', category: '工作.开发',
  }, handle);
  const ensure = writePlan({
    op: 'ensure', date: NEXT, time_start: '10:00', time_end: '11:00', title: '写用例', category: '工作',
  }, handle);
  // 商量计划预览那一支要一份**覆盖满 24 小时**的候选（`assertCoverage24h` 的口径）。
  const preview = writePlan({
    op: 'preview', date: NEXT,
    events: [
      { time_start: '00:00', time_end: '12:00', title: '上午安排', category: '工作' },
      { time_start: '12:00', time_end: '24:00', title: '下午与夜间', category: '日常' },
    ],
  }, handle);
  const review = writePlan({ op: 'review', date: DAY }, handle);
  const replay = writePlan({ op: 'review', date: DAY, granularity: 'day' }, handle);
  const compare = viewRecordCompare({ kind: 'months', monthA: '2026-08', monthB: '2026-09' }, handle);
  return [
    { domain: '#784', label: '今天总结', html: today.html, key: 'schedule.record.today' },
    { domain: '#785', label: '周视图', html: week.html, key: 'schedule.record.range' },
    { domain: '#785', label: '汇总作息', html: range.html, key: 'schedule.record.range' },
    { domain: '#785', label: '24h 概览', html: overview.html, key: 'schedule.plan.today' },
    { domain: '#786', label: '查日程', html: planDay.html, key: 'schedule.plan.today' },
    { domain: '#786', label: '作息详情', html: detail.html, key: 'schedule.record.detail' },
    { domain: '#783', label: '记作息结果', html: written.html, key: 'schedule.record.write' },
    { domain: '#787', label: '补计划回执', html: ensure.html, key: 'schedule.plan.write' },
    { domain: '#787', label: '商量计划预览', html: preview.html, key: 'schedule.plan.write' },
    { domain: '#788', label: '复盘（单日逐条）', html: review.html, key: 'schedule.plan.write' },
    { domain: '#788', label: '复盘今日（一体页）', html: replay.html, key: 'schedule.plan.write' },
    { domain: '#789', label: '作息对比', html: compare.html, key: 'schedule.record.compare' },
    { domain: '#790', label: '初始化回执', html: renderInitReceiptPage({
      created: true,
      paths: { dbDir: join(tmpdir(), 'unit', 'data'), dbFile: join(tmpdir(), 'unit', 'data', 'schedule_data.db'), pagesRoot: join(tmpdir(), 'unit', 'data', 'schedule_html'), helpDir: join(tmpdir(), 'unit', 'data', 'schedule_html', 'help') },
      counts: { records: 5, days: 1, plans: 2, summaries: 0, firstDate: DAY, lastDate: DAY },
    }), key: 'schedule.help.lookup' },
    { domain: '#790', label: '首次使用向导', html: renderFirstUsePage({
      created: true,
      paths: { dbDir: join(tmpdir(), 'unit', 'data'), dbFile: join(tmpdir(), 'unit', 'data', 'schedule_data.db'), pagesRoot: join(tmpdir(), 'unit', 'data', 'schedule_html'), helpDir: join(tmpdir(), 'unit', 'data', 'schedule_html', 'help') },
      counts: { records: 5, days: 1, plans: 2, summaries: 0, firstDate: DAY, lastDate: DAY },
      steps: [{ name: '环境检测', status: 'ok', statusText: '通过', desc: '运行环境可用' }],
      todos: [], verify: ['作息管家 HELP 能打开一份帮助页'],
      prompt: '请帮我初始化作息管家，我是第一次使用',
      feishu: { note: '这一趟没探到飞书命令行。', unavailable: true },
    }), key: 'schedule.help.lookup' },
  ];
}

describe('#887 复制区（三格式菜单 ＋ 六段日志，八域同口径）', () => {
  it('① 三格式在页上：每张页都是菜单形态，三个格式项齐，旧形态的 data-t 不上复制数据按钮', () => {
    const seen = withDb((handle) => pagesOf(handle).map((page) => {
      assertCopyContract(page.html, '#' + page.domain + ' ' + page.label);
      return page.label;
    }));
    assert.equal(seen.length, 14, '八域代表页都要过的（少了页就说明这张页没接上复制区）');
  });

  it('② 按钮文案不重复：每张页两对都降到 1 颗（t790 那两张原先各 2／2 与 5／5）', () => {
    const readings = withDb((handle) => pagesOf(handle).map((page) => ({
      label: page.label, ...copyCounts(page.html),
    })));
    for (const r of readings) {
      assert.equal(r.blocks, 1, r.label + '：一页只有一个复制区（实为 ' + String(r.blocks) + '）');
      assert.equal(r.data, 1, r.label + '：「复制数据」须恰 1 颗（实为 ' + String(r.data) + '）');
      assert.equal(r.log, 1, r.label + '：「复制日志」须恰 1 颗（实为 ' + String(r.log) + '）');
    }
    // t790 那两张的 after 读数单独钉一遍（票面验收第 1 条点名的 2／2／2／5 → 1／1／1／1）。
    const admin = readings.filter((r) => r.label === '初始化回执' || r.label === '首次使用向导');
    assert.deepEqual(admin.map((r) => [r.data, r.log]), [[1, 1], [1, 1]], 't790 两张页各只剩一对按钮');
  });

  it('③ 日志六段齐：每张页的「复制日志」载荷都带六个段名', () => {
    withDb((handle) => {
      for (const page of pagesOf(handle)) {
        const logButton = (markupOf(page.html).match(/<button[^>]*>复制日志<\/button>/) ?? [])[0];
        for (const section of LOG_SECTIONS) {
          assert.ok(logButton.includes(section), '#' + page.domain + ' ' + page.label + '：缺第「' + section + '」段');
        }
      }
    });
  });

  it('④ 复制区载荷＝真命令的 key ＋ 该 key 形状的数据（三格式各一份、json 能解析回同一份）', () => {
    const html = scheduleCopyArea({
      key: 'schedule.record.today',
      payload: { items: [{ id: 1, activity: '睡眠' }], total: 1 },
      title: '复制与留档',
      dataActionId: 'ilife-x-copy-data',
      logActionId: 'ilife-x-copy-log',
      log: scheduleCopyLog({ command: 'schedule-cmd-read schedule.record.today --params {}', source: '作息记录表', actionAt: scheduleNowStamp() }),
    });
    const items = [...html.matchAll(/<button[^>]*class="ilife-copy-menu-item"[^>]*data-fmt="([a-z]+)"[^>]*>/g)];
    assert.deepEqual(items.map((m) => m[1]), ['text', 'json', 'csv'], '三个格式项的次序＝COPY_FORMATS');
    const raw = (fmt) => {
      const tag = (html.match(new RegExp('<button[^>]*data-fmt="' + fmt + '"[^>]*>')) ?? [])[0];
      return (tag.match(/data-t="([^"]*)"/) ?? [, ''])[1];
    };
    const text = raw('text');
    const json = raw('json').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    assert.ok(text.startsWith('【schedule · schedule.record.today】'), 'text 口径的输出头由 key 派生：' + text.split('\n')[0]);
    const parsed = JSON.parse(json);
    assert.equal(parsed.skill, 'schedule');
    assert.equal(parsed.key, 'schedule.record.today');
    assert.equal(parsed.shape, 'list');
    assert.equal(parsed.data.total, 1);
    assert.ok(raw('csv').startsWith('section,row'), 'csv 口径带表头');
  });

  it('⑤ t790 四处落点各一枚按钮、不再成对（缺「复制区内的自定义复制按钮」时的停档形态）', () => {
    const html = renderFirstUsePage({
      created: true,
      paths: { dbDir: '/x/data', dbFile: '/x/data/schedule_data.db', pagesRoot: '/x/data/schedule_html', helpDir: '/x/data/schedule_html/help' },
      counts: { records: 0, days: 0, plans: 0, summaries: 0, firstDate: null, lastDate: null },
      steps: [{ name: '环境检测', status: 'ok', statusText: '通过', desc: '运行环境可用' }],
      todos: [], verify: ['作息管家 HELP 能打开一份帮助页'],
      prompt: '请帮我初始化作息管家，我是第一次使用',
      feishu: { note: '这一趟没探到飞书命令行。', unavailable: true },
    });
    const body = markupOf(html);
    for (const label of ['复制库目录路径', '复制库文件路径', '复制产物根目录路径', '复制帮助页路径']) {
      assert.equal(count(body, new RegExp('>' + label + '<', 'g')), 1, '落点「' + label + '」须恰一枚按钮');
      assert.ok(body.includes('data-t="/x/'), label + '：完整路径须进那颗按钮的 data-t');
    }
    assert.equal(count(body, />复制数据</g), 1, '四处落点不再各自带一颗「复制数据」');
    assert.equal(count(body, />复制日志</g), 1, '四处落点不再各自带一颗「复制日志」');
  });
});
