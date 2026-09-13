/** #313 B 段 · 场景 04 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_04: readonly RouteDecl[] = [
  { list: 'wake', order: 137, wakeWord: '记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { list: 'wake', order: 138, wakeWord: '记运动（含备注）', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}\'' },
  { list: 'wake', order: 139, wakeWord: '记力量训练', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}\'' },
  { list: 'wake', order: 140, wakeWord: '记有氧运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}\'' },
  { list: 'wake', order: 141, wakeWord: '记日常活动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}\'' },
  { list: 'wake', order: 142, wakeWord: '补记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}\'' },
  { list: 'wake', order: 143, wakeWord: '批量补记运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}]}\'' },
  { list: 'wake', order: 144, wakeWord: '复制昨日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"copyFrom":"yesterday"}\'' },
  { list: 'wake', order: 145, wakeWord: '改运动记录', scene: '04', kind: 'exec', key: 'calorie.exercise.update', cli: 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'' },
  { list: 'wake', order: 146, wakeWord: '改某日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.update', cli: 'calorie-cmd-read calorie.exercise.update --params \'{"note":"补记","date":"<日期>"}\'' },
  { list: 'wake', order: 147, wakeWord: '删运动记录', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'' },
  { list: 'wake', order: 148, wakeWord: '删某日运动', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"date":"<日期>"}\'' },
  { list: 'wake', order: 149, wakeWord: '批量删运动', scene: '04', kind: 'exec', key: 'calorie.exercise.remove', cli: 'calorie-cmd-read calorie.exercise.remove --params \'{"from":"<日期>","to":"<日期>"}\'' },
  { list: 'wake', order: 159, wakeWord: '看今日运动（vs 目标）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"今日"}\'' },
  { list: 'wake', order: 160, wakeWord: '看本周运动（vs 目标）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"本周"}\'' },
  { list: 'wake', order: 161, wakeWord: '看运动记录（有备注）', scene: '04', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。' },
  { list: 'wake', order: 162, wakeWord: '看运动记录（按力量筛选）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 163, wakeWord: '看运动记录（按有氧筛选）', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 168, wakeWord: '看力量训练总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 169, wakeWord: '看有氧训练总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { list: 'new', order: 28, wakeWord: '看运动目标', scene: '04', kind: 'exec', key: 'calorie.view.exercise-goal', cli: 'calorie-cmd-read calorie.view.exercise-goal' },
  { list: 'new', order: 34, wakeWord: '看力量总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-strength', cli: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { list: 'new', order: 35, wakeWord: '看有氧总览', scene: '04', kind: 'exec', key: 'calorie.view.exercise-cardio', cli: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { list: 'new', order: 36, wakeWord: '看运动分类占比', scene: '04', kind: 'exec', key: 'calorie.view.exercise-distribution', cli: 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"window":"7d"}\'' },
  { list: 'new', order: 37, wakeWord: '看运动复盘', scene: '04', kind: 'exec', key: 'calorie.view.exercise-recap', cli: 'calorie-cmd-read calorie.view.exercise-recap --params \'{"window":"7d"}\'' },
  { list: 'new', order: 39, wakeWord: '看运动消耗趋势', scene: '04', kind: 'exec', key: 'calorie.view.exercise-trend', cli: 'calorie-cmd-read calorie.view.exercise-trend --params \'{"window":"7d"}\'' },
];
