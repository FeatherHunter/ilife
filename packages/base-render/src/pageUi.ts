/** **薄转出**（目录化批次②之后本件不再住实现）。
 *
 *  为什么留着：`dist/pageUi.js` 这个**产物路径**还有三个消费方按它取件——
 *  `src/docShell.ts`（并行席位在途，不动）、`scripts/判分.mjs`、两个测试
 *  （`two-col-inset-919`／`two-col-align-879`）。留一层转出＝它们零改动。
 *  实现住 `src/components/page-ui/index.ts`；等那三处引用迁到新路径后本件即可删。
 *
 *  注：根出口 `src/index.ts` 已直接指向组件目录，不经本件。
 */
export * from './components/page-ui/index.js';
