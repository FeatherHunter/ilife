/** **薄转出**（目录化批次⑥之后本件不再住实现）。
 *
 *  为什么留着：`dist/template.js` 是既有产物路径，包内与测试都按它取件；
 *  出口名与改前逐名相同。实现住 `src/components/template/**`；等引用迁走即可删本件。
 */
export * from './components/template/index.js';
