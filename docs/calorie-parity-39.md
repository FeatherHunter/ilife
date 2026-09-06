# 卡路里一期·新旧对照 parity 调查报告（#39）

对照源：旧家 `D:/2Study/StudyNotes/SKILLS/卡路里`（SKILL.md / tests / templates / DB schema，只读，未运行旧 Python）；新版 `packages/skill-calorie`（SKILL.md / src / templates / test）。
方法铁律遵守：未运行旧 Python（仅静态读 + grep 计数）；未碰真实 DB（旧主库系 0 字节空文件，schema 以 `db.py` 静态 + 备份复制件只读 SELECT/PRAGMA 验证为准；新测试全 tmp 隔离）。

## 1 结论与分级

总体结论：**词层与路由层全覆盖，执行层缺两块 P0**。唤醒词 436 条目 / 434 唯一词新旧逐字一致（onlyOld=0、onlyNew=0），10 场景计数全对齐；但新版 24 个 cmd_read 键全为读，旧写链无可执行键，读链亦有缺口。

| 分级 | 内容 | 去向 |
|---|---|---|
| P0 功能缺失 | 写链：约 22 个旧写 CLI + 单条 CRUD 唤醒词（记一餐/记体重/记运动/记体脂/记围度/记身材照/定改目标/食品库增改删/档案写）无可执行键；`skill-calorie-fetch` 仅 import/validate/dedupe/export/history/audit/catalog-verify，无单条 CRUD | 补票 #40 |
| P0 功能缺失 | 读链：无 weight 视图（旧 weight-history）、无 profile/档案视图；render 缺体重盘/历史/对比/复核/波动 v2、身体成分与围度看/录、训练计划看/构建向导、运动目标视图、goal 11 模式中 expiring/predict/vs_actual、predict/anomaly/contraindication/dedupe render | 补票 #41 |
| P1 口径差异 | intensity 中文 4 档→difficulty 英文 3 档，`'极限'`→NULL 边界丢失（出处 db.py:258-268、schema.ts:247-250 M5、migrate.ts:132） | 注明出处，#41 验收时复核 |
| P1 口径差异 | 餐别窗口 15 点=下午茶，加餐=下午茶+夜宵，老家旧口径作废（出处 fetch/diet.ts MEAL_WINDOWS） | 注明出处 |
| P1 口径差异 | GIF 只任务描述不真合成；照片舍弃 base64 内嵌只透文件名 + fileExists 位（出处 photo.ts 注释，有意不对等） | 注明出处，调用方处理 |
| P1 口径差异 | 复盘 9 词并入场景 10；legacy 22 条无 key 原样保留为 LegacyTrigger（出处 types.ts:39、help-lookup.ts:16） | 注明出处 |
| P1 口径差异 | goal progress 11 mode 折叠为 5 盘 + 主视图，expiring/predict/vs_actual 无直接对应 | 并入 #41 |
| P2 体验差异 | DOM 不兼容（旧 Apple CSS 整页 vs 新 pageShell token 内联）；饼图/明细表舍弃改为 KPI 化；图表舍弃 | 二期 |
| P2 体验差异 | `_cmd_maps.py` 5 中英映射表被取代（新统一 templates + `--html` 落盘）；旧 HELP 执行器 render_help_center 被取代（新 build-help 标记块 + help.lookup 现找）；aliases 3 词合并 | 被取代，有据 |
| 非缺口 | 定时 cron、飞书发送/归档、训记 sync/push、mmx vision、面板 | out of scope（#14 范围），词保留路由 + HELP，仅执行层不承接 |

## 2 场景映射（旧 11 分类 → 新 10 场景）

| 旧分类 | 旧数 | 新场景 | 新数 | 差 |
|---|---|---|---|---|
| 主页 | 9 | 01-home | 9 | 0 |
| 饮食 | 70 | 02-diet（含 legacy 饮食 1 无 key） | 70 | 0 |
| 体重 | 58 | 03-weight | 58 | 0 |
| 运动 | 39 | 04-exercise | 39 | 0 |
| 健身计划 | 32 | 05-workout（含 externals 5 词保留、执行 out of scope） | 32 | 0 |
| 目标管理 | 25 | 06-goal | 25 | 0 |
| 基础信息 | 4 | 07-profile | 4 | 0 |
| 身体细节 | 13 | 08-body | 13 | 0 |
| 身材照片 | 10 条目 / 8 唯一词 | 09-photo（记身材照 1 词 3 key） | 10 / 8 | 0 |
| 分析 167 + 复盘 9 | 176 | 10-analysis（含 legacy 分析 12 无 key） | 176 | 0 |
| 合计 | 436 / 434 唯一 | — | 436 / 434 唯一 | 0 |

## 3 唤醒词去处（436 条目 / 434 唯一词）

数量核对：旧 `'wake_word':` 436 行去重 412 + 双引号复盘/分析 22 = 436 条目；新 scene-*.ts 计数 436；逐字 diff onlyOld=0、onlyNew=0。**词零废弃**。
覆盖规则（剩余 387 条）：旧条目→新同 category 条目（复盘 9→10）；主词 + aliases→HELP_LOOKUP 同命中；读类词→build-help REPR 映射到 24 读键之一；写/定时/外联动词路由 + HELP 保留、执行层走旧链（一期纯读单轨）。
抽样 49 条（每场景 5 条，07 全抽 4 条）逐条命中路由 + HELP，证据为路由行 + HELP 行 + cmd_read 分发：

| 场景 | 抽样旧词 | 新去处 |
|---|---|---|
| 01 | 看今日主页 / 看今日饮食概览 / 看今日运动概览 / 看本周主页 / 看连续记录天数 | 路由 01 + HELP；读执行 calorie.today/view.diet/view.exercise |
| 02 | 记一餐 / 补记饮食 / 改饮食记录 / 看今日饮食 / 查食品 | 路由 02 + HELP；读 today/view.diet/view.search，写走旧 live 链 |
| 03 | 记体重 / 记体重（含备注） / 补录体重 / 批量补录体重 / 看今日体重 | 路由 03 + HELP；看今日体重无读键（读缺口→#41） |
| 04 | 记运动 / 记力量训练 / 记有氧运动 / 记日常活动 / 运动复盘（本周） | 路由 04 + HELP；读 view.exercise/diet-review |
| 05 | 看本周计划 / 看今天练什么 / 落地训练 / 同步到训记 / 改动作 | 路由 05 + HELP；落地/同步执行 out of scope |
| 06 | 定营养目标 / 定营养目标（自动算） / 定体重目标 / 改体重目标 / 看目标状态 | 路由 06 + HELP；读 goal-config/recommend/goal-weight/goal-status |
| 07 | 设置档案 / 设活动量 / 改档案 / 查档案 | 路由 07 + HELP；无 profile 读键（→#41） |
| 08 | 记体脂（皮褶钳） / 记围度 / 补记体脂 / 看体脂趋势 / 删体脂 | 路由 08 + HELP；无 body render（→#41） |
| 09 | 记身材照（单张/备注/批量） / 查身材照 / 对比两张照片 | 路由 09 + HELP；读 photo.detail/compare，记无写键（→#40） |
| 10 | 看体重 vs 摄入（7 天） / 查营养结构 / 查健康报告（本月） / 今日复盘 / 开启定时复盘 | 路由 10 + HELP；读 view.combined；定时执行 out of scope |

废弃清单（均为执行/映射层，词层无废弃）：22 写 CLI（→#40）；weight-history、profile 读无键（→#41）；review 发送/归档/定时、训记联动执行层、mmx vision（out of scope）；`_cmd_maps.py` 5 表、旧 HELP 执行器（被取代）；aliases 3 词（重复变体合并）；记身材照计数口径（3 条目 1 词）。

## 4 DB 映射（旧 13 → 新 11）

旧 13 = 11 终态持久表 + `body_composition_new`/`body_composition_mig`（2026-08-02/03 重建中间表，拷完 DROP+RENAME，非实体）。历史 `entries→food_log` 合并、`sleep_records`/`fitness_goals` 早删（2026-07-12：sleep 交作息管家，fitness_goals 由 workout_plans 替代），无搬运。
11 表同名保留，列名/类型/约束逐列一致，索引 14 个、触发器 3 个一致。**唯一字段差异：`exercise_log` 删 `intensity`**（2026-07-12 强度口径统一，中文 4 档→英文 3 档 difficulty，与训记对齐；去向为搬运回填非丢弃：schema.ts M5 WHERE difficulty IS NULL 回填、migrate.ts intensityToDifficulty + 过滤 intensity 列 + 回填；SQLite 不便删列，老库残留保留读路径统一用 difficulty；边界丢失：`'极限'`/其他→NULL，difficulty 已有值不覆盖）。
`_new`/`_mig` 去向：行归档进终态后 DROP；残留收敛 migrate.ts srcCandidates + 确定序重插，schema.ts M1 清理 + M7 重建收敛。

## 5 CLI 映射（旧 calorie_tracker.py 992 行，主分支 if add + 30×elif → 新 24 键）

读 8 条有去处（1 同名、7 改名），写 22 条缺失（→#40），读 2 条缺失（→#41），HELP 改名，review/定时/外联动 out of scope：

| 旧命令 | 新键 | 状态 |
|---|---|---|
| list / summary / get-goal / weight-goal-progress / exercise-summary / search-product / list-products | calorie.today / view.diet / view.goal-config / view.goal-progress / view.exercise / view.search / view.library | 改名 |
| history | calorie.history | 同名 |
| 卡路里 HELP（render_help_center） | calorie.help.lookup / help.center | 改名 |
| add / delete / update-meal / water / goal / weight / weight-update / weight-delete / weight-batch / weight-goal / exercise-add / add-product / update-product / copy-meals / add-meal-batch / update-meals-by-date / delete-meal-by-type / delete-meals-by-date / delete-meals-by-range / deprecate-product / profile set/get/show/activity/update | — | 缺失（写→#40） |
| weight-history / profile 查档案 | — | 缺失（读→#41） |
| review gen（读侧） | calorie.view.diet-review | 部分承接；send/archive/定时 out of scope |

另：exercise_tracker / body_composition / body_measurements / body_photo_tracker / batch_import / review_cli / xunji_bridge 子命令同理按读写二分，写→#40，读缺口→#41，外联动 out of scope。

## 6 HELP / 模板 / HTML 抽查

新 render 16 模块 → 模板 6 个（home/diet/exercise/goal/photo-gallery/help 为 CLI 外壳，真实 HTML 由 html.ts pageShell 生成；skill-t11 断言覆盖）+ 内联 section；旧模板 74 文件。
关键 5 页抽查（新库 tmp 运行，真 DB 零触碰）：主视图（render-t8 L71-91：cal=1339/goal=1800/series7/streak≥3）、饮食（render-t8 L93-119：snack 2 件 250 卡、水排除、pct 和 100±0.05）、运动（render-t8 L121-134：burned620/sessions2/active2）、目标盘（render-t9 L91-128、render-t8 L136-149：完成带 80%~120% 同口径）、照片收据/HELP（render-t10 全段 + skill-t11 HELP 逐条 import）——**5 页均有新测试字段断言**。
缺失 38 项（不计设计报告非运行时）：体重系 7（盘/历史/对比/复核/波动 v2/单条收据/批量）、身体细节 2（体成分/围度看录）、运动细分 3（有氧/力量分报、回顾趋势分布、复核独立出口）、计划 3（训练计划看/构建向导/运动目标）、饮水营养 4（饮水独立页/营养明细/标签录入/营养长页）、趋势报告 7（热量趋势/长趋势/健康长页/六因子/预测/异常/禁忌）、通用 6（去重/lint/导入预览/进度/跨技能睡眠/通用复核）、目标 2（营养水分配置分水页/体重测算结果页）、照片 3（GIF 规划结果页/拍照向导/viewer 全功能）、记录查看 1。整块缺失：体重、身体细节、训练计划、长趋势预测、异常禁忌、批量导入 → #41（建议按体重盘→运动细分→分析长尾顺序补）。

## 7 证据与口径注记

- 新测试：`packages/skill-calorie/test/*.mjs` 全量 88 pass；包内 `pnpm test` 子集 17 pass（含 triggers parity 7 项：总数 436、10 场景对齐、wake 多重集、逐条 sha、getSummary、HELP 全覆盖、CATEGORIES 13）。
- 旧文档漂移（已以代码为准）：SKILL.md 票面 1756 行实测 2195 行；`_triggers.py` 票面 4467 行实测 4442 行；`references/database_schema.md` 仅列 8 表（缺 user_profile/body_composition/body_measurements），权威源为 `db.py`；`config-calorie.ts` 已漂移（缺钠糖纤维/activity_level/category），以 db.py + PRAGMA 为准。
- T2“436 条行为零增删 parity 全过”独立复核成立（逐字 diff + sha 断言）；T11“24 键 + 全票 parity”、T12“复制件迁移 + 对账 + 幂等”与本报告结论一致（读链范围内）。

## 8 下一步

- #40 写链写键（P0）：旧写 CLI 逐条去处 + 单条 CRUD 可执行 + receipt。
- #41 读链补齐（P0）：weight/profile 读键 + §6 缺失 render + HTML 断言。
- P1 口径差异在 #40/#41 验收时复核出处；P2 体验差异进二期。
