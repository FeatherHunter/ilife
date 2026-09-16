---
name: skill-calorie
description: "「卡路里HELP」→calorie.help.center 出老技能同款 HELP 文件（V4 三级目录壳）；唯一出口 calorie-cmd-read。触发词：看今日主页、看今日热量预算、记一餐、拍营养表记一餐、看今日饮食、记喝水、补记饮食、复制昨日饮食、改饮食记录、删饮食记录、看本周饮食、查食品、存食品、改食品、下架食品、批量导入食品、看营养结构、看今日营养、看饮食总览、看营养素深度、看高热量榜、看低热量榜、看频繁吃榜、看高碳水榜、看高蛋白榜、饮食复盘（本周）、看全部餐别分布（最近 7 天）、记体重、补录体重、看今日体重、看体重曲线、对比体重：最近 30 天 vs 之前 30 天、体重复盘（本周）、记运动、记力量训练、记有氧运动、补记运动、看今日运动、看运动趋势、运动复盘（本周）、看计划概览、看完整计划、看某天练什么、看某动作安排、定训练计划、落地训练、同步到训记、定营养目标、定体重目标、定饮水目标、看今日目标进度、记体脂（皮褶钳）、记围度、看体脂趋势、看围度趋势、记身材照、查身材照、生成身材照GIF、对比两张照片、设置档案、改档案、查档案、查健康报告、查热量趋势、查热量缺口、复盘、开启定时复盘、本周复盘、本月复盘"
---

# 卡路里（calorie）SKILL

饮食/体重/运动/身体/目标/照片/分析/复盘一期全量：13 表（终态 11 张持久表）+ 10 场景 436 唤醒词 + 取数/口径/渲染全 TS。唯一出口 `calorie-cmd-read <calorie.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

- 用户说「**卡路里HELP**」→ 跑 `calorie-cmd-read calorie.help.center`（缺省）出**老技能同款 HELP 文件**（`卡路里_HELP_<时间戳>.html`，V4 三级目录壳）；速查台与另两态、照片 10 键见下文 HELP 节。
- **配置型写词**（记体脂／记围度／定训练计划／设置档案／设活动量／改档案类）命中，先按「Wizard Verify 铁则」分流再调会改数据库的命令。
- 唤醒词 → key 对照表见下方「联动速查」（构建期注入 99 键）。

## 快速开始

```sh
calorie-cmd-read calorie.help.center                                    # 卡路里HELP：老技能同款 HELP 文件（缺省；速查台加 --params '{"mode":"file"}'）
calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'
calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'
calorie-cmd-read calorie.view.home --params '{"date":"今日"}'
calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'
calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'
calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'
```

## 唯一出口（T11）

- 二进制：`packages/skill-calorie/dist/cli/cmd_read.js`（bin `calorie-cmd-read`），纯 CLI 单轨，无面板/定时/外联动。
- 运维定位（C1 #43）：`skill-calorie-fetch`（`dist/fetch/cli.js`）仅运维（import/validate/dedupe/export/history/audit/catalog-verify），不承载业务读写；业务读写唯一出口仍为 `calorie-cmd-read`。
- 契约：P9 冻结 argv+JSON+exit；缺 key exit 2、未知 key exit 3、取数/缺失 exit 4、envelope/渲染/落盘 exit 5、预检 exit 1。
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；HTML 默认落 `<SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`（同秒冲突自动加 `_2`/`_3`），落点回传在 envelope `data.output`（**恒绝对路径**，相对 `SKILLS_DB_PATH`／`--html` 亦按 cwd 归一后回传）；`--html <路径>` 显式覆盖任意路径（**唯一落点参数**：老技能的 `--output` 别名已按 #245 删除，给了即 exit 2，与其余五家同形）。
- 预检：engines>=22.13 + SKILLS_DB_PATH 必设（无默认值）；照片存在位需 CALORIE_PHOTOS_DIR，否则记 null 不断言。
- 写链（#40）：46 写键（diet/water/weight/exercise/photo/product/profile/goal/body/workout）同出口可执行，一律 `receipt` 形（`ok/message` + T10 `receipt` 回执）；缺参 exit 2、缺失阻断 exit 4；训记同步与 mmx vision 两步向导无独立写键（二期，见 triggers 旧链）。

## envelope 全字段

- 版本 `0.1.0`（与 link-core/render 同值，漂移单测钉死）；形状 6 种全字段校验，缺字段即抛，不返空数组冒充正常。
- `list` 须 `items[]`（`total?`）；`detail` 须 `item{}`；`stat` 须 `metrics{number}` 全有限 number；`receipt` 须 `ok/message`；`analysis` 须非空 `summary`；`fallback` 须 `reason/degraded:true`。
- 组合键 registry 合法点式（下划线→点）：`calorie.view.home` 等读 64 键 + 写 35 键共 99 键（见下表）；内部 `VIEW_KEYS` 下划线键仅渲染层复用，不直接登记。

## 口径（T7 + 精度 + 餐别）

- 餐别窗口跟 `fetch/diet.ts MEAL_WINDOWS`（15 点=下午茶，老家旧口径作废）；加餐=下午茶+夜宵；数列唯一源 T5 `buildSeries`，不自造 SUM。
- 缺口=消耗−摄入（正=缺口），消耗=TDEE+当日运动；KCAL_PER_KG=7700；目标完成带 80%~120%。
- 数值公约 round2 入库前收敛，`-141.6550000000002` 类泄漏由 `findLeaks/assertNoLeak` 拦截；模板不再做数学（bar 0~100 钳位为纯展示裁剪）。
- 缺失阻断不返空：空库/空窗/无目标一律 `missing-data`（调用方走 fallback，不静默空页）；坏输入 `bad-input`；精度泄漏 `precision-leak`。
- 默认目标值（C7 #43）：无目标时热量 1800 卡/饮水 2000 ml，源自 `schema.ts daily_goal` 列 DEFAULT（calorie_goal DEFAULT 1800，water_goal DEFAULT 2000；蛋白 150/碳水 200/脂肪 60 同源）+ 渲染兜底（`render/diet.ts calorieGoal ?? 1800`、`render/home.ts waterGoal ?? 2000），非业务推算。

## Wizard Verify 铁则（M6，v2.4.3 复刻）

配置型 wizard ＝ 写库前要用户先看一眼的配置写。这类词**按场景分流**，分流先于任何写键。

**优先级**：本节优先级最高，高于本文件下方所有操作规范与功能说明（旧版 §⚠️ 强制性规定 第 2 条）；命中配置型词先按本表分流，再谈调写键。

**前置：先问测量方式，再进表**。只说「记体脂」时**先问**是皮褶钳还是外部设备／健身房测量，答完再进表——路由层没有裸「记体脂」唤醒词，实际词见下表（`triggers/routing.ts` `WAKE_ROUTES` 场景 08 的 exec 项）。`记体脂（皮褶钳）` 须带算好的 `bodyFatPct`：`cli/write.ts` 缺 `bodyFatPct` 即 `fail(2, '缺参数 bodyFatPct（皮褶→体脂自动换算未移植，直传实测值）')`。

**词 → verify 页映射**（页面文件本体归 #86／#179，本票只定映射与前置）：

| 唤醒词 | verify 页 | 备注 |
|---|---|---|
| `记体脂（皮褶钳）`／`记体脂（外部测量）`／`补记体脂` | `body_composition_wizard.html` | 皮褶钳 7 点须先换算成 `bodyFatPct`（换算未移植，调用方算） |
| `记围度`／`补记围度` | `body_measurements_wizard.html` | 13 围度 3 分组；记录级至少 1 项 |
| `定训练计划` | `plan_builder_wizard.html` | **可写**：出计划编辑器（可写页）→ 用户改完确认 → 复制命令 → AI 调 `calorie.workout.plan-set` 落库（见下） |
| `设置档案`／`设活动量`／`改档案` | `calorie.view.profile-wizard`（页面装配在 `src/profile/setup.ts`） | 场景 07 三条写入词共用一页（改前值 ＋ 待写项 ＋ 活动量五档）；改前值取自库内现值，写入仍走 `calorie.profile.set`／`calorie.profile.activity`／`calorie.profile.update` |
| `定营养目标`／`定营养目标(自动算)`／`定体重目标`／`定体重目标(自动算截止)`／`定体重目标(含起始日)`／`定饮水目标`／`定饮水目标(自动算)`／`一键定全套目标`／`改营养目标`／`改体重目标`／`改饮水目标` | `calorie.view.goal-wizard`（页面装配在 `src/goal/precheck.ts`） | 场景 06 十一条带空位的写词共用一页（库内现值 ＋ 按档案算的推荐值与依据 ＋ 改前→改后对照）；写入仍走 5 条既有写命令；暂停所有目标／重启所有目标无空位不出页 |

| 场景 | 触发 | 行为 | CLI 落点（符号锚，可验） |
|---|---|---|---|
| 1 主动填 | 配置型词命中但**没给数据**（`记体脂` 类先问测量方式） | 出空 wizard（不传预填）→ 用户填 → 复制 prompt → AI 调写键 | 空参被拦：无围度项 → `bad-input` exit 2（`fetch/body.ts` `validateMeasurementInput` 的 `fail('围度','empty',…)` → `cli/write.ts` `dispatchWrite` 的 `ValidationError` 分支） |
| 2 预填 verify ⭐ | 同一类词**给了数据** | 出预填 wizard → 用户核对 → 复制 prompt → AI 调写键 | 预填键限白名单：非 `MEASURE_CAMEL` 字段即 `fail(2,'不支持字段: ')`（`cli/write.ts` `MEASURE_CAMEL` 白名单循环）；皮褶钳缺 `bodyFatPct` 即 `fail(2,…)`；计划类先跑 `calorie.view.plan-wizard` 纯校验（`render/planPlate.ts` `buildPlanWizardView` → `fetch/plan.ts` `validatePlan`，返 `dryRun:true`／`checkedSessions:N`（输入含 N 个会话的已检查计数；≠通过数：坏计划也计 N，通过与否看 `errorCount`，只校验不写库）） |
| 3 直接录 | 用户**明确**说「直接录」「我信你」 | 跳过 wizard，直接调写键，回 `receipt` 形 | 35 写键一律 `receipt`（`cli/write.ts` 模块头契约 ＋ `out()` 组装 `{ok,message,receipt}`） |

- **页面已落地（#86 四页 ＋ #179 档案预检页 ＋ #251 目标预检页）**：verify 页**存在**，配置型 wizard 词命中即先出页，不再走文字 verify：`calorie.view.measure-wizard`（记围度／补记围度；场景 1 空页／场景 2 预填）／`calorie.view.composition-wizard`（记体脂三词；来源＋体脂率＋皮褶钳 7 点）／`calorie.view.photo-log-wizard`（记身材照；纯配置）／`calorie.view.gif-planner`（查身材照／生成身材照GIF；照片框选＋4 数字裁剪）／`calorie.view.photo-picker`（删身材照与标签三条；候选快照）／`calorie.view.profile-wizard`（设置档案／改档案／设活动量；三条写入词共用一页，改前值取自库内现值，写入仍走三条写命令）／`calorie.view.goal-wizard`（定营养目标／定营养目标(自动算)／定体重目标／定体重目标(自动算截止)／定体重目标(含起始日)／定饮水目标／定饮水目标(自动算)／一键定全套目标／改营养目标／改体重目标／改饮水目标，共 11 条带空位的写词共用一页；页面摆库内现值／按档案算的推荐值与依据／改前→改后对照，写入仍走 5 条既有写命令。暂停所有目标／重启所有目标**无空位**，不出页）。页面＝静态 HTML ＋ `copyText`，出页后由用户复制 prompt 回给 AI，再按场景调写键。四页实跑证据见 `docs/research/t163-precheck-precedent.md` §3。
- 配置型写词在路由层落 `exec` 桶，不再是 `non-exec`（路由表里 `non-exec` 只剩 9 条，全是「明确不做」与无营养建议形态）：命中即出本表那页——「定训练计划」出的是**计划编辑器（可写页）**，路由键 `calorie.view.plan-wizard`；用户改完复制命令，AI 调写键 `calorie.workout.plan-set`（唤醒词「确认定训练计划」）落库给 `receipt`。**定训练计划的写键确实存在，这条链不缺环**：`NON_EXEC_REASONS.planWriteMissing` 在 `routes.generated.ts` 里零命中、是死常量，它那句「本仓执行层不承接计划写入」与事实相反，不得据此拒绝出页或拒绝落库。
- AUTO 块（本文件下方「联动速查」）列出的单命令写键只证明**写键可达**，**不豁免**本表的 verify 前置；分流仍按本表：有数据走场景 2，明确授权才走场景 3。
- **禁止**：用户给了数据仍跳过 verify 直接调写键（数据看起来对也不例外）——v2.4.2 → v2.4.3 的根因就是这条。正解＝按场景分流。
- **违反 = 协议 fail mode**：违反时向用户输出违规回执（逐字）：「我跳过了 M6 verify 直接写库，违反 Wizard Verify 铁则；已停止后续写入，请确认数据后重来」；不得静默补记、不得事后补 verify 掩盖；同轮修正循环 ≤ 3 次。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 预检页 | 流程 | 例 |
|---|---|---|---|---|---|
| 记体脂（皮褶钳） | calorie.body.composition-add | receipt | calorie.view.composition-wizard |  | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5}'` |
| 删体脂 | calorie.body.composition-remove | receipt |  |  | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| 记围度 | calorie.body.measure-add | receipt | calorie.view.measure-wizard |  | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85}'` |
| 删围度 | calorie.body.measure-remove | receipt |  |  | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| 记一餐 | calorie.diet.add | receipt |  |  | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` |
| 批量补记饮食 | calorie.diet.batch | receipt |  |  | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3}]}'` |
| 复制昨日饮食 | calorie.diet.copy | receipt |  |  | `calorie-cmd-read calorie.diet.copy --params '{"from":"<日期>"}'` |
| 删饮食记录 | calorie.diet.remove | receipt |  |  | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 删某日饮食 | calorie.diet.remove-by-date | receipt |  |  | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"<日期>"}'` |
| 批量删饮食 | calorie.diet.remove-by-range | receipt |  |  | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"<日期>","end":"<日期>"}'` |
| 删一餐 | calorie.diet.remove-by-type | receipt |  |  | `calorie-cmd-read calorie.diet.remove-by-type --params '{"mealType":"早餐","date":"<日期>"}'` |
| 改饮食记录 | calorie.diet.update | receipt |  |  | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 改某日饮食 | calorie.diet.update-by-date | receipt |  |  | `calorie-cmd-read calorie.diet.update-by-date --params '{"note":"食堂","date":"<日期>"}'` |
| 记运动 | calorie.exercise.add | receipt |  |  | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| 删运动记录 | calorie.exercise.remove | receipt |  |  | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| 改运动记录 | calorie.exercise.update | receipt |  |  | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| 暂停所有目标 | calorie.goal.pause | receipt |  |  | `calorie-cmd-read calorie.goal.pause` |
| 重启所有目标 | calorie.goal.resume | receipt |  |  | `calorie-cmd-read calorie.goal.resume` |
| 定营养目标 | calorie.goal.set | receipt |  |  | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| 定饮水目标 | calorie.goal.water | receipt |  |  | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| 定体重目标 | calorie.goal.weight | receipt |  |  | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| 卡路里HELP | calorie.help.center | list |  |  | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 看今日主页 | calorie.help.lookup | list |  |  | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 查热量历史 | calorie.history | list |  |  | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 记身材照 | calorie.photo.add | receipt |  |  | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 对比两张照片 | calorie.photo.compare | list |  |  | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 查身材照 | calorie.photo.detail | detail |  |  | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 生成身材照GIF | calorie.photo.gif | analysis |  |  | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 看身材照 | calorie.photo.list | list |  |  | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 删身材照 | calorie.photo.remove | receipt |  |  | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 改照片标签 | calorie.photo.tag | receipt |  |  | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 存食品 | calorie.product.add | receipt |  |  | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| 下架食品 | calorie.product.deprecate | receipt |  |  | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| 批量导入食品 | calorie.product.import | receipt |  |  | `calorie-cmd-read calorie.product.import --params '{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}]}'` |
| 改食品 | calorie.product.update | receipt |  |  | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 设活动量 | calorie.profile.activity | receipt |  |  | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 设置档案 | calorie.profile.set | receipt |  |  | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"activityLevel":"moderate"}'` |
| 改档案 | calorie.profile.update | receipt |  |  | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 看BMI报告 | calorie.report.bmi | stat |  |  | `calorie-cmd-read calorie.report.bmi --params '{"window":"90d"}'` |
| 看BMR报告 | calorie.report.bmr | stat |  |  | `calorie-cmd-read calorie.report.bmr --params '{"window":"30d"}'` |
| 看健康报告(含对比) | calorie.report.compare | stat |  |  | `calorie-cmd-read calorie.report.compare --params '{"window":"7d"}'` |
| 看蛋白质摄入报告 | calorie.report.protein | stat |  |  | `calorie-cmd-read calorie.report.protein --params '{"window":"30d"}'` |
| 看综合评分 | calorie.report.score | stat |  |  | `calorie-cmd-read calorie.report.score --params '{"window":"30d"}'` |
| 看TDEE报告 | calorie.report.tdee | stat |  |  | `calorie-cmd-read calorie.report.tdee --params '{"window":"30d"}'` |
| 看健康趋势 | calorie.report.trend | stat |  |  | `calorie-cmd-read calorie.report.trend --params '{"window":"90d"}'` |
| 看水分摄入报告 | calorie.report.water | stat |  |  | `calorie-cmd-read calorie.report.water --params '{"window":"30d"}'` |
| 看今日饮食 | calorie.today | list |  |  | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| calorie.view.anomaly | calorie.view.anomaly | stat |  |  | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","window":"90d"}'` |
| 校验批量导入 | calorie.view.batch-import-preview | stat |  |  | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` |
| 看体脂 | calorie.view.body-composition | stat |  |  | `calorie-cmd-read calorie.view.body-composition` |
| 对比体脂 | calorie.view.body-composition-compare | stat |  |  | `calorie-cmd-read calorie.view.body-composition-compare --params '{"period1Start":"<开始日期>","period1End":"<结束日期>","period2Start":"<对比开始日期>","period2End":"<对比结束日期>"}'` |
| 看围度 | calorie.view.body-measure | stat |  |  | `calorie-cmd-read calorie.view.body-measure --params '{"metric":"waist_cm"}'` |
| 对比围度 | calorie.view.body-measure-compare | stat |  |  | `calorie-cmd-read calorie.view.body-measure-compare --params '{"date1":"<开始日期>","date2":"<结束日期>"}'` |
| 看热量趋势 | calorie.view.calorie-trend | stat |  |  | `calorie-cmd-read calorie.view.calorie-trend --params '{"window":"7d"}'` |
| 看体重 vs 摄入(最近 7 天) | calorie.view.combined | stat |  |  | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| calorie.view.composition-wizard | calorie.view.composition-wizard | stat |  |  | `calorie-cmd-read calorie.view.composition-wizard` |
| calorie.view.contraindication | calorie.view.contraindication | stat |  |  | `calorie-cmd-read calorie.view.contraindication --params '{"part":"all"}'` |
| 看食品库（去重） | calorie.view.dedupe | stat |  |  | `calorie-cmd-read calorie.view.dedupe` |
| 看热量缺口 | calorie.view.deficit | stat |  |  | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 看昨日饮食 | calorie.view.diet | stat |  |  | `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'` |
| 看营养结构 | calorie.view.diet-review | stat |  |  | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 看今日运动概览 | calorie.view.exercise | stat |  |  | `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'` |
| 看有氧训练总览 | calorie.view.exercise-cardio | stat |  |  | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 看运动类型分布 | calorie.view.exercise-distribution | stat |  |  | `calorie-cmd-read calorie.view.exercise-distribution --params '{"window":"7d"}'` |
| 看今日运动（vs 目标） | calorie.view.exercise-goal | stat |  |  | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"今日"}'` |
| 运动复盘（本周） | calorie.view.exercise-recap | stat |  |  | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"7d"}'` |
| 看运动记录（有备注） | calorie.view.exercise-records | stat |  |  | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"7d"}'` |
| 计划复盘（本周） | calorie.view.exercise-review | stat |  |  | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本周"}'` |
| 看力量训练总览 | calorie.view.exercise-strength | stat |  |  | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 看运动趋势 | calorie.view.exercise-trend | stat |  |  | `calorie-cmd-read calorie.view.exercise-trend --params '{"window":"7d"}'` |
| calorie.view.gif-planner | calorie.view.gif-planner | stat |  |  | `calorie-cmd-read calorie.view.gif-planner --params '{"tag":"正面"}'` |
| 看今日目标进度 | calorie.view.goal | stat |  |  | `calorie-cmd-read calorie.view.goal --params '{"window":"7d"}'` |
| 定营养目标 | calorie.view.goal-config | stat |  |  | `calorie-cmd-read calorie.view.goal-config` |
| 看即将到期的目标 | calorie.view.goal-expiring | stat |  |  | `calorie-cmd-read calorie.view.goal-expiring` |
| 看目标预测达成 | calorie.view.goal-predict | stat |  |  | `calorie-cmd-read calorie.view.goal-predict --params '{"window":"14d"}'` |
| 看今日目标进度 | calorie.view.goal-progress | stat |  |  | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 定营养目标(自动算) | calorie.view.goal-recommend | stat |  |  | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |
| 看目标状态 | calorie.view.goal-status | stat |  |  | `calorie-cmd-read calorie.view.goal-status` |
| 看目标对比实际 | calorie.view.goal-vs-actual | stat |  |  | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"window":"30d"}'` |
| 定体重目标 | calorie.view.goal-weight | stat |  | 对比体重 | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"30d"}'` |
| 看目标预检 | calorie.view.goal-wizard | stat |  |  | `calorie-cmd-read calorie.view.goal-wizard` |
| 看健康盘 | calorie.view.health | stat |  |  | `calorie-cmd-read calorie.view.health --params '{"window":"本周"}'` |
| 看今日主页 | calorie.view.home | stat |  |  | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| calorie.view.label-precheck | calorie.view.label-precheck | stat |  |  | `calorie-cmd-read calorie.view.label-precheck --params '{"productName":"鸡胸","calories":200,"protein":35,"note":"营养表识别"}'` |
| 查食品（按分类） | calorie.view.library | stat |  |  | `calorie-cmd-read calorie.view.library` |
| 查卡路里数据 | calorie.view.lint-health | stat |  |  | `calorie-cmd-read calorie.view.lint-health` |
| 看整体趋势 | calorie.view.long-trend | stat |  |  | `calorie-cmd-read calorie.view.long-trend --params '{"group":"weight_calorie","window":"30d"}'` |
| calorie.view.measure-wizard | calorie.view.measure-wizard | stat |  |  | `calorie-cmd-read calorie.view.measure-wizard` |
| 看整体趋势(含目标对比) | calorie.view.multi-trend | stat |  |  | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","compare":"target"}'` |
| 看营养分析 | calorie.view.nutrition-analysis | stat |  |  | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 看营养素深度 | calorie.view.nutrition-detail | stat |  |  | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 查营养配比 | calorie.view.nutrition-ratio | stat |  |  | `calorie-cmd-read calorie.view.nutrition-ratio --params '{"window":"7d"}'` |
| calorie.view.photo-log-wizard | calorie.view.photo-log-wizard | stat |  |  | `calorie-cmd-read calorie.view.photo-log-wizard` |
| calorie.view.photo-picker | calorie.view.photo-picker | list |  |  | `calorie-cmd-read calorie.view.photo-picker` |
| 看计划概览 | calorie.view.plan | stat |  |  | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 看计划 vs 实际 | calorie.view.plan-vs-actual | stat |  |  | `calorie-cmd-read calorie.view.plan-vs-actual --params '{"window":"本周"}'` |
| calorie.view.plan-wizard | calorie.view.plan-wizard | stat |  |  | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| calorie.view.plan-write-preview | calorie.view.plan-write-preview | stat |  |  | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"copy"}'` |
| calorie.view.predict | calorie.view.predict | stat |  |  | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 看落地训练进度 | calorie.view.process-progress | stat |  |  | `calorie-cmd-read calorie.view.process-progress` |
| calorie.view.profile | calorie.view.profile | stat |  |  | `calorie-cmd-read calorie.view.profile` |
| 看档案预检 | calorie.view.profile-wizard | stat |  |  | `calorie-cmd-read calorie.view.profile-wizard` |
| 看高热量榜 | calorie.view.ranking | stat |  |  | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"7d"}'` |
| 看复盘报告 | calorie.view.review-template | stat |  |  | `calorie-cmd-read calorie.view.review-template --params '{"window":"7d"}'` |
| 查食品 | calorie.view.search | stat |  |  | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 看每日六因素 | calorie.view.six-factors | stat |  |  | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 看食品来源统计 | calorie.view.source-stats | stat |  |  | `calorie-cmd-read calorie.view.source-stats` |
| 看今日喝水 | calorie.view.today-water | stat |  |  | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 看体重稳不稳（增强版） | calorie.view.volatility | stat |  | 看体重稳不稳 | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 看今日体重 | calorie.view.weight | stat |  | 量体重／体重复盘 | `calorie-cmd-read calorie.view.weight` |
| 对比体重：本月 vs 上月 | calorie.view.weight-compare | stat |  | 对比体重 | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"30d","compareWindow":"prev"}'` |
| 看本周体重 | calorie.view.weight-history | stat |  | 看体重明细／看体重曲线／看体重备注 | `calorie-cmd-read calorie.view.weight-history --params '{"days":7}'` |
| 看体重复核 | calorie.view.weight-review | stat |  | 体重复盘 | `calorie-cmd-read calorie.view.weight-review` |
| 记喝水 | calorie.water.log | receipt |  |  | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 批量补录体重 | calorie.weight.batch | receipt |  | 量体重 | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"<日期>","kg":70.5}]}'` |
| 记体重 | calorie.weight.log | receipt |  | 量体重 | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 删体重记录 | calorie.weight.remove | receipt |  | 改体重记录 | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 改体重记录 | calorie.weight.update | receipt |  | 改体重记录 | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| 加训练动作 | calorie.workout.plan-add-movement | receipt |  |  | `calorie-cmd-read calorie.workout.plan-add-movement --params '{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}'` |
| 复制训练计划 | calorie.workout.plan-copy | receipt |  |  | `calorie-cmd-read calorie.workout.plan-copy --params '{"newTitle":"示例副本"}'` |
| 撤销训练计划 | calorie.workout.plan-delete | receipt |  |  | `calorie-cmd-read calorie.workout.plan-delete --params '{"confirm":true}'` |
| 删某天训练 | calorie.workout.plan-delete-day | receipt |  |  | `calorie-cmd-read calorie.workout.plan-delete-day --params '{"week":1,"dayOfWeek":3}'` |
| 定训练计划 | calorie.workout.plan-set | receipt |  |  | `calorie-cmd-read calorie.workout.plan-set --params '{"plan":{"config":{"title":"示例计划","start_date":"<日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}'` |
| 定休息日 | calorie.workout.plan-set-rest | receipt |  |  | `calorie-cmd-read calorie.workout.plan-set-rest --params '{"week":1,"dayOfWeek":3}'` |
| 定一周计划 | calorie.workout.plan-set-week | receipt |  |  | `calorie-cmd-read calorie.workout.plan-set-week --params '{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}'` |
| 改训练计划 | calorie.workout.plan-update | receipt |  |  | `calorie-cmd-read calorie.workout.plan-update --params '{"title":"示例改名"}'` |
| 改某天训练 | calorie.workout.plan-update-day | receipt |  |  | `calorie-cmd-read calorie.workout.plan-update-day --params '{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}'` |
| 改动作 | calorie.workout.plan-update-movement | receipt |  |  | `calorie-cmd-read calorie.workout.plan-update-movement --params '{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}'` |

「唤醒词」列是这条命令的代表词，三个来源逐条自述：饮食场景的命令取它自己那条词（源＝路由层，25 条）；其余取命令声明里的代表词（`gen-cli.mjs` 写 `REPR` 表，91 条）；只为页面服务、没有唤醒词的命令列命令名自身（12 条）。本生成器不另存第二份唤醒词。「预检页」列是该写命令**先出的预检确认页命令**（查询命令与「读—确认—写」那一类留空，事实出处＝`src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`）；「流程」列是它服务的工作流程名。三列的事实都住各自能力目录的声明与路由，本表由 `pnpm help:build` 生成。
体重一族 58 条唤醒词各归**一条**工作流程（八条流程的步骤与逐条对照见「场景 03 体重工作流程」一节与 `docs/skills/skill-calorie/t338-流程接线-证据.md` §3）；流程名的事实住命令声明（`src/weight/commands.ts` 与 `src/goal/commands.ts` 的 `flows`），本表由 `pnpm help:build` 生成。
上表「流程」列按**命令**列：一条命令服务多条流程时用「／」列全（`calorie.view.weight-history`＝看体重明细／看体重曲线／看体重备注），首项是「唤醒词」列那条代表词所在的流程；「唤醒词」列是这条命令的代表词，个别命令的代表词取自别的场景清单（如 `calorie.view.weight-review` 一行的「看体重复核」）。
相关场景：calorie.body.composition-add、calorie.body.composition-remove、calorie.body.measure-add、calorie.body.measure-remove、calorie.diet.add、calorie.diet.batch、calorie.diet.copy、calorie.diet.remove、calorie.diet.remove-by-date、calorie.diet.remove-by-range、calorie.diet.remove-by-type、calorie.diet.update、calorie.diet.update-by-date、calorie.exercise.add、calorie.exercise.remove、calorie.exercise.update、calorie.goal.pause、calorie.goal.resume、calorie.goal.set、calorie.goal.water、calorie.goal.weight、calorie.help.center、calorie.help.lookup、calorie.history、calorie.photo.add、calorie.photo.compare、calorie.photo.detail、calorie.photo.gif、calorie.photo.list、calorie.photo.remove、calorie.photo.tag、calorie.product.add、calorie.product.deprecate、calorie.product.import、calorie.product.update、calorie.profile.activity、calorie.profile.set、calorie.profile.update、calorie.report.bmi、calorie.report.bmr、calorie.report.compare、calorie.report.protein、calorie.report.score、calorie.report.tdee、calorie.report.trend、calorie.report.water、calorie.today、calorie.view.anomaly、calorie.view.batch-import-preview、calorie.view.body-composition、calorie.view.body-composition-compare、calorie.view.body-measure、calorie.view.body-measure-compare、calorie.view.calorie-trend、calorie.view.combined、calorie.view.composition-wizard、calorie.view.contraindication、calorie.view.dedupe、calorie.view.deficit、calorie.view.diet、calorie.view.diet-review、calorie.view.exercise、calorie.view.exercise-cardio、calorie.view.exercise-distribution、calorie.view.exercise-goal、calorie.view.exercise-recap、calorie.view.exercise-records、calorie.view.exercise-review、calorie.view.exercise-strength、calorie.view.exercise-trend、calorie.view.gif-planner、calorie.view.goal、calorie.view.goal-config、calorie.view.goal-expiring、calorie.view.goal-predict、calorie.view.goal-progress、calorie.view.goal-recommend、calorie.view.goal-status、calorie.view.goal-vs-actual、calorie.view.goal-weight、calorie.view.goal-wizard、calorie.view.health、calorie.view.home、calorie.view.label-precheck、calorie.view.library、calorie.view.lint-health、calorie.view.long-trend、calorie.view.measure-wizard、calorie.view.multi-trend、calorie.view.nutrition-analysis、calorie.view.nutrition-detail、calorie.view.nutrition-ratio、calorie.view.photo-log-wizard、calorie.view.photo-picker、calorie.view.plan、calorie.view.plan-vs-actual、calorie.view.plan-wizard、calorie.view.plan-write-preview、calorie.view.predict、calorie.view.process-progress、calorie.view.profile、calorie.view.profile-wizard、calorie.view.ranking、calorie.view.review-template、calorie.view.search、calorie.view.six-factors、calorie.view.source-stats、calorie.view.today-water、calorie.view.volatility、calorie.view.weight、calorie.view.weight-compare、calorie.view.weight-history、calorie.view.weight-review、calorie.water.log、calorie.weight.batch、calorie.weight.log、calorie.weight.remove、calorie.weight.update、calorie.workout.plan-add-movement、calorie.workout.plan-copy、calorie.workout.plan-delete、calorie.workout.plan-delete-day、calorie.workout.plan-set、calorie.workout.plan-set-rest、calorie.workout.plan-set-week、calorie.workout.plan-update、calorie.workout.plan-update-day、calorie.workout.plan-update-movement（128 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 的下划线名只供页面装配复用）。
身材照片 HELP 模块：skill-calorie/photo/photo＋skill-calorie/photo/photos（gallery/compare/viewer/gif/picker + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。

### 场景 02 饮食 · 逐条唤醒词 → 命令 → 工作流程（70 条，一行一条唤醒词）

| 唤醒词 | 命令（照抄即跑） | 工作流程 |
|---|---|---|
| 记一餐 | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 记一餐（含备注） | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"加了辣酱"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 补记饮食 | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"time":"12:30:00","date":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 批量补记饮食 | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 拍营养表记一餐 | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"营养表识别","source":"photo","entry":"precheck"}'` | 过程：先出预检确认页 → 用户确认 → 跑这条命令 |
| 拍营养表补记一餐 | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"date":"<日期>","time":"12:30:00","note":"营养表补记","source":"photo","entry":"precheck"}'` | 过程：先出预检确认页 → 用户确认 → 跑这条命令 |
| 记喝水 | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 复制昨日饮食 | `calorie-cmd-read calorie.diet.copy --params '{"from":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 改饮食记录 | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 改某日饮食 | `calorie-cmd-read calorie.diet.update-by-date --params '{"note":"食堂","date":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 删饮食记录 | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 删一餐 | `calorie-cmd-read calorie.diet.remove-by-type --params '{"mealType":"早餐","date":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 删某日饮食 | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 批量删饮食 | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"<日期>","end":"<日期>"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 看今日饮食 | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看昨日饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"昨日"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看本周饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"本周"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看上周饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"上周"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看本月饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看上月饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"上月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看最近 7 天饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看最近 30 天饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看某段时间饮食 | `calorie-cmd-read calorie.view.diet --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看今日喝水 | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日","entry":"drink"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看有备注的饮食记录 | `calorie-cmd-read calorie.today --params '{"date":"今日","hasNote":true}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 查食品 | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 查食品（按分类） | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 存食品 | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 改食品 | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 下架食品 | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` | 回执：跑这条命令 → 写后回执页落盘 |
| 看食品库（去重） | `calorie-cmd-read calorie.view.dedupe` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 批量导入食品 | `calorie-cmd-read calorie.product.import --params '{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}],"entry":"precheck"}'` | 过程：先出预检确认页 → 用户确认 → 跑这条命令 |
| 校验批量导入 | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3}],"entry":"validate"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看食品来源统计 | `calorie-cmd-read calorie.view.source-stats` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看营养结构 | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看今日营养 | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今日"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看饮食总览 | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","entry":"overview"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看营养素深度 | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高热量榜 | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看低热量榜 | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看频繁吃榜 | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高碳水榜 | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高蛋白榜 | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看全部排行榜 | `calorie-cmd-read calorie.view.ranking --params '{"topN":10,"window":"7d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高热量榜（最近 30 天） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高热量榜（本月） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高热量榜（自定义） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看低热量榜（最近 30 天） | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看低热量榜（本月） | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看低热量榜（自定义） | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看频繁吃榜（最近 30 天） | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看频繁吃榜（本月） | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看频繁吃榜（自定义） | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高碳水榜（最近 30 天） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高碳水榜（本月） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高碳水榜（自定义） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高蛋白榜（最近 30 天） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"30d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高蛋白榜（本月） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看高蛋白榜（自定义） | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","topN":10,"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 饮食复盘（本周） | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本周"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 饮食复盘（本月） | `calorie-cmd-read calorie.view.diet-review --params '{"window":"本月"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 饮食复盘（最近 90 天） | `calorie-cmd-read calorie.view.diet-review --params '{"window":"90d"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 饮食复盘（今年） | `calorie-cmd-read calorie.view.diet-review --params '{"window":"今年"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 饮食复盘（自定义时间） | `calorie-cmd-read calorie.view.diet-review --params '{"window":"custom","start":"<开始日期>","end":"<结束日期>"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看早餐（最近 7 天） | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","meal":"早餐"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看午餐（最近 7 天） | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","meal":"午餐"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看晚餐（最近 7 天） | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","meal":"晚餐"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看加餐（最近 7 天） | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","meal":"加餐"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看全部餐别分布（最近 7 天） | `calorie-cmd-read calorie.view.diet --params '{"window":"7d","meal":"all"}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |
| 看「有备注」的饮食记录 | `calorie-cmd-read calorie.today --params '{"date":"今日","hasNote":true}'` | 结果：跑这条命令 → 结果型 HTML 落盘 |

本表 70 行＝HELP 资产「饮食」组的场景条数＝冻结唤醒词表 `scene-02-diet.ts` 的条数（构建期逐词核对，差一条即停）；三类流程：结果 52 条／回执 15 条／过程 3 条。
「命令」列是该词在路由层（`src/diet/routes.ts`）记的那一条，照抄即跑；三类的步骤与交付判据见「场景 02 饮食工作流程」一节。
<!-- HELP-AUTO-END -->

## 场景 02 饮食工作流程（70 条唤醒词／三类流程）

- 逐词对照表在上方「联动速查」节末（构建期注入：一行一条唤醒词，命令照抄即跑）。三类流程共用同一套步骤与判据：
  - **结果**：用户说唤醒词 → 复制该词的 prompt → 跑表里那条命令 → 结果型 HTML 落盘，`data.output` 回绝对路径。
  - **回执**：同上，交付写后回执页；改／删类先读定位（`calorie.today`／`calorie.view.diet` 给得出记录编号），把当前内容给用户看过，再跑写命令。
  - **过程**：先出预检确认页 → 用户确认 → 跑表里那条写命令 → 写后回执页。营养表两条的读数在模型侧，先把识别结果给用户看；批量导入食品先跑 `calorie.view.batch-import-preview` 拿导入条数／跳过条数／失败明细。
- 交付判据：① HTML 落盘、`data.output` 是绝对路径；② 字节不为 0；③ 文字回复只概括结论、不超过三句话；④ 该缺数据的（窗内无记录、记录编号不存在）出可读的缺失阻断且不落盘——这一档算完成，不算缺陷。
- 权威源：唤醒词与它的类型住 HELP 资产 `src/triggers/wake-assets.ts` 的「饮食」组（与冻结唤醒词表 `src/triggers/scene-02-diet.ts` 逐词相同，构建期核对，差一条即停）；命令与参数住路由层 `src/diet/routes.ts`；那张表由 `pnpm help:build` 生成，谁都不手改。
- 三类各自的条数不在此处手写：见上方那张表的自述行（构建期按当刻数据算）。

## HELP 交付与速查台

- **「卡路里HELP」＝老技能同款 HELP 文件**（#139 起）：`calorie-cmd-read calorie.help.center` 缺省即出 `卡路里_HELP_<时间戳>.html`（老命名，V4 三级目录壳，与老技能视觉一致；落 `data.output`，约 300 KB **只落盘**、不进 envelope）。**除下面的复用窗口外别再给它加参数**——缺省就是目的地交付物。
- **反复读不再涨目录（#245）**：HELP 文件与速查台**同一主体一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；`data.output` 给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内已有一份、而你刚改过内容时，那份旧产物**不会自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。业务页面与失败回执**不吃窗口**（每跑一次仍各留一份）。
- **速查台（#88，须显式要）**：`--params '{"mode":"file"}'` 出完整 HTML 速查台（436 场景／54 子功能／10 分组，卡级复制按钮，约 1 MB，落 `卡路里_速查台_<时间戳>.html`）；`{"mode":"inline"}` 出内嵌片段／`{"mode":"text"}` 出纯文本索引；非法 `mode` 与 `q`＋`mode` 同给一律 exit 2。
- **照片 11 键走 `q`**（不是 `mode`）：`--params '{"q":"记身材照"}'` 现找、`{"q":""}` 全表，顺序跟 SCENE_09_PHOTO SoT 序；每条命中自带 `exec`（node 一行式，读 SKILLS_DB_PATH 库）+`legacyCli`（老家 python 原命令备查）；模块 `skill-calorie/photo/photo`＋`skill-calorie/photo/photos`，函数须存在（单测逐条 import 断言）。
- **通用唤醒词现找**：`calorie.help.lookup --params '{"q":"<唤醒词/分类/描述子串>"}'`（436 唤醒词全量，10 场景，空串抛，不返全表冒充命中）。
- 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64；GIF 只出任务描述不碰二进制。

## 场景 08 身体细节工作流程（13 条唤醒词／7 条写词落点）

- 工作流程（读类直出；写类先出预检确认页）：用户说唤醒词 → 复制下面对应的 prompt → AI 用该词的命令执行 → HTML 落盘，`data.output` 回绝对路径。**配置型写词（记体脂类／记围度类）先出预检确认页**，用户在页上核对后复制 prompt 回给 AI，AI 再调会改数据库的命令。
- **索引表：写词 → 预检页命令（7 条）**。「预检页命令」列一律**照抄即跑**；第 6、7 行是**页面入口行**（开预检确认页本身，不是写词），故已标明自己是入口；第 1～5 行是写词，确认之后那一步见「会改数据库的命令」列。逐词细节（另两条没有预检页的写词、13 条逐条落点）见 `workflows/08-身体细节.md`（随包安装）。

| # | 唤醒词 | 预检页命令（照抄即跑） | 会改数据库的命令 | 从哪一步走 |
|---|---|---|---|---|
| 1 | `记体脂（皮褶钳）` | `calorie-cmd-read calorie.view.composition-wizard` | `calorie.body.composition-add` | 先出页 → 填 7 点＋性别年龄 → 复制 prompt → 调写命令 |
| 2 | `记体脂（外部测量）` | `calorie-cmd-read calorie.view.composition-wizard` | `calorie.body.composition-add` | 先出页 → 填体脂率与来源 → 复制 prompt → 调写命令 |
| 3 | `补记体脂` | `calorie-cmd-read calorie.view.composition-wizard` | `calorie.body.composition-add` | 先出页 → 填日期与体脂率 → 那天已有记录先报冲突 → 调写命令 |
| 4 | `记围度` | `calorie-cmd-read calorie.view.measure-wizard` | `calorie.body.measure-add` | 先出页 → 填围度（13 项可部分填、至少 1 项）→ 复制 prompt → 调写命令 |
| 5 | `补记围度` | `calorie-cmd-read calorie.view.measure-wizard` | `calorie.body.measure-add` | 先出页 → 填日期与围度 → 那天已有记录先报冲突 → 调写命令 |
| 6 | **页面入口**`看体脂向导` | `calorie-cmd-read calorie.view.composition-wizard` | —（页本身不改库） | 直接开预检确认页；确认后跑第 1～3 行那条写命令 |
| 7 | **页面入口**`看围度向导` | `calorie-cmd-read calorie.view.measure-wizard` | —（页本身不改库） | 直接开预检确认页；确认后跑第 4～5 行那条写命令 |

- 另两条写词（`删体脂`／`删围度`）**没有预检确认页**：先读（`calorie.view.body-composition`／`calorie.view.body-measure`）定位记录 → 把内容给用户看过 → 再调 `calorie.body.composition-remove`／`calorie.body.measure-remove`。
- 权威源：命令与键住 `src/body/commands.ts`（10 条声明）；路由住 `src/body/routes.ts`；**预检页各服务哪条写命令**住 `src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`（速查表「预检页」列由它派生，不手写第二份）。
- 13 部位中文名一律引 `MEASUREMENT_ZH`（`src/fetch/body.ts`）；可见面缺值写 `—`，机器面（复制区 payload）缺项留空值——两条是**分开**的约定。

## 场景 09 身材照片常驻规则与工作流指针

- 常驻规则（老技能已核准，照做；逐词细节见包内披露文件）：
  - D2 发图与路径双模式＋文字与图片分离到达（同轮所有图片＝本次要存的照片）；
  - D3 标签必填、缺则逐张追问；
  - D4 改＝覆盖整套、加＝追加判重、删＝移除且至少保留 1 个；
  - D6 删的候选与快照（先列候选→快照确认→回执）；
  - D7 跑完必须主动把 HTML 交给用户，不只给路径（思想保留，机制按本环境＝把文件交给用户）。
- 入口词以老技能为准（8 个）：记身材照／查身材照／对比两张照片／生成身材照GIF／删身材照／改照片标签／加照片标签／删照片标签；老真名另有「存身材照」与「看身材照」。三个流程内页（预检确认页／GIF 规划页／候选页）**没有唤醒词**，不许当入口词用；HELP 那个入口是「卡路里HELP」（老技能正文注册的唤醒词）。
- 逐词工作流（10 个场景每条从哪一步往下走）：见 `workflows/09-身材照片.md`（随包安装，SKILL.md 只留本节常驻规则＋这一行指针）。

## 场景 01 主页工作流程（9 条查询命令）

- 工作流程（读类直出）：用户说唤醒词 → 复制下面对应的 prompt → AI 用命令执行 → 结果型 HTML 落盘，`data.output` 回绝对路径。本图 9 条全是查询命令，没有会改数据库的命令；写类流程的过程型 HTML 在本图是 0 条（记账，不占票）。
- 对账口径：下表 `cli` 与路由层 `main_prompt.cli`、场景数据 `data_source` 逐字相同（对账脚本 `.scratch/t373/align-9.mjs`）；`看今日体重概览` 的命令住 `src/weight/`（跨家，本图只接线不实现）。

| 唤醒词 | 命令 | 参数 | 从哪一步走（cli＝data_source＝路由 cli） |
|---|---|---|---|
| 看今日主页 | calorie.view.home | `{"date":"今日"}` | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 看今日饮食概览 | calorie.view.diet | `{"window":"今日"}` | `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'` |
| 看今日运动概览 | calorie.view.exercise | `{"window":"今日"}` | `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'` |
| 看今日体重概览 | calorie.view.weight | （无） | `calorie-cmd-read calorie.view.weight` |
| 看今日目标进度 | calorie.view.goal-progress | `{"window":"今日"}` | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 看本周主页 | calorie.view.home | `{"windowDays":7,"date":"今日"}` | `calorie-cmd-read calorie.view.home --params '{"windowDays":7,"date":"今日"}'` |
| 看本月主页 | calorie.view.home | `{"windowDays":30,"date":"今日"}` | `calorie-cmd-read calorie.view.home --params '{"windowDays":30,"date":"今日"}'` |
| 看连续记录天数 | calorie.view.home | `{"date":"今日"}` | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 看今日热量预算 | calorie.view.home | `{"date":"今日"}` | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |

### 9 条 prompt 原文（逐字同场景数据与 HELP 资产）

看今日主页：

```
请你加载技能 卡路里,执行唤醒词「看今日主页」。

我想看今天的主页 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看今日饮食概览：

```
请你加载技能 卡路里,执行唤醒词「看今日饮食概览」。

我想看今天饮食 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看今日运动概览：

```
请你加载技能 卡路里,执行唤醒词「看今日运动概览」。

我想看今天运动 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看今日体重概览：

```
请你加载技能 卡路里,执行唤醒词「看今日体重概览」。

我想看今天体重 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看今日目标进度：

```
请你加载技能 卡路里,执行唤醒词「看今日目标进度」。

我想看今天 4 项目标(热量/蛋白/饮水/运动)完成度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看本周主页：

```
请你加载技能 卡路里,执行唤醒词「看本周主页」。

我想看本周 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看本月主页：

```
请你加载技能 卡路里,执行唤醒词「看本月主页」。

我想看本月 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看连续记录天数：

```
请你加载技能 卡路里,执行唤醒词「看连续记录天数」。

我想看我的连续记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看今日热量预算：

```
请你加载技能 卡路里,执行唤醒词「看今日热量预算」。

我想看今天还能吃多少。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

## 场景 03 体重工作流程（58 条唤醒词变体／8 条流程）

- 工作流程（读类直出；写类先取数后写）：用户说唤醒词 → 复制冻结表里该词的 prompt → AI 用该词的命令执行 → HTML 落盘，`data.output` 回绝对路径。写类另起一步取数：`改体重记录`／`删体重记录` 先 `calorie.view.weight-history` 定位（id 或日期），再调写命令。
- 58 条 → 命令：生成块「联动速查」表的「流程」列按**命令**列（该键服务的流程全列出，首项是「唤醒词」列那条代表词所在的流程）；**逐条词**的归属见 `docs/skills/skill-calorie/t338-流程接线-证据.md` §3 对账表，八条流程的条数是量体重 5／改体重记录 5／看体重明细 7／看体重曲线 10／看体重稳不稳 5／看体重备注 1／对比体重 18／体重复盘 7（合 58）。
- 权威源：命令与流程名住 `src/weight/commands.ts` 的声明（`flows` 字段；跨家的 `calorie.view.goal-weight` 住 `src/goal/commands.ts`）；命令一行照抄能跑的口径与冻结表 `dist/triggers/scene-03-weight.js` 的 `main_prompt.cli`、路由层 `WAKE_ROUTES` 的场景 03 记录逐字相同；命令各条参数形状见 `src/weight/`。
- 交付判据：① 出 HTML 文件，`data.output` 是绝对路径；② 字节不为 0；③ 文字回复只概括结论、不超过三句话；④ 该缺数据的（窗口内无记录、id 不存在、不足 14 天、无体重目标）出可读缺失阻断，不落盘——这一档算完成，不算缺陷。

### 8 条流程的步骤

每组：代表唤醒词 → 命令 → 步骤 → 交付物。参数只列该组用到的形状，窗口类一条词一个取值。**本段命令一律以 `calorie-cmd-read ` 起头，下文省略该前缀（照抄时补回）**。

**1 · 量体重**（5 条：记体重／记体重（含备注）／补录体重／批量补录体重／看今日体重）

- 记体重 → `calorie.weight.log --params '{"kg":70.5}'` → 步骤：取用户报的公斤数 → 写当天一条 → 回执页；交付物：`templates/weight_log_receipt.html` 过程型回执。
- 记体重（含备注） → `calorie.weight.log --params '{"kg":70.5,"note":"晨起空腹"}'` → 步骤同前，多带一项备注；交付物同上。
- 补录体重 → `calorie.weight.log --params '{"kg":70.5,"date":"<日期>"}'` → 步骤：问清日期 → 写该日一条；交付物同上。
- 批量补录体重 → `calorie.weight.batch --params '{"items":[{"date":"<日期>","kg":70.5}]}'` → 步骤：问清每条日期与公斤数 → 一次写多条；交付物同上。
- 看今日体重 → `calorie.view.weight --params '{"window":"今日"}'` → 步骤：只读当天窗口 → 体重盘；交付物：结果型页面（首末＋均值＋趋势＋目标差距）。

**2 · 改体重记录**（5 条：改体重记录／改某日体重／删体重记录／删某日体重／批量删体重）

- 改体重记录 → `calorie.weight.update --params '{"id":1,"kg":70.2}'` → 步骤：先 `calorie.view.weight-history` 取 id → 再改该条的公斤数或备注；交付物：`weight_log_receipt.html` 回执（含改前 → 改后）。
- 改某日体重 → `calorie.weight.update --params '{"kg":70.2,"date":"<日期>"}'` → 步骤同上，按日期定位；交付物同上。
- 删体重记录 → `calorie.weight.remove --params '{"id":1}'` → 步骤：先取 id → 说明硬删不可恢复 → 用户确认后删该条；交付物：回执（含删前快照）。冻结表的命令串不带 `confirm`；要一道显式确认就在写命令前问一句。
- 删某日体重 → `calorie.weight.remove --params '{"date":"<日期>"}'` → 步骤同上，按日期定位；交付物同上。
- 批量删体重 → `calorie.weight.remove --params '{"start":"<开始日期>","end":"<结束日期>"}'` → 步骤：问清起止 → **先 `calorie.view.weight-history` 列区间内全部记录** → 用户确认后 `start`／`end` 各给一个日期删；交付物：回执逐行列删前取值。

**3 · 看体重明细**（7 条：看本周体重／看上周体重／看本月体重／看上月体重／看最近 7 天体重／看最近 90 天体重／看某段时间体重）

- 看本周体重 → `calorie.view.weight-history --params '{"window":"本周"}'` → 步骤：读该窗口明细 → 表格列出逐条记录；交付物：结果型页面（`window` 取本周／上周／本月／上月／`7d`／`90d`；`看某段时间体重` 给 `{"window":"custom","start":"<开始日期>","end":"<结束日期>"}`，起止都要）。

**4 · 看体重曲线**（10 条：看体重曲线＋带目标／带里程碑／带异常点，及本月／上月／90 天／180 天／365 天／某段时间六条变体）

- 看体重曲线 → `calorie.view.weight-history --params '{"window":"30d"}'` → 步骤：读该窗口 → 出折线；交付物：曲线页（加重量用 `overlay`：`target` 目标线／`milestone` 里程碑／`anomaly` 异常点；月窗给 `{"window":"本月"}`／`{"window":"上月"}`，天数窗给 `{"window":"90d"}` 这类，自定义给 `start`＋`end`）。

**5 · 看体重稳不稳**（5 条：看体重稳不稳（增强版）／看本月波动／看最近 90 天波动／看最近 180 天波动／看波动异常点）

- 看体重稳不稳（增强版） → `calorie.view.volatility --params '{"window":"7d"}'` → 步骤：读该窗口算波动；交付物：波动页（`看波动异常点` 走同一条命令，页面标出异常点；窗口取 `7d`／`本月`／`90d`／`180d`）。

**6 · 看体重备注**（1 条：看「有备注」的体重记录）

- 看「有备注」的体重记录 → `calorie.view.weight-history --params '{"window":"30d","noteOnly":true}'` → 步骤：读该窗口、只留带备注的记录；交付物：明细页（带筛选徽章）。

**7 · 对比体重**（18 条：片段对比 11 条＋场景对比 6 条＋当前 vs 目标体重 1 条）

- 对比体重：本月 vs 上月 → `calorie.view.weight-compare --params '{"window":"本月","compareWindow":"上月"}'` → 步骤：两段窗口各取数 → 出对比；交付物：对比页（片段对比的重量用 `window`＋`compareWindow`：本周 vs 上周／30 天 vs 之前 30 天／工作日 vs 周末／自定义两段给 4 个起止日期／今天 vs 一年前今天这类给 `compareOffset`；场景对比重量用 `{"scenario":"…"}`：`b8` 平台期首日／`e1` 历史最低／`e2` 历史最高／`e5` 入夏最低／`e6` 入冬最低／`c5` 运动多少两个月，减重那天给 `{"scenario":"e3","delta":5}` 这类）。
- 对比体重：当前 vs 目标体重 → `calorie.view.goal-weight --params '{"window":"30d"}'` → 步骤：读窗口＋读体重目标 → 出差距；交付物：对比页（命令住 `src/goal/`，本组接线不实现）。

**8 · 体重复盘**（7 条：看体重总览／体重复盘（本周）／（本月）／（最近 90 天）／（今年）／（自定义时间）／看里程碑回溯）

- 看体重总览 → `calorie.view.weight --params '{"window":"30d"}'` → 步骤：读 30 天窗口出总览；交付物：体重盘页面（同「量体重」那一页，窗口取 30 天）。
- 体重复盘（本周） → `calorie.view.weight-review --params '{"window":"本周"}'` → 步骤：读该窗口出复盘；交付物：复盘页（窗口取本周／本月／`90d`／今年／自定义给 `start`＋`end`）。
- 看里程碑回溯 → `calorie.view.weight-review --params '{"mode":"milestones"}'` → 步骤：读全史里程碑；交付物：里程碑页。

## 场景 06 目标管理常驻规则与工作流指针

- 常驻规则（照做；逐词细节见包外披露真源）：
  - 写类 11 条带空位先出预检页 `calorie.view.goal-wizard`（`wake`＝本词；自动算与一键类加 `profile`），用户在页上核对后复制 prompt 回给 AI，AI 再调会改数据库的命令；写入仍走 5 条既有写命令，不新增组合写命令。
  - 暂停所有目标／重启所有目标无空位不出页，直接调写命令，回执带恢复入口提示。
  - 读类 15 条直接跑读命令出结果页；`看体重目标进度` 查词取 `wake_word` 逐字相等那条（子串搜首命中是邻词，取第二条）。
  - 交付判据：HTML 落盘、`data.output` 是绝对路径、字节不为 0、文字只概括结论不超过三句话、该缺数据的出可读缺失阻断且不落盘。
- 逐词工作流（28 条每条从哪一步往下走）：见 `docs/skills/skill-calorie/06-目标管理-工作流程.md`（真源；SKILL.md 只留本节常驻规则＋这一行指针）。

## 场景 10 分析（拆 A）工作流程（88 条查询命令）

- 工作流程（读类直出）：用户说唤醒词 → 复制冻结表里该词的 prompt → AI 用对应的命令执行 → 结果型 HTML 落盘，`data.output` 回绝对路径。本图 88 条全是查询命令，没有会改数据库的命令；写类流程的过程型 HTML 在本图是 0 条（沿 #171 §6 结论：分析命令全是查询命令，冻结表 prompt 无“先确认”写法，记账不开票）。
- 权威出处（本节不存第二份清单，数字以脚本输出为准）：A-list 定义见 `docs/skills/skill-calorie/t171-边界与基线.md` §1（两指标配对 71＋多指标整体趋势 15＋趋势对照 2）；每条词的 prompt 与命令以 `src/triggers/scene-10-analysis.ts`（85 条旧词：`main_prompt.cli`＝`data_source`）与 `src/triggers/routes.generated.ts`（3 条新词）为准；路由层以 `src/analysis/routes.ts` 为准。
- 对账口径：路由层 `cli` 与冻结表逐条同序逐字同（对账脚本 `.scratch/t379/align-88.mjs`，`ALIGN-PASS: 88/88`）；生成块（上方「联动速查」）由 `pnpm gen`＋`pnpm help:build` 派生，谁都不手改。
- 页面归类（以 #171 §3 为准，主力同模板）：两指标配对页 71 条与多指标趋势与对照页 17 条同走 `combined_analysis.html` 新形态；`calorie_deficit.html` 本图不碰（归 #161）。

| 组 | 条数 | 命令 | 代表cli（冻结表照抄即跑） |
|---|---|---|---|
| 两指标配对 | 71 | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 两指标配对（缺口例） | — | calorie.view.combined | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` |
| 多指标整体趋势（分组例） | 15 | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","group":"g1","compare":"target"}'` |
| 多指标整体趋势（含目标对比） | — | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","compare":"target"}'` |
| 多指标整体趋势（含月度对比） | — | calorie.view.multi-trend | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"60d","group":"comprehensive","compare":"monthly"}'` |
| 趋势对照 | 2 | calorie.view.calorie-trend／calorie.view.long-trend | `calorie-cmd-read calorie.view.calorie-trend --params '{"window":"7d"}'`／`calorie-cmd-read calorie.view.long-trend --params '{"group":"weight_calorie","window":"30d"}'` |

- 代表 prompt 原文（逐字同冻结表 `prompt_template`，其余 82 条见冻结表原文）：

看体重 vs 摄入(最近 7 天)：

```
请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 7 天)」。

我想看最近 7 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

看整体趋势(含目标对比)：

```
请你加载技能 卡路里,执行唤醒词「看整体趋势(含目标对比)」。

我想看全维度综合趋势图并含周期对比(含目标对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

- HELP 面：旧词 85 条走 `calorie.help.lookup --params '{"q":"<唤醒词>"}'` 现找（抽查 5/5 绿，见证据件）；3 条新词（看组合分析／看热量趋势／看整体趋势）在冻结表无行，现找无精确命中，路由直达可执行（真出口已验），补行留收口（本票不改冻结表）。
- 固定种子抽查（`docs/research/t81-seed.mjs`，`CALORIE_TODAY=2026-09-07`）：每组至少 1 条真出口 exit 0，结果型 HTML 落盘、回执绝对路径，指标全有限数（判定①②绿，判定③视觉留用户肉眼；读数见证据件）。

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ CALORIE_PHOTOS_DIR（照片存在位校验用，缺则记 null）；真实 DB 禁迁，测试 tmp 隔离；老家只读对照。
- 出 scope（一期外）：面板（二期单 MAP）、定时任务、本技能外联动（router+作息/备忘/训记仅只读对照，不落本包）。

## 公共安装器运行时（skills-cli 装完必读，#47）

- 本仓库 `dist/` 不进 git：skills-cli 只把本目录（含本文件）装进 agent，不带可执行文件；“不走 npm”的只是 skill 发现这一步，运行时走 npm（`skill-calorie@0.2.3` 已发布）。
- 取运行时二选一：`npm install -g skill-calorie@0.2.3`（一劳永逸），或免安装 `npx -p skill-calorie@0.2.3 calorie-cmd-read …`（每次现拉）。若 npm 报 EUNSUPPORTEDPROTOCOL（workspace:），说明已发布包待重发（发版流修，见 docs/public-installer-47.md「已发布包阻塞」），先用本仓构建产物验证链路。
- HELP 现找→cmd_read→envelope→HTML 验证（sh 先 `export SKILLS_DB_PATH="$(mktemp -d)"`；Windows PowerShell 先 `$env:SKILLS_DB_PATH = "$env:TEMP\sk-test"`；node>=22.13；完整口径见 docs/public-installer-47.md）：
  ```sh
  calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'
  ```
- stdout／落盘契约与「唯一出口（T11）」节同源（成功只一行 envelope JSON；HTML 落点见 `data.output`）。
- 版本钉死登记：本节版本硬编码现为 `@0.2.3`（已随 #44 发版流同步；历史登记见 docs/public-installer-47.md「版本钉死登记」）。
