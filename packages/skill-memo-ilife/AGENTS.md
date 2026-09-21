# skill-memo-ilife 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：**用户答复**（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。兄弟件 `packages/skill-chef/AGENTS.md` **已按 #214 落盘**——本条是与它同数、同落点的约定。`structure.md` 要求这条数字写在各包自己的地方。

## 数据库结构（负责人裁定 2026-09-17）

- **新备忘录的数据库结构必须和老备忘录完全一致**，以老库 `script/init.sql` 为准（`notes`＋`reminders` 两张业务表及全部字段语义）；**老备忘录才是正确的，新备忘录当前模型是残次品**。
- 凡新仓模型与老库不一致处，一律按老库补齐，不另行取舍；涉及已交付实现返修或规格变更的，先回对应票据（规格 #657、地图 #658）。
- **连接口径**：新仓直连老库文件（`$SKILLS_DB_PATH/memo.db`，SQLite，WAL，外键开），**连接层禁 DDL**（不建表、不改表、不建索引，只做增删改查）；测试一律用**临时拷贝**跑，绝不连活库写。
- **开发授权（负责人 2026-09-17）**：新仓现有很多 AI 写的欠严谨代码；凡新设计不合理处，直接照老技能重写，无需逐项请示（老技能是权威）。

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-memo-ilife@0.3.0`（硬前提 `base-paint@0.3.6` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-memo-ilife/scripts/wizard-publish.sh` —— 发 `dsh-memo-ilife@0.3.1`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-memo-ilife/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-memo-ilife/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。


## 行数台账（#855 · 350 ＋ LF 口径）

台账由包内这一件守：`node packages/skill-memo-ilife/scripts/check-warning-line.mjs`（比对，红即点名）／
`--sync`（只补新行、只刷「当场实测」列——**已存在行的挂号值永不回改**）。越线件只许变短：实测 > 挂号值即红。
包内脚本别名：`pnpm --filter skill-memo-ilife gate:lines`。（口径与拆法见 `docs/skills/skill-memo-ilife/t855-实施规格-与开工前读数.md` §十七。）

<!-- warning-line-ledger:begin -->
| 件 | 挂号值（首次挂号时的 LF，永不回改） | 当场实测 | 结论 |
|---|---|---|---|
| `scripts/build-help.mjs` | 38 | 38 | 未越线，在册备查 |
| `scripts/check-warning-line.mjs` | 112 | 133 | 未越线，在册备查 |
| `scripts/gen-cli.mjs` | 380 | 293 | 已回线内（挂号值 380 留档，只许变短） |
| `scripts/gen-cli.render.mjs` | 105 | 105 | 未越线，在册备查 |
| `scripts/gen-help-assets.mjs` | 304 | 304 | 未越线，在册备查 |
| `scripts/help-assets.data.mjs` | 125 | 125 | 未越线，在册备查 |
| `scripts/help-assets.render.mjs` | 99 | 99 | 未越线，在册备查 |
| `scripts/t659-parity-probe.mjs` | 110 | 110 | 未越线，在册备查 |
| `src/checkin/routes.ts` | 36 | 36 | 未越线，在册备查 |
| `src/cli/cmd_read.ts` | 367 | 318 | 已回线内（挂号值 367 留档，只许变短） |
| `src/cli/config.ts` | 113 | 113 | 未越线，在册备查 |
| `src/cli/health.ts` | 37 | 37 | 未越线，在册备查 |
| `src/cli/health/configRead.ts` | 208 | 208 | 未越线，在册备查 |
| `src/cli/health/index.ts` | 17 | 17 | 未越线，在册备查 |
| `src/cli/health/items.ts` | 240 | 240 | 未越线，在册备查 |
| `src/cli/health/probe.ts` | 185 | 185 | 未越线，在册备查 |
| `src/config.ts` | 154 | 154 | 未越线，在册备查 |
| `src/db/readonly.ts` | 333 | 333 | 未越线，在册备查 |
| `src/health.ts` | 17 | 17 | 未越线，在册备查 |
| `src/help/booklet.ts` | 92 | 92 | 未越线，在册备查 |
| `src/help/helpFile.ts` | 220 | 220 | 未越线，在册备查 |
| `src/help/index.ts` | 4 | 4 | 未越线，在册备查 |
| `src/help/lookup.ts` | 56 | 59 | 未越线，在册备查 |
| `src/help/manifest.ts` | 50 | 50 | 未越线，在册备查 |
| `src/help/sceneData.ts` | 64 | 64 | 未越线，在册备查 |
| `src/help/scenes/checkin.ts` | 71 | 71 | 未越线，在册备查 |
| `src/help/scenes/init.ts` | 44 | 44 | 未越线，在册备查 |
| `src/help/scenes/memo.ts` | 123 | 123 | 未越线，在册备查 |
| `src/help/scenes/mood.ts` | 73 | 73 | 未越线，在册备查 |
| `src/help/scenes/remind.ts` | 90 | 90 | 未越线，在册备查 |
| `src/help/scenes/search.ts` | 131 | 131 | 未越线，在册备查 |
| `src/help/scenes/sync.ts` | 43 | 43 | 未越线，在册备查 |
| `src/help/scenes/wish.ts` | 103 | 103 | 未越线，在册备查 |
| `src/index.ts` | 11 | 11 | 未越线，在册备查 |
| `src/init/commands.ts` | 20 | 20 | 未越线，在册备查 |
| `src/init/diagnosis.ts` | 133 | 134 | 未越线，在册备查 |
| `src/init/index.ts` | 42 | 42 | 未越线，在册备查 |
| `src/init/page.ts` | 243 | 243 | 未越线，在册备查 |
| `src/init/routes.ts` | 15 | 15 | 未越线，在册备查 |
| `src/init/run.ts` | 71 | 71 | 未越线，在册备查 |
| `src/memo/batch.ts` | 62 | 62 | 未越线，在册备查 |
| `src/memo/category.ts` | 32 | 32 | 未越线，在册备查 |
| `src/memo/commands.ts` | 53 | 53 | 未越线，在册备查 |
| `src/memo/crud.ts` | 30 | 30 | 未越线，在册备查 |
| `src/memo/index.ts` | 7 | 9 | 未越线，在册备查 |
| `src/memo/media.ts` | 90 | 90 | 未越线，在册备查 |
| `src/memo/receipt.ts` | 83 | 83 | 未越线，在册备查 |
| `src/memo/receiptPage.ts` | 72 | 72 | 未越线，在册备查 |
| `src/memo/routes.ts` | 89 | 89 | 未越线，在册备查 |
| `src/memo/run.ts` | 310 | 312 | 未越线，在册备查 |
| `src/mood/routes.ts` | 72 | 72 | 未越线，在册备查 |
| `src/remind/commands.ts` | 30 | 30 | 未越线，在册备查 |
| `src/remind/index.ts` | 7 | 10 | 未越线，在册备查 |
| `src/remind/policy.ts` | 90 | 90 | 未越线，在册备查 |
| `src/remind/routes.ts` | 57 | 66 | 未越线，在册备查 |
| `src/remind/run.ts` | 100 | 188 | 未越线，在册备查 |
| `src/remind/store.ts` | 302 | 302 | 未越线，在册备查 |
| `src/render/envelope.ts` | 52 | 52 | 未越线，在册备查 |
| `src/render/errors.ts` | 11 | 11 | 未越线，在册备查 |
| `src/render/html.ts` | 50 | 50 | 未越线，在册备查 |
| `src/render/index.ts` | 23 | 27 | 未越线，在册备查 |
| `src/render/listPage.ts` | 69 | 69 | 未越线，在册备查 |
| `src/render/memoPageAssets.ts` | 229 | 229 | 未越线，在册备查 |
| `src/render/pages.ts` | 261 | 253 | 未越线，在册备查 |
| `src/render/receipt.ts` | 107 | 126 | 未越线，在册备查 |
| `src/render/templates.ts` | 27 | 27 | 未越线，在册备查 |
| `src/search/commands.ts` | 29 | 29 | 未越线，在册备查 |
| `src/search/index.ts` | 9 | 9 | 未越线，在册备查 |
| `src/search/routes.ts` | 66 | 66 | 未越线，在册备查 |
| `src/search/run.ts` | 72 | 199 | 未越线，在册备查 |
| `src/shared/commandSpec.ts` | 75 | 75 | 未越线，在册备查 |
| `src/shared/errors.ts` | 25 | 25 | 未越线，在册备查 |
| `src/shared/exit.ts` | 12 | 12 | 未越线，在册备查 |
| `src/shared/paths.ts` | 100 | 100 | 未越线，在册备查 |
| `src/shared/rows.ts` | 13 | 13 | 未越线，在册备查 |
| `src/shared/validators.ts` | 14 | 14 | 未越线，在册备查 |
| `src/sync/auth.ts` | 19 | 19 | 未越线，在册备查 |
| `src/sync/commands.ts` | 29 | 30 | 未越线，在册备查 |
| `src/sync/feishu.ts` | 221 | 221 | 未越线，在册备查 |
| `src/sync/index.ts` | 7 | 10 | 未越线，在册备查 |
| `src/sync/routes.ts` | 16 | 16 | 未越线，在册备查 |
| `src/sync/run.ts` | 57 | 57 | 未越线，在册备查 |
| `src/sync/sentinel.ts` | 175 | 174 | 未越线，在册备查 |
| `src/triggers/routeSpec.ts` | 36 | 36 | 未越线，在册备查 |
| `src/triggers/routing.ts` | 41 | 41 | 未越线，在册备查 |
| `src/triggers/wakewords.ts` | 59 | 61 | 未越线，在册备查 |
| `src/wish/commands.ts` | 22 | 22 | 未越线，在册备查 |
| `src/wish/complete.ts` | 78 | 78 | 未越线，在册备查 |
| `src/wish/due.ts` | 61 | 61 | 未越线，在册备查 |
| `src/wish/ensure.ts` | 269 | 269 | 未越线，在册备查 |
| `src/wish/gate.ts` | 23 | 23 | 未越线，在册备查 |
| `src/wish/index.ts` | 14 | 22 | 未越线，在册备查 |
| `src/wish/mark.ts` | 17 | 17 | 未越线，在册备查 |
| `src/wish/policy.ts` | 14 | 14 | 未越线，在册备查 |
| `src/wish/receipt.ts` | 94 | 111 | 未越线，在册备查 |
| `src/wish/reconcile.ts` | 153 | 153 | 未越线，在册备查 |
| `src/wish/routes.ts` | 57 | 57 | 未越线，在册备查 |
| `src/wish/run.ts` | 67 | 138 | 未越线，在册备查 |
| `src/wish/taskRemove.ts` | 20 | 20 | 未越线，在册备查 |
| `src/wish/taskSync.ts` | 63 | 63 | 未越线，在册备查 |
| `src/wish/taskWrite.ts` | 75 | 75 | 未越线，在册备查 |
| `src/wish/tasks.ts` | 76 | 76 | 未越线，在册备查 |
| `src/wish/wizards.ts` | 134 | 134 | 未越线，在册备查 |
<!-- warning-line-ledger:end -->
