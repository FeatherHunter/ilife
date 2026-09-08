# #78 契约施工面取证报告（只读取证 · R1）

- 票：`#78`《base- 图表层与 HELP 壳（含 scene-data 契约）》，map `#63`，`blocked_by=#92`（已关），当前 `OPEN`／进度 0%（`gh issue view 78`）。
- 仓库：`D:\ilife`，分支 `master`，HEAD `aed1b7c`（工作区仅既有未跟踪噪声，无脏改动）。
- 取证方式：只读 `read`／`grep`／`glob`＋只读 `gh issue view`；**未运行构建／测试／任何 git 写命令**；**未创建除本文件外的任何文件**。
- 禁读项已遵守：未访问 `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考`。

---

## 0. 结论前置

1. **#78 的冻结面恰好 27 条**，位于 `packages/base-render/src/spec/index.ts:155-181`（`ticket: '#78'`），其中 **implemented 22 条／pending 5 条**。计数实测：全清单 130 条，`#78` 22＋5＝27（脚本按 `ticket`／`status` 分组统计）。
2. **5 条 pending 名单**（逐条行号）：
   - `charts`（runtime，`spec/index.ts:173`）
   - `RenderHelpShell`（type，`spec/index.ts:177`）
   - `renderHelpShell`（runtime，`spec/index.ts:178`）
   - `BuildChartsHelpersJs`（type，`spec/index.ts:180`）
   - `buildChartsHelpersJs`（runtime，`spec/index.ts:181`）
   即 **runtime 3 条 ＋ type 2 条**。
3. **全仓 `status: 'pending'` 只剩 7 条**，实测分布：`#75` 两条（`spec/index.ts:79` `BuildStyleSheet`、`:80` `buildStyleSheet`）＋ `#78` 五条。与 map `#63` 正文「base-paint 仅剩 7 条 pending（#75 两条 ＋ #78 五条）」逐字一致（`gh issue view 63` 进度段）。
4. **已 implemented 的 22 条全部是「纯数据常量 ＋ 类型」**，落点在 `src/spec/charts.ts`（11 条）与 `src/spec/help.ts`（11 条）；**还缺的只有 3 个运行时值 ＋ 2 个已声明类型的实现体**。即：#78 的施工**几乎不需要新增任何类型**——8 个 `*ChartInput`／`*Options`／`SceneData`／`Scene`／`SceneGroup` 等形状**都已冻结存在**（`spec/charts.ts:13-213`、`spec/help.ts:22-101`）。
5. **三处同步**＝`spec/index.ts`（清单）↔ `docs/base-paint-contract.md` §3.5 标记区（`:749-779`）↔ `packages/base-render/test-d/contract-signatures.ts`（`:335-359`）；另有运行时出口锁 `packages/base-render/test/contract-signatures.test.mjs`（`:263-293`）**自动从清单派生**，不需手改名单。翻转要改的行号见 §4.4。
6. **发现 6 项需裁定的矛盾／缺口**（详见 §8），其中 3 项会直接卡住施工：① `scenes[]`「非空」在机读 schema 里无 `minItems`（AC-4 口径下文档与唯一权威不一致）；② 图表 CSS 唯一真相源冲突（`CONTROL_STYLE_SECTIONS` 含 `charts` vs `CHARTS_STYLE_ID` 自注入）；③ **HELP 内置壳模板无冻结名**——且**新增任何未登记清单的运行时出口会让签名测试红**（`test/contract-signatures.test.mjs:268-272`），故内置模板只能是模块内部常量。

---

## 1. `ticket: '#78'` 的 27 条冻结面（逐条原文）

来源：`packages/base-render/src/spec/index.ts:155-181`（每条 = 源文件一整行；下方 `signature` 为**逐字照抄**，未做任何改写；仅把签名内的 `|` 保持原样）。文档投影在 `docs/base-paint-contract.md:752-778`（同名、同序、逐字）。

### 1.1 27 条清单

- **1** `CHART_KINDS` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']`（`spec/index.ts:155`）
- **2** `CHARTS_STYLE_ID` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'ilife-charts'`（`:156`）
- **3** `CHART_STRUCTURE_RULE` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'throw'`（`:157`）
- **4** `CHART_EMPTY_RULE` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'emptyState'`（`:158`）
- **5** `CHART_COORD_RULE` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'viewBox-only'`（`:159`）
- **6** `CHART_BREAKPOINTS` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `{ mobileMaxPx: 720; dotSizeMobilePx: 8; lineHeightMobilePx: 150; stackedGapPx: 3 }`（`:160`）
- **7** `CHART_PALETTE` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']`（`:161`）
- **8** `CHART_ERROR_CODES` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']`（`:162`）
- **9** `SCENE_STATUS` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['', '【待开发】']`（`:163`）
- **10** `SCENE_TYPE_FIELD` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'types'`（`:164`）
- **11** `SCENE_DATA_SCHEMA` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `object（draft-07；$id: 'ilife://base-paint/scene-data.schema.json'）`（`:165`）
- **12** `HELP_SHELL_ID` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `'ilife-help-shell'`（`:166`）
- **13** `HELP_COPY_TARGETS` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['prompt', 'wakeWord', 'params']`（`:167`）
- **14** `HELP_COPY_ACTIONS` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `{ prompt: { actionId: 'ilife-help-copy-prompt'; label: '复制指令' }; wakeWord: { actionId: 'ilife-help-copy-wakeWord'; label: '复制唤醒词' }; params: { actionId: 'ilife-help-copy-params'; label: '复制参数' } }`（`:168`）
- **15** `HELP_SCHEMA_ERROR_CODES` ｜kind: `runtime`｜status: `implemented`｜section: `3.5`｜signature: `readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']`（`:169`）
- **16** `ChartItem` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ label: string; value: number | null; color?: string; values?: readonly number[]; anomaly?: boolean }`（`:170`）
- **17** `ChartOutput` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ kind: ChartKind; html: string; empty: boolean; points: number }`（`:171`）
- **18** `ChartsApi` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ bar(input: BarChartInput): ChartOutput; line(input: LineChartInput): ChartOutput; donut(input: DonutChartInput): ChartOutput; progress(input: ProgressChartInput): ChartOutput; combo(input: ComboChartInput): ChartOutput; sparkline(input: SparklineChartInput): ChartOutput; gauge(input: GaugeChartInput): ChartOutput; scatter(input: ScatterChartInput): ChartOutput }`（`:172`）
- **19** `charts` ｜kind: `runtime`｜status: **`pending`**｜section: `3.5`｜signature: `ChartsApi`（`:173`）
- **20** `SceneData` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ skill_name: string; title: string; subtitle?: string; meta_blocks?: readonly SceneMetaBlock[]; groups: readonly SceneGroup[]; init_banner?: SceneInitBanner; contact?: SceneContact; version?: string; recommendations?: readonly SceneRecommendation[] }`（`:174`）
- **21** `Scene` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ id: string; title: string; wake_word: string; types?: readonly (string | SceneTypeBadge)[]; status: SceneStatus; prompt_template: string; editable_fields?: readonly SceneEditableField[] }`（`:175`）
- **22** `HelpShellInput` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ sceneData: SceneData; assets: TemplateAssets; strict?: boolean; template?: string }`（`:176`）
- **23** `RenderHelpShell` ｜kind: `type`｜status: **`pending`**｜section: `3.5`｜signature: `(input: HelpShellInput) => FillTemplateOutput`（`:177`）
- **24** `renderHelpShell` ｜kind: `runtime`｜status: **`pending`**｜section: `3.5`｜signature: `(input: HelpShellInput): FillTemplateOutput`（`:178`）
- **25** `ChartsHelpersInput` ｜kind: `type`｜status: `implemented`｜section: `3.5`｜signature: `{ prefix?: string; styleId?: string }`（`:179`）
- **26** `BuildChartsHelpersJs` ｜kind: `type`｜status: **`pending`**｜section: `3.5`｜signature: `(input?: ChartsHelpersInput) => string`（`:180`）
- **27** `buildChartsHelpersJs` ｜kind: `runtime`｜status: **`pending`**｜section: `3.5`｜signature: `(input?: ChartsHelpersInput): string`（`:181`）

### 1.2 5 条 pending（施工面）

| # | name | kind | spec/index.ts | 文档投影 | 缺什么（实测） |
|---|---|---|---|---|---|
| 1 | `charts` | runtime | `:173` | `docs/base-paint-contract.md:770` | 缺 `charts: ChartsApi` 运行时值；类型 `ChartsApi` 已冻结（`spec/charts.ts:204-213`） |
| 2 | `RenderHelpShell` | type | `:177` | `:774` | 类型别名**已存在**（`spec/help.ts:260`）；缺的是 `renderHelpShell` 实现体 |
| 3 | `renderHelpShell` | runtime | `:178` | `:775` | 缺实现 ＋ `src/index.ts` 出口 |
| 4 | `BuildChartsHelpersJs` | type | `:180` | `:777` | 类型别名**已存在**（`spec/charts.ts:272`）；缺的是 `buildChartsHelpersJs` 实现体 |
| 5 | `buildChartsHelpersJs` | runtime | `:181` | `:778` | 缺实现 ＋ `src/index.ts` 出口（`TemplateAssets.chartsHelpersJs` 的唯一产出者，FX-22） |

> 实测：全仓 `grep "export (const|function) (charts|renderHelpShell|buildChartsHelpersJs)"` → **0 命中**（`packages/base-render` 全树）。

### 1.3 全仓 pending 统计（按 ticket 分组）

- 清单条目总数：**130**（`spec/index.ts:44-188`；实测按行解析 `{ name: '…' }` 计 130 条）。
- 分组实测：`#74 implemented 25`／`#75 implemented 6 + pending 2`／`#76 implemented 44`／`#77 implemented 24`／`#78 implemented 22 + pending 5`／`#92 implemented 2`。
- **`status: 'pending'` 全仓仅 7 条**：`spec/index.ts:79`、`:80`（#75）＋ `:173`、`:177`、`:178`、`:180`、`:181`（#78）。
- 交叉证据（其他文件里的 pending 提及，均为**叙述**，不是真相源）：`docs/base-paint-contract.md:269-270`（#75 两行）、`:770,774,775,777,778`（#78 五行）、`:1308`（「implemented 123／pending 7，余下 7 条 = #75 2／#78 5」）、`:1336`（#77 门禁实测同计数）。
- 状态语义（契约原文）：`docs/base-paint-contract.md:120`「`implemented` = #92 已落地（类型或纯数据常量）；`pending` = 执行票实现，落地后**必须**把 `SPEC_FROZEN_SURFACE` 的 status 翻成 `implemented`，否则编译期断言 `Absent<>` 会失败。」；同口径见 `docs/base-paint-contract.md:44`「清单里 `status: pending` 的条目就是执行票的施工面。」

---

## 2. `docs/base-paint-contract.md` §3.5 要点

### 2.1 §3.5 结构地图（行号）

| 位置 | 内容 |
|---|---|
| `:747` | `### 3.5 图表层与 HELP 壳（#78）`（章节标题，被 `test/contract-signatures.test.mjs:300` 逐字钉死） |
| `:749-779` | `<!-- FROZEN-SURFACE-TABLE-START/END -->` 标记区，27 行表（与清单逐字绑死） |
| `:781-804` | `#### 3.5.1 图表 8 接口逐条对照（AC-17／B4）`：19 行对照表（旧签名＋证据行号 → 新签名 → 判定 → 落点） |
| `:805-811` | 「共享图表 JS 文本的唯一产出者（FX-22，归 #78；#74 只消费）」5 条 |
| `:813-821` | `#### 3.5.2 scene-data 契约（AC-3／AC-4）`：字段名裁定 ＋ 唯一机读 schema ＋ FX-6 ＋ 顶层／groups／scenes／meta_blocks 逐层 |
| `:823-850` | `#### 3.5.3 HELP 壳接口（B6／Q11，可直接被 #88 复用）`：代码块 ＋ 形态／Q11／一键复制／FX-7 表／产物结构／填充／#88 复用面／数据归技能包 |
| `:852` | `**所属包**：base-paint`。**旧侧对应物**：§6.5 `contract:199-241`；§6.6 `contract:243-251`；`help_template.html` 611 行；`scene-data-contract.md`／`scene_data.schema.json`；`injector.py:134-191` |

### 2.2 图表 8 接口：输入类型逐字段（含可选性／默认值）

**共同基类** `ChartCommonOptions`（`packages/base-render/src/spec/charts.ts:67-85`，全部可选）：`height?`／`width?`／`compact?`／`color?`／`colors?: readonly string[]`／`format?: (value: number) => string`／`animation?`／`emptyText?`／`tooltip?`／`labels?: 'edge' | 'all' | 'none' | 'select'`／`showValues?: boolean | 'edge'`／`labelRotate?`／`yMin?`／`yMax?`／`grid?`／`actionId?`（注释 `:83-84`「交互以 actionId 传递（HTML 零内联脚本）」）。
**选项级默认值**：契约明确判为「**不冻结也不排除**」，owner **#78**，实现时以 `old-v130-signatures.md:166-178` 为准并在票面逐条对照（`docs/base-paint-contract.md:797`；归档件实测路径 `docs/research/t92-old-v130-signatures.md:166-183`）。

1. **`bar(input: BarChartInput): ChartOutput`**
   - `BarChartInput`（`spec/charts.ts:153-156`）：`items: readonly ChartItem[]`（必填）＋ `options?: BarChartOptions`（可选）。
   - `BarChartOptions extends ChartCommonOptions`（`:110-116`）：`singleColor?: boolean`／`stacked?: boolean`／`grouped?: boolean`／`stackMode?: 'percent' | 'absolute'`／`segNames?: readonly string[]`。
   - 默认值／语义（`doc:797`；`docs/research/t92-old-v130-signatures.md:168,170`）：`stackMode` 缺省 `percent`；`stacked` 与 `grouped` **互斥**（同传 `stacked` 优先）；不传 `stacked`／`grouped` → 既有单柱渲染逐字节不变；`segNames` 缺省「段1／段2…」；多值结构 `item.values` 长度须一致、值必须为数字，违规抛错。
2. **`line(input: LineChartInput): ChartOutput`**
   - `LineChartInput`（`:158-161`）：`items: readonly ChartItem[]` ＋ `options?: LineChartOptions`。
   - `LineChartOptions`（`:87-108`）：`lineWidth?`／`dashed?`／`smooth?`／`step?`／`showDots?`／`dotSize?`／`dotStyle?`／`area?`／`areaOpacity?`／`yTicks?: number | false`／`connectNulls?`／`legend?`／`highlightLast?`／`avgLine?: number`／`markLine?: ChartMarkLine`／`markPoint?: boolean | ChartMarkPoint`／`band?: ChartBand`／`fillBetween?: ChartFillBetween`／`highlightPoints?: 'turns' | 'crossings'`／`series?: readonly ChartSeries[]`。
   - 子形状：`ChartSeries`（`:29-38`，`name`／`items`／`color?`／`dashed?`／`smooth?`／`area?`／`ownScale?`）、`ChartMarkLine`（`:40-47`，`value?`／`xValue?: number | string`／`label?`／`color?`）、`ChartMarkPoint`（`:49-54`）、`ChartBand`（`:56-59`，`hi`／`lo` 等长）、`ChartFillBetween`（`:61-65`，`a`／`b` 为 series 索引）。
   - 默认值（`doc:797`；旧清单 `:166,167,172-176`）：`connectNulls` 缺省 `false`；`yTicks` 缺省 `false`、数字收敛 2-6；`fillBetween` a/b 越界／相同／两系列长度不一致 → 直接报错；`band` 不等长 → 直接报错；`markPoint` `true`/缺字段 = 主序列最大值点；`ownScale` 系列不参与共享域。
3. **`donut(input: DonutChartInput): ChartOutput`**
   - `DonutChartInput`（`:163-166`）：`items` ＋ `options?: DonutChartOptions`。
   - `DonutChartOptions`（`:118-125`）：`size?`／`ringWidth?`／`legend?: 'right' | 'bottom' | 'none'`／`showPercent?`／`centerLabel?`／`centerValue?`；取色板 `CHART_PALETTE`（`doc:787`）；合计为零同样走空态（旧条款，`docs/research/t92-old-v130-signatures.md:165`）。
4. **`progress(input: ProgressChartInput): ChartOutput`**
   - `ProgressChartInput`（`:169-172`）：`pct: number`（必填）＋ `options?: ProgressChartOptions`（**无 items**）。
   - `ProgressChartOptions`（`:127-130`）：`gradient?`／`showPct?`。
   - 硬行为：`pct` 非数 → 抛 `ChartError` code `pct-invalid`；超界收敛 0~100（`doc:788`）；`points` **恒为 1**；`pct === 0` 时 `empty === false`（0% 是合法值，`doc:796`）。
5. **`combo(input: ComboChartInput): ChartOutput`**
   - `ComboChartInput`（`:174-178`）：`bars: readonly ChartItem[]` ＋ `lines: readonly ChartItem[]` ＋ `options?: ComboChartOptions`。
   - `ComboChartOptions`（`:132-136`）：`barColor?`／`lineColor?`／`legend?`。
   - 宽化记录：旧签名 `opt` **必填**，新签名 `options` **可选**（`doc:789`「宽化，不破坏调用」）。旧 `combo.y2` 在新 `ComboChartOptions` 中**无对应**，判为「不冻结也不排除」，owner #78（`doc:798`）。
6. **`sparkline(input: SparklineChartInput): ChartOutput`**
   - `SparklineChartInput`（`:180-183`）：`items` ＋ `options?: SparklineChartOptions`。
   - `SparklineChartOptions`（`:138-140`）：`showValue?: boolean`；`doc:790` 补「＋ `format`（涨绿跌红）；无坐标轴」。
7. **`gauge(input: GaugeChartInput): ChartOutput`**
   - `GaugeChartInput`（`:185-188`）：`pct: number` ＋ `options?: GaugeChartOptions`。
   - `GaugeChartOptions`（`:142-145`）：`size?`／`label?`；`doc:791`「`label／color／size／format／animation`；`pct` 非数抛错」。
8. **`scatter(input: ScatterChartInput): ChartOutput`**
   - `ScatterChartInput`（`:190-193`）：`items: readonly ScatterItem[]` ＋ `options?: ScatterChartOptions`。
   - `ScatterItem`（`:23-27`）：`x: number`／`y: number`／`label?: string`。
   - `ScatterChartOptions`（`:147-151`）：`regression?`／`regressionColor?`／`dotSize?`；`doc:792`「非法 `x/y` 抛错；`regressionColor` 缺省 `#ff3b30`、`dotSize` 缺省 9px、Y 轴刻度复用 line 的 yTicks（scatter 缺省 4 条）、双端自适应沿用 line 语义」。

**统一输出与结构校验**：`ChartOutput`（`:196-201`）＝ `{ kind: ChartKind; html: string; empty: boolean; points: number }`；`html` 为**纯 CSS + SVG 字符串**（`doc:803`：无 `<canvas>`、无内联脚本、无 `node:`）；结构违规**直接抛错**（`CHART_STRUCTURE_RULE='throw'`，`:218`；`items` 非数组／缺 `label`／`value` 非法 → `structure-invalid`，`doc:799`）；空数组 → `emptyState` 联动（`CHART_EMPTY_RULE='emptyState'`，`:221`；`points === 0` 时 `empty === true`，`doc:795`）；坐标唯一性 `CHART_COORD_RULE='viewBox-only'`（`:224`；容器零 padding、留白进 viewBox、`vector-effect="non-scaling-stroke"`，`doc:800`）。

### 2.3 `CHART_*` 常量值（逐值，含落点）

| 常量 | 值（原文） | 类型源 | 文档 |
|---|---|---|---|
| `CHART_KINDS` | `readonly ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']` | `spec/charts.ts:8` | `doc:752` |
| `CHARTS_STYLE_ID` | `'ilife-charts'` | `:215` | `:753` |
| `CHART_STRUCTURE_RULE` | `'throw'` | `:218` | `:754` |
| `CHART_EMPTY_RULE` | `'emptyState'` | `:221` | `:755` |
| `CHART_COORD_RULE` | `'viewBox-only'` | `:224` | `:756` |
| `CHART_BREAKPOINTS` | `{ mobileMaxPx: 720; dotSizeMobilePx: 8; lineHeightMobilePx: 150; stackedGapPx: 3 }` | `:226-231` | `:757` |
| `CHART_PALETTE` | `readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']` | `:234-245` | `:758` |
| `CHART_ERROR_CODES` | `readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']` | `:247` | `:759` |
| `SCENE_STATUS` | `readonly ['', '【待开发】']` | `spec/help.ts:15` | `:760` |
| `SCENE_TYPE_FIELD` | `'types'` | `:20` | `:761` |
| `HELP_SHELL_ID` | `'ilife-help-shell'` | `:235` | `:763` |
| `HELP_COPY_TARGETS` | `readonly ['prompt', 'wakeWord', 'params']` | `:238` | `:764` |
| `HELP_COPY_ACTIONS` | `{ prompt: { actionId: 'ilife-help-copy-prompt'; label: '复制指令' }; wakeWord: { actionId: 'ilife-help-copy-wakeWord'; label: '复制唤醒词' }; params: { actionId: 'ilife-help-copy-params'; label: '复制参数' } }` | `:244-248` | `:765` |
| `HELP_SCHEMA_ERROR_CODES` | `readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']` | `:262-267` | `:766` |

`CHART_BREAKPOINTS` 的口径原文：`doc:794`「双端自适应（§6.5 `contract:238`）→ `mobileMaxPx: 720`、`dotSizeMobilePx: 8`、`lineHeightMobilePx: 150`、`stackedGapPx: 3`」。

### 2.4 `ChartItem`／`ChartOutput`／`ChartsApi`

- `ChartItem`（`spec/charts.ts:13-21`；签名 `spec/index.ts:170`）：`label: string`／`value: number | null`／`color?: string`／`values?: readonly number[]`／`anomaly?: boolean`。注释原文（`:12`）：「统一数据形状（旧 §6.5）：`value: null` 仅 line／scatter 视为缺失断点。」（**该注释与 scatter 的实际入参形状不符，见 §8-6**）
- `ChartOutput`（`:196-201`；签名 `spec/index.ts:171`）：`kind: ChartKind`／`html: string`／`empty: boolean`／`points: number`。
- `ChartsApi`（`:204-213`；签名 `spec/index.ts:172`）：8 个具名方法 `bar`／`line`／`donut`／`progress`／`combo`／`sparkline`／`gauge`／`scatter`，每个 `(input: *ChartInput): ChartOutput`；注释原文（`:203`）：「8 个接口逐条对齐旧 `charts.<name>(el, ...)`，去掉 `el`（DOM 由调用方挂载）。」
- 错误形态：`ChartErrorShape`（`:251-255`，`name: 'ChartError'`／`code: ChartErrorCode`／`message: string`）**不在 27 条冻结面内**，但属「被引用但未单列的类型 → `src/spec/*.ts` 为唯一真相源」（口径见 `spec/index.ts:13-15`）。

### 2.5 `SCENE_DATA_SCHEMA`（唯一机读权威）

- 落点：`packages/base-render/src/spec/help.ts:104-233`，`Object.freeze`（`:104`、`:233`）。
- `$schema`：`'http://json-schema.org/draft-07/schema#'`（`:105`）——**draft-07**。
- `$id`：`'ilife://base-paint/scene-data.schema.json'`（`:106`）——`doc:816`「**唯一机读 schema**……**本文只是它的可读投影**；两者不一致视为契约缺陷」。
- `title: 'scene_data'`／`type: 'object'`／`additionalProperties: false`／`required: ['skill_name', 'title', 'groups']`（`:107-110`）。
- 顶层属性（`:111-232`）：`skill_name`（`string, minLength 1`）／`title`（`string, minLength 1`）／`subtitle`（`string`）／`meta_blocks`（数组；元素 `required ['id','title','html']`，`additionalProperties:false`）／`groups`（数组）／`init_banner`（`required ['title']`；`subtitle?`／`button_text?`／`prompt?`／`steps?`）／`contact`（`required ['items']`；元素 `required ['label','value']`；`copy_all?`）／`version`（`string`）／`recommendations`（数组；元素 `required ['name']`；`reason?`／`wake_word?`）。
- `groups[]`（`:124-192`）：元素 `required ['id','label','subgroups']`，`icon?`；`subgroups[]` 元素 `required ['id','label','scenes']`；`scenes[]` 元素 `required ['id','title','wake_word','status','prompt_template']`，`types?`／`editable_fields?`。
- `scenes[].types`（`:153-166`）：`array`，元素 `oneOf: [{type:'string'}, {type:'object', additionalProperties:false, required:['text'], properties:{text,bg,fg}}]`。
- `scenes[].status`（`:167`）：`enum: ['', '【待开发】']`。
- `scenes[].prompt_template`（`:168`）：`string, minLength 1`。
- 旧缺口补齐：`doc:816`「它已补齐旧 schema 因 `additionalProperties: false` 拒绝的字段：`init_banner`／`contact`／`version`／`recommendations`（old §6 缺口 5），因此旧 `help_example_data.json` 在新 schema 下可校验通过。」
- 机读断言的现状（`test/contract-signatures.test.mjs:539-549`）：`required` 三字段、`additionalProperties === false`、`scenes` 层**有 `types` 且无 `type`**、四个补齐字段存在。

### 2.6 `SceneData`／`Scene`／`HelpShellInput`／`RenderHelpShell`／`ChartsHelpersInput`／`BuildChartsHelpersJs`

- `SceneData`（`spec/help.ts:91-101`；签名 `spec/index.ts:174`）：`skill_name`／`title`／`groups` 必填；`subtitle?`／`meta_blocks?`／`init_banner?`／`contact?`／`version?`／`recommendations?`。注释原文（`:90`）：「HELP 页对外参数（scene_data）顶层契约。」
- `Scene`（`spec/help.ts:36-44`；签名 `spec/index.ts:175`）：`id`／`title`／`wake_word`／`status`／`prompt_template` 必填；`types?: readonly (string | SceneTypeBadge)[]`／`editable_fields?`。相关子类型：`SceneTypeBadge`（`:22-26`）／`SceneEditableField`（`:28-34`）／`SceneSubgroup`（`:46-50`）／`SceneGroup`（`:52-57`）／`SceneMetaBlock`（`:59-64`）／`SceneInitBanner`（`:66-72`）／`SceneContactItem`（`:74-77`）／`SceneContact`（`:79-82`）／`SceneRecommendation`（`:84-88`）。
- `HelpShellInput`（`spec/help.ts:250-257`；签名 `spec/index.ts:176`）：`sceneData: SceneData`／`assets: TemplateAssets`／`strict?: boolean`／`template?: string`。逐行注释：`:252`「共享资产走同一填充器（B3）：HELP 壳不得自填。」；`:255`「覆盖内置壳模板；缺省用 base-paint 自带模板。」（**内置模板落点未冻结，见 §8-3**）
- `RenderHelpShell`（`spec/help.ts:259-260`；签名 `spec/index.ts:177`）：`(input: HelpShellInput) => FillTemplateOutput`；注释原文「冻结签名：`renderHelpShell(input: HelpShellInput): FillTemplateOutput`。」
- `ChartsHelpersInput`（`spec/charts.ts:261-266`；签名 `spec/index.ts:179`）：`prefix?`（缺省既有 `STYLE_PREFIX`，即 `'ilife-'`，`packages/base-render/src/style.ts:7`）／`styleId?`（缺省 `CHARTS_STYLE_ID`＝`'ilife-charts'`）。注释 `:259-260`：「`TemplateAssets.chartsHelpersJs` 的**唯一产出者**入参。该资产仅在模板含 `<!--CHARTS-HELPERS-->` 时使用（`MARKER_RULES.chartsHelpers.rule = 'zero-or-one'`）。」
- `BuildChartsHelpersJs`（`spec/charts.ts:268-272`；签名 `spec/index.ts:180`）：`(input?: ChartsHelpersInput) => string`。注释原文：「冻结签名：`buildChartsHelpersJs(input?: ChartsHelpersInput): string`（归 #78；#74 只消费，技能侧禁自产，B3）。恒返回非空 JS 文本，产出内容受 `SHARED_HELPERS_JS_RULE`（§3.3，FX-18）约束：自包含／可重复注入（幂等）／允许页面侧 DOM 读取／**禁止**向 `window`／`globalThis` 赋值／禁 `node:`。空串视为实现缺陷 → `fillTemplate` 抛 `asset-missing`。」
- 三者注入资产唯一产出者闭环（`doc:811`）：「`sharedHelpersJs` ← `buildSharedHelpersJs`（#76）、`sharedCssText` ← `buildStyleSheet().css`（#75）、`chartsHelpersJs` ← `buildChartsHelpersJs`（#78）；**无「被要求但无产出者」的资产**。」

### 2.7 「已 implemented 22 条 vs pending 5 条」的边界

**已存在（22 条，全部是常量值或类型，可直接被 #78 的实现消费）**

- 常量 15 条：`CHART_KINDS`／`CHARTS_STYLE_ID`／`CHART_STRUCTURE_RULE`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE`／`CHART_BREAKPOINTS`／`CHART_PALETTE`／`CHART_ERROR_CODES`（`spec/charts.ts:8,215,218,221,224,226,234,247`）＋ `SCENE_STATUS`／`SCENE_TYPE_FIELD`／`SCENE_DATA_SCHEMA`／`HELP_SHELL_ID`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS`／`HELP_SCHEMA_ERROR_CODES`（`spec/help.ts:15,20,104,235,238,244,262`）。
- 类型 7 条：`ChartItem`／`ChartOutput`／`ChartsApi`（`spec/charts.ts:13,196,204`）＋ `SceneData`／`Scene`／`HelpShellInput`／`ChartsHelpersInput`（`spec/help.ts:91,36,250,261`）。
- **未单列但已存在的全部依赖形状**（`spec/index.ts:13-15` 口径：以 `src/spec/*.ts` 为唯一真相源）：8 个 `*ChartInput`（`spec/charts.ts:153-193`）、8 个 `*ChartOptions`（`:67-151`）、`ScatterItem`／`ChartSeries`／`ChartMarkLine`／`ChartMarkPoint`／`ChartBand`／`ChartFillBetween`（`:23-65`）、`Scene*` 9 个子类型（`spec/help.ts:22-88`）、`ChartErrorShape`／`HelpSchemaErrorShape`（`:251-255`／`:271-276`）。
- 依赖的外部形状：`FillTemplateOutput`／`TemplateAssets`（`spec/template.ts`，已 implemented，`spec/index.ts:64,67`）＋ 运行时 `fillTemplate`（`src/template.ts`，已落地）。

**还缺（5 条 pending）——施工面即此**

- 缺 3 个**运行时值**：`charts`（`ChartsApi` 实例）、`renderHelpShell`、`buildChartsHelpersJs`。
- 缺 2 个**类型的实现体**：`RenderHelpShell`／`BuildChartsHelpersJs` 的类型别名**已存在**，缺的是与之匹配的实现函数。
- 缺**内置 HELP 壳模板**：`HelpShellInput.template` 的缺省值「base-paint 自带模板」无冻结名／无落点（`spec/help.ts:255`；`doc:830`）；§7 对该模板的断言只有「三个必需标记各出现 1 次」（`doc:994`）。
- 缺**图表 CSS 的落点裁定**：`CONTROL_STYLE_SECTIONS` 含 `charts`（`doc:265`／`spec/index.ts:75`，owner #75）与 `CHARTS_STYLE_ID` 的「样式自注入」（`doc:801`）并存（见 §8-2）。
- **不需要**新增任何 `*ChartInput`／`Scene*` 类型；**不允许**新增未登记清单的运行时出口（`test/contract-signatures.test.mjs:268-272`）。

---

## 3. 与 #78 相关的 AC／FX 条款原文

> 溯源纪律（FX-21）：AC 条文的**归档件**是 `docs/research/t92-architect-calls.md`（`test/contract-signatures.test.mjs:384-394` 钉死「不得再指 rulings 或 .scratch」）；B／Q 裁决的归档件是 `docs/research/t92-contract-freeze-brief.md`；FX 裁定归档在 `docs/research/t92-architect-rulings.md`。

### 3.1 AC-3 scene-data 字段名以机读 schema 的 `types` 为准

原文（`docs/research/t92-architect-calls.md:19-24`）：

- 「旧侧存在硬分歧：`docs/scene-data-contract.md:78` 与 `docs/scene_data.schema.json:70` 用 `types`，`assets/help_template.html:52` 用 `type`。」
- 「新契约取 **`types`**（复数）；**不提供 `type` 别名**。」
- 「理由：B1 按新架构重写；机读 schema 优先于散文与模板笔误；单复数双写会制造第二真相。」
- 「契约须写明这是**对旧侧分歧的裁定**（可追溯）。」

契约落点：`docs/base-paint-contract.md:813-815`（§3.5.2）＋ `packages/base-render/src/spec/help.ts:20`（`SCENE_TYPE_FIELD = 'types'`）；机读断言 `test/contract-signatures.test.mjs:539-545`；类型断言 `test-d/contract-signatures.ts:343`（`SCENE_TYPE_FIELD` 等于 `'types'`）与 `:345`（`'type' extends keyof Scene ? true : false` 恒 `false`）。索引行：`doc:25`「AC-3 scene-data 取 `types` | §3.5、§4.3」。

### 3.2 AC-4 机读 schema 是权威，人读文档必须与之一致

原文（`docs/research/t92-architect-calls.md:26-30`）：

- 「旧侧 `validate_help_data`（injector.py）与 `scene_data.schema.json` 口径不等价，且示例数据 `help_example_data.json` 自身不符 schema（`init_banner`／`contact`／`version`／`recommendations` 被 `additionalProperties:false` 拒绝）。」
- 「新契约必须给出**唯一机读 schema**，文档只是它的可读投影；两者不一致视为契约缺陷。」
- 「依据：架构规格「单一真相」「禁止第二真相」。」

契约落点：`doc:813-816`（§3.5.2）＋ `spec/help.ts:7`（文件头 AC-4 声明）；索引行：`doc:26`「AC-4 机读 schema 唯一权威 | §3.5」。禁令落点：`doc:993`「不许自造……第二份 scene-data schema（AC-4）」。

### 3.3 FX-6 随包发布 `.json` 必须由 `SCENE_DATA_SCHEMA` 生成

裁定原文（`docs/research/t92-architect-rulings.md:113-115`）：「**裁定**：若随包发布 `scene-data.schema.json`，**必须**由 `SCENE_DATA_SCHEMA` 序列化生成，并由签名测试逐值断言；否则判第二真相。契约 §3.5 写死。」

契约原文（`docs/base-paint-contract.md:817`）：「**随包发布的 `scene-data.schema.json`（FX-6，定死）**：若 #78 或任何包随包发布名为 `scene-data.schema.json` 的文件（`$id` 已用该文件名，极易被顺手实现），**必须**由 `SCENE_DATA_SCHEMA` **序列化生成**（`JSON.stringify(SCENE_DATA_SCHEMA)`，不得手写、不得二次编辑），并由签名测试**逐值断言**（`test/contract-signatures.test.mjs` 的 FX-6 用例：文件存在即与常量 `deepEqual`）。**不发布也合规**；一旦发布，禁止出现「TS 常量 vs 包内 `.json`」两份可独立漂移的权威（AC-4）。」

机读现状：`test/contract-signatures.test.mjs:525-532` 只检查两个候选路径 `../dist/scene-data.schema.json` 与 `../scene-data.schema.json`，**文件不存在即跳过**（`if (!existsSync(u)) continue;`）→ 当前「不发布」为合规态。落地约束见 §8-4。

### 3.4 B4 去掉图表白名单例外

裁决原文（`docs/research/t92-contract-freeze-brief.md:26`）：「| B4 | 图表白名单例外去掉 | 契约里**不得**保留"技能自营 canvas"例外 |」

AC-6 原文（`docs/research/t92-architect-calls.md:38-43`）：「- B4：不保留"技能自营 canvas"例外。- 占位符 `<!--CHARTS-HELPERS-->` 语义保留（**0 或 1 个**，可选），其余四个占位符保留"恰好 1 个／硬拦截"语义……」

契约落点：`doc:802`「| 白名单例外（§6.5 `contract:241`） | **不移植**（B4） | 无 | 去掉例外：技能侧不得自建图表画布；`CHART_KINDS` 是闭集 |」＋ `doc:993`「不许自造……技能侧图表实现或白名单例外（B4）」。机读断言：`test/contract-signatures.test.mjs:534-537`（含 `doc.includes('**不移植**（B4）')`）。

### 3.5 B1 按新架构重写（v1.30 签名当验收清单）

裁决原文（`docs/research/t92-contract-freeze-brief.md:23`）：「| B1 | 按新架构重写；v1.30 控件签名当验收清单逐条对照（搬清单不搬实现） | 文档必须含 v1.30 逐条对照表；**不许**逐字搬旧实现 |」

对 #78 的落地：`doc:781-804`（§3.5.1 逐条对照表，19 行）＋ `doc:992`（§6.5「用」清单）；AC-17 裁定原文（`docs/research/t92-architect-calls.md:118-122`）：「裁定：契约 §3.5 必须给出 v1.30 图表能力（8 接口 ＋ 复合形态 ＋ 双端自适应 ＋ 空态联动 ＋ 结构校验）的**逐条对照表**：旧签名（引 `old-v130-signatures.md` 证据行号）→ 新签名 → 判定（有／部分／无）→ 落点；并按 B4 **去掉**白名单例外，按 AC-3 取 `types`、AC-4 机读 schema 唯一权威。HELP 壳必须能被 #88（HELP 速查台重建）直接复用，接口不得留 #88 才能补的洞。」相关：B1 亦是视觉主色口径（`doc:291`「`--blue: #007aff` 与 Q12 锁定的 B1 主色一致 → 主色口径按 B1，不得改」）。

### 3.6 B6 HELP 形态 = HTML 速查台

裁决原文（`docs/research/t92-contract-freeze-brief.md:28`）：「| B6 | HELP 形态 = HTML 速查台 | HELP 壳契约按 HTML 速查台定 |」

契约落点：`doc:823`（§3.5.3 标题「HELP 壳接口（B6／Q11，可直接被 #88 复用）」）＋ `doc:835`「**形态**：HTML 速查台（B6）——标题区（`skill_name`／`title`／`subtitle`／`init_banner`）+ 分组 Tab（`groups`）+ 二级折叠（`subgroups`）+ 场景卡（`scenes`）+ Sheet 弹层（`editable_fields` + **指令实时预览**）+ 关于 Tab（`contact`／`version`／`recommendations`）。**术语口径（FX-7）**：对外一律称「指令」（v1.27+ 口径），**不得**写「Prompt 实时预览」／「复制 prompt」等旧词。」＋ `spec/help.ts:3`（文件头 B6 声明）。

### 3.7 Q13 复制交互走 Base P0 双通道

裁决原文（`docs/research/t92-contract-freeze-brief.md:33`）：「| Q13 | 复制交互走 Base P0 双通道 | 控件层须含双通道（clipboard ＋ 兜底），不得只留 `execCommand` |」

对 #78 的约束（HELP 壳侧）：`doc:837`「**一键复制**：`HELP_COPY_TARGETS = ['prompt', 'wakeWord', 'params']`，复制动作走 `copyText(text, ports, opts?)`（§3.3 同一签名），**不新增**复制实现。」＋ `doc:846`「壳渲染场景卡时把 `prompt_template` 全文写入按钮的 `data-t`（渲染期序列化，零注入面），三个按钮的 `actionId` 取上表并写入 `ACTION_ID_ATTR`（§3.3，FX-17）；点击分发走 `bindCopyAction`（§3.3，id 由 `listActionIds()` 发现，**不得**另定通配约定）。」＋ `doc:993`「不许自造……复制按钮的第二套 `actionId`／文案（取 `HELP_COPY_ACTIONS`，FX-7）」。机读断言：`test/contract-signatures.test.mjs:507-523`（`HELP_COPY_ACTIONS` 文案与 actionId 前缀）＋ `:441-445`（复制双通道逐字）；索引行 `doc:12`「Q13 复制走双通道」。

---

## 4. 三处同步现状

### 4.1 契约文档的冻结面标记区

- 文件：`docs/base-paint-contract.md`。
- 机制：正文里共 **7 个** `<!-- FROZEN-SURFACE-TABLE-START -->`…`<!-- FROZEN-SURFACE-TABLE-END -->` 标记区（§3.1／§3.2／§3.3／§3.4／§3.5／§5／§7）；解析实现 `packages/base-render/test/contract-signatures.test.mjs:121-137`（`frozenSurfaceRows()`，支持 `\|` 转义竖线、剥离反引号），绑定用例 `:287-293`「标记区表格与清单逐字一致」。
- **#78 的标记区在 §3.5，行号 `:749-779`**（表头 `:750-751`，27 行数据 `:752-778`）。
- 另有两处**非标记区**但被测试逐字引用的 §3.5 内容：`:802` 的 `**不移植**（B4）`（`test:536`）、`:825-833` 的 `HelpShellInput` 代码块（仅文档，无断言）。

### 4.2 类型断言测试的准确路径

- **编译期类型断言**：`packages/base-render/test-d/contract-signatures.ts`（415 行；`test-d` 目录被 root `tsconfig.json:19` 的 `include` 收录 → 随 `pnpm build`／`pnpm test:types` 编译）。
- **运行时出口面锁**：`packages/base-render/test/contract-signatures.test.mjs`（985 行；由 root `package.json:10` 的 `pnpm test` glob `packages/base-render/test/*.test.mjs` 收取）。
- 无 `expectType`／`tsd`／`@ts-expect-error` 机制：断言全部是**手写条件类型**（`Equal<>`／`Expect<>`／`Present<>`／`Absent<>`，`test-d/contract-signatures.ts:94-99`）＋运行时 `node:assert/strict`（`test/contract-signatures.test.mjs:2` 附近的 `assert`）。

### 4.3 27 条在三处各自的呈现方式

| 处 | 呈现 | 与 #78 相关的具体位置 |
|---|---|---|
| ① 清单（真相源） | `SPEC_FROZEN_SURFACE` 数组的**对象字面量行**（每行一条 `{ name, kind, ticket, status, section, signature }`） | `packages/base-render/src/spec/index.ts:155-181`（27 行） |
| ② 契约文档 | 标记区**表格行**（列序：名字｜种类｜票｜状态｜章节｜逐字签名；签名用反引号包裹，签名内的竖线写作转义形式） | `docs/base-paint-contract.md:752-778`（27 行）；表格由 `test:288-293` 与清单逐字比对 |
| ③ 类型断言测试 | **条件类型断言**（`Equal<>`＋`Expect<>`）；运行时条目另有 `Present<>`／`Absent<>` 存在性锁，值另有 `_V*` 逐值锁 | `packages/base-render/test-d/contract-signatures.ts:335-359`（§6 块，`_H01`–`_H20`）＋ `:398-406`（`_V19`–`_V27` 值锁）＋ `:410-413`（`_M01`–`_M04` 清单自身） |
| ④ 运行时测试（派生，非手写名单） | 由清单**自动派生**期望出口集 ＋ 文档绑定 ＋ #78 专项用例 | `packages/base-render/test/contract-signatures.test.mjs:263-285`（出口面锁）、`:287-293`（文档绑死）、`:507-523`（HELP 文案）、`:525-532`（FX-6）、`:534-537`（B4）、`:539-549`（AC-3／AC-4）、`:561-619`（FX-20 27 条值锁） |

### 4.4 翻转 status 时要改的具体行号（5 条 pending）

**A. `packages/base-render/src/spec/index.ts`（真相源，5 行）**

| 行号 | 条目 | 改动 |
|---|---|---|
| `:173` | `charts` | `status: 'pending'` → `'implemented'`（`kind`／`ticket`／`section`／`signature` 逐字不变） |
| `:177` | `RenderHelpShell` | 同上 |
| `:178` | `renderHelpShell` | 同上 |
| `:180` | `BuildChartsHelpersJs` | 同上 |
| `:181` | `buildChartsHelpersJs` | 同上 |

**B. `docs/base-paint-contract.md`（文档投影，5 行）**

| 行号 | 条目 |
|---|---|
| `:770` | `charts`｜`runtime`｜#78｜pending｜3.5｜`ChartsApi` → status 改 `implemented` |
| `:774` | `RenderHelpShell`｜`type`｜#78｜pending｜3.5｜`(input: HelpShellInput) => FillTemplateOutput` → status 改 `implemented` |
| `:775` | `renderHelpShell`｜`runtime`｜#78｜pending｜3.5｜`(input: HelpShellInput): FillTemplateOutput` → status 改 `implemented` |
| `:777` | `BuildChartsHelpersJs`｜`type`｜#78｜pending｜3.5｜`(input?: ChartsHelpersInput) => string` → status 改 `implemented` |
| `:778` | `buildChartsHelpersJs`｜`runtime`｜#78｜pending｜3.5｜`(input?: ChartsHelpersInput): string` → status 改 `implemented` |

**C. `packages/base-render/test-d/contract-signatures.ts`（类型断言，3 行必改）**

| 行号 | 现文 | 翻转后 |
|---|---|---|
| `:349` | `type _H13 = Expect<Equal<Absent<'charts'>, true>>;` | `Present<'charts'>` 为 `true`（照 #76 `:254-277`／#77 `:309-316` 的先例，改为 `Present<>` 并补出口类型锁 `Equal<Mod['charts'], ChartsApi>`） |
| `:350` | `type _H14 = Expect<Equal<Absent<'renderHelpShell'>, true>>;` | 同上（补 `Equal<Mod['renderHelpShell'], RenderHelpShell>`） |
| `:359` | `type _H20 = Expect<Equal<Absent<'buildChartsHelpersJs'>, true>>;` | 同上（补 `Equal<Mod['buildChartsHelpersJs'], BuildChartsHelpersJs>`） |

**不改**的相邻行（**易误改，务必保留**）：`:348` `_H12 = Equal<RenderHelpShell, (input: HelpShellInput) => FillTemplateOutput>` 与 `:358` `_H19 = Equal<BuildChartsHelpersJs, (input?: ChartsHelpersInput) => string>`——这两条是**类型条目**的签名锁，`status` 翻转不影响它们；`:337-347`、`:351-357`（其余 22 条）与 `:398-406`（`_V19`–`_V27` 值锁）均**零改动**。

**D. `packages/base-render/test/contract-signatures.test.mjs`（无需改名单，但必须满足）**

- `:268-272`「新增运行时出口**恰好等于**清单 implemented 的运行时项」→ 翻转后 `src/index.ts` 必须**恰好**多出 `charts`／`renderHelpShell`／`buildChartsHelpersJs` 三个运行时出口，**不多不少**。
- `:274-278`「pending 运行时项必须尚未导出」→ 翻转后自动失效（同一名单，无需手改）。
- `:280-284`「type-only 名字不得成为运行时出口」→ `RenderHelpShell`／`BuildChartsHelpersJs` 翻转后仍是 type，不得出现同名值。
- `:561-568` 的 `FX20_VALUE_LOCKS` 27 条**不含**这 5 条 → 翻转不需改它；但它断言其中 9 条 `#78` 常量（`CHARTS_STYLE_ID`／`CHART_*`／`HELP_SHELL_ID`／`HELP_SCHEMA_ERROR_CODES`）`status === 'implemented'`（`:576`），故**不得**把这 5 条混入该名单。

**E. 其余同步项（惯例，非强制机制）**：新增 `.changeset/base-paint-*.md`（`base-paint: minor`，先例 `.changeset/base-paint-contract-freeze.md`／`base-paint-text-serialization.md`）；在 `docs/base-paint-contract.md` 追加 §8.11 施工台账（先例 §8.9 `:1231`／§8.10 `:1306-1336`）；`src/index.ts:1-32` 只追加 export（既有 18 出口由 `test:264-266` 钉死）。

---

## 5. 相邻票接口边界（只取证，不改）

### 5.1 #75（共享样式资产，`OPEN`，`BuildStyleSheet`／`buildStyleSheet` 两条 pending）

- 签名与落点：`spec/index.ts:73-80`（`CSS_VAR_TOKENS`／`STYLE_SHEET_ID`／`CONTROL_STYLE_SECTIONS`／`STYLE_FORBIDDEN_TOKENS`／`StyleSheetInput`／`StyleSheetOutput` implemented；`BuildStyleSheet`／`buildStyleSheet` pending）；文档 §3.2 `doc:258-311`；实现指引 §6.2 `doc:969-973`（「用」＝`CSS_VAR_TOKENS`（11 个逐值）／`STYLE_SHEET_ID`／`CONTROL_STYLE_SECTIONS`／`STYLE_FORBIDDEN_TOKENS`／`buildStyleSheet`…；「不许自造」＝新 token 名／第二份 token 表）。
- **与 #78 的接口面**：`CONTROL_STYLE_SECTIONS` **闭集含 `charts` 与 `helpShell` 两个命名空间**（`doc:265`／`spec/index.ts:75`）；三资产闭环里 `sharedCssText ← buildStyleSheet().css`（`doc:811`）；#78 的 `buildChartsHelpersJs` 入参 `prefix` 缺省取 `STYLE_PREFIX`（`src/style.ts:7`）。
- **#78 该做**：只在 `ilife-charts`／`ilife-help-shell` 命名空间内产类名；HELP 壳的 `assets` 由调用方传入（`doc:828`），不自行产 CSS。
- **#78 不该越界**：不实现 `buildStyleSheet`、不新增 token、不写第二份样式常量、不改 `CONTROL_STYLE_SECTIONS`（`doc:972`、`doc:303`）。
- **未决冲突**：`charts` 区归属与 `CHARTS_STYLE_ID` 自注入的关系未裁定（见 §8-2）。

### 5.2 #76（控件层，`CLOSED`）

- 签名与落点：`spec/index.ts:83-126`（44 条 implemented）；文档 §3.3 `doc:313-541`；实现指引 §6.3 `doc:975-982`；偏离记账 §4.6 `doc:924-936`。
- **与 #78 的接口面**：① `SHARED_HELPERS_JS_RULE`（`spec/index.ts:113`）是 `buildChartsHelpersJs` 产出内容的**同一份**规则表（`doc:809`「与 `buildSharedHelpersJs` **同一份**……**不设第二套规则表**」；`doc:993` 禁令）；② 纯度扫描实现 `purityViolations()`／`stripJsComments()` 在 `test/contract-signatures.test.mjs`（`doc:980, 1010`）；③ 复制编排 `copyText`／`bindCopyAction`／`ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`／`COPY_ACTION_IDS` 由 HELP 壳直接复用（`doc:837-846`）。
- **#78 该做**：`buildChartsHelpersJs` 复用 `SHARED_HELPERS_JS_RULE`，禁 `window.`／`globalThis.` 赋值、禁 `node:`、允许 DOM 读取；HELP 壳复制走既有 `copyText`／`bindCopyAction`。
- **#78 不该越界**：不新增第二个 shared helpers 产出者、不新增第二套反馈端口、不改 `COPY_*`／`ACTION_ID_ATTR`。

### 5.3 #77（复制文本序列化，`CLOSED`）

- 签名与落点：`spec/index.ts:129-152`（24 条 implemented）；文档 §3.4 `doc:542-746`；实现指引 §6.4 `doc:984-988`；台账 §8.10 `doc:1306-1336`。
- **与 #78 的接口面**：无直接签名耦合；唯一交点是「复制文本来源」——HELP 壳复制的是 `prompt_template` 全文（`doc:846`），不经 `buildDataText`／`buildLogText`；#90 才是二者的接线方（`doc:897`）。
- **#78 不该越界**：不改 §3.4 任何签名与投影表、不引 `TEXT_*` 常量做壳渲染。

### 5.4 #88（HELP 速查台重建，`OPEN`）

- 契约里的归属段落：`doc:896`「| #88 | 直接复用 §3.5.3 的四件套（`HelpShellInput`／`SceneData`／`SCENE_DATA_SCHEMA`／`HELP_COPY_TARGETS`）；复制按钮的 `actionId`／文案取 `HELP_COPY_ACTIONS` |」＋ `doc:849`「**#88 复用面**：`HelpShellInput` ＋ `SceneData` ＋ `SCENE_DATA_SCHEMA` ＋ `HELP_COPY_TARGETS` 四件套即为 #88 的全部输入面——#88 **不需要**新增任何签名，只需提供 `SceneData` 与 `TemplateAssets`。」＋ `doc:847`（产物结构「不冻结也不排除」，owner #78／#88，验收以 #88 三条守卫 ＋ #96 快照门为准）。
- **#78 该做**：把壳渲染做成可直接复用面（四件套 ＋ `HELP_COPY_ACTIONS` 落位）；`renderHelpShell` 必须能被 #88 直接调用，**不得留 #88 才能补的洞**（AC-17 原话，`docs/research/t92-architect-calls.md:122`）。
- **#78 不该越界**：不定 10 分组／54 子功能／436 场景的数据模型与页面交互（#88）；不冻结 DOM 逐节点结构（`doc:847`）；不碰技能侧 HELP 数据。

### 5.5 #91（`help.center` 承载全量速查台，`OPEN`）

- **契约文档里零命中**：`grep "#91"` 在 `docs/base-paint-contract.md` 无结果；`#91` 只出现在 map `#63` 的串行序与并发禁区，以及技能侧代码／研究文档（如 `docs/calorie-parity-39.md:74`、`packages/skill-calorie/src/cli/cmd_read.ts:436`）。
- 边界来源：`#91` 票面「按裁决 Q9：`calorie.help.center` 承载全量速查台语义……envelope 全字段符合新契约（无 `status`，裁决 Q8）」（`gh issue view 91`）＋ map `#63` 串行序「…#78 → #90 → #88 → #91…」。
- **#78 该做**：只保证 HELP 壳的**输入面**可被全量数据喂满（`SceneData` 支持 10 分组／多场景）。
- **#78 不该越界**：不改技能键语义、不碰 `calorie.help.center` 的 CLI 与 envelope（属 #91／技能包）。

### 5.6 #104（B1 12 区块组件整合，接口 owner，`OPEN`）

- 契约里的归属段落：`doc:894`「| #104 | 12 个区块组件的**接口 owner 是 #104**；本契约只冻结 base-paint 的共享层签名，**不定义**任何区块组件接口。粒度分层见 §4.1（控件级＝本契约冻结，区块级＝#104 组合控件而不重定义） |」＋ §4.1 `doc:864-869`（控件级 6 个 vs 区块级 12 个；「**越界即缺陷**：本契约**不定义**任何区块组件接口……#104 也不得反向把区块接口塞进 `src/spec/`」）＋ FX-9 裁定（`docs/research/t92-architect-rulings.md:123`）。
- **#78 该做**：只交付**原子**图表产出（`ChartOutput.html` 字符串）与 HELP 壳；图表在 #104 侧作为「图表区块」被组合。
- **#78 不该越界**：不做页面级区块组合、不定义区块接口、不把区块接口写进 `src/spec/`。

### 5.7 越界红线汇总（#78 可施工 vs 禁入）

| 类别 | 允许 | 禁止（证据） |
|---|---|---|
| 签名 | 实现 `charts`／`renderHelpShell`／`buildChartsHelpersJs` 三个冻结签名 | 改任何冻结签名值／加同义 API／把 pending 改名（`doc:953`）；新增未登记清单的运行时出口（`test/contract-signatures.test.mjs:268-272`） |
| DOM／宿主 | 产出纯字符串；helpers JS 允许页面侧 DOM 读取 | `el` 参数、`<canvas>`、内联脚本、`window.`／`globalThis.` 赋值、`node:`（`doc:993`、`doc:809`、`doc:803`） |
| 数据契约 | 消费 `SceneData`／`SCENE_DATA_SCHEMA`／`SCENE_TYPE_FIELD`／`SCENE_STATUS` | 第二份 scene-data schema、`type` 单数或 `types` 别名、手写 `.json`（`doc:993`） |
| 复制 | 复用 `copyText`／`bindCopyAction`／`HELP_COPY_ACTIONS`／`ACTION_ID_ATTR` | 第二套 `actionId`／文案／通配约定（`doc:993`、`doc:846`） |
| 归属 | 只动 `packages/base-render`（`doc:852`「**所属包**：`base-paint`」） | 技能侧图表实现／白名单例外（B4）、区块组件接口（#104）、技能 HELP 数据（#88／#91） |

---

## 6. 现有目录结构与实现文件落点惯例

### 6.1 `packages/base-render` 现状（实测，排除 `node_modules`／`dist`）

| 路径 | 角色 | 规模 |
|---|---|---|
| `src/index.ts` | 唯一出口（`export` 只追加） | 32 行 |
| `src/spec/index.ts` | 冻结面清单（`SPEC_FROZEN_SURFACE`） | 188 行 |
| `src/spec/template.ts`／`style.ts`／`controls.ts`／`text.ts`／`charts.ts`／`help.ts` | 各票的类型＋纯数据常量 | 20374／2149／16595／7580／8480／9271 B |
| `src/contract.ts`／`ui.ts`／`injector.ts`／`style.ts` | 既有渲染契约／页面注册／sidebar 装配／JS token | 3235／2267／3475／997 B |
| `src/template.ts` | **#74 实现**：`fillTemplate` | 20602 B |
| `src/controls.ts` | **#76 实现**：控件层 ＋ `buildSharedHelpersJs` | 38638 B |
| `src/text.ts` | **#77 实现**：`buildDataText`／`buildLogText` | 24279 B |
| `style/tokens.css` | 3 行，**不在 `files`**，非契约资产（`doc:308`） | 49 B |
| `test/*.test.mjs` | `contract-signatures`／`controls`／`template`／`text`／`render` | 58K／69K／44K／57K／6K |
| `test-d/contract-signatures.ts` | 编译期类型断言 | 27924 B |
| `package.json` | `files: ["dist"]`（`:11-13`）／`exports` 仅 `"."`（`:8-10`）／`build: tsc -b`（`:21`） | 24 行 |
| `tsconfig.json` | `outDir: ./dist`／`rootDir: ./src`／`include: ["src"]` | — |

### 6.2 既有命名与落点惯例（#78 必须照抄）

1. **一票一文件**：`#74 → src/template.ts`（`doc:955`）、`#75 → src/style.ts ＋ 产出函数`（`doc:969`）、`#76 → src/controls.ts`（`doc:975`）、`#77 → src/text.ts`（`doc:984`）、**`#78 → src/charts.ts／src/help.ts`（`doc:990` 标题逐字）**。
2. **文件头 JSDoc** 必写「票号 ＋ 契约章节 ＋ 红线」：如 `src/template.ts` 风格、`spec/charts.ts:1-6`（B4 声明）、`spec/help.ts:1-10`（B6／Q11／AC-3／AC-4／AC-13 依赖红线）。
3. **错误类不导出**：`src/index.ts:12-13`（`TemplateError` 不导出）、`:15-16`（`ControlsError` 不导出）、`:29-31`（`TextError` 不导出）——口径统一为「冻结面无该运行时条目，调用方按 `name`／`code` 判定」。→ #78 的 `ChartError`／`HelpSchemaError` 应**定义在实现文件内、不从 `src/index.ts` 导出**。
4. **测试文件命名**：`test/<模块名>.test.mjs`（`template.test.mjs`／`controls.test.mjs`／`text.test.mjs`），头部写票号＋覆盖清单（`test/text.test.mjs:1-14`），**从 `../dist/index.js` 导入**（`:18-40`）→ 必须先 `pnpm build`。
5. **清单/文档/断言三处同步** 是每票的固定动作（`doc:947`、`doc:1308`、`doc:1313`）。
6. **changeset**：每票一个 `.changeset/base-paint-*.md`（`base-paint: minor`）。
7. **只读纪律**：`src/spec/*.ts` 只许 `import type` ＋ 纯数据（`spec/index.ts:5-7`；机读扫描 `test/contract-signatures.test.mjs:973+`）。

### 6.3 #78 的实现文件与测试**应放哪**（建议，不创建）

| 建议路径 | 内容 | 依据 |
|---|---|---|
| `packages/base-render/src/charts.ts` | `charts: ChartsApi`（8 方法）＋ `buildChartsHelpersJs` ＋ 内部 `ChartError`（不导出）＋ 图表 SVG 字符串产出 | `doc:990` 标题逐字；`spec/charts.ts` 已有全部类型 |
| `packages/base-render/src/help.ts` | `renderHelpShell` ＋ 内部 `HelpSchemaError`（不导出）＋ **内置壳模板常量（模块内，不导出）** | `doc:990`；`spec/help.ts:250-260` |
| （可选）`packages/base-render/src/help-template.ts` | 若内置模板过大，单文件承载；**必须是模块内部常量、不得新增出口** | `test/contract-signatures.test.mjs:268-272`（出口集必须与清单相等） |
| `packages/base-render/src/index.ts` | 只追加 3 个运行时出口（`charts`／`renderHelpShell`／`buildChartsHelpersJs`） | `src/index.ts:10-32` 只追加惯例；`test:264-266` 钉死既有 18 出口 |
| `packages/base-render/test/charts.test.mjs` | 8 接口结构断言／空态／`points`／错误码／无 `<canvas>`／无 `<script`／纯度口径 | `doc:994` 验收怎么测；命名惯例 `test/<模块>.test.mjs` |
| `packages/base-render/test/help.test.mjs` | `renderHelpShell` 走 `fillTemplate` 的标记计数／schema 校验／复制按钮 actionId／`SCENE_TYPE_FIELD` | `doc:994` |
| `packages/base-render/test-d/contract-signatures.ts` | 翻转 `:349`／`:350`／`:359` ＋ 补 3 条出口类型锁（放 §6 块 `:335-359` 内） | `doc:1006`④；#76／#77 先例 `:252-277`／`:306-316` |
| `.changeset/base-paint-charts-help-shell.md` | `'base-paint': minor` | `doc:947`；先例 `.changeset/base-paint-text-serialization.md` |
| `docs/research/t78-*.md` ＋（可选）可复跑证据脚本 | 证据入仓（8 接口 × 断言、HELP 壳产出快照） | #74／#77 先例（`doc:1317`） |

> 注意：`dist/` 是 `tsc -b` 产物（`tsconfig.json:6`），**不得手改**；若决定发布 `scene-data.schema.json`，需在构建链新增生成步骤（见 §8-4）。

---

## 7. 现有签名测试如何断言 pending 面 ＋ 翻转后必须同步的断言

### 7.1 pending 面的断言机制（不是 `@ts-expect-error`，也不是 `expectType`）

- **编译期**（`test-d/contract-signatures.ts:97-99`）：
  - `type Present<K extends string> = K extends keyof Mod ? true : false;`
  - `type Absent<K extends string> = K extends keyof Mod ? false : true;`
  - `Mod = typeof import('../src/index.js')`（`:92`）→ 断言的是**出口存在性**，不是类型形状。
  - 三条 pending runtime 断言：`:349` `Absent<'charts'>`／`:350` `Absent<'renderHelpShell'>`／`:359` `Absent<'buildChartsHelpersJs'>`。**实现一落地，这三条即编译红**（`doc:120`「否则编译期断言 `Absent<>` 会失败」）。
  - 文件头原文（`:8-9`）：「冻结面：`SPEC_FROZEN_SURFACE` 的每条签名与类型层逐字一致；`pending` 条目断言「尚未导出」，执行票实现后本文件编译失败 → 强制翻转清单。」
- **运行时**（`test/contract-signatures.test.mjs`）：
  - `:274-278`「pending 运行时项必须尚未导出（实现后翻转清单）」（遍历清单里 `kind === 'runtime' && status === 'pending'` 的条目，断言不在 `runtimeKeys` 中）。
  - `:268-272`「新增运行时出口**恰好等于**清单 implemented 的运行时项」——**这是「不许新增未登记出口」的硬闸**（`assert.deepEqual(actual, expected)`）。
  - `:280-284`「type-only 名字不得成为运行时出口」。
- **不适用**：`test-d` 对 type 条目**没有** `Absent<>` 断言（因为类型名本来就存在于类型空间）；`RenderHelpShell`／`BuildChartsHelpersJs` 只由 `Equal<>` 锁形状（`:348`／`:358`）。
- 相关文档条文：`doc:1006`④「`pending` 条目**尚未导出**（`Absent<>`），实现后必须翻转清单」；`doc:1007`③；`doc:1015`「失败即契约缺陷：测试红时**只许**改实现或同时改「清单＋文档＋类型」三处，不许删断言、放宽断言或改成恒真。」

### 7.2 翻转后必须同步的断言（清单）

| 断言 | 位置 | 翻转后动作 |
|---|---|---|
| `Absent<'charts'>` | `test-d/contract-signatures.ts:349` | → `Present<'charts'>` ＋ 新增 `Equal<Mod['charts'], ChartsApi>` |
| `Absent<'renderHelpShell'>` | `:350` | → `Present<>` ＋ 新增 `Equal<Mod['renderHelpShell'], RenderHelpShell>` |
| `Absent<'buildChartsHelpersJs'>` | `:359` | → `Present<>` ＋ 新增 `Equal<Mod['buildChartsHelpersJs'], BuildChartsHelpersJs>` |
| 文档表 ↔ 清单逐字 | `test/contract-signatures.test.mjs:288-293` | 必须同批改 `docs/base-paint-contract.md:770,774,775,777,778` |
| 新增出口集合 | `:268-272` | `src/index.ts` 恰好追加 3 个出口 |
| type 无运行时值 | `:280-284` | `RenderHelpShell`／`BuildChartsHelpersJs` 不得有同名值 |
| FX-20 值锁 27 条 | `:561-568`＋`:570-619` | **不改**（不含 5 条 pending；但含 9 条 #78 常量，须保持 `implemented`） |
| B4／AC-3／AC-4／FX-6／FX-7 专项 | `:534-537`／`:539-549`／`:525-532`／`:507-523` | 现状即通过；#78 落地后建议**新增**行为断言（8 接口结构、`points`／`empty`、schema 校验、复制按钮 actionId 写入 `ACTION_ID_ATTR`，见 `doc:994`） |
| 章节标题逐字 | `:295-304`（含 `### 3.5 图表层与 HELP 壳（#78）`） | 若新增 §3.5.x 子节不影响（只锁到 `###` 级）；**不得改 `### 3.5` 标题文本** |

---

## 8. 契约自相矛盾／缺口清单（6 项，均需 #78 施工单先裁定）

### 8-1 `scenes[]`「必填，非空」在唯一机读权威里无 `minItems`（**需裁定**）

- 文档原文（`docs/base-paint-contract.md:819`）：「**`subgroups[]`**：`id`／`label`／`scenes[]`（必填，**非空**）。」
- 机读 schema（`packages/base-render/src/spec/help.ts:143-144`）：`scenes: { type: 'array', items: { … } }`——**无 `minItems`**。
- AC-4 原文（`docs/research/t92-architect-calls.md:29`）：「文档只是它的可读投影；两者不一致视为契约缺陷。」→ 现态即「缺陷态」：文档比 schema 严。
- 影响：`renderHelpShell` 的校验行为取决于 #78 的选择——按 schema 实现则空 `scenes` 合法（文档违约），按文档实现则与唯一权威不符。
- 处置建议（择一，须走 changeset ＋ 三处同步）：① schema 加 `minItems: 1`（属改常量值，需评估 `test-d:351` 与运行时 `:539-549` 是否需补断言）；② 改文档措辞去掉「非空」。**注意**：`SCENE_DATA_SCHEMA` 在清单里的 signature 是散文串（`spec/index.ts:165`），两种处置都不改该串，但 ① 会改常量值。

### 8-2 图表 CSS 的唯一真相源冲突（**需裁定**）

- `doc:265`（§3.2）＋ `spec/index.ts:75`：`CONTROL_STYLE_SECTIONS` **闭集**含 `charts`（#75 的共享 CSS 命名空间）。
- `doc:801`（§3.5.1）＋ `spec/charts.ts:215`：`CHARTS_STYLE_ID = 'ilife-charts'`，口径写「样式**自注入**、本地转义兜底、不依赖其它资产」。
- 先例冲突：`doc:926-932`（§4.6 #76 偏离记账）已把「toast 自注入样式」判为第二真相并归并进 #75 共享区（理由①「toast 若自注入即出现第二份样式源，与『样式只抖 base-paint』冲突」）。
- 影响：若 `ChartOutput.html` 每次自带 `<style id="ilife-charts">`，则同一命名空间存在两份来源；若完全依赖 `sharedCssText` 的 `charts` 区，则 `CHARTS_STYLE_ID` 语义需重新解释。
- 处置建议：施工单显式裁定并在票面登记（推荐：**样式归 #75 的 `charts` 区**，`CHARTS_STYLE_ID` 仅作标识常量；若保留自注入，必须写明「与 `sharedCssText` 二者取其一」的判据）。

### 8-3 HELP 内置壳模板：无冻结名、无落点，且**新增出口会红**（**需裁定**）

- 证据：`spec/help.ts:255`「覆盖内置壳模板；缺省用 base-paint 自带模板。」；`doc:830` 同口径；冻结面 27 条与 `src/spec/help.ts` 里**均无**模板常量；`doc:990` 只给目录 `src/charts.ts`／`src/help.ts`。
- 硬约束：`test/contract-signatures.test.mjs:268-272` 要求「新增运行时出口恰好等于清单 implemented 的运行时项」→ **导出模板常量即测试红**；`doc:993` 又禁「自造」同义 API。故模板只能作**模块内部常量**（或经裁定新增冻结条目，后者须走契约变更）。
- 附带约束（施工时必守）：HELP 壳是**数据页**——`<!--INJECT-DATA-->` 恰 1 次且落在自带容器 `<script id="payload" type="application/json">` 内；`<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->` 各恰 1 次；不得预包裹；走 `fillTemplate`（`doc:848`、`doc:959-961`；`spec/index.ts:48-59`）。

### 8-4 FX-6 的发布路径与构建链缺环（**需裁定**）

- 测试只认两个路径：`../dist/scene-data.schema.json` 与 `../scene-data.schema.json`（`test/contract-signatures.test.mjs:526`），**存在即比对**（`:529`）。
- 但 `packages/base-render/package.json:11-13` 的 `files: ["dist"]` 只发布 `dist`；`build` 是 `tsc -b`（`:21`），**不会复制 `.json`**（`packages/base-render/tsconfig.json` 无 `resolveJsonModule`／无 copy 步骤）。
- 结论：**当前「不发布」是合规且零成本**（`doc:817`「**不发布也合规**」）。若 #78 决定发布，必须新增「由 `SCENE_DATA_SCHEMA` 序列化生成 `dist/scene-data.schema.json`」的构建步骤（不得手写），并在票面写明。

### 8-5 `kind-unknown` 无触发条款（**需定案／登记**）

- 常量含 `'kind-unknown'`（`spec/charts.ts:247`；`doc:759`），但 §3.5.1 只定义 `structure-invalid`（`doc:799`）与 `pct-invalid`（`doc:788`）的触发；`grep kind-unknown docs/base-paint-contract.md` **仅 `:759` 一处命中**。
- 影响：`ChartsApi` 是 8 个具名方法（kind 由方法名决定），该错误码在公开签名下**可能不可达**；若实现内部按 `kind` 分派则可复用。
- 处置建议：票面登记「可达／不可达」结论；若不可达，写明「保留常量、不制造可达路径」（常量值不得改，`spec/index.ts:162` 冻结）。

### 8-6 `ChartItem` 注释与 scatter 入参形状不一致（**需登记**）

- 注释原文（`spec/charts.ts:12`）：「统一数据形状（旧 §6.5）：`value: null` 仅 line／scatter 视为缺失断点。」
- 但 `ScatterChartInput.items` 的类型是 `readonly ScatterItem[]`（`spec/charts.ts:190-193`），`ScatterItem` 为 `{ x: number; y: number; label?: string }`（`:23-27`）——**没有 `value`，也没有 `null`**。
- 影响：纯注释级不一致（不改签名）；施工时以 `ScatterItem` 为准，勿据注释实现 `value: null` 断点。

### 8-7 另有两项「已登记的不冻结项」，施工面必须逐条对照（**非矛盾，但属 #78 的施工面**）

- **选项级语义**（`doc:797`）：`yTicks` 收敛 2-6、`stacked` 默认 `percent` 且与 `grouped` 互斥、`fillBetween.a/b` 是 series 索引、`band` 等长、`markPoint` 缺省最大点、`ownScale` 不参与共享域、`regressionColor` 缺省 `#ff3b30`、`dotSize` 9px 等——owner #78，以 `old-v130-signatures.md:166-178` 为准（归档件 `docs/research/t92-old-v130-signatures.md:166-183`）并在票面逐条对照。
- **旧 `combo.y2`**（`doc:798`）：新 `ComboChartInput` 无 `y2`；「不冻结也不排除」，owner #78，须显式给出「移植／不移植」结论。
- **HELP 壳产物结构**（`doc:847`）：DOM 结构／类名／区块顺序「不冻结也不排除」，owner #78／#88，验收以 #88 三条守卫（占位符 0 残留／`id` 唯一／`copyText` 单实现）＋ #96 快照门为准；契约冻结的可断言锚点＝`HelpShellInput` 四件套、`HELP_SHELL_ID`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS`、类名前缀 `ilife-`、三个必需占位符各恰好 1 次。

### 8-8 与 map `#63` 的口径张力（**需在票面登记**）

- map `#63` Notes D8：「**图表只做实际用到的接口**」（`gh issue view 63`）。
- 冻结面 `ChartsApi` 是 8 方法的闭集（`spec/charts.ts:204-213`；`test-d:338` 锁 `keyof ChartsApi` 为 8 成员）→ 实现 `charts: ChartsApi` 时**8 个方法都必须存在**（否则类型断言／编译红）。
- 处置建议：票面写明「8 方法全部实现；D8 只约束技能侧使用面（不要求 6 技能都用）」，避免验收口径互斥。

---

## 9. 施工面清单（5 条 pending 拆成可施工条目）

> 口径：每条给「实现什么／放哪个文件／依赖哪些已存在常量／验收怎么测」。**依赖项全部已 implemented**（§2.7），无跨票阻塞；#75 未落地不影响（HELP 的 `assets` 由调用方传入，`doc:828`）。

### W1 `charts`（runtime；`spec/index.ts:173`；文档 `:770`）

- **实现什么**：`export const charts: ChartsApi`，8 个方法 `bar`／`line`／`donut`／`progress`／`combo`／`sparkline`／`gauge`／`scatter`，各自 `(input) => ChartOutput`；产出**纯 CSS + SVG 字符串**，无 `<canvas>`／无内联脚本／无 `node:`。
- **放哪**：`packages/base-render/src/charts.ts`（`doc:990`）；出口追加到 `packages/base-render/src/index.ts`（只追加 1 个）。
- **依赖的已存在常量／类型**：`CHART_KINDS`（`spec/charts.ts:8`）／`CHART_PALETTE`（`:234`）／`CHART_BREAKPOINTS`（`:226`）／`CHART_STRUCTURE_RULE`（`:218`）／`CHART_EMPTY_RULE`（`:221`）／`CHART_COORD_RULE`（`:224`）／`CHART_ERROR_CODES`（`:247`）／`CHARTS_STYLE_ID`（`:215`）；类型 `ChartsApi`／`ChartOutput`／`ChartItem`／8 个 `*ChartInput`／8 个 `*ChartOptions`／`ScatterItem`／`ChartSeries`／`ChartMarkLine`／`ChartMarkPoint`／`ChartBand`／`ChartFillBetween`（`:13-213`）；`renderEmptyState`（#76，`src/controls.ts`，用于空态联动）。
- **必须定的口径**：① 图表 CSS 落点（§8-2）；② 选项级语义逐条（`doc:797`）＋ `combo.y2` 移植结论（`doc:798`）；③ `kind-unknown` 可达性（§8-5）；④ `progress`／`gauge` 的 `points === 1` 与 `pct === 0 → empty === false`（`doc:796`）。
- **验收怎么测**：8 接口各跑一次结构断言；空数组 → `empty === true` 且走 `renderEmptyState`；`pct` 型接口 `points === 1`；非法 items → `structure-invalid`；`pct` 非数 → `pct-invalid`；产出无 `<canvas>`／无 `<script`（`doc:994`）。测试放 `packages/base-render/test/charts.test.mjs`。

### W2 `buildChartsHelpersJs`（runtime；`spec/index.ts:181`；文档 `:778`）

- **实现什么**：`(input?: ChartsHelpersInput): string`——**恒返回非空 JS 文本**，是 `TemplateAssets.chartsHelpersJs` 的唯一产出者（FX-22）；内容受 `SHARED_HELPERS_JS_RULE` 约束：自包含／幂等（幂等判据只许落在 DOM）／允许 DOM 读取／禁 `window.<id> =`／`globalThis.<id> =`／禁 `node:`；空串视为实现缺陷（`fillTemplate` 会抛 `asset-missing`）。
- **放哪**：`packages/base-render/src/charts.ts`（与 `charts` 同文件，`doc:990`）；出口追加到 `src/index.ts`。
- **依赖的已存在常量／类型**：`ChartsHelpersInput`（`spec/charts.ts:261-266`）／`BuildChartsHelpersJs`（`:272`）／`CHARTS_STYLE_ID`（`:215`）／`STYLE_PREFIX`（`src/style.ts:7`）／`SHARED_HELPERS_JS_RULE`（`spec/index.ts:113`）／`TEMPLATE_MARKERS.chartsHelpers`（`spec/template.ts`）＋ `MARKER_RULES.chartsHelpers.rule = 'zero-or-one'`（`doc:808`）。
- **验收怎么测**：返回值非空；过 `SHARED_HELPERS_JS_RULE` 纯度口径（与 §6.3／`test/contract-signatures.test.mjs:911-971` 同一实现：`purityViolations()`＋`stripJsComments()`）；`node:` 四种写法必须被拦；含 DOM 的合法文本必须过门（`doc:981`、`doc:1010`）。

### W3 `renderHelpShell`（runtime；`spec/index.ts:178`；文档 `:775`）

- **实现什么**：`(input: HelpShellInput): FillTemplateOutput`——用 `SceneData` 渲染 HTML 速查台（B6：标题区＋分组 Tab＋二级折叠＋场景卡＋Sheet 弹层＋关于 Tab），**必须走 `fillTemplate`**（B3：不得自填、不得内联脚本、不得读全局），返回 `{ html, report }`。
- **放哪**：`packages/base-render/src/help.ts`（`doc:990`）；内置壳模板为**模块内部常量**（不得新增出口，§8-3）；出口追加到 `src/index.ts`。
- **依赖的已存在常量／类型**：`HelpShellInput`／`RenderHelpShell`（`spec/help.ts:250-260`）／`SceneData`／`Scene`／`SceneGroup`／`SceneSubgroup`／`SceneMetaBlock`／`SceneInitBanner`／`SceneContact`／`SceneRecommendation`（`:22-101`）／`SCENE_DATA_SCHEMA`（`:104`）／`SCENE_TYPE_FIELD`（`:20`）／`SCENE_STATUS`（`:15`）／`HELP_SHELL_ID`（`:235`）／`HELP_COPY_TARGETS`（`:238`）／`HELP_COPY_ACTIONS`（`:244`）／`HELP_SCHEMA_ERROR_CODES`（`:262`）；`fillTemplate`／`TemplateAssets`／`FillTemplateOutput`（`src/template.ts`）；`ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`／`copyText`／`bindCopyAction`（`src/controls.ts`）。
- **必须定的口径**：① 模板落点与占位符契约（数据页：`INJECT-DATA` 恰 1 次且在 `<script id="payload" type="application/json">` 内；`SHARED-CSS`／`SHARED-HELPERS` 各 1 次；`doc:848,959-961`）；② 错误码触发面（`schema-invalid`／`duplicate-id`／`status-invalid`／`types-invalid`，`doc:820`）与 `scenes[]` 非空裁定（§8-1）；③ `types` 单复数（AC-3，不得有 `type` 别名）；④ 文案口径「复制指令」（FX-7）。
- **验收怎么测**：走 `fillTemplate` 后断言三个必需标记各出现 1 次；`SCENE_DATA_SCHEMA` 校验一份含 `init_banner`／`contact`／`version`／`recommendations` 的数据；三个复制按钮的 `actionId`／文案与 `HELP_COPY_ACTIONS` 逐字一致且写入 `ACTION_ID_ATTR`（`doc:994`）。测试放 `packages/base-render/test/help.test.mjs`。

### W4 status 翻转 ＋ 三处同步（`charts`／`RenderHelpShell`／`renderHelpShell`／`BuildChartsHelpersJs`／`buildChartsHelpersJs`）

- **实现什么**：`spec/index.ts:173,177,178,180,181` 五处 `status` → `implemented`；`docs/base-paint-contract.md:770,774,775,777,778` 五行同步；`test-d/contract-signatures.ts:349,350,359` 三条 `Absent<>` → `Present<>` ＋ 补 3 条出口类型锁（先例 `:252-277`／`:306-316`）。
- **放哪**：三处文件即上（**签名值零改动**：`kind`／`ticket`／`section`／`signature` 逐字不动）。
- **依赖**：W1–W3 必须先落地（否则 `Present<>` 断言失败）。
- **验收怎么测**：`pnpm build`／`pnpm test:types` exit 0（编译期 `Absent<>` 全过）；签名测试 `contract-signatures.test.mjs` 全绿（文档绑死 ＋ 出口集相等 ＋ pending 未导出反转）；`pnpm test` **新增失败 = 0**（判据 `docs/research/t92-baseline-failures.md` 失败用例名多重集，`doc:1014`）。

### W5 交付物与登记（非代码，但属票面验收）

- **实现什么**：① `.changeset/base-paint-charts-help-shell.md`（`'base-paint': minor`，引票号）；② `docs/base-paint-contract.md` 追加 §8.11 #78 施工台账（先例 §8.10 `:1306-1336`），登记 §8 的 6 项裁定结论；③ 证据入仓 `docs/research/t78-*.md`（8 接口 × 断言、HELP 壳产出快照、纯度扫描自证）；④ 票面回贴 + map `#63` Decisions so far 追加一行。
- **放哪**：`.changeset/`／`docs/base-paint-contract.md`／`docs/research/`（**本取证报告不含任何写操作，以上均未创建**）。
- **依赖**：W1–W4 完成后。
- **验收怎么测**：`pnpm boundaries` PASS；`pnpm test` 新增失败 0；changeset 存在且引票号（对照 `test/contract-signatures.test.mjs:551-558` 的既有用例风格）。

---

## 附：本次取证的全部只读命令与产出

- 读文件：`packages/base-render/src/spec/index.ts`（全 188 行）／`src/spec/charts.ts`（全 272 行）／`src/spec/help.ts`（全 276 行）／`src/index.ts`／`src/style.ts`／`package.json`／`tsconfig.json`／`test-d/contract-signatures.ts`（1-130、296-325、330-415）／`test/contract-signatures.test.mjs`（96-155、232-301、361-405、505-634）／`test/text.test.mjs`（1-40）／`docs/base-paint-contract.md`（258-313、740-869、870-999、996-1040、1302-1336）／`docs/research/t92-architect-calls.md`（17-66）／`docs/research/t92-contract-freeze-brief.md`（11-110）／`docs/research/t92-architect-rulings.md`（105-124）／`docs/research/t92-old-v130-signatures.md`（160-189）／`.scratch/t78/HANDOFF.md`／`.scratch/t78/issue78-comments.md`。
- 只读 `gh`：`gh issue view 63／75／76／77／78／79／88／90／91／104／105`。
- 统计：清单 130 条；`#78` 27 条（22 implemented／5 pending）；全仓 pending 7 条。
- **未执行**：任何 `pnpm`／`node` 构建或测试；任何 `git add／commit／push／checkout／stash／clean`；除本文件外**零写入**。
