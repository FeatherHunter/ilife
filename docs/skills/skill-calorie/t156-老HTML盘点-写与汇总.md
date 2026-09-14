# t156 老技能 HTML 盘点（写后回执 · 运动汇总 · 对照目标）

- 地图：#156（卡路里场景 04 运动）· 本席代号 W1
- 覆盖范围：3 件老技能模板 —— 写后回执页、运动汇总、对照目标（合计 30 条唤醒词）
- 旧技能根（只读，本席不改动）：`D:\2Study\StudyNotes\SKILLS\卡路里\`
- 本文引用格式：一律「路径:行号」，路径相对旧技能根，例如 `templates/crud_receipt.html:146`
- 事实来源：`.scratch/t156-old/scan2_templates.json`（字节／行数／区块／id／类名／CSS 变量）、`scan1_refs.json`（脚本→模板引用）、`scene04_39.json`（39 条唤醒词＋字段）、提取件 `body_*.txt`（模板正文提取）、`t264.json`／`t265.json`／`t342.json`（票面）
- 口径说明：本图 8 个模板共 39 条唤醒词，本席只写 3 个模板／30 条词；其余 5 个模板（分布、力量、有氧、趋势、复盘）另有席。

## 一、写后回执页 · `templates/crud_receipt.html`

**绝对路径** `D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html`
**字节** 26,279 B（466 行）；`scan2_templates.json` 记录的 `placeholders` 为空数组 —— 该模板不用 `{{}}` 占位符，数据全靠 4 个 HTML 注释标记就地替换（`<!--SHARED-CSS-->` 在 `templates/crud_receipt.html:4`，`<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->` 在 `templates/crud_receipt.html:133`）。

### 区块结构树

```
head
└─ <style><!--SHARED-CSS--></style>                    crud_receipt.html:4
body
├─ script#payload <!--INJECT-DATA--> ＋ <!--SHARED-HELPERS--> ＋ __P__ 解析
│                                                       crud_receipt.html:133
├─ .meta-bar                                            crud_receipt.html:135-138
│   ├─ .left#metaLeft（操作时刻）                        :136
│   └─ .type-badge「回执型 · 通用 CRUD」                  :137
├─ h1#h1Title「✅ 操作回执」                             :140
├─ p.sub#sub（状态徽章 ＋「实体 操作成功」）              :141
├─ .id-card#idCard                                      crud_receipt.html:143-151
│   ├─ .headline > .icon#icon / .title#opTitle / .id#recordId   :144-148
│   ├─ .meta#recordMeta（时间·场景行）                    :149
│   └─ .summary#summaryLine（一句话总结，默认隐藏）        :150
├─ .kpi-grid#kpiGrid（默认 display:none，有数据才显示）    :153
├─ .diff-card#diffCard「📋 字段变更」                     crud_receipt.html:155-158
│   └─ #diffList（行：.diff-row > .diff-label/.diff-old/.diff-arrow/.diff-new）  :157
├─ .ctx-card#ctxCard「📊 今日累计」                       crud_receipt.html:160-163
│   └─ #ctxList（行：.ctx-row > .label/.value/.pct）      :162
├─ .items-card#itemsCard「📋 复制明细」                   crud_receipt.html:165-168
│   └─ #itemList（行：.item-row > .item-time/.item-food/.item-grams/.item-cal/.item-tag）  :167
├─ .footer > .btn-group > button.btn#undoBtn「↩ 撤销」    :170-173
├─ 主渲染脚本（IIFE，183-457 取数据、建四卡、接撤销、备复制）  crud_receipt.html:176-458
├─ #actionbar-zone（复制区落点）                          :462
└─ 注入脚本 window.actionBar(window.__P__)               :463
```

**表格**：无（`scan2_templates.json` 的 `tables` 为空数组）。本页不用表格，全部走卡片 ＋ 两栏行（`.diff-row` 的 `grid-template-columns:1fr auto 1fr`，`templates/crud_receipt.html:61`）。
**脚注**：`.footer` 只放按钮组，无来源脚注行 —— 与读类页面的 `.src` 来源行不同（读类见 `templates/exercise_summary.html:104`）。

### 字段（页面数据契约）

顶层对象（解构于 `templates/crud_receipt.html:183`）：

| 段 | 字段 | 说明 |
|---|---|---|
| 顶层 | `status` | 非 `ok` 时整页换成 `window.errorReceipt({...})`（`templates/crud_receipt.html:179-182`） |
| 顶层 | `op` | 四态：`add`／`create`／`update`／`delete` → 中文标签／配色／图标三张映射表（`:192-197`） |
| 顶层 | `record_id` | 渲染成 `#ID`（`:204`） |
| 顶层 | `old_record`／`new_record` | 变更前／后记录，diff 卡与快照卡的唯一数据源 |
| 顶层 | `summary` | 一句话总结，进 `#summaryLine`（`:234-274`） |
| `meta` | `action_at`／`entity_type`／`undo_cli` | 页眉时刻、实体名、撤销命令（有 `undo_cli` 才显示撤销键，`:414-429`） |
| `context` | `kpis[]` | KPI 卡（`label`／`value`／`extra`），无则整块隐藏（`:213-222`） |
| `context` | `totals[]` | 今日累计卡（`label`／`value`／`unit`／`target`，算百分比 `:378`） |
| `context` | `items[]` | 明细卡（`time`／`food_name`／`grams`／`calories`／`label`），`label` 为「已跳过」时加 `.item-skip`（`:390-409`） |
| 字段标签表 | `FIELD_LABELS`（63 项，`:278-291`） | 中文标签唯一来源；运动族字段在 `:285-288`：`exercise_type`／`duration_minutes`／`calories_burned`／`distance_km`／`avg_heart_rate`／`max_heart_rate`／`steps`／`set_index`／`load_kg`／`reps`／`is_backfill`／`difficulty`／`exercise_goal` |
| 批量统计表 | `:288-291` | `copied`／`skipped`／`written`／`failed`／`failures`／`deleted_count`／`matched`／`source_date`／`target_date`／`start_date`／`end_date`／`period` |
| 单位表 | `UNIT_LABELS`（`:293`） | `grams:g`／`calories:卡`／`protein/carbs/fat:g`／`ml`／`sodium:mg` |

对应本图 13 条写词的字段（`scene04_39.json`）：`记运动` 五字段（`exercise_type`／`duration_minutes`／`calories_burned`／`time`／`is_estimated`）、`记运动（含备注）`＋`note`、`记力量训练` 五字段（`set_index`／`load_kg`／`reps` 逐组）、`记有氧运动` 六字段（`distance_km`／`avg_heart_rate`／`max_heart_rate`／`pace`）、`记日常活动`（`steps`／`period`）、`补记运动`（`date`／`is_backfill`）、`批量补记运动`（`written_count`／`skipped_count`／`failed_count`／`failures`）、`复制昨日运动`（`copied_count`／`skipped_count`／`target_date`）、`改运动记录`／`改某日运动`（`old_record`→`new_record`／`matched_count`）、`删运动记录`／`删某日运动`／`批量删运动`（`snapshot`／`deleted_count`）。

### 样式特性

| 项 | 值 | 证据 |
|---|---|---|
| 配色变量 | `--fg:#1d1d1d` `--fg2:#6e6e73` `--fg3:#86868b` `--bg:#fafafa` `--card:#fff` `--border:#d2d2d7` `--accent:#0071e3` `--good:#34c759` `--warn:#ff9500` `--bad:#ff3b30` `--soft:#f5f5f7` | `templates/crud_receipt.html:11-13` |
| 无运动族语义色 | 该模板**没有** `--strength`／`--cardio`／`--flex`／`--daily`（对比 `templates/exercise_distribution.html:14` 有这四个） | `scan2_templates.json` `css_vars` 长度 11 |
| 排版 | `body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; max-width:780px; margin:0 auto; padding:48px 24px 80px}` | `templates/crud_receipt.html:15-17` |
| 圆角尺度 | 卡片 14–16px、内层块 8–12px、徽章 6px／胶囊 999px | `:21/:27/:49/:64/:71/:79/:88/:92` |
| 变更色 | 旧值 `background:#ffeaea; color:#c7254e; text-decoration:line-through`；新值 `background:rgba(52,199,89,.15); color:var(--good)` | `templates/crud_receipt.html:64-65` |
| 响应式 | `@media (max-width:640px)`：`.section` 内距 16/18、`.kpi-grid` 改两列、`.diff-row` 塌成单列 `grid-template-columns:1fr` | `:110-122`（`:113/:114/:121`） |
| 触屏补偿 | `@media (hover:none)` 单独一段 | `:104-108` |
| 打印 | **无任何 `@media print`／`@page` 规则**（在 `templates/` 全目录按 `print` 检索，该模板零命中） | 全目录检索结果 |
| 复制浮层 | `.fmt-menu` 绝对定位浮层（`bottom:calc(100% + 8px)`、`box-shadow:0 8px 24px rgba(0,0,0,.14)`、`min-width:200px; max-width:calc(100vw - 32px)`） | `templates/crud_receipt.html:98-99` |

### 交互特性

- **复制**：页尾 `#actionbar-zone` 由公共件 `window.actionBar(window.__P__)` 填充（`templates/crud_receipt.html:462-463`）；复制内容由本页自己的 `payloadData()` 结构化产（`:436-457`），固定六段：`op`／`record_id`／`summary`／`record`／`diff`（update 时逐字段 `{before, after, impact?}`）／`kpis`／`items` —— 注释自称「JSON 固定 5 段」（`:435`），实测产 6 个键。
- **撤销**：`#undoBtn` 仅在 `meta.undo_cli` 存在时 `display:inline-block`，否则 `display:none`（`:414-429`）；点击把一句自然语言撤销指令交给 `window.copyText`，成功后 `window.toast('✓ 撤销指令已复制')`（`:418-426`）。
- **条件展开（无折叠控件）**：四张卡按 `op` 与数据有无决定显隐 —— diff 卡三分支：`update` 走旧→新对照（`:302-327`）、`delete` 走删除前快照（`:328-350`）、`create` 走新增内容（`:351-371`）；三种分支都在末尾判「零行则整卡隐藏」（`:324-326`／`:348-350`／`:369-371`）。累计卡在 `delete` 下不出现（`:374-375`），无 `totals` 时整卡隐藏（`:385-387`）。
- **无 tab、无筛选、无排序、无锚点跳转、无 `<details>` 折叠**：全 `templates/` 目录检索 `<details|<summary|role="tab"|aria-` 时，本模板零命中（命中集中在 `body_measurements_wizard.html`、`body_composition_wizard.html` 等向导页）。
- **备注行**：仅 `add` 且 `new_record.note` 非空时，在 KPI 卡后插入一行浅灰 `.note-line`（`:224-230`），长文本不进 KPI 卡。

### 优秀部分（逐条带证据）

1. **写操作四态是表驱动，一格定义四处复用**：`opLabels`／`opColors`／`opIcons` 三张表加一个回退（`templates/crud_receipt.html:192-197`），页面配色、徽章、图标、文案全从这一处取，`add` 与 `create` 同义同色，不存在两处口径。
2. **没有内容就不留空壳**：四张卡各自带「无数据即隐藏」判据（`:213-222` KPI、`:324-326`／`:348-350`／`:369-371` diff、`:385-387` 累计、`:390-409` 明细），产出的回执页不会出现空标题卡。
3. **三种写操作共用同一张 diff 卡**：删除走「删除前快照」、新增走「新增内容」，都复用 `.diff-row` 网格，并用 `style="visibility:hidden"` 的箭头占位保持左右栏对齐（`:341-347`／`:362-367`），无需第二套样式。
4. **关键数字强调有统一手段**：`summaryLine` 把「数字＋单位（卡／分钟／克／步／km／ml／组／kg／次／条）」包 `<span class="sum-nums">`（`:269`）；「旧→新」对子改用 `.sum-old`／`.sum-new` 着色，并用 `\u0000` 占位符防止二次替换嵌套（`:262-271`）。
5. **撤销是「可撤销才出现」的**：`undo_cli` 缺失即隐藏按钮（`:414-429`），页面不提供没有出口的按钮。
6. **复制出口与页面同一份数据**：`payloadData()` 产结构化对象，`diff` 里带 `before`／`after`／`impact`（`:436-457`），机器拿到的是字段级差异，不是从 DOM 抠文本。
7. **字段中文标签随身携带且被两处共用**：63 项 `FIELD_LABELS`（`:278-291`）同时服务 diff 卡与删除快照，运动族专有字段已就位（`:285-288`）。
8. **移动端与触屏有显式补丁**：单独 `@media (hover:none)`（`:104-108`）＋ 640px 断点重排（`:110-122`），手机上 KPI 两列、diff 单列。

### 明显短板

1. **无打印样式**：整份模板没有 `@media print`／`@page`，回执页存成 PDF 只能拿到屏幕版。
2. **字段值转义口径不一致**：`escapeHTML` 只用在 `note`（`:228`）与 `items[].food_name`（`:403`），而 diff 行（`:316-322`）与累计行（`:379-383`）直接插值，值里带 `<`／`&` 会破版面。
3. **运动族字段标签有漏项**：`FIELD_LABELS` 无 `is_estimated`（`记运动` 的字段之一，见 `scene04_39.json`）—— 该键会在详情行原样显示英文键名（回退在 `:314`／`:361`）。
4. **`#recordMeta` 是死代码**：先 `style.display='none'` 再赋 `textContent`（`templates/crud_receipt.html:205-206`），内容永远不会出现。
5. **一句话总结的强解析只认饮食句式**：正则写死「今日/当日累计 X / Y 卡|ml …剩余/超标」（`:238`）；运动场景的「消耗 X 卡」落进 `else` 分支，只有泛化的数字着色，拿不到「累计／目标／剩余」数字行（`:256-273`）。
6. **明细卡按饮食口径写死**：行模板固定 `time`／`food_name`／`grams+“g”`／`calories+“卡”`（`:400-407`），运动明细（类型／时长／热量）套进来会露出「克数」这一不存在的口径。
7. **标题依赖数据自己的标签**：标题取 `context.items[0].label || '已处理'`（`:393-397`），label 缺失时页面写「已处理明细」，用户读不到操作对象。
8. **公共样式靠复制流传**：8 个模板各自在 `:4` 放一份 `<!--SHARED-CSS-->`，且灰色口径已经分叉 —— 本模板与 `templates/exercise_summary.html:11` 是 `--fg:#1d1d1d`，`templates/exercise_distribution.html:11` 是 `--fg:#1d1d1f`。
9. **无机读契约**：26 KB／466 行里约 280 行是内联脚本，字段契约只活在 `FIELD_LABELS` 与注释里，没有可被机器校验的数据契约。

## 二、运动汇总 · `templates/exercise_summary.html`

**绝对路径** `D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_summary.html`
**字节** 11,856 B（`scan2_templates.json` 记 228 行；读取器按末尾空行口径报 227 行）。`placeholders` 为空数组，同样靠注释标记注入（`templates/exercise_summary.html:4` 的 `<!--SHARED-CSS-->`，`:72` 的 `<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->`／`<!--CHARTS-HELPERS-->`）。

**这一件承载 15 条唤醒词**，地图 #167 的正式归类把它拆成两类：「运动汇总」10 条（`mode=summary`：看本周／看上周／看本月／看上月／看最近 7 天／30 天／60 天／180 天／365 天／看某段时间）＋「记录级明细」5 条（`mode=records`：看今日运动／看昨日运动／看运动记录（有备注）／（按力量筛选）／（按有氧筛选））。本席按票面口径再补一句：**日期窗口词共 12 条**（上列 10 条窗口 ＋ 今日／昨日两条按日语），另 3 条是记录筛选词。

### 区块结构树

```
head
├─ meta viewport（width=device-width, initial-scale=1.0）   exercise_summary.html:6
└─ <style><!--SHARED-CSS--></style>                        :4
body
├─ script#payload <!--INJECT-DATA-->／<!--SHARED-HELPERS-->／<!--CHARTS-HELPERS--> ＋ __P__ 解析  :72
├─ .meta-bar                                              exercise_summary.html:74-77
│   ├─ .left#metaLeft「起 ~ 止 · 共 N 条」                  :75（值在 :118）
│   └─ .mode-badge#modeBadge（mode 大写，如 SUMMARY）       :76（值在 :119）
├─ h1#h1Title（按 mode 换标题，默认「🏃 运动报表」）        :79（映射表 :121-127）
├─ p.sub#sub（取 summary.subtitle）                        :80（:128）
├─ .kpi-grid（固定 4 张卡，每卡 label/value/extra 三段）    :82-87
│   └─ #k1L/#k1/#k1E … #k4L/#k4/#k4E                       :83-86（取值 :130-141）
├─ .section#chartSection（默认 display:none）              exercise_summary.html:89-93
│   ├─ h2#chartTitle                                       :90
│   ├─ #chart（图表落点，由 window.charts.line／bar 画）    :91
│   └─ .legend#legend                                      :92
├─ .section（明细区，始终存在）                             :95-101
│   ├─ h2#tableTitle（取 summary.table_title，缺省「明细」） :96（:180）
│   └─ .table-wrap > table > thead#tableHead ＋ tbody#tableBody  :97-100
├─ .footer > .src#srcLine（📊 数据来源…）                  :103-106（值在 :217）
├─ 渲染脚本（IIFE，四模式分支）                             exercise_summary.html:108-220
├─ #actionbar-zone ＋ 复制区注入                           :224-225
```

**表格**：一件表、两套列，列名不由模板写死 —— 表头整段由数据注入 `document.getElementById('tableHead').innerHTML = summary.table_header`（`templates/exercise_summary.html:179`）。
- `mode=stats` 支（`:183-203`）6 列：类别（带 `.cat-*` 语义色）／次数／热量／**占比（数字 ＋ `.bar-wrap` 迷你条）**／时长／组数，末尾追加一行「合计」（`.soft` 底加粗，`:197-203`）。
- `mode=records`（含 `summary` 兜底）支（`:204-214`）6 列：日期／时间／类型（按 `p.category` 上色，`:207-210`）／时长／热量／组数（`p.sets || '-'`）。

### 字段（页面数据契约）

| 段 | 字段 | 说明 |
|---|---|---|
| 顶层 | `status` | 非 `ok` 整页换 `window.errorReceipt({...})`（`:111-114`） |
| 顶层 | `mode` | 四态 `records`（缺省）／`summary`／`stats`／`trend`（`:115-116`） |
| `meta` | `start`／`end` | 页眉与脚注的窗口（`:118`／`:217`） |
| `summary` | `subtitle` | 副标题（`:128`） |
| `summary` | `k1`–`k4` | 四张 KPI 卡的 `{label, value, extra}`；`extra` 走 `innerHTML`（`:130-141`） |
| `summary` | `table_header`／`table_title` | 表头 HTML 与表标题（`:179-180`） |
| `items[]` | `date`／`time`／`exercise_type`／`category`／`minutes`／`calorie`／`sets` | 记录支用（`:206-213`） |
| `items[]` | `calorie`（趋势支逐日） | 趋势图数据点，标签取 `date.slice(5)`（`:148-155`） |
| `stats` | `by_category{strength,cardio,flex,daily}.{count,calorie,minutes,sets}` ＋ `total_count`／`total_calorie`／`total_minutes`／`total_sets` | 统计支与柱状图用（`:161-203`） |

对应唤醒词的字段（`scene04_39.json`）：窗口词一族要 `start_date`／`end_date`／`records`／`total_calories`／`total_minutes`／`daily_avg`／`active_days`，60／180／365 天还要 `daily_rows`／`downsample_rows`；记录筛选一族要 `records` 以及 `note`（有备注）／`set_index`+`load_kg`+`reps`（按力量）／`distance_km`+`pace`（按有氧）。

### 样式特性

| 项 | 值 | 证据 |
|---|---|---|
| 配色变量 | `--fg:#1d1d1d` `--fg2:#6e6e73` `--fg3:#86868b` `--bg:#fafafa` `--card:#fff` `--border:#d2d2d7` `--accent:#0071e3` `--good:#34c759` `--warn:#ff9500` `--bad:#ff3b30` `--soft:#f5f5f7` | `templates/exercise_summary.html:11-13` |
| 运动类别语义色（本件独有） | `--strength:#5856d6` `--cardio:#0071e3` `--flex:#34c759` `--daily:#ff9500` | `templates/exercise_summary.html:14` |
| 排版 | `body{max-width:920px; padding:48px 24px 80px; line-height:1.6}`；`h1{font-size:28px; letter-spacing:-.02em}` | `:17-20` |
| KPI 卡 | `.kpi-grid{grid-template-columns:repeat(4,1fr)}`；`.value{font-size:24px;font-weight:700}`；`.extra{font-size:11px;color:var(--fg3)}` | `:26-30` |
| 表格 | `table{width:100%;border-collapse:collapse;font-size:13px}`；`th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--border)}`；`th{background:var(--soft);font-size:11px}` | `:36-39` |
| 数字对齐 | `.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}` | `:40-41` |
| 类别文字色 | `.cat-strength/.cat-cardio/.cat-flex/.cat-daily` 各取对应变量 | `:42-45` |
| 迷你占比条 | `.bar-wrap{height:6px;background:var(--soft);border-radius:3px}` ＋ `.bar{height:100%}` | `:46-47` |
| 响应式 | `@media (max-width:640px)`：body 内距 20/14/80、`h1` 22px、`.section` 16/18、`.kpi-grid` 两列；**表格不改版，靠 `.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}` 横向滚动** | `:56-64` |
| 打印 | **无 `@media print`／`@page`**（全目录按 `print` 检索零命中） | 全目录检索结果 |
| 动效 | `@keyframes fadeup`（提示条用，来自共享样式段） | `:67` |

### 交互特性

- **四模式一模板**：`mode` 决定标题、徽章、KPI 文案、图表类型与表格架构（`templates/exercise_summary.html:115-127`／`:144-215`）；模板里没有 tab 控件，模式由数据选定。
- **图表按需出现**：`#chartSection` 默认 `display:none`（`:89`），仅 `trend` 且有记录时画面积折线（`window.charts.line`，height 220、`labels:'select'`、`tooltip:true`，`:144-156`），仅 `stats` 且 `by_category` 存在时画柱状（`window.charts.bar`，四类别各自语义色，`:157-175`）。
- **复制**：页尾 `#actionbar-zone` 由 `window.actionBar(window.__P__)` 注入（`:224-225`），与本模板自身脚本解耦。
- **无筛选、无排序、无折叠、无 tab、无锚点**：全 `templates/` 目录按 `<details|<summary|role="tab"|aria-` 检索，本模板零命中；模板内也没有 `.sort(`。
- **截断**：记录支只渲染前 50 条（`items.slice(0, 50)`，`:206`）。

### 优秀部分（逐条带证据）

1. **一件模板顶四页，模式即身份**：`const m = mode || 'records'`（`templates/exercise_summary.html:116`）＋ 标题映射表（`:121-127`）＋ 图表两分支（`:144`／`:157`）＋ 表格两分支（`:183`／`:204`），读类四种口径共用一套版面，不复制四份模板。
2. **表头由数据驱动，列可随模式换**：`tableHead.innerHTML = summary.table_header`（`:179`）让记录表格与统计表格共享同一个 `.table-wrap`＋`thead/tbody` 骨架，列名不写死在模板里。
3. **类别色成对出现、表图同源**：文字色 `.cat-*`（`:42-45`）、图例色（`:172-175`）、柱色（`:163`）、进度条色（`:192`）全取 `--strength/--cardio/--flex/--daily` 同一组变量，读表和读图不会出现两套颜色。
4. **占比列数字与图形同格**：`${pct}%<div class="bar-wrap"><div class="bar" style="width:${pct}%…">` （`:192`）＋ `.bar-wrap`／`.bar`（`:46-47`），一眼看出四类占比的差距。
5. **小屏保表格语义**：640px 断点只重排内距与 KPI 列数，表格交给 `.table-wrap{overflow-x:auto}` 横向滚动（`:56-64`），六列不会被塌成难以对齐的卡片。
6. **柱状／折线纵轴自适应取整**：按数据量级选步长 20／50／100／200 再乘 1.15 向上取整（`:150-151`），小数据量不会贴地。
7. **脚注给来源与窗口**：`.footer .src`（`:49`）由 `srcLine` 写入「📊 数据来源:exercise_log · 起 → 止 · N 条」（`:217`），复核时不必猜数据窗口。
8. **失败有统一出口**：`status !== 'ok'` 时整页换 `window.errorReceipt`（`:111-114`），不会留半张空表。

### 明显短板

1. **记录列表静默截断 50 条**：`items.slice(0, 50)`（`templates/exercise_summary.html:206`），而页眉写「共 `items.length` 条」（`:118`）、脚注也写 `items.length`（`:217`）—— 页眉数字与可见行数可以不一致，`看最近 365 天运动` 这类大窗口首当其冲。
2. **全模板零转义**：模板里根本没有 `escapeHTML`，表头（`:179`）、统计行（`:189-203`）、记录行（`:209-213`）全部直接插值，且 `summary.k1E`–`k4E` 走 `innerHTML`（`:132`／`:135`／`:138`／`:141`）。
3. **记录级明细列缺项**：记录支只有日期／时间／类型／时长／热量／组数六列（`:209-213`），而 `scene04_39.json` 里 `看运动记录（按有氧筛选）` 承诺 `distance_km`／`pace`、`看运动记录（有备注）` 承诺 `note`、按力量筛选承诺 `set_index`／`load_kg`／`reps` —— 这些列今天没有落脚点（#342 要补的就是这里）。
4. **KPI 固定四张且无判空**：结构写死四张卡（`:82-87`），取值 `summary.k1.label` 起无缺项保护（`:130-141`），数据缺 `k4` 会直接抛错、整页空白。
5. **无打印样式**：没有 `@media print`／`@page`。
6. **公共样式与灰色口径分叉**：本件 `--fg:#1d1d1d`（`:11`），`templates/exercise_distribution.html:11` 是 `--fg:#1d1d1f`。
7. **列名不在模板里**：表头靠数据注入（`:179`），模板自身无法自证「列齐不齐」，机器复核必须跑到脚本层。
8. **无排序／筛选／折叠控件**：`:206` 起的渲染只是按数据顺序铺行，长窗口（365 天）无法在页内收窄。

## 三、对照目标 · `templates/exercise_goal_view.html`

**绝对路径** `D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_goal_view.html`
**字节** 7,662 B（138 行）。`placeholders` 为空数组；注入标记在 `templates/exercise_goal_view.html:4`（`<!--SHARED-CSS-->`）与 `:58`（`<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->`／`<!--CHARTS-HELPERS-->`）。
**承载** 2 条唤醒词：`看今日运动（vs 目标）`（`--period today`）与 `看本周运动（vs 目标）`（`--period week`）。

### 区块结构树

```
head
├─ meta viewport（width=device-width, initial-scale=1.0）    exercise_goal_view.html:6
└─ <style><!--SHARED-CSS--></style>                         :4
body
├─ script#payload <!--INJECT-DATA-->／<!--SHARED-HELPERS-->／<!--CHARTS-HELPERS--> ＋ __P__ 解析  :58
├─ .meta-bar > .left#metaLeft（今天日期）                    :60（值在 :97）
├─ h1#h1Title「🎯 运动目标达成」                             :61
├─ p.sub#subTitle（今日／本周目标达成）                      :62（值在 :98-99）
├─ #emptyBox（默认 display:none，无目标时用）                :64（:101-105）
├─ #content（默认 display:none，有目标才开）                 exercise_goal_view.html:66-86
│   ├─ .ring-card                                          :67-76
│   │   ├─ .ring-wrap（220×220 定位容器）                    :68
│   │   │   ├─ #ringBar（进度环落点，由 charts.donut 画）     :69
│   │   │   └─ .ring-center > .ring-pct#ringPct ＋ .ring-label#ringLabel  :70-73
│   │   └─ .verdict#verdict（ok／no 两态胶囊）               :75
│   ├─ .kpi-grid（固定 4 张：目标／实际消耗／距目标／区间）     :78-83
│   │   └─ #kGoal／#kGoalExtra、#kActual／…、#kGap／…、#kRange／…  :79-82
│   └─ .summary-card#summaryLine（💬 一句话）                :85
├─ .footer（空壳，无内容）                                   :88-90
├─ 渲染脚本（IIFE，97-128）                                 exercise_goal_view.html:92-131
├─ #actionbar-zone ＋ 复制区注入                            :134-135
```

**表格**：无（`scan2_templates.json` 的 `tables` 为空数组）—— 三件里唯一完全没有表格的一件，全部信息压在「一个环 ＋ 四张卡 ＋ 一句话」上。

### 字段（页面数据契约）

| 字段 | 用途 | 证据 |
|---|---|---|
| `status` | 非 `ok` 整页换 `window.errorReceipt` | `templates/exercise_goal_view.html:95` |
| `period` | `today`／`week` 二态，决定副标题、两处 extra 文案 | `:99`／`:121`／`:123`／`:127` |
| `goal` | 目标卡与环的分母；`null` 走空态 | `:101`／`:120` |
| `actual` | 实际消耗 | `:122` |
| `pct` | 完成度百分比（进环取 `min(pct,100)`，进中心文字取原值） | `:108`／`:114` |
| `gap` | 距目标差值，文案二分支「超额 X 卡」／「差 X 卡」 | `:124` |
| `achieved` | 布尔，决定环色（`#34c759` ／ `#0071e3`）、判决胶囊 class、文案 | `:112`／`:117`／`:124-125` |
| `verdict` | 判决文案（如「已达成」） | `:116` |
| `range.start`／`range.end` | 区间卡（取 `slice(5)` 去掉年份） | `:126` |
| `summary` | 一句话总结；`goal == null` 时同一字段兼作空态文案 | `:102`／`:128` |
| `meta.today` | 页眉日期 | `:97` |
| `meta.daily_goal` | 周口径展开用（每日目标 × 7） | `:121` |

对应唤醒词字段（`scene04_39.json`）：两条词都要 `exercise_goal`／`actual`／`completion_pct`／`gap`／`achieved`／`summary`，`看本周运动（vs 目标）` 额外要 `week_goal`。

### 样式特性

| 项 | 值 | 证据 |
|---|---|---|
| 配色变量 | `--fg:#1d1d1d` `--fg2:#6e6e73` `--fg3:#86868b` `--bg:#fafafa` `--card:#fff` `--border:#d2d2d7` `--accent:#0071e3` `--good:#34c759` `--warn:#ff9500` `--bad:#ff3b30` `--soft:#f5f5f7` | `templates/exercise_goal_view.html:10-12` |
| 排版 | `body{max-width:780px; padding:48px 24px 80px}`；`h1{font-size:32px; letter-spacing:-.025em}`（三件里最大的标题） | `:15`／`:18` |
| 进度环卡 | `.ring-card{border-radius:20px}`（三件里最大的圆角）；`.ring-wrap{position:relative;width:220px;height:220px}`；`.ring-pct{font-size:44px;font-weight:800}` | `:20-26` |
| 判决胶囊 | `.verdict{padding:6px 18px;border-radius:20px}`；`.ok{background:rgba(52,199,89,.15);color:var(--good)}`；`.no{background:rgba(255,59,48,.15);color:var(--bad)}` | `:27-30` |
| KPI 卡 | `grid-template-columns:repeat(4,1fr)`；`.value{font-size:20px}`（比 summary 的 24px 小一档，为环让位） | `:31-35` |
| 一句话卡 | `.summary-card{background:var(--soft);border-radius:14px;padding:16px 20px;font-size:15px}` | `:36-37` |
| 响应式 | `@media (max-width:640px)`：`h1` 22px、`.kpi-grid` 两列、**`.ring-wrap` 从 220 缩到 180** | `:45-49` |
| 打印 | **无 `@media print`／`@page`**（全目录按 `print` 检索零命中） | 全目录检索结果 |

### 交互特性

- **两态显隐，互斥**：`#content` 与 `#emptyBox` 都默认 `display:none`（`templates/exercise_goal_view.html:64`／`:66`）；`goal == null` 时只开空态并 `return`（`:101-105`），有目标时只开内容区（`:107`）—— 不会出现「空环 ＋ 报错文案」同时在页。
- **进度环**：`window.charts.donut` 单段环（`:111-113`），`size:220`／`ringWidth:16`／`legend:'none'`／`showPercent:false`，中心文字交给 HTML 覆盖层（注释记明这是 #317 验收修复：组件自带的 `centerValue`／`format` 会双重显示并叠出 `%%`）。
- **进度环颜色随达成态**：`color: d.achieved ? '#34c759' : '#0071e3'`（`:112`），与判决胶囊的 `ok`／`no`（`:117`）同向。
- **复制**：页尾 `#actionbar-zone` 由 `window.actionBar(window.__P__)` 注入（`:134-135`）。
- **无 tab、无筛选、无排序、无折叠、无锚点**：全 `templates/` 目录按 `<details|<summary|role="tab"|aria-` 检索，本件零命中。

### 优秀部分（逐条带证据）

1. **目标缺席有专门空态，且不画空环**：`d.goal == null` → `window.emptyState({text: '⚠ ' + d.summary})` ＋ `return`（`templates/exercise_goal_view.html:101-105`），一个「没有目标」的用户看到的是原因，不是 0% 的环。
2. **写 DOM 全走 `textContent`**：全脚本除空态外没有一处 `innerHTML` 插数据（`:97-128`），是本席三件里注入面最小的一件（对照 `templates/exercise_summary.html:132` 起的多处 `innerHTML`）。
3. **口径写在页面上**：周模式下副标题直接写「本周目标达成(周目标 = 每日目标 × 7)」（`:99`），目标卡 extra 再写「每日 X 卡 × 7」（`:121`）—— 用户能在页内自证周目标怎么来的。
4. **达成与未达成各有准话**：`gap` 走二分支文案「超额 X 卡」／「差 X 卡」（`:124`），extra 配「已超额完成」／「还需再练」（`:125`），判决胶囊两态配色（`:29-30`／`:117`），三处同向。
5. **环形取 `min(pct,100)` 防溢出**，超额由文字（`ringPct` 原值 ＋ `gap` 文案）承载（`:108`／`:114`／`:124`）—— 环不会被画爆。
6. **空态借用同一份 `summary` 字段**（`:102`），不为空态另造一套文案来源。
7. **移动端给环留位**：640px 断点把环从 220 缩到 180（`:49`），而不是让 220px 固定宽卡小屏出横向滚动。

### 明显短板

1. **环色与 CSS 变量双轨**：JS 里硬写 `'#34c759'`／`'#0071e3'`（`templates/exercise_goal_view.html:112`），而同一页面 CSS 已有 `var(--good)`／`var(--accent)`（`:12`）—— 改主题色要改两处。
2. **`fmt` 是死代码**：`const fmt = n => (n > 0 ? '+' : '') + n;`（`:119`）定义后全页无一处调用。
3. **`.footer` 是空壳**：`:88-90` 只有一层 `.footer` 标签、无来源行（对照 `templates/exercise_summary.html:104` 的 `.src` 脚注），页内看不到数据来源与统计口径。
4. **`charts` 组件是硬依赖无降级**：进度环是全页唯一主视觉，`window.charts.donut`（`:111`）若缺失，`#content` 会打开但环区为空（`#content` 的显示判定只看 `goal`，`:107`）。
5. **超额表达不完整**：`pct` 夹到 100 后环恒定满环（`:108`），「超了多少」只能读 `gap` 文字；环本身不表达超额比例。
6. **周目标 ×7 是硬编码文案**：`:99`／`:121` 两处各自写「× 7」，算法若改（例如按剩余天数折算）两处会分叉。
7. **只有两条词，却带一整套完整模板**：7.6 KB／138 行只服务 `看今日运动（vs 目标）`／`看本周运动（vs 目标）`，`period` 也只有二态（`:99`），本图其余 37 条词无一件可复用它的结构。
8. **无打印样式**：没有 `@media print`／`@page`（例如「本周达到 120%」这类成绩页很自然会想打印或存图）。

## 四、老模板 → 本图页面族／票／唤醒词 对应表

| 老模板 | 本图页面族 | 票（材料在 `.scratch/t156-old/`） | 唤醒词 |
|---|---|---|---|
| `templates/crud_receipt.html` | 写后回执页（13 条词） | **#264**「写后回执页（13 条写词的产物出完整文档）」（t264.json；地图记「已关」） | 记运动／记运动（含备注）／记力量训练／记有氧运动／记日常活动／补记运动／批量补记运动／复制昨日运动／改运动记录／改某日运动／删运动记录／删某日运动／批量删运动（13 条，逐条到词） |
| `templates/exercise_summary.html` | 运动汇总（10 条） | 本席手上三张票面（t264／t265／t342）**未见**覆盖这 10 条的票；地图正文记「其余读类产物已是完整文档」 | 看本周运动／看上周运动／看本月运动／看上月运动／看最近 7 天运动／看最近 30 天运动／看最近 60 天运动／看最近 180 天运动／看最近 365 天运动／看某段时间运动（10 条，逐条到词） |
| 同上（同一模板的另一模式） | 记录级明细（5 条） | **#342**「记录级明细（运动记录这一族 ＋ 接住没有命令的那 1 条词）」（t342.json） | 看今日运动／看昨日运动／看运动记录（有备注）／看运动记录（按力量筛选）／看运动记录（按有氧筛选）（5 条，逐条到词；其中「看运动记录（有备注）」原为无命令可执行的那 1 条） |
| `templates/exercise_goal_view.html` | 对照目标（2 条） | 本席手上三张票面**未见**覆盖；t265 的 7 条词是分布／趋势／复盘（运动分布、运动趋势、运动复盘×5），不含对照目标 | 看今日运动（vs 目标）／看本周运动（vs 目标）（2 条，逐条到词） |

族级兜底（票面未逐词点名时的口径）：写后回执页 ＝ #264（13 条全中）；运动汇总 ＝ 无票面（示例词「看本周运动」）；记录级明细 ＝ #342（t342.json 正文点名的示例路线为 `--mode records` ＋ `--today`／`--yesterday`／`--has-note`／`--category 力量|有氧`，与 5 条词一一对上）；对照目标 ＝ 无票面（示例词「看今日运动（vs 目标）」）。

## 五、取证方法与边界

- **逐件读法**：先读前席提取件（`.scratch/t156-old/body_crud_receipt.txt`／`body_exercise_summary.txt`／`body_exercise_goal_view.txt`），每读完一件立刻落一节；样式段不在提取件里（`templates/crud_receipt.html` 样式段至 `:129` 处的 `</style>`、`templates/exercise_summary.html` 至 `:68`、`templates/exercise_goal_view.html` 至 `:55`），仅对「本模板自身」按关键词定点检索／定点切片，**没有整份读入老 HTML**。
- **引用口径**：所有行号来自本席当场检索或切片，与 `scan2_templates.json` 的行号一致（该件行号亦为前席当场扫描所得）；`--fg:#1d1d1d` 与 `--fg:#1d1d1f` 的分叉、`@media print` 的缺席、「无 `<details>`／无 `role="tab"`／无 `aria-`」三项均由「全 `templates/` 目录检索」得出，属存在性判断而非抽样。
- **未覆盖**：本席只写上述 3 件；`exercise_distribution`／`exercise_strength`／`exercise_cardio`／`exercise_trend`／`exercise_recap` 五件及 #265 那 7 条词不属本席（另有席）。
- **未做**：老技能目录只读、未改动；本席未跑老脚本、未重新扫描（复用前席 `scan*.json`）。
