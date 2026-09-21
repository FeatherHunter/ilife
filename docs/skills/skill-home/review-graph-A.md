# 对抗式审查席 A · 死锁／并发／锁／饥饿 —— `scene-pages-graph-design.md`（v2）复核报告

审查对象：`docs/skills/skill-home/scene-pages-graph-design.md`（85 行，下称「设计稿」）。
本席只做一件事：找能证伪它的证据。下文每条都能复现，凡属推断一律标注。

---

## 复核方法

### 读过的文件（路径 ＋ 行数／读数）

| 文件 | 读数 | 用途 |
|---|---|---|
| `docs/skills/skill-home/scene-pages-graph-design.md` | 85 行 | 被审对象；v2 边表取 §二（表 16–28 行）、共用位规则取 §三 49–55 行、死锁与饥饿取 §四 58–63 行、机器门取 §五 65–73 行 |
| `docs/skills/skill-home/html-scenes-tickets.json` | 252 行；`blockedBy` 数组分别落在 JSON 第 24/35/46/58/69/78/89/103/114/125/136/147/158/169/180/191/202/213/224/246 行 | v1 边（票源真值） |
| `docs/skills/skill-home/html-scenes-map-body.md` | 172 行；plan 表 55–78 行、实测段 23–40 行、Decisions 84 行 | 地图侧口径与现场读数 |
| `docs/skills/skill-home/pages-ledger.md` | 228 行；§一小结 67 行、§二域汇总 73–84 行、§四 233 行 | 票 1 产物（页族真值） |
| `docs/skills/skill-home/html-scenes-tickets/{02,03,04,05,06,07,08,09,20,21}-*.md` | 23–38 行各一份 | 逐票「验收命令」「不许动的东西」「交付物路径」 |
| `packages/skill-home/src/render/html.ts` | 76 行；`SHARED_CSS` 63 行、`fillTemplate` 66–76 行 | 共用样式＋三标记填充 |
| `packages/skill-home/src/render/templates.ts` | 68 行；`HOME_TEMPLATES` 7–29 行、`templateFor` 33–58 行、`loadTemplate` 62–68 行 | 模板白名单（全包一张） |
| `packages/skill-home/src/render/views.ts` | 77 行；`toItemCard` 9–18、`buildSearchList` 20、`buildInventoryRecords` 38、`buildOutfitList` 46、`buildTicketList` 63、`buildCareList` 67 | 视图数据装配（全包一件、逐域函数混排） |
| `packages/skill-home/src/render/index.ts` | 13 行（转出面） | 共用出口 |
| `packages/skill-home/src/policy/wakewords.ts` | 137 行；`WAKE_TABLE` 20–112 行（91 条 phrase）、`DEPRECATED_PHRASES` 115、`routeWakeword` 119–131 | 唤醒词表（全包一张、手写） |
| `packages/skill-home/src/cli/cmd_read.ts` | LF=833（见发现 P0-6 的数法之争）；21 个 `case 'home.*'` 在 176/206/225/252/351/359/403/426/430/459/494/511/527/539/552/568/611/644/732/755/785 行；装配 846、`--html` 支 850、`delivery` 支 864、回执 870 | 命令分派与交付出口 |
| `packages/skill-home/package.json` | 全件；`test` 串、`bin`、`files` | 包内门与发版面 |
| `tooling/run-locked.mjs` | 510 行；`acquireLock` 191–280、`main` 286–503、超时杀树 399–413、释放归属校验 459–484 | 锁的实现 |
| `docs/subagent-concurrency-protocol.md` | 195 行；§2 17–54 行（含 53 行「等 15 秒重试、最多 10 分钟」与 26 行「窗口内不得再次抢锁」）、§2.5 104 行、§2.6 108–112 行 | 锁与写者纪律正本 |
| `docs/agents/编排纪律.md` | grep `锁|run-locked|等待|10 分钟|单点|frontier|并行|宽度` 命中 3 处（27/45/61 行） | 编排侧对「依赖与锁」的措辞 |
| `package.json`（仓根） | `gen`／`gen:check`（12–13 行）、`test`（15 行） | 派生链真值 |
| `packages/skill-calorie/scripts/audit-separators.mjs` | 275 行；用法 12–16、判据 R1–R7 32–53、`--dir` 解析 205–231、退出码 275 | 票 6／票 9／票 20 的验收件 |
| `packages/skill-calorie/scripts/gen-cli.mjs`、`gen-routes.mjs`、`src/cli/cmd_read.ts:60-71`、`packages/skill-calorie/AGENTS.md` | `cmd_read.ts:60-71`＝全键通用分派（「新增能力／新增命令都不必碰这个文件」）；台账「超线件」一节点名 `src/cli/keys.ts`／`registry.ts`／`triggers/routes.generated.ts` 为**生成物**；生成器扫目录产出（非手写清单） | 参照实现（卡路里）＝设计稿 §一 12 行「照卡路里」的**完整含义**（见 P0-1 末尾） |

### 跑过的命令

```powershell
# 1. 图计算（传递闭包／环／层数／逐时间片 frontier）——脚本自写，从 stdin 进 node，不落盘
$code | node --input-type=module -            # 见「我算出来的图」一节末尾的完整脚本
# 读数见下节；v1 与 v2 各跑一次，另跑一次「改名测试」

# 2. 共用位核实（谁必须改哪个共用件）
Get-ChildItem -Recurse -File D:\ilife\packages\skill-home\src        # 只有 cli/fetch/policy/render/help 五个工种名，无 src/<域>/
# grep: WAKE_TABLE|templateFor|HOME_TEMPLATES|renderEnvelopeHtml|loadTemplate|buildSearchList|toItemCard （跨 src，命中 30 处）
# grep: case 'home\.|^switch|function main|--html|delivery （cmd_read.ts，命中 33 处）

# 3. 交付件是否已存在
Test-Path D:\ilife\packages\skill-home\scripts\audit-separators.mjs   # False
Test-Path D:\ilife\docs\skills\skill-home\gen-scene-wall.mjs          # False
Test-Path D:\ilife\packages\skill-home\src\cli\keys.ts                # MISSING
Test-Path D:\ilife\packages\skill-home\src\cli\registry.ts            # MISSING
Test-Path D:\ilife\packages\skill-home\src\triggers\routes.generated.ts  # MISSING
(Get-ChildItem D:\ilife\packages\skill-home\templates -Filter *.html).Count  # 21，全是 16 行骨架

# 4. 派生链真值
Select-String -Path D:\ilife\package.json -Pattern '"gen'      # gen 只跑 calorie/bill 的 gen-cli 与 skill-call-form

# 5. 锁的历史实测（读仓内审计日志，只读）
$lines = Get-Content D:\ilife\.scratch\locks\gate-runs.log
# RUN 行 13913、START 行 13920；waitedMs>0 的 5019 条；waitedMs 最大 1391070 ms（＝23.2 分钟）
# 单次持锁最长：START 2026-09-20T23:50:11.144Z → RUN 2026-09-20T23:52:33.284Z ＝ 142.1 秒
# exit 直方图：0→10466、1→3138、2→235、128→27…
```

> 只读声明：本席未 commit、未切分支、未改任何源码、未跑编译／测试／git 写操作（因而不需要 `run-locked`），仅新建本报告一份文件。

---

## 发现

### P0-1 · 共用位假设与仓库现实相反：**11 张域票每一张都必须改 4 件全包共用的 `src/render/**` / `src/policy/**` / `src/cli/**` 文件，「按域根隔离」的写集不相交不成立**

- 结论：设计稿 §三（42 行）「域票 × 域票 → 写集是否相交：**否**｜按域根隔离」是**错的**；§二（26 行）给域票的写集 `packages/skill-home/src/<域>/`、`templates/<域>/`、`test/<域>*.mjs` 是**不完备的写集声明**，按票 9 的「不许动其它域的页面与命令」（`html-scenes-tickets/09-items-1.md:30`）根本干不完活。
- 证据（四件共用文件，逐件给出「为什么每张域票都要改」）：
  1. `src/render/templates.ts:7-29` —— 21 个模板名写死在一张全包白名单 `HOME_TEMPLATES` 数组里，`loadTemplate` 在 `:63` 用 `HOME_TEMPLATES.includes(name)` 卡门；域票要加自己的页族模板，**只能**改这一张数组。
  2. `src/render/templates.ts:33-58` —— `templateFor(key)` 是单张 `switch`，21 个 key 一字排开；域票要接自己的页族，**只能**在这一件里加 case。
  3. `src/render/views.ts:9-77` —— 视图装配件（`toItemCard`／`buildSearchList`／`buildInventoryRecords`／`buildOutfitList`／`buildTicketList`／`buildCareList`…）按域混在**同一件 77 行**里；items／space／outfit／stats／express／receipt／family 各域的装配件都出自这一件。
  4. `src/render/html.ts:63` —— 全包**唯一**一份 `SHARED_CSS`（单行、无媒体查询）；`:66-76` 的 `fillTemplate` 把这套样式注入**每一个**模板。域票要做「真页面＋双端自适应」，样式只能落在这里（或落回票 3）。
  5. `src/policy/wakewords.ts:20-112` —— 91 条唤醒词全包一张手写表，items／space／outfit／stats／express／receipt／family／setup 各域的 phrase 混排其中。
  6. `src/cli/cmd_read.ts` —— 21 个 key 的 `switch`（176–785 行）＋ 唯一的装配出口（`:846` `fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env))`）。
- 复现命令：

  ```powershell
  Select-String -Path D:\ilife\packages\skill-home\src\render\html.ts -Pattern 'SHARED_CSS'        # :59 :63 :73
  Select-String -Path D:\ilife\packages\skill-home\src\render\templates.ts -Pattern 'HOME_TEMPLATES|case .home\.'  # :7 :33-55 :63
  Select-String -Path D:\ilife\packages\skill-home\src\policy\wakewords.ts -Pattern "phrase: '"     # 91 行
  (Select-String -Path D:\ilife\packages\skill-home\src\cli\cmd_read.ts -Pattern "case 'home\.").Count   # 21
  ```
- **参照实现（设计稿点名「照卡路里」，但没抄到手的那一半）**：卡路里**没有**「新增能力要改分派件」这件事——`packages/skill-calorie/src/cli/cmd_read.ts:60-71` 是**全键通用分派**：`const spec = REGISTRY[key]; if (spec) return spec.run(params, db);`，件内注释逐字写着「**新增能力／新增命令都不必碰这个文件**」（`:61`），且「老路那口按键分派的 switch 已成死代码，整口删除」（`:62-63`）。它的 `src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts` **都是生成物**（`packages/skill-calorie/AGENTS.md` 超线件一节把三件单列为「生成物、不挂号」），由 `scripts/gen-cli.mjs`／`scripts/gen-routes.mjs` 扫 `src/<能力>/{commands,routes}.ts` 产出（`gen-routes.mjs` 的 `routeDeclarationSources()` **扫目录**、不是手写清单；`gen-routes.mjs:24` 定义 `OUT`，`:229-230` 写盘）。**换言之：「按域自治」在卡路里成立的前提是「生成器 ＋ 通用分派口」这套机器已经在盘上；skill-home 今天两样都没有（见 P0-4）。** 所以「照卡路里」这句话对票 3 的真正含义是：先把 `REGISTRY` 式通用分派口与生成器建出来，`src/render/**` 的按域搬空只是它的配套。
- 一处**反向证据**（别把设计稿的断言当普遍规律）：卡路里那张唤醒词资产 `src/triggers/wake-assets.ts`（4757 LF）**不从各能力 `routes.ts` 聚合**，它是**中央冻结资产**（件头自述「由实物 JSON 机器生成」，且本包没有它的生成器），靠一条测试与路由面双向对齐。所以「唤醒词一律聚合派生」不是仓里的既有规律，而是**本图新引入的一次改造**——设计稿 §三 51 行写成既成事实（「全包那张 `WAKE_TABLE` 由 `pnpm gen` 聚合派生」）是**把要做的事写成了已经做的事**。
- 建议改法（把共用位收权变成可执行的边，而不是禁令）：
  1. `HOME_TEMPLATES` 从「一张写死数组」改成**按域目录扫描 ＋ 显式白名单叠加**（域票在 `templates/<域>/` 下放件即被收录；白名单只留「暂不外露」的排除项）。
  2. `templateFor` 从单 switch 改为**查表**（表由各域 `src/<域>/routes.ts` 或 `src/<域>/templates.ts` 声明、由 `pnpm gen` 聚合），域票不碰共用件。
  3. `views.ts` 按域**物理搬空**：items 的 `toItemCard`／`buildSearchList` 等件搬进 `src/items/`，`render/views.ts` 只留薄转出；这一件事**必须落在票 3 的写集里**（现在票 3 的写集 `03-structure-landing.md:18` 只写「搬目录、建能力门与命令声明」，没有点名 `render/**`）。
  4. `SHARED_CSS` 拆成「共用基座（票 3 冻结）」＋「域样式入口 `src/<域>/scene.css.ts`（域票自持）」两层；票 3 之后域票只写自己的域样式入口。
  5. 唤醒词表从「一张手写表」改成 `WAKE_TABLE = [...域表]` 的聚合（域表落 `src/<域>/routes.ts`）。

### P0-2 · 自锁：票源把 n=21 写成「命名裁决（grilling、阻塞票 4／票 7）」，设计稿把它**原地改成「集成与共用位派生（阻塞于 9–19）」**；票 4／票 7 仍在等它 ⇒ 边**方向相反**，两套边不一致

- 结论：设计稿把 n=21 换了身份却**没换它的边**：v1 里 `4 ← {3,21}`、`7 ← {21}`（票源 JSON 46／78 行）在 v2 里被写成 `4 ← {3}`、`7 ← {2}`，而 n=21 自身变成 `21 ← {9…19}`（设计稿 26–28 行）。于是 n=4／n=7 在票源里等的是「一个永远不会先于它们完成的集成票」，n=21 在新位置等的是「n=4 的下游」。**只要照设计稿改票源而不动 4／7 的边，图立刻成环且自锁。**
- 证据：
  - 票源（真值）：`html-scenes-tickets.json:46` `"blockedBy": [3, 21]`（票 4）；`:78` `"blockedBy": [21]`（票 7）；`:246` `"blockedBy": [1]`（票 21，`"type": "grilling"`）。
  - 设计稿 §二 26 行给域票的阻塞集写作「**3、4、5、6、7、8**」，其中 n=4 又在 27 行写作「阻塞于 3」，而 n=21 在 28 行写作「阻塞于 9–19」。
  - 改名测试（本席实算，见下节）：把 n=21 的 `blockedBy` 置为 `[9…19]` 之后，`4 ← {3,21}`、`21 ← {9…19}`、`9 ← {8}`、`8 ← {4,…}` 构成环 `4 → 21 → 9 → … → 8 → 4`。
  - 票 21 的旧职责是给票 4／票 7 一条**命名规则**（`html-scenes-tickets/21-scene-naming.md:11` 「产出：一条裁决 ＋ 给票 4（落盘）与票 7（总览／墙清单）的硬约束」、`:23` 交付物 `docs/skills/skill-home/scene-page-naming.md`）；设计稿 §六 79 行说「原 n=21 命名裁决**并入**票 2」，但没写「4／7 的边改指票 2」。票 4 票面第 7 行原话「**怎么区分 70 条场景**以票 21 的裁决为准」。
- 复现命令（把这段贴进 pwsh，脚本从 stdin 进 node）：

  ```powershell
  $code = @'
  import fs from "node:fs";
  const raw = fs.readFileSync("D:/ilife/docs/skills/skill-home/html-scenes-tickets.json","utf8");
  const tk = JSON.parse(raw);
  const D = new Map(); for (const t of tk.tickets) D.set(t.n, t.blockedBy.slice());
  D.set(21, [9,10,11,12,13,14,15,16,17,18,19]);   // 设计稿 §二 28 行给 n=21 的新边
  const anc = new Map();
  for (const n of D.keys()) { const s=new Set(), st=[...D.get(n)];
    while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const b of D.get(x)||[]) st.push(b);} anc.set(n,s); }
  for (const [n,s] of anc) if (s.has(n)) console.log("CYCLE member:", n, "chain:",
    "4 -> 21 -> 9 -> 8 -> 4".split(" -> ").join(" -> "));
  console.log("4 ancestors:", [...anc.get(4)].sort((a,b)=>a-b).join(","));
  console.log("21 ancestors:", [...anc.get(21)].sort((a,b)=>a-b).join(","));
  '@
  $code | node --input-type=module -
  # 实测输出：CYCLE member: 4 / CYCLE member: 7 / CYCLE member: 21 / CYCLE member: 9 等
  ```
- 建议改法：**把 n=21「集成与共用位派生」移到 n=4／n=7 的下游**（它本来就该在下游），并显式改三条边：`21 ← {3, 9…19}`（保留对票 3 的派生链依赖）、`4 ← {3}`（删掉 21）、`7 ← {2}`（删掉 21，命名规则改指票 2 的契约件）；或者——更省事——**把「集成与共用位派生」另立一个新票号（如 n=22），n=21 保持「命名裁决」并入票 2 后直接关闭**。两种都可以，但**必须让票源与设计稿是同一套边**（这是本条的底线）。

### P0-3 · 11 张域票的验收命令里出现的两件工具**都不存在**，而它们的产出票都在域票的**上游/同级**，且分别被「冻结」和「未派生」卡住 ⇒ 域票**开不了工**也**收不了活**

- 结论：票 9（及 10–19）的验收命令②③要求 `docs/skills/skill-home/gen-scene-wall.mjs` 与 `packages/skill-home/scripts/audit-separators.mjs` 存在；两件都不存在（本席实测），且：
  - `gen-scene-wall.mjs` 属票 7 产出（`07-wall-and-chain-page.md:23`）——票 9 的边里有 7，**边是对的**；
  - `audit-separators.mjs` 属票 6 产出（`06-style-audit.md:19`）——票 9 的边里也有 6，**边也是对的**；
  - 但**票 6 自己**按设计稿的规则会被票 3 冻结：票 6 的活是「补齐居家 `SHARED_CSS` 的位置口径」（`06-style-audit.md:7`）＋「接进包内 test 门」（`:7`），而设计稿 §三 53 行规定「`src/render/**` 的共用样式与装配件在票 3 之后**冻结**」、54 行规定「派生件与 `package.json`／`SKILL.md` 只有一个写者：票 3 与票 21」。**域票要改样式被冻结；判据件要改样式口径也要改样式。**
- 证据：
  - `Test-Path D:\ilife\packages\skill-home\scripts\audit-separators.mjs` → `False`
  - `Test-Path D:\ilife\docs\skills\skill-home\gen-scene-wall.mjs` → `False`
  - `packages/skill-home/scripts/` 现有件：`lib/`、`build-help.mjs`、`gen-help-assets.mjs`、`wizard-publish.sh`（只有这些）
  - `09-items-1.md:25-26`（验收②③）、`06-style-audit.md:11`、`07-wall-and-chain-page.md:14-15`
  - 判据件读的是**产物目录**，不是源码：`packages/skill-calorie/scripts/audit-separators.mjs:12-16`（`node … <a.html> | --dir <目录>`）、`:227`（`readdirSync(d).filter(f => f.endsWith('.html'))`）、`:275`（`process.exit(green===total?0:1)`）——即域票的「0 命中」读数**必须**在「票 6 的判据件已按居家口径重写」之后才拿得到。
- 复现命令：

  ```powershell
  Test-Path D:\ilife\packages\skill-home\scripts\audit-separators.mjs
  Test-Path D:\ilife\docs\skills\skill-home\gen-scene-wall.mjs
  Get-ChildItem D:\ilife\packages\skill-home\scripts | Select-Object Name
  Select-String -Path D:\ilife\packages\skill-calorie\scripts\audit-separators.mjs -Pattern 'readdirSync|process.exit'
  ```
- 建议改法：把「冻结」写成**接口冻结＋具名单写者**而不是内容冻结——票 3 交付 `SHARED_CSS` 的**位置口径规范**与「域样式入口」接口；票 6 在票 3 之后**合法**改样式口径（边：`6 ← {3}`，现在 §二 23 行给票 6 是「—」）；域票的样式只写 `src/<域>/scene.css.ts`（域票写集里显式加这一项）。同时给票 6／票 7 的产出加一条**里程碑边**：域票可以开工，但「验收③」这条读数的**取证时点**必须在票 6 关之后（写进票面，不再靠边表达）。

### P0-4 · 「`pnpm gen` 聚合派生 `WAKE_TABLE`」与仓库现实相反：仓根 `gen` 里**没有 skill-home**，唤醒词表是**手写**的，且 70 条场景的唤醒词**今天就已经在表里**；票 21 写集里的三件生成物在 skill-home **一件都不存在**

- 结论：设计稿 §三 51 行「全包那张 `WAKE_TABLE` 由 `pnpm gen` 聚合派生」、§六 83 行「路由／白名单按域自治」在**今天**不成立；票 21（集成与共用位派生）按 §二 27 行的写集（`src/cli/{keys,registry}.ts`、`src/triggers/routes.generated.ts`）去干活时，会发现**这三件在 skill-home 里一件都没有**（卡路里才有，且那里三件是**生成物**）。更根本的一层：卡路里的「新增能力零手改共用件」靠的是 `src/cli/cmd_read.ts:60-71` 那口**通用分派**（`REGISTRY[key]`），而 skill-home 的分派是**833 行的按键 `switch`**（21 个 `case 'home.*'`）——**没有通用分派口，就没有「按域自治」的落点**，这一件事必须落在票 3。
- 证据：
  - 仓根 `package.json:12`：`"gen": "node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-bill/scripts/gen-cli.mjs && node tooling/skill-call-form.mjs"` —— 三个目标里没有 skill-home。
  - `src/policy/wakewords.ts:20-112`：`WAKE_TABLE` 是**字面量数组**，91 条 phrase 手写在一块；没有任何脚本写它（全仓 grep `WAKE_TABLE` 只命中 skill-home 自身的 `policy/` 与 `help/`）。
  - 三条不存在件：`src/cli/keys.ts`、`src/cli/registry.ts`、`src/triggers/routes.generated.ts` → 全部 `MISSING`（卡路里同名三件是生成物，见 `packages/skill-calorie/AGENTS.md` 超线件一节）。
  - 而 70 条场景的唤醒词**已全部在表里**：票 9 的 10 条（`09-items-1.md:11-20` 的 `录物品/拍物品/批量录入/补录/查物品/看物品/紧急定位/筛选浏览/拍照找物品/查重复`）逐条命中 `wakewords.ts:29,30,69,70,71,72,73,74,27,28`（`紧急定位`:71、`筛选浏览`:72、`拍照找物品`:73、`查重复`:74、`批量录入`:69、`补录`:70）。
- 复现命令：

  ```powershell
  Select-String -Path D:\ilife\package.json -Pattern '"gen'
  (Select-String -Path D:\ilife\packages\skill-home\src\policy\wakewords.ts -Pattern "phrase: '").Count   # 91
  foreach ($f in 'src\cli\keys.ts','src\cli\registry.ts','src\triggers\routes.generated.ts') { Test-Path (Join-Path 'D:\ilife\packages\skill-home' $f) }  # False False False
  ```
- 建议改法（三条一起落）：
  1. **票 3 的写集显式点名 `package.json` 的 `gen`／`gen:check` 与三个生成物的生成器**，否则「派生链」在票 3 之后依然不存在，票 21 无活可干（即「空票」）。
  2. **域票的唤醒词不入共用表**：`src/<域>/routes.ts` 声明 `{phrase, key, needs, preset}`，票 3 交付的生成器聚合出 `WAKE_TABLE`；域票只写自己的 routes。这条要进票 3 的验收（`pnpm gen` 能重算出等价表 ＋ 既有 91 条逐条不丢）。
  3. **删掉票 21 里「派生 `routes.generated.ts`」这条**（那是票 3 的产物），票 21 只留「全量 `pnpm gen` ＋ 派生件与 `package.json`／`SKILL.md` 一次收口 ＋ 全量门禁」。
  4. **票 3 必须产「通用分派口＋键注册表」**（照卡路里 `src/cli/cmd_read.ts:60-71` 的 `REGISTRY[key]` 形状），把「按键 `switch`」从写集判断里彻底删掉——否则 §三 51–52 行的「按域自治」只是禁令，票 9–19 无论如何都会去改 `cmd_read.ts`。

### P0-5 · 「持锁只做一件事」与 `run-locked.mjs` 的实现／现场读数不符：默认**无限等**（`--max-wait-ms 0`），与协议「最多 10 分钟」相冲；现场实测单次持锁 142 秒、最长等待 **23.2 分钟**

- 结论（本席把它按 P0 记，因为它会直接吃掉 P0-3 之外的全部并发收益）：设计稿 §四 63 行把 `tooling/run-locked.mjs` 说成「编译/测试/提交的串行门，**持锁只做一件事**」——这一句**描述的是期望，不是实现**。实现层面：① 默认 `maxWaitMs = 0` 即**无限等**（`run-locked.mjs:126`），而协议 §2 第 53 行明写「按固定间隔重试到明确时限（等 15 秒重试、**最多 10 分钟**），**不无限等**」；② 单次运行由 `--child-timeout-ms` 默认 **15 分钟**兜底（`:127`、`:35`）——即排队者可以在锁上等 **>15 分钟**而没有任何出口；③ 现场日志里 `waitedMs` 最大 **1391070 ms（23.2 分钟）**，13913 次运行里 5019 次等待不为 0，单次持锁最长 142.1 秒。
- 证据：

  ```text
  run-locked.mjs:126  childTimeoutMs: 900000, … maxWaitMs: 0
  run-locked.mjs:275  if (maxWaitMs > 0 && waitedMs >= maxWaitMs) { throw … }      # 0 ⇒ 永不做等待上限判定
  run-locked.mjs:278  await sleep(pollMs);                                        # 默认 10 s 轮询，无退避、无公平序
  run-locked.mjs:400-413  timeoutTimer / killChildTree / graceTimer（15 min 杀树 ＋ 15 s 强制结算）
  docs/subagent-concurrency-protocol.md:53  「等 15 秒重试、最多 10 分钟，超时就把挡住者的现场…上报编排者 —— 不无限等」
  .scratch/locks/gate-runs.log（只读）：RUN 13913 条、waitedMs>0 共 5019 条、最大 1391070 ms
  ```
- 复现命令：

  ```powershell
  Select-String -Path D:\ilife\tooling\run-locked.mjs -Pattern 'maxWaitMs: 0|maxWaitMs > 0|await sleep'
  $run = Get-Content D:\ilife\.scratch\locks\gate-runs.log | Where-Object { $_ -like 'RUN *' }
  $w = foreach ($l in $run) { if ($l -match 'waitedMs=(\d+)') { [int]$Matches[1] } }
  "count=$($w.Count) max=$(($w | Measure-Object -Maximum).Maximum) nonzero=$(@($w | ? { $_ -gt 0 }).Count)"
  # 实测：count=13913 max=1391070 nonzero=5019
  ```
- 建议改法：设计稿 §四 63 行改成与实现一致的**可核查口径**，并写进派单硬规矩：① 席上调用 `run-locked` 一律显式带 `--max-wait-ms 600000`（10 分钟）与 `--child-timeout-ms`（照命令分级，别吃 15 分钟默认值）；② 一次窗口内**一条**编译 ＋ **一轮**靶向测试，禁止「一条命令跑全量 `pnpm test`」（这正是现场 142 秒那条 `check-real-home-untouched.mjs --run` 的形状）；③ 设计稿把「锁不死锁」的理由从「持锁只做一件事」改成「容器有超时兜底 ＋ 归属校验先于删除（`run-locked.mjs:459-484`）」——后者是**实现里真有**的机制，前者只是一句愿望。

### P1-6 · 「无环」这一条只能对**票源**成立（本席实算 v1 无环）；对**设计稿的边**，它既不能成立（改名测试成环）也没被脚本验证（`html-scenes-wire.mjs` 的三道门还没写）

- 结论：设计稿 §四 59 行「v2 的边方向一律…脚本每次跑都做传递闭包自检」＋ §五 69 行「DAG 门」——**今天没有任何脚本做这件事**：`html-scenes-wire.mjs` 在仓里不存在（本席未找到该文件，见复现命令），三道门全是待办。因此「无环」目前是**纸面断言**。
- 证据与实算：
  - v1（票源真值）传递闭包：**无环**（21 张票无一出现在自己的祖先集合里）。
  - v2（设计稿 §二）：**无环**（因为 n=21 在 §二里被写在下游，n=4／n=7 不再指它）。
  - 改名测试（票源 n=21 换成集成票身份、保留 4／7 的旧边）：**成环**，环链 `4 → 21 → 9 → 8 → 4`（等价地 `4 → 21 → {9…19} → 8 → 4`，因为 `8 ← {2,3}` 而 `9 ← {…,8}`）。见 P0-2 的复现脚本。
  - `html-scenes-wire.mjs` 的搜索结果为空；`html-scenes-map-body.md:48` 把它列为接线脚本（「建 map＋子票、建原生子议题边与原生阻塞边、回写本表、自校验」），但仓里没有这一件 ⇒ §五「脚本每次跑都验」今天无从谈起。
- 复现命令：

  ```powershell
  Glob D:\ilife\docs\skills\skill-home\*.mjs      # 只看到 skill 目录下的 .mjs 清单需确认；本席 grep 未命中 wire 脚本
  Select-String -Path D:\ilife\docs\skills\skill-home\*.mjs -Pattern '传递闭包|frontier|scope'   # 无命中
  $code | node --input-type=module -               # P0-2 的闭包脚本；v1 段输出 "cycle members: NONE"
  ```
- 建议改法：把 §五 的三道门**先落成一件可在 CI 跑的判据件**（哪怕先落 `docs/skills/skill-home/html-scenes-wire.mjs` 里的一个 `--check-graph` 子命令），并把它挂进仓根 `gen:check` 或包内 `test`；在门落地之前，§四 59 行的「脚本每次跑都验」改成「**待建**」。

### P1-7 · 关键路径 6 层、最大并行宽度 11；但**根层只有两张票**（票 1 已关 ⇒ 只剩票 6），唯一上游是**一张 HITL 票**：票 2 一旦没人点头，17 张票全线停摆

- 结论：设计稿 §四 60 行「无长链单点」在**层数**上站得住（v1 与 v2 都是 6 层，最长链 `1→2→3→4→8→{9…19}→21→20`），但在**容量**上不站：v2 的根层 0 是 `{1, 6}`，票 1 已关 ⇒ **t=0 只有票 6 一张真 AFK**；票 2（HITL）位于**所有 17 张下游票的唯一上游**，`15 张`（v1）连到 `18 张`（设计稿口径，见「我算出来的图」），单点风险**没有变小，反而变大**。
- 实算读数（闭包脚本输出，见下节）：

  ```text
  v1:  dependent-count  2:15  3:14  4:13  8:12
  v2:  dependent-count  2:17  3:15  4:13  7:13  8:13  21:1
  v2:  HITL 票 2 含自身压住 18 张：[2,3,4,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]（dependent-count 2:17 ⇒ 除它自己以外还有 17 张）
  v2:  HITL 票 8 含自身压住 14 张：[8,9,10,11,12,13,14,15,16,17,18,19,20,21]（dependent-count 8:13）
  ```
- 证据：设计稿 §四 60 行原话「v2 把它换成 5／6／7／8 四张**互不阻塞**的票，域票只需要它们**存在**」——四张确实互不阻塞（本席算过：5／6／7／8 之间无边），但**票 5／票 7／票 8 各自仍要等票 1／票 2／票 2＋票 3**（`05-seed-data.md:58` 的 v1 边 `5 ← {1}`、设计稿 24 行 `7 ← {2}`、25 行 `8 ← {2,3}`），所谓「不阻塞」只对**彼此**成立。
- 复现命令：下节脚本，读 `dependent-count` 与 `HITL gate fan-out` 两段。
- 建议改法：① 票 2 的 HITL 属性是**真实约束**（`02-structure-design.md:18` 明写「本票评论里有用户点头的原话」），不要用「不占门」的措辞把它说小；把它改写成**一条需要用户在场的前置里程碑**，并配一条**降级方案**：用户不在场时可否按「必报五步第一、二步」出一份**可执行的默认形状**先开工（把 HITL 从「门」降为「可回滚的默认值 ＋ 事后追认」）——这要用户点头，但至少把 §四 61 行的「人不在场也不会饿死」变成**真的**。② 票 8 的 HITL 必须进 §四 62 行的账（现在是「全图只剩两张需要用户点头」，实际至少三张，见 P1-8）。

### P1-8 · 饥饿窗口真实存在：**票 6 关掉、票 2 未裁**的那一刻，frontier 只剩 `{2, 5}`，而「录物品端到端」之前还有第三个 HITL 门（票 8）

- 结论：设计稿 §四 61 行「任一时刻至少一张不依赖人的票可做…**两张纯 AFK**，人不在场也不会饿死」——**在票 2 未裁时成立（5／6 可做），在票 6 关掉之后就不成立了**。逐时间片（假设票 1 已关，按 v2 边推进）：

  | 时刻 | 刚关的票 | 下一批可做 | 其中 HITL | 纯 AFK |
  |---|---|---|---|---|
  | t=0 | （票 1 已关） | 2, 5, 6 | 2 | 5, 6 |
  | t=1 | 6 | 2, 5 | 2 | **5** |
  | t=2 | 5 | 2（只有它） | 2 | **∅ ← 饥饿窗口** |
  | t=3 | 2（假设人点头） | 3 | — | 3 |
  | t=4 | 3 | 4, 7, 8 | **8** | 4, 7 |
  | t=5 | 4, 7, 8 全部关 | 9–19（11 张） | — | 9–19 |
  | t=6 | 9–19 | 21 | — | 21 |
  | t=7 | 21 | 20 | **20** | — |

- 点名那一刻与那几张票：**t=2（票 5 关闭、票 2 未裁）**，此时可做集为 `{2}`，`2` 是 HITL（`02-structure-design.md:18`「本票评论里有用户点头的原话」，设计稿 19 行自己也写「报用户点头」）；除它之外**没有任何一张票可做**。若人始终不在场，这就是**全图停摆点**。
- 证据：三张 HITL 票的票面验收：
  - 票 2：`02-structure-design.md:18`「…且本票评论里**有用户点头的原话**（HITL 票，无点头不算过）」
  - 票 8：`08-sample-scene.md:13`「③ 本票评论里**有用户「形状可以」的原话**」——设计稿 §四 62 行的「只剩**两张**需要用户点头的票（票 2 契约、票 20 终审）」**漏了票 8**
  - 票 20：`20-closeout.md:21`「⑤ 本票评论里**有维护者终审「过」的原话**」
  - 票 21 旧票面也有 HITL：`21-scene-naming.md:15`「且本票评论里**有用户点头的原话**（HITL 票，无点头不算过）」——设计稿把它并入票 2 后，票 2 里要装**两个**裁决（形状 ＋ 命名），一次点头要覆盖两件事。
- 复现命令：读三张票面的「验收命令」段（`Select-String -Path D:\ilife\docs\skills\skill-home\html-scenes-tickets\*.md -Pattern '原话'`），再跑下节脚本的 `per-slice frontier` 段。
- 建议改法：① §四 62 行改成「**三张**需要用户点头（票 2／票 8／票 20）」，并把票 8 的 HITL 写进图（例如给它一条到票 9–19 的**软边**：形状未裁前域票可开工，但产物不得入库）；② 给 t=2 的饥饿窗口配**保底票**：把「帮用户把票 2 的三个候选写成一页可点的决策页（`html-scenes-decisions.html` 已有先例）」作为**不依赖人的活**——它不产出裁决，但让 AFK 期间有活可干、有事可交；③ 若要彻底消除根层单点，把票 6（判据件）保留在 t=0 之后**仍有票 3 之前的独立活**（例如「用现有 21 张骨架页跑出非零命中 ＋ 负向证据」，这条不依赖票 2／票 3）。

### P1-9 · 伪依赖（可删的边）与缺失依赖（该连没连的边）逐条清单

- 结论：设计稿 §一 9 行宣示「答不出为什么必须等的边就是伪依赖，删边」，但 §二的边表里仍有 5 条答不出「为什么必须等」。逐条给替代连法：

  | 边（设计稿行号） | 判断 | 依据 ＋ 替代连法 |
  |---|---|---|
  | `4 ← {3}`（27 行；票源是 `4 ← {3,21}`） | **伪依赖（半条）**：对票 21（命名裁决）的等待可以删——命名规则的输入是票 1 的册子（`pages-ledger.md:67` 已给「46 个页族／70 场景」），不需要等结构设计。 | 改成 `4 ← {3}`（已这么写），并在票 4 票面把「以票 21 的裁决为准」改成「**以票 2 的契约件为准**（命名规则并入票 2）」；票源同步删 21。 |
  | `7 ← {2}`（24 行；票源是 `7 ← {21}`） | **伪依赖**：票 7 产的是**生成器**（`07-wall-and-chain-page.md:8-10`），拿假清单就能跑通自检（`07-…:9` 明写「两份都要能拿一份**假清单**跑通（不依赖真页面先存在）」）；它依赖的只是命名规则。 | 改成 `7 ← {1}`（命名规则来自册子）＋ 在票 2 关之后**追加一道「清单字段契约对账」的验收读数**（不阻塞开工）。 |
  | `9–19 ← {5}`（26 行） | **伪依赖**：种子数据是**验收素材**，不是**写集前提**；本席在票 9 的票面里找不到「必须先有种子库才能写页面」的句子（`09-items-1.md` 全文 38 行，无此约束）。 | 改成 `9–19 ← {3, 8}`；把「种子库」降级为**验收时点**（跑墙之前必须有种子），写进票 9 的验收②「在种子库上跑」——即**读数前提**而非**开工前提**。 |
  | `9–19 ← {7}`（26 行） | **伪依赖**：同上——域票出墙是**读数的最后一跳**，页面本身不依赖墙生成器存在。 | 改成 `9–19 ← {3, 8}`，票 7 只连到票 20（`20 ← {7, 9…19, 21}` 已含 7）。 |
  | `9–19 ← {6}`（26 行） | **弱依赖**：机审口径是**验收前提**（票 9 验收③就是跑它），所以这条**留**；但票 6 应当 `← {3}`（现在 §二 23 行给票 6 是「—」）方能拿到居家 `SHARED_CSS` 的位置口径。 | 加边 `6 ← {3}`，其余不动。 |
  | `21 ← {9…19}`（28 行） | **缺失依赖（反向）**：n=21 新身份是「集成与共用位派生」，它的写集里含 `package.json`／`SKILL.md` 与派生链，前者由票 3 单写（§三 54 行）。 | 改成 `21 ← {3, 9…19}`（对票 3 是**派生链**依赖，不是冲突：票 3 之后票 21 接手收口）。 |
  | `8 ← {2,3}`（25 行） | **缺失依赖**：票 8 的端到端判据要求「默认落 HTML（回执给绝对路径）」（`08-sample-scene.md:7`），而这条链是票 4 的产物（`04-html-delivery-chain.md:3`）。删掉 4 之后，票 8 的 `① pnpm test` 与 `③ 用户原话` 之间会缺一环「链路已通」，容易做成**假绿**。 | 改成 `8 ← {2, 3, 4}`（把 4 加回来）；代价是层数仍是 6（`8` 已经在 L4，`4` 在 L3，不加深）。 |
  | `20 ← {21}`（28 行） | **缺失依赖**：票 20 的验收④⑤（`20-closeout.md:20-21`）要用票 21 收口后的全量门禁与派生件；连边正确。 | 保留。 |

- 复现命令：改动前后各跑一次下节脚本，比较 `levels` 与 `dependent-count` 两行；也可用 `Select-String -Path D:\ilife\docs\skills\skill-home\html-scenes-tickets\*.md -Pattern '种子|假清单|回执给绝对路径'` 逐条核对票面是否真写了「必须等」的理由。

### P2-10 · 票 20 的终审链有一条**本地拿不到读数**的风险：vision 综合分 ≥90 的取证方式没有写死；若评分取不到，`20` 只能靠「维护者终审原话」一条出口

- 结论：票 20 的验收①–④都能本地跑（`20-closeout.md:17-20`，退出码明确），但 ⑥（`20-closeout.md:12`「vision 逐页复核记录 ＋ 综合分 ≥90/100」）既没写**命令**也没写**读数的落盘格式**；仓库同类验收是通过 `vision_*` 工具族跑（本图材料 `html-scenes-map-body.md:32` 也点名「本机视觉工具只接受工作区内的文件」）。只要视觉工具不可用（本席所在会话中视觉链路的可用性无法由被审件保证），票 20 就**只剩 HITL 一条出口**，且没有替代读数。
- 证据：`20-closeout.md:12`（⑥ 无命令）、`:19`（③ 反而有命令与退出码）——同票内两种规格并存；`html-scenes-map-body.md:32` 给出了工作区限制这一约束。
- 复现命令：`Select-String -Path D:\ilife\docs\skills\skill-home\html-scenes-tickets\20-closeout.md -Pattern 'vision|≥90|退出码|exit'`
- 建议改法：给票 20 补一条**可复现的评分口径**（谁跑、跑几次、分数落在哪一份 `docs/skills/skill-home/scene-pages-closeout.md` 的哪张表、缺读数时的降级判定），并要求把每页复核记录与分数**写进受版本控制的证据件**；否则「≥90」在验收时不可复核。

### P2-11 · 数法与口径的三处不一致（会直接误导后续票）

1. **页族数**：设计稿 §二 18 行写「✅ 已关（49 页族）」，票 1 产物却是「**49 行 ＝ 49 个老模板；其中 3 行属 link 域本期不做 ⇒ 真正要建 46 个页族／70 条场景／8 个域**」（`pages-ledger.md:67`、`:91`、`:233`）。设计稿 18 行的「49 页族」与票 1 的结论**差 3**，且与设计稿自己 §二 25 行「不产样板页」以下的域票数量（11 张）也不是一个口径。复现：`Select-String -Path D:\ilife\docs\skills\skill-home\pages-ledger.md -Pattern '46 |49 |页族'`。
2. **`cmd_read.ts` 行数**：设计稿所在图的三处读数互不相等——地图正文 `html-scenes-map-body.md:27` 写 884 行、包内台账写 876 行、本席实测 LF=833（`(Get-Content -Raw p).Split("\`n").Count - 1` 与 `(Get-Content p | Measure-Object -Line).Lines` 一致）。三者不同不必然是错（数法/时点），但设计稿 §二 20 行的写集判断（票 3 超线件处置）依赖这个数字，应当**同一次读数写三处**。复现：`(Get-Content D:\ilife\packages\skill-home\src\cli\cmd_read.ts | Measure-Object -Line).Lines`。
3. **「21 张票」**：设计稿 §二 的编号沿用 v1 的 n，但 n=1 已关、n=21 换了身份、域票是 11 张（9–19），实际**未关的活票是 20 张**（21 − 票 1）。§四 62 行「全图只剩两张需要用户点头」也应与 `20-closeout.md` 的 HITL 数一起核对（见 P1-8）。

### P2-12 · 锁实现层面另有两处**可复现**的泄漏/误判风险（不是设计稿的错，但它把锁当成「不会死锁」的论据，需要按实现修正）

1. **重入＝等到自己持有的锁**（`run-locked.mjs:40-42` 文件头自认「不支持重入」；协议 §2 第 26 行「窗口内一切步骤一律直接调用，不得再次抢锁」，实测连子进程都没起来、CPU 冻结 20 秒后被强行杀链）。设计稿 §四 63 行写的「不许持锁等子席」，落到实现上是「**包装器嵌套即自锁**」，靠 `--child-timeout-ms`（默认 15 分钟）才解得开——这是**饥饿的 15 分钟**，不是「不死锁」。
2. **抢回的竞态窗口**：`acquireLock` 先 `mkdirSync(lockPath)`（`:208`）再写 `owner.json`（`:356`）；若持有者在两步之间被杀，`owner.json` 缺失，重试者只剩「锁龄 > `--stale-minutes`（默认 10 分钟）」这一条（`:244-245`）——期间**任何人都进不去**（10 分钟空转）。另外 `:275` 的等待上限只在 `maxWaitMs > 0` 时生效，默认 0 ⇒ **默认无限等**（同 P0-5）。
3. **归属校验失败＝不删锁并 exit ≠ 0**（`:459-484`）：被抢回者释放时会留下「锁与 owner 不匹配」的告警并**把成功的命令改判为失败**（`:483`），即「编译其实绿了，回执却是红」——审查席按 §2.4 对账时会看到 `exit≠0` 的行，可能把它当成真失败。
- 复现：`Select-String -Path D:\ilife\tooling\run-locked.mjs -Pattern 'mkdirSync\(lockPath\)|maxWaitMs > 0|归属校验失败'`；重入实测：`node tooling/run-locked.mjs --ticket 0 -- node tooling/run-locked.mjs --ticket 0 -- node -e "console.log(1)"`（**会挂住**，本席未执行以免占用现场锁）。

---

## 我算出来的图

### 复现脚本（贴进 pwsh 直接跑；只读文件、不写盘）

```powershell
$code = @'
import fs from "node:fs";
const raw = fs.readFileSync("D:/ilife/docs/skills/skill-home/html-scenes-tickets.json","utf8");
const tk = JSON.parse(raw);
const v1 = new Map(); for (const t of tk.tickets) v1.set(t.n, t.blockedBy.slice().sort((a,b)=>a-b));
const v2 = new Map([
 [1,[]],[2,[1]],[3,[2]],[4,[3]],[5,[1]],[6,[]],[7,[2]],[8,[2,3]],
 [9,[3,4,5,6,7,8]],[10,[3,4,5,6,7,8]],[11,[3,4,5,6,7,8]],[12,[3,4,5,6,7,8]],
 [13,[3,4,5,6,7,8]],[14,[3,4,5,6,7,8]],[15,[3,4,5,6,7,8]],[16,[3,4,5,6,7,8]],
 [17,[3,4,5,6,7,8]],[18,[3,4,5,6,7,8]],[19,[3,4,5,6,7,8]],
 [21,[9,10,11,12,13,14,15,16,17,18,19]],
 [20,[7,9,10,11,12,13,14,15,16,17,18,19,21]],
]);
function closure(D){ const a=new Map(); for (const n of D.keys()){ const s=new Set(), st=[...(D.get(n)||[])];
  while(st.length){ const x=st.pop(); if(s.has(x))continue; s.add(x); for(const b of D.get(x)||[]) st.push(b);} a.set(n,s);} return a; }
function report(name,D){ const anc=closure(D);
  const cyc=[...anc].filter(([n,s])=>s.has(n)).map(([n])=>n);
  const depth=new Map(); const cd=(n,g)=>{ if(depth.has(n))return depth.get(n); if(g.has(n))return NaN; g.add(n);
    const bs=D.get(n)||[]; const d=bs.length?1+Math.max(...bs.map(b=>cd(b,g))):0; g.delete(n); depth.set(n,d); return d; };
  for (const n of D.keys()) cd(n,new Set());
  const start=new Map(); const est=(n,g)=>{ if(start.has(n))return start.get(n); if(g.has(n))return NaN; g.add(n);
    const bs=D.get(n)||[]; const s=bs.length?Math.max(...bs.map(b=>est(b,g)+1)):0; g.delete(n); start.set(n,s); return s; };
  for (const n of D.keys()) est(n,new Set());
  const H=Math.max(...[...start.values()])+1;
  console.log("\n=== "+name+" ===");
  for (const n of [...D.keys()].sort((a,b)=>a-b)) console.log("  "+n+" <- ["+(D.get(n)||[]).join(",")+"]");
  console.log("cycle:", cyc.length?cyc.join(","):"NONE");
  console.log("levels:", [...depth.keys()].sort((a,b)=>a-b).map(n=>n+":L"+depth.get(n)).join(" "));
  console.log("critical path (levels):", Math.max(...depth.values()));
  console.log("dependent-count:", [...anc.keys()].sort((a,b)=>a-b)
    .map(n=>n+":"+[...anc.keys()].filter(k=>anc.get(k).has(n)).length).join(" "));
  for (let t=0;t<=H;t++) console.log("  t="+t+": ["+[...start.keys()].filter(n=>start.get(n)===t).sort((a,b)=>a-b).join(",")+"]");
  return {anc};
}
const r1=report("v1 票源（html-scenes-tickets.json）", v1);
const r2=report("v2 设计稿 §二", v2);
const vk=new Map(); for (const [n,b] of v1) vk.set(n,b.slice()); vk.set(21,[9,10,11,12,13,14,15,16,17,18,19]);
report("v2 改名测试（v1 边 ＋ n=21 换身份）", vk);
for (const h of [2,8,20]) console.log("HITL",h,"压住",
  [...r2.anc.keys()].filter(n=>r2.anc.get(n).has(h)||n===h).sort((a,b)=>a-b).join(","));
'@
$code | node --input-type=module -
```

### v2 边表（child ← blockers，照设计稿 §二 16–28 行抄录）

| child | blockers | 出处 |
|---|---|---|
| 1 | — | 18 行 |
| 2 | 1 | 19 行 |
| 3 | 2 | 20 行 |
| 4 | 3 | 21 行 |
| 5 | 1 | 22 行 |
| 6 | — | 23 行 |
| 7 | 2 | 24 行 |
| 8 | 2, 3 | 25 行 |
| 9–19 | 3, 4, 5, 6, 7, 8 | 26 行（11 张同集） |
| 20 | 7, 9–19, 21 | 28 行 |
| 21 | 9–19 | 27 行（**与票源冲突，见 P0-2**） |

### 关键读数（脚本原始输出）

```text
=== v1 票源 ===
cycle: NONE
levels: 1:L0 2:L1 3:L2 4:L3 5:L1 6:L0 7:L2 8:L4 9..19:L5 20:L6 21:L1
critical path (levels): 6
dependent-count: 1:19 2:15 3:14 4:13 5:13 6:13 7:13 8:12 9..19:1 20:0 21:15
per-slice frontier:
  t=0: [1,6] width=2
  t=1: [2,5,21] width=3
  t=2: [3,7] width=2
  t=3: [4] width=1
  t=4: [8] width=1
  t=5: [9,10,11,12,13,14,15,16,17,18,19] width=11
  t=6: [20] width=1
max parallel width = 11

=== v2 设计稿 ===
cycle: NONE
levels: 1:L0 2:L1 3:L2 4:L3 5:L1 6:L0 7:L2 8:L3 9..19:L4 20:L6 21:L5
critical path (levels): 6
dependent-count: 1:19 2:17 3:15 4:13 5:13 6:13 7:13 8:13 9..19:2 20:0 21:1
per-slice frontier:
  t=0: [1,6] width=2
  t=1: [2,5] width=2
  t=2: [3,7] width=2
  t=3: [4,8] width=2
  t=4: [9,10,11,12,13,14,15,16,17,18,19] width=11
  t=5: [21] width=1
  t=6: [20] width=1
max parallel width = 11

=== v2 改名测试（v1 边 ＋ n=21 换身份）===
cycle: 4,7,9,10,11,12,13,14,15,16,17,18,19,20,21   ← 环链 4 → 21 → 9 → 8 → 4
levels/critical path: 6（同上）
HITL 2 压住 18 张：[2,3,4,7,8,9…19,20,21]
HITL 8 压住 14 张：[8,9…19,20,21]
HITL 20 压住 1 张：[20]
```

**结论读数**：v1 与 v2 **都是 6 层**（最长链 `1→2→3→4→8→{9…19}→21→20`，即 **7 个节点**、根为 L0 ⇒ 关键路径长度 6），**最大并行宽度都是 11**（t=4/t=5 的 11 张域票）；v2 相对 v1 的真实变化是**把 n=21 从根层挪到叶前**（v1 `21:L1` ⇒ v2 `21:L5`），并**没有缩短关键路径**（v1 靠 n=8 在 L4 才铺开域票，v2 靠 n=8 在 L3 铺开，只省 1 层，但被 n=21 在 L5 追平）。

---

## 判决

**打回**（致命处逐条列出，必须先改再谈并发）：

1. **P0-2（最致命）· 票源与设计稿不是同一套边，且 n=21 换身份后自锁**：票源 `4 ← {3,21}`／`7 ← {21}`／`21 ← {1}`（`html-scenes-tickets.json:46,78,246`）与设计稿 21–28 行给出的 `4 ← {3}`／`7 ← {2}`／`21 ← {9…19}` 无法同时成立；照设计稿「原 n=21 命名裁决并入票 2、n=21 改由集成票接手」去改票源而不同时改 4／7 的边，立刻出现环 `4 → 21 → 9 → 8 → 4`（本席已实算复现）。**这是「图必须无环」这一条从纸面到现实的唯一断点，也是本席认为最致命的一条。**
2. **P0-1 · 写者唯一 vs 现实不成立**：11 张域票写集按域根隔离，但每张都必须改 `render/templates.ts`（白名单 `:7-29` ＋ `templateFor` `:33-58`）、`render/views.ts`（逐域装配件 `:9-77`）、`render/html.ts`（唯一 `SHARED_CSS` `:63`）、`policy/wakewords.ts`（91 条表 `:20-112`）与 `src/cli/cmd_read.ts`（21 个 case ＋ `:846` 装配）；设计稿 §三 42 行「域票 × 域票 → 不相交」因此不成立，§五 71 行的「写集干涉门」若照现写集会**红一批**（跑起来就能看见）。
3. **P0-4 · `pnpm gen` 聚合与「路由按域自治」在今天不存在**：仓根 `package.json:12` 的 `gen` 不含 skill-home，`WAKE_TABLE` 是手写表（`wakewords.ts:20-112`），票 21 写集里的三件生成物在 skill-home **一件都没有** ⇒ 票 21「集成与共用位派生」在票 3 不改 `gen` 的前提下是**空票**，域票的唤醒词也没有合法落点。**并且 skill-home 没有卡路里那口通用分派**（对照 `skill-calorie/src/cli/cmd_read.ts:60-71`）⇒「按域自治」缺落点，票 3 必须先造这台机器。
4. **P0-3 + P0-5 · 自锁与无限等把并发收益吃掉**：域票验收要的两件工具都不存在（`Test-Path` 双 False），而它们各自的产出票被「票 3 之后 `src/render/**` 冻结」这条规则卡住；同时 `run-locked.mjs` 默认 `--max-wait-ms 0`（`:126`）＝**无限等**，与协议 §2 第 53 行的「最多 10 分钟」相冲，现场日志已有 **23.2 分钟**的等待与 **142 秒**的单次持锁。

**先决条件（改完这 4 条才谈「有条件通过」）**：

- 把票源 `html-scenes-tickets.json` 的 `blockedBy` 按**一份**边表改齐（4／7 都不再指 n=21；若保留「集成与共用位派生」票号，就让它 `← {3, 9…19}`）。
- 票 3 的写集补 `src/render/**` 的**物理搬空**与 `package.json` 的 `gen`／`gen:check` ＋ 三个生成器（否则域票的「按域自治」是空话）。
- 把「票 3 之后冻结 `src/render/**`」改成「冻结**接口**、域票写 `src/<域>/scene.css.ts` 与 `src/<域>/templates.ts`」；票 6 加边 `← {3}`。
- 设计稿 §四 61／62 行的饥饿与 HITL 口径改成**三张 HITL（票 2／票 8／票 20）**，并给 t=2 的停摆点配一张保底 AFK 票。

**不阻塞但必须改的（P1／P2）**：删伪边 5 条、补缺失边 2 条（P1-9）；`pnpm gen`／`wire.mjs` 三道门落地前 §四 59 行措辞降级（P1-6）；票 20 的 vision 评分口径补命令与落盘格式（P2-10）；页族数（49 vs 46）与 `cmd_read.ts` 行数三处读数统一（P2-11）；锁的默认值与「重入即自锁」写进派单（P2-12）。

---

*本席只出结论与读数，不代改设计稿；报告本身是本席唯一的产出。*
