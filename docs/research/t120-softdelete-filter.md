# #120 证据正本：软删记录不再计入用户可见统计（analysis 层 11 处补 `is_deleted` 过滤）

> 票：wayfinder 地图 #63 / [#120](https://github.com/FeatherHunter/ilife/issues/120)。
> 裁定正本：`docs/research/t120-ruling-softdelete.md`（编排者 · 冲突 A/B/C ＋ 跨票纪律）。
> 口径：**方向 1** —— 软删即不计入任何用户可见统计；与删除回执「已删除」一致。
> 落地 commit：`aaf494d`（11 处查询 ＋ 探针 ＋ 新测试）· `4d98e5f`（软删文案对齐 ＋ 同步 #101 口径用例；**该提交另含 #97 的 M5 hunk**——归属注记见 §8 第 5 条）。
> 本文件随 `docs/research/t120-probe-softdelete.mjs`（可复跑探针）与 `packages/skill-calorie/test/softdelete-120.test.mjs` 入仓。

## 0. 结论摘要

| 项 | 结果 |
| --- | --- |
| 探针（修复前） | `RESULT: 0/11`、`RESULT-ALL: 4/20` —— 11 处全部未过滤（`buildSeries.exerciseKcal` 350→350、`home.deficitToday` 2406→2406、`deficit.avgExerciseBurn` 350→350、`exerciseRows` 2→2） |
| 探针（修复后） | `RESULT: 11/11`、`RESULT-ALL: 20/20`、exit 0 |
| 逐面一致（软删后） | `view.exercise` exit 4（不变）／`view.home.deficitToday` 2406→2056／`view.deficit.avgExerciseBurn` 350→0／`view.health.avgDeficit` 2406→2056／`buildSeries.exerciseKcal` 350→null |
| 新增回归测试 | `test/softdelete-120.test.mjs` 4 用例（含 NULL 活行护栏 ＋ 硬删表护栏） |
| 变异自证 | 3 处 src 级（M1 series.ts／M2 anomaly/common.ts／M3 utils.ts 谓词写法），红→还原→绿 ＋ sha256 一致 |

## 1. 认领与提交

- 认领（本 session 第一笔写操作）：`gh issue edit 120 --add-assignee FeatherHunter`（实测 assignee = `FeatherHunter`；票面原本无 assignee）。
- `git show --stat aaf494d`（10 文件 / +393 −16）：`src/analysis/{utils,series,exercise,review,diet,cross,weightCompare3,anomaly/common}.ts` ＋ `test/softdelete-120.test.mjs`(新) ＋ `docs/research/t120-probe-softdelete.mjs`(新)。
- `git show --stat 4d98e5f`（2 文件 / +33 −22）：`src/cli/write.ts`（软删文案常量 ＋ 紧邻注释）＋ `test/cmd-write-40-persist.test.mjs`（#101 口径用例同步）。

## 2. 11 处逐处复算（影响面 ＋ 改法 ＋ `file:line`）

统一改法：`src/analysis/utils.ts:15` 新增唯一谓词
`export const EX_ALIVE = 'COALESCE(is_deleted, 0) = 0';`
11 处查询一律 `... AND ' + EX_ALIVE + ' ...`（与 fetch 层 `listWindow`（`fetch/exercise.ts:280`）同口径；
用 `COALESCE` 而非 `is_deleted = 0`，因历史行该列可为 NULL —— 见 §6 M3 与测试③）。

| # | 处（修复后行号） | 查询 | 唯一可观测面 | 修复前 → 修复后 | 用户可见面（实测） |
| --- | --- | --- | --- | --- | --- |
| 1 | `analysis/series.ts:113` | `buildSeries` 每日 `SUM(calories_burned)` | `buildSeries()[].exerciseKcal` / `deficit` | `350` → `null` | `view.home.deficitToday` 2406→2056；`view.health.avgDeficit` 2406→2056；`view.combined.bCount` 1→0；buildSeries 复用面（diet／goal*／predict／calorie-trend／long-trend…）随之同口径 |
| 2 | `analysis/exercise.ts:45` | `exerciseTrend` 行集 | `exerciseTrend().status` | `ok` → `error`（明确缺失阻断） | `view.health`（`dashboard.exercise` 维度） |
| 3 | `analysis/exercise.ts:86` | `exerciseTypeBreakdown` 聚合 | `exerciseTypeBreakdown().status` | `ok` → `error` | 无 CLI 键（库内 API；T5 测试面） |
| 4 | `analysis/exercise.ts:109` | `exerciseDeficitContribution` 合计 | `.data.exerciseDeficit` | `350` → `0` | 无 CLI 键（库内 API） |
| 5 | `analysis/exercise.ts:227` | `exerciseReview` 当日行 | `__meta__.totalCalories` / 当日 `actualTotalSets` | `350` / `2` → `0` / `0` | 无 CLI 键（库内 API；T5 测试面） |
| 6 | `analysis/review.ts:69` | `query5dims.dailyBurn` | `query5dims().dailyBurn.length` | `1` → `0` | 无 CLI 键（库内 API；T5 测试面） |
| 7 | `analysis/diet.ts:162` | `dietDeficitAnalysis` 每日运动 | `.data.avgExerciseBurn` | `350` → `0` | `view.deficit.metrics.avgExerciseBurn` 350→0；`view.health` HTML 的缺口维度 |
| 8 | `analysis/cross.ts:108,109` | `analyzePair` 力量/有氧分层 | `strat.extra` 力量/有氧行 | `力量消耗合计 100 卡 vs 有氧 250 卡` → `… 0 卡 vs 有氧 0 卡` | `view.combined`（`pair=weight_exercise`）extra 行 |
| 9 | `analysis/anomaly/common.ts:85` | `exerciseRows` 行集 | `exerciseRows().length` | `2` → `0` | `view.anomaly` 四 kind（`exercise_overload`／`exercise_type_imbalance`／`exercise_efficiency`／`exercise_advice`）——修复后 `exercise_type_imbalance` 转 exit 4「窗口内无运动记录」 |
| 10 | `analysis/weightCompare3.ts:68` | `scenarioC5` 月度聚合 | `scenarioC5()` | `2026-09(运动最少)` → `数据不足(需至少 2 个月有运动记录)` | 无 CLI 键（库内 API；体重对比 c5 场景） |

> 票面行号 `cross.ts:107-108`／`anomaly/common.ts:84` 因新增 `import { EX_ALIVE }` 一行而下移为 `108,109`／`85`；查询本体同一处。
> 「影响面」口径：**库级唯一可观测面**由探针逐处直调测得（每处只被该查询喂数），**用户可见面**由 CLI 键实测（`view.*`）。

### 2.1 跨面一致锚点（票面验收条 ①）

软删后实测（探针 `RESULT-ALL` 全绿）：

- `view.home.deficitToday` ＝ `buildSeries().deficit` ＝ `view.health.avgDeficit` ＝ **2056**；
- `view.deficit.avgExerciseBurn` ＝ `seriesAvg(exerciseKcal)`（全空时 CLI 归 0）＝ **0**；
- `view.exercise` exit **4**（列表侧 `fetch.listWindow` 早已过滤，修复前后同值 —— 这正是票面「一处说没有、一处仍在算」的另一半）。

## 3. 软删文案前后对照（`src/cli/write.ts`）

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| 常量 | `SOFT_STILL_COUNTED = '（软删除：行保留，仍计入历史统计；暂无恢复入口）'`（:121） | 删除该常量；三处运动删除回执改指既有 `SOFT_EXCLUDED`（`'（软删除：行保留，已从查询与统计中排除；暂无恢复入口）'`） |
| 引用点 | `write.ts:611,619,628`（删运动记录／删某日运动／批量删运动） | 同上三处，值随常量统一 |
| 头部注释 | `:12-24` 记「软删运动仍被统计／analysis 11 处未过滤」 | `:12-25` 记「已从查询与统计排除／`analysis/utils.ts:EX_ALIVE`／**supersedes #101**」 |
| 体脂／围度／下架食品 | 已是「已从查询与统计中排除」 | 不变（本次收敛后**全仓软删文案同款**） |

实测回执（探针输出）：`已删除运动 #2（软删除：行保留，已从查询与统计中排除；暂无恢复入口）`。

## 4. #101 取代关系

见 `docs/research/t120-supersedes-t101-softdelete.md`（谁取代谁／依据／日期／未被调用的核查）。
要点：#101 的历史事实快照 `docs/research/t101-softdelete-still-counted.mjs` **原样保留不改写**（它是当时口径的真实记录）；
其「事实 A/B」在 #120 落地后必然变红 —— 那正是读层已修的**反向证据**（该脚本 §305 已预登记此用法）。

## 5. 新回归测试 `packages/skill-calorie/test/softdelete-120.test.mjs`

| 用例 | 断言 |
| --- | --- |
| ① 逐面一致（票面验收条） | `buildSeries.exerciseKcal` → null；`view.deficit.avgExerciseBurn` → 0；`view.home.deficitToday` 减 350；`view.health.avgDeficit` ＝ home；`buildSeries.deficit` ＝ home；`view.exercise` exit 4 |
| ② 11 处逐处 | 每处唯一可观测面在软删后排除（与 §2 表一一对应，含 `scenarioC5` 转明确缺失阻断） |
| ③ 过度过滤护栏 | 直接插 `is_deleted IS NULL` 与 `is_deleted = 0` 两条活行 → 均应计入（`buildSeries` 150／`exerciseRows` 2）；写死 `is_deleted = 0` 即红 |
| ④ 硬删表护栏 | `food_log` 硬删后当日摄入为 null；新记体重可见（软删谓词不得误伤硬删表） |

靶向实测（持锁包装器）：`node --test packages/skill-calorie/test/softdelete-120.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs` →
**tests 21 / pass 21 / fail 0**，exit 0（`runId e99c654a-35a4-486f-bef5-73996635c1cd`，2026-09-09T13:37:30.120Z，
落在 §7.4 对账窗口内并已导出）。
> 更早一轮同命令 `runId 848cc6b7-c63f-4c18-be5e-f7a3234a5e2c`（13:04:16Z）在本次对账窗口之外、也不在导出对账源中，
> 仅作历史记录，**不再作为门禁证据引用**（返修 R-6/D-3）。

## 6. 变异自证（≥2 处 src 级；红 → 还原 → 绿 ＋ sha256）

| 变异 | 改动 | 红（实测） | 还原自证 |
| --- | --- | --- | --- |
| **M1** | `series.ts:113` 去掉 `AND ' + EX_ALIVE + '` | build exit 0（`runId 3843c895`）；`node --test softdelete-120` exit 1（`runId 93751f47`），2 条红：`AssertionError: buildSeries.exerciseKcal 应排除软删行` ＋ `series.ts:113 · buildSeries.exerciseKcal` | `git checkout -- series.ts`（`runId 69c615e3`）→ sha256 `7ADF4DE3…DCF03A`（与变异前逐字一致）→ build exit 0（`runId e1270987`）→ test **4/4 pass** exit 0（`runId 0e78c6c4`） |
| **M2** | `anomaly/common.ts:85` 去掉 `AND ' + EX_ALIVE + '` | build exit 0（`runId fcef9d3c`）；test exit 1（`runId ae29f99a`）→ `AssertionError: anomaly/common.ts:84 · exerciseRows`，`actual: 2 / expected: 0` | 与 M3 同轮还原（`git checkout -- common.ts utils.ts`，`runId c9da0d5c`）→ sha256 `61176624…35E4`／`C773A0C4…C2A` 复原 → build exit 0（`runId daad9b94`）→ test **4/4 pass** exit 0（`runId 936ec8f9`） |
| **M3** | `utils.ts:15` 谓词改 `is_deleted = 0`（漏 NULL） | 同轮 test exit 1 → `AssertionError: is_deleted IS NULL / =0 的活行都应计入（写死 is_deleted = 0 会漏 NULL）`，`actual: 30 / expected: 150` | 同上 |

> 三处变异均为 **src 级**（未走 `dist/` 例外）；还原一律 `git checkout -- <自己路径>`；跑前／还原后 sha256 逐字比对。
> M2／M3 同轮以省一次 build，红签名可区分：M2 命中 `exerciseRows`，M3 命中 NULL 活行护栏。

## 7. 门禁实测（含当轮并发上下文）

所有 build／test 均经持锁包装器 `node tooling/run-locked.mjs --ticket 120 -- <命令…>`；每条附 `runId`
（对账源 `.scratch/locks/gate-runs.log`，本次窗口导出见 `docs/research/t120-gate-runs.log`）。

### 7.1 四门 ＋ 靶向（逐条 exit）

| 命令 | exit | runId | 备注 |
| --- | --- | --- | --- |
| `pnpm build` | **0** | `a0ec2448-a69e-4f80-beb9-2f72c0926fb5` | 返修轮终态 build（13:37:15.937Z） |
| `pnpm boundaries` | **0** | `4f68b43c-c2c9-4b04-a03d-b833e689190f` | `boundaries: PASS`（未新增跨层反向依赖；analysis→utils 同层） |
| `pnpm snapshot:check` | **0** | `cb6845c4-6955-4213-8f44-4c9bf437445f` | 快照锚 `ilife-skills` 版本＋`combos.yaml`＋`present.ts`，与本次改动无关 |
| `pnpm publish:pre` | **0** | `e44d9540-bb88-4a98-9330-b4f701cf1848` | `check-publish --pre：PASS` |
| 靶向 `node --test packages/skill-calorie/test/softdelete-120.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs` | **0** | `e99c654a-35a4-486f-bef5-73996635c1cd` | tests 21 / pass 21 / fail 0 |
| 探针 `node docs/research/t120-probe-softdelete.mjs` | **0** | 无需持锁（只读临时库） | 返修轮复跑：`RESULT: 11/11`、`RESULT-ALL: 20/20` |

> 本表 runId 一律取**返修轮的终态运行**（全部落在 §7.4 对账窗口内，且已导出到 `docs/research/t120-gate-runs.log`）。
> 更早轮次的 runId（`daad9b94`／`3ab0ead3`／`7d612f03`／`f26fddf9`／`3fa40024`／`848cc6b7`，13:04–13:24Z）
> 见 git 历史中的本文件旧版，**不在本窗口、不再作为门禁证据引用**（返修 R-6/D-3）。

### 7.2 canonical `pnpm test` 失败集 delta

- 运行：`node tooling/run-locked.mjs --ticket 120 -- pnpm test` → `runId 7475e5c5-d99c-44ff-b8b0-afc0ddc73494`，**exit 1（既有红，非本票引入）**，`tests 1091 / suites 131 / pass 1066 / fail 25`。
- 判据：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t120/canonical-test-2.log`
  → **`base=34 after=29 新增=0 消失=5`**（exit 0）。
- 消失的 5 条＝基线 §4 登记的**抖动项**（`#41 M3`／`#76`／`#80`／`helpers JS ≤820px`／`③ check-combos`），
  非本票修复，也不放宽其余口径。
- 白名单 `docs/research/t88-baseline/test-failset.txt` **零改动**（`git diff 93e27f9 -- …` = 0 行）。
- 注：`cmd-write-40-persist.test.mjs:640` 的 #101 口径用例已按裁定同步为「软删后逐面排除」，
  故**未**产生新增失败（真 delta A 类由本票同步消化，未改白名单）。
- **他轮新增项的登记 ＋ 提请编排者裁（本 session 不自行援引豁免）**：红队独立复跑的那一轮 canonical 出现 `新增=2`，
  两条**均在 `packages/skill-home/test/cli.test.mjs`**（本票路径所有权之外、与本票改动无关），红队实测**单独复跑 2× 全绿**、**同树前轮（13:23:32Z）为绿**。
  按 `docs/research/t88-delta-flake-ruling.md` §2／§5／§6 的类别定义，其事实形态与「他票文件 ＋ 同树前轮绿 ＋ 单独复跑全绿」相符；
  但该裁定 §6 纪律明定「**只能**由编排者按三步判定逐条裁，session 不得自行援引第 1 条豁免」→ 本 session **只登记、不主张豁免**，**分类结论提请编排者裁**。
  本 session 自跑的返修轮 canonical **新增=0**（上一条），故本票自身 delta 无需任何豁免。

### 7.3 并发上下文（当轮）

- **返修轮（2026-09-09T13:36:44–13:37:58Z）**：工作区 `git status --short` 仅含本票路径 ` M packages/skill-calorie/test/softdelete-120.test.mjs`（注释行号修正），**无他票受跟踪 WIP**。
  并发：`#97` 红队 session 以 `ticket=97` 在 **13:36:15–13:37:11Z**（本票对账窗口**之前**）与 **13:38:01Z 起**（本票窗口**之后**）跑 build／测试；
  本票对账窗口 `[13:37:15.937Z, 13:38:04.305Z]` 内**无他票 `ticket=120` 的 RUN 条目**（窗口内 6 条全部为本票持锁运行）。
- 首轮（实施轮）运行窗口内工作区含**他票在飞 WIP**：`#97`（`src/cli/write.ts`／`src/render/receipt.ts`／`test/m5-receipt-97.test.mjs`，已由 `4671169`／`11be0c7` 收口）、`#88`（治理返修 `tooling/*` ＋ 协议）。
- 期间发生 **2 次断电重启**：① 21:05 左右 `.git/refs/heads/master` 被零填充，由编排者恢复（HEAD 回到 `4d98e5f`）；② 21:15 左右 `SKILL.md` 零填充 ＋ `#97` 的 `MUT-97-1` 变异残留，由编排者还原。
- 本票每次 `pnpm test` 后均 `git status --short` 自检：**无 ` M packages/skill-calorie/SKILL.md`**（无等长全 NUL 事故），亦无他票受跟踪文件被我方改动。
- 首轮 `pnpm build` 首次（`runId 069ef86b`）**exit 2**：报错仅落在 `#97` 在飞文件 `src/cli/write.ts(327,31)`／`(451,31)` 的 `TS2322`，本票 8 个 analysis 文件 0 报错 → 判定为他票 WIP 所致，等待其收口后重跑 exit 0（见 §7.1）。
- 对账导出：`docs/research/t120-gate-runs.log`（返修轮窗口 `[13:37:15.937Z, 13:38:04.305Z]` 的 6 条 `RUN` 条目）。

### 7.4 机械门禁对账声明（协议 §2.4）

对账窗口：`--ticket 120 --since 2026-09-09T13:37:15.937Z --until 2026-09-09T13:38:04.305Z`。
**窗口上界 `2026-09-09T13:38:04.305Z` ＝ 封窗导出快照头部自记的导出时间**：封窗时先执行一次 `--export`（落 `.scratch/t120/window-stamp.log`），
取其头部 `导出时间：2026-09-09T13:38:04.305Z` 作为 `--until`；最终对账源 `docs/research/t120-gate-runs.log` 头部 `until：2026-09-09T13:38:04.305Z` 与该值**逐字一致**
（其 `导出时间：2026-09-09T13:39:18.883Z` 是最终快照的落盘时刻，晚于窗口上界，不影响窗口内条目集合）。
窗口内 6 条 `RUN` 条目全部为本票返修轮的持锁运行（并发快照见 §7.3）。
窗口之外的运行（变异轮 `§6`、探索性 `069ef86b`、首轮旧条目、以及本文件提交后的 `git add`／`git commit`）**不入声明**，
也不参与反向对账 —— 这就是返修 R-2/D-2 要求的「把窗口上界写进声明」。

GATE-RUN runId=a0ec2448-a69e-4f80-beb9-2f72c0926fb5 cmd=pnpm build
GATE-RUN runId=4f68b43c-c2c9-4b04-a03d-b833e689190f cmd=pnpm boundaries
GATE-RUN runId=cb6845c4-6955-4213-8f44-4c9bf437445f cmd=pnpm snapshot:check
GATE-RUN runId=e44d9540-bb88-4a98-9330-b4f701cf1848 cmd=pnpm publish:pre
GATE-RUN runId=e99c654a-35a4-486f-bef5-73996635c1cd cmd=node --test packages/skill-calorie/test/softdelete-120.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs
GATE-RUN runId=7475e5c5-d99c-44ff-b8b0-afc0ddc73494 cmd=pnpm test

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 的 exit 1 是**基线既有红**（`BASELINE.md` §4：991 pass／26 fail，exit 1；本票判据为「具名失败集新增 0」，实测 `base=34 after=29 新增=0`），非本票引入、也不是本票验收门；其余 5 条均为 exit=0。

对账命令（**逐字复跑**）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t120-softdelete-filter.md \
  --ticket 120 --since 2026-09-09T13:37:15.937Z --until 2026-09-09T13:38:04.305Z --allow-nonzero
```

实测输出（2026-09-09T13:39Z，**exit 0**）：

```
RESULT: matched=6/6 auditEntries=189 scoped=6 undeclared=0
gate-audit: PASS
```

> `auditEntries` 是共享日志在复跑时刻的总条目数（并发下会继续增长）；`scoped`／`matched`／`undeclared`
> 由**固定的窗口上界**决定，故复跑结果稳定。

导出命令（同窗口，一次性执行，已把窗口内 6 条 `RUN` 落入受 git 跟踪的对账源）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t120-softdelete-filter.md \
  --ticket 120 --since 2026-09-09T13:37:15.937Z --until 2026-09-09T13:38:04.305Z --allow-nonzero \
  --export docs/research/t120-gate-runs.log
```

**R-2/D-2 闭环说明**：旧版声明的命令缺 `--until`，按字面复跑会把导出快照之后（含本票自身 `git add`／`git commit`）
与窗口内他方 `ticket=120` 运行算作 `undeclared`（红队实测 2 条、蓝队实测 3 条）→ `gate-audit: FAIL`。
现声明自带窗口上界（＝导出快照头部自记时间），窗口内 6 条 `RUN` **全部已声明**、`runId` 一对一命中，
故 `undeclared=0` 与命令**逐字绑定**，不再依赖「提交前执行」这类未写明的时序；上界固定后，提交后的 `git add`／`git commit`
（`ticket=120`）落在窗口外，不会影响该结论。

## 8. 偏离记账

1. **行号漂移**：票面 `cross.ts:107-108`／`anomaly/common.ts:84` 在修复后为 `108,109`／`85`（新增 import 行所致），查询本体未变。
2. **文案修复的授权路径 ＋ 连带 hunk 归属**：`src/cli/write.ts` 本不在原派单所有权内；经编排者具名授权（`t120-ruling-softdelete.md` §冲突A）后在干净窗口内改动本票范围（常量 ＋ 紧邻注释 ＋ 三处引用）。**该提交实际另含第 4 组 hunk**（`measureCliNames` ＋ 记围度 `writtenFields`），**属 #97 的 M5 回执语义**、经共享 index 连带入本提交 —— 见第 5 条；本票**不再声称「未触碰 M5 回执逻辑」**。
3. **#101 用例被改写**：`cmd-write-40-persist.test.mjs:640-660` 由「删前=删后」改为「软删后逐面排除」，按裁定标注「supersedes #101」；白名单 34 条未改。
4. **探针口径修正 2 处**（探针自身缺陷，非产品缺陷）：① `strat.extra` 是 `string[]` 而非对象数组；② `view.anomaly` 修复后不是 `degraded=1` 而是 **exit 4**（明确缺失阻断），断言随之改为「exit 4 ＋ 文案含『无运动记录』」；③ `seriesAvg` 全空返 null 而 CLI 归 0，断言改为 `?? 0`。
5. **`4d98e5f` 的连带 hunk 归属注记（返修 R-1；依维护者裁定 `t120-ruling-swept-commit.md` 记 S3，不判缺陷、不阻断关闭）**：
   该提交对 `src/cli/write.ts` 共 4 组 hunk，前三组属本票授权范围（头部口径注释／删 `SOFT_STILL_COUNTED`／三处运动删除回执改指 `SOFT_EXCLUDED`）；
   **第 4 组**＝`@@ -175,6 +175,11 @@` 新增 `measureCliNames()`（5 行）＋ `@@ -866,7 +871,7 @@` 记围度 `writtenFields: definedKeys(input)` → `measureCliNames(definedKeys(input))`。
   归属证据：`git log -S measureCliNames -- packages/skill-calorie/src/cli/write.ts` **唯一命中 `4d98e5f`**；该语义属 **#97 的 M5 回执契约**（`4671169` 落地；`t97-impl.md:90`／偏离 D-2 明定 `writtenFields` 用 CLI 参数名），
   系**共享 index 下文件级 `git add` 连带**（与 #88 自报事故 `3f9d3e3` 同型）。裁定第 1／2 条：「提交里含他人未提交代码」本身不构成缺陷，但**须如实补注归属** → 本条即补注；
   功能面：全仓无其他引用、无测试依赖该口径，未见用户可见回归。

## 9. 未做／未确证

1. **`docs/research/t101-softdelete-still-counted.mjs` 未改**（禁止改写历史证据）：它现在会 exit 1（事实 A/B 断言的是修复前行为）。**未被 `package.json`／CI 调用**（`git grep` 只命中 `.changeset/t101-*.md`／`docs/research/t101-*.md`／`t101-mutation.mjs` 的 `extra` 字段），故按裁定保持原样，取代关系见 `t120-supersedes-t101-softdelete.md`。
2. **`.changeset/t101-delete-wording-persist.md` 与 `docs/research/t101-write-persist-and-delete-wording.md` 的文案描述已过时**（仍写「仍计入历史统计」）：属 #101 的历史文件，未改；已在 §4 文档登记。
3. **其他 5 技能／插件包未动**（路径所有权外）。
4. **未确证**：`scenarioC5` 之外的其他体重对比场景（c1–c4／d4／e*）无运动查询，未逐一复算（grep 证据：`weightCompare*.ts` 仅 `weightCompare3.ts:68` 命中 `exercise_log`）。
5. **R-3 未做（判定：超本票口径范围 → 转票）**：软删行仍可被 `calorie.exercise.update` 成功回执（红队 E1：回执「已更新运动 #2」）；按 id 重复删报成功（E2：「已删除」）而按日重复删报缺失（E3：exit 4「无运动记录」）。
   **理由**：#120 的口径对象是**读层统计**（`is_deleted` 过滤；票面验收条只涉 `view.*`／`buildSeries` 的数值一致性），E1–E3 属**写层回执／幂等语义**，与「是否计入统计」正交，且**非本票引入**（本票对 `write.ts` 只改文案常量与紧邻注释，未动 update／remove 分支）。
   **转票措辞（建议新票）**：`写层回执与软删幂等语义不一致：update 对已软删行报成功、按 id 重复删报成功而按日重复删报缺失`；验收＝三处回执语义自洽 ＋ 相应测试。
6. **R-4 未做（范围外 → 转票，本票不做）**：`body_composition`／`body_measurements.is_deprecated` **可空**（`schema.ts:95,112`），读层仍用 `is_deprecated = 0`（`series.ts:119,122`／`cross.ts:145-146`／`fetch/body.ts:131,155,166,197,215,222,231`）→ 与 #120 刚钉死的「`COALESCE` 保住 `is_deleted IS NULL` 活行」**同类 NULL 风险未收敛**。
   **转票措辞（建议新票）**：`body_composition／body_measurements 的 is_deprecated 可空，但读层用 is_deprecated = 0 → NULL 活行被静默排除（与 #120 的 COALESCE 口径不一致）`；验收＝统一谓词（如 `COALESCE(is_deprecated, 0) = 0`）＋ NULL 活行护栏测试。
7. **新测试另一条注释行号未改（提请编排者裁）**：本批只把两席一致指认的 `cross.ts:107-108` 改为 `cross.ts:108,109`（与源码实测一致）。
   同文件另一条断言文案仍写 `anomaly/common.ts:84`（§2 表记漂移后为 `:85`）——**未改**，理由：该字符串是 §6 M2 变异红签名的**引文**（`AssertionError: anomaly/common.ts:84 · exerciseRows`），改字面会让既有引文不可复现；是否同步为 `:85` **提请编排者裁**。
   裁定（编排者 2026-09-09）：引文行号＝**变异当时**（M2 红签名）；**保持现状不改**。

## 10. 风险 top3

1. **口径反转的连锁面**：`buildSeries` 是「数列唯一源」，其 `exerciseKcal` 反转会传导到 12+ 个 `view.*` 键（diet／goal*／predict／calorie-trend／long-trend／insight 等）。本票只逐面验证了票面点名的 5 个面 ＋ combined／anomaly；其余键靠「同一查询、同一谓词」推导。若某键语义确实需要「历史全量含已删」，需另开票（本票未发现此类键）。
2. **历史数据含 NULL**：`exercise_log.is_deleted` 历史行可能为 NULL（`COALESCE` 已处理，测试③ 钉住）；若未来有人「简化」为 `is_deleted = 0`，NULL 活行会静默消失 —— 已用测试③＋变异 M3 双向钉死。
3. **并发窗口污染门禁结论**：本轮多 session 并发（含 #97／#88 在飞 WIP 与一次断电重启）。门禁结论已附 §7.3 快照；若审查者复跑时工作区仍含他票 WIP，需按 `docs/research/t88-delta-flake-ruling.md` 分类后再判 delta。

## 11. 审查返修闭环（红队 `t120-review-red.md` `525cc2e` ／ 蓝队 `t120-review-blue.md` `fb04a10` ／ 裁定 `t120-ruling-swept-commit.md` `d915f89`）

> 合并口径：D-1 的 S1 已由 `d915f89` **撤销**（连带提交他人代码不构成缺陷）→ 本票**无 S1**；
> 关闭前置＝**R-2/D-2**（S2），其余为 S3 记账。

| 项 | 级别 | 处置 | 位置 |
| --- | --- | --- | --- |
| **R-2 / D-2** 对账声明缺 `--until`（命令不可复现） | **S2（关闭前置）** | **已修**：窗口上界写进声明（`--until 2026-09-09T13:38:04.305Z` ＝ 导出快照头部自记导出时间），窗口内 6 条 `RUN` 全部声明；**逐字复跑 `exit 0`／`matched=6/6`／`undeclared=0`** | §7.4 |
| **R-1** `4d98e5f` 连带 #97 的 M5 hunk 而陈述称「未触碰」 | S3（依 `d915f89`） | **已补归属注记**：第 4 组 hunk（`measureCliNames` ＋ 记围度 `writtenFields`）属 #97 M5 语义、经共享 index 连带；票面「偏离 1」措辞同步改写 | §8 第 2／5 条 ＋ 票面 |
| **R-5 / D-4** 新测试注释写 `cross.ts:107-108` | S3 | **已修**：改为 `cross.ts:108,109`（源码实测 108,109 两行查询） | `test/softdelete-120.test.mjs:165` |
| **R-6 / D-3** §7.1 头号靶向 runId `848cc6b7` 在窗口外 | S3 | **已修**：§5／§7.1 改引**窗口内**实际运行的 `e99c654a-35a4-486f-bef5-73996635c1cd`；旧 `848cc6b7` 降为历史记录、不再作门禁证据 | §5／§7.1 |
| **R-3** 写层回执／幂等语义不自洽 | S3（非本票引入） | **未做 ＋ 转票**（判定超本票口径范围） | §9 第 5 条 |
| **R-4** `is_deprecated` 可空但读层 `= 0`（同类 NULL 风险） | S3（范围外） | **未做 ＋ 转票**（具名建议新票） | §9 第 6 条 |
| 他轮 canonical 新增 2 条（`packages/skill-home/test/cli.test.mjs`） | 分类待裁 | **只登记、不自行援引 `t88-delta-flake-ruling.md` §6 豁免**，提请编排者裁 | §7.2 |

返修轮实测：四门 `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` **逐条 exit 0**（`a0ec2448`／`4f68b43c`／`cb6845c4`／`e44d9540`）；
靶向 **tests 21／pass 21／fail 0** exit 0（`e99c654a`）；canonical `pnpm test` **exit 1（基线既有红）**＋ delta **`新增=0 消失=5`**（`7475e5c5`）；
白名单 `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` **0 行**；对账 **`exit 0 / undeclared=0`**。
