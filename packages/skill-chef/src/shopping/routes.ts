/** 采购能力的路由声明（唤醒词命中哪条命令，声明面唯一一处）。
 *
 * 四行对应 `src/policy/wakewords.ts` 里采购四句唤醒词：生成清单／排除可选／查清单／清空清单
 * 都进 `chef.shopping.query`。`order` 取唤醒词表 1-based 下标（28–31），只保证跨域可比；
 * 全表级顺序由场景表定，本文件不另立顺序。
 * 命令行写法照 `packages/skill-chef/SKILL.md` 同命令示例（空库可跑的那一行）。
 */

import type { RouteDecl } from '../shared/command-spec.js';

/** 采购能力的路由声明表：恰好导出一个声明数组。 */
export const SHOPPING_ROUTES: readonly RouteDecl[] = [
  {
    order: 28,
    wakeWord: '生成清单',
    key: 'chef.shopping.query',
    cli: 'chef-cmd-read chef.shopping.query --params \'{"names":["宫保虾球","鱼香肉丝"]}\'',
  },
  {
    order: 29,
    wakeWord: '排除可选',
    key: 'chef.shopping.query',
    cli: 'chef-cmd-read chef.shopping.query --params \'{"names":["宫保虾球","鱼香肉丝"]}\'',
  },
  {
    order: 30,
    wakeWord: '查清单',
    key: 'chef.shopping.query',
    cli: 'chef-cmd-read chef.shopping.query --params \'{"names":["宫保虾球","鱼香肉丝"]}\'',
  },
  {
    order: 31,
    wakeWord: '清空清单',
    key: 'chef.shopping.query',
    cli: 'chef-cmd-read chef.shopping.query --params \'{"names":["宫保虾球","鱼香肉丝"]}\'',
  },
];
