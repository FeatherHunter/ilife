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
而系统日期为 **2026-09-09** → 源日 2026-09-08 无行 → `missing-data` exit 4。
即：该记录的绿／红**随墙钟漂移**（2026-09-08 跑为 exit 0，2026-09-09 起恒 4），
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
2. 不是产品回归：19 项失败**全部**是脚本内**硬编码的 #81 期常量**与脚本自身的**旧派生逻辑**对不上：
   `covered.size === 77`（实际 99）、`NEW_KEY_ROUTES.length === 34`（实际 56）、
   `paramFlips === 222`＋`twinFlips === 26`＋来源分解（实际 341）、以及脚本不认识 #111／#112／#113
   促进的 15 词（仍期望 non-exec）。脚本最后一次改动停在 `52e6fc8`（#81 本票），此后未随
   `ee8a1f0`／`964c41f`／`b23f72d`／`18354fe` 同步。
3. 最小复现：
   ```text
   node docs/research/t81-route-evidence.mjs      # exit 1，19 项核对失败（无需锁、无需 build）
   ```
4. 归属建议：**#81 证据脚本维护票**（把 `77/34/222/26` 等常量改为从 `routingSummary()` 动态取数，
   或随各促进票同步），**不要**因此改产品代码。该脚本的「漂移检测」本体是好的——它正是靠这些
   断言抓到了路由层的变化，只是常量面需要与路由层同源。

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

1. **exec ⟺ exit 0 不变量有 1 条数据依赖破口**：`复制昨日运动` 的 cli 以**系统日期**为锚，
   标准种子库窗口覆盖不到 → `exit 4`。该词在显式 `date` 下 exit 0（§2.1），故**不是能力缺失**，
   但**当前证据面下它确实不是 exit 0**，且这使 `test/calorie-routing-81.test.mjs` 为红。
2. **全量实跑未在本席重做**：本席只做 12 条抽样（禁跑 `t81-exec-smoke.mjs` 的 398 次 spawn，
   避免与他席 spawn 抖动互相污染）。全量面现成证据是 #86 重生成的快照（397/398 exit 0 ＋ 1 条数据缺口）。

### 尚缺什么才能判定「达成」

| # | 缺口 | 归属建议 | 判据 |
|---|---|---|---|
| G1 | `复制昨日运动` 的墙钟依赖破口：cli 参数化（带 `date`）或改判 non-exec＋理由，二者择一；随后重生成 `t81-exec-smoke.md` 与路由测试 | **#81 后续维护票**（触 `routing.ts`／`test/**`，本席只读不改） | `node --test test/calorie-routing-81.test.mjs` exit 0 |
| G2 | `t81-route-evidence.mjs` 常量面（77／34／222／26）与路由层同源化 | #81 证据脚本维护票 | `node docs/research/t81-route-evidence.mjs` exit 0（漂移 0） |
| G3 | 最终代码上的 **exec 桶全量实跑**（341 条旧词 ＋ 56 新拟 ＋ 1 修复 ＝ 398 记录） | 需独占锁窗口，避开他席 spawn | `t81-exec-smoke.mjs` 非零 0 ＋ 快照重生成 `git diff` 为空 |
| G4 | 若要把「产出对应 HTML」扩到 **95 条 non-exec**，需按理由码逐条判定「是否应有产物」 | #86（wizard 5 条）／各理由码归属票 | 逐条处置登记，无静默留白 |

> 本席判定「有条件成立」的口径：**命中面与交付面的主干在最终代码上成立且可复算；
> 但「exec 桶全部 exit 0」这一 #81 核心不变量在最终代码上存在 1 条数据依赖破口
> （并已使 canonical 测试为红），故不能判「无条件成立」。**

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
