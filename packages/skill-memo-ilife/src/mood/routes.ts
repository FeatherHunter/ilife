/** 情绪域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 本域**没有自己的命令键**：记／删／改情绪三条走备忘域的 `memo.create`／`memo.remove`／`memo.update`
 *（键的事实住 `src/memo/commands.ts`）。词随它服务的 HELP 场景住本件——这就是本域在 #855 里的全部交付；
 * 命令实现与页面的活归各属主域与 #831（本件不重复那份事实）。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const MOOD_ROUTES: readonly RouteDecl[] = [
  {
    order: 24,
    wakeWord: '记情绪',
    scene: 'memo_add_mood',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"今天很开心","category":"情绪日记"}\'',
    preset: { category: '情绪日记' },
  },
  {
    order: 25,
    wakeWord: '删情绪',
    scene: 'memo_delete_mood',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    needs: ['id'],
    preset: { category: '情绪日记' },
  },
  {
    order: 26,
    wakeWord: '改情绪',
    scene: 'memo_update_mood',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"今天很开心"}\'',
    needs: ['id'],
    preset: { category: '情绪日记' },
  },
  // ↓↓ 后 4 行是旧表的长式别名（#821 保留作别名）：与短式主名同场景，`needs`／`preset` 与旧表逐字一致。
  // 最长匹配保证长式优先命中；别名不上链路总表（#842 Q③，归 #858）。
  {
    order: 36,
    wakeWord: '记情绪日记',
    scene: 'memo_add_mood',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"今天很开心","category":"情绪日记"}\'',
    preset: { category: '情绪日记' },
  },
  {
    order: 37,
    wakeWord: '查情绪日记',
    scene: 'memo_search_mood',
    key: 'memo.search',
    cli: 'memo-cmd-read memo.search --params \'{"category":"情绪日记"}\'',
    preset: { category: '情绪日记' },
  },
  {
    order: 38,
    wakeWord: '改情绪日记',
    scene: 'memo_update_mood',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"今天很开心"}\'',
    needs: ['id'],
    preset: { category: '情绪日记' },
  },
  {
    order: 39,
    wakeWord: '删情绪日记',
    scene: 'memo_delete_mood',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    needs: ['id'],
    preset: { category: '情绪日记' },
  },
];
