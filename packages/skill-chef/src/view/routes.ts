/** 查看能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 七行对应 `src/policy/wakewords.ts` 里查看七句唤醒词：查看食谱／查看食材／查看步骤／查看营养／
 * 查看背景／看菜谱／看菜都进 `chef.recipe.view`。`order` 取唤醒词表 1-based 下标（5–11），
 * 只保证跨域可比；全表级顺序由场景表定，本文件不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例：需菜名的带菜名（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 查看能力的路由声明表：恰好导出一个声明数组。 */
export const VIEW_ROUTES: readonly RouteDecl[] = [
  {
    order: 5,
    wakeWord: '查看食谱',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 6,
    wakeWord: '查看食材',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 7,
    wakeWord: '查看步骤',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 8,
    wakeWord: '查看营养',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 9,
    wakeWord: '查看背景',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 10,
    wakeWord: '看菜谱',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 11,
    wakeWord: '看菜',
    key: 'chef.recipe.view',
    cli: 'chef-cmd-read chef.recipe.view --params \'{"name":"宫保虾球"}\'',
  },
];
