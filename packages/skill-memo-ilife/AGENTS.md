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

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-memo-ilife@0.2.1`（硬前提 `base-paint@0.3.4` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-memo-ilife/scripts/wizard-publish.sh` —— 发 `dsh-memo-ilife@0.2.1`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-memo-ilife/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-memo-ilife/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
