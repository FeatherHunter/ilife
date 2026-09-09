# #97 · M5 写库回执契约落地 · 实施与验收证据（正本）

> 票：#97《M5 写库回执契约落地（id＋时间戳＋影响行数）》，地图 #63。
> 契约正本：`docs/research/t97-m5-contract.md`；探针：`docs/research/t97-probe-receipts.mjs`；
> 回归：`packages/skill-calorie/test/m5-receipt-97.test.mjs`。
> 基线：#101 已关闭（写链落库断言 15/15 ＋ 软删文案三档）；本票与之口径同源、**不改其任何文案**。
> **返修轮（两席审查指认）**：红队 `docs/research/t97-review-red.md`（`db45826`，PASS 87）／蓝队
> `docs/research/t97-review-blue.md`（`77789e80`，FAIL 77）；逐条闭环见 **§7.1**，门禁与机械对账见 **§6.1／§6.4**。

## 1. 交付物与 commit

| commit | 内容 |
|---|---|
| `4671169` | feat(97)：M5 契约字段落地（`receipt.ts` 追加 7 字段 ＋ `write.ts` 35 键逐键补齐 ＋ 探针） |
| `11be0c7` | test(97)：契约正本 ＋ 35 键四要素回归（40 用例）＋ 探针夹具修正 |
| `<本文件 commit>` | docs(97)：实施与验收证据正本（本文件）＋ 返修轮（R-1／R-2／R-3 ＋ S3 记账，见 §7.1） |

> 返修轮的 commit sha 由票面回贴记录（本文件随该提交入仓，sha 自指不可写死）。

改动文件（`git show --stat`）：

```
4671169  packages/skill-calorie/src/render/receipt.ts   | +85
         packages/skill-calorie/src/cli/write.ts        | 35 键逐键补 ids/idSource/writtenFields
         docs/research/t97-probe-receipts.mjs           | 新（35 键探针）
11be0c7  docs/research/t97-m5-contract.md               | 新（契约正本）
         docs/research/t97-probe-receipts.mjs           | 夹具修正
         packages/skill-calorie/test/m5-receipt-97.test.mjs | 新（40 用例）
返修轮    packages/skill-calorie/src/cli/write.ts        | R-1 goalSetWrittenFields ＋ R-3 water.log dupId
         packages/skill-calorie/test/m5-receipt-97.test.mjs | ＋4 独立判定用例（44）
         docs/research/t97-m5-contract.md               | §3.3／§3.4／§3.6 口径按实测修正
         docs/research/t97-impl.md                      | 表源更正＋归属注记＋门禁／对账声明
         docs/research/t97-gate-runs.log                | 新（受跟踪对账源）
         .changeset/t97-m5-receipt-contract.md          | 新（changeset）
```

## 2. 35 键逐键诊断（实现前「已有什么」→ 实现后「补了什么」）

**机读探针实现前 `RESULT: 0/35`**（`.scratch/t97/probe-before.log`，机读 `.scratch/t97/before.json`）：

| 四要素 | 实现前 | 实现后 |
|---|---|---|
| ① `id` | `recordId` **26 键非空／6 键 `null`**（`diet.batch`／`diet.copy`／`diet.remove-by-date`／`diet.remove-by-range`／`diet.remove-by-type`／`weight.batch`）；**无 `ids`／`idSource`** | 35/35：20 键 `record`／8 键 `singleton`／7 键 `condition`（＝旧版 `id=n/a` 等价物） |
| ② 时间戳 | **35/35 已具备**（`meta.actionAt`，格式 `YYYY-MM-DD HH:MM:SS`） | 不变（**不新增重复字段**） |
| ③ `影响 N 行` | **0/35**：仅以中文散文散落在 `summary`（如「已更新 X 条」），无结构化字段、无字面 `影响`、不可对账 | 35/35：`affectedRows`（SQLite `total_changes()` 增量）＋ `affectedRowsSource` ＋ `m5Line` 内字面 `影响 N 行` |
| ④ 写入字段摘要 | **0/35** | 35/35：`writtenFields`（create／update 非空；delete 空数组合规）＋ `m5Line` 内字面 `字段 …` |

逐键表（实现后机读实测，**真源 `.scratch/t97/after-final.json`**——由 `.scratch/t97/gen-table2.mjs:4` 读取生成；`date` 列即时间戳）：

| # | 写键 | op | 实现前 `recordId` | 实现后 id | 时间戳 `meta.actionAt` | `affectedRows` | `writtenFields` |
|---|---|---|---|---|---|---|---|
| 1 | `calorie.diet.add` | create | 3 | `id=3`（`record`） | 2026-09-09 21:22:36 | 1 | foodName／calories／protein／carbs／fat／grams／note／date／time |
| 2 | `calorie.diet.update` | update | 3 | `id=3`（`record`） | 2026-09-09 21:22:36 | 1 | grams |
| 3 | `calorie.diet.remove` | delete | 3 | `id=3`（`record`） | 2026-09-09 21:22:36 | 1 | —（delete） |
| 4 | `calorie.diet.batch` | create | `null` | `n/a`（`condition`） | 2026-09-09 21:22:37 | 1 | foodName／calories／protein／carbs／fat／grams／note／date／time |
| 5 | `calorie.diet.copy` | create | `null` | `n/a`（`condition`） | 2026-09-09 21:22:37 | 2 | foodName／calories／protein／carbs／fat／grams／note／date／time |
| 6 | `calorie.diet.update-by-date` | update | —（夹具未覆盖） | `n/a`（`condition`） | 2026-09-09 21:22:37 | 1 | note |
| 7 | `calorie.diet.remove-by-date` | delete | `null` | `n/a`（`condition`） | 2026-09-09 21:22:37 | 2 | —（delete） |
| 8 | `calorie.diet.remove-by-range` | delete | `null` | `n/a`（`condition`） | 2026-09-09 21:22:37 | 2 | —（delete） |
| 9 | `calorie.diet.remove-by-type` | delete | `null` | `n/a`（`condition`） | 2026-09-09 21:22:38 | 1 | —（delete） |
| 10 | `calorie.water.log` | create | 3 | `id=3`（`record`） | 2026-09-09 21:22:38 | 1 | ml／note／date／time |
| 11 | `calorie.weight.log` | create | 2 | `id=2`（`record`） | 2026-09-09 21:22:38 | 1 | kg／note／date／time |
| 12 | `calorie.weight.update` | update | 2 | `id=2`（`record`） | 2026-09-09 21:22:38 | 1 | kg |
| 13 | `calorie.weight.remove` | delete | 2 | `id=2`（`record`） | 2026-09-09 21:22:38 | 1 | —（delete） |
| 14 | `calorie.weight.batch` | create | `null` | `n/a`（`condition`） | 2026-09-09 21:22:38 | 1 | kg／date |
| 15 | `calorie.exercise.add` | create | 2 | `id=2`（`record`） | 2026-09-09 21:22:39 | 1 | type／calories／minutes／date／time／note／reps／category／difficulty／distance／heartRate／maxHeartRate／steps／setIndex／loadKg／backfill |
| 16 | `calorie.exercise.update` | update | 2 | `id=2`（`record`） | 2026-09-09 21:22:39 | 1 | minutes |
| 17 | `calorie.exercise.remove` | delete | 2 | `id=2`（`record`） | 2026-09-09 21:22:39 | 1 | is_deleted |
| 18 | `calorie.photo.add` | create | 1 | `id=1`（`record`） | 2026-09-09 21:22:39 | 1 | srcPaths／tag／note／date／time |
| 19 | `calorie.photo.remove` | delete | —（夹具未覆盖） | `id=1`（`record`） | 2026-09-09 21:22:39 | 1 | —（delete） |
| 20 | `calorie.photo.tag` | update | —（夹具未覆盖） | `id=1`（`record`） | 2026-09-09 21:22:39 | 1 | tag |
| 21 | `calorie.product.add` | create | 2 | `id=2`（`record`） | 2026-09-09 21:22:40 | 1 | productName／brand／calories／protein／fat／saturatedFat／carbohydrates／sugar／dietaryFiber／sodium／note |
| 22 | `calorie.product.update` | update | 2 | `id=2`（`record`） | 2026-09-09 21:22:40 | 1 | note |
| 23 | `calorie.product.deprecate` | update | 2 | `id=2`（`record`） | 2026-09-09 21:22:40 | 1 | is_deprecated |
| 24 | `calorie.profile.set` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:40 | 1 | age／gender／heightCm／activityLevel |
| 25 | `calorie.profile.update` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:40 | 1 | note |
| 26 | `calorie.profile.activity` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | activityLevel |
| 27 | `calorie.goal.set` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | calorie／protein／carbs／fat／water |
| 28 | `calorie.goal.water` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | water |
| 29 | `calorie.goal.weight` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | kg／deadline |
| 30 | `calorie.goal.pause` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | goal_paused |
| 31 | `calorie.goal.resume` | update | 1 | `id=1`（`singleton`） | 2026-09-09 21:22:41 | 1 | goal_paused |
| 32 | `calorie.body.composition-add` | create | 1 | `id=1`（`record`） | 2026-09-09 21:22:42 | 1 | date／source／bodyFatPct |
| 33 | `calorie.body.composition-remove` | delete | 1 | `id=1`（`record`） | 2026-09-09 21:22:42 | 1 | is_deprecated |
| 34 | `calorie.body.measure-add` | create | 1 | `id=1`（`record`） | 2026-09-09 21:22:42 | 1 | date／waistCm／hipCm |
| 35 | `calorie.body.measure-remove` | delete | 1 | `id=1`（`record`） | 2026-09-09 21:22:42 | 1 | is_deprecated |

> 说明：`实现前 recordId` 列中 `—（夹具未覆盖）`＝当轮探针夹具报错未取到（`diet.update-by-date`／`photo.remove`／`photo.tag`），已在实现后覆盖；
> 每键各起独立 tmp 库，故 id 在各行独立编号（同为 `3`／`1` 不代表同一行）。
>
> **表源更正 ＋ 归属注记（返修 R-3／蓝队 D-2）**：本节初版误引 `.scratch/t97/after2.json` 为表源；该文件
> `calorie.body.measure-add` 行的 `writtenFields` 实为 `["date","waist_cm","hip_cm"]`（**库列名**），与表中
> `waistCm／hipCm` 不符。**本表真源＝`.scratch/t97/after-final.json`**（`gen-table2.mjs:4` 逐字读取该文件生成），
> 该行实为 `["date","waistCm","hipCm"]`——即 `4671169` 该键输出库列名（违反正本 §3.4 CLI 名口径），
> **camelCase 修复由 #120 的 `4d98e5f` 落地**（`measureCliNames`，经共享 index 连带入该提交）；
> 依维护者裁定 `docs/research/t120-ruling-swept-commit.md`（`d915f89`）「连带提交他人代码不构成缺陷」，
> **不构成缺陷**（合并点已合规），此处只作归属注记。

## 3. 契约要点（正本 §3，摘要）

1. **四要素映射**：`id=<N>` → `recordId`／`ids`／`idSource`；`日期 <YYYY-MM-DD> <HH:MM:SS>` → 既有 `meta.actionAt`；
   `影响 N 行` → `affectedRows`；写入字段摘要 → `writtenFields`；旧版整行文本 → `m5Line`。
2. **只追加**：`CrudReceipt` 既有 10 字段（`scene`／`action`／`op`／`recordId`／`summary`／`items`／`tagDiff`／`distance`／`noChange`／`meta`）**一字未改、一个未删**；
   测试以冻结键集断言（`Object.keys(rc).sort()` 必须恰为 10＋7）。
3. **影响行数非自报**：来源＝SQLite `total_changes()` 在 `dispatchWrite` 内写库前后的**增量**（`write.ts:136`），
   35 键单一来源；测试用 `openDbReadOnly` 独立回读行数对账（硬删／条件批量／软删／下架／批量）。
4. **`idSource` 四值**：`record`（单条）／`singleton`（单例行表 `id=1`）／`condition`（旧版 `id=n/a`）／`none`（无写入且无 id）。
5. **`writtenFields` 口径**：CLI 参数名（camelCase）；create＝本次写入的 CLI 字段全集、**update＝本次实际被 SET 的列**（未进 SQL SET 列表的列不得出现）、delete＝`[]`；
   派生列／记账列（`weight_log.height_cm`／`bmi`、各表 `updated_at`）无 CLI 参数名，不入摘要；
   无 CLI 参数的标志位写用库列名（`is_deleted`／`is_deprecated`／`goal_paused`）。**返修 R-1 收紧口径**，见 §7.1。
6. **软删语义与 #101 同源**：本票**零文案改动**；`affectedRows` 计「被写行数」，与「是否仍计入统计」正交。
7. **`noChange` 与 `affectedRows` 不强制等价**：重复跳过＝0 行且字段摘要空；同值 UPDATE 仍计 1 行（SQLite 语义），
   而 `noChange` 取该键 #101 既有值（`weight.update` 实测 `false`）→ 二者不等价。**正本 §3.6 旧措辞已按实测修正**（返修 R-3／蓝队 D-4）。
8. **P9 不变**：stdout 恒一行 JSON；HTML 不在 M5 范围（`receiptHtml` 逐字未动）。

## 4. 实现落点（file:line）

| 落点 | 说明 |
|---|---|
| `src/render/receipt.ts:70` | `M5_CONTRACT = '1'` |
| `src/render/receipt.ts:80` | `M5IdSource` 四值 |
| `src/render/receipt.ts:82-92` | `M5Fields`（7 个追加字段） |
| `src/render/receipt.ts:103` | `m5LineOf`（旧版整行文本等价物） |
| `src/render/receipt.ts:114` | `buildM5`（缺值语义单一来源） |
| `src/render/receipt.ts:137` | `withM5`（只追加补丁；照片三回执复用） |
| `src/cli/write.ts:136` | `totalChanges(db)`＝`total_changes()` 增量 |
| `src/cli/write.ts:143` | `F`＝逐键写入字段全集常量（**返修 R-1 起不含 `goal`**，改由下一条派生） |
| `src/cli/write.ts:161` | `goalSetWrittenFields(hasWater)`＝`goal.set` **本次实际 SET 列** → CLI 名（返修 R-1） |
| `src/cli/write.ts:194` | `M5Patch` 类型 |
| `src/cli/write.ts:295` | `dispatchWrite` 统一注入 `affectedRows`（写库前后各取一次） |
| `src/cli/write.ts:337／465` | 重复跳过回传 `dupId`（`diet.add`／`water.log` 同口径，返修 R-3） |
| `src/cli/write.ts:671／682／710` | 照片三键经 `withM5` 追加（`render/photo.ts` 零改动） |

## 5. 测试与变异自证

**回归**（返修轮终态）：`node --test packages/skill-calorie/test/m5-receipt-97.test.mjs` → **44 pass／0 fail**
（runId `1772fb00-6cef-4c23-a519-d9442d0912fe`；`--test-concurrency=8` 压力轮 `c42fcf63-57fe-46dd-ae50-d7b12102f41d` 同 **44/44**）。
覆盖：35 键逐键四要素（`checkM5` 与探针同源）＋ 既有 10 字段零增删 ＋ P9 单行 JSON ＋
`affectedRows` 与只读句柄库真实行数对账 ＋ 重复跳过不虚报 ＋ `idSource` 三值覆盖 ＋
**返修轮 4 条独立判定用例**（红队 D-5 补位，**不 import 探针判定代码**）：

| 新用例 | 判什么 | 独立于探针处 |
|---|---|---|
| 「R-1：goal.set 的 writtenFields ＝ 本次实际 SET 列」 | 不传 `water` → 摘要恰 `calorie,protein,carbs,fat`；传 `water` → 追加；并只读回查 `water_goal`／`weight_goal`／`goal_deadline` 被 REPLACE 重置（→ #127） | 逐字手写期望 ＋ 只读句柄回查，覆盖**探针 SCENARIOS 不传 `water` 的那条路径**（探针场景恒传 `water`，故探针本身抓不到 R-1） |
| 「R-3：water.log 重复跳过回传原 id」 | `idSource='record'`／`ids=[dupId]`／`affectedRows=0`／`food_log` 行数不变 | 直接对第二写回执断言，探针只跑首写 |
| 「R-3：同值 UPDATE 实测 noChange=false／affectedRows=1」 | `weight.update` 同值 → `noChange=false`、`affectedRows=1`、摘要 `['kg']` | 探针无同值场景 |
| 「独立判定：四要素逐字对账」 | create／create-体重／条件批量删／软删 4 键的 `writtenFields`／`m5Line`／`affectedRows`／`idSource`／键集 | **完全不经** `checkM5`／`SCENARIOS` |

**变异自证（3 处 src 级；先备份 sha256 → 变异 → 红 → 还原 → sha256 一致 → 绿）**：

| 变异 | 位置 | 结果 | 还原 sha256 |
|---|---|---|---|
| **MUT-97-1** | `write.ts:138` `totalChanges` → `return 1;`（自报恒 1 行） | **红**：`tests 40／pass 39／fail 1`，失败项＝`#97 · affectedRows＝库真实行数（只读句柄独立复核，非自报）`（对账抓红） | `35E98EB9…A0C7` ✅ 与基线一致 |
| **MUT-97-2** | `receipt.ts:110` `m5LineOf` 丢掉 `\| 影响 N 行` 段 | **红**：`tests 40／pass 5／fail 35`，35 个「M5 四要素：<键>」全红 | `16EACC10…575A` ✅ 与基线一致 |
| **MUT-97-R1**（返修轮） | `write.ts:161` `goalSetWrittenFields` 恒列 `water`（＝返修前旧行为） | **红**：`tests 44／pass 43／fail 1`，唯一红项＝`#97 · R-1：goal.set 的 writtenFields ＝ 本次实际 SET 列（不传 water 不报 water）` | `C5FCD5FC680AD432860BE94BF84D2A71A9E47015D4F4251E22166DF1AFA5CC59` ✅ 与基线一致 |

变异日志：`.scratch/t97/mut1-test.log`／`mut2-test.log`／`repair-g8-mutation.log`（MUT-97-R1 单锁内
「变异→`tsc -b`→红 43/44→**立即还原**→sha256 一致→`tsc -b`→绿 44/44」，全程 `runId 2c2b4c5e-0082-458a-87e2-62203d823ef3` 持锁）。

## 6. 门禁实测

### 6.1 返修轮四门 ＋ 靶向 ＋ 探针 ＋ 变异（逐条 exit，均经 `node tooling/run-locked.mjs --ticket 97`）

| 门／运行 | 命令 | runId | waitedMs | exit |
|---|---|---|---|---|
| ① build | `pnpm build` | `6e345070-f2b1-45d6-b589-05155043c5d4` | 0 | **0** |
| ② boundaries | `pnpm boundaries` | `a7a719a0-c079-40c6-8987-143a11884588` | 0 | **0** |
| ③ snapshot:check | `pnpm snapshot:check` | `36512849-08ac-4521-9185-c6073597f857` | 0 | **0** |
| ④ publish:pre | `pnpm publish:pre` | `0c914811-736b-4d40-9ead-ae3dec897780` | 0 | **0** |
| 靶向回归 | `node --test packages/skill-calorie/test/m5-receipt-97.test.mjs` | `1772fb00-6cef-4c23-a519-d9442d0912fe` | 0 | **0**（44/44） |
| 靶向压力 | `node --test --test-concurrency=8 …/m5-receipt-97.test.mjs` | `c42fcf63-57fe-46dd-ae50-d7b12102f41d` | 0 | **0**（44/44） |
| 探针 | `node docs/research/t97-probe-receipts.mjs --json .scratch/t97/after-repair.json` | `24237609-07d2-47ac-ad6d-6cfd256a4a7c` | 0 | **0**（`RESULT: 35/35`） |
| 变异自证 | `node .scratch/t97/mut-r1.mjs` | `2c2b4c5e-0082-458a-87e2-62203d823ef3` | 0 | **0**（红 43/44 → 还原绿 44/44） |
| canonical | `pnpm test` | `5bc54987-0f73-4e09-b590-2db473eda08a` | 1 | **1**（基线既有红，见 §6.2） |

> 实现轮（`4671169`／`11be0c7`）的门禁表见 git 历史中本文件旧版（`13b85a96`／`eccf7446`／`6bc47ac2`／`b64b0862`／`2f278cc0`／`0d5f315a`／`b938348d`／`3b536393`），
> **不在本窗口、不再作为门禁证据引用**（返修 R-2／D-2）。返修轮日志：`.scratch/t97/repair-g1-build.log` … `repair-g9-canonical.log`。

### 6.2 canonical `pnpm test` 失败集 delta

- 运行：`pnpm test` → runId `5bc54987-0f73-4e09-b590-2db473eda08a`，**exit 1（既有基线红）**，`tests 1095／suites 131／pass 1070／fail 25`。
- 判据：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t97/repair-g9-canonical.log`
  → **`base=34 after=29 新增=0 消失=5`**（exit 0）。新增＝0 达标；消失 5 条为他票修复，不放宽任何口径。
- 白名单 `docs/research/t88-baseline/test-failset.txt` **零改动**（`git diff 93e27f9 -- …` = 0 行）。
- **他轮新增项登记（不援引）**：上一轮 canonical 曾出现「新增 3 条」＝`skill-home` suite 行 ＋ `落库·饮食` `0xC0000005`
  及其级联，已由编排者按 `docs/research/t88-delta-flake-ruling.md` §2／§5／§6 裁定为**环境／顺序污染**
  （干净重建后单独复跑 17/17、6/6 全绿）；**本 session 只登记，不自行援引第 1 条豁免**。本轮实测**新增=0**，无需豁免。

### 6.3 事故自检

- `git status --short` 仅含本票 5 个路径（＋他票未跟踪目录），**无 `Bin … -> …`**（`SKILL.md` 未零填充，＃124 未复现）。
- 变异残留扫描：`git diff --stat` 中 `src/cli/write.ts` 只有 R-1／R-3 两处业务改动；`MUT` 标记 0 命中（见 `.scratch/t97/repair-g8-mutation.log` 的 `RESTORED sha=… 与基线一致=true`）。

### 6.4 机械门禁对账声明（协议 §2.4）

对账窗口：`--ticket 97 --since 2026-09-09T13:54:30.000Z --until 2026-09-09T13:56:50.382Z`。
**窗口上界 `2026-09-09T13:56:50.382Z` ＝ 封窗导出快照头部自记的 `导出时间`**：封窗时先执行一次
`--export .scratch/t97/window-stamp.log`（窗口内 `scoped=9`），取其头部 `导出时间：2026-09-09T13:56:50.382Z`
作为 `--until`；最终对账源 `docs/research/t97-gate-runs.log` 头部 `until：2026-09-09T13:56:50.382Z` 与该值**逐字一致**。
窗口内 9 条 `RUN` 条目全部为本票返修轮的持锁运行；窗口之外（实现轮旧条目、以及本文件提交后的
`git add`／`git commit`）**不入声明**，也不参与反向对账。

GATE-RUN runId=6e345070-f2b1-45d6-b589-05155043c5d4 cmd=pnpm build
GATE-RUN runId=a7a719a0-c079-40c6-8987-143a11884588 cmd=pnpm boundaries
GATE-RUN runId=36512849-08ac-4521-9185-c6073597f857 cmd=pnpm snapshot:check
GATE-RUN runId=0c914811-736b-4d40-9ead-ae3dec897780 cmd=pnpm publish:pre
GATE-RUN runId=1772fb00-6cef-4c23-a519-d9442d0912fe cmd=node --test packages/skill-calorie/test/m5-receipt-97.test.mjs
GATE-RUN runId=c42fcf63-57fe-46dd-ae50-d7b12102f41d cmd=node --test --test-concurrency=8 packages/skill-calorie/test/m5-receipt-97.test.mjs
GATE-RUN runId=24237609-07d2-47ac-ad6d-6cfd256a4a7c cmd=node docs/research/t97-probe-receipts.mjs --json .scratch/t97/after-repair.json
GATE-RUN runId=2c2b4c5e-0082-458a-87e2-62203d823ef3 cmd=node .scratch/t97/mut-r1.mjs
GATE-RUN runId=5bc54987-0f73-4e09-b590-2db473eda08a cmd=pnpm test

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 的 exit 1 是**基线既有红**（本票判据为「具名失败集新增 0」，实测 `base=34 after=29 新增=0`），非本票引入、也不是本票验收门；其余 8 条均为 exit=0。

对账命令（**逐字复跑**）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t97-impl.md \
  --ticket 97 --since 2026-09-09T13:54:30.000Z --until 2026-09-09T13:56:50.382Z --allow-nonzero
```

实测输出（**exit 0**）：

```
RESULT: matched=9/9 auditEntries=241 scoped=9 undeclared=0
gate-audit: PASS
```

> `auditEntries` 是共享日志在复跑时刻的总条目数（并发下会继续增长）；`scoped`／`matched`／`undeclared`
> 由**固定窗口上界**决定，故复跑结果稳定。

导出命令（同窗口，一次性执行，已把窗口内 9 条 `RUN` 落入受 git 跟踪的对账源）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t97-impl.md \
  --ticket 97 --since 2026-09-09T13:54:30.000Z --until 2026-09-09T13:56:50.382Z --allow-nonzero \
  --export docs/research/t97-gate-runs.log
```

**R-2/D-2 闭环**：旧版证据**零** `GATE-RUN` 声明、也无受跟踪对账源 → `matched=0/0 undeclared=27`、exit 1。
现声明 9 条 ＋ 导出对账源，窗口上界写进声明（＝导出快照头部自记时间），故 `undeclared=0` 与命令**逐字绑定**，
不依赖「提交前执行」这类未写明的时序；提交后的 `git add`／`git commit`（`ticket=97`）落在窗口外，不影响结论。

### 6.5 并发上下文（返修轮）

- 返修轮窗口 `13:54:30–13:56:50Z` 内，审计日志另有 **`ticket=96`** 的 session 在跑（`#96` HTML 快照门），
  与本票 `ticket=97` 窗口**不交叠**（反向对账按票号过滤，见 §6.4 `undeclared=0`）。
- 本轮工作区无他票受跟踪 WIP（`git status --short` 仅本票 5 路径）；`waitedMs ≤ 1`（无锁竞争阻塞）。

### 6.6 实现轮自认过程缺陷（留痕，不撤销）

**陈旧 `dist/` 假红事件（自认 · 过程缺陷 S3）**：变异自证 MUT-97-1／97-2 各自 `pnpm build` 后，`dist/` 一度停留在变异产物上；本票测试（同全仓所有测试）走 `dist/`，
故 13:20:15Z／13:20:31Z 两轮单独复跑读到**变异 dist** 而假红（签名与 MUT 逐字一致：
`✖ #97 · affectedRows＝库真实行数…` ＋ `m5-receipt-97.test.mjs:154:12 actual: 0 expected: 1`，
见 `.scratch/t97/mut1-test.log`；MUT-97-2 则为 35 条 `M5 四要素` 全红，见 `mut2-test.log`）。
干净重建（`13b85a96`，13:21:05Z）后靶向＋3 次单独复跑全绿（实现轮旧表，见 git 历史中本文件旧版），故**非测试缺陷、非夹具顺序依赖**。
**纪律更正（返修轮已执行）**：每个变异后**立即还原并重建 `dist`** 再进下一步，不留到批末——
MUT-97-R1 全程单锁内「变异→重建→红→立即还原→重建→绿」，`.scratch/t97/repair-g8-mutation.log` 可核。

## 7. 偏离／未做／未确证

- **偏离 D-1**：`affectedRows` 取 SQLite `total_changes()` 增量，而非逐键自报 fetch 返回值。
  理由：单一来源＋可独立对账；实测 `INSERT OR REPLACE` 命中已有行计 1、`INSERT OR IGNORE` 命中已有行计 0（node:sqlite v24），与旧版 `rowcount` 语义一致。
- **偏离 D-2**：`writtenFields` 用 **CLI 参数名**而非库列名（标志位写例外用列名；派生列／记账列不入摘要）。
  理由：契约面是 CLI 一行 JSON；列名映射在 fetch 层，跨票改动风险高。**返修 R-1 后口径收紧为「本次实际 SET 列 ∩ CLI 名」**（正本 §3.4）。
- **偏离 D-3**：`ids` 对**条件／批量写**（7 键）为空数组 ＋ `idSource='condition'`，不额外 SELECT 反查被删行 id。
  理由：与旧版 `id=n/a` 逐字同口径（`calorie_tracker.py:732,759,802,814,826`）；反查会引入与 fetch 谓词重复维护的风险。
- **未做（范围外，记账）**：HTML 回执未加「影响 N 行」（M5 原文限 stdout）；`idSource` 未进 `SKILL.md`（文档同步归 #82／#98 类票）。
- **未确证**：真机（非 tmp 库）上 35 键的 `affectedRows` 未实测——本票全部证据在 tmp 隔离库（沿 #40／#101 先例，真库零触碰）。

### 7.1 返修轮逐条闭环（两席审查 `docs/research/t97-review-red.md` `db45826`／`t97-review-blue.md` `77789e80`）

| 指认 | 级 | 处置 | 落点／证据 |
|---|---|---|---|
| **R-1**（红队 D-1）`calorie.goal.set` 的 `writtenFields` 与正本 §3.4 不符 | S2 | **已修** | `write.ts:161` `goalSetWrittenFields(water !== undefined)`（由**本次实际 SET 列**派生）；`write.ts:796-811` 调用；用例「R-1：goal.set 的 writtenFields ＝ 本次实际 SET 列」 |
| **R-2**（红队 D-2／蓝队 D-1）证据零 `GATE-RUN` 声明 ＋ 无对账源 → `check-gate-audit` exit 1 | S2 | **已修** | §6.4 声明 ＋ `docs/research/t97-gate-runs.log` 导出；复跑 `matched=9/9 undeclared=0 exit 0` |
| **R-3**（蓝队 D-2）`t97-impl.md:38` 误引 `after2.json` | S2 | **已修** | §2 表源改引 `.scratch/t97/after-final.json`（`gen-table2.mjs:4`）＋ 归属注记 |
| **R-3**（蓝队 D-3）`water.log` 重复跳过硬编码 `none`／`[]`，与 `diet.add` 不一致 | S3 | **已修** | `write.ts:465` 回传 `dupId`；正本 §3.3 补注；用例「R-3：water.log 重复跳过回传原 id」 |
| **R-3**（蓝队 D-4）正本 §3.6「同值 UPDATE → `noChange=true`」实测不成立 | S3 | **已修文**（不改实现） | 正本 §3.6 按实测改写；用例「R-3：同值 UPDATE 实测 `noChange=false`／`affectedRows=1`」 |
| **红队 D-3** `F.weight` 不含 `bmi`／`height_cm`（fetch 实写） | S3 | **如实登记** | 二者为**派生列**（`fetch/weight.ts:52,74`：档案身高 ＋ kg 算出），无 CLI 参数名 → 按正本 §3.4「CLI 名口径」不入摘要；已写入正本 §3.4 与本文 §3 第 5 条（口径定义，非豁免） |
| **红队 D-5** 探针与回归共用 `checkM5`／`SCENARIOS` 同源判定 | S3 | **已补独立判定** | 新用例「独立判定：四要素逐字对账（不经 checkM5／SCENARIOS）」——4 键的 `writtenFields`／`m5Line`／`affectedRows`／`idSource` 全部**逐字手写期望**＋只读句柄回查 |
| **红队 D-6** 改已发布包源码／对外类型未加 changeset | S3 | **已补** | `.changeset/t97-m5-receipt-contract.md` |
| **红队 D-4**（＝蓝队附注）`goal.set` 经 `INSERT OR REPLACE` 静默重置未传列（用户可见数据丢失） | 范围外 | **转票 #127，本票不做** | 本票只让**回执如实反映本次 SET 列**（R-1）；用例把「未 SET 列被重置为 2000／NULL」钉成断言并标注 → #127 |
| **蓝队 D-5** canonical 新增 3 条（`skill-home` suite 行 ＋ `落库·饮食` `0xC0000005` 级联）／`run-locked.mjs` 无子进程超时 | 范围外 | **只登记，不援引** | 前者由编排者按 `t88-delta-flake-ruling.md` §2／§5／§6 裁定为**环境／顺序污染**（干净重建后单独复跑 17/17、6/6 全绿）；后者已由编排者处置。**本 session 不自行援引任何豁免** |

> **R-1 的边界（务必读）**：修正后摘要只列**本次 SQL 真正 SET 的列**；`goal.set` 用 `INSERT OR REPLACE`
> **整行重写**（未传列落默认／NULL）这一**实际行为缺陷**仍然存在，归 **#127**。若把「未 SET 列也算写入」
> 混进摘要，反而会把 #127 的缺陷包装成合规——故本票**不做 UPSERT 化**。

## 8. 风险 top3

1. **`total_changes()` 与未来事务化写库**：若 fetch 层将来引入显式 `ROLLBACK`，`total_changes` **不回退**（SQLite 语义），可能高报影响行数。
   缓解：测试对账口用只读句柄独立回读；引入事务的票需同步补「回滚后 affectedRows」用例。
2. **`writtenFields` 与 fetch 列名／SET 列表漂移**：create 键字段全集与 `goal.set` 的 SET 列判定都是 `write.ts` 内静态常量
   （`F`／`goalSetWrittenFields`），若 fetch 改 SQL 而常量未跟，摘要会漏项／多报（**R-1 正是此类漂移的实例**）。
   缓解：`cliNames`／`COL_CLI` 反查 ＋ 逐键断言 ＋ R-1 用例对「传/不传 `water`」两条 SQL 分别对账；
   根治需把常量改为从 fetch 导出（跨票所有权，建议随 #127 一并处理）。
3. **`goal.set` 的 `INSERT OR REPLACE` 数据丢失（#127）**：回执现已如实只列本次 SET 列，但**未传列的既有值仍会被重置**
   （`weight_goal`／`goal_deadline`／`goal_paused`／`start_weight`／`start_date`）。
   缓解：用例把重置事实钉成断言并标注 → #127；**关闭本票不等于该缺陷已修**，用户可见风险由 #127 承担。
4. **键集冻结断言过严**：`Object.keys(rc).sort()` 全等断言会让**未来票**新增回执字段时红。
   这是**有意为之**（只追加纪律的可执行化），但后续票需同步更新 `BASE_KEYS ＋ M5_KEYS` 清单；已在测试注释写明。
