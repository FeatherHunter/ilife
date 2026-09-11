# t180 命令缺口的逐条处置分类（92 条无路由入口 · 按场景）

> 票 `#180`（唤醒词数据里的脚本命令清理）。**本文件只报分类**，用户裁定后在各自场景的图里立票。
> 用户 2026-09-11 裁定：「不会存在没有命令的唤醒词，如果有就是出现了问题，我们需要纠正、优化或者开发。」
> 计数与筛选一律脚本复算（脚本住 `.scratch/t180/`）；判定「本仓有没有这条能力」看 `packages/skill-calorie/src/cli/keys.ts`
> 的 99 条命令与 `packages/skill-calorie/src/triggers/routing.ts` 的路由表实查，不引 `docs/research/` 旧结论。行号由本席当场扫描给出。

## 〇、口径与复算

**三个处置的定义（逐条只取其一）**

| 处置 | 判据 |
|---|---|
| **纠正** | `CALORIE_COMBOS` 里**已有**一条命令能办这件事，只是命令文本或路由接错——指过去即可，不改参数面 |
| **优化** | 承载这条词的命令**已有**，给它**加参数／加一支出的页面**即可覆盖（取数、计算零件已在 `analysis/`／`fetch/`／`render/` 现成） |
| **开发** | 连承载的命令**都没有**，要新增命令（第三节写清属哪个能力、缺取数／计算／页面交付哪一环） |

**脚本回显（`.scratch/t180/`）**：`scan.mjs summary` → 解析 436；命令字段残留 375；取数来源字段残留 353；375 条按路由形态 {exec:283, non-exec:92}。
`count92.mjs` → 92 条按场景与理由分布；`audit283b.mjs` → 398 条 exec 路由里 245 条 cli 带写死日期；`dsdiff.mjs` → 414 条非空 `data_source` 里逐字不一致仅 4 条。

## 一、92 条逐条清单（按场景分组）

### 场景 02 · 饮食（6 条：纠正 1／优化 5／开发 0）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 拍营养表记一餐 | 02 | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> → 确认后 python scripts/calorie_tracker.py add` | calories／protein／carbs／fat；拍照识别营养成分表并记录 | **优化** | 并到 `calorie.diet.add`（keys.ts:21）；识别归模型侧，本包实查 0 处 vision／mmx／ocr 引用；缺的是「营养表 → add 参数」的映射说明；keys.ts:21；`Select-String vision|mmx|ocr packages/skill-calorie/src` 命中 0 |
| 拍营养表补记一餐 | 02 | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> --date <日期> → 确认后 python scripts/calorie_tracker.py add --date <日期>` | calories／protein／carbs／fat；拍照识别营养表并补录到指定日期 | **优化** | 同「拍营养表记一餐」，`calorie.diet.add` 带 `date`／`time` 即可；routing.ts:164 补记饮食已用同形（`calorie.diet.add` ＋ date／time） |
| 看有备注的饮食记录 | 02 | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | date／meal／food_name／grams；查看带备注的饮食记录 | **优化** | `calorie.today` 或 `calorie.view.diet` 加 `hasNote` 参数；取数已带 note，只缺页面上的备注列与筛参；fetch/diet.ts:289 listMeals 的 SELECT 已含 note 列 |
| 批量导入食品 | 02 | `python scripts/render_batch_import.py --input <preview.json> → 确认后 python scripts/batch_import.py import <file.jsonl>` | product_name／calories／protein／fat；批量导入食品数据到食品库 | **优化** | `calorie.view.batch-import-preview` 加写参数，或 `calorie.product.add` 加 `items`；写库函数现成；fetch/batch.ts:136 importProducts；fetch/batch.ts:198 validateFile |
| 校验批量导入 | 02 | `python scripts/batch_import.py validate <file.jsonl> --json-output <out.json> → python scripts/render_batch_import.py --input <out.json>` | line／name／status／reason；预校验批量导入文件能否通过 | **纠正** | 指到 `calorie.view.batch-import-preview`（keys.ts:124「批量导入预览」）：total／matched／missing／missingNames 就是预校验结果；keys.ts:124；视图定义 render/trendMiscPort.ts:335；routing.ts:194 未接它 |
| 看「有备注」的饮食记录 | 02 | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | （旧条目无 data_fields） | **优化** | 同「看有备注的饮食记录」（同一条能力的旧条目，无 key）；scene-02-diet.ts:74；fetch/diet.ts:289 |

### 场景 03 · 体重（18 条：纠正 0／优化 18／开发 0）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 看体重曲线（带目标） | 03 | `python scripts/render_weight_history.py --mode trend --days 30 --show-target` | days／items／target／goal_diff；看体重曲线并叠加目标线 | **优化** | `calorie.view.weight-history` 加 `overlay:target`；曲线叠加目标线，取数现成；render/weightPlate.ts:67（视图只有 days／startDate／endDate）；目标线 getWeightGoalInfo weightPlate.ts:55 |
| 看体重曲线（带里程碑） | 03 | `python scripts/render_weight_history.py --mode trend --days 30 --show-milestones` | days／items／milestones／current；看体重曲线并标注里程碑点 | **优化** | 同上 `overlay:milestones`；里程碑反查现成；analysis/weightCompare2.ts:132 scenarioE3（按 delta 反查里程碑日，零调用方） |
| 看体重曲线（带异常点） | 03 | `python scripts/render_weight_history.py --mode trend --days 30 --show-anomalies` | days／items／anomalies／current；看体重曲线并标注异常点 | **优化** | 同上 `overlay:anomalies`；异常点取数现成；render/insightPlate.ts:86 buildAnomalyView；routing.ts:520 用 kind=weight_anomaly |
| 看「有备注」的体重记录 | 03 | `python scripts/render_weight_history.py --mode notes --days 30` | items／note_tags／tag_distribution／summary；看带备注的体重记录及备注分类 | **优化** | `calorie.view.weight-history` 加 `hasNote`（或 `noteTag`）参数；note 与备注标签函数现成；fetch/weight.ts:12 noteTag；fetch/weight.ts:23 rows 含 note |
| 对比体重：当前 vs 平台期首日 | 03 | `python scripts/render_weight_compare.py --scenario b8 --chain "1.识别→2.读DB→3.平台期识别→4.渲染"` | current／plateau_start／plateau_days／delta_after；对比当前体重与最近一次平台期首日 | **优化** | `calorie.view.weight-compare` 加 `scenario` 参数，接 `runScenario` 的 b8；锚点派生函数现成；analysis/weightCompare2.ts:42 findPlateau／:65 scenarioB8；analysis/weightCompare3.ts:171 runScenario（全仓零调用方） |
| 对比体重：当前 vs 历史最低 | 03 | `python scripts/render_weight_compare.py --scenario e1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current／min_kg／min_date／delta_kg；对比当前体重与历史最低 | **优化** | 同上，scenario e1；analysis/weightCompare2.ts:100 scenarioE1 |
| 对比体重：当前 vs 历史最高 | 03 | `python scripts/render_weight_compare.py --scenario e2 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current／max_kg／max_date／delta_kg；对比当前体重与历史最高 | **优化** | 同上，scenario e2；analysis/weightCompare2.ts:114 scenarioE2 |
| 对比体重：减重 5kg 那天 vs 今天 | 03 | `python scripts/render_weight_compare.py --scenario e3 --delta 5 --chain "1.识别→2.读DB→3.反查里程碑→4.渲染"` | current／milestone_kg／milestone_date／elapsed_days；对比减重 5kg 达成日与今天的体重 | **优化** | 同上，scenario e3 ＋ `delta:5`；analysis/weightCompare2.ts:132 scenarioE3（吃 deltaKg） |
| 对比体重：减重 10kg 那天 vs 今天 | 03 | `python scripts/render_weight_compare.py --scenario e3 --delta 10 --chain "1.识别→2.读DB→3.反查里程碑→4.渲染"` | current／milestone_kg／milestone_date／elapsed_days；对比减重 10kg 达成日与今天的体重 | **优化** | 同上，scenario e3 ＋ `delta:10`；analysis/weightCompare2.ts:132 |
| 对比体重：当前 vs 入夏最低 | 03 | `python scripts/render_weight_compare.py --scenario e5 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | current／season_min_kg／season_min_date／delta_kg；对比当前体重与入夏最低 | **优化** | 同上，scenario e5；季节定位现成；analysis/weightCompare2.ts:167 seasonMin／:181 scenarioE5 |
| 对比体重：当前 vs 入冬最低 | 03 | `python scripts/render_weight_compare.py --scenario e6 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | current／season_min_kg／season_min_date／delta_kg；对比当前体重与入冬最低 | **优化** | 同上，scenario e6；analysis/weightCompare2.ts:196 scenarioE6 |
| 对比体重：运动多 vs 运动少的两个月 | 03 | `python scripts/render_weight_compare.py --scenario c5 --chain "1.识别→2.读DB→3.选极端月→4.渲染"` | high_month／low_month／avg／delta_kg；对比运动最多与最少两个月的体重 | **优化** | 同上，scenario c5（极端月定位）；睡眠技能库默认不碰；analysis/weightCompare3.ts:66 scenarioC5 |
| 体重复盘（本周） | 03 | `python scripts/render_weight_review.py --type week --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg／avg／vs_last_period／trend；复盘本周的体重变化 | **优化** | 并到 `calorie.view.review-template`（窗内已含体重变化与要点）；若要体重专面，给 `calorie.view.weight-review` 加 `window` 参数；render/trendMiscPort.ts:419 buildReviewTemplateView（start／end 窗内 weightChange＋points）；render/weightPlate.ts:130 只吃 today／date |
| 体重复盘（本月） | 03 | `python scripts/render_weight_review.py --type month --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg／avg／vs_last_period／trend；复盘本月的体重变化 | **优化** | 同上，window=month；render/trendMiscPort.ts:419 |
| 体重复盘（最近 90 天） | 03 | `python scripts/render_weight_review.py --type 90d --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg／avg／vs_last_period／trend；复盘最近 90 天的体重变化 | **优化** | 同上，window=90d；render/trendMiscPort.ts:419 |
| 体重复盘（今年） | 03 | `python scripts/render_weight_review.py --type year --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg／avg／monthly_trend／summary；复盘今年的体重变化 | **优化** | 同上，window=year；render/trendMiscPort.ts:419 |
| 体重复盘（自定义时间） | 03 | `python scripts/render_weight_review.py --start <S> --end <E> --chain "1.识别→2.读DB→3.复盘→4.渲染"` | start／end／delta_kg／avg；复盘自定义时间段的体重变化 | **优化** | 同上，直接给 start／end（review-template 本来就是两日期参数）；render/trendMiscPort.ts:419 |
| 看里程碑回溯 | 03 | `python scripts/render_weight_review.py --type milestones --chain "1.识别→2.读DB→3.回溯→4.渲染"` | milestones／summary；看历史达成的体重里程碑 | **优化** | `calorie.view.weight-review` 加 `mode:milestones`（现有 milestone 只前向预测）；里程碑反查现成；render/weightPlate.ts:130 取 weightMilestone（analysis/weight.ts:160 只给 estDate／estDays 前向）；反查见 weightCompare2.ts:132 |

### 场景 04 · 运动（1 条：纠正 0／优化 1／开发 0）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 看运动记录（有备注） | 04 | `python scripts/render_exercise_summary.py --mode records --has-note` | records／note；看带备注的运动记录 | **优化** | `calorie.view.exercise` 加 `records:true` ＋ `hasNote`；取数已带 note，缺记录级列表与备注筛选的页面；fetch/exercise.ts:167 LIVE_COLS 含 note／:266 行映射含 note；routing.ts:317 |

### 场景 05 · 健身计划（23 条：纠正 1／优化 7／开发 15）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 看本周计划 | 05 | `python scripts/render_workout_plan.py --week <N>` | week_number／days／sessions／movements；我想看本周的训练日历和完成度 | **优化** | `calorie.view.plan` 加 `week` 参数（另三条同）；会话日期可由计划起始日＋周次＋星期派生，取数返回全量；fetch/plan.ts:209 getPlan 返回全量 sessions；会话日期派生见 render/exercisePort.ts:407 内 sessionDate 用法 |
| 看下周计划 | 05 | `python scripts/render_workout_plan.py --week <N+1>` | week_number／days／sessions／movements；我想预览下周的训练安排 | **优化** | 同上，week=当前周+1；fetch/plan.ts:209 |
| 看上周计划 | 05 | `python scripts/render_workout_plan.py --week <N-1>` | week_number／days／sessions／movements；我想回顾上周的训练安排和完成率 | **优化** | 同上，week=当前周−1；fetch/plan.ts:209 |
| 看指定周计划 | 05 | `python scripts/render_workout_plan.py --week <N>` | week_number／days／sessions／movements；我想查看指定周次的训练安排 | **优化** | 同上，week=N；fetch/plan.ts:209 |
| 看今天练什么 | 05 | `python scripts/render_workout_plan.py --today` | sessions／movements／sets_done／sets_remaining；我想看今天练什么以及练到哪了 | **优化** | `calorie.view.plan` 加 `date`（或 today）参数；取数与日期派生现成；fetch/plan.ts:209；routing.ts:337 |
| 看某动作安排 | 05 | `python scripts/render_workout_plan.py --mode action --name <动作>` | query／positions／summary／next_date；我想查某个动作在计划里的安排 | **优化** | `calorie.view.plan` 加 `movement` 参数（在返回的 sessions 里按动作名筛）；fetch/plan.ts:209；PlanSessionRow 定义 fetch/plan.ts:197 |
| 看某天练什么 | 05 | `python scripts/render_workout_plan.py --mode day --start <D>` | date／sessions／movements／is_rest；我想看某一天练什么 | **优化** | 同上，`date` 参数；fetch/plan.ts:209 |
| 看计划 vs 实际 | 05 | `python scripts/render_workout_plan.py --vs-actual --start <D1> --end <D2>` | completion_rate／deviation／movement_rows／start_date；我想对比计划训练量和实际完成量的差距 | **纠正** | 指到 `calorie.view.exercise-review`（keys.ts:113「计划复盘」）：它读计划会话与实做记录算完成率／动作命中率；keys.ts:113；render/exercisePort.ts:407 buildReviewView（plannedSessions／hitSessions／completionPct／movementPct）；routing.ts:342 未接它 |
| 定训练计划 | 05 | `python scripts/render_plan_receipt.py --live-plan-set --plan-json <JSON> --chain "1.采访→2.预览确认→3.写库→4.回执"` | goal／experience／frequency／target_parts；我想根据我的目标和情况定制一份训练计划 | **开发** | 属「健身计划」写库能力；缺的是写库命令面（写库函数已在 `fetch/plan.ts:158 writePlan`），预检确认页已有 `calorie.view.plan-wizard`；fetch/plan.ts:158；cmd_read.ts:950（plan-wizard 只 dry-run）；会改数据库的命令表 keys.ts:20-56 无计划写命令 |
| 复制训练计划 | 05 | `python scripts/render_plan_receipt.py --live-plan-copy [--new-title <T>] --chain "1.读当前计划→2.复制→3.回执"` | copied_weeks／new_title／source_week；我想复制一份训练计划作为新模板 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:327 copyPlan 现成 |
| 定休息日 | 05 | `python scripts/render_plan_receipt.py --live-plan-rest --week <W> --day <D> --rest <1\|0> --chain "1.定位天→2.标记→3.回执"` | date／is_rest_day／before／after；我想把某天标记为休息日 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:265 updateSession 现成 |
| 加训练动作 | 05 | `python scripts/render_plan_receipt.py --live-plan-add --week <W> --day <D> --name <动作> --sets <N> [--weight <kg>] --chain "1.定位时段→2.加动作→3.回执"` | week_number／day_of_week／session_label／movement；我想给训练计划加一个新动作 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:248 addSession 现成 |
| 定一周计划 | 05 | `python scripts/render_plan_receipt.py --live-plan-set-week --week <W> --days-json <JSON> --chain "1.解析7天→2.写库→3.回执"` | week_number／day_schedule／rest_days；我想快速设置一周七天的训练安排 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:158 writePlan（周数组入参）现成 |
| 改训练计划 | 05 | `python scripts/render_plan_receipt.py --live-plan-update --field <X> --value <Y> --chain "1.读旧值→2.更新→3.回执"` | field／before／after；我想修改训练计划的某个配置字段 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:227 updateConfig 现成 |
| 改某天训练 | 05 | `python scripts/render_plan_receipt.py --live-plan-update-day --week <W> --day <D> --session <S> [--label <L>] --chain "1.读现状→2.更新→3.回执"` | date／field／before／after；我想修改某一天的训练安排 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:265 updateSession 现成 |
| 删某天训练 | 05 | `python scripts/render_plan_receipt.py --live-plan-delete-day --week <W> --day <D> --chain "1.快照→2.确认→3.删除→4.回执"` | date／snapshot／deleted_sessions；我想删除某天的训练安排 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:353 deleteDay 现成 |
| 改动作 | 05 | `python scripts/render_plan_receipt.py --live-plan-update-movement --week <W> --day <D> --session <S> --old-name <A> --new-name <B> --chain "1.定位动作→2.替换→3.回执"` | date／old_movement／new_movement／sets_before；我想替换计划里的某个动作 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:265 updateSession 现成 |
| 撤销训练计划 | 05 | `python scripts/render_plan_receipt.py --live-plan-delete --chain "1.概要→2.确认→3.删除→4.回执"` | plan_summary／deleted_config／deleted_rows；我想删除整个训练计划 | **开发** | 同「定训练计划」；缺写库命令面；fetch/plan.ts:316 deletePlan 现成 |
| 落地训练 | 05 | `python scripts/sync_plan.py --days 1` | date／step1_created／step2_added／step3_pushed；我想把某天的训练计划完整落地执行 | **开发** | 属「健身计划」的落地训练一族：要计划写命令＋外部推送两样；本仓只有进度看（`calorie.view.process-progress`）与动作名校验；render/trendMiscPort.ts:378；fetch/xunji-catalog.ts:49 只有 verifyMovementName；docs/calorie-architecture.md:60 列「明确不做（落地）」 |
| 落地到本周末 | 05 | `python scripts/sync_plan.py --days <N>` | days／day_summaries／step_totals／completion；我想把本周剩余训练日批量落地 | **开发** | 同「落地训练」（要按天批量落地）；docs/calorie-architecture.md:60；routing.ts:354 |
| 落地到本月底 | 05 | `python scripts/sync_plan.py --days <N>` | days／day_summaries／step_totals／completion；我想把本月剩余训练日批量落地 | **开发** | 同「落地训练」；docs/calorie-architecture.md:60；routing.ts:355 |
| 同步到训记 | 05 | `python scripts/render_plan_receipt.py --live-plan-sync --date <D> --chain "1.审计动作名→2.推送→3.回执"` | date／pushed_count／results／unrecognized_movements；我想把训练计划推送到训记 | **开发** | 属「健身计划」对外推送：缺取数与写库（推送动作名到外部应用）；fetch/xunji-catalog.ts:19 loadCatalog／:49 verifyMovementName 只有动作名校验；docs/calorie-architecture.md:60 列「明确不做（训记）」 |
| 拉训记实绩 | 05 | `python scripts/render_plan_receipt.py --live-plan-backfill --date <D> --chain "1.拉取→2.回写→3.回执"` | date／inserted／updated／skipped；我想把训记里的实际训练拉回卡路里 | **开发** | 属「健身计划」对外拉取：缺取数（从外部应用读实做并回写）；fetch/xunji-catalog.ts:49；docs/calorie-architecture.md:60 |

### 场景 08 · 身体细节（2 条：纠正 0／优化 2／开发 0）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 对比体脂 | 08 | `python scripts/render_body_composition_view.py --mode compare --start1 <D1> --end1 <D2> --start2 <D3> --end2 <D4> --source <来源> --chain "1.识别→2.读DB→3.渲染"` | period1／period2／delta／pct_change；我想对比两段时间的体脂变化 | **优化** | `calorie.view.body-composition` 加 `compareStart`／`compareEnd` 参数，接现成的两期对比视图（已导出，CLI 未接线）；render/bodyPlate.ts:49 buildBodyCompositionCompare；render/index.ts 已导出；cmd_read.ts:927 只调 buildBodyCompositionView |
| 对比围度 | 08 | `python scripts/render_body_measurements_view.py --mode compare --date1 <D1> --date2 <D2> --chain "1.识别→2.读DB→3.渲染"` | date1／date2／deltas；我想对比两个日期的围度变化 | **优化** | `calorie.view.body-measure` 加 `date1`／`date2` 参数，接现成的两期对比视图；render/bodyPlate.ts:112 buildBodyMeasureCompare；cmd_read.ts:935 |

### 场景 10 · 分析（42 条：纠正 1／优化 36／开发 5）
| 唤醒词 | 场景 | 命令字段现状（`main_prompt.cli` 原文） | 数据面／意图 | 处置 | 依据 |
|---|---|---|---|---|---|
| 看BMI报告 | 10 | `python scripts/render_analysis.py --view report --kind bmi --window 90d` | bmi／height_cm／milestones；看BMI报告 | **优化** | 并到 `calorie.view.weight-history`（逐行已带 bmi）＋档案身高；单独报告缺的是出的页面分支；fetch/weight.ts getWeightHistory SELECT 含 bmi；render/sportDocs.ts:307 已把 bmi 出成表列 |
| 看TDEE报告 | 10 | `python scripts/render_analysis.py --view report --kind tdee --window 30d` | tdee／activity_factor／calories／deficit；看TDEE报告 | **优化** | 并到 `calorie.view.goal-recommend`（已给 tdee／activity／bmr），加 `report:tdee` 页面分支；cmd_read.ts:642（tdee、bmr 已进 metrics）；keys.ts:72 |
| 看BMR报告 | 10 | `python scripts/render_analysis.py --view report --kind bmr --window 30d` | bmr／tdee／calories／under_bmr_days；看BMR报告 | **优化** | 同上，`report:bmr`；cmd_read.ts:642；keys.ts:72 |
| 看蛋白质摄入报告 | 10 | `python scripts/render_analysis.py --view report --kind protein --window 30d` | protein／weight_kg／rate／trend；看蛋白质摄入报告 | **优化** | 并到 `calorie.view.nutrition-ratio`（已给 proteinG／proteinPct／targetProteinG），加窗内趋势的页面分支；cmd_read.ts:459-462；keys.ts:117；蛋白日序列在 analysis/series.ts:98 buildSeries |
| 看水分摄入报告 | 10 | `python scripts/render_analysis.py --view report --kind water --window 30d` | water_ml／water_goal／rate；看水分摄入报告 | **优化** | `calorie.view.today-water` 加窗参数（现只吃 date）；窗内水分取数现成；cmd_read.ts:487；analysis/series.ts:23 waterMl／:153 |
| 看综合评分 | 10 | `python scripts/render_analysis.py --view report --kind score --window 30d` | score／items／history；看综合评分 | **开发** | 属「分析」能力：缺计算（本仓无综合评分口径）与历史序列页面；全仓实查 `score` 只命中 six-factors 的日 6 因素分（render/trendMiscPort.ts:192／:248），无综合健康评分；routing.ts:498 |
| 看健康趋势 | 10 | `python scripts/render_analysis.py --view report --kind trend --window 90d` | score／history／direction；看健康趋势 | **开发** | 属「分析」能力：缺计算（评分序列＋方向），与「看综合评分」同源；render/trendMiscPort.ts:192 是唯一评分处；routing.ts:499 |
| 看健康报告(含对比) | 10 | `python scripts/render_analysis.py --view report --kind compare --window 本周` | deltas／top3；看健康报告(含对比) | **优化** | `calorie.view.health` 加 `compareStart`／`compareEnd`（两期同形盘对比）；取数可跑任意窗口，只缺两期对比的页面；analysis/dashboard.ts:32 healthDashboard(db, start, end)；cmd_read.ts:712；routing.ts:500 |
| 看整体趋势(体重+摄入+运动) | 10 | `python scripts/render_analysis.py --view trend --group g1 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「体重+摄入+运动」多指标整体趋势 | **优化** | `calorie.view.long-trend` 加 `group` g1（现只许 weight_calorie）＋多指标页面；指标取数现成；render/trendMiscPort.ts:84 只放行 weight_calorie；analysis/series.ts:98 buildSeries 已含 weightKg／calories／exerciseKcal／protein／bodyFatPct／waistCm／deficit／waterMl |
| 看整体趋势(体重+体脂+围度) | 10 | `python scripts/render_analysis.py --view trend --group g2 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「体重+体脂+围度」多指标整体趋势 | **优化** | 同上，group g2；render/trendMiscPort.ts:84；analysis/series.ts:98 |
| 看整体趋势(饮食+蛋白+纤维) | 10 | `python scripts/render_analysis.py --view trend --group g3 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「饮食+蛋白+纤维」多指标整体趋势 | **优化** | 同上，group g3（纤维在 nutrition-analysis 的微量口径里现成）；render/trendMiscPort.ts:84；render/trendMiscPort.ts:141 微量折算 |
| 看整体趋势(运动+力量+有氧) | 10 | `python scripts/render_analysis.py --view trend --group g4 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「运动+力量+有氧」多指标整体趋势 | **优化** | 同上，group g4；render/trendMiscPort.ts:84；render/exercisePort.ts:107 buildStrengthView／:179 buildCardioView |
| 看整体趋势(BMI+体脂+肌肉量) | 10 | `python scripts/render_analysis.py --view trend --group g5 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「BMI+体脂+肌肉量」多指标整体趋势 | **优化** | 同上，group g5（肌肉量取自体成分来源字段）；render/trendMiscPort.ts:84；render/bodyPlate.ts:22 |
| 看整体趋势(摄入+蛋白+运动) | 10 | `python scripts/render_analysis.py --view trend --group g6 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「摄入+蛋白+运动」多指标整体趋势 | **优化** | 同上，group g6；render/trendMiscPort.ts:84 |
| 看整体趋势(体重+蛋白+缺口) | 10 | `python scripts/render_analysis.py --view trend --group g7 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「体重+蛋白+缺口」多指标整体趋势 | **优化** | 同上，group g7；render/trendMiscPort.ts:84 |
| 看整体趋势(体重+摄入+缺口) | 10 | `python scripts/render_analysis.py --view trend --group g8 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「体重+摄入+缺口」多指标整体趋势 | **优化** | 同上，group g8；render/trendMiscPort.ts:84 |
| 看整体趋势(体重+摄入+运动+缺口) | 10 | `python scripts/render_analysis.py --view trend --group g9 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「体重+摄入+运动+缺口」多指标整体趋势 | **优化** | 同上，group g9；render/trendMiscPort.ts:84 |
| 看整体趋势(蛋白+运动) | 10 | `python scripts/render_analysis.py --view trend --group g10 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「蛋白+运动」多指标整体趋势 | **优化** | 同上，group g10；render/trendMiscPort.ts:84 |
| 看整体趋势(综合多指标) | 10 | `python scripts/render_analysis.py --view trend --group g11 --window 90d` | weight_kg／calories／exercise_kcal／protein；看「综合多指标」多指标整体趋势 | **优化** | 同上，group g11（4 指标组合）；render/trendMiscPort.ts:84 |
| 看整体趋势(含月度对比) | 10 | `python scripts/render_analysis.py --view trend --group g11 --window 60d --period monthly` | weight_kg／calories／exercise_kcal／protein；看整体趋势并含含月度对比 | **优化** | 同上，group g11 ＋ `period:monthly`（窗口 60 天）；render/trendMiscPort.ts:84；routing.ts:512 |
| 看整体趋势(含季度对比) | 10 | `python scripts/render_analysis.py --view trend --group g11 --window 180d --period quarterly` | weight_kg／calories／exercise_kcal／protein；看整体趋势并含含季度对比 | **优化** | 同上，`period:quarterly`（窗口 180 天）；render/trendMiscPort.ts:84；routing.ts:513 |
| 看整体趋势(含年度对比) | 10 | `python scripts/render_analysis.py --view trend --group g11 --window 730d --period yearly` | weight_kg／calories／exercise_kcal／protein；看整体趋势并含含年度对比 | **优化** | 同上，`period:yearly`（窗口 730 天）；render/trendMiscPort.ts:84；routing.ts:514 |
| 看整体趋势(含目标对比) | 10 | `python scripts/render_analysis.py --view trend --group g11 --window 90d --period target` | weight_kg／calories／exercise_kcal／protein；看整体趋势并含含目标对比 | **优化** | 同上，`period:target`（在曲线上叠目标）；render/trendMiscPort.ts:84；目标线见 weightPlate.ts:55 |
| 看营养建议 | 10 | `python scripts/render_analysis.py --view nutrition --group advice --window 30d` | items／gap／priority；看营养建议 | **纠正** | 指到 `calorie.view.nutrition-analysis`（keys.ts:128）：它输出规则建议条目数组（蛋白／脂肪／纤维／钠／糖阈值）＋配比＋微量；render/trendMiscPort.ts:166-172 advice 数组；keys.ts:128；routing.ts:552 的 noNutritionAdvice 理由未把它算进去 |
| 预测体重(自定义目标) | 10 | `python scripts/render_analysis.py --view predict --kind weight_target --target <目标kg>` | target／eta／days_left／feasible；预测体重(自定义目标) 模拟/预测 | **优化** | `calorie.view.predict` 或 `calorie.view.goal-predict` 加 `target` 参数；目标体重预测达成视图本身已有（eta／daysLeft／feasible），只差目标值不从已设目标取；render/goalExtra.ts:70 buildGoalPredictView（targetKg 取 nutrition.weight_goal）；analysis/simulate.ts:103 weightTarget(series, targetKg…) 现成 |
| 模拟减重(每天-300卡) | 10 | `python scripts/render_analysis.py --view predict --kind sim_cut_300` | cut_kcal／weekly_loss／forecast／feasible；模拟减重(每天-300卡) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:sim_cut`＋`cutKcal`；计算函数现成且零调用方；analysis/simulate2.ts:21 weightSimCut(series, cutKcal…) |
| 模拟减重(每天-500卡) | 10 | `python scripts/render_analysis.py --view predict --kind sim_cut_500` | cut_kcal／weekly_loss／forecast／feasible；模拟减重(每天-500卡) 模拟/预测 | **优化** | 同上，cutKcal=500；analysis/simulate2.ts:21 |
| 模拟减重(每天-700卡) | 10 | `python scripts/render_analysis.py --view predict --kind sim_cut_700` | cut_kcal／weekly_loss／forecast／feasible；模拟减重(每天-700卡) 模拟/预测 | **优化** | 同上，cutKcal=700；analysis/simulate2.ts:21 |
| 模拟减重(30天减Xkg) | 10 | `python scripts/render_analysis.py --view predict --kind sim_target_30 --target <Xkg>` | target_loss／needed_deficit／forecast／feasible；模拟减重(30天减Xkg) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:sim_target`＋`target`＋`days:30`；analysis/simulate2.ts:50 weightSimTarget(series, targetKg, days…) |
| 模拟减重(60天减Xkg) | 10 | `python scripts/render_analysis.py --view predict --kind sim_target_60 --target <Xkg>` | target_loss／needed_deficit／forecast／feasible；模拟减重(60天减Xkg) 模拟/预测 | **优化** | 同上，days=60；analysis/simulate2.ts:50 |
| 模拟减重(90天减Xkg) | 10 | `python scripts/render_analysis.py --view predict --kind sim_target_90 --target <Xkg>` | target_loss／needed_deficit／forecast／feasible；模拟减重(90天减Xkg) 模拟/预测 | **优化** | 同上，days=90；analysis/simulate2.ts:50 |
| 模拟减重(自定义天数减Xkg) | 10 | `python scripts/render_analysis.py --view predict --kind sim_target_custom --target <Xkg> --days <天数>` | target_loss／days_target／needed_deficit／forecast；模拟减重(自定义天数减Xkg) 模拟/预测 | **优化** | 同上，days=N；analysis/simulate2.ts:50 |
| 摄入预测(按当前速率 1 周) | 10 | `python scripts/render_analysis.py --view predict --kind cal_week` | calories／forecast／goal；摄入预测(按当前速率 1 周) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:cal_forecast`＋`horizonDays:7`；analysis/simulate2.ts:110 calorieForecast(series, horizonDays…) |
| 摄入预测(按当前速率 1 月) | 10 | `python scripts/render_analysis.py --view predict --kind cal_month` | calories／forecast／goal；摄入预测(按当前速率 1 月) 模拟/预测 | **优化** | 同上，horizonDays=30；analysis/simulate2.ts:110 |
| 摄入预测(按当前速率 3 月) | 10 | `python scripts/render_analysis.py --view predict --kind cal_3m` | calories／forecast／goal；摄入预测(按当前速率 3 月) 模拟/预测 | **优化** | 同上，horizonDays=90；analysis/simulate2.ts:110 |
| 摄入预测(自定义) | 10 | `python scripts/render_analysis.py --view predict --kind cal_custom --days <天数>` | calories／forecast／goal；摄入预测(自定义) 模拟/预测 | **优化** | 同上，horizonDays=N；analysis/simulate2.ts:110 |
| 摄入预测(营养目标达成预测) | 10 | `python scripts/render_analysis.py --view predict --kind cal_goal` | avg／goal／gap／on_target；摄入预测(营养目标达成预测) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:cal_goal`；analysis/simulate2.ts:140 calorieGoalEta（avg／goal／gap／onTarget） |
| 摄入预测(卡路里缺口预测) | 10 | `python scripts/render_analysis.py --view predict --kind cal_deficit` | avg_deficit／weekly_loss；摄入预测(卡路里缺口预测) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:cal_deficit`；analysis/simulate2.ts:158 calorieDeficitEta（avgDeficit／weeklyLoss） |
| 摄入预测(摄入稳定性预测) | 10 | `python scripts/render_analysis.py --view predict --kind cal_stability` | avg／sigma／stable；摄入预测(摄入稳定性预测) 模拟/预测 | **优化** | `calorie.view.predict` 加 `kind:cal_stability`；analysis/simulate2.ts:175 calorieStability（avg／sigma／stable） |
| 关闭定时复盘 | 10 | `mavis cron delete ...` | （旧条目无 data_fields） | **开发** | 属「分析」的定时复盘：本仓无任何调度／定时能力，旧链走宿主 `mavis cron`；规格列「明确不做」，与用户裁定冲突 → 需先裁；docs/calorie-architecture.md:60；routing.ts:579；实查全仓无 cron／定时实现 |
| 开启定时复盘 | 10 | `mavis cron create ...` | （旧条目无 data_fields） | **开发** | 同「关闭定时复盘」；docs/calorie-architecture.md:60；routing.ts:582 |
| 查定时复盘 | 10 | `mavis cron list` | （旧条目无 data_fields） | **开发** | 同「关闭定时复盘」（查清单也要有命令）；docs/calorie-architecture.md:60；routing.ts:590 |

## 二、计数小结

合计：**纠正 3 条／优化 69 条／开发 20 条**（92 条逐条有处置）。

| 场景 | 名称 | 条数 | 纠正 | 优化 | 开发 |
|---|---|---|---|---|---|
| 02 | 饮食 | 6 | 1 | 5 | 0 |
| 03 | 体重 | 18 | 0 | 18 | 0 |
| 04 | 运动 | 1 | 0 | 1 | 0 |
| 05 | 健身计划 | 23 | 1 | 7 | 15 |
| 08 | 身体细节 | 2 | 0 | 2 | 0 |
| 10 | 分析 | 42 | 1 | 36 | 5 |
| **合计** | — | **92** | **3** | **69** | **20** |

## 三、开发清单（20 条 · 可直接抄进票面）

| 唤醒词 | 场景 | 能力（HELP 一级分组） | 缺什么 | 依据 |
|---|---|---|---|---|
| 定训练计划 | 05 | 健身计划 | 写库（会改数据库的计划命令；`fetch/plan.ts:158 writePlan` 已有） | fetch/plan.ts:158；cmd_read.ts:950（plan-wizard 只 dry-run）；会改数据库的命令表 keys.ts:20-56 无计划写命令 |
| 复制训练计划 | 05 | 健身计划 | 写库（`fetch/plan.ts:327 copyPlan` 已有） | fetch/plan.ts:327 copyPlan 现成 |
| 定休息日 | 05 | 健身计划 | 写库（`fetch/plan.ts:265 updateSession` 已有） | fetch/plan.ts:265 updateSession 现成 |
| 加训练动作 | 05 | 健身计划 | 写库（`fetch/plan.ts:248 addSession` 已有） | fetch/plan.ts:248 addSession 现成 |
| 定一周计划 | 05 | 健身计划 | 写库（`fetch/plan.ts:158 writePlan` 吃周数组） | fetch/plan.ts:158 writePlan（周数组入参）现成 |
| 改训练计划 | 05 | 健身计划 | 写库（`fetch/plan.ts:227 updateConfig` 已有） | fetch/plan.ts:227 updateConfig 现成 |
| 改某天训练 | 05 | 健身计划 | 写库（`fetch/plan.ts:265 updateSession` 已有） | fetch/plan.ts:265 updateSession 现成 |
| 删某天训练 | 05 | 健身计划 | 写库（`fetch/plan.ts:353 deleteDay` 已有） | fetch/plan.ts:353 deleteDay 现成 |
| 改动作 | 05 | 健身计划 | 写库（`fetch/plan.ts:265 updateSession` 已有） | fetch/plan.ts:265 updateSession 现成 |
| 撤销训练计划 | 05 | 健身计划 | 写库（`fetch/plan.ts:316 deletePlan` 已有） | fetch/plan.ts:316 deletePlan 现成 |
| 落地训练 | 05 | 健身计划 | 取数＋写库（计划写命令 ＋ 外部推送；本仓无推送，只有 `fetch/xunji-catalog.ts:49` 动作名校验） | render/trendMiscPort.ts:378；fetch/xunji-catalog.ts:49 只有 verifyMovementName；docs/calorie-architecture.md:60 列「明确不做（落地）」 |
| 落地到本周末 | 05 | 健身计划 | 取数＋写库（同「落地训练」，另要按天批量） | docs/calorie-architecture.md:60；routing.ts:354 |
| 落地到本月底 | 05 | 健身计划 | 取数＋写库（同「落地训练」，另要按天批量） | docs/calorie-architecture.md:60；routing.ts:355 |
| 同步到训记 | 05 | 健身计划 | 取数＋写库（对外推送；只有动作名校验） | fetch/xunji-catalog.ts:19 loadCatalog／:49 verifyMovementName 只有动作名校验；docs/calorie-architecture.md:60 列「明确不做（训记）」 |
| 拉训记实绩 | 05 | 健身计划 | 取数（对外拉取并回写实做记录） | fetch/xunji-catalog.ts:49；docs/calorie-architecture.md:60 |
| 看综合评分 | 10 | 分析 | 计算（综合评分口径）＋出的历史序列页面 | 全仓实查 `score` 只命中 six-factors 的日 6 因素分（render/trendMiscPort.ts:192／:248），无综合健康评分；routing.ts:498 |
| 看健康趋势 | 10 | 分析 | 计算（评分序列与方向） | render/trendMiscPort.ts:192 是唯一评分处；routing.ts:499 |
| 关闭定时复盘 | 10 | 分析 | 取数＋写库（调度；本仓无定时能力）＋出清单页 | docs/calorie-architecture.md:60；routing.ts:579；实查全仓无 cron／定时实现 |
| 开启定时复盘 | 10 | 分析 | 取数＋写库（调度；本仓无定时能力） | docs/calorie-architecture.md:60；routing.ts:582 |
| 查定时复盘 | 10 | 分析 | 取数＋出清单页（本仓无定时能力） | docs/calorie-architecture.md:60；routing.ts:590 |

> 其中 8 条（落地训练／落地到本周末／落地到本月底／同步到训记／拉训记实绩 5 条 ＋ 定时复盘 3 条）与
> `docs/calorie-architecture.md:60`「明确不做（定时复盘／训记／落地）」相抵：规格那句要说的是**执行层不承接**，
> 用户 2026-09-11 裁定是**不许有没命令的唤醒词**。两条要么改规格、要么改词表，**须先裁**，再立票。

## 四、283 条路由口径抽样复核（9 条）

抽样覆盖场景 01／02／10：核「路由入口是不是真能办这条词的事」＋「命令文本是否逐字对得上」。

| 唤醒词 | 场景 | 路由命令 | 判定 | 依据 |
|---|---|---|---|---|
| 记一餐 | 02 | `calorie.diet.add`（会改数据库的命令，keys.ts:21） | 口径成立 | 该命令登记在 `CALORIE_WRITE_COMBOS`，参数面与词面一致 |
| 看今日主页 | 01 | `calorie.view.home --params '{"date":"2026-09-07"}'` | 口径成立 | 命令在 99 条内（keys.ts:67）；`streakDays／caloriePct／waterPct` 等指标在 cmd_read.ts:340-346 直接给出 |
| 看今日饮食概览 | 01 | `calorie.view.diet {"start":"2026-09-05","end":"2026-09-07"}` | **窗口口径不对** | 词面是「今日」，路由给 3 天（help-lookup.ts:76）；同表「看今日主页」给 1 天（:75）——同一「今日」两种跨度；「看今日运动概览」同形（:77，2 天） |
| 看本周饮食 | 02 | `calorie.view.diet {"start":"2026-09-07","end":"2026-09-07"}` | **窗口口径不对** | 词面是「本周」，路由给 1 天（routing.ts:178）；同表「看上周饮食」给 7 天（:179）。全表共 9 条「本周」词都是 1 天 |
| 看食品来源统计 | 02 | `calorie.view.library {"category":"蛋白类"}` | **命令接错** | 词的 intent 是「按来源分组的统计」、`data_fields=[source,count,pct,total]`（scene-02-diet.ts:38）；该命令返回的是分类食品列表。专面命令 `calorie.view.source-stats`（keys.ts:119；buildProductStats library.ts:68 正好给 source／count）被近义词「看食品来源分布」用着 |
| 看今日喝水 | 02 | `calorie.view.home {"date":"2026-09-07"}` | 口径偏松 | 主页确实出饮水数（html.ts:77），但专面命令 `calorie.view.today-water`（keys.ts:120）由「看今日饮水」用着——两词同能指，一个走专面一个走总览 |
| 看营养素深度 | 02 | `calorie.view.nutrition-detail` | 口径成立 | #112 已把该词从 non-exec 翻成 exec（routing.ts:199 注释＋:200）；命令登记在 keys.ts:118 |
| 看目标预测达成 | 06 | `calorie.view.goal-predict` | 口径成立 | 视图给 targetKg／eta／daysLeft／feasible（render/goalExtra.ts:70），与词面一致 |
| 看钠糖纤维趋势 | 10 | `calorie.view.nutrition-analysis` | 口径偏松 | #113 把「趋势」并到综合盘（routing.ts:549-550 自述「单维趋势序列仍无同形」）——准入成立但呈现不是趋势序列 |

**结论**：`283 条有路由入口` 这个判定**方向成立、精度不足**。它由「实跑 exit 0」派生，而实跑依赖种子库固定日期，所以只说「跑得通」，不说「窗口／命令面对得上」：
本节 9 条里 4 条口径成立、3 条窗口或命令接错（看今日饮食概览「今日＝3 天」、看本周饮食「本周＝1 天」、看食品来源统计；「看本周」族共 9 条同错）、2 条口径偏松（看今日喝水、看钠糖纤维趋势）。
建议本票不把「283」当可直接抄的名单，改当口径警告：283 条抄路由文本前，先逐条核窗口与命令面。

**另一条必须知道的事**：398 条 exec 路由里 245 条 cli 写着种子库固定日期。按 `t180-impact-list.md:45`「逐字抄 routing.ts」的规则，照抄等于把这些日期冻进 SoT；
若要留相对窗口（今日／本周／最近 7 天），得**先改路由再抄**——这一步没做之前，283 条不宜批量落盘。

## 五、375 条里的其它细节核对（`data_source` 与 `cli`）

手法：`node .scratch/t180/dsdiff.mjs` 把 436 条的 `main_prompt.cli` 与 `data_source` 归一化（去多余空白、统一引号）后逐字比。
回显：`data_source` 非空 414 条（353 条残留脚本命令是它的子集），**两侧逐字不一致只有 4 条**，全是 `scene-02-diet.ts:70-73` 那 4 条餐别错位，与 `t180-impact-list.md:64-73` 同源。
**除这 4 条外没有第二处字段间不一致**：其余 410 条两侧逐字同值，即两者要么同错要么同对、不会互相揭发；改那 4 条时留神取数来源字段那侧是对的。
顺带：`variants[].cli` 残留脚本命令的是 **3 条条目、5 串**（`scene-10-analysis.ts` 的「查健康报告」「查热量趋势」「查营养结构」），与 impact-list 第二节同源。

## 六、不确定／待核实

1. **「明确不做」的 8 条走哪条路**（3 定时复盘＋2 训记＋3 落地）：本文件按用户裁定一律记「开发」，但 `docs/calorie-architecture.md:60` 说「执行层不承接」。这是**规格与裁定的冲突**，不是分类问题；请先裁。
2. **「看综合评分／看健康趋势」缺的是口径而非接线**：本仓唯一的评分是 six-factors 的日 6 因素分（0~6，`render/trendMiscPort.ts:248`）。若维护者认为「综合评分＝窗内 6 因素平均分」，这两条就从开发降为优化（并到 `calorie.view.six-factors`）；本席按词的 `data_fields`（score／items／history）判「缺计算」，属**推测**，请裁。
3. **「拍营养表记一餐／补记一餐」判优化靠一条实查**：本包全仓 `vision|mmx|ocr` 命中 0，图片识别只在模型侧。若维护者要求「拍」这个动作本身在本仓有入口（例如一条负责取图并落盘的命令），则这两条要改判开发。
4. **「批量导入食品」的写入口形态未定**：现有 `calorie.view.batch-import-preview` 是查询命令（只预览），写库函数 `importProducts` 在 `fetch/batch.ts:136`。判优化是按「加参数即可覆盖」，但查询命令带写副作用与 `#40` 的读写分家不一致，做之前需定：给查询命令加 write 参数，还是新增一条会改数据库的命令。
5. **场景 05 的 10 条计划写**：全部判开发，理由是「没有承载的命令」。但写库函数 10 个都已现成（`fetch/plan.ts:158/227/248/265/284/291/303/310/316/327/353`），所以这 10 条的实际工作量是**建命令＋接线**，不是造取数或计算。若维护者按工作量而非按「有没有命令」分类，这 10 条会变成优化——**这是本文件最大的一处口径选择**，请裁。
6. **「看计划 vs 实际」「看营养建议」两条判纠正**：前者 `calorie.view.exercise-review` 给的是会话／动作命中率，词面还要 `deviation`；后者 `calorie.view.nutrition-analysis` 的 advice 是规则建议（5 条阈值），旧链 `--group advice` 的 `items／gap／priority` 结构更厚。若要求逐字覆盖 `data_fields`，两条都改判优化。
7. **「本周」族 9 条窗口同错**（本文件只点名「看本周饮食」）：另 8 条是 看本周体重／看本周运动／看本周运动（vs 目标）／运动复盘（本周）／饮食复盘（本周）／看健康报告(本周)／本周复盘／对比体重：本周 vs 上周，改路由时一并处理。