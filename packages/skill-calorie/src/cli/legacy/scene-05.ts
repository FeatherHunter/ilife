/** 未搬迁命令的场景分区 · 场景 05（workout）：**已搬空**（#317）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * **本文件是手写权威声明，不是生成物**：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 * 分片文件只许搬空、不许删（片数与文件面是等号断言，见 `.scratch/t314-319/六票落点规则.md` §一）——
 * 本场景 5 条键已全部搬进 `src/workout/commands.ts`，故数组为空；空数组进扫描面是安全的，
 * 生成器按 `isFile()` 收片、按数组内容取声明，不带条目就不会进汇总表。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_05: readonly LegacyCommandDecl[] = [];
