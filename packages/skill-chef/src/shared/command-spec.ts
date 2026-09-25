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
      /** #953 · 程序面标记：`'program'`＝这条命令只给程序用——生成器把它从**速查表**与
       *  **唤醒词路由**里跳过（模型看不见）；键表与注册表保留，插件程序照样能调。
       *  缺省＝既有行为，生成结果一字不变。出处：`docs/agents/数据族-规格.md` §七主做法①。 */
      readonly surface?: 'program';
      readonly example: string;
    }
  | {
      readonly kind: 'write';
      readonly key: string;
      readonly title: string;
      readonly wakeWord?: string;
      /** #953 · 程序面标记（口径见上一支）：只给程序用的键不进速查表与路由。 */
      readonly surface?: 'program';
      readonly example: string;
    };

/** 一条路由的声明行形状（各域 `routes.ts` 数组元素的形状）。
 *
 * `order` 取 `WAKE_TABLE`（`src/policy/wakewords.ts`）的 1-based 行号，即「这条路由在唤醒词表里第几行」；
 * 表序是全表唯一的顺序事实源，本字段与表序互为判据（判据住 `docs/skills/skill-chef/t841-登记面对账.mjs`）。
 * #841 起 50 条全部入表 ⇒ 不再有 `order: 0` 的待接入行（此前 `备份`／派生三组／`首次使用`／`批量改`
 * 是入表前的占位）。一句事实只有一个落点：同一短语不在两个域各声明一行（越域共用命令时，
 * 按事实归属选一处，如 `备份` 住历史域、`体检` 也住历史域）。
 */
export interface RouteDecl {
  readonly order: number;
  readonly wakeWord: string;
  readonly key: string;
  readonly cli: string;
}
