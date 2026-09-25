/** gap-band · **数字与坐标**（本件第二份源码件：`forms.ts` 的两个骨架都用它，它谁都不用）。
 *
 *  为什么有这一件：校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350（`packages/base-render/AGENTS.md`）。
 *  切口按「算数面／装配面／入参面」分（先例 `spread-dist/scale.ts`）：
 *   · 本件：纯算数与格式化（轴域、刻度文字、坐标映射、数字写法）；
 *   · `forms.ts`：已校验的入参 → 两个骨架的模型（调本件）；
 *   · `model.ts`：入参校验与归一化入口。
 *
 *  三条口径：
 *   1. **坐标只有两处算**：`upPct()`（数据 → 从下往上的百分比）与 `topPct()`（＝100 − 它，
 *      数据 → 从上往下的百分比）。差值图区里**每枚纵轴刻度、计划线、折线每个顶点、
 *      带子多边形、每枚图内锚点**全都从这两支出；两处各写一套必然走散
 *      （原型返修点：计划线刻度写 7.5h 却画在 42%，与刻度不同源）。
 *   2. **不做轴内距**：数据直接落在轴上（轴底刻度＝底轴、轴顶刻度＝轴顶）。
 *      线是 2px，压到轴上至多漫出 1px，首末刻度各平移半个字高后仍对得上。
 *   3. 本件不认形态、不碰标记：输入是数，输出还是数（或数拼成的字形）。
 *
 *  兄弟件那边同一段轴域算法各有一份（本仓契约：件与件只经对方 `index.ts` 互相引用，本批工艺又只许
 *  **新建**文件、不许改 `spread-dist`）——收口时若要合并，落点是共用位 `shared/axis.ts`。
 */
import { GAP_BAND_AXIS_TICKS, GAP_BAND_MAX_TICKS } from './attrs.js';
import { badInput } from '../shared/validate.js';

/* ── 小工具（数字 → 字；本件不引格式化库） ─────────────────────────── */

/** 两位小数（所有出出去的百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
export const round2 = (v: number): number => Number(v.toFixed(2));

/** 夹到 `[0, 100]`（坐标永远不越轴域：喂进来的数在轴域外时也只是贴边，不画到框外）。 */
const clampPct = (v: number): number => (v < 0 ? 0 : (v > 100 ? 100 : v));

/** 三位分组（`1800` → `1,800`；负号留在最前）。
 *  **只许喂有限数的整数部分**：喂进 `Infinity` 会写出 `In,fin,ity`（把"非数"印成"数"），
 *  喂进指数串会写出 `1e,+21` —— 两种都是"看着像数、其实不是它"。 */
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

/** 读数里的数字（锚点／净差／无障碍名用：最多两位小数，末尾的零去掉）。
 *  **非有限值不写成数**（`In,fin,ity` 那种是三位分组啃了 `Infinity` 造出来的假数）：
 *  回 `NaN`／`Infinity` 原样 —— 一眼是假，好过一个编出来的数。 */
export function plainText(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const s = String(Number(v.toFixed(2)));
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  return dot < 0 ? groupInt(s) : groupInt(s.slice(0, dot)) + s.slice(dot);
}

/** 带符号的读数（净差与柱上那个数用：正数补 ASCII `+`，负数用 `−`，零不带号）。
 *  ASCII `+` 与 `−` 都不在分隔符门的并列分隔符集里（那一集只认全角 `＋`），故不触发 R3。 */
export function signedText(v: number): string {
  const t = plainText(Math.abs(v));
  if (v > 0) return '+' + t;
  if (v < 0) return '−' + t;
  return t;
}

/** 单位那一段（进了可见文本，故与读数同一处拼）：**没有单位就什么都不加**。 */
export const unitPart = (unit: string | undefined): string => (unit === undefined ? '' : ' ' + unit);

/* ── 轴域与刻度 ───────────────────────────────────────────────────── */

/** 轴域：好看的上下界 ＋ 间隔 ＋ 间隔的小数位 ＋ 刻度枚数。 */
export interface Axis {
  readonly lo: number;
  readonly hi: number;
  readonly step: number;
  readonly decimals: number;
  /** 刻度枚数：**由 `lo`／`hi`／`step` 反算出来**，不是一个独立的输入。 */
  readonly ticks: number;
}

/** 一步「好看」的间隔：1／2／2.5／5／10 × 10^k。 */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5]) if (raw <= m * mag * (1 + 1e-9)) return m * mag;
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
 *  **轴顶＝`ceil(最大值/步长)×步长`、轴底＝`floor(最小值/步长)×步长`，枚数由这两头反算**
 *  —— 刻度文字、计划线位置与折线坐标**都从这一个 `Axis` 出**，三者不可能走散。
 *
 *  两个边界：
 *   · **全部读数同一个值**（`min === max`）：撑开半档出来（不然除零；也不许静默画成一条贴轴的线）；
 *   · 步长小数位有限（至多 6 位）：撑开后若两头量化成同一个数，把上界抬一个步长。
 *
 *  **轴域这步挡住跨度溢出**：`hi − lo` 溢出成 `Infinity` 时（一天 `−1e308`、另一天 `1e308`）
 *  步长会退回 1、枚数跟着变成 `Infinity`，调用方那个 `for (i = 0; i < ticks; i++)` 就永不到头
 *  —— 旧实现实测把宿主进程打到 `Reached heap limit … out of memory`（exit 134）。
 *  先例 `spread-dist/scale.ts` 同此口径：**算不出来一律 `badInput()`，不静默降级**；
 *  枚数再夹一道常量上限，迭代次数恒由常量定。 */
export function niceAxis(min: number, max: number, target: number = GAP_BAND_AXIS_TICKS): Axis {
  if (!Number.isFinite(min) || !Number.isFinite(max)) badInput('gap-band: 轴域算不出来（读数非有限）');
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    const pad = Math.abs(lo) > 0 ? Math.abs(lo) * 0.5 : 1;
    lo -= pad;
    hi += pad;
  }
  const span = hi - lo;
  if (!Number.isFinite(span) || !(span > 0)) badInput('gap-band: 轴域算不出来（区间非有限或无宽度）');
  const step = niceStep(span / (target - 1));
  if (!Number.isFinite(step) || !(step > 0)) badInput('gap-band: 轴域算不出来（步长非有限）');
  const decimals = stepDecimals(step);
  const loNice = Number((Math.floor(lo / step + 1e-9) * step).toFixed(decimals));
  let hiNice = Number((Math.ceil(hi / step - 1e-9) * step).toFixed(decimals));
  if (!(hiNice > loNice)) hiNice = Number((loNice + step).toFixed(decimals));
  if (!Number.isFinite(loNice) || !Number.isFinite(hiNice)) badInput('gap-band: 轴域算不出来（取整后非有限）');
  const rawTicks = Math.round((hiNice - loNice) / step) + 1;
  if (!Number.isFinite(rawTicks)) badInput('gap-band: 轴域算不出来（刻度数非有限）');
  /* 枚数先夹到常量上限再出：调用方拿它进循环时迭代次数恒 ≤ 上限（**不由数据决定**）。 */
  const ticks = Math.max(2, Math.min(GAP_BAND_MAX_TICKS, rawTicks));
  return { lo: loNice, hi: hiNice, step, decimals, ticks };
}

/** 一段轴域上的刻度值（从下往上：第 0 枚＝轴底；枚数恒 ≤ 常量上限，进循环前已夹过）。 */
export function tickValues(axis: Axis): number[] {
  const out: number[] = [];
  const n = Math.min(axis.ticks, GAP_BAND_MAX_TICKS);
  for (let i = 0; i < n; i += 1) out.push(Number((axis.lo + axis.step * i).toFixed(axis.decimals)));
  return out;
}

/** 刻度文字（**从大往小**：纵轴口径）；只有最高那一枚带单位。 */
export function tickTexts(axis: Axis, unit: string | undefined): string[] {
  const values = tickValues(axis).reverse();
  return values.map((v, i) => numText(v, axis.decimals) + (i === 0 ? unitPart(unit) : ''));
}

/* ── 坐标映射（本件唯二的映射） ───────────────────────────────────── */

/** 数据 → 从下往上的百分比（0…100）。差值图区里纵向位置的唯一算法口径。 */
export function upPct(value: number, axis: Axis): number {
  const raw = (value - axis.lo) / (axis.hi - axis.lo);
  const t = Number.isFinite(raw) ? raw : (value >= axis.hi ? 1 : 0);
  return round2(clampPct((t < 0 ? 0 : (t > 1 ? 1 : t)) * 100));
}

/** 数据 → 从上往下的百分比（0…100）：行内 `top`／SVG 纵坐标／锚点位置都走它。
 *  ＝100 − `upPct()` —— 同一份真值的另一面，不是第二套算法。 */
export function topPct(value: number, axis: Axis): number {
  return round2(100 - upPct(value, axis));
}
