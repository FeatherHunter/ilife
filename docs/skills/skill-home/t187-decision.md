# 票 #187 裁决：命名落盘管线的归属 ＋ 缺省出口口径

- 裁决时刻：2026-09-12（编排方按用户授权裁定：过程中决策由我定，但每条都要过对抗审查）
- 依据：`#237` 的既成事实（共用件 `base-paint/save-html`）、账单／卡路里的现行实现、票 1 的照抄清单、票 12 的决策记录、作息管家先例（`t188-facts-schedule-precedent.md`）

---

## ① 命名与落盘的管线归属：**居家自持只留「落点值」，机制全走共用件**

**票面把这件事写成二选一（自持最小管线 vs 收成共用位），但仓库的演进已经把它吃掉了**：`#237` 已经把「时间戳通式 ＋ 独占写 ＋ 同秒递补 ＋ 回执」收进共用件 `base-paint/save-html` 的 `saveHtmlFile`，账单与卡路里都已经改成：

- `packages/skill-bill/src/render/helpPaths.ts:7`——「通式 `〈文件名主体〉_<stamp>[_N].html` **不再住这里**：唯一定义地是共用件 `base-paint/save-html`」
- `packages/skill-bill/src/output.ts:5,24`——「本件不再自持 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`」，改为 `import { saveHtmlFile, type HtmlLanding, type HtmlReceipt } from 'base-paint/save-html'`
- `packages/skill-calorie/src/render/helpPaths.ts:6`、`packages/skill-calorie/src/cli/cmd_read.ts:118,133`——同形

**裁决**：

1. 居家**自持一件**「落点值」：目录名 `home_manager_html`（老目录名逐字保留）＋ 文件名主体 `居家管家_HELP`；住 `packages/skill-home/src/help/`，文件名取 `manifest.ts`（照最新两条先例：大厨 `src/help/manifest.ts`、作息同形；**不叫** `helpPaths.ts`——那是账单的旧名，且账单把 `HELP_FILE_STEM` 放在 `src/render/helpFile.ts:24` 而不是 `helpPaths.ts`，照抄会抄错位）。
2. 命名通式、独占写（`wx` ＋ `EEXIST` 递补）、回执（`HtmlReceipt{mode,path,bytes}`）、复用窗口，**全部调用共用件** `saveHtmlFile`（`base-paint/save-html`）。**不许**把账单旧版的 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry` 抄进居家——那两段已经搬走了。
3. **措辞收窄（审查 A ①，已采纳）**：「唯一定义地」这句只对**HELP 写盘这条路径**成立——卡路里 `src/output.ts:58,86,103,141` 今天**仍自持**时间戳／同秒计数／名字清洗。所以准确说法是：**居家的 HELP 写盘不得再造第二份通式与递补**；不是「全仓只有一处实现」。
4. **票 1 照抄清单的对应订正**（会改下游票）：照抄面从「账单三件原样」改为——落点值抄**账单那一小块常量**（不再抄通式）、`helpFile.ts` 抄渲染接线、`output.ts` 抄**薄封装**（调 `saveHtmlFile`）。
5. **递补编号起步值（审查 B ①，我按证据驳回）**：审查引大厨契约 `docs/skills/skill-chef/t3-template-contract.md:662-670` 说「居家要照老家 `_1`」。**这条对居家不成立**：大厨那份证据引的是**私家大厨自己的**老家（`私家大厨/scripts/align_08.py:52-65`），不是居家的；居家老家的落盘函数在 `D:\2Study\StudyNotes\SKILLS\居家管家\scripts\render\__init__.py:130-147`，docstring 逐字写着「时间戳用本地时间(见 ADR-0001)。**冲突直接覆盖**(见 SKILL.md §输出位置)」——**老家根本没有 `_N` 递补机制**，也就无所谓 `_1`／`_2`。故裁决：**用共用件缺省**（`succession`，首次无后缀、首次冲突 `_2`，`saveHtml.ts:216`），与另外 5 家一致；**不为一个边角情形去改共用件的口径**（铁律二：一个定义地）。
4. **票面里 #147 的三条理由今天不成立**：#147 当时说「`base-paint` 是主动冻结的渲染包、落盘是 IO、技能间零依赖不可破」——`#237` 就是**主动把落盘收进 `base-paint`** 的那次改动，账单／卡路里／作息在实装里都 import 它。铁律二（同一个东西只有一个定义地）要求居家**不得**再造第二份通式。

## ② 缺省出口口径：**缺省＝HELP 文件；速查走显式参数 `mode`**

（这一条其实是本图 Destination 已经写死的：对 AI 说「居家管家 帮助」→ **明确拿到 help HTML 文件**＋绝对路径回执。）

1. **只限 `home.help.lookup` 这一条命令**：本裁决只改它的缺省交付物，其它 `home.*` 命令一律不动。
2. **缺省**（无 `mode`、无 `q`）：落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`，顶层回执追加 `delivery{mode,path,bytes}`（**只追加**，既有五字段一字不改、序不变——照账单 `:554-555`）；**载荷必须仍然回 `{items,total}`**（`cli.test.mjs:93-96` 断言 `data.total >= 88`，票 7 不许把它挪走或改形）。
3. **三支冻结（审查 B ②③，已采纳）**：① 缺省＝HELP 文件；② `mode:"lookup"`＝速查表产物 `居家管家_速查表_<stamp>.html`（与 HELP 分名，照账单 `饼干记账_速查表`／卡路里 `卡路里_速查台`），**同样仍回 `{items,total}`**＋`delivery`；③ **`q` 支保持今天语义不动**（`cli.test.mjs:97-98` 在锁它）。三支互斥；`mode` 取值非法 → `fail(2)`（照账单 `packages/skill-bill/src/cli/cmd_read.ts:116-117` 逐字）。
4. **`--html <路径>` 支保持原样（审查 A ④／B ①，已裁）**：`packages/skill-home/src/cli/cmd_read.ts:686-698,719-727` 的 `--html` 是**所有 key 通用的产物出口**，本图不动它、票 7 **不得顺手砍**；HELP 交付**不走**它（走缺省支）。若票 7 认为 `--html` 与 `mode:"lookup"` 该合一，必须在票面写明理由并保住既有用例。
5. **复用窗口：沿用共用件，并写死验收口径（审查 B ④，已采纳）**：24h 内重复触发**回同一路径、不新建、不改写**（`saveHtml.ts:361-366`），回执路径指向的文件**可打开** ⇒ 地图目标（明确拿到文件＋绝对路径）仍成立。**验收判据写成「回执路径存在且可打开」，不得写成「文件数增加」**；需要强制新件时走共用件既有的 `reuseHours: 0` 逃生口（`saveHtml.ts:112-141`），不自造开关。
6. **「看帮助不许把库建出来」**：本票只**定口径**——口径＝该命令必须在开库之前分派、跑完产物目录里 0 个 `.db`；**落地归票 7**（票 12 已定：不在票 12／票 5／票 6 顺手改）。注意居家 `src/fetch/paths.ts:20-23` 的 `resolveDbPath` 自带 `mkdirSync`，照抄前必须摆正。

**已核事实（编排方亲验，落笔前核过）**：`saveHtmlFile` 自己**递归创建落点目录**（`packages/base-render/src/output/saveHtml.ts:355` 的 `mkdirSync(dirAbs, {recursive:true})`），并把「目录建不动」与「候选已存在」当两类错误处理（`:48-49`、`:353-355`）。所以居家**不需要**自己建 `home_manager_html/`；「不建库」指的是**不产生 `.db`**，建产物目录是预期行为。`onExists` 的取值面＝`succession`（缺省）／`overwrite`／`fail`／`{reuse: 'byDay'｜'byContent'｜{byAge}}`（`:344-368`），复用窗口走共用件。

## ③ combo 侧登记：**要登记（更正）**

**更正（2026-09-12，取证推翻了本节原先的「不登记」）**：仓里有一张**共享命令登记表** `packages/base-combos/combos.yaml`，今天 111 条＝卡路里 100 ＋ 备忘 11；**卡路里的 help 命令**（`calorie.help.center`／`calorie.help.lookup`）与**备忘的 help 命令**（`memo.help.lookup`）都在表里，备忘线另有一张先例票裁过「**必须登记**」。今天 `home.*` 在该表里 **0 条**。

**裁决**：居家的 `home.help.lookup`（以及票 7 定的速查支）**要登记进 `packages/base-combos/combos.yaml`**——这不是「联动功能」，而是跨技能的命令登记；不登记会让居家的 HELP 命令在共享面上缺席。**落地归票 7**；本票只裁「要」。其余 `home.*` 命令的登记**不在本图**（另立票）。

**成本更正（审查 A ③／B ⑤，已采纳）**：**不是「改 yaml 一行」**——`test/combos-p8.test.mjs:115-120` 断言 `present.ts == renderPresent(combosKeys(yaml))`、`:121-137` 断言 HELP.md 块 == `buildHelpBlock`，所以登记之后**必须同批重跑** `base-combos/scripts/gen-present.mjs`（重写 `src/present.ts`）**与** `build-help.mjs`，漏一个就红门。**补锁**要落在 `test/combos-p8.test.mjs:140-146` 那个 `it` 里，并且要把 home 的 dist 文件加进 `:142` 附近的 runtime 数组，否则新锁**跑不到**。另外要回答一件本票没答的事：`plugin-home-ilife/src/bridge.ts:17` 今天只暴露 `ilife.home.read`——`home.help.lookup` 进登记表后**经 bridge 能不能解析**、要不要同批补入口，由**票 7 在动登记前先核清**。

**有意不完整的说明**：`bill.*` 今天在该表里也是 0 条 ⇒ 这张表**从来不是穷尽登记**，只登 HELP 这一条属有意为之、可接受，但要在票 7 票面写明，免得后来者以为漏登。取证：`t187-facts.md`。

---

## ④ 新 HELP 件全部住 `src/help/`（合并落点，取代设计稿的三处分散）

**问题**：票 12 的设计稿把新 HELP 件拆在三个地方——`src/render/helpPaths.ts`＋`src/render/helpFile.ts`（照账单**旧**形状）、`src/help/<资产>.ts`、包根 `src/output.ts`。

**裁决：全部收进 `packages/skill-home/src/help/`**：

| 件 | 落点 |
|---|---|
| 事实源（老 yaml，入库） | `src/help/scenarios.yaml` |
| 内容资产（机器生成物） | `src/help/helpAssets.ts` |
| 落点值（单件，导出面按铁律五收小） | `src/help/manifest.ts` |
| 渲染接线 | `src/help/helpFile.ts` |
| 薄封装落盘 | `src/help/output.ts` |
| 生成器 | `scripts/gen-help-assets.mjs`（包级 scripts，与 `build-help.mjs` 并列） |
| 资产锁用例 | `test/help-assets.test.mjs` |

**理由（第一性原理）**：

1. **一个交付一个地方**：HELP 交付是**技能级**东西（不属于任何单个能力），拆三处会让读者要在三个目录间拼图，也让「哪两个能力在用」这类判断失焦。
2. **两条最新先例正是这么做的**：大厨 `packages/skill-chef/src/help/{helpFile,output,sceneData,manifest,lookup,index}.ts`、作息 `packages/skill-schedule/src/help/{helpFile,output}.ts`＋`src/help/scenes/help-assets.ts`——都在新架构规则**之后**成形；账单把 HELP 渲染放 `src/render/` 是**规则之前**的旧形状。
3. **最小影响面**：设计稿原方案要动 `src/render/index.ts` 这个既有 barrel（还带出 `export *` 重名静默丢名的风险）＋ 包根新增 `src/output.ts`；收进 `src/help/` 后**两个风险都消失**，改动面更小。
4. 与票 12 决策 3（技能级落点留 `src/help/`）同向，不产生第二个「技能级 HELP 目录」。

**连带更正（票 1 的照抄清单）**：账单 `src/output.ts` 今天已是**薄封装**——出口裁决（`explicit` 优先、`target` 缺位即抛）＋ 委派 `saveHtmlFile` ＋ 写失败 `exit 5` ＋ 追加 `delivery`；**递补循环已不在它里面**（`packages/skill-bill/src/output.ts:5,24,49,54`）。同理 `helpPaths.ts` 只剩**落点值**（通式唯一定义地在共用件，`packages/skill-calorie/src/render/helpPaths.ts:6`）。**照抄时以现行件为准，不得照抄设计稿里描述的旧形状。**

---

## 给下游票的追加硬约束（并入票 12 的七条之后）

8. **票 6／票 7**：居家对 `base-paint` 的依赖是**必要**的（`help-shell` 渲染 ＋ `save-html` 落盘），门禁摘名单是这条依赖的前提（票 12 第七条已写）。
9. **票 7**：落盘只写「落点值」，机制走共用件；回执字段**只追加不改写**；`mode` 的口径逐字照账单。
10. **全体**：票 1 照抄清单里「账单三件原样照抄」的部分已过期（`#237` 之后），引用它时必须先核现行件。
11. **票 5／票 6（徽章类型词，2026-09-12 更正）**：断言必须用**模板实际那张表**——`packages/base-render/assets/help-template.html:1698-1709` 的 **10 个词**（采集／查看／结果／向导／批量／校验／选择／过程／回执／录入）；表外词会静默退色（`:1714`／`:1719`），不报错。票 12 设计稿原写的「只用 5 个」是**引用错误**（那是账单生成器更严的断言，`packages/skill-bill/scripts/gen-wake-assets.mjs:109`），已在 `t195-part6-questions.md` 就地更正。取证 `t188-facts-badge-types.md`。
12. **票 7 开工前必办（2026-09-12 修订：门禁与依赖的归属改由票 6 承担）**：① **「摘 `tooling/check-boundaries.mjs:55` 的 `'skill-home'` 名单 ＋ 同批补 `base-paint` 依赖」改由票 6 #189 做**——因为 `import 'base-paint/help-shell'` 在票 6 落地，不摘名单票 6 当场判红（同一动作的两半不能拆到两张票）；**票 7 不再重复，只需核一遍两半都在**。② `manifest.ts` 的**导出面按铁律五收小**（只出落点值，不出函数）。
13. **包内告警线（编排方裁定，落 `packages/skill-home/AGENTS.md`）**：数字 **350**（与兄弟技能包同数，便于跨包比较）；数法＝UTF-8 真实行数、含空行、**按文件**计。**适用面＝管辖内的源码件**（`docs/agents/structure.md:5-9`：管 `packages/` 下全部源码；**不管**测试文件／页面模板／构建产物／生成的资产／文档），故 AGENTS.md 里「生成物单列」「数据事实源单列」不是例外条款，而是同一条管辖边界的落地表述；**台账只登记管辖内的源码件**：`src/cli/cmd_read.ts`（741 行，超 391，归票 7）与 `src/fetch/db.ts`（434 行，超 84，归属另立票）。**已在线的超线件**：`src/cli/cmd_read.ts` **741 行**（超 391），**归票 7 #190 处置**，本票不动。
    - **编排方纠错留痕（2026-09-12）**：我曾据「366 行 > 350」要求把 `test/help-assets.test.mjs` 拆成两个文件并报超线；实施者据 `structure.md:9` 反对。核查原文后确认**实施者正确、我错了**——测试文件不在管辖内，告警线不适用，该指令属**无据加码**，已撤回（文件保持 366 行、13 条用例、单一 `test` 串）。留此一行，供后人别重犯。规则原文见 `docs/agents/structure.md:70`／`:99`（超线**当场报**「已超线，需要根据规则进行重构。」＋为什么超＋拆法或说明这次为什么不拆）。
14. **生成器 409 行已超线（2026-09-12 实测）**：`packages/skill-home/scripts/gen-help-assets.mjs` 409 行 > 350 ⇒ 已按规则报「已超线」，拆法＝薄 CLI（参数／`--check`／退出码）＋ `scripts/lib/help-assets.mjs`（读 yaml／解析／建形状／断言），两件都在线内且接口更小（铁律五）。
15. **`link` 域在资产里的形态（2026-09-12 实测后追认）**：实现把 `link` **保留在 `HELP_GROUPS` 内**并标 `"deprecated": true`（登记位），而不是把它挪出分组——这比我原先写的「不入组」更好（一处放全 9 域，计数口径 73 与「列出 70」同源）。**代价转成票 6 的验收项**：渲染侧**必须过滤 `deprecated` 分组**，否则 HELP 页会把已停用的联动组列出来；同时页面主数按「实际列出」派生（**70**），口径区写一行「骨架 73 条，联动 3 条已停用不列」。票 6 的两名审查必须各查这一条。

---

## 审查与整改记录（本裁决的对抗审查）

两席独立对抗审查，各自打分：

| 席 | 裁决 | 分数 | 采纳的必改项 |
|---|---|---|---|
| A（事实核验） | 整改后通过 | **76/100** | 措辞收窄到「HELP 写盘路径」；落点件改名 `manifest.ts`（`HELP_FILE_STEM` 在账单 `render/helpFile.ts:24` 非 `helpPaths.ts`）；combo 登记成本（重跑两个生成器）；裁 `--html` 支归属；写死缺省支载荷与 `reuseHours` |
| B（目标与风险） | 整改后通过 | **72/100** | 三支冻结（缺省／`mode:"lookup"`／`q`，且三支出参一律仍回 `{items,total}`）；复用窗口的验收口径写成「回执路径可打开」而非「文件数增加」；combo 成本与补锁落点；「两家」→**5 家** |

**一条被驳回的必改项（附反证）**：审查 B 要求「`_N` 起步照老家 `_1`」。经查**居家的老家没有 `_N` 机制**——`D:\2Study\StudyNotes\SKILLS\居家管家\scripts\render\__init__.py:130-147` 的 docstring 逐字写「冲突直接覆盖」；大厨契约 `docs/skills/skill-chef/t3-template-contract.md:662-670` 引的证据是**私家大厨自己的**老家脚本。故裁决维持：用共用件缺省 `succession`（`_2` 起），不为边角情形改共用件。

**审查另证实的既有事实**（写进票 7 的好处）：`saveHtmlFile` 自建目录（`saveHtml.ts:355`）、中文文件名无限制或转义（`:92`／`:157`）、`mode` 三条口径与账单逐字一致（`skill-bill/src/cli/cmd_read.ts:116,117,554-555`）、**零家仍自持独占写**（五家全走共用件）。
