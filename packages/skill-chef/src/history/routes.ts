/** 历史能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 七行对应 `src/policy/wakewords.ts` 里归历史的七句唤醒词：记录做菜／补录做菜／改评分
 * 进 `chef.history.record`，查看历史／查看统计／体检／备份进 `chef.history.query`。
 * `order` 取唤醒词表 1-based 下标（32–37），与全表同序；表序是唯一顺序事实源，本文件不另立顺序。
 * 命令行写法照本表各条的槽位示例：需菜名的带菜名，查统计／体检／备份带 `kind`（空库可跑的那一行）。
 */

/** 历史能力一条路由声明。 */
export interface HistoryRouteDecl {
  readonly order: number;
  readonly wakeWord: string;
  readonly key: string;
  readonly cli: string;
}

/** 历史能力的路由声明表：恰好导出一个声明数组。 */
export const HISTORY_ROUTES: readonly HistoryRouteDecl[] = [
  {
    order: 32,
    wakeWord: '记录做菜',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"辣椒炒肉"}\'',
  },
  {
    order: 33,
    wakeWord: '补录做菜',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"辣椒炒肉"}\'',
  },
  {
    order: 34,
    wakeWord: '改评分',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"辣椒炒肉"}\'',
  },
  {
    order: 35,
    wakeWord: '查看历史',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"name":"辣椒炒肉"}\'',
  },
  {
    order: 36,
    wakeWord: '查看统计',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"stats"}\'',
  },
  {
    order: 37,
    wakeWord: '体检',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"quality"}\'',
  },
  {
    // #841 追加：`备份`沿用本命令 `kind: 'backup'`（页面装配住数据管理域，事实是本技能的查询语义；
    // 故这条只在本域声明一处，`src/data/routes.ts` 不再重复一行——一份事实一个落点）。
    order: 50,
    wakeWord: '备份',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"backup"}\'',
  },
];
