## Destination

作息管家（`packages/skill-schedule`）的页面面做到「老技能的信息 ＋ 新仓架构的形」：

- **五域（写入与同步／查询与浏览／日程与计划／分析与洞察／辅助与管理）下每个唤醒词都走通「说唤醒词 → 命令 → 真 HTML 落盘、回执给绝对路径」**；
- **85 个场景逐个交代**：能出页的进墙，出不了页的在链路页的「有意不出」一节写明理由；
- 页面在**信息组织**上取老技能之长（老侧 18 家族的信息层级与必现块）、在**视觉与双端**上取新仓公共层之长；
- 最终交付一份可点的**链路页**（prompt → 唤醒词 → 命令 → 产物绝对路径）与一面**双端视觉验收墙**。

**「最好看」怎么变成可判定的**（Destination 不允许只有愿望）：由**两次人裁**说话——① `【形状】` 票的**页型配方**由人裁过才铺开；② `【收口】` 票的第二段由人**滚墙给逐格结论并签字**。机器侧只作自检门槛：机审六列 0 命中、双端三档溢出 0、vision 逐页 ≥90（**vision 是提示器，不是证据**）。

## 进度：14%

已完成（都不是子票开工，是图的准备工作）：① 建图（地图 ＋ 15 张子票 ＋ 原生 sub-issue 与 blocked_by 边，脚本自校验逐条一致）；② 建图前六条裁决（用户答复原文见末节）；③ 三轮对抗式审查 ＋ 一轮调整落地——按第一性原理把图改成「主干单写者、支线并行」：新增【交付面】与【种子】两票、`【骨架】` 收成 `【结构】`、`【清单】` 降级为纯取证、八张域票串成写者互斥链，每票补 `## 写面` 段。图体检与自校验双绿（读数见末节）。

下一步：按「任务清单」的执行序开工——【清单·取证】与【结构】两票可并行（写面不相交）；随后【交付面】与【种子】并行；【形状】三张样本交人裁页型；八张域票按序铺开（写者互斥序）；最后【链路页】与【收口】。

**未到 95%**：本图一张票都还没开工。到收口时进度写 95% 必须点名「待用户滚墙肉眼终审并签字」这一件待确认事，未确认不得 close 本图。

## Notes

- **权威来源**：老作息管家 `D:\2Study\StudyNotes\SKILLS\作息管家` 是**内容与版式素材**的权威；**视觉基座**是新仓公共层 `base-paint`（与卡路里、记账同族）。取长补短，不是二选一。
- **必读**：`docs/agents/structure.md`（五条铁律 ＋ 必报五步）、`docs/agents/命令登记纪律.md`、`docs/agents/编排纪律.md`、`docs/agents/视觉验收墙.md`、**`docs/subagent-concurrency-protocol.md`（并发正本）**。编译／测试／git 写一律经 `tooling/run-locked.mjs --ticket <号>` 排队。
- **并发设计（本图的硬口径）**：`packages/skill-schedule` 是**单写者资源**——三处物理共享点绕不开：`tooling/skill-html.snapshot.json`（一个文件覆盖 5 技能 187 件）、三件生成物（生成器扫全包，会把别人的半成品扫进来）、`dist`（混合态读数作废，协议 §2.6）。所以：**主干（写包）任何时刻只有一张票**，八张域票串成**写者互斥链**；**并发放在写面不相交的支线**（清单取证、种子、链路页生成器、证据件撰写）。
- **边的性质**（别把锁当依赖读）：**语义依赖**＝交付面←结构、种子←结构、形状←结构＋交付面＋种子＋清单、八张域票←结构＋形状、链路页←八张域票、收口←链路页；**写者互斥序**＝八张域票之间的 7 条链边（共享快照与 `SKILL.md`，同一时刻只允许一个写者）。
- **每票都有「写面」段**（协议 §1 路径所有权）：只写自己声明的路径；要碰别人的路径＝报编排者转票。
- **图体检**：`node docs/skills/skill-schedule/map-chart.mjs <规格> lint`（查环／外部阻塞／前沿宽度／写面撞车），**关任何一张票之前先跑它**；`verify` 复核子议题计数与每票被阻塞集合的 expected／actual。已过正反自检（正例 exit 0；抽掉一条链边即报撞车 exit 1）。
- **证据件**：`docs/skills/skill-schedule/作息HTML页面清单-调查-20260920.md`（老侧 18 家族／60 产页场景／25 非页面／6 处老文档幻觉／卡路里架构落点／墙与链路页现成件）＋三轮对抗式审查件。工作文档落 `docs/skills/skill-schedule/`。
- **裁决速记（2026-09-20）**：Q1 补「周视图」「首次使用」，语取三条维持出 scope；Q2 墙的格＝**场景**；Q3 取长补短；Q4 能力目录与命令登记都搬（接 `pnpm gen`）；Q5 交互链与飞书都出页、跑不动的写明外部确认出口；Q6 隔离种子库 ＋ 逐页 ≥90 ＋ 页面产物落 `schedule_html/` 根、HELP 仍留 `schedule_html/help/`。
- **本图带墙**（命中 `docs/agents/视觉验收墙.md` §1）：每票各自带产出判据与小墙，收口票跑墙生成器的正反自检并做两段（审查 → 复评）。

## 任务清单

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引，由 map-chart.mjs sync-map 重建 -->

| 票 | 标题 | 类型 | 状态 | 被谁阻塞 |
|---|---|---|---|---|
| [#780](https://github.com/FeatherHunter/ilife/issues/780) | 【结构】五域能力目录 ＋ 命令登记进 src/<能力>/commands.ts ＋ 接 pnpm gen | task | 可做 | — |
| [#781](https://github.com/FeatherHunter/ilife/issues/781) | 【清单·取证】85 场景的老侧事实 ＋ 18 条家族必现块 ＋ 别名表（零设计列） | research | 可做 | — |
| [#782](https://github.com/FeatherHunter/ilife/issues/782) | 【形状】页型配方 ＋ 三张样本双端定形（人裁过再铺开） | prototype | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#843](https://github.com/FeatherHunter/ilife/issues/843) ＋ [#844](https://github.com/FeatherHunter/ilife/issues/844) ＋ [#781](https://github.com/FeatherHunter/ilife/issues/781) |
| [#783](https://github.com/FeatherHunter/ilife/issues/783) | 【写入与同步】记作息一族出页：三件套结果页 ＋ 修正的蓝调 diff ＋ 批量导入回执 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) |
| [#784](https://github.com/FeatherHunter/ilife/issues/784) | 【查询与浏览·单日族】今天总结／查作息／时间轴／详情／状态 出页 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#783](https://github.com/FeatherHunter/ilife/issues/783) |
| [#785](https://github.com/FeatherHunter/ilife/issues/785) | 【查询与浏览·范围与跨天】区间汇总／范围／周视图／24h 概览／多日 出页 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#784](https://github.com/FeatherHunter/ilife/issues/784) |
| [#786](https://github.com/FeatherHunter/ilife/issues/786) | 【查询与浏览·日程族】查日程／标题搜索／三元组查重／已软删／按 ID 出页 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#785](https://github.com/FeatherHunter/ilife/issues/785) |
| [#787](https://github.com/FeatherHunter/ilife/issues/787) | 【日程与计划·写侧】补／改／删计划 ＋ 商量计划预览（过程型） ＋ 制定次日计划 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#786](https://github.com/FeatherHunter/ilife/issues/786) |
| [#788](https://github.com/FeatherHunter/ilife/issues/788) | 【日程与计划·复盘与飞书】复盘四档 ＋ 区间复盘一体页 ＋ 飞书探测／同步回执 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#787](https://github.com/FeatherHunter/ilife/issues/787) |
| [#789](https://github.com/FeatherHunter/ilife/issues/789) | 【分析与洞察】对比两个月／类别深挖／异常检测／写作息摘要／修正作息 出页 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#788](https://github.com/FeatherHunter/ilife/issues/788) |
| [#790](https://github.com/FeatherHunter/ilife/issues/790) | 【辅助与管理】初始化数据库回执 ＋ 首次使用向导 ＋ 飞书探测页 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) ＋ [#782](https://github.com/FeatherHunter/ilife/issues/782) ＋ [#789](https://github.com/FeatherHunter/ilife/issues/789) |
| [#791](https://github.com/FeatherHunter/ilife/issues/791) | 【链路页】prompt → 唤醒词 → 命令 → 产物绝对路径：一份 HTML，点路径即开 | task | 可做 | [#783](https://github.com/FeatherHunter/ilife/issues/783) ＋ [#784](https://github.com/FeatherHunter/ilife/issues/784) ＋ [#785](https://github.com/FeatherHunter/ilife/issues/785) ＋ [#786](https://github.com/FeatherHunter/ilife/issues/786) ＋ [#787](https://github.com/FeatherHunter/ilife/issues/787) ＋ [#788](https://github.com/FeatherHunter/ilife/issues/788) ＋ [#789](https://github.com/FeatherHunter/ilife/issues/789) ＋ [#790](https://github.com/FeatherHunter/ilife/issues/790) |
| [#792](https://github.com/FeatherHunter/ilife/issues/792) | 【收口】双端墙 ＋ 总索引 ＋ 逐格缺陷清单 → 修完复评 ≥90 → 人签字 | task | 可做 | [#791](https://github.com/FeatherHunter/ilife/issues/791) |
| [#843](https://github.com/FeatherHunter/ilife/issues/843) | 【交付面】唤醒词命令缺省落盘 ＋ 产物落点分家 ＋ 命名一处定义 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) |
| [#844](https://github.com/FeatherHunter/ilife/issues/844) | 【种子】隔离种子库：锚点日期 ＋ 覆盖五域的可复现数据 | task | 可做 | [#780](https://github.com/FeatherHunter/ilife/issues/780) |
## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

（尚无已关子票。建图前的六条裁决记在 Notes 的「裁决速记」，用户答复原文在末节采访区。）

## Not yet specified

- **快照门分片**：把 `tooling/skill-html.snapshot.json` 单文件拆成按技能或按页族的分片，可把本图八张域票的串行链压到 3 步左右；代价是动跨技能共用位、中间提交会红。本图不做，留给以后裁。
- 图表件选型（7×24 热力图、24h 时间轴、差异柱、雷达）用公共层现成件还是新造页内件——取决于【形状】。
- 墙的拆法：约 60 格是一面还是按页族拆成两三面。
- 「商量计划」里拉心愿清单（跨技能读备忘录）这条支线。

## Out of scope

- **语取三条**（准备消息／同步作息／增量同步）：背后是外置消息库，仓里已裁「以外置为准，不迁」，老侧这三条本身也只出 JSON、不产 HTML。
- **老侧死码家族**「记作息回执」与**老文档幻觉** `render-record-summary`：不实现。
- **定时任务与早睡提醒**：老侧 Cron 已删，外部定时为准。
- **面板与侧栏**（插件侧那条线）：本图只在技能侧出 HTML。
- **老侧 HELP 页本身的视觉复刻**：HELP 已走共享模板，本图不动它。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 第一轮·建图前的澄清（2026-09-20）

澄清件：`docs/skills/skill-schedule/决策待确认-作息唤醒词页面开发.html`（六问六答，含推荐与利弊）。用户答复原文：

```
A
B
Q3 我们在老技能UI和新设计上 取长补短设计最好看的UI
Q4 A
Q5 A
Q6 A
```

> 位次读法（AI 记）：前两行没有编号，按澄清件的问序读作 **Q1=A、Q2=B**；其后 Q3–Q6 逐条带编号。

### 第二轮·对抗式审查（2026-09-20）

```
从第一性原理出发 对抗式审查下 MAP
对抗式审查当前你的推荐方案，并且从第一性原理出发，给出优化后的方案
从第一性原理出发，当前作息管家这个MAP下面的ISSUE都执行完毕后可以达到我的目标吗？并且复述我的目标是什么
从第一性原理出发进行调整，并且对抗式审查，并且要求 票之间的阻塞关系、并发执行等需要设计好，避免出现死锁，避免互相之间有很强烈的干扰。
将你的问题和回答以清晰的形式输出到html文件中：…
再进行一轮的检查和调整。然后任务结束
```
