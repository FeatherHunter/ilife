/** #961 · 数据族能力对外的门：命令声明与路由占位（权威源在 `commands.ts`／`routes.ts`，这里只是转出）。
 *
 * 对外 2 件：`DATA_COMMANDS`（生成的 `cli/registry.ts` 从这里汇总）＋`DATA_ROUTES`
 * （空数组占位，生成的 `triggers/routes.generated.ts` 从这里汇总，程序面键无路由）。
 * 域内其他件（允许清单 `tables.ts`、目录实现 `schema.ts`、引擎实现 `query.ts`）不出这个目录，
 * 故不在这里转出。
 */
export { DATA_COMMANDS } from './commands.js';
export { DATA_ROUTES } from './routes.js';
