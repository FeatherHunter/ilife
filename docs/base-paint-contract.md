# 规格：base-* 共享层契约（冻结版 v1）

## 0. 地位与依据

**本文件是 #92（母图 #63 的 79a）的冻结契约正本。** 冻结在前，实现（#74／#75／#76／#77／#78）在后，收口（#79）在最后：本文与 `packages/base-render/src/spec/*.ts` 是 #74–#78 的施工图，执行票**只许按此实现，不许自造签名**。

依据（全部为可追溯的上位文件）：

| 来源 | 内容 | 本契约的用法 |
|---|---|---|
| `#73` 裁决评论 | B1–B8 | B1 逐条对照旧 v1.30；B2 复制序列化保留、snapshot 不移植；B3 base-paint 统一填充；B4 去图表白名单例外；B5 `08 规范` 不移植；B6 HELP＝HTML 速查台；B7 表单交互控件归插件 client；B8 三包统一版本 |
| `#66` 裁决评论 | Q8／Q12／Q13／Q14 | Q8 不引入 `status`，以 envelope `shape` 为准；Q12 主色锁 B1；Q13 复制走双通道；Q14 不引入 `--r-xl`／`--pink`／深色区 |
| `docs/calorie-architecture.md` | Implementation Decisions（共享层归属三类、零运行时依赖、占位符注入、主题接缝、区块组件）＋ Testing Decisions（共享层模块边界＝接缝） | 归属边界（§4）与签名测试（§7）的判据 |
| `docs/research/t72-shared-layer-gap.md` §6 | 冻结边界规则表 | §4 的 8 条边界 |
| `docs/research/t92-architect-calls.md`（FX-21 归档正本；原路径 `.scratch/t92/ARCHITECT-CALLS.md` 是**归档前**的旧位置，已不引用、勿据此取件） | AC-1…AC-17（17 条条文） | 逐条落进 §1–§6，索引见下表。**注意**：`docs/research/t92-architect-rulings.md` 是 FX 返修裁定单，**不含**任何 `## AC-` 条文，不得作为 AC 出处 |
| `docs/research/t92-old-v130-signatures.md` | 旧 v1.30 逐节签名（246 行表／353 处 `文件:行号` 证据） | §2 对照表与 §3 各节「旧侧对应物」 |
| `docs/research/t92-base-exports-actual.md` | 新 base-* 三包实测出口面（33 运行时 ＋ 20 类型）＋ t72 判定复核（26 项仍成立） | §2 判定列的证据基准 |

### 0.1 裁定落点索引

| 裁定 | 落点 |
|---|---|
| AC-1 命名 `injector` 专指侧栏装配 | §1 |
| AC-2 `metaHeader`／`remindersBlock` 不移植 | §2（#24）、§4.2 |
| AC-3 scene-data 取 `types` | §3.5、§4.3 |
| AC-4 机读 schema 唯一权威 | §3.5 |
| AC-5 复制序列化输入对齐 envelope `shape` | §3.4 |
| AC-6 去掉图表白名单例外、保留 `CHARTS-HELPERS` 语义 | §3.1、§3.5 |
| AC-7 隐式全局必须显式化 | §3.3、§4.1 |
| AC-8 B7 控件归属边界 | §4.1 |
| AC-9 样式资产起点＝旧 token A 组 11 个 | §3.2 |
| AC-10 版本机制 | §5 |
| AC-11 交付物边界（只冻结不实现） | §0.2、§6 |
| AC-12 `INJECT-DATA` 认领 | §3.1 |
| AC-13 不得运行时依赖 link-core（L15） | §3 开头、§4.1 |
| AC-14 `escapeHtml` 口径归一五字符 | §3.3 |
| AC-15 与 #95／#96／#104／#80 的交接 | §4.4、§5、§6 |
| AC-16 控件无宿主可用 ＋ 与 #90 同签名 | §3.3 |
| AC-17 图表逐条对照 ＋ HELP 壳可复用 | §3.5、§6.4 |

### 0.2 冻结与实现的边界（AC-11）

- 本票**只冻结**：文档 ＋ `src/spec/*.ts`（type-only 类型 ＋ 纯数据常量）＋ 签名测试 ＋ `src/index.ts` 的**追加**导出 ＋ changeset。
- 本票**不实现**：`fillTemplate`、控件运行时、图表渲染、HELP 壳渲染、任何技能包迁移。清单里 `status: pending` 的条目就是执行票的施工面。
- 类型层与运行时层的对应关系由机器断言绑死：`SPEC_FROZEN_SURFACE`（唯一清单）↔ 本文 §3 标记区表格 ↔ `test-d/contract-signatures.ts` 的类型断言；**运行时条目的值**再由 `test/contract-signatures.test.mjs` 逐值断言（含 FX-20 的 27 条，见 §7），因此「改值不改清单」同样会红（FX-20）。
- **两物区分（不可混称）**：`packages/base-render/src/spec/` = **冻结的共享层契约类型**（本文 §3 的施工面，type-only ＋ 纯数据常量）；`packages/base-render/src/contract.ts` = **既有渲染契约**（envelope → HTML 的 `renderPage`／`renderReco`／`escapeHtml`／`RenderError`）。两者语义不同、不得互相 import 实现：`spec/` 只描述 #74–#78 要实现的签名，`contract.ts` 是已存在的运行时。
- **清单覆盖面口径（V1 洞 15 处置）**：`SPEC_FROZEN_SURFACE` 锁的是**主签名**（每条 = 一个对外名字）；被主签名引用但未单列的类型（`ClipboardChannel`／`CopyButtonInput`／`ToastAction`／8 个 `*ChartInput`／`SceneGroup` 等）以 `packages/base-render/src/spec/*.ts` 为**唯一真相源**，其形状变更视同签名变更（须走 changeset ＋ 三处同步），不得另立第二份声明。其中 `CopyButtonInput` 的**必填** `actionId` 另由 `test-d` 的 `_C14b`／`_C14c` 锁形（FX-17①）。
- **术语口径（边界规则 8）**：术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页）；本契约用「sidebar 槽位装配」而非「侧边栏／前端页」，用「技能功能页」而非「面板页」。`CONTEXT.md` 尚未收录「复制指令」词条（§3.5.3 的对外文案口径），其词条补录登记见 §4.4。

### 0.3 一处基准口径冲突（显式声明）

`CONSTRAINTS.md` §4 的 D2 写「`packages/base-render/src/contracts/*.ts`」，`PHASE2-AUTHOR.md` §3 写「`packages/base-render/src/spec/*.ts`」。本契约按作者 brief 取 **`src/spec/`** 为正本，理由是 brief 逐文件指定了 7 个文件名，且 `contracts/` 与既有 `src/contract.ts`（渲染契约）只差一个字符，会把「冻结契约类型」与「既有渲染契约」两物混淆（正是 brief 明令要区分的）。`src/contracts/` **不存在**，不留转发别名（避免第二落点）。

## 1. 命名区分

**问题**：`packages/base-render/src/injector.ts` 现在是 **sidebar 槽位装配**（`mountInjector`／`SlotsPort`／`openPage`，`injector.ts:29-34,52,104`），而本图新增的是 **HTML 占位符填充器**——同名不同物。

**定调（AC-1）**：

1. `injector` 一词**专指 sidebar 槽位装配**。`packages/base-render/src/injector.ts` 职责不变、导出不变、语义不变（槽位端口／有界重试／path seed 打开）。
2. HTML 占位符填充器**不得**叫 injector：落点 `packages/base-render/src/template.ts`，对外名 **`fillTemplate`**，占位符常量与类型同文件。
3. 两者在类型层也是两套名字：`SlotsPort`／`TabSeed`／`MountHandle`（装配）vs `TemplateAssets`／`FillTemplateInput`／`FillTemplateReport`（填充）。**没有**任何类型同时属于两者。

**禁止用法清单**（出现即契约缺陷，Phase 3 直接判 A3 不通过）：

| 禁止写法 | 为什么禁止 | 正确写法 |
|---|---|---|
| `htmlInjector` | 把 HTML 填充器叫 injector | `fillTemplate` |
| `injectHtml` | 同上，且暗示「注入 HTML」而非「填占位符」 | `fillTemplate` |
| `injectPlaceholders` | 同上 | `fillTemplate` |
| `htmlTemplateInjector` | 同上 | `fillTemplate` |
| `mountTemplate`／`templateInjector` | 与槽位装配的 `mountInjector` 混称 | `fillTemplate` |
| `injector.ts` 内新增任何 HTML／字符串替换逻辑 | 破坏 AC-1 与 §4 边界 4 | 一律落 `template.ts` |

**允许且唯一的例外**：`STRICT_ENVELOPE_FIELDS`／`MARKER_RULES` 等常量名里出现 `TEMPLATE_`／`MARKER_` 前缀，不含 `inject` 字样；`INJECT-DATA` 是**占位符字面量**（`<!--INJECT-DATA-->`），不是函数名。

**票面口径对齐（V1 洞 14）**：票面 #74 所称「统一注入器 API」＝本契约的 **`fillTemplate`**（HTML 占位符填充器），**不是** `src/injector.ts`（sidebar 槽位装配）。执行者按票面字面搜 `inject*` 会撞上 §1 的禁令——禁令针对的是「给 HTML 填充器起 injector 系名字」，不是票面用词。

## 2. v1.30 逐条对照表

口径：**旧签名**逐字取自 `docs/research/t92-old-v130-signatures.md`（引 `文件:行号`）；**新判定**取 `new-exports-actual.md` §2 的实测复核（26 项判定全部仍成立，其中 #1／#4／#20／#25 的**理由与数字**已按该报告更正）；**新签名**是本契约冻结的施工面（`pending` = 由执行票实现）。「无」且决定不移植的，一律写明不移植理由，不留空。

| 节号 | 能力名 | 旧签名（逐字） | 新判定 | 新落点 | 新签名（逐字） | 备注 |
|---|---|---|---|---|---|---|
| §3 | 占位符标准与填充机制 | `<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->`／`<!--SHARED-CSS-->` 各「必须恰好 1」；`inject(template_text, payload, js_asset=None, css_asset=None, charts_asset=None, strict=False)` 返回 `(html, error)` | 部分 | `base-paint` `src/template.ts` | `fillTemplate(input: FillTemplateInput): FillTemplateOutput` | 实测：base-paint 18 出口零占位符 API；标记常量 5 份、恰一次校验 5 套错误码、`INJECT-DATA` 6 处存在但**填充者全仓不存在**（old §1 §3；new-exports §3.3）。**#118 补遗**：本行签名扩为**六标记**（`CONTENT` 收归）＋ 载荷槽规则 ＋ 包裹约定 ＋ 模板分型，见 §3.1.2 与 §4.5 |
| §3 | `NO-SHARED` 豁免 + `CHARTS-HELPERS` 占位符 | `<!--NO-SHARED-->` 0 或 1（与 SHARED 互斥）；`<!--CHARTS-HELPERS-->` 0 或 1 | 无 | `base-paint` `src/template.ts` | `MARKER_RULES.noShared.rule: 'zero-or-one-exempt'`；`MARKER_RULES.chartsHelpers.rule: 'zero-or-one'` | 实测 `packages/**` 两标记 0 命中（new-exports §3.1）；契约**认领**语义（AC-6／AC-12），实现待 #74 |
| §4 | payload 信封 + 结构校验 | `{ "status": "ok", "message": "(可选，失败时必有)", "data": { meta, scene, copy_log } }`；`--strict-payload` 缺必填 → error | 有 | `base-link-core`（保持，不移植旧字段） | `createEnvelope(input)`／`parseEnvelope(input)`／`assertShapeData(shape, data)`；`Envelope = { version; skill; shape; key; data }` | 能力对等且更严（缺即 throw）；**字段不兼容**：旧 `status/data.meta/scene` 不得直接搬（Q8；new-exports §1.1） |
| §5 | P0 守卫组 `esc/arr/val/yes/validate` | `esc(s)`／`arr(v)`／`val(v)`／`yes(v)`／`validate(p)` | 部分 | `base-paint` `escapeHtml` 归一（AC-14）＋ `base-link-core` 承担 `validate` | `escapeHtml(s: string): string`；口径 `ESCAPE_HTML_CHARS = readonly ['&', '<', '>', '"', "'"]` | 实测 `escapeHtml` **6 处**实现且转义集不一致（base-paint 只转 4 个）；`arr/val/yes` 零命中（new-exports §2#4） |
| §5.1 | toast 通用提示控件 | `toast(msg, detail?, options?)`；options 含 `icon/badge/actions/count/lines/code/timeout/maxStack`；堆叠 5（≤820px 收窄 3） | 无 | `base-paint` `src/spec/controls.ts`（实现落 `src/controls.ts`） | `renderToast(input: ToastInput): string`；`createToastController(port: ToastHostPort): ToastController` | 同名不同物：6 处 CLI `toast(msg){console.error}` 是 stderr 日志不是控件（new-exports §2#5） |
| §6.1 | snapshot 结构化接口 | `buildDataText(p, format?)`；`buildLogText(p, format?)`；`snapshot = {title, summary[], sections[]}` | 无 | `base-paint` `src/spec/text.ts` | `buildDataText(input: DataTextInput): string`；`buildLogText(input: LogTextInput): string` | B2：snapshot 结构接口**不移植**，输入改对齐 envelope `shape`（AC-5）；`format` 语义由本契约补全（§3.4） |
| §6.2 | 复制按钮三件套 `actionBar` | `actionBar(p, extra?, opts?) → HTML`；含场景按钮 + 复制数据／日志 ghost | 无 | `base-paint` `src/spec/controls.ts` | `renderActionBar(input: ActionBarInput): string` | 按钮规范（ghost 38%／min-height 40／偶数一行 2 个）冻结为 `ACTION_BAR_DEFAULTS`（new-exports §2#7） |
| §6.2 §6.8 | `copyText`（含反馈钩子） | `copyText(s, opts?)`；`opts.silent/toast/onOk/onFail`；clipboard + `_fbCopy` 兜底 | 无 | `base-paint` `src/spec/controls.ts` | `copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>` | Q13／AC-16：双通道逐字冻结，`ports.clipboard` 可为 null 直走 fallback；空串短路、失败徽章恒在 |
| §6.3 | `formPrompt` | `formPrompt(fields, template)` | 无 | **不移植**（B7 → 插件 client） | 不移植理由：页内参数表单 + 实时预览 + 空值拦截属**依赖宿主交互**，架构规格归属三类里判「插件 client」；base-paint 只提供静态呈现 + 复制（§4.1） | new-exports §2#9 零命中；AC-8 |
| §6.3 §6.7 | `selectList`（含行内 widget） | `selectList(items, batchActions?, opts?)`；`items[].widget`；`opts.onSubmit(selectedIds, values)` | 无 | **不移植**（B7 → 插件 client） | 不移植理由：勾选／批量／计数联动是状态化交互控件，需要宿主生命周期与事件循环；base-paint 不持交互状态（§4.1） | new-exports §2#10 零命中；AC-8 |
| §6.3 | `confirm` | `confirm({title, detail?, danger?, onOk})` | 无 | **不移植**（B7 → 插件 client） | 不移植理由：对话框是宿主模态交互（焦点陷阱／遮罩／键盘），归插件 client；写入确认由面板承担 | new-exports §2#11 零命中；AC-8 |
| §6.3 | `foldBox` | `foldBox(title, contentHtml)` | 无 | **不移植**（B7 → 插件 client） | 不移植理由：折叠是 DOM 状态与动画，属宿主交互；base-paint 产出的 HTML 不得自带脚本（AC-7 无隐式全局） | new-exports §2#12 零命中；AC-8 |
| §6.3 | `statusBadge`／`emptyState`／`errorReceipt` | `statusBadge(status, text?)`；`emptyState({icon?,text,hint?,action?})`；`errorReceipt({message,retryPrompt?,data?,log?,payload?})` | 部分 | `base-paint` `src/spec/controls.ts` | `renderStatusBadge(input: StatusBadgeInput): string`；`renderEmptyState(input: EmptyStateInput): string`；`renderErrorReceipt(input: ErrorReceiptInput): string` | 有视觉雏形无 API（memo-ilife `html.ts:20` `.hm-empty`）；`payload`／`window.__hmPayload` 兜底**删除**（AC-7），改显式 `dataText`／`logText` |
| §6.3 §6.9 | `smartSelect` | `smartSelect(inputEl, config) → {getState, getValue}` | 无 | **不移植**（B7 → 插件 client） | 不移植理由：字段级选择器持有 DOM 实例与 `dataset` 回填协议（29+8 守卫测试规模），属宿主交互面；base-paint 不碰 DOM | new-exports §2#14 零命中；AC-8 |
| §6.4 | token A 组 + 控件样式 | 旧文写「token A 组 12 变量」但只列 11 个名；`base.css:13-23` 实定义 11 个 | 部分 | `base-paint` `src/spec/style.ts` | `CSS_VAR_TOKENS`（11 个逐值，见 §3.2）；`buildStyleSheet(input?: StyleSheetInput): StyleSheetOutput` | AC-9 更正为 **11**；`--blue: #007aff` 与 Q12 锁定 B1 一致；实测 `STYLE_TOKENS` 恰 9 个（深色系），`style/tokens.css` 3 行不入包 |
| §6.5 | 图表组件 `charts.*` 8 接口 | `charts.bar/line/donut/progress/combo/sparkline/gauge/scatter(el, items\|pct\|{bars,lines}[, opt])` | 无 | `base-paint` `src/spec/charts.ts` | `ChartsApi`（8 方法，去掉 `el`，返回 `ChartOutput`，见 §3.5） | 全仓零 `<svg>`／`<canvas>`（new-exports §2#16）；B4 去白名单例外；逐条对照见 §3.5 |
| §6.6 | 复合形态 `combo`／`sparkline`／`gauge` | 签名同 §6.5；用途：柱+线／迷你趋势卡／弧形进度 | 无 | `base-paint` `src/spec/charts.ts` | `CHART_KINDS` 内含 `'combo' \| 'sparkline' \| 'gauge'`；各自独立 input 类型 | 形态原则：新形态独立成组件，共享同一 token／空态／双端规则（old §6.6 contract:245） |
| §7 | 注入器接口 `injector.py` | `python injector.py <模板.html> --payload <数据.json> [--output] [--js] [--css] [--charts] [--strict-payload] [--help-template]`；注入顺序 SHARED → CSS → CHARTS → DATA | 部分 | `base-paint` `src/template.ts`（HTML 侧）＋ `src/injector.ts`（槽位装配，**职责不变**） | `fillTemplate(input: FillTemplateInput): FillTemplateOutput`；`INJECTION_ORDER = readonly ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']` | AC-1 命名区分：`injector.ts` 是 sidebar 槽位装配，不处理 HTML 文本；缺 CLI／缺 `--strict`／缺结果 JSON 由 #74 补 |
| §6.5 | HELP 模板 + scene-data 契约 | `help_template.html` 611 行 + `scene-data-contract.md` + `scene_data.schema.json` + `validate_help_data` | 部分 | `base-paint` `src/spec/help.ts` | `renderHelpShell(input: HelpShellInput): FillTemplateOutput`；`SCENE_DATA_SCHEMA`（唯一机读权威） | B6 HTML 速查台；AC-3 取 `types`；AC-4 机读 schema 唯一权威；`base-combos/HELP.md:66-71` 缺陷属 #80 |
| §6.2 §9 | HELP 速查台一键复制指令 | 无显式签名（旧 `卡路里.html` 302KB 形态：点卡片 → 拼 prompt → 复制） | 无 | `base-paint` `src/spec/help.ts` ＋ `controls.copyText` | `HELP_COPY_TARGETS = readonly ['prompt', 'wakeWord', 'params']`；复制走 `copyText(text, ports, opts?)` | 判定（无）不变：`calorie.help.lookup` 已渲染速查列表但**零复制交互**（new-exports §6-4）；壳归共享层、数据归技能包（#88 消费） |
| §8 | 版本与变更机制 | 「签名变更 = 破坏性变更：全技能同步 + 一次性完成 + CHANGELOG 记录」 | 部分 | 仓库级（§5）＋ `base-paint` | `BASE_PAINT_CONTRACT_VERSION = '0.1.0'`；三包统一版本走 changesets `fixed` 组（#79 落地） | 现状三包各 `0.1.0`、4 个版本常量、1 条漂移单测、7 条 changeset（new-exports §5.2）；B8／AC-10 |
| §9 | `08 规范` | 「#248/08-HTML交互规范.md = prompt 参数格式／复制数据日志／按钮颜色布局的规范本体」 | 无 | **不移植**（B5） | 不移植理由：B5 明确不移植；新仓 `docs/` 递归无对应文档（new-exports §2#22）。按钮色／布局口径改由 `ACTION_BAR_DEFAULTS`／`CSS_VAR_TOKENS`／`CHART_BREAKPOINTS` 承载，**不引用外部规范文档** | 需维护者拍板是否另开票（§6 未决项） |
| §2 | 领域无关声明 | 「Base 等价物走 Base、图表走 charts.js、居家特定留技能侧」 | 有 | 保持（`base-link-core`＋`base-paint`） | 三包源码无领域词表：只认 `Envelope`／`PageDescriptor`／token／key 字面量 | new-exports §2#23 仍成立；本契约新增的类型同样零领域词（无「卡路里／记账／睡眠」字样） |
| §2 | 技能侧专属块 `metaHeader`／`remindersBlock` | 无契约签名（只有名字）；实现侧 `base.js:298-299` 存在 `metaHeader(p, m)`／`remindersBlock(p)` | 无 | **不移植**（AC-2） | 不移植理由：属「居家特定／技能专属块」，旧契约 `contract:61` 已判留技能侧；新架构分层管线里技能可保留自有页面模板，但**占位符填充必须走 base-paint**（B3／t72 §5.2） | 显式排除，不留「可能不存在」的模糊地带；零命中（new-exports §2#24） |
| §0 | 控件层测试资产 | 旧 `tests/` 4 份共 279 个 `test_` 函数（`test_components.py` 222） | 无 | 本票签名测试（§7）＋ #76 守卫测试 | `test-d/contract-signatures.ts`（编译期）＋ `test/contract-signatures.test.mjs`（运行时出口面锁） | 实测 `base-render/test/render.test.mjs` **132** 行（t72 记 133，已更正）；控件层零测试（new-exports §2#25） |
| §6.5 | 图表白名单例外 | 「卡路里 `weight_volatility_v2` canvas 留技能自营，走公共层 ISSUE 审批」 | 无 | **不移植**（B4） | 不移植理由：B4 去掉白名单例外——图表唯一实现住 base-paint；技能侧不得自建图表画布（`CHART_KINDS` 是闭集，`CHART_STRUCTURE_RULE = 'throw'`） | 新架构尚无图表层，例外机制无从谈起（new-exports §2#26）；本契约一并封死回归口 |

**计数：有 2 / 部分 7 / 无 17（合计 26 行），与 t72 §3 复核一致。**

**#118 补遗（非 v1.30 项，故不新增表行，只更新上表 §3 行）**：`<!--CONTENT-->` 是**新架构发明的槽位**（旧基线 73 个模板**零命中**），不属于 v1.30 的 26 项能力，因此本表恒为 26 行（由签名测试「§2 必须 26 行」钉死）；#118 的落点是 §3.1.2（正文槽位／载荷槽规则／包裹约定）与 §4.5（与旧基线的偏离记账）。

## 3. 冻结签名

**读法**：每节的「标记区表格」是本文的**机器可读投影**，由 `packages/base-render/test/contract-signatures.test.mjs` 与 `SPEC_FROZEN_SURFACE` 逐字比对；表格外是语义、失败行为、所属包与旧侧对应物。签名中的 `|` 在表格里转义为 `\|`，解析时还原。

**状态语义**：`implemented` = #92 已落地（类型或纯数据常量）；`pending` = 执行票实现，落地后**必须**把 `SPEC_FROZEN_SURFACE` 的 status 翻成 `implemented`，否则编译期断言 `Absent<>` 会失败。

**全局红线（AC-13）**：以下所有签名**只许** `import type` 消费 `base-link-core`；任何运行时调用都会同时打红 `check-boundaries.mjs` 的 L15（render 无运行时依赖）与 L23，即破坏 #96 的回归门。需要 envelope 校验的地方，一律由技能侧传入已校验数据，或用本契约自持的零依赖常量（`STRICT_ENVELOPE_FIELDS`／`STRICT_ENVELOPE_SHAPES`）实现。

### 3.1 占位符契约与统一填充器（#74）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `TEMPLATE_MARKERS` | runtime | #74 | implemented | 3.1 | `{ injectData: '<!--INJECT-DATA-->'; content: '<!--CONTENT-->'; sharedHelpers: '<!--SHARED-HELPERS-->'; sharedCss: '<!--SHARED-CSS-->'; chartsHelpers: '<!--CHARTS-HELPERS-->'; noShared: '<!--NO-SHARED-->' }` |
| `MARKER_RULES` | runtime | #74 | implemented | 3.1 | `Record<TemplateMarkerKey, MarkerRuleSpec>` |
| `PAYLOAD_SLOT_RULE` | runtime | #74 | implemented | 3.1 | `{ members: readonly ['injectData', 'content']; rule: 'exactly-one'; conflictCode: 'marker-conflict'; missingCode: 'marker-missing' }` |
| `TEMPLATE_KINDS` | runtime | #74 | implemented | 3.1 | `readonly ['data-page', 'content-page', 'legacy']` |
| `TemplateKind` | type | #74 | implemented | 3.1 | `'data-page' \| 'content-page' \| 'legacy'` |
| `TEMPLATE_KIND_RULE` | runtime | #74 | implemented | 3.1 | `{ 'data-page': { required: readonly ['injectData']; forbidden: readonly ['content']; noKindCode: 'marker-conflict' }; 'content-page': { required: readonly ['content']; forbidden: readonly ['injectData']; noKindCode: 'marker-conflict' }; legacy: { required: readonly []; forbidden: readonly ['injectData', 'content']; noKindCode: 'marker-conflict' } }` |
| `INJECTION_ORDER` | runtime | #74 | implemented | 3.1 | `readonly ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']` |
| `ASSET_WRAP_RULE` | runtime | #74 | implemented | 3.1 | `{ assetsBare: true; fillerWraps: true; forbidPreWrappedMarker: true; assetWrappedCode: 'asset-missing'; markerPreWrappedCode: 'marker-conflict' }` |
| `ASSET_WRAPPERS` | runtime | #74 | implemented | 3.1 | `{ sharedCssText: { openTag: '<style>'; closeTag: '</style>' }; sharedHelpersJs: { openTag: '<script>'; closeTag: '</script>' }; chartsHelpersJs: { openTag: '<script>'; closeTag: '</script>' } }` |
| `ASSET_MARKER_KEYS` | runtime | #74 | implemented | 3.1 | `{ sharedCssText: 'sharedCss'; sharedHelpersJs: 'sharedHelpers'; chartsHelpersJs: 'chartsHelpers' }` |
| `WRAP_PREDICATES` | runtime | #74 | implemented | 3.1 | `{ assetsBare: { scope: readonly ['sharedCssText', 'sharedHelpersJs', 'chartsHelpersJs']; method: 'trim-prefix-or-suffix'; code: 'asset-missing' }; forbidPreWrappedMarker: { scope: readonly ['sharedCss', 'sharedHelpers', 'chartsHelpers']; excludes: readonly ['injectData']; method: 'enclosing-open-tag'; code: 'marker-conflict' } }` |
| `DEFAULT_DATA_SCRIPT_ID` | runtime | #74 | implemented | 3.1 | `'payload'` |
| `DATA_SCRIPT_TYPE` | runtime | #74 | implemented | 3.1 | `'application/json'` |
| `CONTAINER_CHECK_RULE` | runtime | #74 | implemented | 3.1 | `{ appliesWhenMarker: 'injectData'; openTag: '<script>'; closeTag: '</script>'; id: 'payload'; type: 'application/json'; code: 'container-missing' }` |
| `STRICT_ENVELOPE_FIELDS` | runtime | #74 | implemented | 3.1 | `readonly ['version', 'skill', 'shape', 'key', 'data']` |
| `STRICT_ENVELOPE_SHAPES` | runtime | #74 | implemented | 3.1 | `readonly ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']` |
| `TEMPLATE_ERROR_CODES` | runtime | #74 | implemented | 3.1 | `readonly ['marker-missing', 'marker-duplicate', 'marker-conflict', 'data-missing', 'container-missing', 'asset-missing', 'strict-invalid', 'content-missing']` |
| `TEMPLATE_CHECK_ORDER` | runtime | #74 | implemented | 3.1 | `readonly ['marker-duplicate', 'marker-missing', 'marker-conflict', 'container-missing', 'asset-missing', 'data-missing', 'content-missing', 'strict-invalid']` |
| `TemplateAssets` | type | #74 | implemented | 3.1 | `{ sharedHelpersJs: string; sharedCssText: string; chartsHelpersJs?: string }` |
| `FillTemplateInput` | type | #74 | implemented | 3.1 | `{ template: string; assets: TemplateAssets; data?: unknown; strict?: boolean; dataScriptId?: string; content?: string }` |
| `FillTemplateReport` | type | #74 | implemented | 3.1 | `{ markers: readonly MarkerReport[]; strict: boolean; exempt: boolean; bytes: number }` |
| `FillTemplateOutput` | type | #74 | implemented | 3.1 | `{ html: string; report: FillTemplateReport }` |
| `FillTemplate` | type | #74 | implemented | 3.1 | `(input: FillTemplateInput) => FillTemplateOutput` |
| `fillTemplate` | runtime | #74 | implemented | 3.1 | `(input: FillTemplateInput): FillTemplateOutput` |
| `TemplateErrorShape` | type | #74 | implemented | 3.1 | `{ name: 'TemplateError'; code: TemplateErrorCode; marker?: TemplateMarkerKey; message: string }` |
<!-- FROZEN-SURFACE-TABLE-END -->

**六个占位符（逐字写法 + 语义 + 数量约束 + 填充物来源 + 缺失行为）**

| 标记（逐字） | 数量规则 | 填充物来源 | 缺失/重复行为 |
|---|---|---|---|
| `<!--INJECT-DATA-->` | **0 或 1**（`zero-or-one`，不可豁免；#118 由 `exactly-one` 放宽） | 场景数据：由**技能包提供**（`input.data`），填充器只注入与校验，不生产数据（AC-12） | 单标记超 1 次 → `marker-duplicate`；**数据页与内容页的互斥约束**由载荷槽规则承担（见 §3.1.2）：两者皆无 → `marker-missing`，两者皆有 → `marker-conflict` |
| `<!--CONTENT-->` | **0 或 1**（`zero-or-one`，不可豁免；#118 新增） | 正文 HTML：由**技能包提供**（`input.content`），填充器只注入与校验，不生产正文 | 模板含本标记但 `input.content` 未提供 → 抛 `TemplateError`，code **`content-missing`**（与 `data-missing` 对称）；超 1 次 → `marker-duplicate` |
| `<!--SHARED-HELPERS-->` | **恰好 1**（`exactly-one`，声明 `NO-SHARED` 时可缺席） | `input.assets.sharedHelpersJs`——**唯一产出签名 `buildSharedHelpersJs(input?)`**（§3.3，归 #76；#74 只消费，不得自产） | 缺失/重复且未豁免 → 抛错 `marker-missing`／`marker-duplicate`；资产为空串 → `asset-missing` |
| `<!--SHARED-CSS-->` | **恰好 1**（`exactly-one`，声明 `NO-SHARED` 时可缺席） | `input.assets.sharedCssText`——**唯一产出签名 `buildStyleSheet().css`**（§3.2，归 #75） | 同上 |
| `<!--CHARTS-HELPERS-->` | **0 或 1**（`zero-or-one`） | `input.assets.chartsHelpersJs`（可选）——**唯一产出签名 `buildChartsHelpersJs(input?)`**（§3.5，归 #78；#74 只消费，FX-22） | 出现 >1 次 → 抛 `marker-duplicate`；出现 1 次但未提供资产 → `asset-missing`；0 次合法 |
| `<!--NO-SHARED-->` | **0 或 1**（`zero-or-one-exempt`） | 无填充物（豁免声明本身） | 与 SHARED 两标记**互斥**：声明后 SHARED 必须为 0，否则抛 `marker-conflict`；不得用「注释掉占位符」隐式豁免 |

**注入顺序**：`INJECTION_ORDER = sharedHelpers → sharedCss → chartsHelpers → injectData`（逐字对齐旧 §7 `contract:363`；旧实现顺序代码在 `injector.py:107-120`，`:104-106` 只是 `NO-SHARED` 分支）。`NO-SHARED` 不是注入步，只改数量校验。

**`<!--INJECT-DATA-->` 替换语义（FX-2①②，定死）**：

1. 填充器**只把标记文本 `<!--INJECT-DATA-->` 替换为 JSON 字符串**（`JSON.stringify` 后文本中 `<` 一律写成反斜杠 + `u003c`），**不生成、不补写 `<script>` 容器标签**。依据：旧 `injector.py:119-120` 即「只替换标记文本」这一形态（`:119` 的实际转义是 `</` → 反斜杠 + `/`）；`skill-memo-ilife/templates/*.html` 6 个模板逐字为 `<script id="payload" type="application/json"><!--INJECT-DATA--></script>`；新实现若生成包裹会与模板自带容器**双包**。
   - **`u003c` 的归因（FX-24 更正）**：`u003c` 是**契约自定的 JSON 转义规则**（`TEXT_JSON_LT_RULE`／`TEMPLATE` 侧同口径），**不是**旧侧行为——旧 `injector.py:119` 只做 `</` → 反斜杠 + `/` 的字符串替换。两者语义等价（都能防 `</script>` 断标签），新契约取 JSON 合法转义以便逐值断言；**不得**把 `u003c` 写进「旧侧证据」栏。
2. **模板必须自带容器**（硬约束，**仅当模板含 `<!--INJECT-DATA-->` 时执行**——FX-118-1 收窄，机读常量 `CONTAINER_CHECK_RULE.appliesWhenMarker`）：含 `<!--INJECT-DATA-->` 时该标记必须落在 `<script id="payload" type="application/json">…</script>` 内。**容器定位口径（FX-118-11 自查洞 F-2 处置，写死）**：取标记**左侧最近的未闭合开标签**（标签名恒取 `CONTAINER_CHECK_RULE.openTag`，即 `<script>`），该标签的 `id`／`type` 必须**逐字**等于 `CONTAINER_CHECK_RULE.id`／`CONTAINER_CHECK_RULE.type`（或与 `FillTemplateInput.dataScriptId` 匹配）；**不得**把页内业务 `<script>`（已闭合）当容器。`DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE` 的用途**只是校验模板自带容器**，不用于生成。
3. **含 `<!--INJECT-DATA-->` 且缺容器或 id／type 不符 → 抛 `TemplateError`，code `container-missing`**（`message` 区分「容器缺失」与「id／type 不符」两因）；仍遵守边界规则 5，**不返空页**。**无 `<!--INJECT-DATA-->` 的模板（53 个内容页 ＋ 6 个 `legacy`）不执行容器校验**——它们**没有**容器是**合法**的，**不可能**抛 `container-missing`（与 §3.1.2① 对 `data`／`strict` 的收窄写法同口径；机读断言见 §7）。
4. `data === undefined` 或不可 JSON 序列化 → 抛 `TemplateError`，code `data-missing`（V1 洞 12 处置）。

**`--strict` 校验语义**（对齐旧 `--strict-payload`，`contract:107`）：

- **默认（`strict` 省略/false）**：六个标记的数量规则**一律硬拦截**（缺失/重复/互斥冲突即抛错）＋ **载荷槽规则**（`INJECT-DATA` 与 `CONTENT` 恰有其一，见 §3.1.2②）；**容器硬约束同样生效**——**含 `<!--INJECT-DATA-->` 时**必须落在自带 `<script id="payload" type="application/json">…</script>` 内，缺容器或 id／type 不符 → `container-missing`（与 `strict` 无关，FX-25②；**无 `INJECT-DATA` 不校验**，FX-118-1）；`data` 只要求可 JSON 序列化（且**仅数据页**校验）。
- **`strict: true`**：在数量规则之上，追加**零依赖信封校验**——`data` 必须是对象且含 `STRICT_ENVELOPE_FIELDS` 五字段，`shape` 必须 ∈ `STRICT_ENVELOPE_SHAPES`。不合法 → 抛 `TemplateError`，code `strict-invalid`。**仅数据页执行**（内容页忽略 `data`，见 §3.1.2①；V3 H10 更正——本条旧版按字面无条件）。**不得**调用 base-link-core 的 `parseEnvelope`（AC-13）。
- 注入的 payload 文本：JSON 序列化后**只替换 `<!--INJECT-DATA-->` 标记文本**（容器由模板自带，见上）；文本中 `<` 一律写成反斜杠 + `u003c`（**契约自定规则**，见上「归因更正」），防 `</script>` 断标签。

**注入结果（机器可读）**：`FillTemplateOutput.report` = `{ markers, strict, exempt, bytes }`；`markers[]` **覆盖全部六个标记**（含 `content`）逐标记给 `{ key, literal, rule, count, filled }`（`filled` = 该标记被替换；缺席标记的 `count` 为 0、`filled` 为 false）；`bytes` = 输出 HTML 字节数（对齐旧 CLI 结果 JSON 的 `bytes` 口径，`injector.py:210-305`）。失败**不返回** `html: ''`——一律抛错（边界规则 5：缺失阻断不返空）。

#### 3.1.1 envelope 形状裁定与追溯（FX-4）

- **事实**：`packages/base-link-core/src/envelope.ts:9-11` 定义 `ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']`，共 **6** 个形状（`fallback` = 降级载荷），`EnvelopeShape` 直接由它推导。
- **分歧**：上位规格 `docs/calorie-architecture.md:53` 写 `shape ∈ stat/list/detail/analysis/receipt`（**5** 个），`docs/research/t92-architect-calls.md:35`（AC-5）照抄同 5 个。
- **裁定**：以**六形状**为准——规格 `:53` 属**不完整列举**（漏 `fallback`），不是契约分叉。`STRICT_ENVELOPE_SHAPES` 逐字等于 link-core `ENVELOPE_SHAPES`，由 `test-d/contract-signatures.ts`（`_T05`）与 `test/contract-signatures.test.mjs`（形状表同步用例）双向钉死。
- **追溯**：写法对齐 AC-3 对 `type`／`types` 的裁定（§3.5.2）——先给事实、再给裁定、再给同步动作；`docs/calorie-architecture.md:54` 已补一行勘误注记（FX-25①：勘误落在 `:54`，不是 `:53`）。
- **不冲突声明**：`SERIALIZABLE_SHAPES`（5 个，六形状去掉 `fallback`）有单独交代（§3.4），**不构成**对六形状的否定。

#### 3.1.2 正文槽位／载荷槽规则／包裹约定／模板分型／判定次序（#118 补遗）

**① 正文槽位 `<!--CONTENT-->`**

- **溯源（不可省）**：旧基线 `D:/2Study/StudyNotes/SKILLS/卡路里` 的 73 个模板对本标记**零命中**（`templates/`／`scripts/`／`docs/`／`references/`／`html/` 逐字搜索全空；旧层取证快照 `.scratch/t118/baseline.md` §0.1 是**归档前旧位置**、未入仓、**勿据此取件**，仓内可复现证据见 `docs/research/t118-template-inventory.md`）。因此 `<!--CONTENT-->` **不是旧 v1.30 能力，而是新架构发明的槽位**——本仓 53 个内容页此前由 4 个技能各自私有 `CONTENT_MARKER` 事实使用（`packages/skill-bill/src/render/html.ts:55`／`skill-chef:70`／`skill-home:61`／`skill-schedule:64`）；#118 把它收归 `TEMPLATE_MARKERS.content`，成为唯一真相源。
- **语义**：填充物是**已渲染好的正文 HTML**（`FillTemplateInput.content`）；填充器**只做标记文本替换**，不生产正文、不转义正文（转义责任在产出正文的技能侧，与旧侧同口径）。
- **数量**：`MARKER_RULES.content = { rule: 'zero-or-one', required: false, exemptable: false }`。
- **缺失**：模板含 `<!--CONTENT-->` 而 `content` **未提供（`undefined`）** → 抛 `TemplateError`，code **`content-missing`**；`content: ''` 视为**已提供**（正文替换为空串，合法——空正文是技能侧的表达，不是契约缺失）。`TEMPLATE_ERROR_CODES` **只追加**：既有 7 个逐字、逐序不变，`content-missing` 追加在**末尾**。
- **`data` 的适用条件（#118 D-8 裁定 2 已授权放宽）**：`FillTemplateInput.data` 是**可选字段**（`data?: unknown`）——**数据页提供；内容页可省略**（载荷槽模型使 `data` 与 `content` **同为条件字段**，与 `content?` 对称；属**追加式放宽**、向后兼容，即 #118 授权的**第 2 处既有签名改动**）。**只在模板含 `<!--INJECT-DATA-->` 时被校验**（缺失／不可序列化 → `data-missing`；`strict: true` 的信封校验同样**只在数据页执行**）；内容页忽略 `data`、也不读它。反之数据页忽略 `content`。内容页调用方**既可不传 `data`**，也可传 `data: undefined`（`unknown` 接受 `undefined`），都不会被判 `data-missing`／`strict-invalid`。
- **正文替换与四个注入步的先后：无先后语义**（#118 FX-118-6 统一口径：旧版「正文恒最后一步」表述已删除）：`content` **不占** `INJECTION_ORDER` 的位置（见 ④），且载荷槽两成员**互斥**（`PAYLOAD_SLOT_RULE`）——任一模板至多出现 `content` 与 `injectData` 之一，两者不可能对同一文本竞争同一位置，故顺序不可断言、也不构成契约条款。**唯一必须遵守的是互斥本身**，不是先后。资产文本若含契约标记字面量，属**产出者缺陷**（`SHARED_HELPERS_JS_RULE.selfContained`），不靠替换顺序兜底。

**② 载荷槽规则（机读）**

`PAYLOAD_SLOT_RULE = { members: ['injectData', 'content'], rule: 'exactly-one', conflictCode: 'marker-conflict', missingCode: 'marker-missing' }`——`INJECT-DATA` 与 `CONTENT` **恰有其一**：

| 情形 | 判定 | 错误码 |
|---|---|---|
| 恰有其一 | 合法（再按分型定数据页／内容页） | — |
| 两者都有 | 冲突 | `marker-conflict` |
| 两者都无 | 缺失 | `marker-missing` |

`MARKER_RULES.injectData` 由 `exactly-one`／`required: true` **放宽**为 `zero-or-one`／`required: false`（#118 授权放宽的既有签名之一；另一处为 `FillTemplateInput.data?`，见 §8.6 D11）——数量约束上移到本规则承担。事实依据：全仓 65 个模板**零冲突**（无任何一个同时含两标记，见 `docs/research/t118-template-inventory.md` §2，**已入仓**）。

**③ 模板分型（机读）**

- `TEMPLATE_KINDS = ['data-page', 'content-page', 'legacy']`；`TEMPLATE_KIND_RULE` 逐型给 `required`（须恰 1 次）／`forbidden`（须 0 次）／`noKindCode`（三型皆不命中时的错误码）。
- 三型**穷尽且互斥——但仅对合法模板（计数 ∈ {0,1}）成立**（FX-118-7 限定）：恰有其一载荷槽 → 数据页／内容页；两者皆无 → `legacy`；两者皆有 → 三型皆不命中 → 报 `noKindCode`（三型同值，恒等于 `PAYLOAD_SLOT_RULE.conflictCode` = `marker-conflict`）。**计数 > 1 的模板不属分型判定面**（分型规则只对 0／1 次计数试配），由 §3.1.2⑤ 的判定次序报错——**同一标记出现 > 1 次时抛的是 `marker-duplicate`，不是 `marker-conflict`**（旧版括注「两者皆有 → 即 `marker-conflict`」只在计数为 0／1 时成立）。因此「两类都不属于且非 legacy」**在合法模板上**不存在。
- `legacy` = **契约外的遗留资产**（**按 `TEMPLATE_KIND_RULE` 判定**：两载荷槽皆无；**payload 容器不是分型判据**——容器只由 `CONTAINER_CHECK_RULE` 在含 `injectData` 时校验）：`fillTemplate` 对它们抛 `marker-missing` 是**正确行为**（不该能填）。
- **全仓 65 个模板实测：数据页 6 ／ 内容页 53 ／ 遗留 6**（bill 16 ＋ chef 8 ＋ home 21 ＋ schedule 8 = 53 内容页；memo-ilife 6 数据页；calorie 6 遗留）。复跑命令：`node tooling/classify-templates.mjs`（读 `dist` 的冻结常量判定，可 `--inventory` 逐条比对清单）；输出快照见 `docs/research/t118-template-classification.md`。

**④ 包裹约定（方案 i：资产裸文本 ＋ 填充器负责包裹）**

- `ASSET_WRAP_RULE = { assetsBare: true, fillerWraps: true, forbidPreWrappedMarker: true, assetWrappedCode: 'asset-missing', markerPreWrappedCode: 'marker-conflict' }`。
- `ASSET_WRAPPERS`（逐字，唯一真相源）：`sharedCssText` → `<style>` ＋ 文本 ＋ `</style>`；`sharedHelpersJs`／`chartsHelpersJs` → `<script>` ＋ 文本 ＋ `</script>`。实现只许引本常量，不得另写字面量。`ASSET_MARKER_KEYS` 是**资产键 → 标记键**的唯一映射（`sharedCssText→sharedCss`／`sharedHelpersJs→sharedHelpers`／`chartsHelpersJs→chartsHelpers`），供不变量②的作用域表述使用。
- **两条不变量（判定谓词机读冻结为 `WRAP_PREDICATES`，**唯一一份实现**，#74 与 `tooling/classify-templates.mjs` 共用；禁止第二份）**：
  1. **资产不得自带包裹标签**（`WRAP_PREDICATES.assetsBare`）：作用域 = `ASSET_WRAPPERS` 的键集（三个资产文本）；判定方式 `trim-prefix-or-suffix` = **资产文本 `trim()` 后，以任一 `ASSET_WRAPPERS[*].openTag` 起 或 以任一 `closeTag` 止**即违反 → 抛 `asset-missing`（`ASSET_WRAP_RULE.assetWrappedCode`）。**不得**用子串命中（`includes`）——helpers JS 合法含 `<script>` 字面量（拼接 HTML），子串判定会误报；且**仅在该资产被消费的标记存在时校验**（`NO-SHARED` 豁免缺席不校验，与 §3.1 标记表「未豁免」口径一致）。
  2. **三个共享资产标记不得被预包裹**（`WRAP_PREDICATES.forbidPreWrappedMarker`）：作用域 = `ASSET_MARKER_KEYS` 的值集（`sharedCss`／`sharedHelpers`／`chartsHelpers`），`excludes = ['injectData']`；判定方式 `enclosing-open-tag` = 对**每一个**标记出现处扫描其**左侧全部前缀文本**（不限同行，故同行与跨行两种形态都命中），若最近的未闭合 `<style`／`<script` 开标签存在（`lastIndexOf(openTag 的标签名形式) > lastIndexOf(对应 closeTag)`）即违反 → 抛 `marker-conflict`（`ASSET_WRAP_RULE.markerPreWrappedCode`）。
- **唯一例外**：`<!--INJECT-DATA-->` 的 payload 容器由**模板自带**（§3.1 FX-2①②，`CONTAINER_CHECK_RULE`），填充器不得生成；容器是**必需项**而非「预包裹」，故 `injectData` **不在**不变量②的作用域内（FX-118-3 裁定 1）。本约定只管**三个共享资产**的包裹；`content`／`noShared` 亦不在作用域内。
- **`INJECTION_ORDER` 不含 `content`（显式记账）**：该数组是既有冻结签名，本票无授权改动；且载荷槽两成员互斥，正文替换与四个资产／数据步之间**无先后语义**（见 ①）。
- **与现状可共存（分阶段迁移）**：① 53 个裸内容页**产出不变**——迁移只是把「技能私有 `CONTENT_MARKER` ＋ 私有 `fillTemplate`」换成「契约槽位 ＋ 统一填充器」（模板**零改动**）；② memo 6 个数据页当前**模板自带包裹**、由 `fillSharedMarkers` 原样工作，在 #74 迁移之前与新约定**互不干扰**（不同填充器、不同模板）；③ calorie 6 个遗留模板不动（归 #107）。**不变量②是迁移期判据**：模板若仍预包裹**作用域内的三个共享资产标记**，统一填充器报 `marker-conflict`——这是**期望行为**（防双包），迁移动作即「删掉模板自带的 `<style>`／`<script>`」。**作用域外的标记不报**：memo 6 个数据页的 `<!--INJECT-DATA-->` 天生落在自带 `<script id="payload" …>` 容器内（`memo_query.html:64`），按作用域**排除 `injectData`**，**不**触发 `marker-conflict`（FX-118-3 裁定 1；S-2 自证）。迁移面 **12 个模板**（memo 6 ＋ calorie 6）vs 方案 ii 的 53～59 个；parity 不受影响：两种约定产出的 HTML 可完全一致。

**⑤ 错误码判定次序（机读，FX-118-2）**

`TEMPLATE_CHECK_ORDER` 冻结**唯一判定次序**——填充器逐阶段判定，**首个命中即抛、不聚合**（不并发报告多个码）：

| 次序 | 阶段 | 触发条件 | 错误码 |
|---|---|---|---|
| 1 | 数量规则 | 任一标记出现 > 1 次（`MARKER_RULES`） | `marker-duplicate` |
| 2 | 必需标记／载荷槽缺失 | 必需标记缺席且未豁免，或两载荷槽皆无（`PAYLOAD_SLOT_RULE.missingCode`） | `marker-missing` |
| 3 | 冲突 | 两载荷槽皆有（`PAYLOAD_SLOT_RULE.conflictCode`）／`NO-SHARED` 与 SHARED 并存／共享资产标记被预包裹（`WRAP_PREDICATES.forbidPreWrappedMarker`） | `marker-conflict` |
| 4 | 容器 | **含 `injectData` 时**缺自带容器或 id／type 不符（`CONTAINER_CHECK_RULE`） | `container-missing` |
| 5 | 资产 | 被消费的资产为空串或自带包裹标签（`WRAP_PREDICATES.assetsBare`） | `asset-missing` |
| 6 | 数据 | 数据页 `data === undefined` 或不可 JSON 序列化 | `data-missing` |
| 7 | 正文 | 内容页 `content === undefined` | `content-missing` |
| 8 | 信封 | `strict: true` 且信封校验失败 | `strict-invalid` |

- **互斥性**：`TEMPLATE_CHECK_ORDER` 是 `TEMPLATE_ERROR_CODES` 的一个**排列**（8 码各出现恰一次），任一输入**至多**抛一个码。
- **与既有措辞一致**：真实 calorie 模板（两载荷槽皆无 ＋ SHARED-CSS 预包裹）命中次序 2（`marker-missing`）**早于**次序 3（`marker-conflict`）→ 抛 `marker-missing`，与 ③／§6.1 的点名一致（V3 H2 裁决）。「重复 ＋ 冲突」「缺槽 ＋ 缺资产」「缺容器 ＋ 重复」三类组合同理：**取次序靠前者**。
- **一码多义由 `message` 辨因**（FX-118-10①，**不改码**）：`asset-missing` 区分「资产为空串」与「资产自带包裹标签」；`marker-conflict` 区分「两载荷槽皆有」／「`NO-SHARED` 与 SHARED 并存」／「标记被预包裹」；`container-missing` 区分「容器缺失」与「id／type 不符」（既有口径）。

**所属包**：`base-paint`（`packages/base-render`）。**旧侧对应物**：§3 `contract:64-75`；§7 `contract:356-367`；`injector.py:26-30,68-123`。


**B3 强约束**：技能可保留私有模板，但**必须走同一填充器**；技能侧 `SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`fillTemplate`／`fillSharedMarkers` 全部删除（5 份常量 + 5 套 `*_MARKER_INVALID` 错误码，new-exports §3.2）。迁移路径归 #74，不在本票。

### 3.2 共享样式资产（#75）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `CSS_VAR_TOKENS` | runtime | #75 | implemented | 3.2 | `{ '--fg': '#1d1d1f'; '--fg2': '#6e6e73'; '--fg3': '#86868b'; '--bg': '#f5f5f7'; '--card': '#ffffff'; '--line': '#d2d2d7'; '--blue': '#007aff'; '--blue2': '#0a63ce'; '--soft': '#f5f8ff'; '--ok': '#34c759'; '--shadow': '0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06)' }` |
| `STYLE_SHEET_ID` | runtime | #75 | implemented | 3.2 | `'ilife-base'` |
| `CONTROL_STYLE_SECTIONS` | runtime | #75 | implemented | 3.2 | `readonly ['toast', 'actionBar', 'copyButton', 'statusBadge', 'emptyState', 'errorReceipt', 'charts', 'helpShell']` |
| `STYLE_FORBIDDEN_TOKENS` | runtime | #75 | implemented | 3.2 | `readonly ['--r-xl', '--pink']` |
| `StyleSheetInput` | type | #75 | implemented | 3.2 | `{ prefix?: string; extraCss?: string }` |
| `StyleSheetOutput` | type | #75 | implemented | 3.2 | `{ css: string; tokens: readonly CssVarName[]; prefix: string; version: string }` |
| `BuildStyleSheet` | type | #75 | pending | 3.2 | `(input?: StyleSheetInput) => StyleSheetOutput` |
| `buildStyleSheet` | runtime | #75 | pending | 3.2 | `(input?: StyleSheetInput): StyleSheetOutput` |
<!-- FROZEN-SURFACE-TABLE-END -->

**11 个 token 逐值（AC-9；旧文写「12 变量」是错的）**

```css
:root {
  --fg: #1d1d1f;
  --fg2: #6e6e73;
  --fg3: #86868b;
  --bg: #f5f5f7;
  --card: #ffffff;
  --line: #d2d2d7;
  --blue: #007aff;
  --blue2: #0a63ce;
  --soft: #f5f8ff;
  --ok: #34c759;
  --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06);
}
```

- `--blue: #007aff` 与 Q12 锁定的 B1 主色一致 → 主色口径按 B1，不得改。
- **Q14 禁入**：`STYLE_FORBIDDEN_TOKENS = ['--r-xl', '--pink']`；同时**不得**引入深色区（`[data-theme=dark]` 段落或等价机制）。
- 与既有 `STYLE_TOKENS`（`src/style.ts:10-20`，9 个深色 JS token）**不同物**：后者是既有渲染契约的 JS token，本表是注入 HTML 的 CSS 变量；两者并存，不得互相覆盖。

**控件样式区边界**：`CONTROL_STYLE_SECTIONS` 是**闭集**，每区一个类名命名空间（自动加 `STYLE_PREFIX = 'ilife-'`）。样式唯一真相源在 base-paint；单品包禁自带样式常量（边界规则 6）。技能现有私有 CSS 串（bill／chef／home／schedule 逐字重复约 300 字符）随 #75 删除。

**主题接缝（规格 ID-14，FX-8）**：

- **设计变量分层**：`:root` 的 11 个 `CSS_VAR_TOKENS` 是**共享基座**（token 表冻结）；技能级主题只许经 `StyleSheetInput.extraCss` **追加技能作用域的覆盖块**（如 `.ilife-calorie { --blue: … }`），**不得**改写基座值、不得新增 token 名、不得引入 Q14 禁入项。
- **单技能主题变更不得静默重刷其他技能**：覆盖块必须限定在该技能自己的类名作用域（`ilife-<skill>`）内；`buildStyleSheet` 产出**同源 CSS**，任何技能主题差异只能来自该技能显式传入的 `extraCss`，共享层**不得**按技能名分支。
- **验收**：同一份 `sharedCssText` 注入 6 个技能时，未传 `extraCss` 的技能视觉逐字节一致；某技能改主题时其余技能的 #96 快照**必须不变**。

**控件视觉规格（V1 洞 6 处置：不冻结也不排除）**：控件**视觉规格**（逐区尺寸／色值／圆角／断点）本契约**不冻结也不排除**，owner 是 **#75**（其票面验收②「视觉与 B1 标杆一致」），视觉验收以 **#96** 的 per-skill HTML 快照回归门为准。本契约只冻结可断言的锚点：11 个 token 逐值、`CONTROL_STYLE_SECTIONS` 8 个命名空间（闭集）、`TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS` 的数值、类名前缀 `ilife-`。**不得**因此自造第二份 token 表或样式常量（§4.3 第 6 条）。

**随包发布的路径与 `files` 口径**：

- 资产形态 = **运行时字符串**（`buildStyleSheet().css`，或由其产出的共享 CSS 文本），随 `dist/index.js` 发布。`base-render/package.json` 的 `files: ["dist"]` **已覆盖**，本契约不要求改 `files`。
- `packages/base-render/style/tokens.css`（3 行、`files` 不含它）**不是契约资产**，其去留归 #75；契约不引用它。
- 子路径导出（如 `exports["./style.css"]`）**不在本冻结范围**：现状 `exports` 只有 `"."`，改它属发布链变更，交接 #95／#79（AC-15）。

**所属包**：`base-paint`。**旧侧对应物**：§6.4 `contract:193-197`；`base.css:13-23`（11 个 token 实测）。

### 3.3 控件层（#76）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `ESCAPE_HTML_CHARS` | runtime | #76 | implemented | 3.3 | `readonly ['&', '<', '>', '"', "'"]` |
| `ESCAPE_HTML_ENTITIES` | runtime | #76 | implemented | 3.3 | `{ '&': '&amp;'; '<': '&lt;'; '>': '&gt;'; '"': '&quot;'; "'": '&#39;' }` |
| `COPY_CHANNELS` | runtime | #76 | implemented | 3.3 | `readonly ['clipboard', 'fallback']` |
| `COPY_TEXT_DEFAULTS` | runtime | #76 | implemented | 3.3 | `{ emptyTextShortCircuit: true; failBadgeAlwaysOn: true; okMessage: '已复制'; okDetail: '粘贴给 AI'; failMessage: '复制失败'; failDetail: '长按选择文本手动复制' }` |
| `TOAST_ICONS` | runtime | #76 | implemented | 3.3 | `readonly ['copy', 'ok', 'warn', 'danger', 'info']` |
| `TOAST_DEFAULTS` | runtime | #76 | implemented | 3.3 | `{ timeoutMs: 4500; maxStack: 5; mobileMaxStack: 3; mobileMaxPx: 820; gapPx: 8; role: 'status'; ariaLive: 'polite'; defaultIcon: 'copy' }` |
| `ACTION_BAR_KINDS` | runtime | #76 | implemented | 3.3 | `readonly ['primary', 'red', 'ghost']` |
| `ACTION_BAR_DEFAULTS` | runtime | #76 | implemented | 3.3 | `{ copyDataLabel: '复制数据'; copyLogLabel: '复制日志'; ghostOwnRow: true; evenRowPairs: 2; minHeightPx: 40; fontSizePx: 12; fontWeight: 600; ghostBorderAlpha: 0.38 }` |
| `STATUS_KINDS` | runtime | #76 | implemented | 3.3 | `readonly ['ok', 'warn', 'danger', 'empty']` |
| `STATUS_DEFAULT_TEXT` | runtime | #76 | implemented | 3.3 | `{ ok: '成功'; warn: '警告'; danger: '失败'; empty: '无数据' }` |
| `CONTROLS_ERROR_CODES` | runtime | #76 | implemented | 3.3 | `readonly ['bad-input', 'bad-format']` |
| `CONTROL_NAMES` | runtime | #76 | implemented | 3.3 | `readonly ['toast', 'copyText', 'actionBar', 'statusBadge', 'emptyState', 'errorReceipt']` |
| `CONTROLS_HOST_REQUIREMENT` | runtime | #76 | implemented | 3.3 | `'none'` |
| `CONTROL_AVAILABILITY` | runtime | #76 | implemented | 3.3 | `Record<ControlName, ControlAvailability>` |
| `CopyPorts` | type | #76 | implemented | 3.3 | `{ clipboard: ClipboardChannel \| null; fallback: (text: string) => boolean; toast?: ToastHostPort }` |
| `CopyTextOptions` | type | #76 | implemented | 3.3 | `{ silent?: boolean; toast?: { ok?: CopyToastText; fail?: CopyToastText }; onOk?: (channel: CopyChannel) => void; onFail?: (reason: string) => void }` |
| `CopyTextOutcome` | type | #76 | implemented | 3.3 | `{ ok: boolean; channel: CopyChannel \| null; reason?: string }` |
| `CopyText` | type | #76 | implemented | 3.3 | `(text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>` |
| `copyText` | runtime | #76 | implemented | 3.3 | `(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>` |
| `CopyRuntime` | type | #76 | implemented | 3.3 | `{ copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }` |
| `createCopyRuntime` | runtime | #76 | implemented | 3.3 | `(ports: CopyPorts): CopyRuntime` |
| `CopyActionHostPort` | type | #76 | implemented | 3.3 | `{ listActionIds(): readonly string[]; readDataText(actionId: string): string \| undefined; onActivate(actionId: string, handler: () => void): () => void }` |
| `ACTION_ID_ATTR` | runtime | #76 | implemented | 3.3 | `'data-action-id'` |
| `COPY_ACTION_IDS` | runtime | #76 | implemented | 3.3 | `{ actionBar: { copyData: 'ilife-copy-data'; copyLog: 'ilife-copy-log' }; errorReceipt: { copyData: 'ilife-error-copy-data'; copyLog: 'ilife-error-copy-log' } }` |
| `BindCopyAction` | type | #76 | implemented | 3.3 | `(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions) => { dispose(): void }` |
| `bindCopyAction` | runtime | #76 | implemented | 3.3 | `(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }` |
| `SharedHelpersInput` | type | #76 | implemented | 3.3 | `{ prefix?: string; dataAttr?: string }` |
| `DEFAULT_DATA_ATTR` | runtime | #76 | implemented | 3.3 | `'data-t'` |
| `BuildSharedHelpersJs` | type | #76 | implemented | 3.3 | `(input?: SharedHelpersInput) => string` |
| `buildSharedHelpersJs` | runtime | #76 | implemented | 3.3 | `(input?: SharedHelpersInput): string` |
| `SHARED_HELPERS_JS_RULE` | runtime | #76 | implemented | 3.3 | `{ selfContained: true; idempotent: true; domAllowed: true; forbidGlobalAssignment: true; forbidNodeBuiltins: true }` |
| `ToastInput` | type | #76 | implemented | 3.3 | `{ msg: string; detail?: string; icon?: ToastIcon; badge?: ToastBadge; actions?: readonly ToastAction[]; count?: string; lines?: readonly string[]; code?: string; timeoutMs?: number; maxStack?: number }` |
| `ToastHostPort` | type | #76 | implemented | 3.3 | `{ mount(html: string): { remove(): void } }` |
| `ToastController` | type | #76 | implemented | 3.3 | `{ show(input: ToastInput): void; flush(): void; dispose(): void }` |
| `renderToast` | runtime | #76 | implemented | 3.3 | `(input: ToastInput): string` |
| `createToastController` | runtime | #76 | implemented | 3.3 | `(port: ToastHostPort): ToastController` |
| `ActionBarInput` | type | #76 | implemented | 3.3 | `{ buttons?: readonly ActionBarButton[]; copyData?: CopyButtonInput; copyLog?: CopyButtonInput }` |
| `renderActionBar` | runtime | #76 | implemented | 3.3 | `(input: ActionBarInput): string` |
| `StatusBadgeInput` | type | #76 | implemented | 3.3 | `{ status: StatusKind; text?: string }` |
| `renderStatusBadge` | runtime | #76 | implemented | 3.3 | `(input: StatusBadgeInput): string` |
| `EmptyStateInput` | type | #76 | implemented | 3.3 | `{ icon?: string; text: string; hint?: string; actionHtml?: string }` |
| `renderEmptyState` | runtime | #76 | implemented | 3.3 | `(input: EmptyStateInput): string` |
| `ErrorReceiptInput` | type | #76 | implemented | 3.3 | `{ message: string; retryPrompt?: string; dataText?: string; logText?: string; dataActionId?: string; logActionId?: string }` |
| `renderErrorReceipt` | runtime | #76 | implemented | 3.3 | `(input: ErrorReceiptInput): string` |
<!-- FROZEN-SURFACE-TABLE-END -->

**控件清单与签名（6 个控件，逐条）**

| 控件 | 冻结签名 | 语义（输入 → 输出） | 失败行为 |
|---|---|---|---|
| `toast` | `renderToast(input: ToastInput): string`；`createToastController(port: ToastHostPort): ToastController` | `ToastInput` → toast HTML 字符串；controller 负责堆叠（`maxStack` 5）、FIFO 挤出、单条独立计时（`timeoutMs` 4500）、`flush()` 清栈（**≤820px 收窄 3 是页面运行时行为**，见下「toast 移动端收窄的分工」） | `input.msg` 非字符串 → 抛 `ControlsError` code `bad-input`；`actions[]` 只接受 `actionId`，含内联 `onclick` 的入参一律拒；动作按钮的 id 写入 `ACTION_ID_ATTR`，**绑定归调用方**（无复制语义，不纳入 `bindCopyAction`；本条不冻结也不排除，owner #76，S-10） |
| `copyText` | `copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`；`createCopyRuntime(ports: CopyPorts): CopyRuntime`；`bindCopyAction(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }` | **双通道**：先走 `ports.clipboard.writeText`（通道 `clipboard`），失败/不可用（`clipboard === null`）再走 `ports.fallback`（通道 `fallback`）；`text === ''` 短路返回 `{ ok: false, channel: null, reason: 'empty' }`，不弹 toast 不触发回调；`opts.silent` 只静默**成功** toast，回调仍触发；**失败徽章恒在**（见下）；`onOk(channel)`／`onFail(reason)` 互斥且必触发一次 | 两通道皆失败 → `{ ok: false, channel: null, reason }`（不抛错，调用方据 `ok` 决策）；`ports` 缺失或 `fallback` 非函数 → 抛 `ControlsError` code `bad-input` |
| `actionBar` | `renderActionBar(input: ActionBarInput): string` | 场景按钮（`kind: primary／red`）＋ 复制数据／复制日志 ghost 按钮（独立一行，偶数一行 2 个，`min-height` 40px、12px/600、描边透明度 0.38）；复制文本在**渲染期**序列化后写入 `data-t`，`actionId`（`CopyButtonInput.actionId`，**必填**）写入 `ACTION_ID_ATTR`，零注入面 | 同 `toast` 的入参校验；`copyData`／`copyLog` 缺 `actionId` 或 id 重复 → 抛 `ControlsError` code `bad-input` |
| `statusBadge` | `renderStatusBadge(input: StatusBadgeInput): string` | `status` ∈ `ok／warn／danger／empty` → 语义色徽章；`text` 缺省取 `STATUS_DEFAULT_TEXT`；动态文本一律经 `ESCAPE_HTML_ENTITIES` | **非法 `status` 降级为 `empty`**（不抛错，防无样式徽章） |
| `emptyState` | `renderEmptyState(input: EmptyStateInput): string` | `{ icon?, text, hint?, actionHtml? }` → 空态区块；`icon／text／hint` 一律转义 | `text` 缺失/非字符串 → 抛 `ControlsError` code `bad-input`；`actionHtml` 为**受信 HTML 透传**（调用方负责其内容安全，不转义） |
| `errorReceipt` | `renderErrorReceipt(input: ErrorReceiptInput): string` | `{ message, retryPrompt?, dataText?, logText?, dataActionId?, logActionId? }` → 错误回执（描述 + 修正重试 + 复制数据/日志）；复制文本渲染期入 `data-t`，按钮 id 入 `ACTION_ID_ATTR`（缺省 `COPY_ACTION_IDS.errorReceipt.*`） | 缺 `dataText`／`logText` → **不渲染**对应复制按钮（容错，不抛错）；**不得**读 `window.__hmPayload`（AC-7） |

**toast 移动端收窄的分工（FX-76-2 总架构师裁定）**

「`maxStack` 5／**≤820px 收窄 3**」里的**收窄**一条，落地分工**显式记录**如下（不留歧义）：

| 侧 | 责任 | 依据 |
|---|---|---|
| 模块侧 `createToastController` | **只**做堆叠容量（栈内 `maxStack` 最大值／空栈回落 5）、FIFO 挤出、单条独立计时、`flush()`／`dispose()`；**不读任何浏览器全局**（AC-7／红线 11），因而不读视口 | `src/controls.ts` `createToastController` |
| 页面侧 `buildSharedHelpersJs()` **产出文本** | 读 `window.matchMedia('(max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px)')`，命中则反馈栈容量取 `TOAST_DEFAULTS.mobileMaxStack`，否则取 `maxStack`（`SHARED_HELPERS_JS_RULE.domAllowed = true`） | `src/controls.ts` 产出文本；旧层 `window.matchMedia`（`base.js:96`）本就是页面侧代码 |
| 调用方 | 需要模块侧收窄时，显式传 `ToastInput.maxStack`（模块不猜视口） | `ToastInput.maxStack` |

**因此**：「≤820px 收窄为 3」是**页面运行时行为**，**不是模块行为**——本条不要求模块读视口，`mobileMaxPx`／`mobileMaxStack` 仍为冻结常量，供两侧取用。
**可执行证据**：`packages/base-render/test/controls.test.mjs`「helpers JS 在 ≤820px 视口把反馈栈收窄为 3」（窄 3／宽 5，且断言两档不同）＋ `docs/research/t76-nohost-evidence.md` §3（自包含 `file://` 页面）。

**`copyText` 双通道逐字冻结（Q13／AC-16①）**

```ts
export const COPY_CHANNELS = ['clipboard', 'fallback'] as const;
export interface CopyPorts {
  readonly clipboard: ClipboardChannel | null;   // 通道 1：浏览器 Clipboard API
  readonly fallback: (text: string) => boolean;  // 通道 2：兜底（选区 + execCommand 等）
  readonly toast?: ToastHostPort;                // 反馈通道：copyText 直接挂载徽章／toast
}
export type CopyText = (text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>;
```

- **不得只留 `execCommand`**：通道 1 必须优先尝试；通道 2 只在通道 1 不可用或失败时执行。
- **不得读隐式全局**：`navigator.clipboard` 由**调用方**作为 `ports.clipboard` 传入（AC-7）。**base-paint 的运行时代码**（`dist/**/*.js` 去掉注释后的代码）不得读写 `window.`／`document.`／`navigator.`；**唯一例外**是 `buildSharedHelpersJs`／`buildChartsHelpersJs` 产出的 **JS 文本字符串**——它按 `SHARED_HELPERS_JS_RULE.domAllowed = true` 允许页面侧 DOM 读取（FX-18②）。纯度扫描口径见 §7 与 §6.3（**禁 `node:` ＋ 禁隐式全局赋值**，不扫 DOM 读取）。
- **空串短路**：`copyText('')` 立即返回 `{ ok: false, channel: null, reason: 'empty' }`，无 toast 无回调（旧语义 `contract:311`）。
- **失败徽章恒在（FX-3② 定死：`copyText` 直接挂载，不交调用方插片段）**：失败态经 `ports.toast.mount(renderToast({ icon: 'danger', badge: { type: 'danger', text: … }, … }))` 挂载，`COPY_TEXT_DEFAULTS.failBadgeAlwaysOn = true`，**不受 `opts.silent` 影响**、不可被调用方移除；`ports.toast` 缺省时**降级为只回调 + 返回 outcome**（不产 HTML、不抛错，仍不违反「无宿主可用」）。
- **失败 `reason` 的取值（文档只冻结 `'empty'`；FX-76-1）**：通道 2 返回假值 → `'fallback-failed'`；通道 2 **同步抛错** → `'fallback-threw'`。通道 2 **一律**包 `try/catch`——两通道皆失败**恒**为 `{ ok: false, channel: null, reason }`（**不抛错**）且**失败徽章照挂**；旧层 `_fbCopy` 整段 `try/catch`、失败返回 false 即此口径（回归已修）。

**复制接线签名（FX-3③／FX-17，#90 仅凭契约即可落地）**

```ts
export const ACTION_ID_ATTR = 'data-action-id';          // actionId 的承载属性（渲染期写入）
export const COPY_ACTION_IDS = {
  actionBar:    { copyData: 'ilife-copy-data',       copyLog: 'ilife-copy-log' },
  errorReceipt: { copyData: 'ilife-error-copy-data', copyLog: 'ilife-error-copy-log' },
} as const;
export interface CopyActionHostPort {
  listActionIds(): readonly string[];                    // 发现机制（必填）：可接线的全部 id
  readDataText(actionId: string): string | undefined;    // 读渲染期写入的 data-t（DEFAULT_DATA_ATTR）
  onActivate(actionId: string, handler: () => void): () => void; // 订阅激活，返回解绑
}
export type BindCopyAction = (
  port: CopyActionHostPort,
  ports: CopyPorts,
  opts?: CopyTextOptions,
) => { dispose(): void };
```

- **actionId 来源（FX-17①②，定死）**：`CopyButtonInput.actionId` **必填**（`renderActionBar` 的复制数据／日志），`ErrorReceiptInput.dataActionId`／`logActionId` 可选、**缺省取 `COPY_ACTION_IDS.errorReceipt.*`**；三者渲染期写入 `ACTION_ID_ATTR` 属性。**不得**再出现「按钮没有 id」的形态；空串／非字符串／同次渲染内重复 → 抛 `ControlsError` code `bad-input`。
- **与旧侧 `data-t` 口径的偏离（显式声明）**：旧侧复制按钮**无 id**——激活靠内联脚本 `onclick="copyText(this.dataset.t)"`（`base.js:311,648-649`），只有 `data-t` 一个属性；新契约禁内联脚本（AC-7 零注入面）→ 必须有 id 才能做事件委派。`data-t` 的**文本载体**语义**保留**（属性名 = `SharedHelpersInput.dataAttr`，缺省冻结常量 `DEFAULT_DATA_ATTR = 'data-t'`）。
- **发现机制（FX-17③）**：`port.listActionIds()` 是**唯一** id 来源；`bindCopyAction` 只订阅其中列出的 id，**不得**猜 id／不得约定通配前缀／不得订阅未列出的 id。
- **语义（逐条）**：对每个 id 订阅 → 激活时读 `port.readDataText(actionId)`（与旧侧 `this.dataset.t` 同时机）→ `undefined` 则跳过（不抛错）→ 否则 `void copyText(text, ports, opts)`；反馈一律走 `ports.toast`（FX-3②），binder 不另出反馈；`dispose()` 解绑**全部**已订阅 id 且**幂等**。该 `void` **必须接住 rejection**（FX-76-6）：`copyText` 的正常失败已在内部 `settle()` 处理，逃逸异常只能来自端口实现抛错（或反馈挂载抛错），binder 既不产第二份反馈、也不重入 `onFail`（防重复回调）。
- **绑定时机（#90 使用说明，FX-76-7⑤）**：`listActionIds()` 只在 **bind 时刻**调用**一次**，**没有** re-scan／`MutationObserver`（本条也未要求）→ **必须先渲染、再 `bindCopyAction`**；动态重渲染出新按钮后须重新 bind（`dispose()` 后重新 bind，或对新增节点单独 bind）。对照：页面侧 helpers JS 走 `document` 事件委派，对**晚渲染**按钮仍生效——两者口径不同，不可互相类推。
- **DOM 边界**：`el` 以 `CopyActionHostPort` **端口**呈现（DOM 不得进 base-paint，AC-7／§4.1）；调用方用普通 `.html` 内联适配器实现三个方法即可，无需 DSH 宿主。
- **`readDataText` 返回 `undefined` 不抛错**：跳过该按钮（与 `renderErrorReceipt` 缺 `dataText` 不渲染按钮同口径）。**`listActionIds()` 允许包含非复制按钮**（如 `ActionBarButton` 的场景按钮——它们同样带 `ACTION_ID_ATTR`）：binder 不区分用途，一律靠 `readDataText → undefined` 跳过，**不得**因此报错或另设白名单（S-9）。
- **唯一性**：全部 base-paint `actionId`（`COPY_ACTION_IDS` ＋ `HELP_COPY_ACTIONS`）在**同一页面内唯一**，由签名测试断言不撞名；调用方覆盖 `ErrorReceiptInput.dataActionId`／`logActionId` 时同样须唯一且可被 `listActionIds()` 发现。

**端到端接线示例（FX-17④：#90 仅凭契约即可接线）**——下面是**调用方页面**（普通 `.html`，非 base-paint 代码）的完整接线，只用本契约的签名：

```html
<script type="module">
  import { renderActionBar, bindCopyAction, COPY_ACTION_IDS, ACTION_ID_ATTR,
           DEFAULT_DATA_ATTR, buildDataText, buildLogText } from 'base-paint';

  // ① 复制端口：双通道 ＋ 反馈（AC-16／FX-3）
  const ports = {
    clipboard: navigator.clipboard ?? null,
    fallback: (text) => { /* 选区 + execCommand 兜底 */ return true; },
    toast: {
      mount: (html) => {
        const el = document.createElement('div');
        el.innerHTML = html;
        document.body.appendChild(el);
        return { remove: () => el.remove() };
      },
    },
  };

  // ② DOM 适配器：实现 CopyActionHostPort 的三个方法（发现／取文本／订阅）
  const host = {
    listActionIds: () => [...document.querySelectorAll('[' + ACTION_ID_ATTR + ']')]
      .map((el) => el.getAttribute(ACTION_ID_ATTR))
      .filter((id) => id !== null),   // 收窄为 string[]：CopyActionHostPort.listActionIds(): readonly string[]（FX-30／V5 C-9）
    readDataText: (actionId) => {
      const el = document.querySelector('[' + ACTION_ID_ATTR + '="' + actionId + '"]');
      return el ? (el.getAttribute(DEFAULT_DATA_ATTR) ?? undefined) : undefined;
    },
    onActivate: (actionId, handler) => {
      const el = document.querySelector('[' + ACTION_ID_ATTR + '="' + actionId + '"]');
      if (!el) return () => {};
      el.addEventListener('click', handler);
      return () => el.removeEventListener('click', handler);
    },
  };

  // ③ 渲染：复制文本在渲染期序列化后写入 data-t；id 取冻结表
  const envelope = /* 技能包提供的 SerializableEnvelope */;
  document.querySelector('#bar').innerHTML = renderActionBar({
    buttons: [{ label: '打开场景', kind: 'primary', actionId: 'ilife-demo-open' }],
    copyData: { actionId: COPY_ACTION_IDS.actionBar.copyData, text: buildDataText({ envelope }) },
    copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, text: buildLogText({ envelope }) },
  });

  // ④ 接线：发现 → 订阅 → copyText → 徽章（失败徽章恒在，不受 silent 影响）
  const handle = bindCopyAction(host, ports);
  // handle.dispose();  // 页面卸载时解绑（幂等）
</script>
```

- 该示例**只用** §3.3／§3.4 的签名：`renderActionBar`／`bindCopyAction`／`COPY_ACTION_IDS`／`ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`／`buildDataText`／`buildLogText`／`CopyPorts`（含 `toast`）／`CopyActionHostPort`；**不需要**任何未冻结的签名，也不读 `window.__hmPayload` 之类旧全局（AC-7）。
- `errorReceipt` 同理：`renderErrorReceipt({ message, dataText, logText })` 渲染两个复制按钮（id 缺省取 `COPY_ACTION_IDS.errorReceipt.*`）；**同一个** `bindCopyAction(host, ports)` 同时接线 actionBar 与 errorReceipt 的按钮（`listActionIds()` 覆盖页面内全部 `data-action-id`），**不需要**第二套反馈端口（FX-3）。

**共享 JS 文本的唯一产出者（FX-2③／FX-18，归 #76；#74 只消费）**

- **冻结签名**：`buildSharedHelpersJs(input?: SharedHelpersInput): string`；`SharedHelpersInput = { prefix?: string; dataAttr?: string }`（缺省 `ilife-`／`DEFAULT_DATA_ATTR = 'data-t'`——属性名冻结为常量，渲染端与调用方适配端必须同一约定）。
- **`dataAttr` 覆盖口径（FX-29／V5 C-6，定死）**：`DEFAULT_DATA_ATTR` 是**渲染端恒用**的属性名——`renderActionBar`／`renderErrorReceipt`（及 HELP 壳按钮）渲染期一律写 `DEFAULT_DATA_ATTR`，`ActionBarInput`／`CopyButtonInput`／`ErrorReceiptInput` **不设** `dataAttr` 入参；`SharedHelpersInput.dataAttr` 的覆盖**只影响产出 helpers JS 的选择器**（`buildSharedHelpersJs` 生成的事件委派读哪个属性名）。故调用方传 `dataAttr: 'data-x'` 时：helpers JS 读 `data-x`、渲染端仍写 `data-t` → **两者不一致由调用方自负**（契约不代渲染端改写属性名，也不因覆盖而改 `DEFAULT_DATA_ATTR` 的冻结值 `'data-t'`；要一致就只传缺省值）。
- 产出恒为**非空** JS 文本，且必须是 IIFE 或显式挂载点；空串视为实现缺陷 → `fillTemplate` 抛 `asset-missing`。
- **产出内容契约（FX-18①，机读唯一真相源 `SHARED_HELPERS_JS_RULE`）**——五个布尔量逐项定死：

  | 项 | 值 | 含义 |
  |---|---|---|
  | `selfContained` | `true` | 自包含：不 import 任何模块、不依赖其它脚本或既有全局 |
  | `idempotent` | `true` | 可重复注入：同页面注入两次与注入一次等价（幂等判据不得依赖隐式全局，见下） |
  | `domAllowed` | `true` | **允许 DOM 读取**：页面侧 DOM API（`document.*` 读取／事件绑定）合法——共享 JS 是页面侧代码 |
  | `forbidGlobalAssignment` | `true` | **禁止**向 `window.<id>`／`globalThis.<id>` **赋值**（不得新增隐式全局，AC-7） |
  | `forbidNodeBuiltins` | `true` | 禁止 `node:` 内建（浏览器侧资产必须 browser-safe，边界规则 7） |

- **幂等的实现口径**：因为禁止隐式全局赋值，幂等判据**只能**落在 DOM 上（如 `if (document.querySelector('[data-ilife-helpers="1"]')) return;` 并给挂载点打标记属性），**不得**用 `window.__xxx = true` 之类的哨兵。
- **消费链**：`#76` 产出 → 技能包把它放进 `TemplateAssets.sharedHelpersJs` → `#74` 的 `fillTemplate` 只负责填 `<!--SHARED-HELPERS-->`。**不许**出现「必填但无产出者」或技能侧自产副本（B3）。
- **产出者归属**：`buildSharedHelpersJs` 归 **#76**；平行缺口 `chartsHelpersJs` 的唯一产出者 `buildChartsHelpersJs` 归 **#78**（§3.5，FX-22），两者产出内容**同受** `SHARED_HELPERS_JS_RULE` 约束（不设第二套规则表）。

**「无宿主（纯 HTML）」可用性边界（AC-16②）**——逐控件、不得写成「需要宿主」：

| 控件 | `staticHtml` | `needsRuntime` | 运行时端口 | 纯 HTML 用法 |
|---|---|---|---|---|
| `toast` | true | true | `ToastHostPort` | 产出 toast 字符串，任意页面自挂；堆叠/计时需端口，无端口则退化为单条静态块 |
| `copyText` | false | true | `CopyPorts` | 无 HTML 产物，纯编排；端口由页面内联适配器提供（普通 `.html` 即可） |
| `actionBar` | true | true | `CopyPorts+ToastHostPort` | 按钮区纯静态；点击复制需两个端口 |
| `statusBadge` | true | false | `null` | 纯静态，Node 侧可生成，无需任何浏览器能力 |
| `emptyState` | true | false | `null` | 纯静态 |
| `errorReceipt` | true | true | `CopyPorts+ToastHostPort` | 回执区块纯静态；复制按钮需两个端口 |

- `CONTROLS_HOST_REQUIREMENT = 'none'`：**全部控件不依赖 DSH 宿主**，只依赖浏览器能力（DOM／Clipboard）；缺端口时静态部分照常可用，交互部分降级而非报「需要宿主」。
- **反馈端口归属（FX-3）**：`CopyPorts.toast` 就是反馈通道；`actionBar`／`errorReceipt` 行里的 `CopyPorts+ToastHostPort` 中 `ToastHostPort` 由 `CopyPorts.toast` 承担（同一端口类型，**不得**再定第二套反馈端口）。
- **#76／#77／#90 共用同一签名**：本表与 §3.4 的 `buildDataText`／`buildLogText` 是这三票的唯一签名来源，禁止各定一套。#90（`blocked_by [76,77]`）直接消费 `copyText` ＋ `bindCopyAction` ＋ `renderActionBar` ＋ 序列化函数。
- **Q8 消歧（FX-14）**：`STATUS_KINDS = ['ok', 'warn', 'danger', 'empty']`（§3.3）与 `TOAST_ICONS` 的 `ok／warn／danger` 是 **v1.30 视觉徽章枚举**，与 Q8 所指的 envelope `status` **无关**——Q8 已废 envelope `status`，envelope 侧一律以 `shape` 为准（§2、§3.1）；本契约的 `STATUS_*` 只是控件入参枚举，**不**回写 envelope，也**不**引入 `ok/warn/fail` 信封状态。
- **错误形态与既有 `RenderError` 的关系（边界规则 5，FX-15②）**：本契约的 `TemplateErrorShape`／`ControlsErrorShape`／`TextErrorShape`／`ChartErrorShape`／`HelpSchemaErrorShape` 与既有 `RenderError`（`src/contract.ts`，code 集 `missing-data｜bad-envelope｜reco-only`）是**并列的、互不继承的**五种错误形态，共用同一约定：`{ name, code, message }`（`HelpSchemaErrorShape` 另带 `path`），**一律抛出、不返空**（边界规则 5「缺失阻断不返空」）。
  - **不包裹、不转换**：`spec/` 层不得把新错误包成 `RenderError`，也不得复用其 code 集；两套 code 集的成员互不重叠（`RenderError` 管既有 envelope→HTML 渲染，五个新形态各管本契约的一层）。
  - **调用方边界**：跨层调用（如渲染失败回执）由**调用方**决定是否把新错误映射成 `renderErrorReceipt` 的输入（`ErrorReceiptInput.message`），映射发生在调用方，不发生在 `spec/`。
  - **形态可断言**：每个 `*ErrorShape` 的字段由 `test-d/contract-signatures.ts` 锁形；`name` 逐字（`'TemplateError'` 等），不得改名成 `RenderError`。

**AC-14 转义口径归一**：唯一实现住 base-paint，转义集固定五字符 `ESCAPE_HTML_CHARS`；技能侧本地副本（实测 6 处，memo-ilife 另转 `'`）一律删除。**现状**：`escapeHtml` 只转 `& < > "`，单引号未转——签名测试对此留了一条**漂移哨兵**（`escapeHtml("'") === "'"` 当前为真），**AC-14 归一后该断言必须翻转**（FX-16①）。**owner 单一化（V1 洞 13 处置）**：把既有 `escapeHtml` 从 4 字符改到 5 字符并翻转 §7 哨兵**由 #74 执行**（AC-14 的「#74／#79」双标取消：#79 只做收口复核，不重复执行）；#74 的「用／不许自造／验收」三栏已含此项（§6.1）。本票只冻结口径，不改实现。

**AC-7 隐式全局显式化**：旧 `base.js` 暴露但契约未声明的全局 `window.toast`／`__hmToastFlush`／`__hmPayload`／`__hmCopyData`／`__hmCopyLog` **一律不引入**。对应能力全部改为显式签名：`createToastController().flush()`、`ErrorReceiptInput.dataText`／`logText`、`ActionBarInput.copyData`／`copyLog`。

**所属包**：`base-paint`。**旧侧对应物**：§5／§5.1 `contract:109-141`；§6.2 `contract:168-178`；§6.3 `contract:180-191`；§6.8 `contract:292-312`。

### 3.4 复制文本序列化（#77）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `COPY_FORMATS` | runtime | #77 | implemented | 3.4 | `readonly ['text', 'json', 'csv']` |
| `SERIALIZABLE_SHAPES` | runtime | #77 | implemented | 3.4 | `readonly ['stat', 'list', 'detail', 'analysis', 'receipt']` |
| `LOG_SECTIONS` | runtime | #77 | implemented | 3.4 | `readonly ['scene', 'thinking', 'dataStructure', 'callChain', 'timestampVersion', 'exception']` |
| `LOG_SECTION_TITLES` | runtime | #77 | implemented | 3.4 | `{ scene: '场景标识'; thinking: 'AI 思考链'; dataStructure: '数据结构'; callChain: '调用链'; timestampVersion: '时间戳版本'; exception: '异常' }` |
| `LOG_UNKNOWN_PLACEHOLDER` | runtime | #77 | implemented | 3.4 | `'(未知)'` |
| `TEXT_EMPTY_PLACEHOLDER` | runtime | #77 | implemented | 3.4 | `'未填写'` |
| `TEXT_SENSITIVE_MASK` | runtime | #77 | implemented | 3.4 | `'****'` |
| `TEXT_HEADER_TEMPLATE` | runtime | #77 | implemented | 3.4 | `'【{skill} · {key}】'` |
| `TEXT_JSON_INDENT` | runtime | #77 | implemented | 3.4 | `2` |
| `TEXT_JSON_LT_RULE` | runtime | #77 | implemented | 3.4 | `'u003c'` |
| `CSV_DIALECT` | runtime | #77 | implemented | 3.4 | `{ delimiter: ','; quote: '"'; quoteEscape: '""'; lineEnding: 'LF'; header: readonly ['section', 'row'] }` |
| `TEXT_ERROR_CODES` | runtime | #77 | implemented | 3.4 | `readonly ['shape-unsupported', 'structure-invalid', 'format-unknown']` |
| `SENSITIVE_ROW_RULE` | runtime | #77 | implemented | 3.4 | `{ textField: 'text'; flagField: 'sensitive'; flagValue: true; mask: '****'; textNotice: '（敏感字段已脱敏）' }` |
| `SerializableEnvelope` | type | #77 | implemented | 3.4 | `Envelope<SerializableShape>` |
| `DataTextInput` | type | #77 | implemented | 3.4 | `{ envelope: SerializableEnvelope; format?: CopyFormat; title?: string; occurredAt?: string }` |
| `LogTextInput` | type | #77 | implemented | 3.4 | `{ envelope: SerializableEnvelope; format?: CopyFormat; copyLog?: CopyLogFields }` |
| `CopyLogFields` | type | #77 | implemented | 3.4 | `{ thinking?: string; dataStructure?: string; callChain?: string; timestamp?: string; exception?: string }` |
| `LOG_SECTION_SOURCES` | runtime | #77 | implemented | 3.4 | `{ scene: 'envelope'; thinking: 'copyLog.thinking'; dataStructure: 'copyLog.dataStructure'; callChain: 'copyLog.callChain'; timestampVersion: 'copyLog.timestamp'; exception: 'copyLog.exception' }` |
| `DataProjectionSpec` | type | #77 | implemented | 3.4 | `{ header: string; body: string; tail: string \| null; csvSections: readonly string[] }` |
| `DATA_TEXT_PROJECTIONS` | runtime | #77 | implemented | 3.4 | `{ stat: { header: '【{skill} · {key}】'; body: 'metrics'; tail: null; csvSections: readonly ['metrics'] }; list: { header: '【{skill} · {key}】'; body: 'items'; tail: 'total'; csvSections: readonly ['items', 'total'] }; detail: { header: '【{skill} · {key}】'; body: 'item'; tail: null; csvSections: readonly ['item'] }; receipt: { header: '【{skill} · {key}】'; body: 'ok'; tail: 'message'; csvSections: readonly ['status', 'message'] }; analysis: { header: '【{skill} · {key}】'; body: 'summary'; tail: null; csvSections: readonly ['summary'] } }` |
| `BuildDataText` | type | #77 | pending | 3.4 | `(input: DataTextInput) => string` |
| `buildDataText` | runtime | #77 | pending | 3.4 | `(input: DataTextInput): string` |
| `BuildLogText` | type | #77 | pending | 3.4 | `(input: LogTextInput) => string` |
| `buildLogText` | runtime | #77 | pending | 3.4 | `(input: LogTextInput): string` |
<!-- FROZEN-SURFACE-TABLE-END -->

**签名与输入对齐（AC-5／B2）**

```ts
export type BuildDataText = (input: DataTextInput) => string;
export type BuildLogText = (input: LogTextInput) => string;
export interface DataTextInput { envelope: SerializableEnvelope; format?: CopyFormat; title?: string; occurredAt?: string }
export interface LogTextInput { envelope: SerializableEnvelope; format?: CopyFormat; copyLog?: CopyLogFields }
```

- 输入是 **envelope**（`{ version, skill, shape, key, data }`），`shape ∈ SERIALIZABLE_SHAPES`（六形状去掉 `fallback`）。`shape: 'fallback'` → 抛 `TextError` code `shape-unsupported`（降级载荷不进复制文本）。`SERIALIZABLE_SHAPES` 的**成员顺序无语义**（不决定 CSV 行序／遍历序），只有成员集有效（V3 疑点②小瑕处置）。
- snapshot 结构接口**不移植**（B2）：旧 `snapshot = { title, summary[], sections[] }` 与 `data.scene.snapshot` 一律删除；展示结构由下方**逐 shape 投影表**给出。

**逐 shape 投影表（FX-1①，定死）**——机读真相源 `DATA_TEXT_PROJECTIONS`（`spec/text.ts`），`data` 形态对齐 `packages/base-link-core/src/envelope.ts:13-20` 的 `EnvelopeDataByShape`：

| shape | `data` 形态（`EnvelopeDataByShape`） | 复制文本结构（`text` 口径） | 主体行来源 | 收尾行 | csv `section` 列 |
|---|---|---|---|---|---|
| `stat` | `{ metrics }` | 标题行 ＋ 指标键值行 | `data.metrics` 逐键展开 | 无 | `metrics` |
| `list` | `{ items, total }` | 标题行 ＋ 逐项行 ＋ `total` 收尾行 | `data.items` 逐项展开 | `data.total` | `items`／`total` |
| `detail` | `{ item }` | 标题行 ＋ 字段行 | `data.item` 逐键展开 | 无 | `item` |
| `receipt` | `{ ok, message }` | 状态行 ＋ 消息行 | `data.ok` 状态行 | `data.message` | `status`／`message` |
| `analysis` | `{ summary: string }` | 标题行 ＋ 摘要文本 | `data.summary` | 无 | `summary` |

- 标题行逐字 = `TEXT_HEADER_TEMPLATE`（`【{skill} · {key}】`，取 `envelope.skill`／`envelope.key`）；`DataTextInput.title` 可覆盖，`occurredAt` 给定时在其后追加时间行。
- `json`／`csv` 口径**无输出头**（标题行不输出）；`json` 的键名 = envelope 五字段原样。

**6 段日志 ↔ `CopyLogFields` 对应表（FX-1③，定死）**——机读真相源 `LOG_SECTION_SOURCES`：

| 段序 | `LOG_SECTIONS` 成员 | `LOG_SECTION_TITLES` | 数据源 | 缺失时（`text` 口径） |
|---|---|---|---|---|
| ① | `scene` | 场景标识 | **由 envelope 派生**（`envelope.skill`／`envelope.key`／`envelope.shape`），文本形如 `{skill}.{key}（{shape}）` | 不适用（envelope 五字段恒有） |
| ② | `thinking` | AI 思考链 | `copyLog.thinking` | `LOG_UNKNOWN_PLACEHOLDER`（`(未知)`） |
| ③ | `dataStructure` | 数据结构 | `copyLog.dataStructure` | 同上 |
| ④ | `callChain` | 调用链 | `copyLog.callChain` | 同上 |
| ⑤ | `timestampVersion` | 时间戳版本 | `copyLog.timestamp`（**不是** `timestampVersion` 字段） | 同上 |
| ⑥ | `exception` | 异常 | `copyLog.exception` | 同上 |

- **6 段 = 1 段 envelope 派生 ＋ 5 段 `CopyLogFields`**，不留「6 段只有 5 个数据源」；段序恒按 `LOG_SECTIONS`。

**`format` 语义补全（旧侧未定义，本契约定死）**

| format | 输出头 | 空值口径 | 转义口径 | 分隔／缩进 |
|---|---|---|---|---|
| `text`（缺省） | `TEXT_HEADER_TEMPLATE`（`【{skill} · {key}】`）+ 时间行（`occurredAt` 给定时）+ 主体行（投影表 `body`）+ 收尾行（投影表 `tail`） | 数据空值写 `TEXT_EMPTY_PLACEHOLDER`（`未填写`）；日志段缺失写 `LOG_UNKNOWN_PLACEHOLDER`（`(未知)`，见下） | 不转 HTML；行内换行替换为空格 | 行分隔 `LF`；分节标题与行各占一行 |
| `json` | 无输出头 | 空值保留 `null`（**不**写「未填写」／「(未知)」，键不省略） | 文本中 `<` 一律写成反斜杠 + `u003c`（`TEXT_JSON_LT_RULE`） | 缩进 `TEXT_JSON_INDENT`（2 空格）；键名 = envelope 五字段原样 |
| `csv` | 无输出头 | 空值写**空字符串**（机器可读，不写占位符） | RFC4180：字段含 `,`／`"`／换行时用 `"` 包裹，内部 `"` 写成 `""`（`CSV_DIALECT`） | 表头 `CSV_DIALECT.header = ['section', 'row']`；行尾 `LF` |

- **敏感行判定口径（FX-23，机读真相源 `SENSITIVE_ROW_RULE`）**：投影行（`metrics`／`item` 的**值**、`items` 的**元素**）取值为 `{ text: string, sensitive: true }` 形态时判为**敏感行**——判定只看源值的 `sensitive` 字段是否为字面 `true`（`flagValue`），**不看文本内容**；`text` 字段是原文。该形态的**字段名**与旧侧 `_rowText` 一致（`{ text, sensitive }`，`base.js:218-221`——`:219` 函数、`:221` 合并掩码行）；**判定语义不同（FX-30／V5 C-8，显式声明）**：旧侧是**真值判定**（`if (r.sensitive)`，`base.js:221`，故 `sensitive: 1`／`'yes'` 亦脱敏），新契约只认**字面 `true`**（`flagValue`）——「形态一致」仅指字段名，**不是**判定一致。
  - 三种 format **一律**输出 `SENSITIVE_ROW_RULE.mask`（= `TEXT_SENSITIVE_MASK`，`****`）；`text` 口径在该行**之后紧跟一行** `SENSITIVE_ROW_RULE.textNotice`（`（敏感字段已脱敏）`）。
  - **与旧侧的偏离（显式声明）**：旧侧把掩码与提示合成一行 `'****（敏感字段已脱敏）'`（`base.js:221`）；新契约拆成「掩码行 ＋ 提示行」——理由是掩码值须能被 `TEXT_SENSITIVE_MASK` 逐值断言，且 `json`／`csv` 下不得夹中文提示（json 值必须是纯掩码字符串、csv 单元格同）。语义等价：原文一律不出现。
  - `EnvelopeDataByShape` 不含该形态 → 它是 **text 层的行值包装**，不改变 envelope 契约；`json` 口径该键值写 `mask`（不写 `null`）。
- **主体行文本格式（登记：不冻结也不排除）**：单行文本的**书写形式**（键值分隔符、逐项行前缀、缩进等）**不冻结也不排除**，owner **#77**（其票面验收含逐 shape 输出行断言）。本契约冻结的是：行**来源**（`DATA_TEXT_PROJECTIONS`）、行**序**、`csv` 的 `section` 分组、三种 format 的空值口径、敏感行掩码，以及「一行 = 一个投影值」。**不得**因此自造第二份投影表。
- **空值口径分层（FX-1④，定死）**：`text` 口径下**数据**空值写 `TEXT_EMPTY_PLACEHOLDER`（`未填写`）、**日志**段缺失写 `LOG_UNKNOWN_PLACEHOLDER`（`(未知)`）；`json` 口径**两者都写 `null`**（键不省略，**不**写任何占位符）；`csv` 口径**两者都写空字符串**（不写占位符）。即：两个占位符**只作用于 `text`**，与 `json`／`csv` 不冲突（V1 洞 8 处置）。
- **csv 两列语义（FX-1④，定死）**：表头 `CSV_DIALECT.header = ['section', 'row']`。
  - `buildDataText`（csv）：行序 = 投影表主体行 → 收尾行（标题行／时间行**不输出**）；`section` 列 = 投影表的 `csvSections`（逐行对应）；`row` 列 = 该行文本（空值写空串）。
  - `buildLogText`（csv）：行序 = `LOG_SECTIONS` 段序，**每段一行**；`section` 列 = 段名（`scene`／`thinking`／…）；`row` 列 = 该段文本（缺失写空串）；敏感行整行写 `****` 于 `row` 列、`section` 保留段名（V1 洞 9 处置）。
  - 引号与行尾见上表（RFC4180 ／ `LF`）。
- **日志 json 口径**：`buildLogText` 的 `json` 输出 = 以 6 个段名为键的对象（`scene`／`thinking`／`dataStructure`／`callChain`／`timestampVersion`／`exception`），缺失段写 `null`；`scene` 值同为 envelope 派生文本。
- 结构校验违规（`title` 非字符串／`data` 与 shape 不匹配／`data` 不符 `EnvelopeDataByShape[shape]`）→ **直接抛错**，code `structure-invalid`（对齐旧 Q7 拍板「违规直接报错」，`contract:164`）。
  - **判据以 `EnvelopeDataByShape[shape]` 为准（FX-1②）**：`stat` 缺 `metrics` 对象／`list` 的 `items` 非数组／`detail` 缺 `item` 对象／`receipt` 缺 `ok`／`message`／`analysis` 缺非空 `summary` → `structure-invalid`。
  - **旧 snapshot 判据已废除**：对 `sections[{heading, rows}]`／`summary[]`／`data.scene.snapshot` 的一切引用**一律删除**（B2：snapshot 结构接口不移植）；契约与测试中**不得**再出现「分节缺 `heading` 或 `rows`」这类判据。
- `format` 不在 `COPY_FORMATS` 内 → 抛 `TextError` code `format-unknown`。

**所属包**：`base-paint`。**旧侧对应物**：§6.1 `contract:145-166`；`base.js:197-267`（`_validateSnapshot`／`_rowText`／`buildDataText`／`buildLogText`）。

### 3.5 图表层与 HELP 壳（#78）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `CHART_KINDS` | runtime | #78 | implemented | 3.5 | `readonly ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']` |
| `CHARTS_STYLE_ID` | runtime | #78 | implemented | 3.5 | `'ilife-charts'` |
| `CHART_STRUCTURE_RULE` | runtime | #78 | implemented | 3.5 | `'throw'` |
| `CHART_EMPTY_RULE` | runtime | #78 | implemented | 3.5 | `'emptyState'` |
| `CHART_COORD_RULE` | runtime | #78 | implemented | 3.5 | `'viewBox-only'` |
| `CHART_BREAKPOINTS` | runtime | #78 | implemented | 3.5 | `{ mobileMaxPx: 720; dotSizeMobilePx: 8; lineHeightMobilePx: 150; stackedGapPx: 3 }` |
| `CHART_PALETTE` | runtime | #78 | implemented | 3.5 | `readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']` |
| `CHART_ERROR_CODES` | runtime | #78 | implemented | 3.5 | `readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']` |
| `SCENE_STATUS` | runtime | #78 | implemented | 3.5 | `readonly ['', '【待开发】']` |
| `SCENE_TYPE_FIELD` | runtime | #78 | implemented | 3.5 | `'types'` |
| `SCENE_DATA_SCHEMA` | runtime | #78 | implemented | 3.5 | `object（draft-07；$id: 'ilife://base-paint/scene-data.schema.json'）` |
| `HELP_SHELL_ID` | runtime | #78 | implemented | 3.5 | `'ilife-help-shell'` |
| `HELP_COPY_TARGETS` | runtime | #78 | implemented | 3.5 | `readonly ['prompt', 'wakeWord', 'params']` |
| `HELP_COPY_ACTIONS` | runtime | #78 | implemented | 3.5 | `{ prompt: { actionId: 'ilife-help-copy-prompt'; label: '复制指令' }; wakeWord: { actionId: 'ilife-help-copy-wakeWord'; label: '复制唤醒词' }; params: { actionId: 'ilife-help-copy-params'; label: '复制参数' } }` |
| `HELP_SCHEMA_ERROR_CODES` | runtime | #78 | implemented | 3.5 | `readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']` |
| `ChartItem` | type | #78 | implemented | 3.5 | `{ label: string; value: number \| null; color?: string; values?: readonly number[]; anomaly?: boolean }` |
| `ChartOutput` | type | #78 | implemented | 3.5 | `{ kind: ChartKind; html: string; empty: boolean; points: number }` |
| `ChartsApi` | type | #78 | implemented | 3.5 | `{ bar(input: BarChartInput): ChartOutput; line(input: LineChartInput): ChartOutput; donut(input: DonutChartInput): ChartOutput; progress(input: ProgressChartInput): ChartOutput; combo(input: ComboChartInput): ChartOutput; sparkline(input: SparklineChartInput): ChartOutput; gauge(input: GaugeChartInput): ChartOutput; scatter(input: ScatterChartInput): ChartOutput }` |
| `charts` | runtime | #78 | pending | 3.5 | `ChartsApi` |
| `SceneData` | type | #78 | implemented | 3.5 | `{ skill_name: string; title: string; subtitle?: string; meta_blocks?: readonly SceneMetaBlock[]; groups: readonly SceneGroup[]; init_banner?: SceneInitBanner; contact?: SceneContact; version?: string; recommendations?: readonly SceneRecommendation[] }` |
| `Scene` | type | #78 | implemented | 3.5 | `{ id: string; title: string; wake_word: string; types?: readonly (string \| SceneTypeBadge)[]; status: SceneStatus; prompt_template: string; editable_fields?: readonly SceneEditableField[] }` |
| `HelpShellInput` | type | #78 | implemented | 3.5 | `{ sceneData: SceneData; assets: TemplateAssets; strict?: boolean; template?: string }` |
| `RenderHelpShell` | type | #78 | pending | 3.5 | `(input: HelpShellInput) => FillTemplateOutput` |
| `renderHelpShell` | runtime | #78 | pending | 3.5 | `(input: HelpShellInput): FillTemplateOutput` |
| `ChartsHelpersInput` | type | #78 | implemented | 3.5 | `{ prefix?: string; styleId?: string }` |
| `BuildChartsHelpersJs` | type | #78 | pending | 3.5 | `(input?: ChartsHelpersInput) => string` |
| `buildChartsHelpersJs` | runtime | #78 | pending | 3.5 | `(input?: ChartsHelpersInput): string` |
<!-- FROZEN-SURFACE-TABLE-END -->

#### 3.5.1 图表 8 接口逐条对照（AC-17／B4）

| 旧接口（`old-v130-signatures.md` 证据） | 新签名（逐字） | 判定 | 落点／说明 |
|---|---|---|---|
| `charts.bar(el, items[, opt])`（§6.5 `contract:202,211,230`） | `bar(input: BarChartInput): ChartOutput` | 无 → 冻结 | 去掉 `el`；`opt` 覆盖 `format／colors／singleColor／height／compact／labels／showValues／yMin／yMax／grid／tooltip／animation／actionId／stacked／grouped／segNames／stackMode` |
| `charts.line(el, items[, opt])`（§6.5 `contract:203,211,229`） | `line(input: LineChartInput): ChartOutput` | 无 → 冻结 | `LineChartOptions` 含 `lineWidth／dashed／smooth／step／showDots／dotSize／dotStyle／area／areaOpacity／labels／showValues／labelRotate／yMin／yMax／grid／yTicks／connectNulls／legend／highlightLast／avgLine／markLine／markPoint／band／fillBetween／highlightPoints／series` |
| `charts.donut(el, items[, opt])`（§6.5 `contract:204,231`） | `donut(input: DonutChartInput): ChartOutput` | 无 → 冻结 | `size／ringWidth／legend／showPercent／centerLabel／centerValue／colors／format／animation`；取色板 `CHART_PALETTE` |
| `charts.progress(el, pct[, opt])`（§6.5 `contract:205,232`） | `progress(input: ProgressChartInput): ChartOutput` | 无 → 冻结 | `pct` 非数 → 抛 `ChartError` code `pct-invalid`；超界收敛 0~100（逐字对齐旧行为） |
| `charts.combo(el, {bars, lines}, opt)`（§6.5 `contract:206,233`） | `combo(input: ComboChartInput): ChartOutput` | 无 → 冻结 | `{ bars, lines, options? }`；旧签名 `opt` 必填，新签名**可选**（宽化，不破坏调用） |
| `charts.sparkline(el, items[, opt])`（§6.5 `contract:207,234`） | `sparkline(input: SparklineChartInput): ChartOutput` | 无 → 冻结 | `showValue`＋`format`（涨绿跌红）；无坐标轴 |
| `charts.gauge(el, pct[, opt])`（§6.5 `contract:208,235`） | `gauge(input: GaugeChartInput): ChartOutput` | 无 → 冻结 | `label／color／size／format／animation`；`pct` 非数抛错 |
| `charts.scatter(el, items[, opt])`（§6.5 `contract:216`，v1.25 · #337） | `scatter(input: ScatterChartInput): ChartOutput` | 无 → 冻结 | `ScatterItem = { x, y, label? }`；非法 `x/y` 抛错；`regression／regressionColor／dotSize／labels`；双端自适应沿用 line 语义 |
| 复合形态 `combo`／`sparkline`／`gauge`（§6.6 `contract:249-251`） | 同 `CHART_KINDS` 三成员，各自独立 input 类型 | 无 → 冻结 | 形态原则：新形态独立成组件，共享同一 token／空态／双端规则 |
| 双端自适应（§6.5 `contract:238`） | `CHART_BREAKPOINTS` | 无 → 冻结 | `mobileMaxPx: 720`、`dotSizeMobilePx: 8`、`lineHeightMobilePx: 150`、`stackedGapPx: 3` |
| 空态联动（§6.5 `contract:213`） | `CHART_EMPTY_RULE = 'emptyState'`；`ChartOutput.empty` | 无 → 冻结 | 空数组 → `renderEmptyState` 联动（合法场景，不抛错）；`points === 0` 时 `empty === true` |
| `pct` 型接口（`progress`／`gauge`，V1 洞 11 处置） | `ProgressChartInput`／`GaugeChartInput` 的 `pct` | 无 → 冻结 | `pct` 型接口 `points` **恒为 1**；`pct === 0` 时 `empty === false`（0% 是合法值，不是空态） |
| 选项级语义（V1 洞 10 处置：不冻结也不排除） | 8 个 `*ChartInput` 内的 `*Options` | 无 → 冻结 | 选项级语义（`yTicks` 收敛 2-6、`stacked` 默认 `percent` 且与 `grouped` 互斥、`fillBetween.a/b` 是 series 索引、`band` 等长、`markPoint` 缺省最大点、`ownScale` 不参与共享域、`regressionColor` 缺省 `#ff3b30`、`dotSize` 9px 等）**不在本契约冻结范围、也不排除**——owner 是 **#78**，实现时以 `old-v130-signatures.md:166-178` 为准并在其票面逐条对照；本契约只冻结上表列出的接口级签名与常量 |
| 旧 `combo.y2`（V1 洞 10 处置：不冻结也不排除） | 旧 `charts.combo(el, {bars,lines}, opt)` 的 `opt.y2` | 无 → 冻结 | 新 `ComboChartInput` **无 `y2` 字段**；`y2`（双 Y 轴）**不冻结也不排除**——owner #78 可在 `ComboChartInput.options` 内追加 `y2`，**不得**改动本表已冻结的签名与常量 |
| 结构校验（§6.5 `contract:212`） | `CHART_STRUCTURE_RULE = 'throw'`；`CHART_ERROR_CODES` | 无 → 冻结 | `items` 非数组／缺 `label`／`value` 非法（非数且非 null）→ 抛 `ChartError` code `structure-invalid` |
| 坐标唯一性（§6.5 `contract:237`） | `CHART_COORD_RULE = 'viewBox-only'` | 无 → 冻结 | 容器零 padding，留白进 viewBox；`vector-effect="non-scaling-stroke"` |
| 自包含（§6.5 `contract:240`） | `CHARTS_STYLE_ID = 'ilife-charts'` | 无 → 冻结 | 样式自注入、本地转义兜底、不依赖其它资产；**不得**引第三方库（零运行时依赖） |
| 白名单例外（§6.5 `contract:241`） | **不移植**（B4） | 无 | 去掉例外：技能侧不得自建图表画布；`CHART_KINDS` 是闭集 |
| 工程约束 | `ChartOutput.html` 为**纯 CSS + SVG 字符串** | 无 → 冻结 | 无 `<canvas>`、无内联脚本（交互走 `actionId`）、无 `node:` |

**共享图表 JS 文本的唯一产出者（FX-22，归 #78；#74 只消费）**

- **冻结签名**：`buildChartsHelpersJs(input?: ChartsHelpersInput): string`；`ChartsHelpersInput = { prefix?: string; styleId?: string }`（缺省 `ilife-`／`CHARTS_STYLE_ID`）。
- **触发条件**：仅当模板含 `<!--CHARTS-HELPERS-->`（`MARKER_RULES.chartsHelpers.rule = 'zero-or-one'`）时，`TemplateAssets.chartsHelpersJs` 才被消费；出现 1 次但未提供资产 → `asset-missing`（§3.1）。
- **产出内容契约**：与 `buildSharedHelpersJs` **同一份** `SHARED_HELPERS_JS_RULE`（§3.3，FX-18）——自包含／幂等／允许 DOM／禁 `window`·`globalThis` 赋值／禁 `node:`；**不设第二套规则表**。空串 → `asset-missing`。
- **不许自造**：技能侧自产 charts helpers 副本（B3）；第二个 charts helpers 产出者；把 `el`／DOM 实例塞进签名。
- 至此三个注入资产**各有唯一产出者**：`sharedHelpersJs` ← `buildSharedHelpersJs`（#76）、`sharedCssText` ← `buildStyleSheet().css`（#75）、`chartsHelpersJs` ← `buildChartsHelpersJs`（#78）；**无「被要求但无产出者」的资产**。

#### 3.5.2 scene-data 契约（AC-3／AC-4）

- **字段名取 `types`（复数）**：`SCENE_TYPE_FIELD = 'types'`，**不提供 `type` 别名**。这是对旧侧硬分歧的裁定——`docs/scene-data-contract.md:78` 与 `docs/scene_data.schema.json:70` 用 `types`，`assets/help_template.html:52` 用 `type`（笔误）；机读 schema 优先于散文与模板笔误，单复数双写会制造第二真相。
- **唯一机读 schema**：`SCENE_DATA_SCHEMA`（`packages/base-render/src/spec/help.ts`，draft-07，`$id: 'ilife://base-paint/scene-data.schema.json'`）。**本文只是它的可读投影**；两者不一致视为契约缺陷。它已补齐旧 schema 因 `additionalProperties: false` 拒绝的字段：`init_banner`／`contact`／`version`／`recommendations`（old §6 缺口 5），因此旧 `help_example_data.json` 在新 schema 下可校验通过。
- **随包发布的 `scene-data.schema.json`（FX-6，定死）**：若 #78 或任何包随包发布名为 `scene-data.schema.json` 的文件（`$id` 已用该文件名，极易被顺手实现），**必须**由 `SCENE_DATA_SCHEMA` **序列化生成**（`JSON.stringify(SCENE_DATA_SCHEMA)`，不得手写、不得二次编辑），并由签名测试**逐值断言**（`test/contract-signatures.test.mjs` 的 FX-6 用例：文件存在即与常量 `deepEqual`）。**不发布也合规**；一旦发布，禁止出现「TS 常量 vs 包内 `.json`」两份可独立漂移的权威（AC-4）。
- **顶层**：`skill_name`（必填）／`title`（必填）／`groups`（必填）／`subtitle?`／`meta_blocks?`／`init_banner?`／`contact?`／`version?`／`recommendations?`。
- **`groups[]`**：`id`／`label`／`subgroups[]`（必填），`icon?`；**`subgroups[]`**：`id`／`label`／`scenes[]`（必填，非空）。
- **`scenes[]`**：`id`／`title`／`wake_word`／`status`／`prompt_template`（必填），`types?`／`editable_fields?`；`status ∈ SCENE_STATUS = ['', '【待开发】']`；`id` 全局唯一（重复 → `HelpSchemaError` code `duplicate-id`）；`types` 元素 = 字符串或 `{ text, bg?, fg? }`（非法 → `types-invalid`）；结构不符 → `schema-invalid`。
- **`meta_blocks[].html`** 为技能方 HTML 原文，Base **原样透传不渲染**（转义由技能方自理，`contract:114,116`）。

#### 3.5.3 HELP 壳接口（B6／Q11，可直接被 #88 复用）

```ts
export interface HelpShellInput {
  readonly sceneData: SceneData;      // 技能包提供的场景数据（唯一数据源）
  readonly assets: TemplateAssets;    // 共享资产：走同一填充器（B3）
  readonly strict?: boolean;          // 透传给 fillTemplate
  readonly template?: string;         // 覆盖内置壳模板
}
export type RenderHelpShell = (input: HelpShellInput) => FillTemplateOutput;
```

- **形态**：HTML 速查台（B6）——标题区（`skill_name`／`title`／`subtitle`／`init_banner`）+ 分组 Tab（`groups`）+ 二级折叠（`subgroups`）+ 场景卡（`scenes`）+ Sheet 弹层（`editable_fields` + **指令实时预览**）+ 关于 Tab（`contact`／`version`／`recommendations`）。**术语口径（FX-7）**：对外一律称「指令」（v1.27+ 口径），**不得**写「Prompt 实时预览」／「复制 prompt」等旧词。
- **Q11 回补**：取 F3 并回补 F1／F2 的**逐场景 CLI 展示与变体示例**——每张场景卡展示该场景的 CLI 形态（`skill.<combo>.<key>` 文本，来自 `Scene.id` 与技能提供的数据）与 `types` 徽章变体；`prompt_template` 全文展示并可直接复制。
- **一键复制**：`HELP_COPY_TARGETS = ['prompt', 'wakeWord', 'params']`，复制动作走 `copyText(text, ports, opts?)`（§3.3 同一签名），**不新增**复制实现。
- **复制目标的 id → actionId → 对外文案（FX-7，定死）**：机读真相源 `HELP_COPY_ACTIONS`。

  | id（`HELP_COPY_TARGETS`） | `actionId` | 对外文案 |
  |---|---|---|
  | `prompt` | `ilife-help-copy-prompt` | **复制指令** |
  | `wakeWord` | `ilife-help-copy-wakeWord` | 复制唤醒词 |
  | `params` | `ilife-help-copy-params` | 复制参数 |

  壳渲染场景卡时把 `prompt_template` 全文写入按钮的 `data-t`（渲染期序列化，零注入面），三个按钮的 `actionId` 取上表并写入 `ACTION_ID_ATTR`（§3.3，FX-17）；点击分发走 `bindCopyAction`（§3.3，id 由 `listActionIds()` 发现，**不得**另定通配约定）。
- **HELP 壳产物结构（V1 洞 7 处置：不冻结也不排除）**：DOM 结构／类名／区块顺序的**逐节点契约不冻结也不排除**——owner 是 **#78**（壳渲染）与 **#88**（速查台重建），验收以 #88 的三条守卫（占位符 0 残留／`id` 唯一／`copyText` 单实现）＋ #96 快照门为准。本契约冻结的是**可断言的锚点**：`HelpShellInput` 四件套、`HELP_SHELL_ID`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS`、类名前缀 `ilife-`（`CONTROL_STYLE_SECTIONS.helpShell`）、三个必需占位符各恰好 1 次。
- **填充**：壳模板必须走 `fillTemplate`（**载荷槽恰有其一**——HELP 壳为**数据页**：`INJECT-DATA` 恰 1 次且落在自带容器内，见 §3.1.2②；`SHARED-CSS` 恰好 1、`SHARED-HELPERS` 恰好 1）；HELP 壳不得自填、不得内联脚本、不得读全局。
- **#88 复用面**：`HelpShellInput` ＋ `SceneData` ＋ `SCENE_DATA_SCHEMA` ＋ `HELP_COPY_TARGETS` 四件套即为 #88 的全部输入面——#88 **不需要**新增任何签名，只需提供 `SceneData` 与 `TemplateAssets`。
- **数据归技能包**：唤醒词与场景数据是技能资产（t72 §5.2）；壳归共享层。

**所属包**：`base-paint`。**旧侧对应物**：§6.5 `contract:199-241`；§6.6 `contract:243-251`；`help_template.html` 611 行；`scene-data-contract.md`／`scene_data.schema.json`；`injector.py:134-191`。

## 4. 归属边界

### 4.1 base-paint 侧只提供「静态呈现 + 复制」

**进 base-paint**（本契约冻结）：占位符填充器、共享样式资产、静态呈现控件（`statusBadge`／`emptyState`／`errorReceipt` 的 HTML 面）、复制编排（`copyText` 双通道）、复制文本序列化、图表 SVG 字符串、HELP 壳。

**不进 base-paint（AC-8／B7 → 插件 client）**：`formPrompt`／`selectList`（含行内 `widget`）／`smartSelect`／`confirm`／`foldBox`，以及任何持有 DOM 实例、事件循环、焦点管理、模态遮罩的交互控件。理由：架构规格「共享层归属三类」——依赖宿主（浏览器／DOM／DSH 交互）→ 插件 client。

**边界判定法**：一个能力若「给定输入即可产出确定字符串，且不需要在页面上存活」，归 base-paint；若「需要挂载、监听、维护状态、随会话销毁」，归插件 client。

**控件级 vs 区块级分层（FX-9，#104 粒度裁决）**：

- **控件级（原子，本契约冻结）**：`CONTROL_NAMES` 的 6 个（`toast`／`copyText`／`actionBar`／`statusBadge`／`emptyState`／`errorReceipt`）＝「给定输入 → 确定 HTML 字符串／outcome」的原子能力，签名由本契约冻结、由 #76 实现。
- **区块级（页面级组合，接口 owner 是 #104）**：12 个区块组件（含「空态」「复制」类区块）是**页面级组合**；它**组合**控件，**不得**重定义控件签名、不得复制控件实现、不得改 `CONTROL_*`／`STATUS_*`／`COPY_*` 常量。
- **粒度判定法**：只做一件事、可被任意区块复用 → 控件级（本契约）；由多个控件 ＋ 布局 ＋ 数据映射拼成一个页面区块 → 区块级（#104）。
- **越界即缺陷**：本契约**不定义**任何区块组件接口（§4.4 #104 行）；#104 也不得反向把区块接口塞进 `src/spec/`。

### 4.2 留技能包（t72 §5.2）

领域数据组织与 77 键／形状映射、唤醒词与场景数据（436 条 SoT）、HELP 数据内容、技能专属块（`metaHeader`／`remindersBlock` 类，AC-2）、CLI 唯一出口（argv + JSON + exit）、DB schema／迁移／审计、技能自有页面模板（可留包内，但**占位符填充与资产注入必须改走 base-paint**）。

### 4.3 三包边界（`check-boundaries.mjs` 7 条断言，实测全 PASS）

1. `base-link-core` 零依赖；源码不得引用任何 workspace 包（L13／L23）。
2. `base-paint` 无运行时依赖（`base-link-core` 仅 devDependency ＋ `import type`，L15）；不依赖 `base-combos`（L16，**对整份 `package.json` 做子串匹配**，description／注释里出现 `base-combos` 即误伤）。
3. `base-combos` 强依赖 `base-link-core`（L18）；`present.ts` 只许字符串级引 key，禁 import render（L20）。
4. 装配 owner 归一 base-paint：`registerTab`／`openTab`／`mountInjector` 只许住 `base-paint`（L25-28）。
5. 缺失阻断不返空：一律抛错，禁止静默空页。本契约的五个 `*ErrorShape` 与既有 `RenderError` **并列、互不继承**（见 §3.3「错误形态与既有 `RenderError` 的关系」）。
6. 样式只抖 base-paint；类名前缀 `ilife-`；token 表冻结；单品包禁自带样式常量。
7. 浏览器侧资产必须 browser-safe（不得出现 `node:`）。
8. 术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页）；本契约的用词映射与「复制指令」词条登记见 §0.2／§4.4（FX-15①）。

**AC-13 红线**：第 2 条最易破——冻结的填充器与控件契约只许 `import type`；任何需要 envelope 校验的地方，要么由技能侧传入已校验数据，要么用 base-paint 自持的零依赖常量实现。**违反即破坏 #96 的回归门**（base-paint 被 6 个技能共用，契约变更必须能过 per-skill HTML 快照回归门）。

### 4.4 与相邻票的交接（AC-15）

| 相邻票 | 交接内容 |
|---|---|
| #95／#79 | 发布白名单现只含 `base-paint`，不含 `base-link-core`／`base-combos`；`base-combos` 对 `base-link-core` 是**运行时** deps（base-paint 是 devDeps），不可拆发。子路径导出（`exports["./style.css"]` 等）亦归此处 |
| #96 | 契约变更必须能过 per-skill HTML 快照回归门；`escapeHtml` 归一与技能侧私有 CSS 删除都在该门内验收 |
| #104 | 12 个区块组件的**接口 owner 是 #104**；本契约只冻结 base-paint 的共享层签名，**不定义**任何区块组件接口。粒度分层见 §4.1（控件级＝本契约冻结，区块级＝#104 组合控件而不重定义） |
| #80 | `base-combos/HELP.md:66-71` 六行 `undefined：undefined（undefined）` 属 #80，本票不碰 |
| #88 | 直接复用 §3.5.3 的四件套（`HelpShellInput`／`SceneData`／`SCENE_DATA_SCHEMA`／`HELP_COPY_TARGETS`）；复制按钮的 `actionId`／文案取 `HELP_COPY_ACTIONS` |
| #90 | 直接复用 §3.3 的 `copyText` ＋ `bindCopyAction`（含 `listActionIds()` 发现机制）＋ `renderActionBar` ＋ `COPY_ACTION_IDS`／`ACTION_ID_ATTR` ＋ §3.4 的序列化签名（`blocked_by [76,77]`）；「复制 → 反馈」仅凭契约即可接线，端到端示例见 §3.3（FX-3③／FX-17） |
| #83 | `delivery{mode,path?,template?,bytes?}` 与三态交付（文件态／内联态／文本态）由 **#83** 追加：本契约**不冻结其内部结构、也不排除**——§2 把 `Envelope` 冻结为五字段（`version／skill／shape／key／data`）**不构成**对 `delivery` 的否定（那是「当前五字段」的现状冻结，不是「不得新增字段」的禁令）；#83 追加后须同步 §2／§3.4 与签名测试（FX-5） |
| #87 | 输出命名（「目录 ＋ 中文命令 ＋ 时间戳 ＋ 冲突后缀」＋ 显式指定输出路径，规格 ID-21）**不冻结也不排除**，owner #87；本契约只认 `FillTemplateReport.bytes`／`FillTemplateOutput.html` 两个产物面字段（FX-5） |
| #106 | HELP 回补 F1／F2 的**逐场景 CLI 展示**与变体示例（Q11）**不冻结也不排除**，owner #106；壳侧目前只有 `Scene.id` 推导约定（§3.5.3），#106 可新增展示字段但不得改四件套签名（FX-5） |
| #107 | 6 个未引用的「死模板」并入 HELP **不冻结也不排除**，owner **#107**；属技能侧数据，壳只提供渲染面（§3.5.3）。**calorie 6 模板的占位符改造面**（补 `INJECT-DATA` ＋ 自带容器，FX-19）同归 #107（§6.1）；#74 不对未满足占位符契约的模板负责 |
| #99 | 「门面文档示例可执行」门（Testing Decisions 门禁）owner **#99**，不在 base-paint 冻结范围；本契约只保证 §6.1–§6.5 给出的命令可照抄执行（FX-10） |
| #79 | §2 的 26 行对照表是**签名冻结口径**；#79 验收的「v1.30 签名 × 实现实况」对照表以**实现实况**为准——两者口径不同、不互为矛盾（V3 相邻票边界处置） |
| #74 | `packages/skill-bill/scripts/build-help.mjs:28 injectHelpBlock` 与 `injector` 混称：**不属 #92 改动面**，交接给 **#74**（其任务正是消灭 per-skill 私有填充器）；本契约只登记不修（FX-16②） |
| 文档 owner／#79 | `CONTEXT.md` 补录「复制指令」词条（术语基线未收录，见 §0.2）；对外文案口径已定死在 `HELP_COPY_ACTIONS`，词条补录**不冻结也不排除**（FX-15①） |

### 4.5 与旧基线的偏离（#118 包裹约定，显式记账）

**偏离项**：旧基线 `公共组件/README.md:63` 规定「⚠️ 占位符必须放在独立 `<script>`/`<style>` 块内, 勿与 `</script>`/`</style>` 字样混在资产注释里」——**完整原文两句**（FX-118-10③ 补全，此前引用截断，省略了后半句；原文见仓内摘录 `docs/research/t118-baseline-excerpts.md` §1，该摘录取证自旧层取证快照 `.scratch/t118/baseline.md:74`——**归档前旧位置、未入仓、勿据此取件**）：前半句＝**模板自带包裹**（旧 `injector.py:104-122` 全是 `str.replace(marker, text, 1)`，**从不补写标签**），后半句＝**资产文本不得混入闭标签字样**，正是本契约**不变量①**（`WRAP_PREDICATES.assetsBare`）的旧层对应口径。本契约**有意偏离**前半句为「资产裸文本 ＋ **填充器包裹**」（条文见 §3.1.2④，常量 `ASSET_WRAP_RULE`／`ASSET_WRAPPERS`／`WRAP_PREDICATES`），并**沿用并机读化**后半句。

**理由（四条）**：

1. **迁移面**：本约定只需改 **12 个模板**（memo 6 ＋ calorie 6）；反向方案（模板自包）需改 **53～59 个**，代价与风险高一个数量级。
2. **事实多数**：新仓 65 个模板里 **53 个已是「裸标记 ＋ 填充器包」**（bill 16／chef 8／home 21／schedule 8），模板自包是少数派（12 个）。
3. **单一真相**：包裹标签只由 `ASSET_WRAPPERS` 一处给出，避免 65 个模板各自漂移（现状已有「CSS 被 `<style>` 包、HELPERS 裸」的同文件两形态并存）。
4. **旧规则本身不是机读契约**：旧 `docs/component-contract.md` §3（`:64-75`）只规定数量与硬拦截、**未提包裹**；包裹约定仅存在于 README 散文（`:63`）与最小骨架示例（`:75-86`），且旧层存在两代注入形态（Base 管线 vs 渲染器生成 `window.__DATA__`）。

**parity 不受影响**：两种约定产出的 HTML 可完全一致（`<style>` ＋ 资产 ＋ `</style>`／`<script>` ＋ 资产 ＋ `</script>`），Q2 亦不要求 DOM 同构。

**偏离的可复现证据（全部在仓内，FX-118-8 口径）**：`docs/research/t118-template-inventory.md` §0.3（裸 53／包裹 12 逐条统计，**已入仓**）＋ `tooling/classify-templates.mjs`（可复跑，判定只读 `dist` 的冻结常量）＋ 输出快照 `docs/research/t118-template-classification.md`。旧层取证快照 `.scratch/t118/baseline.md`（`injector.py:104-122` 无标签拼接、`README.md:63` 原文、本仓三形态并存）是**归档前旧位置**、未入仓、**勿据此取件**（与 §0 依据表同口径）。

**与 `docs/calorie-architecture.md` 的一致性**：该规格 `:64` 只要求「由 base-paint 统一填充共享样式与脚本占位符」、`:82` 要求「占位符零残留」，**均未规定包裹归属**；本契约把归属显式定死为填充器，**不与规格冲突**，只是补上规格未覆盖的缝。

### 4.6 #76 与旧基线的偏离（toast 样式归位，显式记账）

**偏离项**：旧基线把 **toast 的全部样式内联在 `base.js:75`（2682 字符 CSS 字符串）**，并在首次调用时**自注入 `document.head`**（`base.js:77-84`）；`base.css` 中 `hm-toast` 命中数为 **0**（旧层取证：`.scratch/t76/old-controls.md` §1.1／§3，施工期取证、**未入仓**）。而旧 README／契约同时声明「全部样式唯一真相源在 `base.css`」（旧 `contract:197`）——旧层自身「toast 自注入样式」与「样式唯一真相源」两说并存。本契约**有意偏离**旧层形态（施工单 C-3）：**toast 样式并入 #75 的共享样式区**（`CONTROL_STYLE_SECTIONS` 闭集已含 `toast`，`packages/base-render/src/spec/index.ts:75`），由 `buildStyleSheet` 产出的 `sharedCssText` 经 `<!--SHARED-CSS-->` 注入；`renderToast` **只产 HTML 字符串**（`ilife-` 命名空间类名），**不产样式常量、不自注入 head**。

**理由（三条）**：

1. **单一真相**：`CONTROL_STYLE_SECTIONS` 是闭集（8 个命名空间）；toast 若自注入即出现第二份样式源，与「样式只抖 base-paint」冲突（§4.3 第 6 条）。
2. **无宿主口径一致**（C-1）：`renderToast` 是纯函数产字符串，页面用 `ToastHostPort.mount` 自挂；样式由模板的共享 CSS 块承载，页面侧不需要任何注入器或宿主。
3. **可验收**：#96 的 per-skill HTML 快照回归门只认**一份** `sharedCssText`；自注入的 toast 样式进不了该门。

**偏离的代价（如实记账）**：旧层「缺 `base.css` 时 toast 仍完整可用」这一行为**不再成立**——toast 的**视觉**依赖 `sharedCssText`。**功能面不受影响**：`renderToast` 产出的 HTML 自带 `role`／`aria-live`／`data-max`，`createToastController` 的堆叠与计时与样式无关，无 CSS 时仍是可用的降级块（§3.3「无宿主」表 `toast` 行）。

**可复现证据（仓内）**：`packages/base-render/src/controls.ts`（#76 产出，**零**样式常量、代码零 `document.`）；`packages/base-render/test/controls.test.mjs`「复制数据／日志」用例断言产出**不含内联 `style=`**；`packages/base-render/test/contract-signatures.test.mjs`「#76 追加验收」断言 DOM 只出现在产出 JS 文本里。

## 5. 版本机制

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `BASE_PAINT_CONTRACT_VERSION` | runtime | #92 | implemented | 5 | `'0.1.0'` |
<!-- FROZEN-SURFACE-TABLE-END -->

- **B8 统一版本口径**：`base-link-core`／`base-paint`／`base-combos` 三包**统一版本号**，一次变更三包同版本、同发布。#79 用 changesets 的 `fixed` 组落地（`.changeset/config.json` 现为 `"fixed": []`）；本票只写机制与现状，**不实际升版**。
- **签名变更 = 破坏性变更**：改本文件 §3 的任何签名，必须走 changeset（minor 起），并在同一变更里同步 `SPEC_FROZEN_SURFACE`、`test-d/contract-signatures.ts`、本文标记区表格——三者由签名测试绑死，漏改即 `pnpm build`／`pnpm test` 红。
- **现状**：三包 `version` 均为 `0.1.0`；4 个版本常量（`ENVELOPE_VERSION`／`RENDER_CONTRACT_VERSION`／`RENDER_ENVELOPE_VERSION`／`STYLE_VERSION`）＋本票新增 `BASE_PAINT_CONTRACT_VERSION`，漂移由签名测试钉死（四者必须同值）；`.changeset/` 中与 base-* 版本相关的 7 条见 `new-exports-actual.md` §5.2。
- **本票的 changeset**：`.changeset/base-paint-contract-freeze.md`（`'base-paint': minor`）。

## 6. 给执行票的实现指引

每票只许用下列冻结签名；**不许自造**同义 API、不许改签名、不许把 pending 改成另一套名字。

### 6.1 #74 统一填充器（`src/template.ts`）

- **用**：`fillTemplate`／`FillTemplateInput`（含 `content?`）／`FillTemplateOutput`／`TemplateAssets`／`TEMPLATE_MARKERS`（六标记）／`MARKER_RULES`／**`PAYLOAD_SLOT_RULE`／`TEMPLATE_KINDS`／`TemplateKind`／`TEMPLATE_KIND_RULE`／`ASSET_WRAP_RULE`／`ASSET_WRAPPERS`／`ASSET_MARKER_KEYS`／`WRAP_PREDICATES`／`CONTAINER_CHECK_RULE`／`TEMPLATE_CHECK_ORDER`（#118，后四条为 FX-118 返修新增）**／`INJECTION_ORDER`／`DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`／`STRICT_ENVELOPE_*`／`TEMPLATE_ERROR_CODES`。
- **不许自造**：`injectHtml`／`htmlInjector`／任何 `inject*` 填充函数名；技能侧保留 `fillTemplate`／`fillSharedMarkers` 私有副本（B3 要求删除）；运行时 `import` base-link-core；**生成／补写 `<script>` 容器**（只替换标记文本，容器由模板自带，FX-2①②）；自产 `sharedHelpersJs`（产出者是 #76 的 `buildSharedHelpersJs`，FX-2③）；自产 `chartsHelpersJs`（产出者是 #78 的 `buildChartsHelpersJs`，FX-22）；**自造 `<!--CONTENT-->` 字面量或第二份正文标记**（恒取 `TEMPLATE_MARKERS.content`）；**自造包裹标签字面量**（恒取 `ASSET_WRAPPERS`，不得在实现里写第二份 `<style>`／`<script>`）；**自造分型表或载荷槽判定**（恒取 `TEMPLATE_KIND_RULE`／`PAYLOAD_SLOT_RULE`）；**自造判定次序或第二份包裹不变量谓词**（恒取 `TEMPLATE_CHECK_ORDER`／`WRAP_PREDICATES`，FX-118-2／FX-118-3）；**自定容器校验作用域**（恒取 `CONTAINER_CHECK_RULE.appliesWhenMarker`，FX-118-1）。
- **模板必须满足占位符契约（FX-19／#118 硬约束）**：任何交给 `fillTemplate` 的模板**必须**同时满足——① **载荷槽恰有其一**（`PAYLOAD_SLOT_RULE`）：含 `<!--INJECT-DATA-->`（数据页）或 `<!--CONTENT-->`（内容页），两者皆无 → `marker-missing`、两者皆有 → `marker-conflict`；② **含 `<!--INJECT-DATA-->` 时**该标记**恰 1 次**且落在自带容器 `<script id="payload" type="application/json">…</script>` 内（缺容器或 id／type 不符 → `container-missing`；**无 `INJECT-DATA` 的模板不校验容器**——内容页无容器**合法**，FX-118-1／`CONTAINER_CHECK_RULE`）；③ `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->` 各**恰好 1 次**（声明 `<!--NO-SHARED-->` 时可缺席），且**三个共享资产标记**（`WRAP_PREDICATES.forbidPreWrappedMarker.scope`）**不得被预包裹**（不变量②，违者 `marker-conflict`；`<!--INJECT-DATA-->` 的容器**不算**预包裹）。不满足 → 抛对应 code（`strict` 与否都生效），**不返空页**；多条件同时命中时按 `TEMPLATE_CHECK_ORDER` **首个命中即抛**（§3.1.2⑤）。
- **正文填充（#118）**：模板含 `<!--CONTENT-->` → 用 `input.content` 替换该标记文本（不转义、不加工）；`input.content === undefined` → `content-missing`。数据页忽略 `content`，内容页忽略 `data`（§3.1.2①）。`data` 只在模板含 `<!--INJECT-DATA-->` 时校验。
- **包裹与顺序（#118）**：三个共享资产按 `ASSET_WRAPPERS` 逐字包裹后替换标记（CSS→`<style>`、JS→`<script>`）；资产文本自带包裹标签 → `asset-missing`（判定谓词 `WRAP_PREDICATES.assetsBare`）；替换顺序恒按 `INJECTION_ORDER`（正文不在其中、且与四个注入步**无先后语义**，见 §3.1.2①／④）。
- **calorie 6 模板的处置（FX-19，登记）**：`packages/skill-calorie/templates/{diet,exercise,goal,help,home,photo-gallery}.html` 实测**只有** `<!--SHARED-CSS-->`×1 ＋ `<!--SHARED-HELPERS-->`×1，**无 `<!--INJECT-DATA-->`、无 `<!--CONTENT-->`、无自带容器**（两载荷槽 0 命中）→ 按 `TEMPLATE_KIND_RULE` 属 **`legacy`（契约外遗留资产）**；即**死资产**（无引用、无填充者），按契约直接调用 `fillTemplate` **必抛** `marker-missing`（这是**正确行为**：它们不该能填；判定次序 `TEMPLATE_CHECK_ORDER` 中 `marker-missing` 早于其 SHARED-CSS 预包裹触发的 `marker-conflict`，见 §3.1.2⑤）。其**改造面（补载荷槽 ＋ 自带容器）与并入 HELP 重建的处置归 #107**（§4.4），**不属 #74**；#74 的票面验收②只对**迁移后满足占位符契约**的模板负责（53 内容页 ＋ `skill-memo-ilife/templates/*.html` 6 个数据页——memo 6 个当前**模板自带包裹**，须先完成迁移动作才满足③，FX-118-5 更正：旧版「已满足」与同节③及 §3.1.2④ 矛盾）。
- **迁移方向（#118 D-6，供 #74 用）**：① **内容页 53**——删除技能私有 `CONTENT_MARKER` 与私有 `fillTemplate`，改由统一填充器填 `content`；模板本身**零改动**；② **数据页 6（memo）**——去掉模板自带的 `<style>`／`<script>` 包裹（改由填充器包），同时删除 `fillSharedMarkers`；③ **遗留 6（calorie）**——**不动**（归 #107）。
- **数据页 6 的迁移面边界（FX-118-4，总架构师裁定）**：② 的「去掉模板自带包裹」**只是模板动作**，其**执行方是该技能自己的地图**（memo 侧改造归 #74 的实现清单，但**生产接线不属 #74**）；契约不规定、也不要求 #74 改动 memo／chef 的 CLI 生产链（`packages/skill-memo-ilife/src/cli/cmd_read.ts:133-135`、`packages/skill-chef/src/cli/cmd_read.ts:373-375` 直写裸 `<section>`，不经模板）。**memo 数据页的 assets 来源**由 **#75／#76** 产出者提供（当前 **pending**；memo 无私有 CSS／HELPERS 常量，`packages/skill-memo-ilife/src/render/html.ts:52-61` 只收调用方参数）——在产出者落地前，#74 的测试用**自造合法资产**（§6.1「跨票产出者依赖」）。其余 5 技能的迁移**只写路径、不执行**（本图 `Out of scope`）。
- **跨票产出者依赖（FX-19，须写进 #74 票面）**：三个注入资产的产出者当前**全部 pending**——`sharedCssText` ← `buildStyleSheet`（#75）、`sharedHelpersJs` ← `buildSharedHelpersJs`（#76）、`chartsHelpersJs` ← `buildChartsHelpersJs`（#78）。→ #74 的实现／验收须在资产可用之后进行，或由测试**自造**合法资产；**不得**自产这三者（B3），也不得因缺资产而把 `asset-missing` 当成通过。
- **`escapeHtml` 归一 owner（V1 洞 13 处置）**：把既有 `escapeHtml` 从 4 字符改到 5 字符（`& < > " '`）并翻转 §7 哨兵**由 #74 执行**（#79 只复核）；改完必须同步删除技能侧本地副本，并保证 #96 快照门通过。
- **验收怎么测**：`node -e` 断言六个标记的数量规则（缺失/重复/互斥各抛对应 code）；断言**载荷槽两态**——内容页缺 `content` → `content-missing`、数据页缺 `data` → `data-missing`；**断言含 `INJECT-DATA` 的模板缺自带容器或 id／type 不符 → `container-missing`**，且**内容页模板（无容器）不抛 `container-missing`**（FX-118-1／S-1）；断言**两条包裹不变量**——资产 `trim()` 后以包裹标签起止 → `asset-missing`、**作用域内**标记被预包裹 → `marker-conflict`，且**数据页的 `INJECT-DATA` 落在自带容器内不抛 `marker-conflict`**（FX-118-3／S-2）；断言**多条件输入按 `TEMPLATE_CHECK_ORDER` 首个命中即抛**（FX-118-2／S-4）；断言产出 HTML 里 `ASSET_WRAPPERS` 逐字出现且**不双包**；`Select-String -Path packages\*\src\render\html.ts -Pattern 'SHARED_CSS_MARKER|CONTENT_MARKER|fillSharedMarkers'` 必须零命中；`node tooling/check-boundaries.mjs` 仍 PASS。

### 6.2 #75 样式资产（`src/style.ts` ＋ 产出函数）

- **用**：`CSS_VAR_TOKENS`（11 个逐值）／`STYLE_SHEET_ID`／`CONTROL_STYLE_SECTIONS`／`STYLE_FORBIDDEN_TOKENS`／`buildStyleSheet`／`StyleSheetInput`／`StyleSheetOutput`。
- **不许自造**：新的 token 名（Q14 禁 `--r-xl`／`--pink`／深色区）；第二份 token 表；把既有 `STYLE_TOKENS` 删掉或改语义。
- **验收怎么测**：断言 `Object.keys(CSS_VAR_TOKENS).length === 11` 且逐值与 §3.2 CSS 块一致；断言产出 CSS 里 `--blue: #007aff`；断言不含 `--r-xl`／`--pink`；`pnpm publish:plan` 的 tarball 含契约资产（随 `dist`）。

### 6.3 #76 控件层（`src/controls.ts`）

- **用**：`renderToast`／`createToastController`／`copyText`／`createCopyRuntime`／**`bindCopyAction`／`CopyActionHostPort`（含 `listActionIds()`）／`ACTION_ID_ATTR`／`COPY_ACTION_IDS`／`DEFAULT_DATA_ATTR`**／**`buildSharedHelpersJs`／`SharedHelpersInput`／`SHARED_HELPERS_JS_RULE`**／`renderActionBar`／`renderStatusBadge`／`renderEmptyState`／`renderErrorReceipt` 及其 Input 类型、`CopyPorts`（含 `toast?`）／`ToastHostPort`、`COPY_CHANNELS`／`COPY_TEXT_DEFAULTS`／`TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS`／`STATUS_*`／`ESCAPE_HTML_*`／`CONTROL_AVAILABILITY`。
- **不许自造**：`formPrompt`／`selectList`／`smartSelect`／`confirm`／`foldBox`（B7）；`window.*` 全局（AC-7）；只留 `execCommand` 的单通道复制（Q13）；把控件写成「需要宿主」；第二套反馈端口（反馈一律走 `CopyPorts.toast`）；第二套共享 JS 产出者（唯一产出者 `buildSharedHelpersJs`）；把 `el`／`document` 塞进签名（DOM 只经 `CopyActionHostPort`）；**自造复制按钮 actionId 或承载属性**（`actionId` 必填 ＋ 取 `COPY_ACTION_IDS`／`HELP_COPY_ACTIONS`，承载属性恒为 `ACTION_ID_ATTR`，FX-17）；**给 `CopyActionHostPort` 省略 `listActionIds()` 或另定通配约定**（FX-17③）；**产出 JS 里向 `window.<id>`／`globalThis.<id>` 赋值**（含用隐式全局做幂等哨兵，FX-18①）。
- **产出内容契约（FX-18①）**：`buildSharedHelpersJs` 的返回值逐项满足 `SHARED_HELPERS_JS_RULE`（`selfContained`／`idempotent`／`domAllowed`／`forbidGlobalAssignment`／`forbidNodeBuiltins`）；幂等判据只许落在 DOM（打标记属性／`querySelector` 早退），**不得**用全局哨兵。
- **dist 纯度扫描口径（FX-18②，三处一致）**：**扫描实现** = `test/contract-signatures.test.mjs` 的 `purityViolations()`（**递归**覆盖 `dist/**/*.js`，含 `dist/spec/*.js`；先剥注释）；**契约条文** = `SHARED_HELPERS_JS_RULE`；**本条验收** = 下面「验收怎么测」的最后一项。三者逐项一致：**禁 `node:` ＋ 禁 `window.<id> =`／`globalThis.<id> =` 隐式全局赋值**，**允许** DOM 读取（`document.*`）。扫描自证用例：含 DOM 的合法 helpers JS 必须过门，`window.__x = 1`／`globalThis.toast = …` 必须被拦；`node:` 的**四种写法**都必须被拦——`import … from 'node:fs'`／裸副作用 `import 'node:fs'`／`require('node:fs')`／动态 `import('node:fs')`（FX-28／V5 C-1；正则 `(?:from|import\s*\(|require\s*\(|import)\s*['"]node:`）。
- **验收怎么测**：纯 HTML 夹具（不启 DSH）注入产出字符串 → 断言静态结构；`copyText` 用假 `CopyPorts`（clipboard 抛错 + fallback 返回 true）断言 `channel === 'fallback'`；空串短路；`silent` 仍回调；**失败时 `ports.toast.mount` 被调用（徽章恒在）且 `silent` 不抑制它**；`onOk`／`onFail` 互斥；`bindCopyAction` 用假 `CopyActionHostPort` 断言「`listActionIds()` 发现 → 激活 → `readDataText` → `copyText` → 反馈」链路、无 `data-t` 跳过、`dispose()` 幂等解绑；`renderActionBar` 的两个复制按钮断言 `ACTION_ID_ATTR` 与 `COPY_ACTION_IDS` 逐字一致、缺 `actionId`／重复 id 抛 `bad-input`；`renderErrorReceipt` 缺 `actionId` 时取 `COPY_ACTION_IDS.errorReceipt.*`；`buildSharedHelpersJs()` 返回非空且**通过 `SHARED_HELPERS_JS_RULE` 纯度口径**（禁 `node:`／禁隐式全局赋值；**允许** `document.*` 读取）；`statusBadge` 非法 status 降级 `empty`；`errorReceipt` 缺 `dataText` 不渲染复制按钮且不抛错。
- **#76 追加验收（DOM 与红线共存，FX-18②）**：`buildSharedHelpersJs` 落地后，须补一条断言——把产出的 helpers JS 字符串从 `dist/**/*.js` 源码中剥离后，**剩余源码（剥注释后）**不得出现 `document.`／`window.`／`navigator.`（即 DOM 只允许出现在产出文本里）。**「剥注释后」与扫描实现逐字对齐（FX-26／V5 C-3）**：判据必须先过 `stripJsComments()`（`test/contract-signatures.test.mjs`，与 `purityViolations()` 同一实现，口径见 §7），**注释里的说明文字不参与判定**——否则由 `spec/controls.ts` 的 JSDoc 编译进 `dist/spec/controls.js` 的 `document.*`／`window.<id>` 规则说明会**假红**（按字面今天即已命中）。

### 6.4 #77 复制序列化（`src/text.ts`）

- **用**：`buildDataText`／`buildLogText`／`DataTextInput`／`LogTextInput`／`CopyLogFields`／**`DATA_TEXT_PROJECTIONS`／`DataProjectionSpec`／`LOG_SECTION_SOURCES`／`SENSITIVE_ROW_RULE`**／`COPY_FORMATS`／`SERIALIZABLE_SHAPES`／`LOG_SECTIONS`／`LOG_SECTION_TITLES`／`TEXT_*`／`CSV_DIALECT`／`TEXT_ERROR_CODES`。
- **不许自造**：snapshot 结构接口（B2）；第二套 `format` 语义（§3.4 已定死）；自定的空值/转义口径；**自定的逐 shape 投影**（一律读 `DATA_TEXT_PROJECTIONS`）；**给 `scene` 段另找数据源**（恒由 envelope 派生，`LOG_SECTION_SOURCES.scene === 'envelope'`）；**自定敏感行判定或掩码文案**（形态与掩码恒取 `SENSITIVE_ROW_RULE`，FX-23）。
- **验收怎么测**：对 5 个 shape 各造一个 envelope，三种 format 各断言输出（含空值、敏感行 `****`、CSV 引号转义与两列语义、JSON 的 `<` 处理）；逐 shape 断言输出行与 `DATA_TEXT_PROJECTIONS` 一致；6 段日志逐段断言数据源与 `LOG_SECTION_SOURCES` 一致（`scene` 段取 `skill.key（shape）`；缺失段 `text` 写 `(未知)`／`json` 写 `null`／`csv` 写空串）；**敏感行逐 format 断言**（`text`：掩码行 `****` ＋ 紧随一行 `（敏感字段已脱敏）`；`json`：该键值 = `****`；`csv`：`row` 列 = `****`），判定只认 `SENSITIVE_ROW_RULE.flagField === flagValue`；`fallback` shape 断言抛 `shape-unsupported`；`data` 不符 `EnvelopeDataByShape[shape]` 断言抛 `structure-invalid`。

### 6.5 #78 图表与 HELP 壳（`src/charts.ts`／`src/help.ts`）

- **用**：`ChartsApi`（8 方法）及 8 个 Input 类型／`ChartItem`／`ChartOutput`／`CHART_*`／`CHART_PALETTE`；**`buildChartsHelpersJs`／`ChartsHelpersInput`**（唯一产出者，FX-22）；`renderHelpShell`／`HelpShellInput`／`SceneData`／`SCENE_DATA_SCHEMA`／`SCENE_TYPE_FIELD`／`SCENE_STATUS`／`HELP_*`／**`HELP_COPY_ACTIONS`**。
- **不许自造**：`el` 参数（DOM 由调用方挂载）；`<canvas>`；技能侧图表实现或白名单例外（B4）；`type`（单数）字段或 `types` 别名（AC-3）；第二份 scene-data schema（AC-4）；手写 `scene-data.schema.json`（发布则必须由 `SCENE_DATA_SCHEMA` 序列化生成，FX-6）；复制按钮的第二套 `actionId`／文案（取 `HELP_COPY_ACTIONS`，FX-7）；**第二个 charts helpers 产出者**（唯一产出者 `buildChartsHelpersJs`，FX-22）；**第二套产出内容规则表**（恒用 `SHARED_HELPERS_JS_RULE`）。
- **验收怎么测**：8 个接口各跑一次结构断言（含空数组 → `empty === true` 且走 `renderEmptyState`；`pct` 型接口 `points === 1` 且 `pct === 0` 时 `empty === false`；非法 items 抛 `structure-invalid`；`pct` 非数抛 `pct-invalid`）；断言产出无 `<canvas>`／无 `<script`；`buildChartsHelpersJs()` 返回非空且通过 `SHARED_HELPERS_JS_RULE` 纯度口径（§6.3 同一实现）；`SCENE_DATA_SCHEMA` 校验一份含 `init_banner`／`contact`／`version`／`recommendations` 的数据；若随包发布 `scene-data.schema.json`，断言它与 `SCENE_DATA_SCHEMA` 逐值相等；`renderHelpShell` 走 `fillTemplate` 后断言三个必需标记各出现 1 次；三个复制按钮的 `actionId`／文案与 `HELP_COPY_ACTIONS` 逐字一致且写入 `ACTION_ID_ATTR`。

## 7. 签名测试清单

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `SPEC_FROZEN_SURFACE` | runtime | #92 | implemented | 7 | `readonly FrozenSurfaceEntry[]` |
<!-- FROZEN-SURFACE-TABLE-END -->

| 层 | 文件 | 断言什么 | 怎么跑 |
|---|---|---|---|
| 编译期类型断言 | `packages/base-render/test-d/contract-signatures.ts` | ① 既有 18 运行时出口＋12 类型出口逐条锁形；② §3 每条冻结签名逐字一致（`Equal<>`／`Expect<>`）；③ **运行时条目的值**另有 `_V01…_V27` 逐值断言（FX-20，改 `spec` 值即编译红）；④ `pending` 条目**尚未导出**（`Absent<>`），实现后必须翻转清单；⑤ 跨包漂移：`STRICT_ENVELOPE_SHAPES` ↔ link-core `EnvelopeShape` | `pnpm build`（root `tsconfig.json` 的 `include` 已收该目录，`tsc -b` 一并编译）；亦可 `pnpm test:types` |
| 运行时出口面锁 | `packages/base-render/test/contract-signatures.test.mjs` | ① 既有 18 出口仍在（D4 只追加）；② 新增运行时出口**恰好等于**清单里 implemented 的运行时项；③ `pending` 未导出、type-only 不得有运行时值；④ 文档标记区表格与清单逐字一致；⑤ 章节标题／§2 26 行／AC-1…AC-17 落点／FX-1…FX-16 落点／**FX-17…FX-25 落点**／无 BOM 与字面反斜杠 n；⑥ 占位符/token/双通道/形状表/schema/逐 shape 投影表/6 段日志数据源**＋段序**/HELP 复制文案/`COPY_ACTION_IDS`/`ACTION_ID_ATTR`/`SHARED_HELPERS_JS_RULE`/`SENSITIVE_ROW_RULE` 逐值 ＋ **FX-20 的 27 条逐值** ＋ **#118 的六标记／载荷槽规则／包裹约定／模板分型逐值（`describe('#118 契约补遗…')`）** ＋ **FX-118 的 S-1…S-4 机读自证（容器作用域／不变量②作用域／谓词唯一／判定次序首命中）** ＋ `scene-data.schema.json` 存在即与常量逐值相等（FX-6）；⑦ 门禁红线：无 `dependencies`、`files` 含 `dist`、**`dist/**/*.js`（递归，含 `dist/spec/*.js`）**禁 `node:`／禁 `window.<id> =`／`globalThis.<id> =` 隐式全局赋值（**允许** DOM 读取，FX-18②）、`src/spec/*.ts` 只许 `import type` ＋ 代码（**剥注释后**，同 `stripJsComments()`）不得读写浏览器全局 | `pnpm test`（root script 的 glob 已含 `packages/base-render/test/*.test.mjs`） |

- **怎么捕捉漂移（一句话）**：清单 `SPEC_FROZEN_SURFACE` 是唯一真相源，文档标记区表格与它逐字比对（`contract-signatures.test.mjs` 的「文档投影绑死」用例），类型层再对每条签名做 `Equal<>` 断言（`contract-signatures.ts`），**运行时条目的值**另有运行时逐值断言（`deepEqual`，含 FX-20 的 27 条），任一环改一处不改其余即红。
- **纯度扫描自证（FX-18②）**：`purityViolations()` 是扫描口径的**唯一实现**，用例自带正／负样本——含 DOM 的合法 helpers JS 必须过门；`window.__x = 1`／`globalThis.toast = …` 必须被拦；`node:` 的四种写法（`from 'node:…'`／裸 `import 'node:…'`／`require('node:…')`／动态 `import('node:…')`）必须全部被拦（FX-28／V5 C-1）；**判据先剥注释（`stripJsComments()`）再判**，注释里的说明文字不参与判定（FX-26／V5 C-3，与 §6.3 追加验收同口径）。**口径变更必须同时改**：`SHARED_HELPERS_JS_RULE`（§3.3）＋ §6.3 验收条文 ＋ 本用例。
- **哨兵**：`escapeHtml("'") === "'"` 是**已知待修**的漂移哨兵（AC-14）——**AC-14 归一后本断言必须翻转**为 `escapeHtml("'") === '&#39;'`；当前为真只表示缺陷未修，**不代表**该行为被契约接受（FX-16①）。执行归 #74（§6.1），#79 复核。
- **既有失败台账（FX-13，不修）**：`pnpm test` 当前 exit 1（#118 返修后实测 `tests 453 / pass 431 / fail 22`；#118 首轮为 `448／426／22`，第二轮返修后 `443／421／22`，第一轮返修后为 `435／413／22`，FX 前为 `430／408／22`，**新增失败 = 0**），**22 条全部是 #92 之前既有、与 base-paint 冻结面零耦合**的失败，**不属 #92 修复范围**：A 组 10 条 = Windows 并行 spawn 抖动（6 个 plugin smoke 单跑 46/46 绿、不可复现）；B 组 12 条 = `plugin-{bill,chef,home,schedule}-ilife` 缺 `"build:client":"tsdown"`（另案承接，不属 #63）。逐条清单与三重证明见 `docs/research/t92-verify-v2-gates.md`「A4 争议取证」。**A4 口径据此定为「三命令零回归」**：`pnpm build`／`pnpm boundaries`／`pnpm test:types` 绿 ＋ `pnpm test` **新增失败 = 0**（本契约的签名测试单跑必须 100% 绿，当前 `tests 46 / pass 46 / fail 0`；#118 首轮 `tests 41 / pass 41 / fail 0`；失败用例名集合与 #118 前**逐条相同**，见 §8.6／§8.7）。
- **门禁归属（FX-10）**：「门面文档示例可执行」门 owner **#99**；「计数断言（77）」owner 技能包／#79（本契约不复制计数）；两者均已在 §4.4 登记。
- **门禁口径（FX-74-4，读法定死）**：「门禁全绿」**只**读作 **`pnpm build`／`pnpm boundaries`／`pnpm test:types` 三条 exit 0 ＋ `pnpm test` 新增失败 = 0**；`pnpm test` **整体 exit 1 属既有台账态**（见上条「既有失败台账」），**不得**读作「全量测试必须 exit 0」——后人据此判回归时，只看**新增失败数**与三条命令的退出码。**新增失败的判据（FX-74-5）**：以 #92 台账的**失败用例名多重集**（test 级，施工期文件 `docs/research/t92-baseline-failures.md`（入仓常驻判据））为基线；**不采用**任何施工者自建名单（`.scratch/t74/baseline-fail-names.txt` 含 6 条 suite 级名，与 test 级口径不同，V2 未采信）。
- **失败即契约缺陷**：测试红时**只许**改实现或同时改「清单＋文档＋类型」三处，不许删断言、放宽断言或改成恒真。
- **#118 补遗的断言落点**：六个占位符／载荷槽规则／包裹约定（两条不变量）／模板分型由 `test/contract-signatures.test.mjs` 的 `describe('#118 契约补遗（CONTENT 槽位／载荷槽规则／包裹约定／模板分型）')` 逐值断言（含分型规则的四种计数组合自证：`1/0`→数据页、`0/1`→内容页、`0/0`→legacy、`1/1`→不属任何型），类型层由 `test-d/contract-signatures.ts` 的 `_T17…_T31` 锁形；65 个模板的**可复跑分型**由 `tooling/classify-templates.mjs` 给出（输出 数据页 6／内容页 53／遗留 6）。**FX-118 返修的机读自证**（同 describe，5 条用例）：S-1 内容页无容器不抛 `container-missing`／S-2 数据页 `INJECT-DATA` 在容器内不抛 `marker-conflict`／S-3 两条不变量谓词唯一（契约常量 ＋ 工具脚本共用，含脚本源码扫描）／S-4 多条件输入首个命中即抛（§3.1.2⑤ 表 ↔ `TEMPLATE_CHECK_ORDER` 逐值同序）／FX-118-4／5／8／10 措辞与迁移面落点。

## 8. 返修处置台账（FX-1…FX-16 / V1 洞 1–15 / V3 疑点①–⑤）

口径：每条给**处置**（**修**＝已改条文；**登记**＝归属票 ＋ 写明「不冻结也不排除」）与**落点**。**禁止默默略过**。

### 8.1 V1「仍需猜」15 条逐条处置

| 洞 | 票 | 原始表述（摘要） | 处置 | 落点 |
|---|---|---|---|---|
| 1 | #77 | envelope 五 shape → 复制文本投影缺失；`structure-invalid` 仍引旧 snapshot | **修** | §3.4 投影表 ＋ `DATA_TEXT_PROJECTIONS`；判据改 `EnvelopeDataByShape[shape]`，旧 snapshot 引用删除 |
| 2 | #77 | 6 段日志第①段「场景标识」无数据源 | **修** | §3.4 对应表 ＋ `LOG_SECTION_SOURCES`（`scene` ← envelope） |
| 3 | #74 | `<!--INJECT-DATA-->` 替换语义未定死 | **修** | §3.1「替换语义」四条 |
| 4 | #74 | `sharedHelpersJs` 无产出签名 | **修** | §3.3 `buildSharedHelpersJs`（归 #76）＋ §3.1 消费链 |
| 5 | #76／#90 | `copyText` 无 toast 通道／`actionId`／`data-t` 无读取者 | **修** | §3.3 `CopyPorts.toast` ＋ `bindCopyAction` |
| 6 | #75 | 控件视觉规格全空 | **登记**（#75，不冻结也不排除） | §3.2「控件视觉规格」段 |
| 7 | #78 | HELP 壳产物结构／类名／actionId 未定 | **部分修 ＋ 登记**（#78／#88，不冻结也不排除） | §3.5.3 `HELP_COPY_ACTIONS`（actionId 定死）＋ 产物结构段 |
| 8 | #77 | `(未知)` 与 json `null`／csv 空串冲突 | **修** | §3.4「空值口径分层」 |
| 9 | #77 | csv 两列语义未定 | **修** | §3.4「csv 两列语义」 |
| 10 | #78 | 选项级语义与旧 `combo.y2` 缺 | **登记**（#78，不冻结也不排除） | §3.5.1 两行 |
| 11 | #78 | `progress`／`gauge` 的 `points`／`empty` 未定 | **修** | §3.5.1「`pct` 型接口」行 |
| 12 | #74 | `data-missing` 语义未写 | **修** | §3.1 第 4 条 |
| 13 | #74／#79 | `escapeHtml` 归一 owner 双标 | **修**（owner 单一定为 #74） | §3.3 AC-14 段、§6.1 |
| 14 | #74 | 票面「统一注入器 API」与契约禁令冲突 | **修** | §1「票面口径对齐」 |
| 15 | #92 | 清单覆盖面不实（101／169） | **修（口径）** | §0.2「清单覆盖面口径」 |

### 8.2 V3 矛盾／缺失／疑点逐条处置

| 项 | 原文 | 处置 | 落点 |
|---|---|---|---|
| ID-3 矛盾 | 规格 `:53` 5 形状 vs 契约 6 形状 | **修** | §3.1.1 裁定＋追溯；`calorie-architecture.md:53` 勘误一行 |
| ID-4 缺失 | `delivery{mode,path?,template?,bytes?}` | **登记 #83**（不冻结也不排除） | §4.4 #83 行 |
| ID-5 缺失 | 三态交付 | **登记 #83** | §4.4 #83 行 |
| ID-14 缺失 | 主题接缝 | **修** | §3.2「主题接缝」段 |
| ID-21 缺失 | 输出命名 | **登记 #87**（不冻结也不排除） | §4.4 #87 行 |
| TD-6 门禁 | 门面示例可执行门／计数断言 77 归属缺 | **登记 #99／#79** | §4.4、§7 |
| 疑点① | 6 形状未落裁定 | **修** | §3.1.1 |
| 疑点② | `SERIALIZABLE_SHAPES` 顺序无语义未写 | **修** | §3.4 首条 |
| 疑点③ | `HELP_COPY_TARGETS` 无文案映射；§3.5.3 用旧词 | **修** | §3.5.3 `HELP_COPY_ACTIONS` ＋「指令实时预览」 |
| 疑点④ | `delivery` 零命中 | **修（登记）** | §4.4 #83 |
| 疑点⑤ | `.json` 第二真相风险 | **修** | §3.5.2 段 ＋ 签名测试 FX-6 用例 |
| #104 粒度 | 控件级 vs 区块级未裁决 | **修** | §4.1 分层段 |
| #106／#107 | 未登记 | **登记** | §4.4 |

### 8.3 复验打勾点

- V1 三条硬洞：洞 1／2 → §3.4；洞 3／4 → §3.1＋§3.3；洞 5 → §3.3。
- V3 三条必修：§3.1.1（形状裁定）、§4.4 #83／#87／#106／#107、§3.5.2（`.json` 生成）。
- 三处同步：`SPEC_FROZEN_SURFACE`（`packages/base-render/src/spec/index.ts`）↔ 本文 §3 标记区表格 ↔ `test-d/contract-signatures.ts`。
- 门禁口径：`build`／`boundaries`／`test:types` 绿 ＋ `test` 新增失败 = 0（既有 22 条见 §7 台账）。

### 8.4 第二轮返修台账（FX-17…FX-25 / V4 新洞 N-1…N-9）

| 项 | 洞（V4） | 处置 | 落点 |
|---|---|---|---|
| FX-17 | N-1 高：`bindCopyAction` 无 actionId 来源 | **修** | §3.3 `CopyButtonInput.actionId` 必填 ＋ `COPY_ACTION_IDS` ＋ `ACTION_ID_ATTR` ＋ `CopyActionHostPort.listActionIds()` ＋ 端到端接线示例；§6.3、§4.4 #90 |
| FX-18 | N-2 高：`buildSharedHelpersJs` 产出契约缺 ＋ 与 dist 红线互斥 | **修** | §3.3 `SHARED_HELPERS_JS_RULE` ＋ 产出内容契约表；§7／§6.3 扫描口径收窄（禁 `node:` ＋ 禁隐式全局赋值，允许 DOM）；测试 `purityViolations()` ＋ 自证用例 |
| FX-19 | N-3 中：calorie 6 模板无 `INJECT-DATA`／无容器 | **登记 #107** ＋ 硬约束写入 | §6.1「模板必须满足占位符契约」＋「calorie 6 模板处置」＋「跨票产出者依赖」；§4.4 #107 |
| FX-20 | N-4 中：27 条运行时条目双无断言 | **修** | `test-d` `_V01…_V27` ＋ `test/contract-signatures.test.mjs`「FX-20：27 条运行时条目逐值断言」；§0.2／§7 口径 |
| FX-21 | N-5 中低：AC 溯源指针错 | **修** | `docs/research/t92-architect-calls.md`（归档，17 条 AC）＋ §0 依据表 ＋ §3.1.1 |
| FX-22 | N-6 低：`chartsHelpersJs` 无产出者 | **修** | §3.5 `buildChartsHelpersJs`／`ChartsHelpersInput`（归 #78）＋ §3.1 标记表 ＋ §3.5 产出者段 |
| FX-23 | N-7 低：敏感行判定口径缺失 | **修** | §3.4 `SENSITIVE_ROW_RULE` ＋ 三 format 掩码文案（含与旧侧偏离说明） |
| FX-24 | N-8 低：`u003c` 归因错 | **修** | §3.1「`u003c` 的归因（FX-24 更正）」＋ `--strict` 段 |
| FX-25 | N-9 nit：四处精度 | **修** | ①§3.1.1 改 `:54`；②§3.1 `--strict` 默认档补容器硬约束；③§3.3 `:327` 旧措辞改 `ACTION_ID_ATTR`／`COPY_ACTION_IDS`；④`spec/text.ts` `DataTextInput.title` 注释改 `TEXT_HEADER_TEMPLATE` |

**第二轮自查新洞（返修作者自己扫出并处置，不留待复验）**

| # | 自查新洞 | 处置 |
|---|---|---|
| S-1 | dist 纯度扫描**不递归**（只查 `dist` 顶层），漏掉 `dist/spec/*.js`——全部冻结常量与未来 helpers 文本的真正落点 | 扫描改 `listDistJs()` 递归；用例断言「扫描必须覆盖 `dist/spec/*.js`」（§7⑦、§6.3） |
| S-2 | 旧扫描禁 `window.`／`document.` 是**文本级**，会把注释与合法 DOM 读取一起打死（FX-18 收窄后若只删断言即形同虚设） | 扫描先 `stripJsComments()` 再判；`src/spec/*.ts` 检查同口径升级（代码不得读写浏览器全局，注释豁免） |
| S-3 | `renderActionBar`／`renderErrorReceipt` 的 `actionId` 虽冻结，但**没有任何属性承载它**，调用方无法从 DOM 发现 | 冻结 `ACTION_ID_ATTR = 'data-action-id'` 并写入渲染期（§3.3／§6.3）；HELP 壳按钮同口径 |
| S-4 | `CopyActionHostPort.listActionIds()` 落地后仍可能「两个按钮同一个 id」→ 委派歧义 | §3.3 冻结：`CopyButtonInput.actionId` 空串／重复 → `ControlsError` code `bad-input`；用例断言 `COPY_ACTION_IDS` ＋ `HELP_COPY_ACTIONS` 全部 id 唯一 |
| S-5 | `chartsHelpersJs` 的产出内容若无规则表，会与 `sharedHelpersJs` 分叉成第二套口径 | 复用**同一份** `SHARED_HELPERS_JS_RULE`，显式写「不设第二套规则表」（§3.5） |
| S-6 | 主体行**文本格式**（键值分隔符／逐项前缀）全契约无口径，`csv` 的 `row` 列随之未定 | §3.4 显式登记「**不冻结也不排除**，owner #77」，并列出已冻结的不变量（来源／行序／`section` 分组／空值／掩码／一行=一值） |
| S-7 | 幂等要求与「禁隐式全局赋值」可能冲突（最自然写法是 `window.__x = true` 哨兵） | §3.3 明写幂等判据**只许落在 DOM**；§6.3 不许自造项同写 |
| S-8 | 「渲染期写 `data-t` → 激活期读回」的属性名只有散文缺省（`SharedHelpersInput.dataAttr` 缺省 `data-t`），调用方适配器只能硬编码字符串 | 冻结 `DEFAULT_DATA_ATTR = 'data-t'`（§3.3 标记区 ＋ §6.3 用列）；端到端示例改用该常量 |
| S-9 | 非复制按钮（场景按钮）也带 `actionId`，若 `listActionIds()` 返回它们，binder 行为未写 | §3.3 明写：`listActionIds()` 可含非复制按钮，binder 靠 `readDataText → undefined` 跳过（不抛错、不产 toast） |
| S-10 | `ToastAction.actionId` 被冻结（且禁内联 `onclick`），但**没有**任何读取／绑定者——与 N-1 同型的悬空 id | §3.3 明写：toast 动作按钮的 id 同样走 `ACTION_ID_ATTR`，**绑定归调用方**（无复制语义，故不纳入 `bindCopyAction`）；本条**不冻结也不排除**，owner #76（若需冻结绑定签名须走 changeset） |

### 8.5 第三轮收尾定点修补台账（FX-26…FX-30 / V5 低·nit 建议）

口径同 §8：每条给**处置**与**落点**。本轮**只改条文／JSDoc 注释与测试侧的扫描实现／断言**——`SPEC_FROZEN_SURFACE` 仍 **120 条**（`implemented 94 / pending 26`），**未新增／删除任何冻结签名**，也**未实现** #74–#78 的任何行为；既有断言一条未删、未放宽。

| 项 | 洞（V5） | 处置 | 落点 |
|---|---|---|---|
| FX-26 | C-3 低：§6.3 追加验收按字面与「先剥注释再判」口径冲突（按字面**今天即已假红**） | **修** | §6.3「#76 追加验收」补「（**剥注释后**）」并与 `stripJsComments()`／`purityViolations()` 逐字对齐；§7⑦ ＋ §7 纯度自证同口径；用例锚点 `剥注释后` |
| FX-27 | C-5 低：`LOG_SECTIONS` 段序无断言（唯一可静默漂移项） | **修** | 「6 段日志数据源」用例内新增**逐值顺序**断言 ＋ §3.4 段序表逐行「成员列／标题列」同序同值断言（重排成员或对调文档行即红） |
| FX-28 | C-1 低：纯度扫描漏拦裸 `import 'node:…'` | **修** | `PURITY_CHECKS` 正则补 `import\s*['"]node:`（四种写法全覆盖）；负样本自证裸 import／`require`／动态 `import()` 三种写法都必须被拦；§6.3／§7 条文同步 |
| FX-29 | C-6 低：`SharedHelpersInput.dataAttr` 可覆盖，但渲染端恒写 `data-t` 无裁决 | **修** | §3.3 新增「`dataAttr` 覆盖口径」：渲染端恒用 `DEFAULT_DATA_ATTR`、覆盖只影响 helpers JS 选择器、不一致由调用方自负；`spec/controls.ts` JSDoc 同步 |
| FX-30 | C-7…C-10 nit | **修** | ①旧侧证据区间 `base.js:219-225` → `218-221`（§3.4 ＋ `spec/text.ts`）；②「与旧侧形态逐字一致」改为「字段名一致、**判定语义不同**」并显式登记真值判定 vs 字面 `true`；③接线示例 `listActionIds` 补 `.filter((id) => id !== null)` 收窄为 `string[]`；④§0 依据表把 `.scratch` 路径标为「归档前旧位置、已不引用、勿据此取件」 |

- **本轮自查新洞：0 条**（新增断言均以负样本对照验证为**真断言**：重排 `LOG_SECTIONS` 变红、对调文档段序行变红、三种 `node:` 写法逐条命中且字符串／注释不误伤）。

### 8.6 #118 契约补遗台账（D1–D10 / A1–A8）

口径同 §8。本轮**只冻结契约、不实现运行时**：新增 **6 条冻结签名**（`PAYLOAD_SLOT_RULE`／`TEMPLATE_KINDS`／`TemplateKind`／`TEMPLATE_KIND_RULE`／`ASSET_WRAP_RULE`／`ASSET_WRAPPERS`），**改 3 条既有签名**（`TEMPLATE_MARKERS` 加 `content`；`TEMPLATE_ERROR_CODES` 末尾追加 `content-missing`；`FillTemplateInput` 末尾追加 `content?`），**放宽 2 条**（`MARKER_RULES.injectData` → `zero-or-one`／`required: false`；`FillTemplateInput.data` → `data?: unknown`，D-8 裁定 2 授权的**第 2 处既有签名改动**）。`SPEC_FROZEN_SURFACE` 由 **120 条增至 126 条**（implemented 94 → 100，pending 26 不变；runtime 79 → 84，type 41 → 42）；**§8.7 返修再追加 4 条**（`ASSET_MARKER_KEYS`／`WRAP_PREDICATES`／`CONTAINER_CHECK_RULE`／`TEMPLATE_CHECK_ORDER`，均 runtime／implemented）→ **130 条**（implemented 104，pending 26 不变；runtime 88，type 42）。**未写 `fillTemplate` 运行时、未改任何模板文件**（12 个预包裹模板的改造归 #74／#107）。

| 编号 | 交付 | 落点 | 处置 |
|---|---|---|---|
| D1 | `TEMPLATE_MARKERS` += `content` | `src/spec/template.ts`（`content: '<!--CONTENT-->'`） | **修** |
| D2 | `MARKER_RULES` 放宽 `injectData` ＋ 新增 `content` ＋ 载荷槽规则 | 同上（`PAYLOAD_SLOT_RULE`） | **修** |
| D3 | `FillTemplateInput.content?` | 同上 | **修** |
| D4 | `TEMPLATE_ERROR_CODES` += `content-missing`（末尾） | 同上 | **修** |
| D5 | 包裹约定常量 ＋ 两条不变量 | 同上（`ASSET_WRAP_RULE`／`ASSET_WRAPPERS`）＋ §3.1.2④ | **修** |
| D6 | 模板分型常量与判定规则 | 同上（`TEMPLATE_KINDS`／`TemplateKind`／`TEMPLATE_KIND_RULE`）＋ §3.1.2③ | **修** |
| D7 | 契约文档补遗 | 本文 §2 补遗注记（**不新增表行**，理由见 118-4）＋ §3.1.2 ＋ §4.5 ＋ §6.1 ＋ §7 ＋ §8.6 | **修** |
| D8 | 三处同步 ＋ 签名测试 | `SPEC_FROZEN_SURFACE`（首轮 126 条 → 返修后 **130 条**）↔ 本文 §3.1 标记区表格 ↔ `test-d/contract-signatures.ts`（`_T17…_T31`）↔ `test/contract-signatures.test.mjs`（#118 ＋ FX-118 用例共 10 条） | **修** |
| D9 | 65 模板分类脚本 ＋ 输出 | `tooling/classify-templates.mjs`（输出 数据页 6／内容页 53／遗留 6；`--inventory` 逐条比对清单）＋ 输出快照 `docs/research/t118-template-classification.md` | **修** |
| D10 | changeset | `.changeset/base-paint-content-slot.md`（`'base-paint': minor`） | **修** |
| D11 | `FillTemplateInput.data` 放宽为可选（**D-8 裁定 2 已授权**，第 2 处既有签名改动） | `src/spec/template.ts`（`data?: unknown` ＋ JSDoc「数据页提供；内容页可省略」）＋ `src/spec/index.ts` ＋ `test-d/contract-signatures.ts`（`_T10`）＋ §3.1 标记区表格 ＋ §3.1.2① | **放宽** |

**#118 自查新洞（施工者自己扫出并处置，不留待复验）**

| # | 自查新洞 | 处置 |
|---|---|---|
| 118-1 | `FillTemplateInput.data` 是**必填**字段，而内容页没有 data——按字面内容页调用方无法合规调用 | 契约 §3.1.2① 显式收窄 `data` 的**校验条件**（只在模板含 `INJECT-DATA` 时校验）；**后经 D-8 裁定 2 授权放宽为 `data?: unknown`**（内容页可省略，见 D11），故内容页**既可不传 `data`**、也可传 `data: undefined` |
| 118-2 | `INJECTION_ORDER` 无 `content` 步，若不记账会被实现者当作「契约漏项」而自行追加（= 改既有冻结签名） | §3.1.2④ ＋ `spec/template.ts` JSDoc 显式记账：该数组是既有冻结签名、本票无授权改动，且载荷槽互斥使顺序无意义 |
| 118-3 | 包裹不变量需要错误码，而本票只授权追加 `content-missing` | **不新增错误码**：不变量①复用 `asset-missing`（资产不可用）、②复用 `marker-conflict`（与约定冲突），并写进 `ASSET_WRAP_RULE.assetWrappedCode`／`markerPreWrappedCode`（机读） |
| 118-4 | 施工单 D7 要求「§2 对照表追加行」，而 §2 被签名测试钉死为 **26 行**（= v1.30 能力数），且 `<!--CONTENT-->` **不是** v1.30 能力 | **不新增表行**：改为更新既有 §3 行 ＋ 表后追加一条**非表格**补遗注记（写明「非 v1.30 项，故不新增行」），使「§2 必须 26 行」断言不变 |
| 118-5 | 旧 §6.1 写「`INJECT-DATA` **恰好 1 次**（exactly-one）」，与放宽后的冻结面**直接矛盾**——#74 照旧条文实现即与 spec 冲突 | §6.1 重写为载荷槽规则口径（A8 独立性的关键项）；§3.5.3「填充」一行同步修正 |
| 118-6 | 分类脚本若自持标记字面量即成**第二真相**（与契约漂移无从发现） | 脚本**只读 `dist` 的冻结常量**（`TEMPLATE_MARKERS`／`TEMPLATE_KINDS`／`TEMPLATE_KIND_RULE`）判定，不自带副本；缺 `dist` 时显式报错提示先 `pnpm build` |
| 118-7 | `strict: true` 与内容页的关系未定（信封校验的是 `data`，而内容页没有 data）——不写死就会一票一解 | §3.1.2① 定死：信封校验与 `data-missing` **同条件**（只在模板含 `INJECT-DATA` 时执行）；内容页 `strict` 不触发 `strict-invalid` |
| 118-8 | 正文替换与四个注入步的**先后**未定；若正文先填，注入物里的标记字面量会被二次替换（正文里出现 `<!--SHARED-CSS-->` 即污染） | §3.1.2① 定死：**无先后语义**（载荷槽两成员互斥，`content` 不占 `INJECTION_ORDER` 位置，故顺序不可断言）；**FX-118-6 更正**：本行旧措辞（把正文排在四步之后）与 §3.1.2④「无先后语义」互斥，已统一为后者 |
| 118-9 | `content: ''`（空正文）与 `content` 缺席的判定未分——不写死就会「空正文页被误判 `content-missing`」 | §3.1.2① 定死：只有 `undefined` 触发 `content-missing`，`''` 视为已提供；同时 §3.1「注入结果」写明 `report.markers` 覆盖全部六标记 |

**门禁实测（#118 返修后）**：`pnpm build` 退出 0／`pnpm boundaries` 退出 0（PASS）／`pnpm test:types` 退出 0／签名测试单跑 **46 用例全绿**（exit 0；首轮 41）／`pnpm test` **tests 453 ／ pass 431 ／ fail 22**，**新增失败 = 0**（失败用例名集合与 #118 前**逐条相同**，既有 22 条台账见 §7；本票只增断言、未删未放宽）／分类脚本 `node tooling/classify-templates.mjs --inventory` 退出 0（数据页 6／内容页 53／遗留 6，与清单 65 条逐条一致，清单路径 = `docs/research/t118-template-inventory.md`）。

### 8.7 #118 返修台账（FX-118-1…FX-118-10 / V1·V3 验收后 · 总架构师裁定）

口径同 §8。病根：**补遗改了载荷槽模型，§3.1 散文仍留着与之矛盾的无条件表述**。本轮为**文本级／常量级**修复：**既有签名的值零改动**（D-8 授权的 2 处本轮未触碰；`TEMPLATE_KIND_RULE` 三型各追加 `noKindCode` 字段，属 **FX-118-7 授权追加字段**，既有字段值未改）、**未实现 `fillTemplate`**、**未改任何 `packages/skill-*/templates/*.html`**；追加 **4 条冻结签名**（全 runtime／implemented）→ `SPEC_FROZEN_SURFACE` **130 条**（implemented 104／pending 26；runtime 88／type 42）。

| 编号 | 洞（验收方） | 处置 | 落点 |
|---|---|---|---|
| FX-118-1 | 阻塞 N-1：§3.1 容器硬约束**无条件**（53 内容页全抛 `container-missing`） | **修** | `CONTAINER_CHECK_RULE`（`appliesWhenMarker: 'injectData'`／`code: 'container-missing'`）；§3.1「替换语义」第 2／3 条 ＋ §3.1 `--strict` 默认档 ＋ §6.1① 收窄为「仅当模板含 `<!--INJECT-DATA-->` 时执行」；机读断言 `FX-118-1／S-1` |
| FX-118-2 | 中 H2：错误码无优先级／互斥裁决（真实 calorie 输入同命中 2 码） | **修** | `TEMPLATE_CHECK_ORDER`（8 码排列；首个命中即抛、不聚合）＋ §3.1.2⑤ 次序表（文档表 ↔ 常量逐值同序，用例钉死）；机读断言 `FX-118-2／S-4` |
| FX-118-3 | 中 H3＋H4＋低 N-5：两条不变量作用域与判定谓词未冻结 | **修** | `WRAP_PREDICATES`（① `trim-prefix-or-suffix`，作用域 = `ASSET_WRAPPERS` 键集；② `enclosing-open-tag`，作用域 = `ASSET_MARKER_KEYS` 值集、`excludes: ['injectData']`）＋ `ASSET_MARKER_KEYS`；§3.1.2④ 逐条写死（含同行／跨行口径）；工具脚本共用同一谓词（`S-2`／`S-3`） |
| FX-118-4 | 中 H5：数据页 6 的迁移面（assets 来源／生产接线归属） | **修（登记）** | §6.1「数据页 6 的迁移面边界」：memo assets 由 **#75／#76** 提供（当前 pending）、**生产接线不属 #74**、其余 5 技能**只写路径不执行** |
| FX-118-5 | 低 N-2：memo 6 数据页「已满足占位符契约」误标 | **修** | §6.1 calorie 段改为「**迁移后满足**」，并写明其当前预包裹须先迁移 |
| FX-118-6 | 低 N-3：正文替换时序两说 | **修** | §3.1.2① 统一为「**无先后语义**」；§8.6 118-8 行同步更正；`INJECTION_ORDER` JSDoc 同步；用例断言旧措辞**零残留** |
| FX-118-7 | 低 N-4：三型「穷尽」措辞 ＋ `noKindCode` 缺字段 | **修** | `TEMPLATE_KIND_RULE.*.noKindCode`（三型同值 = `PAYLOAD_SLOT_RULE.conflictCode`）；§3.1.2③ 加「**仅对合法模板（计数 ∈ {0,1}）成立**」限定，并更正「计数 > 1 → `marker-duplicate`（不是 `marker-conflict`）」 |
| FX-118-8 | 低 N-6：`.scratch` 证据引用口径（未入仓） | **修** | 归档 **`docs/research/t118-template-inventory.md`**（新建）；指针改仓内路径（§3.1.2①②、§4.5、`spec/template.ts`）；脚本 `--inventory` 缺省值同步 |
| FX-118-9 | nit：分类脚本未复用冻结常量 | **修** | `tooling/classify-templates.mjs`：分型标签按 `TEMPLATE_KINDS` 同序派生、包裹标签取 `ASSET_WRAPPERS`、容器取 `CONTAINER_CHECK_RULE`、谓词取 `WRAP_PREDICATES`；用例扫描脚本源码断言**无** `<style`／`<script`／分型字符串字面量 |
| FX-118-10 | nit：三处措辞 | **修** | ① 一码多义要求 `message` 辨因（错误码 JSDoc ＋ §3.1.2⑤）；② 分型三名统一为「**遗留**」（清单归档版 ＋ 脚本 ＋ 文档）；③ `README.md:63` 引用补全后半句并指明其与不变量①的关系（§4.5） |

**返修自查新洞（本轮扫出并处置／登记，不留待复验）**

| # | 自查新洞 | 处置 |
|---|---|---|
| F-1 | 不变量②的「作用域 = `ASSET_WRAPPERS` 的键集」是**跨域误写**：`ASSET_WRAPPERS` 的键是**资产键**（`sharedCssText`…），而作用域要的是**标记键**（`sharedCss`…）；按字面实现会**零命中**（不变量②静默失效） | 新增 `ASSET_MARKER_KEYS`（资产键 → 标记键唯一映射）；用例断言 `scope = Object.values(ASSET_MARKER_KEYS)` 且与 `ASSET_WRAPPERS` 同键集（`S-2`） |
| F-2 | 容器的**定位算法**未冻结（「最近的未闭合 `<script>`」？页内业务脚本算不算？）——#74 只能猜 | §3.1 第 2 条写死定位口径 ＋ `CONTAINER_CHECK_RULE.openTag/closeTag/id/type` 机读 |
| F-3 | 不变量①的**校验条件**未写：按字面（无条件）实现会对「`NO-SHARED` 豁免 ＋ 空资产」报 `asset-missing`，与 §3.1 标记表「未豁免」口径冲突 | `WRAP_PREDICATES.assetsBare` JSDoc ＋ §3.1.2④① 写明「**仅在该资产被消费的标记存在时校验**」 |
| F-4 | 分类脚本的容器自检只判「容器存在」，id 不是 `payload`／type 不是 `application/json` 也会 `[OK]`——与 `container-missing` 两因口径不符 | 脚本判据升级为逐字比对 `CONTAINER_CHECK_RULE.id`／`.type`（输出不变，判据变严） |
| F-5 | **快照漂移**：`docs/research/t118-template-classification.md` 曾与脚本输出不一致（末行 `--inventory` 缺省路径 ＋ 第 4 行复跑说明仍写旧路径） | **已修**：快照已按新缺省路径重生成，与脚本输出**逐行一致**（88/88 行，V4 复验实跑比对；脚本 `--inventory` exit 0，与仓内清单 65 条逐条一致） |
| F-6 | V3 低洞顺手处置：H7 `dataScriptId` JSDoc 与冻结 `FillTemplateReport` 矛盾、H8 `legacy` 散文口径含容器、H10 `--strict` 段按字面无条件 | **修**：`spec/template.ts` `dataScriptId` JSDoc 改「只用于校验」；§3.1.2③ 写明「容器不是分型判据」；§3.1 `strict` 段补「仅数据页」 |

**#74 票面冻结面计数已同步（D-3，本台账登记）**：#74 票面原写「`fillTemplate` 为 **126 条**冻结面中仅剩的 `pending` 之一」，该计数已由总架构师更正为 **130 条**，与本契约 §8.6／§8.7 及仓内 `SPEC_FROZEN_SURFACE` 实测一致（implemented 104／pending 26／runtime 88／type 42）；#74 票面不属本契约改动面，故仅在本台账登记该计数已同步。

### 8.8 #74 返修台账（FX-74-1…FX-74-9 / V1·V2·V3 验收后 · 总架构师裁定）

口径同 §8：每条给**处置**与**落点**，**禁止默默略过**。三份独立验收（V1 行为与契约／V2 门禁与越界／V3 迁移与影响面）**全部通过、阻塞级 0**，本轮修的是其遗留的 9 条低／nit 项。本轮为**测试与文档级**修复：`fillTemplate` 的**行为零变更**（唯一实现改动是把写死的 `u003c` 换成冻结常量 `TEXT_JSON_LT_RULE`，输出逐字节不变），冻结面仍 **130 条**（未增删、签名值零改动），技能包**零改动**。

| 编号 | 洞（验收方） | 处置 | 落点 |
|---|---|---|---|
| FX-74-1 | V1：3 处恒真／零信息断言（`packages/base-render/test/template.test.mjs`） | **修** | 三处改为**有鉴别力**的断言（见下「FX-74-1 逐条」） |
| FX-74-2 | V1：`src/template.ts` 写死 `'u003c'` 字面量（第二真相，契约 §3.1:172 点名 `TEXT_JSON_LT_RULE`） | **修** | 改引冻结常量 `TEXT_JSON_LT_RULE`（`src/spec/text.ts:129`）；该文件再无 `u003c` 字面量 |
| FX-74-3 | V1：探针覆盖而作者测试未覆盖的边界（2 条必补 ＋ 12 条逐条处置） | **修 ＋ 登记** | 见下「FX-74-3 边界处置」 |
| FX-74-4 | V2 N-1：A12「门禁全绿」口径易被误读为「全量测试必须 exit 0」 | **修** | §7「门禁口径（FX-74-4，读法定死）」条 |
| FX-74-5 | V2 N-2：施工者自建基线名单与 #92 台账口径不同 | **修（口径）** | §7「门禁口径」条：判据统一为 #92 台账（test 级多重集），不采用施工者自建名单 |
| FX-74-6 | V3①**必修**：`migration-path.md` 漏 memo 连带改动面（按字面执行 `tsc` 必红） | **修** | `docs/research/t74-migration-path.md` §2.5 动作 1／2／5 补 `src/render/index.ts:3` 再导出、`test/render.test.mjs:3` 导入面、`:37-39` 本地 `escapeHtml` 单测（与 §2.1 动作 1 同口径） |
| FX-74-7 | V3③**必修**：资产替换的字节影响未声明（文档只讲「包裹字节中性」） | **修** | `migration-path.md` §1／§5 新增「资产替换面」声明（两个 CSS 变体 ＋ 谁批准） |
| FX-74-8 | V3：差异证据措辞（「旧实现」易误读为旧版本） | **修** | `escape-html-calorie-diff.md` 改「归一前实现（base-paint）」＋ 明写旧基线本就五字符 |
| FX-74-9 | V3 其余 7 条 | **逐条修或登记** | 见下「FX-74-9 其余 7 条」 |

**FX-74-1 逐条（下表行号为**返修前**位置；新断言见 `template.test.mjs`，逐条给出「什么实现错误会让它变红」）**

| 位置 | 原断言（问题） | 新断言（鉴别力） |
|---|---|---|
| `template.test.mjs` `:137` | `!none.html.includes(M.chartsHelpers)`（fixture 本就不含该标记 → 恒真、零信息） | ① 未被消费的 `chartsHelpersJs` 资产**不得出现在输出**（实现若「无脑注入三个资产」即红）；② `report.markers.chartsHelpers` 的 `count === 0`／`filled === false` |
| `template.test.mjs` `:409` | `!('code' in new Error())`（与实现无关、永真） | ① `!(err instanceof RenderError)`；② `err` 的原型链不得包含 `RenderError.prototype`（若 `TemplateError` 继承／等于 `RenderError` 即红） |
| `template.test.mjs` `:549` | `bytes >= html.length`（UTF-8 字节数恒 ≥ UTF-16 码元数、永真） | ① 样本含中文（前置条件，含则 `bytes` 必须**严格**大于 `html.length`）；② 实现若把 `bytes` 写成 `html.length`（码元数）即红 |

**FX-74-3 边界处置（补测试 7 条 / 登记 5 条 ＝ 12 条逐条不略过）**

| # | V1 边界 | 处置 | 落点 |
|---|---|---|---|
| 1 | `chartsHelpers` 预包裹 → `marker-conflict` | **补测试** | `template.test.mjs`「不变量②：chartsHelpers 被预包裹」 |
| 2 | 容器属性形态（序颠倒／`data-id` 诱饵合法；未加引号／属性值含 `>`／大写 `<SCRIPT>` → `container-missing`） | **补测试** | 同文件「容器属性形态」用例 |
| 4 | 纯空白资产 `'   '`（契约只写「空串」） | **补测试** | 同文件「资产为纯空白」用例 |
| 5 | `NO-SHARED` ＋ `SHARED-CSS×2` 的次序组合 | **补测试** | 同文件「NO-SHARED ＋ SHARED-CSS×2 → marker-duplicate」用例 |
| 6 | JSON 载荷含 `$&`／`` $` ``／`$'` | **补测试** | 同文件「JSON 载荷含 $&／$`／$' 时替换逐值安全」用例 |
| 8 | 多标记同时重复时的 `marker` 归因 | **补测试** | 同文件「多标记同时重复：marker 归因取 `TEMPLATE_MARKERS` 键序首个重复项」用例 |
| 9 | 输入形态边界（空输入／`null`／非字符串 `template`／`assets` 整体缺失／非字符串 `content`） | **补测试** | 同文件 `describe('输入形态边界（FX-74-3／V1 边界 9）')` |
| 3 | 容器**无闭标签**（N-3） | **登记** | 契约 §3.1 第 2 条的定位口径只规定「左侧最近未闭合开标签」＋ id／type 逐字，**未要求**右侧存在闭标签 → **不冻结也不排除**，owner 契约（若需收严须走 changeset） |
| 7 | 资产文本含契约标记字面量（N-10） | **登记** | §3.1.2① 已判为**产出者缺陷**（`SHARED_HELPERS_JS_RULE.selfContained`），填充器**不兜底** → **不冻结也不排除**，owner #76／#78 产出者 |
| 10 | `strict` 信封字段「继承」口径（`Object.create(ENV)` → `strict-invalid`，`hasOwnProperty`） | **登记** | 契约只写「含五字段」，未规定自有／继承 → **不冻结也不排除**，owner 契约 |
| 11 | `data` 可序列化但非 JSON 保真（`NaN` → `null`、`{a: undefined}` → `{}`） | **登记** | 契约只要求「可 JSON 序列化」，注入按 `JSON.stringify` 语义 → **不冻结也不排除**，owner #77（复制文本序列化同口径） |
| 12 | `INJECTION_ORDER` 的行为断言缺失 | **登记** | §3.1.2①／④ 已定死「无先后语义」，唯一可观察场景即第 7 条的产出者缺陷面 → **不冻结也不排除**，owner 契约 |

**注**：上表第 **4／8／9** 条的测试钉的是**实现口径**（契约未规定「纯空白资产」「多标记重复的 `marker` 归因」「非字符串入参」），属**不冻结也不排除**——契约若日后收严（走 changeset），须同步改这三条用例；第 2 条的四种属性形态则由 §3.1 第 2 条的「逐字 id／type ＋ 左侧最近未闭合开标签」直接推得，属**可推导行为**。

**FX-74-9 其余 7 条（逐条修或登记）**

| 项 | V3 洞 | 处置 | 落点 |
|---|---|---|---|
| ② | 测试 `fillTemplate` 导入面未点（bill `test/render.test.mjs:3`、chef `:6` 从 `../dist/index.js` 导入将被删除的 `fillTemplate`） | **修** | `migration-path.md` §2.1／§2.4 动作清单补「同步改测试导入面」 |
| ④ | 两文档 `escapeHtml` 落点行号口径不一（声明行 7／7／8／7／8 vs 实现体行 8／8／9／8／9） | **修** | `migration-path.md` §4 加「行号口径」注记（两文档各自正确） |
| ⑤ | 「同批删除」在本票红线内不可满足 | **修** | `migration-path.md` §4 改「同一迁移批次（各技能地图执行时）」＋登记两实现并存窗口 |
| ⑥ | §3 标题「12 个预包裹模板」实为 **12 处**（6 模板 × 2 标记；calorie 另有 6 处） | **修** | `migration-path.md` §3 标题 ＋ `.changeset/base-paint-fill-template.md` 措辞改「12 处预包裹（6 模板 × 2 标记）」 |
| ⑦ | memo 动作 2 的「调用点」措辞（生产链零调用，实指测试调用） | **修** | `migration-path.md` §2.5 动作 2 改「测试调用点」＋补「`src/render/index.ts:4` 只导出 `MEMO_TEMPLATES, loadTemplate`（无 `templateFor`）」 |
| ⑧ | 影响面未明写「5 技能迁移后零变化」与 `renderPage`／`renderReco` | **修** | `migration-path.md` §4 补两条 |
| ⑨ | 反推法依赖零字面 `&#39;` | **修** | `escape-html-calorie-diff.md` 前提自查行补「真实用户数据含 `&#39;` 时反推法失效（只影响证据表算法，不影响结论）」 |

**门禁实测（#74 返修后）**：`pnpm build` 退出 0／`pnpm boundaries` 退出 0（PASS）／`pnpm test:types` 退出 0／签名测试单跑 **46 用例全绿**（exit 0）／行为测试 `template.test.mjs` **45 用例全绿**（返修前 36，新增 9）／`pnpm test` **新增失败 = 0**（判据 = #92 台账多重集，见 §7「门禁口径」）／`SPEC_FROZEN_SURFACE` **130 条**不变。

### 8.9 #76 控件层施工台账（C-1…C-8 / D1–D6 / A1–A9）

口径同 §8：每条给**处置**与**落点**，**禁止默默略过**。本轮**落地 13 条 `pending`**（10 runtime ＋ 3 type）→ `SPEC_FROZEN_SURFACE` 仍 **130 条**，`implemented` **＋13**／`pending` **−13**（落地后实测 **implemented 119／pending 11**，余下 11 条 = #75 2／#77 4／#78 5）；**未改任何既有签名的值**（三处同步：清单 ↔ 本文 §3.3 标记区 ↔ `test-d/contract-signatures.ts`），**未实现** #75／#77／#78 的任何行为（`buildStyleSheet`／`buildDataText`／`buildLogText`／`charts`／`renderHelpShell` 仍 `pending`）。

| 编号 | 交付 | 落点 | 处置 |
|---|---|---|---|
| D1 | 13 条 `pending` 的运行时落地 | `packages/base-render/src/controls.ts`（10 出口：`copyText`／`createCopyRuntime`／`bindCopyAction`／`buildSharedHelpersJs`／`renderToast`／`createToastController`／`renderActionBar`／`renderStatusBadge`／`renderEmptyState`／`renderErrorReceipt`）＋ `src/index.ts`（只追加 10 个出口，`ControlsError` **不导出**） | **实现** |
| D2 | status 翻转 ＋ 三处同步 | `src/spec/index.ts`（13 条）↔ 本文 §3.3 标记区（13 行）↔ `test-d/contract-signatures.ts`（`_C26…_C39` 的 `Absent<>` → `Present<>` ＋ 10 条出口类型逐字锁形 `_C26b…_C39b`） | **实现** |
| D3 | 单测：六控件行为 ＋ 双通道 ＋ 接线 ＋ helpers 产出 | `packages/base-render/test/controls.test.mjs`（**64 用例**：toast 14／copyText 14／statusBadge 3／emptyState 4／errorReceipt 5／actionBar ＋ ghost 6／`bindCopyAction` 9／helpers 6／无宿主可用性表 1／无宿主可执行证据 2；计数口径 = describe 内顶层 `it(`，返修后实测）＋ `test/contract-signatures.test.mjs` 新增「#76 追加验收」1 条 | **实现** |
| D4 | 无宿主可执行证据 | **主证据**：`docs/research/t76-nohost-evidence.mjs` ＋ 快照 `docs/research/t76-nohost-evidence.md`（自包含 `file://` 页面：零 `import`／零服务／零宿主注入，44 条断言全绿；FX-76-4）。**补充**：`test/controls.test.mjs` 末 describe 的 HTTP 夹具（可 `import` dist） | **实现** |
| D5 | 契约 §4 记账 ＋ §8 台账 | 本文 §4.6（C-3 toast 样式归位偏离）＋ 本节 | **实现** |
| D6 | changeset | `.changeset/base-paint-controls.md`（`'base-paint': minor`） | **实现** |

**架构裁定逐条落地（C-1…C-8）**

| 裁定 | 落地 | 落点 |
|---|---|---|
| C-1 无宿主 ＝ 不依赖 DSH 宿主注入（允许浏览器 API 经端口） | 全部能力经 `CopyPorts`／`ToastHostPort`／`CopyActionHostPort` 注入；模块代码零浏览器全局 | `src/controls.ts`；夹具 describe（页面内联适配器实现三个方法） |
| C-2 禁内联 onclick，走 `ACTION_ID_ATTR` ＋ `bindCopyAction` | 产出按钮只带 `data-action-id`／`data-t`；helpers JS 走 `document.addEventListener` 委派；产出恒为**经典 script** IIFE | `src/controls.ts`；`test/controls.test.mjs`「零内联 onclick」＋「经典 script」用例 |
| C-3 toast 样式并入 #75 共享样式区 | `renderToast` 只产类名，零样式常量、零自注入；偏离已记账 | 本文 §4.6 |
| C-4 `actionBar` 文案可配 | `CopyButtonInput.label` 优先，缺省取 `ACTION_BAR_DEFAULTS.copyDataLabel`／`copyLogLabel` | `src/controls.ts` `normalizeCopyButton`；用例「复制按钮文案可配」 |
| C-5 不实现 `formatMenu`／`download` | 无相关出口、无相关分支 | 冻结面 44 条内无该名 |
| C-6 测试对齐旧层 31 用例行为面 ＋ 补 `actionBar` | 见 D3 用例分布；`actionBar` 补 6 条 | `test/controls.test.mjs` |
| C-7 状态枚举按契约（`ok/warn/danger/empty`，无 `fail`） | `renderStatusBadge` 非法值降级 `empty`；票面 `fail` ＝ 契约 `danger` | 用例「非法 status 降级 empty」 |
| C-8 模块代码不碰 DOM；`document.*` 只许在产出字符串里 | dist 扫描断言（剥字面量与注释后代码零 `document.`／`window.`／`navigator.`） | `test/contract-signatures.test.mjs`「#76 追加验收」 |

**验收判据逐条（A1–A9）**

| 判据 | 结论 | 证据 |
|---|---|---|
| A1 13 条全部 `implemented`、三处同步、签名值零改动 | **过** | 清单 13 条翻转；`git diff` 仅 `status` 字段变动（签名行零改动）；签名测试 47 用例全绿 |
| A2 六控件在纯 HTML 页面可用（可执行证据） | **过** | **主证据**：`docs/research/t76-nohost-evidence.md`（自包含 `file://` 页面，零 import／零服务；44 断言全绿）＋ 补充：`test/controls.test.mjs` HTTP 夹具（headless 回读 `{"actionIds":…,"dataT":"DATA-TEXT","badgeText":"失败","receiptButtons":3,…}`） |
| A3 `copyText` 双通道 ＋ 失败徽章恒在 ＋ 空串短路 ＋ `CopyPorts.toast` 生效 | **过** | 用例「clipboard 抛错／reject → fallback」「两通道皆失败…失败徽章恒在」「**fallback 同步抛错 → 返回 outcome 且徽章在（FX-76-1）**」「fallback 返回 false → reason 可区分」「空串短路」「silent 不抑制失败徽章」 |
| A4 `bindCopyAction` ＋ `ACTION_ID_ATTR` ＋ `COPY_ACTION_IDS` 接线（#90 仅凭契约可接线） | **过** | 用例「发现 → 激活 → readDataText → copyText → 反馈」＋ 夹具页面用契约示例同款 DOM 适配器接线成功 |
| A5 `buildSharedHelpersJs` 满足 `SHARED_HELPERS_JS_RULE` 五布尔；幂等只落 DOM | **过** | 用例「幂等判据只落 DOM…无 window 哨兵」「自包含」「domAllowed」＋ 签名测试纯度自证；夹具「注入两次 → `markerCount === 1`／一次点击一条反馈」 |
| A6 无内联 `onclick`；helpers JS 可在经典 script 作用域运行 | **过** | 用例「不得出现内联 onclick」「必须是 IIFE／无 ESM 语法」＋ 夹具把 helpers JS 放进**无 `type` 的 `<script>`** 跑通 |
| A7 状态枚举按契约，`fail` 映射已记账 | **过** | `STATUS_KINDS` 逐值断言（既有）＋ 用例「非法 status 降级 empty」＋ 本文 §3.3「Q8 消歧」 |
| A8 测试覆盖对齐旧层 31 用例行为面 ＋ 补 `actionBar` | **过** | 用例分布见 D3（**实测 64**：toast 14／copyText 14／statusBadge 3／emptyState 4／errorReceipt 5／actionBar ＋ ghost 6／`bindCopyAction` 9／helpers 6／可用性表 1／无宿主证据 2；旧基线 31 条行为面逐条有对应，3 条有据） |
| A9 门禁全绿、新增失败 0、changeset 到位、C-3 已记账 | **过** | 本节「门禁实测（#76 落地后）」＋ `.changeset/base-paint-controls.md` ＋ §4.6 |

**#76 自查新洞（施工者自己扫出并处置／登记，不留待复验）**

| # | 自查新洞 | 处置 |
|---|---|---|
| 76-1 | `createToastController` 的「≤820px 收窄为 3」**无法在模块代码里判定**——判定需 `matchMedia`（浏览器全局），而 AC-7 禁模块读全局；照字面实现即红线 | **登记 → 裁定后收口（FX-76-2）**：总架构师**接受**「模块纯逻辑 ＋ 页面运行时视口感知」的分工——控制器**不读**浏览器全局（AC-7 不变），收窄由页面侧 `buildSharedHelpersJs` **产出文本**（`domAllowed`）读 `matchMedia` 承担，或由调用方经 `ToastInput.maxStack` 施加；`mobileMaxPx`／`mobileMaxStack` 仍为冻结常量。契约 §3.3「toast 移动端收窄的分工」**显式记录**，可执行证据 = `controls.test.mjs`「helpers JS 在 ≤820px 视口把反馈栈收窄为 3」＋ `docs/research/t76-nohost-evidence.md` §3 |
| 76-2 | 栈容量若以 `TOAST_DEFAULTS.maxStack` 为**地板**，`maxStack: 2` 永不生效（首版实现即此缺陷，被用例抓到） | **修**：容量 = 栈内各条 `maxStack` 的最大值，**空栈**才回落 5（旧层 `stackCap()` 同语义）；用例「单条 maxStack 生效」钉死 |
| 76-3 | `renderErrorReceipt` 的「修正重试」按钮在冻结输入面里**没有 actionId**（无 `retryActionId`），若给它编 id 即撞红线 8（不许自造 actionId） | **登记（不冻结也不排除）**：该按钮**不写** `ACTION_ID_ATTR`，`retryPrompt` 只作其文案；绑定归调用方（旧层同样无 id）。若需冻结其绑定签名须走 changeset |
| 76-4 | `buildSharedHelpersJs` 的 `execCommand` 兜底用临时 textarea 的 `position`／`left` 两个内联属性——可能被读作「自带样式常量」 | **登记（nit）**：该节点是**临时**离屏载体、非控件视觉、不进 CSS；若 #75 愿承接，可改由共享样式区提供 `.ilife-copy-sink`（须走 changeset） |
| 76-5 | `renderToast` 的 `actions` 数量上限（旧层 `slice(0, 2)`）未进冻结面 | **登记**：不截断（渲染全部），记在 `src/controls.ts` 文件头；用例「actions 不截断」钉死 |
| 76-6 | `CopyButtonInput.format` 在 §3.3 无口径，若在渲染端消费即等于自定第二套 `format` 语义 | **登记**：`format` 不参与渲染（序列化归 #77，`text` 恒为已序列化字符串） |
| 76-7 | helpers JS 的反馈栈容量**不读**静态 `renderToast` 产出的 `data-max` | **登记（已知限制）**：`data-max` 属 `renderToast` 的产出属性，供**页面自建** `createToastController` 读取；helpers 的委派栈容量取冻结 `maxStack`／`mobileMaxStack`（按视口），两栈互不相干。**影响**：页面若同时用静态 toast ＋ helpers 反馈，两者容量可不同（视觉上并存两套栈）。**后续票**：#75 共享样式区落地时统一「页面栈容器」口径（owner #75／#78 页面装配） |
| 76-8 | 真实剪贴板**成功**路径从未在真浏览器里被观测（headless 无用户手势 → `writeText` 抛 `NotAllowedError`）；`writeText` 返回的 promise **偶发不 settle** | **登记（已知限制）**：成功分支只由**页面侧 resolve 桩**证明（`t76-nohost-evidence.md` §2 的 reject 桩同理）。**影响**：① 「真手势下必成功」属浏览器权限语义，非控件缺陷；② promise 永不 settle 时 helpers 无任何反馈（`copyText` 只处理 thenable 的 resolve／reject）。**后续票**：#90 接线时在真实页面（有用户手势）补一次人工观测；如需兜底超时须走 changeset（冻结面暂无该输入） |
| 76-9 | `renderEmptyState.actionHtml` 为**受信 HTML 透传**，调用方可放进内联 `onclick` | **登记（已知限制）**：契约 §3.3 明写「受信 HTML 透传（调用方负责其内容安全，不转义）」，本层**不校验**也不转义；「零注入面」只约束 base-paint **自产**标记。**影响**：调用方若把不可信数据拼进 `actionHtml` 即形成 XSS 面（责任在调用方）。**后续票**：如需收严（如禁 `on*` 属性白名单），须走 changeset（会破坏「不转义」条款）。用例「actionHtml 的受信边界显式」把该边界钉死 |

**返修（FX-76-1…FX-76-7）逐条处置**

| 编号 | 洞 | 处置 | 落点 |
|---|---|---|---|
| FX-76-1 | `ports.fallback` 同步抛错 → `copyText` 拒绝、无徽章（回归） | **修**：通道 2 包 `try/catch` → `{ ok:false, channel:null, reason:'fallback-threw' }` ＋ 失败徽章照挂 | `src/controls.ts` `copyText`（通道 2 分支）；用例「fallback 同步抛错 → 返回 outcome 且徽章在」「fallback 返回 false → reason 可区分」「fallback 抛错不影响通道 1」 |
| FX-76-2 | 「≤820px 收窄 3」与 AC-7 冲突 | **裁定后收口**：接受「模块纯逻辑 ＋ 页面运行时视口感知」分工；契约显式记录；补 ≤820px headless 证据 | 本文 §3.3「toast 移动端收窄的分工」＋ `controls.test.mjs` 视口用例 ＋ `docs/research/t76-nohost-evidence.md` §3 |
| FX-76-3① | 2 处无鉴别力断言（`controls.test.mjs` 旧 `:319`／`:712`） | **修**：`:319` 改为与 `renderToast({icon:'danger'})` **字形对拍**＋「不得是缺省图标」；`:712` 恒真布尔改为「`staticHtml=true` 的控件集合逐字固定」 | `test/controls.test.mjs` |
| FX-76-3② | 台账计数偏差（toast 11／actionBar ＋ ghost 6 vs 实测 12／5） | **修**：D3／A8 两处计数改为**实测值**（返修后 64 用例；toast 14／copyText 14／statusBadge 3／emptyState 4／errorReceipt 5／actionBar ＋ ghost 6／bindCopyAction 9／helpers 6／表 1／无宿主证据 2） | 本节 D3／A8 |
| FX-76-3③ | 无 Chrome 时 `t.skip` → 可执行证据消失 | **修**：改为**显式失败**（`requireBrowser()` 抛断言），绝不静默变绿 | `test/controls.test.mjs`；自证 `DSH_BROWSER_CANDIDATES=Z:/nonexistent/chrome.exe` → `fail 2／skipped 0` |
| FX-76-3④ | 9 条未覆盖边界 | **逐条修或登记**：badge.type／icon 回落、actions 不截断、端口返回值守卫、`copyText('', null)` 次序、`data-t=""`、场景按钮 `kind:'ghost'`、`opts.toast.fail.icon` 覆盖 → **修**（补用例／补断言）；helpers 不读 `data-max`、真实剪贴板成功路径 → **登记**（见 76-7／76-8） | `test/controls.test.mjs`；`src/controls.ts` 文件头；本节 76-7／76-8 |
| FX-76-4 | 无宿主证据靠 HTTP ＋ import，非「双击打开的独立 HTML」 | **修**：新增自包含 `file://` 页面证据（脚本 ＋ 快照）作 A2 **主证据**；HTTP 夹具降为补充 | `docs/research/t76-nohost-evidence.mjs`／`.md` |
| FX-76-5 | `findBrowser()` 缺 macOS 路径 → CI 静默跳过 | **修**：候选表补 macOS 3 条 ＋ Linux 2 条；无浏览器 → 显式失败（与 FX-76-3③ 合并） | `test/controls.test.mjs` `browserCandidates()`／`requireBrowser()`；`docs/research/t76-nohost-evidence.mjs` 同口径 |
| FX-76-6 | `void copyText(...)` 未捕 rejection | **修**：改为 `void copyText(...).catch(...)`（binder 不产第二份反馈、不重入 `onFail`）；用例监听 `unhandledRejection` 断言零触发 | `src/controls.ts` `bindCopyAction`；用例「激活回调不得产生未处理拒绝」 |
| FX-76-7① | `emptyState.actionHtml` 受信透传可含 `onclick` | **登记**（76-9）＋ 用例把「受信边界」钉死 | 本节 76-9；`test/controls.test.mjs` |
| FX-76-7② | helpers 不读 `data-max` | **登记**（76-7） | 本节 76-7；`src/controls.ts` 文件头 |
| FX-76-7③ | 夹具未断言静态 `toast` 的 `role`／`aria`／`data-max` | **修**：夹具页回读 `role`／`aria-live`／`data-max`／关闭文案，并逐条断言 | `test/controls.test.mjs` 夹具 `out.staticToast*` |
| FX-76-7④ | 真实剪贴板成功路径未观测 ＋ promise 偶发不 settle | **登记**（76-8，写明影响与后续票） | 本节 76-8 |
| FX-76-7⑤ | `#90` 的 bind 时机未写进契约 | **修**：§3.3 接线语义补「必须先渲染再 bind；动态重渲染须重新 bind」＋与 helpers 委派的差异 | 本文 §3.3 |

**门禁实测（#76 返修后）**：`pnpm build` 退出 0／`pnpm boundaries` 退出 0（PASS）／`pnpm test:types` 退出 0／签名测试单跑 **47 用例全绿**／控件守卫测试 `controls.test.mjs` **64 用例全绿／skipped 0**（含 headless Chrome HTTP 夹具 ＋ ≤820px 视口收窄用例）／自包含 `file://` 证据 **44 断言全绿**（`docs/research/t76-nohost-evidence.md`）／`pnpm test` **新增失败 = 0**（判据 = #92 台账多重集，见 §7「门禁口径」）／`SPEC_FROZEN_SURFACE` **130 条**（implemented **119**／pending 11；runtime 88／type 42）。
