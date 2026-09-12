## Destination

在 DSH 对 AI 说「备忘录 help」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径。文件由**已经开发好的通用 help 模板**渲染（仓内真相源 `packages/base-render/assets/help-template.html` → 出口 `base-paint/help-shell`，与卡路里／饼干记账／居家管家同一套 UI），内容是备忘录自己的（老骨架 8 域／13 二级组／30 场景，新表多出的条目补进对应域）。**UI 层不与老 HELP 逐字比对**（用户 Q1=A，照 `#183` 口径）。技能侧（`skill-memo-ilife`）与插件侧（`dsh-memo-ilife` ＋ DSH 真机装机）都要跑通，并由维护者肉眼终审「过」。两条同时达成即本图完成。

> 判定口径（2026-09-12 与用户一轮对齐定案）：**①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染（不看老 HELP 的 UI）**，外加维护者肉眼终审「过」。
>
> 用户 Q2 补充原话给出了这张图的**分量**：「之前AI重构为新技能偷工减料少了很多底层的唤醒词、命令，在完成HELP HTML后会有MAP进行开发。我们要把HELP HTML这个官方源给做完善。以后MAP才有参照」——即这份 HELP HTML 是**官方源**，是后续补齐被漏掉的唤醒词与命令的地图所依据的参照。

## 进度：35%

**画图完成（2026-09-12）**：最初 13 张子票，原生子议题边与原生阻塞边由脚本建并逐项校验；后因票 2 留的空档**新增 1 张复核票**（`#234`），现 **14 张**，面板 `closed/total = 5/14`。

**五张票收口（5/14）**——四张调查／复核 ＋ 内容与取值裁决：

- [饼干记账的 HELP 交付实现 → 备忘录照抄清单](https://github.com/FeatherHunter/ilife/issues/221)：可整块照抄三块的行号 ＋ 24 条陷阱 ＋ 提交对账；发现**出口方向相反**（备忘录今天没有库就看不了帮助）。决议 `t221-resolution.md`。
- [内容资产对账](https://github.com/FeatherHunter/ilife/issues/222)：三组数 ＋ 八条待裁（U1–U8）；量化出**老 29 个唯一唤醒词里 10 条在新表完全不可路由**。决议 `t222-resolution.md`。
- [通用 help 模板的注入契约 ＋ 备忘录专属取值](https://github.com/FeatherHunter/ilife/issues/223)：备忘录取值 8 项逐字落地；**老家的初始化判法在本机判错**。决议 `t223-resolution.md`。
- [复核：老 memo_cli.py 的 CLI 子命令全集](https://github.com/FeatherHunter/ilife/issues/234)：老侧 **21 条子命令**（两套独立计数同值、差集 0）；**U5 判「没有」**——老技能无 `stats` 子命令、无统计类场景卡，票 2 的结论不反转；漏列风险实测仅 2 条（`due`／`init-report`），均非统计类。决议 `t234-resolution.md`。
- [内容与取值裁决：老骨架对不齐的条目 ＋ 模板取值待裁项](https://github.com/FeatherHunter/ilife/issues/226) — **16 条全部定案**（决策卡 `t226-decisions.html`）。三条硬规矩由此立下：① **HELP 是完整体不是现状快照**（不标「当前无唤醒词」）② **命令不出现在页面上**（prompt 只出现唤醒词）③ **HELP 自身唤醒词不上页面**。两处非推荐项按用户裁落（`contact` 补可点链接／`editable_fields` 进）。

下一步：frontier 剩三张——[票 4 决策](https://github.com/FeatherHunter/ilife/issues/224)／[票 5 结构设计](https://github.com/FeatherHunter/ilife/issues/225)／[票 12 装机](https://github.com/FeatherHunter/ilife/issues/232)。票 7／票 8 的开工前置（票 5）只剩结构设计一道门。

## 接手须知（交新 session，2026-09-12 定稿）

**本图已定稿，用户认可，交新 session 从 frontier 开工。** 新 session 直接说 `/wayfinder #220`。

**开工前按序读这五样**（全在 `docs/skills/skill-memo-ilife/`）：

1. **本图正文**（就是这一页）——Destination 定口径、Notes 定地面真相与纪律、Decisions so far 是已走的路。
2. **四份调查报告**：`t221-bill-recipe.md`（饼干记账怎么把 HELP 交到手上 → 照抄清单）／`t222-content-reconcile.md`（老骨架 ↔ 新表对账，U 清单的出处）／`t223-template-contract.md`（模板注入契约 ＋ 备忘录取值 8 项）／`t234-cli-inventory.md`（老 CLI 21 条子命令全集）。
3. **四份决议 ＋ 一份补充裁决**：`t221-resolution.md`／`t222-resolution.md`／`t223-resolution.md`／`t226-resolution.md`／`t226-amendment.md`（U7 的最终裁定）。
4. **决策卡** `t226-decisions.html`：16 条定案，逐条带用户原话。
5. **脚本**（幂等，可重跑）：`t220-wire-edges.mjs`（拉边 ＋ 逐项校验 expected＝actual）／`fetch-map-body.mjs`（改正文前先取回，带 `## Destination` 守卫）／`chart.mjs`（建票，已拒重跑）。

**frontier 三张（阻塞全部已解除）**：

- **[票 5 结构设计](https://github.com/FeatherHunter/ilife/issues/225)** —— 必报五步第一、二步（影响清单 ＋ 结构设计 ＋ 告警线数字），**要用户点头**才关票；它一关，票 7／票 8 的开工前置就齐了。**建议先做这张**（纯 AFK 写报告，不用用户先答什么）。
- **[票 4 决策](https://github.com/FeatherHunter/ilife/issues/224)** —— 命名落盘归属 ＋ 缺省出口口径（**含「落盘目录要不要加一层 `help/`」那道题**，Notes 里写了兄弟图两条口径的冲突来龙去脉）。这张要用户亲自裁。
- **[票 12 装机](https://github.com/FeatherHunter/ilife/issues/232)** —— 纯实施、无阻塞，可最先动手；票面已带实测（客户端产物 3/3 绿、那对 frontmatter／`files` 断链点）。

**三条硬规矩（用户裁定，动手前必读）**：① HELP 是**完整体**不是现状快照，页面上不许标「当前无唤醒词」；② **命令不上页面**（prompt 只出现唤醒词，命令只住在 `SKILL.md` 的内部流程里）；③ **HELP 自身的唤醒词不上页面**（不传「怎么喊我」那块，也不当场景卡）。HELP 入口只认 1 条：`备忘录 HELP`（不分大小写）。

**并发提醒**：`#183 居家管家`／`#197 作息管家`／`#208 私家大厨` 三张兄弟图会同时动 `tooling/check-boundaries.mjs:37` 的**同一行**——本图只改 `'skill-memo-ilife'` 那一项，别碰别人的。仓库工作树里还有别的会话未提交的改动（`skill-calorie` 等）：动 build／test 前先认边界，只 `git add` 自己的文件，`pnpm test` 会顺手改写其他技能的 `SKILL.md`（跑完 `git checkout` 还原）。

**产物落点**：代码与产物落 `packages/skill-memo-ilife/`；文档落 `docs/skills/skill-memo-ilife/`；交付 HTML 落 `<SKILLS_DB_PATH>/memo_html/`。本目录的文档与脚本**已入库**（照三张兄弟图的 `docs(skill-*)` 提交惯例，只 `git add` 本目录）；后续新增文档沿用同一惯例。

## Notes

- **本图要交货**（用户 Q6=A 确有执行）：默认「只出决定、不出东西」在这里不适用——必须交出能跑的功能。
- **会话纪律**：不弹窗问，一律写在对话正文里问（`AGENTS.md` 已立规）；用户只负责扫码（2FA）。
- **用户原话**：本图一切决策的源头在文末「用户原话采访区」；执行中与采访区冲突的，以采访区为准。
- **重复检查**：仓里没有既有 map／issue 覆盖备忘录 HELP（2026-09-12 查 `wayfinder:map` 全量 22 张 ＋ 标题关键词搜索）；`memo.help.lookup` 实测 `ERR 3: 未知联动 key`；`#143`（饼干记账那张图）的 Out of scope 第一行把「备忘」明确留给后续。故本图为**新增**。
- **照抄样板**：饼干记账那张图（`#143`，8 张子票全关、维护者肉眼终审「过」）是样板；**兄弟图 `#183`（居家管家）是本图最近的先例**——同一句需求原话、同一轮 10 问、同形的子票结构。它已产出的三份调查报告是本图票 1／2／3 的**起点**，不重复劳动：
  - `docs/skills/skill-home/t184-bill-recipe.md`（22.5 KB：饼干记账 19 行逐件表 ＋ 18 条陷阱 ＋ 提交对账）
  - `docs/skills/skill-home/t185-content-reconcile.md`（＋ `t185-skeleton.json`／`t185-extract.mjs`：对账方法）
  - `docs/skills/skill-home/t186-template-contract.md`（30 KB／227 行：通用 help 模板注入契约）
- **更近的兄弟**：这条流水线已排到第 6 个技能——`#183 居家管家`／`#197 作息管家`／`#208 私家大厨` 都开着，本图是第 6 张。`#197`／`#208` 的落盘口径**比 `#183` 新**：产物落 `<SKILLS_DB_PATH>/<技能>_html/help/`（**多一层 `help/`**），用户 2026-09-12 为私家大厨明确改判过（理由：与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/`／`memo_html/`／`schedule_html/` 同形）。⚠️ 备忘录的老目录 `.db\memo_html\` **没有** `help/` 子目录——「沿用老目录」与「与兄弟同形」在备忘录这里冲突，**归票 4 裁**。
- **插件侧已实测**（省掉私家大厨那张图踩过的一颗地雷）：`node --test test/client-bundle-48.test.mjs` 里 `dsh-memo-ilife` **3/3 绿**（产物含 `__ModuleLoader__` 注册头，12883 B）——不需要像 chef 那样先把它打成 loader 工厂包。该门当前基线 **6 红全在别人家**（`dsh-home-ilife` 3、`dsh-schedule-ilife` 3，两者都没装进任何 profile），与 `#150` 的亲历事故（一处 ESM 语法错 → 所有插件注册不上 → 整个 web GUI 起不来）同源，**动插件面前先跑这道门**。
- ⚠️ **备忘录带 `#150` 在账单上实测的那对断链点**：`packages/skill-memo-ilife/SKILL.md` **无 frontmatter**（首行是 `# 备忘录（memo）SKILL`）＋ `package.json` 的 `files` **不含 `SKILL.md`**（只有 `dist` ＋ `templates/*.html`）。后果：缺 frontmatter → skills-cli「首行须 `---` 且含 `name`＋`description`，缺任一即整包跳过」→ **DSH 里根本看不到这个技能**；缺 `files` 条目 → 装上也只有 `dist`／`templates`，提供方读不到说明面 → `list` **静默返空**。归票 12。
- **告警线口径**：照最新先例（私家大厨那张图的用户答复：`350 ＋ LF 口径`），本图取 **350 ＋ LF（只数 `\n`）**，写进 `packages/skill-memo-ilife/AGENTS.md`——`structure.md` 要求这条数字**写在各包自己的地方**，不落 `docs/`。归票 5。
- **地面真相（只读）**：
  - 老技能 HELP 触发词：**9 条**（1 字面 `备忘录 HELP` ＋ 8 变体：缩字／口语／slash／`manual`／`guide`），出处老 `SKILL.md`；票 2 实测更正（原记「1＋7」）。⚠️ **但新技能只认 1 条**（用户 2026-09-12 裁定）：「<i>就 备忘录 HELP 不分大小写，其他的不需要，太复杂了</i>」⇒ 其余 8 种变体**不做**；这条**只管 HELP 自己的入口**，功能类唤醒词的补齐口径（U1／U2 备注）不变。归票 11。
  - 老侧事实源**两处**：`references/scenarios.yaml`（v1.3.0）＋ 老 `SKILL.md` 的三张表（`:1076-1174` HELP 分支／`:147-172` 口语→CLI 反向表／`:226-292` HTML 生成对照表），`:300` 另有 yaml 外的别名。**「照搬老骨架」＝这两处一起搬。**
  - ⚠️ **新表把老核心动词整体换掉了**（票 2 量化）：老 29 个唯一唤醒词里 **10 条在新表完全不可路由**，`memo.sync` 有实现却没有任何唤醒词指向它。本图不修这些缺口（见 Out of scope），但**这就是把 HELP 做成「官方源」的理由**——后续补齐那张图照这份 HELP 干。
  - **HELP 是「完整体」，不是现状快照**（用户 U1／U2／U3 备注原话）：「<i>不标出 无唤醒词可以路由。我们开发help html就是那个最终功能全部实现的完整体！</i>」「<i>我们肯定是要将新技能开发成和老技能一样支持这些功能。之前开发的新技能因为AI疏忽遗漏了大量功能。</i>」⇒ 页面上**不许**出现「当前无唤醒词可路由」这类缺失标记；缺口靠后续补齐图去补，不靠 HELP 上打补丁。
  - **命令不出现在页面上**（用户 U6 备注原话）：「<i>HELP HTML的prompt中不应该出现具体的命令硬编码，只有唤醒词，唤醒词在SKILL.md中内部流程才涉及到命令</i>」⇒ 归票 7／票 8 落。
  - **不标缺失** ＋ **命令不上页面** 这两条已并进票 7（资产）与票 8（渲染）；`contact` 按用户 V6=B **补可点链接**（非推荐项），也归票 8。
  - ⚠️ **出口方向相反**（票 1 实测）：`packages/skill-memo-ilife/src/cli/cmd_read.ts:129` 在分派前无条件 `openMemoDb`，`src/fetch/db.ts:21-29` 缺目录即抛 ⇒ **今天没有库就看不了帮助**。账单是开库之前分派（`packages/skill-bill/src/cli/cmd_read.ts:493-495`）。归票 4／票 9。
  - 老生产路：`memo_cli.py help` → `memo_render.py :: render_help()` → 读 `references/scenarios.yaml` → 注入 `公共组件/injector.py` ＋ `公共组件/assets/help_template.html` → 一次出三份（时间戳副本落 `memo_html/` ＋ **覆盖技能根 `备忘录.html`** ＋ `--output` 副本）。
  - 老内容骨架真相源：`D:\2Study\StudyNotes\SKILLS\备忘录\references\scenarios.yaml`（v1.3.0，**8 域／13 二级组／30 场景／29 个唯一唤醒词**，76 个 `editable_fields`，30 场景全带 `types`，**无** `meta_blocks`；4 处「分类下只有一个子功能 → 走『基础』兜底」）。⚠️ 老 `SKILL.md` 还带一份唤醒词总表，是否算第二事实源由票 2 判（居家那边的先例是：yaml 之外还有老路由表）。
  - ⚠️ **老实物有两代，别拿最新那份当基准**：`.db\memo_html\` 57500 B（8/10–8/12 自带壳）→ **103993／105215 B（8/13，公共组件 help 模板世代）** → 55053 B（8/20，**另一条产线**，与卡路里 9/2、9/5 的产物同壳、jaccard＝1.000）。本图只把老实物当**内容旁证**，不当视觉基准（用户 Q1=A）。
  - 通用 help 模板仓内真相源：`packages/base-render/assets/help-template.html`——它是**生成物** `src/helpShell.ts` 的源，改源必须跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红。出口：`base-paint/help-shell` 的 `renderHelpShellHtml`。**另有一套不是本图的面**：`packages/base-render/src/help.ts`（组件式 TS 渲染），别混。
  - 新仓现状：`memo.help.lookup` **不存在**（实测 `ERR 3: 未知联动 key`）；`src/help/lookup.ts` 的 `buildHelpLookup()` 只喂构建期注入 `SKILL.md` 的 28 行速查表；**没有任何 HELP 文件交付**。新技能 10 条命令（`memo.search`／`detail`／`create`／`update`／`remove`／`remind`／`wish`／`sync`／`batch`／`stats`）。
  - **真机这条路今天是断的**：`plugin-memo-ilife` 在 profile 有 Junction 回指仓库；`skill-memo-ilife` 在 profile 是 Junction 到 `.dsh-module-fallback\node_modules\skill-memo-ilife`（**拷贝**，不回指 `D:\ilife`）→ 仓库改完到不了真机。已并进票 12。
- **新代码架构规则（用户 Q4=A：照 `#183` 那四条 ＋ 本图内定告警线）**：
  1. 新增／改动的 HELP 相关件，目录名取自 **HELP 一级分组**（对备忘录＝那 8 个域）；
  2. 被碰到的旧件**就地摆正**，不顺手扩大范围；
  3. 每张写代码的票：第一步「影响清单」与第二步「结构设计」**先报用户点头**再动手；超告警线当场报「已超线，需要根据规则进行重构。」；交付时报第五步「交付对账」；
  4. **整包按 HELP 一级分组重排**不在本图内（另立票）；
  5. `skill-memo-ilife` 至今**没有**定过文件行数告警线——本图内定，写进 `docs/skills/skill-memo-ilife/`（已并进票 5）。
- **冻结名单不是禁令**（用户 Q6 补充原话「没说不允许消费base」）：`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 是 `#96` 的**现状断言**，把 `skill-memo-ilife` 移出＝更新断言，不是解禁。**本图只改 `'skill-memo-ilife'` 一项，`'skill-home'` 归 `#183`**（那张图同时在跑，同一行）。
- **用词纪律**：照 `docs/agents/wording.md`（不说「壳」，说「help 模板」；`memo.help.lookup` 这类叫「命令」，不叫「键」）。
- **文档与产出落点**（用户 Q3=A）：代码与产物落 `packages/skill-memo-ilife/`，文档落 `docs/skills/skill-memo-ilife/`（仓规 `doc-homes.md`：件名＝`packages/` 下目录名逐字），交付 HTML 落老目录 `<SKILLS_DB_PATH>/memo_html/`。老技能那条「覆盖技能根 `备忘录.html`」**不做**（`#131`／`#143` 已裁「不写固定名镜像」），老技能目录全程只读。
- **纪律**：只 `git add` 自己的文件；`pnpm test` 会顺手改写其他技能的 `SKILL.md`（已知问题，跑完 `git checkout` 还原）。

## 计划（任务清单）

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
| 1 | [调查：饼干记账的 HELP 交付实现 → 备忘录照抄清单](https://github.com/FeatherHunter/ilife/issues/221) | research | — |
| 2 | [调查：内容资产对账（老 8 域／13 组／30 场景 ↔ 新表 28 唤醒词／10 命令）](https://github.com/FeatherHunter/ilife/issues/222) | research | — |
| 3 | [调查：通用 help 模板的注入契约 ＋ 备忘录专属取值](https://github.com/FeatherHunter/ilife/issues/223) | research | — |
| 4 | [决策：命名落盘管线的归属 ＋ 缺省出口口径](https://github.com/FeatherHunter/ilife/issues/224) | grilling | [票 1](https://github.com/FeatherHunter/ilife/issues/221) |
| 5 | [结构设计：新件住哪 ＋ 文件行数告警线（必报五步第一／二步）](https://github.com/FeatherHunter/ilife/issues/225) | grilling | [票 2](https://github.com/FeatherHunter/ilife/issues/222) |
| 6 | [内容裁决：老骨架与新表对不齐的条目](https://github.com/FeatherHunter/ilife/issues/226) | grilling | [票 2](https://github.com/FeatherHunter/ilife/issues/222) |
| 7 | [内容资产入库：老骨架 → 仓内 typed const](https://github.com/FeatherHunter/ilife/issues/227) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/222) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/225) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/226) |
| 8 | [渲染接线：5 项 ＋ 三块可选内容 → 通用 help 模板](https://github.com/FeatherHunter/ilife/issues/228) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/221) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/223) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/225) |
| 9 | [出口与命名落盘：缺省＝HELP 文件，速查走显式参数](https://github.com/FeatherHunter/ilife/issues/229) | task | [票 4](https://github.com/FeatherHunter/ilife/issues/224) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/228) |
| 10 | [锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/230) | task | [票 9](https://github.com/FeatherHunter/ilife/issues/229) |
| 11 | [SKILL.md 说明面](https://github.com/FeatherHunter/ilife/issues/231) | task | [票 9](https://github.com/FeatherHunter/ilife/issues/229) |
| 12 | [插件侧最小装机（技能提供方 ＋ DSH profile；收窄 #61）](https://github.com/FeatherHunter/ilife/issues/232) | task | — |
| 13 | [真机端到端 ＋ 肉眼终审](https://github.com/FeatherHunter/ilife/issues/233) | task | [票 10](https://github.com/FeatherHunter/ilife/issues/230) ＋ [票 11](https://github.com/FeatherHunter/ilife/issues/231) ＋ [票 12](https://github.com/FeatherHunter/ilife/issues/232) |
| 14 | [复核：老 memo_cli.py 的 CLI 子命令全集（票 2 留的空档，关系到 U5 会不会反转）](https://github.com/FeatherHunter/ilife/issues/234) | research | — |

**此刻的 frontier**：[票 4 决策](https://github.com/FeatherHunter/ilife/issues/224)（命名落盘归属 ＋ 缺省出口口径）／[票 5 结构设计](https://github.com/FeatherHunter/ilife/issues/225)（新件住哪 ＋ 告警线，必报五步第一／二步）／[票 12 插件侧最小装机](https://github.com/FeatherHunter/ilife/issues/232)——三张票的阻塞全部已解除。

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [调查：通用 help 模板的注入契约 ＋ 备忘录专属取值](https://github.com/FeatherHunter/ilife/issues/223) — 走 A 路（`help-template.html` → 生成物 `helpShell.ts` → `renderHelpShellHtml`）；8 项取值逐字定位到老 `memo_render.py`（`title='使用手册'` ⇒ 新文档标题＝`备忘录 · 使用手册`／`version='1.3.0'`／`recommendations` 不传／`contact` 两项无 `url`）；老产物确**无** `meta_blocks`，`editable_fields` 是 76 条／29 场景且带三类脏数据、**不能逐字搬**；`openMemoDb` **不建库**，但**老家初始化判法在本机实测判错**（真库是目录 `<SKILLS_DB_PATH>/memo`，0 字节空壳 `memo.db` 在而目录不在）⇒ 口径改判「库目录存在」；老 `subgroups[].id` 是 **0 起**（与记账／居家 1 起不同）；另发现 `package.json` 无 `base-paint` 依赖。决议见 `docs/skills/skill-memo-ilife/t223-resolution.md`。
- [调查：饼干记账的 HELP 交付实现 → 备忘录照抄清单](https://github.com/FeatherHunter/ilife/issues/221) — 复核兄弟图报告全中；**可整块照抄三块**（`skill-bill/src/output.ts:27-39`／`:42-58`／`:72-86`）＋ 常量换 `helpPaths.ts:22`；⚠️ **出口方向相反**——`skill-memo-ilife/src/cli/cmd_read.ts:129` 无条件开库、`fetch/db.ts:21-29` 缺目录即抛 ⇒ 今天**没有库就看不了帮助**，账单是在开库之前分派（`skill-bill/src/cli/cmd_read.ts:493-495`）；两处同批必修（`check-boundaries.mjs:37` 移出名单、`skill-html-snapshot.mjs:48` 的备忘录填充器是 `fillSharedMarkers`）；老目录名与文件名主体**都不必改**。决议见 `docs/skills/skill-memo-ilife/t221-resolution.md`。
- [调查：内容资产对账](https://github.com/FeatherHunter/ilife/issues/222) — **新表把老核心动词整体换掉了**：`记备忘`／`改备忘`／`删备忘`／`备忘改分类`／`备忘录同步`／情绪族／`首次使用` 全部 `POLICY_NO_MATCH`，`memo.sync` 有实现却无唤醒词指向；老 29 个唯一唤醒词逐字命中 18／子串可路由 1／**完全不可路由 10**（新仓 test 覆盖 1/10）。三组数：老 30 场景无逐字落点 12／逐字命中 18；新表 10 条老骨架没有；骨架 8 域／13 组／30 场景／76 `editable_fields`／4 处「基础」兜底。**第二事实源判为算**（老 `SKILL.md` 三张表 ＋ `:300` 的 yaml 外别名）。HELP 触发短语实为 **9 条**（原记 1＋7，已更正）。决议见 `docs/skills/skill-memo-ilife/t222-resolution.md`。
- [复核：老 memo_cli.py 的 CLI 子命令全集](https://github.com/FeatherHunter/ilife/issues/234) — 逐行读完老 `memo_cli.py`（1816 行）：**子命令全集 21 条**（`add_parser` 21 ↔ `if cmd` 分支 21、差集 0）；双向对账**表有码无 0 条／码有表无 2 条**（`due`／`init-report`）；**U5 判「没有」**——老技能无 `stats` 子命令、无统计类场景卡（八处证据链），**票 2 的结论不反转**；**U6** 老「删 X」是**独立子命令 `delete`**（老代码里根本没有 `remove`），建议 4 条「删 X」场景整体归 `memo.remove`；⚠️ 老侧还有**第三类**——有唤醒词、有场景卡、有 CLI 却不在两张表里（Init 类「首次使用」）⇒ 建资产要「yaml ＋ 三张表 ＋ 21 条子命令」三处合起来。决议见 `docs/skills/skill-memo-ilife/t234-resolution.md`。
- [内容与取值裁决：老骨架对不齐的条目 ＋ 模板取值待裁项](https://github.com/FeatherHunter/ilife/issues/226) — **16 条定案**：U1／U2／U3 照老列全但**不标缺失**（HELP＝最终完整体）；U4 老词为主名、新词进 `aliases`；U5 都按老的来（`memo.stats` 不展）；U6 4 条「删 X」归 `memo.remove` ＋ **命令不上页面**；U7 老侧 **9 条**（地图早先少算一条）但**新技能只认 1 条**（`备忘录 HELP`，不分大小写，用户 2026-09-12 另裁）；U8 照老「基础」；V1 **不传「怎么喊我」块、HELP 自身唤醒词不上页面**；V2 照老 `'使用手册'`；V3 `1.3.0`；V4 初始化改判「库目录存在」；V5 不要逃生阀；**V6=B** `contact` 补可点链接（非推荐项）；V7 `editable_fields` **进**（清洗后）；V8 二级组 id 从 1 起。决议见 `docs/skills/skill-memo-ilife/t226-resolution.md`。

## Not yet specified

- 「速查支」的产物名与落点：老家没有这一支（老技能只有一个 HELP），卡路里给了 `卡路里_速查台_<TS>.html`、记账给了 `饼干记账_速查表_<TS>.html`；备忘录要不要分名、叫什么——等票 4 定了缺省口径才细到能出票。
- **U5 只差裁决**：事实已定（老技能无 `stats`、无统计类场景卡，票 14 八处读遍），「`memo.stats` 展不展」归票 6。
- 票 2 的 **U1／U2／U3／U4／U6** （老核心动词无落点、`memo.sync` 无词、单条改分类无词、情绪族改名、废弃提醒无场景）与票 3 的**取值 8 条**：全部归票 6，收齐后一轮 grilling 问用户。
- 票 3 交出的 **6 项取值待裁**（`meta_blocks[1]` 该不该有／`title` 要不要自带技能名／`version` 是否仍取 `1.3.0`／初始化口径重定义／`HELP_INITIALIZED` 逃生阀／`contact` 补不补）＋ 内容侧 7 项：**全部归票 6**，等它把甲、乙两组收齐后一轮 grilling 问用户。
- 老骨架里那 4 处「分类下只有一个子功能 → 走『基础』兜底」在通用模板下要不要真建二级组：等票 5／票 6。
- **落盘目录要不要加一层 `help/`**：老目录 `<SKILLS_DB_PATH>/memo_html/` 没有这一层；更近的两张兄弟图（`#197` 作息／`#208` 大厨）都改判成 `<技能>_html/help/`。沿用老目录、还是与兄弟同形——归票 4 裁（它是「命名落盘」那道题的一部分）。

## Out of scope

- 其余技能（居家管家／作息管家／私家大厨／总管／卡路里／饼干记账）的 HELP 交付：本图只做备忘录（用户 Q5=A）。
- 备忘录其余场景页（备忘录查询／初始化报告／同步报告／心愿排期／批量改分类等过程型与结果型 HTML）：本图只做 HELP（用户 Q5=A）。
- **补齐被偷工减料的唤醒词与命令**：用户已明说「完成 HELP HTML 后会有 MAP 进行开发」——本图只把 HELP 做成完善的官方源当参照，补齐另立图。
- `packages/skill-memo-ilife/src` 整包按 HELP 一级分组重排：出本图目的地（用户 Q4=A，另立票）。
- 发布态（抬版本＋发版＋真 npm 安装验证）：出本图，风险留给发版票。
- 面板／侧栏的 HELP 入口、插件里「打开文件」的动作：属 `#61` 那条线。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 需求原话（2026-09-12）

```
/wayfinder
请帮我处理一个需求（严格遵循 wayfinder 技能规则）。
仓库（已自动填入当前工作区）：https://github.com/FeatherHunter/ilife
需求描述：调查卡路里HELP HTML开发的MAP和饼干记账开发HELP HTML的MAP。要求本次任务开发备忘录的HELP HTML。深度学习之前成功的经验。不同之处在于本次开发会遵循新的代码架构规则。过程中所有文档和输出都放在skill-备忘录下面。
```

### 老技能指认（2026-09-12）

```
D:\2Study\StudyNotes\SKILLS\备忘录 是老技能
```

### 一轮对齐回答原话（Q1–Q6，2026-09-12）

```
Q1=A
Q2=A 之前AI重构为新技能偷工减料少了很多底层的唤醒词、命令，在完成HELP HTML后会有MAP进行开发。我们要把HELP HTML这个官方源给做完善。以后MAP才有参照
Q3=A
Q4=A
Q5=A
Q6=A 没说不允许消费base
默认三条：照办
```

### 补充原话（2026-09-12）

```
将你的问题和回答以清晰的形式输出到html文件中
```

