---
"skill-calorie": minor
---

#81（map #63）唤醒词路由层：新增 `packages/skill-calorie/src/triggers/routing.ts`——436 条 SoT 唤醒词逐条恰落「可执行／命中但不执行」一桶（可执行 **326** ＝ 直连 56 ＋ 走 `HELP_EXEC_OVERRIDES` 22 ＋ 26 条 FX-81-2 同能力孪生词转 exec ＋ **222 条 FX-81-7 同 key 可参数化词转 exec**；命中但不执行 **110** ＝ 明确不做 10 ＋ 该词自身未承接 100，后者含 FX-81-7 复核后仅存的 5 条 wizard 词），并为 34/77 无入口的键补 34 条新拟入口（`NEW_KEY_ROUTES`）、为 wizard 词失去唯一可跑入口的 1 键补 1 条覆盖修复入口（`COVERAGE_REPAIR_ROUTES`：`看目标推荐` → `calorie.view.goal-recommend`），使 77 键全部有可执行入口（exec 桶记录总数 **361** ＝ SoT 326 ＋ 新拟 34 ＋ 修复 1）。

**FX-81-7 判据（总架构师裁定）**：一个旧唤醒词，只要存在一条能达成其所述能力的**单命令**（同 key ＋ 参数，实跑 `exit 0`），就必须进 `exec` 桶；唯一例外是语义上必须多步交互的 wizard 词（需预览／确认再写库，归 #86）。本轮按冻结 `main_prompt.cli` 的脚本／模式／参数**家族级机械派生**并逐条实跑：`view.ranking`（category，26 词）／`view.combined`（pair／window，69 词）／`view.anomaly`（kind，20 词）／`view.weight-history`（14）／`view.weight-compare`（9）／`view.exercise`（21 词）／`view.diet-review`（15）／`view.health`（11）／`view.volatility`（5）／`view.diet`（14）／`view.predict`（4）等；`看目标预测达成` 改 exec（≥14 天窗口）、`记体脂（皮褶钳）` 用完整 7 皮褶参数实跑 `exit 0` 改 exec。未映射的 95 条逐条给「为何不可执行」（缺参数／缺形态／缺写键），wizard 5 条单列——完整映射表见 `docs/research/t81-route-evidence.md` §2.3。

**FX-81-5 不变量**：`kind:'exec'` 的每一条，在「标准种子库 ＋ 真实路径替换」下实跑必须 `exit 0`。可复跑 smoke `docs/research/t81-exec-smoke.mjs` ＋ 入仓快照 `docs/research/t81-exec-smoke.md`（361 条逐条 exit 0、非零 0；4 条照片占位符按该文件 §2 替换为临时真实路径）；标准种子库单一定义在 `docs/research/t81-seed.mjs`（与证据表脚本共用）。`test/calorie-routing-81.test.mjs` 钉死该快照（含 §1 cli 列与路由层逐条逐字一致），并加结构性断言「无参不可跑的键，exec cli 必须给 `--params`」（删掉任一 `--params` 即变红）。

唤醒词表 `scene-*.ts`／sha 快照／两处 `legacyCli` 断言零改动（路由与 parity 分家，裁定 D-1）；路由层零 py 命令引用，exec cli 一律 `calorie-cmd-read calorie.*` 形态。明确不做桶按架构规格 `docs/calorie-architecture.md:60` 建立，t71 O1–O6 差异（含「落地」属 t71 M8 需移植项、O2／O5／O6 无独立唤醒词）逐条登记在 `T71_DIFFS`。断言 `test/calorie-routing-81.test.mjs`，逐条证据 `docs/research/t81-route-evidence.md`（可复现脚本 `docs/research/t81-route-evidence.mjs`）。
