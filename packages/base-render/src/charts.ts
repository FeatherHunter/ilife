/** **薄转出**（目录化批次④之后本件不再住实现）。
 *
 *  为什么留着：`dist/charts.js` 这个**产物路径**还有消费方按它取件——`src/blocks.ts`／
 *  `src/docShell.ts`（两件都在并行席位的在途写集里，不动）、`src/style.ts`（其 import 行
 *  被 `test/style.test.mjs:339` 钉着）、以及 5 个测试文件。留一层转出＝它们零改动。
 *  实现住 `src/components/charts/**`；等那些引用迁走即可删本件。
 */
export * from './components/charts/index.js';
