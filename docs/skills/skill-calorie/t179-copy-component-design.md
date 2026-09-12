# t179 · 复制数据／复制日志／弹提示 通用组件（设计）

> 票：`卡路里：复制数据／复制日志／弹提示 通用组件（页面必备功能）`（挂 #152 子议题，编号见票面）。
> 用词照 `docs/agents/wording.md`。老技能基线**只读**（`D:\2Study\StudyNotes\SKILLS\卡路里`）。
> 行号以本仓 HEAD 与老技能当前检出实测为准；标「推测」的条目没有直接证据。

## 〇、总表

| 项 | 结论 |
|---|---|
| 老技能三样的真相源 | `公共组件/assets/base.js`（唯一真相源）；74 张模板靠 `<!--SHARED-HELPERS-->` 注入它的镜像 `卡路里.html` |
| 本仓三件的实现 | 三件**都已在** `packages/base-render/src/`（`renderCopyBlock`／`renderActionBar`／`renderToast`／`buildDataText`／`buildLogText`／`buildSharedHelpersJs`） |
| 真正的缺口 | 卡路里侧**只接了「复制数据」**，`logText` 从未传过 → 50 张页面上一颗「复制日志」按钮都没有 |
| 落点 | **扩** `packages/skill-calorie/src/shared/docPage.ts`（不新建文件）；对外共 **5 个名字**（既有 2 个签名不动 ＋ 新增 3 个） |
| 归属 | 留卡路里技能共用位 `src/shared/`；**不上移** base-render |
| base-render 改动 | **零**（三件的实现与冻结面都不动；别的技能页面因此不受影响） |
| 剪贴板 | `file://` 是安全上下文，`navigator.clipboard` 可用；通道 2（隐藏 textarea ＋ `execCommand('copy')`）**已实测有效**。未聚焦那一路上次没复现，见 §3.5 |

## 一、老技能当年怎么做的

### 1.1 三件的实现位置：一份共享 helpers，74 张模板共用

- 真相源 = `公共组件/assets/base.js`（949 行，头部 `:1-11` 自述「Base Skill 控件库 v1.2 · **唯一真相源** · 跨技能 · 领域无关」「注入点: SHARED-HELPERS 占位符（由 injector.py 替换本文件）」）。
- 74 张模板**各带恰好一个** `<!--SHARED-HELPERS-->`，注入器 `公共组件/injector.py:27`；少一个就渲染失败（`卡路里/tests/test_base_pipeline.py:41,210-212` 硬拦截）。
- 卡路里根镜像 `卡路里/卡路里.html`（1953 行）是同一份内容的投影，行号整体后移（`copyText` 在 `base.js:28` ／ `卡路里.html:224`；`toast` 在 `base.js:185` ／ `卡路里.html:381`）。**下文行号一律引 `base.js`（正本）**。

### 1.2 复制数据：内容、生成、反馈、失败

- **内容**：`data.scene.snapshot`，领域无关结构 `{title, summary[], sections[{heading, rows[]}]}`（`公共组件/docs/component-contract.md:145-166`）。技能侧把它组织好再交给 Base：`scripts/_base_render.py:169-173` 用 `auto_summary/auto_sections` 从领域数据自动提炼，调用方可传 summary／sections 覆盖。
- **生成**：`buildDataText(p, format)`（`base.js:230-263`＝`卡路里.html:426-460`），三格式 `text`(默认)／`json`／`csv`。text 输出＝`【技能名 · 操作】` 头 ＋ `场景:` ＋ `时间:` ＋ summary 行 ＋ `▍分节` ＋ `  · 行`。
- **脱敏**：row 可为字符串或 `{text, sensitive:true}` → 输出 `****（敏感字段已脱敏）`（`卡路里.html:414-421`）。
- **结构违规直接报错**：`_validateSnapshot` 抛 `snapshot 违规: …`（`卡路里.html:392-412`）；错误回执里被 try/catch 兜住时**不渲染这颗按钮**（`卡路里.html:833`）。
- **反馈**：走 `copyText(s, opts)`（`base.js:28-59`）→ 成功 toast「已复制／粘贴给 AI」（`卡路里.html:228-229`）。
- **失败**：通道 1 `navigator.clipboard.writeText` → 失败降级通道 2 `_fbCopy`（隐藏 textarea ＋ `document.execCommand('copy')`，`base.js:19`）→ 两条都失败才 toast「复制失败／长按选择文本手动复制」（`卡路里.html:230-231,240-254`）。

### 1.3 复制日志：6 段，来源是 `data.copy_log`

- **内容**：`data.copy_log`（或 `data.scene.copy_log`）5 个字段 `thinking / data_structure / call_chain / timestamp / exception`（`scripts/_base_render.py:174-182` 是唯一生产地；`data_structure` 缺省 `calorie_data.db`，`:147`；`call_chain` ＝**渲染命令原文**，`:179`）。
- **生成**：`buildLogText(p, format)`（`base.js:267-295`＝`卡路里.html:463-491`）固定 6 段：① 场景标识（读 `meta.command_cn`／`meta.wake_word`／`scene.scene_id`）② AI 思考链（缺省「(本地渲染 · 无 AI 链)」）③ 底层数据结构 ④ 调用链 ⑤ 时间戳＋版本 ⑥ 异常信息（缺省「无」）。
- **与「复制数据」的关系**：同一次渲染、同一个 payload、**同一排按钮的两条并列出路**（`base.js:313-314` 两颗 ghost 按行连排）。口径分工由用户 2026-08-02 拍板写进模板注释：复制数据＝「用户关心信息的人类可读文本」，复制日志＝「排障信息（原始数据／来源／时间／渲染参数／AI 思考链）」（`卡路里/templates/crud_view.html:113-119`）。同一口径另见 `SKILL.md:476`（复制数据「给任何 AI 复述口径一致」）与 `SKILL.md:2146`（`--chain` 强制传，「思考链不进 UI，用户点『复制日志』带出用于排障对比」）。
- **可选预览**：`actionBar(p, extra, {preview:true})` 时点按钮先弹预览面板、再确认复制（`base.js:316-344`）。

### 1.4 弹提示（toast）：内置实现，不是纯 CSS

- **怎么弹**：全局 `toast(msg, detail?, options?)`（`base.js:185-190`）。样式由 JS 一次性写进 `<style id="hm-toast-style">`（`卡路里.html:273-280`）；节点是 `position:fixed` 的毛玻璃栈 `.hm-toast-stack`（`卡路里.html:271`）。**位置与动画是 CSS，内容与生命周期是 JS**。
- **持续多久**：`opts.timeout || 4500` ms（`卡路里.html:376`），单条独立计时。
- **成败样式**：成功＝📋（缺省图标）＋「已复制／粘贴给 AI」；失败＝**恒定 danger 徽章**（`badge:{text:'失败',type:'danger'}`，`卡路里.html:243`）＋「复制失败／长按选择文本手动复制」。
- **关闭**：每条都有「✓ 知道了」按钮（`卡路里.html:362,375`）；不点则超时自灭。多条**堆叠**：同屏上限 5 条、≤820px 收窄为 3 条、超限 FIFO 挤掉最旧（`卡路里.html:262-263,296-316`）。
- **无障碍**：`role="status"` ＋ `aria-live="polite"`（`卡路里.html:334-335`）。

### 1.5 一句话总括

三件当年**就是一个组件**：`actionBar(payload)` 出「复制数据 ＋ 复制日志」两颗按钮，`copyText` 负责两通道复制与失败兜底，`toast` 负责三种反馈；内容是技能塞进 snapshot（给用户）与 copy_log（给排障）的两份投影。

## 二、本仓现状（缺口盘点）

| 件 | 已在哪 | 状态 |
|---|---|---|
| 复制按钮 / 复制区区块 | `packages/base-render/src/controls.ts:1170` `renderActionBar({buttons, copyData, copyLog})`；`blocks.ts:602-627` `renderCopyBlock({title, dataText, logText, …})` | 已在，**两个都支持日志** |
| 数据 / 日志序列化 | `packages/base-render/src/text.ts:434` `buildDataText`；`:470` `buildLogText`（6 段，段源 `spec/index.ts:145`） | 已在 |
| 弹提示 | `controls.ts:185-228` `renderToast`；`controls.ts:606-796` 页面运行时 `buildSharedHelpersJs()`；冻结常量 `spec/controls.ts:190` `TOAST_DEFAULTS`（4500ms／5／3／820px）、`:74` `COPY_TEXT_DEFAULTS` | 已在 |
| 卡路里侧接线 | `src/render/copy.ts:38` `copyActionHtml`（只产 1 颗按钮）；`src/shared/docPage.ts:63,68` `promptCopyArea`／`dataCopyArea` | **只接了复制数据** |

**实测的三个缺口**（`packages/skill-calorie` 全树）：

1. **复制日志＝零接线**。`logText` 命中 **0** 处；`copyLog` 只在 `test/render-copy-90.test.mjs:245-246` 的冻结 id 表里出现，源码 0 处 → 50 张页面（`assembleDocPage` 50 处调用；`dataCopyArea` 50 处）**一张都没有「复制日志」按钮**。
2. **「数据不存在」这一种反馈今天完全静默**。冻结口径写死在 `controls.ts:27-28`：`text` 缺席 → 不写 `data-t`，绑定器 `readDataText → undefined` **直接跳过**；`text === ''` → 送进空串短路（`controls.ts:338-340`）返回 `reason:'empty'`，**不挂任何 toast**。
3. 卡路里侧**从未主动弹过一次提示**（`renderToast` 在 `src` 命中 0 处）——今天的 toast 全是复制按钮的副产品。复制成功／失败两种能用（运行时自带），但页面自身没有任何反馈出口。

## 三、设计

> **本节对 §〇 总表的两处改动**：① 第 14 行的「新件 `src/shared/copyArea.ts`」改为**扩既有的 `src/shared/docPage.ts`**（理由见 3.2；接口不变，只换住处）；② 第 16 行「base-paint 改动零」在本节内得到实测支持（见 3.4／3.5）。其余各行照旧。

### 3.1 一个组件装三件事：对外接口

**落点**：`packages/skill-calorie/src/shared/docPage.ts`（**不新建文件**）。复制区本来就住在那里（`docPage.ts:62-70` 已有 `promptCopyArea`／`dataCopyArea`）。

与复制／提示有关的对外名字**一共 5 个**，新增 3 个：

| 导出 | 吃什么 | 出什么 | 依据 |
|---|---|---|---|
| `promptCopyArea(prompt)`（既有，签名不动） | prompt 原文 | 预览块 ＋ 一颗「复制指令」 | `docPage.ts:63-65` |
| `dataCopyArea(title, input)`（既有，签名不动） | 标题 ＋ `DataTextInput` | 一个复制区块（1 颗按钮） | `docPage.ts:68-70` |
| `copyArea(input)`（**新增**） | 见下 5 个位 | 一个复制区：0–3 颗按钮／一句空态 | 本设计 |
| `copyLog(input)`（**新增**） | 本次执行的过程证据 | `CopyLogFields`（6 段的第 2–6 段入参） | `text.ts:470`；`spec/index.ts:144-145` |
| `notice(input)`（**新增**） | 一句标题＋可选详情 | toast 形态的静态提示块 | `blocks.ts:636` `renderFeedbackBlock`；`controls.ts:185-233` `renderToast` |

`copyArea` 可以填的 5 个位（全可选，给了什么出什么）：

- `title?: string` — 区块标题；不给＝不出标题（同 `blocks.ts:622-624` 口径）。
- `prompt?: string` — 给了就出「预览块 ＋ 复制指令」（逐字复用今天 `promptCopyArea` 那两件，`docPage.ts:64`）。
- `data?: DataTextInput` — 给了就出「复制数据」，内部 `buildDataText`（技能侧不自产序列化）。
- `log?: LogTextInput` — 给了就出「复制日志」，内部 `buildLogText`。
- `emptyText?: string` — 三样全没给时的那句话（缺省也必须有一句）。

**三条必须成立的性质**（做的时候照此验收）：

1. `copyArea({title, data})` 与今天的 `dataCopyArea(title, data)` **产物逐字相同** → 其余 46 张页可以机械替换、字节不动。
2. 按钮一律走 `renderCopyBlock`（`blocks.ts:602-627`）：actionId 取冻结表 `COPY_ACTION_IDS.actionBar.copyData／copyLog`（`spec/controls.ts:112-114`），文案取 `ACTION_BAR_DEFAULTS.copyDataLabel／copyLogLabel`（`:274-275`）。卡路里侧不自造按钮、不自造 id。
3. 复制成功／复制失败两个提示仍由页面运行时 `buildSharedHelpersJs` 自带（`controls.ts:606-796`），本组件不产第二条提示通道。

### 3.2 归属：写哪一层，为什么这不是第 8 份拷贝

- 写 `src/shared/docPage.ts`：它是 #179 把 7 份整页模板与装配收成的那一份（`docPage.ts:3-5` 自述）。复制区扩在这里，页面的调用方只需记一个入口——预检确认页今天同时用 `promptCopyArea` ＋ `dataCopyArea`（`profile/setup.ts:240-254`），再开第二个文件就是给同一个用途开第二个门。
- **两个使用方**：① 卡路里 **50 处整页装配**——`src/render/` 七个 `*Docs.ts` ＋ `src/profile/` 三个文件，实测 `assembleDocPage(` 50 处、`dataCopyArea(` 50 处（逐文件计数：diet 9／sport 9／sportPort 6／nutritionPort 4／trend 6／trendMiscPort 8／wizardPort 4／profile.setup 2／profile.update 1／profile.view 1）；② 其余各域页面按域接（同一批文件的其余 46 张页）。**base-render 不是使用方，是被消费方**：`renderCopyBlock`／`renderActionBar`／`buildDataText`／`buildLogText`／`buildSharedHelpersJs` 是多技能公共层，本组件只读它（理由见 3.7 第 2 条）。
- **为什么不是第 8 份拷贝**：不新建文件；不做第二套序列化（数据走 `buildDataText`、日志走 `buildLogText`）；不做第二个按钮产出者（走 `renderCopyBlock`）；不做第二条提示通道（走页面运行时 ＋ `renderToast`）。它收的是「50 处各自手写 `dataCopyArea('复制数据', {…})` 调用」这一层重复。

### 3.3 复制日志的内容：六段 ＋ 本仓三样

用 `buildLogText` 的固定 6 段（段序与段源 `spec/index.ts:131-145`；缺失段落会印 `(未知)`）：

| 段 | 取自 | 本仓怎么填 |
|---|---|---|
| ① 场景标识 | envelope 派生 `{skill}.{key}（{shape}）` | 自动（`text.ts:297-299`），调用方不用传 |
| ② AI 思考链 | `copyLog.thinking` | 本页由本地 CLI 渲染、无 AI 链 → 传一句固定说明，别让它落成 `(未知)` |
| ③ 数据结构 | `copyLog.dataStructure` | 库文件名 `calorie_data.db`（老口径 `scripts/_base_render.py:147`）＋ 本次库表名（写库回执取 `receipt.meta.entityType`，`profile/setup.ts:282`） |
| ④ 调用链 | `copyLog.callChain` | **命令原文**（`calorie-cmd-read <key>`／写命令的 `--params`；key 取 envelope 的 `key`，回执页取 `receipt.meta.wakeWord`，`profile/setup.ts:286`）＋ 写库页面的 **M5 行**（`receipt.m5Line`，`profile/setup.ts:295`；契约 `render/receipt.ts:7-8`） |
| ⑤ 时间戳版本 | `copyLog.timestamp` | 写库页面取 `receipt.meta.actionAt`（`profile/setup.ts:279`）；只读页面取渲染时刻 |
| ⑥ 异常 | `copyLog.exception` | 无异常 → 「无」 |

**落盘路径进不了日志**（这是本仓的结构事实，不是取舍）：`delivery.path` 与 `data.output` 是在**渲染之后**才定的（`cmd_read.ts:1096-1102`：先 `deliverHtml` 再 `{...out.data, output: d.path}`），而复制文本必须在渲染期就写进 `data-t`。路径今天只在 envelope 顶层 `delivery.path`（`render/envelope.ts:146-155`）与 `data.output` 上，即 AI 侧拿得到、页面里的日志拿不到。要写进去就得让 CLI 在渲染前把计划落点传进 50 处装配点 —— 本设计不做，列 §四 第 2 条。

**与「复制数据」怎么区分**：一份数据两条出路（老口径 `卡路里/templates/crud_view.html:113-119`）——数据＝用户关心的业务值（本次 envelope 的投影）；日志＝这次执行的过程与证据（命令、库表、M5 行、时间）。

### 3.4 三种反馈与各自触发条件

| 反馈 | 触发条件 | 谁出 | 依据 |
|---|---|---|---|
| 复制成功 | 通道 1 成功，或通道 2（隐藏 textarea ＋ `execCommand('copy')`）返真 | 页面运行时 | 实测：`.scratch/t179/clipboard-probe.json` 的 `click-with-permission` 与 `click-channel1-fail` 两例都出「已复制」 |
| 复制失败 | 两通道都失败 | 页面运行时 | 实测 `click-both-fail`：标题「复制失败」＋ danger 徽章；文案常量 `spec/controls.ts:80-81` |
| 没有可复制的数据 | **渲染期**：这次没有可投影的数据 | 组件（`copyArea` 的 `emptyText` 空态） | 实测今天：按钮不带 `data-t`（`nodata-button-has-data-t=false`），点击后 **0 个提示**（`click-no-data.stack=0`）；代码口 `controls.ts:27-28`、`:692-694` |

关键判断：**「没有数据」在渲染期就已经知道**（CLI 手里就有 `data`），不该留到点击时才发现。空态出**一句话、不出按钮**。理由（实测）：没有 `data-t` 的按钮点了静默；给了空串则会把空串写进剪贴板还报「已复制」（`copy(title, btn)` 不判空，`controls.ts:697-715`）——两种都是假象。

### 3.5 `file://` 上的剪贴板：实测结论与降级

实测环境：Windows ＋ Playwright ＋ Chromium headless-shell，页面**真以 `file://` 打开**（探针 `.scratch/t179/clipboard-probe.mjs`，读数 `.scratch/t179/clipboard-probe.json`）。

- `location.protocol = file:` 时 `isSecureContext = true`，`navigator.clipboard.writeText` 与 `document.execCommand` **都在**，`permissions.query('clipboard-write')` 返 `granted` → 通道 1 是主用通道。
- 真实点击（有用户手势）→ 通道 1 成功出「已复制」；授予读权限后读回剪贴板，**逐字等于**写入文本。
- 把通道 1 打成必失败（`writeText` 拒）→ **通道 2 顶上**（`controls.ts:717-731` 的隐藏 textarea ＋ `execCommand('copy')`），读回仍是逐字原文 → 兜底不是纸面设计。
- 两通道皆失败 → 「复制失败」＋ danger 徽章（`controls.ts:742-796`）。
- **没做到的一步**：「文档未聚焦 → `NotAllowedError`」这一路本次没能复现（headless 下 `document.hasFocus()` 恒为真）→ 那一句只能按代码读（`controls.ts:703` 的拒绝分支转 `fallback`），不当实测写。§〇 第 17 行那句「已实测」没记读数位置，本节这次能复现的只有「`file://` 是安全上下文」与「两条通道各自的表现」。
- 降级方案（已实现，别另造）：`navigator.clipboard` → 隐藏 textarea ＋ `execCommand('copy')` → 都不成才出「长按选择文本手动复制」（`spec/controls.ts:81`）。**注意**：这一句在今天的数据复制区里**没有可长按的文本**（`renderCopyBlock` 只出标题＋按钮，`blocks.ts:622-626`），见 §四 第 5 条。

### 3.6 实施顺序与不破坏既有验收的办法

1. **先做共用件**（`docPage.ts` 加 3 个导出，`dataCopyArea` 留作薄转发）＋ 一条新测试 `test/copy-component-179.test.mjs`，三条断言：① `copyArea({title, data})` 与 `dataCopyArea(title, data)` 逐字相等；② 给了 `log` 出第二颗按钮（actionId＝`ilife-copy-log`、文案「复制日志」）；③ 三样全不给 → 出 `emptyText` 那句、**不出按钮**。
2. **场景 07 四张页先接**：`src/profile/setup.ts:241`（预检确认页）、`:284`（设置档案／设活动量回执页）、`src/profile/update.ts:43`（改档案回执页）、`src/profile/view.ts:83`（查档案结果页）。同步改 `test/profile-doc-179.test.mjs`——它按**整文档**钉这四张页（`assertDocPage` 五断言 `:52-60`，用例表 `:62-70`），并含「其余写命令仍是原回执片段」的反面断言（`:5-6`）。`test/wizard-86.test.mjs:236` 只要求产物含 `data-t`，加一颗日志按钮不破。
3. **其余 46 张页按域接**（六个 `*Docs.ts` ＋ `wizardPortDocs.ts`），一域一回事。这 5 个测试把「复制数据」当**出现即通过**的串来钉：`diet-homogeneity-108:131,194,199`、`sport-homogeneity-109:142…249`（9 处）、`trend-homogeneity-110:151…215`（5 处）、`exercise-port-111:157…249`（6 处）、`nutrition-port-112:134…190`（4 处）→ 加按钮不破；**但别改这四个字**，换标题／换文案会把这 24 条断言打红。
4. **不许动的三处**：`test/render-copy-90.test.mjs:173-176` **逐字钉死** `copyActionHtml` 的产出（导出与 `promptCopyArea` 一律不动）；`:232-242` 钉住「无 `data-t` 的按钮不产反馈」——那是 base-render 的冻结行为，本设计不去改它，只在卡路里侧渲染期不出这种按钮；`test/delivery-83.test.mjs:148-150` 要求产物以 `<!doctype html>` 开头且字节数与落盘一致（模板不许换）。
5. **每步跑**：`pnpm build` → 上面的测试 → 场景 07 四张页 390／1440 两档实拍（照 `.scratch/t179/shots179` 那套口径重拍）。`test/cli-smoke-t41.test.mjs`（18 条命令逐条 exit 0 ＋ 产物含 `ilife-page`）是「命令还跑得通」这一层的兜底。

### 3.7 风险

1. **冻结常量能不能动**：`TOAST_DEFAULTS`（`spec/controls.ts:190-199`：4500ms／5 条／3 条／820px）与 `COPY_TEXT_DEFAULTS`（`:74-82`）是跨技能冻结面，本组件只读它们；要改时长或文案得另开 base-render 的票。
2. **别的技能页面被牵连**：只要碰 `packages/base-render/**`，bill／chef／memo 等页面同批受影响——本设计在 base-render 上改动**零**，全部改动落在 `src/shared/docPage.ts` 与卡路里各页。
3. **粘贴出去的文本带绝对路径**：落盘路径形如 `C:\Users\<用户名>\…`，粘进对话就带出本机路径与用户名；本设计默认不进日志（§四 第 2 条待裁）。
4. **日志里的词是开发向的**：`user_profile`、`sqlite:total_changes` 这类词已被 UI 清单判「用户读不懂」（`t179-ui-issues.md:12-14`）。日志本来就是排障用的，可以留；但**别把同样的词复制进「复制数据」**。
5. **actionId 页内唯一**：`ilife-copy-data`／`ilife-copy-log` 是冻结表里**同一对 id**，一页出现两块用缺省 id 的复制区就会重复（`blocks.ts:596-597,601` 允许调用方自定 id，须自保页内唯一）。复制区收成一排按钮后重复面变小，但预检确认页那种「prompt 区＋数据区」的两块格局仍要各自指定。

## 四、没定下来的事

不替用户决定的 6 条：

1. **按钮叫什么**：沿用冻结缺省「复制数据／复制日志」（`spec/controls.ts:274-275`），还是换人话（如「把这次的内容复制走／复制排障信息」）。换词会打红 §3.6 第 3 条那 24 条断言，且 `copyDataLabel` 是冻结常量。
2. **日志里要不要带绝对路径**（本设计默认不带，理由 §3.3）。要带就得裁「CLI 在渲染前把计划落点传进装配函数」这条改动，它要动 50 处装配点。
3. **toast 时长要不要沿用冻结的 4500ms**（`spec/controls.ts:191`）。改它＝改跨技能冻结面，得另开票；本组件不动。
4. **要不要给「复制日志」单独做空态文案**（本设计里 `emptyText` 只有一句，不区分是数据缺还是日志缺）。要分开就得在入参里再加一个位。
5. **复制失败时的「长按选择文本手动复制」给谁长按**：今天复制区里没有可选文本（`blocks.ts:622-626` 只出标题＋按钮）。要不要挂一个可展开的原文预览（老技能有预览面板一路：`base.js:316-344`），要用户拍。
6. **要不要给复制区加「复制 prompt」以外的第三类按钮**（今天只列 prompt／数据／日志三类）；不列新类就不加位。
