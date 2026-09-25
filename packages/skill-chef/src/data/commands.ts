/** 数据管理能力 ＋ 数据族两条程序面键的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「数据管理」。一条自有写命令：
 *   · `chef.data.batch`（会改数据库的命令）：批量改进这一条（改既有行＋改前对比＋回执）。
 * 体检与备份走 `chef.history.query`（事实住历史能力，kind 切分由入口做）——本域不另立第二份声明。
 * 唤醒词路由：#841 起 `批量改` 已在 `WAKE_TABLE`（下标 49），`src/data/routes.ts` 同步填实 `order`。
 *
 * #963 · 数据族两条程序面键（`chef.data.schema`／`chef.data.query`）同住本目录的理由：
 * 键前缀同为 `chef.data.*`（生成器按目录扫 `commands.ts`，同前缀即同目录）；
 * 目录名 `data` 取自数据族规格对命令面的分族名（数据族／视图族／写族），HELP 一级分组里没有这一族——
 * 程序面命令本来就不进 HELP，故此处以规格为命名出处（与卡路里 `src/data` 同形，见其 `commands.ts` 件头）。
 * 本族命令一律 `surface: 'program'`（只给程序用：不进技能说明面速查表、不进唤醒词路由，见 #953），
 * 故无 `wakeWord`、无 `src/data/routes.ts` 新增行（程序面命令不许有唤醒词路由，生成器 fail-closed）。
 * 表清单见 `./tables.ts`（17 张全量，维护者可逐一裁减）；实现见 `./schema.ts`／`./query.ts`。
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
  {
    kind: 'read',
    key: 'chef.data.schema',
    shape: 'resultset',
    title: '数据目录',
    surface: 'program',
    example: 'chef-cmd-read chef.data.schema',
  },
  {
    kind: 'read',
    key: 'chef.data.query',
    shape: 'resultset',
    title: '数据查询',
    surface: 'program',
    example: 'chef-cmd-read chef.data.query --params \'{"queries":[{"from":"recipes","select":["name","difficulty"],"orderBy":[{"field":"name","dir":"asc"}]}]}\'',
  },
];
