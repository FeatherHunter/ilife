/** small-multiples · **渲染**（纯函数产 HTML；本件只有一档骨架：期间并排迷你柱阵 ＋ 均值线）。
 *
 *  —— 这一档 ——
 *  同一个读数的若干**期间并排**成一根一根迷你柱（共用一套归一化刻度，横着比相对高低），
 *  一条虚线给出这几期的均值，每根柱下面写着那一期的绝对读数。
 *  它替掉的两种错法：
 *   · 把 N 段拼成一张多线图 —— 线全缠在一起，谁是谁看不出来；
 *   · 只给最后一期 —— 看不出这一段在涨还是在跌。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **算数不在这里**：柱高百分比、均值、每根柱下面那枚读数、口径句与无障碍名都在 `model.ts` 算好；
 *     这一支只把**算出来的那几个百分比**写进行内样式（一条记录一个数），静态规则一律住 `style.ts`；
 *   · **色不是唯一信息**：均值线是虚线（线型）＋ 线上写着「均值 …」（标注）＋ 卡头那句再说一遍（字）；
 *     本期那一列是贯穿柱阵的竖标（形）＋ 轴上写着「本期」（字）＋ 强调色（色）——三样同时在；
 *   · **期间名与读数永不 `…` 截断**：它们是这一列的坐标与这一期的绝对量，长了换行（样式里给
 *     `overflow-wrap: anywhere`，且全件没有 `text-overflow`／`line-clamp`）。
 */
import { esc } from '../shared/escape.js';
import { SMALL_MULTIPLES_CLASS, SMALL_MULTIPLES_NOW_LABEL, smallMultiplesSlot } from './attrs.js';
import { normalizeSmallMultiples, type SmallMultiplesModel } from './model.js';

/** 卡头：标题 ＋ 期间范围 ＋ **从数据算出来**的那句（虚线是什么）。 */
function headHtml(m: SmallMultiplesModel): string {
  const parts: string[] = ['<div class="' + smallMultiplesSlot('hd') + '">'];
  parts.push('<h4 class="' + smallMultiplesSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + smallMultiplesSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('<span class="' + smallMultiplesSlot('tail') + '">' + esc(m.tail) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 柱阵区：均值线（先出＝在柱下面）＋ 逐列一根柱。 */
function colsHtml(m: SmallMultiplesModel): string {
  const parts: string[] = ['<div class="' + smallMultiplesSlot('cols') + '" role="img" aria-label="'
    + esc(m.ariaLabel) + '">'];
  /* 均值线：`bottom` 是**算出来的**百分比（把**未量化**的均值当读数喂进同一个映射）；线型＝虚线、线上有字。
     `is-under` ＝「线在刻度中线之上 ⇒ 那枚标注画到**线下**」——标注朝柱阵里长，四条边才不出框。 */
  parts.push('<span class="' + smallMultiplesSlot('mean') + (m.meanUnder ? ' is-under' : '')
    + '" aria-hidden="true" style="bottom: ' + String(m.meanPct) + '%">');
  parts.push('<b class="' + smallMultiplesSlot('mean-label') + '">' + esc(m.meanText) + '</b>');
  parts.push('</span>');
  for (const bar of m.bars) {
    parts.push('<span class="' + smallMultiplesSlot('col') + (bar.now ? ' is-now' : '')
      + '" aria-hidden="true">');
    parts.push('<i class="' + smallMultiplesSlot('bar') + '" style="height: ' + String(bar.heightPct)
      + '%"></i>');
    parts.push('</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 横轴标签行：与柱阵**同一份列数与同一份间距**（纯 CSS 等分），故永远对着它那一根柱。 */
function xaxHtml(m: SmallMultiplesModel): string {
  const parts: string[] = ['<ul class="' + smallMultiplesSlot('xax') + '">'];
  for (const tick of m.ticks) {
    parts.push('<li class="' + smallMultiplesSlot('xlabel') + (tick.now ? ' is-now' : '') + '">');
    parts.push('<b class="' + smallMultiplesSlot('xperiod') + '">' + esc(tick.label) + '</b>');
    parts.push('<em class="' + smallMultiplesSlot('xvalue') + '">' + esc(tick.value) + '</em>');
    if (tick.now) {
      parts.push('<i class="' + smallMultiplesSlot('nowmark') + '">' + esc(SMALL_MULTIPLES_NOW_LABEL) + '</i>');
    }
    parts.push('</li>');
  }
  parts.push('</ul>');
  return parts.join('');
}

/** 渲染小倍数面板（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSmallMultiples(input: unknown): string {
  const m = normalizeSmallMultiples(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SMALL_MULTIPLES_CLASS + ' is-' + m.form + extra + '">'
    + headHtml(m) + colsHtml(m) + xaxHtml(m)
    + '<p class="' + smallMultiplesSlot('note') + '">' + esc(m.note) + '</p>'
    + '</div>';
}
