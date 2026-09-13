/** 命令索引（一能力一行）：把各能力目录里的声明汇总成一张查表。
 *
 * 对外两件：`REGISTRY`（key → 声明）与 `REGISTRY_KEYS`（全部键）。
 * 两个分派文件（`cmd_read.ts`／`write.ts`）只认这张表：命中即走能力目录，未命中的老键落各自的 switch。
 *
 * **新加一个能力＝这里多一行**（把它的声明数组放进 `SOURCES`）；新加一条命令则**不必**碰这里。
 * #295 起本文件改由声明确定性生成（配 `gen:check`）；本票（#294）先手写这一行，把接缝落下来。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
// 一能力一行：能力目录对外那道门的声明数组。
import { WEIGHT_COMMANDS } from '../weight/index.js';

const SOURCES: readonly (readonly CommandSpec[])[] = [
  WEIGHT_COMMANDS,
];

/** 汇总各家声明；同键两个人声明即抛（只在代码缺陷时触发，测试随后钉死）。 */
function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {
  const out: Record<string, CommandSpec> = {};
  for (const list of sources) {
    for (const spec of list) {
      if (Object.prototype.hasOwnProperty.call(out, spec.key)) {
        throw new Error('命令键重复登记（两个人声明同一个键）：' + spec.key);
      }
      out[spec.key] = spec;
    }
  }
  return out;
}

export const REGISTRY: Record<string, CommandSpec> = build(SOURCES);

export const REGISTRY_KEYS: readonly string[] = Object.keys(REGISTRY);
