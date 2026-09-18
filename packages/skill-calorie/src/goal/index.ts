/** 目标管理能力对外的门（HELP 场景 06「目标管理」）：只转出命令声明一件。
 *
 * #703：门上的读／写命令入口（原 `runGoalView`／`runGoalWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外一件（铁律五「不多于五个」）：
 *   ① `GOAL_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）。
 *
 * 域内其他件（写前草稿 `set.ts`、预检页 `precheck.ts`、读写入口 `read.ts`／`write.ts`）
 * **不出这个目录**，故不在这里转出；上级模块仍按原路径导入（搬迁只换住处，调用面不变）。
 */

export { GOAL_COMMANDS } from './commands.js';
