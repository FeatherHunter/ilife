---
'skill-calorie': patch
---

#393 纯搬迁：`render/dietDocs.ts` 按页面类拆进 `src/diet/`，行为逐字节不变。

- 新件四件（只搬函数体与注释，不改逻辑与文案）：`diet/todayDocs.ts`（`buildTodayDietDoc`）／`diet/reviewDocs.ts`（`buildDietReviewDoc`）／`diet/rankingDocs.ts`（`buildRankingDoc`＋`buildAllRankingsDoc`）／`diet/libraryDocs.ts`（`buildSearchDoc`＋`buildLibraryDoc`＋`buildDedupeDoc`）。
- `render/dietDocs.ts` 只删不掉留：`buildViewDietDoc`（主页在用）与 `buildHealthDoc`（分析在用）留原地，搬完只导出这两件（另加 `DietMealRow`／`ViewDietDocInput` 两个输入形）。
- 四个调用点（`diet/today.ts`／`review.ts`／`ranking.ts`／`library.ts`）改指新住处；`home/today.ts` 与 `analysis/commands.ts` 仍指旧路径。
- 判据：同批输入 22 例逐函数 sha256 拆前＝拆后 22/22 一致；`pnpm build` exit 0；`pnpm gen:check` exit 0；变异自证「改坏 18/22 一致（4 条 sha 变）／还原 22/22 一致」两行机器读数。
