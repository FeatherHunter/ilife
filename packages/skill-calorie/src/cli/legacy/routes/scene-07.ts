/** #313 B 段 · 场景 07 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_07: readonly RouteDecl[] = [
  { list: 'wake', order: 233, wakeWord: '设置档案', scene: '07', kind: 'exec', key: 'calorie.profile.set', cli: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}\'' },
  { list: 'wake', order: 234, wakeWord: '设活动量', scene: '07', kind: 'exec', key: 'calorie.profile.activity', cli: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { list: 'wake', order: 235, wakeWord: '改档案', scene: '07', kind: 'exec', key: 'calorie.profile.update', cli: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { list: 'wake', order: 236, wakeWord: '查档案', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  { list: 'new', order: 33, wakeWord: '看档案视图', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  { list: 'new', order: 56, wakeWord: '看档案预检', scene: '07', kind: 'exec', key: 'calorie.view.profile-wizard', cli: 'calorie-cmd-read calorie.view.profile-wizard' },
];
