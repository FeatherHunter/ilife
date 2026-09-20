# 老备忘录技能 HTML 产出与场景骨架调查报告

> 调查对象：`D:\2Study\StudyNotes\SKILLS\备忘录\`（老技能，只读）
> 调查方式：全程只读，未改动老技能任何文件
> 证据约定：结论后附「文件路径:行号」或函数名；直接读到的写事实，推断的标 `[推断]`
> 场景资产权威源：`references/scenarios.yaml`（顶层 `version: 1.3.0`，scenarios.yaml:25）

---

## 0 结论速览

1. 老技能场景资产是 **8 域（categories）/ 13 二级组（subfunction）/ 30 场景（scenarios）**；域与图标来自 yaml 顶层 `categories`，二级组来自各场景的 `subfunction` 字段（空值落「基础」兜底组）。30 场景共用 **29 个唯一唤醒词**（28 业务 + 首次使用；「备忘改分类」单条与批量两条场景共用同一唤醒词）。证据：`references/scenarios.yaml:16,26-50`；`script/memo_render.py:527-599`。
2. 30 场景里 **14 条会落盘 HTML，16 条不出 HTML（只回 stdout JSON 文本回执）**。出 HTML 的 14 条由 **6 份模板**承载：`memo_query.html` 9 条、`wish_plan.html` / `wish_complete.html` / `change_category.html` / `sync_report.html` / `init_report.html` 各 1 条。
3. 「备忘录 HELP」不是 30 场景之一，是第 30 个唤醒词通道：由 `render_help` 走**公共组件的 `help_template.html`**（不在 6 份技能模板里），一次产出 **2~3 份 HTML**（时间戳副本 + 覆盖 skill 根 `备忘录.html` + 可选 `--output`）。证据：`script/memo_render.py:602-650`。
4. 全部 HTML 走同一条落盘规则：`<DB_PATH.parent>/memo_html/<name>_<YYYYMMDD>_<HHMMSS>[_<N>].html`。证据：`script/memo_render.py:114-142`。
5. 6 份模板**均无外链资源**（无 `<link>`、无 `<script src>`、无 http(s) 引用）；共享 CSS/JS 由 Base injector 内联注入，模板内只有 3 个占位符 `<!--SHARED-CSS-->` / `<!--INJECT-DATA-->` / `<!--SHARED-HELPERS-->`（各恰 1 个，缺/重即硬拦截）。证据：`script/memo_render.py:100-111`；`公共组件/injector.py:5-7,26-28`。
6. 手机端断点**不统一**：`memo_query` / `wish_plan` / `wish_complete` / `change_category` 用 `max-width:800px`；`init_report` 用 `max-width:360px`；`sync_report` 用 `max-width:360px` + `min-width:600px` + `prefers-reduced-motion:reduce`。
7. 老 HELP 实物 `备忘录.html`（skill 根）的手机端断点是 **`max-width:820px`**，共 2 段媒体查询。
8. **老 HELP 实物已过期**：实物内嵌数据 `"version": "1.2.2"`、`generated_at: 2026-08-08 09:15:06`、`message: 共 30 个场景`，而当前技能版本是三处一致的 `1.3.0`（`SKILL.md` frontmatter、`_meta.json`、`scenarios.yaml:25`）。物化的是 **v1.2.2 时代的自研 HELP 模板产物**，与当前 `render_help`（Base `help_template.html` + scene-data 契约）不是同一套渲染器。
9. 老技能 HELP 是**四级折叠目录**：Level 1 域（`<details class="module">`，module-head = 图标+域中文名+N 场景）→ Level 2 二级组（`<details class="sub-module">`，sub-head = 组名+N 场景）→ Level 3 场景卡（`#id` + 标题 + 流程类型徽章 + 复制按钮）→ Level 4 场景卡内详情折叠（dimensions / prompt / result / dependencies）。依据：ADR-0007 决策 11 + 实物内联 JS 的 `buildModule()` 注释「分类模块(分类 → 子功能 → 场景 · 4 层折叠)」。
10. CLI 侧 `script/memo_cli.py` 共 **21 个子命令**；其中 **9 个带 `--html` 旗标**，另 **2 个恒出 HTML**（`init-report` / `help`），合计 11 个命令会写 HTML。
11. 文档与实现存在若干不一致（详见 §6）：SKILL.md 的「唤醒词 → HTML 对照表」漏了「首次使用」行、❌ 列统计数字写 15 但实列 16 条、`output/` 路径说法与代码 `memo_html/` 不符。

---

## 1 8 域 / 13 二级组 / 30 场景的完整清单

### 1.1 8 个域（顶层 `categories`，有序数组）

| 序 | 域 key | 中文名 | 图标 | 场景数 | 二级组数 | 证据 |
|---|---|---|---|---|---|---|
| 1 | `memo` | 备忘类 | 📝 | 6 | 2 | scenarios.yaml:27-29 |
| 2 | `search` | 查找类 | 🔍 | 7 | 3 | scenarios.yaml:30-32 |
| 3 | `remind` | 提醒类 | ⏰ | 4 | 2 | scenarios.yaml:33-35 |
| 4 | `wish` | 心愿类 | 🎯 | 5 | 2 | scenarios.yaml:36-38 |
| 5 | `checkin` | 打卡类 | ✅ | 3 | 1 | scenarios.yaml:39-41 |
| 6 | `mood` | 情绪类 | 💭 | 3 | 1 | scenarios.yaml:42-44 |
| 7 | `sync` | 同步类 | 🔄 | 1 | 1 | scenarios.yaml:45-47 |
| 8 | `init` | 初始化类 | 🚀 | 1 | 1 | scenarios.yaml:48-50 |
| — | 合计 | — | — | **30** | **13** | — |

域的定义是「有序数组，渲染只读」（ADR-0007 决策 2，`docs/adr/0007-help-4-level-restructure.md:12`）；8 域的划分理由记在 ADR-0007 决策 10（`docs/adr/0007-help-4-level-restructure.md:20`）。

### 1.2 13 个二级组（`subfunction`）

| 域 | 二级组名 | 该组场景数 | 该组场景（yaml 书写序） | 证据 |
|---|---|---|---|---|
| memo 备忘类 📝 | 基础记录 | 3 | 1 记备忘、2 改备忘、3 删备忘 | scenarios.yaml:70,88,104 |
| memo 备忘类 📝 | 分类调整 | 3 | 4 备忘改分类（单条）、5 备忘改子分类、19 备忘改分类（批量） | scenarios.yaml:122,137,380 |
| search 查找类 🔍 | 基础查找 | 3 | 6 搜备忘、7 查备忘、8 看备忘 | scenarios.yaml:157,171,186 |
| search 查找类 🔍 | 时间查找 | 1 | 9 按时间搜备忘 | scenarios.yaml:204 |
| search 查找类 🔍 | 分类查找 | 3 | 10 查心愿、11 查打卡、12 查情绪 | scenarios.yaml:221,236,251 |
| remind 提醒类 ⏰ | 创建提醒 | 2 | 13 记提醒、14 设提醒 | scenarios.yaml:270,290 |
| remind 提醒类 ⏰ | 查看提醒 | 2 | 15 看提醒、16 查已提醒备忘 | scenarios.yaml:305,321 |
| wish 心愿类 🎯 | 心愿推进 | 2 | 17 完成心愿、18 心愿排期 | scenarios.yaml:340,360 |
| wish 心愿类 🎯 | 心愿管理 | 3 | 21 记心愿、22 删心愿、23 改心愿 | scenarios.yaml:423,437,452 |
| checkin 打卡类 ✅ | （无 `subfunction`）→ 渲染兜底「基础」 | 3 | 24 记打卡、25 删打卡、26 改打卡 | scenarios.yaml:468,481,495 |
| mood 情绪类 💭 | （无 `subfunction`）→ 兜底「基础」 | 3 | 27 记情绪、28 删情绪、29 改情绪 | scenarios.yaml:509,522,534 |
| sync 同步类 🔄 | （无 `subfunction`）→ 兜底「基础」 | 1 | 20 备忘录同步 | scenarios.yaml:402（注：sync 场景在 yaml 中出现在 wish 之后） |
| init 初始化类 🚀 | （无 `subfunction`）→ 兜底「基础」 | 1 | 30 首次使用 | scenarios.yaml:559 |

> 证据列的读法：有 `subfunction:` 的场景，行号指向该场景的 `subfunction:` 字段行；checkin / mood / sync / init 四行因各自块内**没有** `subfunction:` 字段，行号指向该场景的 `category:` 行（即「块内确无该字段」的现场，故渲染时落「基础」兜底组）。

兜底规则：`script/memo_render.py:556` — `sub_key = s.get("subfunction") or "基础"`；单组分类不留子功能是 ADR-0007 决策 3（`docs/adr/0007-help-4-level-restructure.md:13`）。

### 1.3 30 场景逐条清单

说明：
- **书写序** = 该场景在 `references/scenarios.yaml` 的 `scenarios:` 数组中的下标（1 起）。yaml 无 `order` 字段，组内序 = 书写序（scenarios.yaml:17；ADR-0007 决策 4）。
- **prompt / result 为逐字值**：yaml 里的折行与转义已按 YAML 解析后的真实字符串还原；为保持单行表格，真实换行显示为转义序列 `\n`（即连同 `\` 与 `n` 两个字符）。表格中 `\|` 是单元格内的字面竖线转义。
- **status** 字段 30 条全是空串 `''`（= 可用），无一条 `【待开发】`。

| 域(key 中文名 图标) | 二级组 | 书写序 | wake_word | scenario_id | scenario_title | prompt（逐字） | result（逐字） | status | 证据 |
|---|---|---|---|---|---|---|---|---|---|
| memo 备忘类 📝 | 基础记录 | 1 | 记备忘 | `memo_add_basic` | 添加一条备忘笔记 | 请帮我记一条备忘(唤醒词:记备忘):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (你想记的话)\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短描述,如"工作")\n  附  件: _____________ (选填,文件名,如 receipt.jpg)\n\n期望效果:\n  AI 创建一条备忘,告诉你 ID 和创建时间。心愿类还会自动建飞书任务。 | 创建一条笔记,告诉你 ID、分类、创建时间。心愿类还会自动建飞书任务。\n | '' | scenarios.yaml:52-70 |
| memo 备忘类 📝 | 基础记录 | 2 | 改备忘 | `memo_update_basic` | 修改已有笔记 | 请帮我修改一条已有的备忘(唤醒词:改备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n  新分类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  新子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 更新这条备忘的字段,告诉你修改后的内容。心愿类会同步飞书任务标题。 | 更新笔记内容/分类/子分类,告诉你更新后的字段。心愿类会同步更新飞书任务标题。\n | '' | scenarios.yaml:71-88 |
| memo 备忘类 📝 | 基础记录 | 3 | 删备忘 | `memo_delete_basic` | 删除笔记 | 请帮我删除一条或多条备忘(唤醒词:删备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (可多个,空格分隔,如"15 18 22")\n\n期望效果:\n  AI 删除这些备忘并告知影响行数;有关联提醒时 AI 会先确认。 | 删除笔记并告知影响行数;有关联提醒时提示用户确认是否级联删除。\n | '' | scenarios.yaml:89-104 |
| memo 备忘类 📝 | 分类调整 | 4 | 备忘改分类 | `memo_change_category_single` | 修改单条笔记的顶层分类 | 请帮我修改单条备忘的顶层分类(唤醒词:备忘改分类,单条):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新分类: _____________ (备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 改这条备忘的顶层分类;子分类不会被改动(它是内容维度的二阶属性)。 | 改顶层分类。子分类不变(它是内容维度的二阶属性)。\n批量场景走"批量改分类向导",见同名条目。\n | '' | scenarios.yaml:105-122 |
| memo 备忘类 📝 | 分类调整 | 5 | 备忘改子分类 | `memo_change_subcategory` | 修改单条笔记的子分类 | 请帮我修改单条备忘的子分类(唤醒词:备忘改子分类):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  新子分类: _____________ (2 字简短,如"工作";留空=清除)\n\n期望效果:\n  AI 修改或清除这条备忘的子分类,适用于所有顶层分类。 | 修改/清除子分类,适用于所有顶层分类(子分类是自由文本)。\n | '' | scenarios.yaml:123-137 |
| search 查找类 🔍 | 基础查找 | 6 | 搜备忘 | `memo_search_keyword` | 按关键词搜索笔记 | 请帮我搜备忘录(唤醒词:搜备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容,如"咖啡")\n  分  类: _____________ (选填,备忘/心愿/打卡/情绪日记)\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 列出含关键词的所有笔记。带 --html 时生成可视化搜索结果页。 | 列出匹配的笔记,告诉你结果数。带 --html 时生成可视化页(含筛选/复制 ID/复制回执)。\n | '' | scenarios.yaml:138-157 |
| search 查找类 🔍 | 基础查找 | 7 | 查备忘 | `memo_search_alias` | 搜备忘的别名(同义触发) | 请帮我查备忘录(唤醒词:查备忘):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (搜的内容)\n\n期望效果:\n  AI 搜索含关键词的笔记,并生成可视化结果页。 | 同"搜备忘"。走相同命令。\n | '' | scenarios.yaml:158-171 |
| search 查找类 🔍 | 基础查找 | 8 | 看备忘 | `memo_get_detail` | 查看单条笔记详情 | 请帮我查看某条备忘的详情(唤醒词:看备忘):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 显示这条备忘的全部字段。带 --html 时生成详情页。 | 显示单条笔记全部字段。带 --html 时生成详情页。\n | '' | scenarios.yaml:172-186 |
| search 查找类 🔍 | 时间查找 | 9 | 按时间搜备忘 | `memo_search_by_date` | 按日期范围搜索笔记 | 请帮我按时间范围搜索备忘录(唤醒词:按时间搜备忘):\n\n请按以下格式填写你的参数:\n\n  开始日期: _____________ (YYYY-MM-DD,如 2026-07-01)\n  结束日期: _____________ (YYYY-MM-DD,如 2026-07-07)\n  分  类:    _____________ (选填,备忘/心愿/打卡/情绪日记)\n\n期望效果:\n  AI 列出该日期范围内的所有笔记,按创建时间倒序。 | 列出日期范围内的笔记,按创建时间倒序。\n | '' | scenarios.yaml:187-204 |
| search 查找类 🔍 | 分类查找 | 10 | 查心愿 | `memo_search_wish` | 查所有心愿(自动带分类过滤) | 请帮我查看心愿(唤醒词:查心愿):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n  排  期: _____________ (选填,YYYY-MM-DD,按排期日期过滤)\n\n期望效果:\n  AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。 | 自动按"心愿"分类过滤,等同 `搜备忘 -c 心愿`。\n | '' | scenarios.yaml:205-221 |
| search 查找类 🔍 | 分类查找 | 11 | 查打卡 | `memo_search_checkin` | 查所有打卡记录 | 请帮我查看打卡记录(唤醒词:查打卡):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按"打卡"分类过滤,列出结果。 | 自动按"打卡"分类过滤。\n | '' | scenarios.yaml:222-236 |
| search 查找类 🔍 | 分类查找 | 12 | 查情绪 | `memo_search_mood` | 查所有情绪日记 | 请帮我查看情绪日记(唤醒词:查情绪):\n\n请按以下格式填写你的参数:\n\n  关键词: _____________ (选填,搜的内容)\n\n期望效果:\n  AI 自动按"情绪日记"分类过滤,列出结果。 | 自动按"情绪日记"分类过滤。\n | '' | scenarios.yaml:237-251 |
| remind 提醒类 ⏰ | 创建提醒 | 13 | 记提醒 | `memo_remind_with_note` | 添加笔记 + 设置提醒(两步合一) | 请帮我记一条提醒(唤醒词:记提醒 · 两步合一:添笔记 + 设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记内容: _____________ (要提醒的事)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  重复类型: _____________ (选填,一次性/每天/每周/每月/每年)\n  重复规则: _____________ (选填,如每天="09:00",每周="5 17:00")\n\n期望效果:\n  AI 先创建笔记,再创建关联提醒,Cron 到点触发推送。 | 先创建笔记,再创建关联提醒。Cron 到点触发推送。\n | '' | scenarios.yaml:252-270 |
| remind 提醒类 ⏰ | 创建提醒 | 14 | 设提醒 | `memo_remind_existing` | 给已有笔记加提醒 | 请帮我给已有笔记加提醒(唤醒词:设提醒):\n\n请按以下格式填写你的参数:\n\n  笔记 ID: _____________ (数字,如 15)\n  提醒时间: _____________ (YYYY-MM-DD HH:MM,如 2026-07-25 09:00)\n  提醒内容: _____________ (选填,如"该跑步了")\n  重复类型: _____________ (选填,默认"一次性")\n  重复规则: _____________ (选填,见格式说明)\n\n期望效果:\n  AI 创建提醒,可关联或独立存在。 | 创建提醒,可关联或独立存在。\n | '' | scenarios.yaml:271-290 |
| remind 提醒类 ⏰ | 查看提醒 | 15 | 看提醒 | `memo_reminders_active` | 查看所有有效提醒 | 请帮我查看有效提醒(唤醒词:看提醒):\n\n请按以下格式填写你的参数:\n\n  状  态: _____________ (选填,active=默认/dismissed)\n\n期望效果:\n  AI 按时间排序列出提醒。带 --html 时生成可筛选的可视化页。 | 按时间排序的提醒列表。带 --html 时生成可筛选页。\n | '' | scenarios.yaml:291-305 |
| remind 提醒类 ⏰ | 查看提醒 | 16 | 查已提醒备忘 | `memo_completed_reminders` | 查询已触发的提醒与对应打卡 | 请帮我查看已提醒过的备忘(唤醒词:查已提醒备忘):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 列出已触发的提醒 + 关联打卡笔记 + 触发时间。 | 列出已触发的提醒 + 关联打卡笔记 + 触发时间。匹配逻辑:\n一次性已通知 + 关联打卡 / 重复型有关联打卡。\n | '' | scenarios.yaml:306-321 |
| wish 心愿类 🎯 | 心愿推进 | 17 | 完成心愿 | `memo_complete_wish` | 把心愿标记为已完成(原子操作) | 请帮我把心愿标记为已完成(唤醒词:完成心愿):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  打卡内容: _____________ (选填,默认拷贝心愿原文)\n\n期望效果:\n  AI 执行原子操作:删除该心愿 + 新建打卡 note(同事务)。\n  批量场景:先 wish-complete --html 生成向导,你在 HTML 勾选 + 填打卡内容。 | 原子操作:删除心愿 + 新建打卡 note(同事务)。\n批量场景:先 wish-complete --html 生成向导,用户在 HTML 勾选 + 填打卡内容,采纳复制后 AI 逐条执行。\n | '' | scenarios.yaml:322-340 |
| wish 心愿类 🎯 | 心愿推进 | 18 | 心愿排期 | `memo_wish_schedule` | 给心愿设排期日期(同步飞书 due) | 请帮我给心愿设排期日期(唤醒词:心愿排期):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,可多个,空格分隔,如"15 18 22")\n  排期日期: _____________ (YYYY-MM-DD,如 2026-07-30)\n\n期望效果:\n  AI 设置本地 notes.due + 飞书 task 同步 due。\n  批量场景:先 wish-batch-plan --suggest-due X --html 生成向导,你在 HTML 微调。 | 本地设置 due + 飞书 task 同步 due(失败降级,本地优先)。\n批量场景:先 wish-batch-plan --suggest-due X --html 生成向导,用户在 HTML 微调,采纳复制后 AI 执行。\n | '' | scenarios.yaml:341-360 |
| memo 备忘类 📝 | 分类调整 | 19 | 备忘改分类 | `memo_batch_change_category` | 批量改分类(过程型 HTML 向导) | 请帮我批量改分类(唤醒词:备忘改分类 · 批量场景):\n\n请按以下格式填写你的参数:\n\n  原分类: _____________ (备忘/心愿/打卡/情绪日记)\n  目标分类: _____________ (建议目标,可在 HTML 改)\n\n期望效果:\n  AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类 → 采纳复制 → 调多条 update-category。\n  注:子分类不会被改动。 | 生成批量改分类向导 HTML,用户在 UI 勾选 + 选目标分类 → 采纳复制 → AI 调多条 update-category。\n注:子分类不改(它是内容维度的二阶属性)。\n | '' | scenarios.yaml:361-380 |
| sync 同步类 🔄 | (空 · 落「基础」组) | 20 | 备忘录同步 | `memo_sync_feishu` | 备忘录 ↔ 飞书双向对账 | 请帮我跑备忘录和飞书的双向对账(唤醒词:备忘录同步):\n\n无需参数,直接发送。\n\n期望效果:\n  AI 执行 3 步对账:\n  1. 本地补建(本地心愿无飞书 task → 自动建)\n  2. 反向同步 done(飞书已完成 → 本地 complete-wish)\n  3. 反向同步 due(飞书 due 改 → 本地 notes.due 跟)\n  带 --html 时生成同步报告页(含 11 统计字段)。 | 3 步对账:\n1. 本地补建:本地心愿无飞书 task → 自动建\n2. 反向同步 done:飞书已完成 → 本地 complete-wish\n3. 反向同步 due:飞书 due 改 → 本地 notes.due 跟(飞书优先)\n带 --html 时生成同步报告页(11 统计字段 + 3 步折叠 + errors 高亮)。\n | '' | scenarios.yaml:381-402 |
| wish 心愿类 🎯 | 心愿管理 | 21 | 记心愿 | `memo_add_wish` | 快速添加心愿(自动心愿分类) | 请帮我快速添加心愿(唤醒词:记心愿 · 子唤醒词自动带心愿分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (心愿内容,如"想学 Python")\n  子分类: _____________ (选填,2 字简短)\n  排  期: _____________ (选填,YYYY-MM-DD,放哪天完成)\n  飞书任务清单: _____________ (选填,tasklist GUID,留空=我的任务)\n\n期望效果:\n  AI 创建心愿 note,自动建飞书 task 并写回 task_guid。 | 创建心愿 note,自动建飞书 task 并写回 task_guid。\n顶层分类已确定,跳过分类确认。\n | '' | scenarios.yaml:403-423 |
| wish 心愿类 🎯 | 心愿管理 | 22 | 删心愿 | `memo_delete_wish` | 删心愿(自动心愿分类过滤) | 请帮我删除心愿(唤醒词:删心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n\n期望效果:\n  AI 删除这条心愿;若有飞书 task,会自动标完成。 | 走通用删笔记流程。心愿关联的飞书 task 自动标完成。\n | '' | scenarios.yaml:424-437 |
| wish 心愿类 🎯 | 心愿管理 | 23 | 改心愿 | `memo_update_wish` | 改心愿(自动心愿分类过滤) | 请帮我改心愿(唤醒词:改心愿 · 子唤醒词自动带心愿过滤):\n\n请按以下格式填写你的参数:\n\n  心愿 ID: _____________ (数字,如 15)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新内容,飞书 task 标题同步更新。 | 走通用改笔记流程。飞书 task 标题自动同步。\n | '' | scenarios.yaml:438-452 |
| checkin 打卡类 ✅ | (空 · 落「基础」组) | 24 | 记打卡 | `memo_add_checkin` | 快速添加打卡(自动打卡分类) | 请帮我快速添加打卡(唤醒词:记打卡 · 子唤醒词自动带打卡分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (打卡内容,如"跑了 5 公里")\n  子分类: _____________ (选填,2 字简短,如"跑步")\n  关联提醒: _____________ (选填,提醒 ID,溯源用)\n\n期望效果:\n  AI 创建打卡 note。 | 创建打卡 note。可选关联 reminder_id(提醒触发后自动打卡时由系统填)。\n | '' | scenarios.yaml:453-468 |
| checkin 打卡类 ✅ | (空 · 落「基础」组) | 25 | 删打卡 | `memo_delete_checkin` | 删打卡(自动打卡分类过滤) | 请帮我删除打卡(唤醒词:删打卡 · 子唤醒词自动带打卡过滤):\n\n请按以下格式填写你的参数:\n\n  打卡 ID: _____________ (数字,如 20)\n\n期望效果:\n  AI 删除这条打卡记录。 | 走通用删笔记流程。\n | '' | scenarios.yaml:469-481 |
| checkin 打卡类 ✅ | (空 · 落「基础」组) | 26 | 改打卡 | `memo_update_checkin` | 改打卡(自动打卡分类过滤) | 请帮我改打卡(唤醒词:改打卡 · 子唤醒词自动带打卡过滤):\n\n请按以下格式填写你的参数:\n\n  打卡 ID: _____________ (数字,如 20)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新这条打卡的内容。 | 走通用改笔记流程。\n | '' | scenarios.yaml:482-495 |
| mood 情绪类 💭 | (空 · 落「基础」组) | 27 | 记情绪 | `memo_add_mood` | 快速添加情绪日记(自动情绪日记分类) | 请帮我快速添加情绪日记(唤醒词:记情绪 · 子唤醒词自动带情绪日记分类):\n\n请按以下格式填写你的参数:\n\n  内  容: _____________ (情绪内容)\n  子分类: _____________ (选填,2 字简短)\n\n期望效果:\n  AI 创建情绪日记 note。 | 创建情绪日记 note。\n | '' | scenarios.yaml:496-509 |
| mood 情绪类 💭 | (空 · 落「基础」组) | 28 | 删情绪 | `memo_delete_mood` | 删情绪(自动情绪日记分类过滤) | 请帮我删除情绪日记(唤醒词:删情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n\n期望效果:\n  AI 删除这条情绪日记。 | 走通用删笔记流程。\n | '' | scenarios.yaml:510-522 |
| mood 情绪类 💭 | (空 · 落「基础」组) | 29 | 改情绪 | `memo_update_mood` | 改情绪(自动情绪日记分类过滤) | 请帮我改情绪日记(唤醒词:改情绪 · 子唤醒词自动带情绪日记过滤):\n\n请按以下格式填写你的参数:\n\n  情绪日记 ID: _____________ (数字,如 25)\n  新内容: _____________ (改后的话)\n\n期望效果:\n  AI 更新这条情绪日记的内容。 | 走通用改笔记流程。 | '' | scenarios.yaml:523-534 |
| init 初始化类 🚀 | (空 · 落「基础」组) | 30 | 首次使用 | `memo_init_setup` | 初始化备忘录(首次使用引导) | 请帮我初始化备忘录,我是第一次使用(唤醒词:首次使用):\n\n无需参数,直接发送。\n\n请按步骤帮我搭建好环境:检查并配置 Python、数据存储(全文搜索)、飞书 CLI(未安装则引导我安装并授权)、环境变量,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装/怎么配,完成后生成初始化报告页给我,并带我浏览一遍全部功能。\n\n期望效果:\n  AI 逐步引导我从零搭建环境(检测→安装/配置→验证),缺什么给具体指引,初始化数据库,生成初始化报告页,报告就绪情况。 | AI 从零逐步搭建环境:检查并配置 Python/SQLite/飞书 CLI/环境变量,缺什么给安装与配置指引(飞书未装会引导安装并授权),初始化数据库,配置提醒调度,生成初始化报告页;完成后带你浏览全部功能。 | '' | scenarios.yaml:535-560 |

---

## 2 每个场景的 HTML 产出

### 2.1 判据（三条独立证据）

1. **命令层**：`script/memo_cli.py:1543-1694` 的 `argparse` 子命令表里，只有 9 个子命令声明了 `--html`（`search` / `get` / `search-date` / `wish-batch-plan` / `wish-complete` / `batch-update-category` / `sync-from-feishu` / `reminders` / `completed`）；`init-report` 与 `help` 没有 `--html`，因为**恒出 HTML**。
2. **调用层**：9 个 `--html` 分支各自调用哪个渲染函数（函数名即模板绑定）：
   - `output_query_html()` → `render_query`（`script/memo_cli.py:82-98`，`--html` 分支调用点：`:249-250 / :561-562 / :600-601 / :1504-1505 / :1529-1530`）
   - `render_wish_plan`（`script/memo_cli.py:840-841`）、`render_wish_complete`（`:952-953`）、`render_change_category`（`:1029-1030`）、`render_sync_report`（`:1741-1752`）、`render_init_report`（`:1775-1783`）、`render_help`（`:1793-1795`）
3. **渲染层**：`script/memo_render.py` 只有 7 个渲染入口 — `render_query:197` / `render_sync_report:270` / `render_wish_plan:302` / `render_wish_complete:338` / `render_change_category:373` / `render_init_report:447` / `render_help:602`。**没有分支能按场景粒度切换产物**：`render_query` 对所有查询类场景只认 payload 里的 `command` 字段（`memo_render.py:200-201` 的 `COMMAND_CN_MAP`），产物文件名恒为默认 `备忘录查询`。

> 关键结论：**「一个场景 → 哪些 HTML」完全由「该场景路由到哪个 CLI 子命令」决定，命令不带 `--html` 时渲染代码根本不执行。**

### 2.2 逐场景 HTML 产出表

| 序 | wake_word | CLI 命令 | 落盘 HTML | 产物文件名形态 | 模板 / 渲染函数 | 页面类型 | 判据（文件:行号 / 函数） |
|---|---|---|---|---|---|---|---|
| 1 | 记备忘 | `add` | **不出 HTML** | — | 无 | 回执型（stdout JSON 文本） | `memo_cli.py:1698-1699` → `add_note()`；`add_note` 内无 `--html` 分支 |
| 2 | 改备忘 | `update` | **不出 HTML** | — | 无 | 回执型 | `memo_cli.py:1702-1703` → `update_note()` |
| 3 | 删备忘 | `delete` | **不出 HTML** | — | 无 | 回执型 | `memo_cli.py:1704-1705` → `delete_note()` |
| 4 | 备忘改分类（单条） | `update-category <id> <cat>` | **不出 HTML** | — | 无 | 回执型 | `memo_cli.py:1712-1713` → `update_category()`；argparse 无 `--html`（`:1600-1602`） |
| 5 | 备忘改子分类 | `update-sub-category <id> <sub\|null>` | **不出 HTML** | — | 无 | 回执型 | `memo_cli.py:1714-1715` → `update_sub_category()`；argparse 无 `--html`（`:1605-1607`） |
| 6 | 搜备忘 | `search --html` | ✅ 出 | `备忘录查询_<YYYYMMDD>_<HHMMSS>[_N].html` | `templates/memo_query.html` ← `render_query`（默认 name=`备忘录查询`，`memo_render.py:197`） | **结果型** | `memo_cli.py:1559`（flag）、`:249-250`（`output_query_html(rows,"备忘录搜索结果","search",…)`）、`memo_render.py:197-220` |
| 7 | 查备忘 | `search --html`（同 6） | ✅ 出 | 同上 | 同上 | 结果型 | `memo_cli.py:1559,249-250`；`render_query` 不按唤醒词分支 |
| 8 | 看备忘 | `get <id> --html` | ✅ 出 | 同上（items 只有 1 条） | 同上 | 结果型 | `memo_cli.py:1589`（flag）、`:561-562`（title「备忘录详情」） |
| 9 | 按时间搜备忘 | `search-date <start> <end> --html` | ✅ 出 | 同上 | 同上 | 结果型 | `memo_cli.py:1597`、`:600-601` |
| 10 | 查心愿 | `search -c 心愿 --html` | ✅ 出 | 同上 | 同上 | 结果型 | `memo_cli.py:249-250`（同 `search` 分支，靠 `-c` 过滤） |
| 11 | 查打卡 | `search -c 打卡 --html` | ✅ 出 | 同上 | 同上 | 结果型 | 同 10 |
| 12 | 查情绪 | `search -c 情绪日记 --html` | ✅ 出 | 同上 | 同上 | 结果型 | 同 10 |
| 13 | 记提醒 | `add` + `remind` | **不出 HTML** | — | 无 | 回执型（双步骤简短回执） | `memo_cli.py:1645-1650`（`remind` 无 `--html`）、`:1758-1759` → `add_reminder()` |
| 14 | 设提醒 | `remind` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 15 | 看提醒 | `reminders --html` | ✅ 出 | `备忘录查询_<ts>.html` | `memo_query.html` ← `render_query` | 结果型 | `memo_cli.py:1663`（flag）、`:1529-1530`（title「提醒列表」） |
| 16 | 查已提醒备忘 | `completed --html` | ✅ 出 | `备忘录查询_<ts>.html` | `memo_query.html` ← `render_query` | 结果型 | `memo_cli.py:1667`、`:1504-1505`（title「已完成提醒查询结果」） |
| 17 | 完成心愿 | `wish-complete --html` | ✅ 出 | `心愿完成_<ts>[_N].html` | `templates/wish_complete.html` ← `render_wish_complete`（默认 name=`心愿完成`，`memo_render.py:338`） | **过程型**（勾选 + 填打卡内容 + 「复制修改指令」） | `memo_cli.py:1631-1632`、`:952-953`、`memo_render.py:338-370` |
| 18 | 心愿排期 | `wish-batch-plan --html` | ✅ 出 | `心愿排期_<ts>[_N].html` | `templates/wish_plan.html` ← `render_wish_plan`（默认 name=`心愿排期`，`memo_render.py:302`） | **过程型**（勾选 + 填日期 + 「复制排期指令」） | `memo_cli.py:1619`、`:840-841`、`memo_render.py:302-335` |
| 19 | 备忘改分类（批量） | `batch-update-category --from-category X --html` | ✅ 出 | `批量改分类_<ts>[_N].html` | `templates/change_category.html` ← `render_change_category`（默认 name=`批量改分类`，`memo_render.py:373`） | **过程型**（勾选 + 选目标分类 + 「复制修改指令」） | `memo_cli.py:1638`、`:1029-1030`、`memo_render.py:373-410` |
| 20 | 备忘录同步 | `sync-from-feishu --html` | ✅ 出 | `同步报告_<ts>[_N].html` | `templates/sync_report.html` ← `render_sync_report`（默认 name=`同步报告`，`memo_render.py:270`） | **结果型**（状态卡 + KPI + 折叠明细） | `memo_cli.py:1642`、`:1739-1752`、`memo_render.py:270-292` |
| 21 | 记心愿 | `add -c 心愿` | **不出 HTML** | — | 无 | 回执型 | `memo_cli.py:1544-1550`（`add` 无 `--html`） |
| 22 | 删心愿 | `delete <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 23 | 改心愿 | `update <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 24 | 记打卡 | `add -c 打卡` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 25 | 删打卡 | `delete <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 26 | 改打卡 | `update <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 27 | 记情绪 | `add -c 情绪日记` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 28 | 删情绪 | `delete <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 29 | 改情绪 | `update <id>` | **不出 HTML** | — | 无 | 回执型 | 同上 |
| 30 | 首次使用 | `init-report --data '<诊断结果 JSON>'` | ✅ 出 | `备忘录_初始化报告_<ts>[_N].html` | `templates/init_report.html` ← `render_init_report`（默认 name=`备忘录_初始化报告`，`memo_render.py:447`） | **过程型（报告 + 待办指引 + 验证清单；但无可交互控件）** | `memo_cli.py:1673-1680`、`:1772-1787`、`memo_render.py:447-469`；行为规范见 `SKILL.md:343,427-434` |
| 附 | 备忘录 HELP（第 30 个唤醒词通道，非 30 场景之一） | `help` | ✅ 出（**2~3 份**） | ① `备忘录_HELP_<ts>[_N].html`；② **覆盖** `<SKILL_DIR>/备忘录.html`；③ 可选 `--output <path>` | Base `公共组件/assets/help_template.html` ← `render_help`（默认 name=`备忘录_HELP`，`memo_render.py:602`） | 结果型（使用手册） | `memo_cli.py:1687-1694,1788-1810`；`memo_render.py:602-650`；`SKILL.md:1109-1116` |

**计数**：出 HTML **14** 条（序 6,7,8,9,10,11,12,15,16,17,18,19,20,30）；不出 HTML **16** 条（序 1,2,3,4,5,13,14,21,22,23,24,25,26,27,28,29）。14 + 16 = 30。

### 2.3 产物落盘规则（时间戳 / 序号 / 目录）

- **目录**：`_get_html_output_dir()` = `memo_cli.DB_PATH.parent / "memo_html"`（`script/memo_render.py:114-121`）；`DB_PATH` 由 `SKILLS_DB_PATH` 环境变量解析，未设时 Windows 落 `D:\.db\`（`script/memo_cli.py:47-59`）。即 `<SKILLS_DB_PATH>/memo_html/`（`SKILL.md:95-100`）。
- **文件名**：`<name>_<YYYYMMDD>_<HHMMSS>[_<N>].html`，时间戳为**本地时间**（`script/memo_render.py:131-132`）。
- **同秒冲突保护**：若目标已存在则依次尝试 `_2` / `_3` …（`script/memo_render.py:133-140`）。
- **`<name>` 取值**：全部来自渲染函数的 `name=` **默认参数** —— 调用点没有任何一处传 `name=`（`memo_cli.py` 内 6 个渲染调用的实参只有 `payload`，`:95 / :841 / :953 / :1030 / :1752 / :1783`）。因此文件名固定为：`备忘录查询` / `同步报告` / `心愿排期` / `心愿完成` / `批量改分类` / `备忘录_初始化报告` / `备忘录_HELP`。
- **HELP 的 3 副本机制**：① 时间戳副本必写；② **`<SKILL_DIR>/备忘录.html` 永远覆盖**（`memo_render.py:625-630`）；③ `--output` 额外副本（父目录自动 `mkdir -p`，`:632-641`）。

### 2.4 「不出 HTML」的判据（逐条可复核）

对序 1,2,3,4,5,13,14,21,22,23,24,25,26,27,28,29 这 16 条，判据是**同一套**：

1. 其路由到的 CLI 子命令在 `memo_cli.py:1543-1694` 的 `add_parser` 段里**没有** `--html` 参数；
2. 对应的实现函数（`add_note:118` / `update_note:257` / `delete_note:323` / `update_category:608` / `update_sub_category:633` / `add_reminder:1113`）内部**没有**对 `memo_render` 的 import，也没有 `args.html` 判断；
3. 出口只有 `output_json()`（`memo_cli.py:74-76`）——把 `{"status","data","message"}` 打到 stdout，不落任何文件。

即这三条同时成立 ⇒ 该场景**只回文字/JSON**，无 HTML 产物。`[推断]` 反向不存在：代码里没有「静默跳过 HTML」的条件分支，渲染函数被调用就必然写文件（`_write` 无提前返回路径）。

---

## 3 6 份模板各自的形状

### 3.1 汇总表

| 模板 | 落盘 name | 页头形态 | 事实条 | 主体 | 复制区 | 脚注 | 手机端断点 | 外链资源 |
|---|---|---|---|---|---|---|---|---|
| `memo_query.html` | `备忘录查询` | `header.hero`：`h1#title` + `p.lead#subtitle` + `p.meta#meta` | `.grid#stats` 4 格（总数 / 有排期 / 有附件 / 有提醒） | 2 列卡网 `#list`（`#id` + 复制按钮 + 内容 2 行截断 + 徽章 + 创建/改时间） | ① 「筛选快照」`#receipt` + 复制筛选结果；② 「数据与日志」复制数据/复制日志 | 无 | `max-width:800px` | 无 |
| `wish_plan.html` | `心愿排期` | `header.hero` 同上 | `.kpi#kpis` | 全局建议日期（`input[type=date]#globalDue`）+ 全选/清空/只勾未排期 + `#wishList` 勾选列表 | ① 「📋 发给 AI 的指令」`#promptOut`（按钮「📋 复制排期指令」）+ `#warnArea`；② 数据与日志 | 无 | `max-width:800px` | 无 |
| `wish_complete.html` | `心愿完成` | `header.hero` 同上 | `.kpi#kpis` | 默认打卡内容（`input#globalContent`）+ 应用到所有勾选/全选/清空 + `#wishList` | ① 「📋 发给 AI 的指令」（按钮「📋 复制修改指令」）+ `#warnArea`；② 数据与日志 | 无 | `max-width:800px` | 无 |
| `change_category.html` | `批量改分类` | `header.hero` 同上 | `.kpi#kpis` | 目标分类 `select#toCatSelect`（备忘/心愿/打卡/情绪日记）+ 已选计数 `#selCount`/`#selTotal` + `#noteList` | ① 「📋 发给 AI 的指令」（按钮「📋 复制修改指令」）+ `#warnArea`；② 数据与日志 | 无 | `max-width:800px` | 无 |
| `sync_report.html` | `同步报告` | `section.status-card#statusCard`（`#statusIcon` / `#statusTitle` / `#statusDesc` / `#statusMeta`），**无 hero** | `.kpis#kpis` 4 张 KPI 卡（完成同步 / 补建到飞书 / 排期变更 / 跳过） | `#details`：最多 5 个条件折叠块（✓ 完成同步 / + 补建到飞书 / 📅 排期变更 / ○ 跳过 / ⚠ 错误）+ `#errorReceipt` | 数据与日志（复制数据/复制日志） | 无 | `max-width:360px`、`min-width:600px`、`prefers-reduced-motion:reduce` | 无 |
| `init_report.html` | `备忘录_初始化报告` | `section.status-card#statusCard`（`#statusIcon` 🔍 / `#statusTitle` / `#statusSub` / `#statusMeta`），**无 hero** | 状态卡自身（就绪/可选缺失/必装缺失计数）+ `#stateArea` | `main#bodyContent`：环境检查 `.check-item` 列表 + 待办指引 + 验证清单 `.verify-card`（`.verify-badge ok/skip/fail` 三态带色） | 数据与日志（复制数据/复制日志） | **有**：`补齐后回到对话,告诉 AI「重新检查」即可刷新本页` | `max-width:360px` | 无 |

断点与规则原文（逐字）：
- `memo_query.html:29` — `@media(max-width:800px){.wrap{padding:28px 14px 70px}.hero{padding:26px 20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:30px}.item-head{flex-wrap:wrap}}`（**4 格事实条塌成 2 列**）
- `wish_plan.html` / `wish_complete.html` — `@media(max-width:800px){.wrap{padding:28px 14px 70px}.hero{padding:26px 20px}h1{font-size:30px}.kpi .stat{padding:12px}}`
- `change_category.html` — `@media(max-width:800px){.wrap{padding:28px 14px 70px}.hero{padding:26px 20px}h1{font-size:30px}.flow{flex-direction:column}}`（**横向流程塌成竖列**）
- `sync_report.html` — `@media(max-width:360px)` 收 `.wrap`/`.status-card`/`.status-title`/`.kpi`/`.kpi-num`/`.detail summary` 内边距与字号；`@media(min-width:600px)` 给桌面加 `body{background:#ededf0}`；`@media(prefers-reduced-motion:reduce)` 关全部 transition/animation
- `init_report.html` — `@media(max-width:360px){.check-item .name{font-size:13px}.status-card{padding:20px 16px}}`

### 3.2 数据载荷字段

6 份模板**共用同一套 Base 信封**（`_envelope()`，`script/memo_render.py:145-165`）：

```
data.meta        = { command_cn, occurred_at, skill_name:"备忘录", wake_word, skill_version:"1.3.0" }
data.scene       = { scene_id, snapshot:{ title, summary[], sections[{heading, rows[]}] } }
data.copy_log    = { thinking, data_structure, call_chain, timestamp, exception }
data.generated_at
data.<技能自有字段>  ← _envelope 里 data.update(extra)，extra = 原 payload.data 全量平铺
```

三点必须说清（都是直读结论）：

1. **页面主体不读 `scene.snapshot`**：6 份模板里只有 `memo_query.html` 出现 `snapshot` 字样，但那是它自己的 `snapshotText()` 函数（「筛选快照」复制区，`memo_query.html:90`），与信封的 `data.scene.snapshot` 无关。`scene.snapshot` 的真实消费者是公共组件的 `buildDataText()` —— 也就是「复制数据」按钮产出的那段人类可读快照（`公共组件/assets/base.js:230-264`，`:234` `var snap = s.snapshot`）。
2. **各模板实际读取的技能自有字段**（模板侧字段名，逐条直读）：
   - `memo_query.html`：`items[]`（每项兼容 `id|checkin_note_id|reminder_id`、`content|checkin_content|reminder_content|note_content`、`category|repeat_type`、`sub_category`、`due`、`media_path`、`remind_at|reminder_id`、`created_at|checkin_at`、`updated_at`），另有 `title`、`command`、`meta.command_cn`、`generated_at`、`message`（`memo_query.html:77-95`）
   - `wish_plan.html`：`title`、`meta`、`generated_at`、`command`、`suggest_due`（模板侧字段读取统计）
   - `wish_complete.html`：`title`、`meta`、`generated_at`、`command`、`default_content`
   - `change_category.html`：`title`、`meta`、`generated_at`、`from_category`、`to_category`
   - `sync_report.html`：`synced`、`backfilled`、`due_added`、`due_overridden`、`due_removed`、`skipped_no_local_note`、`skipped_no_memo_id`、`skipped_already_done`、`errors[]`、`synced_items[]`、`command`、`generated_at`（`sync_report.html:350-412`）
   - `init_report.html`：**`items[]` / `todos[]` / `verify[]`（直接读平铺字段，不读 `scene.snapshot.sections`）** + `generated_at`（`init_report.html:121-190`）
3. **`type` 字段不进模板**：yaml 的 `type`（如「采集+回执」）在 HELP 转换层被 `split("+")` 成 `types[]` 数组（`script/memo_render.py:576-578`），只在 **HELP** 的类型徽章里出现；6 份结果/过程模板不渲染它。

载荷生成侧的函数：`_query_snapshot:179` / `_sync_snapshot:223` / `_wish_row:295` / `_init_snapshot:413`（`script/memo_render.py`），即 snapshot 的 title/summary/sections 由这些函数算出。

---

## 4 老 HELP HTML 的结构（实物 `备忘录.html`）

### 4.1 实物身份（先说清它是谁生成的）

| 项 | 实物读数 | 依据 |
|---|---|---|
| 文件 | `D:\2Study\StudyNotes\SKILLS\备忘录\备忘录.html`，57500 字节 / 585 行 | 文件清单 |
| 内嵌数据版本 | `"version": "1.2.2"` | 实物内联 `window.__DATA__` 载荷（字符偏移 ≈16515） |
| 生成时间 | `generated_at: 2026-08-08 09:15:06` | 同上 |
| 场景条数 | `"message": "共 30 个场景"` | 同上 |
| 数据形态 | `{"command":"help","version":"1.2.2","skill":"备忘录","categories":[…8 项…],"scenarios":[…30 项…]}` —— **直接转储 scenarios.yaml 原文**（含 `prompt`/`result`/`dependencies`/`type` 全字段） | 同上 |
| 与当前代码的关系 | 当前 `render_help` 走 **Base `help_template.html` + scene-data 契约**（`groups[].subgroups[].scenes[]`，含 `wake_word`/`status`/`prompt_template`/`types`/`editable_fields`），**不再吐 `scenarios` 原始数组** | `script/memo_render.py:527-599,602-650`；`SKILL.md:1114`（「原自研 memo_help.html 退役」） |

⇒ **实物是 v1.2.2 时代的自研 HELP 模板产物，落后当前渲染器一个大版本**。按 `scenarios.yaml:22`（「编辑本文件后，需重新跑 `memo_cli.py help` 刷新 HELP HTML」）它本该被刷新，但仓库里的实物停在 2026-08-08。

### 4.2 页头 / 事实条 / 主体 / 复制区 / 脚注

实物 body 的区块序（按字符偏移）：

| 区块 | 标记 | 说明 |
|---|---|---|
| 页头 | `header.hero`：`.eyebrow`「Memo Help」+ `<h1>备忘录 · 使用手册</h1>` + `.hero-mode`（`.hero-steps` 三步条「🔍 找场景 → 📋 复制 prompt → 💬 发给 AI」+ `.hero-stats#heroStats`）+ `p.meta#heroMeta` | 字符偏移 ≈32262 |
| 四状态横幅 | `#stateSuccess` / `#stateEmpty` / `#stateMissing` / `#stateError`（均 `display:none`，运行时择一显示） | ≈32900 |
| 首次使用横幅 | `.init-banner#initBanner`（`hidden`，含「📋 复制初始化 prompt」按钮 `#initCopy`） | ≈33100 |
| 搜索 | `.search-wrap > .search-box`：`input#sB type=search` placeholder「输入即直达:搜索所有场景…」 | ≈33400 |
| 主体 | **`<div id="mods">`** —— 四级目录运行时注入此处（静态 HTML 里是空容器） | ≈33700 |
| 联系 | `<details class="contact-box">` + `<summary>📮 联系作者(使用反馈 / 提 ISSUE / 报 Bug)</summary>` + `#contactBody` | ≈33747 |
| 复制区 | 只有**场景级** `.copy-btn`（JS 生成，全页 12 处 `copy-btn` 痕迹）+ 首屏 `#initCopy`；**没有** 6 份模板那种「数据与日志 / 复制数据 / 复制日志」块（全文 `copyData`/`copyLog`/`数据与日志` 各 0 次） | 偏移 ≈33700 起（随场景卡生成），`#initCopy` ≈33100 |
| 脚注 | `<footer id="footerLine"></footer>` | ≈34200 |
| 回到顶部 | `<button class="back-to-top" id="backToTop">↑</button>` | ≈34300 |
| 复制反馈 | `#toast.toast`（`role="status" aria-live="polite"`） | ≈34400 |
| 内联资源 | `<script>` #1 = 共享 clipboard helper（偏移 13945-15907）；`<script>` #2 = `window.__DATA__` 载荷（15935-32233）；`<script>` #3 = 渲染 JS（34494-46854）；`<style>` 单块（偏移 171-13944） | 逐段偏移 |

> 实物里 `<!--INJECT-DATA-->` 占位符**原样残留**在偏移 34476（在 toast 之后），说明 v1.2.2 时代的数据注入走的是 `window.__DATA__` 而非该占位符；这是老模板的痕迹，不是缺陷判据。

### 4.3 三级 / 四级目录长什么样

实物是 **4 级折叠**（ADR-0007 决策 11 定稿；`docs/adr/0007-help-4-level-restructure.md:21`、`:38` 明写「卡路里 3 级 vs 本技能 4 级」）：

| 级别 | DOM 形态 | 展示内容 | 证据 |
|---|---|---|---|
| Level 1 域 | `document.createElement('details')` + `className='module'`，`summary > span.module-head` | `span.m-icon`（域图标）+ 域中文名 + `span.m-count`「N 场景」 | 实物渲染 JS `buildModule(key,scenes)`，注释逐字：「分类模块(分类 → 子功能 → 场景 · 4 层折叠)」 |
| Level 2 二级组 | `details` + `className='sub-module'`，`summary > span.sub-head` | 组名 + `span.scount`「N 场景」；组名取 `s.subfunction \|\| '基础'`（与 `memo_render.py:556` 同规则） | 同上，`Object.keys(subGroups).forEach(...)` |
| Level 3 场景卡 | `buildSceneCard(s)`：`.scene-title`、`.scene-id`、`.chip`/`.type-badge`/`.type-label` | 场景标题 + `#id` + 流程类型徽章（`typeClass()` 把 `type` 映射成 `t-wizard`/`t-collect`/`t-select`/`t-view`/`t-mixed`）+ `button.copy-btn`（`.copy-short` / `.copy-long` 两套文案） | 实物渲染 JS `buildSceneCard` / `typeClass` / `typeBadge` |
| Level 4 详情 | 场景卡内再造 `details`（`dt` + `dbody`） | `dims`（维度）+ `pre.result-box`「预期: …」（读 `s.result`）+ `.deps-box`（`环境依赖` 圆点列表，读 `s.dependencies`）+ `prompt-box` | 实物渲染 JS 内 `rb.className='result-box'` / `depBox.className='deps-box'` / `depTitle.textContent='环境依赖'` |
| 禁用态 | `.dev-banner`「⚠️ 【待开发】…」 | 当 `s.status` 非空时附在场景卡上 | 实物渲染 JS `if(s.status){…className='dev-banner'}`；本技能 30 场景 status 全空 ⇒ 实物中不出现 |

产物里 `<details>` 标签静态只出现 1 次（`contact-box`）——因为 4 级节点全部由 JS `createElement('details')` 运行时生成（静态 HTML 计数与运行时 DOM 不是一回事，这点容易被误判）。

### 4.4 域 → 二级组 → 场景的呈现顺序

- 域顺序 = yaml `categories` 数组序（备忘类 → 查找类 → 提醒类 → 心愿类 → 打卡类 → 情绪类 → 同步类 → 初始化类），域标题带图标（📝🔍⏰🎯✅💭🔄🚀）。
- 二级组顺序 = **该域内场景的书写序首次出现序**（实物 JS：`scenes.forEach(...)` 按数组序建 `subGroups` 对象键）。
- 场景顺序 = 域内书写序（无 `order` 字段，yaml 保序）。
- 每个场景独立复制按钮：`copyPrompt(scene,btn)` → `safeWriteText((scene.prompt||'').trim())` → `flashBtn(btn, '✓ 已复制')`；剪贴板为内联共享 helper 的 `safeWriteText`，失败兜底 `fallbackCopy`（`textarea` + `document.execCommand('copy')`，为飞书 webview 等环境准备，注释逐字「防 navigator.clipboard.writeText 在飞书 webview 等环境下被拒」）。

### 4.5 手机端自适应（断点与塌列规则）

**断点值：`820px`，共 2 段 `@media(max-width:820px)`**（实物 `<style>` 内偏移 1941 与 12998）。

| 段 | 塌列 / 收缩规则（逐字要点） |
|---|---|
| 第 1 段（偏移 1941） | `.hero-steps{order:-1;width:100%;gap:5px}`（三步条提到最前并占满整行）；`.hero-stats{display:none}`（**隐藏统计条**）；`.hero-steps .step{font-size:11.5px;padding:4px 7px}` |
| 第 2 段（偏移 12998） | `.wrap{padding:18px 12px 60px}`；`h1{font-size:24px}`；`.hero{padding:20px 18px}`；`.prompt-box{padding-top:44px;padding-right:12px}`；`.toast{left:12px;right:12px;…transform:translateX(0) scale(.95);max-width:none;min-width:0}`（**toast 由居中气泡变通栏底部条**）；`.init-banner{flex-direction:column}` + `.copy-btn{width:100%}`；`.scene>summary.scene-head{flex-wrap:nowrap}`；**`.scene-head .scene-id{display:none}`（场景 ID 列整体塌掉）**；`.scene-head .scene-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13.5px}`；`.copy-btn` 缩到 `min-height:28px;min-width:56px`；**`.copy-btn .copy-short{display:inline}` + `.copy-btn .copy-long{display:none}`（复制按钮换短文案）** |

补充：公共组件 `base.js` 的 toast 栈容量同样以 820px 为界（注释逐字「≤820px 视口自动收窄为 3」，`公共组件/assets/base.js:66,99`）—— 820px 是这一族技能的移动端断点惯例。

### 4.6 复制按钮与 toast

- **复制按钮**：类 `.copy-btn`，内含 `.copy-short` / `.copy-long` 两套标签（窄屏切短的）；点击走 `copyPrompt()`；另有 `#initCopy`（复制初始化 prompt）。剪贴板 helper 是**内联**的共享脚本（无外链），导出 `fallbackCopy` / `safeWriteText` / `flashBtn`，并有全局 `copyTimer` 防连点竞态（注释逐字「copyTimer 全局变量 · 防 btn 文字 timer race」）。
- **toast**：静态节点 `#toast`（`role="status" aria-live="polite"`，含 `.toast-icon` 📋 / `.toast-title`「已复制 `<em id="toastWake">`」/ `.toast-detail`「粘贴给 AI(微信/飞书/任何 AI 工具),备忘录技能会自动执行这个流程,完成后你会拿到结果 HTML + 一句话总结。」/ `.toast-close`「✓ 知道了」），由 `showToast(t)` 控制显隐。实物全文 `toast` 出现 36 次。

### 4.7 外链资源

- 实物**无任何外部资源**：`<link>` 0 个、`<script src=…>` 0 个；全文 http(s) 引用仅 2 条，且都是 contact 区块里的**文本链接**：`https://github.com/FeatherHunter/SKILLS` 与 `…/issues`（由 `_scenarios_to_contract_data` 的 `contact` 字段提供，`script/memo_render.py:592-597`）。
- 样式与脚本全部内联；字体族用系统栈 `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei"`（沿用各模板同款）。

---

## 5 老技能 CLI 侧：`script/memo_cli.py` 的子命令

**子命令总数：21**（`argparse` 的 `sub.add_parser(...)` 调用 21 次，`script/memo_cli.py:1543-1694`）。逐条：

| # | 子命令 | 声明行 | 带 `--html` | 派发分支 |
|---|---|---|---|---|
| 1 | `add` | memo_cli.py:1544 | ❌ | :1698 |
| 2 | `search` | :1553 | ✅ `:1559` | :1700 |
| 3 | `update` | :1562 | ❌ | :1702 |
| 4 | `delete` | :1571 | ❌ | :1704 |
| 5 | `complete-wish` | :1579 | ❌ | :1706 |
| 6 | `get` | :1587 | ✅ `:1589` | :1708 |
| 7 | `search-date` | :1592 | ✅ `:1597` | :1710 |
| 8 | `update-category` | :1600 | ❌ | :1712 |
| 9 | `update-sub-category` | :1605 | ❌ | :1714 |
| 10 | `set-due` | :1610 | ❌ | :1716 |
| 11 | `wish-batch-plan` | :1615 | ✅ `:1619` | :1718 |
| 12 | `wish-complete` | :1622 | ✅ `:1631` | :1720 |
| 13 | `batch-update-category` | :1635 | ✅ `:1638` | :1722 |
| 14 | `sync-from-feishu` | :1641 | ✅ `:1642` | :1724 |
| 15 | `remind` | :1645 | ❌ | :1758 |
| 16 | `due` | :1653 | ❌ | :1760 |
| 17 | `dismiss` | :1657 | ❌ | :1766 |
| 18 | `reminders` | :1661 | ✅ `:1663` | :1768 |
| 19 | `completed` | :1666 | ✅ `:1667` | :1770 |
| 20 | `init-report` | :1673 | ❌（无 flag，调用即出 HTML） | :1772 |
| 21 | `help` | :1687 | ❌（恒出 HTML，不走 `--html`） | :1788 |

计数校验：带 `--html` 的 **9** 个；恒出 HTML 的 **2** 个（`init-report` / `help`）；会写 HTML 的命令合计 **11** 个。

> 交叉参考：`references/schema.md:84-103` 的「CLI 命令参考」表只列了 15 条命令，**缺** `set-due` / `wish-batch-plan` / `wish-complete` / `batch-update-category` / `init-report` / `help` 六条（15 + 6 = 21）—— 属文档滞后，见 §6。

---

## 6 文档与实现的不一致清单（新仓对照时注意）

| # | 不一致 | 证据 | 影响 |
|---|---|---|---|
| 1 | SKILL.md「唤醒词 → HTML 生成对照表」**没有「首次使用」行**，但代码有 `init-report` 且 yaml 明写「完成后生成初始化报告页」 | 表在 `SKILL.md:235-266`（29 个编号行 + 1 个未编号批量行）；对照 `SKILL.md:343,427-434`、`scenarios.yaml:556-559` | 按 SKILL.md 表执行会漏掉初始化报告页；实测**30 场景出 HTML 数是 14 不是 13** |
| 2 | 同一表的统计行算术不符：❌ 列标「15」，实际列出 16 条唤醒词 | `SKILL.md:274` | 统计不可直接引用 |
| 3 | 「任何生成 HTML 的命令(13 个会触发的命令)」与实际 11 个命令不符 | `SKILL.md:123` vs memo_cli.py argparse | — |
| 4 | 文档写产物落 `output/…html`，代码落 `<DB_PATH.parent>/memo_html/` | `SKILL.md:206-207,904` vs `script/memo_render.py:114-121` | 交付路径按文档走会找不到文件；`SKILL.md:46` 自身又写的是 `memo_html/`（文档内自相矛盾） |
| 5 | 实物 `备忘录.html` 数据版本 1.2.2（2026-08-08），技能版本 1.3.0（2026-08-13） | 实物内嵌载荷 vs `SKILL.md` frontmatter / `_meta.json` / `scenarios.yaml:25` | 实物 HELP 与当前渲染器不是一套，新仓不可拿它当渲染基准 |
| 6 | SKILL.md 写「5 状态 fallback(正常/空/缺失/错误/离线)」，ADR-0003 已改 4 状态（删离线），实物也只有 4 条状态横幅 | `SKILL.md:1139` vs `docs/adr/0003-b-execution-fallback.md:8-19` vs 实物 `#stateSuccess/#stateEmpty/#stateMissing/#stateError` | 契约以 ADR-0003 + 实物为准 |
| 7 | `references/schema.md` 顶部标题写「场景资产契约(v1.2.1)」，而 yaml 已是 1.3.0 | `references/schema.md:3` vs `scenarios.yaml:25` | schema.md 里的字段表与 yaml 头注释（`scenarios.yaml:4-14`）措辞不一致 |

---

## 7 证据索引（本报告引用的关键位置）

**场景资产**
- `references/scenarios.yaml:1-22`（契约头注释：30 场景 = 29 唯一唤醒词、无 order、组内序 = 书写序、复制契约、DB fallback）
- `references/scenarios.yaml:25`（version 1.3.0）、`:26-50`（8 域）、`:51-560`（30 场景）
- `references/schema.md:3-32`（场景资产字段契约）、`:84-103`（CLI 参考表，旧）

**渲染器**
- `script/memo_render.py:114-142`（输出目录 + 时间戳 + `_N` 冲突保护）
- `:145-165`（Base 信封 `_envelope`）、`:179-194`（`_query_snapshot`）、`:197-220`（`render_query`）
- `:223-267,270-292`（`_sync_snapshot` / `render_sync_report`）、`:302-335`（`render_wish_plan`）
- `:338-370`（`render_wish_complete`）、`:373-410`（`render_change_category`）
- `:413-444,447-469`（`_init_snapshot` / `render_init_report`）
- `:527-599`（`_scenarios_to_contract_data` 转换层）、`:602-650`（`render_help`，3 副本）

**CLI**
- `script/memo_cli.py:74-98`（`output_json` / `error_json` / `output_query_html`）
- `:1543-1694`（21 个子命令声明）、`:1696-1813`（派发分支）
- `:29-59`（DB 路径解析）

**模板（6 份）**
- `templates/memo_query.html:29`（800px）、`:34-62`（区块）、`:64-65`（三占位符）、`:82-95`（stats/chips/list/copy）
- `templates/wish_plan.html` / `wish_complete.html` / `change_category.html`（body 区块 + 800px）
- `templates/sync_report.html:336-421`（状态卡四档 + KPI 4 卡）、`:426-486`（5 个条件折叠）、媒体查询 360/600/reduced-motion
- `templates/init_report.html:121-202`（items/todos/verify 渲染）、360px

**老 HELP 实物**
- `备忘录.html`（skill 根，57500 B / 585 行）：内联 clipboard helper 偏移 13945-15907；`window.__DATA__` 载荷 15935-32233（含 `"version":"1.2.2"`、`generated_at: 2026-08-08 09:15:06`、`共 30 个场景`）；body 起点 32262；`#mods` 33700；`contact-box` 33747；`#footerLine` 34200；`#backToTop` 34300；`#toast` 34400；残留 `<!--INJECT-DATA-->` 34476；渲染 JS 34494-46854（含 `buildModule` / `buildSceneCard` / `copyPrompt` / `toast` / `showToast` / `safeWriteText`）；`@media(max-width:820px)` 两段（1941 / 12998）

**决策与规范**
- `docs/adr/0007-help-4-level-restructure.md:12-21`（8 域 / subfunction 兜底 / 无 order / 4 级 details 渲染）
- `docs/adr/0003-b-execution-fallback.md:8-19`（4 状态 fallback）
- `docs/adr/0006-template-lint-infrastructure.md:5-15`（templates 静态 lint 三类规则）
- `docs/adr/0001-version-sot.md:3`（版本号 SoT = SKILL.md）
- `docs/adr/0004-a-structure-files.md:86`（`备忘录.html` 为 SKILL.md 镜像，自动生成）
- `SKILL.md:81-144`（HTML 交付规范 + checklist）、`:147-183`（用户原话→唤醒词反向指引表）、`:226-292`（唤醒词→HTML 对照表）、`:1109-1174`（HELP 行为 / 契约 / 守门测试 / CLI / 历史）

**公共组件（跨技能复用）**
- `公共组件/injector.py:5-7,26-28`（3 占位符恰 1 硬拦截）
- `公共组件/assets/base.js:230-264`（`buildDataText` 消费 `scene.snapshot`）、`:266-`（`buildLogText` 6 段）、`:61-115`（toast 栈，≤820px 收窄为 3）
- `公共组件/docs/component-contract.md:98,103,166`（copy_log 字段位置与 6 段日志映射）
