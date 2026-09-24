/** range-bar · **渲染**（纯函数产 HTML；本件只有形态 A「四类泳道＋行尾合计＋整点刻度」一种骨架）。
 *
 *  —— 形态 A：四类泳道（每类一行）＋行尾合计＋整点刻度 ——
 *
 *  一条轴（两端各一条发丝线），**每类一行**：区间在轨道上的**长度就是"多久"**，
 *  行尾那枚合计是该类的总时长／总天数。段够宽时，段里再写一遍时长字
 *  （窄段不写：写了必然挤成一团或被裁——**时长永远有行尾合计兜底，语义不丢**）。
 *
 *  它替掉的三种错法：
 *   · 只写开始时间（`09:30 开始工作`）——读不出"多长"；
 *   · 用柱子画单点——柱子没有长度，长短差被画成高度差；
 *   · 把区间写成一句「上午工作、下午运动」——起止与时长都要读者自己算。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **轴刻度与泳道共用一张网格**（`display:contents`）⇒ 刻度两端永远对得上轨道两端；
 *   · **段内时长字只在段够宽时上屏**（`RANGE_BAR_TEXT_MIN_FRACTION`），时长另有行尾合计；
 *   · **窄档不横滑**：轨道是份数（`minmax(0,1fr)`），区间是百分比；刻度标签 `flex-wrap` ＋ 8px 列距，
 *     再窄也只换行、不压字。
 */
import { esc } from '../shared/escape.js';
import {
  RANGE_BAR_CLASS,
  RANGE_BAR_FORMS,
  rangeBarSlot,
  type RangeBarForm,
} from './attrs.js';
import {
  normalizeRangeBar,
  rangeBarPercent,
  type RangeBarIntervalModel,
  type RangeBarLaneModel,
  type RangeBarModel,
} from './model.js';

/** 头部那一排：标题 ＋ 用途 ＋ 合计（合计 `margin-left:auto` 顶到右缘，窄档自己折行）。 */
function headHtml(m: RangeBarModel): string {
  const parts: string[] = ['<div class="' + rangeBarSlot('hd') + '">'];
  parts.push('<b class="' + rangeBarSlot('title') + '">' + esc(m.title) + '</b>');
  if (m.use !== undefined) parts.push('<span class="' + rangeBarSlot('use') + '">' + esc(m.use) + '</span>');
  if (m.summary !== undefined) {
    parts.push('<span class="' + rangeBarSlot('sum') + '">'
      + '<i class="' + rangeBarSlot('sum-label') + '">' + esc(m.summary.label) + '</i>'
      + '<b class="' + rangeBarSlot('sum-value') + '">' + esc(m.summary.value) + '</b>'
      + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 轴刻度：**与泳道同一张网格的第二条轨道**（`grid-column:2` 由样式钉住 ⇒ 两端对得上轨道两端）。 */
function axisHtml(axis: readonly string[]): string {
  const ticks = axis.map((t) => '<i>' + esc(t) + '</i>').join('');
  return '<div class="' + rangeBarSlot('ax') + '">'
    + '<span class="' + rangeBarSlot('ax-ticks') + '">' + ticks + '</span></div>';
}

/** 一个区间：位置与长度都是百分比；段里的时长字**只在段够宽时**才在归一化期留下。 */
function intervalHtml(iv: RangeBarIntervalModel): string {
  return '<b class="' + rangeBarSlot('iv') + ' is-l' + String(iv.tone) + '"'
    + ' style="left:' + rangeBarPercent(iv.left) + ';width:' + rangeBarPercent(iv.width) + '">'
    + (iv.text === undefined ? '' : '<u class="' + rangeBarSlot('iv-text') + '">' + esc(iv.text) + '</u>')
    + '</b>';
}

/** 一条泳道：类别名（带记号）／轨道（区间）／行尾合计。 */
function laneHtml(lane: RangeBarLaneModel): string {
  const key = '<span class="' + rangeBarSlot('key') + '">'
    + (lane.mark === undefined ? '' : '<i class="' + rangeBarSlot('mark') + '" aria-hidden="true">' + esc(lane.mark) + '</i>')
    + esc(lane.label) + '</span>';
  const rail = '<div class="' + rangeBarSlot('rail') + '">' + lane.intervals.map(intervalHtml).join('') + '</div>';
  const total = lane.total === undefined ? '' : '<span class="' + rangeBarSlot('total') + '">' + esc(lane.total) + '</span>';
  return '<div class="' + rangeBarSlot('lane') + '">' + key + rail + total + '</div>';
}

/** 形态 A 的骨架。0 条泳道＝空串（与"没内容不留空块"同口径）。 */
function renderLanes(m: RangeBarModel): string {
  if (m.lanes.length === 0) return '';
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + rangeBarSlot('lanes') + '">');
  if (m.axis.length > 0) parts.push(axisHtml(m.axis));
  parts.push(m.lanes.map(laneHtml).join(''));
  parts.push('</div>');
  if (m.note !== undefined) parts.push('<p class="' + rangeBarSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<RangeBarForm, (m: RangeBarModel) => string>> = {
  lanes: renderLanes,
};

/** 渲染区间条（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderRangeBar(input: unknown): string {
  const m = normalizeRangeBar(input);
  const body = SKELETONS[m.form](m);
  if (body === '') return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + RANGE_BAR_CLASS + ' is-' + m.form + extra + '">' + body + '</div>';
}
