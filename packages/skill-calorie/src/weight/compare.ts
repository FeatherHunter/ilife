/** 对比体重（HELP 场景 03「体重」下一级）：`calorie.view.weight-compare` 读。
 *
 * 主窗口与对比窗口各收一套相对窗口：`window`／`offset` 与 `compareWindow`／`compareOffset`
 *（对比侧另收 `prev`＝紧邻主窗口之前的等长窗口）；显式四个日期照旧可用（#250 口径）。
 * 对比算式住同目录 `weightCompare*.ts`（17 场景，与老家 `weight_compare.py` 对照）。
 *
 * #334 融合：窗口面与情景面收成**同一张页**（`renderComparePage` 一份），判语只在下面
 * 「共用口径」一节派生一次：**方向词只看两段均值差的符号**、**节奏词只看两段日均速率的幅度差**，
 * 两者互不带对方的词 ⇒ 页上不会再出现「下降 ／ 加速上升」这类自相矛盾的组合
 * （老实物 `weight_compare.html:81-84` 的 `judge-line` 把两个不同的量并排印，是本页修掉的缺陷）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { anchorOf, needDay, needStr, optInt, optNum, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import type { AnalysisResult } from '../analysis/result.js';
import { applyOffset, resolveCompareWindow } from '../analysis/series.js';
import { weightCompare } from './figures.js';
import type { CompareSide, WeightCompare } from './figures.js';
import { assertRange } from './plate.js';
import type { WeightCompareView } from './plate.js';
import { renderCaliberLine, renderChartBlock, renderDataTable, renderDisclosure, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { runScenario, SCENARIO_LABELS } from './weightCompare3.js';
import type { ExtraRow, ScenarioResult } from './weightCompare.js';

const CMD_KEY = 'calorie.view.weight-compare';
/** 复制日志第 3 段后半（老实物 `.footer .src` 的口径同源）。 */
const COPY_SOURCE = 'weight_log（两段体重对比）';

/** 渲染本页的命令原文（复制日志第 3 段）：照抄可重跑。 */
const commandOf = (params: Record<string, unknown>): string =>
  'calorie-cmd-read ' + CMD_KEY + ' --params \'' + JSON.stringify(params) + '\'';

/** `calorie.view.weight-compare` · 两段体重对比（两段均值差／方向／变化幅度）。
 *
 * 两种参数面（二选一）：
 * - 窗口面（既有 9 条命令）：`window`／`compareWindow` 等，老行为不动；
 * - 情景面（#334：8 条锚点对比）：`scenario`（b8／e1／e2／e3／e5／e6／c5／d4，另收 a1–a8／b1 别名）
 *   ＋ `delta`（e3 减重 N kg，缺省 5）＋ `n`（a5 近 N 天，缺省 30）。锚点日期由算式自己派生
 *   （`findPlateau`／`scenarioB8`／`scenarioE1`／`scenarioE2`／`scenarioE3`／`scenarioE5`／
 *   `scenarioE6`／`scenarioC5`／`scenarioD4`），调用方不给日期。 */
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
  const metrics = metricsOf({
    avgDiff: v.compare.avgDiff,
    currentAvg: v.compare.currentPeriod.avgWeight, compareAvg: v.compare.comparePeriod.avgWeight,
    currentChange: v.compare.currentPeriod.changeKg, compareChange: v.compare.comparePeriod.changeKg,
  });
  return { data: { metrics }, html: buildWeightCompareDoc(v, commandOf(params)) };
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
  const compare = res.data;
  // 「条数」＝段内体重记录条数（不是区间天数；「工作日 vs 周末」这类段两者不等）：
  // 算式侧 `figures.weightCompare` 不返条数，这里按同一区间补一条计数，口径不重算。
  compare.currentPeriod.count = periodCount(db, start, end);
  compare.comparePeriod.count = periodCount(db, compareStart, compareEnd);
  return { start, end, compareStart, compareEnd, compare };
}

/** 段内体重记录条数（`weight_log` 同一区间计数）。 */
function periodCount(db: DatabaseSync, start: string, end: string): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM weight_log WHERE date >= ? AND date <= ?').get(start, end) as { n: number };
  return row.n;
}

/* ── 共用口径（#334：窗口面与情景面同一套判语／占位符／软横幅／卡片与表／复制载荷） ── */

/** 空值统一「—」（页上可见文本的占位符；**不进复制载荷**，见 `compareCopyArea`）。 */
const MISSING = '—';
/** 样本不足门槛（条）：与 `weightCompare.ts` 的 a3 口径同值（每段 ≥3 条）。 */
const SAMPLE_MIN = 3;
/** 节奏判定门槛（kg/天）：与 `figures.ts:72` 的 `0.005` 同值（＝5 g/天）。 */
const RATE_EPS = 0.005;

const numOrNull = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const fmtKg = (v: number | null | undefined): string => {
  const n = numOrNull(v);
  return n === null ? MISSING : String(n);
};
const fmtDelta = (v: number | null | undefined): string => {
  const n = numOrNull(v);
  return n === null ? MISSING : (n >= 0 ? '+' : '') + n + ' kg';
};
/** 箭头只看差值符号；差值为 0 才写持平——不借别的字段旁证方向。 */
const arrowOf = (n: number): string => (n < 0 ? '↓' : n > 0 ? '↑' : '→');
const directionWord = (n: number): string => (n < 0 ? '下降' : n > 0 ? '上升' : '持平');

/** 一段的全部页上读数（两面共用同一形状；窗口面与情景面的字段名在这里对齐，别处不再各译一遍）。 */
interface CompareSegment {
  label: string;
  range: string;
  count: number;
  avg: number | null;
  firstKg: number | null;
  lastKg: number | null;
  changeKg: number | null;
  /** 波动：情景面有、窗口面无（页上不出这一列，复制面缺位）。 */
  volatility?: number | null;
}

/** 单日段（n＝1）：均值＝期首＝期末，三列并成一列，且**读不出趋势**——只认条数，不猜区间串。 */
const isSingleDay = (s: CompareSegment): boolean => s.count === 1;
/** 单日段的区间串（`X ~ X`）压成一个日期。 */
function rangeText(s: CompareSegment): string {
  const [a, b] = s.range.split(' ~ ');
  return a !== undefined && b === a ? a : s.range;
}
/** 段跨天数（`A ~ B` 相差天数）；区间串不是「起 ~ 止」形态时回 null（如平台期的 `2026-08-01(持续 14 天)`）。 */
function spanOf(s: CompareSegment): number | null {
  const parts = s.range.split(' ~ ');
  if (parts.length !== 2) return null;
  const a = Date.parse((parts[0] as string) + 'T12:00:00Z');
  const b = Date.parse((parts[1] as string) + 'T12:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 86400000);
}
/** 段日均速率（kg/天）：净变化 ÷ 跨天数；单日段／无跨度／只有一条记录时回 null（不当 0 用）。 */
function rateOf(s: CompareSegment): number | null {
  const span = spanOf(s);
  const change = numOrNull(s.changeKg);
  if (span === null || span < 1 || s.count < 2 || change === null) return null;
  return change / span;
}
/** 段内没记录的天数（区间天数 − 记录条数）；区间串不全时不注（宁缺不猜）。 */
function gapDaysOf(s: CompareSegment): number {
  const span = spanOf(s);
  return span === null ? 0 : Math.max(0, span + 1 - s.count);
}

/** 日均速率的页上写法（g／天）：节奏判语与节奏卡的值槽共用一处定义。 */
const perDayG = (r: number): string => (r >= 0 ? '+' : '') + Math.round(r * 1000) + ' g/天';

/** 节奏判语：**两段日均速率的幅度差**（不是净变化之差——两段不等长时净变化之差不是速率）。
 *
 * 词里不出现「上升／下降」，故与方向判语不可能在同一句里互相打脸（#334 修的那个缺陷）。
 * 任一段读不出速率（单日／锚点日）时如实写「无从对照」，不给假读数。 */
interface Rhythm { readonly word: string; readonly detail: string; readonly comparable: boolean }
function rhythmOf(a: CompareSegment, b: CompareSegment): Rhythm {
  const ra = rateOf(a);
  const rb = rateOf(b);
  const segText = (s: CompareSegment, r: number | null): string =>
    s.label + ' ' + fmtDelta(s.changeKg) + (r === null ? '' : '（日均 ' + perDayG(r) + '）');
  if (ra === null || rb === null) {
    const why = isSingleDay(a) || isSingleDay(b) ? '单日段没有跨天跨度，读不出速率' : '记录不足 2 条，读不出速率';
    return { word: '无从对照', detail: b.label + ' ' + fmtDelta(b.changeKg) + ' vs ' + a.label + ' ' + fmtDelta(a.changeKg) + '：' + why, comparable: false };
  }
  const gap = Math.abs(rb) - Math.abs(ra);
  const word = gap > RATE_EPS ? '幅度更大' : gap < -RATE_EPS ? '幅度更小' : '幅度相当';
  return {
    word,
    detail: segText(b, rb) + ' vs ' + segText(a, ra),
    comparable: true,
  };
}

/** 两段卡：条数与单日两种前提直接进徽章（说「样本不足」就有警示色）。 */
const segmentCard = (s: CompareSegment): KpiCardInput => {
  const single = isSingleDay(s);
  const thin = !single && s.count < SAMPLE_MIN;
  return {
    label: s.label, value: fmtKg(s.avg), unit: 'kg',
    detail: rangeText(s) + ' · ' + s.count + ' 条',
    status: s.count === 0 ? 'empty' : single ? 'empty' : thin ? 'warn' : 'ok',
    statusText: s.count === 0 ? '无记录' : single ? '单日数据' : thin ? '样本不足 ' + s.count + ' 条' : '共 ' + s.count + ' 条',
  };
};

/** 差值卡：方向只看均值差符号（ok＝降、warn＝升、empty＝持平或暂无）。 */
const deltaCard = (delta: number | null): KpiCardInput => ({
  label: '体重对比', value: fmtDelta(delta),
  detail: delta === null ? '差值暂无' : directionWord(delta) + ' ' + arrowOf(delta),
  status: delta === null ? 'empty' : delta < 0 ? 'ok' : delta > 0 ? 'warn' : 'empty',
  statusText: delta === null ? '差值暂无' : directionWord(delta),
});

/** 两段均值差（本期 − 对比期）：任一段没有均值就是「暂无」，不当 0 参与。**全页唯一出处**。 */
const deltaOf = (a: CompareSegment, b: CompareSegment): number | null => {
  const av = numOrNull(b.avg);
  const pv = numOrNull(a.avg);
  return av === null || pv === null ? null : round2(av - pv);
};

/** 节奏卡：能对照＝ok，读不出速率＝empty，任一段样本不足＝warn（与两段卡的警示词同一个）。
 *  **值槽只放本期日均速率这一个数**（数字＋单位 g／天）；判语词（幅度更大／更小／相当／无从对照）
 *  进 `detail` 与徽章——值槽里不放词（t154 用户读数：值槽塞长文本或颜色词会把卡断行撑高）。 */
const rhythmCard = (r: Rhythm, a: CompareSegment, b: CompareSegment): KpiCardInput => {
  const thin = a.count < SAMPLE_MIN || b.count < SAMPLE_MIN;
  const rb = rateOf(b);
  return {
    label: '节奏', value: rb === null ? MISSING : perDayG(rb),
    detail: r.comparable ? r.word + ' · ' + r.detail : r.detail,
    status: !r.comparable ? 'empty' : thin ? 'warn' : 'ok',
    statusText: !r.comparable ? '无从对照' : thin ? '样本不足' : '日均速率对照',
  };
};

/** 页顶软横幅（老技能做法：样本不够不拒绝渲染，`weight_compare.html:79`）：**一条**讲全所有前提，
 *  写清「样本几条、门槛几条、为什么仍可看」；标题不占状态词，状态词只在卡片徽章里出现一次。
 *  首行（`msg`）只放样本读数，逐条口径走 `detail`（toast 的第二行，不在与关闭钮同行的首行里挤）。 */
function premiseNotice(a: CompareSegment, b: CompareSegment, anchorMiss: boolean): { msg: string; detail: string } | null {
  const thin = [b, a].filter((s) => s.count > 0 && s.count < SAMPLE_MIN);
  const singles = [b, a].filter((s) => isSingleDay(s));
  const msg: string[] = [];
  if (thin.length > 0) {
    msg.push(thin.map((s) => s.label + ' ' + s.count + ' 条').join('／') + '，低于门槛 ' + SAMPLE_MIN + ' 条');
  }
  if (anchorMiss) msg.push('对比锚点 ±3 天内无记录');
  const detail: string[] = [];
  if (thin.length > 0) detail.push('每段要 ≥' + SAMPLE_MIN + ' 条才有像样的均值差；样本不够也照常出页，差值与节奏只当参考值看');
  if (singles.length > 0) {
    detail.push(singles.map((s) => s.label).join('／') + '只有一天：均值就是当天读数，期初／期末／变化三列并成一列，节奏无从对照，这一天不代表趋势');
  }
  if (anchorMiss) detail.push('差值暂缺，其余读数照常给');
  if (msg.length === 0) return null;
  return { msg: msg.join('；') + '。', detail: detail.join('；') + '。' };
}

/** 页脚来源行（§5.5：哪张库／哪个窗口／多少条；有缺口当场注明，缺的日期不补 0）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`：页脚来源是「口径行」不是提示，
 *  故不用深色 toast 卡（#340 裁定）；本函数给的是这一句的整句文案。 */
function sourceText(a: CompareSegment, b: CompareSegment): string {
  const gaps = [b, a].filter((s) => gapDaysOf(s) > 0)
    .map((s) => s.label + '区间内 ' + gapDaysOf(s) + ' 天无记录（不计入均值，不补 0）');
  return '📊 数据来源:' + DB_FILENAME + ' · weight_log · '
    + b.label + ' ' + rangeText(b) + '（' + b.count + ' 条）／' + a.label + ' ' + rangeText(a) + '（' + a.count + ' 条）'
    + (gaps.length > 0 ? ' · ' + gaps.join('；') : ' · 区间内记录齐');
}

/* ── 两段表／结论／复制载荷（两面共用） ── */

const COMPARE_COLUMNS: DataTableColumn[] = [
  { key: 'period', label: '期别' },
  { key: 'range', label: '区间' },
  { key: 'avg', label: '均值', align: 'right' },
  { key: 'first', label: '期首', align: 'right' },
  { key: 'last', label: '期末', align: 'right' },
  { key: 'change', label: '变化', align: 'right' },
];

/** 两段表：本期在上、对比期在下（与标题／结论的读序一致）；n＝1 段把重复的三列压成一列，不静默重复。 */
function renderSegmentsTable(a: CompareSegment, b: CompareSegment, caption: string): string {
  const rowOf = (s: CompareSegment) => ({
    period: s.label, range: rangeText(s),
    avg: isSingleDay(s) ? fmtKg(s.avg) + '（n=1）' : fmtKg(s.avg),
    first: isSingleDay(s) ? MISSING : fmtKg(s.firstKg),
    last: isSingleDay(s) ? MISSING : fmtKg(s.lastKg),
    change: isSingleDay(s) ? MISSING : fmtDelta(s.changeKg),
  });
  return renderDataTable({
    columns: [...COMPARE_COLUMNS],
    rows: [rowOf(b), rowOf(a)],
    caption,
    emptyText: '对比期无记录（两段都要有记录才能对比）',
  });
}

/** 结论句（两面同形）：两段均值＋差值方向＋节奏幅度＋两段净变化。**不带「结论：」前缀**
 * ——折叠区标题已经是「结论」，正文再来一次就是同一页两处（§5.3 肉眼验收）。 */
function compareConclusion(a: CompareSegment, b: CompareSegment, delta: number | null, r: Rhythm, missReason: string): string {
  const head = b.label + '均值 ' + fmtKg(b.avg) + ' kg vs ' + a.label + '均值 ' + fmtKg(a.avg) + ' kg';
  if (delta === null) return head + '，差值暂缺（' + missReason + '）。';
  return head + '，差值 ' + fmtDelta(delta) + '（' + directionWord(delta) + ' ' + arrowOf(delta) + '），'
    + '节奏' + r.word + '（' + r.detail + '）。'
    + (isSingleDay(a) || isSingleDay(b) ? ' 含单日段（n=1）：均值＝当天读数，不代表趋势。' : '');
}

/** 复制载荷（`stat` 形，键写中文）：两段读数＋差值方向＋节奏＋结论原句。
 *
 * **可见文本写「—」，载荷保留原始值**（`docs/skills/skill-calorie/t395-融合基准.md` 裁定 2）：
 * 缺的量给 `null`（text 口径落共用占位符、json 落 `null`、csv 落空串），绝不把 `—` 写进载荷。
 * 数字走 `metricsOf` 冻结投影（§4#5：页上看到的数＝复制出去的数，缺值不当 0）。 */
function compareCopyArea(a: CompareSegment, b: CompareSegment, delta: number | null, r: Rhythm, conclusion: string, command: string): string {
  const ra = rateOf(a);
  const rb = rateOf(b);
  const nums = metricsOf({
    [b.label + '均值kg']: b.avg, [b.label + '期初kg']: b.firstKg, [b.label + '期末kg']: b.lastKg,
    [b.label + '变化kg']: b.changeKg, [b.label + '波动kg']: b.volatility ?? null,
    [a.label + '均值kg']: a.avg, [a.label + '期初kg']: a.firstKg, [a.label + '期末kg']: a.lastKg,
    [a.label + '变化kg']: a.changeKg, [a.label + '波动kg']: a.volatility ?? null,
    '均值差kg': delta,
    '日均速率差g': ra === null || rb === null ? null : Math.round((rb - ra) * 1000),
  });
  const metrics: Record<string, number | string | null> = {
    ...nums,
    [b.label + '区间']: rangeText(b), [b.label + '条数']: b.count,
    [a.label + '区间']: rangeText(a), [a.label + '条数']: a.count,
    '差值方向': delta === null ? null : directionWord(delta),
    '节奏': r.word, '结论': conclusion,
  };
  const envelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY,
    data: { metrics },
  } as unknown as SerializableEnvelope;
  return copyArea({
    data: { envelope },
    log: { envelope, copyLog: copyLog({ command, source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION }) },
  });
}

/* ── 轨迹图（`extraRows[].spark` 接线：老实物 `weight_compare.html:189-208`） ── */

/** 轨迹图计划（**量程在视图层算好**，页面只把它塞进 options；§2#2）：最小跨度 0.4kg ＋
 *  上下对称留白，边界与步长落 0.1 的整数倍，刻度 4~6 条。算式与 `weight/history.ts:225-243`
 *  同源（那边不导出，本件照抄一份；两页合并到共用位另开票，见证据件「未做到的点」）。 */
export interface CompareCurve {
  readonly title: string;
  readonly items: ReadonlyArray<{ label: string; value: number }>;
  readonly yMin: number;
  readonly yMax: number;
  readonly yTicks: number;
}
function curveOf(rows: readonly ExtraRow[] | undefined): CompareCurve | null {
  const row = (rows ?? []).find((e) => Array.isArray(e.spark) && e.spark.length >= 2);
  if (!row || !row.spark) return null;
  const items = row.spark.map((p) => ({ label: p.d, value: p.kg }));
  const values = items.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  let lo = min;
  let hi = max;
  if (hi - lo < 0.4) { const mid = (lo + hi) / 2; lo = mid - 0.2; hi = mid + 0.2; }
  const pad = Math.max(0.1, (hi - lo) * 0.1);
  const yMin = Math.floor((lo - pad) * 10) / 10;
  let yMax = Math.ceil((hi + pad) * 10) / 10;
  let tenths = Math.round((yMax - yMin) * 10);
  while (tenths < 4) { yMax = Math.round((yMax + 0.1) * 10) / 10; tenths += 1; }
  while (tenths % 5 !== 0 && tenths % 4 !== 0 && tenths % 3 !== 0) { yMax = Math.round((yMax + 0.1) * 10) / 10; tenths += 1; }
  const steps = [5, 4, 3].find((k) => tenths % k === 0) ?? 4;
  return { title: row.label, items, yMin, yMax, yTicks: steps + 1 };
}

/** 轨迹图区块：纵轴刻度与格式显式写（§5.1：不悬停也能读出一个数值）。 */
function renderCurveBlock(curve: CompareCurve): string {
  return renderChartBlock({
    kind: 'line',
    title: curve.title,
    input: {
      items: curve.items.map((p) => ({ label: p.label, value: p.value })),
      options: {
        height: 160,
        labels: 'select',
        yTicks: curve.yTicks,
        yMin: curve.yMin,
        yMax: curve.yMax,
        format: (v: number) => v.toFixed(1) + ' kg',
        showDots: true,
        emptyText: '本段无体重记录',
      },
    },
  });
}

/* ── 整页（两面共用一份装配：同一张页、同一套判语） ── */

interface CompareCore {
  readonly title: string;
  readonly eyebrow: string;
  readonly subtitle: string;
  /** 表题：窗口面写「两期对比（…）」，情景面写情景名（…）——都要印差值方向与节奏，故给函数。 */
  readonly caption: (delta: number | null, rhythm: Rhythm) => string;
  /** 第一张卡：情景面给情景名，窗口面不给。 */
  readonly lead?: KpiCardInput;
  readonly a: CompareSegment;
  readonly b: CompareSegment;
  readonly extraRows: readonly ExtraRow[];
  readonly curve: CompareCurve | null;
  readonly anchorMiss: boolean;
  readonly missReason: string;
  readonly command: string;
}

function renderComparePage(core: CompareCore): string {
  const { a, b } = core;
  const delta = deltaOf(a, b);
  const rhythm = rhythmOf(a, b);
  const conclusion = compareConclusion(a, b, delta, rhythm, core.missReason);
  const band = premiseNotice(a, b, core.anchorMiss);
  const cards: KpiCardInput[] = [];
  if (core.lead) cards.push(core.lead);
  cards.push(deltaCard(delta), segmentCard(b), segmentCard(a), rhythmCard(rhythm, a, b));
  const parts: string[] = [];
  // 页顶软横幅先于一切区块（老实物 `weight_compare.html:79` 就在 KPI 之上）。
  if (band) parts.push(notice({ title: '样本与口径', msg: band.msg, detail: band.detail, icon: 'warn' }));
  parts.push(renderKpiGrid(cards));
  parts.push(renderSegmentsTable(a, b, core.caption(delta, rhythm)));
  if (core.extraRows.length > 0) {
    // 标签进 `main`（宽列）、值进 `right`：`left` 只有 44px（给 ▲／▼／— 这类标记用），
    // 「历史平均突破耗时」这类标签塞进去会逐字换行。`left: ''` 占位——列表行栅格是
    // `44px / 1fr / auto` 自动排布，省略 `left` 会让 `main` 落进 44px 那列。
    parts.push(renderListRows({
      items: core.extraRows.map((e) => ({ left: '', main: e.label, right: e.value })),
      emptyText: '无补充对照',
    }));
  }
  if (core.curve) parts.push(renderCurveBlock(core.curve));
  parts.push(conclusionBlock(conclusion));
  parts.push(renderCaliberLine(sourceText(a, b)));
  parts.push(compareCopyArea(a, b, delta, rhythm, conclusion, core.command));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: core.title,
    eyebrow: core.eyebrow,
    subtitle: core.subtitle,
    content: parts.join(''),
    charts: core.curve !== null,
  });
}

/** 结论块（两面同形：`renderDisclosure({title:'结论', open:true})`，一页只此一处）。 */
function conclusionBlock(text: string): string {
  return renderDisclosure({ title: '结论', contentHtml: '<p>' + text + '</p>', open: true });
}

/* ── 窗口面（#332 自 `plateDocs.ts` 原样迁入：weight_compare.html 对照） ── */

/** 窗口面的 `CompareSide` → 共用段形状。 */
const sideToSegment = (label: string, s: CompareSide): CompareSegment => ({
  label, range: s.start + ' ~ ' + s.end, count: s.count ?? 0,
  avg: s.avgWeight, firstKg: s.firstWeight, lastKg: s.lastWeight, changeKg: s.changeKg,
});

export function buildWeightCompareDoc(v: WeightCompareView, command = ''): string {
  const b = sideToSegment('本期', v.compare.currentPeriod);
  const a = sideToSegment('对比期', v.compare.comparePeriod);
  return renderComparePage({
    title: '体重对比',
    eyebrow: CMD_KEY + ' · 运动身体域',
    subtitle: b.label + ' ' + rangeText(b) + ' vs ' + a.label + ' ' + rangeText(a),
    caption: (delta, r) => '两期对比（均值差 ' + fmtDelta(delta) + ' · '
      + (delta === null ? '差值暂无' : directionWord(delta) + ' ' + arrowOf(delta)) + ' · 节奏' + r.word + '）',
    a, b, extraRows: [], curve: null, anchorMiss: false,
    missReason: '两段都要有记录才能对比', command,
  });
}

/* ── 情景面（#334：8 条锚点对比＋别名，老实物 weight_compare.html 对照） ── */

/** 情景视图（窗口视图之外另立：`ScenarioResult` 与 `WeightCompare` 不同形，不并进 `plate.ts`）。
 *  `curve` 在视图层算好（量程归取数层，页面只消费）。 */
export interface ScenarioCompareView {
  scenario: string;
  scenarioLabel: string;
  result: ScenarioResult;
  curve: CompareCurve | null;
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
  const view: ScenarioCompareView = { scenario, scenarioLabel, result, curve: curveOf(result.extraRows) };
  const deltaKg = result.compare.deltaKg;
  const metrics = metricsOf({
    deltaKg,
    segACount: result.segA.count, segBCount: result.segB.count,
  });
  return { data: { metrics }, html: buildScenarioCompareDoc(view, commandOf(params)) };
}

/** 情景的 `Seg` → 共用段形状（`weightCompare*.ts` 的字段名在这里对齐一次）。 */
const segToCompare = (s: ScenarioResult['segA']): CompareSegment => ({
  label: s.label, range: s.range, count: s.count, avg: s.avg,
  firstKg: s.startKg, lastKg: s.endKg, changeKg: s.netChange, volatility: s.volatility,
});

/** 情景整页装配（画面：情景卡／两段卡／差值方向／节奏／补充对照＋轨迹图／样本前提／结论；锚点日期印在段区间里）。 */
export function buildScenarioCompareDoc(v: ScenarioCompareView, command = ''): string {
  const r = v.result;
  const a = segToCompare(r.segA);
  const b = segToCompare(r.segB);
  const delta = numOrNull(r.compare.deltaKg);
  const anchorMiss = Boolean(r.tolerance && !r.tolerance.hit);
  return renderComparePage({
    title: '对比体重',
    eyebrow: CMD_KEY + ' · 情景 ' + v.scenario,
    subtitle: v.scenarioLabel + ' · ' + a.label + ' ' + rangeText(a) + ' vs ' + b.label + ' ' + rangeText(b),
    caption: (delta, r) => v.scenarioLabel + '（差值 ' + fmtDelta(delta) + ' '
      + (delta === null ? '· ' : arrowOf(delta) + ' ' + directionWord(delta) + ' · ') + '节奏' + r.word + '）',
    /* 值槽只放差值这一个数；情景名（`对比体重：当前 vs 平台期首日`，15~21 字）进 `detail`
     * ——它是句短语，进值槽会被断成两三行（t154 用户读数）。 */
    lead: {
      label: '对比情景', value: fmtDelta(delta),
      detail: v.scenarioLabel,
      status: anchorMiss ? 'empty' : 'ok', statusText: anchorMiss ? '锚点未命中' : '锚点已命中',
    },
    a, b,
    extraRows: r.extraRows ?? [],
    curve: v.curve,
    anchorMiss,
    missReason: anchorMiss ? '对比锚点 ±3 天内无记录' : (r.sampleWarning ?? '样本不足'),
    command,
  });
}
