/** charts 组件族出口：四件公开名字（`ChartError`／`charts`／`chartsCss`／`buildChartsHelpersJs`）。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 切成一族多件；对外路径与签名一字未动——
 *  根出口照旧，`src/charts.ts` 留薄转出给按 `dist/charts.js` 取件的消费方。
 */
export { ChartError } from './shared.js';
export { charts } from './dispatch.js';
export { chartsCss } from './style.js';
export { buildChartsHelpersJs } from './helpers.js';
