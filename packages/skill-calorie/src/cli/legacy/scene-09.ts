/** 未搬迁命令的场景分区 · 场景 09（photo）：10 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_09: readonly LegacyCommandDecl[] = [
  { kind: 'read', key: 'calorie.help.center', shape: 'list', title: '身材照HELP', wakeWord: '记身材照', example: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { kind: 'write', key: 'calorie.photo.add', shape: 'receipt', title: '记身材照', wakeWord: '记身材照', example: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.compare', shape: 'list', title: '对比照片', wakeWord: '对比两张照片', example: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { kind: 'read', key: 'calorie.photo.detail', shape: 'detail', title: '查身材照', wakeWord: '查身材照', example: 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.photo.gif', shape: 'analysis', title: '生成GIF', wakeWord: '做身材照GIF', example: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.list', shape: 'list', title: '看身材照', wakeWord: '看身材照', example: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { kind: 'write', key: 'calorie.photo.remove', shape: 'receipt', title: '删身材照', wakeWord: '删身材照', example: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.photo.tag', shape: 'receipt', title: '改照片标签', wakeWord: '改照片标签', example: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { kind: 'read', key: 'calorie.view.gif-planner', shape: 'stat', title: 'GIF规划器', wakeWord: '看GIF规划器', example: 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.view.photo-log-wizard', shape: 'stat', title: '身材照向导', wakeWord: '看身材照向导', example: 'calorie-cmd-read calorie.view.photo-log-wizard' },
] satisfies readonly LegacyCommandDecl[];
