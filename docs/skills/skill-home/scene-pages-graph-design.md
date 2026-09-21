# 场景页地图 · 票图设计（v3）：两席对抗式审查后的修订

**状态**：v1／v2 均被两席**打回**（P0 共 9 条）。本文是修订稿；每条 P0 的处置都写在 §五。审查原件：`review-graph-A.md`（死锁·并发·锁）、`review-graph-B.md`（第一性原理·干涉·过度工程）。

## 一 · 两席打回的核心事实（推翻了我 v2 的前提）

1. **「按域不相交」在今天的代码里不成立**（A-P0-1）：11 张域票每张都必须改五处全包共用件——`src/render/templates.ts`（白名单 `:7-29` ＋ `templateFor` `:33-58`）、`src/render/views.ts`（逐域装配 `:9-77`）、`src/render/html.ts`（唯一 `SHARED_CSS` `:63`）、`src/policy/wakewords.ts`（91 条表 `:20-112`）、`src/cli/cmd_read.ts`（21 个 case ＋ `:846` 装配）。**干扰的根因不是席位多，是这台机器还没造。**
2. **卡路里那套的真身是「通用分派口 ＋ 目录扫描生成器」**（A-P0-1）：`skill-calorie/src/cli/cmd_read.ts:60-71` 是全键通用分派，件内逐字写着「新增能力／新增命令都不必碰这个文件」；`keys.ts`／`registry.ts`／`routes.generated.ts` 都是**生成物**，由 `scripts/gen-cli.mjs`／`gen-routes.mjs` **扫目录**产出。居家今天两样都没有。
3. **`pnpm gen` 里没有 skill-home**（A-P0-4／B-P0-1）：仓根 `package.json:12` 的 `gen` 逐字只跑 calorie／bill；居家只有自己的 `gen:help-assets`。所以 v2 让域票「跑 `pnpm gen`」在居家是**空命令**。
4. **「产物不入仓」与仓规正面冲突**（B-P0-2）：`docs/agents/命令登记纪律.md:19` 的成立要件是「哈希锁：**产物入仓**」，`.github/workflows/ci.yml:43` 每轮真跑 `pnpm gen:check`——不提交＝票 9–19 期间主线 CI 恒红。
5. **唤醒词今天就已经在表里**（A-P0-4）：91 条 `WAKE_TABLE` 已覆盖 70 条场景 ⇒ **域票根本不需要新增命令**，派生件在票 9–19 期间**不会变** ⇒ 第 4 条那个两难**自动消失**（唯一例外：`借用` 写侧缺唤醒词，属命令登记面，归票 3）。
6. **锁默认无限等**（A-P0-5）：`tooling/run-locked.mjs:126` 默认 `maxWaitMs = 0`，与协议「最多 10 分钟」相冲；现场日志最大等待 **23.2 分钟**、单次持锁最长 142 秒。
7. **边只会加不会删**（A-P0-2）：我的接线脚本只补缺边、**不删多余边** —— 所以一旦改 blockedBy 就会留下旧边，v2 那张图照改必成环 `4 → 21 → 9 → 8 → 4`（A 已实算复现）。**这是「无环」从纸面到现实的唯一断点。**
8. **域用例根本不会跑**（B-P0-4）：`packages/skill-home/test/*.test.mjs` 只到一级；域票若把用例放 `test/<域>/` 就永不执行。
9. **饥饿窗口真实存在**（A-P1-8）：票 6 关掉、票 2 未裁的那一刻，frontier 只剩 HITL 票。

## 二 · v3 票图

| n | 票 | 类型 | 写集（并发依据） | 阻塞于 | 存在理由 |
|---|---|---|---|---|---|
| 1 | 册子 | research | `docs/skills/skill-home/pages-ledger.md` | — | ✅ 已关（49 页族／46 实做） |
| 2 | **契约冻结**（形状＋产物命名＋页族归属＋**域内写集按页族切**＋共用位所有权＋锁上限规则；报用户点头） | grilling | `docs/skills/skill-home/scene-pages-contract.md` | — | 写页面前一次裁完；**吸收原命名票**，少一个人工等待点 |
| 3 | **机器落地**（照卡路里造：能力目录＋`commands.ts`／`routes.ts`＋**通用分派口**＋目录扫描生成器＋派生件入仓＋21 条命令按域搬＋`借用` 写侧唤醒词登记＋测试 glob 加宽＋`pnpm gen` 接入居家＋门禁全绿） | task | `packages/skill-home/src/**`（除 `src/<域>/pages/**`）、`templates/**`（除 `templates/<域>/**`）、`test/**`、`package.json`、`SKILL.md`、`AGENTS.md`、`scripts/gen-*.mjs` | 2 | **这台机器是「按域不相交」的前提**；没有它，11 张域票必然互踩五处共用件 |
| 4 | 链路落盘与交付回执（默认落 HTML＋回执给绝对路径） | task | `packages/skill-home/src/cli/output*.ts`、`test/cli-html-delivery*.test.mjs`、`docs/…/html-delivery-chain.md` | 3 | 域票要出产物；与票 3 同面故必须串行 |
| 5 | 种子数据 | task | `packages/skill-home/scripts/seed-scenes.mjs`、`scripts/lib/seed-*.mjs`、`.scratch/seed/**` | 1 | 域票要真数据才能渲染与自证 |
| 6 | 判据件（样式与文案机审） | task | `packages/skill-home/scripts/audit-separators.mjs`、`test/style-audit*.test.mjs` | — | 域票的机审口径必须唯一 |
| 7 | 生成器（双端墙＋链路总览页） | task | `docs/skills/skill-home/gen-scene-wall.mjs`、`gen-chain-page.mjs`、`.scratch/wall-selftest/**` | — | 域票要出域墙；**清单驱动、文件名从清单读**，故不依赖票 2 的命名裁决 |
| 8 | 页面脚手架 | task | `packages/skill-home/scripts/new-scene-page.mjs`、`scripts/lib/scene-page-scaffold.mjs`、`test/scaffold*.test.mjs` | 2、3 | 把「照抄样板」换成「跑生成器」；11 张域票同形 |
| 9–19 | 11 张域票 | task | **各自拥有的页族文件**（`src/<域>/pages/<页族>.ts`、`templates/<域>/<页族>.html`、`test/<域>-*.test.mjs`、`docs/…/scene-<域>-<序>.md`、`.scratch/<票号>/**`） | 3、4、5、6、7、8 | 每票的写集＝它拥有的页族；**同域多票靠页族文件天然不相交**（items 三张、receipt 两张） |
| 20 | 收口（全量端到端＋双端墙＋链路总览＋逐页视觉复核＋≥90＋终审） | task | `.scratch/<票号>/**`、`docs/…/scene-pages-closeout.md` | 7、9–19 | 终点判据的取证与签字 |
| 21 | ~~集成与共用位派生~~ | — | — | — | **v3 删除**：域票不增命令 ⇒ 派生件不变 ⇒ 无需集成票；其职责（派生件、`package.json`、`SKILL.md`）已在票 3 |

**退役**：#836（原「产物命名裁决」）**并入票 2**，票 3 接手原 n=21 位置的职责；`#836` 以「已并入 #799」关闭，不另留孤儿。

## 三 · 干涉判据（可机器检）

对任意两票 A、B：若 A 与 B 之间**没有传递阻塞关系**，则写集必须**不相交**（页族文件级）。v3 的可并发对：

| 可并发对 | 结论 | 依据 |
|---|---|---|
| 5 × 6 × 8 | 不相交 | `scripts/seed-*`／`scripts/audit-separators.mjs`／`scripts/new-scene-page.mjs` 三个不同文件 |
| 5／6／8 × 7 | 不相交 | 前者 `packages/skill-home/scripts/`，后者 `docs/skills/skill-home/gen-*.mjs` |
| 域票 × 域票（同域多票也算） | 不相交 | **写集＝该票拥有的页族文件**（表一 46 族的文件各不相同）；items 三张按页族切、receipt 两张按页族切 |
| 域票 × 6 | 不相交 | `test/<域>-*.test.mjs` vs `test/style-audit*.test.mjs` |
| 4 × 5／6／7／8 | 不相交 | 4 只写 `src/cli/output*.ts`＋自己的用例与文档 |
| 3 × 任意 | — | 3 阻塞它们（有序） |

**共用位收权（写进票 2 契约与每张票的「不许动的东西」）**

1. 域票**不新增命令**（91 条唤醒词已在表里）⇒ 不碰 `commands.ts`／派生件／`WAKE_TABLE`；`借用` 写侧的登记归票 3。
2. 域票**不碰** `src/render/**` 共用件、`package.json`、`SKILL.md`、派生件；要改就回写票 3。
3. 页族文件是域票唯一的正式写点；一票的页族清单在票面列全（来自 `pages-ledger.md` 表一）。
4. 用例一律平铺命名 `test/<域>-*.test.mjs`；票 3 负责把包内 test glob 加宽并接进 CI。
5. 跑锁带明确上限：`--max-wait-ms 600000`（按协议 10 分钟），超时让出，**不无限等**。

## 四 · 死锁与饥饿（v3 的答案）

- **无环**：接线脚本改成**边的双向收敛**（缺的补、多的删），并在每次跑时做传递闭包自检；改 blockedBy 再也不会留旧边变成环（这正是 A 打回的那条）。
- **不饿死**：票 2 关掉后 frontier ＝｛3、5、6、7｝，其中 **5／6／7 三张纯 AFK**；即使人不在场也有活可做。票 2 未裁时 frontier ＝｛5、6、7｝（票 2 无阻塞，但它是唯一 HITL）。
- **单人门不卡全图**：全图只剩两张需要用户点头（票 2 契约、票 20 终审），且票 2 阻塞的是**一组并列票**而不是单张。
- **锁不死锁**：持锁只做一件事；上限 10 分钟；超时让出后重排（仓内 `run-locked` 的无限等归公共工具线，见 §六）。

## 五 · 两席 P0 的逐条处置

| 来源 | P0 | v3 处置 |
|---|---|---|
| A-P0-1 | 域票写集按域不相交不成立 | 票 3 先造「通用分派口＋生成器＋按域搬空」这台机器；域票写集缩小到**页族文件** |
| A-P0-2／B-P0-4 | 票源与设计稿两套边、改成环 | 接线脚本升级为**双向收敛＋闭包自检**；JSON 是唯一事实源，一次改齐 |
| A-P0-3 | 域票要的两件工具不存在 | 票 6／票 7 均**无阻塞**（AFK 先做），域票阻塞在它们上 |
| A-P0-4／B-P0-1 | `pnpm gen` 不含居家、生成物不存在 | 票 3 把 `pnpm gen`／`gen:check` 接入居家并让**派生件入仓**；同时点明「域票不增命令 ⇒ 派生件不变」 |
| A-P0-5 | 锁默认无限等 | 契约写死 `--max-wait-ms 600000`；根因（工具默认值）记入地图 Out of scope 交公共工具线 |
| B-P0-2 | 「不提交派生件」与哈希锁冲突 | 矛盾从根上消除：域票不增命令（见上）；派生件单写者＝票 3 |
| B-P0-3 | 机器门抓不到语义错 | 门只用来抓**结构错**（环／写集相交／frontier 空）；语义由两席审查与逐票判据兜 |
| B-P0-4 | 域用例不跑 | 票 3 加宽包内 test glob；用例平铺命名 |
| A-P1-6/7/8 | 关键路径与饥饿 | v3 删除票 21、解绑票 7、票 5 只依赖已关的票 1 ⇒ 根层三张 AFK |

## 六 · 明确不做的（写进地图 Out of scope）

- **`tooling/run-locked.mjs` 的默认无限等**（`--max-wait-ms 0`）：本图只在自己的票面加「带上限」规则，工具本身的默认值属公共工具线，不在本图目的地内。
- **两席审查提出的「票 6 并入票 3」「票 9–11 合并为一张」**：不采纳。判据件与机器件文件不相交、可并行；items 域 29 条已按页族切成三张且写集不相交，合并只会把一次窗口变成两次交接。
