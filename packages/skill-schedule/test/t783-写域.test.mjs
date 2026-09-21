/** #783 写入与同步域用例：四张结果页的**页契约**——整页、必现块齐、零外部引用、空数据不塌。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t783-写域.test.mjs`。
 *
 *  数据是**临时库**（`node:sqlite` 开在系统临时目录，用完即删）：本包用例要在任何机器上都能跑；
 *  种子库那条链由票面验收命令 `docs/skills/skill-schedule/t783-探针.mjs` 走（那不是用例）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openScheduleDb, closeScheduleDb, addRecord, getRecordById } from '../dist/fetch/db.js';
import { writeRecord } from '../dist/write/handlers.js';
import {
  amendReceiptPage, batchReceiptPage, recordResultPage, summaryReceiptPage,
} from '../dist/write/writeDocs.js';

const DAY = '2026-09-21';

/** 临时库 ＋ 一天的几条记录（含来源与推理，回溯卡那两段才有内容）。 */
function withDb(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't783-test-'));
  const handle = openScheduleDb(join(dir, 'schedule_data.db'));
  try {
    addRecord(handle, {
      date: DAY, time_start: '00:00', time_end: '06:30', duration_minutes: 390,
      activity: '睡眠', category: '维持.睡眠', source_contents: '昨天 23:30 说去睡了',
      analysis_reasoning: '按原话归到睡眠',
    });
    addRecord(handle, {
      date: DAY, time_start: '09:00', time_end: '12:00', duration_minutes: 180,
      activity: '写代码', category: '工作.开发', source_contents: '09:05 说开始写代码',
      analysis_reasoning: '活动关键词命中开发',
    });
    addRecord(handle, {
      date: DAY, time_start: '13:00', time_end: '13:30', duration_minutes: 30,
      activity: '午睡', category: '调整.午睡',
    });
    return fn(handle);
  } finally {
    closeScheduleDb(handle);
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const count = (body, re) => (body.match(re) ?? []).length;
const NOW = new Date('2026-09-21T14:30:00');

/** 四张页共同的那几条（整页 ＋ 零外部引用）。 */
function assertWholePage(html) {
  assert.ok(html.startsWith('<!doctype html>'), '须是完整文档（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须到 </html> 收尾');
  assert.ok(html.includes('<meta name="viewport"'), '须有 viewport');
  assert.ok(html.includes('ilife-page-ui'), '须挂页面级移动端配方根类');
  assert.ok(html.includes('ilife-charts'), '须带图表助手资产');
  assert.ok(!/https?:\/\//.test(html), '不许有外部 URL');
  assert.ok(!html.includes('<link'), '不许有外部样式表');
  assert.ok(!html.includes('@import'), '不许有 @import');
}

describe('#783 写入与同步域四张结果页', () => {
  it('记作息结果：是整页，老侧 f07 四个必现块都在（这一条记的是二级分类，警示条该缺席）', () => {
    withDb((handle) => {
      const r = addRecord(handle, {
        date: DAY, time_start: '14:00', time_end: '15:00', duration_minutes: 60,
        activity: '写 AI 调优代码', category: '工作.AI调优',
      });
      const html = recordResultPage(handle, r, NOW);
      assertWholePage(html);
      const body = markupOf(html);
      assert.ok(body.includes('当前状态总览'), '必现块：状态总览');
      assert.ok(body.includes('ilife-block-kpi-card-grid'), '状态总览＝读数卡');
      assert.ok(body.includes('全天作息时间轴'), '必现块：全天时间轴');
      assert.ok(body.includes('ilife-block-chart-block'), '全天时间轴＝24 小时色带');
      assert.ok(body.includes('过去几小时推断回溯'), '必现块：过去几小时推断高亮');
      assert.ok(body.includes('sch-wr-past'), '推断高亮＝回溯卡列');
      assert.ok(!body.includes('ilife-block-feedback-block'), '二级分类齐了，警示条位不该出东西');
      assert.ok(body.includes('刚记录'), '窗口里那一条要点出来');
      assert.ok(body.includes('写 AI 调优代码'), '这一条的活动在页上');
    });
  });

  it('记作息结果：只记一级分类时页顶出警示条，二级候选摆成徽章列', () => {
    withDb((handle) => {
      const r = addRecord(handle, {
        date: DAY, time_start: '14:00', time_end: '15:00', duration_minutes: 60,
        activity: '创作类作息', category: '创作',
      });
      const body = markupOf(recordResultPage(handle, r, NOW));
      assert.ok(body.includes('ilife-block-feedback-block'), '必现块：警示条位');
      assert.ok(body.includes('只记到一级分类'), '警示条要说清差在哪');
      assert.ok(body.includes('sch-wr-band'), '候选二级摆成徽章列（不是一句顿号串）');
      assert.ok(count(body, /class="ilife-block-chip"/g) >= 4, '创作那一支的二级候选在页上');
    });
  });

  it('记作息结果：回溯窗口是「这一条结束前 3 小时」，窗口里每一段都成一张卡', () => {
    withDb((handle) => {
      const r = addRecord(handle, {
        date: DAY, time_start: '14:00', time_end: '15:00', duration_minutes: 60,
        activity: '写 AI 调优代码', category: '工作.AI调优',
      });
      const body = markupOf(recordResultPage(handle, r, NOW));
      // 窗口 12:00 至 15:00：13:00 至 13:30 与 14:00 至 15:00 两段在窗内；09:00 至 12:00 落在窗口上界之外。
      assert.equal(count(body, /class="sch-wr-card(?: sch-wr-card-new)?"/g), 2, '窗口内几段就几张卡');
      assert.ok(body.includes('12:00 至 15:00'), '回溯窗口那一格摆的是窗口本身');
      assert.ok(body.includes('刚记录'), '刚写入那张有标记');
      assert.equal(count(body, /sch-wr-card-new/g), 1, '刚记录只标一张');
    });
  });

  it('修正作息回执：蓝调 diff 逐字段前后对照，改一处就一行', () => {
    withDb((handle) => {
      const before = getRecordById(handle, 2);
      const after = { ...before, category: '创作.编程', activity: '写 AI 调优代码' };
      const html = amendReceiptPage(before, after, ['category', 'activity'], NOW);
      assertWholePage(html);
      const body = markupOf(html);
      assert.ok(body.includes('sch-wr-diff'), '必现块：蓝调 diff');
      assert.equal(count(body, /ilife-block-change-row"/g) >= 1, true, '有对照行');
      assert.ok(body.includes('工作.开发') && body.includes('创作.编程'), '改前改后两个值都在页上');
      assert.ok(body.includes('分类') && body.includes('活动'), '对照行的标签用中文名');
      assert.ok(body.includes('修改次数'), '读数卡里报这次是第几次');
      assert.ok(!body.includes('category') && !body.includes('source_contents'), '库列名不上屏');
    });
  });

  it('修正作息回执：改的是一条更早的记录时，页顶多一条提示', () => {
    withDb((handle) => {
      const before = { ...getRecordById(handle, 2), date: '2026-09-01' };
      const body = markupOf(amendReceiptPage(before, { ...before, activity: '写代码' }, ['activity'], NOW));
      assert.ok(body.includes('ilife-block-feedback-block'), '旧记录提示位');
      assert.ok(body.includes('不是今天的'), '提示要说清哪一天');
      const fresh = markupOf(amendReceiptPage({ ...before, date: DAY }, { ...before, date: DAY, activity: '写代码' }, ['activity'], NOW));
      assert.ok(!fresh.includes('ilife-block-feedback-block'), '当天的记录不该出这条提示');
    });
  });

  it('批量导入回执：全成与部分成两种说法，逐条结果都摆得出来', () => {
    const allOk = markupOf(batchReceiptPage({
      date: DAY,
      rows: [
        { seq: 1, time: '07:00 至 08:00', activity: '晨跑', category: '健康.运动', result: '已写入', ok: true },
        { seq: 2, time: '08:00 至 08:30', activity: '早餐', category: '维持.用餐', result: '已写入', ok: true },
      ],
    }));
    assertWholePage(batchReceiptPage({
      date: DAY,
      rows: [{ seq: 1, time: '07:00 至 08:00', activity: '晨跑', category: '健康.运动', result: '已写入', ok: true }],
    }));
    assert.ok(allOk.includes('全都写进库了'), '全成那句');
    assert.ok(!allOk.includes('ilife-block-feedback-block'), '全成不出警示条');
    const partial = markupOf(batchReceiptPage({
      date: DAY,
      rows: [
        { seq: 1, time: '07:00 至 08:00', activity: '晨跑', category: '健康.运动', result: '已写入', ok: true },
        { seq: 2, time: '09:00 至 09:30', activity: '写法', category: '—', result: '分类不在白名单', ok: false },
      ],
    }));
    assert.ok(partial.includes('ilife-block-feedback-block'), '部分成要出警示条');
    assert.ok(partial.includes('分类不在白名单'), '页上给中文短因');
    assert.ok(partial.includes('ilife-block-data-table'), '逐条结果表');
  });

  it('写作息摘要回执：写库回执也落一份真页（老侧这条无产物）', () => {
    withDb((handle) => {
      const html = summaryReceiptPage(handle, { date: DAY, category: '工作', totalMinutes: 470 });
      assertWholePage(html);
      const body = markupOf(html);
      assert.ok(body.includes('这次写了什么'), '有段落名');
      assert.ok(body.includes('工作'), '写的是哪一支');
      assert.ok(body.includes('7小时50分钟'), '写的值在页上');
      assert.ok(body.includes('当天这支记录合计'), '这支当天的现状');
    });
  });
});

describe('#783 写命令的四支（处理函数口径）', () => {
  it('add：载荷仍是收据形，页是整页，回执给的是这条的 id', () => {
    withDb((handle) => {
      const out = writeRecord({
        op: 'add', date: DAY, time_start: '14:00', time_end: '15:00',
        activity: '写 AI 调优代码', category: '工作.AI调优',
      }, handle);
      assert.equal(out.data.ok, true);
      assert.match(out.data.message, /^已记一条：\d+/);
      assertWholePage(out.html);
    });
  });

  it('amend：页上的改前值取自写库之前那一版', () => {
    withDb((handle) => {
      const out = writeRecord({ op: 'amend', id: 2, activity: '写 AI 调优代码' }, handle);
      assert.equal(out.data.ok, true);
      const body = markupOf(out.html);
      assert.ok(body.includes('写代码'), '改前那一格是原值');
      assert.ok(body.includes('写 AI 调优代码'), '改后那一格是新值');
      assert.ok(body.includes('第 1 次'), 'edit_count 由库里加过');
    });
  });

  it('batch：逐条走 add 校验，单条不过不打断其余；部分成时退出码非 0', () => {
    withDb((handle) => {
      const out = writeRecord({
        records: [
          { date: DAY, time_start: '07:00', time_end: '08:00', activity: '晨跑', category: '健康.运动' },
          { date: DAY, time_start: '08:00', time_end: '08:30', activity: '乱写', category: '不存在的类别' },
          { date: DAY, time_start: '08:30', time_end: '09:00', activity: '读书', category: '学习.读书' },
        ],
      }, handle);
      assert.equal(out.data.total, 3);
      assert.equal(out.data.success, 2);
      assert.equal(out.data.failed, 1);
      assert.equal(out.data.ok, false, '有没通过的就整体不 ok');
      assert.equal(out.exitCode, 1, '合成写没达成 → 退出码非 0');
      assertWholePage(out.html);
      const body = markupOf(out.html);
      assert.ok(body.includes('分类不在白名单'), '页上给中文短因');
      assert.equal(count(body, /<tr>/g), 4, '逐条结果表：3 条 ＋ 表头');
    });
  });

  it('batch：全成时退出码为 0，且不出警示条', () => {
    withDb((handle) => {
      const out = writeRecord({
        records: [{ date: DAY, time_start: '07:00', time_end: '08:00', activity: '晨跑', category: '健康.运动' }],
      }, handle);
      assert.equal(out.data.ok, true);
      assert.equal(out.exitCode, undefined, '全成不设退出码（出口按 0 走）');
      assertWholePage(out.html);
    });
  });

  it('batch：空数组按阻断处理，不给伪页面', () => {
    withDb((handle) => {
      const out = writeRecord({ records: [] }, handle);
      assert.equal(out.data.ok, false);
      assert.equal(out.html, '', '没有产物就是空串，不造静态页');
    });
  });
});
