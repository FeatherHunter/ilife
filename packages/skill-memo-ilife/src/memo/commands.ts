/** 备忘域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 五条命令（一形四写一读）：
 *   - `memo.create`／`memo.update`／`memo.remove`／`memo.batch`（写，**不写 `shape`**）：
 *     写命令一律回执形，那件事实的唯一定义地是生成器合成的 `MEMO_DECLARED_SHAPES` 那一行；
 *   - `memo.stats`（读，`stat` 形，无唤醒词——命令面处置在 #842，其读口保留在这里登记）。
 * 出口侧的 `src/cli/registry.ts` 是生成物；加／改命令只碰本件（＋要能被唤醒词命中就在 `routes.ts` 加一条）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runBatch, runCreate, runRemove, runStats, runUpdate } from './run.js';

export const MEMO_COMMANDS = [
  {
    kind: 'write',
    key: 'memo.create',
    title: '记备忘',
    wakeWord: '记备忘',
    example: 'memo-cmd-read memo.create --params \'{"title":"买牛奶","category":"备忘"}\'',
    run: runCreate,
  },
  {
    kind: 'write',
    key: 'memo.update',
    title: '改备忘',
    wakeWord: '改备忘',
    example: 'memo-cmd-read memo.update --params \'{"id":1,"body":"买牛奶两盒"}\'',
    run: runUpdate,
  },
  {
    kind: 'write',
    key: 'memo.remove',
    title: '删备忘',
    wakeWord: '删备忘',
    example: 'memo-cmd-read memo.remove --params \'{"id":1,"confirm":true}\'',
    run: runRemove,
  },
  {
    kind: 'write',
    key: 'memo.batch',
    title: '批量改分类',
    wakeWord: '备忘改分类',
    example: 'memo-cmd-read memo.batch --params \'{"fromCategory":"备忘"}\'',
    run: runBatch,
  },
  {
    kind: 'read',
    key: 'memo.stats',
    shape: 'stat',
    title: '统计',
    example: 'memo-cmd-read memo.stats',
    run: runStats,
  },
] satisfies readonly CommandSpec[];
