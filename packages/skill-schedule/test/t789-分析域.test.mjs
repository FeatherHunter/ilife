/** #789 分析与洞察用例：**三张页的页契约**——作息对比（老侧 f03：四卡对照 ＋ 7 维差异 ＋ AI 钩子位）、
 *  类别深挖（老侧 f04：24h × N 天热力图 ＋ 分类总览 ＋ 记录明细）、异常检测（老侧 f05：
 *  红框与黄框的条目 ＋ 7 维雷达）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t789-分析域.test.mjs`。
 *
 *  数据是**临时库 ＋ 内联记录**（本包用例要在任何机器上都能跑），逐行的种子库产物与四道门由票面
 *  验收命令 `docs/skills/skill-schedule/t789-探针.mjs` 走（那不是用例）。
 *
 *  「改坏必红」：把 `handlers.ts` 三处 `html:` 换回 `''` → V1–V6 全红；把类别那一支的 `l1Of` 归一
 *  摘掉（直接拿用户原词去比）→ V3／V4 红（'健康.运动' 比不中一级）；把雷达的逐轴归一换回「七维共用一个
 *  最大值」→ V5 的轴长断言红；把异常检测的日均换回总量 → V5 红（窗口比基线短，七个维度全读成降）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addRecord, closeScheduleDb, listRecordsRange, openScheduleDb } from '../dist/fetch/db.js';
import { viewRecordCompare } from '../dist/analyze/handlers.js';
import { renderAnomalyPage, renderCategoryPage, renderComparePage } from '../dist/analyze/analyzeDocs.js';

/** 一条记录（用例只关心口径要的那几列）。 */
const rec = (date, start, end, minutes, activity, category) => ({
  id: 0, date, time_start: start, time_end: end, duration_minutes: minutes, activity, category,
  source_contents: null, source_timestamps: null, analysis_reasoning: null,
  created_at: date + ' 00:00:00', updated_at: date + ' 00:00:00', edit_count: 0,
});

/** 一段区间里逐日铺同一条记录。 */
function spread(dates, start, end, minutes, activity, category) {
  return dates.map((date) => rec(date, start, end, minutes, activity, category));
}

const datesFrom = (lo, hi) => {
  const out = [];
  const d = new Date(lo + 'T00:00:00');
  const last = new Date(hi + 'T00:00:00');
  while (d.getTime() <= last.getTime()) {
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ');
/** 页上可见文本（与分隔符门同口径：剥壳 ＋ 去标签 ＋ 解实体）。 */
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** 整页判据（本域三张页共同的那几条）。 */
function assertWholePage(html) {
  assert.ok(html.startsWith('<!doctype html>'), '须是完整文档（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须到 </html> 收尾');
  assert.ok(html.includes('<meta name="viewport"'), '须有 viewport');
  assert.ok(html.includes('ilife-page-ui'), '须挂页面级移动端配方根类');
  assert.ok(!/https?:\/\//.test(html), '不许有外部 URL');
  assert.ok(!html.includes('<link'), '不许有外部样式表');
  assert.ok(!html.includes('@import'), '不许有 @import');
}

/** 反面判据（#516 分隔符门那几种并列符号 ＋ 内部标识）：三张页一颗都不许有。 */
function assertNoDebt(html) {
  const text = textOf(html);
  for (const ch of ['·', '；', '～', '~', '、', '｜']) {
    assert.ok(!text.includes(ch), '可见文本里出现并列分隔符 ' + ch);
  }
  for (const word of ['schedule.', 'time_start', 'time_end', 'duration_minutes', 'windowDays', 'kind=']) {
    assert.ok(!text.includes(word), '可见文本里出现内部标识 ' + word);
  }
  assert.ok(!/\bt\d{3,}\b/.test(text), '可见文本里出现票号');
}

/* ─────────────────────────── ① 作息对比（老侧 f03） ─────────────────────────── */

const COMPARE_A = [
  ...spread(['2026-08-01', '2026-08-02'], '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(['2026-08-01', '2026-08-02'], '09:00', '17:00', 480, '写代码', '工作.开发'),
];
const COMPARE_B = [
  ...spread(['2026-09-01', '2026-09-02'], '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(['2026-09-01', '2026-09-02'], '09:00', '13:00', 240, '写代码', '工作.开发'),
  ...spread(['2026-09-01', '2026-09-02'], '07:00', '07:45', 45, '晨跑', '健康.运动'),
];
const compareInput = {
  labelA: '2026-08', startA: '2026-08-01', endA: '2026-08-31',
  labelB: '2026-09', startB: '2026-09-01', endB: '2026-09-30',
  a: COMPARE_A, b: COMPARE_B,
};

describe('#789 作息对比页（老侧 f03：四卡对照 ＋ 7 维差异 ＋ AI 钩子位）', () => {
  it('是整页，三块必现块齐，且七维逐行都在', () => {
    const html = renderComparePage(compareInput);
    assertWholePage(html);
    const body = markupOf(html);
    assert.ok(body.includes('四卡对照'), '四卡对照那一块的段名在页上');
    assert.ok(body.includes('7 维差异'), '7 维差异那一块的段名在页上');
    assert.ok(body.includes('AI 思考钩子'), 'AI 钩子位在页上');
    assert.equal((body.match(/ilife-block-kpi-card"/g) ?? []).length, 4, '四卡就是四张');
    assert.equal((body.match(/sch-an-diff-item/g) ?? []).length, 7, '七维逐维一行');
    assert.equal((body.match(/sch-an-diff-fill-a/g) ?? []).length, 7, '每一维都有 A 段柱');
    assert.equal((body.match(/sch-an-diff-fill-b/g) ?? []).length, 7, '每一维都有 B 段柱');
    assertNoDebt(html);
  });

  it('四卡与七维都是这一段里算出来的真读数（日均那一栏按有记录的天数摊平）', () => {
    const text = textOf(renderComparePage(compareInput));
    // A 段 2 天：维持 960 分钟 ＋ 工作 960 分钟；B 段 2 天：维持 960 ＋ 工作 480 ＋ 健康 90。
    assert.ok(text.includes('总时长差 -6h30m'), '总时长差＝B 减 A 的净变化');
    assert.ok(text.includes('日均差 -3h15m'), '日均差＝按有记录的天数摊平');
    assert.ok(text.includes('共 31 天，其中 2 天有记录'), 'A 段：日历天数与有记录的天数分开写');
    assert.ok(text.includes('共 30 天，其中 2 天有记录'), 'B 段同上');
    assert.ok(text.includes('11h46m') === false, '不许把日历天数当摊平的分母（31 天里只记了 2 天）');
    assert.ok(text.includes('🌱 维持 0分钟，0%'), '维持那一维两段一样（日均 480 对 480）');
    assert.ok(text.includes('💼 工作 -4h，-50%'), '工作那一维日均 480 降到 240');
    assert.ok(text.includes('💪 健康 +45m，+100%'), '健康那一维从没有到有');
  });

  it('AI 钩子位点的是这一趟里真的动了的那一维', () => {
    const text = textOf(renderComparePage(compareInput));
    assert.ok(text.includes('「工作」这一维的日均差了 -4小时'), '大变化那一维要被点名：' + text.slice(-260));
  });

  it('载荷那一句（机器读的那份）一字不改', () => {
    const dir = mkdtempSync(join(tmpdir(), 't789-compare-'));
    const handle = openScheduleDb(join(dir, 'schedule_data.db'));
    try {
      for (const r of [...COMPARE_A, ...COMPARE_B]) {
        addRecord(handle, {
          date: r.date, time_start: r.time_start, time_end: r.time_end,
          duration_minutes: r.duration_minutes, activity: r.activity, category: r.category,
        });
      }
      const out = viewRecordCompare({ kind: 'months', monthA: '2026-08', monthB: '2026-09' }, handle);
      assert.ok(out.data.summary.startsWith('2026-08 vs 2026-09：块数 4→6，时长 '), '载荷仍是那一句：' + out.data.summary.split('\n')[0]);
      assertWholePage(out.html);
      assert.ok(textOf(out.html).includes('四卡对照'), '出口交回的是整页，不是空串');
    } finally {
      closeScheduleDb(handle);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* ─────────────────────────── ② 类别深挖（老侧 f04） ─────────────────────────── */

const CATEGORY_RECORDS = [
  rec('2026-09-01', '07:00', '07:45', 45, '晨跑', '健康.运动'),
  rec('2026-09-02', '07:00', '07:45', 45, '晨跑', '健康.运动'),
  rec('2026-09-02', '19:40', '20:30', 50, '八段锦', '健康.八段锦'),
  rec('2026-09-02', '09:00', '17:00', 480, '写代码', '工作.开发'),
];

describe('#789 类别深挖页（老侧 f04：24h × N 天热力图 ＋ 分类总览 ＋ 记录明细）', () => {
  it('区间那一档：热力图按日历天数铺满行，分类总览给二级分布，明细逐条在', () => {
    const html = renderCategoryPage({
      requested: '健康.运动', level1: '健康', start: '2026-09-01', end: '2026-09-03', records: CATEGORY_RECORDS,
    });
    assertWholePage(html);
    const body = markupOf(html);
    const text = textOf(html);
    assert.ok(body.includes('24h × 3 天热力图'), '热力图段名带天数');
    assert.equal((body.match(/class="heat-day"/g) ?? []).length, 3, '一天一行（没有记录的天也占行）');
    assert.equal((body.match(/class="heat-cell"/g) ?? []).length, 3 * 24, '一行 24 格');
    assert.ok(body.includes('分类总览'), '分类总览在页上');
    assert.ok(body.includes('记录明细'), '记录明细在页上');
    assert.equal((body.match(/class="ilife-block-dist-row"/g) ?? []).length, 2, '二级分类两条：运动与八段锦');
    assert.ok(text.includes('运动 1小时30分钟，占 64.3%'), '二级分布是真读数：' + text.slice(0, 200));
    assert.ok(text.includes('八段锦 50分钟，占 35.7%'), '同上');
    assert.ok(text.includes('「健康.运动」按一级分类归到「健康」'), '用户说的二级词要写明归一这一件事');
    assert.ok(!text.includes('工作.开发'), '别的分类不许混进这一页');
    assert.ok(!text.includes('工作 8小时'), '别的分类的读数也不许混进来');
    assertNoDebt(html);
  });

  it('单日那一档：一行热力图也是这张页（形状不随数据变）', () => {
    const html = renderCategoryPage({
      requested: '健康', level1: '健康', start: '2026-09-02', end: '2026-09-02', records: CATEGORY_RECORDS,
    });
    const body = markupOf(html);
    const text = textOf(html);
    assert.ok(body.includes('24h × 1 天热力图'), '单日那一档的段名');
    assert.equal((body.match(/class="heat-day"/g) ?? []).length, 1, '一行');
    assert.ok(text.includes('1 天里有记录'), '单日的活跃天数');
    // 区间外那一天（09-01）的记录一条都不许上台面：页面自己按区间再筛一道（不只靠调用方给对）。
    assert.ok(!text.includes('2026-09-01'), '区间外的记录不上台面');
    assert.ok(text.includes('共同 1小时35分钟') === false && text.includes('共 1小时35分钟'), '单日就是这一天那两条：' + text.slice(0, 160));
    assertNoDebt(html);
  });

  it('出口那一支：二级词先按一级归一，页与载荷读同一批记录', () => {
    const dir = mkdtempSync(join(tmpdir(), 't789-category-'));
    const handle = openScheduleDb(join(dir, 'schedule_data.db'));
    try {
      for (const r of CATEGORY_RECORDS) {
        addRecord(handle, {
          date: r.date, time_start: r.time_start, time_end: r.time_end,
          duration_minutes: r.duration_minutes, activity: r.activity, category: r.category,
        });
      }
      const out = viewRecordCompare({ kind: 'category', category: '健康.运动', start: '2026-09-01', end: '2026-09-03' }, handle);
      // 载荷那一句里的块数就是归一之后命中的那几条（3 块：两段跑步 ＋ 一段八段锦）。
      assert.ok(out.data.summary.startsWith('2026-09-01~2026-09-03 类别深挖 健康：3 块'), '载荷：' + out.data.summary.split('\n')[0]);
      assert.ok(textOf(out.html).includes('深挖类别 健康'), '页上也是归一后的一级分类');
    } finally {
      closeScheduleDb(handle);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('区间无记录即阻断（不返空页）', () => {
    const dir = mkdtempSync(join(tmpdir(), 't789-empty-'));
    const handle = openScheduleDb(join(dir, 'schedule_data.db'));
    try {
      assert.throws(
        () => viewRecordCompare({ kind: 'category', category: '健康', start: '2026-01-01', end: '2026-01-03' }, handle),
        /区间无记录/,
      );
    } finally {
      closeScheduleDb(handle);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* ─────────────────────────── ③ 异常检测（老侧 f05） ─────────────────────────── */

const BASE_DAYS = datesFrom('2026-08-23', '2026-09-21');
const WINDOW_DAYS = datesFrom('2026-09-15', '2026-09-21');
const ANOMALY_BASELINE = [
  ...spread(BASE_DAYS, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(BASE_DAYS, '09:00', '17:00', 480, '写代码', '工作.开发'),
  ...spread(BASE_DAYS, '07:00', '07:45', 45, '晨跑', '健康.运动'),
];
const ANOMALY_WINDOW = [
  ...spread(WINDOW_DAYS, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(WINDOW_DAYS, '09:00', '13:00', 240, '写代码', '工作.开发'),
  ...spread(WINDOW_DAYS, '07:00', '08:30', 90, '晨跑', '健康.运动'),
];
const anomalyInput = {
  end: '2026-09-21', windowDays: 7, records: ANOMALY_WINDOW, baseline: ANOMALY_BASELINE,
  baselineStart: '2026-08-23',
};

describe('#789 异常检测页（老侧 f05：红框与黄框的条目 ＋ 7 维雷达）', () => {
  it('两段按日均比：降五成的进红框，涨一倍的进红框，雷达在', () => {
    const html = renderAnomalyPage(anomalyInput);
    assertWholePage(html);
    const body = markupOf(html);
    const text = textOf(html);
    assert.ok(body.includes('异常详情'), '异常那一段的段名在页上');
    assert.ok(body.includes('7 维雷达'), '雷达那一段的段名在页上');
    assert.equal((body.match(/sch-an-frame /g) ?? []).length, 2, '两条过线的维度各一条框');
    assert.equal((body.match(/sch-an-frame-red/g) ?? []).length, 2, '两条都是红框（偏离过两成）');
    assert.ok(text.includes('工作降 50%'), '工作那一维：480 降到 240：' + text.slice(0, 260));
    assert.ok(text.includes('健康涨 100%'), '健康那一维：45 涨到 90');
    assert.ok(text.includes('这一段日均 4小时，基线日均 8小时'), '框里给两段的日均');
    assert.ok(text.includes('检出异常 2 项'), '卡片给检出数');
    assert.ok(!text.includes('错误'), '没有多余的东西');
  });

  it('雷达的两个面都在，且按逐轴归一铺开（不是七维共用一个最大值）', () => {
    const body = markupOf(renderAnomalyPage(anomalyInput));
    assert.equal((body.match(/sch-an-radar-face-current/g) ?? []).length, 1, '当前段一个面');
    assert.equal((body.match(/sch-an-radar-face-baseline/g) ?? []).length, 1, '基线段一个面');
    assert.equal((body.match(/sch-an-radar-label/g) ?? []).length, 7, '七个轴名');
    assert.equal((body.match(/sch-an-radar-ring/g) ?? []).length, 4, '四圈网格');
    // 逐轴归一的判据：工作那一维「基线 480 对当前 240」＝ 半径比 1 比 0.5；
    // 若七维共用一个最大值（480），健康那一维（90 对 45）会被压成 0.19/0.09 那样的一条细线。
    const faces = [...body.matchAll(/class="sch-an-radar-face-(current|baseline)" points="([^"]+)"/g)]
      .map((m) => [m[1], m[2].trim().split(/\s+/).map((p) => p.split(',').map(Number))]);
    const ring = 118;
    const cx = 200;
    const cy = 205;
    const radiusOf = (point) => Math.hypot(point[0] - cx, point[1] - cy) / ring;
    const workAt = 2;
    const keepAt = 0;
    const cur = faces.find(([k]) => k === 'current')[1];
    const base = faces.find(([k]) => k === 'baseline')[1];
    assert.ok(Math.abs(radiusOf(base[workAt]) - 1) < 0.02, '工作那一维基线段铺满（480 是它自己的最大值）');
    assert.ok(Math.abs(radiusOf(cur[workAt]) - 0.5) < 0.02, '工作那一维当前段＝一半');
    assert.ok(Math.abs(radiusOf(base[keepAt]) - 1) < 0.02 && Math.abs(radiusOf(cur[keepAt]) - 1) < 0.02,
      '维持那一维两段一样，都铺满（共用最大值时它也会满，故这条与上面两条一起读）');
  });

  it('窗口与基线取同一段日子＝读不出偏离，页上把这件事说明白（不是空壳）', () => {
    const html = renderAnomalyPage({
      end: '2026-09-21', windowDays: 30, records: ANOMALY_BASELINE, baseline: ANOMALY_BASELINE,
      baselineStart: '2026-08-23',
    });
    const body = markupOf(html);
    const text = textOf(html);
    assert.ok(text.includes('检出异常 0 项'), '零异常的读数');
    assert.ok(text.includes('窗口与基线取的是同一段日子'), '空态要把原因说明白：' + text.slice(-300));
    assert.ok(!body.includes('sch-an-frame '), '零异常时不出框');
    assert.ok(body.includes('sch-an-radar-face-current'), '雷达照出（形状不随数据变）');
    assertNoDebt(html);
  });

  it('基线里没有的维度不报（口径层那条：基线为零不判）', () => {
    const window7 = [
      ...spread(WINDOW_DAYS, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
      ...spread(WINDOW_DAYS, '20:00', '21:00', 60, '学英语', '学习.语言'),
    ];
    const text = textOf(renderAnomalyPage({
      end: '2026-09-21', windowDays: 7, records: window7,
      baseline: spread(datesFrom('2026-08-23', '2026-09-21'), '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
      baselineStart: '2026-08-23',
    }));
    assert.ok(text.includes('检出异常 0 项'), '基线里没有的维度不算异常：' + text.slice(0, 260));
  });

  it('三张页的可见文本里都没有并列分隔符与内部标识', () => {
    for (const html of [
      renderComparePage(compareInput),
      renderCategoryPage({ requested: '健康', level1: '健康', start: '2026-09-01', end: '2026-09-03', records: CATEGORY_RECORDS }),
      renderAnomalyPage(anomalyInput),
    ]) assertNoDebt(html);
  });
});
