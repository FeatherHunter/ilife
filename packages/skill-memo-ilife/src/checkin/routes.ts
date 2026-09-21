/** 打卡域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 本域**没有自己的命令键**：记／删／改打卡三条走备忘域的 `memo.create`／`memo.remove`／`memo.update`
 *（键的事实住 `src/memo/commands.ts`）。词随它服务的 HELP 场景住本件——这就是本域在 #855 里的全部交付；
 * 命令实现与页面的活归各属主域与 #830（本件不重复那份事实）。
 *
 * #830（端到端那趟）对本件只动了两件事：① 示例的参数名改认 **HELP 的字段名**（`content`／`sub_category`，
 * 出处 `t837-命令面口径.md` §实施约束「字段名以 HELP 为准，不自造第二个说法」——等价关系由备忘域的
 * 字段政策一处实现，见 `src/memo/crud.ts`）；② 三条路由的键、槽位与预设逐字未改（诊断实测三条全通）。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const CHECKIN_ROUTES: readonly RouteDecl[] = [
  {
    order: 21,
    wakeWord: '记打卡',
    scene: 'memo_add_checkin',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"content":"跑步5公里","category":"打卡","sub_category":"跑步"}\'',
    preset: { category: '打卡' },
  },
  {
    order: 22,
    wakeWord: '删打卡',
    scene: 'memo_delete_checkin',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    needs: ['id'],
    preset: { category: '打卡' },
  },
  {
    order: 23,
    wakeWord: '改打卡',
    scene: 'memo_update_checkin',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"content":"跑步6公里"}\'',
    needs: ['id'],
    preset: { category: '打卡' },
  },
];
