// 心愿类·能力门（#661）：出口只经这一处取心愿类的对外面。
// 能力目录名取自 HELP 一级分组「心愿类」的英文 id（`src/help/scenes/wish.ts` 的 `id: "wish"`）。
export { WISH_DUE_LABEL, normalizeDue, dueForCategory, dueMatches } from './due.js';
export type { DueFilter } from './due.js';
export { ensureWish, updateWish, removeWish, setWishDue } from './ensure.js';
export type { WishReceipt, WishBatchReceipt, WishWriteResult } from './ensure.js';
export { completeWish } from './complete.js';
export type { CompleteWishInput } from './complete.js';
export { planWizard, completeWizard } from './wizards.js';
export type { PlanWizardItem, PlanWizardInput, CompleteWizardItem, CompleteWizardInput } from './wizards.js';
export { reconcileWishes } from './reconcile.js';
export type { ReconcileCounters, ReconcileReceipt } from './reconcile.js';
// #829：本域 4 张结果页的装配件——**跨域要真用的那一个**（`src/memo/run.ts` 的三条共用写命令
// 按分类把心愿那一支交给本域出页），故经门转出；纯域内用的件不出门。
export { buildWishReceipt, wishReceiptFor } from './receipt.js';
export type { WishReceiptInput, WishReceiptScene } from './receipt.js';
// #855：本域的命令声明经门转出——生成的 `src/cli/registry.ts` 从**门**取数组（不深引域内实现件）。
export { WISH_COMMANDS } from './commands.js';
// #855：任务链也该出门——同步域的写权限自检（`sync/sentinel.ts`）真在用它；
// 跨域只许经门，深引 `tasks.js`／`taskWrite.js` 即被测试判红。
export { listRelatedTasks } from './tasks.js';
export { completeTask, createTask, deleteTask, updateTask } from './taskWrite.js';
