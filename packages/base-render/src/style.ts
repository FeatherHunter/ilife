/** **薄转出**（目录化批次⑥之后本件不再住实现）。
 *
 *  为什么留着：`src/blocks.ts`／`src/contract.ts`／`src/docShell.ts`／`src/help.ts` 与
 *  `src/components/controls/helpers-meta.ts` 按 `./style.js`（各级相对路径）取件，
 *  其中两件在并行席位的在途写集里；`dist/style.js` 也是既有产物路径。出口名与改前逐名相同（6 个）。
 *  实现住 `src/components/style/**`；等引用迁走即可删本件。
 */
export * from './components/style/index.js';
