/** #782 · 「查询与浏览」域的**页数据**（口径层）：DB 行 → 两张页各自要的东西。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「一级分类怎么聚合、
 *  睡眠算哪几类、24 小时格取谁、健康分怎么算」全是**本域的口径**——摆好再交给页型函数。
 *
 *  **不重算别家口径**：单日的块数／覆盖分钟／健康分直接调 `render/views.ts` 的 `buildRecordToday`
 *  （那是这枚 key 既有口径的唯一实现），本件只补它在页上还没用上的两样：一级分类分钟数、24 小时格。
 */
import { LEVEL1_WHITELIST, computeHealthScore, fmtDur, fmtDurShort, fmtPct, l1Of, toMinutes } from '../policy/index.js';
import { buildRecordToday } from '../render/views.js';
import type { ScheduleRecord } from '../fetch/db.js';
import { hourCellsOf, type HeatRow, type HourCell } from '../shared/pageParts.js';
import { renderDayPage, type DayPageData } from '../shared/dayPage.js';
import { renderWeekPage, type WeekPageData } from '../shared/weekPage.js';

/** 一级分类的权威顺序（配色与图例都照它），取自 `policy` 的白名单，本件不另写一份。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 一级分类分钟数（同一批记录聚合一次，两张页都用）。 */
function byL1Of(records: readonly ScheduleRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const l1 = l1Of(r.category);
    out[l1] = (out[l1] ?? 0) + (r.duration_minutes ?? 0);
  }
  return out;
}

/** 记录的 24 小时格（当天分钟数 → 格）。 */
function cellsOf(records: readonly ScheduleRecord[]): HourCell[] {
  return hourCellsOf(records.map((r) => ({
    start: toMinutes(r.time_start),
    end: toMinutes(r.time_end),
    key: l1Of(r.category),
  })));
}

/** 「今天总结」整页（形状＝B 时间轴主轴；老侧 f01 的四个必现块都在）。 */
export function renderTodaySummaryPage(records: readonly ScheduleRecord[], date: string): string {
  const view = buildRecordToday(date, [...records]);
  const byL1 = byL1Of(records);
  const sleepMinutes = records
    .filter((r) => r.category.includes('睡眠') || r.category.includes('午睡'))
    .reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const nightMinutes = records
    .filter((r) => r.category.includes('睡眠'))
    .reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const ranked = Object.keys(byL1).sort((a, b) => byL1[b] - byL1[a]);
  const top = ranked[0] ?? '—';
  const longest = [...records].sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0))[0];
  const data: DayPageData = {
    head: {
      docTitle: '作息管家 · 今天总结',
      eyebrow: '作息管家 ｜ 查询与浏览',
      title: '今天总结',
      subtitle: date + ' · ' + view.total + ' 块记录 · 覆盖 ' + fmtDurShort(view.coverage) + ' · 健康分 ' + view.score,
    },
    cells: cellsOf(records),
    order: L1_ORDER,
    conclusion: date + ' 记了 ' + view.total + ' 块、覆盖 ' + fmtDurShort(view.coverage) + '，健康分 ' + view.score
      + '；投入最多的是「' + top + '」' + fmtDurShort(byL1[top] ?? 0) + '，睡眠合计 ' + fmtDurShort(sleepMinutes) + '。',
    facts: [
      { label: '记录块数', value: String(view.total) + ' 块' },
      { label: '覆盖时长', value: fmtDurShort(view.coverage) },
      { label: '健康分', value: String(view.score) },
      { label: '睡眠＋午睡', value: fmtDurShort(sleepMinutes) },
    ],
    timeline: view.items.map((item) => ({
      time: item.time,
      main: item.activity,
      note: item.category + ' · ' + item.duration,
    })),
    sleep: [
      { label: '夜间睡眠', value: fmtDurShort(nightMinutes) },
      { label: '午睡', value: fmtDurShort(sleepMinutes - nightMinutes) },
      { label: '合计', value: fmtDurShort(sleepMinutes), tone: sleepMinutes >= 420 ? 'ok' : 'warn' },
      ...(longest === undefined ? [] : [{ label: '最长一块', value: longest.activity }]),
    ],
    distribution: ranked.map((key) => ({
      label: key,
      value: fmtDurShort(byL1[key]),
      pct: fmtPct(byL1[key], view.coverage),
    })),
    copy: {
      dataText: '【作息管家 · 今天总结】' + date
        + '（共 ' + view.total + ' 块 · 覆盖 ' + fmtDur(view.coverage) + ' · 健康分 ' + view.score + '）\n'
        + ranked.map((key) => key + '：' + fmtDur(byL1[key])).join('\n'),
      logText: '场景：今天总结 ｜ 日期：' + date + ' ｜ 数据来源：作息记录表（' + records.length + ' 行）',
    },
  };
  return renderDayPage(data);
}

/** 「周视图」整页（形状＝A 矩阵为主；老侧 f08 的五个必现块都在）。
 *  `days` 是这七个日期（调用方定位好周一到周日），顺序即矩阵的行序。 */
export function renderWeekViewPage(records: readonly ScheduleRecord[], days: readonly string[]): string {
  const byDate: Record<string, ScheduleRecord[]> = {};
  for (const r of records) (byDate[r.date] ??= []).push(r);
  const rows: HeatRow[] = days.map((day, i) => {
    const dayRecords = byDate[day] ?? [];
    const cells = cellsOf(dayRecords);
    const minutes = dayRecords.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
    return {
      label: WEEKDAY_LABELS[i % WEEKDAY_LABELS.length],
      date: day,
      cells,
      sum: minutes > 0 ? fmtDurShort(minutes) : '无记录',
    };
  });
  const byL1 = byL1Of(records);
  const ranked = Object.keys(byL1).sort((a, b) => byL1[b] - byL1[a]);
  const total = records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const score = computeHealthScore(byL1).score;
  const activeDays = rows.filter((row) => row.sum !== '无记录').length;
  const start = days[0];
  const end = days[days.length - 1];
  const data: WeekPageData = {
    head: {
      docTitle: '作息管家 · 周视图',
      eyebrow: '作息管家 ｜ 查询与浏览',
      title: '周视图',
      subtitle: start + ' ~ ' + end + ' · ' + records.length + ' 块记录 · 总时长 ' + fmtDurShort(total) + ' · 健康分 ' + score,
    },
    kpis: [
      { label: '总时长', value: fmtDurShort(total), detail: records.length + ' 块记录' },
      { label: '日均', value: fmtDurShort(Math.round(total / Math.max(activeDays, 1))), detail: '有记录 ' + activeDays + '/7 天' },
      { label: '健康分', value: String(score), detail: '七个维度取均（创作不参评）', bar: { pct: score } },
      { label: '投入最多', value: ranked[0] ?? '—', detail: fmtDurShort(byL1[ranked[0]] ?? 0) },
    ],
    rows,
    order: L1_ORDER,
    distribution: ranked.map((key) => ({
      label: key,
      value: fmtDurShort(byL1[key]),
      pct: fmtPct(byL1[key], total),
    })),
    daily: rows.map((row) => ({
      left: row.label + ' ' + row.date.slice(5),
      main: (byDate[row.date] ?? []).length + ' 块',
      right: row.sum,
    })),
    copy: {
      dataText: '【作息管家 · 周视图】' + start + ' ~ ' + end
        + '（共 ' + records.length + ' 块 · 总时长 ' + fmtDur(total) + ' · 健康分 ' + score + '）\n'
        + ranked.map((key) => key + '：' + fmtDur(byL1[key])).join('\n'),
      logText: '场景：周视图 ｜ 区间：' + start + ' ~ ' + end + ' ｜ 数据来源：作息记录表（' + records.length + ' 行）',
    },
  };
  return renderWeekPage(data);
}
