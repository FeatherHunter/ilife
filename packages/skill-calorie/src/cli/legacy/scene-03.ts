/** 未搬迁命令的场景分区 · 场景 03（weight）：1 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_03: readonly LegacyCommandDecl[] = [
  { kind: 'read', key: 'calorie.view.goal-weight', shape: 'stat', title: '体重目标', wakeWord: '定体重目标', example: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"30d"}\'' },
] satisfies readonly LegacyCommandDecl[];
