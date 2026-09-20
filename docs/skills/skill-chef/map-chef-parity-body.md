## Destination

`packages/skill-chef` 承接老技能（`D:\2Study\StudyNotes\SKILLS\私家大厨`，Python 实现）的**全部功能与页面**：以新仓 HELP HTML 的 **10 个功能域**为划分依据（做菜／查看／搜索筛选／修改／历史／采购／录入／派生／开始使用／数据管理），**48 张场景卡逐卡在新仓走通、事实正确、出双端自适应的过程型／结果型／回执型 HTML**；**50 条唤醒词**（33 个老组名 ＋ 13 条新表多出词 ＋ 4 条 HELP 词）条条拿得到真实产物；一页 **`prompt → 唤醒词 → 命令 → HTML 绝对路径`** 链路总表可点开；最后用**视觉验收墙**（手机墙 390 宽 ＋ 桌面墙 1280 宽）＋ **vision_router 终审 ≥90 分**验收。老技能退休为**只读对照**。

两条同时达成即本图完成：① 48 卡逐卡有可点开的双端 HTML、链路总表 50 行无死链；② 墙 ＋ 逐格缺陷清单 ＋ 自检正反例退出码三样齐，且 vision_router 终审 ≥90 分。

## Notes

### 划分与口径（本图的上位依据）

- **域与卡的划分依据＝新仓 HELP HTML**（`packages/skill-chef/src/help/sceneData.ts`，机器生成、禁手改）：**10 域／33 二级组／48 卡**，测试逐条钉死在 `test/scene-data.test.mjs:86-101`。
- **场景与唤醒词的权威清单＝老仓 `D:\2Study\StudyNotes\SKILLS\私家大厨\scenes\*.yaml`**（`#682` C1-1）：老件实测 **10 域／48 场景／33 组名／20 个 HTML 模板**。老 48 场景 ↔ 新 48 卡**一一对应**，域与组名两边**逐字同形**。
- ⚠️ **老件文档不可当权威**：`SKILL.md` 里三份唤醒词总表口径互不一致（标称 39、实列 40、路由表缺 J 组且编号重复）；`references/commands.md` 与实现有 **15 条不一致**。权威只取**场景资产 ＋ 源码**。
- **50 条唤醒词的口径**：33 个老组名 ＋ 13 条新表多出词（看菜／看菜谱／搜菜／查食材／加菜／开始做菜／继续做菜／完成做菜／排除可选／查清单／清空清单／补录做菜／改评分）＋ 4 条 HELP 词（私家大厨HELP／菜谱HELP／查帮助／能做什么）。4 条 HELP 词不另出业务页（复用已交付的 HELP 文件）。

### 本图开工前已裁定的十条口径（2026-09-21，维护者逐条裁）

1. **唤醒词边界**：并集 50 条（见上）。
2. **覆盖判据**：① 50 条唤醒词条条有真实可达产物；② 48 张卡逐卡在册子里有落点（可共用同一份产物）。**份数不设死数**，由对账表证明。
3. **交付深度**：**全量 parity**——读侧真数据 ＋ 写侧真落库，按域切票、逐域自证；撞老库 schema 缺口当场立小票。
4. **老库边界**：**老 schema 为权威、读写同一个库、本次不改 schema**。新技能配置走 YAML 配置文件（`~/.ilife/chef.yaml`），环境变量不参与配置。
5. **视觉基准**：**内容以老件为权威（含信息架构：分区与顺序），视觉走新共享渲染层重做**；老件 20 个模板**不作视觉基准**（它是全库唯一没迁过通用模板的技能）。
6. **落点**：**新增配置键 `html.sceneDir`（默认 `cook_html`）**，`html.dir` 语义与默认值**一动不动**；域目录取**中文 label**（与老件模板目录同形）。
7. **链路总表**：器械住 `docs/skills/skill-chef/`（照 `docs/skills/skill-calorie/t369-链路总表.mjs`）；页落**验收副本目录**、链接用**绝对路径**、进册子一格。
8. **13 条新表多出词**：**各出各的产物**（同一命令不同参数 → 内容不同，模板相同不算冗余）；链路总表 50 行 = 50 个不重复路径。
9. **验收口径**：五维各 20 分（信息层级／双端自适应／文案精炼／视觉生动／风格一致），逐页打分 ＋ 收口票整批复评 ≥90；390 手机墙 ＋ 1280 桌面墙，每格标「该确认什么」。
10. **数据隔离**：**批量真跑跑副本库**（复制 `chef_data.db` 到临时目录，`db.dir` 指向它；写侧照样真写、真落库、真出回执，只是不碰真库）。隔离通道是测试基座既有口子 `ILIFE_CONFIG_DIR`，票面写明 `CHANNEL-PENDING-#756`，**不抢 #756 的裁定**。

### 三层目录（三条硬约束各就各位，别混成一层）

| 层 | 落点 | 用途 | 约束来源 |
|---|---|---|---|
| ① 技能真产物 | `<数据目录>/cook_html/<域中文名>/…` | 用户日常使用 | 配置键 `html.sceneDir` |
| ② 验收副本产物 | `.scratch/<批名>/` | 副本库跑全量得来，**与墙页同目录** | 验收墙 §2／§7（iframe 走相对路径，跨目录即死链） |
| ③ 链路总表页 | 落 ② 同目录，链接用**绝对路径指向 ②** | 给人点开看链路 | 用户要求「点绝对产物路径的 URL 就能打开」 |

链路总表页顶须如实写「本页链接指向验收副本」。

### 六条 HTML 要求（用户原话，逐条是本图的验收面）

1. 自适应桌面端与手机端；2. 手机端适配能力照 HELP HTML；3. UI 上符合设计师审美（代码层面审查）；4. 文字不出现冗余与不合理；5. 内容需要 `;`／`|`／`·` 分割时＝**该做 UI 设计**，不许用符号偷懒；6. 用 vision_router 仔细审查并优化。

### 必读件

`docs/agents/structure.md`（五条铁律／结构标准／必报五步）｜`docs/agents/编排纪律.md`（地图设计者十一条／执行者十二条）｜`docs/agents/视觉验收墙.md`｜`docs/agents/命令登记纪律.md`｜`docs/agents/wording.md`（用词与术语纪律）｜`docs/subagent-concurrency-protocol.md`（共享工作区硬规矩）｜`docs/agents/issue-tracker.md`（Wayfinding operations）。

### 已否决项（`#682` 台账，按条目号引，别重走）

A3-1 老模板**不像素复刻**｜A5-3 `#433`「回执页共用件提升公共层」**已废弃，别再提**｜A5-5 `commandSpec.ts` 不上移｜A5-10 `esc` 三字符 ≠ 公共层 `escapeHtml` 五字符，不得互换｜**A6-21 技能包之间零依赖**｜A6-2 其余五域只留雾区、毕业成各自 map｜A6-8 超线件挂号不拆｜C1-1 清单权威＝老仓 `scenes/*.yaml`｜C3-12 视觉模型报的缺陷**必须回产物 grep 核对**。

### 地面真相（只读读数，四份调查报告）

- 四份调查报告（本图开工前跑的四支只读调查）：`docs/skills/skill-chef/parity-A-老大厨场景清单.md`｜`parity-B-新大厨现状.md`｜`parity-C-卡路里架构.md`｜`parity-D-先例与台账.md`。
- **新件缺口**（B 报告，48 条逐条判定）：已实现 **19** ／仅 HELP 文案（桩）**14** ／有命令无页面 **0** ／其他 **15**（含**路由错位 3**：`筛选食材`／`筛选口味`／`筛选季节` 的 `filter` 在 `cmd_read.ts:176` 被映射成 `cuisine`）。
- ⚠️ **今天业务命令的 HTML 不是页面**：`cmd_read.ts:437` 只有 HELP 走 `fillTemplate(loadTemplate(...))`；`:446` 的 `--html` 直接 `renderEnvelopeHtml(env)`，而该函数（`render/html.ts:41-56`）只吐**一个 `<section>` 裸段**，`SHARED_CSS` 是一行 11 条样式（`html.ts:72`）。⇒「所有唤醒词对应 HTML」的**主体工作量在页面族**（横向票③），不在接线。
- ⚠️ **绝对路径回执只有 HELP 有**：`delivery{mode,path,bytes}` 只有 `chef.help.lookup` 产生；其余 7 键默认不落 HTML、`--html` 也不回显路径。⇒ 链路总表的绝对路径由**驱动器自选 `--html <路径>` 并落册**，不改命令面（照 `t369-链路总表.mjs`：链路页只读 `manifest.json`）。
- **命令面**：12 条（8 条唤醒词命令 ＋ 4 条设置页专用 `chef.config.*`）。唤醒词表 `WAKE_TABLE` 37 条（`src/policy/wakewords.ts:12-50`）。模板 8 件（16 行壳 ＋ 三个标记）。
- **配置**：`CHEF_CONFIG_DEFAULTS`（`src/config.ts:26-30`）＝ `db.dir`／`db.name`／`html.dir`（默认 `cook_html/help`）／`files.help`／`files.lookup`。`base-link-core/src/config/` **无版本与迁移机制**（`version`／`migrat`／`schema` 零命中）⇒ 改默认值对已有配置文件无效，故取「新增键」。
- ⚠️ **真实库与缺省库不是同一个地方**（`t769` 实测）：真实库＝`D:\2Study\StudyNotes\.db\chef_data.db`（294,912 B，2026-08-09 13:38，`integrity_check=ok`，17 张用户表／28 条索引）；而新技能缺省配置算出来的是 `C:\Users\辰辰洋洋\.ilife\data\chef_data.db`，**该文件不存在** ⇒ 按缺省跑会新建空库、接不上老库。本图一切真跑与副本**从真实库复制**。
- ⚠️ **老库三条 NOT NULL 与卡面「选填」冲突**（`t769` 实测）：`ingredients.quantity`／`cooking_steps.duration_minutes`／`recipe_history.rating` 都是 `NOT NULL`，而新技能写入路径缺省传 `NULL` ⇒ 副本上实测抛 `IntegrityError`。48 卡结论分布＝**可落 29／需降级 10／必须立票 9**（9 张见票 14）。
- ⚠️ **老文档与老库冲突 15 条**（按表归并，字段级 53 条）：12 张表的可空性整表不符、2 处列只在库里有（`step_ingredients.unit`／`recipe_history.photo`）、索引说明只列 12 条而实际 28 条。**再次印证：权威取库结构 ＋ 源码，不取文档。**
- **超线件**（告警线 350 LF，`packages/skill-chef/AGENTS.md`）：`src/cli/cmd_read.ts` 460／`src/fetch/db.ts` 451／`scripts/gen-help-assets.mjs` 436 —— 按 A6-8 **挂号不拆**，但本图碰到它们时要按第四步当场报「已超线，需要根据规则进行重构。」
- `packages/skill-chef/AGENTS.md:23` 关于「本包没有 `src/help/manifest.ts`」**已过期**（该件实际存在，41 行）。
- **器械缺口**：`skill-chef` 名下**墙生成器 0 个、链路总表 0 个** ⇒ 本图必须新造，照 `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs` 起手并**带上 `dropped` 判据**（反面教材 `t154-mobile-wall.mjs` 缺它＝假绿灯）。

### 并发与写集（本图的死锁与干扰设计）

**两条第一性原理**：死锁的根源是**环**；干扰的根源是**两张票同写一个文件**。据此定了三件事：

1. **整包落位前置**（票 16）：7 张域票若各自去共用位里搬自己那一份，会在 `cli`／`fetch`／`policy`／`render` 同一批文件上互相踩。所以由**一个写者**先把其余 9 个域机械落位（只搬不改），之后域票只碰自己目录。
2. **结构票只验「行为不变」、功能票只验「功能变对」**：票 16 的判据是全绿测试 ＋ HTML 快照 changed=0；域票的判据是本域卡逐卡跑通。两类判据不打架。
3. **形状先于铺开**：`票 1 → 票 16 → 票 3 → 票 5–11 → 收口 12 → 13`，另有 `票 2／14／15／17` 在各自位置入图，`票 18` 收在域票之后。所有边单向（结构先于功能、形状先于铺开、聚合后于分片），**建边前先做拓扑排序，有环即拒绝**。

**写集表**（谁能改哪些路径；越界先立票）：

| 票 | 可写路径 | 与其他票的关系 |
|---|---|---|
| 1 形状 | `src/history/**`、`src/config.ts`、`scripts/gen-cli.mjs`、生成物 `src/cli/keys.ts` | 与 16 互斥（同碰共用位） |
| 16 落位 | `src/<其余 9 域>/**`、`src/{cli,fetch,policy,render}/**` | **必须早于域票**；与 1、3 串行 |
| 3 页面族 | `src/render/**`（票 16 之后再动）、`docs/skills/skill-chef/t768-*` | 与 16 串行（同碰渲染层） |
| 5–11 域票 | **只许** `src/<自己那一域>/**` ＋ 自己票号的文档 ＋ `.scratch/t<票号>/**` | 域与域**互不相交，可全并行** |
| 12 收口 A | `.scratch/<批名>/**`、`docs/skills/skill-chef/t777-*` | 只读 7 份册子片段 |
| 13 收口 B | `.scratch/<批名>/**`、`docs/skills/skill-chef/t778-*` | 只读册子 |
| 17 沙箱 | `docs/skills/skill-chef/t17-*`、本机 `~/.ilife/chef.yaml` | **不碰 `src/**`** |
| 18 说明面 | `SKILL.md` 快照区、`src/help/sceneData.ts`（生成物）、`scripts/gen-help-assets.mjs` | 单写者，收在域票之后 |

**共用生成物**（`src/cli/keys.ts` 等）：谁改完自己的域，**提交前重跑 `pnpm gen`**，以重跑结果为准（确定性、幂等，重跑即收敛）；`gen:check` 必须绿。金快照类件同理。

**串行点**：`pnpm gen`／`tsc -b`／`node --test` 一律走 `node tooling/run-locked.mjs --ticket <票号> -- <命令>`；并行窗口数照 `docs/subagent-concurrency-protocol.md`。

**数据隔离**：一票一份副本（`.scratch/t<票号>/chef_data.db`，由票 17 的沙箱器械生成），**不许与其他票共用副本**；真实库全程只读。

**为什么不会死锁**：见上第 3 条——边全部单向，且建边脚本 `t765-v2.mjs` 在动手前跑 Kahn 拓扑排序，有环即非零退出、一张边都不建。

### 纪律

- **会话纪律**：不弹窗问，一律写在对话正文里问。
- **用词纪律**：照 `docs/agents/wording.md`，禁用黑话与自造简称。
- **正文格式**：真实换行、禁字面 `\n`、禁 BOM；写回 issue 正文一律以文件方式提交。
- **并发纪律**：共享工作区——禁切分支／`reset`／`stash`／`clean`；只 `git add <自己声明的路径>` ＋ `git commit -- <路径>`；编译与测试经 `node tooling/run-locked.mjs --ticket <票号> -- <命令>`。
- **文档落点**：代码与产物落 `packages/skill-chef/`；文档落 `docs/skills/skill-chef/`（票号前缀）；器械入仓。
- **票面体例**：`## Question` ＋ 五段（目标／验收命令／不许动的东西／交付物路径／遗留出口）＋ `## 进度：0%` ＋ `下一步：`（脚本 `checkShape` 强校验，缺一段退票）。
- **用户原话**：本图一切决策的源头在文末「用户原话采访区」；执行中与采访区冲突的，以采访区为准。

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [【研究】老库 schema 与写侧字段对账：48 卡逐卡列出要写的表与字段](https://github.com/FeatherHunter/ilife/issues/769) — 交付 `t769-写侧字段对账.md`（352 行）＋ 校验脚本 `t769-schema-audit.mjs`（正例 `卡 48／行齐 48／未知 0` exit 0；反例删一行 → exit 1 并点名）。真实库＝`D:\2Study\StudyNotes\.db\chef_data.db`；48 卡＝**可落 29／需降级 10／必须立票 9**；三条 NOT NULL 与卡面「选填」冲突（毕业成票 14）、两处数据库层全局缺口（`recipes.name` 唯一约束在老库未生效、新技能未开 `foreign_keys`）（毕业成票 15）。

## Not yet specified

- **过程型页面里「确认页／进度页／回执页」的具体形态**：等横向票③的原型由维护者裁过形状才知道。
- **老件 20 个模板 → 新页面族的最终页型表**：等横向票②（信息架构对照）与③（页面族）交出对照表。
- **采购域与居家管家的联动细节**：`stock_check` 要联动查询，但 `#682` A6-21 明令技能包零依赖 ⇒ 走调用契约还是降级为提示，等该域纵向票走到再定。
- **13 条新表多出词的 prompt 示例**：新表只有短语、无场景资产，示例怎么写（沿用同域卡的 prompt 还是新写）待②对账表交出后定。
- **数据管理域的备份／导入产物落点与命名**：`t769` 已给出「老库只有 17 张用户表、无迁移版本表」的读数，但产物落点与命名仍未定，等该域纵向票走到再裁。
- **新技能缺省库目录不接老库**：已由票 17（运行面沙箱）认领——器械 ＋ 本机 `db.dir` 指向真实库 ＋ 端到端读数，不再挂在这里。
- **收口时墙按几个页族拆几张**：取决于最终产物页数与体积（验收墙 §6.3「几十格是舒适区」，带大图要拆）。

## Out of scope

- **插件侧**（`dsh-chef` 设置页／面板功能页）：属 `#745` 那条线，本图只做技能侧。
- **npm 发版**（抬版本／发布／真机安装验证）：另立收口票。
- **其余五个技能**（卡路里／记账／居家管家／作息／备忘）：一行不动。
- **老库 schema 变更**：本图不改 schema；确需改则单独立票出图。
- **老件（Python 实现）本身的修改**：只读对照，不退休入库、不搬文件。
- **技能设置页展示新键 `html.sceneDir`**：属 `#745` 的设置页收窄那条线。
- **`ILIFE_CONFIG_DIR` 这条隔离通道的裁定**：属 OPEN 票 `#756`，本图只声明 `CHANNEL-PENDING-#756`。

## 任务清单

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引 -->

**切法**：横向票先立（形状 1／资产单一源 2／页面族 3／写侧对账 4），紧接着**整包落位 16**（并发前提：一个写者先把其余 9 域搬进各自目录，域票才能只碰自己那份），再开 7 张纵向域票（按卡数分组、小域合并，**相互零写集重叠、可全并行**），最后两张收口票串行收尾（12 聚片段 → 13 出墙）。另有 3 张补位票：2 张裁定票（14／15，挡写侧纵向票）与运行面沙箱 17（挡全部纵向票）、说明面同步 18（收在域票之后）。**页面族票挡全部纵向票**（否则各域各造一套样式，撞概念唯一）。

| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
<!-- PLAN-ROWS-START -->
| 1 | [[规格] skill-chef 形状票：历史域试点 ＋ 派生链 ＋ 配置键 html.sceneDir](https://github.com/FeatherHunter/ilife/issues/766) | task | — |
| 2 | [[规格] 域与唤醒词资产单一源：老 scenes/*.yaml → 仓内 typed 资产 ＋ 50 词／48 卡对账表](https://github.com/FeatherHunter/ilife/issues/767) | task | — |
| 3 | [[原型] 页面族：过程型／结果型／回执型三族 ＋ 双端自适应（先裁形状再铺开）](https://github.com/FeatherHunter/ilife/issues/768) | prototype | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) |
| 4 | [[研究] 老库 schema 与写侧字段对账：48 卡逐卡列出要写的表与字段](https://github.com/FeatherHunter/ilife/issues/769) | research | — |
| 5 | [查看域：端到端搬迁（8 卡／5 组，纯读）](https://github.com/FeatherHunter/ilife/issues/770) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) |
| 6 | [搜索筛选域：端到端搬迁（13 卡；含 5 张待开发 ＋ 3 条路由错位）](https://github.com/FeatherHunter/ilife/issues/771) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) |
| 7 | [做菜域：端到端搬迁（5 卡，过程型为主）](https://github.com/FeatherHunter/ilife/issues/772) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) |
| 8 | [录入域：端到端搬迁（6 卡，写侧）](https://github.com/FeatherHunter/ilife/issues/773) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/769) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) ＋ [票 14](https://github.com/FeatherHunter/ilife/issues/818) ＋ [票 15](https://github.com/FeatherHunter/ilife/issues/819) |
| 9 | [修改域：端到端搬迁（4 卡，写侧）](https://github.com/FeatherHunter/ilife/issues/774) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/769) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) ＋ [票 14](https://github.com/FeatherHunter/ilife/issues/818) ＋ [票 15](https://github.com/FeatherHunter/ilife/issues/819) |
| 10 | [历史域：端到端搬迁（4 卡；记录做菜＝写、查看历史／查看统计＝读）](https://github.com/FeatherHunter/ilife/issues/775) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/769) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) ＋ [票 14](https://github.com/FeatherHunter/ilife/issues/818) |
| 11 | [小域合并：派生 3 ＋ 采购 1 ＋ 开始使用 1 ＋ 数据管理 3（8 卡）](https://github.com/FeatherHunter/ilife/issues/776) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/768) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/769) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/839) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/840) ＋ [票 14](https://github.com/FeatherHunter/ilife/issues/818) ＋ [票 15](https://github.com/FeatherHunter/ilife/issues/819) |
| 12 | [[收口 A] 链路总表 ＋ 产物册子 ＋ 批量驱动器（验收副本）](https://github.com/FeatherHunter/ilife/issues/777) | task | [票 5](https://github.com/FeatherHunter/ilife/issues/770) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/771) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/772) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/773) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/774) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/775) ＋ [票 11](https://github.com/FeatherHunter/ilife/issues/776) |
| 13 | [[收口 B] 双端视觉验收墙 ＋ vision_router 终审 ≥90 分](https://github.com/FeatherHunter/ilife/issues/778) | task | [票 12](https://github.com/FeatherHunter/ilife/issues/777) |
| 14 | [【裁定】老库三条 NOT NULL 与卡面「选填」的冲突：9 张卡怎么落](https://github.com/FeatherHunter/ilife/issues/818) | grilling | — |
| 15 | [【裁定】数据库层两处全局缺口：recipes.name 唯一约束在老库未生效 ＋ 新技能未开 foreign_keys](https://github.com/FeatherHunter/ilife/issues/819) | grilling | — |
| 16 | [【规格·落位】整包按形状落位：其余 9 域只搬不改 ＋ 四个工种目录定去留（并发前提）](https://github.com/FeatherHunter/ilife/issues/839) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/766) |
| 17 | [【实施】运行面沙箱：副本库器械 ＋ 本机配置指向真实库 ＋ 端到端读数](https://github.com/FeatherHunter/ilife/issues/840) | task | — |
| 18 | [【实施】说明面同步：SKILL.md 快照 37→50 ＋ HELP 页 14 张卡【待开发】翻可用](https://github.com/FeatherHunter/ilife/issues/841) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/767) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/770) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/771) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/772) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/773) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/774) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/775) ＋ [票 11](https://github.com/FeatherHunter/ilife/issues/776) |
<!-- PLAN-ROWS-END -->

## 进度：15%

**画图完成（2026-09-21）**：18 张子票已建（横向 4 ＋ 纵向 7 ＋ 收口 2 ＋ 裁定 2 ＋ 补位 3），原生子议题边与原生阻塞边逐项校验通过（expected＝actual），且**阻塞关系经拓扑校验无环**。

**研究票已解（2026-09-21）**：[【研究】老库 schema 与写侧字段对账](https://github.com/FeatherHunter/ilife/issues/769) 已关，结论见 Decisions so far；据它毕业出两张裁定票（票 14 老库 NOT NULL 与卡面「选填」冲突、票 15 数据库层两处全局缺口），并把两条地面真相写进 Notes。

**二轮补票（2026-09-21，并发设计版）**：按「目标 → 缺口 → 票」重推，补三张——**票 16 整包落位**（从「最后收口」改成**前置**，理由见「并发与写集」）、**票 17 运行面沙箱**、**票 18 说明面同步**；并给票 1 加「加域零改共用位」判据、票 3 扩容成「页面族 ＋ 页面质量门」（机审六列 ＋ 代码层 UI 审查清单）、7 张域票各加三条口径（过程性 vision 审查／册子片段／副本库沙箱）、票 12 加「点击实测」。

**下一步**：开 frontier 五张——票 1 形状票、票 2 资产单一源、票 17 运行面沙箱、票 14／15 两张裁定（等你裁）；票 16 等票 1 过关后立刻开（它是域票的并发前提）。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 需求原话（2026-09-21）

```
需求描述：D:\2Study\StudyNotes\SKILLS\私家大厨 是老的私家大厨 D:\ilife\packages\skill-chef是新的私家大厨，新的私家大厨只重构了部分功能。老私家大厨是权威来源。参考老私家大厨，以新私家大厨的HELP HTML中的功能领域进行划分。每个功能域下面的场景都要在新私家大厨中开发好。代码架构需要解耦，可以参考新卡路里的架构设计。
1. 私家大厨的所有唤醒词的对应HTML都开发完毕
2. 链路：prompt → 唤醒词 → 命令 → HTML 绝对路径 => 输出在一个HTML中，在HTML中我点击 绝对产物路径的某个URL就能跳转打开这个HTML
3. 最终所有完成的html用 D:\ilife\docs\agents\视觉验收墙.md 视觉验收墙来给我验收。

开发的html要求如下：
1. 需要自适应桌面端和手机端
2. 手机端的适配能力参考help html
3. UI上代码层面审查下是否符合UI设计师审美
4. 里面的文字不能出现冗余和不合理
5. 展示的信息要生动形象，当一个内容需要通过“;”、“|”和“·”分割时代表需要进行UI上的设计，该问题是用这些符号简化了UI展示的设计
6. 使用vision_router相关能力在视觉上进行仔细的审查，找到设计不合理之处，并进行优化

最终：在全部优化落地后，最后一次用vision_router进行最终审查，要求打分，100分下需要能有90分。
```

### 两轮澄清的裁定（2026-09-21，逐字）

```
Q1 取并集 50 条。4条HELP是什么意思？我想法就是应该是当前HELP HTML中的全部内容（私家大厨的）
Q2 HTML文件数量不确定，应该取决于实际的开发中需要的过程型\结果型\回执型HTML等
Q3 甲
Q4 老 schema 为权威、直接读写同一个库、本次不改 schema。 新技能不会再有环境变量，我们有yaml配置文件。
Q5 内容以老件为权威，视觉走新共享渲染层重做
Q6 不清楚这个问题是在干什么。
Q7 做
Q8 认可
Q9  全部划出本图（发版另立收口票） 我们只开发私家大厨SKILL
```

第二轮（对十个推荐方案做了两遍对抗式审查后）：`那就按照你推荐的来`。

