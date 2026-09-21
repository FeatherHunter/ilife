/** 历史能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 六行对应 `src/policy/wakewords.ts` 里历史六句唤醒词：记录做菜／补录做菜／改评分
 * 进 `chef.history.record`，查看历史／查看统计／体检进 `chef.history.query`。
 * `order` 沿用唤醒词表里的相对顺序（31–36），只保证本文件内有序；全表级顺序
 * 由整包落位票统一到场景表，本票不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例：需菜名的带菜名，
 * 查统计与体检带 `kind`（空库可跑的那一行）。
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
    order: 31,
    wakeWord: '记录做菜',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 32,
    wakeWord: '补录做菜',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 33,
    wakeWord: '改评分',
    key: 'chef.history.record',
    cli: 'chef-cmd-read chef.history.record --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 34,
    wakeWord: '查看历史',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 35,
    wakeWord: '查看统计',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"stats"}\'',
  },
  {
    order: 36,
    wakeWord: '体检',
    key: 'chef.history.query',
    cli: 'chef-cmd-read chef.history.query --params \'{"kind":"quality"}\'',
  },
];
