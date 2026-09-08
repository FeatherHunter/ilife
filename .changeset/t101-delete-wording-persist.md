---
'skill-calorie': patch
---

#101 写链落库断言 ＋ 删除回执可恢复性口径统一：① 新增 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`——35 写键逐键「写后 SELECT 回读」（只读句柄 `openDbReadOnly` 重开磁盘库，回执 `recordId` 必须定位到刚写的行，逐列比对；覆盖门改为**每键 ≥1 次真实只读查询**，删断言即红），补上「只断言回执行字串」的缺口；② 删除回执如实自曝可恢复性：全仓 0 个 restore/undo/recover 入口 → 软删一律**不承诺可恢复**，并按读层实测分两档——`exercise_log`（`analysis/**` 11 处查询未过滤 `is_deleted`）→「（软删除：行保留，仍计入历史统计；暂无恢复入口）」；`body_composition`／`body_measurements`／`nutrition_products`（读层带 `is_deprecated = 0`）→「（软删除：行保留，已从查询与统计中排除；暂无恢复入口）」；硬删（`food_log`／`weight_log`／`body_photos`，`DELETE FROM`）→「（硬删除，不可恢复）」；③ `items[].status` 与 prose **同源派生**（`已删除（软，不可恢复）`／`已删除（硬，不可恢复）`／`已下架（软，不可恢复）`）。词条落点 **14 处 ＝ `src/cli/write.ts` 13 ＋ `src/render/photo.ts` 1**（可复跑计数见 `docs/research/t101-softdelete-still-counted.mjs` 事实 E）；文案与库内语义逐键同源断言，并新增「软删运动仍计入历史统计」的删前=删后实测用例。
