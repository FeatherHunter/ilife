# base-paint 现成组件盘点（写入域页面）

## 一、可用组件总表（写入域页面）

包名 `base-paint`（`packages/base-render/package.json:2`），对外开口五个（`packages/base-render/package.json:8-14`）：`base-paint`（根，映射 `dist/index.js`）、`base-paint/blocks`（映射 `dist/blocks.js`）、`base-paint/help-shell`、`base-paint/save-html`、`base-paint/package.json`。下表「导入路径」列即按此写。

### 1.1 整页装配与公共层

| 导出名 | 导入路径 | 来源 | 职责 | 签名要点 | 产物形状 |
| --- | --- | --- | --- | --- | --- |
| `blocksCss` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:1312` | 区块层样式资产唯一产出者；调用方把返回值拼进 `TemplateAssets.sharedCssText` 再交 `fillTemplate` 包裹注入，**不得**走 `StyleSheetInput.extraCss`；恒返回非空 CSS 文本 | `blocksCss(input?: BlocksCssInput): string`；`BlocksCssInput = { readonly prefix?: string }`（`blocks.ts:1304-1307`） | CSS 字符串 |
| `BLOCK_STYLE_SECTIONS` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:145` | 区块样式段名清单（配套 `BlockStyleSection = (typeof BLOCK_STYLE_SECTIONS)[number]`，`blocks.ts:160`） | `export const BLOCK_STYLE_SECTIONS = [...]` | 数据对象（只读常量数组） |
| `buildStyleSheet` | `base-paint` | `packages/base-render/src/style.ts:1291`（声明为 `export const buildStyleSheet: BuildStyleSheet`） | 共享样式表（token ＋ 控件样式段）产出者 | `(input?: StyleSheetInput): StyleSheetOutput`；`StyleSheetInput = { prefix?: string; extraCss?: string }`，`StyleSheetOutput = { css: string; tokens: readonly CssVarName[]; prefix: string; version: string }`（`src/spec/index.ts:77-78`） | 数据对象（含 `css` 字符串字段） |
| `STYLE_PREFIX` | `base-paint` | `packages/base-render/src/style.ts:31` | 全类名前缀，值 `'ilife-'` | `export const STYLE_PREFIX = 'ilife-'` | 字符串 |
| `STYLE_VERSION` | `base-paint` | `packages/base-render/src/style.ts:32` | 样式版本，值 `'0.1.0'` | `export const STYLE_VERSION = '0.1.0'` | 字符串 |
| `STYLE_TOKENS` | `base-paint` | `packages/base-render/src/style.ts:34` | 设计变量表（`Object.freeze({...})`） | `export const STYLE_TOKENS = Object.freeze({ ... })` | 数据对象 |
| `cx` | `base-paint` | `packages/base-render/src/style.ts:49` | 类名拼接 | `cx(...names: Array<string \| false \| null \| undefined>): string` | 字符串 |
| `token` | `base-paint` | `packages/base-render/src/style.ts:54` | 取 CSS 变量引用（`var(--x)`） | `token(name: StyleTokenName): string` | 字符串 |
| `fillTemplate` | `base-paint` | `packages/base-render/src/template.ts:218` | 整页装配：占位符填充（`<!--SHARED-CSS-->` 等）＋ 载荷槽注入 ＋ 资产包裹 | `(input: FillTemplateInput): FillTemplateOutput`；`FillTemplateInput = { template: string; assets: TemplateAssets; data?: unknown; strict?: boolean; dataScriptId?: string; content?: string }`，`TemplateAssets = { sharedHelpersJs: string; sharedCssText: string; chartsHelpersJs?: string }`，`FillTemplateOutput = { html: string; report: FillTemplateReport }`（`src/spec/index.ts:64-67`） | 数据对象（`html` 为 HTML 字符串 ＋ `report`） |
| `buildSharedHelpersJs` | `base-paint` | `packages/base-render/src/controls.ts:587` | 共享 helpers JS 唯一产出者（自包含、幂等、禁全局赋值） | `(input?: SharedHelpersInput): string`；`SharedHelpersInput = { prefix?: string; dataAttr?: string }`（`src/spec/index.ts:109`） | JS 字符串 |
| `escapeHtml` | `base-paint` | `packages/base-render/src/contract.ts:38` | 文本转义（自组 HTML 时用） | `escapeHtml(s: string): string` | 字符串 |
| `renderPageShell` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:207` | 页壳：单页容器 ＋ 标题三件套（eyebrow／title／subtitle）＋ 正文 | `renderPageShell(input: PageShellInput): string`；`PageShellInput = { readonly title: string; readonly subtitle?: string; readonly eyebrow?: string; readonly content: string; readonly printable?: boolean }`（`blocks.ts:195-204`；`content` 受信透传不转义） | HTML 字符串 |

### 1.2 采集页（过程型）

| 导出名 | 导入路径 | 来源 | 职责 | 签名要点 | 产物形状 |
| --- | --- | --- | --- | --- | --- |
| `renderParamForm` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:627` | 表单式采集：静态 label ＋ input／select；行为归宿主，模块只留 `data-*` 约定 | `renderParamForm(input: ParamFormInput): string`；`ParamFormInput = { readonly fields: readonly ParamFieldInput[]; readonly description?: string; readonly previewText?: string }`（`blocks.ts:615-620`）；`ParamFieldInput = { readonly name: string; readonly label: string; readonly value?: string; readonly hint?: string; readonly required?: boolean; readonly readonly?: boolean; readonly step?: string \| number; readonly min?: string \| number; readonly max?: string \| number; readonly options?: readonly string[] }`（`blocks.ts:596-613`） | HTML 字符串 |
| `renderPreBlock` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:480` | 预格式块：`<pre>` 逐字命令／prompt，可选复制按钮 | `renderPreBlock(input: PreBlockInput): string`；`PreBlockInput = { readonly command: string; readonly label?: string; readonly actionId?: string; readonly copyText?: string; readonly copyLabel?: string }`（`blocks.ts:470-477`）；`actionId` 写入 `ACTION_ID_ATTR`，文本写入 `DEFAULT_DATA_ATTR`，`copyLabel` 缺省 `'复制指令'` | HTML 字符串 |
| `renderCopyBlock` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:740` | 复制区：包一层 `<section>` ＋ 冻结动作条 | `renderCopyBlock(input: CopyBlockInput): string`；`CopyBlockInput = { readonly title?: string; readonly dataText?: string; readonly logText?: string; readonly dataActionId?: string; readonly logActionId?: string; readonly buttons?: ActionBarInput['buttons']; readonly dataFormats?: CopyFormatTexts }`（`blocks.ts:722-733`） | HTML 字符串 |

### 1.3 回执页（结果型）与共用区块

| 导出名 | 导入路径 | 来源 | 职责 | 签名要点 | 产物形状 |
| --- | --- | --- | --- | --- | --- |
| `renderFeedbackBlock` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:780` | 反馈区：组合冻结的提示条和／或错误回执（至少其一） | `renderFeedbackBlock(input: FeedbackBlockInput): string`；`FeedbackBlockInput = { readonly title?: string; readonly toast?: ToastInput; readonly error?: ErrorReceiptInput }`（`blocks.ts:773-777`） | HTML 字符串 |
| `renderStatusBadge` | `base-paint` | `packages/base-render/src/controls.ts:1405` | 状态卡／状态徽标 | `(input: StatusBadgeInput): string`；`StatusBadgeInput = { status: StatusKind; text?: string }`，`STATUS_KINDS = readonly ['ok', 'warn', 'danger', 'empty']`（`src/spec/index.ts:91,122`） | HTML 字符串 |
| `renderDataTable` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:341` | 数据表：语义 `table／thead／th／td`；零行时改走 `renderEmptyState`，不渲染空表 | `renderDataTable(input: DataTableInput): string`；`DataTableInput = { readonly columns: readonly DataTableColumn[]; readonly rows: readonly Readonly<Record<string, unknown>>[]; readonly caption?: string; readonly emptyText?: string }`（`blocks.ts:323-328`）；`DataTableColumn = { readonly key: string; readonly label: string; readonly align?: DataTableAlign }`，`DataTableAlign = 'left' \| 'center' \| 'right'`（`blocks.ts:315-321`） | HTML 字符串 |
| `renderDisclosure` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:580` | 折叠区：强制原生 `details／summary`，交互态全 CSS-only | `renderDisclosure(input: DisclosureInput): string`；`DisclosureInput = { readonly title: string; readonly contentHtml: string; readonly open?: boolean }`（`blocks.ts:572-577`；`contentHtml` 受信透传不转义） | HTML 字符串 |
| `renderEmptyBlock` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:711` | 空态区块：冻结 `renderEmptyState` ＋ 区块 wrapper | `renderEmptyBlock(input: EmptyBlockInput): string`；`EmptyBlockInput extends EmptyStateInput`，另有 `readonly title?: string`（`blocks.ts:706-708`） | HTML 字符串 |
| `renderEmptyState` | `base-paint` | `packages/base-render/src/controls.ts:1415` | 空态本体 | `(input: EmptyStateInput): string`；`EmptyStateInput = { icon?: string; text: string; hint?: string; actionHtml?: string }`（`src/spec/index.ts:123-124`） | HTML 字符串 |
| `renderErrorReceipt` | `base-paint` | `packages/base-render/src/controls.ts:1443` | 异常回执（提示块） | `(input: ErrorReceiptInput): string`；`ErrorReceiptInput = { message: string; retryPrompt?: string; dataText?: string; logText?: string; dataActionId?: string; logActionId?: string }`（`src/spec/index.ts:125-126`） | HTML 字符串 |
| `renderToast` | `base-paint` | `packages/base-render/src/controls.ts:187` | 提示条（静态渲染） | `(input: ToastInput): string`；`ToastInput = { msg: string; detail?: string; icon?: ToastIcon; badge?: ToastBadge; actions?: readonly ToastAction[]; count?: string; lines?: readonly string[]; code?: string; timeoutMs?: number; maxStack?: number }`（`src/spec/index.ts:114,117`） | HTML 字符串 |
| `renderKpiCard` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:278` | KPI 卡本体——**`KpiCardInput` 的唯一渲染器**：回执页的状态卡返回的就是 `KpiCardInput` 数据对象（`packages/skill-calorie/src/shared/receiptParts.ts:21` 的 `statusCard`，形状在 `blocks.ts:268`），没有这一件，状态卡出不了 HTML，故它是回执页的必需件 | `renderKpiCard(input: KpiCardInput): string`；`KpiCardInput = { readonly label: string; readonly value: string; readonly unit?: string; readonly detail?: string; readonly status?: StatusKind; readonly statusText?: string }`（`blocks.ts:268-275`）；`value` 带 `tnum`，非法 `status` 由冻结语义降级 `empty`（`blocks.ts:277`） | HTML 字符串 |
| `renderKpiGrid` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:305` | 多张 KPI 卡的外层排布 | `renderKpiGrid(cards: readonly KpiCardInput[]): string` | HTML 字符串 |
| `renderTocBlock` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:242` | 目录区块（名字与签名已核，块体未读，职责一句是推的） | `renderTocBlock(input: TocBlockInput): string`；`TocBlockInput`（`blocks.ts:236`） | HTML 字符串 |
| `renderCaliberLine` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:260` | 口径行（签名已核，块体未读） | `renderCaliberLine(text: string): string` | HTML 字符串 |
| `renderListRows` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:439` | 行列表——回执页「逐条明细」的现成件（名字与签名已核，块体未读） | `renderListRows(input: ListRowsInput): string`；`ListRowsInput`（`blocks.ts:433`） | HTML 字符串 |
| `renderDetailSection` | `base-paint/blocks` | `packages/base-render/src/blocks.ts:527` | 明细段——回执页「明细段」的现成件（名字与签名已核，块体未读） | `renderDetailSection(input: DetailSectionInput): string`；`DetailSectionInput`（`blocks.ts:505`） | HTML 字符串 |

### 1.4 复制与文本构建（宿主侧）

| 导出名 | 导入路径 | 来源 | 职责 | 签名要点 | 产物形状 |
| --- | --- | --- | --- | --- | --- |
| `buildDataText` | `base-paint` | `packages/base-render/src/text.ts:434` | 复制数据文本构建（envelope 逐 shape 投影 → text／json／csv） | `(input: DataTextInput): string`；`DataTextInput = { readonly envelope: SerializableEnvelope; readonly format?: CopyFormat; readonly title?: string; readonly occurredAt?: string }`（`src/spec/text.ts:58-66`） | 字符串（text／json／csv 三种口径） |
| `buildLogText` | `base-paint` | `packages/base-render/src/text.ts:470` | 日志文本构建（6 段：场景标识／AI 思考链／数据结构／调用链／时间戳版本／异常） | `(input: LogTextInput): string`；`LogTextInput = { readonly envelope: SerializableEnvelope; readonly format?: CopyFormat; readonly copyLog?: CopyLogFields }`（`src/spec/text.ts:68-73`） | 字符串 |
| `copyText` | `base-paint` | `packages/base-render/src/controls.ts:341` | 复制编排（剪贴板 ＋ 兜底通道 ＋ 提示条） | `(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`；`CopyPorts = { clipboard: ClipboardChannel \| null; fallback: (text: string) => boolean; toast?: ToastHostPort }`，`CopyTextOutcome = { ok: boolean; channel: CopyChannel \| null; reason?: string }`（`src/spec/index.ts:97,99,101`） | 数据对象（异步） |
| `createCopyRuntime` | `base-paint` | `packages/base-render/src/controls.ts:393` | 复制运行时封装（`copyText` ＋ `dispose`） | `(ports: CopyPorts): CopyRuntime`；`CopyRuntime = { copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }`（`src/spec/index.ts:102-103`） | 数据对象 |
| `bindCopyAction` | `base-paint` | `packages/base-render/src/controls.ts:437` | 把页内 `data-action-id` 按钮绑到复制动作 | `(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }`；`CopyActionHostPort = { listActionIds(): readonly string[]; readDataText(actionId: string): string \| undefined; onActivate(actionId: string, handler: () => void): () => void }`（`src/spec/index.ts:104,107-108`） | 数据对象 |
| `createToastController` | `base-paint` | `packages/base-render/src/controls.ts:249` | 提示条挂载控制（`show／flush／dispose`） | `(port: ToastHostPort): ToastController`；`ToastHostPort = { mount(html: string): { remove(): void } }`（`src/spec/index.ts:115-116,118`） | 数据对象 |

第二节的契约类型与常量见下。

### 1.5 区块层的再导出面（走 `base-paint/blocks` 的页面作者都受它影响）

`packages/base-render/src/blocks.ts:1326` 一行再导出四个常量：`ACTION_ID_ATTR`、`COPY_ACTION_IDS`、`DEFAULT_DATA_ATTR`、`TOAST_DEFAULTS`；`:1327-1334` 再导出六个类型：`ActionBarInput`、`CopyButtonInput`、`EmptyStateInput`、`ErrorReceiptInput`、`StatusKind`、`ToastInput`。凡按 `base-paint/blocks` 写页面的作者，这十个名字都拿得到——第一节里凡「来源」写 `blocks.ts` 的类型与 `data-*` 属性名，实际可从这个再导出面取，不必回根出口。出书面即此两行；四个常量的取值与六个类型各自的字段形状**未读**。

## 二、契约类型清单（spec）

`spec/` 目录只许类型与纯数据常量（禁函数体、禁副作用、禁第三方 import、禁 `node:`、禁运行时 import base-link-core，只许 `import type`）——`packages/base-render/src/spec/index.ts:6-7`。`SPEC_FROZEN_SURFACE` 是冻结面的机器可读唯一真相源，文档签名表是它的投影（`src/spec/index.ts:9-11`）。

### 2.1 汇总入口 `src/spec/index.ts`（**整读**，共 188 行）

| 名字 | 文件:行号 | 它约束什么 | 读法 |
| --- | --- | --- | --- |
| （子文件再导出） | `src/spec/index.ts:18-23` | 依次汇总 `template`／`style`／`controls`／`text`／`charts`／`help` 六个子文件的全部导出 | 整读 |
| `BASE_PAINT_CONTRACT_VERSION` | `src/spec/index.ts:26` | 契约版本常量，值 `'0.1.0'`；与 `RENDER_CONTRACT_VERSION`／`ENVELOPE_VERSION` 同值，漂移由签名测试钉死 | 整读 |
| `FrozenSurfaceKind` / `FrozenSurfaceStatus` / `FrozenSurfaceSection` / `FrozenSurfaceTicket` | `src/spec/index.ts:28-31` | 冻结面条目的分类枚举：`'runtime' \| 'type'`、`'implemented' \| 'pending'`、section `'3.1'…'7'`、ticket `'#74'…'#92'` | 整读 |
| `FrozenSurfaceEntry` | `src/spec/index.ts:33-42` | 单条冻结面条目形状：`{ name, kind, ticket, status, section, signature }`；`status: 'pending'` 表示留给执行票实现 | 整读 |
| `SPEC_FROZEN_SURFACE` | `src/spec/index.ts:44-188` | 冻结面清单本体，共 **130 条**，逐条带逐字签名；分布：§3.1 占位符与填充器 25 条（`:46-70`）／§3.2 共享样式资产 8 条（`:73-80`）／§3.3 控件层 44 条（`:83-126`，即入口注释所称「冻结面 44 条」，见 `src/index.ts:15`）／§3.4 复制文本序列化 24 条（`:129-152`）／§3.5 图表层与 HELP 壳 27 条（`:155-181`）／§5 版本机制 1 条（`:184`）／§7 签名测试 1 条（`:187`）。其中 `kind: 'type'` 共 **42 条**，其余 88 条为 `kind: 'runtime'` | 整读 |

### 2.2 写入域页面直接受约束的条目（行号均在 `src/spec/index.ts`，**整读**）

| 名字 | 行号 | 它约束什么 |
| --- | --- | --- |
| `TEMPLATE_MARKERS` | `:46` | 六个占位符字面量：`injectData`／`content`／`sharedHelpers`／`sharedCss`／`chartsHelpers`／`noShared` |
| `MARKER_RULES` / `PAYLOAD_SLOT_RULE` | `:47-48` | 各标记的出现次数规则；载荷槽 `injectData` 与 `content` **恰一个**（冲突码 `marker-conflict`，缺失码 `marker-missing`） |
| `TEMPLATE_KINDS` / `TemplateKind` / `TEMPLATE_KIND_RULE` | `:49-51` | 分型三选一：`data-page`（必 `injectData`）／`content-page`（必 `content`）／`legacy`（两者皆禁） |
| `INJECTION_ORDER` | `:52` | 注入顺序：sharedHelpers → sharedCss → chartsHelpers → injectData |
| `ASSET_WRAP_RULE` / `ASSET_WRAPPERS` / `ASSET_MARKER_KEYS` / `WRAP_PREDICATES` | `:53-56` | 资产必须裸文本传入、由填充器包裹 `<style>`／`<script>`；预先包好＝`marker-conflict` |
| `DEFAULT_DATA_SCRIPT_ID` / `DATA_SCRIPT_TYPE` / `CONTAINER_CHECK_RULE` | `:57-59` | 数据槽容器固定为 `id="payload"`、`type="application/json"` |
| `STRICT_ENVELOPE_FIELDS` | `:60` | 严格口径下 envelope 必填五字段：`version`／`skill`／`shape`／`key`／`data` |
| `STRICT_ENVELOPE_SHAPES` | `:61` | 六形状：`list`／`detail`／`stat`／`receipt`／`analysis`／`fallback`（回执页即用 `receipt`） |
| `TEMPLATE_ERROR_CODES` / `TEMPLATE_CHECK_ORDER` | `:62-63` | 八个错误码与八步检查次序（`content-missing` 在末位前） |
| `TemplateAssets` / `FillTemplateInput` / `FillTemplateReport` / `FillTemplateOutput` / `FillTemplate` / `fillTemplate` | `:64-69` | 整页装配的输入／输出契约（见第一节 1.1 `fillTemplate` 行） |
| `TemplateErrorShape` | `:70` | 填充异常形状 `{ name: 'TemplateError'; code; marker?; message }`；`TemplateError` 类**不在** `base-paint` 导出面（`src/index.ts:12-13`），调用方按 `name`／`code` 判定 |
| `CSS_VAR_TOKENS` | `:73` | 11 个设计变量取值（`--fg`／`--fg2`／`--fg3`／`--bg`／`--card`／`--line`／`--blue`／`--blue2`／`--soft`／`--ok`／`--shadow`） |
| `STYLE_SHEET_ID` / `CONTROL_STYLE_SECTIONS` / `STYLE_FORBIDDEN_TOKENS` | `:74-76` | 样式表 id `'ilife-base'`；八个控件样式段名（`toast`／`actionBar`／`copyButton`／`statusBadge`／`emptyState`／`errorReceipt`／`charts`／`helpShell`）；禁用 token `--r-xl`／`--pink` |
| `StyleSheetInput` / `StyleSheetOutput` / `BuildStyleSheet` / `buildStyleSheet` | `:77-80` | 样式表产出契约（`extraCss` 语义被限死为技能作用域 token 覆盖块） |
| `ESCAPE_HTML_CHARS` / `ESCAPE_HTML_ENTITIES` | `:83-84` | 五个转义字符与实体表 |
| `COPY_CHANNELS` / `COPY_TEXT_DEFAULTS` | `:85-86` | 两个通道 `'clipboard' \| 'fallback'`；缺省文案「已复制／粘贴给 AI」「复制失败／长按选择文本手动复制」 |
| `TOAST_ICONS` / `TOAST_DEFAULTS` | `:87-88` | 五个图标；缺省 `role: 'status'`、`ariaLive: 'polite'`、`timeoutMs: 4500`、`maxStack: 5`、移动端 `3`／`820px` |
| `ACTION_BAR_KINDS` / `ACTION_BAR_DEFAULTS` | `:89-90` | 三种按钮 `'primary' \| 'red' \| 'ghost'`；缺省标签「复制数据」「复制日志」，`ghostOwnRow: true`、`evenRowPairs: 2` |
| `STATUS_KINDS` / `STATUS_DEFAULT_TEXT` | `:91-92` | 四种状态 `'ok' \| 'warn' \| 'danger' \| 'empty'` 与缺省文案「成功／警告／失败／无数据」 |
| `CONTROLS_ERROR_CODES` / `CONTROL_NAMES` / `CONTROLS_HOST_REQUIREMENT` / `CONTROL_AVAILABILITY` | `:93-96` | 错误码 `'bad-input' \| 'bad-format'`；六控件名（`toast`／`copyText`／`actionBar`／`statusBadge`／`emptyState`／`errorReceipt`）；宿主要求 `'none'` |
| `CopyPorts` / `CopyTextOptions` / `CopyTextOutcome` / `CopyText` / `copyText` | `:97-101` | 复制编排契约（端口、选项、结果三元组） |
| `CopyRuntime` / `createCopyRuntime` / `CopyActionHostPort` / `BindCopyAction` / `bindCopyAction` | `:102-108` | 运行时与页内动作绑定契约 |
| `ACTION_ID_ATTR` / `COPY_ACTION_IDS` | `:105-106` | 属性名 `'data-action-id'`；四组固定 id：动作条 `ilife-copy-data`／`ilife-copy-log`，错误回执 `ilife-error-copy-data`／`ilife-error-copy-log` |
| `SharedHelpersInput` / `DEFAULT_DATA_ATTR` / `BuildSharedHelpersJs` / `buildSharedHelpersJs` / `SHARED_HELPERS_JS_RULE` | `:109-113` | 共享 helpers JS 的输入与四条自约束（自包含／幂等／允许 DOM／禁全局赋值、禁 node 内置） |
| `ToastInput` / `ToastHostPort` / `ToastController` / `renderToast` / `createToastController` | `:114-118` | 提示条三段契约 |
| `ActionBarInput` / `renderActionBar` / `StatusBadgeInput` / `renderStatusBadge` / `EmptyStateInput` / `renderEmptyState` / `ErrorReceiptInput` / `renderErrorReceipt` | `:119-126` | 动作条、状态徽标、空态、错误回执四控件的输入与产出 |
| `COPY_FORMATS` / `SERIALIZABLE_SHAPES` | `:129-130` | 三种复制格式 `'text' \| 'json' \| 'csv'`；五种可序列化形状（六形状去掉 `fallback`） |
| `LOG_SECTIONS` / `LOG_SECTION_TITLES` / `LOG_UNKNOWN_PLACEHOLDER` | `:131-133` | 日志六段与中文标题表；缺省占位 `'(未知)'` |
| `TEXT_EMPTY_PLACEHOLDER` / `TEXT_SENSITIVE_MASK` / `TEXT_HEADER_TEMPLATE` | `:134-136` | `'未填写'`／`'****'`／`'【{skill} · {key}】'` |
| `TEXT_JSON_INDENT` / `TEXT_JSON_LT_RULE` / `CSV_DIALECT` | `:137-139` | 缩进 `2`；json 口径 `<` 写成 `u003c` 防断标签；CSV 方言（逗号／双引号／`""` 转义／LF／表头 `section,row`） |
| `TEXT_ERROR_CODES` | `:140` | `'shape-unsupported' \| 'structure-invalid' \| 'format-unknown'` |
| `SerializableEnvelope` / `DataTextInput` / `LogTextInput` / `CopyLogFields` | `:141-144` | 复制文本与日志文本的输入契约 |
| `LOG_SECTION_SOURCES` | `:145` | 六段各自的数据来源；`scene` 由 envelope 派生，`timestampVersion` 取 `copyLog.timestamp` |
| `DataProjectionSpec` / `DATA_TEXT_PROJECTIONS` | `:146-147` | 逐 shape 的复制文本投影：`stat`→`metrics`／`list`→`items`＋`total`／`detail`→`item`／`receipt`→`ok`＋`message`（回执页用这条）／`analysis`→`summary` |
| `BuildDataText` / `buildDataText` / `BuildLogText` / `buildLogText` | `:148-151` | 两个文本构建函数的签名 |
| `SENSITIVE_ROW_RULE` | `:152` | 敏感行判定：`{ text: string, sensitive: true }` 形态判为敏感行，三种格式一律输出 `'****'`，text 口径再跟一行「（敏感字段已脱敏）」 |
| `ChartItem` / `ChartOutput` / `ChartsApi` / `charts` / `CHART_KINDS` / `CHARTS_STYLE_ID` / `CHART_*_RULE` / `CHART_BREAKPOINTS` / `CHART_PALETTE` / `CHART_ERROR_CODES` | `:155-162,170-173` | 图表层契约（写入域页面不用，列此仅为边界） |
| `SCENE_STATUS` / `SCENE_TYPE_FIELD` / `SCENE_DATA_SCHEMA` / `HELP_SHELL_ID` / `HELP_COPY_TARGETS` / `HELP_COPY_ACTIONS` / `HELP_SCHEMA_ERROR_CODES` / `SceneData` / `Scene` / `HelpShellInput` / `RenderHelpShell` / `renderHelpShell` | `:163-169,174-178` | HELP 壳契约（写入域页面不用，列此仅为边界） |
| `ChartsHelpersInput` / `BuildChartsHelpersJs` / `buildChartsHelpersJs` | `:179-181` | 图表 helpers JS 契约 |

### 2.3 子文件 `src/spec/*.ts`

| 文件 | 行数 | 读法 | 它约束什么 |
| --- | --- | --- | --- |
| `src/spec/text.ts` | 153 行 | **整读** | §3.4 全部条目：`COPY_FORMATS:12`、`CopyFormat:14`、`SERIALIZABLE_SHAPES:18`、`SerializableShape:20`、`SerializableEnvelope:22`、`LOG_SECTIONS:25`、`LogSection:27`、`LOG_SECTION_TITLES:29-36`、`CopyLogFields:39-45`、`LOG_SECTION_SOURCES:49-56`、`DataTextInput:58-66`、`LogTextInput:68-73`、`LOG_UNKNOWN_PLACEHOLDER:76`、`TEXT_EMPTY_PLACEHOLDER:78`、`TEXT_SENSITIVE_MASK:79`、`TEXT_HEADER_TEMPLATE:81`、`SENSITIVE_ROW_RULE:97-103`、`DataProjectionSpec:106-115`、`DATA_TEXT_PROJECTIONS:120-126`、`TEXT_JSON_INDENT:127`、`TEXT_JSON_LT_RULE:129`、`CSV_DIALECT:131-137`、`TEXT_ERROR_CODES:139`、`TextErrorCode:141`、`TextErrorShape:143-147`、`BuildDataText:150`、`BuildLogText:153` |
| `src/spec/style.ts` | 63 行 | grep | 只在地毯式定位中命中 `STYLE_SHEET_ID:29`；其余条目与 `src/spec/index.ts:73-80` 对齐 |
| `src/spec/template.ts` | 362 行 | 未读（由 `src/spec/index.ts:18` 汇总） | §3.1 的 25 条（占位符、分型、资产包裹、envelope 五字段、八错误码） |
| `src/spec/controls.ts` | 390 行 | 未读（由 `src/spec/index.ts:20` 汇总） | §3.3 的 44 条（六个控件 ＋ 复制编排的输入／输出与缺省常量） |
| `src/spec/charts.ts` | 273 行 | 未读（由 `src/spec/index.ts:22` 汇总） | §3.5 图表层与 HELP 壳的数据契约 |
| `src/spec/help.ts` | 281 行 | 未读（由 `src/spec/index.ts:23` 汇总） | §3.5 HELP 壳的 `SceneData`／`Scene` 等 |

**行数口径（本轮改）**：本表五个数字已按 `src/spec/*.ts` 源码实测重取（LF 计数）。上一版报的 49／255／283／227／246 没有回源实测，五个全错；第四节第 6 条曾把这五个错数中的四个又抄了一遍，同已更正。

## 三、明显用不上的（只列名字，供排除）

写入域页面（采集页／回执页）与下列组件无关，故不进第一节，仅列名排除：

- 图表层（`base-paint`）：`charts`、`ChartsApi`、`ChartItem`、`ChartOutput`、`buildChartsHelpersJs`、`ChartsHelpersInput`、`chartsCss`（`src/charts.ts:1752`）、`CHART_KINDS`、`CHART_PALETTE`、`CHART_BREAKPOINTS`、`CHART_STRUCTURE_RULE`、`CHART_EMPTY_RULE`、`CHART_COORD_RULE`、`CHART_ERROR_CODES`、`CHARTS_STYLE_ID`；以及区块层的 `renderChartBlock`（`src/blocks.ts:394`）、`ChartBlockInput`（`src/blocks.ts:387`）。
- HELP 壳：`renderHelpShell`（`src/help.ts:675`）、`HelpShellInput`、`RenderHelpShell`、`SceneData`、`Scene`、`SCENE_STATUS`、`SCENE_TYPE_FIELD`、`SCENE_DATA_SCHEMA`、`HELP_SHELL_ID`、`HELP_COPY_TARGETS`、`HELP_COPY_ACTIONS`、`HELP_SCHEMA_ERROR_CODES`、`renderHelpShellHtml`（`src/helpShell.ts:73`）、`composeDocTitle`（`src/helpShell.ts:66`）。
- 注入器／页面注册表／存盘（`base-paint` 根）：`mountInjector`、`openPage`、`MountHandle`、`MountOptions`、`SlotsPort`、`TabEntry`、`TabScope`、`TabSeed`、`createPageRegistry`、`pageOrReco`、`recoDescriptor`、`PageDescriptor`、`PageKind`、`PageRegistry`、`renderPage`、`renderReco`、`RenderError`、`RenderErrorCode`、`RenderOutput`、`RENDER_CONTRACT_VERSION`、`RENDER_ENVELOPE_VERSION`、`escapeHtml` 之外的契约面常量、`saveHtmlFile`、`reuseWindowOfHours`、`helpReuseWindowOf`。

## 四、没能确认的事

1. **`controls.ts` 只读到声明行与冻结面签名，未读实现体**：`renderToast`（`src/controls.ts:187`）、`createToastController`（`:249`）、`copyText`（`:341`）、`createCopyRuntime`（`:393`）、`bindCopyAction`（`:437`）、`buildSharedHelpersJs`（`:587`）、`renderActionBar`（`:1361`）、`renderStatusBadge`（`:1405`）、`renderEmptyState`（`:1415`）、`renderErrorReceipt`（`:1443`）的产出的实际 DOM 类名与行为细节未经我逐字核对，第一节该列签名取自 `src/spec/index.ts` 冻结面条目。
2. **被主签名引用但未单列的类型的字段形状未确认**：`ClipboardChannel`／`CopyButtonInput`／`ToastAction`／`ToastBadge`／`CopyToastText`／`CopyChannel`／`StatusKind`／`ActionBarButton`／8 个 `*ChartInput`／`SceneGroup` 等——`src/spec/index.ts:13-15` 声明它们以 `src/spec/*.ts` 为唯一真相源，而 `spec/controls.ts` 等子文件我未读。
3. **`CopyFormatTexts` 的形状未确认**：`renderCopyBlock` 的 `dataFormats`（`src/blocks.ts:732`）与 `CopyButtonInput.formats` 的关系只见于注释（`src/blocks.ts:729-732`、`:754`），字段名与三格式文本的取值键未读源码。
4. **`renderParamForm` 640 行之后的分支未读**：`select` 分支、`placeholder = hint`、`required` 落 `data-required` 等只见于 `src/blocks.ts:622-626` 的注释，产物类名（`blockPart('paramForm', …)`）未逐字核对。
5. **区块层另有六个导出：本轮已补进第一节（改前只写「未进第一节」）。** `renderKpiCard`（`src/blocks.ts:278`）与 `renderKpiGrid`（`:305`）是**回执页的必需件**——`KpiCardInput`（`:268`）的唯一渲染出口就是 `renderKpiCard`，而回执页的状态卡（`packages/skill-calorie/src/shared/receiptParts.ts:21` 的 `statusCard`）返回的正是 `KpiCardInput`；不收它，状态卡就出不了 HTML。`renderTocBlock`（`:242`）、`renderCaliberLine`（`:260`）、`renderListRows`（`:439`）、`renderDetailSection`（`:527`）四件也已收进第一节，但**只核到声明行与签名，块体未读**（`renderListRows` 与 `renderDetailSection` 的块体在 `src/blocks.ts:426-572`，回执页要「明细段／行列表」即取这两件，不是条件句）。区块层自身的再导出面（`src/blocks.ts:1326` 与 `:1327-1334`）上一版全文未提，现已补进第一节 §1.5。`renderChartBlock`（`:394`）同类但已归第三节。
6. **`spec/` 四个子文件未读**：`src/spec/template.ts`（362 行）、`src/spec/controls.ts`（390 行）、`src/spec/charts.ts`（273 行）、`src/spec/help.ts`（281 行）——行数已按源码实测重取（上一版抄的 255／283／227／246 是旧数，与本件 §2.3 一并更正）；第二节对它们只写「未读」，内容由汇总入口 `src/spec/index.ts:18-23` 与各条冻结面签名侧证。
7. **文件体量与简报口径不一致**：任务简报给的体量（`blocks.ts` 1300 行、`style.ts` 1311 行、`template.ts` 431 行、`text.ts` 493 行、`index.ts` 41 行、`spec/index.ts` 189 行、`spec/text.ts` 154 行）与我实测的总行数不符——`src/blocks.ts` 实测 1334 行、`src/index.ts` 40 行、`src/spec/index.ts` 188 行、`src/spec/text.ts` 153 行；`style.ts`／`template.ts`／`text.ts` 我只取到非空行数（1167／353／398），未取总行数。本报告所有行号以真实文件的行号为准（与 grep 输出一致）。同一处不一致上一版**只修了一半**——`spec/*.ts` 五个子文件的行数没有回头核，现已按实测重取（见 §2.3 与第四节第 6 条）。
8. **`BLOCK_STYLE_SECTIONS` 的成员未逐字抄录**：只读到声明行 `src/blocks.ts:145`，段名数组的成员未读，故第一节只写职责不写成员。

## 修订记录

按 `t406-勘察件-对抗审查-新仓.md` 整改。

- 审查报告第三节第 2 条（第五节须改 3）→ 第一节 §1.3 表 → 补收 `renderKpiCard`（`blocks.ts:278`）与 `renderKpiGrid`（`:305`）两行，并写明 **`KpiCardInput` 的唯一渲染器就是 `renderKpiCard`**、回执页状态卡（`receiptParts.ts:21` 的 `statusCard`）返回 `KpiCardInput`，故它是回执页的必需件；同表另补收 `renderTocBlock`（`:242`）、`renderCaliberLine`（`:260`）、`renderListRows`（`:439`）、`renderDetailSection`（`:527`）四行，并标注「只核到声明行与签名，块体未读」。
- 审查报告第三节第 2 条（同条）→ 第一节新增 §1.5 → 补上区块层自身的再导出面 `blocks.ts:1326`（`ACTION_ID_ATTR`／`COPY_ACTION_IDS`／`DEFAULT_DATA_ATTR`／`TOAST_DEFAULTS`）与 `:1327-1334`（六个类型），并写明这四个常量的取值与六个类型的字段形状未读。
- 审查报告第三节第 2 条（同条）→ 第四节第 5 条 → 由「只由 grep 见到声明行，故未进第一节」＋「若回执页要明细段或行列表需补读」改写为「已补进第一节」；「明细段／行列表」由条件句改成直陈的回执页写法。
- 审查报告第三节第 4 条（第五节随改 4）→ §2.3 行数列 ＋ 第四节第 6 条 ＋ 第四节第 7 条 → `spec/*.ts` 五个行数由 49／255／283／227／246 改为实测 63／362／390／273／281，并新增「行数口径」一句写明上一版五个数字全错、第 6 条曾把其中四个又抄一遍。
- 审查报告第三节第 6 条（第五节随改 4）→ 第三节「明显用不上的」里的 `chartsCss` 行号 → `src/charts.ts:1749` 改为 `src/charts.ts:1752`。
