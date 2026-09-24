/** stat-inline · **渲染**（纯函数产 HTML；本件只有形态 A「分隔点行内串」一种骨架）。
 *
 *  —— 形态 A：分隔点行内串（可折行）——
 *
 *  骨架：根 `<div class="… is-dots">` → 逐项 `<span class="…-item">`（`label` ＋ `<b class="…-value">值</b>` ＋ `unit`）
 *  → 项与项之间一枚 `<span class="…-sep" aria-hidden="true">·</span>`。
 *
 *  它替掉的两种错法：
 *   · 把「合计 ¥2,140.00」拆成两行 —— 数值与它的标签分家，读者把数配错标签；
 *   · 一行太长就 `overflow:hidden` 或 `…` 截断 —— 小结行、表头、脚注最经不起截断（那是结论位）。
 *
 *  两条硬口径（判据断的就是它们）：
 *   · **每一项恒不换行**（`nowrap`）：窄档整行折行，但项内不分家；
 *   · **缺值写成 `—`**（值里给 `—`，本件不给任何占位默认值）。
 */
import { esc } from '../shared/escape.js';
import {
  STAT_INLINE_CLASS,
  STAT_INLINE_SEP,
  statInlineSlot,
  type StatInlineForm,
  type StatInlineInput,
  type StatInlineSlot,
} from './attrs.js';
import { normalizeStatInline, type StatInlineModel } from './model.js';

/** 一项：标签（可省）＋ 值（主角）＋ 字尾（可省）。三枚都在同一个 **nowrap** 的单元里。 */
function itemHtml(item: StatInlineModel['items'][number], slot: (s: 'item' | 'label' | 'value') => string): string {
  const parts: string[] = ['<span class="' + slot('item') + '">'];
  if (item.label !== undefined) parts.push('<span class="' + slot('label') + '">' + esc(item.label) + '</span>');
  parts.push('<b class="' + slot('value') + '">' + esc(item.value) + '</b>');
  if (item.unit !== undefined) parts.push('<span class="' + slot('label') + '">' + esc(item.unit) + '</span>');
  parts.push('</span>');
  return parts.join('');
}

/** 形态键 → 形态类名（**闭集里那一格**；`Record<StatInlineForm, …>` 让"加了形态却忘了补类名"当场红）。 */
const FORM_SLOTS: Readonly<Record<StatInlineForm, StatInlineSlot>> = Object.freeze({
  dots: 'form-dots',
});

/** 形态 A 的骨架。分隔点**逐缝一枚**、`aria-hidden`（读屏听到的是三段完整的话，不是逗号）。 */
function renderDots(m: StatInlineModel): string {
  const slot = (s: 'item' | 'label' | 'value' | 'sep'): string => statInlineSlot(s);
  const parts: string[] = ['<div class="' + STAT_INLINE_CLASS + ' ' + statInlineSlot(FORM_SLOTS[m.form])
    + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'];
  for (let i = 0; i < m.items.length; i += 1) {
    if (i > 0 && m.interpunct) {
      parts.push('<span class="' + slot('sep') + '" aria-hidden="true">' + esc(STAT_INLINE_SEP) + '</span>');
    }
    parts.push(itemHtml(m.items[i], slot));
  }
  parts.push('</div>');
  return parts.join('');
}

const RENDERERS: Readonly<Record<StatInlineForm, (m: StatInlineModel) => string>> = Object.freeze({
  dots: renderDots,
});

/** 行内读数：一句里嵌几个数。纯函数产标记，零 DOM。
 *  `items` 为空时返回空串（**空串只会在页面上留一条空线**）。 */
export function renderStatInline(input: StatInlineInput): string {
  const m = normalizeStatInline(input);
  if (m.items.length === 0) return '';
  const render = RENDERERS[m.form];
  return render(m);
}
