/** flow-ribbon · **渲染**（纯函数产 HTML；三个形态各一支骨架，分派在文件末尾）。
 *
 *  —— 三个形态 ——
 *   · `sankey` 左边一列来源、右边一列用途，中间一条条带子：**带宽＝金额**，两列同一把尺子，
 *     故左边一股与右边一格可以横着比；
 *   · `matrix` 行＝来源、列＝用途：格里的金额 ＋ 占比，条长按**全表最大格**算（不是按本行最大），
 *     空格写 `—`（不是 0）；
 *   · `rails` 上下两条构成轨 ＋ 中间汇合读数（进 ＝ 出）：每格宽度＝这一格占总额的比例，
 *     两条轨同一总额、各自拉满 100%，故上下两轨可以横着比。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **两处几何都由 `model.ts` 算好**：这一支只拼标记（百分比直接写进行内样式），静态规则一律住 `style.ts`；
 *   · **每一条读数恰好印一次**：桑基里装不进节点框的读数搬到下面那张名单里，**不压字、不截断**；
 *   · **色不是唯一信息**：带子有色阶 ＋ 图例给名字、格有深浅 ＋ 数字、格宽与条长 ＋ 百分数；
 *     三形态的可点元素数为零，调用方若把某一行包成入口，焦点环由 `style.ts` 那一档兜住。
 */
import { esc } from '../shared/escape.js';
import {
  FLOW_RIBBON_CLASS,
  FLOW_RIBBON_HEIGHT_VAR,
  FLOW_RIBBON_LANE_L1_VAR,
  FLOW_RIBBON_LANE_L2_VAR,
  FLOW_RIBBON_LANE_R1_VAR,
  FLOW_RIBBON_LANE_R2_VAR,
  FLOW_RIBBON_MIX_VAR,
  FLOW_RIBBON_PLOT_VAR,
  FLOW_RIBBON_TOP_VAR,
  FLOW_RIBBON_USE_ATTR,
  FLOW_RIBBON_WIDTH_VAR,
  flowRibbonSlot,
  type FlowRibbonForm,
} from './attrs.js';
import {
  normalizeFlowRibbon,
  type FlowRibbonMatrixCell,
  type FlowRibbonMatrixModel,
  type FlowRibbonRailsModel,
  type FlowRibbonReadout,
  type FlowRibbonSankeyModel,
  type FlowRibbonSankeyNode,
  type FlowRibbonModel,
} from './model.js';

/** 百分比 → 行内样式里那个串（几何一律两位小数，与 `model.ts` 的取整同口径）。 */
const pct = (n: number): string => String(n) + '%';

/** 卡头：标题 ＋ 时间窗 ＋ **从数据算出来**的总额。三形态共用。 */
function headHtml(m: FlowRibbonModel): string {
  const parts: string[] = ['<div class="' + flowRibbonSlot('hd') + '">',
    '<h4 class="' + flowRibbonSlot('title') + '">' + esc(m.title) + '</h4>'];
  if (m.stamp !== undefined) {
    parts.push('<span class="' + flowRibbonSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('<span class="' + flowRibbonSlot('tail') + '">' + esc(m.totalText) + '</span>', '</div>');
  return parts.join('');
}

/** 一条读数的名单行（名字 ＋ 金额 ＋ 占比；色块与图例同一档——**序 ＋ 色 ＋ 字**三样对得上）。 */
function readoutRowHtml(row: FlowRibbonReadout & { readonly mark: string }): string {
  return '<div class="' + flowRibbonSlot('readout-row') + '">'
    + '<i class="' + flowRibbonSlot('swatch') + ' ' + row.mark + '" aria-hidden="true"></i>'
    + '<b class="' + flowRibbonSlot('readout-name') + '">' + esc(row.name) + '</b>'
    + '<span class="' + flowRibbonSlot('readout-amount') + '">' + esc(row.amountText) + '</span>'
    + '<span class="' + flowRibbonSlot('readout-share') + '">' + esc(row.shareText) + '</span></div>';
}

/** 脚注：口径行（本件永远出一句——不给就由 `model.ts` 写自己的口径）。 */
function noteHtml(m: FlowRibbonModel): string {
  return '<p class="' + flowRibbonSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 图例（每一项：色块 ＋ 名字）。三形态里只有桑基出（那三个色阶档是它独有的读法）。 */
function legendHtml(m: FlowRibbonModel): string {
  if (m.legend.length === 0) return '';
  return '<ul class="' + flowRibbonSlot('legend') + '">'
    + m.legend.map((one) => '<li class="' + flowRibbonSlot('legend-item') + '">'
      + '<i class="' + flowRibbonSlot('legend-mark') + ' ' + one.mark + '" aria-hidden="true"></i>'
      + esc(one.text) + '</li>').join('')
    + '</ul>';
}

/* ── 形态 `sankey` ──────────────────────────────────────────────── */

/** 一个节点框：左列读数字在右侧贴着带子、右列贴着带子那一侧对齐（原型同款）。 */
function sankeyNodeHtml(node: FlowRibbonSankeyNode, side: 'src' | 'use'): string {
  const style = ' style="' + FLOW_RIBBON_TOP_VAR + ': ' + pct(node.topPct) + '; '
    + FLOW_RIBBON_HEIGHT_VAR + ': ' + pct(node.heightPct) + '"';
  const title = ' title="' + esc(node.name + ' ' + node.amountText) + '"';
  if (!node.inside) {
    /* 读数搬去下面那张名单了：框里只留一条**无文字的图形**（名字与金额一个不少地印在名单里）。 */
    return '<span class="' + flowRibbonSlot('node') + ' is-' + side + ' is-bare" aria-hidden="true"' + style + title
      + '></span>';
  }
  return '<span class="' + flowRibbonSlot('node') + ' is-' + side + '"' + style + title + '>'
    + '<b class="' + flowRibbonSlot('nd-name') + '">' + esc(node.name) + '</b>'
    + '<em class="' + flowRibbonSlot('nd-amount') + '">' + esc(node.amountText) + '</em></span>';
}

/** 桑基骨架：卡头 → 画布（带子 ＋ 两列节点）→ 读数名单（有装不下的才出）→ 图例 → 脚注。 */
function renderSankey(m: FlowRibbonSankeyModel): string {
  const parts: string[] = [headHtml(m),
    '<div class="' + flowRibbonSlot('plot') + '" role="img" aria-label="' + esc(m.ariaLabel)
    + '" style="' + FLOW_RIBBON_PLOT_VAR + ': ' + String(m.plotPx) + 'px">'];
  /* 带子在下、节点在上（节点是不透明的框，压在带子的两头收口）。 */
  for (const lane of m.lanes) {
    parts.push('<span class="' + flowRibbonSlot('lane') + ' ' + lane.mark + '" aria-hidden="true" title="'
      + esc(lane.title) + '" style="'
      + FLOW_RIBBON_LANE_L1_VAR + ': ' + pct(lane.l1) + '; '
      + FLOW_RIBBON_LANE_L2_VAR + ': ' + pct(lane.l2) + '; '
      + FLOW_RIBBON_LANE_R1_VAR + ': ' + pct(lane.r1) + '; '
      + FLOW_RIBBON_LANE_R2_VAR + ': ' + pct(lane.r2) + '"></span>');
  }
  for (const node of m.sources) parts.push(sankeyNodeHtml(node, 'src'));
  for (const node of m.uses) parts.push(sankeyNodeHtml(node, 'use'));
  parts.push('</div>');
  if (m.readouts.length > 0) {
    parts.push('<div class="' + flowRibbonSlot('readout') + '">',
      '<p class="' + flowRibbonSlot('readout-hd') + '">装不进节点框的读数 · '
      + String(m.readouts.length) + ' 条（那一股太细、或名字与金额比框宽——读数在这里一个不少）</p>',
      m.readouts.map(readoutRowHtml).join(''), '</div>');
  }
  parts.push(legendHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/* ── 形态 `matrix` ──────────────────────────────────────────────── */

/** 一格：条（无文字的图形）＋ 金额 ＋ 占总额的百分数；空格写 `—`。
 *  合计行那一列不出条（它是各行的和，与「某一格 ÷ 全表最大格」不是同一把尺子）。 */
function matrixCellHtml(cell: FlowRibbonMatrixCell, which: 'mat-cell' | 'mat-total'): string {
  const attrs = ' ' + FLOW_RIBBON_USE_ATTR + '="' + esc(cell.use) + '" title="' + esc(cell.title) + '"';
  if (cell.empty) {
    return '<td class="' + flowRibbonSlot('mat-cell') + ' is-empty"' + attrs + '><b class="'
      + flowRibbonSlot('cell-num') + '">' + esc(cell.amountText) + '</b></td>';
  }
  const bar = which === 'mat-total' ? '' : '<i class="' + flowRibbonSlot('cell-bar') + '" aria-hidden="true" style="'
    + FLOW_RIBBON_WIDTH_VAR + ': ' + pct(cell.barPct) + '; '
    + FLOW_RIBBON_MIX_VAR + ': ' + pct(cell.mixPct) + '"></i>';
  return '<td class="' + flowRibbonSlot(which) + '"' + attrs + '>' + bar
    + '<b class="' + flowRibbonSlot('cell-num') + '">' + esc(cell.amountText) + '</b>'
    + '<em class="' + flowRibbonSlot('cell-pct') + '">' + esc(cell.shareText) + '</em></td>';
}

/** 矩阵骨架：卡头 → 表（表头 ＋ 逐来源一行 ＋ 合计行）→ 脚注。 */
function renderMatrix(m: FlowRibbonMatrixModel): string {
  const parts: string[] = [headHtml(m),
    '<table class="' + flowRibbonSlot('matrix') + '" aria-label="' + esc(m.ariaLabel) + '">',
    '<thead class="' + flowRibbonSlot('mat-head') + '"><tr>',
    '<th class="' + flowRibbonSlot('mat-rowhd') + '" scope="col">来源 ＼ 用途</th>'];
  for (const name of m.useNames) {
    parts.push('<th class="' + flowRibbonSlot('mat-cell') + '" scope="col" ' + FLOW_RIBBON_USE_ATTR + '="'
      + esc(name) + '">' + esc(name) + '</th>');
  }
  parts.push('</tr></thead><tbody class="' + flowRibbonSlot('mat-body') + '">');
  for (const row of m.rows) {
    parts.push('<tr class="' + flowRibbonSlot('mat-row') + '"><th class="' + flowRibbonSlot('mat-rowhd')
      + '" scope="row">' + esc(row.name) + '<em class="' + flowRibbonSlot('cell-num') + '">'
      + esc(row.amountText) + '</em></th>');
    for (const cell of row.cells) parts.push(matrixCellHtml(cell, 'mat-cell'));
    parts.push('</tr>');
  }
  parts.push('</tbody><tfoot class="' + flowRibbonSlot('mat-foot') + '"><tr class="' + flowRibbonSlot('mat-row')
    + '"><th class="' + flowRibbonSlot('mat-rowhd') + '">合计</th>');
  for (const cell of m.foot) parts.push(matrixCellHtml(cell, 'mat-total'));
  parts.push('</tr></tfoot></table>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/* ── 形态 `rails` ───────────────────────────────────────────────── */

/** 一条构成轨：逐格宽度＝占比（绝对值写在下面的名单里，格小到放不下百分数时那一格不出字）。 */
function railHtml(m: FlowRibbonRailsModel, side: 'src' | 'use'): string {
  const segs = side === 'src' ? m.sourceSegs : m.useSegs;
  const head = side === 'src' ? m.sourceHead : m.useHead;
  const parts: string[] = ['<span class="' + flowRibbonSlot('rails-hd') + '">' + esc(head) + '</span>',
    '<div class="' + flowRibbonSlot('rail') + ' is-' + side + '">'];
  for (const seg of segs) {
    parts.push('<span class="' + flowRibbonSlot('seg') + '" aria-hidden="true" title="'
      + esc(seg.name + ' ' + seg.amountText + '（占总额 ' + seg.shareText + '）') + '" style="'
      + FLOW_RIBBON_WIDTH_VAR + ': ' + pct(seg.widthPct) + '">'
      + (seg.numbered ? '<b class="' + flowRibbonSlot('seg-pct') + '">' + esc(seg.shareText) + '</b>' : '')
      + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 轨下那一栏名单（来源栏 ／ 用途栏；两条轨的读数逐条写全）。 */
function railsColHtml(head: string, rows: readonly (FlowRibbonReadout & { readonly mark: string })[]): string {
  return '<div class="' + flowRibbonSlot('rails-col') + '">'
    + '<p class="' + flowRibbonSlot('rails-hd') + '">' + esc(head) + '</p>'
    + rows.map(readoutRowHtml).join('') + '</div>';
}

/** 构成轨骨架：卡头 → 两轨 ＋ 中间汇合读数 → 逐条名单 → 脚注。 */
function renderRails(m: FlowRibbonRailsModel): string {
  const parts: string[] = [headHtml(m),
    '<div class="' + flowRibbonSlot('rails') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">'];
  parts.push(railHtml(m, 'src'));
  parts.push('<div class="' + flowRibbonSlot('hub') + '">'
    + '<span class="' + flowRibbonSlot('hub-eq') + '">' + esc(m.hubEqText) + '</span>'
    + '<span class="' + flowRibbonSlot('hub-net') + '">' + esc(m.hubNetText) + '</span></div>');
  parts.push(railHtml(m, 'use'));
  parts.push('</div>');
  parts.push('<div class="' + flowRibbonSlot('rails-list') + '">');
  parts.push(railsColHtml('来源 · ' + String(m.sourceSegs.length) + ' 股',
    m.sourceRows.map((r, i) => ({ ...r, mark: 'is-s' + String(i + 1) }))));
  parts.push(railsColHtml('用途 · ' + String(m.useSegs.length) + ' 类',
    m.useRows.map((r) => ({ ...r, mark: 'is-tgt' }))));
  parts.push('</div>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第四形态就是加一支）。 */
const SKELETONS: Readonly<Record<FlowRibbonForm, (m: FlowRibbonModel) => string>> = {
  sankey: (m) => renderSankey(m as FlowRibbonSankeyModel),
  matrix: (m) => renderMatrix(m as FlowRibbonMatrixModel),
  rails: (m) => renderRails(m as FlowRibbonRailsModel),
};

/** 渲染流向带（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderFlowRibbon(input: unknown): string {
  const m = normalizeFlowRibbon(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + FLOW_RIBBON_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
