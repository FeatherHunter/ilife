/** 数据管理能力的命令声明（空）：本域暂无自有 key。
 *
 * 本能力即 HELP 一级分组「数据管理」。数据管理域的三张卡（体检／批量改／备份）中，
 * 可路由的两句（`体检`→`kind: 'quality'`、`备份`→`kind: 'backup'`）走 `chef.history.query`，
 * 那条命令的事实住历史能力（`src/history/commands.ts`）——本域不另立第二份声明（铁律二）。
 * 空数组仍是「恰好一个声明数组」（生成器认它为一域，来源域名单里有 `data`），
 * 数据管理端到端票接入自有 key 时再填。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 数据管理能力的声明表：恰好导出一个声明数组（生成器只认这一个；本域暂空）。 */
export const DATA_COMMANDS: readonly CommandSpec[] = [];
