/** 做菜能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「做菜」。一条命令管一摊：
 *   · `chef.cooking.run`（查询命令）：做菜模式／开始做菜／继续做菜／完成做菜四句唤醒词都进这一条。
 * 处理函数仍在老分派层（`src/cli/cmd_read.ts`），本票只立声明不搬实现——行为不变，
 * 实现下沉由做菜域端到端票接走（本文件不动，后续只加 run）。
 *
 * 标题与代表唤醒词取 HELP 现成说法，示例照 `packages/skill-chef/SKILL.md` 同命令行照抄。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 做菜能力的声明表：恰好导出一个声明数组（生成器只认这一个）。 */
export const COOK_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'read',
    key: 'chef.cooking.run',
    shape: 'list',
    title: '做菜模式',
    wakeWord: '做菜模式',
    example: 'chef-cmd-read chef.cooking.run --params \'{"name":"宫保虾球"}\'',
  },
];
