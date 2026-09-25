/** 数据管理能力门 ＋ 数据族引擎门：能力对外只经这里（结构纪律铁律一、铁律五）。
 *
 * 对外：命令声明表、路由声明表、历史借道的两路处理与本域独占的批量改取数、
 * #963 数据族两条程序面键的实现（目录 `runDataSchema`／引擎 `runChefDataQuery`）。
 * 引擎函数名带 `Chef` 前缀的理由见 `./query.ts` 件头（旧 `runDataQuery` 是历史借道，不动它）。
 * 处理函数与取数实现不在这里，本门只转出；外边要用本能力的东西，只经这些名字。
 */

export { DATA_COMMANDS } from './commands.js';
export { DATA_ROUTES } from './routes.js';
export { healthCheck, runDataQuery } from './run-query.js';
export { previewDataBatch, runDataBatch } from './run-batch.js';
export { dataBackupPage, dataBatchPage, dataQualityPage } from './pages.js';
export { runDataSchema } from './schema.js';
export { runChefDataQuery } from './query.js';
