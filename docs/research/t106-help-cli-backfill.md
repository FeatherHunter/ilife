# #106 · HELP：F1／F2 独有能力回补 —— 证据（可复跑）

> 票面：wayfinder 地图 #63 子票 #106《HELP：F1／F2 独有能力回补》；裁决 **Q11**「取 F3，并回补 F1/F2 的
> 逐场景 CLI 展示与变体示例」。
> 本文件是**实施证据正本**；探针与变异脚本同目录受 git 跟踪。
> 对照物：`docs/research/t71-help-dissect.md`（F1／F2／F3 三代解剖）＋ `docs/base-paint-contract.md` §3.5／§4.4。

## 0. 结论（两半分开记账）

| Q11 的一半 | 判定 | 落点 | 数量 |
|---|---|---|---|
| **逐场景 CLI 展示**（F1 `.prompt-cli`／F2 `.cli`） | **已回补** | `Scene.editable_fields` 一行「可执行命令」→ 壳渲染进 Sheet 详情层 | **341/436** |
| **变体示例**（F1 31 变体／F2、F3 无） | **不补**（如实登记，见 §4） | —— | SoT 仅存 5 条且**不可路由** |

**零新增契约面**：`SPEC_FROZEN_SURFACE` 恒 130 条；`Scene` 机读属性集恒七键（探针 A）。
**壳签名与三态语义不变**：`renderHelpCenterHtml` 未改签名；`file`／`inline` 含命令行、`text` 态不含（§6）。
**卡面不动**：436 条 `<code class="…-cli">` 仍逐字 = `Scene.id`（#88 L-09／L-19 口径保持）。

## 1. 派单前提勘误（两处，先记后做）

1. **「新版 `SceneData.scenes[]` 已有 `cli` 字段（#88 落地）」不成立**。实测（探针 A）：
   `SCENE_DATA_SCHEMA` 的 scene 属性集恒 **七键** `id/title/wake_word/types/status/prompt_template/editable_fields`，
   **无 `cli`**；冻结类型 `Scene` 同形（`packages/base-render/src/spec/help.ts:38-46`）；
   壳的逐场景 CLI 形态文本恒 `cliText(scene) = scene.id`（`packages/base-render/src/help.ts:391-393`，R32）。
   → 真问题不是「读 `cli` 还是读 `key`」，而是**id 之外还能不能发第二条文本**；答案＝冻结槽位
   `editable_fields`（壳渲染进 Sheet，见 §3.1）。**本票因此不必扩冻结面，无需停下报告**。
2. **文档编号勘误**：`t71-help-dissect.md` 的 §C 是「数据注入点」、§D 是「能力对照表（23 行）」、
   §E.3 才是「复刻规格 1–20」。派单里的「§C 能力对照表／§D 复刻清单 1–20」按内容对应到 §D／§E.3。

## 2. 现状实测（只读探针 11/11）

复跑：`node docs/research/t106-probe-cli.mjs` → 末行 `RESULT: 11/11 fails=0`。

| 事实 | 实测值 | 用途 |
|---|---|---|
| `Scene` 机读属性集 | 七键，无 `cli` | §1 勘误 |
| 逐场景可执行 CLI 覆盖 | **341/436**（non-exec 95 = out-of-scope 10 ＋ legacy-chain 85） | 回补口径 |
| CLI 形态 | 恒 `calorie-cmd-read calorie.*`，逐字 = `routesFor(wake).find(exec).cli` | 单一真相 |
| SoT `main_prompt.cli` 原文 | **376/436 是死命令**（python 370／mavis 3／mmx 2／裸键 1） | 为何不取原文 |
| 341 条 CLI 去重 | **261** 条唯一 | 为何不能进 `Scene.id` |
| 变体 | 5 条／3 宿主，label **全部不可路由** | §4 不补依据 |
| 三态 | file／inline 各 341 条 `data-field="cli"`；text 0 条；text 场景行恒 436 | §6 |

## 3. 决策 1：逐场景 CLI 展示（已回补）

### 3.1 落点（契约内，零新增面）

- 槽位＝**冻结面既有的** `SceneEditableField`（`{name,label,value,hint?,required?}`，`spec/help.ts:30-36`），
  逐场景发**恰 1 行**：`{ name: 'cli', label: '可执行命令', value: <exec CLI> }`。
- 壳把它渲染在 **Sheet 详情层**（`<details class="ilife-help-shell-sheet">` 内
  `<ul class="ilife-help-shell-fields">` → `data-field="cli"`），即旧版的 **L4 详情**——
  与旧 `docs/adr/0008-help-html-design-principles.md` 实施规范「`data_source` → ✅ cli 块 → **L4 直接显示**」同落点。
- 取值函数 `helpSceneCli(wakeWord)`（`helpCenter.ts`）：遍历 `routesFor(wakeWord)`，返回**首条
  `kind === 'exec'` 路由的 `cli`**；无 exec 路由返 `null`（**不发字段**，不造空值行、不写占位文案）。

### 3.2 为什么不取 `main_prompt.cli` 原文（关键判断）

F1 的 `.prompt-cli`／F2 的 `.cli` 展示的都是 `main_prompt.cli`／`data_source`。但**新架构下该字段 376/436
是死命令**（`python scripts/render_*.py` 370／`mavis` 3／`mmx` 2／裸键 1——旧 render 脚本已不存在）。
展示它直接违反旧 ADR-0008「必须遵守 3：`data_source` 必须带 `python ` 前缀（可一键复制执行）」的**本意**，
且会把「看起来能跑、实际不存在」的命令摆到用户面前（比 F3 的「不显示」更差）。
→ 取 **#81 路由层**的 exec CLI（`docs/research/t81-exec-smoke.md` 全量实跑 exit 0）：既是新架构唯一出口
（地图「唯一出口：`calorie-cmd-read`」），又**逐条被实跑证明可执行**。

### 3.3 不回归（逐条实测）

| 项 | 值 | 断言位置 |
|---|---|---|
| 卡面 `code.cli` | 436 条逐字 = `Scene.id`（未把 CLI 塞进 id） | 探针 F／`help-center-106.test.mjs` ② |
| `data-scene-id` / `data-subgroup-id` / `data-action-id` | 436 / 54 / 1308 | `help-center-88.test.mjs:196-204`（未改仍绿） |
| 复制按钮数 | 436×3 = 1308（不因字段增减而变） | 同上 |
| `duplicate-id` 风险 | 261 唯一 CLI < 341 → 若进 `id` 必撞；**未进** | 探针 D |
| `复制参数` 文本 | exec 场景 = `可执行命令: <cli>`；non-exec 场景回落 `Scene.id`（R32 不变） | 本票测试 ②／台账 L-106-03 |

### 3.4 与 F3 的差异记账（逐条）

| 维度 | F3（`卡路里.html`） | 新版（本票前） | 新版（本票后） |
|---|---|---|---|
| 逐场景 CLI | **无**（契约无 `data_source`，违反自家 ADR-0008 必须遵守 3） | 卡面 `Scene.id`（414＝场景键／22 legacy＝`main_prompt.cli` 原文；L-09「相对 F3 新增」） | 卡面 `Scene.id` **＋** 详情层「可执行命令」＝路由层 exec CLI（341/436） |
| 位置 | —— | 卡级 | 卡级（id）＋ 详情级（CLI）——**因壳 `cliText` 冻结为 `Scene.id`，卡级文本不可承载 CLI** |
| 内容 | —— | 场景键（如 `home_today_overview`，非可执行） | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 可复制 | F3 无 CLI | `复制参数` 复制场景键（不可执行） | `复制参数` 复制 `可执行命令: <cli>`（可执行＋标签前缀） |
| 覆盖 | —— | 436/436（含不可执行者） | 341/436（95 条 #81 裁定无单命令入口 → 不发） |

## 4. 决策 2：变体示例 —— **不补**（四条依据，逐条可复核）

1. **数据不存在**：F1 的 31 变体属旧 12 分类／81 唤醒词快照（`t71-help-dissect.md` §C.2 记 F1 `total variants: 31`）。
   当前 SoT（`triggers/scene-*.ts`，与旧 `_triggers.py` **sha parity 冻结**）只有 **5 条变体／3 个宿主场景**
   （`查健康报告` 1／`查热量趋势` 3／`查营养结构` 1）。「回补 31 变体」在数据上不可能；照 F1 造数据＝S1-交付缺陷。
2. **新架构下不可达**：探针 E 实测 5 条变体 label（如「查热量趋势 上周」）**全部**：不是唤醒词、不是别名、
   `routesFor` 零命中、`HELP_LOOKUP` 零命中。它们的 prompt 让 AI「执行唤醒词「查热量趋势 上周」」——
   **指向一个不存在的唤醒词**；展示它等于展示死指令（同 §3.2 的死命令问题）。
3. **能力已被覆盖**：变体的实质是「同场景换窗口参数」。新架构用 `--params` 表达，且**已由本票 CLI 行承载**：
   `查热量趋势 → calorie-cmd-read calorie.history --params '{"days":7}'`（变体「上周／7 月／最近 30 天」＝改 `days`／`start-end`）。
   即：Q11 的「变体示例」在新架构里的等价物＝**逐场景参数化命令示例**，见 §3。
4. **契约边界**：冻结 `Scene` 无 `variants` 字段；纳入需扩冻结面（走 #92 追加流程）。按 1–3，为 5 条
   **不可路由的死数据**扩冻结面不成立；故按硬约束**登记不补**，并在测试里加**机械锁**（产物零出现变体 label／prompt）。

> 若维护者仍要求展示变体：前置有两道——① 先解决「变体 label 不可路由」（要么进唤醒词表，要么由路由层给等价 key＋参数）；
> ② 再走 #92 冻结面追加（`Scene.variants`）。本票不自行扩面。

## 5. 复刻清单逐条勾选

### 5.1 `t71-help-dissect.md` §E.3「复刻规格」1–20

| # | 项 | 属 F1／F2 独有 | 判定 | 证据 |
|---|---|---|---|---|
| 1 | 数据契约唯一输入（缺必填即报错） | 否 | 已满足（#78／#88） | `SCENE_DATA_SCHEMA`；`help-center-88.test.mjs:279` 人为重复 id 抛 `duplicate-id` |
| 2 | 唯一注入点／占位符 0 残留 | 否 | 已满足（#74／#88） | `help-center-88.test.mjs:230-260`（六标记逐个 0 ＋ 泛化残留 0） |
| 3 | 数据即真相（计数由数据算） | 否 | 已满足 | `helpCenter.ts` `subtitle` 由 `rendered`／`sceneCount` 计算 |
| 4 | 四层信息架构 | 否 | 已满足（Tab→子功能→卡→Sheet） | `help.ts` `renderGroupPage`／`renderSubgroup`／`renderSceneCard` |
| 5 | 卡片必备元素（含 `status` 徽章仍可复制） | 否 | 已满足 | `help.ts:462-473`；`SCENE_STATUS` 恒读冻结常量 |
| 6 | 搜索（吸顶／命中计数／高亮／自动展开） | 部分（F2 有计数；F3 也有） | 已满足（#88 S4） | `controls.ts:518-534`（`匹配 ` 前缀）＋ `render-copy-90.test.mjs` |
| 7 | 一键复制（含 editable_fields 拼接） | 否 | 已满足（三目标） | `HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS` |
| **8** | **示例／变体 prompt** | **是（F1 31 变体）** | **不补**（§4） | 探针 E：5 条／3 宿主／label 不可路由；本票测试 ⑤ 机械锁 |
| 9 | 复制反馈（toast ＋ `copied` 态） | 否 | 已满足（#88 S4／#121） | `COPY_RUNTIME_JS`；`copy-copied-121.test.mjs` |
| 10 | 参数表单实时预览 | 否（F3 有代码路径） | 不适用（B7 归插件 client；壳静态降级） | `help.ts:27-28`（R4 静态预览） |
| **11** | **每场景可执行命令展示（详情层可复制）** | **是（F1 `.prompt-cli`／F2 `.cli`）** | **已回补**（§3） | 探针 B／F；本票测试 ①②；产物 `data-field="cli"` × 341 |
| **12** | **空态／错误态（禁白屏）** | **是（F1／F2 有；F3 无 try/catch）** | 已满足（结构上不适用） | L-14：静态 HTML 无客户端解析步骤；渲染期缺失抛 `missing-data`（`skill-t11.test.mjs:122`）、schema 不符抛 `HelpSchemaError`、`mode` 非法 exit 2（`help-center-91.test.mjs:210`） |
| 13 | 响应式（375／768／1280 三档） | 否 | 超范围（归 **#89**，OPEN） | 地图串行序「#88 → #91 → #83 → …→ #89」 |
| 14 | 触控目标 ≥44px | 否 | 超范围（归 **#89**） | 同上（`--` 视觉锁 B1 逐值验收） |
| 15 | 离线自足（0 外部 src/href） | 否 | 已满足 | 壳产物单文件；`#88` file 态无外链 |
| 16 | 可访问性（toast `aria-live`／按钮 `aria-label`） | 否 | 已满足 | `controls.ts` toast 段 ＋ 壳 `aria-label`（`help.ts:448`） |
| **17** | **版本／来源戳（含「契约给了 subtitle 就必须渲染」）** | **部分（F2 数据驱动页脚／来源）** | 部分：`subtitle` **已渲染**（含 `更新于` 显式注入）；`version` 不发（L-11）；F2 的「源:merged(...)」**不补** | `help.ts:403-414`；L-10／L-11；不补理由＝内部数据来源标注属开发者元数据（ADR-0008 禁止展示底层） |
| 18 | 令牌单一来源（禁两套 `:root`） | 否 | 已满足 | `buildStyleSheet()`（#75） |
| 19 | 守卫测试（契约／占位符／计数／copyText 单实现） | 否 | 已满足（#88 三守卫） | `help-center-88.test.mjs:230-315` |
| **20** | **移动端 `<details>` 兜底（Android WebView 点击不翻转）** | **是（F1 `:422-438`／F2 `:518-534`；F3 无）** | 超范围（运行时交互归 base-paint helpers／插件 client） | 契约 §4.1「base-paint 只提供静态呈现＋复制」；且新壳 `details` 为原生 ＋ CSS-only，改 helpers 属 `packages/base-render/**`（#121 在飞，本票禁改） |

### 5.2 `t71-help-dissect.md` §D「能力对照表」里 F1／F2 独有的行

| §D # | 能力 | 代际 | 判定 |
|---|---|---|---|
| 3 | 搜索／过滤（含**计数**） | F2 ✅／F3 ✅ | 已满足（F2 的「匹配 M / N」在 F3／新版均有） |
| **6** | **逐场景 CLI 命令展示** | F1 ✅／F2 ✅／**F3 ❌** | **已回补**（§3） |
| **8** | **示例／变体 prompt** | **F1 ✅ 31 变体**／F2 ❌／F3 ❌ | **不补**（§4） |
| 10 | 版本／日期戳 | F1 硬编码／F2 数据驱动／F3 残缺 | 部分（§5.1 #17） |
| **13** | **空态／错误态** | F1 ✅／F2 ✅／**F3 ❌** | 已满足（§5.1 #12） |
| **23** | **数据驱动页脚／来源标注** | F1 ❌／**F2 ✅**／F3 ⚠️（读了不渲染） | 部分：`subtitle` 已渲染；「源:」不补（§5.1 #17） |
| 1／2／4／5／7／9／11／12／14–19／21／22 | —— | 三代共有或非 F1／F2 独有 | 已由 #88／#91／#121／#89 覆盖（不在本票范围） |

> §D 注记的 F1 死数据 `fill_hints`（40 项，JSON 里 82 次但**从不渲染**）→ **不适用**：它在 F1 页面上本就不可见，
> 不构成「用户能看见的独有能力」。

## 6. 落点与被渲染证据（三态）

复跑：`node docs/research/t106-probe-cli.mjs`（§2）＋ `node --test packages/skill-calorie/test/help-center-106.test.mjs`。

| 态 | 命令行 | 场景行 | 备注 |
|---|---|---|---|
| `file` | **341** 条 `data-field="cli"`（落在卡内 Sheet 里） | 436 `data-scene-id` | 产物体积 1,264,822 B |
| `inline` | **341** 条（同一 `SceneData` 同一填充器） | 436 | 片段 ＋ `<style>` 落点钉死（P-5 不变） |
| `text` | **0** 条 | 436（4 空格行） | 见台账 L-106-04 |

实测样本（`home_today_overview`）：卡面 `<code class="ilife-help-shell-cli">home_today_overview</code>`，
Sheet 内 `<li class="ilife-help-shell-field" data-field="cli"><span …-field-label>可执行命令</span>
<span …-field-value>calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'</span></li>`，
`复制参数` 按钮 `data-t="可执行命令: calorie-cmd-read calorie.view.home --params '{…}'"`。

## 7. 台账（L-106-01 … 08）

| # | 项 | 事实 | 处置 |
|---|---|---|---|
| L-106-01 | 派单前提「scenes[] 已有 `cli` 字段」 | 冻结契约恒七键、无 `cli` | 已勘误（§1），改用冻结槽位，**未扩面** |
| L-106-02 | CLI 覆盖 341/436 | 95 条 #81 判 non-exec（out-of-scope 10／legacy-chain 85） | 不发该行；不造占位文案 |
| L-106-03 | `复制参数` 文本变化 | exec 场景由「场景键」变为「`可执行命令: <cli>`」 | 用户可见变化，登记；语义仍走壳冻结的 `label: value` 口径 |
| L-106-04 | `text` 态不含命令行 | 纯文本索引；且 #88 D-3 锁「text 尖括号集恒 `{<N>}`」，CLI 含 `<照片路径>` 会撞该断言 | 登记不补（改 text 需动 `help-center-88.test.mjs`＝他票路径） |
| L-106-05 | 记身材照一词三命中 | `body_photo_add_single/_note/_batch` 取到**同一条**路由 CLI（路由层按唤醒词给键） | 如实照搬；三卡显示同一命令 |
| L-106-06 | 非等宽 | `field-value` 无等宽字体（t71 §E.3#11 说「等宽代码块」） | 差异登记；改等宽须动 `packages/base-render/src/style.ts`（#121 在飞／本票禁改） |
| L-106-07 | 产物体积 | file 态 1,264,822 B；本票 CLI 行贡献 **+231,168 B**（1,033,654 → 1,264,822） | 登记（L-16 已记 1,010,979 B 的体积偏离，本票再 +23%） |
| L-106-08 | 变体不补 | 见 §4 | 机械锁：本票测试 ⑤ 断言产物零出现变体 label／prompt |

## 8. 变异自证（src 级 · 单锁内 · sha256）

脚本 `docs/research/t106-mutate.mjs`；跑法 `node tooling/run-locked.mjs --ticket 106 -- node docs/research/t106-mutate.mjs`
→ `.scratch/t106/run-mutate.log`，末行 `RESULT: PASS`（runId `26408b4e-c86b-4b77-8448-ed257358caab`，exit 0）。

| 变异 | 内容 | 红 | 还原 sha256 | 绿 |
|---|---|---|---|---|
| **M1** | 口径层：`helpSceneCli` 恒返 `null` | `testExit=1 fail=4` → RED-AS-EXPECTED | `a85f02c2…e7b7e` match=true | `fail=0` → GREEN |
| **M2** | 接线层：新场景不挂 `editable_fields` | `testExit=1 fail=3` → RED-AS-EXPECTED | 同上 match=true | `fail=0` → GREEN |

`SHA-BEFORE`＝`SHA-AFTER`＝`a85f02c248ded841e7220b9477378647f283ec7b9c18756025b00d85199e7b7e`（还原自校通过；
还原口径＝内存原文写回 ＋ sha256，与 `t107-mutate.mjs` 同法）。

## 9. 门禁实测

| 门 | 命令 | exit | runId |
|---|---|---|---|
| ① build | `pnpm build` | **0** | `e87ece15-5014-4fc3-8961-9e80b1cf262f` |
| ② boundaries | `pnpm boundaries` | **0** | `05e6c5b7-5bd0-4b7f-98ad-f22fe2850dcc` |
| ③ snapshot:check | `pnpm snapshot:check` | **0** | `779d3c5d-0a05-4a85-b778-8c4e1d775f65` |
| ④ publish:pre | `pnpm publish:pre` | **0** | `e676e25a-20ef-47dc-a2fb-f4abc583a975` |
| 靶向（88／91／106／t11） | `node --test …` | **0**（49 pass／0 fail） | `f85722bb-c4fe-46b2-9df4-cfcd69583949` |
| canonical 轮 1 | `pnpm test` | 1（fail 31；**新增 2 ＝ #121 并发变异窗口**，见下） | `5d5d0415-a410-4417-8780-37927e05c79e` |
| canonical 轮 2 | `pnpm test` | 1（fail 25；**新增 0**／消失 5） | `b398825c-2b6b-4423-99ac-c724609810b0` |
| 复现 #121 单文件 | `node --test packages/base-render/test/copy-copied-121.test.mjs` | **0**（10 pass／0 fail） | `a238fac4-c103-4ed7-8fc8-b754170274c2` |

**fail-set 判据**（`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <log>`）：

- 轮 1：`base=34 after=31 新增=2 消失=5`。新增两条＝
  `#121 产出面（静态）`（suite 行）＋ `S3 \`copied\` 态 CSS 命中面齐全：…`，
  失败签名 **A 类内容断言**（`actual 'var(--blue)'` vs `expected 'var(--ok)'`），
  位于 `packages/base-render/test/copy-copied-121.test.mjs:240`。
- **分类（按 `docs/research/t88-delta-flake-ruling.md` §2／§5／§6／§7／§8 逐条）**：
  - §2-A（内容断言）→ 表面属「真 delta」，但**失败对象不在本票路径所有权内**（该文件由 #121 的
    commit `d0e0546` 引入，被测对象 `packages/base-render/src/style.ts` 同属 #121）。
  - §6-1（归属过滤）＋§7-3（陈旧 `dist` 假红）：轮 2 干净重建后 **新增 0**；单文件复跑 **10/10 全绿**；
    当前产物实测 `.ilife-help-shell-btn.copied { background: var(--ok) }`。
    → 轮 1 的两条＝**他票（#121）在途变异窗口**下读到被变异的 `dist`（当时 `--blue`），**非本票 delta**。
  - **纪律声明**：本票**不自行援引** §6-1 豁免（§6 明写「只能由编排者逐条裁」）；此处只登记事实形态，
    请编排者裁定。
- 轮 2 结论：**新增 0**（消失 5 条为基线内既有红转绿：`#41 M3`／`#76`／`#80`／`helpers ≤820px`／`check-combos`）。
- **并发上下文（§3 要求）**：轮 1（14:51:10Z）时同时有 **≥3 个 session**（`#82` 正在 SKILL.md 上跑变异周期：
  同期 `git checkout HEAD -- SKILL.md` ×2 与 `t82-*` 探针 ×4；`121-review-blue` 刚跑完 `pnpm build`／靶向；
  `121-review-red` 紧随其后启动）。轮 2（14:53:41Z）时 `#82` 仍在跑，但 `#121` 两席已进入证据落盘期。
  两轮均**未**同时跑 headless 浏览器实证以外的额外全量（浏览器实证 `#76` 含在 canonical 内）。

**事故纪律自检**：两轮 canonical 后 `git status --short` 中 `packages/skill-calorie/SKILL.md` **无改动**；
未出现 `Bin … -> …`（零填充）签名。同期观察到的 `SKILL.md` 短暂 ` M`（`看今日主頁` 单字）经查为
**#82 session 的变异周期**（`gate-runs.log` 同期 `git checkout HEAD -- …SKILL.md` 两条），与本票无关，**未触碰**。

## 10. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 106 --since 2026-09-09T14:45:00Z --until 2026-09-09T14:55:30Z`（**窗口右端停在收尾提交前**——
收尾 `git add`／`git commit` 条目落在窗口外，属协议 §2.4-4 允许的「提交后 git 条目」）。
对账源导出：`docs/research/t106-gate-runs.log`（受 git 跟踪）。

**窗口内本席全部 17 次运行逐条声明**（含 4 次 exit≠0 的过程／canonical 运行，故用 `--allow-nonzero`）。

GATE-RELAX flag=--allow-nonzero reason=① canonical `pnpm test` 因冻结基线既有红必然 exit=1（判据＝失败集新增=0，非 exit 码，见 §9）；② 首跑靶向因本席新测试三处断言自身写错 exit=1（当场修完即绿）；③ 一次 `git commit --only` 因新文件未 `git add` 报 `pathspec` exit=1（随后补 `git add` 成功）；④ 一次四门串跑因包装器内无 `pwsh` exit=1（改为四门分跑）。②③④ 均非门禁证据，仅为如实留痕。

```
GATE-RUN runId=8bc849e2-15c8-4296-aed7-6cfead687758 cmd=pnpm build
GATE-RUN runId=a66f435a-fcd2-4038-9c4c-0766caf912c2 cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
GATE-RUN runId=a89f0748-040a-4b95-817e-6e20462c20af cmd=node --test packages/skill-calorie/test/help-center-106.test.mjs
GATE-RUN runId=acd591a8-c2b6-4964-a467-a432d62a87cc cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
GATE-RUN runId=b2e83287-b56c-4f71-891a-b144c453b5c2 cmd=git commit --only packages/skill-calorie/src/render/helpCenter.ts packages/skill-calorie/test/help-center-106.test.mjs -F .scratch/t106/msg-1.txt
GATE-RUN runId=2bc5a722-4ef2-4750-967c-9f21eba6724f cmd=git add packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/src/render/helpCenter.ts
GATE-RUN runId=a4ec0df1-5258-4437-a040-00795afa3ca4 cmd=git commit --only packages/skill-calorie/src/render/helpCenter.ts packages/skill-calorie/test/help-center-106.test.mjs -F .scratch/t106/msg-1.txt
GATE-RUN runId=52bb2758-7742-4413-a3b4-e550d28016d8 cmd=pwsh -NoProfile -Command
GATE-RUN runId=e87ece15-5014-4fc3-8961-9e80b1cf262f cmd=pnpm build
GATE-RUN runId=05e6c5b7-5bd0-4b7f-98ad-f22fe2850dcc cmd=pnpm boundaries
GATE-RUN runId=779d3c5d-0a05-4a85-b778-8c4e1d775f65 cmd=pnpm snapshot:check
GATE-RUN runId=e676e25a-20ef-47dc-a2fb-f4abc583a975 cmd=pnpm publish:pre
GATE-RUN runId=5d5d0415-a410-4417-8780-37927e05c79e cmd=pnpm test
GATE-RUN runId=a238fac4-c103-4ed7-8fc8-b754170274c2 cmd=node --test packages/base-render/test/copy-copied-121.test.mjs
GATE-RUN runId=26408b4e-c86b-4b77-8448-ed257358caab cmd=node docs/research/t106-mutate.mjs
GATE-RUN runId=b398825c-2b6b-4423-99ac-c724609810b0 cmd=pnpm test
GATE-RUN runId=f85722bb-c4fe-46b2-9df4-cfcd69583949 cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
```

对账命令与结果：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t106-help-cli-backfill.md --ticket 106 \
  --since 2026-09-09T14:45:00Z --until 2026-09-09T14:55:30Z --allow-nonzero \
  --export docs/research/t106-gate-runs.log
# → RESULT: matched=17/17 scoped=17 undeclared=0 ; gate-audit: PASS
```


## 11. 复跑入口（全部只读／断言式）

```powershell
node docs/research/t106-probe-cli.mjs                 # 11/11：契约无 cli／覆盖 341／死命令 376／变体不可路由／三态
node tooling/run-locked.mjs --ticket 106 -- node --test packages/skill-calorie/test/help-center-88.test.mjs `
  packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs `
  packages/skill-calorie/test/skill-t11.test.mjs      # 49 pass / 0 fail
node tooling/run-locked.mjs --ticket 106 -- node docs/research/t106-mutate.mjs   # M1/M2 红→还原→绿
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t106/canonical-2.log  # 新增 0
```

## 12. 未做／风险 top3

1. **未做：变体示例**（§4）。若维护者裁定必须补，需先解决「变体 label 不可路由」并走 #92 冻结面追加；
   本票不自行扩面。
2. **未做：卡级 CLI 展示**。F1／F2 把 CLI 放在卡片行内；新版卡级文本被壳冻结为 `Scene.id`，
   改它＝改 `packages/base-render/src/help.ts`（#121 在飞，本票禁改）。当前为「卡级 id ＋ 详情级 CLI」两段式。
3. **风险：产物体积 +231 KB（+23%）**（L-106-07）；若后续票（#89／#83）以体积为验收项，
   需回到「是否保留 341 条 CLI 行」的口径再议（本票不擅自压缩或抽样）。
