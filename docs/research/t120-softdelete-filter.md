# #120 证据正本：软删记录不再计入用户可见统计（analysis 层 11 处补 `is_deleted` 过滤）

> 票：wayfinder 地图 #63 / [#120](https://github.com/FeatherHunter/ilife/issues/120)。
> 裁定正本：`docs/research/t120-ruling-softdelete.md`（编排者 · 冲突 A/B/C ＋ 跨票纪律）。
> 口径：**方向 1** —— 软删即不计入任何用户可见统计；与删除回执「已删除」一致。
> 落地 commit：`aaf494d`（11 处查询 ＋ 探针 ＋ 新测试）· `4d98e5f`（软删文案对齐 ＋ 同步 #101 口径用例）。
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

靶向实测（持锁包装器）：`node --test softdelete-120.test.mjs cmd-write-40-persist.test.mjs` →
**tests 21 / pass 21 / fail 0**，exit 0（`runId 848cc6b7-c63f-4c18-be5e-f7a3234a5e2c`）。

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
| `pnpm build` | **0** | `daad9b94-4854-41ef-920f-671a2f4db131` | 变异还原后终态 build（另有 M1／M2 轮 build exit 0：`3843c895`／`fcef9d3c`） |
| `pnpm boundaries` | **0** | `3ab0ead3-881d-4d2e-a944-62f39a37eb88` | `boundaries: PASS`（未新增跨层反向依赖；analysis→utils 同层） |
| `pnpm snapshot:check` | **0** | `7d612f03-2e39-447b-b8c3-4b258741340a` | 快照锚 `ilife-skills` 版本＋`combos.yaml`＋`present.ts`，与本次改动无关 |
| `pnpm publish:pre` | **0** | `f26fddf9-6243-47fd-b564-62617c5b4b43` | `check-publish --pre：PASS` |
| 靶向 `node --test softdelete-120.test.mjs cmd-write-40-persist.test.mjs` | **0** | `848cc6b7-c63f-4c18-be5e-f7a3234a5e2c` | tests 21 / pass 21 / fail 0 |
| 探针 `node docs/research/t120-probe-softdelete.mjs` | **0** | 无需持锁（只读临时库） | `RESULT: 11/11`、`RESULT-ALL: 20/20` |

### 7.2 canonical `pnpm test` 失败集 delta

- 运行：`node tooling/run-locked.mjs --ticket 120 -- pnpm test` → `runId 3fa40024-ac03-4d30-9a1e-4da2d3442347`，**exit 1（既有红，非本票引入）**，`tests 1091 / suites 131 / pass 1066 / fail 25`。
- 判据：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t120/canonical-test-1.log`
  → **`base=34 after=29 新增=0 消失=5`**（exit 0）。
- 消失的 5 条＝基线 §4 登记的**抖动项**（`#41 M3`／`#76`／`#80`／`helpers JS ≤820px`／`③ check-combos`），
  非本票修复，也不放宽其余口径。
- 白名单 `docs/research/t88-baseline/test-failset.txt` **零改动**（`git diff 93e27f9 -- …` = 0 行）。
- 注：`cmd-write-40-persist.test.mjs:640` 的 #101 口径用例已按裁定同步为「软删后逐面排除」，
  故**未**产生新增失败（真 delta A 类由本票同步消化，未改白名单）。

### 7.3 并发上下文（当轮）

- 运行窗口内工作区含**他票在飞 WIP**：`#97`（`src/cli/write.ts`／`src/render/receipt.ts`／`test/m5-receipt-97.test.mjs`，已由 `4671169`／`11be0c7` 收口）、`#88`（治理返修 `tooling/*` ＋ 协议）。
- 期间发生 **2 次断电重启**：① 21:05 左右 `.git/refs/heads/master` 被零填充，由编排者恢复（HEAD 回到 `4d98e5f`）；② 21:15 左右 `SKILL.md` 零填充 ＋ `#97` 的 `MUT-97-1` 变异残留，由编排者还原。
- 本票每次 `pnpm test` 后均 `git status --short` 自检：**无 ` M packages/skill-calorie/SKILL.md`**（无等长全 NUL 事故），亦无他票受跟踪文件被我方改动。
- `pnpm build` 首次（`runId 069ef86b`）**exit 2**：报错仅落在 `#97` 在飞文件 `src/cli/write.ts(327,31)`／`(451,31)` 的 `TS2322`，本票 8 个 analysis 文件 0 报错 → 判定为他票 WIP 所致，等待其收口后重跑 exit 0（见 §7.1）。
- 对账导出：`docs/research/t120-gate-runs.log`（本票窗口的 `RUN` 条目）。

### 7.4 机械门禁对账声明（协议 §2.4）

对账窗口：`--ticket 120 --since 2026-09-09T13:19:30Z`（终态一轮；早于此窗口的探索性运行
（含 `runId 069ef86b` 因他票 WIP 而 exit 2 的 build）不在本窗口内，故不入声明；变异轮的运行另在
`§6` 逐条给出 runId，同样不在本窗口）。

GATE-RUN runId=c9da0d5c-f8fe-488b-b9f9-27d48aba5b89 cmd=git checkout -- packages/skill-calorie/src/analysis/anomaly/common.ts packages/skill-calorie/src/analysis/utils.ts
GATE-RUN runId=daad9b94-4854-41ef-920f-671a2f4db131 cmd=pnpm build
GATE-RUN runId=936ec8f9-d862-4869-b15b-031dd53bc171 cmd=node --test packages/skill-calorie/test/softdelete-120.test.mjs
GATE-RUN runId=3ab0ead3-881d-4d2e-a944-62f39a37eb88 cmd=pnpm boundaries
GATE-RUN runId=7d612f03-2e39-447b-b8c3-4b258741340a cmd=pnpm snapshot:check
GATE-RUN runId=f26fddf9-6243-47fd-b564-62617c5b4b43 cmd=pnpm publish:pre
GATE-RUN runId=3fa40024-ac03-4d30-9a1e-4da2d3442347 cmd=pnpm test

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 的 exit 1 是**基线既有红**（`BASELINE.md` §4：991 pass／26 fail，exit 1；本票判据为「具名失败集新增 0」，实测 `base=34 after=29 新增=0`），非本票引入、也不是本票验收门；其余 6 条均为 exit=0。

对账命令（实测）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t120-softdelete-filter.md \
  --ticket 120 --since 2026-09-09T13:19:30Z --allow-nonzero \
  --export docs/research/t120-gate-runs.log
```

## 8. 偏离记账

1. **行号漂移**：票面 `cross.ts:107-108`／`anomaly/common.ts:84` 在修复后为 `108,109`／`85`（新增 import 行所致），查询本体未变。
2. **文案修复的授权路径**：`src/cli/write.ts` 本不在原派单所有权内；经编排者具名授权（`t120-ruling-softdelete.md` §冲突A）后在干净窗口内改动，**仅常量 ＋ 紧邻注释 ＋ 三处引用**（未触碰 M5 回执逻辑）。
3. **#101 用例被改写**：`cmd-write-40-persist.test.mjs:640-660` 由「删前=删后」改为「软删后逐面排除」，按裁定标注「supersedes #101」；白名单 34 条未改。
4. **探针口径修正 2 处**（探针自身缺陷，非产品缺陷）：① `strat.extra` 是 `string[]` 而非对象数组；② `view.anomaly` 修复后不是 `degraded=1` 而是 **exit 4**（明确缺失阻断），断言随之改为「exit 4 ＋ 文案含『无运动记录』」；③ `seriesAvg` 全空返 null 而 CLI 归 0，断言改为 `?? 0`。

## 9. 未做／未确证

1. **`docs/research/t101-softdelete-still-counted.mjs` 未改**（禁止改写历史证据）：它现在会 exit 1（事实 A/B 断言的是修复前行为）。**未被 `package.json`／CI 调用**（`git grep` 只命中 `.changeset/t101-*.md`／`docs/research/t101-*.md`／`t101-mutation.mjs` 的 `extra` 字段），故按裁定保持原样，取代关系见 `t120-supersedes-t101-softdelete.md`。
2. **`.changeset/t101-delete-wording-persist.md` 与 `docs/research/t101-write-persist-and-delete-wording.md` 的文案描述已过时**（仍写「仍计入历史统计」）：属 #101 的历史文件，未改；已在 §4 文档登记。
3. **其他 5 技能／插件包未动**（路径所有权外）。
4. **未确证**：`scenarioC5` 之外的其他体重对比场景（c1–c4／d4／e*）无运动查询，未逐一复算（grep 证据：`weightCompare*.ts` 仅 `weightCompare3.ts:68` 命中 `exercise_log`）。

## 10. 风险 top3

1. **口径反转的连锁面**：`buildSeries` 是「数列唯一源」，其 `exerciseKcal` 反转会传导到 12+ 个 `view.*` 键（diet／goal*／predict／calorie-trend／long-trend／insight 等）。本票只逐面验证了票面点名的 5 个面 ＋ combined／anomaly；其余键靠「同一查询、同一谓词」推导。若某键语义确实需要「历史全量含已删」，需另开票（本票未发现此类键）。
2. **历史数据含 NULL**：`exercise_log.is_deleted` 历史行可能为 NULL（`COALESCE` 已处理，测试③ 钉住）；若未来有人「简化」为 `is_deleted = 0`，NULL 活行会静默消失 —— 已用测试③＋变异 M3 双向钉死。
3. **并发窗口污染门禁结论**：本轮多 session 并发（含 #97／#88 在飞 WIP 与一次断电重启）。门禁结论已附 §7.3 快照；若审查者复跑时工作区仍含他票 WIP，需按 `docs/research/t88-delta-flake-ruling.md` 分类后再判 delta。
