/** 修改能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 四行对应 `src/policy/wakewords.ts` 里归修改的四句唤醒词：修改食谱／废弃食谱都进
 * `chef.recipe.write`（`preset` 分别为 `op: 'update'`／`op: 'deprecate'`）；
 * #841 追加的修改步骤／修改食材同样进这一条，`preset` 带 `target` 分流（`step`／`ingredient`，
 * 这两条 #774 已实现，此前无词指过来）。
 * key 名是引用（事实住 `src/add/commands.ts`），本处不定义它。
 * `order` 取唤醒词表 1-based 下标：21–22 是原表两句，42–43 是 #841 追加的两句（表尾按域归组）。
 * 命令行写法照本表各条的槽位示例（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 修改能力的路由声明表：恰好导出一个声明数组。 */
export const UPDATE_ROUTES: readonly RouteDecl[] = [
  {
    order: 21,
    wakeWord: '修改食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"update","name":"辣椒炒肉"}\'',
  },
  {
    order: 22,
    wakeWord: '废弃食谱',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"deprecate","name":"辣椒炒肉"}\'',
  },
  {
    order: 42,
    wakeWord: '修改步骤',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"update","target":"step","name":"辣椒炒肉","step":2,"action":"大火翻炒"}\'',
  },
  {
    order: 43,
    wakeWord: '修改食材',
    key: 'chef.recipe.write',
    cli: 'chef-cmd-read chef.recipe.write --params \'{"op":"update","target":"ingredient","name":"辣椒炒肉","ingredient":"盐","quantity":8}\'',
  },
];
