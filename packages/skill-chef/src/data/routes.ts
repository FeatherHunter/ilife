/** 数据管理能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 两行：`备份`沿用 `chef.history.query`／`kind: 'backup'`（事实住历史能力）；
 * `批量改`走本域自有 `chef.data.batch`。key 已填实（直键可跑），order 仍 0：
 * 暂未入 `WAKE_TABLE`（37 条不动，唤醒词由说明面票接入），对账认 `order: 0` 为 tbd 行。
 * `体检`不行于此：它的短语→key 映射已声明在 `src/history/routes.ts`，kind 级切分由入口做。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 数据管理能力的路由声明表：恰好导出一个声明数组。 */
export const DATA_ROUTES: readonly RouteDecl[] = [
  {
    // 待接入：`备份`未入 WAKE_TABLE（运行时唤醒词未命中），先占路由行，域票接入时把 order 填实。
    order: 0,
    wakeWord: '备份',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"backup"}\'',
  },
  {
    // 待接入：`批量改`未入 WAKE_TABLE，先给 key，唤醒词由说明面票接入。
    order: 0,
    wakeWord: '批量改',
    key: 'chef.data.batch',
    cli: 'chef-cmd-read chef.data.batch --params \'{"name":"宫保虾球","ingredients":[{"name":"螺丝椒","quantity":300}]}\'',
  },
];
