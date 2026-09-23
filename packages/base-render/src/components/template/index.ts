/** template 组件族出口：由 `src/template.ts` 的 export 行**自动生成**（2 个名字）。
 *
 *  **为什么逐名列**：跨件共用的小件在搬家里必须补 `export`，`export *` 会把它们带出去、
 *  改变 `dist/template.js` 的出口集合。
 */
export { fillTemplate } from './fill.js';
export { TemplateError } from './shared.js';
