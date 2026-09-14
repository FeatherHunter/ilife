# T351 重做 184「看完整计划」版式规格

> 基准 `D:/2Study/StudyNotes/.db/calorie_html/看完整计划_20260914_141334.html`（2163 行；页内样式 `:502-649`、脚本 `:1625-2157`、载荷 `:675`），行号皆引它。
> 老模板正本：`D:/2Study/StudyNotes/SKILLS/卡路里/templates/workout_plan_view.html`（721 行）。
> **T351-v5（本轮）**：整页改穿老模板观感（页宽 900、两级页签、卡片、部位彩色徽章）——§二与 §三 已按当刻实现改写；
> 装配件 `render/workoutPlanDocs.ts`（`buildPlanResultDoc`）＋ `render/workoutPlanLook.ts`（页签与场次卡）
> ＋ `render/workoutPlanCss.ts`（页内样式）＋ `render/workoutMovementTable.ts`（四列动作表）。

## 一、区块骨架（mode=full，页头→页脚）

| 区块 | 作用 | 字段 | 行数（行号） |
| --- | --- | --- | --- |
| 页头 | 计划名＋一行摘要 | `config.title`／`description`／`total_weeks`／`start_date` | 4（`:654-657`；`:1645-1652`） |
| 今日复盘 | 当日完成率与异常；**184 载荷 `review.today` 为 null，不出** | `completion_rate`／`sessions`／`plan_total_sets`／`actual_total_sets`／`note`／`anomalies` | 1（`:658`；`:1654-1685`） |
| 周次页签 | 选周（「全部周次」＋逐周一枚），默认全展开 | `week_number` | 1（`:667`；`:1995-2000`） |
| 周区块 ×N | 每周一组：周标题「第 N 周 · M 场」＋周内日页签与逐日面板 | `week_number` | 3（`:2011`、`:2078-2080`） |
| 日页签 | 「全部」＋周一…周日八钮，无安排的日压暗 | `DAY_LABELS`（`:1632`） | 6（`:2013-2018`） |
| 日面板 ×7 | 一日一组，可含多场；无安排的日出一句「周X 不排训练」 | `day_of_week`、`sessions[]` | 4（`:2024-2027`、`:2076`） |
| 场次卡 ×N | 头行「周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏」＋卡内动作表 | `session_label`／`time_start`／`time_end`／`total_sets` | 7（`:2036-2042`） |
| 动作表 | 4 列明细（动作＋副行／部位徽章／组数×次数／重量），见 §2 | `movements[]`＋`sets[]` | 24（`:2046-2069`） |
| 空动作行 | 「暂无动作」 | `movements` 为空 | 1（`:2071`） |
| 休息日卡 | 「周X · 休息日」＋主动恢复 | `is_rest_day` | 3（`:2026-2029`） |
| 页脚 | 数据来源一行 | `meta.source`／`wake_word`／`generated_at` | 4（`:669-672`、`:2152-2153`） |
| 复制区 | 复制数据＋复制日志 | 见 §4 | 2（`:2160-2161`；`:978-1000`） |

## 二、版式

- 布局：`.app` 宽 900px 居中（`:514`；本页 `box-sizing:border-box` ＋ `max-width:900px`，含内边距的总宽＝900）；
  卡片＝白底＋1px 线＋16px 圆角＋阴影，场次卡 `.ilw-session`（老 `.session` `:532`）与休息日卡同族，休息日卡居中（`:537-538`）。
- 配色：本页把老页 `:root` 那 11 个 token 名映到本仓冻结 token（`.ilw-app` 作用域内的别名，见
  `render/workoutPlanCss.ts` 件头映射表：`--ink→--fg`、`--ink2→--fg2`、`--ink3→--fg3`、`--card`／`--line` 同值直取、
  `--accent→--blue`（Q12 锁 B1）、`--green→--ok`、`--bg→--bg`）；老页 `--lineS:#e8e8ed` 无冻结对应，照老值写死。
- **部位＝彩色徽章**（老页 `:549` `.part-tag` ＋ `:185-189` `PART_COLORS`）：库中词 → `ilw-pb-<slug>`
  （胸 chest／肩 shoulder／臂 arm／背 back／腿 leg／腹 abs／有氧 cardio，清单外走灰徽章），色值照老页那七个
  十六进制值、alpha 走 `rgba(...,.13)`（等价老页 `色20`）；老页逐格内联 `style`，本页一律落类名，正文零内联样式。
  徽章规则与类名同源生成（`render/workoutPlanCss.ts` 的 `PART_PALETTE`），色板只有一处。
- 字号：h1 32 → 周标题 16 → 场次名 17 → 正文 13 → 副行 12（老页 11，本页取共享位的 AA 口径 12）；表头 11 小字字距 `.06em`；`.ilw-pb` 10.5。
- 四列（本轮口径；老页基准是五列 `:2046`）：动作＝加粗动作名（`<strong>`）＋**块级副行小字**「部位细化词 · 主要／孤立」（老页 `:2062` 的副行排版）；部位＝彩色徽章；组数×次数＝`setsText`（老页 `:2064` 口径；无 `sets` 写 `—`）；重量＝`weightText`（老页 `:2065` 口径）；数值列右对齐（老页 `:637` 同）。**不印「休息」列**（老页 `:2066` 那一列；库里没有 `movement.rest` 该键，老页自己也恒空）。装配住 `render/workoutMovementTable.ts`，场次卡只调它，装配件不认动作字段。
- **节奏上场次卡头行**（不进表）：老页 `:2062` 把 `note` 整条塞进副行，本轮把备注拆三段——方括号**前**那截（形如 `胸整体`）＝部位细化词进副行；方括号**内**逗号**之后**那截（形如 `20-30 RPM(2-2.5秒/次)`）＝节奏，上移到该场头行尾部，读作 `周一 ｜ 上肢 ｜ 07:00–08:30 ｜ 共 3 组 ｜ 节奏 20-30 RPM(2-2.5秒/次)`；方括号**内**逗号**之前**那截（形如 `W1 10reps×35.0kg`）**丢掉**。没有方括号的备注整条作部位细化词；备注为空或 `—` 时副行只留类型中文化那一项。休息日没有动作表，头行不加节奏。
- 拆两段的依据（生产库 `workout_plans.movements` 264 个动作全量实测，两条都是 **264/264**）：① 方括号内逗号之前那截与**同行** `sets` 逐字一致 ⇒ 丢了不丢信息；② 方括号内的 `W<n>` **恒等于**该行所在周次（分布 66／66／66／66）⇒ 丢了也不丢信息。**节奏摆成一列会整列重复**：96 个有动作的场次里**场内节奏 96/96 恒定**（全库只有 3 种取值），故只上场次卡头行。
- 类型中文化：`type` 取值域只有两种（生产库实测 `iso`×204 →「孤立」、`main`×60 →「主要」），页面上不出现英文原值；清单外的值原样输出，不吞。
- **细化词里混着类型裸词时**（生产库实测 24 个动作写成 `背 iso 主`／`背 iso 补充`，24/24 与该行 `type=iso` 同值）：先把裸词按同一张表中文化，再删掉那个与副行第二段**同字**的词，其余逐字保留 ⇒ 副行读作 `背 主 · 孤立`／`背 补充 · 孤立`。依据是同一句话不许印两遍英文原值（正文零 `main`／`iso` 裸词）。
- 交互态：周页签激活＝主色字＋下划线（老 `:523-526`）；日页签激活＝深底白字（老 `:554-556`）；非激活面板隐藏（老 `:527-529`）。
- 区块接口：标题 `renderPageShell`、指标 `renderKpiGrid`、表 `renderDataTable`（`align:'right'`）、副行小字 `renderCaliberLine`（共用位现成的 12px ＋ `--fg2`，达 AA 对比度；原型里的 `#86868b` 正文小字因 3.62:1 不达标，已被共用样式表否掉）；页签、部位徽章与卡内版面共享区块里没有对应件 → 落在本族页内样式（`render/workoutPlanCss.ts`）与页签装配（`render/workoutPlanLook.ts`），未动 `base-*`。

## 三、页签的静态替代（零内联脚本）

**采用的方案：选钮式（`input[type=radio]` ＋ `label` ＋ 兄弟选择器）**，两级都是它：
一级周用一组 `name="ilw-wk"`，二级日**每周一组** `name="ilw-dy-<周序号>"`；面板与选钮同父同级，
规则由 `render/workoutPlanCss.ts` 按周数逐条生成（`#id:checked~.面板`）。首屏「全部周次／全部」
两枚默认选中 ⇒ 各周各日全展开。

- 为什么不用 `:target` 锚点式：① 两级同时用会抢同一个 `#` 锚点（选了周就没法再表达日），且会改地址栏、
  触发跳转滚动；② 选钮式**默认态无选中也能全展开**（本页把它钉成显式默认，“全部”那枚 `checked`），
  而 `:target` 的默认态没有锚点、也没法给页签自身盖激活样式（要靠 `:has()`，多一层浏览器版本前提）。
- 为什么不用 `<details>`：`<summary>` 只能表达「折／展」，做不出老页的胶囊页签与激活态，且周／日两级
  `<details>` 嵌套时打不开「只显示某一天」的语义（要显示的那天在收起的那周里）。
- **可搜可打印**（内容都在 DOM 里，不靠脚本显示）：面板 HTML 全量落盘；首屏默认全展开，浏览器查找
  能命中任一场次；打印时页签藏起来、两级面板一律展开（`@media print`），纸上拿到的是完整计划。
- 键盘可达：选钮留在文档流里（视觉上 1px 裁掉），Tab 进组、方向键换周／换日；`:focus-visible` 给对应
  `label` 描边（逐 id 生成规则）。
- 已知代价（如实记账）：点了某周／某日之后，浏览器查找只找得到当刻可见的那部分——回到全展开需点
  「全部周次／全部」；这也是 `default-open` 这一默认值的用意（不点就永远是全文）。


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
| `movements[].note` | `PlanMovement.note?: string`（`planStore:39-40`） | 一致（方括号拆段见 §二） |
| `movements[].rest` | 缺（老页载荷亦无此键） | 缺 |
| `movements[].sets[]`（长度即组数） | `PlanMovement.sets?: { reps; weight; unit }[]`（`planStore:41-42`） | 一致（已类型化） |
| `sets[].reps`／`weight`／`unit` | `sets` 元素三键（`planStore:42`） | 一致（「组数×次数」「重量」两列用它） |
| `data.current_week` | 缺（可用 `weekOfDate(start_date, 今天)` 自算，`planPlate:32`） | 缺 |
| `data.mode` | 缺（新侧由命令决定，不进载荷） | 缺 |
| `data.meta.source`／`wake_word`／`generated_at` | 缺（页脚来源行改由 `opts.key`／`command`／`wakeWord` 与 `nowStamp()` 拼，`workoutPlanDocs:114-119`） | 缺 |
| `data.review.today.*` | 缺（184 载荷为 null；复盘走 `buildExerciseReview` 另一命令） | 缺 |
| `data.scene.snapshot.*` | 缺（复制数据载荷，见 §4） | 缺 |
| `data.copy_log.*` | `CopyLogFields` 可映射（见 §4） | 可映射 |

**「缺」字段清单**：`config.version`、`config.description`、`config.start_date`、`days[].day_label`、`movements[].rest`、`current_week`、`mode`、`meta.source`／`meta.wake_word`／`meta.generated_at`、`review.today.*`、`scene.snapshot.*`。
