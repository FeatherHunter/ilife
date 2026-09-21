/** 做菜域五页的页内文案与步骤正文排版（库里原文一字不动，本件只决定它怎么排）。
 *
 * 为什么另立一件：本域五页的「一句话结论」「步骤标题」「本步用料文本」「步骤正文怎么断行」
 * 是一批活——同批改动一起改，故与页面样式段分开各住一件（同 `history/page-css.ts` 的处置）。
 *
 * 三条口径：
 *  ① **不改数据语义**：库里的步骤原文、反馈原文一字不动。断句只发生在**已有的标点之后**，
 *    标点本身留在原句里，页面上多出来的只有换行（`<br>`，与 `render/html.ts` 的分析段同一做法）。
 *  ② **同一句话只有一处定义**：命令信封的 `servingsNote` 与页面结论条走同一个 `servingsNote()`。
 *  ③ 上屏文字不带工单黑话与实现语（`t778-终审扫描.mjs` 的三类字样命中 0）。
 */
import { escapeHtml } from 'base-paint';

/** 结论句：份量与原谱一致时说「不用换算」，改过份量的说「已按几人份配好」。
 *  人数来自库里字段，本件一个数都不编；也不要求读者自己做「原谱的几倍」这道算术。 */
export function servingsNote(servings: number, base: number): string {
  if (servings === base) return '份量照原谱，不用换算。';
  return '份量已按 ' + servings + ' 人份配好（原谱 ' + base + ' 人份），不用换算。';
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

/** 步骤卡标题：做过的标「已做」，正在做的标「正在做」——状态写在标题上，不靠正文读。 */
export function stepTitle(seq: number, state: StepState): string {
  const mark = state === 'done' ? '（已做）' : (state === 'current' ? '（正在做）' : '');
  return '第 ' + seq + ' 步' + mark;
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
