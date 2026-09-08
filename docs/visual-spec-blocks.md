# 视觉尺 · 乙：内容页区块级尺（12 个区块组件）

- 票：`#105`《视觉规格冻结（89a：B1 逐值＋区块级尺）》· 图 `#63`《卡路里·本体图（1/3）parity 极致重做》
- 本文件：`docs/visual-spec-blocks.md`（**新建，本票产物之一**）
- 姊妹尺：`docs/visual-spec-help.md`（HELP 页 B1 逐值 20 条）
- 对位票：`#104`《B1 区块组件整合（12 组件，接口 owner）》、`#75`（样式资产）、`#108`–`#113`（47 页同质／18 项移植）
- 状态：**冻结于实现之前**。
- **裁定（编排者 R35 · 2026-09-09）**：本尺取值**只引用**已冻结常量与控件级数值，**不重述第二份数值**；与冻结契约冲突处**以冻结契约为准**。§4 的 **DB-3…DB-9 已裁定**（逐条见 `#105` 票面回贴）；**DB-1（12 区块清单）与 DB-2（新增「区块样式区」闭集）移交 `#104`**——区块接口 owner 是 `#104`，新增闭集属契约面，本尺不得自造第二份闭集。

---

## 0. 三条纪律（含票面硬约束）

1. **不要求 DOM 同构**（票面原话）。本尺**不规定**节点树、标签嵌套、类名拼写细节、区块顺序；只规定**可断言的锚点**：类名命名空间、必需属性、状态取值、数值规格。
   - 依据：`docs/base-paint-contract.md:847`「HELP 壳产物结构（DOM 结构／类名／区块顺序的**逐节点契约不冻结也不排除**）」；`docs/base-paint-contract.md:303`「控件**视觉规格**（逐区尺寸／色值／圆角／断点）本契约**不冻结也不排除**，owner 是 `#75`」。本尺就是这两处留白的填充物。
   - 因此：**同一区块允许两种以上 DOM 实现**，只要锚点齐全即判通过；反之，DOM 长得一模一样但锚点缺失，判**不通过**。
2. **能引用就不要重述**：凡 `packages/base-render/src/spec/*.ts` 已冻结的常量（`CONTROL_STYLE_SECTIONS`／`STATUS_KINDS`／`CHART_KINDS`／`SCENE_DATA_SCHEMA` 等），本尺只写「引用 X」。
3. **控件 vs 区块的分层不得混淆**：控件级（原子，`#76` 六控件）签名由 `docs/base-paint-contract.md` §3.3 冻结；区块级（页面级组合）owner 是 `#104`，**组合**控件而**不得**重定义控件签名、不得复制控件实现、不得改 `CONTROL_*`／`STATUS_*`／`COPY_*` 常量（`docs/base-paint-contract.md:867-869`、`docs/research/t92-architect-rulings.md:123` FX-9）。

---

## 1. 十二个区块（拟定清单 ＋ 证据）

> `#104` 票面只给了「KPI／表格／`<pre>`／图表／列表／空态／详情／复制等」8 个具名 ＋ 一个「等」，**没有**逐条枚举 12 个。本尺据证据补足到 12 个，清单本身进 §5 拍板（**D-B1**），`#104` 可改名但须保留锚点语义。

| # | 区块名 | 来源（为什么是它） | 证据出处 |
|---|---|---|---|
| **B-01** | 页面壳／标题区 | 每页都要的容器与标题；HELP 壳同族 | `docs/base-paint-contract.md:823-851`；`docs/calorie-architecture.md:66` |
| **B-02** | KPI 卡 | `#104` 具名 | `docs/research/benchmark-visual-spec.md:446-461`（§3.1） |
| **B-03** | 表格 | `#104` 具名 | `benchmark-visual-spec.md:707-718`（§3.15 表规格） |
| **B-04** | 图表 | `#104` 具名 | `packages/base-render/src/spec/charts.ts:8,196-232` |
| **B-05** | 列表（行） | `#104` 具名 | `benchmark-visual-spec.md:566-618`（§3.7） |
| **B-06** | 指令块 `<pre>` | `#104` 具名 | `benchmark-visual-spec.md:726-737,844` |
| **B-07** | 详情区 | `#104` 具名 | `packages/base-render/src/spec/help.ts:38-46`；`docs/base-paint-contract.md:835-836` |
| **B-08** | 折叠区 | 旧共享层 `foldBox` ＋ 旧 HELP 的 L1/L2/L3 折叠（HELP 的核心交互） | `docs/research/t72-shared-layer-gap.md:140`；`docs/research/t71-help-dissect.md:408` |
| **B-09** | 表单／参数区 | 旧共享层 `formPrompt`（参数表单 ＋ 实时预览） | `docs/research/t72-shared-layer-gap.md:137`；`packages/base-render/src/spec/help.ts:30-36` |
| **B-10** | 空态 | `#104` 具名 ＋ 冻结控件 `emptyState` | `packages/base-render/src/spec/controls.ts:308-316,719-728` |
| **B-11** | 复制区 | `#104` 具名 ＋ 冻结控件 `actionBar`／`copyText` | `packages/base-render/src/spec/controls.ts:254-285,649-695` |
| **B-12** | 反馈区（toast ＋ 错误回执） | 旧共享层 `toast`／`errorReceipt`；HELP 复制反馈载体 | `packages/base-render/src/spec/controls.ts:186-240,318-331` |

**覆盖自检：12/12**（上表 B-01 … B-12 各恰一条）。

---

## 2. 逐区块规格（区块名 ＋ 可断言锚点 ＋ 证据）

> 每条给：**锚点**（类名命名空间／必需属性／状态）／**数值规格**（若属视觉）／**证据出处**／**状态与失败态**。所有「引用 X」均指 §3 的冻结常量，不复述其值。

### B-01 页面壳／标题区

- **类名命名空间**：根节点类名以 `STYLE_PREFIX` 开头（引用 §3）；HELP 页根类名取 `HELP_SHELL_ID`（引用 §3）。
- **必需属性**：产物必须是**单文件自足**——`SHARED-CSS` 与 `SHARED-HELPERS` 占位符各**恰好 1 次**（声明 `NO-SHARED` 时豁免）、无残留（引用 `MARKER_RULES`，§3）；载荷槽**恰有其一**（`INJECT-DATA` 数据页 或 `CONTENT` 内容页，引用 `PAYLOAD_SLOT_RULE`，§3）；模板分型取 `TEMPLATE_KINDS`（§3）。
- **数值规格**：内容列 `max-width:960px`；页面内距 `32px 20px 80px`（`benchmark-visual-spec.md:835,234`）。
- **状态**：无（静态）。
- **证据**：`docs/base-paint-contract.md:823-851`；`packages/base-render/src/spec/template.ts:52,84`。
- **可断言形式**：产物 grep 三个资产／载荷占位符 → `SHARED-CSS`／`SHARED-HELPERS` 各恰 1、残留 0、载荷槽恰有其一；根节点类名匹配 `^ilife-`。
- **裁定**：已定（编排者 R35）——本区块锚点有效；**清单本身与「区块样式区」命名空间登记移交 `#104`**（DB-1／DB-2）。

### B-02 KPI 卡

- **类名命名空间**：`ilife-` 前缀（引用 §3 `STYLE_PREFIX`）。
- **必需属性**：四槽文本节点齐备——label 行、value、unit、detail；数值元素带 `tnum`。
- **数值规格**：value 走字号阶梯中的「大数字」档；unit 为次级灰、比 value 小 ≥8px；detail 为最小档灰（`benchmark-visual-spec.md:121-129,842`）。
- **状态**：徽章 kind ∈ `STATUS_KINDS`（§3）；非法 status 降级 `empty`（§3 `renderStatusBadge`）。
- **证据**：`benchmark-visual-spec.md:446-461`（§3.1 四槽）；`packages/base-render/src/spec/controls.ts:289-298,707`。
- **可断言形式**：每张卡同时含 label／value／unit／detail 文本节点；value 与 unit 同行基线；badge 类名后缀 ∈ `STATUS_KINDS`。
- **裁定**：已定（编排者 R35）——四槽 ＋ `STATUS_KINDS` 锚点有效；对应 HELP 尺 H-13（HELP 页判 N/A，转本区块）。

### B-03 表格

- **类名命名空间**：`ilife-` 前缀；整表落在卡片容器内。
- **必需属性**：**语义标签**——`<table>`／`<thead>`／`<th>`／`<td>`（不用 div 栅格模拟，保证无障碍与可断言）。
- **数值规格**：`th` 大写、11.5–12px、600 字重、最浅灰、**背景透明**、1px 硬描边下边框；`td` 内距 12–14px、1px 软描边下边框、次级灰文字；末行 `border-bottom:none`（`benchmark-visual-spec.md:846,707-718`）。
- **状态**：空数据 → 走 **B-10 空态**（不渲染空表）。
- **证据**：`benchmark-visual-spec.md:707-718,846`。
- **可断言形式**：`th` computed `text-transform:uppercase`／`background-color:transparent`／`border-bottom-width:1px`；`td` `padding` ∈ [12px,14px]；`tr:last-child td` 无下边框。
- **裁定**：已定（编排者 R35）——**强制语义标签**（DB-3 取推荐 a）；对应 HELP 尺 H-17。

### B-04 图表

- **类名命名空间**：容器类名以 `STYLE_PREFIX` 开头，形如 `<prefix>charts` / `<prefix>charts-<kind>`（引用 §3 `STYLE_PREFIX`）；样式表 id 取 `CHARTS_STYLE_ID`（§3）。
- **必需属性**：产出形态 `ChartOutput`（`kind`／`html`／`empty`／`points`，§3）；`kind` ∈ `CHART_KINDS`（§3，8 种）。
- **数值规格**：坐标唯一性——容器零 padding、留白进 viewBox（§3 `CHART_COORD_RULE`）；窄屏断点取 `CHART_BREAKPOINTS.mobileMaxPx`（§3）；取色取 `CHART_PALETTE`（§3，数据可视化色板，**不受 UI 禁色约束**，见 §4 CB-5）。
- **状态**：空数组 → `empty=true` 且走空态（§3 `CHART_EMPTY_RULE`），**不得**静默渲染空图；结构违规 → **直接抛错**（§3 `CHART_STRUCTURE_RULE`），不得降级成残缺图。
- **证据**：`packages/base-render/src/spec/charts.ts:3-8,196-232`；旧侧 8 接口对照 `docs/research/t72-shared-layer-gap.md:152-170`。
- **可断言形式**：调 `charts.<kind>(input)` 返回 `{kind,html,empty,points}`；`html` 含 `viewBox` 且容器 `padding:0`；空数组时 `empty===true` 且 `html` 含空态锚点；非法输入抛 `ChartError`。
- **裁定**：已定（编排者 R35）——**不允许 `canvas` 例外**（DB-6 取推荐 a，对齐 `spec/charts.ts:3-5`）；色板例外见 §4 CB-5（D-10）；对应 HELP 尺 H-14。

### B-05 列表（行）

- **类名命名空间**：`ilife-` 前缀。
- **必需属性**：每行有左／中／右三槽（时间或序号、主体文本、数值或状态）；主体文本可截断（`min-width:0` ＋ `text-overflow:ellipsis`）。
- **数值规格**：行分隔用 1px **软描边**、**首行无边框**；行内距按规格档（`benchmark-visual-spec.md:837,578,591`）。
- **状态**：完成态行 → 文本删除线 ＋ 成功色；空列表 → 走 **B-10 空态**。
- **证据**：`benchmark-visual-spec.md:566-618`（§3.7）；旧版实测 `fixtures/help-instances/卡路里_HELP_20260730_130429.html:355-363`（`.log-row` grid `44px 1fr auto`）。
- **可断言形式**：行容器每行 `border-top-width:1px` 且颜色为软描边、`:first-child` 为 0；完成态行 computed `text-decoration-line:line-through`。
- **裁定**：已定（编排者 R35）——软描边取值随 HELP 尺 C-2 取冻结口径（DB-5 取推荐 a：`--line` ＋ alpha 派生，不新增 token）；对应 HELP 尺 H-11。

### B-06 指令块 `<pre>`

- **类名命名空间**：`ilife-` 前缀。
- **必需属性**：载体必须是 `<pre>`（逐字命令不放正文内联）；若带复制，按钮必带 `ACTION_ID_ATTR` 与文本属性 `DEFAULT_DATA_ATTR`（§3）。
- **数值规格**：等宽字体 11.5–12px、`line-height:1.55`、`white-space:pre-wrap`、`overflow-x:auto`、圆角 8px、落在深色或软底色面（`benchmark-visual-spec.md:844,726-737`）。
- **状态**：无命令 → 不渲染空板（走 B-10 或省略）。
- **证据**：`benchmark-visual-spec.md:726-737,844`；旧版实测 `fixtures/help-instances/卡路里_HELP_20260731_201530.html:193-198,429`（`<pre class="prompt-pre">`，圆角 4px ≠ 规格）。
- **可断言形式**：命令块 tagName === `PRE`；computed `font-family` 为等宽栈、`font-size ∈ [11.5px,12px]`、`line-height:1.55`、`overflow-x:auto`、`border-radius:8px`。
- **裁定**：已定（编排者 R35）——`<pre>` 板规格有效；圆角 8px 走局部 CSS 常量（不新增 token，D-5）；对应 HELP 尺 H-15。

### B-07 详情区

- **类名命名空间**：`ilife-` 前缀；HELP 页内属 `helpShell` 命名空间（§3）。
- **必需属性**：场景对象必带 `id`／`title`／`wake_word`／`status`／`prompt_template`（引用 §3 `SCENE_DATA_SCHEMA` 的 `required`）；类型字段名取 `SCENE_TYPE_FIELD`（**复数，无单数别名**，§3）；详情层展示 `prompt_template` **全文**、该场景的 CLI 形态、类型徽章（`docs/base-paint-contract.md:835-836`）。
- **状态**：`status` ∈ `SCENE_STATUS`（§3 两值闭集）；`status='【待开发】'` 时渲染待开发徽章，**复制按钮仍可点**（`docs/base-paint-contract.md:820`）。
- **证据**：`packages/base-render/src/spec/help.ts:17,22,38-46,106-238`；`docs/base-paint-contract.md:813-850`。
- **可断言形式**：对每个场景对象按 schema 校验 → 必填齐全、`status` 命中闭集、`types`（复数）合法；详情层文本包含 `prompt_template` 原串（逐字，不 trim）。
- **裁定**：已定（编排者 R35）——schema／`types` 复数／`SCENE_STATUS` 锚点均为冻结常量，直接可用。

### B-08 折叠区

- **类名命名空间**：`ilife-` 前缀。
- **必需属性**：用**原生** `<details>/<summary>`（键盘可达，无需自绘）；折叠头必须含可读标题；`[open]` 属性驱动展开态。
- **数值规格**：折叠箭头为字符指示器、`[open]` 时旋转 90°、过渡 ≤150ms（旧版实测 `transform .12s`）。
- **状态**：默认展开／折叠由层级决定（HELP 二级默认展开）；点击复制按钮**不得**触发折叠 toggle（50ms 兜底检查，`docs/research/t71-help-dissect.md:408`）。
- **证据**：`fixtures/help-instances/卡路里_HELP_20260731_201530.html:114,137,157,451`（`[open]` 与箭头旋转）；`docs/research/t72-shared-layer-gap.md:140`（旧 `foldBox`）；`docs/research/t71-help-dissect.md:408`。
- **可断言形式**：折叠节点 tagName === `DETAILS` 且子节点含 `SUMMARY`；`[open]` 时 `summary::before` 的 computed `transform` 为旋转 90°；点击 `.copy-btn` 后 50ms 内 `open` 属性不变。
- **裁定**：已定（编排者 R35）——**强制原生 `<details>`**（DB-4 取推荐 a）。

### B-09 表单／参数区

- **类名命名空间**：`ilife-` 前缀。
- **必需属性**：字段对象必带 `name`／`label`／`value`（引用 §3 `SCENE_DATA_SCHEMA` 的 `editable_fields` 必需项），可选 `hint`／`required`；渲染为 `label` ＋ `input`（`placeholder = hint`）。
- **数值规格**：输入控件按 A 系输入态——静息灰底无边框、聚焦变白 ＋ 主色边框 ＋ 3px 光晕（`benchmark-visual-spec.md:671-685`）；触控目标 ≥44px（`benchmark-visual-spec.md:741-742`）。
- **状态**：`required=true` 且值为空 → **拒绝复制**并提示缺失字段名；输入变化 → 实时重算预览文本（`input` 事件）。
- **证据**：`packages/base-render/src/spec/help.ts:30-36,174-188`；`docs/research/t72-shared-layer-gap.md:137`；`docs/research/t71-help-dissect.md:395,398`；`benchmark-visual-spec.md:671-685,741-742`。
- **可断言形式**：每个字段渲染出 `label` 与 `input` 且 `placeholder` 等于 `hint`；`required` 字段留空时点击复制 → 无剪贴板写入 ＋ 出现含字段名的提示；修改输入 → 预览文本随之变化。
- **裁定**：已定（编排者 R35）——实时预览触发用 **`input` 事件**（DB-7 取推荐 a）。

### B-10 空态

- **类名命名空间**：`ilife-empty`（引用 §3 `STYLE_PREFIX` ＋ `CONTROL_STYLE_SECTIONS` 的 `emptyState`）；子节点类名形如 `empty-icon`／`empty-text`／`empty-hint`／`empty-action`。
- **必需属性**：`text` 必填；`icon`／`hint`／`actionHtml` 可选（引用 §3 `EmptyStateInput`）。
- **数值规格**：居中卡片、内距 `48px 20px`、图标 40px／`opacity:.5`、标题 17px／600、说明 13px 最浅灰（`benchmark-visual-spec.md:847,658-667`）。
- **状态**：无数据即空态；**异常**走 B-12 错误回执（两者不得混用，§5 DB-8）。
- **证据**：`packages/base-render/src/spec/controls.ts:308-316,719-728`；`packages/base-render/src/spec/style.ts:37`；`benchmark-visual-spec.md:847,658-667`。
- **可断言形式**：`renderEmptyState({text})` 产出含 `ilife-empty` 根 ＋ `empty-text`；computed `padding:48px 20px`；图标 `font-size:40px`／`opacity:0.5`。
- **裁定**：已定（编排者 R35）——**无数据＝空态／异常＝错误回执**，两者不混用（DB-8 取推荐 a）。

### B-11 复制区

- **类名命名空间**：`ilife-action-bar`／`ilife-action-row`／`ilife-copy-btn`（引用 §3 `STYLE_PREFIX` ＋ `CONTROL_STYLE_SECTIONS` 的 `actionBar`／`copyButton`）。
- **必需属性**：每个复制按钮**必带** `ACTION_ID_ATTR`（`data-action-id`）与文本属性 `DEFAULT_DATA_ATTR`（`data-t`）——两者是**两个不同属性**，不得混用（§3 注释）；actionId 取 `COPY_ACTION_IDS.actionBar`（复制数据／日志）或 HELP 三目标 `HELP_COPY_ACTIONS`（§3）。
- **数值规格**：按钮最小高度、字号、字重、ghost 描边透明度取 `ACTION_BAR_DEFAULTS`（§3，**不复述**）；ghost 按钮独立成行。
- **状态**：成功 → `.copied` 态 ＋ 成功文案（取 `COPY_TEXT_DEFAULTS`，§3）；失败 → 失败文案恒在（不可静默）；空文本 → 短路不复制。
- **证据**：`packages/base-render/src/spec/controls.ts:74-82,97,112-115,158,254-285,649-695`；`docs/base-paint-contract.md:837-846`。
- **可断言形式**：每个按钮同时含 `data-action-id` 与 `data-t`；`listActionIds()` 能发现全部 id；空文本时 `copyText` 返回 `ok:false` 且不写剪贴板。
- **裁定**：已定（编排者 R35）——两个属性分工不混用；HELP 页不保留「复制全部」胶囊（D-8），本区块的「复制数据／复制日志」仍按冻结 `COPY_ACTION_IDS.actionBar`。

### B-12 反馈区（toast ＋ 错误回执）

- **类名命名空间**：`ilife-toast`／`ilife-error`（引用 §3 `CONTROL_STYLE_SECTIONS` 的 `toast`／`errorReceipt`）。
- **必需属性**：toast 必带 `role` 与 `aria-live`（取 `TOAST_DEFAULTS`，§3）；错误回执的复制按钮 actionId 取 `COPY_ACTION_IDS.errorReceipt`（§3）。
- **数值规格**：toast 时长／栈上限／窄屏栈上限／栈间距取 `TOAST_DEFAULTS`（§3，**不复述**）。
- **状态**：toast `.show` 控制显隐；错误回执缺 `dataText`／`logText` 时**不渲染**对应复制按钮（容错不抛错）。
- **证据**：`packages/base-render/src/spec/controls.ts:186-240,318-331,747-765`；`benchmark-visual-spec.md:696`。
- **可断言形式**：toast 根节点 `role`／`aria-live` 属性等于冻结值；`data-max` 等于栈上限；错误回执在缺文本时按钮计数 = 0。
- **裁定**：已定（编排者 R35）——数值规格全部引用冻结 `TOAST_DEFAULTS`（不复述）；对应 HELP 尺 H-16／H-18。

---

## 3. 与已冻结常量的关系（只引用，不复述）

| 区块 | 引用的冻结常量／类型 | 冻结位置 |
|---|---|---|
| B-01 | `STYLE_PREFIX`／`STYLE_SHEET_ID`／`TEMPLATE_KINDS`／`MARKER_RULES`／`HELP_SHELL_ID` | `packages/base-render/src/style.ts:7`；`src/spec/style.ts:29`；`src/spec/template.ts:52,84`；`src/spec/help.ts:240` |
| B-02 | `STATUS_KINDS`／`STATUS_DEFAULT_TEXT`／`renderStatusBadge` | `packages/base-render/src/spec/controls.ts:289-298,707` |
| B-04 | `CHART_KINDS`／`ChartOutput`／`CHARTS_STYLE_ID`／`CHART_STRUCTURE_RULE`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE`／`CHART_BREAKPOINTS`／`CHART_PALETTE`／`CHART_ERROR_CODES` | `packages/base-render/src/spec/charts.ts:8,196-250` |
| B-06／B-11 | `ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`／`COPY_ACTION_IDS`／`COPY_TEXT_DEFAULTS`／`ACTION_BAR_DEFAULTS` | `packages/base-render/src/spec/controls.ts:74-82,97,112-115,158,273-285` |
| B-07／B-09 | `SCENE_DATA_SCHEMA`／`SCENE_TYPE_FIELD`／`SCENE_STATUS`／`Scene`／`SceneEditableField`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS` | `packages/base-render/src/spec/help.ts:17-46,106-253` |
| B-10 | `EmptyStateInput`／`renderEmptyState` | `packages/base-render/src/spec/controls.ts:308-316` |
| B-12 | `TOAST_DEFAULTS`／`TOAST_ICONS`／`ErrorReceiptInput`／`renderErrorReceipt` | `packages/base-render/src/spec/controls.ts:186-240,318-331` |
| 全区块 | 8 个控件样式命名空间闭集 `CONTROL_STYLE_SECTIONS`；Q14 禁入 `STYLE_FORBIDDEN_TOKENS` | `packages/base-render/src/spec/style.ts:32-46` |

**锚点纪律**：本尺**不锚**具体 DOM 结构、不锚类名拼写细节、不锚区块顺序——这三项由 `docs/base-paint-contract.md:847` 明确「不冻结也不排除」。本尺锚的是「命名空间 ＋ 必需属性 ＋ 状态取值 ＋ 数值规格」。

---

## 4. 与冻结常量的冲突／缺口（有／无）

**结论：无「数值矛盾」，但有 2 处缺口 ＋ 3 处口径待登记。**

> **裁定（编排者 R35）**：与冻结契约冲突处**一律以冻结契约为准**；下表「处置建议」栏即最终落法。

| # | 项 | 状况 | 处置（R35 落法） |
|---|---|---|---|
| **CB-1** | 12 个区块的**类名命名空间** | 冻结闭集 `CONTROL_STYLE_SECTIONS` 只有 8 个（`toast`／`actionBar`／`copyButton`／`statusBadge`／`emptyState`／`errorReceipt`／`charts`／`helpShell`），而 12 区块中 B-01～B-09 大多没有专属区 | **缺口 → 移交 `#104`**：本尺**不自造第二份闭集**（§5 DB-2 移交）；`#75`／`#104` 联合裁定登记方式，**不得**改写控件闭集 |
| **CB-2** | 软描边 token（列表分隔线／表格 td 下边框） | 冻结 11 token 只有实色 `--line`，无 `--lineS` 等价物 | **已定**：`--line` ＋ alpha 派生（DB-5 推荐 a），不动冻结表 |
| **CB-3** | 圆角集 | 冻结表零圆角 token | **已定**：局部 **CSS 常量**收敛到 `{8,14,20,999,50%}`，**不新增 token 名**（HELP 尺 D-5） |
| **CB-4** | 控件 vs 区块粒度重叠 | `emptyState`／`actionBar`／`copyText` 既是冻结控件，又被区块「空态／复制」组合 | **已定**：按 FX-9 分层（控件＝原子冻结／区块＝组合不重定义）；区块清单终审仍移交 `#104`（DB-1） |
| **CB-5** | 图表色板含紫／粉 | `CHART_PALETTE` 含紫／粉，而 HELP 尺 H-01 要求 UI 无紫无粉 | **已定**：禁色只约束 UI 主色，**数据可视化色板例外**（HELP 尺 D-10 同一裁定） |

---

## 5. 拍板条目与裁定

> 裁定来源：**编排者 R35**（2026-09-09）；裁定后取值不再改动（除维护者另行纠正）。

| # | 问题 | 选项 | 推荐 | 裁定（R35） |
|---|---|---|---|---|
| **DB-1** | 12 区块清单是否就取本尺拟定的 12 个？ | (a) 取本尺 12 个；(b) `#104` 另定 | **(a)**：每条都有证据出处；改名需保留锚点语义 | **移交 `#104`**：清单**暂定**，最终以 `#104` 为准（接口 owner） |
| **DB-2** | 区块类名命名空间怎么登记？ | (a) 新增「区块样式区」闭集（不改控件闭集）；(b) 扩写 `CONTROL_STYLE_SECTIONS`；(c) 区块不登记，只用 `ilife-` 前缀 | **(a)**：控件闭集已冻结，扩写属破坏性变更；完全自由则失去可断言性 | **移交 `#104`**：新增闭集属契约面，**本尺不得自造第二份闭集** |
| **DB-3** | 表格是否强制语义标签？ | (a) 强制 `<table>/<th>/<td>`；(b) 允许 div 栅格 | **(a)**：无障碍刚需，且让「th 透明背景／td 末行无边框」可机判 | **已定**：强制语义标签（取 a） |
| **DB-4** | 折叠是否强制原生 `<details>`？ | (a) 原生；(b) 自绘 ＋ `aria-expanded` | **(a)**：键盘可达免费获得；旧版已有 50ms 兜底经验 | **已定**：强制原生（取 a） |
| **DB-5** | 软描边用什么值？ | (a) `--line` ＋ alpha 派生；(b) 新增 token（须改冻结表）；(c) 沿用实色 | **(a)**：不动冻结表；`--lineS` 类语义由 `#75` 落 | **已定**：`--line` ＋ alpha 派生（取 a） |
| **DB-6** | 图表是否允许 `canvas` 例外？ | (a) 不允许（B4 已否决）；(b) 允许 | **(a)**：`packages/base-render/src/spec/charts.ts:3-5` 已裁定「唯一实现住 base-paint，纯 CSS ＋ SVG」 | **已定**：不允许 `canvas`（取 a） |
| **DB-7** | 表单实时预览的触发事件？ | (a) `input`（逐键）；(b) `change`（失焦） | **(a)**：旧版 F3 即用 `input`（`docs/research/t71-help-dissect.md:398`） | **已定**：`input`（取 a） |
| **DB-8** | 空态与错误回执的边界？ | (a) 无数据＝空态；异常＝错误回执；(b) 统一用一种 | **(a)**：冻结层已分两个控件（`emptyState`／`errorReceipt`），混用会丢语义 | **已定**：无数据＝空态／异常＝回执（取 a） |
| **DB-9** | 区块尺是否要求「区块级视觉规格」逐条落值？ | (a) 只锚命名空间／属性／状态 ＋ 引用控件级数值规格；(b) 再写一套区块级数值 | **(a)**：`#104` 票面要「组件级视觉规格」，但数值真相源仍应是冻结常量与 HELP 尺，避免第三份数值 | **已定**：只锚 ＋ 引用（取 a） |

> 结论：**DB-3…DB-9 全部落定**；**DB-1／DB-2 移交 `#104`**（区块组件接口 owner）。

---

## 6. 可验收性自证（区块锚点的实测行）

同一个只读脚本 `.scratch/t105/check-rulers.mjs` 也覆盖区块尺中**能从冻结常量直接判**的锚点，实测（本轮真实输出，节选；全表 47 行，小计「可判 43 条（PASS 25 / OLD-DEVIATION 18 / DEFECT 0）；N/A 2 条；需落地后判 2 条」——口径见 HELP 尺 §6，`OLD-DEVIATION` 只出现在旧版实例行，区块尺行全为 `PASS`）：

| 区块 | 判什么 | 实测值 | 判定 |
|---|---|---|---|
| B-01 | 共享资产占位符数量规则 | `sharedCss`／`sharedHelpers` 各 `exactly-one` | PASS |
| B-01 | 载荷槽规则（数据页／内容页恰有其一） | `exactly-one` | PASS |
| B-04 | `CHART_KINDS` 种类数 | 8 | PASS |
| B-04 | 空数组走空态 | `emptyState` | PASS |
| B-07 | `SCENE_TYPE_FIELD`（复数） | `types` | PASS |
| B-07 | `SCENE_STATUS` 闭集 | `''`／`'【待开发】'` | PASS |
| B-07 | 场景必填字段（schema `required`） | `id`／`title`／`wake_word`／`status`／`prompt_template` 逐字在册 | PASS |
| B-09 | 场景类型字段无单数别名 | 仅 `types` | PASS |
| B-10 | `emptyState` 命名空间在闭集内 | 含 | PASS |
| B-11 | 控件样式命名空间数 | 8 | PASS |
| B-11 | `ACTION_ID_ATTR` | `data-action-id` | PASS |
| B-11 | `DEFAULT_DATA_ATTR` | `data-t` | PASS |
| B-12 | HELP 复制三目标 | `prompt`／`wakeWord`／`params` | PASS |
| B-12 | toast `role`／`aria-live` | `status`／`polite` | PASS |
| B-12 | 反馈区命名空间在闭集内 | `toast`／`errorReceipt` 均在 | PASS |
| B-02／B-03／B-05／B-06／B-08 | 渲染后 computed 值类判据 | 需 `#75`／`#104` 产出后判 | BLOCKED |

**判定说明**：区块尺的**结构性**锚点（DOM 树、节点顺序）**本尺刻意不判**（票面「不要求 DOM 同构」）；判的是「命名空间／必需属性／状态／数值规格」四类。需要渲染产物才能判的（如 `th` 的 computed 背景色）标 `BLOCKED`，待 `#75`／`#104` 落地后由 `#89b` 截图 ＋ 交互记录承接。

---

## 7. 已知限制

1. **12 个区块的清单是拟定的**（`#104` 票面未枚举），已在 §5 DB-1 请求确认；本尺的锚点语义不依赖具体名字。
2. **本尺不提供像素基线**：不做 DOM 同构、不做截图 diff；判据是「锚点 ＋ computed 值」。
3. **区块级数值规格有意保持「引用」而非「新写」**：避免与 `docs/visual-spec-help.md` 和冻结常量形成三份真相；若 `#104` 确需区块级独立数值，须先在 §5 DB-9 拍板。
4. **命名空间缺口（CB-1）已移交 `#104`**：`#104` 未落定前，区块类名可用 `ilife-` 前缀做**临时**锚点，但**不得**据本尺新增第二份样式区闭集。
