/** 对比体重（HELP 场景 03「体重」下一级）：`calorie.view.weight-compare` 读。
 *
 * 主窗口与对比窗口各收一套相对窗口：`window`／`offset` 与 `compareWindow`／`compareOffset`
 *（对比侧另收 `prev`＝紧邻主窗口之前的等长窗口）；显式四个日期照旧可用（#250 口径）。
 * 对比算式住同目录 `weightCompare*.ts`（17 场景，与老家 `weight_compare.py` 对照）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { anchorOf, needDay, needStr, nums, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import type { AnalysisResult } from '../analysis/result.js';
import { applyOffset, resolveCompareWindow } from '../analysis/series.js';
import { weightCompare } from './figures.js';
import type { WeightCompare } from './figures.js';
import { assertRange } from './plate.js';
import type { WeightCompareView } from './plate.js';
import {
  renderDataTable,
  renderKpiGrid,
} from 'base-paint/blocks';
import type { DataTableColumn } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

/** `calorie.view.weight-compare` · 两段体重对比（均值差／速率差／节奏判定）。 */
export function viewWeightCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const anchor = anchorOf(params);
  const main = windowRange(params) ?? { start: needStr(params, 'start'), end: needStr(params, 'end') };
  const cmpSpec = optStr(params, 'compareWindow');
  const [cStart, cEnd] = cmpSpec
    ? applyOffset(
        resolveCompareWindow(cmpSpec, [main.start, main.end], optStr(params, 'compareStart') ?? null, optStr(params, 'compareEnd') ?? null, anchor),
        optStr(params, 'compareOffset'),
      )
    : [needDay(params, 'compareStart'), needDay(params, 'compareEnd')];
  const v = buildWeightCompareView(db, main.start, main.end, cStart, cEnd);
  const metrics = nums({
    avgDiff: v.compare.avgDiff,
    currentAvg: v.compare.currentPeriod.avgWeight, compareAvg: v.compare.comparePeriod.avgWeight,
    currentChange: v.compare.currentPeriod.changeKg, compareChange: v.compare.comparePeriod.changeKg,
  });
  return { data: { metrics }, html: buildWeightCompareDoc(v) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：对比＝analysis/weight.weightCompare） ── */

export function buildWeightCompareView(
  db: DatabaseSync,
  start: string,
  end: string,
  compareStart: string,
  compareEnd: string,
): WeightCompareView {
  assertRange(start, end);
  assertRange(compareStart, compareEnd);
  let res: AnalysisResult<WeightCompare>;
  try {
    res = weightCompare(db, start, end, compareStart, compareEnd);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || '对比时间段内无体重记录，无法对比');
  }
  return { start, end, compareStart, compareEnd, compare: res.data };
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_compare.html 对照） ── */

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
