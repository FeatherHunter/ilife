/** 提醒域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住**——提醒类场景的词住本件。
 * `记提醒`（场景 `memo_remind_with_note`）指向 `memo.create`，那个键的声明还没落，等 `memo` 域那一片
 * 一起补——生成期守卫「路由指向未知键」会拦住抢跑。
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
  },
  {
    order: 10,
    wakeWord: '设提醒',
    scene: 'memo_remind_existing',
    key: 'memo.reminder',
    cli: 'memo-cmd-read memo.reminder --params \'{"content":"取牛奶","remind_at":"2026-10-01 09:00"}\'',
    needs: ['remind_at'],
  },
];
