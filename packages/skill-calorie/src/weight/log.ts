/** 量体重（HELP 场景 03「体重」下一级）：`calorie.view.weight` 读 ＋ `calorie.weight.log`／
 *  `calorie.weight.batch` 写。
 *
 * 本文件是这三条命令**事实的住处**：加一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走同目录 `records.ts`／`figures.ts`；体重盘的视图模型与整页装配（#332 自
 * `plate.ts`／`plateDocs.ts` 原样迁入）住本文件——都是本能力内部件，没有跨能力引用。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, defaultRange, fail, needArr, needNum, nums, optStr, wday } from '../shared/params.js';
import { F, R, out } from '../shared/writeParts.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import type { AnalysisResult } from '../analysis/result.js';
import { getWeightGoalInfo, weightTrend } from './figures.js';
import type { WeightTrend } from './figures.js';
import { assertRange } from './plate.js';
import type { WeightDashboard } from './plate.js';
import {
  renderChartBlock,
  renderDataTable,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { batchLogWeight, logWeight } from './records.js';

/** `calorie.view.weight` · 体重盘：首末＋均值＋变化趋势＋目标差距。 */
export function viewWeight(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const w = buildWeightDashboard(db, start, end);
  const metrics = nums({
    recordCount: w.trend.recordCount, avgWeight: w.trend.avgWeight,
    maxWeight: w.trend.maxWeight, minWeight: w.trend.minWeight,
    firstWeight: w.trend.firstWeight, lastWeight: w.trend.lastWeight,
    changeKg: w.trend.changeKg, dailyChangeG: w.trend.dailyChangeG,
    weightGoal: w.weightGoal, gapKg: w.gapKg,
  });
  return { data: { metrics }, html: buildWeightDoc(w) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：体重盘＝weightTrend＋目标取数） ── */

export function buildWeightDashboard(db: DatabaseSync, start: string, end: string): WeightDashboard {
  assertRange(start, end);
  let trendRes: AnalysisResult<WeightTrend>;
  try {
    trendRes = weightTrend(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (trendRes.status !== 'ok' || !trendRes.data) {
    throw new CalorieRenderError('missing-data', trendRes.message || ('无体重记录（' + start + ' ~ ' + end + '）'));
  }
  const info = getWeightGoalInfo(db);
  const latest = trendRes.data.lastWeight;
  const gapKg = info && typeof latest === 'number' ? Math.round((latest - info.weightGoal) * 10) / 10 : null;
  return { start, end, trend: trendRes.data, weightGoal: info?.weightGoal ?? null, deadline: info?.deadline ?? null, gapKg };
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_dashboard.html 对照） ── */

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
    items: [{ id: r.id, date: r.date, status: '成功', reason: '', detail: r.kg + 'kg' }],
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
    items: r.items.filter((x) => x.status === '失败').slice(0, 20).map((x) => ({ status: '失败', reason: x.reason, detail: String(x.date) })),
  }));
}
