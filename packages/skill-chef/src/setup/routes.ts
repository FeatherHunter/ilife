/** 开始使用能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 一行对应 #767 资产里开始使用的一组短语。key 已填实（直键可跑），order 仍 0：
 * 暂未入 `WAKE_TABLE`（37 条不动，唤醒词由说明面票接入），对账认 `order: 0` 为 tbd 行。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 开始使用能力的路由声明表：恰好导出一个声明数组。 */
export const SETUP_ROUTES: readonly RouteDecl[] = [
  {
    // 待接入：`首次使用`未入 WAKE_TABLE，先给 key，唤醒词由说明面票接入。
    order: 0,
    wakeWord: '首次使用',
    key: 'chef.setup.init',
    cli: 'chef-cmd-read chef.setup.init --params \'{}\'',
  },
];
