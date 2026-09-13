/** 未搬迁命令的场景分区 · 场景 10（analysis）：13 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_10: readonly LegacyCommandDecl[] = [
  { kind: 'read', key: 'calorie.help.lookup', shape: 'list', title: '唤醒词HELP', wakeWord: '看今日主页', example: 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'' },
  { kind: 'read', key: 'calorie.history', shape: 'list', title: '热量历史', wakeWord: '查热量历史', example: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
  { kind: 'read', key: 'calorie.view.anomaly', shape: 'stat', title: '异常诊断', example: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_volatility","window":"90d"}\'' },
  { kind: 'read', key: 'calorie.view.calorie-trend', shape: 'stat', title: '热量趋势', wakeWord: '看热量趋势', example: 'calorie-cmd-read calorie.view.calorie-trend --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.combined', shape: 'stat', title: '组合分析', wakeWord: '看体重 vs 摄入(最近 7 天)', example: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.deficit', shape: 'stat', title: '热量缺口', wakeWord: '看热量缺口', example: 'calorie-cmd-read calorie.view.deficit --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.health', shape: 'stat', title: '健康盘', wakeWord: '看健康盘', example: 'calorie-cmd-read calorie.view.health --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.lint-health', shape: 'stat', title: '数据健康检查', wakeWord: '查卡路里数据', example: 'calorie-cmd-read calorie.view.lint-health' },
  { kind: 'read', key: 'calorie.view.long-trend', shape: 'stat', title: '整体趋势', wakeWord: '看整体趋势', example: 'calorie-cmd-read calorie.view.long-trend --params \'{"group":"weight_calorie","window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-analysis', shape: 'stat', title: '营养分析', wakeWord: '看营养分析', example: 'calorie-cmd-read calorie.view.nutrition-analysis --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.predict', shape: 'stat', title: '体重预测', example: 'calorie-cmd-read calorie.view.predict --params \'{"horizonDays":7,"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.review-template', shape: 'stat', title: '复盘报告', wakeWord: '看复盘报告', example: 'calorie-cmd-read calorie.view.review-template --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.six-factors', shape: 'stat', title: '每日六因素', wakeWord: '看每日六因素', example: 'calorie-cmd-read calorie.view.six-factors --params \'{"date":"今日"}\'' },
] satisfies readonly LegacyCommandDecl[];
