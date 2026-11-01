/** 账户域的命令声明（**权威源**，两条）。
 *
 * 每条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从账户域声明（`src/account/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状：`bill.account.write` 是写命令（形状恒 `receipt`）、`bill.account.query` 是读命令
 *     （形状 `list`，取值来自 `base-link-core` 的 `EnvelopeShape`）；
 *   - 可执行示例**照抄即能跑**（两条都在本机临时库上真跑过，退出码 0）；
 *     「改账户」那条示例取「缺项出确认页」这一支，因为在空库上它不需要先有账户就能跑通；
 *     带 `name` 的改名那一支要先在账户表里注册过那个账户。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，
 *  `src/cli/cmd_read.ts` 一行不动（本票把这两条命令的 `case` 从出口分派里搬进来，见 `./write.js` 与 `./read.js`）。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG } from '../entries/index.js';
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewAccountSummary } from './read.js';
import { writeAccount } from './write.js';

/** 两条账户命令的声明（按语言取值；`ACCOUNT_COMMANDS` 是 `zh` 那一份静态快照）。
 *  #1212：标题外置到 `../entries/zh.ts`／`en.ts`，按语言取；示例不含中文，两句同值不建键。 */
export function accountCommands(language: string) {
  return [
    {
      kind: 'write' as const,
      key: 'bill.account.write' as const,
      shape: 'receipt' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.account-write.title'),
      example: 'bill-cmd-read bill.account.write --params \'{"op":"add"}\'',
      run: writeAccount,
    },
    {
      kind: 'read' as const,
      key: 'bill.account.query' as const,
      shape: 'list' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.account-query.title'),
      example: 'bill-cmd-read bill.account.query',
      run: viewAccountSummary,
    },
  ] satisfies readonly CommandSpec[];
}

export const ACCOUNT_COMMANDS = accountCommands('zh');
