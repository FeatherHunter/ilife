/** #314 · 身体细节能力**已搬迁键**的路由声明（键属 `dist/body/commands.js` 的 `BODY_ROUTES` 声明键集）。
 *
 * 搬迁口径（编排者 #314 裁决）：**记录归属＝它 `key` 的所有者**——同一个键的记录可能散在多片
 * （实测本族来自 `routes/scene-08.ts`），一律按 key 归到本件，而不是按记录自己的 `scene` 字段留片。
 * 字段与语义**一字不动**，只换住处：`order` 仍是原列表内 0 基位次（生成器按 `(list, order)` 复原
 * 三个列表，故按 key 搬家不打乱顺序）。无 `key` 的 `non-exec` 记录没有归属者，按 `scene` 留在原片。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const BODY_ROUTES: readonly RouteDecl[] = [
  { list: 'wake', order: 237, wakeWord: '记体脂（皮褶钳）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"home_caliper","sex":"male","age":30,"caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10,"date":"<日期>"}\'' },
  { list: 'wake', order: 238, wakeWord: '记体脂（外部测量）', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5,"date":"<日期>"}\'' },
  { list: 'wake', order: 239, wakeWord: '记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85,"hipCm":95}\'' },
  { list: 'wake', order: 240, wakeWord: '补记体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-add', cli: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":19,"date":"<日期>"}\'' },
  { list: 'wake', order: 241, wakeWord: '补记围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-add', cli: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":86,"date":"<日期>"}\'' },
  { list: 'wake', order: 242, wakeWord: '看体脂', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { list: 'wake', order: 243, wakeWord: '看体脂趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition --params \'{"days":90}\'' },
  { list: 'wake', order: 244, wakeWord: '看围度', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { list: 'wake', order: 245, wakeWord: '看围度趋势', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure --params \'{"days":90}\'' },
  { list: 'wake', order: 246, wakeWord: '对比体脂', scene: '08', kind: 'exec', key: 'calorie.view.body-composition-compare', cli: 'calorie-cmd-read calorie.view.body-composition-compare --params \'{"period1Start":"2026-09-05","period1End":"2026-09-05","period2Start":"2026-09-07","period2End":"2026-09-07"}\'' },
  { list: 'wake', order: 247, wakeWord: '对比围度', scene: '08', kind: 'exec', key: 'calorie.view.body-measure-compare', cli: 'calorie-cmd-read calorie.view.body-measure-compare --params \'{"date1":"2026-09-05","date2":"2026-09-07"}\'' },
  { list: 'wake', order: 248, wakeWord: '删体脂', scene: '08', kind: 'exec', key: 'calorie.body.composition-remove', cli: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { list: 'wake', order: 249, wakeWord: '删围度', scene: '08', kind: 'exec', key: 'calorie.body.measure-remove', cli: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { list: 'new', order: 24, wakeWord: '看体成分', scene: '08', kind: 'exec', key: 'calorie.view.body-composition', cli: 'calorie-cmd-read calorie.view.body-composition' },
  { list: 'new', order: 25, wakeWord: '看围度记录', scene: '08', kind: 'exec', key: 'calorie.view.body-measure', cli: 'calorie-cmd-read calorie.view.body-measure' },
  { list: 'new', order: 52, wakeWord: '看围度向导', scene: '08', kind: 'exec', key: 'calorie.view.measure-wizard', cli: 'calorie-cmd-read calorie.view.measure-wizard' },
  { list: 'new', order: 53, wakeWord: '看体脂向导', scene: '08', kind: 'exec', key: 'calorie.view.composition-wizard', cli: 'calorie-cmd-read calorie.view.composition-wizard' },
];
