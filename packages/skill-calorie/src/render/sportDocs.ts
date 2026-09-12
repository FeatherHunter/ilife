/** #109 · 运动/身体域全文档装配（数据→区块→填充器）。
 *
 * 范围（47 页同质之运动/身体域，t71 口径「新版已有」）：`calorie.view.exercise`
 * （exercise_summary 汇总＋趋势＋分布＋力量/有氧筛选子集）／`calorie.view.exercise-goal`
 * （exercise_goal_view）／`calorie.view.weight`（weight_dashboard）／
 * `calorie.view.weight-history`（weight_history 子集）／`calorie.view.weight-compare`
 * （weight_compare 子集）／`calorie.view.weight-review`（weight_review）／
 * `calorie.view.volatility`（weight_volatility_v2）／`calorie.view.body-composition`
 * （body_composition_view）／`calorie.view.body-measure`（body_measurements_view）。
 * 不碰：exercise_cardio／distribution／recap／review／strength／trend 6 项需移植（→ #111），
 * 训练计划/向导（→ #86），体脂/围度对比 helpers（无 CLI 键，随组合分析消费），
 * 缺口/组合/异常/禁忌（→ #110），饮食域（#108 已关）。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影，
 * 行级页（体成分/围度记录）走 list 投影。本层不做取数（数据由调用方 dispatch 备齐），
 * 不返空（缺失由数据层抛 missing-data）。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { assembleDocPage, dataCopyArea, metricsOf } from '../shared/docPage.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { DaySeries } from '../analysis/series.js';
import { inferCategory } from '../fetch/exercise.js';
import type { ExerciseView } from './exercise.js';
import type { ExerciseGoalView } from './planPlate.js';
import type {
  BodyCompositionView,
  BodyMeasureView,
} from './bodyPlate.js';
import type {
  VolatilityView,
  WeightCompareView,
  WeightDashboard,
  WeightHistoryView,
  WeightReviewView,
} from './weightPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动身体';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/* ── 运动总览（exercise_summary.html 对照：汇总＋每日趋势＋类型分布＋力量/有氧筛选子集） ── */

export function buildExerciseDoc(v: ExerciseView): string {
  const r = v.review;
  const parts: string[] = [renderKpiGrid([
    { label: '总消耗', value: String(r.totalBurned), unit: '卡', detail: v.start + ' ~ ' + v.end },
    { label: '总时长', value: String(r.totalMinutes), unit: '分钟' },
    { label: '次数', value: String(r.sessions), unit: '次', detail: '活跃 ' + r.activeDays + ' 天' },
    {
      label: '日均', value: fmt(v.avgBurnedPerLoggedDay), unit: '卡',
      detail: '数列合计 ' + v.totalBurnedSeries + ' 卡 · 有数 ' + v.activeDays + ' 天',
    },
  ])];
  let charts = false;
  const loggedDays = v.series.filter((d: DaySeries) => d.exerciseKcal !== null);
  if (loggedDays.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日消耗',
      input: {
        items: v.series.map((d: DaySeries) => ({ label: d.date.slice(5), value: d.exerciseKcal })),
        options: { markLine: { value: v.avgBurnedPerLoggedDay ?? undefined, label: '日均' } },
      },
    }));
    charts = true;
  }
  if (r.byType.length > 0) {
    parts.push(renderChartBlock({
      kind: 'bar',
      title: '类型消耗分布',
      input: { items: r.byType.map((t) => ({ label: t.type + ' ' + t.sessions + '次', value: t.burned })) },
    }));
    charts = true;
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'burn', label: '消耗', align: 'right' },
    ],
    rows: v.series.map((d: DaySeries) => ({ date: d.date, burn: d.exerciseKcal })),
    caption: '按日消耗（' + v.start + ' ~ ' + v.end + '，无记录日留空，不断 0）',
    emptyText: '本窗无按日消耗',
  }));
  parts.push(renderDataTable({
    columns: [
      { key: 'type', label: '类型' },
      { key: 'cat', label: '分类' },
      { key: 'sessions', label: '次数', align: 'right' },
      { key: 'burned', label: '消耗', align: 'right' },
      { key: 'minutes', label: '时长', align: 'right' },
    ],
    rows: r.byType.map((t) => ({
      type: t.type, cat: inferCategory(t.type), sessions: t.sessions, burned: t.burned, minutes: t.minutes,
    })),
    caption: '按类型明细（力量/有氧筛选子集：同窗不同类直出，无类切换页）',
    emptyText: '本窗无类型明细',
  }));
  const cats = Object.entries(r.byCategory);
  if (cats.length > 0) {
    parts.push(renderDisclosure({
      title: '按分类汇总（共 ' + cats.length + ' 类）',
      contentHtml: renderListRows({
        items: cats.map(([cat, s]) => ({ left: cat, main: s.sessions + ' 次', right: s.burned + ' 卡' })),
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise',
      data: {
        metrics: metricsOf({
          totalBurned: r.totalBurned, totalMinutes: r.totalMinutes, sessions: r.sessions,
          activeDays: r.activeDays, totalBurnedSeries: v.totalBurnedSeries,
          avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '运动总览 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.exercise · 运动身体域',
    subtitle: '类型分布/力量有氧明细同窗直出（交互筛选归宿主）',
    content: parts.join(''),
    charts,
  });
}

/* ── 运动目标（exercise_goal_view.html 对照：目标 vs 实际＋完成度＋达成判定） ── */

export function buildExerciseGoalDoc(v: ExerciseGoalView): string {
  const parts: string[] = [renderKpiGrid([
    { label: '区间', value: v.start + ' ~ ' + v.end, detail: v.days + ' 天 · 日均目标 ' + v.dailyGoal + ' 卡' },
    { label: '目标', value: String(v.goalTotal), unit: '卡' },
    { label: '实际', value: String(v.actual), unit: '卡', detail: v.achieved ? '已达成' : '未达成' },
    {
      label: '完成度', value: v.pct === null ? '—' : String(v.pct) + '%',
      detail: '差 ' + v.gap + ' 卡', status: v.achieved ? 'ok' : 'warn',
    },
  ])];
  parts.push(renderChartBlock({
    kind: 'bar',
    title: '目标 vs 实际',
    input: { items: [{ label: '目标', value: v.goalTotal }, { label: '实际', value: v.actual }] },
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-goal',
      data: {
        metrics: metricsOf({
          dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual,
          pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '运动目标 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.exercise-goal · 运动身体域',
    subtitle: v.achieved ? '已达成（实际 ≥ 目标）' : '未达成（还差 ' + Math.abs(v.gap) + ' 卡）',
    content: parts.join(''),
    charts: true,
  });
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

/* ── 体成分（body_composition_view.html 对照：来源筛选＋趋势＋记录表＋复制） ── */

export function buildBodyCompositionDoc(v: BodyCompositionView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'source', label: '来源', value: v.source ?? '' }],
      description: '按来源筛选体成分（空=全部；趋势默认最近来源；对比两期归组合分析）',
    }),
    renderKpiGrid([
      { label: '体成分看', value: v.source ?? '全部来源', detail: '共 ' + v.total + ' 条' },
      { label: '最新体脂', value: v.latestPct === null ? '—' : String(v.latestPct) + '%' },
      { label: '趋势点', value: String(v.trend.length), unit: '天' },
    ]),
  ];
  let charts = false;
  if (v.trend.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体脂趋势',
      input: { items: v.trend.map((t) => ({ label: t.date.slice(5), value: t.avgPct })) },
    }));
    charts = true;
  }
  const rows = v.items.map((r) => {
    const d = r as { date?: unknown; body_fat_pct?: unknown; source?: unknown; note?: unknown };
    return {
      date: typeof d.date === 'string' ? d.date : '',
      pct: typeof d.body_fat_pct === 'number' ? d.body_fat_pct : '',
      source: typeof d.source === 'string' ? d.source : '',
      note: typeof d.note === 'string' ? d.note : '',
    };
  });
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'pct', label: '体脂', align: 'right' },
      { key: 'source', label: '来源' },
      { key: 'note', label: '备注' },
    ],
    rows,
    caption: '体成分记录（共 ' + v.total + ' 条）',
    emptyText: '无体成分记录',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-composition',
      data: { items: rows, total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体成分看',
    eyebrow: 'calorie.view.body-composition · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}

/* ── 围度（body_measurements_view.html 对照：项目筛选＋趋势＋记录表＋复制，13 项） ── */

const MEASURE_ZH: Record<string, string> = {
  chest_cm: '胸围', waist_cm: '腰围', abdomen_cm: '腹围', hip_cm: '臀围',
  left_thigh_cm: '左大腿', right_thigh_cm: '右大腿', left_calf_cm: '左小腿', right_calf_cm: '右小腿',
  left_arm_cm: '左上臂', right_arm_cm: '右上臂', left_forearm_cm: '左前臂', right_forearm_cm: '右前臂',
  shoulder_cm: '肩宽',
};

export function buildBodyMeasureDoc(v: BodyMeasureView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'metric', label: '围度项', value: v.metric ?? '' }],
      description: '13 围度项按名筛选（空=全部；趋势需指定单项；两期对比归组合分析）',
    }),
    renderKpiGrid([
      { label: '围度看', value: v.metric ? (MEASURE_ZH[v.metric] ?? v.metric) : '全部围度', detail: '共 ' + v.total + ' 条' },
      { label: '最新', value: v.latestVal === null ? '—' : String(v.latestVal) + 'cm', detail: v.metric ? (MEASURE_ZH[v.metric] ?? v.metric) : '' },
      { label: '趋势点', value: String(v.trend.length), unit: '天' },
    ]),
  ];
  let charts = false;
  if (v.metric && v.trend.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: (MEASURE_ZH[v.metric] ?? v.metric) + '趋势',
      input: { items: v.trend.map((t) => ({ label: t.date.slice(5), value: t.avgVal })) },
    }));
    charts = true;
  }
  if (v.metric) {
    const mkey = v.metric;
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'val', label: (MEASURE_ZH[mkey] ?? mkey) + '(cm)', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => {
        const val = r[mkey];
        return {
          date: typeof r['date'] === 'string' ? (r['date'] as string) : '',
          val: typeof val === 'number' ? val : '',
          note: typeof r['note'] === 'string' ? (r['note'] as string) : '',
        };
      }),
      caption: (MEASURE_ZH[mkey] ?? mkey) + '记录（共 ' + v.total + ' 条）',
      emptyText: '该项目无记录',
    }));
  } else {
    const numOrEmpty = (x: unknown): number | string => (typeof x === 'number' ? x : '');
    const strOrEmpty = (x: unknown): string => (typeof x === 'string' ? x : '');
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'chest', label: '胸', align: 'right' },
        { key: 'waist', label: '腰', align: 'right' },
        { key: 'abdomen', label: '腹', align: 'right' },
        { key: 'hip', label: '臀', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => ({
        date: strOrEmpty(r['date']), chest: numOrEmpty(r['chest_cm']), waist: numOrEmpty(r['waist_cm']),
        abdomen: numOrEmpty(r['abdomen_cm']), hip: numOrEmpty(r['hip_cm']), note: strOrEmpty(r['note']),
      })),
      caption: '围度记录（共 ' + v.total + ' 条；全量 13 项见复制数据）',
      emptyText: '无围度记录',
    }));
  }
  const rows = v.items.map((r) => ({ ...r }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-measure',
      data: { items: rows, total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '围度看',
    eyebrow: 'calorie.view.body-measure · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}
