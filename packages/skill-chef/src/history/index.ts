/** 历史能力门：能力对外只经这里（结构纪律铁律一、铁律五）。
 *
 * 对外四件：命令声明表、路由声明表与两路处理函数（写／查）。类型两件不干活。
 */

export { HISTORY_COMMANDS } from './commands.js';
export type { HistoryCommandSpec } from './commands.js';
export { HISTORY_ROUTES } from './routes.js';
export type { HistoryRouteDecl } from './routes.js';
export { buildHistoryRecord, recordHistory, runHistoryRecord } from './run-record.js';
export { runHistoryQuery, toHistoryItem } from './run-query.js';
