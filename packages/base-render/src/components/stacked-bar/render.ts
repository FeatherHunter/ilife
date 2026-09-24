/** stacked-bar · **渲染**（纯函数产 HTML；本件只有形态 A「100% 堆叠 ＋ 图例」一种骨架）。
 *
 *  —— 形态 A：100% 堆叠 ＋ 图例 ——
 *
 *  一整块按占比切成几段：**段宽 ＝ 占比**（行内 `flex` 给千分比整数，各段之和恰好 1000），
 *  够宽的段里直接写读数（≥20% 连名字一起写、≥12% 只写百分数），更窄的段**一个字都不写**、
 *  数字退回图例——段里字少不等于没数。它替掉的三种错法：
 *   · 只给一张占比表 —— 看不出谁占大头（没有"一整块"这个形）；
 *   · 色块没图例 —— 颜色就是全部信息（本件的图例必带数值，段里还有字）；
 *   · 逐项一根独立条 —— 那是 `renderDistributionRows` 的活，看的是"各项各多少"，
 *     不是"一整块怎么分"。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **段宽之和恰好 100%**：`flex` 是千分比整数、末段吃下舍入余数 ⇒ 条永远填满整宽；
 *   · **色不是唯一信息**：段内文字（顺序 ＋ 名字 ＋ 读数）＋ 图例（名字 ＋ 百分数 ＋ 数量）三条同时在；
 *   · 段里塞不下的读数**退回图例**、**不截断**（`…` 与压字都不是本件的做法）。
 */
import { esc } from '../shared/escape.js';
import {
  STACKED_BAR_CLASS,
  STACKED_BAR_FORMS,
  stackedBarSlot,
  type StackedBarForm,
} from './attrs.js';
import { normalizeStackedBar, type StackedBarModel, type StackedBarSegmentModel } from './model.js';

/** 一段：行内 `flex` ＝ 这一段的千分比（`grow shrink basis`），段里那行读数够宽才出。 */
function segmentHtml(seg: StackedBarSegmentModel): string {
  const parts: string[] = ['<span class="' + stackedBarSlot('seg') + ' is-k' + String(seg.series)
    + ' is-' + seg.labelKind + '" style="flex: ' + String(seg.flex) + ' 1 0">'];
  if (seg.labelKind !== 'none') {
    parts.push('<b class="' + stackedBarSlot('seg-text') + '">' + esc(seg.label) + '</b>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 图例：逐行「色块 ｜ 名字 ｜ 百分数 ｜ 数量」——**数字必带**（色只是第二次提醒）。 */
function legendHtml(m: StackedBarModel): string {
  const parts: string[] = ['<ul class="' + stackedBarSlot('legend') + '">'];
  for (const seg of m.segments) {
    parts.push('<li class="' + stackedBarSlot('legend-item') + '">');
    parts.push('<i class="' + stackedBarSlot('swatch') + ' is-k' + String(seg.series) + '" aria-hidden="true"></i>');
    parts.push('<span class="' + stackedBarSlot('name') + '">' + esc(seg.name) + '</span>');
    parts.push('<span class="' + stackedBarSlot('pct') + '">' + esc(seg.pctText) + '</span>');
    parts.push('<span class="' + stackedBarSlot('amount') + '">'
      + esc(seg.valueText + (m.unit === undefined ? '' : ' ' + m.unit)) + '</span>');
    parts.push('</li>');
  }
  parts.push('</ul>');
  return parts.join('');
}

/** 形态 A 的骨架：卡头 → 构成条 → 图例 → 脚注。 */
function renderStack(m: StackedBarModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + stackedBarSlot('hd') + '">');
  parts.push('<h4 class="' + stackedBarSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + stackedBarSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('</div>');
  /* 整条构成是**一张图**：读屏拿到 aria-label 里那句逐段读数，图例是给眼睛的第二条通路。 */
  parts.push('<div class="' + stackedBarSlot('bar') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">'
    + m.segments.map(segmentHtml).join('') + '</div>');
  parts.push(legendHtml(m));
  if (m.note !== undefined) {
    parts.push('<p class="' + stackedBarSlot('note') + '">' + esc(m.note) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<StackedBarForm, (m: StackedBarModel) => string>> = {
  stack: renderStack,
};

/** 渲染构成条（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderStackedBar(input: unknown): string {
  const m = normalizeStackedBar(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + STACKED_BAR_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
