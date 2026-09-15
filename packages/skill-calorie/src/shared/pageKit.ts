/** #525 · 卡路里页面共用件：四张下游票的**唯一取形状处**（场景 09 的读侧／过程与结果／回执／HELP）。
 *
 *  谁在用（写得出哪两个在用）：**卡路里**的整页装配族（`src/shared/docPage.ts` 的调用方——今天的
 *  `src/photo/photo.ts` 与 `src/render/wizardPortDocs.ts`；本票的样板页 `.scratch/t525/` 先用）。
 *  四张下游票（#526 读侧／#527 过程与结果／#528 回执／#529 HELP）照抄本件，不再各写一套。
 *
 *  本件**不造形状**：形状全在 `base-paint` 里（12 个区块 ＋ #421 四件 ＋ #525 三件）。
 *  本件只做两件事：
 *   ① 把「哪件债该变成什么形状」收成一份**可照抄的清单**（下面的 `SHAPES`，一个名字对一处场景），
 *      并给出「样式段怎么拼」与「机器载荷怎么降级」这两条页面级做法；
 *   ② 把 `pageUi` 这一位的取用口径收在一处（`pageBaseCss`），免得四票各拼一遍样式。
 *
 *  **不许照抄的两件事**：① 不要把可复制的原始命令／载荷平铺进正文（用 `payloadFold`）；
 *  ② 不要在页面里写字号、内距、色值——版面单源在 `base-paint`，页面里一条都不许有。
 */
import { buildStyleSheet } from 'base-paint';
import { blocksCss, renderDisclosure, renderPreBlock } from 'base-paint/blocks';
import { pageShapeCss, pageUiCss } from 'base-paint';

/** 形状清单：左＝这处债长什么样，右＝用哪件（形状名逐字即 `base-paint` 的出口名）。
 *  这份表是**照抄指引的机器可读版**，与交付件 `docs/skills/skill-calorie/t525-共享形状与样板页.md`
 *  的同名一节同源；改一处要两处一起改（本件是唯一代码侧落点）。 */
export const SHAPES = Object.freeze({
  '标签串（`·` 连的多个标签）': 'renderChips',
  '改前改后（两列事实）': 'renderChangeRows',
  '一句判语＋事实': 'renderConclusionBar',
  '一行 N 件事（拍摄时间／天数／标签／文件名这类串）': 'renderFactStrip',
  '分布与占比': 'renderDistributionRows',
  '左中右三槽的行': 'renderListRows',
  '时间线（时间＋做了什么）': 'renderTimelineRows',
  '读数卡（纯数字成组）': 'renderKpiGrid',
  '小表（列少的对照）': 'renderDataTable',
  '页内导航': 'renderTocBlock',
  '口径说明': 'renderCaliberLine',
  '图片与 GIF': 'renderMediaFigure',
  '原始命令与机器载荷': 'payloadFold',
});

/** 页面基础样式段（与 `assembleDocPage` 的拼法逐字同源）：`buildStyleSheet()` ＋ `blocksCss()`，
 *  `pageUi` 为真时再追加移动端配方与三件形状的样式。**别在页面里另拼样式**——这里已经是全部。 */
export function pageBaseCss(pageUi: boolean): string {
  return buildStyleSheet().css + '\n' + blocksCss()
    + (pageUi ? '\n' + pageUiCss() + '\n' + pageShapeCss() : '');
}

/** 机器载荷的折叠呈现：一行人话标题 ＋ 折起的原始命令（含一颗「复制指令」）。
 *  正文里不再平铺 `calorie-cmd-read …` 那种长串——读者要照抄时点开即可，先看人话。 */
export function payloadFold(title: string, command: string, copyLabel?: string): string {
  return renderDisclosure({
    title,
    contentHtml: renderPreBlock({
      command,
      ...(copyLabel === undefined ? {} : { label: copyLabel }),
      actionId: 'ilife-help-copy-prompt',
      copyText: command,
    }),
  });
}
