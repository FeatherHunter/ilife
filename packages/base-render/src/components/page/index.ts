/** 页面级形状族出口：三支形状件 ＋ ②b 占位件 ＋ 族样式组装器。
 *
 *  **住址**：目录化批次②把 `src/pageShapes.ts` 拆成「一族一目录、族内一件一文件」：
 *  `fact-strip.ts`／`media.ts`／`timeline.ts` 各是一件（含自己的样式段），
 *  `style.ts` 只做组装，`shared.ts` 是三件共用的小件。对外**一字未动**：
 *  根出口仍出 `FACT_STRIP_MISSING_MARK`／`MEDIA_RATIOS`／`pageShapeCss`／三个 `render*`
 *  与六个类型，`dist/pageShapes.js` 不再产出（包内无第二处引用）。
 */
export * from './fact-strip.js';
export * from './media.js';
export * from './timeline.js';
export * from './style.js';
