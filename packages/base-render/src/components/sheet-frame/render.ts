/** sheet-frame · **渲染**（本组件对外的形状面之一）。
 *
 *  —— 纸面页框（"整页是一张单据"）——
 *
 *  一句话：把一整页内容放进**一张纸**里——纸面、纸边、可选的两枚撕口（打孔）与页尾裁切线。
 *
 *  它替掉的是哪几种错法（见同目录 README「常见错法」）：
 *   · 每张页各写一套 `background`／`border`／`border-radius`／`box-shadow`（同族页的纸边逐页不同）；
 *   · 拿「卡片」当「纸」：卡片是**页里的块**，纸是**页本身**——两者混用会出现「卡里卡」；
 *   · 撕口／裁切线用图片或伪元素各页自造，且与纸边对不齐。
 *
 *  它**不**管：页头（`renderPageShell`）、来源与口径行（`renderCaliberLine`）、复制区（`renderCopyBlock`）——
 *  这三件的落点与文案归调用方，本件只提供"纸"这一层。
 *
 *  本组件无运行时 ⇒ 无 `attrs.ts`：契约常量与入参类型就住本件（那条目录规矩的用途是
 *  「渲染与运行时共用同一份事实」，没有运行时就没有第二个读者）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText } from '../shared/validate.js';

/** 纸的两种性格：`plain`＝素纸（中性卡片纸，缺省）／`receipt`＝小票纸（暖白、纸边、配撕口与裁切线）。 */
export const SHEET_VARIANTS = ['plain', 'receipt'] as const;
export type SheetVariant = (typeof SHEET_VARIANTS)[number];

/** 纸面页框的入参。 */
export interface SheetFrameInput {
  /** 纸里的正文（**已装配好的标记**，受信透传、不再转义——与 `renderPageShell.content` 同口径）。 */
  readonly content: string;
  /** 纸的性格；缺省 `plain`。 */
  readonly variant?: SheetVariant;
  /** 左右两枚撕口（打孔）；缺省 `false`（素纸不出这两枚）。 */
  readonly notch?: boolean;
  /** 页尾裁切线；缺省 `false`。 */
  readonly cutLine?: boolean;
  /** 版面锚点（页内导航指过来用）；不给＝不带 id。 */
  readonly id?: string;
  /** 版面根附加类名（空格分隔）。 */
  readonly extraClass?: string;
}

/** 纸面页框：一整页的纸张层。`content` 为空串＝出一张空纸（不报错——空页也是一种页）。 */
export function renderSheetFrame(input: SheetFrameInput): string {
  assertPlainObject(input, 'renderSheetFrame: input');
  const variant = input.variant ?? 'plain';
  if (!(SHEET_VARIANTS as readonly string[]).includes(variant)) {
    badInput('sheet-frame: input.variant 必须是 ' + SHEET_VARIANTS.join('／') + ' 之一');
  }
  if (typeof input.content !== 'string') badInput('sheet-frame: input.content 必须是字符串');
  const id = optText(input.id, 'sheet-frame: input.id');
  const extra = optExtraClass(input.extraClass, 'sheet-frame: input.extraClass');
  const parts: string[] = ['<section class="ilife-block-sheet is-' + variant
    + (extra === undefined ? '' : ' ' + extra) + '"'
    + (id === undefined ? '' : ' id="' + esc(id) + '"') + '>'];
  if (input.notch === true) {
    parts.push('<span class="ilife-block-sheet-notch is-left" aria-hidden="true"></span>');
    parts.push('<span class="ilife-block-sheet-notch is-right" aria-hidden="true"></span>');
  }
  parts.push('<div class="ilife-block-sheet-body">' + input.content + '</div>');
  if (input.cutLine === true) parts.push('<div class="ilife-block-sheet-cut" aria-hidden="true"></div>');
  parts.push('</section>');
  return parts.join('');
}
