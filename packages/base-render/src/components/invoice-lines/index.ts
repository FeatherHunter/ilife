/** invoice-lines · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderInvoiceLines(input)`（产标记，零 DOM）／`invoiceLinesCss()`（样式段）／
 *  形态闭集 `INVOICE_LINES_FORMS`（`chain` 逐行分解 ／ `waterfall` 瀑布条）／
 *  行类闭集 `INVOICE_LINE_KINDS` 与记号表 `INVOICE_LINES_KIND_MARKS`／类名根 `INVOICE_LINES_CLASS`。
 *  另出四条几何／口径事实、排钱的唯一算法 `formatInvoiceAmount` 与四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  INVOICE_LINES_CLASS,
  INVOICE_LINES_DECIMALS,
  INVOICE_LINES_FORMS,
  INVOICE_LINES_KIND_MARKS,
  INVOICE_LINES_SEGMENT_MIN_PCT,
  INVOICE_LINES_SHARE_WORD,
  INVOICE_LINES_SYMBOL,
  INVOICE_LINES_TOTAL_LABEL,
  INVOICE_LINES_TOTAL_SCALE,
  INVOICE_LINES_WHY_ADD,
  INVOICE_LINES_WHY_CUT,
  INVOICE_LINE_KINDS,
} from './attrs.js';
export type { InvoiceLine, InvoiceLineKind, InvoiceLinesForm, InvoiceLinesInput, InvoiceShare } from './attrs.js';
export { formatInvoiceAmount } from './model.js';
export { renderInvoiceLines } from './render.js';
export { INVOICE_LINES_INDENT_PX, INVOICE_LINES_RULE_PX, invoiceLinesCss } from './style.js';
