# 视觉尺 · 甲：HELP 页（B1 逐值 20 条）

- 票：`#105`《视觉规格冻结（89a：B1 逐值＋区块级尺）》· 图 `#63`《卡路里·本体图（1/3）parity 极致重做》
- 本文件：`docs/visual-spec-help.md`（**新建，本票产物之一**）
- 姊妹尺：`docs/visual-spec-blocks.md`（内容页区块级尺）
- 状态：**冻结于实现之前**。本文件是 `#75`（样式资产）、`#88`（HELP 速查台重建）、`#89`（89b 收尾验收）的**共同验收目标**；实现票不得反向改本尺，只许按本尺实现或在 `#63` 下追加决策后修订。
- 冻结纪律：本尺**只引用**已冻结常量，不复述其值（见 §3）；凡证据不足或属审美选择的，一律进 §5 拍板清单，**不擅自定**。
- **裁定（编排者 R35 · 2026-09-09）**：本尺取值基准 = **B1 逐值 20 条**（地图 `#63` D3「HELP 用 B1 逐值」）；**凡与冻结契约常量冲突处，以冻结契约为准**（契约由 `#92` 冻结，改动须走补遗）；**旧版 HELP 实例的差异 = 「旧版未达 B1」= 新版改进项，不是缺陷**——`.scratch/t105/check-rulers.mjs` 输出里的 `FAIL` 一律读作「旧版差异」（该脚本末行同口径）。与地图 Destination「与旧版 HELP 同质」的张力已在 `#105` 票面与地图记账，维护者可随时纠正。
- **拍板项状态**：§5 的 **D-1…D-15 已全部裁定**（逐条见 `#105` 票面回贴）；**DB-1／DB-2 移交 `#104`**（区块组件接口 owner；新增闭集属契约面，本尺不得自造）。

---

## 0. 这把尺怎么用（三条纪律）

1. **单主色、单字号阶梯、单断点组**——`#105` 的目标是让 `#75` 与 `#88` 有**唯一**的视觉判据，避免每页自造轮子。
2. **能引用就不要重述**：`packages/base-render/src/spec/*.ts` 里已冻结的值（11 个 token、8 个命名空间、`TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS`／`STATUS_DEFAULT_TEXT` 等），本尺只写「引用 X」，**不写第二份数值**；否则就制造了第二真相源。
3. **两把尺分工**：本尺判 **HELP 页**（速查台形态）；KPI 卡、进度环、表格、详情等**内容页区块**由 `docs/visual-spec-blocks.md` 判。HELP 页不要求具备内容页的全部区块。

### 0.1 判据分级（每条都标）

| 级别 | 含义 | 谁来判 |
|---|---|---|
| **A · 静态可判** | 读最终 CSS 文本或渲染 DOM 即可断言，不需交互 | `#75` 单测／`#89b` 截图 |
| **B · 交互／时序** | 必须录屏或交互记录（`#89` 票面点名第 12／16／19／20 条属此类） | `#89b` 交互记录 |
| **C · 需落地后判** | 依赖 `#75` 产出 CSS 或 `#88` 产出页面 | `#75`／`#88` 落地后 |

---

## 1. 证据基础（先读，不许凭空发明数值）

| # | 证据源 | 用途 | 可用性 |
|---|---|---|---|
| E1 | `fixtures/help-instances/卡路里_HELP_20260730_130429.html`（F1，65,366 B／492 行） | **旧版实测基线**（迁移前行为） | 只读冻结物，已入仓 |
| E2 | `fixtures/help-instances/卡路里_HELP_20260731_201530.html`（F2，73,811 B／596 行） | 同上（4 层折叠版） | 只读冻结物，已入仓 |
| E3 | `docs/research/benchmark-visual-spec.md`（969 行） | **B1 规格主文档**（§5 的 20 条验收清单） | 已入仓 |
| E4 | `docs/research/t71-help-dissect.md`（420 行） | 旧 HELP 三代解剖（结构树／断点／复制交互） | 已入仓 |
| E5 | `packages/base-render/src/spec/{style,controls,charts,help}.ts` | **已冻结常量**（只引用不复述） | 已冻结 |
| E6 | `docs/base-paint-contract.md` §3.2／§3.3／§3.5.3 | 冻结面的文档投影 | 已冻结 |

> **口径提醒（重要）**：E3 里的「B1」指旧侧视觉标杆 `统一主面板_视觉标杆.html`（一份**演示页**，不在本仓），而 E1／E2 是本仓冻结的**旧版 HELP 实例**。二者**不是同一个东西**：
> - E3 的 B1 给的是**目标值**（迁移后要长成什么样）；
> - E1／E2 给的是**旧版实测值**（迁移前长什么样）。
> 因此本尺每条都写两栏：**规格值**（目标）与**旧版实测**（基线）。凡两者不同，都是**迁移要改的点**，不是尺子自相矛盾。

---

## 2. 二十条逐值尺（H-01 … H-20）

> **与 `#89` 票面的 1:1 对应**：本 20 条**逐条等于** `docs/research/benchmark-visual-spec.md` §5「Acceptance checklist」的第 1–20 条（`benchmark-visual-spec.md:815-849`），编号一一对应、无合并、无拆分、无重复。`#89` 票面「第 12／16／19／20 条是交互／时序，截图不足」即本尺 H-12／H-16／H-19／H-20（级别 B）。

### H-01 单主色（唯一 primary）

- **规格值**：`--accent`／`--blue` 恰为 `#007aff`；最终 CSS 中 `#0a84ff`／`#af52de`／`#ff375f`／`#0071e3` 命中数 = 0。
- **证据**：`docs/research/benchmark-visual-spec.md:821`（§5 第 1 条）；B1 原值 `benchmark-visual-spec.md:44`；冻结值见 §3 引用 `CSS_VAR_TOKENS['--blue']`（`packages/base-render/src/spec/style.ts:19`，**不复述**）。
- **可断言形式**：`buildStyleSheet().css` 中 `--blue: #007aff` 逐字出现；对最终 CSS 文本 grep `#0a84ff|#af52de|#ff375f|#0071e3` → 命中 0；渲染页 `getComputedStyle(root).getPropertyValue('--blue') === '#007aff'`。
- **旧版实测**：F1 `:11`／F2 `:11` `--accent:#0071e3` → **旧版差异（OLD-DEVIATION）**：旧版未达 B1 标准，属新版改进项，**不是缺陷**。
- **级别**：C（需 `#75` 产出 CSS）。
- **裁定**：已定（编排者 R35）——主色基准取 B1 `#007aff`，与冻结 `--blue` 一致（无冲突），旧版差异须改。

### H-02 灰阶三步 ＋ 边框 alpha ＋ `ink3` 不作正文

- **规格值**：正文文字色只允许三档灰；边框只允许 alpha 半透明描边（不用实色 hex）；最浅一档灰**不得承载正文**（须过 WCAG AA 4.5:1）。
- **证据**：`benchmark-visual-spec.md:822`（§5 第 2 条）；B1 三灰与两条 alpha 边框 `benchmark-visual-spec.md:39-43`；对比度要求 `benchmark-visual-spec.md:967`。
- **可断言形式**：渲染页面对每段正文取 computed `color`，其值 ∈ {`--fg`, `--fg2`}（引用 §3）；所有 `border-color` 的 computed 值为 `rgba(...)` 形式；正文块 computed `color` 不等于 `--fg3`。
- **旧版实测**：F1 `:10` `--text:#1c1c1e`／`--sub:#6b6b6f`，F1 `:11` `--border:#e5e5e7`（**实色**）→ **旧版差异（OLD-DEVIATION）**。
- **冲突**：B1 的三灰与冻结三灰不同值，且冻结表用实色 `--line` → 见 §4 冲突 **C-2**、§5 决策 **D-2**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——**以冻结契约为准**：灰阶与边框取冻结 token，B1 的 alpha 边框降为可选增强；`#75` 落地时以「冻结常量 ＋ 局部 CSS 常量」实现。

### H-03 页底与卡面可区分

- **规格值**：页底与卡面必须是两个可区分的面（卡面不依赖边框也能看出）。
- **证据**：`benchmark-visual-spec.md:823`（§5 第 3 条）；B1 取值 `benchmark-visual-spec.md:37-38`。
- **可断言形式**：页底 computed 背景色 ≠ 卡面 computed 背景色；卡面为纯白。
- **旧版实测**：F1 `:10` `--bg:#f5f6f7`、`--card:#fff` → 卡面合规、页底属**旧版差异（OLD-DEVIATION）**。
- **冲突**：B1 写 `#fafafa`，冻结表写 `--bg` 另一值，旧版又是第三值 → 见 §4 冲突 **C-3**、§5 决策 **D-3**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——**以冻结契约为准**：页底取冻结 `--bg`（`#fafafa` 作废）；「页底 ≠ 卡面」的可区分性要求不变。

### H-04 零渐变

- **规格值**：最终 CSS 中 `linear-gradient`／`radial-gradient` 命中数 = 0（B1 本身零渐变，这是它被选为标杆的理由之一）。
- **证据**：`benchmark-visual-spec.md:824`（§5 第 4 条）；B1 零渐变的事实 `benchmark-visual-spec.md:97`、`benchmark-visual-spec.md:763`；AI 味黑名单 `benchmark-visual-spec.md:968`。
- **可断言形式**：最终 CSS 文本 grep 两个关键字 → 0。
- **旧版实测**：F1 `:24`／F2 `:25` hero `background: linear-gradient(135deg,#fafbfc,#f0f4f8)` → **旧版差异（OLD-DEVIATION）**，新版须删。
- **级别**：C。
- **裁定**：已定（编排者 R35）——零渐变基准取 B1，旧版 hero 渐变属新版改进项。

### H-05 字号阶梯可观测

- **规格值**：最大数字 ≥48px／700；区块标题（`h2`）17px／600；正文 15px；提示 12–13px；相邻两级差 ≥4px 且字重差 ≥100。
- **证据**：`benchmark-visual-spec.md:828`（§5 第 5 条）；B1 阶梯原值 `benchmark-visual-spec.md:121,127,131,204`。
- **可断言形式**：渲染页取各级 computed `font-size`／`font-weight`，按上述四档核对，并验证相邻差 ≥4px／≥100。
- **旧版实测**：F1 `:18` body 13px；F1 `:30` `h1` 220% = 28.6px／700；F1 `:88` 折叠头 13px／600 → 最大字号 28.6px < 48px，正文 13px ≠ 15px。
- **决策**：HELP 页是否必须存在「≥48px 的大数字」→ §5 决策 **D-9**。
- **级别**：A。
- **裁定**：已定（编排者 R35）——**不要求** HELP 页有 ≥48px 大数字（D-9 取推荐 a）；48px＋ 归内容页 KPI。

### H-06 字体栈逐字

- **规格值**：正文栈与等宽栈**逐字**取规格值（正文栈须含 `"SF Pro Display"`；等宽内容用 `"SF Mono",monospace`）。
- **证据**：`benchmark-visual-spec.md:829`（§5 第 6 条）；两条栈原值 `benchmark-visual-spec.md:105,107`。
- **可断言形式**：最终 CSS 中 `body{font-family:…}` 与规格字符串逐字相等；等宽元素 computed `font-family` 以 `"SF Mono"` 开头。
- **旧版实测**：F1 `:17`／F2 `:18` 缺 `"SF Pro Display"`；F1 `:130`／F2 `:162` 等宽栈为 `"SF Mono", Consolas, monospace`（多 `Consolas`）→ **旧版差异（OLD-DEVIATION）**。
- **决策**：`Consolas` 兜底是否纳入规范 → §5 决策 **D-13**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——正文栈逐字取规格；等宽栈逐字 `"SF Mono",monospace`，**不留 `Consolas`**（D-13 取推荐 a）。

### H-07 所有数字 `tnum`

- **规格值**：每个数字都用等宽数字特性（`font-feature-settings:"tnum"`），保证纵列数字对齐。
- **证据**：`benchmark-visual-spec.md:830`（§5 第 7 条）；原值 `benchmark-visual-spec.md:110`。
- **可断言形式**：最终 CSS 中 `font-feature-settings` 出现于 `body` 或每个数值元素；渲染页面对数值列取 computed `font-feature-settings` 含 `tnum`。
- **旧版实测**：F1／F2 全文 `font-feature-settings` 命中 **0** → **旧版差异（OLD-DEVIATION）**：旧版缺口，新版须新增。
- **级别**：C。
- **裁定**：已定（编排者 R35）——`tnum` 为强制项，旧版零命中属新版改进项。

### H-08 标题禁 emoji

- **规格值**：`h1`／`h2` 文本中 emoji 数 = 0；emoji 只许出现在 eyebrow 或 KPI `.icon` 槽。
- **证据**：`benchmark-visual-spec.md:831`（§5 第 8 条）；理由 `benchmark-visual-spec.md:968`。
- **可断言形式**：对每个 `h1`／`h2` 的 `textContent` 跑 emoji 正则 → 0 命中。
- **旧版实测**：F1 `:302`／F2 `:324` `<h1>📚 卡路里 · 唤醒词速查台</h1>` → **旧版差异（OLD-DEVIATION）**。
- **决策**：是否保留标题图标 → §5 决策 **D-12**。
- **级别**：A。
- **裁定**：已定（编排者 R35）——标题**去 emoji**（D-12 取推荐 a）；如需图标放 eyebrow／`.icon` 槽。

### H-09 容器宽度与页边距

- **规格值**：内容列 `max-width: 960px`；页面内距 `32px 20px 80px`。
- **证据**：`benchmark-visual-spec.md:835`（§5 第 9 条）；原值 `benchmark-visual-spec.md:310-311`、canonical `benchmark-visual-spec.md:234`。
- **可断言形式**：最终 CSS 中 `.wrap`／`.container` 的 `max-width:960px` 与 `padding:32px 20px 80px` 逐字；1440px 视口下内容列居中且两侧留白可见。
- **旧版实测**：F1 `:20`／F2 `:21` `max-width:960px; padding:0 12px 40px` → 宽度合规、内距属**旧版差异（OLD-DEVIATION）**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——容器宽度与页边距按 B1 规格逐字，旧版内距属新版改进项。

### H-10 形状 token 只用规定集

- **规格值**：圆角只允许 `{8px, 14px, 20px, 999px, 50%}`；阴影只允许规格给定的轻量两级（resting／elevated），不得出现深色重阴影。
- **证据**：`benchmark-visual-spec.md:836`（§5 第 10 条）；圆角表 `benchmark-visual-spec.md:238-248`；阴影表 `benchmark-visual-spec.md:254-258`。
- **可断言形式**：最终 CSS 中所有 `border-radius` 值 ∈ 上述集合；所有 `box-shadow` 值 ∈ 规定两级（或引用 §3 的冻结阴影常量）。
- **旧版实测**：F1 圆角实测集合 `8px 999px 6px 3px 4px 5px 14px`（F1 `:55,100,107,129,149,166,203,236`）→ **旧版差异（OLD-DEVIATION）**：超出集合。
- **冲突**：冻结表**没有**圆角 token，且阴影只冻结一条 → §4 冲突 **C-4**／**C-5**、§5 决策 **D-4**／**D-5**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——阴影**取冻结单条**（D-4 推荐 a）；圆角收敛到 `{8,14,20,999,50%}`，以 **CSS 常量**落地、**不得新增 token 名**（D-5 推荐 a）。

### H-11 列表分隔线规则

- **规格值**：行分隔用 1px 极浅描边，且**每列首行无边框**（不分隔线与卡片外框叠出双线）。
- **证据**：`benchmark-visual-spec.md:837`（§5 第 11 条）；原值 `benchmark-visual-spec.md:578,591`。
- **可断言形式**：列表容器内每行 computed `border-top-width: 1px`、颜色为软描边 token，且 `:first-child` 的 `border-top-width: 0`。
- **旧版实测**：F1 `:106`／`:149` 每张卡自带整框 `border:1px solid var(--border)`，无「首行无边框的分隔线」机制 → **旧版差异（OLD-DEVIATION）**。
- **级别**：C。
- **裁定**：已定（编排者 R35）——分隔线规则按 B1；软描边取值随 §4 **C-2** 一并取冻结口径（`--line` ＋ alpha 派生，不新增 token）。

### H-12 两条断点行为（**级别 B**）

- **规格值**：`@media (max-width:640px)`：KPI 网格 2 列、数字／环区块降为单列、容器内距降为 `20px 16px 60px`；`@media (max-width:400px)`：KPI 网格 1 列、toast 改为 `left:12px;right:12px`。
- **证据**：`benchmark-visual-spec.md:838`（§5 第 12 条）；两档逐项 `benchmark-visual-spec.md:365-384`；「两个断点值相同」的结论 `benchmark-visual-spec.md:413`。
- **可断言形式**：最终 CSS 中恰有两条 `@media` 的 `max-width` 分别等于 640px／400px；每档列出实际改变的属性集并与规格比对；窄屏实测（375px）KPI 列数符合。
- **旧版实测**：F1 `:259`／F2 `:283` `max-width:600px`；F1 `:294`／F2 `:316` `min-width:601px and max-width:900px` → 与规格 640／400 **不同**。
- **决策**：断点数值组（B1 的 640／400 vs 旧 HELP 的 600／900 vs 图表 720 vs toast 栈 820）→ §5 决策 **D-6**。
- **级别**：B（`#89` 票面点名）。
- **裁定**：已定（编排者 R35）——**三层并存各管一层**（页面 640／400、图表 720、toast 栈 820），不做全站硬统一。

### H-13 KPI 卡解剖完整

- **规格值**：KPI 卡四槽齐全——label 行（可含 icon ＋ 右对齐 badge）、value ＋ unit 同基线、detail 行。
- **证据**：`benchmark-visual-spec.md:842`（§5 第 13 条）；四槽原值 `benchmark-visual-spec.md:446-461`。
- **可断言形式**：每张 KPI 卡同时存在 label／value／unit／detail 四个文本节点；value 与 unit 在同一行基线；数值带 `tnum`。
- **适用范围**：**HELP 页不判**（旧版两实例 `.kpi` 命中 0）——转由 `docs/visual-spec-blocks.md` 的 **B-02 KPI 卡区块**判。
- **级别**：A（在内容页）。
- **裁定**：已定（编排者 R35）——HELP 页判 **N/A**，转内容页区块尺 B-02（D-15 取推荐 a）。

### H-14 进度环几何自洽

- **规格值**：SVG `transform:rotate(-90deg)`；轨道与数值弧**等宽** `stroke`、`stroke-linecap:round`；`stroke-dasharray` 与 `2πr` 一致、`stroke-dashoffset` 与百分比自洽；环心百分比标签居中。
- **证据**：`benchmark-visual-spec.md:843`（§5 第 14 条）；几何原值 `benchmark-visual-spec.md:483-497`。
- **可断言形式**：对环的 SVG 读属性：`r`／`stroke-dasharray` 满足 `dasharray ≈ 2πr`（容差 ±0.5）；`offset ≈ dasharray × (1 − pct)`；两个 `circle` 的 `stroke-width` 相等；环心标签居中。
- **适用范围**：**HELP 页不判**（旧版两实例无环）——转由 `docs/visual-spec-blocks.md` 的 **B-04 图表区块**判。
- **级别**：A（在内容页）。
- **裁定**：已定（编排者 R35）——HELP 页判 **N/A**，转内容页区块尺 B-04（D-15 取推荐 a）。

### H-15 逐字命令板

- **规格值**：逐字命令放在 `<pre>` 板里（不是正文内联）：等宽字体 11.5–12px、`line-height:1.55`、`white-space:pre-wrap`、`overflow-x:auto`、圆角 8px，落在深色或软底色面上。
- **证据**：`benchmark-visual-spec.md:844`（§5 第 15 条）；规格来源 `benchmark-visual-spec.md:726-737`。
- **可断言形式**：每个命令块是 `<pre>` 元素；computed `font-family` 为等宽栈、`font-size` ∈ [11.5px, 12px]、`line-height:1.55`、`white-space:pre-wrap`、`overflow-x:auto`、`border-radius:8px`。
- **旧版实测**：F2 `:429` 用 `<pre class="prompt-pre">`（`:193-198`：11px 等宽、`line-height:1.45`、`pre-wrap`、圆角 **4px**、白底 ＋ 边框）；F1 则用 `div.prompt-main`（`:127-131`：11.5px、`line-height:1.35`、圆角 4px、`#f0f7ff` 底 ＋ 主色左边框）→ **旧版差异（OLD-DEVIATION）**：部分达标（圆角／行高／无 `overflow-x`）。
- **级别**：A。
- **裁定**：已定（编排者 R35）——`<pre>` 板规格按 B1；旧版的 4px 圆角与缺 `overflow-x` 属新版改进项。

### H-16 复制动作单点 ＋ 双反馈（**级别 B**）

- **规格值**：每行恰一个行内复制按钮（行右端）＋ 区块底部恰一个「复制全部」胶囊；成功反馈**双通道**——按钮变绿进入 `copied` 态并跑 450ms 弹簧动画，**同时**底部居中胶囊 toast 出现并自动消失。
- **证据**：`benchmark-visual-spec.md:845`（§5 第 16 条）；按钮与胶囊原值 `benchmark-visual-spec.md:641-648`；`copySuccess` 关键帧 `benchmark-visual-spec.md:284-287`；toast 1800ms `benchmark-visual-spec.md:696`；按钮复原 2000ms `benchmark-visual-spec.md:885`。
- **可断言形式**：每个命令行有且仅有一个复制按钮；区块底部「复制全部」计数 = 1；点击后 ① 按钮类名含 `copied` 且背景为成功色 ② 动画时长 450ms ③ toast 出现并在规格时长后消失 ④ 按钮在规格时长后复原。
- **旧版实测**：F2 `:444` 每张场景卡一个复制按钮 ✔；「复制全部」**不存在**（F1 `:487` 注释：`copyAll` 已于 v2.4.10 删除）；toast 时长 **4500ms**（F2 `:409`）、按钮复原 **2000ms**（F2 `:376`）、450ms 弹簧动画逐字命中（F1 `:179,181-185`／F2 `:223,225-229`）。
- **冲突**：B1 要求 1800ms，冻结 `TOAST_DEFAULTS.timeoutMs` 与旧版实测都是 4500ms → §4 冲突 **C-6**；「复制全部」胶囊与冻结的三复制目标（指令／唤醒词／参数）语义重叠 → 冲突 **C-8**；决策 **D-7**／**D-8**。
- **级别**：B（`#89` 票面点名）。
- **裁定**：已定（编排者 R35）——**以冻结契约为准**：toast 时长取冻结值 4500ms（D-7 推荐 a）；HELP 页**不保留**「复制全部」胶囊，按冻结三目标（D-8 推荐 a）。450ms 弹簧动画与「每行一个复制按钮」保持不变。

### H-17 表格规格

- **规格值**：表头大写小字号／600 字重／最浅灰、**透明背景**、1px 硬描边下边框；单元格内距 12–14px、1px 软描边下边框、次级灰文字、末行无边框；整表落在卡片内。
- **证据**：`benchmark-visual-spec.md:846`（§5 第 17 条）；A 系表规格 `benchmark-visual-spec.md:707-718`。
- **可断言形式**：`th` computed `text-transform:uppercase`、`font-size ∈ [11.5px,12px]`、`font-weight:600`、`background-color:transparent`、`border-bottom:1px` 硬描边；`td` `padding ∈ [12px,14px]`、`border-bottom:1px` 软描边；`tr:last-child td{border-bottom:none}`；表格祖先含卡片容器。
- **旧版实测**：F1／F2 `<table>` 命中 **0** → **旧版差异（OLD-DEVIATION）**：全新组件（区块尺 **B-03**）。
- **级别**：A。
- **裁定**：已定（编排者 R35）——表格规格按 B1；旧版无表格属新增能力，非缺陷。

### H-18 空态存在且成规格

- **规格值**：居中卡片、内距 `48px 20px`、图标 40px／`opacity:.5`、标题 17px／600、说明 13px 最浅灰。
- **证据**：`benchmark-visual-spec.md:847`（§5 第 18 条）；原值 `benchmark-visual-spec.md:658-667`。
- **可断言形式**：空态根节点有卡片外观（背景／圆角／描边）；computed `padding:48px 20px`；图标 `font-size:40px` 且 `opacity:0.5`；`h3` 17px／600；`p` 13px。
- **旧版实测**：F1 `:250-252`／F2 `:270-271` `.empty{text-align:center;padding:24px;color:var(--sub);font-size:13px}` → **旧版差异（OLD-DEVIATION）**：部分达标（无卡片、无图标、无 `h3`／`p`）。
- **引用**：实现侧锚点用冻结的 `renderEmptyState` 与 `emptyState` 样式命名空间（§3），不复述。
- **级别**：A。
- **裁定**：已定（编排者 R35）——空态规格按 B1；旧版轻量空态属新版改进项。

### H-19 回到顶部按钮（**级别 B**）

- **规格值**：`scrollY > 400` 才出现；42px 圆形毛玻璃按钮，固定在 `bottom:24px;right:24px`；点击平滑回到顶部。
- **证据**：`benchmark-visual-spec.md:848`（§5 第 19 条）；原值 `benchmark-visual-spec.md:420`、`:886`。
- **可断言形式**：初始 `opacity:0;pointer-events:none`；滚动到 400px 以上后出现（类名切换）；尺寸 42×42px、`border-radius:50%`、`position:fixed` 且 `bottom/right = 24px`；点击触发平滑滚动到 0。
- **旧版实测**：F1／F2 `backTop` 命中 **0** → **旧版差异（OLD-DEVIATION）**：新增能力。
- **决策**：旧版没有该能力，是否强制要求 → §5 决策 **D-14**。
- **级别**：B（`#89` 票面点名）。
- **裁定**：已定（编排者 R35）——**强制**（D-14 推荐 a）。

### H-20 焦点可见 ＋ 动效可关（**级别 B**）

- **规格值**：每个可交互控件都有 `:focus-visible` 焦点环；`prefers-reduced-motion` 下关闭复制成功缩放与 toast 滑入动画。
- **证据**：`benchmark-visual-spec.md:849`（§5 第 20 条）；缺失事实 `benchmark-visual-spec.md:899`。
- **可断言形式**：最终 CSS 中 `:focus-visible` 命中 ≥1 且覆盖所有按钮／输入；`@media (prefers-reduced-motion: reduce)` 命中 ≥1 且其内禁用 `animation`／`transition`；键盘 Tab 遍历时可截图看到焦点环。
- **旧版实测**：F1／F2 `:focus-visible` 与 `prefers-reduced-motion` 命中均 **0**（F1 只有 `:active` 缩放 `:175`）→ **旧版差异（OLD-DEVIATION）**：新增能力。
- **级别**：B（`#89` 票面点名）。
- **裁定**：已定（编排者 R35）——**强制**（D-14 推荐 a，属无障碍刚需）。

### 2.1 覆盖自检（20/20，互不重复）

| 尺条 | §5 序号 | 尺条 | §5 序号 | 尺条 | §5 序号 | 尺条 | §5 序号 |
|---|---|---|---|---|---|---|---|
| H-01 | 1 | H-06 | 6 | H-11 | 11 | H-16 | 16 |
| H-02 | 2 | H-07 | 7 | H-12 | 12 | H-17 | 17 |
| H-03 | 3 | H-08 | 8 | H-13 | 13 | H-18 | 18 |
| H-04 | 4 | H-09 | 9 | H-14 | 14 | H-19 | 19 |
| H-05 | 5 | H-10 | 10 | H-15 | 15 | H-20 | 20 |

**20 条齐、编号一一对应、无重复**（`benchmark-visual-spec.md:819-849`）。

---

## 3. 与已冻结常量的关系（只引用，不复述）

本尺**不复制**下列常量的数值，只写「引用 X」。判定时以 `packages/base-render/src/spec/*.ts` 为唯一真相源；本尺与它不一致即本尺缺陷。

| 尺条 | 引用的冻结常量 | 冻结位置 |
|---|---|---|
| H-01 | `CSS_VAR_TOKENS['--blue']` | `packages/base-render/src/spec/style.ts:19` |
| H-01／H-10 | `STYLE_FORBIDDEN_TOKENS`（Q14 禁入） | `packages/base-render/src/spec/style.ts:46` |
| H-02／H-03／H-10 | `CSS_VAR_TOKENS`（11 个，含 `--fg/--fg2/--fg3/--bg/--card/--line/--shadow`） | `packages/base-render/src/spec/style.ts:12-24` |
| H-16／H-18／H-20 | `CONTROL_STYLE_SECTIONS`（8 个命名空间闭集，含 `toast`／`emptyState`／`copyButton`／`actionBar`／`helpShell`） | `packages/base-render/src/spec/style.ts:32-41` |
| H-16 | `TOAST_DEFAULTS`（时长／栈上限／`role`／`aria-live`） | `packages/base-render/src/spec/controls.ts:190-199` |
| H-16 | `COPY_TEXT_DEFAULTS`（成功／失败文案） | `packages/base-render/src/spec/controls.ts:74-82` |
| H-16 | `ACTION_BAR_DEFAULTS`（按钮最小高度／字号／字重／ghost 描边透明度） | `packages/base-render/src/spec/controls.ts:273-282` |
| H-16 | `ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`／`COPY_ACTION_IDS` | `packages/base-render/src/spec/controls.ts:97,158,112-115` |
| H-16 | `HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS`（三目标 ＋ 对外文案） | `packages/base-render/src/spec/help.ts:243-253` |
| H-18 | `renderEmptyState`／`STATUS_DEFAULT_TEXT`／`STATUS_KINDS` | `packages/base-render/src/spec/controls.ts:293-316` |
| H-17／H-14（内容页） | `CHART_KINDS`／`CHART_PALETTE`／`CHART_BREAKPOINTS`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE` | `packages/base-render/src/spec/charts.ts:8,227-246,222-225` |
| 全尺 | `STYLE_PREFIX`（类名前缀）／`STYLE_SHEET_ID` | `packages/base-render/src/style.ts:7`／`spec/style.ts:29` |
| 全尺 | 冻结面文档投影 | `docs/base-paint-contract.md:258-311`（§3.2）、`313-…`（§3.3）、`823-851`（§3.5.3） |

**契约留白（不是缺陷，是分工）**：`docs/base-paint-contract.md:303` 明写「控件**视觉规格**（逐区尺寸／色值／圆角／断点）本契约**不冻结也不排除**，owner 是 `#75`（其票面验收②『视觉与 B1 标杆一致』）」；`docs/base-paint-contract.md:847` 明写「HELP 壳产物结构（DOM 结构／类名／区块顺序）**不冻结也不排除**」。**本尺正是这两处留白的填充物**：视觉规格落 `docs/visual-spec-help.md`，区块锚点落 `docs/visual-spec-blocks.md`。

---

## 4. 与冻结常量的冲突清单（有／无）

**结论：有，共 6 处实质冲突 ＋ 3 处口径缺口。** 逐条给「B1 尺值 / 冻结值 / 旧版实测 / 处置建议」。

> **裁定（编排者 R35）**：**凡与冻结契约常量冲突处，一律以冻结契约为准**（契约由 `#92` 冻结，改动须走补遗）；下表「处置建议」栏即最终落法——差异逐条记账，交 `#75` 落地时以「**冻结常量 ＋ 局部 CSS 常量**」实现（局部常量**不得**新增 token 名）。

| # | 冲突 | B1 尺值 | 冻结值 | 旧版实测 | 处置建议 |
|---|---|---|---|---|---|
| **C-1** | 主色 | `#007aff`（`benchmark:821`） | `CSS_VAR_TOKENS['--blue']` = `#007aff` | F1／F2 `#0071e3` | **无冲突**（B1＝冻结）；旧版须改 |
| **C-2** | 灰阶与边框 | `#1d1d1d`／`#3c3c43`／`#8e8e93` ＋ alpha 边框（`benchmark:822,39-43`） | `--fg/--fg2/--fg3` 另一组值 ＋ 实色 `--line` | F1／F2 第三组值 ＋ 实色 `--border` | **冲突**：以冻结 token 为准，H-02 改为「引用 token」而非 hex（决策 **D-2**） |
| **C-3** | 页底色 | `#fafafa`（`benchmark:823`） | `CSS_VAR_TOKENS['--bg']` | F1／F2 `#f5f6f7` | **冲突**：以冻结 `--bg` 为准（决策 **D-3**） |
| **C-4** | 阴影 | resting ＋ elevated 两条（`benchmark:836,254-258`） | 单条 `--shadow` | F1／F2 单条 `0 1px 2px rgba(0,0,0,.04)` | **冲突**：以冻结单条为准；若确需两级，须由 `#75` 显式裁定（决策 **D-4**） |
| **C-5** | 圆角 | `{8,14,20,999,50%}`（`benchmark:836,238-248`） | **零圆角 token**（且禁 `--r-xl`／`--pink`） | F1 出现 3/4/5/6/8/14/999px | **缺口**：圆角集需在 `#75` 落地为 CSS 常量（非 token，不得新增 token 名）（决策 **D-5**） |
| **C-6** | toast 时长 | 1800ms（`benchmark:845,696`） | `TOAST_DEFAULTS.timeoutMs` = 4500 | F2 `:409` = 4500ms | **冲突**：建议取 4500ms（冻结 ＋ 旧版实测双证），改 H-16（决策 **D-7**） |
| **C-7** | 断点组 | 640／400（`benchmark:838`） | 图表 `mobileMaxPx: 720`；toast 栈 `mobileMaxPx: 820` | F1／F2 = 600／601–900 | **口径缺口**：三套数值各有语义，需登记为「并存且各管一层」（决策 **D-6**） |
| **C-8** | 复制语义 | 「每行一个 ＋ 底部一个『复制全部』」（`benchmark:845`） | `HELP_COPY_TARGETS` = 指令／唤醒词／参数；文案「复制指令」 | F1／F2 无「复制全部」（F1 `:487`） | **冲突**：HELP 页以冻结三目标为准；「复制全部」若保留须改口径（决策 **D-8**） |
| **C-9** | 禁紫禁粉 vs 图表色板 | H-01 要求全站无 `#af52de`／`#ff375f`（`benchmark:821`） | `CHART_PALETTE` 含紫／粉等 10 色 | — | **冲突**：须澄清「禁色只约束 UI 主色，数据可视化色板例外」（决策 **D-10**） |

> 说明：C-1 不是冲突，列出是为了让读者看到「主色这一条已经对齐」——本尺与冻结常量**在最重要的那一条上一致**。

---

## 5. 拍板条目与裁定（逐条：问题／选项／推荐／裁定）

> 纪律：凡「证据不足」或属「审美选择」而非「旧版实测」的，先列清单再裁定；**裁定后取值不再改动**（除维护者另行纠正）。裁定来源：**编排者 R35**（2026-09-09）。

| # | 问题 | 选项 | 推荐 | 裁定（R35） |
|---|---|---|---|---|
| **D-1** | 20 条是否就取 §5 的第 1–20 条？ | (a) 取 §5 原 20 条（1:1）；(b) 重排／合并 | **(a)**：`#89` 票面已按「第 12／16／19／20 条」点名，重排会打断引用 | **已定**：取原序（H-01…H-20 与 §5 第 1–20 条 1:1） |
| **D-2** | 灰阶与边框取 B1 还是冻结 token？ | (a) 冻结 token（三灰＋实色 `--line`）；(b) B1 三灰＋alpha 边框 | **(a)**：`#75` 的唯一真相源是冻结 token 表；B1 的 alpha 边框作为**可选增强**登记 | **已定**：以冻结契约为准（取 a） |
| **D-3** | 页底色取 `#fafafa` 还是冻结 `--bg`？ | (a) 冻结 `--bg`；(b) B1 `#fafafa` | **(a)**：避免第二份 token | **已定**：取冻结 `--bg` |
| **D-4** | 阴影单级还是两级？ | (a) 冻结单条；(b) 追加第二级（须新增 token 或走 `extraCss`） | **(a)**：B1 的 elevated 层在 HELP 页用途有限 | **已定**：取冻结单条 |
| **D-5** | 圆角集怎么落？ | (a) 写成 CSS 常量（非 token）；(b) 新增 token 名；(c) 不收（每处自定） | **(a)**：不得新增 token 名（`docs/base-paint-contract.md:299`），但必须收敛到 `{8,14,20,999,50%}` | **已定**：CSS 常量，**不新增 token 名** |
| **D-6** | 断点组统一到哪一套？ | (a) 页面 640／400（B1），图表 720，toast 栈 820，**三者并存各管一层**；(b) 全站统一 640／400；(c) 采用旧 HELP 的 600／900 | **(a)**：三者语义不同（页面栅格／图表自适应／toast 栈），硬统一会破坏图表与 toast 既有冻结值 | **已定**：三层并存（取 a） |
| **D-7** | toast 时长 1800 还是 4500？ | (a) 4500（冻结＋旧版实测）；(b) 1800（B1） | **(a)** | **已定**：4500ms |
| **D-8** | HELP 页是否要有「复制全部」胶囊？ | (a) 不要，按冻结三目标（指令／唤醒词／参数）；(b) 要，且与三目标并存 | **(a)**：旧版已删（F1 `:487`），冻结三目标已覆盖「一键拿到最常用文本」 | **已定**：不保留（取 a） |
| **D-9** | HELP 页是否必须有 ≥48px 大数字？ | (a) 不要求，HELP 页 h1 走 28–32px，48px＋ 归内容页 KPI；(b) 要求 | **(a)**：旧版 HELP 最大字号 28.6px，速查台没有「大数字」语义 | **已定**：不要求（取 a） |
| **D-10** | 禁紫禁粉是否约束图表色板？ | (a) 只约束 UI 主色，数据可视化色板例外；(b) 全站禁 | **(a)**：`CHART_PALETTE` 已冻结 10 色，全站禁会与冻结常量直接冲突 | **已定**：数据可视化色板例外（取 a） |
| **D-11** | 内容页「12 个区块」的确切清单？ | (a) 采用 `docs/visual-spec-blocks.md` 拟定的 12 个；(b) `#104` 另定 | **(a)**：拟定清单每条都有证据出处，`#104` 可改名但需保留锚点语义 | **移交 `#104`**：本尺清单**暂定**，最终以 `#104` 为准（接口 owner） |
| **D-12** | 标题 emoji 是否一律去除？ | (a) 去除，图标改放 eyebrow／icon 槽；(b) 保留 | **(a)**：`benchmark:831,968` 明确；旧版 F1 `:302` 属旧版差异 | **已定**：去 emoji（取 a） |
| **D-13** | 等宽栈是否保留 `Consolas` 兜底？ | (a) 逐字取 `"SF Mono",monospace`；(b) 加 `Consolas` 兜底 | **(a)**：规格逐字要求；兜底属实现细节，不进尺 | **已定**：不留 `Consolas`（取 a） |
| **D-14** | 旧版没有的 `#backTop`／`:focus-visible`／`prefers-reduced-motion` 是否强制？ | (a) 强制（属 B1 契约项，且是无障碍刚需）；(b) 列为可选增强 | **(a)**：`:focus-visible` 与 `prefers-reduced-motion` 属无障碍，不应降级为可选 | **已定**：三项**强制**（取 a） |
| **D-15** | H-13／H-14（KPI／进度环）在 HELP 页的适用范围？ | (a) HELP 页判 N/A，转内容页区块尺；(b) 要求 HELP 页也具备 | **(a)**：旧版 HELP 无此二物，速查台形态不需要 | **已定**：HELP 页 N/A，转内容页（取 a） |

> 结论：**D-1…D-15 全部落定**（仅 D-11 移交 `#104` 终审清单本身）。

---

## 6. 可验收性自证（脚本 ＋ 实测输出）

**脚本**：`.scratch/t105/check-rulers.mjs`（只读；零写入、零网络、零第三方依赖；Node 直接跑）
**跑法**：`node .scratch/t105/check-rulers.mjs`（证据模式，恒 exit 0）／`--strict`（门禁模式：出现 `DEFECT` 即 exit 1）
**输出口径（R35 第 3 条）**：四类 —— `PASS`／**`OLD-DEVIATION`（旧版差异，不写 `FAIL`）**／`N/A`／`BLOCKED`；另留 `DEFECT` 一档专表「尺子与冻结常量冲突」（应为 0）。

脚本在**冻结产物**上实测：`fixtures/help-instances/*.html`（F1／F2）＋ `packages/base-render/src/spec/*.ts`（冻结常量，正则只读）。

### 6.1 实测结果（本轮真实输出）

```
小计：可判 43 条（PASS 25 / OLD-DEVIATION 18 / DEFECT 0）；N/A 2 条；需落地后判 2 条；表内合计 47 行
```

（18 条 `OLD-DEVIATION` 全部是**旧版实例**上的实测差异＝「旧版未达 B1 标准」＝新版改进项；25 条 `PASS` 含冻结常量锚点与旧版已合规项；`DEFECT 0` ＝尺子与冻结常量**零冲突**。）

节选（完整表见脚本 stdout）：

| 尺条 | 判什么 | 规格值 | 实测值 | 判定 |
|---|---|---|---|---|
| H-01 | 冻结主色 `--blue` | `#007aff` | `#007aff` | PASS |
| H-01 | 旧版实例主色 | `#007aff` | F1／F2 = `#0071e3` | OLD-DEVIATION |
| H-04 | 旧版实例渐变命中 | 0 | F1=1／F2=1 | OLD-DEVIATION |
| H-05 | 旧版实例最大字号 | ≥48px | 28.6px | OLD-DEVIATION |
| H-06 | 旧版实例字体栈含 `"SF Pro Display"` | 须含 | 缺 | OLD-DEVIATION |
| H-07 | 旧版实例 tnum 命中 | >0 | 0 处 | OLD-DEVIATION |
| H-08 | 旧版实例 `<h1>` 含 emoji | 0 | F1／F2 均含 | OLD-DEVIATION |
| H-09 | 旧版实例容器内距 | `32px 20px 80px` | `0 12px 40px` | OLD-DEVIATION |
| H-12 | 旧版实例断点 | 640／400 | 600／601–900 | OLD-DEVIATION |
| H-16 | 旧版实例 toast 时长 | 1800ms（B1） | 4500ms | OLD-DEVIATION（＝冻结值，见 C-6） |
| H-16 | 旧版实例「复制全部」 | ≥1 | 0 | OLD-DEVIATION |
| H-16 | 旧版实例 450ms 弹簧动画 | 逐字 | 逐字命中 | PASS |
| H-17 | 旧版实例表格 | ≥1 | 0 | OLD-DEVIATION |
| H-18 | 旧版实例空态 | 卡片＋48px | `padding:24px` | OLD-DEVIATION |
| H-19 | 旧版实例 `#backTop` | ≥1 | 0 | OLD-DEVIATION |
| H-20 | 旧版实例焦点／动效可关 | ≥1 | 0 | OLD-DEVIATION |
| H-10 | 旧版实例圆角集合 | `{8,14,20,999,50%}` | 含 3/4/5/6px | OLD-DEVIATION |
| H-13 | HELP 页 KPI 卡 | — | `.kpi` 命中 0 | N/A（转区块尺 B-02） |
| H-14 | HELP 页进度环 | — | 无环 | N/A（转区块尺 B-04） |

### 6.2 怎么读这张表

- **`OLD-DEVIATION` 不等于尺子错**（R35 第 3 条）：对 F1／F2 测的是**迁移前基线**，「旧版不同」＝「旧版未达 B1 标准」＝**新版改进项**——这恰好证明尺子**能判、判得出差异**（不是空话）。
- **`DEFECT` 才是真问题**：它表示「尺子与冻结常量冲突」，本轮为 **0**；一旦出现，按 R35 第 2 条**以冻结契约为准**并修尺子。
- **PASS 也不是「已实现」**：PASS 只说明该条在**冻结常量**上已就位（如主色、`role`／`aria-live`），或旧版恰好已达标（如 450ms 动画、卡面纯白）。
- **BLOCKED 2 条**：圆角 token 缺位、以及「渲染后 computed 值」类判据——需 `#75` 产出 CSS／`#88` 产出页面后判。
- **判不了的部分已显式标注**：见脚本 `verdict = BLOCKED`／`N/A` 两栏，不存在「假装判过」。

---

## 7. 已知限制

1. **本尺不含「截图级」像素比对**：`#89` 的 89b 收尾验收要出截图与交互记录；本尺给的是**可断言形式**，不是图片基线。
2. **E3（B1 标杆）的原始文件不在本仓**：`benchmark-visual-spec.md` 是从旧树只读抽取的规格报告，其行号引用可追溯，但无法在本仓重新渲染比对。
3. **F1／F2 是「旧版 HELP」，不是「B1 标杆」**：两者 token 体系不同（详见 §4），本尺已按「目标值／旧版实测」两栏分列，不做混用。
4. **20 条里 4 条（H-12／H-16／H-19／H-20）是交互／时序**，静态 CSS 断言不足，必须由 `#89b` 的交互记录补足（`#89` 票面已明写）。
5. **冲突已裁定，取值不再变**：§4 的 C-2／C-3／C-4／C-6／C-8 等冲突已按 R35 第 2 条**以冻结契约为准**落定；`#75` 可直接据本尺实现（冻结常量 ＋ 局部 CSS 常量），不需再等拍板。
