## Destination

在 DSH 对 AI 说「居家管家 帮助」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径。文件由**已经开发好的通用 help 模板**渲染（仓内真相源 `packages/base-render/assets/help-template.html` → 出口 `base-paint/help-shell`，与卡路里／饼干记账同一套 UI），内容是居家管家自己的（老骨架 9 域／30 子功能／73 场景，新表多出的条目补进对应域）；**UI 层不与老居家 HELP 逐字比对**（用户 2026-09-11 裁定：通用模板已经开发好，直接用）。技能侧（`skill-home`）与插件侧（`dsh-home-ilife` ＋ DSH 真机装机）都要跑通，并由维护者肉眼终审「过」。两条同时达成即本图完成。

> 判定口径（2026-09-11 与用户一轮对齐定案）：**①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染（不看老 HELP 的 UI）**，外加维护者肉眼终审「过」。

## 进度：100%

**口径**：分母＝13 张子票（画图本身不计入分子）；**13 张全关**（票 1／2／3 调查 ×3 ＋ 票 13 内容裁决 ＋ 票 10 插件侧最小安装 ＋ 票 12 结构设计 ＋ 票 4 命名落盘与缺省口径 ＋ 票 5 内容资产入库 ＋ 票 6 渲染接线 ＋ 票 7 出口与命名落盘 ＋ 票 8 CLI 级交付锁 ＋ 票 9 `SKILL.md` 说明面 ＋ **票 11 真机端到端＋肉眼终审**）。终点两条判据＋维护者肉眼终审「过」**全部达成，本图收口**。

**画图完成（2026-09-11）**：13 张子票 ＋ 原生边（子议题边与阻塞边）逐项校验通过。

**六张票已关**：票 1（照抄清单）、票 3（模板契约）、票 2（内容对账）三张调查票，票 13（内容裁决，五条全部拿到用户答复），票 10（插件侧最小安装），票 12（结构设计，四条决策拿到用户答复）。

- 票 1：报告 `docs/skills/skill-home/t184-bill-recipe.md`。三条硬事实已并进票 6／票 7／票 9。
- 票 3：报告 `t186-template-contract.md`。走 **A 路＝老实物 help 模板**；`subtitle`／`meta_blocks` 不渲染但照传；`init_banner` 判法＝DB 文件存在且**不建库**；取值表已写进票 6。
- 票 2：报告 `t185-content-reconcile.md` ＋ 骨架 `t185-skeleton.json`。老 73 场景里 3 条无落点（全在 link），新表要补进 20 条（17 条在老路由表里有出处）；**唤醒词事实源是 `scenarios.yaml` ＋ 老路由表两份**。
- 票 13：五条裁完并写进票 5／票 6 票面——推位置／找位置留在「位置管理」卡；看标签不独立成卡；3 条 `(HTML)` 不进清单；主数用 73 场景；联动 3 条留登记位、不列、不建目录，**将来的联动设计出本图走 combos 相关票**。计数口径也已确认：**副标题按实际列出派生（70）**，口径区写一行「骨架 73 条，联动 3 条已停用不列」（已写进票 6 票面）。
- 票 10（[插件侧最小安装](https://github.com/FeatherHunter/ilife/issues/193)，2026-09-12 关，本图第一张实施票）：四件做完——技能提供方＋宿主接线、客户端产物缺陷（`dist/client.js` 837 B 裸 ESM → 3541 B loader 工厂包，门禁 21/0）、`skill-home` 两处断链（`files` 补 `SKILL.md`、补扁平 frontmatter）、profile 装到 agent 读得到的位置（可回滚）。**两名独立对抗审查 88/100 通过、77/100 整改后通过**；整改落实了两条真质量缺口：新增用例原本**不在任何门里**（现已接进 `test`，本包 9/9）、「他错重抛」原本**零锁**（已补并做反例自证：改成吞错 14/2 红、改回 16/0 绿）。**未重启 DSH**（用户正在用当前 GUI），重启后复验归票 11。
- 票 12（[结构设计](https://github.com/FeatherHunter/ilife/issues/195)，2026-09-12 关）：形状定稿 `t195-structure-design.md` ＋ 决策记录 `t195-decisions-record.md`（含给票 5／6／7 的七条硬约束），事实包十份 `t195-facts/`，两审 75/100（整改后通过）与 68/100（打回，缺陷已全部修订）。四条决策：①内容资产＝**机器生成 typed `.ts`** ＋生成器（含 `--check`）＋摘要锁（照卡路里／账单两家做法，并补两家都没做对的一件：**接进包内门**）②一级分组英文标识＝**老骨架 9 个域 key**（第一性原理：词表必须能完整切分 9 个分组，命令命名空间不满足）③技能级落点**留 `src/help/`** ④速查与 HELP **各留一份事实源**＋双向对账锁。一条审查结论被证伪并如实记录：审查 A 称 `cmd_read.ts` 735 行，三方实测真值 **741 行**。

下一步：**无——本图已走完**（13 张全关，frontier 为空）。末张票 11 的收口见本节下方「本图已走完」段。

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
- **本图产物索引**（新会话接手先看这里）：
  - 调查报告：`t184-bill-recipe.md`（照抄清单）／`t185-content-reconcile.md` ＋ `t185-skeleton.json` ＋ `t185-evidence/`（内容对账）／`t186-template-contract.md`（模板契约）
  - 决议留档：`t184-resolution.md`／`t185-resolution.md`／`t186-resolution.md`／`t196-resolution.md`
  - 票 10 产物（插件侧最小安装）：`t193-install-report.md`（安装＋实测证据＋逐字回滚命令）／`t193-fix-report.md`（整改记录）／`review-t193-A.md`／`review-t193-B.md`（两审）／`t193-client-bundle-defect.md`（客户端产物缺陷配方）
  - 票 12 产物（结构设计）：`t195-structure-design.md`（形状定稿）／`t195-decisions-record.md`（**四条决策＋给票 5／6／7 的七条硬约束**，下游票开工先读它）／`t195-facts/`（事实包）／`t195-part1..6*.md`（分节草稿与审查依据）／`review-t195-A.md`／`review-t195-B.md`（两审）
  - 票 4 产物（命名落盘＋缺省口径）：`t187-decision.md`（**四条裁决＋给下游票的硬约束 §8–§15**，票 6／票 7 开工必读）／`t187-facts.md`（共用件 5 家使用方、组合表 111 条）／`review-t187-A.md`／`review-t187-B.md`（两审）
  - 票 5 取证：`t188-facts-schedule-precedent.md`（作息同形状先例＋它的 7 个洞）／`t188-facts-badge-types.md`（模板实际 10 词表）／`t188-impl-notes.md`
  - 决策页（HTML，给人看的）：`t196-decisions.html`／`t195-decisions.html`
  - 接线脚本：`t183-wire-edges.mjs`（票源 `map-183-tickets.json`；重跑即自校验，PASS 才算边齐）
  - 票面正文源：`t<N>-body.md`（改票面一律改文件再 `gh issue edit <n> --body-file`，别内联字符串）
  - 全部在 `docs/skills/skill-home/`
- **文档与产出落点**（用户 Q9=(a)）：代码与产物落 `packages/skill-home/`，文档落 `docs/skills/skill-home/`。

## 计划（任务清单）

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
| 1 | [调查：饼干记账的 HELP 交付实现逐件读懂 → 居家照抄清单](https://github.com/FeatherHunter/ilife/issues/184) | research | — |
| 2 | [调查：内容资产对账（老 9 域／30 组／73 场景 ↔ 新表 91 条唤醒词／21 条命令）](https://github.com/FeatherHunter/ilife/issues/185) | research | — |
| 3 | [调查：通用 help 模板的注入契约＋居家专属取值](https://github.com/FeatherHunter/ilife/issues/186) | research | — |
| 4 | [决策：命名落盘管线的归属＋缺省出口口径](https://github.com/FeatherHunter/ilife/issues/187) | grilling | [票 1](https://github.com/FeatherHunter/ilife/issues/184) |
| 5 | [内容资产入库：老骨架 → 仓内 typed const](https://github.com/FeatherHunter/ilife/issues/188) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/185) ＋ [结构设计](https://github.com/FeatherHunter/ilife/issues/195) ＋ [内容裁决](https://github.com/FeatherHunter/ilife/issues/196) |
| 6 | [渲染接线：5 项＋三块可选内容 → 通用 help 模板](https://github.com/FeatherHunter/ilife/issues/189) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/184) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/186) ＋ [结构设计](https://github.com/FeatherHunter/ilife/issues/195) ＋ [内容裁决](https://github.com/FeatherHunter/ilife/issues/196) |
| 7 | [出口与命名落盘：缺省＝HELP 文件，速查走显式参数](https://github.com/FeatherHunter/ilife/issues/190) | task | [票 4](https://github.com/FeatherHunter/ilife/issues/187) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/189) |
| 8 | [锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/191) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/190) |
| 9 | [SKILL.md 说明面](https://github.com/FeatherHunter/ilife/issues/192) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/190) |
| 10 | [插件侧最小装机（技能提供方＋DSH profile；收窄 #58）](https://github.com/FeatherHunter/ilife/issues/193) | task | — |
| 11 | [真机端到端＋肉眼终审](https://github.com/FeatherHunter/ilife/issues/194) | task | [票 8](https://github.com/FeatherHunter/ilife/issues/191) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/192) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/193) |
| 12 | [结构设计：新件住哪（必报五步第一／二步，先报用户点头）](https://github.com/FeatherHunter/ilife/issues/195) | grilling | [票 2](https://github.com/FeatherHunter/ilife/issues/185) |
| 13 | [内容裁决：老骨架与新表对不齐的五条（先报用户点头）](https://github.com/FeatherHunter/ilife/issues/196) | grilling | — |

**本图已走完（2026-09-12，frontier 为空）**：末张 [票 11](https://github.com/FeatherHunter/ilife/issues/194)（真机端到端＋肉眼终审）**已关**——**维护者肉眼终审原话：「认可 HTML样式符合我的要求 验证通过」**⇒ 终点两判据达成（①明确拿到 help HTML 文件：落盘＋可打开 ②页面由现成通用 help 模板渲染）。

AI 侧四条复验（全档 `t194-evidence/03-fresh-verification.md` ＋ 可复跑脚本 `03-verify-artifact.mjs`）：①**插件侧真机不重启即成立**——新会话技能表已显票 9 改后的新描述，且「按需读全文」实测可用（取到 `SKILL.md` 全文）②生产目录再跑两条（缺省＝**复用窗口命中**、`--params '{"reuseHours":0}'` 落新件 **132317 B**；`.db` 动过 **0** 个）③产物结构校验 **PASS**（8 分组／**27** 二级组／70 场景／零外部引用／停用联动 3 组名未落页）④视口图两张（本机 **Chrome 无头＋CDP**，零下载；桌面 1440×2014／手机 375×1750，**未入仓**）。

**交付产物**：`D:\2Study\StudyNotes\.db\home_manager_html\居家管家_HELP_20260912_212642.html`（**132317 B**）。

**订正一条旧证据**：证据 ① 写的「30 二级组全部落页」与实测不符——真值 **27 组**（＝骨架 30 − 联动域那 3 组：联动总览／食品联动／价格联动，每组各 1 条停用场景；票 13 已裁「联动不列、不建域目录」⇒ 3 个容器随之不落页，30 − 3 ＝ 27）。场景数不受影响（73 − 3 ＝ 70，副标题写的就是 70）。后续引用以 27 为准。

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [调查：饼干记账的 HELP 交付实现逐件读懂 → 居家照抄清单](https://github.com/FeatherHunter/ilife/issues/184) — 报告 `docs/skills/skill-home/t184-bill-recipe.md`：19 行逐件表判出「照抄 `output.ts`／`helpPaths.ts`／`helpFile.ts` 三件，不抄卡路里的命令名映射与转发件」；两处生成物禁手改（`base-render/src/helpShell.ts`、bill 的 `wake-assets.ts`）；三条会改下游票的硬事实——`tooling/check-boundaries.mjs:37` 名单含 `skill-home`（import `base-paint` 就 FAIL）、`cmd_read.ts:54-56` 的 `dispatch` 第一行就开库（看帮助会建库）、`scripts/build-help.mjs:28` 不保检出换行。
- [调查：通用 help 模板的注入契约＋居家专属取值](https://github.com/FeatherHunter/ilife/issues/186) — 报告 `docs/skills/skill-home/t186-template-contract.md`：仓内有两套渲染，**居家走 A 路**（`assets/help-template.html` → 生成物 `helpShell.ts` → `base-paint/help-shell`）；`subtitle`／`meta_blocks` 在 A 路**不渲染**但照传（一处算两处用）；资产三层形状与二级组 id 通式 `<域id>_<序数>`；`version`＝`'2.0'`（数据世代非包版本）；`init_banner` 判法＝`existsSync` 判库且**不建库**（居家 `resolveDbPath` 自带 `mkdirSync`，不能直接用）；`recommendations` 不传。
- [调查：内容资产对账（老 9 域／30 组／73 场景 ↔ 新表 91 条唤醒词／21 条命令）](https://github.com/FeatherHunter/ilife/issues/185) — 报告 `docs/skills/skill-home/t185-content-reconcile.md` ＋ 骨架 `t185-skeleton.json`：老 73 场景里 **3 条无落点**（全在 link 域）、新表要**补进 20 条**（17 条在老 `SKILL.md` 路由表里有出处，只 3 条真新增）；**唤醒词的事实源是 `scenarios.yaml` ＋ 老路由表两份**；3 条 `(HTML)` 建议不进 HELP 清单、link 3 条留登记位不建域目录、HELP 主数用 73 场景；10 条待裁里真正要用户拍板的五条收成票 13。
- [内容裁决：老骨架与新表对不齐的五条（先报用户点头）](https://github.com/FeatherHunter/ilife/issues/196) — 用户五条全答 **A**：①推位置／找位置**留在**「位置管理 › 管位置」卡（跟新命令 `home.location.query` 走）②看标签**不独立成卡**（作「管标签」卡附属词，主数保持 73）③3 条 `(HTML)` 兼容词**不进清单**，只在口径区写一行 ④主数用 **73 场景**（21 条命令写口径区）⑤联动 3 条**留登记位**（`status: "deprecated"`）、prompt 不迁、**不列**、**不建域目录**；用户补充原话「我们以后在 combos 相关地方设计」→ 联动将来的设计出本图。五条已写进票 5／票 6 票面。
- [插件侧最小装机（技能提供方＋DSH profile；收窄 #58）](https://github.com/FeatherHunter/ilife/issues/193) — 交付四件：`skill-provider.ts`（rank 600／单份 `SKILL.md` 按包名解析不复制）＋`dsh-ctx.ts`＋`index.ts` 接线；客户端产物缺陷修好（`dist/client.js` 837 B 裸 ESM → **3541 B loader 工厂包**，`client-bundle-48` 18/3 → **21/0**）；`skill-home` 两处断链（`files` 补 `SKILL.md`、补**扁平** frontmatter，正文未改）；web profile 装齐（`link:` 依赖＋bundles＋两条 Junction＋启动器自管的 `.dsh-module-fallback` 一条，备份与逐字回滚命令在报告 §3.4）。两审 **88/100 通过／77/100 整改后通过**，整改补了两条真缺口：新增用例接进 `test` 门（本包 9/9）、「他错重抛」补锁并反例自证。**未重启 DSH**；#58 已按其收窄留评论（不建阻塞边）。
- [结构设计：新件住哪（必报五步第一／二步，先报用户点头）](https://github.com/FeatherHunter/ilife/issues/195) — **四条决策**（用户 2026-09-12 裁决，全档见 `t195-decisions-record.md`）：①内容资产＝**机器生成的 typed `.ts`** ＋生成器（含 `--check`）＋摘要锁，生成物禁手改——照卡路里／账单两家做法，并补两家都没做对的一件：**生成与校验必须接进包内门**（两家今天是「禁手改靠自觉」）②一级分组的英文标识＝**老骨架 9 个域 key**（第一性原理：词表必须能**完整切分**这 9 个分组；新命令命名空间最多覆盖 5 个、`快递购物`↔`home.shopping.*` 语义不等同，采用会造多对多映射），`link` 只留登记位不入组不建目录③技能级落点**留 `src/help/`**（不违反铁律四，有先例判据）④速查与 HELP **各留一份事实源** ＋ 一条双向对账锁（照两家做法；编排方原推荐的「合一」被两家实践推翻）。另产出七条硬约束给票 5／6／7，含**门禁配套动作**：摘掉 `'skill-home'` 名单后该脚本对居家会变成**空转仍打印 PASS（假绿）**，必须补等效断言或明确由行为面门禁兜底。两审 75/100（整改后通过）、68/100（打回→缺陷已全部修订）；一条审查结论被**证伪**并记录：`cmd_read.ts` 真值 **741 行**（非 735）。
- [决策：命名落盘管线的归属＋缺省出口口径](https://github.com/FeatherHunter/ilife/issues/187) — 四条裁决（全档 `t187-decision.md`，取证 `t187-facts.md`）：①**居家自持只留「落点值」**（`home_manager_html` ＋ `居家管家_HELP`），命名通式／独占写／递补／复用窗口／绝对路径回执全走共用件 `base-paint/save-html` 的 `saveHtmlFile`（`#237` 已收拢，**五家**在用，全仓零家自持独占写）②**缺省＝HELP 文件**＋回执只追加 `delivery`；**三支冻结**（缺省／`mode:"lookup"` 速查表产物／`q` 支），**三支出参一律仍回 `{items,total}`**；`--html` 支不许顺手砍；验收判据写成「回执路径可打开」而非「文件数增加」③**combo 要登记**（`base-combos/combos.yaml`，成本含重跑两个生成器；落地归票 7）④**新 HELP 件全收 `src/help/`**、落点件定名 `manifest.ts`。两审 76/100、72/100（整改后通过），**1 条审查意见经一手证据驳回**（要求照老家 `_1` 递补——查老家源码 docstring 逐字「冲突直接覆盖」，**老家根本没有 `_N` 机制**）。
- <!-- 票 4 的裁决细节在票里；本图产物：t187-decision.md／t187-facts.md -->
- [内容资产入库：老骨架 → 仓内 typed const](https://github.com/FeatherHunter/ilife/issues/188) — 事实源**入库**（`src/help/scenarios.yaml` 46267 B／1283 行，与仓外原源 **sha256 逐字一致** `f80184ce…665a`）＋**机器生成**资产 `src/help/helpAssets.ts`（1164 行，禁手改，头注释含生成器名／事实源 sha256／重算命令）＋生成器三件（51／197／219 行，全在告警线内；`--check` 一致态 exit 0）＋锁用例（摘要锁＋形状＋**逐字段对事实源**＋与 `WAKE_TABLE` **双向对账含「唤醒词→命令 key」全表**，13/13）。两审 **90/100 通过**、**73/100 整改后通过**；整改顶住了一次**无据加码**（编排方曾据 366 行要求拆测试件，实施者据 `structure.md:9`「不管测试文件」反对——**实施者正确，编排方已撤回并留痕**）。**一条审查意见被一手证据驳回**：要求照老家 `_1` 递补——老家源码 docstring 逐字「冲突直接覆盖」，**老家没有 `_N` 机制**。偏差如实三条：新建 `scripts/lib/` 脚本助手目录（拆件避超线，属编排方指派）／包内其余用例仍不进包级 test 串（留门禁票）／PyYAML oracle 未留成仓内可复跑用例。
- [出口与命名落盘：缺省＝HELP 文件，速查走显式参数](https://github.com/FeatherHunter/ilife/issues/190) — **地图的终点判据变成了可复现的事实**：`manifest.ts`（只 3 个落点值）＋`output.ts`（薄封装走共用件 `saveHtmlFile`）＋`cmd_read.ts` 把 `home.help.lookup` **抬到开库之前**分派（老 case 改成「路由坏了」的 `fail(1)` 兜底）＋`combos.yaml` 登记（111→112，同批重跑两个生成器＋补锁）。**编排方亲手端到端**：`delivery={"mode":"file","path":"<tmp>\\home_manager_html\\居家管家_HELP_<戳>.html","bytes":132318}`、绝对路径、声明字节＝实际、**产物目录 `.db` 数＝0**（看帮助不建库）、窗口内回同一路径、`reuseHours:0` 走 `_2` 递补、速查支分名 12819 B 零外链、坏参一律 exit 2 且零落盘、写失败 exit 5。两审 **86 通过／77 整改后通过**；整改含**索引缺件**（12 件补进索引，消除「按索引提交即构建断」）、`q` 非字符串改 `fail(2)`、参数校验抬成单点、台账回填 818 行。两条已裁并交接：**交付面零锁** → 票 8；`SKILL.md:3` 描述仍旧口径 → 票 9。
  - **编排方补记（2026-09-12）**：本票的 combo 登记改了 `packages/base-combos/combos.yaml` 与重生成的 `src/present.ts`，而 `tooling/write-snapshot.mjs` 的快照正好盖这两件 ⇒ 仓根 `test/scaffold.test.mjs` 的「快照 == 实际拉取版」**变红**（CI 会红）。原实施棒与两席审查都没跑到这条。已按测试提示 `node tooling/write-snapshot.mjs` 重写快照（`0.1.0@ba40de0c10101986`）并复验 scaffold 2/2 绿。**教训**：凡改 `base-combos` 的 yaml／present，必须同批重写快照。
- [锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/191) — **补上本图最后一个质量洞**（审查 B 席实测「删掉交付段或改落点值，现有用例照样全绿」）。新增 `test/help-delivery-190.test.mjs`（316 行／**11 用例**，只经真 spawn；落点三值**写死字面量**、不从 `dist` 取 ⇒ 非循环验收）。**三重变异证明「锁有真牙」**：注释掉交付段 → **10/11 红**；改落点值一字 → 5 红；改落点**目录名**一字 → 6 红、加固后 **8 红**。审查 `review-t191-A.md` **通过 95/100**，它指出的唯一强度缺口（④两支互不串／⑥`.db`＝0 是**缺席式断言**，落点目录错名时仍绿）已改 **fail-closed**（先断言产物目录存在再判缺席），同一变异下 ④⑥ 现在也会红。包级 26/26、包内 48/48、门禁 PASS。
- [`SKILL.md` 说明面](https://github.com/FeatherHunter/ilife/issues/192) — 四件＋一处顺带修：新增「HELP 交付」节（缺省＝落文件＋**绝对路径**；**完成判据＝文件存在且大小＝`delivery.bytes`**；速查／现找与互斥 exit 2；边界；不看库）／`description` 改对（原「出一份速查列表」会**骗到读技能目录的 AI**）／「判新旧」改通用口径／补 `## 公共安装器运行时`＋把导出用例 `PKGS` 扩到含居家（补上「居家 frontmatter 没有任何门对着」的缺口）／`build-help.mjs` 改按检出换行写回（CRLF 探针注入前后 sha256 不变）。审查 `review-t192-A.md` **整改后通过 80/100**：三条文档与行为不符已订正，其中**一条是外部事实错**——原文「`skill-home` 尚未发布到 npm」是假的（npm 上确有 `0.1.0`，2026-09-07 发布），真阻塞是依赖 `"base-link-core": "workspace:^0.1.0"` 未改写 ⇒ 新装必报 `EUNSUPPORTEDPROTOCOL`；已按卡路里同形改成「已发布待重发、发布前走本仓构建产物」。**方法论留档：不编造 ≠ 事实正确**——拿不到证据时应去核外部事实（一条 `npm view` 即可），而非选一个方向的断言；编排方据此夸错过一次，同记在编排方账上。
- [真机端到端＋肉眼终审](https://github.com/FeatherHunter/ilife/issues/194) — **本图末张票，2026-09-12 关**：**维护者肉眼终审原话「认可 HTML样式符合我的要求 验证通过」**⇒ 终点两判据达成（①明确拿到文件：落盘＋可打开 ②页面由**现成通用 help 模板**渲染）。AI 侧四条复验落 `t194-evidence/03-fresh-verification.md` ＋ 可复跑校验脚本 `03-verify-artifact.mjs`（只读，PASS exit 0）：新会话技能表＋全文可读／生产目录两条真跑／结构校验 PASS／两张视口图。**插件侧不重启即成立**（新会话技能表已是票 9 新描述）；生产两条真跑＝缺省**复用窗口命中**（目录 19→19 不涨）、`--params '{"reuseHours":0}'` 落新件 **132317 B**（目录 19→20），两条都回**绝对路径**且 `bytes` ＝实际大小、生产目录 `.db` 动过 **0** 个（看帮助不建库）。**订正**：证据 ① 写的「30 二级组全部落页」真值 **27**（＝骨架 30 − 联动域 3 组；票 13 已裁联动不列）。两件按裁定留档未做：重启 DSH 复验（非判据）、与卡路里／记账产物的逐张视觉比对（判定口径不含视觉比对；两张视口图只作复核辅助且**未入仓**）。

## Not yet specified

**已出雾（2026-09-12 全部毕业，本节现为空）**

- ~~「速查支」的产物名与落点~~ → 票 4 裁决（`mode:"lookup"`／产物 `居家管家_速查表_<stamp>.html`，与 HELP **分名**；照账单／卡路里先例），票 7 已实现并实测（12819 B、零外链、与 HELP 支互不串）。
- ~~3 条 `(HTML)` 兼容词与联动废弃词在 HELP 里的去留~~ → 票 13 裁决（不进清单／留登记位）。
- ~~首次使用横幅 `init_banner` 的显隐口径~~ → 票 3 取证＋票 6 实现（`existsSync` 判库且**不建库**，键常在只切 `hidden`，读失败 fail-open）。

## Out of scope

- 其余 5 个技能（备忘／作息／大厨／总管／卡路里）的 HELP 交付：本图只做居家管家（用户 Q5）。
- 居家管家其余场景页（过程型／结果型 HTML）与图形页：本图只做 HELP（用户 Q5）。
- `packages/skill-home/src` 整包按 HELP 一级分组重排：出本图目的地（用户 Q8=(a)，另立票）。
- 发布态（抬版本＋发版＋真 npm 安装验证）：出本图，风险留给发版票。
- 面板／侧栏的 HELP 入口、插件里「打开文件」的动作：属 #58 那条线。
- **联动功能那 3 条（联动总览／记到卡路里／记到记账）将来的设计**：用户 2026-09-11 原话「我们以后在 combos 相关地方设计」——出本图目的地，走 combos 相关票。
- **票 11 原列的「两侧视口取图」**：按地图判定口径（用户 2026-09-11：只要求拿到文件＋用通用模板渲染＋肉眼终审，**不含视觉比对**）**不做**；要留档两张图需先装 playwright 浏览器二进制（本机只有库），届时另议。
  - **补记（2026-09-12 21:3x）**：本会话换了一条零成本的路——本机 **Chrome 无头 ＋ CDP**（node 自带 WebSocket，不装 playwright、不下载）取了两张视口图（桌面 1440×2014／手机 375×1750），作**复核辅助**交给维护者，**未入仓**。口径不变：图**不作判据**，也不与卡路里／记账产物做视觉比对。
- **`--html` 支与兄弟家「explicit 优先」的对齐**：本图按「不动既有通用出口」保留现状（冷目录下 `--html X` 会同时落指定页与缺省交付件），已登记为**另立票候选**。
- **`src/fetch/db.ts`（434 行）超包告警线 350 的重构**：归属**另立票**，不在本图（已记 `packages/skill-home/AGENTS.md` 台账）。
- **`cmd_read.ts`（818 行）更大范围抽件／整包按 HELP 一级分组重排**：另立票（本图只抽「看帮助」一支）。
- **内容资产的 PyYAML oracle 交叉核对**：做过（73 场景×8 字段＋9 域×4 字段 0 处不一致）但**未留成仓内可复跑用例**，属另一棒。

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

### 票 12 决策回答原话（2026-09-12）

```
1 学习卡路里、饼干记账技能怎么处理的
2 从第一性原理出发选择你认可的目录名
3 A
4 学习卡路里、饼干记账是怎么处理的
```
