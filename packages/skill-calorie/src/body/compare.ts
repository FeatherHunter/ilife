/** 对比身体细节（HELP 一级分组「身体细节」下一级「比身体细节」）：
 *  `calorie.view.body-composition-compare`（对比体脂）＋
 *  `calorie.view.body-measure-compare`（对比围度）两条读命令。
 *
 * 取数复用既有层，不自立第二口径：
 *   体脂两段均值走 `fetch/body.ts` 新增 `avgCompositionInRange`（与
 *   `compareCompositions` 同一表同一 `AVG/MIN/COUNT` 口径，只把
 *   `<fromDate / >=toDate` 换成显式闭区间 `[start,end]`，两段各调一次）；
 *   围度双快照走 `body/bodyPlate.ts` 的 `buildBodyMeasureCompare`
 *  （即 `fetch/body.ts` 的 `compareMeasurements`，单日快照差值口径）。
 * 变化率两页都在本件算：`rate = delta / before * 100`（保留 2 位小数，
 * before 为 0 或缺数即空，不编造）。
 * 整页装配同走 `shared/docPage.ts`（`assembleDocPage`），与 `bodyDocs.ts` 同头
 * （`DOC_VERSION/DOC_SKILL/DOC_TITLE` 同值；各页自持是既有形状，不另立共用）。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  renderDataTable,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { avgCompositionInRange, MEASUREMENT_FIELDS } from '../fetch/body.js';
import { buildBodyMeasureCompare } from './bodyPlate.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { dayField, nums, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；与 bodyDocs.ts 同值）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（与 bodyDocs.ts 同值，同域同标题）。 */
const DOC_TITLE = '卡路里·运动身体';

/** 围度 13 项中文名（展示用；英文列序以 `fetch/body.ts` 的 `MEASUREMENT_FIELDS` 为准，
 * 中文与 `body/bodyDocs.ts` 的 `MEASURE_ZH` 同字，权威列序只认 fetch 那一份）。 */
const MEASURE_ZH: Record<string, string> = {
  chest_cm: '胸围', waist_cm: '腰围', abdomen_cm: '腹围', hip_cm: '臀围',
  left_thigh_cm: '左大腿', right_thigh_cm: '右大腿', left_calf_cm: '左小腿', right_calf_cm: '右小腿',
  left_arm_cm: '左上臂', right_arm_cm: '右上臂', left_forearm_cm: '左前臂', right_forearm_cm: '右前臂',
  shoulder_cm: '肩宽',
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mustISO(v: string, field: string): string {
  if (!ISO_RE.test(v)) throw new CalorieRenderError('bad-input', field + ' 非法（须 YYYY-MM-DD）：' + v);
  return v;
}

/** 单日必填（含相对词 今日／昨日／前天 与 offset 平移，与 view.ts 同口径）。 */
function needSingleDay(params: Record<string, unknown>, field: string): string {
  const v = dayField(params, field);
  if (!v) throw new CalorieRenderError('bad-input', '缺参数 ' + field + '（须 YYYY-MM-DD，如 "2026-09-05"）');
  return mustISO(v, field);
}

/* ── 对比体脂 ── */

interface BodyCompositionCompareView {
  source: string | null;
  p1Start: string;
  p1End: string;
  p2Start: string;
  p2End: string;
  beforeAvg: number | null;
  beforeN: number;
  afterAvg: number | null;
  afterN: number;
  delta: number | null;
  ratePct: number | null;
}

function resolveCompositionPeriods(params: Record<string, unknown>): {
  p1Start: string; p1End: string; p2Start: string; p2End: string; source: string | undefined;
} {
  const d1 = dayField(params, 'date1');
  const d2 = dayField(params, 'date2');
  const p1s = dayField(params, 'period1Start');
  const p1e = dayField(params, 'period1End');
  const p2s = dayField(params, 'period2Start');
  const p2e = dayField(params, 'period2End');
  let a: string;
  let b: string;
  let c: string;
  let d: string;
  if (p1s && p1e && p2s && p2e) {
    a = p1s;
    b = p1e;
    c = p2s;
    d = p2e;
  } else if (d1 && d2) {
    a = d1;
    b = d1;
    c = d2;
    d = d2;
  } else {
    throw new CalorieRenderError(
      'bad-input',
      '缺参数（两段时间或两个单日二选一）：period1Start/period1End/period2Start/period2End 或 date1/date2',
    );
  }
  mustISO(a, 'period1Start');
  mustISO(b, 'period1End');
  mustISO(c, 'period2Start');
  mustISO(d, 'period2End');
  if (a > b) throw new CalorieRenderError('bad-input', 'period1Start 不得晚于 period1End');
  if (c > d) throw new CalorieRenderError('bad-input', 'period2Start 不得晚于 period2End');
  return { p1Start: a, p1End: b, p2Start: c, p2End: d, source: optStr(params, 'source') };
}

/** `calorie.view.body-composition-compare` · 对比体脂（两段均值／差值／变化率）。 */
export function viewBodyCompositionCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { p1Start, p1End, p2Start, p2End, source } = resolveCompositionPeriods(params);
  let before: { avg_pct: number | null; min_pct: number | null; n: number };
  let after: { avg_pct: number | null; min_pct: number | null; n: number };
  try {
    before = avgCompositionInRange(db, p1Start, p1End, source);
    after = avgCompositionInRange(db, p2Start, p2End, source);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (before.n === 0) throw new CalorieRenderError('missing-data', '第一段无体脂记录（' + p1Start + ' ~ ' + p1End + '）');
  if (after.n === 0) throw new CalorieRenderError('missing-data', '第二段无体脂记录（' + p2Start + ' ~ ' + p2End + '）');
  const beforeAvg = before.avg_pct === null ? null : round2(before.avg_pct);
  const afterAvg = after.avg_pct === null ? null : round2(after.avg_pct);
  const delta = beforeAvg === null || afterAvg === null ? null : round2(afterAvg - beforeAvg);
  const ratePct = delta === null || beforeAvg === null || beforeAvg === 0
    ? null
    : round2((delta / beforeAvg) * 100);
  const v: BodyCompositionCompareView = {
    source: source ?? null,
    p1Start, p1End, p2Start, p2End,
    beforeAvg, beforeN: before.n, afterAvg, afterN: after.n, delta, ratePct,
  };
  const metrics = nums({
    beforeAvg: v.beforeAvg, afterAvg: v.afterAvg, delta: v.delta, ratePct: v.ratePct,
  });
  return { data: { metrics }, html: buildBodyCompositionCompareDoc(v) };
}

export function buildBodyCompositionCompareDoc(v: BodyCompositionCompareView): string {
  const fmt = (n: number | null, unit: string): string => (n === null ? '—' : String(n) + unit);
  const deltaTxt = v.delta === null ? '—' : (v.delta >= 0 ? '+' : '') + v.delta + '%';
  const rateTxt = v.ratePct === null ? '—' : (v.ratePct >= 0 ? '+' : '') + v.ratePct + '%';
  const parts: string[] = [renderKpiGrid([
    { label: '体脂对比', value: deltaTxt, detail: '变化率 ' + rateTxt },
    { label: '第一段', value: fmt(v.beforeAvg, '%'), detail: v.p1Start + ' ~ ' + v.p1End + ' · ' + v.beforeN + ' 条' },
    { label: '第二段', value: fmt(v.afterAvg, '%'), detail: v.p2Start + ' ~ ' + v.p2End + ' · ' + v.afterN + ' 条' },
    { label: '变化率', value: rateTxt, detail: v.source ? '来源 ' + v.source : '全部来源' },
  ])];
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: '期别' },
      { key: 'range', label: '区间' },
      { key: 'avg', label: '均值(%)', align: 'right' },
      { key: 'n', label: '条数', align: 'right' },
      { key: 'delta', label: '差值', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: [
      {
        period: '第一段', range: v.p1Start + ' ~ ' + v.p1End,
        avg: v.beforeAvg === null ? '—' : v.beforeAvg, n: v.beforeN, delta: '—', rate: '—',
      },
      {
        period: '第二段', range: v.p2Start + ' ~ ' + v.p2End,
        avg: v.afterAvg === null ? '—' : v.afterAvg, n: v.afterN, delta: deltaTxt, rate: rateTxt,
      },
    ],
    caption: '体脂两期对比（差值 ' + deltaTxt + ' · 变化率 ' + rateTxt + '）',
    emptyText: '对比期无数据',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.body-composition-compare',
      data: {
        metrics: metricsOf({
          beforeAvg: v.beforeAvg ?? undefined, afterAvg: v.afterAvg ?? undefined,
          delta: v.delta ?? undefined, ratePct: v.ratePct ?? undefined,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '对比体脂',
    eyebrow: 'calorie.view.body-composition-compare · 运动身体域',
    subtitle: v.p1Start + ' ~ ' + v.p1End + ' vs ' + v.p2Start + ' ~ ' + v.p2End,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 对比围度 ── */

export interface BodyMeasureCompareView {
  date1: string;
  date2: string;
  rows: { field: string; zh: string; before: number | null; after: number | null; delta: number | null; ratePct: number | null }[];
  nCompared: number;
}

/** `calorie.view.body-measure-compare` · 对比围度（13 项差值／变化率）。 */
export function viewBodyMeasureCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date1 = needSingleDay(params, 'date1');
  const date2 = needSingleDay(params, 'date2');
  let cmp: { date1: string; date2: string; deltas: Record<string, { before: number; after: number; delta: number }>; nCompared: number };
  try {
    cmp = buildBodyMeasureCompare(db, date1, date2);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const rows = MEASUREMENT_FIELDS.map((f) => {
    const hit = cmp.deltas[f];
    if (!hit) {
      return {
        field: f, zh: MEASURE_ZH[f] ?? f, before: null, after: null, delta: null, ratePct: null,
      };
    }
    const ratePct = hit.before === 0 ? null : round2((hit.delta / hit.before) * 100);
    return {
      field: f, zh: MEASURE_ZH[f] ?? f,
      before: hit.before, after: hit.after, delta: hit.delta, ratePct,
    };
  });
  const v: BodyMeasureCompareView = { date1, date2, rows, nCompared: cmp.nCompared };
  const metrics = nums({
    nCompared: v.nCompared,
    comparedFields: rows.filter((r) => r.delta !== null).length,
    nonZero: rows.filter((r) => r.delta !== null && r.delta !== 0).length,
  });
  return { data: { metrics }, html: buildBodyMeasureCompareDoc(v) };
}

export function buildBodyMeasureCompareDoc(v: BodyMeasureCompareView): string {
  const nonZero = v.rows.filter((r) => r.delta !== null && r.delta !== 0).length;
  const parts: string[] = [renderKpiGrid([
    { label: '围度对比', value: v.date1 + ' vs ' + v.date2, detail: '共 ' + v.nCompared + ' 项可比' },
    { label: '有差值', value: String(nonZero), unit: '项', detail: '差值 ≠ 0 的部位数' },
    { label: '部位', value: '13 项', detail: '胸/腰/腹/臀/肩/大腿/小腿/手臂/前臂(左+右)' },
  ])];
  const cell = (n: number | null, unit: string): string | number => {
    if (n === null) return '—';
    if (unit === '') return n;
    return String(n) + unit;
  };
  parts.push(renderDataTable({
    columns: [
      { key: 'part', label: '部位' },
      { key: 'before', label: '前(cm)', align: 'right' },
      { key: 'after', label: '后(cm)', align: 'right' },
      { key: 'delta', label: '差值(cm)', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: v.rows.map((r) => ({
      part: r.zh,
      before: cell(r.before, ''),
      after: cell(r.after, ''),
      delta: r.delta === null ? '—' : (r.delta >= 0 ? '+' : '') + r.delta,
      rate: r.ratePct === null ? '—' : (r.ratePct >= 0 ? '+' : '') + r.ratePct + '%',
    })),
    caption: '围度两期对比（' + v.date1 + ' vs ' + v.date2 + '，' + nonZero + ' 项有变化）',
    emptyText: '两期无可比部位',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.body-measure-compare',
      data: {
        metrics: metricsOf({ nCompared: v.nCompared, nonZero }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '对比围度',
    eyebrow: 'calorie.view.body-measure-compare · 运动身体域',
    subtitle: v.date1 + ' vs ' + v.date2,
    content: parts.join(''),
    charts: false,
  });
}
