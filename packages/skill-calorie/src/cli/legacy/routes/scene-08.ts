/** #313 B 段 · 场景 08 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_08: readonly RouteDecl[] = [
  { list: 'wake', order: 246, wakeWord: '对比体脂', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。' },
  { list: 'wake', order: 247, wakeWord: '对比围度', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。' },
];
