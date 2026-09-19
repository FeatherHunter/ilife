/** 目标域对外的门（#689 结构搬迁第三批立）：本域两条命令（`bill.goal.write`／`bill.goal.query`）的分派
 *  今天仍住 `src/cli/cmd_read.ts` 的 `switch`，故门里先只放外面真在取的两摊：
 *  ① 命令参数口径 `./params.js`（预算／储蓄目标的槽位与数值校验）；
 *  ② 查询载荷装配 `./query.js`（预算执行与目标进度的 `items`／`total`）。
 *  命令搬进本域后按 `../write/index.ts` 的形状收口成「命令声明 ＋ 一个入口」。 */
export { parseGoalOp, validateBudgetAmount, validateSetBudget, validateSetSaving } from './params.js';
export type { GoalOp } from './params.js';
export { buildGoalQuery } from './query.js';
