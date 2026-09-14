/** 量体重（HELP 场景 03「体重」下一级）：`calorie.view.weight` 读 ＋ `calorie.weight.log`／
 *  `calorie.weight.batch` 写。
 *
 * 本文件是这三条命令**事实的住处**：加一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走同目录 `records.ts`／`figures.ts`；量程走 `plate.ts` 的 `weightCurvePlan`（取数层算好，
 * 装配层只传进图表 `options`）；体重盘的视图模型与整页装配（#332 自 `plate.ts`／`plateDocs.ts`
 * 原样迁入）住本文件。
 *
 * #337 融合（老实物 `templates/weight_dashboard.html`）：卡上补 `status` 徽章（四值取冻结表）、
 * 曲线补 options（量程／刻度／单位／横轴标注／目标线／空态句）、结论由数据表改唯一形态折叠区、
 * 复制区补日志位、页末补数据来源行；**窗口内没有记录时不再阻断，改出整页空态**
 * （§5.7 肉眼验收：空窗仍是一张完整的页）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, defaultRange, fail, needArr, needNum, nums, optStr, wday } from '../shared/params.js';
import { F, R, commandLine, out } from '../shared/writeParts.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import type { AnalysisResult } from '../analysis/result.js';
import { getWeightGoalInfo, weightTrend } from './figures.js';
import type { WeightTrend } from './figures.js';
import { assertRange, weightCurvePlan } from './plate.js';
import type { WeightDashboard } from './plate.js';
import {
  renderChartBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
} from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, conclusionBlock, signed } from './plateDocs.js';
import { batchLogWeight, logWeight } from './records.js';

const VIEW_KEY = 'calorie.view.weight';

/** `calorie.view.weight` · 体重盘：首末＋均值＋变化趋势＋目标差距。窗口内 0 条＝整页空态（不阻断渲染）。 */
export function viewWeight(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const command = commandLine(VIEW_KEY, params);
  const w = buildWeightDashboardOrNull(db, start, end);
  if (w === null) {
    return { data: { metrics: nums({ recordCount: 0 }) }, html: buildWeightEmptyDoc(start, end, command) };
  }
  const t = w.trend;
  const metrics = nums({
    recordCount: t.recordCount, avgWeight: t.avgWeight,
    maxWeight: t.maxWeight, minWeight: t.minWeight,
    firstWeight: t.firstWeight, lastWeight: t.lastWeight,
    changeKg: t.changeKg, dailyChangeG: t.dailyChangeG,
    weightGoal: w.weightGoal, gapKg: w.gapKg,
  });
  return { data: { metrics }, html: buildWeightDoc(w, command) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：体重盘＝weightTrend＋目标取数） ── */

/** 窗口内有记录的体重盘；没有记录回 `null`（整页空态由装配层出，取数层不编数）。 */
function buildWeightDashboardOrNull(db: DatabaseSync, start: string, end: string): WeightDashboard | null {
  assertRange(start, end);
  let trendRes: AnalysisResult<WeightTrend>;
  try {
    trendRes = weightTrend(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) return null;
    throw e;
  }
  if (trendRes.status !== 'ok' || !trendRes.data) return null;
  const info = getWeightGoalInfo(db);
  const trend = trendRes.data;
  const gapKg = info && typeof trend.lastWeight === 'number'
    ? Math.round((trend.lastWeight - info.weightGoal) * 10) / 10
    : null;
  return {
    start, end, trend, weightGoal: info?.weightGoal ?? null, deadline: info?.deadline ?? null, gapKg,
    curve: weightCurvePlan(trend.logs.map((l) => l.weightKg), info?.weightGoal ?? null),
  };
}

/** 体重盘视图模型（对外那一条；无记录走 `missing-data`，整页空态只在 `viewWeight` 的出口分派里出）。 */
export function buildWeightDashboard(db: DatabaseSync, start: string, end: string): WeightDashboard {
  const w = buildWeightDashboardOrNull(db, start, end);
  if (w === null) throw new CalorieRenderError('missing-data', '无体重记录（' + start + ' ~ ' + end + '）');
  return w;
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_dashboard.html 对照） ── */

/** 今日卡与较上次卡（老实物 `weight_dashboard.html` 的 todayKg／todayDate／todayDelta）。 */
function todayCards(t: WeightTrend, single: boolean): KpiCardInput[] {
  const last = t.logs[t.logs.length - 1];
  const prevW = t.logs.length >= 2 ? t.logs[t.logs.length - 2]?.weightKg ?? null : null;
  const delta = prevW === null || last === undefined ? null : Math.round((last.weightKg - prevW) * 10) / 10;
  return [
    {
      label: '今日体重', value: last === undefined ? '—' : String(last.weightKg), unit: 'kg',
      detail: last === undefined ? '本窗无记录' : last.date,
      status: last === undefined ? 'empty' : 'ok',
      statusText: last === undefined ? '本窗无记录' : '已记 ' + t.recordCount + ' 条',
    },
    {
      label: '较上次', value: delta === null ? '—' : signed(delta),
      detail: prevW === null ? (single ? '单点无变化' : '暂无上次记录') : '上次 ' + prevW + ' kg',
      status: delta === null ? 'empty' : delta > 0 ? 'warn' : delta < 0 ? 'ok' : 'empty',
      statusText: delta === null ? (single ? '单点无变化' : '无对照') : delta > 0 ? '上升' : delta < 0 ? '下降' : '持平',
    },
  ];
}

/** 体重盘四卡（首末／均值／变化／距目标）；单点在读数里写「单点无均值对照」。 */
function plateCards(w: WeightDashboard): KpiCardInput[] {
  const t = w.trend;
  const single = w.curve.single;
  return [
    { label: '体重盘', value: t.firstWeight + ' → ' + t.lastWeight + ' kg', detail: t.firstDate + ' ~ ' + t.lastDate, status: 'ok', statusText: '共 ' + t.recordCount + ' 条' },
    {
      label: '均值', value: t.avgWeight + ' kg',
      detail: single ? '单点无均值对照' : '共 ' + t.recordCount + ' 条 · 极值 ' + t.minWeight + '~' + t.maxWeight,
      status: single ? 'empty' : 'ok', statusText: single ? '无对照' : '首末对照',
    },
    {
      label: '变化', value: signed(t.changeKg),
      detail: '趋势' + t.trendCn + ' · 日均 ' + t.dailyChangeG + ' g',
      status: single ? 'empty' : t.changeKg < 0 ? 'ok' : t.changeKg > 0 ? 'warn' : 'empty',
      statusText: single ? '单点无变化' : t.trendCn,
    },
    {
      label: '距目标', value: w.gapKg === null ? '—' : signed(w.gapKg),
      detail: w.weightGoal === null ? '未设体重目标 · 说「定体重目标」后可叠目标线'
        : '目标 ' + w.weightGoal + ' kg' + (w.deadline ? ' · 截止 ' + w.deadline : '')
          + (w.curve.targetInRange ? '' : '（线在量程外，不画）'),
      status: w.gapKg === null ? 'empty' : w.gapKg <= 0 ? 'ok' : 'warn',
      statusText: w.gapKg === null ? '未设目标' : w.gapKg <= 0 ? '已达目标' : '还差 ' + w.gapKg + ' kg',
    },
  ];
}

/** 结论句（引用取数层字段，不做自然语言解析；单点、未设目标各有各的说法）。 */
function weightConclusion(w: WeightDashboard): string {
  const t = w.trend;
  const bits = [w.curve.single
    ? w.start + ' ~ ' + w.end + ' 只有 1 条记录（' + t.lastWeight + ' kg），单点看不出变化，再记一条就能比较'
    : w.start + ' ~ ' + w.end + ' 共 ' + t.recordCount + ' 条，首 ' + t.firstWeight + ' → ' + t.lastWeight
      + ' kg（' + signed(t.changeKg) + '，趋势' + t.trendCn + '，日均 ' + t.dailyChangeG + ' g）'];
  if (t.recordCount >= 2) bits.push('均值 ' + t.avgWeight + ' kg');
  if (w.gapKg === null) {
    bits.push(w.weightGoal === null ? '未设体重目标' : '目标 ' + w.weightGoal + ' kg（差值暂缺）');
  } else if (w.gapKg > 0) bits.push('目标 ' + w.weightGoal + ' kg，还差 ' + w.gapKg + ' kg');
  else if (w.gapKg < 0) bits.push('目标 ' + w.weightGoal + ' kg，已低于目标 ' + Math.abs(w.gapKg) + ' kg');
  else bits.push('目标 ' + w.weightGoal + ' kg，已达目标');
  return bits.join('；') + '。';
}

/** 复制区（数据＋日志）＋页末数据来源行：来源行写法照 `diet/nutritionPortDocs.ts:58-61`。 */
function deliveryBlocks(envelope: SerializableEnvelope, command: string, sourceText: string): string {
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  }) + notice({ icon: 'info', msg: '📊 数据来源:' + sourceText });
}

function weightEnvelope(w: WeightDashboard): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: {
      metrics: metricsOf({
        recordCount: w.trend.recordCount, avgWeight: w.trend.avgWeight,
        maxWeight: w.trend.maxWeight, minWeight: w.trend.minWeight,
        firstWeight: w.trend.firstWeight, lastWeight: w.trend.lastWeight,
        changeKg: w.trend.changeKg, dailyChangeG: w.trend.dailyChangeG,
        weightGoal: w.weightGoal, gapKg: w.gapKg,
      }),
    },
  };
}

export function buildWeightDoc(w: WeightDashboard, command: string): string {
  const t = w.trend;
  const spanDays = Math.round((Date.parse(w.end) - Date.parse(w.start)) / 86400000) + 1;
  const sourceText = DB_FILENAME + ' · weight_log ｜ 窗口 ' + w.start + ' ~ ' + w.end + ' ｜ ' + t.recordCount + ' 条';
  const parts: string[] = [
    renderKpiGrid(todayCards(t, w.curve.single)),
    renderKpiGrid(plateCards(w)),
    // 老实物 weight_dashboard.html 的 h2 最近 7 天趋势：7 天内即近 7 天小图，否则全窗曲线。
    renderChartBlock({
      kind: 'line',
      title: spanDays <= 7 ? '近 7 天体重曲线' : '体重曲线',
      input: {
        items: t.logs.map((l) => ({ label: l.date.slice(5), value: l.weightKg })),
        options: {
          height: 300,
          format: (v: number) => String(v) + 'kg',
          labels: 'select',
          yTicks: w.curve.yTicks,
          yMin: w.curve.yMin,
          yMax: w.curve.yMax,
          highlightLast: true,
          ...(w.curve.single ? { markPoint: true as const } : {}),
          ...(w.curve.markLine === undefined ? {} : { markLine: w.curve.markLine }),
          emptyText: '本窗无体重记录（' + w.start + ' ~ ' + w.end + '）',
        },
      },
    }),
  ];
  // 结论卡（老实物 weight_dashboard.html 的 summaryCard／summaryText）：一页唯一形态的折叠区。
  parts.push(conclusionBlock(weightConclusion(w)));
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'kg', label: '体重', align: 'right' },
      { key: 'note', label: '备注' },
    ],
    rows: t.logs.map((l) => ({ date: l.date, kg: l.weightKg, note: l.note })),
    caption: '体重记录（' + t.firstDate + ' ~ ' + t.lastDate + '，共 ' + t.recordCount + ' 条）',
    emptyText: '本窗无体重记录（' + w.start + ' ~ ' + w.end + '）',
  }));
  parts.push(deliveryBlocks(weightEnvelope(w), command, sourceText));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重盘 ' + w.start + ' ~ ' + w.end,
    eyebrow: 'calorie.view.weight · 运动身体域',
    subtitle: '趋势' + t.trendCn + '｜' + w.start + ' ~ ' + w.end + '｜共 ' + t.recordCount + ' 条',
    content: parts.join(''),
    charts: true,
  });
}

/** 空窗整页（§5.7 肉眼验收）：标题、空态句、结论、复制区、数据来源行一件不少，不出图表空壳。 */
function buildWeightEmptyDoc(start: string, end: string, command: string): string {
  const sourceText = DB_FILENAME + ' · weight_log ｜ 窗口 ' + start + ' ~ ' + end + ' ｜ 0 条';
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: VIEW_KEY,
    data: { metrics: metricsOf({ recordCount: 0 }) },
  };
  const parts: string[] = [
    renderKpiGrid([
      { label: '今日体重', value: '—', unit: 'kg', detail: start + ' ~ ' + end + ' 无记录', status: 'empty', statusText: '本窗无记录' },
      { label: '较上次', value: '—', detail: '本窗无记录 · 无对照', status: 'empty', statusText: '无对照' },
    ]),
    renderEmptyBlock({
      title: '体重曲线',
      text: '本窗无体重记录（' + start + ' ~ ' + end + '）',
      hint: '说「记体重」记一条，曲线就有第一个点',
    }),
    conclusionBlock(start + ' ~ ' + end + ' 无体重记录，先记一条再看。'),
    deliveryBlocks(envelope, command, sourceText),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重盘 ' + start + ' ~ ' + end,
    eyebrow: 'calorie.view.weight · 运动身体域',
    subtitle: '本窗无体重记录',
    content: parts.join(''),
  });
}

/** `calorie.weight.log` · 记体重（身高缺档只留 BMI null，不阻断录入）。 */
export function writeWeightLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const kg = needNum(params, 'kg');
  if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const r = logWeight(db, kg, optStr(params, 'note') ?? '', date, optStr(params, 'time'));
  const bmiText = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
  return out(R('记体重', 'create', '已记体重 ' + r.kg + ' kg（' + bmiText + ' · ' + r.date + ' ' + r.time + '）', '记体重', 'weight_log (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: [...F.weight],
    items: [{ id: r.id, date: r.date, status: '成功', reason: '', detail: String(r.kg) }],
  }));
}

/** `calorie.weight.batch` · 批量补录体重（同日已有记录即跳过，不覆盖）。 */
export function writeWeightBatch(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const items = needArr(params, 'items');
  if (items.length > 365) fail(2, 'items 至多 365 条');
  const r = batchLogWeight(db, items.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return { date: o['date'] === undefined ? undefined : String(o['date']), kg: o['kg'] as number | undefined };
  }));
  return out(R('批量补录体重', 'create', '批量记体重：写入 ' + r.wrote + '，跳过 ' + r.skipped + '，失败 ' + r.failed, '批量补录体重', 'weight_log (写库回执)', {
    noChange: r.wrote === 0, ids: [], idSource: 'condition',
    writtenFields: r.wrote > 0 ? [...F.weightBatch] : [],
    // 整页回执的明细表吃全量逐条（写入／跳过／失败三态，失败原因照旧；摘要与计数口径一字不动）。
    items: r.items.map((x) => ({
      date: x.date, status: x.status, reason: x.reason,
      detail: x.kg === undefined ? '' : String(x.kg),
    })),
  }));
}
