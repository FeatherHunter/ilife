/** 初始化域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 本域只有一个场景词：`首次使用`（场景 `memo_init_setup`），指向开库前分派的 `memo.init`。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const INIT_ROUTES: readonly RouteDecl[] = [
  {
    order: 28,
    wakeWord: '首次使用',
    scene: 'memo_init_setup',
    key: 'memo.init',
    cli: 'memo-cmd-read memo.init --params \'{"data":{"items":[{"name":"数据目录","status":"ok"}],"todos":[],"verify":[]}}\'',
  },
];
