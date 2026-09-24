/** compare-columns · **渲染**（纯函数产 HTML；本件只有形态 A「背靠背条形」一种骨架）。
 *
 *  —— 形态 A：背靠背条形 ——
 *
 *  一行三格：**左窗格 ｜ 项名 ｜ 右窗格**。左窗格是「值 ＋ 一条伸向中线的条」，右窗格是
 *  「一条从中线伸出的条 ＋ 值」——两侧共用一条刻度（都按两窗最大值折算），所以**条长可直接比**；
 *  数字读准值，条读差距。最后一格是**差额单独一行**（本形态的结论位），再下面是口径行。
 *
 *  它替掉的两种错法：
 *   · 两窗各写一张表 ⇒ 读者要自己找同一项在两处的两行；
 *   · 只报差额不报两侧 ⇒ 读者不知道差额从哪来、哪一项在拉。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 条长与数字**同源**（都来自入参的数）：条长按「值 ÷ 两窗最大值」，不是拍出来的百分比；
 *   · 方向**不只靠色**：涨／跌／持平一律「字形 ＋ 正负号」，色阶是可选的第三样（`sense`）；
 *   · 标记里**不写分隔符与占位符**：两侧窗口名在宽档由表头行给、窄档由每侧的窗口名给，两处不重复念；
 *     长串一律 `overflow-wrap: anywhere`，项名与窗口名不许 `…` 截断。
 */
import { esc } from '../shared/escape.js';
import {
  COMPARE_COLUMNS_CLASS,
  compareColumnsDirectionClass,
  compareColumnsSideClass,
  compareColumnsSlot,
  compareColumnsToneClass,
  type CompareColumnsForm,
} from './attrs.js';
import { normalizeCompareColumns, type CompareColumnsModel, type CompareColumnsRowModel } from './model.js';

/** 值那一格（含单位）：单位小一号、跟在数字后（与账目行／明细行同一条写法）。 */
function valueHtml(m: CompareColumnsModel, text: string): string {
  return '<b class="' + compareColumnsSlot('value') + '">' + esc(text)
    + (m.unit === undefined ? '' : '<small class="' + compareColumnsSlot('unit') + '">' + esc(m.unit) + '</small>')
    + '</b>';
}

/** 条的外框（填充宽度＝这一侧的值 ÷ 两窗最大值）。条是**装饰**：值已经以文本上屏，故 `aria-hidden`。 */
function barHtml(width: string): string {
  return '<span class="' + compareColumnsSlot('bar') + '" aria-hidden="true">'
    + '<i class="' + compareColumnsSlot('fill') + '" style="width: ' + width + '%"></i></span>';
}

/** 一侧：窗口名（窄档才现）／值／条。左窗把条排在值后（伸向中线），右窗把条排在值前（从中线伸出）。 */
function sideHtml(m: CompareColumnsModel, side: 'left' | 'right', row: CompareColumnsRowModel): string {
  const name = side === 'left' ? m.leftLabel : m.rightLabel;
  const text = side === 'left' ? row.leftText : row.rightText;
  const width = side === 'left' ? row.leftWidth : row.rightWidth;
  const nameSlot = '<span class="' + compareColumnsSlot('side-name') + '">' + esc(name) + '</span>';
  return '<span class="' + compareColumnsSlot('side') + ' ' + compareColumnsSideClass(side) + '">'
    + (side === 'left' ? nameSlot + valueHtml(m, text) + barHtml(width) : nameSlot + barHtml(width) + valueHtml(m, text))
    + '</span>';
}

/** 表头行：左右两个窗口名，中缝那一列留空（对齐逐项行中缝的项名列）。 */
function headHtml(m: CompareColumnsModel): string {
  return '<div class="' + compareColumnsSlot('head') + '">'
    + '<span class="' + compareColumnsSlot('head-left') + '">' + esc(m.leftLabel) + '</span>'
    + '<span class="' + compareColumnsSlot('head-right') + '">' + esc(m.rightLabel) + '</span>'
    + '</div>';
}

/** 差额那一行：标签 ＋ 方向字形 ＋ 带号的差额 ＋ 单位（语气色阶只在 `sense` 点名时上）。 */
function diffHtml(m: CompareColumnsModel): string {
  const tone = m.diffTone === undefined ? '' : ' ' + compareColumnsToneClass(m.diffTone);
  return '<div class="' + compareColumnsSlot('diff') + '">'
    + '<span class="' + compareColumnsSlot('diff-label') + '">' + esc(m.diffLabel) + '</span>'
    + '<b class="' + compareColumnsSlot('diff-value') + ' ' + compareColumnsDirectionClass(m.diffDirection) + tone + '">'
    + '<i aria-hidden="true">' + m.diffGlyph + '</i>' + esc(m.diffText)
    + (m.unit === undefined ? '' : '<small class="' + compareColumnsSlot('unit') + '">' + esc(m.unit) + '</small>')
    + '</b>'
    + '</div>';
}

/** 口径行：左端一枚标签（「口径」）＋ 一句话（这几个窗口到底是什么、差额怎么算的）。 */
function caliberHtml(m: CompareColumnsModel): string {
  if (m.caliber === undefined) return '';
  return '<p class="' + compareColumnsSlot('caliber') + '"><b>' + esc(m.caliberLabel) + '</b>'
    + '<span>' + esc(m.caliber) + '</span></p>';
}

/** 形态 A 的骨架。 */
function renderBackToBack(m: CompareColumnsModel): string {
  const rows = m.rows.map((row) => '<div class="' + compareColumnsSlot('row') + '">'
    + sideHtml(m, 'left', row)
    + '<span class="' + compareColumnsSlot('label') + '">' + esc(row.label) + '</span>'
    + sideHtml(m, 'right', row)
    + '</div>').join('');
  return headHtml(m)
    + '<div class="' + compareColumnsSlot('list') + '">' + rows + '</div>'
    + diffHtml(m)
    + caliberHtml(m);
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<CompareColumnsForm, (m: CompareColumnsModel) => string>> = {
  'back-to-back': renderBackToBack,
};

/** 渲染双列对照（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。
 *  `rows: []` ⇒ **空串**（两窗没有共同项时不留一个空壳；「两边都没有」这句话归调用方自己说）。 */
export function renderCompareColumns(input: unknown): string {
  const m = normalizeCompareColumns(input);
  if (m.rows.length === 0) return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + COMPARE_COLUMNS_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
