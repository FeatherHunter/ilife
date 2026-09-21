/** 做菜域五页的页内文案与步骤正文排版（库里原文一字不动，本件只决定它怎么排）。
 *
 * 为什么另立一件：本域五页的「一句话结论」「步骤标题」「本步用料文本」「步骤正文怎么断行」
 * 是一批活——同批改动一起改，故与页面样式段分开各住一件（同 `history/page-css.ts` 的处置）。
 *
 * 三条口径：
 *  ① **不改数据语义**：库里的步骤原文、反馈原文一字不动。断句只发生在**已有的标点之后**，
 *    标点本身留在原句里，页面上多出来的只有换行（`<br>`，与 `render/html.ts` 的分析段同一做法）。
 *  ② **同一句话只有一处定义**：页面结论条走下面的 `SERVINGS_NOTE_PAGE`，命令回执走 `servingsNoteReceipt()`
 *    （两面各一处定义；页面已把人数摆在事实条上，回执那一面看不到页面，故回执带倍率、页面不复述）。
 *  ③ 上屏文字不带工单黑话与实现语（`t778-终审扫描.mjs` 的三类字样命中 0）。
 */
import { escapeHtml } from 'base-paint';

/** 结论句（**页面上**那一句，恒非空）。
 *
 *  第二轮返修：原来按「与原谱同份／改过份量」分两句，改过份量那句要写「已按 4 人份配好（原谱 2 人份）」——
 *  页头事实条已经写着「份量 4 人份」、步骤卡里的用料胶囊也已经是放大后的克数，这句在首屏上读成**第三遍**
 *  同一个意思（同尺复评第 3 格原文摘：「『份量已按 4 人份配好』与『第 1 步』内同义冗余偏多」）。现收成一句：
 *  只说读者要做的动作，**人数与倍率一个都不再复述**（清单本来就是按当前份量算出来的）。 */
export const SERVINGS_NOTE_PAGE = '用料已算好，照清单备料。';

/** 命令回执里的份量说明（给**读信封的调用方**看的那一面）。
 *
 *  与页面那句分开定义的理由：读信封的一方看不到页头事实条，它要知道「这次的用量是原谱的几倍」；
 *  而页面已经把那两个数摆在读者眼前了。两面各有一处定义，不互相复述。 */
export function servingsNoteReceipt(servings: number, base: number, factor: number): string {
  return servings === base
    ? '份量照原谱（' + base + ' 人份），无需换算'
    : '用量是原谱（' + base + ' 人份）的 ' + factor + ' 倍（' + servings + ' 人份），照这份清单备料就行。';
}

/** 用量文本：库里没登记数字用量时说「适量」（不猜数）。 */
export function qtyText(q: number | null, unit: string): string {
  if (q === null) return '适量';
  return (String(q) + ' ' + unit).trim();
}

/** 本步用料一枚胶囊的文本（可选料缀「（可选）」）。 */
export function usageChip(name: string, q: number | null, unit: string, optional: boolean): string {
  return name + ' ' + qtyText(q, unit) + (optional ? '（可选）' : '');
}

/** 步骤状态（`run.ts` 按当前步算出来，标题与卡面形状共用同一个值）。 */
export type StepState = 'done' | 'current' | 'todo';

/** 步骤卡标题：做过的标「已做」；**正在做的那一步不再写字**——进度卡上已经写着「当前进度 1 / 6 步」，
 *  标题再写一遍「（正在做）」就是同一件事说两遍（第二轮同尺复评第 1 格的原文摘点到了这一处）。
 *  当前步改由**形状**承担：卡左缘主色加粗、卡面自上而下由浅底回到白、标题位一枚主色圆点。 */
export function stepTitle(seq: number, state: StepState): string {
  return '第 ' + seq + ' 步' + (state === 'done' ? '（已做）' : '');
}

/** 步骤正文按**已有标点**分行：读起来有句读，行尾也不再一路顶到卡片右沿。
 *  断开点只取自句读符号（半角与全角各一套），原字符一个不删；短于 6 字的碎片并进上一行，
 *  免得排出一串孤零零的残句。 */
export function stepProseHtml(action: string): string {
  const segs = action.split(/(?<=[,，;；。！？])/).filter((seg) => seg !== '');
  const lines: string[] = [];
  for (const seg of segs) {
    const last = lines.length === 0 ? undefined : lines[lines.length - 1];
    if (last !== undefined && seg.length < 6) lines[lines.length - 1] = last + seg;
    else lines.push(seg);
  }
  return (lines.length === 0 ? [action] : lines).map((one) => escapeHtml(one)).join('<br>');
}
