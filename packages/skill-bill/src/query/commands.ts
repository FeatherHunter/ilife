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
 *
 *  #1209 多语言文本外置：标题与可执行示例不住这里，住 `../entries/zh.ts`（中文基准）与
 *  `../entries/en.ts`（英文列）；`queryCommands(language)` 按语言取值。**语言必给**（#1307）：
 *  本件不兜 `zh`（`QUERY_COMMANDS` 才是 `zh` 那份静态快照）。四条例句 en 与 zh 同值：
 *  示例含可运行的中文样例数据（`--params` 里的日期与 `q`），译了就跑不通。
 */
import { resolve } from 'base-entries';
import type { CommandSpec } from '../shared/commandSpec.js';
import { SKILL_BILL_CATALOG } from '../entries/index.js';
import { viewRecordDetail, viewRecordRange, viewRecordSearch, viewRecordToday } from './read.js';

/** 四条查询命令的声明（按语言取值；`QUERY_COMMANDS` 是 `zh` 那一份，保持既有形状）。 */
export function queryCommands(language: string) {
  return [
    {
      kind: 'read' as const,
      key: 'bill.record.today',
      shape: 'list' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'query.command.today.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'query.command.today.example'),
      run: viewRecordToday,
    },
    {
      kind: 'read' as const,
      key: 'bill.record.range',
      shape: 'list' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'query.command.range.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'query.command.range.example'),
      run: viewRecordRange,
    },
    {
      kind: 'read' as const,
      key: 'bill.record.search',
      shape: 'list' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'query.command.search.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'query.command.search.example'),
      run: viewRecordSearch,
    },
    {
      kind: 'read' as const,
      key: 'bill.record.detail',
      shape: 'detail' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'query.command.detail.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'query.command.detail.example'),
      run: viewRecordDetail,
    },
  ] satisfies readonly CommandSpec[];
}

/** `zh` 静态快照：`src/cli/registry.ts` 只拿它做 key→spec 分派索引，不渲染标题。 */
export const QUERY_COMMANDS = queryCommands('zh');
