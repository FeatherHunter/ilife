/** 搜索筛选能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「搜索筛选」。一条命令管一摊：
 *   · `chef.recipe.search`（查询命令）：查看全部／搜索食谱／搜菜／查食材／筛选菜系／筛选食材／
 *     筛选口味／筛选季节八句唤醒词都进这一条。
 * 处理函数仍在老分派层（`src/cli/cmd_read.ts`），本票只立声明不搬实现——行为不变，
 * 实现下沉由搜索筛选域端到端票接走（本文件不动，后续只加 run）。
 *
 * 标题与代表唤醒词取 HELP 现成说法，示例照 `packages/skill-chef/SKILL.md` 同命令行照抄。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 搜索筛选能力的声明表：恰好导出一个声明数组（生成器只认这一个）。 */
export const SEARCH_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'read',
    key: 'chef.recipe.search',
    shape: 'list',
    title: '搜索食谱',
    wakeWord: '搜索食谱',
    example: 'chef-cmd-read chef.recipe.search --params \'{"q":"排骨"}\'',
  },
];
