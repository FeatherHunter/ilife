# #92 总架构师裁定与返修单（过程记录）

> 两份合一：前者是 Phase 2 交付后的裁定（A4 口径修订、作者 6 项未决问题），后者是 Phase 3 三份对抗式验收判不通过后的返修单（FX-1…FX-16）。
> 结论与验收证据另见 docs/research/t92-verify-v{1,2,3}-*.md。

---

# #92 总架构师裁定（Phase 2 交付后）

## 一、A4「三命令全绿」的修订（含独立取证）

**原文**：`CONSTRAINTS.md` §6 A4 写「`pnpm build`／`pnpm test`／`pnpm boundaries` 全绿」。

**实测**：`pnpm build` exit 0；`pnpm boundaries` 7/7 PASS；`pnpm test:types` exit 0；`pnpm test` **430 tests / 408 pass / 22 fail**。

**总架构师独立取证**（不采信作者自述）：

| 失败组 | 数量 | 单跑结果 | 是否引用 #92 产物 | 归因 |
|---|---|---|---|---|
| `test/client-bundle-48.test.mjs` | 12 | **单跑仍 12 fail**（21 tests / 9 pass） | **零引用**（grep `base-paint`／`src/spec`／`SPEC_FROZEN` 无命中） | 插件客户端产物缺 loader 注册头（`AssertionError: dsh-bill-ilife 产物缺 loader 注册头`）——构建顺序／#48 在途改动，非 #92 |
| `packages/plugin-*-ilife/test/smoke.test.mjs`（`#50 envelope 契约`） | 10 | **单跑 7/7 pass** | **零引用** | 仅在全量并行下 CLI spawn 争用；串行即绿，非 #92 |

**裁定**：A4 修订为「**无新增失败** ＋ 既有失败逐条举证」。本票**新增失败 = 0**，A4 以修订口径判**通过**。
理由：把 22 个既有失败计入 #92 的关闭条件，等于让一张契约冻结票去修 #48／#50 的构建与并行问题——越界且会阻塞串行序。既有失败另属 #48／#50，须在地图上留一条待办（见三）。

## 二、作者 6 项未决问题的裁定

| # | 未决 | 裁定 | 依据 |
|---|---|---|---|
| 1 | `src/contracts/` vs `src/spec/` 基准冲突 | **以 `src/spec/` 为正本**，不留 `contracts/` 别名。契约 §0.3 已显式声明；`CONSTRAINTS.md` §4 D2 的 `contracts/` 是过时写法，已归档件的勘误见下 | 后出 brief 逐文件指定 7 个文件名；`contracts/` 与既有 `src/contract.ts` 只差一字符，正是 brief 要区分的两物 |
| 2 | `08 规范` 不移植后，按钮色／布局／复制格式的验收基准是否另开票 | **不另开票**。按钮色／布局口径由 `ACTION_BAR_DEFAULTS`／`CSS_VAR_TOKENS`／`CHART_BREAKPOINTS` 承载；**视觉验收基准归 #105（B1 逐值＋区块级尺）与 #89（视觉锁 B1 逐值验收）** | B5 不移植；Q12 锁 B1；#105／#89 已是本图票 |
| 3 | `INJECT-DATA` 认领后，场景数据的序列化归属 | **数据生产归技能侧 render 层；base-paint 只注入＋校验**。具体 shape 与写入时机由 **#74 票面明确**（#92 只冻结注入点与校验） | AC-12；t72 §5.2「数据组织留技能包」；#74 票面验收已含迁移路径 |
| 4 | AC-14 `escapeHtml` 归一执行归 #74 还是 #79 | **#74**（与统一填充器、删除技能侧私有常量同批）。#79 只做契约收口与三包统一版本 | AC-14；#74 任务就是消灭 per-skill 复制 |
| 5 | `SCENE_DATA_SCHEMA` 若 #78 要另出 `.json` | **唯一权威＝TS 常量**；任何 `.json` 产物必须由该常量生成并有断言，否则判第二真相 | AC-4；架构规格「单一真相」 |
| 6 | changeset 只 bump `base-paint`，与 B8「三包统一版本」有时间差 | **接受时间差**，changeset 与契约 §5 已写明；#79 用 changesets `fixed` 组收口 | B8；#79 职责 |

## 三、本票不修但必须留痕的既有失败

`pnpm test` 的 22 个既有失败不属 #92，但若不记账就会在后续票里反复出现「以为是新失败」：

- 12 个 `client-bundle-48`：插件客户端产物缺 loader 注册头（构建顺序／#48 在途）。
- 10 个 `#50 envelope 契约`：全量并行下 CLI spawn 争用（串行即绿）。

**处置**：写入 #92 结论与地图记录，交接给打通图／#48／#50 域，不在本图开票。

## 四、归档件勘误

`docs/research/t92-contract-freeze-brief.md` 的 D2 行写 `src/contracts/*.ts`，与正本不符；以 `docs/base-paint-contract.md` §0.3 的 `src/spec/*.ts` 为准。


---

# #92 Phase 2b · 返修单（总架构师裁定）

两份独立验收判不通过：**V1 独立性**（3 处硬洞 ＋ 15 条「仍需猜」）、**V3 规格一致性**（1 条矛盾 ＋ 4 条缺失）。本单把每条钉成「修什么／怎么算修好／谁负责」，**禁止默默略过**。

返修纪律：`SPEC_FROZEN_SURFACE` ↔ 文档 §3 标记区表格 ↔ `test-d` 类型断言**三者必须同步改**；`pnpm build`／`pnpm boundaries`／`pnpm test:types` 必须仍绿；**不得**让新增失败出现。

---

## A. 必修（V1：不猜就写不下去）

### FX-1 [#77] envelope → 复制文本的投影必须冻结

**洞**：`DataTextInput.envelope` 是 `Envelope<SerializableShape>`，而契约只说「由各 shape 的 data 投影而来」（doc:336），**没给投影表**；`structure-invalid` 判据仍写「分节缺 `heading` 或 `rows`」（doc:348）——那是指向**已删除的旧 snapshot** 的死判据；`LOG_SECTIONS` 6 段 vs `CopyLogFields` 5 字段，`scene` 段无数据源。

**裁定**：契约必须冻结**逐 shape 投影表**，至少覆盖：

| shape | data 形态（`base-link-core/src/envelope.ts:13-20`） | 复制文本结构 |
|---|---|---|
| `stat` | `{ metrics }` | 标题行 ＋ 指标键值行 |
| `list` | `{ items, total }` | 标题行 ＋ 逐项行（`total` 收尾） |
| `detail` | `{ item }` | 标题行 ＋ 字段行 |
| `receipt` | `{ ok, message }` | 状态行 ＋ 消息行 |
| `analysis` | `{ summary: string }` | 标题行 ＋ 摘要文本 |

- `structure-invalid` 判据**改为**「data 不符 `EnvelopeDataByShape[shape]`」；**删除**对旧 snapshot `sections[{heading,rows}]` 的一切引用。
- `LOG_SECTIONS` 与 `CopyLogFields` 的对应关系必须成表；`scene` 段**由 envelope 派生**（`skill`／`key`／`shape`），其余 5 段来自 `CopyLogFields`。**不许**留「6 段只有 5 个数据源」。
- `(未知)` 占位与 json `null`／csv 空串的冲突、csv 两列语义，必须给出口径。

### FX-2 [#74] `INJECT-DATA` 替换语义定死 ＋ `sharedHelpersJs` 的产出者

**洞**：契约同时冻结了 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`／`dataScriptId?`，却没写「只替换标记文本」还是「生成 `<script>` 容器」；`TemplateAssets.sharedHelpersJs` 必填（空串 → `asset-missing`）却**全仓无产出签名**。

**裁定**：
1. 填充器**只替换标记文本**为 JSON（与旧 `injector.py:119-120`、memo 6 模板形态一致）；**不生成容器**。
2. `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE` 的用途限定为**校验模板自带容器**（存在则断言 id／type 匹配）；「模板必须自带容器」写成硬约束，并给出缺容器时的错误码。
3. `sharedHelpersJs` 必须有**唯一产出签名**：归 #76 新增冻结签名（如 `buildSharedHelpersJs(...): string`），#74 只消费。**不许**留「必填但无产出者」。若判为无需新增，必须给出其它唯一来源并写进契约。

### FX-3 [#76／#90] `copyText` 的反馈通道与接线

**洞**：`CopyPorts` 只有 `clipboard`／`fallback`，但 `COPY_TEXT_DEFAULTS.failBadgeAlwaysOn` ＋「失败徽章恒在」要求 `copyText` 自己出徽章；可用性表给 `actionBar`／`errorReceipt` 标了 `CopyPorts`＋`ToastHostPort`，两者却只有静态 HTML 签名；`ActionBarButton.actionId` 与 `data-t` 无读取者 → #90 票面「copyText ＋ toast 反馈」**仅凭契约接不上线**。

**裁定**：
1. `CopyPorts` 增可选 `toast?: ToastHostPort`（缺省只出徽章不弹 toast）。
2. 「失败徽章恒在」必须二选一定死：**由 `copyText` 产出的 HTML 片段交调用方插入**，或**`copyText` 直接挂载**；不得含糊。
3. 必须给出 #90 可直接使用的接线签名（如 `bindCopyAction(el, ports, opts?)`），使「复制 → 反馈」仅凭契约可落地。

---

## B. 必修（V3：规格一致性）

### FX-4 envelope 形状裁定 ＋ 追溯

`base-link-core/src/envelope.ts:10` 实为 **6** 形状（含 `fallback` 降级载荷）；架构规格 `docs/calorie-architecture.md:53` 只列 5 个。
**裁定**：以 `ENVELOPE_SHAPES` 六形状为准，规格 `:53` 属**不完整列举**。契约 §3.1 必须新增裁定小节＋追溯（对齐 AC-3 对 `type`／`types` 的写法），并在 `docs/calorie-architecture.md:53` 补一行勘误注记，使上位文件与事实一致。

### FX-5 交接登记（#83／#87／#106／#107）

契约 `delivery`／三态**零命中**，而 #83 票面拥有三态 ＋ `delivery{mode,path?,template?,bytes?}`（验收含「envelope 的 delivery 字段有断言」）。
**裁定**：契约 §4.4 登记——`delivery` 由 **#83** 追加，**不冻结也不排除**；§2 的 Envelope 五字段冻结**不构成**对 `delivery` 的否定，须写明。同步登记 #87（输出命名）、#106（HELP F1／F2 回补）、#107（6 死模板并入 HELP）。

### FX-6 `.json` 必须由常量生成

**裁定**：若随包发布 `scene-data.schema.json`，**必须**由 `SCENE_DATA_SCHEMA` 序列化生成，并由签名测试逐值断言；否则判第二真相。契约 §3.5 写死。

---

## C. 次修（便宜且防误读）

- **FX-7** `HELP_COPY_TARGETS` 的 id → 对外文案映射，文案统一「**复制指令**」；§3.5.3 的「Prompt 实时预览」改词（V3 疑点③）。
- **FX-8** 主题接缝条文（规格 ID-14）：设计变量分层，单技能主题变更**不得静默重刷**其他技能。
- **FX-9** #104 粒度裁决：base-paint 冻结的是**控件级**签名（#76 六控件）；12 个**区块组件**（页面级组合）接口 owner 是 #104，它**组合**控件而不重定义控件签名。契约写明分层。
- **FX-10** 门禁归属登记：#99（门面示例可执行门）、77 计数断言。
- **FX-11** 行号勘误：doc:150 引 `injector.py:104` → 实际注入顺序在 `injector.py:107-120`（`V1` 疑点①）。
- **FX-12** V1 其余洞（洞 6 `#75` 控件视觉判据、洞 7 `#78` HELP 壳产物结构／类名／actionId、洞 8／9 占位与空值冲突、旧 `combo.y2` 无对应）**逐条处置**：修，或显式登记归属票并写明「不冻结也不排除」。**禁止默默略过。**

---

## B2. 必修（V2：门禁与落笔）

### FX-13 A4 口径落地（**不得默认豁免而不留痕**）

`pnpm test` = exit 1（430/408/22），**新增失败数 = 0**（V2 三重证明：失败文件不在 `6d7119c` 的 14 文件清单；`git log -1` 指向 `6b0c1e7 fix(48)`／`1c07c7d feat(50)`；`git show HEAD~1:...package.json` 同样只有 `"build":"tsc -b"`）。

**总架构师裁定**：A4 改为「**三命令零回归**（`build`／`boundaries`／`test:types` 绿 ＋ `test` 新增失败 = 0）」。22 条既有失败按「既有失败台账」留痕（#92 结论 ＋ 地图 `Out of scope` 一行）；其中 B 组 12 条的根因（`plugin-{bill,chef,home,schedule}-ilife` 缺 `"build:client":"tsdown"`，产物无 `__ModuleLoader__`）**另案承接，不属 #63**（本图不碰插件包）。A 组 10 条为 Windows 并行 spawn 抖动，单跑 46/46 绿、不可复现。

返修 agent **不需要**修这 22 条；只需在契约 §7 或结论里留一行台账指向。

### FX-14 Q8 消歧

契约全文只在 :12／:83 提到 Q8，**没写** `STATUS_KINDS = ['ok','warn','danger','empty']`（视觉徽章枚举）与 envelope `status`（Q8 已废）无关。读者会撞 Q8 字面。
**裁定**：§3.3 补一句消歧。

### FX-15 边界第 8 条落笔 ＋ 错误形态关系

1. 契约全文 grep `CONTEXT` = 0 命中 → 补「术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页）」一句（边界规则第 8 条）。
2. 写清新 `*ErrorShape`（`TemplateErrorShape` 等）与既有 `RenderError` 的**关系**（对齐 §2.5「RenderError 形态」与「缺失阻断不返空」）。

### FX-16 次修（V2 附带）

- `contract-signatures.test.mjs:250-254` 的 `escapeHtml("'") === "'"` 哨兵：契约 :293／:532 已声明为**待翻转 tripwire**，返修时把注释写清「AC-14 归一后本断言必须翻转」，避免被误读为把缺陷固化。
- `packages/skill-bill/scripts/build-help.mjs:28 injectHelpBlock` 与 `injector` 混称：**不属 #92 改动面**，登记交接给 #74（其任务就是消灭 per-skill 私有填充器）。

## D. 返修后的复验口径

1. `pnpm build`／`pnpm boundaries`／`pnpm test:types` 绿；`pnpm test` **新增失败 = 0**。
2. 冻结面三处同步（清单 ↔ 文档 ↔ 类型断言）；`SPEC_FROZEN_SURFACE` 条目数与 `status` 分布须在汇报里给出。
3. 定向复验：**V1 的 3 条硬洞逐条打勾**（给 `文件:行号`）＋ **V3 的 3 条必修逐条打勾** ＋ FX-7…FX-12 逐条处置表。
4. 复验由**独立 agent** 做，不得由返修者自证。
