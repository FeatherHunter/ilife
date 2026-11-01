/** #483 · 体重域字段 → 中文标签表（本域标签表的**唯一定义地**）。
 *
 * 口径照 #422 `shared/fieldLabel.ts`：表按域住能力目录，共用位只留查表口径；缺项回退**原键名**
 * （不回退英文标签、不编中文）。本件在加载时按 `weight` 域登记一次，全仓只此一处登记——
 * 回执页（`receipt.ts` 的「改动字段」卡、`logReceipt.ts` 的「写入字段」卡与页脚来源行）查表，
 * 任何人都不许另写第二份映射。形态照运动域 `exercise/fieldLabels.ts`。
 *
 * 键就是写命令回执 `writtenFields` 报的那套（CLI 参数名口径：`log.ts` 的 `F.weight`／
 * `F.weightBatch`、`edit.ts` 的 `cliNames`），#483 用到的最小键集就这五个：写入字段上屏的
 * `kg`／`note`／`date`／`time` 与数据库编号 `id`。「体重」不写「体重（kg）」，单位由卡上的 `kg` 给。
 *
 * 不登记的键：定位／选择器类（`start`／`end`／`items`）不进 `writtenFields`，也没有上屏处，
 * 没有中文名就不编（缺项回退原键名那一口径）。
 */
/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
import { m } from '../entries/index.js';
export const WEIGHT_DOMAIN = 'weight';

/** 体重域字段 → 中文标签（#483 最小键集：写入字段上屏的四个参数名 ＋ 记录编号）。 */
export const weightFieldLabels = (): Readonly<Record<string, string>> => Object.freeze({
  kg: m('skill-calorie.weight-fieldLabels.c001'), date: m('skill-calorie.weight-fieldLabels.c002'), time: m('skill-calorie.weight-fieldLabels.c003'), note: m('skill-calorie.weight-fieldLabels.c004'), id: m('skill-calorie.weight-fieldLabels.c005'),
});

/** 查体重域字段标签：命中给标签，缺项回退原键名（与 shared/fieldLabel.ts 同一口径）。 */
export function weightFieldLabel(key: string): string {
  return weightFieldLabels()[key] ?? key;
}
