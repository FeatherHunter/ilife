/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 唤醒词记录面：40 条（各域 `routes.ts` 的声明按 `order` 升序拼出）。
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
  { wakeWord: '查心愿', scene: 'memo_search_wish', key: 'memo.wish', cli: 'memo-cmd-read memo.wish', preset: { category: '心愿' } },
  { wakeWord: '看提醒', scene: 'memo_reminders_active', key: 'memo.remind', cli: 'memo-cmd-read memo.remind' },
  { wakeWord: '查已提醒备忘', scene: 'memo_completed_reminders', key: 'memo.remind', cli: 'memo-cmd-read memo.remind --params \'{"mode":"done"}\'', preset: { done: false } },
  { wakeWord: '设提醒', scene: 'memo_remind_existing', key: 'memo.reminder', cli: 'memo-cmd-read memo.reminder --params \'{"content":"取牛奶","remind_at":"2026-10-01 09:00"}\'', needs: ['remind_at'] },
  { wakeWord: '记备忘', scene: 'memo_add_basic', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'' },
  { wakeWord: '改备忘', scene: 'memo_update_basic', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"买牛奶两盒"}\'', needs: ['id'] },
  { wakeWord: '删备忘', scene: 'memo_delete_basic', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', needs: ['id'] },
  { wakeWord: '备忘改分类', scene: 'memo_change_category_single', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"category":"打卡"}\'', needs: ['id'] },
  { wakeWord: '备忘改子分类', scene: 'memo_change_subcategory', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"sub":"早起"}\'', needs: ['id'] },
  { wakeWord: '备忘改分类', scene: 'memo_batch_change_category', key: 'memo.batch', cli: 'memo-cmd-read memo.batch --params \'{"fromCategory":"备忘"}\'' },
  { wakeWord: '完成心愿', scene: 'memo_complete_wish', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"done":true}\'', preset: { done: true } },
  { wakeWord: '记心愿', scene: 'memo_add_wish', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"学游泳","category":"心愿"}\'', preset: { category: '心愿' } },
  { wakeWord: '删心愿', scene: 'memo_delete_wish', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', needs: ['id'], preset: { category: '心愿' } },
  { wakeWord: '改心愿', scene: 'memo_update_wish', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"学游泳"}\'', needs: ['id'], preset: { category: '心愿' } },
  { wakeWord: '记打卡', scene: 'memo_add_checkin', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"跑步5公里","category":"打卡"}\'', preset: { category: '打卡' } },
  { wakeWord: '删打卡', scene: 'memo_delete_checkin', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', needs: ['id'], preset: { category: '打卡' } },
  { wakeWord: '改打卡', scene: 'memo_update_checkin', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"跑步5公里"}\'', needs: ['id'], preset: { category: '打卡' } },
  { wakeWord: '记情绪', scene: 'memo_add_mood', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"今天很开心","category":"情绪日记"}\'', preset: { category: '情绪日记' } },
  { wakeWord: '删情绪', scene: 'memo_delete_mood', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', needs: ['id'], preset: { category: '情绪日记' } },
  { wakeWord: '改情绪', scene: 'memo_update_mood', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"今天很开心"}\'', needs: ['id'], preset: { category: '情绪日记' } },
  { wakeWord: '备忘录同步', scene: 'memo_sync_feishu', key: 'memo.sync', cli: 'memo-cmd-read memo.sync' },
  { wakeWord: '首次使用', scene: 'memo_init_setup', key: 'memo.init', cli: 'memo-cmd-read memo.init --params \'{"data":{"items":[{"name":"数据目录","status":"ok"}],"todos":[],"verify":[]}}\'' },
  { wakeWord: '批量改分类', scene: 'memo_batch_change_category', key: 'memo.batch', cli: 'memo-cmd-read memo.batch --params \'{"fromCategory":"备忘"}\'' },
  { wakeWord: '改子分类', scene: 'memo_change_subcategory', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"sub":"早起"}\'', needs: ['id'] },
  { wakeWord: '查提醒', scene: 'memo_reminders_active', key: 'memo.remind', cli: 'memo-cmd-read memo.remind' },
  { wakeWord: '记提醒', scene: 'memo_remind_with_note', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"取牛奶","category":"备忘","remindAt":"2026-10-01 09:00"}\'', needs: ['remindAt'] },
  { wakeWord: '废弃提醒', scene: 'memo_reminders_active', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', preset: { mode: 'abandon' } },
  { wakeWord: '记一条', scene: 'memo_add_basic', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'' },
  { wakeWord: '添加笔记', scene: 'memo_add_basic', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'' },
  { wakeWord: '记情绪日记', scene: 'memo_add_mood', key: 'memo.create', cli: 'memo-cmd-read memo.create --params \'{"title":"今天很开心","category":"情绪日记"}\'', preset: { category: '情绪日记' } },
  { wakeWord: '查情绪日记', scene: 'memo_search_mood', key: 'memo.search', cli: 'memo-cmd-read memo.search --params \'{"category":"情绪日记"}\'', preset: { category: '情绪日记' } },
  { wakeWord: '改情绪日记', scene: 'memo_update_mood', key: 'memo.update', cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"今天很开心"}\'', needs: ['id'], preset: { category: '情绪日记' } },
  { wakeWord: '删情绪日记', scene: 'memo_delete_mood', key: 'memo.remove', cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'', needs: ['id'], preset: { category: '情绪日记' } },
];
