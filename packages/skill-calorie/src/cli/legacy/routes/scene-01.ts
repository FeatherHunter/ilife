/** #313 B 段 · 场景 01 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_01: readonly RouteDecl[] = [
  { list: 'wake', order: 0, wakeWord: '看今日主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
  { list: 'wake', order: 1, wakeWord: '看今日饮食概览', scene: '01', kind: 'exec', key: 'calorie.view.diet', cli: 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'' },
  { list: 'wake', order: 2, wakeWord: '看今日运动概览', scene: '01', kind: 'exec', key: 'calorie.view.exercise', cli: 'calorie-cmd-read calorie.view.exercise --params \'{"window":"今日"}\'' },
  { list: 'wake', order: 4, wakeWord: '看今日目标进度', scene: '01', kind: 'exec', key: 'calorie.view.goal-progress', cli: 'calorie-cmd-read calorie.view.goal-progress --params \'{"window":"今日"}\'' },
  { list: 'wake', order: 5, wakeWord: '看本周主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"windowDays":7,"date":"今日"}\'' },
  { list: 'wake', order: 6, wakeWord: '看本月主页', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"windowDays":30,"date":"今日"}\'' },
  { list: 'wake', order: 7, wakeWord: '看连续记录天数', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
  { list: 'wake', order: 8, wakeWord: '看今日热量预算', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
];
