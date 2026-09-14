# #383 预测模拟参数补齐：实施证据（进行中）

> 归属 MAP #161 子票 #383。只做本票（order138–152 共15条接住命令＋133–137回归），不碰 #384–387。
> 规范词：有命令可执行／没有命令可执行的唤醒词、查询命令；过程型／结果型／回执沿用。
> 分母（#382 对账表）：预测模拟 20（133–152：5 条有命令可执行＋15 条没有命令可执行）。

## 一、影响清单（事前，必报五步第一步）

| # | 路径 | 一句话与理由 |
|---|---|---|
| 1 | `packages/skill-calorie/src/analysis/commands.ts` | `viewPredict` 加 15 条参数分支（本能力目录的命令实现） |
| 2 | `packages/skill-calorie/src/analysis/routes.ts` | 15 条 `non-exec`→`exec`（`order` 不动） |
| 3 | `packages/skill-calorie/src/triggers/scene-10-analysis.ts` | 15 条 `main_prompt.cli` 与 `data_source` 改真命令形态，与路由逐字一致 |
| 4 | `packages/skill-calorie/src/render/insightPlate.ts` | 预测段加 7 个视图装配（目标／减重×2／摄入×4），只改本图会碰到的那半 |
| 5 | `packages/skill-calorie/src/render/trendDocs.ts` | 预测段加 7 个产物装配（同上），只改本图会碰到的那半 |
| 6 | `packages/skill-calorie/test/analysis-predict-383.test.mjs` | 新测试（照抄 trend-misc-port-113＋g2g4-103），15 条＋5 条回归，含变异证据 |
| 7 | `.changeset/t383-predict-params.md` | 变更集（票号专属名） |
| 8 | `docs/skills/skill-calorie/t383-*` | 本票证据（与 t382 前缀不重叠） |

不碰：分派层（`src/cli/cmd_read.ts` 等）、生成物手改（`keys.ts`／`registry.ts`／`routes.generated.ts`／`combos.yaml`／`SKILL.md`，只跑生成链）、`routing.ts`、报告 8 条与缺口词、`SIM_MIN_DAYS=14` 口径。

## 二、结构设计（必报五步第二步）

- 不新开目录层级（`src/analysis/`＋`src/render/` 既有用目录内加函数）。
- `insightPlate.ts` 新增 7 导出（`buildPredictTargetView`／`buildSimCutView`／`buildSimTargetView`／`buildCalorieForecastView`／`buildCalorieGoalView`／`buildCalorieDeficitView`／`buildCalorieStabilityView`）：薄装配（校验→`buildSeries`→`simulate*.ts` 既有口径→降级转 missing-data），不重写算式（铁律一：走公开接口；铁律二：`KCAL_PER_KG=7700` 等常量不另定义）。
- `trendDocs.ts` 新增 7 导出（`buildPredictTargetDoc`／`buildSimCutDoc`／`buildSimTargetDoc`／`buildCalorieForecastDoc`／`buildCalorieGoalDoc`／`buildCalorieDeficitDoc`／`buildCalorieStabilityDoc`）：KPI＋轨迹表＋复制区＋整页装配，沿既有 `buildPredictDoc`／`buildGoalPredictDoc` 形状。
- 参数形状（#382 未定，本票先定，测试注释同步）：`target`／`cut_kcal`／`target_loss`＋`days_target`／`kind=calorie_forecast|calorie_goal|calorie_deficit|calorie_stability`＋`horizonDays`；输出字段名照冻结表 `data_fields`，布尔按 1/0 进 metrics（沿 `goal-predict` 口径）。

## 三、超线报警（必报五步第四步）

已超线，需要根据规则进行重构。`src/render/trendDocs.ts` 改前 LF=476（已超 350 线），本票预测段加约 300 行后更大。超因：趋势／分析域全文档装配同处一处。今回先不拆：拆分本身不在本票（本票只改预测段那半），拆法待后续票确定。

## 四、基线快照（每次门禁／判据运行前）

- `.scratch/t383/baseline-red.txt`：红跑前（他人在途：keys.ts／routes.generated.ts 等，红绿可归因）。
- `.scratch/t383/baseline-pre-build-138.txt`／`pre-build-full.txt`：两次构建前（含共享输入 7 件 sha256）。
- 他人在途破文件：`scene-03-weight.ts`（25／37 行 TS1005／TS1351，M 态）→ 后收口；`body/routes.ts` 类型错 → 后收口；现仅剩 `weight/review.ts`（`renderListRows` 未定义，M 态）。本票零触碰。

## 五、判据先行（红）

`GATE-RUN runId=a5329592-0923-4296-b93b-eb3408569342 cmd=node --test packages/skill-calorie/test/analysis-predict-383.test.mjs waitedMs=0 exit=1`
`tests 3／pass 1／fail 2`：首红“唤醒词没有命令可执行：预测体重(自定义目标)”（`routesFor` 无可执行记录，符合票面先红要求）；次红缺 `metrics.target`；133–137 回归绿。日志 `.scratch/t383/red-run.log`。

## 六、分支算式先验（dist 级，不碰构建）

`LOGIC RESULT: PASS/15-15`（`.scratch/t383/probe-logic.mjs`，种子 30 天递减体重＋1800 卡）：`weightTarget` eta 2026-10-13／36 天；`weightSimCut` 300／500／700；`weightSimTarget` 4 组；`calorieForecast` 4 组；`calorieGoalEta`／`calorieDeficitEta`／`calorieStability` 全非降级，字段齐。

## 七、路由—冻结表对账

`PARITY RESULT: PASS/15-15`（`.scratch/t383/verify-parity2.mjs`）：15 条 `main_prompt.cli`＝`data_source`＝路由 `cli` 逐字相同，`order` 不动。

## 八、单件自证（transpileModule，不碰构建）

`SYNTAX RESULT: PASS/5-5`：本票 5 件语法 0 错。

## 九、#376 同文件共存

`commands.ts` 的 #376 hunk（`multi-trend` 第 14 键）与 `routes.ts` 的 order353 hunk 全程保留；`.scratch/t383/hunk-guard-*.txt` 记改前后 sha（markers `1aa59d9f…` 一致），零触碰。收工时若 #376 仍在途，`commands.ts` 保持未提交并点名移交（不带他人 hunk 提交）。

## 十、构建重试（机会主义，每轮一次）

- `runId=2f83c18b-d9f7-4988-8dc1-b572176e75b9 exit=2`：`scene-03-weight.ts` 语法错（他人在途）。日志 `.scratch/t383/build-138.log`。
- `runId=b592d1fe-5ea8-4a1d-a0a8-15df138780c7 exit=2`：`body/routes.ts` 键类型错＋`weight/review.ts` 缺导入（他人在途）。日志 `.scratch/t383/build-full.log`。
- 待树绿后即跑：`pnpm build && pnpm gen && pnpm build && pnpm help:build`／`pnpm gen:check`／新测试全绿／变异两行／`test/calorie-routing-81.test.mjs` 对账。

## 十二、门禁全绿（2026-09-14T04:47Z 后，树转绿）

- `pnpm build`（首轮，含 gen --stamp）：`runId=31575150-ea46-4d0d-851f-7d145a3873fe exit=0`（`.scratch/t383/build-r4.log`）。
- 票面全链：build `chain-build1` DONE:0 → gen `chain-gen` DONE:0 → build `chain-build2` DONE:0 → help:build `chain-help` DONE:0。
- `pnpm gen:check`：`runId=6050e8dc-31b1-4bf8-817a-c8eb9159cebb exit=0`（GEN-CHECK PASS 键117）＋复核 `chain-gencheck` DONE:0。
- 新测试首绿：`tests 3／pass 3／fail 0`，`runId=315a093d-4ed6-4b0d-b4a7-42a1551a5ec1 exit=0`（`.scratch/t383/green-run.log`）。
- 路由冻结对账 `test/calorie-routing-81.test.mjs`：见十三节。

## 十一、变异自证（源码级，两行）

- MUT-RED：`commands.ts` 参数装配 `target`→`targetX` → `tests 3／pass 2／fail 1`（“预测体重(自定义目标) 缺 metrics.target”），`runId=4cd4fd90-4314-4cf0-b70c-f16b77c79245 exit=1`。日志 `.scratch/t383/mut-red.log`。
- MUT-GREEN：改回后 `tests 3／pass 3／fail 0`，`runId=4bf1c28f-0aa2-422f-98fe-ef354d50cbc1 exit=0`（`commands.ts` sha `d16fa683…` 与改前一致，还原一致）。日志 `.scratch/t383/mut-green.log`。
