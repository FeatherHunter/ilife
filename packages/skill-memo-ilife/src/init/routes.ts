/** 初始化域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 本域只有一个场景：`首次使用`（场景 `memo_init_setup`），指向开库前分派的 `memo.init`。
 * #858 补入它的两条**别名**（`初始化`／`新手`）：它们住 HELP 资产的 `aliases`（`src/help/scenes/init.ts`）、
 * 不进联动速查，但**按词要能路由到同一格**——`t855-验收-命令自治.mjs` 的 `PENDING_WORDS` 把这两条
 * 挂在「#858 别名总表」名下，且票面用户故事 2（说「首次使用／初始化／新手」）要的就是这一条。
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
  {
    order: 39,
    wakeWord: '初始化',
    scene: 'memo_init_setup',
    key: 'memo.init',
    cli: 'memo-cmd-read memo.init --params \'{"data":{"items":[{"name":"数据目录","status":"ok"}],"todos":[],"verify":[]}}\'',
  },
  {
    order: 40,
    wakeWord: '新手',
    scene: 'memo_init_setup',
    key: 'memo.init',
    cli: 'memo-cmd-read memo.init --params \'{"data":{"items":[{"name":"数据目录","status":"ok"}],"todos":[],"verify":[]}}\'',
  },
];
