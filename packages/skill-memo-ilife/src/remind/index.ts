/** 提醒域 · **能力门**（票 #855）：本域对外的唯一一道门。
 *
 * 门规照 `docs/agents/structure.md` 铁律五与 `命令登记纪律.md` 形状一：只转出**跨目录真要用**的名字。
 * 今天两类：① 命令声明 `REMIND_COMMANDS`（生成的 `src/cli/registry.ts` 从门取数组）；
 * ② 备忘域与心愿域真在用的三个写参数解析 ＋ 一条废弃（`memo.remove` 的 `abandon` 支和心愿写要它们）——
 * 跨域**只许经门**，不许深引域内实现件（`test/cmd-registry-855.test.mjs` 的「域间零直引」守着）。
 */
export { REMIND_COMMANDS } from './commands.js';
export { normalizeRemindAt, normalizeRepeatRule, normalizeRepeatType } from './policy.js';
export { abandonReminder } from './store.js';
