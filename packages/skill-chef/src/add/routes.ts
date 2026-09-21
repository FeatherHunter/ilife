/** 录入能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 两行对应 `src/policy/wakewords.ts` 里归录入的两句唤醒词：录入食谱／加菜都进 `chef.recipe.write`
 *（`preset: { op: 'add' }`）。`order` 取唤醒词表 1-based 下标（20、23），只保证跨域可比；
 * 全表级顺序由场景表定，本文件不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 录入能力的路由声明表：恰好导出一个声明数组。 */
export const ADD_ROUTES: readonly RouteDecl[] = [
  {
    order: 20,
    wakeWord: '录入食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"宫保虾球"}\'',
  },
  {
    order: 23,
    wakeWord: '加菜',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"宫保虾球"}\'',
  },
];
