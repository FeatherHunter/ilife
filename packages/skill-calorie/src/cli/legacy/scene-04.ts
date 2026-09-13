/** 未搬迁命令的场景分区 · 场景 04（exercise）：0 条（#316 已全部搬进 `src/exercise/`）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 * **文件本身不许删**（片数 10 与文件面是等号断言），搬空后保留一个空数组导出。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_04: readonly LegacyCommandDecl[] = [];
