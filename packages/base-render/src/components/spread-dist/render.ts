/** spread-dist · **渲染**（纯函数产 HTML；两档各一支骨架：逐日范围柱／分位尺）。
 *
 *  —— 两档 ——
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
 *   · **刻度与轴域是同一份真值**：每枚纵轴刻度的 `bottom` 与每根柱的 `bottom`／`height` 出自同一个
 *     `upPct()` —— 读者按刻度读一根柱，读到的是这根柱真正的数；
 *   · **色不是唯一信息**：范围条是淡洗的**面**、中位块是实底的**条**（深浅两档形）＋ 图例给字；
 *     分位尺那边正中那一档有**选中面**（软底＋主色字＋主色描边）＋ 它自己那枚档名；
 *   · **本件不带可点元素、不带脚本**：没有 `runtime.ts`；调用方把某一天包成入口时，
 *     件里那条 `:focus-visible` 地板保证焦点看得见（见 `README.md`）。
 */
import { esc } from '../shared/escape.js';
import { SPREAD_DIST_CLASS, spreadDistSlot, type SpreadDistForm } from './attrs.js';
import { normalizeSpreadDist, type SpreadDistModel } from './model.js';

/** 卡头：标题 ＋ 口径那枚 ＋ **从数据算出来**的那句统计。 */
function headHtml(m: SpreadDistModel): string {
  const parts: string[] = ['<div class="' + spreadDistSlot('hd') + '">'];
  parts.push('<h4 class="' + spreadDistSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + spreadDistSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('<span class="' + spreadDistSlot('tail') + '">' + esc(m.tail) + '</span>');
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

/** 形态 → 骨架（分派写在这里，加第三形态就是加一支）。 */
const SKELETONS: Readonly<Record<SpreadDistForm, (m: SpreadDistModel) => string>> = {
  range: renderRange,
  quantile: renderQuantile,
};

/** 渲染分布与分位（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSpreadDist(input: unknown): string {
  const m = normalizeSpreadDist(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SPREAD_DIST_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
