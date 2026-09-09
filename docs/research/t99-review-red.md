# #99 红队审查报告（G1 SKILL.md 示例可执行门）

> 被审：`05cac10`／`2775822`／`c0fb6d2`／`33c166a`（起始 HEAD `a544461`）。环境 `D:\ilife`，node v24.19.0，pnpm 11.8.0。
> 纪律：**未改任何源文件／`docs/research/t99-*` 原文件／tracker**；变异只作用于 `.scratch/orchestrator/red10-review/` 内的副本；build/test 全部经持锁包装器（`--ticket 99`）。
> **verdict PASS（总分 94；S1-交付 0／S1-过程 0／S2 0／S3 5）**

## ① 独立复跑清单（exit）

| 命令 | exit | 关键行 |
|---|---|---|
| `pnpm help:examples:check`（持锁 `runId=78b6f1ea…`） | **0** | `RESULT: 99/99`，14.5 s |
| `node docs/research/t99-probe-examples.mjs` | **0** | `RESULT: 99/99` |
| 同上 `--db empty`（两次） | 1 | `RESULT: 25/99`（**≠ 证据 §9 的「期望 24/99」**） |
| `build`／`boundaries`／`snapshot:check`／`publish:pre`（同一持锁区） | **0/0/0/0** | `boundaries: PASS`／`snapshot OK`／`publish:pre PASS` |
| canonical `pnpm test` 1 轮（`runId=54df5780…`，waitedMs=10005） | 1（既有红） | delta `base=34 after=29 新增=0 消失=5`（逐字复现证据 §5） |
| `check-gate-audit --evidence docs/research/t99-examples-gate.md --log docs/research/t99-gate-runs.log --ticket 99 --since 14:17Z --until 14:23Z --allow-nonzero` | **0** | `matched=15/15 undeclared=0 PASS` |
| `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` | — | **0 行** |

`SKILL.md` 终态：`size=27965`、前 3 字节 `2d 2d 2d`、blob `51bcf2cf…`、`git status` 中该文件无改动 → 无零填充。

## ② 门鉴别力（自设 10 个新变异，副本级 `--skill`，红→还原→绿）

| 变异（派单要求 a–d） | 门 exit | 摘要 | 判定 |
|---|---|---|---|
| **a1** `view.weight-history` `{"days":7}`→`{"day":7}` | **0** | `99/99` | **漏** |
| **a2** `history` `{"days":7}`→`{"dais":7}` | **0** | `99/99` | **漏** |
| **a3** `view.diet` `"start"`→`"begin"` | **0** | `99/99` | **漏** |
| **b** 删 `view.dedupe` 整行 | 1 | `STRUCT 示例行数 98 != 99` | 抓 |
| **c** 重复 `view.profile` 整行 | 1 | `STRUCT 示例行数 100 != 99` | 抓 |
| **d1** `diet.update` id 1→99999 | 1 | `RED exit=4 Entry ID 99999 不存在` | 抓 |
| **d2** `photo.detail` id 1→99999 | 1 | `RED exit=4 照片 #99999 不存在` | 抓 |
| **d3** `view.diet` 区间→2019-01-01~02 | 1 | `RED exit=4 无饮食记录` | 抓 |
| **e** 未登记占位符 `<另一张照片>` | 1 | `RED 未登记替换值的占位符` | 抓 |
| **f** `--params` 非法 JSON | 1 | `STRUCT --params 非合法 JSON` | 抓 |

还原自证：未变异副本 `exit 0 / 99/99`，且副本 blob == 仓库 `51bcf2cf…`。

**量化盲区（新探针 `probe-params-effect.mjs`）**：84 行含 `--params`，逐行把顶层键名加前缀 `zz_` 再跑 → **0** 行输出逐字节相同、**43** 行改键名后非 0、**41 行（49%）仍 exit 0 但 stdout 与正确行不同**。即：近半示例的参数键名打错时，CLI 静默回落默认值，判据④（`exit 0` ＋ envelope `key` 相等）**完全无鉴别力**。对跑取证：`view.weight-history` good/bad 均 exit 0，stdout `2d3e396d…` vs `5c202d58…`。当前 99 行**无一**被静默忽略（`paramsIgnored=0/84`）→ 不证伪验收①。

## ③ `default` 抛错的真实效果

- 真实生成器 + 内存注入未登记键：`buildHelpBlock()` 抛 `exampleFor 缺 case：calorie.view.__red10_unregistered_probe（新增键必须补可执行示例，不得落 default）`；`SKILL.md` 的 size／sha256／mtime 三项**逐项不变**。
- 副本级端到端（`gen-e2e.mjs`：真文件逐字复制 ＋ 假键 shim）：生成器 `exit 1`、**副本 SKILL.md 未被写**（`written=false`）。原文件零改动。

## ④ `isMain` 守卫（#124 根因）

`import(packages/skill-calorie/scripts/build-help.mjs)` 前后 `size／first3／sha256／blob／mtime` **逐项不变**（`changed=none`）。四门＋门＋两支探针之后 blob 仍 `51bcf2cf…`；canonical `pnpm test` 前后 `mtime=14:21:03.858Z` **不变** → 测试期写盘路径确已切断。
**残留（范围外）**：`skill-chef`／`skill-schedule` 的 `build-help.mjs` 无 `isMain` 守卫且被各自 `skill.test.mjs:7` import → #124 机制仍活（与蓝队 S3-1 同）。

## ⑤ 票面前提订正核验（自数）

AUTO 块示例行 **99** ＝ `CALORIE_COMBOS` 键 **99**；逐键对齐（缺 0／未注册 0／重复 0）；`buildHelpBlock()` 全键不抛 → `exampleFor()` **无缺 case**。
修前口径独立复现：门跑 `2775822^` 的 SKILL.md 副本 → `exit 1`、`RESULT: 96/99`，红 3 行逐字同证据 §2（`anomaly`／`plan-wizard`／`weight-compare`，`exit 2` 缺参数 `kind`／`plan`／`start`）。

## ⑥ 门的口径

`NON_EXECUTABLE` 为空（`check-examples.mjs:38`）；依赖缺失**显式失败**（副本 SEED 指向不存在文件 → `exit 2`、`FAIL: 门依赖不可用…`，非静默绿）；未登记占位符红（见 e）。

## ⑦ 缺陷清单

- **S3-1（本票·门鉴别力边界未登记）**：判据④对「`--params` 键名打错」无鉴别力（a1–a3 全绿；41/84 行落此盲区）。**不证伪验收①**（可执行口径），但「防坏示例」能力被高估。建议后续票加参数 schema 校验或「键名扰动差分」。
- **S3-2（本票·证据陈旧）**：§9「`--db empty` 期望 24/99」实测 **25/99**（两次一致；差 1 由本票改动 `plan-wizard` 补参后空库亦 exit 0 造成）。
- **S3-3（本票·摘要口径）**：`RESULT:(pass+skipped)/picked`（`:148`）把白名单 SKIP 计入通过；当前白名单空 → 无实害，一旦登记即失真。
- **S3-4（本票·依赖 dist）**：门从 `../dist/cli/keys.js` 取键表（`:70`），改 `src/cli/keys.ts` 未 build 时门对新键无感（CI 顺序已缓解）。
- **S3-5（范围外·转 #124）**：chef／schedule 残留写盘面。
- **新引入缺陷**：未发现。并发上下文：canonical 轮与 #107 WIP 同树（其 commit `d812dac` 晚于本轮），`新增=0`，不触发 `t88-delta-flake-ruling.md` 分类。
- 说明：探针脚本按派单只写 `.scratch/orchestrator/red10-review/`（未入仓），与协议 §5.1「可复跑 `.mjs` 须跟踪」冲突，请编排者裁定。

## ⑧ 五维打分

契约一致 **28**/30（验收①独立复现；验收②仍为静态接线，CI 未实跑）｜证据真实可复现 **23**/25（§9 期望值陈旧 1 处）｜parity **19**/20（与 #81 同一种子、shape/key 对齐、`base-combos` 同形守卫）｜工程红线 **15**/15（锁内运行全对账、无危险 git、白名单 0 行 diff、无零填充）｜文档同步 **9**/10（盲区未登记）。
**总分 94 ≥ 85，无 S1 → verdict PASS**（S3×5 记账，S3-5 转 #124）。

## ⑨ 本报告自身的运行声明（协议 §2.4.3）

对账窗口 `--since 2026-09-09T14:26:00Z --until 2026-09-09T14:31:00Z`，`--ticket 99`（**实测 `matched=2/2 undeclared=0 PASS`**）；本报告自身的 `git add`／`git commit` 在窗口右端之后。

- GATE-RUN runId=78b6f1ea-22c3-431d-881a-3d202e0e3b3f （exit 0） cmd=node .scratch/orchestrator/red10-review/run-gates.mjs
- GATE-RUN runId=54df5780-ca79-4e3c-871f-1f4005591fb3 （exit 1，既有红 canonical；delta 新增 0） cmd=pnpm test

GATE-RELAX flag=--allow-nonzero reason=窗口内必须如实登记 1 条既有红 canonical pnpm test（exit 1，delta 新增 0）；放宽只用于「声明→条目」匹配，门禁证据仍只认 exit=0 条目（runId=78b6f1ea…）

复跑：`node tooling/check-gate-audit.mjs --evidence docs/research/t99-review-red.md --log .scratch/locks/gate-runs.log --ticket 99 --since 2026-09-09T14:26:00Z --until 2026-09-09T14:31:00Z`（`pnpm test` 需 `--allow-nonzero` 并留 `GATE-RELAX`）。
探针：`.scratch/orchestrator/red10-review/{mutate,probe-params-effect,probe-isMain,probe-default-throw,probe-seed-dep,probe-premises,gen-e2e}.mjs`；日志同目录 `mutate.log`／`params-effect.log`／`prefix-gate.log`／`skill-integrity.log`。
