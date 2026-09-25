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
 *      逐日柱区里**每根范围条的 `bottom`／`height`、每个中位块的 `bottom`、每一枚纵轴刻度的 `top`**
 *      全都从它出；刻度**文字**也从同一个轴域出 —— 两处各写一套必然走散
 *      （先例：轴域 0…6000 而刻度铺到 8,000，读者按刻度读出来的值系统性偏小）。
 *   2. **不做轴内距**：数据直接落在轴上（轴底刻度＝底轴、轴顶刻度＝轴顶）。
 *      柱是矩形，压到轴上不会像散点的圆那样出框 ⇒ 不需要内距，读者按刻度量一根柱**量得准**。
 *   3. 本件不认形态、不碰标记：输入是数，输出还是数（或数拼成的字形）。
 *
 *  兄弟件那边同一段轴域算法各有一份（本仓契约：件与件只经对方 `index.ts` 互相引用，本批工艺又只许
 *  **新建**文件、不许改 `scatter-fit`）——收口时若要合并，落点是共用位 `shared/axis.ts`。
 */
import { SPREAD_DIST_AXIS_TICKS } from './attrs.js';

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

/** 读数里的数字（`title`／无障碍名用：最多两位小数，末尾的零去掉）。 */
export function plainText(v: number): string {
  const s = String(Number(v.toFixed(2)));
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  return dot < 0 ? groupInt(s) : groupInt(s.slice(0, dot)) + s.slice(dot);
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
 *  —— 刻度文字、刻度位置与柱子坐标**都从这一个 `Axis` 出**，三者不可能走散
 *  （camel 先例 `scatter-fit/scale.ts` 的审查教训：轴域与刻度一旦解耦，读者按刻度读出来的值会系统性偏小）。
 *
 *  两个边界：
 *   · **全部读数同一个值**（`min === max`）：撑开半档出来（不然除零；也不许静默画成一条贴轴的线）；
 *   · 步长小数位有限（至多 6 位）：撑开后若两头量化成同一个数，把上界抬一个步长。 */
export function niceAxis(min: number, max: number, target: number = SPREAD_DIST_AXIS_TICKS): Axis {
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    const pad = Math.abs(lo) > 0 ? Math.abs(lo) * 0.5 : 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / (target - 1));
  const decimals = stepDecimals(step);
  const loNice = Number((Math.floor(lo / step + 1e-9) * step).toFixed(decimals));
  let hiNice = Number((Math.ceil(hi / step - 1e-9) * step).toFixed(decimals));
  if (!(hiNice > loNice)) hiNice = Number((loNice + step).toFixed(decimals));
  const ticks = Math.max(2, Math.round((hiNice - loNice) / step) + 1);
  return { lo: loNice, hi: hiNice, step, decimals, ticks };
}

/** 一段轴域上的刻度值（从下往上：第 0 枚＝轴底）。 */
export function tickValues(axis: Axis): number[] {
  const out: number[] = [];
  for (let i = 0; i < axis.ticks; i += 1) out.push(Number((axis.lo + axis.step * i).toFixed(axis.decimals)));
  return out;
}

/** 刻度文字（**从大往小**：纵轴口径）；只有最高那一枚带单位。 */
export function tickTexts(axis: Axis, unit: string | undefined): string[] {
  const values = tickValues(axis).reverse();
  return values.map((v, i) => numText(v, axis.decimals) + (i === 0 ? unitPart(unit) : ''));
}

/* ── 坐标映射（本件唯一的映射） ───────────────────────────────────── */

/** **唯一的坐标映射**：数据 → 从下往上的百分比（0…100）。
 *
 *  逐日柱区里每根范围条的 `bottom`／`height`、每个中位块的 `bottom`、每枚纵轴刻度的 `top`
 *  都只经这一支 —— 刻度与柱子是同一份真值，读者按刻度读出来的值就是柱子的位置。 */
export function upPct(value: number, axis: Axis): number {
  const raw = (value - axis.lo) / (axis.hi - axis.lo);
  const t = Number.isFinite(raw) ? raw : (value >= axis.hi ? 1 : 0);
  return round2(at01(t) * 100);
}
