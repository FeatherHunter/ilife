# t195 · 票 #195 结构设计「总览节」对抗式审查（审查员 A）
对象：`docs/skills/skill-home/t195-part5-overview.md`（59 行）。只读复核，未改任何文件、未 git add／commit。

**裁决：整改后通过（75/100）**。四问逐条有答案、目录树可执行、两处撞名裁定方向正确；但有 3 处可核事实错（过时行数、告警线归属、barrel 出口名单）、1 处断言超范围（「不建新目录」）、1 处用词错（「共用件」）。

## 一、撞名／撞目录逐条实测（最重要项）
实测：`Test-Path` 逐条 ＋ `Get-ChildItem packages/skill-home/src -Directory/-File`。§1 树 18 条路径，判定逐条对：
- **判「改动」／「不动」的 10 条全部 EXIST ✓**：`package.json`、`SKILL.md`、`scripts/build-help.mjs`、`templates/help.html`、`src/index.ts`、`src/help/index.ts`、`src/help/lookup.ts`（不动）、`src/render/index.ts`、`src/cli/cmd_read.ts`、`tooling/check-boundaries.mjs`。
- **判「新增」的 4 条全部 ABSENT ✓**：`scripts/gen-help-assets.mjs`、`src/render/helpPaths.ts`、`src/render/helpFile.ts`、`src/output.ts`（盘上无 → 「唯一落盘点」不撞名）。
- **判「既有目录」的 3 条 ✓**：`src/help/`（2 件：index.ts／lookup.ts）、`src/render/`（6 件）、`test/`（五件 cli／fetch／policy／render／skill，与新增三件不重名 ✓）。
- §2 两处真冲突实测成立：`src/render/index.ts`、`src/render/errors.ts` 均在盘上 → 「按改动办」「条件不成立」两条裁定正确；§1:19「skill-home 移出 SKILLS_BASE_FROZEN」与 `tooling/check-boundaries.mjs:55`（`SKILLS_BASE_FROZEN = ['skill-home']`）对得上。
- 已存在件描述核对：`src/render/errors.ts:2` 确为 `export class HomeRenderError extends Error` ✓；`src/help/index.ts:1-2` 只出 `buildHelpLookup`／`lookupHelp`／`HelpItem` ✓；`src/output.ts` 先例 3 件（`skill-bill/src/output.ts:27/31/41`＝`HtmlDelivery`／`HtmlLanding`／`deliverHtml`）✓，part5「3 个」对。
- **唯一无法实测项**：内容资产生成物「居家路径待定」（§1:17）→ 见缺陷 3。

## 二、缺陷清单（逐条给文件:行号）
1. **过时行数**：`t195-part5-overview.md:38`、`:46` 写 `cmd_read.ts` 741 行、超线 391 行。实测今天 **735 行**（`(Get-Content …).Count`＝735；按 LF 切为 736 元素含尾空，即 LF 数 735，CRLF 0）。超线应为 385。741 出自 `t195-facts/04-constraints.md:49`，而该件 `:82` 自己写「取数须以开工时实测为准」，第四步又要求「当场报」，照抄旧数不合判据。
2. **告警线归属不实**：`:46` 直书「告警线 350 行」。`docs/agents/structure.md:70` 明写数字「由各包自己定，写在各包自己的地方」；实测 `packages/skill-home/AGENTS.md` **不存在**，包内无该数字（`04-constraints.md:83` 同判）。350 是兄弟包先例，须写成「沿用兄弟包先例 350（本包尚未落数字）」。
3. **断言超范围**：`:26`、`:30` 断「新增件全是既有目录内加文件／一个新目录都不建」，覆盖不到 `:17` 的「内容资产生成物（居家路径待定）」；且 `:45` 把第二步标成「已完成（闭环）」，树里仍挂未定节点，不符 `structure.md:85` 报全目录树的要求。
4. **barrel 出口名单错**：`:23` 写「7 行 export：…envelope 三名…」。7 条 export 语句数对，但 `src/render/index.ts:2` 的 envelope 是 **4 名**（`HOME_KEY_SHAPES`／`homeShapeFor`／`buildHomeEnvelope`／`parseHomeEnvelope`）；该 barrel 另有 `views.ts` 14 函数（`:4-6`）、`html.ts` 10 名（`:10-12`）、`templateFor`／`loadTemplate`（`:13`）。裁定 1 方向不受影响，名单与「三名」须改。
5. **既有件列举不实**：`:14` 写 `src/render/`「已有 index.ts／errors.ts」，实测 6 件（另有 `envelope.ts`／`html.ts`／`templates.ts`／`views.ts`）。以「已有件」为判据的撞名核对，漏列即有漏判风险。
6. **件数账不平**：`:4` 写「新增 8 件」，括号内只列 7 组（helpPaths／helpFile／output／`src/help/<名>.ts`／内容资产／生成器／测试三件计 1 组），也扣不上 §2 删掉 errors.ts 后的名单；同句「改动 8 件」逐条数得 8 ✓。
7. **归票自相矛盾**：`:41` 把「测试三件交叉归属」列待定，而 `t195-part1-new-files.md:15-16` 已把 `help-delivery-*`／`help-exit-*` 归票 7 #190。应改成「两件归票 7、资产锁归票 5，仅帮助件交叉待定」。
8. **隐藏坑未评**：`:25` 只写两个 barrel「互不覆盖」。但 `src/index.ts:4-5` 用 `export *` 同时转发 render 与 help 两个 barrel；票 6 往 render barrel 加行时若新导出名与 help barrel 撞名，ESM 歧义会让该名**静默**从包对外出口消失。这条须进票 6 的验收集合。
9. **命名形不一致**：同一未定件三种写法——`:13` `help<名>.ts`、`:30`／`:54` `src/help/<名>.ts`。汇总给用户前须统一。

## 三、共用件条款裁决（已知矛盾）
- 判据：`docs/agents/structure.md:85` 要求报「共用件**被哪两个能力**用」；`t195-facts/06-precedents.md:76` 写「建共用件前必须写得出『哪两个能力在用』，并核对两个触发条件（新建目录层级／碰三个以上能力）」；`:74` 共用件要与**能力**目录并列（`src/shared/`），不许塞进按工种分的旧目录。
- **结论：part3 的读法符合判据**（`t195-part3-naming-and-precedents.md:35`「无共用件」、`:36`「写不出哪两个能力」）。part5 `:31` 的两条「共用件」都是**同一能力内部**的复用（helpPaths 被同包 helpFile／output 用；output 被 `home.help.lookup` 的速查与落文件两路用），既不满足「两个能力」，也不住 `src/shared/`，两个触发条件均不成立 → 不是规则里的共用件，不触发门槛、不需要共用件点头句。
- **改法：改口的是 part5**。`t195-part5-overview.md:31` 把「共用件两处」改成「同能力内部复用两处（不是规则里的共用件；本票不新建共用件，两触发条件均不成立，无需共用件点头句）」，并在问 1 答案里去掉「共用件」口径（问 1 问的就是这个）。part3 不必改口；求稳可在 `t195-part3-naming-and-precedents.md:35` 后加半句「同一能力内部两路共用一件不算共用件」，把判例写死。

## 四、票面四问与必报五步
`gh issue view 195 --repo FeatherHunter/ilife --json body` 取 Question 段：四问四答齐 ✓；问 4 的「票 5 资产／票 6 渲染／票 7 出口」与 `t195-part1-new-files.md:9-12`、`:15-18` 逐条对得上 ✓（helpPaths→票 7、helpFile→票 6、render/index→票 6、output→票 7）。
扣分只在：问 1 的「共用件」用错词、件数账不平；问 3 的 741；问 4 的测试归票自相矛盾。五步标注核对 `structure.md:76-103` 与票 195「产出」段：本票产出＝第一步影响清单＋第二步结构设计 ✓，`:45` 标注「已完成」应与 `structure.md:78`「用户看过再动」对齐为「已产出，待用户点头」。

## 五、必须整改项（改完才可汇总给用户）
1. `:38`／`:46` 行数改实测 735（超 385），注明「本地实测、LF 口径」。
2. `:46` 350 加「兄弟包先例、本包未落数字」限定；补前置项：先定本包告警线数字并落 `packages/skill-home/AGENTS.md`（`06-precedents.md:81`）。
3. `:31`「共用件」改「同能力内部复用」；`:41` 测试三件归票照 `part1:15-16` 写死。
4. `:26`／`:30`「不建新目录」加条件（资产路径定了才算）；`:45` 第二步改「已产出，闭环待资产路径定」。
5. `:23` barrel 名单补全且 envelope 改四名；`:14` 补 `src/render/` 另四件；`:4` 件数账对平；`:13`／`:30`／`:54` 文件名写法统一。
6. `:25` 补 `src/index.ts:4-5` `export *` 撞名歧义一句，交票 6 验证。

## 六、打分（满分 100）
| 轴 | 分 | 依据 |
| --- | --- | --- |
| A 目标达成 30 | 25 | 四问齐、目录树可执行、两处撞名裁定对；扣件数账不平、闭环声明越界、测试归票矛盾 |
| B 事实与证据 30 | 21 | 18 条路径分类实测全对；扣 741 过时、350 归属不实、barrel 名单错、render 既有件漏列 |
| C 纪律合规 20 | 15 | 第四步话术照原文、未替用户拍板（§5 十项待定）；扣 350 冒充本包规矩、前两步标「已完成」越过点头门 |
| D 风险与缺口 20 | 14 | 待定项列得全；扣「共用件」用词致问 1 答偏、资产路径未定下的新目录风险未评、`export *` 歧义坑未评 |
| **合计** | **75** | **整改后通过** |
