/** #784 查询与浏览·单日族用例：**「今天总结」那一张页的页契约**——整页、老侧 f01 四个必现块齐、
 *  这一天的 24h 时间轴、作息库现状上屏、空数据不塌、过去某一天不误报「还没过完」。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t784-单日族.test.mjs`。
 *
 *  数据是**临时库 ＋ 内联记录**：本包用例要在任何机器上都能跑；种子库那条链由票面验收命令
 *  `docs/skills/skill-schedule/t784-探针.mjs` 走（那不是用例）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openScheduleDb, closeScheduleDb, addRecord } from '../dist/fetch/db.js';
import { viewRecordToday } from '../dist/query/handlers.js';
import { renderTodaySummaryPage, statusBlockOf } from '../dist/query/queryDocs.js';

const DAY = '2026-09-21';
const BASE = {
  source_contents: null, source_timestamps: null, analysis_reasoning: null,
  created_at: '2026-09-21 08:00:00', updated_at: '2026-09-21 08:00:00', edit_count: 0,
};
const rec = (id, date, start, end, minutes, activity, category) => ({
  ...BASE, id, date, time_start: start, time_end: end, duration_minutes: minutes, activity, category,
});
/** 一天：睡 6.5h ＋ 早餐 ＋ 工作 3h ＋ 午睡 ＋ 睡前那一块（老侧 f01「4 卡摘要」的四格都有料）。 */
const DAY_RECORDS = [
  rec(1, DAY, '00:00', '06:30', 390, '睡眠', '维持.睡眠'),
  rec(2, DAY, '06:30', '07:30', 60, '早餐', '维持.用餐'),
  rec(3, DAY, '09:00', '12:00', 180, '写代码', '工作.开发'),
  rec(4, DAY, '13:00', '13:30', 30, '午睡', '调整.午睡'),
  rec(5, DAY, '23:00', '23:59', 59, '睡前阅读', '学习.读书'),
];

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const count = (body, re) => (body.match(re) ?? []).length;

/** 整页判据（本域两张页共同的那几条）。 */
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

/** 临时库 ＋ 一天的记录（作息库现状那一块要有真读数）。 */
function withDb(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't784-test-'));
  const handle = openScheduleDb(join(dir, 'schedule_data.db'));
  try {
    for (const r of DAY_RECORDS) {
      addRecord(handle, {
        date: r.date, time_start: r.time_start, time_end: r.time_end,
        duration_minutes: r.duration_minutes, activity: r.activity, category: r.category,
      });
    }
    return fn(handle);
  } finally {
    closeScheduleDb(handle);
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('#784 单日族「今天总结」页（老侧 f01 四个必现块 ＋ 24h 时间轴 ＋ 作息库现状）', () => {
  it('是整页，f01 四个必现块一块不少', () => {
    const html = renderTodaySummaryPage(DAY_RECORDS, DAY);
    assertWholePage(html);
    const body = markupOf(html);
    // ① 4 卡摘要 → 一行事实条；② 分类进度 → 折叠区里的分布行；
    // ③ 24h 时间轴 → 色带 ＋ 逐条时间轴（行列表三槽）；④ 睡眠统计 → 它自己那一行。
    assert.ok(body.includes('ilife-block-conclusion'), '结论条');
    assert.ok(body.includes('ilife-block-fact-strip'), '一行事实条（4 卡摘要）／睡眠统计');
    assert.ok(body.includes('ilife-block-chart-block'), '24 小时色带（图表块）');
    assert.ok(body.includes('ilife-block-list-rows'), '逐条时间轴');
    assert.ok(body.includes('ilife-block-disclosure'), '分类进度（折叠）');
    assert.ok(body.includes('ilife-block-dist-row'), '分类分布行');
    assert.ok(body.includes('分类进度'), '那一块的段落名在页上');
    assert.ok(body.includes('夜间睡眠') && body.includes('午睡'), '睡眠统计那一行在页上');
  });

  it('4 卡摘要四格都是这一天的真读数，不是空壳', () => {
    const body = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY));
    const facts = [...body.matchAll(/<span class="ilife-block-fact-strip-label">([^<]*)<\/span><span class="ilife-block-fact-strip-value[^"]*">([^<]*)<\/span>/g)]
      .map((m) => [m[1], m[2]]);
    const map = new Map(facts);
    assert.equal(map.get('记录块数'), '5 块', '块数');
    // 时长口径走 `policy` 的 `fmtDurShort`（老侧双版本格式里的短版）：11h59m。
    assert.equal(map.get('覆盖时长'), '11h59m', '覆盖（时长口径由 policy 给）');
    assert.ok(/^\d+$/.test(map.get('健康分')), '健康分是数：' + map.get('健康分'));
    assert.equal(map.get('睡眠＋午睡'), '7h', '睡眠＋午睡合计');
  });

  it('时间轴逐条＝记录条数；每行是「起止 至 做了什么 时长」三槽，不留并列分隔符', () => {
    const html = renderTodaySummaryPage(DAY_RECORDS, DAY);
    const body = markupOf(html);
    assert.equal(count(body, /ilife-block-list-rows-row"/g), DAY_RECORDS.length, '逐条时间轴');
    assert.ok(body.includes('24 小时时间轴'), '色带那一段有名字');
    // 起止写「至」（`~` 是分隔符门点名的那几种之一）；时长在右槽，不与分类挤成一串。
    assert.ok(body.includes('00:00 至 06:30'), '起止那一槽：写「至」不写波浪号');
    assert.ok(body.includes('6小时30分钟'), '时长那一槽');
    // 判据只量**这一行的三槽**：复制区的数据文本是给人复制的检索串，那里允许用并列符号。
    const rows = [...body.matchAll(/<div class="ilife-block-list-rows-row">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    assert.ok(rows.length > 0, '时间轴行读得到');
    for (const row of rows) {
      for (const sep of ['·', '；', '｜', '~']) assert.ok(!row.includes(sep), '时间轴那一行不许出现并列分隔符「' + sep + '」：' + row);
    }
    // 判据只量**可见文本**：复制区那几份载荷住在 `data-t` 属性里（机器读的那一份，起止怎么写是载荷
    // 自己的字段口径），不是页上的字。故先把 `data-t` 的内容剥掉再查（#887 起复制区载荷带全量记录）。
    const visible = body.replace(/data-t="[^"]*"/g, 'data-t=""');
    assert.ok(!visible.includes('00:00~06:30'), '页上不再出现波浪号写的起止');
  });

  it('空数据也出页：0 块、覆盖 0，空态是人话', () => {
    const html = renderTodaySummaryPage([], DAY);
    assertWholePage(html);
    const body = markupOf(html);
    assert.ok(body.includes('0 块'), '空数据也出页，不静默空转');
    assert.ok(body.includes('这一天还没有记录'), '空态出人话');
    assert.ok(body.includes('ilife-block-conclusion'), '结论条仍在（这一页从不空白）');
  });

  it('作息库现状上屏：五条读数都在（此前只写 stderr）', () => {
    withDb((handle) => {
      const out = viewRecordToday({ date: DAY }, handle);
      assertWholePage(out.html);
      const body = markupOf(out.html);
      assert.ok(body.includes('作息库现状'), '那一块的段落名在页上');
      assert.ok(body.includes('总记录数') && body.includes('5 条'), '总记录数');
      assert.ok(body.includes('已记录天数') && body.includes('1 天'), '已记录天数');
      assert.ok(body.includes('日期范围') && body.includes(DAY), '日期范围');
      assert.ok(body.includes('最后记录') && body.includes('睡前阅读'), '最后记录那一条');
      assert.ok(body.includes('ilife-block-fact-strip'), '读数走事实条（不新造件）');
    });
  });

  it('作息库现状：库空时报「无」，不留空格子', () => {
    const block = statusBlockOf({ records: 0, days: 0, firstDate: null, lastDate: null, last: null });
    const values = new Map(block.items.map((it) => [it.label, it.value]));
    assert.equal(values.get('日期范围'), '无', '日期范围');
    assert.equal(values.get('最后记录日期'), '无', '最后记录日期');
    assert.equal(values.get('最后记录内容'), '无', '最后记录内容');
  });

  it('「这一天还没过完」只在查今天时出，且只在覆盖没到此刻时出', () => {
    // 这一天覆盖到 23:59（719 分钟）：早上 7 点那一刻覆盖已到此刻 → 不出；下午 4 点那一刻没到 → 出。
    // （这一句拼在结论条里，不另立段落：页型配方是 #782 人裁冻结的，件序列不随数据多寡变形。）
    const early = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY, { nowMinutes: 7 * 60 }));
    assert.ok(!early.includes('这一天还没过完'), '覆盖已到此刻＝不出这一句');
    const late = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY, { nowMinutes: 16 * 60 }));
    assert.ok(late.includes('这一天还没过完'), '覆盖没到此刻＝出这一句');
    assert.ok(late.includes('这一页还不是整天的全貌'), '说清这一页为什么不是全天全貌');
    assert.ok(late.includes('ilife-block-conclusion'), '还是结论条那一个件（不新造段落）');
    const past = markupOf(renderTodaySummaryPage(DAY_RECORDS, DAY));
    assert.ok(!past.includes('这一天还没过完'), '没给此刻（过去某一天）＝不出');
  });

  it('载荷不动：出页之后 data 仍是原来那一份（读键的字段一个不少）', () => {
    withDb((handle) => {
      const out = viewRecordToday({ date: DAY }, handle);
      assert.equal(out.data.total, DAY_RECORDS.length);
      assert.equal(typeof out.data.coverage, 'number');
      assert.equal(typeof out.data.score, 'number');
      assert.equal(out.data.items.length, DAY_RECORDS.length);
      assert.deepEqual(Object.keys(out.data.items[0]).sort(),
        ['activity', 'category', 'date', 'duration', 'emoji', 'id', 'minutes', 'time'].sort());
    });
  });

  it('昨天那一支同一条链（同一个处理函数），页头写的是查的那一天', () => {
    withDb((handle) => {
      const out = viewRecordToday({ date: '2026-09-20' }, handle);
      const body = markupOf(out.html);
      assert.ok(body.includes('2026-09-20'), '页头是查的那一天');
      assert.ok(body.includes('0 块'), '那一天没有记录');
      assert.ok(body.includes('作息库现状'), '作息库现状照出（它说的是整个库，与查哪一天无关）');
    });
  });
});
