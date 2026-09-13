/** 尚未搬迁的命令的声明形状（`#295` 起住在 `src/cli/legacyCommands.ts`，`#313` 起改住本目录）。
 *
 * 一个命令的声明要么在这里的场景文件里、要么在它自己能力目录的 `commands.ts` 里，**恰一处**
 * （铁律二）；两处都声明即生成期抛（`scripts/gen-cli.mjs` 的 `merge()`）。
 */
import type { EnvelopeShape } from "base-link-core";

/** 一条未搬迁命令的声明：命令名／形状／标题／代表唤醒词／可执行示例（读写由 `kind` 分）。 */
export interface LegacyCommandDecl {
  readonly kind: 'read' | 'write';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  readonly wakeWord?: string;
  readonly example: string;
}
