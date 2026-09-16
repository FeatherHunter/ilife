/** 身材照片能力的命令声明（**权威源**，HELP 一级分组「身材照片」／场景 09）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键／形状／标题／代表唤醒词／可执行示例／处理函数（字段语义见 `shared/commandSpec.ts`）。
 *
 * 子功能与命令的对应（HELP 下一级 → 键，取自 `src/triggers/scene-09-photo.ts` 的 `subfunction` 字段）：
 *   存身材照＝`calorie.photo.add`；看身材照＝`calorie.photo.list`／`calorie.photo.detail`；
 *   比身材照＝`calorie.photo.compare`／`calorie.photo.gif`；管身材照＝`calorie.photo.remove`／`calorie.photo.tag`；
 *   向导与规划器＝`calorie.view.photo-log-wizard`／`calorie.view.gif-planner`；身材照HELP＝`calorie.help.center`。
 * 三条流程内页命令（`calorie.view.photo-log-wizard`／`calorie.view.gif-planner`／`calorie.view.photo-picker`）
 * **没有代表唤醒词**：老技能这三个页面是流程内页，唤醒词表里没有它们（对账读数见
 * `docs/skills/skill-calorie/t450-词表订正.md`）。`wakeWord` 按 `shared/commandSpec.ts` 的契约可缺，
 * 缺了生成器跳过这一列、退回命令名（`scripts/build-help.mjs` 的 `const wake = REPR[k] || k;`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewPhotoCompare, viewPhotoGif } from './compare.js';
import { viewPhotoHelpCenter } from './help.js';
import { viewPhotoDetail, viewPhotoList } from './gallery.js';
import { writePhotoRemove, writePhotoTag } from './manage.js';
import { viewPhotoPicker } from './picker.js';
import { writePhotoAdd } from './store.js';
import { viewGifPlanner, viewPhotoLogWizard } from './wizard.js';

export const PHOTO_COMMANDS = [
  { kind: 'read', key: 'calorie.help.center', shape: 'list', title: '身材照HELP', wakeWord: '卡路里HELP', run: viewPhotoHelpCenter, example: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { kind: 'write', key: 'calorie.photo.add', shape: 'receipt', title: '记身材照', wakeWord: '记身材照', run: writePhotoAdd, example: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.compare', shape: 'list', title: '对比照片', wakeWord: '对比两张照片', run: viewPhotoCompare, example: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  /* #343 · `calorie.photo.detail` **不给 `wakeWord`**：本键自己的入口词是自造词 `查身材照详情`
     （`src/photo/routes.ts` 的 `list:'new'`），而 `查身材照` 路由到 `calorie.photo.list`（相册）——
     按「代表唤醒词必须路由回本键」的判据（`gen-cli.mjs` 的 `wakeWordGate()`），两个方向都不合格；
     照 #450 对流程内页的先例（同族的 picker／wizard／gif-planner）留空：速查表退回命令名。 */
  { kind: 'read', key: 'calorie.photo.detail', shape: 'detail', title: '查身材照', run: viewPhotoDetail, example: 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.photo.gif', shape: 'analysis', title: '生成GIF', wakeWord: '生成身材照GIF', run: viewPhotoGif, example: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.list', shape: 'list', title: '看身材照', wakeWord: '看身材照', run: viewPhotoList, example: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { kind: 'write', key: 'calorie.photo.remove', shape: 'receipt', title: '删身材照', wakeWord: '删身材照', run: writePhotoRemove, example: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.photo.tag', shape: 'receipt', title: '改照片标签', wakeWord: '改照片标签', run: writePhotoTag, example: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { kind: 'read', key: 'calorie.view.gif-planner', shape: 'stat', title: 'GIF规划器', run: viewGifPlanner, example: 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.view.photo-log-wizard', shape: 'stat', title: '身材照向导', run: viewPhotoLogWizard, example: 'calorie-cmd-read calorie.view.photo-log-wizard' },
  { kind: 'read', key: 'calorie.view.photo-picker', shape: 'list', title: '删照候选', run: viewPhotoPicker, example: 'calorie-cmd-read calorie.view.photo-picker' },
] satisfies readonly CommandSpec[];
