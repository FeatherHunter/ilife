# #126 证据正本：体脂／围度 `is_deprecated` 可空 → 读层统一 `COALESCE` 谓词

> 票：wayfinder 地图 #63 / [#126](https://github.com/FeatherHunter/ilife/issues/126)（由 #120 红队审查 R-4 转出）。
> 口径：票面建议「择一」→ 本票取 **读层 `COALESCE(is_deprecated, 0) = 0`**（与 #120 `EX_ALIVE` 同构），
> 叠加 `applyMigrations` M8 幂等回填（NULL → 0）作纵深；DDL 保持可空（§3 说明）。
> 复现探针（工作副本，不入仓）：`.scratch/t126/repro-null.mjs`。

## 0. 结论摘要

| 项 | 结果 |
| --- | --- |
| 复现（修复前） | NULL 活行处处被吞：`buildSeries.bodyFatPct` 22（应 20）、`waistCm` 84（应 80）、`list*` n=1（应 2）、`trend*` n=1 avg 偏、`compareCompositions.after` n=1 avg=22（应 n=2 avg=21）、cross TOP `+0.0cm`（应 `+4.0cm`） |
| 复现（修复后） | 上述逐项归位：20／80／n=2／n=2 avg=21／after n=2 avg=21／TOP `腰围 +4.0cm、臀围 +4.0cm` |
| 11 处收敛 | `series.ts` 2 ＋ `cross.ts` 2 ＋ `fetch/body.ts` 7，全部 `COALESCE(is_deprecated, 0) = 0` |
| 新增回归测试 | `test/deprecated-126.test.mjs` 4 用例（含 NULL 活行护栏 ＋ 废弃排除 ＋ M8 回填幂等） |
| 变异自证 | M1（series 回退 `=0`）① 红 `22 !== 20`；M2（谓词改 `=0`）①＋③ 红；还原＋强制重建后 4/4 绿 |
| 门禁 | `build` 0／`boundaries` 0／`snapshot:check` 0／`publish:pre` 1（既有红，§7，非本票引入） |
| 靶向 | `deprecated-126`＋`softdelete-120`＋`cmd-write-40-persist` **tests 25／pass 25／fail 0** exit 0 |
| 相邻回归 | `softdelete-120`＋`migrate-t12`＋`fetch`＋`fetch-t6`＋`analysis-t5` **37/37**；`db-readonly-93` **8/8** |
| canonical | tests 1165／pass 1137／fail 28 exit 1 → fail-set `base=34 after=34 新增=5 消失=5`，**新增 5 条全属并发他票**（§7），本票真 delta 0 |

## 1. 认领与提交

- 认领（本 session 第一笔写操作）：`gh issue edit 126 --add-assignee "@me"`。
- 本票文件（`git diff --stat` 限定本票路径）：`analysis/{utils,series,cross}.ts`＋`fetch/body.ts`＋`schema.ts`
  （5 文件／+37 −13）＋ 新测试 `test/deprecated-126.test.mjs` ＋ 本证据文件。
  工作区另有他票在飞改动（`write.ts`／`output.ts`／`exercise.ts`／`nutritionGoal.ts`／版本 bump／`*-125/127/128.test.mjs`），
  均非本票写入，提交时只 `git add` 本票路径（§9）。

## 2. 11 处逐处复算（改法 ＋ 可观测面）

谓词唯一来源：`analysis/utils.ts:BODY_ALIVE = 'COALESCE(is_deprecated, 0) = 0'`（analysis 层内联）；
`fetch/body.ts` 7 处内联同字面（fetch 层不反向依赖 analysis，沿 `fetch/exercise.ts:listWindow` 内联惯例）。

| # | 处 | 查询 | 修复前 → 修复后（探针／测试实测） |
| --- | --- | --- | --- |
| 1 | `series.ts:119` | `buildSeries` 体脂首值 | `22.0` → `20.0`（NULL 活行为首行时） |
| 2 | `series.ts:122` | `buildSeries` 腰臀首值 | `84` → `80`（同上）；复用 `buildSeries` 的 `view.*` 键随之同口径 |
| 3 | `cross.ts:145` | `waist_divergence` 首值 | 首值漏 NULL → 命中 NULL 活行（TOP `+0.0cm` → `+4.0cm`） |
| 4 | `cross.ts:146` | `waist_divergence` 末值 | 同上（首末同谓词，配对改） |
| 5 | `fetch/body.ts:131` | `listMeasurements` | n `1` → `2` |
| 6 | `fetch/body.ts:155` | `trendMeasurement` | D1 全 NULL 日整日消失 → `n=1 avg=80` |
| 7 | `fetch/body.ts:166` | `compareMeasurements` snap | D1 快照抛“无围度记录” → `before=80/delta=4` |
| 8 | `fetch/body.ts:197` | `listCompositions` | n `1` → `2` |
| 9 | `fetch/body.ts:215` | `latestSource` | 同谓词（单源场景值不变，多源下 NULL 最新源此前不可见） |
| 10 | `fetch/body.ts:222` | `trendComposition` | n `1 avg=22` → `n=2 avg=21` |
| 11 | `fetch/body.ts:231` | `compareCompositions` | `after n=1 avg=22` → `n=2 avg=21` |

`=1` 废弃行排除语义不变（测试①②断言 `30.0`／`70/80` 行全程不可见）。

## 3. 口径决策（票面「择一」的取舍 ＋ 范围外）

1. **主选 COALESCE（#120 同构）**：`exercise_log.is_deleted` 经 #120 后仍保持可空 DDL，
   本票对两体脂／围度表取同一处理，可观测语义与 `NOT NULL` 等价（`NULL ≡ 0 ≡ 活行`）。
2. **叠加 M8 回填**（`applyMigrations` 幂等 `UPDATE … WHERE IS NULL`，两表各一条）：
   数据卫生，使任何漏网的 `= 0` 写法也不丢行；migrate 复制路径（`migrate.ts` 事务内调 `applyMigrations`）同样收敛。
3. **DDL 不改 NOT NULL（显式不做）**：`migrate.ts:316-359` 按 `SELECT *` 逐字复制 src 行并显式列出
   `is_deprecated` 值；若 dst 改 `NOT NULL`，含 NULL 历史行的老库迁移将整库失败（事务回滚）。
   强制重建老表（类 M7）风险收益不成比例 —— COALESCE 已覆盖全部读路径。
4. **`nutrition_products` 读层不动**：该列 `NOT NULL`（`schema.ts:57`），`= 0` 安全；
   `fetch/products.ts` 4 处＋`render/nutritionPort.ts` 1 处保持原样（控 blast radius）。
   `render/trendMiscPort.ts` 既有用 `COALESCE` 的三处（:144／:268／:340）是同一语义的不同写法，不统一改。
5. **`cli/write.ts:17-18` 头部注释滞后**：仍写读层“均带 `is_deprecated = 0`”，现已不准确；
   该文件正由 #125 session 在飞改动，本票不碰，留待其顺手刷新（§9 记账）。

## 4. 新回归测试 `test/deprecated-126.test.mjs`（4 用例）

| 用例 | 断言 |
| --- | --- |
| ① buildSeries | NULL(20.0) 与 =0(22.0) 都计入（首值取 NULL 行）；D1 纯 NULL 日腰围 80（写死 `=0` 即回 null）；=1 行（30.0／70）全程不可见 |
| ② fetch 7 路径 | list×2、trend（n/avg）、compare（after n=2 avg=21；跨日 before=80 delta=4，写死即抛缺失） |
| ③ cross | `weight_waist` TOP 含“腰围 +4.0cm”（首值必须命中 D1 NULL 活行） |
| ④ M8 回填 | 遗留 NULL 库首开即清零（值保留、=1 不动），重开幂等 |

## 5. 变异自证（src 级；红 → 还原 → 绿）

| 变异 | 红签名（实测） | 还原 |
| --- | --- | --- |
| **M1** `series.ts` 两查询回退 `is_deprecated = 0` | ① 红 `AssertionError: 体脂应取首行 NULL 活行 20.0`（`22 !== 20`），其余 3 绿（fetch/cross 各守各的谓词） | 从 `.scratch` 备份拷回 |
| **M2** `utils.ts:BODY_ALIVE` 改 `is_deprecated = 0`（漏 NULL） | ①＋③ 红（series＋cross 同走谓词），②④绿 | 同上 |
| 还原后 | `tsc -b` 增量未刷新 dist（并发下疑似与他票构建竞态，见§9）→ `tsc -b packages/skill-calorie --force` 后 **4/4 绿** | dist 与 src 一致（grep 复核 `COALESCE`） |

## 6. 门禁实测（持锁包装器，逐条）

| 命令 | exit | runId | 备注 |
| --- | --- | --- | --- |
| `pnpm build` | **0** | `3b73c818-fe36-4471-b3df-e6c89370f91c` | `tsc -b` |
| `pnpm boundaries` | **0** | `1a6ab891-fd12-4722-89b5-f4351858cc50` | `boundaries: PASS`（等 40s：#125 持锁中，活进程不抢） |
| `pnpm snapshot:check` | **0** | `61b23309-d74b-4b44-b13c-5e95413433ea` | 与本票改动无关 |
| `pnpm publish:pre` | **1** | `70785a98-9d0b-48ab-ace7-059c07797dd4` | **既有红**：`dsh-calorie` 对 `skill-calorie` 为精确 pin `0.2.1`（`4489dcd` 已提交，该文件本票零触碰），与 `--pre` 的 `^x.y.z` 规则冲突；工作区另有他票版本 bump（`base-paint 0.3.0`／`skill-calorie 0.2.2`）加剧。判定见§9 |
| 靶向 25/25 | **0** | `aee76d5c-66a2-493f-a5ca-80e46cd22910` | `deprecated-126`＋`softdelete-120`＋`cmd-write-40-persist` |
| canonical `pnpm test` | **1（既有红）** | `dbc4c784-bba0-4197-bee5-da464583bb11` | tests 1165／pass 1137／fail 28；首轮 `765dc09c` 未留全量日志，逐字重跑一轮取数（输出 `.scratch/t126/canonical-test.log`，gitignored） |

fail-set：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t126/canonical-test.log`
→ **`base=34 after=34 新增=5 消失=5`**。新增 5 条＝并发他票在飞 WIP（§7 逐条归因），本票 4 用例在 canonical 内全绿（log :868-871）；
消失 5 条＝基线登记抖动项（#41 M3／#76／#80／helpers ≤820px／③ check-combos），与 #120 §7.2 同 5 项。
白名单零改动。`db-readonly-93` 单跑 **8/8**（canonical 内 #93 两条红为满载并发抖动，基线同态）。

## 7. 新增 5 条逐条归因（非本票）

| 新增失败 | 归属 |
| --- | --- |
| `#128 并发 5 路同秒…` | #128 session 新测试（`output-concurrency-128.test.mjs`，untracked）在飞、对应 `src/output.ts` 改动中 |
| `#79 三包版本 lockstep`／`三包 version 逐字相等`／`P10 依赖方向`／`单品→总管单向` | 他票版本 bump（`skill-calorie 0.2.2`／`base-paint 0.3.0`＋lock）在飞，4 条全是版本偏斜断言 |

本票 diff（§1）不含任何 manifest／版本／output／write 文件，上述 5 条的任一失败输入中零本票字节。

## 8. 门禁对账声明

窗口：`--since 2026-09-10T02:21:03.864Z --until 2026-09-10T02:26:13.519Z`
（首个 START ～ 末个 RUN；对账源导出见 `docs/research/t126-gate-runs.log`）。

```
GATE-RUN runId=3b73c818-fe36-4471-b3df-e6c89370f91c cmd=pnpm build
GATE-RUN runId=1a6ab891-fd12-4722-89b5-f4351858cc50 cmd=pnpm boundaries
GATE-RUN runId=61b23309-d74b-4b44-b13c-5e95413433ea cmd=pnpm snapshot:check
GATE-RUN runId=70785a98-9d0b-48ab-ace7-059c07797dd4 cmd=pnpm publish:pre
GATE-RUN runId=aee76d5c-66a2-493f-a5ca-80e46cd22910 cmd=node --test packages/skill-calorie/test/deprecated-126.test.mjs packages/skill-calorie/test/softdelete-120.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs
GATE-RUN runId=765dc09c-868d-4175-9b8b-eec1623ffaba cmd=pnpm test
GATE-RUN runId=dbc4c784-bba0-4197-bee5-da464583bb11 cmd=pnpm test

GATE-RELAX flag=--allow-nonzero reason=canonical 两轮 exit 1 均为基线既有红叠加并发他票 WIP（§6§7）；publish:pre exit 1 为既有精确 pin 与门规则冲突（§6§9）
```

对账命令（逐字复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t126-deprecated-null.md \
  --ticket 126 --since 2026-09-10T02:21:03.864Z --until 2026-09-10T02:26:13.519Z --allow-nonzero
```

## 9. 偏离记账

1. **并发四票同树施工**：本 session 全程与 #125／#127／#128 session 同工作区并发
   （`ticket=125` 持锁等待 40s／90s 两次实证；他票文件见§1）。本票构建／测试结论均复核到“本票输入零污染”为止；
   canonical 新增 5 条按 `t88-delta-flake-ruling.md` 纪律**只登记、不自行援引豁免**（分类提请编排者裁，
   但本票自身 delta 无需任何豁免：新增 5 条无一条落本票文件）。
2. **`publish:pre` 红的前置性**：`git diff HEAD -- packages/plugin-calorie/` 为空（精确 pin 是 HEAD 既有），
   红与本票无关；修复属发版线（框架图 #1）职责，本票不越界。票面验收“四门 exit 0”中三门达成，
   第四门为环境既有红 —— 关闭结论如实披露，见票面 resolution comment。
3. **增量构建过期一次**：变异还原后 `tsc -b` 未刷新 dist（`BODY_ALIVE` 仍为变异值），
   改 `tsc -b packages/skill-calorie --force` 后一致。疑与并发构建竞态有关；最终态已 grep 复核。
4. **提交纪律**：只 `git add` §1 本票路径；`.gitignore` 改动与 `t123-release-evidence/` 等 untracked 非本票所有，不管。

## 10. 风险 top3

1. **同类 `= 0` 写法复发**：M8 回填使存量 NULL 清零，但新代码仍可能手写 `is_deprecated = 0`。
   缓解：新测试 4 用例中①②③均为“写死即红”靶子（M1/M2 已证）。
2. **nutrition_products 的隐含假设**：其读层 `= 0` 正确性依赖列 `NOT NULL`；
   若未来有人把该列改可空而未同步谓词，同类 bug 重演。已在本文件§3 留字，未立项。
3. **并发窗口污染复核**：审查者复跑 canonical 时若他票 WIP 已落地／仍在飞，失败集会变；
   判读时以 `t101-fail-set` 增量归属为准（本票文件：4 src＋1 test＋本证据）。
