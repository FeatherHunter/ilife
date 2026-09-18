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

注意：`blocks` 整组只走子路径 `base-paint/blocks`，根出口没有它；以下除注明外均走 `base-paint` 根。

### 区块组装（`base-paint/blocks`）——新页面只许 blocks 组装

| 函数 | 一句话 |
|---|---|
| `renderPageShell` | 页面容器与标题区，每页外层 |
| `renderTocBlock` | 目录区块 |
| `renderCaliberLine` | 口径说明行（一行小字） |
| `renderConclusionBar` | 结论条（一句话总结） |
| `renderMiniBar` | 细进度条 |
| `renderDistributionRows` | 分布行（名＋条＋值，窄槽语义见包内测试） |
| `renderChips` | 标签片组 |
| `renderChangeRows` | 变化行（涨跌对照） |
| `renderKpiCard`／`renderKpiGrid` | 指标卡／指标卡宫格 |
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
- 示例：`test/charts.test.mjs`；源：`src/charts.ts`；种定义：`src/spec/charts.ts`。

### 页面级（根）——整页怎么摆，不参与区块组合

- 形状件（`src/pageShapes.ts`）：`renderFactStrip` 事实条；`renderMediaFigure`／`renderMediaPlaceholder` 图片与媒体占位；`renderTimelineRows` 时间轴行；`pageShapeCss` 形状样式；`MEDIA_RATIOS` 比例表。
- 移动端配方（`src/pageUi.ts`）：`pageUiCss` 断点／触摸区／安全区样式；`PAGE_UI_CLASS`／`PAGE_UI_VIEWPORT` 挂载常量。是否启用由整页装配决定，不启用则产出逐字节不变。

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

### 错误类口径

`RenderError` 根有导出；其余 `*Error`（`TemplateError`／`ControlsError`／`TextError`／`ChartError`／`BlocksError`／`HelpSchemaError`）不在根导出——冻结面无条目，调用方按 `name`／`code` 判定。

### 正身与测试索引

- 冻结签名正身：`src/spec/`（7 件）↔ `../../docs/base-paint-contract.md`，由 `test/contract-signatures.test.mjs` 逐字锁死。
- 分组示例：`test/render.test.mjs`、`test/template.test.mjs`、`test/style.test.mjs`、`test/text.test.mjs`、`test/help.test.mjs`、`test/help-shell-136.test.mjs`（字节锁）、`test/ui-fix-154.test.mjs`。
