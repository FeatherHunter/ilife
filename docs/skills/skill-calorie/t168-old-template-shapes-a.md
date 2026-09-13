# t168 三张老 HTML 模板的真实形状（A 组）

调查对象（只读输入）：

- `D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`（36485 字节）
- `D:\2Study\StudyNotes\SKILLS\卡路里\templates\plan_builder_wizard.html`（38186 字节）
- `D:\2Study\StudyNotes\SKILLS\卡路里\templates\contraindication_report.html`（22654 字节）

## 一、workout_plan_view.html

### 1. 它是什么

这是「看训练计划」这一大家族的**唯一**页面交付文件：13 个唤醒词共用同一张 HTML 骨架，靠 `--mode` 决定页面里哪几块真正出内容。用户视角是「我打开一个页面，标题写着健身计划，下面看到我这一周／今天该练什么、练完了没有、跟计划差多少」。它不是一张静态报表 —— 同一份文件在 `full` 模式下是完整的多周计划书（周标签页 + 天标签页），在 `today`／`day` 模式下是「今天该练的动作表 + 实时完成进度条」，在 `vs`／`completion`／`missed`／`movement` 模式下又变成复盘报表。所有 DOM 都由内联 JS 按 `data.mode` 现场拼出来（`render_workout_plan.py:967` 的 `_render_html` 只做「读数据 → 序列化 → 注入」）。

### 2. 版块

模板骨架本身是一串空槽 + 页脚（`workout_plan_view.html:159-179`）：页头里的 `#planTitle` / `#planSubtitle` 和 11 个内容容器全部由 JS 现场填。装配顺序（也就是主入口 `workout_plan_view.html:690-707` 的调用顺序）：

1. **页头** `div.header` → `#planTitle` / `#planSubtitle`（`workout_plan_view.html:160-163`）
2. **今日复盘条** `#reviewContainer`（只在 `--include-review` 时出内容，`render_review` 区块）
3. **今日／某天训练明细** `#todayContainer`（`today` / `day` / `week` 模式）
4. **KPI 卡片区** `#kpiContainer`（`overview` 模式：周期进度条 + 7 张 KPI 卡 + 每周完成率列表）
5. **单周完成度提示** `#weekListContainer`（`week` 模式）
6. **计划 vs 实际** `#vsContainer`（`vs` 模式：总完成度 + 偏差 + 动作级对比表）
7. **每周完成率折线** `#completionContainer`（`completion` 模式）
8. **未完成训练清单** `#missedContainer`（`missed` 模式）
9. **动作完成率 TOP 榜** `#movementContainer`（`movement` 模式）
10. **单动作反查** `#actionContainer`（`action` 模式）
11. **周标签页** `div.tabs#weekTabs`（`full` / `week`）
12. **周内容区** `#weeksContainer`（每周：7 个天标签 + 每天一个训练段块，表头是「动作／部位／组数×次数／重量／休息」）
13. **页脚** `div.footer > #srcLine`，文案「📊 数据来源: workout_plans · <唤醒词> · <日期>」（`workout_plan_view.html:710-711`）
14. **操作条** `#actionbar-zone`（body 末尾，由共享 JS 填按钮，`workout_plan_view.html:718-719`）

注意：块 2–10 是**同一个容器列表的互斥使用**，非当前 mode 的容器会被 JS 清成空字符串（如 `workout_plan_view.html:248-249`、`299`）。所以一个页面实际可见的块数是 3–4 个，不是 14 个。

### 3. 它吃的数据

数据形状来自 `render_workout_plan.py` 的 10 个 `build_*_data`。外层是 Base 信封 `{status, data, message}`，模板在 `workout_plan_view.html:681-684` 解信封（裸数据形态兜底当 ok）。

顶层公共槽：

- `mode` — 决定哪几块渲染；取值 `full` / `week` / `today` / `day` / `overview` / `vs` / `completion` / `missed` / `movement` / `action`（`render_workout_plan.py:41-52`）
- `config` — 计划头：`title`、`version`、`description`、`total_weeks`、`start_date`（`render_workout_plan.py:72-76`）
- `meta` — 仅供页脚与复制日志：`generated_at`、`wake_word`、`source`、`chain`、`render_cmd`（`render_workout_plan.py:1030-1036`）
- `weeks` — 周数组，一周一行（`render_workout_plan.py:80-106`）：`week_number`；`days` 里一天一行（`day_of_week`、`day_label` 周一…周日、`sessions`）；`sessions` 里一个训练段一行（`session_index`、`session_label`、`time_start`、`time_end`、`is_rest_day`、`total_sets`、`movements`）；`movements` 里一个动作一行（`name`、`part`、`sets` —— `sets` 是 `[{reps, weight, unit}]` 列表）

各 mode 独有槽：

- `full`：`current_week`（今天落在第几周，用来默认激活周标签，`render_workout_plan.py:160`）
- `week`：`focus_week`、`completion {week_number, plan_sets, actual_sets, completion_rate, plan_days}`（`render_workout_plan.py:140-147`）
- `today` / `day`：`date`、`plan_week`、`is_rest`、`unstarted`、`start_date`、`sessions[].movements[]` 换成**扁平原语**形态（`sets` 是数字、另有 `sets_done` / `reps` / `weight` / `unit`，`render_workout_plan.py:237-243`）、`completion {plan_sets, done_sets, remaining_sets, rate}`（`render_workout_plan.py:270-275`）
- `overview`：`kpi {total_weeks, overall_rate, training_days, total_sessions, total_movements, current_week, remaining_weeks, remaining_training_days, period_status, period_start, period_end}`；`period_status` 三态 `unstarted` / `active` / `finished`；`weekly_rates[]` 每项 `{week_number, completion_rate}`（`render_workout_plan.py:311-328`）
- `vs`：`start_date`、`end_date`、`completion_rate`、`deviation`（完成率减 100）、`movement_rows[]` 一行 `{movement, plan_sets, actual_sets, deviation_pct}`（`render_workout_plan.py:429-444`）
- `completion`：`weekly_rates[]`（每周完成率折线）
- `missed`：`days`、漏练行 `{date, plan_week, dow_label, plan_sets, done_sets, movements}`（`render_workout_plan.py:488-493`）
- `movement`：`days`、排行行 `{movement, plan_sets, done_sets, rate}`（`render_workout_plan.py:530-533`）
- `action`：`query`、`positions[]` 一行 `{week, day_of_week, dow_label, session_label, time, name, part, sets, reps, weight, unit}`、`summary {weeks_with, times_per_week, total_sets, parts, weight_min, weight_max}`、`next_date`、`next_week`、`candidates[]`、`error`（`render_workout_plan.py:595-634`）

`movements` 有**两种形态**是这份数据最危险的地方：`full`/`week`/`overview` 走形态 1（`sets` 是对象列表），`today`/`day` 走形态 2（`sets` 是组数、外层带 `sets_done`/`reps`/`weight`）。渲染器用 `_fmt_movement_line`（`render_workout_plan.py:662-683`）分流，模板侧则在 `renderToday` 和 `renderWeeks` 里各写一套。

### 4. 可交互的东西

- **周标签按钮** `#weekTabs button.tab`（`workout_plan_view.html:553-557`）：切周，`data-wk` 由 `bindWeekTabs()` 绑上，点的周加 `.active`
- **天标签按钮** `button.day-tab`（`workout_plan_view.html:571-575`）：每周一组周一…周日，点第 N 天就显示 `[data-day="d<周序>_<星期>"]` 那一个 `div.day-content`，其余 `display:none`（`workout_plan_view.html:656-668`）。**默认激活周一**，`full` 模式另外把当前周激活（`workout_plan_view.html:703-704`）
- **底部两个复制按钮**：底部只有 `<div id="actionbar-zone"></div>`，内容由共享 JS 的 `window.actionBar(window.__P__)` 现场生成（`workout_plan_view.html:719`）。按仓库 2026-08-10 #42「全局双按钮规则」，这里出的是**「复制数据」+「复制日志」**：
  - 复制数据 —— 用户口径，文本由渲染器的 per-mode `_snapshot_*` 组装（`render_workout_plan.py:709-747` 等），内容形状是 `摘要行 + 每节 heading/rows`，`full` 模式下逐周逐天逐训练段列动作明细；动作行文案「深蹲 · 腿 · 10次×50kg · 0/1 组」
  - 复制日志 —— 排障口径，带 `meta.chain` / `meta.render_cmd` / `meta.source` / 注入时间
  - **模板里没有自己的复制数据／日志按钮**（`tests/test_base_pipeline.py:250` 明确断言不许出现旧 `id="copyDataBtn"`），改版时必须继续走 Base 的 actionBar，不要自己写
- **没有任何输入框、表单、菜单**：整张模板一个 `<input>` / `<select>` / `<textarea>` 都没有，全部只读展示

### 5. 空态／缺失态

- 整个 payload 解析失败 → `document.body` 直接换成 `window.errorReceipt({message:'数据加载失败'})`（`workout_plan_view.html:673-677`）
- 信封 `status` 不是 `ok` / `warn` → 换成 `errorReceipt({message: message || '数据错误'})`（`workout_plan_view.html:685-688`）
- 渲染器侧没有计划（`build_full_data` 返回 `None`）→ 不产 HTML，直接返回纯文本「尚未制定健身计划。」（`render_workout_plan.py:1024-1025`）
- 日期参数非法 → 纯文本 `⚠️ 日期格式无效: ...`（`render_workout_plan.py:1018-1020`）
- `today` / `day` 且日期早于计划起始日 → 一块 `div.session.rest-day`，写「计划尚未开始 / 起始日 YYYY-MM-DD」（`workout_plan_view.html:249-252`）
- `today` / `day` 且是休息日 → `rest-day` 块「YYYY-MM-DD · 休息日 / 主动恢复,不练力量」（`workout_plan_view.html:253-256`）
- `overview` 无 `weekly_rates` → 一行「暂无计划数据」（`workout_plan_view.html:348`）
- `action` 查不到该动作 → 「计划中无「<查询词>」」加最多 6 个候选动作 chip（`workout_plan_view.html:484-487` + `render_workout_plan.py:605`）
- `full` 且 `weeks` 为空 → 周标签与周内容区都不渲染，页面只剩页头（`workout_plan_view.html:701-707`）
- 完成率 `null` 的显示是 `—`（`fmtRate`，`workout_plan_view.html:198-201`）

### 6. 照抄时要注意的

- **容器顺序不能改**：14 块的先后就是 DOM 顺序，`todayContainer` 永远在 `kpiContainer` 上面。互斥清空的写法（非当前 mode 置空字符串）要保留，否则会漏出上一个 mode 的残留。
- **`mode` 是唯一的分流开关**，且渲染器必须同时把 `mode` 写进 data 和把场景名写进 `meta.wake_word`（`render_workout_plan.py:974-976`），两处不一致会出现「复制数据头部永远是看训练计划」的老 bug。
- **计算列不能省**：`renderToday` 里每个动作的 `rate = done/total*100` 是**模板侧算的**（`workout_plan_view.html:283`），数据里没有；进度条颜色阈值也是模板侧定的（`>=100` 绿、`>=30` 黄、否则红，`workout_plan_view.html:267`）。`overview` 的周期百分比 `cw/tw*100` 同样在模板里算（`workout_plan_view.html:306`）。
- **日期推导在渲染器侧**：`_calc_week_number(target_date, config)` 负责把日期换算成第几周（`render_workout_plan.py:110`），`_period_progress` 负责算剩余周数与剩余训练日（`render_workout_plan.py:331-387`），`today` 和 `day` 只有 `mode` 一字之差、共用 `_build_day_data`（`render_workout_plan.py:196`）。重写时不要把这段日期推导搬到前端。
- **`action` 的重复周折叠**：一周里同一天多次出现同一动作时，`positions` 要保留全部位置但周数只算一次（`render_workout_plan.py:624-634`），模板用「每周相同（覆盖第 X-Y 周）」一句话概括（`workout_plan_view.html:526-527`）。
- **中文字串里的逗号是全角还是半角并不统一**：「主动恢复,不练力量」用半角逗号（`workout_plan_view.html:254`），「主动恢复，不练力量」用全角（`workout_plan_view.html:585`）。若测试做字面比对，这些字串要逐字照抄。
- **部位色板是模板常量**：`PART_COLORS`（`workout_plan_view.html:185-189`）在模板里，渲染器不传颜色。新写法要么照抄这张表，要么把颜色挪进数据。

## 二、plan_builder_wizard.html

### 1. 它是什么

这是「定训练计划」的**预检确认页**（仓库话术里的过程型 HTML）。用户跟 AI 聊完 4 轮（基线／结构／精细／动作）后，AI 已经把计划生成好了但没入库 —— 这张页面把生成结果摊开给用户看：头上一段摘要、六张偏好卡、按周或按部位两种角度的详细计划，底下三个按钮把「我确认了」「我要改偏好」「我要换某个动作」三种意图打成 prompt 让用户粘回 AI 对话框，由 AI 去执行 `plan_generator.py`。它**从头到尾不写数据库**（`plan_builder_wizard.html:486` 明写「HTML 不能直接写入数据库」）。跟第一张最大的区别是：它有一层内存里的编辑态（`userEdits`），用户在页面里加减偏好、换动作，页面本地的数据会立刻变，但只有按下面那三个按钮、AI 真去跑命令之后，改动才落库。

### 2. 版块

骨架见 `plan_builder_wizard.html:450-508`，共 6 块：

1. **页头 HERO**（`header.hero:453-458`）：小标签「健身计划预览」+ 标题 `#title` + 一行副标题 `#subtitle` + 指标条 `#heroStats`
2. **计划偏好区**（`section:461-467`）：标题「计划偏好」+ 提示「AI 根据这 4 轮回答生成 · 可在下方"修改"中调整」+ 六张卡 `#prefs`
3. **视图切换 + 计划详情**（`section:470-480`）：标题「计划详情」+ 两个切换按钮 `#viewByWeek` / `#viewByPart` + 内容区 `#viewContainer`
4. **复制确认指令区**（`section.copy-section:483-497`）：说明段 + 三个按钮 `#btnAdopt` / `#btnModify` / `#btnSwap` + 预览框 `#copyPreview`
5. **已改摘要区**（`#changesSummary:500-503`，默认 `display:none`）：标题「📝 你已改的内容」+ 计数 `#changesCount` + 列表 `#changesList`
6. **页脚**（`footer:505`）：固定字串「卡路里 Skill · 健身计划预览 · 2026-07-23 · G6」+ 悬浮回顶按钮 `#backTop`

再加 body 末尾的 `#actionbar-zone`（`plan_builder_wizard.html:1057-1058`）—— 由 Base 的 actionBar 填「复制数据／复制日志」两个按钮，与三个业务按钮是两套东西。

### 3. 它吃的数据

渲染器是 `render_plan_builder.py`，它**不做任何查库**：`--mock` 是必填参数，直接读一个 plan JSON 文件（`render_plan_builder.py:37-38`）。`normalize()` 决定模板最终拿到的四个顶层槽（`render_plan_builder.py:88`）：

- `summary` —— `plan_title`（页头大标题）、`version`、`total_weeks`、`total_sessions`、`total_sets`、`estimated_hours`、`created_at`（fixture 见 `tests/fixtures/mock/mock_plan_builder.json:2-10`）。`total_sessions` / `total_sets` 缺失时由渲染器数出来兜底（`render_plan_builder.py:78-85`）
- `preferences` —— `weeks`、`days_per_week`、`sessions_per_day`、`session_minutes`、`primary_parts`、`split_type`、`equipment`（`mock_plan_builder.json:11-19`）
- `weeks[]` —— 一周一行 `{week_number, days[]}`；`days[]` 一天一行 `{day_of_week, day_label, sessions[]}`；`sessions[]` 一个时段一行 `{session_label, time_start, time_end, total_sets, movements[]}`；`movements[]` 一个动作一行 `{name, part, sets, reps, weight, rest}`（模板侧逐字段读的见 `plan_builder_wizard.html:836-861`）
- `movements_catalog` —— 部位到动作名的字典 `{"胸": [...], "背": [...], ...}`（`mock_plan_builder.json:20-26`）。**这一槽是「换某动作」功能的全部燃料**：下拉候选就是 `MOVEMENTS[该动作的 part]` 去掉自己、取前 4 个（`plan_builder_wizard.html:841`）

模板侧的四个常量：`SUMMARY`、`PREFS`、`WEEKS`、`MOVEMENTS`（`plan_builder_wizard.html:518-521`）。注意它们**直接从 `DATA.data` 解包，没有解 status 信封**（对比第一张模板有 `isEnvelope` 判断）—— 说明这张走的是 `render_template` 的老路径（`render_plan_builder.py:100`）。

### 4. 可交互的东西

三个复制按钮在 `plan_builder_wizard.html:491-495`，每个对应一个 prompt 构造函数：

- **「✓ 采纳计划」`#btnAdopt`** → `copyAdopt()` → `buildAdoptPrompt()`（`plan_builder_wizard.html:934-957`）。复制内容：计划摘要一行（标题/版本/周数/场数/组数）+ 偏好行 + 设备行 + 「执行命令」两行（`plan_generator.py write-plan --input plan.json` 与 `plan_generator.py save`）+ 「数据来源: 4 轮对话(基线/结构/精细/动作) + plan_generator 生成的 JSON · render_plan_builder.py · <日期>」。若用户已在页面里改过东西，中间会插一段「📝 用户在 HTML 内已改: N 个动作替换, M 项偏好调整 / 这些是用户已确认的最终态,直接按这个执行」
- **「⚙️ 修改偏好」`#btnModify`** → `copyModifyPrefs()` → `buildModifyPrefsPrompt()`（`plan_builder_wizard.html:959-992`）。复制内容：**用 `getPref()` 取的最新值，同时把原值一并带出**（「周数: 10 (原本 8)」四行，`plan_builder_wizard.html:972-975`）+ 设备 + 若有动作替换则加一句「另外还有 N 个动作替换,详见"换动作"按钮的 prompt」+ 三行执行命令（`apply-edits --preferences '<JSON>'`、`generate-plan --output plan_v2.json`、`render_plan_builder.py --input plan_v2.json`）
- **「↔ 换某动作」`#btnSwap`** → `copySwapMove()` → `buildSwapMovePrompt()`（`plan_builder_wizard.html:994-1020`）。复制内容：替换清单的 **JSON（2 空格缩进）**，每条 `{week, dayOfWeek, dayLabel, sessionLabel, old, new}` + 执行命令 `apply-swaps --swaps '<JSON>'`（**JSON 里的单引号会被 `'\\''` 转义**，`plan_builder_wizard.html:1015`）+ 同样的两条后续命令

预览框 `#copyPreview`（`plan_builder_wizard.html:496`）由 `updatePreview()` 驱动（`plan_builder_wizard.html:1022-1033`）：**有改动就预览「修改偏好」文本，没改动就预览「采纳」文本**。三个按钮本身的文案在复制成功后会变成回执（`✓ 已采纳 · 复制成功` / `✓ 已复制偏好修改指令` / `✓ 已复制动作调换指令`）。

其余交互：

- **偏好加减按钮**：每张可改的卡下面一排 `button.pref-btn`（周数 −4/−1/+1/+4，每周 −1/+1，每天 −1/+1，每场 −15/−5/+5/+15），走 `adjustPref()`，`Math.max(1, cur+delta)` 兜底最小值 1（`plan_builder_wizard.html:533-539`）。改过之后卡片上多出一个 `↺` 复位按钮
- **两张不可改的卡**：「分化」和「设备」只读，标注「AI 决策 · 暂不可改」（`plan_builder_wizard.html:746`、`751`）
- **视图切换**：「按周查看」/「按部位查看」两个按钮（`plan_builder_wizard.html:475-478`），`switchView('week'|'part')` 二选一重绘 `#viewContainer`
- **周标签按钮**：`button.week-tab`，`onclick="showWeek(i)"`（`plan_builder_wizard.html:783-788`）
- **「⇄ 换」下拉菜单**：每个动作行最后一列一个按钮，点开 `div.move-swap-menu`，菜单里是该部位其它候选动作的按钮（最多 4 个，`plan_builder_wizard.html:845-850`）。点候选走 `doSwap()` → `swapMove()`，**同时更新 `userEdits.swaps` 和 `WEEKS[...].movements[...].name`**（`plan_builder_wizard.html:562-563` 专门为 #318 的旧 bug 加了这行，只登记不更新会导致页面显示的名字还是旧的）。同一动作重复替换会先踢掉旧条目（`plan_builder_wizard.html:550-552`）。点页面空白处关菜单（`plan_builder_wizard.html:593-595`）
- **已改摘要区的 `↺` 撤销按钮**：偏好改动走 `resetPref(key)`，动作替换走 `undoSwap(i)`（`plan_builder_wizard.html:621`、`632`）
- 全页**没有任何表单输入框**（没有 text/number input、没有 select），所有「输入」都是按钮加减和菜单选点

### 5. 空态／缺失态

- `DATA` 为 null（payload 没注入或解析失败）→ 只把标题改成「❌ 数据加载失败」，**页面其余部分照旧渲染骨架**（`plan_builder_wizard.html:662-666`）—— 这是三张里最弱的一种失败处理
- `WEEKS` 为空 → `#viewContainer` 显示「无周数据」（`plan_builder_wizard.html:773-775`）
- 某一周没有 `days` → 周内容区显示「无数据」（`plan_builder_wizard.html:807-810`）
- 某一天 `sessions` 为空 → 该天整行显示「休息日」，配灰点 `span.dot.rest`（`plan_builder_wizard.html:814-823`）
- 某个时段 `movements` 为空 → 不画表格，只留时段头 + 「N 组」（`plan_builder_wizard.html:863-864`）
- 页头／指标条缺字段的兜底是 `?`（`plan_builder_wizard.html:671` 等），不是空白
- 渲染器兜底：JSON 顶层不是 dict → 报「JSON 顶层必须是 dict,实际是 <类型>」；输入文件不存在 → `❌ 渲染失败: 输入文件不存在: <路径>`（`render_plan_builder.py:46-50`、`111-113`）
- `default_plan()` 给的空值是 `{'summary': {'plan_title': '(空)', 'total_weeks': 0, ...}, 'preferences': {}, 'weeks': []}`，注意**不含 `movements_catalog`**（`render_plan_builder.py:91-96`）

### 6. 照抄时要注意的

- **改动只在内存里**：`userEdits` 是模板侧的临时态（`plan_builder_wizard.html:525-528`），三份 prompt 都必须读 `getPref()` 而不是 `PREFS[key]`，否则用户改完偏好、复制出来的还是旧值。这是这张页面的核心契约。
- **`getPref` 的判据是 `key in userEdits.preferences`，不是真值判断**（`plan_builder_wizard.html:530-532`）—— 因为 `0` 或空值也算「改过」。
- **「换动作」的两个副作用必须同时发生**：登记 `userEdits.swaps` 与就地改 `WEEKS[...].name`（`plan_builder_wizard.html:562-563`），少一个就会出现「清单里有、页面没变」或反过来的错位。
- **换动作候选只取同部位前 4 个，且要剔除动作自己**（`plan_builder_wizard.html:841`）。候选为空时连「换」按钮都不画（`plan_builder_wizard.html:848-850`）。
- **三个 prompt 都是「场景 + 数据 + 期望 + 来源」四段式**，且末行固定带 `数据来源:` 与 `render_plan_builder.py` 的字样。复制数据按钮（Base actionBar）与这三个业务按钮是并列的两套，别合并。
- **按部位视图的排序是固定的** `['胸','背','腿','肩','臂','腹']`（`plan_builder_wizard.html:901`），`filter` 掉没出现的部位。数据里若出现「有氧」等表外部位，按周视图有颜色、按部位视图**会整条丢掉**（`plan_builder_wizard.html:902`）—— 改写时要么补进 order，要么明确保留这个行为。
- **部位色板与第一张模板完全重复**（`plan_builder_wizard.html:646-650` 对 `workout_plan_view.html:185-189`），两张用的是同一张 7 色表。
- **两条「避免深层嵌套模板字符串」的注释是有来历的**（`plan_builder_wizard.html:833-834`、`937-938`、`978`）：这个文件被 acorn 解析器扫过，模板字符串嵌套会导致解析错位。重写时若仍要过同一套检查，拼接风格要照顾它。
- **页脚日期是写死的 2026-07-23**（`plan_builder_wizard.html:505`），不是渲染时间。

## 三、contraindication_report.html

### 1. 它是什么

这是「扫禁忌」的**预检确认页**（过程型 HTML），只服务一个唤醒词。它把体检结果——用户计划里所有踩了伤病禁忌的动作——按部位（腰椎／膝关节／肩袖／其他）分组摊出来，每条禁忌写清楚是哪个动作、违反了哪条规则、为什么不行、出现在计划的哪几天。要紧的是它**不是只读报告**：每条命中下面直接给一排安全替代按钮，用户点一个就当场「选定」，全部选完按「复制修改指令」，页面把「原动作 → 替代动作」的清单连同一行 `plan_generator.py update-actions` 命令打包给 AI，由 AI 去改 `workout_plan_config`。所以它的定位跟第 2 张一样，是「用户在这里做决定，AI 负责落库」。

### 2. 版块

骨架见 `contraindication_report.html:286-361`，共 6 块：

1. **页头 HERO**（`header.hero:289-294`）：小标签「禁忌扫描报告 · v2 可改版」+ 标题（写死「健身计划禁忌扫描」，`contraindication_report.html:404`）+ 副标题 `#subtitle`（扫描统计一句话）+ 状态药丸区 `#pills`
2. **扫描概览 KPI**（`section:297-328`）：标题「扫描概览」+ 六张 KPI 卡 —— Sessions `#kpiSessions`、Movements `#kpiMovements`、安全变体 `#kpiSafe`、🔴 Error `#kpiErrors`、🟡 Warn `#kpiWarns`、Total Hits `#kpiHits`（初始值都是 `--`）
3. **命中清单区** `#hitsContainer`（`contraindication_report.html:331`）：由 JS 按部位分组填充，每组一个 `div.part-group`，组内每条一个 `div.hit`
4. **已选替代区** `#selectedArea`（`contraindication_report.html:334-340`，默认不激活）：标题「已选替代 (N)」+ 计数 `#selectedCount` + 「清空全部」按钮 + 列表 `#selectedList`
5. **复制修改指令区**（`section.copy-section:343-357`）：说明段 + 三个按钮 `#btnModify` / `#btnFull` / 清空 + 预览框 `#copyPreview`
6. **页脚**（`footer:359`）：固定字串「卡路里 Skill · 禁忌扫描 v2 可改版 · 2026-07-23 · G5」+ 回顶按钮 `#backTop`

再加 body 末尾的 `#actionbar-zone`（`contraindication_report.html:627-628`）。

比前两张少的是：没有视图切换、没有标签页、没有跨周结构 —— 整页就是「分组清单 + 选择区」两层。

### 3. 它吃的数据

渲染器是 `render_contraindication.py`，**它自己不查库**：要么跑 `scan_contraindications.py --format json` 子进程拿结果（`render_contraindication.py:64-78`），要么用 `--mock` 直接读一个扫描 JSON（`render_contraindication.py:54-62`）。两种来源都兼容 `{summary, hits}` 和 `{data:{summary, hits}}` 两种包法。

模板解包出三个槽（`contraindication_report.html:372-374`）：

- `summary` —— `scan_date`（「2026-07-23 21:50」这种带时分）、`jsonl_plan`（计划版本号）、`scanned_sessions`、`scanned_movements`、`safe_skipped`（白名单豁免数）、`total_hits`、`by_severity {error, warn, info}`、`summary_status`（`fail` / `warn` / `ok`，决定页头挂什么药丸）（`mock_contraindication.json:2-14`）
- `hits[]` —— **一条命中一行**：`movement_name`（动作名）、`part`（`腰` / `膝` / `肩` / 其他 —— 注意这是**禁忌部位**，跟第 1、2 张模板里的训练部位是两套词汇）、`rule_name`（规则名）、`severity`（`error` / `warn` / `info`）、`reason`（人话解释）、`used_in`（字符串数组，形如 `["W1D1(下午·胸)", "W1D3(晚上·胸)"]`）（`mock_contraindication.json:16-41`）
- `safe_variants[]` —— 字符串数组，替代动作候选。**渲染器负责补这一槽**：数据里没有就从 `contraindications/soft_rules.py` 的 `SAFE_VARIANTS` 拉，拉不到就给四条写死的兜底（`render_contraindication.py:81-94`）。这一槽对全部命中通用，不区分部位，也不排除动作自己。

`enrich_with_safe_variants` 只在缺失或为空时才补（`render_contraindication.py:83`），所以上游扫描器若已经给了 `safe_variants`，以扫描器的为准。

### 4. 可交互的东西

- **安全替代按钮** `button.alt`（`contraindication_report.html:475-479`）：每条命中下面一排，文案就是替代动作名，带 `data-hit-index` / `data-alt` / `data-original` 三个属性。点击不是 inline onclick，而是 `#hitsContainer` 上的**事件委托**（`contraindication_report.html:386-395`）—— 这是为了绕开「inline onclick + escapeHTML 实体冲突」的旧 bug（`contraindication_report.html:470`、`385`）。已选中的按钮加 `.selected` 类
  - 点同一个 → 取消选择；点同一条命中的另一个 → 换掉原来那个；首次点 → 新增一条（`toggleAlt()`，`contraindication_report.html:498-514`）
  - **一条命中最多只能有一个替代**（判据是 `hitIndex`，`contraindication_report.html:499`）
- **已选项的「×」按钮**：`removeSelected(i)`，从已选清单里去掉第 i 条（`contraindication_report.html:536`）
- **「↺ 清空选择」按钮**（`contraindication_report.html:354`）：`clearAll()`，清空 `selectedReplacements` 并重绘三处（`contraindication_report.html:516-521`）
- **「📋 复制修改指令」`#btnModify`** → `copyModify()` → `buildModifyPrompt()`（`contraindication_report.html:553-577`）。**一个替代都没选就直接 return，什么都不复制**（`contraindication_report.html:606-609`）。复制内容分两段：
  1. 人读的一行行清单：`1. 原动作: 杠铃硬拉 → 用于: W1D1(下午·胸), W1D3(晚上·胸)` 换行接 `替换为: 支撑式(重力卸力)`（`contraindication_report.html:555-556`）
  2. 开头一句「我刚扫了禁忌,发现以下 N 个禁忌动作,已逐一选定安全替代。请帮我修改 workout_plan_config:」+ 执行命令 `python scripts/plan_generator.py update-actions --replacements '<JSON>'`（JSON 里的单引号同样做 `'\\''` 转义，`contraindication_report.html:575`）+ 末行「数据来源: 禁忌扫描 v2 + 用户手动选择 · <日期>」
- **「📊 完整报告」`#btnFull`** → `copyFull()` → `buildFullPrompt()`（`contraindication_report.html:579-597`）。复制内容：**全部命中**（不看选没选）一行一条 `1. [error] 杠铃硬拉 → 用于: W1D1(下午·胸) → 髋铰链轴向压力`，头部是 `Scan Date / Plan / Sessions / Movements / 安全变体豁免 / Error / Warn / Info` 的统计块，末行「数据来源: 禁忌扫描 v2 · <scan_date>」。**这条没有执行命令**，纯报告
- **预览框 `#copyPreview`**：`updatePreview()` 按「选了就用修改指令文本、没选就用完整报告文本」切换（`contraindication_report.html:600-603`）
- **按钮回执**：复制成功后按钮文案变 `✓ 已复制修改指令` / `✓ 已复制完整报告`（`contraindication_report.html:610`、`614`）
- 同第 2 张：**全页没有任何输入框或下拉菜单**，唯一的「输入」就是点替代按钮

### 5. 空态／缺失态

- `DATA` 为 null → `document.body` 换成 `window.errorReceipt({message:'数据加载失败'})`（`contraindication_report.html:398-401`）
- `hits` 为空 → `#hitsContainer` 换成共享控件的空态：图标 `✅`、「未发现禁忌动作」、「所有动作都在安全范围内」（`contraindication_report.html:436-439`）。KPI 卡仍然显示，值全是 0
- `summary_status` 既不是 `fail` 也不是 `warn` 也不是 `ok` → **`#pills` 里只挂「豁免 N 个」那一个药丸**，没有状态药丸（`contraindication_report.html:411-418`）
- 命中缺字段的兜底文案：`movement_name` 缺 → `?`；`rule_name` 缺 → 整个规则行不渲染；`reason` 缺 → 「禁忌原因未填」；`used_in` 空 → 「📍 用于」整行不渲染（`contraindication_report.html:487-492`）
- `safe_variants` 为空 → 每条命中下面的替代选择块**整个不出现**（`contraindication_report.html:471`、`482`），页面退化成只读报告
- `selectedReplacements` 为空 → `#selectedArea` 不带 `.active`（默认隐藏），`#copyPreview` 自动切到完整报告（`contraindication_report.html:525-528`、`602`）
- 渲染器兜底：`--mock` 文件不存在 → `❌ 渲染失败: mock 文件不存在: <路径>`；扫描子进程退出码不是 0 或 1 → `scan_contraindications.py 失败: <stderr>`（`render_contraindication.py:56-57`、`76-77`）

### 6. 照抄时要注意的

- **部位枚举是禁忌部位，不是训练部位**：`partOrder = ['腰','膝','肩','其他']`（`contraindication_report.html:451`），显示名做过映射 `{腰:'腰椎', 膝:'膝关节', 肩:'肩袖', 其他:'其他'}`（`contraindication_report.html:450`）。落在 `partOrder` 之外的部位**整组丢弃**，跟第 2 张按部位视图是同一个坑。注意渲染器接收的是 `腰/膝/肩/all` 这套短名（`render_contraindication.py:42`）。
- **`hitIndex` 是 `hits` 数组的下标，是这条页面全部状态的唯一标识**：`selectedReplacements` 用 `{hitIndex, originalName, alternative, usedIn}` 记选择（`contraindication_report.html:509`），`renderHit` 靠它回填 `.selected`。重写时若改成别的标识（比如动作名），同一条动作在多个部位重复出现的情况会串。
- **事件委托不能退化成 inline onclick**：`contraindication_report.html:385`、`470` 两处注释都指向同一个已修 bug。替代按钮的值里可能有括号、全角字符、引号，必须走 `data-*`。
- **两条 prompt 的口径不一样**：`buildModifyPrompt` 只列**用户选过的**、带 `→ 用于` 位置、带执行命令；`buildFullPrompt` 列**全部命中**、用 `→ 规则名` 收尾、不带命令。别合并成一个函数。
- **`copyModify` 的空选守卫是「静默 return」**（`contraindication_report.html:606-609`）。原文里那段 `if` 体内是空白的 —— 早先版本大概是要弹提示，现在什么都没做。照抄时要决定是保留静默还是补回 `contraindication_report.html:551` 那句已经写好但**当前没人调用**的提示文案「⚠️ 你还没选任何替代 · 请在每个 ERROR 禁忌动作下方选择至少 1 个安全替代,再点"复制修改指令"。」这是一个现成的悬空字符串。
- **`safe_variants` 是全局共享的候选池**，不按部位过滤、不排除动作自己（对比第 2 张「换动作」是取同部位、去自己、截前 4 个）。数据里若出现明显不合适的候选（比如肩部动作用的腰椎替代），这是数据侧的取舍，不是模板 bug。
- **替代选择只对 `severity: 'error'` 有意义，模板并不强制**：`safetiesHTML` 对所有 severity 都渲染（`contraindication_report.html:471`），但 `contraindication_report.html:347` 的说明文案写的是「已选 N 个替代,让 AI 修改 plan」。`info` 级命中下面同样会出现替代按钮，照抄时要么保持现状、要么显式按 severity 过滤。
- **KPI 卡的初始值是字面的 `--`**（`contraindication_report.html:305-325`），不是 `0`；JS 跑完才被覆盖。若某个字数上游没给，`|| 0` 会把 `--` 变成 `0`，这个差异在截图比对时会露出来。
- **`safe_skipped` 出现在两个地方**：页头 `#pills` 的「豁免 N 个」和 KPI 卡的「安全变体」（`contraindication_report.html:418`、`423`）—— 同一数据源两处展示，改一处要记得另一处。
- **页头标题是写死的**（`contraindication_report.html:404`），`SUMMARY` 里没有标题槽；「扫描概览」区的提示行「264 动作 · 白名单豁免 64 个」也是**写死的示例文案**（`contraindication_report.html:300`），不是从数据来的。这是这张模板里最容易误当成真数据的两处。

## 三张之间的关系

### 三张共有的东西

1. **同一套注入头**：三张都是 `<style><!--SHARED-CSS--></style>` + 内联 `<style>` + 正文 + 一行三段并排的注入脚本（`<script id="payload" type="application/json"><!--INJECT-DATA--></script><script><!--SHARED-HELPERS--></script><script>window.__P__=...(JSON.parse...)</script>`）。见 `workout_plan_view.html:4`、`plan_builder_wizard.html:4`、`contraindication_report.html:4`；注入行分别是 `181`、`510`、`364`，**三行逐字相同**。
2. **同一套页尾操作条**：`<div id="actionbar-zone"></div>` + 紧跟一行 `window.actionBar(window.__P__)`，三张一模一样（`workout_plan_view.html:718-719`、`plan_builder_wizard.html:1057-1058`、`contraindication_report.html:627-628`）。「复制数据／复制日志」这两个按钮**不属于模板**，是 Base 注入的。
3. **各带一份 `escapeHTML`**：三张各自定义了一份（`workout_plan_view.html:192`、`plan_builder_wizard.html:639`、`contraindication_report.html:376`）。实体表三份一致，**唯一差别是第 1、3 张用 `s ?? ''`、第 2 张用 `s || ''`** —— 传数字 `0` 进去会得到不同结果。这是可以合并的重复。
4. **页脚格式一致**：「卡路里 Skill · <页面名> · 2026-07-23 · <G 编号>」，日期写死（`contraindication_report.html:359`、`plan_builder_wizard.html:505`）；第一张的页脚是活的，写着数据来源与唤醒词（`workout_plan_view.html:710-711`）。
5. **回顶按钮** `#backTop`（`plan_builder_wizard.html:508`、`contraindication_report.html:362`）。第一张没有。
6. **同一个 Apple 风格色板 token 名**（`--bg` / `--ink` / `--accent` / `--line` …），但**取值不同**：第一张的 `--bg:#fbfbfd`，另两张 `--bg:#ffffff` + 一组 `--*-soft` 透明色（`workout_plan_view.html:9-13`、`plan_builder_wizard.html:15-28`、`contraindication_report.html:14-32`）。
7. **过程型 / 结果型的分野**：第 1 张是**结果型**（只读，最多给个复制数据），第 2、3 张是**过程型**（页面里做选择，按了按钮复制 prompt 给 AI 执行）。共同的物理标志是 `div.copy-preview#copyPreview` + `updatePreview()` + `window.copyText(..., 按钮id, 回执文案)` + 按钮文案变成回执。

### 只有一张才有的东西

| 只属于 | 块 |
| --- | --- |
| 第 1 张 | `mode` 十分支调度；周标签页 + 天标签页两级切换；今日复盘条；KPI 卡 + 周期进度条；计划 vs 实际对比表；每周完成率条；未完成训练清单；动作 TOP 榜；单动作反查（含候选 chip 与下次练习日）；per-mode 专属的「复制数据」文本（`_snapshot_*`） |
| 第 2 张 | 偏好卡的可改控件（±/↺）；只读的「分化」「设备」卡；按周／按部位视图切换；`movements_catalog` 驱动的「⇄ 换」下拉菜单；「已改摘要」撤销区；三个业务复制按钮 |
| 第 3 张 | 按**禁忌部位**分组的命中清单；每条命中下的替代选择按钮；「已选替代」区与清空；两个业务复制按钮（无第三个）；以命中序号为准的选择态 |

### 两处真正的不一致（不是风格差异，是契约差异）

1. **解信封的方式**：只有第 1 张做 `isEnvelope = (typeof P.status === 'string')` 判断并按 `status` 报错（`workout_plan_view.html:681-688`），它对的是 #314/#321 的 Base 信封契约。第 2、3 张直接从 `DATA.data.summary` 取（`plan_builder_wizard.html:518-521`、`contraindication_report.html:372-374`），**不看 `status`**。真给一张错误信封，第 2、3 张不会报错，只会把页面渲染成一堆 `?` 和 `0`。
2. **走哪条注入路径**：第 1 张绕过 `render_template`，自己调 `envelope()` + `inject_base()` 并把 per-mode 的 `summary`/`sections` 显式传进去（`render_workout_plan.py:967-984`，`:970-972` 的注释解释了为什么）。第 2、3 张走 `render_template`（`render_plan_builder.py:100`、`render_contraindication.py:98`），因此它们的「复制数据」内容是 Base 的自动快照，**不是**专门写过的文本。三张都改成新写法时，这一层要一起定。

## 不确定

以下是我**没有**查清或只能推断的部分，重写时不要当既成事实用：

1. **共享 JS 的具体实现没读**。`window.actionBar` / `window.copyText` / `window.errorReceipt` / `window.emptyState` / `window.statusBadge` / `window.copyText` 的回执逻辑，全部来自 Base 注入的 `<!--SHARED-HELPERS-->`。我读了三张模板对它们的**调用点**，但没打开那个 JS 包。所以「复制数据／复制日志」两个按钮的**准确文案与各自装什么**，我是按 `tests/test_base_pipeline.py:232-276` 的断言（必须含「复制数据」）和脚本注释里反复出现的「复制数据＝用户口径／复制日志＝排障口径，带 meta.chain/render_cmd/source」推断的，没有逐行核过。
2. **CSS 只看了注释和 :root**。三张的响应式断点、打印样式、`.table-wrap` 溢出行为我都没读；第 1 张有 `table-wrap` 和第 2 张 `movement-table`，窄屏表现未核。
3. **13 个唤醒词到 10 个 mode 的映射过程没查**。`render_workout_plan.py:41-52` 只给了 10 个 mode 各一个场景名（「看周计划」一个名字要兜住看本周／下周／上周／指定周四个唤醒词）。`--week N` 由谁算出来、命令路由在哪一层，我没有顺着读下去。要精确复刻「看下周计划」到第几周，得再查上游命令层。
4. **第 1 张 `render_workout_plan.py` 的中段只看了 grep 结果**（`_build_day_data` 的 SQL 段 202-278、`build_overview_data` 279-330、`_period_progress` 331-390、`build_missed_data` 459-498 等）。字典字段我拿全了，但里面有几处边界（例如 `_count_remaining` 怎么数「从明天起」的训练日）是按行号和片段推断的。
5. **第 2、3 张没有独立的空态截图核对**。空态那一节里「`#hitsContainer` 换成共享控件的空态」这条，我是从 `window.emptyState({icon, text, hint})` 的调用参数读出来的，没跑过渲染。
6. **`movements_catalog` 是否覆盖全部部位未核**。按部位视图的固定序只有 6 个部位（少「有氧」），我据此判断「有氧」类动作会整条丢掉，但这只是读代码的推论，没有用含「有氧」的数据验证过。
7. **第 3 张 `contraindication_report.html:300` 的「264 动作 · 白名单豁免 64 个」是否真的没人改**：我用 grep 找过 `hint` 相关的 id 赋值没找到，所以判断是写死的示例文案，但没有做一次全局的 DOM 操作扫描来百分百排除。
8. **三张之外是否还有别的模板分担这些唤醒词**没有查（只确认了这三个文件存在于 `templates/`，`templates/*` 的列目录 glob 当时返回空，我是按文件名单独定位的）。
