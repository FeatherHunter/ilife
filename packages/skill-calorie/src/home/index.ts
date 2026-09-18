/** 主页能力对外的门（HELP 一级分组「主页」／场景 01）：只转出命令声明一件。
 *
 * #703：门上的读／写命令入口（原 `runHomeView`／`runHomeWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外一件：
 *   ① `HOME_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）。
 *
 * 域内其他件（四条命令的事实与处理函数 `today.ts`）**不出这个目录**，故不在这里转出；
 * 本能力今天只有读命令，没有写键。
 */

export { HOME_COMMANDS } from './commands.js';
