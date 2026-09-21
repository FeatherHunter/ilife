/** 派生能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「派生」。两条命令各管一摊：
 *   · `chef.relation.write`（会改数据库的命令）：添加派生关系／从已有派生新菜两句都进这一条（op 切分）；
 *   · `chef.relation.query`（查询命令）：查看派生关系（家族树）进这一条。
 * 唤醒词路由仍待说明面票接入（`WAKE_TABLE` 37 条不动），本票先给直键可跑。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 派生能力的声明表：恰好导出一个声明数组（生成器只认这一个）。写命令在前、查询命令在后。 */
export const RELATION_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'write',
    key: 'chef.relation.write',
    title: '添加派生关系',
    wakeWord: '添加派生关系',
    example: 'chef-cmd-read chef.relation.write --params \'{"op":"add","parent":"宫保鸡丁","child":"宫保虾球","relation_type":"派生","change_summary":"鸡丁换虾球"}\'',
  },
  {
    kind: 'read',
    key: 'chef.relation.query',
    shape: 'list',
    title: '查看派生关系',
    wakeWord: '查看派生关系',
    example: 'chef-cmd-read chef.relation.query --params \'{"name":"宫保虾球"}\'',
  },
];
