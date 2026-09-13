/** #313 B 段 · 场景 06 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_06: readonly RouteDecl[] = [
  { list: 'wake', order: 208, wakeWord: '定营养目标', scene: '06', kind: 'exec', key: 'calorie.goal.set', cli: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}\'' },
  { list: 'wake', order: 209, wakeWord: '定营养目标(自动算)', scene: '06', kind: 'exec', key: 'calorie.view.goal-wizard', cli: 'calorie-cmd-read calorie.view.goal-wizard --params \'{"profile":"cut","wake":"定营养目标(自动算)"}\'' },
  { list: 'wake', order: 210, wakeWord: '定体重目标', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'' },
  { list: 'wake', order: 211, wakeWord: '定体重目标(自动算截止)', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68,"deadline":"<日期>"}\'' },
  { list: 'wake', order: 212, wakeWord: '定体重目标(含起始日)', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68,"startKg":72,"deadline":"<日期>","startDate":"<日期>"}\'' },
  { list: 'wake', order: 213, wakeWord: '定饮水目标', scene: '06', kind: 'exec', key: 'calorie.goal.water', cli: 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'' },
  { list: 'wake', order: 214, wakeWord: '定饮水目标(自动算)', scene: '06', kind: 'exec', key: 'calorie.view.goal-wizard', cli: 'calorie-cmd-read calorie.view.goal-wizard --params \'{"profile":"cut","wake":"定饮水目标(自动算)"}\'' },
  { list: 'wake', order: 215, wakeWord: '一键定全套目标', scene: '06', kind: 'exec', key: 'calorie.view.goal-wizard', cli: 'calorie-cmd-read calorie.view.goal-wizard --params \'{"profile":"cut","wake":"一键定全套目标"}\'' },
  { list: 'wake', order: 219, wakeWord: '看体重目标进度', scene: '06', kind: 'exec', key: 'calorie.view.goal-weight', cli: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 221, wakeWord: '看目标对比实际', scene: '06', kind: 'exec', key: 'calorie.view.goal-vs-actual', cli: 'calorie-cmd-read calorie.view.goal-vs-actual --params \'{"window":"30d"}\'' },
  { list: 'wake', order: 222, wakeWord: '看目标完成度', scene: '06', kind: 'exec', key: 'calorie.view.goal', cli: 'calorie-cmd-read calorie.view.goal --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 223, wakeWord: '看即将到期的目标', scene: '06', kind: 'exec', key: 'calorie.view.goal-expiring', cli: 'calorie-cmd-read calorie.view.goal-expiring' },
  { list: 'wake', order: 226, wakeWord: '改营养目标', scene: '06', kind: 'exec', key: 'calorie.goal.set', cli: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'' },
  { list: 'wake', order: 227, wakeWord: '改体重目标', scene: '06', kind: 'exec', key: 'calorie.goal.weight', cli: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":67.5}\'' },
  { list: 'wake', order: 228, wakeWord: '改饮水目标', scene: '06', kind: 'exec', key: 'calorie.goal.water', cli: 'calorie-cmd-read calorie.goal.water --params \'{"water":2200}\'' },
  { list: 'wake', order: 229, wakeWord: '暂停所有目标', scene: '06', kind: 'exec', key: 'calorie.goal.pause', cli: 'calorie-cmd-read calorie.goal.pause' },
  { list: 'wake', order: 230, wakeWord: '重启所有目标', scene: '06', kind: 'exec', key: 'calorie.goal.resume', cli: 'calorie-cmd-read calorie.goal.resume' },
  { list: 'wake', order: 231, wakeWord: '看目标历史完成', scene: '06', kind: 'exec', key: 'calorie.view.goal', cli: 'calorie-cmd-read calorie.view.goal --params \'{"window":"30d"}\'' },
  { list: 'wake', order: 232, wakeWord: '看目标预测达成', scene: '06', kind: 'exec', key: 'calorie.view.goal-predict', cli: 'calorie-cmd-read calorie.view.goal-predict --params \'{"window":"14d"}\'' },
  { list: 'new', order: 4, wakeWord: '看目标配置', scene: '06', kind: 'exec', key: 'calorie.view.goal-config', cli: 'calorie-cmd-read calorie.view.goal-config' },
  { list: 'new', order: 5, wakeWord: '看目标状态', scene: '06', kind: 'exec', key: 'calorie.view.goal-status', cli: 'calorie-cmd-read calorie.view.goal-status' },
  { list: 'new', order: 57, wakeWord: '看目标预检', scene: '06', kind: 'exec', key: 'calorie.view.goal-wizard', cli: 'calorie-cmd-read calorie.view.goal-wizard' },
  { list: 'repair', order: 0, wakeWord: '看目标推荐', scene: '06', kind: 'exec', key: 'calorie.view.goal-recommend', cli: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
];
