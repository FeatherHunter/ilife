# 居家管家HELP 结构设计（票 #195）：影响清单＋结构设计

> 生成方式：分节由多个子代理各自产出（每节附事实依据）、经两名独立对抗审查后修订，本文件按固定顺序机械合并，未做人工改写。
> 状态：**决策已裁决**（票 12 四条见 `t195-decisions-record.md`；票 4 四条见 `t187-decision.md`）。
> **后续更正（以更正版为准）**：① 新 HELP 件全部收进 `src/help/`、落点件定名 `manifest.ts`；② 账单 `output.ts` 已是薄封装（递补在共用件）；③ 徽章类型词用模板实际 **10 词**表；④ combo 要登记。

## 零、决策摘要

| 序 | 决策 | 结论 | 出处 |
|---|---|---|---|
| 1 | 内容资产形态 | 机器生成 typed `.ts` ＋ 生成器（含 `--check`）＋ 摘要锁；生成物禁手改；**锁必须接进包内门**；输入源在仓内 | `t195-decisions-record.md` |
| 2 | 一级分组英文标识 | 老骨架 9 个域 key；`link` 以 `deprecated: true` 留登记位 | 同上 |
| 3 | 技能级 HELP 件落点 | 留在 `src/help/`（不搬） | 同上 |
| 4 | 速查与 HELP 的事实源 | **各留一份** ＋ 双向对账锁 | 同上 |
| 5 | 命名落盘管线归属 | 自持只留**落点值**；机制全走共用件 `base-paint/save-html` | `t187-decision.md` |
| 6 | 缺省出口口径 | **缺省＝HELP 文件**；三支冻结（缺省／`mode:"lookup"`／`q`），三支出参仍回 `{items,total}` | 同上 |
| 7 | combo 登记 | **要登记**（`base-combos/combos.yaml`，成本含重跑两个生成器） | 同上 |
| 8 | 新件落点统一 | 全部收进 `src/help/`，落点件＝`manifest.ts` | 同上 §四 |

## 一、总览：目录树与票面四问作答

依据：只读 part1＝`t195-part1-new-files.md`、part2＝`t195-part2-existing-and-gates.md`；本件只给形状与判据，不写生产代码。

> 更正（2026-09-12）：新 HELP 件落点统一收进 src/help/；账单 output.ts 已是薄封装（递补在共用件）。依据 t187-decision.md 第四节。

件数（2026-09-12 更正后重算）：新增 **8 件**＝`src/help/manifest.ts`、`src/help/helpFile.ts`、`src/help/output.ts`、`src/help/helpAssets.ts`（内容资产生成物，事实源 `src/help/scenarios.yaml` 已入库）、`scripts/gen-help-assets.mjs`、`test/help-delivery-*.test.mjs`、`test/help-exit-*.test.mjs`、`test/help-assets.test.mjs`／改动 **7 件**（`package.json`／`SKILL.md`／`build-help.mjs`／`help.html`／`src/index.ts`／`src/help/index.ts`／`cmd_read.ts`）＋仓根 `tooling/check-boundaries.mjs` 1 件。**`src/render/index.ts` 不在册**（不动，见 §2 裁定 1）；原 `src/render/helpPaths.ts`／`src/render/helpFile.ts`／`src/output.ts`／`src/help/<名>.ts` 四条已并为 `src/help/` 内三条。

## 1. 目录树定稿（`packages/skill-home/`）
```
package.json / SKILL.md  [改动] 加 base-paint 依赖、补「HELP 交付」节（part1 §1末、part2 §1.2）
scripts/build-help.mjs   [改动] 注入块换行探测（part2 §1.3）
scripts/gen-help-assets.mjs  [新增] 生成内容资产，含 --check（part1 §1）
templates/help.html      [改动] 只微改、不搬走（part2 §1.4）
src/index.ts             [改动] 随 help/index.ts 一行转发（part2 §1.5）
src/help/ ← 既有目录，本票新 HELP 件**全部**落位所在：index.ts [改动·加一行转发]／lookup.ts [不动·保持 HelpHit、lookupHelp 形状]（part2 §1.5）／manifest.ts [新增·只有落点值，零 IO]／helpFile.ts [新增·全量 HELP JSON → 全页 HTML]／output.ts [新增·薄封装落盘 deliverHtml，递补在共用件]／helpAssets.ts [新增·内容资产生成物，禁手改词]（part1 §1、§4.2）／scenarios.yaml [既有·事实源，已入库，不动]
src/render/ ← 既有目录，已有 6 件：index.ts／errors.ts／envelope.ts／html.ts／templates.ts／views.ts（见 §2）——**一行不动**：新 HELP 件收进 `src/help/` 后不再碰这个既有 barrel（§2 裁定 1）
src/cli/cmd_read.ts      [改动] 只挪 home.help.lookup 一支（part2 §1.1）
test/ 新增 help-delivery-*／help-exit-*／help-assets 三件（part1 §1）；既有五件 cli／render／fetch／policy／skill（改动风险，part2 §1.1、§1.4）
tooling/check-boundaries.mjs [改动] 仓根件，skill-home 移出 SKILLS_BASE_FROZEN（part2 §2）
```

## 2. 撞名／撞目录核对（实地列盘上路径；**1 处真冲突**）
1. **`src/render/index.ts` 不再被动**（2026-09-12 更正）：part1 §1 曾列「新增」、原裁「按改动办」；t187-decision.md 第四节裁「新 HELP 件全部收进 `src/help/`」后，`manifest.ts`／`helpFile.ts` 改住 `src/help/`，这个既有 barrel（7 条 export 语句，实测名单：`HomeRenderError`／envelope **4 名**＝`HOME_KEY_SHAPES`／`homeShapeFor`／`buildHomeEnvelope`／`parseHomeEnvelope`／views 14 函数＋类型 `ItemCard`／`HelpItem`／html 10 名／templates 3 名 `HOME_TEMPLATES`／`templateFor`／`loadTemplate`＋类型 `HomeTemplate`）**一行不动**——落点分散才会撞名，收进 `src/help/` 后既不用加行、也不必冒 `export *` 重名静默丢名的风险；原「新增」行按删除办。
2. **`src/render/errors.ts` 真冲突**：part1 §1 以「仅当居家还没有同类错误件」为条件列新增，盘上已存在 `class HomeRenderError extends Error`。裁定：**条件不成立**，该条按新增划线应删；是否加渲染期分支或另起错误名留给票 6。
3. 同名不同目录不裁冲突、点名防写混：`src/help/index.ts` 与 `src/render/index.ts` 两个 barrel 互不覆盖。提示：`gen-help-assets.mjs`（新增）与 `build-help.mjs`（改动）都碰 `SKILL.md` 注入块，边界面要写清。
4. 无冲突：测试三件与既有五件不重名；`src/help/manifest.ts`／`src/help/helpFile.ts`／`src/help/output.ts`／`src/help/helpAssets.ts` 盘上均无；`src/help/`、`src/render/` 目录都已存在（`src/help/scenarios.yaml` 已入库）→新增件**全部**在既有 `src/help/` 内加文件、不建新目录，`src/render/` 一件不加。

## 3. 票面四问逐条作答
**问 1 · 新增哪些目录／文件、各给什么、有无共用件**
- 目录：新 HELP 件**全部**住 `src/help/`（既有目录，不建新目录，`src/render/` 一件不加；事实源 `src/help/scenarios.yaml` 已入库）。对外：`manifest.ts` **2 个常量**＝`HELP_HTML_DIR_NAME`（`home_manager_html`）＋`LOOKUP_FILE_STEM`（`居家管家_速查表`，票 4 #187 裁决）（part1 §1、§2 第 1 行）；`helpFile.ts` **21 个**＝6 常量＋8 接口＋7 函数（part1 §2 第 3 行）；`output.ts` **3 个**＝`deliverHtml`＋两再导出类型（薄封装，递补在共用件）；`src/render/index.ts` **不动、不加行**（§2 裁定 1）。
- **同能力内部复用两处，不是规则里的共用件**：`manifest.ts` 被同包 `helpFile.ts` 与 `output.ts` 用（落点值唯一处）；`output.ts` 被 `home.help.lookup` 的「速查」与「落 help 文件」两路用（薄封装签名逐字照 bill，part1 §2 第 2 行）。判据：`docs/agents/structure.md:67` 的共用件要「写得出**哪两个能力**在用」、且住与能力目录并列的共用位（`t195-facts/06-precedents.md:74/76`）；上述两处都在**同一能力内部**两路复用，既不满足「两个能力」、也不住共用位，两个触发条件（新建目录层级／碰三个以上能力）均不成立（`t195-facts/06-precedents.md:76`）→ **本票不新建共用件，无需共用件点头句**。

**问 2 · HELP 交付算不算一个「能力」；`src/help/` 违不违反铁律四**
- 算：它有自己的命令 `home.help.lookup`、自己的失败态（exit 5）与回执（绝对路径），对外可交付，不是内部工具函数。不违反：铁律四管的是「目录名与接口名取自 HELP 的一级／下一级」（part2 §4），`src/help/` 取的正是 HELP 一级分组，part2 §4 已判「合规（待命名结论）」，本件沿用。但「算能力」≠另立包：包仍是 `skill-home` 一个，不新增 `packages/skill-*`。

**问 3 · 被碰到的旧件怎么就地摆正；`cmd_read.ts` 要不要顺手抽件**
- 摆正四处：`cmd_read.ts` 只挪 `home.help.lookup` 一支、`scripts.test` 覆盖包内用例、`build-help.mjs` 换行探测、`help.html` 只微改不搬走（part2 §1.1–§1.4）。
- 抽件：**建议只抽这一块**——`cmd_read.ts` **741 行**（本地实测、UTF-8 真实行数，数法：`[System.IO.File]::ReadAllLines($p,[Text.Encoding]::UTF8).Count`＝741；旁证 `(Get-Content -LiteralPath $p -Encoding UTF8).Count`＝741、按 LF 数 741 个、CRLF 0，三者一致），超线 **391 行**（741−350，约 2.1 倍，part2 §1.1）；抽走该支（约 5 行）后仍在告警线上，故第四步当场报超线；抽整份（连 `dispatch()`）另立票。影响面小：零导出（part2 §1.1），只牵 `test/cli.test.mjs` 黑盒 spawn；且**不动 `:55-59` 开库时机**，否则替票 6／票 7 定口径。

**问 4 · 每件归哪张票；包内 `test` 脚本盖不到新用例要不要同批修**
- 归票：`manifest.ts`→票 7 #190；`helpFile.ts`→票 6 #189；`output.ts`→票 7 #190；生成器＋内容资产（`helpAssets.ts`）＋资产锁→票 5 #188（part1 §1 逐行给）。**「仅帮助件交叉待定」已消**：原 `src/help/<名>.ts` 就是 `src/help/output.ts`（归票 7 #190）；`src/render/index.ts` 不再在册（§2 裁定 1，不动）。**测试三件归属已写死**（照 part1 §1）：`test/help-delivery-*.test.mjs`→**票 7 #190**；`test/help-exit-*.test.mjs`→**票 7 #190**；`test/help-assets.test.mjs`→**票 5 #188**。
- `test` 脚本：**建议同批修**——`node --test` 只跑显式路径、不做目录发现，包内五件从包目录跑一律不执行（part2 §3），新增的「落文件＋回执」今天只回 `{ items, total }`，没有回归网；修法＝显式列包内五件并保留 `../../test/scaffold.test.mjs`，跑前先 `build`。

## 4. 必报五步进度
- 一 · 影响清单：**已完成**（part2 §1，本件 §1 收成树）。二 · 结构设计：**已产出，待用户点头**——本件只到「报清形状＋待用户点头」（`docs/agents/structure.md:78`「用户看过再动」）；树里已无未定节点：内容资产生成物路径＝`src/help/helpAssets.ts`、速查主体＝`居家管家_速查表`（t187-decision.md 第四节、票 4 #187 裁决），闭环只等用户点头。
- 三 · 写代码：**留待实现票**（本图不写生产代码）。四 · 超线报警：**本次要做、当场报**——`src/cli/cmd_read.ts` **741 行**（本地实测、UTF-8 真实行数，数法见 §3 问 3）、告警线 **350 行**（**沿用兄弟包先例，`packages/skill-home` 本包尚未落这个数字**；`docs/agents/structure.md:70` 定「数字由各包自己定」），**已超线，需要根据规则进行重构。** 为什么超：单件堆了全部分派分支；拆法：本票只挪 help 一支，整份重排另立票。**前置项**：本票先把告警线数字与数法落进 `packages/skill-home/AGENTS.md`（该件今天**尚不存在**，包内无此数字）。
- 五 · 交付对账：**留待实现票交付时**（part2 §5、§4）——须逐行对账，是全套纪律唯一的机械验收点。

## 5. 本件定不下来的（交下一棒汇总成待用户点头的问题；2026-09-12 更正：原第 2／3／5 条已定、原第 7 条已核实，见条内标注）
1. 新增件名单**最终修订**：§2 两条＝「`src/render/index.ts` 不动（原新增行删）／`src/render/errors.ts` 条件不成立（原新增行删）」，划掉新增须用户点头。
2. **（已定，2026-09-12）**原「内容资产生成物的居家路径与目录名」＝`src/help/helpAssets.ts`，事实源＝已入库的 `src/help/scenarios.yaml`（t187-decision.md 第四节）；「不照搬 `src/triggers/`」由收进 `src/help/` 一并解决。
3. **（已定，2026-09-12）**原「`LOOKUP_FILE_STEM` 取值、要不要分速查支」＝`'居家管家_速查表'`、与 HELP **分名**（票 4 #187 裁决）。
4. HELP 五字段取值与首次使用横幅显隐口径（part1 §5 第 3 条）——无仓内依据。
5. **（已定，2026-09-12）**原「`src/help/<名>.ts` 的新文件名」（part2 §6.3）＝`src/help/output.ts`（t187-decision.md 第四节：新 HELP 件全部收进 `src/help/`）。
6. 徽章类型词：断言用**模板实际那张表的 10 个词**（`packages/base-render/assets/help-template.html:1698-1709`，见 part1 §5 更正条）；原「共享模板认的 5 个」是引用错误。
7. **（已核实，2026-09-12）**原「`references/scenarios.yaml` 是否已是居家现成事实源」——已在库，即 `src/help/scenarios.yaml`，写生成器前按它读。
8. `scripts.test` 改法与 `build-help.mjs` 换行修法**是否并入本票**（part2 §6.4，两件不在 `src/`）。
9. `base-paint` 依赖**版本号**取什么（part2 §6.5，先例 `^0.3.0`）。
（原「测试三件交叉归属」一条已定，见 §3 问 4，不再列为待定。）

## 二、第一步·影响清单：新增件

范围：只写「新件住哪、每件对外给什么」与照抄对应；不写实现细节。票号口径：票 5 #188 内容资产／票 6 #189 渲染接线／票 7 #190 出口落盘。

> 更正（2026-09-12）：新 HELP 件落点统一收进 src/help/；账单 output.ts 已是薄封装（递补在共用件）。依据 t187-decision.md 第四节。

## 1. 新增件逐条表（居家侧路径 → 职责 → 对外给什么 → 归哪张票）

| 新增件（`packages/skill-home/` 下） | 一句话职责 | 对外给什么（导出名） | 票 |
| --- | --- | --- | --- |
| `src/help/manifest.ts` | **只有落点值**：目录名与文件名主体（零 IO 纯常量；通式／递补不在本件） | `HELP_HTML_DIR_NAME`＝`'home_manager_html'`；`LOOKUP_FILE_STEM`＝`'居家管家_速查表'`（票 4 #187 裁决：速查支产物 `居家管家_速查表_<stamp>.html`，与 HELP 分名）；HELP 文件名主体 `居家管家_HELP` 照 bill 仍住 `helpFile.ts` | 票 7 #190 |
| `src/help/helpFile.ts` | 内容资产＋派生 → 全量 HELP JSON → 全页 HTML，零 IO、零落盘 | 照 bill 的 21 个导出名单（6 常量＋8 接口＋7 函数），值换居家：`HELP_FILE_STEM`／`HELP_FILE_SKILL_NAME`／`HELP_FILE_TITLE`／`HELP_FILE_VERSION`／`HELP_INIT_SCENE_ID`／`HELP_CONTACT`、`HelpFileData`／`HelpFileOptions`／`HelpMetaBlock`／`HelpInitBanner`／`HelpIndex`／`HelpIndexItem`／`HelpContact*`、`formatHelpMinute`／`deriveSummaryLine`／`buildMetaBlocks`／`buildInitBanner`／`buildHelpFileData`／`renderHelpFileHtml`／`buildHelpIndex` | 票 6 #189 |
| `src/help/output.ts` | HTML 产物唯一落盘点＝**薄封装**：出口裁决（`explicit` 优先且覆盖写、`target` 缺位即抛）＋委派共用件 `saveHtmlFile`＋写失败 `exit 5`＋顶层追加 `delivery{mode,path,bytes}`；**不自持递补** | `deliverHtml`｜`HtmlDelivery`｜`HtmlLanding`（后两者自 `base-paint/save-html` 再导出） | 票 7 #190 |
| `src/help/helpAssets.ts`（内容资产，机器生成物，**不搬** `src/triggers/`；事实源＝已入库的 `src/help/scenarios.yaml`） | 生成物：全量 HELP 资产（域／组／场景／唤醒词／场景索引） | 导出名单留给你票 5 定（bill 那份给 `WAKE_GROUPS`／`SCENE_BY_ID`／`HELP_WAKE_WORDS`／`WAKE_ASSETS`） | 票 5 #188 |
| `scripts/gen-help-assets.mjs` | 由事实源生成上一件，含 `--check` 分支 | 无（脚本，不对外） | 票 5 #188 |
| `test/help-delivery-*.test.mjs` | 模块级锁：落点值（纯常量零 IO）／同秒三写不被覆盖（通式与递补机制在共用件，锁的是调用面） | 无 | 票 7 #190 |
| `test/help-exit-*.test.mjs` | 真 spawn 出口锁：回执五字段序＋顶层 `delivery`＋失败 exit 5 ＋ stdout 空 | 无 | 票 7 #190 |
| `test/help-assets.test.mjs` | 资产锁：摘要锁＋与事实源双向对账 | 无 | 票 5 #188 |
| `src/render/errors.ts`（仅当居家还没有同类错误件） | 渲染期错误类型（bill 侧是 `BillRenderError`） | 名单留给票 6 定 | 票 6 #189 |

- 不是新增、但要同批改的既有件（同报）：`packages/skill-home/package.json`（依赖闭包加 `base-paint`）、`packages/skill-home/SKILL.md`（补「HELP 交付」节）、`packages/skill-home/src/cli/cmd_read.ts`（HELP 在开库之前分派）、`tooling/check-boundaries.mjs`（把 `skill-home` 移出 `SKILLS_BASE_FROZEN`）。**不在册的**：`src/render/index.ts`——新 HELP 件全收进 `src/help/` 后不与既有 barrel 撞名，本票**不加行、不动它**（t187-decision.md 第四节理由 3），原表那行「`src/render/index.ts` 汇总出口」已删。

## 2. 照抄对应表（bill 件含真实导出名 → 居家对应件）

| bill 件（导出名） | 居家对应件 | 保留什么 | 必须改什么 |
| --- | --- | --- | --- |
| `packages/skill-bill/src/render/helpPaths.ts`（`HELP_HTML_DIR_NAME`／`LOOKUP_FILE_STEM`） | `src/help/manifest.ts` | 零 import、零函数、零类型的纯常量形状（**只有落点值**） | 文件名取 `manifest.ts`——照大厨 `src/help/manifest.ts` 先例（账单那一件叫 `helpPaths.ts`，且它的 `HELP_FILE_STEM` 其实住在 `src/render/helpFile.ts:24`，不是 `helpPaths.ts`——照抄会抄错位）；两常量取值换居家口径（目录名 `home_manager_html`／速查主体 `居家管家_速查表`）；速查支**已按票 4 #187 裁决写死**，不再待定。**通式口径不抄进来**：时间戳通式／`_N` 递补／独占写／复用窗口／绝对路径回执的唯一定义地是共用件 `base-paint/save-html` 的 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts:355` 自建落点目录；旁证 `packages/skill-calorie/src/render/helpPaths.ts:6`） |
| `packages/skill-bill/src/output.ts`（`deliverHtml`／`HtmlDelivery`／`HtmlLanding`） | `src/help/output.ts` | **薄封装形状**（现行件，`packages/skill-bill/src/output.ts:5,24,49,54`）：`explicit` 优先且覆盖写、`target` 缺位即抛、回执 `{ mode:'file', path, bytes }` 且 `path` 恒绝对——两路都只委派 `saveHtmlFile` | 注释里的技能名与报错前缀（`[skill-bill]` → 居家）；`HtmlLanding`／`HtmlReceipt` 仍从 `base-paint/save-html` 取。**删掉旧写法「递补只认 `EEXIST`」**：递补循环已不住 `output.ts`（本件不自持 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`） |
| `packages/skill-bill/src/render/helpFile.ts`（21 导出：6 常量＋8 接口＋7 函数） | `src/help/helpFile.ts` | 全量 HELP JSON 形状（`renderHelpFileHtml` 直调 `renderHelpShellHtml`）；三块可选内容字段一律带着、显隐走 `hidden`；域数／场景数／版本计数一律派生；`now` 显式传入 | 六个常量取值（`HELP_FILE_STEM`＝`'居家管家_HELP'` 照 bill 住本件**不**住 `manifest.ts`）；`groups` 换成居家内容资产；`init_banner` 的 `prompt` 来源换居家场景 |
| （不抄）`packages/skill-bill/src/render/index.ts` | **不动** `src/render/index.ts` | — | 收进 `src/help/` 后不再有「既有 barrel 上加行」这一条，也免掉 `export *` 重名静默丢名的风险（t187-decision.md 第四节理由 3） |

## 3. 不许照抄的件（逐条＋一句话理由）

- `packages/skill-calorie/src/output.ts`：卡路里的「命令名→中文段落映射」「动态段」「写不进去就换形态的兜底」是它自己的产物模型；本线目的地是明确拿到文件，写不进去就是真失败（exit 5）。
- `packages/skill-calorie/src/render/helpShell.ts`：卡路里侧转发件且已标 deprecated；新技能直连公共层出口，不再多一层转发（铁律五）。
- `packages/base-render/src/helpShell.ts` ＋ `assets/help-template.html` ＋ `scripts/gen-help-shell.cjs`：通用 help 模板的出口与真相源，只 import，不抄、不改。
- `tooling/skill-html-snapshot.mjs`：本图只新增 HELP 文件、不动居家 `templates/*.html`，`pnpm snapshot:html:check` 应保持绿——注意别被误伤。
- `packages/skill-home/src/help/lookup.ts` ＋ `src/render/views.ts:buildHelpItems`：居家速查表数据源与渲染「照用不改」，不重写。
- `src/triggers/` 这个目录名：工种名，且这份早于 `docs/agents/structure.md` 立规；居家不该照搬（铁律四）。
- `gen-wake-assets.mjs` 的读取段：事实源从老实物 HTML 的 payload 换成 `src/help/scenarios.yaml`（已入库），读取段要重写。
- `cmd_read.ts` 的居家开库顺序：形状照抄，但居家现状相反（`dispatch` 首行就 `openHomeDb`、`resolveDbPath` 会 `mkdirSync`），「看帮助先把库建出来并跑 DDL」不能抄。

## 4. 两处生成物禁手改（路径 ＋ 改源命令原文）

### 4.1 通用 help 模板出口：`packages/base-render/src/helpShell.ts`（含 `assets/help-template.html`、`scripts/gen-help-shell.cjs`）

- 禁手改原文：「**`packages/base-render/src/helpShell.ts` 是生成物，禁手改**：真相源是 `packages/base-render/assets/help-template.html`，生成器 `scripts/gen-help-shell.cjs`」。
- 改源命令原文：「改模板要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`」。

### 4.2 内容资产生成物：bill 侧 `packages/skill-bill/src/triggers/wake-assets.ts`（986 行）→ 居家 `src/help/helpAssets.ts`（同性质，事实源 `src/help/scenarios.yaml` 已入库）

- 禁手改原文：「**内容资产也是生成物，禁手改词**：`wake-assets.ts:8-10` 与生成器头注释（`gen-wake-assets.mjs:144-146`）都写明『改内容＝改事实源或改生成器里的新增条目段，再跑生成器』」。
- 改源命令：t184 原文只给到生成器脚本名、`--check` 分支（`gen-wake-assets.mjs:243-249`）与用法注释（`:7-13`），**未给完整命令行**（记为事实缺口）→ 居家同样要留 `--check`，住 `packages/skill-home/scripts/gen-help-assets.mjs`。

## 5. 我定不下来的（交给下一棒或用户；2026-09-12 更正：原第 1／2 条已定、原第 5 条已核实，见条内标注）

- （原第 1 条已定，2026-09-12）：内容资产生成物的居家路径＝`src/help/helpAssets.ts`、事实源＝已入库的 `src/help/scenarios.yaml`——「新 HELP 件全部收进 `src/help/`」同时解掉「不能照搬 `src/triggers/`」的顾虑（t187-decision.md 第四节）。
- （原第 2 条已定，2026-09-12）：居家 `LOOKUP_FILE_STEM`＝`'居家管家_速查表'`，速查支与 HELP **分名**（票 4 #187 裁决），不再「属票 4 的事」。
- 居家 HELP 五字段取值（`title`／`contact` 三项／`version`／首次使用横幅文案）与 `init_banner` 显隐口径：无仓内依据。
- 居家是否已有渲染期错误件（bill 的 `./errors.js`＋`BillRenderError`）：本窗只读两份事实包，未核实。
- （原第 5 条已核实，2026-09-12）：`src/help/scenarios.yaml` 已在库，即居家现成事实源；生成器读取段照它重写。
- 居家 HELP 用的徽章类型词：应断言**模板实际那张表的 10 个词**（`packages/base-render/assets/help-template.html:1698-1709`）；这里原写的「共享模板认的 5 个（`采集／查看／选择／向导／回执`）」是引用错误，已在 `t195-part6-questions.md` 与 t187-decision.md 追加约束 11 更正。
- 三件测试件的票归属是我按件归（模块级／出口锁归票 7、资产锁归票 5，part5 §3 问 4 采纳）；原「`src/help/<名>.ts` 交叉归属待定」已消——该件就是 `src/help/output.ts`，归票 7；`src/render/index.ts` **不动**（不加行、不新增），已定。

## 三、第一步·影响清单：旧件就地摆正、边界门禁、纪律自查

只读两份事实包：`05-skill-home-today.md`（下称 `05`）、`04-constraints.md`（下称 `04`）；引用格式 `05:55`＝该文件行号。本票只给形状与判据，不写生产代码；标「建议」者皆为建议，不是定论。

## 1. 就地摆正的旧件

### 1.1 `packages/skill-home/src/cli/cmd_read.ts`（741 行）

- 改什么：只把 `case 'home.help.lookup'`（`05:46` 指到 `:674-678`）那一支挪进 `src/help/`，分派段只留一次调用。
- 为什么必须改：741 行 − 350 ＝ 超 **391 行**（`04:51`，约 2.1 倍），已触发第四步「超线报警」（`04:68`）；本票又要往这条支路加「落 help 文件＋回执绝对路径」，就地摆正要求旧代码不一致时同处修好（`04:67`）。
- **这 350 是哪来的（必须披露）**：`docs/agents/structure.md:70` 只给口径不给数字（「具体数字由各包自己定，写在各包自己的地方」）；350 ＋ LF 是**兄弟包先例**——落点 `packages/skill-chef/AGENTS.md:7`，`packages/skill-memo-ilife/AGENTS.md:7` 同数同口径。`packages/skill-home/AGENTS.md` **实测不存在**、包内该词零命中（`04:73`、`04:83`）。故上面那句「超 391 行」是**借兄弟包的数字算出来的**，不是本包既有规矩。
- **就地定本包数字与数法（动作，不是建议）**：本包先定下自己的告警线数字与数法（先例数法＝ LF、只数 `\n`、按文件不按目录），写进 `packages/skill-home/AGENTS.md`（`structure.md:70`、`06-precedents.md:81`）；数字与数法由谁定、定多少，本文件不替用户拍板。**本包数字一旦不是 350，上面那个 391 要按本包数字重算**（741 − 本包数字）。
- 会影响谁、要不要先打招呼：`cmd_read.ts` 是**零导出**（`05:20`），今天没有别的文件 import 它的符号，抽走一支不动包内其它件；会动到的只有 `test/cli.test.mjs` 的黑盒 spawn（`05:75`），那是端到端，不看文件内部形状。
- 抽不抽（已定，见 §6 第 1 条）：**本票只抽「看帮助」那一支（`home.help.lookup`），不整份重排。** `dispatch()` 不搬（它握 `openHomeDb`／`resolveDbPath`，`04:37-39`）；该支约 5 行，抽完 741 行仍在告警线之上。该文件的更大范围抽件不属本图（整包按 HELP 一级分组重排另立票）；票 7 #190 只按票 4 #187 的出口口径调整调用。
- 开库时机（已定，不再讨论）：`:55-59` 的「分派前先开库」是 help 落文件要不要开库的争点（`04:45`）。**票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。** 故本票不改写 `:55-59`，只把「本票不改开库时机」这一句写进改动说明。

### 1.2 `packages/skill-home/package.json`

- 改什么：`scripts.test`（`05:53`）今天只跑仓根 scaffold 两件；`node --test` 只跑显式给出的文件路径、不做目录发现，故 `packages/skill-home/test/*.test.mjs` 五件一律不跑（`05:55`），本票新增的 help 落文件行为没有回归网。改为能跑到包内五件用例。
- 影响面：只一条脚本字符串；`files` 三条（`05:54`）不动发布面。注意 `files` 里的 `SKILL.md` 是工作区未提交新增行（`05:84`）——**别碰**。

### 1.3 `packages/skill-home/scripts/build-help.mjs`

- 改什么：`build` 里加一次换行探测（读文本时查 `\r\n`），注入块与整份回写跟检出换行一致。为什么必须改：脚本自己（`:14-19`）注入块只用 LF、`lines.join('\n')`（`04:28`），读法只为「按 utf8 读、不探也不还原」这个事实负责（`04:30`、`04:86`）。
- 影响面：`SKILL.md` 的 `<!-- HELP-AUTO-* -->` 块（`05:68`）由构建期重写；另有子代理正在改这份工作区文件（`05:69`、`05:83`），**它的改动只读不碰**，替换文本要等它落地后再对齐。

### 1.4 `packages/skill-home/templates/help.html`

- 改什么：**建议留、且只做微改（不加壳、不搬走）**。为什么：**这份文件今天不被任何 `.ts`／`.mjs`／`.json` 按字面引用**——本席重跑 `grep "help.html" packages/skill-home`（`--include=*.ts`／`*.mjs`／`*.json`）**实测 0 命中**，读取面全是**按名键间接**（4 处源码 ＋ 1 处快照实物，**共 5 处**）：`src/render/templates.ts:27`（`HOME_TEMPLATES` 里那一项 `'help'`）／`:55`（`templateFor` 把 `home.help.lookup` 映成 `'help'`）／`:62-67`（`loadTemplate` 拼 `name + '.html'` 读盘，模板目录在 `:60`）／**唯一生产调用点** `src/cli/cmd_read.ts:721`（`fillTemplate(loadTemplate(templateFor(key)), …)`）／快照实物 `tooling/skill-html.snapshot.json:697` 一条 `home/tpl/help`（锁 `bytes` ＋ `sha256`）。
- 影响面：改名或删除**破 2 处**——`test/render.test.mjs`（断言 21 件模板三标记各 1 次，`05:62`）破 **1 份测试**，`tooling/skill-html.snapshot.json` 破 **1 条**（`home/tpl/help`）；这是本票最该避的涟漪。注意读取面 5 处与破处 2 处**不是同一个集合**：另外 3 处（`templates.ts` 三处）改动时不会自己变红，名字对不上要跑到编译期／运行期才炸——这正是「按名键间接」的代价。落 help 文件应走同一套「help 模板 ＋ 公共层 `base-paint/help-shell`」，不是另起模板。

### 1.5 `src/help/index.ts`／`src/help/lookup.ts`

- 改什么：待定。`index.ts` 是纯 barrel（`05:26`、`05:44`）；`lookup.ts` 今天只出 `HelpHit`／`buildHelpLookup`／`lookupHelp`（`05:27`）。
- 要不要动：若本票只把「写文件＋回执路径」做成新函数挂进 `src/help/`，则 `lookup.ts` 不动，`index.ts` 加一行转发。若改 `lookup.ts` 的 `HelpHit` 形状（`05:45`），会牵动 `render/views.ts` 的 `HelpItem`（`05:39`）与 `cli.test.mjs` 的全表断言（`05:75`）——本票不建议。
- 影响面：`index.ts` 只被 `src/index.ts` star 转发（`05:19`）与 `scripts/build-help.mjs` 构建期 import（`05:49`）；加一行转发不影响它们。

### 1.6 内容资产线（生成物／生成器／摘要锁／禁手改）

- **形态已定，不再讨论形态**：用户 2026-09-12 裁定「照卡路里、饼干记账的做法」——两家都是**机器生成 typed `.ts`** 资产：`packages/skill-calorie/src/triggers/wake-assets.ts`（本席实测 255362 字节，与 `08-calorie-practice.md:7` 逐字相符；但**按 LF 数得 4747 行**，该文记的是「4733 行」——差 14，说明那份文档那个「行」不是 LF 口径，数法本身要定，同 §1.1 那格）与 `packages/skill-bill/src/triggers/wake-assets.ts`（38556 字节 ／ LF **986**，与 `09-bill-practice.md:7` 逐字相符），都带生成器与摘要锁（**锁在测试里**），生成物明文禁手改。居家今天**这条线一件都没有**（`packages/skill-home/src/triggers/wake-assets.ts` 实测不存在、包内无摘要锁件），本票要整条建起来。
- **① 内容资产（机器生成的 `.ts`）**：落点**待定**（不照抄 `src/triggers/`——那是工种名）；件头注释写明「机器生成，禁手改」＋生成器入口与 `--check`（先例：bill `wake-assets.ts:8-10`、`gen-wake-assets.mjs:144-146`；chef `sceneData.ts:1-17`）。影响面：新件，不动旧件，但内容只能由事实源改。
- **② 生成器脚本（带 `--check`）**：落包内 `packages/skill-home/scripts/gen-help-assets.mjs`（与既有 `build-help.mjs` 并列，`structure.md:69`）；`--check` 只比对不落盘、不一致退非零（bill 先例 `gen-wake-assets.mjs:243-249`）；形状断言 fail-closed（bill `:99-118`：域数／组数／场景数／id 唯一／`types` 都落在模板配色表内）。事实源（老 yaml，`t188-body.md:22`）**只读**。
- **③ 摘要锁（进测试）**：落 `packages/skill-home/test/help-assets.test.mjs`（新建）——锁放测试里、不放生成器里（先例：卡路里锁在根测试 `test/calorie-triggers.test.mjs`，账单锁在包内 `test/wake-assets.test.mjs:14`）＋与口径层 `WAKE_TABLE` 双向对账（bill `:68-84`）。**这里居家要比两家做得好**：锁必须**真进包内门**——`scripts.test` 今天跑不到包内用例（§3），锁不进门等于没锁；三家现状里这一格是空的（bill `09-bill-practice.md:17` 记「一等门：无」）。
- **④ 生成物禁手改**：有牙的「禁手改」＝件头明文 ＋ `--check` 可复跑 ＋ 摘要锁进测试，三缺一，手改生成物在仓内就没有机械门。
- **协调风险（必须有人认领）**：生成器这条线与 `scripts/build-help.mjs` **抢同一块 `SKILL.md` 注入块**——`build-help.mjs:10-11` 的 `<!-- HELP-AUTO-START -->`／`<!-- HELP-AUTO-END -->`，`:24-29` 读整份 `SKILL.md`、只重写标记块后整份回写；而生成器这侧也被记为要碰同一块（`t195-part5-overview.md:25`、`t195-structure-design.md:32`：两边都碰注入块，边界面要写清）。两边重写同一块，**后跑的一方会把前一方的改动整体覆盖**（§1.3 的换行修法只改了 `build-help.mjs` 一侧，覆盖方向还会把换行还原回去）。开工前必须**二选一写清谁负责**：(a) 注入块**唯一归 `build-help.mjs`**，生成器只出资产、不碰 `SKILL.md`（卡路里先例就是这一形：`08-calorie-practice.md:15` 记 `build-help.mjs` 只重写标记块、不碰 `wake-assets.ts`）；(b) 生成器也写该块，则须定下**串行顺序（谁先谁后）＋唯一负责人**。本文件不替用户拍板，记进 §6。

## 2. 边界门禁

- 摘不摘 `'skill-home'`：**建议摘**（`04:10` 的 `:55` 名单今天只剩它一个）。不摘的话，新件一旦 import `base-paint` 就同时撞两道断言——依赖闭包（`04:12`，包 `dependencies` 只有 `base-link-core`，`04:21`）与源码／模板扫描（`04:14`），各记 1 处破界。摘名单＝宣布它是有意消费方（`04:19`）。
- 同批还要改什么：照 chef 先例，「加 `"base-paint"` 依赖」与「从 `:55` 摘名」是**同一动作的两半**，一次做完（`04:21`，先例引 `:52`）。只摘不补、或只补不摘，都停在中途。
- 风险一句话（**如实说：摘名会把这道门禁整段架空，不是「少拦一道」**）：摘掉后这道门禁**不再**替 skill-home 拦越界，此后该包再 import 别的 `base-*` 不会有人喊停，护栏只剩评审。更重的是**假绿**：`tooling/check-boundaries.mjs:55` 名单会成**空数组**，`:57-62` 的依赖闭包断言随之空转、`:74-78` 的 `SRC_SCAN` 为空使 `:77-78` 退化成恒真，脚本**照样打印 `boundaries: PASS`**。对照实测（本席刚跑）：今天 9 行 `OK` ＋ `boundaries: PASS`（exit 0），其中 `OK: skill-home 依赖闭包不含 base-*（实得：无）` 与最后一条 `OK: 未迁移技能源码／模板不 import base-*（命中：无）` 分别由 `:57-62`、`:77-78` 打出；摘名后**前一条整条消失**（断言没了、连 OK 都不再打印），后一条仍在打印但已经不代表任何东西，末行还是 PASS。所以摘名之后的 PASS **不能当作验收证据**。
- 必须配套的动作（**二选一，写清选哪条、谁负责**，`t195-decisions-record.md:72` 记的也是二选一）：(a) **补一条等效断言**——摘名的同一批里，把 skill-home 单列成「只许 `base-paint/help-shell`、其余 `base-*` 仍拦」的白名单，让它不再靠空数组（`structure.md:68` 的就地摆正要求）；或 (b) **明确改由行为面门禁兜底**——源码面不再有本包断言，口径写成「本包页面产物由 `pnpm snapshot:html:check` ＋ 包内测试钉住」。两条路都要把「为什么可以」写进改动说明。本文件不替用户拍板。
- 判据三条（各写预期）：
  1. `node tooling/check-boundaries.mjs` → 预期 `boundaries: PASS`（exit 0）；若真破界，预期 `boundaries: N 处破界` ＋ 退出码 1（`:80`）。⚠️ 单看这一条**区分不出假绿**，必须与上面的配套动作同时验：选 (a) 要能看到新断言的输出行，选 (b) 要知道这一行今后不再守本包。
  2. `pnpm snapshot:html:check` → 预期逐件一致（exit 0）：居家在这份快照里是 `{ id:'home', dir:'skill-home' }`（`tooling/skill-html-snapshot.mjs:46`），键数与模板数**各 21 条钉死**（`home/keys` 恰 21 个 key、`home/templates` 恰 21 个名）。**本票 §1.4 若微改 `templates/help.html`，这条必红**：得先走 `tooling/skill-html-snapshot.mjs:374` 的 `MARKER_ALLOW` 显式放行＋审查，再 `pnpm snapshot:html`（`package.json:17`）重写快照——**不许顺手重写**。⚠️ 本席**未跑**这条（`--write` 会落盘）；且工作树里 `tooling/skill-html.snapshot.json` 与 `packages/base-render/assets/help-template.html` 今天都处于**他会话未提交**的改动中，故开工时若已红，先分清「既有红」与「本票碰红」。
  3. `node --test test/scaffold.test.mjs` → 预期 2 条 `it` 全过（exit 0）：`:6-8` 跑 `tooling/check-boundaries.mjs`、`:10-12` 跑 `tooling/write-snapshot.mjs --check`（`05:55`）。第二条锁的是 `ilife-skills`／`base-combos` 快照，**与居家无关**：它若红，先判是不是既有红（他会话正在改 combos 侧），照实记、别去改。

## 3. 回归网缺口

- 要不要同批修：**建议修**。判据：`node --test` 只跑显式给出的文件路径、不做目录发现；`scripts.test` 给的是 `../../test/scaffold.test.mjs`（`05:53`），于是包内 `test/*.test.mjs` 五件（`05:73-79`）从包目录跑一律不执行，仓根脚本才显式列了这条 glob（`05:55`）。
- 修法一句话：本票新增「落 help 文件＋回执绝对路径」，而这条支路今天只回 `{ items, total }`（`04:47`、`04:84`），没有任何回归网罩得住；修法＝把 `scripts.test` 改成显式列出包内五件（或包内 glob），并保留 `../../test/scaffold.test.mjs`；注意用例 import `dist/**`，跑之前必须先 `build`（`05:55`、`05:86`）。

## 4. 铁律五条逐条自查（原文摘录见 `04:57-61`）

- 铁律一 · 能力自治：**有疑问**。本票要碰的活（分派一支＋落 help 文件）都住技能自己的目录里，走公共层 `base-paint/help-shell` 出口即可；疑问在「落文件」这一步有没有借别家的写法，须在尺寸设计里点明。
- 铁律二 · 概念唯一：**有疑问**。HELP 的过滤规则今天有两份独立实现（`buildHelpItems` 与 `lookupHelp`，`05:46`）；本票**不建议**顺手合并——那会同时动 `views` 与 `lookup`；但「本票不合并」这句必须写进影响清单，否则口径有两个定义地这道坎一直挂着。
- 铁律三 · 改动可预告：**本票要做**。上条文件与 `package.json` 的改法见 §1；逐行对账留到第五步，那是整套纪律唯一的机械验收点（`04:69`）。
- 铁律四 · 名字取自 HELP：**待命名，暂不判合规**。方向没问题——新件住 `src/help/`（HELP 一级分组）、沿用 `help.lookup` 这一级；但**名字本身还没定**（新件叫什么、`src/help/index.ts` 加不加件，见 §1.5「改什么：待定」与 §6 第 3 条），名字未定就不能判「合规」。待名字落地后，按「讲得出它属于哪一组的哪一步」复核。铁律五 · 接口小、里面厚：**有疑问**——`src/help/index.ts` 今天只出 3 个名（`05:26`），离「不多于五个」还有余量；但「落文件」若直接挂在 `lookup.ts` 上，这层就从「速查」扩成「速查＋落文件」两件事，建议另起一件。

## 5. 必报五步走到第几步

- 第一步 · 影响清单：**本次要做**。§1 已给候选清单；待用户看过再动（`04:65`）。
- 第二步 · 结构设计：**本次要做**（本文件即本节）。树、每文件职责与导出几个、共用件被谁用，要给全（`04:66`）；本票只给到形状，未给最终文件名单。
- 第三步 · 写代码：**留待何时**——本票不写生产代码，由用户点头后的实现票做。
- 第四步 · 超线报警：**本次要做**，且是当场报。`cmd_read.ts` 741 行已超线（`04:51`）；报告话术照原文「已超线，需要根据规则进行重构。」＋为什么超＋拆法（`04:68`）。
- 第五步 · 交付对账：**留待何时**——本票只出文档，最终对账落在实现票交付时（`04:69`）。

## 6. 我定不下来的

1. `cmd_read.ts` 本票抽多少块？**已定，不再是问题：票 #195 只抽「看帮助」那一支（`home.help.lookup`）；`dispatch()` 不搬；该文件的更大范围抽件不属本图（整包按 HELP 一级分组重排另立票）；票 7 #190 只按票 4 #187 的出口口径调整调用，不承担搬分派函数的责任；票 6 #189 与这件事无关。**
2. 本票要不要顺手修开库时机（`:55-59` 对所有命令都先建目录、建库、建表，`04:45`）？**已定，不再是问题：票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。** 本票不改写 `:55-59`，只把「本票不改开库时机」这一句写进改动说明。
3. 「落文件＋回执绝对路径」放一个新文件还是并进 `lookup.ts`？新文件叫什么（铁律四要求名字取自 HELP 相应一级）。
4. `scripts.test` 改法与 `build-help.mjs` 换行修法是否都并入本票？这两件都在包内但都不属 `src/`（`04:78` 的管辖范围边界）。
5. 新件挂公共层后，`base-paint` 依赖版本号取什么（`04:21` 举的先例是 `^0.3.0`）。
6. `SKILL.md` 注入块归谁写：`gen-help-assets.mjs` 与 `scripts/build-help.mjs` 都碰 `<!-- HELP-AUTO-START -->`／`<!-- HELP-AUTO-END -->`（§1.6 协调风险）——是「注入块唯一归 `build-help.mjs`、生成器不碰」（卡路里先例），还是「两家都写、定串行顺序」？谁负责这一格也要点名。



## 四、第二步·结构设计：命名与先例一致性

（D3 结构设计子代理产出；只读 `t195-facts/06-precedents.md` 与 `t195-facts/01-skeleton-shape.md`。本文件给判定与候选，不替用户拍板。）

## 一、九域 → 目录名映射（建议值，非裁定）

「仓内既有说法」取三处：① 骨架域记录的 `key`（骨架自身就是域的唯一英文名来源，`01:10`）；② 21 条命令的命名空间键（`src/policy/wakewords.ts:6-15`；`src/help/lookup.ts:19-39`）；③ `docs/skills/skill-home/map-183-body.md:39` 已裁定「目录名取自那 9 个域，写成英文名」。

| 域 key | 建议英文目录名 | 仓内出处 | 建不建目录 |
|---|---|---|---|
| items | `items` | 域 key `items`；命令组 `home.item.*`（单数）；`src/render/templates.ts:35-38` | 建 |
| space | `space` | 域 key `space`；命令组是 `home.location.*` **不是** `home.space.*` | 建 |
| outfit | `outfit` | 域 key `outfit`；命令组 `home.outfit.pick`；`templates.ts:45` | 建 |
| stats | `stats` | 域 key `stats`；命令组 `home.stats.overview`／`.alert`；`templates.ts:47-48` | 建 |
| express | `express` | 域 key `express`；命令组是 `home.shopping.*` **不是** `home.express.*` | 建 |
| family | `family` | 域 key `family`；命令组是 `home.care.*` **不是** `home.family.*` | 建 |
| setup | `setup` | 域 key `setup`；命令组里无对应段（首次使用落在 `home.care.write`） | 建 |
| link | `link` | 域 key `link`；**但 3 条场景全 `status="deprecated"`、`cli=null`**（`01:82-84`） | **不建**（3 条已裁定留登记位、不列、不建域目录；照此判定） |
| receipt | `receipt` | 域 key `receipt`；命令组是 `home.ticket.*` **不是** `home.receipt.*` | 建 |

一条要紧的差：**9 个域 key 与命令命名空间的两套名词只有 `outfit`／`stats` 逐字对上**。`items` vs `item`（单复数）、`space` vs `location`、`express` vs `shopping`、`family` vs `care`、`receipt` vs `ticket` 五对全不同；`setup`／`link` 在命令里没有对应段。上列取域 key，是为了让目录名与 HELP 一级分组严格一一对上（`06:18`）；若改取命令名词，就与「目录名＝一级分组英文名」脱钩。

## 二、技能级落点判定：`src/help/` 违不违反铁律四

- 卡路里先例**判据原文要点**（`06:9-10`，引自 `t179-180-structure-design.md:96`）：「它不是 10 个能力里任何一件——它装的是**技能级查找入口**（唯一出口是 `calorie.help.lookup`），铁律四的『**能力目录名取自一级分组**』**管不到它**；今天住 `triggers/` 是整包按工种分目录的**存量问题**，一起留给重排那张票」。
- 同处还有两条附带事实：搬迁代价（源码 2 处、测试 2 文件、`docs/research/` 4 个证据脚本、一类文档行号全失效，`06:11`）；以及两先例在此**做法相反**（卡路里「不挪」留存量位；chef 实做是单开非能力名目录 `src/help/` 住 `src/` 第一层，只在豁免下成立，`06:66`）。
- **结论（建议，非裁定）**：`src/help/` **不违反**铁律四。判据一句话照搬——铁律四管的是**能力目录名取自 HELP 一级分组**，而 HELP 交付／查找是**技能级**东西，不属于 9 个域中任何一件，故不在该条管界内。
- 理由：① 该条不覆盖它，不是「违反了但豁免」，是**管不到**；② 居家今天已有 `src/help/index.ts`／`lookup.ts` 住在第一层（`05:26-27`），形状与 chef 一致；③ 本次不动 `triggers/` 一类按工种分的存量位，避免卡路里那条搬迁代价。
- 一句补充：判据只解决「算不算能力」，**不解决落点**——落点是另一件要裁的事（`06:75`）；本节只给「不违反」这个否定性判定。

## 三、共用件条款

按 `06:26` 的门槛条款原文写法（「谁引用（写得出哪两个能力在用）」）逐条自问：

1. 本次有没有共用件？**无共用件**。判例写死：**同一能力内部两路（或多路）复用同一件不算共用件**——共用件要写得出「哪两个**能力**在用」、且住与能力目录并列的共用位（`docs/agents/structure.md:67`、`06:74/76`）；同一能力内部复用两条路既不满足「两个能力」、也不住共用位，故不触发门槛、不需要共用件点头句（判例出处：`t195-part5-overview.md` §3 问 1 对 `helpPaths.ts`／`output.ts` 两处的改口；本票越线件先轮换到需处理的其它件，整份重排在后续票里解决）。
2. 写得出「哪两个能力在用」吗？**写不出**。今天 HELP 交付只被 `home.help.lookup` 这一个技能级**命令**用（`src/help/index.ts:1`）；其余居家的 HELP 相关东西（速查表）也是同一件事自用。
3. 现成的公共层件算不算「本次新增共用件」？**不算**：通用 help 模板的真相源在 `packages/base-render/assets/help-template.html`、出口 `base-paint/help-shell`（`map-183-body.md:36`），是**已存在的跨技能公共层**，本次只 import、不新建、不改（`t186:207-208`）。按先例，消费别人的公共层不需要过共用件门槛；**新建**一个共用位才要。
4. 若有人主张把内容资产收成公共层共用位，必须先回答这三问（`06:25`、`06:76`）：**今天是第几个用法**（今天只有 HELP 交付这一个用法，即第一个）；**放在哪个包**（公共层包 `packages/base-render`，包名 `base-paint`——目录名与包名不同，`t184:42`）；**谁来承担跨技能依赖**（即哪个技能包吃下 `base-paint` 依赖并接受边界门 `tooling/check-boundaries.mjs` 的断言改动，`t186:208`）。三问今天都只能由用户裁定，本席不预设答案。
5. 一条必须记的连带风险：只加共用件、旧引用面不改，定义就从 N 处变 N+1 处，正是铁律二禁止的（`06:27`）。故本次若真要建共用件，引用面必须同批改到位——这条也是「今天别建」的理由之一。

## 四、与两条先例的逐条一致性

| 面 | 卡路里先例 | 大厨先例 | 居家 | 同／不同一句话理由 |
|---|---|---|---|---|
| 技能级落点 | `triggers/help-lookup.ts`，判「不挪」（`06:10`） | `src/help/`（六件，`src/` 第一层） | 同大厨 | 居家 `home.help.lookup` 的出口**今天已在** `src/help/`，挪去别处要多付搬迁代价而收益为零。 |
| 落点豁免依据 | 铁律四管不到技能级查找入口 | 同一豁免（`06:66`） | 同两者 | 两先例的**判据**一致，分歧只在执行（挪／不挪），居家取「不挪」。 |
| 能力目录名 | `profile/` ← 一级分组「基础信息」（`06:16`） | 无此结构（chef 的 9 域未这样落） | 同卡路里 | 9 个域目录一律取域 key，与 HELP 一级分组一一对上；不取命令名词（见本文第 1 节）。 |
| 共用件归谁 | 包内 `src/shared/`（模板／装配件放包内，`06:24`、`06:67`） | 命名＋落盘收进公共层 `base-paint`（`06:67`） | **不涉** | 本次不新建共用件（本文第 3 节），故不落任何一家的形状。 |
| 页面模板 | 包内 `templates/` 六件被测试钉住、本次不动（`06:68`、`06:82`） | 不自持，恒在 `packages/base-render/assets/help-template.html`（`06:53`） | 同大厨 | 居家走通用 help 模板 A 路（`t186:9`），包内**不自持**页面副本。 |
| 内容资产落点 | 页面模板放包内 `templates/` | 生成资产当源码放 `src/help/sceneData.ts`（`06:68`） | 待裁 | 两先例两说不并存，居家只能选一处并接受其测试钉法（`06:82`）；见本文第 5 节。 |

一致性总判：**四同、一不同（内容资产落点）、一不涉**。不同处不是居家破例，而是两先例本就矛盾（`06:64-69` 列 4 条不一致），居家必须在票里选边。

## 五、内容资产形态候选

| 候选 | 代价一句 | 收益一句 |
|---|---|---|
| A 机器生成 `.ts`（typed const）＋ sha256 锁 | 要多养一个生成器 `scripts/gen-help-assets.mjs`（含 `--check`）与摘要锁，改内容得跑生成 | 与 chef 逐字同形（`06:78`），件头可标「禁手改」，事实源只读不可能被手改污染 |
| B 手写 typed const（无生成器） | 73 场景／91 词的抄录无机器对账，改表靠人眼，漂移无声 | 件数最少、零脚本、零摘要锁，读一件即懂全貌 |
| C `templates/*.html` 包内自持页面 | 与 A 路冲突（通用模板已在公共层），还要被包内测试钉清单（`06:68`）、并有模板漂移风险 | 页面可单独预览、不依赖公共层构建 |

**推荐 A**（结论留给用户）：理由是与大厨先例同形、且与「事实源只读＋--check 只比对不落盘」的现成护栏一致；但 A 与 C 不可并存，选 A 即意味着页面模板不自持、走 `base-paint/help-shell`。

## 六、定不下来的

1. **域 key 与命令名词不一致时取哪个**（本文第 1 节五对）：取域 key 则 `space`／`express`／`family`／`receipt` 在命令命名空间里**找不到出处**，取命令名词则目录名不再等于一级分组英文名。这条我定不下来，且它决定 6 个目录的真名。
2. **技能级落点最终住哪**：本席只判「不违反铁律四」；「住 `src/help/` 还是另立位」是落点裁定，两先例相反（`06:66`、`06:75`），须用户裁。
3. **`src/help/` 这个非能力名目录名本身要不要报备**：`structure.md` 的必报五步里「新建目录层级」这一条，指的是建 `src/help/`（已存在，不触发）还是指 9 个域目录（触发），我无法从这两份取证里判。
4. **内容资产落点：A 还是 C**（本文第 5 节）；
5. **居家包内告警线数字与数法**：chef 是 350＋LF，卡路里缺（`06:81`）；这个数字得先定并落进 `packages/skill-home/AGENTS.md`，本席无权定数。
6. **`link` 域「留登记位」的登记位具体在哪**：本节只照裁定判「不建域目录」，登记位落在哪个文件／哪个字段不在取证范围内。
7. **速查表 `.ts`（`src/help/lookup.ts`）与新建 HELP 资产的关系**：两者数据形状不同（`t185-content-reconcile.md:214`），是否合并、还是各留一份，需要票内裁定。

## 五、待用户点头的问题与编排方自决

（D6b 收敛产出；来源＝part4 的 19 条＋part3 的 9 域映射＋facts/02c 的 8 条。只收敛，不拍板。）

## 待用户点头的问题

**问题 1：HELP 的内容资产用什么形态落盘？** 候选：A 机器生成 `.ts` 常量＋摘要锁（与大厨先例逐字同形；代价：多养一个生成器脚本，改内容得跑生成）；B 手写 `.ts` 常量（件数最少、零脚本；代价：73 场景／91 词靠人眼对账，改错无声）；C 包内自持 `.html` 页面（可单独预览；代价：与公共层 help 模板冲突，还要包内测试钉清单）。**推荐 A**。**选错的代价**：选 B 则内容漂移无声、两件技能各写各的；选 C 则页面模板出现两份真相源，以后每次改模板都要改两处。**锁死什么**：包内要不要生成器与摘要锁、页面模板走公共层 `base-paint` 还是包内自持；影响票 5 #188、票 6 #189。

**问题 2：九个域的目录名取「域 key」还是「命令名词」？** 候选：A 取域 key（`items`／`space`／`outfit`／`stats`／`express`／`family`／`setup`／`receipt`，`link` 不建目录）——目录名与 HELP 一级分组严格一一对上，代价是 `space`／`express`／`family`／`receipt` 在命令命名空间里找不到同名出处；B 取命令名词（`location`／`shopping`／`care`／`ticket`）——与 `home.*` 命令对齐，代价是目录名不再等于一级分组英文名，读者要自己换算。**推荐 A**。**选错的代价**：「目录名＝HELP 一级分组」这条规矩从 6 个目录起失守，以后每次查目录都要心算一次映射。**锁死什么**：6 个目录的真名与对表方式；影响票 5 #188 的资产落点。

**问题 3：技能级 HELP 落点最终住哪？** 候选：A 留在今天的 `src/help/`（与大厨形状一致、零搬迁；代价：`src/` 第一层多一个非能力名目录，需在 `packages/skill-home/AGENTS.md` 记一句豁免理由）；B 另立位／挪回 `triggers/`（收益：目录按工种更统一；代价：源码 2 处、测试 2 文件、`docs/research/` 4 个证据脚本全要跟着动，一类文档行号全失效）。**推荐 A**。**选错的代价**：选 B 白付一轮搬迁与行号重写，而 HELP 交付是技能级东西，产出形状不变。**锁死什么**：本包目录形状与豁免记录；影响票 7 的目录级测试落点。

**问题 4：速查表 `.ts`（`src/help/lookup.ts`）与新建 HELP 资产是一份事实源还是两份？** 候选：A 各留一份（速查表管命令速查、资产管 HELP 页面；代价：同一批场景两种数据形状，改内容要动两处）；B 合成一份事实源、两边都从它读（收益：不存在两处内容漂移；代价：要先把两种形状对齐，多一次改造）。**推荐 B**。**选错的代价**：选 A 则「列出的命令」和「页面里写的场景」可能对不上，用户看到两份不一样的居家能力清单。**锁死什么**：内容资产的唯一事实源在哪；影响票 5 #188、票 6 #189。

## 编排方自决（琐碎，已定）

以下 15 条不影响目标达成，编排方按最优解自定，不需要用户花时间：

1. `base-paint` 依赖版本号取 `^0.3.0`，保留 `linkWorkspacePackages: true`（照记账先例）。
2. `scripts.test` 显式列出包内用例文件，不用通配挨个猜。
3. `build-help.mjs` 加换行探测，把「模板必须全 CRLF」这条硬门在包内当场报出。
4. 对外载荷键集不随状态变：`init_banner` 键常在，显隐只走 `hidden`。
5. 判初始化只看主库文件，不看 WAL 边车；残局误判可接受。
6. `SKILLS_DB_PATH` 未设与读失败一律 fail-open（横幅照显），绝不因此建库或建目录。
7. 横幅三条文案与 `prompt` 单源口径照 `02c` 现成值；`prompt` 只从资产初始化场景取，不另抄一份。
8. `steps` 不传，不画步骤卡（老横幅 6 步不搬）。
9. `contact` 传老居家三项、不含手机号；`recommendations` 不传（A 路不渲染，传了只多漂移面）。
10. `subtitle` 照传（`meta_blocks[0].html` 要用它）；`meta_blocks`／`recommendations` 不渲染只报现象，不擅自定调。
11. 徽章类型词必须落在**共享模板实际认的那张表**内：模板原文（`packages/base-render/assets/help-template.html:1698-1709`）是 **10 个词**——采集／查看／结果／向导／批量／校验／选择／过程／回执／录入；表外词会**静默退成「查看」蓝底**（`:1714`／`:1719`），不报错也不隐藏。**更正（2026-09-12）**：本条原先写「只用 5 个（采集／查看／选择／向导／回执）」是错的——那 5 个是**账单生成器自己更严的断言**（`packages/skill-bill/scripts/gen-wake-assets.mjs:109`），不是模板的能力边界；卡路里实际用的 3 个词（结果／回执／过程）都在 10 词表内。取证：`t188-facts-badge-types.md`。
12. 内容资产里的场景编号不带 `1-1`／`SM8-1` 老编号，`id = scenario_id` 形态由票 5 定。
13. `cmd_read.ts` 本票只抽 `home.help.lookup` 那一支，`dispatch()` 不搬：该文件的更大范围抽件不属本图（整包按 HELP 一级分组重排另立票）；票 7 #190 只按票 4 #187 的出口口径调整调用，不承担搬分派函数的责任；票 6 #189 与这件事无关。
14. 开库时机（对所有命令先建目录／建库／建表）：票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。本图不许顺手修 `:55-59`。
15. 居家包内告警线数字照大厨同一「数法」（含 LF 的空行口径、按文件而非按目录计数）重算，不照抄大厨的 350 绝对值；数法落地写进 `packages/skill-home/AGENTS.md`。

## 留给别的票

- 开库时机（`cmd_read.ts:55-59`「分派前先开库」）：票 #195 不动开库时机；口径归票 4 #187、落地归票 7 #190；本票只定形状。本图不许顺手修。
- `resolveDbPath()` 那条不建目录的只读取路径出口：票 4 #187。
- HELP 五字段取值（`title`／`contact` 三项／`version` 是否取 `2.0`／横幅文案）与 `init_banner` 显隐口径：票 6 #189。
- 内容资产入库、场景 `id` 编号形态、`types` 切分顺序与去重：票 5 #188。
- `link` 域「留登记位」的具体登记文件与字段：票 5 #188（本节出图）。
- `src/render/index.ts` 是否随三件测试同批新增：票 6 #189。
- 三件测试件的交叉票归属：模块级／出口锁归票 7，资产锁归票 5，交叉部分由两票自行对齐。

## 本票若拿到点头后的下一步

按四个答案定下资产形态、6 个目录真名、技能级落点与事实源数量，随后本票即按此收敛出待实施的改动清单，不再新增「定不下来」。

