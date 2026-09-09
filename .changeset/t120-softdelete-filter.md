---
'skill-calorie': patch
---

#120（map #63）软删记录不再计入用户可见统计：`analysis/**` **11 处**查询统一补 `exercise_log.is_deleted` 过滤
（唯一谓词 `analysis/utils.ts:EX_ALIVE = 'COALESCE(is_deleted, 0) = 0'`，与 fetch 层 `listWindow` 同口径；
`COALESCE` 保住 `is_deleted IS NULL` 的历史活行）。修复前同一份数据一处说「没有」、另一处仍在算：
`view.exercise` 已 exit 4「无运动记录」，而 `view.home.deficitToday`／`view.deficit.avgExerciseBurn`／
`buildSeries.exerciseKcal` 删前=删后。

**11 处**：`series.ts:113`（数列唯一源，传导 12+ 个 `view.*` 键）· `exercise.ts:45,86,109,227` ·
`review.ts:69` · `diet.ts:162` · `cross.ts:108-109`（力量/有氧分层）· `anomaly/common.ts:85`（四 kind 取证）·
`weightCompare3.ts:68`（`scenarioC5` 只剩 1 个月 → 明确缺失阻断）。

**文案一并收敛**（supersedes #101 的「仍计入历史统计」）：`src/cli/write.ts` 删除 `SOFT_STILL_COUNTED`，
三处运动删除回执改指既有 `SOFT_EXCLUDED`（「已从查询与统计中排除」），全仓软删文案同款；
`cmd-write-40-persist.test.mjs` 的 #101 口径用例改为「软删后逐面排除」。

**证据**：可复跑探针 `docs/research/t120-probe-softdelete.mjs` —— 修复前 `RESULT: 0/11`／`RESULT-ALL: 4/20`，
修复后 `RESULT: 11/11`／`RESULT-ALL: 20/20`（exit 0）；回归测试 `test/softdelete-120.test.mjs` 4 用例
（逐面一致／11 处逐处／NULL 活行护栏／硬删表护栏）；3 处 src 级变异自证（红→还原→绿 ＋ sha256 一致）；
正本 `docs/research/t120-softdelete-filter.md`；取代关系 `docs/research/t120-supersedes-t101-softdelete.md`。
