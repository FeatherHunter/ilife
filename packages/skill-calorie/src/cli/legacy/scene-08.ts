/** 未搬迁命令的场景分区 · 场景 08（body）：**0 条**（#314 已整片搬空）。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * #314 起本片八条命令（记／删体脂、记／删围度、体成分看、围度看、体脂向导、围度向导）
 * 住能力目录 `src/body/commands.ts`；本文件**只搬空、不删文件**（片数与文件面是等号断言），
 * 仍留文件头与 `routing.ts` 字样给出键 → 场景的依据出处。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_08: readonly LegacyCommandDecl[] = [];
