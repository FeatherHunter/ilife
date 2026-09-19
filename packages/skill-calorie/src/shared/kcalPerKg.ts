/** 千卡 ↔ 体重换算常数（#717 批④·第 1 件）。
 *
 * 谁在用（写得出哪两个能力在用）：
 *   ① 分析能力 `analysis/`——缺口折算（`analysis/deficit.ts` 的 `predictedLossKg`、`analysis/review.ts` 的理论减重）；
 *   ② 目标能力 `goal/`（`goal/set.ts` 的目标速率反推）与体重能力 `weight/`（`weight/figures.ts` 的目标热量差）；
 *   ③ 饮食能力 `diet/`（`diet/dietEngine.ts` 的缺口折算）。
 *
 * 本件**零依赖**：不 import 任何件，也不出现任何一个能力目录的名字。
 *
 * 收在这里之前的样子（#701 普查、#717 批④）：`analysis/deficit.ts` 与 `analysis/simulate.ts`
 * 各写一份 `const KCAL_PER_KG = 7700`（两份同值、各改各的），另有三处裸字面 `7700`
 * （`diet/dietEngine.ts`／`goal/set.ts`／`weight/figures.ts`）——常数一改，五处不会一起改。
 */

/** 1 公斤体重的热量当量（千卡）。脂肪组织的常用近似值，全包只此一处。 */
export const KCAL_PER_KG = 7700;
