/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * 备忘录命令键表：write 0 条、read 0 条、pre-open 0 条，合计 0 条。
 * 一条命令的事实住它自己的能力目录（`src/<域>/commands.ts`）；本文件只是那几处的派生，不手改。
 * 键序：write → read → pre-open，各段内按键名升序（确定性排序，同一个声明层永远得同一份字节）。
 * `MemoKey` 是键的**编译期约束**：删一条声明而不改指向它的路由声明，`tsc` 当场红（TS2820）。
 */
import type { EnvelopeShape } from 'base-link-core';

export const MEMO_CLI_SOURCES: readonly string[] = [
];

export const MEMO_CLI_KEYS: readonly string[] = [
];

export type MemoKey = string; // 空骨架态：还没有任何命令声明，键联合退化为 string；建起第一个 commands.ts 即自动收窄

export const MEMO_KEY_TITLES: Record<string, string> = {
};

export const MEMO_KEY_SHAPES: Record<string, EnvelopeShape> = {
};

export const MEMO_DOMAIN_KEYS: Record<string, readonly string[]> = {
};
