/** 心愿域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住** —— 心愿类 5 个场景的词都住本件，
 * 哪怕它们指向的键属别的域（如 `完成心愿` → `memo.update`，键的事实住 `src/memo/commands.ts`）。
 * 这样 8 张域票的写集才逐个域互斥（照 `t820-图重设计-第一性.md` 的独占写集判据）。
 *
 * 搬迁节奏（#855）：本件 5 词齐（`memo` 域声明落地后补入后 4 行）；生成期守卫「路由指向未知键」
 * 会拦住抢跑，故只写键已在登记表里的词。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const WISH_ROUTES: readonly RouteDecl[] = [
  {
    order: 0,
    wakeWord: '心愿排期',
    scene: 'memo_wish_schedule',
    key: 'memo.wish',
    cli: 'memo-cmd-read memo.wish',
  },
  // ↓↓ 本件后 4 行：心愿类其余 4 个场景的词（键属备忘域，词随场景住本件；`memo` 域声明落地后同批补入）。
  // 完成心愿走 `memo.update` 的 `done:true` 分支（与旧路由表 `preset: { done: true }` 同义）；
  // 记／删／改心愿三条的分类预设与 `preset: { category: '心愿' }` 同义。
  {
    order: 17,
    wakeWord: '完成心愿',
    scene: 'memo_complete_wish',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"done":true}\'',
    preset: { done: true },
  },
  {
    order: 18,
    wakeWord: '记心愿',
    scene: 'memo_add_wish',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"学游泳","category":"心愿"}\'',
    preset: { category: '心愿' },
  },
  {
    order: 19,
    wakeWord: '删心愿',
    scene: 'memo_delete_wish',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    needs: ['id'],
    preset: { category: '心愿' },
  },
  {
    order: 20,
    wakeWord: '改心愿',
    scene: 'memo_update_wish',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"学游泳"}\'',
    needs: ['id'],
    preset: { category: '心愿' },
  },
  // #858 补入本场景的**别名** `完成打卡`（老 `SKILL.md:262`／`:300` 登记的词）：住 HELP 资产的
  // `aliases`（`src/help/scenes/wish.ts`）、不进联动速查，但按词要能路由到同一格——`t855-验收-命令自治.mjs`
  // 的 `PENDING_WORDS` 把它挂在「#858 别名总表」名下。
  {
    order: 41,
    wakeWord: '完成打卡',
    scene: 'memo_complete_wish',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"done":true}\'',
    preset: { done: true },
  },
];
