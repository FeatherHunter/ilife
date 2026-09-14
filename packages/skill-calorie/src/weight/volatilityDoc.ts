/** #336 融合 · 波动页整页装配（`calorie.view.volatility` 一命令两读法共一份页）。
 *
 * 口径正本：`docs/skills/skill-calorie/t154-体重页面-老新融合规范.md` §5 七组。
 * 老实物出处（改写理由逐条对齐，行号经 t154 本轮盘点核对）：
 * - 阈值黄／红线进图且只画量程内：`weight_history.html:238-240`、`:275-278`（目标线同族做法）；
 * - 量程最小跨度＋上下留白，算式在取数层一处、页面只传：`weight_review.html:104-110`、
 *   `weight_dashboard.html:112-118`（本件把它落在同目录 `plate.ts:99` 的 `weightCurvePlan`）；
 * - 样本不足＝页顶软横幅、照常出页：`weight_compare.html:79`、`:132-136`；
 * - 空态两种（数据型／成功型）：`weight_history.html:300-304`、`weight_volatility_v2.html:254-256`；
 * - 复制双钮＋日志六段：`公共组件/assets/base.js:301-320`；
 * - 指标算好写进复制文本、缺值不当 0：`goal_weight.html:188-192`。
 *
 * 本页不吃老实物三项短板：手写 canvas／Y 轴无数值／单点口径分歧
 * （`weight_volatility_v2.html` 全篇 `<canvas>`；6 张全部没传 `yTicks`；两页单点一个出图一个不出）。
 */
import { renderCaliberLine, renderChartBlock, renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { weightCurvePlan } from './plate.js';
import type { VolatilityView } from './plate.js';
import { anomalyReason, volatilitySummary } from './volatility.js';
import type { VolatilityV2, VolatilityViewMode, VolLevel } from './volatility.js';

const CMD_KEY = 'calorie.view.volatility';
/** 复制日志第 3 段后半（哪张库／哪个窗口）。 */
const COPY_SOURCE = DB_FILENAME + ' ｜ weight_log（本窗体重波动）';

/** 渲染本页的命令原文（复制日志第 3 段）：照抄可重跑。 */
export function volatilityCommandOf(params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + CMD_KEY + ' --params \'' + JSON.stringify(params) + '\'';
}

/** 缺值统一「—」（页上可见文本的占位符；**不进复制载荷**，见 `t395-融合基准.md` 裁定 2）。
 *  本页 KPI／表格的数都由算式层保证在场；这一份留给后续补位用，别把 `—` 写进载荷。 */
const MISSING = '—';
/** 档位词：数据层的 `normal`／`yellow`／`red` 不动，只在显示层翻成这一套词（全页同一套）。 */
const LEVEL_WORD: Readonly<Record<VolLevel, string>> = { normal: '正常', yellow: '黄', red: '红' };
/** σ 要有像样的对照至少要 3 个点（与 `volatility.ts` 的 `rollingSigma7d`／`fullDetrendedSigma` 门槛同值）。 */
const SAMPLE_MIN = 3;

const levelWord = (l: VolLevel): string => LEVEL_WORD[l] ?? MISSING;

/** 结论句（唯一形态：`renderDisclosure({title:'结论'})` 的正文）。
 *  不含「结论：」前缀——折叠区标题已经是「结论」。
 *  `only`（只看异常点读法）不提 σ 趋势：本读法没画那张图，结论也不该引它。 */
function volatilityConclusion(o: VolatilityV2, only = false): string {
  const s = volatilitySummary(o);
  const word = levelWord(o.earlyWarning.level);
  const since = only ? ''
    : o.sigmaTrend.length > 0 ? '（σ 趋势 ' + o.sigmaTrend.length + ' 点）' : '（样本不足，不出 σ 趋势）';
  return o.points.length === 1
    ? s + '；本窗只有 1 条记录，单点无波动对照' + since + '。'
    : s + '；' + o.earlyWarning.date + ' 偏离基线 ' + o.earlyWarning.deviationKg + 'kg，档位「' + word + '」' + since + '。';
}

/** 复制载荷（`stat` 形，键写中文）：页上读数 ＋ 异常明细整表 ＋ 结论原句。
 *  数字经 `metricsOf` 冻结投影（§4#5：页上看到的数＝复制出去的数，缺值不当 0）。 */
function volatilityCopyPayload(o: VolatilityV2): SerializableEnvelope {
  const nums = metricsOf({
    '基线kg': o.baselineValue, '基线σkg': o.baselineSigma,
    '黄线kg': o.thresholds.yellow, '红线kg': o.thresholds.red,
    '窗口天数': o.days, '有记录天数': o.warnDays, '缺口天数': o.days - o.warnDays,
    '点数': o.points.length, 'σ趋势点数': o.sigmaTrend.length,
    '近期异常数': o.recentAnomalies.length,
    '最新偏离kg': o.earlyWarning.deviationKg,
  });
  const metrics: Record<string, number | string | null> = {
    ...nums,
    '基线口径': o.baselineToggleLabel,
    '基线模式': o.baselineMode,
    '预警档位': levelWord(o.earlyWarning.level),
    '预警日': o.earlyWarning.date,
    '结论': volatilityConclusion(o),
    '异常明细': o.recentAnomalies.length === 0
      ? '无'
      : o.recentAnomalies.map((p) => [p.date, String(p.kg) + 'kg', String(p.deviationKg) + 'kg',
        levelWord(p.level), anomalyReason(p, o)].join(' ｜ ')).join('；'),
  };
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY, data: { metrics },
  } as unknown as SerializableEnvelope;
}

/** 表列口径一处定义（整图面与只看异常点面共用一张表，不各抄一份）。 */
const ANOMALY_COLUMNS: DataTableColumn[] = [
  { key: 'date', label: '日期' },
  { key: 'kg', label: '体重', align: 'right' },
  { key: 'dev', label: '偏离', align: 'right' },
  { key: 'level', label: '级别' },
  { key: 'reason', label: '原因' },
];

/** 异常表（两面同一份：标题与空态句随读法变，列与行不变）。 */
function anomalyTable(o: VolatilityV2, view: VolatilityViewMode): string {
  const only = view === 'anomalies-only';
  return renderDataTable({
    columns: ANOMALY_COLUMNS,
    rows: o.recentAnomalies.map((p) => ({
      date: p.date, kg: String(p.kg) + ' kg', dev: String(p.deviationKg) + ' kg',
      level: levelWord(p.level), reason: anomalyReason(p, o),
    })),
    caption: only
      ? '波动异常点（共 ' + o.recentAnomalies.length + ' 个，只看异常点）'
      : '近 7 天异常点（共 ' + o.recentAnomalies.length + ' 个，黄/红阈上）',
    emptyText: '近期无异常点（基线 ' + o.baselineValue + ' kg，黄±' + o.thresholds.yellow
      + ' 红±' + o.thresholds.red + '）',
  });
}

/** 四张 KPI 卡与徽章：状态词只在这里出现一次，档位词恒取 `LEVEL_WORD`。
 *  `only`（只看异常点读法）不出整图，故阈值卡也不提 σ 趋势——本读法不提没画出来的东西。 */
function kpiCards(o: VolatilityV2, only: boolean): KpiCardInput[] {
  const single = o.points.length === 1;
  const gap = o.days - o.warnDays;
  const level = o.earlyWarning.level;
  const yellowN = o.recentAnomalies.filter((a) => a.level === 'yellow').length;
  const redN = o.recentAnomalies.filter((a) => a.level === 'red').length;
  return [
    {
      label: '波动分析', value: '基线 ' + o.baselineValue + ' kg',
      detail: o.baselineToggleLabel + ' · ' + o.warnDays + '/' + o.days + ' 天有记录'
        + (gap > 0 ? '（缺 ' + gap + ' 天）' : ''),
      status: single ? 'empty' : gap > 0 ? 'warn' : 'ok',
      statusText: single ? '单点' : gap > 0 ? '稀疏 ' + o.warnDays + ' 条' : '共 ' + o.warnDays + ' 条',
    },
    {
      label: '阈值', value: '黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + ' kg',
      detail: 'σ=' + o.baselineSigma + 'kg · ' + o.baselineMode + '基线'
        + (only ? '' : ' · ' + (o.sigmaTrend.length > 0 ? 'σ 对照 ' + o.sigmaTrend.length + ' 点' : '样本不足，不出 σ 趋势')),
      // 只有 1 个点时 σ 取兜底值 0.5，阈值不是从本窗数据推出来的——徽章要如实说。
      status: single ? 'empty' : o.sigmaTrend.length > 0 ? 'ok' : 'warn',
      statusText: single ? '单点阈值（兜底 σ）' : o.sigmaTrend.length > 0 ? '正常对照' : '样本不足',
    },
    {
      label: '预警', value: levelWord(level), detail: o.earlyWarning.message,
      status: level === 'red' ? 'danger' : level === 'yellow' ? 'warn' : 'ok',
      statusText: levelWord(level),
    },
    {
      label: '近期异常', value: String(o.recentAnomalies.length), unit: '个',
      detail: '黄 ' + yellowN + ' · 红 ' + redN + ' · 共 ' + o.points.length + ' 点',
      status: o.recentAnomalies.length === 0 ? 'ok' : redN > 0 ? 'danger' : 'warn',
      statusText: o.recentAnomalies.length === 0 ? '无异常点' : '黄 ' + yellowN + ' / 红 ' + redN,
    },
  ];
}

/** 偏离基线折线：**量程把两条阈值线也算进去**（算进去才画得住，§2 第 1 条「不许画了读不到」），
 *  `markLine` 只画红线那一条主阈值（图表契约一次只收一条水平线），黄线口径在标题与 KPI 里读。 */
function deviationChart(o: VolatilityV2): string {
  const budget = o.thresholds.red > 0 ? o.thresholds.red : 0.5;
  const plan = weightCurvePlan(o.points.map((p) => p.deviationKg), budget);
  return renderChartBlock({
    kind: 'line',
    title: '偏离基线（黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + 'kg）',
    input: {
      items: o.points.map((p) => ({
        label: p.date.slice(5), value: p.deviationKg, anomaly: p.level !== 'normal',
      })),
      options: {
        labels: 'select',
        yTicks: plan.yTicks,
        yMin: plan.yMin,
        yMax: plan.yMax,
        format: (n: number): string => (n > 0 ? '+' : '') + n.toFixed(1) + ' kg',
        showDots: true,
        height: 180,
        markLine: {
          value: o.thresholds.red, color: '#ff3b30',
          label: '红线 ±' + o.thresholds.red + 'kg',
        },
        emptyText: '本窗无体重记录',
      },
    },
  });
}

/** σ 趋势折线：量程只按 σ 序列算（阈值线不属于这张图的量程），刻度恒显式给。 */
function sigmaChart(o: VolatilityV2): string {
  const plan = weightCurvePlan(o.sigmaTrend.map((s) => s.sigmaKg), null);
  return renderChartBlock({
    kind: 'line',
    title: 'σ 趋势',
    input: {
      items: o.sigmaTrend.map((s) => ({ label: s.dateStart.slice(5), value: s.sigmaKg })),
      options: {
        labels: 'select',
        yTicks: plan.yTicks,
        yMin: plan.yMin,
        yMax: plan.yMax,
        format: (n: number): string => n.toFixed(2) + ' kg',
        showDots: true,
        height: 180,
        emptyText: '点数不足，出不了 σ 趋势（要 ≥' + SAMPLE_MIN + ' 条记录）',
      },
    },
  });
}

/** 页脚数据来源行（§5.5：哪张库／哪个窗口／多少条；有缺口当场注明，缺的天不补 0）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`：页脚来源是「口径行」不是提示，
 *  故不用深色 toast 卡（#340 裁定）。 */
function sourceLine(o: VolatilityV2, start: string, end: string): string {
  const gap = o.days - o.warnDays;
  return renderCaliberLine('📊 数据来源:' + DB_FILENAME + ' · weight_log · 窗口 ' + start + ' ~ ' + end
    + '（' + o.days + ' 天 · ' + o.warnDays + ' 条记录'
    + (gap > 0 ? ' · ' + gap + ' 天无记录，不计入基线、不补 0' : ' · 窗口内记录齐') + '）');
}

/** 页顶前提提示（§5.6：样本不足不拒绝渲染，走 `warn` 写清「几条／门槛几条／为什么仍可看」）。 */
function premiseNotice(o: VolatilityV2): string | null {
  if (o.points.length === 0) return null;
  if (o.points.length === 1) {
    return notice({
      title: '样本与口径', icon: 'warn',
      msg: '本窗只有 1 条体重记录：基线就是这一条读数，偏离恒为 0，σ 与阈值取兜底值 '
        + '0.5kg 档，照常出页，但这一条不代表趋势。',
    });
  }
  if (o.sigmaTrend.length === 0) {
    return notice({
      title: '样本与口径', icon: 'warn',
      msg: '本窗只有 ' + o.warnDays + ' 条记录，低于 σ 对照门槛 ' + SAMPLE_MIN
        + ' 条：偏离曲线与异常表照常给，但 σ 趋势不出，阈值用兜底值读，当参考值看。',
    });
  }
  return null;
}

/** 整页装配（`full` 与 `anomalies-only` 共一份：点进来只剩异常点的理由在页顶一句话说清）。
 *  读法与老脚本同口径：`anomalies-only` 不出曲线（老脚本 `--view anomalies-only` 语义）。 */
export function buildVolatilityPage(v: VolatilityView, view: VolatilityViewMode, command: string): string {
  const o = v.volatility;
  const only = view === 'anomalies-only';
  const subtitle = only
    ? '本读法只列越阈异常点，不出偏离曲线（要看整图请说「看体重稳不稳（增强版）」）'
    : '窗口 ' + v.start + ' ~ ' + v.end + ' · ' + o.warnDays + ' 条记录 · 基线 ' + o.baselineValue + ' kg';
  if (o.points.length === 0) {
    // 数据型空态（§5.6）：页照常是一张完整的页——标题、空态句、页脚来源行、复制区都在。
    const empty: string[] = [
      notice({ title: '本窗无体重记录', icon: 'warn', msg: '窗口 ' + v.start + ' ~ ' + v.end + ' 内没有 weight_log 记录，出不了基线与阈值。' }),
      sourceLine(o, v.start, v.end),
      copySection(volatilityCopyPayload(o), command),
    ];
    return assembleDocPage({
      docTitle: DOC_TITLE,
      title: '波动分析 ' + v.start + ' ~ ' + v.end,
      eyebrow: CMD_KEY + ' · 运动身体域',
      subtitle,
      content: empty.join(''),
      charts: false,
    });
  }
  const parts: string[] = [];
  if (only) {
    parts.push(notice({
      title: '本读法只看异常点', icon: 'info',
      msg: '这一页只列「偏离基线超过黄／红阈值」的点（共 ' + o.recentAnomalies.length + ' 个），'
        + '不出偏离曲线与 σ 趋势两张图；要看整图请说「看体重稳不稳（增强版）」。',
    }));
  }
  const premise = premiseNotice(o);
  if (premise !== null) parts.push(premise);
  parts.push(renderKpiGrid(kpiCards(o, only)));
  let charts = false;
  if (!only) {
    parts.push(deviationChart(o));
    if (o.sigmaTrend.length > 0) parts.push(sigmaChart(o));
    charts = true;
  }
  parts.push(anomalyTable(o, view));
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + volatilityConclusion(o, only) + '</p>', open: true }));
  parts.push(sourceLine(o, v.start, v.end));
  parts.push(copySection(volatilityCopyPayload(o), command));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: only ? '看波动异常点 ' + v.start + ' ~ ' + v.end : '波动分析 ' + v.start + ' ~ ' + v.end,
    eyebrow: CMD_KEY + ' · 运动身体域',
    subtitle,
    content: parts.join(''),
    charts,
  });
}

/** 复制区唯一出口（数据位＋日志位，§5.4）：日志第 3 段＝渲染命令原文，第 4 段＝库与来源。 */
function copySection(envelope: SerializableEnvelope, command: string): string {
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/** 整页对外出口（既有名字不变）：整图面／只看异常点面共用一份装配。 */
export function buildVolatilityDoc(v: VolatilityView, view: VolatilityViewMode = 'full', command = ''): string {
  return buildVolatilityPage(v, view, command);
}
