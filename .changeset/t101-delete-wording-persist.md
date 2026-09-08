---
'skill-calorie': patch
---

#101 写链落库断言 ＋ 删除回执可恢复性口径统一：① 新增 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`——35 写键逐键「写后 SELECT 回读」（只读句柄 `openDbReadOnly` 重开磁盘库，回执 `recordId` 必须定位到刚写的行，逐列比对；末尾覆盖门断言 35/35），补上「只断言回执行字串」的缺口；② 删除回执统一自曝可恢复性：软删（`exercise_log.is_deleted`／`body_composition.is_deprecated`／`body_measurements.is_deprecated`／`nutrition_products.is_deprecated`）→「（软删除，可恢复）」；硬删（`food_log`／`weight_log`／`body_photos`，`DELETE FROM`）→「（硬删除，不可恢复）」——`src/cli/write.ts` 13 处 ＋ `src/render/photo.ts` 1 处，文案与库内语义逐键同源断言。
