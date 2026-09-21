/** 采购能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「采购」。一条命令管一摊：
 *   · `chef.shopping.query`（查询命令）：生成清单／排除可选／查清单／清空清单四句唤醒词都进这一条。
 * 处理函数仍在老分派层（`src/cli/cmd_read.ts`），本票只立声明不搬实现——行为不变，
 * 实现下沉由小域合并票接走（本文件不动，后续只加 run）。
 *
 * 标题与代表唤醒词取 HELP 现成说法，示例照 `packages/skill-chef/SKILL.md` 同命令行照抄。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 采购能力的声明表：恰好导出一个声明数组（生成器只认这一个）。 */
export const SHOPPING_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'read',
    key: 'chef.shopping.query',
    shape: 'list',
    title: '生成清单',
    wakeWord: '生成清单',
    example: 'chef-cmd-read chef.shopping.query --params \'{"names":["辣椒炒肉"]}\'',
  },
];
