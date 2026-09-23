/** **薄转出**（目录化批次⑤之后本件不再住实现）。
 *
 *  为什么留着：`src/blocks.ts`／`src/docShell.ts`／`src/help.ts`／`src/contract.ts` 等
 *  （其中两件在并行席位的在途写集里）按 `./controls.js` 取件，`dist/controls.js` 也是既有产物路径。
 *  留一层转出＝它们零改动；出口名与改前逐名相同（13 个）。
 *  实现住 `src/components/controls/**`；等引用迁走即可删本件。
 */
export * from './components/controls/index.js';
