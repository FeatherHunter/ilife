# skill-bill 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

暂定：本数照兄弟件同数取 350，**待维护者确认**。

口径出处：**兄弟件同数、同落点**——`packages/skill-calorie/AGENTS.md` 与 `packages/skill-chef/AGENTS.md` 都写「350 行 ＋ LF 口径」，那两个数出自用户答复（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。本包此前没有这一条，`t406-复核-结构纪律对账.md` 第三节第 1 条把当时借来的读数记为「数字来源可追、与兄弟件同数，是过渡期唯一可用的口径」——这一件即是把那个落点补上；**本包自己的数字由维护者定，未定之前按上面那句暂定办**。

## 本包现状（2026-09-15 t406 整改实测，超线件逐件挂号）

行数口径与上一条同：节点口径 `readFileSync(f,'utf8').split('\n').length - 1`（只数 `\n`）。

| 件 | LF | 结论 |
|---|---|---|
| `src/triggers/wake-assets.ts` | 986 | 已超线，需要根据规则进行重构。超因：7 域 HELP 资产（唤醒词／域／组／场景／字段映射）整段连同一份生成物正文住在一个件里。本次 t406 整改不碰它（它由 `scripts/gen-wake-assets.mjs` 产出，拆法待生成器链那张票） |
| `src/cli/cmd_read.ts` | 558 | 已超线，需要根据规则进行重构。超因：一个文件装全部命令分派 ＋ argv 解析 ＋ envelope 打印 ＋ HELP 交付装配（**既有超线件**，`t406-复核-结构纪律对账.md` 第五节与 `t406-实施证据.md` 第五节都已正面报警）；拆法＝按域拆分派，属「读命令搬迁」那张后票。读数沿革：558（t406 交付前）→ 556（两条写命令搬进能力目录，净 −2）→ **558**（t406 整改 B1 把体积门挪到交付点上，写回两条交付分支，净 ＋2）。本票只搬不拆 |
| `scripts/gen-wake-assets.mjs` | 254 | 在 350 以内（生成器脚本；它的产物 `src/triggers/wake-assets.ts` 超线，见第一行） |
| `src/fetch/db.ts` | 236 | 在 350 以内 |
| `src/render/helpFile.ts` | 185 | 在 350 以内 |
| `src/record/write.ts` | 171 | 在 350 以内（t406 整改 A1／A3 后 164 → 171） |
| `src/render/views.ts` | 142 | 在 350 以内 |
| `src/record/collect.ts` | 141 | 在 350 以内（t406 整改 A1 后 134 → 141） |
| `src/policy/wakewords.ts` | 133 | 在 350 以内 |
| `src/policy/category.ts` | 116 | 在 350 以内 |
| `src/shared/copyArea.ts` | 116 | 在 350 以内（t406 整改 A6 头注释 ＋1） |
| `src/record/receipt.ts` | 97 | 在 350 以内 |
| `src/shared/writeParts.ts` | 73 | 在 350 以内（t406 整改 A2 拆出页标识后 72 → 73） |
| `src/render/html.ts` | 70 | 在 350 以内 |
| `src/render/envelope.ts` | 68 | 在 350 以内 |
| `src/policy/record.ts` | 62 | 在 350 以内 |
| `src/output.ts` | 60 | 在 350 以内 |
| `src/render/templates.ts` | 58 | 在 350 以内 |
| `src/help/lookup.ts` | 54 | 在 350 以内 |
| `src/shared/docPage.ts` | 54 | 在 350 以内 |
| `src/shared/commandSpec.ts` | 46 | 在 350 以内（t406 整改 A6 头注释 ＋1） |
| `src/shared/receiptParts.ts` | 45 | 在 350 以内（t406 整改 A6 头注释 ＋1） |
| `src/fetch/paths.ts` | 44 | 在 350 以内 |
| `src/policy/analysis.ts` | 43 | 在 350 以内 |
| `scripts/build-help.mjs` | 42 | 在 350 以内 |
| `src/cli/registry.ts` | 41 | 在 350 以内（t406 整改 A6 写明本件是过渡形态，35 → 41） |
| `src/policy/goals.ts` | 37 | 在 350 以内 |
| `src/record/commands.ts` | 34 | 在 350 以内 |
| `src/policy/accounts.ts` | 33 | 在 350 以内 |
| `src/fetch/errors.ts` | 23 | 在 350 以内 |
| `src/record/index.ts` | 23 | 在 350 以内 |
| `src/shared/pageIdentity.ts` | 21 | 在 350 以内（t406 整改 A2 新建） |
| `src/render/helpPaths.ts` | 20 | 在 350 以内 |
| `src/render/index.ts` | 15 | 在 350 以内 |
| `src/policy/index.ts` | 12 | 在 350 以内 |
| `src/render/errors.ts` | 11 | 在 350 以内 |
| `src/fetch/index.ts` | 4 | 在 350 以内 |
| `src/index.ts` | 4 | 在 350 以内 |
| `src/help/index.ts` | 1 | 在 350 以内 |

超线件两件：`src/triggers/wake-assets.ts` 986、`src/cli/cmd_read.ts` 558（两件都已挂号，各带超因与拆法去向）。

## #411 查询骨架后复测（2026-09-16，只列读数变了的件与新增件）

上面那张表是 **t406 当刻的实测**，留着当历史；本节记查询域到位后的读数（同 LF 口径）。改动经 `tsc -b packages/skill-bill` 全绿、包内全量 `node --test` 194/194 后实测。

| 件 | LF | 结论 |
|---|---|---|
| `src/cli/cmd_read.ts` | 485 | 已超线，需要根据规则进行重构。读数沿革 558（t406 表）→ **485**（#411 把四条查询命令的处理体与时间窗口三件搬走，净减 62）。超因与拆法同前：按域拆分派，属「读命令迁移」那条后票；本票只搬不拆 |
| `src/triggers/wake-assets.ts` | 986 | 本票未动（拆法在生成器链那条线） |
| `src/query/commands.ts` | 53 | 新件（#411）：查询域命令声明四条 |
| `src/query/index.ts` | 22 | 新件（#411）：查询域的门 |
| `src/query/list.ts` | 182 | 新件（#411）：通用查询列表页（列表装配件） |
| `src/query/read.ts` | 236 | 新件（#411）：四条读命令的处理体 |
| `scripts/gen-cli.mjs` | 302 | #411 放开读命令（`kind:'read'`）并改头注释；仍在 350 以内 |
| `src/shared/copyArea.ts` | 159 | #411 加 `actionStamp()`（本次执行时刻串的唯一取法）；仍在 350 以内 |
| `src/shared/commandSpec.ts` | 74 | #411 补读命令那一支；仍在 350 以内 |
| `src/shared/pageShell.ts` | 65 | #411 眉标按域取、槽位加 `list`；仍在 350 以内 |
| `src/shared/writeParts.ts` | 89 | #411 `<section>` 槽位加 `list`；仍在 350 以内 |
| `src/render/views.ts` | 125 | #411 搬走四条 `buildRecord*`；仍在 350 以内 |
| `src/policy/record.ts` | 91 | #411 收时间窗口三件（`monthRange`／`weekRange`／`yesterdayStr`）；仍在 350 以内 |
| `src/render/envelope.ts` | 64 | #411 过渡表删四条查询命令；仍在 350 以内 |
| `src/cli/registry.ts` | 37 | 生成物（`pnpm gen`）：两域六条；仍在 350 以内 |

超线件仍是两件（`wake-assets.ts` 986、`cmd_read.ts` 485），各带超因与拆法去向；本票新增的四个件都在 350 以内。
