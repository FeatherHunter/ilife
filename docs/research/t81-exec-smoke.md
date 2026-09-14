# #81 exec 桶实跑 smoke（可复跑证据快照）

> 本文件由 `docs/research/t81-exec-smoke.mjs` 生成（只读脚本：读路由层，spawn 真 CLI，只写系统 tmp）：
> `pnpm build && node docs/research/t81-exec-smoke.mjs --out docs/research/t81-exec-smoke.md`
> 复跑后 `git diff` 应为空（输出确定，无时间戳、无绝对路径）。

判据（FX-81-5 不变量，总架构师修订）：**exec ⟺ 在「标准种子库 ＋ 真实路径替换」下实跑 exit 0**。
`exit 0` 是数据相关判据，故：数据依赖失败（空库 exit 4）不算 cli 缺陷，但种子库必须覆盖被跑键所需数据区间；
占位符按 §2 替换为临时真实文件（冻结 SoT 亦用 `<图片>`／`<昨天>` 等占位符，风格一致）。

## 0. 汇总

| 指标 | 值 |
|---|---|
| exec 桶记录数 | 421 |
| 原样实跑 exit 0（envelope key 一致） | 364 |
| 占位符替换后 exit 0 | 57 |
| **非零（失败）** | 0 |
| 涉及键数 | 108 |
| 无参裸跑非零的键（＝需要参数） | 46 |
| └ 其中 exec 记录数（结构性断言覆盖面） | 115 |

## 1. 逐条实跑（每条一个全新种子库）

| # | 来源 | 场景 | 唤醒词 | key | 占位符 | exit | envelope key | cli |
|---|---|---|---|---|---|---|---|---|
| 1 | SoT | 01 | 看今日主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 2 | SoT | 01 | 看今日饮食概览 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'` |
| 3 | SoT | 01 | 看今日运动概览 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'` |
| 4 | SoT | 01 | 看今日体重概览 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight` |
| 5 | SoT | 01 | 看今日目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 6 | SoT | 01 | 看本周主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"windowDays":7,"date":"今日"}'` |
| 7 | SoT | 01 | 看本月主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"windowDays":30,"date":"今日"}'` |
| 8 | SoT | 01 | 看连续记录天数 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 9 | SoT | 01 | 看今日热量预算 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 10 | SoT | 02 | 记一餐 | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` |
| 11 | SoT | 02 | 记一餐（含备注） | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"加了辣酱"}'` |
| 12 | SoT | 02 | 补记饮食 | `calorie.diet.add` | <日期> | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"time":"12:30:00","date":"<日期>"}'` |
| 13 | SoT | 02 | 批量补记饮食 | `calorie.diet.batch` | <日期> | 0 | calorie.diet.batch | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` |
| 14 | SoT | 02 | 记喝水 | `calorie.water.log` | — | 0 | calorie.water.log | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 15 | SoT | 02 | 复制昨日饮食 | `calorie.diet.copy` | <日期> | 0 | calorie.diet.copy | `calorie-cmd-read calorie.diet.copy --params '{"from":"<日期>"}'` |
| 16 | SoT | 02 | 改饮食记录 | `calorie.diet.update` | — | 0 | calorie.diet.update | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 17 | SoT | 02 | 改某日饮食 | `calorie.diet.update-by-date` | <日期> | 0 | calorie.diet.update-by-date | `calorie-cmd-read calorie.diet.update-by-date --params '{"note":"食堂","date":"<日期>"}'` |
| 18 | SoT | 02 | 删饮食记录 | `calorie.diet.remove` | — | 0 | calorie.diet.remove | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 19 | SoT | 02 | 删一餐 | `calorie.diet.remove-by-type` | <日期> | 0 | calorie.diet.remove-by-type | `calorie-cmd-read calorie.diet.remove-by-type --params '{"mealType":"早餐","date":"<日期>"}'` |
| 20 | SoT | 02 | 删某日饮食 | `calorie.diet.remove-by-date` | <日期> | 0 | calorie.diet.remove-by-date | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"<日期>"}'` |
| 21 | SoT | 02 | 批量删饮食 | `calorie.diet.remove-by-range` | <日期> | 0 | calorie.diet.remove-by-range | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"<日期>","end":"<日期>"}'` |
| 22 | SoT | 02 | 看今日饮食 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| 23 | SoT | 02 | 看昨日饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"昨日"}'` |
| 24 | SoT | 02 | 看本周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"本周"}'` |
| 25 | SoT | 02 | 看上周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"上周"}'` |
| 26 | SoT | 02 | 看本月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"本月"}'` |
| 27 | SoT | 02 | 看上月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"上月"}'` |
| 28 | SoT | 02 | 看最近 7 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 29 | SoT | 02 | 看最近 30 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"30d"}'` |
| 30 | SoT | 02 | 看某段时间饮食 | `calorie.view.diet` | <开始日期>／<结束日期> | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 31 | SoT | 02 | 看今日喝水 | `calorie.view.today-water` | — | 0 | calorie.view.today-water | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 32 | SoT | 02 | 查食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 33 | SoT | 02 | 查食品（按分类） | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| 34 | SoT | 02 | 存食品 | `calorie.product.add` | — | 0 | calorie.product.add | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| 35 | SoT | 02 | 改食品 | `calorie.product.update` | — | 0 | calorie.product.update | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 36 | SoT | 02 | 下架食品 | `calorie.product.deprecate` | — | 0 | calorie.product.deprecate | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| 37 | SoT | 02 | 看食品库（去重） | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 38 | SoT | 02 | 看食品来源统计 | `calorie.view.source-stats` | — | 0 | calorie.view.source-stats | `calorie-cmd-read calorie.view.source-stats` |
| 39 | SoT | 02 | 看营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 40 | SoT | 02 | 看今日营养 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 41 | SoT | 02 | 看饮食总览 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 42 | SoT | 02 | 看营养素深度 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 43 | SoT | 02 | 看高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"7d"}'` |
| 44 | SoT | 02 | 看低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"7d"}'` |
| 45 | SoT | 02 | 看频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"7d"}'` |
| 46 | SoT | 02 | 看高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"7d"}'` |
| 47 | SoT | 02 | 看高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"7d"}'` |
| 48 | SoT | 02 | 看全部排行榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"topN":10,"window":"7d"}'` |
| 49 | SoT | 02 | 看高热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"30d"}'` |
| 50 | SoT | 02 | 看高热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"本月"}'` |
| 51 | SoT | 02 | 看高热量榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 52 | SoT | 02 | 看低热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"30d"}'` |
| 53 | SoT | 02 | 看低热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"本月"}'` |
| 54 | SoT | 02 | 看低热量榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 55 | SoT | 02 | 看频繁吃榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"30d"}'` |
| 56 | SoT | 02 | 看频繁吃榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"本月"}'` |
| 57 | SoT | 02 | 看频繁吃榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 58 | SoT | 02 | 看高碳水榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"30d"}'` |
| 59 | SoT | 02 | 看高碳水榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"本月"}'` |
| 60 | SoT | 02 | 看高碳水榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 61 | SoT | 02 | 看高蛋白榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"30d"}'` |
| 62 | SoT | 02 | 看高蛋白榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"本月"}'` |
| 63 | SoT | 02 | 看高蛋白榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 64 | SoT | 02 | 饮食复盘（本周） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本周"}'` |
| 65 | SoT | 02 | 饮食复盘（本月） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本月"}'` |
| 66 | SoT | 02 | 饮食复盘（最近 90 天） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"90d"}'` |
| 67 | SoT | 02 | 饮食复盘（今年） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今年"}'` |
| 68 | SoT | 02 | 饮食复盘（自定义时间） | `calorie.view.diet-review` | <开始日期>／<结束日期> | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 69 | SoT | 02 | 看早餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 70 | SoT | 02 | 看午餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 71 | SoT | 02 | 看晚餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 72 | SoT | 02 | 看加餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 73 | SoT | 02 | 看全部餐别分布（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 74 | SoT | 03 | 记体重 | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 75 | SoT | 03 | 记体重（含备注） | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"note":"晨起空腹"}'` |
| 76 | SoT | 03 | 补录体重 | `calorie.weight.log` | <日期> | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"date":"<日期>"}'` |
| 77 | SoT | 03 | 批量补录体重 | `calorie.weight.batch` | <日期> | 0 | calorie.weight.batch | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"<日期>","kg":70.5}]}'` |
| 78 | SoT | 03 | 看今日体重 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"window":"今日"}'` |
| 79 | SoT | 03 | 改体重记录 | `calorie.weight.update` | — | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| 80 | SoT | 03 | 改某日体重 | `calorie.weight.update` | <日期> | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"kg":70.2,"date":"<日期>"}'` |
| 81 | SoT | 03 | 删体重记录 | `calorie.weight.remove` | — | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 82 | SoT | 03 | 删某日体重 | `calorie.weight.remove` | <日期> | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"date":"<日期>"}'` |
| 83 | SoT | 03 | 批量删体重 | `calorie.weight.remove` | <日期> | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"start":"<日期>","end":"<日期>"}'` |
| 84 | SoT | 03 | 看本周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本周"}'` |
| 85 | SoT | 03 | 看上周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上周"}'` |
| 86 | SoT | 03 | 看本月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本月"}'` |
| 87 | SoT | 03 | 看上月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上月"}'` |
| 88 | SoT | 03 | 看最近 7 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"7d"}'` |
| 89 | SoT | 03 | 看最近 90 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"90d"}'` |
| 90 | SoT | 03 | 看某段时间体重 | `calorie.view.weight-history` | <开始日期>／<结束日期> | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 91 | SoT | 03 | 看体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d"}'` |
| 92 | SoT | 03 | 看本月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本月"}'` |
| 93 | SoT | 03 | 看上月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上月"}'` |
| 94 | SoT | 03 | 看最近 90 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"90d"}'` |
| 95 | SoT | 03 | 看最近 180 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"180d"}'` |
| 96 | SoT | 03 | 看最近 365 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"365d"}'` |
| 97 | SoT | 03 | 看某段时间体重曲线 | `calorie.view.weight-history` | <开始日期>／<结束日期> | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 98 | SoT | 03 | 看体重稳不稳（增强版） | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 99 | SoT | 03 | 看本月波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"本月"}'` |
| 100 | SoT | 03 | 看最近 90 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"90d"}'` |
| 101 | SoT | 03 | 看最近 180 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"180d"}'` |
| 102 | SoT | 03 | 看波动异常点 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 103 | SoT | 03 | 对比体重：最近 30 天 vs 之前 30 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"30d","compareWindow":"prev"}'` |
| 104 | SoT | 03 | 对比体重：自定义两段时间 | `calorie.view.weight-compare` | <开始日期>／<结束日期>／<对比开始日期>／<对比结束日期> | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>","compareWindow":"custom","compareStart":"<对比开始日期>","compareEnd":"<对比结束日期>"}'` |
| 105 | SoT | 03 | 对比体重：本周 vs 上周 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"本周","compareWindow":"上周"}'` |
| 106 | SoT | 03 | 对比体重：本月 vs 上月 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"本月","compareWindow":"上月"}'` |
| 107 | SoT | 03 | 对比体重：近 N 天 vs 上一个 N 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"7d","compareWindow":"prev"}'` |
| 108 | SoT | 03 | 对比体重：今天 vs 一年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-1y"}'` |
| 109 | SoT | 03 | 对比体重：今天 vs 半年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-6m"}'` |
| 110 | SoT | 03 | 对比体重：今天 vs 三月前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-3m"}'` |
| 111 | SoT | 03 | 对比体重：当前 vs 目标体重 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"30d"}'` |
| 112 | SoT | 03 | 对比体重：工作日 vs 周末 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"工作日","compareWindow":"周末"}'` |
| 113 | SoT | 03 | 看体重总览 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"window":"30d"}'` |
| 114 | SoT | 04 | 记运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| 115 | SoT | 04 | 记运动（含备注） | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}'` |
| 116 | SoT | 04 | 记力量训练 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}'` |
| 117 | SoT | 04 | 记有氧运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}'` |
| 118 | SoT | 04 | 记日常活动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}'` |
| 119 | SoT | 04 | 补记运动 | `calorie.exercise.add` | <日期> | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}'` |
| 120 | SoT | 04 | 批量补记运动 | `calorie.exercise.add` | <日期> | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}]}'` |
| 121 | SoT | 04 | 复制昨日运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'` |
| 122 | SoT | 04 | 改运动记录 | `calorie.exercise.update` | — | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| 123 | SoT | 04 | 改某日运动 | `calorie.exercise.update` | <日期> | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"note":"补记","date":"<日期>"}'` |
| 124 | SoT | 04 | 删运动记录 | `calorie.exercise.remove` | — | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| 125 | SoT | 04 | 删某日运动 | `calorie.exercise.remove` | <日期> | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"date":"<日期>"}'` |
| 126 | SoT | 04 | 批量删运动 | `calorie.exercise.remove` | <日期> | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"from":"<日期>","to":"<日期>"}'` |
| 127 | SoT | 04 | 看今日运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'` |
| 128 | SoT | 04 | 看昨日运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"昨日"}'` |
| 129 | SoT | 04 | 看本周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本周"}'` |
| 130 | SoT | 04 | 看上周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"上周"}'` |
| 131 | SoT | 04 | 看本月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本月"}'` |
| 132 | SoT | 04 | 看上月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"上月"}'` |
| 133 | SoT | 04 | 看最近 7 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 134 | SoT | 04 | 看最近 30 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"30d"}'` |
| 135 | SoT | 04 | 看某段时间运动 | `calorie.view.exercise` | <开始日期>／<结束日期> | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 136 | SoT | 04 | 看今日运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"今日"}'` |
| 137 | SoT | 04 | 看本周运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"本周"}'` |
| 138 | SoT | 04 | 看运动记录（按力量筛选） | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 139 | SoT | 04 | 看运动记录（按有氧筛选） | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 140 | SoT | 04 | 看最近 60 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"60d"}'` |
| 141 | SoT | 04 | 看最近 180 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"180d"}'` |
| 142 | SoT | 04 | 看最近 365 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"365d"}'` |
| 143 | SoT | 04 | 看运动类型分布 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 144 | SoT | 04 | 看力量训练总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 145 | SoT | 04 | 看有氧训练总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 146 | SoT | 04 | 看运动趋势 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"30d"}'` |
| 147 | SoT | 04 | 运动复盘（本周） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本周"}'` |
| 148 | SoT | 04 | 运动复盘（本月） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本月"}'` |
| 149 | SoT | 04 | 运动复盘（最近 90 天） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"90d"}'` |
| 150 | SoT | 04 | 运动复盘（今年） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"今年"}'` |
| 151 | SoT | 04 | 运动复盘（自定义时间） | `calorie.view.exercise` | <开始日期>／<结束日期> | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 152 | SoT | 05 | 看本周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":0}'` |
| 153 | SoT | 05 | 看下周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":1}'` |
| 154 | SoT | 05 | 看上周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":-1}'` |
| 155 | SoT | 05 | 看指定周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"week":1}'` |
| 156 | SoT | 05 | 看今天练什么 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 157 | SoT | 05 | 看某动作安排 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"movement":"硬拉"}'` |
| 158 | SoT | 05 | 看某天练什么 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 159 | SoT | 05 | 看计划概览 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 160 | SoT | 05 | 看完整计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 161 | SoT | 05 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` | — | 0 | calorie.view.plan-vs-actual | `calorie-cmd-read calorie.view.plan-vs-actual --params '{"window":"本周"}'` |
| 162 | SoT | 05 | 定训练计划 | `calorie.view.plan-wizard` | <开始日期> | 0 | calorie.view.plan-wizard | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 163 | SoT | 05 | 复制训练计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"copy"}'` |
| 164 | SoT | 05 | 定休息日 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"set-rest","week":1,"dayOfWeek":3}'` |
| 165 | SoT | 05 | 加训练动作 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}'` |
| 166 | SoT | 05 | 定一周计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"set-week","week":1}'` |
| 167 | SoT | 05 | 计划复盘（本周） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本周"}'` |
| 168 | SoT | 05 | 计划复盘（本月） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本月"}'` |
| 169 | SoT | 05 | 计划复盘（全部） | `calorie.view.exercise-review` | <开始日期>／<结束日期> | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 170 | SoT | 05 | 看计划完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 171 | SoT | 05 | 看未完成训练 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 172 | SoT | 05 | 看动作完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 173 | SoT | 05 | 扫禁忌 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 174 | SoT | 06 | 定营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}'` |
| 175 | SoT | 06 | 定营养目标(自动算) | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"定营养目标(自动算)"}'` |
| 176 | SoT | 06 | 定体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| 177 | SoT | 06 | 定体重目标(自动算截止) | `calorie.goal.weight` | <日期> | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"<日期>"}'` |
| 178 | SoT | 06 | 定体重目标(含起始日) | `calorie.goal.weight` | <日期> | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"startKg":72,"deadline":"<日期>","startDate":"<日期>"}'` |
| 179 | SoT | 06 | 定饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| 180 | SoT | 06 | 定饮水目标(自动算) | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"定饮水目标(自动算)"}'` |
| 181 | SoT | 06 | 一键定全套目标 | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"一键定全套目标"}'` |
| 182 | SoT | 06 | 看今日目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 183 | SoT | 06 | 看本周目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"本周"}'` |
| 184 | SoT | 06 | 看营养目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 185 | SoT | 06 | 看体重目标进度 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"7d"}'` |
| 186 | SoT | 06 | 看饮水目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 187 | SoT | 06 | 看目标对比实际 | `calorie.view.goal-vs-actual` | — | 0 | calorie.view.goal-vs-actual | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"window":"30d"}'` |
| 188 | SoT | 06 | 看目标完成度 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"window":"7d"}'` |
| 189 | SoT | 06 | 看即将到期的目标 | `calorie.view.goal-expiring` | — | 0 | calorie.view.goal-expiring | `calorie-cmd-read calorie.view.goal-expiring` |
| 190 | SoT | 06 | 看目标完成率(按周) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 191 | SoT | 06 | 看目标完成率(按月) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 192 | SoT | 06 | 改营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| 193 | SoT | 06 | 改体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":67.5}'` |
| 194 | SoT | 06 | 改饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2200}'` |
| 195 | SoT | 06 | 暂停所有目标 | `calorie.goal.pause` | — | 0 | calorie.goal.pause | `calorie-cmd-read calorie.goal.pause` |
| 196 | SoT | 06 | 重启所有目标 | `calorie.goal.resume` | — | 0 | calorie.goal.resume | `calorie-cmd-read calorie.goal.resume` |
| 197 | SoT | 06 | 看目标历史完成 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"window":"30d"}'` |
| 198 | SoT | 06 | 看目标预测达成 | `calorie.view.goal-predict` | — | 0 | calorie.view.goal-predict | `calorie-cmd-read calorie.view.goal-predict --params '{"window":"14d"}'` |
| 199 | SoT | 07 | 设置档案 | `calorie.profile.set` | — | 0 | calorie.profile.set | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}'` |
| 200 | SoT | 07 | 设活动量 | `calorie.profile.activity` | — | 0 | calorie.profile.activity | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 201 | SoT | 07 | 改档案 | `calorie.profile.update` | — | 0 | calorie.profile.update | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 202 | SoT | 07 | 查档案 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 203 | SoT | 08 | 记体脂（皮褶钳） | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","bodyFatPct":18.5,"caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10,"date":"<日期>"}'` |
| 204 | SoT | 08 | 记体脂（外部测量） | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5,"date":"<日期>"}'` |
| 205 | SoT | 08 | 记围度 | `calorie.body.measure-add` | — | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85,"hipCm":95}'` |
| 206 | SoT | 08 | 补记体脂 | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":19,"date":"<日期>"}'` |
| 207 | SoT | 08 | 补记围度 | `calorie.body.measure-add` | <日期> | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":86,"date":"<日期>"}'` |
| 208 | SoT | 08 | 看体脂 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 209 | SoT | 08 | 看体脂趋势 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition --params '{"days":90}'` |
| 210 | SoT | 08 | 看围度 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 211 | SoT | 08 | 看围度趋势 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure --params '{"days":90}'` |
| 212 | SoT | 08 | 删体脂 | `calorie.body.composition-remove` | — | 0 | calorie.body.composition-remove | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| 213 | SoT | 08 | 删围度 | `calorie.body.measure-remove` | — | 0 | calorie.body.measure-remove | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| 214 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 215 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 216 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 217 | SoT | 09 | 查身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 218 | SoT | 09 | 对比两张照片 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 219 | SoT | 09 | 生成身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 220 | SoT | 09 | 删身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 221 | SoT | 09 | 改照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"set","tag":"晨起"}'` |
| 222 | SoT | 09 | 加照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 223 | SoT | 09 | 删照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"remove","tag":"晨起"}'` |
| 224 | SoT | 10 | 看体重 vs 摄入(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 225 | SoT | 10 | 看体重 vs 摄入(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"15d"}'` |
| 226 | SoT | 10 | 看体重 vs 摄入(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"30d"}'` |
| 227 | SoT | 10 | 看体重 vs 摄入(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"60d"}'` |
| 228 | SoT | 10 | 看体重 vs 摄入(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"90d"}'` |
| 229 | SoT | 10 | 看体重 vs 摄入(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"180d"}'` |
| 230 | SoT | 10 | 看体重 vs 摄入(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"365d"}'` |
| 231 | SoT | 10 | 看体重 vs 摄入(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"week_cur"}'` |
| 232 | SoT | 10 | 看体重 vs 摄入(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"month_cur"}'` |
| 233 | SoT | 10 | 看体重 vs 摄入(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 234 | SoT | 10 | 看体重 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"7d"}'` |
| 235 | SoT | 10 | 看体重 vs 运动(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"15d"}'` |
| 236 | SoT | 10 | 看体重 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"30d"}'` |
| 237 | SoT | 10 | 看体重 vs 运动(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"60d"}'` |
| 238 | SoT | 10 | 看体重 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"90d"}'` |
| 239 | SoT | 10 | 看体重 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"180d"}'` |
| 240 | SoT | 10 | 看体重 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"365d"}'` |
| 241 | SoT | 10 | 看体重 vs 运动(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"week_cur"}'` |
| 242 | SoT | 10 | 看体重 vs 运动(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"month_cur"}'` |
| 243 | SoT | 10 | 看体重 vs 运动(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 244 | SoT | 10 | 看体重 vs 蛋白(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"7d"}'` |
| 245 | SoT | 10 | 看体重 vs 蛋白(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"15d"}'` |
| 246 | SoT | 10 | 看体重 vs 蛋白(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"30d"}'` |
| 247 | SoT | 10 | 看体重 vs 蛋白(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"60d"}'` |
| 248 | SoT | 10 | 看体重 vs 蛋白(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"90d"}'` |
| 249 | SoT | 10 | 看体重 vs 蛋白(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"180d"}'` |
| 250 | SoT | 10 | 看体重 vs 蛋白(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"365d"}'` |
| 251 | SoT | 10 | 看体重 vs 蛋白(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"week_cur"}'` |
| 252 | SoT | 10 | 看体重 vs 蛋白(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"month_cur"}'` |
| 253 | SoT | 10 | 看体重 vs 蛋白(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 254 | SoT | 10 | 看体重 vs 缺口(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` |
| 255 | SoT | 10 | 看体重 vs 缺口(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"15d"}'` |
| 256 | SoT | 10 | 看体重 vs 缺口(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"30d"}'` |
| 257 | SoT | 10 | 看体重 vs 缺口(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"60d"}'` |
| 258 | SoT | 10 | 看体重 vs 缺口(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"90d"}'` |
| 259 | SoT | 10 | 看体重 vs 缺口(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"180d"}'` |
| 260 | SoT | 10 | 看体重 vs 缺口(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"365d"}'` |
| 261 | SoT | 10 | 看体重 vs 缺口(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"week_cur"}'` |
| 262 | SoT | 10 | 看体重 vs 缺口(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"month_cur"}'` |
| 263 | SoT | 10 | 看体重 vs 缺口(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 264 | SoT | 10 | 看摄入 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"7d"}'` |
| 265 | SoT | 10 | 看摄入 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"30d"}'` |
| 266 | SoT | 10 | 看摄入 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"90d"}'` |
| 267 | SoT | 10 | 看摄入 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"180d"}'` |
| 268 | SoT | 10 | 看摄入 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"365d"}'` |
| 269 | SoT | 10 | 看摄入 vs 运动(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 270 | SoT | 10 | 看体重 vs 体脂(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"7d"}'` |
| 271 | SoT | 10 | 看体重 vs 体脂(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"30d"}'` |
| 272 | SoT | 10 | 看体重 vs 体脂(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"90d"}'` |
| 273 | SoT | 10 | 看体重 vs 体脂(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"180d"}'` |
| 274 | SoT | 10 | 看体重 vs 体脂(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"365d"}'` |
| 275 | SoT | 10 | 看体重 vs 体脂(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 276 | SoT | 10 | 看体重 vs 围度(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"7d"}'` |
| 277 | SoT | 10 | 看体重 vs 围度(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"30d"}'` |
| 278 | SoT | 10 | 看体重 vs 围度(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"90d"}'` |
| 279 | SoT | 10 | 看体重 vs 围度(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"180d"}'` |
| 280 | SoT | 10 | 看体重 vs 围度(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"365d"}'` |
| 281 | SoT | 10 | 看体重 vs 围度(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 282 | SoT | 10 | 看饮水 vs 体重(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"30d"}'` |
| 283 | SoT | 10 | 看饮水 vs 体重(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 284 | SoT | 10 | 看健康报告(本周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"本周"}'` |
| 285 | SoT | 10 | 看健康报告(上周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"上周"}'` |
| 286 | SoT | 10 | 看健康报告(最近 7 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"7d"}'` |
| 287 | SoT | 10 | 看健康报告(最近 30 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"30d"}'` |
| 288 | SoT | 10 | 看健康报告(最近 90 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"90d"}'` |
| 289 | SoT | 10 | 看健康报告(最近 180 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"180d"}'` |
| 290 | SoT | 10 | 看健康报告(最近 365 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"365d"}'` |
| 291 | SoT | 10 | 看健康报告(本月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"本月"}'` |
| 292 | SoT | 10 | 看健康报告(上月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"上月"}'` |
| 293 | SoT | 10 | 看健康报告(今年) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"今年"}'` |
| 294 | SoT | 10 | 看健康报告(自定义) | `calorie.view.health` | <开始日期>／<结束日期> | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 295 | SoT | 10 | 诊断体重波动原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","window":"90d"}'` |
| 296 | SoT | 10 | 诊断体重停滞(含平台期判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_plateau","window":"90d"}'` |
| 297 | SoT | 10 | 诊断体重反弹 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_rebound","window":"90d"}'` |
| 298 | SoT | 10 | 诊断体重下降原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_loss_cause","window":"90d"}'` |
| 299 | SoT | 10 | 诊断体重异常点 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_anomaly","window":"7d"}'` |
| 300 | SoT | 10 | 诊断体重vs体脂围度背离 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_divergence","window":"180d"}'` |
| 301 | SoT | 10 | 诊断饮食超标 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","window":"30d"}'` |
| 302 | SoT | 10 | 诊断饮食不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_under","window":"30d"}'` |
| 303 | SoT | 10 | 诊断营养不均衡(含均衡判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_unbalanced","window":"30d"}'` |
| 304 | SoT | 10 | 诊断饮食结构问题 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_structure","window":"30d"}'` |
| 305 | SoT | 10 | 诊断运动不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_insufficient","window":"30d"}'` |
| 306 | SoT | 10 | 诊断运动过量 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_overload","window":"30d"}'` |
| 307 | SoT | 10 | 诊断运动类型失衡 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_type_imbalance","window":"30d"}'` |
| 308 | SoT | 10 | 诊断运动效率(含有效判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_efficiency","window":"30d"}'` |
| 309 | SoT | 10 | 诊断运动建议(含类型推荐) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_advice","window":"30d"}'` |
| 310 | SoT | 10 | 为什么我没瘦 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_not_losing","window":"30d"}'` |
| 311 | SoT | 10 | 为什么我瘦太快 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_losing_fast","window":"30d"}'` |
| 312 | SoT | 10 | 我的减重速度合理吗 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"rate_reasonable","window":"30d"}'` |
| 313 | SoT | 10 | 我的减肥策略对吗 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"30d"}'` |
| 314 | SoT | 10 | 我距离目标还差什么 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"7d"}'` |
| 315 | SoT | 10 | 我这个月做得好的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_highlights","window":"30d"}'` |
| 316 | SoT | 10 | 我这个月需要改的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_improve","window":"30d"}'` |
| 317 | SoT | 10 | 综合健康评估 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"overall","window":"30d"}'` |
| 318 | SoT | 10 | 看蛋白 vs 碳水(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"7d"}'` |
| 319 | SoT | 10 | 看蛋白 vs 碳水(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"30d"}'` |
| 320 | SoT | 10 | 看蛋白 vs 碳水(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"90d"}'` |
| 321 | SoT | 10 | 看蛋白 vs 碳水(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 322 | SoT | 10 | 看蛋白 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"30d"}'` |
| 323 | SoT | 10 | 看蛋白 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"90d"}'` |
| 324 | SoT | 10 | 看蛋白 vs 脂肪(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 325 | SoT | 10 | 看碳水 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"30d"}'` |
| 326 | SoT | 10 | 看碳水 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"90d"}'` |
| 327 | SoT | 10 | 看碳水 vs 脂肪(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 328 | SoT | 10 | 看钠糖纤维趋势 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 329 | SoT | 10 | 看钠糖纤维综合 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 330 | SoT | 10 | 看三大营养交叉(最近 30 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"30d"}'` |
| 331 | SoT | 10 | 看三大营养交叉(最近 90 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"90d"}'` |
| 332 | SoT | 10 | 看三大营养交叉(自定义) | `calorie.view.diet-review` | <开始日期>／<结束日期> | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 333 | SoT | 10 | 预测体重(1 周后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 334 | SoT | 10 | 预测体重(1 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":30,"window":"14d"}'` |
| 335 | SoT | 10 | 预测体重(3 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":90,"window":"14d"}'` |
| 336 | SoT | 10 | 预测体重(6 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":180,"window":"14d"}'` |
| 337 | SoT | 10 | 预测体重(自定义时间) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":60,"window":"14d"}'` |
| 338 | SoT | 10 | 看每日 6 因素综合 | `calorie.view.six-factors` | — | 0 | calorie.view.six-factors | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 339 | SoT | 10 | 今日复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 340 | SoT | 10 | 复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 341 | SoT | 10 | 复盘日期范围 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 342 | SoT | 10 | 本周复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本周"}'` |
| 343 | SoT | 10 | 本年复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今年"}'` |
| 344 | SoT | 10 | 本月复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本月"}'` |
| 345 | SoT | 10 | 查低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"7d"}'` |
| 346 | SoT | 10 | 查健康报告 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"7d"}'` |
| 347 | SoT | 10 | 查卡路里数据 | `calorie.view.lint-health` | — | 0 | calorie.view.lint-health | `calorie-cmd-read calorie.view.lint-health` |
| 348 | SoT | 10 | 查热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 349 | SoT | 10 | 查热量趋势 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 350 | SoT | 10 | 查营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 351 | SoT | 10 | 查运动分布 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 352 | SoT | 10 | 查运动贡献 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 353 | SoT | 10 | 查频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"7d"}'` |
| 354 | SoT | 10 | 查食物排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"topN":10,"window":"7d"}'` |
| 355 | SoT | 10 | 查高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"window":"7d"}'` |
| 356 | SoT | 10 | 查高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"7d"}'` |
| 357 | SoT | 10 | 查高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"7d"}'` |
| 358 | 新拟 | 09 | 存身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 359 | 新拟 | 09 | 移除身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 360 | 新拟 | 09 | 设置照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 361 | 新拟 | 02 | 看今日饮食记录 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| 362 | 新拟 | 06 | 看目标配置 | `calorie.view.goal-config` | — | 0 | calorie.view.goal-config | `calorie-cmd-read calorie.view.goal-config` |
| 363 | 新拟 | 06 | 看目标状态 | `calorie.view.goal-status` | — | 0 | calorie.view.goal-status | `calorie-cmd-read calorie.view.goal-status` |
| 364 | 新拟 | 10 | 看组合分析 | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 365 | 新拟 | 10 | 看热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 366 | 新拟 | 02 | 看饮食复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 367 | 新拟 | 10 | 看健康盘 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"今日"}'` |
| 368 | 新拟 | 02 | 查高热量排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"window":"7d"}'` |
| 369 | 新拟 | 02 | 查食品库 | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library` |
| 370 | 新拟 | 02 | 搜食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 371 | 新拟 | 09 | 看身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 372 | 新拟 | 09 | 查身材照详情 | `calorie.photo.detail` | — | 0 | calorie.photo.detail | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 373 | 新拟 | 09 | 对比身材照 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 374 | 新拟 | 09 | 做身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 375 | 新拟 | 09 | 看身材照HELP | `calorie.help.center` | — | 0 | calorie.help.center | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 376 | 新拟 | 10 | 查唤醒词 | `calorie.help.lookup` | — | 0 | calorie.help.lookup | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 377 | 新拟 | 10 | 查热量历史 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 378 | 新拟 | 03 | 看体重历史 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history` |
| 379 | 新拟 | 03 | 看体重对比 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"7d","compareWindow":"prev"}'` |
| 380 | 新拟 | 03 | 看体重复核 | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review` |
| 381 | 新拟 | 03 | 看波动分析 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility` |
| 382 | 新拟 | 08 | 看体成分 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 383 | 新拟 | 08 | 看围度记录 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 384 | 新拟 | 05 | 看训练计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 385 | 新拟 | 05 | 看构建向导 | `calorie.view.plan-wizard` | <开始日期> | 0 | calorie.view.plan-wizard | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 386 | 新拟 | 04 | 看运动目标 | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal` |
| 387 | 新拟 | 10 | 看体重预测 | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 388 | 新拟 | 10 | 看异常诊断 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","window":"7d"}'` |
| 389 | 新拟 | 05 | 看禁忌扫描 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 390 | 新拟 | 02 | 看去重报告 | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 391 | 新拟 | 07 | 看档案视图 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 392 | 新拟 | 04 | 看力量总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 393 | 新拟 | 04 | 看有氧总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 394 | 新拟 | 04 | 看运动分类占比 | `calorie.view.exercise-distribution` | — | 0 | calorie.view.exercise-distribution | `calorie-cmd-read calorie.view.exercise-distribution --params '{"window":"7d"}'` |
| 395 | 新拟 | 04 | 看运动复盘 | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"7d"}'` |
| 396 | 新拟 | 05 | 看训练计划复盘 | `calorie.view.exercise-review` | <开始日期>／<结束日期> | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 397 | 新拟 | 04 | 看运动消耗趋势 | `calorie.view.exercise-trend` | — | 0 | calorie.view.exercise-trend | `calorie-cmd-read calorie.view.exercise-trend --params '{"window":"7d"}'` |
| 398 | 新拟 | 02 | 查营养配比 | `calorie.view.nutrition-ratio` | — | 0 | calorie.view.nutrition-ratio | `calorie-cmd-read calorie.view.nutrition-ratio --params '{"window":"7d"}'` |
| 399 | 新拟 | 02 | 看营养素明细 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 400 | 新拟 | 02 | 看食品来源分布 | `calorie.view.source-stats` | — | 0 | calorie.view.source-stats | `calorie-cmd-read calorie.view.source-stats` |
| 401 | 新拟 | 02 | 看今日饮水 | `calorie.view.today-water` | — | 0 | calorie.view.today-water | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 402 | 新拟 | 02 | 看批量导入预览 | `calorie.view.batch-import-preview` | <日期> | 0 | calorie.view.batch-import-preview | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` |
| 403 | 新拟 | 10 | 看热量趋势 | `calorie.view.calorie-trend` | — | 0 | calorie.view.calorie-trend | `calorie-cmd-read calorie.view.calorie-trend --params '{"window":"7d"}'` |
| 404 | 新拟 | 10 | 查数据健康 | `calorie.view.lint-health` | — | 0 | calorie.view.lint-health | `calorie-cmd-read calorie.view.lint-health` |
| 405 | 新拟 | 10 | 看整体趋势 | `calorie.view.long-trend` | — | 0 | calorie.view.long-trend | `calorie-cmd-read calorie.view.long-trend --params '{"group":"weight_calorie","window":"30d"}'` |
| 406 | 新拟 | 02 | 看营养分析 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 407 | 新拟 | 05 | 看落地训练进度 | `calorie.view.process-progress` | — | 0 | calorie.view.process-progress | `calorie-cmd-read calorie.view.process-progress` |
| 408 | 新拟 | 10 | 看复盘报告 | `calorie.view.review-template` | — | 0 | calorie.view.review-template | `calorie-cmd-read calorie.view.review-template --params '{"window":"7d"}'` |
| 409 | 新拟 | 02 | 看每日六因素 | `calorie.view.six-factors` | — | 0 | calorie.view.six-factors | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 410 | 新拟 | 08 | 看围度向导 | `calorie.view.measure-wizard` | — | 0 | calorie.view.measure-wizard | `calorie-cmd-read calorie.view.measure-wizard` |
| 411 | 新拟 | 08 | 看体脂向导 | `calorie.view.composition-wizard` | — | 0 | calorie.view.composition-wizard | `calorie-cmd-read calorie.view.composition-wizard` |
| 412 | 新拟 | 09 | 看身材照向导 | `calorie.view.photo-log-wizard` | — | 0 | calorie.view.photo-log-wizard | `calorie-cmd-read calorie.view.photo-log-wizard` |
| 413 | 新拟 | 09 | 看GIF规划器 | `calorie.view.gif-planner` | — | 0 | calorie.view.gif-planner | `calorie-cmd-read calorie.view.gif-planner --params '{"tag":"正面"}'` |
| 414 | 新拟 | 07 | 看档案预检 | `calorie.view.profile-wizard` | — | 0 | calorie.view.profile-wizard | `calorie-cmd-read calorie.view.profile-wizard` |
| 415 | 新拟 | 06 | 看目标预检 | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard` |
| 416 | 新拟 | 05 | 确认定训练计划 | `calorie.workout.plan-set` | — | 0 | calorie.workout.plan-set | `calorie-cmd-read calorie.workout.plan-set --params '{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}'` |
| 417 | 新拟 | 05 | 确认复制训练计划 | `calorie.workout.plan-copy` | — | 0 | calorie.workout.plan-copy | `calorie-cmd-read calorie.workout.plan-copy --params '{"newTitle":"示例副本"}'` |
| 418 | 新拟 | 05 | 确认定一周计划 | `calorie.workout.plan-set-week` | — | 0 | calorie.workout.plan-set-week | `calorie-cmd-read calorie.workout.plan-set-week --params '{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}'` |
| 419 | 新拟 | 05 | 确认加训练动作 | `calorie.workout.plan-add-movement` | — | 0 | calorie.workout.plan-add-movement | `calorie-cmd-read calorie.workout.plan-add-movement --params '{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}'` |
| 420 | 新拟 | 05 | 确认定休息日 | `calorie.workout.plan-set-rest` | — | 0 | calorie.workout.plan-set-rest | `calorie-cmd-read calorie.workout.plan-set-rest --params '{"week":1,"dayOfWeek":3}'` |
| 421 | 修复 | 06 | 看目标推荐 | `calorie.view.goal-recommend` | — | 0 | calorie.view.goal-recommend | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |

## 2. 占位符替换

| 占位符 | 替换为 | 命中记录数 | 说明 |
|---|---|---|---|
| `<照片路径>` | 临时真实文件（系统 tmp 下 .jpg） | 4 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<开始日期>` | 临时真实文件（系统 tmp 下 .jpg） | 29 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<结束日期>` | 临时真实文件（系统 tmp 下 .jpg） | 27 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<对比开始日期>` | 临时真实文件（系统 tmp 下 .jpg） | 1 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<对比结束日期>` | 临时真实文件（系统 tmp 下 .jpg） | 1 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<日期>` | 临时真实文件（系统 tmp 下 .jpg） | 24 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |

## 3. 无参可跑性（每键一次裸跑：`calorie-cmd-read <key>`，无 --params）

| key | 裸跑 exit | 无参可跑 |
|---|---|---|
| `calorie.body.composition-add` | 2 | 否 |
| `calorie.body.composition-remove` | 2 | 否 |
| `calorie.body.measure-add` | 2 | 否 |
| `calorie.body.measure-remove` | 2 | 否 |
| `calorie.diet.add` | 2 | 否 |
| `calorie.diet.batch` | 2 | 否 |
| `calorie.diet.copy` | 0 | 是 |
| `calorie.diet.remove` | 2 | 否 |
| `calorie.diet.remove-by-date` | 2 | 否 |
| `calorie.diet.remove-by-range` | 2 | 否 |
| `calorie.diet.remove-by-type` | 2 | 否 |
| `calorie.diet.update` | 2 | 否 |
| `calorie.diet.update-by-date` | 2 | 否 |
| `calorie.exercise.add` | 2 | 否 |
| `calorie.exercise.remove` | 2 | 否 |
| `calorie.exercise.update` | 2 | 否 |
| `calorie.goal.pause` | 0 | 是 |
| `calorie.goal.resume` | 0 | 是 |
| `calorie.goal.set` | 2 | 否 |
| `calorie.goal.water` | 2 | 否 |
| `calorie.goal.weight` | 2 | 否 |
| `calorie.help.center` | 0 | 是 |
| `calorie.help.lookup` | 2 | 否 |
| `calorie.history` | 0 | 是 |
| `calorie.photo.add` | 2 | 否 |
| `calorie.photo.compare` | 2 | 否 |
| `calorie.photo.detail` | 2 | 否 |
| `calorie.photo.gif` | 2 | 否 |
| `calorie.photo.list` | 0 | 是 |
| `calorie.photo.remove` | 2 | 否 |
| `calorie.photo.tag` | 2 | 否 |
| `calorie.product.add` | 2 | 否 |
| `calorie.product.deprecate` | 2 | 否 |
| `calorie.product.update` | 2 | 否 |
| `calorie.profile.activity` | 2 | 否 |
| `calorie.profile.set` | 2 | 否 |
| `calorie.profile.update` | 2 | 否 |
| `calorie.today` | 0 | 是 |
| `calorie.view.anomaly` | 2 | 否 |
| `calorie.view.batch-import-preview` | 2 | 否 |
| `calorie.view.body-composition` | 0 | 是 |
| `calorie.view.body-measure` | 0 | 是 |
| `calorie.view.calorie-trend` | 0 | 是 |
| `calorie.view.combined` | 0 | 是 |
| `calorie.view.composition-wizard` | 0 | 是 |
| `calorie.view.contraindication` | 0 | 是 |
| `calorie.view.dedupe` | 0 | 是 |
| `calorie.view.deficit` | 0 | 是 |
| `calorie.view.diet` | 0 | 是 |
| `calorie.view.diet-review` | 0 | 是 |
| `calorie.view.exercise` | 0 | 是 |
| `calorie.view.exercise-cardio` | 0 | 是 |
| `calorie.view.exercise-distribution` | 0 | 是 |
| `calorie.view.exercise-goal` | 0 | 是 |
| `calorie.view.exercise-recap` | 0 | 是 |
| `calorie.view.exercise-review` | 0 | 是 |
| `calorie.view.exercise-strength` | 0 | 是 |
| `calorie.view.exercise-trend` | 0 | 是 |
| `calorie.view.gif-planner` | 0 | 是 |
| `calorie.view.goal` | 0 | 是 |
| `calorie.view.goal-config` | 0 | 是 |
| `calorie.view.goal-expiring` | 0 | 是 |
| `calorie.view.goal-predict` | 0 | 是 |
| `calorie.view.goal-progress` | 0 | 是 |
| `calorie.view.goal-recommend` | 0 | 是 |
| `calorie.view.goal-status` | 0 | 是 |
| `calorie.view.goal-vs-actual` | 0 | 是 |
| `calorie.view.goal-weight` | 0 | 是 |
| `calorie.view.goal-wizard` | 0 | 是 |
| `calorie.view.health` | 0 | 是 |
| `calorie.view.home` | 0 | 是 |
| `calorie.view.library` | 0 | 是 |
| `calorie.view.lint-health` | 0 | 是 |
| `calorie.view.long-trend` | 0 | 是 |
| `calorie.view.measure-wizard` | 0 | 是 |
| `calorie.view.nutrition-analysis` | 0 | 是 |
| `calorie.view.nutrition-detail` | 0 | 是 |
| `calorie.view.nutrition-ratio` | 0 | 是 |
| `calorie.view.photo-log-wizard` | 0 | 是 |
| `calorie.view.plan` | 0 | 是 |
| `calorie.view.plan-vs-actual` | 0 | 是 |
| `calorie.view.plan-wizard` | 2 | 否 |
| `calorie.view.plan-write-preview` | 2 | 否 |
| `calorie.view.predict` | 0 | 是 |
| `calorie.view.process-progress` | 0 | 是 |
| `calorie.view.profile` | 0 | 是 |
| `calorie.view.profile-wizard` | 0 | 是 |
| `calorie.view.ranking` | 0 | 是 |
| `calorie.view.review-template` | 0 | 是 |
| `calorie.view.search` | 2 | 否 |
| `calorie.view.six-factors` | 0 | 是 |
| `calorie.view.source-stats` | 0 | 是 |
| `calorie.view.today-water` | 0 | 是 |
| `calorie.view.volatility` | 0 | 是 |
| `calorie.view.weight` | 0 | 是 |
| `calorie.view.weight-compare` | 2 | 否 |
| `calorie.view.weight-history` | 0 | 是 |
| `calorie.view.weight-review` | 0 | 是 |
| `calorie.water.log` | 2 | 否 |
| `calorie.weight.batch` | 2 | 否 |
| `calorie.weight.log` | 2 | 否 |
| `calorie.weight.remove` | 2 | 否 |
| `calorie.weight.update` | 2 | 否 |
| `calorie.workout.plan-add-movement` | 2 | 否 |
| `calorie.workout.plan-copy` | 0 | 是 |
| `calorie.workout.plan-set` | 2 | 否 |
| `calorie.workout.plan-set-rest` | 2 | 否 |
| `calorie.workout.plan-set-week` | 2 | 否 |

## 4. 结论

exec 桶 421 条**全部 exit 0**（原样 364 条 ＋ 占位符替换后 57 条），且 envelope `key` 与路由 `key` 逐条一致；非零 0。

> 降级词（转 non-exec）与同 key 承接入口的逐条对照见 `docs/research/t81-route-evidence.md` §2.2。
