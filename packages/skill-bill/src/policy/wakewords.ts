/** #721 · 唤醒词的**过渡薄转出**（跨域词表的形态已消失）。
 *
 * 本件原先是手写的全局词表（77 条 `WAKE_TABLE` ＋ `routeWakeword` ＋ 三个类型）；#684 的定向是
 * 「一件事只有一个书写位」——**词表事实回各域声明**（`src/<域>/declaration.ts`），
 * **合并件与路由逻辑住触发与路由的机器面**（`src/triggers/wakeTable.ts`，住处由 [规格] 目标
 * src/ 形状（#720）定，本票不重开）。
 *
 * 留这一件只为**消费方零改**：今天从 `../policy/index.js` 取 `WAKE_TABLE`／`routeWakeword`／
 * `BillKey` 的三处（`help/lookup.ts`／`help/writeWire.ts`／诸测试）一行不动。
 * `policy/` 的拆散与删除归 #689——那时这几行随桶文件一起删掉，调用方直接改指
 * `../triggers/wakeTable.js`（薄转出件被删，指向它的路径当场消失，不留第二份真相）。
 */
export { WAKE_TABLE, routeWakeword, projectWakeWord, wakeWordOfKind } from '../triggers/wakeTable.js';
export type { BillKey, WakeRoute, WakeEntry, WakeScope } from '../triggers/routeSpec.js';
