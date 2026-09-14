# 老技能 HTML 盘点（场景 04 运动 · 类型分布／趋势／复盘／力量／有氧 五件）

盘点人：地图 #156 续作席 W2。材料来自前席落盘件 `.scratch/t156-old/`（`scene04_39.json`／`scan1_refs.json`／`scan2_templates.json`／`d_*.txt`／`body_exercise_*.txt`）与老技能根 `D:\2Study\StudyNotes\SKILLS\卡路里`（只读）。本文件只写事实与判定，不搬老 HTML 源码。

## 一、盘点范围与共同底座

本席负责 5 件（均在 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`）：`exercise_distribution.html`(13875B)／`exercise_trend.html`(7117B)／`exercise_recap.html`(6652B)／`exercise_strength.html`(6302B)／`exercise_cardio.html`(5003B)。这 5 件正是地图 #156 正文点名的 8 个模板名里的 5 个，归类结果见地图正文：「按类别分开的列表页类＝`exercise_distribution／_strength／_cardio／_trend／_recap`」。

共同底座（5 件一致，逐件不再重复）：

- 骨架同形：`<style>` 本地块 → `<script id="payload" type="application/json"><!--INJECT-DATA--></script>` ＋ `<!--SHARED-HELPERS-->`（＋分布／趋势两件另有 `<!--CHARTS-HELPERS-->`）→ `window.__P__` 解析壳 → `.meta-bar` → `<h1>` → `p.sub` → `.kpi-grid` → 各 `section` → `.footer .src` → `<div id="actionbar-zone">`。例证：`templates\exercise_distribution.html:83`、`:85`、`:90`、`:93`、`:124`、`:264`。
- 配色变量同一套 Apple 语义色，值逐字相同（`:root` 在 10–14 行区）：`--fg:#1d1d1d`／`--fg2:#6e6e73`／`--fg3:#86868b`／`--bg:#fafafa`／`--card:#fff`／`--border:#d2d2d7`／`--accent:#0071e3`／`--good:#34c759`／`--warn:#ff9500`／`--bad:#ff3b30`／`--soft:#f5f5f7`（分布件 `--fg` 为 `#1d1d1f`，是 5 件里唯一的偏差值）。仅分布件多出 4 个分类色：`--strength:#5856d6`／`--cardio:#0071e3`／`--flex:#34c759`／`--daily:#ff9500`。
- 排版：`font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif`；`.kpi-grid` 恒为 `repeat(4,1fr)`；正文窄栏 `max-width:780px`（分布件 920px），`padding:48px 24px 80px`；`.num` 类管数字右对齐。
- 响应式：每件只有一档 `@media (max-width:640px)`，其中 `.kpi-grid` 退成 `1fr 1fr`。5 件**都没有** `@page`／`print` 样式（见「短板」）。
- 交互：5 件都是「一次注入、静态渲染」，页面脚本无事件监听；页尾统一注入行动条 `actionbar-zone`（例 `templates\exercise_distribution.html:265`）。
- 数据契约：`D.status !== 'ok'` 时整页替换为 `window.errorReceipt(...)` 错误回执（例 `templates\exercise_distribution.html:133`）。

## 二、exercise_distribution.html（类型分布）

- 绝对路径／字节：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_distribution.html` · 13875 B · 268 行。
- 对应页面族：类型分布（1 条唤醒词）。引用脚本：`scripts\render_exercise_distribution.py`（`scan1_refs.json` 第 154–173 行登记，模板引用在该脚本第 8 行、输出名第 24 行）。

### 区块结构树

```
templates\exercise_distribution.html
├─ head 本地 <style> …:8–79          （共享样式注释 :4）
├─ script#payload …:83                 <--INJECT-DATA--> ＋ SHARED-HELPERS ＋ CHARTS-HELPERS ＋ window.__P__
├─ div.meta-bar :85–88                 ├ #metaLeft :86  └ .mode-badge#modeBadge :87
├─ h1#h1Title :90                      「🏃 运动分布」／贡献模式切「🔥 运动贡献」
├─ p.sub#sub :91
├─ div.kpi-grid :93–98                 4 × .kpi（label/value/extra） :94–97
├─ div.section :100–114
│   ├ h2#h2Title :101                  「运动分类占比」
│   └ div.pie-pair :102–113            2 × .pie-half
│        ├ #pie1L :104 · #pie1 :105 · .pie-legend#legend1 :106
│        └ #pie2L :109 · #pie2 :110 · .pie-legend#legend2 :111
├─ div.section :116–122
│   └ h2#tableTitle :117 · div.table-wrap>table :118（thead#tableHead :119／tbody#tableBody :120）
├─ div.footer :124–127                 └ .src#srcLine :125
├─ script :129–260                     页面逻辑（IIFE）
└─ div#actionbar-zone :264 ＋ 行动条脚本 :265
```

### 字段

票面字段（`scene04_39.json`，key=`exercise_distribution`）：`distribution`／`counts`／`calories`／`percentages`。实际注入并在页面消费的键（`templates\exercise_distribution.html:136`）：`summary`／`breakdown`／`contrib`／`series`／`meta`／`mode`；二级键 `summary.active_days/total_calorie/avg_calorie/avg_minutes/total_minutes/total_sets/avg_sets/contribution_pct/weekly_deficit`（`:150`–`:169`），`breakdown.{strength,cardio,flex,daily}.{count,calorie,minutes}`（`:200`–`:212`、`:232`–`:238`），`contrib.{exercise,tdee,intake,exercise_pct,intake_pct}`（`:216`–`:223`、`:245`–`:249`）。

### 样式特性

配色变量见上节。另有两处本件专属：`.pie-pair{display:grid;grid-template-columns:1fr 1fr;gap:32px}`（`:35`，窄屏 `:71` 退单列）；KPI 第 4 格标签行内改字号 `.kpi … style="font-weight:700;font-size:12px"`（`:97`）。

### 交互特性

无事件监听。两个模式由注入数据自选（`:137` `const isContrib = mode === 'contribution'`）：分布模式出「按类型／按热量」双饼（`:197`–`:214`），贡献模式出「缺口结构／运动 vs 摄入」（`:215`–`:224`）。饼图走 `window.charts.donut`（`:177`–`:181`，注释 `:172` 记「#317 迁 Base charts.donut」），图例由页面自绘（`:183`–`:192`）。

### 优点（带证据）

- 一张实物覆盖两种语义：同一模板按 `mode` 切标题（`:144`）、副题（`:145`–`:147`）、KPI 第 4 格（`:159`–`:170`）与表格列（`:229`–`:253`），分布与贡献无需两份文件。
- 图表能力已收敛到共享层并可被新仓复用：`:177`–`:181` 调 `window.charts.donut(el, items, {size:220,ringWidth:26,legend:'none',centerLabel:'总'})`，注释 `:172` 留了迁移票号。
- 空数据与异常双兜底：`:132`–`:135` 状态非 `ok` 时换错误回执；`:175` 饼图前 `filter(it => it[valueKey] > 0)` 去掉 0 值扇区，避免 0 度扇区与 `NaN` 百分比。
- 图例同时给百分比与语义着色：`:185`–`:192` 现算 `pct` 并挂 `cat_class`。
- 溯源可读：`:256`–`:257` 数据来源行带 `exercise_analysis`、生成时间与天数。

### 短板

- 全页无交互：无悬停提示、无点选筛选、无排序，唯一脚本尾巴是行动条注入（`:265`）。
- 颜色变量缺定义：贡献模式用 `var(--intake)`（`:219`、`:223`），但 `:root` 里没有 `--intake`（变量表 `:11`–`:14`），该扇区／图例点颜色落空。
- 死样式：`:69` 的 `.food-card .macros{grid-template-columns:1fr 1fr}` 是从饮食页抄来的选择器，本页无 `food-card` 节点。
改版式。

## 三、exercise_trend.html（趋势）

- 绝对路径／字节：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_trend.html` · 7117 B · 144 行。
- 对应页面族：趋势（1 条唤醒词）。引用脚本：`scripts\render_exercise_trend.py`（`scan1_refs.json` 第 320–338 行；模板引用在第 6 行、输出名第 22 行）。

### 区块结构树

```
templates\exercise_trend.html
├─ head 本地 <style> …:8–48
├─ script#payload :53            <--INJECT-DATA--> ＋ <!--SHARED-HELPERS--> ＋ window.__P__（无 CHARTS-HELPERS）
├─ div.meta-bar :55              └ .left#metaLeft
├─ h1 :56                        「📈 运动趋势」（硬编码，无 id）
├─ p.sub#subTitle :57
├─ div.kpi-grid#kpiGrid :59      （空容器，四格由脚本注入）
├─ div.card :61–65
│   ├ h2 :62 「🔥 每日消耗(卡)」
│   ├ div.legend :63             两个色块（内联写死 #0071e3／#34c759）
│   └ div.chart-wrap>div.chart#calChart :64
├─ div.card :67–70
│   ├ h2 :68 「🗓️ 每周运动频次(次)」
│   └ div.chart-wrap>div.chart#weekChart :69（行内 height:80px）
├─ div.footer :72                （空）
├─ script :74–137                页面逻辑（IIFE）
└─ div#actionbar-zone :140 ＋ 行动条脚本 :141
```

### 字段

票面字段（`scene04_39.json`，key=`exercise_trend`）：`daily_minutes`／`daily_calories`／`weekly_frequency`／`summary`。实注入键：`meta.today`（`:79`）、`summary.subtitle`（`:80`）、`summary.k1…k4` 各含 `label`／`value`／`extra`（`:82`–`:87`）、`daily[].date/calories/minutes`（`:90`–`:115`）、`weekly[].label/count`（`:119`–`:133`）。

### 样式特性

`.legend` 两项色块以内联 `background` 写死（`:63`）；柱体高度不靠 CSS 而由脚本按比例算成内联 px（`:96`、`:101`、`:124`），高度常量 96px／60px 是魔法数；`.kpi-grid` 同族 4 列、`@media 640px` 退 2 列。

### 交互特性

无事件监听；唯一「可交互」是原生 `title` 悬停提示（`:98` 日期＋卡数、`:104` 日期＋分钟、`:125` 周标签＋次数）。KPI 四格与两组柱状图全部由注入数据现造 DOM。

### 优点（带证据）

- KPI 完全数据驱动：`:82`–`:87` 只认 `k1…k4`，每格 `label/value/extra` 由数据给，换指标不用改页面版式（对比本族分布件的 4 个标签是写死在 `templates\exercise_distribution.html:94`–`:97`）。
- 标签自适应条数：`:109` 仅当 `daily.length <= 35` 才画日期标签，避免 30 天以上日期叠成一团。
- 双指标一格叠柱：`:99`–`:108` 每格上下两根柱（卡数 vs 分钟）并用 `marginTop:-2px` 相接，一格内完成「量」与「时长」对照。
- 零值与缺数据都不塌：`:95`／`:123` 零值加 `.min` 类且高度保底 `Math.max(2, …)`；`:134` 空数组替换为 `window.emptyState({text:'暂无数据'})`。
- 状态兜底同族一致：`:77` 非 `ok` 换 `window.errorReceipt`。

### 短板

- 颜色三处重复：`:63` 图例写死 `#0071e3`／`#34c759`，`:97`／`:102` 又在脚本里各写一遍，且都没用 `--accent`／`--good` 变量——改一次色要动三处。
- 图没有坐标系：`:93`–`:133` 纯手工 div 定位，无 y 轴刻度、无数值标签，柱高只能比高低；`:121`–`:125` 同为相对柱。
- 标题不可变：`:56`／`:62`／`:68` 三处 `h1`／`h2` 是写死文本且无 id，与分布件「按模式换标题」的做法不一致。
- 极值计算不设防：`:91`–`:92` 用展开运算符 `Math.max(...daily.map(...))`，数组极大时有参数爆炸风险（当前默认窗口小，未触发）。
读数框。

## 四、exercise_recap.html（复盘）

- 绝对路径／字节：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_recap.html` · 6652 B · 138 行。
- 对应页面族：复盘（5 条唤醒词：本周／本月／最近 90 天／今年／自定义时间）。引用脚本：`scripts\render_exercise_recap.py`（`scan1_refs.json` 第 195–214 行；模板引用在第 11 行、输出名第 26 行）。

### 区块结构树

```
templates\exercise_recap.html
├─ head 本地 <style> :8–55
├─ script#payload :58            <--INJECT-DATA--> ＋ <!--SHARED-HELPERS--> ＋ window.__P__（无 CHARTS-HELPERS）
├─ div.meta-bar :60              └ .left#metaLeft
├─ h1 :61                        「📊 运动复盘」（硬编码）
├─ p.sub#subTitle :62
├─ div.one-line#oneLine :64      「💬 一句话结论」栏
├─ div.kpi-grid#kpiGrid :66      （空容器，四格由脚本注入）
├─ div.card :68–71               h2「🧩 类型分布」:69 ＋ #distBox :70
├─ div.card :73–76               h2「🔥 高频运动」:74 ＋ #topBox :75
├─ div.card :78–81               h2「📈 每日消耗趋势」:79 ＋ .trend-wrap>.trend#trendBox :80
├─ div.footer :83                （空）
├─ script :85–131                页面逻辑（IIFE）
└─ div#actionbar-zone :134 ＋ 行动条脚本 :135
```

### 字段

票面字段（`scene04_39.json`，key=`exercise_recap_week`/`_month`/`_90d`/`_year`/`_range`）：`total_minutes`／`total_calories`／`frequency`／`type_distribution`／`trend`／`top_movements`（range 另加 `start_date`／`end_date`）。实注入键：`meta.today`＋`meta.period`（`:90`）、`summary.subtitle`（`:91`）、`one_line`（`:92`）、`summary.k1…k4`（`:94`–`:99`）、`cat_items[].name/count`（`:102`–`:109`）、`top_movements[].name/count`（`:113`–`:115`）、`trend[].date/calories`（`:118`–`:126`）。

### 样式特性

`.one-line` 是本件独有的结论条（`:64`）；分布用纯 CSS 条 `.dist-row/.dist-name/.dist-bar/.dist-fill/.dist-val`（宽度按比例内联写）与徽标 `.chip`（`:106`–`:108`、`:114`）；趋势块外套 `.trend-wrap>.trend` 容器（`:80`）。卡片类名为 `.card`，与分布件的 `.section` 不同名（跨件不统一，见短板）。

### 交互特性

无事件监听；只有趋势柱的原生 `title` 悬停（`:124`）。三段内容一次性渲染，无折叠、无时间段切换控件——窗口差异由脚本给数据决定。

### 优点（带证据）

- 一张实物服务 5 条时间窗唤醒词：`:90` 直接读 `meta.period`，本周／本月／90 天／今年／自定义只在数据侧不同，模板零分支。
- 「复盘」语义完整成三段：一句话结论 `one_line`（`:92`）→ 类型分布（`:102`–`:109`）→ 高频运动（`:113`–`:115`）→ 每日消耗趋势（`:118`–`:126`），与新仓 HELP 的复盘场景对齐。
- 分布条零依赖：`:107` 以 `Math.round(c.count / maxC * 100)%` 做宽度，不用图表库也能看出相对占比。
- 高频运动用 chip ＋ `×次数`（`:114`）紧凑表达，长列表不占纵向空间。
- 三块各自有兜底：`:110`／`:116`／`:127`–`:128` 缺数据显示 `window.emptyState`；`:88` 状态异常换 `window.errorReceipt`。

### 短板

- 趋势图只有柱高与悬停 `title`（`:121`–`:125`）：无日期轴、无卡数刻度，读不出「哪天多少卡」。
- 高频运动无排序与条数上限的页面级保证（`:113`–`:115`），顺序与截断完全依赖脚本。
- 标题写死且无 id（`:61`、`:69`、`:74`、`:79`），无法按周期改文案。
- 与本席同族的分布件样式类不同名（本件 `.card` vs `templates\exercise_distribution.html:100` 的 `.section`），5 件合用时需要对齐。
宽屏版式。

## 五、exercise_strength.html（力量训练总览）

- 绝对路径／字节：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_strength.html` · 6302 B · 134 行。
- 对应页面族：力量总览（1 条唤醒词「看力量训练总览」）。引用脚本：`scripts\render_exercise_strength.py`（`scan1_refs.json` 第 273–291 行；模板引用在第 6 行、输出名第 21 行）。

### 区块结构树

```
templates\exercise_strength.html
├─ head 本地 <style> :8–51         （含 .trend-* 与 .btn 两组样式）
├─ script#payload :54              <--INJECT-DATA--> ＋ <!--SHARED-HELPERS--> ＋ window.__P__（无 CHARTS-HELPERS）
├─ div.meta-bar :56                └ .left#metaLeft
├─ h1 :57                          「💪 力量训练总览」（硬编码）
├─ p.sub#subTitle :58
├─ div.kpi-grid#kpiGrid :60        （空容器，四格由脚本注入）
├─ div.card :62–68                 h2「📋 按动作聚合」:63 ＋ table（thead#tHead :65／tbody#tBody :66）
├─ div.card :70–73                 h2「📈 重量轨迹(最近 10 个训练日 · 单侧口径 Σkg×次数)」:71 ＋ #trendBox :72
├─ div.footer :75                  （空）
├─ script :77–127                  页面逻辑（IIFE）
└─ div#actionbar-zone :130 ＋ 行动条脚本 :131
```

### 字段

票面字段（`scene04_39.json`，key=`exercise_strength_overview`）：`action`／`total_sets`／`total_weight`／`total_reps`／`weight_trend`。实注入键：`meta.today`（`:82`）、`summary.subtitle`（`:83`）、`summary.k1…k4`（`:86`–`:91`）、`summary.table_header`（`:93`）、`actions[].name/sets/weight/reps`（`:95`–`:97`）、`trends[].action`＋`trends[].points[].date/weight`（`:104`–`:120`）。

### 样式特性

除同族底座外本件多一组趋势样式：`.trend-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}`（`:32`）、`.trend-row{display:flex;align-items:flex-end;gap:3px;height:56px}`（`:33`）、`.trend-bar{width:14px;background:var(--accent);border-radius:3px 3px 0 0;min-height:2px}`（`:34`）、`.trend-date{font-size:10px;color:var(--fg3)}`（`:35`）。页尾 `.btn`／`.btn:hover`（`:38`–`:40`）与 `@keyframes fadeup`（`:50`）本页无对应节点，是给行动条注入件预留的。

### 交互特性

无事件监听；柱体只带原生 `title`（`:116` 日期＋kg）。空表与空图各有一条带唤醒词指引的空态（`:100`）。

### 优点（带证据）

- 口径写在标题里：`:71` 直接写明「最近 10 个训练日 · 单侧口径 Σkg×次数」，读的人不必去翻脚本才知道重量怎么算。
- 表头由数据给：`:93` `d.summary.table_header` 决定列头，与四格 KPI 一样可换口径不改版式。
- 空态即引导：`:100` `window.emptyState({icon:'💪', text:'暂无力量训练记录', hint:'说「记力量训练」记下第一条'})`——空页把唤醒词递到用户眼前。
- 每个动作一行小图：`:104`–`:121` 逐动作画柱（`t.points`），柱高 `Math.max(2, Math.round(p.weight / max * 54))` 保底 2px，零值也留痕。
- 表格数字对齐：`:31` `font-variant-numeric:tabular-nums` ＋ 右对齐 `.num`，多行数值可竖读比较。

### 短板

- 样式与实现脱节：`:35` 定义了 `.trend-date`，但脚本 `:104`–`:121` 只造 `.trend-row`／`.trend-bar`，从未生成日期节点，日期只能靠悬停 `title`（`:116`）。
- 表无排序、无合计行、无分页（`:95`–`:97`），动作多时只能从上往下看。
- 趋势图同样无刻度：柱高 54px 上限是魔法数（`:112`），看不出「多少 kg 算高」。
- 窄屏唯一手段是卡片横向滚动（`:47` `.card{overflow-x:auto}`），表头会跟着滚走。
- 本页未引入图表件（`:54` 只有 `SHARED-HELPERS`），与同族分布／趋势两件的饼图、叠柱风格不统一。

## 六、exercise_cardio.html（有氧训练总览）

- 绝对路径／字节：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_cardio.html` · 5003 B · 102 行（5 件里最小）。
- 对应页面族：有氧总览（1 条唤醒词「看有氧训练总览」）。引用脚本：`scripts\render_exercise_cardio.py`（`scan1_refs.json` 第 134–153 行；模板引用在第 6 行、输出名第 21 行）。

### 区块结构树

```
templates\exercise_cardio.html
├─ head 本地 <style> :8–46
├─ script#payload :49              <--INJECT-DATA--> ＋ <!--SHARED-HELPERS--> ＋ window.__P__（无 CHARTS-HELPERS）
├─ div.meta-bar :51                └ .left#metaLeft
├─ h1 :52                          「🏃 有氧训练总览」（硬编码）
├─ p.sub#subTitle :53
├─ div.kpi-grid#kpiGrid :55        （空容器，四格由脚本注入）
├─ div.card :57–63                 h2「📋 按类型聚合」:58 ＋ table（thead#tHead :60／tbody#tBody :61）
├─ div.footer :65                  （空）
├─ script :67–95                   页面逻辑（IIFE）
└─ div#actionbar-zone :98 ＋ 行动条脚本 :99
```

### 字段

票面字段（`scene04_39.json`，key=`exercise_cardio_overview`）：`exercise_type`／`count`／`total_minutes`／`total_distance`／`avg_pace`。实注入键：`meta.today`（`:72`）、`summary.subtitle`（`:73`）、`summary.k1…k4`（`:75`–`:80`）、`summary.table_header`（`:82`）、`items[].name/count/minutes/distance/pace`（`:84`–`:88`）。

### 样式特性

与力量件同一套样式板（同族底座 ＋ `.card`／表格／`.footer .btn`／`@media 640px`，`:24`–`:43`），但**没有** `.trend-*` 一组（本页无图）。断点内还写了 `.card{overflow-x:auto}`（`:42`）与 `.footer .btn{flex:1;min-height:44px}`（`:41`）。

### 交互特性

无事件监听；表格五列由数据决定是否显示（步速／距离缺则 `—`，`:87`–`:88`）。空表走带指引的空态（`:91`）。

### 优点（带证据）

- 空态带动作指引且指定图标：`:91` `window.emptyState({icon:'🏃', text:'暂无有氧训练记录', hint:'说「记有氧运动」记下第一条'})`。
- 缺值不空着：`:87`–`:88` 距离与步速缺时显 `—`，列仍然对齐。
- 表头数据驱动：`:82` `d.summary.table_header`。
- 触控友好：`:41` 窄屏把按钮拉到 `flex:1; min-height:44px`（符合 44px 触控高度惯例）。
- 结构最薄：102 行／5 KB，只有「KPI ＋ 一张表」，是本族里最容易对齐新仓页面族的样板。

### 短板

- 只有表格没有图（`:49` 未引入 `CHARTS-HELPERS`），与分布／趋势／力量三件的图形表达不统一。
- 无口径说明：命中 `pace`／`distance` 的意思没有写在页面上（对比力量件 `templates\exercise_strength.html:71` 把口径写进标题）。
- 表无排序、无合计、无分页（`:84`–`:88`）。
- 五列在窄屏只能横向滚动（`:42` `.card{overflow-x:auto}`），表头随滚动消失。
（给行动条预留）。

## 七、候选判定（只判归属与是否纳入，不深挖）

判定口径（本席自定，先写在前面以免含糊）：**模板实物**＝① 住在 `templates\` 目录下（该目录共 73 件 HTML）；② 带 `<!--INJECT-DATA-->` 占位（多数同时带 `<!--SHARED-HELPERS-->`）供注入；③ 有专属渲染脚本或技能文档登记。三条都不满足、且自备数据的是**产物**。**纳入本图**的口径：该实物服务本图 39 条唤醒词（`scene04_39.json`）之一，或地图正文点名要归类。

| 候选 | 字节·行数 | 性质 | 归属 | 纳入本图 | 理由码 |
|---|---|---|---|---|---|
| `templates\exercise_review.html` | 21742 B · 553 行 | 模板实物 | 健身计划 → 计划复盘 3 词 | 否 | `OUT_OTHER_SCENE` |
| `templates\workout_plan_view.html` | 36485 B · 722 行 | 模板实物 | 健身计划 13 词 | 否 | `OUT_OTHER_SCENE` |
| `templates\plan_builder_wizard.html` | 38186 B · 1061 行 | 模板实物 | 定训练计划／落地（采访式向导） | 否 | `OUT_MAP_SCOPE` |
| `templates\review_template.html` | 15639 B · 424 行 | 模板实物 | 复盘 6 词（跨域） | 否 | `OUT_OTHER_SCENE` |
| 根 `review_template.html` | 25160 B · 604 行 | 旧交付件 | 同上（旧版） | 否 | `NOT_TEMPLATE_PRODUCT` |
| 根 `健身计划.html` | 101615 B · 300 行 | 单文件产物 | 健身计划族 | 否 | `NOT_TEMPLATE_PRODUCT` |
| `calorie_html\`（3 件） | 65366／73811／2318 B | 产物目录 | HELP 速查台 | 否 | `NOT_TEMPLATE_PRODUCT` |
| `html\`（2 件） | 13275／10950 B | 临时产物目录 | 饮食（吃的记录） | 否 | `NOT_TEMPLATE_PRODUCT` |
| 根 `卡路里.html` | 302820 B · 2049 行 | 原型聚合件 | HELP 原型 | 否 | `NOT_TEMPLATE_PRODUCT` |
| 根 `SKILL.md` | 158005 B · 2195 行 | 技能文档 | 全技能正本 | 否 | `NOT_TEMPLATE_DOC` |

### 逐件依据

- **`templates\exercise_review.html`**：是实物（`:203` `<h1>🏋️ 训练复盘</h1>`、`:210`／`:221`／`:227`／`:234` 四块、`:549` 行动条槽；`INJECT-DATA`／`SHARED-HELPERS` 各 1 处），渲染器 `scripts\render_exercise_review_html.py`（模板引用见 `scan1_refs.json:252`–`:263`）。但它服务的是 `scripts\_triggers.py:2171`／`:2176`–`:2177`／`:2187`／`:2197` 的**计划复盘（本周／本月／全部）**（category 健身计划）——这 3 条不在本图 39 词内，依地图 Out of scope「其余 9 个场景：各归自己的图」划出本图。**顺带纠一处易混**：地图 Out of scope 点名的「定时复盘 3 条」其模板是 `templates/cron_setup.html`（`SKILL.md:188`：开启／关闭定时复盘 → `scripts/render_cron_setup.py`），与本件不是一回事，不能拿它当本件划出的依据。
- **`templates\workout_plan_view.html`**：实物（`:161` `<h1 id="planTitle">健身计划</h1>`、`:224`／`:262`／`:311`／`:337`／`:361`／`:380`／`:410`／`:432`／`:456`／`:521` 十块、`:718` 行动条槽）；渲染器 `scripts\render_workout_plan.py`（模板引用在第 36 行，`scan1_refs.json:397`–`:441`）。全被计划族词占住：`_triggers.py:1927`（看本周计划）／`:1937`（看下周计划）／`:1947`（看上周计划）／`:1957`（看指定周计划）／`:1967`（看今天练什么）／`:1977`（看某动作安排）／`:1987`（看某天练什么）／`:1997`（看计划概览）共 13 处；`SKILL.md:122` 同登记。本图 39 词里无一条计划类词 → 不纳入（归健身计划那张图）。
- **`templates\plan_builder_wizard.html`**：实物（`:455` `<h1 id="title">8 周增肌计划</h1>`、`:463` 计划偏好／`:472` 计划详情／`:484` 复制确认指令、`:1057` 行动条槽）。`_triggers.py:2019`–`:2027` 把『定训练计划』挂在它名下（category 健身计划，output receipt，数据源 `render_plan_receipt.py --live-plan-set`）；`scripts\render_plan_builder.py` 第 28 行也引用同名模板（`scan1_refs.json:339`–`:360`）。判「不纳入」的硬依据是地图 Out of scope 原文：新架构不做的 10 条里含「**落地 3**」，并点名其当年实现脚本 `render_plan_builder.py`；且『定训练计划』本身也不在本图 39 词内。附注：本件形态是采访式向导（计划偏好 → 计划详情 → 复制确认指令），与整批裁定 Q3「5 条必须多步交互」的预检确认页同一路数，仍不属本图。
- **`templates\review_template.html`**：实物（`:185` `<h1 id="hero-title">复盘报告</h1>`、`:194` ⚠️ 异常天、`:421` 行动条槽）；渲染器 `scripts\render_review.py`（其文档字符串第 10 行写明「输出到新文件,原 templates/review_template.html 不变」）；`SKILL.md:121` 登记为「复盘（含今日/本周/本月/本年/日期范围）」；`_triggers.py:4306`／`:4318`／`:4324`／`:4336`／`:4342`／`:4348` 6 条复盘词都走它。页内还含「体重趋势」「🍽️ Top 5 食物」（见其 h2／h3）＝跨域复盘，而运动复盘在本图是另一件 `exercise_recap.html` → 归复盘场景那张图，不纳入本图。
- **根 `review_template.html`**（同名第二份）：`:6` 起 title「卡路里周复盘」，`INJECT-DATA` 0 处、`SHARED-HELPERS` 0 处，`<h1>本周复盘</h1>` ＋「3 亮点／3 问题／3 建议」，mtime 2026-08-04 → 旧版交付件，**不是** `templates\` 里那件（后者 15639 B，mtime 2026-08-13）。两件不可混算。
- **根 `健身计划.html`**：`:6` `<title>健身计划</title>`；`:9` 起自备一套变量 `--ink/--ink2/--line/--shadow`，与 8 件模板的 `--fg/--fg2/--card/--border/--soft` 不同名；`INJECT-DATA` 0 处；含与 `templates\workout_plan_view.html:224` 逐字同形的脚本模板串「📋 今日复盘 · ${t.date || ''}」→ 是把模板＋数据内联后的可打开交付页，非实物，不纳入。
- **`calorie_html\`**：`卡路里_HELP_20260730_130429.html`(65366 B)／`卡路里_HELP_20260731_201530.html`(73811 B) 两件 title 均为「📚 卡路里 · 唤醒词速查台」，`INJECT-DATA` 0 处，文件名带时间戳；`process_progress_input_20260730.json`(2318 B) 同行过程件 → 产物目录（HELP 那条线），不纳入。
- **`html\`**：`tm_db.html`(13275 B)／`tm_mock.html`(10950 B)，均 173 行，title「卡路里 · 吃的记录」，`<h1>🍱 吃的记录</h1>`＋`<h2>每日明细</h2>`，`INJECT-DATA` 0 处，mtime 同批 2026-08-04 22:59 → 临时产物（`tm_` 前缀），且是饮食域页面，不纳入。
- **根 `卡路里.html`**：302820 B · 2049 行，`:6` title「HELP 原型 · V4 三级目录版」，全文两个 `<h1>` 都落在脚本模板串里（`'+esc(m&&m.title||me.command_cn||'')+'`），`INJECT-DATA` 0 处 → HELP 原型单文件，不是可注入实物，不纳入。
- **根 `SKILL.md`**：158005 B · 2195 行，`:1`–`:2` 是 front matter（`---`／`name: 卡路里`），`:118`–`:121` 是「模板｜唤醒词｜数据源｜渲染器」对照表 → 技能文档，不是 HTML 实物，不纳入；它的价值是当**对照清单**（同类的还有 `references\html_templates.md`，136 行，`:7`–`:14` 是同一张表）。

## 八、老模板 → 本图页面族／票／唤醒词 对应表

本席 5 件（全部**纳入**，地图正文已点名归「按类别分开的列表页类」）：

| 老模板 | 字节 | 本图页面族 | 本图命令键（`packages\skill-calorie\src\exercise\commands.ts`） | 票 | 本图唤醒词（`packages\skill-calorie\src\exercise\routes.ts`） |
|---|---|---|---|---|---|
| `exercise_distribution.html` | 13875 | 类型分布 | `calorie.view.exercise-distribution`（commands.ts:31） | #265（归位）＋#394（融合） | 看运动类型分布（routes.ts:42） |
| `exercise_strength.html` | 6302 | 力量总览 | `calorie.view.exercise-strength`（commands.ts:35） | #394 | 看力量训练总览（routes.ts:43） |
| `exercise_cardio.html` | 5003 | 有氧总览 | `calorie.view.exercise-cardio`（commands.ts:30） | #394 | 看有氧训练总览（routes.ts:44） |
| `exercise_trend.html` | 7117 | 趋势 | `calorie.view.exercise-trend`（commands.ts:36） | #265＋#394 | 看运动趋势（routes.ts:45） |
| `exercise_recap.html` | 6652 | 复盘 | `calorie.view.exercise-recap`（commands.ts:33） | #265＋#394 | 运动复盘（本周／本月／最近 90 天／今年／自定义时间）（routes.ts:46–50） |

票面依据：#265 正文表格逐条写明「看运动类型分布（1） → `calorie.view.exercise-distribution`」「看运动趋势（1） → `-trend`」「运动复盘（本周／本月／最近 90 天／今年／自定义时间）（5） → `-recap`」；**力量总览／有氧总览两件不在 #265 那 7 条内**（该票只动 7 条），它们是本图另有专面命令的 2 条（`routes.ts:43`／`:44`），合并在 #394 页面模板融合里收口。

候选（**不纳入**本图）与其真词归属：

| 候选 | 真词归属 | 依据 |
|---|---|---|
| `templates\exercise_review.html` | 计划复盘（本周／本月／全部）3 词 | `_triggers.py:2171`／`:2187`／`:2197` |
| `templates\workout_plan_view.html` | 计划族 13 词 | `_triggers.py:1927`–`:1997`；`SKILL.md:122` |
| `templates\plan_builder_wizard.html` | 定训练计划／落地 3 词 | `_triggers.py:2027`；地图 Out of scope 点名 `render_plan_builder.py` |
| `templates\review_template.html`（＋根同名件） | 复盘 6 词 | `_triggers.py:4306`–`:4348`；`SKILL.md:121` |
| `calorie_html\`／`html\`／根 `健身计划.html`／根 `卡路里.html` | 无（产物） | 均 `INJECT-DATA` 0 处 |
| 根 `SKILL.md` | 无（文档） | `SKILL.md:118`–`:121` 是清单表 |

## 九、遗留与口径提醒

- 本席只覆盖自己那 5 件；同族另 3 件（`exercise_summary.html`／`exercise_goal_view.html`／`crud_receipt.html`）与 `templates\` 其余件由别席负责，本文件不替它们下结论。
- `d_dist_trend.txt`／`d_recap_goal.txt`／`d_cardio_strength.txt` 三份前席提取件是 UTF-16 编码（读的时候要按 `[System.Text.Encoding]::Unicode` 解码，否则整份读不出），已在本席草稿目录留一份 UTF-8 副本以便复核。
- 全族通病只有两条是**跨件**的：没有 `@page`／`print` 样式；响应式只有 `@media (max-width:640px)` 一档。融合时若要打印或宽屏版式，老实物里没有可照的东西。
