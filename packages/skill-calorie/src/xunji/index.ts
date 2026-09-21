/** 卡路里 · **训记模块**的能力门（#606 骨架票）。
 *
 * 对外给**五件**（别的能力或命令用它，只经这五件）：
 *   ① `XUNJI_SUBCOMMANDS` —— 8 条子命令的对外面（名字／用法／参数／退出码／实现状态／归属票，唯一定义地）；
 *   ② `XUNJI_CATALOG` —— 动作库路径（包内预置快照；#757 起老机器路径已退场）；
 *   ③ `readMovementCatalog` —— 读库（读到什么／为什么读不到，缺文件不抛错）；
 *   ④ `verifyMovements` —— 动作名校验（老三态 valid／false／null ＋ 库缺失的明确读数）；
 *   ⑤ `runXunjiCommand` —— 按声明分派一条子命令（本票只有 `verify` 真跑）。
 *
 * 目录名与 HELP 一级分组无关：这是**负责人 2026-09-16 的显式例外**（#597 决议：单开 `src/xunji/`，不挂
 * `workout/`），展示名仍用「训记」；依据是 R1／R2／R3 三张研究票 ＋ 本票票面。
 * 模块内部件（`subcommands.ts`／`catalog.ts`／`run.ts`／`cli.ts`）与数据件（`data/训记官方动作.json`）
 * **不许被别的目录深引**。
 */
export { XUNJI_SUBCOMMANDS } from './subcommands.js';
export type { XunjiSubcommand, XunjiArg } from './subcommands.js';
export { XUNJI_CATALOG, readMovementCatalog, verifyMovements } from './catalog.js';
export type { CatalogRead, MovementVerifyReport } from './catalog.js';
export { runXunjiCommand } from './run.js';
export type { XunjiRun } from './run.js';
