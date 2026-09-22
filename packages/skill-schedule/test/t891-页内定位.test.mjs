/** #891 页内定位用例：**判据本身**（长页出页内目录 ＋ 每一小节一条条目 ＋ 锚点吃定位避让）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t891-页内定位.test.mjs`。
 *
 *  **测的是外部行为**：只读渲染出来的 HTML（目录块、条目数、锚点落点、样式表里那条避让声明），
 *  不测 `pageNav` 的内部实现。判据的唯一一处定义地在 `src/shared/pageNav.ts` 的 `SECTION_TOC_MIN`，
 *  本件按它逐页对照：**小节数 ＝ 页壳正文里带 `id="sec-N"` 的 `<section>` 数**（＝ `pageSections` 里给了
 *  `navText` 的那几段，也就是目录条目数）。
 *  ⚠️ #906 改口径（据实）：原来是数**页内 `<h2>` 数**，与 #891 票面现状表同源；但 `pageNav.ts` 的判据
 *  写的是「小节＝带 `navText` 的那一段」，从来没规定那一段里必须有 `<h2>` —— 复制区那行小标题（#906 删掉的那行）
 *  一走，数 `<h2>` 就假红（今天总结满档：目录 3 条／`<h2>` 2 颗）。数 `<section id="sec-N">` 才对得上判据本身。
 *
 *  数据是**临时库**（`node:sqlite` 开在系统临时目录，用完即删），不碰种子库：本包用例要在任何机器上
 *  都能跑；真产物那一条链由八支域探针（t783–t790）与 `.scratch/t891/` 的读数走。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addRecord, ensurePlanEvent, closeScheduleDb, listPlanEvents, openScheduleDb,
} from '../dist/fetch/db.js';
import { buildPlanOverview } from '../dist/plan/overview.js';
import { renderTodaySummaryPage, renderWeekViewPage, renderPlanOverviewPage, renderRecordDetailPage } from '../dist/query/queryDocs.js';
import { renderPlanDayPage } from '../dist/plan/planDocs.js';
import { recordResultPage, summaryReceiptPage } from '../dist/write/writeDocs.js';
import { renderInitReceiptPage } from '../dist/admin/adminDocs.js';
import { renderComparePage } from '../dist/analyze/analyzeDocs.js';
import { ensureBatchReceiptPage, ensureReceiptPage } from '../dist/plan/receiptDocs.js';
import { previewPage } from '../dist/plan/discussDocs.js';
import { probePage } from '../dist/plan/feishuDocs.js';
import { replayPage } from '../dist/plan/replaySections.js';
import { reviewPage } from '../dist/plan/reviewDocs.js';

/** 长页判据（与 `src/shared/pageNav.ts` 的 `SECTION_TOC_MIN` 同值；改判据两处一起改）。 */
const SECTION_TOC_MIN = 3;

const DAY = '2026-09-21';
const WEEK = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'];

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');
const count = (body, re) => (body.match(re) ?? []).length;

/** 页内小节数＝页壳正文里带 `id="sec-N"` 的 `<section>` 数（＝ `pageSections` 里给了 `navText` 的那几段）。
 *  #906 前这里数的是 `<h2>` 数：口径与 `pageNav.ts` 的判据不一致（判据只看「这一段有没有 navText」），
 *  复制区那行小标题一删就假红。 */
const sectionsOf = (html) => count(markupOf(html), /<section id="sec-\d+">/g);

/** 页内目录的条目（`nav.ilife-block-toc` 里的锚点）。没有目录块 ⇒ 空数组。 */
function tocItemsOf(html) {
  const nav = markupOf(html).match(/<nav class="ilife-block-toc"[\s\S]*?<\/nav>/);
  if (nav === null) return [];
  return [...nav[0].matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map((m) => ({ id: m[1], text: m[2] }));
}

/** 页壳正文的**直接子件**里带 `id` 的那些（公共层 `pageUiCss` ③ 只给它们吃 `scroll-margin-top`）。 */
function bodyChildIds(html) {
  const m = markupOf(html).match(/<div class="ilife-block-page-shell-body">([\s\S]*)<\/div><\/section>/);
  const body = m === null ? '' : m[1];
  const ids = [];
  // 捕到的串是正文 `<div>` 的**内容**，故「直接子件」＝算上那层 div 之后的深度 1。
  let depth = 1;
  for (const tag of body.matchAll(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi)) {
    const [raw, close, name, attrs] = tag;
    if (close === '/') { depth -= 1; continue; }
    if (depth === 1) {
      const id = (attrs.match(/\bid="([^"]+)"/) ?? [])[1];
      if (id !== undefined) ids.push(id);
    }
    // 自闭合（`... />`）不抬深度；`<br>`／`<img>` 这类 void 元素同理。
    const selfClose = /\/$/.test(raw.slice(0, -1));
    if (!selfClose && !VOID.has(name.toLowerCase())) depth += 1;
  }
  return ids;
}
const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);

/** 一页的页内定位契约（长页／短页两档共用这一条判据）。 */
function assertPageNav(html, label) {
  const sections = sectionsOf(html);
  const items = tocItemsOf(html);
  const long = sections >= SECTION_TOC_MIN;
  assert.equal(
    items.length > 0, long,
    label + '：小节 ' + sections + ' 颗 ⇒ 该' + (long ? '出' : '不出') + '页内目录（实得 ' + items.length + ' 条）',
  );
  if (!long) return;
  assert.equal(items.length, sections, label + '：页内目录条目数须等于小节数（一条 ＝ 一颗段名）');
  const ids = bodyChildIds(html);
  for (const item of items) {
    assert.notEqual(item.text.trim(), '', label + '：目录条目文本不许为空');
    assert.ok(ids.includes(item.id),
      label + '：锚点 #' + item.id + ' 须落在页壳正文的**直接子件**上（公共层只给直接子件吃定位避让）');
  }
  // 定位避让仍走公共层那一份（`pageUiCss()` ③），本域不另写一条。
  assert.ok(/scroll-margin-top:\s*20px/.test(html), label + '：须带公共层的定位避让声明');
}

/** 临时库 ＋ 一天的记录与计划（四张读数、时间轴、详情、复盘都要有料）。 */
function withDb(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't891-test-'));
  const handle = openScheduleDb(join(dir, 'schedule_data.db'));
  try {
    addRecord(handle, {
      date: DAY, time_start: '00:00', time_end: '06:30', duration_minutes: 390,
      activity: '睡眠', category: '维持.睡眠', analysis_reasoning: '按原话归到睡眠',
    });
    addRecord(handle, {
      date: DAY, time_start: '09:00', time_end: '12:00', duration_minutes: 180,
      activity: '写代码', category: '工作.开发', analysis_reasoning: '活动关键词命中开发',
    });
    addRecord(handle, { date: DAY, time_start: '13:00', time_end: '13:30', duration_minutes: 30, activity: '午睡', category: '调整.午睡' });
    addRecord(handle, { date: DAY, time_start: '20:00', time_end: '21:00', duration_minutes: 60, activity: '读书', category: '学习.阅读' });
    ensurePlanEvent(handle, { date: DAY, time_start: '09:00', time_end: '11:30', title: '深度开发', category: '工作.开发' });
    ensurePlanEvent(handle, { date: DAY, time_start: '14:00', time_end: '16:00', title: '需求评审', category: '工作.会议' });
    return fn(handle);
  } finally {
    closeScheduleDb(handle);
    rmSync(dir, { recursive: true, force: true });
  }
}

const RECORDS = [
  { id: 1, date: DAY, time_start: '00:00', time_end: '06:30', duration_minutes: 390, activity: '睡眠', category: '维持.睡眠', source_contents: null, source_timestamps: null, analysis_reasoning: null, created_at: DAY + ' 00:00:00', updated_at: DAY + ' 00:00:00', edit_count: 0 },
  { id: 2, date: DAY, time_start: '09:00', time_end: '12:00', duration_minutes: 180, activity: '写代码', category: '工作.开发', source_contents: null, source_timestamps: null, analysis_reasoning: '原话里点了开发', created_at: DAY + ' 00:00:00', updated_at: DAY + ' 00:00:00', edit_count: 0 },
  { id: 3, date: DAY, time_start: '20:00', time_end: '21:00', duration_minutes: 60, activity: '读书', category: '学习.阅读', source_contents: null, source_timestamps: null, analysis_reasoning: null, created_at: DAY + ' 00:00:00', updated_at: DAY + ' 00:00:00', edit_count: 0 },
];
const PLAN_EVENTS = [
  { id: 1, date: DAY, time_start: '09:00', time_end: '11:30', title: '深度开发', notes: null, category: '工作.开发', feishu_event_id: null, last_synced_at: null, is_active: 1, completion: '已完成', completion_note: null, created_at: DAY + ' 00:00:00', updated_at: DAY + ' 00:00:00' },
  { id: 2, date: DAY, time_start: '14:00', time_end: '16:00', title: '需求评审', notes: null, category: '工作.会议', feishu_event_id: null, last_synced_at: null, is_active: 1, completion: null, completion_note: null, created_at: DAY + ' 00:00:00', updated_at: DAY + ' 00:00:00' },
];
const STATUS = { records: 4, days: 1, firstDate: DAY, lastDate: DAY, last: { date: DAY, time_end: '21:00', activity: '读书' } };

describe('#891 页内定位：长页出页内目录、短页可不出（判据见 shared/pageNav.ts）', () => {
  it('今天总结：带「作息库现状」＝3 小节 ⇒ 出目录，条目＝段名逐字', () => {
    const html = renderTodaySummaryPage(RECORDS, DAY, { status: STATUS });
    assertPageNav(html, '今天总结（满档）');
    const texts = tocItemsOf(html).map((i) => i.text);
    assert.deepEqual(texts, ['24 小时时间轴', '作息库现状', '复制与留档'], '目录条目＝各小节段名，顺序即件序列');
    for (const t of texts) assert.ok(markupOf(html).includes('>' + t + '<'), '条目文本在页上是那一节的段名：' + t);
  });

  it('今天总结：不给「作息库现状」＝2 小节 ⇒ 判为短页，页首不出目录', () => {
    const html = renderTodaySummaryPage(RECORDS, DAY);
    assert.equal(sectionsOf(html), 2, '这一档确实只有 2 小节（判短页的前提）');
    assertPageNav(html, '今天总结（空档）');
    assert.equal(tocItemsOf(html).length, 0, '短页不出目录（页首不留空块）');
  });

  it('周视图／查日程：恒 2 小节 ⇒ 判为短页（两条腿都不出目录）', () => {
    const week = renderWeekViewPage(RECORDS, WEEK);
    assertPageNav(week, '周视图');
    assert.equal(tocItemsOf(week).length, 0, '周视图判短页');
    const plan = renderPlanDayPage(PLAN_EVENTS, DAY);
    assertPageNav(plan, '查日程');
    assert.equal(tocItemsOf(plan).length, 0, '查日程判短页');
  });

  it('24h 概览：一天＝2 小节判短页；三天＝4 小节出目录', () => {
    const one = withDb((handle) => renderPlanOverviewPage(buildPlanOverview(handle, [DAY])));
    assertPageNav(one, '24h 概览（1 天）');
    const three = renderPlanOverviewPage({
      items: [
        { date: '2026-09-15', hours: [], plannedHours: 0, createdAt: null, updatedAt: null },
        { date: '2026-09-16', hours: [], plannedHours: 0, createdAt: null, updatedAt: null },
        { date: '2026-09-17', hours: [], plannedHours: 0, createdAt: null, updatedAt: null },
      ],
      total: 0, dates: ['2026-09-15', '2026-09-16', '2026-09-17'], view: 'aggregate', note: '',
    });
    assertPageNav(three, '查多日计划（3 天）');
    assert.deepEqual(tocItemsOf(three).map((i) => i.text),
      ['周二 2026-09-15 已排 0 格', '周三 2026-09-16 已排 0 格', '周四 2026-09-17 已排 0 格', '复制与留档'],
      '逐日那一节的目录条目＝它的段名逐字');
  });

  it('作息详情：一条记录＝3 小节（记录 ＋ 推理链 ＋ 复制区）⇒ 出目录', () => {
    const html = renderRecordDetailPage([RECORDS[1]], { date: DAY });
    assert.equal(sectionsOf(html), 3, '记录一颗段名、推理链一颗、复制区一颗');
    assertPageNav(html, '作息详情');
    const texts = tocItemsOf(html).map((i) => i.text);
    assert.deepEqual(texts, ['记录号 2', 'AI 推理链', '复制与留档'],
      '记录那一节进目录的是记录号（整串段名是一句事实句，逐字同字会被读成重复事实），后两条逐字');
    assert.ok(markupOf(html).includes('记录号 2：'), '那一条的完整段名仍印在页上');
  });

  it('写入域两张页：记作息结果（4 小节）出目录、写作息摘要回执（2 小节）判短页', () => {
    withDb((handle) => {
      const result = recordResultPage(handle, { ...RECORDS[2], analysis_reasoning: null }, new Date('2026-09-21T14:30:00'));
      assertPageNav(result, '记作息结果');
      assert.ok(tocItemsOf(result).length >= SECTION_TOC_MIN);
      const summary = summaryReceiptPage(handle, { date: DAY, category: '工作', totalMinutes: 180 });
      assertPageNav(summary, '写作息摘要回执');
      assert.equal(tocItemsOf(summary).length, 0, '写作息摘要回执判短页');
    });
  });

  it('辅助与管理：初始化回执 4 小节出目录，且每颗段名都落在目录里', () => {
    const html = renderInitReceiptPage({
      created: true,
      paths: { dbDir: 'C:/x/data', dbFile: 'C:/x/data/schedule_data.db', pagesRoot: 'C:/x/pages', helpDir: 'C:/x/help' },
      counts: { records: 4, days: 1, plans: 2, summaries: 1, firstDate: DAY, lastDate: DAY },
    });
    assertPageNav(html, '初始化回执');
    assert.deepEqual(tocItemsOf(html).map((i) => i.text), ['这一趟的读数', '三张表', '下一步', '复制初始化结果']);
  });

  it('分析与洞察：作息对比 4 小节出目录', () => {
    const html = renderComparePage({
      labelA: '这一段', startA: DAY, endA: DAY, labelB: '那一段', startB: '2026-09-14', endB: '2026-09-14',
      a: RECORDS, b: RECORDS,
    });
    assertPageNav(html, '作息对比');
    assert.ok(tocItemsOf(html).length >= SECTION_TOC_MIN);
  });

  it('日程与计划：补计划回执出目录、批量补计划回执判短页', () => {
    withDb((handle) => {
      const hit = listPlanEvents(handle, DAY)[0];
      const one = ensureReceiptPage(handle, { id: hit.id, date: DAY, created: true, remote: 'none' });
      assertPageNav(one, '补计划回执');
      assert.ok(tocItemsOf(one).length >= SECTION_TOC_MIN);
      const batch = ensureBatchReceiptPage(handle, [{ date: DAY, id: hit.id, created: true, remote: 'none', achieved: true }]);
      assertPageNav(batch, '批量补计划回执');
      assert.equal(tocItemsOf(batch).length, 0, '批量补计划回执判短页');
    });
  });

  it('商量计划预览／飞书探测：两张页都 ≥3 小节 ⇒ 都出目录', () => {
    withDb((handle) => {
      const preview = previewPage(handle, DAY, [{ date: DAY, time_start: '08:00', time_end: '09:00', title: '早读', category: '学习.阅读' }]);
      assertPageNav(preview, '商量计划预览');
      const probe = probePage(handle, DAY, { tier: 'missing', cliPath: null, version: null, openId: null, authenticated: false, calendar: false, why: '没有装命令行' });
      assertPageNav(probe, '飞书探测');
    });
  });

  it('复盘两页：一体页（day 档）与逐条复盘页都出目录，条目与段名逐条对齐', () => {
    withDb((handle) => {
      const replay = replayPage(handle, { start: DAY, end: DAY, days: 1, requested: 'day', effective: 'day' });
      assertPageNav(replay, '复盘今日');
      assert.ok(tocItemsOf(replay).length >= 10, 'day 档的段名十颗以上，目录里逐条都在');
      assert.equal(tocItemsOf(replay)[0].text, '这一段的总览');
      assert.equal(tocItemsOf(replay)[tocItemsOf(replay).length - 1].text, '复制与留档', '复制区那一段在目录末尾');
      const review = reviewPage(handle, DAY);
      assertPageNav(review, '复盘（逐条复盘）');
      assert.deepEqual(tocItemsOf(review).map((i) => i.text), ['这一天的复盘进度', '逐条复盘', '讨论区', '复制与留档']);
    });
  });

  it('反面：目录块与锚点同源——页上每一个锚点只出现一次，且都指得到页内元素', () => {
    const html = renderTodaySummaryPage(RECORDS, DAY, { status: STATUS });
    const items = tocItemsOf(html);
    const body = markupOf(html);
    for (const item of items) {
      assert.equal(count(body, new RegExp('id="' + item.id + '"', 'g')), 1, '锚点 id 在页内唯一：' + item.id);
      assert.equal(count(body, new RegExp('href="#' + item.id + '"', 'g')), 1, '目录里同一个锚点只列一次：' + item.id);
    }
    // 反例有识别力：把目录块抽掉，判据那一条立刻翻面（长页却查不到目录）。
    const withoutToc = html.replace(/<nav class="ilife-block-toc"[\s\S]*?<\/nav>/, '');
    assert.equal(tocItemsOf(withoutToc).length, 0, '抽掉目录块后条目数归 0（判据不是恒真）');
    assert.throws(() => assertPageNav(withoutToc, '抽掉目录之后'), /该出页内目录/, '长页缺目录时判据必须红');
  });
});
