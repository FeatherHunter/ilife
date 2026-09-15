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
import { renderCaliberLine, renderChartBlock, renderDataTable, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { bulletList, factStrip, verdict, weightUiCss } from './weightUi.js';
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
/** 方向词只看差值符号；差值为 0 才写持平——不借别的字段旁证方向。
 *  #510：原来另有一个箭头帮手（`↑`／`↓`）挂在差值卡的副行上，那是方向词的第二处 ⇒ 随副行一并删。 */
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
  /** 这一段自己带的跨天数（只有平台期那段给）：区间块上的「持续 N 天」胶囊。 */
  spanDays?: number;
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
/** 每天变化量的页上写法（克）：节奏卡的副说明与结论句共用一处定义。
 *  「克」是全族统一单位（口径 §3.2：不出现 `g/天`、不 kg 与 g 两种单位并存）。 */
const perDayG = (r: number): string => {
  const g = Math.round(r * 1000);
  return g === 0 ? '每天 0 克' : '每天 ' + (g > 0 ? '+' : '-') + Math.abs(g) + ' 克';
};

/** 条数的中文短写（n=2 → 「两天」）；超出一只手就回阿拉伯数字＋单位。 */
const cnDays = (n: number): string => (n === 1 ? '一天' : n === 2 ? '两天' : n + ' 天');

/** **日期词**段名（窗口面的 `本期／对比期` ＋ 同日比那几页的 `今天`）：只有这种段名才谈得上
 *  「两段都只有一天」；锚点段（`历史最低`／`减重 5 kg 那天`）本来就不是可比区间，得逐段说名字。 */
const GENERIC_LABELS = ['本期', '对比期', '今天'];

/** 段在**本页这一组对比**里的短名（结论句与每天变化量两处共用一处定义）：
 *  有口径名（`最近 30 天`／`今天`／`运动最少`）就用口径名，没有（中间那个 `本期`）就按平均数是哪一段说。 */
const labelOfB = (b: CompareSegment, mid: string): string => (b.label === mid ? '最近这段' : b.label);
const labelOfA = (a: CompareSegment, mid: string): string => (a.label === mid ? '对比那段' : a.label);

/** 节奏判语：**两段日均速率的幅度差**（不是净变化之差——两段不等长时净变化之差不是速率）。
 *
 * 词里不出现「上升／下降」，故与方向判语不可能在同一句里互相打脸（#334 修的那个缺陷）。
 * 任一段读不出速率（单日／锚点日）时如实写「看不出快慢」，不给假读数。
 *  #503 形状化：原来另带 `basis`／`short` 两条 `·`／`；` 串（节奏卡副说明与结论句各用一处出来），
 *  #481 整改缺陷 3 又要求「同一事实不许说三遍」——两条一起删：**每天变化量**改由 `rhythmStrip()`
 *  的 `factStrip()`（「最近 30 天 平均每天 +10 克」一条一格）出，结论句只留判语词（`word`）。 */
interface Rhythm { readonly word: string; readonly comparable: boolean }
/** 两段每天变化量的**形状版**（原来在结论句里靠 `；`／` vs ` 串成一句）：一段一格，
 *  值带「平均每天」前缀，标签配「最近 30 天」这类**读者认得出来的段名**（口径 §三第 2 条）。
 *  读不出速率的那一段照实写「算不出」——不丢事实、也不编数。
 *
 *  #510（审查席 S2）：原来横排一行的两半同字号同色，单日锚点页逐字读成
 *  「今天 算不出   减重 5 kg 那天 算不出」（一句不通的话）⇒ 走 `vertical`：
 *  一枚「标签 ＋ 值」占一行、标签在左值贴右，两段各自成行（`.wui-strip-v` 的读法）。 */
function rhythmStrip(b: CompareSegment, a: CompareSegment, mid: string): string {
  const val = (r: number | null): string => (r === null ? '算不出' : '平均' + perDayG(r));
  return factStrip([
    { k: labelOfB(b, mid), v: val(rateOf(b)) },
    { k: labelOfA(a, mid), v: val(rateOf(a)) },
  ], true);
}
function rhythmOf(a: CompareSegment, b: CompareSegment): Rhythm {
  const ra = rateOf(a);
  const rb = rateOf(b);
  if (ra === null || rb === null) {
    /* 原因只写「记录不足」这一个事实：单日段的原因（没有跨天跨度）已由页顶说明说清，
     * 若在这里再写一遍「只有一天，读不出快慢」，「快慢」一词会在同一句里出现三次（口径 §2 第一条）。 */
    return { word: '看不出快慢', comparable: false };
  }
  const gap = Math.abs(rb) - Math.abs(ra);
  const word = gap > RATE_EPS ? '幅度更大' : gap < -RATE_EPS ? '幅度更小' : '幅度相当';
  return { word, comparable: true };
}

/** 段区间文本：单日段（`X ~ X` 压成一个日期）只留一枚日期，别的段照印 `起 ~ 止`。
 *  #503 形状化：原来副说明是「2026-09-01 ~ 2026-09-07 · 30 条」——区间与条数被 `·` 串成一句，
 *  而条数徽章里已经有了（「记录齐全（30 条）」／「只有一天」）⇒ 副说明只留**区间**这一件事。
 *  **这一槽只能是纯文本**：`renderKpiCard` 对 `detail` 走 `esc()`（公共层 `blocks.ts:543`），
 *  形状 HTML 塞进来会原样印成字（第一版就是这么错的，截图当场抓到）。
 *  #510：这一句**撤掉**卡片——两段的段名与区间在页题副标题里已经逐段对齐印着（`本期 X ~ Y vs
 *  对比期 Z ~ W`），卡片再印一遍是同一屏同一事实的第二、第三处（审查席实测：18 字区间串在手机 390
 *  下还会把卡副行折成两行）。 */
const segmentCard = (s: CompareSegment): KpiCardInput => {
  const single = isSingleDay(s);
  const thin = !single && s.count < SAMPLE_MIN;
  const badgeText = s.count === 0 ? '没有记录'
    : single ? '只有一天'
      : thin ? '记录太少（' + s.count + ' 条）'
        : s.count === SAMPLE_MIN ? '记录齐全' : '记录齐全（' + s.count + ' 条）';
  return {
    label: s.label, value: fmtKg(s.avg), unit: 'kg',
    status: s.count === 0 ? 'empty' : single ? 'empty' : thin ? 'warn' : 'ok',
    statusText: badgeText,
  };
};

/** 差值卡：方向只看均值差符号（ok＝降、warn＝升、empty＝持平或暂无）。
 *  #510（审查席 S2 第二类）：方向词原来在卡内印两处（副行「上升 ↑」＋ 徽章「上升」）、全屏三处
 *  （再加判语块）。现在**方向只留徽章这一处**（它是状态色）；副行撤掉——差值卡的值槽与徽章
 *  已经把这件事说全（「+0.3 kg ＋ 上升」）。算不出来的那档同理：徽章说「差值算不出」，
 *  为什么算不出来由结论块的一句判语交代（`missReason`）。 */
const deltaCard = (delta: number | null): KpiCardInput => ({
  label: '体重对比', value: fmtDelta(delta),
  status: delta === null ? 'empty' : delta < 0 ? 'ok' : delta > 0 ? 'warn' : 'empty',
  statusText: delta === null ? '差值算不出' : directionWord(delta),
});

/** 两段均值差（本期 − 对比期）：任一段没有均值就是「暂无」，不当 0 参与。**全页唯一出处**。 */
const deltaOf = (a: CompareSegment, b: CompareSegment): number | null => {
  const av = numOrNull(b.avg);
  const pv = numOrNull(a.avg);
  return av === null || pv === null ? null : round2(av - pv);
};

/** 节奏卡：能对照＝ok，读不出速率＝empty，任一段记录太少＝warn（与两段卡的警示词同一个）。
 *  **值槽只放本期每天变化量这一个数**（数字＋单位）；判语词（幅度更大／更小／相当／看不出快慢）
 *  进 `detail` 与徽章——值槽里不放词，也不放两段逐字对照（那段归结论块的「每天变化」一行）。
 *  值槽与副说明各出一个数：身上**不重复同一个数字两遍**。
 *  #481 整改缺陷 2：副说明与徽章原来逐字同词（都写「看不出快慢」）——副说明补一句「哪一段」，
 *  徽章换成状态词「记录太少」。
 *  #481 整改缺陷 5：值槽的「每天 +14 克」是**一段**平均，写全「平均每天 +14 克」，
 *  免得与卡标签「每天变化」逐字贴脸、读者分不清是这一段还是两段。
 *  #503 形状化：副说明只留**判语词这一个形状**（原来读不出时是一句 15 字的话，截图里折两行）；
 *  两段逐字对照归结论块的 `factStrip()`，卡片这一格不再复述它。 */
const rhythmCard = (r: Rhythm, a: CompareSegment, b: CompareSegment): KpiCardInput => {
  const thin = a.count < SAMPLE_MIN || b.count < SAMPLE_MIN;
  const rb = rateOf(b);
  return {
    label: '每天变化',
    value: rb === null ? MISSING : '平均' + perDayG(rb),
    detail: r.word,
    status: !r.comparable ? 'empty' : thin ? 'warn' : 'ok',
    statusText: r.comparable && !thin ? '两段可比' : '记录太少',
  };
};

/** 页顶软横幅（老技能做法：记录不够也照常出页，`weight_compare.html:79`）：**一条**讲全所有前提，
 *  写清「记了几条、看这张页要几条、为什么仍可看」；标题不占状态词，状态词只在卡片徽章里出现一次。
 *  首行（`msg`）只放记录条数读数；逐条说明走**逐条列表**（`bulletList()`）。
 *  **这些说明是「提防读者按提示去做某事的阻止话」**（「只当参考值看」「也不代表趋势」），
 *  不是量本身——所以它们不进卡片与结论块，也不会成为第二处读数（口径 §三第 2 条）。
 *  #503 形状化：原来 `msg`／`detail` 两处都用 `；` 串成一整句，读者数不出几个前提；
 *  改成一前提一行（口径 §一：提示块里「前提一；前提二；前提三」→ `bulletList()`）。 */
interface PremiseBand { readonly msg: string; readonly items: readonly string[] }
function premiseNotice(a: CompareSegment, b: CompareSegment, mid: string, anchorMiss: boolean): PremiseBand | null {
  const thin = [b, a].filter((s) => s.count > 0 && s.count < SAMPLE_MIN);
  const singles = [b, a].filter((s) => isSingleDay(s));
  const msg: string[] = [];
  if (thin.length > 0) {
    msg.push(thin.map((s) => s.label + ' ' + s.count + ' 条').join('／') + '，低于 ' + SAMPLE_MIN + ' 条');
  }
  if (anchorMiss) msg.push('参照日前后 3 天都没有体重记录');
  if (msg.length === 0) return null;
  const items: string[] = [];
  if (thin.length > 0) {
    items.push('两段各要 ' + SAMPLE_MIN + ' 条以上，平均体重差才有参考价值。');
    items.push('记录不够也照常出页，差值与每天变化量只当参考值看。');
  }
  const singleParts = singles.filter((s) => !thin.includes(s)).map((s) => s.label);
  /* 「两段都只有一天」只在**两段的段名都是日期词**时才说（`今天 vs 一年前今天`／`本周 vs 上周` 那种）。
   * 锚点段另有自己的名字（`历史最低`／`今夏以来最低`／`减重 5 kg 那天`）时，说「两段都只有一天」是错的
   * ——那两段本来就不是「两段可比区间」，把段名逐条说出来才对（手机截图当场抓到这处）。 */
  const genericLabel = (s: CompareSegment): boolean => GENERIC_LABELS.indexOf(s.label) >= 0;
  if (singles.length === 2 && singles.every(genericLabel)) {
    /* `thin` 那一支已经把两个段名连同条数说了，这里不重复它们（本函数只出它自己那几分信息）。 */
    if (singleParts.length === 0) items.push('两段都只有一天：平均数就是那天的读数，看不出快慢，也不代表趋势。');
  } else {
    for (const s of singles) {
      if (thin.includes(s)) continue;
      items.push(s.label + '只有' + cnDays(s.count) + '：平均数就是那天的读数，看不出快慢，也不代表趋势。');
    }
  }
  if (anchorMiss) items.push('差值暂时算不出来，其余读数照常给。');
  return items.length === 0 ? null : { msg: msg.join('；') + '。', items };
}

/** 页脚来源行（§5.5：哪张库／哪个窗口／多少条；有缺口当场注明，缺的日期不补 0）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`：页脚来源是「口径行」不是提示，
 *  故不用深色 toast 卡（#340 裁定）；句式与全族 58 页统一（口径 §3.1 一行一句）。
 *  #481 整改裁定 F：**库表名退出可见面**（`calorie_data.db`／`weight_log` 只在复制日志第 3 段留）。
 *  #481 整改裁定 H：句式与「明细族」同形——`来源 ｜ 窗口 ｜ 共 N 条`三段（旧句把两段各自的条数
 *  挤进页脚，两族形状不同）；两段各自的条数住两段卡与表内，页脚只说全窗。 */
function sourceText(a: CompareSegment, b: CompareSegment): string {
  const rows = [b, a];
  /* 全窗＝两段日期的**最早到最晚**：段序不保证时间序（情景面 segB 是「当前／运动最多」那段，
   * 可能比 segA 晚，也可能像 c5 那样早），故取极值而不是「先 b 后 a」。 */
  const dates = rows.map(rangeText).join(' ').match(/\d{4}-\d\d-\d\d/g) ?? [];
  const first = dates.length > 0 ? dates.reduce((m, d) => (d < m ? d : m)) : rangeText(a);
  const last = dates.length > 0 ? dates.reduce((m, d) => (d > m ? d : m)) : rangeText(b);
  const window = first === last ? first : first + ' ~ ' + last;
  const count = rows.reduce((n, s) => n + s.count, 0);
  return '📊 数据来源：体重记录 ｜ 窗口 ' + window + ' ｜ 共 ' + count + ' 条';
}

/* ── 两段表／结论／复制载荷（两面共用） ── */

/* 表头人话（#481 整改缺陷 11）：`时段／均值／期初／期末` 是行话，换成读者一看就懂的词。
 * 键名（`period`／`avg`／`first`／`last`）是机器面，一字不改。 */
const COMPARE_COLUMNS: DataTableColumn[] = [
  { key: 'period', label: '哪一段' },
  { key: 'range', label: '区间' },
  { key: 'avg', label: '平均', align: 'right' },
  { key: 'first', label: '开始时', align: 'right' },
  { key: 'last', label: '结束时', align: 'right' },
  { key: 'change', label: '变化', align: 'right' },
];

/** 两段表：本期在上、对比期在下（与标题／结论的读序一致）；单日段的三列写「—」（表头与列数**不缩**，
 *  #481 整改缺陷 4 把页顶那句「三列并成一列」的承诺删了——页面从来没并过）。
 *  三个「—」不解释，读者会以为数据丢了；这件事页顶说明与卡片徽章已各说一处，表内不再第三次注（口径 §2 第一条）。 */
function renderSegmentsTable(a: CompareSegment, b: CompareSegment, caption: string): string {
  const rowOf = (s: CompareSegment) => ({
    period: s.label, range: rangeText(s),
    avg: fmtKg(s.avg),
    first: isSingleDay(s) ? MISSING : fmtKg(s.firstKg),
    last: isSingleDay(s) ? MISSING : fmtKg(s.lastKg),
    change: isSingleDay(s) ? MISSING : fmtDelta(s.changeKg),
  });
  return renderDataTable({
    columns: [...COMPARE_COLUMNS],
    rows: [rowOf(b), rowOf(a)],
    caption,
    emptyText: '对比期没有记录（两段都有记录才能对比）',
  });
}

/** 结论块的两件东西：**一句话判语** ＋ **每天变化量那一行**。
 *  —— 判语一页只此一句；每天变化量（两段各一格）是原来那句 `；`／` vs ` 串的形状版。 */
interface Conclusion { readonly sentence: string; readonly strip: string }

/** 结论判语（两面同形）：**一句话**说「两段之间这个差别算不算大」。
 *  **不带「结论：」前缀**——折叠区标题已经是「结论」，正文再来一次就是同一页两处（§5.3 肉眼验收）。
 *  **每天变化量不进这句**（#481 整改缺陷 3 的「同一事实不许说三遍」）：两段逐字对照归 `strip`。
 *
 *  #510 同屏事实收敛（审查席 S2 第二、三类）：这一句原来把「两段各自的均值 ＋ 差值 ＋ 方向词 ＋
 *  幅度判语」逐条念一遍——那几件各住在「体重对比」的值槽与徽章、「本期」「对比期」两张卡的值槽、
 *  表题里，判语块成了同一屏第三、第四处。现在判语**只说差别算不算大**（0.5kg／2kg 两档，与
 *  `RATE_EPS` 同为显示口径）：不给数、不给方向词、不复述段名与均值；算不出来时只交代原因。 */
function compareConclusion(a: CompareSegment, b: CompareSegment, delta: number | null, r: Rhythm, missReason: string, mid: string): Conclusion {
  const strip = rhythmStrip(b, a, mid);
  if (delta === null) return { sentence: missReason + '，这一次的差值先给不出。', strip };
  const abs = Math.abs(delta);
  const sentence = abs < 0.5 ? '两段之间的差别很小，日常波动就能解释。'
    : abs < 2 ? '两段之间的差别看得出来，但还不到要调整的程度。'
      : '两段之间的差别不小，值得留意。';
  return { sentence, strip };
}

/** 结论块的形状版：一句话判语 ＋ **每天变化量一行**（两段各一格）。
 *  #510：判语里既不出现方向词也不挂方向胶囊（方向只留差值卡的徽章）；两段能不能对照由节奏卡的
 *  徽章（`两段可比`／`记录太少`）说，这里也不再复述。 */
function conclusionBlock(c: Conclusion): string {
  return verdict(c.sentence, c.strip === '' ? [] : [c.strip]);
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
    '每天变化量': r.word, '结论': conclusion,
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
  /** 表题：窗口面写「两期对比（…）」，情景面写情景名（…）——**只印差值**（方向与节奏判断归结论块与卡片）。 */
  readonly caption: (delta: number | null) => string;
  /** 第一张卡：情景面给情景名，窗口面不给。 */
  readonly lead?: KpiCardInput;
  readonly a: CompareSegment;
  readonly b: CompareSegment;
  /** 「中间那一段」的段名（`本期`／`当前`）：结论句与每天变化量把这两个词换成「最近这段／对比那段」，
   *  其余段名（`最近 30 天`／`今天`／`运动最少`）原样用——它们是自解的口径名。 */
  readonly mid: string;
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
  const conclusion = compareConclusion(a, b, delta, rhythm, core.missReason, core.mid);
  const band = premiseNotice(a, b, core.mid, core.anchorMiss);
  const cards: KpiCardInput[] = [];
  if (core.lead) cards.push(core.lead);
  cards.push(deltaCard(delta), segmentCard(b), segmentCard(a), rhythmCard(rhythm, a, b));
  // 页内样式放装配的**第一项**（`weightUi.ts` 的形状词汇：事实条／窗口条／逐条列表／判语块）。
  const parts: string[] = [weightUiCss()];
  // 页顶软横幅先于一切区块（老实物 `weight_compare.html:79` 就在 KPI 之上）：
  // 首行是记录条数读数（共用提示块），**逐条前提**紧随其后成列表（`bulletList()`，一前提一行）。
  if (band) {
    parts.push(notice({ title: '记录与说明', msg: band.msg, icon: 'warn' }));
    parts.push(bulletList(band.items));
  }
  parts.push(renderKpiGrid(cards));
  parts.push(renderSegmentsTable(a, b, core.caption(delta)));
  if (core.extraRows.length > 0) {
    // 标签进 `main`（宽列）、值进 `right`：`left` 只有 44px（给 ▲／▼／— 这类标记用），
    // 长标签塞进去会逐字换行。**不给 `left`**——组件会给这类行加
    // `-no-left` 修饰类、那一列不占位。
    parts.push(renderListRows({
      items: core.extraRows.map((e) => ({ main: e.label, right: e.value })),
      emptyText: '无补充对照',
    }));
  }
  if (core.curve) parts.push(renderCurveBlock(core.curve));
  parts.push(conclusionBlock(conclusion));
  parts.push(renderCaliberLine(sourceText(a, b)));
  parts.push(compareCopyArea(a, b, delta, rhythm, conclusion.sentence, core.command));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: core.title,
    eyebrow: '',
    subtitle: core.subtitle,
    content: parts.join(''),
    charts: core.curve !== null,
  });
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
    eyebrow: '',
    subtitle: b.label + ' ' + rangeText(b) + ' vs ' + a.label + ' ' + rangeText(a),
    /* #510：表题不再复述差值（审查席 S2 第三类：同一个数在值槽／表题／判语块印三处）——
     * 那一个数住「体重对比」卡的值槽与表内「变化」列，表题只说这张表是什么。 */
    caption: () => '两期对比（本期在上）',
    a, b, mid: '本期', extraRows: [], curve: null, anchorMiss: false,
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

/** 情景名**上屏那一份**（#481 整改缺陷 1／12）：
 *  ① `e3` 的名字带着没替换的模板占位符（`减重 N kg 那天 vs 今天`），读者读不出是哪一天
 *     ⇒ 在**渲染层**把 `N` 换成调用方给的 kg；
 *  ② `b8`／`e5`／`e6` 三个词是行话（`平台期首日`／`入夏最低`／`入冬最低`）
 *     ⇒ 换成读者一看就懂的 `平台期第一天`／`今夏以来最低`／`今冬以来最低`。
 *  **`SCENARIO_LABELS` 的键与值一字不动**——键形连路由，值仍是冻结表原文（老实物同名）。
 *  别的键的 `N` 另有含义（`a5` 的「近 N 天」是参数名不是数字）⇒ 只认这几条，不写通用替换。 */
/** 上屏要换掉的行话词（键＝情景键，值＝[冻结表原文里的那个词, 换成人话的词]）。 */
const SPOKEN_WORDS: Record<string, readonly [string, string]> = {
  b8: ['平台期首日', '平台期第一天'],
  e5: ['入夏最低', '今夏以来最低'],
  e6: ['入冬最低', '今冬以来最低'],
};

function onScreenLabel(scenario: string, rawLabel: string, deltaKg: number): string {
  const pair = SPOKEN_WORDS[scenario];
  let label = pair === undefined ? rawLabel : rawLabel.replace(pair[0], pair[1]);
  if (scenario === 'e3') label = label.replace('减重 N kg 那天', '减重 ' + deltaKg + ' kg 那天');
  return label;
}

/** 情景入口：同一个命令＋一个锚点参数，锚点日期由算式派生。 */
export function viewWeightCompareScenario(
  db: DatabaseSync,
  scenario: string,
  params: Record<string, unknown>,
  anchor: string,
): ViewOut {
  const rawLabel = (SCENARIO_LABELS as Record<string, string>)[scenario];
  if (!rawLabel) throw new CalorieRenderError('bad-input', '未知对比情景: ' + scenario);
  const deltaArg = optNum(params, 'delta') ?? 5;
  const scenarioLabel = onScreenLabel(scenario, rawLabel, deltaArg);
  const opts = {
    delta: deltaArg,
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
  ...(s.spanDays === undefined ? {} : { spanDays: s.spanDays }),
});

/** 情景整页装配（画面：情景卡／两段卡／差值方向／每天变化／补充对照＋轨迹图／样本前提／结论；锚点日期印在段区间里）。 */
export function buildScenarioCompareDoc(v: ScenarioCompareView, command = ''): string {
  const r = v.result;
  const a = segToCompare(r.segA);
  const b = segToCompare(r.segB);
  const delta = numOrNull(r.compare.deltaKg);
  const anchorMiss = Boolean(r.tolerance && !r.tolerance.hit);
  const singleB = isSingleDay(b);
  /* 情景卡只说**跟哪一天／哪一段比**（值槽放短标签，不放句子、也不放差值）：
   * 差值那一个数已经住了「体重对比」卡；情景名在页题副标题与表题各有一处 ⇒ 本卡不重复它们。 */
  return renderComparePage({
    title: '对比体重',
    /* 眉标整行删（本轮裁定）：原来印的是 `calorie.view.weight-compare · 情景 b8` 这类**内部代号**，
     * 与页题副标题逐字重复 ⇒ 权重域全族一律不出这一行（`assembleDocPage` 收空串即不出）。 */
    eyebrow: '',
    /* 副标题只印两段的区间：情景业务名与标题行逐字相同，写在这里就是同一页第二处（口径 §2 第一条）。 */
    subtitle: a.label + ' ' + rangeText(a) + ' vs ' + b.label + ' ' + rangeText(b),
    /* #510：同上——表题不带差值那个数（它住「体重对比」卡的值槽）；情景名是这张表的读法，留着。 */
    caption: () => v.scenarioLabel + '（当前在上）',
    /* 情景卡整张删（本轮裁定）：它印的参照段标签与页题副标题逐字重复，徽章「已找到这一天」是
     * 正常态（页能出，正说明那一天找到了）；真没找到时页顶软横幅已用「参照日前后 3 天都没有体重记录」据实说明。 */
    a, b, mid: '当前',
    extraRows: r.extraRows ?? [],
    curve: v.curve,
    anchorMiss,
    missReason: anchorMiss ? '对比锚点 ±3 天内无记录' : (r.sampleWarning ?? '样本不足'),
    command,
  });
}
