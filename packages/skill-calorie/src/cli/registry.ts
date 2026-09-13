/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 命令索引（一能力一行）：把各能力目录里的声明汇总成一张查表。
 * 对外两件：`REGISTRY`（key → 声明）与 `REGISTRY_KEYS`（全部键）。
 * 两个分派文件（`cmd_read.ts`／`write.ts`）只认这张表：命中即走能力目录，未命中的老键落各自的 switch。
 *
 * **新加一个能力＝建它的 `commands.ts`**（扫到即自动进来）；新加一条命令＝改它的声明，本文件不动。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { WEIGHT_COMMANDS } from '../weight/index.js';

const SOURCES: readonly (readonly CommandSpec[])[] = [
  WEIGHT_COMMANDS,
];

/** 汇总各家声明；同键两个人声明即抛（只在代码缺陷时触发，生成期已先拦一道）。 */
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
