/** 未搬迁命令的场景分区 · 场景 05（workout）：5 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_05: readonly LegacyCommandDecl[] = [
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描', example: 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）', example: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看', example: 'calorie-cmd-read calorie.view.plan' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '构建向导', example: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度', example: 'calorie-cmd-read calorie.view.process-progress' },
] satisfies readonly LegacyCommandDecl[];
