/** 录入能力的命令声明（权威源：一条命令的事实只住这里）。
 *
 * 本能力即 HELP 一级分组「录入」。`chef.recipe.write` 的事实住这儿——它是写命令的默认面：
 * 缺省 op 即 `add`，且 6 张录入卡对 4 张修改卡，代表唤醒词取 `录入食谱`。
 * 修改域（`src/update/`）的 `修改食谱`／`废弃食谱` 路由到同一 key 时，走本能力门引用 key 名，
 * 不另立第二份声明（铁律二：同一件事只有一个定义地）。
 * 处理函数仍在老分派层（`src/cli/cmd_read.ts`），本票只立声明不搬实现——行为不变，
 * 实现下沉时按 op 切分（add 系归本域、update 系归修改域，见落位对账文档）。
 *
 * 标题与代表唤醒词取 HELP 现成说法，示例照 `packages/skill-chef/SKILL.md` 同命令行照抄。
 */

import type { CommandSpec } from '../shared/command-spec.js';

/** 录入能力的声明表：恰好导出一个声明数组（生成器只认这一个）。写命令不写 `shape`（一律回执形）。 */
export const ADD_COMMANDS: readonly CommandSpec[] = [
  {
    kind: 'write',
    key: 'chef.recipe.write',
    title: '录入食谱',
    wakeWord: '录入食谱',
    example: 'chef-cmd-read chef.recipe.write --params \'{"op":"add","name":"辣椒炒肉"}\'',
  },
];
