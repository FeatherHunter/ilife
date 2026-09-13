/** 未搬迁命令的场景分区 · 场景 01（home）：4 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_01: readonly LegacyCommandDecl[] = [
  { kind: 'read', key: 'calorie.view.diet', shape: 'stat', title: '饮食总览', wakeWord: '看今日饮食概览', example: 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise', shape: 'stat', title: '运动总览', wakeWord: '看今日运动概览', example: 'calorie-cmd-read calorie.view.exercise --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.goal-progress', shape: 'stat', title: '目标进度', wakeWord: '看今日目标进度', example: 'calorie-cmd-read calorie.view.goal-progress --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.home', shape: 'stat', title: '今日总览', wakeWord: '看今日主页', example: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
] satisfies readonly LegacyCommandDecl[];
