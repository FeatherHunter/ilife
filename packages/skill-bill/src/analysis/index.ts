/** 分析域对外的门（#689 结构搬迁第三批立）：本域的命令**还没搬进来**——三条 analysis 命令的分派今天
 *  仍住 `src/cli/cmd_read.ts` 的 `switch`（未迁移命令那一族）。故门里先只放外面真在取的两摊：
 *  ① 命令参数口径 `./params.js`（三个 kind 分流 ＋ `month`／`range` 槽位）；
 *  ② 结果载荷装配 `./views.js`（分类聚合／总览／对比／趋势）。
 *
 *  为什么要有这道门：域→域的每条 import 边只许指向对方的门（#683 §六 守卫②），
 *  `src/query/read.ts` 取 `calcCategories` 走的就是这里。命令搬进本域后按 `../write/index.ts` 的
 *  形状收口成「命令声明 ＋ 一个入口」，这些转出随之收窄。 */
export { parseOverviewKind, parseCompareKind, parseTrendKind, needMonth, needRange } from './params.js';
export type { OverviewKind, CompareKind, TrendKind } from './params.js';
export { calcCategories, buildOverview, buildCompare, buildTrend } from './views.js';
