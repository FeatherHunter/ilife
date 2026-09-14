# t161 老技能 HTML 清单 · 预测族与缺口族（MAP #161 · 场景10 拆B）

盘查员 A 交付物。只读老技能目录 `D:\2Study\StudyNotes\SKILLS\卡路里`，只写本文件。

## 范围与计数

口径（沿用已测事实，未重扫）：

| 位置 | 件数 | 状态 |
| --- | --- | --- |
| `<root>\templates\` | 73 | 真模板，本清单主范围 |
| `<root>\templates\临时样例\` | 2 | 真模板（两件视觉标杆实际住在这里，不在 templates 根） |
| `<root>\calorie_html\` | 2 | 真模板 |
| `<root>\html\` | 2 | 真模板 |
| 合计真模板 | **79** | |
| `<root>\.scratch\` | 897 | 历史垃圾，**忽略**，不读 |
| `<root>\tests\` | — | 用例产物（`_plan_*.html`、`test_*.py`），**忽略** |

清点核对（本次实测，`-File` 计数）：

| 目录 | 目录内文件总数 | 其中 `*.html` |
| --- | --- | --- |
| `templates\` | 74 | **73**（多出的 1 件是 `help_center_v2_4_12.html.bak`，非模板） |
| `templates\临时样例\` | 2 | 2 |
| `calorie_html\` | 3 | **2**（多出的 1 件非 html） |
| `html\` | 2 | 2 |
| `templates\cropperjs\` | 2 | 0（`cropper.min.css` + `cropper.min.js`，第三方库，非模板） |

`73 + 2 + 2 + 2 = 79`，与任务书口径吻合。**`.bak` 与 `cropperjs\` 不计入 79。**

纠正一处路径误差：任务书把两件视觉标杆写在 `<root>\templates\` 下，实测在
`<root>\templates\临时样例\` 下（`统一主面板_视觉标杆.html` 23444B、
`沉浸主面板_视觉标杆v2.html` 29644B）。字节数与任务书一致，是同两件实物。

本清单逐件覆盖 11 件：预测族 1 件、缺口族 1 件、组合分析 1 件、过程型 1 件、趋势族 2 件、
复盘 1 件、视觉标杆 2 件、设计审查报告 1 件、调度参照 1 件。

## 逐件要点

贯穿三代的共同外形（先说清，逐件不再重复）：

- 骨架统一为 `meta-bar（左=日期区间+天数 / 右=type-badge 类型徽标）→ h1 + .sub → kpi-grid(4 格) → section 卡（h2 + #chart + .legend）→ .insight 一句话洞察 → .footer srcLine`。
- 三代差异只在"壳"：
  - 第 3 代（最新）：`<style><!--SHARED-CSS--></style>` 占位 + `<script id="payload">` / `<!--SHARED-HELPERS-->` / `<!--CHARTS-HELPERS-->` 三个注入位 + `actionbar-zone` 注入 `window.actionBar`；token 用 `--fg/--fg2/--fg3/--soft`；主色 `--accent:#0071e3`；`max-width:920px`。
  - 第 2 代：token 用 `--ink/--ink2/--ink3/--lineS`；主色 `#007aff`；`max-width:960px/1040px`；无注入位。
  - 第 1 代：无 `<style>` 段外壳约定，内联样式重，主色混杂。
- 图表范式：**无 Chart.js / ECharts 重库**，全部依靠 `<!--CHARTS-HELPERS-->` 注入的 `window.charts.line(el, items, opts)` 手写 SVG，opts 支持 `{height, labels, format, tooltip, markLine, series:[{name,items,dashed}], area}`。
- 数据范式：`window.__P__` 从 `#payload` JSON 解析；`status !== 'ok'` 直接 `document.body.innerHTML = window.errorReceipt({message:...})` 兜底成回执页。

### 1. `templates\predict_report.html`（9783B）★core → 服务 #383 预测模拟

- 标题：`卡路里 · 预测模拟`。
- 章节骨架：`meta-bar` → `h1#title` → `.sub#sub` → `.degrade`（降级横幅，默认隐藏）→ `#content`【`kpi-grid#kpis`；`预测/模拟轨迹`（#chart + 单行 legend）；`假设说明`（`.assume#assume`）】→ `.insight#insight` → `.footer`（srcLine）。
- **一件覆盖 8 种 kind**（本件最大价值：一个模板消化整族预测请求）。逐 kind 的 KPI 四格：

| kind | KPI 四格（label／value／extra） |
| --- | --- |
| `weight_forecast` | 当前体重／当前速率(kg/周，线性外推)／预测终点(值+日期)／置信带(lo~hi，95%) |
| `weight_target` | 当前体重／当前速率／预计达成(eta，N 天后)／可行性(0.5-1.0 kg/周) |
| `weight_sim_cut` | 当前体重／每天多减(-X 卡，新缺口)／预期速率(±kg/周，✅健康)／90 天预期 |
| `weight_sim_target` | 当前体重／目标减重(-X kg / N 天，每周 X kg)／所需缺口(卡/天，=7700 卡/kg)／可行性 |
| `calorie_forecast` | 当前日均(日变化 X 卡/天)／目标(daily_goal 表)／预测终点／偏离(vs 目标) |
| `calorie_goal` | 日均摄入／目标／差距／达成状态(±10% 判定) |
| `calorie_deficit` | 日均缺口／每周预估(kg，7700 卡/kg)／健康范围(+300~+500 卡/天)／判定 |
| `calorie_stability` | 日均摄入／波动 σ(σ>300 = 不稳定)／稳定性／预测可信度 |

- 数据字段：`title, sub→rate_note, assumption, insight`；时间轴 `start, end, days`；降级 `degraded, degrade_msg`；轨迹 `forecast.points[] = {date, value, lo, hi}`；体重族 `current, rate_per_week, rate_note`；目标族 `eta, days_left, feasible`；模拟切片 `cut_kcal, new_deficit, weekly_loss`；模拟目标 `target_loss, days_target, weekly_rate, needed_deficit`；热量族 `current, daily_rate, goal`；目标族 `avg, gap, on_target`；缺口族 `avg_deficit, weekly_loss`；稳定族 `avg, sigma, stable`。
- 图表：单系列折线（`pts.map(p => ({label: p.date.slice(5), value: p.value}))`），`{height:260, labels:'select', format: v=>Number(v).toFixed(1), tooltip:true}`；点数 <2 时渲染灰字占位"预测点数不足"。
- 交互：降级横幅（`degraded` 时显示并隐藏 `#content` 与 `#insight`，只留一句原因）；`actionbar-zone` 注入按钮条；底部 srcLine 带出处命令 `render_analysis.py --view predict`。
- CSS 组织：`<style>` 段 8-51 行，`:root` 12 个变量（fg/fg2/fg3/bg/card/border/accent/good/warn/bad/soft），`.kpi-grid` 四列网格、`.kpi/.section/.legend/.assume/.insight/.degrade/.meta-bar/.btn`，`@media(max-width:640px)` 把 KPI 改两列。
- **最关键的一行注释（第 113 行）**：`// #317 迁 Base charts.line: 置信带(hi/lo band)无接口 → 只画预测值主线的最近近似(记偏离)`。
  KPI 里**仍然显示** lo~hi 置信带数字，但**图上画不出来**——这是老侧遗留的"模型有、图没有"的能力缺口，是新模板可以直接超车的地方。

### 2. `templates\calorie_deficit.html`（10631B）★core → 服务 #385 热量缺口

- 标题：`卡路里 · 热量缺口`。
- 章节骨架：`meta-bar`（badge=报告型 · 摄入 vs 消耗）→ `h1>⚖️ 热量缺口` → `kpi-grid` → section`每日摄入 vs 消耗`（#chart + 三行 legend）→ section`缺口明细`（`.table-wrap>table`：#table + `tfoot#tfoot`）→ `.footer`。
- 数据字段：payload 形状为 `D.data = {summary, series, target, meta}`，且有 `D.status !== 'ok'` 兜底。
  - `summary`: `avg_intake, avg_burn, avg_exercise_burn, avg_deficit, predicted_loss_kg, weekly_deficit, trend('loss'|'gain'|持平)`
  - `series[]`: `{date, intake, burn, deficit}`
  - `target`: `{intake, tdee, weekly_deficit_per_day}`（常量 7700 卡/kg）
- 图表：**双系列折线 + markLine**——`[{name:'摄入', items:[…intake]}, {name:'消耗', items:[…burn], dashed:true}]`，共享 Y 域，`markLine:{value: target.intake, label:'摄入目标 X'}`。虚线=消耗，实线=摄入，目标用基准横线。
- 交互：`dailyTable` 每行右侧 `window.statusBadge(...)` 给「✓ 达标 / ⚠ 偏低」；表格底部 `tfoot` 汇总行（总摄入/总消耗/总缺口，缺口正负用 `.deficit-pos/.deficit-neg` 双色）；小屏 `.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}` 横滚。
- CSS 组织：比预测页多两个语义色 `--intake:#5856d6`（紫）、`--burn:#34c759`（绿），让"摄入 vs 消耗"有稳定专色；`.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}` 数字右对齐等宽；`.deficit-pos{--good}/.deficit-neg{--bad}/.deficit-zero{--fg3}` 三态。
- **本件是缺口页最直的近亲**：KPI 名、表格列、判定阈值（7700 卡/kg、每周口径）都可以整段搬。

### 3. `templates\combined_analysis.html`（12726B）★core → 场景10 分析主模板 → 服务 #384 报告

- 标题：`卡路里 · 组合分析`。
- 章节骨架：`meta-bar`（badge=组合分析 · 双轴+相关）→ `h1#title` → `.sub` → `kpi-grid`（**相关系数 r 排第一格**／A 均值／B 均值／对齐样本 N）→ section`双轴走势`（#dualChart + 双行 legend）→ section`相关性与回归`（#scatterChart）→ section`延迟相关性(前 N 天 B 值 vs 当日 A 值)`（#lagTable）→ section`分层对比`（#stratTable，列=分组/天数/A 净变化/B 均值）→ `.insight`。
- 数据字段：payload 形状为**直接展开**（非 `D.data`）：`labels:{a,b}, pair, start, end, days, window, insight`；`correlation:{r,n}, regression:{slope,intercept}`；`a_avg, a_delta, a_count, b_avg, b_delta, b_count`；`line[], scatter[], lag[], strat{}, over_limit_days[], deficit_buckets[]`。
- 图表：两处 `window.charts.line` 调用。`dualChart` 用"各轴独立 min-max → 归一化共享 0-100 域"来**近似双轴**；`scatterChart` 承载散点 + 回归线（读 `D.regression.slope/intercept`，叠 `correlation.r`）。
- 交互：两个 section 带 `id`（`lagSection`/`stratSection`）便于按数据有无隐藏；`actionbar-zone`；srcLine 带 `render_analysis.py --view combo`。
- CSS 组织：与预测页同源，多一个 `--b:#ff9500`（B 轴专色），A 轴用 `--accent`。
- **两处"记偏离"注释（第 140、144 行）**：`// #317 迁 Base charts.line 双系列: 各轴独立 min-max → 归一化共享 0-100 域近似 (charts.line 无双轴独立刻度 — 记偏离)`。
  → 老侧**想要真双轴但图表层给不了**，只能归一化。这是新模板第二个可超车点。

### 4. `templates\process_progress.html`（18835B）★core → 过程型 HTML 参照

- 标题：`流程进度 · 卡路里`（注意本件首行注释写明用途：`Apple 设计语言 · G4 4 步流程进度可视化 - 过程型 HTML（AI 协同 · 原则 10 · 复制"从哪步继续" prompt）- 5 段式：Hero · 进度条 · 4 步详情 · 复制区`）。
- 章节骨架：`header.hero`（`eyebrow#eyebrow` + `h1#title` + `.sub#subtitle` + `pills#pills`）→ section`整体进度`（`.progress-info`(rate + time) + `.progress-bar#progressBar` + `.progress-legend#progressLegend`）→ section`步骤详情`（`.steps#steps`）→ `section.copy-section`【h2`继续操作` + 说明三行 + `.btn-row` 三按钮 + `.copy-preview#copyPreview`】→ `footer` → `a#backTop` 回到顶部。
- 数据字段：`DATA.data.summary` / `DATA.data.steps`，字段 `process_name, total_steps, completed_steps, failed_steps, started_at, finished_at`；每步 `status('done'|'failed'|'pending')`。
- 图表：**无图表**，进度可视化靠 CSS 四段进度条（`.progress-seg.done/.failed/.pending`，pending 用 `::before` 画斜线纹）+ 图例计数。
- 交互（**本件最强项**）：三个复制按钮 `copyContinue()`／`copyAdopt()`／`copyFullLog()` → `window.copyText(text, btnId, 成功后文案)`；按钮文案随状态动态改（失败时变 `↻ 复制继续指令(从失败步骤 · N)`）；复制内容是从 STEPS 拼出的**完整自然语言 prompt**（含"已完成 2/4 步""失败 1 步"等），而非裸摘要；`.copy-preview` 先给预览再复制；顶部 `#backTop` 回顶。
- CSS 组织：token 最完整的一件——`--bg/--bg-soft/--bg-section/--card/--ink/--ink2/--ink3/--line/--lineS/--accent/--accent-soft/--green(-soft)/--orange(-soft)/--red(-soft)/--gray(-soft)/--shadow-sm/--shadow`，每个语义色都配对 `-soft` 底；`.steps` 用 `counter-reset:step` 做序号。
- **结论：这是"过程型页面"的唯一实物参照**，报告/预测页若需要"下一步怎么做"的出口，照它抄。

### 5. `templates\calorie_trend.html`（10254B）→ 服务 #383/#384

- 标题：`卡路里 · 热量趋势`；badge 自称 `报告型 · 7 dim`。
- 章节骨架：`meta-bar` → `h1>🔥 热量趋势`（**emoji 进标题**）→ `kpi-grid`（日均热量／7 天变化／工作日 vs 周末／合规率）→ section`每日热量 (含目标线)`（#chart + 三行 legend：日热量／目标／超标警告）→ section`每日明细`（表格列=日期/类型/实际/目标/偏差/状态）→ `.footer`。
- 数据字段：`D.data = {summary, series, meta}`；`summary`: `avg, target, trend('down'|'up'|持平), trend_value, start_avg, end_avg, weekend_diff, weekday_avg, weekend_avg, compliance_rate, compliant_days`；`series[]`: `{date, calorie}`。
- 图表：单系列折线 + `markLine:{value: summary.target, label:'目标 X'}` + area 填充（注释：`单系列 + 目标线(markLine) + area`）。
- 交互：KPI 值**按语义染色**（趋势为正染 `--bad`、为负染 `--good`；日均偏差 >目标 5% 染 `--bad`）；表格行按偏差分档给 `statusBadge`：◐ 进行中／✗ 严重超／⚠ 超（阈值 ±5%、+10%）+ `--good`；超标日在 legend 区用 `warnSpan` 汇总（`⚠ MM-DD 严重超标 +X%(N 卡)`）。
- CSS 组织：`--accent:#0071e3`，`td.num,th.num{font-variant-numeric:tabular-nums}`；`.section h2` 18px（本族最大）。
- 可搬家产出：**合规率 / 工作日 vs 周末 / 偏差分档** 三件分析指标，预测页与缺口页都能直接用。

### 6. `templates\long_trend.html`（8333B）→ 服务 #376 拆A对照

- 标题：`卡路里 · 整体趋势`。
- 章节骨架：`meta-bar` → `h1#title`（渲染成 `看整体趋势(<group_label>)`）→ `.sub`（`多指标归一化同图 · <window> 窗口`）→ `kpi-grid`（由 `D.metrics` 动态生成为每指标一格）→ section`多指标同图(归一化 0-100)`（#chart + 动态 legend）→ section`周期对比`（`#periodSection`，默认 `display:none`，有数据才显）→ `.insight` → `.footer`。
- 数据字段：`start, end, days, group_label, window, insight, metrics[], stats{field:{}}, monthly[] | norm[], period_compare`；每 metric `{field,label}`。
- 图表：`window.charts.line`，多序列**共享 0-100 归一化域**（注释：`多序列(共享 Y 域 0-100 归一化天然吻合)`）；事件型指标特判 `EX_FIELDS = ['exercise_kcal','strength_kcal','cardio_kcal']`，缺日补 0（休息日 0 基线），而非断点。legend 颜色按 `colors[j % 6]` 轮转，`<i style="background:...">` 动态填色。
- CSS 组织：与其他同族一致，`:root` 与 calorie_trend 同。
- **与拆A的分工**：本件是"多指标同图"的对照物——拆A 若做趋势，本件给出的是"归一化 + 缺日补 0 + 动态 legend"三件可复用件。

### 7. `templates\review_template.html`（15639B）→ 服务 #384 报告

- 标题：`卡路里复盘报告`（footer 标 `v2 · 数据来源 review_cli.py gen + review_engine.py`）。
- 章节骨架：`header`（`eyebrow` + `h1#hero-title` + `.date-range#date-range`）→ `.kpi-hero#kpi-hero`（**4 卡，非 4 格网格**）→ `#anomaly-section`（h2`⚠️ 异常天` + `#anomaly-list`，**默认隐藏、有数据才显**）→ `.dim-grid#dim-grid`（**8 个 dim 卡**，每卡 `dim-title / metric / desc`，P1 重点额外挂 `dim-tag`）→ `#svg-section`（h3 体重趋势 + `#svg-container` + `.svg-note`）→ `#topfood-section`（h3`🍽️ Top 5 食物` + `.top-list#top-foods`）→ `.copy-section`（h3`📤 复制回 AI（让 AI 帮你解读）` + `pre#copy-text` + `#copy-btn`）。
- 数据字段：KPI hero 4 卡；dim 8 卡各带 `{p1, num, title, metric, desc}`；异常天列表；体重 SVG；Top5 食物（`ul`，非表）；复制摘要 pre。
- 图表：**手写 SVG**（`#svg-container`），非 `charts.line`——第 2 代做法。
- 交互：`copyToAI()` 单按钮把 `pre#copy-text` 内容复制走；异常天 / SVG / Top 食物三块都靠 `style="display:none"` 门控。
- CSS 组织：**全库唯一的 C 系 token**（`--bg:#F2F2F7`、`--fg:#1C1C1E`、`--fg2:#8E8E93`、`--fg3:#C7C7CC`、`--border:rgba(60,60,67,.12)`），且**每个语义色都配 `-soft` 底**：`--green/--green-soft:#E8F5E9`、`--orange/--orange-soft:#FFF3E0`、`--red/--red-soft:#FFEBEE`、`--blue/--blue-soft:#E3F2FD`、`--purple/--purple-soft:#F3E5F5`；`--shadow:0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04)`；`body{max-width:760px}`。
- **设计审查把本件判为 BOTTOM**（`全库唯一 C 系，背景 #F2F2F7 和其他 34 个文件都不同。引入 --purple:#AF52DE 是 Material Design 紫，Apple…`）。所以：**它的"8 dim 结构 + P1 标记 + 异常天门控 + 复制回 AI"值得吸收，它的配色不要吸收。**

### 8. `templates\临时样例\统一主面板_视觉标杆.html`（23444B）★core → 视觉标杆（UI 优秀点主来源）

- 标题：`统一主面板 · 视觉标杆`。
- 章节骨架：`header.hero`（`eyebrow` + `h1>今日概况` + `.sub` + `.status-pill.pending>2 项待办`）→ `.hero-number`（左：`label`/`big`+`unit`/`meta`；右：`.ring` 88×88 SVG 圆环 + `.pct` 中心百分比）→ `.kpi-grid`（每卡 `label`（含 `.icon` + `.badge warn` 百分比）/`main`（`value`+`unit`）/`detail`）→ `.section`「近 7 天热量趋势」（`svg.trend-svg viewBox="0 0 800 180" preserveAspectRatio="none"` + `.trend-stats`/`.trend-stat`）→ `.section`「今日待办」（`.todo-list/.todo-row/.todo-empty`）→ `.section`「最近记录」（`.log-list/.log-row/.log-section/.log-section-title`）→ `.section`「快速记录」（`.field` 表单）→ `.section`「快捷命令」（`.hint` + `.cmd-list/.cmd-row` + 每行 `.copy-mini` + 底部 `.copy-all`）→ `.toast#toast`。
- 数据字段：本件是**静态样张**（无 `#payload`、无 `__P__`），数据硬编码在 HTML 里——它是视觉参照物不是运行时模板。
- 图表：手写 SVG 折线（`viewBox` 0 0 800 180，`preserveAspectRatio="none"` 让它随容器横行拉伸）+ `.trend-stats` 图下数字条。
- 交互（**本件最值钱的交互**）：
  - `copy-mini` 单条复制：`onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')"`，复制的**内容写死在 onclick 里**。
  - `copyAll()` 一键复制全部命令。
  - `showToast('已复制: '+text)` + `.toast` 底部弹出。
  - **按钮回调播放弹簧动画**：`.copy-mini.copied{background:var(--green);animation:copySuccess .45s var(--ease-spring)}`，`@keyframes copySuccess{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}`——复制成功后按钮**弹一下并变绿**，1.2s 后还原文案。
  - `.copy-all{background:var(--ink);color:#fff;border-radius:999px;…}` hover `translateY(-1px)` + `box-shadow:var(--shadow)`。
  - `#backTop` 回顶。
- CSS 组织（**这是全库最完整的一套 token，也是 P0「统一 token」的目标答案**）：
  ```
  --bg/--bg-soft/--bg-section/--card
  --ink/--ink2/--ink3
  --line/--lineS
  --accent:#007aff + --accent-soft
  --green/--orange/--red（各配 -soft）
  --shadow-sm/--shadow/--shadow-lg
  --r-sm:8px / --r:14px / --r-lg:20px          ← 统一圆角梯度
  --ease:cubic-bezier(.4,0,.2,1)
  --ease-spring:cubic-bezier(.34,1.56,.64,1)   ← 弹簧缓动，复制动画的魂
  ```
  还有 `html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}`、`backdrop-filter:saturate(180%) blur(20px)`（+ `-webkit-` 前缀）做毛玻璃浮层，`.wrap{max-width:960px}`；断点 640px→KPI 两列 / toast 安全区适配。

### 9. `templates\临时样例\沉浸主面板_视觉标杆v2.html`（29644B）★core → 视觉标杆 v2

- 标题：`沉浸主面板 · 视觉标杆 v2`。
- 章节骨架：`.hero-dark`（深色 Hero：`h1>2026 年 7 月 29 日` + `.rings`（**三环 SVG 200×200**：外环 Move 粉 r=85、中环 Exercise 绿 r=65、内环 Stand 蓝 r=45，每环"轨道圈 + 进度圈"两层，进度圈用 `stroke-dasharray`+`stroke-dashoffset`+`stroke-linecap:round`，中心 `.rings-center` 大数字 `82%`+`达标`）+ `.rings-legend/.ring-item/.ring-dot` + `.hero-status/.status-chip`）→ `.editorial`（浅色正文区）→ `.edit-section`（`.edit-title` + `.lead-stat` + `.kpi-grid/.kpi`）→ `.trend-block`（`svg.trend-svg viewBox="0 0 1000 220"` + `.trend-caption` + `.trend-legend`）→ `.timeline`（`.tl-row` 三栏 `grid 56px 1fr auto`：`.tl-time/.tl-tag/.tl-val`）→ `.todo-edit/.todo-item` → `.input-block/.field-dark` → `.cmd-edit/.cmd-item` → `.copy-mini`/`.copy-all` → `.toast` → `.transition-band`。
- 数据字段：同为**静态样张**，无 payload。
- 图表：**三环 SVG + 1000×220 趋势 SVG** 全部手写、零库。
- 交互：复制与 toast 与 v1 同款（同 `copySuccess` 弹簧动画、同 `copyCmd/copyAll` 签名）；额外交互在"可编辑"语义上——`.todo-edit`、`.input-block`、`.cmd-edit` 三类**就地编辑区**（同一页既展示又编辑）。
- CSS 组织（**v1 的超集**）：在 v1 全套浅色 token 之上，**再加一整套深色 token**——`--dark:#000000/--dark-2:#1c1c1e/--dark-3:#2c2c2e/--dark-ink:#ffffff/--dark-ink2:rgba(235,235,245,.6)/--dark-ink3:rgba(235,235,245,.3)/--dark-line:rgba(255,255,255,.08)/--dark-lineS:rgba(255,255,255,.04)`；语义色整套替换为 **iOS Dark Mode 版本**：`--accent:#0a84ff`、`--green:#30d158`、`--orange:#ff9f0a`、`--red:#ff453a`，并新增 `--pink:#ff375f`（专供 Move 环）。`--shadow` 与 v1 同参。`.wrap{max-width:1040px;padding:0 0 80px;overflow:hidden}`。
- 断点：768px 级（`.rings{grid-template-columns:1fr}`、`.rings-svg{width:180px}`、`.tl-row{grid-template-columns:56px 1fr auto}`）+ 640px 级（KPI 一列、`.toast{left:12px;right:12px}`）。**双档断点比 v1 单档细**。
- **v1 与 v2 的关系（重要）**：v1=浅色单页 + 完整 token + 复制/Toast；v2=深色 Hero + 三环 + 时间轴 + 就地编辑 + 双档断点，**浅色部分与 v1 逐字一致**（注释自称"保证系统统一"）。所以：**要浅色取 v1 的 token 定义，要视觉冲击取 v2 的 Hero 与环，两者不冲突。**

### 10. `templates\设计审查报告.html`（40574B）→ 只取结论（纪律：不全量读）

核对 35 个文件的审美与可用性报告。要点（均为报告原文结论，非本人判断）：

- **一句话总结**：`每个文件都在"模仿 Apple"，但 35 个文件模仿的是 4 个不同时期的 Apple——有的模仿 iOS HIG，有的模仿 Apple.com 官网，有的误把 Material Design 当 Apple，有的模仿 iOS 通知中心。用户在产品内跳转时，视觉会不断"咯噔"。` 定量结论：`35 个文件，4-5 套命名不一致的设计 token。即使颜色值接近，变量名、阴影参数、字体栈、圆角 token 都不同。这不是"设计系统"，是"设计联邦"。`
- **色板分裂**：主色**四种蓝**、二级灰**三种灰**。
- **三个关键对照对**：① 两个 Dashboard（最该统一却没统一）；② 两个回执（工具感 vs 产品感）；③ 两个向导——**最严重**：`输入框交互逻辑相反。A 系"灰底无边框 → focus 变白加边框"，B 系"白底有边框 → focus 加蓝边加阴影"。用户在同一个产品里填表单，两种输入框交互，这是可用性事故。`
- **TOP 3 最好看**：`help_center.html`(18KB，唯一完整动效体系 = Toast + 弹簧复制 + 三角箭头旋转；三层 `details` 嵌套圆角递减排 8→6→4px；唯一考虑 `env(safe-area-inset-bottom)`；复制按钮 4 状态反馈最完整)、`weight_log_receipt.html`(12KB，64px 大数字 + 绿色 radial 光晕 + SVG 趋势折线 + area fill + 最新点橙色高亮；唯一"数据可视化 + 回执"混合件；移动端 64→38px 退化)、`home_dashboard.html`(21KB，token 体系最完整；KPI+Todo+Logs+Actions 四段式；`.log-row` 用 `grid 44px 1fr auto` 三栏对齐；`#backTop` 毛玻璃浮层；移动端 KPI 保 2 列)。
- **八、已经做对的事（可直接继承的优点）**：① 设计语言大方向正确——90% 文件在 Apple 框架内（系统字体栈、蓝绿橙红四语义色、卡片化、轻阴影、圆角），没走 Material FAB/Drawer，也没走 Ant 密集表格；② **数据可视化有节制——SVG 折线/饼图/ring/heatmap/bar 全手写，零 Chart.js/ECharts 重库**，体积小可控，`today_water` 的 ring + 7 天 bar 是全库最克制有效的可视化；③ **过程型 HTML + 复制 prompt 模式统一**——几乎所有向导/配置类都有 `.prompt-box` + 复制按钮，把 HTML 当"生成 prompt 的可视化编辑器"，产品层面的正确决策；④ 移动端适配覆盖 80%（28/35 有 `@media`，`weight_history` 有 640px + 400px 双断点）；⑤ **`tabular-nums` 普遍使用**——90% 文件数字等宽对齐；⑥ 空状态处理——多数文件有 `.empty`/`.log-empty`，不是白屏而是图标 + 标题 + 说明。
- **九、改进路线图 P0-P3**：
  - **P0（1-2 天）统一设计 token**：抽离 `_tokens.css` 共享文件，强制所有文件 `@import`；统一到 **A 系 `#007aff` + `--ink/--ink2/--ink3` + `--lineS` + 带 SF Pro Display**；删除 C 系（`--purple`/`#F2F2F7`）、删除 D 系（`font-size:13px` + `em/%` 单位）；统一输入框为 A 系（灰底无边框 → focus 变白加边框）。理由：A 系主色是 iOS 官方值，`--ink2:#3c3c43` 对比度更好，`rgba` 边线更柔和，字体栈更准确。
  - **P1（0.5 天）统一 Hero 处理**：选 `home_dashboard` 的"无背景 hero + eyebrow + h1 + sub + status-pill"模式（最克制，不抢内容，移动端无需特殊处理）。**删除所有 `linear-gradient` hero**（`health_dashboard`/`food_ranking`/`exercise_review`/`plan_builder_wizard`/`weight_log_receipt`/`goal_config`）。删除 `plan_builder_wizard:84` 渐变文字。
  - **P1 统一复制按钮**：选 `weight_log_receipt` 的 `.copy-section` 内单按钮 + `.copy-preview` 预览模式；删除 `help_center` summa…（截断处）。
  - P2/P3：打磨项，可后续迭代。
  - 收口句：`最高 ROI：P0(统一 token) + P1(统一 Hero + 复制按钮)，2-3 天工作量，消除 80% 不一致感。`
- **十、视觉标杆（统一后的最好看版本）**——本件第 655-679 行就是两件标杆的"配方清单"，可当验收口径：
  - A 系 token（`#007aff` + `--ink/--ink2/--ink3` + 带 SF Pro Display）
  - 统一 Hero（eyebrow + h1 + sub + status-pill，无渐变）
  - 统一输入框（灰底无边框 → focus 变白加边框 + 3px 蓝阴影）
  - 统一复制按钮（底部单按钮 + 弹性动画 + Toast）
  - **去 emoji 入标题 / 去渐变文字 / 去三色渐变 / 去金铜铜 / 去 pulse**（原文为"去金铜铜"，疑为"去金/铜质感"之误）
  - 表格卡片化 + 12px th + `var(--lineS)` 轻分隔
  - ring 进度 + SVG 双线趋势（蓝摄入 / 绿运动虚线）
  - 移动端 400px 断点 + Toast 安全区适配
- **十一、设计师的私人想法（其中的判据可直接用作新票验收）**：① 为什么选 A 系而非 B 系——B 系占 63%，看似"少数服从多数"该选 B；但设计不是投票，A 系的 `#007aff` 是 iOS System Blue 官方值，`--ink2:#3c3c43` 比 B 系 `#6e6e73` 更深、正文对比度更好（WCAG AA 更稳），`rgba(60,60,67,.12)` 边线比 `#d2d2d7` 实色更柔和。② **emoji 不是不能用，是不能用在标题里**。③ **渐变不是不能用，是不能"不可见地用"**。④ `"AI 味"是"加了不该加的"，删掉就好（2 小时）；"工具感"是"少了该有的"，要补结构（2 天）`。⑤ 一个被忽视的细节：`font-feature-settings:"tnum"`。

### 11. `templates\cron_setup.html`（8357B）→ 调度参照

- 标题：`卡路里 · 定时复盘配置`；badge=`配置型 · 定时复盘`；footer=`⏰ 定时复盘 · v2.1.4`。
- 章节骨架：`meta-bar` → `h1>⏰ 定时复盘配置` → `.tip`（**工作流说明卡**：`填好参数 → 生成 prompt → 复制给 AI → AI 会自动执行 mavis cron list 查状态 → 然后决定 create/update/delete`）→ section`⚙️ 任务参数`（`form#configForm`，**默认展开**）→ section`📋 复制 prompt 给 AI`（`#promptSection` **默认 `display:none`**，含 `.prompt-box#promptBox` + `#copyPromptBtn`）→ `.footer`。
- 数据字段：`D.data = {fields, defaults, meta}`；`fields` **驱动表单生成**（模板不写死表单字段），`defaults` 给初值。
- 图表：无。
- 交互：**两段式**——先填参数（默认展开）→ 点生成后 `#promptSection.style.display='block'` 才出现 prompt 与复制按钮；`#copyPromptBtn.onclick` 调 `window.copyText(text)`；`actionbar-zone` 注入。
- CSS 组织：`--accent:#0071e3`，`.btn-primary{background:var(--accent);color:#fff}` 主按钮态；`.section h2` 17px。
- **调度参照的真正含义**：本件是"配置 → 生成 prompt → 交给 AI 执行"的**单向漏斗**（第 10 代配置型范式），与 `process_progress` 的"已执行 → 复制继续"**正好构成一对**：一个向前交给 AI 派活，一个向后把半成品交回 AI 续跑。预测页若要有"按这个预测给我排计划"的出口，抄本件的 `fields→form→prompt→copy` 链条。

## 老侧优秀点（融合候选）

每条格式：出自哪件哪个位置 → 为什么值得吸收 → 对应新技能的什么页面。

**A. 直接可搬的结构件**

1. **`meta-bar` + `type-badge` 类型徽标**（`calorie_deficit.html:79-82` / `combined_analysis.html:64-67` / `predict_report.html:57-60`，三件逐字同构）。
   左格永远写"日期区间 · 共 N 天"，右格永远写一张"这是什么页"的徽标（报告型/组合分析/预测模拟）。**为什么值得吸收**：一个模板家族里，用户唯一需要"我该看哪页"的判断就靠这枚徽标；它把页面类型从 URL 搬进了正文。**对应新页面**：#383 预测页、#385 缺口页、#384 报告页的开头三行，三页共用一套，零成本统一。
2. **降级横幅 `.degrade` + 提前 return**（`predict_report.html:38` 定义、`:100-107` 使用）。
   `degraded` 为真时显示橙色横幅写清"数据不足，无法预测"，并把 `#content`、`#insight` 整块 `display:none` 后 `return`。**为什么值得吸收**：这是"报告类页面别硬编"的正确姿势——宁少画一屏，不画一屏假数；且它把"为什么没结论"放在最显眼处，而不是丢个空图。**对应新页面**：#383 预测页（预测最容易因数据不足不可算）、#385 缺口页（缺 TDEE 时同理）。
3. **`.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}` 小屏表格内滚**（`calorie_deficit.html:68-69`）+ `.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}`（`:48`）。
   **为什么值得吸收**：缺口页/趋势页的明细表列最多（日期/摄入/消耗/缺口/目标/状态 = 6 列），窄屏宁可表内横滚也不砍列；`tabular-nums` 让上下行数字对得齐，是数据密集页的底线。设计审查把 `tabular-nums` 列为"已经做对的事（90% 文件做到）"，属于必须保住的存量优点。**对应新页面**：#385 缺口页明细表、#384 报告页任何表格。
4. **`tfoot` 汇总行**（`calorie_deficit.html:109` + `:189-191` 渲染逻辑）。
   `<tfoot id="tfoot">` 渲染"总摄入/总消耗/总缺口"，且缺口正负沿用与逐日行同一套 `.deficit-pos/.deficit-neg` 配色。
   **为什么值得吸收**：逐日明细表的用户最终问题一定是"这周一共多少"，把合计做成表格的一部分（而非另开 KPI）能少一次视线跳转，且正负配色与行保持一致就不会误读。**对应新页面**：#385 缺口页（首选）、#383 预测页（若给出逐日投影表）。
5. **KPI 语义染色**（`calorie_trend.html:134-137`：`dAvg>target*0.05` 染 `--bad`；`trend_value<=0` 染 `--good`）。
   数字本身按"这个方向是好是坏"上色，而非固定色。**为什么值得吸收**：摄入超标染红、下降染绿这类判定是产品语义，颜色是它的最省字表达；老侧把它写成一行三元，没有任何额外结构成本。**对应新页面**：#383 预测页（速率正负）、#385 缺口页（缺口正负）、#384 报告页（趋势方向）。
6. **`window.charts.line` 全部替换重库**（8 件模板统一调用；`predict_report.html:116`、`calorie_deficit.html:151`、`combined_analysis.html:173/185`、`calorie_trend.html:152`、`long_trend.html:135`）。
   全部手写 SVG，零 Chart.js / ECharts 依赖，opts 已支持 `markLine`（目标横线）、`series[].dashed`（虚线系列）、`area`（面积填充）、`tooltip`、`labels:'select'`（首尾抽稀标签）。设计审查把"零重库"明确列为"已经做对的事"。
   **为什么值得吸收**：单文件 HTML 报告的体积与离线可用性靠这个；如果新模板引入重库，一次就推翻全库最省的一条优点。**对应新页面**：三个新页全部——但**务必先补 `charts.line` 的缺口**（见下条）。
7. **`actionbar-zone` 注入位**（`predict_report.html:172`、`calorie_deficit.html:203`、`combined_analysis.html:250`、`calorie_trend.html`/`long_trend.html`/`cron_setup.html` 同）。
   `<div id="actionbar-zone"></div>` + 一行 `if(z&&window.actionBar&&window.__P__){z.innerHTML=window.actionBar(...)}`，让按钮条由运行时注入而不是模板写死。**为什么值得吸收**：模板只管"画什么"，"能点什么"归运行时的 actionBar，新增一个动作不必改 8 个模板。**对应新页面**：#383/#385/#384 三页一律保留此位。
8. **`errorReceipt` 兜底**（各件 `if(!D||D.status!=='ok'){document.body.innerHTML=window.errorReceipt({message:'数据未注入或状态非 ok'});return;}`）。
   **为什么值得吸收**：数据没注入时页面必须变成一张"出错了"回执，而不是满屏 `--` 和 `NaN`。这是一行成本的健壮性。**对应新页面**：三页全部。

**B. 交互件（图没有证据，全是老侧独有）**

9. **`window.copyText(text, btnId, 成功文案)` 三参数复制 + 按钮文案回写**（`process_progress.html:495-497`）。
   `copyContinue() → window.copyText(buildContinuePrompt(), 'btnContinue', '✓ 已复制继续指令')`；按钮文案还会随状态动态改（失败时变 `↻ 复制继续指令(从失败步骤 · N)`）。
   **为什么值得吸收**：把"复制成功"的反馈做在按钮自身（而非跳出 toast），移动端不遮挡内容；三参数签名让"复制什么/谁复制的/成功后说什么"三件事在调用点一眼看全。**对应新页面**：#383 预测页（"按这个预测帮我排计划"）、#385 缺口页（"缺口偏大，帮我把摄入调到 X"）。
10. **从结构化数据拼出的自然语言 prompt，而非裸摘要**（`process_progress.html:434-441`）。
    复制内容形如"我的 4 步流程中间停了，有 1 步失败。请帮我从失败步骤开始重试：… 已完成 2/4 步 / 失败 1 步 / 待办 1 步"，逐个失败步骤带上下文。
    **为什么值得吸收**：这是"HTML 当生成 prompt 的可视化编辑器"（设计审查点名表扬的决策）的真正落地——HTML 的价值不在展示，在于把用户手动敲 prompt 的活接过来。**对应新页面**：#383 预测页（把假设与轨迹拼成"请据此排训练/饮食计划"）、#384 报告页（拼成"请解读这份复盘"）。
11. **复制区先预览再复制**（`process_progress.html:283` `.copy-preview#copyPreview` = "预览将复制给 AI 的内容"；设计审查 P1 也点名选这个模式）。
    **为什么值得吸收**：用户复制前能看见将送出去什么，才有胆子发给 AI；且预览区天然成为"这段 prompt 好不好"的检查位。**对应新页面**：#384 报告页"复制回 AI（让 AI 帮你解读）"、#383 预测页。
12. **弹簧复制动画 + Toast + 毛玻璃回顶**（`临时样例\统一主面板_视觉标杆.html:485-497` `@keyframes copySuccess{0%{scale(1)}40%{scale(1.12)}100%{scale(1)}}`、`:816` `.toast`、`:570-571` `backdrop-filter:saturate(180%) blur(20px)`）。
    复制成功 → 按钮变绿并弹一下（`.45s var(--ease-spring)`）→ 1.2s 后还原文案；`--ease-spring:cubic-bezier(.34,1.56,.64,1)` 是整套动效的魂。
    **为什么值得吸收**：这是老侧唯一"有产品感而非工具感"的正反馈设计，且成本极低（两个 token + 一个 keyframes）；设计审查把 `help_center` 的"弹簧复制"列为 TOP1 唯一动效体系的组成部分。**对应新页面**：三页的复制按钮，建议统一到这一套。
13. **`.ring` / `.rings` SVG 双圈环形进度**（v1 `:621` 88×88 单环 `stroke-dasharray="238.76" stroke-dashoffset="43"` + 中心 `.pct`；v2 `:721` 200×200 **三环** Move/Exercise/Stand，半径 85/65/45、线宽 16、`stroke-linecap:round`，每环 = 半透明轨道圈 + 实色进度圈两层）。
    **为什么值得吸收**：设计审查的"统一视觉标杆配方"里明确要求保留 `ring 进度`，且点名 `today_water` 的 ring 是"全库最克制有效的可视化"。环形进度**在一屏内同时表达"达成率"和"还没完成的量"**，比进度条更适合"今日目标完成度"这类语义。**对应新页面**：#385 缺口页（当日缺口占目标缺口的达成率）、#383 预测页（预测轨迹对目标的完成度）。
14. **`.lead-stat` 大数字 + `.trend-stats` 图下数字条**（v2 `:785` 区、v1 `:660` 区）。
    趋势图下方紧跟一排小数字（每指标一格的"当前值/变化"），大数字配 `unit` 与 `meta` 副行。
    **为什么值得吸收**：图表给形状、数字给结论，两者贴在一起省掉"看图—读表"的折返；`weight_log_receipt` 的 64px 大数字被审查列为 TOP2 的核心原因就是这个"消费感"。**对应新页面**：#383 预测页（预测终点大数字）、#385 缺口页（日均缺口大数字）。
15. **`.timeline/.tl-row` 三栏时间轴**（v2 `:855` 区，`grid-template-columns:56px 1fr auto`，`.tl-time/.tl-tag/.tl-val`；移动端同断点收成 `56px 1fr auto`）。
    **为什么值得吸收**：缺口页与预测页最终都要回答"哪一天发生了什么"，逐日明细表是表格语义，时间轴是叙事语义；两者并存时用户可自选读法。**对应新页面**：#385 缺口页（逐日缺口时间轴）、#384 报告页（异常天时间轴）。

**C. 设计系统件（P0/P1 的目标答案，直接就是"融合"的产物）**

16. **v1 那套完整 token 定义**（`临时样例\统一主面板_视觉标杆.html:17-45`）：`--bg/--bg-soft/--bg-section/--card`、`--ink/--ink2/--ink3`、`--line/--lineS`、`--accent:#007aff` + `--accent-soft`、四语义色各配 `-soft`、`--shadow-sm/--shadow/--shadow-lg` 三档阴影、**`--r-sm:8px/--r:14px/--r-lg:20px` 圆角梯度**、`--ease` + `--ease-spring` 缓动。
    **为什么值得吸收**：设计审查 P0 的结论就是"抽 `_tokens.css` + 统一到 A 系 `#007aff` + `--ink/--ink2/--ink3` + `--lineS` + SF Pro Display"。**这套 token 就是那条 P0 的成品**——老侧已经把答案写出来了，新模板不需要重新发明，只需要 `@import`。
    注意：`--r-sm/--r-lg` 是圆角 token，`--shadow-*` 是三档阴影 token，`--ease-spring` 是缓动 token——**这三样是"设计联邦"问题的根因（各文件的阴影参数/圆角/缓动各不相同），恰好也只在这套里被统一了**。
17. **v2 的深色 token 层 + iOS Dark Mode 语义色**（`临时样例\沉浸主面板_视觉标杆v2.html:16-46`）：`--dark/--dark-2/--dark-3/--dark-ink/--dark-ink2/--dark-ink3/--dark-line/--dark-lineS`，语义色整套换 `--accent:#0a84ff`/`--green:#30d158`/`--orange:#ff9f0a`/`--red:#ff453a` + 新增 `--pink:#ff375f`。
    **为什么值得吸收**：深色不是"把浅色反相"，而是要换一整套取值（iOS Dark 的蓝是 `#0a84ff` 不是 `#007aff`）。v2 已经把对照值备好，做深色 Hero 时不必试色。**对应新页面**：#383/#385 若采用深色 Hero（见融合建议）。
18. **`--ease-spring` + `copySuccess` 弹簧缓动**（v1 `:495`）。
    **为什么值得吸收**：老侧所有正反馈只有一个源头，是"统一动效"的最小可行集；引入它比引入任何动画库都划算。**对应新页面**：三页。
19. **设计审查那 8 条"视觉标杆配方"**（`设计审查报告.html:655-679`）+ 三条判据（`:681-696`）。
    "去 emoji 入标题 / 去渐变文字 / 去三色渐变 / 去 pulse"、"表格卡片化 + 12px th + `var(--lineS)` 轻分隔"、"移动端 400px 断点 + Toast 安全区适配"；判据："emoji 不是不能用，是不能用在标题里"、"渐变不是不能用，是不能'不可见地用'"、"AI 味是加了不该加的（删掉 2 小时），工具感是少了该有的（补结构 2 天）"。
    **为什么值得吸收**：这是**老侧的"验收口径"**——新模板写完后照这 8 条自查一遍，比重新定义一套标准省得多。**对应新页面**：三页共同的收尾自查清单。

## 融合建议草案

针对预测页（#383）与缺口页（#385）各 5 条。格式：老侧拿什么 ＋ 新侧拿什么 ＝ 怎么合成。

### 预测页（#383）

1. **老侧 `predict_report.html` 的 8-kind 分支表 ＋ 新侧的类型分发/参数校验 ＝ 一个入口、八种预测。**
   老侧把 `weight_forecast / weight_target / weight_sim_cut / weight_sim_target / calorie_forecast / calorie_goal / calorie_deficit / calorie_stability` 八种 KPI 组合塞进同一份模板，靠 `D.kind` 分支；缺点是分支全在展示层（`if/else if` 串到第 155 行）。
   合成：**保留这八种 kind 的 KPI 文案与阈值字面**（`0.5-1.0 kg/周`、`7700 卡/kg`、`+300~+500 卡/天`、`σ>300`、`±10%`），但把"哪种 kind 给哪四格"搬到数据侧算好再注入（模板只做渲染表查找）。这样新增 kind 不改模板。
2. **老侧 `.degrade` 降级横幅 ＋ 新侧的空状态规范 ＝ 预测不可算时给"差多少数据"。**
   老侧 `D.degraded` 只用一句 `degrade_msg`。合成：横幅里带上"还差 N 天数据 / 缺哪项字段（如 TDEE）"，并保留老侧"隐藏 `#content` 与 `#insight` 后 return"的动作——不画假图。
3. **老侧 `forecast.points[]={date,value,lo,hi}` ＋ 新侧补齐图表接口 ＝ 真正画出置信带。**
   老侧第 113 行自认"置信带无接口 → 只画主线（记偏离）"，但 KPI 里仍显示 lo~hi 数字。合成：新侧把 `charts.line` 扩成支持"上下界带"（两条半透明面积系列夹出 band），**老侧的数据结构一字不改就能直接受益**——这是三个新页里性价比最高的一处超车。
4. **老侧 v1 标杆的 `.hero-number` 大数字 + `.ring` 环形进度 ＋ 新侧页面骨架 ＝ 预测页头屏。**
   老侧预测页头屏只有 `h1 + .sub + kpi-grid`，信息密度低但缺乏"结论感"。合成：头屏换成 v1 的"左大数字（预测终点 X kg）+ 右 ring（对目标的完成度 %）"，下面再接老侧那张 `kpi-grid` 四格。**注意**：设计审查要求"无背景 hero、无渐变、无 emoji 入标题"，而 v1 标杆恰好是无背景 + eyebrow + h1 + sub + status-pill 的合规形态，可直接照搬。
5. **老侧 `process_progress.html` 的复制继续链条 ＋ 新侧的行动出口 ＝ "按这个预测给我排计划"。**
   老侧预测页只有 `actionbar-zone`，没有把预测转成下一步动作的 prompt。合成：照 `process_progress` 的三按钮模式做两个——「按这个预测排训练计划」「假设不成立时怎么改」，并在 `.copy-preview` 里先显示将发出的文本（`假设说明 + 轨迹 + 目标 + 判定`四段拼装，照 `buildContinuePrompt()` 的写法）。注意 `cron_setup.html` 的 `fields→form→prompt→copy` 单向漏斗可作为"改假设重算"的交互参照。

### 缺口页（#385）

1. **老侧 `calorie_deficit.html` 的双系列折线（摄入实线 / 消耗虚线 + 摄入目标 markLine）＋ 新侧图表接口 ＝ 补齐"缺口面积"。**
   老侧图上有三条信息（摄入、消耗、目标线）却没有"缺口"本身的可视化。合成：在两条线之间填一层差异面积（正值绿、负值红），把 `series[].deficit` 从表格搬进图里；老侧的 `--intake:#5856d6` / `--burn:#34c759` 专色保持不变（专色是"摄入 vs 消耗"一眼可辨的根因，别换）。
2. **老侧 `.deficit-pos/.deficit-neg/.deficit-zero` 三态 ＋ 新侧需求 ＝ 缺口页唯一的口径常量表。**
   老侧把判定散在展示层（`p.deficit >= targetDef` / `> 0` / else 三档 statusBadge）。合成：把 `7700 卡/kg`、`target.weekly_deficit_per_day`、`±5%`/`±10%` 这些常量集中到一处，页面底部以"口径说明"卡显式列出（老侧只在 KPI `.extra` 里零散暗示），让用户知道"合理"是凭什么判的。
3. **老侧 `tfoot` 汇总行 ＋ 新侧的时间轴（v2 `.timeline`）＝ 逐日明细双读法。**
   老侧只有表格；v2 标杆有 `.tl-row`（时间 / 标签 / 值三栏）。合成：同一份逐日数据渲染成"表格（省空间、可对齐）+ 时间轴（可读叙事）"两段，默认表格、时间轴折叠；汇总仍在 `tfoot`（老侧做法，别改成另开 KPI）。
4. **老侧 `calorie_trend.html` 的三个分析指标 ＋ 新侧缺口页 ＝ 从"逐日缺口"升到"缺口结构"。**
   老侧趋势页已有 `工作日 vs 周末`（`weekday_avg/weekend_avg/weekend_diff`）、`合规率`（`compliance_rate/compliant_days`，判定 `≤ 目标+5%`）、`7 天变化`（`trend_value/start_avg/end_avg`）。这三个指标**缺口页一个都没有**。合成：直接搬三格 KPI 到缺口页，把"日均缺口 ± 理论减重"从两格分析扩成五格——用户真正想知道的是"我哪天在崩"，不是"我平均多少"。
5. **老侧 `calorie_deficit.html` 的 6 列明细表 + 小屏内滚 ＋ 新侧 v1 标杆的复制/Toast/毛玻璃回顶 ＝ 缺口页的收尾三件。**
   老侧表格已经是最全的（日期/摄入/消耗/缺口/目标/状态 + 合计），且 `.table-wrap` 小屏内滚已就位；缺的是"看完之后能做什么"。合成：表格下方接老侧 `review_template.html` 的"复制回 AI"段（`pre` + 单按钮），配 v1 的 `--ease-spring` 弹簧反馈与 `.toast`，并把 `process_progress` 的 `#backTop`（毛玻璃 + 安全区适配——老侧只有 `help_center` 做了 `env(safe-area-inset-bottom)`）补上。移动端断点照 v2 用双档（767px 与 639px），别只留 640px 一档。

### 三页共同（跨票，供 MAP 决策）

- **一处必须先补的底座**：`charts.line` 目前缺"置信带 / 真双轴 / 缺口面积"三种表达（老侧在 `predict_report.html:113` 与 `combined_analysis.html:140,144` 两处留了 `记偏离` 注释为证），且**双断点与 `env(safe-area-inset-bottom)` 全库只有 `help_center` 一处做到**。建议新模板开工前先定这三加一共四项底座，否则预测页与缺口页会各自再"记一次偏离"。
- **一处不要继承的**：`review_template.html` 的 C 系配色（`--bg:#F2F2F7` + `--purple:#AF52DE`）被设计审查判为 BOTTOM 且明令 P0 删除；它的 8-dim 结构与 P1 标记要，颜色不要。
- **一处要顶住的**：`predict_report.html` / `combined_analysis.html` / `long_trend.html` 三件仍用旧 token 名（`--fg/--fg2/--fg3/--soft`、`--accent:#0071e3`），与 P1 标杆要求的 `--ink/--ink2/--ink3/--lineS` + `#007aff` 不一致。新模板必须选**其中一套**并让三件一起迁，不能又开第四套。

## 存疑

1. **视觉标杆的归属地址与任务书不符**。任务书写在 `<root>\templates\` 下，实测在 `<root>\templates\临时样例\` 下。字节数一致（23444B / 29644B），应为同两件。**已按 `临时样例` 的口径记录**，但需 MAP 确认口径（"真模板 73 件"是否已含这两件）。
2. **主色到底选哪支，老侧自己的材料互相打架**。设计审查 P0 明确要求统一到 **A 系 `#007aff`**（理由是 iOS System Blue 官方值）；但老侧**最新一代的 6 件真实模板**（`predict_report` / `calorie_deficit` / `combined_analysis` / `calorie_trend` / `long_trend` / `cron_setup`，即带 `SHARED-CSS`+`payload` 注入位的那一批）用的都是 `--accent:#0071e3`；两件标杆又是 `#007aff`。**三处取值不一致，且"最新"与"标杆"不同源**。新模板必须由 MAP 拍一支，否则就是又开一套。
3. **`calorie_trend.html` 自称 `报告型 · 7 dim`，但页面上只有 4 格 KPI + 一张图 + 一张表**，7 dim 无处对应；疑似 badge 文案是复制自 `review` 系的 8-dim 体系后未改。**需与数据侧核对**：是文案错，还是本来有 7 项分析被砍到 4 项。
4. **两件视觉标杆是静态样张，无 `#payload`、无 `__P__`、数据硬编码**（`onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')"` 里直接写死命令文本）。因此它们的"UI 优秀点"是**设计意图**而非运行时可证的实现；若要吸收，需要重新接数据。**本清单按设计意图记录，未验证其可移植性。**
5. **`predict_report.html` 的 `forecast.points[].lo/hi` 在 KPI 里被显示、在图上画不出**（老侧自注 `#317 迁 Base charts.line: 置信带无接口 → 只画预测值主线的最近近似(记偏离)`）。**需确认真实影响的 kind**：至少 `weight_forecast` 一格（`kpi('置信带', lo~hi, '95%')`）在"图缺带、数有带"的不一致状态下展示。
6. **设计审查报告只读了骨架与结论（约 40KB 中的标题层 + 一句话总结 + 优点 + P0-P3 路线图 + TOP/BOTTOM3 + 视觉标杆配方 + 私人想法）**，未逐条读三个对照对与两份清单（"AI 味"清单、"工具感"清单）的明细条目。**若融合设计需要"哪些文件犯了什么错"的逐条证据，需补读该件 373-585 行。**
7. **`设计审查报告.html:655-679` 原文中"去金铜铜"疑为笔误**（上下文为"去 emoji 入标题 / 去渐变文字 / 去三色渐变 / 去金铜铜 / 去 pulse"），推测原意为"去金/铜质感"或"去金属渐变"。**未核实，引用时不要照抄这三字。**
8. **`.scratch/` 897 件与 `tests/` 未读**，按任务书口径忽略。若后续发现预测族或缺口族有实物只存在于 `.scratch/`（例如被废弃的交叉表模板），本清单需要补一条反向说明——但按纪律未扫。
