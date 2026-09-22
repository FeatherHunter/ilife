/** #784 · 「查询与浏览」域的**页数据**（口径层）：DB 行 → 各张页各自要的东西。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「一级分类怎么聚合、
 *  睡眠算哪几类、24 小时格取谁、健康分怎么算、哪一天算没记完、作息库现状报哪几条」全是**本域的口径**
 *  ——摆好再交给页型函数。
 *
 *  **不重算别家口径**：单日的块数／覆盖分钟／健康分直接调 `render/views.ts` 的 `buildRecordToday`
 *  （那是这枚 key 既有口径的唯一实现），本件只补它在页上还没用上的两样：一级分类分钟数、24 小时格。
 *
 *  #784 这一段交的页：**「今天总结」一张页，七个单日唤醒词共用**（今天总结／今日作息／今日总结／
 *  今天作息／查作息／查作息时间轴／查作息状态 —— 全在 `schedule.record.today` 这一枚 key 上，
 *  路由表没给它们各自的预设，出口只按 key 分派 ⇒ 下游分不出是哪个词来的，故这一张页必须
 *  把七个词的诉求一次答全：老侧 f01 的四个必现块 ＋ 24h 时间轴 ＋ **作息库现状**那一块）。
 *
 *  **文案口径（#516 的分隔符门是一条真门，不是排版偏好）**：页上任何一处可见文本都不许用
 *  `· ； ｜ 、 ~` 这些并列分隔符去堆信息——该并列的地方换形状（事实条／时间轴／列表行／读数卡）。
 *  故本件把老侧那几处串接（`分类 · 时长`、`起~止`、页头副题的四段）全换成**分槽**或行文标点；
 *  范围一律写「至」（老侧 HELP 与 #783 那几张页同口径）。
 *
 *  **时间口径只有一条**：日期一律由调用方 `resolveDateParam` 定好（今天／昨天／指定日期同路），
 *  本件不另算「今天」；「这一天还没过完」由调用方给的 `nowMinutes`（当天已过分钟数）与覆盖比较得出，
 *  不给 `nowMinutes` 这一段就不出（用例与固定夹具页面不被墙上时钟搅动）。
 *
 *  #785 这一段补三张页（同一枚「形状只此一处」的口径：骨架住 `src/shared/`，本件只算数据）：
 *   · **区间汇总**（f02，`renderRangeSummaryPage`）——老侧那三块必现块齐全，且分类名是**人话的
 *     一级分类**（`l1.工作` 这类原始键只许活在本键的载荷里，不许印上屏）；
 *   · **24h 概览（多日）**（f11，`renderPlanOverviewPage`）——`view=aggregate` 那一支的载荷
 *     原本回落薄模板页会渲染成一排空卡（渲染器按 `{time,title,activity}` 取值，载荷却是
 *     `{date,hours[],plannedHours}`），本件把这份载荷真画出来；
 *   · **周视图**（f08，`renderWeekViewPage`，形状与样本页 #782 冻结的那一份逐字同）。
 *
 *  #786 这一段补一张（第四张页型住 `shared/detailPage.ts`）：
 *   · **作息详情**（f06，`renderRecordDetailPage`）——老侧那两个必现块（每条 11 字段全展开、
 *     `analysis_reasoning` 完整展示）都在；按日查与按 ID 查走同一张页（同一枚 key 的两支）。
 */
import {
  HEALTH_TARGETS, LEVEL1_WHITELIST, computeHealthScore, fmtDur, fmtDurShort, fmtPct, l1Of,
  recentNDays, relativeToRange, toMinutes,
} from '../policy/index.js';
import { buildRecordDetail, buildRecordRange, buildRecordToday } from '../render/views.js';
import { scheduleCopyLog, scheduleNowStamp } from '../render/copyArea.js';
import type { ScheduleRecord } from '../fetch/db.js';
import type { PlanOverviewPayload } from '../plan/index.js';
import { categoryColor, hourCellsOf, type HeatRow, type HourCell } from '../shared/pageParts.js';
import { renderDayPage, type DayPageData } from '../shared/dayPage.js';
import { renderWeekPage, type WeekPageData } from '../shared/weekPage.js';
import { renderRangePage } from '../shared/rangePage.js';
import { renderOverviewPage } from '../shared/overviewPage.js';
import { renderDetailPage, type RecordDetailItem } from '../shared/detailPage.js';
import { type ListRowInput } from 'base-paint/blocks';

/** 一级分类的权威顺序（配色与图例都照它），取自 `policy` 的白名单，本件不另写一份。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 一天的分钟数（「没记完」的判据里当分母用）。 */
const DAY_MINUTES = 1440;

/** 作息库现状那一块的段落名（一处写，页上不再各说一遍）。 */
const STATUS_TITLE = '作息库现状';

/** 作息库现状的原始读数（`fetch` 层给什么就是什么，本件只摆位与化人话）。 */
export interface StatusView {
  readonly records: number;
  readonly days: number;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  /** 库里最后一条记录（`getLastRecord`）——「最后记录」那两格；库空＝null。 */
  readonly last: ScheduleRecord | null;
}

/** 起止写成「起至止」（范围一律写「至」，不写 `~`：`~` 是分隔符门点名的那几种之一）。 */
function timeRangeOf(start: string, end: string): string {
  return start + ' 至 ' + end;
}

/** 一级分类分钟数（同一批记录聚合一次）。 */
function byL1Of(records: readonly ScheduleRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const l1 = l1Of(r.category);
    out[l1] = (out[l1] ?? 0) + (r.duration_minutes ?? 0);
  }
  return out;
}

/** 记录的 24 小时格（当天分钟数 → 格）。 */
function cellsOf(records: readonly ScheduleRecord[]): HourCell[] {  return hourCellsOf(records.map((r) => ({
    start: toMinutes(r.time_start),
    end: toMinutes(r.time_end),
    key: l1Of(r.category),
  })));
}

/** 睡眠＋午睡合计（「4 卡摘要」与「睡眠统计」两处共用这一个算式）。 */
function sleepOf(records: readonly ScheduleRecord[]): { readonly all: number; readonly night: number } {
  const sum = (pred: (category: string) => boolean): number =>
    records.filter((r) => pred(r.category)).reduce((acc, r) => acc + (r.duration_minutes ?? 0), 0);
  return {
    all: sum((c) => c.includes('睡眠') || c.includes('午睡')),
    night: sum((c) => c.includes('睡眠')),
  };
}

/** **作息库现状**那一块的数据：老侧 `status` 子命令的五条读数（总记录数／已记录天数／日期范围／
 *  最后记录）在新仓此前只写进 stderr，用户看不到——#784 起它们上屏，占一条事实条。
 *  库空时给「无」，不留空格子，也不出假读数。 */
export function statusBlockOf(status: StatusView): { readonly title: string; readonly items: readonly { readonly label: string; readonly value: string }[] } {
  const span = status.firstDate === null || status.lastDate === null
    ? '无'
    : (status.firstDate === status.lastDate ? status.firstDate : status.firstDate + ' 至 ' + status.lastDate);
  const last = status.last;
  return {
    title: STATUS_TITLE,
    items: [
      { label: '总记录数', value: String(status.records) + ' 条' },
      { label: '已记录天数', value: String(status.days) + ' 天' },
      { label: '日期范围', value: span },
      { label: '最后记录日期', value: last === null ? '无' : last.date },
      { label: '最后记录内容', value: last === null ? '无' : last.time_end + ' 那次是' + last.activity },
    ],
  };
}

/** 「这一天还没过完」那句话：覆盖还没到「此刻」就是没记完；拼在结论条那一句后面当第二句
 *  （**不另立段落**：这一页的骨架已由 #782 人裁冻结，页上件序列不因数据多寡变形）。
 *  `nowMinutes` 不给＝这一句不加；覆盖已达此刻或已满一天＝不加。 */
function partialSentenceOf(coverage: number, nowMinutes: number | undefined): string {
  if (nowMinutes === undefined) return '';
  const elapsed = Math.min(DAY_MINUTES, Math.max(0, Math.floor(nowMinutes)));
  if (elapsed >= DAY_MINUTES || coverage >= elapsed) return '';
  return '这一天还没过完，到此刻已记录 ' + fmtDurShort(coverage)
    + '，还差 ' + fmtDurShort(elapsed - coverage) + ' 到此刻，所以这一页还不是整天的全貌。';
}

/** 逐条时间轴（老侧「24h 时间轴」的下半截）的一行：**行列表三槽**。
 *  `left`＝起止（写「至」）、`main`＝做了什么、`right`＝时长。
 *  **为什么不是公共层的 `renderTimelineRows`**：那一件只有「时间／正文／附注」三槽，
 *  「分类 ＋ 时长」塞进附注就会堆成 `分类 · 时长`（分隔符门点名的那种堆法）；
 *  这里走行列表（同样在公共层）——一槽一件事，页上不留并列分隔符。 */
function timelineRowsOf(records: readonly ScheduleRecord[]): readonly ListRowInput[] {
  return records.map((r) => ({
    left: timeRangeOf(r.time_start, r.time_end),
    main: r.activity,
    right: fmtDur(r.duration_minutes ?? 0),
  }));
}

/** 「今天总结」整页（形状＝B 时间轴主轴；老侧 f01 的四个必现块都在）。
 *  `status`／`nowMinutes` 都可选：`status` 是「作息库现状」那一段，`nowMinutes` 触发「还没过完」那一句。 */
export function renderTodaySummaryPage(
  records: readonly ScheduleRecord[],
  date: string,
  opts: { readonly status?: StatusView; readonly nowMinutes?: number } = {},
): string {
  const view = buildRecordToday(date, [...records]);
  const byL1 = byL1Of(records);
  const sleep = sleepOf(records);
  const ranked = Object.keys(byL1).sort((a, b) => byL1[b] - byL1[a]);
  const top = ranked[0] ?? '—';
  const longest = [...records].sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0))[0];
  const data: DayPageData = {
    head: {
      // 文档标题走「技能名 空格 页名」（与 #783 那几张页同口径；`·` 是分隔符门点名的那几种之一）。
      docTitle: '作息管家 今天总结',
      eyebrow: '作息管家 查询与浏览',
      title: '今天总结',
      subtitle: date + ' 这一天的作息在这儿，一共 ' + view.total + ' 块记录。',
    },
    cells: cellsOf(records),
    order: L1_ORDER,
    // 结论条＝两句整话：这一天的读数 ＋（今天并且还没记完时）「还没过完」那句。**不用分号堆**。
    conclusion: '这一天记了 ' + view.total + ' 块，覆盖 ' + fmtDurShort(view.coverage) + '，健康分 '
      + view.score + '。投入最多的是「' + top + '」' + fmtDurShort(byL1[top] ?? 0) + '，睡眠合计 '
      + fmtDurShort(sleep.all) + '。' + partialSentenceOf(view.coverage, opts.nowMinutes),
    facts: [
      { label: '记录块数', value: String(view.total) + ' 块' },
      { label: '覆盖时长', value: fmtDurShort(view.coverage) },
      { label: '健康分', value: String(view.score) },
      { label: '睡眠＋午睡', value: fmtDurShort(sleep.all) },
    ],
    timeline: timelineRowsOf(records),
    sleep: [
      { label: '夜间睡眠', value: fmtDurShort(sleep.night) },
      { label: '午睡', value: fmtDurShort(sleep.all - sleep.night) },
      { label: '合计', value: fmtDurShort(sleep.all), tone: sleep.all >= 420 ? 'ok' : 'warn' },
      ...(longest === undefined ? [] : [{ label: '最长一块', value: longest.activity }]),
    ],
    distribution: ranked.map((key) => ({
      label: key,
      value: fmtDurShort(byL1[key]),
      pct: fmtPct(byL1[key], view.coverage),
    })),
    copy: {
      key: 'schedule.record.today',
      payload: view,
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.today --params {"date":"' + date + '"}',
        source: '作息记录表（' + records.length + ' 行）',
        actionAt: scheduleNowStamp(),
      }),
    },
    ...(opts.status === undefined ? {} : { status: statusBlockOf(opts.status) }),
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
      // 文档标题走「技能名 空格 页名」（与 #784／本票另两张页同口径）：`·` 是分隔符门（#516）
      // 名点的并列分隔符，而 `<title>` 是**可见文本节点**（head 区）——周视图这张页此前没走过那道门，
      // #785 把它接入真出口之后当场命中，故这里改成空格（件序列与页身一字未动）。
      docTitle: '作息管家 周视图',
      eyebrow: '作息管家 查询与浏览',
      title: '周视图',
      subtitle: start + ' 至 ' + end + ' 这一周，一共 ' + records.length + ' 块记录。',
    },
    kpis: [
      { label: '总时长', value: fmtDurShort(total), detail: records.length + ' 块记录' },
      { label: '日均', value: fmtDurShort(Math.round(total / Math.max(activeDays, 1))), detail: '有记录 ' + activeDays + ' 天' },
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
      key: 'schedule.record.range',
      payload: buildRecordRange(start, end, [...records]),
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.range --params {"view":"week","date":"' + start + '"}',
        source: '作息记录表（这一周 ' + records.length + ' 行）',
        actionAt: scheduleNowStamp(),
      }),
    },
  };
  return renderWeekPage(data);
}

/* ══════════════════════ #785 · 区间汇总（f02）／24h 概览多日（f11） ══════════════════════ */

/** 7 个健康维度的权威顺序（＝ `HEALTH_TARGETS` 的键序：维持／健康／工作／学习／调整／日常／投入。
 *  「创作不参评」是老侧健康分口径的一部分，所以这 7 个里没有创作）。 */
const DIM_ORDER: readonly string[] = Object.keys(HEALTH_TARGETS);

/** 日期串 → 当天的本地 `Date`（只在周窗口换算这种纯日期算术上用，不参与取数）。 */
function dateOf(date: string): Date {
  return new Date(date + 'T00:00:00');
}

/** 那一天是周几（周一起始，与 `policy` 的周口径同源）。 */
function weekdayLabelOf(date: string): string {
  return WEEKDAY_LABELS[(dateOf(date).getDay() + 6) % 7];
}

/** 「这一周」的七个日期：锚点那天所在周的周一至周日，顺序即矩阵行序。
 *
 *  周口径**不另写一份**：走 `policy` 的 `relativeToRange('本周')`（周一起始）＋ `recentNDays(7)`，
 *  末尾一处自洽断言——口径若哪天改了而这里没跟，当场抛，不静默漂移。 */
export function weekDatesOf(anchor: string): string[] {
  const { start, end } = relativeToRange('本周', dateOf(anchor));
  const last7 = recentNDays(7, dateOf(end));
  if (last7.start !== start || last7.end !== end) {
    throw new Error('周窗口口径不一致：本周＝' + start + ' 至 ' + end + '，最近七天＝' + last7.start + ' 至 ' + last7.end);
  }
  const y = Number(start.slice(0, 4));
  const m = Number(start.slice(5, 7));
  const d = Number(start.slice(8, 10));
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const at = new Date(y, m - 1, d + i);
    days.push(at.getFullYear() + '-' + String(at.getMonth() + 1).padStart(2, '0')
      + '-' + String(at.getDate()).padStart(2, '0'));
  }
  return days;
}

/** 逐日 × 逐维的分钟数：7 维趋势的原料（一天一个点，一维一条线）。 */
function dailyDimMinutes(
  records: readonly ScheduleRecord[],
  days: readonly string[],
): { readonly byDay: Record<string, Record<string, number>>; readonly byDim: Record<string, number> } {
  const byDay: Record<string, Record<string, number>> = {};
  for (const day of days) byDay[day] = {};
  const byDim: Record<string, number> = {};
  for (const r of records) {
    const dim = l1Of(r.category);
    const mins = r.duration_minutes ?? 0;
    (byDay[r.date] ??= {})[dim] = ((byDay[r.date] ?? {})[dim] ?? 0) + mins;
    byDim[dim] = (byDim[dim] ?? 0) + mins;
  }
  return { byDay, byDim };
}

/** 「区间汇总」整页（老侧 f02「作息记录·区间」）。
 *
 *  三块必现块：**分类聚合**（一级分类的时长与占比，标签是**人话的一级分类名**——老侧那页与旧模板
 *  印的是原始键，本票起印分类名）、**7 维趋势**（多日＝7 条折线，单日＝7 根柱：只有一天没有趋势可言）、
 *  **睡眠统计**（夜间睡眠／午睡／合计）。
 *
 *  载荷不动：本函数只出 HTML，`data.metrics` 仍是 `render/views.ts` 的 `buildRecordRange` 那份
 *  （`l1.工作` 这类键是载荷口径，不是页面文案）。 */
export function renderRangeSummaryPage(
  records: readonly ScheduleRecord[],
  start: string,
  end: string,
): string {
  const days = [...new Set(records.map((r) => r.date))].sort();
  const dayCount = Math.max(days.length, 1);
  const { byDay, byDim } = dailyDimMinutes(records, days);
  const total = records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const { score } = computeHealthScore(byDim);
  const ranked = Object.keys(byDim).sort((a, b) => byDim[b] - byDim[a]);
  const sleep = sleepOf(records);
  const perDay = (date: string): { readonly blocks: number; readonly minutes: number } => {
    const rows = records.filter((r) => r.date === date);
    return { blocks: rows.length, minutes: rows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0) };
  };
  const trendInput = days.length >= 2
    ? {
      kind: 'line' as const,
      input: {
        // 折线的横轴点位（`items` 只供轴标签与缺省单序列用，本页 7 条序列由 `series` 给）。
        items: days.map((day) => ({ label: day.slice(5), value: 0 })),
        options: {
          series: DIM_ORDER.map((dim) => ({
            name: dim,
            color: categoryColor(dim, L1_ORDER),
            items: days.map((day) => ({ label: day.slice(5), value: (byDay[day] ?? {})[dim] ?? 0 })),
          })),
          legend: true,
          height: 180,
          labels: 'select' as const,
          showValues: false as const,
        },
      },
    }
    : {
      kind: 'bar' as const,
      input: {
        items: DIM_ORDER.map((dim) => ({
          label: dim,
          value: (byDay[days[0]] ?? {})[dim] ?? 0,
          color: categoryColor(dim, L1_ORDER),
        })),
        options: { height: 180, singleColor: false, showValues: true as const },
      },
    };
  const top = ranked[0];
  return renderRangePage({
    head: {
      docTitle: '作息管家 汇总作息',
      eyebrow: '作息管家 查询与浏览',
      title: '汇总作息',
      subtitle: start + ' 至 ' + end + ' 这一段的作息在这儿，一共 ' + records.length + ' 块记录。',
    },
    kpis: [
      { label: '覆盖天数', value: String(days.length), unit: '天', detail: start + ' 至 ' + end },
      { label: '记录块数', value: String(records.length), unit: '块', detail: '日均 ' + Math.round(records.length / dayCount) + ' 块' },
      { label: '覆盖时长', value: fmtDurShort(total), detail: '日均 ' + fmtDurShort(Math.round(total / dayCount)) },
      { label: '健康分', value: String(score), bar: { pct: score }, detail: '七个维度取均（创作不参评）' },
    ],
    conclusion: '这一段记了 ' + records.length + ' 块，覆盖 ' + fmtDurShort(total) + '，健康分 ' + score
      + '。投入最多的是「' + (top ?? '—') + '」' + fmtDurShort(byDim[top] ?? 0) + '，睡眠合计 ' + fmtDurShort(sleep.all) + '。',
    distribution: ranked.map((key) => ({
      label: key,
      value: fmtDurShort(byDim[key]),
      pct: fmtPct(byDim[key], total),
    })),
    order: L1_ORDER,
    trend: trendInput,
    sleep: [
      { label: '夜间睡眠', value: fmtDurShort(sleep.night) },
      { label: '午睡', value: fmtDurShort(sleep.all - sleep.night) },
      { label: '合计', value: fmtDurShort(sleep.all), tone: sleep.all >= 420 ? 'ok' : 'warn' },
    ],
    daily: days.map((day) => {
      const got = perDay(day);
      return { left: day.slice(5) + ' ' + weekdayLabelOf(day), main: got.blocks + ' 块', right: fmtDurShort(got.minutes) };
    }),
    copy: {
      key: 'schedule.record.range',
      payload: buildRecordRange(start, end, [...records]),
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.range --params {"start":"' + start + '","end":"' + end + '"}',
        source: '作息记录表（' + records.length + ' 行）',
        actionAt: scheduleNowStamp(),
      }),
    },
  });
}

/** 「24h 概览（多日）」整页（老侧 f11「查日程（多日 24h 概览）」）。
 *
 *  这一支的画法照载荷本身的形状走：`hours[]` 每格 24 个桶（空桶的文案是口径自己给的「未规划」）、
 *  同小时多条已由口径并成一串 ⇒ 页上**同小时合并**与**多日聚合**两块必现块都看得见；
 *  口径行明说这一档丢了备注／完成状态与飞书同步状态（要看全字段走「查日程」）。
 *
 *  单日与多日同一套件序列（一天＝表一行 ＋ 24 格一段），形状不随数据多寡变形。 */
export function renderPlanOverviewPage(payload: PlanOverviewPayload): string {
  const days = payload.items;
  const dayCount = Math.max(days.length, 1);
  const plannedTotal = days.reduce((sum, day) => sum + day.plannedHours, 0);
  const emptyTotal = 24 * dayCount - plannedTotal;
  const fullest = [...days].sort((a, b) => b.plannedHours - a.plannedHours)[0];
  const stamp = (value: string | null): string => (value === null ? '无' : value.slice(5, 16).replace('T', ' '));
  const single = days.length === 1;
  const span = single ? days[0].date : days[0].date + ' 至 ' + days[days.length - 1].date;
  return renderOverviewPage({
    head: {
      docTitle: '作息管家 ' + (single ? '24h 概览' : '查多日计划'),
      eyebrow: '作息管家 查询与浏览',
      title: single ? '24h 概览' : '查多日计划',
      subtitle: single
        ? days[0].date + ' 这一天 24 格长什么样，已经排了 ' + plannedTotal + ' 格。'
        : span + ' 这几天每天 24 格长什么样，一共排了 ' + plannedTotal + ' 格。',
    },
    kpis: [
      { label: '天数', value: String(days.length), unit: '天', detail: span },
      { label: '已排格数', value: String(plannedTotal), unit: '格', detail: '一共 ' + 24 * dayCount + ' 格里' },
      { label: '空白格数', value: String(emptyTotal), unit: '格', detail: '没有安排的小时' },
      { label: '排得最满', value: fullest === undefined ? '—' : fullest.date.slice(5), detail: fullest === undefined ? '无' : fullest.plannedHours + ' 格' },
    ],
    conclusion: '这 ' + days.length + ' 天里 24 格排了 ' + plannedTotal + ' 格，空着 ' + emptyTotal + ' 格。'
      + (fullest === undefined
        ? '没有任何安排。'
        : '排得最满的是 ' + fullest.date + '，有 ' + fullest.plannedHours + ' 格。'),
    caliber: '这一页是 24h 聚合视图：同一小时里的多条事件并成一格（并起来用加号连接），不含备注与完成状态，'
      + '也不含飞书同步状态。要看全字段请用「查日程」。',
    table: {
      columns: [
        { key: 'date', label: '日期' },
        { key: 'planned', label: '已排格数', align: 'right' },
        { key: 'empty', label: '空白格数', align: 'right' },
        { key: 'created', label: '首建' },
        { key: 'updated', label: '末改' },
      ],
      rows: days.map((day) => ({
        date: day.date + ' ' + weekdayLabelOf(day.date),
        planned: day.plannedHours + ' 格',
        empty: (24 - day.plannedHours) + ' 格',
        created: stamp(day.createdAt),
        updated: stamp(day.updatedAt),
      })),
      caption: '多日概览：一天一行',
    },
    days: days.map((day) => ({
      title: weekdayLabelOf(day.date) + ' ' + day.date + ' 已排 ' + day.plannedHours + ' 格',
      rows: day.hours.map((hour) => ({
        left: String(hour.hour).padStart(2, '0') + ':00',
        main: hour.text,
      })),
      footnote: '首建 ' + stamp(day.createdAt) + '，末改 ' + stamp(day.updatedAt),
    })),
    copy: {
      key: 'schedule.plan.today',
      payload,
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.plan.today --params {"view":"aggregate","dates":["'
          + days.map((day) => day.date).join('","') + '"]}',
        source: '日程事件表（' + days.length + ' 天聚合）',
        actionAt: scheduleNowStamp(),
      }),
    },
  });
}

/* ══════════════════════ #786 · 作息详情（f06）／按 ID 查记录 ══════════════════════ */

/** 一条记录在页上的字段：**老侧 `render_records_detail` 写的那 11 个**（它的「100% 字段暴露原则」
 *  ／票面必现块「每条 11 字段全展开」）——其中 `analysis_reasoning` 走它自己那一段的正文（全文，
 *  不截断），另外十个落这条事实条。字段名照老侧页面那几格（消息原文／消息时间戳是它取的名字）。
 *
 *  缺失一律写「无」，不留空格子、也不编一个值出来（`source_contents`／`source_timestamps`
 *  在库里多为空——老侧渲染时 `or '（无）'`，本件写「无」）。 */
function detailFieldsOf(record: ScheduleRecord): { readonly label: string; readonly value: string }[] {
  const stamp = (value: string): string => (value === '' ? '无' : value.slice(0, 16).replace('T', ' '));
  const text = (value: string | null): string => (value === null || value === '' ? '无' : value);
  return [
    { label: '记录号', value: String(record.id) },
    { label: '日期', value: record.date },
    { label: '开始', value: record.time_start },
    { label: '结束', value: record.time_end },
    { label: '时长', value: fmtDur(record.duration_minutes ?? 0) },
    { label: '活动', value: record.activity },
    { label: '分类', value: record.category },
    { label: '消息原文', value: text(record.source_contents) },
    { label: '消息时间戳', value: text(record.source_timestamps) },
    { label: '创建时间', value: stamp(record.created_at) },
  ];
}

/** 一条记录的段名（页上那一段的标题）：记录号 ＋ 日期 ＋ 起止 ＋ 做什么。 */
function detailTitleOf(record: ScheduleRecord): string {
  return '记录号 ' + record.id + '：' + record.date + ' ' + timeRangeOf(record.time_start, record.time_end)
    + ' ' + record.activity;
}

/** 同一条记录在**页内目录**里的短名（#891）：只留记录号那一截，跳转仍落在同一段上。
 *  与段名同住一处，两处写法不会走散（段名改了这里跟着改）。 */
function detailNavOf(record: ScheduleRecord): string {
  return '记录号 ' + record.id;
}

/** 「作息详情」整页（形状＝`shared/detailPage.ts`；老侧 f06 的两个必现块都在）。
 *
 *  `opts.date`＝这一趟查的那一天（页头与结论文案用）；`opts.pickedId`＝按 ID 查时点名的记录号
 *  （给了它，结论条就写成「这一条」的说法）。按日查与按 ID 查**同一套件序列**。
 *
 *  载荷不动：本函数只出 HTML，`data.item` 仍是 `render/views.ts` 的 `buildRecordDetail` 那份
 *  （按日查的载荷是 `buildRecordDetail(records[0])`，与 #784 之前逐字同）。 */
export function renderRecordDetailPage(
  records: readonly ScheduleRecord[],
  opts: { readonly date: string; readonly pickedId?: number },
): string {
  const total = records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const withReasoning = records.filter((r) => (r.analysis_reasoning ?? '') !== '').length;
  const dims = [...new Set(records.map((r) => l1Of(r.category)))].sort();
  const ranked = dims
    .map((dim) => ({ dim, minutes: records.filter((r) => l1Of(r.category) === dim).reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0) }))
    .sort((a, b) => b.minutes - a.minutes);
  const picked = opts.pickedId === undefined ? undefined : records.find((r) => r.id === opts.pickedId);
  const reasoningClause = withReasoning === 0
    ? '这一批记录都没有留 AI 推理链。'
    : (withReasoning === records.length ? '每一条都留着 AI 推理链。' : '其中 ' + withReasoning + ' 条留着 AI 推理链。');
  const items: RecordDetailItem[] = records.map((r) => ({
    title: detailTitleOf(r),
    // 页内目录的条目文本（#891）：只写记录号那一截（日期／起止／活动留在大段名上）。
    navText: detailNavOf(r),
    fields: detailFieldsOf(r),
    // 空的写「（无）」（老侧页同一个写法）：这一块**恒在**，11 个字段一个不少。
    reasoning: (r.analysis_reasoning ?? '') === '' ? '（无）' : (r.analysis_reasoning ?? ''),
  }));
  const spanLine = records.length === 0
    ? opts.date + ' 这一天没有记录。'
    : records[0].time_start + ' 至 ' + records[records.length - 1].time_end;
  const conclusion = picked === undefined
    ? opts.date + ' 这一天有 ' + records.length + ' 条记录，覆盖 ' + fmtDurShort(total) + '。' + reasoningClause
      + '11 个字段逐条展开在这一页上，一条也不折叠。'
    : '记录号 ' + picked.id + ' 这一条：' + picked.date + ' ' + timeRangeOf(picked.time_start, picked.time_end)
      + ' ' + picked.activity + '，时长 ' + fmtDurShort(picked.duration_minutes ?? 0) + '。'
      + '11 个字段全展开在这一页上，'
      + ((picked.analysis_reasoning ?? '') === '' ? '这一条没有留 AI 推理链。' : 'AI 推理链也照全文摆出来。');
  return renderDetailPage({
    head: {
      docTitle: '作息管家 作息详情',
      eyebrow: '作息管家 查询与浏览',
      title: '作息详情',
      subtitle: picked === undefined
        ? opts.date + ' 这一天 ' + records.length + ' 条记录，字段逐条展开。'
        : '记录号 ' + picked.id + ' 这一条，字段逐条展开。',
    },
    kpis: [
      { label: '记录条数', value: String(records.length), unit: '条', detail: spanLine },
      { label: '覆盖时长', value: fmtDurShort(total), detail: ranked.length === 0 ? '无分类' : '投入最多 ' + ranked[0].dim },
      { label: '带 AI 推理链', value: String(withReasoning), unit: '条', detail: reasoningClause },
      { label: '覆盖一级分类', value: String(dims.length), unit: '类', detail: ranked.length === 0 ? '无' : ranked.map((r) => r.dim).join(' ') },
    ],
    conclusion,
    records: items,
    copy: {
      key: 'schedule.record.detail',
      payload: records.length === 0 ? { item: {} } : buildRecordDetail(records[0]),
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.detail --params '
          + (opts.pickedId === undefined ? '{"date":"' + opts.date + '"}' : '{"id":' + String(opts.pickedId) + '}'),
        source: '作息记录表（' + records.length + ' 行，11 字段全展开）',
        actionAt: scheduleNowStamp(),
      }),
    },
  });
}
