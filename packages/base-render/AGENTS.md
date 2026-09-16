# base-render 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts`。生成物（`dist/`、`.tsbuildinfo`）与页面模板不算——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：兄弟件 `packages/skill-calorie/AGENTS.md` 与 `packages/skill-chef/AGENTS.md` 同数、同落点（350 行／LF 口径）。`structure.md` 要求这条数字写在各包自己的地方。

详见 `docs/base/base-render/行数告警线评估.md`（#430 当刻实测＋拆件评估）。
