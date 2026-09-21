/** 修改能力的命令声明（空）：本域暂无自有 key。
 *
 * 本能力即 HELP 一级分组「修改」。修改域的两句唤醒词（修改食谱／废弃食谱）路由到
 * `chef.recipe.write`，而那条命令的事实住录入能力（`src/add/commands.ts`，
 * 默认 op=add、6 卡对 4 卡）——本域不另立第二份声明（铁律二）。
 * 空数组仍是「恰好一个声明数组」（生成器认它为一域，来源域名单里有 `update`），
 * 录入端到端票接入自有 key 时再填。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 修改能力的声明表：恰好导出一个声明数组（生成器只认这一个；本域暂空）。 */
export const UPDATE_COMMANDS: readonly CommandSpec[] = [];
