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
| exec 桶记录数 | 489 |
| 原样实跑 exit 0（envelope key 一致） | 416 |
| 占位符替换后 exit 0 | 59 |
| **非零（失败）** | 14 |
| 涉及键数 | 119 |
| 无参裸跑非零的键（＝需要参数） | 54 |
| └ 其中 exec 记录数（结构性断言覆盖面） | 139 |

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
| 14 | SoT | 02 | 拍营养表记一餐 | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"营养表识别"}'` |
| 15 | SoT | 02 | 拍营养表补记一餐 | `calorie.diet.add` | <日期> | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"date":"<日期>","time":"12:30:00","note":"营养表补记"}'` |
| 16 | SoT | 02 | 记喝水 | `calorie.water.log` | — | 0 | calorie.water.log | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 17 | SoT | 02 | 复制昨日饮食 | `calorie.diet.copy` | <日期> | 0 | calorie.diet.copy | `calorie-cmd-read calorie.diet.copy --params '{"from":"<日期>"}'` |
| 18 | SoT | 02 | 改饮食记录 | `calorie.diet.update` | — | 0 | calorie.diet.update | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 19 | SoT | 02 | 改某日饮食 | `calorie.diet.update-by-date` | <日期> | 0 | calorie.diet.update-by-date | `calorie-cmd-read calorie.diet.update-by-date --params '{"note":"食堂","date":"<日期>"}'` |
| 20 | SoT | 02 | 删饮食记录 | `calorie.diet.remove` | — | 0 | calorie.diet.remove | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 21 | SoT | 02 | 删一餐 | `calorie.diet.remove-by-type` | <日期> | 0 | calorie.diet.remove-by-type | `calorie-cmd-read calorie.diet.remove-by-type --params '{"mealType":"早餐","date":"<日期>"}'` |
| 22 | SoT | 02 | 删某日饮食 | `calorie.diet.remove-by-date` | <日期> | 0 | calorie.diet.remove-by-date | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"<日期>"}'` |
| 23 | SoT | 02 | 批量删饮食 | `calorie.diet.remove-by-range` | <日期> | 0 | calorie.diet.remove-by-range | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"<日期>","end":"<日期>"}'` |
| 24 | SoT | 02 | 看今日饮食 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| 25 | SoT | 02 | 看昨日饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"昨日"}'` |
| 26 | SoT | 02 | 看本周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"本周"}'` |
| 27 | SoT | 02 | 看上周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"上周"}'` |
| 28 | SoT | 02 | 看本月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"本月"}'` |
| 29 | SoT | 02 | 看上月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"上月"}'` |
| 30 | SoT | 02 | 看最近 7 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 31 | SoT | 02 | 看最近 30 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"30d"}'` |
| 32 | SoT | 02 | 看某段时间饮食 | `calorie.view.diet` | <开始日期>／<结束日期> | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 33 | SoT | 02 | 看今日喝水 | `calorie.view.today-water` | — | 0 | calorie.view.today-water | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 34 | SoT | 02 | 看有备注的饮食记录 | `calorie.today` | — | 4 | — | `calorie-cmd-read calorie.today --params '{"date":"今日","hasNote":true}'` |
| 35 | SoT | 02 | 查食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 36 | SoT | 02 | 查食品（按分类） | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| 37 | SoT | 02 | 存食品 | `calorie.product.add` | — | 0 | calorie.product.add | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| 38 | SoT | 02 | 改食品 | `calorie.product.update` | — | 0 | calorie.product.update | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 39 | SoT | 02 | 下架食品 | `calorie.product.deprecate` | — | 0 | calorie.product.deprecate | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| 40 | SoT | 02 | 看食品库（去重） | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 41 | SoT | 02 | 批量导入食品 | `calorie.product.import` | — | 0 | calorie.product.import | `calorie-cmd-read calorie.product.import --params '{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}]}'` |
| 42 | SoT | 02 | 校验批量导入 | `calorie.view.batch-import-preview` | — | 0 | calorie.view.batch-import-preview | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3}]}'` |
| 43 | SoT | 02 | 看食品来源统计 | `calorie.view.source-stats` | — | 0 | calorie.view.source-stats | `calorie-cmd-read calorie.view.source-stats` |
| 44 | SoT | 02 | 看营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 45 | SoT | 02 | 看今日营养 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 46 | SoT | 02 | 看饮食总览 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 47 | SoT | 02 | 看营养素深度 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 48 | SoT | 02 | 看高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"7d"}'` |
| 49 | SoT | 02 | 看低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"7d"}'` |
| 50 | SoT | 02 | 看频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"7d"}'` |
| 51 | SoT | 02 | 看高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"7d"}'` |
| 52 | SoT | 02 | 看高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"7d"}'` |
| 53 | SoT | 02 | 看全部排行榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"topN":10,"window":"7d"}'` |
| 54 | SoT | 02 | 看高热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"30d"}'` |
| 55 | SoT | 02 | 看高热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"本月"}'` |
| 56 | SoT | 02 | 看高热量榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 57 | SoT | 02 | 看低热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"30d"}'` |
| 58 | SoT | 02 | 看低热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"本月"}'` |
| 59 | SoT | 02 | 看低热量榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 60 | SoT | 02 | 看频繁吃榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"30d"}'` |
| 61 | SoT | 02 | 看频繁吃榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"本月"}'` |
| 62 | SoT | 02 | 看频繁吃榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 63 | SoT | 02 | 看高碳水榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"30d"}'` |
| 64 | SoT | 02 | 看高碳水榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"本月"}'` |
| 65 | SoT | 02 | 看高碳水榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 66 | SoT | 02 | 看高蛋白榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"30d"}'` |
| 67 | SoT | 02 | 看高蛋白榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"本月"}'` |
| 68 | SoT | 02 | 看高蛋白榜（自定义） | `calorie.view.ranking` | <开始日期>／<结束日期> | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 69 | SoT | 02 | 饮食复盘（本周） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本周"}'` |
| 70 | SoT | 02 | 饮食复盘（本月） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本月"}'` |
| 71 | SoT | 02 | 饮食复盘（最近 90 天） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"90d"}'` |
| 72 | SoT | 02 | 饮食复盘（今年） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今年"}'` |
| 73 | SoT | 02 | 饮食复盘（自定义时间） | `calorie.view.diet-review` | <开始日期>／<结束日期> | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 74 | SoT | 02 | 看早餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 75 | SoT | 02 | 看午餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 76 | SoT | 02 | 看晚餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 77 | SoT | 02 | 看加餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 78 | SoT | 02 | 看全部餐别分布（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` |
| 79 | SoT | 02 | 看「有备注」的饮食记录 | `calorie.today` | — | 4 | — | `calorie-cmd-read calorie.today --params '{"date":"今日","hasNote":true}'` |
| 80 | SoT | 03 | 记体重 | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 81 | SoT | 03 | 记体重（含备注） | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"note":"晨起空腹"}'` |
| 82 | SoT | 03 | 补录体重 | `calorie.weight.log` | <日期> | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"date":"<日期>"}'` |
| 83 | SoT | 03 | 批量补录体重 | `calorie.weight.batch` | <日期> | 0 | calorie.weight.batch | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"<日期>","kg":70.5}]}'` |
| 84 | SoT | 03 | 看今日体重 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"window":"今日"}'` |
| 85 | SoT | 03 | 改体重记录 | `calorie.weight.update` | — | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| 86 | SoT | 03 | 改某日体重 | `calorie.weight.update` | <日期> | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"kg":70.2,"date":"<日期>"}'` |
| 87 | SoT | 03 | 删体重记录 | `calorie.weight.remove` | — | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 88 | SoT | 03 | 删某日体重 | `calorie.weight.remove` | <日期> | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"date":"<日期>"}'` |
| 89 | SoT | 03 | 批量删体重 | `calorie.weight.remove` | <日期> | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"start":"<日期>","end":"<日期>"}'` |
| 90 | SoT | 03 | 看本周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本周"}'` |
| 91 | SoT | 03 | 看上周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上周"}'` |
| 92 | SoT | 03 | 看本月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本月"}'` |
| 93 | SoT | 03 | 看上月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上月"}'` |
| 94 | SoT | 03 | 看最近 7 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"7d"}'` |
| 95 | SoT | 03 | 看最近 90 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"90d"}'` |
| 96 | SoT | 03 | 看某段时间体重 | `calorie.view.weight-history` | <开始日期>／<结束日期> | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 97 | SoT | 03 | 看体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d"}'` |
| 98 | SoT | 03 | 看体重曲线（带目标） | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d","overlay":"target"}'` |
| 99 | SoT | 03 | 看体重曲线（带里程碑） | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d","overlay":"milestone"}'` |
| 100 | SoT | 03 | 看体重曲线（带异常点） | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d","overlay":"anomaly"}'` |
| 101 | SoT | 03 | 看本月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"本月"}'` |
| 102 | SoT | 03 | 看上月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"上月"}'` |
| 103 | SoT | 03 | 看最近 90 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"90d"}'` |
| 104 | SoT | 03 | 看最近 180 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"180d"}'` |
| 105 | SoT | 03 | 看最近 365 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"365d"}'` |
| 106 | SoT | 03 | 看某段时间体重曲线 | `calorie.view.weight-history` | <开始日期>／<结束日期> | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 107 | SoT | 03 | 看体重稳不稳（增强版） | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 108 | SoT | 03 | 看本月波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"本月"}'` |
| 109 | SoT | 03 | 看最近 90 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"90d"}'` |
| 110 | SoT | 03 | 看最近 180 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"180d"}'` |
| 111 | SoT | 03 | 看波动异常点 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 112 | SoT | 03 | 看「有备注」的体重记录 | `calorie.view.weight-history` | — | 4 | — | `calorie-cmd-read calorie.view.weight-history --params '{"window":"30d","noteOnly":true}'` |
| 113 | SoT | 03 | 对比体重：最近 30 天 vs 之前 30 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"30d","compareWindow":"prev"}'` |
| 114 | SoT | 03 | 对比体重：自定义两段时间 | `calorie.view.weight-compare` | <开始日期>／<结束日期>／<对比开始日期>／<对比结束日期> | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>","compareWindow":"custom","compareStart":"<对比开始日期>","compareEnd":"<对比结束日期>"}'` |
| 115 | SoT | 03 | 对比体重：本周 vs 上周 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"本周","compareWindow":"上周"}'` |
| 116 | SoT | 03 | 对比体重：本月 vs 上月 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"本月","compareWindow":"上月"}'` |
| 117 | SoT | 03 | 对比体重：近 N 天 vs 上一个 N 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"7d","compareWindow":"prev"}'` |
| 118 | SoT | 03 | 对比体重：今天 vs 一年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-1y"}'` |
| 119 | SoT | 03 | 对比体重：今天 vs 半年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-6m"}'` |
| 120 | SoT | 03 | 对比体重：今天 vs 三月前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"今日","compareWindow":"今日","compareOffset":"-3m"}'` |
| 121 | SoT | 03 | 对比体重：当前 vs 目标体重 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"30d"}'` |
| 122 | SoT | 03 | 对比体重：当前 vs 平台期首日 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"b8"}'` |
| 123 | SoT | 03 | 对比体重：当前 vs 历史最低 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e1"}'` |
| 124 | SoT | 03 | 对比体重：当前 vs 历史最高 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e2"}'` |
| 125 | SoT | 03 | 对比体重：减重 5kg 那天 vs 今天 | `calorie.view.weight-compare` | — | 4 | — | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e3","delta":5}'` |
| 126 | SoT | 03 | 对比体重：减重 10kg 那天 vs 今天 | `calorie.view.weight-compare` | — | 4 | — | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e3","delta":10}'` |
| 127 | SoT | 03 | 对比体重：当前 vs 入夏最低 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e5"}'` |
| 128 | SoT | 03 | 对比体重：当前 vs 入冬最低 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"e6"}'` |
| 129 | SoT | 03 | 对比体重：运动多 vs 运动少的两个月 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"scenario":"c5"}'` |
| 130 | SoT | 03 | 对比体重：工作日 vs 周末 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"工作日","compareWindow":"周末"}'` |
| 131 | SoT | 03 | 看体重总览 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"window":"30d"}'` |
| 132 | SoT | 03 | 体重复盘（本周） | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review --params '{"window":"本周"}'` |
| 133 | SoT | 03 | 体重复盘（本月） | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review --params '{"window":"本月"}'` |
| 134 | SoT | 03 | 体重复盘（最近 90 天） | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review --params '{"window":"90d"}'` |
| 135 | SoT | 03 | 体重复盘（今年） | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review --params '{"window":"今年"}'` |
| 136 | SoT | 03 | 体重复盘（自定义时间） | `calorie.view.weight-review` | <开始日期>／<结束日期> | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 137 | SoT | 03 | 看里程碑回溯 | `calorie.view.weight-review` | — | 4 | — | `calorie-cmd-read calorie.view.weight-review --params '{"mode":"milestones"}'` |
| 138 | SoT | 04 | 记运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| 139 | SoT | 04 | 记运动（含备注） | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}'` |
| 140 | SoT | 04 | 记力量训练 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}'` |
| 141 | SoT | 04 | 记有氧运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}'` |
| 142 | SoT | 04 | 记日常活动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}'` |
| 143 | SoT | 04 | 补记运动 | `calorie.exercise.add` | <日期> | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}'` |
| 144 | SoT | 04 | 批量补记运动 | `calorie.exercise.add` | <日期> | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"<日期>"}]}'` |
| 145 | SoT | 04 | 复制昨日运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'` |
| 146 | SoT | 04 | 改运动记录 | `calorie.exercise.update` | — | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| 147 | SoT | 04 | 改某日运动 | `calorie.exercise.update` | <日期> | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"note":"补记","date":"<日期>"}'` |
| 148 | SoT | 04 | 删运动记录 | `calorie.exercise.remove` | — | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| 149 | SoT | 04 | 删某日运动 | `calorie.exercise.remove` | <日期> | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"date":"<日期>"}'` |
| 150 | SoT | 04 | 批量删运动 | `calorie.exercise.remove` | <日期> | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"from":"<日期>","to":"<日期>"}'` |
| 151 | SoT | 04 | 看今日运动 | `calorie.view.exercise-records` | — | 0 | calorie.view.exercise-records | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"今日"}'` |
| 152 | SoT | 04 | 看昨日运动 | `calorie.view.exercise-records` | — | 0 | calorie.view.exercise-records | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"昨日"}'` |
| 153 | SoT | 04 | 看本周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本周"}'` |
| 154 | SoT | 04 | 看上周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"上周"}'` |
| 155 | SoT | 04 | 看本月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"本月"}'` |
| 156 | SoT | 04 | 看上月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"上月"}'` |
| 157 | SoT | 04 | 看最近 7 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 158 | SoT | 04 | 看最近 30 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"30d"}'` |
| 159 | SoT | 04 | 看某段时间运动 | `calorie.view.exercise` | <开始日期>／<结束日期> | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 160 | SoT | 04 | 看今日运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"今日"}'` |
| 161 | SoT | 04 | 看本周运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"本周"}'` |
| 162 | SoT | 04 | 看运动记录（有备注） | `calorie.view.exercise-records` | — | 4 | — | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"7d","hasNote":true}'` |
| 163 | SoT | 04 | 看运动记录（按力量筛选） | `calorie.view.exercise-records` | — | 0 | calorie.view.exercise-records | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"7d","category":"力量"}'` |
| 164 | SoT | 04 | 看运动记录（按有氧筛选） | `calorie.view.exercise-records` | — | 0 | calorie.view.exercise-records | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"7d","category":"有氧"}'` |
| 165 | SoT | 04 | 看最近 60 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"60d"}'` |
| 166 | SoT | 04 | 看最近 180 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"180d"}'` |
| 167 | SoT | 04 | 看最近 365 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"365d"}'` |
| 168 | SoT | 04 | 看运动类型分布 | `calorie.view.exercise-distribution` | — | 0 | calorie.view.exercise-distribution | `calorie-cmd-read calorie.view.exercise-distribution --params '{"window":"7d"}'` |
| 169 | SoT | 04 | 看力量训练总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 170 | SoT | 04 | 看有氧训练总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 171 | SoT | 04 | 看运动趋势 | `calorie.view.exercise-trend` | — | 0 | calorie.view.exercise-trend | `calorie-cmd-read calorie.view.exercise-trend --params '{"window":"30d"}'` |
| 172 | SoT | 04 | 运动复盘（本周） | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"本周"}'` |
| 173 | SoT | 04 | 运动复盘（本月） | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"本月"}'` |
| 174 | SoT | 04 | 运动复盘（最近 90 天） | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"90d"}'` |
| 175 | SoT | 04 | 运动复盘（今年） | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"今年"}'` |
| 176 | SoT | 04 | 运动复盘（自定义时间） | `calorie.view.exercise-recap` | <开始日期>／<结束日期> | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 177 | SoT | 05 | 看本周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":0}'` |
| 178 | SoT | 05 | 看下周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":1}'` |
| 179 | SoT | 05 | 看上周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"weekOffset":-1}'` |
| 180 | SoT | 05 | 看指定周计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"week":1}'` |
| 181 | SoT | 05 | 看今天练什么 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 182 | SoT | 05 | 看某动作安排 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"movement":"硬拉"}'` |
| 183 | SoT | 05 | 看某天练什么 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 184 | SoT | 05 | 看计划概览 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 185 | SoT | 05 | 看完整计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 186 | SoT | 05 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` | — | 0 | calorie.view.plan-vs-actual | `calorie-cmd-read calorie.view.plan-vs-actual --params '{"window":"本周"}'` |
| 187 | SoT | 05 | 定训练计划 | `calorie.view.plan-wizard` | <开始日期> | 0 | calorie.view.plan-wizard | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 188 | SoT | 05 | 复制训练计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"copy"}'` |
| 189 | SoT | 05 | 定休息日 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"set-rest","week":1,"dayOfWeek":3}'` |
| 190 | SoT | 05 | 加训练动作 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}'` |
| 191 | SoT | 05 | 定一周计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"set-week","week":1}'` |
| 192 | SoT | 05 | 改训练计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"update","title":"示例改名"}'` |
| 193 | SoT | 05 | 改某天训练 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}'` |
| 194 | SoT | 05 | 删某天训练 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"delete-day","week":1,"dayOfWeek":3}'` |
| 195 | SoT | 05 | 改动作 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}'` |
| 196 | SoT | 05 | 撤销训练计划 | `calorie.view.plan-write-preview` | — | 0 | calorie.view.plan-write-preview | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"delete"}'` |
| 197 | SoT | 05 | 计划复盘（本周） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本周"}'` |
| 198 | SoT | 05 | 计划复盘（本月） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本月"}'` |
| 199 | SoT | 05 | 计划复盘（全部） | `calorie.view.exercise-review` | <开始日期>／<结束日期> | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 200 | SoT | 05 | 看计划完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 201 | SoT | 05 | 看未完成训练 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 202 | SoT | 05 | 看动作完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"7d"}'` |
| 203 | SoT | 05 | 扫禁忌 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 204 | SoT | 06 | 定营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}'` |
| 205 | SoT | 06 | 定营养目标(自动算) | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"定营养目标(自动算)"}'` |
| 206 | SoT | 06 | 定体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| 207 | SoT | 06 | 定体重目标(自动算截止) | `calorie.goal.weight` | <日期> | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"<日期>"}'` |
| 208 | SoT | 06 | 定体重目标(含起始日) | `calorie.goal.weight` | <日期> | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"startKg":72,"deadline":"<日期>","startDate":"<日期>"}'` |
| 209 | SoT | 06 | 定饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| 210 | SoT | 06 | 定饮水目标(自动算) | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"定饮水目标(自动算)"}'` |
| 211 | SoT | 06 | 一键定全套目标 | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard --params '{"profile":"cut","wake":"一键定全套目标"}'` |
| 212 | SoT | 06 | 看今日目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 213 | SoT | 06 | 看本周目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"本周"}'` |
| 214 | SoT | 06 | 看营养目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 215 | SoT | 06 | 看体重目标进度 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"7d"}'` |
| 216 | SoT | 06 | 看饮水目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 217 | SoT | 06 | 看目标对比实际 | `calorie.view.goal-vs-actual` | — | 0 | calorie.view.goal-vs-actual | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"window":"30d"}'` |
| 218 | SoT | 06 | 看目标完成度 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"window":"7d"}'` |
| 219 | SoT | 06 | 看即将到期的目标 | `calorie.view.goal-expiring` | — | 0 | calorie.view.goal-expiring | `calorie-cmd-read calorie.view.goal-expiring` |
| 220 | SoT | 06 | 看目标完成率(按周) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 221 | SoT | 06 | 看目标完成率(按月) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"7d"}'` |
| 222 | SoT | 06 | 改营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| 223 | SoT | 06 | 改体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":67.5}'` |
| 224 | SoT | 06 | 改饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2200}'` |
| 225 | SoT | 06 | 暂停所有目标 | `calorie.goal.pause` | — | 0 | calorie.goal.pause | `calorie-cmd-read calorie.goal.pause` |
| 226 | SoT | 06 | 重启所有目标 | `calorie.goal.resume` | — | 0 | calorie.goal.resume | `calorie-cmd-read calorie.goal.resume` |
| 227 | SoT | 06 | 看目标历史完成 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"window":"30d"}'` |
| 228 | SoT | 06 | 看目标预测达成 | `calorie.view.goal-predict` | — | 0 | calorie.view.goal-predict | `calorie-cmd-read calorie.view.goal-predict --params '{"window":"14d"}'` |
| 229 | SoT | 07 | 设置档案 | `calorie.profile.set` | — | 0 | calorie.profile.set | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}'` |
| 230 | SoT | 07 | 设活动量 | `calorie.profile.activity` | — | 0 | calorie.profile.activity | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 231 | SoT | 07 | 改档案 | `calorie.profile.update` | — | 0 | calorie.profile.update | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 232 | SoT | 07 | 查档案 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 233 | SoT | 08 | 记体脂（皮褶钳） | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","sex":"male","age":30,"caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10,"date":"<日期>"}'` |
| 234 | SoT | 08 | 记体脂（外部测量） | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5,"date":"<日期>"}'` |
| 235 | SoT | 08 | 记围度 | `calorie.body.measure-add` | — | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85,"hipCm":95}'` |
| 236 | SoT | 08 | 补记体脂 | `calorie.body.composition-add` | <日期> | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":19,"date":"<日期>"}'` |
| 237 | SoT | 08 | 补记围度 | `calorie.body.measure-add` | <日期> | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":86,"date":"<日期>"}'` |
| 238 | SoT | 08 | 看体脂 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 239 | SoT | 08 | 看体脂趋势 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition --params '{"days":90}'` |
| 240 | SoT | 08 | 看围度 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 241 | SoT | 08 | 看围度趋势 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure --params '{"days":90}'` |
| 242 | SoT | 08 | 对比体脂 | `calorie.view.body-composition-compare` | — | 0 | calorie.view.body-composition-compare | `calorie-cmd-read calorie.view.body-composition-compare --params '{"period1Start":"2026-09-05","period1End":"2026-09-05","period2Start":"2026-09-07","period2End":"2026-09-07"}'` |
| 243 | SoT | 08 | 对比围度 | `calorie.view.body-measure-compare` | — | 0 | calorie.view.body-measure-compare | `calorie-cmd-read calorie.view.body-measure-compare --params '{"date1":"2026-09-05","date2":"2026-09-07"}'` |
| 244 | SoT | 08 | 删体脂 | `calorie.body.composition-remove` | — | 0 | calorie.body.composition-remove | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| 245 | SoT | 08 | 删围度 | `calorie.body.measure-remove` | — | 0 | calorie.body.measure-remove | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| 246 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 247 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 248 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 249 | SoT | 09 | 查身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 250 | SoT | 09 | 对比两张照片 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 251 | SoT | 09 | 生成身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 252 | SoT | 09 | 删身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 253 | SoT | 09 | 改照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"set","tag":"晨起"}'` |
| 254 | SoT | 09 | 加照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 255 | SoT | 09 | 删照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"remove","tag":"晨起"}'` |
| 256 | SoT | 10 | 看体重 vs 摄入(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 257 | SoT | 10 | 看体重 vs 摄入(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"15d"}'` |
| 258 | SoT | 10 | 看体重 vs 摄入(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"30d"}'` |
| 259 | SoT | 10 | 看体重 vs 摄入(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"60d"}'` |
| 260 | SoT | 10 | 看体重 vs 摄入(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"90d"}'` |
| 261 | SoT | 10 | 看体重 vs 摄入(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"180d"}'` |
| 262 | SoT | 10 | 看体重 vs 摄入(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"365d"}'` |
| 263 | SoT | 10 | 看体重 vs 摄入(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"week_cur"}'` |
| 264 | SoT | 10 | 看体重 vs 摄入(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"month_cur"}'` |
| 265 | SoT | 10 | 看体重 vs 摄入(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 266 | SoT | 10 | 看体重 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"7d"}'` |
| 267 | SoT | 10 | 看体重 vs 运动(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"15d"}'` |
| 268 | SoT | 10 | 看体重 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"30d"}'` |
| 269 | SoT | 10 | 看体重 vs 运动(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"60d"}'` |
| 270 | SoT | 10 | 看体重 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"90d"}'` |
| 271 | SoT | 10 | 看体重 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"180d"}'` |
| 272 | SoT | 10 | 看体重 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"365d"}'` |
| 273 | SoT | 10 | 看体重 vs 运动(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"week_cur"}'` |
| 274 | SoT | 10 | 看体重 vs 运动(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"month_cur"}'` |
| 275 | SoT | 10 | 看体重 vs 运动(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 276 | SoT | 10 | 看体重 vs 蛋白(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"7d"}'` |
| 277 | SoT | 10 | 看体重 vs 蛋白(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"15d"}'` |
| 278 | SoT | 10 | 看体重 vs 蛋白(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"30d"}'` |
| 279 | SoT | 10 | 看体重 vs 蛋白(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"60d"}'` |
| 280 | SoT | 10 | 看体重 vs 蛋白(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"90d"}'` |
| 281 | SoT | 10 | 看体重 vs 蛋白(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"180d"}'` |
| 282 | SoT | 10 | 看体重 vs 蛋白(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"365d"}'` |
| 283 | SoT | 10 | 看体重 vs 蛋白(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"week_cur"}'` |
| 284 | SoT | 10 | 看体重 vs 蛋白(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"month_cur"}'` |
| 285 | SoT | 10 | 看体重 vs 蛋白(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 286 | SoT | 10 | 看体重 vs 缺口(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` |
| 287 | SoT | 10 | 看体重 vs 缺口(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"15d"}'` |
| 288 | SoT | 10 | 看体重 vs 缺口(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"30d"}'` |
| 289 | SoT | 10 | 看体重 vs 缺口(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"60d"}'` |
| 290 | SoT | 10 | 看体重 vs 缺口(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"90d"}'` |
| 291 | SoT | 10 | 看体重 vs 缺口(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"180d"}'` |
| 292 | SoT | 10 | 看体重 vs 缺口(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"365d"}'` |
| 293 | SoT | 10 | 看体重 vs 缺口(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"week_cur"}'` |
| 294 | SoT | 10 | 看体重 vs 缺口(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"month_cur"}'` |
| 295 | SoT | 10 | 看体重 vs 缺口(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 296 | SoT | 10 | 看摄入 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"7d"}'` |
| 297 | SoT | 10 | 看摄入 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"30d"}'` |
| 298 | SoT | 10 | 看摄入 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"90d"}'` |
| 299 | SoT | 10 | 看摄入 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"180d"}'` |
| 300 | SoT | 10 | 看摄入 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"365d"}'` |
| 301 | SoT | 10 | 看摄入 vs 运动(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 302 | SoT | 10 | 看体重 vs 体脂(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"7d"}'` |
| 303 | SoT | 10 | 看体重 vs 体脂(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"30d"}'` |
| 304 | SoT | 10 | 看体重 vs 体脂(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"90d"}'` |
| 305 | SoT | 10 | 看体重 vs 体脂(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"180d"}'` |
| 306 | SoT | 10 | 看体重 vs 体脂(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"365d"}'` |
| 307 | SoT | 10 | 看体重 vs 体脂(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 308 | SoT | 10 | 看体重 vs 围度(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"7d"}'` |
| 309 | SoT | 10 | 看体重 vs 围度(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"30d"}'` |
| 310 | SoT | 10 | 看体重 vs 围度(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"90d"}'` |
| 311 | SoT | 10 | 看体重 vs 围度(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"180d"}'` |
| 312 | SoT | 10 | 看体重 vs 围度(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"365d"}'` |
| 313 | SoT | 10 | 看体重 vs 围度(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 314 | SoT | 10 | 看饮水 vs 体重(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"30d"}'` |
| 315 | SoT | 10 | 看饮水 vs 体重(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 316 | SoT | 10 | 看健康报告(本周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"本周"}'` |
| 317 | SoT | 10 | 看健康报告(上周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"上周"}'` |
| 318 | SoT | 10 | 看健康报告(最近 7 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"7d"}'` |
| 319 | SoT | 10 | 看健康报告(最近 30 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"30d"}'` |
| 320 | SoT | 10 | 看健康报告(最近 90 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"90d"}'` |
| 321 | SoT | 10 | 看健康报告(最近 180 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"180d"}'` |
| 322 | SoT | 10 | 看健康报告(最近 365 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"365d"}'` |
| 323 | SoT | 10 | 看健康报告(本月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"本月"}'` |
| 324 | SoT | 10 | 看健康报告(上月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"上月"}'` |
| 325 | SoT | 10 | 看健康报告(今年) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"今年"}'` |
| 326 | SoT | 10 | 看健康报告(自定义) | `calorie.view.health` | <开始日期>／<结束日期> | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 327 | SoT | 10 | 看整体趋势(体重+摄入+运动) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g1","compare":"target"}'` |
| 328 | SoT | 10 | 看整体趋势(体重+体脂+围度) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g2","compare":"target"}'` |
| 329 | SoT | 10 | 看整体趋势(饮食+蛋白+纤维) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g3","compare":"target"}'` |
| 330 | SoT | 10 | 看整体趋势(运动+力量+有氧) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g4","compare":"target"}'` |
| 331 | SoT | 10 | 看整体趋势(BMI+体脂+肌肉量) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g5","compare":"target"}'` |
| 332 | SoT | 10 | 看整体趋势(摄入+蛋白+运动) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g6","compare":"target"}'` |
| 333 | SoT | 10 | 看整体趋势(体重+蛋白+缺口) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g7","compare":"target"}'` |
| 334 | SoT | 10 | 看整体趋势(体重+摄入+缺口) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g8","compare":"target"}'` |
| 335 | SoT | 10 | 看整体趋势(体重+摄入+运动+缺口) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g9","compare":"target"}'` |
| 336 | SoT | 10 | 看整体趋势(蛋白+运动) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g10","compare":"target"}'` |
| 337 | SoT | 10 | 看整体趋势(综合多指标) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g11","compare":"target"}'` |
| 338 | SoT | 10 | 看整体趋势(含月度对比) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"60d","group":"comprehensive","compare":"monthly"}'` |
| 339 | SoT | 10 | 看整体趋势(含季度对比) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"180d","group":"comprehensive","compare":"quarterly"}'` |
| 340 | SoT | 10 | 看整体趋势(含年度对比) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"730d","group":"comprehensive","compare":"yearly"}'` |
| 341 | SoT | 10 | 看整体趋势(含目标对比) | `calorie.view.multi-trend` | — | 0 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","compare":"target"}'` |
| 342 | SoT | 10 | 诊断体重波动原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","window":"90d"}'` |
| 343 | SoT | 10 | 诊断体重停滞(含平台期判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_plateau","window":"90d"}'` |
| 344 | SoT | 10 | 诊断体重反弹 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_rebound","window":"90d"}'` |
| 345 | SoT | 10 | 诊断体重下降原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_loss_cause","window":"90d"}'` |
| 346 | SoT | 10 | 诊断体重异常点 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_anomaly","window":"7d"}'` |
| 347 | SoT | 10 | 诊断体重vs体脂围度背离 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_divergence","window":"180d"}'` |
| 348 | SoT | 10 | 诊断饮食超标 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","window":"30d"}'` |
| 349 | SoT | 10 | 诊断饮食不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_under","window":"30d"}'` |
| 350 | SoT | 10 | 诊断营养不均衡(含均衡判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_unbalanced","window":"30d"}'` |
| 351 | SoT | 10 | 诊断饮食结构问题 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_structure","window":"30d"}'` |
| 352 | SoT | 10 | 诊断运动不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_insufficient","window":"30d"}'` |
| 353 | SoT | 10 | 诊断运动过量 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_overload","window":"30d"}'` |
| 354 | SoT | 10 | 诊断运动类型失衡 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_type_imbalance","window":"30d"}'` |
| 355 | SoT | 10 | 诊断运动效率(含有效判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_efficiency","window":"30d"}'` |
| 356 | SoT | 10 | 诊断运动建议(含类型推荐) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_advice","window":"30d"}'` |
| 357 | SoT | 10 | 为什么我没瘦 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_not_losing","window":"30d"}'` |
| 358 | SoT | 10 | 为什么我瘦太快 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_losing_fast","window":"30d"}'` |
| 359 | SoT | 10 | 我的减重速度合理吗 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"rate_reasonable","window":"30d"}'` |
| 360 | SoT | 10 | 我的减肥策略对吗 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"30d"}'` |
| 361 | SoT | 10 | 我距离目标还差什么 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"7d"}'` |
| 362 | SoT | 10 | 我这个月做得好的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_highlights","window":"30d"}'` |
| 363 | SoT | 10 | 我这个月需要改的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_improve","window":"30d"}'` |
| 364 | SoT | 10 | 综合健康评估 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"overall","window":"30d"}'` |
| 365 | SoT | 10 | 看蛋白 vs 碳水(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"7d"}'` |
| 366 | SoT | 10 | 看蛋白 vs 碳水(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"30d"}'` |
| 367 | SoT | 10 | 看蛋白 vs 碳水(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"90d"}'` |
| 368 | SoT | 10 | 看蛋白 vs 碳水(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 369 | SoT | 10 | 看蛋白 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"30d"}'` |
| 370 | SoT | 10 | 看蛋白 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"90d"}'` |
| 371 | SoT | 10 | 看蛋白 vs 脂肪(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 372 | SoT | 10 | 看碳水 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"30d"}'` |
| 373 | SoT | 10 | 看碳水 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"90d"}'` |
| 374 | SoT | 10 | 看碳水 vs 脂肪(自定义) | `calorie.view.combined` | <开始日期>／<结束日期> | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 375 | SoT | 10 | 看钠糖纤维趋势 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 376 | SoT | 10 | 看钠糖纤维综合 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 377 | SoT | 10 | 看三大营养交叉(最近 30 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"30d"}'` |
| 378 | SoT | 10 | 看三大营养交叉(最近 90 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"90d"}'` |
| 379 | SoT | 10 | 看三大营养交叉(自定义) | `calorie.view.diet-review` | <开始日期>／<结束日期> | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 380 | SoT | 10 | 预测体重(1 周后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 381 | SoT | 10 | 预测体重(1 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":30,"window":"14d"}'` |
| 382 | SoT | 10 | 预测体重(3 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":90,"window":"14d"}'` |
| 383 | SoT | 10 | 预测体重(6 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":180,"window":"14d"}'` |
| 384 | SoT | 10 | 预测体重(自定义时间) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":60,"window":"14d"}'` |
| 385 | SoT | 10 | 预测体重(自定义目标) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"target":65,"window":"14d"}'` |
| 386 | SoT | 10 | 模拟减重(每天-300卡) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"cut_kcal":300,"window":"14d"}'` |
| 387 | SoT | 10 | 模拟减重(每天-500卡) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"cut_kcal":500,"window":"14d"}'` |
| 388 | SoT | 10 | 模拟减重(每天-700卡) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"cut_kcal":700,"window":"14d"}'` |
| 389 | SoT | 10 | 模拟减重(30天减Xkg) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"target_loss":2,"days_target":30,"window":"14d"}'` |
| 390 | SoT | 10 | 模拟减重(60天减Xkg) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"target_loss":4,"days_target":60,"window":"14d"}'` |
| 391 | SoT | 10 | 模拟减重(90天减Xkg) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"target_loss":6,"days_target":90,"window":"14d"}'` |
| 392 | SoT | 10 | 模拟减重(自定义天数减Xkg) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"target_loss":3,"days_target":45,"window":"14d"}'` |
| 393 | SoT | 10 | 摄入预测(按当前速率 1 周) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_forecast","horizonDays":7,"window":"14d"}'` |
| 394 | SoT | 10 | 摄入预测(按当前速率 1 月) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_forecast","horizonDays":30,"window":"14d"}'` |
| 395 | SoT | 10 | 摄入预测(按当前速率 3 月) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_forecast","horizonDays":90,"window":"14d"}'` |
| 396 | SoT | 10 | 摄入预测(自定义) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_forecast","horizonDays":60,"window":"14d"}'` |
| 397 | SoT | 10 | 摄入预测(营养目标达成预测) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_goal","window":"30d"}'` |
| 398 | SoT | 10 | 摄入预测(卡路里缺口预测) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_deficit","window":"30d"}'` |
| 399 | SoT | 10 | 摄入预测(摄入稳定性预测) | `calorie.view.predict` | — | 4 | — | `calorie-cmd-read calorie.view.predict --params '{"kind":"calorie_stability","window":"30d"}'` |
| 400 | SoT | 10 | 看每日 6 因素综合 | `calorie.view.six-factors` | — | 0 | calorie.view.six-factors | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 401 | SoT | 10 | 今日复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 402 | SoT | 10 | 复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 403 | SoT | 10 | 复盘日期范围 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 404 | SoT | 10 | 本周复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本周"}'` |
| 405 | SoT | 10 | 本年复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今年"}'` |
| 406 | SoT | 10 | 本月复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本月"}'` |
| 407 | SoT | 10 | 查低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"7d"}'` |
| 408 | SoT | 10 | 查健康报告 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"7d"}'` |
| 409 | SoT | 10 | 查卡路里数据 | `calorie.view.lint-health` | — | 0 | calorie.view.lint-health | `calorie-cmd-read calorie.view.lint-health` |
| 410 | SoT | 10 | 查热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 411 | SoT | 10 | 查热量趋势 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 412 | SoT | 10 | 查营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 413 | SoT | 10 | 查运动分布 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 414 | SoT | 10 | 查运动贡献 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"window":"7d"}'` |
| 415 | SoT | 10 | 查频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"7d"}'` |
| 416 | SoT | 10 | 查食物排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"topN":10,"window":"7d"}'` |
| 417 | SoT | 10 | 查高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"window":"7d"}'` |
| 418 | SoT | 10 | 查高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"7d"}'` |
| 419 | SoT | 10 | 查高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"7d"}'` |
| 420 | 新拟 | 09 | 存身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 421 | 新拟 | 09 | 移除身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 422 | 新拟 | 09 | 设置照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 423 | 新拟 | 02 | 看今日饮食记录 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| 424 | 新拟 | 06 | 看目标配置 | `calorie.view.goal-config` | — | 0 | calorie.view.goal-config | `calorie-cmd-read calorie.view.goal-config` |
| 425 | 新拟 | 06 | 看目标状态 | `calorie.view.goal-status` | — | 0 | calorie.view.goal-status | `calorie-cmd-read calorie.view.goal-status` |
| 426 | 新拟 | 10 | 看组合分析 | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 427 | 新拟 | 10 | 看热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 428 | 新拟 | 02 | 看饮食复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` |
| 429 | 新拟 | 10 | 看健康盘 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"window":"今日"}'` |
| 430 | 新拟 | 02 | 查高热量排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"window":"7d"}'` |
| 431 | 新拟 | 02 | 查食品库 | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library` |
| 432 | 新拟 | 02 | 搜食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 433 | 新拟 | 09 | 看身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 434 | 新拟 | 09 | 查身材照详情 | `calorie.photo.detail` | — | 0 | calorie.photo.detail | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 435 | 新拟 | 09 | 对比身材照 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 436 | 新拟 | 09 | 做身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 437 | 新拟 | 09 | 看身材照HELP | `calorie.help.center` | — | 0 | calorie.help.center | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 438 | 新拟 | 10 | 查唤醒词 | `calorie.help.lookup` | — | 0 | calorie.help.lookup | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 439 | 新拟 | 10 | 查热量历史 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 440 | 新拟 | 03 | 看体重历史 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history` |
| 441 | 新拟 | 03 | 看体重对比 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"7d","compareWindow":"prev"}'` |
| 442 | 新拟 | 03 | 看体重复核 | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review` |
| 443 | 新拟 | 03 | 看波动分析 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility` |
| 444 | 新拟 | 08 | 看体成分 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 445 | 新拟 | 08 | 看围度记录 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 446 | 新拟 | 05 | 看训练计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 447 | 新拟 | 05 | 看构建向导 | `calorie.view.plan-wizard` | <开始日期> | 0 | calorie.view.plan-wizard | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 448 | 新拟 | 04 | 看运动目标 | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal` |
| 449 | 新拟 | 10 | 看体重预测 | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 450 | 新拟 | 10 | 看异常诊断 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","window":"7d"}'` |
| 451 | 新拟 | 05 | 看禁忌扫描 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 452 | 新拟 | 02 | 看去重报告 | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 453 | 新拟 | 07 | 看档案视图 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 454 | 新拟 | 04 | 看力量总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 455 | 新拟 | 04 | 看有氧总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 456 | 新拟 | 04 | 看运动分类占比 | `calorie.view.exercise-distribution` | — | 0 | calorie.view.exercise-distribution | `calorie-cmd-read calorie.view.exercise-distribution --params '{"window":"7d"}'` |
| 457 | 新拟 | 04 | 看运动复盘 | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"7d"}'` |
| 458 | 新拟 | 05 | 看训练计划复盘 | `calorie.view.exercise-review` | <开始日期>／<结束日期> | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` |
| 459 | 新拟 | 04 | 看运动消耗趋势 | `calorie.view.exercise-trend` | — | 0 | calorie.view.exercise-trend | `calorie-cmd-read calorie.view.exercise-trend --params '{"window":"7d"}'` |
| 460 | 新拟 | 02 | 查营养配比 | `calorie.view.nutrition-ratio` | — | 0 | calorie.view.nutrition-ratio | `calorie-cmd-read calorie.view.nutrition-ratio --params '{"window":"7d"}'` |
| 461 | 新拟 | 02 | 看营养素明细 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 462 | 新拟 | 02 | 看食品来源分布 | `calorie.view.source-stats` | — | 0 | calorie.view.source-stats | `calorie-cmd-read calorie.view.source-stats` |
| 463 | 新拟 | 02 | 看今日饮水 | `calorie.view.today-water` | — | 0 | calorie.view.today-water | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 464 | 新拟 | 02 | 看批量导入预览 | `calorie.view.batch-import-preview` | <日期> | 0 | calorie.view.batch-import-preview | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` |
| 465 | 新拟 | 10 | 看热量趋势 | `calorie.view.calorie-trend` | — | 0 | calorie.view.calorie-trend | `calorie-cmd-read calorie.view.calorie-trend --params '{"window":"7d"}'` |
| 466 | 新拟 | 10 | 查数据健康 | `calorie.view.lint-health` | — | 0 | calorie.view.lint-health | `calorie-cmd-read calorie.view.lint-health` |
| 467 | 新拟 | 10 | 看整体趋势 | `calorie.view.long-trend` | — | 0 | calorie.view.long-trend | `calorie-cmd-read calorie.view.long-trend --params '{"group":"weight_calorie","window":"30d"}'` |
| 468 | 新拟 | 02 | 看营养分析 | `calorie.view.nutrition-analysis` | — | 0 | calorie.view.nutrition-analysis | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 469 | 新拟 | 05 | 看落地训练进度 | `calorie.view.process-progress` | — | 0 | calorie.view.process-progress | `calorie-cmd-read calorie.view.process-progress` |
| 470 | 新拟 | 10 | 看复盘报告 | `calorie.view.review-template` | — | 0 | calorie.view.review-template | `calorie-cmd-read calorie.view.review-template --params '{"window":"7d"}'` |
| 471 | 新拟 | 02 | 看每日六因素 | `calorie.view.six-factors` | — | 0 | calorie.view.six-factors | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 472 | 新拟 | 08 | 看围度向导 | `calorie.view.measure-wizard` | — | 0 | calorie.view.measure-wizard | `calorie-cmd-read calorie.view.measure-wizard` |
| 473 | 新拟 | 08 | 看体脂向导 | `calorie.view.composition-wizard` | — | 0 | calorie.view.composition-wizard | `calorie-cmd-read calorie.view.composition-wizard` |
| 474 | 新拟 | 09 | 看身材照向导 | `calorie.view.photo-log-wizard` | — | 0 | calorie.view.photo-log-wizard | `calorie-cmd-read calorie.view.photo-log-wizard` |
| 475 | 新拟 | 09 | 看GIF规划器 | `calorie.view.gif-planner` | — | 0 | calorie.view.gif-planner | `calorie-cmd-read calorie.view.gif-planner --params '{"tag":"正面"}'` |
| 476 | 新拟 | 07 | 看档案预检 | `calorie.view.profile-wizard` | — | 0 | calorie.view.profile-wizard | `calorie-cmd-read calorie.view.profile-wizard` |
| 477 | 新拟 | 06 | 看目标预检 | `calorie.view.goal-wizard` | — | 0 | calorie.view.goal-wizard | `calorie-cmd-read calorie.view.goal-wizard` |
| 478 | 新拟 | 05 | 确认定训练计划 | `calorie.workout.plan-set` | — | 0 | calorie.workout.plan-set | `calorie-cmd-read calorie.workout.plan-set --params '{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}'` |
| 479 | 新拟 | 05 | 确认复制训练计划 | `calorie.workout.plan-copy` | — | 0 | calorie.workout.plan-copy | `calorie-cmd-read calorie.workout.plan-copy --params '{"newTitle":"示例副本"}'` |
| 480 | 新拟 | 05 | 确认定一周计划 | `calorie.workout.plan-set-week` | — | 0 | calorie.workout.plan-set-week | `calorie-cmd-read calorie.workout.plan-set-week --params '{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}'` |
| 481 | 新拟 | 05 | 确认加训练动作 | `calorie.workout.plan-add-movement` | — | 0 | calorie.workout.plan-add-movement | `calorie-cmd-read calorie.workout.plan-add-movement --params '{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}'` |
| 482 | 新拟 | 05 | 确认定休息日 | `calorie.workout.plan-set-rest` | — | 0 | calorie.workout.plan-set-rest | `calorie-cmd-read calorie.workout.plan-set-rest --params '{"week":1,"dayOfWeek":3}'` |
| 483 | 新拟 | 05 | 确认改训练计划 | `calorie.workout.plan-update` | — | 0 | calorie.workout.plan-update | `calorie-cmd-read calorie.workout.plan-update --params '{"title":"示例改名"}'` |
| 484 | 新拟 | 05 | 确认改某天训练 | `calorie.workout.plan-update-day` | — | 0 | calorie.workout.plan-update-day | `calorie-cmd-read calorie.workout.plan-update-day --params '{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}'` |
| 485 | 新拟 | 05 | 确认删某天训练 | `calorie.workout.plan-delete-day` | — | 0 | calorie.workout.plan-delete-day | `calorie-cmd-read calorie.workout.plan-delete-day --params '{"week":1,"dayOfWeek":3}'` |
| 486 | 新拟 | 05 | 确认改动作 | `calorie.workout.plan-update-movement` | — | 0 | calorie.workout.plan-update-movement | `calorie-cmd-read calorie.workout.plan-update-movement --params '{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}'` |
| 487 | 新拟 | 05 | 确认撤销训练计划 | `calorie.workout.plan-delete` | — | 0 | calorie.workout.plan-delete | `calorie-cmd-read calorie.workout.plan-delete --params '{"confirm":true}'` |
| 488 | 新拟 | 09 | 选身材照 | `calorie.view.photo-picker` | — | 0 | calorie.view.photo-picker | `calorie-cmd-read calorie.view.photo-picker` |
| 489 | 修复 | 06 | 看目标推荐 | `calorie.view.goal-recommend` | — | 0 | calorie.view.goal-recommend | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |

## 2. 占位符替换

| 占位符 | 替换为 | 命中记录数 | 说明 |
|---|---|---|---|
| `<照片路径>` | 临时真实文件（系统 tmp 下 .jpg） | 4 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<开始日期>` | 临时真实文件（系统 tmp 下 .jpg） | 30 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<结束日期>` | 临时真实文件（系统 tmp 下 .jpg） | 28 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<对比开始日期>` | 临时真实文件（系统 tmp 下 .jpg） | 1 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<对比结束日期>` | 临时真实文件（系统 tmp 下 .jpg） | 1 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |
| `<日期>` | 临时真实文件（系统 tmp 下 .jpg） | 25 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |

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
| `calorie.product.import` | 2 | 否 |
| `calorie.product.update` | 2 | 否 |
| `calorie.profile.activity` | 2 | 否 |
| `calorie.profile.set` | 2 | 否 |
| `calorie.profile.update` | 2 | 否 |
| `calorie.today` | 0 | 是 |
| `calorie.view.anomaly` | 2 | 否 |
| `calorie.view.batch-import-preview` | 2 | 否 |
| `calorie.view.body-composition` | 0 | 是 |
| `calorie.view.body-composition-compare` | 2 | 否 |
| `calorie.view.body-measure` | 0 | 是 |
| `calorie.view.body-measure-compare` | 2 | 否 |
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
| `calorie.view.exercise-records` | 0 | 是 |
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
| `calorie.view.multi-trend` | 0 | 是 |
| `calorie.view.nutrition-analysis` | 0 | 是 |
| `calorie.view.nutrition-detail` | 0 | 是 |
| `calorie.view.nutrition-ratio` | 0 | 是 |
| `calorie.view.photo-log-wizard` | 0 | 是 |
| `calorie.view.photo-picker` | 0 | 是 |
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
| `calorie.workout.plan-delete` | 2 | 否 |
| `calorie.workout.plan-delete-day` | 2 | 否 |
| `calorie.workout.plan-set` | 2 | 否 |
| `calorie.workout.plan-set-rest` | 2 | 否 |
| `calorie.workout.plan-set-week` | 2 | 否 |
| `calorie.workout.plan-update` | 2 | 否 |
| `calorie.workout.plan-update-day` | 2 | 否 |
| `calorie.workout.plan-update-movement` | 2 | 否 |

## 4. 结论

**非零 14 条**（应转 non-exec 并写理由）：
- 看有备注的饮食记录 (calorie.today) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：无饮食记录（2026-09-07，有备注）
- 看「有备注」的饮食记录 (calorie.today) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：无饮食记录（2026-09-07，有备注）
- 看「有备注」的体重记录 (calorie.view.weight-history) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：本窗无带备注的体重记录
- 对比体重：减重 5kg 那天 vs 今天 (calorie.view.weight-compare) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：未达成减重 5kg 里程碑(当前距历史最高已减 4.4kg)
- 对比体重：减重 10kg 那天 vs 今天 (calorie.view.weight-compare) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：未达成减重 10kg 里程碑(当前距历史最高已减 4.4kg)
- 看里程碑回溯 (calorie.view.weight-review) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：尚未达成任何减重里程碑
- 看运动记录（有备注） (calorie.view.exercise-records) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：本窗无带备注的运动记录：2026-09-01 ~ 2026-09-07
- 摄入预测(按当前速率 1 周) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 14 天。
- 摄入预测(按当前速率 1 月) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 14 天。
- 摄入预测(按当前速率 3 月) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 14 天。
- 摄入预测(自定义) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 14 天。
- 摄入预测(营养目标达成预测) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 30 天。
- 摄入预测(卡路里缺口预测) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入+运动记录,当前只有 30 天。
- 摄入预测(摄入稳定性预测) (calorie.view.predict) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：数据不足:需要 ≥14 天摄入记录,当前只有 30 天。

> 降级词（转 non-exec）与同 key 承接入口的逐条对照见 `docs/research/t81-route-evidence.md` §2.2。
