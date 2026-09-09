# #97 · M5 写库回执契约（正本，v1）

> 票：wayfinder 地图 #63 子票 #97《M5 写库回执契约落地（id＋时间戳＋影响行数）》。
> 前置：#101（写链落库断言 ＋ 软删文案统一）已关闭，本文与 `docs/research/t101-write-persist-and-delete-wording.md` 口径一致。
> 机读探针：`docs/research/t97-probe-receipts.mjs`（35 键逐键四要素，`RESULT: n/m`）。
> 回归测试：`packages/skill-calorie/test/m5-receipt-97.test.mjs`。

## 1. 旧版铁则原文与实测口径（只读对照）

旧基线 `D:\2Study\StudyNotes\SKILLS\卡路里`（只读）：

| 出处 | 原文 |
|---|---|
| `SKILL.md:30` | 「⭐ **写入后回执契约**（v2.4.14 增 · V1.0 §02 第②特性）：**所有写库类 CLI 子命令必须按固定契约返 stdout**（满足「写入后回执 = ID + 时间戳 + 影响行数」）」 |
| `SKILL.md:34` | 「**写库类**（`weight` / `add` / `delete` / `update-meal` 等）｜必须 stdout 包含 `id=<N>` ＋ `日期 <YYYY-MM-DD> <HH:MM:SS>` ＋ `影响 N 行` ＋ 写入字段摘要」 |
| `SKILL.md:41` | 「**写库回执必有 ID** —— 「ID + 时间戳 + 影响行数」是 Verifiable 的硬规则」 |

实测（旧版 CLI 真跑过的 stdout 形态）：

| 出处 | stdout |
|---|---|
| `scripts/calorie_tracker.py:580` | `id={id} \| 日期 {updated_at} \| 影响 {rows_affected} 行`（体重目标） |
| `scripts/calorie_tracker.py:730-732` | 复制饮食：`id=n/a \| 日期 {today} \| 影响 {copied} 行` |
| `scripts/calorie_tracker.py:759` | 批量补记：`id=n/a \| 日期 {date} \| 影响 {added} 行` |
| `scripts/calorie_tracker.py:802,814,826` | 按日／按餐别／按范围删：`id=n/a \| 日期 {date} \| 影响 {deleted} 行` |
| `scripts/calorie_tracker.py:840` | 下架食品：`✓ 已下架「{name}」 (id={id}, 影响 1 行)` |
| `scripts/calorie_tracker.py:208,312,394,431` | 记饮食／喝水／体重／改体重：`✓ … (id={id}, 影响 {rows_affected} 行)` |

机读判定（旧 `tests/test_write_contract.py:205-253`）：stdout 含 `id=`、正则 `\d{4}-\d{2}-\d{2}`、含字面 `影响`；缺一即红。
`rows_affected` 语义＝**真实库行数**（`cursor.rowcount`：`fetch/weight.py:173`、`goal_manager.py:64,92`、`nutrition_goal.py:318`），
重复跳过＝**0 行**（`tests/test_diet_idempotency.py:44-49`：`r1.rows_affected==1` / `r2.rows_affected==0`）。

**结论（旧版口径三条）**：① 单条写必带 `id=<N>`；② 批量／条件写 **`id=n/a` 亦合规**（旧版机读只查 `id=` 标记）；
③ `影响 N 行` 必须是库真实行数，重复/无实际写入＝0。

## 2. 新架构约束（本票不得违反）

- **P9**：stdout 恒为**一行 JSON**（envelope 形 `{version,skill,key,shape,data:{ok,message,receipt}}`；`receipt` 形必含 `ok`／`message` 的语义不变）。
- **D2**：键只许追加（本票不动键表；`CALORIE_WRITE_COMBOS` 35 键零变动）。
- **只追加字段**：`CrudReceipt` 既有 10 个字段（`scene`／`action`／`op`／`recordId`／`summary`／`items`／`tagDiff`／`distance`／`noChange`／`meta`）**一字未改、一个未删**；M5 全部落为**追加**字段。

## 3. 契约（M5 v1，追加字段）

### 3.1 字段表

| 字段 | 类型 | 缺值语义 | 来源 |
|---|---|---|---|
| `m5Contract` | `'1'` 常量 | 恒存在 | 回执自证「满足 M5 v1」 |
| `affectedRows` | `number`（整数 ≥ 0） | 无写入＝`0` | SQLite `total_changes()` 在本键写库前后的**增量**（真实库行数） |
| `affectedRowsSource` | `'sqlite:total_changes'` 常量 | 恒存在 | 来源可复核标记 |
| `ids` | `number[]` | 条件／批量写＝`[]` | 本次写入可确定的记录 id（新增 id／命中 id） |
| `idSource` | `'record'\|'singleton'\|'condition'\|'none'` | 见 §3.3 | id 口径 |
| `writtenFields` | `string[]` | delete 键＝`[]`；无实际写入＝`[]` | 写入字段摘要（CLI 参数名口径，见 §3.4） |
| `m5Line` | `string` | 恒存在 | 旧版整行文本等价物：`id=<N\|n/a> \| 日期 <YYYY-MM-DD HH:MM:SS> \| 影响 N 行 \| 字段 a,b` |

**时间戳不新增重复字段**：M5 的「日期 `<YYYY-MM-DD> <HH:MM:SS>`」＝既有 `receipt.meta.actionAt`
（`src/render/receipt.ts:nowStamp()`，格式与旧版逐字一致）。`m5Line` 把它与 id／影响行数／字段摘要串成旧版那一行。

### 3.2 四要素映射（旧版 → 新架构）

| 旧版要素 | 新架构落点 | 不变量 |
|---|---|---|
| `id=<N>` | `recordId`（单条）／`ids`（多条）／`idSource`（不适用时） | 单条写 `recordId>0`；批量／条件写 `idSource==='condition'` 且 `ids===[]`（＝旧版 `id=n/a`） |
| `日期 <YYYY-MM-DD> <HH:MM:SS>` | `meta.actionAt` | 恒匹配 `/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/` |
| `影响 N 行` | `affectedRows`（＋`m5Line` 内字面 `影响 N 行`） | 整数 ≥0；来源＝`total_changes()` 增量（非自报） |
| 写入字段摘要 | `writtenFields`（＋`m5Line` 内字面 `字段 …`） | create／update 键非空；delete 键为空数组（旧版同样只印 id／日期／影响） |

### 3.3 `idSource` 四值语义

- `record`：单条记录 id（`recordId` 非空或 `ids` 非空）。含单条 create／update／delete 与「批量新增」的 `ids`。
- `singleton`：单例行表写（`user_profile`／`daily_goal`），固定 `id=1`（旧版 `id=1` 硬编码同值）。
- `condition`：按条件／批量的写（按日／范围／餐别／批量项），id 不适用 —— **旧版 `id=n/a` 的等价物**。
- `none`：本次无写入且拿不到 id（如重复跳过且 fetch 未回传原 id）——`affectedRows` 同时为 `0`。
  （`calorie.water.log` 重复跳过已与 `calorie.diet.add` 统一：`addMeal` 回传原 id 时报 `record` ＋ `ids=[dupId]`，
  仅在拿不到 id 时才退 `none`——返修 R-3／蓝队 D-3。）

### 3.4 `writtenFields` 口径

- **CLI 参数名（camelCase）**，不是库列名：契约面是「CLI 一行 JSON」，用户／AI 说的是 CLI 名；列名映射在 fetch 层（`COL_CLI` 表仅用于把 update 键的**实际变更列**回译成 CLI 名）。
- **摘要＝本次实际写入的列中「有 CLI 参数名」的那些**（返修 R-1／R-3 收紧，`4671169` 的 `goal.set` 口径不符已修正）：
  - **create 键**＝该键本次写入的 CLI 字段全集（缺省值也算写入，如 `calorie.diet.add` 恒写 `foodName,calories,protein,carbs,fat,grams,note,date,time`）。
  - **update 键**＝**本次实际被 SET 的列**回译成 CLI 名（`Object.keys(fields)`；无实际变化时仍列出被 SET 的列）。
    **未进本次 SQL SET 列表的列不得出现**：`calorie.goal.set` 不传 `water` 时 SQL 无 `water_goal` 列
    （`fetch/nutritionGoal.ts:68-78` 两条 `INSERT OR REPLACE`），摘要为 `calorie,protein,carbs,fat`；传 `water` 才追加 `water`。
  - **delete 键**＝`[]`（无写入字段）。
- **派生列／记账列不入摘要**（它们没有 CLI 参数名，与「CLI 名口径」正交）：`weight_log.height_cm`／`bmi`
  （`fetch/weight.ts:52,74`，由档案身高与 kg 派生）／`weight_log.bmi` 的同值更新（`fetch/weight.ts:74`）、各表 `updated_at`
  （`CURRENT_TIMESTAMP`）。→ 与「写入字段全集」的落差在 `t97-impl.md` §7 逐条登记。
- 无 CLI 参数对应的标志位写（软删／下架／暂停）用库列名：`is_deleted`／`is_deprecated`／`goal_paused`。

### 3.5 软删语义（与 #101 同源，**不改文案**）

本票**不改**任何既有文案：`SOFT_STILL_COUNTED`／`SOFT_EXCLUDED`／`HARD_WORDING` 与 `items[].status`
（`write.ts:deleteStatus`）逐字沿用 #101 三档口径。M5 只补**计数与字段**：

| 写类 | 软/硬 | `affectedRows` | `writtenFields` |
|---|---|---|---|
| `exercise_log.is_deleted` 软删（仍计入统计） | 软 | 被标记行数 | `['is_deleted']` |
| `body_composition`／`body_measurements` 软删（已排除） | 软 | 被标记行数 | `['is_deprecated']` |
| `nutrition_products` 下架 | 软 | 1 | `['is_deprecated']` |
| `food_log`／`weight_log`／`body_photos` 硬删 | 硬 | 被删除行数 | `[]` |

`affectedRows` 计「被写行数」，与「是否仍计入统计」**正交**（软删也真实写了 1 行）。

### 3.6 与 `noChange` 的关系（不强制等价）

`noChange` 语义**保持 #101 不变**（值未变／重复跳过）。`affectedRows` 是**库行数**，故允许：

- 重复跳过（`diet.add` 命中同餐同食）：`noChange=true`，`affectedRows=0`，`writtenFields=[]`，`idSource='record'`（拿得到原 id）或 `'none'`；
- 同值 UPDATE（如 `weight.update` 传相同 kg）：SQLite 仍计 **1** 行变更 → `affectedRows=1`；
  `noChange` 取该键 #101 既有值（**`weight.update` 实测 `noChange=false`**——该键不设 `noChange`，本票不改其语义），
  故 `noChange` 与 `affectedRows` **不等价**（返修 R-3／蓝队 D-4 按实测修正旧措辞「同值 UPDATE → `noChange=true`」）。

**不变量**：`affectedRows===0` ⇒ 该键未对库做任何行变更（测试用只读句柄独立复核）。

## 4. 诊断基线（实现前，机读探针实测）

命令：`node tooling/run-locked.mjs --ticket 97 -- node docs/research/t97-probe-receipts.mjs`
（探针全文 `.scratch/t97/probe-before.log`，机读 `.scratch/t97/before.json`）

**`RESULT: 0/35`** —— 实现前 35 个写键**无一**满足 M5 v1。逐要素：

| 要素 | 实现前 | 说明 |
|---|---|---|
| `m5Contract`／`affectedRows`／`affectedRowsSource`／`ids`／`idSource`／`writtenFields`／`m5Line` | **0/35** | 字段**不存在**（35 键 miss 列表逐键含全部 7 项） |
| 时间戳 `meta.actionAt` | **35/35 已具备** | 既有字段，格式已合旧版 |
| `id`（`recordId`） | 26 键非空／6 键 `null` | `null`＝`diet.batch`／`diet.copy`／`diet.remove-by-date`／`diet.remove-by-range`／`diet.remove-by-type`／`weight.batch`；另 3 键（`diet.update-by-date`／`photo.remove`／`photo.tag`）当轮夹具报错，实现后已覆盖 |
| 「影响 N 行」 | 仅以**中文散文**散落 `summary`（如「已更新 X 条」），**无结构化字段**、无字面 `影响` | 不可机读、不可对账 |

> 结论：既有回执「到 envelope 层」而非 M5 层 —— 时间戳已有，id 部分有，**影响行数与字段摘要缺失且不可机读**。

## 5. 实现落点（只改本票所有权内两个文件）

| 文件 | 改动 |
|---|---|
| `packages/skill-calorie/src/render/receipt.ts` | 追加 `M5_CONTRACT`／`M5_AFFECTED_SOURCE`／`M5IdSource`／`M5Fields`；`CrudReceipt extends M5Fields`；新增 `m5LineOf`／`buildM5`／`withM5`；`buildCrudReceipt` 增 4 个可选入参（缺省语义齐备） |
| `packages/skill-calorie/src/cli/write.ts` | `totalChanges(db)`（写库前后增量）；`dispatchWrite` 统一注入 `affectedRows`；35 键逐键补 `ids`／`idSource`／`writtenFields`；照片三键经 `withM5` 追加（`render/photo.ts` **零改动**） |

**未改**：`src/render/**` 其余文件、`render/photo.ts`、`src/analysis/**`、`src/cli/cmd_read.ts`、`packages/base-render/**`、`packages/plugin-*`、`tooling/**`、键表。
**HTML 不在 M5 范围**：M5 原文是「必须按固定契约返 **stdout**」；`receiptHtml`（写回执小节）逐字未动，快照零风险。

## 6. 复跑

```powershell
node tooling/run-locked.mjs --ticket 97 -- pnpm build
node tooling/run-locked.mjs --ticket 97 -- node docs/research/t97-probe-receipts.mjs --json .scratch/t97/after.json
node tooling/run-locked.mjs --ticket 97 -- node --test packages/skill-calorie/test/m5-receipt-97.test.mjs
```
