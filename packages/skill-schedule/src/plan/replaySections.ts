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
import { HEALTH_TARGETS, LEVEL1_WHITELIST, completionLabelOf, fmtDur, fmtDurShort, fmtPct, l1Of, type Anomaly } from '../policy/index.js';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections, type PageSection } from '../shared/pageNav.js';
import { categoryColor, hourCellsOf, renderHeatMatrix, renderHourBand, type HeatRow } from '../shared/pageParts.js';
import { minutesOfDayEnd } from './planDocs.js';
import { HEAT_DAYS_CAP, LIST_ROWS_CAP, PAIR_ROWS_CAP, replayData, type ReplayData, type ReplayGranularity, type ReplayWindow } from './replayDocs.js';
import { renderGoalCards, renderSectionTitle } from './planParts.js';
import { planCopyArea } from './receipt.js';
import type { ScheduleDb } from '../fetch/db.js';
import { m } from '../entries/index.js';

/** 页眉（品牌＋域）。#1197：改成函数——`m()` 只在渲染期取词，模块级常量的初值会定死语言。 */
const eyebrowOf = (): string => m('skill-schedule.plan-replaySections.c001');
/** 一级分类的权威顺序（配色与图例都照它），定义只此一处：`policy` 的白名单。 */
const L1_ORDER: readonly string[] = [...LEVEL1_WHITELIST];
/** 健康分那七维的顺序（＝ `HEALTH_TARGETS` 的键序，见 `policy`）：键序即权威顺序，不另抄一份中文维度名（#1197）。 */
const DIM_ORDER: readonly string[] = Object.keys(HEALTH_TARGETS);

const span = (start: string, end: string): string => m('skill-schedule.plan-replaySections.c002', { p0: String(start), p1: String(end) });
const weekdayOf = (date: string): string =>
  [m('skill-schedule.plan-replaySections.c003'), m('skill-schedule.plan-replaySections.c004'), m('skill-schedule.plan-replaySections.c005'), m('skill-schedule.plan-replaySections.c006'), m('skill-schedule.plan-replaySections.c007'), m('skill-schedule.plan-replaySections.c008'), m('skill-schedule.plan-replaySections.c009')][(new Date(date + 'T00:00:00').getDay() + 6) % 7];
/** 四档在页上那一行的说法（一处定义）。同 `eyebrowOf`：#1197 起改函数。 */
const granCnOf = (g: ReplayGranularity): string => {
  const table: Record<ReplayGranularity, string> = { day: m('skill-schedule.plan-replaySections.c010'), week: m('skill-schedule.plan-replaySections.c011'), month: m('skill-schedule.plan-replaySections.c012'), range: m('skill-schedule.plan-replaySections.c013') };
  return table[g];
};
const pctText = (value: number | null): string => (value === null ? '—' : String(value) + '%');
const minutesOf = minutesOfDayEnd;

/* ─────────────────────────── 各区块 ─────────────────────────── */

/** 计划 vs 实际对照（老侧 day 档的第一段）：逐条计划一行，计划时长与实际时长并排。
 *  通用档（跨了月）只印头几条：逐条那一段是给单日／短区间看的，长区间的账走聚合那几块。 */
function segPlanActual(data: ReplayData, withDate: boolean, capped: boolean): PageSection[] {
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
      completion: completionLabelOf(p.completion),
    };
  });
  const columns = [
    ...(withDate ? [{ key: 'date', label: m('skill-schedule.plan-replaySections.c014') }] : []),
    { key: 'time', label: m('skill-schedule.plan-replaySections.c015') },
    { key: 'title', label: m('skill-schedule.plan-replaySections.c016') },
    { key: 'plan', label: m('skill-schedule.plan-replaySections.c017') },
    { key: 'actual', label: m('skill-schedule.plan-replaySections.c018') },
    { key: 'delta', label: m('skill-schedule.plan-replaySections.c019') },
    { key: 'completion', label: m('skill-schedule.plan-replaySections.c020') },
  ];
  const rest = data.cross.pairs.length - rows.length;
  return [{ navText: m('skill-schedule.plan-replaySections.c021'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c022'))
    + renderDataTable({
      columns, rows,
      emptyText: data.plans.length === 0
        ? m('skill-schedule.plan-replaySections.c023')
        : m('skill-schedule.plan-replaySections.c024'),
    })
    + (rest <= 0 ? '' : '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c146', {
      p0: String(data.cross.pairs.length), p1: String(rows.length), p2: String(rest),
    }) + '</p>')
    + renderCaliberLine(m('skill-schedule.plan-replaySections.c025')) }];
}

/** 实际作息（老侧 day／month／通用档的第一段）：分类聚合分布行；单日另给 24 小时色带。
 *  #891：这一段里有**两颗**段名（`实际作息`／`这一天的 24 小时`），故拆成两小节，
 *  另加第三小节 `分类聚合`——一节一条目录条目，件序列与顺序一处未动。 */
function segRecord(data: ReplayData): PageSection[] {
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
    { order: L1_ORDER, title: m('skill-schedule.plan-replaySections.c026'), height: 120 },
  );
  return [
    { navText: m('skill-schedule.plan-replaySections.c027'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c028')) },
    // 段名是「这一天的 24 小时」；目录项逐字用它。
    { navText: band === '' ? '' : m('skill-schedule.plan-replaySections.c029'), html: band },
    { navText: m('skill-schedule.plan-replaySections.c030'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c031')) + renderDistributionRows({ rows: distribution }) },
  ];
}

/** 7 维趋势（老侧 week／通用档）：一维一条折线，一天一个点。 */
function segTrend(data: ReplayData): PageSection[] {
  const days = data.days.filter((d) => d.records.length > 0);
  if (days.length < 2) return [];
  const labels = days.map((d) => d.date.slice(5));
  return [{ navText: m('skill-schedule.plan-replaySections.c032'), html: renderChartBlock({
    kind: 'line',
    title: m('skill-schedule.plan-replaySections.c033'),
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
  }) }];
}

/** 24h × N 天热力图（老侧 week／通用档）：一行一天，行尾当日合计。
 *  通用档只印最近那几天（上界见 `replayDocs.HEAT_DAYS_CAP`，口径行里写明）。 */
function segHeat(data: ReplayData): PageSection[] {
  const all = data.days;
  const days = data.win.effective === 'week' ? all : all.filter((d) => d.records.length > 0);
  if (days.length === 0) return [];
  const capped = days.length > HEAT_DAYS_CAP ? days.slice(days.length - HEAT_DAYS_CAP) : days;
  const rows: HeatRow[] = capped.map((d) => ({
    label: weekdayOf(d.date),
    date: d.date,
    cells: hourCellsOf(d.records.map((r) => ({
      start: minutesOf(r.time_start), end: minutesOf(r.time_end), key: l1Of(r.category),
    }))),
    sum: d.minutes > 0 ? fmtDurShort(d.minutes) : m('skill-schedule.plan-replaySections.c034'),
  }));
  // 段名是「24h × N 天热力图」；目录项逐字用它。
  return [{ navText: m('skill-schedule.plan-replaySections.c035'), html: renderHeatMatrix(rows, {
    order: L1_ORDER, id: 'replay-heat', title: m('skill-schedule.plan-replaySections.c036'), legend: true, withTotal: true,
  }) + (capped.length === days.length ? ''
    : renderCaliberLine(m('skill-schedule.plan-replaySections.c037', {
      p0: String(String(days.length)),
      p1: String(String(capped.length)),
    }))) }];
}

/** 计划执行（老侧 day／月／通用档）：六态分布 ＋ 按一级分类拆解。 */
function segPlan(data: ReplayData): PageSection[] {
  const counts = data.completionCounts.map((c) => ({ state: completionLabelOf(c.state), count: String(c.count) }));
  const byCat: DataTableRow[] = data.completionByL1.map((c) => ({
    name: c.name, total: String(c.total), done: String(c.done), rate: pctText(c.rate),
  }));
  return [{ navText: m('skill-schedule.plan-replaySections.c038'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c039'))
    + '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c147', {
      p0: String(data.plans.length), p1: String(data.marked), p2: pctText(data.completionRate),
    }) + '</p>'
    + renderDataTable({
      caption: m('skill-schedule.plan-replaySections.c040'),
      columns: [{ key: 'state', label: m('skill-schedule.plan-replaySections.c041') }, { key: 'count', label: m('skill-schedule.plan-replaySections.c042'), align: 'right' }],
      rows: counts,
      emptyText: m('skill-schedule.plan-replaySections.c043'),
    })
    + renderDataTable({
      caption: m('skill-schedule.plan-replaySections.c044'),
      columns: [
        { key: 'name', label: m('skill-schedule.plan-replaySections.c045') }, { key: 'total', label: m('skill-schedule.plan-replaySections.c046'), align: 'right' },
        { key: 'done', label: m('skill-schedule.plan-replaySections.c047'), align: 'right' }, { key: 'rate', label: m('skill-schedule.plan-replaySections.c048'), align: 'right' },
      ],
      rows: byCat,
      emptyText: m('skill-schedule.plan-replaySections.c049'),
    }) }];
}

/** 跨域对比（老侧 day／通用档）：未执行、超计划、计划外记录三张清单。
 *  `aggregate`（通用档跨了月）＝逐条那几张只给头几条并写明另有几条，计划外那一张改成按一级分类聚合。 */
function segCross(data: ReplayData, withDate: boolean, aggregate: boolean): PageSection[] {
  const tag = (date: string): string => (withDate ? date.slice(5) + ' ' : '');
  const limited = <T,>(rows: readonly T[]): { readonly rows: readonly T[]; readonly rest: number } =>
    (aggregate ? { rows: rows.slice(0, LIST_ROWS_CAP), rest: Math.max(0, rows.length - LIST_ROWS_CAP) } : { rows, rest: 0 });
  const u = limited(data.cross.unexecuted);
  const o = limited(data.cross.overrun);
  const unexecuted = u.rows.map((p) => ({
    left: m('skill-schedule.plan-replaySections.c050', {
      p0: String(tag(p.date) + p.time_start),
      p1: String(p.time_end),
    }),
    main: p.title,
    right: p.completion === null || p.completion === '' ? m('skill-schedule.plan-replaySections.c051') : completionLabelOf(p.completion),
  }));
  const overrun = o.rows.map((x) => ({
    left: tag(x.date),
    main: x.title,
    right: m('skill-schedule.plan-replaySections.c052', { p0: String(fmtDurShort(x.spillMinutes)) }),
  }));
  const unexpectedRows = data.cross.unexpected.map((r) => ({
    left: m('skill-schedule.plan-replaySections.c053', {
      p0: String(tag(r.date) + r.time_start),
      p1: String(r.time_end),
    }),
    main: r.activity,
    right: l1Of(r.category),
  }));
  const byCat: Record<string, number> = {};
  for (const r of data.cross.unexpected) byCat[l1Of(r.category)] = (byCat[l1Of(r.category)] ?? 0) + 1;
  const ranked = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  const unexpectedHtml = aggregate
    ? renderDistributionRows({
      rows: ranked.map((name) => ({
        label: name, value: m('skill-schedule.plan-replaySections.c054', { p0: String(String(byCat[name])) }), pct: fmtPct(byCat[name], data.cross.unexpected.length),
        color: categoryColor(name, L1_ORDER),
      })),
    }) + (data.cross.unexpected.length === 0 ? '' : '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c148', {
      p0: String(data.cross.unexpected.length), p1: String(limited(data.cross.unexpected).rest),
    }) + '</p>')
    : renderListRows({ items: limited(unexpectedRows).rows, emptyText: m('skill-schedule.plan-replaySections.c055') });
  const restLine = (n: number): string => (n === 0
    ? ''
    : '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c149', { p0: String(n) }) + '</p>');
  return [{ navText: m('skill-schedule.plan-replaySections.c056'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c057'))
    + renderCaliberLine(m('skill-schedule.plan-replaySections.c058'))
    + renderDisclosure({
      title: m('skill-schedule.plan-replaySections.c059'),
      open: true,
      contentHtml: renderListRows({ items: unexecuted, emptyText: m('skill-schedule.plan-replaySections.c060') }) + restLine(u.rest),
    })
    + renderDisclosure({
      title: m('skill-schedule.plan-replaySections.c061'),
      open: true,
      contentHtml: renderListRows({ items: overrun, emptyText: m('skill-schedule.plan-replaySections.c062') }) + restLine(o.rest),
    })
    + renderDisclosure({
      title: m('skill-schedule.plan-replaySections.c063'),
      open: true,
      contentHtml: unexpectedHtml,
    }) }];
}

/** 健康分（全档）：单日给当天分，多日给均值与逐日曲线，七维明细逐条给。
 *  #891：这一段里有**两颗**段名（`健康分`／逐日曲线那颗 `逐日健康分`），故拆成两小节。 */
function segHealth(data: ReplayData): PageSection[] {
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
    title: m('skill-schedule.plan-replaySections.c064'),
    input: {
      items: series.map((h) => ({ label: h.date.slice(5), value: h.score })),
      options: { height: 170, labels: 'select' as const, showValues: false as const },
    },
  });
  return [
    { navText: m('skill-schedule.plan-replaySections.c065'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c066'))
      + renderFactStrip({
        items: single
          ? [{ label: m('skill-schedule.plan-replaySections.c067'), value: String(data.healthScore) }]
          : [
            { label: m('skill-schedule.plan-replaySections.c068'), value: String(data.healthMean) },
            { label: m('skill-schedule.plan-replaySections.c069'), value: m('skill-schedule.plan-replaySections.c070', { p0: String(String(data.activeDays)) }) },
            { label: m('skill-schedule.plan-replaySections.c071'), value: series.length === 0 ? '—' : String(Math.max(...series.map((h) => h.score))) },
            { label: m('skill-schedule.plan-replaySections.c072'), value: series.length === 0 ? '—' : String(Math.min(...series.map((h) => h.score))) },
          ],
      })
      + renderCaliberLine(m('skill-schedule.plan-replaySections.c073'))
      + renderDistributionRows({ rows: dims }) },
    { navText: chart === '' ? '' : m('skill-schedule.plan-replaySections.c074'), html: chart },
  ];
}

/** 环比对比（老侧 month 档）：本月与上月同期逐分类并排。 */
function segMonthCompare(data: ReplayData): PageSection[] {
  const rows: DataTableRow[] = data.monthCompare.map((row) => ({
    name: row.name,
    cur: fmtDurShort(row.cur),
    prev: fmtDurShort(row.prev),
    delta: row.deltaPct === null ? m('skill-schedule.plan-replaySections.c075') : (row.deltaPct >= 0 ? '+' : '−') + String(Math.abs(row.deltaPct)) + '%',
  }));
  const rate = data.monthRateCompare;
  return [{ navText: m('skill-schedule.plan-replaySections.c076'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c077'))
    + '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c150', {
      p0: span(data.prevSpan.start, data.prevSpan.end),
    }) + '</p>'
    + renderDataTable({
      columns: [
        { key: 'name', label: m('skill-schedule.plan-replaySections.c078') }, { key: 'cur', label: m('skill-schedule.plan-replaySections.c079'), align: 'right' },
        { key: 'prev', label: m('skill-schedule.plan-replaySections.c080'), align: 'right' }, { key: 'delta', label: m('skill-schedule.plan-replaySections.c081'), align: 'right' },
      ],
      rows,
      emptyText: m('skill-schedule.plan-replaySections.c082'),
    })
    + (rate === null ? '' : '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c151', {
      p0: String(rate.cur), p1: String(rate.prev),
      p2: (rate.deltaPct >= 0 ? '+' : '−') + String(Math.abs(rate.deltaPct)),
    }) + '</p>') }];
}

/** 目标达成（老侧 month 档）：完成率、维持（睡眠）占比、记录覆盖三格。 */
function segGoals(data: ReplayData): PageSection[] {
  const maintain = data.byL1['维持'] ?? 0;
  // §4.7 · filter 里那句比对会带着「已完成」进参数子树，先单独数出来。
  const doneCount = data.plans.filter((p) => p.completion === '已完成').length;
  const lastDay = data.win.end;
  return [{ navText: m('skill-schedule.plan-replaySections.c083'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c084'))
    + renderGoalCards([
      {
        label: m('skill-schedule.plan-replaySections.c085'),
        value: pctText(data.completionRate),
        hint: m('skill-schedule.plan-replaySections.c086', {
          p0: String(String(doneCount)),
          p1: String(String(data.plans.length)),
          p2: String(String(data.marked)),
        }),
      },
      {
        label: m('skill-schedule.plan-replaySections.c087'),
        value: String(fmtPct(maintain, data.totalMinutes)) + '%',
        hint: m('skill-schedule.plan-replaySections.c088', { p0: String(fmtDur(maintain)) }),
      },
      {
        label: m('skill-schedule.plan-replaySections.c089'),
        value: m('skill-schedule.plan-replaySections.c090', { p0: String(String(data.activeDays)) }),
        hint: m('skill-schedule.plan-replaySections.c091', {
          p0: String(lastDay),
          p1: String(String(data.win.days)),
        }),
      },
      {
        label: m('skill-schedule.plan-replaySections.c092'),
        value: String(data.healthScore),
        hint: m('skill-schedule.plan-replaySections.c093'),
      },
    ]) }];
}

/** 亮点与问题（老侧那一段 AI 洞察的位置）：拿前一段等长区间做对照，红黄逐条点名。
 *  #891：这一段里有**两颗**段名（`亮点与问题`／`与上一段比`），故拆成两小节。 */
function segInsights(data: ReplayData): PageSection[] {
  const red = data.anomalies.filter((a) => a.level === 'red');
  const yellow = data.anomalies.filter((a) => a.level === 'yellow');
  const line = (a: Anomaly): string => {
    const arrow = a.deltaPct >= 0 ? m('skill-schedule.plan-replaySections.c094') : m('skill-schedule.plan-replaySections.c095');
    const pct = String(Math.abs(a.deltaPct));
    return m('skill-schedule.plan-replaySections.c096', {
      p0: String(a.dim),
      p1: String(arrow),
      p2: String(pct),
      p3: String(fmtDurShort(a.prev)),
      p4: String(fmtDurShort(a.cur)),
    });
  };
  const none = data.anomalies.length === 0;
  return [
    { navText: m('skill-schedule.plan-replaySections.c097'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c098')) },
    { navText: m('skill-schedule.plan-replaySections.c099'), html: renderFeedbackBlock({
      title: m('skill-schedule.plan-replaySections.c100'),
      toast: none
        ? {
          icon: 'ok',
          msg: m('skill-schedule.plan-replaySections.c101', {
            p0: String(span(data.prevSpan.start, data.prevSpan.end)),
          }),
        }
        : {
          icon: red.length > 0 ? 'warn' : 'info',
          msg: m('skill-schedule.plan-replaySections.c102', {
            p0: String(span(data.prevSpan.start, data.prevSpan.end)),
            p1: String(String(red.length)),
            p2: String(String(yellow.length)),
          }),
          lines: [...red, ...yellow].slice(0, 6).map(line),
        },
      staticNotice: true,
    }) },
  ];
}

/** 缺计划补齐引导（老侧 day 档）：这一天没有计划可对照时给这一块，**不降级**成一句空话。 */
function segPlanGuide(data: ReplayData): PageSection[] {
  if (data.win.effective !== 'day' || data.plans.length > 0) return [];
  return [{ navText: m('skill-schedule.plan-replaySections.c103'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c104'))
    + renderFeedbackBlock({
      title: m('skill-schedule.plan-replaySections.c105'),
      toast: {
        icon: 'info',
        msg: m('skill-schedule.plan-replaySections.c106'),
      },
      staticNotice: true,
    })
    + renderPreBlock({
      label: m('skill-schedule.plan-replaySections.c107'),
      command: m('skill-schedule.plan-replaySections.c108', { p0: String(data.win.start) }),
      actionId: 'ilife-sch-replay-copy-plan',
      copyLabel: m('skill-schedule.plan-replaySections.c109'),
    }) }];
}

/** 页尾那一段（全档）：复盘接计划（老侧跨场景约定 C）。 */
function segNext(data: ReplayData): PageSection[] {
  return [{ navText: m('skill-schedule.plan-replaySections.c110'), html: renderSectionTitle(m('skill-schedule.plan-replaySections.c111'))
    + '<p class="sch-pl-note">' + m('skill-schedule.plan-replaySections.c152', { p0: String(data.nextDay) }) + '</p>'
    + renderPreBlock({
      label: m('skill-schedule.plan-replaySections.c112'),
      command: m('skill-schedule.plan-replaySections.c113', { p0: String(data.nextDay) }),
      actionId: 'ilife-sch-replay-copy-next',
      copyLabel: m('skill-schedule.plan-replaySections.c114'),
    }) }];
}

/* ─────────────────────────── 整页 ─────────────────────────── */

/** 各档的区块序列（本页档路由的唯一定义地，与 `replayDocs.ts` 的窗口路由分开住两处职能）。
 *  #891：每一支返回的是**小节清单**（一段一条目录条目），不再是拼好的字符串——
 *  段名与目录条目同住一处，不会走散。 */
function sectionsOf(data: ReplayData): PageSection[] {
  const g = data.win.effective;
  const multi = data.win.days > 1;
  if (g === 'day') {
    return [...segPlanActual(data, multi, false), ...segPlanGuide(data), ...segRecord(data), ...segPlan(data), ...segCross(data, multi, false), ...segHealth(data), ...segInsights(data)];
  }
  if (g === 'week') return [...segTrend(data), ...segHeat(data), ...segHealth(data), ...segInsights(data)];
  if (g === 'month') return [...segRecord(data), ...segMonthCompare(data), ...segGoals(data), ...segHealth(data), ...segInsights(data)];
  return [...segRecord(data), ...segTrend(data), ...segHeat(data), ...segPlan(data), ...segPlanActual(data, multi, true), ...segCross(data, multi, true), ...segHealth(data), ...segInsights(data)];
}

function kpisOf(data: ReplayData): readonly KpiCardInput[] {
  const total = data.totalMinutes;
  const score = data.win.effective === 'day' ? data.healthScore : data.healthMean;
  return [
    { label: m('skill-schedule.plan-replaySections.c115'), value: fmtDurShort(total), detail: m('skill-schedule.plan-replaySections.c116', { p0: String(String(data.records.length)) }) },
    {
      label: m('skill-schedule.plan-replaySections.c117'), value: String(data.activeDays), unit: m('skill-schedule.plan-replaySections.c118'),
      detail: m('skill-schedule.plan-replaySections.c119', {
        p0: String(span(data.win.start, data.win.end)),
        p1: String(String(data.win.days)),
      }),
    },
    {
      label: m('skill-schedule.plan-replaySections.c120'), value: pctText(data.completionRate),
      detail: data.plans.length === 0 ? m('skill-schedule.plan-replaySections.c121') : m('skill-schedule.plan-replaySections.c122', { p0: String(String(data.plans.length)) }),
      ...(data.completionRate === null ? {} : { bar: { pct: Math.min(100, Math.max(0, data.completionRate)) } }),
    },
    {
      label: m('skill-schedule.plan-replaySections.c123'), value: String(score),
      detail: data.win.effective === 'day' ? m('skill-schedule.plan-replaySections.c124') : m('skill-schedule.plan-replaySections.c125'),
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
    m('skill-schedule.plan-replaySections.c126', {
      p0: String(granCnOf(g)),
      p1: String(span(data.win.start, data.win.end)),
      p2: String(String(data.win.days)),
      p3: String(String(data.records.length)),
      p4: String(fmtDur(data.totalMinutes)),
      p5: String(String(g === 'day' ? data.healthScore : data.healthMean)),
    }),
    m('skill-schedule.plan-replaySections.c127', {
      p0: String(String(data.plans.length)),
      p1: String(pctText(data.completionRate)),
    }),
    ...ranked.map((name) => name + ' ' + fmtDur(data.byL1[name])),
    ...data.anomalies.map((a) => m('skill-schedule.plan-replaySections.c128', {
      p0: String(a.dim),
      p1: String(a.deltaPct >= 0 ? '+' : ''),
      p2: String(String(a.deltaPct)),
    })),
  ];
  return planCopyArea({
    message: lines.join('，'),
    command: 'schedule-cmd-read schedule.plan.write --params {"op":"review","granularity":"' + g
      + '","start":"' + data.win.start + '","end":"' + data.win.end + '"}',
    source: m('skill-schedule.plan-replaySections.c129', {
      p0: String(String(data.records.length)),
      p1: String(String(data.plans.length)),
    }),
  });
}

/** 「复盘」一体页整页（四档共用这一支，区块按档取）。 */
export function replayPage(handle: ScheduleDb, win: ReplayWindow): string {
  const data = replayData(handle, win);
  const g = win.effective;
  // §4.7 · 副标题末尾那一支是条件，抽成局部变量。
  const spanNote = win.requested === 'range' && g !== 'range'
    ? m('skill-schedule.plan-replaySections.c130', { p0: String(String(win.days)), p1: String(granCnOf(g)) }) : '';
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-replaySections.c131', { p0: String(granCnOf(g)) }),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-replaySections.c132', { p0: String(granCnOf(g)) }),
    subtitle: m('skill-schedule.plan-replaySections.c133', {
      p0: String(span(win.start, win.end)),
      p1: String(String(data.records.length)),
      p2: String(fmtDur(data.totalMinutes)),
      p3: String(String(data.plans.length)),
      p4: String(pctText(data.completionRate)),
      p5: String(spanNote),
    }),
  };
  const content = pageSections([
    { navText: m('skill-schedule.plan-replaySections.c134'), html: renderKpiGrid(kpisOf(data), { title: m('skill-schedule.plan-replaySections.c135') }) },
    { html: renderConclusionBar(conclusionOf(data)) },
    ...sectionsOf(data),
    ...segNext(data),
    { navText: m('skill-schedule.plan-replaySections.c136'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-replaySections.c137'),
      dataActionId: 'ilife-sch-replay-copy-data',
      logActionId: 'ilife-sch-replay-copy-log',
      ...copyOf(data),
    }) },
  ]);
  return assembleDocPage({ head, content: content.toc + content.body });
}

/** 结论条那一句：这一段干了什么、对照下来的结论是什么。 */
function conclusionOf(data: ReplayData): string {
  const g = data.win.effective;
  const top = Object.keys(data.byL1).sort((a, b) => (data.byL1[b] ?? 0) - (data.byL1[a] ?? 0))[0];
  const base = m('skill-schedule.plan-replaySections.c138', {
    p0: String(span(data.win.start, data.win.end)),
    p1: String(String(data.records.length)),
    p2: String(fmtDur(data.totalMinutes)),
  });
  const plan = data.plans.length === 0 ? m('skill-schedule.plan-replaySections.c139') : m('skill-schedule.plan-replaySections.c140', {
    p0: String(String(data.plans.length)),
    p1: String(pctText(data.completionRate)),
  });
  const cross = g !== 'day' ? '' : (data.cross.pairs.length === 0
    ? m('skill-schedule.plan-replaySections.c141')
    : m('skill-schedule.plan-replaySections.c142', {
      p0: String(String(data.cross.pairs.length)),
      p1: String(String(data.cross.unexpected.length)),
    }));
  const health = (g === 'day' ? m('skill-schedule.plan-replaySections.c143', { p0: String(String(data.healthScore)) }) : m('skill-schedule.plan-replaySections.c144', { p0: String(String(data.healthMean)) })) + '。';
  return base + plan + cross + (top === undefined ? '' : m('skill-schedule.plan-replaySections.c145', { p0: String(top) })) + health;
}
