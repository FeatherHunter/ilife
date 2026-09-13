/** #313 B 段 · 场景 03 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_03: readonly RouteDecl[] = [
  { list: 'wake', order: 97, wakeWord: '看体重曲线（带目标）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。' },
  { list: 'wake', order: 98, wakeWord: '看体重曲线（带里程碑）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。' },
  { list: 'wake', order: 99, wakeWord: '看体重曲线（带异常点）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。' },
  { list: 'wake', order: 111, wakeWord: '看「有备注」的体重记录', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。' },
  { list: 'wake', order: 121, wakeWord: '对比体重：当前 vs 平台期首日', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 122, wakeWord: '对比体重：当前 vs 历史最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 123, wakeWord: '对比体重：当前 vs 历史最高', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 124, wakeWord: '对比体重：减重 5kg 那天 vs 今天', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 125, wakeWord: '对比体重：减重 10kg 那天 vs 今天', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 126, wakeWord: '对比体重：当前 vs 入夏最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 127, wakeWord: '对比体重：当前 vs 入冬最低', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 128, wakeWord: '对比体重：运动多 vs 运动少的两个月', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。' },
  { list: 'wake', order: 131, wakeWord: '体重复盘（本周）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。' },
  { list: 'wake', order: 132, wakeWord: '体重复盘（本月）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。' },
  { list: 'wake', order: 133, wakeWord: '体重复盘（最近 90 天）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。' },
  { list: 'wake', order: 134, wakeWord: '体重复盘（今年）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。' },
  { list: 'wake', order: 135, wakeWord: '体重复盘（自定义时间）', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。' },
  { list: 'wake', order: 136, wakeWord: '看里程碑回溯', scene: '03', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。' },
];
