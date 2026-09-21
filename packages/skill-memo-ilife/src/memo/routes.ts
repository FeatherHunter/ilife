/** 备忘域 · 路由声明（一个唤醒词一条记录；`order` 是全表顺序权威）。
 *
 * 词面归属（#855 口径）：**词随它服务的 HELP 场景住**——备忘类 6 个场景的词住本件。
 * 打卡／情绪／心愿那三个域的记／删／改词指向 `memo.*` 这三个键，但它们随各自的场景分住
 * `src/checkin/routes.ts`／`src/mood/routes.ts`／`src/wish/routes.ts`（域票的写集才互斥）。
 *
 * 顺序：`order` 全表 0 基位次、跨件唯一且连续（生成器判）；本件接着提醒域（0–10）往后排。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const MEMO_ROUTES: readonly RouteDecl[] = [
  {
    order: 11,
    wakeWord: '记备忘',
    scene: 'memo_add_basic',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'',
  },
  {
    order: 12,
    wakeWord: '改备忘',
    scene: 'memo_update_basic',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"body":"买牛奶两盒"}\'',
    needs: ['id'],
  },
  {
    order: 13,
    wakeWord: '删备忘',
    scene: 'memo_delete_basic',
    key: 'memo.remove',
    cli: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    needs: ['id'],
  },
  {
    order: 14,
    wakeWord: '备忘改分类',
    scene: 'memo_change_category_single',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"category":"打卡"}\'',
    needs: ['id'],
  },
  {
    order: 15,
    wakeWord: '备忘改子分类',
    scene: 'memo_change_subcategory',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"sub":"早起"}\'',
    needs: ['id'],
  },
  {
    order: 16,
    wakeWord: '备忘改分类',
    scene: 'memo_batch_change_category',
    key: 'memo.batch',
    cli: 'memo-cmd-read memo.batch --params \'{"fromCategory":"备忘"}\'',
  },
  // ↓↓ 后 4 行是旧表的别名行（#821 保留 10 作别名）：不是场景主名，但旧行为可路由——
  // 切表必须原样保留，否则是行为变更。别名不上链路总表（#842 Q③，归 #858）。
  {
    order: 29,
    wakeWord: '批量改分类',
    scene: 'memo_batch_change_category',
    key: 'memo.batch',
    cli: 'memo-cmd-read memo.batch --params \'{"fromCategory":"备忘"}\'',
  },
  {
    order: 30,
    wakeWord: '改子分类',
    scene: 'memo_change_subcategory',
    key: 'memo.update',
    cli: 'memo-cmd-read memo.update --params \'{"id":1,"sub":"早起"}\'',
    needs: ['id'],
  },
  {
    order: 34,
    wakeWord: '记一条',
    scene: 'memo_add_basic',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'',
  },
  {
    order: 35,
    wakeWord: '添加笔记',
    scene: 'memo_add_basic',
    key: 'memo.create',
    cli: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'',
  },
];
