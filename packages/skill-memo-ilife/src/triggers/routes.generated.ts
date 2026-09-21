/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 唤醒词记录面：8 条（各域 `routes.ts` 的声明按 `order` 升序拼出）。
 * 权威是声明层（`src/<域>/routes.ts`）；本件不含任何顺序知识——顺序事实只住声明的 `order` 字段，
 * 故把记录换文件搬动也不会打乱顺序。运行期路由（`src/triggers/routing.ts`）只读本件。
 */
import type { WakeRoute } from './routeSpec.js';

export const WAKE_ROUTES: readonly WakeRoute[] = [
  { wakeWord: '心愿排期', scene: 'memo_wish_schedule', key: 'memo.wish', cli: 'memo-cmd-read memo.wish' },
  { wakeWord: '搜备忘', scene: 'memo_search_keyword', key: 'memo.search', cli: 'memo-cmd-read memo.search --params \'{"q":"牛奶"}\'' },
  { wakeWord: '查备忘', scene: 'memo_search_alias', key: 'memo.search', cli: 'memo-cmd-read memo.search' },
  { wakeWord: '看备忘', scene: 'memo_get_detail', key: 'memo.detail', cli: 'memo-cmd-read memo.detail --params \'{"id":1}\'', needs: ['id'] },
  { wakeWord: '按时间搜备忘', scene: 'memo_search_by_date', key: 'memo.search', cli: 'memo-cmd-read memo.search --params \'{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}\'', needs: ['start', 'end'] },
  { wakeWord: '查打卡', scene: 'memo_search_checkin', key: 'memo.search', cli: 'memo-cmd-read memo.search --params \'{"category":"打卡"}\'', preset: { category: '打卡' } },
  { wakeWord: '查情绪', scene: 'memo_search_mood', key: 'memo.search', cli: 'memo-cmd-read memo.search --params \'{"category":"情绪日记"}\'', preset: { category: '情绪日记' } },
  { wakeWord: '查心愿', scene: 'memo_search_wish', key: 'memo.wish', cli: 'memo-cmd-read memo.wish' },
];
