/** 提醒域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住**——提醒类场景的词住本件。
 * `记提醒`（场景 `memo_remind_with_note`）虽指向 `memo.create`，仍随场景住本件。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const REMIND_ROUTES: readonly RouteDecl[] = [
  {
    order: 8,
    wakeWord: '看提醒',
    scene: 'memo_reminders_active',
    key: 'memo.remind',
    cli: 'memo-cmd-read memo.remind',
  },
  {
    order: 9,
    wakeWord: '查已提醒备忘',
    scene: 'memo_completed_reminders',
    key: 'memo.remind',
    cli: 'memo-cmd-read memo.remind --params \'{"mode":"done"}\'',
    preset: { done: false },
  },
  {
    order: 10,
    wakeWord: '设提醒',
    scene: 'memo_remind_existing',
    key: 'memo.reminder',
    cli: 'memo-cmd-read memo.reminder --params \'{"content":"取牛奶","remind_at":"2026-10-01 09:00"}\'',
    needs: ['remind_at'],
  },
  {
    order: 31,
    wakeWord: '查提醒',
    scene: 'memo_reminders_active',
    key: 'memo.remind',
    cli: 'memo-cmd-read memo.remind',
  },
  {
    order: 32,
    wakeWord: '记提醒',
    scene: 'memo_remind_with_note',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"取牛奶","category":"备忘","remindAt":"2026-10-01 09:00"}\'',
    needs: ['remindAt'],
  },
  // `废弃提醒`：旧表有行、无场景卡（#842 Q②：并入「看提醒」已废弃说明后撤行，归 #858）。
  // 切表必须原样保留（`preset: { mode: 'abandon' }` 走废弃支，不经删确认闸）；#858 撤行时删本条。
  {
    order: 33,
    wakeWord: '废弃提醒',
    scene: 'memo_reminders_active',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    preset: { mode: 'abandon' },
  },
];
