# 卡路里 HELP 场景清单总账（436 条唤醒词逐条实跑）

> 用户 2026-09-12 要的「按 HELP 当前能力、每个场景：场景名／prompt／样例 HTML 绝对路径／缺口」的**总账**。
> 完整逐条表（每条 prompt 原文 ＋ 样例绝对路径）：桌面 `ilife-scene07\场景清单.md`（212 KB）／`场景清单.csv`；
> 样例 HTML：桌面 `ilife-scene07\场景样例\<唤醒词>.html`（436 条里落盘 338 个文件）。
> 生成（一次性脚本，不入库）：`.scratch/t239/inventory-run.mjs` ＋ `inventory-format.mjs`；数据面复用现成物——
> 唤醒词表 `dist/triggers/index.js` 的 `TRIGGERS`、可执行命令取路由表 `routesFor`、种子库 `docs/research/t81-seed.mjs`、prompt 取 HELP 的 `main_prompt.text`。

## 一、总览

| 项 | 数 |
|---|---|
| 唤醒词总数（SoT） | 436 |
| ✅ 打通（拿标准种子库真跑出 HTML 样例） | **340** |
| ❌ 没打通（新仓没有单命令入口） | **86** |
| ⛔ 没开发（架构明确不做） | **10** |
| 唯一命令数 ／ 实跑命令数 | 261 ／ 261 |
| **HELP 速查台里挂的命令可执行** | **83 ／ 436** |

## 二、按 HELP 分组

| 分组 | 打通 | 没打通 | 没开发 |
|---|---|---|---|
| 主页 | 9 | 0 | 0 |
| 饮食 | 64 | 4 | 2 |
| 体重 | 40 | 18 | 0 |
| 运动 | 37 | 2 | 0 |
| 健身计划 | 9 | 18 | 5 |
| 目标管理 | 22 | 3 | 0 |
| 基础信息 | 4 | 0 | 0 |
| 身体细节 | 11 | 2 | 0 |
| 身材照片 | 10 | 0 | 0 |
| 分析 | 128 | 39 | 0 |
| 复盘 | 6 | 0 | 3 |

## 三、三处必须说清的口径

1. **「没打通」＝路由桶 `legacy-chain`（85 条）**：老技能当年是多步交互链（或压根没单命令），新仓还没接——与「命令坏了」不是一回事，逐条账目在 `docs/skills/skill-calorie/t180-command-gap-classification.md`。
2. **「没开发」＝路由桶 `out-of-scope`（10 条）**：拍营养表 2（并入 #180）＋ 落地训练 3／同步训记 2（#182）＋ 定时复盘 3（#182）。
3. **另一条独立缺口、数字更大且不在上面 95 条里**：**HELP 速查台里 353 条唤醒词挂的还是老脚本命令**（如 `python scripts/render_health_dashboard.py`），只有 83 条是可执行的 `calorie-cmd-read …`——这是 **#180 数据清理第二步没做**：路由层（AI 真走那条）已有 341 条可执行，HELP 呈现层却还回老命令。**用户看到的 HELP HTML 受影响最大的就是这一条。**
4. 例外一条（**不是命令坏了**）：`复制昨日运动`（`calorie.exercise.add`）在标准种子库里 exit 4「昨日无运动记录可复制」——数据依赖的失败，库里前一日有运动即可跑通。

## 四、缺口逐条（96 条）

| # | 分组 | 场景名（唤醒词） | 状态 | key | 原因（路由表原文） |
|---|---|---|---|---|---|
| 1 | 饮食 | 拍营养表记一餐 | ⛔ 没开发 | `diet_scan_label` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。 |
| 2 | 饮食 | 拍营养表补记一餐 | ⛔ 没开发 | `diet_scan_label_date` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。 |
| 3 | 饮食 | 看有备注的饮食记录 | ❌ 没打通 | `diet_view_with_note` | 路由桶=legacy-chain；命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 4 | 饮食 | 批量导入食品 | ❌ 没打通 | `food_batch_import` | 路由桶=legacy-chain；命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 5 | 饮食 | 校验批量导入 | ❌ 没打通 | `food_batch_validate` | 路由桶=legacy-chain；命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 6 | 饮食 | 看「有备注」的饮食记录 | ❌ 没打通 | `—` | 路由桶=legacy-chain；命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 7 | 体重 | 看体重曲线（带目标） | ❌ 没打通 | `w_curve_target` | 路由桶=legacy-chain；命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 8 | 体重 | 看体重曲线（带里程碑） | ❌ 没打通 | `w_curve_milestone` | 路由桶=legacy-chain；命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 9 | 体重 | 看体重曲线（带异常点） | ❌ 没打通 | `w_curve_anomaly` | 路由桶=legacy-chain；命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 10 | 体重 | 看「有备注」的体重记录 | ❌ 没打通 | `w_notes` | 路由桶=legacy-chain；命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 11 | 体重 | 对比体重：当前 vs 平台期首日 | ❌ 没打通 | `w_cmp_plateau` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 12 | 体重 | 对比体重：当前 vs 历史最低 | ❌ 没打通 | `w_cmp_min` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 13 | 体重 | 对比体重：当前 vs 历史最高 | ❌ 没打通 | `w_cmp_max` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 14 | 体重 | 对比体重：减重 5kg 那天 vs 今天 | ❌ 没打通 | `w_cmp_5kg` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 15 | 体重 | 对比体重：减重 10kg 那天 vs 今天 | ❌ 没打通 | `w_cmp_10kg` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 16 | 体重 | 对比体重：当前 vs 入夏最低 | ❌ 没打通 | `w_cmp_summer` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 17 | 体重 | 对比体重：当前 vs 入冬最低 | ❌ 没打通 | `w_cmp_winter` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 18 | 体重 | 对比体重：运动多 vs 运动少的两个月 | ❌ 没打通 | `w_cmp_exercise` | 路由桶=legacy-chain；命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 19 | 体重 | 体重复盘（本周） | ❌ 没打通 | `w_review_week` | 路由桶=legacy-chain；命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 20 | 体重 | 体重复盘（本月） | ❌ 没打通 | `w_review_month` | 路由桶=legacy-chain；命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 21 | 体重 | 体重复盘（最近 90 天） | ❌ 没打通 | `w_review_90d` | 路由桶=legacy-chain；命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 22 | 体重 | 体重复盘（今年） | ❌ 没打通 | `w_review_year` | 路由桶=legacy-chain；命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 23 | 体重 | 体重复盘（自定义时间） | ❌ 没打通 | `w_review_range` | 路由桶=legacy-chain；命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 24 | 体重 | 看里程碑回溯 | ❌ 没打通 | `w_milestones` | 路由桶=legacy-chain；命中但不执行：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。 |
| 25 | 运动 | 复制昨日运动 | ❌ 没打通 | `calorie.exercise.add` | 命令跑了但没出产物：exit 4 ERR 4: 取数失败（缺失阻断）：昨日无运动记录可复制 |
| 26 | 运动 | 看运动记录（有备注） | ❌ 没打通 | `exercise_view_notes` | 路由桶=legacy-chain；命中但不执行：95 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 27 | 健身计划 | 看本周计划 | ❌ 没打通 | `plan_view_this_week` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 28 | 健身计划 | 看下周计划 | ❌ 没打通 | `plan_view_next_week` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 29 | 健身计划 | 看上周计划 | ❌ 没打通 | `plan_view_last_week` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 30 | 健身计划 | 看指定周计划 | ❌ 没打通 | `plan_view_week` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 31 | 健身计划 | 看今天练什么 | ❌ 没打通 | `plan_view_today` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 32 | 健身计划 | 看某动作安排 | ❌ 没打通 | `plan_view_movement` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 33 | 健身计划 | 看某天练什么 | ❌ 没打通 | `plan_view_day` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 34 | 健身计划 | 看计划 vs 实际 | ❌ 没打通 | `plan_vs_actual` | 路由桶=legacy-chain；命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 35 | 健身计划 | 定训练计划 | ❌ 没打通 | `plan_set` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 36 | 健身计划 | 复制训练计划 | ❌ 没打通 | `plan_copy` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 37 | 健身计划 | 定休息日 | ❌ 没打通 | `plan_set_rest` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 38 | 健身计划 | 加训练动作 | ❌ 没打通 | `plan_add_movement` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 39 | 健身计划 | 定一周计划 | ❌ 没打通 | `plan_set_week` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 40 | 健身计划 | 改训练计划 | ❌ 没打通 | `plan_update` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 41 | 健身计划 | 改某天训练 | ❌ 没打通 | `plan_update_day` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 42 | 健身计划 | 删某天训练 | ❌ 没打通 | `plan_delete_day` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 43 | 健身计划 | 改动作 | ❌ 没打通 | `plan_update_movement` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 44 | 健身计划 | 撤销训练计划 | ❌ 没打通 | `plan_delete` | 路由桶=legacy-chain；命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 45 | 健身计划 | 落地训练 | ⛔ 没开发 | `plan_execute` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 46 | 健身计划 | 落地到本周末 | ⛔ 没开发 | `plan_execute_weekend` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 47 | 健身计划 | 落地到本月底 | ⛔ 没开发 | `plan_execute_month` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 48 | 健身计划 | 同步到训记 | ⛔ 没开发 | `plan_sync_xunji` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。 |
| 49 | 健身计划 | 拉训记实绩 | ⛔ 没开发 | `plan_backfill_xunji` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。 |
| 50 | 目标管理 | 定营养目标(自动算) | ❌ 没打通 | `goal_set_nutrition_auto` | 路由桶=legacy-chain；命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 51 | 目标管理 | 定饮水目标(自动算) | ❌ 没打通 | `goal_set_water_auto` | 路由桶=legacy-chain；命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 52 | 目标管理 | 一键定全套目标 | ❌ 没打通 | `goal_set_full_kit` | 路由桶=legacy-chain；命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 53 | 身体细节 | 对比体脂 | ❌ 没打通 | `body_comp_compare` | 路由桶=legacy-chain；命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。 |
| 54 | 身体细节 | 对比围度 | ❌ 没打通 | `body_meas_compare` | 路由桶=legacy-chain；命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。 |
| 55 | 分析 | 看BMI报告 | ❌ 没打通 | `report_bmi` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 56 | 分析 | 看TDEE报告 | ❌ 没打通 | `report_tdee` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 57 | 分析 | 看BMR报告 | ❌ 没打通 | `report_bmr` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 58 | 分析 | 看蛋白质摄入报告 | ❌ 没打通 | `report_protein` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 59 | 分析 | 看水分摄入报告 | ❌ 没打通 | `report_water` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 60 | 分析 | 看综合评分 | ❌ 没打通 | `report_score` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 61 | 分析 | 看健康趋势 | ❌ 没打通 | `report_trend` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 62 | 分析 | 看健康报告(含对比) | ❌ 没打通 | `report_compare` | 路由桶=legacy-chain；命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，95 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 63 | 分析 | 看整体趋势(体重+摄入+运动) | ❌ 没打通 | `trend_g1` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 64 | 分析 | 看整体趋势(体重+体脂+围度) | ❌ 没打通 | `trend_g2` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 65 | 分析 | 看整体趋势(饮食+蛋白+纤维) | ❌ 没打通 | `trend_g3` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 66 | 分析 | 看整体趋势(运动+力量+有氧) | ❌ 没打通 | `trend_g4` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 67 | 分析 | 看整体趋势(BMI+体脂+肌肉量) | ❌ 没打通 | `trend_g5` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 68 | 分析 | 看整体趋势(摄入+蛋白+运动) | ❌ 没打通 | `trend_g6` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 69 | 分析 | 看整体趋势(体重+蛋白+缺口) | ❌ 没打通 | `trend_g7` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 70 | 分析 | 看整体趋势(体重+摄入+缺口) | ❌ 没打通 | `trend_g8` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 71 | 分析 | 看整体趋势(体重+摄入+运动+缺口) | ❌ 没打通 | `trend_g9` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 72 | 分析 | 看整体趋势(蛋白+运动) | ❌ 没打通 | `trend_g10` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 73 | 分析 | 看整体趋势(综合多指标) | ❌ 没打通 | `trend_g11` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 74 | 分析 | 看整体趋势(含月度对比) | ❌ 没打通 | `trend_period_monthly` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 75 | 分析 | 看整体趋势(含季度对比) | ❌ 没打通 | `trend_period_quarterly` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 76 | 分析 | 看整体趋势(含年度对比) | ❌ 没打通 | `trend_period_yearly` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 77 | 分析 | 看整体趋势(含目标对比) | ❌ 没打通 | `trend_period_target` | 路由桶=legacy-chain；命中但不执行：95 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 78 | 分析 | 看营养建议 | ❌ 没打通 | `nut_advice` | 路由桶=legacy-chain；命中但不执行：95 键无营养建议形态（view.diet-review／view.health 给数据盘，不给建议条目）。 |
| 79 | 分析 | 预测体重(自定义目标) | ❌ 没打通 | `pred_weight_target` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 80 | 分析 | 模拟减重(每天-300卡) | ❌ 没打通 | `pred_sim_cut_300` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 81 | 分析 | 模拟减重(每天-500卡) | ❌ 没打通 | `pred_sim_cut_500` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 82 | 分析 | 模拟减重(每天-700卡) | ❌ 没打通 | `pred_sim_cut_700` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 83 | 分析 | 模拟减重(30天减Xkg) | ❌ 没打通 | `pred_sim_target_30` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 84 | 分析 | 模拟减重(60天减Xkg) | ❌ 没打通 | `pred_sim_target_60` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 85 | 分析 | 模拟减重(90天减Xkg) | ❌ 没打通 | `pred_sim_target_90` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 86 | 分析 | 模拟减重(自定义天数减Xkg) | ❌ 没打通 | `pred_sim_target_custom` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 87 | 分析 | 摄入预测(按当前速率 1 周) | ❌ 没打通 | `pred_cal_week` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 88 | 分析 | 摄入预测(按当前速率 1 月) | ❌ 没打通 | `pred_cal_month` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 89 | 分析 | 摄入预测(按当前速率 3 月) | ❌ 没打通 | `pred_cal_3m` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 90 | 分析 | 摄入预测(自定义) | ❌ 没打通 | `pred_cal_custom` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 91 | 分析 | 摄入预测(营养目标达成预测) | ❌ 没打通 | `pred_cal_goal` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 92 | 分析 | 摄入预测(卡路里缺口预测) | ❌ 没打通 | `pred_cal_deficit` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 93 | 分析 | 摄入预测(摄入稳定性预测) | ❌ 没打通 | `pred_cal_stability` | 路由桶=legacy-chain；命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 94 | 复盘 | 关闭定时复盘 | ⛔ 没开发 | `—` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
| 95 | 复盘 | 开启定时复盘 | ⛔ 没开发 | `—` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
| 96 | 复盘 | 查定时复盘 | ⛔ 没开发 | `—` | 路由桶=out-of-scope；明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
