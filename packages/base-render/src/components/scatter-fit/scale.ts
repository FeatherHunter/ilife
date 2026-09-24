/** scatter-fit · **数字与坐标**（本件第三份源码件：`forms.ts` 的三个骨架都用它，它谁都不用）。
 *
 *  为什么有这一件：一次落三个形态，校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`）。切口按「算数面／装配面／入参面」分：
 *   · 本件：纯算数与格式化（轴域、坐标映射、刻度文字、最小二乘拟合、概率带多边形）；
 *   · `forms.ts`：已校验的入参 → 三个骨架的模型（调本件）；
 *   · `model.ts`：入参校验与归一化入口。
 *  拆分只搬「住哪个文件」，产出一个字节都没改。
 *
 *  两条口径：
 *   1. **坐标只有一处算**：`upPct()` 是本件唯一的坐标映射（数据 → 3%…97% 的百分比），点的 `bottom`、
 *      区间条的 `bottom ＋ height`、拟合线与概率带的多边形**都从它出**；刻度文字也从同一个轴域出——
 *      两处各写一套必然走散（读者按刻度数点一定数得对）。
 *   2. 本件不认形态、不碰标记：输入是数，输出还是数（或数拼成的字形）。
 */
import { SCATTER_FIT_AXIS_INSET, type ScatterFitPoint } from './attrs.js';

/** 概率带的半宽（z 值 × 残差标准差）：1.2816 是正态 80% 区间那一档。 */
const BAND_Z = 1.2816;

/** 拟合线的半厚（占图高的百分比；170px 高的图上约 2px）。 */
export const LINE_HALF_PCT = 1.1;

/** 概率带／拟合线切成几段（5 个端点够了：拟合线本来就是直的，带子也只是上下平移）。 */
const SEGMENTS = 4;

/* ── 小工具（数字 → 字；本件不引格式化库） ─────────────────────────── */

/** 两位小数（所有出出去的百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
export const round2 = (v: number): number => Number(v.toFixed(2));

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : (v > hi ? hi : v));

/** 三位分组（`1200` → `1,200`；负号留在最前）。 */
function groupInt(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }
  return (neg ? '-' : '') + out;
}

/** 定点位数上的数字（刻度用：位数由间隔定，同一根轴上位数一致）。
 *  **量级大到 `toFixed` 只给指数写法时原样返回**（`1e+21`）——三位分组插进指数里会写成 `1e,+21`。 */
function numText(v: number, decimals: number): string {
  const s = v.toFixed(decimals);
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  return dot < 0 ? groupInt(s) : groupInt(s.slice(0, dot)) + s.slice(dot);
}

/** 读数里的数字（`title`／无障碍名用：最多两位小数，末尾的零去掉）。 */
export function plainText(v: number): string {
  const s = String(Number(v.toFixed(2)));
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  return dot < 0 ? groupInt(s) : groupInt(s.slice(0, dot)) + s.slice(dot);
}

/** 相关系数：两位小数，带正负号（负号用 U+2212 减号，与数字同宽）。 */
export function signed(v: number): string {
  return (v < 0 ? '−' : (v > 0 ? '+' : '')) + Math.abs(v).toFixed(2);
}

/** 「相关强度」那句话说**多强**、不说方向（方向由正负号给）：口径与原型墙同档（0.62 算中等）。 */
export function strengthText(r: number): string {
  const a = Math.abs(r);
  if (a < 0.2) return '几乎无关';
  if (a < 0.4) return '弱相关';
  if (a < 0.7) return '中等相关';
  if (a < 0.85) return '较强相关';
  return '强相关';
}

/* ── 轴域与刻度 ───────────────────────────────────────────────────── */

/** 轴域：好看的上下界 ＋ 间隔 ＋ 间隔的小数位。 */
export interface Axis {
  readonly lo: number;
  readonly hi: number;
  readonly step: number;
  readonly decimals: number;
}

/** 一步「好看」的间隔：1／2／2.5／5／10 × 10^k。 */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5]) if (raw <= m * mag * (1 + 1e-9)) return m * mag;
  return 10 * mag;
}

/** 同一把尺上的**下一档**间隔（1 → 2 → 2.5 → 5 → 10 → 20 …）。 */
function nextNiceStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(step)));
  const mantissa = step / mag;
  for (const m of [1, 2, 2.5, 5]) if (m > mantissa * (1 + 1e-9)) return m * mag;
  return 10 * mag;
}

/** 间隔要几位小数才写得准（2.5 → 1 位；0.25 → 2 位）。 */
function stepDecimals(step: number): number {
  for (let d = 0; d <= 6; d += 1) {
    const scaled = step * Math.pow(10, d);
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return d;
  }
  return 6;
}

/** 把数据区间撑成一段好看的轴域。
 *
 *  **轴顶＝`loNice ＋ (ticks-1) × step`**（不是 `ceil(hi/step)*step`）：这两条以前是解耦的，
 *  取整之后区间数会掉到 `ticks-1` 以下，而刻度文字仍按 `lo ＋ step × i` 算 ⇒ **刻度跑到轴顶之外**，
 *  读者按刻度读出来的位置系统性偏小（4630/8000 组随机区间里顶刻度 ≠ 轴顶，实测过 +30% 的读数偏差）。
 *  撑不下就把步长往上抬一档（`hiNice < hi` 时），保证轴域永远盖得住数据。 */
export function niceAxis(min: number, max: number, ticks: number): Axis {
  let lo = min;
  let hi = max;
  /* 全部读数同一个值：轴域没有宽度，撑一个"单位"出来（不然除零；也不许静默画成一条线）。 */
  if (!(hi > lo)) {
    const pad = Math.abs(lo) > 0 ? Math.abs(lo) * 0.1 : 1;
    lo -= pad;
    hi += pad;
  }
  let step = niceStep((hi - lo) / (ticks - 1));
  let decimals = stepDecimals(step);
  let loNice = Number((Math.floor(lo / step + 1e-9) * step).toFixed(decimals));
  let hiNice = Number((loNice + step * (ticks - 1)).toFixed(decimals));
  for (let guard = 0; guard < 64 && hiNice < hi; guard += 1) {
    step = nextNiceStep(step);
    decimals = stepDecimals(step);
    loNice = Number((Math.floor(lo / step + 1e-9) * step).toFixed(decimals));
    hiNice = Number((loNice + step * (ticks - 1)).toFixed(decimals));
  }
  return { lo: loNice, hi: hiNice, step, decimals };
}

/** 一段轴域的刻度文字（第一枚带单位：`1,200 卡`／`69.0 公斤`）；`top` ＝ 纵轴（从大往小写）。 */
export function tickTexts(axis: Axis, ticks: number, unit: string | undefined, top: boolean): string[] {
  const values: number[] = [];
  for (let i = 0; i < ticks; i += 1) values.push(Number((axis.lo + axis.step * i).toFixed(axis.decimals)));
  const ordered = top ? values.slice().reverse() : values;
  return ordered.map((v, i) => numText(v, axis.decimals) + (i === 0 && unit !== undefined ? ' ' + unit : ''));
}

/* ── 坐标映射（本件唯一的映射） ───────────────────────────────────── */

/** **唯一的坐标映射**：数据 → 「从下往上」的百分比（3…97；CSS 的 `bottom`／`height` 那一套）。 */
export function upPct(value: number, axis: Axis): number {
  const t = (value - axis.lo) / (axis.hi - axis.lo);
  return round2(clamp(SCATTER_FIT_AXIS_INSET + t * (100 - 2 * SCATTER_FIT_AXIS_INSET), 0, 100));
}

/** 多边形用的是**从左上角往下**的坐标（`clip-path` 的口径）：把上面那个翻过来。 */
const flipPct = (up: number): number => round2(100 - up);

/* ── 拟合与概率带 ─────────────────────────────────────────────────── */

interface FitResult {
  readonly slope: number;
  readonly intercept: number;
  /** 概率带的半宽（纵轴的数据单位）。 */
  readonly half: number;
  /** 相关系数；算不出时 `null`。 */
  readonly r: number | null;
  /** 算不出的原因（`r === null` 时才非空）。 */
  readonly why: string;
}

/** 最小二乘拟合 ＋ 皮尔逊相关系数 ＋ 残差标准差（一个循环算完，不来回扫三遍）。 */
export function fitOf(points: readonly ScatterFitPoint[]): FitResult {
  const n = points.length;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  /* 两个方向都得有变化才谈得上"相关"：x 全相同（一条竖线）或 y 全相同（一条横线）时 r 无定义。 */
  const why = n < 2 ? '只有一个点' : (sxx <= 0 ? '横轴读数的值全相同' : (syy <= 0 ? '纵轴读数的值全相同' : ''));
  if (why !== '') return { slope: 0, intercept: my, half: 0, r: null, why };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ss = 0;
  for (const p of points) {
    const d = p.y - (intercept + slope * p.x);
    ss += d * d;
  }
  const half = n > 2 ? BAND_Z * Math.sqrt(ss / (n - 2)) : 0;
  return { slope, intercept, half, r: round2(clamp(sxy / Math.sqrt(sxx * syy), -1, 1)), why: '' };
}

/** 一条「带」的多边形：沿横轴取段，上下各让开 `halfUp` 个百分比 —— 概率带与拟合线共用这一支。 */
export function bandPolygon(axisX: Axis, axisY: Axis, fit: FitResult, halfUp: number): string {
  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const x = axisX.lo + (axisX.hi - axisX.lo) * (i / SEGMENTS);
    const yUp = upPct(fit.intercept + fit.slope * x, axisY);
    const xPct = upPct(x, axisX);
    upper.push(String(xPct) + '% ' + String(flipPct(clamp(yUp + halfUp, 0, 100))) + '%');
    lower.push(String(xPct) + '% ' + String(flipPct(clamp(yUp - halfUp, 0, 100))) + '%');
  }
  return 'polygon(' + upper.concat(lower.reverse()).join(', ') + ')';
}
