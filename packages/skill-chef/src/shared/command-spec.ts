/** 整包命令声明与路由声明的形状唯一定义地（#839 整包落位票统一；票 1 试点时各域本地最小定义，见 t766-形状.md）。
 *
 * 为什么住这儿：9 个新域的 `commands.ts`／`routes.ts` 是同一件事实的九处落点，
 * 行形状（六字段／四字段）若各写一份，迟早走散（铁律二）。本件只定形状、不断言内容：
 * 内容的权威仍是各域自己的声明数组；生成器（`scripts/gen-cli.mjs`）读源码文本，
 * 与类型名无关，加本件不影响派生链。历史域两件（票 1 试点）按本票报备的“零改动一字不动”
 * 保留本地同形类型（形状一致、生成器无感），后续域票顺手摆正，不在本票动它。
 *
 * 字段口径照命令登记纪律形状一：会改数据库的命令不写 `shape`（一律回执形，
 * 那件事实的唯一定义地是生成器合成的 `src/cli/keys.ts`）；查询命令写 `shape`。
 * 代表唤醒词与可执行示例须是真词真串：代表词进 `src/policy/wakewords.ts` 的那张表即命中同命令，
 * 示例照 `packages/skill-chef/SKILL.md` 的同命令行照抄。
 */

import type { EnvelopeShape } from 'base-link-core';

/** 一条命令的声明行形状（各域 `commands.ts` 数组元素的形状）。 */
export type CommandSpec =
  | {
      readonly kind: 'read';
      readonly key: string;
      readonly shape: EnvelopeShape;
      readonly title: string;
      readonly wakeWord?: string;
      readonly example: string;
    }
  | {
      readonly kind: 'write';
      readonly key: string;
      readonly title: string;
      readonly wakeWord?: string;
      readonly example: string;
    };

/** 一条路由的声明行形状（各域 `routes.ts` 数组元素的形状）。
 *
 * `order` 取 `WAKE_TABLE` 的 1-based 下标（跨域可比，全表级顺序由场景表定）；
 * 暂未入表的短语（`备份`／派生三组／`首次使用`）取 `order: 0` 并在行注释写明待接入，
 * 对账脚本认 `order: 0` 为 tbd 行（`key: 'tbd'` 或注释点名去向）。
 */
export interface RouteDecl {
  readonly order: number;
  readonly wakeWord: string;
  readonly key: string;
  readonly cli: string;
}
