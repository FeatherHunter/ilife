# #120 蓝队审查：软删记录仍计入统计（analysis 层 11 处补过滤 ＋ 文案收敛）

> 审查者：蓝队 subagent（只读；只写本报告与 `.scratch/orchestrator/blue6-*`；未改源码／证据原文件／tracker）。
> 被审：`aaf494d`／`4d98e5f`／`f433eb9`（HEAD `4959ed3`）。审查窗口 13:28–13:31Z。
> 依据：`docs/subagent-concurrency-protocol.md` §2／§2.3／§2.4／§3／§5.1／§6／§6.1 ＋ `dispatch-rules.md` §4.5 ＋ `t120-ruling-softdelete.md` ＋ `t88-delta-flake-ruling.md` §2／§5／§6。

## ① 路径所有权与禁区

三提交 name-only 合计 16 文件，**全部落在声明路径**：`aaf494d`(10)＝`src/analysis/{utils,series,exercise,review,diet,cross,weightCompare3,anomaly/common}.ts`＋`test/softdelete-120.test.mjs`＋`docs/research/t120-probe-softdelete.mjs`；`4d98e5f`(2)＝`src/cli/write.ts`＋`test/cmd-write-40-persist.test.mjs`；`f433eb9`(4)＝`.changeset/t120-softdelete-filter.md`＋`docs/research/{t120-gate-runs.log,t120-softdelete-filter.md,t120-supersedes-t101-softdelete.md}`。
禁区 `src/render/**`／`src/cli/cmd_read.ts`／`packages/base-render/**`／`tooling/**`／其余技能包：**0 命中**。
`aaf494d` 的 src 侧删除行只有 11 条查询 ＋ 6 条 import 行，`utils.ts` 只新增 `EX_ALIVE`。我独立 grep：analysis 层 12 处 `exercise_log` 查询**全部**带谓词；`render/trendMiscPort.ts:207,411`、`fetch/exercise.ts` 既有过滤未破。

## ② 授权边界（write.ts 逐 hunk）——**S1 所在**

`git show 4d98e5f -- …/write.ts` 共 4 组 hunk：

| hunk | 内容 | 判定 |
|---|---|---|
| `@@ -9,19 +9,20 @@` | 头部口径注释重写（指向 `EX_ALIVE`／supersedes #101） | 授权 |
| `@@ -117,7 +118,6 @@` | 删 `SOFT_STILL_COUNTED` | 授权 |
| `@@ -608/616/625 → +613/621/630 @@` | 三处运动删除回执改指 `SOFT_EXCLUDED` | 授权 |
| **`@@ -175,6 +175,11 @@` ＋ `@@ -866,7 +871,7 @@`** | **新增 `measureCliNames()` 5 行；记围度 `writtenFields: definedKeys(input)` → `measureCliNames(definedKeys(input))`** | **未授权** |

M5 回执逻辑**被动过**，不是「未触碰」。归属证据：`git log -S measureCliNames -- …/write.ts` 唯一命中 `4d98e5f`；全仓无其他引用、`t97-impl.md` 无记载；而 `t97-impl.md:90`／偏离 D-2 明定「`writtenFields` 用 CLI 参数名」→ 这是 **#97 的 M5 契约改动**。成因可复现：`gate-runs.log` `runId 77065d65`（13:04:23.761Z）`git add packages/skill-calorie/src/cli/write.ts packages/skill-calorie/test/cmd-write-40-persist.test.mjs` —— 文件级 add 把 #97 同文件未提交改动一并入库（与 #88 自报事故 `3f9d3e3` 同类，但本票**未自报**）。
后果：违反裁定「仅此两处、最小 diff」；commit message「不触碰 M5 回执逻辑（归 #97）」、证据 §8.2「仅常量＋紧邻注释＋三处引用（未触碰 M5 回执逻辑）」、票面偏离 1 —— 三处陈述**与提交内容不符**；#97 契约改动的 blame 落在 #120 提交下。

## ③ 历史证据完整性 ✓

`t101-softdelete-still-counted.mjs` 未被三提交触碰（name-only 无它；`git log` 仅 `01cb905`）→ **逐字未改**。`.changeset/t101-delete-wording-persist.md` 同样未被触碰。`docs/research/t101-write-persist-and-delete-wording.md` 在 `01cb905..HEAD` 有 59/19 行变化，但来自 #101 自己的 `8c5b42f`／`bf417a6`，非本票；证据 §9.2 已登记其过时文案。
我独立复跑 `node docs/research/t101-softdelete-still-counted.mjs` → **exit 1**（「H1 事实复核不成立：A 软删…文案承诺与实测不符」），与取代说明 §2 的预登记一致 → 反向证据成立。

## ④ 测试更新范围 ✓

`cmd-write-40-persist.test.mjs` 改动：头部注释（记 supersedes）＋ `SOFT_TAG` 归一为 `SOFT_EXCLUDED_TAG` 别名 ＋ 用例名改「软删后逐面排除（#120 口径收敛，supersedes #101 的『仍计入』口径）」＋ `deepEqual(metrics(), before)` 改为三条逐面断言（series→null／avgExerciseBurn→0／deficitToday−300）＋ 前置断言由 `>0` 收紧为 `==300`；列表侧 `exit 4` 与「无运动记录」断言**保留**。无删断言、无弱化，无范围外改动。

## ⑤ 门禁／对账（我自跑，逐条 exit）

持锁 `node tooling/run-locked.mjs --ticket 120`，本轮工作区干净（跑前跑后 `git status --short` 均无受跟踪改动）：

| 门／运行 | exit | 我的 runId |
|---|---|---|
| `pnpm build` | **0** | `3af7cb17-5cb7-43ac-b600-777a92f2bcba` |
| `pnpm boundaries` | **0** | `7bdd0325-17c3-4b5d-afbe-a6f1400d0d64` |
| `pnpm snapshot:check` | **0** | `25552965-2e28-4923-8886-6201b6f6d9f0` |
| `pnpm publish:pre` | **0** | `aaafbe38-3db3-4a35-a335-42b2ccc1d36d` |
| 靶向 `node --test softdelete-120 cmd-write-40-persist` | **0**（tests 21／pass 21／fail 0） | `3dad03b8-061a-49b0-a8ce-321ee6342404` |
| canonical `pnpm test` | **1**（tests 1091／pass 1066／fail 25，与证据一致） | `0d792312-61ea-4ad6-bb5c-ddd1ab11c50a` |

- delta：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt …/blue6-canonical.log` → **`base=34 after=29 新增=0 消失=5`（exit 0）**；消失 5 条与 `BASELINE.md` §4 抖动项逐字相同（`#41 M3`／`#76`／`#80`／`helpers JS ≤820px`／`③ check-combos`）→ 新增 0，§2 A/B/C 分类无需触发；当轮并发：另有 session 自 13:30:41Z 起以 `ticket=120` 跑变异轮（见 ⑨ 备注）。
- 白名单：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` = **0 行** ✓。
- **对账（缺陷）**：按证据 §7.4 声明命令（`--ticket 120 --since 2026-09-09T13:19:30Z --allow-nonzero`，**无 `--until`**）我实测 → **exit 1，`matched=7/7 scoped=10 undeclared=3`**（窗口内 3 条无人声明：`56598dd6 git add`、`9cd517ad git commit`、`319008d0` 靶向复跑 13:27:56Z）。加 `--until 2026-09-09T13:24:14.315Z`（＝导出文件头部自记的导出时间）→ **exit 0，matched=7/7 undeclared=0**。即「undeclared=0」只在证据未记载的窗口上界下成立；按 #88 返修 `7b4e891`「对账窗口 --since/--until（共享日志必需）」应补 `--until`。`--allow-nonzero` 的 `GATE-RELAX` 已写入证据 ✓（非私自放宽）。
- §7.1 引用的靶向 runId `848cc6b7`（13:04:16Z）在声明窗口外；窗口内同命令的 `319008d0` 未声明（记账）。

## ⑥ 提交纪律

无 `git add -A`／`git add .`（三次 add 均为显式路径：`1c0ce331`／`77065d65`／`56598dd6`）；全日志 grep `stash|reset --hard|checkout -- .|clean|restore .|switch|push|add -A` **0 命中**（`git checkout -- <自己路径>` 仅用于变异还原，协议 §5 允许）；无 push（`git log origin/master..HEAD` 非空＝本地领先远端）；`git reflog` 仅 commit 记录；证据 5/5 受 git 跟踪；每次 `pnpm test` 后 `git status --short` 无 ` M SKILL.md`（无零填充事故）。
⚠️ `git commit -F`（无 `--only`）在共享 index 下与 #88 事故同型：`f433eb9` 实际文件集恰为声明 4 文件（无连带），但 `4d98e5f` 因文件级 add 连带 #97 WIP（见 ②）。

## ⑦ tracker

`gh api issues/120`：`state=open`（**未提前 close**）、`assignees=FeatherHunter` ✓。body 首码位 **U+0023（无 BOM）**、LF 41 个（真实换行）、字面 `\n`／`\r` **各 0 处** ✓。认领为第一笔写操作 ✓：timeline 中 `assigned`＝2026-09-09T12:55:08Z，早于唯一 comment（13:24:45Z）；body「落地」段引 `f433eb9`（13:24:23Z），故必然晚于认领。票面偏离 1 复述了与 ② 相同的失实 scope 陈述。

## ⑧ 新探针（被审脚本覆盖不到）

- **P1 对账源一致性**：逐行比对 `docs/research/t120-gate-runs.log` 7 条 RUN 与 `.scratch/locks/gate-runs.log` → 每条恰出现 1 次且**逐字相同**（`exported=7 mismatch=0`）✓。
- **P2 analysis 层 import 图**（`pnpm boundaries` 之外，`.scratch/orchestrator/blue6-import-probe.mjs`）：枚举 `src/analysis/**` **106 条边／21 个目标**＝analysis 17＋fetch 2＋`kcal.js` 1＋`node:sqlite` 1；**反向依赖（analysis→cli／render／@pkg）＝0**；本票新增边仅 `./utils.js`、`../utils.js`（同层）✓。
- **P3 独立复跑探针**：`node docs/research/t120-probe-softdelete.mjs` → exit 0／`RESULT: 11/11`／`RESULT-ALL: 20/20`，与证据逐字一致 ✓。
- **P4 覆盖探针**：全 analysis 层 `exercise_log` 查询 12 处**全部**带谓词（无遗漏面）✓。

## ⑨ 缺陷清单

| # | 缺陷 | 归属 | 级别 |
|---|---|---|---|
| **D-1** | `4d98e5f` 连带提交 #97 的 M5 改动（`measureCliNames` ＋ 记围度 `writtenFields`），与授权「仅两处」及 commit message／证据 §8.2／票面偏离 1 的「未触碰 M5 回执逻辑」矛盾，且未自报 | **本票引入**（提交内容层） | **S1-过程违规（越权／连带他人 WIP）＋ S1-交付缺陷（scope 陈述失实）** |
| **D-2** | 对账声明缺 `--until`：声明的命令实测 FAIL（`undeclared=3`），与证据声称的 `undeclared=0` 不一致 | 本票范围 | **S2**（证据可复现性） |
| D-3 | §7.1 靶向 runId `848cc6b7` 在声明窗口外；窗口内同命令 `319008d0` 未声明 | 本票范围 | S3 |
| D-4 | 新测试断言文案仍写 `cross.ts:107-108`（证据已记漂移为 108,109） | 本票范围 | S3 |

范围外发现：无。备注（非缺陷）：13:30:41Z 起另有 session 以 `ticket=120` 跑变异轮（`6a0140db` build／`db80876f` test exit 1／`11d948fc` 还原），期间 `series.ts` 一度存在他方未提交变异；我**未触碰**其 WIP，我的门禁运行均在其之前、于干净树上完成。

## ⑩ 五维与 verdict

| 维度 | 满分 | 得分 | 依据 |
|---|---|---|---|
| 契约一致 | 30 | **24** | 口径收敛 11/11＋文案统一＋取代登记到位；授权边界被越（D-1） |
| 证据真实可复现 | 25 | **16** | 探针／四门／delta 均可复现；scope 陈述失实（D-1）＋对账窗口不可复现（D-2） |
| parity | 20 | **17** | #101 口径以取代说明＋测试同步落地；M5 `writtenFields` 口径被他票改动落在本票提交 |
| 工程红线 | 15 | **10** | 无危险 git／无 push／持锁齐备；文件级 add 连带他人 WIP、`git commit -F` 共享 index |
| 文档同步 | 10 | **7** | 证据／取代说明／changeset 齐备；两处 scope 陈述失实、窗口上界未记 |
| **均分** | 100 | **74** | — |

**verdict：FAIL**（存在 S1-交付缺陷 D-1；另 S2 一项须修）。
建议（审查者只能建议，裁决权在编排者）：D-1 功能面无危害（该改动为 #97 自测所需、已在 HEAD，未见用户可见回归），若拟走协议 §6.1② 具名书面比例处置，须先满足三要件（持锁复跑无分歧／`WAITED_*` 落盘／机械门禁对账）并由编排者具名出文，否则按字面作废重做；D-2 由 #120 补 `--until` 后重跑对账并更新 §7.4。
