/** 查询域的命令声明（**权威源**，四条）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从查询域声明（`src/query/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状取 `base-link-core` 的表里形状：`list`＝列表页、`detail`＝单条详情页；
 *   - 可执行示例**照抄即能跑**：四条都在临时库上真跑过、退出码 0，前提是库里已有记录
 *     （查询与写命令不同——空库里 `range`／`detail` 按红线阻断，出不了「查到东西」的页）。
 *     本票用的是 `test/cli.test.mjs` 那四笔样本（2026-09-06 两笔、2026-09-01 一笔、2026-08-06 一笔）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，`src/cli/cmd_read.ts` 一行不动。
 * 本票只登记**命令**：17 条唤醒词到这几条命令的路由住 `src/query/declaration.ts`（词表由各域声明合并得出）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewRecordDetail, viewRecordRange, viewRecordSearch, viewRecordToday } from './read.js';

export const QUERY_COMMANDS = [
  {
    kind: 'read',
    key: 'bill.record.today',
    shape: 'list',
    title: '查今天',
    example: 'bill-cmd-read bill.record.today --params \'{"date":"2026-09-06"}\'',
    run: viewRecordToday,
  },
  {
    kind: 'read',
    key: 'bill.record.range',
    shape: 'list',
    title: '查区间',
    example: 'bill-cmd-read bill.record.range --params \'{"start":"2026-09-01","end":"2026-09-30"}\'',
    run: viewRecordRange,
  },
  {
    kind: 'read',
    key: 'bill.record.search',
    shape: 'list',
    title: '搜备注',
    example: 'bill-cmd-read bill.record.search --params \'{"q":"午饭"}\'',
    run: viewRecordSearch,
  },
  {
    kind: 'read',
    key: 'bill.record.detail',
    shape: 'detail',
    title: '查账单详情',
    example: 'bill-cmd-read bill.record.detail --params \'{"id":1}\'',
    run: viewRecordDetail,
  },
] satisfies readonly CommandSpec[];
