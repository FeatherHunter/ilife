# t161 老技能 HTML 清单 · 报告族

盘查员 B 交付。范围：报告族老实物盘点 ＋ 回答「8 条报告唤醒词分别由哪些老模板承担」。

老技能根目录：`D:\2Study\StudyNotes\SKILLS\卡路里`（只读）。

## 范围与计数

已测事实（任务书给定，未重扫）：真模板在 `templates\` ＋ `templates\临时样例\` ＋ `calorie_html\` ＋ `html\` ＝ 79 件；`.scratch\`（897 件）与 `tests\` 是垃圾／用例产物，忽略。

复核计数：

| 位置 | 件数 | 明细 |
| --- | --- | --- |
| `templates\` | 73 | `*.html`；另有 1 件 `help_center_v2_4_12.html.bak` 非 html，不计 |
| `templates\临时样例\` | 2 | `沉浸主面板_视觉标杆v2.html`、`统一主面板_视觉标杆.html` |
| `calorie_html\` | 2 | `卡路里_HELP_20260730_130429.html`、`卡路里_HELP_20260731_201530.html` |
| `html\` | 2 | `tm_db.html`、`tm_mock.html` |
| 合计 | 79 | 与已测事实一致 |

**计数口径（裁决 2 · 写死）**：只计 `*.html`，**排除 `.bak`**。即 `templates\` 73 件 ＋ `templates\临时样例\` 2 件 ＋ `calorie_html\` 2 件 ＋ `html\` 2 件 ＝ **79 件**。`templates\help_center_v2_4_12.html.bak`（17696B）排除并在此注明。`.scratch\`（897 件）与 `tests\`（49 件）不计 —— 前者为垃圾产物、后者为用例产物。

本盘查员分派 11 件，合计 135350 字节。其中 ★core 2 件（`health_report.html`、`contraindication_report.html`），已细读；其余 9 件靠 grep 取骨架、字段、图表、交互、CSS。

## 逐件要点

字段名为模板内 `D.<name>` 实际取值路径（渲染器注入的 payload）。

### 1. `templates\health_report.html` ★core

- 路径｜字节：`templates\health_report.html` ｜ 18023B
- 标题：`卡路里 · 健康报告`（`<title>`）；页内 `h1#title` 由 `D.kind` 决定
- 章节骨架：`meta-bar`（左：日期区间·天数；右：`type-badge` 健康报告）→ `h1#title` → `p.sub`（窗口）→「fullBlock」／「singleBlock」二选一 → `div.insight` → `footer.src`
  - `fullBlock`：`kpi-grid#fullKpis` →「各维度走势(摄入/运动/体重/饮水/缺口)」＋ `legend` 5 色 →「异常天标注」`#anomalyList` →「建议」`#suggestion`
  - `singleBlock`：`kpi-grid#singleKpis` →「历史轨迹」`#singleChart`（可隐）→「`#singleTableTitle`」`#singleTableHead`／`#singleTable`（可隐）→「分类里程碑」`#milestoneList`（可隐）
- 数据字段：`kind`、`window`、`start`、`end`、`days`、`insight`、`kpis`〔label/value/delta〕、`series`〔date/calories/exercise_kcal/weight_kg/water_ml/deficit〕、`anomaly_days`〔date/notes[]〕、`suggestion`；单类分支另有 `current/category/height/history[]/milestones[]`（bmi）、`tdee/factor/cal_avg/deficit`（tdee）、`bmr/tdee/factor/under_bmr_days/under_bmr_list[][]`（bmr）、`avg/target/rate/p_goal/series[]`（protein）、`avg/goal/days_ok/days/rate/series[]`（water）、`total/items{}/history[]`（score）、`direction/first_half/second_half/inflections[]/trend[]`（trend）、`prev_start/prev_end/top3[]/deltas[]`（compare）
- 图表：`window.charts.line`。full 走 5 序列归一化多线（`series` 选项）；bmi／protein／water／score／trend 各走单线；protein／water 带 `markLine` 目标线
- 交互：无 tab、无折叠；唯一按钮位是共享 `actionBar` 注入区 `#actionbar-zone`
- CSS：模板自带 `<style>` ＋ `<!--SHARED-CSS-->` 占位。`:root` 变量 `--fg --fg2 --fg3 --bg --card --border --accent --good --warn --bad --soft`。`max-width:920px`，`@media (max-width:640px)` 下 KPI 4 列→2 列
- 服务票号：`#317`（迁 Base charts.line 多序列；141-142、157 三处注释记偏离）

**本件是全族枢纽。** `D.kind` 取值 9 个：`full`／`bmi`／`tdee`／`bmr`／`protein`／`water`／`score`／`trend`／`compare`（128-131 行 `titles` 表）。一个模板承担 9 种报告形态。

### 2. `templates\health_dashboard.html`

- 路径｜字节：`templates\health_dashboard.html` ｜ 12895B
- 标题：`健康仪表盘 · 卡路里`；`h1#title` 文案写死「综合健康报告」
- 章节骨架：`header.hero`（`h1#title` ＋ `div.sub#subtitle` ＋ `#statusArea`）→「🎯 今日该做什么」（`action` 行列表：`icon` ＋ `text strong`／`small`）→ 4 张维度卡（`head` ＋ `h3` ＋ `badge`）：🔥 摄入／🏃 运动／⚖️ 体重／📉 缺口 → `copy-section`「📤 复制回 AI（让 AI 帮你规划）」`pre`
- 数据字段：未见 `D.*` 取值（变量名非 `D`，直读 `__P__`）；模板内出现 `e.coverage_pct`、`w.trend`、`w.trend_label`、`calBadge`、`deficitBadge`
- 图表：无 canvas／svg／charts 调用。纯卡片 ＋ 徽章
- 交互：`copy-section` ＋ `pre` 承载可复制文本；`.btn.copied` 提供复制态反馈（绿底）
- CSS：`<style>` ＋ 共享占位。`:root` 更丰富：`--accent --accent-soft --bg --border --card --fg --fg2 --fg3 --green --green-soft --orange --orange-soft --red --red-soft --shadow`；含 `hero`／`status.ok`／`status.warn`／`action`／`copy-section` 专有块
- 服务票号：`#39`

### 3. `templates\nutrition_analysis.html`

- 路径｜字节：`templates\nutrition_analysis.html` ｜ 12467B
- 标题：`卡路里 · 营养分析`
- 章节骨架：`meta-bar` ＋ `type-badge` → `h1#title`／`p.sub` → `kpi-grid` →「三大营养每日占比(蛋白/碳水/脂肪)」（图 ＋ `legend`）→「钠 / 糖 / 纤维 日序列」（图 ＋ `legend`）→「钠 / 糖 / 纤维 综合报告」`table#combinedTable` →「营养改进建议(按优先级)」`table#adviceTable` → `div.insight` → `footer.src`
- 数据字段：`window`、`start`、`end`、`group`、`balanced`、`off_dims`、`shares`、`series`、`sodium`、`sugar`、`fiber`、`days`、`items`、`insight`
- 图表：`charts.line` 多序列，同样走 188 行「各指标独立 min-max → 归一化共享 0-100 域近似」注释
- 交互：无 tab／折叠；表格承载「综合报告」与「建议」两段；`.btn` 样式备而未用（仅在 CSS），实际动作走共享 `actionBar`
- CSS：`:root` 同 `health_report`（`--fg…--soft`）；`table-wrap` 横向滚动
- 服务票号：`#317`；`srcLine` 写 `render_analysis.py --view nutrition`

### 4. `templates\nutrition_detail.html`

- 路径｜字节：`templates\nutrition_detail.html` ｜ 6147B（族内最小）
- 标题：`卡路里 · 营养素深度`；`h1` 写死「🧪 营养素深度」
- 章节骨架：`head` → `h1`／`sub` →「微量营养素 vs 推荐」`row` 列表（`name` ＋ `track`／`fill` ＋ `pct` ＋ `val`）→ `warn-box` → `footer`（`src` ＋ `btn-group`）
- 数据字段：仅 `data`、`status`（内层结构在渲染器，模板按 `it.status` 上色）
- 图表：无（用 `bar-line` 进度条代替）
- 交互：`footer .btn-group` 复制按钮组，`.btn.copied` 绿底态；小屏 `min-height:44px` 触控适配（53-56 行）
- CSS：`:root` 同族；专有 `bar-line`／`track`／`fill`／`warn-box`
- 服务票号：`#44`（注释「#44:与全场景统一」，指按钮组统一）

### 5. `templates\nutrition_ratio.html`

- 路径｜字节：`templates\nutrition_ratio.html` ｜ 12604B
- 标题：`卡路里 · 营养配比`；`h1` 写死「🥗 营养配比」
- 章节骨架：`meta-bar` ＋ `type-badge` → `h1`／`sub` → `kpi-grid` →「热量来源占比」（`pie-wrap` ＋ `pie-legend`）→「推荐范围对比」（`range-mark` ＋ 表格）→ `footer`
- 数据字段：`data`、`status`（内层在渲染器）
- 图表：`charts.donut`（族内唯一环形图）
- 交互：`footer .btn-group` 复制组；`.btn.copied` 态；`table-wrap` iOS 惯性滚动（89 行）
- CSS：`:root` 多出语义色 `--prot --carb --fat --r1 --r2 --r3`（三大营养素与三档推荐范围各占一色）；小屏 `.section table` 降到 10px
- 服务票号：`#44`、`#317`

### 6. `templates\six_factors.html`

- 路径｜字节：`templates\six_factors.html` ｜ 8381B
- 标题：`卡路里 · 每日 6 因素综合`；`h1` 写死「📊 看每日 6 因素综合」
- 章节骨架：`meta-bar` ＋ `type-badge` → `h1`／`sub` → `kpi-grid`（KPI 带 `delta`／`deltaCls`）→「最近 7 天走势(摄入/运动/饮水/体重)」（图 ＋ `legend`）→「异常标注」→ `div.insight` → `footer.src`
- 数据字段：`date`、`week`、`kpis`、`insight`、`anomaly`、`degraded`
- 图表：`charts.line` 多序列（110-111 行注释记「Y 轴刻度文字缺失 — 均记偏离」）
- 交互：无按钮逻辑；共享 `actionBar`
- CSS：`:root` 同族标准集
- 服务票号：`#317`、`#356`；`srcLine` 写 `render_analysis.py --view six`

### 7. `templates\anomaly_report.html`

- 路径｜字节：`templates\anomaly_report.html` ｜ 5972B（族内次小）
- 标题：`卡路里 · 自动分析诊断`
- 章节骨架：`meta-bar` ＋ `type-badge` → `h1#title`／`sub` → `div.degrade#degrade`（默认 `display:none`）→ `div#findings`（发现卡列表）→ `div.insight` → `footer`（`src` ＋ `btn#copyDxBtn`）
- 数据字段：`title`、`window`、`start`、`end`、`days`、`findings`〔`cause`／`confidence`／`evidence`／`action`〕、`degraded`、`degrade_msg`、`insight`
- 图表：无
- 交互：**置信度分级**（`.conf-高` 红／`.conf-中` 橙／`.conf-低` 灰，30-33 行）＋ 每卡「证据」块 ＋「行动建议」块；`#copyDxBtn` 一键复制诊断结论为编号纯文本（84 行模板字符串）
- CSS：`:root` 同族；专有 `finding`／`evidence`／`action`／`conf-*`／`degrade`
- 服务票号：未见票号；`srcLine` 写 `render_analysis.py --view anomaly`

### 8. `templates\contraindication_report.html` ★core

- 路径｜字节：`templates\contraindication_report.html` ｜ 22654B（族内最大）
- 标题：`禁忌扫描报告 v2 · 卡路里`；`h1#title` 写死「健身计划禁忌扫描」
- 章节骨架：`eyebrow` ＋ `h1`／`sub` → `kpi-grid` 6 张（`sessions`／`movements`／`safe`／`errors`／`warns`／`hits`，各带顶部语义色）→ `pills` 筛选区 →「扫描概览」→ 命中列表（`section-title` ＋ `part-group`／`part-header` ＋ `hit` 卡：`hit-header`／`hit-tag`／`hit-name`／`hit-rule`／`hit-reason`／`hit-usedin` ＋ `alternatives` 替代区）→「已选替代 (N)」`selected-area`／`selected-list`／`selected-item` →「复制修改指令」`copy-preview` ＋ `btn-row`〔📋 复制修改指令／📊 完整报告／↺ 清空选择〕
- 数据字段：`SUMMARY`〔`scanned_sessions`／`scanned_movements`／`safe_skipped`／`by_severity.error`／`by_severity.warn`／`total_hits`〕、`HITS`〔`movement_name`／`rule_name`／`reason`／`used_in`／`severity`／`error`／`warn`〕、`alt.selected`
- 图表：无
- 交互：族内最重。severity 筛选 pills、「已选替代」多选状态机（`selected-area`／`count`／`clearAll()`）、**二段复制**（`copyModify()` 只出修改指令 ／ `copyFull()` 出完整报告，605／613 行）、`.btn:disabled` 禁用态、`.btn.copied` 绿底态
- CSS：**独立设计体系**，与前族不同：`--ink --ink2 --ink3 --line --bg-soft --bg-section --card --accent --green/orange/red-soft --gray --shadow --shadow-sm --r --r-sm --r-lg`（圆角也变量化）
- 服务票号：`#39`

### 9. `templates\goal_progress.html`

- 路径｜字节：`templates\goal_progress.html` ｜ 17521B
- 标题：`目标进度 · 卡路里`
- 章节骨架：`hero`（`eyebrow` ＋ `h1#title` ＋ `sub`）→ `paused-banner`（`paused-icon`／`paused-title`／`paused-sub` ＋ `btn-restart`）→ `kpis` → `section`「目标 vs 实际」（`row`：`name`／`num`／`bar-bg`／`bar-fg`／`badge`）→ `section.vs-chart`「目标线 vs 实际线」（近 N 天）→ `section` 明细表 → `copy-row` ＋ `guide`（`guide-step`／`guide-no`）
- 数据字段：`meta`、`title`、`subtitle`、`mode`、`kpis`、`context_kpis`、`items`、`itemsTitle`、`itemsHint`、`table`〔`title`／`hint`／`cols`〕、`summary`、`paused_summary`、`guide`、`empty`
- 图表：`charts.line`（`vs-chart` 段内联生成）
- 交互：**暂停横幅**（仅提示、数据照常）＋ 重启复制按钮 `btn-restart`（`copied` 绿底态）；`copy-row` 复制区；小屏下 `row` 改 2 行网格、表格用 `:has()` 按列数自适应列宽（87 行整段）
- CSS：`--ink --ink2 --ink3 --line --bg --card --accent --accent-soft --green --green-soft --orange --orange-soft --red --red-soft --shadow`；按钮 999px 胶囊 ＋ `min-height:44px`
- 服务票号：`#66`（2026-08-04 暂停横幅 ＋ 重启复制按钮）、`#317`

### 10. `templates\diet_overview.html`

- 路径｜字节：`templates\diet_overview.html` ｜ 7682B
- 标题：`卡路里 · 饮食总览`；`h1` 写死「🍱 饮食总览」
- 章节骨架：`head` → `h1`／`sub` → `kpi-grid` →「本周累计」（`chart-title` ＋ `chart` ＋ `chart-hint`）→「本月累计」（同上）→ `footer`
- 数据字段：`data`、`status`
- 图表：`chart` 容器（实际库在渲染器侧决定）
- 交互：`footer .btn-group` 复制组（`#44` 统一），`.btn.copied` 态，小屏 `min-height:44px`
- CSS：`:root` 族标准集；专有 `period`／`range`／`chart-title`／`chart-hint`
- 服务票号：`#44`

### 11. `templates\meal_distribution.html`

- 路径｜字节：`templates\meal_distribution.html` ｜ 11004B
- 标题：`卡路里 · 餐别分布`；`h1` 写死「🍽️ 餐别分布」
- 章节骨架：`head` → `h1`／`sub` → `kpi-grid` →「餐别热量占比」（`dist-wrap` ＋ `dist-pie`／`dist-pie-center` ＋ `dist-list`：`dist-row`／`dist-label`／`dist-track`／`dist-fill`／`dist-num`）→「明细」`table-wrap#mealTable` → `footer`
- 数据字段：`data`、`status`
- 图表：纯 CSS 分布条 ＋ `dist-pie`（无 JS 图表库）
- 交互：`meal-tag` 色标；小屏把 `#mealTable` 整体改卡片式（`tr::before` 左侧 3px 强调条，逐 `td` 重排，79-81 行），`td:nth-child(2)` 隐藏。**族内最完整的移动端表格降级方案**
- CSS：`:root` 族标准集；专有 `dist-*`／`meal-tag`／`one-line`／`big`／`small`
- 服务票号：`#44`

## 8 条报告 → 老模板映射表

跨全部 79 件关键词扫描结论：`BMI`／`TDEE`／`BMR`／`蛋白`／`水分`／`评分`／`健康趋势`／`健康报告` 八词**同时落在 `health_report.html` 一件之内**（命中行 128／129／130／131／192-303）。其它件命中均为邻近语义（体重页的 BMI 回显、目标配置页的 BMR 算式、HELP 文件的词表），非报告承担者。

承担机制：`scripts\render_analysis.py --view report --kind <K>` → 全族唯一模板 `templates\health_report.html`。渲染器 297-455 行按 `kind` 分派 9 个分支，未知 kind 抛 `ValueError`（455 行）。`SKILL.md` 642 行登记为「**A2 健康报告(19)**」：看健康报告 11 个窗口变体 ＋ 下列 8 条 ＝ 19 场景。

**权威映射证据**：`render_analysis.py:704-709` 的 `scene` 命名表 —— `scene = '健康报告' if args.kind == 'full' else {'bmi': '看BMI报告', 'tdee': '看TDEE报告', 'bmr': '看BMR报告', 'protein': '看蛋白质摄入报告', 'water': '看水分摄入报告', 'score': '看综合评分', 'trend': '看健康趋势', 'compare': '健康报告(含对比)'}[args.kind]`。这是老侧**代码内的自述映射**，与 `health_report.html:128-131` 的 `titles` 表逐项对应，亦与 `SKILL.md` 642 行场景登记一致 —— 三方互证。

| 唤醒词 | 老承担件 | 独立页还是段 | 覆盖程度 |
| --- | --- | --- | --- |
| 看BMI报告 | `templates\health_report.html`（`kind=bmi`），`render_analysis.py --view report` | 同一模板的 kind 分支：物理同页、逻辑独立页 | 完整 |
| 看TDEE报告 | `templates\health_report.html`（`kind=tdee`） | 同上 | 完整（但仅 4 张 KPI，无图无表） |
| 看BMR报告 | `templates\health_report.html`（`kind=bmr`） | 同上 | 完整（含「低于 BMR 天数」危险信号 ＋ 危险日期表） |
| 看蛋白报告 | `templates\health_report.html`（`kind=protein`，老词全文「看蛋白质摄入报告」） | 同上 | 完整（含 `markLine` 目标线） |
| 看水分报告 | `templates\health_report.html`（`kind=water`） | 同上 | 完整（含 `markLine` 目标线） |
| 看综合评分报告 | `templates\health_report.html`（`kind=score`，老词全文「看综合评分」） | 同上 | 完整（gauge 仪表条 ＋ 分项三色条表） |
| 看健康趋势报告 | `templates\health_report.html`（`kind=trend`，老词全文「看健康趋势」） | 同上 | 完整（前段/后段均分 ＋ 拐点数） |
| 看健康报告（含对比） | `templates\health_report.html`：`kind=full`（看健康报告 11 窗口变体）＋ `kind=compare`（含对比） | 同一模板两个 kind | 完整（full 五维归一化走势；compare 逐项 Δ 表） |

补充事实：另有 `templates\health_dashboard.html`（`render_health_dashboard.py`）在 `SKILL.md` 845 行承接唤醒词「**查**健康报告」（分析分类），与上表「**看**健康报告」是两条不同唤醒词、两个不同件。二者 `h1` 都自称健康／综合健康报告，易混。

**结论一句话**：8 条报告唤醒词**没有 8 个模板**，而是**1 个多态模板的 8 个 `kind` 分支**；老侧已有 9 个 `kind`（多出 `full`）。

## 老侧优秀点（融合候选）

1. **单模板多态分派（kind switch）** —— 出处 `health_report.html:128-131,192-304` ＋ `render_analysis.py:297-455`。理由：19 场景零模板膨胀，KPI／图表／表格／错误分支／样式五套原语只写一份，新增一种报告只加一个分支。对应新页面：8 张报告页的共用底座。
2. **置信度分级诊断卡（高/中/低 ＋ 证据 ＋ 行动建议）** —— 出处 `anomaly_report.html:30-33,96-104`。理由：把 AI 结论拆成「结论／置信／证据／动作」四段，可读、可争辩、可复制；同页还有 `#copyDxBtn` 一键转编号纯文本。对应新页面：综合评分报告、健康趋势报告、健康报告（含对比）。
3. **显式降级横幅（degrade）** —— 出处 `anomaly_report.html:34,62,89-92`（`D.degraded` ＋ `D.degrade_msg`，文案「⚠️ 数据不足,已降级」）。理由：数据不足时不输出空白或假数据，而是明说降级。对应新页面：全部 8 页的数据不足路径。
4. **`markLine` 目标线 ＋ 达标三件套** —— 出处 `health_report.html:241,256`（蛋白／水分折线画目标值）＋ `229-258`（日均／目标／达标天数／达标率 四 KPI）。理由：把「目标」从数值变成图形，一眼可判。对应新页面：蛋白报告、水分报告，可推广到 TDEE／BMR。
5. **BMR 危险信号段** —— 出处 `health_report.html:216-228`：`under_bmr_days` 计数 ≥3 触发 `⚠️ 连续多日低于 BMR`，并列出「低于 BMR 的日期」表。理由：把生理风险做成显式告警而非埋进数字；族内唯一的安全护栏。对应新页面：BMR 报告、综合评分报告（作为扣分项）。
6. **二段复制（摘要指令 vs 完整报告）** —— 出处 `contraindication_report.html:352-354,605-613`（`copyModify()`／`copyFull()` 两个出口）＋ `337`（`clearAll()`）。理由：一份内容两种粒度，喂 AI 时按需取，避免把整页倒给模型。对应新页面：8 页统一 footer。
7. **「复制回 AI」闭环块** —— 出处 `health_dashboard.html:118-125,183`（`copy-section` ＋ `pre` ＋ `.btn.copied` 绿底反馈）。理由：报告页不是终点，复制文本直接喂下一轮规划，形成读→改→回写闭环。对应新页面：8 页 footer 统一动作条。
8. **移动端表格降级方案** —— 出处 `meal_distribution.html:70-81`（`tr::before` 左侧 3px 强调条、逐 `td` 重排、隐藏次要列）＋ `goal_progress.html:87`（用 `:has()` 按末列数自适应列宽）＋ 多处 `table-wrap` 惯性滚动。理由：窄屏不靠横滚硬撑，而是改结构；`goal_progress` 的 `:has()` 写法最省代码。对应新页面：全 8 页表格段。
9. **目标线 vs 实际线双线图 ＋ 暂停横幅** —— 出处 `goal_progress.html:57-67`（暂停仅提示、数据照常 ＋ `btn-restart` 胶囊）。理由：状态变化（暂停）不改变数据语义，这种「提示与数据解耦」值得学。对应新页面：目标进度、健康趋势。
10. **共享注入契约** —— 出处 `health_report.html:4,61,312-313` ＋ `_base_render.py:28,39-75`：模板只声明 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CHARTS-HELPERS-->` 占位与 `#actionbar-zone`，公共层 `inject_base()` 填；模板声明了 `CHARTS-HELPERS` 但公共层缺 `charts.js` 时**报错而非静默**（65 行）。理由：契约显式、缺口可见。对应新页面：8 页全部。
11. **动作条走共享层、模板零按钮代码** —— 出处 `公共组件\assets\base.js:301-326`（`actionBar(p, extra?, opts?)`，定义在 `SKILLS\公共组件\` 而非技能内）＋ 调用点为每页一行 `#actionbar-zone` 注入脚本（如 `health_report.html:312-313`）。契约：渲染 `.hm-actions`，内含 ① `p.data.scene.buttons` 逐条场景按钮〔`{label,text,kind}`〕，② 固定「复制数据」ghost → `copyText(buildDataText(p))`，③ 固定「复制日志」ghost → `copyText(buildLogText(p))`，④ `opts.preview` 时额外渲染复制预览浮层（`__hmCopyData`／`__hmCopyLog` ＋ 确认复制）。理由：报告页的复制能力**不由模板承担**，模板只留一个空 div；新增一页复制零成本。对应新页面：8 页共用此契约，避免每页各写一套复制。
12. **收窄事实（供新侧决策）**：`_base_render.py:169-173` 的 `envelope()` 把 `data["scene"]["buttons"]` **写死为空列表** `[]`，且技能侧调用 `render_template()` 时未传 extra 按钮。因此报告族 8 页当前在 `actionBar` 上**只出「复制数据」「复制日志」两个 ghost 按钮，无场景按钮**。这意味着老侧报告页的「下一步动作」引导是**空的** —— 新侧若要「复制摘要／复制完整报告／降级说明」三档动作，属**新增契约**（需给 `scene.buttons` 传值或给 `actionBar` 传 `extra`），不是继承。
13. **语义 CSS 变量分层** —— 出处 `contraindication_report.html:220-250`（`--ink/--line/--shadow/--r` 全变量化）vs 族标准集（`--fg/--border`）。理由：两套命名并存说明老侧自己在演进，新侧应统一为一套（建议采 `--ink/--line` 系，因它连圆角都变量化）。对应新页面：8 页统一样式底座。

## 融合建议草案

**核心取舍（裁决 3 · 定论）：命令层 8 条独立、渲染层 1 个多态底座。** 即「1 个多态底座 ＋ 8 个 `kind` 入口」，**非** 8 张独立页。

定论理由：新侧票面**明令**「一词一条命令、不向 `calorie.view.health` 塞形态参数」⇒ 命令层**必须** 8 条独立；而渲染层若铺 8 张独立页，会把同一套 KPI 卡／折线／表格／降级／复制原语复制 8 遍，违反本仓「概念唯一」「接口小里面厚」两条铁律。用户感知是 8 张页、工程上是 1 个底座，两者不矛盾。

支撑证据三条：(1) 老侧已用 19 场景证明该形状可行，且 `render_analysis.py` 单命令 `--view report --kind K` 即可分派；(2) 8 张独立页会复制同一套原语 8 遍，任何一次样式或图表契约改动要改 8 处，漂移风险线性增长；(3) 8 条唤醒词在命令层仍是 8 条独立命令、独立唤醒词、独立场景号。

**判定线（采纳 300 行）**：单页体量 < 300 行 CSS/JS 差异就合，超过再拆。若新侧要求「综合评分报告」独立主题（如仪表盘视觉）或「健康报告（含对比）」体量显著更大，可让底座允许 `kind` 级局部覆盖，而非拆件。

**先验顺序（按票面）**：先跑通「**看BMI报告**」这一 `kind`（它同时具备折线 ＋ 里程碑 ＋ 分类阈值三段，是最好的形状试验田），验证底座契约后再铺其余 7 条。

1. **共同底座**：老侧拿 `health_report.html` 的 `full`／`single` 双 block 结构 ＋ `titles[kind]` 标题表 ＋ KPI/图表/表格三原语 ＋ `errorReceipt` 兜底（125 行）；新侧拿命令登记与分派（8 条独立唤醒词）。合成：一个新模板 `health_report` 接受 8 个 `kind`，命令层 8 条各自映射。
2. **BMI 报告**：老侧拿 4 张 KPI（当前 BMI／分类／身高／采样点）＋ 历史轨迹折线 ＋「分类里程碑」（`from → to`）；新侧拿体重底座与档案身高来源。合成：KPI 顶栏 ＋ BMI 折线 ＋ 分类分档色带 ＋ 里程碑流水。老侧分类阈值文案「偏瘦<18.5 正常<24.9 超重<28 肥胖≥28」直接搬。
3. **TDEE 报告**：老侧拿 4 张 KPI（TDEE／日均摄入／静态缺口／计算假设 `BMR × 活动系数`）与 `Mifflin-St Jeor` 口径；新侧补图——老侧此处**无图**，是明确缺口。合成：KPI ＋「TDEE 随体重/活动系数变化」曲线。
4. **BMR 报告**：老侧拿危险信号段（`under_bmr_days` ≥3 告警 ＋ 危险日期表）与「TDEE ÷ 系数」反推口径；新侧补 BMR 曲线。合成：BMR/TDEE 双值 KPI ＋ 危险信号段（原样搬）＋ 低摄入日期表。
5. **蛋白报告 ＋ 水分报告**：老侧拿 `markLine` 目标线折线 ＋「日均／目标／达标天数／达标率」四件套；新侧拿目标管理真实目标值（`p_goal`／`daily_goal` 表）。合成：两页同构，抽出「目标达成页」模板，只换单位与目标源。
6. **综合评分报告**：老侧拿 `gauge` 三色渐变仪表条 ＋ 分项分数表（每项带三色条）＋「最低分项」高亮（259-269）；新侧拿评分模型分项定义。合成：仪表条 ＋ 分项条表；建议把老侧 `items` 六维（饮食/运动/体重/饮水/体脂/围度）显式化为可配置项。
7. **健康趋势报告**：老侧拿「前段均分／后段均分／拐点数 ＋ 上升/下降/平稳」判据（280-293），这套「前后段对比」极省算力，建议原样搬；新侧拿趋势算法底座。合成：方向徽章 ＋ 前后段 KPI ＋ 拐点标注折线。
8. **健康报告（含对比）**：老侧拿 `full` 的五维归一化走势 ＋ 异常天标注 ＋ 建议段（137-189），以及 `compare` 的逐项 Δ 表（方向着色，302 行）；新侧拿对比窗口参数化。合成：一页上半「五维走势」、下半「逐项 Δ 对比表」，两段共享窗口选择器。**注意**：老侧是 `full`／`compare` 两个独立 `kind`，融合后可考虑并为一页两段。
9. **数据不足与降级**：8 页统一走 `anomaly_report.html` 的 `degrade` 横幅（含 `degrade_msg`）＋ None 值走 `charts` 的 `connectNulls`；HTML 层兜底沿用 `errorReceipt`。
10. **动作条**：8 页统一 footer ＝ 「复制摘要」（老侧 `copyModify` 粒度）＋「复制完整报告」（老侧 `copyFull` 粒度）＋（数据不足时）「降级说明」，落在共享 `#actionbar-zone`。
11. **样式底座**：统一采 `contraindication_report.html` 的语义命名（`--ink/--ink2/--ink3/--line/--r`）而非 `--fg/--border`，因前者连圆角与阴影都变量化、扩展性更好；族内其余 10 件保持现状不动，迁移随新页落地。

## 裁决记录

四条裁决由编排侧下达，逐条记录落定结果与对文档的影响。

| 编号 | 议题 | 裁决 | 对本文档的影响 |
| --- | --- | --- | --- |
| 1 | 「查健康报告」（`health_dashboard.html`）vs「看健康报告」（`health_report.html`）双承担件 | **采纳「对齐 A2」**：#384 的「看健康报告」对齐 `health_report.html`（`kind=full`／`compare`）。理由：词面与新侧冻结表一致（order71-78 全是「看X报告」），且它是 A2 十九场景正主。`health_dashboard.html` 降为**融合素材**，取其两件独有资产：「今日该做什么」动作列表 ＋「复制回 AI」块 | 映射表「看健康报告（含对比）」一行维持指向 `health_report.html`；`health_dashboard.html` 由「潜在承担者」改记「邻近族融合素材」。两件同名属历史命名撞车，记录在案 |
| 2 | `templates\` 计数口径 | **只计 `*.html`，排除 `.bak`** | 「范围与计数」补写死口径：73 ＋ 2 ＋ 2 ＋ 2 ＝ **79**；`help_center_v2_4_12.html.bak` 排除并注明；`.scratch\`（897）与 `tests\`（49）不计 |
| 3 | #384 形状：8 张独立页 vs 1 页多形态 | **命令层 8 条独立、渲染层 1 个多态底座**。理由：新侧票面明令「一词一条命令、不向 `calorie.view.health` 塞形态参数」⇒ 命令层必须 8 条；渲染层若铺 8 张独立页，会把同一套 KPI 卡／折线／表格／降级／复制原语复制 8 遍，违反本仓「概念唯一」「接口小里面厚」两条铁律。用户感知是 8 张页、工程上是 1 个底座，两者不矛盾。**判定线采纳 300 行**：单页差异 < 300 行 CSS/JS 就合，超过再拆。**先验顺序按票面＝先跑通「看BMI报告」这一 kind，再铺其余 7 条** | 「融合建议草案」首条由「倾向」升为「定论」，并补先验顺序 |
| 4 | 图表缺口定性 | 老侧「无双轴独立刻度、五维各维独立 min-max 归一化到 0-100 共享域」「`six_factors` Y 轴刻度文字缺失」记为**已知老侧缺陷，不是可继承的优秀点** | 新增「已知老侧缺口（新侧必须重决策）」一节，给 2-3 个候选作图方案及各自代价；「老侧优秀点」清单**不收录**该归一化做法 |

补充定性（同裁决 4 一并落定）：`contraindication_report.html` 与其余 7 件（`nutrition_analysis`／`nutrition_detail`／`nutrition_ratio`／`six_factors`／`goal_progress`／`diet_overview`／`meal_distribution`，及素材件 `health_dashboard`）作**邻近族**，**只作融合素材**，**不在 #384 范围**。

## 已知老侧缺口（新侧必须重决策）

以下为老侧自述缺陷，**不进入「老侧优秀点」清单**，新侧须独立重决策。

### 缺口 1：五维多序列折线无双轴独立刻度（`health_report.html` `kind=full`）

事实：`health_report.html:141-142` 注释自述 —— 「#317 迁 Base charts.line 多序列: 各维度独立 min-max → 归一化共享 0-100 域近似（charts.line 无双轴独立刻度 — 记偏离）」。实现见 151-172 行：对 `摄入`／`运动`／`体重`／`饮水`／`缺口` 逐字段各取自身 `min`/`max`，线性压到 0-100 后叠画在同一 Y 轴（174-181 行 `yMin:0, yMax:100`）。

后果：Y 轴标注的是归一化分值而非真实量值（卡／kg／ml），**跨维度不可比、只可比形状**；同一图上「摄入上升」与「体重上升」视觉上无从区分，单位在图上是假的。

### 缺口 2：`charts.line` 缺 Y 轴刻度文字（`six_factors.html`）

事实：`six_factors.html:110-111` 注释 —— 「#317 迁 Base charts.line 多序列: 各指标独立 min-max 归一化 → 共享 0-100 域近似（charts.line 无双轴独立刻度; Y 轴刻度文字缺失 — 均记偏离）」。同一缺口在 `nutrition_analysis.html:188` 复现。

后果：图可读性再降一级 —— 连归一化分值都不标。三处同源，属**公共层 `charts.js` 的能力缺口**，不在报告族模板内可单独修。

### 缺口 3（衍生边界 hack）：恒定值归一化给 50

事实：`health_report.html:157-160` —— 当某序列 `mx === mn`（窗口内数据恒定）时，归一化给固定值 50「居中水平线」，注释自述是为避免「全 0 贴底视觉『线消失』」。

后果：恒定值被画成中位水平线，与真实中位数据**视觉同形**，不可区分；`zeroFill` 序列另有 `mx===0` 例外分支（160 行），边界条件已分叉两次。新侧换图库或改数据契约后应整体重估，不建议平移。

### 新侧候选作图方案（三选，含代价）

**方案 A · 小倍数图（small multiples）—— 建议采纳**

每维度各一张独立迷你折线，各自真实 Y 轴与单位，纵向堆叠；公共层复用现有 `charts.line` 单序列调用，不需改公共层。

- 代价：垂直空间约为原单图的 5 倍（5 维）；首屏需滚动。移动端 5 图堆叠较长，需配合折叠或「展开全部」。
- 收益：数值真实、单位正确、单维可独立标注异常与目标线（`markLine`）；无障碍与无障碍读屏友好；每图可独立降级。
- 改动面：模板排版层，零公共层改动。

**方案 B · 真多轴折线（扩展 `charts.line` 支持 `yAxis: [...]`）**

- 代价：**须改公共层 `assets\charts.js`**，跨全部技能生效，按本仓纪律需立 ISSUE 并走公共层审查；且 5 轴叠画在视觉上几乎不可读，实践上最多只能上 2 轴（如「体重 + 摄入」）。
- 收益：单图信息密度最高，适合固定 2 维的强相关对比（缺口 ↔ 体重）。
- 结论：**不建议为五维走势做**；可留作「对比两维」独立需求的后续票。

**方案 C · 保留归一化形状，但诚实化标注（最小改动）**

保留老侧叠线，Y 轴改为不标数值（或标「相对水平」），每序列图例挂真实单位，tooltip 出原始值，并在图上明写「本图仅示走势形状，不代表量值可比」。

- 代价：最小，仅模板与 tooltip 层改动，零公共层改动；但「跨维度可比」的错觉仍在，靠文案免责，属权宜。
- 收益：首屏紧凑，保住「一屏看五维」的老侧核心体验。
- 结论：可作方案 A 的**降级路径**（窄屏或数据不足时回退），或作过渡实现。

**倾向**：主路走 **A（小倍数）**，把 **C 作为窄屏/降级路径**；**B 不为五维走势做**，仅在「对比两维」类独立需求出现时另立票。此倾向与裁决 4「老侧归一化不是优秀点」一致 —— 不继承该做法，仅在降级路径上以「诚实标注」形式有限复用。

## 存疑

1. ~~**`templates\` 计数**~~ —— **已由裁决 2 闭合**：只计 `*.html`，排除 `.bak`，口径已写入「范围与计数」。
2. ~~**「查健康报告」vs「看健康报告」双承担件**~~ —— **已由裁决 1 闭合**：新侧「看健康报告」对齐 A2＝`health_report.html`；`health_dashboard.html` 作融合素材并入。两件同名属历史命名撞车，记录在案。详见「裁决记录」。
3. **`contraindication_report.html` 与本族关系（范围外，记录在案）**：它是**健身计划禁忌扫描**（`SUMMARY.scanned_sessions`／`movements`），属训练计划族，与 8 条报告唤醒词**无任何对应**，**不在 #384 范围**。我按分派仍盘点，但融合建议中仅取其交互与样式资产，**不取其业务**。
4. **不属于 8 条唤醒词的 7 件**：`health_dashboard`、`nutrition_analysis`、`nutrition_detail`、`nutrition_ratio`、`six_factors`、`goal_progress`、`diet_overview`、`meal_distribution` 均**不在** #384 的 8 条内（`six_factors` 对应「看每日 6 因素综合」，`diet_overview` 对应「看饮食总览」，`meal_distribution` 对应「看全部餐别分布」，`nutrition_*` 对应营养结构族，`goal_progress` 对应「看今日目标进度」）。它们是**邻近族**，只作融合素材来源。
5. **图表能力缺口（老侧自述）**：`health_report.html:141-142` 与 `nutrition_analysis.html:188`、`six_factors.html:110-111` 三处注释均记：`charts.line` **无双轴独立刻度**，五维走势只能用「各维度独立 min-max → 归一化共享 0-100 域」近似，且 `six_factors` 另记「Y 轴刻度文字缺失」。这是老侧已知偏离，新侧作图须重新决策（真双轴 or 小倍数图）。
6. **恒定值归一化补丁**：`health_report.html:157-160` 在 `mx === mn` 时给 50 以避免线贴底。属边界 hack，新侧若换图库可重估。
7. **TDEE 报告无图**：老侧 TDEE 分支（210-215）只输出 4 张 KPI，无折线无表格，是 8 条中**唯一没有可视化**的一条。新侧若要补齐，属新增而非融合。
8. **两套 CSS 命名并存**：`contraindication_report.html` 用 `--ink/--line/--r`，其余 10 件用 `--fg/--border`。老侧未统一，新侧统一时需确认是否有意为之（禁忌扫描页可能是更新的设计线）。
9. ~~**未细读**~~ —— **已由收口要求闭合**：因 `contraindication_report.html` 判定不在 #384 范围，其 `part-group` 分组渲染与 `pills` 筛选的交互级精读**按令省略**，不再花上下文。若日后需要该页交互复刻，需另开票补读。
