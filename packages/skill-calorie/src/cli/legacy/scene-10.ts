/** 未搬迁命令的场景分区 · 场景 10（analysis）：**已搬空**（#319）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 本场景 13 条已全部搬进 `src/analysis/commands.ts`（声明源）＋ `src/analysis/routes.ts`（路由记录），
 * 故数组为空。
 *
 * 本文件是**手写声明件**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 * 分片只许搬空、不许删文件（片数 10 是等号断言）。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_10: readonly LegacyCommandDecl[] = [];
