/** scatter-fit · **渲染**（纯函数产 HTML；三个形态各一支骨架：散点／分箱／滞后）。
 *
 *  —— 三个形态 ——
 *   · `scatter` 点是一片云、趋势是一条线、带子是大概率的范围；
 *   · `bin` 按横轴分箱，每箱一根竖条（下四分位到上四分位）＋ 中间一根粗线（中位数）；
 *   · `lag` 逐档一根条，从中线往左或往右（负号＝方向相反），最强那档再写一遍字。
 *  它替掉的两种错法：
 *   · 只给一个相关系数 —— 看不出是结构，还是离群点拉出来的；
 *   · 用两根并排柱冒充关系 —— 那是同一指标的两个值，不是两个指标的关系。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **坐标与算数都在 `model.ts`**：这一支只拼标记，`left`／`bottom`／`clip-path`／`width`
 *     那几行行内样式是**算出来的百分比**（一条记录一个数），静态规则一律住 `style.ts`；
 *   · **色不是唯一信息**：刻度文字给数字、图例给形与字、离群点与最强档都**再写一遍字**；
 *   · **不靠颜色表方向**：滞后档的条从中线往左或往右（形）＋ 数字带正负号（字）。
 */
import { esc } from '../shared/escape.js';
import { SCATTER_FIT_CLASS, scatterFitSlot, type ScatterFitForm } from './attrs.js';
import { normalizeScatterFit, type ScatterFitModel } from './model.js';

/** 卡头：标题 ＋ 口径那枚时间窗 ＋ **从数据算出来**的统计那句。 */
function headHtml(m: ScatterFitModel): string {
  const parts: string[] = ['<div class="' + scatterFitSlot('hd') + '">'];
  parts.push('<h4 class="' + scatterFitSlot('title') + '">' + esc(m.title) + '</h4>');
  if (m.stamp !== undefined) {
    parts.push('<span class="' + scatterFitSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('<span class="' + scatterFitSlot('tail') + '">' + esc(m.tail) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 纵轴刻度列（三档：与图区同高的上／中／下；只有第一枚带单位）。 */
function yTicksHtml(m: ScatterFitModel): string {
  return '<div class="' + scatterFitSlot('yticks') + '">'
    + m.yTicks.map((t) => '<span class="' + scatterFitSlot('ytick') + '">' + esc(t) + '</span>').join('')
    + '</div>';
}

/** 图例：每一项是「形 ＋ 字」——形由 `is-*` 给，字说清那是什么。 */
function legendHtml(m: ScatterFitModel): string {
  if (m.legend.length === 0) return '';
  return '<ul class="' + scatterFitSlot('legend') + '">'
    + m.legend.map((one) => '<li class="' + scatterFitSlot('legend-item') + '">'
      + '<i class="' + scatterFitSlot('legend-mark') + ' is-' + one.kind + '" aria-hidden="true"></i>'
      + esc(one.text) + '</li>').join('')
    + '</ul>';
}

/** 脚注一句人话（不给就用本形态的口径句）。 */
function noteHtml(m: ScatterFitModel): string {
  return '<p class="' + scatterFitSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 形态 A：坐标框（纵轴刻度列 ‖ 点阵区）＋ 横轴刻度行 → 图例 → 脚注。 */
function renderScatter(m: ScatterFitModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + scatterFitSlot('plotbox') + '">');
  parts.push(yTicksHtml(m));
  parts.push('<div class="' + scatterFitSlot('plot') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  parts.push('<span class="' + scatterFitSlot('band') + '" aria-hidden="true" style="clip-path: '
    + esc(m.bandShape) + '"></span>');
  parts.push('<span class="' + scatterFitSlot('fitline') + '" aria-hidden="true" style="clip-path: '
    + esc(m.fitShape) + '"></span>');
  for (const dot of m.dots) {
    parts.push('<span class="' + scatterFitSlot('dot') + (dot.outlier ? ' is-outlier' : '')
      + '" style="left: ' + String(dot.leftPct) + '%; bottom: ' + String(dot.upPct) + '%" title="'
      + esc(dot.title) + '"></span>');
  }
  parts.push('</div>');
  parts.push('<div class="' + scatterFitSlot('xticks') + '">'
    + m.xTicks.map((t) => '<span class="' + scatterFitSlot('xtick') + '">' + esc(t) + '</span>').join('')
    + '</div>');
  parts.push('</div>');
  parts.push(legendHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 B：坐标框（纵轴刻度列 ‖ 分箱区）＋ 箱标签行 → 图例 → 脚注。 */
function renderBin(m: ScatterFitModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + scatterFitSlot('plotbox') + '">');
  parts.push(yTicksHtml(m));
  parts.push('<div class="' + scatterFitSlot('bins') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  for (const bin of m.bins) {
    parts.push('<span class="' + scatterFitSlot('bincol') + '" title="' + esc(bin.title) + '">');
    parts.push('<i class="' + scatterFitSlot('bin-range') + '" aria-hidden="true" style="bottom: '
      + String(bin.bottomPct) + '%; height: ' + String(bin.heightPct) + '%"></i>');
    parts.push('<i class="' + scatterFitSlot('bin-median') + '" aria-hidden="true" style="bottom: '
      + String(bin.medianPct) + '%"></i>');
    parts.push('</span>');
  }
  parts.push('</div>');
  parts.push('<div class="' + scatterFitSlot('xticks') + '">'
    + m.xTicks.map((t) => '<span class="' + scatterFitSlot('bintick') + '">' + esc(t) + '</span>').join('')
    + '</div>');
  parts.push('</div>');
  parts.push(legendHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 C：表头一行（错开 ｜ 相关强度 ｜ 系数）＋ 逐档一行 → 脚注。 */
function renderLag(m: ScatterFitModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + scatterFitSlot('laghead') + '"><span>错开</span>'
    + '<span>相关强度（中线往左右各半 ＝ ±1）</span><span>系数</span></div>');
  parts.push('<div class="' + scatterFitSlot('lag') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  for (const row of m.lags) {
    parts.push('<div class="' + scatterFitSlot('lagrow') + (row.negative ? ' is-negative' : '')
      + (row.strong ? ' is-strong' : '') + '">');
    parts.push('<span class="' + scatterFitSlot('lag-label') + '">' + esc(row.label) + '</span>');
    parts.push('<span class="' + scatterFitSlot('lag-track') + '"><i class="'
      + scatterFitSlot('lag-bar') + '" aria-hidden="true" style="width: ' + String(row.widthPct)
      + '%"></i></span>');
    parts.push('<span class="' + scatterFitSlot('lag-value') + '">'
      + (row.strong ? '<b class="' + scatterFitSlot('lag-strong') + '">' + esc(row.valueText + ' 最强') + '</b>'
        : esc(row.valueText)) + '</span>');
    parts.push('</div>');
  }
  parts.push('</div>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第四形态就是加一支）。 */
const SKELETONS: Readonly<Record<ScatterFitForm, (m: ScatterFitModel) => string>> = {
  scatter: renderScatter,
  bin: renderBin,
  lag: renderLag,
};

/** 渲染相关性散点（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderScatterFit(input: unknown): string {
  const m = normalizeScatterFit(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SCATTER_FIT_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
