/** 开始使用能力的命令声明（空）：本域暂无 key。
 *
 * 本能力即 HELP 一级分组「开始使用」。`首次使用`短语在 #767 资产里去向为 `tbd`
 * （不可路由）——运行时无 key、无实现。空数组仍是「恰好一个声明数组」（生成器认它为一域，
 * 来源域名单里有 `setup`），开始使用端到端票接入 key 时再填。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 开始使用能力的声明表：恰好导出一个声明数组（生成器只认这一个；本域暂空）。 */
export const SETUP_COMMANDS: readonly CommandSpec[] = [];
