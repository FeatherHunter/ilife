---
'skill-calorie': minor
---

#384：8 条报告子形态页（冻结表 order 331–338 由 `non-exec` 转 `exec`）。命令层 8 条独立命令
（`calorie.report.bmi`／`tdee`／`bmr`／`protein`／`water`／`score`／`trend`／`compare`），
渲染层 1 个多态底座（取数 `src/analysis/reportPlate.ts`、装配 `src/analysis/reportDoc.ts`
＋ 4 个分片）。不向 `calorie.view.health` 塞形态参数；`view.health` 11 条窗口词行为不变。
新增 `test/analysis-report-384.test.mjs`（8 条逐条实跑各自字段＋拿错页即红＋回归）。
