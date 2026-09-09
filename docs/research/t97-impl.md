# #97 · M5 写库回执契约落地 · 实施与验收证据（正本）

> 票：#97《M5 写库回执契约落地（id＋时间戳＋影响行数）》，地图 #63。
> 契约正本：`docs/research/t97-m5-contract.md`；探针：`docs/research/t97-probe-receipts.mjs`；
> 回归：`packages/skill-calorie/test/m5-receipt-97.test.mjs`。
> 基线：#101 已关闭（写链落库断言 15/15 ＋ 软删文案三档）；本票与之口径同源、**不改其任何文案**。

## 1. 交付物与 commit

| commit | 内容 |
|---|---|
| `4671169` | feat(97)：M5 契约字段落地（`receipt.ts` 追加 7 字段 ＋ `write.ts` 35 键逐键补齐 ＋ 探针） |
| `11be0c7` | test(97)：契约正本 ＋ 35 键四要素回归（40 用例）＋ 探针夹具修正 |
| `<本文件 commit>` | docs(97)：实施与验收证据正本（本文件） |

改动文件（`git show --stat`）：

```
4671169  packages/skill-calorie/src/render/receipt.ts   | +85
         packages/skill-calorie/src/cli/write.ts        | 35 键逐键补 ids/idSource/writtenFields
         docs/research/t97-probe-receipts.mjs           | 新（35 键探针）
11be0c7  docs/research/t97-m5-contract.md               | 新（契约正本）
         docs/research/t97-probe-receipts.mjs           | 夹具修正
         packages/skill-calorie/test/m5-receipt-97.test.mjs | 新（40 用例）
```

## 2. 35 键逐键诊断（实现前「已有什么」→ 实现后「补了什么」）

**机读探针实现前 `RESULT: 0/35`**（`.scratch/t97/probe-before.log`，机读 `.scratch/t97/before.json`）：

| 四要素 | 实现前 | 实现后 |
|---|---|---|
| ① `id` | `recordId` **26 键非空／6 键 `null`**（`diet.batch`／`diet.copy`／`diet.remove-by-date`／`diet.remove-by-range`／`diet.remove-by-type`／`weight.batch`）；**无 `ids`／`idSource`** | 35/35：20 键 `record`／8 键 `singleton`／7 键 `condition`（＝旧版 `id=n/a` 等价物） |
| ② 时间戳 | **35/35 已具备**（`meta.actionAt`，格式 `YYYY-MM-DD HH:MM:SS`） | 不变（**不新增重复字段**） |
| ③ `影响 N 行` | **0/35**：仅以中文散文散落在 `summary`（如「已更新 X 条」），无结构化字段、无字面 `影响`、不可对账 | 35/35：`affectedRows`（SQLite `total_changes()` 增量）＋ `affectedRowsSource` ＋ `m5Line` 内字面 `影响 N 行` |
| ④ 写入字段摘要 | **0/35** | 35/35：`writtenFields`（create／update 非空；delete 空数组合规）＋ `m5Line` 内字面 `字段 …` |

逐键表（实现后机读实测，`.scratch/t97/after2.json`；`date` 列即时间戳）：

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

## 3. 契约要点（正本 §3，摘要）

1. **四要素映射**：`id=<N>` → `recordId`／`ids`／`idSource`；`日期 <YYYY-MM-DD> <HH:MM:SS>` → 既有 `meta.actionAt`；
   `影响 N 行` → `affectedRows`；写入字段摘要 → `writtenFields`；旧版整行文本 → `m5Line`。
2. **只追加**：`CrudReceipt` 既有 10 字段（`scene`／`action`／`op`／`recordId`／`summary`／`items`／`tagDiff`／`distance`／`noChange`／`meta`）**一字未改、一个未删**；
   测试以冻结键集断言（`Object.keys(rc).sort()` 必须恰为 10＋7）。
3. **影响行数非自报**：来源＝SQLite `total_changes()` 在 `dispatchWrite` 内写库前后的**增量**（`write.ts:136`），
   35 键单一来源；测试用 `openDbReadOnly` 独立回读行数对账（硬删／条件批量／软删／下架／批量）。
4. **`idSource` 四值**：`record`（单条）／`singleton`（单例行表 `id=1`）／`condition`（旧版 `id=n/a`）／`none`（无写入且无 id）。
5. **`writtenFields` 口径**：CLI 参数名（camelCase），create＝写入字段全集、update＝本次实际变更字段、delete＝`[]`；
   无 CLI 参数的标志位写用库列名（`is_deleted`／`is_deprecated`／`goal_paused`）。
6. **软删语义与 #101 同源**：本票**零文案改动**；`affectedRows` 计「被写行数」，与「是否仍计入统计」正交。
7. **`noChange` 与 `affectedRows` 不强制等价**：重复跳过＝0 行且字段摘要空；同值 UPDATE 仍计 1 行（SQLite 语义）。
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
| `src/cli/write.ts:143` | `F`＝逐键写入字段全集常量 |
| `src/cli/write.ts:184` | `M5Patch` 类型 |
| `src/cli/write.ts:285-292` | `dispatchWrite` 统一注入 `affectedRows`（写库前后各取一次） |
| `src/cli/write.ts:656／667／695` | 照片三键经 `withM5` 追加（`render/photo.ts` 零改动） |

## 5. 测试与变异自证

**回归**：`node --test packages/skill-calorie/test/m5-receipt-97.test.mjs` → **40 pass／0 fail**（runId `e28f7e88-e012-4267-994a-f4bf36f72869`）。
覆盖：35 键逐键四要素（`checkM5` 与探针同源）＋ 既有 10 字段零增删 ＋ P9 单行 JSON ＋
`affectedRows` 与只读句柄库真实行数对账 ＋ 重复跳过不虚报 ＋ `idSource` 三值覆盖。

**变异自证（2 处 src 级；先备份 sha256 → 变异 → 红 → 还原 → sha256 一致 → 绿）**：

| 变异 | 位置 | 结果 | 还原 sha256 |
|---|---|---|---|
| **MUT-97-1** | `write.ts:138` `totalChanges` → `return 1;`（自报恒 1 行） | **红**：`tests 40／pass 39／fail 1`，失败项＝`#97 · affectedRows＝库真实行数（只读句柄独立复核，非自报）`（对账抓红） | `35E98EB9…A0C7` ✅ 与基线一致 |
| **MUT-97-2** | `receipt.ts:110` `m5LineOf` 丢掉 `\| 影响 N 行` 段 | **红**：`tests 40／pass 5／fail 35`，35 个「M5 四要素：<键>」全红 | `16EACC10…575A` ✅ 与基线一致 |

变异日志：`.scratch/t97/mut1-test.log`／`mut2-test.log`；还原后绿：见 §6 门禁实测的靶向测试行。

## 6. 门禁实测

**四门（逐条 exit 0，均经持锁包装器 `tooling/run-locked.mjs --ticket 97`）**：

| 门 | 命令 | runId | waitedMs | exit |
|---|---|---|---|---|
| ① build | `pnpm build` | `13b85a96-d05e-402e-ab3f-69b75554f7e3` | 80065 | **0** |
| ② boundaries | `pnpm boundaries` | `eccf7446-cb0f-46e6-84ec-d3c07308df35` | 0 | **0** |
| ③ snapshot:check | `pnpm snapshot:check` | `6bc47ac2-1c82-4ac6-914f-2836e4b138b9` | 1 | **0** |
| ④ publish:pre | `pnpm publish:pre` | `b64b0862-16be-4ee3-bb58-baf5af7ae86f` | 1 | **0** |

**靶向回归**（同一干净重建后，单独复跑）：

| 运行 | runId | exit |
|---|---|---|
| 靶向（门禁链内） | `2f278cc0-ef8f-4ab4-b8dd-7287b0908ce1` | **0**（40/40） |
| 单独复跑 ① | `0d5f315a-2be0-4913-82b9-7d2231e39b78` | **0**（40/40） |
| 单独复跑 ② | `b938348d-671d-4b8b-9331-d7bf03f71dc3` | **0**（40/40） |
| 单独复跑 ③（`--test-concurrency=8` 顺序压力） | `3b536393-1a23-4940-bb01-9d2871a10867` | **0**（40/40） |

**canonical `pnpm test`**：runId `a86df04a-9bcb-4d73-8518-47375f2a7b2f`，exit 1（既有基线红：`tests 1091／pass 1066／fail 25`）。
失败集 delta：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t97/g5-test.log`
→ **`base=34 after=29 新增=0 消失=5`**（新增＝0 达标；消失 5 条为他票修复）。冻结白名单未改：
`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` = **0 行**。
事故自检：`git status --short` **无 `Bin … -> …`**（`SKILL.md` 未零填充）。

**并发上下文**：本轮窗口内同时有 **4 个 session**（#97／#88 治理返修／#120／蓝队审查）在跑；无 headless 浏览器实证与全量测试重叠；`pnpm build` 曾等锁 80s（`waitedMs=80065`），其余门 `waitedMs ≤ 1`。

**陈旧 `dist/` 假红事件（自认 · 过程缺陷 S3）**：变异自证 MUT-97-1／97-2 各自 `pnpm build` 后，`dist/` 一度停留在变异产物上；本票测试（同全仓所有测试）走 `dist/`，
故 13:20:15Z／13:20:31Z 两轮单独复跑读到**变异 dist** 而假红（签名与 MUT 逐字一致：
`✖ #97 · affectedRows＝库真实行数…` ＋ `m5-receipt-97.test.mjs:154:12 actual: 0 expected: 1`，
见 `.scratch/t97/mut1-test.log`；MUT-97-2 则为 35 条 `M5 四要素` 全红，见 `mut2-test.log`）。
干净重建（`13b85a96`，13:21:05Z）后靶向＋3 次单独复跑全绿（上表），故**非测试缺陷、非夹具顺序依赖**。
**纪律更正**：此后每个变异后**立即还原并重建 `dist`** 再进下一步，不留到批末。

## 7. 偏离／未做／未确证

- **偏离 D-1**：`affectedRows` 取 SQLite `total_changes()` 增量，而非逐键自报 fetch 返回值。
  理由：单一来源＋可独立对账；实测 `INSERT OR REPLACE` 命中已有行计 1、`INSERT OR IGNORE` 命中已有行计 0（node:sqlite v24），与旧版 `rowcount` 语义一致。
- **偏离 D-2**：`writtenFields` 用 **CLI 参数名**而非库列名（标志位写例外用列名）。理由：契约面是 CLI 一行 JSON；列名映射在 fetch 层，跨票改动风险高。
- **偏离 D-3**：`ids` 对**条件／批量写**（7 键）为空数组 ＋ `idSource='condition'`，不额外 SELECT 反查被删行 id。
  理由：与旧版 `id=n/a` 逐字同口径（`calorie_tracker.py:732,759,802,814,826`）；反查会引入与 fetch 谓词重复维护的风险。
- **未做（范围外，记账）**：HTML 回执未加「影响 N 行」（M5 原文限 stdout）；`idSource` 未进 `SKILL.md`（文档同步归 #82／#98 类票）。
- **未确证**：真机（非 tmp 库）上 35 键的 `affectedRows` 未实测——本票全部证据在 tmp 隔离库（沿 #40／#101 先例，真库零触碰）。

## 8. 风险 top3

1. **`total_changes()` 与未来事务化写库**：若 fetch 层将来引入显式 `ROLLBACK`，`total_changes` **不回退**（SQLite 语义），可能高报影响行数。
   缓解：测试对账口用只读句柄独立回读；引入事务的票需同步补「回滚后 affectedRows」用例。
2. **`writtenFields` 与 fetch 列名漂移**：create 键的字段全集是 `write.ts` 内静态常量，若 fetch 增列而常量未跟，摘要会漏项。
   缓解：`cliNames`／`COL_CLI` 反查 + 逐键断言；建议后续票把常量改为从 fetch 导出（需跨票所有权）。
3. **键集冻结断言过严**：`Object.keys(rc).sort()` 全等断言会让**未来票**新增回执字段时红。
   这是**有意为之**（只追加纪律的可执行化），但后续票需同步更新 `BASE_KEYS ＋ M5_KEYS` 清单；已在测试注释写明。
