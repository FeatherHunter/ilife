/** 数据管理能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「数据管理」。一条自有写命令：
 *   · `chef.data.batch`（会改数据库的命令）：批量改进这一条（改既有行＋改前对比＋回执）。
 * 体检与备份走 `chef.history.query`（事实住历史能力，kind 切分由入口做）——本域不另立第二份声明。
 * 唤醒词路由：#841 起 `批量改` 已在 `WAKE_TABLE`（下标 49），`src/data/routes.ts` 同步填实 `order`。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 数据管理能力的声明表：恰好导出一个声明数组（生成器只认这一个）。 */
export const DATA_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'write',
    key: 'chef.data.batch',
    title: '批量改',
    wakeWord: '批量改',
    example: 'chef-cmd-read chef.data.batch --params \'{"name":"辣椒炒肉","ingredients":[{"name":"螺丝椒","quantity":300}]}\'',
  },
];
