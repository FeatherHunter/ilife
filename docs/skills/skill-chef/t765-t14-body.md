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

## 进度：0%

下一步：等维护者裁这三列的处置，再回写三张票。
