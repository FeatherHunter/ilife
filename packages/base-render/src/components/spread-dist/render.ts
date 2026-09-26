/** spread-dist · **渲染**（纯函数产 HTML；三个骨架各一支：箱线／逐日范围柱／分位尺）。
 *
 *  —— 三档 ——
 *   · `box`    一行一组，同一把尺子横着量：箱体＝P25 到 P75、粗线＝中位、须＝两端、圈＝离群点，
 *              样本不足的组只把每一笔点在尺子上；
 *   · `range`  每天都摊成一根从最低到最高的竖条，中间的粗块是中位数，横轴是日子，纵轴是同一个读数；
 *   · `quantile` 结论一句话在上，下面一档一格写着「分位名 ＋ 说明句 ＋ 那个数」，正中那一档是中位。
 *  它替掉的两种错法：
 *   · 只给一个平均值 —— 离群点被抹平，读不出「中间那批落在哪」；
 *   · 用一张条形图硬扛分布 —— 一根柱只表示一个数，那是「几个值的对比」，不是一批读数的形状。
 *
 *  四条硬口径（判据断的就是它们）：
 *   · **算数不在这里**：轴域、刻度文字与刻度位置、每根条与每个中位块的百分比、卡头那句统计、
 *     口径句与无障碍名都在 `forms.ts` 算好；这一支只把**算出来的百分比**写进行内样式
 *     （一条记录一个数），静态规则一律住 `style.ts`；
 *   · **刻度与轴域是同一份真值**：每枚刻度的位置与每根条／箱体／点的位置出自同一个 `upPct()`
 *     —— 读者按刻度读一根柱（或量一行箱体），读到的是它真正的数；
 *   · **色不是唯一信息**：范围条是淡洗的**面**、中位块是实底的**条**（深浅两档形）＋ 图例给字；
 *     箱线那边箱体是**面**、中位是**粗线**、离群是**空心圈**、单笔是**实心点**（四种形）；
 *     分位尺那边正中那一档有**选中面**（软底＋主色字＋主色描边）＋ 它自己那枚档名；
 *   · **本件不带可点元素、不带脚本**：没有 `runtime.ts`；调用方把某一天包成入口时，
 *     件里那条 `:focus-visible` 地板保证焦点看得见（见 `README.md`）。
 */
import { esc } from '../shared/escape.js';
import { SPREAD_DIST_CLASS, spreadDistSlot, type SpreadDistForm } from './attrs.js';
import { normalizeSpreadDist, type SpreadDistModel } from './model.js';

/** 卡头：标题 ＋ 口径那枚 ＋ **从数据算出来**的那句统计（A 档那一位是单位）。 */
function headHtml(m: SpreadDistModel): string {
  const parts: string[] = ['<div class="' + spreadDistSlot('hd') + '">'];
  parts.push('<h4 class="' + spreadDistSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + spreadDistSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  if (m.tail !== undefined) {
    parts.push('<span class="' + spreadDistSlot('tail') + '">' + esc(m.tail) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 图例：每一项是「形 ＋ 字」——形由 `is-*` 给，字说清那是什么（形不是唯一信息）。 */
function legendHtml(m: SpreadDistModel): string {
  if (m.legend.length === 0) return '';
  return '<ul class="' + spreadDistSlot('legend') + '">'
    + m.legend.map((one) => '<li class="' + spreadDistSlot('legend-item') + '">'
      + '<i class="' + spreadDistSlot('legend-mark') + ' is-' + one.kind + '" aria-hidden="true"></i>'
      + esc(one.text) + '</li>').join('')
    + '</ul>';
}

/** 脚注一句人话（不给就用本形态的口径句）。 */
function noteHtml(m: SpreadDistModel): string {
  return '<p class="' + spreadDistSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 形态 `range`：坐标框（纵轴刻度列 ‖ 逐日柱区）＋ 横轴日子行 → 图例 → 脚注。 */
function renderRange(m: SpreadDistModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + spreadDistSlot('plotbox') + '">');
  /* 纵轴刻度列：每枚**绝对定位在它自己那个值的位置上**（`bottom` 是算出来的百分比，与柱子同一个映射），
     故刻度文字与柱子读数永远对得上；只有最高那一枚带单位。 */
  parts.push('<div class="' + spreadDistSlot('yticks') + '" aria-hidden="true">'
    + m.yTicks.map((t) => '<span class="' + spreadDistSlot('ytick') + '" style="bottom: '
      + String(t.bottomPct) + '%">' + esc(t.text) + '</span>').join('')
    /* 隐形撑子：各枚刻度绝对定位后列里没有在流内容，列宽会塌成 0（刻度被 0 宽压成细条、悬到框外）。
       它与刻度同字、逐行一份，只撑列宽（`visibility: hidden`，另见 `style.ts`）。 */
    + '<span class="' + spreadDistSlot('yticks-sizer') + '">'
    + m.yTicks.map((t) => esc(t.text)).join('<br>') + '</span>'
    + '</div>');
  parts.push('<div class="' + spreadDistSlot('days') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  for (const day of m.days) {
    parts.push('<span class="' + spreadDistSlot('day') + '" title="' + esc(day.title) + '">');
    parts.push('<i class="' + spreadDistSlot('day-range') + '" aria-hidden="true" style="bottom: '
      + String(day.bottomPct) + '%; height: ' + String(day.heightPct) + '%"></i>');
    if (day.medianPct !== null) {
      parts.push('<i class="' + spreadDistSlot('day-median') + '" aria-hidden="true" style="bottom: '
        + String(day.medianPct) + '%"></i>');
    }
    parts.push('</span>');
  }
  parts.push('</div>');
  parts.push('<div class="' + spreadDistSlot('xax') + '" aria-hidden="true">'
    + m.xLabels.map((t) => '<span class="' + spreadDistSlot('xlabel') + '">' + esc(t) + '</span>').join('')
    + '</div>');
  parts.push('</div>');
  parts.push(legendHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 `quantile`：**结论一句话在上、读数在下**（先给答案，再给读数）→ 脚注。 */
function renderQuantile(m: SpreadDistModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<p class="' + spreadDistSlot('lead') + '">' + esc(m.lead) + '</p>');
  parts.push('<div class="' + spreadDistSlot('stops') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  for (const stop of m.stops) {
    parts.push('<div class="' + spreadDistSlot('stop') + (stop.median ? ' is-median' : '') + '">');
    parts.push('<span class="' + spreadDistSlot('stop-name') + '">' + esc(stop.name) + '</span>');
    if (stop.label !== '') {
      parts.push('<span class="' + spreadDistSlot('stop-label') + '">' + esc(stop.label) + '</span>');
    }
    parts.push('<b class="' + spreadDistSlot('stop-value') + '">' + esc(stop.valueText) + '</b>');
    parts.push('</div>');
  }
  parts.push('</div>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 `box`：**一行一组、同一把尺子横着量** —— 行区（贯穿的网格线 ＋ 逐行轨道）→ 尺子 → 图例 → 脚注。 */
function renderBox(m: SpreadDistModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + spreadDistSlot('groups') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  /* 贯穿整个行区的竖向网格线：**每一枚刻度一根**（位置与尺子上那枚刻度是同一个算出来的百分比）
     —— 四行叠起来读成一把从顶贯到底的尺子，而不是每行各自的碎段。
     首末两根贴端（`is-first`／`is-last`）：挪半个／一个自身宽度，容器一根毫毛都不多长。 */
  parts.push('<span class="' + spreadDistSlot('grid') + '" aria-hidden="true">'
    + m.rulerTicks.map((t, i) => '<i class="' + spreadDistSlot('grid-line')
      + (i === 0 ? ' is-first' : '') + (i === m.rulerTicks.length - 1 ? ' is-last' : '')
      + '" style="left: ' + String(t.leftPct) + '%"></i>').join('')
    + '</span>');
  for (const g of m.groups) {
    parts.push('<div class="' + spreadDistSlot('group') + '">');
    /* 行头**一行一档字号**：组名／笔数／中位同行同号（同屏只留一层话）。 */
    parts.push('<span class="' + spreadDistSlot('group-hd') + '">'
      + '<b class="' + spreadDistSlot('group-name') + '">' + esc(g.label) + '</b>'
      + '<span class="' + spreadDistSlot('group-count') + '">' + esc(g.countText) + '</span>'
      + '<span class="' + spreadDistSlot('group-median') + '">' + esc(g.medianText) + '</span>'
      + '</span>');
    parts.push('<span class="' + spreadDistSlot('track') + '" title="' + esc(g.title) + '">');
    parts.push('<i class="' + spreadDistSlot('rail') + '" aria-hidden="true"></i>');
    if (g.whiskerPct !== null) {
      parts.push('<i class="' + spreadDistSlot('whisker') + '" aria-hidden="true" style="left: '
        + String(g.whiskerPct.leftPct) + '%; width: ' + String(g.whiskerPct.widthPct) + '%"></i>');
    }
    if (g.boxPct !== null) {
      parts.push('<i class="' + spreadDistSlot('box') + '" aria-hidden="true" style="left: '
        + String(g.boxPct.leftPct) + '%; width: ' + String(g.boxPct.widthPct) + '%"></i>');
    }
    parts.push('<i class="' + spreadDistSlot('median') + '" aria-hidden="true" style="left: '
      + String(g.medianPct) + '%"></i>');
    for (const o of g.outliersPct) {
      parts.push('<i class="' + spreadDistSlot('outlier') + '" aria-hidden="true" style="left: '
        + String(o) + '%"></i>');
    }
    for (const p of g.pointsPct) {
      parts.push('<i class="' + spreadDistSlot('point') + '" aria-hidden="true" style="left: '
        + String(p) + '%"></i>');
    }
    parts.push('</span>');
    parts.push('</div>');
  }
  parts.push('</div>');
  /* 尺子（在四行下面只画这一把）：一根通栏线 ＋ 每枚刻度一根竖线 ＋ 贴在它位置上的那个值
     （首末两枚贴端，故容器不会被那两枚顶出横溢）。 */
  parts.push('<div class="' + spreadDistSlot('ruler') + '" aria-hidden="true">'
    + m.rulerTicks.map((t, i) => '<i class="' + spreadDistSlot('tick')
      + (i === 0 ? ' is-first' : '') + (i === m.rulerTicks.length - 1 ? ' is-last' : '')
      + '" style="left: ' + String(t.leftPct) + '%"></i>'
      + '<b class="' + spreadDistSlot('tick-value') + (i === 0 ? ' is-first' : '')
      + (i === m.rulerTicks.length - 1 ? ' is-last' : '') + '" style="left: ' + String(t.leftPct) + '%">'
      + esc(t.text) + '</b>').join('')
    + '</div>');
  parts.push(legendHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第四形态就是加一支）。 */
const SKELETONS: Readonly<Record<SpreadDistForm, (m: SpreadDistModel) => string>> = {
  range: renderRange,
  quantile: renderQuantile,
  box: renderBox,
};

/** 渲染分布与分位（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSpreadDist(input: unknown): string {
  const m = normalizeSpreadDist(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SPREAD_DIST_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
