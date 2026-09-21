/** 历史能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「历史」。两条命令各管一摊：
 *   · `chef.history.record`（会改数据库的命令）：记录做菜／补录做菜／改评分三句唤醒词都进这一条；
 *   · `chef.history.query`（查询命令）：查看历史／查看统计／体检三句唤醒词都进这一条。
 * 处理函数仍在老分派层（`src/cli/cmd_read.ts`），本票只立声明不搬实现——行为不变，
 * 实现下沉由历史域端到端票接走。
 *
 * 字段口径照命令登记纪律形状一：会改数据库的命令不写 `shape`（一律回执形，
 * 那件事实的唯一定义地是生成器合成的 `src/cli/keys.ts`）；查询命令写 `shape`。
 * 代表唤醒词与可执行示例须是真词真串：代表词进 `src/policy/wakewords.ts` 的那张表即命中同命令，
 * 示例照 `packages/skill-chef/SKILL.md` 的同命令行照抄。
 */

import type { EnvelopeShape } from 'base-link-core';

/** 历史能力一条命令的声明。 */
export type HistoryCommandSpec =
  | {
      readonly kind: 'read';
      readonly key: string;
      readonly shape: EnvelopeShape;
      readonly title: string;
      readonly wakeWord?: string;
      readonly example: string;
    }
  | {
      readonly kind: 'write';
      readonly key: string;
      readonly title: string;
      readonly wakeWord?: string;
      readonly example: string;
    };

/** 历史能力的声明表：恰好导出一个声明数组（生成器只认这一个）。写命令在前、查询命令在后。 */
export const HISTORY_COMMANDS: readonly HistoryCommandSpec[] = [
  {
    kind: 'write',
    key: 'chef.history.record',
    title: '记录做菜',
    wakeWord: '记录做菜',
    example: 'chef-cmd-read chef.history.record --params \'{"name":"辣椒炒肉"}\'',
  },
  {
    kind: 'read',
    key: 'chef.history.query',
    shape: 'list' as EnvelopeShape,
    title: '查看历史',
    wakeWord: '查看历史',
    example: 'chef-cmd-read chef.history.query --params \'{"kind":"stats"}\'',
  },
];
