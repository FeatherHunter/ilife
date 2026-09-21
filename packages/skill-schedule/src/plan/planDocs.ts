/** #782 · 「日程与计划」域的**页数据**（口径层）：事件行 → 「查日程」要的东西。
 *
 *  口径本件自己算的那一条：**空档**＝这一天里没排事件的连续时段（从 00:00 起算、到 24:00 收尾；
 *  相邻事件首尾相接或重叠都不断档）。老侧「查日程」页面的空档就是这个意思，但老侧没有独立函数，
 *  故这一条口径落在这里、只此一处。
 *
 *  事件自身的口径（时间／标题／分类／完成／是否已同步飞书）直接调 `render/views.ts` 的
 *  `buildPlanToday`，本件不重算。
 */
import { LEVEL1_WHITELIST, fmtDur, fmtDurShort, l1Of, toMinutes } from '../policy/index.js';
import { buildPlanToday } from '../render/views.js';
import type { PlanEvent } from '../fetch/db.js';
import { hourCellsOf } from '../shared/pageParts.js';
import { renderPlanPage, type PlanPageData } from '../shared/planPage.js';

/** 一级分类的权威顺序（配色与图例都照它），取自 `policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

const DAY_END = 1440;

/** 空档：未排事件的连续时段（按时间先后扫一遍，游标只前进；相邻或重叠都不断档）。 */
function gapsOf(events: readonly PlanEvent[]): { readonly start: number; readonly end: number }[] {
  const sorted = [...events].sort((a, b) => toMinutes(a.time_start) - toMinutes(b.time_start));
  const out: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const e of sorted) {
    const start = toMinutes(e.time_start);
    if (start > cursor) out.push({ start: cursor, end: start });
    cursor = Math.max(cursor, toMinutes(e.time_end));
  }
  if (cursor < DAY_END) out.push({ start: cursor, end: DAY_END });
  return out;
}

const clock = (minutes: number): string =>
  minutes >= DAY_END ? '24:00' : String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');

/** 「查日程」整页（形状＝A 覆盖条＋事件卡；老侧 f10 的三个必现块都在）。 */
export function renderPlanDayPage(events: readonly PlanEvent[], date: string): string {
  const view = buildPlanToday(date, [...events]);
  const gaps = gapsOf(events);
  const busyMinutes = events.reduce((sum, e) => sum + (toMinutes(e.time_end) - toMinutes(e.time_start)), 0);
  const freeMinutes = gaps.reduce((sum, g) => sum + (g.end - g.start), 0);
  const done = view.items.filter((item) => (item.completion ?? '').startsWith('已完成')).length;
  const synced = view.items.filter((item) => item.synced).length;
  const data: PlanPageData = {
    head: {
      docTitle: '作息管家 · 查日程',
      eyebrow: '作息管家 ｜ 日程与计划',
      title: '查日程',
      subtitle: date + ' · ' + view.total + ' 件事件 · 空档 ' + gaps.length + ' 段共 ' + fmtDurShort(freeMinutes),
    },
    cells: hourCellsOf(events.map((e) => ({
      start: toMinutes(e.time_start),
      end: toMinutes(e.time_end),
      key: l1Of(e.category ?? ''),
    }))),
    order: L1_ORDER,
    kpis: [
      { label: '事件', value: String(view.total) + ' 件' },
      { label: '已排时段', value: fmtDurShort(busyMinutes) },
      { label: '空档', value: String(gaps.length) + ' 段', detail: '合计 ' + fmtDurShort(freeMinutes) },
      { label: '已完成', value: String(done) + ' 件', detail: '已同步飞书 ' + synced + ' 件' },
    ],
    conclusion: date + ' 排了 ' + view.total + ' 件、占 ' + fmtDurShort(busyMinutes)
      + '，空档 ' + gaps.length + ' 段共 ' + fmtDurShort(freeMinutes) + '，已完成 ' + done + ' 件。',
    events: view.items.map((item) => ({
      left: item.time,
      main: item.title,
      right: (item.completion ?? '未完成') + (item.synced ? ' · 已同步飞书' : ''),
    })),
    gaps: gaps.map((gap) => ({
      left: clock(gap.start) + '~' + clock(gap.end),
      main: '空档',
      right: fmtDurShort(gap.end - gap.start),
    })),
    filters: [
      { name: 'plan-date', label: '日期', value: date },
      { name: 'plan-category', label: '分类', value: '全部', options: ['全部', ...L1_ORDER] },
      { name: 'plan-state', label: '状态', value: '全部', options: ['全部', '已完成', '未完成', '已同步飞书'] },
    ],
    copy: {
      dataText: '【作息管家 · 查日程】' + date + '（' + view.total + ' 件 · 已排 ' + fmtDur(busyMinutes)
        + ' · 空档 ' + gaps.length + ' 段 ' + fmtDur(freeMinutes) + '）\n'
        + view.items.map((item) => item.time + ' ' + item.title + '（' + (item.category || '未分类') + '，' + (item.completion ?? '未完成') + '）').join('\n'),
      logText: '场景：查日程 ｜ 日期：' + date + ' ｜ 数据来源：日程事件表（' + events.length + ' 行）',
    },
  };
  return renderPlanPage(data);
}
