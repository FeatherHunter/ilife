# t195 第六节 · 总览：目录树定稿 ＋ 票面四问（居家「居家管家 帮助」）
依据：只读 part1＝`t195-part1-new-files.md`、part2＝`t195-part2-existing-and-gates.md`；本件只给形状与判据，不写生产代码。

> 更正（2026-09-12）：新 HELP 件落点统一收进 src/help/；账单 output.ts 已是薄封装（递补在共用件）。依据 t187-decision.md 第四节。

件数（2026-09-12 更正后重算）：新增 **8 件**＝`src/help/helpPaths.ts`、`src/help/helpFile.ts`、`src/help/output.ts`、`src/help/helpAssets.ts`（内容资产生成物，事实源 `src/help/scenarios.yaml` 已入库）、`scripts/gen-help-assets.mjs`、`test/help-delivery-*.test.mjs`、`test/help-exit-*.test.mjs`、`test/help-assets.test.mjs`／改动 **7 件**（`package.json`／`SKILL.md`／`build-help.mjs`／`help.html`／`src/index.ts`／`src/help/index.ts`／`cmd_read.ts`）＋仓根 `tooling/check-boundaries.mjs` 1 件。**`src/render/index.ts` 不在册**（不动，见 §2 裁定 1）；原 `src/render/helpPaths.ts`／`src/render/helpFile.ts`／`src/output.ts`／`src/help/<名>.ts` 四条已并为 `src/help/` 内三条。

## 1. 目录树定稿（`packages/skill-home/`）
```
package.json / SKILL.md  [改动] 加 base-paint 依赖、补「HELP 交付」节（part1 §1末、part2 §1.2）
scripts/build-help.mjs   [改动] 注入块换行探测（part2 §1.3）
scripts/gen-help-assets.mjs  [新增] 生成内容资产，含 --check（part1 §1）
templates/help.html      [改动] 只微改、不搬走（part2 §1.4）
src/index.ts             [改动] 随 help/index.ts 一行转发（part2 §1.5）
src/help/ ← 既有目录，本票新 HELP 件**全部**落位所在：index.ts [改动·加一行转发]／lookup.ts [不动·保持 HelpHit、lookupHelp 形状]（part2 §1.5）／helpPaths.ts [新增·只有落点值，零 IO]／helpFile.ts [新增·全量 HELP JSON → 全页 HTML]／output.ts [新增·薄封装落盘 deliverHtml，递补在共用件]／helpAssets.ts [新增·内容资产生成物，禁手改词]（part1 §1、§4.2）／scenarios.yaml [既有·事实源，已入库，不动]
src/render/ ← 既有目录，已有 6 件：index.ts／errors.ts／envelope.ts／html.ts／templates.ts／views.ts（见 §2）——**一行不动**：新 HELP 件收进 `src/help/` 后不再碰这个既有 barrel（§2 裁定 1）
src/cli/cmd_read.ts      [改动] 只挪 home.help.lookup 一支（part2 §1.1）
test/ 新增 help-delivery-*／help-exit-*／help-assets 三件（part1 §1）；既有五件 cli／render／fetch／policy／skill（改动风险，part2 §1.1、§1.4）
tooling/check-boundaries.mjs [改动] 仓根件，skill-home 移出 SKILLS_BASE_FROZEN（part2 §2）
```

## 2. 撞名／撞目录核对（实地列盘上路径；**1 处真冲突**）
1. **`src/render/index.ts` 不再被动**（2026-09-12 更正）：part1 §1 曾列「新增」、原裁「按改动办」；t187-decision.md 第四节裁「新 HELP 件全部收进 `src/help/`」后，`helpPaths.ts`／`helpFile.ts` 改住 `src/help/`，这个既有 barrel（7 条 export 语句，实测名单：`HomeRenderError`／envelope **4 名**＝`HOME_KEY_SHAPES`／`homeShapeFor`／`buildHomeEnvelope`／`parseHomeEnvelope`／views 14 函数＋类型 `ItemCard`／`HelpItem`／html 10 名／templates 3 名 `HOME_TEMPLATES`／`templateFor`／`loadTemplate`＋类型 `HomeTemplate`）**一行不动**——落点分散才会撞名，收进 `src/help/` 后既不用加行、也不必冒 `export *` 重名静默丢名的风险；原「新增」行按删除办。
2. **`src/render/errors.ts` 真冲突**：part1 §1 以「仅当居家还没有同类错误件」为条件列新增，盘上已存在 `class HomeRenderError extends Error`。裁定：**条件不成立**，该条按新增划线应删；是否加渲染期分支或另起错误名留给票 6。
3. 同名不同目录不裁冲突、点名防写混：`src/help/index.ts` 与 `src/render/index.ts` 两个 barrel 互不覆盖。提示：`gen-help-assets.mjs`（新增）与 `build-help.mjs`（改动）都碰 `SKILL.md` 注入块，边界面要写清。
4. 无冲突：测试三件与既有五件不重名；`src/help/helpPaths.ts`／`src/help/helpFile.ts`／`src/help/output.ts`／`src/help/helpAssets.ts` 盘上均无；`src/help/`、`src/render/` 目录都已存在（`src/help/scenarios.yaml` 已入库）→新增件**全部**在既有 `src/help/` 内加文件、不建新目录，`src/render/` 一件不加。

## 3. 票面四问逐条作答
**问 1 · 新增哪些目录／文件、各给什么、有无共用件**
- 目录：新 HELP 件**全部**住 `src/help/`（既有目录，不建新目录，`src/render/` 一件不加；事实源 `src/help/scenarios.yaml` 已入库）。对外：`helpPaths.ts` **2 个常量**＝`HELP_HTML_DIR_NAME`（`home_manager_html`）＋`LOOKUP_FILE_STEM`（`居家管家_速查表`，票 4 #187 裁决）（part1 §1、§2 第 1 行）；`helpFile.ts` **21 个**＝6 常量＋8 接口＋7 函数（part1 §2 第 3 行）；`output.ts` **3 个**＝`deliverHtml`＋两再导出类型（薄封装，递补在共用件）；`src/render/index.ts` **不动、不加行**（§2 裁定 1）。
- **同能力内部复用两处，不是规则里的共用件**：`helpPaths.ts` 被同包 `helpFile.ts` 与 `output.ts` 用（落点值唯一处）；`output.ts` 被 `home.help.lookup` 的「速查」与「落 help 文件」两路用（薄封装签名逐字照 bill，part1 §2 第 2 行）。判据：`docs/agents/structure.md:67` 的共用件要「写得出**哪两个能力**在用」、且住与能力目录并列的共用位（`t195-facts/06-precedents.md:74/76`）；上述两处都在**同一能力内部**两路复用，既不满足「两个能力」、也不住共用位，两个触发条件（新建目录层级／碰三个以上能力）均不成立（`t195-facts/06-precedents.md:76`）→ **本票不新建共用件，无需共用件点头句**。

**问 2 · HELP 交付算不算一个「能力」；`src/help/` 违不违反铁律四**
- 算：它有自己的命令 `home.help.lookup`、自己的失败态（exit 5）与回执（绝对路径），对外可交付，不是内部工具函数。不违反：铁律四管的是「目录名与接口名取自 HELP 的一级／下一级」（part2 §4），`src/help/` 取的正是 HELP 一级分组，part2 §4 已判「合规（待命名结论）」，本件沿用。但「算能力」≠另立包：包仍是 `skill-home` 一个，不新增 `packages/skill-*`。

**问 3 · 被碰到的旧件怎么就地摆正；`cmd_read.ts` 要不要顺手抽件**
- 摆正四处：`cmd_read.ts` 只挪 `home.help.lookup` 一支、`scripts.test` 覆盖包内用例、`build-help.mjs` 换行探测、`help.html` 只微改不搬走（part2 §1.1–§1.4）。
- 抽件：**建议只抽这一块**——`cmd_read.ts` **741 行**（本地实测、UTF-8 真实行数，数法：`[System.IO.File]::ReadAllLines($p,[Text.Encoding]::UTF8).Count`＝741；旁证 `(Get-Content -LiteralPath $p -Encoding UTF8).Count`＝741、按 LF 数 741 个、CRLF 0，三者一致），超线 **391 行**（741−350，约 2.1 倍，part2 §1.1）；抽走该支（约 5 行）后仍在告警线上，故第四步当场报超线；抽整份（连 `dispatch()`）另立票。影响面小：零导出（part2 §1.1），只牵 `test/cli.test.mjs` 黑盒 spawn；且**不动 `:55-59` 开库时机**，否则替票 6／票 7 定口径。

**问 4 · 每件归哪张票；包内 `test` 脚本盖不到新用例要不要同批修**
- 归票：`helpPaths.ts`→票 7 #190；`helpFile.ts`→票 6 #189；`output.ts`→票 7 #190；生成器＋内容资产（`helpAssets.ts`）＋资产锁→票 5 #188（part1 §1 逐行给）。**「仅帮助件交叉待定」已消**：原 `src/help/<名>.ts` 就是 `src/help/output.ts`（归票 7 #190）；`src/render/index.ts` 不再在册（§2 裁定 1，不动）。**测试三件归属已写死**（照 part1 §1）：`test/help-delivery-*.test.mjs`→**票 7 #190**；`test/help-exit-*.test.mjs`→**票 7 #190**；`test/help-assets.test.mjs`→**票 5 #188**。
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
