/** 单品插件共用件出口：技能出口桥（规格 → 桥 → 异步取数）。
 *
 * 公开面只有三样：契约（类型与常量）、node 二进制解析、桥工厂。
 * 定位器是工厂的内部件，不对外暴露——单品不需要也不该自己定位出口。
 */
export { MAX_STDOUT_BYTES, SPAWN_TIMEOUT_MS } from './contract.js';
export type { HostCallFace, SkillCliBridge, SkillCliErrorCode, SkillCliSpec } from './contract.js';
export { resolveNodeBin } from './node-bin.js';
export type { CliRunOutcome, CliRunFailure } from './node-bin.js';
export { createSkillCliBridge } from './bridge-factory.js';
