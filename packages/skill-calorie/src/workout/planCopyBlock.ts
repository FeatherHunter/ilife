/** T351 · 健身计划族的复制区装配：**实现已迁 `src/shared/planCopyBlock.ts`**（共用位，规则见
 *  `docs/agents/structure.md`「共用位里不许出现任何一个能力的名字」）。
 *
 * 本件留**薄转出**：既有四个调用方（`workout/receipt.ts`／`workout/planEditorDocs.ts`／
 * `render/workoutPlanDocs.ts`／`render/planWizardDocs.ts`）与测试件仍按原地址
 * `./planCopyBlock.js` 取用，一行都不用改；正本件被删时本转出当场失效（不认手写清单）。
 */
export { planCopyBlock } from '../shared/planCopyBlock.js';
