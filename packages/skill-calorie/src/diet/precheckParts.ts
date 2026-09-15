/** #277 · 预检确认页的**两族共用小件**（导入预检页 与 营养表识别确认页 同用这一份）。
 *
 * 拆出来是照本包告警线台账写好的拆法第一步：「两族共用的页卡、导航、复制区、来源脚注提为共件，
 * 出口经本件薄转出」。`diet/precheck.ts`（导入预检页）与 `diet/precheckLabel.ts`（营养表识别确认页）
 * 各自成件，谁都不越过 350 行告警线；共用的形状只在这里定义一份。
 */
import { renderDataTable, renderDisclosure } from 'base-paint/blocks';
import type { DataTextInput } from 'base-paint';

/** 读命令的入口标记（`src/diet/routes.ts` 的那几条记录带进来）。
 *
 *  #509／#511／#271 立的规矩照办：**入口一个都不删，由入口自己把标记带进命令**，命令侧按标记换页。
 *  · `ENTRY_VALIDATE`＝「校验批量导入」那一条词——同一张导入预检页出**校验形态**（逐行结果与失败原因）；
 *  · `ENTRY_PRECHECK`＝「批量导入食品」与两条「拍营养表」——这两族是**过程型**（老实物
 *    `output_type: process`），命令见它只出**预检确认页**、**不写库**；用户确认后跑同一条命令、
 *    去掉这一位即写入（`scripts/build-help.mjs:378` 的流程句子逐字「过程：先出预检确认页 →
 *    用户确认 → 跑这条命令」）。
 *  标记名不上屏、不写库。**住本件**（叶子件）——`precheckPort.ts` 转出给取数／处理体用，
 *  免得 `precheck.ts` 与 `precheckPort.ts` 互相 import 成环。 */
export const ENTRY_VALIDATE = 'validate';
export const ENTRY_PRECHECK = 'precheck';

/** envelope 头（值冻结对齐 `cli/keys.ts` 的 ENVELOPE_VERSION／CALORIE_SKILL）。 */
export const DOC_VERSION = '0.1.0';
export const DOC_SKILL = 'calorie';

/** head 标题（与 `diet/` 其余件的域口径一致）。 */
export const DOC_TITLE = '卡路里·饮食';

/** 类型徽章（`t425` §五 第 1 行右槽）：本类三页同属预检确认。 */
export const PRECHECK_BADGE = '预检确认';

/** 页内样式：只服务本类几处形状（挂 `content` 第一项，照 `diet/rankingDocs.ts` 的 `RANK_CSS` 先例）。
 *
 *  `.precheck-tag`＝老实物 `nutrition_label_wizard.html:214` 的 `.diff-tag`（`font-size:10px;
 *  font-weight:600;padding:1px 6px;border-radius:4px;margin-left:6px`）——它标的是「这一格是 AI
 *  抽出来的」；老实物 `.diff-tag.ai` 中性灰、裸 `.diff-tag` 橙色（人工改动），13 处标记全用 `.ai`。
 *  新侧沿用同一对语义：`.is-ai` 灰＝识别得来、`.is-check` 橙＝**识别不确定，要你核对**。 */
export const PRECHECK_CSS = '<style>'
  + '.precheck-tag{display:inline-block;font-size:10px;font-weight:600;padding:1px 6px;'
  + 'border-radius:4px;margin-left:6px;background:var(--soft);color:var(--fg2)}'
  + '.precheck-tag.is-check{background:#fff7e6;color:#ad6800}'
  + '.precheck-note{font-size:13px;color:var(--fg2)}'
  + '</style>';

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）。 */
export interface Card { readonly id: string; readonly label: string; readonly html: string }

export const anchored = (c: Card): string => '<section id="' + c.id + '">' + c.html + '</section>';

/** 写入字段的中文名单（`shared/writeParts.ts` 的 `F.diet`／`F.product` 逐项过 `diet/fieldLabels.ts`
 *  的域表）。写库回执早就这么做了（#496），预检页照办——`product_name`／`foodName` 这类源码名
 *  不许上屏（`t425` 裁定 1）。 */
const FIELD_CN: Readonly<Record<string, string>> = Object.freeze({
  foodName: '食物名', productName: '食品名', brand: '品牌', calories: '热量', protein: '蛋白质',
  carbs: '碳水', carbohydrates: '碳水', fat: '脂肪', saturatedFat: '饱和脂肪', sugar: '糖',
  dietaryFiber: '膳食纤维', sodium: '钠', grams: '克数', note: '备注', date: '日期', time: '时间',
});

const cnOf = (key: string): string => FIELD_CN[key] ?? key;

/** 「确认后操作」块：把**它将写入的字段与值**如实摆出来。
 *
 *  老实物把「确认后」做成三颗复制按钮（采纳／复制修改／跳过失败）；新侧照 `t425` 裁定 7 走复制区
 *  双按钮，本块只承担「写什么」这一件事，**命令原文交给复制日志第 4 段**——页面可见文本里出现
 *  `calorie.product.import` 这种键就是机器话（裁定 1 的 A3 一类）。 */
export function writeTargetBlock(
  title: string, caption: string, rows: readonly { readonly field: string; readonly value: string }[],
): string {
  return renderDisclosure({
    title,
    contentHtml: renderDataTable({
      columns: [{ key: 'field', label: '会写进去的字段' }, { key: 'value', label: '这一条写什么' }],
      rows: rows.map((r) => ({ field: cnOf(r.field), value: r.value })),
      caption,
      emptyText: '这次没有要写的字段',
    }) + '<p class="precheck-note">确认无误之后，要跑的那条命令在下方「复制日志」的第 4 段里，照抄即可重跑。</p>',
  });
}

/** stat 信封（复制数据位与复制日志位同用一份读数投影）。 */
export function stat(key: string, metrics: Record<string, number>): DataTextInput['envelope'] {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key, data: { metrics } };
}
