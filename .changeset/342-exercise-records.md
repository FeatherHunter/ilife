---
"calorie": patch
---

feat(342): 新增运动记录级明细命令 `calorie.view.exercise-records`

场景 04 运动记录一族拿回记录级明细（老技能 `render_exercise_summary.py --mode records`
＋ `--today`／`--yesterday`／`--has-note`／`--category 力量|有氧`），并接住
`看运动记录（有备注）`（此前 `non-exec`）。新命令产物为完整文档（`assembleDocPage`
五连），含记录级列表（日期／类型／分类／时长／消耗／距离／心率／备注），
支持 `window`＋`category`＋`hasNote` 筛选。路由层 3 条改指新命令
（有备注翻为 `exec`＋力量／有氧筛选改指），冻结表同批逐字同步。
`看今日／昨日运动` 的命令侧已就绪（直跑今日／昨日窗口），路由搬迁待与场景 01 图串行。
