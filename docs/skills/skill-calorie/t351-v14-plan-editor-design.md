# T351-v14 · 定训练计划页（可写页）设计定稿

> 负责人 2026-09-15 逐条口述，本件是**唯一记录地**。动手前先读这页；改动本页＝改动需求。

## 1 负责人给的四条（本轮）

1. **周 1～周日也做成页签切换**——页面是**两层页签**：上排选第几周，下排选周几，一次只显示一天。
2. **第 1 周～第 N 周的周页签是横向滑动列表，不许换行**（周多了往右滑）。
3. **只有第 1 周能增删动作**。第 2 周起，任何一天、任何一次训练：**不能删、不能加**训练段与动作，
   只能调第 1 周排好的那些动作的参数（RM、次数、重量、时长等；**任何动作内参数都可改**，含组数）。
4. **讨论先于生成**（这条是流程，不是页面）：健身计划的讨论环节，在生成「临时可修改的定计划 HTML」**之前**
   要**充分讨论**。**很少遇到用户全新填写**；常见路径是**讨论完成后由 AI 填入定计划 HTML → 用户确认 → 用户微调**。
   ⇒ 落点：① 页面文案要写成「这是 AI 按讨论结果填好的，你微调」而不是「从零填」；
   ② 空态仍是**兜底**（首用/全新填写少见但要能用）；③ 唤醒词侧要靠讨论把参数问全，别把填空全推给页面。

## 2 早前已定、仍然有效的

- **每天 4 段**（负责人 2026-09-15 明确「每天 4 段」）。
- **每段选一个时段**：凌晨／上午／下午／晚上。
- **有氧**：用**一段 set 装时长**（`reps`＝分钟、`weight`＝0、`unit`＝「分钟」）——负责人认可。
- **零分隔符**：页面所有文本不许出现 `|`／`-`／`·` 这类分隔符；日期写成「2026年9月14日」。
  要并列就摆成元素（页签、胶囊、表格列、缩进）。
- 编辑器逻辑住**技能自己的**页面运行时；共享 helpers 只负责复制与反馈（不重复实现它的职责）。

## 3 数据面（真库实测，别再猜）

| 事实 | 值 |
|---|---|
| `workout_plans` 唯一键 | `(week_number, day_of_week, session_index)`——**每次训练一行**，「段」就是一次训练 |
| 一行带什么 | `session_label` ＋ `time_start`／`time_end` ＋ `is_rest_day` ＋ `total_sets` ＋ `movements` |
| 真库时段写法 | `session_label = "上午·胸·3 角度"`（**时段前缀写在标签里**，实测值：上午／下午／晚上／居家） |
| `movements` 键 | 恒为 `name / part / type / note / sets`（全库 264 个动作） |
| `type` 取值域 | **只有 `main`(60) 与 `iso`(204)——计划侧没有有氧类型** |
| `sets` | `[{reps, weight, unit}]`，`unit` 只有 `kg`(220)／`自重`(44) |
| 有氧在哪 | **只在记录侧** `exercise_log`：`category='有氧'`(1437 条) ＋ `duration_minutes`；含 7 条**爬楼机** |

## 4 UI 参照：老实物模板（负责人指定）

`D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`（721 行 35KB，
同目录还有 60 余份老实物，是整条线的观感参照）。

它当年的结构（**两层页签本来就有**）：

- `.app` → `.header`（`h1#planTitle`）→ 各装配容器 → `.tabs#weekTabs` ＋ `#weeksContainer` → `.footer` ＋ `.src`
- **`.tabs`（周）＋ `.day-tabs` ＋ `.day-content`（日）** ← 负责人要的两层页签
- 一节课：`.session`（`.rest-day` 变体）／`.sess-head`／`.sess-name`／`.sess-time`／`.sess-tag`／`.sub`
- 表与卡：`.table-wrap`／`.num-table`／`.part-tag`／`.chip`／`.tags`／`.kpi-grid`／`.kpi-card`／`.kpi-label`／`.kpi-value`／`.kpi-sub`
- 进度类：`.progress`／`.progress-fill`／`.period-row`／`.week-row`／`.week-bar`／`.week-rate`
- 复盘类：`.review-section`／`.review-stat`／`.anomalies`／`.missed-card`／`.no-review`
- 动作建议类：`.action-none`／`.action-cand`／`.action-hero`／`.action-chip`／`.action-next`／`.q`／`.hl`

**负责人本轮指示**：①「看计划」那几张**只读页**整体模仿这份模板的 UI；②定计划页**也可以模仿**它。

## 5 当前状态与下一步

- 已入仓：V14 编辑器（`f13ceed`）＝周页签 ＋ 每天 4 段选时段 ＋ 第 2 周锁定 ＋ 有氧时长 ＋ 零分隔符；
  样张与双端墙在 `.scratch/t351-editor/samples/`，墙生成器 `docs/skills/skill-calorie/t351-v13-editor-wall.mjs`。
- **V14 尚未满足本轮第 1、2 条**：日还是竖排 7 天（要改日页签）、周页签还是换行（要改横向滑动不换行）；
  第 3 条也要收紧（现在锁住的周里「加一次训练」仍可点）。
- 下一步（V15）：按第 4 节的模板把两层页签与观感对齐，并把「讨论先于生成」的文案落进页面。
