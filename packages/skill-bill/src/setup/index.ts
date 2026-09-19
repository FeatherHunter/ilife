/** 开始使用域对外的门：**命令声明**（权威源在 `./commands.ts`，这里只是转出）。
 *
 * 与账户域同形（`../account/index.ts`）：出口分派只要一条命令的 `run`，故本域不再多转一个入口函数；
 * 域内其他件（六件场景件、三片页型件、`./params.js`／`./backups.js`／`./status.js`／`./importer.js`／
 * `./steps.js`／`./pageParts.js`／`./run.js`）**不出这个目录**，不在这里转出。
 */
export { SETUP_COMMANDS } from './commands.js';
