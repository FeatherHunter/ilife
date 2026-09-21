/** 搜索筛选能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 八行对应 `src/policy/wakewords.ts` 里搜索筛选八句唤醒词：查看全部／搜索食谱／搜菜／查食材／
 * 筛选菜系／筛选食材／筛选口味／筛选季节都进 `chef.recipe.search`。`order` 取唤醒词表 1-based
 * 下标（12–19），只保证跨域可比；全表级顺序由场景表定，本文件不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例（空库可跑的那一行）。
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
    cli: 'chef-cmd-read chef.recipe.search --params \'{"filter":"川菜"}\'',
  },
  {
    order: 18,
    wakeWord: '筛选口味',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"filter":"川菜"}\'',
  },
  {
    order: 19,
    wakeWord: '筛选季节',
    key: 'chef.recipe.search',
    cli: 'chef-cmd-read chef.recipe.search --params \'{"filter":"川菜"}\'',
  },
];
