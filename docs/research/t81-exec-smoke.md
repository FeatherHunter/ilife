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
| exec 桶记录数 | 382 |
| 原样实跑 exit 0（envelope key 一致） | 377 |
| 占位符替换后 exit 0 | 4 |
| **非零（失败）** | 1 |
| 涉及键数 | 87 |
| 无参裸跑非零的键（＝需要参数） | 41 |
| └ 其中 exec 记录数（结构性断言覆盖面） | 106 |

## 1. 逐条实跑（每条一个全新种子库）

| # | 来源 | 场景 | 唤醒词 | key | 占位符 | exit | envelope key | cli |
|---|---|---|---|---|---|---|---|---|
| 1 | SoT | 01 | 看今日主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 2 | SoT | 01 | 看今日饮食概览 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 3 | SoT | 01 | 看今日运动概览 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-07"}'` |
| 4 | SoT | 01 | 看今日体重概览 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight` |
| 5 | SoT | 01 | 看今日目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 6 | SoT | 01 | 看本周主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07","windowDays":7}'` |
| 7 | SoT | 01 | 看本月主页 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07","windowDays":30}'` |
| 8 | SoT | 01 | 看连续记录天数 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 9 | SoT | 01 | 看今日热量预算 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 10 | SoT | 02 | 记一餐 | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` |
| 11 | SoT | 02 | 记一餐（含备注） | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"加了辣酱"}'` |
| 12 | SoT | 02 | 补记饮食 | `calorie.diet.add` | — | 0 | calorie.diet.add | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"date":"2026-09-06","time":"12:30:00"}'` |
| 13 | SoT | 02 | 批量补记饮食 | `calorie.diet.batch` | — | 0 | calorie.diet.batch | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"2026-09-06"}]}'` |
| 14 | SoT | 02 | 记喝水 | `calorie.water.log` | — | 0 | calorie.water.log | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 15 | SoT | 02 | 复制昨日饮食 | `calorie.diet.copy` | — | 0 | calorie.diet.copy | `calorie-cmd-read calorie.diet.copy --params '{"from":"2026-09-06"}'` |
| 16 | SoT | 02 | 改饮食记录 | `calorie.diet.update` | — | 0 | calorie.diet.update | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 17 | SoT | 02 | 改某日饮食 | `calorie.diet.update-by-date` | — | 0 | calorie.diet.update-by-date | `calorie-cmd-read calorie.diet.update-by-date --params '{"date":"2026-09-06","note":"食堂"}'` |
| 18 | SoT | 02 | 删饮食记录 | `calorie.diet.remove` | — | 0 | calorie.diet.remove | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 19 | SoT | 02 | 删一餐 | `calorie.diet.remove-by-type` | — | 0 | calorie.diet.remove-by-type | `calorie-cmd-read calorie.diet.remove-by-type --params '{"date":"2026-09-06","mealType":"早餐"}'` |
| 20 | SoT | 02 | 删某日饮食 | `calorie.diet.remove-by-date` | — | 0 | calorie.diet.remove-by-date | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"2026-09-06"}'` |
| 21 | SoT | 02 | 批量删饮食 | `calorie.diet.remove-by-range` | — | 0 | calorie.diet.remove-by-range | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"2026-09-01","end":"2026-09-02"}'` |
| 22 | SoT | 02 | 看今日饮食 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| 23 | SoT | 02 | 看昨日饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-06","end":"2026-09-06"}'` |
| 24 | SoT | 02 | 看本周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 25 | SoT | 02 | 看上周饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| 26 | SoT | 02 | 看本月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 27 | SoT | 02 | 看上月饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| 28 | SoT | 02 | 看最近 7 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 29 | SoT | 02 | 看最近 30 天饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 30 | SoT | 02 | 看某段时间饮食 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 31 | SoT | 02 | 看今日喝水 | `calorie.view.home` | — | 0 | calorie.view.home | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 32 | SoT | 02 | 查食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 33 | SoT | 02 | 查食品（按分类） | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| 34 | SoT | 02 | 存食品 | `calorie.product.add` | — | 0 | calorie.product.add | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| 35 | SoT | 02 | 改食品 | `calorie.product.update` | — | 0 | calorie.product.update | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 36 | SoT | 02 | 下架食品 | `calorie.product.deprecate` | — | 0 | calorie.product.deprecate | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| 37 | SoT | 02 | 看食品库（去重） | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 38 | SoT | 02 | 看食品来源统计 | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| 39 | SoT | 02 | 看营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 40 | SoT | 02 | 看今日营养 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 41 | SoT | 02 | 看饮食总览 | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 42 | SoT | 02 | 看营养素深度 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 43 | SoT | 02 | 看高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 44 | SoT | 02 | 看低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 45 | SoT | 02 | 看频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 46 | SoT | 02 | 看高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 47 | SoT | 02 | 看高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 48 | SoT | 02 | 看全部排行榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 49 | SoT | 02 | 看高热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| 50 | SoT | 02 | 看高热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 51 | SoT | 02 | 看高热量榜（自定义） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 52 | SoT | 02 | 看低热量榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| 53 | SoT | 02 | 看低热量榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 54 | SoT | 02 | 看低热量榜（自定义） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 55 | SoT | 02 | 看频繁吃榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| 56 | SoT | 02 | 看频繁吃榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 57 | SoT | 02 | 看频繁吃榜（自定义） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 58 | SoT | 02 | 看高碳水榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| 59 | SoT | 02 | 看高碳水榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 60 | SoT | 02 | 看高碳水榜（自定义） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 61 | SoT | 02 | 看高蛋白榜（最近 30 天） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| 62 | SoT | 02 | 看高蛋白榜（本月） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 63 | SoT | 02 | 看高蛋白榜（自定义） | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 64 | SoT | 02 | 饮食复盘（本周） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 65 | SoT | 02 | 饮食复盘（本月） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 66 | SoT | 02 | 饮食复盘（最近 90 天） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 67 | SoT | 02 | 饮食复盘（今年） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| 68 | SoT | 02 | 饮食复盘（自定义时间） | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 69 | SoT | 02 | 看早餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 70 | SoT | 02 | 看午餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 71 | SoT | 02 | 看晚餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 72 | SoT | 02 | 看加餐（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 73 | SoT | 02 | 看全部餐别分布（最近 7 天） | `calorie.view.diet` | — | 0 | calorie.view.diet | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 74 | SoT | 03 | 记体重 | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 75 | SoT | 03 | 记体重（含备注） | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"note":"晨起空腹"}'` |
| 76 | SoT | 03 | 补录体重 | `calorie.weight.log` | — | 0 | calorie.weight.log | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"date":"2026-09-06"}'` |
| 77 | SoT | 03 | 批量补录体重 | `calorie.weight.batch` | — | 0 | calorie.weight.batch | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"2026-09-06","kg":70.5}]}'` |
| 78 | SoT | 03 | 看今日体重 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 79 | SoT | 03 | 改体重记录 | `calorie.weight.update` | — | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| 80 | SoT | 03 | 改某日体重 | `calorie.weight.update` | — | 0 | calorie.weight.update | `calorie-cmd-read calorie.weight.update --params '{"date":"2026-09-06","kg":70.2}'` |
| 81 | SoT | 03 | 删体重记录 | `calorie.weight.remove` | — | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 82 | SoT | 03 | 删某日体重 | `calorie.weight.remove` | — | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"date":"2026-09-06"}'` |
| 83 | SoT | 03 | 批量删体重 | `calorie.weight.remove` | — | 0 | calorie.weight.remove | `calorie-cmd-read calorie.weight.remove --params '{"start":"2026-09-01","end":"2026-09-02"}'` |
| 84 | SoT | 03 | 看本周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 85 | SoT | 03 | 看上周体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| 86 | SoT | 03 | 看本月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 87 | SoT | 03 | 看上月体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| 88 | SoT | 03 | 看最近 7 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 89 | SoT | 03 | 看最近 90 天体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 90 | SoT | 03 | 看某段时间体重 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 91 | SoT | 03 | 看体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 92 | SoT | 03 | 看本月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 93 | SoT | 03 | 看上月体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| 94 | SoT | 03 | 看最近 90 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 95 | SoT | 03 | 看最近 180 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| 96 | SoT | 03 | 看最近 365 天体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| 97 | SoT | 03 | 看某段时间体重曲线 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 98 | SoT | 03 | 看体重稳不稳（增强版） | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 99 | SoT | 03 | 看本月波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 100 | SoT | 03 | 看最近 90 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 101 | SoT | 03 | 看最近 180 天波动 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| 102 | SoT | 03 | 看波动异常点 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 103 | SoT | 03 | 对比体重：最近 30 天 vs 之前 30 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-09","end":"2026-09-07","compareStart":"2026-07-10","compareEnd":"2026-08-08"}'` |
| 104 | SoT | 03 | 对比体重：自定义两段时间 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` |
| 105 | SoT | 03 | 对比体重：本周 vs 上周 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-08-31","compareEnd":"2026-09-06"}'` |
| 106 | SoT | 03 | 对比体重：本月 vs 上月 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` |
| 107 | SoT | 03 | 对比体重：近 N 天 vs 上一个 N 天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-25","compareEnd":"2026-08-31"}'` |
| 108 | SoT | 03 | 对比体重：今天 vs 一年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2025-09-07","compareEnd":"2025-09-07"}'` |
| 109 | SoT | 03 | 对比体重：今天 vs 半年前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-03-07","compareEnd":"2026-03-07"}'` |
| 110 | SoT | 03 | 对比体重：今天 vs 三月前今天 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-06-07","compareEnd":"2026-06-07"}'` |
| 111 | SoT | 03 | 对比体重：当前 vs 目标体重 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 112 | SoT | 03 | 对比体重：工作日 vs 周末 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-31","end":"2026-09-04","compareStart":"2026-09-05","compareEnd":"2026-09-07"}'` |
| 113 | SoT | 03 | 看体重总览 | `calorie.view.weight` | — | 0 | calorie.view.weight | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 114 | SoT | 04 | 记运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| 115 | SoT | 04 | 记运动（含备注） | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}'` |
| 116 | SoT | 04 | 记力量训练 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}'` |
| 117 | SoT | 04 | 记有氧运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}'` |
| 118 | SoT | 04 | 记日常活动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}'` |
| 119 | SoT | 04 | 补记运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}'` |
| 120 | SoT | 04 | 批量补记运动 | `calorie.exercise.add` | — | 0 | calorie.exercise.add | `calorie-cmd-read calorie.exercise.add --params '{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}]}'` |
| 121 | SoT | 04 | 复制昨日运动 | `calorie.exercise.add` | — | 4 | — | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'` |
| 122 | SoT | 04 | 改运动记录 | `calorie.exercise.update` | — | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| 123 | SoT | 04 | 改某日运动 | `calorie.exercise.update` | — | 0 | calorie.exercise.update | `calorie-cmd-read calorie.exercise.update --params '{"date":"2026-09-06","note":"补记"}'` |
| 124 | SoT | 04 | 删运动记录 | `calorie.exercise.remove` | — | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| 125 | SoT | 04 | 删某日运动 | `calorie.exercise.remove` | — | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"date":"2026-09-06"}'` |
| 126 | SoT | 04 | 批量删运动 | `calorie.exercise.remove` | — | 0 | calorie.exercise.remove | `calorie-cmd-read calorie.exercise.remove --params '{"from":"2026-09-01","to":"2026-09-02"}'` |
| 127 | SoT | 04 | 看今日运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 128 | SoT | 04 | 看昨日运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-06"}'` |
| 129 | SoT | 04 | 看本周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 130 | SoT | 04 | 看上周运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| 131 | SoT | 04 | 看本月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 132 | SoT | 04 | 看上月运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| 133 | SoT | 04 | 看最近 7 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 134 | SoT | 04 | 看最近 30 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 135 | SoT | 04 | 看某段时间运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 136 | SoT | 04 | 看今日运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 137 | SoT | 04 | 看本周运动（vs 目标） | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 138 | SoT | 04 | 看运动记录（按力量筛选） | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 139 | SoT | 04 | 看运动记录（按有氧筛选） | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 140 | SoT | 04 | 看最近 60 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-07-10","end":"2026-09-07"}'` |
| 141 | SoT | 04 | 看最近 180 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| 142 | SoT | 04 | 看最近 365 天运动 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| 143 | SoT | 04 | 看运动类型分布 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 144 | SoT | 04 | 看力量训练总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 145 | SoT | 04 | 看有氧训练总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 146 | SoT | 04 | 看运动趋势 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 147 | SoT | 04 | 运动复盘（本周） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 148 | SoT | 04 | 运动复盘（本月） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 149 | SoT | 04 | 运动复盘（最近 90 天） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 150 | SoT | 04 | 运动复盘（今年） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| 151 | SoT | 04 | 运动复盘（自定义时间） | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 152 | SoT | 05 | 看计划概览 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 153 | SoT | 05 | 看完整计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 154 | SoT | 05 | 计划复盘（本周） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 155 | SoT | 05 | 计划复盘（本月） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 156 | SoT | 05 | 计划复盘（全部） | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-08-31","end":"2026-09-07"}'` |
| 157 | SoT | 05 | 看计划完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 158 | SoT | 05 | 看未完成训练 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 159 | SoT | 05 | 看动作完成率 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 160 | SoT | 05 | 扫禁忌 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 161 | SoT | 06 | 定营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}'` |
| 162 | SoT | 06 | 定体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| 163 | SoT | 06 | 定体重目标(自动算截止) | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"2026-12-31"}'` |
| 164 | SoT | 06 | 定体重目标(含起始日) | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"2026-12-31","startKg":72,"startDate":"2026-09-01"}'` |
| 165 | SoT | 06 | 定饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| 166 | SoT | 06 | 看今日目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 167 | SoT | 06 | 看本周目标 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 168 | SoT | 06 | 看营养目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 169 | SoT | 06 | 看体重目标进度 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 170 | SoT | 06 | 看饮水目标进度 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 171 | SoT | 06 | 看目标对比实际 | `calorie.view.goal-vs-actual` | — | 0 | calorie.view.goal-vs-actual | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 172 | SoT | 06 | 看目标完成度 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 173 | SoT | 06 | 看即将到期的目标 | `calorie.view.goal-expiring` | — | 0 | calorie.view.goal-expiring | `calorie-cmd-read calorie.view.goal-expiring` |
| 174 | SoT | 06 | 看目标完成率(按周) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 175 | SoT | 06 | 看目标完成率(按月) | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 176 | SoT | 06 | 改营养目标 | `calorie.goal.set` | — | 0 | calorie.goal.set | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| 177 | SoT | 06 | 改体重目标 | `calorie.goal.weight` | — | 0 | calorie.goal.weight | `calorie-cmd-read calorie.goal.weight --params '{"kg":67.5}'` |
| 178 | SoT | 06 | 改饮水目标 | `calorie.goal.water` | — | 0 | calorie.goal.water | `calorie-cmd-read calorie.goal.water --params '{"water":2200}'` |
| 179 | SoT | 06 | 暂停所有目标 | `calorie.goal.pause` | — | 0 | calorie.goal.pause | `calorie-cmd-read calorie.goal.pause` |
| 180 | SoT | 06 | 重启所有目标 | `calorie.goal.resume` | — | 0 | calorie.goal.resume | `calorie-cmd-read calorie.goal.resume` |
| 181 | SoT | 06 | 看目标历史完成 | `calorie.view.goal` | — | 0 | calorie.view.goal | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 182 | SoT | 06 | 看目标预测达成 | `calorie.view.goal-predict` | — | 0 | calorie.view.goal-predict | `calorie-cmd-read calorie.view.goal-predict --params '{"start":"2026-08-25","end":"2026-09-07"}'` |
| 183 | SoT | 07 | 设置档案 | `calorie.profile.set` | — | 0 | calorie.profile.set | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}'` |
| 184 | SoT | 07 | 设活动量 | `calorie.profile.activity` | — | 0 | calorie.profile.activity | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 185 | SoT | 07 | 改档案 | `calorie.profile.update` | — | 0 | calorie.profile.update | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 186 | SoT | 07 | 查档案 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 187 | SoT | 08 | 记体脂（皮褶钳） | `calorie.body.composition-add` | — | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","bodyFatPct":18.5,"date":"2026-09-06","caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10}'` |
| 188 | SoT | 08 | 记体脂（外部测量） | `calorie.body.composition-add` | — | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5,"date":"2026-09-06"}'` |
| 189 | SoT | 08 | 记围度 | `calorie.body.measure-add` | — | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85,"hipCm":95}'` |
| 190 | SoT | 08 | 补记体脂 | `calorie.body.composition-add` | — | 0 | calorie.body.composition-add | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":19,"date":"2026-09-01"}'` |
| 191 | SoT | 08 | 补记围度 | `calorie.body.measure-add` | — | 0 | calorie.body.measure-add | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":86,"date":"2026-09-01"}'` |
| 192 | SoT | 08 | 看体脂 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 193 | SoT | 08 | 看体脂趋势 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition --params '{"days":90}'` |
| 194 | SoT | 08 | 看围度 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 195 | SoT | 08 | 看围度趋势 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure --params '{"days":90}'` |
| 196 | SoT | 08 | 删体脂 | `calorie.body.composition-remove` | — | 0 | calorie.body.composition-remove | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| 197 | SoT | 08 | 删围度 | `calorie.body.measure-remove` | — | 0 | calorie.body.measure-remove | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| 198 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 199 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 200 | SoT | 09 | 记身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 201 | SoT | 09 | 查身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 202 | SoT | 09 | 对比两张照片 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 203 | SoT | 09 | 生成身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 204 | SoT | 09 | 删身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 205 | SoT | 09 | 改照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"set","tag":"晨起"}'` |
| 206 | SoT | 09 | 加照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 207 | SoT | 09 | 删照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"remove","tag":"晨起"}'` |
| 208 | SoT | 10 | 看体重 vs 摄入(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 209 | SoT | 10 | 看体重 vs 摄入(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"15d"}'` |
| 210 | SoT | 10 | 看体重 vs 摄入(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"30d"}'` |
| 211 | SoT | 10 | 看体重 vs 摄入(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"60d"}'` |
| 212 | SoT | 10 | 看体重 vs 摄入(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"90d"}'` |
| 213 | SoT | 10 | 看体重 vs 摄入(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"180d"}'` |
| 214 | SoT | 10 | 看体重 vs 摄入(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"365d"}'` |
| 215 | SoT | 10 | 看体重 vs 摄入(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"week_cur"}'` |
| 216 | SoT | 10 | 看体重 vs 摄入(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"month_cur"}'` |
| 217 | SoT | 10 | 看体重 vs 摄入(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 218 | SoT | 10 | 看体重 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"7d"}'` |
| 219 | SoT | 10 | 看体重 vs 运动(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"15d"}'` |
| 220 | SoT | 10 | 看体重 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"30d"}'` |
| 221 | SoT | 10 | 看体重 vs 运动(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"60d"}'` |
| 222 | SoT | 10 | 看体重 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"90d"}'` |
| 223 | SoT | 10 | 看体重 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"180d"}'` |
| 224 | SoT | 10 | 看体重 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"365d"}'` |
| 225 | SoT | 10 | 看体重 vs 运动(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"week_cur"}'` |
| 226 | SoT | 10 | 看体重 vs 运动(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"month_cur"}'` |
| 227 | SoT | 10 | 看体重 vs 运动(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 228 | SoT | 10 | 看体重 vs 蛋白(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"7d"}'` |
| 229 | SoT | 10 | 看体重 vs 蛋白(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"15d"}'` |
| 230 | SoT | 10 | 看体重 vs 蛋白(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"30d"}'` |
| 231 | SoT | 10 | 看体重 vs 蛋白(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"60d"}'` |
| 232 | SoT | 10 | 看体重 vs 蛋白(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"90d"}'` |
| 233 | SoT | 10 | 看体重 vs 蛋白(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"180d"}'` |
| 234 | SoT | 10 | 看体重 vs 蛋白(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"365d"}'` |
| 235 | SoT | 10 | 看体重 vs 蛋白(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"week_cur"}'` |
| 236 | SoT | 10 | 看体重 vs 蛋白(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"month_cur"}'` |
| 237 | SoT | 10 | 看体重 vs 蛋白(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 238 | SoT | 10 | 看体重 vs 缺口(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` |
| 239 | SoT | 10 | 看体重 vs 缺口(最近 15 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"15d"}'` |
| 240 | SoT | 10 | 看体重 vs 缺口(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"30d"}'` |
| 241 | SoT | 10 | 看体重 vs 缺口(最近 60 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"60d"}'` |
| 242 | SoT | 10 | 看体重 vs 缺口(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"90d"}'` |
| 243 | SoT | 10 | 看体重 vs 缺口(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"180d"}'` |
| 244 | SoT | 10 | 看体重 vs 缺口(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"365d"}'` |
| 245 | SoT | 10 | 看体重 vs 缺口(本周) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"week_cur"}'` |
| 246 | SoT | 10 | 看体重 vs 缺口(本月) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"month_cur"}'` |
| 247 | SoT | 10 | 看体重 vs 缺口(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 248 | SoT | 10 | 看摄入 vs 运动(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"7d"}'` |
| 249 | SoT | 10 | 看摄入 vs 运动(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"30d"}'` |
| 250 | SoT | 10 | 看摄入 vs 运动(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"90d"}'` |
| 251 | SoT | 10 | 看摄入 vs 运动(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"180d"}'` |
| 252 | SoT | 10 | 看摄入 vs 运动(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"365d"}'` |
| 253 | SoT | 10 | 看摄入 vs 运动(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 254 | SoT | 10 | 看体重 vs 体脂(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"7d"}'` |
| 255 | SoT | 10 | 看体重 vs 体脂(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"30d"}'` |
| 256 | SoT | 10 | 看体重 vs 体脂(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"90d"}'` |
| 257 | SoT | 10 | 看体重 vs 体脂(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"180d"}'` |
| 258 | SoT | 10 | 看体重 vs 体脂(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"365d"}'` |
| 259 | SoT | 10 | 看体重 vs 体脂(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 260 | SoT | 10 | 看体重 vs 围度(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"7d"}'` |
| 261 | SoT | 10 | 看体重 vs 围度(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"30d"}'` |
| 262 | SoT | 10 | 看体重 vs 围度(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"90d"}'` |
| 263 | SoT | 10 | 看体重 vs 围度(最近 180 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"180d"}'` |
| 264 | SoT | 10 | 看体重 vs 围度(最近 365 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"365d"}'` |
| 265 | SoT | 10 | 看体重 vs 围度(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 266 | SoT | 10 | 看饮水 vs 体重(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"30d"}'` |
| 267 | SoT | 10 | 看饮水 vs 体重(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 268 | SoT | 10 | 看健康报告(本周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 269 | SoT | 10 | 看健康报告(上周) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| 270 | SoT | 10 | 看健康报告(最近 7 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 271 | SoT | 10 | 看健康报告(最近 30 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 272 | SoT | 10 | 看健康报告(最近 90 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 273 | SoT | 10 | 看健康报告(最近 180 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| 274 | SoT | 10 | 看健康报告(最近 365 天) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| 275 | SoT | 10 | 看健康报告(本月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 276 | SoT | 10 | 看健康报告(上月) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| 277 | SoT | 10 | 看健康报告(今年) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| 278 | SoT | 10 | 看健康报告(自定义) | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 279 | SoT | 10 | 诊断体重波动原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","start":"2026-06-10","end":"2026-09-07"}'` |
| 280 | SoT | 10 | 诊断体重停滞(含平台期判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_plateau","start":"2026-06-10","end":"2026-09-07"}'` |
| 281 | SoT | 10 | 诊断体重反弹 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_rebound","start":"2026-06-10","end":"2026-09-07"}'` |
| 282 | SoT | 10 | 诊断体重下降原因 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_loss_cause","start":"2026-06-10","end":"2026-09-07"}'` |
| 283 | SoT | 10 | 诊断体重异常点 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_anomaly","start":"2026-09-01","end":"2026-09-07"}'` |
| 284 | SoT | 10 | 诊断体重vs体脂围度背离 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_divergence","start":"2026-03-12","end":"2026-09-07"}'` |
| 285 | SoT | 10 | 诊断饮食超标 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","start":"2026-08-09","end":"2026-09-07"}'` |
| 286 | SoT | 10 | 诊断饮食不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_under","start":"2026-08-09","end":"2026-09-07"}'` |
| 287 | SoT | 10 | 诊断营养不均衡(含均衡判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_unbalanced","start":"2026-08-09","end":"2026-09-07"}'` |
| 288 | SoT | 10 | 诊断饮食结构问题 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_structure","start":"2026-08-09","end":"2026-09-07"}'` |
| 289 | SoT | 10 | 诊断运动不足 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_insufficient","start":"2026-08-09","end":"2026-09-07"}'` |
| 290 | SoT | 10 | 诊断运动过量 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_overload","start":"2026-08-09","end":"2026-09-07"}'` |
| 291 | SoT | 10 | 诊断运动类型失衡 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_type_imbalance","start":"2026-08-09","end":"2026-09-07"}'` |
| 292 | SoT | 10 | 诊断运动效率(含有效判断) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_efficiency","start":"2026-08-09","end":"2026-09-07"}'` |
| 293 | SoT | 10 | 诊断运动建议(含类型推荐) | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_advice","start":"2026-08-09","end":"2026-09-07"}'` |
| 294 | SoT | 10 | 为什么我没瘦 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_not_losing","start":"2026-08-09","end":"2026-09-07"}'` |
| 295 | SoT | 10 | 为什么我瘦太快 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_losing_fast","start":"2026-08-09","end":"2026-09-07"}'` |
| 296 | SoT | 10 | 我的减重速度合理吗 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"rate_reasonable","start":"2026-08-09","end":"2026-09-07"}'` |
| 297 | SoT | 10 | 我的减肥策略对吗 | `calorie.view.goal-progress` | — | 0 | calorie.view.goal-progress | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 298 | SoT | 10 | 我距离目标还差什么 | `calorie.view.goal-weight` | — | 0 | calorie.view.goal-weight | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 299 | SoT | 10 | 我这个月做得好的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_highlights","start":"2026-08-09","end":"2026-09-07"}'` |
| 300 | SoT | 10 | 我这个月需要改的 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_improve","start":"2026-08-09","end":"2026-09-07"}'` |
| 301 | SoT | 10 | 综合健康评估 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"overall","start":"2026-08-09","end":"2026-09-07"}'` |
| 302 | SoT | 10 | 看蛋白 vs 碳水(最近 7 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"7d"}'` |
| 303 | SoT | 10 | 看蛋白 vs 碳水(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"30d"}'` |
| 304 | SoT | 10 | 看蛋白 vs 碳水(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"90d"}'` |
| 305 | SoT | 10 | 看蛋白 vs 碳水(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 306 | SoT | 10 | 看蛋白 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"30d"}'` |
| 307 | SoT | 10 | 看蛋白 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"90d"}'` |
| 308 | SoT | 10 | 看蛋白 vs 脂肪(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 309 | SoT | 10 | 看碳水 vs 脂肪(最近 30 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"30d"}'` |
| 310 | SoT | 10 | 看碳水 vs 脂肪(最近 90 天) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"90d"}'` |
| 311 | SoT | 10 | 看碳水 vs 脂肪(自定义) | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| 312 | SoT | 10 | 看三大营养交叉(最近 30 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| 313 | SoT | 10 | 看三大营养交叉(最近 90 天) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| 314 | SoT | 10 | 看三大营养交叉(自定义) | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 315 | SoT | 10 | 预测体重(1 周后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}'` |
| 316 | SoT | 10 | 预测体重(1 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":30}'` |
| 317 | SoT | 10 | 预测体重(3 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":90}'` |
| 318 | SoT | 10 | 预测体重(6 月后) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":180}'` |
| 319 | SoT | 10 | 预测体重(自定义时间) | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":60}'` |
| 320 | SoT | 10 | 今日复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 321 | SoT | 10 | 复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 322 | SoT | 10 | 复盘日期范围 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 323 | SoT | 10 | 本周复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 324 | SoT | 10 | 本年复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| 325 | SoT | 10 | 本月复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 326 | SoT | 10 | 查低热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 327 | SoT | 10 | 查健康报告 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 328 | SoT | 10 | 查热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 329 | SoT | 10 | 查热量趋势 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 330 | SoT | 10 | 查营养结构 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 331 | SoT | 10 | 查运动分布 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 332 | SoT | 10 | 查运动贡献 | `calorie.view.exercise` | — | 0 | calorie.view.exercise | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 333 | SoT | 10 | 查频繁吃榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 334 | SoT | 10 | 查食物排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 335 | SoT | 10 | 查高热量榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 336 | SoT | 10 | 查高碳水榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 337 | SoT | 10 | 查高蛋白榜 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 338 | 新拟 | 09 | 存身材照 | `calorie.photo.add` | <照片路径> | 0 | calorie.photo.add | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 339 | 新拟 | 09 | 移除身材照 | `calorie.photo.remove` | — | 0 | calorie.photo.remove | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 340 | 新拟 | 09 | 设置照片标签 | `calorie.photo.tag` | — | 0 | calorie.photo.tag | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 341 | 新拟 | 02 | 看今日饮食记录 | `calorie.today` | — | 0 | calorie.today | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| 342 | 新拟 | 06 | 看目标配置 | `calorie.view.goal-config` | — | 0 | calorie.view.goal-config | `calorie-cmd-read calorie.view.goal-config` |
| 343 | 新拟 | 06 | 看目标状态 | `calorie.view.goal-status` | — | 0 | calorie.view.goal-status | `calorie-cmd-read calorie.view.goal-status` |
| 344 | 新拟 | 10 | 看组合分析 | `calorie.view.combined` | — | 0 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 345 | 新拟 | 10 | 看热量缺口 | `calorie.view.deficit` | — | 0 | calorie.view.deficit | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 346 | 新拟 | 02 | 看饮食复盘 | `calorie.view.diet-review` | — | 0 | calorie.view.diet-review | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 347 | 新拟 | 10 | 看健康盘 | `calorie.view.health` | — | 0 | calorie.view.health | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 348 | 新拟 | 02 | 查高热量排行 | `calorie.view.ranking` | — | 0 | calorie.view.ranking | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 349 | 新拟 | 02 | 查食品库 | `calorie.view.library` | — | 0 | calorie.view.library | `calorie-cmd-read calorie.view.library` |
| 350 | 新拟 | 02 | 搜食品 | `calorie.view.search` | — | 0 | calorie.view.search | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 351 | 新拟 | 09 | 看身材照 | `calorie.photo.list` | — | 0 | calorie.photo.list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 352 | 新拟 | 09 | 查身材照详情 | `calorie.photo.detail` | — | 0 | calorie.photo.detail | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 353 | 新拟 | 09 | 对比身材照 | `calorie.photo.compare` | — | 0 | calorie.photo.compare | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 354 | 新拟 | 09 | 做身材照GIF | `calorie.photo.gif` | — | 0 | calorie.photo.gif | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 355 | 新拟 | 09 | 看身材照HELP | `calorie.help.center` | — | 0 | calorie.help.center | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 356 | 新拟 | 10 | 查唤醒词 | `calorie.help.lookup` | — | 0 | calorie.help.lookup | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 357 | 新拟 | 10 | 查热量历史 | `calorie.history` | — | 0 | calorie.history | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 358 | 新拟 | 03 | 看体重历史 | `calorie.view.weight-history` | — | 0 | calorie.view.weight-history | `calorie-cmd-read calorie.view.weight-history` |
| 359 | 新拟 | 03 | 看体重对比 | `calorie.view.weight-compare` | — | 0 | calorie.view.weight-compare | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-23","compareEnd":"2026-08-29"}'` |
| 360 | 新拟 | 03 | 看体重复核 | `calorie.view.weight-review` | — | 0 | calorie.view.weight-review | `calorie-cmd-read calorie.view.weight-review` |
| 361 | 新拟 | 03 | 看波动分析 | `calorie.view.volatility` | — | 0 | calorie.view.volatility | `calorie-cmd-read calorie.view.volatility` |
| 362 | 新拟 | 08 | 看体成分 | `calorie.view.body-composition` | — | 0 | calorie.view.body-composition | `calorie-cmd-read calorie.view.body-composition` |
| 363 | 新拟 | 08 | 看围度记录 | `calorie.view.body-measure` | — | 0 | calorie.view.body-measure | `calorie-cmd-read calorie.view.body-measure` |
| 364 | 新拟 | 05 | 看训练计划 | `calorie.view.plan` | — | 0 | calorie.view.plan | `calorie-cmd-read calorie.view.plan` |
| 365 | 新拟 | 05 | 看构建向导 | `calorie.view.plan-wizard` | — | 0 | calorie.view.plan-wizard | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 366 | 新拟 | 04 | 看运动目标 | `calorie.view.exercise-goal` | — | 0 | calorie.view.exercise-goal | `calorie-cmd-read calorie.view.exercise-goal` |
| 367 | 新拟 | 10 | 看体重预测 | `calorie.view.predict` | — | 0 | calorie.view.predict | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}'` |
| 368 | 新拟 | 10 | 看异常诊断 | `calorie.view.anomaly` | — | 0 | calorie.view.anomaly | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","start":"2026-09-01","end":"2026-09-07"}'` |
| 369 | 新拟 | 05 | 看禁忌扫描 | `calorie.view.contraindication` | — | 0 | calorie.view.contraindication | `calorie-cmd-read calorie.view.contraindication` |
| 370 | 新拟 | 02 | 看去重报告 | `calorie.view.dedupe` | — | 0 | calorie.view.dedupe | `calorie-cmd-read calorie.view.dedupe` |
| 371 | 新拟 | 07 | 看档案视图 | `calorie.view.profile` | — | 0 | calorie.view.profile | `calorie-cmd-read calorie.view.profile` |
| 372 | 新拟 | 04 | 看力量总览 | `calorie.view.exercise-strength` | — | 0 | calorie.view.exercise-strength | `calorie-cmd-read calorie.view.exercise-strength --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 373 | 新拟 | 04 | 看有氧总览 | `calorie.view.exercise-cardio` | — | 0 | calorie.view.exercise-cardio | `calorie-cmd-read calorie.view.exercise-cardio --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 374 | 新拟 | 04 | 看运动分类占比 | `calorie.view.exercise-distribution` | — | 0 | calorie.view.exercise-distribution | `calorie-cmd-read calorie.view.exercise-distribution --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 375 | 新拟 | 04 | 看运动复盘 | `calorie.view.exercise-recap` | — | 0 | calorie.view.exercise-recap | `calorie-cmd-read calorie.view.exercise-recap --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 376 | 新拟 | 05 | 看训练计划复盘 | `calorie.view.exercise-review` | — | 0 | calorie.view.exercise-review | `calorie-cmd-read calorie.view.exercise-review --params '{"start":"2026-08-31","end":"2026-09-07"}'` |
| 377 | 新拟 | 04 | 看运动消耗趋势 | `calorie.view.exercise-trend` | — | 0 | calorie.view.exercise-trend | `calorie-cmd-read calorie.view.exercise-trend --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 378 | 新拟 | 02 | 查营养配比 | `calorie.view.nutrition-ratio` | — | 0 | calorie.view.nutrition-ratio | `calorie-cmd-read calorie.view.nutrition-ratio --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 379 | 新拟 | 02 | 看营养素明细 | `calorie.view.nutrition-detail` | — | 0 | calorie.view.nutrition-detail | `calorie-cmd-read calorie.view.nutrition-detail --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 380 | 新拟 | 02 | 看食品来源分布 | `calorie.view.source-stats` | — | 0 | calorie.view.source-stats | `calorie-cmd-read calorie.view.source-stats` |
| 381 | 新拟 | 02 | 看今日饮水 | `calorie.view.today-water` | — | 0 | calorie.view.today-water | `calorie-cmd-read calorie.view.today-water --params '{"date":"2026-09-07"}'` |
| 382 | 修复 | 06 | 看目标推荐 | `calorie.view.goal-recommend` | — | 0 | calorie.view.goal-recommend | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |

## 2. 占位符替换

| 占位符 | 替换为 | 命中记录数 | 说明 |
|---|---|---|---|
| `<照片路径>` | 临时真实文件（系统 tmp 下 .jpg） | 4 | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（`<图片>`／`<昨天>`）。 |

## 3. 无参可跑性（每键一次裸跑：`calorie-cmd-read <key>`，无 --params）

| key | 裸跑 exit | 无参可跑 |
|---|---|---|
| `calorie.body.composition-add` | 2 | 否 |
| `calorie.body.composition-remove` | 2 | 否 |
| `calorie.body.measure-add` | 2 | 否 |
| `calorie.body.measure-remove` | 2 | 否 |
| `calorie.diet.add` | 2 | 否 |
| `calorie.diet.batch` | 2 | 否 |
| `calorie.diet.copy` | 4 | 否 |
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
| `calorie.view.body-composition` | 0 | 是 |
| `calorie.view.body-measure` | 0 | 是 |
| `calorie.view.combined` | 0 | 是 |
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
| `calorie.view.goal` | 0 | 是 |
| `calorie.view.goal-config` | 0 | 是 |
| `calorie.view.goal-expiring` | 0 | 是 |
| `calorie.view.goal-predict` | 0 | 是 |
| `calorie.view.goal-progress` | 0 | 是 |
| `calorie.view.goal-recommend` | 0 | 是 |
| `calorie.view.goal-status` | 0 | 是 |
| `calorie.view.goal-vs-actual` | 0 | 是 |
| `calorie.view.goal-weight` | 0 | 是 |
| `calorie.view.health` | 0 | 是 |
| `calorie.view.home` | 0 | 是 |
| `calorie.view.library` | 0 | 是 |
| `calorie.view.nutrition-detail` | 0 | 是 |
| `calorie.view.nutrition-ratio` | 0 | 是 |
| `calorie.view.plan` | 0 | 是 |
| `calorie.view.plan-wizard` | 2 | 否 |
| `calorie.view.predict` | 0 | 是 |
| `calorie.view.profile` | 0 | 是 |
| `calorie.view.ranking` | 0 | 是 |
| `calorie.view.search` | 2 | 否 |
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

## 4. 结论

**非零 1 条**（应转 non-exec 并写理由）：
- 复制昨日运动 (calorie.exercise.add) exit=4 envelopeKey=— :: ERR 4: 取数失败（缺失阻断）：昨日无运动记录可复制

> 降级词（转 non-exec）与同 key 承接入口的逐条对照见 `docs/research/t81-route-evidence.md` §2.2。
