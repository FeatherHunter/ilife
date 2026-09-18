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
| `src/cli/cmd_read.ts` | 460 | 已超线（一个文件装全部命令分派 ＋ argv 解析 ＋ envelope 打印 ＋ #215 的 HELP 交付装配）；拆法＝按域拆分派，属「整包按域重排」那张图外的票，见 `docs/skills/skill-chef/t236-structure-design.md:211`。读数沿革：#214 实测 388 → #215 抬 help 分支 ＋ 接交付后 **437**（净增 49）→ **#245 接复用窗口后 443**（手写的「小时→毫秒＋正数校验」三行换成共用件 `reuseWindowOfHours` ＋ `helpWindowOrFail` 一层，注释段重写；净增 6）→ **#695 路径类取值改读配置文件后 460**（净增 17：三个配置 key 在预检与形状表之前拦下 ＋ 预检不再读 `SKILLS_DB_PATH` ＋ 落点常量改函数调用的注释同步）。⚠️ **此数按提交树实测**（`git show <commit>:<file>` 数 LF）：#245 首版表里写 428 是**迁移前的工作区读数**，同一轮里他会话的改动让提交树成了 443——**记读数一律以提交树为准**，别拿工作区当时的值。拆法同前：#215／#245／#695 三票都不拆，只记 |
| `src/fetch/db.ts` | 451 | 已超线（建库 ＋ 迁移 ＋ 全部查询混在一处）；拆法同上，见 `t236-structure-design.md:212`。**#215／#245 均未碰它**（HELP 全程在开库之前分派） |
| `scripts/gen-help-assets.mjs` | 436 | 已超线（420 是 #213 交付时的读数；#214 只改其中两处注释 ＋ 一个常量，净增 16）。一个一次性生成器：十域表／组→域归属／字段映射 ＋ 三把摘要锁 ＋ 双向对账全在一份脚本里；拆法＝把「声明表」「断言」「渲染」三段拆成 `scripts/help-assets/` 下三件。**#214／#215／#245 都不拆**，只记 |

其余件均在 350 以内（#245 按提交树实测：`src/help/helpFile.ts` **210**、`src/help/output.ts` **63**、`src/help/lookup.ts` **44**）。⚠️ 表里曾有一行 `src/help/manifest.ts`——**本包没有这个件**（`manifest.ts` 是 skill-memo-ilife 的），已删；别照抄邻居的件名。

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-chef@0.2.0`（硬前提 `base-paint@0.3.2` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-chef/scripts/wizard-publish.sh` —— 发 `dsh-chef@0.2.0`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-chef/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-chef/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
