# #92 契约冻结 · 绑定约束与总架构师裁定单（过程记录）

> 本文件是 #92 的作业基准：前者是绑定约束与验收判据，后者是把「必须有人拍」的点定死。两者均已被 docs/base-paint-contract.md 吸收；保留此处以存过程与理由。

---

# #92 契约冻结 · 绑定约束与验收判据（总架构师下发）

本文件是 #92 的**唯一约束基准**。Phase 2 的作者 agent 与 Phase 3 的验证 agent 都以本文件为判据；与本文件冲突的方案一律退回。

## 0. 票据

- 票：`#92`《base- 契约接口先冻结（签名清单＋类型＋签名测试）》，map `#63`，`wayfinder:task`，已认领。
- 票面验收原文：「契约文档 ＋ 类型 ＋ 签名测试落地并绿。」「#74–#78 可据此实现，无需再猜。」
- 本票是 79a：**只冻结，不实现**。执行票是 #74–#78。

## 1. 绑定裁决（不可违背）

来源：#73 裁决评论（B1–B8）、#66 裁决评论（Q1–Q14）。

| 编号 | 裁决 | 对 #92 的约束 |
|---|---|---|
| B1 | 按新架构重写；v1.30 控件签名当验收清单逐条对照（搬清单不搬实现） | 文档必须含 v1.30 逐条对照表；**不许**逐字搬旧实现 |
| B2 | envelope `shape` 取代 snapshot；保留复制文本序列化（`buildDataText`／`buildLogText`） | 复制序列化进契约；snapshot 结构接口不移植，改以 `shape` 为准 |
| B3 | base-paint 统一填充；技能可留私有模板但必须走同一填充器 | 填充器是 base-paint 的冻结出口，技能不得自填 |
| B4 | 图表白名单例外去掉 | 契约里**不得**保留"技能自营 canvas"例外 |
| B5 | `08 规范` 不移植 | 文档标注"不移植" |
| B6 | HELP 形态 = HTML 速查台 | HELP 壳契约按 HTML 速查台定 |
| B7 | `formPrompt`／`selectList`／`smartSelect` 归插件 client | 契约里**不得**出现在 base-paint；要写明归属边界 |
| B8 | base-* 三包统一版本 | 文档写明统一版本机制（#79 落地） |
| Q8 | 不保留 `status`，以新 envelope 为准 | 契约以 envelope `shape` 为准，不引入 `ok/warn/fail` |
| Q12 | 视觉目标锁 B1 | 样式资产 token 口径以 B1 为标 |
| Q13 | 复制交互走 Base P0 双通道 | 控件层须含双通道（clipboard ＋ 兜底），不得只留 `execCommand` |
| Q14 | B2 独有 token（`--r-xl`／`--pink`／深色区）不引入 | 样式契约不得含这三个 |

## 2. 冻结边界规则（不可违背）

来源：`tooling/check-boundaries.mjs`、`docs/p10-scaffold.md`、`docs/adr/0001-hexagonal-architecture.md`、`base-render/src/style.ts:1-5`、t72 §6。

1. `base-link-core` 零依赖；源码不得引用任何 workspace 包。
2. `base-paint` 无运行时依赖（`base-link-core` 仅 dev／`import type`）；不依赖 `base-combos`。
3. `base-combos` 的 `present.ts` 只许字符串级引 key，禁 import render。
4. 装配 owner 归一 base-paint：`registerTab`／`openTab`／`mountInjector` 只许住 `base-paint`。
5. 缺失阻断不返空：一律抛错（`RenderError` 形态），禁止静默空页。
6. 样式只抖 base-paint；类名前缀 `ilife-`；token 表冻结；单品包禁自带样式常量。
7. 浏览器侧资产必须 browser-safe（不得出现 `node:`）。
8. 术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页）。

## 3. 命名区分（架构师定调）

问题：`base-paint/injector.ts` 现在是 **sidebar 槽位装配**（`mountInjector`／`SlotsPort`／`openPage`），而本图要新增的是 **HTML 占位符填充器**——同名不同物。

定调：

- `injector` 一词**专指 sidebar 槽位装配**，`packages/base-render/src/injector.ts` 保持职责不变。
- HTML 占位符填充器**不得**再叫 injector：默认落点 `packages/base-render/src/template.ts`，对外名 `fillTemplate`（占位符常量与类型同文件）。
- 文档必须写一节「命名区分」，含**禁止用法**清单（如 `htmlInjector`／`injectHtml`／`injectPlaceholders` 之类混称一律禁止）。
- 若作者提出更优命名：必须在文档里给出对照与理由，且不得与 `injector` 混称。

## 4. 交付物

| 编号 | 交付物 | 说明 |
|---|---|---|
| D1 | `docs/base-paint-contract.md` | 冻结契约文档（结构见 §6 的 A1–A6） |
| D2 | `packages/base-render/src/contracts/*.ts` | **type-only** 类型定义，无运行时行为 |
| D3 | 签名测试 | 可执行、CI 可跑绿（编译期类型断言 ＋ 运行时出口面锁） |
| D4 | `packages/base-render/src/index.ts` | 只许**追加** export，不许删改现有 export |
| D5 | `.changeset/*.md` | base-paint 契约新增（按 B8 统一版本口径） |

## 5. 明令不做

- **不实现** #74–#78 的行为：不许把 `fillTemplate` 实现出来、不许写控件运行时、不许做图表渲染。类型与断言可以落地，行为一律留给执行票。
- 不碰 `packages/skill-calorie/package.json`（工作区有 #48 未提交改动）。
- 不碰 `packages/base-combos/HELP.md`（属 #80）。
- 不 commit 与 #92 无关的既有改动；不 `git add -A`。
- 不改 `D:\2Study` 下任何文件；禁读 `卡路里\.个人笔记不允许参考`。
- 不许字面 `\n` 转义、不许 BOM 开头；Markdown 用真实换行。

## 6. 验收判据（#92 关闭条件）

- **A1** v1.30 逐条对照表：26 项全覆盖，每项有 有／部分／无 判定 ＋ 新落点 ＋ 新签名（或"不移植"理由）。
- **A2** top5 冻结签名完整：① 占位符填充器 ② 样式资产 ③ 控件层 ④ 复制文本序列化 ⑤ 图表层＋HELP 壳（含 scene-data 契约）。
- **A3** 命名区分无歧义（文档 ＋ 代码落点）。
- **A4** 类型可编译；签名测试可执行且绿；`pnpm build`／`pnpm test`／`pnpm boundaries` 全绿。
- **A5** 独立性：#74–#78 逐票走查，每票仅凭文档＋类型即可实现，且文档写明"用哪些签名、不许自造什么"。
- **A6** 版本机制（B8）与 B7 归属边界写明。
- **A7** 文档格式合规（真实换行、无字面 `\n`、无 BOM）。

## 7. 验证协议（Phase 3）

- **V1 独立性**：把 #74／#75／#76／#77／#78 五票的任务与验收逐条拿去对契约，找"仍需猜"的洞。
- **V2 门禁红线**：零依赖／check-boundaries／测试绿／命名／格式／B1–B8·Q8·Q12–Q14 逐条。
- **V3 规格一致性**：对照 `docs/calorie-architecture.md` 的 Implementation Decisions ＋ Testing Decisions，以及与 #104／#79 的边界是否清晰。


---

# #92 总架构师裁定单（ARCHITECT CALLS）

作用：把「契约冻结」里必须有人拍、否则下游会各猜一套的点，在 Phase 2 之前定死。作者 agent 必须按此落文档与类型；验证 agent 按此逐条检查。
每条都给了依据；与 `CONSTRAINTS.md` 冲突时以 `CONSTRAINTS.md` 为准。

## AC-1 命名：`injector` 专指侧栏装配

- `packages/base-render/src/injector.ts` = sidebar 槽位装配（`mountInjector`／`SlotsPort`／`openPage`），职责不变。
- HTML 占位符填充器落 `packages/base-render/src/template.ts`，对外名 `fillTemplate`。
- 文档须列禁止用法：`htmlInjector`／`injectHtml`／`injectPlaceholders`／`htmlTemplateInjector` 等一律禁止。
- 依据：ticket #92 正文；`check-boundaries.mjs` 装配 owner 归一 render。

## AC-2 `metaHeader`／`remindersBlock`：显式排除，不移植

- 二者是旧 base.js 的历史能力（`base.js:298-299`），但属"居家特定／技能专属块"。
- 契约须**显式写"不移植"**并给出理由，不留"可能不存在"的模糊地带。
- 依据：t72 §5.2「技能专属块（旧 metaHeader/remindersBlock 类，§2 L61 已定）」；架构规格分层管线。

## AC-3 scene-data 字段名以机读 schema 的 `types` 为准

- 旧侧存在硬分歧：`docs/scene-data-contract.md:78` 与 `docs/scene_data.schema.json:70` 用 `types`，`assets/help_template.html:52` 用 `type`。
- 新契约取 **`types`**（复数）；**不提供 `type` 别名**。
- 理由：B1 按新架构重写；机读 schema 优先于散文与模板笔误；单复数双写会制造第二真相。
- 契约须写明这是**对旧侧分歧的裁定**（可追溯）。

## AC-4 机读 schema 是权威，人读文档必须与之一致

- 旧侧 `validate_help_data`（injector.py）与 `scene_data.schema.json` 口径不等价，且示例数据 `help_example_data.json` 自身不符 schema（`init_banner`／`contact`／`version`／`recommendations` 被 `additionalProperties:false` 拒绝）。
- 新契约必须给出**唯一机读 schema**，文档只是它的可读投影；两者不一致视为契约缺陷。
- 依据：架构规格「单一真相」「禁止第二真相」。

## AC-5 复制文本序列化：保留，输入对齐 envelope `shape`

- B2：snapshot 结构化接口不移植，由 envelope `shape` 取代；但 `buildDataText`／`buildLogText` **保留**（复制文本来源）。
- 新契约须把二者签名对齐 envelope（`shape ∈ stat/list/detail/analysis/receipt`），并把旧侧未定义的 `format` 语义补全（text／json／csv 各自的转义与空值口径）。
- 依据：#73 裁决 B2；架构规格 Implementation Decisions「envelope 形状」。

## AC-6 图表：去掉白名单例外，保留 `CHARTS-HELPERS` 语义

- B4：不保留"技能自营 canvas"例外。
- 占位符 `<!--CHARTS-HELPERS-->` 语义保留（**0 或 1 个**，可选），其余四个占位符保留"恰好 1 个／硬拦截"语义：
  - `INJECT-DATA`（恰好 1）、`SHARED-HELPERS`（恰好 1）、`SHARED-CSS`（恰好 1）、`NO-SHARED`（豁免通道，声明后 SHARED 可为 0）。
- 依据：`公共组件/injector.py:5-9`；#73 裁决 B4。

## AC-7 隐式全局必须显式化

- 旧 base.js 暴露但契约未声明的全局：`window.toast`／`__hmToastFlush`／`__hmPayload`／`__hmCopyData`／`__hmCopyLog`。
- 新契约**不得**引入隐式全局；每个能力必须是显式导出签名。若需浏览器侧运行时钩子，必须写成契约里声明的、可断言的接口。
- 依据：B1/B4 禁全局脚本（`base.js`／`charts.js` 全局已被否决）；ADR-0001 六边形架构。

## AC-8 B7 控件的归属边界

- `formPrompt`／`selectList`／`smartSelect`（含 `confirm`／`foldBox` 之类交互控件）**不进 base-paint**，归插件 client。
- 契约须有一节写明：这类能力的归属、以及 base-paint 侧只提供"静态呈现 + 复制"的边界在哪。
- 依据：#73 裁决 B7。

## AC-9 样式资产起点＝旧 token A 组 11 个

- 旧 `assets/base.css:13-23` 实为 **11** 个 token（契约文档写"12 变量"是错的）：`--fg`／`--fg2`／`--fg3`／`--bg`／`--card`／`--line`／`--blue`／`--blue2`／`--soft`／`--ok`／`--shadow`。
- `--blue: #007aff` 与 Q12 锁定的 B1 主色一致 → 主色口径按 B1。
- Q14：**不得**引入 `--r-xl`／`--pink`／深色区。
- 依据：#66 裁决 Q12／Q14；`base.css:13-23` 实测。

## AC-10 版本机制

- B8：base-* 三包**统一版本号**；签名变更 = 破坏性变更，须走 changeset。
- #92 只写机制与现状，不实际升版（#79 落地）。
- 依据：#73 裁决 B8。

## AC-11 交付物边界

- D1–D5 见 `CONSTRAINTS.md` §4。
- **不实现** #74–#78 的行为；类型与断言可落地。
- 签名测试必须**可执行且能跑绿**（编译期类型断言 ＋ 运行时出口面锁），并接入现有 `pnpm test`／`pnpm build` 路径。

## AC-12 `INJECT-DATA` 认领，不留死占位符

Phase 1 实测：`<!--INJECT-DATA-->` 已在 **6 个** skill-memo-ilife 模板里存在，但**全仓没有任何填充者**；`fillSharedMarkers` 零生产调用；calorie 的 6 个模板双标记无人填。

裁定：五个占位符**全部认领**，由 base-paint 的统一填充器一次填齐（B3）。契约须为每个标记写清：逐字写法／出现次数约束／填充物来源／缺失时的行为。

- `INJECT-DATA` 的填充物是**场景数据**（由技能包提供，填充器只负责注入与校验，不生产数据）。
- 各技能私有常量与私有填充函数的**迁移路径归 #74**（其票面验收已含"其余 5 技能的迁移路径写进票面"）；#92 只冻结契约，不写迁移。

## AC-13 base-paint 不得运行时依赖 link-core（L15 红线）

`check-boundaries.mjs` 7 条断言里最易破的是 **L15「render 无运行时依赖」**。base-paint 现在只以 devDependency ＋ `import type` 消费 `base-link-core`。

裁定：冻结的填充器与控件契约**只许 `import type`**；任何需要 envelope 校验的地方，要么由技能侧传入已校验数据，要么在 base-paint 内自持零依赖实现。契约须显式写这条红线，并写明"违反即破坏 #96 的回归门"。

## AC-14 `escapeHtml` 口径归一

Phase 1 实测：转义实现有 **6 处**（`base-paint/contract.ts:31` 只转 `& < > "`；bill／chef／schedule／home／memo 各自本地一份，其中 memo 另转 `'`）。t72 附录 B#3 已指出口径不一致。

裁定：唯一实现住 base-paint，转义集固定为 **`& < > " '` 五字符**；技能侧本地副本一律删除。契约须冻结该口径；**执行归 #74／#79**，#92 只冻结。

## AC-15 与相邻票的交接（#92 不做，但必须写进文档 §6／§4）

- **#95**：发布白名单现只含 `base-paint`，不含 `base-link-core`／`base-combos`；`base-combos` 对 `base-link-core` 是**运行时** deps（base-paint 是 devDeps），不可拆发。→ 契约 §5／§4 记一笔，交接给 #95／#79。
- **#96**：base-paint 被 6 个技能共用；契约变更必须能过 per-skill HTML 快照回归门。
- **#104**：12 个区块组件的**接口 owner 是 #104**，#92 只冻结 base-paint 的共享层签名，**不许**抢先定义区块组件接口。
- **#80**：`base-combos/HELP.md:66-71` 六行 `undefined：undefined（undefined）` 属 #80，#92 不碰。

## AC-16 控件层必须「无宿主可用」，且与 #90 同签名

票面硬要求：

- `#76` 验收：「控件在**无宿主（纯 HTML）**下可用，单测覆盖」＋「与【复制交互走 Base P0 双通道】票的接口对齐」。
- `#90`（复制交互走 Base P0 双通道）`blocked_by [76,77]` —— 它消费的正是控件层与序列化层的签名。

裁定：契约 §3.3 必须冻结：

1. `copyText` 的**双通道**接口（浏览器 clipboard API ＋ 兜底通道），逐字签名；
2. 每个控件在「无宿主纯 HTML」下的**可用性边界**（哪些能力纯静态即可、哪些需要浏览器运行时），不得写成"需要宿主"；
3. `#76`／`#77`／`#90` **共用同一签名**，禁止三票各定一套；
4. 浏览器侧运行时资产必须 browser-safe（无 `node:`）且不引入隐式全局（AC-7）。

## AC-17 图表接口按 v1.30 签名逐条对照

`#78` 验收：「图表接口按 v1.30 签名**逐条对照**实现」＋「scene-data 契约落地」＋「HELP 壳能被技能复用（与 #88 联动）」。

裁定：契约 §3.5 必须给出 v1.30 图表能力（8 接口 ＋ 复合形态 ＋ 双端自适应 ＋ 空态联动 ＋ 结构校验）的**逐条对照表**：旧签名（引 `old-v130-signatures.md` 证据行号）→ 新签名 → 判定（有／部分／无）→ 落点；并按 B4 **去掉**白名单例外，按 AC-3 取 `types`、AC-4 机读 schema 唯一权威。HELP 壳必须能被 #88（HELP 速查台重建）直接复用，接口不得留 #88 才能补的洞。
