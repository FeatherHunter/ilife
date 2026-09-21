/** 开始使用能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「开始使用」。一条写命令管一摊：
 *   · `chef.setup.init`（会改数据库的命令，幂等）：首次使用进这一条（环境检测＋按需建库建目录）。
 * 唤醒词路由：#841 起 `首次使用` 已在 `WAKE_TABLE`（下标 48），`src/setup/routes.ts` 同步填实 `order`。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 开始使用能力的声明表：恰好导出一个声明数组（生成器只认这一个）。 */
export const SETUP_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'write',
    key: 'chef.setup.init',
    title: '首次使用',
    wakeWord: '首次使用',
    example: 'chef-cmd-read chef.setup.init --params \'{}\'',
  },
];
