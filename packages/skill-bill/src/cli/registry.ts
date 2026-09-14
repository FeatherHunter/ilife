/** 命令索引（一能力一行）：把能力目录里的声明汇总成一张查表。
 *
 * 对外两件：`REGISTRY`（命令名 → 声明）与 `REGISTRY_KEYS`（全部命令名）。
 * 谁在用（两个调用点，指名）：
 *   ① `src/cli/cmd_read.ts`——迁移过的命令先查这张表，命中即走能力目录；未迁移的照旧走它自己的 switch；
 *   ② `src/render/envelope.ts`——迁移过的命令的形状从这张表**运行期派生**（形状事实只住 `commands.ts`）。
 *
 * 本文件**手写**（卡路里那份由它的 `scripts/gen-cli.mjs` 生成）：饼干还没有生成器链，那是后票；
 * 生成器链接手时本文件改成生成物、由 `pnpm gen:check` 守真，届时这张表由扫 `src/*\/commands.ts` 派生。
 * 新加一个能力＝建它的 `commands.ts` 并在下面 `SOURCES` 加一行；新加一条命令＝改它的声明，本文件不动。
 */
import { RECORD_COMMANDS } from '../record/index.js';
import type { CommandSpec } from '../shared/commandSpec.js';

const SOURCES: readonly (readonly CommandSpec[])[] = [
  RECORD_COMMANDS,
];

/** 汇总各家声明；同一个命令名两个人声明即抛（只在代码缺陷时触发）。 */
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
