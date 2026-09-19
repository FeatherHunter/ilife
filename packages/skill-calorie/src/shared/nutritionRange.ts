/** 三大营养素推荐区间的**唯一定义地**（#717 批②）。
 *
 * 谁在用（写得出哪两个能力在用）：
 *   ① 饮食能力 `diet/`——「营养配比」页的推荐范围对比表（`diet/nutritionPort.ts` 取数、`diet/nutritionPortDocs.ts` 上屏）；
 *   ② 分析能力 `analysis/`——「诊断营养不均衡(含均衡判断)」的失衡判决（`analysis/anomaly/diet.ts`）。
 *
 * 本件**零依赖**：不 import 任何件，也不出现任何一个能力目录的名字（结构标准的「依赖方向」）。
 *
 * 收在这里之前的样子（#701 普查、#717 批②）：配比页那一套（旧 `render_nutrition_ratio.py` 的 range 表逐字）
 * 住 `diet/nutritionPort.ts`，而诊断侧另写了一套 **无出处** 的数（15-30／40-60／20-35）并拿它出判决——
 * 同一份库上，一边印 10-20／45-65／20-35，另一边印 15-30／40-60／20-35 并按后者判「失衡」。
 * 内容三裁（#701 已由维护者裁定）：取**有出处的那一套**（蛋白 10-20／碳水 45-65／脂肪 20-35），
 * 孤儿那套作废。
 */

/** 三大营养素的名字（取值键；页面与诊断两侧共用同一组键，避免各写一套中文名）。 */
export const MACRO_NAMES = ['protein', 'carb', 'fat'] as const;

export type MacroName = (typeof MACRO_NAMES)[number];

/** 推荐区间（占**总热量**的百分比，闭区间）。 */
export interface NutritionRange {
  readonly min: number;
  readonly max: number;
  /** 上屏用的现成说法（`10-20%` 这一形状；两侧页面的那句话都取它，不各自拼）。 */
  readonly label: string;
}

export const NUTRITION_RANGE: Record<MacroName, NutritionRange> = {
  protein: { min: 10, max: 20, label: '10-20%' },
  carb: { min: 45, max: 65, label: '45-65%' },
  fat: { min: 20, max: 35, label: '20-35%' },
};

/** 判决用的一句话参考串（诊断侧的证据句用它，免得逐项拼、也免得两处措辞走散）。 */
export function nutritionRangeNote(): string {
  return '参考 蛋白' + NUTRITION_RANGE.protein.min + '-' + NUTRITION_RANGE.protein.max
    + ' 碳水' + NUTRITION_RANGE.carb.min + '-' + NUTRITION_RANGE.carb.max
    + ' 脂肪' + NUTRITION_RANGE.fat.min + '-' + NUTRITION_RANGE.fat.max;
}
