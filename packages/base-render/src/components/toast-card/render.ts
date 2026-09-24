/** toast-card · **渲染**（纯函数产 HTML；零 DOM、零内联脚本、零内联事件处理器）。
 *
 *  一条提示的骨架（**固定**，没有第二形态）：
 *
 *  ```
 *  [竖条] [图标底盘]  语气字·标题            [动作键] [关闭键]
 *                     一句细节
 *  ```
 *
 *  它替掉的三种错法：
 *   · **状态只剩一个色** —— 换到把警告色压成墨黑的皮肤（大字报刊的强调色就是墨黑），开合与成败就丢了；
 *   · **深浅两套语言下的外来户** —— 深色盒子在暖纸与大字报刊里像插进来的；
 *   · **关键信息只活在会自动消失的浮层里** —— 危险档说不出细节的，本件在 `model.ts` 就拒了。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 语气档同时给**竖条粗细 ＋ 图标字形 ＋ 语气字**三样，色只是第三样；
 *   · 结构里**至多一个动作**（入参面守住：`action` 是一个对象，数组一律拒）；
 *   · 自动消失的时长进 `data-*`（运行时段按它给每条独立计时，最长 5 秒）。
 */
import { esc } from '../shared/escape.js';
import {
  TOAST_CARD_ACTION_ATTR,
  TOAST_CARD_CLASS,
  TOAST_CARD_CLOSE_ATTR,
  TOAST_CARD_CLOSE_GLYPH,
  TOAST_CARD_DURATION_ATTR,
  TOAST_CARD_ITEM_ATTR,
  TOAST_CARD_MAX_ATTR,
  TOAST_CARD_STACK_ATTR,
  TOAST_CARD_TONE_ATTR,
  toastCardSlot,
} from './attrs.js';
import { normalizeToastCard, normalizeToastCardStack, type ToastCardModel } from './model.js';

/** 动作与关闭那一排（动作键只有给了 `action` 才出）。 */
function toolHtml(m: ToastCardModel): string {
  const parts: string[] = ['<div class="' + toastCardSlot('tool') + '">'];
  if (m.action !== undefined) {
    parts.push('<button class="' + toastCardSlot('action') + '" type="button" '
      + TOAST_CARD_ACTION_ATTR + '="' + esc(m.action.id) + '">' + esc(m.action.label) + '</button>');
  }
  /* 关闭键：字形是装饰（`aria-hidden`），可读名字由 `aria-label` 给。 */
  parts.push('<button class="' + toastCardSlot('close') + '" type="button" '
    + TOAST_CARD_CLOSE_ATTR + '="" aria-label="' + esc(m.closeLabel) + '">'
    + '<span aria-hidden="true">' + esc(TOAST_CARD_CLOSE_GLYPH) + '</span></button>');
  parts.push('</div>');
  return parts.join('');
}

/** 渲染**一条**提示（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。
 *
 *  入参面（`ToastCardInput`）见同目录 `README.md`；非法入参一律抛 `BlocksError`。
 *  形参声明成 `unknown` 是本层七件的既有口径（先过校验器、再把类型收窄），
 *  公开入参类型就叫 `ToastCardInput`。 */
export function renderToastCard(input: unknown): string {
  const m = normalizeToastCard(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const parts: string[] = ['<div class="' + TOAST_CARD_CLASS + ' is-' + m.tone + extra + '"'
    + ' ' + TOAST_CARD_ITEM_ATTR + '=""'
    + ' ' + TOAST_CARD_TONE_ATTR + '="' + esc(m.tone) + '"'
    + ' ' + TOAST_CARD_DURATION_ATTR + '="' + esc(String(m.durationMs)) + '"'
    + ' role="' + esc(m.role) + '" aria-live="' + esc(m.live) + '">'];
  parts.push('<span class="' + toastCardSlot('icon') + '" aria-hidden="true">' + esc(m.glyph) + '</span>');
  parts.push('<div class="' + toastCardSlot('body') + '">');
  parts.push('<p class="' + toastCardSlot('head') + '">'
    + '<span class="' + toastCardSlot('tone') + '">' + esc(m.toneWord) + '</span>'
    + '<b class="' + toastCardSlot('title') + '">' + esc(m.title) + '</b></p>');
  if (m.detail !== undefined) {
    parts.push('<p class="' + toastCardSlot('detail') + '">' + esc(m.detail) + '</p>');
  }
  parts.push('</div>');
  parts.push(toolHtml(m));
  parts.push('</div>');
  return parts.join('');
}

/** 渲染**堆栈**（宿主席位）：一条提示都还没有的空容器，页面把 `renderToastCard()` 的产出往里放，
 *  运行时段负责计时与「最多 3 条」。
 *
 *  **位置与宽度归页面**：本件不写 `position`（浮在底部、右下角还是嵌在面板里，是页面的决定）；
 *  这也让宽度只判容器——`position: fixed` 的量法会听视口，与「件的宽度」无关。 */
export function renderToastCardStack(input?: unknown): string {
  const m = normalizeToastCardStack(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + toastCardSlot('stack') + extra + '"'
    + ' ' + TOAST_CARD_STACK_ATTR + '=""'
    + ' ' + TOAST_CARD_MAX_ATTR + '="' + esc(String(m.max)) + '"></div>';
}
