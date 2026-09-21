# 对抗式审查 · 席 B（第一性原理 · 干涉 · 是否过度工程）

**被审对象**：`docs/skills/skill-home/scene-pages-graph-design.md`（85 行，v2）
**审查口径**：只找能证伪 v2 的证据；不评优点。所有写集主张一律回真实仓库核对。

## 复核方法

### 跑了什么命令（可复现）

| # | 命令 | 目的 |
|---|---|---|
| M1 | `Get-ChildItem -Recurse -File packages\skill-home \| Where-Object { $_.FullName -notmatch 'node_modules' }` | 取 `packages/skill-home` 真实布局（含 `dist/`、`scripts/`、`templates/`、`test/`） |
| M2 | `Get-ChildItem -Recurse D:\ilife\scripts` / `Get-ChildItem -Recurse -File D:\ilife\test` | 仓根 `scripts/`、`test/` 实况 |
| M3 | `node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');for(const t of s.tickets){console.log(t.n,t.blockedBy)}"` | 取票源**实际** `blockedBy`，与 v2 §三干涉矩阵对账 |
| M4 | `git ls-files packages/skill-home` / `git ls-files --error-unmatch packages/skill-calorie/src/triggers/routes.generated.ts` | 派生件是否入仓 |
| M5 | `Get-ChildItem -Recurse -File D:\ilife\packages -Filter "routes*"` ＋ `-Filter "commands.ts"` ＋ `-Filter "*.generated.*"` | 找 `routes.ts`／`commands.ts`／派生件在哪些包真存在 |
| M6 | `git grep -n "gen:check\|gen-routes\|gen-cli" -- .github tooling package.json` | 派生件门挂在谁身上 |
| M7 | `Get-ChildItem -Recurse -File D:\ilife -Include "new-scene-page*","*scaffold*","new-page*"` | 找「脚手架／样板生成器」本仓是否有先例 |
| M8 | `node -e` 读 `packages/skill-home/src/policy/wakewords.ts` 统计 `phrase:` 重复 | 验 v2 §一「全包一张唤醒词表」的形状 |
| M9 | `Select-String -Path docs\skills\skill-home\html-scenes-tickets\*.md -Pattern "run-locked.mjs --ticket <本票号> -- pnpm test"` | 各域票判据是否同一件 |
| M10 | `(Get-Content package.json)[14].IndexOf('skill-home')` 截取 | 取根 `test` 脚本对 `skill-home` 的**逐字** glob |

### 读了哪些文件（路径＋行数）

| 文件 | 行数／范围 |
|---|---|
| `docs/skills/skill-home/scene-pages-graph-design.md` | 全文 85 行 |
| `docs/skills/skill-home/html-scenes-tickets.json` | 全文 252 行 |
| `docs/skills/skill-home/html-scenes-wire.mjs` | 全文 220 行 |
| `docs/skills/skill-home/pages-ledger.md` | `:7-61`（表一 46 行）、`:60-95`（9 域汇总表） |
| `docs/skills/skill-home/html-scenes-map-body.md` | `:27-42`、`:94-95`、`:164-169` |
| `docs/skills/skill-home/html-scenes-tickets/03-structure-landing.md` | 全文 23 行 |
| `docs/skills/skill-home/html-scenes-tickets/04-html-delivery-chain.md` | 全文 23 行 |
| `docs/skills/skill-home/html-scenes-tickets/05-seed-data.md` | 全文 23 行 |
| `docs/skills/skill-home/html-scenes-tickets/07-wall-and-chain-page.md` | 全文 27 行 |
| `docs/skills/skill-home/html-scenes-tickets/09-items-1.md` | 全文 38 行 |
| `docs/skills/skill-home/html-scenes-tickets/17-receipt-2.md` | 全文 38 行 |
| `docs/skills/skill-home/html-scenes-tickets/21-scene-naming.md` | 全文 27 行 |
| `docs/agents/命令登记纪律.md` | 全文 172 行（重点 `:16-24`、`:51-64`、`:118-131`） |
| `docs/subagent-concurrency-protocol.md` | 全文 195 行（重点 §2、§2.4、§5） |
| `.github/workflows/ci.yml` | 全文 136 行（重点 `:43`） |
| `package.json`（仓根） | `:11-15` |
| `packages/skill-home/package.json` | 全文 |
| `packages/skill-home/src/render/templates.ts` | 全文 |
| `packages/skill-home/src/policy/wakewords.ts` | 全文 |
| `packages/skill-calorie/scripts/gen-cli.mjs` | `:1-90`（文件头 ＋ 45-54 常量） |
| `packages/skill-calorie/scripts/audit-separators.mjs` | `:9-13`、`:215` |
| `packages/skill-calorie/src/triggers/routes.generated.ts` | `:1-30` |

---

## 发现

### P0-1 · `pnpm gen` 今天根本不产出居家任何派生件；v2 §三第 4 条「域票跑 `pnpm gen` 自验」在居家里是一条空命令

**结论**：v2 把「派生链」当成既有事实，实测 `pnpm gen` 只服务 `skill-calorie` 与 `skill-bill` 两包，居家包内一条生成链都没接进来。

**证据**
- `package.json:11-15`（仓根）：
  - `:12` `"gen": "node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-bill/scripts/gen-cli.mjs && node tooling/skill-call-form.mjs"`
  - `:13` `"gen:check"` 同上三件 `--check`
  - 三处硬编码路径里**没有一处**指向 `skill-home`。
- `packages/skill-calorie/scripts/gen-cli.mjs:45-48`：`PKG_DIR = join(HERE,'..')`、`SRC_DIR = join(PKG_DIR,'src')`、`DIST_DIR = join(PKG_DIR,'dist')`、`REPO_ROOT = join(PKG_DIR,'..','..')`；`:746` `d.__src.replace(/^packages\/skill-calorie\/src\//,'')`；`:770` `const targets = [...]`。⇒ 生成器把输入根与输出清单锁死在 calorie 包。
- `packages/skill-calorie/scripts/gen-cli.mjs` 文件头 `:21-27`：输出清单六条全在 calorie（`src/cli/keys.ts`、`src/cli/registry.ts`、`packages/base-combos/combos.yaml`、`scripts/build-help.mjs` 的 REPR／EXAMPLE／FLOW 表）。
- M5 实读：居家包**无** `src/triggers/`、无 `routes.ts`、无 `cli/keys.ts`、无 `cli/registry.ts`。全仓 `routes.ts` 只存在于 `skill-calorie`（10 份）与 `skill-bill/src/triggers/routeSpec.ts`；`*.generated.*` 只有 `skill-calorie/src/triggers/routes.generated.ts`（另有 `dist/` 副本）。
- 居家**自己的**生成链是另一条，且**不在 `pnpm gen` 里**：`packages/skill-home/package.json:34-35` `"gen:help-assets": "node scripts/gen-help-assets.mjs"`、`"gen:help-assets:check": "node scripts/gen-help-assets.mjs --check"`。
- 居家 `package.json:16-19` 的 `files` 白名单是 `"templates/*.html"`（**一级**）。

**复现**
```powershell
cd D:\ilife
node -e "const p=require('./package.json');console.log(p.scripts.gen);console.log(p.scripts['gen:check'])"
Get-ChildItem -Recurse -File packages\skill-home\src | Where-Object { $_.Name -match 'routes|keys|registry' }
Test-Path packages\skill-home\src\triggers
Test-Path packages\skill-home\src\triggers\routes.generated.ts
```

**建议改法**
1. 票 3 的写集**必须显式含** `packages/skill-home/scripts/gen-cli.mjs`（新）＋ `packages/skill-home/scripts/gen-routes.mjs`（新）＋ 仓根 `package.json` 的 `gen`／`gen:check` 两行；把「居家派生链」从**隐含假设**降级为票 3 的**具名交付物**。
2. 在 `html-scenes-wire.mjs` 的 DAG 门之外，加一条**存在性门**：票面写集里每一个 `packages/**/*.ts` 声明路径，若在开工前不存在，必须在票面标 `to-create`，否则拒绝建票。当前 v2 §五只验「写集两两不相交」，不验「写集里的件是否真是本次要新建的」。
3. 票 3 的验收命令 `pnpm gen` 必须换成 `pnpm gen` **加** `pnpm gen:help-assets:check`，并把两者的红/绿读数分开记——它们是**两道不同的门**（见 P1-5）。

---

### P0-2 · v2 §三第 4 条「域票可以本地跑 `pnpm gen` 自验，但不许提交派生件」与仓规正面冲突；照它改，票 9–19 期间 `pnpm gen:check` 必红

**结论**：本仓这套形状的**成立要件之一**就是「派生件入仓 ＋ CI 每轮校验」。v2 禁止域票提交派生件，等于要求 11 张票各自把 CI 弄红，或各自去写同一批共用位——两条路都与 v2 自己的第 1／2 条第一性原理冲突。

**证据**
- `docs/agents/命令登记纪律.md:18-24`（形状成立要件，三条同时为真，缺一条形状就塌）：
  - `:19` 「**哈希锁**——产物**入仓**且「产物 ≠ 生成器输出」即可判定为假」
  - `:20` 「**机器校验在 CI 里真跑**——判定不靠人记得跑，靠 CI 每轮跑」
  - `:22-24` 「一个不接 CI 的生成器、**一个产物不入仓的生成器**、一个排序不确定的生成器，三者都满足不了任何一条」
- `:63` 「**生成物手改无效**：`pnpm gen:check` 比对盘上文件与生成器输出，不等即红并逐条指出第一处差异」
- `:94` 「写盘走 `pnpm gen`，比对走 `pnpm gen:check`」
- `.github/workflows/ci.yml:43` `- run: pnpm gen:check`（`if: always()`，不吞红线）——**每次 push／PR 真跑**。
- M4 实读：「派生件入仓」在真仓库成立：
  - `git ls-files --error-unmatch packages/skill-calorie/src/triggers/routes.generated.ts` → 匹配成功（**已入仓**）。
  - `packages/skill-calorie/src/triggers/routes.generated.ts:1` 头注释即自证：「本文件由 `scripts/gen-routes.mjs` 生成，勿手改（`pnpm gen` 重新生成，`pnpm gen:check` 验真）」。
  - 居家同理：`packages/skill-home/src/help/helpAssets.ts` **已入仓**，`:1-2` 「本文件由 `packages/skill-home/scripts/gen-help-assets.mjs` 生成 —— 禁止手工修改。改动一律走生成器（手改会被 `--check` 判漂移、被 `test/help-assets.test.mjs` 的摘要锁打红）」。
- 域票**真要碰**的派生件正是 `pnpm gen` 的 targets（`gen-cli.mjs:770` 起的 `targets` 数组）：`src/cli/keys.ts`、`src/cli/registry.ts`、`src/triggers/routes.generated.ts`；v2 §二 票 21 写集也逐字写了 `src/cli/{keys,registry}.ts`、`src/triggers/routes.generated.ts`。

**两道门的判别式（把 v2 的两条路都走一遍）**
- 路 A：域票**提交**派生件 ⇒ 11 张票都写 `keys.ts`／`registry.ts`／`routes.generated.ts` ⇒ 违反 v2 §三「写者唯一」与 §五第 2 条干涉门；且每次都要全包 `pnpm gen`，11 席串行。
- 路 B：域票**不提交**派生件 ⇒ 提交后盘上 `registry.ts` 与生成器输出不等 ⇒ `.github/workflows/ci.yml:43` 的 `pnpm gen:check` 红 ⇒ 从票 9 开工到票 21 收口整段窗口，**主线恒红**。
- 两条路都不通 ⇒ v2 §三第 4 条**没有可执行的第三条路**。

**复现**
```powershell
cd D:\ilife
git ls-files --error-unmatch packages/skill-calorie/src/triggers/routes.generated.ts
git ls-files packages/skill-home | Select-String "helpAssets|gen-help-assets"
Select-String -Path .github\workflows\ci.yml -Pattern "gen:check"
Select-String -Path docs\agents\命令登记纪律.md -Pattern "入仓|CI 里真跑"
```

**建议改法（把 v2 §三第 4 条整条重写）**
把「域票不许提交派生件」换成**分级收权**，并明确票 21 的定位：
1. 域票**只写**自己的 `src/<域>/commands.ts` ＋ `src/<域>/routes.ts`，**并在同一次提交里**带上 `pnpm gen` 重生成的**完整**派生件（因为哈希锁要求产物入仓）。
2. 为消除 11 席对 `keys.ts`／`registry.ts`／`routes.generated.ts` 的写冲突，把这批派生件**从 DAG 的票间共享改成锁域内串行**：`docs/agents/命令登记纪律.md:60-61` 已经给出机制——「**框架级变更** 要么先抢 `gate.lock` 并**广播**」。域票加命令**不属于**框架级变更，因此**不需要**抢共用锁，只需在自己提交里带全量重生成的派生件；真正的冲突由 `run-locked.mjs` 串行化，而不是靠「不提交」。
3. 票 21 收缩为**「集成与回归」**（不产生新代码，只跑全量 `pnpm gen` ＋ `gen:check` ＋ 全量门禁并在票面记 §2.4 对账）。理由见下表判定 `21 = 合并入 3`：集成动作是**一次命令**，不是一件交付物。

---

### P0-3 · v2 §五「机器门」今天的 `tickets.json` 会判红，且它抓不到本报告 P0-4 那类语义错；v2 §四的「无长链单点」被自己的票源反证

**结论**：v2 §五三条门只验「数量／集合」，不验「语义」，因此它对 v2 自身最严重的错误（票 21 身份被替换）**天然免疫**；而 §四「无长链单点」与票源实测的 5 条硬冲突。

**证据 A —— 门会判红**：`packages/skill-home` 级 `html-scenes-wire.mjs:163` `if (sub.length !== state.tickets.length)`、`:174` `const tableRows = ...`、`:189-193` 打印 expected／actual。v2 §五新增「每票 `scope: []`，空 `scope` 即判红」，而 `html-scenes-tickets.json` 全文 252 行里**一个 `scope` 字段都没有**（实读 22 张票的键只有 `n`／`key`／`type`／`title`／`body`／`blockedBy`／`issue`）。⇒ 照 v2 §五改完，脚本对**每一张票**判红。

**证据 B —— 门抓不到语义错**：`html-scenes-wire.mjs` 的 `validate()`（`:159-203`）只做四件事：子议题边数、每票阻塞边数、任务清单表行数、正文文件与 issue 正文一致。它对「票 n 的**含义**变了、但 `blockedBy` 没跟着改」没有判据。v2 §五加的三条（DAG 自环／写集不相交／frontier 非空）同样是**集合论**判据，仍然抓不到。

**证据 C —— 与票源实测的 5 条硬冲突**（M3 读数）：

| v2 的说法 | 票源实测 `blockedBy` | 冲突 |
|---|---|---|
| §三 第 44 行「4 落盘 × 5／6／7／8 — 否（4 只在 `src/cli/`）」；第 46 行「3 结构落地 × 4／7／8／域票 — 3 阻塞它们（有序）」 | 票 4 `blockedBy=[3,21]` | 4 **不是**与 5／6／7／8 无序；它共同祖先含 **21** |
| §四「**无长链单点**」 | 票 7 `blockedBy=[21]`；票 8 `blockedBy=[4,5,6,7]` | 8 的传递祖先含 21，而 21 的传递祖先含 9–19，9–19 的祖先含 8 |
| §二 表「9–19 阻塞于 3、4、5、6、7、8」 | 票 9–19 `blockedBy=[8]`（**只有 8**） | v2 的票面依赖与票源不一致，两条口径必须选一条 |
| §四「全图只剩**两张**需要用户点头的票（票 2 契约、票 20 终审）」＋「票 2 阻塞的是一组并列票而非单张」 | 票 2 `blockedBy=[1]`；票 3 `blockedBy=[2]`；票 8 的祖先含 3 | 票 2 是 3 **唯一**上游，3 又在 8 的祖先链上 ⇒ 票 2 是单链单点，v2 §一第 4 条「至少一张不依赖人的票」在此链上不成立 |
| §一「v1 有 11 张域票全部阻塞在**一张样板票**（#805）后面——那是伪依赖」；§六「域票的阻塞集由样板票一张换成五张互不阻塞的基建票」 | 票 21 **仍然**阻塞票 4 与票 7；票 8 仍直接阻塞票 9–19 | 换的只是 8 的**上游**，8 **本身**照旧是 11 张票的唯一门 ⇒ v2 §六第 3 行「消除单点门」不成立 |

**证据 D —— 判据自己也不可跑**：`html-scenes-wire.mjs:200` 是 `process.exit(1)` 而 `:202` 是 `console.log('\nPASS…')`；v2 §五要求「frontier 打印 ＋ 断言非空」，但 `validate()` 里没有任何一处读 `state` 的 `state` 字段（票源里也没有 `state` 字段），**frontier 无数据来源**。

**复现**
```powershell
cd D:\ilife
node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');for(const t of s.tickets){console.log(String(t.n).padStart(2),'blockedBy=['+t.blockedBy.join(',')+']');}"
node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');const k=new Set();for(const t of s.tickets)Object.keys(t).forEach(x=>k.add(x));console.log([...k].join(', '))"
```

**建议改法**
1. 票 2（契约冻结）必须**同时**产出 `tickets.json` 的 `scope`／`paths`／`toCreate` 三段元数据，不能只出 `docs/…/scene-pages-contract.md`。理由：v2 §五的门读的是 `tickets.json`，而票 2 的写集（v2 §二）**只有** `docs/skills/skill-home/scene-pages-contract.md` ⇒ 门要的数据**没有主**。这是 v2 内部第 2 处「收权表漏了写点」。
2. `html-scenes-wire.mjs` 的 `validate()` 增两条**语义**判据（对集合判据免疫的补丁）：① 每条边两端的 `title`／`type` 与 v2 设计表逐字一致（防票 21 那类身份替换）；② 每张票的 `blockedBy` 必须等于设计表第「阻塞于」列（防两张口径）。
3. §四「无长链单点」这句直接删除或改成实测读数：当前 `8` 是 11 张票的唯一门，且 `8 ← 4 ← {3,21}`、`8 ← 7 ← 21`。

---

### P0-4 · 票 21 身份被替换（原「产物命名裁决」→ 新「集成与共用位派生」），但 `blockedBy` 不动 ⇒ 环或悬空边二选一；v2 自己的 DAG 门会打回这张图

**结论**：票 21 在票源里的真实身份是**命名裁决**（`html-scenes-tickets.json` 数组第 21 项，实读行 `:242` 起 `"key": "21-scene-naming"`，`:243` `"type": "grilling"`，`:244` `"title": "决定：产物命名与落点怎么区分 70 条场景…"`，`:249` `"issue": 836`）。**票 4（第 4 项，实读行 `:46` 起 `"blockedBy":`，值 `[3,21]`）与票 7（第 7 项，实读行 `:78` 起，值 `[21]`）都含 21**；票 20（第 20 项，实读行 `:224` 起 `"blockedBy":`）的值里 21 不在列，但 map 正文 `:29` 的表行「7 | … | 票 21(#836)」把这条边写在票面。v2 §二把它改派给「集成」，`:30` 却只写「复用同一张 GitHub issue，避免留孤儿票」——**边一条都没说要改**。

> ⚠ 上方引用的 `tickets.json` 行号是**数组项起始行**（每项是 9 行缩进的对象）；节点内各字段的行号请以 `node -e "…console.log(JSON.stringify(t,null,1))"` 现场读为准。

**证据**
- 票源数组第 21 项（实读行 `:242` 起）：`"key": "21-scene-naming"`、`"type": "grilling"`、`"title": "决定：产物命名与落点怎么区分 70 条场景（老规范按模板 1:1，会互相覆盖）"`、`"body": "html-scenes-tickets/21-scene-naming.md"`、`"blockedBy": [1]`、`"issue": 836`。
- 票源数组第 4 项（实读行 `:41` 起）：`"blockedBy": [3, 21]`
- 票源数组第 7 项（实读行 `:72` 起）：`"blockedBy": [21]`
- `html-scenes-tickets/21-scene-naming.md:7,11` 自证身份：`## 目标` 「裁一条产物命名规则…」；`:11` 「产出：一条裁决 ＋ 给**票 4**（落盘）与**票 7**（总览／墙清单）的硬约束」。`:15` `## 验收命令` 「…且本票评论里**有用户点头的原话**（HITL 票，无点头不算过）」。
- `html-scenes-tickets/07-wall-and-chain-page.md:10` 「清单里的文件名规则**与票 21 的裁决逐字相同**（不许两处各算一次名称）」；`:25` 「…与 #183 已定的落点值冲突，当场补票」。
- v2 §六 `:79` 「原 n=21 命名裁决**并入**票 2」；v2 §二 `:30` 「**n=21 这个位置改由新票「集成与共用位派生」接手**（复用同一张 GitHub issue…）」。

**两条后果，必须二选一**
- 若不改边（照 v2 `:30` 字面）：新 21 语义＝「集成」（v2 表 `:27` 说它 `blockedBy = 9–19`），而旧边 `4 ← 21`、`7 ← 21` 仍在 ⇒ 21 成为 `8 ← {4,7} ← 21 ← {9..19} ← 8` 的**环**。v2 §五第 1 条「DAG 门：传递闭包无自环…有环即非零退出」⇒ **v2 设计的图会被 v2 自己的门判红**。
- 若改边：那这张票与票 2、票 3 之间的人工等待点／HITL 计数、以及 v2 §四「全图只剩两张需要用户点头的票」的账**全部要重算**，而 v2 没算。

**复现**
```powershell
cd D:\ilife
node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');const t=s.tickets.find(x=>x.n===21);console.log(JSON.stringify(t,null,1))"
node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');console.log(s.tickets.filter(x=>x.blockedBy.includes(21)).map(x=>x.n))"
Get-Content docs\skills\skill-home\html-scenes-tickets\21-scene-naming.md | Select-Object -Index 14,10
```

**建议改法**
不要复用 issue 836。**新建一张票**承载「集成与回归」（issue 号顺延，key 例 `22-integration`），把它写进 `blockedBy` 的方式是：
1. `22` 的 `blockedBy = [9,10,11,12,13,14,15,16,17,18,19]`（v2 原意）；
2. `4` 与 `7` 的 `blockedBy` **改成 `[2]`**（它们的真实上游是「命名裁决」这个**人工裁决**，而 v2 已把它并入票 2 ⇒ 上游就是 2，不是任何集成票）；
3. `8` 的 `blockedBy` 改成 `[2,3,5,6,7]`（去掉 4，因为 v2 已把「链路落盘」与「域票出产物」的先后关系倒过来——见 P1-6）；
4. 然后跑 `node docs/skills/skill-home/html-scenes-wire.mjs` 让新 DAG 门**自己**判一次；门没过就不许开工。

---

### P1-1 · 写集相交反例：`packages/skill-home/scripts/` 与 `packages/skill-home/test/` 都不是「按域根隔离」的

**结论**：v2 §三第 42 行把「域票 × 域票」判为「否（按域根隔离）」——前提是域根能覆盖域票的全部写点；实测**不能**，因为域票的判据件与脚本不在域根下。

**证据**
- 反例 1（**同一目录两票**）：票 5 写文件 `packages/skill-home/scripts/seed-scenes.mjs`、`scripts/lib/seed-*.mjs`（票面 `05-seed-data.md:7`、`:19` `packages/skill-home/scripts/**`；票源数组第 5 项、v2 §二 `:22` 同款列法）；票 3 要在这**同一个目录**里落居家生成链（P0-1）。实读 M1：`packages/skill-home/scripts/` 今天只有 `build-help.mjs`、`gen-help-assets.mjs`、`wizard-publish.sh`、`lib/{help-assets,yaml-subset}.mjs` —— 两个新件都落这里。
- 反例 2（**判据件不在域根**）：v2 §二第 26 行给 11 张域票的写集是 `test/<域>*.mjs` —— 指 `packages/skill-home/test/*.mjs`。**目录里已有 9 个既有用例**与域票同目录：`backup.test.mjs`／`cli.test.mjs`／`config-695.test.mjs`／`fetch.test.mjs`／`help-assets.test.mjs`／`help-delivery-190.test.mjs`／`policy.test.mjs`／`render.test.mjs`／`skill.test.mjs`（M1 实读）。其中 `help-assets.test.mjs:19` 硬编码 `YAML_SHA256`、`:22` 硬编码 `ASSET_SHA256` —— 任何域票一旦碰到 `src/help/scenarios.yaml`（**唤醒词的真正来源**，见 P1-4）就把这个锁打红。
- 反例 3（**v2 漏了写点**）：`packages/skill-home/test/` 这个目录**本身**在 v2 里没有主——所有 11 张票声称往里写，但没有一张票对「目录内的既有 9 件」负责。

**复现**
```powershell
cd D:\ilife
Get-ChildItem packages\skill-home\test -File | Select-Object -ExpandProperty Name
Get-ChildItem packages\skill-home\scripts -Recurse -File | Select-Object -ExpandProperty FullName
Select-String -Path packages\skill-home\test\help-assets.test.mjs -Pattern "SHA256"
```

**建议改法**
1. 把 11 张域票的测试件从**包内平铺**改成**按域子目录** `packages/skill-home/test/<域>/*.test.mjs`，并在票 3 里改根 `test` 脚本的 glob（见 P1-2）。这样「按域根隔离」才真正成立。
2. 票 5 的写集从 `packages/skill-home/scripts/**` 收窄为 `packages/skill-home/scripts/seed-scenes.mjs` ＋ `scripts/lib/seed-*.mjs` **逐文件点名**，并加一句「不新增该目录下其它件」；票 3 的生成链脚本另立 `scripts/gen-cli.mjs`／`scripts/gen-routes.mjs` 文件名点名。
3. 干涉门的粒度：v2 §五第 2 条说「前缀或文件级」。**必须选文件级**——前缀级对 `scripts/` 与 `test/` 这两个反例判「相交」，域根级则在反例 1、2 上**漏判**。建议：`scope` 用**文件级字面路径或精确 glob**，并加一条「同目录不同文件也判红」的保守档，用来抓反例 1。

---

### P1-2 · 「每域一条独立判据」不成立：11 张域票的①号判据逐字相同，且真实执行面是**包内已被点名的 4 个文件**，域用例根本不会跑

**结论**：v2 §二第 26 行「每域一条独立判据」与票面实测不符；同时 `packages/skill-home/test/` 下**除被点名的 4 件外，全部用例在任何入口都不执行**。

**证据**
- M9 读数：`run-locked.mjs --ticket <本票号> -- pnpm test` 这**同一句**出现在 13 份票面 —— `03:11`、`08:11`、`09:24`、`10:25`、`11:22`、`12:18`、`13:19`、`14:18`、`15:18`、`16:24`、`17:23`、`18:18`、`19:18`。⇒ 域票①号判据＝**全包共用门**，不是域判据。
- M10 读数：根 `package.json:15` 逐字为 `"test": "node --test \"test/*.test.mjs\" \"packages/base-render/test/*.test.mjs\" \"packages/skill-calorie/test/*.test.mjs\" \"packages/skill-memo-ilife/test/*.test.mjs\" … \"packages/skill-home/test/*.test.mjs\" …"` —— glob **只到一级**，`packages/skill-home/test/*.test.mjs` 不展开子目录。
- 且 `packages/skill-home/package.json:33` 的 `"test"` 逐字是：`node --test test/help-assets.test.mjs test/help-delivery-190.test.mjs test/backup.test.mjs ../../test/scaffold.test.mjs` —— **点名 3 个包内文件 ＋ 1 个仓根文件**。未被点名的 5 个包内用例（`cli`／`config-695`／`fetch`／`policy`／`render`）**不在任何入口**。
- ⇒ 域票按 v2 写 `packages/skill-home/test/<域>*.mjs`，这些文件**永远不会被任何测试入口加载**，判据恒绿（假绿）。

**复现**
```powershell
cd D:\ilife
node -e "const p=require('./package.json');console.log(p.scripts.test)"
node -e "const p=require('./packages/skill-home/package.json');console.log(p.scripts.test)"
node --test "packages/skill-home/test/*.test.mjs"   # 看实际收集到几件
```

**建议改法**
1. 票 3 里把两处 `test` 脚本改成目录级：包内 `node --test test/` ＋ 根 `"packages/skill-home/test/**/*.test.mjs"`。**这一条必须写进票 3 的验收**，否则 v2 §二「每域一条独立判据」是无法执行的判据（判据跑不出真假 ⇒ v2 §一第 1 条自己判失败）。
2. 域票的①号判据改成**域作用域**：`node --test packages/skill-home/test/<域>/`，②号才用全包 `pnpm test` 做回归。两张票的判据必须是**不同的读数**，否则「每域一条独立判据」是空话。
3. 顺带把 5 个未被加载的既有用例（`cli`／`config-695`／`fetch`／`policy`／`render`）纳入票 3 的回归读数——它们是「迁移不改行为」的唯一机器证据，却不跑。

---

### P1-3 · 11 张票指向两个仓库里不存在的脚本，而它们不在任何写集里 ⇒ 域票势必越界写共用位

**结论**：票 9／17 的②③号判据调用的脚本**今天不存在**，v2 的写集表也**没有**把它们的归属写清；任何一张域票为了让判据跑绿，只能自己去写这两个件 —— 直接违反 v2 §三第 41 行「域票不碰共用位」。

**证据**
- `html-scenes-tickets/09-items-1.md:25-26`：`② node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 物品管理-1-手机墙.html exit 0（桌面墙同）；③ node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号> —— 0 命中、exit 0。`
- `html-scenes-tickets/17-receipt-2.md:24-25` 同上（②＋③）。
- 实读：`Test-Path packages\skill-home\scripts\audit-separators.mjs` → **False**；`Test-Path docs\skills\skill-home\gen-scene-wall.mjs` → **False**；M7 全仓搜 `new-scene-page*`／`*scaffold*`／`new-page*`，`packages/` 下**零命中**（`scaffold` 命中的全是 `.scratch/` 快照与 `test/scaffold.test.mjs`）。
- 唯一的先例在卡路里：`packages/skill-calorie/scripts/audit-separators.mjs`（实读 `:9-13` 用法行 `node packages/skill-calorie/scripts/audit-separators.mjs --dir <目录> [--json <路径>]`；`:215` 同款用法串）。**它的接口是「吃目录／吃文件」，与包结构无关** ⇒ 票 6 的真工作量比 v2 写的小得多（见逐票表 `6 = 合并入 3`）。
- v2 写集表里 `gen-scene-wall.mjs` 归票 7（`:24` `docs/skills/skill-home/gen-*.mjs`），`audit-separators.mjs` 归票 6（`:23` `packages/skill-home/scripts/audit-separators.mjs`）。但 `17-receipt-2.md:36-38` 的 `## 遗留出口` 只写「脱敏判据若要提升为跨域共用件，回写票 6」，**没有**写「本票判据依赖票 6／票 7 的产物」；v2 表里 11 张域票的阻塞列也只写 `3、4、5、6、7、8`（与票源 `blockedBy=[8]` 又对不上，见 P0-3）。

**复现**
```powershell
cd D:\ilife
Test-Path packages\skill-home\scripts\audit-separators.mjs
Test-Path docs\skills\skill-home\gen-scene-wall.mjs
Select-String -Path packages\skill-calorie\scripts\audit-separators.mjs -Pattern "用法"
Select-String -Path docs\skills\skill-home\html-scenes-tickets\09-items-1.md,docs\skills\skill-home\html-scenes-tickets\17-receipt-2.md -Pattern "gen-scene-wall|audit-separators"
```

**建议改法**
1. 把「判据件」与「生成器」合成**一张**基建票（建议 `19` 号之前，与票 3 同批），交付 `packages/skill-home/scripts/audit-separators.mjs` ＋ `docs/skills/skill-home/gen-scene-wall.mjs` ＋ `docs/skills/skill-home/gen-chain-page.mjs` **三件**，并让域票**只消费、不生产**。
2. `audit-separators` 不要新写：先试 `git show` 取卡路里那 13689 字节的件，改「默认包根」常量即可（接口吃目录）。**这条可以省掉票 6 的绝大部分工作量。**
3. 域票②号判据若必须依赖域外脚本，**必须在票面写「本票判据依赖票 X 的产物」**，并由 DAG 门核对（P0-3 第 2 条建议的语义判据）。

---

### P1-4 · 「唤醒词按域自治」与真事实不符：唤醒词的唯一事实源是全包 `scenarios.yaml`，不在 `wakewords.ts`；且票 3／21 声明的路由自治在居家里**今天不存在**

**结论**：v2 §一第 12 行把 `src/policy/wakewords.ts` 写成「全包一张」，§三第 51 行据此提出「按域自治，只写 `src/<域>/routes.ts`」；但居家**没有** `triggers/` 层，唤醒词的**上位事实源**是 `src/help/scenarios.yaml`（46267 字节、73 场景，由 `helpAssets.ts` 的生成器读）。按域自治改完之后，域票仍会**同时**撞 `scenarios.yaml` 与 `helpAssets.ts` 两个共用位。

**证据**
- `packages/skill-home/src/policy/wakewords.ts:1-3` 头注释：「口径层 · 唤醒词路由：自然语言 → 21 联动 key；最长匹配；联动 3 词废弃不路由。**HELP 速查唯一上游**；改这里，HELP 构建期跟进。」
- 实读该文件：`WAKE_TABLE: WakeEntry[]` 是**手写字面量数组**（`{ phrase: '居家管家 帮助', key: 'home.help.lookup' }` …），**不是生成物**，**不是** calorie 那种 `routes.generated.ts`（507 条记录）。
- `packages/skill-home/src/help/helpAssets.ts:1-5`：「本文件由 `packages/skill-home/scripts/gen-help-assets.mjs` 生成 —— 禁止手工修改…**事实源（仓内唯一）：`src/help/scenarios.yaml` · 46267 字节 · sha256 f80184ce…**…icon／label／id：逐字取事实源 `domains[].icon/name/key`（**老骨架自带的 9 个域图标**，不另立图标表）。**link 域＝登记位（deprecated: true）**：prompt 不迁、HELP 不列、**不建目录**；渲染侧按 `HELP_GROUPS` 过滤。」
- `packages/skill-home/test/help-assets.test.mjs:19` `const YAML_SHA256 = 'f80184ce…'`；`:22` `const ASSET_SHA256 = 'f61f49e7…'`；`:198` `assert.equal(sha256(yamlBuf), YAML_SHA256, '仓内事实源变了：重跑生成器并更新 YAML_SHA256')`。
- M5 实读：居家包**无** `src/triggers/`（`Test-Path` → False），全仓 `routes.generated.ts` 只有 calorie 一份。

**复现**
```powershell
cd D:\ilife
Select-String -Path packages\skill-home\src\policy\wakewords.ts -Pattern "WAKE_TABLE|export const" | Select-Object -First 3
Select-String -Path packages\skill-home\src\help\helpAssets.ts -Pattern "事实源|scenarios.yaml|link 域"
Test-Path packages\skill-home\src\triggers
```

**建议改法**
1. 契约票（票 2）必须在**三张**表之间裁决归属，而不是两张：① `src/policy/wakewords.ts`（今天的手写 `WAKE_TABLE`）② `src/help/scenarios.yaml`（上位事实源、73 场景、含域 key）③ 新增 `src/triggers/routes.generated.ts`。v2 只写了①②里的一张半。
2. 「按域自治」的**最小可落形态**（照 calorie 的形状，但**缩到居家规模**）：域票写 `src/<域>/routes.ts`（声明 `order` ＋ `wakeWord` ＋ `key`），`scripts/gen-routes.mjs` 汇总成 `src/triggers/routes.generated.ts`；`wakewords.ts` 改成**薄壳**只 re-export 生成物。**v2 没写 `wakewords.ts` 的退场路径**——这是 v2 §三第 1 条「收权三件」里唯一没有给出落地形状的一条。
3. 同时裁决 `scenarios.yaml` 的归属：若域票不许动它，则「添加唤醒词」这件事**做不到**；若允许域票动它，`help-assets.test.mjs:19` 的硬编码 `YAML_SHA256` 会变成 11 席的共用写点。建议把 `YAML_SHA256` 从测试件里**去掉**，改为「跑一次生成器再比对」（即 `gen:help-assets:check`），让生成物本身承担锁的职责。

---

### P1-5 · 居家有两道生成门，v2 当一道用；且 `gen-help-assets` 不进 `pnpm gen`／CI

**结论**：v2 §一第 12 行把「派生件」当单一概念。实测居家派生件走**另一条**门（`gen:help-assets:check`），该门**不在** `pnpm gen`／`pnpm gen:check`，也**不在** `.github/workflows/ci.yml` 的任何一步里。

**证据**
- `packages/skill-home/package.json:34-35`：`"gen:help-assets": "node scripts/gen-help-assets.mjs"`、`"gen:help-assets:check": "node scripts/gen-help-assets.mjs --check"`。
- 仓根 `package.json:12-13` 的 `gen`／`gen:check` **逐字**只列 calorie／bill／`tooling/skill-call-form.mjs`（见 P0-1）。
- `.github/workflows/ci.yml` 全 136 行逐行读：步骤为 `build`／`gen:check`／`doctor`／`test`／`boundaries`／`snapshot:html:check`／`gate:selftest:html`／`changeset:status`／`help:examples:check`（`:29-73`）；**没有** `gen:help-assets:check`。
- 居家 `package.json` 的 `test` 不包含 `gen:help-assets:check`，而是靠 `test/help-assets.test.mjs` 的**硬编码 sha**（`help-assets.test.mjs:19,22`）间接锁。
- ⇒ 按 `docs/agents/命令登记纪律.md:20`「机器校验在 CI 里**真跑**」，居家这条派生链**不满足第一性依据**；v2 却把它当既有基建（票 3 的验收命令 `pnpm gen`）。

**复现**
```powershell
cd D:\ilife
node -e "console.log(require('./packages/skill-home/package.json').scripts)"
Select-String -Path .github\workflows\ci.yml -Pattern "^\s*- run:" | ForEach-Object { $_.Line.Trim() }
```

**建议改法**
票 3 的交付物里**必须**加一条：把 `gen:help-assets:check` 接进 `.github/workflows/ci.yml` 的 `build-test` 作业（与 `gen:check` 同款 `if: always()`），并在票 3 的验收命令里分别跑两条门、分别记读数。否则「居家派生链＋门禁」是没接 CI 的生成器，按仓规自己的判词（`命令登记纪律.md:22-24`）「三者都满足不了任何一条」。

---

### P1-6 · 票 4 应删；票 6 应并入票 3；票 21 应并入票 3；票 9／10／11 应合并为一张

**结论**：逐票问「删掉它，目的地缺什么」，有四组票答不上来。

**证据与理由**

**(a) 票 4「链路落盘」删掉后无可归因的缺口。**
- 票面 `04-html-delivery-chain.md:3`：链路断在「常规跑一条命令只回 stdout 的 JSON，只有 `--html`（`cmd_read.ts:850-859`）或 HELP 交付（`cmd_read.ts:860-868`）才物化成文件」。
- v2 §六 `:81` 自己说票 3 把「8 样板票」换成「五张互不阻塞的基建票」；但票 4 改的是 **`cmd_read.ts` 的输出层一层**，而票 3 的写集（`03-structure-landing.md:19` `packages/skill-home/src/**`）**本来就含** `src/cli/cmd_read.ts`。⇒ 同一个文件、同一次搬迁窗口内能做完的事被切成两张，多一次交接。
- 且 v2 §二 `:21` 给票 4 的写集 `src/cli/` 与票 3 的 `src/` **是包含关系** ⇒ 交叉，不是隔离。

**(b) 票 6「判据件」并入票 3。**
- `packages/skill-calorie/scripts/audit-separators.mjs:12-13` 的接口是 `--dir <目录>`／吃 HTML 文件；`:215` 用法串同款。**它与包结构无关**。
- 票面 `06-style-audit.md` 的验收命令（v2 §二 `:23` 写集 `packages/skill-home/scripts/audit-separators.mjs`、`test/style-audit*.mjs`）——「接进包内门」这件事**正是**票 3 的 `package.json` 写集内容。拆成两张的结果是票 3 与票 6 抢同一个 `package.json`（v2 §三 `:47` 说「3 改 `package.json`／`SKILL.md`／`src/`；6 改 `scripts/audit*`」，但 `test/style-audit*.mjs` 的注册点只能是 `package.json` ⇒ **v2 自己的论据就自相矛盾**）。

**(c) 票 21 并入票 3。**
- 集成动作＝「全量 `pnpm gen` ＋ 派生件与 `package.json`／`SKILL.md` 一次收口 ＋ 全量门禁」（v2 §二 `:27`）——**三条都是命令，不是交付物**。
- 且 v2 §二 `:27` 给票 21 的写集 `src/cli/{keys,registry}.ts`、`src/triggers/routes.generated.ts`、`package.json`、`SKILL.md` **与 11 张域票的派生件写点重叠**（P0-2 路 A），v2 §三表又**没有**给「21 × 9–19」这一对做检查（`:45` 只写了「21 集成 × 20 收口」）⇒ 干涉矩阵有空行。

**(d) 票 9／10／11 合并为一张「items 域」。**
- 三张票的写集逐字相同：`packages/skill-home/src/<域>/`、`templates/<域>/`、`test/<域>*.mjs`、`docs/…/scene-<域>.md`、`.scratch/<票号>/`（v2 §二 `:26`）—— 三张票同域 ⇒ 写集**全部交叉**，v2 §三 `:42`「按域根隔离」在这里被自己推翻。
- `09-items-1.md:30` 与 `10`／`11` 同域的「不许动的东西」都是「不动其它域的页面与命令」——**三张票互为「其它域」以外的同域票**，隔离判据无对象。
- 收益：29 条场景（`pages-ledger.md:75` items 场景数 29）在同一个域目录、同一套 19 个页族里，拆成 3 张只增加 2 次交接与 2 次共用位收口。

**复现**
```powershell
cd D:\ilife
Select-String -Path packages\skill-calorie\scripts\audit-separators.mjs -Pattern "用法"
Select-String -Path docs\skills\skill-home\html-scenes-tickets\09-items-1.md,docs\skills\skill-home\html-scenes-tickets\10-items-2.md,docs\skills\skill-home\html-scenes-tickets\11-items-3.md -Pattern "不许动的东西" -Context 0,1
node -e "const s=require('./docs/skills/skill-home/html-scenes-tickets.json');console.log('21 × 9-19 干涉检查在 v2 §三表里存在吗？看 design 第 45 行')"
```

**建议改法**
- **删票 4**：把「默认落 HTML ＋ 回执绝对路径」并进票 3 的输出层搬迁（同一文件、同一窗口），保留其验收命令（`04-html-delivery-chain.md:11` 的 `--test packages/skill-home/test` 那条＋变异自证两行）作为票 3 的**附加验收项**。
- **票 6 并入票 3**：`audit-separators.mjs` 直接照搬卡路里件（改默认根），注册点就是票 3 已占的 `package.json`。
- **票 21 并入票 3**：集成是票 3 的**最后一步**（跑 `pnpm gen` ＋ `gen:check` ＋ `gen:help-assets:check` ＋ 全量 `pnpm test`），不单独立票；把 v2 原意「派生件单写者」用票 3 **独占** `src/cli/{keys,registry}.ts`、`src/triggers/routes.generated.ts` 来表达，而不是用一张新票。
- **票 9／10／11 合并为一张 items 域票**：11 张域票 → **8 张**（items／space／outfit／stats／express／receipt×2／family／setup 中的 receipt 因 18 条场景确实可分两张）。总数从 21 → **15**。

---

### P1-7 · 逐票裁定表里用的「9 域 / 11 域票」口径错，应统一为 8 域 / 9 张域票

**结论**：v2 §二 `:26` 写「9–19 11 张域票」，`§三 :42` 写「11 张域票对同一批共用文件的写冲突」。实测落地域只有 **8** 个。

**证据**
- `pages-ledger.md:67`（表一小结）：「49 行 ＝ yaml 引用的 49 个老模板；其中 **3 行属 `link` 域**（`联动/link_*`），按背景**本期不做**，故真正要建的页族是 **46** 个，覆盖 **70** 条场景。」
- `pages-ledger.md:78`：「`link` 域 3 个页族本期不做 → **实际要建 46 个页族 / 70 条场景，落在 8 个域里**（`link` 域无本期产出）。**这与背景里「按 9 个域做成真页面」的表述不一致**，已在 §四记下。」
- `pages-ledger.md:70-74` 表二逐域：`items 29`、`space 4`、`outfit 5`、`stats 4`、`express 4`、`receipt 18`、`family 2`、`setup 4`，合计 **70**（去掉 `link` 的 3）；`link` 域 `:74` 单列、无本期产出。
- `packages/skill-home/src/help/helpAssets.ts:5`：「**link 域＝登记位（deprecated: true）**：prompt 不迁、HELP 不列、**不建目录**；渲染侧按 `HELP_GROUPS` 过滤。」
- `t195-decisions-record.md`（决策 2 落地细则）：「8 个域进分组；`link` 域（联动 3 条已停用）**只留登记位**，不入组、不建目录。」（与上面三条互证）
- 票号实数：11–9（含）＝ **10** 张（9,10,11,12,13,14,15,16,17,18,19 → 实为 11 个 n 值）；但其中 `items` 3 张 + `receipt` 2 张 ⇒ **域数 8，票数 10**。v2 两个数都写错。

**复现**
```powershell
cd D:\ilife
Select-String -Path docs\skills\skill-home\pages-ledger.md -Pattern "落在 8 个域|link 域|46 个页族"
Select-String -Path packages\skill-home\src\help\helpAssets.ts -Pattern "link 域"
node -e "console.log('v2 §二说 11 张域票；实际 n=9..19 共', Array.from({length:11},(_,i)=>9+i).length, '个位置，覆盖 8 个域')"
```

**建议改法**
v2 全文把「9 域」「11 张域票」逐处改成「**8 个落地域 / 9 张域票**（items 合并后）」，并在 §二表里加一列**域 key**（`items`／`space`／`outfit`／`stats`／`express`／`receipt`／`family`／`setup`），理由是干涉门的判据是「写集按域天然不相交」（v2 `:26` 自己的话）——**域 key 就是写集前缀**，不写出来，门就无从判定。

---

## 逐票裁定表

| n | 票 | 留着/合并/删掉 | 一句话理由 |
|---|---|---|---|
| 1 | 册子 | **留着（已关）** | 49 页族／46 待建已实测（`pages-ledger.md:67`），是全图唯一有真读数的事实源 |
| 2 | 契约冻结 | **留着，但必须扩写集** | 它要裁的三张表（`wakewords.ts`／`scenarios.yaml`／新 `routes.generated.ts`）里 v2 只点了两处；且 `tickets.json` 的 `scope` 元数据只有它能产出（P0-3） |
| 3 | 结构落地 | **留着，并入 4／6／21** | 它自己的写集 `packages/skill-home/src/**` 已含票 4 的 `src/cli/`；`package.json` 是票 4／6／21 的唯一注册点 ⇒ 三张票本质是它的三个步骤 |
| 4 | 链路落盘 | **删掉（并入 3）** | 同文件（`src/cli/cmd_read.ts`）同窗口，拆开只多一次交接（P1-6a） |
| 5 | 种子数据 | **留着，但与 3 抢目录** | 它写 `scripts/seed-*`、票 3 要在同目录落生成链（P1-1 反例 1）；写集必须收窄到逐文件点名 |
| 6 | 判据件 | **合并入 3** | `audit-separators.mjs` 接口是 `--dir`／吃文件（卡路里件 `:12-13`），与包结构无关；「接进包内门」正是票 3 的 `package.json`（P1-6b） |
| 7 | 生成器（墙＋链路页） | **留着，但阻塞必须改** | v2 把它挂在新 21（集成）下会与票 8 成环（P0-4）；它的真实上游是「命名裁决」＝票 2 |
| 8 | 页面脚手架 | **留着，但「替代样板门」不成立** | 46 页族里 27 个是「混合」型（`pages-ledger.md:12`），生成器只覆盖机械件；页族形状一致仍无人负责（见 P2-1） |
| 9–11 | items 域（一/二/三） | **合并为 1 张** | 三票写集逐字相同、按域根隔离被自己推翻，29 场景同域同 19 页面（P1-6d） |
| 12 | space | 留着 | 独立域 key、独立判据可成立 |
| 13 | outfit | 留着 | 同上 |
| 14 | stats | 留着 | 同上 |
| 15 | express | 留着 | 同上 |
| 16 | receipt（一） | 留着 | 同域 18 场景、两张可接受 |
| 17 | receipt（二） | 留着 | 同上；但②③号判据指向不存在的脚本，须在票面写明依赖（P1-3） |
| 18 | family | 留着 | 独立域，2 场景 |
| 19 | setup | 留着 | 独立域，4 场景 |
| 20 | 收口 | 留着 | 唯一的人签字终点（v2 §四 `:62`） |
| 21 | 产物命名裁决 → 集成 | **两半都要拆开处置** | 原「命名裁决」应并入票 2（v2 已有此意）；新「集成」应并入票 3；**不要复用 issue #836**，否则 `4／7／20 ← 21` 三条旧边语义被静默替换（P0-4） |
| — | **新增：判据件与生成器票** | **必须新增** | 票 9／17 的②③号判据调用的两件今天不存在且无主（P1-3），建票时须写清归属 |

**净效果**：21 张 → **15 张**（删 4、并 6 入 3、并 21 入 3／2、9-11 合一、加 1 张判据件生成器票）。

---

## 判决

**打回。**

致命处（按必须先改的顺序）：

1. **P0-2（最致命）**：v2 §三第 4 条「域票不提交派生件」与 `docs/agents/命令登记纪律.md:19` 的「哈希锁：**产物入仓**」＋ `.github/workflows/ci.yml:43` 的 `pnpm gen:check` 正面冲突。两条路都不通（提交＝11 席争抢 `keys.ts`／`registry.ts`／`routes.generated.ts`，违反 v2 §三第 1 条；不提交＝从票 9 到票 21 全程主线 CI 红）。这一条不改，v2 的核心收权机制**不可执行**。
2. **P0-4**：票 21 身份被替换而 `blockedBy` 不动 ⇒ 要么成环（v2 §五第 1 条的 DAG 门会打回 v2 自己的图），要么悬空。`4 ← 21`、`7 ← 21` 两条边今天就在票源 `html-scenes-tickets.json` 的第 4 项（`:46` 起）与第 7 项（`:78` 起）里，map 正文 `:29` 也已把 `7 ← 21(#836)` 印在票面。
3. **P0-1**：`pnpm gen` 今天逐字只跑 calorie／bill／`skill-call-form`（`package.json:12-13`），生成器把输入根锁死在 calorie 包（`gen-cli.mjs:45-48,746,770`）；居家无 `src/triggers/`、无 `routes.ts`。v2 把「派生链」当既有事实，票 3 的验收命令 `pnpm gen` 在居家里是空命令。
4. **P0-3**：v2 §五三条门只验集合、不验语义 ⇒ 抓不到 P0-4；且 `tickets.json` 今天**没有** `scope` 字段，照 v2 改完逐票判红；§四「无长链单点」「只剩两张 HITL 票」「消除单点门」三句被票源实测逐条反证。
5. **P1-2**：`packages/skill-home/test/*.test.mjs` 的 glob **只到一级**且包 `test` 脚本只点名 3 个文件 ⇒ 域票按 v2 写的域用例**永不执行**，「每域一条独立判据」是恒绿的假判据。

**必须先改的 P0**：P0-1、P0-2、P0-3、P0-4。四条全改完（含把 `tickets.json` 的 `scope`／语义门补上、票 21 拆票、`gen` 链入居家、派生件提交口径重写），再送席 A 与维护者对表；此前**不许**按本图派活。
