# 新私家大厨：HELP 域划分、命令面、页面与缺口

只读调查（未改动任何源码）。对象：`D:\ilife\packages\skill-chef`（TypeScript 实现，包名 `skill-chef`，版本 `0.3.0`）、调用侧 `D:\ilife\packages\plugin-chef`（插件名 `dsh-chef`）。行号一律指工作区当前文件行号。

---

## 1. HELP HTML 的功能域划分（权威依据）

事实源：`src/help/sceneData.ts`（机器生成、禁手改，生成器 `scripts/gen-help-assets.mjs`）。该文件导出 `CHEF_SCENES`（`:40-175`）与 `buildChefSceneData()`（`:178-185`）。

**三层合计：10 域 / 33 二级组 / 48 张卡（场景）；卡面唤醒词（`wake_word`）＝所属组名，去重后 33 条。** 计数由测试逐条钉死：`test/scene-data.test.mjs:86-97`（10／33／48、卡 id 唯一、参数 79 条／41 键）。

### 1.1 域总数与域名字（逐字，含图标）

| 序 | 域 id | 域 label（逐字） | icon | 组数 | 卡数 | 唤醒词数 | 定义处 |
|---|---|---|---|---|---|---|---|
| 1 | `cook` | 做菜 | 🍳 | 1 | 5 | 1 | `src/help/sceneData.ts:41` |
| 2 | `view` | 查看 | 👀 | 5 | 8 | 5 | `:50` |
| 3 | `search` | 搜索筛选 | 🔍 | 10 | 13 | 10 | `:70` |
| 4 | `update` | 修改 | ✏️ | 4 | 4 | 4 | `:105` |
| 5 | `history` | 历史 | 📜 | 3 | 4 | 3 | `:119` |
| 6 | `shopping` | 采购 | 🛒 | 1 | 1 | 1 | `:131` |
| 7 | `add` | 录入 | 📝 | 2 | 6 | 2 | `:136` |
| 8 | `relation` | 派生 | 🌿 | 3 | 3 | 3 | `:148` |
| 9 | `setup` | 开始使用 | 🚀 | 1 | 1 | 1 | `:159` |
| 10 | `data` | 数据管理 | 🗄️ | 3 | 3 | 3 | `:164` |
| — | 合计 | 10 域 | — | 33 | 48 | 33 | `test/scene-data.test.mjs:99-101`（域 id／label／icon 顺序也钉） |

### 1.2 逐组逐卡清单（48 条，编号＝全域连续序号）

列义：**序**＝全域连续编号；**组（唤醒词）**＝二级组 id，逐字等于该组每张卡的 `wake_word`（`sceneData.ts` 各 `subgroups[].id`／`scenes[].wake_word`）；**卡面 status** 抄 `scenes[].status` 原文（空串＝可用，`【待开发】`＝卡面出「待开发」徽章）。

| 序 | 域 | 组（＝唤醒词） | 卡 id | 场景名（逐字） | status | 定义处 |
|---|---|---|---|---|---|---|
| 1 | 做菜 | 做菜模式 | `cooking_start_fresh` | 全新开始(含每步内联 + 完结闭环) | （空） | `sceneData.ts:43` |
| 2 | 做菜 | 做菜模式 | `cooking_start_with_history` | 含上次经验(历史驱动再开做) | （空） | `:44` |
| 3 | 做菜 | 做菜模式 | `cooking_start_double_servings` | 双份份量 | （空） | `:45` |
| 4 | 做菜 | 做菜模式 | `cooking_resume_after_pause` | 断点续做(AI 会话记忆) | （空） | `:46` |
| 5 | 做菜 | 做菜模式 | `cooking_during_waiting_step` | 等待步骤中并行做其他 | （空） | `:47` |
| 6 | 查看 | 查看食谱 | `view_full_recipe` | 完整食谱 | （空） | `:52` |
| 7 | 查看 | 查看食谱 | `view_for_beginner` | 新手强调(关键成功点) | （空） | `:53` |
| 8 | 查看 | 查看食谱 | `view_recipe_with_substitution` | 替换食材预览(临时假设) | （空） | `:54` |
| 9 | 查看 | 查看食材 | `view_ingredients_only` | 只看食材 | （空） | `:57` |
| 10 | 查看 | 查看食材 | `view_ingredients_grouped` | 食材分组(11 大类) | （空） | `:58` |
| 11 | 查看 | 查看步骤 | `view_steps_only` | 只看步骤 | （空） | `:61` |
| 12 | 查看 | 查看营养 | `view_nutrition_only` | 只看营养 | （空） | `:64` |
| 13 | 查看 | 查看背景 | `view_background_only` | 只看背景文化 | （空） | `:67` |
| 14 | 搜索筛选 | 搜索食谱 | `search_by_name_keyword` | 关键词搜索(菜名/食材) | （空） | `:72` |
| 15 | 搜索筛选 | 搜索食谱 | `search_fuzzy_match` | 错字模糊匹配(纠错提示) | （空） | `:73` |
| 16 | 搜索筛选 | 筛选菜系 | `filter_cuisine_basic` | 按菜系筛选 | （空） | `:76` |
| 17 | 搜索筛选 | 筛选菜系 | `filter_combined` | 多维组合筛选(≤3 维) | （空） | `:77` |
| 18 | 搜索筛选 | 筛选食材 | `filter_by_ingredient_basic` | 按食材筛选 | （空） | `:80` |
| 19 | 搜索筛选 | 筛选食材 | `filter_exclude_ingredient` | 排除食材(忌口) | （空） | `:81` |
| 20 | 搜索筛选 | 筛选难度 | `filter_difficulty_easy` | 按难度筛选 | 【待开发】 | `:84` |
| 21 | 搜索筛选 | 筛选时间 | `filter_time_quick` | 按时间筛选(30 分钟内) | 【待开发】 | `:87` |
| 22 | 搜索筛选 | 筛选炊具 | `filter_by_cookware` | 按炊具筛选 | 【待开发】 | `:90` |
| 23 | 搜索筛选 | 筛选口味 | `filter_by_flavor` | 按口味筛选 | （空） | `:93` |
| 24 | 搜索筛选 | 筛选季节 | `filter_by_season` | 按季节筛选 | （空） | `:96` |
| 25 | 搜索筛选 | 筛选状态 | `filter_by_status` | 按状态筛选 | 【待开发】 | `:99` |
| 26 | 搜索筛选 | 查看全部 | `list_all_recipes` | 列出所有食谱 | （空） | `:102` |
| 27 | 修改 | 修改食谱 | `update_main_fields` | 修改食谱主信息 | （空） | `:107` |
| 28 | 修改 | 修改步骤 | `update_step_content` | 修改步骤(内容/重排) | 【待开发】 | `:110` |
| 29 | 修改 | 修改食材 | `update_ingredient` | 修改食材(用量/添加/关联步骤) | 【待开发】 | `:113` |
| 30 | 修改 | 废弃食谱 | `discard_recipe` | 废弃食谱(只增不删) | （空） | `:116` |
| 31 | 历史 | 记录做菜 | `record_cook` | 记录做菜(完整 + 快速 + 补录) | （空） | `:121` |
| 32 | 历史 | 查看历史 | `view_history_list` | 历史时间线 | （空） | `:124` |
| 33 | 历史 | 查看统计 | `view_stats_dashboard` | 单菜统计 | （空） | `:127` |
| 34 | 历史 | 查看统计 | `view_stats_global` | 全局统计(整体画像) | （空） | `:128` |
| 35 | 采购 | 生成清单 | `shopping_generate` | 生成采购清单 | （空） | `:133` |
| 36 | 录入 | 录入食谱 | `add_from_image` | 图片录入(识别图片) | （空） | `:138` |
| 37 | 录入 | 录入食谱 | `add_from_markdown` | MD 文件录入 | （空） | `:139` |
| 38 | 录入 | 录入食谱 | `add_from_conversation` | 对话录入(逐步收集) | （空） | `:140` |
| 39 | 录入 | 录入食谱 | `add_from_template` | 结构化模板录入(表单) | （空） | `:141` |
| 40 | 录入 | 导入食谱 | `import_from_json` | JSON 文件导入 | 【待开发】 | `:144` |
| 41 | 录入 | 导入食谱 | `import_validation_failed` | 导入校验失败(补齐后重试) | 【待开发】 | `:145` |
| 42 | 派生 | 添加派生关系 | `add_relation` | 添加派生关系 | 【待开发】 | `:150` |
| 43 | 派生 | 查看派生关系 | `view_relation_tree` | 查看派生关系(家族树) | 【待开发】 | `:153` |
| 44 | 派生 | 从已有派生新菜 | `derive_from_existing` | 从已有派生新菜 | 【待开发】 | `:156` |
| 45 | 开始使用 | 首次使用 | `first_use` | 首次使用(初始化工作流) | 【待开发】 | `:161` |
| 46 | 数据管理 | 体检 | `data_quality_report` | 数据质量报告 | （空） | `:166` |
| 47 | 数据管理 | 批量改 | `data_batch_edit` | 批量编辑 | 【待开发】 | `:169` |
| 48 | 数据管理 | 备份 | `data_export_backup` | 导出备份 | 【待开发】 | `:172` |

status 账：`【待开发】` **14 张**，空串 **34 张**；14 张恰好落在 13 个「不在唤醒词表里的老组名」上（`test/scene-data.test.mjs:103-116`，`PENDING` 表 `:44-58`）。

### 1.3 唤醒词清单（33 条，按域逐条）

每条＝「组名」逐字，也是该组每张卡的 `wake_word`（`test/scene-data.test.mjs:118-127` 逐字钉死 33 个组名与顺序）。

| 序 | 域 | 唤醒词（逐字） | 该词下卡数 |
|---|---|---|---|
| 1 | 做菜 | 做菜模式 | 5 |
| 2 | 查看 | 查看食谱 | 3 |
| 3 | 查看 | 查看食材 | 2 |
| 4 | 查看 | 查看步骤 | 1 |
| 5 | 查看 | 查看营养 | 1 |
| 6 | 查看 | 查看背景 | 1 |
| 7 | 搜索筛选 | 搜索食谱 | 2 |
| 8 | 搜索筛选 | 筛选菜系 | 2 |
| 9 | 搜索筛选 | 筛选食材 | 2 |
| 10 | 搜索筛选 | 筛选难度 | 1 |
| 11 | 搜索筛选 | 筛选时间 | 1 |
| 12 | 搜索筛选 | 筛选炊具 | 1 |
| 13 | 搜索筛选 | 筛选口味 | 1 |
| 14 | 搜索筛选 | 筛选季节 | 1 |
| 15 | 搜索筛选 | 筛选状态 | 1 |
| 16 | 搜索筛选 | 查看全部 | 1 |
| 17 | 修改 | 修改食谱 | 1 |
| 18 | 修改 | 修改步骤 | 1 |
| 19 | 修改 | 修改食材 | 1 |
| 20 | 修改 | 废弃食谱 | 1 |
| 21 | 历史 | 记录做菜 | 1 |
| 22 | 历史 | 查看历史 | 1 |
| 23 | 历史 | 查看统计 | 2 |
| 24 | 采购 | 生成清单 | 1 |
| 25 | 录入 | 录入食谱 | 4 |
| 26 | 录入 | 导入食谱 | 2 |
| 27 | 派生 | 添加派生关系 | 1 |
| 28 | 派生 | 查看派生关系 | 1 |
| 29 | 派生 | 从已有派生新菜 | 1 |
| 30 | 开始使用 | 首次使用 | 1 |
| 31 | 数据管理 | 体检 | 1 |
| 32 | 数据管理 | 批量改 | 1 |
| 33 | 数据管理 | 备份 | 1 |
| — | 合计 | 33 条 | 48 |

### 1.4 页面级取值与 HELP 的三处计数（装配层实测）

- `skill_name`＝`私家大厨`、`title`＝`私家大厨 HELP · 能力速查`、`version`＝`0.1.0`（＝老载荷 `meta.version`，**技能数据世代，不是 npm 包版本**，同值是巧合）——`sceneData.ts:178-185`；`helpFile.ts:170-173` 从它取，不写第二份。
- 页头摘要行 `subtitle` **全部现算**：`'<域数> 功能域 · <场景数> 场景 · 版本 <version> · 更新于 <YYYY-MM-DD HH:MM>'`（`helpFile.ts:180-181`；只数「域 ＋ 场景」两层，33 个二级组不进摘要行）。
- 首次使用横幅文案与 `prompt` 取卡 `first_use` 的 `prompt_template`（单源，`helpFile.ts:69`／`:130-144`／`:190-197`），`hidden` 由 `existsSync(dbPath)` 决定（`:125-127`）。
- ⚠️ `subtitle` 在共享 help 模板里**读了不渲染**（件头自述，`helpFile.ts:39-45`）。
- ⚠️ A 路由共享模板**不渲染** `subtitle`／路由字段：`SceneData` 的 `scenes[].properties` 只有 `id`/`title`/`wake_word`/`types`/`status`/`prompt_template`/`editable_fields` 七键，schema `additionalProperties: false`，**没有任何指向命令／CLI 的字段**（`helpFile.ts:47-54`）。

---

## 2. 命令面（`chef.*` key 清单与参数）

唯一出口＝`chef-cmd-read`（`package.json:21-23` 的 `bin` → `./dist/cli/cmd_read.js`）。argv＋stdout 一行 envelope JSON＋exit code：0 ok／1 预检／2 用法与参数／3 key／4 取数或超时／5 envelope、渲染、落盘（`src/cli/cmd_read.ts:2-3`、`:44`、`:451-463`）。

### 2.1 唤醒词命令（8 条，进 HELP、进唤醒词表、进形状表）

| # | 命令键 | shape | 参数（逐字，来源行号） | 定义/分派处 |
|---|---|---|---|---|
| 1 | `chef.recipe.view` | `detail` | `nameOrId`（必填；兼容 `name`／`id`，`cmd_read.ts:65-72`） | 形状 `render/envelope.ts:6`；分派 `cmd_read.ts:154-156` |
| 2 | `chef.recipe.search` | `list` | 三选一：`q`（关键词）；`kind:"all"`；或过滤键 `cuisine`／`season`／`method`／`flavor`／`tag`／`meal`／`cookware`／`difficulty`／`status`／`maxTime`，别名 `filter`（→`cuisine`）、`time_max`／`time`（→`maxTime`）（`:42`、`:157-184`） | `envelope.ts:7`；`cmd_read.ts:157-185` |
| 3 | `chef.recipe.write` | `receipt` | `op`＝`add`／`update`／`discard`／`deprecate`／`add-ingredient`／`add-step`（`:75-79`）；**add**：`name`(必) + `difficulty`/`status`/`servings`/`total_time_minutes`/`description`/`photo_url`/`source`/`source_url` + `ingredients[]`/`steps[]`（`:188-216`）；**update**：`id` 或 `nameOrId` + 同上字段 + `total_time` + `patch{}`（`:217-238`）；**discard/deprecate**：`id` 或 `nameOrId`（`:239-244`）；**add-ingredient**：`recipe_id` 或 `recipe_name` + `name`(必) + `category`/`quantity`/`unit`/`quantity_text`/`substitute`/`is_optional`（`:245-262`）；**add-step**：`recipe_id` 或 `recipe_name` + `action`(必) + `heat_level`/`temperature`/`expected_result`/`duration_minutes`（`:263-278`） | `envelope.ts:8`；`cmd_read.ts:186-281` |
| 4 | `chef.cooking.run` | `list` | `nameOrId`（必填）；`servings`（正整数，选填，按 `recipes.servings` 为基准放大，`:57-62`、`:283-291`） | `envelope.ts:9`；`cmd_read.ts:282-301` |
| 5 | `chef.shopping.query` | `list` | `names`（数组，必填）；`servings`（正整数，选填）；`excludeOptional`（布尔，选填，`:302-313`） | `envelope.ts:10`；`cmd_read.ts:302-313` |
| 6 | `chef.history.record` | `receipt` | `name`（必填）；`rating`（0-5，可小数，选填）；`feedback`（字符串，选填）；`date`（`YYYY-MM-DD`，空＝今天，`:314-326`） | `envelope.ts:11`；`cmd_read.ts:314-326` |
| 7 | `chef.history.query` | `list` | `kind`＝`timeline`／`stats`／`quality`／`backup`（缺省：给了 `name` → `timeline`，否则 `stats`）；`name`（选填）（`:327-377`） | `envelope.ts:12`；`cmd_read.ts:327-377` |
| 8 | `chef.help.lookup` | `list` | `q`（现找，只回 stdout）；`mode:"lookup"`（速查表产物；`q` 与 `mode` 互斥，`:130-131`）；`reuseHours`（复用窗口，小时，`0`＝每次新；缺省 **24**）；另有全局开关 `--params`／`--html <路径>`／`--timeout <毫秒>`（`:389-401`） | `envelope.ts:13`；分派 `cmd_read.ts:126-145`（**在开库之前**） |

全局参数（对 8 条一律生效，`:389-401`）：`--params <JSON对象>`、`--html <输出路径>`、`--timeout <毫秒>`（默认 `30000`，`:39`）。

### 2.2 设置页专用命令（4 条，**不是唤醒词命令**，不进 HELP、不进形状表）

| # | 命令键 | shape | 参数 | 定义处 |
|---|---|---|---|---|
| 9 | `chef.config.read` | `detail` | 无 | `src/cli/config.ts:18`、`:74-77` |
| 10 | `chef.config.write` | `receipt` | `values`（对象，必填；组内按键覆盖） | `src/cli/config.ts:19`、`:78-85` |
| 11 | `chef.config.reset` | `receipt` | 无（先另存 `<配置目录>/chef.yaml.bak`） | `src/cli/config.ts:20`、`:86-87` |
| 12 | `chef.config.check` | `detail` | 无（只读体检报告） | `src/cli/health.ts:15`、`:26-36` |

**命令键总计 12 条**：8 条唤醒词命令 ＋ 4 条设置页专用命令（后 4 条由 `cmd_read.ts:413-422` 在**库目录预检与形状表之前**拦下）。

### 2.3 唤醒词表 `WAKE_TABLE`（37 条短语 → 8 key）

`src/policy/wakewords.ts:12-50` 共 **37 条**短语（注释 `:2` 自述：help 4 + view 7 + search 8 + write 4 + cooking 4 + shopping 4 + record 3 + query 3）：

| # | 短语（逐字） | key | needs／preset | 行号 |
|---|---|---|---|---|
| 1 | 私家大厨HELP | `chef.help.lookup` | — | `:13` |
| 2 | 菜谱HELP | `chef.help.lookup` | — | `:14` |
| 3 | 查帮助 | `chef.help.lookup` | — | `:15` |
| 4 | 能做什么 | `chef.help.lookup` | — | `:16` |
| 5 | 查看食谱 | `chef.recipe.view` | needs `name` | `:17` |
| 6 | 查看食材 | `chef.recipe.view` | needs `name` | `:18` |
| 7 | 查看步骤 | `chef.recipe.view` | needs `name` | `:19` |
| 8 | 查看营养 | `chef.recipe.view` | needs `name` | `:20` |
| 9 | 查看背景 | `chef.recipe.view` | needs `name` | `:21` |
| 10 | 看菜谱 | `chef.recipe.view` | needs `name` | `:22` |
| 11 | 看菜 | `chef.recipe.view` | needs `name` | `:23` |
| 12 | 查看全部 | `chef.recipe.search` | preset `kind:'all'` | `:24` |
| 13 | 搜索食谱 | `chef.recipe.search` | needs `q` | `:25` |
| 14 | 搜菜 | `chef.recipe.search` | needs `q` | `:26` |
| 15 | 查食材 | `chef.recipe.search` | needs `q` | `:27` |
| 16 | 筛选菜系 | `chef.recipe.search` | needs `filter` | `:28` |
| 17 | 筛选食材 | `chef.recipe.search` | needs `filter` | `:29` |
| 18 | 筛选口味 | `chef.recipe.search` | needs `filter` | `:30` |
| 19 | 筛选季节 | `chef.recipe.search` | needs `filter` | `:31` |
| 20 | 录入食谱 | `chef.recipe.write` | needs `name`，preset `op:'add'` | `:32` |
| 21 | 修改食谱 | `chef.recipe.write` | needs `name`，preset `op:'update'` | `:33` |
| 22 | 废弃食谱 | `chef.recipe.write` | needs `name`，preset `op:'deprecate'` | `:34` |
| 23 | 加菜 | `chef.recipe.write` | needs `name`，preset `op:'add'` | `:35` |
| 24 | 做菜模式 | `chef.cooking.run` | needs `name` | `:36` |
| 25 | 开始做菜 | `chef.cooking.run` | needs `name` | `:37` |
| 26 | 继续做菜 | `chef.cooking.run` | needs `name` | `:38` |
| 27 | 完成做菜 | `chef.cooking.run` | needs `name` | `:39` |
| 28 | 生成清单 | `chef.shopping.query` | needs `names` | `:40` |
| 29 | 排除可选 | `chef.shopping.query` | needs `names` | `:41` |
| 30 | 查清单 | `chef.shopping.query` | needs `names` | `:42` |
| 31 | 清空清单 | `chef.shopping.query` | needs `names` | `:43` |
| 32 | 记录做菜 | `chef.history.record` | needs `name` | `:44` |
| 33 | 补录做菜 | `chef.history.record` | needs `name` | `:45` |
| 34 | 改评分 | `chef.history.record` | needs `name` | `:46` |
| 35 | 查看历史 | `chef.history.query` | needs `name` | `:47` |
| 36 | 查看统计 | `chef.history.query` | preset `kind:'stats'` | `:48` |
| 37 | 体检 | `chef.history.query` | preset `kind:'quality'` | `:49` |

路由：`routeWakeword(text, ctx)`（`:54-73`）——按短语长度降序最长匹配，缺槽位抛 `POLICY_MISSING_SLOT`，无命中抛 `POLICY_NO_MATCH`。

**两表对账（37 短语 ↔ 33 组名）**：交集 20 个组名；**只在 HELP 卡面、不在唤醒词表的组名 13 个**（筛选难度／筛选时间／筛选炊具／筛选状态／修改步骤／修改食材／导入食谱／添加派生关系／查看派生关系／从已有派生新菜／首次使用／批量改／备份）＝那 14 张 `【待开发】` 卡的来源；**只在唤醒词表、HELP 卡面无对应组的短语 17 条**（4 条 HELP 自身触发词：私家大厨HELP／菜谱HELP／查帮助／能做什么；13 条同义或细化词：看菜谱、看菜、搜菜、查食材、加菜、开始做菜、继续做菜、完成做菜、排除可选、查清单、清空清单、补录做菜、改评分）。

### 2.4 口径校验器（命令面孔的守卫，来自 `src/policy/index.ts:1-5`）

`validateDifficulty`／`validateStatus`／`validateHeat`／`validateCategory`／`validateRating`／`needName`／`needNameOrId`／`needNames`／`parseWriteOp`／`parseRecipeOp`／`parseHistoryKind`（档位表：难度 5 档、状态 4 种、火候 5 档、食材 11 类、评分 0-5，见 `SKILL.md:60-65`）。

---

## 3. 现有页面与 HTML 产出

### 3.1 `templates/*.html`（8 件，逐件用途）

八件同形：16 行、`<!DOCTYPE html>`＋`<title>`＋`<h1>`＋`<p class="cmd">chef-cmd-read <key></p>`＋三个共用标记（`<!--SHARED-CSS-->`／`<!--CONTENT-->`／`<!--SHARED-HELPERS-->`）。模板由 `src/render/templates.ts:36-42` `loadTemplate()` 从 `templates/` 目录读文件，`CHEF_TEMPLATES`（`:7-16`）白名单＝这 8 个名字，不在名单即抛 `CHEF_TEMPLATE_MISSING`。

| 模板文件 | `<title>`／`<h1>`（逐字） | 服务命令 | 用途 |
|---|---|---|---|
| `recipe_view.html` | 查看菜谱（`:5`／`:10`） | `chef.recipe.view` | 单菜全貌页壳（基本＋食材＋步骤＋历史统计＋营养占位） |
| `recipe_search.html` | 搜菜 | `chef.recipe.search` | 搜菜／筛菜／看全部列表页壳 |
| `recipe_write.html` | 加菜 | `chef.recipe.write` | 写菜回执页壳（新增／改／废弃／加食材／加步骤） |
| `cooking_run.html` | 开始做菜 | `chef.cooking.run` | 开做（步骤内联食材＋份数说明）页壳 |
| `shopping_query.html` | 买菜清单 | `chef.shopping.query` | 跨菜合并采购清单页壳 |
| `history_record.html` | 记录做菜 | `chef.history.record` | 记一次做菜回执页壳 |
| `history_query.html` | 做菜历史 | `chef.history.query` | 时间线／统计／质检／备份统一列表页壳 |
| `help.html` | 现找 | `chef.help.lookup` | **速查表（`mode:"lookup"`）产物页壳**；现找（`q`）不落盘 |

`package.json:16-20` 的 `files` 带 `templates/*.html`（随包发布）；`key → 模板`的一键一模板映射见 `src/render/templates.ts:20-32`。

### 3.2 `src/render/` 怎么产出 HTML

| 件 | 职责 | 关键导出与行号 |
|---|---|---|
| `render/envelope.ts` | key → shape 分配表 ＋ 造 envelope（`createEnvelope({skill:'chef', shape, key, data})`，全字段校验） | `CHEF_KEY_SHAPES`（`:5-14`）、`chefShapeFor`（`:16-20`）、`buildChefEnvelope`（`:23-36`）、`parseChefEnvelope`（`:38-41`） |
| `render/views.ts` | DB 行 → 各 key 的 envelope `data`（视图装配） | `toRecipeItem`（`:10-15`）、`recipeDetail`（`:28-46`，营养占位在 `:43`）、`buildRecipeSearch`（`:49-51`）、`buildRecipeReceipt`（`:54-56`）、`buildCookingRun`（`:65-82`）、`buildShopping`（`:87-94`）、`buildHistoryRecord`（`:97-99`）、`buildHistoryQuery`（`:102-104`）、`toHistoryItem`（`:106-110`）、`buildHelpItems`（`:115-133`） |
| `render/html.ts` | envelope **内容片**渲染 ＋ 标记填充 ＋ 体积门 | `renderEnvelopeHtml`（`:41-56`，按 shape 出 `list`／`detail`／`receipt`／`stat`／`analysis`／`fallback` 六种 section）、`escapeHtml`（`:7-9`）、三个标记常量（`:68-70`）、`fillTemplate`（`:75-85`）、`assertHtmlSize`（`:61-65`，上限 `CHEF_HTML_MAX_BYTES`＝256 KiB，`:5`） |
| `render/templates.ts` | 模板装载（读盘）与 key→模板映射 | 见 3.1 |

**产出链（非 help 键）**：`dispatch()` 出 data → `buildChefEnvelope` → `renderEnvelopeHtml(env)` 出 `<section data-skill="chef" data-shape=… data-key=…>…</section>` 内容片 → `fillTemplate(loadTemplate(templateFor(key)), 内容片)` 出整页 HTML → `assertHtmlSize` → 写盘（仅当给了 `--html`）。

### 3.3 HELP 全页（走共享层，A 路）

- 内容资产（`buildChefSceneData()`）→ 页面级派生（`buildChefHelpFileData(now, opts)`，`helpFile.ts:153-199`）→ **共享模板** `base-paint/help-shell` 的 `renderHelpShellHtml(data)`（`helpFile.ts:58`、`:206-209`）；模板源恒在 `packages/base-render/assets/help-template.html`（唯一真相源，生成器 `packages/base-render/scripts/gen-help-shell.cjs`）。
- 本包**不自持 HELP 页副本**（`helpFile.ts:1-7`）。
- 落点值（`src/help/manifest.ts`）：`DEFAULT_HELP_DIR='cook_html/help'`（`:24`）、`helpDirSegments()`（`:27-30`，取配置 `html.dir`）、`helpFileStem()`（`:33-35`，配置 `files.help`＝`私家大厨_HELP`）、`lookupFileStem()`（`:39-41`，配置 `files.lookup`＝`私家大厨_速查表`）；默认值表住 `src/config.ts:26-30`（`db.dir`／`db.name`＝`chef_data.db`／`html.dir`／`files.help`／`files.lookup`）。

---

## 4. 链路现状：唤醒词 → 命令 → 产出 HTML 绝对路径

### 4.1 唤醒词 → 命令

1. 自然语言进 `routeWakeword(text, ctx)`（`src/policy/wakewords.ts:54-73`）→ 最长匹配 `WAKE_TABLE` → 出 `{key, params}`（`ChefKey` 联合类型 `:5-7` 共 8 个）。
2. 模型／面板侧的调用形态：`chef-cmd-read <key> [--params '<json>']`（`SKILL.md:20-33` 的 `CALL-FORM` 段；入口＝`package.json` 的 `bin`）。DSH 里 agent 用工具 `run_chef_command`（见 4.4）。
3. `main()`（`cmd_read.ts:403-467`）：解析 argv（`:389-401`）→ 配置 key / 体检 key 先拦（`:413-422`）→ Node 版本预检（`:48-51`）→ 形状表校验 `chefShapeFor(key)`（`:425`）→ `chef.help.lookup` 走 `dispatchHelp(params)`（`:433`，**开库之前**），其余 7 键走 `dispatch(key, params)`（`:149-150` `openChefDb` 后 switch 分派）→ `buildChefEnvelope(key, data)`（`:434`）→ 交付或渲染 → 打印一行 envelope JSON（`:465`）。
4. 关键函数名：`dispatchHelp`（`:126-145`）、`dispatch`（`:148-387`）、`buildChefEnvelope`（`render/envelope.ts:23-36`）、`helpWindowOrFail`（`:124`）、`deliverChefHelp`（`help/output.ts:46-66`）、`fillTemplate`＋`templateFor`＋`loadTemplate`（`cmd_read.ts:437`）。

### 4.2 命令 → HTML 绝对路径（**只有 `chef.help.lookup` 一条路真的回绝对路径**）

- **`chef.help.lookup`（缺省）**：`dispatchHelp` 调 `buildChefHelpDelivery(dbPath, new Date())`（`cmd_read.ts:140`）→ 返回 `{html, target:{dir, stem}, index}`（`help/helpFile.ts:256-268`，落点目录由 `chefHelpDir()` 拼：`resolve(dirname(dbPath), ...helpDirSegments())`，`:215-218`）→ `cmd_read.ts:439-444` 把 `{explicit: o.html, target, html, reuseMs?}` 交给 `deliverChefHelp` → `saveHtmlFile({dir, stem, html, onExists})`（`help/output.ts:63-65`，共用件 `base-paint/save-html`）→ 回 `HtmlReceipt`（`base-render/src/output/saveHtml.ts:81-84`：`{mode:'file', path, bytes}`，`path` 恒为**绝对路径**）→ `cmd_read.ts:465` 顶层追加 `delivery`。
- **`chef.help.lookup`（`mode:"lookup"`）**：`buildChefLookupLanding(dbPath)`（`helpFile.ts:273-275`，只给落点意图、**不渲染页面**）→ 出口拿信封走本包 `templates/help.html`：`html = fillTemplate(loadTemplate(templateFor('chef.help.lookup')), renderEnvelopeHtml(env))`（`cmd_read.ts:437`）→ 同样走 `deliverChefHelp` → 同样回 `delivery.path`。
- **`chef.help.lookup`（`q` 现找）**：`dispatchHelp` 只返 `data`，**落到磁盘的只有已有一份被复用**——`delivery{mode:'file', path, bytes}` 指向 24 小时内那份（缺省复用窗口 `HELP_REUSE_DEFAULT_HOURS=24`，换算件 `base-paint/save-html` 的 `helpReuseWindowOf`／`reuseWindowOfHours`，`cmd_read.ts:37`／`:124`；`--html <路径>` 那支**不吃复用**，逐字覆盖写）。
- **其余 7 键**：默认**不产任何 HTML 文件**（stdout 只一行 envelope JSON，`cmd_read.ts:465`）。只有显式给 `--html <路径>` 时才渲染整页并写盘：`renderEnvelopeHtml(env)` → `assertHtmlSize` → `writeFileSync(o.html, html, 'utf8')`（`cmd_read.ts:445-450`）。

### 4.3 回包里的绝对路径字段（逐字段抄）

- **顶层字段只有一个**：`{...env, delivery}`（`cmd_read.ts:465`）新增的 **`delivery`**，形状＝共用件回执（`help/output.ts:37` 别名 `ChefHtmlDelivery = HtmlReceipt`）：**`delivery.mode`（`'file'`）／`delivery.path`（绝对路径）／`delivery.bytes`（实际落盘字节数）**。
- envelope 本身五字段（`base-link-core` 的 `createEnvelope`）：`version`／`skill`（`'chef'`）／`shape`／`key`／`data`（`:36-38`、`src/cli/config.ts:36-38`）。**`data` 里没有任何路径字段**：
  - `chef.help.lookup` 缺省支 `data`＝域级索引 `{items:[{id, icon, label, subgroupCount, sceneCount}], total, sceneTotal, subgroupTotal, mode:'file', bytes}`（`helpFile.ts:222-250`、`cmd_read.ts:142`）；
  - `mode:"lookup"` 支 `data`＝`{items:[{phrase, key, shape, cli, desc}], total, mode:'lookup'}`（`render/views.ts:113-133`）；
  - 其余键的 `data` 里**没有 path／file／html 字段**（`views.ts` 全部装配函数：`:28`／`:49`／`:54`／`:65`／`:87`／`:97`／`:102`）。
- **结论**：库里唯一「HTML 绝对路径」的字段名是 **`delivery.path`**；`--html` 那支**不在回包中回显路径**（写盘后 `delivery` 仍是 `undefined`，`:445-450`）。
- 落盘命名规则不在本技能里：时间戳 `YYYYMMDD_HHMMSS`、同秒 `_N` 递补、`wx` 独占创建、绝不静默覆盖，唯一定义地＝共用件 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`，`help/output.ts:2-17` 自述）。

### 4.4 插件（`packages/plugin-chef`）怎么把命令调起来

| 通道 | 函数／常量 | 行为 | 行号 |
|---|---|---|---|
| agent 工具（首选） | `SKILL_TOOL_NAME = 'run_chef_command'`、`createSkillTool(deps)` | `apply()` 经 `ctx.tools.register()` 注册；**不经会话 shell、不读 PATH**，在宿主进程里 spawn 技能唯一出口，**返回 stdout 原文（整行 envelope JSON，含顶层 `delivery`）** | `skill-tool.ts:20`、`:82-118`、`:108-116`；注册 `index.ts:70-81` |
| 入口解析 | `resolveSkillEntry(packageDir)`／`entryFromInstalledPackage()` | 按技能包 `package.json` 的 `bin` 挑唯一出口（名字以 `-cmd-read` 结尾那条） | `skill-tool.ts:28-65` |
| 运行时 | `resolveNodeBin(execPath)` | execPath 是 node 直用；Electron 宿主＝同二进制加 `ELECTRON_RUN_AS_NODE=1` | `bridge.ts:83-86` |
| 面板／跨技能取数桥 | `readViaCli(key, params)` | `spawnSync(node, [cliPath(), key, '--params', JSON.stringify(params)], {timeout:20000})`；**只返 `env.data`** | `bridge.ts:89-113`、`SPAWN_TIMEOUT_MS` `:77` |
| 面板 RPC | `HOST_CALL_METHOD = 'ilife.chef.read'`、`requestViaHost()`、`handleHostCall()` | 面板只经 `host.call` → 桥 → CLI | `bridge.ts:17`、`:66-73` |
| 设置页端点 | `RPC_CHANNEL` 等 4 个端点 → `readConfigSurface()`／`writeConfigValues()`／`resetConfigToDefaults()`／`readConfigHealth()` | 只覆盖 4 个配置／体检 key | `index.ts:34-53`、`bridge.ts:126-150` |
| 技能提供方 | `provider`（`PROVIDER_NAME='dsh-chef'`，`SKILL_NAME='skill-chef'`） | 把技能包的 `SKILL.md` 正文（frontmatter 后）交给宿主 skills 面，`resourceBase` 指向技能包目录 | `skill-provider.ts:87-125` |
| 侧栏槽位 | `SLOT_ID='ilife:chef'`、`TAB_COMPONENT={kind:'native', name:'ChefPanel'}` | 只注册**一个**设置页（单例，order 95）；客户端文件自述「**没有任何干活入口**——搜菜、记做菜在技能功能页（sidebar 槽），不在本文件」 | `slot.ts:10-29`；`client.ts:4-5` |

**两处关键落差（链路事实）**：

1. `readViaCli`（面板／`host.call` 通道）**只返回 `env.data`，把顶层 `delivery` 丢掉**（`bridge.ts:112`）⇒ 面板侧拿不到 `delivery.path`；拿得到绝对路径的只有 agent 工具 `run_chef_command`（返回 stdout 全文）与直接在会话里跑 CLI。
2. 插件包**只有设置页，没有功能页**（无 sidebar 功能槽实现、无 chef 业务页面组件）；`client.ts:4-5` 那句「搜菜、记做菜在技能功能页（sidebar 槽）」在当前包内**没有对应实现**。

---

## 5. 缺口对照表：HELP 卡面（48）↔ 命令面（12 键）↔ 页面（8 模板）

判定口径（本节自定，逐条可核）：

- **已实现**＝该卡有真实命令（key 存在且语义匹配）＋该命令有模板页，且卡面语义由命令载荷直接满足；
- **仅HELP文案（桩）**＝卡面只有 HELP 文案与 `prompt_template`，命令面**无任何**对应能力（含 `【待开发】` 卡）；
- **有命令无页面**＝命令存在且语义匹配，但产出**没有**对应模板页；
- **其他**＝命令有无与卡面语义对不上，逐条在「其他细类」列写明（有命令无唤醒词／路由错位／半量命令／占位或语义不符）。

### 5.1 逐条判定（48 条）

| 序 | 域 | 组（唤醒词） | 卡 id | 场景名（逐字） | 状态 | 其他细类 | 证据（文件:行号） |
|---|---|---|---|---|---|---|---|
| 1 | 做菜 | 做菜模式 | `cooking_start_fresh` | 全新开始(含每步内联 + 完结闭环) | 已实现 | — | 卡 `sceneData.ts:43`；命令 `cmd_read.ts:282-301`；模板 `templates/cooking_run.html:11` |
| 2 | 做菜 | 做菜模式 | `cooking_start_with_history` | 含上次经验(历史驱动再开做) | 已实现 | — | 卡 `sceneData.ts:44`；历史统计 `cmd_read.ts:299`；提示文案 `render/views.ts:77-80` |
| 3 | 做菜 | 做菜模式 | `cooking_start_double_servings` | 双份份量 | 已实现 | — | 卡 `sceneData.ts:45`；`servings` 缩放 `cmd_read.ts:283-291` |
| 4 | 做菜 | 做菜模式 | `cooking_resume_after_pause` | 断点续做(AI 会话记忆) | 其他 | 无断点状态（命令每次全量重开） | 卡 `sceneData.ts:46`；`cmd_read.ts:284` 只取 `getRecipeDetail`；DDL 无进度表 `fetch/db.ts:50-96` |
| 5 | 做菜 | 做菜模式 | `cooking_during_waiting_step` | 等待步骤中并行做其他 | 仅HELP文案 | — | 卡 `sceneData.ts:47`；`WAKE_TABLE` 无该短语 `policy/wakewords.ts:12-50` |
| 6 | 查看 | 查看食谱 | `view_full_recipe` | 完整食谱 | 已实现 | — | 卡 `sceneData.ts:52`；命令 `cmd_read.ts:154-156`；模板 `templates/recipe_view.html:11` |
| 7 | 查看 | 查看食谱 | `view_for_beginner` | 新手强调(关键成功点) | 其他 | 无 `user_state` 字段（只靠 AI 文案） | 卡 `sceneData.ts:53`；`render/views.ts:28-46` 载荷无该字段 |
| 8 | 查看 | 查看食谱 | `view_recipe_with_substitution` | 替换食材预览(临时假设) | 仅HELP文案 | — | 卡 `sceneData.ts:54`；无替换预览命令（`substitute` 只是食材列 `fetch/db.ts:68`） |
| 9 | 查看 | 查看食材 | `view_ingredients_only` | 只看食材 | 已实现 | — | 卡 `sceneData.ts:57`；`views.ts:29` 返回 `ingredients`（有序） |
| 10 | 查看 | 查看食材 | `view_ingredients_grouped` | 食材分组(11 大类) | 已实现 | — | 卡 `sceneData.ts:58`；`ingredients.category` DDL `fetch/db.ts:68`；11 类口径 `SKILL.md:63` |
| 11 | 查看 | 查看步骤 | `view_steps_only` | 只看步骤 | 已实现 | — | 卡 `sceneData.ts:61`；`views.ts:30` 返回 `steps`（有序） |
| 12 | 查看 | 查看营养 | `view_nutrition_only` | 只看营养 | 其他 | 占位（`nutrition.estimated:false`、无营养命令） | 卡 `sceneData.ts:64`；`render/views.ts:42-43`；表在无命令 `fetch/db.ts:94` |
| 13 | 查看 | 查看背景 | `view_background_only` | 只看背景文化 | 仅HELP文案 | — | 卡 `sceneData.ts:67`；`recipes` 列无背景字段 `fetch/db.ts:51`；`background_knowledge` 表无命令 `fetch/db.ts:87` |
| 14 | 搜索筛选 | 搜索食谱 | `search_by_name_keyword` | 关键词搜索(菜名/食材) | 已实现 | — | 卡 `sceneData.ts:72`；命令 `cmd_read.ts:157-184`；模板 `templates/recipe_search.html:11` |
| 15 | 搜索筛选 | 搜索食谱 | `search_fuzzy_match` | 错字模糊匹配(纠错提示) | 其他 | 无纠错（只有 SQL `LIKE`） | 卡 `sceneData.ts:73`；`fetch/db.ts:288-295` |
| 16 | 搜索筛选 | 筛选菜系 | `filter_cuisine_basic` | 按菜系筛选 | 已实现 | — | 卡 `sceneData.ts:76`；`filter`→`cuisine` 别名 `cmd_read.ts:176`；`fetch/db.ts:345` |
| 17 | 搜索筛选 | 筛选菜系 | `filter_combined` | 多维组合筛选(≤3 维) | 已实现 | — | 卡 `sceneData.ts:77`；多键 AND `cmd_read.ts:168-181`；`fetch/db.ts:334-354` |
| 18 | 搜索筛选 | 筛选食材 | `filter_by_ingredient_basic` | 按食材筛选 | 其他 | **路由错位**：`筛选食材` 的 `filter` 被映射成 `cuisine` | 卡 `sceneData.ts:80`；`policy/wakewords.ts:29` vs `cmd_read.ts:176`（`filterRecipes` 无按食材名过滤 `fetch/db.ts:334-354`） |
| 19 | 搜索筛选 | 筛选食材 | `filter_exclude_ingredient` | 排除食材(忌口) | 仅HELP文案 | — | 卡 `sceneData.ts:81`；`filterRecipes` 无 `NOT EXISTS` 排除支 `fetch/db.ts:334-354` |
| 20 | 搜索筛选 | 筛选难度 | `filter_difficulty_easy` | 按难度筛选 | 其他 | **有命令无唤醒词**（命令收 `difficulty`） | 卡 `sceneData.ts:84`（`【待开发】`）；`fetch/db.ts:339`；`WAKE_TABLE` 无该短语 `policy/wakewords.ts:12-50` |
| 21 | 搜索筛选 | 筛选时间 | `filter_time_quick` | 按时间筛选(30 分钟内) | 其他 | **有命令无唤醒词**（`maxTime`／`time_max`／`time`） | 卡 `sceneData.ts:87`（`【待开发】`）；`cmd_read.ts:177-178`；`fetch/db.ts:340` |
| 22 | 搜索筛选 | 筛选炊具 | `filter_by_cookware` | 按炊具筛选 | 其他 | **有命令无唤醒词**（命令收 `cookware`） | 卡 `sceneData.ts:90`（`【待开发】`）；`fetch/db.ts:351` |
| 23 | 搜索筛选 | 筛选口味 | `filter_by_flavor` | 按口味筛选 | 其他 | **路由错位**：唤醒词→`filter`→`cuisine`（命令本身能收 `flavor`） | 卡 `sceneData.ts:93`；`policy/wakewords.ts:30` vs `cmd_read.ts:176`；`fetch/db.ts:348` |
| 24 | 搜索筛选 | 筛选季节 | `filter_by_season` | 按季节筛选 | 其他 | **路由错位**：同上（命令本身能收 `season`） | 卡 `sceneData.ts:96`；`policy/wakewords.ts:31` vs `cmd_read.ts:176`；`fetch/db.ts:346` |
| 25 | 搜索筛选 | 筛选状态 | `filter_by_status` | 按状态筛选 | 其他 | **有命令无唤醒词**（命令收 `status`） | 卡 `sceneData.ts:99`（`【待开发】`）；`fetch/db.ts:337` |
| 26 | 搜索筛选 | 查看全部 | `list_all_recipes` | 列出所有食谱 | 已实现 | — | 卡 `sceneData.ts:102`；`kind:'all'` `cmd_read.ts:164-166`；`fetch/db.ts:279-286` |
| 27 | 修改 | 修改食谱 | `update_main_fields` | 修改食谱主信息 | 已实现 | — | 卡 `sceneData.ts:107`；`op:'update'` `cmd_read.ts:217-238`；模板 `templates/recipe_write.html:11` |
| 28 | 修改 | 修改步骤 | `update_step_content` | 修改步骤(内容/重排) | 仅HELP文案 | （只有 `add-step` 追加新步，无编辑/重排） | 卡 `sceneData.ts:110`（`【待开发】`）；`cmd_read.ts:263-278`；`fetch/db.ts:313-332` 的 `updateRecipe` 只改主表 |
| 29 | 修改 | 修改食材 | `update_ingredient` | 修改食材(用量/添加/关联步骤) | 其他 | 半量命令：只能 `add-ingredient` 增行 | 卡 `sceneData.ts:113`（`【待开发】`）；`cmd_read.ts:245-262` |
| 30 | 修改 | 废弃食谱 | `discard_recipe` | 废弃食谱(只增不删) | 已实现 | — | 卡 `sceneData.ts:116`；`op:'discard'/'deprecate'` `cmd_read.ts:239-244`；`fetch/db.ts:307-311` |
| 31 | 历史 | 记录做菜 | `record_cook` | 记录做菜(完整 + 快速 + 补录) | 已实现 | — | 卡 `sceneData.ts:121`；命令 `cmd_read.ts:314-326`；模板 `templates/history_record.html:11` |
| 32 | 历史 | 查看历史 | `view_history_list` | 历史时间线 | 已实现 | — | 卡 `sceneData.ts:124`；`kind:'timeline'` `cmd_read.ts:330-335`；模板 `templates/history_query.html:11` |
| 33 | 历史 | 查看统计 | `view_stats_dashboard` | 单菜统计 | 已实现 | — | 卡 `sceneData.ts:127`；`kind:'stats'`＋`name` `cmd_read.ts:336-342` |
| 34 | 历史 | 查看统计 | `view_stats_global` | 全局统计(整体画像) | 已实现 | — | 卡 `sceneData.ts:128`；`kind:'stats'` 无 `name` `cmd_read.ts:343-349` |
| 35 | 采购 | 生成清单 | `shopping_generate` | 生成采购清单 | 已实现 | （库存核对不直调居家管家，只给 prompt） | 卡 `sceneData.ts:133`；命令 `cmd_read.ts:302-313`；模板 `templates/shopping_query.html:11` |
| 36 | 录入 | 录入食谱 | `add_from_image` | 图片录入(识别图片) | 仅HELP文案 | — | 卡 `sceneData.ts:138`；`op:'add'` 只收文本字段 `cmd_read.ts:188-216` |
| 37 | 录入 | 录入食谱 | `add_from_markdown` | MD 文件录入 | 仅HELP文案 | — | 卡 `sceneData.ts:139`；同上（无文件解析入口） |
| 38 | 录入 | 录入食谱 | `add_from_conversation` | 对话录入(逐步收集) | 已实现 | — | 卡 `sceneData.ts:140`；`op:'add'` ＋ `ingredients[]`／`steps[]` `cmd_read.ts:188-216` |
| 39 | 录入 | 录入食谱 | `add_from_template` | 结构化模板录入(表单) | 其他 | 无表单页（`recipe_write.html` 只是回执行） | 卡 `sceneData.ts:141`；`templates/recipe_write.html:10`（`<h1>加菜</h1>`） |
| 40 | 录入 | 导入食谱 | `import_from_json` | JSON 文件导入 | 仅HELP文案 | — | 卡 `sceneData.ts:144`（`【待开发】`）；命令面无导入键 `cmd_read.ts:148-387` |
| 41 | 录入 | 导入食谱 | `import_validation_failed` | 导入校验失败(补齐后重试) | 仅HELP文案 | — | 卡 `sceneData.ts:145`（`【待开发】`）；同上 |
| 42 | 派生 | 添加派生关系 | `add_relation` | 添加派生关系 | 仅HELP文案 | — | 卡 `sceneData.ts:150`（`【待开发】`）；`recipe_relations` 表在无命令 `fetch/db.ts:89` |
| 43 | 派生 | 查看派生关系 | `view_relation_tree` | 查看派生关系(家族树) | 仅HELP文案 | — | 卡 `sceneData.ts:153`（`【待开发】`）；同上 |
| 44 | 派生 | 从已有派生新菜 | `derive_from_existing` | 从已有派生新菜 | 仅HELP文案 | — | 卡 `sceneData.ts:156`（`【待开发】`）；命令面无该键 |
| 45 | 开始使用 | 首次使用 | `first_use` | 首次使用(初始化工作流) | 仅HELP文案 | （HELP 横幅 `prompt` 反向取自本卡） | 卡 `sceneData.ts:161`（`【待开发】`）；横幅 `help/helpFile.ts:69`／`:130-144`／`:190-197`；无初始化命令 `cmd_read.ts:148-387` |
| 46 | 数据管理 | 体检 | `data_quality_report` | 数据质量报告 | 其他 | 语义不符：映射到 `history.query kind:'quality'`（口碑质检，不是数据质量报告） | 卡 `sceneData.ts:166`；短语 `policy/wakewords.ts:49`；分派 `cmd_read.ts:350-368` |
| 47 | 数据管理 | 批量改 | `data_batch_edit` | 批量编辑 | 仅HELP文案 | — | 卡 `sceneData.ts:169`（`【待开发】`）；命令面无批量键 |
| 48 | 数据管理 | 备份 | `data_export_backup` | 导出备份 | 其他 | 语义不符：`kind:'backup'` 只回 `healthCheck` 问题清单，不导出文件 | 卡 `sceneData.ts:172`（`【待开发】`）；`cmd_read.ts:369-374` |

### 5.2 计数（48 条）

| 状态 | 条数 | 序号 |
|---|---|---|
| 已实现 | **19** | 1, 2, 3, 6, 9, 10, 11, 14, 16, 17, 26, 27, 30, 31, 32, 33, 34, 35, 38 |
| 仅HELP文案（桩，无任何命令） | **14** | 5, 8, 13, 19, 28（含半量 `add-step`）, 36, 37, 40, 41, 42, 43, 44, 45, 47 |
| 有命令无页面 | **0** | —（见 5.3 的说明） |
| 其他 | **15** | 4, 7, 12, 15, 18, 20, 21, 22, 23, 24, 25, 29, 39, 46, 48 |

「其他」15 条的细类拆分：

| 细类 | 条数 | 序号 |
|---|---|---|
| 有命令无唤醒词（命令能收该维度，HELP 却标 `【待开发】`／无唤醒词） | 4 | 20（`difficulty`）, 21（`maxTime`）, 22（`cookware`）, 25（`status`） |
| 路由错位（唤醒词 `filter` 被映射到 `cuisine`，而卡面要的是 `ingredient`／`flavor`／`season`） | 3 | 18, 23, 24 |
| 无状态／无字段／占位／半量命令／语义不符 | 8 | 4, 7, 12, 15, 29, 39, 46, 48 |

### 5.3 命令级与页面级缺口（另一视角，供交叉核对）

- 8 条唤醒词命令**每条都有模板页**（`render/templates.ts:20-32` 一键一模板）⇒ 按「该命令有无模板」口径，「有命令无页面」＝ 0；**命令级真正无页面的有 4 条**：`chef.config.read`／`chef.config.write`／`chef.config.reset`／`chef.config.check`（设置页专用，`cli/config.ts:17-21`、`cli/health.ts:15`，`CHEF_KEY_SHAPES` 里也没有它们）。这些命令不是 HELP 卡，故不进 5.1 表。
- HELP 有卡、唤醒词表无词：13 个组名／14 张卡（§2.3）。
- 唤醒词表有词、HELP 卡面无对应组：17 条短语（其中 4 条是 HELP 自身触发词）。
- **命令面能收、但 HELP 既无卡又无词**：`chef.recipe.write op:'add-ingredient'` 与 `op:'add-step'`（`cmd_read.ts:245-278`）——它们在 `policy/recipe.ts` 的 `RecipeOp` 里，但 `WAKE_TABLE` 与 48 张卡都没有对应项。
- **DB 表在、命令不在**（DDL 17 张表，`fetch/db.ts:50-96`；`src/health.ts:49` 阈值 17）：`nutrition_info`（营养）、`background_knowledge`（背景文化）、`recipe_relations`（派生关系）、`step_ingredients`（食材↔步骤关联）、`step_techniques`（技法／关键点）、`tips`（小贴士）六类表**没有任何命令读写路径**——正好对应卡 8／12／13／29／42／43／44 的空缺。
- `chef.history.query` 的 4 个 `kind`（`timeline`／`stats`／`quality`／`backup`）共用**同一个**模板 `history_query.html`（通用列表页），无各自专属页面。

---

## 6. 形态与唯一出口的声明；既有文档清单

### 6.1 `packages/skill-chef/SKILL.md`（119 行）

- **形态**：frontmatter `name: skill-chef`＋一句 `description`（含完整触发词清单，`SKILL.md:1-4`）；正文＝说明面（本地菜谱：搜菜／查看／加菜、跟着做、买菜清单合并、做菜记录与历史、体检排序、HELP 交付）。
- **唯一出口声明**（逐字要点）：`SKILL.md:7`「唯一出口 `chef-cmd-read <chef.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。写走 receipt（直通即真相）。」
- **调用形态段**（`CALL-FORM-START`…`END`，`:20-33`）：入口＝技能包 `package.json` 的 `bin` → `dist/cli/cmd_read.js`；命令名解析不到时的两级回退（`node <技能基目录>/dist/cli/cmd_read.js` → `npx -p skill-chef chef-cmd-read`）；「换走法的信号只有一个：命令名解析不到」。
- **HELP 交付契约**（`:35-56`）：缺省落 `<库目录>/<产物目录>/私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`，stdout 顶层多 `delivery{mode,path,bytes}`，**`path` 恒为绝对路径，把 `delivery.path` 告诉用户**；`mode:"lookup"` 落 `私家大厨_速查表_<stamp>.html`；`q` 现找不落盘；`--html` 逐字落点；复用窗口缺省一天。**完成判据**（`:47`）＝`delivery.path` 指的文件存在且大小＝`delivery.bytes`。
- **联动速查表**（`:70-114`，`HELP-AUTO-START`…`END`，构建期由 `scripts/build-help.mjs` 注入、勿手改）：37 行「唤醒词 | key | shape | 例」。
- 另有口径段（`:58-68`，难度／状态／火候／食材分类／评分／空结果阻断／一期限制／真实数据禁迁／跨技能只复制 prompt 不直调）、环境与出 scope 段（`:116-119`：路径类取值一律读 `~/.ilife/chef.yaml`，环境变量不参与配置）。

### 6.2 `packages/skill-chef/AGENTS.md`（32 行）

- 结构形状照仓规 `docs/agents/structure.md`；本包只多记一条自己的数字（`AGENTS.md:3`）。
- **文件行数告警线＝350 行，LF 口径只数 `\n`**（`:7`）；范围＝`src/**/*.ts` 与 `scripts/*.mjs`，不算 `templates/*.html`／`SKILL.md`／`test/*.mjs`／`dist`（`:9-11`）；超线触发「必报五步」第四步（`:11`）。
- 本包现状表（`:15-23`）：`src/cli/cmd_read.ts` **460**（已超线）、`src/fetch/db.ts` **451**（已超线）、`scripts/gen-help-assets.mjs` **436**（已超线）；其余在 350 内（`src/help/helpFile.ts` 210、`src/help/output.ts` 63、`src/help/lookup.ts` 44）。
- 发布段（`:25-32`）：技能 `scripts/wizard-publish.sh` 发 `skill-chef@0.3.0`（硬前提 `base-paint@0.3.6`）；插件 `packages/plugin-chef/scripts/wizard-publish.sh` 发 `dsh-chef@0.3.1`。

⚠️ **AGENTS.md 的一处过期事实**：`:23` 逐字写着「表里曾有一行 `src/help/manifest.ts`——**本包没有这个件**（`manifest.ts` 是 skill-memo-ilife 的）」，但工作区**现在有这个件**：`src/help/manifest.ts`（41 行，`DEFAULT_HELP_DIR`／`helpDirSegments`／`helpFileStem`／`lookupFileStem`），由 `src/help/helpFile.ts:62` 与 `src/cli/cmd_read.ts` 链路实际使用。

### 6.3 `docs/skills/skill-chef/` 既有文档清单（45 件，全部为文件）

| 类别 | 文件 |
|---|---|
| 地图／台账 | `map-chef-body.md`、`map-chef-addendum-218.md`、`map-chef-tickets.json`、`t208-build-map.mjs`、`t208-rebuild-tickets-json.mjs` |
| 结构设计 | `t236-structure-design.md`、`t245-frontier.html`、`t3-template-contract.md`、`t6-render-wiring.md` |
| 内容对账 | `t2-content-reconcile.md`、`t695-证据.md` |
| 逐票 body | `t1-body.md`、`t2-body.md`、`t3-body.md`、`t4-body.md`、`t5-body.md`、`t6-body.md`、`t7-body.md`、`t8-body.md`、`t9-body.md`、`t10-body.md`、`t11-body.md`、`t12-body.md`、`t13-body.md` |
| 评审／验证 | `t1-review-A.md`、`t1-review-B.md`、`t1-verify.md`、`t2-review-A.md`、`t2-review-B.md`、`t2-verify.md`、`t3-review-A.md`、`t3-review-B.md`、`t3-verify.md`、`t10-review-A.md`、`t10-review-B.md`、`t10-install.md`、`t1-bill-recipe.md` |
| 证据目录 | `t11-evidence/README.md`、`t11-evidence/checks.md`、`t11-evidence/run-commands.md`、`t11-evidence/help-desktop-1440.png`、`t11-evidence/help-desktop-1440x900.png`、`t11-evidence/help-mobile-375.png`、`t11-evidence/help-mobile-375x900.png`、`t11-evidence/lookup-mobile-375.png`、`t11-evidence/neighbor-bill-mobile-375.png` |

`D:\ilife\docs\skills\skill-chef\` 下**没有** `SKILL.md`／`AGENTS.md` 一类的形态文档，也没有本次缺口对照的既有台账（本节即新建）。

---

## 附：调查边界与未验证项

1. 本次只读源码与文档，**未运行**任何 `chef-cmd-read` 命令、未开库、未落盘 HTML；`delivery.path` 的绝对路径形态来自共用件契约（`base-render/src/output/saveHtml.ts:81-84`）与 `SKILL.md:40` 的声明，非本机实跑读数。
2. `dist/` 为构建产物，未逐件核对与 `src/` 是否同步（本次所有判定均以 `src/` 工作区文本为准）。
3. 「已实现」的语义匹配判定按 5.1 表所列证据行；若需求方的匹配口径更严（例如要求每张卡有独立页面），第 5 节计数需按新口径重算。
