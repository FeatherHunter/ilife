---
"calorie": patch
---

feat(265): 7 条运动读类词归位各自专页

`看运动类型分布` 改指 `calorie.view.exercise-distribution`，`看运动趋势`
改指 `calorie.view.exercise-trend`，`运动复盘（本周／本月／最近 90 天／
今年／自定义时间）` 5 条改指 `calorie.view.exercise-recap`。记录随键自
`src/home/routes.ts` 搬进 `src/exercise/routes.ts`（`order` 167／170–175
不动），冻结表 `scene-04-exercise.ts` 7 条 `main_prompt.cli`／`data_source`
逐字同步。`src/home/routes.ts` 其余 12 条窗口词不动。新增
`test/exercise-routes-265.test.mjs`（routesFor 断言＋逐条实跑各是其页＋
冻结逐字，含改回 exercise 变红自证）。
