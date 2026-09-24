/** small-multiples · **数字与坐标**（本件第二份源码件：`model.ts` 用它，它谁都不用）。
 *
 *  为什么有这一件：校验 ＋ 装配 ＋ 算数挤在一件里会逼近本包告警线 350 行（`packages/base-render/AGENTS.md`），
 *  切口照同族先例 `scatter-fit/scale.ts`（算数面／装配面／入参面分家）：本件只放**纯算数与格式化**。
 *
 *  两条口径：
 *   1. **坐标只有一处算**：`barPct()` 是本件**唯一**的坐标映射（读数 → 柱高百分比），
 *      **柱高与均值线都从它出**；每根柱下面那枚绝对读数也从同一个轴域出——
 *      两处各写一套必然走散（读者按柱高比的相对高低会与底下那个数对不上）。
 *   2. 本件不认形态、不碰标记：输入是数，输出还是数（或数拼成的字形）。
 *
 *  第三处必须分家的（2026-09 返修）：**「算出来给线用」与「量化给人看」是两个数**。
 *  屏上那一枚均值要取整（人读得出），线要压着那一期柱顶（坐标精确）——量化过的数喂进坐标映射，
 *  轴域比量化档还窄时会落到轴域外（`0.001` 与 `0.002` 的均值量化成 `0`，线跑到柱阵下面 49px）。
 */
import { SMALL_MULTIPLES_BAR_CEIL_PCT, SMALL_MULTIPLES_BAR_FLOOR_PCT } from './attrs.js';

/** 唯一的坐标跨度（＝上限 − 下限）。上下限本身住 `attrs.ts`（那是本件的尺，判据与调用方都读它）。 */
const BAR_SPAN_PCT = SMALL_MULTIPLES_BAR_CEIL_PCT - SMALL_MULTIPLES_BAR_FLOOR_PCT;

/** 两位小数（所有出出去的百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
const round2 = (v: number): number => Number(v.toFixed(2));

/** 小数位上限：`toLocaleString()` 的 `maximumFractionDigits` 最宽就是 20（再宽当场抛 `RangeError`）。 */
const MAX_FRACTION_DIGITS = 20;

/** 轴域：这几期读数的上下界。 */
export interface BarRange {
  readonly lo: number;
  readonly hi: number;
  /** 全部读数**同一个值**（轴域没有宽度）：柱高一律画在中线，不除零、也不静默画成一条压线的细条。 */
  readonly flat: boolean;
}

/** 算轴域（读数的上下界）。`values` 非空由 `model.ts` 保证（那里已经把期间数挡在门外）。 */
export function barRange(values: readonly number[]): BarRange {
  let lo = values[0];
  let hi = values[0];
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { lo, hi, flat: !(hi > lo) };
}

/** 落在 `[0, 1]` 的插值：**坐标永远不越轴域**（返修点：这条是夹具，不是装饰）。
 *
 *  为什么要有它：喂进 `barPct()` 的数若在轴域外（或轴域宽到算不出比值——`hi - lo` 溢出成 `Infinity`
 *  时 `(v - lo) / (hi - lo)` 是 `NaN`），百分比就会 < 下限或 > 上限，虚线当场跑到柱阵框外。
 *  夹这一刀之后，「柱与均值线都在柱阵内」是**算出来的**，不靠调用方守规矩。 */
function at01(value: number, range: BarRange): number {
  if (range.flat) return 0.5;
  const t = (value - range.lo) / (range.hi - range.lo);
  if (!Number.isFinite(t)) return value >= range.hi ? 1 : 0;
  if (t < 0) return 0;
  return t > 1 ? 1 : t;
}

/** **唯一的坐标映射**：读数 → 柱高百分比（最低那一档落在上限 20%、最高那一档落在 84%）。
 *
 *  这条公式也是**均值线**的位置：把均值当成一个读数喂进来，线的位置就是「均值柱」该有的高度——
 *  所以「线压在柱顶上」这件事在任何一组数据下都成立（读数等于均值的那一期，柱顶正好被线穿过）。
 *  **喂进来的必须是未量化的数**（见 `meanOf()` 与 `meanShown()` 那一对）。 */
export function barPct(value: number, range: BarRange): number {
  return round2(SMALL_MULTIPLES_BAR_FLOOR_PCT + at01(value, range) * BAR_SPAN_PCT);
}

/** 这几期的**算术平均**（**不量化**）：均值线就画在它算出来的位置上。
 *
 *  这里刻意与 `meanShown()` 分家：屏上那一枚要取整给人读，线要精确地压在读数等于均值的那根柱顶上。
 *  逐项先除后加（写成「先求和再除」时，读数极大的一档会先溢出成 `Infinity`，均值跟着失真）。 */
export function meanOf(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v / values.length;
  return sum;
}

/** **上屏位数**：常规量级至多两位小数；**小于 0.01 的那一档至少两位有效数字**——
 *  两位小数会把 `0.0015` 整个抹成 `0`、把 `0.007` 写成 `0.01`（都是十进位的整档丢失，不是舍入）。 */
function fractionDigits(abs: number): number {
  if (abs === 0 || abs >= 0.01) return 2;
  return Math.min(MAX_FRACTION_DIGITS, Math.max(2, 1 - Math.floor(Math.log10(abs))));
}

/** 按上屏位数量化一个数；二十位小数都写不进去的极端小量级退回两位有效数字。
 *  **非零的数不许量化成 `0`**（那是量级丢失，不是取整）。 */
function quantize(v: number, abs: number): number {
  const q = Number(v.toFixed(fractionDigits(abs)));
  return q === 0 && v !== 0 ? Number(v.toPrecision(2)) : q;
}

/** **上屏那一枚均值**：把 `meanOf()` 的结果量化到人读得出的位数（口径写进 README「契约与不变量」）：
 *   1. 读数**全是整数**（卡数／次数／分钟，最常见的形状）时取到整数——一串整数读数的均值不该在屏上
 *      长出一串小数位（`[1, 2]` → `2`、原型那六周 → `1,810`）；
 *   2. 否则走上面那档「上屏位数」（`[1, 2.5]` → `1.75`、`[0.006, 0.008]` → `0.007`、`[0.001, 0.002]` → `0.0015`）。
 *
 *  **线的位置不吃这一支**（它用未量化的 `meanOf()`）：量化过的数可能落到轴域外。 */
export function meanShown(values: readonly number[]): number {
  const mean = meanOf(values);
  if (values.every((v) => Number.isInteger(v))) return Math.round(mean);
  return quantize(mean, Math.abs(mean));
}

/** 读数写成给人看的串：千分位分组（`1690` → `1,690`）＋ 上面那一档**上屏位数**
 *  （`1299.5` → `1,299.5`、`0.007` → `0.007`；**非零的读数不许写成 `0`**）。
 *  用内置的 `toLocaleString`（**不引格式化库、也不把兄弟件那份小工具抄一遍**）；
 *  显式点名 `en-US` ⇒ 分组符与小数点固定，不看运行环境的区域设置。 */
export function numText(v: number): string {
  /* `-0` 写成 `0`：读数是负零（差值算出来的那种）时，屏上不该出现一根带负号的零。 */
  const n = v === 0 ? 0 : v;
  const q = quantize(n, Math.abs(n));
  const text = q.toLocaleString('en-US', { maximumFractionDigits: MAX_FRACTION_DIGITS });
  /* 二十位小数都写不进去的极端小量级：退回有效数字写法（`1e-30`），不许写成 `0`。 */
  return text === '0' && n !== 0 ? String(q) : text;
}
