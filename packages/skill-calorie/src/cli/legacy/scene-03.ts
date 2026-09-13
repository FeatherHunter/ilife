/** 未搬迁命令的场景分区 · 场景 03（weight）：**0 条**（#320 已搬空）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * #320 起本片最后一条命令（**体重目标**：「看目标」那一族的第九条）住能力目录 `src/goal/commands.ts`
 * （它与写命令「定体重目标」同属一件事）；它的三条路由记录（scene 03／06／10）同时搬进
 * `src/goal/routes.ts`；本文件**只搬空、不删文件**（片数与文件面是等号断言），仍留文件头与
 * `routing.ts` 字样给出键 → 场景的依据出处。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_03: readonly LegacyCommandDecl[] = [];
