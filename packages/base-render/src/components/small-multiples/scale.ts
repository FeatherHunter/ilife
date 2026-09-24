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
 */
import { SMALL_MULTIPLES_BAR_CEIL_PCT, SMALL_MULTIPLES_BAR_FLOOR_PCT } from './attrs.js';

/** 唯一的坐标跨度（＝上限 − 下限）。上下限本身住 `attrs.ts`（那是本件的尺，判据与调用方都读它）。 */
const BAR_SPAN_PCT = SMALL_MULTIPLES_BAR_CEIL_PCT - SMALL_MULTIPLES_BAR_FLOOR_PCT;

/** 两位小数（所有出出去的百分比都过它：行内样式里不许出现 0.30000000000000004）。 */
const round2 = (v: number): number => Number(v.toFixed(2));

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

/** **唯一的坐标映射**：读数 → 柱高百分比（最低那一档落在上限 20%、最高那一档落在 84%）。
 *
 *  这条公式也是**均值线**的位置：把均值当成一个读数喂进来，线的位置就是「均值柱」该有的高度——
 *  所以「线压在柱顶上」这件事在任何一组数据下都成立（读数等于均值的那一期，柱顶正好被线穿过）。 */
export function barPct(value: number, range: BarRange): number {
  const t = range.flat ? 0.5 : (value - range.lo) / (range.hi - range.lo);
  return round2(SMALL_MULTIPLES_BAR_FLOOR_PCT + t * BAR_SPAN_PCT);
}

/** 这几期的均值：**算术平均**，不是加权、不是目标（口径句里明写「均值不是目标」）。
 *
 *  写法上的两条：读数**全是整数**（卡数／次数／分钟，最常见的形状）时均值取到整数——
 *  一串整数读数的均值不该在屏上长出一串小数位；否则最多两位小数（与柱下那枚读数同一档精度）。 */
export function meanOf(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  return values.every((v) => Number.isInteger(v)) ? Math.round(mean) : round2(mean);
}

/** 读数写成给人看的串：千分位分组，至多两位小数（`1690` → `1,690`）。
 *  用内置的 `toLocaleString`（**不引格式化库、也不把兄弟件那份小工具抄一遍**）；
 *  显式点名 `en-US` ⇒ 分组符与小数点固定，不看运行环境的区域设置。 */
export function numText(v: number): string {
  /* `-0` 写成 `0`：读数是负零（差值算出来的那种）时，屏上不该出现一根带负号的零。 */
  const n = v === 0 ? 0 : v;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
