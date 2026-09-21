/** #782 · 「日程与计划」域的**页数据**（口径层）：事件行 → 「查日程」要的东西。
 *
 *  口径本件自己算的那一条：**空档**＝这一天里没排事件的连续时段（从 00:00 起算、到 24:00 收尾；
 *  相邻事件首尾相接或重叠都不断档）。老侧「查日程」页面的空档就是这个意思，但老侧没有独立函数，
 *  故这一条口径落在这里、只此一处。f12「商量计划预览」的**空档提示**也用这一条（#787），
 *  所以它住 `plan` 侧而不是 `query` 侧：两个能力都在用，抄一份到别处就走散了。
 *
 *  事件自身的口径（时间／标题／分类／完成／是否已同步飞书）直接调 `render/views.ts` 的
 *  `buildPlanToday`，本件不重算。
 *
 *  #786 这一段补的三处（查日程这一族在图上归 #786；本件是它的页数据来源）：
 *   · **文案过分隔符门**（#516 的真门）：页头三件与事件行右槽里的 `·`／`｜`、时段与空档的 `~`、
 *     结论条里的 `、` 全部改成行文标点或分槽——照 #784／#785 两张页的同一条口径（范围写「至」）。
 *   · **两支查法**（`search`）：按标题搜（老侧只出 JSON）与按时段查重（老侧只出 JSON）共用这一张页；
 *     全天的读数（色带／空档／卡）仍是这一天的全貌，只有**列表**换成命中集合，页头与结论条明说这一趟是怎么查的。
 *   · **已软删**（`inactive`，可选）：老侧这条也只出 JSON；软删事件上同一张页，行尾标「已软删」，结论条报条数。
 *     不给时产出与 #782 那张样张页**逐字节相同**（除上面那三处文案修正——那三处是票面点名的债）。
 */
import { LEVEL1_WHITELIST, fmtDur, fmtDurShort, l1Of, toMinutes } from '../policy/index.js';
import { buildPlanToday } from '../render/views.js';
import type { PlanEvent } from '../fetch/db.js';
import { hourCellsOf } from '../shared/pageParts.js';
import { renderPlanPage, type PlanPageData } from '../shared/planPage.js';

/** 一级分类的权威顺序（配色与图例都照它），取自 `policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

const DAY_END = 1440;

/** 钟点 → 分钟，且**这一天末尾那一格**按 24:00 算：末段写 `23:59` 与写 `24:00` 是同一件事
 *  （校验口径 `assertCoverage24h` 的原话：「末事件 time_end 必须为 24:00，当前 23:59 视同」），
 *  而落盘的候选是**归一过**的（`normalizeTime` 把 `24:00` 改写成 `23:59`）。整日覆盖、空隙、
 *  时长三处都按这一条算，否则「整天接满」会被读成「还差一分钟」。定义只此一处。 */
export const minutesOfDayEnd = (hhmm: string): number =>
  (hhmm === '24:00' || hhmm === '23:59' ? DAY_END : toMinutes(hhmm));

/** 空档：未排事件的连续时段（按时间先后扫一遍，游标只前进；相邻或重叠都不断档）。
 *  #787 起本件对外给这一条：f12「商量计划预览」的**空隙提示**与 f10「查日程」的空档是同一件事，
 *  两个用法都在本能力目录里，故仍只此一处（收的只是「有起止的东西」，不要求是库行）。 */
export function gapsOf(
  events: readonly { readonly time_start: string; readonly time_end: string }[],
): { readonly start: number; readonly end: number }[] {
  const sorted = [...events].sort((a, b) => minutesOfDayEnd(a.time_start) - minutesOfDayEnd(b.time_start));
  const out: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const e of sorted) {
    const start = minutesOfDayEnd(e.time_start);
    if (start > cursor) out.push({ start: cursor, end: start });
    cursor = Math.max(cursor, minutesOfDayEnd(e.time_end));
  }
  if (cursor < DAY_END) out.push({ start: cursor, end: DAY_END });
  return out;
}

/** 分钟数 → `HH:MM` 钟点（`24:00` 收尾）：页上空档与空隙两处共用的写法，只此一处。 */
export const clockOf = (minutes: number): string =>
  minutes >= DAY_END ? '24:00' : String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');

/** 起止一律写「起 至 止」：`~` 是分隔符门（#516）点名的符号顶替，页上不许出现。 */
const spanOf = (start: string, end: string): string => start + ' 至 ' + end;

/** 按标题搜或按时段查重（本票两支，老侧都只出 JSON）。
 *
 *  为什么同一张页：两个查法都落在 `schedule.plan.today` 这一枚 key 上，出口只按 key 分派
 *  （路由表没给它们各自的预设），下游分不出是哪种查法——故一张页把两支都答全，
 *  页头与结论条如实写明这一趟的查法，不让人猜这一页为什么只有几件。 */
export interface PlanDaySearch {
  /** 按标题搜索时命中的那个词（原样上屏）。 */
  readonly title?: string;
  /** 按时段查重时那一对钟点。 */
  readonly window?: { readonly start: string; readonly end: string };
  /** 命中集合（进列表的那几行）；全天的色带／空档／读数仍按 `events` 算。 */
  readonly list: readonly PlanEvent[];
}

/** `renderPlanDayPage` 的可选位（不给＝#782 那张样张页的件序列与读数）。 */
export interface PlanDayPageOptions {
  /** 这一天**已软删**的事件（`is_active = 0`）：上同一张页、行尾标「已软删」，结论条报条数。 */
  readonly inactive?: readonly PlanEvent[];
  readonly search?: PlanDaySearch;
}

/** 当天分钟数：`24:00` 是「到这一天末尾」（＝1440）。**不走 `normalizeTime`**——它把 `24:00` 改写成
 *  `23:59`（那是飞书 ISO 的口径），用在这一段的窗口比较里会把 23:00 至 23:59 那一条漏在窗口外。 */
const minutesOf = (hhmm: string): number => (hhmm === '24:00' ? DAY_END : toMinutes(hhmm));

/** 这一时段里有哪几件：与窗口**重叠**即算（起在前、止在后都算）。查重用，故不要求整段包住。 */
export function eventsInWindow(
  events: readonly PlanEvent[],
  start: string,
  end: string,
): PlanEvent[] {
  const lo = minutesOf(start);
  const hi = minutesOf(end);
  return events.filter((e) => toMinutes(e.time_start) < hi && toMinutes(e.time_end) > lo);
}

/** 事件行（事件卡的一行）：`left`＝起止、`main`＝标题、`right`＝完成与同步状态。
 *  软删的那几行右槽写「已软删」——它是这一行的身份，不另立一段。 */
function eventRowOf(e: PlanEvent, deleted: boolean): { left: string; main: string; right: string } {
  const completion = e.completion === null || e.completion === '' ? '未复盘' : e.completion;
  const right = deleted
    ? '已软删'
    : completion + (e.feishu_event_id === null ? '' : '，已同步飞书');
  return { left: spanOf(e.time_start, e.time_end), main: e.title, right };
}

/** 「查日程」整页（形状＝A 覆盖条＋事件卡；老侧 f10 的三个必现块都在）。
 *
 *  `events` 是**这一天的活跃事件**（读数／色带／空档都按它算）；`opts.search.list` 只换列表那一段。 */
export function renderPlanDayPage(
  events: readonly PlanEvent[],
  date: string,
  opts: PlanDayPageOptions = {},
): string {
  const view = buildPlanToday(date, [...events]);
  const gaps = gapsOf(events);
  const busyMinutes = events.reduce((sum, e) => sum + (toMinutes(e.time_end) - toMinutes(e.time_start)), 0);
  const freeMinutes = gaps.reduce((sum, g) => sum + (g.end - g.start), 0);
  const done = view.items.filter((item) => (item.completion ?? '').startsWith('已完成')).length;
  const synced = view.items.filter((item) => item.synced).length;
  const inactive = opts.inactive ?? [];
  const listed = opts.search === undefined ? events : opts.search.list;
  const hits = listed.length;
  const search = opts.search;
  const focusLine = search === undefined
    ? ''
    : (search.title !== undefined
      ? '按标题「' + search.title + '」搜到 ' + hits + ' 件。'
      : (search.window !== undefined
        ? spanOf(search.window.start, search.window.end) + ' 这一段里有 ' + hits + ' 件。'
        : ''));
  const data: PlanPageData = {
    head: {
      // 文档标题走「技能名 空格 页名」（`·` 是分隔符门点名的并列符号之一，页头也是可见文本）。
      docTitle: '作息管家 查日程',
      eyebrow: '作息管家 查询与浏览',
      title: '查日程',
      subtitle: focusLine === ''
        ? date + ' 这一天排了 ' + view.total + ' 件事件，空档 ' + gaps.length + ' 段共 ' + fmtDurShort(freeMinutes) + '。'
        : focusLine + date + ' 这一天一共 ' + view.total + ' 件事件。',
    },
    cells: hourCellsOf(events.map((e) => ({
      start: toMinutes(e.time_start),
      end: toMinutes(e.time_end),
      key: l1Of(e.category ?? ''),
    }))),
    order: L1_ORDER,
    kpis: [
      search === undefined
        ? { label: '事件', value: String(view.total), unit: '件', detail: '这一天排的' }
        : { label: '命中', value: String(hits), unit: '件', detail: '这一天一共 ' + view.total + ' 件' },
      { label: '已排时段', value: fmtDurShort(busyMinutes), detail: '最早 ' + (events[0]?.time_start ?? '无') + ' 起' },
      { label: '空档', value: String(gaps.length), unit: '段', detail: '合计 ' + fmtDurShort(freeMinutes) },
      {
        label: '已完成',
        value: String(done),
        unit: '件',
        detail: '已同步飞书 ' + synced + ' 件' + (inactive.length === 0 ? '' : '，已软删 ' + inactive.length + ' 件'),
      },
    ],
    conclusion: date + ' 排了 ' + view.total + ' 件，占了 ' + fmtDurShort(busyMinutes) + '。'
      + '空档 ' + gaps.length + ' 段，共 ' + fmtDurShort(freeMinutes) + '。'
      + (search !== undefined && search.window !== undefined && hits === 0 ? '这一时段没有安排。' : '')
      + '已完成 ' + done + ' 件。'
      + (inactive.length === 0 ? '' : '另有 ' + inactive.length + ' 件已软删。'),
    events: {
      items: [
        ...listed.map((e) => eventRowOf(e, false)),
        ...inactive.map((e) => eventRowOf(e, true)),
      ],
      // 空列表那句话随查法变（#786）：按标题搜没命中与「这一天没有事件」不是一回事。
      ...(search === undefined
        ? {}
        : { emptyText: search.title !== undefined ? '这一天没有标题命中的事件' : '这一时段没有安排' }),
    },
    gaps: gaps.map((gap) => ({
      left: spanOf(clockOf(gap.start), clockOf(gap.end)),
      main: '空档',
      right: fmtDurShort(gap.end - gap.start),
    })),
    // 筛选位（老侧 f10 的第三块必现块）：日期／分类／状态三格，说明句里不堆并列分隔符。
    filters: [
      { name: 'plan-date', label: '日期', value: date },
      { name: 'plan-category', label: '分类', value: '全部', options: ['全部', ...L1_ORDER] },
      { name: 'plan-state', label: '状态', value: '全部', options: ['全部', '已完成', '未完成', '已同步飞书'] },
    ],
    copy: {
      dataText: '【作息管家 查日程】' + date + '（' + view.total + ' 件 · 已排 ' + fmtDur(busyMinutes)
        + ' · 空档 ' + gaps.length + ' 段 ' + fmtDur(freeMinutes) + '）\n'
        + listed.map((e) => spanOf(e.time_start, e.time_end) + ' ' + e.title + '（' + (e.category || '未分类')
          + '，' + (e.completion ?? '未复盘') + '）').join('\n'),
      logText: '场景：查日程 ｜ 日期：' + date + ' ｜ 数据来源：日程事件表（' + events.length + ' 行）',
    },
  };
  return renderPlanPage(data);
}
