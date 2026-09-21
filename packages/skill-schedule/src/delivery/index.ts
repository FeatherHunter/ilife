/** 交付面的能力门：出口 `src/cli/cmd_read.ts` 只从这里取交付面那三件东西。
 *  - `deliverHtml`／`HtmlDelivery`——本包写 HTML 文件的唯一出口（页面与 HELP 一条链）；
 *  - `pageStemFor`——产物文件名主体的唯一定义地（`./naming.ts`）。
 *  落点目录算法不在这里：它住 `src/fetch/paths.ts`（全部落点算式的唯一定义地）。 */
export { deliverHtml } from './output.js';
export type { HtmlDelivery } from './output.js';
export { pageStemFor, SCHEDULE_SKILL_NAME } from './naming.js';
