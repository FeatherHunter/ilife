/** #313 B 段 · 场景 08 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_08: readonly RouteDecl[] = [
  { list: 'wake', order: 237, wakeWord: '记体脂（皮褶钳）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"home_caliper","bodyFatPct":18.5,"caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10,"date":"<日期>"}\'' },
  { list: 'wake', order: 238, wakeWord: '记体脂（外部测量）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5,"date":"<日期>"}\'' },
  { list: 'wake', order: 239, wakeWord: '记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85,"hipCm":95}\'' },
  { list: 'wake', order: 240, wakeWord: '补记体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":19,"date":"<日期>"}\'' },
  { list: 'wake', order: 241, wakeWord: '补记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":86,"date":"<日期>"}\'' },
  { list: 'wake', order: 242, wakeWord: '看体脂', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { list: 'wake', order: 243, wakeWord: '看体脂趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition --params \'{"days":90}\'' },
  { list: 'wake', order: 244, wakeWord: '看围度', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { list: 'wake', order: 245, wakeWord: '看围度趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure --params \'{"days":90}\'' },
  { list: 'wake', order: 246, wakeWord: '对比体脂', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。' },
  { list: 'wake', order: 247, wakeWord: '对比围度', scene: '08', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。' },
  { list: 'wake', order: 248, wakeWord: '删体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-remove', cli: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { list: 'wake', order: 249, wakeWord: '删围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-remove', cli: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { list: 'new', order: 24, wakeWord: '看体成分', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { list: 'new', order: 25, wakeWord: '看围度记录', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { list: 'new', order: 52, wakeWord: '看围度向导', scene: '08', kind: 'exec', key: 'calorie.view.measure-wizard', cli: 'calorie-cmd-read calorie.view.measure-wizard' },
  { list: 'new', order: 53, wakeWord: '看体脂向导', scene: '08', kind: 'exec', key: 'calorie.view.composition-wizard', cli: 'calorie-cmd-read calorie.view.composition-wizard' },
];
