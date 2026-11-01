/** #496 · 饮食域字段 → 中文标签表（本域标签表的**唯一定义地**）。
 *
 * 口径照 #422 `shared/fieldLabel.ts`（本件只登记、不改共用件的查表口径）：表按域住能力目录，
 * 缺项回退**原键名**（不回退英文标签、不编中文）。形态照运动域 `exercise/fieldLabels.ts`
 * 与体重域 `weight/fieldLabels.ts`。
 *
 * 为什么饮食域需要这一张（四份文本审查点的名字）：写后回执的「写入字段」卡把
 * `writtenFields`（CLI 参数名）原样摆上屏——`.scratch/t155o/text-review-P0.md` 第 4、17、23、29 条
 * 逐条点到「11 个英文营养术语」「9 个源码字段名」，读者看不懂。键就是写命令回执报的那两套：
 *   ① `shared/writeParts.ts` 的 `F.diet`／`F.water`／`F.product`（create 类写入字段全集）；
 *   ② `cliNames(...)` 回报的库列名（update 类按实际变更列）与删类的 `is_deprecated`。
 *
 * 措辞取审查件给的逐字建议（`foodName → 食物名`、`calories → 热量`、`saturatedFat → 饱和脂肪`…）；
 * 库列名一套与 CLI 参数名一套指向同一个说法（`food_name` 与 `foodName` 都写「食物名」），
 * 两套都登记，免得 update 类的回执漏一个词。
 */
/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
import { m } from '../entries/index.js';
export const DIET_DOMAIN = 'diet';

/** 饮食域字段 → 中文标签（CLI 参数名 ＋ 库列名两套，指向同一个说法）。 */
export const dietFieldLabels = (): Readonly<Record<string, string>> => Object.freeze({
  // ① 饮食记录（`F.diet` 的 9 个参数名）
  foodName: m('skill-calorie.diet-fieldLabels.c001'), food_name: m('skill-calorie.diet-fieldLabels.c002'),
  grams: m('skill-calorie.diet-fieldLabels.c003'),
  calories: m('skill-calorie.diet-fieldLabels.c004'),
  protein: m('skill-calorie.diet-fieldLabels.c005'),
  carbs: '碳水', carbohydrates: '碳水',
  fat: '脂肪', saturated_fat: m('skill-calorie.diet-fieldLabels.c006'), saturatedFat: m('skill-calorie.diet-fieldLabels.c007'),
  sugar: m('skill-calorie.diet-fieldLabels.c008'), dietary_fiber: m('skill-calorie.diet-fieldLabels.c009'), dietaryFiber: m('skill-calorie.diet-fieldLabels.c010'),
  sodium: m('skill-calorie.diet-fieldLabels.c011'),
  note: m('skill-calorie.diet-fieldLabels.c012'),
  date: m('skill-calorie.diet-fieldLabels.c013'),
  time: m('skill-calorie.diet-fieldLabels.c014'),
  // ② 饮水（`F.water`）
  ml: m('skill-calorie.diet-fieldLabels.c015'),
  // ③ 食品库（`F.product` 与它的库列名）
  productName: m('skill-calorie.diet-fieldLabels.c016'), product_name: m('skill-calorie.diet-fieldLabels.c017'),
  brand: m('skill-calorie.diet-fieldLabels.c018'),
  is_deprecated: m('skill-calorie.diet-fieldLabels.c019'),
  // ④ 记录编号（写后回执的「记录编号」一行）
  id: m('skill-calorie.diet-fieldLabels.c020'),
});

/** 查饮食域字段标签：命中给标签，缺项回退原键名（与 shared/fieldLabel.ts 同一口径）。 */
export function dietFieldLabel(key: string): string {
  return dietFieldLabels()[key] ?? key;
}
