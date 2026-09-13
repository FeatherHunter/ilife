/** #109 → #294 · 体重域的文档装配（体重盘／明细／对比／复核／波动五页）：
 * 自 `render/sportDocs.ts` **原样迁入**能力目录 `src/weight/`（归属律：只属体重的东西住体重目录）。
 * 本层不做取数（数据由各子功能备齐），不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type {
  VolatilityView,
  WeightCompareView,
  WeightDashboard,
  WeightHistoryView,
  WeightReviewView,
} from './plate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 体重各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·体重';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/* ── 体重盘（weight_dashboard.html 对照：首末＋均值＋变化趋势＋目标差距） ── */

export function buildWeightDoc(w: WeightDashboard): string {
  const t = w.trend;
  const parts: string[] = [renderKpiGrid([
    { label: '体重盘', value: t.firstWeight + ' → ' + t.lastWeight + ' kg', detail: t.firstDate + ' ~ ' + t.lastDate },
    { label: '均值', value: String(t.avgWeight), unit: 'kg', detail: '共 ' + t.recordCount + ' 条 · 极值 ' + t.minWeight + '~' + t.maxWeight },
    {
      label: '变化', value: (t.changeKg >= 0 ? '+' : '') + t.changeKg + ' kg',
      detail: '趋势' + t.trendCn + ' · 日均 ' + t.dailyChangeG + ' g',
    },
    {
      label: '距目标', value: w.gapKg === null ? '—' : (w.gapKg >= 0 ? '+' : '') + w.gapKg + ' kg',
      detail: w.weightGoal === null ? '未设体重目标' : '目标 ' + w.weightGoal + ' kg' + (w.deadline ? ' · 截止 ' + w.deadline : ''),
    },
  ])];
  let charts = false;
  if (t.logs.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: { items: t.logs.map((l) => ({ label: l.date.slice(5), value: l.weightKg })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'note', label: '备注' },
    ],
    rows: t.logs.map((l) => ({ date: l.date, kg: l.weightKg, note: l.note })),
    caption: '体重记录（' + t.firstDate + ' ~ ' + t.lastDate + '，共 ' + t.recordCount + ' 条）',
    emptyText: '本窗无体重记录',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight',
      data: {
        metrics: metricsOf({
          recordCount: t.recordCount, avgWeight: t.avgWeight,
          maxWeight: t.maxWeight, minWeight: t.minWeight,
          firstWeight: t.firstWeight, lastWeight: t.lastWeight,
          changeKg: t.changeKg, dailyChangeG: t.dailyChangeG,
          weightGoal: w.weightGoal, gapKg: w.gapKg,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重盘 ' + w.start + ' ~ ' + w.end,
    eyebrow: 'calorie.view.weight · 运动身体域',
    subtitle: '趋势' + t.trendCn,
    content: parts.join(''),
    charts,
  });
}

/* ── 体重历史（weight_history.html 对照：曲线＋全量记录表；18 词多窗口子集直出） ── */

export function buildWeightHistoryDoc(h: WeightHistoryView): string {
  const asc = [...h.rows].reverse();
  const parts: string[] = [renderKpiGrid([
    { label: '体重历史', value: h.range, detail: '共 ' + h.rows.length + ' 条' },
    {
      label: '变化',
      value: h.change ? (h.change.delta >= 0 ? '+' : '') + h.change.delta + ' kg' : '—',
      detail: h.change ? h.change.spanDays + ' 天 · 日均 ' + h.change.dailyAvg + ' kg' : '单点无变化',
    },
  ])];
  let charts = false;
  if (asc.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: { items: asc.map((r) => ({ label: r.date.slice(5), value: r.weight_kg })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'time', label: '时间' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'bmi', label: 'BMI', align: 'right' },
      { key: 'note', label: '备注' },
    ],
    rows: h.rows.map((r) => ({
      date: r.date, time: r.time ?? '', kg: r.weight_kg, bmi: r.bmi ?? '', note: r.note ?? '',
    })),
    caption: '体重历史 ' + h.range + '（共 ' + h.rows.length + ' 条）',
    emptyText: '本窗无体重记录',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-history',
      data: {
        metrics: metricsOf({
          rows: h.rows.length,
          spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
          delta: h.change?.delta, dailyAvg: h.change?.dailyAvg,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重历史 ' + h.range,
    eyebrow: 'calorie.view.weight-history · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}

/* ── 体重对比（weight_compare.html 对照：两期均值差＋节奏＋分期明细；18 场景子集直出） ── */

const COMPARE_COLUMNS: DataTableColumn[] = [
  { key: 'period', label: '期别' },
  { key: 'range', label: '区间' },
  { key: 'avg', label: '均值', align: 'right' },
  { key: 'first', label: '期首', align: 'right' },
  { key: 'last', label: '期末', align: 'right' },
  { key: 'change', label: '变化', align: 'right' },
];

export function buildWeightCompareDoc(v: WeightCompareView): string {
  const c = v.compare;
  const parts: string[] = [renderKpiGrid([
    {
      label: '体重对比', value: (c.avgDiff >= 0 ? '+' : '') + c.avgDiff + ' kg',
      detail: c.direction === 'down' ? '下降' : '上升',
    },
    { label: '本期', value: String(c.currentPeriod.avgWeight), unit: 'kg', detail: v.start + ' ~ ' + v.end },
    { label: '对比期', value: String(c.comparePeriod.avgWeight), unit: 'kg', detail: v.compareStart + ' ~ ' + v.compareEnd },
    { label: '节奏', value: c.speedLabel },
  ])];
  const rowOf = (name: string, s: typeof c.currentPeriod, range: string) => ({
    period: name, range, avg: s.avgWeight, first: s.firstWeight, last: s.lastWeight, change: s.changeKg,
  });
  parts.push(renderDataTable({
    columns: [...COMPARE_COLUMNS],
    rows: [
      rowOf('本期', c.currentPeriod, v.start + ' ~ ' + v.end),
      rowOf('对比期', c.comparePeriod, v.compareStart + ' ~ ' + v.compareEnd),
    ],
    caption: '两期对比（均值差 ' + (c.avgDiff >= 0 ? '+' : '') + c.avgDiff + ' kg）',
    emptyText: '对比期无数据',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-compare',
      data: {
        metrics: {
          avgDiff: c.avgDiff,
          currentAvg: c.currentPeriod.avgWeight, compareAvg: c.comparePeriod.avgWeight,
          currentChange: c.currentPeriod.changeKg, compareChange: c.comparePeriod.changeKg,
        },
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重对比',
    eyebrow: 'calorie.view.weight-compare · 运动身体域',
    subtitle: '本期 ' + v.start + ' ~ ' + v.end + ' vs 对比期 ' + v.compareStart + ' ~ ' + v.compareEnd,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 体重复核（weight_review.html 对照：当前＋目标＋差距＋预计达成＋调整建议） ── */

export function buildWeightReviewDoc(v: WeightReviewView): string {
  const m = v.milestone;
  const parts: string[] = [renderKpiGrid([
    { label: '体重复核', value: String(m.currentWeight), unit: 'kg', detail: m.currentDate },
    {
      label: '目标体重', value: String(m.weightGoal), unit: 'kg',
      detail: m.deadline ? '截止 ' + m.deadline : '无截止',
    },
    { label: '差距', value: (m.gapKg >= 0 ? '+' : '') + m.gapKg + ' kg' },
    {
      label: '预计达成', value: m.estDate ?? '—',
      detail: m.estDays === null || m.estDays === undefined ? m.status : m.estDays + ' 天 · ' + m.status,
    },
  ])];
  parts.push(renderListRows({
    items: [
      { left: '状态', main: m.status },
      {
        left: '日均变化', main: m.actualDailyChangeKg === null ? '—（记录不足）' : String(m.actualDailyChangeKg) + ' kg/天',
      },
      {
        left: '热量调整', main: m.calorieAdjustment === null ? '—' : String(m.calorieAdjustment) + ' 卡',
      },
    ],
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-review',
      data: {
        metrics: metricsOf({
          currentWeight: m.currentWeight, weightGoal: m.weightGoal,
          gapKg: m.gapKg, actualDailyChangeKg: m.actualDailyChangeKg,
          estDays: m.estDays, calorieAdjustment: m.calorieAdjustment,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重复核 ' + v.today,
    eyebrow: 'calorie.view.weight-review · 运动身体域',
    subtitle: m.status,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 波动分析（weight_volatility_v2.html 对照：基线＋阈值＋预警＋异常点） ── */

export function buildVolatilityDoc(v: VolatilityView): string {
  const o = v.volatility;
  const parts: string[] = [renderKpiGrid([
    { label: '波动分析', value: '基线 ' + o.baselineValue + ' kg', detail: o.baselineToggleLabel },
    {
      label: '阈值', value: '黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + ' kg',
      detail: 'σ=' + o.baselineSigma + 'kg · ' + v.baselineMode + '基线',
    },
    { label: '预警', value: o.earlyWarning.level, detail: o.earlyWarning.message },
    {
      label: '近期异常', value: String(o.recentAnomalies.length), unit: '个',
      detail: '共 ' + o.points.length + ' 点',
    },
  ])];
  let charts = false;
  if (o.points.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '偏离基线',
      input: { items: o.points.map((p) => ({ label: p.date.slice(5), value: p.deviationKg })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'dev', label: '偏离', align: 'right' },
      { key: 'level', label: '级别' },
    ],
    rows: o.recentAnomalies.map((p) => ({ date: p.date, kg: p.kg, dev: p.deviationKg, level: p.level })),
    caption: '近期异常点（共 ' + o.recentAnomalies.length + ' 个，黄/红阈上）',
    emptyText: '近期无异常点（基线 ' + o.baselineValue + ' kg，黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + '）',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.volatility',
      data: {
        metrics: {
          baselineValue: o.baselineValue, baselineSigma: o.baselineSigma,
          yellow: o.thresholds.yellow, red: o.thresholds.red,
          points: o.points.length, anomalies: o.recentAnomalies.length,
          deviationKg: o.earlyWarning.deviationKg,
        },
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '波动分析 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.volatility · 运动身体域',
    subtitle: o.earlyWarning.message,
    content: parts.join(''),
    charts,
  });
}
