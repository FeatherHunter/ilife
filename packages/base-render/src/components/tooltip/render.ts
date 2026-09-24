/** tooltip · **渲染**（纯函数产 HTML；本件只有形态 B「宽气泡」一种骨架）。
 *
 *  —— 形态 B：宽气泡（带「为什么重要」）——
 *
 *  骨架＝正文里**一个词**（真 `<button>`）＋ 一条**宽气泡**（眉标 ＋ 小标题 ＋ 解释 ＋
 *  「为什么重要」那一段）。它替掉的两种错法：
 *   · 用 `title` 属性顶事——手机上根本弹不出来、样式不可控、一屏只给一行的纯文本；
 *   · 把口径写成正文里的一句灰字——读的人分不清「哪句是正文、哪句是算法说明」。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 词是**真 `<button type=button>`**：`aria-describedby` 指着气泡（屏读器读得到），
 *     气泡是 `popover` ＋ `role=tooltip`（`Esc`／点外面关是浏览器给的）；
 *   · **三条通路都出得来**：点击（`popovertarget`，零脚本也成）／聚焦（键盘）／悬停（细指针设备）；
 *   · 词在行里，**视觉盒不撑行**：≥44×44 的命中盒靠看不见的一圈 `::after` 往外撑。
 */
import { esc } from '../shared/escape.js';
import {
  TOOLTIP_ANCHOR_PREFIX, TOOLTIP_ATTR, TOOLTIP_BUBBLE_ATTR, TOOLTIP_FORMS, TOOLTIP_MARK, TOOLTIP_WHY_LABEL,
  TOOLTIP_WORD_ATTR, tooltipClass, tooltipSlot, type TooltipForm,
} from './attrs.js';
import { normalizeTooltip, type TooltipModel } from './model.js';

/** 被解释的那个词：真按钮 ＋ 一枚问号记号（整词是命中区）。 */
function wordHtml(m: TooltipModel): string {
  return '<button class="' + tooltipSlot('word') + '" type="button"'
    + ' id="' + esc(m.id) + '-word"'
    + ' popovertarget="' + esc(m.id) + '"'
    + ' aria-describedby="' + esc(m.id) + '"'
    + ' ' + TOOLTIP_WORD_ATTR + '="' + esc(m.id) + '"'
    + ' style="anchor-name:' + esc(TOOLTIP_ANCHOR_PREFIX + m.id) + '">'
    + esc(m.word)
    + '<span class="' + tooltipSlot('mark') + '" aria-hidden="true">' + esc(TOOLTIP_MARK) + '</span>'
    + '</button>';
}

/** 气泡：眉标 ＋ 小标题 ＋ 关掉的提示 ／ 解释 ／ **为什么重要**。 */
function bubbleHtml(m: TooltipModel): string {
  const hint = m.hint === '' ? '' : '<span class="' + tooltipSlot('hint') + '">' + esc(m.hint) + '</span>';
  return '<span class="' + tooltipSlot('bubble') + '"'
    + ' id="' + esc(m.id) + '"'
    + ' popover="auto" role="tooltip"'
    + ' style="position-anchor:' + esc(TOOLTIP_ANCHOR_PREFIX + m.id) + '"'
    + ' ' + TOOLTIP_BUBBLE_ATTR + '="' + esc(m.id) + '">'
    + '<span class="' + tooltipSlot('head') + '">'
    + '<b class="' + tooltipSlot('badge') + '">' + esc(m.badgeText) + '</b>'
    + '<b class="' + tooltipSlot('title') + '">' + esc(m.title) + '</b>'
    + hint
    + '</span>'
    + '<span class="' + tooltipSlot('text') + '">' + esc(m.text) + '</span>'
    + '<span class="' + tooltipSlot('why') + '"><b>' + esc(TOOLTIP_WHY_LABEL) + '</b>' + esc(m.why) + '</span>'
    + '</span>';
}

/** 形态 → 骨架（本件只有一格）。 */
const SKELETONS: Readonly<Record<TooltipForm, (m: TooltipModel) => string>> = {
  wide: (m) => wordHtml(m) + bubbleHtml(m),
};

/** 渲染一条气泡说明（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderTooltip(input: unknown): string {
  const m = normalizeTooltip(input);
  const classes = [tooltipClass(), 'is-' + m.form]
    .concat(m.extraClass === undefined ? [] : [m.extraClass]).join(' ');
  return '<span class="' + esc(classes) + '" ' + TOOLTIP_ATTR + '="' + esc(m.id) + '">'
    + SKELETONS[m.form](m) + '</span>';
}
