/** 修改能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 两行对应 `src/policy/wakewords.ts` 里归修改的两句唤醒词：修改食谱／废弃食谱都进
 * `chef.recipe.write`（`preset` 分别为 `op: 'update'`／`op: 'deprecate'`）。
 * key 名是引用（事实住 `src/add/commands.ts`），本处不定义它。
 * `order` 取唤醒词表 1-based 下标（21–22），只保证跨域可比；全表级顺序由场景表定。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 修改能力的路由声明表：恰好导出一个声明数组。 */
export const UPDATE_ROUTES: readonly RouteDecl[] = [
  {
    order: 21,
    wakeWord: '修改食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"update","name":"宫保虾球"}\'',
  },
  {
    order: 22,
    wakeWord: '废弃食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"deprecate","name":"宫保虾球"}\'',
  },
];
