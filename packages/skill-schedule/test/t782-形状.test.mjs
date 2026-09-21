/** #782 形状用例：三张成品页的**页契约**——整页、必现块齐、零外部引用、空数据不塌。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t782-形状.test.mjs`。
 *
 *  数据是**内联夹具**（不碰种子库）：本包用例要在任何机器上都能跑；种子库那条链由
 *  `docs/skills/skill-schedule/t782-样板.mjs` 走（那是票面验收命令，不是用例）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTodaySummaryPage, renderWeekViewPage } from '../dist/query/queryDocs.js';
import { renderPlanDayPage } from '../dist/plan/planDocs.js';

const BASE = {
  source_contents: null, source_timestamps: null, analysis_reasoning: null,
  created_at: '2026-09-21 08:00:00', updated_at: '2026-09-21 08:00:00', edit_count: 0,
};
const rec = (id, date, start, end, minutes, activity, category) => ({
  ...BASE, id, date, time_start: start, time_end: end, duration_minutes: minutes, activity, category,
});
const ev = (id, date, start, end, title, category, completion = null, feishu = null) => ({
  ...BASE, id, date, time_start: start, time_end: end, title, notes: null, category,
  feishu_event_id: feishu, last_synced_at: null, is_active: 1, completion, completion_note: null,
});

const DAY = '2026-09-21';
const WEEK = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'];
const DAY_RECORDS = [
  rec(1, DAY, '00:00', '06:30', 390, '睡眠', '维持.睡眠'),
  rec(2, DAY, '06:30', '07:30', 60, '早餐', '维持.用餐'),
  rec(3, DAY, '09:00', '12:00', 180, '写代码', '工作.开发'),
  rec(4, DAY, '13:00', '13:30', 30, '午睡', '调整.午睡'),
  rec(5, DAY, '23:00', '23:59', 59, '睡眠', '维持.睡眠'),
];
const DAY_EVENTS = [
  ev(1, DAY, '09:00', '11:30', '深度开发', '工作.开发', '已完成', 'fs_1'),
  ev(2, DAY, '14:00', '16:00', '需求评审', '工作.会议'),
];

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查（本用例首轮就这么漏过一次）。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const count = (body, re) => (body.match(re) ?? []).length;

/** 整页判据（三张页共同的那几条）。 */
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

describe('#782 页型配方（人裁：今天总结 B／查日程 A／周视图 A）', () => {
  it('今天总结：是整页，老侧 f01 四个必现块都在', () => {
    const html = renderTodaySummaryPage(DAY_RECORDS, DAY);
    assertWholePage(html);
    const body = markupOf(html);
    assert.ok(body.includes('ilife-block-conclusion'), '结论条');
    assert.ok(body.includes('ilife-block-chart-block'), '24 小时色带（图表块）');
    assert.ok(body.includes('ilife-block-fact-strip'), '一行事实条（4 卡摘要）／睡眠统计');
    assert.ok(body.includes('ilife-block-timeline'), '竖向时间轴');
    assert.ok(body.includes('ilife-block-disclosure'), '分类进度（折叠）');
    assert.ok(body.includes('ilife-block-dist-row'), '分类分布行');
    assert.ok(body.includes('夜间睡眠'), '睡眠统计那一行在页上');
  });

  it('今天总结：时间轴逐条＝记录条数，空数据不塌', () => {
    const body = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY));
    assert.equal(count(body, /ilife-block-timeline-row"/g), DAY_RECORDS.length);
    const empty = renderTodaySummaryPage([], DAY);
    assertWholePage(empty);
    assert.ok(empty.includes('0 块记录'), '空数据也出页，不静默空转');
  });

  it('查日程：是整页，老侧 f10 三个必现块都在', () => {
    const html = renderPlanDayPage(DAY_EVENTS, DAY);
    assertWholePage(html);
    const body = markupOf(html);
    assert.ok(body.includes('ilife-block-kpi-card-grid'), '读数卡');
    assert.ok(body.includes('ilife-block-chart-block'), '24 小时覆盖条');
    assert.ok(body.includes('ilife-block-list-rows'), '事件卡列表');
    assert.ok(body.includes('ilife-block-param-form'), '筛选位');
    assert.equal(count(body, /ilife-block-list-rows-row"/g), DAY_EVENTS.length + 3, '两张列表：2 件事件 ＋ 3 段空档');
    assert.ok(body.includes('空档'), '空档那一段在页上');
  });

  it('分类分布行按分类上色（#782 首版七条全蓝，这条判据就是为它补的）', () => {
    const body = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY));
    const fills = [...body.matchAll(/<span class="ilife-block-dist-row-fill" style="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(fills.length >= 2, '这一天有 ≥2 个分类，分布行就该 ≥2 条（实得 ' + fills.length + '）');
    for (const style of fills) assert.ok(/background:/.test(style), '每条分布行都得带填充色：' + style);
    const colors = new Set(fills.map((s) => (s.match(/background:\s*([^;"]+)/) ?? [])[1]));
    assert.ok(colors.size >= 2, '不同分类不许同色（实得 ' + colors.size + ' 种）');
  });

  it('周视图：是整页，7×24 矩阵＝7 行 × 24 格', () => {
    const records = [
      rec(1, WEEK[0], '00:00', '06:00', 360, '睡眠', '维持.睡眠'),
      rec(2, WEEK[3], '09:00', '12:00', 180, '写代码', '工作.开发'),
    ];
    const html = renderWeekViewPage(records, WEEK);
    assertWholePage(html);
    const body = markupOf(html);
    assert.ok(body.includes('ilife-block-kpi-card-grid'), '读数卡（含健康分）');
    assert.ok(body.includes('7×24 全分类热力图'), '矩阵那一段有名字');
    assert.equal(count(body, /class="heat-row(?: heat-row-total)?"/g), WEEK.length + 1, '7 行数据 ＋ 1 行刻度');
    assert.equal(count(body, /class="heat-cell"/g), WEEK.length * 24, '7 × 24 ＝ 168 格');
    assert.ok(body.includes('heat-legend'), '图例跟着矩阵走');
    assert.ok(body.includes('ilife-block-dist-row'), '分类总览');
    assert.ok(body.includes('ilife-block-list-rows'), '每日汇总');
  });

  it('周视图：无记录的那一周仍是七行（形状不随数据变）', () => {
    const html = renderWeekViewPage([], WEEK);
    assertWholePage(html);
    const body = markupOf(html);
    assert.equal(count(body, /class="heat-cell"/g), 168);
    assert.ok(body.includes('无记录'), '空白天出人话，不出空格子');
  });
});
