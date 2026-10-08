# base-entries 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记本包自己的数字与几条本包口径。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts`。`structure.md` 的「管辖」一节把测试、构建产物、文档划在外面——`test/`、`test-d/`、`dist/` 不算。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**
- 口径出处：兄弟件 `packages/base-render/AGENTS.md` 与技能包同数、同落点（350 行／LF 口径）。

### 本包现状（#1200 建包当刻实测）

| 件 | LF | 结论 |
| --- | --- | --- |
| `src/resolve.ts` | 79 | 未超线 |
| `src/errors.ts` | 51 | 未超线 |
| `src/evaluate.ts` | 51 | 未超线 |
| `src/catalog.ts` | 45 | 未超线 |
| `src/format.ts` | 42 | 未超线 |
| `src/language.ts` | 15 | 未超线 |
| `src/index.ts` | 14 | 未超线 |

## 本包口径

- **零运行时依赖**：`dependencies` 必须是 `{}`；门是 `tooling/check-boundaries.mjs` 里那行 `base-entries 零依赖`。数字与日期走运行时自带的 `Intl`，不引第三方。
- **语言清单不在这里**：唯一权威是 `packages/base-link-core/src/config/language.ts`（`AVAILABLE_LANGUAGES`／`DEFAULT_LANGUAGE`）。本包对 `language` 只收 `string`，不复制清单、不判合法性——清单复制一份就是第二个定义地（铁律二）。
- **基准语言 zh 是另一个概念**：词条表以它为准（`MessageId` 从它派生），与「语言选择的缺省值」不是同一件事。见 `src/catalog.ts` 头注释。
- **加一门语言＝加一个词条文件**：词条表的语言键就是语言，key 集合以基准语言那份表为准；其余语言可暂时缺词条，缺的走回退链。
- **两处非源码位**：`test-d/` 是类型面自证（被 `tsconfig.json` 这个 solution 工程收进 `tsc -b`），`test/` 读编译产物 `dist/`（先 `tsc -b` 再 `node --test`，与兄弟包同形）。
- 端口契约、回退链、换后端怎么接：`docs/base/base-entries/端口契约.md`。

## 读数命令

- 类型面（含 `test-d/`）：`npx tsc -b`（在本包目录里）或仓根 `npx tsc -b packages/base-entries`。
- 行为面：`node --test test/entries.test.mjs`（需先 `tsc -b` 出 `dist/`）。
- 本包相关边界门：`pnpm boundaries` 与 `pnpm base:floor`。
