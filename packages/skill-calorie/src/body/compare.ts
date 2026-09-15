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
  renderCaliberLine,
  renderConclusionBar,
  renderDataTable,
  renderKpiGrid,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { avgCompositionInRange, MEASUREMENT_FIELDS, MEASUREMENT_ZH } from '../fetch/body.js';
import { buildBodyMeasureCompare } from './bodyPlate.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { dayField, nums, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；与 bodyDocs.ts 同值）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/* 本文件各页共用的 head 标题：域名只说人话，不拿 `·` 串（负责人第 4／5 条——那个分隔符
 * 是「该做形状」的信号，页签文字里落不了形状，就只写一个词）。同域的 `bodyDocs.ts` 另有一份
 * 同名（域票改它时应保持本值一致）。 */
const DOC_TITLE = '卡路里身体细节';

/** 徽标（本族两页共用一词）。 */
const BADGE = '身体细节';

/** 页码 ①：`assembleDocPage` 的 `pageUi` 位（页面级移动端配方：安全区／44px 触摸区／640 档
 *  字号下限与读数卡两格／页内导航横滑／表格卡片化，配方本体在 `base-render/src/pageUi.ts`）。 */
const PAGE_UI = true;

/** 期别日期人话：单日只写那一天；跨日写「起至止」，**不拿 `~` 顶替「至」**（第 5 条）。 */
function rangeText(from: string, to: string): string {
  return from === to ? from : from + ' 至 ' + to;
}

/* 围度 13 项中文名：一律取 `fetch/body.ts` 的 `MEASUREMENT_ZH`（#440 前本件自持过一份同字表，同源已收）；
 * 英文列序以 `fetch/body.ts` 的 `MEASUREMENT_FIELDS` 为准。 */

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
  const fmt = (n: number | null): string => (n === null ? '—' : String(n) + '%');
  const deltaTxt = v.delta === null ? '—' : (v.delta >= 0 ? '+' : '') + v.delta + '%';
  const rateTxt = v.ratePct === null ? '—' : (v.ratePct >= 0 ? '+' : '') + v.ratePct + '%';
  const dTxt = v.delta === null ? '' : v.delta > 0 ? '上升 ' + v.delta
    : v.delta < 0 ? '下降 ' + Math.abs(v.delta) : '没变';
  const sourceTxt = v.source ?? '全部来源';
  /** 结论条：一句结论 ＋ 括号里的事实条（数字只在这里出现一次，读数卡与表格不再各说一遍）。 */
  const summary = v.delta === null
    ? '两段都缺体脂率均值，算不出变化'
    : '体脂率均值从 ' + fmt(v.beforeAvg) + ' 到 ' + fmt(v.afterAvg) + '，' + dTxt
      + ' 个百分点（变化率 ' + rateTxt + '）';
  const parts: string[] = [renderKpiGrid([
    { label: '第一段', value: fmt(v.beforeAvg), detail: '这一段的体脂率均值' },
    { label: '第二段', value: fmt(v.afterAvg), detail: '这一段的体脂率均值' },
  ])];
  parts.push(renderConclusionBar(summary));
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: '期别' },
      { key: 'range', label: '日期' },
      { key: 'avg', label: '体脂率均值', align: 'right' },
      { key: 'n', label: '记录条数', align: 'right' },
      { key: 'delta', label: '比基准', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: [
      {
        period: '第一段', range: rangeText(v.p1Start, v.p1End),
        avg: fmt(v.beforeAvg), n: v.beforeN, delta: '基准', rate: '—',
      },
      {
        period: '第二段', range: rangeText(v.p2Start, v.p2End),
        avg: fmt(v.afterAvg), n: v.afterN, delta: deltaTxt, rate: rateTxt,
      },
    ],
    // 表题只交代表格的读法（两段的均值／差值由读数值与结论条说，不再抄一遍）。
    caption: '第一段是基准，第二段的差值与变化率都以它为准。',
    emptyText: '对比期无数据',
  }));
  parts.push(renderCaliberLine('两段的体脂率按各自那段的记录求平均，来源：' + sourceTxt + '。'));
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
    eyebrow: '身体细节 · 两期对比',
    badge: BADGE,
    summary: '把两段的体脂率记录各自求平均，看这一段比上一段变了多少。',
    // B 线路（给了 `metaLeft`）的正文用 `summary` 当结论行；A 线的 `subtitle` 位不写（写两处＝同一事实两处）。
    subtitle: null,
    metaLeft: '体脂率两期对比',
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
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
        field: f, zh: MEASUREMENT_ZH[f] ?? f, before: null, after: null, delta: null, ratePct: null,
      };
    }
    const ratePct = hit.before === 0 ? null : round2((hit.delta / hit.before) * 100);
    return {
      field: f, zh: MEASUREMENT_ZH[f] ?? f,
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
  const cm = (n: number | null): string => (n === null ? '—' : String(n) + 'cm');
  /** 结论条：一句判语 ＋ 括号里的事实条（部位口径只说这一处，读数卡不再抄一遍）。 */
  const verdict = nonZero === 0
    ? '两个日期的围度一个部位都没变'
    : '两个日期之间有 ' + nonZero + ' 个部位的围度变了';
  const parts: string[] = [renderKpiGrid([
    { label: '有变化的部位', value: String(nonZero), unit: '项', detail: '差值不为 0 的部位' },
    { label: '比较的部位', value: String(v.nCompared), unit: '项', detail: '两个日期都有记录的部位' },
  ])];
  parts.push(renderConclusionBar(verdict + '（前一次记录是 ' + v.date1 + '，后一次是 ' + v.date2 + '）'));
  parts.push(renderDataTable({
    columns: [
      { key: 'part', label: '部位' },
      { key: 'before', label: '前一次(cm)', align: 'right' },
      { key: 'after', label: '后一次(cm)', align: 'right' },
      { key: 'delta', label: '差值(cm)', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: v.rows.map((r) => ({
      part: r.zh,
      before: cm(r.before),
      after: cm(r.after),
      delta: r.delta === null ? '—' : (r.delta >= 0 ? '+' : '') + r.delta,
      rate: r.ratePct === null ? '—' : (r.ratePct >= 0 ? '+' : '') + r.ratePct + '%',
    })),
    caption: '前一次记录是基准，差值与变化率都以后一次减前一次算。',
    emptyText: '两期无可比部位',
  }));
  // 口径行只补表格读法（部位名单已在表内逐行，不在这里再列一遍——同一事实一页一处）。
  parts.push(renderCaliberLine(
    '只有两个日期都有记录的部位才比。差值与变化率都是后一次减前一次，单位厘米。',
  ));
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
    eyebrow: '身体细节 · 两期对比',
    badge: BADGE,
    summary: '把两个日期的围度记录摆在一起，逐部位看变了多少。',
    // 同上：B 线路的结论行走 `summary`，A 线的 `subtitle` 位不写。
    subtitle: null,
    metaLeft: '围度两期对比',
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
  });
}
