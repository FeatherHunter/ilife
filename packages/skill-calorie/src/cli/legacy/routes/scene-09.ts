/** #313 B 段 · 场景 09 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_09: readonly RouteDecl[] = [
  { list: 'wake', order: 250, wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { list: 'wake', order: 251, wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { list: 'wake', order: 252, wakeWord: '记身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { list: 'wake', order: 253, wakeWord: '查身材照', scene: '09', kind: 'exec', key: 'calorie.photo.list', cli: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { list: 'wake', order: 254, wakeWord: '对比两张照片', scene: '09', kind: 'exec', key: 'calorie.photo.compare', cli: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { list: 'wake', order: 255, wakeWord: '生成身材照GIF', scene: '09', kind: 'exec', key: 'calorie.photo.gif', cli: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { list: 'wake', order: 256, wakeWord: '删身材照', scene: '09', kind: 'exec', key: 'calorie.photo.remove', cli: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { list: 'wake', order: 257, wakeWord: '改照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"set","tag":"晨起"}\'' },
  { list: 'wake', order: 258, wakeWord: '加照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { list: 'wake', order: 259, wakeWord: '删照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"remove","tag":"晨起"}\'' },
  { list: 'new', order: 0, wakeWord: '存身材照', scene: '09', kind: 'exec', key: 'calorie.photo.add', cli: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { list: 'new', order: 1, wakeWord: '移除身材照', scene: '09', kind: 'exec', key: 'calorie.photo.remove', cli: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { list: 'new', order: 2, wakeWord: '设置照片标签', scene: '09', kind: 'exec', key: 'calorie.photo.tag', cli: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { list: 'new', order: 13, wakeWord: '看身材照', scene: '09', kind: 'exec', key: 'calorie.photo.list', cli: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { list: 'new', order: 14, wakeWord: '查身材照详情', scene: '09', kind: 'exec', key: 'calorie.photo.detail', cli: 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'' },
  { list: 'new', order: 15, wakeWord: '对比身材照', scene: '09', kind: 'exec', key: 'calorie.photo.compare', cli: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { list: 'new', order: 16, wakeWord: '做身材照GIF', scene: '09', kind: 'exec', key: 'calorie.photo.gif', cli: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { list: 'new', order: 17, wakeWord: '看身材照HELP', scene: '09', kind: 'exec', key: 'calorie.help.center', cli: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { list: 'new', order: 54, wakeWord: '看身材照向导', scene: '09', kind: 'exec', key: 'calorie.view.photo-log-wizard', cli: 'calorie-cmd-read calorie.view.photo-log-wizard' },
  { list: 'new', order: 55, wakeWord: '看GIF规划器', scene: '09', kind: 'exec', key: 'calorie.view.gif-planner', cli: 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'' },
];
