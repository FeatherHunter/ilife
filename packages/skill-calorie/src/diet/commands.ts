/** 饮食的命令声明（**权威源**，HELP 场景 02「饮食」，70 个唤醒词）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * #315 纯搬迁：24 条声明的 `kind`／`key`／`shape`／`title`／`wakeWord`／`example` **逐字照抄**
 * 未搬迁清单 `src/cli/legacy/scene-02.ts` 的对应行（搬迁前的事实），只补 `run`。
 * **`calorie.view.dedupe` 照抄它「没有 `wakeWord`」这一事实**：老键里 10 条同形（缺了速查表退回键名本身），
 * 唤醒词是**产品事实**、不由搬迁票代拟（#323 把能力声明的 `wakeWord` 改成可缺，与旧声明同口径）。
 * 路由声明（`list`／`order` 原值照抄）住 `./routes.ts`——顺序权威只住声明里的 `order` 一处。
 *
 * 子功能与命令的对应（HELP 下一级 → 键）：
 *   记饮食＝`log.ts`（`diet.add`／`diet.batch`／`diet.copy`／`water.log`）；
 *   改饮食＝`edit.ts`（`diet.update`／`diet.update-by-date`／`diet.remove`／`diet.remove-by-date`／
 *   `diet.remove-by-range`／`diet.remove-by-type`）；
 *   看饮食＝`today.ts`（`today`／`view.today-water`）；
 *   查食品＝`library.ts`（`view.library`／`view.search`／`view.dedupe`／`view.source-stats`）
 *   ＋ `products.ts`（`product.add`／`product.update`／`product.deprecate`）
 *   ＋ `productImport.ts`（`product.import`：批量导入食品，读写分开的写入侧）；
 *   看营养＝`nutrition.ts`（`view.nutrition-ratio`／`view.nutrition-detail`／`view.batch-import-preview`）；
 *   看排行＝`ranking.ts`（`view.ranking`）；饮食复盘＝`review.ts`（`view.diet-review`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import {
  writeDietRemove, writeDietRemoveByDate, writeDietRemoveByRange, writeDietRemoveByType,
  writeDietUpdate, writeDietUpdateByDate,
} from './edit.js';
import { writeDietAdd, writeDietBatch, writeDietCopy, writeWaterLog } from './log.js';
import { viewDedupe, viewLibrary, viewSearch, viewSourceStats } from './library.js';
import { viewBatchImportPreview, viewLabelPrecheck, viewNutritionDetail, viewNutritionRatio } from './nutrition.js';
import { writeProductAdd, writeProductDeprecate, writeProductUpdate } from './products.js';
import { writeProductImport } from './productImport.js';
import { viewRanking } from './ranking.js';
import { viewDietReview } from './review.js';
import { viewToday, viewTodayWater } from './today.js';

export const DIET_COMMANDS = [
  { kind: 'write', key: 'calorie.diet.add', shape: 'receipt', title: '记一餐', wakeWord: '记一餐', run: writeDietAdd, example: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'' },
  { kind: 'write', key: 'calorie.diet.batch', shape: 'receipt', title: '批量记饮食', wakeWord: '批量补记饮食', run: writeDietBatch, example: 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3}]}\'' },
  { kind: 'write', key: 'calorie.diet.copy', shape: 'receipt', title: '复制饮食', wakeWord: '复制昨日饮食', run: writeDietCopy, example: 'calorie-cmd-read calorie.diet.copy --params \'{"from":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove', shape: 'receipt', title: '删饮食', wakeWord: '删饮食记录', run: writeDietRemove, example: 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-date', shape: 'receipt', title: '按日删饮食', wakeWord: '删某日饮食', run: writeDietRemoveByDate, example: 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-range', shape: 'receipt', title: '按范围删饮食', wakeWord: '批量删饮食', run: writeDietRemoveByRange, example: 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"<日期>","end":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-type', shape: 'receipt', title: '按餐别删饮食', wakeWord: '删一餐', run: writeDietRemoveByType, example: 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"mealType":"早餐","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.update', shape: 'receipt', title: '改饮食', wakeWord: '改饮食记录', run: writeDietUpdate, example: 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'' },
  { kind: 'write', key: 'calorie.diet.update-by-date', shape: 'receipt', title: '按日改饮食', wakeWord: '改某日饮食', run: writeDietUpdateByDate, example: 'calorie-cmd-read calorie.diet.update-by-date --params \'{"note":"食堂","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.product.add', shape: 'receipt', title: '存食品', wakeWord: '存食品', run: writeProductAdd, example: 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'' },
  { kind: 'write', key: 'calorie.product.deprecate', shape: 'receipt', title: '下架食品', wakeWord: '下架食品', run: writeProductDeprecate, example: 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.product.import', shape: 'receipt', title: '批量导入食品', wakeWord: '批量导入食品', run: writeProductImport, example: 'calorie-cmd-read calorie.product.import --params \'{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}]}\'' },
  { kind: 'write', key: 'calorie.product.update', shape: 'receipt', title: '改食品', wakeWord: '改食品', run: writeProductUpdate, example: 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'' },
  { kind: 'read', key: 'calorie.today', shape: 'list', title: '今日饮食', wakeWord: '看今日饮食概览', run: viewToday, example: 'calorie-cmd-read calorie.today --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.batch-import-preview', shape: 'stat', title: '批量导入预览', wakeWord: '看批量导入预览', run: viewBatchImportPreview, example: 'calorie-cmd-read calorie.view.batch-import-preview --params \'{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}\'' },
  /* #277 · 「拍营养表」两条词的第一步：识别在模型侧，模型照 `docs/skills/skill-calorie/t276-营养表映射.md`
     那张表把识别读数填成参数递进来，本命令只把「照片 ＋ 识别出的营养 ＋ 补录日期」摆成确认页，**不写库**；
     确认之后跑的是 `calorie.diet.add`（老实物 `nutrition_label_wizard.html`，`output_type: process`）。
     两条词共用这一条命令（同 `calorie.view.batch-import-preview` 挂多词的既有形状）：
     带 `date`＝补记那一支，页头与措辞按它换。**不给 `wakeWord`**：这一族的两条词都写在路由表里，
     速查表不缺行（`CommandSpec.wakeWord` 自 #323 起可缺，与老键同口径）。 */
  { kind: 'read', key: 'calorie.view.label-precheck', shape: 'stat', title: '营养表识别确认', run: viewLabelPrecheck, example: 'calorie-cmd-read calorie.view.label-precheck --params \'{"productName":"鸡胸","calories":200,"protein":35,"note":"营养表识别"}\'' },
  { kind: 'read', key: 'calorie.view.dedupe', shape: 'stat', title: '去重报告', run: viewDedupe, example: 'calorie-cmd-read calorie.view.dedupe' },
  { kind: 'read', key: 'calorie.view.diet-review', shape: 'stat', title: '饮食复盘', wakeWord: '今日复盘', run: viewDietReview, example: 'calorie-cmd-read calorie.view.diet-review --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.library', shape: 'stat', title: '食品库', wakeWord: '查食品库', run: viewLibrary, example: 'calorie-cmd-read calorie.view.library' },
  { kind: 'read', key: 'calorie.view.nutrition-detail', shape: 'stat', title: '营养素深度', wakeWord: '看营养素深度', run: viewNutritionDetail, example: 'calorie-cmd-read calorie.view.nutrition-detail --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-ratio', shape: 'stat', title: '营养配比', wakeWord: '查营养配比', run: viewNutritionRatio, example: 'calorie-cmd-read calorie.view.nutrition-ratio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.ranking', shape: 'stat', title: '食品排行', wakeWord: '查高热量排行', run: viewRanking, example: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","topN":10,"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.search', shape: 'stat', title: '查食品', wakeWord: '查食品', run: viewSearch, example: 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'' },
  { kind: 'read', key: 'calorie.view.source-stats', shape: 'stat', title: '食品来源统计', wakeWord: '看食品来源统计', run: viewSourceStats, example: 'calorie-cmd-read calorie.view.source-stats' },
  { kind: 'read', key: 'calorie.view.today-water', shape: 'stat', title: '今日饮水', wakeWord: '看今日喝水', run: viewTodayWater, example: 'calorie-cmd-read calorie.view.today-water --params \'{"date":"今日"}\'' },
  { kind: 'write', key: 'calorie.water.log', shape: 'receipt', title: '记喝水', wakeWord: '记喝水', run: writeWaterLog, example: 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'' },
] satisfies readonly CommandSpec[];
