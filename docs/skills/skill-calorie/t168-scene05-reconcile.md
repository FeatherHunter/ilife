# t168 场景 05 健身计划：32 条唤醒词逐条对账（防幻觉词）

> 票 `#168`（地图 `#157` 的第一张票）。本表由脚本从三份正本机械生成，**不下结论、不猜**：
> 老技能一侧取 `D:\2Study\StudyNotes\SKILLS\卡路里\.scratch\scene_data\05-健身计划.json`（老技能自己的场景数据，13 字段，`check_scene_data.py` 校验）；
> 新仓一侧取 `packages/skill-calorie/src/triggers/scene-05-workout.ts`（436 条 SoT 的场景 05 拆分）；
> 路由一侧取 `packages/skill-calorie/src/triggers/routing.ts` 的场景 05 记录。
> 生成脚本：`.scratch/wf-t157/gen-reconcile.mjs`（只读三份输入，写本文件）。

## 一、32 条总表

| # | 唤醒词 | 老 output_type | 老模板 | 老技能当年的做法（`data_source` 原文） | 新仓 key | 新 output_type | 新模板 | 路由今天 | 路由理由 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | 看本周计划 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --week <N> | `plan_view_this_week` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 2 | 看下周计划 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --week <N+1> | `plan_view_next_week` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 3 | 看上周计划 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --week <N-1> | `plan_view_last_week` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 4 | 看指定周计划 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --week <N> | `plan_view_week` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 5 | 看今天练什么 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --today | `plan_view_today` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 6 | 看某动作安排 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --mode action --name <动作> | `plan_view_movement` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 7 | 看某天练什么 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --mode day --start <D> | `plan_view_day` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 8 | 看计划概览 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --overview | `plan_overview` | result | `workout_plan_view.html` | `calorie.view.plan` |  |
| 9 | 看完整计划 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py | `plan_view_full` | result | `workout_plan_view.html` | `calorie.view.plan` |  |
| 10 | 看计划 vs 实际 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --vs-actual --start <D1> --end <D2> | `plan_vs_actual` | result | `workout_plan_view.html` | 无（non-exec） | `planFilterMissing` |
| 11 | 定训练计划 | receipt | `plan_builder_wizard.html` | python scripts/render_plan_receipt.py --live-plan-set --plan-json <JSON> --chain "1.采访→2.预览确认→3.写库→4.回执" | `plan_set` | receipt | `plan_builder_wizard.html` | 无（non-exec） | `planWriteMissing` |
| 12 | 复制训练计划 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-copy [--new-title <T>] --chain "1.读当前计划→2.复制→3.回执" | `plan_copy` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 13 | 定休息日 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-rest --week <W> --day <D> --rest <1\|0> --chain "1.定位天→2.标记→3.回执" | `plan_set_rest` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 14 | 加训练动作 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-add --week <W> --day <D> --name <动作> --sets <N> [--weight <kg>] --chain "1.定位时段→2.加动作→3.回执" | `plan_add_movement` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 15 | 定一周计划 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-set-week --week <W> --days-json <JSON> --chain "1.解析7天→2.写库→3.回执" | `plan_set_week` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 16 | 改训练计划 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-update --field <X> --value <Y> --chain "1.读旧值→2.更新→3.回执" | `plan_update` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 17 | 改某天训练 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-update-day --week <W> --day <D> --session <S> [--label <L>] --chain "1.读现状→2.更新→3.回执" | `plan_update_day` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 18 | 删某天训练 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-delete-day --week <W> --day <D> --chain "1.快照→2.确认→3.删除→4.回执" | `plan_delete_day` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 19 | 改动作 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-update-movement --week <W> --day <D> --session <S> --old-name <A> --new-name <B> --chain "1.定位动作→2.替换→3.回执" | `plan_update_movement` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 20 | 撤销训练计划 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-delete --chain "1.概要→2.确认→3.删除→4.回执" | `plan_delete` | receipt | `crud_receipt.html` | 无（non-exec） | `planWriteMissing` |
| 21 | 落地训练 | process | `process_progress.html` | python scripts/sync_plan.py --days 1 | `plan_execute` | process | `process_progress.html` | 无（non-exec） | `oosLanding` |
| 22 | 落地到本周末 | process | `process_progress.html` | python scripts/sync_plan.py --days <N> | `plan_execute_weekend` | process | `process_progress.html` | 无（non-exec） | `oosLanding` |
| 23 | 落地到本月底 | process | `process_progress.html` | python scripts/sync_plan.py --days <N> | `plan_execute_month` | process | `process_progress.html` | 无（non-exec） | `oosLanding` |
| 24 | 同步到训记 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-sync --date <D> --chain "1.审计动作名→2.推送→3.回执" | `plan_sync_xunji` | receipt | `crud_receipt.html` | 无（non-exec） | `oosXunji` |
| 25 | 拉训记实绩 | receipt | `crud_receipt.html` | python scripts/render_plan_receipt.py --live-plan-backfill --date <D> --chain "1.拉取→2.回写→3.回执" | `plan_backfill_xunji` | receipt | `crud_receipt.html` | 无（non-exec） | `oosXunji` |
| 26 | 计划复盘（本周） | result | `exercise_review.html` | python scripts/render_exercise_review_html.py --days 7 | `plan_review_week` | result | `exercise_review.html` | `calorie.view.exercise-review` |  |
| 27 | 计划复盘（本月） | result | `exercise_review.html` | python scripts/render_exercise_review_html.py --start <D1> --end <D2> | `plan_review_month` | result | `exercise_review.html` | `calorie.view.exercise-review` |  |
| 28 | 计划复盘（全部） | result | `exercise_review.html` | python scripts/render_exercise_review_html.py --start <D1> --end <D2> | `plan_review_all` | result | `exercise_review.html` | `calorie.view.exercise-review` |  |
| 29 | 看计划完成率 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --completion | `plan_completion_rate` | result | `workout_plan_view.html` | `calorie.view.exercise-review` |  |
| 30 | 看未完成训练 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --missed --days <N> | `plan_missed` | result | `workout_plan_view.html` | `calorie.view.exercise-review` |  |
| 31 | 看动作完成率 | result | `workout_plan_view.html` | python scripts/render_workout_plan.py --movement-rate --days <N> | `plan_movement_rate` | result | `workout_plan_view.html` | `calorie.view.exercise-review` |  |
| 32 | 扫禁忌 | result | `contraindication_report.html` | python scripts/render_contraindication.py | `plan_contraindication` | result | `contraindication_report.html` | `calorie.view.contraindication` |  |

## 二、计数（机械复算）

- 本场景唤醒词：**32 条**
- 老技能有完整输出类型 ＋ 模板：**32 条**
- 老技能里**找不到**这条词的：**0 条**

| 老 output_type | 条数 |
|---|---:|
| result | 17 |
| receipt | 12 |
| process | 3 |

- 新仓路由今天**有命令可执行**：**9 条**
- 新仓路由今天**没有命令可执行**：**23 条**

| 路由理由 | 条数 | 唤醒词 |
|---|---:|---|
| `planFilterMissing` | 8 | 看本周计划、看下周计划、看上周计划、看指定周计划、看今天练什么、看某动作安排、看某天练什么、看计划 vs 实际 |
| `planWriteMissing` | 10 | 定训练计划、复制训练计划、定休息日、加训练动作、定一周计划、改训练计划、改某天训练、删某天训练、改动作、撤销训练计划 |
| `oosLanding` | 3 | 落地训练、落地到本周末、落地到本月底 |
| `oosXunji` | 2 | 同步到训记、拉训记实绩 |

- 老技能里**做过**这 23 条词（有输出类型与模板、或明确脚本）：**23 条**——即「老技能做过、新仓没接命令」，不是「从来没做过」。

- 路由里另有场景 05 的「新拟入口」词（不在 436 条 SoT 里）：
  - `看训练计划` → `calorie.view.plan`
  - `看构建向导` → `calorie.view.plan-wizard`
  - `看禁忌扫描` → `calorie.view.contraindication`
  - `看训练计划复盘` → `calorie.view.exercise-review`
  - `看落地训练进度` → `calorie.view.process-progress`
  **共 5 条**。这些词不在本图 Destination 的 32 条内，但它们证明：其中几条命令**今天已经可达**（本图是接线，不是从零造）。

## 三、老技能当年的做法（`data_source` 聚类）

| 老命令原文 | 条数 | 唤醒词 |
|---|---:|---|
| `python scripts/render_workout_plan.py --week <N>` | 2 | 看本周计划、看指定周计划 |
| `python scripts/sync_plan.py --days <N>` | 2 | 落地到本周末、落地到本月底 |
| `python scripts/render_exercise_review_html.py --start <D1> --end <D2>` | 2 | 计划复盘（本月）、计划复盘（全部） |
| `python scripts/render_workout_plan.py --week <N+1>` | 1 | 看下周计划 |
| `python scripts/render_workout_plan.py --week <N-1>` | 1 | 看上周计划 |
| `python scripts/render_workout_plan.py --today` | 1 | 看今天练什么 |
| `python scripts/render_workout_plan.py --mode action --name <动作>` | 1 | 看某动作安排 |
| `python scripts/render_workout_plan.py --mode day --start <D>` | 1 | 看某天练什么 |
| `python scripts/render_workout_plan.py --overview` | 1 | 看计划概览 |
| `python scripts/render_workout_plan.py` | 1 | 看完整计划 |
| `python scripts/render_workout_plan.py --vs-actual --start <D1> --end <D2>` | 1 | 看计划 vs 实际 |
| `python scripts/render_plan_receipt.py --live-plan-set --plan-json <JSON> --chain "1.采访→2.预览确认→3.写库→4.回执"` | 1 | 定训练计划 |
| `python scripts/render_plan_receipt.py --live-plan-copy [--new-title <T>] --chain "1.读当前计划→2.复制→3.回执"` | 1 | 复制训练计划 |
| `python scripts/render_plan_receipt.py --live-plan-rest --week <W> --day <D> --rest <1\|0> --chain "1.定位天→2.标记→3.回执"` | 1 | 定休息日 |
| `python scripts/render_plan_receipt.py --live-plan-add --week <W> --day <D> --name <动作> --sets <N> [--weight <kg>] --chain "1.定位时段→2.加动作→3.回执"` | 1 | 加训练动作 |
| `python scripts/render_plan_receipt.py --live-plan-set-week --week <W> --days-json <JSON> --chain "1.解析7天→2.写库→3.回执"` | 1 | 定一周计划 |
| `python scripts/render_plan_receipt.py --live-plan-update --field <X> --value <Y> --chain "1.读旧值→2.更新→3.回执"` | 1 | 改训练计划 |
| `python scripts/render_plan_receipt.py --live-plan-update-day --week <W> --day <D> --session <S> [--label <L>] --chain "1.读现状→2.更新→3.回执"` | 1 | 改某天训练 |
| `python scripts/render_plan_receipt.py --live-plan-delete-day --week <W> --day <D> --chain "1.快照→2.确认→3.删除→4.回执"` | 1 | 删某天训练 |
| `python scripts/render_plan_receipt.py --live-plan-update-movement --week <W> --day <D> --session <S> --old-name <A> --new-name <B> --chain "1.定位动作→2.替换→3.回执"` | 1 | 改动作 |
| `python scripts/render_plan_receipt.py --live-plan-delete --chain "1.概要→2.确认→3.删除→4.回执"` | 1 | 撤销训练计划 |
| `python scripts/sync_plan.py --days 1` | 1 | 落地训练 |
| `python scripts/render_plan_receipt.py --live-plan-sync --date <D> --chain "1.审计动作名→2.推送→3.回执"` | 1 | 同步到训记 |
| `python scripts/render_plan_receipt.py --live-plan-backfill --date <D> --chain "1.拉取→2.回写→3.回执"` | 1 | 拉训记实绩 |
| `python scripts/render_exercise_review_html.py --days 7` | 1 | 计划复盘（本周） |
| `python scripts/render_workout_plan.py --completion` | 1 | 看计划完成率 |
| `python scripts/render_workout_plan.py --missed --days <N>` | 1 | 看未完成训练 |
| `python scripts/render_workout_plan.py --movement-rate --days <N>` | 1 | 看动作完成率 |
| `python scripts/render_contraindication.py` | 1 | 扫禁忌 |

## 四、用到的老模板名

| 模板名 | 条数 | 唤醒词 |
|---|---:|---|
| `workout_plan_view.html` | 13 | 看本周计划、看下周计划、看上周计划、看指定周计划、看今天练什么、看某动作安排、看某天练什么、看计划概览、看完整计划、看计划 vs 实际、看计划完成率、看未完成训练、看动作完成率 |
| `crud_receipt.html` | 11 | 复制训练计划、定休息日、加训练动作、定一周计划、改训练计划、改某天训练、删某天训练、改动作、撤销训练计划、同步到训记、拉训记实绩 |
| `process_progress.html` | 3 | 落地训练、落地到本周末、落地到本月底 |
| `exercise_review.html` | 3 | 计划复盘（本周）、计划复盘（本月）、计划复盘（全部） |
| `plan_builder_wizard.html` | 1 | 定训练计划 |
| `contraindication_report.html` | 1 | 扫禁忌 |

## 六、本表不下的结论

- **「属于哪一种去处」不在这里下**（必须多步交互／缺命令／新架构划出去不做）——那要连老技能的脚本实物一起看，见同批的 `t168-old-script-chains.md`。
- **「怎么补」不在本表**——纠正／优化／开发的分档已在 `t180-command-gap-classification.md` 按场景做过一次，本表只钉事实，不重复裁定。
- **窗口对不对不在本表**——本表只抄路由原文，窗口语义的判定见 `#250` 与 `t168` 的正文。
