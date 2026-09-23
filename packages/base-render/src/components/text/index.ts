/** text 组件族出口：由 `src/text.ts` 的 export 行**自动生成**（3 个名字）。
 *
 *  **为什么逐名列**：跨件共用的小件在搬家里必须补 `export`，`export *` 会把它们带出去、
 *  改变 `dist/text.js` 的出口集合。
 */
export { buildDataText, buildLogText } from './api.js';
export { TextError } from './shared.js';
