/** 账户域对外的门（#689 结构搬迁第三批立）：本域两条命令（`bill.account.write`／`bill.account.query`）的分派
 *  今天仍住 `src/cli/cmd_read.ts` 的 `switch`，故门里先只放外面真在取的两摊：
 *  ① 命令参数口径 `./params.js`（op 分流／账户名槽位／转账三常量与校验）；
 *  ② 查询载荷装配 `./query.js`（账户汇总的 `items`／`total`）。
 *  命令搬进本域后按 `../write/index.ts` 的形状收口成「命令声明 ＋ 一个入口」。 */
export { parseAccountOp, needName, validateTransfer, TRANSFER_OUT_CATEGORY, TRANSFER_IN_CATEGORY, TRANSFER_LEDGER } from './params.js';
export type { AccountOp } from './params.js';
export { buildAccountQuery } from './query.js';
