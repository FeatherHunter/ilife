# t154 老技能 HTML 清单（卡路里场景 03 体重 · 58 条唤醒词）

本件回答一个问题：**老卡路里技能里，与 Map #154 相关的 HTML 模板到底有哪些、各自什么形状、哪些该继承、哪些不许退回。**

- 老技能正本目录：`D:\2Study\StudyNotes\SKILLS\卡路里\`（本件**只读**，未改一行）。
- 本图 = Map #154：场景 03「体重」58 条唤醒词；页面归 6 类（见地图 `Decisions so far`）。
- 行号口径：老模板按 LF 计数，逐文件当场实测。字节与行数见 §1.2。
- 归属：`docs/skills/skill-calorie/`（票 #154 的子件）。

## 计数口径

- **「与本图相关」的定义**：① 被 58 条唤醒词**直接引用**（场景权威数据 `.scratch\scene_data\03-体重.json` 每条的 `html_template` 字段）；或 ② 未被直接引用、但老技能里有**命令／渲染脚本／其他场景数据**把它用在体重族页面上，且能与本图 6 类页面之一起对应。
- **58 条词是机械算出来的**，不是抄票面：读 `03-体重.json` 逐条取 `html_template` 再归并计数。复算脚本 `.scratch\t154\gen-t154-list.py`。
- 未被任何场景引用的模板张数见 §4（与地图里写的 24 **不一致**，差额已查清，见下）。

## §0.1 本轮裁定与事实订正

**裁定 1 · 「批量删体重」这条词的页面对齐目标认运行时，不认登记表。**

登记表口径（`_triggers.py:997`、`03-体重.json:202`）把 `w_delete_batch` 指向 `templates/crud_receipt.html`；但老技能**运行时**会把批量删分流到另一张：`render_crud_receipt.py:52-53` 判 `batch`，`--start/--end` 路径在 `:395-397` 传 `batch=True`、`:412` 写进 `data['data']`，用 `weight_batch_delete.html` 渲染。
本图要的是**用户当年真正看到的那张**，所以：**对齐目标＝`weight_batch_delete.html`**。
这与融合规范不冲突 —— `docs/skills/skill-calorie/t154-体重页面-老新融合规范.md` §2 第 10 条早就按运行时口径落点（`weight_batch_delete.html:113`、`:117-133` → `src/weight/receipt.ts:310`），是**清单的 §1 计数按登记口径算**。§1 的机械表照登记口径保留不动（它是「登记表说这条词属哪张」的可复算事实），**页面融合一律认运行时那张**。
因此 §3 把 `weight_batch_delete.html` 列为「相关」是对的，且应读成「本图⑥类页面必备的对齐目标」。

**订正 1 · 地图里「24 张模板没被任何场景引用」这个数不对。**

本件 §4 实测：**20 张（顶层口径）／22 张（含 `templates\临时样例\` 子目录口径）**。
差额来路：地图那个 `24` 是 `75 − 51` —— `75` 是 `templates\` 下全部 `.html`（含子目录 2 张），`51` 是 `_triggers.py` 里 `html_template` 的**去重名**数。**分母按文件算、减数按登记名算，两个集合不同，不能相减。** 真实场景数据引用数是 **53**。

**订正 2 · 老技能登记表里有一条死引用。**

`_triggers.py:2247`／`:2297`／`:2427`／`:2447` 四处登记了 `templates/goal_config.html`，**这张文件不存在**。列在这里是提醒后来人：拿登记表做口径时要验实物存在性。

## §1 58 条唤醒词 → 老模板 机械对照表

| 序 | key | 唤醒词 | subfunction | output_type | 老模板名（相对 `templates/`） | 老命令（`data_source`） | data_fields |
|---:|---|---|---|---|---|---|---|
| 1 | `w_log` | 记体重 | 量体重 | receipt | `templates/weight_log_receipt.html` | `python scripts/render_weight_receipt.py --live --kg <kg> --chain "1.解析→2.写库→3.回执"` | weight_kg<br>bmi<br>delta_last<br>goal_diff<br>date<br>time |
| 2 | `w_log_note` | 记体重（含备注） | 量体重 | receipt | `templates/weight_log_receipt.html` | `python scripts/render_weight_receipt.py --live --kg <kg> --note <备注> --chain "1.解析→2.写库→3.回执"` | weight_kg<br>bmi<br>note<br>note_tag<br>goal_diff<br>date<br>time |
| 3 | `w_backfill` | 补录体重 | 量体重 | receipt | `templates/weight_log_receipt.html` | `python scripts/render_weight_receipt.py --live --kg <kg> --date <YYYY-MM-DD> --chain "1.解析→2.查冲突→3.写库→4.回执"` | weight_kg<br>bmi<br>date<br>days_ago<br>backfill_flag<br>conflict |
| 4 | `w_backfill_batch` | 批量补录体重 | 量体重 | receipt | `templates/weight_batch_receipt.html` | `python scripts/render_weight_receipt.py --live-batch --input <jsonl> --chain "1.解析→2.查冲突→3.批量写库→4.回执"` | wrote<br>skipped<br>failed<br>fail_details<br>items |
| 5 | `w_today` | 看今日体重 | 量体重 | result | `templates/weight_dashboard.html` | `python scripts/render_weight_dashboard.py --view today --chain "1.识别→2.读DB→3.渲染"` | weight_kg<br>delta_last<br>summary<br>date |
| 6 | `w_update` | 改体重记录 | 改体重记录 | receipt | `templates/crud_receipt.html` | `python scripts/render_crud_receipt.py --live-weight-update --id <ID> --weight <kg> --note <备注> --chain "1.定位→2.写库→3.回执"` | id<br>weight_kg<br>note<br>old_record<br>new_record<br>bmi |
| 7 | `w_update_by_date` | 改某日体重 | 改体重记录 | receipt | `templates/crud_receipt.html` | `python scripts/render_crud_receipt.py --live-weight-update --date <YYYY-MM-DD> --weight <kg> [--note <备注>] --chain "1.定位→2.写库→3.回执"` | date<br>hit_count<br>old_record<br>new_record<br>weight_kg<br>note |
| 8 | `w_delete` | 删体重记录 | 改体重记录 | receipt | `templates/crud_receipt.html` | `python scripts/render_crud_receipt.py --live-weight-delete --id <ID> --chain "1.定位→2.快照→3.删除→4.回执"` | id<br>snapshot<br>date<br>weight_kg<br>confirm |
| 9 | `w_delete_by_date` | 删某日体重 | 改体重记录 | receipt | `templates/crud_receipt.html` | `python scripts/render_crud_receipt.py --live-weight-delete --date <YYYY-MM-DD> --chain "1.定位→2.快照→3.删除→4.回执"` | date<br>deleted_count<br>snapshot<br>confirm |
| 10 | `w_delete_batch` | 批量删体重 | 改体重记录 | receipt | `templates/crud_receipt.html` | `python scripts/render_crud_receipt.py --live-weight-delete --start <S> --end <E> --chain "1.定位→2.快照→3.删除→4.回执"` | start<br>end<br>deleted_count<br>snapshot<br>confirm |
| 11 | `w_detail_week` | 看本周体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --week current` | week<br>items<br>avg<br>net_change<br>summary |
| 12 | `w_detail_last_week` | 看上周体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --week last` | week<br>items<br>avg<br>net_change<br>vs_this_week |
| 13 | `w_detail_month` | 看本月体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --month current` | month<br>items<br>avg<br>net_change<br>summary |
| 14 | `w_detail_last_month` | 看上月体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --month last` | month<br>items<br>avg<br>net_change<br>vs_this_month |
| 15 | `w_detail_7d` | 看最近 7 天体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --days 7` | days<br>items<br>avg<br>net_change<br>summary |
| 16 | `w_detail_90d` | 看最近 90 天体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --days 90` | days<br>items<br>avg<br>net_change<br>summary |
| 17 | `w_detail_range` | 看某段时间体重 | 看体重明细 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode history --start <S> --end <E>` | start<br>end<br>items<br>avg<br>net_change<br>summary |
| 18 | `w_curve` | 看体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 30` | days<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 19 | `w_curve_target` | 看体重曲线（带目标） | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 30 --show-target` | days<br>items<br>target<br>goal_diff<br>current<br>delta<br>daily_rate |
| 20 | `w_curve_milestone` | 看体重曲线（带里程碑） | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 30 --show-milestones` | days<br>items<br>milestones<br>current<br>delta<br>daily_rate |
| 21 | `w_curve_anomaly` | 看体重曲线（带异常点） | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 30 --show-anomalies` | days<br>items<br>anomalies<br>current<br>delta<br>daily_rate |
| 22 | `w_curve_month` | 看本月体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --month current` | month<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 23 | `w_curve_last_month` | 看上月体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --month last` | month<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 24 | `w_curve_90d` | 看最近 90 天体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 90` | days<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 25 | `w_curve_180d` | 看最近 180 天体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 180` | days<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 26 | `w_curve_365d` | 看最近 365 天体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --days 365` | days<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 27 | `w_curve_range` | 看某段时间体重曲线 | 看体重曲线 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode trend --start <S> --end <E>` | start<br>end<br>items<br>current<br>delta<br>daily_rate<br>trend |
| 28 | `w_vol` | 看体重稳不稳（增强版） | 看体重稳不稳 | result | `templates/weight_volatility_v2.html` | `python scripts/render_weight_volatility_v2.py` | std<br>avg_daily_delta<br>anomaly_count<br>points<br>anomalies<br>baseline |
| 29 | `w_vol_month` | 看本月波动 | 看体重稳不稳 | result | `templates/weight_volatility_v2.html` | `python scripts/render_weight_volatility_v2.py --start <月初> --end <月末>` | month<br>std<br>avg_daily_delta<br>anomaly_count<br>points<br>anomalies |
| 30 | `w_vol_90d` | 看最近 90 天波动 | 看体重稳不稳 | result | `templates/weight_volatility_v2.html` | `python scripts/render_weight_volatility_v2.py --days 90` | days<br>std<br>avg_daily_delta<br>anomaly_count<br>points<br>anomalies |
| 31 | `w_vol_180d` | 看最近 180 天波动 | 看体重稳不稳 | result | `templates/weight_volatility_v2.html` | `python scripts/render_weight_volatility_v2.py --days 180` | days<br>std<br>avg_daily_delta<br>anomaly_count<br>points<br>anomalies |
| 32 | `w_vol_anomalies` | 看波动异常点 | 看体重稳不稳 | result | `templates/weight_volatility_v2.html` | `python scripts/render_weight_volatility_v2.py --view anomalies-only` | anomalies<br>reasons<br>summary |
| 33 | `w_notes` | 看「有备注」的体重记录 | 看体重备注 | result | `templates/weight_history.html` | `python scripts/render_weight_history.py --mode notes --days 30` | items<br>note_tags<br>tag_distribution<br>summary |
| 34 | `w_cmp_30d` | 对比体重：最近 30 天 vs 之前 30 天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | seg1<br>seg2<br>avg<br>delta_kg<br>rate_diff<br>speed_judge<br>volatility |
| 35 | `w_cmp_custom` | 对比体重：自定义两段时间 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a2 --start-a <S1> --end-a <E1> --start-b <S2> --end-b <E2> --chain "1.识别→2.读DB→3.对比→4.渲染"` | seg1<br>seg2<br>avg<br>delta_kg<br>rate_diff<br>speed_judge<br>volatility |
| 36 | `w_cmp_week` | 对比体重：本周 vs 上周 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a3 --chain "1.识别→2.读DB→3.对比→4.渲染"` | seg1<br>seg2<br>sample_ok<br>avg<br>delta_kg<br>rate_diff<br>speed_judge |
| 37 | `w_cmp_month` | 对比体重：本月 vs 上月 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a4 --chain "1.识别→2.读DB→3.对比→4.渲染"` | seg1<br>seg2<br>avg<br>delta_kg<br>rate_diff<br>speed_judge<br>volatility |
| 38 | `w_cmp_ndays` | 对比体重：近 N 天 vs 上一个 N 天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a5 --n <N> --chain "1.识别→2.读DB→3.对比→4.渲染"` | n_days<br>seg1<br>seg2<br>avg<br>delta_kg<br>rate_diff<br>speed_judge |
| 39 | `w_cmp_1y` | 对比体重：今天 vs 一年前今天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a6 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>year_ago<br>delta_kg<br>direction<br>tolerance_hit<br>period_avg |
| 40 | `w_cmp_6m` | 对比体重：今天 vs 半年前今天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a7 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>past<br>delta_kg<br>direction<br>tolerance_hit<br>period_avg |
| 41 | `w_cmp_3m` | 对比体重：今天 vs 三月前今天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario a8 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>past<br>delta_kg<br>direction<br>tolerance_hit<br>period_avg |
| 42 | `w_cmp_target` | 对比体重：当前 vs 目标体重 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario b1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>target<br>delta_kg<br>pct_done<br>eta<br>current_bmi<br>target_bmi<br>verdict |
| 43 | `w_cmp_plateau` | 对比体重：当前 vs 平台期首日 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario b8 --chain "1.识别→2.读DB→3.平台期识别→4.渲染"` | current<br>plateau_start<br>plateau_days<br>delta_after<br>plateau_count<br>avg_break_days |
| 44 | `w_cmp_min` | 对比体重：当前 vs 历史最低 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>min_kg<br>min_date<br>delta_kg<br>days_since<br>summary |
| 45 | `w_cmp_max` | 对比体重：当前 vs 历史最高 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e2 --chain "1.识别→2.读DB→3.对比→4.渲染"` | current<br>max_kg<br>max_date<br>delta_kg<br>rate<br>summary |
| 46 | `w_cmp_5kg` | 对比体重：减重 5kg 那天 vs 今天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e3 --delta 5 --chain "1.识别→2.读DB→3.反查里程碑→4.渲染"` | current<br>milestone_kg<br>milestone_date<br>elapsed_days<br>rate<br>trajectory |
| 47 | `w_cmp_10kg` | 对比体重：减重 10kg 那天 vs 今天 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e3 --delta 10 --chain "1.识别→2.读DB→3.反查里程碑→4.渲染"` | current<br>milestone_kg<br>milestone_date<br>elapsed_days<br>rate<br>trajectory |
| 48 | `w_cmp_summer` | 对比体重：当前 vs 入夏最低 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e5 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | current<br>season_min_kg<br>season_min_date<br>delta_kg<br>days_since |
| 49 | `w_cmp_winter` | 对比体重：当前 vs 入冬最低 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario e6 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | current<br>season_min_kg<br>season_min_date<br>delta_kg<br>days_since |
| 50 | `w_cmp_exercise` | 对比体重：运动多 vs 运动少的两个月 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario c5 --chain "1.识别→2.读DB→3.选极端月→4.渲染"` | high_month<br>low_month<br>avg<br>delta_kg<br>rate_diff<br>calories<br>sleep<br>exercise_total |
| 51 | `w_cmp_weekend` | 对比体重：工作日 vs 周末 | 对比体重 | result | `templates/weight_compare.html` | `python scripts/render_weight_compare.py --scenario d4 --chain "1.识别→2.读DB→3.周内聚合→4.渲染"` | weekday_avg<br>weekend_avg<br>delta_kg<br>weekday_vol<br>weekend_vol<br>agreement_rate |
| 52 | `w_overview` | 看体重总览 | 体重复盘 | result | `templates/weight_dashboard.html` | `python scripts/render_weight_dashboard.py --view overview --chain "1.识别→2.读DB→3.渲染"` | current<br>delta_7d<br>diff_min<br>diff_target<br>vol_level<br>trend_7d<br>summary |
| 53 | `w_review_week` | 体重复盘（本周） | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --type week --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg<br>avg<br>vs_last_period<br>trend<br>summary |
| 54 | `w_review_month` | 体重复盘（本月） | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --type month --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg<br>avg<br>vs_last_period<br>trend<br>summary |
| 55 | `w_review_90d` | 体重复盘（最近 90 天） | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --type 90d --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg<br>avg<br>vs_last_period<br>trend<br>summary |
| 56 | `w_review_year` | 体重复盘（今年） | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --type year --chain "1.识别→2.读DB→3.复盘→4.渲染"` | delta_kg<br>avg<br>monthly_trend<br>summary |
| 57 | `w_review_range` | 体重复盘（自定义时间） | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --start <S> --end <E> --chain "1.识别→2.读DB→3.复盘→4.渲染"` | start<br>end<br>delta_kg<br>avg<br>vs_last_period<br>trend<br>summary |
| 58 | `w_milestones` | 看里程碑回溯 | 体重复盘 | result | `templates/weight_review.html` | `python scripts/render_weight_review.py --type milestones --chain "1.识别→2.读DB→3.回溯→4.渲染"` | milestones<br>summary |

**表尾机械汇总**（第 1 列＝该模板被多少条唤醒词引用，脚本读出，非人工计数）：

| 模板名 | 引用条数 |
|---|---:|
| `weight_history.html` | 18 |
| `weight_compare.html` | 18 |
| `weight_review.html` | 6 |
| `crud_receipt.html` | 5 |
| `weight_volatility_v2.html` | 5 |
| `weight_log_receipt.html` | 3 |
| `weight_dashboard.html` | 2 |
| `weight_batch_receipt.html` | 1 |
| **合计** | **58** |

## §1.2 模板名 → 文件 → 字节／行数

行数与字节逐件当场实测。**行数口径＝本仓 `packages/skill-calorie/AGENTS.md` 定的 LF 计数**（`readFileSync(f, "utf8").split("\n").length - 1`，即只数 `\n`）。

| 老模板（相对 `templates/`） | 字节 | 行数（LF 口径） | 为什么列在这里 |
|---|---:|---:|---|
| `weight_history.html` | 18031 | 328 | 被 58 词引用 18 条 |
| `weight_compare.html` | 12672 | 229 | 被 58 词引用 18 条 |
| `weight_review.html` | 7324 | 149 | 被 58 词引用 6 条 |
| `crud_receipt.html` | 26279 | 465 | 被 58 词引用 5 条 |
| `weight_volatility_v2.html` | 19431 | 434 | 被 58 词引用 5 条 |
| `weight_log_receipt.html` | 11235 | 183 | 被 58 词引用 3 条 |
| `weight_dashboard.html` | 7696 | 148 | 被 58 词引用 2 条 |
| `weight_batch_receipt.html` | 5854 | 118 | 被 58 词引用 1 条 |
| `weight_batch_delete.html` | 8263 | 146 | 未被 58 词引用；运行时「批量删体重」真实分流目标 |
| `goal_weight.html` | 14249 | 234 | 体重目标族（跨场景 06） |
| `goal_weight_result.html` | 10904 | 165 | 体重目标族（跨场景 06） |
| `goal_progress.html` | 17521 | 249 | 通用目标进度含体重模式 |
| `home_dashboard.html` | 39121 | 1046 | 通用主页含体重部件 |
| `error_receipt.html` | 5462 | 132 | 通用失败回执（机制层） |

## §2 被 58 词直接引用的 8 张模板，逐张要点

每张给「结构／交互／值得继承／必须避免」，带老实物行号；已有盘点覆盖的条目引用来源，不重抄。

## 序 1 · `templates/weight_history.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_history.html`；字节 **18031**；行数 **328**（LF 口径；`old-ui-A.md` 与 `dump-structure.out.txt` 的表头都按 328／329 记，行号引用一致，不差行）
- 对应本图页面类：**① 曲线／明细／备注**；被 **18** 条唤醒词引用（`w_detail_*` 7 ＋ `w_curve_*` 10 ＋ `w_notes` 1，逐条见 `old-ui-A.md` §1 标题行，与 `t3-明细曲线.md` 第 6 行口径一致）

### 结构
- `134-137` 元信息条（`.meta-bar`）：`.left#metaLeft` 打 `start ~ end · 共 N 条`；右上 `#modeBadge.mode-badge` 蓝底模式徽章，JS 写 `m.toUpperCase()`（`185`）。
- `139-140` 标题区：`h1#h1Title`（默认 `⚖️ 体重历史`，`196` 被 `scene_name` 覆盖）＋ `p.sub#sub`。
- `142-147` KPI 四张（`.kpi-grid#kpis`）：每张 `label/value/extra` 三行，id 成对 `k1L/k1/k1E … k4L/k4/k4E`；**张数与顺序写死在 HTML**，JS 只做 textContent 覆盖（`200-214`）。四口径＝首末／均值／极值／条数（`t3-明细曲线.md` 第 13 行）。
- `149-153` 曲线段（`.section#chartSection`）：`h2#chartTitle` ＋ 空 `div#chart`（交给 `charts.line`）＋ `.legend#legend`。
- `155-163` 明细分段（`.section#tableSection`）：`h2 明细` ＋ `.table-wrap > table`，`thead#tableHead` 的表头由 `summary.table_header` 整体注入（`289-296`），`tbody#tableBody` 逐行填。
- 结论没有独立卡片：落在 legend 徽章与表格 `.delta-chip` 上（`244-279`）。备注形态（老脚本 `--mode notes`）由 CSS 特例 `103-105` ＋ JS 加 class `288-295` 切「备注 / vs 前后」双列。
- `165-171` `.footer`：`.src#srcLine`（`📊 数据来源:weight_log · start → end · N 条`）＋ `.btn-row` 空占位；`325-326` 尾挂 `#actionbar-zone` ＋ 内联 IIFE 调 `window.actionBar(window.__P__)`。

### 交互
- 页内没有折叠、下拉、筛选、模式切换：模式由老脚本 `--mode history|trend|volatility|notes` 定（`old-ui-A.md` §1③，映射在 `189-195`）。
- 页内唯一按钮来源是 `base.js:301-320` 的 `actionBar`：固定产出「复制数据 / 复制日志」两枚 ghost 按钮（`167-170` 只是空占位，`.btn:hover` 样式在 `80-81`）。
- 图表交互只有 `charts.line` 自带 `tooltip:true`（`241`）与末点强调 `highlightLast`；无自实现悬停、无加载态（`old-ui-A.md` §0 共性问题）。
- 复制两种口径：数据文本 与 排障日志（日志带 `render_cmd` 与数据来源，`render_weight_history.py:33` 引 `render_crud_view._quote_arg`，`411` 行注释）。
- 无折叠区、无切换开关。

### 值得继承
1. 目标超出 Y 量程时**不硬画到图外**，退化成图例徽章「距目标还差 X kg ↓」（`238-240` ＋ `275-278` ＋ CSS `45-47` 的 `.target-badge.good/.bad`）——新仓落点 `packages/skill-calorie/src/weight/history.ts`。
2. `extra` 用 `innerHTML`、`value` 用 `textContent`，徽章类富文本与纯数值分开，数值永不被当 HTML 插（`201-206`）——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（`assembleDocPage` 的槽位填充口径）。
3. 表格差值外面再包一层 `.delta-chip`，否则 `td` 塌成 chip 宽度、表头错列（CSS `114-117`，注释记了这次修复）——新仓落点 `packages/skill-calorie/src/weight/history.ts`。
4. 图内标不动时改用图例徽章承载：`charts.line` 没有极值接口，极值／里程碑就迁到 legend 徽章（`248-251` 注释、`253-258`）——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（图例槽位）＋ `history.ts`。
5. 移动端的稳妥做法：表头 `position:sticky`（CSS `110`）、`.table-wrap{overflow-x:auto}`（`125`）、按钮 44px 触控（`95-97`）——新仓落点 `packages/skill-calorie/src/weight/history.ts`。
6. 三种标注（目标线 / 里程碑点 / 异常点）的落点今天零件齐备：`weightCompare2.ts:132` 反查里程碑、`insightPlate.ts:86 buildAnomalyView` 出异常点（`t3-明细曲线.md` 第 16-17 行）——新仓落点 `packages/skill-calorie/src/weight/history.ts`。

### 必须避免
1. Y 轴没有数值：6 张体重模板都没传 `yTicks`（`charts.js:404,494-505` 默认关），380px 高的折线只能靠 tooltip 读数（`229-237`）。
2. 空数据时 `chartSection.style.display='none'`（`285`）静默消失，用户看到的是「没有图」而不是「为什么没有图」；同时 `300-304` 的表格却给了 `emptyState`，同一页两套口径。
3. 单点守卫缺失：`217` 只判 `items.length > 0`，1 个点也送进折线；同族 `weight_review` / `weight_dashboard` 用的是 `>=2`。
4. 备注形态靠 CSS 特例（`103-105`）＋ JS 加 class（`288-295`）双重控制，列宽还用 `nth-child(3)/(4)/(5)` 兜旧数据（`55-68`）——维护面大；`t3-明细曲线.md` 第 18 行已定按 `records.ts` 的 `noteTag` 走数据字段，不要再靠列序。
5. KPI 张数与顺序写死在 HTML（`142-147`），与新仓「4 个 KPI 数据驱动」的口径相抵，别把写死顺序一起搬过来。

## 序 2 · `templates/weight_compare.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_compare.html`；字节 **12672**；行数 **229**（LF 口径）
- 对应本图页面类：**② 两段对比**；被 **18** 条唤醒词引用（`w_cmp_30d` `w_cmp_custom` `w_cmp_week` `w_cmp_month` `w_cmp_ndays` `w_cmp_1y` `w_cmp_6m` `w_cmp_3m` `w_cmp_target` `w_cmp_plateau` `w_cmp_min` `w_cmp_max` `w_cmp_5kg` `w_cmp_10kg` `w_cmp_summer` `w_cmp_winter` `w_cmp_exercise` `w_cmp_weekend`，逐条见 `old-ui-A.md` §2 标题行）

### 结构
- `75-78` 页头：`.wrap`（920px 居中）→ `span.badge#scenarioBadge`（蓝底场景徽章，文案写死「对比体重」）→ `h1#title` → `p.sub#subtitle`。
- `79` `.warn-banner#warnBanner`：默认 `display:none`，只有 `d.sample_warning` 时显示 `⚠ …`（`132-136`），橙底（CSS `21`）。
- `80` `.kpi-grid#kpis`：**空容器**，KPI 由 JS 逐张拼（`138-143`），`value` 支持 `good/warn/bad` 三色类。
- `81-84` `.judge-line#judgeLine`（默认隐藏）：`lbl 速度判断` ＋ `#judgeText`，成品是「下降 1.20 kg · 速率差 -X g/天 · <c.speed>」（`172-179`）——一句判定行。
- `85-104` 「两段对比」段：`h2` 带 `.tag#segTag`；`.vs-grid` 是 `1fr auto 1fr` 三栏（CSS `31`）：`#segA`（`.seg` → `.seg-label`(label ＋ range) / `.big`(均值大字) / `.rows` 两列网格）↔ `#vs-mid`（`.arrow#vsArrow` 大箭头 ＋ `.dkg#vsDkg` 差值 ＋ `.speed#vsSpeed` 速率差）↔ `#segB`（`88-101`）。
- `105-108` `.extra-card#extraCard`（默认隐藏）：`h2 补充对照` ＋ `.extra-rows#extraRows`（网格 `minmax(200px)`）。
- `109-112` `.summary#summaryCard`（默认隐藏）：`lbl 总结` ＋ `#summaryText`。
- `113-119` `.footer`：`.src#srcLine` ＋ `.btn-row` 空占位。`121` 起 4 行数据注入，`226-227` 尾挂 `#actionbar-zone` ＋ IIFE 调 `window.actionBar(window.__P__)`。
- **本页无表格、无进度条、无里程碑区**；载荷面即 `seg_a／seg_b／compare／extra_rows／scenario_label／sample_warning／summary`（`t4-对比页.md` 第 13 行）。

### 交互
- 折叠、下拉、筛选、切换、自实现悬停：**全无**（`old-ui-A.md` §2③）。
- 按钮：只有 `.btn:hover` 样式（`57`）与 `.footer .btn-row` 空占位（`115-118`）；真实按钮仍是 `base.js:301-320` 的 `actionBar`「复制数据 / 复制日志」。
- 复制两种口径；老渲染器 `render_weight_compare.py --chain` 必传，日志里带 AI 思考链（`old-ui-A.md` §2③）。
- 图表交互只有 sparkline，**无轴、无 tooltip、无阈值线**：`extra_rows[].spark` 长度 `>= 2` 时插 `.spark-box`，调 `window.charts.sparkline(box, items, {width:280, height:36, showValue:false})`（`189-208`）。
- 无折叠区、无切换开关。

### 值得继承
1. 「样本量不足」做成**页顶软横幅**而不是拒绝渲染（`79` ＋ `132-136`）——对比类页面的正确姿势，新仓落点 `packages/skill-calorie/src/weight/compare.ts`（对应 `t4-对比页.md` 第 16 行的 `sample_warning` 口径）。
2. `.vs-mid` 三栏 ＋ 大箭头 ＋ 差值 ＋ 速率差，把「两段对比」压成一屏可读（`93-97`、`168-171`）——新仓落点 `packages/skill-calorie/src/weight/compare.ts`。
3. 方向判定同时吃英文枚举与中文词（`167`：`'下降' || '减重'` → 绿），容错老数据——新仓落点 `packages/skill-calorie/src/weight/compare.ts` 的判语映射。
4. 空值统一用 `'—'`（`149`、`156`、`162`、`211`），机器零值不会渲染成 `null`——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（槽位填充口径）。
5. sparkline 只在 `>= 2` 点时画，不足就退回纯文本行（`189` 对 `209-212`）——单点退化有据可依，新仓落点 `packages/skill-calorie/src/weight/compare.ts`。
6. 判语与差值分开成两行（`.dkg` 差值 / `.speed` 速率），互不覆盖——18 条词切窗口与分组时只换数不改版式，新仓落点 `packages/skill-calorie/src/shared/docPage.ts`。

### 必须避免
1. `#scenarioBadge` 文案写死「对比体重」（`76`），18 个场景在页面上看不出到底比的是哪两段——新仓必须把 `scenario_label` 真填进徽章（`t4-对比页.md` 第 13 行已点明）。
2. 缺字段不提示：`seg_a/seg_b/compare/extra_rows/summary` 任一缺失就整块隐去（`153-219`），用户分不清「没算出来」和「本来没有」。
3. `kpis` 为空数组时页面只剩骨架、连 `emptyState` 都不给（`old-ui-A.md` §2④）——空态只写在表格层的老毛病在这张页面上没表格可落，等于零提示。
4. sparkline 尺寸写死 280×36（`205-207`），小屏被拉伸。
5. 数值口径散落：`segAAvg`、`vsDkg` 各拼一次 `' kg'`，`vsSpeed` 拼 `' g/天'`，sparkline 内联样式里再拼两次（`156`、`170`、`171`、`199`、`201`）——单位拼接共 5 处，新仓要么集中在 `compare.ts` 一处格式化。

## 序 3 · `templates/weight_review.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_review.html`；字节 **7324**；行数 **149**（LF 口径）
- 对应本图页面类：**③ 体重复盘**；被 **6** 条唤醒词引用（`w_review_week` `w_review_month` `w_review_90d` `w_review_year` `w_review_range` `w_milestones`，逐条见 `old-ui-A.md` §3 标题行；老脚本按 `--type week|month|90d|year|milestones` 或 `--start/--end` 分叉）

### 结构
- `58-60` 页头：`.wrap` → `h1#title`（默认 `📋 体重复盘`）→ `p.sub#subtitle`。**全组最薄**，无徽章、无元信息条、无警告横幅。
- `61` `.kpi-grid#kpis`：空容器，KPI 由 JS 拼（`94-99`），期间变化／均值／与上期对比等口径落在这里（`t5-复盘页.md` 第 13 行）。
- `62-65` 趋势段 `.section#trendSection`：`h2#trendTitle`（默认「体重趋势」，**JS 从不改写**）＋ `div#trendSvg`；注意 id 叫 `trendSvg`，但 `charts.line` 是整体 `el.innerHTML=…` 写进去（`charts.js:661`）。
- `66-72` 表格段 `.section#tableSection`（默认 `display:none`）：`h2#tableTitle`（默认「里程碑」，JS 用 `d.table_title` 覆盖，`128`）＋ 真 `<table>`，表头在 JS 里硬拼「里程碑 / 日期 / 体重 / 用时」（`129-130`）。
- `73-76` `.summary#summaryCard`（默认隐藏）：`lbl 总结` ＋ `#summaryText`。
- `77-80` `.footer`：**只有** `.src#srcLine`，没有 `.btn-row`（`79` 是空行）→ 页内一个按钮都没有，按钮全靠 `actionBar`。`82` 起 4 行数据注入，`146-147` 尾挂 `#actionbar-zone` ＋ IIFE。
- 载荷面：`kpis／points／milestones／table_title／summary`（`t5-复盘页.md` 第 13 行）。**无进度条、无回执区、无基线**。

### 交互
- 折叠、下拉、筛选、切换、自实现悬停：**全无**；页内唯一按钮来源是 `base.js:301-320` 的 `actionBar`。
- 复制两种口径（数据 / 日志）；老渲染器 `render_weight_review.py --chain "1.识别→2.读DB→3.复盘→4.渲染"`，日志里是真思考链。
- 图表交互只有 `charts.line` 的 `tooltip:true`（`111-122`）。
- 无折叠区、无切换开关、无页内 `--type` 切换。

### 值得继承
1. **「方差过小防贴底」的 nice 量程算法**（`104-110`）：`span0 = max(rawMax-rawMin, 0.4)` 强制最小跨度、`step = max(0.1, ceil(span0/3*10)/10)`、`span = step*3`、对称展开成 3 格 0.1 整数倍刻度，再由 `yMin/yMax` 显式传进 `charts.line`（注释在 `103`）——全组最讲究的 Y 轴口径，直接可搬；新仓落点 `packages/skill-calorie/src/weight/review.ts`。
2. 面积 ＋ 平滑是本张独有（`111-122`：`smooth:true` ＋ `area:true`，全组仅此一处），复盘看趋势比折线更直观——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（图槽位的线型选项）。
3. 三块信息各自「有才显示」：趋势段与里程碑段都默认 `display:none`，只有数据到了才露出（`66`、`73`），页面不会出现写了却没内容的段落——新仓落点 `packages/skill-calorie/src/weight/review.ts`（对应 `t5-复盘页.md` 第 17 行的空窗阻断口径）。
4. 里程碑表是**真 `<table>` ＋ 独立表头**（`67-70`、`129-130`），「已达成 / 达成日期 / 当时数值」这类回溯行天生是表——新仓落点 `packages/skill-calorie/src/weight/review.ts`。
5. 老脚本把复盘窗口做成 `--type week|month|90d|year|range` 五个形态走同一张页面（`old-ui-A.md` §3 标题行）——与 `t5-复盘页.md` 第 13 行「加窗口形态」同一思路，新仓落点 `packages/skill-calorie/src/weight/review.ts`。

### 必须避免
1. **CSS bug**：`:root` 里没定义 `--soft`（`9-14`），`31` 却写 `th{background:var(--soft)}` → 表头背景失效（透明），新仓别照抄这套变量名。
2. 复盘「结论」只有一句 `d.summary`（`73-76`），没有分维度复盘结构——与仓内通用复盘页的 70 多个 `data-field` 差很远（`old-ui-A.md` §3⑤）。
3. `h2#trendTitle` 恒为「体重趋势」，JS 从不改写（`63`），用户看不出这一段是周／月／90 天／年哪一档。
4. 页脚没有 `.btn-row`、没有徽章、也**没有复盘覆盖区间的元信息**：`141` 只打 `generated_at`，`141` 之外不见 `start/end` → 复盘最重要的「盘的是哪一段」在页面上看不见。
5. 单点守卫虽然写了（`101`、`124`：`pts.length >= 2` 才画，否则整段 `display:none`），但**没有单点提示**——与 weight_history 的 `> 0` 相比是两种口径，新仓要择一，别两张页面各一套。
6. 里程碑语义别混：本张老页面是**已达成回溯**（`--type milestones`），仓内今天 `packages/skill-calorie/src/weight/review.ts` 的里程碑是**目标达成预测**（前向 `estDate／estDays`），`t5-复盘页.md` 第 14 行已明确两者不要混。

## 序 4 · `templates/weight_volatility_v2.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_volatility_v2.html`；字节 **19431**；行数 **435**（LF 口径；文件末无换行，故按末行计入）
- 对应本图页面类：**④ 体重波动**；被 **5** 条唤醒词引用（`w_vol` `w_vol_month` `w_vol_90d` `w_vol_180d` `w_vol_anomalies`，逐条见 `old-ui-A.md` §4 标题行；`w_vol_anomalies` 走老脚本 `--view anomalies-only`）

### 结构
- `78-83` 页头：`.wrap` → `header`：`h1`（`81` 写死 `📊 体重稳不稳（增强版）`，**JS 只在 anomalies-only 时改成 `⚠ 看波动异常点`**，`197-198`）＋ `p.sub#metaSub`（`82`，区间副标题）。
- `86-119` KPI **三张**（与其余 5 张的 4 张不同），且**不用 `.kpi .label/.value`，而用 `section.kpi` ＋ `.kpi-label/.kpi-value/.kpi-extra`**（CSS `29-32`）：
  - `89-97` `#kpi-diagnosis`：标准差 ＋ `.kpi-pill#kpiPill` ＋ extra「健康波动 < 0.3kg」；`96-97` 是**给测试契约留的隐藏锚点** `#kpiBaseline hidden`，注释说明「2026-08-02 ticket 10 重构：baseline 展示已并入 KPI#1 文本，保留 id 以兼容 ticket 02 契约」。
  - `101-107` `#kpi-trend`：日均波动 ＋ `#kpiSigmaTrend` pill ＋ extra「近 7 天 |当日−昨日| 均值」。
  - `111-116` `#kpi-early-warning`：异常次数 ＋ `#kpiEWTxt` ＋ `#kpiEWExtra`。
- `122-131` 图表段 `.chart-section`：`h2`「体重折线 + ±σ 带 + 目标线」（`123`）＋ `.chart-wrap`（`124`，`position:relative`）内 `<canvas id="chart" width="800" height="360">`（`125`）＋ **右上角悬浮开关组**（`126-129`，`position:absolute;top:8px;right:12px`）：`#toggleRolling`「vs 近期常态」（默认 active）＋ `#toggleGoal`「vs 目标」。
- `134-137` `.anomalies#anomalies`：`h2`「最近异常点」＋ `<span class="count" id="anomaliesCount">` ＋ `#anomaliesList`。
- `139-141` `.summary-line#summaryLine`（默认隐藏）：一句话判断（`274-278`）。
- `143-149` `.footer`：**只有 `.btn-row`，没有 `.src` 数据来源行**；`144` 注释「补复制数据/复制日志(全局双按钮规则)」＋两个空行占位。
- `153` 起 4 行数据注入（`SHARED-HELPERS` ＋ envelope 解包，**本张没有 `CHARTS-HELPERS`**）；`155` 起主脚本（`160` 起 toggle 状态段、`201` 起可被 toggle 复用的 `render()`）；`432-433` 尾挂 `#actionbar-zone` ＋ IIFE。
- 无表格、无进度条、无里程碑区、无回执区。

### 交互
- **开关组是唯一真交互**（`127-128`，样式 `55-58`：`.toggle-btn` / `:hover` / `.active`）：状态优先级 `URL ?baseline=` > `localStorage.weight_baseline_mode` > 默认 `rolling`（`161-173`）；`persistMode` 同时写 localStorage 与 `history.replaceState`（`175-186`），**两层 try/catch**——`186` 附近的注释点明「file:// 或受限 webview 下 replaceState 抛 SecurityError 会中断点击处理器」。
- 点击后重跑渲染并按模式重设 `.active`（`411-425`）。
- **视图裁剪**：`anomalies-only` 时隐藏 KPI 网格与图表段，并把 `h1` 换成 `⚠ 看波动异常点`（`193-199`）——与 `t6-波动页.md` 第 14 行「只看异常点、不出整图」同一形态。
- 折叠、下拉、筛选、自实现悬停：**全无**；`<canvas>` 上没有绑任何鼠标事件，**没有 tooltip**。
- 复制两种口径（数据 / 日志），`144` 注释把它叫「全局双按钮规则」，两枚按钮仍由 `base.js:301-320` 的 `actionBar` 注入。

### 值得继承
1. **双参照系开关 ＋ 状态持久化**：`URL > localStorage > 默认`，且 `replaceState` 失败会降级；配合「Y 轴量程固定、切开关时只动基线带、折线不跳动」的设计（`161-186`、`299-300` 注释）——新仓落点 `packages/skill-calorie/src/weight/volatility.ts`（`t6-波动页.md` 第 22 行已记 `rolling／goal` 双基线现成）。
2. **Canvas 高 DPI 适配**（`283-292`）：`dpr=window.devicePixelRatio||1` → `canvas.width=round(W_css*dpr)` ＋ `ctx.scale(dpr,dpr)`，注释写明「Retina 屏 canvas 缓冲须按 devicePixelRatio 放大，否则文字模糊」——新仓若在 DSH GUI 里重画图，这条照搬不亏；落点 `packages/skill-calorie/src/weight/volatility.ts`。
3. **三线共存且颜色语义统一**：±σ 黄带／红带（`335-342`，红带仅 `red > yellow` 时叠画）＋ 基线灰虚线 `setLineDash([4,3])`（`344-352`）＋ 目标绿虚线＋右端标注 `目标 Xkg`（`354-369`，仅目标在量程内才画），颜色与 KPI pill 的 `ok/warn/danger` 一致（`207-208`、`217-219`）——新仓落点 `packages/skill-calorie/src/weight/volatility.ts`。
4. **异常点双层编码**：`red` → `#ff3b30` 半径 5、`yellow` → `#ff9500` 半径 4、其余 → `#0071e3` 半径 3（`383-401`）——换色同时加半径，色觉不敏感也看得出；新仓落点 `packages/skill-calorie/src/weight/volatility.ts`。
5. **成功型空态**：异常列表为空时给 `emptyState({icon:'✓', text:'过去 7 天无异常', hint:'波动都在正常范围'})` 并把计数显成 `(0)`（`254-256`），而不是「暂无数据」——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（空态槽位口径）。
6. **样本不足说人话**：`daily_delta_prev == null` 时 extra 写「需 14+ 天数据对比」（`234-236`）；样本未达时 pill 初值写「测量中」（`93`）而非 `--`——新仓落点 `packages/skill-calorie/src/weight/volatility.ts`。
7. 阈值带／目标线／异常点列表三段都按「有没有数据」决定露不露（`193-199`、`254-256`、`274-278`），页面不出现无内容段落——新仓落点 `packages/skill-calorie/src/weight/volatility.ts`。

### 必须避免
1. **手写 `<canvas>` 与其余 5 张的 `charts.line`（SVG）不一致**：换不来 tooltip、导出、文本可选，也与「公共组件唯一真相源」相抵（`old-ui-A.md` §4⑤引 `_base_render.py:43` 明令禁止技能内 fork 图表）；新仓图谱走 SVG。
2. **没有数据来源行**：`.footer` 只有 `.btn-row`（`143-149`），排障时看不到区间口径——新仓按 `t6-波动页.md` 第 13 行的载荷把窗口写进页脚或元信息。
3. KPI 卡片 class 与同族其它 5 张**完全不同**（`.kpi-label/.kpi-value` vs `.kpi .label/.value`）→ 同族页面零复用；新仓三张 KPI 应与其余页面共用同一套槽位（落点 `packages/skill-calorie/src/shared/docPage.ts`）。
4. 单点没有守卫：`282` 只判 `d.points.length > 0`，单点会走 `xStep = …/max(1, n-1)` 贴在左边缘成孤点（`old-ui-A.md` §4②）——新仓按 `t6-波动页.md` 第 16 行的空窗阻断口径处理，别静默出图。
5. 页面 `h1` 写死「（增强版）」，只有 anomalies-only 才换标题（`81`、`197-198`）→ 场景名没进 UI，用户看不出这是 30／90／180 天中的哪一档。
6. KPI 网格是 `1fr 1fr 1fr`，小屏直接塌成 `1fr` 堆叠，没有 2 列过渡（CSS `70`）。

## 序 5 · `templates/weight_dashboard.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_dashboard.html`；字节 **7696**；行数 **148**（LF 口径）
- 对应本图页面类：**⑤ 今日体重盘**；被 **2** 条唤醒词引用（`w_today` → `--view today`；`w_overview` → `--view overview`，见 `old-ui-A.md` §5 标题行）

### 结构
- `55-58` 页头：`.wrap` → `h1#title`（默认 `⚖️ 体重总览`）→ `p.sub#subtitle` → `.kpi-grid#kpis`（**空容器**，最多 5 张卡由 JS 填，`88-93`；CSS 是 `repeat(5,1fr)`，小屏第 5 张落 `grid-column:span 2`，CSS `44-45`）。
- `59-62` 趋势段 `.section#trendSection`：`h2#trendTitle`（默认「最近 7 天趋势」，`131` 用 `d.trend_title` 覆盖）＋ `div#trendSvg`。
- `63-67` 今日卡 `.todayCard#todayCard`（默认隐藏）：`.today-big#todayKg`（`52px` 大字，CSS `29`）＋ `.today-meta#todayMeta` ＋ `.today-delta#todayDelta`（按方向加 `good/bad`，`107`）。
- `68-71` `.summary#summaryCard`（默认隐藏）。
- `72-74` `.footer`：**完全空**（`73` 是空白行），既无 `.src` 也无 `.btn-row`。`76` 起 4 行数据注入，`145-146` 尾挂 `#actionbar-zone` ＋ IIFE。
- 无徽章、无表格、无进度条、无里程碑、无回执区；**整张只有「KPI 网格 / 7 天趋势 / 今日卡 / 总结」四块可用**。

### 交互
- 折叠、下拉、页内按钮、筛选、切换、自实现悬停：**全无**；`.btn` 系列样式（CSS `37-41`）定义了但页内无人调用。
- 复制仅 `base.js:301-320` 的 `actionBar` 双按钮（数据 / 日志）。
- **真交互在 `view` 分支上**（`95-108`）：同一张模板两套布局——`view === 'today'` 时隐藏 KPI 网格与趋势区，只露 `.todayCard`（大字 ＋ 日期 ＋「较上次 ±X kg」），理由写在注释里（`96-97`：「KPI 行纯冗余且 3 卡撑不满 5 列网格 → 隐藏，2026-08-03 · ticket #43 场景 5 终审」）。
- **无页内切换开关**：`today` / `overview` 由老脚本 `--view` 定，用户不能在页面上切。

### 值得继承
1. `todayCard` 用 **52px 大字号单值**做主视觉（CSS `29-30` ＋ `101`）——「看今日体重」一眼到底，是 8 张里唯一为「单值场景」做的版式；新仓落点 `packages/skill-calorie/src/weight/log.ts`（`t5-复盘页.md` 第 15 行把「看今日体重」的 `today` 形态归 `log.ts`）。
2. 同一张模板按 `view` 分支隐藏冗余区块，**并把取舍理由留在注释里**（`96-97`）——可追溯的降级决策，值得照搬这套「分支 ＋ 写明为什么」；新仓落点 `packages/skill-calorie/src/weight/review.ts`（`overview` 形态对照本张，见 `t5-复盘页.md` 第 15 行）。
3. 「今日卡」的三段结构（数值 / 元信息 / 较上次差值）与 `weight_log_receipt` 的大数字回执同源（`63-67` 对 `weight_log_receipt.html:63-70`），两处共用一套视觉语言；新仓落点 `packages/skill-calorie/src/weight/log.ts`。
4. `d.trend_title` 让趋势段标题由数据自述（`131`），比 `weight_review` 写死「体重趋势」强；新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（段落标题槽位）。
5. 差值按方向加 `good/bad` 类（`107`），下降＝绿、上升＝红，与 `weight_history` 的变化率徽章同一约定；新仓落点 `packages/skill-calorie/src/weight/log.ts`。

### 必须避免
1. **无数据来源行**（`.footer` 空，`72-74`）——总览与今日两个场景都看不出数据口径，与 `t6-波动页.md` 对波动页的同款要求一致，新仓要把窗口写进页脚或元信息。
2. KPI 网格写死 5 列（CSS `20`），`view === 'today'` 时**必须靠 JS `display:none` 兜**（`98`）→ 布局与数据强耦合，加一个 KPI 就要改布局；新仓落点 `packages/skill-calorie/src/shared/docPage.ts`，按卡片数出版式。
3. **可疑死代码**：`139-141` 行 `const meta = d.meta || {};` 之后两行全空，什么都没做——`meta` 读出来就丢掉；`143-144` 还残留 `})();` 前的大片空行。模板缺收尾清理，别照抄。
4. 空数据**没有 `emptyState`**：`pts < 2` 直接隐藏趋势区（`133`），单点/空窗用户只看到少一块。
5. 无加载态：`#todayKg` 初值 `--`，且 JS 只在 `view==='today'` 时才填（`old-ui-A.md` §5④）。
6. `.footer` 无按钮，页内没有「改这条 / 补一条」之类的就近入口，行动口全靠 `actionBar` 双复制按钮。

## 序 6 · `templates/weight_log_receipt.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_log_receipt.html`；字节 **11235**；行数 **183**（LF 口径）
- 对应本图页面类：**⑥ 写后回执**；被 **3** 条唤醒词引用（`w_log` / `w_log_note` / `w_backfill`）。注：`old-ui-A.md` §6 标题行把 `w_backfill_batch` 也算在本张名下（写成 4 个），已核准事实是 3 个，那张走 `weight_batch_receipt.html`（各 3 ＋ 1 ＝ 4，与逐张计数不冲突）

### 结构
- `62-70` 回执卡 `.wrap` → `.receipt#receipt`（绿色渐变卡 `linear-gradient(135deg, card, green-soft)`，CSS `22`），卡内自上而下五段：
  - `64` `.check`：64px 绿圆 ＋ `::after{content:"✓"}`（CSS `24-25`）＋ `animation:pop .5s`（CSS `56-57`）。
  - `65` `.label#labelText`：默认「已记录体重」；补录场景 JS 改成「已补录体重」（`121-122`）。
  - `66` `.weight#weightBig`：64px 大字 ＋ `.unit` 24px 小字（CSS `27-28`），初值是 `?kg`。
  - `67` `.meta#meta`：**初值「加载中…」**；BMI 走内联 pill（CSS `30`、`103`）。
  - `68` `.tags#tagRow`（默认隐藏）：备注分类 tag ＋ `meta-tag`（补录记录 / 目标 Xkg）；`69` `.one-line#oneLine`（默认隐藏）：`💬 <一句话>`（`124-128`）。
- `71-86` 趋势段 `section.section`：`.section-title`（`h2 近 30 天趋势` ＋ `.hint`「橙色圆点 = 最新记录 · 共 N 条」，`74`，N 由 `#historyCount` 填）→ `.trend-svg#trendSvg`（`76`）→ `.trend-stats`（`77-82`，四张 `.trend-stat`：`#statDeltaLast` 当前距上次 / `#statDiff` 当前距目标 / `#statAvg` 平均 / `#statTrend` 趋势）→ `.note-row#noteRow`（`83-85`，默认隐藏，`备注: …`）。
- `87-89` `.footer`：**完全空**（`88` 是空白行），无 `.src` 无按钮。`91` 起 4 行数据注入，`180-181` 尾挂 `#actionbar-zone` ＋ IIFE。
- 无徽章、无表格、无进度条、无里程碑区（回执页不适用）。

### 交互
- 折叠、下拉、筛选、切换、悬停：**全无**；`.btn / .btn.primary / .btn.ghost` 在 CSS `42-47` 定义了，**页内没有按钮实例**。
- **唯一事件**：`window.addEventListener('resize', …)`，150ms 防抖后 `renderTrend()` 重画（`173-177`），只重画趋势，不重算其它内容。
- 复制仅 `base.js:301-320` 的 `actionBar` 双按钮（数据 / 日志）；`render_weight_receipt.py:223` 注释记了「注入 JSON 缺 `render_cmd/source` → 复制日志显示 (未知)」的修复。
- 备注与标签渲染：`r.note` → `#noteRow` 转 flex（`109-112`）；`r.tag` / 补录 / `weight_goal` 三个 tag 拼 `#tagRow`（`114-119`）。
- 无切换开关、无折叠区。

### 值得继承
1. **回执卡的信息层级**：64px 大数字 → 元信息（日期 / 时间 / BMI pill）→ 标签 → 一句话，全部压在 400px 内可读（CSS `22-30`、`63-70`）——`t7-写后回执.md` 第 15 行的「体重大字 ＋ 日期时间 ＋ 较上次差值 ＋ 距目标差 ＋ 均值／趋势 ＋ 近 30 天小图 ＋ 备注行」正对这张；新仓落点 `packages/skill-calorie/src/weight/log.ts` ＋ `packages/skill-calorie/src/shared/receiptParts.ts`。
2. **补录语义三处同现**：label 文案「已补录体重」/ meta 追加「补录 · 距今 N 天」/ tag「补录记录」（`105-107`、`117`、`121-122`）——用户不会把补录误当今日记录；新仓落点 `packages/skill-calorie/src/weight/log.ts`。
3. **全组唯一写了加载态**：`#meta` 初值「加载中…」（`67`）、`#weightBig` 初值 `?kg`（`66`）——写类回执天生是「先骨架后覆盖」，这两个初值让「还没数据」与「数据是空的」分得开；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`。
4. **统计卡走序列口径**：`renderTrend` 复用同一份 `HISTORY` 算出 4 张卡，并把「距上次」统一成序列级（注释 `159-160` 记了原先混用服务器记录级 delta、补录场景显示 `--` 与同排列卡不一致的旧账）——新仓落点 `packages/skill-calorie/src/weight/log.ts`。
5. 方向修正写在喂图处：`HISTORY` 是倒序，喂 `charts.line` 前 `asc = HISTORY.slice().reverse()`，注释「#317 迁 Base charts.line：HISTORY 倒序(最新在前) → 正序喂图表，`highlightLast` 高亮最新点」（`138-139`）——新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（图槽位口径）。
6. 缺目标时不编数：`weight_goal.target` 缺失则 `#statDiff` 保持 `--`（`151-156`）——新仓落点 `packages/skill-calorie/src/weight/log.ts`。

### 必须避免
1. **`.trend-stats` 是 3 列网格却塞了 4 张卡**（CSS `36` 对 `77-82`）→ 第 4 张「趋势」掉到第二行左侧、视觉错位；新仓别让列数与卡数脱钩。
2. **数据方向靠 `HISTORY` 隐式倒序**（`138-139`），模板自身不校验；渲染器一旦改成正序，`highlightLast` 会去高亮最旧点。
3. **`<2` 点时 `return` 得太早**：连 `#statAvg` / `#statTrend` 都不填，单点回执的统计卡全是 `--`（`133-136`）；正确做法是「图不画但卡照填」。
4. 空数据 `HISTORY.length === 0` 时 `renderTrend()` 直接 `return`，趋势区留一个没有任何文案的空段（`132`，无 `emptyState`）。
5. **页内零按钮**：`.btn` 系列 CSS 定义了没人用（`42-47`、`87-89`），回执页没有「改这条 / 删这条」的就近入口，用户只能回对话里说下一句。
6. `.footer` 完全空（`87-89`），连数据来源行都没有，而排障恰恰最需要知道「这条回执写的是哪一天」。
7. `errorReceipt` 之后 `throw new Error('payload-not-ok')`（`94`）——这张是全 6 张里唯一显式抛错的；新仓若照搬，注意别让抛错盖掉已挂上的错误回执页。

## 序 7 · `templates/weight_batch_receipt.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\weight_batch_receipt.html`；字节 **5854**；行数 **118**（LF 口径；文件末无换行，故按末行计入）
- 对应本图页面类：**⑥ 写后回执**；被 **1** 条唤醒词引用（「批量补录体重」这一条批量写入场景；`old-ui-B1.md` §1⑥ 记「未见 `w_*` 字面量」，说明这条引用走场景名而不是 `w_` 常量）

### 结构
- `59-61` 页头：`.wrap` → `h1`「📥 批量补录体重」→ `.sub#subtitle`。
- `62-66` KPI 三卡 `.kpi-grid`：`#kpiWrote`「写入」（`.value.good` 绿，`63`）/ `#kpiSkipped`「跳过」（`.value.warn` 橙，`64`）/ `#kpiFailed`「失败」（`.value.bad` 红，`65`）；每卡只有 `label ＋ value`，**没有 `extra` 行**。
- `67-73` 明细段 `.section`：`h2 明细` ＋ `<table>`（表头「日期 / 体重（`num` 右对齐）/ 结果 / 说明」）＋ `tbody#tableBody`（`71`）。
- `74-77` 总结卡 `.summary#summaryCard`（默认 `display:none`，有 `d.summary` 才转 `block`，`104-106`）：`.lbl`「总结」＋ `#summaryText`。
- `78-81` 页脚 `.footer`：`#srcLine`（`79`，默认文案 `📊 数据来源 --`）＋ **空格 `.btn-group`**（`80`）。
- `83` 一行数据注入（`SHARED-HELPERS`，**无 `CHARTS-HELPERS`**）＋ envelope 解包；`84-113` 主脚本；`115-116` 尾挂 `#actionbar-zone` ＋ IIFE。
- 无徽章、无折叠、无 SVG、无改前改后对照、无删除快照、无失败行专属块。

### 交互
- 折叠、下拉、切换、筛选、自实现悬停：**全无**。
- 空/坏数据**整页替换**：`if (!D || D.status !== 'ok') document.body.innerHTML = window.errorReceipt({message:'数据未注入或状态非 ok'})`（`87-90`）。
- 逐行 `insertAdjacentHTML` 拼明细（`99-102`）；结果列走公共组件 `window.statusBadge()`：**`写入→ok` / `跳过→warn` / 其余→`danger`**（`101`）——二值判断链，第三分支兜住全部异常态。
- 页脚数据来源行**硬编码**：`'📊 数据来源:weight_log · 批量补录 · ' + d.meta.generated_at`（`108`）。
- 复制：本模板自身 **0 个按钮**，只在页脚留 `.btn-group` 空容器，由共享 `actionBar`（`116`）注入；CSS 已备 `.btn/.btn.primary`（`40-43`）与移动端两列 `flex:1 1 45%`（`52`）。
- 无回读校验、无撤销入口。

### 值得继承
1. **三个 KPI 就是把批量的三种结局做成三色**（`63-65`：写入绿 / 跳过橙 / 失败红），且与行内 badge 的三色一一对齐（`101`）——批量回执的最省事读法；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`（`t7-写后回执.md` 第 16 行的「写入／跳过／失败三个 KPI ＋ 明细表（逐条状态与原因）」正对这张）。
2. **失败原因落在行内灰字** `.reason`（`34`、`102`）——「为什么这条没写进去」和这条记录同行，不用另开区；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`。
3. **总结卡默认隐藏、有才显示**（`74`、`104-106`），页面不会出现写了却没内容的段落；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`。
4. 明细是真 `<table>`（`68-71`），「日期 / 体重 / 结果 / 说明」四列——逐条状态天生是表，比行式列表更好扫；新仓落点 `packages/skill-calorie/src/weight/log.ts`（批量补录的产物归口）。
5. 数据来源行把**口径写死到页面**（`108`：`weight_log · 批量补录 · generated_at`）——批量场景最需要知道「这批补的是哪个库」；新仓落点 `packages/skill-calorie/src/shared/docPage.ts`（页脚槽位）。

### 必须避免
1. **空数据零分支**：KPI 全显 `0`、`tbody` 空表（`d.items || []`，`97`）、**没有一句空态文案**；同批的 `weight_batch_delete.html` 反而给了占位行（`113`）——同族两张两套口径，新仓要统一。
2. **`.footer .btn-group` 是个空容器**（`80`），按钮全靠外部注入；页内一个可点的东西都没有，没有「改这条 / 重试」的就近出口。
3. **死代码**：`109-111` 行 `const meta = d.meta || {}` 之后是空行，`actionBar` 的参数摆在那儿没被用——脚本缺收尾清理。
4. **结果判定靠中文枚举字面量相等**（`'写入'` / `'跳过'`，`101`），没有枚举收口；文案一改判定就静默落进 `danger` 分支。
5. 全部失败时**没有专门整页态**（`old-ui-B1.md` §1④）——批量全挂与批量全跳过在页面上长得差不多，只能靠 KPI 数字分辨。
6. 总结卡只吃 `d.summary` 一句话（`74-77`），没有「写入 N 条 / 跳过 M 条 / 失败原因归类」这类聚合，批次好坏要靠用户自己数 KPI。

## 序 8 · `templates/crud_receipt.html`

- 文件：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html`；字节 **26279**；行数 **465**（LF 口径；文件末无换行，故按末行计入）
- 对应本图页面类：**⑥ 写后回执**；被 **5** 条唤醒词引用（本张是**通用回执模板**，`COMMAND_CN = None`，场景名动态来自 `data.meta.wake_word`（`render_crud_receipt.py:36`）；`old-ui-B1.md` §3⑥ 记「未见 `w_*` 字面量」，卡路里体重侧落 5 条；`weight_batch_receipt` 之外的写类都走它）

### 结构
- `133` 一行数据注入（`SHARED-HELPERS`，**无 `CHARTS-HELPERS`**）＋ envelope 解包；`135-138` 页眉 `.meta-bar`：`#metaLeft`（`136`，＝ `meta.action_at`）＋ `.type-badge`（`137`，字面量「回执型 · 通用 CRUD」，绿底白字 CSS `21`）。
- `140-141` 标题区：`h1#h1Title`「✅ 操作回执」＋ `.sub#sub`（初值 `--`，JS 往里塞 `statusBadge` ＋ 成功语，`208-209`）。
- `143-151` ID 卡 `.id-card#idCard`：`.headline`（`#icon` `#opTitle` `#recordId`，`145-147`）＋ `.meta#recordMeta`（`149`，**先写 `--` 再强制 `display:none`**，见 `205`）＋ `.summary#summaryLine`（`150`，默认隐藏）。**三态配色 class**：`.id-card.delete`（CSS `28`，红）/ `.id-card.update`（CSS `29`，橙）/ 默认绿（CSS `26`），JS 按 `op` 换类（`201`）。
- `153` KPI `.kpi-grid#kpiGrid`：**CSS 默认 `display:none`**（`49`），只有 `context.kpis.length` 为真才 `display:grid`（`213-222`），最多 4 列。
- `155-158` 改前改后对照 `.diff-card#diffCard`（默认 `display:none`）：`h2 📋 字段变更` ＋ `#diffList`。
- `160-163` 上下文卡 `.ctx-card#ctxCard`：`h2 📊 今日累计` ＋ `#ctxList`。
- `165-168` 明细卡 `.items-card#itemsCard`（默认 `display:none`）：`#itemsTitle`（默认「📋 复制明细」）＋ `#itemList`。
- `170-174` 页脚 `.footer`：`.btn-group` 内**唯一按钮** `#undoBtn`「↩ 撤销」（`172`）。
- `462-463` 尾挂 `#actionbar-zone` ＋ IIFE。**全页无 `<table>`**（走 flex/grid 行式列表）、无折叠、无 SVG。

### 交互
- `escapeHTML` 本地实现（`185-189`），但**只有 3 处过它**：`note-text`（`228`）、`item-food`（`403`）、summary 头部（`251`）；KPI 值（`217-219`）、diff 值（`318/320/343/364`）、ctx 的 label/value（`380-382`）**都是直插 `innerHTML`**。
- **一个模板吃四种 op**（`192-195`）：`opLabels{add/create→新增, update→修改, delete→删除}` / `opColors{good/warn/bad}` / `opIcons{✓/✎/✕}`，三张映射表驱动，每张都带 `||` 兜底（`195-197`）。
- 副标题内联 badge（`208-209`）：`statusBadge(danger|warn|ok, opLabel)` ＋「{entity_type} {opLabel}成功」。
- **总结句解析（`234-274`）**：先正则匹配「(今日|当日)累计 X / Y (卡|ml) …（剩余|超标|超过）Z」（`238`）；命中就拆成 `.sum-line`（`251`）＋ `.sum-kpis`（`252-255`），剩余量按状态上色——超过/负数 → `bad`「已超」、`remain <= target*0.2` → `warn`（`249`）、否则 `good`。未命中走通用分支（`256-272`）：`update/delete` 时把「旧→新」对子替成 `.sum-old`（红删除线）/ `.sum-new`（绿）（`264-266`），其余关键数字（卡/分钟/克/步/km/ml/组/kg/次/条）套 `.sum-nums` 蓝（`269`）。
- 备注独立行 `.note-line`（`224-230`）：只在 `op === 'add'` 且有 `new_record.note` 时出。
- **diff 卡三种模式互斥（`302-372`）**：`update` 只渲染 `old ≠ new` 的键，跳过 `id/created_at/updated_at/__impact_*`（`308-312`），impact 提示放在 diff-row **之外**独立行（`315`、`322`），CSS 用 `:has(+ .diff-impact)` 去掉重复边框（`69`），`diffList.children.length === 0` 时整卡隐藏（`325-327`）；`delete` 出**删除前快照**（`328-350`），跳过 `0/null/''`（`337`），右列留空 `<div>` ＋ 箭头 `visibility:hidden` 占位对齐（`344-345`）；`create` 单列展示新增内容（`351-371`），`.diff-new` 内联改成普通黑字无删除线（`364`）。
- **撤销（`414-429`）**：`meta.undo_cli` 存在才 `display:inline-block`，否则 `none`（`427-429`）；点击先 `if (undoBtn.disabled) return`（`419`），生成「请撤销刚才的{opLabel}{entity_type}（操作时间 {action_at}），执行细节请按技能流程处理」（`420`），`window.copyText(undoCmd)`（`425`）；`done()`（`421-424`）**定义了但从未调用**。
- **复制只有 1 种格式**（撤销指令，不带格式选择）；CSS 保留了完整的 `.fmt-menu/.fmt-item` 菜单样式（`97-101`）＋ `@media(hover:none)` 去 hover 粘色（`104-108`），但 HTML 里**没有该菜单的 DOM，也无任何引用**。数据/日志两枚按钮不在本模板，由共享 `actionBar` 注入 `#actionbar-zone`（`462-463`）。
- 共享 `copyText(s, opts)` **自带 toast**：成功「已复制 / 粘贴给 AI」、失败「复制失败 / 长按选择文本手动复制」（`228-231`），失败给红「失败」badge（`243`）；`navigator.clipboard` 失败回退 `execCommand`（`248-254`）。本模板 `425` 不传 opts，撤销复制只有通用文案。
- 无折叠、无**回读校验**（写后不回读库比对）。

### 值得继承
1. **一模板吃四种 op**：`opLabels/opColors/opIcons` 三表驱动 ＋ ID 卡三态换类（`192-197`、`201`），新增/修改/删除共用一张页面——正是 `t7-写后回执.md` 第 17 行「改前 → 改后逐字段对照；删除带快照」要的形状；新仓落点 `packages/skill-calorie/src/render/receipt.ts`（`CrudReceipt` 形状）＋ `packages/skill-calorie/src/weight/edit.ts`。
2. **旧→新着色约定统一**：summary 里的「旧→新」对子（`264-266`）与 diff 卡（CSS `64-65`）用同一套红删除线／绿，注释明确写为约定（`38`）；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`。
3. **impact 独立成行 ＋ `:has()` 修边框**：影响提示挂在新值列会把绿框撑高、红绿不齐，于是独立成行并去掉上一行边框（`67-69`、`315`）——这类「排版踩过的坑」注释值得照抄；新仓落点 `packages/skill-calorie/src/render/receipt.ts`。
4. **空 diff 不显示空卡**（`324-327`，注释写明是「重复设置相同值时空卡」的用户反馈），`delete/create` 同一守卫各写一遍；新仓落点 `packages/skill-calorie/src/render/receipt.ts`。
5. **KPI 默认隐藏、有数据才铺网格**（CSS `49`、`213-214`）——避免出来一排空 KPI 骨架；新仓落点 `packages/skill-calorie/src/shared/receiptParts.ts`。
6. **撤销按 `undo_cli` 有无自动隐藏**（`414-429`），不给用户假按钮；新仓落点 `packages/skill-calorie/src/shared/copyArea.ts`（复制区 ＋ 撤销出口）。
7. 三条 diff 分支一律「跳过空值 ＋ 跳过 `id`/时间戳」（`308`、`334`、`357`），关注面干净；新仓落点 `packages/skill-calorie/src/weight/edit.ts`。
8. 移动端成套（`110-125`）：KPI 改 2 列、页脚按钮 `flex:1 1 45%` ＋ `min-height:44px`、diff 三列改单列并隐藏箭头、`.table-wrap` 横向滚动——新仓落点 `packages/skill-calorie/src/render/receipt.ts`。

### 必须避免
1. **死代码三处**：`payloadData()`（`436-457`）定义后从未被调用、`done()`（`421-424`）定义后从未被调用、`.fmt-menu/.fmt-item` 样式（`97-101`）没有对应 DOM —— 规范里承诺的「格式选择」在实际页面上不存在，别把这套半截菜单当既有能力照搬。
2. **转义口径不统一**：数据字段大面积直插 `innerHTML`（`217-219`、`318/320/343/364`、`380-382`、`404-405`、`208`），只有 3 处过 `escapeHTML`；新仓凡落 DOM 的值必须统一走一条转义出口。
3. **总结句靠正则链解析自然语言**（`238`）：用括号位置取 `m[3]/m[5]` 单位、用 `m[0].includes('当日')` 判标签（`252`），文案一改就静默退回通用分支——新仓要用结构化字段，不解析句子。
4. `FIELD_LABELS` 在模板里（`278-291`）和渲染脚本里（`render_crud_receipt.py:60+`）**各一份**，双源；新仓按 `t2-拆分.md` 的「每张页面只有一个主人」收成一处。
5. `#recordMeta` 先写 `--`、再 `display:none`、再赋值（`149`、`205-206`），纯冗余。
6. `425` 的 `copyText(undoCmd)` 缺第二个参数（按钮 id），撤销没有专属成功文案，只有通用 toast。
7. `delete` 快照的右列留空 `<div>` ＋ 隐藏箭头（`344-345`），对齐靠内联样式占位——结构占位不该写在 `style` 里。

## §3 被 58 词未直接引用、但仍与本图相关的模板

# 与本图相关、但 58 词未直接引用的老模板

本图 = Map #154 · 场景 03 体重 · 58 条唤醒词。
本图 58 词在 `map154.md:24` 已归类的 8 张模板：`weight_history.html`(18)、`weight_compare.html`(18)、`weight_review.html`(6)、`crud_receipt.html`(5)、`weight_volatility_v2.html`(5)、`weight_log_receipt.html`(3)、`weight_dashboard.html`(2)、`weight_batch_receipt.html`(1)。这 8 张不在本文内。

## 取证口径（先说明，后文所有数字都按此口径）

- 老技能根目录：`D:\2Study\StudyNotes\SKILLS\卡路里\`
- **场景数据的真实路径是 `D:\2Study\StudyNotes\SKILLS\卡路里\.scratch\scene_data\`**，不是仓内的 `D:\ilife\.scratch\scene_data\`（仓内没有这个目录）。下文简写成 `.scratch\scene_data\`。
- 「场景数据」= 11 份：`01-主页.json`…`11-技能协同.json`。同目录的 `schema.json`（3726 字符）**不计入 11 份**，但它在 4 张模板上各命中 1 次（`diet_overview`／`goal_progress`／`home_dashboard`／`today_diet`），所以单独提一下，不影响任何集合。
- 「引用」分两路，两路都查过：① 11 份场景数据里出现该模板名；② 老技能 `scripts\*.py` 里出现该模板名。
- **只认模板引用，不认同名字符串。** 有名字被数据字段撞名，必须剔除：
  - `render_weight_volatility_v2.py:144,145,151` 里的 `goal_weight` 是**数据字段名**（`data['goal_weight']`，给波动页「VS 目标」基线用），**不是**模板 `goal_weight.html` 的引用（该行注释原文：「模板 goal_weight 消费」＝该字段由页面消费）。
  - `review_engine.py` 里 13 处 `goal_weight`、`render_lint_health.py:116/179/191` 里的 `calorie_trend`、`render_weight_receipt.py:91` 里的 `calorie_trend` 同理，是字段名／同名函数名／脚本名，均已剔除。
- 行数按 LF 计（即数换行符）；`CRLF` 列给出该文件里 Windows 换行的出现次数，用来标出换行不统一的文件。

## A 组：直接相关（有绑定到本图 58 词或 03-体重 场景数据的机械证据）

### `templates\weight_batch_delete.html`
- 字节 **8263**；行数 **146**（LF；CRLF 146，纯 CRLF）
- 引用它的地方：`scripts\render_crud_receipt.py:51`（注释）、`scripts\render_crud_receipt.py:53`（`template = SKILL_DIR / 'templates' / 'weight_batch_delete.html'`）
- 与本图的关系：**它就是本图「批量删体重」这条唤醒词真正渲染的那张页面**，服务 58 词里的「批量删体重」1 条。

**这一条必须写清楚，因为它跟登记表写的不一致**：

- 登记表两处都写 `crud_receipt.html`：`scripts\_triggers.py:997`（`'key': 'w_delete_batch', 'name': '批量删体重', … 'html_template': 'templates/crud_receipt.html'`，第 991–999 行整条）、`.scratch\scene_data\03-体重.json:202`（同一字段，该条在 196–203 行）。
- 但运行时不是这条。`render_crud_receipt.py` 的 `render_html(data)` 在 50–55 行做了一次分流：`if data.get('data', {}).get('batch'): template = SKILL_DIR / 'templates' / 'weight_batch_delete.html'`。
- 而「批量删体重」的入口 `--live-weight-delete --start <S> --end <E>` 走的是 `render_crud_receipt.py:376-397`：376 行判 `if start and end:`，395–397 行调 `_weight_delete_receipt(..., batch=True, ...)`；`_weight_delete_receipt` 在 404–419 行把 `'batch': batch` 写进 `data['data']`（412 行）。
- 所以：**登记表说 `crud_receipt.html`，运行时实际落 `weight_batch_delete.html`。** 这条 2026-08-09 #43 的改动（脚本 51 行注释原文「批量删除用专门回执模板」）没同步回登记表，`_triggers.py` 与场景数据两边都还写着旧值。
- 附带：`weight_batch_delete.html` 既没进 `_triggers.py` 的 `html_template` 登记，也没进 `SKILL.md` 的模板表，是「有实物、有运行时分流、没登记」的孤例。

### `templates\home_dashboard.html`
- 字节 **39121**；行数 **1046**（LF；CRLF 1046，纯 CRLF）
- 引用它的地方：`scripts\render_home.py:35`（`TEMPLATE_PATH = SKILL_DIR / 'templates' / 'home_dashboard.html'`）／`scripts\_triggers.py:117, 127, 137, 147, 157, 167, 177, 187, 197`（9 条场景）／`.scratch\scene_data\01-主页.json:9, 29, 49, 69, 88, 108, 127, 146`（9 处）
- 与本图的关系：本图 58 词里有一条体重词落在这张页面上 —— `scripts\_triggers.py:141-147` 唤醒词「看今日体重概览」→ `'html_template': 'templates/home_dashboard.html'`、`'data_source': 'python scripts/render_home.py --section weight …'`；`_triggers.py:49` 和 `render_home.py:458-460` 都在做 `view == 'weight'` 的分支。
- 页面里确实有体重部件，不是挂名：`templates\home_dashboard.html:630-632` 是 `<section class="section" id="secWeight" …>` ＋ `<h2>⚖️ 今日体重</h2>` ＋ `<div id="weightView">`；`render_home.py:387, 413` 组装第 3 张 KPI 卡（`{'key': 'weight', 'label': '体重', 'icon': '⚖️', …}`），`:434` 出「近 7 天体重下降／上升／持平」那句话，`:164-174` 的趋势小图也带 `weight` 序列。
- 附注：`home_dashboard.html` 全文 58 处 `font-weight` 是 CSS 属性，与模板无关，未计入。

### `templates\goal_weight.html`
- 字节 **14249**；行数 **234**（LF；CRLF 234，纯 CRLF）
- 引用它的地方：`scripts\render_goal_weight.py:29`（`TEMPLATE_PATH`）／`scripts\_triggers.py:2267, 2277, 2287, 2437`（定体重目标、定体重目标(自动算截止)、定体重目标(含起始日)、改体重目标）／`SKILL.md:183`（模板表整行）／`.scratch\scene_data\06-目标管理.json:52, 53, 73, 74, 93, 94, 398, 399`（8 处）
- 与本图的关系：体重目标值的填写页。**它不是体重明细页，但本图三张页面读它写下的那一个值** —— `render_weight_volatility_v2.py:144-151` 从 `daily_goal.weight_goal` 取目标体重喂给波动页的「VS 目标」切换（缺了则两条基线相同、切换没反应，注释原话）；`render_home.py:263` 也从 `daily_goal.weight_goal` 取目标给主页体重部件算「距目标」。
- 归属提醒：这条命令的场景归属是「目标管理」(下一张图，#154 的兄弟图)，本图与之是**读同一份数据**的关系，不是本图自己的页面。

### `templates\goal_weight_result.html`
- 字节 **10904**；行数 **165**（LF；CRLF 165，纯 CRLF）
- 引用它的地方：`scripts\render_goal_weight.py:30`（`RESULT_TEMPLATE_PATH = SKILL_DIR / 'templates' / 'goal_weight_result.html'`）、`scripts\render_goal_weight.py:245`（`render_result_html`，注释「结果回执模板 · #79」）／`SKILL.md:184`（模板表整行）／11 份场景数据里 **0 处**
- 与本图的关系：上一条 `goal_weight.html` 那个命令的写库结果回执（`_triggers.py:2267` 的 `data_source` 原文里就写着「→ 写库后: python scripts/render_goal_weight.py --live …」）。它跟体重目标值是同一条流程的两半，要救就两张一起救。
- 与 `goal_weight.html` 的差别：`goal_weight.html` 有场景数据背书（8 处），这张**没有**，只有脚本和 `SKILL.md` 两处。

### `templates\goal_progress.html`
- 字节 **17521**；行数 **249**（LF；CRLF 247，**有 2 行是单独 LF**，换行不统一）
- 引用它的地方：`scripts\render_goal_progress.py:42`（`TEMPLATE_PATH`）／`scripts\_triggers.py:2327, 2337, 2347, 2357, 2367, 2377, 2387, 2397, 2407, 2417`（10 条场景）／`.scratch\scene_data\06-目标管理.json:171, 172, 194, 195, 214, 215, 235, 258`… (22 处)、`.scratch\scene_data\01-主页.json:15, 82`（2 处）
- 与本图的关系：其中有**两条明确是体重词** —— `scripts\_triggers.py:2351-2357` 唤醒词「看体重目标进度」→ `'html_template': 'templates/goal_progress.html'`、`'data_source': 'python scripts/calorie_tracker.py weight-goal-progress'`；`_triggers.py:2391-2397` 唤醒词「看即将到期的目标」→ `'data_source': 'python scripts/render_goal_progress.py --mode weight --expiring 14'`（描述原文「即将到期的体重目标」）。
- 反向也有一处：`_triggers.py:2321` 「看今日目标」的描述原文写着「体重为累计目标，引导到看体重目标进度」——这张页面自己就把体重目标分流出去。
- 归属提醒：同 `goal_weight.html`，主场景是「目标管理」，但有两条体重专属词落在它身上。

## B 组：间接相关（体重是它的一维输入；页面归属别的场景）

这 4 张都出自同一张分发表 `scripts\render_analysis.py:48-56`，服务「场景 10 分析」；它们各自的**体重专属模式**是相关性的机械证据。本图要不要救，取决于第 1 张票对场景边界的裁定。

### `templates\anomaly_report.html`
- 字节 **5972**；行数 **117**（LF；CRLF 112，5 行单独 LF）
- 引用它的地方：`scripts\render_analysis.py:53`（`'anomaly': 'templates/anomaly_report.html'`）、`scripts\render_analysis.py:12`（视图表整行）／11 份场景数据里 **0 处**
- 与本图的关系：**A4 自动分析，其中 A4.1 整组 6 条都是体重诊断** —— `scripts\analysis\anomaly.py:14-15` 原文：`A4.1 体重诊断 6  kind: weight_volatility / weight_plateau / weight_rebound / weight_loss_cause / weight_anomaly / weight_divergence`。调用示例也在脚本里：`render_analysis.py:20` `--view anomaly --diagnose weight_plateau`。

### `templates\long_trend.html`
- 字节 **8333**；行数 **171**（LF；CRLF 171，纯 CRLF）
- 引用它的地方：`scripts\render_analysis.py:52`（`'trend': 'templates/long_trend.html'`）、`scripts\render_analysis.py:11`（视图表整行）／11 份场景数据里 **0 处**
- 与本图的关系：**A3 整体趋势**，`render_analysis.py:60-68` 的 9 组指标里 g1／g2／g7／g8／g9 的首项都是 `('weight_kg', '体重')`，即多数趋势组都以体重打头。页面里「体重」出现 1 次、`weight` 5 次。

### `templates\health_report.html`
- 字节 **18023**；行数 **315**（LF；CRLF 315，纯 CRLF）
- 引用它的地方：`scripts\render_analysis.py:51`（`'report': 'templates/health_report.html'`）、`scripts\render_analysis.py:10`（视图表整行）／11 份场景数据里 **0 处**
- 与本图的关系：**A2 健康报告 19**，页面里「体重」出现 6 次、`weight` 7 次；`render_analysis.py:645-646` 的 KPI 行里有 `{'label': '体重', … 'delta': _vs_y('weight_kg')}`。

### `templates\predict_report.html`
- 字节 **9783**；行数 **174**（LF；CRLF 174，纯 CRLF）
- 引用它的地方：`scripts\render_analysis.py:54`（`'predict': 'templates/predict_report.html'`）、`scripts\render_analysis.py:13`（视图表整行）／11 份场景数据里 **0 处**
- 与本图的关系：**A6 预测模拟 20**，`render_analysis.py:576-588` 的 13 个条目里 11 个是体重 —— `weight_week`／`weight_month`／`weight_3m`／`weight_6m`／`weight_custom_t`／`weight_target`（标题「预测体重(…)」）＋ `sim_cut_300/500/700`／`sim_target_30/60/90/custom`（标题「模拟减重(…)」）。页面里「体重」3 次、`weight` 10 次。

### `templates\error_receipt.html`（失败回执族，单列）
- 字节 **5462**；行数 **132**（LF；CRLF 0，纯 LF）
- 引用它的地方：`scripts\render_error_receipt.py:26`（`TEMPLATE_PATH = SKILL_DIR / 'templates' / 'error_receipt.html'`）／`SKILL.md:1267`（非模板引用）／11 份场景数据里 **0 处**／`_triggers.py` 里 **没有** `html_template` 登记
- 与本图的关系：**通用失败回执，不属于哪一条唤醒词。** `render_error_receipt.py:3-13` 的文档串原文写着「AI 在写库失败/补记冲突/校验不过时调用」，调用方是 `tests\test_base_pipeline.py:235,237,242`、`tests\test_status_layer.py:9,119,127…`。本图 18 条写操作命令的失败路径都会落到它，但它身上**没有任何一处**跟体重绑定的机械证据（脚本里的示例反而是「补记体脂」，属场景 08）。
- 判定：**机制层相关，不是本图专属件。** 本图要不要在页面交付里给它留位置，等第 1 张票定边界；「救回来」这个动作对它不适用（它没丢、没被引用只是因为没进场景数据的登记）。

## C 组：逐一判「不是本图相关」

### `templates\review_template.html`
- 字节 **15639**；行数 **423**（LF；CRLF 423，纯 CRLF）
- 引用它的地方：`scripts\render_review.py:30`（`TEMPLATE_PATH`）／`scripts\review_prompts.py:18`（`Path(__file__).parent.parent / 'review_template.html'`）／`SKILL.md:121, 215, 762, 779`／`references\html_templates.md:10`／11 份场景数据里 **0 处**
- 与本图的关系：**不是本图相关。** `render_review.py:5` 文档串写明它对应的是「复盘 / 今日复盘 / 本周复盘 / 本月复盘 / 复盘日期范围」，属「复盘」类别；本图的体重复盘走的是另一张 —— `.scratch\scene_data\03-体重.json` 里 `weight_review` 命中 12 处，体重复盘归 `weight_review.html`。两者名字像，服务对象不同。

### `templates\calorie_trend.html`
- 字节 **10254**；行数 **211**（LF；CRLF 206，5 行单独 LF）
- 引用它的地方：`scripts\render_calorie_trend.py:21`（`TEMPLATE_PATH`）／`SKILL.md:156`（模板表整行）／`scripts\fix_html_responsive.py:14`（文档串示例）／`scripts\_triggers.py:4386-4390`（「查热量趋势」，`data_source` 是 `render_calorie_trend.py`，不是模板名）／11 份场景数据里 **0 处**
- 与本图的关系：**不是本图相关。** 它服务「查热量趋势」，属「分析」类（`_triggers.py:4386` `'category': "分析"`）。页面里「体重」出现 **0** 次。`render_lint_health.py:116/179/191` 和 `render_weight_receipt.py:91` 里的 `calorie_trend` 是同名函数名与脚本名，已剔除，不能拿来做相关性的依据。

### `templates/nutrition_analysis.html`
- 字节 **12467**；行数 **250**（LF；CRLF 250，纯 CRLF）
- 引用它的地方：`scripts\render_analysis.py:50`（`'nutrition': 'templates/nutrition_analysis.html'`）、`scripts\render_analysis.py:9`（视图表整行）／11 份场景数据里 **0 处**
- 与本图的关系：**不是本图相关。** A5 钠糖纤维趋势／营养建议，页面里「体重」出现 0 次；`render_analysis.py:185` 那处 `weight` 是用体重算蛋白目标的中间变量，不是页面内容。

### `templates\临时样例\统一主面板_视觉标杆.html`
- 字节 **23444**；行数 **858**（LF；CRLF 0，纯 LF）
- 引用它的地方：**没有**。11 份场景数据 0 处，`scripts\*.py` 0 处，`SKILL.md` 0 处，`_triggers.py` 0 处（全仓把 `临时样例` 和 `视觉标杆` 当字符串搜，命中数为 0）。
- 与本图的关系：**不是本图相关，是视觉参照件。** 文件名即写明用途：放在 `templates\临时样例\` 子目录里、名字带「视觉标杆」，不被任何东西引用，是给人看的样式样本，不参与本图任何一条唤醒词的产出。本图做页面交付时可以拿它当观感参照，但不需要「救回来」。

### `templates\临时样例\沉浸主面板_视觉标杆v2.html`
- 字节 **29644**；行数 **1058**（LF；CRLF 0，纯 LF）
- 引用它的地方：**没有**（同上，全仓 0 处）。
- 与本图的关系：同上，「统一主面板」的第二版样本，视觉参照件，非本图相关。

### `templates\设计审查报告.html`
- 字节 **40574**；行数 **713**（LF；CRLF 0，纯 LF）
- 引用它的地方：**没有**。11 份场景数据 0 处；把 `设计审查报告` 当字符串搜全仓 `.py`／`.md`／`.json`，命中数为 0。
- 与本图的关系：**不是模板，是一次性报告件。** 名字不像页面模板，没有任何引用，落在 `templates\` 下属于放错地方。不属本图相关，也不需要救。

## 汇总表

「出现在几份场景数据里」按 **11 份**计（不含 `schema.json`）。

| 老模板名 | 出现在几份场景数据里 | 总出现次数 | 引用脚本 | 是否本图相关 |
|---|---|---|---|---|
| `weight_batch_delete.html` | 0 | 0 | `render_crud_receipt.py:51,53` | **是（A 组，最强）** |
| `home_dashboard.html` | 1（01-主页） | 9 | `render_home.py:35`；`_triggers.py:117…197` | **是（A 组）** |
| `goal_weight.html` | 1（06-目标管理） | 8 | `render_goal_weight.py:29`；`_triggers.py:2267,2277,2287,2437` | **是（A 组，跨图）** |
| `goal_weight_result.html` | 0 | 0 | `render_goal_weight.py:30,245` | **是（A 组，跨图）** |
| `goal_progress.html` | 2（01-主页/06-目标管理） | 24（+`schema.json` 1） | `render_goal_progress.py:42`；`_triggers.py:2327…2417` | **是（A 组，跨图）** |
| `anomaly_report.html` | 0 | 0 | `render_analysis.py:12,53` | 间接（B 组，场景 10） |
| `long_trend.html` | 0 | 0 | `render_analysis.py:11,52` | 间接（B 组，场景 10） |
| `health_report.html` | 0 | 0 | `render_analysis.py:10,51` | 间接（B 组，场景 10） |
| `predict_report.html` | 0 | 0 | `render_analysis.py:13,54` | 间接（B 组，场景 10） |
| `error_receipt.html` | 0 | 0 | `render_error_receipt.py:26` | 机制层相关，非本图专属 |
| `review_template.html` | 0 | 0 | `render_review.py:30`；`review_prompts.py:18` | 否（复盘类；体重复盘走 `weight_review.html`） |
| `calorie_trend.html` | 0 | 0 | `render_calorie_trend.py:21` | 否（分析类；页面 0 处「体重」） |
| `nutrition_analysis.html` | 0 | 0 | `render_analysis.py:9,50` | 否（页面 0 处「体重」） |
| `临时样例\统一主面板_视觉标杆.html` | 0 | 0 | 无（全仓 0 处） | 否（视觉参照件） |
| `临时样例\沉浸主面板_视觉标杆v2.html` | 0 | 0 | 无（全仓 0 处） | 否（视觉参照件） |
| `设计审查报告.html` | 0 | 0 | 无（全仓 0 处） | 否（不是模板） |

**A 组 5 张**（直接相关）：`weight_batch_delete`、`home_dashboard`、`goal_weight`、`goal_weight_result`、`goal_progress`。
**B 组 4 张**（间接相关）：`anomaly_report`、`long_trend`、`health_report`、`predict_report`；另加机制层的 `error_receipt` 1 张。

## 附带查实的两条

1. **`weight_batch_delete.html` 与登记表不一致**（见上文 A 组第一条）：登记表 `_triggers.py:997` 与场景数据 `03-体重.json:202` 都写 `crud_receipt.html`，运行时分流实际落 `weight_batch_delete.html`。任务简报里「本图批量删体重实际走的是 `crud_receipt.html`」这句，**在登记表口径成立、在运行时口径不成立**，请按运行时口径用。
2. **`goal_config.html` 是一处悬空登记**：`_triggers.py:2247, 2297, 2427, 2447` 四处 `'html_template': 'templates/goal_config.html'`（定营养目标／定饮水目标／改营养目标／改饮水目标），但 `templates\` 下**没有** `goal_config.html` 这个文件；`render_goal_config.py:31,32` 实际用的是两个分身 `goal_config_nutrition.html`／`goal_config_water.html`。这条与 `sec4.md` 的第 1 项复算直接相关。

## §4 缺口与复算

# 缺口与复算（ticket 154 · 场景 03 体重）

## 1. 未被任何场景引用的模板：实测 **20 张**（顶层口径）／**22 张**（含子目录口径），不是 24

### 1.1 两个集合的大小与差集（机械复算）

先算出「所有 11 份场景数据里出现过的模板名全集」，再用「`templates\` 下实际存在的 .html 文件全集」去减。

- **场景数据引用全集 = 53 个名字**
  - 数据来源：`D:\2Study\StudyNotes\SKILLS\卡路里\.scratch\scene_data\` 下的 `01-主页.json`…`11-技能协同.json` 共 11 份（**不是**仓内的 `D:\ilife\.scratch\scene_data\`，仓内没有这个目录）。
  - 取法：把每个 .html 文件名的**文件名主体**（去掉 `.html`）当字符串在 11 份里逐份数，出现 ≥1 次即算「被引用」。
  - 附：同目录的 `schema.json` 不在 11 份之内，若把它并进来，全集**仍是 53**（它只在 `diet_overview`／`goal_progress`／`home_dashboard`／`today_diet` 上各命中 1 次，这四个名字本来就都被 11 份引用）。
- **`templates\` 下实际存在的 .html 全集 = 75 个**（顶层 73 ＋ `临时样例\` 子目录 2）
- **差集（未被任何场景引用）**

| 口径 | 分母（存在的 .html） | 减数（被引用） | 差集张数 |
|---|---|---|---|
| 顶层为准 | 73 | 53 | **20** |
| 含子目录为准 | 75 | 53 | **22** |

- **差集名单（20 张，顶层口径）**：
  `anomaly_report`、`body_photo_gif_planner`、`body_photo_log_wizard`、`body_photo_viewer`、`calorie_deficit`、`calorie_trend`、`cron_setup`、`cross_skill_sleep`、`error_receipt`、`food_library`、`goal_weight_result`、`health_dashboard`、`health_report`、`lint_health`、`long_trend`、`nutrition_analysis`、`predict_report`、`review_template`、`weight_batch_delete`、`设计审查报告`
- **差集名单（22 张，含子目录口径）**：上列 20 张 ＋ `临时样例\统一主面板_视觉标杆`、`临时样例\沉浸主面板_视觉标杆v2`

### 1.2 口径说明（哪些算、哪些不算）

| 项 | 算不算 | 依据 |
|---|---|---|
| `临时样例\` 子目录下 2 张 .html | **两种口径都给**（这就是 20 与 22 的差） | 它们确实是 `templates\` 下的 .html 实物，但不在顶层、不被任何东西引用 |
| `help_center_v2_4_12.html.bak` | **不算** | 扩展名是 `.bak` 不是 `.html`；它在 `templates\` 顶层，是 `.bak` 备份件 |
| `cropperjs\cropper.min.css`／`cropper.min.js` | **不算** | 第三方库文件，不是 .html |
| `设计审查报告.html` | **算** | 它在 `templates\` 顶层、扩展名就是 `.html`，虽然它不是页面模板（见 `sec3.md` C 组） |
| `.scratch\scene_data\schema.json` | **不计入 11 份**，但已单独验过不影响结果 | 见 1.1 附注 |
| 被引用但 `templates\` 下没有实物的名字 | **0 个** | 场景数据与脚本里出现的模板名，去重后全部能在 `templates\` 找到文件（除附录里那条悬空的 `goal_config.html`，它只在 `_triggers.py` 出现，不在场景数据里） |

### 1.3 与地图写的 24 对不上，差多少、差在哪

`map154.md:50` 写的是「旧技能 `templates\` 里有 **24 张模板没被任何场景引用**（本仓也丢了）」。实测不是 24。**24 这个数是怎么来的，能对上账**：

**24 = 75 − 51。** 75 是 `templates\` 下**全部 .html**（含 `临时样例\` 子目录 2 张），51 是 `scripts\_triggers.py` 里 `html_template` 字段**去重后的名字个数**。两个数都对，但**不是同一个集合的补**：分母按「文件」算，减数按「登记条目」算。

真实的场景数据引用是 **53**，登记表是 **51**，相差 2。这 2 的来路是两处方向相反的对不上，净差 4 − 2 = 2：

| 方向 | 名字 | 事实 |
|---|---|---|
| 场景数据有、登记表没有（4 个） | `goal_config_nutrition`、`goal_config_water` | `render_goal_config.py:31,32` 实际用这两张；`06-目标管理.json` 各命中 2 次。但登记表四处写的是 `goal_config.html` |
| 同上 | `profile_setup` | `render_profile_setup.py:21`；`07-基础信息.json:1` 处 |
| 同上 | `six_factors` | `render_analysis.py:55`；`10-分析.json:1` 处。它**没有** `html_template` 登记（只有 `_triggers.py:4299` 的调用点） |
| 登记表有、场景数据没有（2 个） | `goal_config` | **登记的是一张不存在的文件**：`_triggers.py:2247, 2297, 2427, 2447` 四处写 `templates/goal_config.html`，`templates\` 下没有这个文件 |
| 同上 | `calorie_deficit` | 文件在（`templates\calorie_deficit.html`），`_triggers.py:4382` 有登记，但 11 份场景数据里 0 处 |

**结论**：

- 按「模板名被 11 份场景数据引用」这个口径，未引用张数是 **20（顶层）／22（含子目录）**。
- 按「模板名既没被场景数据引用、也没进 `_triggers.py` 登记」这个更宽的口径，未引用张数是 **21**（22 减去 `calorie_deficit`，它虽没进场景数据但有登记）。
- **24 与实测的 22 之间的 2 张差额，全部来自 `_triggers.py` 登记表与场景数据的口径混用**：`goal_config.html` 占了一格登记却没有对应文件，`goal_config_nutrition`／`goal_config_water`／`profile_setup`／`six_factors` 四张有实物却没占登记格。
- 附带订正：`map154.md:24` 那句「`goal_config.html` 在旧目录里找不到（只有它**没被引用**的两个分身 `goal_config_nutrition`／`goal_config_water`）」——「找不到 `goal_config.html`」是对的，但两个分身**是被引用的**（`render_goal_config.py:31,32`；`06-目标管理.json` 各 2 次），「没被引用」这半句与实测不符。这也正是上表第一行那 4 个名字里的 2 个。

## 2. 三份盘点没覆盖到的模板

覆盖名单用 `Select-String -Path .scratch\t154\old-ui-*.md -Pattern '^#{1,3} '` 取目录得到（未整读三份文件）。

### 2.1 三份盘点覆盖的 13 张

| 盘点 | 覆盖的模板 |
|---|---|
| `old-ui-A.md` | `weight_history`、`weight_compare`、`weight_review`、`weight_volatility_v2`、`weight_dashboard`、`weight_log_receipt`（6 张） |
| `old-ui-B1.md` | `weight_batch_receipt`、`weight_batch_delete`、`crud_receipt`（3 张） |
| `old-ui-B2.md` | `goal_weight`、`goal_weight_result`、`goal_progress`、`home_dashboard`（4 张） |

合计 13 张，无重复。其中 8 张是 `map154.md:24` 已归类的本图模板（全覆盖，一个不漏），另 5 张是 `weight_batch_delete`、`goal_weight`、`goal_weight_result`、`goal_progress`、`home_dashboard`。

### 2.2 对差：`sec3.md` 认定的「相关模板」减去覆盖名单 = **缺口 5 张**

| `sec3.md` 认定 | 在盘点里覆盖了吗 | 缺口 |
|---|---|---|
| `weight_batch_delete.html` | 有（`old-ui-B1.md` §2） | |
| `home_dashboard.html` | 有（`old-ui-B2.md` §4） | |
| `goal_weight.html` | 有（`old-ui-B2.md` §1） | |
| `goal_weight_result.html` | 有（`old-ui-B2.md` §2） | |
| `goal_progress.html` | 有（`old-ui-B2.md` §3） | |
| `anomaly_report.html` | **没有** | ← 缺口 |
| `long_trend.html` | **没有** | ← 缺口 |
| `health_report.html` | **没有** | ← 缺口 |
| `predict_report.html` | **没有** | ← 缺口 |
| `error_receipt.html` | **没有** | ← 缺口 |

**没被三份盘点覆盖的模板名（5 张）**：

```
anomaly_report.html
long_trend.html
health_report.html
predict_report.html
error_receipt.html
```

这 5 张的共性：它们的相关性证据都在**脚本层**（`render_analysis.py` 的视图分发表、`render_error_receipt.py` 的失败路径），不落在 58 词本人身上，也不落在 03-体重 场景数据里，所以三份「按本图 8 张模板点名做的」盘点自然没点到它们。前 4 张同属「场景 10 分析」那张图；`error_receipt.html` 是通用失败回执，不属任何一条唤醒词。

## 3. 本文件与 `sec3.md` 的数字对照（便于核对）

| 项 | 数 |
|---|---|
| `templates\` 下文件条目总数 | 78（.html 75 ＋ `cropperjs` 2 ＋ `.bak` 1） |
| `templates\` 下 .html 总数 | 75（顶层 73 ＋ `临时样例\` 2） |
| 被 11 份场景数据引用的模板名 | 53 |
| 未被 11 份场景数据引用 | 20（顶层）／22（含子目录） |
| 未被引用且未被 `_triggers.py` 登记 | 21 |
| `_triggers.py` 登记 `html_template` 去重名数 | 51（其中 `goal_config` 无对应文件，实际有物的 50） |
| 地图写的数 | 24（＝75 − 51，口径混用，实测应为 22 或 20） |
| 三份盘点覆盖 | 13 |
| 三份盘点缺口（按 `sec3.md` 的相关名单） | 5 |
