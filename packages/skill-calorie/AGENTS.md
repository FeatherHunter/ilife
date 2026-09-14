# skill-calorie 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：**用户答复**（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。同数、同落点的兄弟件是 `packages/skill-chef/AGENTS.md`（本文件与它同数、同落点）。`structure.md` 要求这条数字写在各包自己的地方。

## 本包现状（2026-09-14 #354 实测，超线件逐件挂号）

行数口径一律节点口径 `readFileSync(f,'utf8').split('\n').length - 1`。

| 件 | LF | 结论 |
|---|---|---|
| `src/render/wizardPort.ts` | 457 | 已超线，需要根据规则进行重构。超因：预检确认页装配与结果型页面装配同处一处；本次先不拆：拆分本身不在本票（#354 只登记），拆法待后续票确定 |
| `scripts/gen-cli.mjs` | 729 | 已超线，需要根据规则进行重构。超因：命令汇总派生与生成物写回同处一个一次性脚本；本次先不拆：拆分本身不在本票（#354 只登记），拆法待后续票确定 |

其余件均在 350 以内（本次只挂号超线件两件）。

检查脚本：`packages/skill-calorie/scripts/check-warning-line.mjs`（删台账任意一行必红）。
