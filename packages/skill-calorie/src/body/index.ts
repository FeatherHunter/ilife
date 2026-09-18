/** 身体细节能力对外的门（HELP 一级分组「身体细节」／场景 08）：命令声明 ＋ 回执整页端口。
 *
 * #703：门上的读／写命令入口（原 `runBodyView`／`runBodyWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外两件：
 *   ① `BODY_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `bodyReceiptDoc(key, params, receipt, db)`——七条写词整页回执的端口（#365）：形状与体重那条
 *      `weightReceiptDoc` 逐条相同。#703 起接线住写声明自己那一行（`commands.ts` 的 `doc:` 位），
 *      分派层只认声明、不再逐家列名。
 *
 * 域内其他件（记／看／删／向导四个子功能文件）**不出这个目录**，故不在这里转出。
 * 本能力今天没有供别家取数的算式，故不设取数转出。
 */

export { BODY_COMMANDS } from './commands.js';
export { bodyReceiptDoc } from './receipt.js';
