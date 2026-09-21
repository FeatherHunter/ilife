/** 搜索筛选能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 十二行对应 `src/policy/wakewords.ts` 里搜索筛选十二句唤醒词：查看全部／搜索食谱／搜菜／查食材／
 * 筛选菜系／筛选食材／筛选口味／筛选季节（#771 落位）＋ 筛选难度／筛选时间／筛选炊具／筛选状态
 * （#841 补齐的四条老组名）。`order` 取唤醒词表 1-based 下标，本域不在表内连续：
 * 12–19 是原表里那八句，38–41 是 #841 追加的四句（表尾按域归组，见 `wakewords.ts` 的段注）。
 * 全表级顺序由唤醒词表定，本文件不另立顺序；`order` 是「我在表里第几行」，与表序互为判据
 * （判据住 `t841-登记面对账.mjs`）。
 * 命令行写法照本表各条的槽位示例（空库可跑的那一行）。
 *
 * #771：筛选食材→`ingredient`、筛选口味→`flavor`、筛选季节→`season`（各用显式键，不再经
 * `filter` 绕 `cuisine`）；筛选菜系仍走 `filter`（别名落 `cuisine`，与既有测试与 HELP 示例对齐）。
 * #841：追加的四条同理各用显式键（`difficulty`／`time_max`／`cookware`／`status`），经 `filter` 绕道会让
 * 「按炊具筛」打到菜系维度上。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 搜索筛选能力的路由声明表：恰好导出一个声明数组。 */
export const SEARCH_ROUTES: readonly RouteDecl[] = [
  {
    order: 12,
    wakeWord: '查看全部',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"kind":"all"}\'',
  },
  {
    order: 13,
    wakeWord: '搜索食谱',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"q":"排骨"}\'',
  },
  {
    order: 14,
    wakeWord: '搜菜',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"q":"排骨"}\'',
  },
  {
    order: 15,
    wakeWord: '查食材',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"q":"排骨"}\'',
  },
  {
    order: 16,
    wakeWord: '筛选菜系',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"filter":"川菜"}\'',
  },
  {
    order: 17,
    wakeWord: '筛选食材',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"ingredient":"五花肉"}\'',
  },
  {
    order: 18,
    wakeWord: '筛选口味',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"flavor":"辣"}\'',
  },
  {
    order: 19,
    wakeWord: '筛选季节',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"season":"夏"}\'',
  },
  {
    order: 38,
    wakeWord: '筛选难度',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"difficulty":"简单"}\'',
  },
  {
    order: 39,
    wakeWord: '筛选时间',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"time_max":30}\'',
  },
  {
    order: 40,
    wakeWord: '筛选炊具',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"cookware":"炒锅"}\'',
  },
  {
    order: 41,
    wakeWord: '筛选状态',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"status":"已做"}\'',
  },
];
