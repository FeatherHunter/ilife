# 老私家大厨：场景与产物权威清单

> 调查对象（只读，未修改任何源码）：`D:\2Study\StudyNotes\SKILLS\私家大厨`
> 计数口径：「场景」= `scenes\*.yaml` 的 `- id:` 条目；「唤醒词条」= 每个场景的 `wake_word` 字段（本技能每个场景恰好 1 条）；「去重唤醒词」= 全库唯一值。
> 实际读取的文件：`scenes\` 全 10 个 yaml、`references\{scenarios.yaml, wake_word_variants.md, commands.md, enums.py, categories.md}`、`SKILL.md`、`scripts\{render_*.py, 场景合并.py, recipe_render.py, cooking_render.py, shopping_render.py, export_backup.py}`、`templates\` 全量目录树。

---

## 1. 功能域划分

### 1.1 十个域（G1–G10）总表

| # | 域 key | 域中文名 | 图标 | 设计批次 | 场景资产文件 | 场景数 | 去重唤醒词数 | wake_word 条目数 |
|---|--------|----------|------|----------|--------------|--------|--------------|------------------|
| 1 | setup | 开始使用 | 🚀 | G1 | `scenes\开始使用.yaml` | 1 | 1 | 1 |
| 2 | add | 录入 | 📝 | G2 | `scenes\录入.yaml` | 6 | 2 | 6 |
| 3 | view | 查看 | 👀 | G3 | `scenes\查看.yaml` | 8 | 5 | 8 |
| 4 | search | 搜索筛选 | 🔍 | G4 | `scenes\搜索筛选.yaml` | 13 | 10 | 13 |
| 5 | cook | 做菜 | 🍳 | G5 | `scenes\做菜.yaml` | 5 | 1 | 5 |
| 6 | shopping | 采购 | 🛒 | G6 | `scenes\采购.yaml` | 1 | 1 | 1 |
| 7 | history | 历史 | 📜 | G7 | `scenes\历史.yaml` | 4 | 3 | 4 |
| 8 | update | 修改 | ✏️ | G8 | `scenes\修改.yaml` | 4 | 4 | 4 |
| 9 | relation | 派生 | 🌿 | G9 | `scenes\派生.yaml` | 3 | 3 | 3 |
| 10 | data | 数据管理 | 🗄️ | G10 | `scenes\数据管理.yaml` | 3 | 3 | 3 |
| — | 合计 | — | — | — | 10 个文件 | **48** | **33** | **48** |

### 1.2 各文件内的场景编号与场景名（逐文件穷举）

**`scenes\开始使用.yaml`（1 场景）**

| 场景编号 | scenario_id | 场景名（scenario_title） |
|---|---|---|
| setup-1 | first_use | 首次使用(初始化工作流) |

**`scenes\录入.yaml`（6 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| add-1 | add_from_conversation | 对话录入(逐步收集) |
| add-2 | add_from_image | 图片录入(识别图片) |
| add-3 | add_from_markdown | MD 文件录入 |
| add-4 | add_from_template | 结构化模板录入(表单) |
| add-5 | import_from_json | JSON 文件导入 |
| add-6 | import_validation_failed | 导入校验失败(补齐后重试) |

**`scenes\查看.yaml`（8 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| view-1 | view_full_recipe | 完整食谱 |
| view-2 | view_for_beginner | 新手强调(关键成功点) |
| view-3 | view_recipe_with_substitution | 替换食材预览(临时假设) |
| view-4 | view_ingredients_only | 只看食材 |
| view-5 | view_ingredients_grouped | 食材分组(11 大类) |
| view-6 | view_steps_only | 只看步骤 |
| view-7 | view_nutrition_only | 只看营养 |
| view-8 | view_background_only | 只看背景文化 |

**`scenes\搜索筛选.yaml`（13 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| search-1 | search_by_name_keyword | 关键词搜索(菜名/食材) |
| search-2 | search_fuzzy_match | 错字模糊匹配(纠错提示) |
| search-3 | filter_cuisine_basic | 按菜系筛选 |
| search-4 | filter_combined | 多维组合筛选(≤3 维) |
| search-5 | filter_by_ingredient_basic | 按食材筛选 |
| search-6 | filter_exclude_ingredient | 排除食材(忌口) |
| search-7 | filter_difficulty_easy | 按难度筛选 |
| search-8 | filter_time_quick | 按时间筛选(30 分钟内) |
| search-9 | filter_by_cookware | 按炊具筛选 |
| search-10 | filter_by_flavor | 按口味筛选 |
| search-11 | filter_by_season | 按季节筛选 |
| search-12 | filter_by_status | 按状态筛选 |
| search-13 | list_all_recipes | 列出所有食谱 |

**`scenes\做菜.yaml`（5 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| cook-1 | cooking_start_fresh | 全新开始(含每步内联 + 完结闭环) |
| cook-2 | cooking_start_with_history | 含上次经验(历史驱动再开做) |
| cook-3 | cooking_start_double_servings | 双份份量 |
| cook-4 | cooking_resume_after_pause | 断点续做(AI 会话记忆) |
| cook-5 | cooking_during_waiting_step | 等待步骤中并行做其他 |

**`scenes\采购.yaml`（1 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| shopping-1 | shopping_generate | 生成采购清单 |

**`scenes\历史.yaml`（4 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| hist-1 | record_cook | 记录做菜(完整 + 快速 + 补录) |
| hist-2 | view_history_list | 历史时间线 |
| hist-3 | view_stats_dashboard | 单菜统计 |
| hist-4 | view_stats_global | 全局统计(整体画像) |

**`scenes\修改.yaml`（4 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| update-1 | update_main_fields | 修改食谱主信息 |
| update-2 | update_step_content | 修改步骤(内容/重排) |
| update-3 | update_ingredient | 修改食材(用量/添加/关联步骤) |
| update-4 | discard_recipe | 废弃食谱(只增不删) |

**`scenes\派生.yaml`（3 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| rel-1 | add_relation | 添加派生关系 |
| rel-2 | view_relation_tree | 查看派生关系(家族树) |
| rel-3 | derive_from_existing | 从已有派生新菜 |

**`scenes\数据管理.yaml`（3 场景）**

| 场景编号 | scenario_id | 场景名 |
|---|---|---|
| data-1 | data_quality_report | 数据质量报告 |
| data-2 | data_batch_edit | 批量编辑 |
| data-3 | data_export_backup | 导出备份 |

### 1.3 `references\scenarios.yaml` 是否给出更全的清单？—— 不更全，覆盖等价

- 实测计数：顶层 `- wake_word:` 组 = **33**，`- scenario_id:` 场景 = **48**。与 `scenes\*.yaml` 合并后的 33 / 48 **完全一一对应**（scenario_id 集合相同，无增无减）。
- 身份：`references\scenarios.yaml` 是**旧快照**，`meta.version: 0.1.0`、`generated_at: 2026-07-27`；`scenes\{域}.yaml` 是**域内权威**（`version: "1.0"`，G1–G10 grilling 定案日期 2026-08-07/08）。
- 改总账的唯一通道是 `scripts\场景合并.py`（按 `scenario_id` 匹配，用域 yaml 覆盖 `wake_word / scenario_title / dimensions / type / status / prompt / result / html / variants`；`--prune` 删孤儿）。合并器头注释明确记录：规格阶段收敛曾残留 **26 个孤儿场景**。
- 差异点（scenarios.yaml 相对 scenes 的独有/落后之处）：
  1. 独有顶层段：`prompt_rules`、`status_legend`、`methodology`（rule_1~rule_5）、`boundary_templates`、`self_check`（s01–s14，后 8 项为 `pending`）。
  2. 独有 `aliases` 段，仅 2 组：`做菜模式 ← 开始做菜`；`废弃食谱 ← 不想要 / 删掉 / 废弃`。
  3. **无域分组**：scenes 有 `domain:{key,name,icon,g}`；scenarios.yaml 只在部分条目内联 `domain: <中文名>`（filter_combined / update_main_fields / update_ingredient / record_cook / shopping_generate / add_from_template / add_relation / view_relation_tree / first_use / data-3 条 / derive_from_existing），其余无。
  4. 各域 yaml 头注释里登记的「详情层条目」在 scenarios.yaml 中不存在：录入「同名冲突处置」、搜索筛选「搜索无结果 / 空库列全部」、采购「已有vs需买」。
  5. `data_export_backup.dimensions.include_archived` 在 scenarios.yaml 中已损坏为 `是否含已废弃(选填 / 默认不含): null`（YAML 折行所致）。
  6. 全部 48 条 `status` 均为 `''`（可用），0 条 `【待开发】`——但 `scenes\派生.yaml` 头注释把 rel-3 标为「【待开发】」，与其自身字段 `status: ""` 自相矛盾。

### 1.4 `references\wake_word_variants.md` 是否给出更全的清单？—— 不更全，是「变体方向参考」

- 性质：给 `SKILL.md` 唤醒词表的「变体方向」列补例子，明确声明「例子用于说明，不是穷举」。
- 5 个「核心词」详写（开始做菜 / 查看食谱 / 搜索食谱 / 生成清单 / 记录做菜），其余以「其他 31 唤醒词（粗覆盖 · 至少 1 方向）」分节列出。
- 全文出现的唤醒词共约 **32 个**，其中 **5 个在场景资产里不存在**：`开始做菜`、`修改难度`、`修改份量`、`排除可选`、`私家大厨 HELP`（前 4 个在 `scenes\修改.yaml` / `scenes\采购.yaml` 里被明确定义为「参数特例 / 参数旋钮，不占独立场景卡」）。
- 缺失场景资产里实际存在的 6 个：`查看全部`、`首次使用`、`体检`、`批量改`、`备份`、`从已有派生新菜`。
- 故：**以 `scenes\*.yaml` 为场景与唤醒词权威**，本文第 2/5 节均按此口径。

### 1.5 `references\commands.md` 是否给出更全的清单？—— 明确「不存在」

- 全文 **978 行**：`唤醒词` 出现 **0 次**；`场景` 出现 **2 次**（第 886 行「高并发场景」、第 935 行「适合信息完整的场景」），**均非清单**。
- 它是纯 CLI 参考，12 个编号章节（初始化 / 1 食谱 / 2 分类 / 3 食材 / 4 步骤 / 5 步骤×食材 / 6 技法 / 7 小贴士 / 8 烹饪历史 / 9 背景知识 / 10 派生关系 / 11 炊具 / 12 营养）+ 字段值参考 + AI 推荐工作流 + 缺失字段推测规则 + 并发说明 + JSON 校验 + 录入表单渲染 + JSON 导入。
- 结论：**commands.md 不是场景清单来源**；它既不列唤醒词，也不列场景。

---

## 2. 唤醒词与触发 prompt 原文（48 场景 = 48 条 wake_word 字段）

> 每条 = 「场景编号 → 唤醒词 → `prompt` 原文」。多行 prompt 中的换行在表内以 `<br>` 表示，其余字符逐字保留（含全角标点、填空下划线）。
> 说明：本技能每个场景**恰好 1 个** `wake_word`，无 `variants`（全 48 条 `variants: []`）。

### 2.1 开始使用（1 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| setup-1 | 首次使用 | `请加载「私家大厨」技能,帮我完成首次使用初始化(唤醒词:首次使用):` |

### 2.2 录入（6 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| add-1 | 录入食谱 | `请加载「私家大厨」技能,帮我录入一道新菜(唤醒词:录入食谱):` |
| add-2 | 录入食谱 | `[发送图片] 录入这道菜。` |
| add-3 | 录入食谱 | `[发送 MD 文件] 录入。` |
| add-4 | 录入食谱 | `用表单方式录入这道菜。` |
| add-5 | 导入食谱 | `导入食谱 [JSON 文件]。` |
| add-6 | 导入食谱 | `导入这个 JSON。` |

### 2.3 查看（8 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| view-1 | 查看食谱 | `看看{{菜名}}怎么做。` |
| view-2 | 查看食谱 | `我是新手,{{菜名}}的关键点是什么？` |
| view-3 | 查看食谱 | `{{菜名}}里没有 X,能用 Y 代替吗？` |
| view-4 | 查看食材 | `{{菜名}}需要哪些食材？` |
| view-5 | 查看食材 | `{{菜名}}的食材按肉/菜/调料分组给我。` |
| view-6 | 查看步骤 | `{{菜名}}怎么做？详细步骤。` |
| view-7 | 查看营养 | `{{菜名}}的热量和蛋白质多少？` |
| view-8 | 查看背景 | `{{菜名}}有什么历史典故？` |

### 2.4 搜索筛选（13 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| search-1 | 搜索食谱 | `搜索排骨。` |
| search-2 | 搜索食谱 | `搜索宫暴鸡丁(应为宫保)。` |
| search-3 | 筛选菜系 | `川菜有哪些？` |
| search-4 | 筛选菜系 | `川菜里 30 分钟内能搞定的。` |
| search-5 | 筛选食材 | `哪些菜里有虾。` |
| search-6 | 筛选食材 | `不吃辣,有什么菜？` |
| search-7 | 筛选难度 | `来个简单的。` |
| search-8 | 筛选时间 | `30 分钟内的菜。` |
| search-9 | 筛选炊具 | `用砂锅做的菜。` |
| search-10 | 筛选口味 | `辣的菜有哪些。` |
| search-11 | 筛选季节 | `夏天适合吃什么。` |
| search-12 | 筛选状态 | `已做的菜。` |
| search-13 | 查看全部 | `查看全部。` |

### 2.5 做菜（5 条，同一唤醒词）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| cook-1 | 做菜模式 | `帮我做一道{{菜名}},我要按步骤来。` |
| cook-2 | 做菜模式 | `再做一次{{菜名}},上次做得不错但想改进。` |
| cook-3 | 做菜模式 | `做{{菜名}},今晚来客人,做两人份。` |
| cook-4 | 做菜模式 | `我刚才做到第 {{N}} 步,继续帮我做完。` |
| cook-5 | 做菜模式 | `{{菜名}}正在炖,我能去干别的吗？` |

### 2.6 采购（1 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| shopping-1 | 生成清单 | `请加载「私家大厨」技能,帮我生成采购清单(唤醒词:生成清单):`<br>`菜  名: _____________ (1 个或多个,如: 宫保虾球,辣炒虾球)`<br>`份  数: _____________ (选填,如 2 表示双份;多菜可用 2,1 分别指定)`<br>`排除可选: _____________ (选填,填「排除」则不含可选食材)`<br>`核对家里库存: _____________ (选填,默认核对;不需要填「不核对」;核对由 AI 联动「居家管家」查询,你无需操作)` |

### 2.7 历史（4 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| hist-1 | 记录做菜 | `请加载「私家大厨」技能,帮我记录做菜(唤醒词:记录做菜):`<br>`菜  名: _____________`<br>`评  分: _____________ (选填,0-5 可带小数)`<br>`反  馈: _____________ (必填,一句话真实反馈,如「虾很Q弹,下次少放盐」)`<br>`日  期: _____________ (选填,补录填昨天日期,默认今天)` |
| hist-2 | 查看历史 | `看看{{菜名}}的烹饪历史。` |
| hist-3 | 查看统计 | `{{菜名}}的平均评分是多少?做过几次?` |
| hist-4 | 查看统计 | `帮我看看我最近的厨艺整体情况。` |

### 2.8 修改（4 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| update-1 | 修改食谱 | `请加载「私家大厨」技能,帮我修改食谱(唤醒词:修改食谱):`<br>`菜  名: _____________`<br>`要改什么: _____________ (如: 难度改简单 / 份量改 4 人份 / 总时间改 30 分钟)` |
| update-2 | 修改步骤 | `请加载「私家大厨」技能,帮我修改步骤(唤醒词:修改步骤):`<br>`菜  名: _____________`<br>`改哪个步骤: _____________ (如: 第 2 步)`<br>`改成什么: _____________ (内容,或「把第 2 步和第 3 步换一下」)` |
| update-3 | 修改食材 | `请加载「私家大厨」技能,帮我修改食材(唤醒词:修改食材):`<br>`菜  名: _____________`<br>`改什么食材: _____________ (如: 虾仁用量改 300g / 加一味生抽 / 生抽关联到第 2 步)` |
| update-4 | 废弃食谱 | `请加载「私家大厨」技能,帮我废弃食谱(唤醒词:废弃食谱):`<br>`菜  名: _____________` |

### 2.9 派生（3 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| rel-1 | 添加派生关系 | `请加载「私家大厨」技能,帮我添加派生关系(唤醒词:添加派生关系):`<br>`子  菜: _____________ (如: 宫保虾球)`<br>`父  菜: _____________ (如: 宫保鸡丁)`<br>`关系类型: _____________ (派生 / 变体 / 改良)`<br>`改动说明: _____________ (必填,如「鸡丁换虾球,减辣」)` |
| rel-2 | 查看派生关系 | `看看{{菜名}}的家族关系。` |
| rel-3 | 从已有派生新菜 | `请加载「私家大厨」技能,帮我从已有菜谱派生新菜(唤醒词:从已有派生新菜):`<br>`母  本: _____________ (如: 咖喱牛腩)`<br>`新菜名: _____________ (如: 咖喱鸡)`<br>`差  异: _____________ (如: 牛腩换鸡,咖喱少放,加椰浆)` |

### 2.10 数据管理（3 条）

| 场景 | 唤醒词 | prompt 原文 |
|---|---|---|
| data-1 | 体检 | `请加载「私家大厨」技能,帮我做一次菜谱库体检(唤醒词:体检):`<br>`范  围: _____________ (选填,默认全部食谱)` |
| data-2 | 批量改 | `请加载「私家大厨」技能,帮我批量编辑菜谱(唤醒词:批量改):`<br>`菜  名: _____________ (如: 宫保虾球)`<br>`改哪个部分: _____________ (食材 / 步骤 / 标签)` |
| data-3 | 备份 | `请加载「私家大厨」技能,帮我备份菜谱库(唤醒词:备份):`<br>`范  围: _____________ (选填,默认全部;要含已废弃的填「含废弃」)` |

### 2.11 SKILL.md 是否列了唤醒词总表？—— 列了，而且列了三份，口径互不一致

| SKILL.md 位置 | 标题原话 | 实际行数/口径 |
|---|---|---|
| 第 80 行起 | `## 唤醒词清单（39个）` | A–J **共 10 组**；逐行点数 = **40 行**（`不想要`/`删掉`/`废弃` 3 行标注「aliases 共享场景」，`开始做菜` 与 `做菜模式` 同功能）。文中另一句写「其他 **34** 唤醒词」，与 39/35 口径不自洽 |
| 第 566 行起 | `## 路由表（39个唤醒词）` | 只覆盖 **A–I 组（9 组）**，**缺 J 数据管理（体检/批量改/备份）**；且编号错乱：H 组到 29 后，I 组「私家大厨 HELP」又编 29；E/F/G 组重新从 24 开始编号（与 D/H 编号撞号） |
| 第 705 行起 | `## 快速导航` | 行内含唤醒词数的 **8 行**（做菜 2 / 查看 5 / 搜索筛选 10 / 修改 9 / 历史 3 / 采购 2 / 录入 2 / 派生 3）= 36；**缺帮助与数据管理两行** |

另有相关计数口径：SKILL.md 第 63 行「8大功能,35个唤醒词」；第 181/636 行「展示全部 **35** 业务唤醒词 + **61** 场景」（61 与实测 48 不符）。

---

## 3. 场景 → 渲染脚本 → HTML 模板（产出形态）

**形态定义**：**过程型** = 渲染出的 HTML 需要用户在其中填写/勾选/编辑/确认，再把页面生成的 prompt 复制回 AI 才继续；**结果型** = 渲染出的 HTML 本身即最终交付（看/读）；**回执型** = 写库后的成功/失败回执（含 diff/撤销或原因/重试）。

### 3.1 域总表（场景 → 渲染脚本 → 模板）

| 域 | 场景 | 渲染脚本与子命令 | 场景资产登记的模板 | 磁盘实际模板 | 形态 |
|---|---|---|---|---|---|
| 开始使用 | setup-1 | `scripts\render_开始使用.py render [--init-json]`（读 `scripts\开始使用\ops.py`） | `开始使用/first_use_wizard.html` | `templates\开始使用\first_use_wizard.html` ✅ | 过程型向导 + 回执（同模板按 stage 切） |
| 录入 | add-1 ~ add-4 | `scripts\render_add.py collect <payload.json>` | `录入/采集.html` | `templates\录入\采集.html` ✅ | 过程型（三态采集表单） |
| 录入 | add-5、add-6 | 同上 `collect`（失败走 receipt） | `录入/采集.html` | 同上 ✅ | 过程型；写库后 `render_add.py receipt` → `templates\录入\回执.html`（回执型） |
| 查看 | view-1、view-2 | `scripts\recipe_render.py render <菜名或ID>` | `查看/recipe_view.html` | `templates\recipe_view.html`（**平铺，无 `查看\` 子目录**）⚠️ | 结果型 |
| 查看 | view-3、view-4、view-6、view-7、view-8 | `recipe_render.py render ... --swap 原:替` / `--focus 食材\|步骤\|营养\|背景` | `查看/recipe_view.html` | 同上 ⚠️ | 结果型（同模板 + 锚点/隐藏实现聚焦） |
| 查看 | view-5 | `recipe_render.py render ...`（分组由模板渲染） | `查看/recipe_view.html` | 同上 ⚠️ | 结果型 |
| 搜索筛选 | search-1 ~ search-13 | `scripts\render_搜索筛选.py search <关键词> [--exclude/--cuisine/--time-max/…/--corrected-to]`；search-13 走 `list-all` | `搜索筛选/data_view.html` | `templates\搜索筛选\data_view.html` ✅ | 结果型（网格卡片 list） |
| 搜索筛选（旁路） | — | `scripts\render_data.py search <关键词>` | 未登记 | `templates\data_view.html`（平铺，另一份文件）⚠️ | 结果型 |
| 做菜 | cook-1 ~ cook-5 | `scripts\cooking_render.py render <菜名或ID> [--step N]`（cook-4 用 `--step N`） | `做菜/cooking_mode.html` | `templates\cooking_mode.html`（**平铺**）⚠️ | 过程型（可交互做菜页） |
| 采购 | shopping-1 | `scripts\shopping_render.py render <id1>[,<id2>] [--stock-check --stock-json …]` | `采购/shopping_view.html` | `templates\shopping_view.html`（**平铺**）⚠️ | 过程型（勾选式清单） |
| 历史 | hist-1 | `scripts\render_历史.py receipt <payload.json>` | `历史/record_receipt.html` | `templates\历史\record_receipt.html` ✅ | 回执型（结果型） |
| 历史 | hist-2 | `scripts\render_data.py history <菜名或ID>` | `历史/data_view_timeline.html` | **不存在** 💥 实际注入 `templates\data_view.html`（type=timeline） | 结果型 |
| 历史 | hist-3 | `scripts\render_data.py stats <菜名或ID>` | `历史/data_view_dashboard.html` | **不存在** 💥 实际注入 `templates\data_view.html`（type=dashboard） | 结果型 |
| 历史 | hist-4 | `scripts\render_历史.py global`（内部调 `history_manager.py global-stats`） | `历史/data_view_global.html` | `templates\历史\data_view_global.html` ✅ | 结果型 |
| 修改 | update-1 ~ update-3 | `scripts\render_修改.py compare <payload.json>`（步骤/食材写库走 manager） | `修改/update_compare.html` | `templates\修改\update_compare.html` ✅ | 过程型（改前/改后对比确认） |
| 修改 | update-1 ~ update-3（写库后） | `scripts\render_修改.py receipt <payload.json>` | 未单列 | **同一份** `templates\修改\update_compare.html`（按 mode 切，非独立回执模板）⚠️ | 回执型 |
| 修改 | update-4 | `scripts\render_修改.py discard <payload.json>`（mode=confirm\|success\|failure） | `修改/discard_receipt.html` | `templates\修改\discard_receipt.html` ✅ | 过程型确认 + 回执（同模板） |
| 派生 | rel-1 | `scripts\render_派生.py confirm <payload.json>` | `派生/relation_confirm.html` | `templates\派生\relation_confirm.html` ✅ | 过程型确认卡 |
| 派生 | rel-1、rel-3（写库后） | `scripts\render_派生.py receipt <payload.json>` | 未单列 | `templates\派生\回执.html` ✅（场景资产未登记） | 回执型 |
| 派生 | rel-2 | `scripts\render_派生.py tree <菜名或ID>`（读 `scripts\派生\ops.py::relation_tree`） | `派生/relation_tree.html` | `templates\派生\relation_tree.html` ✅ | 结果型（家族树） |
| 派生 | rel-3 | `scripts\render_派生.py derive-edit <payload.json>` | `派生/derive_edit.html` | `templates\派生\derive_edit.html` ✅ | 过程型（三态预填编辑页） |
| 数据管理 | data-1 | `render_quality_report.py`（**只从 stdin 读 JSON**，由 `scripts\data_quality_report.py` 产出） | `数据管理/data_quality_report.html` | `templates\data_quality_report.html`（**平铺**）⚠️ | 结果型（仪表盘） |
| 数据管理 | data-2 | `scripts\render_batch_edit.py <recipe_id_or_name>`（内部调 9 个 manager） | `数据管理/batch_edit.html` | `templates\batch_edit.html`（**平铺**）⚠️ | 过程型（3-tab 编辑 + 改前改后对比）+ 同模板回执 |
| 数据管理 | data-3 | `scripts\export_backup.py [--include-archived]` | `数据管理/backup_receipt.html` | `templates\backup_receipt.html`（**平铺**）⚠️ | 转移（ZIP 下载）+ 回执型 HTML |
| （不占场景卡） | 私家大厨 HELP | `scripts\render_help.py`（读 `references\scenarios.yaml`，不调 CLI） | 未登记（HELP 不出现在自身清单） | `templates\help.html` ✅ | 结果型（能力速查） |

### 3.2 表内符号含义

- ✅ 已按场景资产登记的相对路径在磁盘上找到同名模板。
- ⚠️ 场景资产登记的模板路径带域子目录（如 `查看/`、`做菜/`、`采购/`、`数据管理/`），磁盘上**没有这些子目录**，同名模板是**平铺**在 `templates\` 根下；`templates\` 下真实存在的子目录只有 6 个：`修改\ 历史\ 开始使用\ 录入\ 搜索筛选\ 派生\`。
- 💥 场景资产登记的两个模板文件**在磁盘上任何位置都不存在**：`templates\历史\data_view_timeline.html`、`templates\历史\data_view_dashboard.html`（hist-2/hist-3 实际由 `render_data.py` 注入平铺的 `templates\data_view.html`）。

---

## 4. `templates\` 目录清单

**实测：共 22 个文件 = 20 个 HTML 模板 + 2 个 JSON 契约。** 根下 10 个文件，6 个子目录共 12 个文件。

| # | 路径 | 字节 | 用途（按脚本/文档实证） | 被哪个渲染脚本使用 |
|---|---|---|---|---|
| 1 | `templates\recipe_view.html` | 47872 | 查看域：完整食谱页（基本信息/食材/步骤/营养/背景/历史/派生），含 `#section-*` 锚点 | `recipe_render.py` |
| 2 | `templates\cooking_mode.html` | 54904 | 做菜域：可交互做菜页（步骤引导/计时/进度条/完结闭环复制按钮） | `cooking_render.py` |
| 3 | `templates\shopping_view.html` | 32933 | 采购域：购物清单页（分类/菜谱双视图、打勾、双量标注、进度条） | `shopping_render.py` |
| 4 | `templates\data_view.html` | 12741 | 通用数据视图（**1 模板 3 type：list / timeline / dashboard**）；也是 render_data.py 的「统一模板」 | `render_data.py`（search/history/stats/relations 全用） |
| 5 | `templates\help.html` | 19938 | HELP 能力速查页（注入 `window.__HELP__`，5 状态 fallback） | `render_help.py` |
| 6 | `templates\data_quality_report.html` | 9190 | 数据质量报告仪表盘（**独立模板，不依赖 data_view.html**） | `render_quality_report.py` |
| 7 | `templates\batch_edit.html` | 24721 | 批量编辑 3-tab 页（食材/步骤/标签 + 复制修改 prompt） | `render_batch_edit.py` |
| 8 | `templates\backup_receipt.html` | 9589 | 备份回执页（ZIP 路径 + 17 表/照片统计 + 08 双按钮） | `export_backup.py` |
| 9 | `templates\recipe_schema.json` | 7736 | JSON 导入的 schema 定义 | `recipe_json_validate.py` |
| 10 | `templates\recipe_template.json` | 2555 | JSON 导入模板（`recipe_import.py template` 输出；import_orchestrator 的嵌套格式同构） | `recipe_import.py` |
| 11 | `templates\录入\采集.html` | 15866 | 录入域：三态采集表单（AI 确认 / AI 推测标色 / 缺失红补） | `render_add.py collect` |
| 12 | `templates\录入\回执.html` | 15103 | 录入域：成功回执（结果+diff+撤销）/ 失败回执（原因+重试） | `render_add.py receipt` |
| 13 | `templates\历史\record_receipt.html` | 16022 | 历史域 hist-1：记录做菜回执 | `render_历史.py receipt` |
| 14 | `templates\历史\data_view_global.html` | 14156 | 历史域 hist-4：全局统计画像（做过几道菜/总次数/最爱/最近/还没做过） | `render_历史.py global` |
| 15 | `templates\修改\update_compare.html` | 24909 | 修改域：改前/改后对比栏 + 确认按钮 + 填写位；**receipt 子命令也复用它** | `render_修改.py compare / receipt` |
| 16 | `templates\修改\discard_receipt.html` | 18552 | 修改域 update-4：废弃确认 + 回执 + 撤销恢复（confirm/success/failure 三态） | `render_修改.py discard` |
| 17 | `templates\派生\relation_confirm.html` | 12359 | 派生域 rel-1：添加派生关系确认卡（父/子/类型/说明） | `render_派生.py confirm` |
| 18 | `templates\派生\relation_tree.html` | 12435 | 派生域 rel-2：家族树（根=当前菜，祖先/后代多代连链） | `render_派生.py tree` |
| 19 | `templates\派生\derive_edit.html` | 17796 | 派生域 rel-3：母本全字段预填 + 三态标色编辑页 | `render_派生.py derive-edit` |
| 20 | `templates\派生\回执.html` | 15471 | 派生域 rel-1/rel-3：成功回执（diff+撤销）/ 失败回执 | `render_派生.py receipt` |
| 21 | `templates\搜索筛选\data_view.html` | 15181 | 搜索筛选域：网格卡片清单页（7 字段 + 纠错/无结果动作层 + 08 双按钮） | `render_搜索筛选.py` |
| 22 | `templates\开始使用\first_use_wizard.html` | 10091 | 开始使用域 setup-1：4 步向导（步骤条 + 5 种回执态） | `render_开始使用.py` |

**目录结构事实**：`templates\` 下仅存在 6 个子目录（`修改\`、`历史\`、`开始使用\`、`录入\`、`搜索筛选\`、`派生\`）；**不存在** `查看\`、`做菜\`、`采购\`、`数据管理\` 子目录。

**场景资产未登记但真实存在/被使用的模板**：`templates\data_view.html`（render_data.py 用）、`templates\help.html`、`templates\录入\回执.html`、`templates\派生\回执.html`、`templates\recipe_schema.json`、`templates\recipe_template.json`。

---

## 5. 两张汇总表

### 5.1 (a) 域 → 场景数 → 唤醒词数

| 域（中文） | 域 key | 场景数 | 去重唤醒词数 | wake_word 条目数（=场景数） | 去重唤醒词清单 |
|---|---|---|---|---|---|
| 开始使用 | setup | 1 | 1 | 1 | 首次使用 |
| 录入 | add | 6 | 2 | 6 | 录入食谱、导入食谱 |
| 查看 | view | 8 | 5 | 8 | 查看食谱、查看食材、查看步骤、查看营养、查看背景 |
| 搜索筛选 | search | 13 | 10 | 13 | 搜索食谱、筛选菜系、筛选食材、筛选难度、筛选时间、筛选炊具、筛选口味、筛选季节、筛选状态、查看全部 |
| 做菜 | cook | 5 | 1 | 5 | 做菜模式 |
| 采购 | shopping | 1 | 1 | 1 | 生成清单 |
| 历史 | history | 4 | 3 | 4 | 记录做菜、查看历史、查看统计 |
| 修改 | update | 4 | 4 | 4 | 修改食谱、修改步骤、修改食材、废弃食谱 |
| 派生 | relation | 3 | 3 | 3 | 添加派生关系、查看派生关系、从已有派生新菜 |
| 数据管理 | data | 3 | 3 | 3 | 体检、批量改、备份 |
| **合计** | **10 域** | **48** | **33** | **48** | — |

### 5.2 (b) 场景 → 产出形态

| 场景 | 场景名 | 产出形态 | 渲染脚本 | HTML 模板（磁盘实际） |
|---|---|---|---|---|
| setup-1 | 首次使用(初始化工作流) | 过程型向导 + 回执 | `render_开始使用.py` | `templates\开始使用\first_use_wizard.html` |
| add-1 | 对话录入(逐步收集) | 过程型 | `render_add.py collect` | `templates\录入\采集.html` |
| add-2 | 图片录入(识别图片) | 过程型 | `render_add.py collect` | `templates\录入\采集.html` |
| add-3 | MD 文件录入 | 过程型 | `render_add.py collect` | `templates\录入\采集.html` |
| add-4 | 结构化模板录入(表单) | 过程型 | `render_add.py collect` | `templates\录入\采集.html` |
| add-5 | JSON 文件导入 | 过程型 + 回执型 | `render_add.py collect/receipt` | `templates\录入\采集.html` + `录入\回执.html` |
| add-6 | 导入校验失败(补齐后重试) | 过程型 + 回执型 | `render_add.py collect/receipt` | 同上 |
| view-1 | 完整食谱 | 结果型 | `recipe_render.py` | `templates\recipe_view.html` |
| view-2 | 新手强调(关键成功点) | 结果型 | `recipe_render.py` | `templates\recipe_view.html` |
| view-3 | 替换食材预览(临时假设) | 结果型（含选择动作） | `recipe_render.py --swap` | `templates\recipe_view.html` |
| view-4 | 只看食材 | 结果型（聚焦） | `recipe_render.py --focus 食材` | `templates\recipe_view.html` |
| view-5 | 食材分组(11 大类) | 结果型 | `recipe_render.py` | `templates\recipe_view.html` |
| view-6 | 只看步骤 | 结果型（聚焦） | `recipe_render.py --focus 步骤` | `templates\recipe_view.html` |
| view-7 | 只看营养 | 结果型（聚焦） | `recipe_render.py --focus 营养` | `templates\recipe_view.html` |
| view-8 | 只看背景文化 | 结果型（聚焦） | `recipe_render.py --focus 背景` | `templates\recipe_view.html` |
| search-1 | 关键词搜索(菜名/食材) | 结果型 | `render_搜索筛选.py search` | `templates\搜索筛选\data_view.html` |
| search-2 | 错字模糊匹配(纠错提示) | 结果型（带纠错动作） | `render_搜索筛选.py search` | `templates\搜索筛选\data_view.html` |
| search-3 | 按菜系筛选 | 结果型 | `render_搜索筛选.py search --cuisine` | `templates\搜索筛选\data_view.html` |
| search-4 | 多维组合筛选(≤3 维) | 结果型 | `render_搜索筛选.py search`（多 flag） | `templates\搜索筛选\data_view.html` |
| search-5 | 按食材筛选 | 结果型 | `render_搜索筛选.py search` | `templates\搜索筛选\data_view.html` |
| search-6 | 排除食材(忌口) | 结果型 | `render_搜索筛选.py search --exclude` | `templates\搜索筛选\data_view.html` |
| search-7 | 按难度筛选 | 结果型 | `render_搜索筛选.py search --difficulty` | `templates\搜索筛选\data_view.html` |
| search-8 | 按时间筛选(30 分钟内) | 结果型 | `render_搜索筛选.py search --time-max` | `templates\搜索筛选\data_view.html` |
| search-9 | 按炊具筛选 | 结果型 | `render_搜索筛选.py search --cookware` | `templates\搜索筛选\data_view.html` |
| search-10 | 按口味筛选 | 结果型 | `render_搜索筛选.py search --flavor` | `templates\搜索筛选\data_view.html` |
| search-11 | 按季节筛选 | 结果型 | `render_搜索筛选.py search --season` | `templates\搜索筛选\data_view.html` |
| search-12 | 按状态筛选 | 结果型 | `render_搜索筛选.py search --status` | `templates\搜索筛选\data_view.html` |
| search-13 | 列出所有食谱 | 结果型 | `render_搜索筛选.py list-all` | `templates\搜索筛选\data_view.html` |
| cook-1 | 全新开始(含每步内联 + 完结闭环) | 过程型 + 回执 | `cooking_render.py render` | `templates\cooking_mode.html` |
| cook-2 | 含上次经验(历史驱动再开做) | 过程型 + 回执 | `cooking_render.py render` | `templates\cooking_mode.html` |
| cook-3 | 双份份量 | 过程型 + 回执 | `cooking_render.py render` | `templates\cooking_mode.html` |
| cook-4 | 断点续做(AI 会话记忆) | 过程型 + 回执 | `cooking_render.py render --step N` | `templates\cooking_mode.html` |
| cook-5 | 等待步骤中并行做其他 | 过程型 + 回执 | `cooking_render.py render` | `templates\cooking_mode.html` |
| shopping-1 | 生成采购清单 | 过程型（勾选） | `shopping_render.py render` | `templates\shopping_view.html` |
| hist-1 | 记录做菜(完整 + 快速 + 补录) | 回执型（结果型） | `render_历史.py receipt` | `templates\历史\record_receipt.html` |
| hist-2 | 历史时间线 | 结果型 | `render_data.py history` | `templates\data_view.html`（登记名 `历史\data_view_timeline.html` 不存在） |
| hist-3 | 单菜统计 | 结果型 | `render_data.py stats` | `templates\data_view.html`（登记名 `历史\data_view_dashboard.html` 不存在） |
| hist-4 | 全局统计(整体画像) | 结果型 | `render_历史.py global` | `templates\历史\data_view_global.html` |
| update-1 | 修改食谱主信息 | 过程型 + 回执型 | `render_修改.py compare/receipt` | `templates\修改\update_compare.html`（两阶段同模板） |
| update-2 | 修改步骤(内容/重排) | 过程型 + 回执型 | `render_修改.py compare/receipt` | `templates\修改\update_compare.html` |
| update-3 | 修改食材(用量/添加/关联步骤) | 过程型 + 回执型 | `render_修改.py compare/receipt` | `templates\修改\update_compare.html` |
| update-4 | 废弃食谱(只增不删) | 过程型确认 + 回执型 | `render_修改.py discard` | `templates\修改\discard_receipt.html` |
| rel-1 | 添加派生关系 | 过程型确认 + 回执型 | `render_派生.py confirm/receipt` | `templates\派生\relation_confirm.html` + `派生\回执.html` |
| rel-2 | 查看派生关系(家族树) | 结果型 | `render_派生.py tree` | `templates\派生\relation_tree.html` |
| rel-3 | 从已有派生新菜 | 过程型 + 回执型 | `render_派生.py derive-edit/receipt` | `templates\派生\derive_edit.html` + `派生\回执.html` |
| data-1 | 数据质量报告 | 结果型（仪表盘） | `render_quality_report.py`（stdin JSON） | `templates\data_quality_report.html` |
| data-2 | 批量编辑 | 过程型 + 回执型 | `render_batch_edit.py` | `templates\batch_edit.html`（两阶段同模板） |
| data-3 | 导出备份 | 转移（ZIP 下载）+ 回执型 | `export_backup.py` | `templates\backup_receipt.html` |
| （HELP，不占场景卡） | 私家大厨 HELP | 结果型 | `render_help.py` | `templates\help.html` |

**形态统计**：48 个场景全部声明了 `html.template`，**不存在纯文本产出场景**。

- **结果型 / 回执型 = 28 个**：view-1~8（8）、search-1~13（13）、hist-1（回执型）、hist-2、hist-3、hist-4、rel-2、data-1（仪表盘）、data-3（ZIP 下载 + 回执 HTML）。
- **过程型（含「过程型 + 回执型」两阶段）= 20 个**：setup-1、add-1~6（6）、cook-1~5（5）、shopping-1、update-1~4（4）、rel-1、rel-3、data-2。
- 28 + 20 = 48 ✅

---

## 6. 附：与 `references\commands.md` 的逐条不一致（实测比对）

1. **烹饪历史评分范围**：commands.md 第 8 节写 `--rating 评分（1-5）`，`scripts\validators.py::validate_rating_range` 与 `scenes\历史.yaml` 均为 **0-5（含小数）**。
2. **贴士 `--scope` 缺失**：commands.md 第 7 节只列 `--category/--priority/--step_id/--ingredient_id`，**完全没有 `--scope`**；而 `tip_manager.py` 把 `--scope` 设为 `required=True`，SKILL.md 也规定「必传」。
3. **贴士 `--category`/`--priority` 可选性**：commands.md 标注为「可选（默认3）」；`tip_manager.py` argparse 两个参数都是 `required=True`。
4. **贴士分类枚举**：commands.md「字段值参考」列 7 值（火候/刀工/调味/采购/设备/保存/文化）；`references\enums.py::TIP_CATEGORIES` 为 **8 值（多「其他」）**，`tip_manager.py` 报错文案也写 8 值。
5. **食材分类枚举**：commands.md 第 3 节与「字段值参考」列 **9 类**（肉类/蔬菜/调料/海鲜/豆制品/蛋类/主食/干货/其他）；`enums.py::INGREDIENT_CATEGORIES` 与 `references\categories.md` 为 v5.2 的 **11 类**（多「葱姜蒜」「香草」）。
6. **烹饪方式枚举**：commands.md「字段值参考」12 值；`enums.py::COOKING_METHODS` 为 **13 值（多「煸」）**。同文件第 2.3 节又只写 11 值（缺「生食」）——commands.md 内部也不一致。
7. **口味枚举**：commands.md 列 7 值（酸/甜/辣/咸/鲜/苦/麻）；`enums.py::FLAVORS` 为 **8 值（多「香」）**；且第 2.4 节示例用了枚举外的「酸甜」。
8. **饮食标签枚举**：commands.md 列 8 值（素食/清真/无辣/低碳/无糖/低脂/无麸质/高蛋白）；`enums.py::DIET_TAGS` 是**完全不同的 12 值**（高蛋白/低蛋白/高脂肪/低脂肪/高碳水/低碳水/低糖/低盐/高纤维/素食/无麸质/低卡）；第 2.5 节示例还用了枚举外的「荤菜」。
9. **营养份量单位**：commands.md 第 12 节写「g/克/份/碗」；`validators.py::validate_serving_unit` 合法值为 **g/ml/份/杯**。
10. **菜系枚举**：commands.md 第 2.1 节列 11 个（含「福建菜」「新疆菜」）；`enums.py::CUISINE_TYPES` 是 12 个（含「鲁菜」「沪菜」，且用「闽菜」而非「福建菜」）。
11. **状态枚举**：commands.md 第 1 节 `--status` 说明只给「未做/已做/熟练，默认未做」3 值；同文件「字段值参考」给 4 值（含已废弃），`enums.py` 拆为 `STATUS`(3) + `ARCHIVED_STATUS`(已废弃)。
12. **未文档化的 manager 子命令**：commands.md 无 `recipe_manager.py export-json`（`recipe_render.py` 实际依赖）、无 `history_manager.py global-stats` 与 `delete`（`render_历史.py` hist-4 实际依赖）。
13. **整个采购域无 CLI 章节**：commands.md 12 章里**没有 shopping 章节**，未记录 `shopping_manager.py generate/list-allergens` 与 `shopping_render.py`。
14. **渲染命令只文档化了一个域**：commands.md 只写了 `render_add.py collect/receipt` 与录入输出目录 `$CHEF_OUTPUT_DIR/录入/`；其余渲染器（`recipe_render` / `cooking_render` / `shopping_render` / `render_data` / `render_搜索筛选` / `render_历史` / `render_修改` / `render_派生` / `render_开始使用` / `render_quality_report` / `render_batch_edit` / `render_help` / `export_backup`）均未出现。
15. **环境变量命名**：commands.md 用 `$CHEF_OUTPUT_DIR`；SKILL.md 第 279 行标注 `$CHEF_OUTPUT_DIR` 为 legacy，正式口径是 `$SKILLS_DATA_DIR > $SKILLS_DB_PATH > fallback`（`scripts\output_config.py` 的解析顺序）。

**另一类不一致（不属于 commands.md，但同属「登记 vs 实现」偏差，供对照）**：08 信封里的 `scene_id` 在各渲染器间口径不统一——`cooking_render.py`(cook-1/cook-4)、`recipe_render.py`(view-1/3/4/6/7/8)、`export_backup.py`(data-3) 与场景编号一致；而 `render_data.py` 写死 `search-1 / hist-1 / stats-1 / rel-1`（`hist-1` 实为「记录做菜」、`stats-1` 无此编号、`rel-1` 实为「添加派生关系」）、`render_quality_report.py` 写 `quality-1` + `command_cn=数据体检`、`render_batch_edit.py` 写 `edit-1`、`shopping_render.py` 写 `shop-1`，均与 `scenes\*.yaml` 的 `data-1 / data-2 / shopping-1` 及「体检」不一致。
