/** 数据管理能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 两行：`体检`（唤醒词表第 37 条，`preset: { kind: 'quality' }`）与 `备份`
 * （#767 资产已定去向 `chef.history.query`／`kind: 'backup'`，但尚未入 `WAKE_TABLE`，
 * 故 `order: 0` 标记待接入）。key 名是引用（事实住 `src/history/commands.ts`），本处不定义它。
 * 命令行写法照同 key 同 kind 的既有行类比（`kind` 透传，空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 数据管理能力的路由声明表：恰好导出一个声明数组。 */
export const DATA_ROUTES: readonly RouteDecl[] = [
  {
    order: 37,
    wakeWord: '体检',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"quality"}\'',
  },
  {
    // 待接入：`备份`未入 WAKE_TABLE（运行时唤醒词未命中），先占路由行，域票接入时把 order 填实。
    order: 0,
    wakeWord: '备份',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"backup"}\'',
  },
];
