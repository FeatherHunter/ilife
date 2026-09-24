/** ledger-rows · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderLedgerRows(input)`（产标记，零 DOM）／`ledgerRowsCss()`（样式段）／
 *  两个闭集常量（`LEDGER_ROW_KINDS`／`LEDGER_LEADERS`）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { LEDGER_LEADERS, LEDGER_ROW_KINDS, renderLedgerRows } from './render.js';
export type { LedgerLeader, LedgerRowInput, LedgerRowKind, LedgerRowsInput } from './render.js';
export { ledgerRowsCss } from './style.js';
