# 场景 01 主页 · 老技能 HTML 实物清单

本件把老卡路里技能里与本图 9 条唤醒词有关的 HTML 实物逐件盘出来，供「老新融合」的模板设计取用。只记形状与字段：哪张模板、区块按什么顺序摆、注入了哪些字段、点下去发生什么。

- 归属：`docs/skills/skill-calorie/scene01-老HTML清单.md`（研究票，只 add 本件一个文件）。
- 地图：#162《卡路里场景 01 主页》。
- 老技能根目录：`D:\2Study\StudyNotes\SKILLS\卡路里`。全程只读，未改老技能与本仓的任何源码。
- 唤醒词权威表：`scripts/_triggers.py`（436 条）。老模板目录：`templates/`（73 张 `.html`）。
- 本图这 9 条唤醒词各自交付一张结果型 HTML；9 张全部由同一张模板装出来。
- 同一条事实在新仓的落点：9 条已散到 5 个命令（`calorie.view.home` order 0／5／6／7／8、`calorie.view.diet` order 1、`calorie.view.exercise` order 2、`calorie.view.goal-progress` order 4、`calorie.view.weight` order 3）—— 老侧「9 条合装 1 张模板」与新侧「9 条散在 5 个命令」的落差，逐条对在 `docs/skills/skill-calorie/scene01-新侧优秀件清单.md` 的「四、本图 9 条在新仓的命令归属」。
- 路径写法：老技能内部路径统一用正斜杠（`templates/home_dashboard.html`）；老共享层「公共组件」的路径是绝对路径（见第三节）。
- 行号口径：指本件落笔时的老技能文件内容。老技能是只读快照，行号可复现。

## 一、9 条唤醒词 → 老模板 → 字段

先说结论：**本图 9 条唤醒词全部落到同一张模板 —— `templates/home_dashboard.html`（39,121 字节 · 1,047 行）。** 9 条之间没有模板差别，差别只在 `render_home.py` 收到的开关；同一张模板在运行时按开关换一套视图。

| 序 | 唤醒词（逐字） | 登记 key | 子功能 | 老模板 | 视图开关（逐字） |
|---:|---|---|---|---|---|
| 1 | 看今日主页 | `home_today_overview` | 看今日主页 | `templates/home_dashboard.html` | 无开关（默认 overview） |
| 2 | 看今日饮食概览 | `home_today_diet_overview` | 看今日主页 | `templates/home_dashboard.html` | `--section diet` |
| 3 | 看今日运动概览 | `home_today_exercise_overview` | 看今日主页 | `templates/home_dashboard.html` | `--section exercise` |
| 4 | 看今日体重概览 | `home_today_weight_overview` | 看今日主页 | `templates/home_dashboard.html` | `--section weight` |
| 5 | 看今日目标进度 | `home_today_goal_progress` | 看今日主页 | `templates/home_dashboard.html` | `--section goals` |
| 6 | 看本周主页 | `home_week_overview` | 看周期主页 | `templates/home_dashboard.html` | `--period week` |
| 7 | 看本月主页 | `home_month_overview` | 看周期主页 | `templates/home_dashboard.html` | `--period month` |
| 8 | 看连续记录天数 | `home_streak_days` | 看今日成就 | `templates/home_dashboard.html` | `--section streak` |
| 9 | 看今日热量预算 | `home_today_budget` | 看今日主页 | `templates/home_dashboard.html` | `--section budget` |

第 1 条另有 3 个别名：`开卡路里`、`卡路里面板`、`今日卡路里`（`_triggers.py:111`）。9 条的命令都是 `python scripts/render_home.py …`，末尾统一挂 `--chain "1.识别→2.读DB聚合→3.渲染"`（`_triggers.py:113` 起逐条）。

### 登记字段（逐字抄）与模板真正读到的名字

登记里每条写着 `data_fields`。抄下来是这样，但**这些名字与模板真正读到的字段名是两套**：照着登记抄字段名会全部落空。右列出处为 `scripts/render_home.py`。

| 序 | 唤醒词 | 登记 data_fields（逐字抄） | 模板真正读到的名字（出处） |
|---:|---|---|---|
| 1 | 看今日主页 | `["today_kpi", "goal_progress", "weekly_trend", "streak_days"]` | `home.kpis[]`（每张 `key`／`label`／`icon`／`value`／`unit`／`detail`／`pct`）＋`home.trend[]`（`date`／`calories`／`weight`）＋`home.summary`（:406-436） |
| 2 | 看今日饮食概览 | `["diet_calories", "diet_protein", "diet_goal", "diet_vs_target"]` | `diet.calories`／`diet.protein`／`diet.goal_cal`／`diet.goal_protein`／`diet.cal_pct`／`diet.protein_pct`（:440-447） |
| 3 | 看今日运动概览 | `["exercise_burn", "exercise_duration", "exercise_goal", "exercise_vs_target"]` | `exercise.burn`／`exercise.minutes`／`exercise.count`／`exercise.goal`／`exercise.pct`（:451-457） |
| 4 | 看今日体重概览 | `["latest_weight", "weight_goal_gap", "weight_delta_7d"]` | `weight.latest_kg`／`weight.goal_kg`／`weight.goal_diff`／`weight.delta_7d`（:460-465） |
| 5 | 看今日目标进度 | `["goal_calorie_pct", "goal_protein_pct", "goal_water_pct", "goal_exercise_pct"]` | `goals.items[]`（每项 `label`／`goal`／`actual`／`pct`）＋`goals.summary`；目标暂停时另加 `goals.paused`＋`goals.paused_summary`（:470-499） |
| 6 | 看本周主页 | `["week_diet_total", "week_exercise_total", "week_weight_trend"]` | `period.diet_calories`／`diet_protein`／`diet_days`／`exercise_burn`／`exercise_minutes`／`exercise_days`／`weight_start`／`weight_end`／`weight_change`，外加 `period.period`／`start`／`end`（:191-217、:500-505）。`exercise_minutes` 由 `_period_summary` 产出（:215），模板侧未读到 —— 登记里也没有这个名字 |
| 7 | 看本月主页 | `["month_diet_total", "month_exercise_total", "month_weight_trend"]` | 同第 6 条（week 与 month 共用一套字段，只换窗口；`_period_range` :179-188） |
| 8 | 看连续记录天数 | `["streak_current", "streak_longest"]` | `streak.current`／`streak.longest`／`streak.summary`（:124-160、:506-514） |
| 9 | 看今日热量预算 | `["tdee", "exercise_burn", "intake_today", "remaining_calories", "goal_gap"]` | `budget.tdee`／`budget.exercise_burn`／`budget.intake`／`budget.remaining`／`budget.summary`（:220-237、:515-524）。登记里的 `intake_today`／`remaining_calories`／`goal_gap` 三个名字在脚本里都不存在 |

另外，模板里各块的标题与提示语是写死在 HTML 上的，不随视图变（第 2 节逐块列）。

## 二、命中的模板逐个结构

本图只命中 1 张模板，故本节只有一件。

### `templates/home_dashboard.html`（39,121 字节 · 1,047 行）

老技能里这张模板的落盘名是「主页仪表盘_<时间戳>.html」（`.scratch/research/01-主页-研究报告.md:241` 记的产物路径口径）。数据经 `<!--INJECT-DATA-->` 注入一次（:702），共享脚本与图表脚本也由同一行挂上。

#### 静态骨架：区块按出现顺序

| 序 | 区块 | 结构标记 | 行号 | 出什么 |
|---:|---|---|---|---|
| 1 | 头部三件套 | `.hero`／`#eyebrow`／`#heroTitle`／`#heroSub`／`#statusPill` | 608-613 | 眉标「卡路里」＋大标题（默认「今日概况」）＋副标题（日期 · 卡路里主面板）＋待办徽章 |
| 2 | KPI 卡片格（6 张） | `#kpiGrid`／`.kpi-grid` | 615-616 | 饮食／运动／体重／目标／进度／连续，一张一个读数 |
| 3 | 趋势小图（最近 7 天） | `#trendChart`／`.trend-chart` | 618-619 | 折线＋底部一行日期标签 |
| 4 | 七个分视图区块（一次只显一块） | `#secDiet`／`#secExercise`／`#secWeight`／`#secGoals`／`#secStreak`／`#secBudget`／`#secPeriod` | 621-649 | 每块＝标题＋右侧灰色提示语＋一个 `.mini-view` 小卡网格 |
| 5 | 缺口公式条 | `#deficitFormula`／`.deficit-formula` | 651-664 | 一行图例＋五个数字行：基础代谢 TDEE ＋ 运动消耗 ＝ 应烧总热 − 实际摄入，再一行缺口与一句结论 |
| 6 | 今日待办 | `#todoSection` | 666-673 | 标题＋右侧「N 项待完成」＋4 行（饮食／饮水／运动／体重），未完成的行挂高／中／低徽章 |
| 7 | 最近记录 | `#recentSection` | 675-689 | 饮食 5 条＋运动 5 条，分两个小组 |
| 8 | 复制区占位（空） | `.copy-actions` | 691-695 | 注释写着「传输层双按钮（复制数据／复制日志）」，div 里没有任何按钮 |
| 9 | 页脚 | `footer` | 697 | 「卡路里 Skill · 主面板 · 2026-07-23」 |
| 10 | 回到顶部 | `#backTop` | 700 | 右下角锚点箭头 |
| 11 | 数据位与外挂脚本 | `#payload`／`SHARED-HELPERS`／`CHARTS-HELPERS` | 702-1041 | 数据注入位＋共享脚本位＋图表脚本位，再接页面自己的脚本 |
| 12 | 复制按钮组 | `#actionbar-zone` | 1044-1045 | 由公共层 `actionBar()` 注入 |

#### 运行时两套形态

视图分派在 `render()`（:858-878）：除 overview 外的 8 条全都走 `renderSection()`（:742-855）。

**分视图形态（8 条走这里）**，固定四步：

1. 先把 KPI 格／趋势图／缺口公式条／今日待办／最近记录五块一起隐藏（:745-748）——这五块在分视图里一个都不留。
2. 只显示目标那一块（:755-756）。
3. 在该块标题之后插一行结论句 `.view-summary`（:758-762）。
4. 该块自己的小卡进 `.mini-view` 两列网格（窄屏转一列，:554、:597-599）。

**overview 形态（1 条走这里）**，从上到下：头部三件套 → 一句话总结（插在 h1 之后，:927-930）→ KPI 6 张（:897-904）→ 趋势小图（:907-924）→ 缺口公式条（:936-956）→ 今日待办（:958-995）→ 最近记录（:997-1023）→ 页尾复制按钮组。

**七个分视图各出一张什么**（每张卡由 `card(label, value, unit, sub, pct)` 出，:733-740）：

| 分视图 | 区块标题与提示语（写死在 HTML） | 卡片 |
|---|---|---|
| `diet` | 「🍽️ 今日饮食」／「累计热量/蛋白 vs 目标」 | 累计热量（卡，带完成度条）＋蛋白质（g，带完成度条） |
| `exercise` | 「🏃 今日运动」／「累计消耗/时长 vs 目标」 | 累计消耗（卡，带完成度条）＋运动时长（分钟，无进度条） |
| `weight` | 「⚖️ 今日体重」／「最新/距目标/Δ7天」 | 最新体重（kg）＋距目标（±kg，第二行写 Δ7 天）；两张都不带进度条 |
| `goals` | 「🎯 今日目标进度」／「热量/蛋白/饮水/运动」 | 暂停横幅（仅在目标已暂停时出，带一颗复制按钮）＋4 张（热量／蛋白／饮水／运动，各带完成度条） |
| `streak` | 「🔥 连续记录」／「streak」 | 当前连续记录（放大数字）＋历史最长（放大数字） |
| `budget` | 「💰 今日热量预算」／「TDEE+运动−已摄入」 | TDEE ＋运动消耗 ＋已摄入 ＋剩余可吃（放大数字，正负分色） |
| `week`／`month` | 「📅 周期总览」／提示语位改成窗口起止日期 | 窗口饮食摄入（卡，副行写几天有记录）＋窗口蛋白（g）＋窗口运动消耗（卡，副行写几天有记录）＋窗口体重变化（±kg，副行写起止体重） |

结论句都按两档或三档写（例：热量 ≥100% 写「热量已达标」、≥80% 写「热量接近达标」、其余「热量偏少」；:429-435、:771-774）。

#### 交互件清单

- **待办徽章**：`#statusPill` 两态 —— 「N 项待办」或「今日全部完成 ✓」（:881-889）。只在 overview 出；分视图里这个位置留空。
- **进度条**：三色阈值写在一处 `barClass()` —— ≥90 走 good、≥60 走 warn、其余走 bad（:726-731）。KPI 卡与分视图小卡共用它。
- **百分比徽章**：KPI 卡标签右侧的圆形百分比（:899）。
- **图表**：`window.charts.line`（公共层图表脚本），7 天折线，高 60，带数据点，不画坐标轴文字，日期另排一行（:907-924）。
- **复制按钮组**：页尾由 `actionBar()` 注入，固定两颗「复制数据」／「复制日志」，可另加场景按钮（`D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js:304-315`；复制文本形状见第三节）。
- **条件复制按钮**：目标已暂停时出「🔄 重启所有目标」，点下去把一段中文指令写进剪贴板，按钮文案变「✓ 重启指令已复制」（:801-806、:1032-1037）。
- **回到顶部**：右下角 `#backTop` 锚点（:700）。
- **空态**：饮食／运动列表为空时出 `window.emptyState`（:1008、:1022）。
- **错误态**：数据状态不是 ok 时整页换成 `window.errorReceipt`（:859-862）。
- **没有的东西**：tab、折叠、排序、筛选，以及页内的视图切换控件一个都没有 —— 看哪个视图只能由命令开关决定，页面上切不了。

## 三、公共组件（老共享层）

老技能自带的公共层不挂在技能根下：技能根 `D:\2Study\StudyNotes\SKILLS\卡路里` 里**没有**同名目录，公共层与卡路里平级，住 `D:\2Study\StudyNotes\SKILLS\公共组件`。本节两件实物都从那里读：

| 实物 | 路径 | 实测大小 |
|---|---|---|
| 公共脚本 | `D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js` | 46,892 字节 |
| HELP 页面模板 | `D:\2Study\StudyNotes\SKILLS\公共组件\assets\help_template.html` | 40,927 字节 |

按老技能根目录去找这两件会落空 —— 这是本图 9 条与「公共组件」有关的一切引用的路径口径。

### 1. 提示出口 `window.toast`（本页不用，但同族老模板在用）

`window.toast(msg, detail, options)` 定在 `base.js:185`，出口形状是三参数：一句话、详情、选项。实现是栈式的（多条同时在场会叠起来），默认存活 4,500ms，仓里另有 304 号验收页专验这个堆叠。

- **老模板 13 张在调它**：`body_composition_wizard.html`、`body_measurements_wizard.html`、`body_photo_gif_planner.html`、`body_photo_log_wizard.html`、`cron_setup.html`、`crud_receipt.html`、`diet_overview.html`、`diet_review.html`、`food_library.html`、`nutrition_label_wizard.html`、`profile_setup.html`、`today_meals.html`、`weight_batch_delete.html`。
- **`templates/home_dashboard.html`（本图唯一命中的那张）不用它**：整页搜不到 `window.toast`；本页的页面级提示只有四条别的路 —— `#statusPill` 待办徽章（:882）、`.view-summary` 结论句（:758-762）、`window.errorReceipt` 错误回执（:860）、`window.emptyState` 空态（:1008、:1022）。
- 对本图的意义：新侧主页那条**提示条（toast 形态）不是凭空来的**，老共享层早有这个出口，只是本页模板没调；融合时「新侧提示条 ↔ 老侧 `window.toast`」这一个对照要写进设计。

### 2. 复制区的老正本（三格式文本 ＋ 六段日志）

老侧复制按钮的**按钮**由 `actionBar(p, extra, opts)`（`base.js:304-326`）注入，两颗文案恒定为「复制数据」／「复制日志」；这两颗按钮点下去剪贴板里那段文本，才是复制区的正本，也在同一个文件里。

**`buildDataText(p, format)`（`base.js:230-264`）—— 数据侧三格式。** `format` 三选一，缺省 `text`：

- `json`：整个 `data.scene.snapshot` 缩进两份直出。
- `csv`：第一行标题，第二行摘要行（用分号加空格连接），往后每个区块一行 `[标题]`、每条记录一行，整个列表用换行符拼起来。
- `text`（中文形，老仓默认那一种）：首行「【技能名 · 命令名】」→「场景: 命令名(场景号) · 唤醒词「…」」→「时间: …」→ 摘要行逐行 → 每区块「▍区块标题」＋每条「  · 行文本」。

**`buildLogText(p, format)`（`base.js:267-295`）—— 六段日志。** 段落顺序与标题逐字写在代码里：① 场景标识（命令／唤醒词／场景名）② AI 思考链（缺省写「本地渲染 · 无 AI 链」）③ 底层数据结构（缺省写「只读查询」）④ 调用链（缺省写「未知」）⑤ 时间戳 ＋ 版本（本地时间／版本各一行）⑥ 异常信息（缺省写「无」）。

- 对本图的意义：新侧 `shared/copyArea.ts` 的**三格式菜单**与**日志六段入参**，正文这一份就在老共享层；老新两边的段数一致，差别只在取值来源。

## 四、同族相邻模板

本图 9 条用不到、但同属主页族主题（今日／本周／本月／连续／预算／体重／饮食／运动／目标进度）的老模板，各记一行。「唤醒词条数」指登记里指名这张模板的条数。

| 主题 | 模板 | 字节 | 唤醒词条数 | 形态一行 |
|---|---|---:|---:|---|
| 主页 | `templates/home_dashboard.html` | 39,121 | 9 | 本图命中的那一张（结构见上一节） |
| 饮食 | `templates/today_diet.html` | 18,790 | 3 | 「🍽️ 今日饮食」＋餐次进度＋营养配比＋今日明细（看今日饮食／看昨日饮食／看今日营养） |
| 饮食 | `templates/today_water.html` | 10,247 | 1 | 「💧 今日饮水」＋今日进度＋本周 7 天＋今日每杯（看今日喝水） |
| 饮食 | `templates/today_meals.html` | 19,918 | 8 | 「🍱 吃的记录」＋按日汇总＋每日明细，明细行可点（看本周／上周／本月／上月／最近 7 天／最近 30 天／某段时间／有备注的饮食记录） |
| 饮食 | `templates/diet_overview.html` | 7,682 | 1 | 「🍱 饮食总览」＋本周累计＋本月累计（看饮食总览） |
| 饮食 | `templates/nutrition_ratio.html` | 12,604 | 1 | 「🥗 营养配比」＋热量来源占比＋推荐范围对比（看营养结构） |
| 饮食 | `templates/nutrition_detail.html` | 6,147 | 1 | 「🧪 营养素深度」＋微量营养素 vs 推荐（看营养素深度） |
| 饮食 | `templates/diet_review.html` | 9,041 | 5 | 「📝 饮食复盘」＋每日热量趋势＋高频食物 TOP5（饮食复盘 5 个窗口） |
| 饮食 | `templates/meal_distribution.html` | 11,004 | 5 | 「🍽️ 餐别分布」＋餐别热量占比＋明细（早餐／午餐／晚餐／加餐／全部，各最近 7 天） |
| 饮食 | `templates/food_ranking.html` | 14,349 | 21 | 「🍽️ 食物排行榜」一张表格顶全部窗口与榜单（看高热量榜等 21 条） |
| 运动 | `templates/exercise_summary.html` | 11,856 | 15 | 「🏃 运动报表」＋图表＋明细表（看今日／昨日／本周／上周／本月／上月／最近 7 天／最近 30 天／某段时间运动） |
| 运动 | `templates/exercise_goal_view.html` | 7,662 | 2 | 「🎯 运动目标达成」（看今日运动（vs 目标）／看本周运动（vs 目标）） |
| 运动 | `templates/exercise_trend.html` | 7,117 | 1 | 「📈 运动趋势」＋每日消耗＋每周运动频次（看运动趋势） |
| 运动 | `templates/exercise_recap.html` | 6,652 | 5 | 「📊 运动复盘」＋类型分布＋高频运动＋每日消耗趋势（运动复盘 5 个窗口） |
| 运动 | `templates/exercise_distribution.html` | 13,875 | 1 | 运动类型分布（看运动类型分布） |
| 体重 | `templates/weight_dashboard.html` | 7,696 | 2 | 「⚖️ 体重总览」＋最近 7 天趋势（看今日体重／看体重总览） |
| 体重 | `templates/weight_history.html` | 18,031 | 18 | 「⚖️ 体重历史」＋体重曲线＋明细＋按钮行（看本周／上周／本月／上月／最近 7 天／最近 90 天／某段时间体重、看体重曲线） |
| 体重 | `templates/weight_compare.html` | 12,672 | 18 | 「对比体重」＋补充对照（18 种两段对照） |
| 体重 | `templates/weight_review.html` | 7,324 | 6 | 「📋 体重复盘」＋体重趋势＋里程碑（体重复盘 5 个窗口＋看里程碑回溯） |
| 体重 | `templates/weight_volatility_v2.html` | 19,431 | 5 | 「📊 体重稳不稳（增强版）」＋体重折线＋±σ 带＋目标线（看体重稳不稳 5 条） |
| 目标 | `templates/goal_progress.html` | 17,521 | 12 | 「目标进度」＋目标 vs 实际＋明细表＋目标线 vs 实际线（看今日目标／看本周目标／看营养目标进度／看体重目标进度／看饮水目标进度／看目标对比实际／看目标完成度／看即将到期的目标／看目标完成率（按周）等） |
| 目标 | `templates/goal_status.html` | 5,483 | 2 | 「目标状态」＋状态（暂停所有目标／重启所有目标） |
| 目标 | `templates/goal_weight.html` | 14,249 | 4 | 「体重目标」＋当前状态＋设置目标＋确认目标（定／改体重目标） |
| 目标 | `templates/goal_recommend.html` | 9,805 | 3 | 「目标推荐」＋推荐方案＋推荐依据＋采纳推荐（自动算目标 3 条） |
| 预算 | `templates/calorie_deficit.html` | 10,631 | 1 | 「⚖️ 热量缺口」＋每日摄入 vs 消耗＋缺口明细（查热量缺口） |
| 周期 | `templates/health_dashboard.html` | 12,895 | 登记里 0 条 | 「综合健康报告」＋🎯 今日该做什么＋「📤 复制回 AI」区（`<pre id="copyText">` 加一颗复制按钮）。实物在盘上，但登记里没有 `html_template` 指向它（查健康报告 走的是老一代条目，只写命令） |
| 周期 | `templates/health_report.html` | 18,023 | 0 | 各维度走势（摄入／运动／体重／饮水／缺口）＋异常天标注＋建议＋历史轨迹 |
| 周期 | `templates/long_trend.html` | 8,333 | 0 | 多指标同图（归一化 0-100）＋周期对比 |
| 周期 | `templates/six_factors.html` | 8,381 | 0 | 「📊 看每日 6 因素综合」＋最近 7 天走势＋异常标注 |
| 周期 | `templates/combined_analysis.html` | 12,726 | 154 | 双序列同图（看体重 vs 摄入，154 条窗口与切片） |

**连续族没有独立模板。** 「看连续记录天数」只在 `home_dashboard.html` 的 `#secStreak` 出两块放大数字卡；`templates/` 73 张里没有一张 streak 专门页。

## 五、值得学 / 值得弃

### 值得学

**`templates/home_dashboard.html`（本图唯一命中的模板）**

1. **一模板多视图，一次只显一块。** 七个分视图区块全在 DOM 里躺着，用 `display:none` 只显当前块（:621-649、:755-756）。好处是 9 条唤醒词共用一套样式与脚本，改一处 9 条同时变 —— 这是这张模板最值钱的地方，值得新仓照做。
2. **结论句跟着区块走，不另起一块。** 分视图把 `.view-summary` 插在当前区块标题之后（:758-762），overview 插在 h1 之后（:927-930）。读序固定成「标题 → 一句结论 → 数字卡」，用户先拿结论再看数。
3. **进度条口径写死在一个函数里。** `barClass()` 定 90／60 两档（:726-731），KPI 卡与分视图小卡共用 —— 达标／接近／偏低一眼可分，且只有一处判据。
4. **只造卡一个函数。** `card(label, value, unit, sub, pct)`（:733-740）出「小标签＋大数字＋单位＋进度条＋说明」，六个分视图全部走它。形状统一，调样式只改一处。
5. **空态与错误态都有统一出口。** 列表为空走 `window.emptyState`（:1008、:1022），整页数据不对走 `window.errorReceipt` 换掉整份 body（:859-862）。看下来不会出现空板或白页。
6. **复制按钮交给公共层出，页面不自己拼。** 页尾只留一个 `#actionbar-zone`（:1044-1045），两颗按钮由 `actionBar()` 注入、文案恒定（`D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js:313-314`）。页面侧零复制逻辑。
7. **「最想看的那个数」单列一类放大样式。** 连续记录用 `.streak-num`、预算的剩余可吃用 `.budget-remaining`（:814-838），把小卡里的主数字放大到 44／48px，和普通小卡拉开层次。

**`templates/goal_progress.html`**

1. **同页给两种口径。** 数字表（目标 vs 实际）与图（目标线 vs 实际线）摆在同一页（:132、:156、:186），用户不用在两页之间来回切。
2. **区块标题与提示语都由数据下发**（`D.itemsTitle`／`D.table.title`），同一张模板换窗口不换骨架。

**`templates/health_dashboard.html`**

1. **页内直接放「复制回 AI」区。** `<pre id="copyText">` 加一颗复制按钮（:183-184、:211），把下一步要交回给 AI 的那段话摆在页面里，用户不用自己想措辞。
2. **「今日该做什么」放在报告最前**（:178），结论先行，明细在后。

**`templates/today_meals.html`**

1. **明细整行可点**（:282、:310 两处 `onclick`），点一行即进那一日／那一条的详情 —— 表和详情之间不用另设按钮。

### 值得弃

**`templates/home_dashboard.html`**

1. **大标题写成唤醒词原文。** 运行时 `heroTitle` 被赋成 `meta.wake_word`（:867-868），于是页面上最大的字是「看今日主页」这句命令，还和 HELP 里的词条一模一样。模板里默认值反倒是正常的「今日概况」（:610），被覆盖掉了。新仓的标题应当是「今日总览 ＋ 日期」这类给人看的名字。
2. **一屏塞太多（overview 一档）。** 6 张 KPI ＋ 7 天趋势 ＋ 缺口公式条 ＋ 4 行待办 ＋ 最近记录（饮食 5 条＋运动 5 条）全在首屏往下拉（:615-689）。老技能自己的研究报告也记着「信息密度上需 upper bound 设计」「主页只展示导航图，不展示决策级数字」（`.scratch/research/01-主页-研究报告.md:227`、`:245`）。
3. **字号层级乱。** 同一张 CSS 里 56 处 `font-size` 声明、19 个不同取值：10／10.5／11／11.5／12／13／14／15／16／17／18／20／22／26／28／30／32／44／48 px。13px 用了 17 次，11px 与 11.5px 并存 —— 相邻档位肉眼分不出来，层级等于没有。
4. **「目标」与「进度」两张卡长得一样、都写 x/4。** 一张是达标计数（几项达标），一张是记录完整度（几类已记录）（:417-421）。脚本里留着 2026-08-09 的注释，说这是「信息重复审查」后靠语义分离救回来的 —— 用户得读注释才知道两张卡的差别，页面上看不出来。
5. **两张 KPI 卡用同一个图标。** 饮食与连续都用 🔥（:407、:422），并排看分不出谁是谁。
6. **死占位与注释不符。** 模板里留着 `.copy-actions` 空容器，注释写「传输层双按钮（复制数据／复制日志）」，里面一颗按钮都没有（:691-695）；真正的按钮在页尾由 `actionBar()` 出。注释留在原地会让人以为这里出按钮。
7. **窄视图也下发整份模板与全量数据。** 「看连续记录天数」最终只显示两个数字（:814-824），但拿到的仍是 39,121 字节的模板加含 KPI／趋势／待办／最近记录的整份数据。视图窗口越窄，浪费越大。
8. **同一个数字在两处出现。** KPI 卡已经给了「热量 1200 · 目标 2000 卡 · 60%」，分视图与 overview 又各出一句 `view-summary` 文字复述（:771-774、:929）。老技能在 :401、:425、:969 三处留着「信息重复审查」的注释，说明这正是反复出问题的地方。

**同族其它模板**

1. **`templates/long_trend.html` 与 `templates/health_report.html` 的 h1 是字面 `--`**（两张的 h1 内容都是两个连字符）。数据没注入或没算出来时，页面上最大的字就是 `--`。这是把占位符当默认值留在模板里的后果。
2. **`templates/weight_compare.html` 的 h1 是「对比体重」，与 HELP 里的唤醒词同名**，同样属于「标题用命令语」这一类。
3. **「与按钮同名的标题」在 73 张里按逐字比对只命中 1 处**：`templates/body_photo_log_wizard.html` 的区块标题与按钮都叫「📋 复制 prompt 给 AI」。主页族这几张没有这个问题（复制按钮统一由 `actionBar()` 出，本身不带标题）—— 但同族的写前页有，新仓的复制区标题去重口径要继续守。比对做法：抽出每张模板的 `h1`／`h2`／`h3` 文案与 `button` 文案，逐字求交集。

## 六、缺失件

1. **`templates/goal_config.html` —— 登记指名它，文件已不在盘上。** 4 条唤醒词（定营养目标／定饮水目标／改营养目标／改饮水目标）的 `html_template` 都写它。老技能自己的决定记录 `docs/adr/0009-template-split-principle.md` 写明：2026-08-04 把它拆成 `templates/goal_config_nutrition.html`（23,191 字节）与 `templates/goal_config_water.html`（14,012 字节），「旧 `templates/goal_config.html` 退役删除」，渲染脚本 `scripts/render_goal_config.py` 按 mode 选新模板（:31-32）。两张新模板都在盘上，但登记里没有一条唤醒词写它们 —— **登记没跟着改**。这 4 条都不在本图 9 条里，主页族不受影响。
2. **`templates/help_center.html` —— 老技能文档与决定记录把它当唤醒词表在页面侧的权威，文件已不在 `templates/`。** 例如 `.scratch/research/01-主页-研究报告.md:253` 写「主页 SoT ＝ `scripts/_triggers.py`（数据）＋ `templates/help_center.html`（呈现）」，`03-体重-研究报告.md:721` 写「新增唤醒词必须三处一致：`_triggers.py` / `SKILL.md` / `templates/help_center.html`」。今天这份 HELP 由 `scripts/render_help_center.py` 走老共享层的 `D:\2Study\StudyNotes\SKILLS\公共组件\assets\help_template.html` 出（该文件在盘，40,927 字节）。文档里的路径是旧的。
3. **老一代条目 22 条没有登记模板。** `_triggers.py` 里 436 条中 414 条带 `html_template`，另 22 条是上一代的写法：只写命令（`main_prompt.cli`）与提示语，没有 `html_template`／`key`／`subfunction` 三样。这 22 条的实物其实大多在盘上，例如查热量趋势 → `templates/calorie_trend.html`（`render_calorie_trend.py:21`）、查健康报告 → `templates/health_dashboard.html`（`render_health_dashboard.py:28`）。**这 22 条都不在本图 9 条里**，主页族不受影响。
4. **有实物但登记里没有任何 `html_template` 指向它 —— 23 张。** 与本图同主题的有：`calorie_trend.html`、`health_dashboard.html`、`health_report.html`、`long_trend.html`、`six_factors.html`、`nutrition_analysis.html`、`predict_report.html`、`anomaly_report.html`、`goal_config_nutrition.html`、`goal_config_water.html`、`goal_weight_result.html`、`weight_batch_delete.html`。其中前两张其实还能通过老一代条目的命令走到，剩下的是真没人引用。与本图主题无关的另 11 张：`profile_setup.html`、`food_library.html`、`error_receipt.html`、`cron_setup.html`、`cross_skill_sleep.html`、`lint_health.html`、`review_template.html`、`body_photo_gif_planner.html`、`body_photo_log_wizard.html`、`body_photo_viewer.html`、`设计审查报告.html`。
5. **`goal_config.html` 那 4 条唤醒词今天点下去会怎样，本件没验。** 本件只做实物盘点，跑不跑得通由跑通类的票去看。

## 七、取证方式

- 模板清单与字节数：`Get-ChildItem templates -Filter *.html`（73 张）。
- 唤醒词逐条：`scripts/_triggers.py` 按 `'category':` 切块后逐块取 `wake_word`／`key`／`subfunction`／`html_template`／`data_fields`，得 436 条，其中 9 条的 `subfunction` 属于主页族（看今日主页／看周期主页／看今日成就）。
- 视图与字段：`scripts/render_home.py` 的 `build_data()`（:369-525）与各 `_xxx()`（:124-237）；模板侧 `render()`（:858-878）与 `renderSection()`（:742-855）。
- 复制按钮来源：`D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js` 的 `actionBar()`（:304-326）；复制文本正本同文件 `buildDataText`（:230-264）与 `buildLogText`（:267-295）；提示出口 `window.toast`（:185）。
- 老共享层大小与路径：`Get-Item` 实测 `base.js` 46,892 字节、`help_template.html` 40,927 字节；技能根 `D:\2Study\StudyNotes\SKILLS\卡路里\公共组件` 不存在。老模板调 `window.toast` 的张数：73 张里逐张搜 `window.toast(` 命中 13 张，`home_dashboard.html` 不在其中。
- 老技能自述：`docs/scene-prompts/01-主页.md`（9 条定稿提示语）与 `.scratch/research/01-主页-研究报告.md`。
- 单张模板均未整份通读；引用均按区块标记行附近的内容核对过。
