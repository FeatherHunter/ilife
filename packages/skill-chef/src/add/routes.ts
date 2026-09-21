/** 录入能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 三行对应 `src/policy/wakewords.ts` 里归录入的三句唤醒词：录入食谱／加菜都进 `chef.recipe.write`
 *（`preset: { op: 'add' }`）；#841 追加的导入食谱同样进这一条（老组名在 #773 已有实现，
 *  此前无词指过来）。`order` 取唤醒词表 1-based 下标：20、23 是原表两句，44 是 #841 追加的那句。
 * 命令行写法照本表各条的槽位示例（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 录入能力的路由声明表：恰好导出一个声明数组。 */
export const ADD_ROUTES: readonly RouteDecl[] = [
  {
    order: 20,
    wakeWord: '录入食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"辣椒炒肉"}\'',
  },
  {
    order: 23,
    wakeWord: '加菜',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"辣椒炒肉"}\'',
  },
  {
    order: 44,
    wakeWord: '导入食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"辣椒炒肉","input":"菜谱.json"}\'',
  },
];
