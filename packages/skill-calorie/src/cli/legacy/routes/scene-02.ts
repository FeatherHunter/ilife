/** #313 B 段 · 场景 02 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * #315 起：属于饮食 24 键的记录已搬进 `src/diet/routes.ts`（记录归属＝它 `key` 的所有者）；
 * 本件余下的都是**仍未搬迁**的记录——6 条 non-exec（拍营养表 2／有备注 2／批量导入 wizard 2）
 * ＋ 若干条键住别的场景分片的记录（`calorie.view.diet` ／ `calorie.view.nutrition-analysis` ／
 * `calorie.view.six-factors`），它们由各自的所有者在自己的窗口里定点搬走。
 *
 * `order` 是记录在**原列表内**的 0 基位次（顺序权威），**原值照抄、不重排**——生成器按全表
 * `(list, order)` 复原三个列表，跨件搬家不打乱顺序。本件只许随搬迁变短，不许凭空新增记录。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；本件住 `routes/` 子目录：`gen-cli.mjs` 扫
 * `src/cli/legacy/` 时只收 `isFile()`，故路由声明不会被当成命令清单捡走。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_02: readonly RouteDecl[] = [
  { list: 'wake', order: 13, wakeWord: '拍营养表记一餐', scene: '02', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。' },
  { list: 'wake', order: 14, wakeWord: '拍营养表补记一餐', scene: '02', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。' },
  { list: 'wake', order: 33, wakeWord: '看有备注的饮食记录', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。' },
  { list: 'wake', order: 40, wakeWord: '批量导入食品', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。' },
  { list: 'wake', order: 41, wakeWord: '校验批量导入', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。' },
  { list: 'wake', order: 78, wakeWord: '看「有备注」的饮食记录', scene: '02', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。' },
];
