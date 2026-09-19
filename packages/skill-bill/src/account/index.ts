/** 账户域对外的门：**命令声明**（权威源在 `./commands.ts`，这里只是转出）。
 *
 * 本域与写入域／查询域的**一处不同**（照实际写，不照抄名义）：那两扇门还要转出一个「入口函数」
 *  （`runRecordWrite`／`runQueryRead`），因为出口分派是**按域**写死两条的；本域迁进来那一窗把出口
 *  分派改成**按注册表里的声明直接调 `spec.run`**（`src/cli/cmd_read.ts` 的 `runRegistered`），
 *  于是命令声明里的 `run` 就是唯一的入口——一个命令恰住一处，本域不再需要第二个入口函数。
 *
 * 域内其他件（处理体 `write.ts`／`read.ts`、账户表与汇总取数 `accounts.ts`、三张模板件、四个场景件、
 *  参数与槽位表 `params.ts`）**不出这个目录**，故不在这里转出。
 *
 * 形状照 `../write/index.ts` 与 `../query/index.ts`（同一包内三域同形）：门只收「命令声明」这一件；
 *  场景落点表（`./scene.js` 的 `ACCOUNT_WRITE_SCENES`）供测试按既有取法直取定义地，不经本门。
 */
export { ACCOUNT_COMMANDS } from './commands.js';
