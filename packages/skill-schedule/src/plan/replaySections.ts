/** #788 · 「复盘」一体页的**区块装配**（老侧 `schedule_replay.html` 的四档区块路由，逐档照搬）。
 *
 *  档与区块的对应（口径在 `replayDocs.ts` 的件头，这里只摆件）：
 *
 *    day   计划 vs 实际对照 → 实际作息 → 计划执行 → 跨域对比 → 健康分 → 亮点与问题（缺计划另有补齐引导）
 *    week  7 维趋势 → 24h × N 天热力图 → 健康分 → 亮点与问题
 *    month 月度聚合 → 环比对比 → 目标达成 → 健康分 → 亮点与问题
 *    通用   实际作息 → 计划执行 → 跨域对比 → 亮点与问题
 *    全档   4 卡读数 ＋ 结论条 ＋ 页尾「复盘到明天的衔接」＋ 复制区
 *
 *  **样式纪律（本票的代码层窄判据）**：本件一行 CSS 都不写（样式只住族级样式件 `planParts.ts`），
 *  件全靠公共层区块；段名走 `planParts.renderSectionTitle`（它复用公共层段名类，不新造）。
 *
 *  **页上文案纪律**：不出现命令键、库列名、参数名、票号；并列关系用表格列与区块表达，不拿
 *  `·`／`；`／`｜`／`、`／`~` 顶替（那是分隔符门 #516 点名的那几种）；范围一律写「至」。
 */
import {
  renderCaliberLine, renderChartBlock, renderConclusionBar, renderDataTable,
  renderDisclosure, renderDistributionRows, renderFeedbackBlock, renderKpiGrid, renderListRows,
  renderPreBlock, type DataTableRow, type DistributionRowInput, type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import { LEVEL1_WHITELIST, fmtDur, fmtDurShort, fmtPct, l1Of, type Anomaly } from '../policy/index.js';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { categoryColor, hourCellsOf, renderHeatMatrix, renderHourBand, type HeatRow } from '../shared/pageParts.js';
import { minutesOfDayEnd } from './planDocs.js';
import { HEAT_DAYS_CAP, LIST_ROWS_CAP, PAIR_ROWS_CAP, replayData, type ReplayData, type ReplayGranularity, type ReplayWindow } from './replayDocs.js';
import { renderGoalCards, renderSectionTitle } from './planParts.js';
import { planCopyArea } from './receipt.js';
import type { ScheduleDb } from '../fetch/db.js';

const EYEBROW = '作息管家 日程与计划';
/** 一级分类的权威顺序（配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];
/** 健康分那七维的顺序（＝ `HEALTH_TARGETS` 的键序，见 `policy`）。 */
const DIM_ORDER: readonly string[] = ['维持', '健康', '工作', '学习', '调整', '日常', '投入'];
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const GRAN_CN: Record<ReplayGranularity, string> = { day: '今日', week: '本周', month: '本月', range: '区间' };

const span = (start: string, end: string): string => start + ' 至 ' + end;
const weekdayOf = (date: string): string => WEEKDAYS[(new Date(date + 'T00:00:00').getDay() + 6) % 7];
const pctText = (value: number | null): string => (value === null ? '—' : String(value) + '%');
const minutesOf = minutesOfDayEnd;

/* ─────────────────────────── 各区块 ─────────────────────────── */

/** 计划 vs 实际对照（老侧 day 档的第一段）：逐条计划一行，计划时长与实际时长并排。
 *  通用档（跨了月）只印头几条：逐条那一段是给单日／短区间看的，长区间的账走聚合那几块。 */
function segPlanActual(data: ReplayData, withDate: boolean, capped: boolean): string {
  const cap = capped ? PAIR_ROWS_CAP : data.cross.pairs.length;
  const rows: DataTableRow[] = data.cross.pairs.slice(0, cap).map((p) => {
    const sign = p.deltaMinutes >= 0 ? '+' : '−';
    return {
      ...(withDate ? { date: p.date.slice(5) } : {}),
      time: p.time,
      title: p.title,
      plan: fmtDurShort(p.planMinutes),
      actual: fmtDurShort(p.actualMinutes),
      delta: sign + fmtDurShort(Math.abs(p.deltaMinutes)),
      completion: p.completion,
    };
  });
  const columns = [
    ...(withDate ? [{ key: 'date', label: '日期' }] : []),
    { key: 'time', label: '时段' },
    { key: 'title', label: '计划' },
    { key: 'plan', label: '计划时长' },
    { key: 'actual', label: '实际时长' },
    { key: 'delta', label: '差值' },
    { key: 'completion', label: '完成状态' },
  ];
  const rest = data.cross.pairs.length - rows.length;
  return renderSectionTitle('计划 vs 实际对照')
    + renderDataTable({
      columns, rows,
      emptyText: data.plans.length === 0
        ? '这一段没有日程计划，无从对照'
        : '这一段排了计划，但每一条的时段里都没有作息记录',
    })
    + (rest <= 0 ? '' : '<p class="sch-pl-note">计划与记录相交的一共 ' + String(data.cross.pairs.length)
      + ' 条，这里印的是头 ' + String(rows.length) + ' 条，另有 ' + String(rest) + ' 条。</p>')
    + renderCaliberLine('实际时长按记录与计划时段相交的部分累加，同一时段记了多条就一起算进去');
}

/** 实际作息（老侧 day／month／通用档的第一段）：分类聚合分布行；单日另给 24 小时色带。 */
function segRecord(data: ReplayData): string {
  const ranked = Object.keys(data.byL1).sort((a, b) => (data.byL1[b] ?? 0) - (data.byL1[a] ?? 0));
  const distribution: readonly DistributionRowInput[] = ranked.map((name) => ({
    label: name,
    value: fmtDurShort(data.byL1[name]),
    pct: fmtPct(data.byL1[name], data.totalMinutes),
    color: categoryColor(name, L1_ORDER),
  }));
  const band = data.win.effective !== 'day' ? '' : renderHourBand(
    hourCellsOf(data.records.map((r) => ({
      start: minutesOf(r.time_start), end: minutesOf(r.time_end), key: l1Of(r.category),
    }))),
    { order: L1_ORDER, title: '这一天的 24 小时', height: 120 },
  );
  return renderSectionTitle('实际作息') + band + renderSectionTitle('分类聚合')
    + renderDistributionRows({ rows: distribution });
}

/** 7 维趋势（老侧 week／通用档）：一维一条折线，一天一个点。 */
function segTrend(data: ReplayData): string {
  const days = data.days.filter((d) => d.records.length > 0);
  if (days.length < 2) return '';
  const labels = days.map((d) => d.date.slice(5));
  return renderChartBlock({
    kind: 'line',
    title: '7 维趋势',
    input: {
      items: labels.map((label) => ({ label, value: 0 })),
      options: {
        series: DIM_ORDER.map((dim) => ({
          name: dim,
          color: categoryColor(dim, L1_ORDER),
          items: days.map((d, i) => ({ label: labels[i], value: d.byL1[dim] ?? 0 })),
        })),
        legend: true, height: 190, labels: 'select' as const, showValues: false as const,
      },
    },
  });
}

/** 24h × N 天热力图（老侧 week／通用档）：一行一天，行尾当日合计。
 *  通用档只印最近那几天（上界见 `replayDocs.HEAT_DAYS_CAP`，口径行里写明）。 */
function segHeat(data: ReplayData): string {
  const all = data.days;
  const days = data.win.effective === 'week' ? all : all.filter((d) => d.records.length > 0);
  if (days.length === 0) return '';
  const capped = days.length > HEAT_DAYS_CAP ? days.slice(days.length - HEAT_DAYS_CAP) : days;
  const rows: HeatRow[] = capped.map((d) => ({
    label: weekdayOf(d.date),
    date: d.date,
    cells: hourCellsOf(d.records.map((r) => ({
      start: minutesOf(r.time_start), end: minutesOf(r.time_end), key: l1Of(r.category),
    }))),
    sum: d.minutes > 0 ? fmtDurShort(d.minutes) : '无记录',
  }));
  return renderHeatMatrix(rows, {
    order: L1_ORDER, id: 'replay-heat', title: '24h × N 天热力图', legend: true, withTotal: true,
  }) + (capped.length === days.length ? ''
    : renderCaliberLine('这一段跨了 ' + String(days.length) + ' 天，热力图只印最近 ' + String(capped.length)
      + ' 天，整段的读数看上面的分类聚合与 7 维趋势'));
}

/** 计划执行（老侧 day／月／通用档）：六态分布 ＋ 按一级分类拆解。 */
function segPlan(data: ReplayData): string {
  const counts = data.completionCounts.map((c) => ({ state: c.state, count: String(c.count) }));
  const byCat: DataTableRow[] = data.completionByL1.map((c) => ({
    name: c.name, total: String(c.total), done: String(c.done), rate: pctText(c.rate),
  }));
  return renderSectionTitle('计划执行')
    + '<p class="sch-pl-note">这一段排了 ' + String(data.plans.length) + ' 条计划，其中 '
      + String(data.marked) + ' 条标过完成状态，完成率 ' + pctText(data.completionRate)
      + '（分母是标过的那些，还没标的不算输）。</p>'
    + renderDataTable({
      caption: '完成状态分布',
      columns: [{ key: 'state', label: '完成状态' }, { key: 'count', label: '件数', align: 'right' }],
      rows: counts,
      emptyText: '这一段没有计划',
    })
    + renderDataTable({
      caption: '按分类拆解',
      columns: [
        { key: 'name', label: '分类' }, { key: 'total', label: '件数', align: 'right' },
        { key: 'done', label: '已完成', align: 'right' }, { key: 'rate', label: '完成率', align: 'right' },
      ],
      rows: byCat,
      emptyText: '这一段没有计划',
    });
}

/** 跨域对比（老侧 day／通用档）：未执行、超计划、计划外记录三张清单。
 *  `aggregate`（通用档跨了月）＝逐条那几张只给头几条并写明另有几条，计划外那一张改成按一级分类聚合。 */
function segCross(data: ReplayData, withDate: boolean, aggregate: boolean): string {
  const tag = (date: string): string => (withDate ? date.slice(5) + ' ' : '');
  const limited = <T,>(rows: readonly T[]): { readonly rows: readonly T[]; readonly rest: number } =>
    (aggregate ? { rows: rows.slice(0, LIST_ROWS_CAP), rest: Math.max(0, rows.length - LIST_ROWS_CAP) } : { rows, rest: 0 });
  const u = limited(data.cross.unexecuted);
  const o = limited(data.cross.overrun);
  const unexecuted = u.rows.map((p) => ({
    left: tag(p.date) + p.time_start + ' 至 ' + p.time_end,
    main: p.title,
    right: p.completion === null || p.completion === '' ? '未复盘' : p.completion,
  }));
  const overrun = o.rows.map((x) => ({
    left: tag(x.date),
    main: x.title,
    right: '时段外多花了 ' + fmtDurShort(x.spillMinutes),
  }));
  const unexpectedRows = data.cross.unexpected.map((r) => ({
    left: tag(r.date) + r.time_start + ' 至 ' + r.time_end,
    main: r.activity,
    right: l1Of(r.category),
  }));
  const byCat: Record<string, number> = {};
  for (const r of data.cross.unexpected) byCat[l1Of(r.category)] = (byCat[l1Of(r.category)] ?? 0) + 1;
  const ranked = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  const unexpectedHtml = aggregate
    ? renderDistributionRows({
      rows: ranked.map((name) => ({
        label: name, value: String(byCat[name]) + ' 块', pct: fmtPct(byCat[name], data.cross.unexpected.length),
        color: categoryColor(name, L1_ORDER),
      })),
    }) + (data.cross.unexpected.length === 0 ? '' : '<p class="sch-pl-note">计划外记录一共 '
      + String(data.cross.unexpected.length) + ' 块，这里按一级分类聚着看，另有 '
      + String(limited(data.cross.unexpected).rest) + ' 块没逐条印。</p>')
    : renderListRows({ items: limited(unexpectedRows).rows, emptyText: '这一段的记录都落在某条计划的时段里' });
  const restLine = (n: number): string => (n === 0 ? '' : '<p class="sch-pl-note">另有 ' + String(n) + ' 条没印出来。</p>');
  return renderSectionTitle('跨域对比')
    + renderCaliberLine('计划外＝这天没有任何计划与它时段相交的记录。溢出＝与计划搭边的记录里，落在计划时段之外的那部分合计到了计划时长的两成以上。')
    + renderDisclosure({
      title: '没做成的计划',
      open: true,
      contentHtml: renderListRows({ items: unexecuted, emptyText: '这一段没有「部分完成」与「未完成」的计划' }) + restLine(u.rest),
    })
    + renderDisclosure({
      title: '时段溢出',
      open: true,
      contentHtml: renderListRows({ items: overrun, emptyText: '这一段没有明显溢出计划时段的记录' }) + restLine(o.rest),
    })
    + renderDisclosure({
      title: '计划之外的记录',
      open: true,
      contentHtml: unexpectedHtml,
    });
}

/** 健康分（全档）：单日给当天分，多日给均值与逐日曲线，七维明细逐条给。 */
function segHealth(data: ReplayData): string {
  const single = data.win.effective === 'day';
  const dims: readonly DistributionRowInput[] = DIM_ORDER.map((dim) => ({
    label: dim,
    value: String(data.dimScores[dim] ?? 0),
    pct: data.dimScores[dim] ?? 0,
    color: categoryColor(dim, L1_ORDER),
  }));
  const series = data.healthSeries;
  const chart = series.length < 2 ? '' : renderChartBlock({
    kind: 'line',
    title: '逐日健康分',
    input: {
      items: series.map((h) => ({ label: h.date.slice(5), value: h.score })),
      options: { height: 170, labels: 'select' as const, showValues: false as const },
    },
  });
  return renderSectionTitle('健康分')
    + renderFactStrip({
      items: single
        ? [{ label: '这一天', value: String(data.healthScore) }]
        : [
          { label: '均值', value: String(data.healthMean) },
          { label: '有记录的天数', value: String(data.activeDays) + ' 天' },
          { label: '最高的一天', value: series.length === 0 ? '—' : String(Math.max(...series.map((h) => h.score))) },
          { label: '最低的一天', value: series.length === 0 ? '—' : String(Math.min(...series.map((h) => h.score))) },
        ],
    })
    + chart
    + renderCaliberLine('七个维度各自按目标时长给分再取均（创作不参评），单日与整段都是这一条算式')
    + renderDistributionRows({ rows: dims });
}

/** 环比对比（老侧 month 档）：本月与上月同期逐分类并排。 */
function segMonthCompare(data: ReplayData): string {
  const rows: DataTableRow[] = data.monthCompare.map((m) => ({
    name: m.name,
    cur: fmtDurShort(m.cur),
    prev: fmtDurShort(m.prev),
    delta: m.deltaPct === null ? '上月没有' : (m.deltaPct >= 0 ? '+' : '−') + String(Math.abs(m.deltaPct)) + '%',
  }));
  const rate = data.monthRateCompare;
  return renderSectionTitle('环比对比')
    + '<p class="sch-pl-note">对照窗口是 ' + span(data.prevSpan.start, data.prevSpan.end)
      + '（起止各往前挪一个自然月）。</p>'
    + renderDataTable({
      columns: [
        { key: 'name', label: '分类' }, { key: 'cur', label: '本月', align: 'right' },
        { key: 'prev', label: '上月同期', align: 'right' }, { key: 'delta', label: '环比', align: 'right' },
      ],
      rows,
      emptyText: '本月与上月同期都没有记录',
    })
    + (rate === null ? '' : '<p class="sch-pl-note">计划完成率：本月 ' + String(rate.cur) + '%，上月同期 '
      + String(rate.prev) + '%，差 ' + (rate.deltaPct >= 0 ? '+' : '−') + String(Math.abs(rate.deltaPct)) + ' 个百分点。</p>');
}

/** 目标达成（老侧 month 档）：完成率、维持（睡眠）占比、记录覆盖三格。 */
function segGoals(data: ReplayData): string {
  const maintain = data.byL1['维持'] ?? 0;
  const lastDay = data.win.end;
  return renderSectionTitle('目标达成')
    + renderGoalCards([
      {
        label: '计划完成率',
        value: pctText(data.completionRate),
        hint: '已完成 ' + String(data.plans.filter((p) => p.completion === '已完成').length) + ' 条，这一段一共排了 '
          + String(data.plans.length) + ' 条，标过完成状态的有 ' + String(data.marked) + ' 条',
      },
      {
        label: '维持占比',
        value: String(fmtPct(maintain, data.totalMinutes)) + '%',
        hint: '维持（睡眠与起居那一类）共 ' + fmtDur(maintain) + '，目标是一天 10 小时',
      },
      {
        label: '记录覆盖',
        value: String(data.activeDays) + ' 天',
        hint: '本月至 ' + lastDay + ' 一共有记录的天数，日历天数是 ' + String(data.win.days) + ' 天',
      },
      {
        label: '健康分',
        value: String(data.healthScore),
        hint: '整段按七个维度取均，逐日曲线在下面那一段',
      },
    ]);
}

/** 亮点与问题（老侧那一段 AI 洞察的位置）：拿前一段等长区间做对照，红黄逐条点名。 */
function segInsights(data: ReplayData): string {
  const red = data.anomalies.filter((a) => a.level === 'red');
  const yellow = data.anomalies.filter((a) => a.level === 'yellow');
  const line = (a: Anomaly): string => {
    const arrow = a.deltaPct >= 0 ? '多了' : '少了';
    const pct = String(Math.abs(a.deltaPct));
    return a.dim + ' ' + arrow + ' ' + pct + '%（上一段 ' + fmtDurShort(a.prev) + '，这一段 ' + fmtDurShort(a.cur) + '）';
  };
  const none = data.anomalies.length === 0;
  return renderSectionTitle('亮点与问题')
    + renderFeedbackBlock({
      title: '与上一段比',
      toast: none
        ? {
          icon: 'ok',
          msg: '对照 ' + span(data.prevSpan.start, data.prevSpan.end)
            + '，这一段各维度的变化都在平常波动范围内（不到 10%）。',
        }
        : {
          icon: red.length > 0 ? 'warn' : 'info',
          msg: '对照 ' + span(data.prevSpan.start, data.prevSpan.end) + '：' + String(red.length)
            + ' 处变化超过 20%，' + String(yellow.length) + ' 处在 10% 到 20% 之间。',
          lines: [...red, ...yellow].slice(0, 6).map(line),
        },
      staticNotice: true,
    });
}

/** 缺计划补齐引导（老侧 day 档）：这一天没有计划可对照时给这一块，**不降级**成一句空话。 */
function segPlanGuide(data: ReplayData): string {
  if (data.win.effective !== 'day' || data.plans.length > 0) return '';
  return renderSectionTitle('缺计划补齐引导')
    + renderFeedbackBlock({
      title: '这一天还没有计划',
      toast: {
        icon: 'info',
        msg: '这一天没有日程计划，所以「计划 vs 实际对照」没有可比的对象。先把这一天的计划排出来，再回来看这一页。',
      },
      staticNotice: true,
    })
    + renderPreBlock({
      label: '先排计划就说这一句',
      command: '商量一下 ' + data.win.start + ' 这一天的计划',
      actionId: 'ilife-sch-replay-copy-plan',
      copyLabel: '复制这句话',
    });
}

/** 页尾那一段（全档）：复盘接计划（老侧跨场景约定 C）。 */
function segNext(data: ReplayData): string {
  return renderSectionTitle('复盘到明天的衔接')
    + '<p class="sch-pl-note">复盘看完了，下一步是给 ' + data.nextDay
      + ' 排日程：说「商量计划」或「规划明天」，也可以把下面这一句复制给 AI 接着走。</p>'
    + renderPreBlock({
      label: '下一步说这一句',
      command: '商量一下 ' + data.nextDay + ' 的计划',
      actionId: 'ilife-sch-replay-copy-next',
      copyLabel: '复制这句话',
    });
}

/* ─────────────────────────── 整页 ─────────────────────────── */

/** 各档的区块序列（本页档路由的唯一定义地，与 `replayDocs.ts` 的窗口路由分开住两处职能）。 */
function sectionsOf(data: ReplayData): string[] {
  const g = data.win.effective;
  const multi = data.win.days > 1;
  if (g === 'day') {
    return [segPlanActual(data, multi, false), segPlanGuide(data), segRecord(data), segPlan(data), segCross(data, multi, false), segHealth(data), segInsights(data)];
  }
  if (g === 'week') return [segTrend(data), segHeat(data), segHealth(data), segInsights(data)];
  if (g === 'month') return [segRecord(data), segMonthCompare(data), segGoals(data), segHealth(data), segInsights(data)];
  return [segRecord(data), segTrend(data), segHeat(data), segPlan(data), segPlanActual(data, multi, true), segCross(data, multi, true), segHealth(data), segInsights(data)];
}

function kpisOf(data: ReplayData): readonly KpiCardInput[] {
  const total = data.totalMinutes;
  const score = data.win.effective === 'day' ? data.healthScore : data.healthMean;
  return [
    { label: '总时长', value: fmtDurShort(total), detail: String(data.records.length) + ' 块记录' },
    {
      label: '记录天数', value: String(data.activeDays), unit: '天',
      detail: span(data.win.start, data.win.end) + ' 一共 ' + String(data.win.days) + ' 天',
    },
    {
      label: '完成率', value: pctText(data.completionRate),
      detail: data.plans.length === 0 ? '这一段没有计划' : '这一段排了 ' + String(data.plans.length) + ' 条计划',
      ...(data.completionRate === null ? {} : { bar: { pct: Math.min(100, Math.max(0, data.completionRate)) } }),
    },
    {
      label: '健康分', value: String(score),
      detail: data.win.effective === 'day' ? '单日七个维度取均' : '这一段逐日均值',
      bar: { pct: Math.min(100, Math.max(0, score)) },
    },
  ];
}

/** 复制区载荷（#887）：复盘四档共用这一支，都在 `schedule.plan.write` 上，形状是回执——
 *  数据位＝这一趟那句话，日志位＝这一趟的 2–6 段（口径只此一处，见 `receipt.ts` 的 `planCopyArea`）。 */
function copyOf(data: ReplayData): ScheduleCopyAreaInput {
  const g = data.win.effective;
  const ranked = Object.keys(data.byL1).sort((a, b) => (data.byL1[b] ?? 0) - (data.byL1[a] ?? 0));
  const lines = [
    '复盘' + GRAN_CN[g] + '：' + span(data.win.start, data.win.end) + '，' + String(data.win.days) + ' 天，记录 '
      + String(data.records.length) + ' 块共 ' + fmtDur(data.totalMinutes) + '，健康分 '
      + String(g === 'day' ? data.healthScore : data.healthMean),
    '计划 ' + String(data.plans.length) + ' 条，完成率 ' + pctText(data.completionRate),
    ...ranked.map((name) => name + ' ' + fmtDur(data.byL1[name])),
    ...data.anomalies.map((a) => a.dim + ' 比上一段 ' + (a.deltaPct >= 0 ? '+' : '') + String(a.deltaPct) + '%'),
  ];
  return planCopyArea({
    message: lines.join('，'),
    command: 'schedule-cmd-read schedule.plan.write --params {"op":"review","granularity":"' + g
      + '","start":"' + data.win.start + '","end":"' + data.win.end + '"}',
    source: '作息记录表 ' + String(data.records.length) + ' 行与日程计划表 ' + String(data.plans.length) + ' 行',
  });
}

/** 「复盘」一体页整页（四档共用这一支，区块按档取）。 */
export function replayPage(handle: ScheduleDb, win: ReplayWindow): string {
  const data = replayData(handle, win);
  const g = win.effective;
  const head: PageHead = {
    docTitle: '作息管家 复盘' + GRAN_CN[g],
    eyebrow: EYEBROW,
    title: '复盘' + GRAN_CN[g],
    subtitle: span(win.start, win.end) + ' 这一段：记录 ' + String(data.records.length) + ' 块，共 '
      + fmtDur(data.totalMinutes) + '。计划 ' + String(data.plans.length) + ' 条，完成率 '
      + pctText(data.completionRate) + '。'
      + (win.requested === 'range' && g !== 'range' ? '这一段的跨度是 ' + String(win.days) + ' 天，按' + GRAN_CN[g] + '档画。' : ''),
  };
  const content = [
    renderKpiGrid(kpisOf(data), { title: '这一段的总览' }),
    renderConclusionBar(conclusionOf(data)),
    ...sectionsOf(data),
    segNext(data),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-replay-copy-data',
      logActionId: 'ilife-sch-replay-copy-log',
      ...copyOf(data),
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content });
}

/** 结论条那一句：这一段干了什么、对照下来的结论是什么。 */
function conclusionOf(data: ReplayData): string {
  const g = data.win.effective;
  const top = Object.keys(data.byL1).sort((a, b) => (data.byL1[b] ?? 0) - (data.byL1[a] ?? 0))[0];
  const base = span(data.win.start, data.win.end) + ' 记了 ' + String(data.records.length) + ' 块，共 ' + fmtDur(data.totalMinutes) + '。';
  const plan = data.plans.length === 0 ? '这一段没有排计划。' : '排了 ' + String(data.plans.length) + ' 条计划，完成率 ' + pctText(data.completionRate) + '。';
  const cross = g !== 'day' ? '' : (data.cross.pairs.length === 0
    ? '计划与记录没有时段相交，对照表是空的。'
    : '计划与记录相交的有 ' + String(data.cross.pairs.length) + ' 条，计划之外另有 ' + String(data.cross.unexpected.length) + ' 块记录。');
  const health = (g === 'day' ? '这天健康分 ' + String(data.healthScore) : '这段健康分均值 ' + String(data.healthMean)) + '。';
  return base + plan + cross + (top === undefined ? '' : '投入最多的是「' + top + '」。') + health;
}
