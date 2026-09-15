/** 体重复盘（HELP 场景 03「体重」下一级）：`calorie.view.weight-review` 读。
 *
 * 三形态判别式（#335 冻结，互不相交）：
 *   ① `mode === 'milestones'` → 回溯形态：已达成里程碑列表（自历史最高起 5／10／15／20kg，
 *      首达日期＋当时数值；老技能 `render_weight_review.py --type milestones` 同义）。
 *      永不出现前向预测字段（estDays／estDate），与目标复核不相交。
 *   ② 有 `window` 或 `start`＋`end` → 窗口形态：期间复盘（窗口内趋势图＋期间指标＋结论，
 *      均值差 vs 上一段等长区间；老技能 `--type week|month|90d|year|range` 同义）。
 *      不读 `daily_goal`，不断言目标存在，与目标复核不相交。
 *   ③ 其余（`today`／`date` 或无参）→ 目标复核形态：既有行为（今天或指定日：当前 vs 目标、
 *      还差多少、按现状几天到）。
 *
 * 复核口径（目标 vs 实际、预计达成日）住同目录 `figures.ts` 的 `weightMilestone`；
 * 「体重目标取数」`getWeightGoalInfo` 也住那里——本能力对外那道门（`index.ts`）把它转给
 * 目标管理那侧（`goal/goalExtraPlate.ts`）用，免得同一件事有两份取数。
 * 期间取数走同目录 `records.ts` 的 `getWeightHistory`（唯一定义地，不另写查询）；
 * 趋势阈值（日均 ±10g 为平稳）与 `figures.ts` 的 `weightTrend` 同一口径。
 *
 * **UI 融合（#335 页面③，老技能 `render_weight_review.py` × 本仓）**：三形态共用五条口径，
 * 逐条都落在这里的代码上（不留只在注释里存在的口径）——
 *   ① 结论块一律 `renderDisclosure({ title: '结论', open: true })`，全页「结论」恰一处
 *      （与 `weight/compare.ts` 情景版同形），不再用两列表格冒充结论块，复核形态也有这一位；
 *   ② 折线必传 `options`：`yTicks`＋`format`（不悬停也读得出一个数值）、`labels: 'select'`
 *      （首＋极值＋尾三点）、量程 `yMin`／`yMax`（算式住视图模型 `niceBounds`，装配层只透传）、
 *      期间平均值 `markLine`；有记录就出图（**1 条也出图**，单点＋该点平均值横线），
 *      单点另加页顶 warn 与 KPI `detail`「只有 1 个点」；
 *   ③ KPI 读数带 `status`／`statusText` 徽章（只收 ok／warn／danger／empty）：减重 ok、增重 warn、
 *      持平或无对照 empty；「无基线」与「持平 0.0」是两件事，分文写清；
 *   ④ 复制数据＝所见：载荷把窗口／首末／覆盖天数／最高最低／逐条里程碑／结论原句都带上，
 *      数字走 `metricsOf` 冻结投影（缺值不当 0），另有 `copyLog` 六段日志位（命令原文可照抄重跑）；
 *   ⑤ 页脚一行 #420 浅色口径行 `renderCaliberLine` 数据来源（哪张库／哪个窗口／多少条，有缺口写「缺 M−N 天」），
 *      样本不足走页顶 `notice({ icon: 'warn' })`、不拒绝渲染也不静默照画。
 *   总减重显示走 `lossPhrase`（正数＝已减），与载荷 `totalLoss` 的正负语义一致。
 *
 * **#504 形状化与手机端（负责人 2026-09-15 第 1／2／5 条；口径正本 `.scratch/t154/text-review/口径-UI.md`）**：
 * 与同型先例 `src/render/reviewDocsCss.ts` 件头同口径——**手机端照 HELP（断点 820，四条手法：触摸目标
 * ≥44px＋`-webkit-tap-highlight-color:transparent`＋`touch-action:manipulation`／窄屏横向塌纵向／
 * 收紧内距），正文里不许再用 `·`／`；` 把好几件事串成一句话**。本件的三处落法：
 *   - 期间变化卡副行 `开头 70.3 kg → 最后 70.4 kg`＋`最高 … · 最低 …`（原来两条 `·`／`→` 串法都住在
 *     卡片 `detail` 槽里；那一槽由公共层 `esc`，形状落不进去）→ 撤到卡下 `periodStrip()` 那条**形状**
 *     （一对量走 `pairStrip()`，最高／最低各一枚「标签 ＋ 值」；卡内只留一句指引）；
 *   - 页顶「记录太少」的详情（`；` 串两件事）→ `bulletList()` 逐条成行；
 *   - 里程碑表的每条（`日期 · 档位 · 当天体重` 三个 `·`）→ 档位（行名）落 `left` 列、日期落 `main`、
 *     当天体重落右列（**槽都是纯文本槽**，形状进不去，故靠分槽而不是挂胶囊）。
 * 形状与样式全部住同目录 `weightUi.ts`（本件正文零内联样式）；`weightUiCss()` 由本件三个整页装配
 * 分别放进 `parts` 第一项（`assembleDocPage` 没有页内 CSS 入口）。
 * **容许保留**：`<title>卡路里·体重</title>`（全仓 58 页逐字同一处品牌名，不属正文串）、页脚口径行的 `｜`、
 * 日期区间里的 `~`、复制载荷与命令原文（机器面）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { anchorOf, dayField, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { shiftISODate } from '../analysis/utils.js';
import { weightMilestone } from './figures.js';
import type { WeightMilestone } from './figures.js';
import { getWeightHistory } from './records.js';
import { assertDate, assertRange } from './plate.js';
import type { WeightReviewView } from './plate.js';
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';
import { bulletList, pairStrip, weightUiCss } from './weightUi.js';

/** 页面 key（日志第 1 段「场景标识」由 envelope 派生）与本次数据来源（第 3 段后半）。 */
const CMD_KEY = 'calorie.view.weight-review';
const COPY_SOURCE = 'weight_log（体重复盘）';
const COPY_SOURCE_REVIEW = 'user_profile＋daily_goal＋weight_log（体重复核）';

/* ── 阈值常量（单点定义，别处不再散写这两个数） ── */

/** 零门槛（kg）：变化绝对值小于此数即「持平 0.0」，页面上无正负号（`signed1` 的判 0 口径）。 */
const ZERO_EPS_KG = 0.05;
/** 最小跨度（kg）：窗口内波动不足此数即上下对称展开，小波动不被画成断崖。
 *  老页 `weight_review.html:104-110` 同口径（同页 `:103` 注「Y 轴 nice 刻度由 yMin／yMax 显式传入」，
 *  即 #43「方差过小防贴底」那一条）。 */
const MIN_SPAN_KG = 0.4;

/** 把本页实收参数拼回冻结 cli 原文（复制区日志第 4 段「命令原文」：可照抄重跑）。 */
function commandOf(params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + CMD_KEY + ' --params \'' + JSON.stringify(params) + '\'';
}

/** 老技能 `_d` 同义；零差值照文本审查口径 §3.3 写 `0`（不带正负号、不带小数），其余一位小数带符号。 */
function signed1(v: number): string {
  return Math.abs(v) < ZERO_EPS_KG ? '0' : (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toFixed(1);
}

/** 平稳阈值（克／天）：变化速度不到这个数即「基本算稳定」——与 `figures.ts` 的日均 ±10 g 判平稳同一口径。 */
const FLAT_GRAMS_PER_DAY = 10;

/** 期间结论句（#482 文本审查）：只说「快慢」这一件 KPI 里没有的事，不复述卡片上的数字。
 *  日均 = 期间变化 ÷ 窗口跨度，全族统一用「克」（口径 §3.2：页面上不出现 `g/天`）。
 *  只有往下走的那一侧补一句「在稳步往下走」；往上走那一句已由「增重」徽章说清 ⇒ 不再同屏重复。 */
function paceSentence(delta: number, spanDays: number): string {
  const days = Math.max(1, spanDays - 1);
  const grams = Math.round((delta / days) * 1000);
  const rate = grams === 0 ? '每天没有增减' : '平均每天' + (grams < 0 ? '少 ' + Math.abs(grams) : '多 ' + grams) + ' 克';
  if (grams < 0) return rate + (Math.abs(grams) < FLAT_GRAMS_PER_DAY ? '，基本算稳定。' : '，在稳步往下走。');
  return rate + '。';
}

/** 对照段区间文本（#482 缺陷 8）：对照段只有一天时不把同一天写两遍（`X ~ X`）。
 *  KPI 卡的副说明与卡下那行小字共用这一处措辞，两处不各写一遍。 */
function prevSpanText(v: WeightReviewPeriodView): string {
  return v.prevStart === v.prevEnd ? v.prevStart : v.prevStart + ' ~ ' + v.prevEnd;
}

/** 总减重方向词（正数＝已减；负数是往回长，也照实写）——与载荷 `totalLoss` 正负语义一致。 */
function lossWord(kgLoss: number): '已减' | '回涨' | '持平' {
  return Math.abs(kgLoss) < ZERO_EPS_KG ? '持平' : kgLoss > 0 ? '已减' : '回涨';
}

/** 总减重短语（载荷与结论句用；页上 KPI 的**值槽只放数字**，方向词在 `detail` 与徽章里）。 */
function lossPhrase(kgLoss: number): string {
  const word = lossWord(kgLoss);
  return word === '持平' ? '与历史最高持平' : word + ' ' + Math.abs(kgLoss) + ' kg';
}

/** 变化方向（体重增减口径：负＝减重）：同一状态同一个词（§5.2），页面不做自然语言解析。 */
function dirWord(v: number): '减重' | '增重' | '持平' {
  return Math.abs(v) < ZERO_EPS_KG ? '持平' : v < 0 ? '减重' : '增重';
}

function dirStatus(v: number): 'ok' | 'warn' | 'empty' {
  return Math.abs(v) < ZERO_EPS_KG ? 'empty' : v < 0 ? 'ok' : 'warn';
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/* ── 量程算式（住视图模型：§5.1「量程在取数层算」，装配层只透传） ── */

export interface WeightCurveBounds { yMin: number; yMax: number; yTicks: number }

/** 老技能「好看量程」（老页 `weight_review.html:104-110`；算式与 `weight/history.ts:259-277` 同源，
 *  那边不导出，本件照抄一份）：边界与步长都落 0.1 的整数倍，最小跨度 `MIN_SPAN_KG`，
 *  上下对称留白 10%（不足 0.1 也留 0.1），刻度条数在 4~6 里取一个把跨度整除的。
 *  **算式只住这里**：装配层拿到 `yMin`／`yMax`／`yTicks` 原样透传。 */
function niceBounds(values: readonly number[]): WeightCurveBounds {
  if (values.length === 0) return { yMin: 0, yMax: MIN_SPAN_KG, yTicks: 3 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  let lo = min;
  let hi = max;
  if (hi - lo < MIN_SPAN_KG) {
    const mid = (lo + hi) / 2;
    lo = mid - MIN_SPAN_KG / 2;
    hi = mid + MIN_SPAN_KG / 2;
  }
  const pad = Math.max(0.1, (hi - lo) * 0.1);
  const yMin = Math.floor((lo - pad) * 10) / 10;
  let yMax = Math.ceil((hi + pad) * 10) / 10;
  let tenths = Math.round((yMax - yMin) * 10);
  while (tenths < 4) { yMax = round1(yMax + 0.1); tenths += 1; }
  while (tenths % 5 !== 0 && tenths % 4 !== 0 && tenths % 3 !== 0) { yMax = round1(yMax + 0.1); tenths += 1; }
  const steps = [5, 4, 3].find((k) => tenths % k === 0) ?? 4;
  return { yMin, yMax, yTicks: steps + 1 };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：复核＝analysis/weight.weightMilestone） ── */

export function viewWeightReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const command = commandOf(params);
  const mode = optStr(params, 'mode');
  if (mode !== undefined && mode !== 'milestones') {
    throw new CalorieRenderError('bad-input', 'mode 非法（仅收 milestones）：' + mode);
  }
  if (mode === 'milestones') {
    const v = buildWeightMilestonesView(db, anchorOf(params));
    return { data: { metrics: milestoneNums(v) }, html: buildWeightMilestonesDoc(v, command) };
  }
  const win = windowRange(params);
  if (win) return viewWeightReviewPeriod(db, win.start, win.end, titleOf(optStr(params, 'window')), command);
  const s = optStr(params, 'start') ?? optStr(params, 'startDate');
  const e = optStr(params, 'end') ?? optStr(params, 'endDate');
  if (s && e) return viewWeightReviewPeriod(db, s, e, '体重复盘（自定义时间）', command);
  const today = dayField(params, 'today') ?? dayField(params, 'date');
  const v = buildWeightReviewView(db, today ?? undefined);
  const metrics = milestoneNumsOf(v.milestone);
  return { data: { metrics }, html: buildWeightReviewDoc(v, command) };
}

/** 窗口词 → 复盘标题（老技能 five types 同义；未知 Nd 窗给通用名）。 */
function titleOf(window: string | undefined): string {
  if (window === '本周') return '体重复盘（本周）';
  if (window === '本月') return '体重复盘（本月）';
  if (window === '90d') return '体重复盘（最近 90 天）';
  if (window === '今年') return '体重复盘（今年）';
  if (window === 'custom') return '体重复盘（自定义时间）';
  const m = /^([0-9]+)d$/.exec(window ?? '');
  if (m) return '体重复盘（最近 ' + m[1] + ' 天）';
  return '体重复盘（' + (window ?? '自定义时间') + '）';
}

export function buildWeightReviewView(db: DatabaseSync, today?: string): WeightReviewView {
  const t = today ?? new Date().toISOString().slice(0, 10);
  assertDate(t);
  const res = weightMilestone(db, t);
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || '无体重目标或无体重记录');
  }
  return { today: t, milestone: res.data };
}

/* ── 窗口形态：期间复盘（老技能 build_review week|month|90d|year|range 同义） ── */

export interface WeightReviewPeriodView {
  title: string; start: string; end: string; prevLabel: string; prevStart: string; prevEnd: string;
  rows: { date: string; kg: number }[];
  delta: number; avg: number; vsLast: number | null;
  /** 窗口长／有记录天数／缺口天数（缺口＝窗口内没记录的日子，缺的不补 0）。 */
  spanDays: number; coveredDays: number; gapDays: number;
  /** 首末与极值（缺值给 null，不当 0 参与任何算式）。 */
  firstKg: number | null; lastKg: number | null; maxKg: number | null; minKg: number | null;
  /** 纵轴量程（视图模型算好，装配层透传）。 */
  bounds: WeightCurveBounds;
  monthly: { month: string; avg: number }[] | null;
  summary: string;
}

export function buildWeightReviewPeriodView(
  db: DatabaseSync, start: string, end: string, title: string,
): WeightReviewPeriodView {
  assertRange(start, end);
  let h;
  try {
    h = getWeightHistory(db, { startDate: start, endDate: end });
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const rows = [...h.rows].reverse().map((r) => ({ date: r.date, kg: r.weight_kg }));
  const n = rows.length;
  const delta = h.change && n > 0 ? h.change.delta : 0;
  const avg = n > 0 ? round1(rows.reduce((a, r) => a + r.kg, 0) / n) : 0;
  const spanDays = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const prevEnd = shiftISODate(start, -1);
  const prevStart = shiftISODate(prevEnd, -(spanDays - 1));
  let vsLast: number | null = null;
  try {
    const p = getWeightHistory(db, { startDate: prevStart, endDate: prevEnd });
    /* 对照区间一条记录都没有＝「未算」（成功型空态），不是差值 0：0/0 不给 NaN 冒出去。 */
    if (p.rows.length > 0 && n > 0) {
      const pAvg = p.rows.reduce((a, r) => a + r.weight_kg, 0) / p.rows.length;
      vsLast = round1(avg - pAvg);
    }
  } catch (e) {
    if (e instanceof FetchError) vsLast = null;
    else throw e;
  }
  /* 对照区间的名字（#482 文本审查：`上一段等长区间` 是不懂技术的读者读不出意思的话，改「前面一段」；
   * 本周／本月沿用「上周／上月」）。 */
  const prevLabel = title === '体重复盘（本周）' ? '上周' : title === '体重复盘（本月）' ? '上月' : '前面一段';
  const months = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.date.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    (months.get(k) as number[]).push(r.kg);
  }
  const monthly = months.size >= 2
    ? [...months.entries()].map(([month, ws]) => ({ month, avg: round1(ws.reduce((a, w) => a + w, 0) / ws.length) }))
    : null;
  /* 结论句（#482 文本审查）：卡片已经把「变化／平均值／和上一段比」三个数字各说一处，
   * 这里只补一件卡片上没有的事 —— 这段走得快还是慢；记录不够时如实说看不出。
   * 单点那句不再带「只有 1 条记录」：同屏警示句／`1 天` 卡／页脚 `共 1 条` 已经说过三次。 */
  const summary = n === 0
    ? '这段时间一条记录都没有，得不出变化。'
    : n === 1
      ? '看不出这段时间是涨是跌。'
      : paceSentence(delta, spanDays);
  return {
    title, start, end, prevLabel, prevStart, prevEnd, rows,
    delta, avg, vsLast, spanDays, coveredDays: n, gapDays: spanDays - n,
    firstKg: n > 0 ? rows[0].kg : null,
    lastKg: n > 0 ? rows[n - 1].kg : null,
    maxKg: n > 0 ? Math.max(...rows.map((r) => r.kg)) : null,
    minKg: n > 0 ? Math.min(...rows.map((r) => r.kg)) : null,
    bounds: niceBounds(rows.map((r) => r.kg)),
    monthly, summary,
  };
}

/** 页面读数 → 载荷数字（同一份来源：`metricsOf` 冻结投影，缺值不当 0）。 */
function periodNums(v: WeightReviewPeriodView): Record<string, number> {
  return metricsOf({
    rows: v.coveredDays, delta: v.delta, avg: v.avg, vsLast: v.vsLast,
    spanDays: v.spanDays, coveredDays: v.coveredDays, gapDays: v.gapDays,
    firstKg: v.firstKg, lastKg: v.lastKg, maxKg: v.maxKg, minKg: v.minKg,
    months: v.monthly ? v.monthly.length : null,
  });
}

function viewWeightReviewPeriod(
  db: DatabaseSync, start: string, end: string, title: string, command: string,
): ViewOut {
  const v = buildWeightReviewPeriodView(db, start, end, title);
  return { data: { metrics: periodNums(v) }, html: buildWeightReviewPeriodDoc(v, command) };
}

/** 判定口径（复核形态 `status`）与「日均变化」那两行都是**一整句人话**（取数层原话），
 *  页面不做自然语言解析；#504 只钉一件事：这两个字段落 `renderListRows` 的 `main` 槽＝**纯文本**，
 *  形状词汇的 HTML 进不去，故复核形态的正文里不许出现 `·`／`；`（本形态没有可分条的事实）。 */

/* ── 回溯形态：里程碑回溯（老技能 build_review milestones 同义） ── */

export interface WeightMilestoneHit { name: string; date: string; kg: number; elapsedDays: number }

export interface WeightMilestonesView {
  rows: number; maxWeight: number; currentWeight: number; currentDate: string;
  totalLoss: number; hits: WeightMilestoneHit[]; summary: string;
}

export function buildWeightMilestonesView(db: DatabaseSync, today: string): WeightMilestonesView {
  assertDate(today);
  let h;
  try {
    h = getWeightHistory(db, { startDate: '2000-01-01', endDate: today });
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const rows = [...h.rows].reverse().map((r) => ({ date: r.date, kg: r.weight_kg }));
  const maxWeight = Math.max(...rows.map((r) => r.kg));
  const firstDate = (rows[0] as { date: string }).date;
  const hits: WeightMilestoneHit[] = [];
  for (const step of [5, 10, 15, 20]) {
    const hit = rows.find((r) => r.kg <= maxWeight - step);
    if (hit) {
      const elapsed = Math.round((Date.parse(hit.date) - Date.parse(firstDate)) / 86400000);
      hits.push({ name: '减重 ' + step + ' kg', date: hit.date, kg: hit.kg, elapsedDays: Math.max(0, elapsed) });
    }
  }
  if (hits.length === 0) throw new CalorieRenderError('missing-data', '尚未达成任何减重里程碑');
  const last = rows[rows.length - 1] as { date: string; kg: number };
  const totalLoss = round1(maxWeight - last.kg);
  /* 结论句（#482 文本审查）：列表行已经把每一次达标的日期／档位／体重逐条列出，结论只补两件列表没说的事
   * —— 最近一次达标离今天多久、那次达标之后体重又往哪走了（不回读卡片上的数字）。 */
  const lastHit = hits[hits.length - 1] as WeightMilestoneHit;
  const sinceDays = Math.max(0, Math.round((Date.parse(last.date) - Date.parse(lastHit.date)) / 86400000));
  const afterKg = round1(last.kg - lastHit.kg);
  const tail = Math.abs(afterKg) < ZERO_EPS_KG
    ? '之后体重没再动'
    : afterKg < 0 ? '之后又减了 ' + Math.abs(afterKg) + ' kg' : '之后回涨了 ' + afterKg + ' kg';
  const summary = (sinceDays === 0 ? '最近一次达标就是今天' : '最近一次达标在 ' + sinceDays + ' 天前') + '，' + tail + '。';
  return { rows: rows.length, maxWeight, currentWeight: last.kg, currentDate: last.date, totalLoss, hits, summary };
}

/** 回溯读数 → 载荷数字（逐条里程碑的日期／体重／天数是文字与数字两列，另在载荷里逐条摊平）。 */
function milestoneNums(v: WeightMilestonesView): Record<string, number> {
  return metricsOf({
    milestones: v.hits.length, maxWeight: v.maxWeight, currentWeight: v.currentWeight,
    totalLoss: v.totalLoss, rows: v.rows,
  });
}

/** 复核读数 → 载荷数字（`null` 不进投影：缺值不当 0）。 */
function milestoneNumsOf(m: WeightMilestone): Record<string, number> {
  return metricsOf({
    currentWeight: m.currentWeight, weightGoal: m.weightGoal, gapKg: m.gapKg,
    actualDailyChangeKg: m.actualDailyChangeKg, estDays: m.estDays, calorieAdjustment: m.calorieAdjustment,
  });
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_review.html 对照） ── */

export function buildWeightReviewDoc(v: WeightReviewView, command?: string): string {
  const m = v.milestone;
  const daily = m.actualDailyChangeKg;
  const deadline = m.deadline ? '截止 ' + m.deadline : '无截止';
  const parts: string[] = [renderKpiGrid([
    {
      label: '体重复核', value: String(m.currentWeight), unit: 'kg', detail: m.currentDate,
      status: daily === null ? 'empty' : dirStatus(daily),
      statusText: daily === null ? '无基线' : dirWord(daily),
    },
    { label: '目标体重', value: String(m.weightGoal), unit: 'kg', detail: deadline, status: 'empty', statusText: '目标' },
    {
      label: '差距', value: (m.gapKg >= 0 ? '+' : '') + m.gapKg + ' kg',
      status: m.gapKg > ZERO_EPS_KG ? 'warn' : 'ok',
      statusText: m.gapKg > ZERO_EPS_KG ? '还差' : '已达标',
    },
    {
      /* 值槽只放天数（数字＋单位）；预计达成日（`2026-12-31`，10 字）进 `detail`
       * ——日期串进值槽会被断行撑高（t154 用户读数）。 */
      label: '预计达成',
      value: m.estDays === null || m.estDays === undefined ? '—' : String(m.estDays) + ' 天',
      status: m.estDate === null ? 'empty' : 'ok',
      statusText: m.estDate === null ? '未算' : '在轨',
      detail: (m.estDate === null ? '' : '预计 ' + m.estDate + ' · ') + m.status,
    },
  ])];
  parts.push(renderListRows({
    items: [
      { left: '状态', main: m.status },
      {
        left: '日均变化',
        main: daily === null ? '近 30 天不足 2 条记录，未算日均变化' : String(daily) + ' kg/天',
      },
      {
        left: '热量调整',
        main: m.calorieAdjustment === null ? '未算（缺日均变化，无从推算）' : String(m.calorieAdjustment) + ' 卡',
      },
    ],
    /* 成功型空态（本来就没有，不是算不出来）：行列表也给一句口径。 */
    emptyText: '近 30 天不足 2 条记录，未算日均变化',
  }));
  if (daily === null) {
    parts.push(renderEmptyBlock({
      title: '日均变化',
      text: '近 30 天不足 2 条记录，未算日均变化',
      hint: '不是算不出来，是这段本来就没有两条记录：谈不上日均趋势，也就没有预计达成日',
    }));
  }
  /* 结论块唯一形态：折叠区（§5.3），句子是取数层原话（`weightMilestone.status`），页面不做自然语言解析。 */
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + m.status + '</p>', open: true }));
  parts.push(renderCaliberLine('📊 数据来源：体重记录 ｜ 复核日 ' + v.today
    + ' ｜ 当前 ' + m.currentWeight + ' kg vs 目标 ' + m.weightGoal + ' kg'
    + (daily === null ? ' ｜ 日均变化未算' : '')));
  const metrics: Record<string, number | string | null> = {
    ...milestoneNumsOf(m),
    '日期': m.currentDate, '状态': m.status, '截止': m.deadline, '预计达成日': m.estDate,
    '结论': m.status,
  };
  const envelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY,
    data: { metrics },
  } as unknown as SerializableEnvelope;
  parts.push(copyArea({
    title: '复制数据',
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: command ?? commandOf({ today: v.today }),
        source: COPY_SOURCE_REVIEW, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重复核 ' + v.today,
    eyebrow: '',
    subtitle: m.status,
    content: parts.join(''),
    charts: false,
  });
}

/** 期间事实条（#504 形状化）：原来「开头 70.3 kg → 最后 70.4 kg」与「最高 … · 最低 …」**两条串法**
 *  都住在 KPI 卡的副说明里——卡片的 `detail` 槽吃**纯文本**（公共层 `esc(detail)`，`blocks.ts:543`），
 *  形状落不进去，所以原来只能拿 `→` 与 `·` 顶替。本件的做法与同族 `history.ts:progressStrips` 一致：
 *  **事实从卡片里撤出来，落成页上一条真形状**（标签 ＋ 值），卡片只留「这一槽非说不可」的那个数。
 *  一条横排事实条、三枚各自的形状：开头一枚（两端 ＋ 箭头）、最高一枚、最低一枚——
 *  窄屏由 ③ 塌成一列，一屏一行一件事（桌面 1200 截图实测：竖排会把标签与值拉到 960px 的两头、
 *  中间空空荡荡，读不成对，故这一条保持横排）。
 *  三件事一件不少；单点／空窗那两档不出这条（同屏那两件事已各有一处说清）。 */
function periodStrip(v: WeightReviewPeriodView, n: number, first: string, last: string): string {
  if (n < 2) return '';
  const kg = (x: number | null): string => (x === null ? '—' : String(x)) + ' kg';
  return '<div class="wui-strip">'
    + '<span class="wui-fact"><span class="wui-fact-k">开头与最后</span>'
    + pairStrip(first + ' kg', last + ' kg') + '</span>'
    + '<span class="wui-fact"><span class="wui-fact-k">最高</span>'
    + '<span class="wui-fact-v">' + kg(v.maxKg) + '</span></span>'
    + '<span class="wui-fact"><span class="wui-fact-k">最低</span>'
    + '<span class="wui-fact-v">' + kg(v.minKg) + '</span></span>'
    + '</div>';
}

/* ── 整页装配：期间复盘（老实物 weight_review.html：副标题＋期间指标＋趋势图＋结论句） ── */

export function buildWeightReviewPeriodDoc(v: WeightReviewPeriodView, command?: string): string {
  const n = v.coveredDays;
  const first = v.firstKg === null ? '—' : String(v.firstKg);
  const last = v.lastKg === null ? '—' : String(v.lastKg);
  const gapText = v.gapDays > 0 ? ' ｜ 缺 ' + v.gapDays + ' 天没记' : '';
  const kpis: KpiCardInput[] = [
    {
      label: '期间变化', value: signed1(v.delta) + ' kg',
      status: dirStatus(v.delta), statusText: dirWord(v.delta),
      /* 单点那档：副说明改人话（原与徽章同为「单点无变化」）；徽章已删（见下）。
       * #504：中间那档的三条事实（首末对、最高、最低）不再串成一句——撤到卡下那条 `periodStrip()`。 */
      detail: n === 0 ? '本窗无体重记录' : n === 1 ? '只有 1 个点，没法算变化' : '这一段的上下界看卡下那条',
    },
    {
      /* `共 N 条` 与页脚来源行是同一条事实 ⇒ 删卡片这份（口径 §3.5：同屏同一事实只留信息量最大的一处）。
       * 只有一条记录时最高＝最低＝这个值，复述它没有信息量 ⇒ 那一档只说空态。
       * #504：最高／最低撤进卡下那条 `periodStrip()`（形状真出得来），卡内只剩均值这一个数
       * ——同一组数字不在卡的值槽与副说明两处各印一遍（口径 §三 第 2 条）。 */
      label: '期间平均值', value: v.avg.toFixed(1) + ' kg', status: 'empty', statusText: '基准',
      ...(n === 0 ? { detail: '本窗无体重记录' } : {}),
    },
    {
      /* 标签改人话（`vs 上一段等长区间` 读不出意思）；`detail` 由「复述标签」改成写明对照的是哪一段。 */
      label: '比' + v.prevLabel,
      value: v.vsLast === null ? '—' : signed1(v.vsLast) + ' kg',
      status: v.vsLast === null ? 'empty' : dirStatus(v.vsLast),
      statusText: v.vsLast === null ? '未算' : dirWord(v.vsLast),
      /* 卡内只留「比的是哪一段」这一格读数；对照段的具体日期（`前面同样长的 250 天：…`）
       * 原是一条塞进 KPI 卡的注释句（截图里折两行把卡撑高）⇒ 挪到卡下那一行浅色小字（见下 `对照段：…`）。 */
      detail: v.vsLast === null ? '前面同样长的一段没有记录' : undefined,
    },
    {
      /* 值槽带上单位（数字＋单位）；`覆盖 N 天` 在满窗时就是值槽的重述 ⇒ 只在有缺口时说窗口共几天。
       * 徽章 `满窗` 是内部口径词（屏上没有解释）⇒ 换读者看得懂的话；
       * 单点那枚删掉（#482 缺陷 7）：`单点` 与卡片副说明 `单点无变化` 同说一件事。
       * 徽章位由公共层渲染、`text === ''` 按缺省处理（`controls.ts:37`），本仓没有「不渲染徽章」的入口，
       * 故这里让徽章位回落到通用词（`STATUS_DEFAULT_TEXT.warn` 即「警告」）——它不再与副说明重词，
       * 单点这件事全页仍只说一次（`status` 照旧带着语义与配色）。 */
      label: '记录天数', value: n + ' 天',
      status: n === 0 ? 'empty' : n === 1 ? 'warn' : v.gapDays > 0 ? 'warn' : 'ok',
      statusText: n === 0 ? '无记录' : n === 1 ? '' : v.gapDays > 0 ? '有缺口' : '整段都记了',
      ...(v.gapDays > 0 ? { detail: '窗口共 ' + v.spanDays + ' 天' } : {}),
    },
  ];
  if (v.monthly) {
    /* 值槽只放数字＋单位；`月均值表 N 行` 是值的重述 ⇒ 删（下面那张表的表注自带月份数）。 */
    kpis.push({
      label: '月份数', value: String(v.monthly.length) + ' 个月', status: 'empty', statusText: '分月',
    });
  }
  /* `weightUiCss()` 恒为正文第一项（口径 §二：形状词汇的样式住 `weightUi.ts` 一处，
   *  `assembleDocPage` 没有页内 CSS 入口，故由整页装配把它带进来）。 */
  const parts: string[] = [weightUiCss()];
  /* 页顶软横幅先于一切区块（§5.6 第 4 格：样本不足不拒绝渲染，也不静默照画）。 */
  if (n < 2) {
    /* 标题改人话（口径 §3.2：`样本` 这类词换读者能懂的话）；`单点无变化` 卡片副说明已有 ⇒ 删这份。
     * #504：详情那一句原来用 `；` 把「给不给数」与「图上是哪个点」两件事串成一句——改 `bulletList()` 逐条成行。 */
    parts.push(notice({
      icon: 'warn',
      title: '记录太少',
      msg: n === 0 ? '本窗无体重记录' : '这段时间只记了 1 条',
    }));
    parts.push(bulletList(n === 0
      ? ['本窗一条记录也没有：趋势图走空态，均值与变化都不给数']
      : ['曲线上只有这一个点，图上那条横线就是这个点的平均值', '一条记录谈不上趋势']));
  }
  parts.push(renderKpiGrid(kpis));
  /* 期间事实条紧跟 KPI 网格（#504）：四条到六条读数说完，这张表说的是「这一段的上下界与首末对」。 */
  parts.push(periodStrip(v, n, first, last));
  /* 对照段（#482 缺陷 8）：原来这句塞在「比…」那张 KPI 卡的副说明里，截图里折两行把卡撑高；
   * 挪到卡下当一行浅色小字（走公共层现成的 `renderCaliberLine`，不新造样式）。
   * 一句只给 KPI 卡写不下的那件事——具体日期；比不了时不写（空态块自带口径句）。 */
  if (v.vsLast !== null) {
    parts.push(renderCaliberLine('对照段：' + prevSpanText(v) + '（同样 ' + v.spanDays + ' 天）'));
  }
  parts.push(renderChartBlock({
    kind: 'line',
    title: '体重趋势',
    input: {
      items: v.rows.map((r) => ({ label: r.date.slice(5), value: r.kg })),
      options: {
        height: 200,
        /* 纵轴可读数（§3 第 2 条）：刻度条数与格式显式写，不悬停也读得出一个数值。 */
        yTicks: v.bounds.yTicks,
        yMin: v.bounds.yMin,
        yMax: v.bounds.yMax,
        format: (kg: number) => kg.toFixed(1) + ' kg',
        /* `'select'`＝首＋极值＋尾三点（老页 `weight_review.html:119`），**不等于**等距刻度。 */
        labels: 'select',
        highlightLast: true,
        showDots: true,
        /* 平均值横线（#482 缺陷 2）：卡名是「期间平均值」、图例是「平均值」，同一件事实同屏只用一套词。 */
        ...(n > 0 ? { markLine: { value: v.avg, label: '平均值 ' + v.avg.toFixed(1) + ' kg' } } : {}),
        emptyText: '本窗无体重记录',
      },
    },
  }));
  if (v.monthly) {
    /* 表里的月均值一律一位小数（与图上刻度同一写法）；单位写进表注（表头列名全仓不带单位，
     * 公共层会把表头转成大写，`（kg）` 会渲染成 `（KG）`），数字不再裸奔。 */
    parts.push(renderDataTable({
      columns: [
        { key: 'month', label: '月份' },
        { key: 'avg', label: '平均体重', align: 'right' },
      ],
      rows: v.monthly.map((m) => ({ month: m.month, avg: m.avg.toFixed(1) })),
      /* 表注不再写「共 N 个月」（#482 缺陷 4）：同一个数同屏两槽——「月份数」卡已经写了，表注只留单位。 */
      caption: '按月平均体重（单位 kg）',
      emptyText: '本窗无体重记录',
    }));
  }
  /* 成功型空态（对照缺失，不是算不出来）：给一句自带口径的话，不留裸「—」。 */
  if (v.vsLast === null) {
    parts.push(renderEmptyBlock({
      title: '比' + v.prevLabel,
      text: '前面同样长的一段没有记录，这项比不了',
      hint: '用来对比的 ' + v.prevStart + ' ~ ' + v.prevEnd + ' 本来就没有记录，不是算不出来',
    }));
  }
  /* 结论块唯一形态：折叠区，全页「结论」恰一处（§5.3）。 */
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + v.summary + '</p>', open: true }));
  /* 页脚一行（口径 §3.1 统一句式 ＋ #482 裁定 F）：只留人话来源 ｜ 哪个窗口 ｜ 共多少条，缺口在同一行补一句。
   *  库文件名与表名退出可见面（`calorie_data.db`／`weight_log` 在可见文本里命中数为 0）；
   *  机器面不丢——复制日志第 3 段照旧写库文件名 ｜ 来源（§5.5）。 */
  parts.push(renderCaliberLine('📊 数据来源：体重记录 ｜ 窗口 ' + v.start + ' ~ ' + v.end
    + ' ｜ 共 ' + n + ' 条' + gapText));
  const metrics: Record<string, number | string | null> = {
    ...periodNums(v),
    '窗口': v.start + ' ~ ' + v.end,
    '首末': n === 0 ? null : first + ' → ' + last + ' kg',
    '对照区间': v.prevStart + ' ~ ' + v.prevEnd,
    ['vs ' + v.prevLabel]: v.vsLast === null ? '未算（对照区间无记录）' : signed1(v.vsLast) + ' kg',
    '结论': v.summary,
  };
  const envelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY,
    data: { metrics },
  } as unknown as SerializableEnvelope;
  parts.push(copyArea({
    title: '复制数据',
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: command ?? commandOf({ window: 'custom', start: v.start, end: v.end }),
        source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: v.title,
    eyebrow: '',
    /* 副标题只留窗口区间：条数与页脚来源行同一条事实（口径 §3.1 已把条数钉在页脚），删页头这份。 */
    subtitle: v.start + ' ~ ' + v.end,
    content: parts.join(''),
    charts: true,
  });
}

/* ── 整页装配：里程碑回溯（老实物 weight_review.html：副标题＋里程碑指标＋回溯表＋结论句） ── */

export function buildWeightMilestonesDoc(v: WeightMilestonesView, command?: string): string {
  const kpis: KpiCardInput[] = [
    /* `5/10/15/20kg` 是内部记号（口径 §3.2：内部记号不上屏），它要说的事挪去页头副标题说成一句话。 */
    { label: '里程碑数', value: String(v.hits.length), status: 'ok', statusText: '已达成' },
    /* 徽章「基准」与副说明「起算点」是同一件事 ⇒ 只留一处，且用读者能懂的词。 */
    { label: '历史最高', value: v.maxWeight + ' kg', status: 'empty', statusText: '起算点' },
    {
      /* 这一格只说「这是最新的一条记录」（状态）；方向与幅度住下面「总减重」那一格。 */
      label: '当前体重', value: v.currentWeight + ' kg', detail: v.currentDate,
      status: 'empty', statusText: '最新',
    },
    {
      /* 值槽只放数字（载荷 `totalLoss` 同一个数）；方向词（已减／回涨／持平）全页只出现在徽章这一处。 */
      label: '总减重', value: String(v.totalLoss) + ' kg',
      status: Math.abs(v.totalLoss) < ZERO_EPS_KG ? 'empty' : v.totalLoss > 0 ? 'ok' : 'warn',
      statusText: lossWord(v.totalLoss),
    },
  ];
  /* `weightUiCss()` 恒为正文第一项（口径 §二，同上）。 */
  const parts: string[] = [weightUiCss(), renderKpiGrid(kpis)];
  /* 一行一条读法走列表行区块（§2 #14），不再用数据表；空句自带口径。
   *
   * #504 形状化：原来一条里程碑是**一句话里三个 `·`**（`2025-11-27 · 减重 5 kg · 当天 75 kg`）——
   * 日期／档位／当天体重三件事串成一行字。现在各自落槽：
   *   ① 档位（这一行讲的是哪一档）→ `left`（44px 那一列，`减重 5 kg` 两三个字放得下）；
   *   ② 日期 → `main`（宽列；**日期不能进 `left`**：390px 手机上 44px 那列把 `2025-11-27` 折成
   *      `2025-`＋`11-27` 两行，手机截图实测抓到过，见本轮证据件）；
   *   ③ 当天体重 → 右列（页面上本来就有一列读数位）。
   * 三件事一件不少，读者一眼看得出「这一行是哪一档、哪一天、那天多少」；跨档多出的那条
   * 「距第一条记录 N 天」＝各行的**序差**（`elapsedDays` 逐个相减即得），不逐行重印。
   * 槽宽都试过（390px 手机截图逐版比）：`date` 单独占 `left` 时 44px 那列把日期折成两行；
   * 三条读数一起进 `main` 时又被 `nowrap` 截成省略号——故 `main` 只放日期一条。
   * **不挂胶囊**：`renderListRows` 的三个槽都是**纯文本**（公共层 `esc`，`blocks.ts:713-717`）——
   * 形状词汇的 HTML 进那一槽会被转义成字面标签（本票实测：`<span class="wui-chip">…` 直接印在页上），
   * 故这一页用分槽把三件事分开，不硬塞一个形状进去。 */
  parts.push(renderListRows({
    items: v.hits.map((m) => ({
      left: m.name,
      main: m.date,
      right: '当天 ' + m.kg + ' kg',
    })),
    emptyText: '尚未达成任何减重里程碑',
  }));
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + v.summary + '</p>', open: true }));
  /* 页脚一行（口径 §3.1 统一句式 ＋ #482 裁定 F）：这页没有窗口，写「全部记录（到某日）」代替窗口那一段；
   *  库文件名与表名退出可见面（同上，机器面仍在复制日志第 3 段）。 */
  parts.push(renderCaliberLine('📊 数据来源：体重记录 ｜ 窗口 全部记录（到 '
    + v.currentDate + '） ｜ 共 ' + v.rows + ' 条'));
  const metrics: Record<string, number | string | null> = {
    ...milestoneNums(v),
    '当前日期': v.currentDate, '总减重': lossPhrase(v.totalLoss),
    '结论': v.summary,
  };
  v.hits.forEach((m, i) => {
    const prefix = '里程碑' + (i + 1) + ' ' + m.name;
    metrics[prefix + ' 日期'] = m.date;
    metrics[prefix + ' 体重kg'] = m.kg;
    metrics[prefix + ' 天数'] = m.elapsedDays;
  });
  const envelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: CMD_KEY,
    data: { metrics },
  } as unknown as SerializableEnvelope;
  parts.push(copyArea({
    title: '复制数据',
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: command ?? commandOf({ mode: 'milestones', today: v.currentDate }),
        source: COPY_SOURCE, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看里程碑回溯',
    eyebrow: '',
    /* 副标题说这页的读法（每 5 kg 一档、记第一次达到那天）；条数与页脚来源行重复 ⇒ 删（口径 §3.1）。 */
    subtitle: '每减 5 kg 记一次，记的是第一次达到那天',
    content: parts.join(''),
    charts: false,
  });
}
