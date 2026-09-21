/** 派生能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 三行对应 #767 资产里派生的三组短语。key 已填实（直键可跑），order 仍 0：
 * 暂未入 `WAKE_TABLE`（37 条不动，唤醒词由说明面票接入），对账认 `order: 0` 为 tbd 行。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 派生能力的路由声明表：恰好导出一个声明数组。 */
export const RELATION_ROUTES: readonly RouteDecl[] = [
  {
    // 待接入：`添加派生关系`未入 WAKE_TABLE，先给 key，唤醒词由说明面票接入。
    order: 0,
    wakeWord: '添加派生关系',
    key: 'chef.relation.write',
    cli: 'chef-cmd-read chef.relation.write --params \'{"op":"add","parent":"宫保鸡丁","child":"宫保虾球","relation_type":"派生","change_summary":"鸡丁换虾球"}\'',
  },
  {
    // 待接入：`查看派生关系`未入 WAKE_TABLE，先给 key，唤醒词由说明面票接入。
    order: 0,
    wakeWord: '查看派生关系',
    key: 'chef.relation.query',
    cli: 'chef-cmd-read chef.relation.query --params \'{"name":"宫保虾球"}\'',
  },
  {
    // 待接入：`从已有派生新菜`未入 WAKE_TABLE，先给 key（同写命令 op=derive），唤醒词由说明面票接入。
    order: 0,
    wakeWord: '从已有派生新菜',
    key: 'chef.relation.write',
    cli: 'chef-cmd-read chef.relation.write --params \'{"op":"derive","source":"宫保鸡丁","target":"宫保虾球","differences":"鸡丁换虾球"}\'',
  },
];
