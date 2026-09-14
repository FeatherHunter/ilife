# T351 重做 184「看完整计划」版式规格

> 基准 `D:/2Study/StudyNotes/.db/calorie_html/看完整计划_20260914_141334.html`（2163 行；页内样式 `:502-649`、脚本 `:1625-2157`、载荷 `:675`），行号皆引它。
> 差距：新页 `render/workoutPlanDocs.ts:60` 只出「指标卡＋每周一张 4 列表」，老页的会话卡、日页签、5 列动作表、部位色、休息列全缺。

## 一、区块骨架（mode=full，页头→页脚）

| 区块 | 作用 | 字段 | 行数（行号） |
| --- | --- | --- | --- |
| 页头 | 计划名＋一行摘要 | `config.title`／`description`／`total_weeks`／`start_date` | 4（`:654-657`；`:1645-1652`） |
| 今日复盘 | 当日完成率与异常；**184 载荷 `review.today` 为 null，不出** | `completion_rate`／`sessions`／`plan_total_sets`／`actual_total_sets`／`note`／`anomalies` | 1（`:658`；`:1654-1685`） |
| 周次页签 | 选周，默认 `current_week`（184 为第 2 周） | `week_number`、`current_week` | 1（`:667`；`:1995-2000`） |
| 周区块 ×N | 每周一组，非激活周隐藏 | `week_number` | 3（`:2011`、`:2078-2080`） |
| 日页签 | 周一…周日七钮，默认周一 | `DAY_LABELS`（`:1632`） | 6（`:2013-2018`） |
| 日内容 ×7 | 一日，可含多场 | `day_of_week`、`sessions[]` | 4（`:2024-2027`、`:2076`） |
| 会话卡 ×N | 日别段＋会话名＋时段＋总组数 | `session_label`／`time_start`／`time_end`／`total_sets` | 7（`:2036-2042`） |
| 动作表 | 4 列明细（动作＋副行／部位／组数×次数／重量），见 §2 | `movements[]`＋`sets[]` | 24（`:2046-2069`） |
| 空动作行 | 「暂无动作」 | `movements` 为空 | 1（`:2071`） |
| 休息日卡 | 「周X · 休息日」＋主动恢复 | `is_rest_day` | 3（`:2026-2029`） |
| 页脚 | 数据来源一行 | `meta.source`／`wake_word`／`generated_at` | 4（`:669-672`、`:2152-2153`） |
| 复制区 | 复制数据＋复制日志 | 见 §4 | 2（`:2160-2161`；`:978-1000`） |

## 二、版式

- 布局：`.app` 宽 900px 居中（`:514`）；卡片＝白底＋1px 线＋16px 圆角＋阴影，会话卡 `.session`（`:532`）与区块 `.review-section`（`:559`）同形，休息日卡居中（`:537-538`）；表外包 `.table-wrap`。
- 配色：`--bg` 页底／`--card` 卡／`--ink`·`--ink2`·`--ink3` 三级字／`--lineS` 线／`--accent` 主色／`--green` 完成／`--red` 失败／`--amber` 警示（`:503-507`）；部位色 `PART_COLORS`（`:1627-1631`）以内联 `background:色20;color:色` 配 `.part-tag`（`:549`）。
- 字号：h1 32 → h2 18 → 会话名 17 → 正文 13 → 副行 11（老页值）；表头 11 大写字距 `.06em`；`stat-value` 32；`.part-tag` 10.5。新版只准用共享样式表（`shared/docPage.ts:50`），不抄老页内联样式——副行小字因此取共用样式表现成的 12px（不是老页的 11），见下条与 §二末条。
- 四列（本轮口径；老页基准是五列 `:2046`）：动作＝加粗动作名（`<strong>`）＋**块级副行小字**「部位细化词 · 主要／孤立」（老页 `:2062` 的副行排版）；部位＝纯文本（老页 `:2063` 是 `.part-tag` 色块，本轮降级，见末条）；组数×次数＝`setsText`（老页 `:2064` 口径；无 `sets` 写 `—`）；重量＝`weightText`（老页 `:2065` 口径）；数值列右对齐（老页 `:637` 同）。**不印「休息」列**（老页 `:2066` 那一列；库里没有 `movement.rest` 该键，老页自己也恒空）。装配住 `render/workoutMovementTable.ts`，`sessionCard()` 只调它，装配件不再自己认动作字段。
- **节奏上移会话标题行**（不进表）：老页 `:2062` 把 `note` 整条塞进副行，本轮把备注拆三段——方括号**前**那截（形如 `胸整体`）＝部位细化词进副行；方括号**内**逗号**之后**那截（形如 `20-30 RPM(2-2.5秒/次)`）＝节奏，上移到该场 `<summary>` 尾部，读作 `周一 · 10:00–11:30 · 上午·胸·3角度 · 13 组 · 节奏 20-30 RPM(2-2.5秒/次)`；方括号**内**逗号**之前**那截（形如 `W1 10reps×35.0kg`）**丢掉**。没有方括号的备注整条作部位细化词；备注为空或 `—` 时副行只留类型中文化那一项。休息日没有动作表，标题不加节奏。
- 拆两段的依据（生产库 `workout_plans.movements` 264 个动作全量实测，两条都是 **264/264**）：① 方括号内逗号之前那截与**同行** `sets` 逐字一致 ⇒ 丢了不丢信息；② 方括号内的 `W<n>` **恒等于**该行所在周次（分布 66／66／66／66）⇒ 丢了也不丢信息。**节奏摆成一列会整列重复**：96 个有动作的场次里**场内节奏 96/96 恒定**（全库只有 3 种取值），故只上会话标题行。
- 类型中文化：`type` 取值域只有两种（生产库实测 `iso`×204 →「孤立」、`main`×60 →「主要」），页面上不出现英文原值；清单外的值原样输出，不吞。
- 交互态：周页签激活＝主色＋下划线（`:523-526`）；日页签激活＝深底白字（`:554-556`）；`.week` 非激活隐藏（`:527-529`）。
- 区块接口：标题 `renderPageShell`、指标 `renderKpiGrid`、表 `renderDataTable`（`align:'right'`）、折叠 `renderDisclosure`、副行小字 `renderCaliberLine`（共用位现成的 12px ＋ `--fg2`，达 AA 对比度；原型里的 `#86868b` 正文小字因 3.62:1 不达标，已被共用样式表否掉）。部位色块与混排单元格共享区块无接口 → 本轮降级为纯文本，或另立公共层票。

## 三、页签的静态替代（零内联脚本）

- 方案 A（`details`／`summary`，推荐）：每周一个 `<details open>`、周内每日一个 `<details open>`，两级 `<summary>` 写「第 N 周」与「周X · 时段 · 会话名 · N 组 · 节奏 …」，动作表放日级内，走 `renderDisclosure`。
- 方案 B（`section` 堆叠）：周与日按序平铺 `<section>`＋`<h2>第 N 周</h2>`＋`<h3>周X</h3>`，阅读靠标题层级，可搜可打印但全展开很长。

## 四、底部双按钮载荷

- 老页两钮吃同一份 `window.__P__`（`:978-1000`、`:2161`）：信封 `status`／`data`／`message`；`data` 八键 `mode`／`config`／`weeks`／`current_week`／`review`／`meta`／`scene`／`copy_log`。
  - 复制数据＝`data.meta`＋`data.scene.snapshot{title, summary[], sections[{heading, rows[]}]}`。例：`snapshot.summary[0] = "计划: 4周训练计划 v14 · 总周数 4 · 起始 2026-08-10"`；`sections[0].rows[1] = "悍马机卧推 · 胸 · 10次×35.0kg · 5 组"`。
  - 复制日志＝`data.meta{skill_name, wake_word, command_cn, occurred_at, skill_version, scene_id}`＋`data.copy_log{thinking, data_structure, call_chain, timestamp, exception}`。例：`copy_log.data_structure = "calorie_data.db"`；`copy_log.call_chain = "python scripts/render_workout_plan.py "`。
- 我们的形状：`copyArea({data, log})` → `renderCopyBlock({dataFormats, logText})`；数据位 `DataTextInput{envelope, format?, title?, occurredAt?}`，信封 `{version, skill, shape, key, data}`，`shape` ∈ stat／list／detail／analysis／receipt，投影表 `DATA_TEXT_PROJECTIONS`（如 list→items＋total）；日志位 `LogTextInput{envelope, copyLog}`，`copyLog({command, source, m5Line, actionAt, version})` → `{thinking, dataStructure, callChain, timestamp, exception}`。
- 结论：按钮与区块可直接沿用（冻结 id `ilife-copy-data`／`ilife-copy-log`，三格式菜单自带）；载荷不可照抄——`scene.snapshot` 在新契约里没有位置，须先把计划数据投影成信封五形态之一（建议 `list`：`items` 逐周一行、`total` 记会话数）；日志五键一一对应（`data_structure→dataStructure`、`call_chain→callChain`，其余同名），① 段与版本由信封＋`version` 派生，可等价迁移。

## 五、字段映射（老页 → PlanView／planStore）

| 老页字段 | 我们侧（出处） | 结论 |
| --- | --- | --- |
| `config.title` | `PlanView.title`（`planPlate:80`） | 一致 |
| `config.total_weeks` | `totalWeeks`（`:81`） | 一致 |
| `config.version` | 缺（`planStore:191` 有，视图层未导出） | 缺 |
| `config.description` | 缺（`planStore:192` 有，视图层未导出） | 缺 |
| `config.start_date` | 缺（`planStore:194` 有，`planPlate:56` 只用于定位周次） | 缺 |
| `weeks[].week_number` | `PlanSessionRow.week_number`（`planStore:198`） | 一致 |
| `days[].day_of_week` | `day_of_week`（`:199`） | 一致 |
| `days[].day_label` | 缺（新侧按 `DOW` 自算，`workoutPlanDocs:23`） | 缺 |
| `sessions[].session_index` | `session_index`（`:200`） | 一致 |
| `sessions[].session_label` | `session_label`（`:201`） | 一致 |
| `sessions[].time_start`／`time_end` | `time_start`／`time_end`（`:202-203`） | 一致 |
| `sessions[].is_rest_day` | `is_rest_day`（`:204`，新侧 0／1） | 一致（类型不同） |
| `sessions[].total_sets` | `total_sets`（`:205`） | 一致 |
| `movements[].name` | `PlanMovement.name`（`:36`） | 一致 |
| `movements[].part` | `PlanMovement.part`（`:37`） | 一致 |
| `movements[].type` | `PlanMovement.type`（`:38`） | 一致 |
| `movements[].note` | 缺（`PlanMovement` 未声明，`:35-40`） | 缺 |
| `movements[].rest` | 缺（老页载荷亦无此键） | 缺 |
| `movements[].sets[]`（长度即组数） | `PlanMovement.sets?: unknown[]`（`:39`） | 一致（未类型化） |
| `sets[].reps`／`weight`／`unit` | 缺（`sets` 元素无字段类型，须渲染层收窄） | 缺 |
| `data.current_week` | 缺（可用 `weekOfDate(start_date, 今天)` 自算，`planPlate:32`） | 缺 |
| `data.mode` | 缺（新侧由命令决定，不进载荷） | 缺 |
| `data.meta.source`／`wake_word`／`generated_at` | 缺（页脚来源行改由 `opts.key`／`command`／`wakeWord` 与 `nowStamp()` 拼，`workoutPlanDocs:114-119`） | 缺 |
| `data.review.today.*` | 缺（184 载荷为 null；复盘走 `buildExerciseReview` 另一命令） | 缺 |
| `data.scene.snapshot.*` | 缺（复制数据载荷，见 §4） | 缺 |
| `data.copy_log.*` | `CopyLogFields` 可映射（见 §4） | 可映射 |

**「缺」字段清单**：`config.version`、`config.description`、`config.start_date`、`days[].day_label`、`movements[].note`、`movements[].rest`、`sets[].reps`、`sets[].weight`、`sets[].unit`、`current_week`、`mode`、`meta.source`／`meta.wake_word`／`meta.generated_at`、`review.today.*`、`scene.snapshot.*`。
