/** 备忘域 · **能力门**（票 #855）：本域对外的唯一一道门。
 *
 * 门规照 `docs/agents/structure.md` 铁律五与 `命令登记纪律.md` 形状一：只转出**跨目录真要用**的名字。
 * 今天只有命令声明 `MEMO_COMMANDS` 一个——生成的 `src/cli/registry.ts` 从门取数组；
 * 域内互相用的东西（`run.ts` 的五个处理函数与辅助件）**不出这个门**。
 */
export { MEMO_COMMANDS } from './commands.js';
