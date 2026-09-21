/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 唤醒词记录面：1 条（各域 `routes.ts` 的声明按 `order` 升序拼出）。
 * 权威是声明层（`src/<域>/routes.ts`）；本件不含任何顺序知识——顺序事实只住声明的 `order` 字段，
 * 故把记录换文件搬动也不会打乱顺序。运行期路由（`src/triggers/routing.ts`）只读本件。
 */
import type { WakeRoute } from './routeSpec.js';

export const WAKE_ROUTES: readonly WakeRoute[] = [
  { wakeWord: '心愿排期', scene: 'memo_wish_schedule', key: 'memo.wish', cli: 'memo-cmd-read memo.wish' },
];
