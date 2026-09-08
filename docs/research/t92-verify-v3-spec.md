# V3 规格一致性（#92 契约冻结 · 对抗式独立结论）

基准：`docs/calorie-architecture.md`（Implementation Decisions ＋ Testing Decisions ＋ Out of Scope ＋ Further Notes）＋ `.scratch/t92/CONSTRAINTS.md` ＋ `.scratch/t92/ARCHITECT-CALLS.md`。
被验对象：`docs/base-paint-contract.md`、`packages/base-render/src/spec/*.ts`、`packages/base-render/test-d/contract-signatures.ts`、`packages/base-render/test/contract-signatures.test.mjs`、`.changeset/base-paint-contract-freeze.md`。
方法与独立性：只按上位规格逐条对，不参考 V1／V2 结论，不改任何被验文件。

**计数口径更正**：PHASE3-VERIFY 记「Implementation Decisions 22 条」，实测 **21 条**（`docs/calorie-architecture.md:51-71`，逐条 enumerate 得 21）；Testing Decisions 顶层 6 条（`:75,76,79,80,81,82`），其中「接缝」含 2 个子接缝（`:77` CLI 进程边界、`:78` base-paint 模块边界），合 **8 个可核对项**——下表按 8 项列。

---

## 规格逐条对照

### A. Implementation Decisions（21 条）

| 规格条目（`calorie-architecture.md` 行） | 契约落点 | 判定 |
|---|---|---|
| 1 单一真相（`:51`） | §3.5.2 `:406-407`（唯一机读 schema／文档只是投影）＋ §0.3 `:50`（不留第二落点） | 一致 |
| 2 唯一出口（`:52`） | §4.2 `:446`（「CLI 唯一出口（argv + JSON + exit）」留技能包） | 一致 |
| 3 envelope 形状 `shape ∈ stat/list/detail/analysis/receipt`（`:53`，**5 个**） | §3.1 `:129`（`STRICT_ENVELOPE_SHAPES` **6 个**）＋ §3.4 `:335`（「六形状去掉 fallback」） | **矛盾** |
| 4 交付信号：扩 envelope 加 `delivery{mode,path?,template?,bytes?}`（`:54`） | 契约全文 **0 命中** `delivery`；§2 `:83` 反而把 `Envelope` 冻结为五字段 | **缺失** |
| 5 三态交付（文件态／内联态／文本态，`:55`） | 仅 §3.1 `:133` `FillTemplateReport.bytes`、`:134` `html` 是产物面；无 `mode` 语义 | **缺失** |
| 6 回传态（第 4 态，`:56`） | §3.3 `:257`、`:263-277`（`copyText` 双通道）＋ §3.4 `:329-333`（序列化）＋ §3.5.3 `:427` | 一致 |
| 7 三层路由（`:57`） | §4.2 `:446`（键表／唤醒词／CLI 留技能包）＋ §3.5.3 `:430` | 一致（划界） |
| 8 HTML-First 铁则（`:58`） | §3.3 `:261`（错误回执）＋ §3.1 `:144-148`（缺失阻断不返空） | 一致（呈现面） |
| 9 唤醒词可达性 436 条（`:59`） | §4.2 `:446`（436 条 SoT 留技能包） | 一致（划界） |
| 10 技能侧分层管线（`:60`） | 契约不涉及（技能侧），无冲突条款 | 一致（划界） |
| 11 共享层归属三类（`:61`） | §4.1 `:436-442`（进／不进／判定法） | 一致 |
| 12 base-paint 零运行时依赖（`:62`） | §3 开头 `:116`＋§4.3 `:451`＋§6.5 `:400`；`test/contract-signatures.test.mjs:284-287` | 一致 |
| 13 占位符注入走同一填充器（`:63`） | §3.1 `:140-162`（五标记＋数量规则＋B3 强约束） | 一致 |
| 14 主题接缝：设计变量分层，单技能主题变更不静默重刷其他技能（`:64`） | 契约只在 §0 依据表 `:13` 提到「主题接缝」；§3.2 `:197-198` 只锁主色与 Q14 禁入，`StyleSheetInput{prefix?,extraCss?}`（`spec/style.ts:48-53`）间接可用，无接缝条文 | **缺失** |
| 15 区块组件约 12 个（`:65`） | §4.4 `:466`（owner #104，本契约不定义区块接口） | 一致（守界；粒度重叠见「相邻票边界」#104） |
| 16 键表冻结（`:66`） | §4.2 `:446`（77 键留技能包）＋ §5 `:480`（签名变更＝破坏性变更） | 一致（划界） |
| 17 数据库访问（`:67`） | 不在 base-paint 范围，无冲突条款 | 一致（划界） |
| 18 只读路径（`:68`） | 不在 base-paint 范围，无冲突条款 | 一致（划界） |
| 19 写库回执契约（`:69`） | §2 `:83`（envelope `receipt` shape）＋ §3.3 `:261`（`errorReceipt`） | 一致（划界；回执本体属技能 CLI） |
| 20 打包与装载（`:70`） | §3.2 `:203-207`（资产随 `dist` 发布／`files` 口径）＋ §4.4 `:464`（#95） | 一致（划界；仅样式资产面） |
| 21 输出命名（中文命令＋时间戳＋冲突后缀，`:71`） | 契约 0 命中；§4.4 `:464-469` 交接表未登记 #87 | **缺失** |

### B. Testing Decisions（8 项；`:77/:78` 是「接缝」的两个子项）

| 规格条目 | 契约落点 | 判定 |
|---|---|---|
| 1 只测外部行为（`:75`） | §7 `:526-533` 锁「出口面／清单／文档投影」，不测内部实现 | 一致 |
| 2 主接缝＝CLI 进程边界（`:77`，含「交付信号字段」断言） | 契约不覆盖（签名测试不 spawn CLI）；与 ID-4 同源缺失 | 缺失（继承 ID-4） |
| 3 接缝＝共享层模块边界 base-paint（`:78`） | §7 `:529` ＋ `test-d/contract-signatures.ts` ＋ `test/contract-signatures.test.mjs`（零技能依赖，只读 dist／文档／清单） | 一致 |
| 4 不单列为接缝（渲染纯函数／插件桥，`:79`） | 契约未把它们列为接缝 | 一致 |
| 5 先例（沿用既有测试形态，`:80`） | §7 `:529`（node:test ＋ 出口面锁，接 `pnpm test`） | 一致 |
| 6 门禁：占位符零残留／id 唯一／复制实现单一来源／门面示例可执行／计数断言 77／per-skill 快照回归门（`:81`） | 占位符零残留 §6.1 `:492`；id 唯一 §3.5.2 `:410`（`duplicate-id`）；复制单实现 §3.3 `:263-277`；回归门 §4.4 `:465`。缺「门面文档示例可执行」「计数断言 77」的归属登记 | 缺失（4/6 覆盖） |
| 7 证据分级（合成库／真实数据，`:82`） | 不在 base-paint 范围，无冲突条款 | 一致（划界） |
| 8（同上「接缝」子项合并计） | — | — |

**统计：矛盾 1 条（ID-3）、缺失 4 条（ID-4、ID-5、ID-14、ID-21）＋ TD 门禁部分覆盖 1 条；其余 23 项一致。**

---

## 五个疑点的结论

### ① `STRICT_ENVELOPE_SHAPES` 含 `'fallback'`（6 个）——**不通过**

- 契约 `docs/base-paint-contract.md:129` ＝ `readonly ['list','detail','stat','receipt','analysis','fallback']`；类型 `packages/base-render/src/spec/index.ts:48`；`spec/template.ts:60`。
- `'fallback'` **不是越界新增，是既有事实**：`packages/base-link-core/src/envelope.ts:9-11` 定义 `ENVELOPE_SHAPES = ['list','detail','stat','receipt','analysis','fallback']`（6 个，`fallback` 注释为「降级载荷」），`EnvelopeShape` 直接由它推导。
- 冲突对象是**规格文本**：`docs/calorie-architecture.md:53` 写 `shape ∈ stat/list/detail/analysis/receipt`（5 个）；`ARCHITECT-CALLS.md:35`（AC-5）也照抄了这 5 个。契约全文没有一句交代这个差异（grep `fallback` 仅 `:218,:230,:257,:266,:269,:335,:510`，均无「与架构规格 5 形状不一致」的裁定）。
- 结论：契约选的是**代码事实**（且 `test-d/contract-signatures.ts:123` 把 `STRICT_ENVELOPE_SHAPES[number]` 钉死等于 `EnvelopeShape`，`test/contract-signatures.test.mjs:243` 再钉一次），方向正确；但**未落裁定、未追溯**，会让 #74（按契约校验 6 个）与按规格实现者（校验 5 个）分叉。AC-3 对 `types`／`type` 分歧就是写了裁定＋出处的（契约 `:406`），此处应同规格处理。

### ② `SERIALIZABLE_SHAPES` 5 个 vs ①的 6 个——**通过**

- `spec/index.ts:106` / `spec/text.ts:17` ＝ `['stat','list','detail','analysis','receipt']`（5 个）；契约 `:305` 同值。
- 差异**有交代**：契约 `:335`「`shape ∈ SERIALIZABLE_SHAPES`（六形状去掉 `fallback`）。`shape:'fallback'` → 抛 `TextError` code `shape-unsupported`（降级载荷不进复制文本）」；`spec/text.ts:16` 注释同义；`test/contract-signatures.test.mjs:247` 断言「唯一排除项必须是 `fallback`」。
- 唯一小瑕（不阻断）：`SERIALIZABLE_SHAPES` 的顺序与 `ENVELOPE_SHAPES` 不同（`stat,list,detail,analysis,receipt` vs `list,detail,stat,receipt,analysis`），契约未定义该顺序的语义（是否影响 CSV 行序／遍历序）。建议一句「顺序无语义，仅成员集有效」。

### ③ `HELP_COPY_TARGETS = ['prompt','wakeWord','params']` 与「复制指令」术语——**不通过（轻）**

- 机读签名：`spec/index.ts:139`、`spec/help.ts:238`、契约 `:370`、`test-d/contract-signatures.ts:217`。
- 事实核查：旧侧 v1.27／v1.28 已把「复制 prompt」统一为「复制指令」（`.scratch/t92/old-v130-signatures.md:454`，并明确「抽取时不要从 reviews／.scratch 采词」）；同文件 `:355` 把 `prompt_template` 释义为「**复制指令** 全文」。
- 契约的**对外文案没有**把旧词固化：`COPY_TEXT_DEFAULTS`（`spec/controls.ts:71-78`：`已复制`／`粘贴给 AI`／`复制失败`／`长按选择文本手动复制`）、`ACTION_BAR_DEFAULTS`（`:171-180`：`复制数据`／`复制日志`）都是中性新文案；§2 `:100` 的能力名也已用「HELP 速查台一键复制**指令**」。
- 但两处仍留旧词：**(a)** `HELP_COPY_TARGETS` 成员 `'prompt'` 是动作 id，契约 `:427` 只列 id、**没有 id→用户文案的映射**（对比 `ACTION_BAR_DEFAULTS.copyDataLabel` 是有文案的）；**(b)** §3.5.3 `:425`「Sheet 弹层（`editable_fields` + **Prompt** 实时预览）」——这是**新壳的 UI 描述**，属术语回退。
- 另需登记：`CONTEXT.md`（共 30 行，只有设置面／干活面术语）**没有**「复制指令」词条，即术语基线未覆盖该词——契约不能默认「按 CONTEXT.md 即无歧义」。
- 结论：对外文案基本合规，但机读 id 缺文案映射 ＋ §3.5.3 用旧词，判定不通过（文档级修，不动冻结面）。

### ④ 交付三态与 `delivery{mode,path?,template?,bytes?}`——**不通过（缺失）**

- 契约 grep `delivery`／`文件态`／`内联态`／`文本态`／`回传态`／`mode` ＝ **0 命中**。
- 反向矛盾：契约 §2 `:83` 把 envelope 冻结为 `Envelope = { version; skill; shape; key; data }`（与 `base-link-core/src/envelope.ts:22-29` 一致），`spec/text.ts:21` `SerializableEnvelope = Envelope<SerializableShape>` 同样五字段；而规格 `:54` 已拍方案 A「扩 envelope 增加 `delivery{...}`」——契约既没留扩展位，也没交接。
- 落点评估：`FillTemplateReport.bytes`（`:52/:133`）与 `FillTemplateOutput.html`（`:53/:134`）只能算「产物面」，不能替代 `delivery.mode` 的三态语义。
- **归属票：`#83`《HTML-First 工作流与渲染失败回执落地》**——其票面正文已含「三态交付契约（2026-09-08 拍定）」「交付信号（已拍：方案 A）：扩 envelope，增加 `delivery` 字段——`{mode:"file"|"inline"|"text", path?, template?, bytes?}`」，验收写明「envelope 的 `delivery` 字段有断言」。#92 只需在 §4.4 交接表补 #83 一行，并注明「`delivery` 由 #83 追加，本契约不冻结其内部结构、也不得排除」。
- 结论：#92 未越界（delivery 不是它的交付物），但**留白**——契约缺交接登记，且五字段冻结方式与 #83 的既定扩展有文本冲突。

### ⑤ `SCENE_DATA_SCHEMA` 唯一机读权威（AC-4）与第二真相——**不通过（部分）**

- 唯一权威已冻结：`spec/help.ts:104-233`（`$schema` draft-07、`$id: 'ilife://base-paint/scene-data.schema.json'`，`help.ts:106`）；契约 `:407`「**本文只是它的可读投影**；两者不一致视为契约缺陷」；`:515`「不许自造…第二份 scene-data schema（AC-4）」；`test/contract-signatures.test.mjs:261-271` 断言 schema 结构（含 `types`、无 `type`、补齐 `init_banner`／`contact`／`version`／`recommendations`）。
- 缺口：契约**没有**任何关于「随包发布 `.json` 产物」的条款——既没写「禁止另出 `scene-data.schema.json`」，也没写「若发布，必须由 `SCENE_DATA_SCHEMA` 序列化生成，并由签名测试逐值断言」。
- 风险具体：`$id`（`help.ts:106`）本身就是一个 `.json` 文件名，`#78` 完全可能照 `$id` 随包发一份 `scene-data.schema.json` 给技能侧校验用；那一刻就出现「TS 常量 vs 包内 `.json`」两份可独立漂移的权威。对比 §3.2 `:203-207` 对样式资产明确写了「随包发布路径与 `files` 口径」，此处应同规格补一句。
- 结论：禁止「第二份 schema」有（`:515`），但**未要求由该常量生成**，判定不通过（补一句即可）。

---

## 相邻票边界

- **#104（12 区块组件，接口 owner）**：契约 `:466` 明写「不定义任何区块组件接口」——**不越界**。但留白一处：#104 票面 12 区块含「空态／复制」，与 §3.3 已冻结的 `emptyState`／`actionBar`／`copyText`（`spec/controls.ts:239`、`CONTROL_STYLE_SECTIONS` `:171`）粒度重叠，契约未裁决「控件（原子，本契约冻结）vs 区块（组合，#104 owner）」的分层关系。
- **#79（组件契约重写＋三包统一版本）**：§5 `:479-482` 只写机制与现状、changeset 只声明 `'base-paint': minor`（`.changeset/base-paint-contract-freeze.md:2,9`）、`fixed` 组归 #79——**不越界**。但 §2 `:79-108` 的 26 行「旧签名×新判定」表与 #79 验收「v1.30 控件签名 × 实现实况的逐条对照表」口径重叠，契约未声明「本表是签名冻结口径，79b 的对照表以实现实况为准」。
- **#80（base-combos/HELP.md 生成缺陷）**：契约 `:467` 明写「`:66-71` 六行属 #80，本票不碰」——**不越界**，边界清晰。
- **#95（发布白名单／files／loader）**：§3.2 `:203-207`（资产随 `dist`、`files` 不改）＋ §4.4 `:464`（白名单／子路径导出交接）——**不越界**，交接完整。
- **#96（回归门）**：§3 `:116`（L15／L23 红线）＋ §4.3 `:458`＋ §4.4 `:465`——**不越界**，且把「契约变更必须过 per-skill 快照门」写成红线。
- **#88（HELP 速查台重建）**：§3.5.3 `:429` 声明四件套即 #88 全部输入面、无需新增签名；§4.4 `:468` 登记——**不越界**。留白：§4.4 未登记 #106／#107（见下）。
- **#107（6 死模板并入 HELP）**：契约 0 命中「死模板」／#107，§3.5 也未说明「6 个未引用模板」的归属（属技能侧数据 → 壳只提供渲染面）——**留白**（§4.4 应补一行）。
- **#90（复制走 Base P0 双通道）**：§3.3 `:263-277` ＋ `:291`（#76／#77／#90 共用同一签名）＋ §4.4 `:469`——**不越界**，边界最清晰的一张。
- **#106（F1／F2 独有能力回补）**：§3.5.3 `:426` 把「回补 F1／F2 逐场景 CLI 展示与变体示例」写成 HELP 壳形态要求，但执行 owner 是 #106（其票面自述「#88 拆分之一」）——**不越界但 §4.4 未登记 #106**，且壳侧无承载「CLI 展示」的显式字段（只有 `Scene.id` 推导约定）。

---

## B6／Q11／Q13 落地

- **B6（HELP＝HTML 速查台）**：**落地**。§3.5.3 `:425` 逐层给全——标题区（`skill_name`／`title`／`subtitle`／`init_banner`）＋分组 Tab（`groups`）＋二级折叠（`subgroups`）＋场景卡（`scenes`）＋Sheet 弹层（`editable_fields`）＋关于 Tab（`contact`／`version`／`recommendations`）；类型侧 `spec/help.ts:91-101`（`SceneData`）、`:36-57`（`Scene`／`SceneSubgroup`／`SceneGroup`）、`:242-249`（`HelpShellInput`）；机读面 `SCENE_DATA_SCHEMA`（`:104`）＋`HELP_SHELL_ID`（`:235`）。
- **Q11（取 F3 并回补 F1／F2 的逐场景 CLI 展示与变体示例）**：**部分落地**。§3.5.3 `:426` 明写「取 F3 并回补 F1／F2 的**逐场景 CLI 展示与变体示例**」，变体示例有落点（`Scene.types` 徽章，`:410`／`spec/help.ts:40`），但「逐场景 CLI 展示」**没有显式字段或签名**——只有 `:426` 一句「`skill.<combo>.<key>` 文本，来自 `Scene.id` 与技能提供的数据」，即靠约定拼接，属留白（执行票 #106 未被 §4.4 登记）。
- **Q13（复制交互走 Base P0 双通道）**：**落地**。§3.3 `:263-277` 逐字冻结 `COPY_CHANNELS = ['clipboard','fallback']`（`spec/controls.ts:32`）、`CopyPorts`（`:41-45`）、`CopyText`（`:69`），并明令「不得只留 `execCommand`」（`:274`）；HELP 壳复制走同一签名（`:427`）；运行时断言 `test/contract-signatures.test.mjs:224-227`。
- **#88 能否直接复用 HELP 壳接口**：**能**。四件套 `HelpShellInput`（`spec/help.ts:242`）＋`SceneData`（`:91`）＋`SCENE_DATA_SCHEMA`（`:104`）＋`HELP_COPY_TARGETS`（`:238`）已覆盖 #88 的输入面，且 #88 三条守卫测试各有对应（占位符 0 残留→§3.1 `:154-158`；id 唯一→`duplicate-id` `:410`；`copyText` 单实现→§3.3 `:263-277`）。两处留白同上：无「逐场景 CLI 展示」显式字段；§4.4 未登记 #106／#107。

---

## 结论

- **规格矛盾 1 条**：`calorie-architecture.md:53`（5 形状）vs 契约 `:129`／`:335`（6 形状，含 `fallback`）——契约未落裁定与追溯。
- **规格缺失 4 条**：ID-4 `delivery`（`:54`）、ID-5 三态交付（`:55`）、ID-14 主题接缝（`:64`）、ID-21 输出命名（`:71`）＋ TD 门禁部分覆盖（`:81`）。
- **五疑点**：① 不通过、② 通过、③ 不通过（轻）、④ 不通过（缺失）、⑤ 不通过（部分）。
- **越界**：无。被验对象对 #104／#79／#80／#95／#96 均守界；缺的是交接登记（#83／#87／#106／#107）与三处粒度裁决。

V3 结论：不通过（必须修的前 3 条：① 在 §3.1 补「envelope 形状以 link-core `ENVELOPE_SHAPES` 六形状为准、`fallback` 为降级载荷、架构规格 `:53` 的五形状为不全列举」的裁定与出处；② 在 §4.4 补 #83 交接并在 §2 `:83`／§3.4 注明 `delivery` 由 #83 追加、本契约不排除，同步登记 #87／#106／#107；③ 在 §3.5.2 补一句「若随包发布 `scene-data.schema.json`，必须由 `SCENE_DATA_SCHEMA` 序列化生成并由签名测试逐值断言，禁止手写第二份」。）
