# t3 调查：通用 help 模板的注入契约＋私家大厨专属取值

> **更正（2026-09-12 补，t202）**：本报告全文凡写「`meta_blocks` 在 A 路**不渲染**／声明即死／读了不渲染」处**均已失效**——共享 help 模板自 t202 起在**分组页页首**按 `m.id === g.key` 条件渲染 `id` 命中该分组的块（`help-template.html:1786-1789`）。§三（含 3.1）那一段已就地改对；其余各处（§1.5 可达性段、§十、自检 2 抽查 β 等）请以本更正为准。私家大厨照记账派生时，两块 `id`（`help_summary`／`help_wake_words`）与分组 `id` 零碰撞 ⇒ 页上仍不渲染。契约见 `docs/base/base-render/t202-help-meta-blocks.md`。

> **2026-09-12 第三轮修补（编排方直改）**：本报告经两轮整改后由 `t3-verify.md` 验证——B 席 8 条内容层**全部真落地**、A 席证伪（`recommendations` 真渲染）4 处**全改对**、A 席 6 处行号**6/6 改对**、`_N` 裁定出处全对。本轮只清验证点出的 5 处新引入矛盾：① §六→§七 引用；② §8→§1.4／§1.3；③ 引 t2 的「老契约顶层表」对象撞车；④ **引 `t2-content-reconcile.md` 的 11 处行号整体重对齐**（t2 在自己开头插了整改记录后行号后移 ~125 行，本报告未跟上）；⑤ 探针留证 `probe-render.html` 的单花括号与正文双花括号口径不符 —— **处置：不重生成（会改动产物字节、与留证目的相抵），改为就地标注**：该文件顶部已插警示注释、目录内新增 `README-留证口径.md`，明确「它是整改前产物、只对『是不是服务端插值』有效、**不能**用来推渲染与否」；`{{…}}` 形状的权威证据指向整改期新增的 `verify_payload.mjs`＋`verify_payload.out.json`（双花括号 16／单花括号 0）。

调查日期 2026-09-12。一切结论以**代码**为准（行号＝本仓当前在盘文件实测；老技能基线 `D:\2Study\StudyNotes\SKILLS\` 只读）。
本票**只报事实与取值来源**，`version`／`init_banner`／三层落法均**不选**，全部归票 6。

---

## 整改记录（2026-09-12，对抗式审查后）

**缘起**：本报告交**两席**对抗式审查。

| 席 | 文件 | 判定 | 结论 |
| --- | --- | --- | --- |
| 主审查（B：可施工性与下游风险） | `docs/skills/skill-chef/t3-review-B.md`（23,394 B／114 行） | **5/10，硬伤 8 条** | 「事实层可放心引用；结论层不足以让票 6 一次干成，先补 6 条，其中 1、2 是硬门」 |
| 另一席（A：契约断言核对员） | `docs/skills/skill-chef/t3-review-A.md`（353 行） | **8/10，证伪 1 条硬伤 ＋ 5 处行号／事实错 ＋ 1 处方法学缺陷** | 「第一要害成立、§1.4 十五条硬校验逐字属实、三条硬事实全对；但 §1.5 用了没有分辨力的哨兵法，并因此把 `recommendations` 判成声明即死」 |

**下面逐条对号。** 改法只分三种：**补**（原文没写）、**改**（原文写错）、**摘**（原文把已钉死的写成待选）。

### 一、8 条硬伤

| # | 审查判定 | 本报告怎么修的 |
| --- | --- | --- |
| 1 | `dimensions`（46/48 卡，键并集 42）在三张票之间没有归属，只会「归票 5」 | **补** §三·3.5「`dimensions` 的落法」：写出 42 键并集、畸形键 `默认不含)` 的归属卡、逐键归位规则（→ `editable_fields` ＋ chip 的唯一合法映射）、逐键分组表、指派票与「不做的后果」；并明标**跨票归属，需由结构设计闸门票收敛**，不再写成「归票 5」了事 |
| 2 | `{{菜名}}` 的字符形状报告写错层级（老载荷是**双**花括号，报告按单花括号记） | **改** §3.5 口子 2 ＋ §8.2 占位符行 ＋ §10.3.1：改写成 `{{…}}`，给出**双花括号**实测（`{{菜名}}` 15／`{{N}}` 1，单花括号 0），样本逐字给出，并写好二选一落法与 `editable_fields` 五行形状 |
| 3 | `types` 的取值口径与票 2 冲突（括号注怎么处理） | **改** §3.5 口子 3 ＋ §8.2 type 行 ＋ §10.3.2：照票 2 已定口径「按 `+` 拆、去掉括号注」写成**已定**，与 t2 对齐（`:608`／`:673`），不再留成待选 |
| 4 | `init_banner` 的显隐口径错记成「票 6 三支选择」，与票 7 票面打架 | **摘** §6.3 与 §10.2.3：删掉「复用 `openChefDb.initialized`」这一支（票面已禁），把「不建库」改成**票 7 已钉死的口径**，票 6 侧只留「传不传」＋「`initialized` 由调用方传入（零 IO 纯函数）」 |
| 5 | 页面结构预期全篇无一处成文，票 11 肉眼终审没有基准 | **补** §七「页面结构预期」整节：11 个 Tab（10 域＋关于）／hero／搜索框／每域一页／关于页三段，逐层成表并给代码行号，另出「与老件的结构性差异」对照 |
| 6 | 必报五步 0 命中，报告不是「票 6 第一步输入」的姿态 | **补** §10.1「票 6 第一／二步的输入」：新增件住哪几个目录（候选＋代价，不定案）／每件对外给什么／`package.json` 加 `base-paint`／`check-boundaries.mjs` 移出 `SKILLS_BASE_FROZEN` |
| 7 | 告警线整项漏掉（350＋LF、落点 `packages/skill-chef/AGENTS.md`） | **补** §十一「告警线 ＋ 必报五步 ＋ 门」：350＋LF 口径、落点今天不存在、两件已超线当场报、`EXPECT_KEYS`／`EXPECT_TPL` 硬编码门 |
| 8 | 未与同图票 2 报告对齐，留三处接口缝 | **补** §二·2.2「10 域的 id／label／icon 从哪来」：接上 t2 报告 §一 的 `domain.key` 权威英文名表（「那 10 个域有 5 处独立出处」一句，L79）与 §七 字段映射表（L615）的 `id`／`label`／`icon` 取法；§10.3.3 明确 6 键草案是票 2 定稿、本票不另立第二份资产 |

### 二、7 问

| 问 | 原文结论 | 本次改后 |
| --- | --- | --- |
| #1 可施工性 | 不合格（5 项必填里 4 项留白） | **部分补齐**。摘掉「不建库」这条伪待选、把「三层中间层」接上票 2 的 `domain.key`；`title`／`contact`／`subtitle` 三项**仍是待选**——这三项属票 6 票面点名要用户点头的范围，本票无权代裁（见 §10.2.1／10.2.2） |
| #2 三块可选 | 部分不合格（没把「传了白做」推到底） | **补齐**。§三开头补「A 路传与不传**逐字节相同**」实测结论 |
| #3 三层选项集 | 合格 | 原样保留；仅**补**上域 `id`／`label`／`icon` 的来源（§二·2.2） |
| #4 内容不丢 | 不合格（最可能翻车处） | **补齐**。§三·3.5 起共六个口子逐条给「落法＋归属票＋不做的后果」（`dimensions`／`{{…}}`／`types`／aliases／`result`／`html`＋`variants`） |
| #5 `init_banner`×不建库 | 不合格（失位） | **补齐**。§6.3 改写：不建库＝票 7 已钉死，票 6 侧只剩「传不传」＋装配形状 |
| #6 告警线 | 不合格（漏项） | **补齐**。§十一 |
| #7 必报五步 | 不合格（失位＋越界） | **补齐**。§10.1 第一／二步输入 ＋ §11.2 五步报点 |
| #9 页面结构预期 | 不合格（票 11 无基准） | **补齐**。§六 |
| #8 发布态归位 | 合格 | 原样保留（§6.6），未动 |

### 三、另一席（A：契约断言核对员）纳入的改正

A 席判定 **8/10**：第一要害（两套渲染／本图走 A 路／两个邻居都走 A 路）**成立**、§1.4 老家注入器 15 行硬校验**逐字属实**、§4.2 的 33／48／10 域计数**独立复点完全一致**、三条硬事实（boundaries／exports／三个 commit）**全对**。它指出的问题**全部改正**：

| # | A 席指出 | 本报告怎么改的 |
| --- | --- | --- |
| 1 | **硬伤**：`recommendations` 在 A 路**真渲染**（关于 Tab 第三段，`:1819-1825`／`:1834`），原报告在**四处**把它列入「读了不渲染」 | **改四处**：结论摘要第 4 条／§1.5 表的哨兵行＋新增逐键可达性段／§10 A／自检 2（抽查 β）。「读了不渲染」名单只剩 `meta_blocks` 与 `subtitle`（并注明 `:1775` 的 `subtitle` 是 `INIT_BANNER.subtitle`，别混）。**§3.4 本来就写对了**，现在四处与它一致 |
| 2 | **方法学缺陷**：§1.5 的「哨兵法」对「渲染与否」**没有分辨力**（A 路正文全由页面侧 JS 拼，静态段只有空 `<div id="screen">`；`contact`／`groups` 铁定渲染，哨兵也是 0 次） | **改判据**：§1.5 开头新增「判据」段，改用**可达性判据**（变量在不在 `:1771-1834` 的 `h +=`／`innerHTML` 链上）；哨兵读数保留但标注「只证不是服务端插值，不能推不渲染」；引用 A 席探针 `.scratch/chef-help/t3-review-A/probe_reachability.mjs`（结论 `SUBTITLE false`／`META_BLOCKS false`／`RECOMMENDATIONS true`） |
| 3 | §1.5 第 3 行把 `meta_blocks` 说成「文档未列」，且行号／路径错 | **改**：老文档顶层表在 `D:\2Study\StudyNotes\SKILLS\公共组件\docs\scene-data-contract.md:23-27`，逐行 `skill_name`／`title`／`subtitle`／`meta_blocks`／`groups`——`meta_blocks` **已在表内**；真未收录的是 `contact`／`init_banner`／`version`／`recommendations` |
| 4 | `packages/skill-chef/package.json` 的 `version` 在 `:3` 不是 `:4` | **改**（两处：§3.2／§6.2） |
| 5 | `pnpm-lock.yaml` 的 `base-paint … link:` 在 `:136-138` 不是 `:132-134` | **改**（两处：§6.6（二）／自检 3） |
| 6 | `escapeTitleText` 只转义 **4** 个字符（`&`／`<`／`>`／`"`，**不转义 `'`**）；「五字符」是页面侧 `esc()` | **改**：§6.1 改成 4 个并指名生成物 `src/helpShell.ts:53-56`；同时点出生成物 `:53` 那句注释「五字符即够」与它下面那行代码的 4 个 `replace` 不符，**以代码为准** |
| 7 | 「单测 `:243` 断言」所指不明（生成物测试件只有 61 行；`:243` 是生成器的发射处） | **改**：§1.3 改成「断言在生成物 `test/help-shell-136.test.mjs:34`，发射处是生成器 `gen-help-shell.cjs:243`」 |
| 8 | §1.1 把卡路里写成直连 A 路，实际隔一层**本仓 deprecated 垫片** | **补**：§1.1 表下新增「邻居到底走哪条」段（记账直连；卡路里经 `skill-calorie/src/render/helpShell.ts:11` 转发，`:20-22` 会把 `missing-data` 重映射成 `CalorieRenderError`）⇒ **票 6 的 chef 侧要直连，别抄垫片** |

A 席确认**全对、本整改未动**的：两套渲染与本图走 A 路（`helpShell.ts:73`／`package.json:11` 逐字）；邻居最终都到 A 路（`helpCenter.ts:481` 的速查台走 B 路，是**另一个产品**）；`check-boundaries.mjs` 的 `:37`／`:38`／`:39-44`／`:45`／`:56-58`／`:60`；`base-render/package.json` 的 `:3` 与 `:11` 逐字；三个 commit（`3e46ab0` @2026-09-10 14:06:58 无 `./help-shell`、`21ef322` @17:33:31 加了它、`7a114b3` @20:10:40，`git log -S'./help-shell'` 只命中 `21ef322`）。

### 四、被复核推翻的两条（原文有错，这里明写）

1. **`{{菜名}}` 的单花括号记法是本报告自己的错，已就地改正。** 原文 §8.2 与 §10.3.1 按单花括号记，根因是探针正则 `\{[^}]*\}` 吃掉了外层 `{`。本整改用 `JSON.parse` 后逐条复核 `.scratch/chef-help/legacy-chef-help-payload.json`（证据件 `.scratch/chef-help/t3/verify_payload.mjs` ＋ `verify_payload.out.json`）：**16 条含占位符，全部是双花括号，单花括号 0 条**。全文单花括号写法已清干净。（B 席独立复现同一结论。）
2. **「`t7-body.md:5` 落点陈旧」这条不成立，不据本地副本开结论。** 本地 `docs/skills/skill-chef/t7-body.md:5` 确实还写着 `<SKILLS_DB_PATH>/CookHub/help/`，但**GitHub 上 #215 的现行正文已是 `cook_html/help/`**（与地图 `map-chef-body.md:31` 一致）。该本地副本是陈旧副本，**不是**票 7 的现行口径。本报告全文以 GitHub 的现行正文为准；B 席 §四.9 由这条副本推出的「报告未提示落盘冲突」也随之不成立——真实要提示的是「本地副本陈旧」，已写在 §6.3。

### 五、本次未动的正确内容

契约事实层（注入形状／5 项必填的渲染落点／三块可选的形状／A 路 vs B 路／§1.4 老注入器 15 条硬校验／§6.6 两条硬事实复核／自检四条）**逐条保留，只做增补与就地改错**。

---

> ⚠️ 并发注记：跑本票时工作树里有**别的会话**在改 `skill-calorie`／`plugin-chef`／`skill-chef/SKILL.md` 等件（`git status` 可见）。本报告引用的行号只对**下列件**负责，且都已避开他人未提交改动面：`packages/base-render/{package.json,assets/help-template.html,scripts/gen-help-shell.cjs,src/helpShell.ts,src/help.ts,src/spec/help.ts,src/index.ts}`、`packages/skill-bill/{package.json,src/render/helpFile.ts,src/cli/cmd_read.ts,src/fetch/{db.ts,paths.ts},src/triggers/wake-assets.ts}`、`packages/skill-calorie/src/render/{helpFile.ts,helpCenter.ts}`、`packages/skill-chef/{package.json,src/policy/wakewords.ts,src/help/lookup.ts,src/cli/cmd_read.ts,src/fetch/{paths.ts,db.ts},src/render/views.ts}`、`tooling/check-boundaries.mjs`、`pnpm-lock.yaml`。其中 `packages/skill-chef/package.json` 正在被票 10 的会话改动（本报告引用的 `dependencies` 块 `:24-26` 当时未变）。

---

## 结论摘要

1. **仓内 `base-paint` 有两套 help 渲染，本票的出口只是其中一套**：本图要的是 **A 路** —— 真相源 `packages/base-render/assets/help-template.html`（2053 行）→ 生成器 `scripts/gen-help-shell.cjs` → **生成物** `src/helpShell.ts`＋`test/help-shell-136.test.mjs`，出口 `base-paint/help-shell` 的 `renderHelpShellHtml`。另有一套 **B 路**（`src/help.ts:675` 的 `renderHelpShell`，走主入口，带 `SCENE_DATA_SCHEMA` 机读校验），**不是本图的面**，两套的字段读法不同（详见 §1.1）。
2. **注入形状是 `help-data` 容器里的 JSON，不是 `window.__HELP__`**：`renderHelpShellHtml` = `PREFIX（含文档标题占位）＋ JSON.stringify(data)（`<`→`\u003c`）＋ SUFFIX`（`src/helpShell.ts:73-80`）；页面侧 `var HELP = JSON.parse(document.getElementById('help-data').textContent)`（`help-template.html:1647`）。老家私家大厨是 `window.__HELP__`（`render_help.py:132`），**两代注入形状不同**。
3. **类型面只声明 5 项**（`HelpShellData`＝`skill_name`／`title`／`subtitle`／`contact`／`groups`，`src/helpShell.ts:22-28`），**运行时另读 4 项**（`meta_blocks`／`init_banner`／`version`／`recommendations`，`help-template.html:1651-1656`）——多传的字段会被透传进 JSON（`:77` 是 `JSON.stringify(data)` 整份）。
4. **「读了不渲染」的只有 `meta_blocks`／`subtitle` 两块**（各自全文只出现 1 次＝声明处）；页面真显示的是 `version`（关于 Tab `v… · HELP 模板 v4`）、`init_banner`（hero 下方横幅）、`contact`（关于 Tab 第一段）与 `recommendations`（关于 Tab 第三段「其他技能」）。**判据用可达性（变量在不在 `:1771-1834` 的 `h +=`／`innerHTML` 链上），不用哨兵法**——A 路正文全由页面侧 JS 拼，静态段只有空 `<div id="screen">`，故哨兵在静态段一律 0 次，对「渲染与否」**没有分辨力**（`contact`／`groups` 铁定渲染，哨兵也是 0）。实测可达性：`SUBTITLE false`／`META_BLOCKS false`／`RECOMMENDATIONS true`（A 席探针 `.scratch/chef-help/t3-review-A/probe_reachability.mjs`；§1.5 实测表）。
5. **私家大厨 5 项必填＋三块可选的取值来源**：内容全部来自老家 `references/scenarios.yaml`（10 域／33 组／48 场景，本票已复点）；`title`／`contact`／`version`／`init_banner` 在**老家都没有现成对应物**（老 `meta` 只有 4 个字段，无 contact；老页面无横幅；老 `meta.version=0.1.0` 与新仓 npm 版本同值，口径分辨不出），只能照邻居（记账／卡路里）。
6. **最大缺口三条**：① `meta_blocks` 与 `subtitle` 在 A 路是"传了不显示"，票面把它算作可选内容是**文档口径**，与代码不一致；② 老件两层（33 组／48 卡）要补的中间层**只能自己造**，模板硬要三层（域 Tab／组折叠／场景卡）；③ 老注入器的硬校验（含 **group id 与 scene id 共用一个唯一集合**）在新仓 A 路**没有对应实现**，重名会静默错（§1.4／§1.3）。
7. **两条硬事实复核完毕**：`SKILLS_BASE_FROZEN` 在 `tooling/check-boundaries.mjs:37`（数组含 `'skill-chef'`），两半断言同源派生（`:39-44` 依赖闭包、`:45-60` 源码＋模板扫描）；**仓内** `packages/base-render/package.json:11` **有** `"./help-shell"`（version `0.3.0` 在 `:3`）——缺的是**发布态**：git 里 `21ef322`（09-10 17:33）加子路径，晚于 `3e46ab0`（09-10 14:06）那次「联动发版 base-paint 0.3.0」，故 registry 上 0.3.0 的 exports 不含它（§6.6）。

---

## 一、契约正本（以代码为准）

### 1.1 先分清两条路（只有 A 路是本图的出口）

| 路 | 实现 | 入口 | 校验 | 消费者 |
| --- | --- | --- | --- | --- |
| **A · 老实物 help 模板**（本图的面） | `packages/base-render/assets/help-template.html`（2053 行／106,968 B） | 子路径 `base-paint/help-shell` 的 `renderHelpShellHtml`（`src/helpShell.ts:73`） | 只查 `groups` 非空（`:74-76`）；无 schema 校验 | 记账 HELP 文件（`skill-bill/src/render/helpFile.ts:19,152`，**直连**子路径）、卡路里 HELP 文件（`skill-calorie/src/render/helpFile.ts:23,72`，**隔一层本仓 deprecated 垫片**，见下表下注） |
| B · 组件式渲染（TS 直接拼 DOM，页面无运行时脚本） | `packages/base-render/src/help.ts` | 主入口 `renderHelpShell(input: HelpShellInput)`（`src/help.ts:675`，`src/index.ts:40` 导出） | `SCENE_DATA_SCHEMA`（`src/spec/help.ts:106-238`）＋ `duplicate-id`／`status-invalid`／`types-invalid` | 卡路里速查台（`skill-calorie/src/render/helpCenter.ts:481`）——**另一个产品**，不是 HELP 文件 |

两套的**字段读法不同**，别混：`subtitle`／`meta_blocks` 在 A 路不渲染（本报告实测），B 路真渲染（`subtitle`：`src/help.ts:403-409`，注释原文「`subtitle` 必须渲染，F3 读而不渲染属缺陷」；`meta_blocks`：`:595-601` 的 `renderMetaBlocks` ＋ `:653-656` 的挂载判据）；文档标题拼法也不同（B 路是 `title · skill_name` 方向，见 `src/help.ts:611-614` 注释）。

**邻居到底走哪条（整改期补全证据链，A 席指出原报告少一环）**：**两个邻居最终都到 A 路**，没有邻居走 B 路。

- 记账：**直连**子路径 —— `helpFile.ts:19` `import { renderHelpShellHtml } from 'base-paint/help-shell';`、`:152` `return renderHelpShellHtml(data);`
- 卡路里：**隔一层本仓 deprecated 垫片** —— `helpFile.ts:23` `import { renderHelpShellHtml } from './helpShell.js';`（那是 `packages/skill-calorie/src/render/helpShell.ts`，25 行，头注释写「#136 路 help 模板消费方转发（deprecated）…本模块零模板字节：常量全部 re-export 自 base」），垫片内部 `:11` 才 `import { renderHelpShellHtml as renderBaseHelpShellHtml } from 'base-paint/help-shell';`；⚠️ 垫片会**重映射错误码**（`:20-22` `missing-data` → `CalorieRenderError`）。⇒ **票 6 的 chef 侧要直连 `base-paint/help-shell`（照记账），别抄卡路里的垫片。**

`docs/skills/skill-home/t186-template-contract.md:9` 是同一件事在居家管家上的先例报告，结论与本报告一致（我逐条在代码上复核过，无出入）。

### 1.2 谁是谁的源（三件都读了）

| 件 | 角色 | 证据（原文） |
| --- | --- | --- |
| `packages/base-render/assets/help-template.html` | **唯一真相源**（人／AI 可读可改） | 生成器头注释 `scripts/gen-help-shell.cjs:1`：`/* help模板转正管线：assets/help-template.html（唯一真相源）→ src/helpShell.ts＋测试哈希。` |
| `packages/base-render/scripts/gen-help-shell.cjs` | **生成器**（读真相源 → 写两个生成物） | `:15-17` `SRC_HTML`／`OUT_SRC`／`OUT_TEST`；`:296-297` `fs.writeFileSync(OUT_SRC, outSrc)`／`(OUT_TEST, outTest)`；`:278-295` `--check` 只比对不写盘，不一致即非 0 |
| `packages/base-render/src/helpShell.ts`（116,173 B） | **生成物**（禁止手改） | 生成物头注释 `src/helpShell.ts:2-5`：`来源：packages/base-render/assets/help-template.html（help模板唯一真相源…）／生成方式：本文件由 node packages/base-render/scripts/gen-help-shell.cjs 机器生成，禁止手工改动` |
| `packages/base-render/test/help-shell-136.test.mjs` | **生成物**（哈希锁，常量禁手填） | 生成器 `:192`「test/help-shell-136.test.mjs（全量生成；哈希常量来自源切分实测值，禁手填）」；`:234-235` 两条 `sha(...)` 断言 |

真源的两条硬门（改模板会当场抛）：**全 CRLF**（`:28` `if (/(?<!\r)\n/.test(html)) throw new Error('help-template.html 须全 CRLF 行尾（禁转 LF）');`）、**必须起于 `<!DOCTYPE html>`**（`:29`）；中段必须含 3 槽注释（`:19` `SLOTS`、`:38-40` 断言）、前缀必须含文档标题占位（`:42`）。
三条命令：`pnpm --filter base-paint gen:help-shell`（重跑）／`gen:help-shell:check`（只校验）／**本票未跑**（会改生成物）。

### 1.3 出口签名与注入形状（A 路）

```ts
// packages/base-render/src/helpShell.ts:73-80
export function renderHelpShellHtml(data: HelpShellData): string {
  if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
    throw new HelpShellError('HELP 渲染缺分组（不返空页）。');
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const title = escapeTitleText(composeDocTitle(data));
  return HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title) + json + HELP_SHELL_SUFFIX;
}
```

- 出口别名：`src/helpShell.ts:83` `export const renderHelpShell = renderHelpShellHtml;`（与 `renderHelpShellHtml` 同一实现；断言在生成物 `test/help-shell-136.test.mjs:34`，发射处是生成器 `gen-help-shell.cjs:243`）。
- 类型面（**5 项**）：`src/helpShell.ts:22-28`
  ```ts
  export interface HelpShellData {
    readonly skill_name: string;
    readonly title: string;
    readonly subtitle: string;
    readonly contact: unknown;
    readonly groups: readonly unknown[];
  }
  ```
  `contact`／`groups` 是 `unknown`（不做结构校验）；`groups` 只查非空且是数组。
- 注入锚点：`src/helpShell.ts:48` `export const HELP_SHELL_DATA_OPEN = "<script id=\"help-data\" type=\"application/json\">" as const;`；真相源对应行 `help-template.html:190`（容器内是 3 条 `<!--SLOT:…-->` 注释，生成器把它整段丢掉）。
- 文档标题占位：`src/helpShell.ts:51` `export const HELP_SHELL_TITLE_SLOT = "__HELP_TITLE__" as const;`；真相源 `help-template.html:6` `<title>__HELP_TITLE__</title>`。
- 页面侧读取（**全局名**）：`help-template.html:1647-1656`
  ```js
  var HELP = JSON.parse(document.getElementById('help-data').textContent);
  var SKILL_NAME = HELP.skill_name || '';
  var TITLE = HELP.title || '能力速查台';
  var SUBTITLE = HELP.subtitle || '';
  var META_BLOCKS = HELP.meta_blocks || [];
  var INIT_BANNER = HELP.init_banner || null;
  var CONTACT = HELP.contact || null;
  var SKILL_VERSION = HELP.version || '';
  var ABOUT_EXTRA = {};
  var RECOMMENDATIONS = HELP.recommendations || [];
  ```
**注入层字段名以模板为唯一权威**（`help-template.html:1658-1682`，整改时逐行复核）。契约注释原文：

```
契约 v1 (groups[{id,icon,label,subgroups[{id,label,scenes[]}]}])
   -> 原型内部结构 (key/icon/name + subgroups[{name,scenes}])
```

归一化代码逐行（`:1663-1680`）：`id: s.id`／`name: s.title`／`chip: s.wake_word`／`types: (s.types && s.types.length ? s.types : [])`／`dev: (s.status === '【待开发】')`／`prompt: s.prompt_template`／`params: (s.editable_fields || []).map(f => ({ key: f.name, label: f.label, value: f.value||'', req: !!f.required, hint: f.hint||'' }))`。

⇒ **注入层要读／要给的字段**：`s.id`／`s.title`／`s.wake_word`／`s.types`／`s.prompt_template`／`s.status`／`s.editable_fields[{name,label,value,required,hint}]`；**`key`／`name` 是模板内部原型名**（`:1677` 的 `g.key`／`g.name`、`:1679` 的 `sg.name`、`:1664` 的 `name`），注入层给 `key`／`name` 会被忽略。

⚠️ **地图 Notes 里那句 `scenario_title→name`／`scenario_id→key` 是错的**，别照抄：正确映射是 `scenario_id→id`、`scenario_title→title`。改名的真正要害在另外两处——`prompt→prompt_template`、`type`（单数字符串）`→types`（数组）。

- **A 路在新仓没有校验器**：`renderHelpShellHtml` 只查 `groups` 非空。老注入器那套硬校验（§1.4）在新仓**没有实现**；老校验拦得住的错（scene id 重名、group id 撞 scene id），在新仓会静默错——`help-template.html:1691` `ALL.push(s); SCENE[s.id] = s;`（重名后者覆盖前者）、`:1782` `data-page="' + g.key + '"` 与 `:1830` `data-nav="' + g.key + '"`（Tab 与页同名，重名即两个 Tab 指向同页）。

### 1.4 老注入器的硬校验逐条（`D:\2Study\StudyNotes\SKILLS\公共组件\injector.py`）

`validate_help_data` 全文在 `injector.py:134-180`。逐条（每条都是我实跑过的，探针 `.scratch/chef-help/t3/probe_validate.py`，反例结果见 `probe_validate.stdout.txt`）：

| # | 行号 | 原文片段 | 实际判据（实跑） |
| --- | --- | --- | --- |
| 1 | `:127` | `_HELP_REQUIRED_TOP = ('skill_name', 'title', 'groups')` | 三项；`groups` 空数组也算缺（`not []` 为真） |
| 2 | `:136-137` | `if not isinstance(data, dict): return False, 'HELP 数据必须是 JSON 对象'` | 顶层必须是对象 |
| 3 | `:138-140` | `missing = [k for k in _HELP_REQUIRED_TOP if not data.get(k)]` `return False, f'HELP 数据缺必填字段: {", ".join(missing)}（scene-data-contract §1）'` | **非空**才算有（空串即失败） |
| 4 | `:141-143` | `if not isinstance(groups, list) or not groups: return False, 'groups 必须是非空数组'` | 非空数组 |
| 5 | `:144` | `seen = set()` | **唯一集合在建组循环之前建立，两半共用**（见 #11） |
| 6 | `:146-147` | `if not isinstance(g, dict) or not g.get('id') or not g.get('label'): return False, f'groups[{gi}] 缺 id/label'` | group 必 `id`＋`label` 且非空 |
| 7 | `:148-150` | `if g['id'] in seen: return False, f'分组 id 重复: {g["id"]}'` `seen.add(g['id'])` | group id 唯一 |
| 8 | `:151-153` | `if not isinstance(sgs, list) or not sgs: return False, f'groups[{gi}] ({g["id"]}) 缺 subgroups（非空数组）'` | group 必有非空 `subgroups` |
| 9 | `:155-156` | `if not isinstance(sg, dict) or not sg.get('label'): return False, f'groups[{gi}].subgroups[{si}] 缺 label'` | subgroup 只要 `label`（**`id` 既不查也不进唯一集合**，见 §8 不一致 1） |
| 10 | `:157-159` | `if not isinstance(scenes, list) or not scenes: return False, f'…（{sg.get("label")}）缺 scenes（非空数组）'` | 非空 `scenes` |
| 11 | `:163-166` | `for f in ('id', 'title', 'wake_word', 'prompt_template'): if not s.get(f): return False, (f'场景 {s.get("id", "?")} 缺字段: {f}（scene-data-contract §3）')` | 场景四元组必填且非空 |
| 12 | `:167-169` | `if s.get('status') not in ('', '【待开发】'): return False, f'场景 {s.get("id")} status 非法: {s.get("status")}（只允许 "" / 【待开发】）'` | 二态；**`status` 字段缺失也失败**（实跑：`FAIL … status 非法: None`）——即实际必填 |
| 13 | `:170-172` | `if s['id'] in seen: return False, f'场景 id 重复: {s["id"]}'` `seen.add(s['id'])` | **与 #7 同一个 `seen`** ⇒ group id 与 scene id 全局共用一个唯一集合 |
| 14 | `:173-179` | `efs = s.get('editable_fields')` … `if not isinstance(ef, dict) or not ef.get('name') or not ef.get('label')` | 可选；给了就必须是数组且每条有 `name`＋`label` |
| 15 | `:180` | `return True, ''` | — |

**校验不拦的（实跑确认为 OK）**：`contact`／`meta_blocks`／`version`／`init_banner` 全删；多带未知顶层字段；`subgroup.id` 缺失或跨组重名；场景用老字段名 `type`（单数）且无 `types`；场景无 `types`。

### 1.5 模板运行时到底读哪些字段（实测，不是读出来的）

**判据（整改期改换，A 席指出的方法学缺陷）**：判「渲染与否」**不能**用「哨兵是否出现在静态段」——A 路的正文**全部由页面侧 JS 拼**，静态段里只有空容器 `<div class="screen" id="screen"></div>`（`:171`），正文在 `:1834` 由 `screen.innerHTML = h` 落地。故**任何**注入值都不可能出现在静态段文本里（唯一例外是经 `composeDocTitle` 服务端插值的 `<title>`）；实测 `contact`／`groups` 是铁定渲染的，它们的哨兵在静态段同样是 **0 次**。
⇒ 正确判据是**可达性**：**该变量有没有出现在 `help-template.html:1771-1834` 的 `h +=` 链上（直至 `:1834` 的 `screen.innerHTML = h`）**。A 席探针 `.scratch/chef-help/t3-review-A/probe_reachability.mjs` 可直接复用，其结论：`SUBTITLE false`／`META_BLOCKS false`／**`RECOMMENDATIONS true`**／`INIT_BANNER true`／`CONTACT true`／`SKILL_VERSION true`／`GROUPS true`／`SKILL_NAME true`／`TITLE true`。

下面保留原探针读数（它对「是不是服务端插值」仍然有效，只是**不能**用来推「不渲染」）：

拿 `packages/base-render/dist/helpShell.js` 真跑一遍（探针 `.scratch/chef-help/t3/probe_render.mjs`，产物 `probe-render.html`；夹具 5 项＋4 项全给，每个值埋一个哨兵串）：

| 项 | 产物里的落点（实测） |
| --- | --- |
| `title` | 写进 `<title>`：实测 `doc_title = "私家大厨 · 使用手册(HELP)"`（哨兵夹具的另一支见 §6.1）；不进静态正文（页面 h1 由运行时从 JSON 读） |
| 其余 18 个哨兵（`subtitle`／`contact` 两项／`groups` 三层／`version`／`init_banner` 四值／`recommendations` 三值／`meta_blocks` 两块／`editable_fields`） | **静态段 0 次**（⚠️ **不代表不渲染**，见上面的判据），`help-data` 的 JSON 段各 1 次 |
| 模板自带文案／类名（非注入值） | 静态段有：`HELP 模板 v4` 1 次、`联系作者` 5 次、`init-banner` 7 次、`tab-bar` 4 次、`subgroup` 18 次 |

**逐键的可达性结论**（A 席实测，整改纳入）：**真渲染**的有 `skill_name`／`title`／`contact`／`groups`／`version`／`init_banner`／**`recommendations`**；**读了不渲染**的只有 **`meta_blocks`**（仅 `:1651` 声明，大小写敏感计数 1 次／1 行）与 **`subtitle`**（仅 `:1650` 声明，1 次／1 行；⚠️ `:1775` 那个 `subtitle` 是 `INIT_BANNER.subtitle`，**另一个字段**，别混）。

字节数：整页 **107,128 B**；载荷段 **1,298 B**；静态段 **105,830 B**。产物里 `__HELP_TITLE__` 与三条 `SLOT:…` 注释**均已消失**（各 0 次）。两次同参渲染逐字节一致（页内无时间戳；时间只在调用方给的 `subtitle` 等值里）。

**文档与代码不一致（票面点名要的）**：

| # | 文档怎么说 | 代码实际 | 判定 |
| --- | --- | --- | --- |
| 1 | `docs/scene-data-contract.md:55`：`groups[].subgroups[].id` **✅ 必填** | `injector.py` 只查 `label`（`:155-156`）；A 路模板只读 `sg.label`（`help-template.html:1679`）；实跑：缺 `id`／跨组重名 `id` 均 **OK** | **不一致**（文档多要求一个字段，代码不查也不用） |
| 2 | 票面／#145 口径：三块可选内容 `meta_blocks`／`version`／`init_banner` | `meta_blocks` 在 A 路**不渲染**（声明即死）；`docs/scene-data-contract.md:116` 自己也写「Base 当前不渲染展示 meta_blocks」 | **一致**（票面「可选内容」不等于「会显示」；记账 `helpFile.ts:55` 注释也写「不渲染，供外部消费」） |
| 3 | 老契约文档顶层表只有 5 个字段（`D:\2Study\StudyNotes\SKILLS\公共组件\docs\scene-data-contract.md:23-27`，逐行是 `skill_name`／`title`／`subtitle`／`meta_blocks`／`groups`；⚠️ 原报告漏写 `公共组件/` 前缀且行号写成 `:1`，已改正） | 模板运行时读 **9 个**，真未收录的是 **`contact`／`init_banner`／`version`／`recommendations`**（`meta_blocks` **已在表内**，不是多出来的那个） | **文档少列 4 项**（记账把这 4 项当"契外可选键"照传，见 `helpFile.ts:11-17`） |
| 4 | `src/spec/help.ts:73` `SceneInitBanner.steps?: readonly string[]`（字符串数组） | 模板 `help-template.html:1776` 读 `st.title`／`st.desc`（**对象数组**） | **不一致**（B 路类型面 vs A 路运行时；不传 `steps` 即无影响） |
| 5 | `src/spec/help.ts:86-90` `SceneRecommendation{name, reason?, wake_word?}` | 模板 `:1821-1822` 读 `r.name`／`r.desc`／`r.wake` | **不一致**（要传就照 A 路的三个名） |
| 6 | 老契约场景字段 `types`（复数） | 模板只读 `s.types`（`:1666`），老件字段名是 `type`（单数） | 老件直接照搬会**静默无徽章**（实跑：`types` 是可选、校验不拦） |
| 7 | `contact` | 模板真读真渲染（`:1653`／`:1801-1815`），但老契约文档 `scene-data-contract.md` 与 `injector.py` **都没有 contact** | **文档未收录**（地图 Notes 的"事实标准"判断成立） |

---

## 二、5 项必填的准确形状与渲染落点

形状以 `HelpShellData`（`src/helpShell.ts:22-28`）＋模板运行时读法（`help-template.html:1648-1682`）为准。

| 项 | 类型／形状 | 谁读它 | 渲染到页面的哪里（模板里的选择器或函数） | 私家大厨的取值来源 |
| --- | --- | --- | --- | --- |
| `skill_name` | `string`（非空） | 页面运行时 `SKILL_NAME`（`:1648`）；生成物 `composeDocTitle`（`:66-70`） | ① hero 左上小字 `.eyebrow`（`:1772` `esc(SKILL_NAME)`）；② 关于 Tab 版本段 `<b>`（`:1817`）；③ 文档 `<title>` 的拼法之一（经 `composeDocTitle`） | 接线常量 `'私家大厨'`。老家同一物：老 `meta.skill`（`scenarios.yaml:2`＝`私家大厨`）、老页面 `<h1>🍳 私家大厨 HELP</h1>`（`templates/help.html:206`） |
| `title` | `string`（非空） | `TITLE`（`:1649`，缺省兜底 `'能力速查台'`）；`composeDocTitle` | ① hero 大字 `<h1>`（`:1772` `esc(TITLE)`）；② 文档 `<title>`（占位替换） | 老家标题原文是 `私家大厨 HELP · 能力速查`（`templates/help.html:12` 的 `<title>`；`:206` 的 h1 是 `🍳 私家大厨 HELP`）——**不含** `使用手册(HELP)`（那是记账／居家的老世代形状）。取哪个值归票 6；三支实测见 §6.1 |
| `subtitle` | `string` | `SUBTITLE`（`:1650`） | **A 路不渲染**（全模板仅 1 次引用＝声明处；实测哨兵静态段 0 次） | 若照记账：`〈域数〉 功能域 · 〈场景数〉 场景 · 版本 〈version〉 · 更新于 〈本地分钟〉`（`skill-bill/src/render/helpFile.ts:100-103`）；chef 的可用计数：10 域／33 组／48 场景（本票复点，§4） |
| `contact` | `{items: {label:string; value:string; url?:true}[]; copy_all?:boolean}`（类型面是 `unknown`，形状由模板定） | `CONTACT`（`:1653`） | 关于 Tab 第一段「联系作者」（`:1801-1815`）：逐项 `<b>label</b>`＋值；`url && value` 以 `http` 开头 → `<a target="_blank">`（`:1804-1805`）；`copy_all` 为真再加一行「一键复制」（`:1810-1813`） | **老家私家大厨没有这个字段**（`scenarios.yaml` 全文 `contact` 0 命中；老页无联系段）。新仓只有邻居可照：记账三项含 qq 邮箱（`helpFile.ts:46-53`）／卡路里两项（`helpCenter.ts:141-146`，仅 GitHub＋Issues）。取哪套归票 6 |
| `groups` | 三层数组（见 §四）：`{id, icon?, label, subgroups:[{id?, label, scenes:[…]}]}` | `GROUPS`（`:1675-1682` 规格化）；扁平化 `ALL`／`SCENE`（`:1687-1694`） | ① 底部 Tab 条：每域一个 `<button class="tab" data-nav=id>`，图标走 `SVG_ICONS[icon]`，不在表里当 emoji（`:1740-1744`／`:1829-1832`）；② 每域一页 `.page[data-page=id]`（`:1782`）；③ 页内二级组 `<details class="subgroup" open><summary>label＋计数`（`:1784`）；④ 组内每场景一张 `.mini[data-key=id]` 卡：唤醒词 chip＋类型徽章＋场景名＋「复制」按钮（`:1786-1792`）；⑤ 点卡开底部抽屉 `openSheet`（`:1915-1942`）；⑥ hero 计数 `ALL.length 场景`（`:1772`） | 老家 `references/scenarios.yaml` 的三层素材：10 域（由 `scenes[].html.template` 的目录名反推）／33 唤醒词组（`scenarios.yaml` 的 `scenarios[]` 顶层条目）／48 场景卡（`scenarios[]` 展开后共 48 条，实测无重号，33 组卡数之和＝48）。字段名要换：`scenario_id→id`、`scenario_title→title`、`wake_word→wake_word`、`type`（单数）→`types`（数组）、`prompt→prompt_template`（§1.3 的字段名表／§七）。⚠️ **地图 Notes 写的 `scenario_title→name`／`scenario_id→key` 是错的**——`key`／`name` 是模板内部原型名，注入层给会被忽略（§1.3）。10 域的 `id`／`label`／`icon` 来源见 §2.2 |

场景内字段的运行时读法与落点（A 路，`normalizeScenes` `:1660-1673`）：`id`→卡片 `data-key` 与抽屉索引（`:1663`／`:1691`／`:1786`）；`title`→卡片名（`:1664`／`:1789`）；`wake_word`→chip（`:1665`／`:1724-1725`）；`status==='【待开发】'`→多一枚「待开发」徽章（`:1667`／`:1726`）；`prompt_template`→复制按钮正文（`:1668`／`:1790`）；`types`→类型徽章，配色查 10 词表 `TYPE_DEFAULT`，表外词退到「查看」蓝（`:1666`／`:1698-1723`）；`editable_fields`→抽屉里的参数输入框（`:1669-1671`／`:1747-1751`）。

### 2.2 10 域的 `id`／`label`／`icon` 从哪来（接同图票 2）

第一层（`groups[]`）的三样东西**都不是新造**，出处是**同图票 2 的 10 域中英名对照表**（`docs/skills/skill-chef/t2-content-reconcile.md`）：

| 契约字段 | 取值 | 权威出处 |
| --- | --- | --- |
| `groups[].id` | 域文件 `domain.key` 的英文名 | t2 报告 §七 字段映射表（L615）明写「`id` 取域文件 `domain.key`」；该表（第一节「10 域中英名对照表」，含表头）在 §一「10 域中英名对照表」（表头 L90），五处独立出处附表在 §一（L104-121） |
| `groups[].label` | 中文域名 | t2 报告 §七 字段映射表（L615）「`label` 取 `domain.name`」 |
| `groups[].icon` | 域文件 `domain.icon` | t2 报告 §七 字段映射表（L615）「`icon` 取 `domain.icon`」 |

**10 域英文名（票 2 查明，有权威出处，不是自创）**：`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`，逐条对应 做菜／查看／搜索筛选／修改／历史／采购／录入／派生／开始使用／数据管理（t2 报告 §一「10 域中英名对照表」，表头 L90、表体 L91-100，2026-09-12 复核）。域内条数 5／8／13／4／4／1／6／3／1／3 ＝ 48。

⚠️ **两处词形不一致，以域文件的 `domain.key` 为准**（t2 报告 §一，L104 起）：老脚本 `cooking_render.py` 对的是域 key `cook`（脚本名不是 `cook_render.py`）、`recipe_render.py` 对的是域 key `view`（脚本名不是 `view_render.py`）。**别拿脚本名当英文名**。

另一条约束（铁律四要的「名字只许从 HELP 的现成说法里取」）：t2 报告 §一（L104）已核——仓里现成的 8 条命令只有 5 个段名（`recipe`／`cooking`／`shopping`／`history`／`help`），**凑不出 10 个域**，故能力目录名只能取自域文件。

---

## 三、三块可选内容的准确形状与渲染落点

**先把「传＝白做」推到底**（整改补）：三块可选内容在 **A 路产出的 HTML 里，传与不传逐字节相同**——静态段全 0 次命中，唯一差别落在 `help-data` 载荷段的 JSON 里（§1.5 实测：19 个哨兵静态段 0 次、载荷段各 1 次；两次同参渲染逐字节一致）。⇒ 「照记账传」与「照卡路里不传」在本图**对产物不可观测**，只在载荷与页面外消费者那里有区别。这句话是票 6 取舍时唯一需要权衡的事实。**（更正，自 t202 起）**：「传与不传逐字节相同」只对 `version`／`init_banner`，以及 `meta_blocks` 里**块 `id` 与分组 `id` 零碰撞**的载荷成立；`meta_blocks` 里 `id` 命中某个一级分组的块会渲在该分组页页首，见 §3.1 与 `docs/base/base-render/t202-help-meta-blocks.md`。

### 3.1 `meta_blocks`

- **形状**：`{id, title, html}[]`（B 路类型面 `src/spec/help.ts:61-66`；老文档 `docs/scene-data-contract.md:110-114` 同形；记账 `helpFile.ts:56-60` 同形）。
- **渲染落点**：**有**（自 t202 起）。模板 `var META_BLOCKS = HELP.meta_blocks || [];`（`help-template.html:1653`）读入后，在**分组页锚点**之后按 `m.id === g.key` 渲同 id 的块（`:1786-1789`；`title` 转义、`html` 原样透传）。**块 `id` 必须逐字等于某个一级分组的 `id` 才上页**，对不上任何分组 id 的块不上页（死载荷）。详见 `docs/base/base-render/t202-help-meta-blocks.md`。实测哨兵 `META-SUMMARY-SENTINEL`／`META-WAKE-SENTINEL` 在静态段 0 次、载荷段各 1 次（本图裁剪后的口径未变）。
- **缺省行为**：不给就 `[]`，**该页输出与旧版逐字节相同**（`:1786` 的 `forEach` 零迭代 ⇒ 零输出）。照记账传的两块 `id`（`help_summary`／`help_wake_words`）与它的 7 个分组 id 零碰撞 ⇒ 记账页上也**不渲染**；照卡路里不传同样零差异。老文档 `scene-data-contract.md:116` 的「Base 当前不渲染展示 meta_blocks」已成假，勿再引用。
- **私家大厨取值来源**：见 §五（照记账派生）。

### 3.2 `version`

- **形状**：`string`（B 路 `src/spec/help.ts:101`；老文档顶层表未列）。
- **渲染落点**：关于 Tab「版本」段，模板 `:1817` 原文（CRLF 折行的长串里那一段）：`'<b>' + esc(SKILL_NAME) + '</b><span>v' + esc(SKILL_VERSION) + ' · HELP 模板 v4</span>'` ⇒ 页面显示 `v<version> · HELP 模板 v4`。
- **缺省行为**：`SKILL_VERSION = HELP.version || ''`（`:1654`）——不给就渲染成 `v · HELP 模板 v4`（**不判空**，段照出）。
- **私家大厨取值来源**：老家有版本号 —— `references/scenarios.yaml:3` `version: 0.1.0`（`meta` 段），老页面确实显示它（`templates/help.html:209` `<span>🔖 v<span id="version"></span></span>`；`:326` `document.getElementById('version').textContent = DATA.meta?.version || '?'`）。但记账把 `version` 的语义定成「技能数据世代」而非 npm 包版本（`helpFile.ts:13-14`、`:28-29`：`'2.0'` 而不是 npm 的 `0.1.0`）。**chef 的两者同值（都是 `0.1.0`，`packages/skill-chef/package.json:3`），语义分辨不出来**——归票 6（§6.2）。

### 3.3 `init_banner`

- **形状**：模板读 `title`／`subtitle`／`button_text`／`prompt`／`closable`／`hidden`／`steps`；B 路类型面是 `{title, subtitle?, button_text?, prompt?, steps?}`（`src/spec/help.ts:68-74`），**没有** `closable`／`hidden`（模板另认这两个，是页面侧扩展）。
- **渲染落点**：hero 与搜索框之间（`:1775-1777`）：`<div class="init-banner">`＝标题 `.ib-title`＋副标题 `.ib-sub`＋一枚 `data-c=prompt` 的复制按钮（正文 `button_text`）＋✕ 关闭（`closable === false` 才不画）；`steps` 非空时横幅内横排步骤卡（读 `st.title`／`st.desc`，**对象数组**，与类型面不一致）。关闭动作 `:1837-1841`。
- **缺省行为**：`:1775` 的判据原文是
  ```js
  (INIT_BANNER && !INIT_BANNER.hidden ? '<div class="init-banner" …' : '')
  ```
  ⇒ **没有这个字段 → 不显示；有且 `hidden !== true`（含缺 `hidden`、`hidden: null`）→ 显示；`hidden: true` → 不显示**。进了分支就不再判各子字段是否为空（`esc(undefined)` → 空串）。
- **私家大厨取值来源**：**老家没有这一块**——老 `scripts/render_help.py`（276 行）全文无 `init_banner`／无首次使用横幅／无 `_is_initialized`；老模板 `templates/help.html` 也没有横幅（`grep init` 零命中）。新仓只有两条先例：记账「键常在、显隐走 `hidden`，`hidden = (DB 文件存在)`，且全程不开库」（`helpFile.ts:15-17`、`:128`；`cmd_read.ts:82-86`、`:76-77`）、卡路里「三块可选一律不传」（`skill-calorie/src/render/helpFile.ts:13-14`）。归票 6（§6.3）。

### 3.4 第四块 `recommendations`（票面没点名，但模板也读）

- **形状**：A 路读 `{name, desc, wake}`（`:1821-1822`）；B 路类型面是 `{name, reason?, wake_word?}`（`src/spec/help.ts:86-90`）——**名不同**。
- **渲染落点**：关于 Tab 第三段「其他技能」（`:1819-1825`），`name`＋`desc`＋`wake` 徽章；不给整段不出现。
- **私家大厨取值来源**：老家无（老 chef HELP 页没有「其他技能」段），记账／卡路里都不传。归票 6 决定要不要传。

### 3.5 内容不丢：六个口子的落法（整改补，B 席判定本图最可能翻车处）

老载荷（`.scratch/chef-help/legacy-chef-help-payload.json`，48 条，`JSON.parse` 后逐条复核，证据件 `.scratch/chef-help/t3/verify_payload.mjs`＋`verify_payload.out.json`）里有**六个字段在契约场景 6 键里没有字段位**。每个口子按「**落法 ＋ 归属票 ＋ 若不做会怎样**」三段写。票 2 的可入库草案是 6 键＝`id`／`title`／`wake_word`／`types`／`status`／`prompt_template`（t2 报告 §七 字段映射表 L608），其映射表（§七，L609-621）**不含**下面除 `types` 之外的任何一项——所以这六条**不能在票 5 那里自动落地**。

#### 口子 1 · `dimensions`（46/48 卡有内容，键并集 42）——**最重**

| 实测项 | 值 |
| --- | --- |
| 有 `dimensions` 键的卡 | **48/48**（都有这个键） |
| 非空 | **46/48**（另 2 张是空对象 `{}`） |
| 键并集 | **42 个**＝合法 41 ＋ 畸形键 1 个 |
| 畸形键 | `默认不含)`（值 `null`，来自 `data_export_backup` 一张卡的 YAML 笔误） |
| 高频键 | `recipe` 23／`input` 6／`focus` 4／`scope` 3（其后 `action`／`cuisine`／`ingredient`／`keyword` 各 2） |

**落法（唯一合法的映射）**：`dimensions` 的**键**（英文）→ `editable_fields[].name`；`dimensions` 的**值**（中文示例值文案，如 `recipe: 指定菜名`）→ `editable_fields[].hint`；`label` 需另给中文（可沿用老 33 组名／域名词表），`required` 需另定（老件的值里带「必填／选填」字样，如 `feedback: 一句话反馈(必填…)`，可据此派生）。**模板侧的机械对应**（整改期逐行核过归一化代码）：`editable_fields` 非空 → 抽屉里出参数输入框（`:1669-1671`／`:1747-1751`／`:1920-1927`），且每个填了的参数在复制的指令正文里追加一行 `label: value`（`buildPrompt` `:1753-1764`）。

⚠️ **一处不能混**：场景卡上的 chip **只取 `s.wake_word`**（`:1665` `chip: s.wake_word`），**`dimensions` 的任何一键都不会进 chip**。⇒ 落了 `editable_fields` 之后，卡面的识别信息仍然只有唤醒词 chip 与类型徽章，`dimensions` 的两样东西分别落在**抽屉表单**（键／值／label／required）与**复制正文的追加行**上，**不上卡面**。

**逐键归位规则**（票 5 入库时按此裁，四类）：

| 类 | 键 | 归位 |
| --- | --- | --- |
| 甲 · 直接成 `editable_fields` 条目 | `recipe`(23)／`ingredient`(2)／`step`／`field`／`new_value`／`source`／`target`／`differences`／`child`／`parent`／`relation_type`／`change_summary`／`action`／`tab`／`servings`／`backdate`／`rating`／`feedback`／`keyword`／`cuisine`／`flavor`／`season`／`status`／`focus`(4)／`confirm`／`exclude_optional`／`stock_check`／`include_archived`／**`cookware`／`difficulty`／`group_by`／`ingredient_exclude`／`ingredient_swap`／`progress`／`time_max`(2)／`user_state`**（后 8 键为**本轮整改补**） | 键 → `name`；值 → `hint`；另补 `label`（中文）与 `required` |
| 乙 · 语义是「对象范围」而非填写位 | `scope`(3)（值恒为「全部食谱」）／**`extra`／`history`／`step_type`**（后 3 键为**本轮整改补**） | 建议**降为 `hint` 文案或直接不迁**；若迁，`scope` 作 `name`、`全部食谱` 作 `value` 预填 |
| 丙 · 语义是「输入载体」而非可写参数 | `input`(6)（值形如 `图片`／`MD 文件`／`JSON 文件`／`表单`／`对话逐步补充`） | 建议**不迁为表单字段**，改写进 `prompt_template` 文案（这些卡本来就写 `[发送图片] 录入这道菜。`）；若要留，`input` 作 `name`、载体名作 `hint` |
| 丁 · 畸形键 | `默认不含)`（1 张卡，值 `null`） | **丢弃**，不迁；同时把该卡 `include_archived` 的 `hint` 补全（老件那句「是否含已废弃(选填,默认不含)」被 YAML 折行切成了两个键） |

**闭合（本轮整改补，两票同口径）**：四类合计 **甲 36 键／67 条 ＋ 乙 4 键／6 条 ＋ 丙 1 键／6 条 ＋ 丁 1 键／1 条 ＝ 42 键／80 条**（36＋4＋1＋1 = 42 ✓，67＋6＋6＋1 = 80 ✓）——42 键**全部有归属**。本轮把原表漏掉的 **11 键／12 条键值对**（`cookware`／`difficulty`／`extra`／`group_by`／`history`／`ingredient_exclude`／`ingredient_swap`／`progress`／`step_type`／`time_max`(2)／`user_state`）逐键归位补进上表：**8 键进甲、3 键进乙**。**逐键的实测取值（老值原文）、出现卡与归位理由以兄弟件 t2 为权威**——见 `t2-content-reconcile.md` 第七节「`dimensions` 的落法」的「本轮补：原四类漏掉的 11 键逐键归位」表（t2 是逐键权威，本节引它）。**最终进 `editable_fields` 的键值对数 = 67 条（36 键）**：甲类全进；乙类 6 条按建议降为 `hint` 或不迁；丙类 6 条改写进 `prompt_template`、丁类 1 条丢弃。

**归属票**：转换本身属**票 5（内容资产入库）**，但**「`dimensions` 要不要整体进契约」是跨票归属**——它同时决定票 5 的资产形状、票 6 的渲染接线、以及票 2 草案要不要从 6 键扩到 7 键。⇒ **需由结构设计闸门票（票 6 第一步／第二步）收敛后再落**，不能只在票 5 单方面决定。

**若不做会怎样**：`recipe`(23)／`input`(6)／`focus`(4)／`scope`(3) 等**静默消失**——页面不报错、快照不断言、票 11 肉眼也未必一眼看出，但维护者打开卡片抽屉会看到**老件里有的参数输入框全没了**，复制出去的指令从「帮我做一道 ___」退化成一句没有槽位的死文案。

#### 口子 2 · `{{…}}` 占位符（16/48）——**原文写错，就地改正**

| 实测项 | 值 |
| --- | --- |
| 含占位符的 prompt | **16/48** |
| 全部分布 | `{{菜名}}` **15** 次／`{{N}}` **1** 次，共 16 次 |
| **单花括号** | **0 条**（关键改正：老载荷是**双**花括号） |

逐字样本（`.scratch/chef-help/legacy-chef-help-payload.json`，`JSON.parse` 后）：

```
cooking_start_fresh          :: 帮我做一道{{菜名}},我要按步骤来。
cooking_resume_after_pause   :: 我刚才做到第 {{N}} 步,继续帮我做完。
cooking_during_waiting_step  :: {{菜名}}正在炖,我能去干别的吗？
```

⚠️ **模板侧确认**：`help-template.html` 全文 grep `\{\{` **0 命中**，`buildPrompt`（`:1753-1764`）**不做任何占位符替换**（第一行就是 `prompt_template` 原文，其后才追加 `label: value` 行）。⇒ 照原样迁，复制出去的正文里**字面长着 `{{菜名}}`**。

**落法（二选一，必须选一，不能都不选）**：

- **甲 · 转 `editable_fields`**（推荐）：把每个 `{{…}}` 转成一条 `editable_fields` 条目，形状是 `[{name,label,value,required,hint}]`（`src/spec/help.ts` 类型面／老注入器 `injector.py:173-179` 只硬查 `name`＋`label` 非空；模板读法见 §1.3）。例：`{{菜名}}` → `{name:'recipe', label:'菜名', value:'', required:true, hint:'指定菜名'}`；`{{N}}` → `{name:'step', label:'步骤', value:'', required:true, hint:'第几步'}`。同时把 `prompt_template` 里的 `{{菜名}}` 改写成一个语义完整的空位说法（模板不会填它，留着就是给 AI 看的自然语言）。**副作用**：正文会变成「原文 ＋ 空行 ＋ `菜名: 宫保鸡丁`」，与老件的「就地填空」不同形。
- **乙 · 明说不转**：`{{菜名}}` 逐字保留（票 2 草案 §七 字段映射表 L613 已是「逐字（含 `{{菜名}}` 这类填写位）」），页面上没有输入框，正文照抄给 AI，由 AI 自己认这个花括号。**代价**：16 张卡的复制文案里带机器味的花括号，票 11 肉眼终审会看到。

**归属票**：转不转属**票 5 ＋ 票 6**（内容是票 5 的资产，接线是票 6 的渲染）；票面已把 `{{菜名}}` 逐字保留进草案（`:410`），故**若取乙，票 5 无需改动**；若取甲，**票 5 要改草案**。

**若不做会怎样**：不作选择＝默认走乙，16 张卡的指令里带 `{{菜名}}`；若中途有人按错的单花括号写法改文案或写断言，两边都会错（原文就是这么错的）。

#### 口子 3 · `type`（单数）→`types`（数组）的括号注

**口径已由票 2 定死，本票照办**：t2 报告 §七 字段映射表（L611）「按 `+` 拆开、去掉「(过程型)」这类括号注」，并已在 §七 JSON 草案逐条落成数组（`cooking_start_fresh` 起 L697）（例：`向导+选择+回执` → `["向导","选择","回执"]`）。

- 删掉括号注后，切分原子里**仍在模板配色表外的只有 3 个**：`对比`／`确认`／`转移`（原报告记的 5 个里，`回执(过程型)`／`勾选(过程型)` 去掉括号注后就是表内的 `回执`／`勾选`）。这 3 个退到「查看」蓝兜底（`TYPE_DEFAULT` `:1698-1723`）。
- **归属票**：票 5（内容资产）；「要不要为 3 个表外词改模板配色表」属**公共层**改动，须另开票走公共层审查，**不在本图内**。
- **若不做会怎样**：照搬单数 `type` 会**静默无徽章**（模板只读 `s.types`，`:1666`；实测这条是原文最有价值的一处结论，保留）。带括号注照搬则 5 个词全落蓝兜底，维护者会看到 5 个颜色不对的徽章。

#### 口子 4 · `aliases`（4 条）＋ `aliases_expanded_count=37`

- **实测**：组级 `alias_names` 共 **4 条**，挂在两个组上——`做菜模式` → `开始做菜`；`废弃食谱` → `不想要`／`删掉`／`废弃`。顶层键 `aliases_expanded_count` = **37**（＝33 组 ＋ 4 条别名）。
- **落法：不迁**（有出处）。契约的 `Scene.wake_word` 是**单个**字符串，无别名字段位；票 2 已裁「契约无字段位，草案不含」（t2 报告 §八 不迁清单 L639）。
- **必须一并改口径的一条**：老页面 hero 的 37 是**唤醒词**计数。新模板 hero 的计数**一律＝场景卡总数**（`ALL.length`，`help-template.html:1772` 两处：`.lead` 文案与 `.h-badge` 徽章）⇒ 新页面写 **「48 场景」**，不是 37 唤醒词、也不是 33 组。**这条是 B 席点名的口头替换关系，原报告未写。**
- **归属票**：票 5（资产不迁）＋票 2（对账表已出）。
- **若不做会怎样**：产物上会少 4 条唤醒词（新表 37 条里本就无这 4 条），页面 hero 数字若照老件写 37 就是**假数**。

#### 口子 5 · `result`（48/48 有值）——**明说不迁**

- **实测**：`result` **48/48 全部有值**（中文整句，如 `data_export_backup` 的「打包下载：全量 17 表 JSON ＋ 照片目录 ZIP…」），是老卡片唯一承载「这个场景产出什么」的字段。
- **落法：不迁**，理由三条：① 契约 6 键里没有字段位，模板 2053 行全文不读 `result`（不是「读了不用」，是**根本没有这个位**）；② 它的语义与 `prompt_template` 的「复制正文」不重叠，无处塞；③ 强行并入 `title` 或 `hint` 会把卡片标题撑成两句话（`:1789` 卡片名是一行）。
- **归属票**：票 5 明确记为「不迁」，并在产物说明里注明**老件有、新件无**，免得票 11 当成缺陷。
- **若不做会怎样**：不是内容丢失（是主动不迁），但**不写就会被当成丢失**——票 11 肉眼终审对着老件比，会问「老卡片上那句结果说明哪去了」。

#### 口子 6 · `html`（48/48）与 `variants`（96 处全空）

| 字段 | 实测 | 落法 | 归属票 | 若不做 |
| --- | --- | --- | --- | --- |
| `html` | **48/48** 有值，子键固定 3 个：`template`（**18 个**不同路径）／`command_cn`／`data_source` | **不迁**。`template` 的**目录名**已被用来反推 10 域（§4.2），反推完这个字段本身在契约里**没有字段位**（模板不读 `html`）；`command_cn` 与 `data_source` 是**老渲染管线的实现细节**（交给 `render_*.py` 的），新契约的对应物是新仓的命令层（`chef.*` 的 8 条命令），不是老脚本名 | 票 2（对账表记「不迁」）＋票 5 | 不写成「不迁」，票 6 会以为「域来源字段要一起入库」，多造一个没有消费者的字段 |
| `variants` | 键 **48/48** 都在，但 **96 处全是空数组**（`variants_nonempty_cards = 0`，`variants_total_items = 0`） | **不迁**（零内容损失；空数组不带信息） | 票 2 | 低风险；写明只是为了票 11 别把它当缺项 |

**一条总口径**：上面六个口子里，只有 `dimensions`（口子 1）是**真会丢内容**的；`{{…}}`（口子 2）是**形状会错**的；其余四条是「不迁＋写明理由」。

---

## 四、两层（33 组／48 卡）→ 三层（域／组／场景）的落法

### 4.1 模板要的三层各自渲染成什么（一切以代码为准）

| 层 | 字段 | 渲染成什么 UI | 代码 |
| --- | --- | --- | --- |
| 第一层（域） | `groups[]` | **底部 Tab 栏**一个按钮 ＋ 一个横向滑页（`.page`），关于 Tab 永远多一个（第 N+1 个） | `:1829-1832`（Tab）、`:1782`（页）、`:1799`（关于页）、`:1848-1897`（滑页） |
| 第二层（组） | `groups[].subgroups[]` | 页内**折叠组** `<details class="subgroup" open>`，标题＝`label` ＋ 场景数角标 | `:1784` |
| 第三层（场景） | `subgroups[].scenes[]` | 组内**场景卡** `.mini`（chip／徽章／题名／复制），点卡开**底部抽屉**（Sheet） | `:1785-1793`、`:1915-1942` |

三层的 `id` 用法：域 `id` → `data-page`／`data-nav`（`:1782`／`:1830`）；场景 `id` → `data-key` ＋ `SCENE` 字典键（`:1691`／`:1786`）；**二级组 `id` 模板根本不用**（`:1679` 只取 `sg.label`）。

### 4.2 老家两层实测（复点结论，供 §4.3 选路）

探针 `.scratch/chef-help/t3/probe_yaml.py`（输出 `probe_yaml.out.json`）：

- 顶层组 **33**（`scenarios[]`，每条一个 `wake_word`），展开场景 **48**，`scene_id` **无重号**，33 组卡数之和 **＝48**（即 33 组是 48 卡的一个**划分**）。
- 每卡还带 `html.template`（18 个不同路径），其**目录名**给出 **10** 个域：做菜 5／查看 8／搜索筛选 13／修改 4／历史 4／采购 1／录入 6／派生 3／开始使用 1／数据管理 3 ＝ 48。
- **「组」不跨域**：逐组统计其场景落在几个域 → 33 组**每组都只落一个域**（`wakeword_spanning_multiple_domains = []`）。故「域→组」是一棵干净的二级树，不需要拆组。
- 组大小分布：**24 个组只有 1 张卡**，9 个组有 2 张以上（做菜模式 5、录入食谱 4、查看食谱 3…）。
- 引擎侧还有一个「域」字段 `scenes[].domain`，只覆盖 **13/48**，取值 8 种（无「做菜」「查看」），且计数与目录名反推**不一致**（例：`修改` 2 vs 4、`历史` 1 vs 4、`搜索筛选` 1 vs 13）——它是写了一半的字段，**不能当域来源**（这条与地图 Notes 一致）。
- ⚠️ 「模板目录名」这条佐证有边界：18 条 `html.template` 路径里**只有 10 条在磁盘上存在**；`做菜`／`查看`／`采购`／`数据管理` 这 4 个"域"在 `templates/` 下**不是目录**（对应文件在 `templates/` 根），另有两处路径在磁盘上不存在（`历史/data_view_timeline.html`、`历史/data_view_dashboard.html`）。目录名反推的 10 个名字本身与地图一致，但"三处独立佐证"里只有「脚本名／`wake_word_variants.md` 分节」对全部 10 个成立。

### 4.3 中间那层怎么落（只列可行落法，不选）

| 落法 | 事实依据 | 代价／副作用 |
| --- | --- | --- |
| **甲 · 域＝第一层，33 老组＝第二层，48 卡＝第三层** | 33 组每组只落一个域（§4.2），可 1:1 保真；卡路里先例正是"运行期按 `subfunction` 派生二级组"（`helpCenter.ts:201-210`，组 id 通式 `group.id + '_' + 序号`，`:206`；空组剔除 `:263`） | 33 组里 24 组只有 1 张卡 ⇒ 页面上会出现 24 个"只有一个卡片的折叠组"；组名（唤醒词组名）与域名语义有重叠（如「做菜模式」） |
| **乙 · 域＝第一层，每域一个固定名二级组（如「全部」），33 组名并入场景 title／chip** | 模板只把 `subgroup.label` 当折叠标题，不参与检索语义（`:1784`）；场景卡可显示 `title`＋`wake_word`（`:1789`／`:1725`） | 丢掉老件的 33 组折叠信息（老件的分组是主要导航层，地图 Notes 说"换模板是换信息架构"）；33 组名与 48 张卡的所属关系会变成 `title` 前缀或 chip 文案 |
| **丙 · 域＝第一层，按"老组名／动作性质"另造一层二级组（不照老组）** | 模板不管二级组从哪来；卡路里就是运行期派生（`helpCenter.ts:234` 用 `trigger.subfunction`，无值走 `HELP_LEGACY_SUBGROUP`） | 需要一条新口径（谁决定 48 卡落哪个二级组），新表 37 条唤醒词与老 33 组不同形 ⇒ 归票 2／票 5 的对账表；且等于再造一套分组名 |
| **丁 · 33 老组当第一层（33 个 Tab），每域名降为二级组名** | 模板第一层数量无上限（Tab 条可横滑，`:1898-1905`） | Tab 从 10 个变 33 个（老件本身也是 33 个折叠组）；但"域"就没有承载物了，地图 Q2 已裁「用那 10 个域做一级分组」⇒ 与本图既定口径冲突，列出仅供对照 |

不变量（模板会因此炸或错，与 §1.3 的"新仓无校验器"合看）：`groups` 空即抛 `HelpShellError('missing-data')`（`src/helpShell.ts:74-76`）；`scenes` 为空的组会渲染成一张空 `<details>`；场景 `id` 重名会让抽屉开到另一张卡（`:1691`）；域 `id` 重名会让两个 Tab 指向同一页（`:1782`／`:1830`）。

---

## 五、`meta_blocks` 两块内容的派生方式（照记账：一处算、两处用）

**先说结论性事实**：这两块在 A 路**不会出现在页面上**（§3.1），派生只影响 `help-data` 载荷与外部消费者。记账照样派生并照传，卡路里干脆不传。

记账的做法（逐行）：

```ts
// packages/skill-bill/src/render/helpFile.ts:99-111
export function deriveSummaryLine(now: Date = new Date()): string {
  return String(WAKE_GROUPS.length) + ' 功能域 · ' + String(WAKE_ASSETS.length)
    + ' 场景 · 版本 ' + HELP_FILE_VERSION + ' · 更新于 ' + formatHelpMinute(now);
}
export function buildMetaBlocks(summaryLine: string): readonly HelpMetaBlock[] {
  return [
    { id: 'help_summary', title: 'HELP 汇总', html: '<p>' + summaryLine + '</p>' },
    { id: 'help_wake_words', title: 'HELP 唤醒词', html: '<p>' + HELP_WAKE_WORDS.join(' / ') + '</p>' },
  ];
}
```

```ts
// packages/skill-bill/src/render/helpFile.ts:137-146（一处算、两处用）
const summaryLine = deriveSummaryLine(now);
return {
  …
  subtitle: summaryLine,                 // 用处①（:141）
  …
  meta_blocks: buildMetaBlocks(summaryLine), // 用处②（:144）
  version: HELP_FILE_VERSION,            // 同一个常量还进 :102 的 summaryLine 与页面版本段
  init_banner: buildInitBanner(opts.initialized === true),
};
```

**「HELP 唤醒词」那一块的口径**：不从 HELP 页自己抓，从**口径层的唤醒词表派生**，且这 4 条**不进场景目录**（防自指）——`skill-bill/src/triggers/wake-assets.ts:980-986`：

```ts
/** HELP 自身的唤醒词（老实物 `meta_blocks.help_wake_words` 那一块；4 条，不进场景目录）。 */
export const HELP_WAKE_WORDS: readonly string[] = WAKE_TABLE
  .filter((e) => e.key === 'bill.help.lookup')
  …
```

**私家大厨的对应物（已核）**：`packages/skill-chef/src/policy/wakewords.ts:12-16` 的 `WAKE_TABLE` 里 `key === 'chef.help.lookup'` 恰 **4 条**：`私家大厨HELP`／`菜谱HELP`／`查帮助`／`能做什么`（同文件 `:2` 注释与 `src/help/lookup.ts:27` 注释都写「help.lookup4」，全表 37 条我逐条数过）。派生写法可照记账同一句 `filter`。
⚠️ 与老家的差异（事实，归票 2 对账）：老家的 HELP 主词是 **`私家大厨 HELP`（带空格）**，只此一条（老 `meta.help_wake_word`，`scenarios.yaml:5`；老 `render_help.py:196` 的复制日志里写的是 `私家大厨 HELP / 菜谱 HELP / 能做什么` 三条写法），新表是 **4 条、无空格**。`meta_blocks[1]` 里写哪一版归票 2＋票 6。

**若照记账派生，私家大厨两块的内容来源**（不写第二份源）：块一 `help_summary` ＝ `subtitle` 那一份字符串（同一变量传两处）；块二 `help_wake_words` ＝ `WAKE_TABLE` 里 `chef.help.lookup` 的 4 条 `phrase`。

---

## 六、私家大厨专属取值逐项

### 6.1 文档标题怎么派生（`composeDocTitle`）／`title` 与 `skill_name`

生成物原文（`src/helpShell.ts:66-70`，生成器 `gen-help-shell.cjs:141-145` 同文）：

```ts
export function composeDocTitle(data: { readonly skill_name: unknown; readonly title: unknown }): string {
  const skill = String(data.skill_name);
  const title = String(data.title);
  return title.includes(skill) ? title : skill + ' · ' + title;
}
```

- 入参只有 `skill_name` 与 `title`；`title` **已含技能名就不再前缀**（#145 修掉的重复标题缺陷，生成物 `:58-65` 的注释把来龙去脉写全了）。
- 替换发生在 PREFIX 上，替换值过 `escapeTitleText`（`src/helpShell.ts:53-56`）。⚠️ **它只替换 4 个字符**：`&`／`<`／`>`／`"`，**不转义 `'`**；页面侧那个五字符的 `esc()`（`[&<>"']`，模板 `help-template.html:1696`）是**另一个函数**，别混。（生成物 `:53` 的注释写着「五字符即够」，与它下面那行代码的 4 个 `replace` 不符——以**代码**为准。）
- **三支实测**（我的探针）：`{私家大厨, 能力速查台} → 私家大厨 · 能力速查台`；`{私家大厨, 私家大厨 · 使用手册(HELP)} → 私家大厨 · 使用手册(HELP)`（原样）；`{私家大厨, 私家大厨 HELP · 能力速查} → 私家大厨 HELP · 能力速查`（原样）。
- 老家现状（证据）：老页面 `<title>私家大厨 HELP · 能力速查</title>`（`私家大厨/templates/help.html:12`），h1 是 `<h1>🍳 私家大厨 HELP</h1>`（`:206`）——标题**自带技能名** ⇒ 若 `title` 照老家原文，`composeDocTitle` 走"原样"支，文档标题＝`私家大厨 HELP · 能力速查`。若照记账／居家的老世代形状（`X · 使用手册(HELP)`）也是"原样"支。
- **不确定处（票 6 侧仍需用户点头）**：`title` 到底取老家原文（`私家大厨 HELP · 能力速查`）、邻居形状（`私家大厨 · 使用手册(HELP)`）还是新造（如 `能力速查台`，会走前缀支）；h1 里要不要带 🍳（老家 h1 带，`<title>` 不带）。**归票 6，且属票 6 第一步／第二步要报用户点头的范围**——本票无权代裁。

### 6.2 `version`

- **老家现状**：`references/scenarios.yaml:1-5` 的 `meta` 段＝`{skill: 私家大厨, version: 0.1.0, generated_at: 2026-07-27, help_wake_word: 私家大厨 HELP}`；老页面把它显示出来（`templates/help.html:326` `DATA.meta?.version || '?'`，位点 `:209` `🔖 v<span id="version">`）。**所以老家有版本号，值是 `0.1.0`，且语义就是"数据资产版本"**（写在场景资产文件自己的 `meta` 里，不是包版本）。
- **新仓可行取值（证据）**：① 取老资产值 `'0.1.0'`（有出处，但会与 npm 包版本 `packages/skill-chef/package.json:3` 的 `0.1.0` **同值**，看不出是哪一个）；② 照记账「技能数据世代」自定一个值（记账取 `'2.0'`，理由是 bill 自己的 `init-status` 自述「v2.0 特征 deleted_at」——chef **没有**同款佐证）；③ 不传（照卡路里 `skill-calorie/src/render/helpFile.ts:13-14`：不传即页面显示 `v · HELP 模板 v4`，段照出）。
- **不确定处**：净值新仓 chef 的数据世代该是多少、以及"新表 37 条唤醒词"这一代算不算与老 48 场景同代——两条都无权威出处。**归票 6**。

### 6.3 `init_banner` 的显隐口径

- **老家私家大厨现状**：**没有这一块**。`scripts/render_help.py`（276 行，全文读过）无 `init_banner`／无 `_is_initialized`／无横幅；老模板 `templates/help.html` 也无横幅。老家只有一个与之无关的「首次使用」**场景**（`scenarios.yaml` 的组 `首次使用`，域 `开始使用`，1 张卡）——那是场景，不是横幅。
- **邻居的判法**：记账「**DB 文件存在＝已初始化**」＋**全程不开库**：`skill-bill/src/cli/cmd_read.ts:82-86`
  ```ts
  /** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized`）；判定本身异常 ⇒ `false`＝横幅照显（fail-open…） */
  function helpInitialized(): boolean {
    try { return existsSync(resolveDbPath()); } catch { return false; }
  }
  ```
  同文件 `:76-77` 明写「全程**不开库**：初始化状态用「DB 文件存在」判定…免得「看帮助」把记账库 `new DatabaseSync` 出来并跑 DDL 自愈」；`hidden` 的传给 `buildInitBanner`（`helpFile.ts:128` `hidden: initialized === true`）。注：`resolveDbPath` 自身带 `mkdirSync`（`skill-bill/src/fetch/paths.ts:21-22`），所以严格说这条口径是"**不建库文件**"，目录仍会建。
- **新仓私家大厨的坑（与居家同款，已在代码里复核）**：
  1. `packages/skill-chef/src/fetch/paths.ts:20-23`
     ```ts
     export function resolveDbPath(filename = DB_FILENAME, dir = resolveDbDir()): string {
       mkdirSync(dir, { recursive: true });
       return join(dir, filename);
     }
     ```
     ——**光算路径就建目录**；DB 文件名常量是 `DB_FILENAME = 'chef_data.db'`（`:7`）。
  2. `packages/skill-chef/src/fetch/db.ts:166-189` 的 `openChefDb` 会 `new DatabaseSync(dbPath)`（`:171`，文件不存在即**建文件**）→ `PRAGMA journal_mode=WAL`（`:175`，连带 `-wal`／`-shm`）→ 跑全量 DDL（`:182` 循环执行 `:51-94` 的 `CREATE TABLE IF NOT EXISTS…`）。
  3. **今天的 chef HELP 路是会开库的**：`src/cli/cmd_read.ts:98-99` 在 `dispatch()` 里、`switch` **之前**就 `const dbPath = resolveDbPath(); const handle: ChefDb = openChefDb(dbPath);`，而 `chef.help.lookup` 的分支在 `switch` 内（`:327-331`）——分支体自身无 IO（地图 Notes 的"该分支零 IO"仅指分支体），但整条调用链会建库＋跑 DDL。另有 `preflight()`（`:39-45`）要求 `SKILLS_DB_PATH` 必设（不设 `exit 1`）。
  4. chef 现有一个 `ChefDb.initialized` 字段，但**不是**这条口径：`db.ts:177-183`（`initialized = !existed`，"本次调用之前有没有表"）——语义是"本次才建"，而且**必须先开库**才拿得到。
- **可行口径（列出，不选；整改时已摘掉与票面冲突的那一支）**：
  - **票 7 已钉死的部分（不是待选）**：HELP 分派必须在**开库之前**（`docs/skills/skill-chef/t7-body.md:8`「该命令在**开库之前**分派（跑完不建 `.db`）」），落点是 `<SKILLS_DB_PATH>/cook_html/help/`（GitHub 上 #215 现行正文；地图 `map-chef-body.md:31`／`:170` 同向。⚠️ 本地 `t7-body.md:5` 仍写老目录 `CookHub/help/`，那是**陈旧副本**，以 GitHub 为准）。⇒ **「不建库」不是本票的待选，是已经定死的口径**（铁律侧 `t6-body.md:6` 也点名「只读页**不建库**…不许调 `openChefDb` 一类会 DDL 自愈建库的入口」）。
  - **票 6 侧真正要决定的只剩「传不传 `init_banner`」**，以及传的话**装配形状**：`initialized` 这个入参**由调用方传入**（零 IO 纯函数），照记账 `packages/skill-bill/src/render/helpFile.ts:84-87` 的 `HelpFileOptions.initialized`（缺省 `false` ＝照显，注释原文「误显的代价小于误藏」）。**渲染期不许去探测库**——「库在不在」是调用方的事，渲染件只收一个布尔值。
  - **可选项**：甲 · 照记账传（`initialized` 由调用方给，判法照 `skill-bill/src/cli/cmd_read.ts:82-86` 的「DB 文件存在」）＋ `hidden = initialized`；乙 · 照卡路里**不传** `init_banner`（页面无横幅，零风险，但新用户少一条引导）。原文列过的「丙 · 复用 `openChefDb` 的 `initialized`」**已删除**：它语义不符（那是"本次才建"）、必须先开库，且是票 6／票 7 票面**明文禁止**的那一支。
  - 文案若取甲，`prompt` 单源候选是老家「首次使用」那张卡的 `prompt`（`scenarios.yaml` 组 `首次使用`，1 张卡；记账同款做法见 `helpFile.ts:113-119`，缺位即抛）。

### 6.4 `contact`

- **老家现状**：私家大厨的载荷 `meta` 只有 **4 个字段**（`skill`／`version`／`generated_at`／`help_wake_word`，`scenarios.yaml:1-5`），`render_help.py:160-166` 把 `meta` 整段直通进 `window.__HELP__.meta`；`contact` 在 `scenarios.yaml` 全文 **0 命中**，老 HELP 页也没有「联系作者」段。**故私家大厨的 contact 无老家对应物**（与记账／居家不同——它们老件里各有 `CONTACT`）。
- **新仓可行取值（证据）**：记账三项（`helpFile.ts:46-53`：邮箱 `975559549@qq.com`、GitHub `https://github.com/FeatherHunter/SKILLS`、Issues `.../issues`，后两项 `url: true`，`copy_all: true`）；卡路里两项（`helpCenter.ts:141-146`：GitHub＋Issues，无邮箱）。两家的仓库地址写法不同（记账／居家指向 `SKILLS` 仓，卡路里的也在同仓）——私家大厨本仓是 `FeatherHunter/ilife`，写哪个地址无 chef 侧出处。
- **不确定处（票 6 侧仍需用户点头）**：取三项还是两项、要不要留 qq 邮箱、链接指 `SKILLS` 还是 `ilife`。这三支直接决定**关于页第一段出不出现**，故属票 6 第一步／第二步要报用户点头的范围。**归票 6**。

### 6.5 有没有原型水印这类要一并清掉的东西

| 项 | 老件现状（证据） | 新模板现状（证据） | 结论 |
| --- | --- | --- | --- |
| 文档标题水印 | 老**权威**共享模板 `SKILLS\公共组件\assets\help_template.html:6` 写死 `<title>HELP 原型 · V4 三级目录版</title>` | 仓内 `help-template.html:6` 是占位 `<title>__HELP_TITLE__</title>`，生成器专门立了断言：`:20-21` 注释「渲染时替换为 `<skill_name> · <title>`——源里写死即回原型水印」、`:42` `if (!PREFIX.includes(TITLE_SLOT)) throw new Error('PREFIX 缺文档标题占位 ' + TITLE_SLOT + '（源里写死标题＝回原型水印）');` | 水印**已由占位替代**，调用方无需再清；实测产物里 `__HELP_TITLE__` 0 次 |
| 生成器／日期戳 | 老 chef 模板 `templates/help.html:11` `<meta name="generator" content="私家大厨 · render_help.py · 2026-07-27">`（写死日期） | 新模板 head 只有 `:4` charset ＋ `:5` viewport，**无 generator／无日期** | 无需清（新模板不带这一项） |
| 版本段固定文案 | — | 模板自带 `' · HELP 模板 v4'`（`:1817`，写死在页面运行时代码里） | 这是模板侧固定文案，**不是**调用方能改的字段；调用方只供 `version` 值 |
| 页面内其它占位符 | — | 三条 `<!--SLOT:…-->` 注释（`:190-192`）只在真源里，生成器把它们当切分锚点，产物中不出现（实测 0 次） | 无需处理 |
| 另一件同名不同物 | 技能根 `SKILL.md` 的 `私家大厨.html`（63,901 B，`<title>私家大厨 — 使用手册</title>`）是**给人看的使用手册**，不是 HELP 产物（地图 Notes 已记） | — | 与本票出口无关，别拿它当基准／数据源 |

### 6.6 `SKILLS_BASE_FROZEN` 与 exports（两条硬事实的代码复核）

**（一）解冻事实**（`tooling/check-boundaries.mjs`）：

```js
// :37
const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];
// :38
const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算
// 前半：:39-44 依赖闭包（dependencies＋devDependencies＋peerDependencies）
for (const name of SKILLS_BASE_FROZEN) { … assert(hit.length === 0, `${name} 依赖闭包不含 base-*…`) }
// 后半：:45-60 源码＋模板扫描
const SRC_RE = /(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/;
const SRC_SCAN = [...SKILLS_BASE_FROZEN.flatMap((n) => walkSrc(join(root, 'packages', n, 'src'))),
  ...SKILLS_BASE_FROZEN.flatMap((n) => readdirSync(join(root, 'packages', n, 'templates'))
    .filter((f) => f.endsWith('.html')).map((f) => join(root, 'packages', n, 'templates', f)))];
const srcHit = SRC_SCAN.filter((f) => SRC_RE.test(readFileSync(f, 'utf8')));
assert(srcHit.length === 0, `未迁移技能源码／模板不 import base-*…`);
```

- **两半都由同一个数组派生**（`:39` 与 `:56-58` 都是 `SKILLS_BASE_FROZEN.flatMap`），故数组里删掉 `'skill-chef'` 一处即同时解除两半；移出理由照 #145 写进 `:34-36` 的注释区（那里已有 `skill-bill` 移出的先例文字）。
- 移出后 chef 还要**真加依赖**：`packages/skill-chef/package.json` 现在 `dependencies` 只有 `base-link-core: ^0.3.0`（`:24-26`），且 `packages/skill-chef/node_modules/base-paint` **不存在**；记账的写法是 `"base-paint": "^0.3.0"`（`packages/skill-bill/package.json:26`）。
- 顺带：`SRC_SCAN` 里 `readdirSync(join(root,'packages',n,'templates'))` **要求该目录存在**（否则脚本自己抛）；chef 的 `packages/skill-chef/templates/` 存在（8 个 html 碎片，其中 `templates/help.html` 是 266 B 的通用文档页碎片，用 `<!--CONTENT-->`＋`<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`，**不是**共享 help 模板，也不命中 `SRC_RE`）。

**（二）发布态缺口**：

- 仓内正本：`packages/base-render/package.json:3` `"version": "0.3.0"`，`:11` `"./help-shell": "./dist/helpShell.js"`（**有**这个子路径）；`:8-13` 的 exports 共 4 条（`.`／`./blocks`／`./help-shell`／`./package.json`）。生成物 `dist/helpShell.d.ts` 在盘，导出 `renderHelpShellHtml`／`renderHelpShell`／`composeDocTitle`／`HelpShellData`／`HelpShellError`／`HELP_SHELL_*`。
- **为什么仓内能跑**：workspace 链接。`packages/skill-bill/node_modules/base-paint` 是 **Junction → `D:\ilife\packages\base-render`**（`pnpm-workspace.yaml` 的 `linkWorkspacePackages`；锁文件 `pnpm-lock.yaml:136-138` 记 `base-paint: specifier ^0.3.0 → version link:../base-render`），所以 `import 'base-paint/help-shell'` 解析到的是**仓内那份 package.json**（含子路径），不走 registry。
- **发布态确实缺**：git 证据三条 —— `3e46ab0`（2026-09-10 14:06，`fix(s1): 联动发版 base-paint 0.3.0 + skill 0.2.2 + plugin 0.2.3（registry 同号异物必崩）`）当时 `packages/base-render/package.json` 的 exports 是 `.`／`./blocks`／`./package.json`（`git show 3e46ab0:packages/base-render/package.json` 实读，**无 `./help-shell`**）；`21ef322`（同日 17:33，`feat(136): base-paint登记help-shell子路径出口（主入口/files不动）`）才加进来；`7a114b3`（同日 20:10，`chore(release): base-* 三包版本归位 0.3.0`）随后才又动了版本字段。即 registry 上的 `base-paint@0.3.0` 是 14:06 那次发的，**不含** `./help-shell` ⇒ 真·安装态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`（地图 Out of scope 已把这条留给发版票）。
- 旁证：`.pnpm` 里还留着 `node_modules/.pnpm/base-paint@0.2.0/…/package.json`（历史安装残留，当前锁文件已无此条），其 exports **只有** `{".": "./dist/index.js"}` —— 与上面"发布态 tarball 不含子路径"的判断同向。
- **不确定处（本机无法证实的一件）**：本票不联网，我**没有**直接读 registry 上 `base-paint@0.3.0` 的 tarball；上面这条是"git 时间序＋本地发布态副本形态"推出的。要钉死需发版票联网复核（或 `npm view base-paint@0.3.0 exports`）。

---

## 七、页面结构预期（票 11 肉眼终审的基准）

**整改补**：原报告把「页面长什么样」打散在六处（字段落点／横幅位／三层／徽章／关于页／搜索面），**没有一处把整页拼出来**，票 11 只能凭临场观感判。本节按模板实测补出，作为**验收基准**。

**一句话**：**11 个底部 Tab**（10 个域 ＋ 末尾「关于」）＋ 顶部 hero（技能名小字／大标题／「48 场景」＋三步引导）＋ 一个搜索框 ＋ 每域一页（域内若干**折叠组**，每组里若干**场景卡**，点卡开**底部抽屉**）。

### 7.1 逐层（行号以 `packages/base-render/assets/help-template.html` 为准，整改时实读复核）

| 位置 | 会长成什么 | 字段来源 | 代码 |
| --- | --- | --- | --- |
| 文档标题 | `私家大厨 · <title>` 或原样（取决于 `composeDocTitle` 的 `includes` 判定） | `skill_name`＋`title` | `src/helpShell.ts:66-70` |
| hero 左上小字 | `私家大厨` | `skill_name` | `:1772` |
| hero 大字 ＋ hero 计数 | `<h1>`＝`title`；下方「**48 场景** · 点击卡片查看详情并复制指令」＋右上角徽章「48 场景」；计数**一律＝场景卡总数**（不是 37 唤醒词、不是 33 组） | `title`；`ALL.length` | `:1772` |
| hero 三步引导 | 🔍 找场景 → 📋 复制指令 → 💬 发给 AI（模板固定文案） | — | `:1773` |
| hero 与搜索框之间 | 「首次使用」横幅（**只有传了 `init_banner` 且 `hidden !== true` 才出现**；含标题／副标题／一枚复制按钮／✕） | `init_banner` | `:1775-1777` |
| 搜索框 | 一个搜索框（占位文案「搜索全部场景」），匹配**卡片可见文字**（含唤醒词 chip 与徽章文字）；另有命中计数与空态两行 | — | `:1778-1779`／`:2019` |
| 底部 Tab 条 | **11 个按钮**：10 个域（图标走 `SVG_ICONS[icon]`，不在表里就当 emoji）＋ 末尾「关于」；第 1 个默认点亮 | `groups[].id`／`label`／`icon` | `:1828-1833` |
| 每个域页 | 域内若干 `<details class="subgroup" open>` 折叠组，标题＝组名＋场景数角标（默认展开） | `groups[].subgroups[].label` | `:1782-1784` |
| 组内场景卡 | 一行一卡：唤醒词 chip（绿）＋类型徽章（按 10 词表配色，表外词退「查看」蓝）＋场景名＋「复制」按钮 | `wake_word`／`types`／`title` | `:1785-1793` |
| 点卡 | 底部抽屉：场景标题＋chip＋参数输入框（**只有 `editable_fields` 非空才有**）＋「Prompt 预览」＋复制；有参数时边填边重组预览 | `editable_fields`／`prompt_template` | `:1915-1942` |
| 关于 Tab | ①「联系作者」（`contact` 有才画，逐项 label＋值，`url && http` 开头才成链接；`copy_all` 再加「一键复制」）②「版本」＝`私家大厨` ＋ `v<version> · HELP 模板 v4`（**不判空，不传就显示 `v · HELP 模板 v4`**）③「其他技能」（`recommendations` 有才画） | `contact`／`version`／`recommendations` | `:1799-1826` |
| 域页默认顺序 | 按 `groups[]` 顺序，第 1 个域（做菜）默认选中 | `groups[]` 序 | `:1830` |

**关于页段数**：固定 **3 段**位置（联系作者／版本／其他技能），其中只有「版本」段**恒在**（`:1817` 无条件拼），另两段有数据才画。

### 7.2 与老件的结构性差异（终审时不该按老件判不过的点）

老件 `D:\2Study\StudyNotes\SKILLS\私家大厨\templates\help.html`（**19,938 B／523 行**，整改时实测）是**单列 · 一层手风琴**（33 个唤醒词组逐组折叠，`:75`／`:341`）＋ hero 三格统计（唤醒词／场景／待开发，值由脚本填：`:210-212` 三个 `.summary-cell`，`:327` 唤醒词那个取 `DATA.aliases_expanded_count`＝**37**、场景 48、待开发 0）。实测该文件里 **`tab-bar` 0 次／`data-nav` 0 次／`about` 0 次／`sheet` 0 次／`init-banner` 0 次／`<details` 0 次**。

⚠️ **整改期自查改正**：老件**有**搜索框（`:238-240` `<div class="search-card">`＋`<input id="search-input" type="search">`，过滤逻辑在 `:458`／`:476`），B 席列的「无搜索框」这一项**不成立**，别照抄。

⇒ 新页面**必然**多出这**四样**：**底部 Tab 栏**、**关于页**、**底部抽屉**、**首次使用横幅**；并且**必然**多一层「域」。这一条也是地图 `map-chef-body.md:40` 的既定口径（「换模板是换信息架构，不是换皮」「别拿老件当视觉基准」），以及地图总目的地的明文（「**UI 层不与老 HELP 逐字比对**」，`map-chef-body.md:3`）。

**终审时该看的**：① Tab 数是不是 11（10 域＋关于）；② 关于页的「版本」段是不是 `私家大厨` ＋ `v<version> · HELP 模板 v4`；③ hero 计数是不是 **48 场景**（老件的 37 是**唤醒词**计数，新模板一律＝场景卡总数，§3.5 口子 4）；④ 每域页里的折叠组数与场景卡数是否与老 33 组／48 卡对得上；⑤ 点卡能不能开抽屉、复制出来的正文对不对。

---

## 八、`prompt_template` 与 `wake_word` 在私家大厨场景里的取法

### 8.1 模板对这两个字段的语义要求（代码）

- `wake_word`：`normalizeScenes` 把它搬成 `chip`（`help-template.html:1665`），渲染成绿色 `<span class="chip">`（`:1724-1725`）。它**同时是检索面的一部分**——搜索用 `m.textContent` 做包含匹配（`:2019`），所以 chip 文案参与搜索，但**不参与复制内容**（复制只用 `prompt`，`buildPrompt` `:1753-1764`）。
- `prompt_template`：搬成 `prompt`（`:1668`），是**复制指令的正文**：卡片上的「复制」按钮把它写进 `data-c`（`:1790`），抽屉里的 `Prompt 预览` 也是它（`:1929`）。`buildPrompt` 的拼法固定两段：
  ```js
  // :1753-1764
  function buildPrompt(s, v){
    var lines = [s.prompt];
    var paramLines = [];
    (s.params || []).forEach(function(p){ var val = …; if (val) paramLines.push(p.label + ': ' + val); });
    if (paramLines.length) lines.push(''); /* 空行分隔 */
    return lines.concat(paramLines).join('\n');
  }
  ```
  ⇒ **第一行＝`prompt_template` 原文（模板不做任何占位符替换；整改复核：全文 grep `\{\{` 0 命中）**，之后（若有填写的参数）空行 ＋ 若干 `label: value` 行。参数只能来自 `editable_fields`（`:1669-1671` 的 `{name,label,value,hint,required}` → 抽屉表单 `:1920-1927`；必填未填时拦截 `:1765-1767`／`:1981-1984`）。
- 模板**不读** `type`（单数）：`types` 缺就一枚徽章都不画（`:1666`），`type` 会被静默忽略（老注入器也不拦，实测 OK）。

### 8.2 老家 48 条场景能提供什么（实测，探针 `probe_prompt.py`）

| 项 | 实测 | 与 A 路契约的关系 |
| --- | --- | --- |
| `prompt` 字段 | **48/48** 有值（字段名是 `prompt`，**不是** `prompt_template`） | 直接对得上 A 路语义（复制正文），只需改字段名 |
| 占位符 | **16/48 条 prompt 里带 `{{…}}`**（**双**花括号）：`{{菜名}}` ×15、`{{N}}` ×1；**单花括号 0 条** | ⚠️ A 路**不会替换** `{{…}}`（模板全文 grep `\{\{` 0 命中，`buildPrompt` 不做替换）；不带 `editable_fields` 就会把 `{{菜名}}` 原样复制给 AI。要参数化必须把这些占位符转成 `editable_fields[{name,label,value,required,hint}]`（§1.3 的读法／`injector.py:173-179`），或明说不转、正文照带花括号。**二选一及其后果见 §3.5 口子 2**；老件 `editable_fields` 为 **0/48**（等于全要新造） |
| `wake_word` | **48/48** 有值（`aggregate_wake_words` 还给每条盖上所属组名：`render_help.py:87-88` `sc["wake_word"] = main_name`）⇒ 老件里场景的 `wake_word` **等于组名**（33 个取值复用 48 次） | A 路 chip 就是这个值；若"33 组"被用作二级组（§4.3 甲），则 chip 文案与二级组标题会**逐字相同**（视觉上是重复信息，可选改写，归票 5／6） |
| `type`（单数） | **48/48**，共 11 种字符串，如 `向导+选择+回执`(5)／`查看`(25)／`对比+确认+回执(过程型)`(3)／`采集+回执`(7)／`转移(下载)`(1) | 要按 `+` 切成 `types` 数组、**并去掉括号注**——口径已由票 2 定死（t2 报告 §七 字段映射表 L611：「按 `+` 拆开、去掉「(过程型)」这类括号注」，逐条落法见 §七 JSON 草案 L697 起），**不再留成待选**。去括号注后表外的只剩 `对比`／`确认`／`转移` 3 个，退到「查看」蓝兜底（`:1698-1723`）；换表内词或改模板配色表属公共层改动，另开票 |
| `dimensions` | **48/48** 卡都有这个键（**46/48 非空**，另 2 张是空对象）；键名并集 **42 个**（其中 1 个是 yaml 笔误产生的畸形键 `默认不含)`，值 `null`，来自 `data_export_backup` 一张卡 ⇒ 合法 41 个），高频：`recipe` 23／`input` 6／`focus` 4／`scope` 3 | A 路**没有** `dimensions` 字段位；只有 `editable_fields`。逐键归位规则（键→`name`、值→`hint`、另补 `label`／`required`）与四类分组见 **§3.5 口子 1**；**这是跨票归属，需由结构设计闸门票收敛**（原文只写「归票 5」不足） |
| `result` | **48/48** 有值（中文整句的「这个场景产出什么」） | 契约 6 键里没有字段位，模板全文不读它 ⇒ **明说不迁**，并注明「老件有、新件无」，见 §3.5 口子 5 |
| `html` | **48/48** 有值，子键 `template`（**18 个**路径）／`command_cn`／`data_source` | 目录名已用于反推 10 域（§4.2）；字段本身**不迁**，见 §3.5 口子 6 |
| `variants` | 键 48/48 都在，**96 处全是空数组** | 零内容损失，**不迁**，见 §3.5 口子 6 |
| `status` | **48/48 全是空串**（`''`） | 与老校验二态相容；但地图 Notes 已记"48/48 全空 ⇒ 老页面全卡恒显 ✓ 可用"，新产物同样不会有「待开发」徽章 |

**结论性事实**：私家大厨这两个字段在 A 路都有现成来源（改字段名即可），**唯一需要新造的是参数化**——老家用 prompt 文本里的 `{{…}}`（双花括号）表达槽位，A 路用 `editable_fields` ＋ `label: value` 追加行表达；两者不是同一个机制（`{{…}}` 不会被替换）。

---

## 九、命名与落点：`_N` 从 `_1` 起步（用户已定案，票 4／票 7 必读）

**裁定：chef 的 HELP 产物在重名递补时用 `_1` 起步（照老家），不得照抄记账的 `_2`。**

- **老家原文**（`D:\2Study\StudyNotes\SKILLS\私家大厨\scripts\align_08.py:52-65`，整改期实读）：函数头注释写「`_N` 后缀防覆写（12.X 共同基础 · N=1 起步）」，docstring 写「首次 → `<stem><ext>`；冲突 → `<stem>_1<ext>` / `<stem>_2<ext>` …（N=1 起步）」，代码是 `n = 1; while (out_dir / f"{stem}_{n}{ext}").exists(): n += 1`。⇒ 首试**无后缀**，第一次冲突就是 `_1`。
- **记账的语义不同**（照抄会差 1）：`packages/skill-bill/src/output.ts:26` 注释原文「下一独占候选（可单测）：`〈stem〉_<YYYYMMDD_HHMMSS>[_N].html` 的 `_N` 递增；**无 `_N` 则 `_2`**」，`:38` `return join(dir, stem + '_2' + '.html');`。它的 `_2` 语义是「第 N 次落盘」（首试＝无后缀，记作第 1 次），与老家**语义等价但数字差 1**。
- **裁定理由三条**：① 用户已定「通式不变」（`map-chef-body.md:31`：**文件名主体与通式不变**，只把目录 `CookHub/` 换成 `cook_html/`）；② 老产出就在同一目录 `cook_html/help/`（原 `CookHub/help/`）里躺着，**同一目录下编号语义须与历史件一致**，否则新旧件的 `_1`／`_2` 会对不上；③ 肉眼验收第一眼就是文件名，差 1 会被读成缺陷。
- **通式**（不变）：`私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`，文件名主体＝`私家大厨_HELP`，冲突**绝不覆盖**（`map-chef-body.md:30`）。
- ⚠️ **显式提醒票 4／票 7**：`t7-body.md:7` 写的「落盘走独占写（`wx` ＋ `EEXIST` 递补）」这条机制照搬没问题，但**递补的起始数字不得照抄记账的 `_2`**——要照老家的 `_1`。票 4（管线归属＋缺省口径）裁产物名时同此。

---

## 十、不确定项与给票 6 的输入

**A. 本票必须点名的两处「文档与代码不一致」（已在上文逐条给出，这里汇总）**：① 老契约文档说 `subgroups[].id` 必填，代码不查也不用（`injector.py:155-156`／模板 `:1679`）；② 票面把 `meta_blocks` 列为"三块可选内容"之一，而 A 路**不渲染**它（`help-template.html:1651` 声明即死；老文档 `scene-data-contract.md:116` 自己也承认）。另有三处类型面／运行时不一致：`init_banner.steps`（`string[]` vs 对象数组）、`recommendations`（`reason/wake_word` vs `desc/wake`）、`meta_blocks`／`subtitle` 在 A 路读了不用。⚠️ **`recommendations` 不在「读了不用」名单里**——它是**真渲染**的（关于 Tab 第三段，`:1819-1825`／`:1834`；可达性 `true`），施工按 §3.4 走。

### 10.1 票 6 第一／二步的输入（整改补）

票 6 按 `docs/agents/structure.md:72-88` 的必报五步，**必须先报第一步「影响清单」与第二步「结构设计」拿用户点头**才能动手；而票 6 票面（`t6-body.md:11-15`）点名要报的正是这三样。原报告一项都没给，下面补齐。**本节只给素材与代价，不定案**——定案属结构设计闸门票。

**（一）新增件该住哪几个目录**（候选＋代价，**不定案**）

| 候选 | 形状 | 代价／理由 |
| --- | --- | --- |
| 甲 · 住现有的 `packages/skill-chef/src/help/` | 就在今天那个 `help/` 能力目录里长出渲染件 | `help/` 是 `src/` 一级目录里**唯一站得住的能力名**（其余 4 个 `cli`／`fetch`／`policy`／`render` 是工种／自造层名，`map-chef-body.md:50`）。代价：`fetch`／`render` 那两个工种名目录仍在，本次不整包重排 |
| 乙 · 新建一个「HELP 能力目录」，名取 10 域英文名之一 | 按票 6 票面「目录名取自 HELP 一级分组、写成英文名」（`t6-body.md:13`） | 与甲冲突：HELP 是**跨 10 域**的一件事，硬塞进某一个域名下会让其余 9 个域反向依赖它（违铁律「能力只往下用东西」）。若走乙，得说清「哪个域名」以及为什么不是 `help` |
| 丙 · 建共用位 | 因为「共用件要写得出哪两个能力在用」（`structure.md:67`） | **写不出第二个用法**：本图只有 chef 一个技能消费这套装配。按结构标准「共用位是从第二个用法里长出来的，不是预先设计的」，丙**现在不成立** |

**（二）每件对外给什么**（导出几个、各一句；这是第二步的正文骨架）

| 件 | 对外给什么 | 依据 |
| --- | --- | --- |
| 装配件（把 48 场景／10 域／5 项必填＋可选块拼成 `HelpShellData`） | **1 个函数**：`buildChefHelpData(...) -> HelpShellData` | 照记账 `skill-bill/src/render/helpFile.ts` 的 `buildHelpFile` 形状 |
| 渲染件（调用公共层出口） | **1 个函数**：`renderChefHelpHtml(data) -> string`，内部只调 `base-paint/help-shell` 的 `renderHelpShellHtml` | §1.1 A 路出口 |
| 横幅件（若传 `init_banner`） | **1 个函数**：`buildChefInitBanner(initialized: boolean) -> HelpInitBanner`；`initialized` **由调用方传入**（§6.3） | 照 `skill-bill/src/render/helpFile.ts:115-119` |
| 摘要行／`meta_blocks` 派生（若传） | **各 1 个函数**，共 2 个 | 照 `helpFile.ts:100-111`；`⚠️` 若走「一处算、两处用」，`subtitle` 与块一同源 |
| 文件名与落点 | **1 个函数**：`buildChefHelpFileName(stamp) -> string`＋落点常量 | 通式见 `map-chef-body.md:30`（`私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`）、落点见 `:31`（`cook_html/help/`） |
| 数量纪律 | 每个文件对外给的东西**数得出不超过五个**（`structure.md:87`），上表逐件都在 3 以内 | — |

**（三）本次必然要动的两处包外件**（票 6 票面点名）

1. `packages/skill-chef/package.json` 要加 **`base-paint` 依赖**：现在 `dependencies` 只有 `base-link-core: ^0.3.0`（`:24-26`），且 `packages/skill-chef/node_modules/base-paint` **不存在**；记账写法是 `"base-paint": "^0.3.0"`（`packages/skill-bill/package.json:26`）。
2. `tooling/check-boundaries.mjs:37` 要把 **`'skill-chef'` 移出** `SKILLS_BASE_FROZEN`：数组里删一处即同时解除两半断言（`:39-44` 依赖闭包／`:45-60` 源码＋模板扫描**都由同一数组 `flatMap` 派生**），并照 `skill-bill` 先例在 `:34-36` 的注释区补记移出理由（那段注释今天写的是「其余 4 个技能的断言一字未放宽」，移出后要改成 3 个）。

**（四）`dimensions` 的跨票归属要在这里收口**：见 §3.5 口子 1——它决定票 5 的资产形状（6 键还是 7 键）、票 6 的渲染接线、票 2 草案要不要扩。**属结构设计闸门票的收敛项**，不能只在票 5 单方面决定。

### 10.2 真正还需要票 6 决定的待选（整改时已把"已钉死的"摘出去）

**先说摘掉了什么**（原文把它们错列成待选）：

- **「不建库」不是待选**，是票 7 已钉死的口径（`t7-body.md:8`「开库之前分派」＋落点 `cook_html/help/`），票 6 票面也点名禁调 `openChefDb`（`t6-body.md:6`）。见 §6.3。
- **`initialized` 由调用方传入、零 IO**，不是「票 6 自己判库」的选项；渲染期禁止探测库（照 `skill-bill/src/render/helpFile.ts:84-87`）。见 §6.3。
- **三层中间层不再是"归属未定"**：域的 `id`／`label`／`icon` 来源已由票 2 给死（`domain.key`，§2.2），剩下的只是 §4.3 甲／乙／丙**三支落法**选哪支。

**下面才是票 6 要裁的**（每支都影响产物，故都属第一／二步要报用户点头的范围）：

1. **`title` 取值** → 影响文档标题与 hero h1：老家原文 `私家大厨 HELP · 能力速查`（含技能名，`composeDocTitle` 走原样支）／邻居形状 `私家大厨 · 使用手册(HELP)`（也走原样支）／新造（走 `skill_name + ' · ' + title` 前缀支）。h1 是否保留 🍳 是独立的一小项。
2. **`version` 取值** → 老资产值 `0.1.0`（有出处但与 npm 版本同值，语义不可辨）／自定"数据世代"值（chef 无 `init-status` 式佐证）／不传（页面显 `v · HELP 模板 v4`）。
3. **`init_banner` 传不传** → 传（照记账，`initialized` 由调用方给）／不传（照卡路里，页面无横幅）。**口径本身已定死，只剩这一支选择**；文案与 `prompt` 单源候选（老家「首次使用」场景的 `prompt`）。
4. **`contact`** → 三项（含 qq 邮箱，照记账）／两项（照卡路里）／不传（关于 Tab 无联系段）；链接指向 `SKILLS` 还是 `ilife`。
5. **`meta_blocks`** → 照记账派生两块（好处：`subtitle` 与块一同源；坏处：**A 路产物传与不传逐字节相同**，只有载荷里有，§三开头）／照卡路里不传（免第二真相源）。若传，块二的唤醒词写新表 4 条（无空格）还是老家主词（带空格）。
6. **`recommendations`** → 传（须照 A 路三个名 `name/desc/wake`）／不传（记账／卡路里都不传，老家也无此段）。
7. **三层中间层落法** → §4.3 甲／乙／丙（丁与地图 Q2 口径冲突，仅列；域的 `id`／`label`／`icon` 来源已定，见 §2.2）。
8. **`subtitle` 的计数口径** → 若照记账，写"10 功能域 · 48 场景"还是"10 功能域 · 33 组 · 48 场景"（组数是老件的一级导航层，新模板里它是二级层）；`version` 与时间戳怎么进这一句。⚠️ **`subtitle` 与 `version` 是一对，不能分头定**：照记账的派生式 `:100-103` 里嵌了「版本 `HELP_FILE_VERSION`」，而 `version` 又要在页面版本段以 `v<version> · HELP 模板 v4` 出现（§7.1）——分头定会做出一页上两个打架的数字。

### 10.3 我拿不准但影响下游的（整改后）

1. **`{{…}}` 二选一**（16 条，**双**花括号）：改写文案还是转 `editable_fields`——决定"复制出来的指令能不能用"，落法与后果见 §3.5 口子 2。
2. **`types` 括号注已由票 2 定死（去括号注）**，不再是"拿不准"；仍未定的只是**去括号注后剩的 3 个表外原子**（`对比`／`确认`／`转移`）怎么办：改用表内词、改模板配色表（走公共层，须另开票）还是接受蓝兜底——归票 5／6。
3. **`dimensions` 的跨票归属**（§3.5 口子 1）：需由结构设计闸门票收敛。
4. 37 条新唤醒词与老 33 组／48 卡的**逐条归属**（含老件 4 条别名 `开始做菜`／`不想要`／`删掉`／`废弃`、6 条只在载荷不在文档的词）：这是票 2 的对账表，本票只提供结构与计数（§4.2）。
5. 发布的 0.3.0 tarball 我在本机**无法直接验证**（不联网）；结论建立在 git 时间序与本地发布态副本上（§6.6），若要钉死请发版票联网复核。

---

## 十一、告警线 ＋ 必报五步 ＋ 门（整改补）

原文全篇 grep `AGENTS.md`／`告警线`／`structure.md`／`五步` ＝ **0 命中**，这三样都是票 6 写代码时会当场撞上的硬约束，这里一次补齐。

### 11.1 告警线（350 ＋ LF 口径）

- **口径**：用户 Q4b 定案 **350 行 ＋ LF 口径**（只有一个数，不设软硬两层）。
- **落点**：`packages/skill-chef/AGENTS.md`——**该文件今天不存在**，全 `packages/*/AGENTS.md` 实测皆 False（本包唯一缺）；本图要随票 6 立起来，把 350＋LF 写进去（`structure.md:70`「具体数字由各包自己定，写在各包自己的地方」）。
- **已超线两件，当场报**（实测 LF 口径，`:n` 为本次整改读数）：`packages/skill-chef/src/cli/cmd_read.ts` **LF 388**、`packages/skill-chef/src/fetch/db.ts` **LF 451**。两件**都已超线**，照 `structure.md:97-101` 的第四步要当场报一句：

  > **「已超线，需要根据规则进行重构。」**（`cmd_read.ts` 388 行／`db.ts` 451 行，线是 350）

  ⚠️ 这两件正在被**并发会话**改动（地图记的是约 371／约 433，本次读到 388／451），**数字会变，以开工时为准**。
- **对票 6 的直接影响**：新建文件一律受这条线约束；碰这两个已超线件时要按第四步给拆法或说明这次为什么先不拆。

### 11.2 必报五步（`docs/agents/structure.md:72-104`）

改管辖范围内任何一件的源码时，**按序做，每步报给用户**；票 6 票面（`t6-body.md:15`）与票 7 票面（`t7-body.md:11`）都已点名叫这条。五步的报点与本报告的对应关系：

| 步 | 要报什么 | 本报告给出的素材 |
| --- | --- | --- |
| 第一步 · 影响清单 | 新增或改动哪些目录／哪些文件，每文件一句话，以及碰它的理由；**每行指向一个能力目录** | §10.1（一）（三） |
| 第二步 · 结构设计 | 新增的目录树、每文件职责、每文件公开接口给什么（导出几个、各一句）、共用件被哪两个能力用 | §10.1（二） |
| 第三步 · 写代码 | 跨能力引用写公开接口；常量与类型只写一处；旧件就地摆正 | — |
| 第四步 · 超线报警 | 任何文件超 350 行，当场报那句原话，再给拆法或说明为什么先不拆 | §11.1 |
| 第五步 · 交付对账 | 交付时对账 | — |

### 11.3 门（票 6 一动就红的硬编码）

`tooling/test/skill-html-snapshot.test.mjs` 里两个常量是**硬编码数字**，不是派生值：

```js
// :103
const EXPECT_KEYS = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 10 };
// :104
const EXPECT_TPL  = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 6 };
```

⇒ **新增命令或模板页即红**（`:110-111` 逐技能比对 `frag` 片段数与 `tpl` 模板页数）。票 6 若新增命令／模板，必须**同批改这两个数字**；`t6-body.md:9` 已把这条点名（并把「chef 的命令数与模板数写死成 8」写进去了）。同文件 `:57` 还断言命名空间标记白名单 `MARKER_ALLOW` **必须为空**。移出 `SKILLS_BASE_FROZEN` 后要跑 `pnpm snapshot:html:check` 与 `snapshot:check` 确认没动快照（`t6-body.md:9`）。

## 十二、证据目录

**跑过的命令（全部只读；未 `git add`／`commit`／`checkout`／`stash`；未跑仓级 build／test／snapshot；未跑 `gen:help-shell`；未改 `packages/` 下任何文件）**：

| 命令 | 用途 |
| --- | --- |
| `Get-ChildItem -Recurse` 于 `packages/base-render`／`packages/skill-chef`／`SKILLS\私家大厨\templates` | 定位真源链与 chef 现有模板 |
| `git log -S'./help-shell' -- packages/base-render/package.json`；`git show 3e46ab0:packages/base-render/package.json`；`git log --pretty='%h %ad %s' -1 <sha>` | exports 缺口的时间序（§6.6） |
| `node .scratch/chef-help/t3/probe_render.mjs` | 真跑 `dist/helpShell.js`，19 个哨兵逐一验证渲染落点（§1.5／§6.1） |
| `python .scratch/chef-help/t3/probe_validate.py` | import 老 `injector.py`，29 条反例跑 `validate_help_data`（§1.4） |
| `python .scratch/chef-help/t3/probe_yaml.py` | 老 `scenarios.yaml` 结构统计：33 组／48 卡／10 域／组不跨域／status 全空（§4.2） |
| `python .scratch/chef-help/t3/probe_prompt.py` | 48 条 prompt 的占位符／dimensions／type 取值（§十） |
| `Get-Item`（Junction）`packages/skill-bill/node_modules/base-paint`；读 `.pnpm/base-paint@0.2.0/…/package.json` | workspace 链接与发布态副本（§6.6） |
| `node .scratch/chef-help/t3/verify_payload.mjs`（**整改期新增**） | `JSON.parse` 后逐条复核：双花括号 16／单花括号 0、`dimensions` 42 键与畸形键、`result`／`html`／`variants`／4 条别名／`aliases_expanded_count=37`（§3.5／§十） |
| `Select-String` 读 `help-template.html`（`\{\{` 全文 0 命中）；实读 `:1658-1682`／`:1768-1833`；`Test-Path` 全包 `AGENTS.md`；LF 口径数行数 | 注入字段名／页面结构预期／告警线（§1.3／§七／§11.1） |

**关键输出摘要**：

- `probe_render.stdout.txt`：`bytes_total 107128`／`bytes_payload 1298`；`doc_title "私家大厨 · 使用手册(HELP)"`；19 个哨兵**静态段全 0**；`__HELP_TITLE__` 与 3 个 SLOT 在产物里各 0 次；`groups:[] → HelpShellError{code:'missing-data'}`；`renderHelpShell === renderHelpShellHtml` 为真。
- `probe_validate.stdout.txt`：`★ group id 与 scene id 同名 → FAIL: 场景 id 重复: cooking`；`两个 group 里 scene id 同名 → FAIL: 场景 id 重复: …`；`subgroup 缺 id → OK`；`subgroup.id 跨组重名 → OK`；`场景缺 status（键不存在）→ FAIL`；`contact／meta_blocks／version／init_banner 全删 → OK`；`type 单数无 types → OK`。
- `probe_yaml.out.json`／`probe_yaml.stdout.txt`：`group_count 33`／`scene_count_flat 48`／`scene_id_dupes []`／`scenes_sum_over_groups 48`／`domain_from_template_dirname {做菜5,查看8,搜索筛选13,修改4,历史4,采购1,录入6,派生3,开始使用1,数据管理3}`／`wakeword_spanning_multiple_domains []`／`status_freq {"":48}`／`domain_field_present 13`／`meta.version 0.1.0`／`contact_anywhere false`。
- `probe_prompt.stdout.txt`：`prompt_with_placeholder 16`（探针按**单**花括号记，**该记法已由整改改正**：真形是双花括号 `{{菜名}}`15＋`{{N}}`1）／`scene_with_dimensions 46`／`dimension_key_count 42`／`type_string_freq` 11 种／`atoms_not_in_TYPE_DEFAULT ['对比','确认','回执(过程型)','勾选(过程型)','转移(下载)']`（该表按**未去括号注**的原子列，去括号注后表外剩 3 个，见 §3.5 口子 3）。
- `verify_payload.out.json`（**整改期新增**）：`prompt_with_double_brace 16`／`prompt_with_single_brace_after_strip 0`／`double_brace_token_counts {菜名:15, N:1}`／`dim_scenes_present 48`／`dim_nonempty 46`／`dim_empty_object 2`／`dim_key_union 42`／`dim_malformed_keys ['默认不含)']`（归属卡 `data_export_backup`，值 `null`）／`result_present 48`／`html_present 48`／`html_template_distinct 18`／`variants_key_present 48`／`variants_nonempty_cards 0`／`variants_total_items 0`／`editable_fields_scenes 0`／`alias_groups [{做菜模式:[开始做菜]},{废弃食谱:[不想要,删掉,废弃]}]`／`alias_total 4`／`aliases_expanded_count 37`／`group_count 33`／`scenes_sum_over_groups 48`／`domain_present 13`。

**实验件（全部在 `D:\ilife\.scratch\chef-help\t3\`）**：`probe_render.mjs`＋`probe-render.html`＋`probe_render.stdout.txt`、`probe_validate.py`＋`probe_validate.stdout.txt`、`probe_yaml.py`＋`probe_yaml.out.json`＋`probe_yaml.stdout.txt`、`probe_prompt.py`＋`probe_prompt.stdout.txt`、`verify_payload.mjs`＋`verify_payload.out.json`（整改期新增）。

---

## 自检

**1）契约每条都给代码路径＋行号＋原文片段；抽查 3 条自己复核** —— 通过。抽查的三条独立复核结果：

- **抽查 α · `groups` 空即抛**：`src/helpShell.ts:74-76` 原文 `if (!data || !Array.isArray(data.groups) || data.groups.length === 0) { throw new HelpShellError('HELP 渲染缺分组（不返空页）。'); }`；实跑 `probe_render.mjs` 抽查 2 得 `{"name":"HelpShellError","code":"missing-data","isHelpShellError":true,"message":"HELP 渲染缺分组（不返空页）。"}`——**代码原文与运行行为一致**。
- **抽查 β · `meta_blocks`／`subtitle` 不渲染**（整改期按 A 席结论改正：判据换成**可达性**，不用哨兵法）：`help-template.html:1651` `var META_BLOCKS = HELP.meta_blocks || [];`（全文大小写敏感 `grep META_BLOCKS` 命中数＝1，仅声明行）、`:1650` `var SUBTITLE = …`（`grep SUBTITLE` 命中数＝1，仅声明行；`:1775` 的是 `INIT_BANNER.subtitle`，另一个字段）；**可达性扫描**（`.scratch/chef-help/t3-review-A/probe_reachability.mjs`）判这两者 `RENDERED=false`，而 `RECOMMENDATIONS=true`——**一致**（记账 `helpFile.ts:55` 的注释「不渲染，供外部消费」同向）。哨兵法实测（静态段 0 次、载荷段 1 次）只证「不是服务端插值」，**不再用作渲染判据**（它对 `contact`／`groups` 这类铁定渲染的字段同样给 0 次，无分辨力）。
- **抽查 γ · 文档标题三支**：`src/helpShell.ts:69` `return title.includes(skill) ? title : skill + ' · ' + title;`；实跑 `composeDocTitle` 三组入参得 `私家大厨 · 能力速查台`／`私家大厨 · 使用手册(HELP)`／`私家大厨 HELP · 能力速查`——**与 `includes` 判据逐支吻合**。

**2）「group id 与 scene id 共用一个唯一集合」在代码里找到那个集合** —— 通过。集合字面量在 `D:\2Study\StudyNotes\SKILLS\公共组件\injector.py:144` 的 `seen = set()`，建在 group 循环**之前**；group 走 `:148-150`（`if g['id'] in seen` → `seen.add(g['id'])`），scene 走 `:170-172`（`if s['id'] in seen` → `seen.add(s['id'])`），**同一个变量、无第二处 `set()`**（`grep 'set()' injector.py` 仅 `:144`）。实跑反例：把场景 `id` 改成与 group `id` 同名的 `cooking` → `FAIL: 场景 id 重复: cooking`（报的是"场景重复"，说明该 id 已由 group 先占）。**同一集合还额外覆盖跨域场景重名**（实跑 FAIL）。另核实：**subgroup 的 `id` 不进这个集合**（缺 `id`／跨组重名均 OK，只要场景 id 换新）。

**3）复核 `SKILLS_BASE_FROZEN` 与 exports 缺口两条硬事实（文件名／行号／字段名）** —— 通过。

- `tooling/check-boundaries.mjs:37`：`const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];`（**含 `'skill-chef'`**，逐字）；两半断言同源派生：前半 `:39-44`（`pkg(name)` 的 `dependencies`／`devDependencies`／`peerDependencies` ∩ `BASE_RUNTIME`＝`{'base-paint','base-render'}`，`:38`），后半 `:45-60`（`SRC_RE = /(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/`，扫 `packages/<n>/src/**/*.ts` 与 `packages/<n>/templates/*.html`，`:56-58`，断言零命中 `:60`）。
- `packages/base-render/package.json`：**字段名 `exports`**，第 **11** 行 `"./help-shell": "./dist/helpShell.js"`（**在盘正本有**）；第 **3** 行 `"version": "0.3.0"`。发布态缺口的证据是 `git show 3e46ab0:packages/base-render/package.json`（发 0.3.0 那次，exports 无 `./help-shell`）＋ `git log -S'./help-shell'` 只命中 `21ef322`（晚 3.5 小时）＋ `.pnpm/base-paint@0.2.0/…/package.json` 的 exports 仅 `"."`；仓内能跑是因为 `packages/skill-bill/node_modules/base-paint` 是 **Junction → `packages/base-render`**（`pnpm-lock.yaml:136-138` 记 `link:../base-render`）。**registry 上的 0.3.0 tarball 本机无法联网复核**（已在 §6.6／§10.3.5 标明）。

**4）明确区分「模板读的字段」与「文档说的字段」，对不上的明写「文档与代码不一致」** —— 通过。§1.5 给出 7 行对照表，其中 4 行标注「**不一致**」（subgroup `id` 必填与否／`steps` 类型／`recommendations` 字段名／`types` vs `type`）、1 行「文档少列」（顶层表只有 5 项，运行时读 9 项）、1 行「文档未收录」（`contact`）、1 行「一致但仍要点名」（`meta_blocks` 不渲染——票面口径与老文档 §4.116 行都承认）。全文引用一律标注**是谁说的**：模板运行时（`help-template.html` 行号）／生成物（`src/helpShell.ts` 行号）／生成器（`scripts/gen-help-shell.cjs` 行号）／B 路类型面（`src/spec/help.ts` 行号）／老契约文档（`docs/scene-data-contract.md` 行号）／老注入器（`injector.py` 行号），未混用。
