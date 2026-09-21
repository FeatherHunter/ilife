// 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
// 命令索引（一能力一行）：分派层只认这张表。新增能力建它的 `commands.ts`
//（恰好导出一个声明数组，生成器扫到即自动进来）；新增命令改它的声明，本文件不动。
import type { HomeCommandSpec } from '../shared/commandSpec.js';
import { EXPRESS_COMMANDS } from '../express/index.js';
import { FAMILY_COMMANDS } from '../family/index.js';
import { ITEM_COMMANDS } from '../items/index.js';
import { OUTFIT_COMMANDS } from '../outfit/index.js';
import { RECEIPT_COMMANDS } from '../receipt/index.js';
import { SPACE_COMMANDS } from '../space/index.js';
import { STATS_COMMANDS } from '../stats/index.js';

const SOURCES: readonly (readonly HomeCommandSpec[])[] = [
  EXPRESS_COMMANDS,
  FAMILY_COMMANDS,
  ITEM_COMMANDS,
  OUTFIT_COMMANDS,
  RECEIPT_COMMANDS,
  SPACE_COMMANDS,
  STATS_COMMANDS,
];

/** 汇总各家声明；同键两个人声明即抛（生成期已先拦一道）。 */
function build(sources: readonly (readonly HomeCommandSpec[])[]): Record<string, HomeCommandSpec> {
  const out: Record<string, HomeCommandSpec> = {};
  for (const list of sources) for (const spec of list) {
    if (out[spec.key]) throw new Error('同键两处声明（运行期）：' + spec.key);
    out[spec.key] = spec;
  }
  return out;
}

export const REGISTRY: Record<string, HomeCommandSpec> = build(SOURCES);
export const REGISTRY_KEYS = Object.keys(REGISTRY).sort();
