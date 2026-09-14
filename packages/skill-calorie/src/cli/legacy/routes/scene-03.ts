/** #313 B 段 · 场景 03 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 *
 * 2026-09-14：#334 的 8 条锚点对比（order 121–128）翻成有命令可执行，住 `src/weight/routes.ts`，
 * 本片随之清零；`src/cli/legacy/` 整个目录的处置不属本图。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_03: readonly RouteDecl[] = [];
