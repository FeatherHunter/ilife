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
 */
import { LEVEL1_WHITELIST, computeHealthScore, fmtDur, fmtDurShort, fmtPct, l1Of, toMinutes } from '../policy/index.js';
import { buildRecordToday } from '../render/views.js';
import type { ScheduleRecord } from '../fetch/db.js';
import { hourCellsOf, type HeatRow, type HourCell } from '../shared/pageParts.js';
import { renderDayPage, type DayPageData } from '../shared/dayPage.js';
import { renderWeekPage, type WeekPageData } from '../shared/weekPage.js';
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
function cellsOf(records: readonly ScheduleRecord[]): HourCell[] {
  return hourCellsOf(records.map((r) => ({
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
      dataText: '【作息管家 · 今天总结】' + date
        + '（共 ' + view.total + ' 块 · 覆盖 ' + fmtDur(view.coverage) + ' · 健康分 ' + view.score + '）\n'
        + ranked.map((key) => key + '：' + fmtDur(byL1[key])).join('\n'),
      logText: '场景：今天总结 ｜ 日期：' + date + ' ｜ 数据来源：作息记录表（' + records.length + ' 行）',
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
      docTitle: '作息管家 · 周视图',
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
      dataText: '【作息管家 · 周视图】' + start + ' ~ ' + end
        + '（共 ' + records.length + ' 块 · 总时长 ' + fmtDur(total) + ' · 健康分 ' + score + '）\n'
        + ranked.map((key) => key + '：' + fmtDur(byL1[key])).join('\n'),
      logText: '场景：周视图 ｜ 区间：' + start + ' ~ ' + end + ' ｜ 数据来源：作息记录表（' + records.length + ' 行）',
    },
  };
  return renderWeekPage(data);
}
