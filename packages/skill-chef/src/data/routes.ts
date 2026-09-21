/** 数据管理能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 一行：`批量改`走本域自有 `chef.data.batch`。#841 起该词已在 `WAKE_TABLE`（下标 49），
 * `order` 照表序填实，不再有 `order: 0` 的待接入行。
 * 本域另两句不行于此（一句事实一个落点）：`体检`的短语→key 映射与 `备份`（同命令 `kind: 'backup'`）
 * 都住 `src/history/routes.ts`，kind 级切分由入口做；备份的**页面装配**仍住本域（`src/data/pages.ts`）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 数据管理能力的路由声明表：恰好导出一个声明数组。 */
export const DATA_ROUTES: readonly RouteDecl[] = [
  {
    order: 49,
    wakeWord: '批量改',
    key: 'chef.data.batch',
    cli: 'chef-cmd-read chef.data.batch --params \'{"name":"辣椒炒肉","ingredients":[{"name":"螺丝椒","quantity":300}]}\'',
  },
];
