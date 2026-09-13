/** 未搬迁命令的场景分区 · 场景 06（goal）：**0 条**（#318 已搬空）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * #318：本场景 13 条已整批搬进能力目录 `src/goal/commands.ts`（路由声明同批搬进 `src/goal/routes.ts`），
 * 分派层老 `case` 同批删除。**文件保留不删**（`legacy/` 只进不出；等号断言钉着片数与文件面）。
 * 本件留空数组：`gen-cli.mjs` 仍扫到它，键集为空 ⇒ 对生成物零贡献。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_06: readonly LegacyCommandDecl[] = [];
