# t673 卡路里与记账可配置项全量调查

调查范围：`packages/skill-calorie` 与 `packages/skill-bill` 两个技能包，以及承载它们技能设置页的 `packages/plugin-calorie`、`packages/plugin-bill-ilife`。只读调查，未改任何源码。

判定用的两个词按 `CONTEXT.md:18-27` 的定义：**技能设置页**＝爱生活页签条下每个页签里的那张表，调自家技能参数，不管干活；**技能功能页**＝sidebar槽里展开的干活区，查数调数都在这，不管配置。

一处口径：第二节「项名」按**一件事**算一项，同一件事的多个名字（如训记 KEY 的权威名与兼容名）不拆成多项。

现状（改动起点）：两个技能设置页各只有一行只读设置行，`SETTING_ROWS` 里只有 `enabled` 一个开关（`packages/plugin-calorie/src/settings.ts:18-20`、`packages/plugin-bill-ilife/src/settings.ts:18-20`），页面上除这行外还画一段状态读数与一行版本号（`packages/plugin-calorie/src/client.ts:306-330`）。取数走的接缝是 `spawnSync(node, …, env: {...process.env, ...extraEnv})`（`packages/plugin-calorie/src/bridge.ts:187`、`packages/plugin-bill-ilife/src/bridge.ts:91`），`extraEnv` 目前只承载 `ELECTRON_RUN_AS_NODE`（`plugin-calorie/src/bridge.ts:174-177`、`plugin-bill-ilife/src/bridge.ts:81-84`）。

## 一、环境变量逐项表

| 变量名 | 现在用在哪 | 缺了会怎样 | docs/env.md 有没有登记 | 出处 |
|---|---|---|---|---|
| 卡路里 · `SKILLS_DB_PATH` | 库目录解析的唯一入口；出口预检；取数／导入 CLI 开库；HTML 默认落点的父目录 | 抛「SKILLS_DB_PATH 未设置：拒绝隐式落盘」；出口预检 `fail(1,…)`，所有命令 exit 1 | 有（docs/env.md:9 全局行、:11 卡路里行） | `packages/skill-calorie/src/paths.ts:13`；`src/cli/readArgs.ts:20-21`；`src/output.ts:111-115` |
| 卡路里 · `CALORIE_FORCE_PROD` | 非系统临时目录写库的隔离哨兵 | 库不在 tmp 下就抛「拒绝写入非 tmp 路径」；只有字符串 `'1'` 放行，并在 stderr 打一行 | 有（docs/env.md:11） | `packages/skill-calorie/src/paths.ts:30-40` |
| 卡路里 · `CALORIE_PHOTOS_DIR` | 照片目录解析（读侧容忍缺省，写侧必填） | 读侧不报错、只是不校验照片文件在不在；GIF 页出「未配照片目录」；写侧抛「照片目录未配置」 | 有（docs/env.md:11） | `packages/skill-calorie/src/photo/dir.ts:15`；`src/photo/photos.ts:49-50`；`src/photo/gifDoc.ts:153` |
| 卡路里 · `CALORIE_TODAY` | 「今天」的唯一出处 `todayISO()`；包内基线脚本也写它 | 按机器时钟的 UTC 日；设了且形如 `YYYY-MM-DD` 就把相对窗口钉到那一天 | **没有** | `packages/skill-calorie/src/analysis/utils.ts:135-138`；`scripts/gen-photo-baseline.mjs:48` |
| 卡路里 · `XUNJI_TRAINS_KEY` | 训记 KEY 的权威名 | 回退读 `XUNJI_API_KEY`；两个都空则 `key status` 走 auth 档、推送与回写命令 exit 3「本地缺 KEY」 | **没有** | `packages/skill-calorie/src/xunji/key.ts:24,42-47,165-166`；`src/workout/xunjiPush.ts:141` |
| 卡路里 · `XUNJI_API_KEY` | 训记 KEY 的兼容名（老机器同序） | 权威名有值时不参与；权威名空且它也空＝没配 KEY | **没有** | `packages/skill-calorie/src/xunji/key.ts:25,43-46` |
| 卡路里 · `CALORIE_XUNJI_STUB` | 训记外调的挡板缝 | 真 spawn 训记 CLI（生产调用方永不设它） | **没有** | `packages/skill-calorie/src/workout/xunjiRunner.ts:28,70-77` |
| 卡路里 · `CALORIE_LAND_SCHEDULE_STUB`／`CALORIE_LAND_MEMO_STUB`／`CALORIE_LAND_PUSH_STUB`／`CALORIE_LAND_BACKFILL_STUB` | 落地训练四步的挡板缝（非空即不 spawn） | 真调作息／备忘统一出口与训记两条命令 | **没有** | `packages/skill-calorie/src/workout/landRunner.ts:31-34,137,148,156,166` |
| 卡路里 · `CALORIE_LAND_BATCH_FAIL_DATE` | 批量落地时点名某天造失败 | 不造失败，照常真跑 | **没有** | `packages/skill-calorie/src/workout/landBatch.ts:53,142-144` |
| 记账 · `SKILLS_DB_PATH` | 库目录解析；出口预检；HELP 产物落点；备份目录的父目录 | 出口预检 `fail(1,…)`；`resolveDbDir()` 抛「拒绝隐式落盘」 | 有（docs/env.md:9 全局行、:14 饼干行） | `packages/skill-bill/src/fetch/paths.ts:11-19`；`src/cli/cmd_read.ts:47-48,114,125,351,367` |
| 记账 · `BILL_FORCE_PROD` | 非系统临时目录写库的隔离哨兵 | 库不在 tmp 下就抛「拒绝写入非 tmp 路径」；出口把该错转成 exit 1 | 有（docs/env.md:14） | `packages/skill-bill/src/fetch/paths.ts:32-43`；`src/cli/cmd_read.ts:477-478` |
| 记账 · `BILL_TODAY` | 区间查「今天」锚点的第二档（显式 `today` 参数优先） | 按机器时钟的 UTC 日 | **没有** | `packages/skill-bill/src/query/read.ts:132-142` |

### 1.1 漏登记：源码读、docs/env.md 没写（10 项）

`CALORIE_TODAY`、`XUNJI_TRAINS_KEY`、`XUNJI_API_KEY`、`CALORIE_XUNJI_STUB`、`CALORIE_LAND_SCHEDULE_STUB`、`CALORIE_LAND_MEMO_STUB`、`CALORIE_LAND_PUSH_STUB`、`CALORIE_LAND_BACKFILL_STUB`、`CALORIE_LAND_BATCH_FAIL_DATE`、`BILL_TODAY`。

其中 `XUNJI_TRAINS_KEY`／`XUNJI_API_KEY` 不是测试挡板，是**真机生产要配的凭据**（`src/xunji/key.ts:1-14` 写清「只读环境变量，没有密钥文件」），漏登记的影响最大。

复现：`rg -n 'process\.env' D:\ilife\packages\skill-calorie\src D:\ilife\packages\skill-bill\src`（读数为 21 处 ＋ 4 处）。

### 1.2 登记了但源码没读

无。docs/env.md 里与这两包有关的四个变量名（`SKILLS_DB_PATH`、`CALORIE_FORCE_PROD`、`CALORIE_PHOTOS_DIR`、`BILL_FORCE_PROD`）在源码里都读到了（出处见上表）；同文档的 `lark-cli`／`LARK_CLI_PATH` 属作息与备忘录两行（docs/env.md:10,15），这两包一个都没有读——全仓 `LARK_CLI_PATH` 的读取点只有 `packages/skill-schedule/src/fetch/feishu.ts:24` 与 `packages/skill-memo-ilife/src/fetch/feishu.ts:13`，**卡路里与记账都不适用**。

### 1.3 只在测试或包内脚本里读的

| 变量名 | 读在哪 | 说明 |
|---|---|---|
| `DSH_BROWSER`、`LOCALAPPDATA` | `packages/skill-calorie/scripts/measure-responsive.mjs:162,165` | 包内测量脚本找浏览器，不在 `src` |
| `npm_node_execpath`、`PATH` | 例 `packages/skill-calorie/test/cli-smoke-t41.test.mjs:22`、`test/t361-measure-full-table.test.mjs:299-306` | 测试找 node／浏览器 |
| `CALORIE_LIVE_DB` | `packages/skill-calorie/test/goal-lock-256.test.mjs:58` | 测试里指真库做对照 |
| `FAKE_NOW_ISO` | `packages/skill-calorie/test/freeze-clock.cjs:14` | 测试冻结时钟 |
| `T386_MUT_TPL`、`T448_BASELINE`、`T374_BREAK`、`T267_MUT_PAGE`、`T478_MUT` | `test/analysis-accept-386.test.mjs:42`、`test/docpage-printable-448.test.mjs:34`、`test/home-lock-374.test.mjs:28`、`test/exercise-accept-267.test.mjs:46`、`test/exercise-id-entry-478.test.mjs:33` | 各测试件自己的变异开关 |

另：两包测试大量写 `env: { ...process.env, … }`（整表透传，不算读点），此处不计。

## 二、非环境变量可配置项逐项表

| 项名 | 现在住哪 | 值改了谁跟着变 | 出处 |
|---|---|---|---|
| 卡路里 · 库文件名 `calorie_data.db` | 代码常量 | `resolveDbPath()` 拼出的库文件；页面复制区里写死的库名 | `packages/skill-calorie/src/paths.ts:10,23-26`；`src/shared/copyArea.ts:180` |
| 卡路里 · HTML 产物目录名 `calorie_html` | 代码常量，拼在库目录下 | 所有默认交付落点与失败回执落点 | `packages/skill-calorie/src/output.ts:37,110-115,120-133,270-272` |
| 卡路里 · 照片 GIF 子目录 `gifs` | 代码常量 | GIF 产物落盘目录 | `packages/skill-calorie/src/photo/gifDoc.ts:68,161` |
| 卡路里 · 训记接口地址（upsert／fetch 两条） | 代码常量 | 推送与拉取的远端 | `packages/skill-calorie/src/xunji/upsert.ts:29`；`src/xunji/fetch.ts:26` |
| 卡路里 · 训记限频窗口（写 45 秒／读 full 30、light 15 秒） | 代码常量 | 推送前的等待量与拉取节流 | `packages/skill-calorie/src/xunji/rateLimit.ts:22-23,99-100`；`src/xunji/fetch.ts:28-29` |
| 卡路里 · 训记三份状态文件落点（`~/.mavis/xunji_push_rate.json`、`~/.mavis/xunji_bridge_rate.json`、`~/.mavis/xunji_bridge_sync_state.json`） | 代码函数按家目录拼 | 限频与同步状态的读写位置；**不在 `SKILLS_DB_PATH` 下** | `packages/skill-calorie/src/xunji/rateLimit.ts:26-28,91`；`src/xunji/fetch.ts:32-34`；`src/xunji/run-sync.ts:114-117` |
| 卡路里 · 训记动作库来源（包内预置件／机器路径／显式 `--catalog`） | 代码常量两档；预置数据件 `src/xunji/data/训记官方动作.json` | 计划编辑器与计划审计的动作名判定 | `packages/skill-calorie/src/xunji/catalog.ts:25-31`；`src/render/planEditorPort.ts:157-158,208-210`；`src/fetch/audit.ts:48-51` |
| 卡路里 · 跨技能出口路径（作息／备忘／训记三处 CLI 入口） | 代码按包安装布局算 | 落地训练四步能否调起 | `packages/skill-calorie/src/workout/landRunner.ts:44-58,139-140,150-151,161,171`；`src/workout/xunjiRunner.ts:38-44` |
| 卡路里 · 外部调用限时（训记 300 秒／落地 60 秒） | 代码常量 | 超时即 exit 4 | `packages/skill-calorie/src/workout/xunjiRunner.ts:24-25,79-82`；`src/workout/landRunner.ts:27-28,105-108` |
| 卡路里 · 回写默认天数 1 天 | 代码常量 | 拉训记实绩不带 `days` 时的窗口 | `packages/skill-calorie/src/xunji/backfill.ts:27-28`；`src/xunji/run.ts:263` |
| 卡路里 · 照片候选条数上限 20 | 代码常量 | 「查身材照」候选页出几条 | `packages/skill-calorie/src/photo/picker.ts:34,71` |
| 卡路里 · 单次取数超时缺省 30000 毫秒 | 代码常量 | `--timeout` 没给时的进程自杀点 | `packages/skill-calorie/src/cli/readArgs.ts:9,36,41-44` |
| 卡路里 · HELP 产物复用窗口缺省 24 小时 | 公共层常量，`--params reuseHours` 可改 | HELP 产物是否复用同一份 | `packages/base-render/src/output/saveHtml.ts:69,141`；`packages/skill-calorie/src/output.ts:205-212` |
| 卡路里 · 档案（身高／年龄／性别／活动量／备注） | 数据库 `user_profile` 单例行 | BMI／BMR／TDEE、活动量推荐、今日主页 | `packages/skill-calorie/src/schema.ts:78-82`；`src/fetch/profile.ts`；`src/profile/setup.ts:207-222` |
| 卡路里 · 每日目标默认行（热量 1800／蛋白 150／碳水 200／脂肪 60／饮水 2000） | 数据库 `daily_goal` 列缺省，无行时兜底插一行 | 今日主页与目标进度页的判定 | `packages/skill-calorie/src/schema.ts:28-35`；`src/goal/goalStore.ts:32-34` |
| 卡路里 · 训练计划配置（标题／版本／总周数／起始日） | 数据库 `workout_plan_config` | 「看计划概览」「看某天练什么」 | `packages/skill-calorie/src/schema.ts:60-64` |
| 卡路里 · 食品库行（品名／品牌／四宏量／来源） | 数据库 `nutrition_products`；导入走 `skill-calorie-fetch import <file>` | 查食品／食品库页与按食物名折算 | `packages/skill-calorie/src/schema.ts:51-59`；`src/fetch/cli.ts:42-51,177` |
| 记账 · 库文件名 `biscuit_accountant.db` | 代码常量 | 库文件路径 | `packages/skill-bill/src/fetch/paths.ts:7,21-24` |
| 记账 · 目标／预算／账户文件 `goals.json` | 代码常量 | 预算、储蓄目标、账户的读写 | `packages/skill-bill/src/fetch/paths.ts:8,26-29`；`src/fetch/db.ts:220-242`；`src/cli/cmd_read.ts:154` |
| 记账 · 备份目录 `<SKILLS_DB_PATH>/backups` 与备份名主体 `biscuit_<时间戳>.db` | 代码在出口里拼 | 备份与恢复读写的位置、恢复候选的排序 | `packages/skill-bill/src/cli/cmd_read.ts:350-373` |
| 记账 · HELP 产物目录名 `biscuit_accountant_html` | 代码常量 | HELP 文件与速查表的落盘位置 | `packages/skill-bill/src/render/helpPaths.ts:15-16`；`src/cli/cmd_read.ts:114,125` |
| 记账 · 业务页 HTML 落点 | **没有缺省落点**，只有 `--html` 显式路径 | 不给 `--html` 就没有产物文件（回执里也没有 `delivery` 字段） | `packages/skill-bill/src/cli/cmd_read.ts:463-469`；`src/output.ts:41-59` |
| 记账 · 分类三级树（支出 10 ＋ 收入 6 ＋ 专项 3） | 代码常量 | 记一笔的分类校验、统计与按分类查询 | `packages/skill-bill/src/policy/category.ts:5-8,27-44` |
| 记账 · 缺省账户／账本／币种（`''`／`生活`／`人民币`） | 代码常量 | 记一笔缺列时的落库值 | `packages/skill-bill/src/policy/category.ts:11,120-123` |
| 记账 · 缺省时刻 `12:00:00` | 代码常量 | 只给日期的记录落库时刻 | `packages/skill-bill/src/policy/category.ts:13-20,76,110-111` |
| 记账 · 转账三常量（`转账/转出`、`转账/转入`、账本 `转账`） | 代码常量 | 转账生成的两笔与统计过滤 | `packages/skill-bill/src/policy/accounts.ts:7-9` |
| 记账 · 预算／储蓄目标／账户数据 | `goals.json`（读写都在取数层） | 预算页、目标页、账户汇总 | `packages/skill-bill/src/fetch/db.ts:220-242`；`src/policy/goals.ts:14-36` |
| 记账 · 导入 CSV 路径 | 命令参数 `file`（唤醒词「导入」带 `needs:['file']`） | 逐行写入 `bills` | `packages/skill-bill/src/cli/cmd_read.ts:375-397`；`src/policy/wakewords.ts:120` |
| 记账 · 单次取数超时缺省 30000 毫秒 | 代码常量 | `--timeout` 没给时的进程自杀点 | `packages/skill-bill/src/cli/cmd_read.ts:38,414,441` |

查不到的（逐个排除，不猜）：这两包都**没有**时区设置（全仓 `src` 里没有读 `TZ` 的代码，也没有 `getTimezoneOffset`；日期一律 `toISOString()` 取 UTC 日）；都**没有**提醒设置（提醒是备忘录的能力，`packages/skill-memo-ilife`）；卡路里**没有**备份／恢复目录（全仓 0 个 restore／undo 入口，见 `src/shared/writeParts.ts:18` 与 `src/cli/write.ts:22`）；卡路里**没有**食品库的种子文件（包内唯一的 JSON 数据件是训记官方动作库，`src/**/*.json` 只命中一件）。

## 三、归属判定

判定口径：**配置**＝影响「这台机器上技能怎么跑」，改一次管很久，与某次干活无关；**使用**＝一次干活的入参或一条业务记录，随每次记录不同。凡判「使用」的都不该上技能设置页。

| 项名 | 判定 | 理由 |
|---|---|---|
| 卡路里 · `SKILLS_DB_PATH` | 配置 | 库在哪是部署参数，填错整个技能跑不起来（有争议，见四①） |
| 卡路里 · 库文件名 `calorie_data.db` | 配置 | 数据文件落点 |
| 卡路里 · HTML 产物目录名 `calorie_html` | 配置 | 产物落点 |
| 卡路里 · `CALORIE_PHOTOS_DIR` | 配置 | 照片目录落点，与库目录并列 |
| 卡路里 · 照片 GIF 子目录 `gifs` | 配置 | 产物落点，同上一条同族 |
| 卡路里 · 训记 KEY 两名 | 配置 | 外部凭据，一次配好长期有效 |
| 卡路里 · 训记状态文件落点（`~/.mavis` 三件） | 配置 | 落点参数；现在固定在家目录，与可配的库目录不一致 |
| 卡路里 · 训记动作库来源 | 配置 | 校验动作名用哪份库，是环境相关的取值 |
| 卡路里 · 跨技能出口路径 | 配置 | 装在哪台机器、包在哪，属环境 |
| 卡路里 · 外部调用限时（300 秒／60 秒） | 配置 | 机器与网络快慢不同，档位属环境 |
| 卡路里 · 回写默认天数 | 配置 | 缺省窗口，与具体某天的记录无关 |
| 卡路里 · 训记接口地址 | 使用 | 是服务方的协议常量，不是用户参数（有另一说，见四③） |
| 卡路里 · 训记限频窗口 | 使用 | 同上，改了只会自己撞限频 |
| 卡路里 · 照片候选条数上限 20 | 使用 | 一次取数的展示上限，随调用传参更合适 |
| 卡路里 · 单次取数超时 30000 毫秒 | 使用 | 命令自己的参数（`--timeout`） |
| 卡路里 · HELP 复用窗口 24 小时 | 使用 | 命令自己的参数（`reuseHours`） |
| 卡路里 · `CALORIE_FORCE_PROD` | 使用 | 测试隔离护栏，不是给用户配的东西 |
| 卡路里 · `CALORIE_TODAY` | 使用 | 演示与实拍用的日期钉，真实使用不设（有另一说，见四②） |
| 卡路里 · 五个挡板变量 | 使用 | 测试挡板缝，生产永不设 |
| 卡路里 · 档案（`user_profile`） | 使用 | 有「设置档案／改档案／设活动量」命令与结果页（有争议，见四④） |
| 卡路里 · 每日目标默认行（`daily_goal`） | 使用 | 有「定营养目标／定饮水目标／定体重目标」命令（同上） |
| 卡路里 · 训练计划配置（`workout_plan_config`） | 使用 | 有「定训练计划／落地训练」命令（同上） |
| 卡路里 · 食品库行 | 使用 | 有「存食品／改食品／批量导入食品」命令 |
| 记账 · `SKILLS_DB_PATH` | 配置 | 同卡路里那一行（有争议，见四①） |
| 记账 · 库文件名 `biscuit_accountant.db` | 配置 | 数据文件落点 |
| 记账 · `goals.json` | 配置 | 预算与账户的文件落点 |
| 记账 · 备份目录与备份名主体 | 配置 | 落点参数；备份都是自动命名，用户要定的是放哪 |
| 记账 · HELP 产物目录名 | 配置 | 产物落点 |
| 记账 · 业务页 HTML 落点 | 使用 | 命令自己的参数（`--html`），且现在没有缺省落点 |
| 记账 · 分类三级树 | 使用 | 是记账的业务口径，改它会改历史数据的分类判定（有争议，见四⑤） |
| 记账 · 缺省账户／账本／币种 | 使用 | 每条记录都可能不同，属记录内容（有争议，见四⑤） |
| 记账 · 缺省时刻 `12:00:00` | 使用 | 同上，一次记账一个时刻 |
| 记账 · 转账三常量 | 使用 | 业务口径，不是环境参数 |
| 记账 · 预算／储蓄目标／账户数据 | 使用 | 有「设定预算／设定目标／新增账户」命令与查询页（有争议，见四④） |
| 记账 · 导入 CSV 路径 | 使用 | 命令自己的参数 |
| 记账 · 单次取数超时 30000 毫秒 | 使用 | 命令自己的参数 |
| 记账 · `BILL_FORCE_PROD` | 使用 | 测试隔离护栏 |
| 记账 · `BILL_TODAY` | 使用 | 演示与实拍用的日期钉（有争议，见四②） |

按上表：**卡路里 11 项属配置，记账 5 项属配置**。

## 四、有争议

**① `SKILLS_DB_PATH` 该不该出现在单个技能的设置页**

- 该管：这是最该在设置页填的一项——没它两包的所有命令都 exit 1（`packages/skill-calorie/src/paths.ts:15-19`、`packages/skill-bill/src/fetch/paths.ts:12-18`），且它直接决定卡路里的照片目录、HTML 目录与记账的备份目录长在哪。
- 不该管：它是**全局单值**——同一份值被作息、备忘、居家、大厨一起读（`docs/env.md:9` 标为「全局」），卡路里页签改一下就把别人家的库路径一起改了；单技能设置页没有资格动跨技能的共用值。

**② `CALORIE_TODAY`／`BILL_TODAY` 该不该上设置页**

- 该管：演示、实拍快照与复跑都要把「今天」对到种子数据那一天（`docs/research/t81-seed.mjs` 的用法即此），设置页是它唯一能被人看见的地方。
- 不该管：两处注释都写明「真实使用**不设**该变量」（`skill-calorie/src/analysis/utils.ts:132-134`、`skill-bill/src/query/read.ts:132-135`），它是测试与演示的注入口；放到设置页等于多一条「把今天改掉」的口子，改完当天的记录会写错天。

**③ 训记接口地址与限频窗口该不该可配**

- 该管：接口地址是外部依赖的落点，本仓三份状态文件已经固定在家目录（`xunji/rateLimit.ts:27`、`xunji/fetch.ts:33`、`xunji/run-sync.ts:116`），同类东西要么都可配、要么都不可配；限频窗口在慢网机器上也不一定合适。
- 不该管：两条地址与三个窗口都是从服务方协议与老实现逐字抄来的常量（`xunji/upsert.ts:29`、`xunji/fetch.ts:26,28-29`、`xunji/rateLimit.ts:22-23`），改地址等于把用户引到别处，改窗口只会自己撞限频；协议常量不是用户参数。

**④ 档案／目标／预算／计划这批「业务默认值」算配置还是数据**

- 该管：它们确实是「自家技能参数」——身高、活动量系数、热量目标、总周数、月度预算，改一次管很长时间，符合设置页的用途，而且现在都得靠念唤醒词才能改。
- 不该管：它们同时是**业务记录**，有独立命令与整页结果（`calorie.profile.set`／`calorie.goal.set`／`calorie.goal.water`／`calorie.goal.weight`，见 `packages/skill-calorie/src/profile/commands.ts:16-19`、`src/goal/commands.ts:31-36`；记账的「设定预算／设定目标」是 `bill.goal.write` 的 `set-budget`／`set-saving`，见 `packages/skill-bill/src/policy/wakewords.ts:101-105`），进统计与页面；设置页再做一套就等于第二套入口，两处口径迟早走散。

**⑤ 记账的缺省账户／账本／币种、分类树、缺省时刻**

- 该管：一次配好省得每次记账都填；「我默认只用微信、账本叫生活」是很自然的部署参数。
- 不该管：这几样都是**记录的字段值**（`policy/category.ts:11,120-123`），每条记录本就可以不同；分类树还牵着历史数据的校验口径（`category.ts:27-44` 认不准就阻断），放上设置页等于把数据口径当环境参数管。

## 五、调查中发现的缺陷

**1. docs/env.md 承诺的逐包 doctor 检查没有实现。**

- 复现：`node tooling/skilllink.mjs doctor`
- 读数（本机）：exit 0，stdout 只有三行（`node 24.19.0 >= 22.13`、`SKILLS_DB_PATH 可写：D:\2Study\StudyNotes\.db`、`CLI 契约…`），stderr 一行 `WARN: lark-cli 未找到`，末行 `doctor: PASS`；**没有** `CALORIE_PHOTOS_DIR`／`CALORIE_FORCE_PROD`／`BILL_FORCE_PROD` 的任何一行。
- 出处：docs/env.md:11、:14 把这三个变量写成「缺失 warn／--strict fail」，而实现只跑 `checkNode()`＋`checkDb()`＋`checkLark()`（`tooling/skilllink.mjs:194-201`，三个函数分别在 `:22-32`、`:34-47`、`:49-60`）。
- 连带读数：`Select-String -Path D:\ilife\tooling\*.mjs -Pattern 'CALORIE_PHOTOS_DIR|CALORIE_FORCE_PROD|BILL_FORCE_PROD'` 零命中（同一次扫描只命中 `check-publish.mjs:158-159` 的训记动作库那两行）。

**2. 十个环境变量读取点没进 docs/env.md，登记面与实现面已经走散。**

- 复现：`rg -n 'process\.env' D:\ilife\packages\skill-calorie\src` ＋ `rg -n 'process\.env' D:\ilife\packages\skill-bill\src`；再与 `docs/env.md:11`、`:14` 两行对照。
- 读数：源码侧卡路里 21 处命中、记账 4 处命中；登记面这两包只列 4 个变量名。漏的十条逐项见 §1.1，其中训记 KEY 两名是真机生产凭据。

**3. 仓库根多出一个 0 字节 `NUL` 件，让仓级搜索直接失败。**

- 复现：`git -C D:\ilife status --short` → 末行 `?? NUL`；再跑 `rg 'LARK_CLI_PATH' D:\ilife` → `rg: D:\ilife\NUL: 函数不正确。 (os error 1)`，exit 2。
- 影响：任何「全仓搜一遍」的排查都会在这里断掉（本次调查的 env 全仓核对就是这么断的，改成分目录搜才跑通）。与本次两包无关，是工作区里的连带发现，未清理（不在本次写集内）。

**4. 训记 KEY 写进用户级环境后，对已经跑起来的宿主不生效。**

- 复现（源码读数，未在真机 GUI 复现）：`packages/skill-calorie/src/xunji/key.ts:106-111` 写的是 `[Environment]::SetEnvironmentVariable(<名>, $v, 'User')`，`:129` 只改**当前这个一次性 CLI 子进程**的环境表，页面回执自己写的是「已写入 X（用户级，新开终端生效）」（`key.ts:180-182`）。
- 为何够不着宿主：面板取数走 `spawnSync(..., env: {...process.env, ...extraEnv})`（`packages/plugin-calorie/src/bridge.ts:187`），`extraEnv` 只有 `ELECTRON_RUN_AS_NODE`（同件 `:174-177`）；宿主进程的环境块不变，Windows 上新写的用户级变量也不会自动进已运行进程。
- 结论（读数级）：`key set` 之后，同一次运行的面板链路仍会看到旧值／看不到 KEY，得重启宿主；这正是「设置页要配 KEY」这件事必须先解决的一处接缝。

**5. 面板的「今天」与技能的「今天」是两套口径。**

- 复现（源码读数）：面板客户端用本地日 `new Date()` 的 `getFullYear/getMonth/getDate`（`packages/plugin-calorie/src/client.ts:109-115`），并把它当参数传给取数（同件 `:199-203`）；技能侧 `todayISO()` 取的是 UTC 日（`packages/skill-calorie/src/analysis/utils.ts:135-139`）。
- 影响：跨零点前后两处会给出不同日期（东八区尤其明显），面板上那一行读数与技能命令算出来的「今天」可能差一天。判它是缺陷还是既成口径，需要一处裁定；本次只如实报读数。
