/** 备忘域 · **命令声明**（票 #855：本域命令事实的唯一定义地，恰好导出一个数组）。
 *
 * 四条命令（**四写**）：
 *   - `memo.create`／`memo.update`／`memo.remove`／`memo.batch`（写，**不写 `shape`**）：
 *     写命令一律回执形，那件事实的唯一定义地是生成器合成的 `MEMO_DECLARED_SHAPES` 那一行。
 * 出口侧的 `src/cli/registry.ts` 是生成物；加／改命令只碰本件（＋要能被唤醒词命中就在 `routes.ts` 加一条）。
 *
 * #858：`memo.stats`（统计）整条退役——三处全无依据（零唤醒词、HELP 无场景、老技能 21 个子命令无 stats），
 * 属「路由表过度开发」那一面，处置见 #842 Q④；再调按未知键报错（`cmd_read.ts` 的形状表会先拦）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { runBatch, runCreate, runRemove, runUpdate } from './run.js';

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
] satisfies readonly CommandSpec[];
