/** #313 B 段 · 场景 05 的路由声明（**未搬迁**的记录：键不属任何已搬迁能力件）。
 *
 * 由 `.scratch/t313b1/dump-routes.mjs` 从 #81 运行时事实（`dist/triggers/routing.js`）机械搬迁：语义不动、
 * 只换住处。记录形状见 `src/triggers/routeSpec.ts`；`order` 是该记录在**原列表内**的 0 基位次（顺序权威，
 * 生成器按 `(list, order)` 复原三个列表）。本件住 `routes/` 子目录：`gen-cli.mjs` 扫 `src/cli/legacy/` 时
 * 只收 `isFile()`，故路由声明不会被当成命令清单捡走。重生成／校验：先 `pnpm build`，再跑该脚本。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';

export const ROUTES_SCENE_05: readonly RouteDecl[] = [
  { list: 'wake', order: 176, wakeWord: '看本周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 177, wakeWord: '看下周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 178, wakeWord: '看上周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 179, wakeWord: '看指定周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 180, wakeWord: '看今天练什么', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 181, wakeWord: '看某动作安排', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 182, wakeWord: '看某天练什么', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 183, wakeWord: '看计划概览', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'wake', order: 184, wakeWord: '看完整计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'wake', order: 185, wakeWord: '看计划 vs 实际', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。' },
  { list: 'wake', order: 186, wakeWord: '定训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 187, wakeWord: '复制训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 188, wakeWord: '定休息日', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 189, wakeWord: '加训练动作', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 190, wakeWord: '定一周计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 191, wakeWord: '改训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 192, wakeWord: '改某天训练', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 193, wakeWord: '删某天训练', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 194, wakeWord: '改动作', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 195, wakeWord: '撤销训练计划', scene: '05', kind: 'non-exec', bucket: 'legacy-chain', reason: '命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。' },
  { list: 'wake', order: 196, wakeWord: '落地训练', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。' },
  { list: 'wake', order: 197, wakeWord: '落地到本周末', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。' },
  { list: 'wake', order: 198, wakeWord: '落地到本月底', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。' },
  { list: 'wake', order: 199, wakeWord: '同步到训记', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。' },
  { list: 'wake', order: 200, wakeWord: '拉训记实绩', scene: '05', kind: 'non-exec', bucket: 'out-of-scope', reason: '明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。' },
  { list: 'wake', order: 201, wakeWord: '计划复盘（本周）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { list: 'wake', order: 202, wakeWord: '计划复盘（本月）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本月"}\'' },
  { list: 'wake', order: 203, wakeWord: '计划复盘（全部）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\'' },
  { list: 'wake', order: 204, wakeWord: '看计划完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 205, wakeWord: '看未完成训练', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 206, wakeWord: '看动作完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 207, wakeWord: '扫禁忌', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  { list: 'new', order: 26, wakeWord: '看训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'new', order: 27, wakeWord: '看构建向导', scene: '05', kind: 'exec', key: 'calorie.view.plan-wizard', cli: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { list: 'new', order: 31, wakeWord: '看禁忌扫描', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  { list: 'new', order: 38, wakeWord: '看训练计划复盘', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\'' },
  { list: 'new', order: 49, wakeWord: '看落地训练进度', scene: '05', kind: 'exec', key: 'calorie.view.process-progress', cli: 'calorie-cmd-read calorie.view.process-progress' },
];
