/** 心愿域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 一条命令的六件事都写在这里：`kind`／`key`／`shape`／`title`／代表唤醒词／可执行示例 ＋ 处理函数。
 * 出口侧的 `src/cli/registry.ts` 是**生成物**（由 `scripts/gen-cli.mjs` 从本件派生），分派只认那张表；
 * 加一条命令＝改本件那一行（＋要能被唤醒词命中就在 `routes.ts` 加一条声明），别处不动。
 *
 * `example` 必须**照抄即能跑**：本行照 `SKILL.md` 速查表那一行。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runWish } from './run.js';

export const WISH_COMMANDS = [
  {
    kind: 'read',
    key: 'memo.wish',
    shape: 'list',
    title: '心愿排期',
    wakeWord: '心愿排期',
    example: 'memo-cmd-read memo.wish',
    run: runWish,
  },
] satisfies readonly CommandSpec[];
