/** 开始使用域的命令声明（**权威源**，一条）。
 *
 * 一条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从开始使用域声明（`src/setup/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状：`bill.setup.run` 是写命令（形状恒 `receipt`）。八种 op（初始化／初始化状态／一键备份／
 *     查看备份／恢复备份／导入／查看当前配置／设置当前配置）都由 `preset.op` 分（域声明那一份），页面分三片页型（见 `./params.js`
 *     的 `PAGE_OF_OP`，配置两支走自有模板 `./template-config.js`）；「零决策」的那五条 op 不收参数，故这条命令的 `shape` 不会随 op 变；
 *   - 可执行示例**照抄即能跑**（本机临时库上真跑过，退出码 0）：取「初始化状态」这一支，
 *     它在空库上不需要先有备份或 CSV 就能跑通。
 *
 * #1214：`title`（用户看到的名字）迁进词条层，`setupCommands(language)` 按语言取；
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，
 *  `src/cli/cmd_read.ts` 一行不动（本票把这条命令的 `case` 从出口分派里搬进来，见 `./run.js`）。
 */
import { resolve } from 'base-entries';
import type { CommandSpec } from '../shared/commandSpec.js';
import { SKILL_BILL_CATALOG } from '../entries/index.js';
import { setupRun } from './run.js';

/** 一条写命令的声明（按语言取值；`SETUP_COMMANDS` 是 `zh` 那一份，保持既有形状）。
 *  #1214：标题住 `../entries/{zh,en}.ts`（`command.setup-run.title`），本件按 `language` 取；
 *  可执行示例是 ASCII 参数样例（`op=init-status`），译了就跑不通，故逐字不动。 */
export function setupCommands(language: string): readonly CommandSpec[] {
  return [
    {
      kind: 'write' as const,
      key: 'bill.setup.run' as const,
      shape: 'receipt' as const,
      title: resolve(SKILL_BILL_CATALOG, language, 'command.setup-run.title'),
      example: 'bill-cmd-read bill.setup.run --params \'{"op":"init-status"}\'',
      run: setupRun,
    },
  ];
}

export const SETUP_COMMANDS = setupCommands('zh');
