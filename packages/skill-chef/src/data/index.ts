/** 数据管理能力门：能力对外只经这里（结构纪律铁律一、铁律五）。
 *
 * 对外两件：命令声明表（暂空，事实住 `history`）与路由声明表。处理函数与取数实现不在这里，
 * 本票只立声明；外边要用数据管理能力的东西，只经这两个名字。
 */

export { DATA_COMMANDS } from './commands.js';
export { DATA_ROUTES } from './routes.js';
export { healthCheck, runDataQuery } from './run-query.js';
