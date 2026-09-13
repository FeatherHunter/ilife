/** 未搬迁命令的场景分区 · 场景 06（goal）：13 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_06: readonly LegacyCommandDecl[] = [
  { kind: 'write', key: 'calorie.goal.pause', shape: 'receipt', title: '暂停目标', wakeWord: '暂停所有目标', example: 'calorie-cmd-read calorie.goal.pause' },
  { kind: 'write', key: 'calorie.goal.resume', shape: 'receipt', title: '重启目标', wakeWord: '重启所有目标', example: 'calorie-cmd-read calorie.goal.resume' },
  { kind: 'write', key: 'calorie.goal.set', shape: 'receipt', title: '定营养目标', wakeWord: '定营养目标', example: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'' },
  { kind: 'write', key: 'calorie.goal.water', shape: 'receipt', title: '定饮水目标', wakeWord: '定饮水目标', example: 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'' },
  { kind: 'write', key: 'calorie.goal.weight', shape: 'receipt', title: '定体重目标', wakeWord: '定体重目标', example: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'' },
  { kind: 'read', key: 'calorie.view.goal', shape: 'stat', title: '目标分析', wakeWord: '看今日目标进度', example: 'calorie-cmd-read calorie.view.goal --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-config', shape: 'stat', title: '目标配置', wakeWord: '定营养目标', example: 'calorie-cmd-read calorie.view.goal-config' },
  { kind: 'read', key: 'calorie.view.goal-expiring', shape: 'stat', title: '即将到期目标', wakeWord: '看即将到期的目标', example: 'calorie-cmd-read calorie.view.goal-expiring' },
  { kind: 'read', key: 'calorie.view.goal-predict', shape: 'stat', title: '目标预测达成', wakeWord: '看目标预测达成', example: 'calorie-cmd-read calorie.view.goal-predict --params \'{"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-recommend', shape: 'stat', title: '目标推荐', wakeWord: '定营养目标(自动算)', example: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
  { kind: 'read', key: 'calorie.view.goal-status', shape: 'stat', title: '目标状态', wakeWord: '看目标状态', example: 'calorie-cmd-read calorie.view.goal-status' },
  { kind: 'read', key: 'calorie.view.goal-vs-actual', shape: 'stat', title: '目标对比实际', wakeWord: '看目标对比实际', example: 'calorie-cmd-read calorie.view.goal-vs-actual --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-wizard', shape: 'stat', title: '目标预检', wakeWord: '看目标预检', example: 'calorie-cmd-read calorie.view.goal-wizard' },
] satisfies readonly LegacyCommandDecl[];
