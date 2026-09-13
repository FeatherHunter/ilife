# t166 · 场景 02 饮食：逐条对账 ＋「没有整页装配」的名单（事实底座）

> 票 [#166](https://github.com/FeatherHunter/ilife/issues/166)（公共层提取与边界）的事实底座。
> 决议（页面类归属、公共层增量、票单）见本票的决议评论与地图改版；**本文件只放可复算的事实**。
> 复算脚本住 `.scratch/t166/`：`extract-old-diet.py`（抽老表）／`reconcile.py`（逐条对账 ＋ 老模板形状）／
> `status.py`（新仓逐条执行状态）／`count-keys.py`（命令册计数）。四个脚本一律只读老技能目录与本仓源码。

## 〇、口径与来源

| 项 | 值 | 来源 |
|---|---|---|
| 老表全量 | **436** 条唤醒词 | `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\_triggers.py`（纯数据，无 import；`ast.literal_eval` 直接读） |
| 老表里 `category='饮食'` | **70** 条 | 同上 |
| 新仓场景 02 | **70** 条 | `packages/skill-calorie/src/triggers/scene-02-diet.ts` |
| 命令册 | **100** 条命令 ＝ **35 条会改数据库的命令**（receipt 形状）＋ **65 条查询命令** | `packages/skill-calorie/src/cli/keys.ts` |

## 一、逐条对账：老表 ↔ 新仓

**结论：新仓那份是逐字拆自老表——`key`／`output_type`／模板三项的差异 0 条，词面一一对应。**
也就是说所谓「幻觉词」在场景 02 **不存在**：70 条老技能当年全都有设计，没有一条是新仓凭空加出来的。

| 唤醒词 | 老 key | 老 output_type | 老模板 | 老的入口（脚本，节选） | 新 key | 新 output_type | 新模板 | 新路由形态 |
|---|---|---|---|---|---|---|---|---|
| 记一餐 | diet_add_meal | receipt | crud_receipt.html | render_crud_receipt.py | diet_add_meal | receipt | crud_receipt.html | 有命令 |
| 记一餐（含备注） | diet_add_meal_note | receipt | crud_receipt.html | render_crud_receipt.py | diet_add_meal_note | receipt | crud_receipt.html | 有命令 |
| 补记饮食 | diet_backfill | receipt | crud_receipt.html | render_crud_receipt.py | diet_backfill | receipt | crud_receipt.html | 有命令 |
| 批量补记饮食 | diet_backfill_batch | receipt | crud_receipt.html | render_crud_receipt.py | diet_backfill_batch | receipt | crud_receipt.html | 有命令 |
| 拍营养表记一餐 | diet_scan_label | process | nutrition_label_wizard.html | render_nutrition_label.py | diet_scan_label | process | nutrition_label_wizard.html | 无命令 |
| 拍营养表补记一餐 | diet_scan_label_date | process | nutrition_label_wizard.html | render_nutrition_label.py | diet_scan_label_date | process | nutrition_label_wizard.html | 无命令 |
| 记喝水 | diet_log_water | receipt | crud_receipt.html | render_crud_receipt.py | diet_log_water | receipt | crud_receipt.html | 有命令 |
| 复制昨日饮食 | diet_copy_yesterday | receipt | crud_receipt.html | render_crud_receipt.py | diet_copy_yesterday | receipt | crud_receipt.html | 有命令 |
| 改饮食记录 | diet_update_record | receipt | crud_receipt.html | render_crud_receipt.py | diet_update_record | receipt | crud_receipt.html | 有命令 |
| 改某日饮食 | diet_update_by_date | receipt | crud_receipt.html | render_crud_receipt.py | diet_update_by_date | receipt | crud_receipt.html | 有命令 |
| 删饮食记录 | diet_delete_record | receipt | crud_receipt.html | render_crud_receipt.py | diet_delete_record | receipt | crud_receipt.html | 有命令 |
| 删一餐 | diet_delete_by_meal | receipt | crud_receipt.html | render_crud_receipt.py | diet_delete_by_meal | receipt | crud_receipt.html | 有命令 |
| 删某日饮食 | diet_delete_by_date | receipt | crud_receipt.html | render_crud_receipt.py | diet_delete_by_date | receipt | crud_receipt.html | 有命令 |
| 批量删饮食 | diet_delete_by_range | receipt | crud_receipt.html | render_crud_receipt.py | diet_delete_by_range | receipt | crud_receipt.html | 有命令 |
| 看今日饮食 | diet_view_today | result | today_diet.html | render_today_diet.py | diet_view_today | result | today_diet.html | 有命令 |
| 看昨日饮食 | diet_view_yesterday | result | today_diet.html | render_today_diet.py | diet_view_yesterday | result | today_diet.html | 有命令 |
| 看本周饮食 | diet_view_this_week | result | today_meals.html | render_today_meals.py | diet_view_this_week | result | today_meals.html | 有命令 |
| 看上周饮食 | diet_view_last_week | result | today_meals.html | render_today_meals.py | diet_view_last_week | result | today_meals.html | 有命令 |
| 看本月饮食 | diet_view_this_month | result | today_meals.html | render_today_meals.py | diet_view_this_month | result | today_meals.html | 有命令 |
| 看上月饮食 | diet_view_last_month | result | today_meals.html | render_today_meals.py | diet_view_last_month | result | today_meals.html | 有命令 |
| 看最近 7 天饮食 | diet_view_7d | result | today_meals.html | render_today_meals.py | diet_view_7d | result | today_meals.html | 有命令 |
| 看最近 30 天饮食 | diet_view_30d | result | today_meals.html | render_today_meals.py | diet_view_30d | result | today_meals.html | 有命令 |
| 看某段时间饮食 | diet_view_range | result | today_meals.html | render_today_meals.py | diet_view_range | result | today_meals.html | 有命令 |
| 看今日喝水 | diet_view_water | result | today_water.html | render_today_water.py | diet_view_water | result | today_water.html | 有命令 |
| 看有备注的饮食记录 | diet_view_with_note | result | today_meals.html | render_today_meals.py | diet_view_with_note | result | today_meals.html | 无命令 |
| 查食品 | food_search | result | food_search.html | render_food_search.py | food_search | result | food_search.html | 有命令 |
| 查食品（按分类） | food_search_category | result | food_search.html | render_food_search.py | food_search_category | result | food_search.html | 有命令 |
| 存食品 | food_add | receipt | crud_receipt.html | render_crud_receipt.py | food_add | receipt | crud_receipt.html | 有命令 |
| 改食品 | food_update | receipt | crud_receipt.html | render_crud_receipt.py | food_update | receipt | crud_receipt.html | 有命令 |
| 下架食品 | food_deprecate | receipt | crud_receipt.html | render_crud_receipt.py | food_deprecate | receipt | crud_receipt.html | 有命令 |
| 看食品库（去重） | food_dedupe | result | dedupe_report.html | render_dedupe_report.py | food_dedupe | result | dedupe_report.html | 有命令 |
| 批量导入食品 | food_batch_import | process | batch_import_preview.html | render_batch_import.py | food_batch_import | process | batch_import_preview.html | 无命令 |
| 校验批量导入 | food_batch_validate | result | batch_import_preview.html | batch_import.py | food_batch_validate | result | batch_import_preview.html | 无命令 |
| 看食品来源统计 | food_source_stats | result | source_stats.html | render_source_stats.py | food_source_stats | result | source_stats.html | 有命令 |
| 看营养结构 | nutrition_ratio | result | nutrition_ratio.html | render_nutrition_ratio.py | nutrition_ratio | result | nutrition_ratio.html | 有命令 |
| 看今日营养 | nutrition_today | result | today_diet.html | render_today_diet.py | nutrition_today | result | today_diet.html | 有命令 |
| 看饮食总览 | nutrition_overview | result | diet_overview.html | render_diet_overview.py | nutrition_overview | result | diet_overview.html | 有命令 |
| 看营养素深度 | nutrition_detail | result | nutrition_detail.html | render_nutrition_detail.py | nutrition_detail | result | nutrition_detail.html | 有命令 |
| 看高热量榜 | ranking_high_calorie | result | food_ranking.html | render_food_ranking.py | ranking_high_calorie | result | food_ranking.html | 有命令 |
| 看低热量榜 | ranking_low_calorie | result | food_ranking.html | render_food_ranking.py | ranking_low_calorie | result | food_ranking.html | 有命令 |
| 看频繁吃榜 | ranking_frequent | result | food_ranking.html | render_food_ranking.py | ranking_frequent | result | food_ranking.html | 有命令 |
| 看高碳水榜 | ranking_high_carb | result | food_ranking.html | render_food_ranking.py | ranking_high_carb | result | food_ranking.html | 有命令 |
| 看高蛋白榜 | ranking_high_protein | result | food_ranking.html | render_food_ranking.py | ranking_high_protein | result | food_ranking.html | 有命令 |
| 看全部排行榜 | ranking_all | result | food_ranking.html | render_food_ranking.py | ranking_all | result | food_ranking.html | 有命令 |
| 看高热量榜（最近 30 天） | ranking_high_calorie_30d | result | food_ranking.html | render_food_ranking.py | ranking_high_calorie_30d | result | food_ranking.html | 有命令 |
| 看高热量榜（本月） | ranking_high_calorie_month | result | food_ranking.html | render_food_ranking.py | ranking_high_calorie_month | result | food_ranking.html | 有命令 |
| 看高热量榜（自定义） | ranking_high_calorie_custom | result | food_ranking.html | render_food_ranking.py | ranking_high_calorie_custom | result | food_ranking.html | 有命令 |
| 看低热量榜（最近 30 天） | ranking_low_calorie_30d | result | food_ranking.html | render_food_ranking.py | ranking_low_calorie_30d | result | food_ranking.html | 有命令 |
| 看低热量榜（本月） | ranking_low_calorie_month | result | food_ranking.html | render_food_ranking.py | ranking_low_calorie_month | result | food_ranking.html | 有命令 |
| 看低热量榜（自定义） | ranking_low_calorie_custom | result | food_ranking.html | render_food_ranking.py | ranking_low_calorie_custom | result | food_ranking.html | 有命令 |
| 看频繁吃榜（最近 30 天） | ranking_frequent_30d | result | food_ranking.html | render_food_ranking.py | ranking_frequent_30d | result | food_ranking.html | 有命令 |
| 看频繁吃榜（本月） | ranking_frequent_month | result | food_ranking.html | render_food_ranking.py | ranking_frequent_month | result | food_ranking.html | 有命令 |
| 看频繁吃榜（自定义） | ranking_frequent_custom | result | food_ranking.html | render_food_ranking.py | ranking_frequent_custom | result | food_ranking.html | 有命令 |
| 看高碳水榜（最近 30 天） | ranking_high_carb_30d | result | food_ranking.html | render_food_ranking.py | ranking_high_carb_30d | result | food_ranking.html | 有命令 |
| 看高碳水榜（本月） | ranking_high_carb_month | result | food_ranking.html | render_food_ranking.py | ranking_high_carb_month | result | food_ranking.html | 有命令 |
| 看高碳水榜（自定义） | ranking_high_carb_custom | result | food_ranking.html | render_food_ranking.py | ranking_high_carb_custom | result | food_ranking.html | 有命令 |
| 看高蛋白榜（最近 30 天） | ranking_high_protein_30d | result | food_ranking.html | render_food_ranking.py | ranking_high_protein_30d | result | food_ranking.html | 有命令 |
| 看高蛋白榜（本月） | ranking_high_protein_month | result | food_ranking.html | render_food_ranking.py | ranking_high_protein_month | result | food_ranking.html | 有命令 |
| 看高蛋白榜（自定义） | ranking_high_protein_custom | result | food_ranking.html | render_food_ranking.py | ranking_high_protein_custom | result | food_ranking.html | 有命令 |
| 饮食复盘（本周） | diet_review_week | result | diet_review.html | render_diet_review.py | diet_review_week | result | diet_review.html | 有命令 |
| 饮食复盘（本月） | diet_review_month | result | diet_review.html | render_diet_review.py | diet_review_month | result | diet_review.html | 有命令 |
| 饮食复盘（最近 90 天） | diet_review_90d | result | diet_review.html | render_diet_review.py | diet_review_90d | result | diet_review.html | 有命令 |
| 饮食复盘（今年） | diet_review_year | result | diet_review.html | render_diet_review.py | diet_review_year | result | diet_review.html | 有命令 |
| 饮食复盘（自定义时间） | diet_review_range | result | diet_review.html | render_diet_review.py | diet_review_range | result | diet_review.html | 有命令 |
| 看早餐（最近 7 天） | meal_dist_breakfast | result | meal_distribution.html | render_meal_distribution.py | meal_dist_breakfast | result | meal_distribution.html | 有命令 |
| 看午餐（最近 7 天） | meal_dist_lunch | result | meal_distribution.html | render_meal_distribution.py | meal_dist_lunch | result | meal_distribution.html | 有命令 |
| 看晚餐（最近 7 天） | meal_dist_dinner | result | meal_distribution.html | render_meal_distribution.py | meal_dist_dinner | result | meal_distribution.html | 有命令 |
| 看加餐（最近 7 天） | meal_dist_snack | result | meal_distribution.html | render_meal_distribution.py | meal_dist_snack | result | meal_distribution.html | 有命令 |
| 看全部餐别分布（最近 7 天） | meal_dist_all | result | meal_distribution.html | render_meal_distribution.py | meal_dist_all | result | meal_distribution.html | 有命令 |
| 看「有备注」的饮食记录 | — | — | — | render_today_meals.py | — | — | — | 无命令 |

## 二、逐字段差异

| 唤醒词 | 差异 |
|---|---|

差异行数 = **0**

> 70 条里 **69 条**是有 `key` 的正常条目；**1 条**是旧版遗留条目（`看「有备注」的饮食记录`：无 `key`、无 `output_type`、无模板），
> 它与 `看有备注的饮食记录` 是同一条能力的老写法。

## 三、今天能不能跑：64 条有命令／6 条没有

判定口径：`main_prompt.cli` 是否以 `calorie-cmd-read` 开头；命令是否出现在 `keys.ts` 的 `CALORIE_COMBOS` 里。
**64 条有命令的词，其命令全部在册（不在册 0 条）。**

|---|---|---|---|---|---|---|
| 1 | 记一餐 | diet_add_meal | receipt | `calorie.diet.add` | ✅ | **未见整页装配** |
| 2 | 记一餐（含备注） | diet_add_meal_note | receipt | `calorie.diet.add` | ✅ | **未见整页装配** |
| 3 | 补记饮食 | diet_backfill | receipt | `calorie.diet.add` | ✅ | **未见整页装配** |
| 4 | 批量补记饮食 | diet_backfill_batch | receipt | `calorie.diet.batch` | ✅ | **未见整页装配** |
| 5 | 拍营养表记一餐 | diet_scan_label | process | —（无命令：`拍包装上的营养成分表照片，识别出热量与蛋白／碳水／脂肪，确认后记入今`） | — | — |
| 6 | 拍营养表补记一餐 | diet_scan_label_date | process | —（无命令：`拍包装上的营养成分表照片，识别后按指定日期补记一餐`） | — | — |
| 7 | 记喝水 | diet_log_water | receipt | `calorie.water.log` | ✅ | **未见整页装配** |
| 8 | 复制昨日饮食 | diet_copy_yesterday | receipt | `calorie.diet.copy` | ✅ | **未见整页装配** |
| 9 | 改饮食记录 | diet_update_record | receipt | `calorie.diet.update` | ✅ | **未见整页装配** |
| 10 | 改某日饮食 | diet_update_by_date | receipt | `calorie.diet.update-by-date` | ✅ | **未见整页装配** |
| 11 | 删饮食记录 | diet_delete_record | receipt | `calorie.diet.remove` | ✅ | **未见整页装配** |
| 12 | 删一餐 | diet_delete_by_meal | receipt | `calorie.diet.remove-by-type` | ✅ | **未见整页装配** |
| 13 | 删某日饮食 | diet_delete_by_date | receipt | `calorie.diet.remove-by-date` | ✅ | **未见整页装配** |
| 14 | 批量删饮食 | diet_delete_by_range | receipt | `calorie.diet.remove-by-range` | ✅ | **未见整页装配** |
| 15 | 看今日饮食 | diet_view_today | result | `calorie.today` | ✅ | `buildTodayDietDoc` |
| 16 | 看昨日饮食 | diet_view_yesterday | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 17 | 看本周饮食 | diet_view_this_week | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 18 | 看上周饮食 | diet_view_last_week | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 19 | 看本月饮食 | diet_view_this_month | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 20 | 看上月饮食 | diet_view_last_month | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 21 | 看最近 7 天饮食 | diet_view_7d | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 22 | 看最近 30 天饮食 | diet_view_30d | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 23 | 看某段时间饮食 | diet_view_range | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 24 | 看今日喝水 | diet_view_water | result | `calorie.view.home` | ✅ | **未见整页装配** |
| 25 | 看有备注的饮食记录 | diet_view_with_note | result | —（无命令：`看带备注的饮食记录，按时间范围筛选（默认最近 7 天）`） | — | — |
| 26 | 查食品 | food_search | result | `calorie.view.search` | ✅ | `buildSearchDoc` |
| 27 | 查食品（按分类） | food_search_category | result | `calorie.view.library` | ✅ | `buildLibraryDoc` |
| 28 | 存食品 | food_add | receipt | `calorie.product.add` | ✅ | **未见整页装配** |
| 29 | 改食品 | food_update | receipt | `calorie.product.update` | ✅ | **未见整页装配** |
| 30 | 下架食品 | food_deprecate | receipt | `calorie.product.deprecate` | ✅ | **未见整页装配** |
| 31 | 看食品库（去重） | food_dedupe | result | `calorie.view.dedupe` | ✅ | `buildDedupeDoc` |
| 32 | 批量导入食品 | food_batch_import | process | —（无命令：`先看导入预览（导入条数／跳过条数／失败明细） → 确认后写入食品库`） | — | — |
| 33 | 校验批量导入 | food_batch_validate | result | —（无命令：`校验食品数据文件逐行结果与失败原因 → 不写入食品库`） | — | — |
| 34 | 看食品来源统计 | food_source_stats | result | `calorie.view.library` | ✅ | `buildLibraryDoc` |
| 35 | 看营养结构 | nutrition_ratio | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 36 | 看今日营养 | nutrition_today | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 37 | 看饮食总览 | nutrition_overview | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 38 | 看营养素深度 | nutrition_detail | result | `calorie.view.nutrition-detail` | ✅ | `buildNutritionDetailDoc` |
| 39 | 看高热量榜 | ranking_high_calorie | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 40 | 看低热量榜 | ranking_low_calorie | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 41 | 看频繁吃榜 | ranking_frequent | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 42 | 看高碳水榜 | ranking_high_carb | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 43 | 看高蛋白榜 | ranking_high_protein | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 44 | 看全部排行榜 | ranking_all | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 45 | 看高热量榜（最近 30 天） | ranking_high_calorie_30d | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 46 | 看高热量榜（本月） | ranking_high_calorie_month | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 47 | 看高热量榜（自定义） | ranking_high_calorie_custom | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 48 | 看低热量榜（最近 30 天） | ranking_low_calorie_30d | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 49 | 看低热量榜（本月） | ranking_low_calorie_month | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 50 | 看低热量榜（自定义） | ranking_low_calorie_custom | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 51 | 看频繁吃榜（最近 30 天） | ranking_frequent_30d | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 52 | 看频繁吃榜（本月） | ranking_frequent_month | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 53 | 看频繁吃榜（自定义） | ranking_frequent_custom | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 54 | 看高碳水榜（最近 30 天） | ranking_high_carb_30d | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 55 | 看高碳水榜（本月） | ranking_high_carb_month | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 56 | 看高碳水榜（自定义） | ranking_high_carb_custom | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 57 | 看高蛋白榜（最近 30 天） | ranking_high_protein_30d | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 58 | 看高蛋白榜（本月） | ranking_high_protein_month | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 59 | 看高蛋白榜（自定义） | ranking_high_protein_custom | result | `calorie.view.ranking` | ✅ | `buildAllRankingsDoc`、`buildRankingDoc` |
| 60 | 饮食复盘（本周） | diet_review_week | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 61 | 饮食复盘（本月） | diet_review_month | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 62 | 饮食复盘（最近 90 天） | diet_review_90d | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 63 | 饮食复盘（今年） | diet_review_year | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 64 | 饮食复盘（自定义时间） | diet_review_range | result | `calorie.view.diet-review` | ✅ | `buildDietReviewDoc` |
| 65 | 看早餐（最近 7 天） | meal_dist_breakfast | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 66 | 看午餐（最近 7 天） | meal_dist_lunch | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 67 | 看晚餐（最近 7 天） | meal_dist_dinner | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 68 | 看加餐（最近 7 天） | meal_dist_snack | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 69 | 看全部餐别分布（最近 7 天） | meal_dist_all | result | `calorie.view.diet` | ✅ | `buildViewDietDoc` |
| 70 | 看「有备注」的饮食记录 | — | — | —（无命令：`看带备注的饮食记录，时间范围默认最近 <N> 天`） | — | — |

小计：有命令 **64** 条／无命令 **6** 条／命令不在册 **0** 条。

## 四、6 条没有命令的词：老技能当年怎么做、今天缺什么

处置分类照 `docs/skills/skill-calorie/t180-command-gap-classification.md:23-31`（该表的口径：**纠正**＝已有命令能办、只是接错；**优化**＝承载命令已有、加参数即可；**开发**＝连命令都没有）。
场景 02 的结果是 **纠正 1 ／优化 5 ／开发 0**。

| 唤醒词 | #180 的处置 | 老技能当年的入口（原文） | 今天缺的到底是什么 |
|---|---|---|---|
| 拍营养表记一餐 | **优化** | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> → 确认后 python scripts/calorie_tracker.py add` | 识别在模型侧（本仓 `vision|mmx|ocr` 命中 0），缺的是「营养表 → `calorie.diet.add` 参数」的映射说明 ＋ 一张识别结果确认页 |
| 拍营养表补记一餐 | **优化** | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> --date <日期> → 确认后 python scripts/calorie_tracker.py add --date <日期>` | 同上 ＋ `date`／`time` 两个参数（`补记饮食` 已用同一形状） |
| 看有备注的饮食记录 | **优化** | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | 给 `calorie.today` 或 `calorie.view.diet` 加 `hasNote`；取数已含备注列（`fetch/diet.ts:289`），缺的是筛参与页面上的备注列 |
| 看「有备注」的饮食记录 | **优化** | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | 与上一行同一条能力（旧版遗留条目：无 key、无 output_type、无模板）；本条与上一行是否合成一条路由待拍板 |
| 批量导入食品 | **优化** | `python scripts/render_batch_import.py --input <preview.json> → 确认后 python scripts/batch_import.py import <file.jsonl>` | 查询命令 `calorie.view.batch-import-preview` 已在册（`keys.ts:124`），写库函数也在（`fetch/batch.ts:136` `importProducts`）；**写入口的形态未定**（#180 §要点第 4 条专门留了这个待决） |
| 校验批量导入 | **纠正** | `python scripts/batch_import.py validate <file.jsonl> --json-output <out.json> → python scripts/render_batch_import.py --input <out.json>` | 专面命令 `calorie.view.batch-import-preview` 能办这件事，`routing.ts:194` 没接上 |

## 五、没有整页装配的 16 条（本图页面交付的真实工作面）

判定口径：该命令在 `cli/cmd_read.ts` 的 `case` 块里有没有调用 `build*Doc(` 形状的整页装配函数；
这批函数的装配入口是共用件 `assembleDocPage`（`src/shared/docPage.ts:47`）。

| 类 | 条数 | 唤醒词 | 性质 |
|---|---|---|---|
| 会改数据库的命令的回执 | 15 | 记一餐／记一餐（含备注）／补记饮食／批量补记饮食／记喝水／复制昨日饮食／改饮食记录／改某日饮食／删饮食记录／删一餐／删某日饮食／批量删饮食／存食品／改食品／下架食品 | 走 `receiptHtml()` 片段（`src/cli/write.ts:202`）；#179 只把场景 07 那三条写命令切成完整文档，注释自述「其余 32 条一字不改」 |
| 接法有问题的查询词 | 1 | 看今日喝水 | 接的是 `calorie.view.home`（走 `renderHomeHtml`，老式渲染器），而专面命令 `calorie.view.today-water` 有整页装配却没人用 |

**其余 48 条**（读类页面）已经走整页装配：`buildRankingDoc`／`buildAllRankingsDoc` 21 条、`buildViewDietDoc` 14 条、`buildDietReviewDoc` 7 条、
`buildLibraryDoc` 2 条、`buildTodayDietDoc`／`buildSearchDoc`／`buildDedupeDoc`／`buildNutritionDetailDoc` 各 1 条。
**内容是否对齐老实物，是这些页面各自的审计项，本文件不下结论。**

## 六、老模板实物（页面类的依据）

### `batch_import_preview.html`（24324 字节）

- 引用它的老脚本：`render_batch_import.py`、`_triggers.py`
- 标题（前 14 个）：foods_2026-07.jsonl｜导入概览｜处理进度｜明细｜确认后操作
- 类名线索：`section`、`section-title`、`kpi-grid`、`list`、`copy-section`、`copy-preview`、`kpi`、`total`、`added`、`failed`、`skipped`、`updated`

### `crud_receipt.html`（26279 字节）

- 引用它的老脚本：`render_body_delete_receipt.py`、`render_crud_receipt.py`、`render_exercise_receipt.py`、`render_plan_receipt.py`、`_triggers.py`
- 标题（前 14 个）：✅ 操作回执｜📋 字段变更｜📊 今日累计｜📋 复制明细
- 类名线索：`id-card`、`kpi-grid`、`diff-card`、`ctx-card`、`items-card`、`kpi`、`sum-kpis`、`diff-row`、`diff-label`、`diff-old`、`diff-arrow`、`diff-new`、`diff-impact`

### `dedupe_report.html`（6458 字节）

- 引用它的老脚本：`render_dedupe_report.py`、`_triggers.py`
- 标题（前 14 个）：📦 食品库去重｜重复组列表
- 类名线索：`kpi-grid`、`kpi`、`section`、`table-wrap`

### `diet_overview.html`（7682 字节）

- 引用它的老脚本：`render_diet_overview.py`、`_triggers.py`
- 标题（前 14 个）：🍱 饮食总览｜本周累计｜本月累计
- 类名线索：`kpi-grid`、`kpi`、`chart-title`、`chart-hint`、`chart`

### `diet_review.html`（9041 字节）

- 引用它的老脚本：`render_diet_review.py`、`_triggers.py`
- 标题（前 14 个）：📝 饮食复盘｜每日热量趋势｜高频食物 TOP5
- 类名线索：`kpi-grid`、`kpi`、`section`、`chart-title`、`chart-hint`、`chart`、`top-list`

### `food_ranking.html`（14349 字节）

- 引用它的老脚本：`render_food_ranking.py`、`_triggers.py`
- 标题（前 14 个）：🍽️ 食物排行榜｜📤 复制回 AI（让 AI 帮你解读）
- 类名线索：`table-wrap`、`copy-section`

### `food_search.html`（7913 字节）

- 引用它的老脚本：`render_food_search.py`、`_triggers.py`
- 标题（前 14 个）：🍱 食物热量查询
- 类名线索：`food-card`

### `meal_distribution.html`（11004 字节）

- 引用它的老脚本：`render_meal_distribution.py`、`_triggers.py`
- 标题（前 14 个）：🍽️ 餐别分布｜餐别热量占比｜明细
- 类名线索：`kpi-grid`、`kpi`、`section`、`dist-list`、`table-wrap`

### `nutrition_detail.html`（6147 字节）

- 引用它的老脚本：`render_nutrition_detail.py`、`_triggers.py`
- 标题（前 14 个）：🧪 营养素深度｜微量营养素 vs 推荐
- 类名线索：`card`

### `nutrition_label_wizard.html`（22873 字节）

- 引用它的老脚本：`render_nutrition_label.py`、`_triggers.py`
- 标题（前 14 个）：营养成分确认｜基本信息｜营养成分 (每 100g)｜份量与备注｜确认后操作
- 类名线索：`section`、`diff-tag`、`ai`、`copy-section`、`copy-preview`

### `nutrition_ratio.html`（12604 字节）

- 引用它的老脚本：`render_nutrition_ratio.py`、`_triggers.py`
- 标题（前 14 个）：🥗 营养配比｜热量来源占比｜推荐范围对比
- 类名线索：`kpi-grid`、`kpi`、`section`、`table-wrap`

### `source_stats.html`（5539 字节）

- 引用它的老脚本：`render_source_stats.py`、`_triggers.py`
- 标题（前 14 个）：📦 食品来源统计｜按来源分组
- 类名线索：`kpi-grid`、`kpi`、`section`

### `today_diet.html`（18790 字节）

- 引用它的老脚本：`check_decision_matrix.py`、`render_today_diet.py`、`_triggers.py`
- 标题（前 14 个）：🍽️ 今日饮食｜餐次进度｜营养配比｜今日明细
- 类名线索：`kpi-grid`、`kpi`、`kpi-rec`、`kpi-cal`、`kpi-prot`、`kpi-carb`、`kpi-fat`、`kpi-water`、`section`、`table-wrap`

### `today_meals.html`（19918 字节）

- 引用它的老脚本：`check_decision_matrix.py`、`render_today_meals.py`、`_triggers.py`
- 标题（前 14 个）：🍱 吃的记录｜按日汇总｜每日明细
- 类名线索：`kpi-grid`、`kpi`、`section`、`daily-chart`、`daily-chart-axis`、`table-wrap`、`table-daily`

### `today_water.html`（10247 字节）

- 引用它的老脚本：`render_today_water.py`、`_triggers.py`
- 标题（前 14 个）：💧 今日饮水｜今日进度｜本周 7 天｜今日每杯
- 类名线索：`section`、`bar-chart`

## 七、路由层另有 4 处缺陷（登记在 [卡路里：路由层窗口与命令接错纠正](https://github.com/FeatherHunter/ilife/issues/250) 的账上）

出处：`docs/skills/skill-calorie/t180-scenes-01-05.md` §4.1–4.3。

| 处 | 唤醒词 | 现状 | 应为 |
|---|---|---|---|
| 窗口错 | 看本周饮食（`routing.ts:179`） | 1 天（`09-07..09-07`） | 7 天 |
| 窗口错 | 饮食复盘（本周）（`routing.ts:223`） | 1 天 | 7 天 |
| 命令接错 | 看食品来源统计（`routing.ts:196`） | `calorie.view.library`（分类食品列表） | `calorie.view.source-stats` |
| 口径偏松 | 看今日喝水（`routing.ts:186`） | `calorie.view.home`（总览里的数字） | `calorie.view.today-water` |
| 参数丢失 | 看早餐／看午餐／看晚餐／看加餐／看全部餐别分布（最近 7 天）（`routing.ts:228-232`） | 5 条接同一条命令、没有餐别参数 | 餐别维度（旧链是 `--meal breakfast/lunch/dinner/snack/all`） |

> 第 5 行最要紧：`meal_distribution.html` 那 5 条词靠今天的命令**做不出餐别分布页**——这是命令面欠账，不是页面欠账。

## 八、余下待拍板的事（见本票的讨论与决议评论）

1. 页面类怎么归、每类归谁管（卡路里公共层／`packages/base-render/src/`／就地）。
2. `拍营养表` 那 2 条是否推翻架构规格、在本图做出来（地图正文的 Destination 要求 70 条全跑通，Out of scope 又把这 2 条划出去）。
3. 批量导入的写入口用哪个形态（给查询命令加写参数／给 `calorie.product.add` 加批量入参／新增一条会改数据库的命令）。
4. 饮食域的页面模块要不要跟着本图搬进能力目录（照 #179 的先例 `src/profile/`）。
5. `#250` 与场景 02 那 4 处的关系，以及本图票单的切法。

