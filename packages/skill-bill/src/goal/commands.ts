/** 目标域的命令声明（**权威源**，两条：写一条、读一条）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从目标域声明（`src/goal/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状：`bill.goal.write` 是写命令（形状恒 `receipt`）、`bill.goal.query` 是读命令
 *     （形状 `list`，取值来自 `base-link-core` 的 `EnvelopeShape`）；
 *   - 可执行示例**照抄即能跑**（两条都在本机临时库上真跑过，退出码 0）；
 *     「看预算」那条给了月份与分类，因为它不需要先有数据就能跑通（空表照出完整页，不当故障）。
 *
 * 一个域里同时放写入口与读入口的结论**写在 `./index.js` 的门注释里**（本域是第一个这一类样本）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，
 *  `src/cli/cmd_read.ts` 一行不动（本票把这两条命令的 `case` 从出口分派里搬进来，见 `./write.js` 与 `./read.js`）。
 *
 *  #1213 迁入（多语言文本外置）：标题与可执行示例不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`goalCommands(language)` 按语言取值。**语言必给**：
 *  本件不兜 `zh`（`GOAL_COMMANDS` 才是 `zh` 那份静态快照，注册表读它）。两条例句 en 与 zh 同值：
 *  示例是可运行的口令原文，译了就跑不通。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG } from '../entries/index.js';
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewGoal } from './read.js';
import { writeGoal } from './write.js';

/** 两条命令的声明（按语言取值；`GOAL_COMMANDS` 是 `zh` 那一份，保持既有形状）。
 *  判别位（kind／key／shape）保持字面量推断：注册表与测试都按它们取。 */
export function goalCommands(language: string) {
  return [
    {
      kind: 'write' as const,
      key: 'bill.goal.write' as const,
      shape: 'receipt' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.goal-write.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'command.goal-write.example'),
      run: writeGoal,
    },
    {
      kind: 'read' as const,
      key: 'bill.goal.query' as const,
      shape: 'list' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.goal-query.title'),
      example: resolve(SKILL_BILL_CATALOG, language, 'command.goal-query.example'),
      run: viewGoal,
    },
  ] satisfies readonly CommandSpec[];
}

export const GOAL_COMMANDS = goalCommands('zh');
