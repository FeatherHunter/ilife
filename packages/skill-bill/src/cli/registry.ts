/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 命令索引（一能力一行）：把能力目录里的声明汇总成一张查表。
 * 对外两件：`REGISTRY`（命令名 → 声明）与 `REGISTRY_KEYS`（全部命令名）。
 * 谁在用（两个调用点，指名）：① `src/cli/cmd_read.ts`——迁移过的命令先查这张表；
 * ② `src/render/envelope.ts`——迁移过的命令的形状从这张表运行期派生。
 * 本次只纳已迁移的六条（写入域两条／查询域四条），其余 10 条仍在过渡表（行为产物不动，本生成器不读写它们）。
 * `combos.yaml` 不在本生成器派生面（跨技能登记禁区，本次不动）。
 * 新加一个能力＝建它的 `commands.ts` 并在该能力 `index.ts` 再导出那个数组；
 * 新加一条命令＝改它的声明加它那个子功能文件，本文件不动。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { QUERY_COMMANDS } from '../query/index.js';
import { RECORD_COMMANDS } from '../write/index.js';

const SOURCES: readonly (readonly CommandSpec[])[] = [
  QUERY_COMMANDS,
  RECORD_COMMANDS,
];

/** 汇总各家声明；同一个命令名两个人声明即抛（只在代码缺陷时触发，生成期已先拦一道）。 */
function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {
  const out: Record<string, CommandSpec> = {};
  for (const list of sources) {
    for (const spec of list) {
      if (Object.prototype.hasOwnProperty.call(out, spec.key)) {
        throw new Error('命令名重复登记（两个人声明同一条命令）：' + spec.key);
      }
      out[spec.key] = spec;
    }
  }
  return out;
}

export const REGISTRY: Record<string, CommandSpec> = build(SOURCES);

export const REGISTRY_KEYS: readonly string[] = Object.keys(REGISTRY);
