/** 未搬迁命令的场景分区 · 场景 04（exercise）：9 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_04: readonly LegacyCommandDecl[] = [
  { kind: 'write', key: 'calorie.exercise.add', shape: 'receipt', title: '记运动', wakeWord: '记运动', example: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { kind: 'write', key: 'calorie.exercise.remove', shape: 'receipt', title: '删运动', wakeWord: '删运动记录', example: 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.exercise.update', shape: 'receipt', title: '改运动', wakeWord: '改运动记录', example: 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'' },
  { kind: 'read', key: 'calorie.view.exercise-cardio', shape: 'stat', title: '有氧训练总览', wakeWord: '看有氧训练总览', example: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-distribution', shape: 'stat', title: '运动类型分布', wakeWord: '看运动分类占比', example: 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-goal', shape: 'stat', title: '运动目标视图', example: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-recap', shape: 'stat', title: '运动复盘', wakeWord: '看运动复盘', example: 'calorie-cmd-read calorie.view.exercise-recap --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-strength', shape: 'stat', title: '力量训练总览', wakeWord: '看力量训练总览', example: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-trend', shape: 'stat', title: '运动趋势', wakeWord: '看运动消耗趋势', example: 'calorie-cmd-read calorie.view.exercise-trend --params \'{"window":"7d"}\'' },
] satisfies readonly LegacyCommandDecl[];
