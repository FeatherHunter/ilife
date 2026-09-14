# skill-calorie 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：**用户答复**（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。同数、同落点的兄弟件是 `packages/skill-chef/AGENTS.md`（本文件与它同数、同落点）。`structure.md` 要求这条数字写在各包自己的地方。

## 本包现状（2026-09-14 #354 实测 ＋ #398 补记一行，超线件逐件挂号）

行数口径一律节点口径 `readFileSync(f,'utf8').split('\n').length - 1`。

| 件 | LF | 结论 |
|---|---|---|
| `src/render/wizardPort.ts` | 457 | 已超线，需要根据规则进行重构。超因：预检确认页装配与结果型页面装配同处一处；本次先不拆：拆分本身不在本票（#354 只登记），拆法待后续票确定 |
| `scripts/gen-cli.mjs` | 729 | 已超线，需要根据规则进行重构。超因：命令汇总派生与生成物写回同处一个一次性脚本；本次先不拆：拆分本身不在本票（#354 只登记），拆法待后续票确定 |
| `src/fetch/body.ts` | 369 | 已超线，需要根据规则进行重构。超因：（**#398 引入**）新增读侧来源词（`SOURCE_FILTER_ALL`／`SourceFilter`／`assertSourceFilter`）与按来源分组取数（`trendCompositionBySource`／`compositionSourceCount`），与既有的写侧校验（`validateCompositionInput`）＋围度取数同处一件；本次先不拆：拆分不在 #398 写集（该票写集只有 `fetch/body.ts`／必要时 `bodyPlate.ts`／测试／证据），**拆法待后续票**——按「写侧校验／围度取数／体成分取数」三面切成同目录姊妹件，出口由 `fetch/index.ts` 的 `export *` 转出，调用方导入面不变 |

其余**逐件**在 350 以内（本次只挂号超线件三件；#398 之前「其余件均在 350 以内」的整句写法已不再成立，改为逐件口径，
下列行数为 2026-09-14 #398 当场实测 LF 值）：`src/body/bodyPlate.ts` 227 行、`src/body/view.ts` 40 行、
`src/body/bodyDocs.ts` 255 行、`src/kcal.ts` 32 行，均在线内。

台账前两行的行数（457／729）是 #354 的**冻结挂号值**，也是 `check-warning-line.mjs` 的检查口径；
2026-09-14 #398 当场实测另得 `src/render/wizardPort.ts` 265 行、`scripts/gen-cli.mjs` 754 行
—— 两者仍超线，行数漂移不改挂号结论，检查脚本口径未动（改脚本不在 #398 写集）。

检查脚本：`packages/skill-calorie/scripts/check-warning-line.mjs`（删台账任意一行必红）。
