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
import { registerFieldLabels } from '../shared/fieldLabel.js';

/** 本域的域名字符串（查表用；域表一个定义地，别处不许再写字面量）。 */
export const DIET_DOMAIN = 'diet';

/** 饮食域字段 → 中文标签（CLI 参数名 ＋ 库列名两套，指向同一个说法）。 */
export const DIET_FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // ① 饮食记录（`F.diet` 的 9 个参数名）
  foodName: '食物名', food_name: '食物名',
  grams: '克数',
  calories: '热量',
  protein: '蛋白质',
  carbs: '碳水', carbohydrates: '碳水',
  fat: '脂肪', saturated_fat: '饱和脂肪', saturatedFat: '饱和脂肪',
  sugar: '糖', dietary_fiber: '膳食纤维', dietaryFiber: '膳食纤维',
  sodium: '钠',
  note: '备注',
  date: '日期',
  time: '时间',
  // ② 饮水（`F.water`）
  ml: '饮水量',
  // ③ 食品库（`F.product` 与它的库列名）
  productName: '食品名', product_name: '食品名',
  brand: '品牌',
  is_deprecated: '是否已下架',
  // ④ 记录编号（写后回执的「记录编号」一行）
  id: '记录编号',
});

registerFieldLabels(DIET_DOMAIN, DIET_FIELD_LABELS);
