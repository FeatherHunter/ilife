# V1 独立性验证：`#74`–`#78`（＋`#90`）能否仅凭冻结契约开工

- 方法：`PHASE3-VERIFY.md:10-25`（V1 节）。逐票把票面「任务／验收」拆成可判定条目 → 到契约找逐字签名（`docs/base-paint-contract.md` §3.x ＋ `packages/base-render/src/spec/*.ts` ＋ `SPEC_FROZEN_SURFACE`）→ 判定 完整／部分／缺 → 反向查越权。
- 判据：`.scratch/t92/CONSTRAINTS.md` §1／§6（A1–A7）、`.scratch/t92/ARCHITECT-CALLS.md` AC-1…AC-17。
- 票面原文：`gh issue view 74/75/76/77/78/90 --json title,body`（本次逐票读正文，非只看标题）。
- 被验对象（只读，未改）：`docs/base-paint-contract.md`（533 行）、`packages/base-render/src/spec/{index,template,style,controls,text,charts,help}.ts`、`packages/base-render/test-d/contract-signatures.ts`、`packages/base-render/test/contract-signatures.test.mjs`。
- 交叉证据：`.scratch/t92/old-v130-signatures.md`（＝`docs/research/t92-old-v130-signatures.md`，两处同为 64295 bytes）、`packages/base-link-core/src/envelope.ts`、`D:\2Study\StudyNotes\SKILLS\公共组件\injector.py`（只读核对）、`packages/skill-*/templates/*.html`。
- 纪律：票面与契约冲突时以票面原文为准；契约是施工图，不是改写票面的许可证。

---

## #74 base- 统一 HTML 注入器与占位符契约

票面任务：按 B3 由 base-paint 统一填充 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->` 等占位符；现状填充者散在技能 render 层。
票面验收：① base-paint 提供统一注入器 API，技能只声明模板与数据、不再自带 `SHARED_*` 副本；② skill-calorie 的 6 个模板占位符能被真正填充（构建／渲染实测）；③ `tooling/check-boundaries.mjs` 仍绿；其余 5 技能的迁移路径写进票面。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：占位符由 base-paint 统一填充（B3） | `fillTemplate(input: FillTemplateInput): FillTemplateOutput`；`TEMPLATE_MARKERS`；`MARKER_RULES` | 完整 | `docs/base-paint-contract.md:81,98,118-160`；`packages/base-render/src/spec/template.ts:16-49`；`src/spec/index.ts:42-56` |
| 任务：五个占位符逐字＋数量约束＋填充物来源＋缺失行为 | 占位符表（exactly-one／zero-or-one／zero-or-one-exempt）＋`MARKER_RULES` | 完整 | `base-paint-contract.md:140-148`；`spec/template.ts:40-46`；`test/contract-signatures.test.mjs:193-211` |
| 任务：注入顺序固定 | `INJECTION_ORDER = ['sharedHelpers','sharedCss','chartsHelpers','injectData']` | 完整 | `base-paint-contract.md:150`；`spec/template.ts:49`（旧侧一致见疑点①） |
| 任务：`--strict` 两档校验（零依赖，不得调 link-core） | `STRICT_ENVELOPE_FIELDS`／`STRICT_ENVELOPE_SHAPES`；`strict?: boolean` | 完整 | `base-paint-contract.md:152-156`；`spec/template.ts:57-60,93-94`；`base-paint-contract.md:116`（AC-13 红线） |
| 任务：失败一律抛错、不返空页；结果机读 | `TEMPLATE_ERROR_CODES`（6）＋`TemplateErrorShape`＋`FillTemplateReport{markers,strict,exempt,bytes}` | 完整 | `base-paint-contract.md:158`；`spec/template.ts:63-79,98-113` |
| 验收①：统一注入器 API 落地 | `fillTemplate`／`FillTemplate`（`pending`）＋5 常量＋6 错误码 | 完整 | `spec/index.ts:42-56`（`status:'pending'`）；`test-d/contract-signatures.ts:133`（`Absent<'fillTemplate'>`） |
| 验收①：技能只声明「模板与数据」，不再自带 `SHARED_*` 副本 | §3.1 B3 强约束＋§6.1「不许自造」＋零命中 grep 测法 | 完整 | `base-paint-contract.md:162,491-492` |
| 验收①：`assets` 从哪来（`TemplateAssets.sharedHelpersJs` 必填） | 只有类型，**无产出签名** | 部分 | `spec/template.ts:82-86`；`base-paint-contract.md:145-147`（只说「base-paint 产出的共享 JS 文本」，§3.2 仅冻结 `buildStyleSheet`→css） |
| 验收②：calorie 6 模板占位符能被真正填充 | 标记规则＋`DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`＋`dataScriptId?` | 部分 | 见洞 3、洞 4：`<!--INJECT-DATA-->` 替换语义未定死；calorie 6 模板实测**无** `INJECT-DATA`（`packages/skill-calorie/templates/{diet,exercise,goal,help,home,photo-gallery}.html:7,37` 仅 2 个标记） |
| 验收③：`check-boundaries.mjs` 仍绿 | §4.3 七条断言＋§6.1 实测命令 | 完整 | `base-paint-contract.md:448-458,492` |
| 验收③：其余 5 技能迁移路径写进票面 | 契约只声明「迁移路径归 #74」，不写迁移 | 完整（票面自带该要求，契约不越权） | `base-paint-contract.md:162,83`（AC-12） |

**#74 小结：签名面完整，施工面有两处硬洞（洞 3／洞 4）＋一处口径洞（洞 12），照契约直接开工会在「模板该怎么写」和「共享 JS 从哪来」上各猜一次。**

---

## #75 base- 共享样式资产：token 转可注入 CSS 并随包发布

票面任务：旧 `公共组件/assets/base.css` 17.6KB（token A 组＋控件样式）在新架构无对应物。
票面验收：① 共享 CSS 资产随 base-paint 发布（`files` 实证）；② 技能模板注入后视觉与 B1 标杆一致（与视觉验收票联动）；③ `check-boundaries.mjs` 仍绿。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：token A 组转可注入 CSS | `CSS_VAR_TOKENS`（11 个逐值）＋`buildStyleSheet(input?: StyleSheetInput): StyleSheetOutput` | 完整 | `base-paint-contract.md:164-195`；`spec/style.ts:12-24,62-63`；`test/contract-signatures.test.mjs:213-222` |
| 任务：旧 base.css 的**控件样式**（17.6KB 主体） | 仅 `CONTROL_STYLE_SECTIONS`（8 个命名空间，闭集） | 部分（只有区名，无任何视觉规格） | `base-paint-contract.md:171,201`；`spec/style.ts:32-43`（见洞 6） |
| 验收①：随包发布（`files` 实证） | 资产形态＝运行时字符串随 `dist/index.js` 发布；`files:["dist"]` 已覆盖，不改 | 完整 | `base-paint-contract.md:203-207`；实测 `packages/base-render/package.json` `files=["dist"]` |
| 验收①：`style/tokens.css` 去留 | 明确「不是契约资产」，归 #75 | 完整 | `base-paint-contract.md:206` |
| 验收①：子路径导出（`exports["./style.css"]`） | 明确不在冻结范围，交接 #95／#79 | 完整 | `base-paint-contract.md:207,464` |
| 验收②：视觉与 B1 标杆一致 | `--blue:#007aff` 锁 B1＋`STYLE_FORBIDDEN_TOKENS=['--r-xl','--pink']`＋禁深色区 | 部分（只锁 token，控件视觉无标） | `base-paint-contract.md:197-198`；`spec/style.ts:46`（见洞 6） |
| 验收②：与既有 `STYLE_TOKENS` 不冲突 | 声明「不同物，不得互相覆盖」 | 完整 | `base-paint-contract.md:199`；`spec/style.ts:4-5` |
| 验收③：`check-boundaries.mjs` 仍绿 | §4.3 第 6 条（样式只抖 base-paint／`ilife-` 前缀／单品包禁样式常量） | 完整 | `base-paint-contract.md:455,448-458`；`CONSTRAINTS.md:39` |
| （机制）样式唯一真相源 | §3.2 边界＋§6.2 测法 | 完整 | `base-paint-contract.md:201,494-498` |

**#75 小结：token 与发布口径完整（疑点⑤ 通过）；但「控件样式」这一半只冻结了命名空间，视觉规格全空，#75 必须自造 17.6KB 等价的样式，且票面验收②「与 B1 标杆一致」在契约里没有判据（洞 6）。**

---

## #76 base- 控件层：toast／copyText／actionBar／状态三控件

票面任务：交互型控件（`formPrompt`／`selectList`／`smartSelect`）归插件 client；纯技能侧补可静态运行的控件：toast、copyText、actionBar、状态三控件（ok／warn／fail 视觉）。
票面验收：① 控件在无宿主（纯 HTML）下可用，单测覆盖；② 与【复制交互走 Base P0 双通道】票的接口对齐。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：B7 交互型控件不进 base-paint | §4.1 不进清单＋§3.3 不移植理由（`formPrompt`／`selectList`／`smartSelect`／`confirm`／`foldBox`） | 完整 | `base-paint-contract.md:440-442,89-94,502-503`；`test/contract-signatures.test.mjs:117-122` |
| 任务：toast | `renderToast`／`createToastController`／`ToastInput`／`ToastHostPort`／`ToastController`／`TOAST_DEFAULTS`／`TOAST_ICONS` | 完整（签名＋堆叠语义） | `base-paint-contract.md:240-241,221,237-239,256`；`spec/controls.ts:90-144` |
| 任务：copyText | `copyText(text, ports: CopyPorts, opts?)`／`CopyTextOptions`／`CopyTextOutcome`／`COPY_CHANNELS`／`COPY_TEXT_DEFAULTS` | 部分（toast 反馈无通道） | `base-paint-contract.md:233-234,257,263-277`；`spec/controls.ts:32-78`（见洞 5） |
| 任务：actionBar | `renderActionBar`／`ActionBarInput`／`ACTION_BAR_DEFAULTS`／`ActionBarButton.actionId` | 部分（点击接线无签名） | `base-paint-contract.md:243,258`；`spec/controls.ts:148-183`（见洞 5） |
| 任务：状态三控件（ok／warn／fail 视觉） | `STATUS_KINDS=['ok','warn','danger','empty']`／`STATUS_DEFAULT_TEXT`／`renderStatusBadge`／`renderEmptyState`／`renderErrorReceipt` | 部分（`fail`→`danger` 无映射交代） | `base-paint-contract.md:224-225,244-249,259-261`；`spec/controls.ts:187-225`（见疑点②） |
| 验收①：无宿主（纯 HTML）可用 | `CONTROLS_HOST_REQUIREMENT='none'`＋`CONTROL_AVAILABILITY`（逐控件 `staticHtml`／`needsRuntime`／`runtimePort`） | 完整 | `base-paint-contract.md:279-290`；`spec/controls.ts:239-261`；`test/contract-signatures.test.mjs:229-240` |
| 验收①：单测覆盖怎么测 | §6.3 逐条测法（纯 HTML 夹具、假 `CopyPorts`、空串短路、`silent` 仍回调、`onOk/onFail` 互斥、非法 status 降级、缺 `dataText` 不渲染按钮） | 完整 | `base-paint-contract.md:500-504` |
| 验收②：与 #90 双通道接口对齐 | AC-16③＋「#76／#77／#90 共用同一签名」 | 完整 | `base-paint-contract.md:291,469`；`CONSTRAINTS.md:113-116` |
| （红线）AC-14 五字符转义／AC-7 无隐式全局 | `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`；端口显式注入、禁 `window.*` | 完整 | `base-paint-contract.md:293-295`；`spec/controls.ts:14-27` |

**#76 小结：控件清单与「无宿主可用」判据完整；缺口集中在「渲染出的 HTML 谁来接线」与「copyText 的 toast 反馈走哪条通道」（洞 5），以及票面 `fail` 与契约 `danger` 的映射（疑点②）。**

---

## #77 base- 复制文本序列化：buildDataText／buildLogText

票面任务：按 B2 不移植旧 snapshot，改用 envelope `shape` 取代；保留复制文本序列化能力。
票面验收：① 给定 envelope 能产出可复制的数据文本与日志文本，单测覆盖；② 与控件层票、复制交互票的接口一致。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：不移植 snapshot，输入对齐 envelope `shape` | `SERIALIZABLE_SHAPES`／`SerializableEnvelope = Envelope<SerializableShape>`／`DataTextInput`／`LogTextInput` | 完整 | `base-paint-contract.md:304-336`；`spec/text.ts:17-21,46-61` |
| 任务：保留 `buildDataText`／`buildLogText` | `(input: DataTextInput) => string`／`(input: LogTextInput) => string`（`pending`） | 完整（签名） | `base-paint-contract.md:320-323`；`spec/text.ts:91-95`；`spec/index.ts:121-124` |
| 验收①：给定 envelope **能产出**文本 | 签名有；「data → 输出头／summary／分节」的投影**无** | 部分（洞 1） | `base-paint-contract.md:335-337`；`packages/base-link-core/src/envelope.ts:13-20`（5 形状无 `summary[]`／`sections[]`） |
| 验收①：6 段日志可产出 | `LOG_SECTIONS`（6）／`LOG_SECTION_TITLES`／`CopyLogFields`（5 字段） | 部分（第①段无数据源，洞 2） | `base-paint-contract.md:337`；`spec/text.ts:24,28-35,38-44` |
| 验收①：`format` 语义补全（旧侧未定义） | §3.4 三行口径表（输出头／空值／转义／分隔）＋`TEXT_JSON_LT_RULE`／`CSV_DIALECT`／`TEXT_EMPTY_PLACEHOLDER` | 部分（口径已定死，但与日志口径冲突＋缺输入投影） | `base-paint-contract.md:339-349`；`spec/text.ts:63-79`（见疑点④、洞 8、洞 9） |
| 验收①：错误行为可断言 | `TEXT_ERROR_CODES=['shape-unsupported','structure-invalid','format-unknown']` | 完整 | `base-paint-contract.md:335,348-349`；`spec/text.ts:81`；`test-d/contract-signatures.ts:197-198` |
| 验收①：敏感行口径 | `TEXT_SENSITIVE_MASK='****'`＋`{text,sensitive:true}` 规则 | 部分（该行类型未进 envelope 形状） | `base-paint-contract.md:347`；`spec/text.ts:66` |
| 验收②：与控件层票、复制交互票一致 | `CopyButtonInput.text/format` 消费序列化结果＋「三票共用签名」 | 完整 | `base-paint-contract.md:291,469`；`spec/controls.ts:158-163` |
| 验收②：单测覆盖怎么测 | §6.4 测法（5 shape × 3 format，含空值／`****`／CSV 引号／JSON `<`／`shape-unsupported`／`structure-invalid`） | 完整 | `base-paint-contract.md:506-510` |

**#77 小结：签名面与 format 口径本身冻结到位（疑点④ 转义／空值部分通过），但「envelope data 怎么变成可复制的文本」这一层完全缺失，是本轮最严重的洞（洞 1、洞 2）。**

---

## #78 base- 图表层与 HELP 壳（含 scene-data 契约）

票面任务：旧 `charts.js` 67.6KB（v1.6 全参数化）与 `help_template.html` 40.9KB 在新架构无对应物；按 B4 去掉图表白名单例外。
票面验收：① 图表接口按 v1.30 签名逐条对照实现；scene-data 契约落地；② HELP 壳能被技能复用（与 HELP 速查台重建票联动）。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：图表组件（8 接口） | `ChartsApi`（8 方法）／`CHART_KINDS`（闭集）／`ChartItem`／`ChartOutput`／8 个 `*ChartInput` | 完整（接口级） | `base-paint-contract.md:358-380`；`spec/charts.ts:8,153-213` |
| 任务：B4 去白名单例外 | §2「不移植（B4）」＋`CHART_STRUCTURE_RULE='throw'`＋§3.5.1 末两行 | 完整 | `base-paint-contract.md:106,401,402`；`spec/charts.ts:218`；`test/contract-signatures.test.mjs:256-259` |
| 验收①：按 v1.30 签名**逐条对照**实现 | §3.5.1 逐条对照表（旧签名＋证据行号 → 新签名 → 判定 → 落点） | 完整（接口级）／部分（选项级语义与 `combo.y2` 缺，洞 10） | `base-paint-contract.md:383-402`；`.scratch/t92/old-v130-signatures.md:162-178` |
| 验收①：scene-data 契约落地 | `SCENE_DATA_SCHEMA`（draft-07 唯一机读权威）／`SCENE_TYPE_FIELD='types'`／`SCENE_STATUS`／`SceneData`／`Scene`／`HELP_SCHEMA_ERROR_CODES` | 完整 | `base-paint-contract.md:404-411`；`spec/help.ts:15-20,36-44,91-101,104-233,254-259`；`test/contract-signatures.test.mjs:261-271` |
| 验收②：HELP 壳能被技能复用 | `renderHelpShell(input: HelpShellInput): FillTemplateOutput`／`HelpShellInput`／`HELP_COPY_TARGETS`／`HELP_SHELL_ID` | 部分（只冻结输入面，产物结构／接线未冻结） | `base-paint-contract.md:413-430`；`spec/help.ts:238-252`（见洞 7） |
| 验收②：与 HELP 速查台重建票（#88）联动 | §3.5.3「四件套即 #88 全部输入面，#88 不需要新增签名」 | 完整（输入面） | `base-paint-contract.md:429,468` |
| （红线）无 `<canvas>`／无内联脚本／无 `node:` | 工程约束行＋§6.5 测法 | 完整 | `base-paint-contract.md:400,402,515-516`；`spec/charts.ts:4-5` |
| （机制）空态联动／双端自适应／坐标唯一性 | `CHART_EMPTY_RULE`／`CHART_BREAKPOINTS`／`CHART_COORD_RULE`／`CHART_PALETTE` | 完整 | `base-paint-contract.md:396-399`；`spec/charts.ts:221-245` |

**#78 小结：接口级逐条对照成立（疑点③ 通过），scene-data 唯一权威落地；缺口在「选项级语义」与「HELP 壳产物结构／交互接线」（洞 7、洞 10、洞 11）。**

---

## #90 复制交互走 Base P0 双通道（`blocked_by [76,77]`）

票面任务：按 Q13 走 Base P0 双通道（`copyText` ＋ toast 反馈），不沿用 F3 的 `execCommand` 单通道。
票面验收：① 双通道可用（含降级路径），单测覆盖；② 与 base- 控件层票接口一致。

| 票面要求 | 契约对应签名 | 判定 | 证据 |
|---|---|---|---|
| 任务：双通道 `copyText`（clipboard 优先，fallback 兜底） | `copyText(text, ports, opts?)`／`CopyPorts{clipboard:ClipboardChannel\|null, fallback}`／`COPY_CHANNELS` | 完整（签名＋优先级语义） | `base-paint-contract.md:263-277`；`spec/controls.ts:32-45,69` |
| 任务：**toast 反馈** | `COPY_TEXT_DEFAULTS{okMessage,okDetail,failMessage,failDetail,failBadgeAlwaysOn}`＋`createToastController` | 部分（文案已冻结，通道缺失） | `base-paint-contract.md:277,284`；`spec/controls.ts:71-78,136-144`（见洞 5） |
| 任务：不沿用 `execCommand` 单通道 | 「不得只留 `execCommand`」＋通道 2 只在通道 1 不可用/失败时执行 | 完整 | `base-paint-contract.md:274` |
| 验收①：双通道可用（含降级路径） | 失败返回 `{ok:false, channel:null, reason}`（不抛错）；`ports` 缺失／`fallback` 非函数 → `ControlsError bad-input` | 完整 | `base-paint-contract.md:257`；`spec/controls.ts:61-66,227` |
| 验收①：单测覆盖怎么测 | §6.3 测法（clipboard 抛错＋fallback 返回 true → `channel==='fallback'`；空串短路；`silent` 仍回调；`onOk/onFail` 互斥） | 完整 | `base-paint-contract.md:504` |
| 验收②：与控件层票接口一致 | AC-16③「#76／#77／#90 共用同一签名」＋§4.4 #90 行 | 完整 | `base-paint-contract.md:291,469`；`CONSTRAINTS.md:104-116` |
| （依赖）消费 `renderActionBar`＋序列化结果 | `ActionBarInput.copyData/copyLog`＋`CopyButtonInput.text`（渲染期入 `data-t`） | 部分（`data-t` 的读取者无签名） | `base-paint-contract.md:258,469`；`spec/controls.ts:158-163`（见洞 5） |

**#90 小结：双通道签名与失败语义完整，但「copyText ＋ toast 反馈」这条票面任务在契约里没有通道（`CopyPorts` 不含 `ToastHostPort`），也没有任何 `actionId`／`data-t` 分发签名 → #90 无法仅凭契约接线（洞 5）。**

---

## 仍需猜的洞（按严重度排序，前 10 条）

1. `[#77]` 缺口：**给 envelope 的 5 个 shape 各写「data → 复制文本」的投影**（输出头／summary 行／分节行从哪个字段来）→ 契约缺：§3.4 只写「展示结构由各 shape 的 `data` 投影而来」（`docs/base-paint-contract.md:336`），而 `EnvelopeDataByShape` 五形状是 `list{items,total}`／`detail{item}`／`stat{metrics}`／`receipt{ok,message}`／`analysis{summary:string}`（`packages/base-link-core/src/envelope.ts:13-20`），**没有一个含 `summary[]`／`sections[{heading,rows}]`**；偏偏 `base-paint-contract.md:348` 的 `structure-invalid` 判据又要求「分节缺 `heading` 或 `rows`」——指向已被 B2 删除的旧 snapshot 结构 → 建议补：§3.4 增「逐 shape 投影表」，或新增 `SerializableDataByShape` 类型把投影字段冻结，并把 `:348` 的判据改写成对应新结构。
2. `[#77]` 缺口：**6 段日志的第①段「场景标识」取值**→ 契约缺：`LOG_SECTIONS` 6 项（`spec/text.ts:24`）对 `CopyLogFields` 只有 5 个字段（`spec/text.ts:38-44`，`thinking/dataStructure/callChain/timestamp/exception`），`scene` 无来源；`timestampVersion` 靠 `timestamp` 顶替也未写明 → 建议补：`CopyLogFields` 增 `scene?: string`，或写死「`scene` 段取自 `envelope.skill`＋`envelope.key`」并给出渲染文案。
3. `[#74]` 缺口：**定死 `<!--INJECT-DATA-->` 的替换语义**（只替换标记文本，还是生成 `<script id=… type=…>` 包裹）→ 契约缺：§3.1 只写「JSON 序列化后写入 `<script id="payload" type="application/json">`」（`base-paint-contract.md:156`），同时又冻结 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`／`FillTemplateInput.dataScriptId?`（`spec/template.ts:54-55,95`）却不说明其作用；旧 `injector.py:119-120` 是**只替换标记文本**，现有 6 个模板正是该形态（`packages/skill-memo-ilife/templates/{wish_plan:95,wish_complete:92,sync_report:324,memo_query:64,init_report:107,change_category:110}.html`），若新实现生成包裹就会双包 → 建议补：明写「仅替换为 JSON 文本，不生成/不校验容器标签；`dataScriptId` 只用于 report 与冲突告警」。
4. `[#74]` 缺口：**`TemplateAssets.sharedHelpersJs` 的产出方**→ 契约缺：该字段必填（`spec/template.ts:83`）且空串 → `asset-missing`（`base-paint-contract.md:145`），但 §3.2 只冻结 `buildStyleSheet`→css，AC-7 禁全局、B7 把交互控件搬走，共享 JS 的内容与产出签名全无 → 建议补：冻结 `buildSharedHelpers(): { js: string }`（或允许空串并在无控件模板豁免），并写明运行时如何被序列化为字符串。
5. `[#76/#90]` 缺口：**`copyText` 的 toast 反馈通道与 HTML 接线**→ 契约缺：`CopyPorts` 只有 `clipboard`／`fallback`（`spec/controls.ts:41-45`），`CopyTextOutcome` 只有 `{ok,channel,reason}`（`:61-66`），而 `COPY_TEXT_DEFAULTS.failBadgeAlwaysOn`（`:73`）与「失败徽章恒在」（`base-paint-contract.md:277`）要求 copyText 自己出徽章；可用性表给 `actionBar`／`errorReceipt` 标 `CopyPorts+ToastHostPort`（`:285,288`）但两者的签名只有静态 HTML 函数；`ActionBarButton.actionId`（`spec/controls.ts:155`）与 `data-t`（`base-paint-contract.md:258`）无读取者 → 建议补：`CopyPorts` 增 `toast?: ToastHostPort`，或新增冻结的 `bindCopyAction(el, ports, opts)`（含 `data-t` 读取＋`actionId` 分发），#76／#77／#90 共用。
6. `[#75]` 缺口：**冻结控件视觉规格**（否则无法满足票面验收②「视觉与 B1 标杆一致」）→ 契约缺：§3.2 只给 11 个 token 逐值（`base-paint-contract.md:179-195`）、8 个命名空间（`:171,201`）与 `TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS` 的数字；`copyButton`／`statusBadge`／`emptyState`／`errorReceipt`／`charts`／`helpShell` 的尺寸/色值/圆角/断点全部空白，也未引旧 `base.css` 关键值 → 建议补：§3.2 增「控件视觉规格表」（逐区：类名＋关键尺寸/色值＋旧 `base.css` 行号），或明确「样式自定，视觉验收只以 #96 快照门为准」。
7. `[#78]` 缺口：**HELP 壳的产物结构与交互接线**（Tab／折叠／Sheet／Prompt 实时预览／一键复制）→ 契约缺：§3.5.3 只冻结输入面四件套（`base-paint-contract.md:429`）与形态散文（`:425-426`），DOM 结构、类名、`actionId`／`data-t` 命名、谁读 `HELP_COPY_TARGETS` 均未定 → 建议补：「HELP 壳结构契约」（区块顺序＋每区块类名＋三个复制目标的 `actionId` 命名），并复用第 5 条的 binder。
8. `[#77]` 缺口：**`format` × 日志空值口径统一**→ 契约缺：`:337` 说缺省字段显示 `LOG_UNKNOWN_PLACEHOLDER`（`(未知)`），`:344` 又说 json 空值保留 `null`、`:345` csv 空值写空字符串，三者是否都适用于 `buildLogText` 未定 → 建议补：写明「`(未知)` 只作用于 text 口径；json 保留 `null`；csv 空串」，并各写一条验收断言。
9. `[#77]` 缺口：**csv 的 `section` 列语义**（`CSV_DIALECT.header=['section','row']` 只有两列）→ 契约缺：`:343-345` 未写输出头／时间行／summary 行在 csv 里怎么落列（summary 行没有 section 名），也未写敏感行 `****` 落在 section 还是 row → 建议补：「csv 行序＝分节序；summary 行 `section='summary'`；时间行 `section='time'`；敏感行整体写 `****`」等逐条口径。
10. `[#78]` 缺口：**选项级语义与 `combo.y2`**→ 契约缺：§3.5.1（`base-paint-contract.md:383-402`）逐条对照只到接口级＋少量数字；`yTicks` 收敛 2-6、`stacked` 默认 `percent` 且与 `grouped` 互斥（stacked 优先）、`fillBetween.a/b` 是 series 索引、`band` 等长否则报错、`markPoint` 缺省最大点、`ownScale` 不参与共享域、`regressionColor` 缺省 `#ff3b30`、`dotSize` 9px 等只存在于旧清单（`.scratch/t92/old-v130-signatures.md:166-178`）；旧 `combo.y2`（同文件 `:176`）在新 `ComboChartOptions`（`spec/charts.ts:132-136`）中无对应 → 建议补：§3.5.1 增「选项级语义来源行号」列，并显式写明 `y2` 是移植还是「不移植」。

**附带缺陷（不阻塞开工，未计入上表 10 条）**

11. `[#78]` `progress`／`gauge` 入参是 `pct` 而非 `items`（`spec/charts.ts:169-172,185-188`），但 `ChartOutput.points`（`base-paint-contract.md:373`）与 `empty`（`:397` 只定义 `points===0`）在 `pct=0` 时的取值未定 → 建议写明「pct 型接口 `points` 恒为 1，`pct=0` 时 `empty=false`」或反之。
12. `[#74]` `TEMPLATE_ERROR_CODES` 含 `data-missing`（`spec/template.ts:67`），但 §3.1 的失败行为表（`base-paint-contract.md:144-148,154-158`）只覆盖 `marker-*`／`asset-missing`／`strict-invalid` → 建议写明「`data === undefined`／不可 JSON 序列化 → `data-missing`」。
13. `[#74/#79]` `escapeHtml` 五字符归一的 owner 双标：§3.3 与 AC-14 都写「执行归 #74／#79」（`base-paint-contract.md:293`），但 #74 票面任务与 §6.1「用」清单都没提这件事 → 建议在 §6.1 写死「#74 负责把既有 `escapeHtml` 从 4 字符改到 5 字符并翻转 §7 哨兵」或改为 #79 单 owner。
14. `[#74]` 票面用「统一注入器 API」，契约 AC-1 强制 `fillTemplate` 并禁 `inject*`（`base-paint-contract.md:62-71`）→ 建议 §1 增一句「票面 #74 所称『注入器』＝本契约 `fillTemplate`，非 `src/injector.ts`」，避免执行者按票面字面搜 `inject` 与禁令冲突。
15. `[#92 口径]` 「`SPEC_FROZEN_SURFACE`＝唯一清单」覆盖面不实：`spec/*.ts` 共 169 处 `^export`（7 文件），清单仅 101 条（其中 type 34 条），被签名引用却未入清单的类型（如 `ClipboardChannel`／`CopyButtonInput`／`ToastAction`／8 个 `*ChartInput`／`SceneGroup`）无锁形断言 → 建议 §0.2 改为「清单锁 101 条主签名，其余类型以 `spec/*.ts` 为准、被引用形状不得改动」，或补全清单。

---

## 越权与重复定义

**1. 行为实现越权：无。** `spec/*.ts` 逐文件核实为 type-only ＋ `Object.freeze` 纯数据，无函数体、无副作用、无第三方 import、无 `node:`（`test/contract-signatures.test.mjs:300-309` 亦逐文件扫描）。`SCENE_DATA_SCHEMA`（`spec/help.ts:104-233`）与 `CONTROL_AVAILABILITY`（`spec/controls.ts:254-261`）是**契约数据**，由 AC-4／AC-16 明令冻结，不属实现。
**2. #104（12 区块组件）越权：无。** 全文仅在 `base-paint-contract.md:466` 声明「接口 owner 是 #104，本契约不定义任何区块组件接口」；无任何区块组件类型或签名（`区块` 仅出现在空态/回执散文 `:260,288`）。
**3. #95／#96／#80／#88／#79 边界：已写清，无越权。** `base-paint-contract.md:460-469`（交接表）、`:479-482`（版本机制只写机制、不升版，归 #79）、`:467`（不碰 `base-combos/HELP.md`）。
**4. 重复定义（均已显式声明，可接受）：** ① `STRICT_ENVELOPE_SHAPES`（`spec/template.ts:60`）与 link-core `ENVELOPE_SHAPES`（`packages/base-link-core/src/envelope.ts:10`）双写——AC-13 零依赖要求下的必要副本，由 `test/contract-signatures.test.mjs:242-248` 用 `deepEqual` 钉死；② `ESCAPE_HTML_*`（`spec/controls.ts:14-24`）与既有 `escapeHtml`（`src/contract.ts`）第二套口径——`base-paint-contract.md:293` 已声明为待归一的漂移哨兵；③ `TEMPLATE_MARKERS` 与技能侧 5 份副本——`:162` 声明删除；④ `CSS_VAR_TOKENS`（11 CSS 变量）与 `STYLE_TOKENS`（9 个 JS token）——`:199` 显式声明「不同物，不得互相覆盖」；⑤ §3.5.2 散文与 `SCENE_DATA_SCHEMA`——`:407` 声明散文是机读 schema 的投影，无第二真相。
**5. 需架构师追认的一处基准偏离（非越权，但与本票唯一约束基准字面冲突）：** `CONSTRAINTS.md:59`（D2）写 `packages/base-render/src/contracts/*.ts`，契约改取 `src/spec/*` 并单列 §0.3 声明理由（`base-paint-contract.md:48-50`）；实测 `src/contracts/` 不存在、无转发别名。方向与 `PHASE2-AUTHOR.md`／本次 V1 brief 一致，但按 `CONSTRAINTS.md:3`「与本文件冲突的方案一律退回」，应由总架构师在 #92 结论里追认该路径变更。

---

## 五个疑点的结论

**① `INJECTION_ORDER` 与旧注入顺序：通过。**
`spec/index.ts:44` / `spec/template.ts:49` ＝ `['sharedHelpers','sharedCss','chartsHelpers','injectData']`。旧实现在 `injector.py` 顺序为 `SHARED_HELPERS` → `SHARED_CSS` → `CHARTS_HELPERS` → `INJECT_DATA`（`injector.py:107-120`，顺序注释 `:102`），`NO-SHARED` 只是先移除标记、不是注入步（`injector.py:104-106`）；旧契约同序（`docs/research/t92-old-v130-signatures.md:250`＝`contract:363`）。契约 `base-paint-contract.md:150` 的「`NO-SHARED` 不是注入步」与旧实现一致。唯一瑕疵：`:150` 引「`injector.py:104`」作证据，而 `:104` 是 `NO-SHARED` 分支、顺序代码在 `:107-120`（引用行号偏差，不影响结论）。

**② `STATUS_KINDS` 与票面「ok／warn／fail 视觉」：部分通过（必须补一句映射）。**
语义覆盖成立：`STATUS_KINDS=['ok','warn','danger','empty']`（`spec/controls.ts:187`）＋`STATUS_DEFAULT_TEXT.danger='失败'`（`:191-196`），与旧签名 §6.3 `statusBadge(status, text?)` 的 `'ok'|'warn'|'danger'|'empty'` 逐字一致（`docs/research/t92-old-v130-signatures.md:125`；`base-paint-contract.md:93`），即票面所说 `fail` 视觉＝`danger`（红／文案「失败」）。但**契约全文没有一处交代 `fail`→`danger` 的改名**（`fail` 只出现在 copyText 的 `failMessage`／`failBadgeAlwaysOn`／`onFail`，`spec/controls.ts:73-78,58`），也没写「票面『状态三控件』＝`statusBadge`／`emptyState`／`errorReceipt`」。#76 照契约实现**不会做错**（§6.3 明令只用 `STATUS_*`、不许自造，`base-paint-contract.md:502-503`），但若按票面字面验收会误判「缺 `fail` 状态」。建议在 §3.3 加一行：「票面 `fail` 视觉 = 契约 `danger`（默认文案『失败』）；`empty` 为额外空态，不影响票面三态」。

**③ #78「按 v1.30 签名逐条对照」：通过（接口级）。**
§3.5.1（`base-paint-contract.md:383-402`）给出 17 行逐条对照：8 个接口各一行，含旧签名逐字＋旧清单证据行号（`contract:202-241`）、新签名逐字、判定、落点／说明，另覆盖复合形态、双端自适应、空态联动、结构校验、坐标唯一性、自包含、白名单例外、工程约束；`ChartsApi` 8 方法与之一一对应（`spec/charts.ts:204-213`）。不是「只给新签名」。附注两条：判定列全为「无 → 冻结」（与 §2 `:96` 一致，合法）；选项级语义未进契约、旧 `combo.y2` 在新签名中缺失（见洞 10）。

**④ #77 `format` 的转义与空值口径：部分通过（口径已定死，但整链不可执行）。**
口径确实定死：`base-paint-contract.md:341-345` 三行表给出 text／json／csv 的输出头／空值／转义／分隔；常量侧 `TEXT_EMPTY_PLACEHOLDER='未填写'`（`spec/text.ts:65`）、`TEXT_JSON_LT_RULE='u003c'`（`:71`）、`CSV_DIALECT{delimiter:',',quote:'"',quoteEscape:'""',lineEnding:'LF',header:['section','row']}`（`:73-79`）、`TEXT_JSON_INDENT=2`（`:69`）、`LOG_UNKNOWN_PLACEHOLDER='(未知)'`（`:63`）。csv 引号转义（RFC4180 `""`）与 json 的 `<`→`\u003c` 规则**可执行**。不通过的部分：① 输入侧没有投影，不知道「要转义的行」从 envelope 哪个字段来（洞 1）；② 同一空值在 text／json／csv 三口径与日志 `(未知)` 之间冲突（洞 8）；③ csv 两列语义（时间行／summary 行／敏感行）未定（洞 9）。故「转义/空值口径」通过，「`buildDataText`／`buildLogText` 仅凭契约可写」不通过。

**⑤ #75「共享 CSS 资产随 base-paint 发布（`files` 实证）」：通过。**
`base-paint-contract.md:203-207` 明写：资产形态＝运行时字符串（`buildStyleSheet().css`）随 `dist/index.js` 发布；`base-render/package.json` 的 `files:["dist"]` **已覆盖**，本契约不要求改 `files`（实测 `files=["dist"]`）；`style/tokens.css`（3 行、不在 `files`）不是契约资产、去留归 #75；子路径导出（`exports["./style.css"]`）不在冻结范围、交接 #95／#79。§6.2 给出验收测法（`pnpm publish:plan` tarball 含契约资产，`base-paint-contract.md:498`），并有运行时断言（`test/contract-signatures.test.mjs:284-288`）。附注：契约把「发布什么」定成字符串而非独立 `.css` 文件，与票面「共享 CSS 资产随包发布（`files` 实证）」的措辞（暗示文件）不同，属已声明的裁定且 `files:["dist"]` 确实覆盖，不阻塞。

---

V1 结论：不通过（必须修的前 3 条：① [#77] envelope 五形状 → 复制文本的**投影**缺失，且 `structure-invalid` 判据仍指向已删除的旧 snapshot 结构（洞 1、洞 2）；② [#74] `<!--INJECT-DATA-->` 的**替换语义**（替换标记 vs 生成 `<script>` 容器）与 `sharedHelpersJs` 的**产出签名**缺失，calorie 6 模板又无该标记（洞 3、洞 4）；③ [#76/#90] `copyText` 的 **toast 反馈通道**与 `actionId`／`data-t` **接线签名**缺失，`CopyPorts` 不含 `ToastHostPort`（洞 5））
