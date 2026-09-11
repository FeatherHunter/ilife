# t163 · 公共层提取与边界：现有可复用件盘点 ＋ 接口提案

> 票：wayfinder #163（地图 #152 场景 07 基础信息）。本票**只出接口与清单，不实现**。
> 用词沿 `docs/agents/wording.md`：公共层＝跨技能可复用的组件；「预检确认页」是本票对「写前确认页」的**唯一**写法。
> 本版是红队复核（`.scratch/t163/review-inventory.md`）后的**返工稿**：被证伪的句子已删，不保留旧说法。

**本图 3 类产物**（四条唤醒词，`packages/skill-calorie/src/triggers/scene-07-profile.ts:5-8`）：

| 唤醒词 | 命令 | `output_type` | 今天实际走的路 | 本图要的产物 |
|---|---|---|---|---|
| 设置档案 | `calorie.profile.set` | receipt | `cli/write.ts:760-786` 内联小节气 HTML（`:196-202`） | **预检确认页**（写前） |
| 设活动量 | `calorie.profile.activity` | receipt | `cli/write.ts:787-794` | **预检确认页**（写前） |
| 改档案 | `calorie.profile.update` | receipt | `cli/write.ts:760-786` | **预检确认页**（写前，要显示改前值） |
| 查档案 | `calorie.view.profile` | result | `cli/cmd_read.ts:1014-1022` → `renderProfileHtml` | **结果页** |

**四条命令今天真跑的产出（本席实跑，`SKILLS_DB_PATH` 设临时目录）**：

- 写词：`设置档案_回执_20260911_212301.html` ＝ **245** 字节，`delivery.template` ＝ `receipt`。`设活动量` 214／`改档案` 237 字节由红队按 `write.ts:196-202` 逐字复算（红队报告 §2.2），本席未复跑。
- 读词：`档案视图_20260911_212301.html` ＝ **1288** 字节，`shape=stat`，`delivery.template` ＝ **`fragment`**（红队实跑 1358 字节——该值随库内容变）。
- 四条产物一律 `doctype=false`／`charset=false`／`styleTag=false`：**没有一条是可独立打开的文档**。
- **验收口径先定死**：「拿到 HTML」＝**完整文档**（`<!DOCTYPE html>` ＋ `<meta charset="utf-8">` ＋ `<style>`），标准取 `packages/base-render/src/help.ts:34-37` 已写下的那条（含中文的 UTF-8 文件经 `file://` 打开不乱码的前提）。照这条，四条命令今天一条都不达标。
- **挡目标**：`查档案` 的 HELP 条目是一条**死命令**。本席实跑 `calorie-cmd-read calorie.help.lookup --params '{"q":"查档案"}'` → `cli="python scripts/render_crud_view.py --entity profile --chain \"1.识别→2.读DB→3.算TDEE\""`，而 `packages/` 下 `*.py` 零命中；该串来自 `scene-07-profile.ts:8` 的 `main_prompt.cli`，经 `helpCenter.ts:236-242`（legacy 分支）原样当 `Scene.id` 展示。

---

## 一、现有可复用件总表

「能服务本图 3 类产物」列：**回执**＝3 条写入词的写后回执页；**预检**＝写前预检确认页；**结果**＝`查档案` 的结果页。

### 1.1 `packages/base-render/src/`（包名 `base-paint`，跨技能公共层）

| 件 | 吃什么数据 | 产出什么 | 现在谁在用（证据） | 回执 | 预检 | 结果 |
|---|---|---|---|---|---|---|
| `blocks.ts` 区块组件 | 各区块自持结构（见 §2） | HTML 字符串 ＋ `blocksCss()` | 卡路里 **7** 个文档页：`wizardPortDocs.ts:23`、`dietDocs.ts:29,31`、`nutritionPortDocs.ts:30`、`sportDocs.ts:32,34`、`sportPortDocs.ts:31`、`trendDocs.ts:31`、`trendMiscPortDocs.ts:19` | — | **主力** | **主力** |
| `template.ts` `fillTemplate` | `{template, assets, data?, strict?, content?}` | 填好五个占位符的 HTML ＋ `report{markers,bytes}` | 卡路里全部文档页：`wizardPortDocs.ts:56-60`；bill 自持签名不同的同名函数（`skill-bill/src/render/html.ts:60`，**不共用**） | 可 | 可 | 可 |
| `controls.ts` `renderErrorReceipt`／`renderStatusBadge`／`renderEmptyState`／`renderActionBar` | 见 `spec/controls.ts` | 错误回执／状态徽章／空态／复制按钮行 | `render/html.ts:252-259`；`cmd_read.ts:1114`；`blocks.ts:214,279,365,587` 组合层消费；`render/copy.ts:38-40` | **可** | 可 | 可 |
| `text.ts` `buildDataText` | `{envelope, format?, title?, occurredAt?}` | 按 5 shape 投影的复制文本 | `cmd_read.ts:1039-1048` 文本态；`wizardPortDocs.ts:74` | 可（`receipt`→`ok`＋`message`） | 可 | 可（`stat`→`metrics` 逐字段） |
| `style.ts` `buildStyleSheet`＋`token`／`cx` | `{prefix?, extraCss?}` | 11 个 CSS 变量 ＋ 8 个控件样式区 | `wizardPortDocs.ts:58`（`buildStyleSheet().css + blocksCss()`）；`render/html.ts:14,41-62` 只用 `token`／`cx` | 可 | 可 | 可 |
| `charts.ts` `charts` 8 接口 | 各图表 input（`spec/charts.ts:154-195`） | SVG 字符串 | `blocks renderChartBlock`；卡路里文档页数据块 | — | — | 可选 |
| `help.ts` `renderHelpShell` | `HelpShellInput{sceneData, assets, strict?, template?}` | 完整 HTML 文档（三级目录） | `render/helpFile.ts:71-72`、`helpShell.ts:22-24` | — | — | — |
| `contract.ts` `renderPage`／`renderReco`／`escapeHtml` | `PageDescriptor` ＋ envelope | 骨架页／占位页／转义 | `render/html.ts:14` 用 `escapeHtml`；`cmd_read.ts:1130` 失败回执 | 转义必用 | 转义必用 | 转义必用 |

**两条附注**：① `blocks.ts` 实有 **13** 个 `render*` 导出（`grep '^export function render'`：`renderPageShell:166`／`renderKpiCard:197`／`renderKpiGrid:224`／`renderDataTable:260`／`renderChartBlock:313`／`renderListRows:358`／`renderPreBlock:399`／`renderDetailSection:446`／`renderDisclosure:499`／`renderParamForm:531`／`renderEmptyBlock:580`／`renderCopyBlock:601`／`renderFeedbackBlock:635`），`docs/visual-spec-blocks.md:1` 记「12 个区块组件」——`renderKpiCard` 是 `renderKpiGrid` 的单元件、`renderDetailSection` 是 B-07 详情区，两者都在册。② `charts` 与 `ui`／`injector.ts`（页描述子注册／sidebar 槽位装配）在本图 3 类产物里**是否真会用到**，本次未跑证据，属「能服务但不一定需要」。

### 1.2 `packages/skill-calorie/src/render/`（卡路里包内）

| 件 | 吃什么数据 | 产出什么 | 现在谁在用（证据） | 回执 | 预检 | 结果 |
|---|---|---|---|---|---|---|
| `receipt.ts` `buildCrudReceipt`／`buildErrorReceipt`／`withM5` | 见 §2.3 与 `receipt.ts:15-18,43-54` | `CrudReceipt`（含 M5 七字段）／`ErrorReceipt` | `cli/write.ts:53,211-218` 35 条写命令统一入口（`:299` 统一补 `affectedRows`，来源 `sqlite:total_changes`）；`cmd_read.ts:1102-1113` | **核心** | — | — |
| `envelope.ts` `buildDelivery`／`withDelivery`／`deliveryTemplateOf` | `{mode, path?, shape, html?, bytes?, template?}` | 顶层 `delivery` 字段（`path` 必须绝对路径） | `cmd_read.ts:1077-1092` 三态交付；`envelope.ts:160-167` 结构判族 | **核心** | 可 | **核心** |
| `wizardPort.ts` 四个预检数据模型 | 见 §2.1 | `MeasureWizardView` 等四视图（各含 `prompt`） | `cmd_read.ts:550-574` → `wizardPortDocs.ts` | — | **最像的现成件** | — |
| `wizardPortDocs.ts` `assemble` ＋ 4 个 doc | 上面四个视图 | 完整 HTML 文档（`<!doctype …>` ＋ `charset` ＋ `CONTENT` 槽） | `cmd_read.ts:550-574` | — | **主力** | **主力** |
| `profilePlate.ts` `buildProfileView` | 库（`user_profile#1` ＋ `nutrition_goal` ＋ `weight_log`） | `ProfileView{profile, nutrition, latestWeightKg, hasGoal}` | `cmd_read.ts:1015` | — | **不能用**（缺档案即抛 `missing-data`，见 §五.6） | **数据唯一来源** |
| `html.ts` 44 个 `render*`（含 `renderProfileHtml:639`） | 各盘视图 | `<section>` **片段**（无 doctype／无 charset／无 `<style>`） | `cmd_read.ts:347,625-670,948-986,1021` | — | — | **现状，需换；其余是本图反例，见 §4.2** |
| `copy.ts` `copyActionHtml`／`copyRuntimeScriptHtml`／`COPY_RUNTIME_JS` | `buildSharedHelpersJs()` 产出文本 | 复制按钮与页面侧运行时 | `wizardPortDocs.ts:33,79`；`html.ts:238,249` | 可 | **可** | 可 |
| `helpCenter.ts`／`helpFile.ts`／`helpShell.ts` | 唤醒词资产 → 5 字段 JSON | help 模板全页 HTML ＋ 看板页入口块 | `cmd_read.ts:91-94` | — | — | — |
| `templates.ts` `loadTemplate` 6 模板 | 模板名（`CALORIE_TEMPLATES:7-14` 六个） | 模板文本（**填不进任何页面**，见 §4.1） | `render/index.ts:69` 导出；`helpCenter.ts:47` import，`:325-339` 逐件读盘抽锚点，`:473,476` 每次渲染速查台都拼进 `meta_blocks`（看板页入口） | — | — | **反例＋活数据源** |
| `render/index.ts` 出口 | — | 汇总再导出 | 三态分流：`receipt` 形走 `cli/write.ts`；`result`／`stat` 形走 `cmd_read.ts` dispatch（`:335-1026`） | — | — | — |

### 1.3 数据与交付侧

| 件 | 吃什么数据 | 产出什么 | 现在谁在用（证据） |
|---|---|---|---|
| `cli/keys.ts` 命令表 | — | 99 条命令 ＋ shape（写命令 35 条一律 `receipt`） | `keys.ts:14-50` 写命令、`:58` 起读命令；档案三支在 `:38-40` |
| `cli/write.ts` 写入分发 | `params` ＋库 | `{ok, message, receipt}` ＋内联小节 HTML | `write.ts:59` 形状、`:294-305` 单一分发、档案三支 `:760-794` |
| `output.ts` 交付与命名 | `{key, params, explicit?, target?, html}`／命令 `title` ＋时间戳 | `{mode:'file', path 绝对, bytes}` 或 `{mode:'inline'}`；`<中文command>[_类型段][_动态段][_内容标识]_<TS>[_N].html` | `cmd_read.ts:1086`；`output.ts:199-235` 落盘、`:159-175` 独占创建＋`EEXIST` 递补、`:103-119` 段拼接、`:244-252` 类型段（**只对 `receipt` 返段**，见 §2.4） |
| `fetch/profile.ts` | 库 | `ProfileRow`（`id/age/gender/height_cm/note/activity_level`） | `profile.ts:13-20`；写 `setProfile:88`／`setActivityLevel:103`／`updateProfile:117` |
| `analysis/utils.ts` | 档案例 | 活动量系数与中文名 | `utils.ts:29-43`：`TDEE_ACTIVITY_FACTORS`／`ACTIVITY_LEVEL_LABELS`；`calcTdee:51-55` |
| 测试（可被本图接口断言） | — | 落盘／绝对路径／字段锁 | `test/help-delivery-139.test.mjs:93-105`（`data.output` 绝对路径、`delivery.path` 同值同源、`bytes`＝落盘字节）；`test/help-shell-134.test.mjs:108-119` |

### 1.4 相关文档

| 文档 | 状态 |
|---|---|
| `docs/base-paint-contract.md` | 存在（**本席重数 1409 行**），是上表的契约正本；按 `docs/agents/doc-homes.md:54` 搬后应为 `docs/base/base-render/contract-v1.md`（该路径**今天不存在**，`docs/base/` 无此目录） |
| `docs/visual-spec-blocks.md` | 存在（12 区块视觉尺）；与 `blocks.ts` 对应 |
| `docs/skills/skill-calorie/core-approach.md` | 存在（本图最高准则；`:173-186` 是「prompt 让先问／先确认、模板却是写后回执」的对照表，只点 `设置档案`／`改档案` 两条） |

---

## 二、本图 3 类产物：部件与接口提案

**只定接口，不定长相。** 下表的「字段」是组件吃的数据，「槽位」是页面可以填的位置。

### 2.1 产物一：写前**预检确认页**（3 条写入词）

今天没有这件东西：`设置档案`／`改档案` 的 prompt 让 AI 先问、先确认（`scene-07-profile.ts:5,7` 的 `____` 空位），但 `html_template` 都是 `templates/crud_receipt.html`（写完之后）。

**数据模型：`ProfilePrecheckView`**（三条写入词共用一个模型，字段全可选、按实际缺哪个填哪个）

| 字段 | 类型 | 谁产出（现成来源） |
|---|---|---|
| `wakeWord` | `string` | `scene-07-profile.ts:5-7` 的 `wake_word` 原文 |
| `command` | `string` | `cli/keys.ts:38-40` 的命令字面（如 `calorie.profile.set`） |
| `before` | `ProfileRow \| null` | `fetch/profile.ts:58-63` `getProfile`。**不要复用 `buildProfileView`**——它缺档案即抛 `missing-data`（`profilePlate.ts:23`），会把预检页变成「没有产物」 |
| `draft` | `{age?, gender?, heightCm?, activityLevel?, note?}` | 调用方（用户已说／未说的字段），字段名逐字对齐 `profile.ts:114` `PROFILE_UPDATABLE` |
| `activityChoices` | `{value, label, factor}[]` | `analysis/utils.ts:29-43`（系数 5 档 ＋ 中文名） |
| `recommendReason` | `string \| undefined` | **调用方传参**，不进数据层：全仓没有任何「按日常情况推荐活动量」的实现（`grep recommend` 只有营养目标与饮水推荐）。这句是 AI 对用户说的话，不是库里的值 |
| `latestWeightKg` | `number \| null` | 与 `profilePlate.ts:27` 同一句查库——**要么接受在预检页再抄一次这段 SQL，要么把它提成一个共享取数函数**，本票只标记选择点 |
| `prompt` | `string` | 复制给 AI 的文本；形态照 `wizardPort.ts:102-113,164-192` |
| `filledCount` / `totalCount` | `number` | 数据层算好，组件不做数学（沿 `html.ts:1-5` 红线） |

**槽位（可以填的位置，4～5 个字段用得到的就是这些）**

| 槽位 | 内容 | 现成件 |
|---|---|---|
| 标题区 | 唤醒词／`eyebrow`／副标题 | `renderPageShell`（`blocks.ts:166-181`） |
| 字段区 | 每字段：`name`／`label`／`value`／`hint`／`required` | `renderParamForm`（`blocks.ts:531-569`，静态 `label`＋`input`、零脚本；「空值不挡提交」是既有裁定，本轮不为校验加脚本） |
| 改前对照区 | 逐字段「原值 → 新值」 | `renderDataTable`（`blocks.ts:260-296`，列：字段／原值／新值） |
| prompt 预览 | 逐字 prompt | `renderPreBlock`（`blocks.ts:399-418`） |
| 复制区 | 「复制 prompt（必走）」按钮 | `copyActionHtml`（`render/copy.ts:38-40`）＋ `renderCopyBlock`（`blocks.ts:601-626`） |
| 正文槽 | 以上拼好后放进整页 | `fillTemplate(…, content)`（`template.ts:218`） |

**两条必须写清的陷阱**：

1. **活动量五档的「TDEE 影响」列**：`analysis/utils.ts:51-55` 的 `calcTdee` 在**缺体重或缺身高时恒返 1800**，五档会显示五个一模一样的数。要么数据层在缺项时不出这一列，要么这一列不进本图。
2. **`stat` 形的 `metrics` 值必须全是 number**（`base-link-core/src/envelope.ts:16,66-73`）。`gender`／`activity_level`／`activity_factor` 的中文名、推荐理由都是字符串，**永远进不了 `metrics`**；只能放 `data` 的其它字段或只进 HTML。

**三条写入词各自的预填差别**：`设置档案`＝4 个空位（身高／年龄／性别／日常活动情况）；`改档案`＝5 个空位且**必须带改前值**（`scene-07-profile.ts:7`「改之前请先确认我原来的值」）；`设活动量`＝单字段五档选择（`scene-07-profile.ts:6`）。

### 2.2 产物二：**结果型页面**（`查档案`）

**数据模型**：直接用 `ProfileView`（`render/profilePlate.ts:14-19`），**不加字段**。

- `metrics` 今天只投影 5 个字段名（`cmd_read.ts:1016-1020`：`age`／`heightCm`／`hasGoal`／`latestWeightKg`／`calorieGoal`），并经 `nums()` 丢空值——实测刚建档、无目标无体重时只剩 `{age,heightCm,hasGoal}` 三个。
- `scene-07-profile.ts:8` 的 `data_fields` 还要 `gender`／`activity_level`／`activity_factor`／`weight_kg`／`bmi`／`bmr`／`tdee`。**数值类**（`bmi`／`bmr`／`tdee`）能进 `metrics`；**字符串类**（活动量／性别的中文名）只能进 `data` 的其它字段或只进 HTML。**缺口清单，归后续页面交付票。**
- **创建／更新时间**今天连 `ProfileRow` 都没有（`fetch/profile.ts:13-20` 六个字段，无时间列）——照搬老页会缺「档案创建／档案更新」两行。

| 槽位 | 内容 | 现成件 |
|---|---|---|
| 标题区 | 「档案视图」 | `renderPageShell` |
| 指标区 | 身高／年龄／性别／活动量／备注／目标／最新体重／BMI／BMR／TDEE | `renderKpiGrid` |
| 目标明细 | 四项营养目标（`nutrition?.calorie_goal` 等） | `renderListRows`（`blocks.ts:358-383`） |
| 数据缺口区 | 未设档案（今天抛 `missing-data` 退出 4） | `renderEmptyBlock` |
| 正文槽 | 整页 | 同 `wizardPortDocs.ts:41-61` 的 `DOC_SHELL` ＋ `assemble` |

### 2.3 产物三：**写后回执页**（是否归本图，见 §五.7）

**数据模型**：`CrudReceipt`（`render/receipt.ts:43-54` ＋ M5 七字段）。

**一条必须写清的边界**：冻结的 `receipt` 形状只要求 `{ok, message}` 两个字段（`base-link-core/src/envelope.ts:17,74-78`），**`receipt` 对象是技能侧追加的第三个字段**（`cli/write.ts:59` 的 `{ok, message, receipt}`），不入冻结面。预检确认页与结果页都据此挂在 `data` 的追加字段上，不改六形状。

今天三条写入命令实测的字段值（本席实跑 ＋ 红队复算，`SKILLS_DB_PATH` 临时目录）：

| 字段 | `calorie.profile.set` | `calorie.profile.activity` | `calorie.profile.update` |
|---|---|---|---|
| `key`／`shape` | `calorie.profile.set`／`receipt` | `calorie.profile.activity`／`receipt` | `calorie.profile.update`／`receipt` |
| `data.ok`／`data.message` | `true`／`已设置档案（身高 175 · 年龄 30 · 活动量 moderate）` | `true`／`已设活动量：moderate→active` | `true`／`已改档案（身高 176 · 年龄 30 · 活动量 active）` |
| `receipt.scene`／`op`／`recordId` | `设置档案`／`update`／`1` | `设活动量`／`update`／`1` | `改档案`／`update`／`1` |
| `receipt.items`／`noChange`／`ids`／`idSource` | `[]`／`false`／`[1]`／`singleton` | `[]`／`false`／`[1]`／`singleton` | `[]`／`false`／`[1]`／`singleton` |
| `receipt.affectedRows`／`writtenFields` | `2`／`[age, gender, heightCm, activityLevel]` | `1`／`[activityLevel]` | `1`／`[heightCm]` |
| `delivery` | `{mode:file, path:<绝对路径>, template:receipt, bytes:245}` | `…bytes:214` | `…bytes:237` |

| 槽位 | 内容 | 现成件 |
|---|---|---|
| 标题区／状态徽章 | `scene`；成功／无变化（`noChange`）／失败 | `renderPageShell`；`renderStatusBadge`（`controls.ts:1206-1212`） |
| 摘要区／逐条明细 | `summary`＋`op`＋`recordId`；`items[].{id,date,status,reason,detail}` | `renderKpiGrid`；`renderDataTable` |
| 改动字段／改前改后 | `writtenFields`＋`affectedRows`＋`meta.actionAt`；档案三支今天**没有**改前改后 | `renderListRows`；`renderDataTable` |
| 复制／失败回执 | `buildDataText`（`receipt` 投影＝`ok`＋`message` 两行）／`buildLogText`；`buildErrorReceipt` → `renderErrorHtml` | `renderCopyBlock`；`controls.renderErrorReceipt`（`controls.ts:1244-1271`） |
| 正文槽 | 整页 | `DOC_SHELL` ＋ `assemble` |

**三条写入命令共用同一个 `CrudReceipt` 形状**（上表：仅 `scene`／`writtenFields`／`affectedRows`／文案不同）——所以回执页**一件组件服务三条命令**。

### 2.4 预检页／结果页由哪条命令产出、怎么登记（本图必须收口的一件事）

HTML 只能由命令产出（仓库口径「严禁手写 HTML 兜底」，`test/delivery-83.test.mjs:1-4`），唯一出口是 `calorie-cmd-read`。→ 本图要新增**一条只读渲染命令**（照 `wizardPortDocs.ts:41-61` 出完整文档），命令名待定。配套三项：

- **落盘名今天没有任何机制能产出过程／结果段**：`output.ts:249-252` 的 `sceneTypeFor` **只对 `shape==='receipt'` 返 `'receipt'`，其余一律 `null`**；`OUTPUT_TYPE_LABELS`（`:245`）里写着 `process:'过程'`／`result:'结果'`，但今天没有一条命令走到它们。实测：`calorie.profile.set` → `设置档案_回执_<TS>.html`（对），`calorie.view.profile` → `档案视图_<TS>.html`（**连 `_结果_` 段都没有**）。
- **两条路的成本，必须选一条**：**甲·接受现成命名**（建议）——新命令 `title` 取「档案预检」之类 → 落盘名 `档案预检_<TS>.html`，**不动 `output.ts`**，今天就能出完整文档。**乙·显式建表**——在 `output.ts` 加一张「哪个命令归过程／结果」的表（别靠 `shape` 猜），才有 `_过程_` 段；代价是改 `output.ts` ＋ 修 `test/output-naming-119.test.mjs` 的既有口径，若同时把 HELP 资产的 `output_type` 改成 `process`，还要同批改两处断言（§五.5）。收益只是名字好认，**建议单独一张小票，别塞进本图**。
- **新命令要登记三处，少一处都不通**：① `cli/keys.ts` 的 `CALORIE_COMBOS`（`title` 决定落盘中文名，`output.ts:111`）；② `packages/base-combos/combos.yaml`（同值镜像，`test/output-naming-87.test.mjs:124-137` 逐命令钉死；档案三支在 `:441,446,451`）；③ 重跑 `scripts/build-help.mjs` 生成 `SKILL.md` 的命令表（`:223-232` 只重写标记块）——**AI 就是靠这张表知道该跑哪条命令**（`SKILL.md:100-146`），不重跑，新命令对 AI 不存在。
- **一条命令服务三条词的取舍**：可以，但落盘名只能有一个中文名，三条词会同名；要三个名字就得两条以上新命令。票面要有结论。

---

## 三、归属建议

| 部件 | 建议归属 | 理由（有证据的复用面） |
|---|---|---|
| 区块组件（`blocks.ts` 13 个 `render*`，含标题区／KPI 卡／表格／列表行／表单区／折叠区／指令块／复制区／空态／反馈区／图表／详情区） | **已在 `packages/base-render/src/blocks.ts`，不动** | 卡路里 **7** 个文档页共用（§1.1 证据列）；`base-render/package.json:10` 已开 `./blocks` 子路径出口 |
| 占位符填充 `fillTemplate`／共享 CSS `buildStyleSheet`／复制 `renderActionBar`＋`bindCopyAction`／序列化 `buildDataText` | **已在 `packages/base-render/src/`，不动** | 7 个卡路里文档页共用；bill 也用 `base-paint/help-shell`（`skill-bill/src/render/helpFile.ts:19`），chef／home／schedule 对 `base-paint` 零命中 |
| 「整页组合」`assemble`（`DOC_SHELL` ＋ `sharedCss = buildStyleSheet().css + blocksCss()` ＋ `fillTemplate.content`） | **提取到卡路里公共层**（`skill-calorie/src/render/`） | 今天 **7** 份拷贝：`wizardPortDocs.ts:49`／`dietDocs.ts:75`／`nutritionPortDocs.ts:60`／`sportDocs.ts:72`／`sportPortDocs.ts:63`／`trendDocs.ts:59`／`trendMiscPortDocs.ts:53`。**不进 base**：bill 自持一套 `fillTemplate`，chef 未用，跨技能面未证实。**页面交付票必须先把这层抽出来，否则预检页就是第 8 份拷贝** |
| `ProfilePrecheckView`＋预检确认页组合件 | **卡路里公共层** | 只有卡路里语义（`user_profile` 五字段／活动量五档）。卡路里包内复用面已存在（`core-approach.md:173-186` 点名两条；同批还有别的写入词，但见 §五.1 的数字问题） |
| 字段行模型（`{name,label,value,hint,required}`） | **就地用 `blocks.ts:515-521` `ParamFieldInput`，不另造** | 已存在且是 `renderParamForm` 的入参；卡路里侧只在 `wizardPortDocs.ts:101-116,166-181` 拼装 |
| 活动量五档（值／中文名／系数）与中文标签映射（活动量／性别／字段名） | **就地用 `analysis/utils.ts:29-43`，不另造** | 已是唯一来源；中文别名归一在 `fetch/profile.ts:22-28`。档案字段标签今天**不存在**，本图第一次需要，就地实现一处 |
| 「改前→改后」对照件 | **就地实现**（先用 `renderDataTable` 三列） | 复用证据只有 `tagDiff`（照片标签，`receipt.ts:15-18`）。跨技能面未证实，先别上移 |
| 档案结果页组合件 | **卡路里公共层** | `ProfileView`＋`renderProfileHtml` 已是卡路里专属，且 `查档案` 是当前唯一入口（`cmd_read.ts:1014`） |

**分歧点**（需要维护者裁）：**「预检确认页」这个组合体本身该算卡路里公共层还是 base 公共层。**
- 留在卡路里的证据：今天唯一的两个预检页实现都在卡路里（`wizardPort.ts` → `wizardPortDocs.ts`）；`base-paint/blocks` 的消费方**全在卡路里**（7 个文件）。
- 上移 base 的证据：**今天不存在**——bill 只用了 `base-paint/help-shell`、自持一套签名不同的 `fillTemplate`（`skill-bill/src/render/html.ts:60`），chef／home／schedule 对 `base-paint` 零命中。
- 补一条：真要上移，**现成的跨技能面是 `help-shell`**（bill 已在用 `skill-bill/src/render/helpFile.ts:19`），先上移已被两个技能用着的东西，比先上移只有一个技能用的东西更站得住。

---

## 四、反例（看起来能复用、实际不合适）

1. **`packages/skill-calorie/templates/*.html`（6 个）** —— 看起来是现成页面模板，**实际填不进任何页面**，但**不是死文件**。
   - **填不进去**：六件**全部没有** `<!--INJECT-DATA-->` 与 `<!--CONTENT-->`（载荷槽两成员皆无 → `legacy` 型，`spec/template.ts:104`），`fillTemplate` 抛 **`marker-missing`**——判定次序里 `marker-missing` 排在 `marker-conflict` 之前（`spec/template.ts:283-292`），**这才是首因**。附注：`home.html:7`（六件同）是 `<style><!--SHARED-CSS--></style>`，标记被预包裹，违不变量②（`spec/template.ts:190-202`），但不是首因，去修预包裹没用。
   - **不是死文件**：`helpCenter.ts:47` 直接 import 它们，`:325-339` 的 `buildHelpViewEntries` **逐件真读盘**并抽三个锚点（`<h1>` 页名／`<p class="lead">` 一句说明／`<pre class="view-cli">` 取数命令，各**恰 1 处**，命令必须以 `calorie-cmd-read ` 开头，否则抛 `bad-input`／`missing-data`），`:473,476` 在 `renderHelpCenterHtml` 里**每次渲染都调用**并拼进 `meta_blocks`（速查台的**看板页入口**）。`test/skill-t11.test.mjs:14,59,77` 把「模板文件集合＝`CALORIE_TEMPLATES`」与「入口序」钉死。→ **动这六件之前必须先看这三个锚点约束**；按「没人 import、可以重写／删除」去动手，会**打掉速查台的看板页入口**。另：`home.html:38` 还有一段自写内联 `<script>function copyData(){…}`，与「零内联脚本」口径冲突。
2. **`skill-calorie/src/render/html.ts` 的 44 个 `render*`（含 `renderProfileHtml:639`）** —— 看起来能出结果页，**实际是片段**：无 `<!DOCTYPE>`、无 `<meta charset>`、无 `<style>`（实测 `doctype=false / hasCharset=false / hasStyleTag=false`），样式全内联 `style=`。新页面走 `build*Doc` 那条路（`wizardPortDocs.ts:41-61`）。
3. **`cli/write.ts:196-202` 的 `receiptHtml` 与同文件的 `esc()`（`:115-117`）** —— 前者看起来就是回执页，**实际是 200 多字节的内联小节气**，无样式、无字符集，是「不新增模板」的临时处置（`write.ts:6-7`）；后者只转义 `& < >` 三个字符，而冻结口径是五字符（`spec/controls.ts:14` `ESCAPE_HTML_CHARS`），**不要再抄这一份**，要用 `base-paint` 的 `escapeHtml`。
4. **`blocks.ts` 的 `renderDetailSection`（B-07）** —— 它绑死 `Scene` 五字段（`id/title/wake_word/status/prompt_template`，`blocks.ts:446`），是 HELP 场景详情专用。本图档案字段**不是 `Scene`**，套上去要造假的 `prompt_template`，属硬凑。
5. **`skill-bill` 的 `fillTemplate`（`skill-bill/src/render/html.ts:60`）** —— 名字一样，**签名不一样**，不是同一件东西。
6. **`docs/base/base-render/contract-v1.md` 这个路径（旧稿写作「契约正本」）** —— **不存在**；今天读 `docs/base-paint-contract.md`（本席重数 1409 行）。
7. **`delivery.template` 的 `'receipt'` 值** —— `envelope.ts:160-167` 的判族是纯结构判定（`shape === 'receipt'` → `'receipt'`，落盘实测 245 字节小节气也判成 `receipt`）。**它不能当「这是回执页」的证据用**，只能当「这是哪个形状来的」用。

---

## 五、待确认（含挡目标的问题）

1. **预检确认页归哪一层**（§3 分歧点）：留在卡路里公共层，还是上移到 `packages/base-render/src/`？跨技能面今天**不存在**（bill 只用了 `help-shell`、chef／home／schedule 零命中）。另：同批的 `docs/skills/skill-calorie/t163-scene07-reconcile.md` §四 复跑了三档扫描，得 10／15／34 条，**复现不出「14 条／12 条」**——那个数字**只能当线索用**，主张上移时要另立证据。若要上移，先上移 `help-shell`。
2. **AI 怎么知道该跑哪条命令**（旧稿漏写）：答案是 `SKILL.md:100-146` 那张命令表，由 `scripts/build-help.mjs:223-232` 从 `CALORIE_COMBOS` 自动重写标记块而生成。**不是 HELP HTML**：HELP 里每条场景的「可复制执行文本」恒等于 `Scene.id`（`base-render/src/help.ts:23-26`；非 legacy 场景取 `trigger.key`，legacy 取 `main_prompt.cli` 原文，`helpCenter.ts:224,242`），`cli` 只作为 `editable_fields` 的一个字段出现（`helpCenter.ts:102,120-123`）。→ 新增预检命令**必须重跑 `build-help.mjs`**。另外，**「先看预检再写入」的顺序今天没有任何文本告诉 AI**（老技能是靠 prompt 里写「先给我看预览…我确认后再真正写入」，`core-approach.md:182-183`）。
3. **落盘名机制二选一**（§2.4 甲／乙），以及**一个命令服务三条词**还是一个名字一条命令。
4. **改 prompt 要改两份，别只改一份**：同一唤醒词的 prompt 有**两份**——`scene-07-profile.ts:5-8`（`TRIGGERS`）与 `wake-assets.ts:2925`（`WAKE_ASSETS`，四条词各一份）。实测两份当前逐字相同。指纹测试**只钉 `WAKE_ASSETS` 那份**（`test/wake-assets-133.test.mjs:68-73`：全量 concat **47768** 字 ＋ `sha256`）。→ 改 prompt（例如把 `查档案` 的死命令换成 `calorie.view.profile`）**必须两份同改并同批更新指纹**，这是实施票的第一步。
5. **把 HELP 资产的 `output_type` 改成 `process` 会同时踩两处断言**：`test/wake-assets-133.test.mjs:29` 抽查 `profile_setup` 的 `types===['回执']`；`test/help-center-88.test.mjs:148,160` 钉死三档条数 `{结果:329, 回执:79, 过程:6}`。改是可以改（老技能只是参考不是标准），**但这是对老实物分档的有意偏离，两处断言必须同批改**，否则实施票一开就跑红。建议连同 §2.4 的「乙」一起拆成小票。
6. **`查档案` 在空库上没有任何产物**：`profilePlate.ts:23` 无档案行即抛 `missing-data` → **实跑 exit 4**、无产物。四条词要「都能拿到 HTML」，得先认这条顺序（先设置档案，再查档案），或给空态另开一条路——§2.2 的「数据缺口区」是打算，不是现状。
7. **本图管不管写后回执页**：§2.3 设计了一张回执页，但 3 类产物里没有它。两张票都以为对方在管，写词写完之后**仍然是 245／214／237 字节的片段**。票面要有一句结论。
8. **`assemble`／`DOC_SHELL` 提到卡路里公共层后，7 份拷贝是否同批改掉**；以及**结果页的数据缺口（§2.2）与缺的两行「档案创建／档案更新」该不该为它加库列**、归哪张票。本票不改代码，只提建议。
9. **老技能的过程页实物要不要照**：`t163-old-template-shapes.md:33-79` 已把老 `profile_setup.html` 的 `fields[]` ＋ `defaults` ＋ `exec_cmd_template` 三层结构查清（老落盘名 `设置档案_过程_<TS>.html`），但它**不在唤醒词表里登记**（登记的是回执页）。本清单只按今天新仓的件盘，**没把这页算进可复用件**；要不要当参考来源，需维护者裁。另：本文件落在 `docs/skills/skill-calorie/`、文件名主体是 `t163-reusable-inventory`，若维护者要改成主题名（`reusable-inventory.md`），请一并裁。
