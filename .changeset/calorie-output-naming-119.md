---
'skill-calorie': patch
---

#119（图 #63）动态段与后缀段复刻（M10 残项）：默认落盘按段拼接 `<覆盖|title>[_回执][_动态段][_内容标识]_<TS>[_N].html`。
旧版真值（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`＋`_cmd_maps.py`）：
写键一律 `_回执`（旧 `html_scene_path(..., 'receipt')`，35/77 键）；`calorie.view.ranking` 基名覆盖为旧
`食物排行`（title `食品排行` 差一字）＋ category 动态段（高热量／低热量／常吃／高碳水／高蛋白／全部，
缺省 `全部`）；`calorie.view.contraindication` 部位动态段（腰／膝／肩／全部）；
`writeSuffixFor()` 内容标识纯 params 派生（旧 #49／#266／#284／#286 口径：食物名／毫升／体重值 format g／
日期去横线／起止／首项等N项；需写后回执的键返回空，见 `docs/research/t119-dynamic-suffix.md` 残留 R1）。
**行为变更（调用方可⻅）：** 35 写键默认文件名新增 `_回执` 段并可能带内容标识；
ranking 五榜＋全榜同秒不再互撞（不再靠 `_2.._N` 区分语义）。
`--output`／`--html` 显式覆盖不受命名管线影响；落点仍经 envelope `data.output` 回传（逐字节一致）。
测试与证据：`packages/skill-calorie/test/output-naming-119.test.mjs`（9 条）；
`docs/research/t119-dynamic-suffix.md`（35 键全量对照表）。
