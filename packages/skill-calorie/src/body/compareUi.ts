/** #536 路页内样式（对比族两页共用）：`<style>` 串，由调用方放在 `content` 第一项
 *  （`assembleDocPage` 没有页内 CSS 入口，这是仓内既有的页内样式落法，见 `receiptUi.ts:22`）。
 *
 *  为什么这两页要页内样式：
 *    ① 复制按钮：`style.ts` 的复制区在宽屏把动作排成整行（按钮各占半宽），两页的复制区读起来
 *       像两条长横杠。本件把它们收成「按内容宽、左上对齐」的一排——只改本页，不动公共层。
 *    ② 表格：公共层的表是 `width` 自适应，宽屏下只占内容列的一部分。本页的表是对比的唯一明细，
 *       让两张表在宽屏撑满内容列。
 *  只用仓内既有类名与冻结 token，不新造选择器语义、不新造断点（640 档沿用公共层）。 */

/** 页内样式串。放进 `content` 第一项即可。 */
export function compareUiCss(): string {
  return '<style>'
    // 复制区：按钮按内容宽排成一行（宽屏不再各占半宽）；窄屏照旧可点得开（公共层 820 档给 44px 触摸区）。
    + '@media (min-width: 641px) {'
    + ' .ilife-action-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start}'
    + ' .ilife-action-row{flex:0 0 auto}'
    + ' .ilife-copy-btn,.ilife-copy-btn-wide{width:auto;min-width:132px}'
    + '}'
    // 表格：宽屏撑满内容列；数值列不吃满（读数仍居右对齐）。
    + '.ilife-block-data-table .ilife-block-data-table-table{width:100%}'
    + '.ilife-block-data-table .ilife-block-data-table-cell-right{width:18%}'
    // 页头类型徽章（B 线路 `div.type-badge`）在窄屏掉到 11px，跌出本波「390 档正文类 ≥12px」下线：
    // 本页把它抬到 12px（只改字号，配色与内距仍走公共层那一套）。
    + '@media (max-width: 640px) { .type-badge{font-size:12px} }'
    + '</style>';
}
