---
'skill-calorie': patch
---

#97（map #63）M5 写库回执契约：**`writtenFields` 与「本次实际 SET 的列」对齐**（两席审查 R-1／R-3 返修）。

- **`calorie.goal.set`**：`writtenFields` 原先恒报 `calorie,protein,carbs,fat,water`，但**不传 `water` 时该列没进 SQL
  SET 列表**（`fetch/nutritionGoal.ts:68-78` 两条 `INSERT OR REPLACE`），其值只因 REPLACE 落列默认 2000 —— 与正本
  §3.4「update 键＝本次实际变更字段」不符。现由 `goalSetWrittenFields(water !== undefined)` 按**实际 SET 列**派生
  （`src/cli/write.ts:161`）：不传 `water` → `calorie,protein,carbs,fat`；传 → 追加 `water`。**写库语义零改动**
  （`goal.set` 经 REPLACE 重置未传列＝数据丢失缺陷，已开 **#127**，不在本票范围）。
- **`calorie.water.log` 重复跳过**：由硬编码 `ids:[]／idSource:'none'` 统一为与 `calorie.diet.add` 同口径 ——
  `addMeal` 回传原 id 时报 `record` ＋ `ids=[dupId]`，拿不到 id 才退 `none`（正本 §3.3 同步补注）。
- **契约措辞按实测修正**（正本 §3.6）：同值 UPDATE 仍计 `affectedRows=1`，而 `noChange` 取该键 #101 既有值
  （`weight.update` 实测 `false`）→ 二者不等价；`writtenFields` 明确「派生列／记账列（`bmi`／`height_cm`／`updated_at`）
  无 CLI 参数名，不入摘要」（正本 §3.4）。

**证据**：回归 `packages/skill-calorie/test/m5-receipt-97.test.mjs` **44/44**（含 4 条**独立判定**新用例：R-1 双向、
`water.log` 重复、同值 UPDATE、四要素逐字对账——不经探针 `checkM5`／`SCENARIOS`）；探针 `RESULT: 35/35`；
四门 exit 0；1 处 src 级变异红→还原→绿（`MUT-97-R1`）。正本 `docs/research/t97-m5-contract.md`，
证据 `docs/research/t97-impl.md`（§6.4 机械门禁对账 ＋ `docs/research/t97-gate-runs.log`）。
