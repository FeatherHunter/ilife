/** 命令索引（一能力一行）：把能力目录里的声明汇总成一张查表。
 *
 * 对外两件：`REGISTRY`（命令名 → 声明）与 `REGISTRY_KEYS`（全部命令名）。
 * 谁在用（两个调用点，指名）：
 *   ① `src/cli/cmd_read.ts`——迁移过的命令先查这张表，命中即走能力目录；未迁移的照旧走它自己的 switch；
 *   ② `src/render/envelope.ts`——迁移过的命令的形状从这张表**运行期派生**（形状事实只住 `commands.ts`）。
 *
 * 本文件**手写**（卡路里那份由它的 `scripts/gen-cli.mjs` 生成）：饼干还没有生成器链，那是后票。
 *
 * **本件是过渡形态**（当前身份，写清楚免得下游误以为有机器拦）：
 *   - 人手写的共用位：**没有生成器、`pnpm gen:check` 管不到它、也没有棘轮**（那三样只住在卡路里件
 *     `scripts/gen-cli.mjs` ＋ `test/` 的棘轮文件里）；「同一条命令被两个人声明」这道去重，今天只由
 *     本件 `build()` 在运行期抛错兜住，手改这张表或往 `cmd_read.ts` 的 switch 里加一行**今天无人拦**。
 *   - 机器拦由**生成器链**那张遗留票接管：它接手时本件改成生成物、由 `pnpm gen:check` 守真，
 *     届时这张表由扫 `src/*\/commands.ts` 派生；在那之前，新加一个能力＝建它的 `commands.ts` 并在
 *     下面 `SOURCES` 加一行；新加一条命令＝改它的声明，本文件不动。
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
