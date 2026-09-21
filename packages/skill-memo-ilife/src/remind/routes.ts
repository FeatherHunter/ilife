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
    // 页落哪一格由 `memo.remind` 的缺省支决定（`run.ts` 的 `sceneOf` 缺省＝看提醒那一格），
    // 故此处**不放 preset**：放一份会让 SKILL.md 速查的示例里多出一个内部参数（`scene`），
    // 也把这条词与运行期路由钉成两处定义。
  },
  {
    order: 9,
    wakeWord: '查已提醒备忘',
    scene: 'memo_completed_reminders',
    key: 'memo.remind',
    cli: 'memo-cmd-read memo.remind --params \'{"mode":"done"}\'',
    // #828 纠错：preset 原写 `{ done: false }` —— 与「已完成视图」的判据（`mode==="done" || done===true`）
    // 正好相反，于是落到 status=active 分支，与 order 8「看提醒」出**同一条命令同一种视图**。
    // 本场景是「已触发的提醒 + 关联打卡笔记 + 触发时间」，权威实现＝`listCompletedReminders`
    // （老 `completed_reminders`），故 preset 改 `{ done: true }`；`scene` 点明页落哪一格（册子 seq 17）。
    preset: { done: true, scene: 'memo_completed_reminders' },
  },
  {
    order: 10,
    wakeWord: '设提醒',
    scene: 'memo_remind_existing',
    key: 'memo.reminder',
    cli: 'memo-cmd-read memo.reminder --params \'{"note_id":15,"content":"该做保养了","remind_at":"2026-10-01 09:00"}\'',
    // #828 纠错：原只声明 `remind_at` 一个槽位，而命令的 `content` 是必填（老 `add_reminder`
    // `memo_cli.py:1116-1117` 逐字「请填入提醒内容」）⇒ 照总表跑必 exit 2。缺什么当场报什么，
    // 不靠人猜；`note_id` 不列入 needs（HELP 场景 45 行写「可选，可不关联具体笔记」）。
    needs: ['content', 'remind_at'],
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
