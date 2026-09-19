# #683 目标 `src/` 形状：7 个域目录与共用位（决定件）

- 票：[#683](https://github.com/FeatherHunter/ilife/issues/683) · 母图：[#681](https://github.com/FeatherHunter/ilife/issues/681) · 仓库：`D:\ilife`，branch `master`；成文日期 2026-09-18
- 性质：**决定件，零源码改动**。后续票（#684 域声明 · #685 页面装配 · #686 机器面 · #689 write 域 · #690 query 域 · #691 account 域 …）以本件为形状依据。
- 读数口径：**LF（只数 `\n`）**，与 `#682`／`packages/skill-bill/AGENTS.md` 同口径。本件读数＝**2026-09-18 复测当刻**：**86 件 ／ 12,268 LF**，**含工作区未提交件**（`src/health.ts`／`src/cli/health.ts` 是另一席在途的 #706 配置体检件，`git log` 里还没有它们）。读数会陈化——复审时以盘上为准，别拿本行的数当今天的数（#682 §1 记过这个坑）。
- 配套：**规则**（三类准入）住 `docs/adr/0003-一级目录三类准入.md`；本件只放**逐件归属与细则**。同一件事不写第二遍。

## 一 · 目标树（13 个一级目录 ＋ 3 个根件）

| 类 | 目录 | 一句身份 | 准入判据 |
|---|---|---|---|
| **域 · 7** | `write`（今天叫 `record`）· `query` · `analysis` · `goal` · `account` · `link` · `setup` | 一个域的自持件：命令声明、页、域声明 | 名字取自 HELP 一级分组；跨域只经对方 `index.ts` 门 |
| **共用位 · 2** | `fetch` · `shared` | 跨域复用件（库存取；页面块与命令声明类型） | 说得出两个域在用；写不出第二家的回它所属的域 |
| **外壳与机器面 · 4** | `cli` · `render` · `triggers` · `help` | 命令分派／页面交付／触发与路由派生件／HELP 交付面 | 没人「用」它，是出入口或派生件；每个留一句「为什么它不是域也不是共用位」 |
| **删 · 1** | ~~`policy`~~ | 一个盒子装 7 个域的口径 | 内容按 §三 散回 |

根件 **4 个不动**：`index.ts`（包门）· `config.ts` · `output.ts` · `health.ts`（配置体检的机器件：判据与文案住这里，不建目录、不写文件；`cli/health.ts` 只做出口包装）。

**本轮改判一件**：`render/` 从「共用位」移入第三类。实测它 8 件里只有 `views.ts` 过得了「两个域在用」（`query`＋`record`），其余是 `cli` 出整页必经——准入判据写成「**出整页必经** 或 ≥2 域在用」。

## 二 · 归属律（四条）

1. **只属于一个域** → 住那个域（`src/<域>/`）。
2. **说得出两个域在用** → 共用位（`src/shared/`）。
3. **说得清是外壳或派生件** → 第三类。
4. **三条都说不出的件不许存在。**

三条配套口径：

- **共用位里不出现域名**：需要的域相关取值由**域自报参数**传入（先例：`shared/pageShell.ts:22` 的域名→眉标表改成「域自报 `eyebrow`」，见 §六 守卫③）。
- **命名分工**：见 §四。
- **「谁在用」要可查**：件头手写的「谁在用（两个能力，指名）」清单，随搬迁改成机器可查的形式。

## 三 · 逐件归属表（86 件）

`判过` ＝ 需要人抽查的判断项；其余按律自动分档。

### 3.1 `cli/` 4 件 ／ 658 LF → 全留

| 件 | LF | 去向 | 依据 |
|---|---|---|---|
| `cmd_read.ts` | 501 | `cli/` | 外壳：命令分派 ＋ argv 装配。**超告警线（350）**，拆法＝按域拆分派，属「读命令迁移」后票（读数沿革 558→485→501） |
| `config.ts` | 84 | `cli/` | 外壳：环境与开关；配置命令（无唤醒词的设置面命令）住这里 |
| `health.ts` | 36 | `cli/` | 外壳：配置体检 `bill.config.check` 的出口包装（件头自述口径：那套登记管的是**唤醒词命令**，设置面专用的只读出口没有唤醒词、不进 HELP，故与配置命令并列） |
| `registry.ts` | 37 | `cli/` | 生成物（`scripts/gen-cli.mjs` 派生，勿手改） |

**一类新事实（记下来给守卫用）**：`cli/` 现在装**无唤醒词的设置面命令**（配置三件 ＋ 体检一件），它们不进 16 键表、不进 HELP、不算唤醒词计数——守卫④「每个域目录恰一件 `commands.ts`」不受影响，但「一条命令的事实只住一处」这条对它们同样成立（事实住 `cli/`，别在域里再声明一遍）。

### 3.2 `fetch/` 4 件 ／ 321 LF → 全留（共用位）

| 件 | LF | 去向 | 依据 |
|---|---|---|---|
| `db.ts` | 250 | `fetch/` | 实测消费者：`cli` `query` `record` `render` `shared` |
| `paths.ts` | 44 | `fetch/` | 库路径口径，被 `fetch` 与 `shared` 取 |
| `errors.ts` | 23 | `fetch/` | 错误码，被 `fetch` `policy` `query` `record` 取 |
| `index.ts` | 4 | `fetch/` | 门 |

### 3.3 `help/` 3 件 ／ 172 LF

| 件 | LF | 去向 | 依据 |
|---|---|---|---|
| `lookup.ts` | 55 | `help/` | SKILL 速查 77 行，全域件（不只 write） |
| `index.ts` | 2 | `help/` | 门 |
| `writeWire.ts` | 115 | **`write/`** `判过` | 只涉 write 域 16 词，件内即 `if (g.id !== 'write') continue` |

### 3.4 `policy/` 7 件 ／ 483 LF → 拆散／删除

| 件 | LF | 去向 | 依据 |
|---|---|---|---|
| `category.ts` | 125 | 拆成 `shared/category.ts`（分类表 ＋ 字段校验）＋ `shared/dateRange.ts`（日期函数）`判过` | 分类表与 `validateCategory` 已两域在用；日期函数跨 write／query／analysis |
| `record.ts` | 91 | 拆：写命令 params 校验 → `write/record.ts`；日期与时间窗口 → `shared/dateRange.ts` `判过` | 前半只被 `write` 用；后半被 `query/read.ts` 用，且 `#411` 就是按查询域搬进来的 |
| `analysis.ts` | 43 | `analysis/`（符号级：`parseOverviewKind`／`parseCompareKind`／`parseTrendKind`／`needMonth`／`needRange` ＋ 三个 kind 类型） | **今天唯一消费者是 `cli/cmd_read.ts:13-19` 的 analysis 分支**（未迁移命令的分派）；随命令搬迁改由该域门出 |
| `goals.ts` | 37 | `goal/`（`parseGoalOp`／`validateBudgetAmount`／`validateSetBudget`／`validateSetSaving` ＋ `GoalOp`） | 同上：今天消费者是 `cli/cmd_read.ts` 的 goal 分支 |
| `accounts.ts` | 33 | `account/`（`parseAccountOp`／`needName`／`validateTransfer` ＋ `TRANSFER_OUT_CATEGORY`／`TRANSFER_IN_CATEGORY`／`TRANSFER_LEDGER` 三个常量 ＋ `AccountOp`） | 同上：今天消费者是 `cli/cmd_read.ts` 的 account 分支 |
| `wakewords.ts` | 142 | **拆三段**（#684 执行） | ①词表事实（77 词→键／预设槽）→ 7 份域声明；②路由逻辑 `routeWakeword` ＋ 三个类型 `BillKey`／`WakeEntry`／`WakeRoute` → `triggers/`（类型唯一处，照卡路里 `src/triggers/routeSpec.ts`）；③这份手写表作废、由域声明派生。**「整表进 7 份域声明」不够**：类型与路由逻辑没有域能承接，原写法会把它们留成孤儿 `判过` |
| `index.ts` | 12 | **删**（barrel） | 桶文件是过渡期旧共用位 |

### 3.5 `query/` 5 件 ／ 727 LF → 全留

`commands.ts` 53 · `detail.ts` 148 · `index.ts` 22 · `list.ts` 189 · `read.ts` 315。

### 3.6 `record/` 25 件 ／ 5,104 LF → 全留，目录改名 `write/`

16 件场景件（`scene-*.ts` 22–319）＋ `collect` 31 · `collectBody` 226 · `commands` 34 · `index` 23 · `receipt` 24 · `receiptBody` 117 · `scene` 108 · `slots` 79 · `write` 227。

### 3.7 `render/` 8 件 ／ 548 LF

| 件 | LF | 去向 | 依据 |
|---|---|---|---|
| `envelope.ts` | 64 | `render/` | 出整页必经（envelope 契约） |
| `errors.ts` | 11 | `render/` | 同上 |
| `html.ts` | 70 | `render/` ＋ **就地摆正** | 删自家五字符 `escapeHtml` 副本、改引公共层 `base-paint`（包门已导出）；`query/detail.ts:1` 的深引随之消失。**红线：不得碰 `shared/writeParts.ts` 的三字符 `esc`**（#682 §4.A-5 A5-10） |
| `templates.ts` | 58 | `render/` | 出整页必经（16 key → 模板） |
| `index.ts` | 15 | `render/` | 门 |
| `helpFile.ts` | 185 | **`help/`** | HELP 交付面（Q3 已定 `help/` 立为非域目录） |
| `helpPaths.ts` | 20 | **`help/`** | HELP 落点常量 |
| `views.ts` | 125 | **拆散** `判过` | 见 3.9 |

### 3.8 `shared/` 25 件 ／ 2,645 LF

**留 `shared/` 6 件 ／ 553 LF**：`commandSpec.ts` 74（`cli`＋`query`＋`record` 三家）· `copyArea.ts` 159 · `pageIdentity.ts` 36 · `pageShell.ts` 65 · `writeParts.ts` 89（四件实测都是 write＋query：import 边 21／20／19／25 处）· `docPage.ts` 130（**写死留 `shared/`**，不再是待判项：实测唯一 importer 是 `pageShell`，而 `pageShell` 是两家在用的共用件——它是**共用件的底座**（文档装配与补丁 CSS 的唯一落点）。**不能**按「单消费者」把它搬到 `query/`：那会让两家在用的 `pageShell` 反向依赖一个域，直接违反守卫②/③。它件内那 7 处 `ilife-query-kv-*` 类名是历史命名，登记为债务，见 §七。）

**下沉 `write/` 19 件 ／ 2,092 LF**：`blockedSlots` 136 · `candidatePick` 147 · `collectFrame` 35 · `diffTable` 92 · `duplicateNote` 118 · `emptyNote` 39 · `flowSteps` 71 · `installmentPreview` 170 · `outsideScan` 138 · `photoEscape` 181 · `prefillNote` 93 · `receiptParts` 46 · `recentPicks` 66 · `recordPicker` 247 · `rowEditorTable` 138 · `summaryRow` 102 · `typeBadge` 80 · `userWording` 139 · `errorReceipt` 54 `判过`（只被 `blockedSlots` 用，随它回 `write/`）。

### 3.9 `render/views.ts`（125）拆分明细 `判过`

| 东西 | 去向 | 依据 |
|---|---|---|
| `calcKpi` ＋ **`isTransfer`** | `shared/kpi.ts` | 实测（token 扫描）今天消费者＝`query/list.ts` ＋ `query/read.ts`（同一个域）；`buildOverview`／`buildCompare` 内部调它也调它——那两件搬进 `analysis/` 后即成第二个域，两域判据在**同一次搬迁内**成立。`isTransfer`（转账不入收支）是文件级私有，被 `calcKpi`／`calcCategories`／`buildOverview`／`buildTrend` 四处用 ⇒ 切分后必须**跟 KPI 同住一件**（口径唯一处），`analysis/` 侧引用它，别各写一份 |
| `BillItem` ＋ `toBillItem` | **暂住 `query/`** | 实测今天三个出现点：`query/list.ts`、`query/read.ts`、`cli/cmd_read.ts`（查询域两条 ＋ 外壳一条，没有第二个域）；analysis 真要用明细行时按归属律上浮共用位 |
| `calcCategories` ＋ `buildOverview` ＋ `buildCompare` ＋ `buildTrend` | `analysis/` | 今天唯一消费者是 `cli/cmd_read.ts` 的 analysis 分支（未迁移命令的分派），迁移后由分析域自己的命令处理体消费；`calcCategories` 只被 `buildTrend` 用，随它走 |
| `buildRecordReceipt` | `write/` | 被 `record/write.ts:25` 取 |
| `buildGoalQuery` | `goal/` ／ `buildAccountQuery` | `account/` |
| `buildHelpItems` ＋ `HelpItem` | `help/` | HELP 现找 |

### 3.10 `triggers/` 1 件 ／ 986 LF → 留

`wake-assets.ts` 986：派生件（今天由仓外 payload 生成）。**超告警线**；形态随 #684「HELP 资产改从 7 份域声明派生」变薄。

### 3.11 根件 4 件 ／ 624 LF → 不动

`config.ts` 74 · `health.ts` 486（配置体检，票 #706；盘上未提交）· `index.ts` 4（包门）· `output.ts` 60。

### 3.12 新件（形状的一部分，执行在各自票）

`shared/category.ts`（从 `policy/category.ts` 来）· `shared/dateRange.ts`（从 `policy/category.ts` 的日期函数 ＋ `policy/record.ts` 的日期与时间窗口来）· `shared/kpi.ts`（从 `render/views.ts` 的 `calcKpi` 来）· `write/record.ts`（从 `policy/record.ts` 的写校验半来）· 7 份域声明（形状由 #684 定）。

## 四 · 命名与分工细则

**(a) 命名**

| 对象 | 取法 |
|---|---|
| 域目录名 | HELP 一级分组 id：`write` 写入 ／ `query` 查询 ／ `analysis` 分析 ／ `goal` 目标 ／ `account` 账户 ／ `link` 联动 ／ `setup` 开始使用 |
| 域内文件名 | HELP 场景 id 的 slug（老侧 `write_expense` → `expense`）——这是铁律四「下一级」的可执行版本 |
| 共用位与外壳件文件名 | 技术名（`commandSpec` · `docPage` · `envelope`）：它们不对应任何 HELP 组，**铁律四不适用** |

**(b) 分工**：`triggers/` ＝触发与路由的机器面（派生记录面 ＋ `routeWakeword` 这类查询逻辑）；`help/` ＝交付面（SKILL 速查 ＋ HELP 页装配 ＋ `bill.help.lookup` 声明）。照卡路里「声明住域、记录面住 `triggers/`」。

**(c) 同名不同物三条**（读本件前先建立对照）：

| 写法 | 是什么 | 不是什么 |
|---|---|---|
| `write` | 域名（HELP「写入」组） | 不是 `shared/commandSpec.ts:37` 的 `kind:'write'`（命令种类） |
| `analysis` | 域名（HELP「分析」组） | 不是 `shape:'analysis'`（envelope 页形状） |
| 目录旧名 `record` | 今天的目录名，改成 `write/` | 命令 key `bill.record.*` 六条**冻结不动**（跨技能契约） |

## 五 · 域内布局：先平铺 ＋ 触发条件

兄弟件同形：卡路里 10 个域全部平铺（`diet` 30 件／`workout` 29／`photo` 27；只有 `analysis` 带 1 个 `anomaly` 子目录）。本包 `write/` 下沉后 **43 件**，是全仓最大域，**仍平铺**；**触发条件**＝某域超 **50 件**，或出现两个明显变化频率族时，才在域内分层。

## 六 · 接缝（谁执行）与守卫（挂 #686）

| 事 | 归谁 |
|---|---|
| 目录改名 `record/`→`write/`、`shared/` 19＋2 件下沉、`policy/` 拆散与删除、`render/views.ts` 拆散、两处就地摆正 | **#689** |
| 域声明形状 ＋ 唤醒词表拆进 7 份声明 ＋ HELP 资产改派生 | **#684** |
| 页面装配深模块与页件最终形状（本件只定方向：域属 `build*` 回域） | **#685** |
| 机器守卫四条（白名单以本件为来源） | **#686** |

守卫**五条**：① 一级目录 ∈ 白名单，**只许删不许加**；② **域→域的每条 import 边，目标必须是对方的门**（`../<域>/index.js`），不许伸手进对方内部件；③ 共用位 ③a 不 import 域目录 · ③b 不出现域名作键／`ilife-<域名>-` 类名（冻结白名单只许变短）· ③c 不持有「域名→取值」表意（评审）；④ 每个域目录**至多**一件 `commands.ts`，且「承接执行的域各一件」——具体名单随 #684 的裁定冻结，#686 落门时读那处、**不自己猜**（`link/` 是否例外见 §八）；⑤ 包门（`src/index.ts`）的导出名集**只许变短**（照「包对外的公开接口只许收窄」）。

**三条实现纪律（#686 落门时照办，别自己发明）**：

- **import 边必须真解析**，不许用单行正则：本会话实测过——按单行 `import` 正则扫消费者会漏掉多行 import，直接导致两处读数写错（`calcKpi`／`toBillItem`）。用 TypeScript 编译器 API（或等价解析器）取模块图。
- **白名单／偏差清单只许由形状决定驱动变更**：增删一条必须同时改本文档或后续裁定；因为门红了就去改门＝拆闸（`docs/agents/命令登记纪律.md` §形状二 的同一条纪律）。
- **这条守卫不设行数门**：行数告警线是另一条（`packages/skill-bill/AGENTS.md` ＋ #686），两者别混。

**③ 的两截判据，以及为什么不能只按字面字符串查（对抗式走查实测）**：`shared/commandSpec.ts:37` 的 `kind: 'write'` 是**命令种类**不是域名；`account` 在别的件里是**账单字段名**（`params['account']`）。照字面查 7 个名字会把真共用件判红。所以判据拆成三截：

- **③a 机器**：共用位不 import 任何域目录。
- **③b 机器（冻结白名单、只许变短）**：共用位不出现 7 个名字**作键**、也不出现 `ilife-<域名>-` 前缀的类名。`kind:'write'` 不触发（键名是 `kind`）；`shared/pageShell.ts:22-24` 的眉标表在搬迁时改成域自报 `eyebrow` 并从白名单划掉；`shared/docPage.ts:89-96` 的 7 处 `ilife-query-kv-*` 暂列白名单（改名会改页面字节，不属搬迁票，见 §七）。
- **③c 评审**：不持有「域名→取值」的映射表（③b 查不到的表意，例如把域名塞进字符串拼接）。

**搬迁的耦合面（实测，执行票的写集要含这些，别只算 `src/`）**：

- **测试·第一条路径（走 `dist/<目录>/…` 深引，11 件）**：`frozen-blocks`（缺口块三件 ＋ `record/scene`）· `mobile-rework`（userWording／typeBadge／diffTable／summaryRow）· `shared-judgments`（recentPicks／flowSteps／installmentPreview／outsideScan／recordPicker）· `t469-guard-additions`（recentPicks／diffTable／prefillNote／recordPicker）· `user-wording` · `record-write` · `t409-wire` · `t411-query-skeleton`／`t412-record-today`／`t415-record-detail`／`wake-assets`（四件从 `policy/index` 取 `WAKE_TABLE`／`routeWakeword`）。
- **测试·第二条路径（走包门 `dist/index.js`，10 件）**：`fetch` · `frozen-blocks` · `help-file-145` · `policy`（一件取 9 个 policy 名字）· `record-write` · `render`（取 `calcKpi`／`buildOverview`／`buildTrend`）· `skill` · `t409-wire` · `t410-lock` · `t416-query-wiring`。两条路径有重叠，**别只按第一条算写集**。
- **包门自身**：`src/index.ts` 现在是四行 `export *`（`fetch`／`policy`／`render`／`help`）——删 `policy/` 必须重指，并按「包对外的公开接口只许收窄」办；收窄会牵动上面第二条路径的 10 件测试，属执行票写集。
- **既有边两处（都属 #684 的面）**：`src/triggers/wake-assets.ts:25` 真 import `../policy/wakewords.js`（`scripts/gen-wake-assets.mjs:161` 只是**产物模板里的那行文本**，不是盘上的 import）；`help/lookup.ts:2` 与 `help/writeWire.ts:17` 也从 `policy/index` 取 `WAKE_TABLE`／`routeWakeword`／`BillKey`。唤醒词表一动，这三处跟动。
- **不动**：`desktop-copy`／`t418-query-visual`（取 `shared/docPage`）与 `gen-cli.mjs`（取 `shared/commandSpec`）——`docPage` 与 `commandSpec` 都写死留共用位，路径不变。

## 七 · 不在本件内 · 债务登记

- **不在本件内**：命令的搬迁动作（各域自己的票）；域声明的形状与事实源（#684）；页面装配（#685）；本件**零源码改动**。
- **债务（只登记，不变更）**：
  - `render/html.ts` 仍自造 `SHARED_CSS`／`SHARED_HELPERS`（#682 §4.A-5 A5-11；未迁移命令路上的重复实作，归公共层迁移线）。
  - `render/templates.ts` 四条查询 key→老模板映射已不可达（#682 §4.A-3 A3-6）；`render/envelope.ts` 的 `TRANSITIONAL_KEY_SHAPES` 仍写死 **10 条**未迁移 key（#682 §4.B-3；退场条件＝每搬一条删一行，搬完从注册表全派生）。
  - `shared/docPage.ts:89-96` 的 7 处 `ilife-query-kv-*` 类名是历史命名（补丁 CSS 随查询域页带进来的）。**不在搬迁票里改名**——改类名会改页面字节，判据会从「逐字节相同」变成「顺手改版式」；归 #700（页面内重复的排版件合并）或 T4 一并定，改时按页面重出重冻办。守卫③b 先把它列白名单。
  - **5 件下沉件的件头注释与实测不符**：`shared/blockedSlots.ts`／`duplicateNote.ts`／`emptyNote.ts`／`prefillNote.ts`／`receiptParts.ts` 写着「第二个消费者：`src/query/`」，实测 query 侧**零** import（`copyArea`／`summaryRow`／`pageShell` 等经核**确有** query 消费者，不在其列）。下沉时同步清注释，否则 #686 的机器判据第一轮就和注释打架。
  - `packages/skill-bill/AGENTS.md` 两张表 21 条记数陈化（#682 §4.B-1 B1-5，归 #686 行数门）。

## 八 · 对抗式走查记录与一个开口（2026-09-18）

**核对通过的高风险项（差点改坏页面的一处）**：「就地摆正」改引公共层五字符转义**保字节不变**——公共层实体表与 bill 自家那份逐字符相同（`&`→`&amp;`／`<`→`&lt;`／`>`→`&gt;`／`"`→`&quot;`／`'`→`&#39;`；见 `packages/base-render/src/spec/controls.ts` 的 `ESCAPE_HTML_ENTITIES` 与 `src/render/html.ts:7`），且公共层包门确实导出它。红线侧同样成立：`src/shared/writeParts.ts:18-19` 明写三字符 `esc` 不得与五字符 `escapeHtml` 互换。

**本轮改掉的三处**：① 守卫③的判据从「字面字符串」改成「import 边」（原写法会把 `kind:'write'` 与字段名 `account` 误判成域名，见 §六）；② §三 3.9 的消费者读数按 token 扫描重新实测（`calcKpi`／`toBillItem` 的「两家在用」原写法不准，已逐点改成实测读数）；③ **§三 3.4 的唤醒词表那行原写「整表进 7 份域声明」不够**——实测表里还拴着路由逻辑 `routeWakeword` 与三个类型（`BillKey`／`WakeEntry`／`WakeRoute`），没有一个域能承接，照原写法会留成孤儿；已改成拆三段（词表→域声明、逻辑与类型→`triggers/`）。另补上 §六 的**搬迁耦合面清单**（11 件测试 ＋ 1 件生成器脚本），原表只算了 `src/`。

**一处执行注意（#689 做改名时）**：包门 `src/index.ts` 现在有 `export * from './policy/index.js'`——`policy/` 一删，包门要重指到新家；按「包对外的公开接口只许收窄」（结构纪律包门条）办，别顺手把 `export *` 原样复制过去。四件测试从 `../dist/index.js` 取 `WAKE_TABLE`／`routeWakeword`，收窄时它们要改到新家。

**独立席复核（同一次对抗式走查，另一席只读复核）合并结果**：7 条反例里 **5 条成立、1 条不成立、1 条要收窄**，都已按复核结果改完。

| 复核条目 | 判定 | 处置 |
|---|---|---|
| 漏了 `src/health.ts`／`src/cli/health.ts`，总读数错（实测 86 件／12,268 LF） | **成立** | §3.1 补第 4 件、§3.11 改 4 件、标题改 86 件、读数行加「含未提交件＋冻结时刻」 |
| `policy/index` 有 15 个符号被 `cli/cmd_read.ts` 取，表里没给接缝 | **成立**（但「无去向」不成立——15 个名字我逐条核过都有家） | §3.4 三行补符号级去向；§六 说明 `cmd_read` 的 `case` 随命令搬迁改引各域门 |
| `gen-wake-assets.mjs:161` 不是真 import（是产物模板文本），真 import 在 `src/triggers/wake-assets.ts:25` | **成立** | §六 两处并列写明，并把 `help/lookup.ts:2`／`help/writeWire.ts:17` 一并算进 #684 写集 |
| `docPage` 一行「不动」一行「`判过`」，同一件两种处置 | **成立**（是写法矛盾，不是归属错） | `docPage` 去 `判过`、写死留共用位并给理由（搬回 `query/` 会让两家在用的 `pageShell` 反向依赖一个域） |
| 守卫③改按 import 边后，`docPage` 的 `ilife-query-*` 类名／`pageShell` 的眉标表「零覆盖」，等于把准入线交给人工 | **成立** | 守卫③拆成 ③a 机器／③b 机器（冻结白名单只许变短）／③c 评审三截 |
| 7 件下沉件件头的「第二个消费者」注释过期 | **收窄** | 逐件复测后**只有 5 件**成立（`blockedSlots`／`duplicateNote`／`emptyNote`／`prefillNote`／`receiptParts`）；`copyArea`（query 3 处）／`summaryRow`（query 1 处）经核确有 query 消费者，不属过期 |
| `outsideScan` 与 `photoEscape` 的 LF 对调 | **不成立** | 逐件复测：`outsideScan`＝**138**、`photoEscape`＝**181**，原表正确（`query/detail.ts` 深引行号那条成立，已改 `:21`） |


**开口一件（本件不裁，交 #684）**：**`link/` 是否持 `commands.ts`**。
- 依据冲突：#681 写「`link` 域按 `non-exec` 收口：词保留路由 ＋ HELP，执行层不承接、不产 HTML、不计入缺口」；卡路里家法里 `kind:'non-exec'` 的记录**没有 key、没有 cli**（`packages/skill-calorie/src/triggers/routeSpec.ts` 的 `NonExecWakeRoute`）——非执行即无命令。可 bill 的契约把 `bill.link.submit` 当一条 key（形状 `receipt`），且 #682 记「收口是新意图、**当刻源码尚未落地**」（实测 `cli/cmd_read.ts` 的 `case 'bill.link.submit'` 仍在执行面，会返回一张回执并教你复制 prompt）。
- 两种读法：**(甲)** `link/` 持 `commands.ts`、`bill.link.submit` 保留可执行，`non-exec` 只指「不产 HTML／不写他库／不计缺口」⇒ 守卫④无例外、16 键契约不动；**(乙)** 真按卡路里的非执行桶办 ⇒ 该 key 退出 16 键、`link/` 只有域声明 ⇒ **会动 A2-1／A2-8 的「16 键不缩水」断言**，属跨票契约改动。
- 落点：**交 #684（T3）** 依 #681 的 non-exec 收口一并裁。本件把守卫④写成「除 T3 裁定为纯词域者外，每域恰一件」，白名单里点名 `link/` 为待定项。

## 九 · 出处

| 事实 | 出处 |
|---|---|
| 域与横切层并存的实况（卡路里 10 域 ＋ 5 横切 ＋ 3 例外） | #683 票面表 ＋ 当刻实测 |
| 一级目录读数与逐件 LF | 当刻实测（口径 `readFileSync(f,'utf8').split('\n').length - 1`） |
| 「谁在用」一栏 | 当刻实测 `src/**` 的 import 边 |
| 归属律与共用件判据 | `docs/agents/structure.md:64-71` |
| 命令事实住能力目录 | `docs/agents/命令登记纪律.md:8` |
| 规则级记录（三类准入） | `docs/adr/0003-一级目录三类准入.md` |
