/** 查找域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 两条读命令：`memo.search`（列表：关键词／分类／创建时间区间／排期四种过滤）与 `memo.detail`（单条详情）。
 * 出口侧的 `src/cli/registry.ts` 是生成物；加／改命令只碰本件（＋要能被唤醒词命中就在 `routes.ts` 加一条）。
 * `example` 照 `SKILL.md` 速查表那一行，照抄即能跑。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runSearch, runDetail } from './run.js';

export const SEARCH_COMMANDS = [
  {
    kind: 'read',
    key: 'memo.search',
    shape: 'list',
    title: '搜备忘',
    wakeWord: '搜备忘',
    example: 'memo-cmd-read memo.search --params \'{"q":"牛奶"}\'',
    run: runSearch,
  },
  {
    kind: 'read',
    key: 'memo.detail',
    shape: 'detail',
    title: '看备忘',
    wakeWord: '看备忘',
    example: 'memo-cmd-read memo.detail --params \'{"id":1}\'',
    run: runDetail,
  },
] satisfies readonly CommandSpec[];
