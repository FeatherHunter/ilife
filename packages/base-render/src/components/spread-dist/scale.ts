/** spread-dist · **数字与坐标**（本件第三份源码件：`forms.ts` 的两个骨架都用它，它谁都不用）。
 *
 *  为什么有这一件：校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350（`packages/base-render/AGENTS.md`）。
 *  切口按「算数面／装配面／入参面」分（先例 `scatter-fit/scale.ts`）：
 *   · 本件：纯算数与格式化（轴域、刻度文字与刻度位置、坐标映射、数字写法）；
 *   · `forms.ts`：已校验的入参 → 两个骨架的模型（调本件）；
 *   · `model.ts`：入参校验与归一化入口。
 *
 *  三条口径：
 *   1. **坐标只有一处算**：`upPct()` 是本件唯一的坐标映射（数据 → 从下往上的百分比）。
 *      逐日柱区里**每根范围条的 `bottom`／`height`、每个中位块的 `bottom`、每一枚纵轴刻度的 `bottom`**
 *      全都从它出；刻度**文字**也从同一个轴域出 —— 两处各写一套必然走散
 *      （先例：轴域 0…6000 而刻度铺到 8,000，读者按刻度读出来的值系统性偏小）。
 *   2. **不做轴内距**：数据直接落在轴上（轴底刻度＝底轴、轴顶刻度＝轴顶）。
 *      柱是矩形，压到轴上不会像散点的圆那样出框 ⇒ 不需要内距，读者按刻度量一根柱**量得准**。
 *   3. 本件不认形态、不碰标记：输入是数，输出还是数（或数拼成的字形）。
 *
 *  兄弟件那边同一段轴域算法各有一份（本仓契约：件与件只经对方 `index.ts` 互相引用，本批工艺又只许
 *  **新建**文件、不许改 `scatter-fit`）——收口时若要合并，落点是共用位 `shared/axis.ts`。
 */
import { SPREAD_DIST_AXIS_TICKS, SPREAD_DIST_MAX_TICKS } from './attrs.js';
import { badInput } from '../shared/validate.js';

/* ── 小工具（数字 → 字；本件不引格式化库） ─────────────────────────── */

/** 两位小数（所有出出去的百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
export const round2 = (v: number): number => Number(v.toFixed(2));

/** 夹到 `[0, 1]`（坐标永远不越轴域：喂进来的数在轴域外时也只是贴边，不画到框外）。 */
const at01 = (t: number): number => (t < 0 ? 0 : (t > 1 ? 1 : t));

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

/** 读数里的数字（`title`／无障碍名用：12 位定点去零，保证非零读数不写成 `0`；
 *  小到只给指数写法的读数展开成定点（与刻度同形，不与刻度写两样）。 */
export function plainText(v: number): string {
  const s = v.toFixed(12);
  if (s.includes('e') || s.includes('E')) return s;
  let n = String(Number(s));
  if (/e\+/.test(n)) return n;
  if (/e-/.test(n)) {
    /* 定点串直接去零（不经 `Number()` 回绕，否则又变回指数；`groupInt` 也不能碰指数串）。 */
    const dec = Math.min(15, Math.max(0, -Math.floor(Math.log10(Math.abs(v))) + 2));
    const f = v.toFixed(dec);
    const at = f.indexOf('.');
    const frac = at < 0 ? '' : f.slice(at + 1).replace(/0+$/, '');
    const head = at < 0 ? f : f.slice(0, at);
    return groupInt(head) + (frac === '' ? '' : '.' + frac);
  }
  const dot = n.indexOf('.');
  return dot < 0 ? groupInt(n) : groupInt(n.slice(0, dot)) + n.slice(dot);
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

/** 间隔要几位小数才写得准（2.5 → 1 位；0.25 → 2 位；相对容差：微小步长不坍成 0 位）。 */
function stepDecimals(step: number): number {
  for (let d = 0; d <= 12; d += 1) {
    const scaled = step * Math.pow(10, d);
    if (!Number.isFinite(scaled)) continue;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9 * Math.max(1, Math.abs(scaled))) return d;
  }
  return 12;
}

/** 把数据区间撑成一段好看的轴域。
 *
 *  **轴顶＝`ceil(最大值/步长)×步长`、轴底＝`floor(最小值/步长)×步长`，枚数由这两头反算**
 *  —— 刻度文字、刻度位置与柱子坐标**都从这一个 `Axis` 出**，三者不可能走散
 *  （camel 先例 `scatter-fit/scale.ts` 的审查教训：轴域与刻度一旦解耦，读者按刻度读出来的值会系统性偏小）。
 *
 *  两个边界：
 *   · **全部读数同一个值**（`min === max`）：撑开半档出来（不然除零；也不许静默画成一条贴轴的线）；
 *   · 步长小数位有限（至多 6 位）：撑开后若两头量化成同一个数，把上界抬一个步长。 */
export function niceAxis(min: number, max: number, target: number = SPREAD_DIST_AXIS_TICKS): Axis {
  if (!Number.isFinite(min) || !Number.isFinite(max)) badInput('spread-dist: 轴域算不出来（读数非有限）');
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    const pad = Math.abs(lo) > 0 ? Math.abs(lo) * 0.5 : 1;
    lo -= pad;
    hi += pad;
  }
  const span = hi - lo;
  if (!Number.isFinite(span) || !(span > 0)) badInput('spread-dist: 轴域算不出来（区间非有限或无宽度）');
  const step = niceStep(span / (target - 1));
  if (!Number.isFinite(step) || !(step > 0)) badInput('spread-dist: 轴域算不出来（步长非有限）');
  const decimals = stepDecimals(step);
  const loNice = Number((Math.floor(lo / step + 1e-9) * step).toFixed(decimals));
  let hiNice = Number((Math.ceil(hi / step - 1e-9) * step).toFixed(decimals));
  if (!(hiNice > loNice)) hiNice = Number((loNice + step).toFixed(decimals));
  if (!Number.isFinite(loNice) || !Number.isFinite(hiNice)) badInput('spread-dist: 轴域算不出来（取整后非有限）');
  const rawTicks = Math.round((hiNice - loNice) / step) + 1;
  if (!Number.isFinite(rawTicks)) badInput('spread-dist: 轴域算不出来（刻度数非有限）');
  /* 枚数先夹到常量上限再出：调用方拿它进循环时迭代次数恒 ≤ 上限（不由数据决定）。 */
  const ticks = Math.max(2, Math.min(SPREAD_DIST_MAX_TICKS, rawTicks));
  return { lo: loNice, hi: hiNice, step, decimals, ticks };
}

/** 一段轴域上的刻度值（从下往上：第 0 枚＝轴底；枚数恒 ≤ 常量上限，进循环前已夹过）。 */
export function tickValues(axis: Axis): number[] {
  const out: number[] = [];
  const n = Math.min(axis.ticks, SPREAD_DIST_MAX_TICKS);
  for (let i = 0; i < n; i += 1) out.push(Number((axis.lo + axis.step * i).toFixed(axis.decimals)));
  return out;
}

/** 刻度文字（**从大往小**：纵轴口径）；只有最高那一枚带单位。 */
export function tickTexts(axis: Axis, unit: string | undefined): string[] {
  const values = tickValues(axis).reverse();
  return values.map((v, i) => numText(v, axis.decimals) + (i === 0 ? unitPart(unit) : ''));
}

/** 一把横轴尺子上的一枚刻度：**文字 ＋ 它自己那个值的百分比位置**（**从小到大**：横轴口径）。
 *
 *  与 `tickTexts()` 出自同一支 `tickValues()`（竖轴从大往小、横轴从小到大，两处不可能走散）；
 *  文字不带单位——A 档的单位只印一次（卡头右端），刻度值不再逐枚带。 */
export interface RulerTick {
  readonly text: string;
  /** 从左边起的百分比位置（与柱／箱／点的 `leftPct` 是**同一个** `upPct()`）。 */
  readonly leftPct: number;
}

/** 一段轴域上的横轴刻度（位置与文字同一份轴域）。 */
export function rulerTicks(axis: Axis): RulerTick[] {
  return tickValues(axis).map((v) => ({ text: numText(v, axis.decimals), leftPct: upPct(v, axis) }));
}

/* ── 坐标映射（本件唯一的映射） ───────────────────────────────────── */

/** **唯一的坐标映射**：数据 → 从下往上的百分比（0…100）。
 *
 *  逐日柱区里每根范围条的 `bottom`／`height`、每个中位块的 `bottom`、每枚纵轴刻度的 `bottom`
 *  都只经这一支 —— 刻度与柱子是同一份真值，读者按刻度读出来的值就是柱子的位置。 */
export function upPct(value: number, axis: Axis): number {
  const raw = (value - axis.lo) / (axis.hi - axis.lo);
  const t = Number.isFinite(raw) ? raw : (value >= axis.hi ? 1 : 0);
  return round2(at01(t) * 100);
}
