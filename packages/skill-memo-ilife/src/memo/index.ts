/** 备忘域 · **能力门**（票 #855）：本域对外的唯一一道门。
 *
 * 门规照 `docs/agents/structure.md` 铁律五与 `命令登记纪律.md` 形状一：只转出**跨目录真要用**的名字。
 * 今天两类：① 命令声明 `MEMO_COMMANDS`（生成的 `src/cli/registry.ts` 从门取数组）；
 * ② 分类词表本身 `WAKE_TOPS`（触发位展开子唤醒词用它）与归一化 `normalizeTop`（查找域按分类过滤用它）——
 * 跨域**只许经门**，不许深引域内实现件（`test/cmd-registry-855.test.mjs` 的「域间零直引」守着）。
 */
export { MEMO_COMMANDS } from './commands.js';
export { WAKE_TOPS, normalizeTop } from './category.js';
