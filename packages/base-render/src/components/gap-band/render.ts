/** gap-band · **渲染**（纯函数产 HTML；两档各一支骨架：连续差值带／每日偏差柱）。
 *
 *  —— 两档 ——
 *   · `band`  整块一张 SVG：带子是实际折线去、计划线回的那块面积（两端连成一片，
 *     不按天切）；实际线是 2px 真折线，计划线是穿通整块的 2px 虚线 ＋ 右端那枚标注；
 *     最深与最高两处各挂一枚图内锚点，底部一行是净差；
 *   · `deviation` 零位线就是目标，一天的柱朝上＝超了、朝下＝还差，柱上数字一律带符号，
 *     底部一行是累计净差。
 *  它替掉的两种错法：
 *   · 把两根线画在一起、要靠眼睛量间距 —— 带子朝哪边、ata多宽就是谁多、差多少；
 *   · 只报一个总达成率 —— 说不出哪几天超了。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **算数不在这里**：轴域、刻度文字、计划线位置、SVG 坐标串、锚点位置、柱高百分比、
 *     卡头那句、口径句与无障碍名都在 `forms.ts` 算好；这一支只把**算出来的数**写进行内样式
 *     （一条记录一个数），静态规则一律住 `style.ts`；
 *   · **刻度与轴域是同一份真值**：计划线的 `top`、折线每个顶点的纵坐标、带子多边形
 *     出自同一个 `topPct()` —— 读者按刻度读线，读到的是线真正的数；
 *   · **色不是唯一信息**：实际线是实线、计划线是虚线 ＋ 右端写着计划值（线型 ＋ 标注）；
 *     偏差柱朝上还是朝下（方向）＋ 柱上数字的正负号（字）＋ 图例给字 —— 三样同时在；
 *   · **本件不带可点元素、不带脚本**：没有 `runtime.ts`；调用方把某一天包成入口时，
 *     件里那条 `:focus-visible` 地板保证焦点看得见（见 `README.md`）。
 */
import { esc } from '../shared/escape.js';
import { GAP_BAND_CLASS, gapBandSlot, type GapBandForm } from './attrs.js';
import {
  normalizeGapBand,
  type GapBandBandModel,
  type GapBandDevModel,
  type GapBandLegendItem,
  type GapBandModel,
} from './model.js';

/** 卡头：标题 ＋ 口径那枚 ＋ 计划／朝向那句。 */
function headHtml(m: GapBandBandModel | GapBandDevModel): string {
  const parts: string[] = ['<div class="' + gapBandSlot('hd') + '">'];
  parts.push('<h4 class="' + gapBandSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + gapBandSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('<span class="' + gapBandSlot('tail') + '">' + esc(m.tail) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 图例：每一项是「形 ＋ 字」——形由 `is-*` 给，字说清线型与方向（形不是唯一信息）。 */
function legendHtml(legend: readonly GapBandLegendItem[]): string {
  return '<ul class="' + gapBandSlot('legend') + '">'
    + legend.map((one) => '<li class="' + gapBandSlot('legend-item') + '">'
      + '<i class="' + gapBandSlot('legend-mark') + ' is-' + one.kind + '" aria-hidden="true"></i>'
      + esc(one.text) + '</li>').join('')
    + '</ul>';
}

/** 净差行：主值一档大字、说明一档灰字（原型定稿版底部那一行）。 */
function sumHtml(m: GapBandBandModel | GapBandDevModel): string {
  return '<div class="' + gapBandSlot('sum') + '">'
    + '<b class="' + gapBandSlot('sumvalue') + '">' + esc(m.sumText) + '</b>'
    + '<span class="' + gapBandSlot('sumdesc') + '">' + esc(m.sumDesc) + '</span>'
    + '</div>';
}

/** 脚注一句人话（不给就用本形态的口径句）。 */
function noteHtml(m: GapBandBandModel | GapBandDevModel): string {
  return '<p class="' + gapBandSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 形态 `band`：坐标框（纵轴刻度列 ‖ 差值图区）＋ 横轴日子行 → 净差 → 图例 → 脚注。 */
function renderBand(m: GapBandBandModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + gapBandSlot('plotbox') + '">');
  /* 纵轴刻度列：枚数与文字由同一份轴域出；**每枚绝对定位在它自己那个值的位置上**
     （`bottom` 是算出来的百分比，与计划线、折线顶点、带子多边形同一支映射）。
     末一枚隐形撑子：各枚绝对定位后列里没有在流内容，列宽会塌成 0（刻度被 0 宽压扁、悬到框外）,
     它与刻度同字逐行一份，只撑列宽（`visibility: hidden`，见 `style.ts`）。 */
  parts.push('<div class="' + gapBandSlot('yticks') + '" aria-hidden="true">'
    + m.ticks.map((t) => '<span class="' + gapBandSlot('ytick') + '" style="bottom: '
      + String(t.bottomPct) + '%">' + esc(t.text) + '</span>').join('')
    + '<span class="' + gapBandSlot('yticks-sizer') + '">'
    + m.ticks.map((t) => esc(t.text)).join('<br>') + '</span>'
    + '</div>');
  /* 差值图区：一张 SVG（面积 ＋ 折线，不按天切）＋ 穿通整块的计划线 ＋ 两枚图内锚点。 */
  parts.push('<div class="' + gapBandSlot('plot') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  parts.push('<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
    + '<polygon class="' + gapBandSlot('band') + '" points="' + m.bandPoints + '"></polygon>'
    + '<polyline class="' + gapBandSlot('line') + '" points="' + m.linePoints + '"></polyline>'
    + '</svg>');
  parts.push('<span class="' + gapBandSlot('plan') + '" aria-hidden="true" style="top: '
    + String(m.planTopPct) + '%"><b class="' + gapBandSlot('planlabel') + '">' + esc(m.planText)
    + '</b></span>');
  for (const a of m.anchors) {
    /* 横坐标走 `--ax`（样式里按**列心**收边）；纵向按锚点**朝哪边长**给不同的那一支：
       高处那枚从点的位置往下长，给 `--at`（样式里落成 `top`）；低处两枚往上长，直接给 `bottom`。
       两支的盒子都由样式的 `max-height` 与 `overflow` 收在图区内（见 `style.ts` 的锚点那一段）。 */
    const pos = a.kind === 'hi'
      ? '--ax: ' + String(a.leftPct) + '%; --at: ' + String(a.topPct) + '%'
      : '--ax: ' + String(a.leftPct) + '%; bottom: ' + String(a.bottomPct) + '%';
    parts.push('<span class="' + gapBandSlot('anchor') + ' is-' + a.kind + '" aria-hidden="true" style="'
      + pos + '"><b>' + esc(a.day) + '</b><em>' + esc(a.diff) + '</em></span>');
  }
  parts.push('</div>');
  /* 横轴日子行：与差值图区同一份等分（`flex: 1 1 0` ＋ 零间距）⇒ 每枚日子对着折线上它那个点。 */
  parts.push('<div class="' + gapBandSlot('xax') + '" aria-hidden="true">'
    + m.xLabels.map((t) => '<span class="' + gapBandSlot('xlabel') + '"><b class="'
      + gapBandSlot('xday') + '">' + esc(t.day) + '</b><em class="'
      + gapBandSlot('xvalue') + '">' + esc(t.valueText) + '</em></span>').join('')
    + '</div>');
  parts.push('</div>');
  parts.push(sumHtml(m));
  parts.push(legendHtml(m.legend));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 `deviation`：偏差柱区（零位线横贯）＋ 横轴日子行 → 净差 → 图例 → 脚注。 */
function renderDeviation(m: GapBandDevModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + gapBandSlot('cols') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  for (const bar of m.bars) {
    /* 柱从零位线起画：朝上＝`bottom: 50%`，朝下＝`top: 50%`；柱上那个数贴着柱顶（底）长。 */
    const geom = bar.up
      ? 'bottom: 50%; height: ' + String(bar.heightPct) + '%'
      : 'top: 50%; height: ' + String(bar.heightPct) + '%';
    parts.push('<span class="' + gapBandSlot('col') + '" title="' + esc(bar.title) + '">');
    parts.push('<i class="' + gapBandSlot('bar') + (bar.up ? ' is-up' : ' is-down')
      + '" aria-hidden="true" style="' + geom + '"><b class="' + gapBandSlot('barvalue') + '">'
      + esc(bar.devText) + '</b></i>');
    parts.push('</span>');
  }
  /* 零位线画在列**之后**：它是绝对定位的 `<i>`、不占 flex 轨道，而列是 `<span>` —— 于是
     `.col:first-of-type`／`:last-of-type` 数到的就是第 1 列与末列（贴边规则那条选择器）。 */
  parts.push('<i class="' + gapBandSlot('zero') + '" aria-hidden="true"></i>');
  parts.push('</div>');
  parts.push('<div class="' + gapBandSlot('xax') + '" aria-hidden="true">'
    + m.bars.map((bar) => '<span class="' + gapBandSlot('xlabel') + '">' + esc(bar.label) + '</span>').join('')
    + '</div>');
  parts.push(sumHtml(m));
  parts.push(legendHtml(m.legend));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第三形态就是加一支）。 */
const SKELETONS: Readonly<Record<GapBandForm, (m: GapBandModel) => string>> = {
  band: (m) => renderBand(m as GapBandBandModel),
  deviation: (m) => renderDeviation(m as GapBandDevModel),
};

/** 渲染差值带（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderGapBand(input: unknown): string {
  const m = normalizeGapBand(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + GAP_BAND_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
