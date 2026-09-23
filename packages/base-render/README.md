# base-paint help模板铁律

1. 新页面只许 blocks 组装，禁新巨串：HTML/CSS/JS 大字面量不得进 `src`（走子路径 `base-paint/blocks` 组合或本 help模板管线）。
2. 改模板只改源：`assets/help-template.html`（唯一真相源；3 槽注释 ＋ 前缀 `__HELP_TITLE__` 占位即契约；行尾 CRLF 禁转 LF）。**还原／变异回写这一件时**：它被 `.gitattributes` 钉了 `text eol=crlf`（库内存 LF、检出 CRLF），故**不要**拿 `git show HEAD:<路径>` 的原文直接写回（那是 LF，会让 `gen-help-shell.cjs` 的 CRLF 断言当场抛错）；用工作树原文读进写出（`readFileSync` → `writeFileSync`）即逐字节安全。
3. 改后跑 gen：一键 `pnpm --filter base-paint gen:help-shell`（重写 `src/helpShell.ts`＋测试哈希；字节锁随 `pnpm test` 在 CI 验 drift，`gen:help-shell:check` 本地同口径）。
4. 过门：字节锁（`test/help-shell-136.test.mjs` 哈希）＋像素门（skill-calorie `help-shell-134` 双端/覆盖序）＋ `tsc -b` 全绿。
5. 手改生成物（`src/helpShell.ts`／测试哈希）必红：`--check` 非 0＋字节锁红。
6. 源不进包：`files` 仅 `dist`（省约 105KB；追溯靠仓库＋哈希锁），包内只留 `dist/helpShell.js`。

---

## 组件目录（发现口）

**包名说明**：目录叫 `packages/base-render`，npm 包名叫 `base-paint`——是同一个包，下文均用包名，引用时照抄即可。

本节回答“该调谁”。help 铁律见上，一字未动。机读正身在 `src/spec/`（冻结签名）＋契约正本 `../../docs/base-paint-contract.md`；行为示例看 `test/`。

### 速查三问

| 我要画 | 调谁 | 从哪引 |
|---|---|---|
| 分布条 | `renderDistributionRows` | `base-paint/blocks`（子路径） |
| 徽章 | `renderStatusBadge`（空态／失败回执另有 `renderEmptyState`／`renderErrorReceipt`） | `base-paint` 根 |
| 环图 | `charts`（`donut` 种）＋ `chartsCss` 取样式 ＋ `buildChartsHelpersJs` 取脚本 | `base-paint` 根 |
| N 天里「**哪几天**有记录」 | `renderDayStrip`（时间格带；缺数一格一槽，不补零） | `base-paint` 根 |
| 页内导航（**看得出能点**） | `renderSegmentedNav`（分段导航；与状态胶囊形状分得开） | `base-paint` 根 |
| 一行元信息小签 | `renderChipRow`（胶囊行；**成组出现别用裸 `renderChips`**，见「旧 → 新」表）——住在区块层，根出口转出**同一实现** | `base-paint` 根 或 `base-paint/blocks`（同一个函数） |
| 加减关系（A ＋ B ＝ C） | `renderEquationBar`（等式条；「摄入＋缺口＝消耗」这类） | `base-paint` 根 |
| 「这句话在什么前提下成立」 | `renderStateBanner`（态声明条；如「目标暂停中」） | `base-paint` 根 |

注意：`blocks` 整组只走子路径 `base-paint/blocks`，根出口没有它；以下除注明外均走 `base-paint` 根。
**一处例外**：`renderChipRow` 的实现住在区块层，根出口把它**原样转出**（两条路径拿到的是**同一个函数**）。
#950 收口时把当时另立在根上的第二件并回了区块层（两件同名、同容器类、入参却不兼容，样式还被两层各定义一次），
公共面上此后只有一个 `renderChipRow`——**别再按名字新建第二件**。

### 区块组装（`base-paint/blocks`）——新页面只许 blocks 组装

| 函数 | 一句话 |
|---|---|
| `renderPageShell` | 页面容器与标题区，每页外层 |
| `renderTocBlock` | 目录区块 |
| `renderCaliberLine` | 口径说明行（一行小字） |
| `renderConclusionBar` | 结论条（一句话总结）。**#950 扩参**：入参支持 **串**（原样，旧调用点逐字节不变）｜**对象** `{ text, tone?: 'ok'\|'warn'\|'danger'\|'info', badge?: string }`——`tone` 只改左侧强调条底色，`badge` 是「前提」短词（如「目标暂停中」）。左侧 3px 强调条已改由 `::before` 承载（原来 `border-left` 撞圆角会被裁成月牙） |
| `renderMiniBar` | 细进度条 |
| `renderDistributionRows` | 分布行（名＋条＋值，窄槽语义见包内测试） |
| `renderChips`／`renderChipRow` | 标签片组与**胶囊行**。`renderChips` 是**裸片**（逐项一枚 `<span>`、**没有容器**；落进 ≥1001px 页壳网格会被逐枚提升成整行——用户截图那三根长条就是它）；成组出现用 `renderChipRow({ items, tailHtml?, role?, extraClass? })`——**带容器**，`role='list'` 出 `list`＋逐枚 `listitem`（**缺省零 aria 属性**，既有 8 处调用点因此逐字节不变）。**#950 扩参**：`items[i].tone` 语气四档（`CHIP_TONES`：`neutral`／`ok`／`warn`／`danger`）——**给了才出语气类**，不给与改前逐字节相同 |
| `renderChangeRows` | 变化行（涨跌对照） |
| `renderKpiCard`／`renderKpiGrid` | 指标卡／指标卡宫格。**#950 扩参**：`value` **可缺省**（＝**判定卡**：这一格的答案是一句话而不是数字，判定词住 `status`＋`statusText`、说明住 `detail`）；`gap: { value, unit? }` 出一枚「还差 N」徽章；`pending: true` 出「未记录」态（值位 `—`、进度条归零、徽章出词）。**同槽互斥**：`gap`×`status`、`pending`×`value` 各自给会点名拒 |
| `renderDataTable` | 数据表 |
| `renderChartBlock` | 图表容器块（承 `charts` 的产出） |
| `renderListRows` | 列表行 |
| `renderPreBlock` | 预排文本块（命令／CLI 展示） |
| `renderDetailSection` | 详情分区 |
| `renderDisclosure` | 折叠展开区 |
| `renderParamForm` | 参数表单 |
| `renderEmptyBlock` | 空态块 |
| `renderCopyBlock` | 可复制文本块 |
| `renderFeedbackBlock` | 反馈块 |
| `blocksCss` | 区块样式唯一产出者（配 `BLOCK_STYLE_SECTIONS` 分段表） |

示例：`test/blocks.test.mjs`；源：`src/blocks.ts`。

### 控件（根）——原子交互与状态

| 函数 | 一句话 |
|---|---|
| `renderToast`／`createToastController` | 轻提示与它的控制器（含堆叠语义） |
| `copyText`／`createCopyRuntime`／`bindCopyAction` | 复制三件套（双通道＋提示反馈，唯一实现） |
| `buildSharedHelpersJs` | 共享脚本唯一产出者（`SHARED-HELPERS` 槽填充物） |
| `renderActionBar` | 操作条 |
| `renderStatusBadge` | 状态徽标（`ok`／`warn`／`danger`／`empty`） |
| `renderEmptyState` | 空态 |
| `renderErrorReceipt` | 失败回执 |
| `TOAST_ICON_GLYPHS` | 提示图标表 |

示例：`test/controls.test.mjs`、`test/copy-*.test.mjs`；源：`src/controls.ts`。

### 图表（根）——8 种纯字符串产出

- `charts`：统一入口，`bar`／`line`／`donut`／`progress`／`combo`／`sparkline`／`gauge`／`scatter`（CSS＋SVG 字符串，无 canvas）。
- `buildChartsHelpersJs`：图表脚本唯一产出者；`chartsCss`：图表样式。
- **点数闸（#950）**：`options.minPoints` ＋ `options.minPointsHint`——有效点少于闸值就不画「一条只有一个点的线」，
  改走既有空态（`CHART_EMPTY_RULE = emptyState`，正文取 `options.emptyText`、小字取 `minPointsHint`）。
  **折线／柱／迷你线／散点／组合五支吃它**（组合取两支里多的那一支）；`donut`／`progress`／`gauge` 是单值或占比，语义上不吃。
  **缺省不启用**（＝旧行为逐字节不变）——要用就显式给，如 `charts.line({ items, options: { minPoints: 2 } })`；
  非法值抛 `structure-invalid`。
- 示例：`test/charts.test.mjs`、`test/chart-gate-column-950.test.mjs`；源：`src/charts.ts`；种定义：`src/spec/charts.ts`。

### 页面级（根）——整页怎么摆，不参与区块组合

- 形状件（`src/pageShapes.ts`）：`renderFactStrip` 事实条；`renderMediaFigure`／`renderMediaPlaceholder` 图片与媒体占位；`renderTimelineRows` 时间轴行；`pageShapeCss` 形状样式；`MEDIA_RATIOS` 比例表。
  **#950 事实条扩参**：`value` 可给 `null`（缺数 → 印 `FACT_STRIP_MISSING_MARK`（`—`）＋ 降调类，与「0」在产物上分得开）＋ `unit` 单位位（值位只吃数，单位小一号跟在后面）。
- **导航族（#950，`src/pageNav.ts`）**：
  - `renderSegmentedNav({ items, current?, sticky?, ariaLabel? })`——等宽分格 ＋ 选中实底 ＋ 图标位（`SEG_NAV_ICONS` 八枚内联 SVG，无外链）＋ `aria-current="page"` ＋ 44px 命中区；**做「动作」的形**，与状态胶囊分得开。
  - **胶囊行不在这族**：`renderChipRow` 住在区块层（`blocks.ts`，见上表），根出口只**转出同一实现**——同一个容器类不许被两层各定义一次样式（那样页面层会盖掉区块层）。
- **横条族（#950，`src/pageBars.ts`）**：
  - `renderDayStrip({ days, emptyMark?, caption?, density?, extraClass? })`——一格一天：`value: null` ＝ 缺数（印占位、圆点转灰）、`today: true` 高亮；`caption` 是带下事实条（`tone`：`plain`／`ok`／`warn`／`danger`，`ok` 出胶囊形）。
  - `renderEquationBar({ segments, total, heading?, endLabels?, extraClass? })`——两段轨道按 `value/total` 铺满（越界夹到 0–100，不抛错），`heading` 出顶部「左标右值」，`endLabels` 补一枚合计格。
  - `renderStateBanner({ tone, badge, text?, action?, extraClass? })`——**态**（前提）与**结论**分住：`tone` 闭集 `STATE_TONES`（`info`／`warn`／`danger`）＋ 徽标 ＋ 可选动作位（只出 `data-action-id`，交互归页面运行时）。
  - 两族样式由 `pageShapeCss()` **汇总**进页（调用方不必另接 `pageNavCss`／`pageBarsCss`）；胶囊行与语气色的样式随 `blocksCss()` 进页（住在区块层）。
- 移动端配方（`src/pageUi.ts`）：`pageUiCss` 断点／触摸区／安全区样式；`PAGE_UI_CLASS`／`PAGE_UI_VIEWPORT` 挂载常量。是否启用由整页装配决定，不启用则产出逐字节不变。
  **#950 扩参**：`pageUiCss({ column })` 四档正文列宽——`centered`（**缺省＝改前行为**：880 居中 ＋ 满铺白名单）／`wide`（1120 居中）／`full`（不收窄，正文满铺 1280）／`locked`（880 居中且**满铺白名单失效**，所有子件收进正文列）；
  常量 `PAGE_COLUMNS`／`PAGE_COLUMN_WIDTH_PX`（`{ centered: 880, wide: 1120 }`）。**页面侧别再自写列宽垫片**：`locked`／`full` 两档就是替它们准备的。
  另加 **C2 守卫**：≥1001px 页壳网格里行内级子件（`span`／`a`／`b`／…）不拉伸——忘了包 `renderChipRow` 时不再塌成整宽长条。

### 管线与契约（根）

| 函数 | 一句话 |
|---|---|
| `fillTemplate` | 占位符填充器（模板＋数据组装，失败抛错不返空页） |
| `buildStyleSheet`／`cx`／`token` | 样式表唯一产出者与类名工具（`STYLE_TOKENS` 11 个 token 唯一真相源） |
| `buildDataText`／`buildLogText` | 复制文本序列化（`text`／`json`／`csv` 三格式） |
| `renderPage`／`renderReco` | 页面与推荐渲染；`escapeHtml` 转义；`RenderError` |
| `mountInjector`／`openPage` | 多页挂载与开页 |
| `createPageRegistry`／`pageOrReco`／`recoDescriptor` | 页面注册与推荐描述 |
| `BODY_FONT_STACK` | 正文字体栈 |
| `renderHelpShell` | 数据页分型 help 模板渲染 |

### 旧 → 新（同一件事的两种写法，迁移口）

| 你可能正想写 | 别那样写 | 这样写（#950） |
|---|---|---|
| 三枚状态胶囊 | 裸 `<span class="ilife-block-chip">`（宽屏被网格拉成整行；见 `renderChips` 那行） | `renderChipRow({ items: [{ text, tone }] })`（`base-paint` 根与 `base-paint/blocks` 是同一个函数） |
| 页内跳转那一排 | 胶囊式目录（与状态胶囊同形，读者看不出能点） | `renderSegmentedNav({ items, current })` |
| 「有记录 1/7 天」一句话 | 只说数量，说不出**哪几天** | `renderDayStrip({ days, caption })`（缺数一格一槽） |
| 「摄入 860＋缺口 2012＝消耗 2872」写成句 | 句长随要素增长（实测 33 字把卡撑到同排最高） | `renderEquationBar({ segments, total, heading })` |
| 结论句前缀「目标暂停中，……」 | **态**被写成结论的一部分 | `renderStateBanner({ tone, badge, text })`，或 `renderConclusionBar({ text, tone, badge })` |
| 读数卡里塞「还差 N」进 `detail` | 说明行与判定混住 | `renderKpiCard({ ..., gap: { value, unit } })`；没值位的判定卡直接**不给 `value`** |
| 页面里自己写列宽／锁单列 CSS 垫片 | 每个包各写一份（公共层缺参数才会这样） | `pageUiCss({ column: 'wide' \| 'full' \| 'locked' })` |
| 1 个点也照画折线 | 出「一条只有一个点的线」，读起来像坏了 | `charts.line({ items, options: { minPoints: 2 } })` |

**资产接线（写给整页装配的实现者）**：页面级两族的样式由 `pageShapeCss()` 汇总进页——
你只要在整页 `sharedCss` 里已经拼了 `pageUiCss() + pageShapeCss()`（六个技能包现在都是这么拼的），
新件就自动带上样式，**不需要**另接 `pageNavCss`／`pageBarsCss`。

### 错误类口径

`RenderError` 根有导出；其余 `*Error`（`TemplateError`／`ControlsError`／`TextError`／`ChartError`／`BlocksError`／`HelpSchemaError`）不在根导出——冻结面无条目，调用方按 `name`／`code` 判定。

### 正身与测试索引

- 冻结签名正身：`src/spec/`（7 件）↔ `../../docs/base-paint-contract.md`，由 `test/contract-signatures.test.mjs` 逐字锁死。
- 分组示例：`test/render.test.mjs`、`test/template.test.mjs`、`test/style.test.mjs`、`test/text.test.mjs`、`test/help.test.mjs`、`test/help-shell-136.test.mjs`（字节锁）、`test/ui-fix-154.test.mjs`。
