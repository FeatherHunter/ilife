/** 软删「存活谓词」的**唯一定义地**（#717 批③）：`SQL 片段`，谁要用就拼进自己的 WHERE。
 *
 * 谁在用（写得出哪两个能力在用）：
 *   ① 分析能力 `analysis/`（`series.ts` 的逐日取数、`cross.ts` 的配对、`exercise.ts` 的运动汇总）；
 *   ② 抓取与能力目录（`exercise/`／`weight/`／`diet/`／`body/`／`render/` 的读路径）。
 *
 * 本件**零依赖**：不 import 任何件，也不出现任何一个能力目录的名字。
 *
 * 口径（#120／#126 两条既定裁员）：
 *   · `exercise_log.is_deleted`、`body_composition／body_measurements.is_deprecated` 两列**可空**
 *     （历史行可为 NULL），故一律 `COALESCE(列, 0) = 0`——写 `列 = 0` 会把 NULL 活行**静默排除**；
 *   · 软删＝行保留、已从查询与统计排除、**暂无恢复入口**（写侧措辞见 `shared/writeParts.ts`）。
 *
 * 收在这里之前的样子（#701 普查、#717 批③）：正本住 `analysis/utils.ts`，而抓取层被要求
 * 「不反向依赖 analysis」，于是各自内联同一句话 45 处；任一处手滑写成 `= 0` 就静默漏掉 NULL 活行。
 * 现在正本在共用位，`analysis/utils.ts` 按原名转出（包对外的名字一个不少），别处一律读它。
 */

/** `exercise_log` 的存活行（软删行不计入任何用户可见统计）。 */
export const EX_ALIVE = 'COALESCE(is_deleted, 0) = 0';

/** `body_composition`／`body_measurements` 的存活行（软删行不计入任何用户可见统计）。 */
export const BODY_ALIVE = 'COALESCE(is_deprecated, 0) = 0';
