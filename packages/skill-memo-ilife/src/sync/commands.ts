/** 同步域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 一写一读：
 *   - `memo.sync`（写，**不写 `shape`**）：反向对账（读＋有变更才写）＋ 同步报告页；
 *   - `memo.auth`（读，`receipt` 形，无唤醒词）：飞书授权只读诊断。读命令写 `shape` 是纪律，
 *     `receipt` 形是它今天的回执形状（与 `MEMO_KEY_SHAPES` 既有分配一致）。
 * 出口侧的 `src/cli/registry.ts` 是生成物；加／改命令只碰本件（＋要能被唤醒词命中就在 `routes.ts` 加一条）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runAuth, runSync } from './run.js';

export const SYNC_COMMANDS = [
  {
    kind: 'write',
    key: 'memo.sync',
    title: '备忘录同步',
    wakeWord: '备忘录同步',
    example: 'memo-cmd-read memo.sync',
    run: runSync,
  },
  {
    kind: 'read',
    key: 'memo.auth',
    shape: 'receipt',
    title: '授权诊断',
    example: 'memo-cmd-read memo.auth --params \'{"step":"status"}\'',
    run: runAuth,
  },
] satisfies readonly CommandSpec[];
