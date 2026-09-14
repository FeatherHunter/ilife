/** 对比体重（HELP 场景 03「体重」下一级）：`calorie.view.weight-compare` 读。
 *
 * 主窗口与对比窗口各收一套相对窗口：`window`／`offset` 与 `compareWindow`／`compareOffset`
 *（对比侧另收 `prev`＝紧邻主窗口之前的等长窗口）；显式四个日期照旧可用（#250 口径）。
 * 对比算式住同目录 `weightCompare*.ts`（17 场景，与老家 `weight_compare.py` 对照）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { anchorOf, needDay, needStr, nums, optInt, optNum, optStr, windowRange } from '../shared/params.js';
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
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import type { DataTableColumn } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { runScenario, SCENARIO_LABELS } from './weightCompare3.js';
import type { ScenarioResult } from './weightCompare.js';

/** `calorie.view.weight-compare` · 两段体重对比（均值差／速率差／节奏判定）。
 *
 * 两种参数面（二选一）：
 * - 窗口面（既有 9 条命令）：`window`／`compareWindow` 等，老行为不动；
 * - 情景面（#334：8 条锚点对比）：`scenario`（b8／e1／e2／e3／e5／e6／c5／d4，
 *   另收 a1–a8／b1 作别名）＋ `delta`（e3 减重 N kg，缺省 5）＋ `n`（a5 近 N 天，
 *   缺省 30）。锚点日期由算式自己派生（`findPlateau`／`scenarioB8`／`scenarioE1`／
 *   `scenarioE2`／`scenarioE3`／`scenarioE5`／`scenarioE6`／`scenarioC5`／
 *   `scenarioD4`），调用方不给日期。
 */
export function viewWeightCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const anchor = anchorOf(params);
  const scenario = optStr(params, 'scenario');
  if (scenario !== undefined) return viewWeightCompareScenario(db, scenario, params, anchor);
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

/* ── 情景面（#334：8 条锚点对比＋别名，老实物 weight_compare.html 对照） ── */

/** 情景视图（窗口视图之外另立：`ScenarioResult` 与 `WeightCompare` 不同形，不并进 `plate.ts`）。 */
export interface ScenarioCompareView {
  scenario: string;
  scenarioLabel: string;
  result: ScenarioResult;
}

/** 情景入口：同一个命令＋一个锚点参数，锚点日期由算式派生。 */
export function viewWeightCompareScenario(
  db: DatabaseSync,
  scenario: string,
  params: Record<string, unknown>,
  anchor: string,
): ViewOut {
  const scenarioLabel = (SCENARIO_LABELS as Record<string, string>)[scenario];
  if (!scenarioLabel) throw new CalorieRenderError('bad-input', '未知对比情景: ' + scenario);
  const opts = {
    delta: optNum(params, 'delta') ?? 5,
    n: optInt(params, 'n') ?? 30,
    ...(scenario === 'a2'
      ? {
        startA: needDay(params, 'start'), endA: needDay(params, 'end'),
        startB: needDay(params, 'compareStart'), endB: needDay(params, 'compareEnd'),
      }
      : {}),
    scheduleDbPath: optStr(params, 'scheduleDbPath') ?? null,
  };
  let result: ScenarioResult;
  try {
    result = runScenario(db, scenario, opts, anchor);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const view: ScenarioCompareView = { scenario, scenarioLabel, result };
  const deltaKg = result.compare.deltaKg;
  const metrics = nums({
    deltaKg: deltaKg ?? undefined,
    segACount: result.segA.count, segBCount: result.segB.count,
  });
  return { data: { metrics }, html: buildScenarioCompareDoc(view) };
}

const fmtKg = (v: number | null): string => v === null ? '—' : String(v);
const fmtDelta = (v: number | null): string => v === null ? '—' : (v >= 0 ? '+' : '') + v + ' kg';
const arrowOf = (direction: string): string =>
  direction.includes('下降') || direction.includes('更低') ? '↓' : direction.includes('上升') || direction.includes('更高') ? '↑' : '→';

/** 结论句：两段均值＋差值方向＋速度判语（一句话，不编日期）。 */
export function scenarioSummary(r: ScenarioResult): string {
  const d = r.compare.deltaKg;
  const head = r.segB.label + '均值 ' + fmtKg(r.segB.avg) + ' kg vs ' + r.segA.label + '均值 ' + fmtKg(r.segA.avg) + ' kg';
  if (d === null) return '结论：' + head + '，差值暂无（' + (r.tolerance && !r.tolerance.hit ? '对比锚点 ±3 天内无记录' : '样本不足') + '）。';
  const speed = r.compare.speed && r.compare.speed !== '—' ? '，速度' + r.compare.speed : '';
  return '结论：' + head + '，差值 ' + fmtDelta(d) + '（' + r.compare.direction + '）' + speed + '。';
}

/** 情景整页装配（对照老实物：情景徽章／两段卡／差值箭头与速度判语／补充对照／
 * 样本不足警告／结论句；锚点日期印在段区间里）。 */
export function buildScenarioCompareDoc(v: ScenarioCompareView): string {
  const r = v.result;
  const parts: string[] = [renderKpiGrid([
    { label: '对比情景', value: v.scenarioLabel },
    {
      label: '差值 ' + arrowOf(r.compare.direction), value: fmtDelta(r.compare.deltaKg),
      detail: r.compare.direction,
    },
    { label: r.segA.label, value: fmtKg(r.segA.avg), unit: 'kg', detail: r.segA.range + ' · ' + r.segA.count + ' 条' },
    { label: r.segB.label, value: fmtKg(r.segB.avg), unit: 'kg', detail: r.segB.range + ' · ' + r.segB.count + ' 条' },
  ])];
  parts.push(renderDataTable({
    columns: [...COMPARE_COLUMNS],
    rows: [
      { period: r.segA.label, range: r.segA.range, avg: fmtKg(r.segA.avg), first: fmtKg(r.segA.startKg), last: fmtKg(r.segA.endKg), change: fmtDelta(r.segA.netChange) },
      { period: r.segB.label, range: r.segB.range, avg: fmtKg(r.segB.avg), first: fmtKg(r.segB.startKg), last: fmtKg(r.segB.endKg), change: fmtDelta(r.segB.netChange) },
    ],
    caption: v.scenarioLabel + '（差值 ' + fmtDelta(r.compare.deltaKg) + ' ' + arrowOf(r.compare.direction) + ' · 速度' + r.compare.speed + '）',
    emptyText: '对比期无数据',
  }));
  if (r.extraRows && r.extraRows.length > 0) {
    parts.push(renderListRows({
      items: r.extraRows.map((e) => ({ left: e.label, main: e.value })),
    }));
  }
  if (r.tolerance && !r.tolerance.hit) {
    parts.push(notice({ title: '锚点容差', msg: r.tolerance.note ?? '对比锚点 ±3 天内无记录', icon: 'warn' }));
  }
  if (r.sampleWarning) {
    parts.push(notice({ title: '样本不足', msg: r.sampleWarning, icon: 'warn' }));
  }
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + scenarioSummary(r) + '</p>', open: true }));
  const metrics = nums({
    deltaKg: r.compare.deltaKg ?? undefined,
    segACount: r.segA.count, segBCount: r.segB.count,
  });
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.weight-compare',
      data: {
        metrics,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '对比体重',
    eyebrow: 'calorie.view.weight-compare · 情景 ' + v.scenario,
    subtitle: v.scenarioLabel + ' · ' + r.segA.label + ' ' + r.segA.range + ' vs ' + r.segB.label + ' ' + r.segB.range,
    content: parts.join(''),
    charts: false,
  });
}
