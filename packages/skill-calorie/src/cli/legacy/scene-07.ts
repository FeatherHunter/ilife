/** 未搬迁命令的场景分区 · 场景 07（profile）：5 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_07: readonly LegacyCommandDecl[] = [
  { kind: 'write', key: 'calorie.profile.activity', shape: 'receipt', title: '设活动量', wakeWord: '设活动量', example: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { kind: 'write', key: 'calorie.profile.set', shape: 'receipt', title: '设置档案', wakeWord: '设置档案', example: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"activityLevel":"moderate"}\'' },
  { kind: 'write', key: 'calorie.profile.update', shape: 'receipt', title: '改档案', wakeWord: '改档案', example: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { kind: 'read', key: 'calorie.view.profile', shape: 'stat', title: '档案视图', example: 'calorie-cmd-read calorie.view.profile' },
  { kind: 'read', key: 'calorie.view.profile-wizard', shape: 'stat', title: '档案预检', wakeWord: '看档案预检', example: 'calorie-cmd-read calorie.view.profile-wizard' },
] satisfies readonly LegacyCommandDecl[];
