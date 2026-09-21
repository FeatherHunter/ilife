/** 提醒域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 一读一写：
 *   - `memo.remind`（读，`list` 形）：提醒四视图（到期／已完成／有效／已废弃）；
 *   - `memo.reminder`（写，**不写 `shape`**）：只 INSERT 提醒行。写命令一律回执形——那件事实的唯一定义地
 *     是生成器合成的 `MEMO_DECLARED_SHAPES` 那一行，声明上再写一遍就是同一件事的第二处定义。
 * 出口侧的 `src/cli/registry.ts` 是生成物；加／改命令只碰本件（＋要能被唤醒词命中就在 `routes.ts` 加一条）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runRemind, runReminder } from './run.js';

export const REMIND_COMMANDS = [
  {
    kind: 'read',
    key: 'memo.remind',
    shape: 'list',
    title: '看提醒',
    wakeWord: '看提醒',
    example: 'memo-cmd-read memo.remind',
    run: runRemind,
  },
  {
    kind: 'write',
    key: 'memo.reminder',
    title: '设提醒',
    wakeWord: '设提醒',
    example: 'memo-cmd-read memo.reminder --params \'{"content":"取牛奶","remind_at":"2026-10-01 09:00"}\'',
    run: runReminder,
  },
] satisfies readonly CommandSpec[];
