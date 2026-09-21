## Destination

在 DSH 里说出一句居家管家唤醒词 → **拿到那份页面的绝对路径**（落盘 ＋ 可打开），且 **70 条场景各有自己的真页面**（73 条减去联动域 3 条：联动总览／记到卡路里／记到记账，已裁不做）：页面按 **HELP 一级分组解耦落位**（9 个域里**实建 8 个域目录**：`link` 只留登记位、不建目录），由 **46 个页族**承载 70 条场景（票 1 册子实测：老 yaml 引用 49 个模板，减 `link` 域 3 族），**信息结构对齐老技能的对应页面**，**UI 走新仓共用件与语言**（老技能只作功能来源与信息结构来源）；每份产物都经**真命令链**（prompt → 唤醒词 → 命令 → 落盘）与**仓内种子库**产出，汇总成一张**链路总览页**（行内点绝对路径的 URL 即可跳转打开），再由 `docs/agents/视觉验收墙.md` 的双端墙（手机 390 宽／桌面 1280 宽，**8 个域成对共 16 张**，`link` 无产物不出墙）交维护者终审。

> **判定口径（五条同时达成即本图完成）**：① 70 条场景各有真产物且能点开 ② 链路总览页行内链接可跳转 ③ 墙生成器自检**正例 exit 0 ＋ 反例 exit 1 并点名**都走过 ④ 逐页视觉复核记录齐、整批综合分 **≥90/100**（vision 复核）⑤ 维护者终审「过」。

## 进度：5%

**口径**：分母＝**20 张在役子票 ＋ 1 张退役**（画图本身不计入分子）。**1/21 关闭**——票 1（#798 册子，research）已关。

**图已按第一性原理重推（v3）并经两席对抗式审查**：前两稿都被**打回**（P0 共 9 条），处置全档见 `scene-pages-graph-design.md` §五。要点四条：① **票 21（命名裁决）并入票 2**，#836 退役；② **票 8 由「样板票」改为「页面脚手架」**——把「照抄样板」这张卡住 11 张票的软拷贝门换成机器可复制的硬拷贝；③ **票 3 扩成「机器落地」**——照卡路里造通用分派口＋目录扫描生成器＋派生件入仓，**这台机器是「按域不相交」的前提**（审查实测：今天每张域票都得改五处共用件）；④ **域票写集缩小到页族文件**（`templates/<域>/<族>.html` ＋ `src/<域>/pages/<族>.ts`），派生件与共用位单写者归票 3。

**接线脚本四道机器门全绿**：① 无环（传递闭包）② 写集干涉（无序票之间写集不相交）③ frontier 非空 ④ 计数与表行数一致；另含边**双向收敛**（缺的补、多的删——旧版只加不删，改 `blockedBy` 会留下旧边、进而成环：审查已实算复现过 `4 → 21 → 9 → 8 → 4`）与票面／地图正文的逐字同步。

**frontier（4 张，其中不依赖人 3 张）**：票 2（#799 契约冻结，grilling，**HITL：要你点头**）／票 5（#802 种子数据）／票 6（#803 判据件）／票 7（#804 生成器）。

下一步：可立刻并行开工的是 **#802／#803／#804** 三张 AFK 票；**#799 契约**等你点头（它阻塞票 3 与全部 11 张域票，是全图唯一的人工门）。改票面一律改 `html-scenes-tickets/<序>-<短名>.md` 再跑 `node docs/skills/skill-home/html-scenes-wire.mjs`——推票面、收敛边、回写本文、跑四道门。

下一步：等你裁 #836（三条命名规则候选，见票面）；同时可并行认领 #803（判据件）。改票面一律改 `html-scenes-tickets/<序>-<短名>.md` 再跑 `node docs/skills/skill-home/html-scenes-wire.mjs`——脚本会推票面、建缺的边、回写本表与本文、并自校验。

## Notes

- **本图要交货**：这里「只出决定、不出东西」不适用——终点是 70 份能打开的页面 ＋ 一张链路总览页 ＋ 双端验收墙（用户需求原话：「每个功能域下面的场景都要在新居家管家中开发好」「所有唤醒词的对应 HTML 都开发完毕」）。
- **会话纪律**：不弹窗问，一律写在对话正文里（`AGENTS.md`）。
- **用户原话**：本图一切决策的源头在文末「用户原话采访区」；执行中与采访区冲突的，以采访区为准。
- **重复检查**：#183（居家管家HELP真标准）明写「居家管家其余场景页（过程型／结果型 HTML）与图形页」**出本图目的地**、『`packages/skill-home/src` 整包按 HELP 一级分组重排』**另立票**——本图正是承接这两条；#745（六家技能设置页收窄）是设置面，与本图无关。2026-09-20 查 `wayfinder:map` 全量与关键词搜索，无既有 map 覆盖本需求，故本图为**新增**。
- **唤醒词层审计（2026-09-20，逐条对账；**修正了本图前一版的口径**）**：三处实测——① **20 条词是「三不管」**：有路由、却没有任何场景规格（没有 prompt、没有 `type`、没有页面归属，HELP 里查不到，验收墙没有格），**没有任何口径能判它对不对**；② **42 条变体是孤儿内容**：`scenarios.yaml` 逐条写了同义／口语／模糊说法（`帮我记一下`、`数数这里`…），而 HELP 生成器**显式跳过 `variants:` 子树**（`packages/skill-home/AGENTS.md` 立规、`scripts/lib/yaml-subset.mjs` 不收）、路由表 **0 条**认它们；③ 3 条场景无路由＝联动三条（已裁不做）✓。**前一版写的「没有孤儿唤醒词」是错的**——那只证了「页族可达」，没证「有规格」；唤醒词是**场景的入口**，词与场景脱钩就既不可验收、也不该存在。处置：开 **票 22「唤醒词层规格」**（四分类＋20 条逐条归宿＋42 条变体识别口径，HITL），落地与机器门（三向对账＋逐行对照）接进票 3，票 2 ⑦ 只留页面侧的「`(key, preset) → 页族`」两层解析。另两个已补的洞：**页族解析**（`src/render/templates.ts:33-58` 的 1:1 映射表达不了 46 个页族）与**机审六列里「双端自适应」「触摸目标」无人负责**（已扩进票 6，新件 `scripts/audit-responsive.mjs`）。**仍留在图外的一条**：发版装机（在 DSH 里真说唤醒词）没有任何票，要另立。
- **变更协议（防走散）**：任一票发现契约不对——**回写票 2（#799）／票 22（#845）并当场补票**，不许在票内私自放宽；契约一改，受影响的域票按**写集边界**各自重跑自己的判据（写集不相交 ⇒ 别人不受累）。判据件／骨架／生成器的规则要改，同样回写票 6／票 8／票 7。
- **判据盯目的地，不盯过程**：域票的验收不许只证「文件在、不丑」——必须证「**这条场景该显示的字段／操作都在**」（结构判据件 `audit-page-blocks.mjs`，必需块清单由契约给、骨架登记）与「**双端都不塌**」（`audit-responsive.mjs`）。收口票也一样：**判据是逐维度清单，分数只是摘要**，且改与评分开派。第三轮自审的完整处置见 `scene-pages-graph-design.md` §七。
- **地面真相（2026-09-20 实测，只读）**，全档在两份报告里（见下「本图产物索引」）：
  - 新技能 21 个页面模板**全部是 16 行／270–288 字节的骨架**（只有 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CONTENT-->` 三个标记），正文由 `renderEnvelopeHtml()`（`src/render/html.ts:27-47`）按数据形状统一生成——**73 条场景走的是同一张页换数据**。
  - 老技能对同样 73 条场景引用 **49 个真页面模板**（老 `templates/` 全树 67 个 `.html`，全部存在；其中 18 个是 v2.0 前的 legacy 平铺件）。
  - 新技能**默认不落 HTML**：只有 `--html <路径>`（`src/cli/cmd_read.ts:850-859`）或 HELP 键的 `delivery`（`:860-868`）才物化成文件；常规跑一条命令只回 stdout 的 envelope JSON。老技能写类场景**默认落 HTML**（老 `scripts/render/__init__.py:132-146`）。
  - `src/` 第一层是 `cli`／`fetch`／`policy`／`render`／`help` 五个**工种名**，**没有任何 `src/<能力>/` 目录**；21 条命令键全挤在 `src/cli/cmd_read.ts` 的 `switch` 里（该件实测 **884 行**／54212 字节，包内 `AGENTS.md` 台账写 876 行，**已过期**）。卡路里同位置是 `src/<能力>/commands.ts` ＋ `routes.ts`。
  - 内容骨架 = **73 场景／9 域／30 二级组**（`src/help/scenarios.yaml` 与老 `references/scenarios.yaml` **逐字节相同**，46267 字节）。9 域 key：`items`／`space`／`outfit`／`stats`／`express`／`receipt`／`family`／`setup`／`link`。
  - 唤醒词表 **91 条**，其中 3 条（联动总览／记到卡路里／记到记账）在 `src/policy/wakewords.ts:115` 显式废弃；另有 **20 条**兼容词在 73 条场景里没有对应条目。
  - **`借用` 唤醒词只通读侧**（`wakewords.ts:58` → `home.care.query`），写侧「借出／借入／归还／催还」（`cmd_read.ts:757-771`）**无任何唤醒词可达**——而 SM7-1 的场景标题就是「借用管理(借出/借入/归还/催还)」。
  - 老技能票据凭证域 **11 条写类场景不落 HTML**（只打 JSON 回执）、家庭协作 2 条只在带 `--output` 时落 HTML（用户已裁：**按需求补齐**）。
  - **本机视觉工具只接受工作区内的文件**（拿 `D:\2Study\StudyNotes\.db\home_manager_html\` 下的产物直接渲染会被拒：`source must stay inside the session workspace`）——验收墙与产物必须落**工作区内同一目录**（`.scratch/<批名>/`），与 `docs/agents/视觉验收墙.md` §5 同向。
- **照抄样板（别从白纸起）**：
  - 墙生成器 → `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs`（四模式一体，自检正反两面已实测）；**别抄** `t154-mobile-wall.mjs`（仓规 §6.4 点名的假绿灯：只有 `missing`、没有 `dropped`）。
  - 链路总览页 → `docs/skills/skill-calorie/t268-链路总览.build.mjs`（骨架值钱：`file:///` 绝对链接 ＋ 复制路径 ＋ `<noscript>` 绝对路径兜底 ＋ 四条自证；数据与文案绑死场景 04，**照抄重写、不直接复用**）。
  - 样式与文案判据 → `packages/skill-calorie/scripts/audit-separators.mjs`（R1–R7、节点级、有退出码；接居家只改两处常量）。
  - 地图体例 → 本技能上一张图 **#183**（同目录 `map-183-body.md`）。
- **一处必须先拆的坑**：`audit-separators.mjs` 与 `t407`／`t417` 的位置正则绑 `ilife-block-*` 公共层类名，而**居家普通产物用的是自家极简 `SHARED_CSS`**（`packages/skill-home/src/render/html.ts`），`base-render` 只在 HELP 那一支用（`src/help/helpFile.ts:51`）——直接接进去**读数全 0、看着全绿其实是没查**。票 6 票面已写。
- **结构纪律**（`docs/agents/structure.md`）：必报五步全走（第一／二步先报用户点头）；能力目录名取自 **HELP 一级分组**＝那 9 个域；`link` 域**只留登记位、不建目录**（#183 票 13 用户裁决）；告警线 350，`cmd_read.ts`／`fetch/db.ts` 的超线处置在票 2 裁。
- **并发纪律**（`AGENTS.md`）：只 `git add` 自己声明的路径；编译／测试／git 写操作一律经 `node tooling/run-locked.mjs --ticket <票号> -- <命令>`；编译入口写死 `node node_modules/typescript/bin/tsc -b <包>`。
- **文档与产出落点**：代码与产物落 `packages/skill-home/`，文档落 `docs/skills/skill-home/`（`docs/agents/doc-homes.md`）。
- **用词纪律**：照 `docs/agents/wording.md`——写文件名、写命令与页面组件、写 issue 一律用规范词，禁黑话。
- **本图产物索引**（新会话接手先看这里，全部在 `docs/skills/skill-home/`）：
  - 事实底（本次建图产出，入仓）：`html-scenes-gap-inventory.md`（73 场景覆盖矩阵／380 行）／`html-scenes-precedents.md`（链路页／墙／判据／卡路里骨架四类现成件清单／397 行）
  - 决策页（给人看的）：`html-scenes-decisions.html`（第 1 轮 11 问 ＋ 用户答复回流）
  - 票图设计（第一性原理 ＋ 并发与死锁 ＋ 两席 P0 的逐条处置）：`scene-pages-graph-design.md`（v3）
  - 两席对抗式审查原件：`review-graph-A.md`（死锁／并发／锁）／`review-graph-B.md`（第一性原理／干涉／过度工程）
  - 票面正文源：`html-scenes-tickets/<序>-<短名>.md`（改票面一律改文件再 `gh issue edit <n> --body-file`，别内联字符串）
  - 票源映射：`html-scenes-tickets.json`（票号 ↔ issue 号 ↔ 阻塞关系）
  - 接线脚本：`html-scenes-wire.mjs`（建 map＋子票、建原生子议题边与原生阻塞边、回写本表、自校验；重跑即对账）
  - 地图正文源：`html-scenes-map-body.md`（本文件）

## 计划（任务清单）

<!-- 原生子议题边与原生阻塞边才是准；本清单只作索引；表体由 html-scenes-wire.mjs 生成 -->
<!-- PLAN-TABLE:BEGIN -->
| 序 | 票 | 类型 | 被谁阻塞 |
|---|---|---|---|
| 1 | [册子：老技能 49 个页面模板 → 70 场景的信息结构清单](https://github.com/FeatherHunter/ilife/issues/798) | research | — |
| 2 | [契约冻结：形状＋产物命名＋页族归属＋域内写集＋共用位所有权（先报用户点头）](https://github.com/FeatherHunter/ilife/issues/799) | grilling | — |
| 3 | [机器落地：通用分派口＋目录扫描生成器＋派生件入仓＋21 条命令按域搬＋测试 glob](https://github.com/FeatherHunter/ilife/issues/800) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/799) ＋ [票 22](https://github.com/FeatherHunter/ilife/issues/845) |
| 4 | [链路落盘与交付回执：数据与过程命令默认落 HTML＋回执给绝对路径](https://github.com/FeatherHunter/ilife/issues/801) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) |
| 5 | [种子数据：仓内种子脚本＋测试库（70 场景所需）](https://github.com/FeatherHunter/ilife/issues/802) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/798) |
| 6 | [判据件：样式与文案机审接到居家＋接进包内门](https://github.com/FeatherHunter/ilife/issues/803) | task | — |
| 7 | [生成器：双端验收墙＋链路总览页（清单驱动，文件名从清单读）](https://github.com/FeatherHunter/ilife/issues/804) | task | — |
| 8 | [页面脚手架：跑生成器产出同形页骨架（替代照抄样板）](https://github.com/FeatherHunter/ilife/issues/805) | task | [票 2](https://github.com/FeatherHunter/ilife/issues/799) ＋ [票 3](https://github.com/FeatherHunter/ilife/issues/800) |
| 9 | [物品管理域（一）录入与查找 10 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/806) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 10 | [物品管理域（二）更新与标签分类 11 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/807) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 11 | [物品管理域（三）照片、盘点与历史 8 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/808) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 12 | [空间与位置域 4 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/809) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 13 | [穿搭出行域 5 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/810) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 14 | [统计总览域 4 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/811) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 15 | [快递购物域 4 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/812) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 16 | [票据凭证域（一）购买记录与保修保养 10 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/813) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 17 | [票据凭证域（二）证件与账号 8 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/814) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 18 | [家庭协作域 2 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/815) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 19 | [开始使用域 4 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/816) | task | [票 3](https://github.com/FeatherHunter/ilife/issues/800) ＋ [票 4](https://github.com/FeatherHunter/ilife/issues/801) ＋ [票 5](https://github.com/FeatherHunter/ilife/issues/802) ＋ [票 6](https://github.com/FeatherHunter/ilife/issues/803) ＋ [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 8](https://github.com/FeatherHunter/ilife/issues/805) |
| 20 | [收口：端到端＋双端墙＋链路总览＋逐页视觉复核＋综合分 ≥90＋维护者终审](https://github.com/FeatherHunter/ilife/issues/817) | task | [票 7](https://github.com/FeatherHunter/ilife/issues/804) ＋ [票 9](https://github.com/FeatherHunter/ilife/issues/806) ＋ [票 10](https://github.com/FeatherHunter/ilife/issues/807) ＋ [票 11](https://github.com/FeatherHunter/ilife/issues/808) ＋ [票 12](https://github.com/FeatherHunter/ilife/issues/809) ＋ [票 13](https://github.com/FeatherHunter/ilife/issues/810) ＋ [票 14](https://github.com/FeatherHunter/ilife/issues/811) ＋ [票 15](https://github.com/FeatherHunter/ilife/issues/812) ＋ [票 16](https://github.com/FeatherHunter/ilife/issues/813) ＋ [票 17](https://github.com/FeatherHunter/ilife/issues/814) ＋ [票 18](https://github.com/FeatherHunter/ilife/issues/815) ＋ [票 19](https://github.com/FeatherHunter/ilife/issues/816) |
| 21 | ~~（已退役）决定：产物命名与落点怎么区分 70 条场景~~（已退役） | grilling | — |
| 22 | [唤醒词层规格：四分类＋20 条无场景词归宿＋42 条变体识别口径（先报用户点头）](https://github.com/FeatherHunter/ilife/issues/845) | grilling | — |
<!-- PLAN-TABLE:END -->

## Decisions so far

<!-- 索引：一行一条＝已关的子票 gist ＋ 链接；细节在票里，这里不复述 -->

- [册子：老技能 49 个页面模板 → 70 场景的信息结构清单](https://github.com/FeatherHunter/ilife/issues/798) — 产出 `docs/skills/skill-home/pages-ledger.md`（**49 行页族表**；老 yaml 引用的 49 个模板**全部存在**，49/49）：页面类型 混合 27／查看 11／采集＋回执 6／选择＋回执 3／向导 2；按域页族 items 19、space 4、outfit 5、stats 4、express 4、receipt 4、family 2、setup 4（＋link 3，不做）。**三条改地图的实测**：①本图实做 **8 个域／70 场景／46 页族**，不是 9 个域（`link` 已裁不做）②老实现产物命名按模板 **1:1**（`scripts/render/__init__.py:130-147`）——`物品/receipt.html` 承担 4 条场景、`物品/add_form.html` 承担 4 条，照它落盘**会互相覆盖** ⇒ 毕业成 **#836** 并阻塞票 4／票 7 ③「开始使用四模板无调用点」订正为「`scripts/` 无调用点；`first_use_wizard.html` 全库唯一调用点在老测试 `tests/test_开始使用.py:622`，另 3 张任何地方都没有」。其余实测（票据凭证写类 11 条只打 JSON、家庭协作唯一把 HTML 做成 opt-in、18 个 legacy 平铺件里 17 个仍挂 `TEMPLATE_TO_COMMAND_CN`、`SM6-4` 无入口）全档在册子 §三。

## Not yet specified

<!-- 已看出苗头、但还说不成一张票的雾；随 frontier 推进毕业 -->

- **页族归属表**（哪几条场景共用一页、每族一个装配件）：票 1 已给出**族数与每族服务的场景清单**（`pages-ledger.md` 表一）；「一族一个装配件、页族与域目录怎么对应」仍待票 2（结构设计）定稿。
- **产物命名规则裁完之后的连带面**（票 21／#836）：HELP 交付支与速查支的落点值要不要跟着改（`居家管家_HELP_<戳>.html`）——等 #836 裁决落地再看。
- **HELP 内容资产 `html.template` 是否改指新页面**（改则须重跑 `pnpm gen:help-assets` 并更新摘要锁，见 `packages/skill-home/AGENTS.md`）——等票 2 裁。
- **20 条兼容唤醒词在链路总览页里的呈现**（连同命令同页的附表，还是各自一行）——等票 7 与票 2 的形状定完。
- **域票之间的共用件边界**（哪些装配件该升共用位；结构标准要求「共用位从第二个用法里长出来」）——等票 2 定骨架、样板票跑通后看实情。
- **单张域票会不会一次窗口收不完**（items 域 29 条已切三张；receipt 18 条已切两张）——执行中按「一次做完」再切。
- **脚手架能覆盖到哪一层**：册子表一里「混合」类有 27 族，票 8 跑通后回看——覆盖不到的族，要么补进生成器，要么在票 2 契约里写明「由人裁形状」。

## Out of scope

- **联动域那 3 条**（联动总览／记到卡路里／记到记账）：#183 票 13 用户已裁「留登记位、不列、不建域目录，将来在 combos 相关地方设计」——本图不做、不出产物、不进册子与墙。
- **3 条 `(HTML)` 兼容词**（查物品(HTML)／看物品(HTML)／统物品(HTML)）：#183 票 13 已裁不进清单、不独立产物。
- **HELP 页本身**：#183 已交付（`居家管家_HELP_<戳>.html`，132317 B，维护者已终审「认可 HTML样式符合我的要求 验证通过」）——本图不重做。
- **发版装机**（抬版本 → npm 发布 → 装进本机 profile → 在 DSH GUI 里真说唤醒词）：另立票；本图判据以「仓内真跑 ＋ 落盘产物 ＋ 墙验收」为准（用户 Q7 裁决）。
- **老技能本体**（`D:\2Study\StudyNotes\SKILLS\居家管家`）：只读参考，一行不改；它的 18 个 v2.0 前 legacy 平铺模板与 legacy 分支不移植。
- **其余 6 个技能**（卡路里／记账／备忘／作息／大厨／总管）：本图只做居家管家。
- **`tooling/run-locked.mjs` 的默认无限等**（`--max-wait-ms 0`，`:126`）：对抗式审查实测现场最长等待 **23.2 分钟**、单次持锁 **142 秒**，与 `docs/subagent-concurrency-protocol.md`「最多 10 分钟，不无限等」相冲。本图只在自己的票面写死「一律带 `--max-wait-ms 600000`」；工具默认值属**公共工具线**，不在本图目的地内。
- **`skill-home` 之外的新 UI 面**（爱生活设置页里那排页签下的技能设置页）：不归本图。

## 用户原话采访区（verbatim，一字未改；AI 执行先读这里）

### 需求原话（2026-09-20）

```
/wayfinder
请帮我处理一个需求（严格遵循 wayfinder 技能规则）。
仓库（已自动填入当前工作区）：https://github.com/FeatherHunter/ilife

## 澄清
- [ ] 对目标 / 范围 / 偏好有假设时，先用 grilling 技能澄清，不默认

## 判断分类（先查仓库已有 wayfinder:map 和 issue，确认是否做过）
- [ ] 新增：全新需求 → 新建 map
  - [ ] 写出 map：Destination + Notes + plan
  - [ ] 先把该 map 的现有正文取下来存成文件（文件里必须保留 `## Destination` 一节），改好任务清单后再调 先 gh api repos/{owner}/{repo}/issues/{child} --jq .id 取子议题数据库 id，再 gh api repos/{owner}/{repo}/issues/{map}/sub_issues -X POST -F sub_issue_id={id} 建边；以 gh api repos/{owner}/{repo}/issues/{map}/sub_issues --jq length 校验计数与预期一致。阻塞关系建原生依赖边：gh api repos/{owner}/{repo}/issues/{child}/dependencies/blocked_by -X POST -F issue_id={阻塞它的那张票的数据库 id}；子票正文首行的 `Blocked by: #n` 只作降级兜底。
  - [ ] 关联到该 map 的每个 ticket 都由脚本建原生边并自己校验数量；仅当后端明确不支持原生边时才回退到任务清单 + Part of
  - [ ] 阻塞关系以脚本建的原生依赖边为准；正文里的 `Blocked by: #<n>` 行只作降级兜底
- [ ] 复用：这个需求之前已做过（已有 map / issue）→ 打开复用它，不重复建
- [ ] 直接实现：需求很小 → 建一个 issue 直接实现，不建大 map

## 自查（对检查清单做检查）
- [ ] 逐项核对上面每个 `- [ ]`：是否已落实、无遗漏；漏项补上，不跳过
- [ ] 校验：看关联脚本回包的 expected 与 actual 是否一致（对不上脚本会非零退出，不要当成成功），且面板列表的 `closed/total` 不为 0/0（有子票时）
- [ ] 结束前按进度契约更新（## 进度：N% + 下一步；95% 须写明待确认什么，未确认不得 close）

## 正文格式（写/改 issue 正文时必须遵守）
- [ ] 用真实换行书写：每个 `## 章节` 独占一行，段落间留空行
- [ ] 禁止字面 \n 转义（不要把换行写成 \n 两个字符）、禁止正文以 BOM（\ufeff）开头
- [ ] 写回 issue 正文时以文件方式提交（文件内为真实换行），不要内联转义字符串
- [ ] 正例：`## 进度：90%` 独占一行，空行后接 `下一步：xxx`（反例：`## 进度：90%\n下一步：xxx`）
```

```
需求描述：D:\2Study\StudyNotes\SKILLS\居家管家 是老的居家管家 D:\ilife\packages\skill-home是新的居家管家，新的居家管家只重构了部分功能。老居家管家是权威来源。参考老居家管家，以新居家管家的HELP HTML中的功能领域进行划分。每个功能域下面的场景都要在新居家管家中开发好。代码架构需要解耦，可以参考新卡路里的架构设计。
1. 居家管家的所有唤醒词的对应HTML都开发完毕
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

### 第 1 轮决策答复原话（2026-09-20，逐条）

```
Q1 (a) 73 场景各一页 —— 认可推荐
Q9 (a) 默认落 HTML ＋ 回执给绝对路径 —— 认可推荐
Q10 (a) 补齐这 13 条页面 —— 认可推荐
Q7 (a) 四项都不做 —— 认可推荐
Q2 (a) 整包按 9 域重排，先出结构设计票报你点头 —— 认可推荐
Q4 (a) 种子库 ＋ 真命令链 —— 认可推荐
Q5 (a) 沿用老规范落点，链路总览页落在产物目录里 —— 认可推荐
Q3 (a) 老技能只作功能来源，UI 走新仓共用件 —— 认可推荐
Q6 (a) 墙按 9 个域成对出（各 9 张），每页留复核记录，综合分 ≥90 —— 认可推荐
Q8 (a) 域票并行：结构设计票先行，域票互不阻塞，收口墙票收尾 —— 认可推荐
```

**第 1 轮 11 问的选项全文与利弊**（决策页，给人看的）：`html-scenes-decisions.html`。
