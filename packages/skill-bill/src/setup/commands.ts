/** 开始使用域的命令声明（**权威源**，一条）。
 *
 * 一条声明五件事：命令名／形状／标题（用户看到的中文名）／可执行示例／处理函数。
 *   - 代表唤醒词**不在这里**（#721 撤）：按 `key` 从开始使用域声明（`src/setup/declaration.ts`）算，
 *     算法与判据见 `src/triggers/wakeTable.ts` 的 `projectWakeWord`；
 *   - 形状：`bill.setup.run` 是写命令（形状恒 `receipt`）。六种 op（初始化／初始化状态／一键备份／
 *     查看备份／恢复备份／导入）都由 `preset.op` 分（域声明那一份），页面分三片页型（见 `./params.js`
 *     的 `PAGE_OF_OP`）；「零决策」的那四条 op 不收参数，故这条命令的 `shape` 不会随 op 变；
 *   - 可执行示例**照抄即能跑**（本机临时库上真跑过，退出码 0）：取「初始化状态」这一支，
 *     它在空库上不需要先有备份或 CSV 就能跑通。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`src/cli/registry.ts` 由 `pnpm gen` 重生成，
 *  `src/cli/cmd_read.ts` 一行不动（本票把这条命令的 `case` 从出口分派里搬进来，见 `./run.js`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { setupRun } from './run.js';

export const SETUP_COMMANDS = [
  {
    kind: 'write',
    key: 'bill.setup.run',
    shape: 'receipt',
    title: '开始使用',
    example: 'bill-cmd-read bill.setup.run --params \'{"op":"init-status"}\'',
    run: setupRun,
  },
] satisfies readonly CommandSpec[];
