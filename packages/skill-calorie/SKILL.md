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
- 写链（#40）：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body）同出口可执行，一律 `receipt` 形（`ok/message` + T10 `receipt` 回执）；缺参 exit 2、缺失阻断 exit 4；训练计划/训记同步与 mmx vision 两步向导无独立写键（二期，见 triggers 旧链）。

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
| `定训练计划` | `plan_builder_wizard.html` | **当前不可写**：95 键无训练计划写键（见下） |
| `设置档案`／`设活动量`／`改档案` | `calorie.view.profile-wizard`（页面装配在 `src/profile/setup.ts`） | 场景 07 三条写入词共用一页（改前值 ＋ 待写项 ＋ 活动量五档）；改前值取自库内现值，写入仍走 `calorie.profile.set`／`calorie.profile.activity`／`calorie.profile.update` |

| 场景 | 触发 | 行为 | CLI 落点（符号锚，可验） |
|---|---|---|---|
| 1 主动填 | 配置型词命中但**没给数据**（`记体脂` 类先问测量方式） | 出空 wizard（不传预填）→ 用户填 → 复制 prompt → AI 调写键 | 空参被拦：无围度项 → `bad-input` exit 2（`fetch/body.ts` `validateMeasurementInput` 的 `fail('围度','empty',…)` → `cli/write.ts` `dispatchWrite` 的 `ValidationError` 分支） |
| 2 预填 verify ⭐ | 同一类词**给了数据** | 出预填 wizard → 用户核对 → 复制 prompt → AI 调写键 | 预填键限白名单：非 `MEASURE_CAMEL` 字段即 `fail(2,'不支持字段: ')`（`cli/write.ts` `MEASURE_CAMEL` 白名单循环）；皮褶钳缺 `bodyFatPct` 即 `fail(2,…)`；计划类先跑 `calorie.view.plan-wizard` 纯校验（`render/planPlate.ts` `buildPlanWizardView` → `fetch/plan.ts` `validatePlan`，返 `dryRun:true`／`checkedSessions:N`（输入含 N 个会话的已检查计数；≠通过数：坏计划也计 N，通过与否看 `errorCount`，只校验不写库）） |
| 3 直接录 | 用户**明确**说「直接录」「我信你」 | 跳过 wizard，直接调写键，回 `receipt` 形 | 35 写键一律 `receipt`（`cli/write.ts` 模块头契约 ＋ `out()` 组装 `{ok,message,receipt}`） |

- **页面已落地（#86 四页 ＋ #179 档案预检页 ＋ #251 目标预检页）**：verify 页**存在**，配置型 wizard 词命中即先出页，不再走文字 verify：`calorie.view.measure-wizard`（记围度／补记围度；场景 1 空页／场景 2 预填）／`calorie.view.composition-wizard`（记体脂三词；来源＋体脂率＋皮褶钳 7 点）／`calorie.view.photo-log-wizard`（记身材照；纯配置）／`calorie.view.gif-planner`（查身材照／生成身材照GIF；照片框选＋4 数字裁剪）／`calorie.view.photo-picker`（选身材照；删身材照与标签三条的候选快照）／`calorie.view.profile-wizard`（设置档案／改档案／设活动量；三条写入词共用一页，改前值取自库内现值，写入仍走三条写命令）／`calorie.view.goal-wizard`（定营养目标／定营养目标(自动算)／定体重目标／定体重目标(自动算截止)／定体重目标(含起始日)／定饮水目标／定饮水目标(自动算)／一键定全套目标／改营养目标／改体重目标／改饮水目标，共 11 条带空位的写词共用一页；页面摆库内现值／按档案算的推荐值与依据／改前→改后对照，写入仍走 5 条既有写命令。暂停所有目标／重启所有目标**无空位**，不出页）。页面＝静态 HTML ＋ `copyText`，出页后由用户复制 prompt 回给 AI，再按场景调写键。四页实跑证据见 `docs/research/t163-precheck-precedent.md` §3。
- 需多步交互的配置写词在路由层落 `non-exec` 桶，`reason` 逐字 `NON_EXEC_REASONS.wizard`（`triggers/routing.ts` `NON_EXEC_REASONS` 及其词表项）；**训练计划 95 键无写键，当前不可写**——`NON_EXEC_REASONS.planWriteMissing` 逐字「命中但不执行：95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。」，命中回 `non-exec` 并告知用户属二期，**不得**承诺 verify 后写入。
- AUTO 块（本文件下方「联动速查」）列出的单命令写键只证明**写键可达**，**不豁免**本表的 verify 前置；分流仍按本表：有数据走场景 2，明确授权才走场景 3。
- **禁止**：用户给了数据仍跳过 verify 直接调写键（数据看起来对也不例外）——v2.4.2 → v2.4.3 的根因就是这条。正解＝按场景分流。
- **违反 = 协议 fail mode**：违反时向用户输出违规回执（逐字）：「我跳过了 M6 verify 直接写库，违反 Wizard Verify 铁则；已停止后续写入，请确认数据后重来」；不得静默补记、不得事后补 verify 掩盖；同轮修正循环 ≤ 3 次。

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
| 复制昨日饮食 | calorie.diet.copy | receipt | `calorie-cmd-read calorie.diet.copy --params '{"from":"<日期>"}'` |
| 删饮食记录 | calorie.diet.remove | receipt | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| 删某日饮食 | calorie.diet.remove-by-date | receipt | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"<日期>"}'` |
| 批量删饮食 | calorie.diet.remove-by-range | receipt | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"<日期>","end":"<日期>"}'` |
| 删一餐 | calorie.diet.remove-by-type | receipt | `calorie-cmd-read calorie.diet.remove-by-type --params '{"mealType":"早餐","date":"<日期>"}'` |
| 改饮食记录 | calorie.diet.update | receipt | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| 改某日饮食 | calorie.diet.update-by-date | receipt | `calorie-cmd-read calorie.diet.update-by-date --params '{"note":"食堂","date":"<日期>"}'` |
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
| 批量导入食品 | calorie.product.import | receipt | `calorie-cmd-read calorie.product.import --params '{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}]}'` |
| 改食品 | calorie.product.update | receipt | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| 设活动量 | calorie.profile.activity | receipt | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| 设置档案 | calorie.profile.set | receipt | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"activityLevel":"moderate"}'` |
| 改档案 | calorie.profile.update | receipt | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| 看今日饮食概览 | calorie.today | list | `calorie-cmd-read calorie.today --params '{"date":"今日"}'` |
| calorie.view.anomaly | calorie.view.anomaly | stat | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","window":"90d"}'` |
| 看批量导入预览 | calorie.view.batch-import-preview | stat | `calorie-cmd-read calorie.view.batch-import-preview --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}'` |
| calorie.view.body-composition | calorie.view.body-composition | stat | `calorie-cmd-read calorie.view.body-composition` |
| 对比体脂 | calorie.view.body-composition-compare | stat | `calorie-cmd-read calorie.view.body-composition-compare --params '{"period1Start":"2026-09-05","period1End":"2026-09-05","period2Start":"2026-09-07","period2End":"2026-09-07"}'` |
| calorie.view.body-measure | calorie.view.body-measure | stat | `calorie-cmd-read calorie.view.body-measure --params '{"metric":"waist_cm"}'` |
| 对比围度 | calorie.view.body-measure-compare | stat | `calorie-cmd-read calorie.view.body-measure-compare --params '{"date1":"2026-09-05","date2":"2026-09-07"}'` |
| 看热量趋势 | calorie.view.calorie-trend | stat | `calorie-cmd-read calorie.view.calorie-trend --params '{"window":"7d"}'` |
| 看体重 vs 摄入(最近 7 天) | calorie.view.combined | stat | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 看体脂向导 | calorie.view.composition-wizard | stat | `calorie-cmd-read calorie.view.composition-wizard` |
| calorie.view.contraindication | calorie.view.contraindication | stat | `calorie-cmd-read calorie.view.contraindication --params '{"part":"all"}'` |
| calorie.view.dedupe | calorie.view.dedupe | stat | `calorie-cmd-read calorie.view.dedupe` |
| 看热量缺口 | calorie.view.deficit | stat | `calorie-cmd-read calorie.view.deficit --params '{"window":"7d"}'` |
| 看今日饮食概览 | calorie.view.diet | stat | `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'` |
| 今日复盘 | calorie.view.diet-review | stat | `calorie-cmd-read calorie.view.diet-review --params '{"window":"7d"}'` |
| 看今日运动概览 | calorie.view.exercise | stat | `calorie-cmd-read calorie.view.exercise --params '{"window":"今日"}'` |
| 看有氧训练总览 | calorie.view.exercise-cardio | stat | `calorie-cmd-read calorie.view.exercise-cardio --params '{"window":"7d"}'` |
| 看运动类型分布 | calorie.view.exercise-distribution | stat | `calorie-cmd-read calorie.view.exercise-distribution --params '{"window":"7d"}'` |
| 看今日运动（vs 目标） | calorie.view.exercise-goal | stat | `calorie-cmd-read calorie.view.exercise-goal --params '{"window":"今日"}'` |
| 运动复盘（本周） | calorie.view.exercise-recap | stat | `calorie-cmd-read calorie.view.exercise-recap --params '{"window":"7d"}'` |
| 看运动记录（有备注） | calorie.view.exercise-records | stat | `calorie-cmd-read calorie.view.exercise-records --params '{"window":"7d"}'` |
| 计划复盘（本周） | calorie.view.exercise-review | stat | `calorie-cmd-read calorie.view.exercise-review --params '{"window":"本周"}'` |
| 看力量训练总览 | calorie.view.exercise-strength | stat | `calorie-cmd-read calorie.view.exercise-strength --params '{"window":"7d"}'` |
| 看运动趋势 | calorie.view.exercise-trend | stat | `calorie-cmd-read calorie.view.exercise-trend --params '{"window":"7d"}'` |
| 看GIF规划器 | calorie.view.gif-planner | stat | `calorie-cmd-read calorie.view.gif-planner --params '{"tag":"正面"}'` |
| 看今日目标进度 | calorie.view.goal | stat | `calorie-cmd-read calorie.view.goal --params '{"window":"7d"}'` |
| 定营养目标 | calorie.view.goal-config | stat | `calorie-cmd-read calorie.view.goal-config` |
| 看即将到期的目标 | calorie.view.goal-expiring | stat | `calorie-cmd-read calorie.view.goal-expiring` |
| 看目标预测达成 | calorie.view.goal-predict | stat | `calorie-cmd-read calorie.view.goal-predict --params '{"window":"14d"}'` |
| 看今日目标进度 | calorie.view.goal-progress | stat | `calorie-cmd-read calorie.view.goal-progress --params '{"window":"今日"}'` |
| 定营养目标(自动算) | calorie.view.goal-recommend | stat | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |
| 看目标状态 | calorie.view.goal-status | stat | `calorie-cmd-read calorie.view.goal-status` |
| 看目标对比实际 | calorie.view.goal-vs-actual | stat | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"window":"30d"}'` |
| 定体重目标 | calorie.view.goal-weight | stat | `calorie-cmd-read calorie.view.goal-weight --params '{"window":"30d"}'` |
| 看目标预检 | calorie.view.goal-wizard | stat | `calorie-cmd-read calorie.view.goal-wizard` |
| 看健康盘 | calorie.view.health | stat | `calorie-cmd-read calorie.view.health --params '{"window":"本周"}'` |
| 看今日主页 | calorie.view.home | stat | `calorie-cmd-read calorie.view.home --params '{"date":"今日"}'` |
| 查食品库 | calorie.view.library | stat | `calorie-cmd-read calorie.view.library` |
| 查卡路里数据 | calorie.view.lint-health | stat | `calorie-cmd-read calorie.view.lint-health` |
| 看整体趋势 | calorie.view.long-trend | stat | `calorie-cmd-read calorie.view.long-trend --params '{"group":"weight_calorie","window":"30d"}'` |
| 看围度向导 | calorie.view.measure-wizard | stat | `calorie-cmd-read calorie.view.measure-wizard` |
| 看整体趋势(含目标对比) | calorie.view.multi-trend | stat | `calorie-cmd-read calorie.view.multi-trend --params '{"window":"90d","compare":"target"}'` |
| 看营养分析 | calorie.view.nutrition-analysis | stat | `calorie-cmd-read calorie.view.nutrition-analysis --params '{"window":"7d"}'` |
| 看营养素深度 | calorie.view.nutrition-detail | stat | `calorie-cmd-read calorie.view.nutrition-detail --params '{"window":"7d"}'` |
| 查营养配比 | calorie.view.nutrition-ratio | stat | `calorie-cmd-read calorie.view.nutrition-ratio --params '{"window":"7d"}'` |
| 看身材照向导 | calorie.view.photo-log-wizard | stat | `calorie-cmd-read calorie.view.photo-log-wizard` |
| 选身材照 | calorie.view.photo-picker | list | `calorie-cmd-read calorie.view.photo-picker` |
| 看计划概览 | calorie.view.plan | stat | `calorie-cmd-read calorie.view.plan --params '{"date":"今日"}'` |
| 看计划 vs 实际 | calorie.view.plan-vs-actual | stat | `calorie-cmd-read calorie.view.plan-vs-actual --params '{"window":"本周"}'` |
| calorie.view.plan-wizard | calorie.view.plan-wizard | stat | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| calorie.view.plan-write-preview | calorie.view.plan-write-preview | stat | `calorie-cmd-read calorie.view.plan-write-preview --params '{"op":"copy"}'` |
| calorie.view.predict | calorie.view.predict | stat | `calorie-cmd-read calorie.view.predict --params '{"horizonDays":7,"window":"14d"}'` |
| 看落地训练进度 | calorie.view.process-progress | stat | `calorie-cmd-read calorie.view.process-progress` |
| calorie.view.profile | calorie.view.profile | stat | `calorie-cmd-read calorie.view.profile` |
| 看档案预检 | calorie.view.profile-wizard | stat | `calorie-cmd-read calorie.view.profile-wizard` |
| 查高热量排行 | calorie.view.ranking | stat | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","topN":10,"window":"7d"}'` |
| 看复盘报告 | calorie.view.review-template | stat | `calorie-cmd-read calorie.view.review-template --params '{"window":"7d"}'` |
| 查食品 | calorie.view.search | stat | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 看每日六因素 | calorie.view.six-factors | stat | `calorie-cmd-read calorie.view.six-factors --params '{"date":"今日"}'` |
| 看食品来源统计 | calorie.view.source-stats | stat | `calorie-cmd-read calorie.view.source-stats` |
| 看今日喝水 | calorie.view.today-water | stat | `calorie-cmd-read calorie.view.today-water --params '{"date":"今日"}'` |
| 看体重稳不稳（增强版） | calorie.view.volatility | stat | `calorie-cmd-read calorie.view.volatility --params '{"window":"7d"}'` |
| 看今日体重 | calorie.view.weight | stat | `calorie-cmd-read calorie.view.weight` |
| 对比体重：本月 vs 上月 | calorie.view.weight-compare | stat | `calorie-cmd-read calorie.view.weight-compare --params '{"window":"30d","compareWindow":"prev"}'` |
| 看本周体重 | calorie.view.weight-history | stat | `calorie-cmd-read calorie.view.weight-history --params '{"days":7}'` |
| 看体重复核 | calorie.view.weight-review | stat | `calorie-cmd-read calorie.view.weight-review` |
| 记喝水 | calorie.water.log | receipt | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| 批量补录体重 | calorie.weight.batch | receipt | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"<日期>","kg":70.5}]}'` |
| 记体重 | calorie.weight.log | receipt | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| 删体重记录 | calorie.weight.remove | receipt | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| 改体重记录 | calorie.weight.update | receipt | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| 加训练动作 | calorie.workout.plan-add-movement | receipt | `calorie-cmd-read calorie.workout.plan-add-movement --params '{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}'` |
| 复制训练计划 | calorie.workout.plan-copy | receipt | `calorie-cmd-read calorie.workout.plan-copy --params '{"newTitle":"示例副本"}'` |
| 撤销训练计划 | calorie.workout.plan-delete | receipt | `calorie-cmd-read calorie.workout.plan-delete --params '{"confirm":true}'` |
| 删某天训练 | calorie.workout.plan-delete-day | receipt | `calorie-cmd-read calorie.workout.plan-delete-day --params '{"week":1,"dayOfWeek":3}'` |
| 定训练计划 | calorie.workout.plan-set | receipt | `calorie-cmd-read calorie.workout.plan-set --params '{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}'` |
| 定休息日 | calorie.workout.plan-set-rest | receipt | `calorie-cmd-read calorie.workout.plan-set-rest --params '{"week":1,"dayOfWeek":3}'` |
| 定一周计划 | calorie.workout.plan-set-week | receipt | `calorie-cmd-read calorie.workout.plan-set-week --params '{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}'` |
| 改训练计划 | calorie.workout.plan-update | receipt | `calorie-cmd-read calorie.workout.plan-update --params '{"title":"示例改名"}'` |
| 改某天训练 | calorie.workout.plan-update-day | receipt | `calorie-cmd-read calorie.workout.plan-update-day --params '{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}'` |
| 改动作 | calorie.workout.plan-update-movement | receipt | `calorie-cmd-read calorie.workout.plan-update-movement --params '{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}'` |

相关场景：calorie.body.composition-add、calorie.body.composition-remove、calorie.body.measure-add、calorie.body.measure-remove、calorie.diet.add、calorie.diet.batch、calorie.diet.copy、calorie.diet.remove、calorie.diet.remove-by-date、calorie.diet.remove-by-range、calorie.diet.remove-by-type、calorie.diet.update、calorie.diet.update-by-date、calorie.exercise.add、calorie.exercise.remove、calorie.exercise.update、calorie.goal.pause、calorie.goal.resume、calorie.goal.set、calorie.goal.water、calorie.goal.weight、calorie.help.center、calorie.help.lookup、calorie.history、calorie.photo.add、calorie.photo.compare、calorie.photo.detail、calorie.photo.gif、calorie.photo.list、calorie.photo.remove、calorie.photo.tag、calorie.product.add、calorie.product.deprecate、calorie.product.import、calorie.product.update、calorie.profile.activity、calorie.profile.set、calorie.profile.update、calorie.today、calorie.view.anomaly、calorie.view.batch-import-preview、calorie.view.body-composition、calorie.view.body-composition-compare、calorie.view.body-measure、calorie.view.body-measure-compare、calorie.view.calorie-trend、calorie.view.combined、calorie.view.composition-wizard、calorie.view.contraindication、calorie.view.dedupe、calorie.view.deficit、calorie.view.diet、calorie.view.diet-review、calorie.view.exercise、calorie.view.exercise-cardio、calorie.view.exercise-distribution、calorie.view.exercise-goal、calorie.view.exercise-recap、calorie.view.exercise-records、calorie.view.exercise-review、calorie.view.exercise-strength、calorie.view.exercise-trend、calorie.view.gif-planner、calorie.view.goal、calorie.view.goal-config、calorie.view.goal-expiring、calorie.view.goal-predict、calorie.view.goal-progress、calorie.view.goal-recommend、calorie.view.goal-status、calorie.view.goal-vs-actual、calorie.view.goal-weight、calorie.view.goal-wizard、calorie.view.health、calorie.view.home、calorie.view.library、calorie.view.lint-health、calorie.view.long-trend、calorie.view.measure-wizard、calorie.view.multi-trend、calorie.view.nutrition-analysis、calorie.view.nutrition-detail、calorie.view.nutrition-ratio、calorie.view.photo-log-wizard、calorie.view.photo-picker、calorie.view.plan、calorie.view.plan-vs-actual、calorie.view.plan-wizard、calorie.view.plan-write-preview、calorie.view.predict、calorie.view.process-progress、calorie.view.profile、calorie.view.profile-wizard、calorie.view.ranking、calorie.view.review-template、calorie.view.search、calorie.view.six-factors、calorie.view.source-stats、calorie.view.today-water、calorie.view.volatility、calorie.view.weight、calorie.view.weight-compare、calorie.view.weight-history、calorie.view.weight-review、calorie.water.log、calorie.weight.batch、calorie.weight.log、calorie.weight.remove、calorie.weight.update、calorie.workout.plan-add-movement、calorie.workout.plan-copy、calorie.workout.plan-delete、calorie.workout.plan-delete-day、calorie.workout.plan-set、calorie.workout.plan-set-rest、calorie.workout.plan-set-week、calorie.workout.plan-update、calorie.workout.plan-update-day、calorie.workout.plan-update-movement（119 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。
身材照片 HELP 模块：skill-calorie/photo/photo＋skill-calorie/photo/photos（gallery/compare/viewer/gif/picker + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。
<!-- HELP-AUTO-END -->

## HELP 交付与速查台

- **「卡路里HELP」＝老技能同款 HELP 文件**（#139 起）：`calorie-cmd-read calorie.help.center` 缺省即出 `卡路里_HELP_<时间戳>.html`（老命名，V4 三级目录壳，与老技能视觉一致；落 `data.output`，约 300 KB **只落盘**、不进 envelope）。**除下面的复用窗口外别再给它加参数**——缺省就是目的地交付物。
- **反复读不再涨目录（#245）**：HELP 文件与速查台**同一主体一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；`data.output` 给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内已有一份、而你刚改过内容时，那份旧产物**不会自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。业务页面与失败回执**不吃窗口**（每跑一次仍各留一份）。
- **速查台（#88，须显式要）**：`--params '{"mode":"file"}'` 出完整 HTML 速查台（436 场景／54 子功能／10 分组，卡级复制按钮，约 1 MB，落 `卡路里_速查台_<时间戳>.html`）；`{"mode":"inline"}` 出内嵌片段／`{"mode":"text"}` 出纯文本索引；非法 `mode` 与 `q`＋`mode` 同给一律 exit 2。
- **照片 11 键走 `q`**（不是 `mode`）：`--params '{"q":"记身材照"}'` 现找、`{"q":""}` 全表，顺序跟 SCENE_09_PHOTO SoT 序；每条命中自带 `exec`（node 一行式，读 SKILLS_DB_PATH 库）+`legacyCli`（老家 python 原命令备查）；模块 `skill-calorie/photo/photo`＋`skill-calorie/photo/photos`，函数须存在（单测逐条 import 断言）。
- **通用唤醒词现找**：`calorie.help.lookup --params '{"q":"<唤醒词/分类/描述子串>"}'`（436 唤醒词全量，10 场景，空串抛，不返全表冒充命中）。
- 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64；GIF 只出任务描述不碰二进制。

## 场景 09 身材照片常驻规则与工作流指针

- 常驻规则（老技能已核准，照做；逐词细节见包内披露文件）：
  - D2 发图与路径双模式＋文字与图片分离到达（同轮所有图片＝本次要存的照片）；
  - D3 标签必填、缺则逐张追问；
  - D4 改＝覆盖整套、加＝追加判重、删＝移除且至少保留 1 个；
  - D6 删的候选与快照（先列候选→快照确认→回执）；
  - D7 跑完必须主动把 HTML 交给用户，不只给路径（思想保留，机制按本环境＝把文件交给用户）。
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
