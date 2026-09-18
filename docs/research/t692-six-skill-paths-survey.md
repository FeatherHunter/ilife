# t692 六家技能的路径类配置全量调查

调查范围：`packages/skill-calorie`、`packages/skill-bill`、`packages/skill-chef`、`packages/skill-home`、`packages/skill-memo-ilife`、`packages/skill-schedule` 六家技能包的 `src/`（各家插件包的取数桥只作对照，不占计数）。

只读调查：未改任何源码、未切分支、未跑任何会写库或产出文件的技能命令。卡路里与记账两家以 `docs/research/t673-config-surface-survey.md`（下称 t673）为起点，该件已查过的项只做复核与补差，不重复展开；四家新查的（大厨／居家／备忘／作息）逐项找源。

**计数口径**（一行＝一项）：一行＝一个「指向某个文件或目录」的取值，且**这台机器上技能跑起来之前就得定下来**。

- 进计数：① 数据目录与库文件（含第二份库）；② 产物目录与产物文件名主体；③ 资源目录（照片／GIF／备份／附件）；④ 这份技能必须能定位的外部文件（跨技能 CLI 入口、飞书 CLI、包内数据件、家目录状态文件、包内模板目录）。
- 不进计数：凭据（训记 KEY）；一次干活的入参路径（`--html <路径>`、导入用的 `file`）；测试隔离哨兵与挡板变量（`*_FORCE_PROD`、`CALORIE_*_STUB`、`*_TODAY`）；纯业务常量（分类表、缺省账户、转账名）。
- 「产物文件名主体」按 `docs/agents/wording.md:9` 的叫法写；一个技能内的多个主体（HELP／速查表／整页）算**一项**（同一件事的几个值）。

## 一、六家并排总表

| 技能 | 项名 | 现在住哪（出处） | 缺了会怎样 | 代码里已有的默认值 |
|---|---|---|---|---|
| 卡路里 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-calorie/src/paths.ts:13`，出口预检 `src/cli/readArgs.ts:20-21` | `resolveDbDir()` 抛「SKILLS_DB_PATH 未设置：拒绝隐式落盘」（`src/paths.ts:11-16`）；出口预检 `fail(1)` ⇒ 所有命令 exit 1 | 无默认，缺失阻断 |
| 卡路里 | 库文件名 `calorie_data.db` | 代码常量 `src/paths.ts:10`；`resolveDbPath()` 拼出库文件 `src/paths.ts:23-26` | 定位不到库文件，全部读写失败 | 有默认 `calorie_data.db` |
| 卡路里 | HTML 产物目录 `calorie_html` | 代码常量 `src/output.ts:37`；拼在库目录下 `src/output.ts:110-115` | 落点解析失败与写盘失败同归一类（`src/output.ts:220-222`） | 有默认（库目录下 `calorie_html`） |
| 卡路里 | 产物文件名主体 | 三个代码常量：`卡路里_HELP`（`src/photo/helpFile.ts:27`）、`卡路里_照片HELP`（`src/output.ts:42`）、`卡路里_速查台`（`src/photo/helpPaths.ts:23`） | 产物名生成不了；HELP 复用窗口也只认这三个主体（`src/output.ts:197`） | 有默认三值 |
| 卡路里 | 照片目录 `CALORIE_PHOTOS_DIR` | 环境变量；读取点 `src/photo/dir.ts:15`、`src/photo/photos.ts:49` | 读侧不报错、只是不校验照片文件在不在；写侧抛「照片目录未配置」（`src/photo/photos.ts:49-50`）；GIF 页出「未配照片目录」（`src/photo/gifDoc.ts:153`） | 无默认，读降级／写阻断 |
| 卡路里 | 照片 GIF 子目录 `gifs` | 代码常量 `src/photo/gifDoc.ts:68`；落 `<照片目录>/gifs`（`src/photo/gifDoc.ts:8,161`） | GIF 产物无处落盘 | 有默认 `gifs` |
| 卡路里 | 训记限频状态文件 `~/.mavis/xunji_push_rate.json` | 代码按家目录拼 `src/xunji/rateLimit.ts:22-28`（`homedir()` 在 `:18`） | 限频状态记不住；`src/xunji/run.ts:58` 可传 `null` 只记内存 | 有默认（家目录固定） |
| 卡路里 | 训记读侧状态文件 `~/.mavis/xunji_bridge_rate.json` | 代码按家目录拼 `src/xunji/fetch.ts:32-34` | 拉取侧限频状态记不住 | 有默认（家目录固定） |
| 卡路里 | 训记同步状态文件 `~/.mavis/xunji_bridge_sync_state.json` | 代码按家目录拼 `src/xunji/run-sync.ts:114-117` | 同步游标记不住，下次全量比对 | 有默认（家目录固定） |
| 卡路里 | 训记动作库 · 包内预置 | 代码常量按包根拼 `src/xunji/catalog.ts:22,28`；数据件在仓内 `src/xunji/data/训记官方动作.json` | 读不到 ⇒ `loaded=false`，动作名判不了（不是「不合法」，`src/xunji/catalog.ts:33-41`） | 有默认（包内快照） |
| 卡路里 | 训记动作库 · 老机器路径 `~/.minimax/训记官方动作.json` | 代码常量 `src/xunji/catalog.ts:30` | 这一档只是「可传的一个值」，不传就不看它 | 有默认（家目录固定） |
| 卡路里 | 训记 CLI 入口（本包编译产物） | `xunjiCliPath()` 按包布局拼 `dist/xunji/cli.js`，不存在即 `fail(4)`（`src/workout/xunjiRunner.ts:39-44`） | 调用方拦在起子进程之前，exit 4 | 有默认（相对本包的 `../xunji/cli.js`） |
| 卡路里 | 跨技能出口 · 作息 CLI | 代码按包布局算 `src/workout/landRunner.ts:47` | 「落地训练」调作息那一步 spawn 失败 | 有默认（`../../../skill-schedule/dist/cli/cmd_read.js`） |
| 卡路里 | 跨技能出口 · 备忘 CLI | 代码按包布局算 `src/workout/landRunner.ts:55` | 「落地训练」调备忘那一步 spawn 失败 | 有默认（`../../../skill-memo-ilife/dist/cli/cmd_read.js`） |
| 卡路里 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:20`，运行时读 `*.html`（`:22-26`） | 模板装载失败（`pageAssets` 那条路走不通） | 有默认（包内 `templates/`，6 件） |
| 记账 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-bill/src/fetch/paths.ts:11-19`，出口预检 `src/cli/cmd_read.ts:47-48` | `resolveDbDir()` 抛「拒绝隐式落盘」；出口预检 `fail(1)` ⇒ exit 1 | 无默认，缺失阻断 |
| 记账 | 库文件名 `biscuit_accountant.db` | 代码常量 `src/fetch/paths.ts:7` | 定位不到库文件 | 有默认 |
| 记账 | 第二份库 `goals.json` | 代码常量 `src/fetch/paths.ts:8`；读写 `src/fetch/db.ts:219-248` | 预算／储蓄目标／账户读不到；文件坏了抛 `BILL_GOALS_CORRUPT`（`src/fetch/db.ts:227-238`） | 有默认（与库同目录） |
| 记账 | 备份目录 `<SKILLS_DB_PATH>/backups` | 出口里拼 `join(dbPath, '..', 'backups')`（`src/cli/cmd_read.ts:351,367`），目录不存在即建（`:352`） | 备份／恢复无落点（恢复时目录空则抛「无可用备份」`src/cli/cmd_read.ts:369`） | 有默认（库目录下的 `backups`） |
| 记账 | 备份名主体 `biscuit_<YYYYMMDD_HHMMSS>.db` ＋同名 `.goals.json` | 出口里按戳拼（`src/cli/cmd_read.ts:359-362`） | 备份文件名生成不了；恢复候选按名字排序取最新（`:368`） | 有默认（时间戳自动生成） |
| 记账 | HELP 产物目录 `biscuit_accountant_html` | 代码常量 `src/render/helpPaths.ts:16` | HELP 与速查表无处落盘 | 有默认 |
| 记账 | 产物文件名主体 | 代码常量 `饼干记账_HELP`（`src/render/helpFile.ts:24`）、`饼干记账_速查表`（`src/render/helpPaths.ts:20`） | 产物名生成不了 | 有默认两值 |
| 记账 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:50`，运行时读 `*.html`（`:52-56`） | 业务页模板装载失败 | 有默认（包内 `templates/`，16 件） |
| 大厨 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-chef/src/fetch/paths.ts:10`，出口预检 `src/cli/cmd_read.ts:48-49` | `resolveDbDir()` 抛「拒绝隐式落盘」（`src/fetch/paths.ts:11-16`）；出口预检 `fail(1)` ⇒ exit 1 | 无默认，缺失阻断 |
| 大厨 | 库文件名 `chef_data.db` | 代码常量 `src/fetch/paths.ts:7`；`resolveDbPath()` `:20-23` | 定位不到库文件 | 有默认 `chef_data.db` |
| 大厨 | HTML 产物目录 `cook_html/help`（两段） | 代码常量 `src/help/manifest.ts:18`；落点由 `src/help/helpFile.ts:215` 拼 | HELP／速查表无处落盘 | 有默认（库目录下两级） |
| 大厨 | 产物文件名主体 | 代码常量 `私家大厨_HELP`（`src/help/manifest.ts:21`）、`私家大厨_速查表`（`:25`） | 产物名生成不了 | 有默认两值 |
| 大厨 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:34`，运行时读 `*.html`（`:40`） | 业务页模板装载失败 | 有默认（包内 `templates/`，8 件） |
| 居家 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-home/src/fetch/paths.ts:10`，出口预检 `src/cli/cmd_read.ts:47-48` | `resolveDbDir()` 抛「拒绝隐式落盘」（`src/fetch/paths.ts:11-16`）；出口预检 `fail(1)` ⇒ exit 1 | 无默认，缺失阻断 |
| 居家 | 库文件名 `home.db` | 代码常量 `src/fetch/paths.ts:7`；`resolveDbPath()` `:20-23` | 定位不到库文件 | 有默认 `home.db` |
| 居家 | HTML 产物目录 `home_manager_html`（扁平，无 `help/` 子层） | 代码常量 `src/help/manifest.ts:18`；出口拼 `join(dbDir, HELP_HTML_DIR_NAME)`（`src/cli/cmd_read.ts:101`） | HELP／速查表无处落盘 | 有默认 |
| 居家 | 产物文件名主体 | 代码常量 `居家管家_HELP`（`src/help/manifest.ts:21`）、`居家管家_速查表`（`:25`） | 产物名生成不了 | 有默认两值 |
| 居家 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:60`，运行时读 `*.html`（`:66`） | 业务页模板装载失败 | 有默认（包内 `templates/`，21 件） |
| 备忘 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-memo-ilife/src/cli/cmd_read.ts:50-51`（唯一读取点） | 预检 `fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）')` ⇒ exit 1 | 无默认，缺失阻断 |
| 备忘 | 库文件名 `memo.db` | 代码常量 `src/fetch/db.ts:50-52`（`join(dbDir, 'memo.db')`） | 打开前先 `stat`，文件不在抛 `MEMO_DB_MISSING`，绝不建空库（`src/fetch/db.ts:6,61-66`） | 有默认 `memo.db` |
| 备忘 | HTML 产物目录 `memo_html`（扁平） | 代码常量 `src/help/manifest.ts:20`；落点 `join(resolve(dbPath), HELP_HTML_DIR_NAME)`（`src/cli/cmd_read.ts:92-93`） | HELP／速查表／整页交付都无处落盘 | 有默认 |
| 备忘 | 产物文件名主体 | `备忘录_HELP`（`src/help/manifest.ts:23`）、`备忘录_速查表`（`:26`）；整页交付另用页名当主体（`心愿排期向导`／`心愿完成向导`／`同步报告`／`批量改分类`，`src/cli/cmd_read.ts:316,337,360,401`） | 产物名生成不了 | 有默认（HELP／速查表两值 ＋ 各页名） |
| 备忘 | 附件前缀目录 `MEMO_MEDIA_DIR` | 环境变量；读取点 `src/policy/crud.ts:29`（缺省 `media`） | 不报错：它只当**前缀**用（`:30-34` 校验附件路径以它开头并切掉，存相对路径） | 有默认 `media` |
| 备忘 | 飞书 CLI 路径 `LARK_CLI_PATH` | 环境变量；读取点 `src/fetch/feishu.ts:13-16`；兜底 `%APPDATA%/npm/lark-cli.cmd`（`:19-23`）、`where lark-cli`（`:25`） | 显式值不可用即抛 `LARK_UNAVAILABLE`；兜底全落空则返 `null`，调用方抛「缺失阻断取数」 | 有默认（APPDATA 兜底 ＋ PATH 探测） |
| 备忘 | 飞书授权二维码落点 | 缺省 `join(tmpdir(), 'memo_feishu_qr')`，可被 `params.outDir` 覆盖（`src/fetch/auth.ts:50`；出口 `src/cli/cmd_read.ts:419`） | 落盘失败即抛（`LARK_TASK_FAILED`） | 有默认（系统临时目录） |
| 备忘 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:17`，运行时读 `*.html`（`:23`） | 整页交付模板装载失败 | 有默认（包内 `templates/`，6 件） |
| 作息 | 数据目录 `SKILLS_DB_PATH` | 环境变量；读取点 `packages/skill-schedule/src/fetch/paths.ts:10`，出口预检 `src/cli/cmd_read.ts:47-48` | `resolveDbDir()` 抛「拒绝隐式落盘」（`src/fetch/paths.ts:11-16`）；出口预检 `fail(1)` ⇒ exit 1 | 无默认，缺失阻断 |
| 作息 | 库文件名 `schedule_data.db` | 代码常量 `src/fetch/paths.ts:7`；`resolveDbPath()` `:20-23` | 定位不到库文件 | 有默认 `schedule_data.db` |
| 作息 | HTML 产物目录 `schedule_html/help`（两段） | 代码常量 `src/help/helpPaths.ts:19`；落点 `resolveHelpDir()` `:28-30` | HELP 无处落盘 | 有默认（库目录下两级） |
| 作息 | 产物文件名主体 `作息管家_HELP` | 代码常量 `src/help/helpFile.ts:30` | 产物名生成不了 | 有默认 |
| 作息 | 飞书 CLI 路径 `LARK_CLI_PATH` | 环境变量；读取点 `src/fetch/feishu.ts:24-27`；兜底 `%APPDATA%/npm/lark-cli.cmd`（`:30-33`）、`where lark-cli`（`:36`） | 同上（作息侧抛 `LARK_UNAVAILABLE`） | 有默认（APPDATA 兜底 ＋ PATH 探测） |
| 作息 | 包内页面模板目录 | `<包根>/templates`，`src/render/templates.ts:34`，运行时读 `*.html`（`:40`） | 业务页模板装载失败 | 有默认（包内 `templates/`，8 件） |

**计数**：

| 技能 | 路径类项（本件计数） | 其中「包内固定、不必上设置页」 | 上设置页的候选 |
|---|---|---|---|
| 卡路里 | 15 | 3（动作库包内预置、训记 CLI 入口、包内模板目录） | 12 |
| 记账 | 8 | 1（包内模板目录） | 7 |
| 大厨 | 5 | 1（包内模板目录） | 4 |
| 居家 | 5 | 1（包内模板目录） | 4 |
| 备忘 | 8 | 1（包内模板目录） | 7 |
| 作息 | 6 | 1（包内模板目录） | 5 |
| 合计 | **47** | 8 | 39 |

## 二、逐家明细

### 2.1 skill-calorie（以 t673 为起点，只补差）

t673 §一、§二 已把卡路里的环境变量与非环境变量项查全，本次复核结论：**t673 列的项在源码里都还在**，只补三处差。

**差 1 · 包内页面模板目录（t673 没列）**：`src/render/templates.ts:20` 按包布局拼 `<包根>/templates`，`:22-26` 运行时 `readFileSync` 读 `*.html`；`packages/skill-calorie/templates/` 在包内有 6 件（`home.html`／`diet.html`／`exercise.html`／`goal.html`／`photo-gallery.html`／`help.html`）。这是「指向某个目录」的取值，但按包装在哪算，不属配置候选。

**差 2 · 产物文件名主体是三个值**（t673 只列了「HTML 产物目录名」）：`卡路里_HELP`（`src/photo/helpFile.ts:27`）、`卡路里_照片HELP`（`src/output.ts:42`）、`卡路里_速查台`（`src/photo/helpPaths.ts:23`）；复用窗口那一组也只认这三个主体（`src/output.ts:197`）。

**差 3 · 训记 CLI 入口是本包编译产物的一条内部路径**：`src/workout/xunjiRunner.ts:39-44` 拼 `dist/xunji/cli.js`，不存在即 `fail(4)`。t673 把「跨技能出口」写成三处（作息／备忘／训记），实际训记那处是**本包内**的编译产物，不是别家的包；作息与备忘才是跨技能出口（`src/workout/landRunner.ts:47,55`）。

**复核读数**（与 t673 一致）：

- `rg -n "process\.env" packages/skill-calorie/src` → **21 处命中**（t673 §1.1 的读数）。其中具名直读 5 处：`SKILLS_DB_PATH`（`src/paths.ts:13`、`src/cli/readArgs.ts:20`）、`CALORIE_FORCE_PROD`（`src/paths.ts:30`）、`CALORIE_PHOTOS_DIR`（`src/photo/dir.ts:15`、`src/photo/photos.ts:49`）；其余经形状表／下标读：`CALORIE_TODAY`（`src/analysis/utils.ts:136`）、训记 KEY 两名（`src/xunji/key.ts:42,50,76,129,144`）、五个挡板（`src/workout/landRunner.ts:137,148,156,166`、`src/workout/xunjiRunner.ts:70`、`src/workout/landBatch.ts:142`）；另有三处是 `env: process.env` 透传给子进程（`landRunner.ts:102`、`landBatch.ts:149`、`xunjiRunner.ts:76`），不算具名读点。
- 库名与产物目录名都**没有**第二处定义：`rg -n "calorie_data\.db" packages/skill-calorie/src` 只命中 `src/paths.ts:10`；`rg -n "calorie_html" packages/skill-calorie/src` 只命中 `src/output.ts:37` 与 `src/photo/helpPaths.ts:18`（同一个名字两处写，值相同）。

### 2.2 skill-bill

t673 已查全，本次复核补两处。

**补 1 · 备份名主体与 `.goals.json` 同伴件**：`src/cli/cmd_read.ts:359-362` 生成 `biscuit_<YYYYMMDD_HHMMSS>.db` 并把 `goals.json` 复制成同名 `.goals.json`（失败容忍，`:362` 的 `catch` 注释写「goals 可空」）。恢复按名字排序取最后一个（`:368`）。

**补 2 · 包内页面模板目录**：`src/render/templates.ts:50,52-56`，包内 `templates/` 16 件。

**查不到**：记账**没有**业务页 HTML 的缺省落点——不给 `--html` 就没有产物文件（`src/cli/cmd_read.ts:463-469` 只认 `o.html`）。所以「业务页产物目录」这一项在记账**不存在**，不该照别家形状硬凑一行。

**复核读数**：`rg -n "process\.env" packages/skill-bill/src` → **4 处命中**（`src/cli/cmd_read.ts:47`、`src/fetch/paths.ts:11,33`、`src/query/read.ts:140`），与 t673 §1.1 一致。

### 2.3 skill-chef

**全部读取点（`rg -n "process\.env" packages/skill-chef/src` → 3 处）**：

| 变量 | 读取位置 | 登记面（`docs/env.md`） |
|---|---|---|
| `SKILLS_DB_PATH` | `src/fetch/paths.ts:10`、`src/cli/cmd_read.ts:48` | 有（`docs/env.md:9` 全局行、`:13` 大厨行） |
| `CHEF_FORCE_PROD` | `src/fetch/paths.ts:27` | 有（`docs/env.md:13`） |

**差集：无。** 大厨是六家里登记面与实现面**完全吻合**的一家（除哨兵外不读任何其他环境变量）。

**要点**：

- 库与库名：`DB_FILENAME = 'chef_data.db'`（`src/fetch/paths.ts:7`）；`resolveDbDir()` 只读环境变量、缺失抛（`:9-18`）；`resolveDbPath()` 会 `mkdirSync(dir, {recursive:true})`（`:20-23`）——所以 HELP 那条路绕开它，改走 `join(resolve(resolveDbDir()), DB_FILENAME)`（`src/cli/cmd_read.ts:126`，注释在 `:113-115` 写明理由）。
- HTML 产物目录：`HELP_DIR_SEGMENTS = ['cook_html','help']`（`src/help/manifest.ts:18`），落点由 `resolve(dirname(dbPath), ...HELP_DIR_SEGMENTS)` 拼（`src/help/helpFile.ts:215`）。目录名是用户 2026-09-12 改判的（老目录 `CookHub/` 换成 `cook_html/`，`src/help/manifest.ts:12-14`）。
- 跨技能出口：**没有**。全包 `rg -n "spawn|child_process" packages/skill-chef/src` 零命中（只命中注释里提到的脚本名）。
- 资源目录：**没有**照片目录；菜谱的 `photo_url` 是记录里的一列（`src/fetch/db.ts:51`），不指向本地目录。
- 备份：**没有实现**。HELP 内容里有一条「导出备份」场景，状态标【待开发】（`src/help/sceneData.ts:171-172`），`src/` 里没有任何备份落点或备份目录。
- 种子数据：**没有**外部种子文件（`rg --files-with-matches "seed"` 只命中内容资产里的文案）。

### 2.4 skill-home

**全部读取点（`rg -n "process\.env" packages/skill-home/src` → 3 处）**：

| 变量 | 读取位置 | 登记面 |
|---|---|---|
| `SKILLS_DB_PATH` | `src/fetch/paths.ts:10`、`src/cli/cmd_read.ts:47` | 有（`docs/env.md:9`、`:12`） |
| `HOME_FORCE_PROD` | `src/fetch/paths.ts:27` | 有（`docs/env.md:12`） |

**差集：无。**

**要点**：

- 库与库名：`DB_FILENAME = 'home.db'`（`src/fetch/paths.ts:7`）。
- HTML 产物目录：`HELP_HTML_DIR_NAME = 'home_manager_html'`（`src/help/manifest.ts:18`），**一段、无 `help/` 子层**（件头 `:13-14` 写明「目录名逐字保留，无 `help/` 子层」）；出口拼 `join(dbDir, HELP_HTML_DIR_NAME)`（`src/cli/cmd_read.ts:101`）。
- HELP 那条路**只 stat、不建库目录**：`dispatchHelp()` 只用只读出口 `resolveDbDir()`（`src/cli/cmd_read.ts:88`），件头 `:71-74` 明写不许走 `resolveDbPath()`（它自带 `mkdirSync`）。
- 种子数据：8 个顶级分类是**代码内联**（`src/fetch/db.ts:154-158` 按 `TOPS` 幂等插），不读外部文件。内容资产里那句 `data_source: env + db + seed_categories.yaml`（`src/help/scenarios.yaml:900`）是老 HELP 文案里的字符串，不是本仓读的路径。
- 照片：**没有照片目录这项配置**（`docs/env.md:12` 也写「照片变量不适用」）。照片是记录里的一列（`src/fetch/db.ts:18,73,113`），按物品／证件存，代码里没有任何解析照片目录的地方。
- 备份／导出／导入：**只有回执，没有落点**。`home.care.write` 的 `backup`／`export` 两支只回一句回执（`src/cli/cmd_read.ts:723-725`），`import`／`import-preview` 只回一句回执、不读 `file`（`:727-731`）；`backup-list` 直接返回常量一行（`:696-697`）。HELP 内容里对应的是一整组场景（`src/help/scenarios.yaml:927`、`src/help/helpAssets.ts:1012-1027`，承诺「备份（db+照片打包，保留 N 份）＋导出（JSON/CSV）」）。
- 跨技能出口：**没有**（全包无 `spawn`／`child_process`）。

### 2.5 skill-memo-ilife

**全部读取点（`rg -n "process\.env" packages/skill-memo-ilife/src` → 4 处）**：

| 变量 | 读取位置 | 登记面 |
|---|---|---|
| `SKILLS_DB_PATH` | `src/cli/cmd_read.ts:50` | 有（`docs/env.md:9`、`:16`） |
| `MEMO_MEDIA_DIR` | `src/policy/crud.ts:29` | **没有**（`docs/env.md:16` 只列 `SKILLS_DB_PATH`） |
| `LARK_CLI_PATH` | `src/fetch/feishu.ts:13` | 有（`docs/env.md:10`「作息/备忘录」行、`:16`） |
| `APPDATA` | `src/fetch/feishu.ts:19` | **没有** |

**差集：`MEMO_MEDIA_DIR`（生产要配的取值，且本包自己的 HELP 页把它当环境变量写明）＋ `APPDATA`（系统变量，见 §四）。**

**要点**：

- 库与库名：**只有一份文件库**，`join(dbDir, 'memo.db')`（`src/fetch/db.ts:50-52`）。打开前先 `stat`，不在即抛 `MEMO_DB_MISSING`，绝不让驱动建空库（`src/fetch/db.ts:6,61-66`）。
- **「目录型库」在本包不存在**：`<SKILLS_DB_PATH>/memo` 这个目录在实现里没有任何读写点，只有两处注释这么说（`src/cli/cmd_read.ts:69-71`、`src/help/helpFile.ts:138`），以及测试里「不建 memo 库目录」的断言（`test/cli-help-230.test.mjs:15,113,227-228`）。详见 §四第 2 条。
- HTML 产物目录：`HELP_HTML_DIR_NAME = 'memo_html'`（`src/help/manifest.ts:20`），**扁平、不加 `help/` 一层**（裁决 1，件头 `:4-5`）。三种交付共用这一处：HELP 全量（`src/cli/cmd_read.ts:178`）、速查表（`:165`）、整页交付（`:525` 经 `landingOf(dbPath, out.deliver.stem)`）。
- 附件目录：`MEMO_MEDIA_DIR` 缺省 `media`，**只作前缀**——校验附件路径以它开头并切掉前缀存相对路径（`src/policy/crud.ts:29-34`），不解析成真实目录、不校验文件在不在。
- 飞书 CLI 路径：显式 `LARK_CLI_PATH` 优先，不可用即抛；否则 `%APPDATA%/npm/lark-cli.cmd` → `where lark-cli` → `/usr/local/bin/lark-cli`、`/usr/bin/lark-cli`（`src/fetch/feishu.ts:12-38`）。
- 授权二维码落点：缺省 `join(tmpdir(), 'memo_feishu_qr')`，可被 `params.outDir` 覆盖（`src/fetch/auth.ts:50`；出口 `src/cli/cmd_read.ts:419`）；lark-cli 要求相对路径，故进目录执行后回绝对路径（`src/fetch/auth.ts:42-55`）。
- 备份：**没有**（`rg -n "备份|backup|restore" packages/skill-memo-ilife/src` 零命中）。
- 跨技能出口：**没有**（`spawn`／`child_process` 只用于 lark-cli）。

### 2.6 skill-schedule

**全部读取点（`rg -n "process\.env" packages/skill-schedule/src` → 5 处）**：

| 变量 | 读取位置 | 登记面 |
|---|---|---|
| `SKILLS_DB_PATH` | `src/fetch/paths.ts:10`、`src/cli/cmd_read.ts:47` | 有（`docs/env.md:9`、`:15`） |
| `SCHEDULE_FORCE_PROD` | `src/fetch/paths.ts:27` | 有（`docs/env.md:15`） |
| `LARK_CLI_PATH` | `src/fetch/feishu.ts:24` | 有（`docs/env.md:15`） |
| `APPDATA` | `src/fetch/feishu.ts:30` | **没有** |

**差集：`APPDATA`。**

**要点**：

- 库与库名：`DB_FILENAME = 'schedule_data.db'`（`src/fetch/paths.ts:7`）。
- HTML 产物目录：`HELP_HTML_DIR_PARTS = ['schedule_html','help']`（`src/help/helpPaths.ts:19`），落点 `join(resolve(dbDir), ...HELP_HTML_DIR_PARTS)`（`:28-30`），两级、递归创建。
- **HELP 那条路会建出数据目录**：`helpInitialized()` 走 `existsSync(resolveDbPath())`（`src/cli/cmd_read.ts:97`），而 `resolveDbPath()` 里有 `mkdirSync(dir, {recursive:true})`（`src/fetch/paths.ts:21`）。对照居家／大厨／备忘三家都绕开它。详见 §四第 1 条。
- 飞书 CLI 路径：与备忘同形（`src/fetch/feishu.ts:22-45`），另有主日历常量 `LARK_CALENDAR_ID = 'primary'` 与两个远端标记（`:16,18,20`）——那是协议常量，不是路径。
- 备份／照片／附件：**没有**（`备份|backup|restore` 与 `照片|图片|photo|image|附件` 在 `src/` 均零命中）。
- 跨技能出口：**没有**。
- 种子数据：`src/` 不读种子文件；`test/fixtures/t198-old-scenarios.json` 是测试夹具，不是运行时数据件。

## 三、六家共性与差异

### 3.1 六家同形、可以共用一套配置形状（12 项）

| 同形项 | 六家的共同形状 | 唯一差别 |
|---|---|---|
| 数据目录 | 都读 `SKILLS_DB_PATH`，缺即 exit 1（六家各自的 `fetch/paths.ts` 或预检，见 §一） | 无 |
| 库文件名 | 都是代码常量、都在 `fetch/paths.ts` 的 `DB_FILENAME`（备忘在 `fetch/db.ts:51` 内联） | 值不同：`calorie_data.db`／`biscuit_accountant.db`／`chef_data.db`／`home.db`／`memo.db`／`schedule_data.db` |
| HTML 产物目录 | 都是代码常量、都拼在库目录下 | 段数不同：备忘／居家／记账／卡路里**一段**；大厨／作息**两段**（多一层 `help/`） |
| 产物文件名主体 | 都是代码常量，HELP 一支 ＋ 速查一支分名 | 名字不同；卡路里有第三个（照片 HELP），备忘另有整页交付各页名 |
| 落盘管线 | 五家用共用件 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts`）：时间戳、同秒递补、独占写、绝对路径回执都在它里面 | 卡路里也用它（`src/output.ts:242`），但入口带一层自己的 `deliverHtml` 包装 |
| 包内页面模板目录 | 六家都是 `<包根>/templates` ＋ 运行时 `readFileSync` | 件数 6／16／8／21／6／8；都不该上设置页 |
| 写库隔离哨兵 | 五家有 `*_FORCE_PROD`（卡路里／记账／大厨／居家／作息） | 备忘**没有**（见 §四第 3 条） |
| 跨技能出口 | 只有卡路里有，且按包布局算（`landRunner.ts:47,55`） | 其余五家不调别家 CLI |
| 飞书 CLI | 只有作息与备忘两家读 `LARK_CLI_PATH`，寻找顺序逐字同形（显式 → `%APPDATA%/npm/lark-cli.cmd` → `where/which` → 固定路径） | 备忘另有授权二维码落点，作息没有 |

### 3.2 各家不同、必须分开的两处

1. **产物目录的层数**：备忘／居家／记账／卡路里是「库目录下的一级目录」，大厨／作息是「库目录下两级（`cook_html/help`、`schedule_html/help`）」。共用一套配置形状时，这一项要给「几段」而不是「一个目录名」，否则两家会落错地方。
2. **业务页有没有缺省落点**：卡路里有（`<库目录>/calorie_html/<中文命令>_<戳>.html`，`src/output.ts:220`），备忘整页交付有（`memo_html/<页名>.html`，`src/cli/cmd_read.ts:525`）；记账／大厨／居家／作息**没有**（只有显式 `--html`，`skill-bill/src/cli/cmd_read.ts:463-469`、`skill-chef/src/cli/cmd_read.ts:433-437`、`skill-home/src/cli/cmd_read.ts:787-790`、`skill-schedule/src/cli/cmd_read.ts:336-338`）。这一项不是「值不同」，是「有没有」。

### 3.3 查不到的（逐个排除，不猜）

- **库名不可配**：六家的库文件名都是代码常量，没有任何一家读环境变量／参数／配置文件来指定库名。
- **产物目录不可配**：同上，六家的产物目录名都是代码常量。
- **配置文件机制不存在**：`rg -n "config\.json|loadConfig|settings\.json" packages` 零命中（唯一命中是 `base-render/test-d/contract-signatures.ts:4` 的注释）。六家现在能配的只有环境变量。
- **大厨／居家／备忘／作息四家没有跨技能出口**，也没有别家 CLI 的路径常量。
- **大厨／记账／居家／卡路里不读 `LARK_CLI_PATH`**（与 t673 §1.2 的结论一致）：全仓读取点只有 `skill-schedule/src/fetch/feishu.ts:24` 与 `skill-memo-ilife/src/fetch/feishu.ts:13`。
- **只有卡路里有照片目录变量**；居家有 `photo` 列但按记录存（无目录配置），大厨只有 `photo_url` 字符串列。
- **只有记账有真备份**（目录 ＋ 备份名主体）；大厨的「导出备份」是【待开发】场景；居家有整组场景但代码只回回执；作息与备忘没有备份能力。
- **四家新查的都没有「种子数据文件」**：读写外部数据件的只有卡路里一家（训记动作库）；居家的 8 个顶级分类是代码内联（`skill-home/src/fetch/db.ts:154-158`）。

## 四、遗留

**1. 作息「看帮助」会把数据目录建出来，与其余三家的口径相反。**

- 出处：`packages/skill-schedule/src/cli/cmd_read.ts:97`（`existsSync(resolveDbPath())`）→ `packages/skill-schedule/src/fetch/paths.ts:20-23`（`resolveDbPath()` 里第一步就是 `mkdirSync(dir, { recursive: true })`）。对照件：`skill-home/src/cli/cmd_read.ts:71-74` 明写「算这条路径**不许**走 `resolveDbPath()`——它自带 `mkdirSync`」；大厨 `skill-chef/src/cli/cmd_read.ts:113-115`、备忘 `skill-memo-ilife/src/cli/cmd_read.ts:63-71` 同口径。
- 可达路径：`schedule.help.lookup` **不给 `q`** 那一支会走到 `helpInitialized()`（`src/cli/cmd_read.ts:122-129`，给 `q` 在 `:125` 提前返回）。
- 复现（读数两条，均为静态；本次未真跑，真跑会产出 HTML 文件，属本票禁跑范围）：
  - `rg -n "resolveDbPath\(\)" packages/skill-schedule/src/cli/cmd_read.ts` → 读数：`97:  try { return existsSync(resolveDbPath()); } catch { return false; }`
  - `rg -n "mkdirSync" packages/skill-schedule/src/fetch/paths.ts` → 读数：`21:  mkdirSync(dir, { recursive: true });`
- 现有测试为什么没红：`test/help-delivery-203.test.mjs:229-233` 用的是 `mkdtempSync` 造出来的**已存在**目录，`mkdirSync` 成了空操作，断言只看「没建 `schedule_data.db`」与「目录里只多 `schedule_html`」。要锁住本条得改成「`SKILLS_DB_PATH` 指向一个不存在的路径，跑完它仍不存在」。

**2. 备忘的初始化判据：注释说「库目录存在」，实现查的是 `memo.db` 文件；「目录型库」在本包不存在。**

- 注释：`packages/skill-memo-ilife/src/cli/cmd_read.ts:69-71`（逐字「新库是目录 `<SKILLS_DB_PATH>/memo`，不是老家的 `memo.db` 文件」）、`src/help/helpFile.ts:138`（同口径）。
- 实现：`src/cli/cmd_read.ts:131-132` 的 `existsSync(join(dbPath, 'memo.db'))`；真正的库也是文件 `memo.db`（`src/fetch/db.ts:50-52`），测试夹具同样建 `memo.db`（`test/helpers/memo-sqlite.mjs:11-14`）。
- 复现：
  - `rg -n "memo\.db" packages/skill-memo-ilife/src` → 读数：`src/fetch/db.ts:48,51`、`src/cli/cmd_read.ts:132`（三处都是文件口径）
  - `rg -n "join\(dir, 'memo'\)" packages/skill-memo-ilife` → 读数：只命中 `test/cli-help-230.test.mjs:113,228`（断言「**不**建 memo 库目录」），实现里零命中
- 影响：HELP 页那条「已初始化」横幅的判据与它自己的注释对不上；更实际的一层是——**任何按「目录型库」去写配置面板或预检的改动都会落空**，因为代码里没有那个目录。

**3. 备忘没有写库隔离哨兵，与 `docs/env.md:5` 写的全局口径不符。**

- `docs/env.md:5` 定的是「非 tmp 路径写库须显式置 1（opt-in）」；六家里五家都有（`CHEF_FORCE_PROD`／`HOME_FORCE_PROD`／`SCHEDULE_FORCE_PROD`／`CALORIE_FORCE_PROD`／`BILL_FORCE_PROD`，各自 `fetch/paths.ts` 里的 `assertWritablePath`），`docs/env.md:16` 把备忘录判成「写库哨兵不适用（无该变量）」。
- 但备忘录**是写库的**：`src/fetch/db.ts:182-190`（新增）、`:222`（更新）、`:230-233`（真删，须 `confirm:true`）。
- 复现：`rg -n "assertWritablePath|FORCE_PROD" packages/skill-memo-ilife` → 读数：**零命中**；对照 `rg -n "assertWritablePath" packages/skill-schedule/src` → 读数：`src/fetch/paths.ts:26` 有定义、`src/cli/cmd_read.ts` 里有用例。
- 这条不是「漏登记一个变量名」，是「全局口径与某一家不一致」，要一处裁定：给备忘录补哨兵，还是把它从全局口径里豁免（并写明理由）。

**4. `MEMO_MEDIA_DIR` 源码在读、`docs/env.md` 没登记，而本包自己的 HELP 页把它当环境变量宣传。**

- 读取点：`packages/skill-memo-ilife/src/policy/crud.ts:29`（缺省 `media`）；用途是**前缀校验**（`:30-34`）。
- 宣传面：`src/help/helpFile.ts:54` 的「环境变量」一行写的是 `SKILLS_DB_PATH / MEMO_MEDIA_DIR`。
- 登记面：`docs/env.md:16` 只列 `SKILLS_DB_PATH`。
- 复现：`rg -n "MEMO_MEDIA_DIR" packages/skill-memo-ilife` → 读数为 `src/policy/crud.ts:24,29` 与 `src/help/helpFile.ts:54`；再对照 `docs/env.md:16`。
- 附带一条口径问题：它只当字符串前缀用，**不是**「附件目录在哪」。若设置页要给它做一项，得先裁定「填目录还是填前缀」。

**5. `APPDATA` 被作息与备忘录两家读，`docs/env.md` 没登记。**

- 读取点：`packages/skill-schedule/src/fetch/feishu.ts:30`、`packages/skill-memo-ilife/src/fetch/feishu.ts:19`（都是飞书 CLI 的兜底候选目录 `%APPDATA%/npm/lark-cli.cmd`）。
- 复现：`rg -n "APPDATA" packages/skill-schedule/src packages/skill-memo-ilife/src` → 读数各 1 处；再对照 `docs/env.md:10`、`:15`、`:16`（三行都没列）。
- 它是系统变量、不是给人配的旋钮；登记面要不要收它需一处裁定（收＝登记表更全，不收＝写明「只读系统变量、不入登记」）。

**6. 居家的「备份导出／导入恢复」在 HELP 页有整组场景，代码只回一句回执。**

- 承诺面：`packages/skill-home/src/help/scenarios.yaml:927`（「备份(db+照片打包,保留 N 份)+ 导出(JSON/CSV)」）、`:931`（`data_source: db + photos`）；生成物同文在 `src/help/helpAssets.ts:1012-1027`。
- 实现面：`src/cli/cmd_read.ts:723-725`（`backup`／`export` 只 `return buildReceipt(...)`）、`:727-731`（`import`／`import-preview` 只回执、不读 `params.file`）、`:696-697`（`backup-list` 返回常量一行）。
- 复现：`rg -n "kind === 'backup'|import-preview" packages/skill-home/src/cli/cmd_read.ts` → 读数：`723-731` 那三支；再对照 `sed -n '925,935p' packages/skill-home/src/help/scenarios.yaml`（本次用 read 工具读到的同文）。
- 这一条对本次话题的意义：设置页要给居家做「备份目录」这项时，**现在没有可接的落点**，得先有实现。

**7. 三家插件取数桥不传 `env`、也不给 `ELECTRON_RUN_AS_NODE`，与另外三家不一致（插件侧，超出六家技能范围但在同一条路上）。**

- 出处：`packages/plugin-chef/src/bridge.ts:79-80`、`packages/plugin-home-ilife/src/bridge.ts:79-80`、`packages/plugin-schedule-ilife/src/bridge.ts:79-80` —— 三处都是 `const node = process.execPath;` ＋ `spawnSync(node, [...], { encoding: 'utf8' })`（没有 `env` 字段）。
- 对照：`packages/plugin-memo-ilife/src/bridge.ts:81-83,90-91`（`resolveNodeBin()` 给 `extraEnv: { ELECTRON_RUN_AS_NODE: '1' }`，`:91` 传 `env: { ...process.env, ...extraEnv }`）；卡路里与记账同形（t673 §0 记的 `packages/plugin-calorie/src/bridge.ts:174-177,187`、`packages/plugin-bill-ilife/src/bridge.ts:81-84,91`）。
- 复现：`rg -n "spawnSync" packages/plugin-chef/src/bridge.ts packages/plugin-home-ilife/src/bridge.ts packages/plugin-schedule-ilife/src/bridge.ts packages/plugin-memo-ilife/src/bridge.ts` → 读数：前三家各 1 处、都不带 `env`；备忘那处带 `env`。
- 影响：桌面宿主里 `process.execPath` 是 Electron 主程序。另外三家面板取数是否真跑得通，需要一次实机读数裁定（本次未开 GUI、未跑面板）。
- 与用户那个问题的关系：六家**都**继承宿主进程的环境块，所以「终端设了变量、Desktop 继承不到」不是这三家的 bug，而是宿主进程启动那一刻环境块就定了（t673 §五第 4 条已就卡路里记过同一因果）。
