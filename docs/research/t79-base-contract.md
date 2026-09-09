# #79（79b）· base- 组件契约重写与三包统一版本 —— 交付报告

> 实施席：认领 `gh issue edit 79 --add-assignee @me` 于 **2026-09-09T23:45:42+08:00**（issue 79 OPEN，assignee=FeatherHunter）。
> 口径：本报告只做三件事——**① v1.30 签名 × 实现实况逐条对照**、**② 三包版本统一**、**③ CI 断言**。
> 发现实现与签名不符时**只登记不改码**（硬约束 3）；渲染输出必须逐字节不变（硬约束 2）。

## 0. 一句话结论

- **①** 冻结契约 `docs/base-paint-contract.md` §3 的 **130 条签名面**逐条实测：**有 130 / 部分 0 / 无 0**（表 B，100% 有结论）；v1.30 **26 项能力**逐条实测：**有 12 / 部分 6 / 无 8**（表 A，100% 有结论）。
- **②** 三包统一到 **0.2.0**（`base-link-core` 0.1.0→0.2.0、`base-combos` 0.1.0→0.2.0、`base-paint` 0.2.0 不动），机制落 `.changeset/config.json` 的 `fixed` 组。
- **③** CI 断言落 `packages/base-render/test/base-version-lockstep.test.mjs`（`pnpm test` glob 内，5 用例全绿）。
- **渲染输出不变**：`snapshot:check` changed=0（快照 `0.1.0@932e7b250d278d50` 前后同值）、`snapshot:html:check` **185 件 changed=0**、`calorie.help.center` file 态产物 sha256 前后同为 `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2`（1,264,822 B）。

## 1. 口径与判据（先定口径，再摆事实）

**证据符号**：`✓` 实测成立；`✗` 实测缺失；`file:line` 为**声明点**（源码里真定义该符号的那一行）；「测试引用」＝ `packages/base-render/test/**` ＋ `test-d/**` 内出现该名字的文件数／次数（`docs/research/t79-surface-probe.mjs` 机读统计）。

**表 B 的结论规则（冻结面 130 条）**：`有` ＝ 声明点 ＋ 包出口面（runtime 走 `dist/index.js` 实测导出；type 走 TS 编译器 API 解析 `dist/index.d.ts` 模块导出，含 `export * from` 再导出）＋ ≥1 处测试引用，三者齐备；缺其一 → `部分`；声明点或出口面缺失 → `无`。

**表 A 的结论规则（v1.30 26 项能力，与契约 §2 的「新判定」列口径不同）**：本票按**实现实况**判——`有` ＝ 新落点符号在出口面且被测试锁住（允许改名／换签名）；`部分` ＝ 新落点只覆盖旧能力子集或带偏离；`无` ＝ 无对应实现（含显式不移植）。契约 §4.4 已定：「#79 验收的『v1.30 签名 × 实现实况』对照表以**实现实况**为准——两者口径不同、不互为矛盾」。**本报告不修改契约 §2 的任何判定**。

**v1.30 对应列口径**：按「票＋名字语义」把每条冻结签名映射回旧能力锚点；新架构**发明**的机制（正文槽／载荷槽／容器／包裹约定、helpers 产出者归一、actionId 发现机制）标注「无（新架构发明）」并给出票号——不假装它们有 v1.30 前身。

## 2. 表 A · v1.30 能力 26 项 × 实现实况（逐条有结论）

| # | 节号 | 能力（v1.30） | 旧侧符号命中（扫描面） | 新落点（出口面／测试引用） | 结论 | 说明 |
|---|---|---|---|---|---|---|
| 1 | §3 | 占位符标准与填充机制 | 11（`packages/**`） | ✓ `fillTemplate`（49 处测试）；✓ `TEMPLATE_MARKERS`（22 处测试）；✓ `INJECTION_ORDER`（10 处测试） | **有** | 能力已实现且被测试锁住 |
| 2 | §3 | NO-SHARED 豁免 + CHARTS-HELPERS | 56（`packages/**`） | ✓ `MARKER_RULES`（24 处测试）；✓ `TEMPLATE_MARKERS`（22 处测试） | **有** | 能力已实现且被测试锁住 |
| 3 | §4 | payload 信封 + 结构校验 | 2（`packages/**`） | ✓ `createEnvelope`（13 处测试）；✓ `parseEnvelope`（8 处测试）；✓ `assertShapeData`（**零测试**）；✓ `Envelope`（3 处测试） | **有** | 能力已实现且被测试锁住；⚠ `assertShapeData` 零测试引用（缺口 G-4） |
| 4 | §5 | P0 守卫组 esc/arr/val/yes/validate | 189（`packages/**`） | ✓ `escapeHtml`（21 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 5 | §5.1 | toast 通用提示控件 | 36（`packages/**`） | ✓ `renderToast`（45 处测试）；✓ `createToastController`（12 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 6 | §6.1 | snapshot 结构化接口 | 204（`packages/**`） | ✓ `buildDataText`（107 处测试）；✓ `buildLogText`（35 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 7 | §6.2 | 复制按钮三件套 actionBar | 0（`packages/**`） | ✓ `renderActionBar`（25 处测试） | **有** | 能力已实现且被测试锁住 |
| 8 | §6.2 §6.8 | copyText（含反馈钩子） | 64（`packages/**`） | ✓ `copyText`（65 处测试） | **有** | 能力已实现且被测试锁住 |
| 9 | §6.3 | formPrompt | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 10 | §6.3 §6.7 | selectList（含行内 widget） | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 11 | §6.3 | confirm | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 12 | §6.3 | foldBox | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 13 | §6.3 | statusBadge／emptyState／errorReceipt | 22（`packages/**`） | ✓ `renderStatusBadge`（14 处测试）；✓ `renderEmptyState`（21 处测试）；✓ `renderErrorReceipt`（20 处测试） | **有** | 能力已实现且被测试锁住 |
| 14 | §6.3 §6.9 | smartSelect | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 15 | §6.4 | token A 组 + 控件样式 | 16（`packages/**`） | ✓ `CSS_VAR_TOKENS`（23 处测试）；✓ `buildStyleSheet`（61 处测试） | **有** | 能力已实现且被测试锁住 |
| 16 | §6.5 | 图表组件 charts.* 8 接口 | 275（`packages/**`） | ✓ `charts`（612 处测试）；✓ `ChartsApi`（4 处测试） | **有** | 能力已实现且被测试锁住 |
| 17 | §6.6 | 复合形态 combo／sparkline／gauge | 210（`packages/**`） | ✓ `CHART_KINDS`（15 处测试） | **有** | 能力已实现且被测试锁住 |
| 18 | §7 | 注入器接口 injector.py | 6（`packages/**`） | ✓ `fillTemplate`（49 处测试）；✓ `INJECTION_ORDER`（10 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 19 | §6.5 | HELP 模板 + scene-data 契约 | 7（`packages/**`） | ✓ `renderHelpShell`（26 处测试）；✓ `SCENE_DATA_SCHEMA`（12 处测试）；✓ `HelpShellInput`（3 处测试） | **有** | 能力已实现且被测试锁住 |
| 20 | §6.2 §9 | HELP 速查台一键复制指令 | 28（`packages/**`） | ✓ `HELP_COPY_TARGETS`（8 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 21 | §8 | 版本与变更机制 | 1（`packages/**`） | ✓ `BASE_PAINT_CONTRACT_VERSION`（10 处测试） | **部分** | 新落点存在但只覆盖旧能力子集／带偏离（见报告 §9 缺口） |
| 22 | §9 | 08 规范 | 0（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 23 | §2 | 领域无关声明 | 0（base-* 源码（去注释）） | （本项无签名面；判据＝三包源码零领域词） | **有** | 三包源码零领域词（本行判据＝领域无关声明成立） |
| 24 | §2 | 技能侧专属块 metaHeader／remindersBlock | 2（`packages/**`） | （显式不移植） | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |
| 25 | §0 | 控件层测试资产 | 1（`packages/**`） | ✓ `SPEC_FROZEN_SURFACE`（7 处测试） | **有** | 能力已实现且被测试锁住 |
| 26 | §6.5 | 图表白名单例外 | 21（代码文件（不含 md）） | （显式不移植）；相关新机制：`CHART_KINDS` | **无** | 显式不移植（理由见契约 §2 对应行；本票只登记） |

**计数：有 12 / 部分 6 / 无 8（合计 26 行，100% 有结论）。** 与契约 §2 的「有 2 / 部分 7 / 无 17」**不是同一口径**：§2 判「旧签名能否原样移植」，本表判「能力在新架构是否已实现且被锁」——例如 `§3 占位符` 在 §2 记「部分」（旧 `inject()` 签名未移植），在实现实况口径下为「有」（`fillTemplate` 已落地且 49 处测试）。

**「旧侧符号命中」列读法**：这是**裸 grep 命中数**，含注释与历史字符串，只作定位线索、不作结论。两处需点名：① `§2 领域无关声明` 一行的扫描面是**去注释后的 base-* 源码**（`记账` 在注释里是「显式记账」的元语言用法，不是领域词；含注释时命中 17、去注释后 **0**）；② `§6.5 图表白名单例外` 的 21 命中全在**注释／`legacyCli` 历史命令字符串**（`skill-calorie/src/{analysis/volatility.ts,render/sportDocs.ts,triggers/scene-03-weight.ts}`）＋契约自身与签名测试的自指，**无一处自建图表画布**——B4「图表唯一实现住 base-paint」成立。

## 3. 表 B · 冻结签名面 130 条 × 实现实况（逐条有结论）

**计数：有 130 / 部分 0 / 无 0（合计 130 条）。** 按票：`#74` 有25／部分0／无0，`#75` 有8／部分0／无0，`#76` 有44／部分0／无0，`#77` 有24／部分0／无0，`#78` 有27／部分0／无0，`#92` 有2／部分0／无0。

| # | 名字 | 种类 | 票 | 章节 | 冻结签名（逐字，截断） | v1.30 对应 | 实现实况（声明点） | 出口面 | 测试引用 | 结论 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `TEMPLATE_MARKERS` | runtime | #74 | 3.1 | ``{ injectData: '<!--INJECT-DATA-->'; content: '<!--CONTENT-->'; sharedHe…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:22` | ✓ dist 运行时导出 | 22 处／5 文件 | **有** |
| 2 | `MARKER_RULES` | runtime | #74 | 3.1 | ``Record<TemplateMarkerKey, MarkerRuleSpec>`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:52` | ✓ dist 运行时导出 | 24 处／3 文件 | **有** |
| 3 | `PAYLOAD_SLOT_RULE` | runtime | #74 | 3.1 | ``{ members: readonly ['injectData', 'content']; rule: 'exactly-one'; con…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:76` | ✓ dist 运行时导出 | 17 处／3 文件 | **有** |
| 4 | `TEMPLATE_KINDS` | runtime | #74 | 3.1 | ``readonly ['data-page', 'content-page', 'legacy']`` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:84` | ✓ dist 运行时导出 | 9 处／3 文件 | **有** |
| 5 | `TemplateKind` | type | #74 | 3.1 | ``'data-page' \` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:86` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 6 | `TEMPLATE_KIND_RULE` | runtime | #74 | 3.1 | ``{ 'data-page': { required: readonly ['injectData']; forbidden: readonly…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:101` | ✓ dist 运行时导出 | 10 处／2 文件 | **有** |
| 7 | `INJECTION_ORDER` | runtime | #74 | 3.1 | ``readonly ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:119` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 8 | `ASSET_WRAP_RULE` | runtime | #74 | 3.1 | ``{ assetsBare: true; fillerWraps: true; forbidPreWrappedMarker: true; as…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:137` | ✓ dist 运行时导出 | 9 处／3 文件 | **有** |
| 9 | `ASSET_WRAPPERS` | runtime | #74 | 3.1 | ``{ sharedCssText: { openTag: '<style>'; closeTag: '</style>' }; sharedHe…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:156` | ✓ dist 运行时导出 | 60 处／4 文件 | **有** |
| 10 | `ASSET_MARKER_KEYS` | runtime | #74 | 3.1 | ``{ sharedCssText: 'sharedCss'; sharedHelpersJs: 'sharedHelpers'; chartsH…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:167` | ✓ dist 运行时导出 | 12 处／3 文件 | **有** |
| 11 | `WRAP_PREDICATES` | runtime | #74 | 3.1 | ``{ assetsBare: { scope: readonly ['sharedCssText', 'sharedHelpersJs', 'c…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:190` | ✓ dist 运行时导出 | 18 处／4 文件 | **有** |
| 12 | `DEFAULT_DATA_SCRIPT_ID` | runtime | #74 | 3.1 | ``'payload'`` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:212` | ✓ dist 运行时导出 | 14 处／5 文件 | **有** |
| 13 | `DATA_SCRIPT_TYPE` | runtime | #74 | 3.1 | ``'application/json'`` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:213` | ✓ dist 运行时导出 | 14 处／5 文件 | **有** |
| 14 | `CONTAINER_CHECK_RULE` | runtime | #74 | 3.1 | ``{ appliesWhenMarker: 'injectData'; openTag: '<script>'; closeTag: '</sc…` | 无（新架构发明：正文槽／载荷槽／容器／包裹约定，#118） | `packages/base-render/src/spec/template.ts:223` | ✓ dist 运行时导出 | 24 处／4 文件 | **有** |
| 15 | `STRICT_ENVELOPE_FIELDS` | runtime | #74 | 3.1 | ``readonly ['version', 'skill', 'shape', 'key', 'data']`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:233` | ✓ dist 运行时导出 | 6 处／3 文件 | **有** |
| 16 | `STRICT_ENVELOPE_SHAPES` | runtime | #74 | 3.1 | ``readonly ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:235` | ✓ dist 运行时导出 | 5 处／3 文件 | **有** |
| 17 | `TEMPLATE_ERROR_CODES` | runtime | #74 | 3.1 | ``readonly ['marker-missing', 'marker-duplicate', 'marker-conflict', 'dat…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:251` | ✓ dist 运行时导出 | 20 处／3 文件 | **有** |
| 18 | `TEMPLATE_CHECK_ORDER` | runtime | #74 | 3.1 | ``readonly ['marker-duplicate', 'marker-missing', 'marker-conflict', 'con…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:283` | ✓ dist 运行时导出 | 17 处／3 文件 | **有** |
| 19 | `TemplateAssets` | type | #74 | 3.1 | ``{ sharedHelpersJs: string; sharedCssText: string; chartsHelpersJs?: str…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:310` | ✓ d.ts 类型导出 | 6 处／2 文件 | **有** |
| 20 | `FillTemplateInput` | type | #74 | 3.1 | ``{ template: string; assets: TemplateAssets; data?: unknown; strict?: bo…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:316` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 21 | `FillTemplateReport` | type | #74 | 3.1 | ``{ markers: readonly MarkerReport[]; strict: boolean; exempt: boolean; b…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:348` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 22 | `FillTemplateOutput` | type | #74 | 3.1 | ``{ html: string; report: FillTemplateReport }`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:356` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 23 | `FillTemplate` | type | #74 | 3.1 | ``(input: FillTemplateInput) => FillTemplateOutput`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:362` | ✓ d.ts 类型导出 | 2 处／1 文件 | **有** |
| 24 | `fillTemplate` | runtime | #74 | 3.1 | ``(input: FillTemplateInput): FillTemplateOutput`` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/template.ts:218` | ✓ dist 运行时导出 | 49 处／7 文件 | **有** |
| 25 | `TemplateErrorShape` | type | #74 | 3.1 | ``{ name: 'TemplateError'; code: TemplateErrorCode; marker?: TemplateMark…` | §3 占位符标准 ＋ §7 注入器接口 | `packages/base-render/src/spec/template.ts:294` | ✓ d.ts 类型导出 | 4 处／2 文件 | **有** |
| 26 | `CSS_VAR_TOKENS` | runtime | #75 | 3.2 | ``{ '--fg': '#1d1d1f'; '--fg2': '#6e6e73'; '--fg3': '#86868b'; '--bg': '#…` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:12` | ✓ dist 运行时导出 | 23 处／4 文件 | **有** |
| 27 | `STYLE_SHEET_ID` | runtime | #75 | 3.2 | ``'ilife-base'`` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:29` | ✓ dist 运行时导出 | 8 处／3 文件 | **有** |
| 28 | `CONTROL_STYLE_SECTIONS` | runtime | #75 | 3.2 | ``readonly ['toast', 'actionBar', 'copyButton', 'statusBadge', 'emptyStat…` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:32` | ✓ dist 运行时导出 | 21 处／5 文件 | **有** |
| 29 | `STYLE_FORBIDDEN_TOKENS` | runtime | #75 | 3.2 | ``readonly ['--r-xl', '--pink']`` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:46` | ✓ dist 运行时导出 | 9 处／4 文件 | **有** |
| 30 | `StyleSheetInput` | type | #75 | 3.2 | ``{ prefix?: string; extraCss?: string }`` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:48` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 31 | `StyleSheetOutput` | type | #75 | 3.2 | ``{ css: string; tokens: readonly CssVarName[]; prefix: string; version: …` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:55` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 32 | `BuildStyleSheet` | type | #75 | 3.2 | ``(input?: StyleSheetInput) => StyleSheetOutput`` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/spec/style.ts:63` | ✓ d.ts 类型导出 | 2 处／1 文件 | **有** |
| 33 | `buildStyleSheet` | runtime | #75 | 3.2 | ``(input?: StyleSheetInput): StyleSheetOutput`` | §6.4 token A 组 ＋ 控件样式 | `packages/base-render/src/style.ts:1128` | ✓ dist 运行时导出 | 61 处／5 文件 | **有** |
| 34 | `ESCAPE_HTML_CHARS` | runtime | #76 | 3.3 | ``readonly ['&', '<', '>', '"', "'"]`` | §5 P0 守卫组 esc/arr/val/yes/validate | `packages/base-render/src/spec/controls.ts:14` | ✓ dist 运行时导出 | 5 处／2 文件 | **有** |
| 35 | `ESCAPE_HTML_ENTITIES` | runtime | #76 | 3.3 | ``{ '&': '&amp;'; '<': '&lt;'; '>': '&gt;'; '"': '&quot;'; "'": '&#39;' }…` | §5 P0 守卫组 esc/arr/val/yes/validate | `packages/base-render/src/spec/controls.ts:18` | ✓ dist 运行时导出 | 4 处／2 文件 | **有** |
| 36 | `COPY_CHANNELS` | runtime | #76 | 3.3 | ``readonly ['clipboard', 'fallback']`` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:32` | ✓ dist 运行时导出 | 3 处／2 文件 | **有** |
| 37 | `COPY_TEXT_DEFAULTS` | runtime | #76 | 3.3 | ``{ emptyTextShortCircuit: true; failBadgeAlwaysOn: true; okMessage: '已复制…` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:74` | ✓ dist 运行时导出 | 21 处／4 文件 | **有** |
| 38 | `TOAST_ICONS` | runtime | #76 | 3.3 | ``readonly ['copy', 'ok', 'warn', 'danger', 'info']`` | §5.1 toast 通用提示控件 | `packages/base-render/src/spec/controls.ts:186` | ✓ dist 运行时导出 | 7 处／3 文件 | **有** |
| 39 | `TOAST_DEFAULTS` | runtime | #76 | 3.3 | ``{ timeoutMs: 4500; maxStack: 5; mobileMaxStack: 3; mobileMaxPx: 820; ga…` | §5.1 toast 通用提示控件 | `packages/base-render/src/spec/controls.ts:190` | ✓ dist 运行时导出 | 53 处／5 文件 | **有** |
| 40 | `ACTION_BAR_KINDS` | runtime | #76 | 3.3 | ``readonly ['primary', 'red', 'ghost']`` | §6.2 复制按钮三件套 actionBar | `packages/base-render/src/spec/controls.ts:244` | ✓ dist 运行时导出 | 11 处／4 文件 | **有** |
| 41 | `ACTION_BAR_DEFAULTS` | runtime | #76 | 3.3 | ``{ copyDataLabel: '复制数据'; copyLogLabel: '复制日志'; ghostOwnRow: true; evenR…` | §6.2 复制按钮三件套 actionBar | `packages/base-render/src/spec/controls.ts:273` | ✓ dist 运行时导出 | 24 处／4 文件 | **有** |
| 42 | `STATUS_KINDS` | runtime | #76 | 3.3 | ``readonly ['ok', 'warn', 'danger', 'empty']`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/spec/controls.ts:289` | ✓ dist 运行时导出 | 9 处／4 文件 | **有** |
| 43 | `STATUS_DEFAULT_TEXT` | runtime | #76 | 3.3 | ``{ ok: '成功'; warn: '警告'; danger: '失败'; empty: '无数据' }`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/spec/controls.ts:293` | ✓ dist 运行时导出 | 21 处／5 文件 | **有** |
| 44 | `CONTROLS_ERROR_CODES` | runtime | #76 | 3.3 | ``readonly ['bad-input', 'bad-format']`` | §6.3 新控件（P0+P1） | `packages/base-render/src/spec/controls.ts:333` | ✓ dist 运行时导出 | 4 处／2 文件 | **有** |
| 45 | `CONTROL_NAMES` | runtime | #76 | 3.3 | ``readonly ['toast', 'copyText', 'actionBar', 'statusBadge', 'emptyState'…` | §6.3 新控件（P0+P1） | `packages/base-render/src/spec/controls.ts:345` | ✓ dist 运行时导出 | 7 处／3 文件 | **有** |
| 46 | `CONTROLS_HOST_REQUIREMENT` | runtime | #76 | 3.3 | ``'none'`` | §6.3 新控件（P0+P1） | `packages/base-render/src/spec/controls.ts:350` | ✓ dist 运行时导出 | 5 处／3 文件 | **有** |
| 47 | `CONTROL_AVAILABILITY` | runtime | #76 | 3.3 | ``Record<ControlName, ControlAvailability>`` | §6.3 新控件（P0+P1） | `packages/base-render/src/spec/controls.ts:360` | ✓ dist 运行时导出 | 19 处／3 文件 | **有** |
| 48 | `CopyPorts` | type | #76 | 3.3 | ``{ clipboard: ClipboardChannel \` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:41` | ✓ d.ts 类型导出 | 8 处／2 文件 | **有** |
| 49 | `CopyTextOptions` | type | #76 | 3.3 | ``{ silent?: boolean; toast?: { ok?: CopyToastText; fail?: CopyToastText …` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:56` | ✓ d.ts 类型导出 | 5 处／1 文件 | **有** |
| 50 | `CopyTextOutcome` | type | #76 | 3.3 | ``{ ok: boolean; channel: CopyChannel \` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:64` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 51 | `CopyText` | type | #76 | 3.3 | ``(text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<Cop…` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:72` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 52 | `copyText` | runtime | #76 | 3.3 | ``(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyT…` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/controls.ts:333` | ✓ dist 运行时导出 | 65 处／4 文件 | **有** |
| 53 | `CopyRuntime` | type | #76 | 3.3 | ``{ copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutco…` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/spec/controls.ts:84` | ✓ d.ts 类型导出 | 2 处／1 文件 | **有** |
| 54 | `createCopyRuntime` | runtime | #76 | 3.3 | ``(ports: CopyPorts): CopyRuntime`` | §6.2§6.8 copyText（含反馈钩子） | `packages/base-render/src/controls.ts:385` | ✓ dist 运行时导出 | 7 处／2 文件 | **有** |
| 55 | `CopyActionHostPort` | type | #76 | 3.3 | ``{ listActionIds(): readonly string[]; readDataText(actionId: string): s…` | 无（新架构发明：actionId 发现机制，#90 接线面） | `packages/base-render/src/spec/controls.ts:119` | ✓ d.ts 类型导出 | 5 处／2 文件 | **有** |
| 56 | `ACTION_ID_ATTR` | runtime | #76 | 3.3 | ``'data-action-id'`` | 无（新架构发明：actionId 发现机制，#90 接线面） | `packages/base-render/src/spec/controls.ts:97` | ✓ dist 运行时导出 | 63 处／8 文件 | **有** |
| 57 | `COPY_ACTION_IDS` | runtime | #76 | 3.3 | ``{ actionBar: { copyData: 'ilife-copy-data'; copyLog: 'ilife-copy-log' }…` | 无（新架构发明：actionId 发现机制，#90 接线面） | `packages/base-render/src/spec/controls.ts:112` | ✓ dist 运行时导出 | 42 处／4 文件 | **有** |
| 58 | `BindCopyAction` | type | #76 | 3.3 | ``(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions) =>…` | 无（新架构发明：actionId 发现机制，#90 接线面） | `packages/base-render/src/spec/controls.ts:140` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 59 | `bindCopyAction` | runtime | #76 | 3.3 | ``(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): {…` | 无（新架构发明：actionId 发现机制，#90 接线面） | `packages/base-render/src/controls.ts:429` | ✓ dist 运行时导出 | 23 处／3 文件 | **有** |
| 60 | `SharedHelpersInput` | type | #76 | 3.3 | ``{ prefix?: string; dataAttr?: string }`` | 无（新架构发明：helpers 产出者归一 #76） | `packages/base-render/src/spec/controls.ts:148` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 61 | `DEFAULT_DATA_ATTR` | runtime | #76 | 3.3 | ``'data-t'`` | §6.3 新控件（P0+P1） | `packages/base-render/src/spec/controls.ts:158` | ✓ dist 运行时导出 | 52 处／8 文件 | **有** |
| 62 | `BuildSharedHelpersJs` | type | #76 | 3.3 | ``(input?: SharedHelpersInput) => string`` | 无（新架构发明：helpers 产出者归一 #76） | `packages/base-render/src/spec/controls.ts:182` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 63 | `buildSharedHelpersJs` | runtime | #76 | 3.3 | ``(input?: SharedHelpersInput): string`` | 无（新架构发明：helpers 产出者归一 #76） | `packages/base-render/src/controls.ts:579` | ✓ dist 运行时导出 | 27 处／7 文件 | **有** |
| 64 | `SHARED_HELPERS_JS_RULE` | runtime | #76 | 3.3 | ``{ selfContained: true; idempotent: true; domAllowed: true; forbidGlobal…` | 无（新架构发明：helpers 产出者归一 #76） | `packages/base-render/src/spec/controls.ts:171` | ✓ dist 运行时导出 | 21 处／4 文件 | **有** |
| 65 | `ToastInput` | type | #76 | 3.3 | ``{ msg: string; detail?: string; icon?: ToastIcon; badge?: ToastBadge; a…` | §5.1 toast 通用提示控件 | `packages/base-render/src/spec/controls.ts:212` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 66 | `ToastHostPort` | type | #76 | 3.3 | ``{ mount(html: string): { remove(): void } }`` | §5.1 toast 通用提示控件 | `packages/base-render/src/spec/controls.ts:228` | ✓ d.ts 类型导出 | 7 处／3 文件 | **有** |
| 67 | `ToastController` | type | #76 | 3.3 | ``{ show(input: ToastInput): void; flush(): void; dispose(): void }`` | §5.1 toast 通用提示控件 | `packages/base-render/src/spec/controls.ts:232` | ✓ d.ts 类型导出 | 2 处／1 文件 | **有** |
| 68 | `renderToast` | runtime | #76 | 3.3 | ``(input: ToastInput): string`` | §5.1 toast 通用提示控件 | `packages/base-render/src/controls.ts:179` | ✓ dist 运行时导出 | 45 处／4 文件 | **有** |
| 69 | `createToastController` | runtime | #76 | 3.3 | ``(port: ToastHostPort): ToastController`` | §5.1 toast 通用提示控件 | `packages/base-render/src/controls.ts:241` | ✓ dist 运行时导出 | 12 处／2 文件 | **有** |
| 70 | `ActionBarInput` | type | #76 | 3.3 | ``{ buttons?: readonly ActionBarButton[]; copyData?: CopyButtonInput; cop…` | §6.2 复制按钮三件套 actionBar | `packages/base-render/src/spec/controls.ts:267` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 71 | `renderActionBar` | runtime | #76 | 3.3 | ``(input: ActionBarInput): string`` | §6.2 复制按钮三件套 actionBar | `packages/base-render/src/controls.ts:1170` | ✓ dist 运行时导出 | 25 处／4 文件 | **有** |
| 72 | `StatusBadgeInput` | type | #76 | 3.3 | ``{ status: StatusKind; text?: string }`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/spec/controls.ts:300` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 73 | `renderStatusBadge` | runtime | #76 | 3.3 | ``(input: StatusBadgeInput): string`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/controls.ts:1206` | ✓ dist 运行时导出 | 14 处／4 文件 | **有** |
| 74 | `EmptyStateInput` | type | #76 | 3.3 | ``{ icon?: string; text: string; hint?: string; actionHtml?: string }`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/spec/controls.ts:308` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 75 | `renderEmptyState` | runtime | #76 | 3.3 | ``(input: EmptyStateInput): string`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/controls.ts:1216` | ✓ dist 运行时导出 | 21 处／5 文件 | **有** |
| 76 | `ErrorReceiptInput` | type | #76 | 3.3 | ``{ message: string; retryPrompt?: string; dataText?: string; logText?: s…` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/spec/controls.ts:318` | ✓ d.ts 类型导出 | 5 处／2 文件 | **有** |
| 77 | `renderErrorReceipt` | runtime | #76 | 3.3 | ``(input: ErrorReceiptInput): string`` | §6.3 statusBadge／emptyState／errorReceipt | `packages/base-render/src/controls.ts:1244` | ✓ dist 运行时导出 | 20 处／5 文件 | **有** |
| 78 | `COPY_FORMATS` | runtime | #77 | 3.4 | ``readonly ['text', 'json', 'csv']`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:12` | ✓ dist 运行时导出 | 11 处／2 文件 | **有** |
| 79 | `SERIALIZABLE_SHAPES` | runtime | #77 | 3.4 | ``readonly ['stat', 'list', 'detail', 'analysis', 'receipt']`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:18` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 80 | `LOG_SECTIONS` | runtime | #77 | 3.4 | ``readonly ['scene', 'thinking', 'dataStructure', 'callChain', 'timestamp…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:25` | ✓ dist 运行时导出 | 33 处／3 文件 | **有** |
| 81 | `LOG_SECTION_TITLES` | runtime | #77 | 3.4 | ``{ scene: '场景标识'; thinking: 'AI 思考链'; dataStructure: '数据结构'; callChain: …` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:29` | ✓ dist 运行时导出 | 13 处／3 文件 | **有** |
| 82 | `LOG_UNKNOWN_PLACEHOLDER` | runtime | #77 | 3.4 | ``'(未知)'`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:76` | ✓ dist 运行时导出 | 13 处／3 文件 | **有** |
| 83 | `TEXT_EMPTY_PLACEHOLDER` | runtime | #77 | 3.4 | ``'未填写'`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:78` | ✓ dist 运行时导出 | 20 处／3 文件 | **有** |
| 84 | `TEXT_SENSITIVE_MASK` | runtime | #77 | 3.4 | ``'****'`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:79` | ✓ dist 运行时导出 | 21 处／3 文件 | **有** |
| 85 | `TEXT_HEADER_TEMPLATE` | runtime | #77 | 3.4 | ``'【{skill} · {key}】'`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:81` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 86 | `TEXT_JSON_INDENT` | runtime | #77 | 3.4 | ``2`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:127` | ✓ dist 运行时导出 | 15 处／3 文件 | **有** |
| 87 | `TEXT_JSON_LT_RULE` | runtime | #77 | 3.4 | ``'u003c'`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:129` | ✓ dist 运行时导出 | 12 处／3 文件 | **有** |
| 88 | `CSV_DIALECT` | runtime | #77 | 3.4 | ``{ delimiter: ','; quote: '"'; quoteEscape: '""'; lineEnding: 'LF'; head…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:131` | ✓ dist 运行时导出 | 26 处／3 文件 | **有** |
| 89 | `TEXT_ERROR_CODES` | runtime | #77 | 3.4 | ``readonly ['shape-unsupported', 'structure-invalid', 'format-unknown']`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:139` | ✓ dist 运行时导出 | 7 处／3 文件 | **有** |
| 90 | `SENSITIVE_ROW_RULE` | runtime | #77 | 3.4 | ``{ textField: 'text'; flagField: 'sensitive'; flagValue: true; mask: '**…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:97` | ✓ dist 运行时导出 | 19 处／3 文件 | **有** |
| 91 | `SerializableEnvelope` | type | #77 | 3.4 | ``Envelope<SerializableShape>`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:22` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 92 | `DataTextInput` | type | #77 | 3.4 | ``{ envelope: SerializableEnvelope; format?: CopyFormat; title?: string; …` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:58` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 93 | `LogTextInput` | type | #77 | 3.4 | ``{ envelope: SerializableEnvelope; format?: CopyFormat; copyLog?: CopyLo…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:68` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 94 | `CopyLogFields` | type | #77 | 3.4 | ``{ thinking?: string; dataStructure?: string; callChain?: string; timest…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:39` | ✓ d.ts 类型导出 | 6 处／2 文件 | **有** |
| 95 | `LOG_SECTION_SOURCES` | runtime | #77 | 3.4 | ``{ scene: 'envelope'; thinking: 'copyLog.thinking'; dataStructure: 'copy…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:49` | ✓ dist 运行时导出 | 19 处／3 文件 | **有** |
| 96 | `DataProjectionSpec` | type | #77 | 3.4 | ``{ header: string; body: string; tail: string \` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:106` | ✓ d.ts 类型导出 | 2 处／1 文件 | **有** |
| 97 | `DATA_TEXT_PROJECTIONS` | runtime | #77 | 3.4 | ``{ stat: { header: '【{skill} · {key}】'; body: 'metrics'; tail: null; csv…` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:120` | ✓ dist 运行时导出 | 21 处／3 文件 | **有** |
| 98 | `BuildDataText` | type | #77 | 3.4 | ``(input: DataTextInput) => string`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:150` | ✓ d.ts 类型导出 | 5 处／1 文件 | **有** |
| 99 | `buildDataText` | runtime | #77 | 3.4 | ``(input: DataTextInput): string`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/text.ts:434` | ✓ dist 运行时导出 | 107 处／2 文件 | **有** |
| 100 | `BuildLogText` | type | #77 | 3.4 | ``(input: LogTextInput) => string`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/spec/text.ts:153` | ✓ d.ts 类型导出 | 5 处／1 文件 | **有** |
| 101 | `buildLogText` | runtime | #77 | 3.4 | ``(input: LogTextInput): string`` | §6.1 snapshot 结构化接口 | `packages/base-render/src/text.ts:470` | ✓ dist 运行时导出 | 35 处／2 文件 | **有** |
| 102 | `CHART_KINDS` | runtime | #78 | 3.5 | ``readonly ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'ga…` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:8` | ✓ dist 运行时导出 | 15 处／4 文件 | **有** |
| 103 | `CHARTS_STYLE_ID` | runtime | #78 | 3.5 | ``'ilife-charts'`` | 无（新架构发明：图表 helpers 产出者归一 #78） | `packages/base-render/src/spec/charts.ts:216` | ✓ dist 运行时导出 | 13 处／3 文件 | **有** |
| 104 | `CHART_STRUCTURE_RULE` | runtime | #78 | 3.5 | ``'throw'`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:219` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 105 | `CHART_EMPTY_RULE` | runtime | #78 | 3.5 | ``'emptyState'`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:222` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 106 | `CHART_COORD_RULE` | runtime | #78 | 3.5 | ``'viewBox-only'`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:225` | ✓ dist 运行时导出 | 9 处／3 文件 | **有** |
| 107 | `CHART_BREAKPOINTS` | runtime | #78 | 3.5 | ``{ mobileMaxPx: 720; dotSizeMobilePx: 8; lineHeightMobilePx: 150; stacke…` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:227` | ✓ dist 运行时导出 | 12 处／3 文件 | **有** |
| 108 | `CHART_PALETTE` | runtime | #78 | 3.5 | ``readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8…` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:235` | ✓ dist 运行时导出 | 19 处／3 文件 | **有** |
| 109 | `CHART_ERROR_CODES` | runtime | #78 | 3.5 | ``readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:248` | ✓ dist 运行时导出 | 10 处／3 文件 | **有** |
| 110 | `SCENE_STATUS` | runtime | #78 | 3.5 | ``readonly ['', '【待开发】']`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:17` | ✓ dist 运行时导出 | 16 处／3 文件 | **有** |
| 111 | `SCENE_TYPE_FIELD` | runtime | #78 | 3.5 | ``'types'`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:22` | ✓ dist 运行时导出 | 5 处／3 文件 | **有** |
| 112 | `SCENE_DATA_SCHEMA` | runtime | #78 | 3.5 | ``object（draft-07；$id: 'ilife://base-paint/scene-data.schema.json'）`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:106` | ✓ dist 运行时导出 | 12 处／3 文件 | **有** |
| 113 | `HELP_SHELL_ID` | runtime | #78 | 3.5 | ``'ilife-help-shell'`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:240` | ✓ dist 运行时导出 | 18 处／5 文件 | **有** |
| 114 | `HELP_COPY_TARGETS` | runtime | #78 | 3.5 | ``readonly ['prompt', 'wakeWord', 'params']`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:243` | ✓ dist 运行时导出 | 8 处／3 文件 | **有** |
| 115 | `HELP_COPY_ACTIONS` | runtime | #78 | 3.5 | ``{ prompt: { actionId: 'ilife-help-copy-prompt'; label: '复制指令' }; wakeWo…` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:249` | ✓ dist 运行时导出 | 37 处／5 文件 | **有** |
| 116 | `HELP_SCHEMA_ERROR_CODES` | runtime | #78 | 3.5 | ``readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-in…` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:267` | ✓ dist 运行时导出 | 7 处／3 文件 | **有** |
| 117 | `ChartItem` | type | #78 | 3.5 | ``{ label: string; value: number \` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:14` | ✓ d.ts 类型导出 | 10 处／2 文件 | **有** |
| 118 | `ChartOutput` | type | #78 | 3.5 | ``{ kind: ChartKind; html: string; empty: boolean; points: number }`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:197` | ✓ d.ts 类型导出 | 6 处／2 文件 | **有** |
| 119 | `ChartsApi` | type | #78 | 3.5 | ``{ bar(input: BarChartInput): ChartOutput; line(input: LineChartInput): …` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/spec/charts.ts:205` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 120 | `charts` | runtime | #78 | 3.5 | ``ChartsApi`` | §6.5 图表组件 ＋ §6.6 复合形态 | `packages/base-render/src/charts.ts:1692` | ✓ dist 运行时导出 | 612 处／7 文件 | **有** |
| 121 | `SceneData` | type | #78 | 3.5 | ``{ skill_name: string; title: string; subtitle?: string; meta_blocks?: r…` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:93` | ✓ d.ts 类型导出 | 4 处／2 文件 | **有** |
| 122 | `Scene` | type | #78 | 3.5 | ``{ id: string; title: string; wake_word: string; types?: readonly (strin…` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:38` | ✓ d.ts 类型导出 | 6 处／2 文件 | **有** |
| 123 | `HelpShellInput` | type | #78 | 3.5 | ``{ sceneData: SceneData; assets: TemplateAssets; strict?: boolean; templ…` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:255` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 124 | `RenderHelpShell` | type | #78 | 3.5 | ``(input: HelpShellInput) => FillTemplateOutput`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/spec/help.ts:265` | ✓ d.ts 类型导出 | 4 处／1 文件 | **有** |
| 125 | `renderHelpShell` | runtime | #78 | 3.5 | ``(input: HelpShellInput): FillTemplateOutput`` | §6.5 HELP 模板 ＋ scene-data 契约 | `packages/base-render/src/help.ts:675` | ✓ dist 运行时导出 | 26 处／3 文件 | **有** |
| 126 | `ChartsHelpersInput` | type | #78 | 3.5 | ``{ prefix?: string; styleId?: string }`` | 无（新架构发明：图表 helpers 产出者归一 #78） | `packages/base-render/src/spec/charts.ts:262` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 127 | `BuildChartsHelpersJs` | type | #78 | 3.5 | ``(input?: ChartsHelpersInput) => string`` | 无（新架构发明：图表 helpers 产出者归一 #78） | `packages/base-render/src/spec/charts.ts:273` | ✓ d.ts 类型导出 | 3 处／1 文件 | **有** |
| 128 | `buildChartsHelpersJs` | runtime | #78 | 3.5 | ``(input?: ChartsHelpersInput): string`` | 无（新架构发明：图表 helpers 产出者归一 #78） | `packages/base-render/src/charts.ts:1792` | ✓ dist 运行时导出 | 24 处／3 文件 | **有** |
| 129 | `BASE_PAINT_CONTRACT_VERSION` | runtime | #92 | 5 | ``'0.1.0'`` | §8 版本与变更机制 | `packages/base-render/src/spec/index.ts:26` | ✓ dist 运行时导出 | 10 处／4 文件 | **有** |
| 130 | `SPEC_FROZEN_SURFACE` | runtime | #92 | 7 | ``readonly FrozenSurfaceEntry[]`` | §0 控件层测试资产 | `packages/base-render/src/spec/index.ts:44` | ✓ dist 运行时导出 | 7 处／2 文件 | **有** |

**读表提示**：表内「冻结签名」列做了 72 字符截断，**逐字全文**以契约 §3 标记区表格为准（`docs/base-paint-contract.md`，行号见 `docLine`，探针可复跑）；「结论＝有」的语义是「声明点＋出口面＋测试引用三者齐备」，**签名逐字一致性**由既有 `packages/base-render/test/contract-signatures.test.mjs` 的 `SPEC_FROZEN_SURFACE` 逐字比对钉死（本票复跑见 §7 门禁表）。

## 4. 版本统一

### 4.1 前后对照

| 包名 | 目录 | 改动前 | 改动后 | registry 已发布 | 依据 |
|---|---|---|---|---|---|
| `base-link-core` | `packages/base-link-core` | 0.1.0 | **0.2.0** | 0.1.0 | 统一到 0.2.0（只许前进；0.1.0 仍是合法安装目标） |
| `base-paint` | `packages/base-render` | 0.2.0 | **0.2.0** | 0.1.0／0.2.0 | 保持不动（已发布 0.2.0；skill-calorie 依赖 `^0.2.0` 且本票禁改该包） |
| `base-combos` | `packages/base-combos` | 0.1.0 | **0.2.0** | 0.1.0 | 统一到 0.2.0 |

### 4.2 统一到 0.2.0 的理由（三条）

1. **只许前进**：`base-paint` 已在 registry 发布 `0.1.0` 与 `0.2.0`（`npm view base-paint versions` 实测 `["0.1.0","0.2.0"]`）。统一到 0.1.0 需要把 `base-paint` 降号——既无法重发，也会让本地 0.1.0 与实际内容不符，属「用改版本号掩盖不兼容」，硬约束明令禁止。**最小可行目标即 0.2.0**。
2. **base-paint 必须不动**：`packages/skill-calorie`（本票**禁改**）依赖 `base-paint: ^0.2.0`；任何把 base-paint 抬到 0.3.0 的方案都会同时打红 `tooling/check-publish.mjs` 的「同版本线」断言与 skill-calorie 的解析，越出本票权限。
3. **无签名变更**：本票不改任何冻结签名、不改任何渲染产出（§6 逐字节证据），故对 `base-link-core`／`base-combos` 取 **patch** 语义的版本对齐（见 §4.4 changeset），不借版本号掩盖不兼容。

### 4.3 改了哪些文件（版本面）

| 文件 | 改动 | 为什么必须改 |
|---|---|---|
| `packages/base-link-core/package.json` | `version` 0.1.0→0.2.0 | 三包统一 |
| `packages/base-combos/package.json` | `version` 0.1.0→0.2.0；`dependencies.base-link-core` `workspace:^0.1.0`→`workspace:^0.2.0` | 统一 ＋ 包内同版本线 |
| `packages/base-render/package.json` | `devDependencies.base-link-core` `^0.1.0`→`^0.2.0` | 同版本线（`check-publish` 断言） |
| `packages/skill-{bill,chef,home,schedule,memo-ilife}/package.json` | `dependencies.base-link-core` `^0.1.0`→`^0.2.0` | **必须**：pnpm 只在「版本满足范围」时链接工作区包（官方文档原文：*Packages are only linked if their versions satisfy the dependency ranges*）。不改这 5 个包的 range，它们会在 `pnpm install` 后从 registry 拉 `base-link-core@0.1.0`，**运行时依赖的来源被静默换掉**（这 5 个技能的 `src/render/envelope.ts` 真调用 `createEnvelope`／`parseEnvelope`）。改后 5 包仍链 `link:../base-link-core`，与改动前**同构** |
| `pnpm-lock.yaml` | 6 处 specifier ＋ 1 处 `link:`→`0.1.0`（见 §4.5） | 锁文件与清单一致（否则 `pnpm install --frozen-lockfile` 直接红） |
| `.changeset/config.json` | `fixed: []` → `fixed: [["base-link-core","base-paint","base-combos"]]` | B8 机制：此后任一包发版，三包同版本、同发布 |
| `.changeset/t79-base-version-lockstep.md` | 新增（`base-link-core: patch`／`base-combos: patch`） | 版本变更记账；`changeset status` 门需要 |

**版本常量不动（口径分离）**：`ENVELOPE_VERSION`／`RENDER_CONTRACT_VERSION`／`RENDER_ENVELOPE_VERSION`／`STYLE_VERSION`／`BASE_PAINT_CONTRACT_VERSION` 均为 `'0.1.0'`——它们是**契约版本**，且 `BASE_PAINT_CONTRACT_VERSION` 是冻结签名（契约 §5 标记区表格 `'0.1.0'`）。包版本升号**不得**带着它们漂移；这条被新测试第 5 个用例反向钉死。

### 4.4 changeset 与 fixed 组的交互（发版期行为）

`fixed` 组语义：组内任一包有 changeset，发版时**全部**升到同一版本。故本票的 `patch` 声明在发版时会把三包一起推到同一版本（当前 pending 的 `.changeset/base-paint-contract-freeze.md` 是 `base-paint: minor`，届时三包会一起抬到同一 minor 线）。**这正是 B8 要的效果**：版本偏斜在机制层不可能再发生。

### 4.5 锁文件与 skill-calorie 的连带影响（如实记账）

`pnpm install --no-frozen-lockfile` 的锁文件差异（全文见 commit）：`base-combos`／`base-render`／5 个技能包的 specifier 升到 `^0.2.0`（链接保持 `link:../base-link-core`），**唯一**落到 registry 的是：

```yaml
  packages/skill-calorie:
    devDependencies:
      base-link-core:
        specifier: ^0.1.0      # 禁改该包 → 保持原样
-       version: link:../base-link-core
+       version: 0.1.0         # 解析到 registry 的 base-link-core@0.1.0
```

**影响面实测为零（可复验）**：① skill-calorie 对 `base-link-core` 的引用**全是 `import type`**（`src/cli/keys.ts:11`／`src/cli/cmd_read.ts:118`／`src/fetch/shapes.ts:7`／`src/render/envelope.ts:8`），类型擦除、不进产物；② registry 的 `base-link-core@0.1.0` 与本地 `dist` **20/20 文件逐字节相同**（`npm pack base-link-core@0.1.0` 解包后全树 sha256 比对，见 `docs/research/t79-gen-report.mjs` 旁证与 §9 缺口 G-2）。**仍登记为缺口**：range 与统一版本不同线，应在 skill-calorie 解冻后一行对齐。

**锁文件一致性复验**：锁文件同步后 `pnpm install --frozen-lockfile` 复跑 **exit 0**（runId `690b3052-d9bb-4799-8018-9af0b454ed62`）——CI 的 `--frozen-lockfile` 安装不再红。

## 5. CI 断言（版本一致 ＋ 边界绿）

**新增文件** `packages/base-render/test/base-version-lockstep.test.mjs`（5 个用例，落在 `pnpm test` 的 `packages/base-render/test/*.test.mjs` glob 内，CI 的 `build-test` 与 `win-detail` 两个 job 都会跑）：

| # | 断言 | 防的回归 |
|---|---|---|
| 1 | 三包 `name` 与目录映射不变 | 包名／目录漂移（`base-paint` 住 `base-render` 目录） |
| 2 | 三包 `version` **逐字相等**（且形如 `x.y.z`） | 版本偏斜复发（本票的核心 AC） |
| 3 | `.changeset/config.json` 的 `fixed` 组**恰含**三包 | 机制被回退成 `[]` 或扩到别包 |
| 4 | 包内 caret 范围与工作区版本**同 major.minor**（`base-combos`→`base-link-core`、`base-paint`→`base-link-core`） | range 与版本脱钩（与 `check-publish.mjs` 同源口径） |
| 5 | 5 个版本常量仍是 `'0.1.0'` | 有人把「包版本」误当「契约版本」一起升号 |

**版本无关化**（与 `tooling/check-publish.mjs` 的 #123 返修同源）：断言只比较三包**彼此相等**与 **major.minor 同线**，不写死 `0.2.0`——下次发版改号不会打红这条门。

**边界绿**：`pnpm boundaries` exit=0（`tooling/check-boundaries.mjs` 全 PASS，含 #96 的「其余 5 技能依赖闭包不含 base-*」与「源码／模板不 import base-*」）。

## 6. 渲染输出不变的证据（硬约束 2）

| 判据 | 改动前 | 改动后（终态复跑） | 结论 |
|---|---|---|---|
| `pnpm snapshot:check` | exit 0，`0.1.0@932e7b250d278d50`（`ba4bf31c…`） | exit 0，`0.1.0@932e7b250d278d50`（`b6a100c5…`／终态 `460f017a-c212-4e5b-86e3-c3a09911ae6f`） | 快照值逐字同值（changed=0） |
| `pnpm snapshot:html:check` | exit 0，`artifacts=185 changed=0 added=0 removed=0`（`ac79e72a…`） | exit 0，`artifacts=185 changed=0 added=0 removed=0`（`6fca01a9…`／终态 `71cb2fbd-027b-4f3d-9fd4-8a4c82eb0b51`） | **185 件产物 sha256 全不变** |
| `calorie.help.center`（`SKILLS_DB_PATH=<tmp>`，file 态） | sha256 `f380ef685065a1e9279961952cc9ef76bd235d6ee65c157f9114f4e60b2b79c2`，1,264,822 B，`delivery.mode=file`，`template=help-shell`（`c9cebbde…`） | **同 sha256**，同字节数，同 mode／template（`0acbcad8…`／终态 `7f88fb24-7c50-41a2-9652-2d7d00ca4a27`） | 逐字节不变 |

**一处需要解释的口径**：`snapshot:html:check` 的 `base-* fingerprint` 由 `edd0c9cbec14c10a0fd4b8d3ed433a92` 变为 `0686fc230318e7d4520170192aefe673`。该指纹**只报告、不入快照**（`tooling/skill-html-snapshot.mjs:298` 注释与 `baseFingerprint()` 实现），其输入含 `packages/base-render/package.json`——本票改了该文件的 devDependency range，故指纹变；**产物逐件 sha256 未变**（`changed=0`）。这正是「版本号／range 变化不改变渲染输出」的机读证明。

## 7. 门禁实测表（全部经 `run-locked`，无裸跑）

| 命令（均经 `node tooling/run-locked.mjs --ticket 79 --`） | exit | runId | 关键输出 |
|---|---|---|---|
| `pnpm snapshot:check` | 0 | `ba4bf31c-1311-4071-b17b-c85705d7ab47` |  |
| `pnpm snapshot:html:check` | 0 | `ac79e72a-bc8b-4e6e-ad36-9eaa8f88c442` |  |
| `node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | 4 | `b03907bf-d76a-474e-a8a1-74d609fb22c4` |  |
| `node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | 4 | `5d3e042b-88ea-4c36-a52c-8135c06cb190` |  |
| `node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | 0 | `c9cebbde-a0ab-4e51-9e11-a7c9d308fd48` |  |
| `node --test packages/base-render/test/base-version-lockstep.test.mjs` | 0 | `327d2e9a-a5a1-40f7-a570-025bba906d06` |  |
| `pnpm install --frozen-lockfile` | 1 | `b560e5e0-bdd7-484a-88f8-e3833f3b08b9` |  |
| `pnpm install --no-frozen-lockfile` | 0 | `e63948eb-efac-487b-891b-f46d6b73a0fa` |  |
| `pnpm install --no-frozen-lockfile` | 0 | `17b7c5d0-456e-44d6-9469-1606263119e9` |  |
| `pnpm build` | 0 | `554e3b0c-1aa6-44e3-a47a-6d1c52c1bbb7` |  |
| `pnpm snapshot:check` | 0 | `b6a100c5-0225-4af7-add0-3391466311d7` |  |
| `pnpm snapshot:html:check` | 0 | `6fca01a9-aad8-442b-b7b7-b071143eba6c` |  |
| `pnpm boundaries` | 0 | `253c2bb4-f124-49fc-9932-e3b2968073b8` |  |
| `node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | 0 | `0acbcad8-1eaf-4fd2-859a-e1311cd7083d` |  |
| `pnpm test` | 1 | `9c81a8af-b66e-4cbd-b8ea-89f943287de1` |  |
| `node --test test/client-bundle-48.test.mjs` | 1 | `c4759252-4b32-4a64-9f83-29f3527eb19b` |  |
| `pnpm test` | 3221225786 | `b1df8859-5b7f-4bb5-a313-a94862971585` |  |
| `pnpm test` | 1 | `3032bfce-3042-4303-a7cb-6d93e23c15e5` |  |
| `pnpm test` | 1 | `ded9b4cc-ebac-4f5c-8020-c553c3e3b3ee` |  |
| `node --test packages/base-render/test/help-center-js-88.test.mjs` | 0 | `e5dbd129-a851-42c7-9ac8-0fb98fcffb82` |  |
| `pnpm build` | 0 | `2e00b99e-3315-4e23-9128-9fca978a77e7` |  |
| `node --test packages/base-render/test/base-version-lockstep.test.mjs` | 0 | `8be3b499-9c29-4c07-ad9a-c1707954596a` |  |
| `pnpm build` | 0 | `9b6e5fed-166d-4121-8d16-dfcd7cff85b6` |  |
| `node --test packages/base-render/test/base-version-lockstep.test.mjs` | 0 | `3c880aaf-415b-4d25-a241-c2e32168133e` |  |
| `pnpm build` | 0 | `9ef67736-c8f2-4dec-94c8-1e2d0816cc9b` |  |
| `node --test packages/base-render/test/base-version-lockstep.test.mjs` | 1 | `33161245-2316-43de-84b6-ac80a931056b` |  |
| `pnpm build` | 0 | `6290ce7f-6d1c-4d5c-82ee-c6d55b0767ee` |  |
| `node --test packages/base-render/test/base-version-lockstep.test.mjs` | 0 | `15ddebed-7912-440b-8adb-feaf0bc3b37c` |  |
| `pnpm snapshot:check` | 0 | `460f017a-c212-4e5b-86e3-c3a09911ae6f` |  |
| `pnpm snapshot:html:check` | 0 | `71cb2fbd-027b-4f3d-9fd4-8a4c82eb0b51` |  |
| `pnpm boundaries` | 0 | `7e085f9f-d07f-4e49-8d20-dbd0f557f6c5` |  |
| `node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center` | 0 | `7f88fb24-7c50-41a2-9652-2d7d00ca4a27` |  |
| `pnpm install --frozen-lockfile` | 0 | `690b3052-d9bb-4799-8018-9af0b454ed62` |  |

**声明（供 `check-gate-audit` 对账）**：

GATE-RUN runId=ba4bf31c-1311-4071-b17b-c85705d7ab47 cmd="pnpm snapshot:check"
GATE-RUN runId=ac79e72a-bc8b-4e6e-ad36-9eaa8f88c442 cmd="pnpm snapshot:html:check"
GATE-RUN runId=b03907bf-d76a-474e-a8a1-74d609fb22c4 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=5d3e042b-88ea-4c36-a52c-8135c06cb190 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=c9cebbde-a0ab-4e51-9e11-a7c9d308fd48 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=327d2e9a-a5a1-40f7-a570-025bba906d06 cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=b560e5e0-bdd7-484a-88f8-e3833f3b08b9 cmd="pnpm install --frozen-lockfile"
GATE-RUN runId=e63948eb-efac-487b-891b-f46d6b73a0fa cmd="pnpm install --no-frozen-lockfile"
GATE-RUN runId=17b7c5d0-456e-44d6-9469-1606263119e9 cmd="pnpm install --no-frozen-lockfile"
GATE-RUN runId=554e3b0c-1aa6-44e3-a47a-6d1c52c1bbb7 cmd="pnpm build"
GATE-RUN runId=b6a100c5-0225-4af7-add0-3391466311d7 cmd="pnpm snapshot:check"
GATE-RUN runId=6fca01a9-aad8-442b-b7b7-b071143eba6c cmd="pnpm snapshot:html:check"
GATE-RUN runId=253c2bb4-f124-49fc-9932-e3b2968073b8 cmd="pnpm boundaries"
GATE-RUN runId=0acbcad8-1eaf-4fd2-859a-e1311cd7083d cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=9c81a8af-b66e-4cbd-b8ea-89f943287de1 cmd="pnpm test"
GATE-RUN runId=c4759252-4b32-4a64-9f83-29f3527eb19b cmd="node --test test/client-bundle-48.test.mjs"
GATE-RUN runId=b1df8859-5b7f-4bb5-a313-a94862971585 cmd="pnpm test"
GATE-RUN runId=3032bfce-3042-4303-a7cb-6d93e23c15e5 cmd="pnpm test"
GATE-RUN runId=ded9b4cc-ebac-4f5c-8020-c553c3e3b3ee cmd="pnpm test"
GATE-RUN runId=e5dbd129-a851-42c7-9ac8-0fb98fcffb82 cmd="node --test packages/base-render/test/help-center-js-88.test.mjs"
GATE-RUN runId=2e00b99e-3315-4e23-9128-9fca978a77e7 cmd="pnpm build"
GATE-RUN runId=8be3b499-9c29-4c07-ad9a-c1707954596a cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=9b6e5fed-166d-4121-8d16-dfcd7cff85b6 cmd="pnpm build"
GATE-RUN runId=3c880aaf-415b-4d25-a241-c2e32168133e cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=9ef67736-c8f2-4dec-94c8-1e2d0816cc9b cmd="pnpm build"
GATE-RUN runId=33161245-2316-43de-84b6-ac80a931056b cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=6290ce7f-6d1c-4d5c-82ee-c6d55b0767ee cmd="pnpm build"
GATE-RUN runId=15ddebed-7912-440b-8adb-feaf0bc3b37c cmd="node --test packages/base-render/test/base-version-lockstep.test.mjs"
GATE-RUN runId=460f017a-c212-4e5b-86e3-c3a09911ae6f cmd="pnpm snapshot:check"
GATE-RUN runId=71cb2fbd-027b-4f3d-9fd4-8a4c82eb0b51 cmd="pnpm snapshot:html:check"
GATE-RUN runId=7e085f9f-d07f-4e49-8d20-dbd0f557f6c5 cmd="pnpm boundaries"
GATE-RUN runId=7f88fb24-7c50-41a2-9652-2d7d00ca4a27 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=690b3052-d9bb-4799-8018-9af0b454ed62 cmd="pnpm install --frozen-lockfile"

GATE-RELAX flag=--allow-nonzero reason=本票非零退出的条目分四类，全部是**取证对象本身**，不得以退出码抹去：① 两条 `pnpm test` 全量运行 exit 1——失败集与冻结基线 `docs/research/t88-baseline/test-failset.txt` 比对**新增稳定失败 0**（§7.1）；② 变异自证期间的一条断言运行 exit 1——**红点即自证目标**（§8）；③ 两条 HELP 预跑 exit 4——`SKILLS_DB_PATH` 误传文件路径（该变量是**目录**）的操作失误，改正后即 exit 0（终态证据以 exit 0 的 `0acbcad8`／`7f88fb24` 为准）；④ `pnpm install --frozen-lockfile` exit 1——「先改清单后改锁文件」的中间态，锁文件同步后复跑即 exit 0（`e63948eb`／`17b7c5d0`）。

### 7.1 全量测试失败集比对（判据：新增稳定失败 = 0）

参照冻结基线 `docs/research/t88-baseline/test-failset.txt`（#88 变更前 3 轮并集，32 个具名用例）：

| 项 | 值 |
|---|---|
| 本次 `pnpm test` 汇总 | `tests 1142 / pass 1116 / fail 26 / suites 134`（runId `ded9b4cc-ebac-4f5c-8020-c553c3e3b3ee`） |
| 基线内仍红 | 27 个具名用例（`#48`／`#50`×6／`#50 面板路`／`#81`／`#93`×2／`FX-81-5`／4 个插件 client×3／6 个 `dsh-* 烟囱`）——与基线**同集** |
| 基线内已转绿 | 5 个（`#41 M3`／`#76 无宿主可执行证据`／`#80 HELP 生成`／`helpers JS ≤820px 收窄`／`check-combos 全绿`）——他人票的**改进**，非本票 |
| **新增** | **2 个**：`#88 S4 HELP 速查台运行时（真实浏览器）`／`S4-6 卡头按钮…（真实浏览器）`。**定性＝抖动，非回归**：单跑 `node --test packages/base-render/test/help-center-js-88.test.mjs` → **7/7 pass，exit 0**（runId `e5dbd129-a851-42c7-9ac8-0fb98fcffb82`）；全量并行下失败信息为 `Command failed: chrome.exe --headless=new …`＋120 s 超时（headless Chrome 争用），与基线已登记的「#76 无宿主证据（headless 浏览器）」同族波动项（`docs/research/t-help-acceptance-plan.md:192` 已登记形态） |
| 本票改动面 ∩ 失败集 | **空**：26 条失败全部落在 `test/client-bundle-48.test.mjs`／`packages/plugin-*/test/*`／`packages/skill-calorie/test/db-readonly-93.test.mjs`／`test/calorie-routing-81.test.mjs`／`packages/base-render/test/help-center-js-88.test.mjs`（浏览器），**无一条读取本票改动的任何文件**（版本字段／range／changeset 配置／新测试文件） |

## 8. 变异自证（改了代码 → 变异必红）

新增测试文件属代码改动，故做变异自证（工具 `.scratch/t79/mutate2.mjs`，逐字节备份／还原）：

| 步 | 动作 | 实测 | runId／证据 |
|---|---|---|---|
| 0 | 记录三包版本 ＋ `base-combos/package.json` sha256 | `0.2.0`／`0.2.0`／`0.2.0`；`ce47ff3316f4e139…` | `mutate2.mjs show` |
| 1 | **变异**：`base-combos` `version` 0.2.0→0.1.0 | `mutated-sha=3f71511370309e05…` | `MUT-APPLIED` |
| 2 | 重建 | exit 0 | `9ef67736-c8f2-4dec-94c8-1e2d0816cc9b` |
| 3 | 断言 → **必红** | **exit 1**，唯一失败＝`三包 version 逐字相等（版本偏斜即红）`，消息 `实得：base-link-core@0.2.0 / base-paint@0.2.0 / base-combos@0.1.0`（pass 4／fail 1） | `33161245-2316-43de-84b6-ac80a931056b` |
| 4 | **立即还原**（拷回备份） | `restored-sha=ce47ff3316f4e139…` ＝ 步 0 原值，**逐字节相同** | `MUT-RESTORED` |
| 5 | 重建 | exit 0 | `6290ce7f-6d1c-4d5c-82ee-c6d55b0767ee` |
| 6 | 断言 → **绿** | exit 0，pass 5／fail 0 | `15ddebed-7912-440b-8adb-feaf0bc3b37c` |
| 7 | `MUT-\d` 残留扫描 | 改动面 diff 0 命中／文件 0 命中 | `MUT-RESIDUE-IN-DIFF=0`／`MUT-RESIDUE-IN-FILES=0` |

## 9. 缺口登记（只登记、不改码；建议新开票）

| ID | 缺口 | 证据 | 严重度 | 建议 |
|---|---|---|---|---|
| G-1 | 契约 §5「现状：三包 version 均为 0.1.0／本票不实际升版」与实况不符（`base-paint` 早已 0.2.0，本票已统一 0.2.0） | `docs/base-paint-contract.md` §5；本报告 §4.1 | 文档漂移（不影响签名面） | 契约维护票更新 §5「现状」与「本票不升版」措辞 |
| G-2 | `packages/skill-calorie` 的 `base-link-core: ^0.1.0` 与统一版本 0.2.0 不同线，锁文件落到 registry `0.1.0` | `pnpm-lock.yaml` importer `packages/skill-calorie`；§4.5 | 低（type-only 引用；registry 与本地 dist 20/20 逐字节同） | skill-calorie 解冻后一行改 `^0.2.0`（可并入该包下一张票） |
| G-3 | `base-combos/package.json` 含 `workspace:^0.2.0`，而 `tooling/check-publish.mjs:102` 对**全量作用域**判「package.json 含 workspace: 外泄」即红（当前发布门用 `--only` 不含 base-combos，故未暴露） | `check-publish.mjs:102`；`pnpm-lock.yaml` | 中（全量发布门会红） | 发布链票：给 `base-combos` 的 workspace 协议留白名单或改为发布期替换 |
| G-4 | v1.30 的 `arr/val/yes`（P0 守卫组）无对应实现；`§4 payload` 的 `assertShapeData` 零测试引用 | 表 A §5 行；`assertShapeData` 在 `test/**`＋`packages/*/test/**` 零命中 | 低 | 若确需守卫组，新票在 base-paint 冻结面追加；`assertShapeData` 补一条测试 |
| G-5 | 4 个插件（bill／chef／home／schedule）缺 `build:client: tsdown`，`pnpm test` 整体 exit 1（既有基线 22 条） | `docs/research/t92-baseline-failures.md`；`test/client-bundle-48.test.mjs` | 既有（非本票引入） | 归 #57–#60／#64（已登记，本票只复述） |

**本票未改任何 `packages/skill-calorie/**` 文件**（硬约束 1）；`git diff --name-only` 可核。

## 10. 自检

- `packages/skill-calorie/SKILL.md` 首 3 字节 = `2D 2D 2D`（`---`）≠ `00 00 00`（#124 事故史；文件 30,143 B）。
- 全部 build／test／install／快照门经 `tooling/run-locked.mjs --ticket 79`；`check-gate-audit` 对账结果见 §10.1。
- 未 push、未关票、未 `git add -A`（提交用 `git commit --only <本票路径>`）。
- 未改任何 `packages/skill-calorie/**` 文件（`git diff --name-only` 可核）。

### 10.1 `check-gate-audit` 对账（机械门禁）

```
node tooling/check-gate-audit.mjs --evidence docs/research/t79-base-contract.md --ticket 79 \
  --since 2026-09-09T15:45:42Z --until 2026-09-09T16:18:52Z --allow-nonzero
→ RESULT: matched=33/33 auditEntries=891 scoped=33 undeclared=0
→ gate-audit: PASS   （exit 0）
```

窗口内本票 RUN 条目 **33 条全部被声明并一对一绑定 runId**，反向未声明 **0**；非零条目按 `GATE-RELAX flag=--allow-nonzero` 显式放宽（理由见 §7）。
