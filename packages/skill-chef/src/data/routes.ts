/** 数据管理能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 一行：`备份`（#767 资产已定去向 `chef.history.query`／`kind: 'backup'`，但尚未入 `WAKE_TABLE`，
 * 故 `order: 0` 标记待接入）。key 名是引用（事实住 `src/history/commands.ts`），本处不定义它。
 * `体检`不行于此：它的短语→key 映射票 1 已声明在 `src/history/routes.ts`（一事一处，不重复声明），
 * kind 级切分（quality 归本域实现）由入口注册表做，见 `src/data/run-query.ts`。
 * 命令行写法照同 key 同 kind 的既有行类比（`kind` 透传，空库可跑的那一行）。
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
];
