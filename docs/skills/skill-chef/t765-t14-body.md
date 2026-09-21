## Question

老库三条硬约束与卡面「选填」直接冲突，而 Q4 已裁「本次不改 schema」：

- `ingredients.quantity REAL NOT NULL` ↔「修改食材」的用量可空写入
- `cooking_steps.duration_minutes INTEGER NOT NULL` ↔ 步骤时长可空
- `recipe_history.rating REAL NOT NULL` ↔ 卡面「评分（选填，0-5 可带小数）」

实测（副本库上）：三条 NOT NULL 会让写入直接抛 `IntegrityError`。受影响 9 张卡——`update_ingredient`／`record_cook`／`add_from_image`／`add_from_markdown`／`add_from_conversation`／`add_from_template`／`import_from_json`／`import_validation_failed`／`derive_from_existing`。

这三条同时挡着四张纵向票（录入 #773／历史 #775／修改 #774／小域合并 #776）。**在「写入必须给值」与「用户可以不填」之间，逐列怎么落？**

候选：**甲** 页面层把「选填」改成「必填」（改卡面语义）；**乙** 定义「未填」在库中的哨兵表示，并让查询侧认它；**丙** 立 schema 票把这三列改成可空并迁移老库（需要新裁定，与 Q4 冲突）；**丁** 按列分别裁。

## 目标

逐列（3 列）＋ 逐卡（9 张）给出定案，并写清每张卡写侧的实际行为：缺值时落库什么、查询侧怎么显示、页面怎么写。

## 验收命令

- 定案落在本票的解决评论里，并**逐条写进受影响三张票**（`#773`／`#774`／`#775`）的正文；
- 正例：`gh issue view #773／#774／#775 --json body --jq .body` 能搜到对应列的定案（三张票逐张核），三张全有＝真；
- 反例：任一张票正文缺该列的定案＝假，退票。

## 不许动的东西

- 不改老库文件、不改 schema（若确需改，先在本票里立出图的 schema 票）。
- 不改老件（Python）源码。
- 不碰真库，只用副本。

## 交付物路径

- 决议：本票解决评论 ＋ 回写 `#773`／`#774`／`#775` 正文。
- 证据：`docs/skills/skill-chef/t769-写侧字段对账.md`（冲突出处与实测读数）。

## 遗留出口

- 若裁「改 schema」→ 当场立 schema 票并标出图范围（本图只做技能侧）。

## 定案

逐列独立审查、结论同为甲（必填拦下补齐；审查过程是丁，结果收敛为甲；丙只出图不做）。

- quantity（ingredients.quantity REAL NOT NULL）：写侧必填数字；缺值取数层抛 CHEF_BAD_QUERY（CLI exit 4），不写半条脏数据；AI 问用户补齐后重试（适量请同时给估计数＋quantity_text，如 quantity=5＋quantity_text=少许约5g）。查询侧直接显示数字＋quantity_text，无特殊值。页面：录入/修改表单该项标红必补，缺失时确认按钮置灰（照录入域 G2 校验前置一次列全）。
- duration_minutes（cooking_steps.duration_minutes INTEGER NOT NULL）：写侧必填数字；缺值同上拦下补齐。查询侧直接显示分钟数。页面同上标红必补。
- rating（recipe_history.rating REAL NOT NULL）：写侧必填 0-5 数字；缺评分不写历史，直接拦下问用户要分（卡面“选填”暂按“必填”执行；HELP 资产禁手改，本次不改 sceneData.ts，文字差以后随 schema 票改回）。查询侧 AVG 直接算，无剔除。页面：记录做菜缺评分走失败回执＋重试。

逐卡：update_ingredient（改用量须给数字；添加食材须给数字＋文字；关联步骤本期不开）；record_cook（缺评分不写）；add_from_image/markdown/conversation/template＋import_from_json/validation_failed（写入前强制每食材有数字 quantity、每步骤有数字 duration，缺就向用户要；维度表本期不写）；derive_from_existing（继承须带数字，母本字段天然完整，用户改空走红必补）。

对抗摘要：乙（库内特殊值）污染 AVG/显示、与老对照不一致，出局；丙（改 schema）与本次不改冲突，只记远期建议（放开三列可空，让未评分与 0 分可区分），本次不立票。实现：src/fetch/db.ts 三处收紧（addIngredient/addStep/recordHistory）＋ test 反例；新库 15/15 通过，副本老库实测缺值 CHEF_BAD_QUERY、带值可写。


## 进度：95%

下一步：待用户终审本定案＋三票正文回写效果，确认后关票（未确认不得 close）。
