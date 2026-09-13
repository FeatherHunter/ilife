/** 未搬迁命令的场景分区 · 场景 02（diet）：24 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_02: readonly LegacyCommandDecl[] = [
  { kind: 'write', key: 'calorie.diet.add', shape: 'receipt', title: '记一餐', wakeWord: '记一餐', example: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'' },
  { kind: 'write', key: 'calorie.diet.batch', shape: 'receipt', title: '批量记饮食', wakeWord: '批量补记饮食', example: 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3}]}\'' },
  { kind: 'write', key: 'calorie.diet.copy', shape: 'receipt', title: '复制饮食', wakeWord: '复制昨日饮食', example: 'calorie-cmd-read calorie.diet.copy --params \'{"from":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove', shape: 'receipt', title: '删饮食', wakeWord: '删饮食记录', example: 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-date', shape: 'receipt', title: '按日删饮食', wakeWord: '删某日饮食', example: 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-range', shape: 'receipt', title: '按范围删饮食', wakeWord: '批量删饮食', example: 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"<日期>","end":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-type', shape: 'receipt', title: '按餐别删饮食', wakeWord: '删一餐', example: 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"mealType":"早餐","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.update', shape: 'receipt', title: '改饮食', wakeWord: '改饮食记录', example: 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'' },
  { kind: 'write', key: 'calorie.diet.update-by-date', shape: 'receipt', title: '按日改饮食', wakeWord: '改某日饮食', example: 'calorie-cmd-read calorie.diet.update-by-date --params \'{"note":"食堂","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.product.add', shape: 'receipt', title: '存食品', wakeWord: '存食品', example: 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'' },
  { kind: 'write', key: 'calorie.product.deprecate', shape: 'receipt', title: '下架食品', wakeWord: '下架食品', example: 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.product.update', shape: 'receipt', title: '改食品', wakeWord: '改食品', example: 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'' },
  { kind: 'read', key: 'calorie.today', shape: 'list', title: '今日饮食', wakeWord: '看今日饮食概览', example: 'calorie-cmd-read calorie.today --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.batch-import-preview', shape: 'stat', title: '批量导入预览', wakeWord: '看批量导入预览', example: 'calorie-cmd-read calorie.view.batch-import-preview --params \'{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}\'' },
  { kind: 'read', key: 'calorie.view.dedupe', shape: 'stat', title: '去重报告', example: 'calorie-cmd-read calorie.view.dedupe' },
  { kind: 'read', key: 'calorie.view.diet-review', shape: 'stat', title: '饮食复盘', wakeWord: '今日复盘', example: 'calorie-cmd-read calorie.view.diet-review --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.library', shape: 'stat', title: '食品库', wakeWord: '查食品库', example: 'calorie-cmd-read calorie.view.library' },
  { kind: 'read', key: 'calorie.view.nutrition-detail', shape: 'stat', title: '营养素深度', wakeWord: '看营养素深度', example: 'calorie-cmd-read calorie.view.nutrition-detail --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-ratio', shape: 'stat', title: '营养配比', wakeWord: '查营养配比', example: 'calorie-cmd-read calorie.view.nutrition-ratio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.ranking', shape: 'stat', title: '食品排行', wakeWord: '查高热量排行', example: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","topN":10,"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.search', shape: 'stat', title: '查食品', wakeWord: '查食品', example: 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'' },
  { kind: 'read', key: 'calorie.view.source-stats', shape: 'stat', title: '食品来源统计', wakeWord: '看食品来源统计', example: 'calorie-cmd-read calorie.view.source-stats' },
  { kind: 'read', key: 'calorie.view.today-water', shape: 'stat', title: '今日饮水', wakeWord: '看今日喝水', example: 'calorie-cmd-read calorie.view.today-water --params \'{"date":"今日"}\'' },
  { kind: 'write', key: 'calorie.water.log', shape: 'receipt', title: '记喝水', wakeWord: '记喝水', example: 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'' },
] satisfies readonly LegacyCommandDecl[];
