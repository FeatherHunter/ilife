## Destination

在 DSH 对 AI 说「居家管家 帮助」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径。文件由**已经开发好的通用 help 模板**渲染（仓内真相源 `packages/base-render/assets/help-template.html` → 出口 `base-paint/help-shell`，与卡路里／饼干记账同一套 UI），内容是居家管家自己的（老骨架 9 域／30 子功能／73 场景，新表多出的条目补进对应域）；**UI 层不与老居家 HELP 逐字比对**（用户 2026-09-11 裁定：通用模板已经开发好，直接用）。技能侧（`skill-home`）与插件侧（`dsh-home-ilife` ＋ DSH 真机装机）都要跑通，并由维护者肉眼终审「过」。两条同时达成即本图完成。

> 判定口径（2026-09-11 与用户一轮对齐定案）：**①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染（不看老 HELP 的 UI）**，外加维护者肉眼终审「过」。

## 进度：20%

**画图完成（2026-09-11）**：本图 11 张子票已建、原生子议题边与原生阻塞边已建并逐项校验（expected＝actual）。

**票 1 已关（2026-09-11）**：饼干记账的 HELP 交付实现逐件读懂，报告落 `docs/skills/skill-home/t184-bill-recipe.md`（19 行逐件表／18 条照抄陷阱）；三条硬事实已分别并进票 6（边界名单要移出 `skill-home`）、票 7（看帮助不许把库建出来）、票 9（注入块保检出换行）。

下一步：等票 2／票 3 的报告（票 2 第一次派单的子代理跑到上下文用尽，已按「脚本抽取＋分节落盘」重派）；这两张回来后动票 4（决策）；同时票 10（插件侧最小装机）无阻塞，可直接开工。

## Notes

- **本图要交货**（用户 Q6）：默认「只出决定、不出东西」在这里不适用——必须交出能跑的功能（「携带执行」＝不只出决定，还要交出能跑的东西）。
- **会话纪律**：不弹窗问，一律写在对话正文里问（`AGENTS.md` 已立规）。
- **用户原话**：本图一切决策的源头在文末「用户原话采访区」；执行中与采访区冲突的，以采访区为准。
- **重复检查**：#58（home 复制样板线）覆盖桥／面板／frontmatter／技能提供方＋双路证据，**不含 HELP 文件交付**；仓里没有既有 map／issue 覆盖本需求（2026-09-11 查 `wayfinder:map` 全量与关键词搜索），故本图为**新增**。
- **照抄样板**：饼干记账那张地图（#143，8 张子票全关）是本图的样板；「饼干记账到底怎么做的」本身就是票 1。
- **地面真相（只读）**：
  - 老技能 HELP 触发词只有一条：`居家管家 帮助`（老家 `SKILL.md` frontmatter 的 `help_wake_word`）。
  - 老生产路：`python3 scripts/home_manager.py help` → `scripts/help_center.py` 读 `references/scenarios.yaml` → `templates/help_center.html` → `<根>/home_manager_html/居家管家_HELP_<YYYYMMDD>_<HHMMSS>.html`；技能根 `居家管家.html` 是「最新版 HELP 的精确副本」（老家 SKILL.md 立规，`tests/test_manual_sync.py` 用 SHA256 钉住）。
  - 老内容骨架真相源：`D:\2Study\StudyNotes\SKILLS\居家管家\references\scenarios.yaml`（**9 域／30 子功能／73 场景**；域已有英文名 items／space／outfit／stats／express／receipt／family／setup／link）。
  - ⚠️ 老实物两份、内容不同：技能根 `D:\2Study\StudyNotes\SKILLS\居家管家\居家管家.html`（84,577 B，**73 场景**，快照时间戳）比 `D:\2Study\StudyNotes\.db\home_manager_html\居家管家_HELP_20260811_102414.html`（75,514 B，**59 场景**）新。本图只把它当**内容旁证**，不当视觉基准（用户 Q2／Q3）。
  - 通用 help 模板的仓内真相源：`packages/base-render/assets/help-template.html`——它是**生成物** `src/helpShell.ts` 的源，改源必须跑 `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红。出口：`base-paint@0.3.0` 的 `./help-shell`（`renderHelpShellHtml`）。
  - 新仓现状：`home.help.lookup` 只回一份速查列表（`packages/skill-home/src/help/lookup.ts` ＋ `src/cli/cmd_read.ts` 的分派），**没有任何 HELP 文件交付**；新表 91 条唤醒词／21 条命令，其中 3 条带 `(HTML)`。
- **新代码架构规则（用户 Q8=(a)）**：`docs/agents/structure.md` 的五条铁律＋必报五步。本图的落地尺度：
  1. 新增／改动的 HELP 相关件，目录名取自 **HELP 一级分组**（对居家＝那 9 个域，写成英文名；先例见 `docs/skills/skill-calorie/t179-180-structure-design.md`）；
  2. 被碰到的旧件**就地摆正**，不顺手扩大范围；
  3. 每张写代码的票：第一步「影响清单」与第二步「结构设计」**先报用户点头**再动手；超告警线当场报「已超线，需要根据规则进行重构。」；交付时报第五步「交付对账」；
  4. **整包按 HELP 一级分组重排**不在本图内（另立票）。
- **用词纪律**：写正文与文档一律照 `docs/agents/wording.md`（不说「壳」，说「help 模板」；`home.help.lookup` 这类叫「命令」，不叫「键」）。
- **纪律**：只 `git add` 自己的文件；`pnpm test` 会顺手改写其他技能的 `SKILL.md`（已知问题，跑完 `git checkout` 还原）。
- **文档与产出落点**（用户 Q9=(a)）：代码与产物落 `packages/skill-home/`，文档落 `docs/skills/skill-home/`。

## 计划（任务清单）

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
| 1 | [调查：饼干记账的 HELP 交付实现逐件读懂 → 居家照抄清单](https://github.com/FeatherHunter/ilife/issues/184) | research | — |
| 2 | [调查：内容资产对账（老 9 域／30 组／73 场景 ↔ 新表 91 条唤醒词／21 条命令）](https://github.com/FeatherHunter/ilife/issues/185) | research | — |
| 3 | [调查：通用 help 模板的注入契约＋居家专属取值](https://github.com/FeatherHunter/ilife/issues/186) | research | — |
| 4 | [决策：命名落盘管线的归属＋缺省出口口径](https://github.com/FeatherHunter/ilife/issues/187) | grilling | [票 1](https://github.com/FeatherHunter/ilife/issues/184) |
| 5 | [内容资产入库：老骨架 → 仓内 typed const](https://github.com/FeatherHunter/ilife/issues/188) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/185) |
| 6 | [渲染接线：5 项＋三块可选内容 → 通用 help 模板](https://github.com/FeatherHunter/ilife/issues/189) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/184) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/186) |
| 7 | [出口与命名落盘：缺省＝HELP 文件，速查走显式参数](https://github.com/FeatherHunter/ilife/issues/190) | task | [票 4](https://github.com/FeatherHunter/ilife/issues/187) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/189) |
| 8 | [锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/191) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/190) |
| 9 | [SKILL.md 说明面](https://github.com/FeatherHunter/ilife/issues/192) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/190) |
| 10 | [插件侧最小装机（技能提供方＋DSH profile；收窄 #58）](https://github.com/FeatherHunter/ilife/issues/193) | task | — |
| 11 | [真机端到端＋肉眼终审](https://github.com/FeatherHunter/ilife/issues/194) | task | [票 8](https://github.com/FeatherHunter/ilife/issues/191) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/192) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/193) |

**此刻的 frontier**：[票 2](https://github.com/FeatherHunter/ilife/issues/185)／[票 3](https://github.com/FeatherHunter/ilife/issues/186)（调查票，research 子代理在跑）＋ [票 10](https://github.com/FeatherHunter/ilife/issues/193)（插件侧最小装机）。

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [调查：饼干记账的 HELP 交付实现逐件读懂 → 居家照抄清单](https://github.com/FeatherHunter/ilife/issues/184) — 报告 `docs/skills/skill-home/t184-bill-recipe.md`：19 行逐件表判出「照抄 `output.ts`／`helpPaths.ts`／`helpFile.ts` 三件，不抄卡路里的命令名映射与转发件」；两处生成物禁手改（`base-render/src/helpShell.ts`、bill 的 `wake-assets.ts`）；三条会改下游票的硬事实——`tooling/check-boundaries.mjs:37` 名单含 `skill-home`（import `base-paint` 就 FAIL）、`cmd_read.ts:54-56` 的 `dispatch` 第一行就开库（看帮助会建库）、`scripts/build-help.mjs:28` 不保检出换行。

## Not yet specified

- 「速查支」的产物名与落点：老家没有这一支（老技能只有一个 HELP），卡路里给了 `卡路里_速查台_<TS>.html`、记账给了 `饼干记账_速查表_<TS>.html`；居家要不要分名、叫什么——等票 4 定了缺省口径才细到能出票。
- 那 3 条带 `(HTML)` 的唤醒词（查物品(HTML)／看物品(HTML)／统物品(HTML)）与废弃词（记到记账／记到卡路里／联动总览）在 HELP 里的去留——等票 2 的对账表回来才说得准。
- 首次使用横幅（`init_banner`）的显隐口径：老家是「DB 文件存在＝已初始化」；新仓要不要照搬、要不要「跑完不建库」——等票 3 的取值调查回来。

## Out of scope

- 其余 5 个技能（备忘／作息／大厨／总管／卡路里）的 HELP 交付：本图只做居家管家（用户 Q5）。
- 居家管家其余场景页（过程型／结果型 HTML）与图形页：本图只做 HELP（用户 Q5）。
- `packages/skill-home/src` 整包按 HELP 一级分组重排：出本图目的地（用户 Q8=(a)，另立票）。
- 发布态（抬版本＋发版＋真 npm 安装验证）：出本图，风险留给发版票。
- 面板／侧栏的 HELP 入口、插件里「打开文件」的动作：属 #58 那条线。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 需求原话（2026-09-11）

```
/wayfinder
请帮我处理一个需求（严格遵循 wayfinder 技能规则）。
仓库（已自动填入当前工作区）：https://github.com/FeatherHunter/ilife
需求描述：调查卡路里HELP HTML开发的MAP和饼干记账开发HELP HTML的MAP。要求本次任务开发居家管家的HELP HTML。深度学习之前成功的经验。不同之处在于本次开发会遵循新的代码架构规则。过程中所有文档和输出都放在skill-居家管家下面。
```

```
D:\2Study\StudyNotes\SKILLS\居家管家 这是原项目
```

### 一轮对齐回答原话（Q1–Q10，2026-09-11）

```
Q1 认可
Q2 饼干记账和卡路里已经把通用模板开发好了，直接用就行了，UI层面不需要看老help了。学习下饼干记账是怎么做的。调查下
Q3 同上
Q4 照 #143：老骨架为准、新表多出的补进对应域
Q5 只做居家管家和HELP HTML
6 有执行
7 认可
8 (a)＋必报五步全走
9 a
Q10 多派research subagent调查你的设计才会更加科学合理
```
