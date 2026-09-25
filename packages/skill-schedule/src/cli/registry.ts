// 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
// 命令索引（一能力一行）：各能力声明汇总成一张 `REGISTRY`（key → 声明）查表。
// 分派层只认这张表：命中即走能力目录；加命令改声明，本文件不动。
import type { CommandSpec } from '../shared/commandSpec.js';
import { ADMIN_COMMANDS } from '../admin/index.js';
import { ANALYZE_COMMANDS } from '../analyze/index.js';
import { DATA_COMMANDS } from '../data/index.js';
import { PLAN_COMMANDS } from '../plan/index.js';
import { QUERY_COMMANDS } from '../query/index.js';
import { WRITE_COMMANDS } from '../write/index.js';
const SOURCES: readonly (readonly CommandSpec[])[] = [ADMIN_COMMANDS, ANALYZE_COMMANDS, DATA_COMMANDS, PLAN_COMMANDS, QUERY_COMMANDS, WRITE_COMMANDS];
export const REGISTRY: Record<string, CommandSpec> = {};
for (const list of SOURCES) for (const s of list) REGISTRY[s.key] = s;
export const REGISTRY_KEYS = Object.keys(REGISTRY).sort();
