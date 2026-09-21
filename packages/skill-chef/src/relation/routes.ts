/** 派生能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 三行对应 #767 资产里派生的三组短语：#841 起三条都已在 `WAKE_TABLE`（下标 45／46／48），
 * `order` 照表序填实，不再有 `order: 0` 的待接入行。
 * 添加派生关系／从已有派生新菜进 `chef.relation.write`（`op` 分流 add／derive），
 * 查看派生关系进 `chef.relation.query`。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 派生能力的路由声明表：恰好导出一个声明数组。 */
export const RELATION_ROUTES: readonly RouteDecl[] = [
  {
    order: 45,
    wakeWord: '添加派生关系',
    key: 'chef.relation.write',
    cli: 'chef-cmd-read chef.relation.write --params \'{"op":"add","parent":"小炒肉","child":"辣椒炒肉","relation_type":"派生","change_summary":"鸡丁换虾球"}\'',
  },
  {
    order: 46,
    wakeWord: '从已有派生新菜',
    key: 'chef.relation.write',
    cli: 'chef-cmd-read chef.relation.write --params \'{"op":"derive","source":"小炒肉","target":"辣椒炒肉","differences":"鸡丁换虾球"}\'',
  },
  {
    order: 48,
    wakeWord: '查看派生关系',
    key: 'chef.relation.query',
    cli: 'chef-cmd-read chef.relation.query --params \'{"name":"辣椒炒肉"}\'',
  },
];
