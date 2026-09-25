/** #960 · 数据族能力对外的门：命令声明（权威源在 `commands.ts`，这里只是转出）。
 *
 * 对外 1 件：`DATA_COMMANDS`——生成的 `cli/registry.ts` 从这里汇总（命令登记纪律 形状二）。
 * 域内其他件（允许清单 `tables.ts`、目录实现 `schema.ts`、引擎实现 `query.ts`）不出这个目录，故不在这里转出。
 */
export { DATA_COMMANDS } from './commands.js';
