# #63 主线① 终局取证（最终代码 `5fffe1e`）

> 席位：主线①终局取证席（只读取证；零产品代码改动）。
> 目标：在**最终代码**上给出「旧版全部唤醒词在新版同样命中并产出对应 HTML」的**可复算**终局证据。
> 背景：#81 的既有证据（exec 326／non-exec 110、exec 361 条全量实跑 exit 0）**早于**
> #106／#107／#111–#113／#121／#83 落地，故本席在 `5fffe1e` 上重做桶层对账 ＋ 实跑抽样，
> 并一并定性「`node docs/research/t81-route-evidence.mjs`（持锁 ticket=63）exit=1」的原因。
>
> 复跑：
> ```text
> node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-bucket.mjs
> node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-exec12.mjs
> ```
> 两个脚本均只读：桶层脚本**零 CLI spawn**（全部进程内 `import` 编译产物），
> 实跑脚本 14 次 spawn（12 抽样 ＋ 2 补充诊断，≤20 预算），只写系统 tmp。

## 0. 起点留痕

```text
$ git log -1 --oneline
5fffe1e fix(83): 返修 R-1 相对落点（红队 S1-交付缺陷）＋ 红队审查报告 ＋ 定点复核

$ git rev-parse HEAD
5fffe1e559bc883b716f8c212af338ab6c2d26d4

$ git status --short
 M .gitignore
?? docs/research/decision-116-3q-20260909.html
?? docs/research/t-help-parity-gen.mjs
?? docs/research/t123-release-evidence/
?? docs/research/t83-review-blue.mjs
?? docs/research/t89-probe-browser.mjs
```

上列 `M`／`??` 均为**他票 WIP**（#116／#89／#83／#123 等），本席不碰、不入本席提交。
本席新增文件仅 3 个：`docs/research/t63-acceptance-line1.md`、
`docs/research/t63-line1-bucket.mjs`、`docs/research/t63-line1-exec12.mjs`。

编译产物新鲜度（只读探测，不构建）：

```text
$ npx tsc -b --dry
… Project 'D:/ilife/packages/skill-calorie/tsconfig.json' is up to date …
```

## 1. 桶层对账（进程内 import，零 spawn）

命令（逐字）：

```text
$ node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-bucket.mjs
```

取数面：`dist/triggers/index.js`（SoT 436）＋ `dist/triggers/routing.js`（436 条路由）＋
`dist/render/index.js::buildHelpSceneData`（10/54/436 数据模型）＋ `dist/cli/keys.js`（99 键 registry）；
冻结源 `docs/research/t71-old-trigger-records.csv` 与 `test/calorie-sot.snapshot.json`（**只读**）。

### 1.1 摘要行

```text
DRIFT exec 341（#81 登记 326，+15） / non-exec 95（#81 登记 110，-15） / 细分 out-of-scope 10 · legacy-chain 85
PARITY csv 多重集 436/436 · snapshot entry_sha 436/436 · 冻结表 blob sha1 未改动
RESULT: 46/46
```

### 1.2 逐项结论

| 面 | 口径 | 实测 | 判定 |
|---|---|---|---|
| SoT 条数 | `TRIGGERS.length` | 436 | ✅ |
| id 唯一 | `id := key ?? wake_word` | 436/436 | ✅ |
| 唤醒词字面唯一 | distinct `wake_word` | 434/436（「记身材照」×3 为 SoT 既有多重集） | ✅ 登记 |
| 分组／子功能／场景 | `buildHelpSceneData` | **10／54／436** | ✅ |
| HELP 数据模型 id | scene `id` | 436/436 唯一 | ✅ |
| 路由条数 | `WAKE_ROUTES.length` | 436 | ✅ |
| 路由 ↔ SoT 逐位 | `wakeWord` 逐位比对 | 漂移 0 | ✅ |
| 入桶 | `kind` | **exec 341 ／ non-exec 95**，合计 436 | ✅（与 #81 有漂移，见 1.3） |
| non-exec 细分 | `bucket` | out-of-scope 10 ＋ legacy-chain 85 | ✅ |
| 理由码闭集 | `reason ∈ NON_EXEC_REASONS`（闭集 23 条） | 越界 0 | ✅ |
| exec cli 形态 | 前缀 ＋ 单条命令正则 | 341/341 唯一出口、341/341 单条命令、键 token 全对 | ✅ |
| exec 键 | `key ∈` 99 键 registry | 越界 0；`routingSummary().coveredKeys = 99/99` | ✅ |
| 零 py | exec cli ＋ routing.ts 源码 | 0 命中 | ✅ |
| 冻结表逐字 | CSV `(Cat\|Wake)` 多重集 ↔ SoT `(category\|wake_word)` | 436/436 | ✅ |
| 冻结快照 sha | `entry_sha`（canon 与 `test/calorie-triggers.test.mjs` 同构） | 436/436 | ✅ |
| 冻结快照其余 | `total`／`wake_multiset`／`scene_counts`／`summary` | 全等 | ✅ |
| 冻结表未改动 | 自算 git blob sha1 | CSV `61e28727c43d2091d7ee4058a2705031f1b68cb3` = HEAD | ✅ |
| 命中面（路由） | 436 条旧词各 ≥1 路由 | 漏 0 | ✅ |
| 命中面（HELP 速查） | `HELP_LOOKUP[wake]` ≥1；aliases 同 | 漏 0；`记身材照` = 3 | ✅ |
| 命中面（AI 面可执行 cli） | `editable_fields.cli` ↔ 路由 exec `cli` | **341/341 逐字相等**，非 exec 95 条保留旧链 cli | ✅ |

### 1.3 与 #81 登记值的漂移（**必须显式登记，不得静默**）

```text
#81 登记：exec 326 ／ non-exec 110（out-of-scope 10 ＋ legacy-chain 100）／ 新拟 34 ／ 覆盖键 77/77
最终代码：exec 341 ／ non-exec 95（out-of-scope 10 ＋ legacy-chain 85）／ 新拟 56 ／ 覆盖键 99/99
漂移：exec +15 ／ non-exec -15
```

归因（`routing.ts` 变更史，逐 commit 可查）：

| commit | 票 | 促进词数 | 说明 |
|---|---|---|---|
| `ee8a1f0` | #111 | 10 | 力量／有氧总览＋筛选 ×2→strength/cardio，计划复盘系 6 词→review |
| `964c41f` | #112 | 1 | 看营养素深度→nutrition-detail |
| `b23f72d` | #113 | 4 | 钠糖纤维趋势／综合→nutrition-analysis，每日 6 因素→six-factors，查卡路里数据→lint-health |
| 合计 | — | **15** | non-exec → exec，脚本实测漂移恰为 +15／-15 |

`docs/calorie-architecture.md:58`（#113 已回填）与 `test/calorie-routing-81.test.mjs:95-105` 均登记
`exec 341／non-exec 95／新拟 56／覆盖键 99`，与本席实测一致。
**结论：桶层漂移是「能力补齐」方向的单向漂移（non-exec → exec），无唤醒词丢失、无理由码越界。**

## 2. 实跑抽样（12 条 exec 唤醒词／覆盖 10 分组）

命令（逐字）：

```text
$ node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-exec12.mjs
```

判据：真机 `spawn` `calorie-cmd-read <key> [--params …]`，逐条断言
① `exit 0`；② `envelope.key = 路由 key`；③ `delivery.mode = 'file'`（#83 三态契约缺省态）；
④ `delivery.path` 绝对且落盘非空；⑤ `delivery.bytes =` 落盘字节数；⑥ `data.output = delivery.path`；
⑦ 产物含 HTML 标签；⑧ 落点在 `<SKILLS_DB_PATH>/calorie_html/`；⑨ envelope 五字段齐备。
种子库 = `docs/research/t81-seed.mjs::seedFull`（与 #81 同一份定义）。

| # | 场景 | 唤醒词 | key | exit | delivery.mode | 落盘字节 | 判定 |
|---|---|---|---|---|---|---|---|
| 1 | 01 | 看今日主页 | `calorie.view.home` | 0 | file | 2499 | PASS |
| 2 | 02 | 记一餐 | `calorie.diet.add` | 0 | file | 301 | PASS |
| 3 | 02 | 看今日饮食 | `calorie.today` | 0 | file | 61674 | PASS |
| 4 | 03 | 记体重 | `calorie.weight.log` | 0 | file | 283 | PASS |
| 5 | 04 | 记运动 | `calorie.exercise.add` | 0 | file | 282 | PASS |
| 6 | 05 | 看计划概览 | `calorie.view.plan` | 0 | file | 1330 | PASS |
| 7 | 06 | 定营养目标 | `calorie.goal.set` | 0 | file | 275 | PASS |
| 8 | 07 | 设置档案 | `calorie.profile.set` | 0 | file | 245 | PASS |
| 9 | 08 | 记体脂（皮褶钳） | `calorie.body.composition-add` | 0 | file | 270 | PASS |
| 10 | 09 | 记身材照 | `calorie.photo.add` | 0 | file | 272 | PASS |
| 11 | 10 | 看体重 vs 摄入(最近 7 天) | `calorie.view.combined` | 0 | file | 66301 | PASS |
| 12 | 10 | 看健康报告(最近 365 天) | `calorie.view.health` | 0 | file | 52221 | PASS |

```text
SUMMARY 抽样 12 条 / 分组 10/10 / 补充诊断 2 条 / spawn 14 次（≤20 预算）
RESULT: 112/112
```

### 2.1 补充诊断：`复制昨日运动`（`t81-exec-smoke.md` 登记的唯一非零记录）

`t81-exec-smoke.md`（#86 `aef6ae0` 重生成，398 条 exec 记录）汇总行登记 **非零 1 条**：
`复制昨日运动`（`calorie.exercise.add`，`exit=4`，`昨日无运动记录可复制`）。
本席复现并定性：

| 形态 | cli | exit | delivery.mode | 落盘字节 | 判定 |
|---|---|---|---|---|---|
| 原样 cli | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'` | 4 | — | — | 数据缺口，非缺陷 |
| 显式 date | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday","date":"2026-09-07"}'` | 0 | file | 233 | PASS |

机理（源码逐行可查）：`cli/write.ts:556` 以 `todayISO()` 为 target → `fetch/exercise.ts:247-252`
取 `target − 1 天` 的 `exercise_log` 行。标准种子库运动数据止于 **2026-09-07**，
而 **UTC 日期**（`todayISO()` = `new Date().toISOString().slice(0,10)`，`analysis/utils.ts:45-47`）为
**2026-09-09** → 源日 2026-09-08 无行 → `missing-data` exit 4。
即：该记录的绿／红**随墙钟漂移**（UTC 2026-09-08 跑为 exit 0，UTC 2026-09-09 起恒 4），
破口边界是 **UTC 零点**（非本地零点）；口径更正见 §R-5.6。
属**证据口径（种子窗口）问题，不是 CLI 缺陷**；按该词自身 fill_hint「复制到哪一天(选填)」
显式给 `date` 即 exit 0 ＋ 落盘 ＋ `delivery.mode='file'`。

## 3. `docs/research/t81-route-evidence.mjs` exit=1 的定性

命令（逐字，持锁复跑一次）：

```text
$ node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-route-evidence.mjs
```

结果：`exit=1`，输出**完整生成**（708 行脚本跑到底，无异常栈、无缺文件、无缺环境变量），
末尾 `## 8. 核对结论` 列出 **19 项核对失败**：

```text
核对失败 19 项：
- 路由层与冻结表漂移 30 处：#46 看营养素深度 桶 exec ≠ non-exec；…
- 看营养素深度 家族未派生但路由层为 exec
- 看运动记录（按力量筛选）／（按有氧筛选）／看力量训练总览／看有氧训练总览／计划复盘（本周）／（本月）／（全部）
  ／看计划完成率／看未完成训练／看动作完成率／看钠糖纤维趋势／看钠糖纤维综合／看每日 6 因素综合／查卡路里数据
  ——「家族未派生但路由层为 exec」（共 15 词）
- 覆盖键 99 ≠ 77
- 新拟入口 56 ≠ 34
- exec 来源分解 56+22+26+222 ≠ 341
```

**定性：口径过期（取证脚本常量面未随路由层演进同步），非环境问题、非产品回归。**

证据链：

1. 不是环境问题：`dist` 与 `src` 同步（`tsc -b --dry` 全 up to date）；脚本自带种子库并自设
   `SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR`（`t81-seed.mjs:150`），无需外部环境变量；锁正常获取／释放；
   全部 CLI spawn 正常返回（否则会抛异常栈而非进入核对结论）。
2. 不是产品回归：19 项失败**全部**是脚本内**硬编码的 #81 期常量**与脚本自身的**旧派生逻辑**对不上。
   **逐项更正（返修 R-5 · 审查席 S3；明细见 §R-5.3）**：`covered.size === 77`（实际 **99**，红）、
   `NEW_KEY_ROUTES.length === 34`（实际 **56**，红）、`twinFlips === 26`（**绿**）、
   `paramFlips === 222`（**绿**——脚本行 388 断言成立，审查席探针逐字取出该家族块复算亦得 222）、
   真正红的是**来源分解式** `directExec＋overrideExec＋twinFlips＋paramFlips = 56＋22＋26＋222 = 326 ≠ 341`
   （脚本行 460）；另有 `drift.length === 0`（实际 **30 处**，行 315）与「家族未派生但路由层为 exec」
   15 词（行 384 逐词断言，仍期望 non-exec）。**括注更正**：脚本全文**不含 `361`**（命中 0 次）；
   `361` 只是 #81 期 exec 记录数（326＋34＋1），出现在本报告 §0 背景行，**不是**脚本内的硬编码常量。
   脚本最后一次改动停在 `52e6fc8`（#81 本票），此后未随 `ee8a1f0`／`964c41f`／`b23f72d`／`18354fe` 同步。
3. 最小复现：
   ```text
   node docs/research/t81-route-evidence.mjs      # exit 1，19 项核对失败（无需锁、无需 build）
   ```
4. 归属建议：**#81 证据脚本维护票**（把 `77`／`34` 等常量与**来源分解式**改为从 `routingSummary()`／
   路由层动态取数；`222`／`26` 当前与真值一致，可一并动态化以免下次静默漂移），**不要**因此改产品代码。
   该脚本的「漂移检测」本体是好的——它正是靠这些断言抓到了路由层的变化，只是常量面需要与路由层同源。

## 4. 附带发现：`test/calorie-routing-81.test.mjs` 在最终代码上为红

本席在诊断过程中复跑该测试（持锁一次）：

```text
$ node tooling/run-locked.mjs --ticket 63 -- node --test test/calorie-routing-81.test.mjs
AssertionError [ERR_ASSERTION]: smoke 快照存在非零记录（exec 桶应全部 exit 0）
exit=1
```

失败点唯一且精确：`test/calorie-routing-81.test.mjs:298-300` 断言
`smoke 快照「非零（失败）」= 0`，而 #86 重生成的 `t81-exec-smoke.md` 该行为 **1**
（即 §2.1 的 `复制昨日运动`）。其余断言（341／95／56／99／26 孪生／237 家族／493 路由表等）全部通过。
该文件属 `pnpm test` 的 `test/*.test.mjs` 面，故**最终代码的 canonical 测试面为红**。
本席**不改** `packages/**`／`test/**`，仅登记。

## 5. 结论

### 主线① 在最终代码（`5fffe1e`）上的判定：**有条件成立**

**成立的部分（可复算）**

1. **命中层 436/436**：436 条旧唤醒词逐条有路由命中、有 HELP 速查命中、有 AI 面可执行/旧链 cli；
   路由与 SoT 逐位对齐、逐条恰一个桶、non-exec 理由码全在闭集内。
2. **对账层**：10 分组／54 子功能／436 场景／id 436/436；CSV 多重集逐字 436/436；
   冻结快照 `entry_sha` 436/436；两份冻结源 blob sha1 未改动。
3. **交付层（抽样）**：12 条 exec 唤醒词（覆盖 10 分组）真机 exit 0 ＋ 产物落盘 ＋
   `delivery.mode='file'` ＋ `data.output = delivery.path`，断言 112/112。
4. **AI 面与路由层同源**：`editable_fields.cli` 与路由 exec cli **341/341 逐字相等**，
   即「唤醒词 → 可执行命令 → HTML 产物」三段在最终代码上闭合。

**未闭合的部分（判定为「有条件」的原因）**

1. **exec ⟺ exit 0 不变量有 1 条数据依赖破口**：`复制昨日运动` 的 cli 以 **UTC 日期**为锚，
   标准种子库窗口覆盖不到 → `exit 4`。该词在显式 `date` 下 exit 0（§2.1），故**不是能力缺失**，
   但**当前证据面下它确实不是 exit 0**，且这使 `test/calorie-routing-81.test.mjs` 为红。
2. **全量实跑未在本席重做**：本席只做 12 条抽样（禁跑 `t81-exec-smoke.mjs` 的 398 次 spawn，
   避免与他席 spawn 抖动互相污染）。全量面唯一证据是 #86 重生成的快照（397/398 exit 0 ＋ 1 条数据缺口），
   其**时效性原先未登记**（返修 R-5 · 审查席 S1）——显式字段：
   `fullEvidenceAt=afdf8e5e`（快照文件 `t81-exec-smoke.md` 的生成 commit `aef6ae0`，19:19）／
   `finalCodeAt=5fffe1e`／`gap=11 commits（改 `packages/skill-calorie/src` 或 `base-combos/src`），
   其中 5 commits 改 `src/cli``。该缺口已由 §R-5.1 在最终代码上全量重跑闭合（runId `1d40d2e0…`）。

### 尚缺什么才能判定「达成」

| # | 缺口 | 归属建议 | 判据 |
|---|---|---|---|
| G1 | `复制昨日运动` 的墙钟依赖破口：cli 参数化（带 `date`）或改判 non-exec＋理由，二者择一；随后重生成 `t81-exec-smoke.md` 与路由测试 | **#81 后续维护票**（触 `routing.ts`／`test/**`，本席只读不改） | `node --test test/calorie-routing-81.test.mjs` exit 0 |
| G2 | `t81-route-evidence.mjs` 常量面（77／34）与**来源分解式**同源化（`222`／`26` 为真值，可一并动态化） | #81 证据脚本维护票 | `node docs/research/t81-route-evidence.mjs` exit 0（漂移 0） |
| G3 | 最终代码上的 **exec 桶全量实跑**（341 条旧词 ＋ 56 新拟 ＋ 1 修复 ＝ 398 记录） | 需独占锁窗口，避开他席 spawn | **已由 §R-5.1 完成**（runId `1d40d2e0…`，exit=1，红点集合＝{`复制昨日运动`}）；判据修订为「非零集合 ⊆ 已知墙钟依赖集（6 键，见 §R-5.2）」 |
| G4 | 若要把「产出对应 HTML」扩到 **95 条 non-exec**，需按理由码逐条判定「是否应有产物」 | #86（wizard 5 条）／各理由码归属票 | 逐条处置登记，无静默留白 |

> 本席判定「有条件成立」的口径（**返修 R-5 后仍成立，但两处表述已更正**）：
> **命中面与交付面的主干在最终代码上成立且可复算；但「exec 桶全部 exit 0」这一 #81 核心不变量
> 在最终代码上存在 1 条数据依赖破口（并已使 canonical 测试为红），故不能判「无条件成立」。**
> 更正：① 破口锚是 **UTC 日期**而非「系统日期」（§R-5.6）；② 全量证据的**时效性已登记**（上文第 2 条），
> 且已在最终代码上重跑复现（§R-5.1）；③ 「唯一墙钟依赖」在**全量 398 条**口径下应表述为
> 「**真实 UTC 日期下唯一红点**」——离窗日期（2027-01-01）另有 5 键 12 条红（§R-5.2）。

## 6. 自检

```text
SKILL.md 首 3 字节 = 2D 2D 2D（"---"），非 00 00 00 → #124 事故面无复发
packages/skill-calorie/SKILL.md 30052 B
MUT-\d 残留：packages/**／tooling/**／test/** 命中 0（全部命中均在 docs/research/** 的既有变异证据文档内）
git status：本席仅新增 3 个受跟踪文件；未 git add -A、未 push
```

## 7. 门禁对账

本席持锁运行的 `RUN` 条目（窗口 `2026-09-09T15:42:31.400Z` ～ `2026-09-09T15:44:10.000Z`，
`--ticket 63`）：

- GATE-RUN runId=a67befee-e93d-4169-94ca-e316b72aa280 cmd=node docs/research/t63-line1-bucket.mjs
- GATE-RUN runId=536bbc33-633d-4e41-bb04-669e27964f14 cmd=node docs/research/t63-line1-exec12.mjs
- GATE-RUN runId=eafe849a-cc21-40f1-b24c-7b889328131f cmd=node docs/research/t81-route-evidence.mjs
- GATE-RUN runId=aa3de409-0497-4f16-accc-5245703fa93a cmd=node docs/research/t63-line1-exec12.mjs
- GATE-RUN runId=9bc1e7c8-44d1-45b2-a2f2-a184be7ee5e3 cmd=node --test test/calorie-routing-81.test.mjs

说明：

- `536bbc33` 为 `t63-line1-exec12.mjs` 的**首版**（12 条抽样，112 项断言中 108 项）；
  `aa3de409` 为加挂 §2.1 补充诊断后的**终版**（112/112）。两条均留痕，终版为准。
- `eafe849a` 与 `9bc1e7c8` 的 **非零退出即本票结论本身**（口径过期／测试红），故需放宽非零：
  GATE-RELAX flag=--allow-nonzero reason=eafe849a 为 #81 旧脚本口径过期的定性证据、9bc1e7c8 为 routing-81 测试红点复现，二者非零退出即取证对象，不得以退出码抹去。
- 窗口内另有**同票号（ticket=63）他席**的 2 条 `RUN`（`0a4e8923`／`61bd571b`，
  命令均为 `node --test test/calorie-routing-81.test.mjs`），非本席声明：
  GATE-RELAX flag=--allow-undeclared reason=窗口内存在同票号并发他席的 2 条 RUN（0a4e8923/61bd571b，本席未运行、不冒认），本席对应运行为 9bc1e7c8。

对账命令（逐字）：

```text
node tooling/check-gate-audit.mjs --evidence docs/research/t63-acceptance-line1.md --ticket 63 \
  --since 2026-09-09T15:42:31.400Z --until 2026-09-09T15:44:10.000Z \
  --allow-nonzero --allow-undeclared
```

---

## 返修 R-5（审查席）

> 席位：主线①终局取证 · **返修席 R-5**。被审交付 `afdf8e5e`；审查报告 `40cfce8`
> （`docs/research/t63-acceptance-line1-review.md`，五维 79/100，verdict **FAIL**，
> 定性「不是证据造假，是覆盖不足＋表述过强」）。
> 本席只动**自己的**文件：本报告 ＋ `docs/research/t63-line1-bucket.mjs` ＋ `docs/research/t63-line1-exec12.mjs`，
> 并**新增 1 个自己的证据脚本** `docs/research/t63-line1-smoke-pinned.mjs`（墙钟钉死全量复跑）。
> 未改 `packages/**`／`tooling/**`／`test/**`／他人 docs；`git commit --only`；**未 push**。

### R-5.1 S1 闭合：最终代码上的**全量实跑**（本票终局证据）

**改了什么**：原报告 §5 把 `aef6ae0`（#86，19:19）的 398 条快照当作「现成证据」，
而该快照**早于** 11 个改 `packages/skill-calorie/src`（其中 **5 个改 `src/cli`**：
`8439976` #83／`a245431` #91／`4671169`＋`ef57ccd` #97／`4d98e5f` #120）的 commit。
本席在最终代码上**真跑一次全量**，作为本票终局证据。

命令（逐字，持锁 `--ticket 63`；**不带 `--out`**，不写仓内任何文件）：

```text
node tooling/run-locked.mjs --ticket 63 --child-timeout-ms 3600000 -- node docs/research/t81-exec-smoke.mjs
```

| 项 | 值 |
|---|---|
| runId | **`1d40d2e0-e5eb-43bd-892e-ac92ae917bee`** |
| exit | **1**（非零＝本票取证对象，见下 GATE-RELAX） |
| 耗时 | START `2026-09-09T15:56:41.689Z` → RUN `15:57:39.383Z` ＝ **57.7 s**（含持锁等待 `waitedMs=10002`，**净跑 ≈47.7 s**） |
| spawn | **497** 次（398 条 exec 记录 ＋ 99 键裸跑），逐条一个全新种子库 |
| 摘要行 | `exec 桶记录数 398`／`原样实跑 exit 0 393`／`占位符替换后 exit 0 4`／**`非零（失败）1`**／`涉及键数 99`／`无参裸跑非零的键 42` |

**当次红点集合（逐条，全集只有这 1 条）**：

```text
- 复制昨日运动 (calorie.exercise.add) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：昨日无运动记录可复制
（t81-exec-smoke.md §1 第 121 行；cli = calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'）
```

**与 `aef6ae0` 快照的逐字比对（本席自算）**：

```text
§1 逐条表：398 行**逐行相同**（rows identical = true）
全文：87104 B（本次 stdout）vs 87103 B（仓内 aef6ae0 快照），差异仅 stdout 末尾多 1 个换行
→ 结论：**aef6ae0 的快照在最终代码 5fffe1e 上仍然逐字复现**；
  11 个 src commit（含 5 个 src/cli）未改变任何一条 exec 记录的 exit／envelope key／cli 字面。
```

**判据**：`exec ⟺ exit 0` 在最终代码上的全量真值＝**397/398**，唯一非零＝`复制昨日运动`；
「快照已过期」这一 S1 缺陷**闭合**（不再依赖任何过期证据——证据本身就是最终代码跑出来的）。

### R-5.2 日期炸弹处置（①红点集合 ②固定日期复跑 ③口径更正）

**改了什么**：原报告只做了 12 条抽样 ＋ 1 条补充诊断，且沿用审查席的「唯一墙钟依赖」表述。
本席把墙钟钉死做成**全量**实验（新脚本 `docs/research/t63-line1-smoke-pinned.mjs`）。

**手法**：复用 `t81-seed.mjs::createHarness`（与 #81/#86 **同一份**种子库与占位符替换口径），
仅以 `NODE_OPTIONS=--require <freeze-date.cjs>` ＋ `T63_FAKE_NOW` 把子进程 `Date` 钉死
（`todayISO()` = `new Date().toISOString()`，故钉 `Date` 即钉「今天」）；记录集与 `t81-exec-smoke.mjs` 逐字同面
（SoT 341 ＋ 新拟 56 ＋ 修复 1 ＝ **398**）。脚本自带**钉死自证**（先跑 `复制昨日运动` 看是否翻转）。

复现命令（逐字，两次均持锁）：

```text
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-smoke-pinned.mjs --now 2026-09-08T04:00:00Z
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-smoke-pinned.mjs --now 2027-01-01T04:00:00Z
```

| 实验 | runId | 「今天」 | exit | 绿／红 | 红点集合 |
|---|---|---|---|---|---|
| ① 真实墙钟（R-5.1 全量） | `1d40d2e0-e5eb-43bd-892e-ac92ae917bee` | UTC 2026-09-09（真实） | 1 | 397／**1** | `复制昨日运动` |
| ② 钉死**种子窗口内** | `684db98d-3b03-4d6f-8868-750cb249221c` | 2026-09-08T04:00:00Z | **0** | **398／0** | **（无）**——含 `复制昨日运动` 亦 exit 0（钉死自证 exit=0） |
| ③ 钉死**窗口外远期** | `2a3058d5-66b8-43a5-8b55-eaff65ccfa0b` | 2027-01-01T04:00:00Z | 1 | 385／**13** | 6 键 13 条（见下） |

实验③的 13 条红点（键去重后 6 键）：

```text
calorie.exercise.add            复制昨日运动（1 条）      「昨日」＝今日−1，窗口外无源日行
calorie.view.body-composition   看体脂／看体脂趋势／看体成分（3 条）  「无体成分记录（近90天）」
calorie.view.body-measure       看围度／看围度趋势／看围度记录（3 条）「无围度记录」
calorie.photo.list              查身材照／看身材照（2 条）  「无身材照（2026-10-04 ~ 2027-01-01 · 标签 正面）」
calorie.photo.gif               生成身材照GIF／做身材照GIF（2 条）「无匹配照片（标签 正面）」
calorie.history                 查热量趋势／查热量历史（2 条）「最近7天无记录」
```

**结论（含对审查席表述的更正）**：

1. **「除该条外全绿」成立且已实证**：实验②（窗口内日期）**398/398 全绿**，即同一条命令集
   在种子窗口内日期下**没有任何其它红点**；实验①（真实 UTC 日期）红点集合恰为 `{复制昨日运动}`。
2. **「唯一墙钟依赖」在全量 398 条口径下过强，予以更正**：exec 桶内**不止一条**记录以「今天」为锚
   计算读窗口——离窗日期（实验③）另有 **5 键 12 条**变红。正确表述是
   「**真实 UTC 日期下唯一红点＝`复制昨日运动`**」，而「墙钟依赖」是一**类**（6 键，登记于上表）。
   机理同源（写侧源日／读侧相对窗口）：**相对「今天」的窗口 ∩ 标准种子库数据区间为空** → `missing-data` exit 4；
   与 CLI 能力／回归无关（窗口内日期 398/398 全绿即为证）。
3. **已知红 1 条＝墙钟依赖，非回归**（本票终局口径）：真实 UTC 日期下 `复制昨日运动` 恒红，
   且 `test/calorie-routing-81.test.mjs` 的唯一红点即由它引起（§4）。
   复现命令：`node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-exec-smoke.mjs`
   （期望 `非零（失败） 1`，红点＝`复制昨日运动`）；
   消解验证：`node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-exec12.mjs`
   （§2.1：显式 `date` 下 exit 0 ＋ `delivery.mode='file'` ＋ 233 B）。
4. **不得改种子库窗口**：实验②证明「换一个窗口内日期即全绿」，故破口是**证据口径（墙钟 vs 种子窗口）**
   问题；处置仍按 G1（改路由 cli 或改判 non-exec＋理由），**不要**动种子库／冻结证据链。

**判据**：全量红点集合以 `t81-exec-smoke.mjs` 的 `非零（失败）` 行 ＋ §1 表中 `exit ≠ 0` 的逐行为准；
「除该条外全绿」以**同一命令集在窗口内日期下的全量 398/398** 为准（不是抽样、不是子集）。

### R-5.3 ④ 定性更正：`t81-route-evidence.mjs` exit=1（逐项）

**改了什么**：原报告 §3 的括注把 `paramFlips === 222` 与 `twinFlips === 26` 一并当作「硬编码常量对不上」，
并（在 §0 背景行）出现 `361`。逐项更正如下（脚本内断言行号为准）：

| # | 脚本行 | 断言 | 当前真值 | 原报告表述 | **更正后判定** |
|---|---|---|---|---|---|
| 1 | `315` | `drift.length === 0` | **30 处** | 「路由层与冻结表漂移 30 处」 | ✅ 红（**1 项**） |
| 2–16 | `384` | 「家族未派生但路由层为 exec」（逐词一条断言） | **15 词** | 「共 15 词」 | ✅ 红（**15 项**） |
| 17 | `430` | `covered.size === 77` | **99** | 「覆盖键 99 ≠ 77」 | ✅ 红（1 项） |
| 18 | `434` | `NEW_KEY_ROUTES.length === 34` | **56** | 「新拟入口 56 ≠ 34」 | ✅ 红（1 项） |
| 19 | `460` | `directExec＋overrideExec＋twinFlips＋paramFlips === EXEC_ROUTES.length` | **56＋22＋26＋222 ＝ 326 ≠ 341** | 原报告写作「`paramFlips === 222`＋`twinFlips === 26`＋来源分解（实际 341）」 | ✅ 红（1 项）——**红的是分解式，不是 222／26** |
| — | `388` | `paramFlips === 222` | **222** | 被列为「对不上的常量」 | ❌ **实为绿**（审查席探针 `19988efe…` 逐字取出该家族块复算亦得 222） |
| — | `349` | `twinFlips === 26` | **26** | 同上 | ❌ **实为绿** |
| — | `316`/`347`/`348`/`401`/`436`/`444` | `WIZARD.size===5`／`TWIN_FLIPS.size===24`／孪生词表一致／`COVERAGE_REPAIR_ROUTES.length===1`／`frozenExecKeys.size===43`／`WAKE_ROUTES.length===436`／零 py | 全对 | — | ✅ 绿 |

**19 项失败构成（更正后）**：**1 drift ＋ 15 未派生 ＋ 1 `covered` 99≠77 ＋ 1 新拟 56≠34 ＋ 1 分解式 ＝ 19**。

**`361` 的更正**：`361` 在 `t81-route-evidence.mjs` 内**命中 0 次**（本席 `grep -F 361` 实测）；
它只是 #81 期 exec 记录数（326 ＋ 34 ＋ 1），出现在本报告 §0 背景行，**不是脚本内的硬编码常量**，
原报告 §3 的括注实写为 `77/34/222/26`（其中 222／26 为真值）。

**定性不变**：**口径过期（脚本陈旧）**——非环境问题、非产品回归。脚本最后一次改动停在 `52e6fc8`。
**归属**：G2（#81 证据脚本维护票），把 `77`／`34` 与**分解式**改为动态取数。

**判据**：上表逐行以脚本内**断言行号**为准（本席按行读源码，非引用二手转述）；
`361` 以 `grep -F 361 docs/research/t81-route-evidence.mjs` **命中 0** 为证；
分解式以算术 `56＋22＋26＋222 ＝ 326 ≠ 341` 为证（`EXEC_ROUTES.length = 341` 与本报告 §1.2 实测一致）。

### R-5.4 ⑤ 表述更正：「有条件成立」的时效性显式化

**改了什么**：原判「有条件成立」的**两条缺口确实被登记**（审查席判「部分成立」），
但「全量现成证据」的**时效性未登记**。本席在报告内写成**显式字段**：

```text
fullEvidenceAt = afdf8e5e / aef6ae0   （#63 取证 commit / 快照 t81-exec-smoke.md 的生成 commit，2026-09-09 19:19）
finalCodeAt    = 5fffe1e              （被审最终代码）
gap            = 11 commits（改 packages/skill-calorie/src 或 base-combos/src）
                 其中 5 commits 改 packages/skill-calorie/src/cli
                 （8439976 #83／a245431 #91／4671169＋ef57ccd #97／4d98e5f #120）
status         = 已闭合（§R-5.1 在最终代码上全量重跑，runId 1d40d2e0…；且 aef6ae0 快照逐字复现）
```

**判据**：任何「引用既有全量证据」的主张，必须同时给出 `fullEvidenceAt` 与 `finalCodeAt`，
并给出二者之间的 `gap`（改 `src`／改 `src/cli` 的 commit 数）；`gap > 0` 时不得称「现成证据」，
须在本票重跑或显式标注为「过期证据」。本报告 §5「未闭合」第 2 条与 G3 已按此改写。

### R-5.5 S2 方法论：白名单吞掉核心不变量红点（**判据要求**；不改产品）

**事实（本席独立复算，与被审/审查席两路独立一致）**：
核心不变量 `exec ⟺ 实跑 exit 0` 的红点测试名

```text
test/calorie-routing-81.test.mjs:293
  it('FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 exit 0 ＋ 需参数键必须带 --params）', …)
```

与冻结白名单 `docs/research/t88-baseline/test-failset.txt` 第 16 行条目

```text
FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 exit 0 ＋ 需参数键必须带 --params）
```

**逐字节相等**（本席自算：`it` 名 102 B ＝ 名单条目 102 B，`Buffer.equals` = **true**）；
其 `describe` 名 `#81 唤醒词路由层（路由与 parity 分家）` 亦在名单内（名单共 34 条）。
即：**若验收只判「失败集新增 0」，这条核心不变量会被判绿**——白名单是在该测试已经变红之后冻结的，
它把一次真实的「不变量违反」吸收成了基线。

**判据要求（写入验收口径，硬约束）**：

```text
验收不得只看「失败集新增 0」；**白名单条目本身须在最终代码上断言全绿**，
否则必须单列为「已知红」并写明成因与处置票号——不得以「新增 0」判绿。
```

**处置建议（写进报告，本席不执行）**：
1. 判据补「白名单条目断言须全绿」硬约束，或把该不变量拆出一条**不列入白名单**的断言
   （例如只判「当前路由层 cli 在标准种子库上 exit 0」，与历史快照解耦）；
2. **修路由层 cli**（给 `复制昨日运动` 补显式 `date`，或按 `t81-route-evidence.md §2.3` 口径改
   `non-exec` ＋ 理由码），随后重生成 `t81-exec-smoke.md` 与路由测试；
   **不要改种子库窗口**（那会污染 #81/#86 的冻结证据链，等于改判据迁就证据）；
3. **新开票**（#81 路由层后续维护票）承接第 2 条，并在验收判据里把该红点标为
   「已知红，不得计入新增 0」，避免下一次审查再次被白名单吞掉。

### R-5.6 墙钟口径更正（系统日期 → UTC 日期）

**改了什么**：原报告 §2.1／§5 称 `复制昨日运动` 以「**系统日期**」为锚，不精确。

```text
packages/skill-calorie/src/analysis/utils.ts:45-47
  export function todayISO(): string { return new Date().toISOString().slice(0, 10); }
→ **UTC 日期**；破口边界是 **UTC 零点**（非本地零点）。
链：cli/write.ts:556 target = date ?? todayISO() → :558 copyYesterday(target)
   → fetch/exercise.ts:242-247 src = target − 1 天（exercise_log 行）
```

已改：本报告 §2.1／§5（第 1 条未闭合项）全部改为「**UTC 日期**」；
`docs/research/t63-line1-exec12.mjs` 的注释同步改为「以 **UTC 日期**为锚」。

**判据**：`packages/skill-calorie/src/analysis/utils.ts:45-47`（`new Date().toISOString().slice(0,10)`）
＋ `docs/research/t63-line1-exec12.mjs` 注释；实证面见 §R-5.2 实验②（钉死 `2026-09-08T04:00:00Z` → exit 0）。

### R-5.7 我自己的脚本更新（附新 runId）

| 脚本 | 改了什么 | 复跑命令（持锁 `--ticket 63`） | runId | 结果 |
|---|---|---|---|---|
| `t63-line1-bucket.mjs` | 审查席 S2-②：漂移归因由 `info()` 文本升级为**逐词身份断言**——只读 `git show 52e6fc8:…/routing.ts` 解析每词 `kind`，断言「漂移集合 ＝ #111／#112／#113 促进的 15 词」且「反向漂移 0 词」（＋3 断言，46→49） | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-bucket.mjs` | **`c9e4729c-3fef-428f-9a7a-cfa39e279e44`** | exit=0，**49/49**；漂移集合逐词实名通过；反向漂移 0 |
| `t63-line1-exec12.mjs` | 「系统日期」→「**UTC 日期**」（注释口径更正，断言集不变） | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-exec12.mjs` | **`fd5cbe24-c053-4aa2-83ff-5407ea30749e`** | exit=0，**112/112**（12 条抽样 ＋ 2 条诊断，字节列仍为当日钉死，见审查席 §3.3 限定） |
| `t63-line1-smoke-pinned.mjs`（**新增**） | 墙钟钉死 × 全量 398 复跑（R-5.2）；自带钉死自证；只写系统 tmp | 见 §R-5.2 | `684db98d…`（窗口内 398/398）／`2a3058d5…`（窗口外 385/398） | 见 §R-5.2 表 |

### R-5.8 返修席门禁对账

本席持锁运行的 `RUN` 条目（本席运行窗口 `2026-09-09T15:56:41.689Z` ～ `2026-09-09T16:01:13.705Z`，`--ticket 63`）：

- GATE-RUN runId=1d40d2e0-e5eb-43bd-892e-ac92ae917bee cmd=node docs/research/t81-exec-smoke.mjs
- GATE-RUN runId=684db98d-3b03-4d6f-8868-750cb249221c cmd=node docs/research/t63-line1-smoke-pinned.mjs --now 2026-09-08T04:00:00Z
- GATE-RUN runId=2a3058d5-66b8-43a5-8b55-eaff65ccfa0b cmd=node docs/research/t63-line1-smoke-pinned.mjs --now 2027-01-01T04:00:00Z
- GATE-RUN runId=c9e4729c-3fef-428f-9a7a-cfa39e279e44 cmd=node docs/research/t63-line1-bucket.mjs
- GATE-RUN runId=fd5cbe24-c053-4aa2-83ff-5407ea30749e cmd=node docs/research/t63-line1-exec12.mjs

说明：

- `1d40d2e0` 的**非零退出即本票结论本身**（最终代码上 `复制昨日运动` 为红），`2a3058d5` 亦然
  （离窗日期 13 条红，用于证伪「唯一墙钟依赖」）：
  GATE-RELAX flag=--allow-nonzero reason=1d40d2e0 为最终代码全量实跑的真实红点集合（非零即取证对象）、2a3058d5 为离窗日期对照实验（非零即「墙钟依赖是一类」的证据），二者不得以退出码抹去。
- 窗口内另有**他席**的 `RUN`（`ticket=79` 的 `pnpm test`／`ticket=63` 的 `t105-check-rulers.mjs`／
  `ticket=83` 的探针与 `git commit` 等，并集窗口内共 53 条），本席未运行、不冒认：
  GATE-RELAX flag=--allow-undeclared reason=并集窗口内存在并发他席的 53 条 RUN（ticket=63/79/83 的探针、pnpm test、git commit 等，本席未运行、不冒认），本席对应运行为上文 5 条。

对账命令（逐字；本文件同时含 §7（原席 5 条）与 §R-5.8（返修席 5 条）两批声明，
故窗口取**二者并集** `2026-09-09T15:42:31.400Z` ～ `2026-09-09T16:01:13.705Z`）：

```text
node tooling/check-gate-audit.mjs --evidence docs/research/t63-acceptance-line1.md --ticket 63 \
  --since 2026-09-09T15:42:31.400Z --until 2026-09-09T16:01:13.705Z \
  --allow-nonzero --allow-undeclared
```

实测输出（逐字末行）：

```text
RESULT: matched=10/10 auditEntries=823 scoped=63 undeclared=53
gate-audit: PASS
```

（`undeclared=53` 为并集窗口内他席（`ticket=63/79/83` 等）的并发 `RUN`，已按 `GATE-RELAX --allow-undeclared` 登记；
原席窗口 `15:42:31–15:44:10` 的独立对账结果仍见 §7。）

### R-5.9 返修席自检

```text
packages/skill-calorie/SKILL.md 首 3 字节 = 2D 2D 2D（"---"），非 00 00 00 → #124 事故面无复发
  （30143 B；与 HEAD blob 逐字节相同＝本席未改动该文件；原报告记 30052 B 为其取证时点值，此后 #83 R-2 已改）
MUT-\d 残留：packages/**／tooling/**／test/** 命中 0
git status：本席只改/新增自己的 4 个文件（报告 ＋ bucket ＋ exec12 ＋ smoke-pinned）；未 git add -A；未 push
未改 packages/**／tooling/**／test/**／他人 docs（git commit --only 逐文件提交）
```
