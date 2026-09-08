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
| `docs/research/t92-architect-rulings.md`（原 `.scratch/t92/ARCHITECT-CALLS.md`） | AC-1…AC-17 | 逐条落进 §1–§6，索引见下表 |
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
- 类型层与运行时层的对应关系由机器断言绑死：`SPEC_FROZEN_SURFACE`（唯一清单）↔ 本文 §3 标记区表格 ↔ `test-d/contract-signatures.ts` 的类型断言。
- **两物区分（不可混称）**：`packages/base-render/src/spec/` = **冻结的共享层契约类型**（本文 §3 的施工面，type-only ＋ 纯数据常量）；`packages/base-render/src/contract.ts` = **既有渲染契约**（envelope → HTML 的 `renderPage`／`renderReco`／`escapeHtml`／`RenderError`）。两者语义不同、不得互相 import 实现：`spec/` 只描述 #74–#78 要实现的签名，`contract.ts` 是已存在的运行时。
- **清单覆盖面口径（V1 洞 15 处置）**：`SPEC_FROZEN_SURFACE` 锁的是**主签名**（每条 = 一个对外名字）；被主签名引用但未单列的类型（`ClipboardChannel`／`CopyButtonInput`／`ToastAction`／8 个 `*ChartInput`／`SceneGroup` 等）以 `packages/base-render/src/spec/*.ts` 为**唯一真相源**，其形状变更视同签名变更（须走 changeset ＋ 三处同步），不得另立第二份声明。
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
| §3 | 占位符标准与填充机制 | `<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->`／`<!--SHARED-CSS-->` 各「必须恰好 1」；`inject(template_text, payload, js_asset=None, css_asset=None, charts_asset=None, strict=False)` 返回 `(html, error)` | 部分 | `base-paint` `src/template.ts` | `fillTemplate(input: FillTemplateInput): FillTemplateOutput` | 实测：base-paint 18 出口零占位符 API；标记常量 5 份、恰一次校验 5 套错误码、`INJECT-DATA` 6 处存在但**填充者全仓不存在**（old §1 §3；new-exports §3.3） |
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

## 3. 冻结签名

**读法**：每节的「标记区表格」是本文的**机器可读投影**，由 `packages/base-render/test/contract-signatures.test.mjs` 与 `SPEC_FROZEN_SURFACE` 逐字比对；表格外是语义、失败行为、所属包与旧侧对应物。签名中的 `|` 在表格里转义为 `\|`，解析时还原。

**状态语义**：`implemented` = #92 已落地（类型或纯数据常量）；`pending` = 执行票实现，落地后**必须**把 `SPEC_FROZEN_SURFACE` 的 status 翻成 `implemented`，否则编译期断言 `Absent<>` 会失败。

**全局红线（AC-13）**：以下所有签名**只许** `import type` 消费 `base-link-core`；任何运行时调用都会同时打红 `check-boundaries.mjs` 的 L15（render 无运行时依赖）与 L23，即破坏 #96 的回归门。需要 envelope 校验的地方，一律由技能侧传入已校验数据，或用本契约自持的零依赖常量（`STRICT_ENVELOPE_FIELDS`／`STRICT_ENVELOPE_SHAPES`）实现。

### 3.1 占位符契约与统一填充器（#74）

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `TEMPLATE_MARKERS` | runtime | #74 | implemented | 3.1 | `{ injectData: '<!--INJECT-DATA-->'; sharedHelpers: '<!--SHARED-HELPERS-->'; sharedCss: '<!--SHARED-CSS-->'; chartsHelpers: '<!--CHARTS-HELPERS-->'; noShared: '<!--NO-SHARED-->' }` |
| `MARKER_RULES` | runtime | #74 | implemented | 3.1 | `Record<TemplateMarkerKey, MarkerRuleSpec>` |
| `INJECTION_ORDER` | runtime | #74 | implemented | 3.1 | `readonly ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']` |
| `DEFAULT_DATA_SCRIPT_ID` | runtime | #74 | implemented | 3.1 | `'payload'` |
| `DATA_SCRIPT_TYPE` | runtime | #74 | implemented | 3.1 | `'application/json'` |
| `STRICT_ENVELOPE_FIELDS` | runtime | #74 | implemented | 3.1 | `readonly ['version', 'skill', 'shape', 'key', 'data']` |
| `STRICT_ENVELOPE_SHAPES` | runtime | #74 | implemented | 3.1 | `readonly ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']` |
| `TEMPLATE_ERROR_CODES` | runtime | #74 | implemented | 3.1 | `readonly ['marker-missing', 'marker-duplicate', 'marker-conflict', 'data-missing', 'container-missing', 'asset-missing', 'strict-invalid']` |
| `TemplateAssets` | type | #74 | implemented | 3.1 | `{ sharedHelpersJs: string; sharedCssText: string; chartsHelpersJs?: string }` |
| `FillTemplateInput` | type | #74 | implemented | 3.1 | `{ template: string; assets: TemplateAssets; data: unknown; strict?: boolean; dataScriptId?: string }` |
| `FillTemplateReport` | type | #74 | implemented | 3.1 | `{ markers: readonly MarkerReport[]; strict: boolean; exempt: boolean; bytes: number }` |
| `FillTemplateOutput` | type | #74 | implemented | 3.1 | `{ html: string; report: FillTemplateReport }` |
| `FillTemplate` | type | #74 | pending | 3.1 | `(input: FillTemplateInput) => FillTemplateOutput` |
| `fillTemplate` | runtime | #74 | pending | 3.1 | `(input: FillTemplateInput): FillTemplateOutput` |
| `TemplateErrorShape` | type | #74 | implemented | 3.1 | `{ name: 'TemplateError'; code: TemplateErrorCode; marker?: TemplateMarkerKey; message: string }` |
<!-- FROZEN-SURFACE-TABLE-END -->

**五个占位符（逐字写法 + 语义 + 数量约束 + 填充物来源 + 缺失行为）**

| 标记（逐字） | 数量规则 | 填充物来源 | 缺失/重复行为 |
|---|---|---|---|
| `<!--INJECT-DATA-->` | **恰好 1**（`exactly-one`，不可豁免） | 场景数据：由**技能包提供**（`input.data`），填充器只注入与校验，不生产数据（AC-12） | 缺失或重复 → 抛 `TemplateError`，code `marker-missing`／`marker-duplicate`，不输出空页 |
| `<!--SHARED-HELPERS-->` | **恰好 1**（`exactly-one`，声明 `NO-SHARED` 时可缺席） | `input.assets.sharedHelpersJs`——**唯一产出签名 `buildSharedHelpersJs(input?)`**（§3.3，归 #76；#74 只消费，不得自产） | 缺失/重复且未豁免 → 抛错 `marker-missing`／`marker-duplicate`；资产为空串 → `asset-missing` |
| `<!--SHARED-CSS-->` | **恰好 1**（`exactly-one`，声明 `NO-SHARED` 时可缺席） | `input.assets.sharedCssText`——**唯一产出签名 `buildStyleSheet().css`**（§3.2，归 #75） | 同上 |
| `<!--CHARTS-HELPERS-->` | **0 或 1**（`zero-or-one`） | `input.assets.chartsHelpersJs`（可选） | 出现 >1 次 → 抛 `marker-duplicate`；出现 1 次但未提供资产 → `asset-missing`；0 次合法 |
| `<!--NO-SHARED-->` | **0 或 1**（`zero-or-one-exempt`） | 无填充物（豁免声明本身） | 与 SHARED 两标记**互斥**：声明后 SHARED 必须为 0，否则抛 `marker-conflict`；不得用「注释掉占位符」隐式豁免 |

**注入顺序**：`INJECTION_ORDER = sharedHelpers → sharedCss → chartsHelpers → injectData`（逐字对齐旧 §7 `contract:363`；旧实现顺序代码在 `injector.py:107-120`，`:104-106` 只是 `NO-SHARED` 分支）。`NO-SHARED` 不是注入步，只改数量校验。

**`<!--INJECT-DATA-->` 替换语义（FX-2①②，定死）**：

1. 填充器**只把标记文本 `<!--INJECT-DATA-->` 替换为 JSON 字符串**（`JSON.stringify` 后文本中 `<` 一律写成反斜杠 + `u003c`），**不生成、不补写 `<script>` 容器标签**。依据：旧 `injector.py:119-120` 即此形态；`skill-memo-ilife/templates/*.html` 6 个模板逐字为 `<script id="payload" type="application/json"><!--INJECT-DATA--></script>`；新实现若生成包裹会与模板自带容器**双包**。
2. **模板必须自带容器**（硬约束）：`<!--INJECT-DATA-->` 必须落在 `<script id="payload" type="application/json">…</script>` 内。`DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE` 的用途**只是校验模板自带容器**（存在则断言 id／type 与 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`，或与 `FillTemplateInput.dataScriptId` 匹配），不用于生成。
3. **缺容器或 id／type 不符 → 抛 `TemplateError`，code `container-missing`**（`message` 区分「容器缺失」与「id／type 不符」两因）；仍遵守边界规则 5，**不返空页**。
4. `data === undefined` 或不可 JSON 序列化 → 抛 `TemplateError`，code `data-missing`（V1 洞 12 处置）。

**`--strict` 校验语义**（对齐旧 `--strict-payload`，`contract:107`）：

- **默认（`strict` 省略/false）**：五个标记的数量规则**一律硬拦截**（缺失/重复/互斥冲突即抛错）；`data` 只要求可 JSON 序列化。
- **`strict: true`**：在数量规则之上，追加**零依赖信封校验**——`data` 必须是对象且含 `STRICT_ENVELOPE_FIELDS` 五字段，`shape` 必须 ∈ `STRICT_ENVELOPE_SHAPES`。不合法 → 抛 `TemplateError`，code `strict-invalid`。**不得**调用 base-link-core 的 `parseEnvelope`（AC-13）。
- 注入的 payload 文本：JSON 序列化后**只替换 `<!--INJECT-DATA-->` 标记文本**（容器由模板自带，见上）；文本中 `<` 一律写成反斜杠 + `u003c`，防 `</script>` 断标签。

**注入结果（机器可读）**：`FillTemplateOutput.report` = `{ markers, strict, exempt, bytes }`；`markers[]` 逐标记给 `{ key, literal, rule, count, filled }`；`bytes` = 输出 HTML 字节数（对齐旧 CLI 结果 JSON 的 `bytes` 口径，`injector.py:210-305`）。失败**不返回** `html: ''`——一律抛错（边界规则 5：缺失阻断不返空）。

#### 3.1.1 envelope 形状裁定与追溯（FX-4）

- **事实**：`packages/base-link-core/src/envelope.ts:9-11` 定义 `ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']`，共 **6** 个形状（`fallback` = 降级载荷），`EnvelopeShape` 直接由它推导。
- **分歧**：上位规格 `docs/calorie-architecture.md:53` 写 `shape ∈ stat/list/detail/analysis/receipt`（**5** 个），`ARCHITECT-CALLS.md:35`（AC-5）照抄同 5 个。
- **裁定**：以**六形状**为准——规格 `:53` 属**不完整列举**（漏 `fallback`），不是契约分叉。`STRICT_ENVELOPE_SHAPES` 逐字等于 link-core `ENVELOPE_SHAPES`，由 `test-d/contract-signatures.ts`（`_T05`）与 `test/contract-signatures.test.mjs`（形状表同步用例）双向钉死。
- **追溯**：写法对齐 AC-3 对 `type`／`types` 的裁定（§3.5.2）——先给事实、再给裁定、再给同步动作；`docs/calorie-architecture.md:53` 已补一行勘误注记。
- **不冲突声明**：`SERIALIZABLE_SHAPES`（5 个，六形状去掉 `fallback`）有单独交代（§3.4），**不构成**对六形状的否定。

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
| `CopyText` | type | #76 | pending | 3.3 | `(text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>` |
| `copyText` | runtime | #76 | pending | 3.3 | `(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>` |
| `CopyRuntime` | type | #76 | implemented | 3.3 | `{ copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }` |
| `createCopyRuntime` | runtime | #76 | pending | 3.3 | `(ports: CopyPorts): CopyRuntime` |
| `CopyActionHostPort` | type | #76 | implemented | 3.3 | `{ readDataText(actionId: string): string \| undefined; onActivate(actionId: string, handler: () => void): () => void }` |
| `BindCopyAction` | type | #76 | pending | 3.3 | `(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions) => { dispose(): void }` |
| `bindCopyAction` | runtime | #76 | pending | 3.3 | `(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }` |
| `SharedHelpersInput` | type | #76 | implemented | 3.3 | `{ prefix?: string; dataAttr?: string }` |
| `BuildSharedHelpersJs` | type | #76 | pending | 3.3 | `(input?: SharedHelpersInput) => string` |
| `buildSharedHelpersJs` | runtime | #76 | pending | 3.3 | `(input?: SharedHelpersInput): string` |
| `ToastInput` | type | #76 | implemented | 3.3 | `{ msg: string; detail?: string; icon?: ToastIcon; badge?: ToastBadge; actions?: readonly ToastAction[]; count?: string; lines?: readonly string[]; code?: string; timeoutMs?: number; maxStack?: number }` |
| `ToastHostPort` | type | #76 | implemented | 3.3 | `{ mount(html: string): { remove(): void } }` |
| `ToastController` | type | #76 | implemented | 3.3 | `{ show(input: ToastInput): void; flush(): void; dispose(): void }` |
| `renderToast` | runtime | #76 | pending | 3.3 | `(input: ToastInput): string` |
| `createToastController` | runtime | #76 | pending | 3.3 | `(port: ToastHostPort): ToastController` |
| `ActionBarInput` | type | #76 | implemented | 3.3 | `{ buttons?: readonly ActionBarButton[]; copyData?: CopyButtonInput; copyLog?: CopyButtonInput }` |
| `renderActionBar` | runtime | #76 | pending | 3.3 | `(input: ActionBarInput): string` |
| `StatusBadgeInput` | type | #76 | implemented | 3.3 | `{ status: StatusKind; text?: string }` |
| `renderStatusBadge` | runtime | #76 | pending | 3.3 | `(input: StatusBadgeInput): string` |
| `EmptyStateInput` | type | #76 | implemented | 3.3 | `{ icon?: string; text: string; hint?: string; actionHtml?: string }` |
| `renderEmptyState` | runtime | #76 | pending | 3.3 | `(input: EmptyStateInput): string` |
| `ErrorReceiptInput` | type | #76 | implemented | 3.3 | `{ message: string; retryPrompt?: string; dataText?: string; logText?: string }` |
| `renderErrorReceipt` | runtime | #76 | pending | 3.3 | `(input: ErrorReceiptInput): string` |
<!-- FROZEN-SURFACE-TABLE-END -->

**控件清单与签名（6 个控件，逐条）**

| 控件 | 冻结签名 | 语义（输入 → 输出） | 失败行为 |
|---|---|---|---|
| `toast` | `renderToast(input: ToastInput): string`；`createToastController(port: ToastHostPort): ToastController` | `ToastInput` → toast HTML 字符串；controller 负责堆叠（`maxStack` 5／≤820px 收窄 3）、FIFO 挤出、单条独立计时（`timeoutMs` 4500）、`flush()` 清栈 | `input.msg` 非字符串 → 抛 `ControlsError` code `bad-input`；`actions[]` 只接受 `actionId`，含内联 `onclick` 的入参一律拒 |
| `copyText` | `copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`；`createCopyRuntime(ports: CopyPorts): CopyRuntime`；`bindCopyAction(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }` | **双通道**：先走 `ports.clipboard.writeText`（通道 `clipboard`），失败/不可用（`clipboard === null`）再走 `ports.fallback`（通道 `fallback`）；`text === ''` 短路返回 `{ ok: false, channel: null, reason: 'empty' }`，不弹 toast 不触发回调；`opts.silent` 只静默**成功** toast，回调仍触发；**失败徽章恒在**（见下）；`onOk(channel)`／`onFail(reason)` 互斥且必触发一次 | 两通道皆失败 → `{ ok: false, channel: null, reason }`（不抛错，调用方据 `ok` 决策）；`ports` 缺失或 `fallback` 非函数 → 抛 `ControlsError` code `bad-input` |
| `actionBar` | `renderActionBar(input: ActionBarInput): string` | 场景按钮（`kind: primary／red`）＋ 复制数据／复制日志 ghost 按钮（独立一行，偶数一行 2 个，`min-height` 40px、12px/600、描边透明度 0.38）；复制文本在**渲染期**序列化后写入 `data-t`，零注入面 | 同 `toast` 的入参校验 |
| `statusBadge` | `renderStatusBadge(input: StatusBadgeInput): string` | `status` ∈ `ok／warn／danger／empty` → 语义色徽章；`text` 缺省取 `STATUS_DEFAULT_TEXT`；动态文本一律经 `ESCAPE_HTML_ENTITIES` | **非法 `status` 降级为 `empty`**（不抛错，防无样式徽章） |
| `emptyState` | `renderEmptyState(input: EmptyStateInput): string` | `{ icon?, text, hint?, actionHtml? }` → 空态区块；`icon／text／hint` 一律转义 | `text` 缺失/非字符串 → 抛 `ControlsError` code `bad-input`；`actionHtml` 为**受信 HTML 透传**（调用方负责其内容安全，不转义） |
| `errorReceipt` | `renderErrorReceipt(input: ErrorReceiptInput): string` | `{ message, retryPrompt?, dataText?, logText? }` → 错误回执（描述 + 修正重试 + 复制数据/日志）；复制文本渲染期入 `data-t` | 缺 `dataText`／`logText` → **不渲染**对应复制按钮（容错，不抛错）；**不得**读 `window.__hmPayload`（AC-7） |

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
- **不得读隐式全局**：`navigator.clipboard` 由**调用方**作为 `ports.clipboard` 传入（AC-7）。base-paint 自身不出现 `window.`／`document.`／`navigator.`（签名测试逐字节扫描 `dist/**/*.js`）。
- **空串短路**：`copyText('')` 立即返回 `{ ok: false, channel: null, reason: 'empty' }`，无 toast 无回调（旧语义 `contract:311`）。
- **失败徽章恒在（FX-3② 定死：`copyText` 直接挂载，不交调用方插片段）**：失败态经 `ports.toast.mount(renderToast({ icon: 'danger', badge: { type: 'danger', text: … }, … }))` 挂载，`COPY_TEXT_DEFAULTS.failBadgeAlwaysOn = true`，**不受 `opts.silent` 影响**、不可被调用方移除；`ports.toast` 缺省时**降级为只回调 + 返回 outcome**（不产 HTML、不抛错，仍不违反「无宿主可用」）。

**复制接线签名（FX-3③，#90 仅凭契约即可落地）**

```ts
export interface CopyActionHostPort {
  readDataText(actionId: string): string | undefined;          // 读渲染期写入的 data-t
  onActivate(actionId: string, handler: () => void): () => void; // 订阅激活，返回解绑
}
export type BindCopyAction = (
  port: CopyActionHostPort,
  ports: CopyPorts,
  opts?: CopyTextOptions,
) => { dispose(): void };
```

- **语义**：`bindCopyAction` 把「`actionId` → `data-t` 文本 → `copyText` → 反馈」串成一条链——`renderActionBar`／`renderErrorReceipt` 渲染期把文本写入 `data-t`（`CopyButtonInput.text`），binder 用 `port.readDataText(actionId)` 取回、调 `copyText(text, ports, opts)`，反馈走 `ports.toast`；`ActionBarButton.actionId`／`data-t` 的读取者**就是本签名**（V1 洞 5）。
- **DOM 边界**：`el` 以 `CopyActionHostPort` **端口**呈现（DOM 不得进 base-paint，AC-7／§4.1）；调用方用普通 `.html` 内联适配器实现两个方法即可，无需 DSH 宿主。
- **无 `data-t` 不抛错**：`readDataText` 返回 `undefined` → 跳过该按钮（与 `renderErrorReceipt` 缺 `dataText` 不渲染按钮同口径）。

**共享 JS 文本的唯一产出者（FX-2③，归 #76；#74 只消费）**

- 冻结签名：`buildSharedHelpersJs(input?: SharedHelpersInput): string`；`SharedHelpersInput = { prefix?: string; dataAttr?: string }`（缺省 `ilife-`／`data-t`）。
- 产出恒为**非空** JS 文本，且必须是 IIFE 或显式挂载点（**不得**引入隐式全局，AC-7）；空串视为实现缺陷 → `fillTemplate` 抛 `asset-missing`。
- 消费链：`#76` 产出 → 技能包把它放进 `TemplateAssets.sharedHelpersJs` → `#74` 的 `fillTemplate` 只负责填 `<!--SHARED-HELPERS-->`。**不许**出现「必填但无产出者」或技能侧自产副本（B3）。

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

- 三种 format 下**敏感行**（`{ text, sensitive: true }`）一律输出 `TEXT_SENSITIVE_MASK`（`****`），并在 `text` 口径附加一行提示（旧 `contract:162`）。
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

  壳渲染场景卡时把 `prompt_template` 全文写入按钮的 `data-t`（渲染期序列化，零注入面），三个按钮的 `actionId` 取上表；点击分发走 `bindCopyAction`（§3.3）。
- **HELP 壳产物结构（V1 洞 7 处置：不冻结也不排除）**：DOM 结构／类名／区块顺序的**逐节点契约不冻结也不排除**——owner 是 **#78**（壳渲染）与 **#88**（速查台重建），验收以 #88 的三条守卫（占位符 0 残留／`id` 唯一／`copyText` 单实现）＋ #96 快照门为准。本契约冻结的是**可断言的锚点**：`HelpShellInput` 四件套、`HELP_SHELL_ID`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS`、类名前缀 `ilife-`（`CONTROL_STYLE_SECTIONS.helpShell`）、三个必需占位符各恰好 1 次。
- **填充**：壳模板必须走 `fillTemplate`（`INJECT-DATA` 恰好 1、`SHARED-CSS` 恰好 1、`SHARED-HELPERS` 恰好 1）；HELP 壳不得自填、不得内联脚本、不得读全局。
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
| #90 | 直接复用 §3.3 的 `copyText` ＋ `bindCopyAction` ＋ `renderActionBar` ＋ §3.4 的序列化签名（`blocked_by [76,77]`）；「复制 → 反馈」仅凭契约即可接线（FX-3③） |
| #83 | `delivery{mode,path?,template?,bytes?}` 与三态交付（文件态／内联态／文本态）由 **#83** 追加：本契约**不冻结其内部结构、也不排除**——§2 把 `Envelope` 冻结为五字段（`version／skill／shape／key／data`）**不构成**对 `delivery` 的否定（那是「当前五字段」的现状冻结，不是「不得新增字段」的禁令）；#83 追加后须同步 §2／§3.4 与签名测试（FX-5） |
| #87 | 输出命名（「目录 ＋ 中文命令 ＋ 时间戳 ＋ 冲突后缀」＋ 显式指定输出路径，规格 ID-21）**不冻结也不排除**，owner #87；本契约只认 `FillTemplateReport.bytes`／`FillTemplateOutput.html` 两个产物面字段（FX-5） |
| #106 | HELP 回补 F1／F2 的**逐场景 CLI 展示**与变体示例（Q11）**不冻结也不排除**，owner #106；壳侧目前只有 `Scene.id` 推导约定（§3.5.3），#106 可新增展示字段但不得改四件套签名（FX-5） |
| #107 | 6 个未引用的「死模板」并入 HELP **不冻结也不排除**，owner #107；属技能侧数据，壳只提供渲染面（§3.5.3）（FX-5） |
| #99 | 「门面文档示例可执行」门（Testing Decisions 门禁）owner **#99**，不在 base-paint 冻结范围；本契约只保证 §6.1–§6.5 给出的命令可照抄执行（FX-10） |
| #79 | §2 的 26 行对照表是**签名冻结口径**；#79 验收的「v1.30 签名 × 实现实况」对照表以**实现实况**为准——两者口径不同、不互为矛盾（V3 相邻票边界处置） |
| #74 | `packages/skill-bill/scripts/build-help.mjs:28 injectHelpBlock` 与 `injector` 混称：**不属 #92 改动面**，交接给 **#74**（其任务正是消灭 per-skill 私有填充器）；本契约只登记不修（FX-16②） |
| 文档 owner／#79 | `CONTEXT.md` 补录「复制指令」词条（术语基线未收录，见 §0.2）；对外文案口径已定死在 `HELP_COPY_ACTIONS`，词条补录**不冻结也不排除**（FX-15①） |

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

- **用**：`fillTemplate`／`FillTemplateInput`／`FillTemplateOutput`／`TemplateAssets`／`TEMPLATE_MARKERS`／`MARKER_RULES`／`INJECTION_ORDER`／`DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`／`STRICT_ENVELOPE_*`／`TEMPLATE_ERROR_CODES`。
- **不许自造**：`injectHtml`／`htmlInjector`／任何 `inject*` 填充函数名；技能侧保留 `fillTemplate`／`fillSharedMarkers` 私有副本（B3 要求删除）；运行时 `import` base-link-core；**生成／补写 `<script>` 容器**（只替换标记文本，容器由模板自带，FX-2①②）；自产 `sharedHelpersJs`（产出者是 #76 的 `buildSharedHelpersJs`，FX-2③）。
- **`escapeHtml` 归一 owner（V1 洞 13 处置）**：把既有 `escapeHtml` 从 4 字符改到 5 字符（`& < > " '`）并翻转 §7 哨兵**由 #74 执行**（#79 只复核）；改完必须同步删除技能侧本地副本，并保证 #96 快照门通过。
- **验收怎么测**：`node -e` 断言五个标记的数量规则（缺失/重复/互斥各抛对应 code）；**断言模板缺自带容器或 id／type 不符 → `container-missing`**；`Select-String -Path packages\*\src\render\html.ts -Pattern 'SHARED_CSS_MARKER|fillSharedMarkers'` 必须零命中；`node tooling/check-boundaries.mjs` 仍 PASS。

### 6.2 #75 样式资产（`src/style.ts` ＋ 产出函数）

- **用**：`CSS_VAR_TOKENS`（11 个逐值）／`STYLE_SHEET_ID`／`CONTROL_STYLE_SECTIONS`／`STYLE_FORBIDDEN_TOKENS`／`buildStyleSheet`／`StyleSheetInput`／`StyleSheetOutput`。
- **不许自造**：新的 token 名（Q14 禁 `--r-xl`／`--pink`／深色区）；第二份 token 表；把既有 `STYLE_TOKENS` 删掉或改语义。
- **验收怎么测**：断言 `Object.keys(CSS_VAR_TOKENS).length === 11` 且逐值与 §3.2 CSS 块一致；断言产出 CSS 里 `--blue: #007aff`；断言不含 `--r-xl`／`--pink`；`pnpm publish:plan` 的 tarball 含契约资产（随 `dist`）。

### 6.3 #76 控件层（`src/controls.ts`）

- **用**：`renderToast`／`createToastController`／`copyText`／`createCopyRuntime`／**`bindCopyAction`／`CopyActionHostPort`**／**`buildSharedHelpersJs`／`SharedHelpersInput`**／`renderActionBar`／`renderStatusBadge`／`renderEmptyState`／`renderErrorReceipt` 及其 Input 类型、`CopyPorts`（含 `toast?`）／`ToastHostPort`、`COPY_CHANNELS`／`COPY_TEXT_DEFAULTS`／`TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS`／`STATUS_*`／`ESCAPE_HTML_*`／`CONTROL_AVAILABILITY`。
- **不许自造**：`formPrompt`／`selectList`／`smartSelect`／`confirm`／`foldBox`（B7）；`window.*` 全局（AC-7）；只留 `execCommand` 的单通道复制（Q13）；把控件写成「需要宿主」；第二套反馈端口（反馈一律走 `CopyPorts.toast`）；第二套共享 JS 产出者（唯一产出者 `buildSharedHelpersJs`）；把 `el`／`document` 塞进签名（DOM 只经 `CopyActionHostPort`）。
- **验收怎么测**：纯 HTML 夹具（不启 DSH）注入产出字符串 → 断言静态结构；`copyText` 用假 `CopyPorts`（clipboard 抛错 + fallback 返回 true）断言 `channel === 'fallback'`；空串短路；`silent` 仍回调；**失败时 `ports.toast.mount` 被调用（徽章恒在）且 `silent` 不抑制它**；`onOk`／`onFail` 互斥；`bindCopyAction` 用假 `CopyActionHostPort` 断言「激活 → `readDataText` → `copyText` → 反馈」链路与 `dispose()` 解绑；`buildSharedHelpersJs()` 返回非空且不含 `window.`；`statusBadge` 非法 status 降级 `empty`；`errorReceipt` 缺 `dataText` 不渲染复制按钮且不抛错。

### 6.4 #77 复制序列化（`src/text.ts`）

- **用**：`buildDataText`／`buildLogText`／`DataTextInput`／`LogTextInput`／`CopyLogFields`／**`DATA_TEXT_PROJECTIONS`／`DataProjectionSpec`／`LOG_SECTION_SOURCES`**／`COPY_FORMATS`／`SERIALIZABLE_SHAPES`／`LOG_SECTIONS`／`LOG_SECTION_TITLES`／`TEXT_*`／`CSV_DIALECT`／`TEXT_ERROR_CODES`。
- **不许自造**：snapshot 结构接口（B2）；第二套 `format` 语义（§3.4 已定死）；自定的空值/转义口径；**自定的逐 shape 投影**（一律读 `DATA_TEXT_PROJECTIONS`）；**给 `scene` 段另找数据源**（恒由 envelope 派生，`LOG_SECTION_SOURCES.scene === 'envelope'`）。
- **验收怎么测**：对 5 个 shape 各造一个 envelope，三种 format 各断言输出（含空值、敏感行 `****`、CSV 引号转义与两列语义、JSON 的 `<` 处理）；逐 shape 断言输出行与 `DATA_TEXT_PROJECTIONS` 一致；6 段日志逐段断言数据源与 `LOG_SECTION_SOURCES` 一致（`scene` 段取 `skill.key（shape）`；缺失段 `text` 写 `(未知)`／`json` 写 `null`／`csv` 写空串）；`fallback` shape 断言抛 `shape-unsupported`；`data` 不符 `EnvelopeDataByShape[shape]` 断言抛 `structure-invalid`。

### 6.5 #78 图表与 HELP 壳（`src/charts.ts`／`src/help.ts`）

- **用**：`ChartsApi`（8 方法）及 8 个 Input 类型／`ChartItem`／`ChartOutput`／`CHART_*`／`CHART_PALETTE`；`renderHelpShell`／`HelpShellInput`／`SceneData`／`SCENE_DATA_SCHEMA`／`SCENE_TYPE_FIELD`／`SCENE_STATUS`／`HELP_*`／**`HELP_COPY_ACTIONS`**。
- **不许自造**：`el` 参数（DOM 由调用方挂载）；`<canvas>`；技能侧图表实现或白名单例外（B4）；`type`（单数）字段或 `types` 别名（AC-3）；第二份 scene-data schema（AC-4）；手写 `scene-data.schema.json`（发布则必须由 `SCENE_DATA_SCHEMA` 序列化生成，FX-6）；复制按钮的第二套 `actionId`／文案（取 `HELP_COPY_ACTIONS`，FX-7）。
- **验收怎么测**：8 个接口各跑一次结构断言（含空数组 → `empty === true` 且走 `renderEmptyState`；`pct` 型接口 `points === 1` 且 `pct === 0` 时 `empty === false`；非法 items 抛 `structure-invalid`；`pct` 非数抛 `pct-invalid`）；断言产出无 `<canvas>`／无 `<script`；`SCENE_DATA_SCHEMA` 校验一份含 `init_banner`／`contact`／`version`／`recommendations` 的数据；若随包发布 `scene-data.schema.json`，断言它与 `SCENE_DATA_SCHEMA` 逐值相等；`renderHelpShell` 走 `fillTemplate` 后断言三个必需标记各出现 1 次；三个复制按钮的 `actionId`／文案与 `HELP_COPY_ACTIONS` 逐字一致。

## 7. 签名测试清单

<!-- FROZEN-SURFACE-TABLE-START -->
| 名字 | 种类 | 票 | 状态 | 章节 | 逐字签名 |
|---|---|---|---|---|---|
| `SPEC_FROZEN_SURFACE` | runtime | #92 | implemented | 7 | `readonly FrozenSurfaceEntry[]` |
<!-- FROZEN-SURFACE-TABLE-END -->

| 层 | 文件 | 断言什么 | 怎么跑 |
|---|---|---|---|
| 编译期类型断言 | `packages/base-render/test-d/contract-signatures.ts` | ① 既有 18 运行时出口＋12 类型出口逐条锁形；② §3 每条冻结签名逐字一致（`Equal<>`／`Expect<>`）；③ `pending` 条目**尚未导出**（`Absent<>`），实现后必须翻转清单；④ 跨包漂移：`STRICT_ENVELOPE_SHAPES` ↔ link-core `EnvelopeShape` | `pnpm build`（root `tsconfig.json` 的 `include` 已收该目录，`tsc -b` 一并编译）；亦可 `pnpm test:types` |
| 运行时出口面锁 | `packages/base-render/test/contract-signatures.test.mjs` | ① 既有 18 出口仍在（D4 只追加）；② 新增运行时出口**恰好等于**清单里 implemented 的运行时项；③ `pending` 未导出、type-only 不得有运行时值；④ 文档标记区表格与清单逐字一致；⑤ 章节标题／§2 26 行／AC-1…AC-17 落点／FX-1…FX-16 落点／无 BOM 与字面反斜杠 n；⑥ 占位符/token/双通道/形状表/schema/逐 shape 投影表/6 段日志数据源/HELP 复制文案逐值 ＋ `scene-data.schema.json` 存在即与常量逐值相等（FX-6）；⑦ 门禁红线：无 `dependencies`、`files` 含 `dist`、`dist/**/*.js` 无 `node:`／`window.`／`document.`、`src/spec/*.ts` 只许 `import type` | `pnpm test`（root script 的 glob 已含 `packages/base-render/test/*.test.mjs`） |

- **怎么捕捉漂移（一句话）**：清单 `SPEC_FROZEN_SURFACE` 是唯一真相源，文档标记区表格与它逐字比对（`contract-signatures.test.mjs` 的「文档投影绑死」用例），类型层再对每条签名做 `Equal<>` 断言（`contract-signatures.ts`），任一环改一处不改其余即红。
- **哨兵**：`escapeHtml("'") === "'"` 是**已知待修**的漂移哨兵（AC-14）——**AC-14 归一后本断言必须翻转**为 `escapeHtml("'") === '&#39;'`；当前为真只表示缺陷未修，**不代表**该行为被契约接受（FX-16①）。执行归 #74（§6.1），#79 复核。
- **既有失败台账（FX-13，不修）**：`pnpm test` 当前 exit 1（返修后实测 `tests 435 / pass 413 / fail 22`；返修前为 `430／408／22`，**新增失败 = 0**），**22 条全部是 #92 之前既有、与 base-paint 冻结面零耦合**的失败，**不属 #92 修复范围**：A 组 10 条 = Windows 并行 spawn 抖动（6 个 plugin smoke 单跑 46/46 绿、不可复现）；B 组 12 条 = `plugin-{bill,chef,home,schedule}-ilife` 缺 `"build:client":"tsdown"`（另案承接，不属 #63）。逐条清单与三重证明见 `docs/research/t92-verify-v2-gates.md`「A4 争议取证」。**A4 口径据此定为「三命令零回归」**：`pnpm build`／`pnpm boundaries`／`pnpm test:types` 绿 ＋ `pnpm test` **新增失败 = 0**（本契约的签名测试单跑必须 100% 绿）。
- **门禁归属（FX-10）**：「门面文档示例可执行」门 owner **#99**；「计数断言（77）」owner 技能包／#79（本契约不复制计数）；两者均已在 §4.4 登记。
- **失败即契约缺陷**：测试红时**只许**改实现或同时改「清单＋文档＋类型」三处，不许删断言、放宽断言或改成恒真。

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
