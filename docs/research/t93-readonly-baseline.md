# #93 只读取证路径与真实数据基线

- 票：#93（map #63「本体图」；`wayfinder:task`），面板侧数据缺口已移交 #64
- 取证日期：2026-09-09；仓 HEAD：`f3b6b7a`（master，工作区含 #78／#90 施工中改动）
- 可复跑脚本：`docs/research/t93-baseline.mjs`（从仓根 `node docs/research/t93-baseline.mjs`）
- 一句话结论：**取证有一条可复跑、零风险的只读基线了**——真库只被 sha256 读一次、复制一次；CLI 全程只读 `%TEMP%` 副本；三个历史日期 3/3 exit 0 且有真实值；六形取样逐条有 exit 与关键字段；真库前后 sha256／size／mtime 三件套全等（写操作 0 次）。

## 0 结论前置

| # | 结论 | 证据位置 |
|---|---|---|
| 1 | 环境口径：`SKILLS_DB_PATH` 必设无默认值；`CALORIE_PHOTOS_DIR` 可选。基线用**真库只读副本**，真库零写 | §1 |
| 2 | 历史日期：`2026-08-19`／`2026-08-18`／`2026-08-17` 三个日期 3/3 exit 0，`calorieGoal=1850`、`waterGoal=4000` | §2 |
| 3 | 六形取样：`stat`／`list`／`detail`／`analysis`／`receipt` 五形各有 exit 0 的最小命令；`fallback` 形 **CLI 注册表不可达**（77 键中 0 个） | §3 |
| 4 | 零风险自证：真库 sha256／size／mtime 前后全等；副本读键前后 sha256 不变；写键只碰一次性库且哈希对照变化 | §4 |
| 5 | 票面归属澄清逐条复核：7 条全部复核成立（含「#63 不需要面板证据」「历史日期不受今天为空影响」「面板写死今天归 #64」） | §5 |
| 6 | 待裁定：票面「验收」第二条要求 `openDbReadOnly` 落地，与本票被收窄后的范围（不碰 `packages/**`）冲突 | §6.1 |
| 7 | **裁定后已落地**：`openDbReadOnly`（窄面）＋ 8 用例全绿 ＋ 变异自证 ＋ 77 键回归 0 失败；接线补丁未落但已预验证 48/48 | §8 |

## 1 环境口径

### 1.1 两个变量怎么设

| 变量 | 必设 | 作用 | 缺失后果 |
|---|---|---|---|
| `SKILLS_DB_PATH` | **是**（无默认值） | DB **目录**；库文件名固定 `calorie_data.db`（`packages/skill-calorie/src/paths.ts` `DB_FILENAME`） | CLI 预检 `exit 1`：`ERR 1: SKILLS_DB_PATH 未设置（无默认值，必设）`（`cli/cmd_read.ts:74-76`） |
| `CALORIE_PHOTOS_DIR` | 否 | 照片**存在位**校验用（`fileExists`）；缺失记 `null`／`false`，不断言 | 读键正常；写键 `calorie.photo.add` 抛 `照片目录未配置：请传参或设置 CALORIE_PHOTOS_DIR` |

- 运行时要求：`node >= 22.13`（预检，本机 `v24.19.0`）；入口 `packages/skill-calorie/dist/cli/cmd_read.js`（`dist/` 不入 git，本次取证产物 sha256 前 32 位 `C73D2071217EFE9170273B32523ACDA7`；并发构建会改变该值，脚本每次运行都打印当前值）。
- **PowerShell 5.1 传参陷阱（实测）**：`--params '{"date":"2026-08-19"}'` 会被 PS 吃掉内层引号 → `ERR 2: --params 须为 JSON`。必须转义内层双引号：

```powershell
node packages\skill-calorie\dist\cli\cmd_read.js calorie.view.home --params '{\"date\":\"2026-08-19\"}'
```

### 1.2 真库 vs 副本：为什么用副本

- 真库（本机）：`D:\2Study\StudyNotes\.db\calorie_data.db`，3,072,000 B，`LastWriteTime = 2026-08-29 11:49:11.959 (+08:00)`，SHA256 `C1C94DBBA3EB575F18AE210E2CF894D0D63BD3E70542011BD0E890142F201D7C`（与 #69 报告登记值一致，说明真库自 8/29 起未变）。
- 读键走 `openDb`（`src/schema.ts:291-295`）：`new DatabaseSync(dbPath)` **以可写方式打开**，随后 `initDb` 执行建表 DDL ＋ 幂等迁移。实测在 schema 已最新的真库上**零字节变化**，但这不是长期保证（库 schema 落后时会真升级；罕见热日志恢复亦会写）。
- 因此本基线把「零写」做成**构造性保证**：CLI 的 `SKILLS_DB_PATH` 永远指向 `%TEMP%` 副本目录；真库只被哈希读取一次、复制一次，此后不再被任何进程打开。
- 照片目录同理：复制进 `%TEMP%`（65 文件 / 36,241,175 B），采样阶段完全不碰 `D:\2Study`。脚本对超过 512 MB 的照片目录退化为「不复制、只做 `existsSync` 存在性检查」并打印说明。
- 为什么不直接对真库跑：本票核心约束是「不得对真实 DB 做任何写操作」；副本方案让该约束不依赖「当前 schema 恰好最新」这一偶然事实。

### 1.3 最小可复跑片段

```powershell
# 1) 真值留痕（只读）
$RealDb = 'D:\2Study\StudyNotes\.db\calorie_data.db'
Get-FileHash $RealDb -Algorithm SHA256          # 记 pre

# 2) 副本（真库此后不再被打开）
$T = Join-Path $env:TEMP ('t93-ro-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $T | Out-Null
Copy-Item $RealDb (Join-Path $T 'calorie_data.db')

# 3) 只读采样（读键全部指向副本）
$env:SKILLS_DB_PATH = $T
node packages\skill-calorie\dist\cli\cmd_read.js calorie.view.home --params '{\"date\":\"2026-08-19\"}'
echo $LASTEXITCODE                               # 期望 0

# 4) 收尾：真库三件套复核（sha256/size/mtime 必须与第 1 步一致）
Get-FileHash $RealDb -Algorithm SHA256
```

> 一键版（含全部断言与自证）：`node docs/research/t93-baseline.mjs`（`--fixture` 为离线自造，不读真库）。

## 2 历史日期口径（3 个已验证「有真实数据」的日期）

命令统一为 `calorie.view.home`（`shape=stat`，面板 `DEFAULT_READ_KEY` 同键），DB 为真库只读副本：

```powershell
node packages\skill-calorie\dist\cli\cmd_read.js calorie.view.home --params '{\"date\":\"<日期>\"}'
```

| 日期 | exit | shape | `calorieGoal` | `waterGoal` | `intakeCal` | `entryCount` | `deficitToday` | `streakDays` | `loggedDays` |
|---|---|---|---|---|---|---|---|---|---|
| 2026-08-19 | 0 | stat | **1850** | 4000 | 1000 | 1 | 988 | 7 | 7 |
| 2026-08-18 | 0 | stat | **1850** | 4000 | 1840 | 2 | 148 | 7 | 7 |
| 2026-08-17 | 0 | stat | **1850** | 4000 | 2374 | 7 | −386 | 7 | 7 |

- `calorieGoal=1850` / `waterGoal=4000` 来自真库 `daily_goal` 行（`calorie_goal=1850, protein_goal=135, carbs_goal=170, fat_goal=70, water_goal=4000, weight_goal=69.9, goal_deadline=2026-10-30, goal_paused=1`），**不是**缺目标时的默认值 1800／2000。
- 真库 `food_log` 561 行，跨度 `2026-05-07 ~ 2026-08-19`；上表三日为最新三个有记录日。
- 「今天为空」不构成阻断：取证当日（2026-09-09）窗口 `2026-09-03 ~ 2026-09-09` 全空 → `exit 4 ERR 4: 无今日数据`；同期历史日期 3/3 `exit 0`（同一命令、同一副本，仅日期不同）。
- 脚本把上表 4 个字段（`calorieGoal`／`waterGoal`／`intakeCal`／`entryCount`）**冻结为期望值**：真库漂移即 `FAIL`，不静默通过。

## 3 取样清单（六形最小命令集）

| shape | 命令（`SKILLS_DB_PATH` 指向副本） | exit | 关键回执字段 |
|---|---|---|---|
| `stat` | `calorie.view.home --params '{\"date\":\"2026-08-19\"}'` | 0 | `version=0.1.0` `skill=calorie` `shape=stat` `key=calorie.view.home` `data.metrics.calorieGoal=1850`（16 个有限数值键） |
| `list` | `calorie.today --params '{\"date\":\"2026-08-19\"}'` | 0 | `shape=list` `data.total=1` `data.items[0]={id:3095,date:2026-08-19,time:12:30:00,food_name:盖浇饭,grams:550,calories:1000,...}` |
| `list` | `calorie.photo.list --params '{\"dateFrom\":\"2026-05-30\",\"dateTo\":\"2026-07-17\",\"limit\":500}'` | 0 | `data.total=22`、`fileExists=14/22`、`items[0].id=32` |
| `detail` | `calorie.photo.detail --params '{\"id\":32}'` | 0 | `shape=detail` `data.item={id:32,date:2026-07-17,photoPath:2026-07-17_002.png,tagList:[侧面]}` |
| `analysis` | `calorie.photo.gif --params '{\"tag\":\"正面\",\"dateFrom\":\"2026-05-30\",\"dateTo\":\"2026-07-17\"}'` | 0 | `shape=analysis` `data.summary="GIF 任务：标签 正面 共 12 张（2026-05-30 ~ 2026-07-17）· GIF 合成由外部按本任务描述执行，本渲染不碰二进制"` |
| `receipt` | `calorie.water.log --params '{\"ml\":300,\"date\":\"2026-08-19\"}'`（**只允许在一次性临时库上跑**） | 0 | `shape=receipt` `data.ok=true` `data.message="已记喝水 300 ml（2026-08-19 累计 300 ml）"` `data.receipt.recordId=3096` |
| `fallback` | **CLI 不可达**（见 §3.1） | — | 注册表 77 键中 `fallback` 键 0 个；缺数据走 `exit 4`；契约面由 `base-link-core` 覆盖 |

- 形状分布（`dist/cli/keys.js` 实读）：`stat 34`、`receipt 35`、`list 6`、`detail 1`、`analysis 1`，共 77 键。
- `receipt` 形只能由写键产生，因此它的取样库是**另一份一次性副本**（`wr/`），与只读副本 `ro/` 和真库都无关；脚本同时断言该库哈希**变了**（灵敏度对照）。
- `photo.list` 显式给 `dateFrom/dateTo`（不依赖默认 90 天滑动窗），否则输出会随「今天」漂移。
- `detail` 的 id 由 `photo.list` 首条动态取（不写死），避免 id 漂移导致假失败。

### 3.1 `fallback` 形：CLI 侧不可达（本票实测发现）

- `cli/cmd_read.ts` 的 envelope 装配是 `shape = calorieShapeFor(key)`（`:651`、`:670`），而 `cli/keys.ts` 的 `CALORIE_COMBOS` 里**没有任何** `shape: 'fallback'` 的键 → CLI 永远不会产出 `fallback` envelope。
- 缺数据（空窗／空库／无目标）走的是 `exit 4` + stderr `ERR 4: 取数失败（缺失阻断）：…`（`CalorieRenderError('missing-data')`，`:682-685`），不是 `fallback` 载荷。
- 契约面仍然成立（脚本内断言）：`base-link-core` 的 `createEnvelope({shape:'fallback', data:{reason,degraded:true}})` 造得出合法 fallback；缺 `degraded:true` 被 `assertShapeData` 拒绝。
- 结论：**取证里「六形全覆盖」只能覆盖 5 形 + fallback 的契约面**。是否需要给某个键显式降级（或新增降级键），见 §6.2。

## 4 零风险自证（全程只读）

| 探针 | 取证前 | 取证后 | 结论 |
|---|---|---|---|
| 真库 SHA256 | `C1C94DBBA3EB575F18AE210E2CF894D0D63BD3E70542011BD0E890142F201D7C` | 同左 | **未变** |
| 真库 size | 3,072,000 | 3,072,000 | **未变** |
| 真库 mtime | `2026-08-29 11:49:11.959` | `2026-08-29 11:49:11.959` | **未变** |
| 只读副本 SHA256（读键前后） | `C1C94DBBA3EB575F18AE…` | 同左 | **未变**（证明 `openDb` 的建表／迁移在本库上零字节变化） |
| 写键取样库 SHA256（写键前后） | `C1C94DBBA3EB575F18AE…` | `FCBB2B059BC565FC6F36…` | **变了**（灵敏度对照：探针有效，且写只发生在一次性库。后值为本次运行值，每次运行不同） |
| 真照片目录（顶层文件数） | 14 | 14 | **未变** |

- 写操作计数：**对真库 0 次**；对只读副本 0 次（读键）；对一次性写键库 1 次（`water.log`，进程结束即弃）。
- 脚本断言：`real-copy` 模式 **51/51 全绿**（exit 0）；`--fixture` 模式 **46/46 全绿**（exit 0）；两种模式连跑两次输出**逐字节相同**（报告里不打印会随库变化的哈希原值，只打印「相等／不等」＋稳定值）。
- `node:sqlite` 只读能力复核（票面实测项）：`new DatabaseSync(p,{readOnly:true})` 读通（`SELECT COUNT(*) FROM food_log` → 561）；`exec('CREATE TABLE …')` 被拒 `attempt to write a readonly database`；`{readOnly:true,timeout:2000}` 组合可用。

## 5 票面归属澄清逐条复核

| # | 票面原文 | 复核 | 复核方式（可复现） |
|---|---|---|---|
| 1 | #63 不需要面板证据；证据都是技能侧产物（CLI 输出、渲染出来的 HTML） | **成立** | `calorie.view.home --params '{\"date\":\"2026-08-19\"}' --html <路径>` → exit 0；stdout 只有一行 envelope；HTML 2492 B，以 `<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie"` 开头。全程无面板进程 |
| 2 | 实测 `view.home --params {"date":"2026-08-19"}` 能读到真实数据（`calorieGoal:1850`…） | **成立** | exit 0，`calorieGoal=1850`、`waterGoal=4000`、`intakeCal=1000`、`entryCount=1`；1850 为真库 `daily_goal` 自定义值（默认兜底是 1800） |
| 3 | 技能侧证据用历史日期即可，不受「今天为空」影响 | **成立** | 今日 `2026-09-09` → `exit 4 无今日数据（窗口 2026-09-03 ~ 2026-09-09 全空）`；同日历史日期 3/3 `exit 0` |
| 4 | 面板侧缺口归 #64：`plugin-calorie/src/client.ts` 写死 `{date: today}` | **成立**（属 #64，本票只读核对、未改） | `client.ts:149` 与 `client.ts:201` 均为 `const date = todayString();`，随后 `fetchRead(..., { date })` |
| 5 | `node:sqlite` 支持 `readOnly: true`，读通写拒；`{readOnly:true,timeout:2000}` 组合可用 | **成立** | 见 §4 最后一条 |
| 6 | 「openDb 必然写库」表述过头——它以可写方式打开并跑 `CREATE TABLE IF NOT EXISTS` ＋ 幂等迁移，但 schema 最新时零字节变化 | **成立** | 只读副本跑完全部读键后 sha256 不变（§4）；代码位置 `schema.ts:285-295` |
| 7 | 相邻发现：`schema.ts:292` 的 `new DatabaseSync(dbPath)` 未设 busy timeout（默认 0）；`{timeout:3000}` 被接受 | **成立** | `schema.ts:292` 原文 `const db = new DatabaseSync(dbPath);`；`new DatabaseSync(p,{timeout:3000})` 可开 |

## 6 已知限制／待裁定

### 6.1 票面「验收」第二条与本票范围冲突（**已裁定 → 见 §8**）

- 票面验收原文：「`openDbReadOnly` 落地：读键全部可用、不触发任何迁移、写入被拒。」
- 首次交付时本票被收窄为「只给取证提供一条可复现、零风险的只读基线」，且 `packages/skill-calorie/**` 正被 #90 施工、`packages/**` 属禁改区 → 当时未改任何源码，列为待裁定。
- **裁定结果**：编排者收回该限制的这部分，允许窄面改动（`src/db/**` ＋ `src/cli/cmd_read.ts` 只读路径 ＋ `test/**`）→ 已落地，见 §8。
- 补充事实：读键当前**已经**不触发有效迁移（副本 sha256 前后一致），所以「只读基线」不依赖 `openDbReadOnly` 即可用；`openDbReadOnly` 的价值在「他人库文件／只读介质／备份文件」这类**无法保证可写**的场景。

### 6.2 `fallback` 形无 CLI 出口（**已裁定：登记为观察项，不改实现**）

- 现状：77 键中 `fallback` 键 0 个，`fallback` 形只能由库层（`base-link-core`）构造。
- 影响：若下游（面板／跨包调用方）指望「缺数据时拿到 `fallback` 载荷」，实际拿到的是 `exit 4`。
- **裁定**：`fallback` 是 envelope 契约的合法形状，技能侧可以不产出；缺数据走 `exit 4 missing-data` 是既定口径（「缺失阻断不返空」）→ **不改实现**，仅登记为本票观察项。

### 6.3 基线的适用边界

- 冻结值会随真库变化而漂移：脚本设计为 `FAIL`（不静默通过），需人工确认是「数据变了」还是「口径坏了」。
- `detail`／`analysis` 两形依赖源库内有 `body_photos` 行（真库 22 行，`2026-05-30 ~ 2026-07-17`）；无照片的库在 `real-copy` 模式会失败，脚本提示改用 `--fixture`。
- `photo.list` 的 `fileExists=14/22` 是「真库有 22 行、磁盘只有 14 个顶层文件」的真实结果，**不是**基线缺陷。
- 未覆盖（属其它票）：35 个写键的完整行为（#40／#90）、HTML 视觉与内容正确性（#78／#105 尺）、面板双路对数（#64／#69）。
- 隐私口径：报告中的日期／热量／体重属维护者个人数据；脚本只输出聚合数值（不导出逐条明细），入仓文档保留口径与字段名。

### 6.4 顺带发现（不在本票范围，已转派编排者回贴 #69）

- #69 报告「演示 C」登记 `2026-08-19` 的 `intakeCal=1321、entryCount=2`；本次在**同哈希**真库上实测为 `1000 / 1`。`1321 = 1000 + 321`，正好等于 #69 自己造的 `T69Sentinel_321` 哨兵 → 该行数字含哨兵，非「纯真实数据」。编排者已认领：在 #69 票面回「数据订正」并在地图登记，本票不动 #69。

## 7 复跑方法

```powershell
# 真库只读副本基线（默认：D:\2Study\StudyNotes\.db 或 $env:SKILLS_DB_PATH 指向的目录）
node docs/research/t93-baseline.mjs

# 指定源库／照片目录
node docs/research/t93-baseline.mjs --db D:\2Study\StudyNotes\.db --photos D:\2Study\StudyNotes\.db\CalorieHub

# 离线自造（不读真库；临时库用写键种确定性数据）——CI／他人机器可复跑
node docs/research/t93-baseline.mjs --fixture

# 机器可读／落盘／保留临时目录
node docs/research/t93-baseline.mjs --json
node docs/research/t93-baseline.mjs --out docs/research/t93-baseline-report.txt
node docs/research/t93-baseline.mjs --keep
```

退出码：`0` 全绿；`1` 有断言失败（`FAIL` 行列出具体项）；`2` 用法／环境错误（缺构建产物、源库不存在）。

前置：`packages/skill-calorie/dist/cli/cmd_read.js` 存在（`dist/` 不入 git；如需重建走本包构建，本脚本只读产物、不改源码）。

## 8 `openDbReadOnly` 落地（票面验收第二条）与接线待办

> 编排者裁定：票面验收确实要求它落地，「不碰 `packages/**`」的约束是为保护 #78／#90 施工面而收回。允许改动面 = `src/db/**` ＋ `src/cli/cmd_read.ts`（只读路径最小 diff）＋ `test/**`；`src/render/**`／`src/triggers/**`／`packages/base-render/**` 仍禁改。

### 8.1 落地内容

- 新增 `packages/skill-calorie/src/db/readonly.ts`：`openDbReadOnly(dbPath)` = 存在性守卫 ＋ `new DatabaseSync(dbPath, { readOnly: true })`。**不建表、不跑迁移**；库文件不存在**直接抛**（只读路径不隐式建库）。
- `openDb`（`src/schema.ts:291-295`）**语义未改**：仍是可写打开 ＋ `initDb`（建表 ＋ 幂等迁移）。
- 新增 `packages/skill-calorie/test/db-readonly-93.test.mjs`（8 用例，tmp 隔离，真实 DB 零触碰）。

### 8.2 验收三条逐条自证

| 验收条 | 证据（实跑） |
|---|---|
| ① 读键全部可用 | 42 个读键在**只读句柄**上逐个 `dispatch`：38/42 成功；余 4 个是域内数据不足（`plan-wizard`=plan.weeks 必填、`goal-predict`／`predict`／`anomaly`=数据不足），且与可写句柄结果**逐字节相同**；核心 11 键（home／today／diet／weight／photo.list／photo.detail／photo.gif／help.lookup／history／library／profile）全绿 |
| ② 不触发迁移 | 空库只读打开后 `sqlite_master` 仍空、文件仍 0 字节；老 schema 库（仅 `entries` 表）只读打开后表集仍 `['entries']`、字节不变；对照 `openDb` 在同一路径仍建出 11 表 |
| ③ 写入被拒 | `CREATE TABLE`／`INSERT`／`DELETE`／`UPDATE` 一律抛 `readonly database`；被拒后库文件 sha256／size／mtime 不变 |

### 8.3 变异自证（把只读打开改回可写 → 断言必须红）

- 变异：`src/db/readonly.ts` 的 `{ readOnly: true }` → `{}`，`npx tsc -b packages/skill-calorie` 重建。
- 结果：`node --test --test-name-pattern="写入被拒" …` → **红**（`AssertionError: Missing expected exception`，exit 1）。
- 还原后重建 → 8/8 绿（exit 0）。

### 8.4 回归（写键路径零变化）

- `node docs/research/t81-exec-smoke.mjs`：exec 桶 **361 记录 / 77 键 / 非零 0**，exit 0（43 s）——读键 exit 0、写键行为不变。
- 本票改动为**纯新增**：`dist` 内没有任何模块 import `db/readonly.js`（接线未落，见 8.5），故 CLI 行为不可能改变；`openDb`／写键分发均未触碰。

### 8.5 接线：**未落**，补丁已预验证（待编排者执行）

- 未落原因（按编排者「若与 #90 冲突则只加函数与测试、不接线」）：`src/cli/cmd_read.ts` 是 #90 的活动文件——本轮开始时它已被另一 session 于 `2026-09-09 05:18:04` 覆盖回 HEAD（`git status` 已不含该文件），而 `src/render/index.ts` 导出的 `renderHelpLookupHtml` 当前**无人引用**（`src/cli/cmd_read.ts` 里已无 #90 接线痕迹）→ #90 必然还要回改该文件。为免互相覆盖，本轮不动它。
- 待应用补丁（3 处，`src/cli/cmd_read.ts`）：

```ts
// 1) 第 12 行
import { existsSync, writeFileSync } from 'node:fs';
// 2) 第 54 行附近（'./keys.js' 之后）
import { openDbReadOnly } from '../db/readonly.js';
// 3) 第 663 行
const dbFile = join(dbPath as string, DB_FILENAME);
// #93 · 读键只读打开（不建表/不迁移）；写键与「库文件不存在」保留原 openDb 建库语义。
const db = isCalorieWriteKey(o.key as string) || !existsSync(dbFile) ? openDb(dbFile) : openDbReadOnly(dbFile);
```

- 预验证（`.scratch/t93/wire-check.mjs`：把同一补丁打到 dist 副本，与仓内 dist 逐键对拍）：**48/48 键 exit ＋ stdout 完全一致**（42 读 ＋ 6 写；仅归一化回执里的秒级时间戳）；补丁生效对照：老 schema 库上仓内 CLI 迁移出 11 表、接线 CLI 仍 1 表 → 补丁确实生效而非空跑。
- 另一条待办（不在本轮允许清单）：`src/index.ts` 增 `export { openDbReadOnly } from './db/readonly.js';`，可选在 `package.json` 的 `exports` 增 `"./db": "./dist/db/readonly.js"`（对外可用）。当前测试按深路径 `../dist/db/readonly.js` 导入。
- 接线后需回归：本文件 8.2／8.4 两条重跑；另 `test/db-readonly-93.test.mjs` 的「CLI 读键在库文件缺失时仍按原语义建库」用例即守 `!existsSync` 分支。
