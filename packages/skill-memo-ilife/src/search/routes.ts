/** 查找域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住**——查找类 7 个场景的词住本件；
 * 其中 `查心愿` 指向的键属心愿域（`memo.wish`），键的事实住 `src/wish/commands.ts`。
 *
 * 顺序：`order` 是全表 0 基位次、跨件唯一且连续（生成器判）；本件接着心愿域那一条往后排。
 * 搬迁节奏：本轮只声明**键已在登记表里**的词；生成期守卫会拦住指向未知键的抢跑。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const SEARCH_ROUTES: readonly RouteDecl[] = [
  {
    order: 1,
    wakeWord: '搜备忘',
    scene: 'memo_search_keyword',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search --params \'{"q":"牛奶"}\'',
  },
  {
    order: 2,
    wakeWord: '查备忘',
    scene: 'memo_search_alias',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search',
  },
  {
    order: 3,
    wakeWord: '看备忘',
    scene: 'memo_get_detail',
    key: 'memo.detail',
    cli: 'memo-cmd-read memo.detail --params \'{"id":1}\'',
    needs: ['id'],
  },
  {
    order: 4,
    wakeWord: '按时间搜备忘',
    scene: 'memo_search_by_date',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search --params \'{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}\'',
    needs: ['start', 'end'],
  },
  {
    order: 5,
    wakeWord: '查打卡',
    scene: 'memo_search_checkin',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search --params \'{"category":"打卡"}\'',
    preset: { category: '打卡' },
  },
  {
    order: 6,
    wakeWord: '查情绪',
    scene: 'memo_search_mood',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search --params \'{"category":"情绪日记"}\'',
    preset: { category: '情绪日记' },
  },
  {
    order: 7,
    wakeWord: '查心愿',
    scene: 'memo_search_wish',
    key: 'memo.wish',
    cli: 'memo-cmd-read memo.wish',
  },
];
