# t161 老技能 HTML 清单（总清单 · 唯一权威件）

## 这份件是什么

本图（MAP #161 卡路里场景10 分析拆B：预测与报告）老技能实物盘点总表，供 #383／#384／#385 开发新 HTML 模板时取老侧优秀点用。分族原始件保留、不删，两份事实源：

- A 侧（预测族／缺口族／视觉标杆）：`docs/skills/skill-calorie/t161-老技能HTML清单-预测与缺口.md`
- B 侧（报告族／8 条报告映射）：`docs/skills/skill-calorie/t161-老技能HTML清单-报告族.md`

本件只做合并、去重、归组与裁决记录；分族件里的逐件原文不再复制，凡引用均标出处。

## 计数口径

只计 `*.html`，**排除 `.bak`**：

| 位置 | 件数 | 说明 |
| --- | --- | --- |
| `<root>\templates\` | 73 | `*.html`；另有 `help_center_v2_4_12.html.bak`（17696B）与 `cropperjs\`（2 件第三方库）不计 |
| `<root>\templates\临时样例\` | 2 | 两件视觉标杆实际住在这里，**不在 `templates\` 根** |
| `<root>\calorie_html\` | 2 | `卡路里_HELP_20260730_130429.html`、`卡路里_HELP_20260731_201530.html` |
| `<root>\html\` | 2 | `tm_db.html`、`tm_mock.html` |

`73 + 2 + 2 + 2 = 79`。

不计：`<root>\.scratch\`（**历史草稿区**，含大量 html 快照，**不作为真模板计入**；其件数随会话增长、**不列具体数**，见第 10 节存疑 9）、`<root>\tests\`（49 件，用例产物／`_plan_*.html`／`test_*.py`）。

口径裁决与分族差异：A 侧「范围与计数」与 B 侧「范围与计数」结论一致（均 79，均排除 `.bak`）；两处差异仅两小项，**以本节为准**：① A 未给 `tests\` 件数（只写「忽略」），B 记 49 件；② A 按目录内文件总数（74/2/3/2）列出「其中 `*.html`」交叉核对，B 直接列 4 个目录的件数与文件名明细。两件的 79 与路径归属无冲突。

本清单覆盖 22 件（A 侧 11 件 ＋ B 侧 11 件，两边无重件）：报告 6 件、预测 1 件、缺口 1 件、视觉标杆 2 件、过程型 2 件、邻近素材 10 件。

## 与本图相关的件（清单表）

**两栏语义**（原「服务票号」栏语义含混，已拆为两栏，不得互推）：

- **服务本图票**：该件在本图（MAP #161）里为哪张团队票服务。取值＝`#383` 预测／`#385` 缺口／`#384` 报告／`#376` 拆A对照／`邻近素材·不在范围`；另两类非票归属记作「三页共用参照（非票）」。
- **文件内老侧票号引用（实测）**：用正则 `(?<!&)#\d{1,4}`（后随字符非 hex 字母）在该件模板内实测到的**老侧票号**，逐条给行号；真无则写「无」。HTML 实体（如 `&#39;` ＝撇号）与 CSS 十六进制色值（如 `#0071e3`、`#34c759`）均已在正则层排除，不构成命中。

**覆盖面口径**：本表只登记 **22 件**（`templates\` 根 20 件 ＋ `templates\临时样例\` 2 件）；`templates\` 内其余 **53 件**与本图无关，仅计数不列名（该目录另有 `cropperjs\` 2 件第三方库与 1 件 `.bak`，按第 2 节口径不进 79）；`calorie_html\` 与 `html\` 各 2 件亦未登记。合计未登记 **57 件**（79 − 22）。

| 件名 | 字节 | 标题 | 服务本图票 | 文件内老侧票号引用（实测） | 类别 |
| --- | --- | --- | --- | --- | --- |
| `templates\health_report.html` | 18023 | 卡路里 · 健康报告（`h1#title` 随 `kind` 变） | #384 报告（正主） | #317（141、157） | 报告（★core，9 kind 多态） |
| `templates\predict_report.html` | 9783 | 卡路里 · 预测模拟 | #383 预测（正主） | #317（113） | 预测（★core） |
| `templates\calorie_deficit.html` | 10631 | 卡路里 · 热量缺口 | #385 缺口（正主） | #317（148） | 缺口（★core） |
| `templates\combined_analysis.html` | 12726 | 卡路里 · 组合分析 | #384 报告 | #317（140、156、184）、#356（146） | 报告（场景10 分析主模板） |
| `templates\calorie_trend.html` | 10254 | 卡路里 · 热量趋势 | #383 预测／#384 报告 | #317（149） | 报告 |
| `templates\long_trend.html` | 8333 | 卡路里 · 整体趋势 | #376 拆A对照 | #317（108）、#356（113） | 报告（拆A对照件） |
| `templates\review_template.html` | 15639 | 卡路里复盘报告 | #384 报告 | 无 | 报告（8 dim 结构） |
| `templates\anomaly_report.html` | 5972 | 卡路里 · 自动分析诊断 | 邻近素材·不在范围 | 无 | 邻近族·仅作融合素材·不在本图范围（降级与复制素材源） |
| `templates\process_progress.html` | 18835 | 流程进度 · 卡路里 | 三页共用参照（非票） | 无（只有 BUG #1／#3／#4 修复注释，非票号） | 过程型（复制继续链条参照） |
| `templates\cron_setup.html` | 8357 | 卡路里 · 定时复盘配置 | 三页共用参照（非票） | 无 | 过程型（配置→prompt→复制 单向漏斗参照） |
| `templates\临时样例\统一主面板_视觉标杆.html` | 23444 | 统一主面板 · 视觉标杆 | 三页共用形态参照（非票） | 无 | 视觉标杆（浅色 token 主源，静态样张） |
| `templates\临时样例\沉浸主面板_视觉标杆v2.html` | 29644 | 沉浸主面板 · 视觉标杆 v2 | 三页共用形态参照（非票） | 无 | 视觉标杆（深色 Hero ／三环／时间轴） |
| `templates\设计审查报告.html` | 40574 | 设计审查报告（元件，非模板） | 三页共用（非票） | 无 | 报告（只取结论：P0-P3 ＋ 视觉标杆配方） |
| `templates\health_dashboard.html` | 12895 | 健康仪表盘 · 卡路里 | 邻近素材·不在范围 | 无（`&#39;`@206 为 HTML 实体撇号，非票号） | 邻近族·仅作融合素材·不在本图范围（取「今日该做什么」＋「复制回 AI」） |
| `templates\contraindication_report.html` | 22654 | 禁忌扫描报告 v2 · 卡路里 | 邻近素材·不在范围 | 无（`&#39;`@378 为 HTML 实体撇号；另有 BUG #2／#3 修复注释） | 邻近族·仅作融合素材·不在本图范围（取交互与 CSS 资产，不取业务） |
| `templates\nutrition_analysis.html` | 12467 | 卡路里 · 营养分析 | 邻近素材·不在范围 | #317（154、188、198） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\nutrition_detail.html` | 6147 | 卡路里 · 营养素深度 | 邻近素材·不在范围 | #44（25、26、29、34、43、48、51、93） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\nutrition_ratio.html` | 12604 | 卡路里 · 营养配比 | 邻近素材·不在范围 | #44（57、66、71、73、77、83、154、197）、#317（164） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\six_factors.html` | 8381 | 卡路里 · 每日 6 因素综合 | 邻近素材·不在范围 | #317（110、120）、#356（113） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\goal_progress.html` | 17521 | 目标进度 · 卡路里 | 邻近素材·不在范围 | #66（57、58）、#317（183）、`#8`（235「对齐 #8」，性质待核） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\diet_overview.html` | 7682 | 卡路里 · 饮食总览 | 邻近素材·不在范围 | #44（36、41、44、50、120、127） | 邻近族·仅作融合素材·不在本图范围 |
| `templates\meal_distribution.html` | 11004 | 卡路里 · 餐别分布 | 邻近素材·不在范围 | #44（33、56、61、65、67、88、159） | 邻近族·仅作融合素材·不在本图范围 |

邻近族共 10 件（`contraindication_report.html` ＋ 另 9 件：`health_dashboard`／`nutrition_analysis`／`nutrition_detail`／`nutrition_ratio`／`six_factors`／`anomaly_report`／`goal_progress`／`diet_overview`／`meal_distribution`），**仅作融合素材，不在本图范围**，本表只登记不派生开发任务。

本图真正的开发对象只有 3 件正主（`predict_report.html` → #383、`calorie_deficit.html` → #385、`health_report.html` → #384）＋ 5 件报告侧支撑件（`combined_analysis`／`calorie_trend`／`long_trend`／`review_template`／`anomaly_report` 的降级与复制段）＋ 2 件视觉标杆 ＋ 2 件过程型参照。

## 逐件要点

每件一段，字段顺序固定：路径｜字节｜标题｜章节骨架｜关键数据字段｜图表｜交互｜CSS 组织｜服务票号。**合并规则说明**：A 侧 11 件与 B 侧 11 件**无重件**（两边分派不交叠），故不存在「同一件两处描述打架」的情形；唯一需要标注来源的是**同一结论在两份件中口径不同**的两处，已写在本节末尾「跨件出入登记」。

### 1. `templates\health_report.html` ★core（出处：B §1，细节更全）

路径｜字节：`templates\health_report.html` ｜ 18023B。标题：`卡路里 · 健康报告`（`<title>`）；页内 `h1#title` 由 `D.kind` 决定，`titles` 表在 128-131 行，取值 9 个：`full`／`bmi`／`tdee`／`bmr`／`protein`／`water`／`score`／`trend`／`compare`。章节骨架：`meta-bar`（左日期区间·天数／右 `type-badge` 健康报告）→ `h1#title` → `p.sub`（窗口）→「fullBlock」／「singleBlock」二选一 → `div.insight` → `footer.src`；`fullBlock` 内含 `kpi-grid#fullKpis` →「各维度走势(摄入/运动/体重/饮水/缺口)」＋5 色 `legend` →「异常天标注」`#anomalyList` →「建议」`#suggestion`；`singleBlock` 内含 `kpi-grid#singleKpis` →「历史轨迹」`#singleChart`（可隐）→ `#singleTableTitle`／`#singleTableHead`／`#singleTable`（可隐）→「分类里程碑」`#milestoneList`（可隐）。关键数据字段：`kind`、`window`、`start`、`end`、`days`、`insight`、`kpis`〔label/value/delta〕、`series`〔date/calories/exercise_kcal/weight_kg/water_ml/deficit〕、`anomaly_days`〔date/notes[]〕、`suggestion`；单类分支另有 `current/category/height/history[]/milestones[]`（bmi）、`tdee/factor/cal_avg/deficit`（tdee）、`bmr/tdee/factor/under_bmr_days/under_bmr_list[][]`（bmr）、`avg/target/rate/p_goal/series[]`（protein）、`avg/goal/days_ok/days/rate/series[]`（water）、`total/items{}/history[]`（score）、`direction/first_half/second_half/inflections[]/trend[]`（trend）、`prev_start/prev_end/top3[]/deltas[]`（compare）。图表：`window.charts.line`——`full` 走 5 序列归一化多线（`series` 选项），bmi／protein／water／score／trend 各走单线，protein／water 带 `markLine` 目标线。交互：无 tab、无折叠；唯一按钮位是共享 `actionBar` 注入区 `#actionbar-zone`。CSS 组织：模板自带 `<style>` ＋ `<!--SHARED-CSS-->` 占位，`:root` 变量 `--fg --fg2 --fg3 --bg --card --border --accent --good --warn --bad --soft`，`max-width:920px`，`@media (max-width:640px)` 下 KPI 4 列→2 列。服务票号（实测）：`#317`（141-142、157 两处注释记图表偏离）。**本件是全族枢纽**：一个模板承担 9 种报告形态，是 #384 多态底座的直接实物依据。

### 2. `templates\predict_report.html` ★core（出处：A §1）

路径｜字节：`templates\predict_report.html` ｜ 9783B。标题：`卡路里 · 预测模拟`。章节骨架：`meta-bar` → `h1#title` → `.sub#sub` → `.degrade`（降级横幅，默认隐藏）→ `#content`【`kpi-grid#kpis`；`预测/模拟轨迹`（#chart ＋ 单行 legend）；`假设说明`（`.assume#assume`）】→ `.insight#insight` → `.footer`（srcLine）。关键数据字段：`title`、`sub→rate_note`、`assumption`、`insight`；时间轴 `start/end/days`；降级 `degraded/degrade_msg`；轨迹 `forecast.points[]={date,value,lo,hi}`；体重族 `current/rate_per_week/rate_note`；目标族 `eta/days_left/feasible`；模拟切片 `cut_kcal/new_deficit/weekly_loss`；模拟目标 `target_loss/days_target/weekly_rate/needed_deficit`；热量族 `current/daily_rate/goal`；目标族 `avg/gap/on_target`；缺口族 `avg_deficit/weekly_loss`；稳定族 `avg/sigma/stable`。**一件覆盖 8 种 kind**（`weight_forecast`／`weight_target`／`weight_sim_cut`／`weight_sim_target`／`calorie_forecast`／`calorie_goal`／`calorie_deficit`／`calorie_stability`），每 kind 有各自 KPI 四格（文案与阈值字面见 A 侧表格，A §1 逐 kind 列出）；分支写在展示层 `if/else if` 串到 155 行。图表：单系列折线（`pts.map(p => ({label: p.date.slice(5), value: p.value}))`），opts `{height:260, labels:'select', format: v=>Number(v).toFixed(1), tooltip:true}`；点数 <2 渲染灰字占位「预测点数不足」。交互：降级横幅（`degraded` 为真时显示橙色横幅并隐藏 `#content` 与 `#insight`）；`actionbar-zone` 注入按钮条；底部 srcLine 带出处命令 `render_analysis.py --view predict`。CSS 组织：`<style>` 段 8-51 行，`:root` **11 个变量**（`templates\predict_report.html:10-14`；`--fg/--fg2/--fg3/--bg` 在 `:11`＋`--card/--border/--accent` 在 `:12`＋`--good/--warn/--bad/--soft` 在 `:13`，4＋3＋4＝11；原记 12 有误，其自列名单也只有 11 个），`.kpi-grid` 四列网格、`.kpi/.section/.legend/.assume/.insight/.degrade/.meta-bar/.btn`，`@media(max-width:640px)` 把 KPI 改两列。**最关键的一行注释（A §1 记 `predict_report.html:113`）**：`// #317 迁 Base charts.line: 置信带(hi/lo band)无接口 → 只画预测值主线的最近近似(记偏离)`——KPI 里仍显示 `lo~hi` 置信带数字，图上画不出来，是「模型有、图没有」的能力缺口，也是新模板可直接超车处。

### 3. `templates\calorie_deficit.html` ★core（出处：A §2）

路径｜字节：`templates\calorie_deficit.html` ｜ 10631B。标题：`卡路里 · 热量缺口`。章节骨架：`meta-bar`（badge＝报告型 · 摄入 vs 消耗）→ `h1>⚖️ 热量缺口` → `kpi-grid` → section`每日摄入 vs 消耗`（#chart ＋ 三行 legend）→ section`缺口明细`（`.table-wrap>table`：#table ＋ `tfoot#tfoot`）→ `.footer`。关键数据字段：payload 形状 `D.data = {summary, series, target, meta}`，并有 `D.status !== 'ok'` 兜底；`summary`＝`avg_intake/avg_burn/avg_exercise_burn/avg_deficit/predicted_loss_kg/weekly_deficit/trend('loss'|'gain'|持平)`；`series[]={date,intake,burn,deficit}`；`target={intake,tdee,weekly_deficit_per_day}`（常量 7700 卡/kg）。图表：**双系列折线 ＋ markLine**——`[{name:'摄入', items:[…intake]}, {name:'消耗', items:[…burn], dashed:true}]`，共享 Y 域，`markLine:{value: target.intake, label:'摄入目标 X'}`；实线＝摄入、虚线＝消耗、目标用基准横线。交互：`dailyTable` 每行右侧 `window.statusBadge(...)` 给「✓ 达标／⚠ 偏低」；表格底部 `tfoot` 汇总行（总摄入/总消耗/总缺口，缺口正负用 `.deficit-pos/.deficit-neg` 双色）；小屏 `.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}` 横滚。CSS 组织：比预测页多两个语义色 `--intake:#5856d6`（紫）、`--burn:#34c759`（绿），让「摄入 vs 消耗」有稳定专色；`.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}`；`.deficit-pos{--good}/.deficit-neg{--bad}/.deficit-zero{--fg3}` 三态（实测 `calorie_deficit.html:50-52`）。服务票号（实测）：`#317`（148）。**本件是缺口页最直的近亲**：KPI 名、表格列、判定阈值（7700 卡/kg、每周口径）可整段搬。

### 4. `templates\combined_analysis.html`（出处：A §3）

路径｜字节：`templates\combined_analysis.html` ｜ 12726B。标题：`卡路里 · 组合分析`。章节骨架：`meta-bar`（badge＝组合分析 · 双轴+相关）→ `h1#title` → `.sub` → `kpi-grid`（**相关系数 r 排第一格**／A 均值／B 均值／对齐样本 N）→ section`双轴走势`（#dualChart ＋ 双行 legend）→ section`相关性与回归`（#scatterChart）→ section`延迟相关性(前 N 天 B 值 vs 当日 A 值)`（#lagTable）→ section`分层对比`（#stratTable，列＝分组/天数/A 净变化/B 均值）→ `.insight`。关键数据字段：payload **直接展开**（非 `D.data`）：`labels:{a,b}`、`pair`、`start/end/days/window/insight`；`correlation:{r,n}`、`regression:{slope,intercept}`；`a_avg/a_delta/a_count/b_avg/b_delta/b_count`；`line[]/scatter[]/lag[]/strat{}/over_limit_days[]/deficit_buckets[]`。图表：两处 `window.charts.line` 调用——`dualChart` 用「各轴独立 min-max → 归一化共享 0-100 域」近似双轴；`scatterChart` 承载散点 ＋ 回归线（读 `D.regression.slope/intercept`，叠 `correlation.r`）。交互：两个 section 带 `id`（`lagSection`／`stratSection`）便于按数据有无隐藏；`actionbar-zone`；srcLine 带 `render_analysis.py --view combo`。CSS 组织：与预测页同源，多一个 `--b:#ff9500`（B 轴专色），A 轴用 `--accent`。服务票号（实测）：`#317`（140、156、184 三处注释）、`#356`（146）（140 行原文：`// #317 迁 Base charts.line 双系列: 各轴独立 min-max → 归一化共享 0-100 域近似`，141 行为其续行 `// (charts.line 无双轴独立刻度 — 记偏离)`）——老侧**想要真双轴但图表层给不了**，只能归一化，是新模板第二个可超车点。

### 5. `templates\calorie_trend.html`（出处：A §5）

路径｜字节：`templates\calorie_trend.html` ｜ 10254B。标题：`卡路里 · 热量趋势`；badge 自称 `报告型 · 7 dim`。章节骨架：`meta-bar` → `h1>🔥 热量趋势`（**emoji 进标题**）→ `kpi-grid`（日均热量／7 天变化／工作日 vs 周末／合规率）→ section`每日热量 (含目标线)`（#chart ＋ 三行 legend：日热量／目标／超标警告）→ section`每日明细`（表格列＝日期/类型/实际/目标/偏差/状态）→ `.footer`。关键数据字段：`D.data = {summary, series, meta}`；`summary`＝`avg/target/trend('down'|'up'|持平)/trend_value/start_avg/end_avg/weekend_diff/weekday_avg/weekend_avg/compliance_rate/compliant_days`；`series[]={date,calorie}`。图表：单系列折线 ＋ `markLine:{value: summary.target, label:'目标 X'}` ＋ area 填充。交互：KPI 值**按语义染色**（趋势为正染 `--bad`、为负染 `--good`；日均偏差 > 目标 5% 染 `--bad`）；表格行按偏差分档给 `statusBadge`：◐ 进行中／✗ 严重超／⚠ 超（阈值 ±5%、+10%）＋ `--good`；超标日在 legend 区用 `warnSpan` 汇总（`⚠ MM-DD 严重超标 +X%(N 卡)`）。CSS 组织：`--accent:#0071e3`；`td.num,th.num{font-variant-numeric:tabular-nums}`；`.section h2` 18px（本族最大）。服务票号（实测）：`#317`（149）。可搬家产出：**合规率／工作日 vs 周末／偏差分档**三件分析指标，预测页与缺口页都能直接用。

### 6. `templates\long_trend.html`（出处：A §6）

路径｜字节：`templates\long_trend.html` ｜ 8333B。标题：`卡路里 · 整体趋势`。章节骨架：`meta-bar` → `h1#title`（渲染成 `看整体趋势(<group_label>)`）→ `.sub`（`多指标归一化同图 · <window> 窗口`）→ `kpi-grid`（由 `D.metrics` 动态生成为每指标一格）→ section`多指标同图(归一化 0-100)`（#chart ＋ 动态 legend）→ section`周期对比`（`#periodSection`，默认 `display:none`，有数据才显）→ `.insight` → `.footer`。关键数据字段：`start/end/days/group_label/window/insight/metrics[]/stats{field:{}}/monthly[]|norm[]/period_compare`；每 metric `{field,label}`。图表：`window.charts.line`，多序列**共享 0-100 归一化域**（注释：`多序列(共享 Y 域 0-100 归一化天然吻合)`）；事件型指标特判 `EX_FIELDS = ['exercise_kcal','strength_kcal','cardio_kcal']`，缺日补 0（休息日 0 基线）而非断点；legend 颜色按 `colors[j % 6]` 轮转，`<i style="background:...">` 动态填色。CSS 组织：与其他同族一致，`:root` 与 `calorie_trend` 同。服务票号（实测）：`#317`（108）、`#356`（113）。**与拆A的分工**：本件是「多指标同图」的对照物——拆A 若做趋势，本件给出「归一化 ＋ 缺日补 0 ＋ 动态 legend」三件可复用件（但归一化本身按裁决 4／裁决 7 **不继承**，见第 8、9 节）。

### 7. `templates\review_template.html`（出处：A §7）

路径｜字节：`templates\review_template.html` ｜ 15639B。标题：`卡路里复盘报告`（footer 标 `v2 · 数据来源 review_cli.py gen + review_engine.py`）。章节骨架：`header`（`eyebrow` ＋ `h1#hero-title` ＋ `.date-range#date-range`）→ `.kpi-hero#kpi-hero`（**4 卡，非 4 格网格**）→ `#anomaly-section`（h2`⚠️ 异常天` ＋ `#anomaly-list`，**默认隐藏、有数据才显**）→ `.dim-grid#dim-grid`（**8 个 dim 卡**，每卡 `dim-title / metric / desc`，P1 重点额外挂 `dim-tag`）→ `#svg-section`（h3 体重趋势 ＋ `#svg-container` ＋ `.svg-note`）→ `#topfood-section`（h3`🍽️ Top 5 食物` ＋ `.top-list#top-foods`）→ `.copy-section`（h3`📤 复制回 AI（让 AI 帮你解读）` ＋ `pre#copy-text` ＋ `#copy-btn`）。关键数据字段：KPI hero 4 卡；dim 8 卡各带 `{p1,num,title,metric,desc}`；异常天列表；体重 SVG；Top5 食物（`ul`，非表）；复制摘要 pre。图表：**手写 SVG**（`#svg-container`），非 `charts.line`——第 2 代做法。交互：`copyToAI()` 单按钮把 `pre#copy-text` 内容复制走；异常天／SVG／Top 食物三块都靠 `style="display:none"` 门控。CSS 组织：**全库唯一的 C 系 token**（`--bg:#F2F2F7`、`--fg:#1C1C1E`、`--fg2:#8E8E93`、`--fg3:#C7C7CC`、`--border:rgba(60,60,67,.12)`），且每个语义色都配 `-soft` 底（`--green-soft:#E8F5E9`／`--orange-soft:#FFF3E0`／`--red-soft:#FFEBEE`／`--blue-soft:#E3F2FD`／`--purple-soft:#F3E5F5`），`--shadow:0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04)`，`body{max-width:760px}`。服务票号：未见。**设计审查把本件判为 BOTTOM**（全库唯一 C 系，背景 `#F2F2F7` 与其他 34 个文件都不同；引入 `--purple:#AF52DE` 是 Material Design 紫）——**它的「8 dim 结构 ＋ P1 标记 ＋ 异常天门控 ＋ 复制回 AI」值得吸收，配色不要吸收。**

### 8. `templates\anomaly_report.html`（出处：B §7）

路径｜字节：`templates\anomaly_report.html` ｜ 5972B（报告族内次小）。标题：`卡路里 · 自动分析诊断`。章节骨架：`meta-bar` ＋ `type-badge` → `h1#title`／`sub` → `div.degrade#degrade`（默认 `display:none`）→ `div#findings`（发现卡列表）→ `div.insight` → `footer`（`src` ＋ `btn#copyDxBtn`）。关键数据字段：`title/window/start/end/days`、`findings`〔`cause`／`confidence`／`evidence`／`action`〕、`degraded`、`degrade_msg`、`insight`。图表：无。交互：**置信度分级**（`.conf-高` 红／`.conf-中` 橙／`.conf-低` 灰，30-33 行）＋ 每卡「证据」块 ＋「行动建议」块；`#copyDxBtn` 一键把诊断结论复制为编号纯文本（84 行模板字符串）。CSS 组织：`:root` 同族；专有 `finding／evidence／action／conf-*／degrade`。服务票号：未见；`srcLine` 写 `render_analysis.py --view anomaly`。**本件是 #384 的降级与诊断卡素材源**（裁决 4 之外的邻近族定位见第 3 节表）。

### 9. `templates\process_progress.html` ★core（出处：A §4）

路径｜字节：`templates\process_progress.html` ｜ 18835B。标题：`流程进度 · 卡路里`（首行注释自述用途：`Apple 设计语言 · G4 4 步流程进度可视化 - 过程型 HTML（AI 协同 · 原则 10 · 复制"从哪步继续" prompt）- 5 段式：Hero · 进度条 · 4 步详情 · 复制区`）。章节骨架：`header.hero`（`eyebrow#eyebrow` ＋ `h1#title` ＋ `.sub#subtitle` ＋ `pills#pills`）→ section`整体进度`（`.progress-info`(rate+time) ＋ `.progress-bar#progressBar` ＋ `.progress-legend#progressLegend`）→ section`步骤详情`（`.steps#steps`）→ `section.copy-section`【h2`继续操作` ＋ 说明三行 ＋ `.btn-row` 三按钮 ＋ `.copy-preview#copyPreview`】→ `footer` → `a#backTop` 回到顶部。关键数据字段：`DATA.data.summary`／`DATA.data.steps`，字段 `process_name/total_steps/completed_steps/failed_steps/started_at/finished_at`；每步 `status('done'|'failed'|'pending')`。图表：**无图表**，进度可视化靠 CSS 四段进度条（`.progress-seg.done/.failed/.pending`，pending 用 `::before` 画斜线纹）＋ 图例计数。交互（**本件最强项**）：三个复制按钮 `copyContinue()`／`copyAdopt()`／`copyFullLog()` → `window.copyText(text, btnId, 成功后文案)`；按钮文案随状态动态改（失败时变 `↻ 复制继续指令(从失败步骤 · N)`）；复制内容是从 STEPS 拼出的**完整自然语言 prompt**（含「已完成 2/4 步」「失败 1 步」等），而非裸摘要；`.copy-preview` 先给预览再复制；顶部 `#backTop` 回顶。CSS 组织：token 最完整的一件——`--bg/--bg-soft/--bg-section/--card/--ink/--ink2/--ink3/--line/--lineS/--accent/--accent-soft/--green(-soft)/--orange(-soft)/--red(-soft)/--gray(-soft)/--shadow-sm/--shadow`，每个语义色都配对 `-soft` 底；`.steps` 用 `counter-reset:step` 做序号。服务票号：未见。**结论**：这是「过程型页面」的唯一实物参照，报告／预测页若需要「下一步怎么做」的出口，照它抄。

### 10. `templates\cron_setup.html`（出处：A §11）

路径｜字节：`templates\cron_setup.html` ｜ 8357B。标题：`卡路里 · 定时复盘配置`；badge＝`配置型 · 定时复盘`；footer＝`⏰ 定时复盘 · v2.1.4`。章节骨架：`meta-bar` → `h1>⏰ 定时复盘配置` → `.tip`（工作流说明卡：`填好参数 → 生成 prompt → 复制给 AI → AI 会自动执行 mavis cron list 查状态 → 然后决定 create/update/delete`）→ section`⚙️ 任务参数`（`form#configForm`，**默认展开**）→ section`📋 复制 prompt 给 AI`（`#promptSection` **默认 `display:none`**，含 `.prompt-box#promptBox` ＋ `#copyPromptBtn`）→ `.footer`。关键数据字段：`D.data = {fields, defaults, meta}`；`fields` **驱动表单生成**（模板不写死表单字段），`defaults` 给初值。图表：无。交互：**两段式**——先填参数（默认展开）→ 点生成后 `#promptSection.style.display='block'` 才出现 prompt 与复制按钮；`#copyPromptBtn.onclick` 调 `window.copyText(text)`；`actionbar-zone` 注入。CSS 组织：`--accent:#0071e3`，`.btn-primary{background:var(--accent);color:#fff}`；`.section h2` 17px。服务票号：未见。**调度参照的真正含义**：本件是「配置 → 生成 prompt → 交给 AI 执行」的**单向漏斗**，与 `process_progress` 的「已执行 → 复制继续」正好构成一对——一个向前交给 AI 派活，一个向后把半成品交回 AI 续跑。预测页若要有「按这个预测给我排计划」的出口，抄本件的 `fields→form→prompt→copy` 链条。

### 跨件出入登记（A/B 两份件之间）

1. **`tests\` 件数**：A 侧只写「用例产物，忽略」未给数；B 侧记 **49 件**。以 B 为细节更全，口径结论一致（均不计入 79）。
2. **双断点与安全区归属**：A 侧第 183 行引设计审查原文记 `weight_history` 有 640px ＋ 400px 双断点，A 侧第 303 行又称「双断点与 `env(safe-area-inset-bottom)` 全库只有 `help_center` 一处做到」——**同一份 A 件内部两处打架**（均为引述，非 A 自身实测）。本清单按两处照录，取用前须实地复核，见第 10 节存疑。
3. **视觉标杆路径**：A 侧主动纠正任务书（实测在 `templates\临时样例\`，非 `templates\` 根），B 侧计数表直接列在 `临时样例\` 并给全名——两件一致，无冲突。
4. **归一化做法的定性**：A 侧把 `combined_analysis`／`long_trend` 的归一化记在「记偏离」注释层（未列入优秀点清单），B 侧裁决 4 明确「归一化不是优秀点、不继承」。**两份件结论一致**，本清单在第 8 节裁决 7 统一成「不继承清单」。

### 11. `templates\临时样例\统一主面板_视觉标杆.html` ★core（出处：A §8）

路径｜字节：`templates\临时样例\统一主面板_视觉标杆.html` ｜ 23444B（**注意住在 `临时样例\`，不在 `templates\` 根**）。标题：`统一主面板 · 视觉标杆`。章节骨架：`header.hero`（`eyebrow` ＋ `h1>今日概况` ＋ `.sub` ＋ `.status-pill.pending>2 项待办`）→ `.hero-number`（左 `label`／`big`＋`unit`／`meta`；右 `.ring` 88×88 SVG 圆环 ＋ `.pct` 中心百分比）→ `.kpi-grid`（每卡 `label`（含 `.icon` ＋ `.badge warn` 百分比）／`main`（`value`＋`unit`）／`detail`）→ `.section`「近 7 天热量趋势」（`svg.trend-svg viewBox="0 0 800 180" preserveAspectRatio="none"` ＋ `.trend-stats/.trend-stat`）→ `.section`「今日待办」（`.todo-list/.todo-row/.todo-empty`）→ `.section`「最近记录」（`.log-list/.log-row/.log-section/.log-section-title`）→ `.section`「快速记录」（`.field` 表单）→ `.section`「快捷命令」（`.hint` ＋ `.cmd-list/.cmd-row` ＋ 每行 `.copy-mini` ＋ 底部 `.copy-all`）→ `.toast#toast`。关键数据字段：**静态样张**，无 `#payload`、无 `__P__`，数据硬编码在 HTML 里——是视觉参照物不是运行时模板。图表：手写 SVG 折线（`viewBox 0 0 800 180`，`preserveAspectRatio="none"` 随容器横行拉伸）＋ `.trend-stats` 图下数字条。交互（**本件最值钱的交互**）：`copy-mini` 单条复制（`onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')"`，内容写死在 onclick 里）；`copyAll()` 一键复制全部；`showToast('已复制: '+text)` ＋ `.toast` 底部弹出；**按钮回调播弹簧动画**（`.copy-mini.copied{background:var(--green);animation:copySuccess .45s var(--ease-spring)}`，`@keyframes copySuccess{0%{scale(1)}40%{scale(1.12)}100%{scale(1)}}`，1.2s 后还原文案）；`.copy-all` 胶囊 ＋ hover `translateY(-1px)` ＋ `box-shadow`；`#backTop` 回顶。CSS 组织：**全库最完整的一套 token**（＝设计审查 P0「统一 token」的目标答案）——`--bg/--bg-soft/--bg-section/--card`、`--ink/--ink2/--ink3`、`--line/--lineS`、`--accent:#007aff` ＋ `--accent-soft`、四语义色各配 `-soft`、`--shadow-sm/--shadow/--shadow-lg`、`--r-sm:8px/--r:14px/--r-lg:20px` 圆角梯度、`--ease:cubic-bezier(.4,0,.2,1)`、`--ease-spring:cubic-bezier(.34,1.56,.64,1)`；另有 `html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}`、`backdrop-filter:saturate(180%) blur(20px)`（含 `-webkit-` 前缀）毛玻璃、`.wrap{max-width:960px}`、640px 断点 KPI 两列／toast 安全区。服务票号：未见。**取用纪律**：这套 token 名在本仓不存在，只能作**设计意图参考**，不得 `@import`／照搬（裁决 9）。

### 12. `templates\临时样例\沉浸主面板_视觉标杆v2.html` ★core（出处：A §9）

路径｜字节：`templates\临时样例\沉浸主面板_视觉标杆v2.html` ｜ 29644B。标题：`沉浸主面板 · 视觉标杆 v2`。章节骨架：`.hero-dark`（深色 Hero：`h1>2026 年 7 月 29 日` ＋ `.rings`（**三环 SVG 200×200**：外环 Move 粉 r=85、中环 Exercise 绿 r=65、内环 Stand 蓝 r=45，每环「轨道圈 ＋ 进度圈」两层，进度圈用 `stroke-dasharray`＋`stroke-dashoffset`＋`stroke-linecap:round`，中心 `.rings-center` 大数字 `82%`＋`达标`）＋ `.rings-legend/.ring-item/.ring-dot` ＋ `.hero-status/.status-chip`）→ `.editorial`（浅色正文区）→ `.edit-section`（`.edit-title` ＋ `.lead-stat` ＋ `.kpi-grid/.kpi`）→ `.trend-block`（`svg.trend-svg viewBox="0 0 1000 220"` ＋ `.trend-caption` ＋ `.trend-legend`）→ `.timeline`（`.tl-row` 三栏 `grid 56px 1fr auto`：`.tl-time/.tl-tag/.tl-val`）→ `.todo-edit/.todo-item` → `.input-block/.field-dark` → `.cmd-edit/.cmd-item` → `.copy-mini`／`.copy-all` → `.toast` → `.transition-band`。关键数据字段：同为**静态样张**，无 payload。图表：三环 SVG ＋ 1000×220 趋势 SVG 全部手写、零库。交互：复制与 toast 与 v1 同款（同 `copySuccess` 弹簧动画、同 `copyCmd/copyAll` 签名）；额外交互在「可编辑」语义上——`.todo-edit`／`.input-block`／`.cmd-edit` 三类**就地编辑区**（同一页既展示又编辑）。CSS 组织（**v1 的超集**）：v1 全套浅色 token 之上再加整套深色 token——`--dark:#000000/--dark-2:#1c1c1e/--dark-3:#2c2c2e/--dark-ink:#ffffff/--dark-ink2:rgba(235,235,245,.6)/--dark-ink3:rgba(235,235,245,.3)/--dark-line:rgba(255,255,255,.08)/--dark-lineS:rgba(255,255,255,.04)`；语义色整套换 iOS Dark Mode 值（`--accent:#0a84ff`、`--green:#30d158`、`--orange:#ff9f0a`、`--red:#ff453a`）并新增 `--pink:#ff375f`；`.wrap{max-width:1040px;padding:0 0 80px;overflow:hidden}`。断点：768px 级（`.rings` 单列、`.rings-svg` 180px）＋ 640px 级（KPI 一列、toast 左右 12px），**双档比 v1 单档细**。服务票号：未见。**v1 与 v2 的关系（重要）**：v1＝浅色单页 ＋ 完整 token ＋ 复制/Toast；v2＝深色 Hero ＋ 三环 ＋ 时间轴 ＋ 就地编辑 ＋ 双档断点，浅色部分与 v1 逐字一致（注释自称「保证系统统一」）。要浅色取 v1 的 token 定义，要视觉冲击取 v2 的 Hero 与环，两者不冲突。

### 13. `templates\设计审查报告.html`（出处：A §10，只取结论，未全量读）

路径｜字节：`templates\设计审查报告.html` ｜ 40574B。标题：设计审查报告（**元件，不是运行时模板**）。章节骨架：核对 35 个文件的审美与可用性报告——一句话总结／色板分裂／三个关键对照对／TOP3 与 BOTTOM／「已经做对的事」6 条／P0-P3 改进路线图／视觉标杆配方 8 条（655-679 行）／设计师私人想法判据（681-696 行）。关键数据字段：不适用（散文报告）。图表：不适用。交互：不适用。CSS 组织：不适用。服务票号：未见。**逐字结论（引用原文）**：① `每个文件都在"模仿 Apple"，但 35 个文件模仿的是 4 个不同时期的 Apple…用户在产品内跳转时，视觉会不断"咯噔"`；② `35 个文件，4-5 套命名不一致的设计 token…这不是"设计系统"，是"设计联邦"`；③ 色板分裂：主色**四种蓝**、二级灰**三种灰**；④ TOP3＝`help_center.html`（唯一完整动效体系：Toast ＋ 弹簧复制 ＋ 三角箭头旋转；三层 `details` 圆角递减排 8→6→4px；唯一考虑 `env(safe-area-inset-bottom)`；复制按钮 4 状态反馈最完整）、`weight_log_receipt.html`（64px 大数字 ＋ 绿色 radial 光晕 ＋ SVG 趋势折线 ＋ area fill ＋ 最新点橙高亮；移动端 64→38px）、`home_dashboard.html`（token 体系最完整；KPI+Todo+Logs+Actions 四段式；`.log-row` 用 `grid 44px 1fr auto`；`#backTop` 毛玻璃；移动端 KPI 保 2 列）；⑤ 「已经做对的事」6 条：Apple 框架内 90%、**数据可视化零重库全手写 SVG**、过程型 HTML ＋ 复制 prompt 模式统一、移动端适配 28/35、`tabular-nums` 普遍、空状态非白屏；⑥ P0＝抽 `_tokens.css` 共享文件 ＋ 统一到 A 系 `#007aff` ＋ `--ink/--ink2/--ink3` ＋ `--lineS` ＋ SF Pro Display，删除 C 系（`--purple`／`#F2F2F7`）与 D 系（`font-size:13px` ＋ `em/%`），统一输入框为 A 系；收口句 `最高 ROI：P0(统一 token) + P1(统一 Hero + 复制按钮)，2-3 天工作量，消除 80% 不一致感`；⑦ 私人想法判据：**emoji 不是不能用，是不能用在标题里**；**渐变不是不能用，是不能"不可见地用"**；`"AI 味"是"加了不该加的"，删掉就好（2 小时）；"工具感"是"少了该有的"，要补结构（2 天）`。**取用纪律**：只取结论，不全量读；其中「抽共享 token 文件」的落点在**本仓公共层**（见裁决 9、10），不在技能模板内自造。

### 14. `templates\health_dashboard.html`（出处：B §2 · 邻近族）

路径｜字节：`templates\health_dashboard.html` ｜ 12895B。标题：`健康仪表盘 · 卡路里`；`h1#title` 文案写死「综合健康报告」。章节骨架：`header.hero`（`h1#title` ＋ `div.sub#subtitle` ＋ `#statusArea`）→「🎯 今日该做什么」（`action` 行列表：`icon` ＋ `text strong`／`small`）→ 4 张维度卡（`head` ＋ `h3` ＋ `badge`）：🔥 摄入／🏃 运动／⚖️ 体重／📉 缺口 → `copy-section`「📤 复制回 AI（让 AI 帮你规划）」`pre`。关键数据字段：未见 `D.*` 取值（变量名非 `D`，直读 `__P__`）；模板内出现 `e.coverage_pct`、`w.trend`、`w.trend_label`、`calBadge`、`deficitBadge`。图表：无 canvas／svg／charts 调用，纯卡片 ＋ 徽章。交互：`copy-section` ＋ `pre` 承载可复制文本；`.btn.copied` 提供复制态反馈（绿底）。CSS 组织：`<style>` ＋ 共享占位；`:root` 更丰富——`--accent --accent-soft --bg --border --card --fg --fg2 --fg3 --green --green-soft --orange --orange-soft --red --red-soft --shadow`；含 `hero`／`status.ok`／`status.warn`／`action`／`copy-section` 专有块。服务票号（实测）：无——`#39` 是实体假命中：本件 `&#39;` 出现于 206 行 `escapeHTML` 表的撇号项（`"'":'&#39;'`），不是票号。**本图定位**：邻近族·仅作融合素材·不在本图范围；按裁决 1 取其两件独有资产——「今日该做什么」动作列表 ＋「复制回 AI」块。

### 15. `templates\contraindication_report.html` ★core（出处：B §8 · 邻近族）

路径｜字节：`templates\contraindication_report.html` ｜ 22654B（报告族分派内最大）。标题：`禁忌扫描报告 v2 · 卡路里`；`h1#title` 写死「健身计划禁忌扫描」。章节骨架：`eyebrow` ＋ `h1`／`sub` → `kpi-grid` 6 张（`sessions/movements/safe/errors/warns/hits`，各带顶部语义色）→ `pills` 筛选区 →「扫描概览」→ 命中列表（`section-title` ＋ `part-group`／`part-header` ＋ `hit` 卡：`hit-header/hit-tag/hit-name/hit-rule/hit-reason/hit-usedin` ＋ `alternatives` 替代区）→「已选替代 (N)」`selected-area`／`selected-list`／`selected-item` →「复制修改指令」`copy-preview` ＋ `btn-row`〔📋 复制修改指令／📊 完整报告／↺ 清空选择〕。关键数据字段：`SUMMARY`〔`scanned_sessions/scanned_movements/safe_skipped/by_severity.error/by_severity.warn/total_hits`〕、`HITS`〔`movement_name/rule_name/reason/used_in/severity/error/warn`〕、`alt.selected`。图表：无。交互：族内最重——severity 筛选 pills、「已选替代」多选状态机（`selected-area`／`count`／`clearAll()`）、**二段复制**（`copyModify()` 只出修改指令 ／ `copyFull()` 出完整报告，605／613 行）、`.btn:disabled` 禁用态、`.btn.copied` 绿底态。CSS 组织：**独立设计体系**（与前族不同）：`--ink --ink2 --ink3 --line --bg-soft --bg-section --card --accent --green/orange/red-soft --gray --shadow --shadow-sm --r --r-sm --r-lg`（圆角也变量化）。服务票号（实测）：无——`#39` 是实体假命中：本件 `&#39;` 出现于 378 行 `escapeHTML` 表的撇号项（`"'":'&#39;'`），不是票号；另 385／470／559 行有 BUG #2／#3 修复注释（BUG 编号，非票号）。**本图定位**：邻近族·仅作融合素材·不在本图范围——它是健身计划禁忌扫描（`SUMMARY.scanned_sessions`／`movements`），属训练计划族，与 8 条报告唤醒词无对应；**只取交互与样式资产，不取业务**。

### 16. `templates\nutrition_analysis.html`（出处：B §3 · 邻近族）

路径｜字节：`templates\nutrition_analysis.html` ｜ 12467B。标题：`卡路里 · 营养分析`。章节骨架：`meta-bar` ＋ `type-badge` → `h1#title`／`p.sub` → `kpi-grid` →「三大营养每日占比(蛋白/碳水/脂肪)」（图 ＋ `legend`）→「钠 / 糖 / 纤维 日序列」（图 ＋ `legend`）→「钠 / 糖 / 纤维 综合报告」`table#combinedTable` →「营养改进建议(按优先级)」`table#adviceTable` → `div.insight` → `footer.src`。关键数据字段：`window/start/end/group/balanced/off_dims/shares/series/sodium/sugar/fiber/days/items/insight`。图表：`charts.line` 多序列，同样走 188 行「各指标独立 min-max → 归一化共享 0-100 域近似」注释。交互：无 tab／折叠；表格承载「综合报告」与「建议」两段；`.btn` 样式备而未用（仅在 CSS），实际动作走共享 `actionBar`。CSS 组织：`:root` 同 `health_report`（`--fg…--soft`）；`table-wrap` 横向滚动。服务票号：`#317`；`srcLine` 写 `render_analysis.py --view nutrition`。**本图定位**：邻近族·仅作融合素材·不在本图范围。

### 17. `templates\nutrition_detail.html`（出处：B §4 · 邻近族）

路径｜字节：`templates\nutrition_detail.html` ｜ 6147B（营养族内最小）。标题：`卡路里 · 营养素深度`；`h1` 写死「🧪 营养素深度」。章节骨架：`head` → `h1`／`sub` →「微量营养素 vs 推荐」`row` 列表（`name` ＋ `track`／`fill` ＋ `pct` ＋ `val`）→ `warn-box` → `footer`（`src` ＋ `btn-group`）。关键数据字段：仅 `data`、`status`（内层结构在渲染器，模板按 `it.status` 上色）。图表：无（用 `bar-line` 进度条代替）。交互：`footer .btn-group` 复制按钮组，`.btn.copied` 绿底态；小屏 `min-height:44px` 触控适配（53-56 行）。CSS 组织：`:root` 同族；专有 `bar-line`／`track`／`fill`／`warn-box`。服务票号：`#44`（注释「#44:与全场景统一」，指按钮组统一）。**本图定位**：邻近族·仅作融合素材·不在本图范围。

### 18. `templates\nutrition_ratio.html`（出处：B §5 · 邻近族）

路径｜字节：`templates\nutrition_ratio.html` ｜ 12604B。标题：`卡路里 · 营养配比`；`h1` 写死「🥗 营养配比」。章节骨架：`meta-bar` ＋ `type-badge` → `h1`／`sub` → `kpi-grid` →「热量来源占比」（`pie-wrap` ＋ `pie-legend`）→「推荐范围对比」（`range-mark` ＋ 表格）→ `footer`。关键数据字段：`data`、`status`（内层在渲染器）。图表：`charts.donut`（**族内唯一环形图**）。交互：`footer .btn-group` 复制组；`.btn.copied` 态；`table-wrap` iOS 惯性滚动（89 行）。CSS 组织：`:root` 多出语义色 `--prot --carb --fat --r1 --r2 --r3`（三大营养素与三档推荐范围各占一色）；小屏 `.section table` 降到 10px。服务票号：`#44`、`#317`。**本图定位**：邻近族·仅作融合素材·不在本图范围。

### 19. `templates\six_factors.html`（出处：B §6 · 邻近族）

路径｜字节：`templates\six_factors.html` ｜ 8381B。标题：`卡路里 · 每日 6 因素综合`；`h1` 写死「📊 看每日 6 因素综合」。章节骨架：`meta-bar` ＋ `type-badge` → `h1`／`sub` → `kpi-grid`（KPI 带 `delta`／`deltaCls`）→「最近 7 天走势(摄入/运动/饮水/体重)」（图 ＋ `legend`）→「异常标注」→ `div.insight` → `footer.src`。关键数据字段：`date/week/kpis/insight/anomaly/degraded`。图表：`charts.line` 多序列（110-111 行注释记「Y 轴刻度文字缺失 — 均记偏离」）。交互：无按钮逻辑；共享 `actionBar`。CSS 组织：`:root` 同族标准集。服务票号：`#317`、`#356`；`srcLine` 写 `render_analysis.py --view six`。**本图定位**：邻近族·仅作融合素材·不在本图范围；其 Y 轴刻度文字缺失是**公共层 `charts.js` 能力缺口**的证据之一（见第 9 节缺口 2）。

### 20. `templates\goal_progress.html`（出处：B §9 · 邻近族）

路径｜字节：`templates\goal_progress.html` ｜ 17521B。标题：`目标进度 · 卡路里`。章节骨架：`hero`（`eyebrow` ＋ `h1#title` ＋ `sub`）→ `paused-banner`（`paused-icon`／`paused-title`／`paused-sub` ＋ `btn-restart`）→ `kpis` → `section`「目标 vs 实际」（`row`：`name`／`num`／`bar-bg`／`bar-fg`／`badge`）→ `section.vs-chart`「目标线 vs 实际线」（近 N 天）→ `section` 明细表 → `copy-row` ＋ `guide`（`guide-step`／`guide-no`）。关键数据字段：`meta/title/subtitle/mode/kpis/context_kpis/items/itemsTitle/itemsHint/table{title/hint/cols}/summary/paused_summary/guide/empty`。图表：`charts.line`（`vs-chart` 段内联生成）。交互：**暂停横幅**（仅提示、数据照常）＋ 重启复制按钮 `btn-restart`（`copied` 绿底态）；`copy-row` 复制区；小屏下 `row` 改 2 行网格、表格用 `:has()` 按列数自适应列宽（87 行整段）。CSS 组织：`--ink --ink2 --ink3 --line --bg --card --accent --accent-soft --green --green-soft --orange --orange-soft --red --red-soft --shadow`；按钮 999px 胶囊 ＋ `min-height:44px`。服务票号（实测）：`#66`（57、58）、`#317`（183）、`#8`（235「对齐 #8」，性质待核）。**本图定位**：邻近族·仅作融合素材·不在本图范围；其「提示与数据解耦」的暂停横幅与 `:has()` 表格自适应是最省代码的两处资产。

### 21. `templates\diet_overview.html`（出处：B §10 · 邻近族）

路径｜字节：`templates\diet_overview.html` ｜ 7682B。标题：`卡路里 · 饮食总览`；`h1` 写死「🍱 饮食总览」。章节骨架：`head` → `h1`／`sub` → `kpi-grid` →「本周累计」（`chart-title` ＋ `chart` ＋ `chart-hint`）→「本月累计」（同上）→ `footer`。关键数据字段：`data`、`status`。图表：`chart` 容器（实际库在渲染器侧决定）。交互：`footer .btn-group` 复制组（`#44` 统一），`.btn.copied` 态，小屏 `min-height:44px`。CSS 组织：`:root` 族标准集；专有 `period`／`range`／`chart-title`／`chart-hint`。服务票号：`#44`。**本图定位**：邻近族·仅作融合素材·不在本图范围。

### 22. `templates\meal_distribution.html`（出处：B §11 · 邻近族）

路径｜字节：`templates\meal_distribution.html` ｜ 11004B。标题：`卡路里 · 餐别分布`；`h1` 写死「🍽️ 餐别分布」。章节骨架：`head` → `h1`／`sub` → `kpi-grid` →「餐别热量占比」（`dist-wrap` ＋ `dist-pie`／`dist-pie-center` ＋ `dist-list`：`dist-row`／`dist-label`／`dist-track`／`dist-fill`／`dist-num`）→「明细」`table-wrap#mealTable` → `footer`。关键数据字段：`data`、`status`。图表：纯 CSS 分布条 ＋ `dist-pie`（无 JS 图表库）。交互：`meal-tag` 色标；小屏把 `#mealTable` 整体改卡片式（`tr::before` 左侧 3px 强调条，逐 `td` 重排，79-81 行），`td:nth-child(2)` 隐藏——**族内最完整的移动端表格降级方案**。CSS 组织：`:root` 族标准集；专有 `dist-*`／`meal-tag`／`one-line`／`big`／`small`。服务票号：`#44`。**本图定位**：邻近族·仅作融合素材·不在本图范围。

## 8 条报告 → 老模板映射表

照搬 B 侧 §「8 条报告 → 老模板映射表」。

跨全部 79 件关键词扫描结论：`BMI`／`TDEE`／`BMR`／`蛋白`／`水分`／`评分`／`健康趋势`／`健康报告` 八词**同时落在 `health_report.html` 一件之内**（命中行 128／129／130／131／192-303）。其它件命中均为邻近语义（体重页的 BMI 回显、目标配置页的 BMR 算式、HELP 文件的词表），非报告承担者。

承担机制：`scripts\render_analysis.py --view report --kind <K>` → 全族唯一模板 `templates\health_report.html`。渲染器 297-455 行按 `kind` 分派 9 个分支，未知 kind 抛 `ValueError`（455 行）。`SKILL.md` 642 行登记为「**A2 健康报告(19)**」：看健康报告 11 个窗口变体 ＋ 下列 8 条 ＝ 19 场景。

**权威映射证据**：`render_analysis.py:704-709` 的 `scene` 命名表 —— `scene = '健康报告' if args.kind == 'full' else {'bmi': '看BMI报告', 'tdee': '看TDEE报告', 'bmr': '看BMR报告', 'protein': '看蛋白质摄入报告', 'water': '看水分摄入报告', 'score': '看综合评分', 'trend': '看健康趋势', 'compare': '健康报告(含对比)'}[args.kind]`。这是老侧**代码内的自述映射**，与 `health_report.html:128-131` 的 `titles` 表逐项对应，亦与 `SKILL.md` 642 行场景登记一致 —— **三方互证**。

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

补充事实（照录 B）：另有 `templates\health_dashboard.html`（`render_health_dashboard.py`）在 `SKILL.md` 845 行承接唤醒词「**查**健康报告」（分析分类），与上表「**看**健康报告」是两条不同唤醒词、两个不同件。二者 `h1` 都自称健康／综合健康报告，易混。按裁决 1，新侧对齐 `health_report.html`，`health_dashboard.html` 作素材。

**结论一句话**：8 条报告唤醒词**没有 8 个模板**，而是**1 个多态模板的 8 个 `kind` 分支**；老侧已有 9 个 `kind`（多出 `full`）。

## 老侧优秀点（融合候选）

合并 A 侧 19 条与 B 侧 13 条，去重后按「通用底座／图表／交互／文案契约／安全护栏」归组。每条给：出自哪件哪行 ＋ 为什么值得吸收 ＋ 对应新页面。

**统一纠正（裁决 9，取代 A 侧原表述）**：A 侧原文写「老侧那套 token（`--ink/--ink2/--ink3`、`--r-sm/--r/--r-lg`、三档 `--shadow`、`--ease/--ease-spring`）`@import` 即可」——**此表述作废**。老侧那套 token 名在本仓**零命中**，本仓样式唯一真相源是 `packages/base-render/`（包名 `base-paint`）的 `src/spec/style.ts:12` `CSS_VAR_TOKENS`（11 个，冻结）＋ 产出器 `src/style.ts:1291 buildStyleSheet()`；红线**原意**「不自造第二份表」——原文见 `packages/base-render/src/style.ts:10`（「`:root` 的 11 个 token 逐值取 `CSS_VAR_TOKENS`（doc:273-289），**不自造第二份表**（doc:303）」）与 `docs/base-paint-contract.md:303`（「**不得**因此自造第二份 token 表或样式常量（§4.3 第 6 条）」）。故本清单凡涉老侧 token，一律改为：**「老侧这套仅作设计意图参考（圆角梯度／三档阴影／弹簧缓动）；本仓缺对应 token，若确需，属公共层能力，另立票，不在 #383／#384／#385 内自造」**。A 侧的 token 相关条目按此降级保留。

### 通用底座

1. **单模板多态分派（kind switch）** —— 出处 `health_report.html:128-131` ＋ `192-304`（`titles[kind]` 标题表 ＋ `full`／`single` 双 block 结构 ＋ KPI/图表/表格三原语 ＋ 125 行 `errorReceipt` 兜底）＋ `render_analysis.py:297-455` 九个分支、未知 kind 抛 `ValueError`（455 行）；`predict_report.html` 亦以 8 种 kind 复用同一模板（A §1）。为什么值得吸收：19 场景零模板膨胀，五套原语只写一份，新增一种报告只加一个分支。对应新页面：#384 的 8 张报告页共用底座（`health_report` 接受多 kind，命令层 8 条各自映射）。
2. **`meta-bar` ＋ `type-badge` 类型徽标** —— 出处 `calorie_deficit.html:79-82`／`combined_analysis.html:64-67`／`predict_report.html:57-60`（三件逐字同构）。为什么值得吸收：左格固定「日期区间 · 共 N 天」、右格固定「这是什么页」的徽标，把页面类型从 URL 搬进正文，一个模板家族里用户唯一的「我该看哪页」判断就靠它。对应新页面：#383／#384／#385 开头三行共用一套，零成本统一。
3. **移动端表格降级 ＋ `tabular-nums`** —— 出处 `meal_distribution.html:70-81`（`tr::before` 左侧 3px 强调条、逐 `td` 重排、隐藏次要列，**族内最完整**）＋ `goal_progress.html:87`（`:has()` 按列数自适应列宽，最省代码）＋ `calorie_deficit.html:68-69` `table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}` ＋ `calorie_deficit.html:48` `.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}`；设计审查把 `tabular-nums` 列为「已经做对的事（90% 文件做到）」。为什么值得吸收：窄屏不靠横滚硬撑而改结构；上下行数字对得齐是数据密集页的底线。对应新页面：#385 明细表、#384 各报告表格段、三页任何 6 列以上表。
4. **`tfoot` 汇总行** —— 出处 `calorie_deficit.html:109` ＋ `:189-191` 渲染逻辑（`<tfoot id="tfoot">` 渲染总摄入/总消耗/总缺口，正负沿用与逐日行同一套 `.deficit-pos/.deficit-neg`）。为什么值得吸收：用户最终问题一定是「这周一共多少」，把合计做成表格的一部分而非另开 KPI 少一次视线跳转，正负配色与行一致就不会误读。对应新页面：#385（首选）、#383（若给逐日投影表）。
5. **`actionbar-zone` 注入位 ＋ 共享注入契约（模板零按钮代码）** —— 出处 `predict_report.html:172`／`calorie_deficit.html:203`／`combined_analysis.html:250`／`health_report.html:312-313` 等每页一行注入；`公共组件\assets\base.js:301-326` 的 `actionBar(p, extra?, opts?)`（契约：渲染 `.hm-actions`，含 ① `p.data.scene.buttons` 场景按钮〔`{label,text,kind}`〕② 固定「复制数据」ghost → `copyText(buildDataText(p))` ③ 固定「复制日志」ghost → `copyText(buildLogText(p))` ④ `opts.preview` 时额外渲染复制预览浮层）；`_base_render.py:28,39-75` `inject_base()` 填占位、模板声明了 `CHARTS-HELPERS` 而公共层缺 `charts.js` 时**报错而非静默**（65 行）。为什么值得吸收：模板只管「画什么」，「能点什么」归运行时，新增一个动作不必改 N 个模板；契约显式、缺口可见。对应新页面：三页一律保留此位并沿用既有能力。
6. **`errorReceipt` 兜底** —— 出处各件 `if(!D||D.status!=='ok'){document.body.innerHTML=window.errorReceipt({message:'数据未注入或状态非 ok'});return;}`（B §1 记 `health_report.html:125`）。为什么值得吸收：数据没注入时页面必须变成一张「出错了」回执，而不是满屏 `--` 与 `NaN`；一行成本的健壮性。对应新页面：三页全部。
7. **语义 CSS 变量分层（仅作设计意图参考）** —— 出处 `contraindication_report.html:220-250`（`--ink/--line/--shadow/--r/--r-sm/--r-lg` 全变量化，连圆角与阴影都变量化）vs 族标准集（`--fg/--border`）；两套命名并存说明老侧自己在演进。为什么值得吸收：命名分层的**思路**（语义名 ＋ 圆角/阴影/缓动也进 token）值得吸收。**按裁决 9**：本仓 token 表冻结在公共层，若确需新增，属公共层能力、另立票；三页内不自造、不 `@import` 老侧表。

### 图表

8. **`charts.line` 全手写 SVG、零重库** —— 出处 `predict_report.html:116`／`calorie_deficit.html:151`／`combined_analysis.html:173,185`／`calorie_trend.html:152`／`long_trend.html:135`（8 件模板统一调用）；`nutrition_ratio.html` 另有 `charts.donut`；两件标杆的三环与趋势图全手写；设计审查明确把「零 Chart.js/ECharts 重库」列为「已经做对的事」。为什么值得吸收：单文件 HTML 报告的体积与离线可用性靠这个，引入重库一次就推翻全库最省的优点。对应新页面：三页全部——但**必须先补 `charts.line` 的能力缺口**（置信带／真双轴／缺口面积，见第 9 节），否则只会再「记一次偏离」。
9. **`markLine` 目标线 ＋ 达标三件套** —— 出处 `health_report.html:241,256`（蛋白／水分折线画目标值）＋ `229-258`（日均／目标／达标天数／达标率 四 KPI）＋ `calorie_deficit.html:151`（摄入目标横线）＋ `calorie_trend.html:152`（`markLine:{value: summary.target}` ＋ area 填充）。为什么值得吸收：把「目标」从数值变成图形，一眼可判，且四件套只靠同一 `markLine` 能力。对应新页面：#383（预测轨迹 vs 目标）、#385（摄入目标线）、#384（蛋白／水分报告，可推广到 TDEE／BMR）。
10. **KPI 语义染色** —— 出处 `calorie_trend.html:134-137`（`dAvg>target*0.05` 染 `--bad`；`trend_value<=0` 染 `--good`）＋ `calorie_deficit.html:50-52` 三态 `.deficit-pos/.deficit-neg/.deficit-zero`（实测三态定义在 :50-52，渲染取值在 :173；:84 实为 `<h1>⚖️ 热量缺口</h1>`，原记行号有误）。为什么值得吸收：数字按「这个方向是好是坏」上色，是产品语义最省字的表达，写成一行三元、零结构成本。对应新页面：#383（速率正负）、#385（缺口正负）、#384（趋势方向）。
11. **环形进度（`ring`）＋ 图下数字条 ＋ 大数字** —— 出处 v1 `:621` 88×88 单环（`stroke-dasharray="238.76" stroke-dashoffset="43"` ＋ 中心 `.pct`）、v2 `:721` 200×200 三环（Move/Exercise/Stand，半径 85/65/45、线宽 16、`stroke-linecap:round`，每环＝半透明轨道圈 ＋ 实色进度圈）；`.lead-stat` 大数字（v2 `:785` 区）＋ `.trend-stats`/`.trend-stat` 图下数字条（v1 `:660` 区）；设计审查「视觉标杆配方」明确要求保留 `ring 进度`，并点名 `today_water` 的 ring 是「全库最克制有效的可视化」，`weight_log_receipt` 的 64px 大数字是其位列 TOP2 的核心原因。为什么值得吸收：环形进度在一屏内同时表达「达成率」和「还没完成的量」；图表给形状、数字给结论，贴在一起省掉「看图—读表」的折返。对应新页面：#385（当日缺口占目标缺口的达成率）、#383（预测终点大数字 ＋ 对目标完成度环）。
12. **目标线 vs 实际线双线图** —— 出处 `goal_progress.html:57-67`（`vs-chart` 段内联 `charts.line`）。为什么值得吸收：与 `markLine` 同类但系列化，适合「计划 vs 实绩」这种两元素长期对比。对应新页面：#383 预测页（预测线 vs 实际线）、#385（摄入 vs 消耗，老侧 `calorie_deficit` 已实装双系列 ＋ 虚线区分）。

### 交互

13. **`window.copyText(text, btnId, 成功文案)` 三参数复制 ＋ 按钮文案回写** —— 出处 `process_progress.html:495-497`（`copyContinue() → window.copyText(buildContinuePrompt(), 'btnContinue', '✓ 已复制继续指令')`；失败时按钮文案动态改 `↻ 复制继续指令(从失败步骤 · N)`）＋ `cron_setup.html:207` 同签名。为什么值得吸收：把「复制成功」的反馈做在按钮自身（移动端不遮挡内容），三参数签名让「复制什么／谁复制的／成功后说什么」在调用点一眼看全。对应新页面：#383（「按这个预测帮我排计划」）、#385（「缺口偏大，帮我把摄入调到 X」）、#384（8 页统一 footer）。
14. **弹簧复制动画 ＋ Toast ＋ 毛玻璃回顶** —— 出处 v1 `:485-497` `@keyframes copySuccess{0%{scale(1)}40%{scale(1.12)}100%{scale(1)}}`（`.copy-mini.copied{background:var(--green);animation:copySuccess .45s var(--ease-spring)}`，1.2s 还原文案）、v1 `:816` `.toast`、v1 `:570-571` `backdrop-filter:saturate(180%) blur(20px)`、`process_progress.html` 的 `#backTop`；设计审查把 `help_center` 的「弹簧复制」列为 TOP1 唯一动效体系的组成部分。为什么值得吸收：老侧唯一「有产品感而非工具感」的正反馈设计，成本极低（两个 token ＋ 一个 keyframes）。对应新页面：三页的复制按钮统一到这一套（动效值须落在本仓既有令牌允许范围内）。
15. **复制前先预览** —— 出处 `process_progress.html:283` `.copy-preview#copyPreview`（预览「将复制给 AI 的内容」）＋ `contraindication_report.html:352-354` `copy-preview`；设计审查 P1 点名选这个模式。为什么值得吸收：用户复制前能看见将送出去什么，才有胆子发给 AI；预览区天然成为「这段 prompt 好不好」的检查位。对应新页面：#384「复制回 AI（让 AI 帮你解读）」块、#383。
16. **二段复制（摘要指令 vs 完整报告）** —— 出处 `contraindication_report.html:605-613`（`copyModify()` 只出修改指令／`copyFull()` 出完整报告）＋ `:337` `clearAll()` 多选清空。为什么值得吸收：一份内容两种粒度，喂 AI 时按需取，避免把整页倒给模型；多选状态机让「我改哪几条」在页面上就定下来。对应新页面：#384 八页统一 footer 的两档动作。
17. **「复制回 AI」闭环块** —— 出处 `health_dashboard.html:118-125,183`（`copy-section` ＋ `pre` ＋ `.btn.copied` 绿底反馈）＋ `review_template.html`（`📤 复制回 AI（让 AI 帮你解读）` ＋ `pre#copy-text` ＋ `#copy-btn`）。为什么值得吸收：报告页不是终点，复制文本直接喂下一轮规划，形成读→改→回写闭环。对应新页面：#384 八页 footer。

### 文案契约

18. **从结构化数据拼出的自然语言 prompt，而非裸摘要** —— 出处 `process_progress.html:434-441`（复制内容形如「我的 4 步流程中间停了，有 1 步失败。请帮我从失败步骤开始重试：… 已完成 2/4 步 / 失败 1 步 / 待办 1 步」）＋ `anomaly_report.html:84`（`#copyDxBtn` 一键把诊断结论转编号纯文本）。为什么值得吸收：这是「HTML 当生成 prompt 的可视化编辑器」（设计审查点名表扬的产品决策）的真正落地——HTML 的价值不在展示，在于把用户手动敲 prompt 的活接过来。对应新页面：#383（把假设与轨迹拼成「请据此排训练/饮食计划」）、#384（拼成「请解读这份复盘」）。
19. **置信度分级诊断卡（结论／置信／证据／动作 四段）** —— 出处 `anomaly_report.html:30-33,96-104`（`.conf-高` 红／`.conf-中` 橙／`.conf-低` 灰）。为什么值得吸收：把 AI 结论拆成可读、可争辩、可复制的四段，避免一句「建议改善」；置信度分级让用户知道该信几分。对应新页面：#384（综合评分报告、健康趋势报告、健康报告含对比）。
20. **`fields→form→prompt→copy` 单向漏斗** —— 出处 `cron_setup.html`（`D.data.fields` 驱动表单生成，`#promptSection` 默认 `display:none`，点生成才出 prompt 与复制按钮）。为什么值得吸收：与 `process_progress`「已执行 → 复制继续」正好构成一对（一个向前派活、一个向后续跑）；表单字段由数据驱动，模板不写死。对应新页面：#383（「改假设重算」的交互参照）。

### 安全护栏

21. **显式降级横幅（degrade）＋ 提前 return** —— 出处 `predict_report.html:38` 定义、`:100-107` 使用（`degraded` 为真时橙色横幅写清原因，`#content` 与 `#insight` 整块 `display:none` 后 `return`）＋ `anomaly_report.html:34,62,89-92`（`D.degraded` ＋ `D.degrade_msg`，文案「⚠️ 数据不足,已降级」）＋ `six_factors.html` 的 `degraded` 字段。为什么值得吸收：报告类页面别硬编——宁少画一屏，不画一屏假数；且把「为什么没结论」放在最显眼处，而不是丢个空图。对应新页面：三页全部，尤其是 #383（预测最易因数据不足不可算）与 #385（缺 TDEE 时同理）。
22. **BMR 危险信号段（生理安全护栏）** —— 出处 `health_report.html:216-228`（`under_bmr_days` 计数 ≥3 触发 `⚠️ 连续多日低于 BMR`，并列出「低于 BMR 的日期」表）。为什么值得吸收：把生理风险做成显式告警而非埋进数字，是族内唯一的安全护栏；与 `calorie_deficit` 的「健康范围 +300~+500 卡/天」`predict_report` 的 `0.5-1.0 kg/周` 可行性判定同源。对应新页面：#384（BMR 报告、综合评分报告作为扣分项）、#385（判定越界时给安全提示）。
23. **口径常量集中显式化** —— 出处 `calorie_deficit.html`（`7700 卡/kg`、`target.weekly_deficit_per_day`、±5%／±10% 判定散在展示层）＋ `predict_report.html` 八 kind 的阈值字面（`0.5-1.0 kg/周`、`+300~+500 卡/天`、`σ>300`、`±10%`）。为什么值得吸收（A 侧融合建议 2-turned-guardrail）：这些常量决定「合理」怎么判，散在展示层就没人能统一改；集中到一处并在页面底部以「口径说明」卡显式列出，用户才知道结论凭什么。对应新页面：#385（首选）、#383。

### 一处必须顶住的不一致（登记）

`predict_report.html`／`combined_analysis.html`／`long_trend.html` 三件仍用旧 token 名（`--fg/--fg2/--fg3/--soft`、`--accent:#0071e3`），与 P1 标杆要求的 `--ink/--ink2/--ink3/--lineS` ＋ `#007aff` 不一致（A 侧原文结论）。**按裁决 8／9／10**：新侧一律用本仓既有令牌（唯一真相源 `packages/base-render/src/spec/style.ts`），不跟随老侧任一套命名，也不要求老侧迁移；老侧两套命名并存仅作历史事实记录（见裁决 7 ②）。

## 融合建议（按票分节）

### 实现硬约束（三页通用，先于以下所有建议生效）

**样式产出路径**：新页样式一律走 `buildStyleSheet().css + blocksCss()`（`packages/base-render/src/style.ts:1291` 起），**不走 `extraCss`**——旁证 `src/body/bodyDocs.ts:5`、`src/diet/nutritionPortDocs.ts:23` 两处现有页面即用此路径。`extraCss` 三禁（`:root` 改写／Q14 禁入项／深色区）**抛错**，不是警告。

**模板侧纪律**：模板只留注入槽（`<!--SHARED-CSS-->` 等既有槽位），不写颜色字面量。事实校验：技能侧 6 件 `templates/*.html` 与 `src/render/*.ts` 的颜色字面量计数**全为 0**，样式靠槽内联注入——这批 `templates/*.html` 是**死模板**（`helpCenter.ts:282` 注释逐字如此），**不是新页样式来源**。

**主色**：既有令牌 `--blue`（`packages/base-render/src/spec/style.ts:19`，值 `#007aff`），`--blue2:#0a63ce` 为按压态（`:20`）；**不改值、不新增表**（裁决 8，见第 11 节）。

**禁止**：三页内自造 token 表、移植／`@import` 老侧 token 表（裁决 9）。

### #383 预测页

来源：A 侧预测族草案 5 条 ＋ B 侧可复用件。同一条两处提及时的合并结果如下。

1. **老侧 8-kind 分支表 ＋ 新侧类型分发／参数校验 ＝ 一个入口、八种预测。** 老侧把 `weight_forecast / weight_target / weight_sim_cut / weight_sim_target / calorie_forecast / calorie_goal / calorie_deficit / calorie_stability` 八种 KPI 组合塞进同一模板，靠 `D.kind` 分支（展示层 `if/else if` 串到 155 行）。合成：**保留八种 kind 的 KPI 文案与阈值字面**（`0.5-1.0 kg/周`、`7700 卡/kg`、`+300~+500 卡/天`、`σ>300`、`±10%`），把「哪种 kind 给哪四格」搬到数据侧算好再注入（模板只做渲染表查找），新增 kind 不改模板。
2. **老侧 `.degrade` 降级横幅 ＋ 新侧空状态规范 ＝ 预测不可算时给「差多少数据」。** 老侧只用一句 `degrade_msg`；合成：横幅里带上「还差 N 天数据／缺哪项字段（如 TDEE）」，并保留老侧「隐藏 `#content` 与 `#insight` 后 return」的动作——不画假图。
3. **老侧 `forecast.points[]={date,value,lo,hi}` ＋ 新侧补齐图表接口 ＝ 真正画出置信带。** 老侧 `predict_report.html:113` 自认「置信带无接口 → 只画主线（记偏离）」，KPI 里仍显示 `lo~hi` 数字。合成：新侧把图表能力扩到支持「上下界带」（两条半透明面积系列夹出 band），**老侧数据结构一字不改就能受益**——三个新页里性价比最高的一处超车。**注意**：该能力属公共层图表接口，按裁决 9／10 若有公共层改动，另立票，不在本票内改公共层契约（裁决 6）。
4. **老侧 v1 标杆 `.hero-number` 大数字 ＋ `.ring` 环形进度 ＋ 新侧页面骨架 ＝ 预测页头屏。** 老侧预测页头屏只有 `h1 + .sub + kpi-grid`，缺「结论感」。合成：头屏换「左大数字（预测终点 X kg）＋ 右 ring（对目标完成度 %）」，下面再接 `kpi-grid` 四格。**注意**：设计审查要求「无背景 hero、无渐变、无 emoji 入标题」，v1 标杆恰好是无背景 ＋ eyebrow ＋ h1 ＋ sub ＋ status-pill 的合规形态，可直接照搬形态（token 取值仍走本仓）。
5. **老侧 `process_progress.html` 复制继续链条 ＋ 新侧行动出口 ＝「按这个预测给我排计划」。** 照 `process_progress` 三按钮模式做两个——「按这个预测排训练计划」「假设不成立时怎么改」，在 `.copy-preview` 里先显示将发出的文本（`假设说明 + 轨迹 + 目标 + 判定` 四段拼装，照 `buildContinuePrompt()` 写法）；`cron_setup.html` 的 `fields→form→prompt→copy` 单向漏斗可作「改假设重算」的交互参照。**动作条落点**：按裁决 6 沿用既有 `actionBar` 能力（复制数据／复制日志），本图不新增场景按钮契约。
6. **老侧 `calorie_trend.html` 的分析指标 ＋ 新侧预测页 ＝ 给预测加「可信度背景」。** 合规率／工作日 vs 周末／偏差分档三件指标与预测的「稳定性」语义互补（`calorie_stability` 已有 `σ>300` 判定）；搬三格 KPI 作预测页第二屏。

### #385 缺口页

来源：A 侧缺口族草案 5 条。

1. **老侧 `calorie_deficit.html` 双系列折线（摄入实线／消耗虚线 ＋ 摄入目标 `markLine`）＋ 新侧图表接口 ＝ 补齐「缺口面积」。** 老侧图上有三条信息却没有「缺口」本身的可视化。合成：在两条线之间填一层差异面积（正值绿、负值红），把 `series[].deficit` 从表格搬进图里；老侧 `--intake:#5856d6`／`--burn:#34c759` 专色保持不变（专色是「摄入 vs 消耗」一眼可辨的根因，别换）。
2. **老侧 `.deficit-pos/.deficit-neg/.deficit-zero` 三态 ＋ 新侧需求 ＝ 缺口页唯一的口径常量表。** 老侧判定散在展示层（`p.deficit >= targetDef`／`> 0`／else 三档 `statusBadge`）。合成：把 `7700 卡/kg`、`target.weekly_deficit_per_day`、`±5%`／`±10%` 集中到一处，页面底部以「口径说明」卡显式列出（老侧只在 KPI `.extra` 里零散暗示），让用户知道「合理」凭什么判。
3. **老侧 `tfoot` 汇总行 ＋ 新侧时间轴（v2 `.timeline`）＝ 逐日明细双读法。** 同一份逐日数据渲染成「表格（省空间、可对齐）＋ 时间轴（可读叙事）」两段，默认表格、时间轴折叠；汇总仍在 `tfoot`（老侧做法，别改成另开 KPI）。
4. **老侧 `calorie_trend.html` 三个分析指标 ＋ 新侧缺口页 ＝ 从「逐日缺口」升到「缺口结构」。** `工作日 vs 周末`（`weekday_avg/weekend_avg/weekend_diff`）、`合规率`（`compliance_rate/compliant_days`，判定 `≤ 目标+5%`）、`7 天变化`（`trend_value/start_avg/end_avg`）这三件缺口页一个都没有。合成：直接搬三格 KPI，把「日均缺口 ± 理论减重」从两格分析扩成五格——用户真正想知道的是「我哪天在崩」，不是「我平均多少」。
5. **老侧 6 列明细表 ＋ 小屏内滚 ＋ 新侧 v1 标杆的复制／Toast／毛玻璃回顶 ＝ 缺口页的收尾三件。** 老侧表格已最全（日期/摄入/消耗/缺口/目标/状态 ＋ 合计），`.table-wrap` 小屏内滚已就位；缺的是「看完之后能做什么」。合成：表格下方接 `review_template.html` 的「复制回 AI」段（`pre` ＋ 单按钮），配 v1 的弹簧反馈与 Toast，并把 `process_progress` 的 `#backTop` 补上；移动端断点照 v2 用双档（767px 与 639px），别只留 640px 一档。**例外**：老侧移动端表格降级按 B 侧更省代码的 `meal_distribution.html:70-81` ＋ `goal_progress.html:87` 方案（表格改卡片式 ＋ `:has()` 自适应），不要只靠横滚。

### #384 报告族

**形状定论（裁决 3）**：**命令层 8 条独立、渲染层 1 个多态底座**。理由：新侧票面明令「一词一条命令、不向 `calorie.view.health` 塞形态参数」⇒ 命令层**必须** 8 条独立；渲染层若铺 8 张独立页，会把同一套 KPI 卡／折线／表格／降级／复制原语复制 8 遍，违反本仓「概念唯一」「接口小里面厚」两条铁律。用户感知是 8 张页、工程上是 1 个底座，两者不矛盾。支撑证据三条：① 老侧已用 19 场景证明该形状可行，且 `render_analysis.py` 单命令 `--view report --kind K` 即可分派；② 8 张独立页会复制同一套原语 8 遍，任何一次样式或图表契约改动要改 8 处，漂移风险线性增长；③ 8 条唤醒词在命令层仍是 8 条独立命令、独立唤醒词、独立场景号。

**判定线（采纳 300 行）**：单页体量差异 < 300 行 CSS／JS 就合，超过再拆。若「综合评分报告」需独立主题（如仪表盘视觉）或「健康报告（含对比）」体量显著更大，可让底座允许 `kind` 级局部覆盖，而非拆件。

**先验顺序（按票面）**：先跑通「**看BMI报告**」这一 `kind`（它同时具备折线 ＋ 里程碑 ＋ 分类阈值三段，是最好的形状试验田），验证底座契约后再铺其余 7 条。

1. **共同底座**：老侧拿 `health_report.html` 的 `full`／`single` 双 block 结构 ＋ `titles[kind]` 标题表 ＋ KPI／图表／表格三原语 ＋ 125 行 `errorReceipt` 兜底；新侧拿命令登记与分派（8 条独立唤醒词）。合成：一个新模板 `health_report` 接受 8 个 `kind`，命令层 8 条各自映射。
2. **看健康报告对齐（裁决 1）**：「看健康报告」对齐 `health_report.html`（`kind=full`／`compare`），`health_dashboard.html` 降为融合素材，取其两件独有资产——「今日该做什么」动作列表 ＋「复制回 AI」块。两件同名属历史命名撞车，记录在案（出处见第 8 节裁决 1）。
3. **BMI 报告**（先验件）：老侧拿 4 张 KPI（当前 BMI／分类／身高／采样点）＋ 历史轨迹折线 ＋「分类里程碑」（`from → to`）；新侧拿体重底座与档案身高来源。合成：KPI 顶栏 ＋ BMI 折线 ＋ 分类分档色带 ＋ 里程碑流水。老侧分类阈值文案「偏瘦<18.5 正常<24.9 超重<28 肥胖≥28」直接搬。
4. **TDEE 报告**：老侧拿 4 张 KPI（TDEE／日均摄入／静态缺口／计算假设 `BMR × 活动系数`）与 `Mifflin-St Jeor` 口径；新侧补图——老侧此处**无图**，是明确缺口。合成：KPI ＋「TDEE 随体重/活动系数变化」曲线。
5. **BMR 报告**：老侧拿危险信号段（`under_bmr_days` ≥3 告警 ＋ 危险日期表）与「TDEE ÷ 系数」反推口径；新侧补 BMR 曲线。合成：BMR／TDEE 双值 KPI ＋ 危险信号段（原样搬）＋ 低摄入日期表。
6. **蛋白报告 ＋ 水分报告**：老侧拿 `markLine` 目标线折线 ＋「日均／目标／达标天数／达标率」四件套；新侧拿目标管理真实目标值（`p_goal`／`daily_goal` 表）。合成：两页同构，抽出「目标达成页」模板，只换单位与目标源。
7. **综合评分报告**：老侧拿 `gauge` 三色渐变仪表条 ＋ 分项分数表（每项带三色条）＋「最低分项」高亮（259-269）；另可吸收 `review_template.html` 的「8 dim 卡 ＋ P1 重点标记 ＋ 异常天门控」结构（**吸收结构，不吸收其 C 系配色**，A 侧结论）。新侧拿评分模型分项定义。合成：仪表条 ＋ 分项条表；建议把老侧 `items` 六维（饮食/运动/体重/饮水/体脂/围度）显式化为可配置项。
8. **健康趋势报告**：老侧拿「前段均分／后段均分／拐点数 ＋ 上升/下降/平稳」判据（280-293），这套「前后段对比」极省算力，建议原样搬；新侧拿趋势算法底座。合成：方向徽章 ＋ 前后段 KPI ＋ 拐点标注折线。
9. **健康报告（含对比）**：老侧拿 `full` 的五维归一化走势 ＋ 异常天标注 ＋ 建议段（137-189），以及 `compare` 的逐项 Δ 表（方向着色，302 行）；新侧拿对比窗口参数化。**注意**：老侧是 `full`／`compare` 两个独立 `kind`，融合后可考虑并为一页两段。**五维走势的作图按裁决 5 采 A 方案（小倍数图）为主、C 方案（保留归一化但诚实标注）为空间受限降级，B 方案（真多轴）否决**（见第 8 节裁决 5、第 9 节候选方案）。
10. **数据不足与降级**：8 页统一走 `anomaly_report.html` 的 `degrade` 横幅（含 `degrade_msg`）＋ None 值走 `charts` 的 `connectNulls`；HTML 层兜底沿用 `errorReceipt`。
11. **动作条**：按裁决 6，本图**不改公共层契约**；8 页沿用既有 `actionBar` 能力（复制数据／复制日志）。老侧 `_base_render.py:169-173` 把 `scene.buttons` 写死为空列表、报告族 8 页当前只出两个 ghost 按钮、无场景按钮——**这是老侧事实，记录在案**；新侧若日后要「复制摘要／复制完整报告／降级说明」三档动作引导，属新增契约，**另立票处理，不塞进 #383／#384／#385**。
12. **样式底座**：统一采本仓既有令牌（裁决 8／9／10），**不采**老侧 `contraindication_report.html` 的 `--ink/--line/--r` 那套命名（该命名在本仓零命中，仅作设计意图参考）；老侧族内 11 件保持现状不动。

## 已裁决事项（编排者）

逐条照录，含出处。

**裁决 1 · 看健康报告对齐 `health_report.html`**：看健康报告对齐 `health_report.html`（`kind=full`／`compare`）；`health_dashboard.html` 作素材（取「今日该做什么」＋「复制回 AI」块）。理由：词面与新侧冻结表一致，且它是 A2 十九场景正主；两件同名属历史命名撞车。出处：https://github.com/FeatherHunter/ilife/issues/384#issuecomment-5662155707

**裁决 2 · 计数口径**：只计 `*.html`，**排除 `.bak`**——`templates\` 73 ＋ `templates\临时样例\` 2 ＋ `calorie_html\` 2 ＋ `html\` 2 ＝ **79 件**；`help_center_v2_4_12.html.bak`（17696B）排除并注明；`.scratch\`（历史草稿区，件数不列，见第 10 节存疑 9）与 `tests\`（49）不计（前者历史草稿、后者用例产物）。同第 2 节。

**裁决 3 · #384 形状**：命令层 8 条独立、渲染层 1 个多态底座；判定线采纳 300 行；先验顺序＝先跑通「看BMI报告」这一 `kind` 再铺其余 7 条。同 #384 节。

**裁决 4 · 老侧图表缺陷不可继承**：老侧「无双轴独立刻度、五维各维独立 min-max 归一化到 0-100 共享域」「`six_factors` Y 轴刻度文字缺失」记为**已知老侧缺陷，不是可继承的优秀点**；新侧须重决策（2-3 个候选作图方案及代价见第 9 节）。

**裁决 5（新增）· 五维走势作图**：采 **A 方案（小倍数图）** 为主、**C 方案（保留归一化但诚实标注）** 为空间受限降级；**B 方案（真多轴）否决**（为五维开五轴不可读且须动公共层）。理由：A 零公共层改动、表达诚实、可移动端纵向滚动；C 保证极端场景不空白。**出处**：编排者裁决（本会话 2026-09-14）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节。

**裁决 6（新增）· 本图不改公共层契约**：actionBar 沿用既有能力（复制数据／复制日志）；老侧「场景按钮写死空数组」这一事实记录在案；新侧若日后要三档动作引导，另立票处理，不塞进 #383／#384／#385。**出处**：编排者裁决 2026-09-14（本会话）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节「用户本轮新下达的要求（务必继承）」。（原记「该节硬约束 2」已改正：硬约束 2 讲样式产出路径与 `extraCss` 三禁，**不含 actionBar 条款**；本条 actionBar 细则以本节正文为准。）

**裁决 7（新增）· 不可继承清单**：① 恒定值归一化给 50 的边界 hack（老侧已分叉两次）② 老侧两套 CSS 命名并存的现状（新侧以本仓既有约定为准）③ 老侧报告页空的 actionBar 场景按钮 ④ 老侧 `charts.line` 无双轴独立刻度的表达方式。**出处**：编排者裁决（本会话 2026-09-14）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节（该节硬约束 3 末句）。

**裁决 8（新增）· 主色**：本仓新技能主色**已是 `#007aff`**，token 名 `--blue`，唯一真相源 `packages/base-render/src/spec/style.ts:19`（同文件 `:11` 注释「与 Q12 锁定的 B1 主色一致」；`:20` `--blue2:#0a63ce` 为按压态）。`#0071e3` **作为样式取值在源文件零命中**（本会核实测：`packages/**` 2810 件里该字面量**只出现在 H-01 禁色表黑名单** `['#0a84ff','#af52de','#ff375f','#0071e3']`——`packages/skill-calorie/src/photo/helpCenter.ts:132`、`packages/skill-calorie/test/help-center-88.test.mjs:92`、`packages/base-render/test/style.test.mjs:241`，是「不许用」的清单、不是取色；另 `packages/skill-calorie/dist/**` 4 件同名构建产物 `dist/render/helpCenter.js:109`／`dist/render/helpCenter.d.ts:38`／`dist/photo/helpCenter.js:109`／`dist/photo/helpCenter.d.ts:38`，`dist` 被 `packages/*/dist/` 忽略、不入库）；**取值形态命中只在历史样本**——`fixtures/help-instances/卡路里_HELP_20260730_130429.html:11` 与 `fixtures/help-instances/卡路里_HELP_20260731_201530.html:11` 各 1 处 `--accent:#0071e3`（老侧 HELP 实物，非本仓源码取值）。`--accent`／`--ink`／`--r-sm`／`--ease` 四个名字**源文件零命中**：`--accent` 在 `packages/**` 实测 **0 处**，只在上述两件历史样本（`--accent:#0071e3` 声明 1 处 ＋ `var(--accent)` 引用 9／8 处）与 `docs/`／`.scratch/` 的文字记述中出现；`--ink`／`--r-sm`／`--ease` 本仓零命中。（原记「`#0071e3` 源文件零命中、全仓仅 dist 旧产物 1 处」与「`--accent` 本仓根本不存在」两句均失准，已按本会核实测改正：前者漏了 3 处源码命中与 2 件历史样本，后者漏了历史样本。）⇒ 第 11 节由「待裁决」改写为「已裁决：主色＝`#007aff`／token `--blue`，既有令牌，**不改值、不新增表**」。HELP 壳自有配色（本会核实测：`packages/base-render/src/helpShell.ts` 全文 83 行，`#rrggbb` 字面量 **117 处**——其中 `#0a63ce` **10 处**；转发垫片 `packages/skill-calorie/src/render/helpShell.ts` 31 行，`#rrggbb` 与 `#0a63ce` **均 0 处**；`packages/base-render/assets/help-template.html` 2059 行，`#rrggbb` 128 处、`#0a63ce` 11 处，且**两处 `:root` 值不一致**＝该件 `:9`（壳 13 变量）与 `:1159-1171`（A 组 11 变量），差 4 项：`--bg` `#f2f2f7`／`#f5f5f7`、`--line` `#d1d1d6`／`#d2d2d7`、`--soft` `#f0f6ff`／`#f5f8ff`、`--card` 同值异写 `#fff`／`#ffffff`；两件均被 `help-center-88`／`help-shell-134` 测试字节锁住）**不在本图范围**，记为「全仓统一另立票」（见第 10 节存疑 14）。**出处**：编排者裁决（本会话 2026-09-14）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节（该节硬约束 3 末句「主色已裁决」）。
  **历史取值差异（原第 11 节正文，去重后并入此处）**：① 设计审查 P0 要求 `#007aff`（A 侧引 `设计审查报告.html` P0 条）：统一到 A 系 `#007aff` ＋ `--ink/--ink2/--ink3` ＋ `--lineS` ＋ SF Pro Display，理由是 `#007aff` 是 iOS System Blue 官方值；② 老侧最新一代 6 件真模板用 `#0071e3`（A 侧实测）：`predict_report`／`calorie_deficit`／`combined_analysis`／`calorie_trend`／`long_trend`／`cron_setup`，即带 `SHARED-CSS` ＋ `payload` 注入位的那一批；③ 两件视觉标杆用 `#007aff`（A 侧实测）：`统一主面板_视觉标杆.html`（`--accent:#007aff`）与 `沉浸主面板_视觉标杆v2.html`（浅色层 `#007aff`，深色层 `#0a84ff`）。三处差异**不再具有决策意义**，仅作历史记录（本会核实测补充：`--accent:#0071e3` 是全族默认值，`templates\` 递归 52 件命中，不止上述 6 件；老侧文件本图不改）。

**裁决 9（新增）· 必须纠正 A 侧一条结论**：A 侧所写「老侧 token（`--ink/--ink2/--ink3`、`--r-sm/--r/--r-lg`、三档 `--shadow`、`--ease/--ease-spring`）**`@import` 即可**」**是错的**，照搬会踩红线。事实：① 老侧那套 token 名在本仓**零命中**；② 本仓样式唯一真相源是 `packages/base-render/`（npm 包名 `base-paint`）的 `src/spec/style.ts:12` `CSS_VAR_TOKENS`（11 个，冻结），产出器 `src/style.ts:1291 buildStyleSheet()`；③ 红线**原意**「不自造第二份表」（不是逐字引语）：`packages/base-render/src/style.ts:10` 写作「**不自造第二份表**」，`docs/base-paint-contract.md:303` 写作「**不得**因此自造第二份 token 表或样式常量」；`extraCss` 三禁（`:root` 改写／Q14 禁入项／深色区）**抛错**；④ 技能侧 `templates/*.html` 与 `src/render/*.ts` 的颜色字面量计数**全为 0**，样式靠 `<!--SHARED-CSS-->` 槽内联注入。⇒ 第 6 节与第 7 节所有「移植／`@import` 老侧 token」的措辞已统一改为：「老侧这套**仅作设计意图参考**（圆角梯度／三档阴影／弹簧缓动）；本仓缺对应 token，若确需，属**公共层能力**，另立票，**不在 #383／#384／#385 内自造**」。**本纠正显式取代 A 侧原表述**，不作静默改写。**出处**：编排者裁决（本会话 2026-09-14）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节（该节硬约束 3）。

**裁决 10（新增）· 实现路径硬约束**：新页样式一律走 `buildStyleSheet().css + blocksCss()`（**不走 `extraCss`**，旁证 `src/body/bodyDocs.ts:5`、`src/diet/nutritionPortDocs.ts:23`）；模板侧只留注入槽，不写颜色字面量。技能侧 6 件 `templates/*.html` 是**死模板**（`helpCenter.ts:282` 注释逐字），不是新页样式来源。第 7 节开头已落「实现硬约束」段。**出处**：编排者裁决（本会话 2026-09-14）；细则见交接文档 `.scratch/handoff/20260914-173837-卡路里场景10B推进.md` 第 7 节（该节硬约束 2）。

## 已知老侧缺口（新侧必须重决策）

照搬 B 侧「已知老侧缺口」节 ＋ A 侧图表相关条。以下为老侧自述缺陷，**不进入「老侧优秀点」清单**，新侧须独立重决策。

### 缺口 1：五维多序列折线无双轴独立刻度（`health_report.html` `kind=full`）

事实：`health_report.html:141-142` 注释自述——「#317 迁 Base charts.line 多序列: 各维度独立 min-max → 归一化共享 0-100 域近似（charts.line 无双轴独立刻度 — 记偏离）」。实现见 151-172 行：对 `摄入`／`运动`／`体重`／`饮水`／`缺口` 逐字段各取自身 `min`/`max`，线性压到 0-100 后叠画在同一 Y 轴（174-181 行 `yMin:0, yMax:100`）。

后果：Y 轴标注的是归一化分值而非真实量值（卡／kg／ml），**跨维度不可比、只可比形状**；同一图上「摄入上升」与「体重上升」视觉上无从区分，单位在图上是假的。

### 缺口 2：`charts.line` 缺 Y 轴刻度文字（`six_factors.html`）

事实：`six_factors.html:110-111` 注释——「#317 迁 Base charts.line 多序列: 各指标独立 min-max 归一化 → 共享 0-100 域近似（charts.line 无双轴独立刻度; Y 轴刻度文字缺失 — 均记偏离）」。同一缺口在 `nutrition_analysis.html:188` 复现。

后果：图可读性再降一级——连归一化分值都不标。三处同源，属**公共层 `charts.js` 的能力缺口**，不在报告族模板内可单独修。

### 缺口 3（衍生边界 hack）：恒定值归一化给 50

事实：`health_report.html:157-160`——当某序列 `mx === mn`（窗口内数据恒定）时，归一化给固定值 50「居中水平线」，注释自述是为避免「全 0 贴底视觉『线消失』」。后果：恒定值被画成中位水平线，与真实中位数据**视觉同形**，不可区分；`zeroFill` 序列另有 `mx===0` 例外分支（160 行），**边界条件已分叉两次**。新侧换图库或改数据契约后应整体重估，不建议平移（裁决 7 ①）。

### 缺口 4（A 侧补记）：`charts.line` 缺三种表达 —— 置信带／真双轴／缺口面积

事实（A 侧「三页共同」条）：老侧在 `predict_report.html:113` 与 `combined_analysis.html:140,144` 两处留了「记偏离」注释为证——`charts.line` 缺**置信带（hi/lo band）**、缺**真双轴独立刻度**、图上也**没有缺口面积**表达（`calorie_deficit.html` 有 `series[].deficit` 数据却只在表里）。后果：预测页「图缺带、数有带」不一致；缺口页有缺口数据但图上只剩两条线。新侧若做 #383／#385，这三处表达必须先定底座，否则会各自再「记一次偏离」。

### 缺口 5（A 侧补记）：移动端双断点与安全区覆盖极低

事实（A 侧「三页共同」条）：**全库只有 `help_center` 一处**同时做到双断点与 `env(safe-area-inset-bottom)`。后果：Toast／回顶按钮在带 home indicator 的机型上贴边。**注意**：A 侧同一件内另一处引设计审查原文记 `weight_history` 有 640px ＋ 400px 双断点，两处打架，取用前须实地复核（见第 10 节存疑 4）。

### 缺口 6（B 侧补记）：TDEE 报告无图

事实：老侧 TDEE 分支（210-215）只输出 4 张 KPI，无折线无表格，是 8 条中**唯一没有可视化**的一条。新侧若要补齐，属新增而非融合。

### 新侧候选作图方案（三选，含代价）

**方案 A · 小倍数图（small multiples）—— 采纳为主路（裁决 5）**

每维度各一张独立迷你折线，各自真实 Y 轴与单位，纵向堆叠；公共层复用现有 `charts.line` 单序列调用，不需改公共层。代价：垂直空间约为原单图的 5 倍（5 维），首屏需滚动；移动端 5 图堆叠较长，需配合折叠或「展开全部」。收益：数值真实、单位正确、单维可独立标注异常与目标线（`markLine`）；无障碍与读屏友好；每图可独立降级。改动面：模板排版层，零公共层改动。

**方案 B · 真多轴折线（扩展 `charts.line` 支持 `yAxis: [...]`）—— 否决（裁决 5）**

代价：**须改公共层 `assets\charts.js`**，跨全部技能生效，按本仓纪律需立 ISSUE 并走公共层审查；且 5 轴叠画在视觉上几乎不可读，实践上最多只能上 2 轴（如「体重 + 摄入」）。收益：单图信息密度最高，适合固定 2 维的强相关对比（缺口 ↔ 体重）。结论：**不为五维走势做**；可留作「对比两维」独立需求的后续票。

**方案 C · 保留归一化形状，但诚实化标注（最小改动）—— 采纳为降级路径（裁决 5）**

保留老侧叠线，Y 轴改为不标数值（或标「相对水平」），每序列图例挂真实单位，tooltip 出原始值，并在图上明写「本图仅示走势形状，不代表量值可比」。代价：最小，仅模板与 tooltip 层改动，零公共层改动；但「跨维度可比」的错觉仍在，靠文案免责，属权宜。收益：首屏紧凑，保住「一屏看五维」的老侧核心体验。结论：作方案 A 的**降级路径**（窄屏或数据不足时回退），或作过渡实现。**理由（裁决 5）**：A 零公共层改动、表达诚实、可移动端纵向滚动；C 保证极端场景不空白。

## 存疑（待核实）

合并 A／B 两份存疑并去重；已由裁决闭合的条目保留编号并标注「已闭合」。

1. **视觉标杆的归属地址与任务书不符**（A 存疑 1）。任务书写在 `<root>\templates\` 下，实测在 `<root>\templates\临时样例\` 下，字节数一致（23444B／29644B），应为同两件，已按 `临时样例` 口径记录。残余问题：「真模板 73 件」是否已含这两件（按第 2 节口径，79 ＝ 73 ＋ 2 ＋ 2 ＋ 2，两件标杆**不在** 73 之内）。
2. **~~主色取向~~** —— **已由裁决 8 闭合**：本仓主色＝`#007aff`／token `--blue`，既有令牌，不改值不新增表。老侧三处取值打架的事实已并入**第 8 节裁决 8** 作历史记录（原第 11 节正文与之重复，已去重移入）。
3. **`calorie_trend.html` 自称 `报告型 · 7 dim`，但页面上只有 4 格 KPI ＋ 一张图 ＋ 一张表**（A 存疑 3），7 dim 无处对应；疑似 badge 文案复制自 `review` 系 8-dim 体系后未改。需与数据侧核对：是文案错，还是本来有 7 项分析被砍到 4 项。
4. **双断点覆盖互相打架**（A 件内部）：A §183 引设计审查记 `weight_history` 有 640px ＋ 400px 双断点，A §303 又称双断点与 `env(safe-area-inset-bottom)` 全库只有 `help_center` 一处。两处都是引述，**未实地复核**；#385 移动端方案落地前须实测。
5. **两件视觉标杆是静态样张**（A 存疑 4）：无 `#payload`、无 `__P__`，数据硬编码（`onclick="copyCmd(this,'记吃了 鸡胸肉沙拉 300克')"` 里写死命令文本）。其「UI 优秀点」是**设计意图**而非运行时可证的实现；若要吸收，需要重新接数据。本清单按设计意图记录，**未验证其可移植性**。
6. **`predict_report.html` 的 `forecast.points[].lo/hi` 在 KPI 里被显示、在图上画不出**（A 存疑 5）：需确认真实影响的 kind——至少 `weight_forecast` 一格（`kpi('置信带', lo~hi, '95%')`）处于「图缺带、数有带」的不一致状态。
7. **设计审查报告只读了骨架与结论**（A 存疑 6），约 40KB 中的标题层 ＋ 一句话总结 ＋ 优点 ＋ P0-P3 ＋ TOP/BOTTOM3 ＋ 视觉标杆配方 ＋ 私人想法；未逐条读三个对照对与两份清单（「AI 味」清单、「工具感」清单）明细。若融合设计需要「哪些文件犯了什么错」的逐条证据，需补读该件 373-585 行。
8. **`设计审查报告.html:655-679` 原文「去金铜铜」疑为笔误**（A 存疑 7），推测原意为「去金/铜质感」或「去金属渐变」。**未核实，引用时不要照抄这三字。**
9. **`.scratch/` 与 `tests/` 未读**（A 存疑 8）：`.scratch/` 原记「897 件」**数字来源可疑、不可复现**——本会话对同一根目录复测：递归全部 **1676** 件／其中 `*.html` **844** 件／顶层 **93** 件（复核员独立复测同值），故**已改为不列具体数**（该目录件数随会话增长，写死必错）；`tests/` 49 件照记。两者按口径忽略。若后续发现预测族或缺口族有实物只存在于 `.scratch/`（例如被废弃的交叉表模板），本清单需补一条反向说明——但按纪律未扫。
10. **`contraindication_report.html` 与本族关系**（B 存疑 3）：它是**健身计划禁忌扫描**（`SUMMARY.scanned_sessions`／`movements`），属训练计划族，与 8 条报告唤醒词**无任何对应**，不在 #384 范围；只取交互与样式资产，不取业务。
11. **不属于 8 条唤醒词、已归邻近族的件**（B 存疑 4）：`health_dashboard`／`nutrition_analysis`／`nutrition_detail`／`nutrition_ratio`／`six_factors`／`goal_progress`／`diet_overview`／`meal_distribution` 均不在 #384 的 8 条内，只作融合素材来源（各件实际对应唤醒词见 B 侧 §存疑 4）。
12. **恒定值归一化补丁**（B 存疑 6）：`health_report.html:157-160` 在 `mx === mn` 时给 50，属边界 hack；按裁决 7 ① 不继承，新侧换图库或改数据契约后整体重估。
13. **两套 CSS 命名并存**（B 存疑 8）：`contraindication_report.html` 用 `--ink/--line/--r`，其余 10 件用 `--fg/--border`；老侧未统一。**按裁决 7 ② 与裁决 9**：新侧以本仓既有约定为准，不跟随任一套、不自造表、不要求老侧迁移；是否为有意为之（禁忌扫描页可能是更新设计线）**已无决策价值，不再追问**。
14. **HELP 壳自有配色是否纳入全仓统一**（裁决 8 附带）：`packages/base-render/src/helpShell.ts`（83 行）`#rrggbb` 117 处／其中 `#0a63ce` **10 处**；`packages/base-render/assets/help-template.html`（2059 行）`#rrggbb` 128 处／`#0a63ce` 11 处，且两处 `:root` 值不一致（`:9` vs `:1159-1171`，差 4 项：`--bg`／`--line`／`--soft` 取值不同、`--card` 同值异写）；以上均被 `help-center-88`／`help-shell-134` 测试字节锁住。其取值与主色 `#007aff` 不一致，但**不在本图范围**——记为「全仓统一另立票」，须由编排者另开票处理，**不得在本图三票内顺手改**。
15. **已闭合项**（B 存疑 1、2、9）：`templates\` 计数已由裁决 2 闭合；「查／看健康报告」双承担件已由裁决 1 闭合；`contraindication_report.html` 的 `part-group` 分组渲染与 `pills` 筛选交互级精读按令省略（若日后需要该页交互复刻，另开票补读）。
16. **范围外两条实测记录（不改，仅登记）**：① `process_progress.html` 内**只有 BUG 编号注释**（`BUG #1`@371／`BUG #3`@311／`BUG #4`@311、358），**无任何票号引用**——原表该行记「—」在结果上等价于「无」，但成因是「只有 BUG 编号」，不是「有 `srcLine` 无票号」，故新表写「无（只有 BUG #1／#3／#4 修复注释）」；② 老侧 `--accent:#0071e3` 实为**全族默认值**（实测 `templates\` 递归 **52 件**命中），第 6 节末「一处必须顶住的不一致」登记的三件（`predict_report`／`combined_analysis`／`long_trend`）仍在其中，**本图不改老侧文件、保持原状**。

## 已裁决：主色取值

**结论一行**：新侧主色＝本仓既有令牌 `--blue`（`#007aff`），**不改值、不新增表**。

完整裁决、唯一真相源与老侧三处取值差异的历史记录**统一见第 8 节「裁决 8」**；本节不再重复正文（原正文与裁决 8 重复，已去重）。
