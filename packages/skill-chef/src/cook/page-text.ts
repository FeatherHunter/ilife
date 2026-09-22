/** 做菜域五页的页内文案与步骤正文排版（库里原文一字不动，本件只决定它怎么排）。
 *
 * 为什么另立一件：本域五页的「一句话结论」「步骤标题」「本步用料文本」「步骤正文怎么断行」
 * 是一批活——同批改动一起改，故与页面样式段分开各住一件（同 `history/page-css.ts` 的处置）。
 *
 * 三条口径：
 *  ① **不改数据语义**：库里的步骤原文、反馈原文一字不动。断句只发生在**已有的标点之后**，
 *    标点本身留在原句里，页面上多出来的只有换行（`<br>`，与 `render/html.ts` 的分析段同一做法）。
 *  ② **同一句话只有一处定义**：页面结论条走下面的 `cookCountNote()`，命令回执走 `servingsNoteReceipt()`
 *    （两面各一处定义。页面那一面看不到「原谱几人份」，事实条与清单都已经按当前份量算好，
 *    故页面不复述份量；回执那一面读的人看不到页面，故回执带倍率）。
 *  ③ 上屏文字不带工单黑话与实现语（`t778-终审扫描.mjs` 的三类字样命中 0）。
 */
import { escapeHtml } from 'base-paint';

/** 结论条那一句：这道菜**做过几次**（读数来自库里 `historyStats`；一次都没做过就说第一次）。
 *
 *  第三轮返修：原来这里是「用料已算好，照清单备料。」——同尺复评连着两轮把结论条读成复述
 *  （第 2 格原文摘：「『用料已算好，照清单备料』与下方步骤重复冗余」）。逐句问「删掉这句，
 *  用户会少知道什么」：份量在页头事实条上、用料在备料清单里、步骤就在下面六张卡——结论条
 *  再讲一遍备料确实不添信息。改成**做过几次**：这一条在别处都没有（第 2 格那张「上次经验」
 *  卡说的是最近一次，不是总次数），既不复述、也不编数据。 */
export function cookCountNote(count: number): string {
  return count > 0 ? '这道菜做过 ' + count + ' 次' : '第一次做这道菜';
}

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
