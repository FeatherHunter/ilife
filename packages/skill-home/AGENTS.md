# skill-home 包内规矩

（本包＝`packages/skill-home`；上层通用规矩见仓根 `AGENTS.md` 与 `docs/agents/structure.md`。）

## 文件行数告警线

- 文件行数**告警线 350**（数法：UTF-8 真实行数、含空行、**按文件**计，与兄弟技能包同数）。
- **机器生成物单列**、不计入这把尺（长度由事实源决定，人无法靠重构缩短）：`src/help/helpAssets.ts` 及同类生成物；生成物禁手改，改内容请改仓内事实源再跑生成器。
- **数据事实源单列**：`src/help/scenarios.yaml`（1283 行）是老骨架原样副本，属**数据资产**——长度由内容决定，人无法靠重构缩短，与生成物同样**不计入手写代码告警线**；但**改动它必须重跑生成器并更新摘要锁**（`pnpm gen:help-assets`，锁见下）。
- 已在线的超线件：`src/cli/cmd_read.ts`（**876 行，超 526**；#695 改路径类取值为读配置文件 ＋ 删掉两处环境变量读取后实测，净增 7）——归票 7 #190 处置，本票已按其范围处置（只抽 help 一支），**更大范围重排另立票**；`src/fetch/db.ts`（434 行，超 84）——**归属＝另立票（不在本图 #183）**。
- **管辖范围**照 `docs/agents/structure.md:9` 的「不管」清单：测试文件／页面模板／构建产物／生成的资产／文档；上面两条「单列」正是这条清单在本包的落地表述。**台账只登记管辖内的源码件**——现只有 `cmd_read.ts`（876）与 `db.ts`（434）两件；测试件（如 366 行的 `test/help-assets.test.mjs`）不适用本条告警线。

## 技能级 HELP 件留在 `src/help/`

- `src/help/` 下的技能级 HELP 件（速查 `lookup.ts`、内容资产 `helpAssets.ts`、事实源 `scenarios.yaml`）不是任何能力里的一件，装的是技能级入口，故不违反铁律四；判定依据见 `docs/skills/skill-home/t195-decisions-record.md` 决策 3。
- 名字属「待命名，暂不判合规」，等票 6／票 7 落名后回看。

## 内容资产与生成器

- 事实源：`src/help/scenarios.yaml`（老骨架原样副本，**仓内唯一输入源**；生成器不许读仓外路径）。
- 生成器：`scripts/gen-help-assets.mjs`（薄 CLI，参数／`--check`／退出码）＋`scripts/lib/help-assets.mjs`（实体）＋`scripts/lib/yaml-subset.mjs`（YAML 子集读取）。
- 日常两命令：`pnpm gen:help-assets`（落盘）／`pnpm gen:help-assets:check`（只比对，不一致 exit 1）。改资产＝改事实源或生成器后重跑，别手改生成物。
- 改事实源后**必须**跑 `pnpm gen:help-assets` 重生成；忘了重生成会被 CI 的锁拦下（仓根 `package.json` 的 test glob 含 `packages/skill-home/test/*.test.mjs`，`.github/workflows/ci.yml` 会跑到）。
- `--check` **不进 `build` 链**：它与「重跑生成器比对全文」的用例在 CI 里是同一个断言，重复接入只增构建时长；且 `build` 链已被 `build-help.mjs`（`SKILL.md` 注入块）占用，多一个写入口会加剧冲突。
- `scripts/lib/yaml-subset.mjs` 是 **fail-closed** 解析器：只认事实源实际用到的写法（缩进 0／2 的键与块序列项、单行／流程标量、空集合字面量 `{}`／`[]`、`html:`／`variants:` 两棵不收子树）；其余（块标量 `|`／`>`、锚点／别名／tag、多文档、非空流程集合、tab 缩进、`html`／`variants` 之外的嵌套块、重复键、裸键）一律**带行号抛错**，不静默跳过。事实源若要改写法，**必须先扩这个解析器**并补用例。
- 契约锁在 `test/help-assets.test.mjs`（摘要锁＋形状＋与口径层双向对账），已接进包内 `test` 串。

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-home@0.2.1`（硬前提 `base-paint@0.3.5` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-home-ilife/scripts/wizard-publish.sh` —— 发 `dsh-home-ilife@0.2.1`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-home/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-home-ilife/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
