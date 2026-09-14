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
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog, dataCopyArea } from '../shared/copyArea.js';
import { nowStamp } from './receipt.js';
import type { CombinedAnalysis } from './analysisPlate.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { AnomalyView, ContraView, PredictView } from './insightPlate.js';
import type { WeightTarget } from '../analysis/simulate.js';
import type {
  CalorieDeficitEta, CalorieForecast, CalorieGoalEta, CalorieStability,
  WeightSimCut, WeightSimTarget,
} from '../analysis/simulate2.js';
import type { GoalPredictView } from '../goal/goalExtraPlate.js';

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
  const windowHuman = /^(\d+)d$/.test(c.window) ? '近' + c.window.slice(0, -1) + '天' : (c.window === 'week_cur' ? '本周' : (c.window === 'month_cur' ? '本月' : c.window));
  const stripUnit = (s: string): string => s.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '') || s;
  const aShort = stripUnit(a.labels.a);
  const bShort = stripUnit(a.labels.b);
  const techNote = '<!-- 配对' + c.pair + ' 窗口' + c.window + ' 11配对白名单窗口 非法窗exit2 不静默回退 数列唯一源buildSeries 最小形态 空窗阻断 不编数 -->';
  const metaLeft = windowHuman + ' · ' + a.labels.a + '与' + a.labels.b + ' · ' + c.start + '~' + c.end;
  /* #160 肉眼返工：对齐样本太少（<3 天）时，散点／延迟相关／分层对比三节摆出来只会是一堆「—」与空图，
   *  改为**不摆空节**，把话说到摘要行里（用户反馈「表格也没什么数据」）。 */
  const alignedDays = a.correlation.n;
  const lowSample = alignedDays < 3;
  const lowSampleNote = windowHuman + '里两项都齐全的只有 ' + alignedDays + ' 天（共 ' + a.days + ' 天有记录），'
    + '样本太少、看不出关联，先攒几天数据再看。';
  const summary = lowSample ? lowSampleNote : (a.insight !== '' ? a.insight : ('共' + a.days + '天，对齐' + a.correlation.n + '天，' + corrInterp(a.correlation.r)));
  const parts: string[] = [
    techNote,
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
      title: a.labels.a + '与' + a.labels.b + '随日期变化（' + a.labels.a + '用实线、' + a.labels.b + '用虚线，两条各自一个刻度）',
      input: {
        items: aItems,
        options: {
          /* #160：空白日不补 0、只连线——没有记录的日期是 null，折线默认在 null 处断线，稀疏记录会只剩孤点。 */
          connectNulls: true,
          series: [
            { name: a.labels.a, items: aItems },
            { name: a.labels.b, items: bItems, dashed: true, ownScale: true },
          ],
        },
      },
    }));
    charts = true;
  }
  if (a.scatter.length > 0 && !lowSample) {
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
  if (a.lag.length > 0 && !lowSample) {
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
  if (a.strat.rows.length > 0 && !lowSample) {
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
    title: '看' + aShort + '与' + bShort,
    eyebrow: '',
    subtitle: null,
    metaLeft,
    badge: '卡路里 · 分析',
    summary,
    content: parts.join(''),
    charts,
  });
}

/* ── 热量缺口（calorie_deficit.html 对照：4 KPI＋每日摄入 vs 消耗＋缺口明细表＋合计行） ── */

const DEFICIT_TREND_ZH: Record<string, string> = { loss: '减重方向', gain: '增重方向', flat: '持平' };

export function buildDeficitDoc(d: DeficitData): string {
  const targetDef = d.target.weeklyDeficitPerDay;
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'start', label: '开始', value: d.meta.start }, { name: 'end', label: '结束', value: d.meta.end }],
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
        items: intake, options: {
          series: [
            { name: '摄入', items: intake },
            { name: '消耗', items: burn, dashed: true },
          ],
          /* #385：补刻度值＋数字格式（老侧 `:150-157` 的 format／yMin／yMax；同包先例 `multiTrendPage.ts:261`）；量程不写死。 */
          yTicks: 3, labels: 'select', format: (v: number) => Math.round(v).toLocaleString(), markLine: { value: d.target.intake, label: '目标' },
        },
      },
    }));
    charts = true;
  }
  const shown = d.series.slice(0, 100);
  const totals = d.series.reduce((a, s) => ({ intake: a.intake + s.intake, burn: a.burn + s.burn, deficit: a.deficit + s.deficit }), { intake: 0, burn: 0, deficit: 0 });
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
      target: (targetDef >= 0 ? '+' : '') + targetDef,
      status: s.deficit >= targetDef ? '✓ 达标' : s.deficit > 0 ? '⚠ 偏低' : '✗ 超量',
    })),
    caption: '缺口明细' + (d.series.length > 100 ? '（仅列前 100 条，共 ' + d.series.length + ' 天）' : '（共 ' + d.series.length + ' 天）') +
      ' · ' + d.meta.weekdayCount + ' 工作日/' + d.meta.weekendCount + ' 周末',
    emptyText: '窗口内无缺口数据',
  }));
  parts.push(renderListRows({ items: [
    { left: '合计摄入', main: totals.intake + ' 卡', right: d.meta.days + ' 天' },
    { left: '合计消耗', main: totals.burn + ' 卡', right: 'TDEE×天＋运动' },
    { left: '合计缺口', main: (totals.deficit >= 0 ? '+' : '') + totals.deficit + ' 卡', right: '周缺口 ' + d.summary.weeklyDeficit + ' 卡' },
  ] }));
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

/** T351 肉眼修复（order207）：复制区＝「复制数据／复制日志」双按钮。
 * 单格式数据文本＋日志文本直挂承载属性，共用页面双通道运行时，零内联脚本；
 * 无三格式菜单、无 text/json/csv 英文菜单项。块标题保留既有中文「复制修改指令」
 * （与按钮不同名，且单测钉死该串）。概览/命中表/替代建议不动。本函数不导出。 */
function contraCopyBlock(v: ContraView): string {
  const data: DataTextInput = {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.contraindication',
      data: {
        metrics: metricsOf({
          scannedSessions: v.scannedSessions, scannedMovements: v.scannedMovements,
          errorCount: v.errorCount, warnCount: v.warnCount, infoCount: v.infoCount,
        }),
      },
    },
    title: '【calorie · 禁忌扫描】',
    format: 'text',
  };
  return renderCopyBlock({
    title: '复制修改指令',
    dataText: buildDataText(data),
    logText: buildLogText({
      envelope: data.envelope,
      copyLog: copyLog({
        command: 'calorie-cmd-read calorie.view.contraindication',
        source: 'workout_plans（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  }).replace('data-action-id="ilife-copy-data"', 'id="ilife-copy-data" data-action-id="ilife-copy-data"')
    .replace('data-action-id="ilife-copy-log"', 'id="ilife-copy-log" data-action-id="ilife-copy-log"');
}

export function buildContraDoc(v: ContraView): string {
  const s = v.scan;
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'part', label: '部位', value: v.part }],
      description: '部位 all/腰/膝/肩；命中按动作×规则逐条列出，替代选择归宿主，已选清单不进静态页',
    }),
    renderKpiGrid([
      { label: '扫描', value: CONTRA_STATUS_ZH[v.summaryStatus] ?? v.summaryStatus, detail: '部位 ' + v.part },
      { label: '训练场次', value: String(v.scannedSessions), unit: '个', detail: '动作 ' + v.scannedMovements + ' 个' },
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
  parts.push(contraCopyBlock(v));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '禁忌扫描（' + v.part + '）',
    // T351 肉眼修复（order207）：眉标首段原露英文命令键，改该键既有中文 title
    // （`cli/keys.ts` 的 `CALORIE_COMBOS['calorie.view.contraindication'].title`＝「禁忌扫描」），不新增概念。
    eyebrow: '禁忌扫描 · 趋势分析域',
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

/* ── #383 · 预测体重(自定义目标)（weightTarget：预计达成日＋可行性；只改本图会碰到的预测段） ── */

export function buildPredictTargetDoc(v: WeightTarget): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target', label: '目标体重', value: String(v.target ?? '') },
      ],
      description: '按当前趋势预测达成目标体重的日期；需≥14 天体重记录，否则 missing-data，不编预测',
    }),
    renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '目标', value: String(v.target), unit: 'kg' },
      { label: '预计达成', value: String(v.eta), detail: '剩余 ' + String(v.daysLeft) + ' 天' },
      { label: '可行性', value: v.feasible ? '可行' : '超范围', detail: '速率 ' + String(v.ratePerWeek) + ' kg/周' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          target: v.target, days_left: v.daysLeft, feasible: v.feasible ? 1 : 0,
          current: v.current, ratePerWeek: v.ratePerWeek,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '预测体重(自定义目标)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 模拟减重(每天多减 cutKcal 卡)（每周掉重＋可行性；只改本图会碰到的预测段） ── */

export function buildSimCutDoc(v: WeightSimCut): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'cut_kcal', label: '每天多减', value: String(v.cutKcal ?? '') },
      ],
      description: '模拟每天多减 cut_kcal 卡的减重效果（KCAL_PER_KG=7700 折周掉重）；90 天轨迹见下',
    }),
    renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '每天多减', value: String(v.cutKcal), unit: '卡' },
      { label: '每周掉重', value: String(v.weeklyLoss), unit: 'kg/周', detail: v.feasible ? '可行' : '超范围' },
      { label: '可行性', value: v.feasible ? '可行' : '超范围', detail: String(v.assumption ?? '') },
    ]),
  ];
  if (v.forecast && v.forecast.points.length > 0) {
    const shown = v.forecast.points.slice(0, 14);
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'weight', label: '模拟体重', align: 'right' },
      ],
      rows: shown.map((p) => ({ date: p.date, weight: p.value })),
      caption: '模拟轨迹（' + v.forecast.horizonDays + ' 天，每周一点）',
      emptyText: '无模拟轨迹',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          cut_kcal: v.cutKcal, weekly_loss: v.weeklyLoss, feasible: v.feasible ? 1 : 0,
          current: v.current,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '模拟减重(每天-' + String(v.cutKcal) + '卡)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 模拟减重(自定天数减 Xkg)（所需每日缺口＋可行性；只改本图会碰到的预测段） ── */

export function buildSimTargetDoc(v: WeightSimTarget): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'target_loss', label: '想减', value: String(v.targetLoss ?? '') },
        { name: 'days_target', label: '天数', value: String(v.daysTarget ?? '') },
      ],
      description: '模拟自定天数减 Xkg 所需的每日缺口（KCAL_PER_KG=7700 反推）；可行性按每周 0.5–1.0 kg',
    }),
    renderKpiGrid([
      { label: '当前', value: String(v.current), unit: 'kg' },
      { label: '所需缺口', value: String(v.neededDeficit), unit: '卡/天', detail: String(v.daysTarget) + ' 天减 ' + String(v.targetLoss) + ' kg' },
      { label: '每周掉重', value: String(v.weeklyRate), unit: 'kg/周' },
      { label: '可行性', value: v.feasible ? '可行' : '超范围', detail: String(v.assumption ?? '') },
    ]),
  ];
  if (v.forecast && v.forecast.points.length > 0) {
    const shown = v.forecast.points.slice(0, 14);
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'weight', label: '模拟体重', align: 'right' },
      ],
      rows: shown.map((p) => ({ date: p.date, weight: p.value })),
      caption: '模拟轨迹（' + v.forecast.horizonDays + ' 天，每周一点）',
      emptyText: '无模拟轨迹',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          target_loss: v.targetLoss, days_target: v.daysTarget,
          needed_deficit: v.neededDeficit, feasible: v.feasible ? 1 : 0, current: v.current,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '模拟减重(' + String(v.daysTarget) + '天减' + String(v.targetLoss) + 'kg)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(按当前速率)（日均摄入外推＋目标对照；只改本图会碰到的预测段） ── */

export function buildCalorieForecastDoc(v: CalorieForecast): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
        { name: 'horizonDays', label: '预测天数', value: String(v.forecast?.horizonDays ?? '') },
      ],
      description: '按当前速率预测未来日均摄入；需≥14 天摄入记录，否则 missing-data，不编预测',
    }),
    renderKpiGrid([
      { label: '当前摄入', value: String(v.current), unit: '卡', detail: '日均' },
      { label: '目标', value: String(v.goal ?? '—'), unit: '卡' },
      { label: '日变化', value: String(v.dailyRate ?? '—'), unit: '卡/天' },
      { label: '摄入预测', value: String(v.forecast?.points[v.forecast.points.length - 1]?.value ?? '—'), unit: '卡' },
    ]),
  ];
  if (v.forecast && v.forecast.points.length > 0) {
    const shown = v.forecast.points.slice(0, 14);
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'intake', label: '预测摄入', align: 'right' },
      ],
      rows: shown.map((p) => ({ date: p.date, intake: p.value })),
      caption: '摄入预测轨迹（' + v.forecast.horizonDays + ' 天，每周一点）',
      emptyText: '无预测轨迹',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          calories: v.current, goal: v.goal ?? undefined,
          horizonDays: v.forecast?.horizonDays,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '摄入预测(按当前速率 ' + String(v.forecast?.horizonDays ?? '') + ' 天)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(营养目标达成预测)（均值／目标／缺口／是否在轨；只改预测段） ── */

export function buildCalorieGoalDoc(v: CalorieGoalEta): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '预测营养目标能否达成（达成判定＝日均偏离 ≤10%）；需≥14 天摄入记录',
    }),
    renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡' },
      { label: '目标', value: String(v.goal), unit: '卡' },
      { label: '缺口', value: String(v.gap), unit: '卡' },
      { label: '是否在轨', value: v.onTarget ? '在轨' : '偏离', detail: v.onTarget ? '已在目标 ±10% 内' : '超出目标 ±10%' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({
          avg: v.avg, goal: v.goal, gap: v.gap, on_target: v.onTarget ? 1 : 0,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '摄入预测(营养目标达成预测)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(卡路里缺口预测)（平均缺口＋每周掉重；只改预测段） ── */

export function buildCalorieDeficitDoc(v: CalorieDeficitEta): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '预测卡路里缺口：缺口＝(TDEE＋运动消耗)−摄入；每 7700 卡 ≈ 1 kg',
    }),
    renderKpiGrid([
      { label: '平均缺口', value: String(v.avgDeficit), unit: '卡/天' },
      { label: '每周掉重', value: String(v.weeklyLoss), unit: 'kg/周' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg_deficit: v.avgDeficit, weekly_loss: v.weeklyLoss }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '摄入预测(卡路里缺口预测)',
    eyebrow: 'calorie.view.predict · 趋势分析域',
    subtitle: v.insight || null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── #383 · 摄入预测(摄入稳定性预测)（均值／波动＋是否稳定；只改预测段） ── */

export function buildCalorieStabilityDoc(v: CalorieStability): string {
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start ?? '' },
        { name: 'end', label: '结束', value: v.end ?? '' },
      ],
      description: '预测摄入稳定性（σ ≤ 300 卡＝稳定）；需≥14 天摄入记录',
    }),
    renderKpiGrid([
      { label: '均值', value: String(v.avg), unit: '卡' },
      { label: '波动', value: String(v.sigma), unit: '卡', detail: 'σ' },
      { label: '是否稳定', value: v.stable ? '稳定' : '波动大', detail: v.stable ? 'σ ≤ 300 卡' : 'σ ＞ 300 卡' },
    ]),
  ];
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.predict',
      data: {
        metrics: metricsOf({ avg: v.avg, sigma: v.sigma, stable: v.stable ? 1 : 0 }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '摄入预测(摄入稳定性预测)',
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
