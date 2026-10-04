/** popover · **渲染**（纯函数产 HTML：触发处 ＋ 贴着它的那张气泡卡片）。
 *
 * 骨架就三样，**顺序固定**：
 *   `<span class="ilife-popover" data-ilife-popover="<id>">`      ← 挂载点（`display:contents`，不生成盒子）
 *     `<button class="<调用方的类> ilife-popover-trigger" popovertarget="<id>">全文`  ← 触发处（原类一字不改）
 *     `<span class="ilife-popover-card" id="<id>" popover="auto">全文`          ← 卡片（顶层，承载全文）
 *
 *  · **触发处是原元素**：调用方把它原来那个元素整条换成 `renderPopoverFullText()` 的产出，
 *    **并把原类名原样传进 `className`**——那条单行省略号规则照旧命中，版面一行不动。
 *    页面侧因此只改「谁产这段标记」这一处，样式一个字不用改。
 *  · **零脚本可开**：触发处带 `popovertarget`，卡片是原生 `popover`（`Esc`／点外面关是浏览器给的）。
 *  · **触发处默认整行可见**：卡片挂上之后、就绪标记打上之前，样式段让触发处折行显示全文
 *    （见 `style/popover.ts` 第一层）⇒ 没脚本也不丢信息。
 *  · 卡片是**纯文本**容器：`textContent` 一份（渲染期用 `esc` 转义一次），全文逐字相同。
 */
import { esc } from '../shared/escape.js';
import {
  POPOVER_ANCHOR_PREFIX, POPOVER_ATTR, POPOVER_CARD_ATTR, POPOVER_CARD_CLASS,
  POPOVER_CLASS, POPOVER_TRIGGER_ATTR, POPOVER_TRIGGER_CLASS,
} from './attrs.js';
import type { PopoverFullTextInput } from './model.js';

/** 缺省无障碍名（三字，是「看全文」这个动作本身，不是新的词）。 */
const DEFAULT_LABEL = '看全文';

/** `id` 只许标识符字符：它同时是面板 `id` 与触发处的 `popovertarget`。 */
const ID_RE = /^[A-Za-z0-9_-]+$/;

/** 入参校验（本组件的错误一律 `BlocksError`，与同族一致；出错时**一个字都不产出**）。 */
function check(input: PopoverFullTextInput): void {
  if (input === null || typeof input !== 'object') {
    throw new Error('popover: 入参必须是对象 { id, text, className?, label? }');
  }
  if (typeof input.id !== 'string' || !ID_RE.test(input.id)) {
    throw new Error('popover: id 必填，且只许标识符字符（字母／数字／下划线／连字符）');
  }
  if (typeof input.text !== 'string') {
    throw new Error('popover: text 必填（全文，纯文本；空串照给，页面自己决定要不要出卡）');
  }
  for (const k of ['className', 'label'] as const) {
    const v = input[k];
    if (v !== undefined && (typeof v !== 'string' || v === '')) {
      throw new Error('popover: ' + k + ' 给了就得是非空字符串');
    }
  }
}

/** 渲染一张承载全文的气泡卡片（同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPopoverFullText(input: PopoverFullTextInput): string {
  check(input);
  const id = input.id;
  const text = esc(input.text);
  const label = esc(input.label === undefined ? DEFAULT_LABEL : input.label);
  const anchor = POPOVER_ANCHOR_PREFIX + id;
  const triggerClass = (input.className === undefined ? '' : esc(input.className) + ' ') + POPOVER_TRIGGER_CLASS;
  return '<span class="' + POPOVER_CLASS + '" ' + POPOVER_ATTR + '="' + esc(id) + '">'
    + '<button type="button" class="' + triggerClass + '"'
    + ' ' + POPOVER_TRIGGER_ATTR
    + ' popovertarget="' + esc(id) + '"'
    + ' popovertargetaction="toggle"'
    + ' aria-expanded="false" aria-label="' + label + '"'
    + ' style="anchor-name:' + esc(anchor) + '">' + text + '</button>'
    + '<span class="' + POPOVER_CARD_CLASS + '" id="' + esc(id) + '"'
    + ' ' + POPOVER_CARD_ATTR + ' popover="auto" role="note" aria-label="' + label + '"'
    + ' style="position-anchor:' + esc(anchor) + '">' + text + '</span>'
    + '</span>';
}
