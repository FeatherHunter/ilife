/** gantt-timeline · **渲染**（纯函数产 HTML；本件只有形态 C「资源泳道（灶位）× 关键路径带」一种骨架）。
 *
 *  —— 形态 C 的骨架（与原型逐层对得上）——
 *
 *  ① 卡头：标题 ＋「几条泳道」＋ 右端那句读数；
 *  ② 刻度行：左端量名（窄档折到刻度之上）＋ 格刻度（**每 N 格写一枚数字**，数字由轴域算）；
 *  ③ 泳道区（`role="img"`）：**关键路径一条** ＋ **资源泳道各一条** ＋ 里程碑各一条；
 *     段按状态给字形（`✓`／`▶`／`⋯`／`▷`），空档段是点线块并写分钟数，里程碑是压在格线上的 `◆`；
 *     「现在」游标是一条竖线 ＋ 线上一枚字（靠右半区时字挪到线的左侧）；
 *  ④ 图例（**只列这一段实际出现过的档**：形 ＋ 字）；⑤ 口径行。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **落位只有一处算**：段／空档块／里程碑／游标的坐标全部来自 `scale.ts` 的同一个轴域；
 *   · **窄档零横向溢出靠换行、不靠截断**：长的名字／读数一律 `overflow-wrap:anywhere`，
 *     本件**不写** `overflow:hidden`、不写 `text-overflow`、不写省略号；
 *   · 标记里**不写分隔符**（段间那道缝由列距与格线承担），也不写脚本。
 */
import { esc } from '../shared/escape.js';
import {
  GANTT_TIMELINE_AT_VAR,
  GANTT_TIMELINE_CLASS,
  ganttTimelineSlot,
  type GanttTimelineForm,
} from './attrs.js';
import { normalizeGanttTimeline, type GanttTimelineModel } from './model.js';
import type { GanttTimelineMarkView, GanttTimelineRowView } from './layout.js';

/** 格的列宽（**唯一的格子写法**）：格数与落位是同一份事实，故这里只写一次。 */
const gridStyle = (cells: number): string =>
  ' style="grid-template-columns:repeat(' + String(cells) + ',minmax(0,1fr))"';

/** 卡头：标题 ＋「几条泳道」＋ 右端读数（薄薄一排；不放按钮——按钮归 `action-bar`）。 */
function headHtml(m: GanttTimelineModel): string {
  const parts: string[] = ['<div class="' + ganttTimelineSlot('hd') + '">'];
  parts.push('<b class="' + ganttTimelineSlot('title') + '">' + esc(m.title) + '</b>');
  parts.push('<span class="' + ganttTimelineSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  if (m.tail !== undefined) {
    parts.push('<span class="' + ganttTimelineSlot('tail') + '">' + esc(m.tail) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 刻度行：量名 ＋ 逐格一枚 `i`（有数字的那几格多一枚 `b`）。
 *  数字的宽度上限＝**相邻两枚刻度之间的格数**（那是它真正能用的地方）：长了在那一整段里换行，
 *  最后一格上的数字改右对齐（往左长，跑不出刻度区）——本件不写省略号、也不让它跑出去。 */
function axisHtml(m: GanttTimelineModel): string {
  const labelled = new Map(m.ticks.map((t) => [t.index, t]));
  const step = m.ticks.length > 1 ? m.ticks[1].index - m.ticks[0].index : m.scale.cells;
  const width = ' style="max-width:calc(100% * ' + String(step) + ')"';
  const parts: string[] = ['<div class="' + ganttTimelineSlot('axrow') + '">'];
  parts.push('<span class="' + ganttTimelineSlot('lbh') + '">' + esc(m.axisName) + '</span>');
  parts.push('<div class="' + ganttTimelineSlot('ax') + '" aria-hidden="true"' + gridStyle(m.scale.cells) + '>');
  for (let i = 0; i < m.scale.cells; i += 1) {
    const tick = labelled.get(i);
    if (tick === undefined) {
      parts.push('<i class="' + ganttTimelineSlot('tick') + '"></i>');
      continue;
    }
    parts.push('<i class="' + ganttTimelineSlot('tick') + ' is-num"><b class="' + ganttTimelineSlot('tick-label')
      + (tick.atEnd ? ' is-end' : '') + '"' + width + '>' + esc(tick.text) + '</b></i>');
  }
  parts.push('</div></div>');
  return parts.join('');
}

/** 一条段（或空档块）：落位、宽度、字形、悬停读数都从 `mark` 来——**不在这里算坐标**。 */
function markHtml(mark: GanttTimelineMarkView): string {
  const cls = mark.state === 'idle' ? ganttTimelineSlot('idle')
    : (mark.state === 'crit' ? ganttTimelineSlot('bar') + ' is-crit'
      : ganttTimelineSlot('bar') + ' is-' + mark.state);
  const parts: string[] = ['<span class="' + cls + '" style="grid-column:' + String(mark.column)
    + ' / span ' + String(mark.span) + '" title="' + esc(mark.title) + '">'];
  if (mark.mark !== '') parts.push('<i class="' + ganttTimelineSlot('mark') + '">' + esc(mark.mark) + '</i>');
  if (mark.text !== undefined && mark.text !== '') {
    parts.push('<span class="' + ganttTimelineSlot('text') + '">' + esc(mark.text) + '</span>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 一个里程碑：元素铺到一侧、`◆` 压在格线上；名字写在 `◆` 旁边（长了换行、不截断）。 */
function milestoneHtml(mark: GanttTimelineMarkView, label: string): string {
  return '<span class="' + ganttTimelineSlot('milestone') + (mark.atEnd ? ' is-end' : '')
    + '" style="grid-column:' + String(mark.column) + ' / span ' + String(mark.span)
    + '" title="' + esc(mark.title) + '">'
    + '<i class="' + ganttTimelineSlot('ms-mark') + '">' + esc(mark.mark) + '</i>'
    + '<span class="' + ganttTimelineSlot('ms-text') + '">' + esc(label) + '</span></span>';
}

/** 行：左端标签（宽档在左侧列、窄档折到轨迹之上）＋ 轨迹。 */
function rowHtml(row: GanttTimelineRowView, cells: number): string {
  const parts: string[] = ['<div class="' + ganttTimelineSlot('row') + ' ' + row.kindClass + '">'];
  parts.push('<span class="' + ganttTimelineSlot('row-label') + '">'
    + '<b class="' + ganttTimelineSlot('row-name') + '">' + esc(row.label) + '</b>'
    + '<em class="' + ganttTimelineSlot('row-note') + '">' + esc(row.note) + '</em></span>');
  parts.push('<span class="' + ganttTimelineSlot('track') + '"' + gridStyle(cells) + '>');
  for (const mark of row.marks) {
    parts.push(row.kind === 'milestone' ? milestoneHtml(mark, row.label) : markHtml(mark));
  }
  parts.push('</span></div>');
  return parts.join('');
}

/** 泳道区：先给「现在」游标留一条带（**不让它压在第一条泳道上**——原型里它正压着关键路径那一条），
 *  再逐行排（关键路径 → 泳道 → 里程碑）。游标位置经 `GANTT_TIMELINE_AT_VAR` 传给样式。 */
function bodyHtml(m: GanttTimelineModel): string {
  const parts: string[] = ['<div class="' + ganttTimelineSlot('body')
    + (m.cursorView === undefined ? '' : ' is-now') + '" role="img" aria-label="'
    + esc(m.ariaLabel) + '"'
    + (m.cursorView === undefined ? '' : ' style="' + GANTT_TIMELINE_AT_VAR + ':'
      + String(m.cursorView.ratio) + '"') + '>'];
  if (m.cursorView !== undefined) {
    parts.push('<b class="' + ganttTimelineSlot('now-label') + (m.cursorView.atEnd ? ' is-end' : '') + '">'
      + esc(m.cursorView.label) + '</b>');
    parts.push('<span class="' + ganttTimelineSlot('now') + '" aria-hidden="true"></span>');
  }
  for (const row of m.rows) parts.push(rowHtml(row, m.scale.cells));
  parts.push('</div>');
  return parts.join('');
}

/** 图例：逐枚「形 ＋ 字」（形是那一段里真的出现过的字形；字是这一档叫什么）。 */
function legendHtml(m: GanttTimelineModel): string {
  const parts: string[] = ['<div class="' + ganttTimelineSlot('legend') + '">'];
  for (const item of m.legend) {
    parts.push('<span class="' + ganttTimelineSlot('legend-item') + '"><i class="' + ganttTimelineSlot('swatch')
      + ' is-' + item.state + '">' + esc(item.mark) + '</i>'
      + '<span class="' + ganttTimelineSlot('legend-word') + '">' + esc(item.word) + '</span></span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 C 的骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
function renderFormC(m: GanttTimelineModel): string {
  return headHtml(m) + axisHtml(m) + bodyHtml(m)
    + (m.legend.length > 0 ? legendHtml(m) : '')
    + '<p class="' + ganttTimelineSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 形态 → 骨架（本件只有一格）。 */
const SKELETONS: Readonly<Record<GanttTimelineForm, (m: GanttTimelineModel) => string>> = {
  C: renderFormC,
};

/** 渲染甘特时间线（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderGanttTimeline(input: unknown): string {
  const m = normalizeGanttTimeline(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + GANTT_TIMELINE_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
