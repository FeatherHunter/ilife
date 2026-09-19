# `.changeset/` 政策

**一句话**：`.changeset/*.md` 在本仓**只是变更记录**，不是版本来源；版本由发版人手工改 `package.json` 决定，不跑 `changeset version`。

## 版本落点：手工定版

- 发版窗口里直接改 `packages/*/package.json` 的 `version`（先例 `1519c10`，最近一次 `86b00f66`：三包锁步定 0.3.3）。
- **不跑 `changeset version`**。它一次消费 `.changeset/` 目录里的**全部**待用记录（2026-09-19 实测 128 条，覆盖 16 个包），会把 16 个包同时升版、生成 16 份 `CHANGELOG.md`，并连带改写内部依赖范围、`pnpm-lock.yaml`、`tooling/check-publish.mjs` 的正则与多处测试断言。本仓当前的 `packages/**/CHANGELOG.md` 只有一份（`packages/base-render/CHANGELOG.md`，手工写的），说明历史上从未用过该命令产出。
- **不跑 `changeset publish`**。发布走 `pnpm publish:pre` → `publish:tarball` → `publish:fresh` 三道门与 `tooling/check-publish.mjs`。

## 不删的两件

| 路径 | 谁在读 |
| --- | --- |
| `.changeset/config.json` | `packages/base-render/test/base-version-lockstep.test.mjs`（断言 `fixed` 组恰为 `base-link-core`／`base-paint`／`base-combos` 三包） |
| `.changeset/base-paint-contract-freeze.md` | `packages/base-render/test/contract-signatures.test.mjs`（冻结契约的交付断言） |

2026-09-18 曾按「已发版、属欠账」成批删掉 10 条，其中上表第二条被冻结用例读取，删后 base-render 全包出现 1 红，用 `00b4a46a` 逐字节恢复。**其余记录没有读取方**，删与不删都不影响任何一道门 —— 因此不必为「条数多」专门清理；要处置就逐条核引用后按需删。

## `pnpm changeset:status`（CI 在跑）

`.github/workflows/ci.yml` 的 `changeset:status` 步骤只校验**记录本身能不能被读**，不校验版本落点：

- 记录里点名的包必须存在于工作区（`packages/*/package.json` 的 `name`）；
- 工作区内每个包的内部依赖范围必须包含对方**当前** `version`。`dependencies`／`devDependencies`／`peerDependencies` **都在检查范围内**（上游 `@changesets/get-dependents-graph` 的 `getDependencyGraph` 默认 `ignoreDevDependencies = false`，`assemble-release-plan` 也不传这一项）。

2026-09-18 发现的两种形态已修掉：`t271-条目列表页.md` 缺开头 `---` 分隔行、三条写旧包名 `calorie`（`532cebad`）；`skill-calorie` 的 `base-link-core: ^0.1.0` 停在旧范围而工作区已是 0.3.x（`6e893a2a` 把它提到 `dependencies` 并改 `^0.3.0`）。该步骤对「待用记录有多少条」「各声明哪个 bump 等级」不作判断。

## 新记录怎么写

- 路径：`.changeset/<票号专属名>.md`，每票一件，文件名不得与他人重复（见 `docs/subagent-concurrency-protocol.md` §1）。
- 内容：这一票对外行为变没变；变了写清改成什么。级别（patch／minor／major）按惯例写，但如上所述，它不决定本仓的版本落点。
