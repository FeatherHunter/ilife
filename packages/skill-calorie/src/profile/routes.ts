/** #318 · 目标管理／基础信息（HELP 场景 07）**已搬迁键**的路由声明（键属 `dist/profile/commands.js` 的
 * `PROFILE_COMMANDS` 声明键集）。搬迁口径与场景分片同：由 `.scratch/t318/scan-routes.mjs`
 * 机械搬出（行级照抄），语义不动；`order` 仍是原列表内 0 基位次。键集搬家后本件跟着走，顺序不受影响。
 * 本件只收「键属本能力、记录住 scene-07 那一件」的行；同一 `(list, wakeWord)` 的整组不拆（`gen-routes.mjs` 的守卫）。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const PROFILE_ROUTES: readonly RouteDecl[] = [
  { list: 'wake', order: 233, wakeWord: '设置档案', scene: '07', kind: 'exec', key: 'calorie.profile.set', cli: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}\'' },
  { list: 'wake', order: 234, wakeWord: '设活动量', scene: '07', kind: 'exec', key: 'calorie.profile.activity', cli: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { list: 'wake', order: 235, wakeWord: '改档案', scene: '07', kind: 'exec', key: 'calorie.profile.update', cli: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { list: 'wake', order: 236, wakeWord: '查档案', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  { list: 'new', order: 33, wakeWord: '看档案视图', scene: '07', kind: 'exec', key: 'calorie.view.profile', cli: 'calorie-cmd-read calorie.view.profile' },
  { list: 'new', order: 56, wakeWord: '看档案预检', scene: '07', kind: 'exec', key: 'calorie.view.profile-wizard', cli: 'calorie-cmd-read calorie.view.profile-wizard' },
];
