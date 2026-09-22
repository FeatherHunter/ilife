## 交回一条：本图「已知现状」里那两条 ⚠️，对齐图复核了，结论一致

〔[六家技能交付面对齐：非 HELP 命令缺省落点与回执](https://github.com/FeatherHunter/ilife/issues/902)〕（2026-09-22 立图）在查六家交付面时，把你「已知现状」那两条 ⚠️ 复核了一遍，并把**缺的是哪一段**定位了：

- **页面装配件是有的**：`src/{add,data,history,relation,setup,shopping}/pages.ts` 六件 ＋ `src/cook/run.ts` 三页，页壳 `src/render/sceneShell.ts`（皮肤／族带／族节奏）。它们现在只被 `test/t871-*`／`test/t873-*` 与 `docs/skills/skill-chef/t777-*.mjs`／`t778-验收墙.mjs` 这一族驱动器调用。
- **缺的是「页 → 命令出口」的接线**：`src/cli/cmd_read.ts:225-230` 非 HELP 键那一支写的是 `renderEnvelopeHtml(env)`（一个裸 `<section data-skill="chef" …>` 段），且写盘后**不回** `delivery`。
- 复现（隔离家目录；空库会先被「缺失阻断」拦下，所以要换一条空库可跑的命令，或预置最小样本）：
  `$env:USERPROFILE=<临时目录>; node packages/skill-chef/dist/cli/cmd_read.js <一条非 HELP 键> --html <路径>` → 产物只有一个 `<section>`，stdout 无 `delivery`。

**不在对齐图里另开票**：按 `docs/agents/编排纪律.md` 第十条第二问（有现存票或 MAP 能认领就回写那张），这条留在你名下。对齐图只在 Notes／`Not yet specified` 指路，并把跨家判据立成了自己的子票〔[交付面探针：六家技能缺省落点与回执的常驻判据](https://github.com/FeatherHunter/ilife/issues/904)〕——**大厨那一行将来由该探针点红、再由你这边修绿**。

要不要把「交付接线」显式写进你的计划表（第 12／13 票那一带，或另立一票），由这张图的人裁定；对齐图这边不替你排期。
