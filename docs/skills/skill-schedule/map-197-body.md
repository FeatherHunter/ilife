## Destination

在 DSH 对 AI 说「作息管家help」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/schedule_html/help/作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`，回执给绝对路径；该文件是**共享 help 模板**（`base-paint/help-shell`，公共组件模板的逐字版本）灌入**作息管家定制内容** —— 旧 HELP 的**全部 5 类别／34 唤醒词／85 场景**。技能侧（`skill-schedule`）与插件侧（`dsh-schedule-ilife` ＋ DSH 真机装机）都要通。两条同时达成即本图完成。

**判据（照 `#131`／`#143`，用户 2026-09-12 拍板 Q11=A）**：①明确拿到文件；②同一 help 模板 ＋ 定制内容 —— **视觉基准＝共享 help 模板**，不拿旧 HELP 文件逐像素判红（旧实物是自成一族，见 Notes）。

## 进度：38%

本图已建：地图 ＋ 10 张子票 ＋ **原生子议题边（10/10）＋ 原生阻塞边（11 条）**，数量已由脚本逐条核对。 序 1 调查票（[#198](https://github.com/FeatherHunter/ilife/issues/198)）**已收口**，交出四样东西：世代判定、内容骨架、参数靶子、落盘机制与缺口实测。

**下一步（两张都可开工）**：

1. 序 2 结构裁定（[#199](https://github.com/FeatherHunter/ilife/issues/199)）—— 出必报五步的第一、二步（影响清单＋结构设计），用户点头后才动代码；
2. 序 4 内容资产（[#201](https://github.com/FeatherHunter/ilife/issues/201)）—— 只依赖已收口的 #198，可与序 2 并行。

**本图已定稿**（2026-09-12）：正文、十张子票、原生子议题边与原生阻塞边、采访区、接手须知齐备；用户已认可，**交新 session 从 frontier 开工**。

序 1 调查、序 2 结构裁定、序 3 结构就位、序 4 内容资产**已全部落地**（各带独立对抗式审查：内容资产 6 轮、结构就位 1 轮、抗辩结论均已吸收）。

**此刻的 frontier**：序 5 渲染接线（[#202](https://github.com/FeatherHunter/ilife/issues/202)）——其两个前置（#200／#201）均已交付，#199／#200／#201 三票待维护者点头收口。

**下一步**：①维护者裁「90 条伴生信息是否上页」（决定 #202 的验收面与文件头措辞）；②#202 渲染接线（必须两段式回归：静态壳 ＋ 运行时 DOM，否则假绿）；③收口 #199／#200／#201 三票并解阻 #203。

## Notes

- **本图要交货**（用户 2026-09-12 原话「携带执行」）：默认的只出决定不适用 —— 必须交出能跑的东西。
- **按新架构规则走**（用户原话「尽可能按照新架构规则做本次开发，为未来打好坚实基础」）：照 `docs/agents/structure.md` 的五条铁律与必报五步，每一步报给用户。
- **能力目录（用户 Q13=A）**：按旧 HELP 的 5 个一级分组全建 —— 写入与同步 `write`／查询与浏览 `query`／日程与计划 `plan`／分析与洞察 `analyze`／辅助与管理 `admin`（英文名取自旧数据的既有 id，不自创）。
- **内容口径（用户 Q12=A ＋ 2026-09-12 补充原话）**：把旧作息管家的场景、唤醒词等信息按新 help 模板要传入的参数准备好；**内部展示的信息是旧作息管家的全部场景**。旧 85 场景里 1 条旧技能自标「待开发」；5 条唤醒词今天没有对应的新命令（准备消息／同步作息／增量同步／周视图／首次使用），照旧技能标「待开发」徽章。
- **重复检查＝新增**：`#143` 的 Out of scope 明写「其余 5 个技能（含作息）的帮助交付」不在其内；`#60` 只覆盖桥／面板／提供方与速查证据，不含 HELP 文件交付。仓里没有第三张覆盖本需求的 map。
- **地面真相（只读）**：

- 旧 HELP 实物：`D:\2Study\StudyNotes\.db\schedule_html\help\作息管家_HELP_20260811_125617.html`（2026-08-11 12:56，5 类别／34 唤醒词／85 场景／1 待开发）＋ 技能根目录稳定镜像 `D:\2Study\StudyNotes\SKILLS\作息管家\作息管家.html`（ADR-0001，同日 19:57，同内容）。

- ⚠️ **这两份都不是公共组件模板产的**：内联 `window.__SCENARIOS__`，没有 `help-data` 载荷，页面自带布局（三层＋工具栏）。只当**内容源**，不当视觉基准。

- 共享模板正本：`packages/base-render/assets/help-template.html`（＝`公共组件/assets/help_template.html` 的逐字版本，已按 `#141` 去原型水印、标题改占位符）；出口 `base-paint/help-shell` 的 `renderHelpShellHtml`。

- 旧契约：`D:\2Study\StudyNotes\SKILLS\公共组件\docs\help-template-contract.md` v1.2（注入参数 `skill_name`／`title`／`subtitle`／`init_banner`／`meta_blocks`／`groups`／`contact`／`version`／`recommendations`）。

- 旧场景数据已取成机器可读：`.scratch/t198/old-scenarios.json`（85 条 prompt 全文）。
- **边界门**：`tooling/check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN` 今天含 `skill-schedule`（源码与 templates 都不许 import `base-*`）。本图照 `#145` 把它移出（用户 Q5=A）。
- **结构债（本图就地摆正）**：`packages/skill-schedule/src/render/html.ts:66-67` 自带第二份 `SHARED_CSS`／`SHARED_HELPERS`。
- **`#60` 残项（本图接住）**：插件侧缺技能提供方、`inject` 为空表、`SKILL.md` 缺 frontmatter、`package.json` 的 `files` 缺 `SKILL.md`。旧票已按用户裁定关闭并写明交接。
- **文档落点（用户 Q14=A）**：只放仓内 `docs/skills/skill-schedule/`（件名＝`packages/` 目录名逐字）；过程草稿落 `.scratch/wf-schedule/`。
- **范围（用户 Q3=A）**：技能侧（`skill-schedule`）＋ 插件侧最小装机（`dsh-schedule-ilife`）；**发版出图**（见下 Out of scope）。
- **就地摆正的边界（用户 Q15=A）**：HELP 相邻的存量一律本图摆正；其余四个工种目录（`cli/`／`fetch/`／`policy/`／`render/` 的存量）进「未定」，不由本图顺手重排。
- **接手须知（新 session 先读这三份，不必回看建图那轮的对话）**：

1. `docs/skills/skill-schedule/t198-old-help-truth.md` —— 旧实物的世代判定 ＋ 内容骨架 ＋ 新模板参数靶子 ＋ 旧→新字段映射（含两处形状转换风险）；
2. `docs/skills/skill-schedule/决策待确认-作息管家HELP.html` —— 六条决策的选项与利弊（已全部取 A），开着当备忘；
3. `.scratch/t198/old-scenarios.json` —— 85 条场景与 prompt 全文（机器可读，内容资产的输入）。

建图脚本与边校验脚本在 `.scratch/wf-schedule/`（`create-map.ps1`／`verify-edges.ps1`／正文与评论文件）。
- **认领即开工**：认领一张票＝把那张票 assign 给自己，是这张票的第一次写操作；并发 session 靠这个跳过别人手上的票。
- **会话纪律**：不弹窗问，一律写在对话正文里；用户只负责扫码（2FA）。
- **用词纪律**：照 `docs/agents/wording.md`（写「help 模板」不写「壳」；`schedule.*` 一律叫「命令」）。

- **正文被回写工具弄坏过一次，本节是 2026-09-12 重建的**（如实记录）：当天实测本文原被压成 **19 行／9,283 字符，最长一行 7,346 字符**，章节标题与正文并在一行、计划表塌成一整行、`###` 被误伤成 `#`、Notes 的嵌套项目并进父项、采访区引文丢掉行内换行。**内容一个字没改**：按已知章节标题精确切段后照规范顺序重排，计划表从当时的子议题与阻塞边重新生成。修后 145 行、最长行 607、九章节齐在行首。修复脚本 `docs/skills/skill-schedule/map-197-repair.mjs`（可重复跑，幂等）。**给其他会话的教训**：改地图正文一律「取回线上正文 → 就地改 → 以文件方式写回」，不许拿本地旧稿整篇覆盖。

## 任务清单

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

| 票 | 标题 | 类型 | 被谁阻塞 |
|---|---|---|---|
| 198 | [作息管家HELP（1/10）旧实物与内容骨架调查（世代／5 类别／34 唤醒词／85 场景）](https://github.com/FeatherHunter/ilife/issues/198) | research | — |
| 199 | [作息管家HELP（2/10）结构裁定：5 个能力目录＋共用位＋边界门＋就地摆正范围](https://github.com/FeatherHunter/ilife/issues/199) | grilling | [#198](https://github.com/FeatherHunter/ilife/issues/198) |
| 200 | [作息管家HELP（3/10）结构就位：能力目录＋共用位＋边界门移出](https://github.com/FeatherHunter/ilife/issues/200) | task | [#199](https://github.com/FeatherHunter/ilife/issues/199) |
| 201 | [作息管家HELP（4/10）内容资产：旧 85 场景 → 模板要传入的参数](https://github.com/FeatherHunter/ilife/issues/201) | task | [#198](https://github.com/FeatherHunter/ilife/issues/198) |
| 202 | [作息管家HELP（5/10）渲染接线：注入参数 → 共享 help 模板](https://github.com/FeatherHunter/ilife/issues/202) | task | [#200](https://github.com/FeatherHunter/ilife/issues/200) ＋ [#201](https://github.com/FeatherHunter/ilife/issues/201) |
| 203 | [作息管家HELP（6/10）出口与命名落盘：缺省＝HELP 文件](https://github.com/FeatherHunter/ilife/issues/203) | task | [#202](https://github.com/FeatherHunter/ilife/issues/202) |
| 204 | [作息管家HELP（7/10）锁：CLI 级用例（真 spawn 出口）](https://github.com/FeatherHunter/ilife/issues/204) | task | [#203](https://github.com/FeatherHunter/ilife/issues/203) |
| 205 | [作息管家HELP（8/10）SKILL.md 说明面（frontmatter＋files）](https://github.com/FeatherHunter/ilife/issues/205) | task | [#203](https://github.com/FeatherHunter/ilife/issues/203) |
| 206 | [作息管家HELP（9/10）插件侧最小装机（技能提供方＋DSH profile）](https://github.com/FeatherHunter/ilife/issues/206) | task | [#205](https://github.com/FeatherHunter/ilife/issues/205) |
| 207 | [作息管家HELP（10/10）真机端到端＋肉眼终审](https://github.com/FeatherHunter/ilife/issues/207) | task | [#204](https://github.com/FeatherHunter/ilife/issues/204) ＋ [#206](https://github.com/FeatherHunter/ilife/issues/206) |

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [结构裁定：5 个能力目录＋共用位＋边界门＋就地摆正范围](https://github.com/FeatherHunter/ilife/issues/199) — 裁定成文 `docs/skills/skill-schedule/t199-structure-verdict.md`（证据集 `t199-evidence.md`）。三条：①共用位 `src/shared/`，第一件 `templateFill.ts`（从 `render/html.ts` 原样搬入），被 write 回执页与 query 查询页同一调用点在用；②五个能力目录 `write`／`query`／`plan`／`analyze`／`admin` **与第一件东西同时建**（今天五目录里没有一件属于自己的代码，空目录 git 也留不下——变更设计、不变目标）；③`check-boundaries.mjs` 的 `skill-schedule` 移出保留（用户 Q5=A）。**越界写入的两条标准条款已撤回**，改由裁定文档承载为「标准提改建议（待维护者裁决）」：删误引句、删无据例子（旧 HELP 一级分组实为 write/query/plan/analyze/admin，非 `help`）、把「四图撞同一问」如实写成**部分有据**、并写明 `shared/` 的效力来源是「用户裁定英文名＋与能力目录并列」而非铁律四。
- [结构就位：能力目录＋共用位＋边界门移出](https://github.com/FeatherHunter/ilife/issues/200) — 按裁定施工完毕：共用位 `src/shared/templateFill.ts` 就位（`render/html.ts` 对外 11 件减到 5 件，落回铁律五线内）；边界门 `PASS`；**外观零变化**经 185 件 HTML 快照 `changed=0` 验证；必报五步对账**偏差 0**；独立审查 88.0 达标可收口（公开面少 3 个无消费者的标记常量名，已实测无门依赖）。
- [内容资产：旧 85 场景 → 模板要传入的参数](https://github.com/FeatherHunter/ilife/issues/201) — 85 条场景的标题／唤醒词／指令全文／参数说明**逐字节零差异**（一名审查者绕开源文件、直接从旧 HELP 实物内联数据复现一遍）；计数全派生；待开发标记按票面规则 1 → 11 条；伴生信息（85 条结果说明＋5 条分组说明）暂存两张表并如实标为**未决的下游风险**——**交付出口（`base-paint/help-shell`）今天不渲染它们，页面可见 0/85，而旧 HELP 页是把它们画给用户看的**。
- [旧实物与内容骨架调查](https://github.com/FeatherHunter/ilife/issues/198) — **世代判定：旧作息管家的 HELP 从来没换到公共组件的 help 模板**（无 `help-data` 载荷、无契约键，数据内联 `window.__SCENARIOS__`；公共组件契约 §7 把它记作「作息 3 层+工具栏」家族）→ 故本图以**共享 help 模板**为准、旧实物只当**内容源**。骨架：5 类别／34 唤醒词／85 场景／1 待开发（write 14、query 28、plan 28、analyze 12、admin 3）；两份旧实物内容同源，无饼干记账那次「上一代陷阱」；新模板参数靶子、旧→新字段映射、落盘机制、缺口 5 条均已成文（`docs/skills/skill-schedule/t198-old-help-truth.md`）。

## Not yet specified

- 其余四个工种目录（`cli/`／`fetch/`／`policy/`／`render/` 的存量）何时按域重排、代价多少 —— 等结构裁定票报出影响清单再定去留。
- 5 条没有新命令的唤醒词（准备消息／同步作息／增量同步／周视图／首次使用）要不要各立补命令的票 —— 等内容资产落完、与口径层对完账再定。
- 旧技能另有一份独立的「帮助中心」页面（`.db/schedule_html/help/help_center.html`）：要不要产物，等工作面走到时再定。

## Out of scope

- **发布到 npm**（抬版本、真装验证）：出本图，单列成票（照 `#143` 先例；`base-paint@0.3.0` 已发布版本的 exports 缺 `./help-shell`）。
- **面板／侧栏的 HELP 入口**与「插件里打开文件」动作：属桥／面板那条线，不在本图。
- **其余技能**（备忘／居家管家／大厨）的 HELP 交付：各归自己的图。
- **复刻旧技能自制排版**（三层＋工具栏）：用户 2026-09-12 拍板 Q11=A，以共享 help 模板为准。

## 本 session 新增的未定项（2026-09-12）

- **90 条伴生信息的去向待裁决**：旧 HELP 页把「每条场景的预期结果说明」（85 条）与「一级分组说明」（5 条）画给用户看，而交付出口 `base-paint/help-shell` 不渲染它们（`meta_blocks` 在该模板里读入后零引用，实测页面 DOM 0 次）。三条候选路：①本图内给共享模板补渲染落点（bill 页会多两块、无门守护）②另立公共层票、本图记缺口并挂承接票 ③不上页并删表。未定前不得收口渲染票。
- **跨技能共用的标记常量与两版的小样式表**：三个标记常量（`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`CONTENT_MARKER`）与那份小样式表在 bill／chef／home／memo-ilife／schedule **各定义一份**（schedule 与 home 逐字符相同），四份都不是 base 层正本（正本 21286 字符）。跨技能去重出本图。
- **生成器 import 守卫的同类隐患**：本包 `scripts/build-help.mjs` 与 `skill-bill/scripts/gen-wake-assets.mjs` 被 import 即执行副作用（本图已给 `gen-help-assets.mjs` 加守卫并写明正确先例）。要不要另立票统一，待定。
- **已发布包的公开面收缩记账**：`skill-schedule` 是已发布包（0.1.0），本图让它的公开面少了 3 个无消费者的名字。建议发布票记一句。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

> 诚实注（2026-09-12）：本节引文曾被一次正文回写工具吃掉**行内换行**——字符逐字未改，但用户按行给出的几条答案（如第一轮的 Q1–Q7）在下面显示为一段、行与行之间只余空格。原逐行文本见对话记录。

### 立规与目标（2026-09-12）

```
调查卡路里HELP HTML开发的MAP和饼干记账开发HELP HTML的MAP。要求本次任务开发作息管家的HELP HTML。深度学习之前成功的经验。不同之处在于本次开发会遵循新的代码架构规则。过程中所有文档和输出都放在skill-作息管家下面。
```

```
D:\2Study\StudyNotes\SKILLS\作息管家 这是原项目
```

### 第一轮回答（Q1–Q7）

```
1 认可 A 技能侧 ＋ 插件侧最小装机 尽可能按照新架构规则做本次开发，为未来打好坚实基础。 A 老ISSUE可以close并且标记好，按照新的ISSUE的判法来 携带执行
```

### 第二轮回答（Q11–Q16）

```
作息管家 HELP：Q11=A，Q12=A，Q13=A，Q14=A，Q15=A，Q16=A（其余照推荐）
```

```
我们把旧作息管家的场景、唤醒词等信息按照HELP HTML新模板需要传入的参数来准备好。最终产物就是新版help html的样子，内部展示的信息都是旧作息管家的全部场景。
```

### 对齐确认（2026-09-12，用户逐条认可）

```
对作息管家的要求就是现在 会采用 最新的help.html模板，而传入的数据的功能、场景、唤醒词等是和老技能一致的。
```

```
认可。当前MAP我会交给新session执行。你做好收尾工作。
```
