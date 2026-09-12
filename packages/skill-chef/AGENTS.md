# skill-chef 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：**用户答复**（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。同数、同落点的兄弟件是 `packages/skill-memo-ilife/AGENTS.md`（该文件自述「兄弟件 `packages/skill-chef/AGENTS.md` 截至 2026-09-12 尚未落盘——本条是与它同数、同落点的约定」；本文件即按 #214 补上那一落点）。`structure.md` 要求这条数字写在各包自己的地方。

## 本包现状（2026-09-12 #215 实测，超线件逐件挂号）

| 件 | LF | 结论 |
|---|---|---|
| `src/cli/cmd_read.ts` | 428 | 已超线（一个文件装全部命令分派 ＋ argv 解析 ＋ envelope 打印 ＋ #215 的 HELP 交付装配）；拆法＝按域拆分派，属「整包按域重排」那张图外的票，见 `docs/skills/skill-chef/t236-structure-design.md:211`。读数沿革：#214 实测 388 → #215 抬 help 分支 ＋ 接交付后 **437**（净增 49：import 面 6 行、`dispatchHelp` 26 行、main 接线 9 行、exit 5 归类 3 行、注释与判据 5 行）→ **#245 接复用窗口后 428**（净减 9：手写的「小时→毫秒＋正数校验」三行换成共用件 `reuseWindowOfHours` ＋ 一层 4 行的 `helpWindowOrFail`，注释段重写）；#215 定的口径是「只搬一处分支、净增控制在最小」，故**这两票都不拆**，只记 |
| `src/fetch/db.ts` | 451 | 已超线（建库 ＋ 迁移 ＋ 全部查询混在一处）；拆法同上，见 `t236-structure-design.md:212`。**#215／#245 均未碰它**（HELP 全程在开库之前分派） |
| `scripts/gen-help-assets.mjs` | 436 | 已超线（420 是 #213 交付时的读数；#214 只改其中两处注释 ＋ 一个常量，净增 16）。一个一次性生成器：十域表／组→域归属／字段映射 ＋ 三把摘要锁 ＋ 双向对账全在一份脚本里；拆法＝把「声明表」「断言」「渲染」三段拆成 `scripts/help-assets/` 下三件。**#214／#215／#245 都不拆**，只记 |

其余件均在 350 以内（#245 实测新读数：`src/help/helpFile.ts` **273**、`src/help/manifest.ts` **25**、`src/help/output.ts` **50**、`src/help/lookup.ts` **49**）。
