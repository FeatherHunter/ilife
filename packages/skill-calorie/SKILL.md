# 卡路里（calorie）SKILL

饮食/体重/运动/身体/目标/照片/分析/复盘一期全量：13 表（终态 11 张持久表）+ 10 场景 436 唤醒词 + 取数/口径/渲染全 TS。唯一出口 `calorie-cmd-read <calorie.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'
calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'
calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'
calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'
calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'
calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'
```

## 唯一出口（T11）

- 二进制：`packages/skill-calorie/dist/cli/cmd_read.js`（bin `calorie-cmd-read`），纯 CLI 单轨，无面板/定时/外联动。
- 运维定位（C1 #43）：`skill-calorie-fetch`（`dist/fetch/cli.js`）仅运维（import/validate/dedupe/export/history/audit/catalog-verify），不承载业务读写；业务读写唯一出口仍为 `calorie-cmd-read`。
- 契约：P9 冻结 argv+JSON+exit；缺 key exit 2、未知 key exit 3、取数/缺失 exit 4、envelope/渲染/落盘 exit 5、预检 exit 1。
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；`--html` 显式落盘 utf8。
- 预检：engines>=22.13 + SKILLS_DB_PATH 必设（无默认值）；照片存在位需 CALORIE_PHOTOS_DIR，否则记 null 不断言。
- 写链（#40）：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body）同出口可执行，一律 `receipt` 形（`ok/message` + T10 `receipt` 回执）；缺参 exit 2、缺失阻断 exit 4；训练计划/训记同步与 mmx vision 两步向导无独立写键（二期，见 triggers 旧链）。

## envelope 全字段

- 版本 `0.1.0`（与 link-core/render 同值，漂移单测钉死）；形状 6 种全字段校验，缺字段即抛，不返空数组冒充正常。
- `list` 须 `items[]`（`total?`）；`detail` 须 `item{}`；`stat` 须 `metrics{number}` 全有限 number；`receipt` 须 `ok/message`；`analysis` 须非空 `summary`；`fallback` 须 `reason/degraded:true`。
- 组合键 registry 合法点式（下划线→点）：`calorie.view.home` 等读 42 键 + 写 35 键共 77 键（见下表）；内部 `VIEW_KEYS` 下划线键仅渲染层复用，不直接登记。

## 口径（T7 + 精度 + 餐别）

- 餐别窗口跟 `fetch/diet.ts MEAL_WINDOWS`（15 点=下午茶，老家旧口径作废）；加餐=下午茶+夜宵；数列唯一源 T5 `buildSeries`，不自造 SUM。
- 缺口=消耗−摄入（正=缺口），消耗=TDEE+当日运动；KCAL_PER_KG=7700；目标完成带 80%~120%。
- 数值公约 round2 入库前收敛，`-141.6550000000002` 类泄漏由 `findLeaks/assertNoLeak` 拦截；模板不再做数学（bar 0~100 钳位为纯展示裁剪）。
- 缺失阻断不返空：空库/空窗/无目标一律 `missing-data`（调用方走 fallback，不静默空页）；坏输入 `bad-input`；精度泄漏 `precision-leak`。
- 默认目标值（C7 #43）：无目标时热量 1800 卡/饮水 2000 ml，源自 `schema.ts daily_goal` 列 DEFAULT（calorie_goal DEFAULT 1800，water_goal DEFAULT 2000；蛋白 150/碳水 200/脂肪 60 同源）+ 渲染兜底（`render/diet.ts calorieGoal ?? 1800`、`render/home.ts waterGoal ?? 2000），非业务推算。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 记体脂 | calorie.body.composition-add | receipt | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5}'` |
| 删体脂 | calorie.body.composition-remove | receipt | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| 记围度 | calorie.body.measure-add | receipt | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85}'` |
| 删围度 | calorie.body.measure-remove | receipt | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| 记一餐 | calorie.diet.add | receipt | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` |
| 批量补记饮食 | calorie.diet.batch | receipt | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3}]}'` |
| 复制昨日饮食 | calorie.diet.copy | receipt | `calorie-cmd-read calorie.diet.copy --params '{"from":"2026-09-06"}'` |
| 删饮食记录 | calorie.diet.remove | receipt | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 删某日饮食 | calorie.diet.remove-by-date | receipt | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"2026-09-06"}'` |
| 批量删饮食 | calorie.diet.remove-by-range | receipt | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"2026-09-01","end":"2026-09-02"}'` |
| 删一餐 | calorie.diet.remove-by-type | receipt | `calorie-cmd-read calorie.diet.remove-by-type --params '{"date":"2026-09-06","mealType":"早餐"}'` |
| 改饮食记录 | calorie.diet.update | receipt | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 改某日饮食 | calorie.diet.update-by-date | receipt | `calorie-cmd-read calorie.diet.update-by-date --params '{"date":"2026-09-06","note":"食堂"}'` |
| 记运动 | calorie.exercise.add | receipt | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| 删运动记录 | calorie.exercise.remove | receipt | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| 改运动记录 | calorie.exercise.update | receipt | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| 暂停所有目标 | calorie.goal.pause | receipt | `calorie-cmd-read calorie.goal.pause` |
| 重启所有目标 | calorie.goal.resume | receipt | `calorie-cmd-read calorie.goal.resume` |
| 定营养目标 | calorie.goal.set | receipt | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| 定饮水目标 | calorie.goal.water | receipt | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| 定体重目标 | calorie.goal.weight | receipt | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| 记身材照 | calorie.help.center | list | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 看今日主页 | calorie.help.lookup | list | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 查热量历史 | calorie.history | list | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 记身材照 | calorie.photo.add | receipt | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 对比两张照片 | calorie.photo.compare | list | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 查身材照 | calorie.photo.detail | detail | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 做身材照GIF | calorie.photo.gif | analysis | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 看身材照 | calorie.photo.list | list | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 删身材照 | calorie.photo.remove | receipt | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 改照片标签 | calorie.photo.tag | receipt | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 存食品 | calorie.product.add | receipt | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| 下架食品 | calorie.product.deprecate | receipt | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| 改食品 | calorie.product.update | receipt | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 设活动量 | calorie.profile.activity | receipt | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 设置档案 | calorie.profile.set | receipt | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"activityLevel":"moderate"}'` |
| 改档案 | calorie.profile.update | receipt | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 看今日饮食概览 | calorie.today | list | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| calorie.view.anomaly | calorie.view.anomaly | stat | `calorie-cmd-read calorie.view.anomaly` |
| calorie.view.body-composition | calorie.view.body-composition | stat | `calorie-cmd-read calorie.view.body-composition` |
| calorie.view.body-measure | calorie.view.body-measure | stat | `calorie-cmd-read calorie.view.body-measure` |
| 看体重 vs 摄入(最近 7 天) | calorie.view.combined | stat | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| calorie.view.contraindication | calorie.view.contraindication | stat | `calorie-cmd-read calorie.view.contraindication` |
| calorie.view.dedupe | calorie.view.dedupe | stat | `calorie-cmd-read calorie.view.dedupe` |
| 看热量缺口 | calorie.view.deficit | stat | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日饮食概览 | calorie.view.diet | stat | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 今日复盘 | calorie.view.diet-review | stat | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日运动概览 | calorie.view.exercise | stat | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-07"}'` |
| calorie.view.exercise-goal | calorie.view.exercise-goal | stat | `calorie-cmd-read calorie.view.exercise-goal` |
| 看今日目标进度 | calorie.view.goal | stat | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 定营养目标 | calorie.view.goal-config | stat | `calorie-cmd-read calorie.view.goal-config` |
| calorie.view.goal-expiring | calorie.view.goal-expiring | stat | `calorie-cmd-read calorie.view.goal-expiring` |
| calorie.view.goal-predict | calorie.view.goal-predict | stat | `calorie-cmd-read calorie.view.goal-predict` |
| 看今日目标进度 | calorie.view.goal-progress | stat | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 定营养目标(自动算) | calorie.view.goal-recommend | stat | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |
| 看目标状态 | calorie.view.goal-status | stat | `calorie-cmd-read calorie.view.goal-status` |
| calorie.view.goal-vs-actual | calorie.view.goal-vs-actual | stat | `calorie-cmd-read calorie.view.goal-vs-actual` |
| 定体重目标 | calorie.view.goal-weight | stat | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| 看健康盘 | calorie.view.health | stat | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 看今日主页 | calorie.view.home | stat | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| 查食品库 | calorie.view.library | stat | `calorie-cmd-read calorie.view.library` |
| calorie.view.plan | calorie.view.plan | stat | `calorie-cmd-read calorie.view.plan` |
| calorie.view.plan-wizard | calorie.view.plan-wizard | stat | `calorie-cmd-read calorie.view.plan-wizard` |
| calorie.view.predict | calorie.view.predict | stat | `calorie-cmd-read calorie.view.predict` |
| calorie.view.profile | calorie.view.profile | stat | `calorie-cmd-read calorie.view.profile` |
| 查高热量排行 | calorie.view.ranking | stat | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 查食品 | calorie.view.search | stat | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| calorie.view.volatility | calorie.view.volatility | stat | `calorie-cmd-read calorie.view.volatility` |
| calorie.view.weight | calorie.view.weight | stat | `calorie-cmd-read calorie.view.weight` |
| calorie.view.weight-compare | calorie.view.weight-compare | stat | `calorie-cmd-read calorie.view.weight-compare` |
| calorie.view.weight-history | calorie.view.weight-history | stat | `calorie-cmd-read calorie.view.weight-history` |
| calorie.view.weight-review | calorie.view.weight-review | stat | `calorie-cmd-read calorie.view.weight-review` |
| 记喝水 | calorie.water.log | receipt | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 批量补录体重 | calorie.weight.batch | receipt | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"2026-09-06","kg":70.5}]}'` |
| 记体重 | calorie.weight.log | receipt | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 删体重记录 | calorie.weight.remove | receipt | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 改体重记录 | calorie.weight.update | receipt | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |

相关场景：calorie.body.composition-add、calorie.body.composition-remove、calorie.body.measure-add、calorie.body.measure-remove、calorie.diet.add、calorie.diet.batch、calorie.diet.copy、calorie.diet.remove、calorie.diet.remove-by-date、calorie.diet.remove-by-range、calorie.diet.remove-by-type、calorie.diet.update、calorie.diet.update-by-date、calorie.exercise.add、calorie.exercise.remove、calorie.exercise.update、calorie.goal.pause、calorie.goal.resume、calorie.goal.set、calorie.goal.water、calorie.goal.weight、calorie.help.center、calorie.help.lookup、calorie.history、calorie.photo.add、calorie.photo.compare、calorie.photo.detail、calorie.photo.gif、calorie.photo.list、calorie.photo.remove、calorie.photo.tag、calorie.product.add、calorie.product.deprecate、calorie.product.update、calorie.profile.activity、calorie.profile.set、calorie.profile.update、calorie.today、calorie.view.anomaly、calorie.view.body-composition、calorie.view.body-measure、calorie.view.combined、calorie.view.contraindication、calorie.view.dedupe、calorie.view.deficit、calorie.view.diet、calorie.view.diet-review、calorie.view.exercise、calorie.view.exercise-goal、calorie.view.goal、calorie.view.goal-config、calorie.view.goal-expiring、calorie.view.goal-predict、calorie.view.goal-progress、calorie.view.goal-recommend、calorie.view.goal-status、calorie.view.goal-vs-actual、calorie.view.goal-weight、calorie.view.health、calorie.view.home、calorie.view.library、calorie.view.plan、calorie.view.plan-wizard、calorie.view.predict、calorie.view.profile、calorie.view.ranking、calorie.view.search、calorie.view.volatility、calorie.view.weight、calorie.view.weight-compare、calorie.view.weight-history、calorie.view.weight-review、calorie.water.log、calorie.weight.batch、calorie.weight.log、calorie.weight.remove、calorie.weight.update（77 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。
身材照片 HELP 模块：skill-calorie/dist/render/photo.js（gallery/compare/viewer/gif + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。
<!-- HELP-AUTO-END -->

## HELP 现找条目（含 T10 身体照片 HELP 模块）

- 通用唤醒词现找：`calorie.help.lookup --params '{"q":"<唤醒词/分类/描述子串>"}'`（436 唤醒词全量，10 场景，空串抛，不返全表冒充命中）。
- 身材照片 HELP：`calorie.help.center`（全量 10 键，顺序跟 SCENE_09_PHOTO SoT 序）/ `--params '{"q":"记身材照"}'` 现找；每条命中自带 `exec`（node 一行式，读 SKILLS_DB_PATH 库）+`legacyCli`（老家 python 原命令备查）；模块 `skill-calorie/dist/render/photo.js`，函数须存在（单测逐条 import 断言）。
- 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64；GIF 只出任务描述不碰二进制。

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ CALORIE_PHOTOS_DIR（照片存在位校验用，缺则记 null）；真实 DB 禁迁，测试 tmp 隔离；老家只读对照。
- 出 scope（一期外）：面板（二期单 MAP）、定时任务、本技能外联动（router+作息/备忘/训记仅只读对照，不落本包）。
