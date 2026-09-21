/** 同步域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 本域只有一个场景词：`备忘录同步`（场景 `memo_sync_feishu`）。`memo.auth` 只有只读诊断、
 * 没有唤醒词（#760 退役口径），故不在路由表里占行——它的登记只住 `commands.ts`。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const SYNC_ROUTES: readonly RouteDecl[] = [
  {
    order: 27,
    wakeWord: '备忘录同步',
    scene: 'memo_sync_feishu',
    key: 'memo.sync',
    cli: 'memo-cmd-read memo.sync',
  },
];
