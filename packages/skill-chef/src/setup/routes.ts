/** 开始使用能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 一行对应 #767 资产里开始使用的一组短语：`首次使用`进 `chef.setup.init`（幂等初始化）。
 * #841 起该词已在 `WAKE_TABLE`（下标 47），`order` 照表序填实，不再有 `order: 0` 的待接入行。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 开始使用能力的路由声明表：恰好导出一个声明数组。 */
export const SETUP_ROUTES: readonly RouteDecl[] = [
  {
    order: 47,
    wakeWord: '首次使用',
    key: 'chef.setup.init',
    cli: 'chef-cmd-read chef.setup.init --params \'{}\'',
  },
];
