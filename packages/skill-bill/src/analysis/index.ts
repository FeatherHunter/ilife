/** 分析域对外的门（#729 收口）：本域三条读命令已搬进本目录，域外只该取两件——
 *   ① `ANALYSIS_COMMANDS`——命令声明（权威源 `./commands.ts`，这里只是转出；出口分派按注册表里的
 *      声明直接调 `spec.run`，故本域不再需要第二个入口函数，形制同 `../account/index.ts`）；
 *   ② `calcCategories`——分类聚合（`src/query/read.ts` 的「查分类」占比条在用；**域→域只经对方的门**）。
 *
 * 搬迁前那几件转出（`parseOverviewKind`／`parseCompareKind`／`parseTrendKind`／`needMonth`／`needRange`／
 *  `buildOverview` ／`buildCompare`／`buildTrend`）随 #729 一并收窄：前五件回 `./params.js` 供本域场景自用，
 *  后三件回 `./views.js` 供本域场景拼载荷——**门外已无消费方**（出口那三个 `case` 已删）。
 * 域内其他件（场景契约与落点表 `scene.ts`、五份模板件、25 件场景声明、聚合件 `agg.ts`、卡形状件 `cards.ts`、
 *  页内共件 `pageParts.ts`、处理体 `read.ts`）不出这个目录，故不在这里转出。
 * 场景落点表 `ANALYSIS_SCENES` 供测试按既有取法直取定义地（`../dist/analysis/scene.js`），不经本门。 */
export { ANALYSIS_COMMANDS } from './commands.js';
export { calcCategories } from './views.js';
