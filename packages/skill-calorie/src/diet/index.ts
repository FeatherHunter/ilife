/** 饮食能力对外的门（HELP 场景 02「饮食」）：命令声明 ＋ 餐别分布取数 ＋ 视图形状。
 *
 * #703：门上的读／写命令入口（原 `runDietView`／`runDietWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外三件（铁律五「不多于五个」）：
 *   ① `DIET_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `buildMealDistributionView(db, mealRaw, start, end)`——**餐别分布取数**（**#271／#276 跨能力调用**：
 *      `calorie.view.diet` 那一族五条词住 `src/home/`，它要按 `meal` 出餐别分布页。取数口径与餐别取值
 *      域住本能力，故经这道门出去；页装配仍由调用方自己的文档件接 `diet/reviewDocs.ts` 的具名区块）。
 *      （**#271** 用的 `buildDietOverviewView`／`hasAnyDietRow`／`buildEmptyWindowDoc`／`ENTRY_OVERVIEW`
 *      四个不在这里转出：它们照 #275 交接的口径走**深路径**——门只留「取数口径要跨能力对齐」的那一件。）
 *   ③ `MealDistributionView`（类型）——②的视图形状。
 *
 * 域内其他件（记饮食 `log.ts`／改饮食 `edit.ts`／看饮食 `today.ts`／查食品 `library.ts`＋`products.ts`／
 * 看营养 `nutrition.ts`／看排行 `ranking.ts`／饮食复盘 `review.ts`／路由声明 `routes.ts`）
 * **不出这个目录**，故不在这里转出。
 */

export { DIET_COMMANDS } from './commands.js';
export { buildMealDistributionView } from './review.js';
export type { MealDistributionView } from './reviewDocs.js';
