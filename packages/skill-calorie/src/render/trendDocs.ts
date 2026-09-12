/** #110 · 趋势/分析域全文档装配（数据→区块→填充器）。
 *
 * 范围（47 页同质之趋势/分析域，t71 口径「新版已有」）：`calorie.view.combined`
 * （combined_analysis：11 配对×白名单窗口，落差最大：旧 6 节→新 1 KPI 壳）／
 * `calorie.view.deficit`（calorie_deficit）／`calorie.view.anomaly`（anomaly_report，
 * 23 种诊断）／`calorie.view.contraindication`（contraindication_report）／
 * `calorie.view.predict`（predict_report 体重预测）／`calorie.view.goal-predict`
 * （目标预测达成）。
 * 不碰：calorie_trend／long_trend／nutrition_analysis／six_factors 等 18 项需移植
 * （→ #111–#113），calorie.history（趋势遗留词归宿，与本域无关），饮食域（#108 已关）、
 * 运动/身体域（#109 已关）。envelope `data.metrics` 逐键不动（零快照 churn）；
 * 模板闭集不动；冻结面不动。
 *
 * 做法（#104 §4 用法）：内容 = base-paint/blocks 12 区块（B-01 壳／B-02 KPI／B-03 表／
 * B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／B-11 复制区），文档 = fillTemplate 包裹
 * （资产裸文本＋填充器包裹；sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约，技能侧不自产第二套序列化）：指标页走 stat 投影。
 * 本层不做取数（数据由调用方 dispatch 备齐），不返空（缺失由数据层抛 missing-data）。
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
import type { CombinedAnalysis } from './analysisPlate.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { AnomalyView, ContraView, PredictView } from './insightPlate.js';
import type { GoalPredictView } from './goalExtra.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·趋势分析';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

/** 相关强度解读（逐字对齐旧 combined_analysis.html 口径：|r|≥0.5 强／≥0.3 中等／否则弱）。 */
function corrInterp(r: number | null): string {
  if (r === null || r === undefined) return '数据不足';
  const a = Math.abs(r);
  if (a >= 0.5) return '强相关';
  if (a >= 0.3) return '中等相关';
  return '弱相关';
}

const SEV_ZH: Record<string, string> = { error: '错误', warn: '警告', info: '提示' };
const CONTRA_STATUS_ZH: Record<string, string> = { ok: '通过', warn: '有警告', fail: '有错误' };

/* ── 组合分析（combined_analysis.html 对照：KPI＋双轴走势＋相关回归散点＋延迟相关＋分层对比＋insight） ── */

export function buildCombinedDoc(c: CombinedAnalysis): string {
  const a = c.analysis;
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'pair', label: '配对', value: c.pair },
        { name: 'window', label: '窗口', value: c.window },
        { name: 'start', label: '开始', value: c.start },
        { name: 'end', label: '结束', value: c.end },
      ],
      description: '11 配对×白名单窗口（Nd 仅收 7/15/30/60/90/180/365d，另收本周/上周/本月/上月/今年/custom；99d 等非法窗直接 exit 2，不静默回退）',
    }),
    renderKpiGrid([
      { label: '相关系数 r', value: a.correlation.r === null ? '—' : String(a.correlation.r), detail: corrInterp(a.correlation.r) },
      { label: 'A 均值（' + a.labels.a + '）', value: fmt(a.aAvg), detail: 'Δ ' + fmt(a.aDelta) + ' · ' + a.aCount + ' 天' },
      { label: 'B 均值（' + a.labels.b + '）', value: fmt(a.bAvg), detail: 'Δ ' + fmt(a.bDelta) + ' · ' + a.bCount + ' 天' },
      { label: '对齐样本', value: String(a.correlation.n), unit: '天', detail: '双侧有数据的天数' },
    ]),
  ];
  let charts = false;
  if (a.line.length > 0) {
    const aItems = a.line.map((p) => ({ label: p.date.slice(5), value: p.a }));
    const bItems = a.line.map((p) => ({ label: p.date.slice(5), value: p.b }));
    parts.push(renderChartBlock({
      kind: 'line',
      title: '双轴走势（' + a.labels.a + '实线 · ' + a.labels.b + '虚线独立刻度；空缺断点不断 0）',
      input: {
        items: aItems,
        options: {
          series: [
            { name: a.labels.a, items: aItems },
            { name: a.labels.b, items: bItems, dashed: true, ownScale: true },
          ],
        },
      },
    }));
    charts = true;
  }
  if (a.scatter.length > 0) {
    parts.push(renderChartBlock({
      kind: 'scatter',
      title: '相关性与回归' + (a.regression ? '（斜率 ' + a.regression.slope + '，n=' + a.regression.n + '）' : '（样本不足未拟合）'),
      input: {
        items: a.scatter.map((p) => ({ x: p.x, y: p.y })),
        options: { regression: a.regression !== null },
      },
    }));
    charts = true;
  }
  if (a.lag.length > 0) {
    parts.push(renderDataTable({
      columns: [
        { key: 'lag', label: '滞后天数' },
        { key: 'r', label: '相关系数 r', align: 'right' },
        { key: 'interp', label: '解读' },
      ],
      rows: a.lag.map((l) => ({
        lag: '前 ' + l.lag + ' 天 B 值 vs 当日 A 值',
        r: l.r === null ? '—' : String(l.r),
        interp: corrInterp(l.r),
      })),
      caption: '延迟相关性（仅体重×摄入/运动/蛋白三配对有此节）',
      emptyText: '无延迟相关数据',
    }));
  }
  if (a.strat.rows.length > 0) {
    parts.push(renderDataTable({
      columns: [
        { key: 'label', label: '分组' },
        { key: 'days', label: '天数', align: 'right' },
        { key: 'aDelta', label: 'A 净变化', align: 'right' },
        { key: 'bAvg', label: 'B 均值', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: a.strat.rows.map((r) => ({
        label: r.label, days: r.days, aDelta: fmt(r.aDelta), bAvg: fmt(r.bAvg), note: r.note,
      })),
      caption: '分层对比' + (a.strat.extra.length > 0 ? '（' + a.strat.extra.join('；') + '）' : ''),
      emptyText: '无分层数据',
    }));
  }
  if (a.deficitBuckets.length > 0) {
    parts.push(renderDataTable({
      columns: [
        { key: 'label', label: '缺口分桶' },
        { key: 'days', label: '天数', align: 'right' },
      ],
      rows: a.deficitBuckets.map((b) => ({ label: b.label, days: b.days })),
      caption: '缺口分桶（仅 weight_deficit 配对有此节）',
      emptyText: '无分桶数据',
    }));
  }
  if (a.overLimitDays.length > 0) {
    parts.push(renderDisclosure({
      title: '超标日（摄入＞130%目标，共 ' + a.overLimitDays.length + ' 天，仅 weight_calorie 配对有此节）',
      contentHtml: renderListRows({
        items: a.overLimitDays.map((d) => ({ main: d })),
      }),
    }));
  }
  if (a.line.length > 0) {
    const shown = a.line.slice(0, 100);
    parts.push(renderDisclosure({
      title: '逐日双指标明细' + (a.line.length > 100 ? '（仅列前 100 条，共 ' + a.line.length + ' 天）' : '（共 ' + a.line.length + ' 天）'),
      contentHtml: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'av', label: a.labels.a, align: 'right' },
          { key: 'bv', label: a.labels.b, align: 'right' },
        ],
        rows: shown.map((p) => ({ date: p.date, av: fmt(p.a), bv: fmt(p.b) })),
        caption: '逐日双指标（空缺留空，不断 0；全量见复制数据）',
        emptyText: '窗口内无数据',
      }),
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.combined',
      data: {
        metrics: metricsOf({
          aAvg: a.aAvg, bAvg: a.bAvg, aDelta: a.aDelta, bDelta: a.bDelta,
          aCount: a.aCount, bCount: a.bCount,
          correlationR: a.correlation.r, correlationN: a.correlation.n, days: a.days,
          seriesDays: c.series.length,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '组合分析 ' + a.labels.a + ' vs ' + a.labels.b,
    eyebrow: 'calorie.view.combined · 趋势分析域',
    subtitle: a.insight || null,
    content: parts.join(''),
    charts,
  });
}

/* ── 热量缺口（calorie_deficit.html 对照：4 KPI＋每日摄入 vs 消耗＋缺口明细表） ── */

const DEFICIT_TREND_ZH: Record<string, string> = { loss: '减重方向', gain: '增重方向', flat: '持平' };

export function buildDeficitDoc(d: DeficitData): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: d.meta.start },
        { name: 'end', label: '结束', value: d.meta.end },
      ],
      description: '缺口 = 消耗 − 摄入（正=缺口）；消耗 = TDEE＋当日运动；摄入 = 当日食物（不含水）',
    }),
    renderKpiGrid([
      { label: '日均摄入', value: String(d.summary.avgIntake), unit: '卡', detail: '目标 ' + d.target.intake + ' 卡/天' },
      { label: '日均消耗', value: String(d.summary.avgBurn), unit: '卡', detail: 'TDEE ' + d.target.tdee + ' · 运动 ' + d.summary.avgExerciseBurn + ' 卡' },
      { label: '日均缺口', value: (d.summary.avgDeficit >= 0 ? '+' : '') + d.summary.avgDeficit, unit: '卡', detail: DEFICIT_TREND_ZH[d.summary.trend] ?? d.summary.trend },
      { label: '理论减重', value: String(d.summary.predictedLossKg), unit: 'kg', detail: '周缺口 ' + d.summary.weeklyDeficit + ' 卡' },
    ]),
  ];
  let charts = false;
  if (d.series.length > 0) {
    const intake = d.series.map((s) => ({ label: s.date.slice(5), value: s.intake }));
    const burn = d.series.map((s) => ({ label: s.date.slice(5), value: s.burn }));
    parts.push(renderChartBlock({
      kind: 'line',
      title: '每日摄入 vs 消耗（虚线=消耗；水平线=摄入目标 ' + d.target.intake + ' 卡）',
      input: {
        items: intake,
        options: {
          series: [
            { name: '摄入', items: intake },
            { name: '消耗', items: burn, dashed: true },
          ],
          markLine: { value: d.target.intake, label: '目标' },
        },
      },
    }));
    charts = true;
  }
  {
    const shown = d.series.slice(0, 100);
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'intake', label: '摄入', align: 'right' },
        { key: 'burn', label: '消耗', align: 'right' },
        { key: 'deficit', label: '缺口', align: 'right' },
        { key: 'target', label: '目标', align: 'right' },
        { key: 'status', label: '状态' },
      ],
      rows: shown.map((s) => ({
        date: s.date + ' ' + s.weekday,
        intake: s.intake, burn: s.burn,
        deficit: (s.deficit >= 0 ? '+' : '') + s.deficit,
        target: d.target.intake,
        status: s.deficit >= 0 ? '缺口' : '盈余',
      })),
      caption: '缺口明细' + (d.series.length > 100 ? '（仅列前 100 条，共 ' + d.series.length + ' 天）' : '（共 ' + d.series.length + ' 天）') +
        ' · ' + d.meta.weekdayCount + ' 工作日/' + d.meta.weekendCount + ' 周末',
      emptyText: '窗口内无缺口数据',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.deficit',
      data: {
        metrics: metricsOf({
          avgIntake: d.summary.avgIntake, avgBurn: d.summary.avgBurn, avgExerciseBurn: d.summary.avgExerciseBurn,
          avgDeficit: d.summary.avgDeficit, weeklyDeficit: d.summary.weeklyDeficit, predictedLossKg: d.summary.predictedLossKg,
          days: d.meta.days, weekdayCount: d.meta.weekdayCount, weekendCount: d.meta.weekendCount,
          targetIntake: d.target.intake, targetTdee: d.target.tdee,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '热量缺口 ' + d.meta.start + ' ~ ' + d.meta.end,
    eyebrow: 'calorie.view.deficit · 趋势分析域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}

/* ── 异常诊断（anomaly_report.html 对照：诊断 KPI＋发现列表＋insight；旧截断 5→全量） ── */

export function buildAnomalyDoc(v: AnomalyView): string {
  const dg = v.diagnosis;
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'kind', label: '诊断', value: v.kind },
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: '23 种诊断（体重 6／饮食 4／运动 5／归因复盘 8）；kind 非法即 bad-input，证据不足即 missing-data，不编诊断',
    }),
    renderKpiGrid([
      { label: '诊断', value: dg.title || v.kind, detail: v.kind },
      { label: '窗口', value: v.start + ' ~ ' + v.end, detail: '有数据 ' + dg.days + ' 天' },
      { label: '发现', value: String(v.findingCount), unit: '条' },
    ]),
    renderListRows({
      items: dg.findings.map((f) => ({
        left: f.cause,
        main: '证据：' + f.evidence + '｜建议：' + f.action,
        right: f.confidence,
      })),
      emptyText: '本窗无异常发现（诊断正常）',
    }),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.anomaly',
      data: {
        metrics: metricsOf({ findingCount: v.findingCount, days: dg.days, degraded: dg.degraded ? 1 : 0 }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '异常诊断 ' + (dg.title || v.kind),
    eyebrow: 'calorie.view.anomaly · 趋势分析域',
    subtitle: dg.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 禁忌扫描（contraindication_report.html 对照：扫描概览＋命中表＋替代建议＋复制修改指令） ── */

export function buildContraDoc(v: ContraView): string {
  const s = v.scan;
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'part', label: '部位', value: v.part }],
      description: '部位 all/腰/膝/肩；命中按动作×规则逐条列出，替代选择归宿主，已选清单不进静态页',
    }),
    renderKpiGrid([
      { label: '扫描', value: CONTRA_STATUS_ZH[v.summaryStatus] ?? v.summaryStatus, detail: '部位 ' + v.part },
      { label: '会话', value: String(v.scannedSessions), unit: '个', detail: '动作 ' + v.scannedMovements + ' 个' },
      { label: '错误', value: String(v.errorCount), unit: '个' },
      { label: '警告', value: String(v.warnCount), unit: '个' },
      { label: '提示', value: String(v.infoCount), unit: '个' },
      { label: '安全变体跳过', value: String(s.safeSkipped), unit: '个' },
    ]),
  ];
  {
    const shown = s.hits.slice(0, 100);
    parts.push(renderDataTable({
      columns: [
        { key: 'movement', label: '动作' },
        { key: 'part', label: '部位' },
        { key: 'rule', label: '规则' },
        { key: 'sev', label: '级别' },
        { key: 'reason', label: '原因' },
      ],
      rows: shown.map((h) => ({
        movement: h.movementName + (h.usedIn.length > 0 ? '（' + h.usedIn.join('、') + '）' : ''),
        part: h.part, rule: h.ruleName, sev: SEV_ZH[h.severity] ?? h.severity, reason: h.reason,
      })),
      caption: '命中明细' + (s.hits.length > 100 ? '（仅列前 100 条，共 ' + s.hits.length + ' 条）' : '（共 ' + s.hits.length + ' 条）'),
      emptyText: '无命中（计划动作均通过扫描）',
    }));
  }
  if (s.suggestions.length > 0) {
    parts.push(renderListRows({
      items: s.suggestions.map((g) => ({
        left: g.movement,
        main: '原因：' + g.reason + '｜替换：' + g.replace,
        right: g.rule,
      })),
      emptyText: '无替代建议',
    }));
  }
  parts.push(dataCopyArea('复制修改指令', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.contraindication',
      data: {
        metrics: metricsOf({
          scannedSessions: v.scannedSessions, scannedMovements: v.scannedMovements,
          errorCount: v.errorCount, warnCount: v.warnCount, infoCount: v.infoCount,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '禁忌扫描（' + v.part + '）',
    eyebrow: 'calorie.view.contraindication · 趋势分析域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 体重预测（predict_report 对照：点预测 KPI＋insight；曲线归组合分析，见 §3 R4） ── */

export function buildPredictDoc(v: PredictView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
        { name: 'horizonDays', label: '预测天数', value: String(v.horizonDays) },
      ],
      description: '体重外推（horizonDays 7..180）；需≥14 天体重记录，否则 missing-data，不编预测',
    }),
    renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '预测', value: String(v.forecastValue), unit: 'kg', detail: v.horizonDays + ' 天后' },
      { label: '速率', value: String(v.ratePerWeek), unit: 'kg/周' },
      { label: '区间', value: fmt(v.forecastLo) + ' ~ ' + fmt(v.forecastHi), unit: 'kg' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          current: v.current, ratePerWeek: v.ratePerWeek, forecastValue: v.forecastValue,
          forecastLo: v.forecastLo, forecastHi: v.forecastHi, horizonDays: v.horizonDays,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重预测（' + v.horizonDays + ' 天）',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 目标预测达成（目标达成 ETA：KPI＋可行性；曲线归组合分析，见 §3 R4） ── */

export function buildGoalPredictDoc(v: GoalPredictView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: '目标预测需先定体重目标（无目标即 missing-data）；默认 14 天窗（7 天窗结构性不可达，#103 G2）',
    }),
    renderKpiGrid([
      { label: '目标', value: String(v.targetKg), unit: 'kg', detail: v.start + ' ~ ' + v.end },
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '预计达成', value: v.eta, detail: '剩余 ' + v.daysLeft + ' 天' },
      { label: '速率', value: String(v.ratePerWeek), unit: 'kg/周', detail: v.feasible ? '健康' : '超范围' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.goal-predict',
      data: {
        metrics: metricsOf({
          targetKg: v.targetKg, current: v.current, daysLeft: v.daysLeft,
          ratePerWeek: v.ratePerWeek, feasible: v.feasible ? 1 : 0,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '目标预测达成',
    eyebrow: 'calorie.view.goal-predict · 趋势分析域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}
