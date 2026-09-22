#!/usr/bin/env node
/** #893 · 10 页重渲染（当前 dist）：给 t516 真浏览器探针喂页面，验证 390 档 minFontPxNoSvg。
 *
 *  用法（仓根）：node docs/skills/skill-schedule/t893-页面.mjs
 *  产物：.scratch/t893/页面/*.html（11 张：10 张在修面 ＋ 1 张图例对照页）。
 *  只读 dist、不碰 .scratch/t792（读数席在途的产物）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(ROOT, '.scratch', 't893', '页面');
mkdirSync(OUT, { recursive: true });

const { renderWeekViewPage, renderRangeSummaryPage } = await import(
  '../../../packages/skill-schedule/dist/query/queryDocs.js');
const { renderComparePage, renderCategoryPage, renderAnomalyPage } = await import(
  '../../../packages/skill-schedule/dist/analyze/analyzeDocs.js');
const { replayPage } = await import('../../../packages/skill-schedule/dist/plan/replaySections.js');
const { reviewPage } = await import('../../../packages/skill-schedule/dist/plan/reviewDocs.js');
const { openScheduleDb, closeScheduleDb, addRecord } = await import(
  '../../../packages/skill-schedule/dist/fetch/db.js');

const BASE = {
  source_contents: null, source_timestamps: null, analysis_reasoning: null,
  created_at: '2026-09-21 08:00:00', updated_at: '2026-09-21 08:00:00', edit_count: 0,
};
let nextId = 1;
const rec = (date, start, end, minutes, activity, category) => ({
  ...BASE, id: nextId++, date, time_start: start, time_end: end,
  duration_minutes: minutes, activity, category,
});
const datesFrom = (lo, hi) => {
  const out = [];
  const d = new Date(lo + 'T00:00:00');
  const last = new Date(hi + 'T00:00:00');
  while (d.getTime() <= last.getTime()) {
    out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0'));
    d.setDate(d.getDate() + 1);
  }
  return out;
};
const spread = (dates, start, end, minutes, activity, category) =>
  dates.map((date) => rec(date, start, end, minutes, activity, category));
const save = (name, html) => {
  writeFileSync(join(OUT, name), html, 'utf8');
  console.log('wrote ' + name + ' (' + Buffer.byteLength(html, 'utf8') + ' B)');
};

/* ── 1. 周视图 ── */
const WEEK = datesFrom('2026-09-14', '2026-09-20');
save('周视图.html', renderWeekViewPage([
  ...spread(WEEK, '00:00', '06:30', 390, '睡眠', '维持.睡眠'),
  ...spread(WEEK, '09:00', '12:00', 180, '写代码', '工作.开发'),
  ...spread(WEEK, '20:00', '21:00', 60, '读书', '学习.阅读'),
], WEEK));

/* ── 2/3. 对比：两个月 ＋ 上周和这周 ＋ 工作日对周末（同模板三套数据） ── */
const AUG = datesFrom('2026-08-01', '2026-08-31');
const SEP = datesFrom('2026-09-01', '2026-09-30');
const augRecs = [
  ...spread(AUG, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(AUG, '09:00', '17:00', 480, '写代码', '工作.开发'),
];
const sepRecs = [
  ...spread(SEP, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
  ...spread(SEP, '09:00', '13:00', 240, '写代码', '工作.开发'),
  ...spread(SEP, '07:00', '07:45', 45, '晨跑', '健康.运动'),
];
save('对比-两个月.html', renderComparePage({
  labelA: '2026-08', startA: '2026-08-01', endA: '2026-08-31',
  labelB: '2026-09', startB: '2026-09-01', endB: '2026-09-30', a: augRecs, b: sepRecs,
}));
const WEEK_A = datesFrom('2026-09-07', '2026-09-13');
const WEEK_B = datesFrom('2026-09-14', '2026-09-20');
save('对比-上周和这周.html', renderComparePage({
  labelA: '上周', startA: WEEK_A[0], endA: WEEK_A[WEEK_A.length - 1],
  labelB: '这周', startB: WEEK_B[0], endB: WEEK_B[WEEK_B.length - 1],
  a: [...spread(WEEK_A, '00:00', '07:00', 420, '睡眠', '维持.睡眠'),
    ...spread(WEEK_A, '09:00', '18:00', 540, '写代码', '工作.开发')],
  b: [...spread(WEEK_B, '00:00', '06:30', 390, '睡眠', '维持.睡眠'),
    ...spread(WEEK_B, '09:00', '12:00', 180, '写代码', '工作.开发'),
    ...spread(WEEK_B, '20:00', '21:00', 60, '读书', '学习.阅读')],
}));
const isWeekend = (date) => [0, 6].includes(new Date(date + 'T00:00:00').getDay());
const workdays = SEP.filter((d) => !isWeekend(d));
const weekends = SEP.filter((d) => isWeekend(d));
save('对比-工作日对周末.html', renderComparePage({
  labelA: '工作日', startA: SEP[0], endA: SEP[SEP.length - 1],
  labelB: '周末', startB: SEP[0], endB: SEP[SEP.length - 1],
  a: [...spread(workdays, '00:00', '07:00', 420, '睡眠', '维持.睡眠'),
    ...spread(workdays, '09:00', '18:00', 540, '写代码', '工作.开发')],
  b: [...spread(weekends, '00:00', '09:00', 540, '睡眠', '维持.睡眠'),
    ...spread(weekends, '10:00', '12:00', 120, '逛街', '休闲.购物')],
}));

/* ── 4/5. 类别深挖：区间 ＋ 单日 ── */
const CAT = [
  ...spread(['2026-09-01', '2026-09-02'], '07:00', '07:45', 45, '晨跑', '健康.运动'),
  rec('2026-09-02', '19:40', '20:30', 50, '八段锦', '健康.八段锦'),
  rec('2026-09-02', '09:00', '17:00', 480, '写代码', '工作.开发'),
];
save('类别深挖-区间.html', renderCategoryPage({
  requested: '健康.运动', level1: '健康', start: '2026-09-01', end: '2026-09-03', records: CAT,
}));
save('类别深挖-单日.html', renderCategoryPage({
  requested: '健康', level1: '健康', start: '2026-09-02', end: '2026-09-02', records: CAT,
}));

/* ── 6. 异常检测 ── */
const BASE_D = datesFrom('2026-08-23', '2026-09-21');
const WIN_D = datesFrom('2026-09-15', '2026-09-21');
save('异常检测-7天.html', renderAnomalyPage({
  end: '2026-09-21', windowDays: 7,
  records: [...spread(WIN_D, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
    ...spread(WIN_D, '09:00', '13:00', 240, '写代码', '工作.开发'),
    ...spread(WIN_D, '07:00', '08:30', 90, '晨跑', '健康.运动')],
  baseline: [...spread(BASE_D, '00:00', '08:00', 480, '睡眠', '维持.睡眠'),
    ...spread(BASE_D, '09:00', '17:00', 480, '写代码', '工作.开发'),
    ...spread(BASE_D, '07:00', '07:45', 45, '晨跑', '健康.运动')],
  baselineStart: '2026-08-23',
}));

/* ── 7/8/9. 复盘（库内真数据）＋ 10. 图例对照 ── */
const dir = mkdtempSync(join(tmpdir(), 't893-pages-'));
const handle = openScheduleDb(join(dir, 'schedule_data.db'));
try {
  const D61 = datesFrom('2026-07-23', '2026-09-21');
  for (const r of [...spread(D61, '00:00', '07:00', 420, '睡眠', '维持.睡眠'),
    ...spread(D61, '09:00', '17:00', 480, '写代码', '工作.开发'),
    ...spread(datesFrom('2026-09-01', '2026-09-21'), '07:00', '07:45', 45, '晨跑', '健康.运动')]) {
    addRecord(handle, {
      date: r.date, time_start: r.time_start, time_end: r.time_end,
      duration_minutes: r.duration_minutes, activity: r.activity, category: r.category,
    });
  }
  save('复盘区间-61天-通用档.html', replayPage(handle,
    { start: '2026-07-23', end: '2026-09-21', days: 61, requested: 'range', effective: 'range' }));
  save('复盘区间-7天-本周档.html', replayPage(handle,
    { start: '2026-09-15', end: '2026-09-21', days: 7, requested: 'range', effective: 'week' }));
  save('复盘本周.html', reviewPage(handle, '2026-09-21'));
} finally {
  closeScheduleDb(handle);
  rmSync(dir, { recursive: true, force: true });
}

/* ── 11. 区间汇总（21 天，图例对照：预期仍 11.5，阳性对照） ── */
const D21 = datesFrom('2026-09-01', '2026-09-21');
save('区间汇总-21天-图例对照.html', renderRangeSummaryPage([
  ...spread(D21, '00:00', '07:00', 420, '睡眠', '维持.睡眠'),
  ...spread(D21, '09:00', '17:00', 480, '写代码', '工作.开发'),
  ...spread(D21, '20:00', '21:00', 60, '读书', '学习.阅读'),
], D21[0], D21[D21.length - 1]));

console.log('done -> ' + OUT);
