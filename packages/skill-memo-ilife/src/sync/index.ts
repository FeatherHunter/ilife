/** 同步域 · **能力门**（票 #855）：本域对外的唯一一道门。
 *
 * 门规照 `docs/agents/structure.md` 铁律五与 `命令登记纪律.md` 形状一：只转出**跨目录真要用**的名字。
 * 今天两类：① 命令声明 `SYNC_COMMANDS`（生成的 `src/cli/registry.ts` 从门取数组）；
 * ② 飞书链 `runLark`／`larkReady`／`larkSetupInfo`（心愿域的合成写与门禁真在用）——
 * 跨域**只许经门**，不许深引域内实现件（`test/cmd-registry-855.test.mjs` 的「域间零直引」守着）。
 */
export { SYNC_COMMANDS } from './commands.js';
export { LARK_WEBSITE_LINE, LARK_WEBSITE_URL, larkReady, larkSetupInfo, larkTierInfo, runLark } from './feishu.js';
export type { LarkSetupInfo, LarkTier } from './feishu.js';
