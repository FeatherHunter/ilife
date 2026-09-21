/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 命令索引（一域一行）：把各域门里的声明数组汇成一张查表。
 * 对外两件：`REGISTRY`（键 → 声明）与 `REGISTRY_KEYS`（全部键，顺序与 `keys.ts` 的 `MEMO_CLI_KEYS` 同）。
 * 分派层只认这张表：命中即走该域的处理函数；**新加一个能力＝建它的 `commands.ts`**（扫到即自动进来）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { SEARCH_COMMANDS } from '../search/index.js';
import { WISH_COMMANDS } from '../wish/index.js';

const SOURCES: readonly (readonly CommandSpec[])[] = [
  SEARCH_COMMANDS,
  WISH_COMMANDS,
];

/** 汇总各家声明；同键两个人声明即抛（生成期已先拦一道，这里再拦运行期那一刀）。 */
function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {
  const out: Record<string, CommandSpec> = {};
  for (const list of sources) {
    for (const spec of list) {
      if (Object.prototype.hasOwnProperty.call(out, spec.key)) throw new Error('命令键重复登记（两个人声明同一个键）：' + spec.key);
      out[spec.key] = spec;
    }
  }
  return out;
}

export const REGISTRY: Record<string, CommandSpec> = build(SOURCES);

export const REGISTRY_KEYS: readonly string[] = Object.keys(REGISTRY);
