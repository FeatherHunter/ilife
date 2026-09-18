/** 基础信息能力对外的门（HELP 场景 07「基础信息」）：命令声明 ＋ 整页回执端口。
 *
 * #703：门上的读／写命令入口（原 `runProfileView`／`runProfileWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外两件（铁律五「不多于五个」）：
 *   ① `PROFILE_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `profileReceiptDoc`——档案写命令整页回执的端口。#703 起它的接线住写声明那一行（`doc:` 位）；
 *      两页装配（`setup.ts`／`update.ts` 的两函数）是本目录内件，由 `receipt.ts` 直引，
 *      不再经这道门转出（#330 起：免得同一件回执页有两份出口）。
 *
 * 域内其他件（取数 `view.ts`、写链 `setup.ts`／`update.ts`／`labels.ts`、读写入口 `read.ts`／`write.ts`、
 * 回执端口实现 `receipt.ts` 的键集数据位）**不出这个目录**，故不在这里转出。
 */

export { PROFILE_COMMANDS } from './commands.js';
export { profileReceiptDoc } from './receipt.js';
