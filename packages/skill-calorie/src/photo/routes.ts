/** #314 · 身材照片能力**已搬迁键**的路由声明（键属 `dist/photo/commands.js` 的 `PHOTO_ROUTES` 声明键集）。
 *
 * 搬迁口径（编排者 #314 裁决）：**记录归属＝它 `key` 的所有者**——同一个键的记录可能散在多片
 * （实测本族来自 `routes/scene-09.ts`），一律按 key 归到本件，而不是按记录自己的 `scene` 字段留片。
 * 字段与语义**一字不动**，只换住处：`order` 仍是原列表内 0 基位次（生成器按 `(list, order)` 复原
 * 三个列表，故按 key 搬家不打乱顺序）。无 `key` 的 `non-exec` 记录没有归属者，按 `scene` 留在原片。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const PHOTO_ROUTES: readonly RouteDecl[] = [
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
  { list: 'new', order: 53, wakeWord: '看身材照向导', scene: '09', kind: 'exec', key: 'calorie.view.photo-log-wizard', cli: 'calorie-cmd-read calorie.view.photo-log-wizard' },
  { list: 'new', order: 54, wakeWord: '看GIF规划器', scene: '09', kind: 'exec', key: 'calorie.view.gif-planner', cli: 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'' },
  { list: 'new', order: 67, wakeWord: '选身材照', scene: '09', kind: 'exec', key: 'calorie.view.photo-picker', cli: 'calorie-cmd-read calorie.view.photo-picker' },
];
