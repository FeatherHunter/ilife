/** heat-grid · **渲染**（纯函数产 HTML；本件只有形态 A「行时段 × 列星期」一种骨架）。
 *
 *  —— 形态 A：行时段 × 列星期 ——
 *
 *  每一格是一个（行 × 列）的读数：**深浅**是第一条通路，**色键**（一档一个数字区间）是第二条，
 *  第一处峰值那格再带一枚 **▲**（形），右侧读数给数字。它替掉的两种错法：
 *   · 只说一句「晚上比较忙」——看不出是哪天、哪个钟点；
 *   · 只画深浅不给色键——颜色成了唯一信息，读的人只能猜"深的是多还是少"。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **色键与实际着色同一份真值**：`heatGridLevel()` 一处决定格子的 `is-l<n>` 与色键的区间文字，
 *     读者按色键数格子一定数得对；
 *   · **窄容器不靠横滑**：列宽走 `minmax(0,1fr)`、行标签走 `max-content`（宽度由标签自己定），
 *     根不留横向滚动、也不藏 `overflow-x`（窄档只改行高与列距，不改列数、不减列）；
 *   · 标记里不写分隔符与缺省占位：格子的深浅由类名给，数字只在色键与右侧读数里出现。
 */
import { esc } from '../shared/escape.js';
import {
  HEAT_GRID_CLASS,
  HEAT_GRID_PEAK_MARK,
  heatGridSlot,
  type HeatGridForm,
} from './attrs.js';
import { normalizeHeatGrid, type HeatGridModel, type HeatGridCellModel } from './model.js';

/** 一格：深浅由 `is-l<n>` 给；峰值格再带一枚 ▲（**形是深浅之外的那一条信息**）。
 *  `title` 让鼠标停在格子上能读到「哪一行 · 哪一天：多少」——窄到看不出格子差别的场合靠它兜底。 */
function cellHtml(cell: HeatGridCellModel, rowLabel: string, weekday: string, unit?: string): string {
  const parts: string[] = ['<span class="' + heatGridSlot('cell') + ' is-l' + String(cell.level)
    + (cell.peak ? ' is-peak' : '') + '" title="' + esc(rowLabel + ' · ' + weekday + '：'
    + String(cell.value) + (unit === undefined ? '' : unit)) + '">'];
  if (cell.peak) {
    parts.push('<b class="' + heatGridSlot('peak-mark') + '">' + HEAT_GRID_PEAK_MARK + '</b>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 网格：左上角空位 ＋ 七枚列头，之后逐行「行标签 ＋ 七格」。 */
function gridHtml(model: HeatGridModel): string {
  const parts: string[] = ['<div class="' + heatGridSlot('grid') + '" role="img" aria-label="'
    + esc(model.title + '：' + model.ariaLabel) + '">'];
  parts.push('<span class="' + heatGridSlot('corner') + '"></span>');
  for (const day of model.weekdays) {
    parts.push('<span class="' + heatGridSlot('col-head') + '">' + esc(day) + '</span>');
  }
  for (const row of model.rows) {
    parts.push('<span class="' + heatGridSlot('row-label') + '">' + esc(row.label) + '</span>');
    row.cells.forEach((cell, c) => {
      parts.push(cellHtml(cell, row.label, model.weekdays[c], model.unit));
    });
  }
  parts.push('</div>');
  return parts.join('');
}

/** 右侧读数：逐行「名字 ｜ 值（＋脚注另起一行）」。 */
function factsHtml(model: HeatGridModel): string {
  if (model.facts.length === 0) return '';
  const parts: string[] = ['<ul class="' + heatGridSlot('rank') + '">'];
  for (const fact of model.facts) {
    parts.push('<li class="' + heatGridSlot('rank-item') + '">');
    parts.push('<span class="' + heatGridSlot('rank-label') + '">' + esc(fact.label) + '</span>');
    parts.push('<b class="' + heatGridSlot('rank-value') + '">' + esc(fact.value) + '</b>');
    if (fact.sub !== undefined) {
      parts.push('<span class="' + heatGridSlot('rank-sub') + '">' + esc(fact.sub) + '</span>');
    }
    parts.push('</li>');
  }
  parts.push('</ul>');
  return parts.join('');
}

/** 色键（**必带**）：一档一枚色块 ＋ 它的数字区间；两端「少／多」点明深浅的方向。 */
function keyHtml(model: HeatGridModel): string {
  const parts: string[] = ['<ul class="' + heatGridSlot('key') + '">'];
  parts.push('<li><span class="' + heatGridSlot('key-end') + '">少</span></li>');
  for (const item of model.keyItems) {
    parts.push('<li class="' + heatGridSlot('key-item') + '"><i class="' + heatGridSlot('swatch')
      + ' is-l' + String(item.level) + '" aria-hidden="true"></i>' + esc(item.text) + '</li>');
  }
  parts.push('<li><span class="' + heatGridSlot('key-end') + '">多</span></li>');
  parts.push('</ul>');
  return parts.join('');
}

/** 形态 A 的骨架：卡头 → （网格 ＋ 右侧读数）→ 色键 → 脚注。 */
function renderMatrix(model: HeatGridModel): string {
  const parts: string[] = [];
  parts.push('<div class="' + heatGridSlot('hd') + '">');
  parts.push('<h4 class="' + heatGridSlot('title') + '">' + esc(model.title) + '</h4>');
  if (model.stamp !== undefined) {
    parts.push('<span class="' + heatGridSlot('stamp') + '">' + esc(model.stamp) + '</span>');
  }
  parts.push('</div>');
  parts.push('<div class="' + heatGridSlot('gridbox') + '">' + gridHtml(model) + factsHtml(model) + '</div>');
  parts.push(keyHtml(model));
  if (model.note !== undefined) {
    parts.push('<p class="' + heatGridSlot('note') + '">' + esc(model.note) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<HeatGridForm, (m: HeatGridModel) => string>> = {
  matrix: renderMatrix,
};

/** 渲染热力格（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderHeatGrid(input: unknown): string {
  const model = normalizeHeatGrid(input);
  const extra = model.extraClass === undefined ? '' : ' ' + model.extraClass;
  return '<div class="' + HEAT_GRID_CLASS + ' is-' + model.form + extra + '">'
    + SKELETONS[model.form](model) + '</div>';
}
