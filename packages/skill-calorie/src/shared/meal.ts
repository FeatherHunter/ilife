/** 餐别的**唯一定义地**（#717 批①）：时间窗、归属、四桶，全包只此一份。
 *
 * 谁在用（写得出哪两个能力在用）：
 *   ① 饮食能力 `diet/`（`diet/review.ts` 的餐别分布页归桶）；
 *   ② 分析能力 `analysis/`（`analysis/anomaly/common.ts` 的「诊断饮食结构问题」餐次统计）；
 *   ③ 取数层 `fetch/diet.ts`（记一餐时的餐别推断、按餐别删除的 SQL 窗口）与页面层
 *      `render/diet.ts`／`render/analysisPlate.ts`（复盘页按餐汇总）——都从这里转出。
 *
 * 本件**零依赖**：不 import 任何件，也不出现任何一个能力目录的名字（结构标准的「依赖方向」）。
 *
 * 收在这里之前的样子（#701 普查、#717 批①）：时间窗的正本在 `fetch/diet.ts`，
 * 而 `analysis/anomaly/common.ts` 另写了一套小时边界（10／15／21），两套边界在
 * 14:30／21:30／22:30 这类时刻给出不同餐别——同一条记录在两个页面上被算进不同的餐。
 *
 * 窗一律**半开区间** `[from, to)`；`to` 可以大于 24（跨零点那一档），判定时按 24 取模。
 */

/** 五类餐名（不含聚合桶「加餐」；写入口的 `--meal` 值域逐字用这一份）。 */
export const MEAL_NAMES = ['早餐', '午餐', '下午茶', '晚餐', '夜宵'] as const;

export type MealName = (typeof MEAL_NAMES)[number];

/** 餐别**桶**（餐别分布页与复盘页的四桶；「加餐」＝下午茶 ＋ 夜宵）。 */
export const MEAL_BUCKETS = ['早餐', '午餐', '晚餐', '加餐'] as const;

export type MealBucket = (typeof MEAL_BUCKETS)[number];

/** 餐别的归一值域：五类餐 ＋ 聚合桶 ＋ 「认不出」（时间缺失／格式不对）。 */
export type MealKey = MealName | '加餐' | '其他';

/** 时间窗正本（半开区间 `[from, to)`；`to > 24` 表示跨零点）。 */
export const MEAL_WINDOW: Record<MealName, readonly [number, number]> = {
  早餐: [6, 10],
  午餐: [10, 14],
  下午茶: [14, 18],
  晚餐: [18, 22],
  夜宵: [22, 30],
};

/** 聚合桶「加餐」的窗口：下午茶 ＋ 夜宵，逐格取自 `MEAL_WINDOW`、不另写一套。
 *
 *  **夜宵跨零点**：22:00 之后的记录归夜宵，故夜宵窗口是 `[22, 30)`（按 24 取模＝`[22, 6)`）。
 *  收在正本之前那处自相矛盾——夜宵窗只写了 `0-6`，22 点后的记录归成夜宵却不落进夜宵窗，
 *  删「夜宵」也删不掉它；`MEAL_WINDOW` 与按窗删的 SQL 现在读同一份，不再各写各的。 */
export const SNACK_WINDOW: readonly [number, number, number, number] = [
  MEAL_WINDOW.下午茶[0], MEAL_WINDOW.下午茶[1], MEAL_WINDOW.夜宵[0], MEAL_WINDOW.夜宵[1],
];

/** 全包唯一的时间窗表：五类餐 ＋ 加餐（列序即 `mealWindowSql()` 的占位符顺序）。 */
export const MEAL_WINDOWS: Record<MealKey, readonly number[]> = {
  早餐: MEAL_WINDOW.早餐, 午餐: MEAL_WINDOW.午餐, 下午茶: MEAL_WINDOW.下午茶,
  晚餐: MEAL_WINDOW.晚餐, 夜宵: MEAL_WINDOW.夜宵, 加餐: SNACK_WINDOW, 其他: [],
};

/** 钟点落在哪个窗（半开 `[from, to)`，`to > 24` 即跨零点）：判据只此一处。
 *
 *  两段的写法与 SQL 那侧同一套（`>= from AND < 24` 或 `>= 0 AND < to-24`）：
 *  `to` 允许等于 24（＝零点收口，第二段退化成空），也允许大于 24（跨零点那一档）。 */
export function inMealWindow(hour: number, from: number, to: number): boolean {
  const h = ((hour % 24) + 24) % 24;
  return (h >= from && h < Math.min(to, 24)) || (to > 24 && h < to - 24);
}

/** 时间串 → 五类餐名。按 `MEAL_NAMES` 的次序过一遍 `MEAL_WINDOW`，认不出回 `'其他'`。
 *
 *  边界的正本只有 `MEAL_WINDOW` 一处：这里不再写任何字面小时数。 */
export function inferMealType(timeStr: string): MealName | '其他' {
  const hour = parseInt(String(timeStr).split(':')[0] as string, 10);
  if (Number.isNaN(hour)) return '其他';
  for (const name of MEAL_NAMES) {
    const w = MEAL_WINDOW[name];
    if (inMealWindow(hour, w[0], w[1])) return name;
  }
  return '其他';
}

/** 时间串 → 餐别桶（四桶）。下午茶与夜宵并入「加餐」；认不出回 `null`（调用方各自决定怎么显示缺值）。 */
export function mealBucketOf(time: string | null | undefined): MealBucket | null {
  if (!time) return null;
  const m = inferMealType(time);
  if (m === '早餐' || m === '午餐' || m === '晚餐') return m;
  if (m === '下午茶' || m === '夜宵') return '加餐';
  return null;
}
