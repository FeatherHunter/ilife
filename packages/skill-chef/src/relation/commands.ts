/** 派生能力的命令声明（空）：本域暂无 key。
 *
 * 本能力即 HELP 一级分组「派生」。三组短语（添加派生关系／查看派生关系／从已有派生新菜）在
 * #767 资产里去向为 `tbd`（不可路由）——运行时无 key、无实现。空数组仍是「恰好一个声明数组」
 * （生成器认它为一域，来源域名单里有 `relation`），派生端到端票接入 key 时再填。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 派生能力的声明表：恰好导出一个声明数组（生成器只认这一个；本域暂空）。 */
export const RELATION_COMMANDS: readonly CommandSpec[] = [];
