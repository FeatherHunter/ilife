/** 心愿域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住** —— 心愿类 5 个场景的词都住本件，
 * 哪怕它们指向的键属别的域（如 `完成心愿` → `memo.update`，键的事实住 `src/memo/commands.ts`）。
 * 这样 8 张域票的写集才逐个域互斥（照 `t820-图重设计-第一性.md` 的独占写集判据）。
 *
 * 搬迁节奏（#855）：本件随本域一起落；本轮先声明**键已在登记表里**的词（`memo.wish`），
 * 其余 4 个词（完成心愿／记心愿／删心愿／改心愿）等 `memo` 域的声明落地后同批补入——
 * 生成期守卫「路由指向未知键」会拦住抢跑，故不许先写空指向。
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
];
