# #120 红队审查：软删记录仍计入统计（analysis 层 11 处补过滤 ＋ 文案收敛）

> 被审：`aaf494d`／`4d98e5f`／`f433eb9`（HEAD 开工时 `a2e95be`）。独立复跑，不采信实施者结论。
> 探针正本（我自写，不入仓，路径在 `.scratch/orchestrator/red6-probe-softdelete.mjs`）＋ 逐条实测见下。
> 说明：维护者裁定 `d915f89`（「连带提交他人代码不构成缺陷」）于本审查进行中入仓，R-1 的定级依该裁定（见 ⑦）。

## ① 复跑清单（全部我自跑，exit 逐条）

| 命令 | exit | 实测 |
| --- | --- | --- |
| `node docs/research/t120-probe-softdelete.mjs` | **0** | `RESULT: 11/11`、`RESULT-ALL: 20/20`（与证据一致） |
| 靶向（持锁）`node --test softdelete-120.test.mjs cmd-write-40-persist.test.mjs` | **0** | tests 21／pass 21／fail 0（`319008d0`） |
| `pnpm build`（持锁，变异轮共 6 次） | **0** | 每次重建后复跑绿 |
| `pnpm boundaries`／`snapshot:check`／`publish:pre` | **0** | `ca2a48e7`／`c479b99f`／`2487a12e` |
| canonical `pnpm test`（持锁，**1 轮**） | **1** | tests 1091／pass 1065／fail 26；fail-set `base=34 after=31 新增=2 消失=5` |
| 我自写探针 `red6-probe-softdelete.mjs` | **0** | `RED6-RESULT: 36/36` |

canonical 新增 2 条**均在 `packages/skill-home/test/cli.test.mjs`**——不在本票所有权、与本票改动无关；**单独复跑 2× 均 7/7 exit 0**（`red6-home-1/2.log`），同树前轮（实施者 13:23:32Z）为绿 → 顺序／环境污染（delta 判据 §2 修订 2 第 2/3 步）；豁免须**编排者**裁。消失 5 条与基线抖动项逐字相同。

## ② 逐条验收对表

1. **11 处齐备**：`git grep exercise_log -- src/analysis` 13 行查询（`cross.ts` 2 行）**全部**带 `EX_ALIVE`；行号漂移记账属实。
2. **唯一谓词／parity**：`utils.ts:15` 的 `COALESCE(is_deleted, 0) = 0` 与 fetch 层 `fetch/exercise.ts:282 listWindow` **逐字同口径**。
3. **测试更新授权**：`cmd-write-40-persist.test.mjs:643` 用例名标注「#120 口径收敛，supersedes #101 的『仍计入』」，断言改为逐面排除 ✓。
4. **#101 历史证据**：`git diff aaf494d~1 HEAD -- docs/research/t101-softdelete-still-counted.mjs` = **0 行**（原样保留）；`package.json`／`.github`／`tooling` **0 命中**（未被调用）✓。
5. **门禁／对账**：四门 exit 0 复现 ✓；`matched=7/7` 复现 ✓，但字面命令复跑 FAIL（R-2）＋ 窗口与声明不一致（R-6）。

## ③ 口径一致性独立验证（自建场景，36/36 PASS）

自建种子（当日 有氧250＋力量100＝350、上月 500、体重 4 条），走 CLI 删法（按 id／按日），逐面断言：

- **全排除且互相一致**：`buildSeries.exerciseKcal` 350→**null**；`home.deficitToday` 2406→2056；`health.avgDeficit`＝home；`buildSeries.deficit`＝home；`deficit.avgExerciseBurn`＝`seriesAvg(exerciseKcal) ?? 0`＝**0**；`combined(weight_exercise).bCount` 1→0；`view.exercise` exit **4**。
- **③ 传导键抽样（≥3）**：`exercise-recap`／`exercise-trend`（`peakBurned` 消失）／`exercise-distribution` 均由 350 转缺失或 0；另加 `home.avgDeficit`（周均 −350）、`combined --pair calorie_exercise`（**另一 pair**）、`six-factors.exercise`→0、**anomaly 全部 5 个 exercise kind**（HTML 无「跑步／卧推／350」残留）；对照 `view.diet.totalCalories` **不变**。
- **① NULL 活行**：直插 `is_deleted`=NULL／0／1 三态 → `buildSeries`=**150**、`exerciseRows`=**2**；边界行（`is_deleted=1` 其余列全空）被排除；M3 下探针同步红（30／1）。
- **② 硬删表**：`food_log` 硬删后摄入 null、新记体重 69.0 可见；`food_log` 无 `is_deleted` 列。

## ④ 文案与回执（自读代码，非只信证据）

`write.ts:121-123` 单一来源；三处运动删除（`:616/:624/:633`）＋体脂（`:853`）＋围度（`:881`）＋下架食品（`:742`）**同款**「软删除：行保留，已从查询与统计中排除；暂无恢复入口」；硬删（`:360/:505`、`render/photo.ts:274`）另档。实测回执逐条含同一词条；全仓软删回执**无**「仍计入」（残留仅在 #101 历史文件）。`EX_CAMEL` 不含 `is_deleted`（CLI 无法复活）＋ 全仓 0 restore 入口 →「暂无恢复入口」成立。

## ⑤ 变异复核（独立重跑 3 处 src 变异；每处**立即**还原＋重建）

| 变异 | 红签名（实测） | 我的探针同轮 | 还原 sha256 | 还原后 |
| --- | --- | --- | --- | --- |
| M1 `series.ts:113` 去 `EX_ALIVE` | `buildSeries.exerciseKcal 应排除软删行`，exit 1 | 红 29/36 | `7ADF4DE3…DCF03A` 一致 | build 0／test 4/4 绿 |
| M2 `anomaly/common.ts:85` | `exerciseRows`，exit 1 | 红 34/36 | `61176624…35E4` 一致 | build 0／test 绿 |
| M3 `utils.ts` 谓词改 `is_deleted = 0` | `is_deleted IS NULL …活行都应计入`，exit 1 | 红 34/36 | `C773A0C4…C2A` 一致 | build 0／test 绿 |

三处 sha 与实施者报告逐字相同；还原后**均 `pnpm build` 重建再复跑**（避开陈旧 `dist` 假红）。变异期我自写探针**也红**——排除「脚本自我满足」。

## ⑥ 新探针（被审脚本覆盖不到）＋ 相邻写层实测

除 ③ 的盲区覆盖外，实测 4 项**相邻写层行为**：**E1** `calorie.exercise.update` 对**已软删行** exit 0「已更新运动 #2」；**E2** 按 id 重复删 exit 0 再报「已删除」；**E3** 按日重复删 exit 4「无运动记录」；**E4** 删不存在 id exit 4。

## ⑦ 缺陷清单

| # | 内容 | 归属 | 级别 |
| --- | --- | --- | --- |
| **R-1** | `4d98e5f` 的 `write.ts` diff **含第 4 处改动**：新增 `measureCliNames`（`@@ -175,6 +175,11 @@`）＋ 记围度 `writtenFields: measureCliNames(definedKeys(input))`（`@@ -866,7 +871,7 @@`，现 `write.ts:874`）——属 **#97 的 M5 回执语义**（`4671169` 落地）；`git log -S measureCliNames` 仅命中本提交，无测试依赖该口径。与授权「**仅**文案常量＋紧邻注释」、commit message 与证据 §8.2「未触碰 M5 回执逻辑」**三处矛盾**。**定级依维护者裁定 `d915f89`**：S1 撤销 → **S3**，但须按该裁定第 2 条**如实补注归属** | 本票引入 | **S3**（裁定后；若不采纳 `d915f89` 则为 S1-过程违规 → FAIL） |
| **R-2** | 对账声明缺 `--until`：按证据 §7.4 字面命令（我以 `--until 13:27:00Z` 界定自己运行前）复跑 → `matched=7/7 undeclared=2`（两条＝其自身 `git add`／`git commit`，13:24:22/23 晚于导出快照 13:23:32）→ **gate-audit FAIL**；`undeclared=0` 仅在「提交前执行」这一未写明时序下成立 | 本票范围 | **S2**（证据可复现性；裁定 `d915f89` 第 3 条同样认定须修） |
| R-3 | 软删行仍可被 `update` 成功回执（E1）；按 id 重复删报成功而按日删报缺失（E2/E3）——与「已从查询与统计中排除」并存时回执语义不自洽 | 本票范围相邻，**非本票引入** | S3（建议另票） |
| R-4 | `body_composition`／`body_measurements.is_deprecated` **可空**（`schema.ts:95,112`），读层仍是 `is_deprecated = 0`（`series.ts:119,122`／`cross.ts:145-146`／`fetch/body.ts:131,155,166,197,215,222,231`）——与 #120 刚钉死的「COALESCE 保 NULL 活行」同类风险未收敛 | 范围外 | S3（转票） |
| R-5 | 新测试注释仍写 `cross.ts:107-108`（证据已记漂移为 108,109） | 本票范围 | S3 |
| R-6 | 证据 §7.1 的靶向 21/21 用 `runId 848cc6b7`（**13:04:05Z**），落在 §7.4 声明窗口 `--since 13:19:30Z` **之外**，且不在导出对账源 `docs/research/t120-gate-runs.log` 中（0 命中）→ 头号靶向证据未被对账覆盖 | 本票范围 | S3 |

未发现证据造假：探针值、四门 exit、靶向 21/21、`matched=7/7`、三处变异 sha 均**逐条复现**；差异仅在窗口／时序记述（R-2／R-6）。

## ⑧ 五维与 verdict

| 维度 | 满分 | 得分 | 依据 |
| --- | --- | --- | --- |
| 契约一致 | 30 | 30 | 11 处＋口径一致＋文案一致全部独立验证成立 |
| 证据真实可复现 | 25 | 20 | 全部数值复现；R-2（命令不可复跑）＋R-6（靶向 runId 不在窗口）＋§8.2 归属注记待补 |
| parity | 20 | 19 | 36/36 一致（含传导键／另一 pair／5 个 kind）；余 12+ 键仍靠推导 |
| 工程红线 | 15 | 13 | 持锁包装器／无危险 git／测试后自检均合规；共享 index 归属注记待补（S3） |
| 文档同步 | 10 | 8 | 证据／取代说明／changeset／对账源齐备；R-1／R-2／R-5 需补注 |
| **均分** | 100 | **90** | ≥85 |

**verdict：PASS（初审）**——无 S1；技术面（11 处过滤、逐面口径一致、文案收敛、变异可复现）**我独立验证全部成立**。
**关闭前置（S2）**：R-2 须修（对账命令补 `--until` 或改写为可复跑形式）；R-1／R-3…R-6 按 S3 记账（R-1 须补归属注记）。**注**：R-1 的 S1→S3 降级**依维护者裁定 `d915f89`**，非我自行援引 §6.1 ②；若该裁定不成立，R-1 回到 S1-过程违规 → 本票 FAIL（技术面结论不变）。
