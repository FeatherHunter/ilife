/** 看体重明细（HELP 场景 03「体重」下一级）：`calorie.view.weight-history` 读。
 *
 * 「看体重明细」与「看体重曲线」在命令面上是**同一个键**（曲线＝同一页在不同窗口词下的读法，
 * 见 `triggers/routing.ts` 的「看体重曲线」系列），故本文件是那两条子功能共同的住处。
 * 体重记录的取数（含「只看有备注的那些」）住同目录 `records.ts`。
 *
 * 窗口口径（#333 真缺陷修复）：先走 `windowRange(params)`（`window`／`offset`／`today`，
 * 时间说法唯一定义地 `analysis/series.ts`），再退回既有的 `days`／`start+end` 口径
 * （与同目录 `compare.ts:30` 同一形状）。`windowRange` 给了窗口就以它为准，
 * 两样都没有才沿用旧口径——除「看体重曲线」（30d 与缺省同值）外其余 13 条此前都退回缺省 30 天。
 *
 * 老新融合（#333 页面①，老实物 `templates/weight_history.html` 对照）：
 * ① 量程＝老技能「好看量程」（`niceRange`：最小跨度 0.4kg、对称展开、边界与步长都落 0.1 的整数倍），
 *    X 标签用 `labels:'select'`（首＋峰值＋尾），Y 刻度 4~6 条——上一版两样都缺，曲线无刻度可读；
 * ② 三种标注层真进图（老实物 `weight_history.html:238-240`／`:253-258`／`:275-278` 的做法）：
 *    目标在量程内画 `markLine`，**量程外退化成「距目标还差 X kg」文字徽章**（V2.4 老裁定的原意：
 *    量程只由数据驱动，不为目标扩张）；里程碑在窗内画 `markLine` 竖线、窗外只留图例行；
 *    异常点走 `ChartItem.anomaly:true` 染红（组件自带，不自造配色）；
 * ③ 0／1／N 三态同一个守卫：0 条给空态句（不留白、也不像老技能那样 `display:none` 静默），
 *    1 条给单点标记＋均值线＋页顶一条软横幅（软横幅的位置照老实物 `weight_compare.html:79`），
 *    >30 条分段明细保持原样；
 * ④ 页脚复制载荷＝**逐条 records**（日期／时间／体重／BMI／备注，`list` 形：`text` 每行一条、
 *    `json` 结构、`csv` 可导入）——KPI 那几个数仍在出口 envelope 的 `metrics` 里（别处不重算）；
 * ⑤ 收尾三件（本轮）：页脚数据来源行（哪张库／哪张表／哪个窗口／多少条＋缺口）、复制区恒为
 *    「复制数据 ▾ ＋ 复制日志」两颗（日志第 3 段是渲染命令原文，照抄能重跑）、空窗仍出**完整页**
 *    （数据型空态句＋页脚来源行，不是整页不落盘）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { optNum, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import type { SerializableEnvelope } from 'base-paint';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import { getWeightGoalValue, getWeightHistory, noteTag } from './records.js';
import type { WeightHistory } from './records.js';
import { assertDate, assertRange } from './plate.js';
import type { WeightHistoryView } from './plate.js';
import { scenarioE3 } from './weightCompare2.js';
import { weightVolatilityV2 } from './volatility.js';
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import type { DataTableColumn, StatusKind } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

/** 本页命令键（信封、标题眉标、复制日志一处定义，别处引用）。 */
const CMD_KEY = 'calorie.view.weight-history';

export type HistoryOverlay = 'target' | 'milestone' | 'anomaly';

export interface HistoryDocExtra {
  overlay?: HistoryOverlay;
  noteOnly?: boolean;
  /** 目标那一路的两个数：`kg` 为设的目标，`diffKg` 为最新体重减目标（本窗无记录时 `diffKg` 为 null）。 */
  goal?: { kg: number; diffKg: number | null } | null;
  milestones?: Array<{ label: string; date: string; kg: number }>;
  milestoneMiss?: string[];
  anomalies?: Array<{ date: string; kg: number; deviationKg: number; level: string }>;
  /** 无异常点时那句成功型空态的口径（基线／黄红阈值），取自波动分析的公开接口。 */
  anomalyNote?: string;
  /** 渲染本页的命令原文（复制日志第 3 段；照抄能重跑）。 */
  command?: string;
}

/** KPI 卡（`base-paint` 的 B-02：四槽＋状态徽章；组件与样式已齐，本页只传值）。
 *  值槽只放**短数字或数字＋单位**：单位走 `unit` 槽（小字），长信息一律进 `detail`。 */
interface KpiCard {
  label: string; value: string; unit?: string; detail: string;
  status?: StatusKind; statusText?: string;
}

function isOverlay(v: string | undefined): v is HistoryOverlay {
  return v === 'target' || v === 'milestone' || v === 'anomaly';
}

/** 里程碑门槛（减重 kg）：`overlay='milestone'` 的取数与「里程碑」卡的门槛口径同出一处。 */
const MILESTONE_KG: readonly number[] = [5, 10];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avgOf(rows: WeightHistory['rows']): number | null {
  if (rows.length === 0) return null;
  const s = rows.reduce((a, r) => a + r.weight_kg, 0);
  return round1(s / rows.length);
}

function changeOf(rows: WeightHistory['rows']): WeightHistory['change'] {
  if (rows.length < 2) return null;
  const first = (rows[rows.length - 1] as (typeof rows)[number]).weight_kg;
  const last = (rows[0] as (typeof rows)[number]).weight_kg;
  const spanDays = Math.round(
    (new Date((rows[0] as (typeof rows)[number]).date).getTime()
      - new Date((rows[rows.length - 1] as (typeof rows)[number]).date).getTime()) / 86400000,
  ) + 1;
  const delta = round1(last - first);
  return { spanDays, first, last, delta, dailyAvg: spanDays > 0 ? Math.round((delta / spanDays) * 100) / 100 : 0 };
}

/** 窗口口径（窗口优先，其次显式起止／天数；三样都没有＝`{}`，由视图模型给缺省 30 天）。 */
function pickRange(params: Record<string, unknown>): { days?: number; startDate?: string; endDate?: string } {
  const win = windowRange(params);
  if (win !== null) return { startDate: win.start, endDate: win.end };
  const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
  const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
  if (startDate && endDate) return { startDate, endDate };
  if (startDate) return { startDate };
  const days = optNum(params, 'days');
  return days === undefined ? {} : { days };
}

/** 空窗时的区间串：口径与 `records.ts:98`／`:103`／`:108` 同形。空窗那一路库里只把区间写进
 *  报错话术、不给结构值，故这里按同形重算一次；非空窗一律用库里给的 `range`。 */
function rangeLabelOf(opts: { days?: number; startDate?: string; endDate?: string }): string {
  const { days = 30, startDate, endDate } = opts;
  if (startDate && endDate) return startDate === endDate ? startDate : startDate + ' ~ ' + endDate;
  if (startDate) return startDate;
  return '最近' + days + '天';
}

/** 复制日志第 3 段：渲染本页的命令原文（参数逐字用本次实际收到的那一份，照抄能重跑）。 */
function renderCommandOf(params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + CMD_KEY
    + (Object.keys(params).length === 0 ? '' : " --params '" + JSON.stringify(params) + "'");
}

/** `calorie.view.weight-history` · 体重明细／曲线（窗口优先，其次显式起止／天数，缺省 30 天）。 */
export function viewWeightHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const overlayRaw = optStr(params, 'overlay');
  if (overlayRaw !== undefined && !isOverlay(overlayRaw)) {
    throw new CalorieRenderError('bad-input', 'overlay 只许 target／milestone／anomaly');
  }
  const overlay = overlayRaw as HistoryOverlay | undefined;
  const noteOnly = params['noteOnly'] === true;
  const picked = pickRange(params);
  let h: WeightHistoryView;
  try {
    h = buildWeightHistoryView(db, picked);
  } catch (e) {
    // 数据型空窗：本窗一条记录都没有 ⇒ 照 §5.6／§5.7 出**完整页**（空态句＋KPI 空徽章＋结论＋
    // 页脚来源行），不回到老技能那种 `display:none` 静默，也不像上一版那样整页不落盘。
    // 筛选型空窗（`noteOnly` 且一条都没带备注）仍走缺失阻断：用例与 smoke 登记册钉死 exit 4。
    if (noteOnly || !(e instanceof CalorieRenderError) || e.code !== 'missing-data') throw e;
    h = { range: rangeLabelOf(picked), rows: [], change: null };
  }
  if (noteOnly) {
    const kept = h.rows.filter((r) => r.note !== null && r.note !== undefined && String(r.note).trim() !== '');
    if (kept.length === 0) throw new CalorieRenderError('missing-data', '本窗无带备注的体重记录');
    h = { range: h.range, rows: kept, change: changeOf(kept) };
  }
  const extra: HistoryDocExtra = {
    overlay,
    noteOnly: noteOnly || undefined,
    command: renderCommandOf(params),
  };
  if (overlay === 'target') {
    const goalKg = getWeightGoalValue(db);
    const last = h.rows.length > 0 ? (h.rows[0] as (typeof h.rows)[number]).weight_kg : null;
    extra.goal = goalKg === null ? null : { kg: goalKg, diffKg: last === null ? null : round1(last - goalKg) };
  }
  if (overlay === 'milestone') {
    const hits: Array<{ label: string; date: string; kg: number }> = [];
    const miss: string[] = [];
    for (const delta of MILESTONE_KG) {
      try {
        const r = scenarioE3(db, delta);
        hits.push({ label: '减重 ' + delta + 'kg 那天', date: r.segA.range, kg: r.segA.avg as number });
      } catch (e) {
        miss.push('减重 ' + delta + 'kg 未达成' + (e instanceof FetchError ? '（' + e.message + '）' : ''));
      }
    }
    extra.milestones = hits;
    extra.milestoneMiss = miss;
  }
  if (overlay === 'anomaly') {
    const scan = anomaliesOf(db, h);
    extra.anomalies = scan.list;
    if (scan.note !== null) extra.anomalyNote = scan.note;
  }
  const avg = avgOf(h.rows);
  const metrics = metricsOf({
    rows: h.rows.length,
    spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
    delta: h.change?.delta, dailyAvg: h.change?.dailyAvg, avg: avg ?? undefined,
    goalKg: extra.goal?.kg, goalDiffKg: extra.goal?.diffKg ?? undefined,
    milestoneCount: extra.milestones !== undefined ? extra.milestones.length : undefined,
    anomalyCount: extra.anomalies !== undefined ? extra.anomalies.length : undefined,
    noteCount: noteOnly ? h.rows.length : undefined,
  });
  return { data: { metrics }, html: buildWeightHistoryDoc(h, extra) };
}

/** 异常点扫描（走波动分析的公开接口）：点列表 ＋ 无点时那句口径（基线／黄红阈值）。 */
function anomaliesOf(db: DatabaseSync, h: WeightHistoryView): {
  list: Array<{ date: string; kg: number; deviationKg: number; level: string }>;
  note: string | null;
} {
  if (h.rows.length < 2) return { list: [], note: null };
  const latest = (h.rows[0] as (typeof h.rows)[number]).date;
  const earliest = (h.rows[h.rows.length - 1] as (typeof h.rows)[number]).date;
  const start = earliest <= latest ? earliest : latest;
  const end = earliest <= latest ? latest : earliest;
  try {
    const res = weightVolatilityV2(db, start, end, 'rolling');
    if (res.status !== 'ok' || !res.data) return { list: [], note: null };
    return {
      list: res.data.recentAnomalies.map((p) => ({ date: p.date, kg: p.kg, deviationKg: p.deviationKg, level: p.level })),
      note: '基线 ' + res.data.baselineValue + ' kg，黄±' + res.data.thresholds.yellow + ' 红±' + res.data.thresholds.red,
    };
  } catch {
    return { list: [], note: null };
  }
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：历史＝fetch/weight.getWeightHistory） ── */

export function buildWeightHistoryView(
  db: DatabaseSync,
  opts: { days?: number; startDate?: string; endDate?: string } = {},
): WeightHistoryView {
  const { days = 30, startDate, endDate } = opts;
  try {
    if (startDate && endDate) {
      assertRange(startDate, endDate);
      const h = getWeightHistory(db, { startDate, endDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (startDate && !endDate) {
      assertDate(startDate);
      const h = getWeightHistory(db, { startDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
    }
    const h = getWeightHistory(db, { days });
    return { range: h.range, rows: h.rows, change: h.change };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

/* ── 曲线计划（#333 融合：量程／标注／单点三样一处算，装配与图例共用同一份判断） ── */

/** 最小跨度（kg）：波动不足此数即对称展开，小波动不会被画成断崖。 */
const MIN_SPAN_KG = 0.4;

interface MarkLinePlan {
  readonly value?: number;
  readonly xValue?: number | string;
  readonly label?: string;
}

interface CurvePlan {
  /** 升序记录（图与图例同一份）。 */
  readonly asc: WeightHistory['rows'];
  readonly yMin: number;
  readonly yMax: number;
  readonly yTicks: number;
  readonly markLine?: MarkLinePlan;
  readonly targetInRange: boolean;
  readonly milestoneInWindow?: { label: string; date: string; kg: number };
  readonly anomalyDates: Set<string>;
}

/** 老技能「好看量程」（`weight_history.html:220-237` 数据驱动＋V2.4 不为目标扩张）：
 *  边界与步长都落在 0.1 的整数倍，最小跨度 0.4kg，刻度条数在 4~6 里取一个把跨度整除的。 */
function niceRange(values: readonly number[]): { yMin: number; yMax: number; yTicks: number } {
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

/** 0／1／N 三态同一个守卫：0 条返 null（空态句由装配层出）。 */
function curvePlanOf(h: WeightHistoryView, extra: HistoryDocExtra): CurvePlan | null {
  if (h.rows.length === 0) return null;
  const asc = [...h.rows].reverse();
  const { yMin, yMax, yTicks } = niceRange(asc.map((r) => r.weight_kg));
  const goal = extra.goal?.kg ?? null;
  const targetInRange = goal !== null && goal >= yMin && goal <= yMax;
  const milestoneInWindow = (extra.milestones ?? []).find((m) => asc.some((r) => r.date === m.date));
  const last = (asc[asc.length - 1] as (typeof asc)[number]).weight_kg;
  const kind = extra.overlay;
  const markLine: MarkLinePlan | undefined = kind === 'target' && goal !== null && targetInRange
    ? { value: goal, label: '目标 ' + goal + 'kg' }
    : kind === 'milestone' && milestoneInWindow !== undefined
      ? { xValue: milestoneInWindow.date.slice(5), label: milestoneInWindow.label + ' ' + milestoneInWindow.kg + 'kg' }
      /* 单点：单点标记之外再给一条均值线（该点自身的均值），曲线不再是一个孤点无名。 */
      : asc.length === 1 ? { value: last, label: '均值 ' + last + 'kg' } : undefined;
  return {
    asc, yMin, yMax, yTicks, markLine, targetInRange, milestoneInWindow,
    anomalyDates: new Set((extra.anomalies ?? []).map((a) => a.date)),
  };
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_history.html 对照） ── */

function modeBadge(extra: HistoryDocExtra): string {
  if (extra.noteOnly) return '模式：备注筛选';
  if (extra.overlay === 'target') return '模式：曲线·带目标线';
  if (extra.overlay === 'milestone') return '模式：曲线·带里程碑';
  if (extra.overlay === 'anomaly') return '模式：曲线·带异常点';
  return '模式：明细／曲线';
}

function fourthKpi(h: WeightHistoryView, extra: HistoryDocExtra): KpiCard {
  if (extra.overlay === 'target') {
    const goal = extra.goal;
    if (goal === null || goal === undefined) {
      // 值槽只放数：空态不把「未设目标」四个字当大数字，判断词进 `detail` 与徽章。
      return { label: '目标', value: '—', detail: '未设目标 · 说「定体重目标」后可叠目标线', status: 'empty', statusText: '未设目标' };
    }
    const d = goal.diffKg;
    if (d === null) {
      // 本窗没有记录 ⇒ 没有「距目标」可算：给空态句，不打印 `null kg`。
      return {
        label: '目标', value: '—', detail: '目标 ' + goal.kg + ' kg · 本窗无记录可比',
        status: 'empty', statusText: '本窗无记录',
      };
    }
    return {
      label: '距目标', value: (d >= 0 ? '+' : '') + d + ' kg', detail: '目标 ' + goal.kg + ' kg',
      status: d > 0 ? 'warn' : 'ok', statusText: d > 0 ? '还差 ' + d + ' kg' : '已达目标',
    };
  }
  if (extra.overlay === 'milestone') {
    const n = extra.milestones?.length ?? 0;
    const hit = n > 0
      ? (extra.milestones as Array<{ label: string; date: string }>).map((m) => m.label + ' ' + m.date).join('；')
      : (extra.milestoneMiss ?? []).join('；');
    // 值槽只放「达成几个」这一个数；「／2」的分母改成 `detail` 里的门槛口径，判词进徽章。
    const detail = '门槛 减重 ' + MILESTONE_KG.join('kg／') + 'kg' + (hit === '' ? '' : ' · ' + hit);
    return { label: '里程碑', value: String(n), unit: '个', detail, status: n > 0 ? 'ok' : 'empty', statusText: n > 0 ? '达成 ' + n + ' 个' : '未达成' };
  }
  if (extra.overlay === 'anomaly') {
    const n = extra.anomalies?.length ?? 0;
    const detail = n > 0
      ? (extra.anomalies as Array<{ date: string; kg: number }>).map((a) => a.date + ' ' + a.kg + 'kg').join('；')
      : '本窗无异常点' + (extra.anomalyNote === undefined ? '' : '（' + extra.anomalyNote + '）');
    return { label: '异常点', value: String(n) + ' 个', detail, status: n > 0 ? 'warn' : 'ok', statusText: n > 0 ? '异常 ' + n + ' 个' : '无异常' };
  }
  const tags = tagDist(h.rows);
  const n = Object.keys(tags).length;
  if (extra.noteOnly) {
    return { label: '有备注', value: h.rows.length + ' 条', detail: n > 0 ? '标签 ' + n + ' 类' : '备注无标签', status: 'ok', statusText: '已筛备注' };
  }
  const noted = h.rows.filter((r) => r.note && String(r.note).trim() !== '').length;
  return {
    label: '备注', value: noted + ' 条', detail: n > 0 ? '标签 ' + n + ' 类' : '本窗无备注',
    status: noted > 0 ? 'ok' : 'empty', statusText: noted > 0 ? '标签 ' + n + ' 类' : '无备注',
  };
}

function kpiCards(h: WeightHistoryView, extra: HistoryDocExtra, avg: number | null): KpiCard[] {
  const asc = [...h.rows].reverse();
  const c = h.change;
  return [
    /* 值槽只放「本窗条数」这一个数：区间串（`2026-08-09 ~ 2026-09-07`，23 字）在 28px 且
     * `overflow-wrap: anywhere` 的值槽里会被断成 2~3 行，是四张卡不等高的直接成因（t154 用户读数）。
     * 区间挪进 `detail`（副说明行）——页题 `<h1>`、副标题与页脚来源行各还有一份，信息不丢。 */
    {
      label: '体重历史', value: String(h.rows.length), unit: '条',
      detail: '本窗 ' + h.range + (extra.noteOnly ? '（只取有备注的）' : ''),
      status: h.rows.length >= 2 ? 'ok' : 'empty',
      statusText: h.rows.length >= 2 ? '样本 ' + h.rows.length + ' 条' : h.rows.length === 1 ? '单点数据' : '本窗无记录',
    },
    {
      label: '变化',
      value: c ? (c.delta >= 0 ? '+' : '') + c.delta + ' kg' : '—',
      detail: c ? c.spanDays + ' 天 · 日均 ' + c.dailyAvg + ' kg' : '单点无变化',
      status: c === null ? 'empty' : c.delta < 0 ? 'ok' : c.delta > 0 ? 'warn' : 'empty',
      statusText: c === null ? '单点无变化' : c.delta < 0 ? '下降' : c.delta > 0 ? '上升' : '持平',
    },
    {
      label: '均值', value: avg === null ? '—' : String(avg) + ' kg',
      detail: h.rows.length >= 2
        ? '首 ' + (asc[0] as (typeof asc)[number]).weight_kg + ' → 末 ' + (asc[asc.length - 1] as (typeof asc)[number]).weight_kg + ' kg'
        : '单点无均值对照',
      status: h.rows.length >= 2 ? 'ok' : 'empty',
      statusText: h.rows.length >= 2 ? '首末对照' : '无对照',
    },
    fourthKpi(h, extra),
  ];
}

function tagDist(rows: WeightHistory['rows']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const t = noteTag(r.note);
    if (!t) continue;
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

/** 结论句（#333 融合：与 `compare.ts` 情景版同形——同一句话进 `renderDisclosure` 折叠区；
 *  正文不再自带「结论：」前缀，页内「结论」两个字只出现在折叠区标题那一处）。 */
function conclusionOf(h: WeightHistoryView, extra: HistoryDocExtra, avg: number | null): string {
  if (h.rows.length === 0) return h.range + ' 无体重记录，先记一条再看。';
  const last = (h.rows[0] as (typeof h.rows)[number]).weight_kg;
  const bits: string[] = [];
  if (h.change === null) {
    bits.push(h.range + ' 只有 1 条记录（' + last + ' kg），单点看不出变化，再记一条就能比较');
  } else {
    const c = h.change;
    bits.push(h.range + ' 共 ' + h.rows.length + ' 条，首 ' + c.first + ' → 末 ' + c.last
      + ' kg（' + (c.delta >= 0 ? '+' : '') + c.delta + ' kg，日均 ' + c.dailyAvg + ' kg，' + c.spanDays + ' 天）');
  }
  if (avg !== null) bits.push('均值 ' + avg + ' kg');
  const goal = extra.goal;
  if (extra.overlay === 'target' && goal !== null && goal !== undefined) {
    const d = goal.diffKg;
    bits.push(d === null ? '目标 ' + goal.kg + ' kg（本窗无记录可比）'
      : d > 0 ? '目标 ' + goal.kg + ' kg，还差 ' + d + ' kg'
        : d < 0 ? '目标 ' + goal.kg + ' kg，已低于目标 ' + Math.abs(d) + ' kg' : '目标 ' + goal.kg + ' kg，已达目标');
  }
  if (extra.overlay === 'milestone') {
    const hit = extra.milestones ?? [];
    bits.push('里程碑达成 ' + hit.length + '／2'
      + (hit.length > 0 ? '：' + hit.map((m) => m.label + ' ' + m.date).join('；') : '（' + (extra.milestoneMiss ?? []).join('；') + '）'));
  }
  if (extra.overlay === 'anomaly') {
    const list = extra.anomalies ?? [];
    bits.push('异常点 ' + list.length + ' 个'
      + (list.length > 0
        ? '：' + list.map((a) => a.date + ' ' + a.kg + 'kg（偏 ' + a.deviationKg + '）').join('；')
        : '（' + (extra.anomalyNote ?? '本窗波动在阈值内') + '）'));
  }
  if (extra.noteOnly) bits.push('只看有备注的 ' + h.rows.length + ' 条');
  return bits.join('；') + '。';
}

/** 复制载荷的逐条行（日期／时间／体重／BMI／备注）：`text` 每行一条、`json` 结构、`csv` 可导入。
 *  空值保留原始空串／`null`（`—` 只是表格里的可见占位，不写进载荷——空值不当真值，见 `t395-融合基准.md` 裁定 2）。 */
function copyRowsOf(rows: WeightHistory['rows']): Array<Record<string, string | number | null>> {
  return rows.map((r) => ({ 日期: r.date, 时间: r.time ?? '', 体重kg: r.weight_kg, BMI: r.bmi ?? null, 备注: r.note ?? '' }));
}

/** 数据来源那句话（页脚与复制日志第 3 段共用一份措辞）。 */
function sourceTextOf(h: WeightHistoryView, extra: HistoryDocExtra): string {
  return 'weight_log · ' + h.range + ' · 共 ' + h.rows.length + ' 条' + (extra.noteOnly ? '（只取有备注的）' : '');
}

/** 页脚数据来源行（§5.5：哪张库／哪张表／哪个窗口／多少条；窗内有缺口时同一行补一句口径）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`（12px `--fg2`）：页脚的来源是「口径行」，
 *  不是需要注意的提示，故不用深色 toast 卡（#340 裁定）；原 toast 的「标题 ＋ detail」两行合成这一句。 */
function sourceLine(h: WeightHistoryView, extra: HistoryDocExtra): string {
  const gap = gapNoteOf(h, extra);
  return renderCaliberLine('📊 数据来源:' + DB_FILENAME + ' · weight_log · ' + h.range
    + ' · 共 ' + h.rows.length + ' 条'
    + (extra.noteOnly ? '（只取有备注的）' : '')
    + (gap === null ? '' : '；' + gap));
}

/** 窗内缺口（§3 第 15 条：缺多少天要写清；缺值按断点画、不补 0）。给了区间串才数得出来。 */
function gapNoteOf(h: WeightHistoryView, extra: HistoryDocExtra): string | null {
  if (h.rows.length === 0) return '本窗一条记录都没有：不补默认值，也不拿别的窗口顶。';
  if (extra.noteOnly) return null; // 筛选后的条数与窗口天数不可比
  const span = windowDaysOf(h.range);
  if (span === null || h.rows.length >= span) return null;
  return '窗内 ' + span + ' 天只有 ' + h.rows.length + ' 天有记录，缺 ' + (span - h.rows.length) + ' 天（缺的那几天不补 0）';
}

/** 区间串 → 天数：`2026-09-01`／`2026-09-01 ~ 2026-09-07`／`最近30天` 三种形态。 */
function windowDaysOf(range: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?: ~ (\d{4}-\d{2}-\d{2}))?$/.exec(range);
  if (m !== null) {
    const a = Date.parse(m[1] + 'T00:00:00Z');
    const b = Date.parse((m[2] ?? m[1]) + 'T00:00:00Z');
    return Math.round((b - a) / 86400000) + 1;
  }
  const d = /^最近(\d+)天$/.exec(range);
  return d === null ? null : Number(d[1]);
}

export function buildWeightHistoryDoc(h: WeightHistoryView, extra: HistoryDocExtra = {}): string {
  const avg = avgOf(h.rows);
  const parts: string[] = [];
  // 样本不足不拒绝渲染：页顶一条软横幅写清「几条、门槛几条、为什么仍可看」
  // （位置照老实物 `weight_compare.html:79` 的 `.warn-banner`：副标题之下、KPI 之上）。
  if (h.rows.length === 1) {
    parts.push(notice({
      icon: 'warn',
      msg: '本窗只有 1 条记录（比较变化要 2 条以上）',
      detail: '单点看不出变化，页照常出：' + h.range + ' 只有 1 天有记录，再记一条就能比首末。',
    }));
  }
  parts.push(renderKpiGrid(kpiCards(h, extra, avg)));
  const plan = curvePlanOf(h, extra);
  let charts = false;
  if (plan === null) {
    // 0 条：空态句留位（不许像老技能那样 `display:none` 静默隐藏图表区；本页照常落盘成完整一页）。
    parts.push(renderEmptyBlock({
      title: '体重曲线',
      text: '本窗无体重记录（' + h.range + '）',
      hint: '说「记体重」记一条，曲线就有第一个点；本页不编默认值，也不拿别的窗口顶。',
    }));
  } else {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: {
        items: plan.asc.map((r) => ({
          label: r.date.slice(5), value: r.weight_kg,
          ...(extra.overlay === 'anomaly' && plan.anomalyDates.has(r.date) ? { anomaly: true } : {}),
        })),
        options: {
          height: 300,
          format: (v: number) => round1(v) + 'kg',
          labels: 'select',
          yTicks: plan.yTicks,
          yMin: plan.yMin,
          yMax: plan.yMax,
          highlightLast: true,
          ...(plan.asc.length >= 2 ? { avgLine: 7 } : { markPoint: true as const }),
          ...(plan.markLine === undefined ? {} : { markLine: plan.markLine }),
        },
      },
    }));
    charts = true;
    parts.push(renderListRows({ items: legendRows(h, extra, plan), emptyText: '无图例' }));
  }
  const tables = segmentTables(h, extra);
  for (const t of tables) parts.push(t);
  // 备注标签也走列表行区块，空时同样有一句（不许「没标签就整块不出现」）。
  const tags = tagDist(h.rows);
  parts.push(renderListRows({
    items: Object.entries(tags).map(([k, v]) => ({ left: k, main: '备注标签', right: String(v) + ' 条' })),
    emptyText: '无备注标签',
  }));
  parts.push(renderDisclosure({ title: '结论', contentHtml: '<p>' + conclusionOf(h, extra, avg) + '</p>', open: true }));
  parts.push(sourceLine(h, extra));
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: CMD_KEY,
    data: { items: copyRowsOf(h.rows), total: h.rows.length },
  };
  parts.push(copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: extra.command ?? 'calorie-cmd-read ' + CMD_KEY,
        source: sourceTextOf(h, extra),
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体重历史 ' + h.range,
    eyebrow: CMD_KEY + ' · 运动身体域',
    subtitle: modeBadge(extra) + '｜' + h.range + '（共 ' + h.rows.length + ' 条）',
    content: parts.join(''),
    charts,
  });
}

function legendRows(h: WeightHistoryView, extra: HistoryDocExtra, plan: CurvePlan): Array<{ left?: string; main: string; right?: string }> {
  const rows: Array<{ left?: string; main: string; right?: string }> = [
    { left: '—', main: '体重曲线', right: h.range },
  ];
  const asc = plan.asc;
  const top = asc.reduce((a, b) => (b.weight_kg > a.weight_kg ? b : a));
  const low = asc.reduce((a, b) => (b.weight_kg < a.weight_kg ? b : a));
  if (top.weight_kg !== low.weight_kg) {
    rows.push({ left: '▲', main: '最高 ' + top.weight_kg + ' kg', right: top.date });
    rows.push({ left: '▼', main: '最低 ' + low.weight_kg + ' kg', right: low.date });
  }
  if (asc.length >= 2) {
    // 图上叠的那条**灰色斜虚线**就是它（引擎 `avgLine` 追加的均线序列 `charts.ts:816` 名「7 天均线」）：
    // 图例点名「图上那条灰色虚线」，免得跟目标线／里程碑竖线混起来（§2 第 1 条：不许有画了但读不到的线）。
    const win = Math.max(3, Math.min(asc.length, 7));
    rows.push({
      left: '– –',
      main: win >= 7 ? '7 天均线' : '均线（窗口 ' + win + ' 点）',
      right: '图上那条灰色虚线（按窗口 ' + win + ' 点现算）',
    });
  }
  if (asc.length === 1) rows.push({ left: '·', main: '单点标记', right: '本窗只有 1 条记录，图上只有这一个点' });
  if (extra.overlay === 'target' && extra.goal !== null && extra.goal !== undefined) {
    const goal = extra.goal;
    const d = goal.diffKg;
    rows.push({ left: '- -', main: '目标线', right: '目标 ' + goal.kg + ' kg' + (plan.targetInRange ? '' : '（量程外，改画文字）') });
    if (!plan.targetInRange && d !== null) {
      // 老技能 `weight_history.html:275-278`：目标远超数据范围时退化成文字徽章，不拉长量程。
      rows.push({
        left: '→',
        main: d > 0 ? '距目标还差 ' + d + ' kg' : d < 0 ? '已达目标（低于目标 ' + Math.abs(d) + ' kg）' : '已达目标',
        right: '目标 ' + goal.kg + ' kg',
      });
    } else if (!plan.targetInRange) {
      rows.push({ left: '→', main: '本窗无记录可比', right: '目标 ' + goal.kg + ' kg' });
    }
  }
  if (extra.overlay === 'milestone') {
    for (const m of extra.milestones ?? []) {
      const inWindow = plan.milestoneInWindow !== undefined && plan.milestoneInWindow.date === m.date;
      rows.push({ left: '◆', main: m.label, right: m.date + ' ' + m.kg + 'kg' + (inWindow ? '（窗内已标竖线）' : '（窗口外）') });
    }
    if ((extra.milestones ?? []).length === 0) rows.push({ left: '◇', main: '里程碑未达成', right: (extra.milestoneMiss ?? []).join('；') || '继续记录' });
  }
  if (extra.overlay === 'anomaly') {
    for (const a of extra.anomalies ?? []) {
      rows.push({ left: '▲', main: '异常点 ' + a.date, right: a.kg + 'kg（偏 ' + a.deviationKg + '，图上已染红）' });
    }
    if ((extra.anomalies ?? []).length === 0) {
      rows.push({ left: '△', main: '本窗无异常点', right: extra.anomalyNote ?? '波动在阈值内' });
    }
  }
  if (extra.noteOnly) rows.push({ left: '✎', main: '只看有备注的记录', right: '共 ' + h.rows.length + ' 条' });
  return rows;
}

function segmentTables(h: WeightHistoryView, extra: HistoryDocExtra): string[] {
  const cols: DataTableColumn[] = [
    { key: 'date', label: '日期' },
    { key: 'time', label: '时间' },
    { key: 'kg', label: '体重', align: 'right' },
    { key: 'bmi', label: 'BMI', align: 'right' },
    { key: 'note', label: '备注' },
  ];
  // 可见文本的空值一律 `—`（`t395-融合基准.md` 裁定 2）；复制载荷那边保留原始空值。
  const toRow = (r: (typeof h.rows)[number]) => ({
    date: r.date, time: r.time ?? '—', kg: r.weight_kg,
    bmi: r.bmi === null || r.bmi === undefined ? '—' : r.bmi,
    note: r.note && String(r.note).trim() !== '' ? r.note : '—',
  });
  const suffix = extra.noteOnly ? '·有备注' : '';
  if (h.rows.length > 30) {
    const head = h.rows.slice(0, 30);
    const tail = h.rows.slice(30);
    return [
      renderDataTable({
        columns: cols,
        rows: head.map(toRow),
        caption: '体重明细（最近 30 条' + suffix + '）',
        emptyText: '本窗无体重记录',
      }),
      renderDataTable({
        columns: cols,
        rows: tail.map(toRow),
        caption: '体重明细（其余 ' + tail.length + ' 条' + suffix + '）',
        emptyText: '无更多记录',
      }),
    ];
  }
  return [renderDataTable({
    columns: cols,
    rows: h.rows.map(toRow),
    caption: '体重历史 ' + h.range + suffix + '（共 ' + h.rows.length + ' 条）',
    emptyText: '本窗无体重记录',
  })];
}
