// 心愿类·能力门（#661）：出口只经这一处取心愿类的对外面。
// 能力目录名取自 HELP 一级分组「心愿类」的英文 id（`src/help/scenes/wish.ts` 的 `id: "wish"`）。
export { WISH_DUE_LABEL, normalizeDue, dueForCategory, dueMatches } from './due.js';
export type { DueFilter } from './due.js';
export { ensureWish, updateWish, removeWish, setWishDue } from './ensure.js';
export type { WishReceipt, WishBatchReceipt, WishWriteResult } from './ensure.js';
export { completeWish } from './complete.js';
export type { CompleteWishInput } from './complete.js';
export { reconcileWishes } from './reconcile.js';
export type { ReconcileCounters, ReconcileReceipt } from './reconcile.js';
