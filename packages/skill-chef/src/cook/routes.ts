/** 做菜能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 四行对应 `src/policy/wakewords.ts` 里做菜四句唤醒词：做菜模式／开始做菜／继续做菜／完成做菜
 * 都进 `chef.cooking.run`。`order` 取唤醒词表 1-based 下标（24–27），只保证跨域可比；
 * 全表级顺序由场景表定，本文件不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例：需菜名的带菜名（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 做菜能力的路由声明表：恰好导出一个声明数组。 */
export const COOK_ROUTES: readonly RouteDecl[] = [
  {
    order: 24,
    wakeWord: '做菜模式',
    key: 'chef.cooking.run',
    cli: 'chef-cmd-read chef.cooking.run --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 25,
    wakeWord: '开始做菜',
    key: 'chef.cooking.run',
    cli: 'chef-cmd-read chef.cooking.run --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 26,
    wakeWord: '继续做菜',
    key: 'chef.cooking.run',
    cli: 'chef-cmd-read chef.cooking.run --params \'{"name":"宫保虾球"}\'',
  },
  {
    order: 27,
    wakeWord: '完成做菜',
    key: 'chef.cooking.run',
    cli: 'chef-cmd-read chef.cooking.run --params \'{"name":"宫保虾球"}\'',
  },
];
