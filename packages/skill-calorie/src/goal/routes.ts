/** #318 · 目标管理／基础信息（HELP 场景 06）**已搬迁键**的路由声明（键属 `dist/goal/commands.js` 的
 * `GOAL_COMMANDS` 声明键集）。搬迁口径与场景分片同：由 `.scratch/t318/scan-routes.mjs`
 * 机械搬出（行级照抄），语义不动；`order` 仍是原列表内 0 基位次。键集搬家后本件跟着走，顺序不受影响。
 * 本件只收「键属本能力、记录住 scene-06 那一件」的行；同一 `(list, wakeWord)` 的整组不拆（`gen-routes.mjs` 的守卫）。
 * #320 · `calorie.view.goal-weight` 的三条记录自 `cli/legacy/routes/scene-03.ts`／`scene-06.ts`／`scene-10.ts`
 * **定点**搬入（记录跟键主人走，口径见 `.scratch/t314-319/六票落点规则.md` §一之二）：`list`／`order`／
 * `scene`／`cli` 原值照抄，故生成物 `routes.generated.ts` 逐字节不变；这三条按「键属本能力」收在本件，
 * 但它们的 `scene` 仍是各自那一片（03／06／10），不是本票搬的「记录住 scene-06」那一类。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const GOAL_ROUTES: readonly RouteDecl[] = [
  { list: 'wake', order: 120, wakeWord: '对比体重：当前 vs 目标体重', scene: '03', kind: 'exec', key: 'calorie.view.goal-weight', cli: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"30d"}\'' },
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
  { list: 'wake', order: 373, wakeWord: '我距离目标还差什么', scene: '10', kind: 'exec', key: 'calorie.view.goal-weight', cli: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"7d"}\'' },
  { list: 'new', order: 4, wakeWord: '看目标配置', scene: '06', kind: 'exec', key: 'calorie.view.goal-config', cli: 'calorie-cmd-read calorie.view.goal-config' },
  { list: 'new', order: 5, wakeWord: '看目标状态', scene: '06', kind: 'exec', key: 'calorie.view.goal-status', cli: 'calorie-cmd-read calorie.view.goal-status' },
  { list: 'new', order: 57, wakeWord: '看目标预检', scene: '06', kind: 'exec', key: 'calorie.view.goal-wizard', cli: 'calorie-cmd-read calorie.view.goal-wizard' },
  { list: 'repair', order: 0, wakeWord: '看目标推荐', scene: '06', kind: 'exec', key: 'calorie.view.goal-recommend', cli: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
];
