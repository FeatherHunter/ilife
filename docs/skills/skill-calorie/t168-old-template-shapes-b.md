# 三张老 HTML 模板的真实形状（b 组）

本文对三张老模板做结构描述，供 TypeScript 重写照抄真实形状。

来源目录：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`

---

## 一、`crud_receipt.html`（写后回执页，26279 字节）

### 1. 它是什么

这是卡路里所有「写操作」做完以后给用户看的那一张回执：告诉用户刚才那一下到底改了哪条数据、改成什么样了、今天累计到多少。用户侧它永远长一个样子——顶部一行时间和类型角标、一句「XX 成功」、一句人话总结，下面是这次操作的字段明细（新增的列出新值，修改的列旧值→新值，删除的列删除前快照），再下面是今日累计，最后一排是撤销按钮和「复制数据／复制日志」。它不挑实体：记一餐、记喝水、改体重、存食品、改训练计划、同步到训记走的都是这同一个 HTML，靠喂进去的数据自己变形。

**归属层的分量**：这张模板不是场景 05 独占。按 `scripts/_triggers.py` 里的 `html_template` 字段统计，全卡路里共有 **6 个场景组、49 个唤醒词**指向 `templates/crud_receipt.html`：

计数口径：`_triggers.py` 里 `html_template` 含 `templates/crud_receipt.html` 的 TRIGGER，按 `category` 分组（2026-08-14 实算：合计 **49**，全表 436 条）。

| 场景组 | 分类 | 唤醒词数 | 谁在渲染 |
|---|---|---|---|
| 02 | 饮食 | 15 | `render_crud_receipt.py`（记一餐／记喝水／复制昨日饮食／改饮食记录／删一餐／删某日饮食／批量删饮食／批量补记／存食品／改食品／下架食品） |
| 03 | 体重 | 5 | `render_crud_receipt.py`（改体重记录／改某日体重／删体重记录／删某日体重／批量删体重） |
| 04 | 运动 | 13 | `render_exercise_receipt.py`（记运动／记力量训练／记有氧运动／记日常活动／补记运动／批量补记运动／复制昨日运动／改运动记录／删运动记录 …） |
| 05 | 健身计划 | 11 | `render_plan_receipt.py`（复制训练计划／定休息日／加训练动作／定一周计划／改训练计划／改某天训练／删某天训练／改动作／撤销训练计划／同步到训记／拉训记实绩） |
| 07 | 身体细节 | 2 | `render_body_delete_receipt.py`（删体脂／删围度） |
| 08 | 基础信息 | 3 | `render_crud_receipt.py`（设置档案／设活动量／改档案） |

合计 49 = 15 + 5 + 13 + 11 + 2 + 3。**4 个不同的 Python 渲染器**共用这一张模板。

场景 05 只是 6 个使用者之一，`render_plan_receipt.py:40` 也只是又一个把 `TEMPLATE_PATH` 指向它的渲染器。所以「哪一层拥有这张模板」不能按场景 05 来切，它是一张跨场景共享的结果型回执页。
### 2. 版块（按 DOM 顺序）

1. **页眉条**（`.meta-bar`，模板 135-138 行）— 左边操作时间 `#metaLeft`，右边固定角标「回执型 · 通用 CRUD」。
2. **大标题 + 副标题**（140-141 行）— `#h1Title` 固定文案「✅ 操作回执」；`#sub` 由脚本拼成「状态徽章 + 实体名 + 动作 + 成功」，如「新增 训练计划 新增成功」。
3. **操作身份证卡**（`.id-card`，143-151 行）— 三件套：图标（✓／✎／✕ 随 op）、动作标题（「新增成功」）、`#record_id`；卡片的配色和描边按 op 变：新增绿、修改橙、删除红（`#idCard.className`，201 行）。卡里还有 `#summaryLine`（152 行起为隐藏），放那句人话总结。
4. **KPI 条**（`.kpi-grid`，153 行）— 4 列小卡，只有 `context.kpis` 非空才 `display:grid`（213 行）；否则整条不出现。
5. **备注行**（`.note-line`，脚本 225-230 行动态插入）— 仅 `op=add` 且 `new_record.note` 非空时出现，长备注从这里走，不塞进 KPI 卡。
6. **字段变更卡**（`.diff-card`，155-158 行）— 三列网格：字段名 + 旧值 + 新值。三种形态共用一张卡：
   - `op=update`：只列真的变了的字段，旧值红删除线／新值绿（302-327 行）；
   - `op=delete`：列 `old_record` 的删除前快照，右侧隐箭头（328-350 行）；
   - `op=create`：列 `new_record` 的新增内容（351-372 行）。
   - 一行都没渲染出来就把整张卡隐藏（325／348／369 行）。
7. **字段影响行**（`.diff-impact`）— 每个字段的 `__impact_<字段>` 文本单独一行挂在对应变更行下方。
8. **今日累计卡**（`.ctx-card`，160-163 行）— `context.totals` 每项一行「标签 / 数值 + 单位 / 占目标百分比」；删除操作一律不显示（375 行 `op !== 'delete'`）。
9. **明细卡**（`.items-card`，165-168 行）— 标题由首行 `label` 动态拼成「📋 已复制明细（已复制 3 条 · 跳过 1 条）」，每行是「时间 / 食物名 / N g / N 卡」，`label='已跳过'` 的行整体降透明度并挂「已跳过」小标签。
10. **底部按钮区**（`.footer`，170-174 行）— 只有一颗「↩ 撤销」，且只有 `meta.undo_cli` 存在时显示（415-429 行）。
11. **动作条**（`#actionbar-zone`，462-463 行）— Base 的 `actionBar()` 把「复制数据／复制日志」两颗 ghost 按钮和场景按钮注进来。

### 3. 它吃的数据

顶层信封（必须 `status === 'ok'`，否则整页替换成 `window.errorReceipt()`，179-181 行）：

```json
{ "status": "ok",
  "data": { "op", "record_id", "old_record", "new_record",
            "context": {"kpis": [], "totals": [], "items": []},
            "meta": {"action_at", "entity_type", "undo_cli"},
            "summary": "" } }
```

通用槽位（每个调用点都有）：

| 槽位 | 含义 |
|---|---|
| `status` | 必须 `'ok'`；不是就直接渲染错误回执页 |
| `data.op` | 动作枚举，只认 `add`/`create`/`update`/`delete` 四种，决定图标、卡片配色、diff 卡形态、撤销提示语 |
| `data.record_id` | 记录编号，渲染成 `#<id>`；计划回执传 `None` 会显示 `#null` |
| `data.old_record` | 改前／删除前快照，一个实体一条（dict，不是列表） |
| `data.new_record` | 新增／改后内容；里面可混 `__impact_<字段>` 前缀的说明文本，渲染时当影响提示单独出，且不进 diff 比较 |
| `data.context.kpis` | KPI 四卡，每项 `{label, value, extra?}`；空数组 → KPI 条不显示 |
| `data.context.totals` | 今日累计行，每项 `{label, value, unit, target?}`；`target` 有值才补百分比 |
| `data.context.items` | 明细卡行，每项 `{label, time, food_name, grams, calories}`；一行 = 一条被处理过的饮食记录 |
| `data.meta.action_at` | 操作时间，直接显示在页眉左边，不需要格式化 |
| `data.meta.entity_type` | 实体名，进副标题「<实体> <动作>成功」和撤销提示语 |
| `data.meta.undo_cli` | 撤销命令；不传就整颗撤销按钮不出现 |
| `data.summary` | 一句话总结。模板对它做正则解析（238 行）：命中「今日/当日累计 X/Y 卡\|ml,剩余/超标 Z 卡\|ml」就把数字行单独拆出来放大上色；否则给句内数字上强调色，`update`/`delete` 时再把「旧→新」对子按旧红新绿着色 |

实体专属槽位（各调用点自己填，模板只认 `FIELD_LABELS` 里的名字）：

| 调用点 | entity_type | new_record／old_record 里的字段 |
|---|---|---|
| 记一餐／记一餐（含备注）／补记饮食／同餐合并 | 记一餐 | `food_name grams calories protein carbs fat note meal time date` |
| 记喝水 | 记喝水 | `ml today_total_ml target_ml remaining_ml date time` |
| 复制昨日饮食 | 复制昨日饮食 | `from to 复制 跳过`（中文名直接当字段名用） |
| 删饮食记录／删一餐／删某日饮食／批量删饮食 | 各场景名 | 删一条走 `old_record`（食物 10 列）；按餐／按日／按范围走 `new_record` 计数（`date 餐别 删除`、`start end 删除`） |
| 批量补记饮食 | 批量补记饮食 | `写入 跳过 失败` |
| 设置档案／设活动量／改档案 | 同场景名 | `height_cm age gender activity_level note`（`set_profile` 整行） |
| 改体重记录／删体重记录 | 体重记录 | `weight_kg bmi note date time` |
| 存食品／改食品／下架食品 | 同场景名 | `product_name brand calories protein fat saturated_fat carbohydrates sugar dietary_fiber sodium category source is_deprecated` |
| 记运动系列（`render_exercise_receipt.py`） | 运动类型 | `exercise_type duration_minutes calories_burned distance_km avg_heart_rate max_heart_rate steps set_index load_kg reps is_backfill` |
| 计划 11 词（`render_plan_receipt.py`） | 场景名 | `title total_weeks start_date description version`；天级是 `session_label time_start time_end total_sets is_rest_day`；动作级是 `name sets weight`；同步／拉训记是 `pushed inserted updated` |

**怎么随调用点变**（写后回执最重要的一段）：

- 变的是**三个数据槽的内容**，不是版块：`op` 换图标配色，`old_record`/`new_record` 换字段集合，`context.*` 换有没有 KPI/累计/明细。
- 版块出现与否完全由数据驱动，不需要模板分支：无 kpis → 无 KPI 条；无 totals → 无累计卡；无 items → 无明细卡；无 undo_cli → 无撤销按钮；字段无变化 → 无变更卡。
- 模板认的字段中文名写死在模板里的 `FIELD_LABELS`（278-291 行，约 60 条字段名），和 Python 侧的 `FIELD_LABELS`（`render_crud_receipt.py:60-88`）、`_FIELD_LABELS`（`render_plan_receipt.py:55-61`）是**三份平行副本**，不是一份。三处不一致时页面会直接漏出英文原名。
- 模板里还有两套值翻译表：`ACT_LABELS`（活动量五档中文）和 `UNIT_LABELS`（`grams→g`、`calories→卡`、`sodium→mg` 等），以及两个特判：`activity_level` 翻中文、`is_deprecated` 翻「已下架/正常」。专属逻辑没有外移，就长在模板里。
- 实体差异还有一处隐性：`data.diff`（`_build_diff()` 造的 `{items:[{label,unit,old,new}]}`）模板**完全不读**，页面上的旧值／新值来自 `old_record`/`new_record` 逐字段比较。计划回执 12 个调用点全都在填这个没人用的 `diff`（`render_plan_receipt.py:101-103`）。

### 4. 可交互的东西

| 控件 | 在哪 | 干了什么 |
|---|---|---|
| 「↩ 撤销」`#undoBtn` | 模板 172 行，脚本 415-429 行 | 只在 `meta.undo_cli` 有值时出现。点击复制固定句式：`请撤销刚才的<动作><实体>(操作时间 <action_at>),执行细节请按技能流程处理`，然后弹 toast「✓ 撤销指令已复制」。**不执行撤销、不写库**，只复制一段话给 AI |
| 「复制数据」 | Base `actionBar()` 注入（base.js:313） | 调 `buildDataText(window.__hmPayload)`，读 `data.scene.snapshot` 的 title/summary/sections 拼人类可读文本 |
| 「复制日志」 | Base `actionBar()` 注入（base.js:314） | 调 `buildLogText()`，出固定六段：① 场景标识 ② AI 思考链 ③ 底层数据结构 ④ 调用链 ⑤ 时间戳+版本 ⑥ 异常信息 |
| 复制格式菜单 | Base 侧（模板 97-101 行只留了 `.fmt-menu`／`.fmt-item` 样式） | JSON／CSV／纯文本三选一，右对齐贴在按钮组上方 |
| 场景按钮 | `data.scene.buttons` | `actionBar()` 按 `{label, text, kind}` 渲染成复制按钮；本模板的生成器一律传空数组 |

注意：模板自身还留了一段 `payloadData()`（436-456 行）想把 JSON 五段（op／record_id／summary／record／diff／kpis／items）拼出来，但它**没有被调用、也没接任何按钮**（457 行其实是把 IIFE 收尾）。老页面的「复制数据」实际来自 Base 的 snapshot，不是这段死代码。

### 5. 空态／缺失态

- 注入缺失或 `status !== 'ok'`：整页 `document.body.innerHTML = window.errorReceipt({message:'数据未注入或状态非 ok'})`（179-181 行）。
- `context.kpis` 为空：KPI 条 `display:none`（列表默认 `display:none`，49 行；有数据才改 `grid`）。
- `context.totals` 为空，或 `op === 'delete'`：今日累计卡 `display:none`（386 行）。
- `context.items` 为空：明细卡不显示（390 行判断后才 `display:block`）。
- 改了字段但值没变：变更卡整张隐藏（325 行），配合生成器在 summary 里补一句「以上值与当前档案一致,未产生实际变化」（`render_crud_receipt.py:188`）。
- 没有 `meta.undo_cli`：撤销按钮隐藏，底部按钮区只剩 Base 的复制按钮。
- 值渲染的空态：`fmtVal()` 把 `null/undefined/''` 统一成「—」（298 行）；删除快照里 `null/undefined/''/0` 的字段直接跳过不列（337 行）；明细行的缺时间来 `—`（402 行）。

### 6. 照抄时要注意的

- **字段顺序**：变更卡的顺序 = `Object.keys(new_record)` / `Object.keys(old_record)` 的插入顺序，即 Python 侧构造 dict 的顺序。重写时若换成有序列结构，必须保持每个调用点原有的字段次序，否则改动前后对比行会跳。
- **跳过三类内部字段**：`id`／`created_at`／`updated_at` 不进变更卡；`__impact_` 前缀的字段不进比较、不进变更行，只在对应字段行下面单独出一行影响提示。这两条过滤在三个分支里各写了一遍（308／334／358 行），重写要保留。
- **动作枚举是 `add` 和 `create` 两个**：图标／配色表同时收 `add` 和 `create`（192-194 行），但改后/新增分支判断只认 `create`（351 行）。历史调用点有的传 `create`（饮食/运动/计划）有的传 `add`。丢掉 `add` 会让一部分回执的变更卡不出内容。
- **summary 是被正则解析的**，不是纯文本：238 行那条正则要求「今日累计／当日累计 + 数字/数字 + 卡|ml + 剩余|超标 + 数字」的完整句式，生成器是从这个格式反着写出来的（`render_crud_receipt.py:509-510`）。照抄时要么连同生成侧句式一起搬，要么把这段正则换成显式字段——不要保留正则却改了句式。
- **日期派生**：`meta.action_at` 不解析、原样显示。但删除类回执的时间是**目标日期派生**的（如删体重按日期时 `action_at = target_date`，`render_crud_receipt.py:344`），不是当前时刻；撤销提示语里那句「操作时间」用的就是这个值。
- **删除后不显「已删除」标记**：删除快照只出旧值，右列留空、箭头 `visibility:hidden` 只为保持三列对齐（339-346 行）。重写省掉空列会让手机版（121 行起单列堆叠）的层级判断失效。
- **明细卡标题是算出来的**：`nCopied`／`nSkipped` 由 `label !== '已跳过'` 现算（394-397 行），不读任何计数字段。要保留这个按 label 现算的口径，否则「跳过」数会和 `new_record` 里的「跳过」对不上。
- **KPI 值不过滤也不转义**：KPI 的 `label/value/extra` 是 `insertAdjacentHTML` 直插（216-220 行），只有明细卡的 `food_name` 走了 `escapeHTML`（403 行）。重写到 TS 时别只看一处就统一处理，按现有分级照搬。

---

## 二、`process_progress.html`（落地进度页，18835 字节）

### 1. 它是什么

这是「落地训练」这类多步任务的**过程型**页面：一次事分 4 步跑（补计划到作息管家 → 建训练心愿 → 推到训记 → 拉训记实绩回写），跑到一半断了或只跑成一部分时，给用户看「哪几步成了、哪步失败、哪步还没做」，然后让用户选一条路继续：从失败那步重试、接受当前状态收工、或者把整份执行日志丢给 AI 看。页面本身**不能自动往下执行**，页面里写得很直白：「HTML 不能自动继续执行 · 请把下方文本粘到 AI 对话框,AI 会帮你接着跑」（273-277 行）。所以它交付的是一个「从哪步继续」的 prompt，不是一个能点的操作台。

唤醒词：落地训练／落地到本周末／落地到本月底（`render_process_progress.py:5`，脚本内 `COMMAND_CN = '落地训练'`）。

### 2. 版块

1. **头图区**（`.hero`，模板 239-244 行）— `#eyebrow` 固定「流程进度」、`#title` 流程名、`#subtitle` 一句「N 步 · X 完成 · Y 失败」、`#pills` 状态徽章组（失败红／完成绿／待办黄，有值才出，330-339 行）。
2. **整体进度卡**（247-258 行）— 三段进度条（绿=完成段／红=失败段／灰斜纹=待办段，按百分比分宽）+ 右侧「已完成/总数」+ 起止时间行 + 底部图例「✓ X ⚠ Y ○ Z」。
3. **步骤详情卡**（261-267 行）— 4 行的步骤列表，每行三列：圆形图标（完成 ✓／失败 !／待办序号）+ 主体（「第 N 步 · 名称」、描述、结果绿条或失败红条）+ 右侧时间列。
4. **继续操作卡**（`.copy-section`，270-284 行）— 三行说明 + 三颗按钮 + 一块等宽字体的复制预览区。
5. **页脚**（286 行）— 「卡路里 Skill · 4 步流程进度 · 日期 · G4」。
6. **回到顶部**（`#backTop`，289 行）+ **动作条**（`#actionbar-zone`，509-510 行，Base 注入「复制数据／复制日志」）。

### 3. 它吃的数据

入参是一个 JSON 文件（`--input`），有两种信封形态：带 `data` 包装的取 `data`，否则整个对象当数据（`render_process_progress.py:54-57`）。

```json
{ "summary": { "process_name", "process_type", "total_steps", "completed_steps",
               "failed_steps", "pending_steps", "started_at", "finished_at" },
  "steps": [ { "step", "name", "description", "status",
               "started_at", "finished_at", "result", "error", "retry_command" } ] }
```

| 槽位 | 含义 |
|---|---|
| `summary.process_name` | 流程名，渲染进头图 `#title`；缺省变标题「流程进度」；渲染器兜底 `'(未命名流程)'` |
| `summary.process_type` | 流程类型，**页面不显示**（只在渲染器兜底表里） |
| `summary.total_steps` | 总步数；不传则由 `steps.length` 现算 |
| `summary.completed_steps` | 完成步数；不传则数 `status === 'done'` |
| `summary.failed_steps` | 失败步数；不传则数 `status === 'failed'`；**决定「复制继续」按钮是否可用** |
| `summary.pending_steps` | 待办步数；渲染器会补（`render_process_progress.py:83-85`），但**模板不读它**，待办数一律用 `总数 − 完成 − 失败` 现算 |
| `summary.started_at` / `finished_at` | 起止时间，只取 `HH:MM:SS` 段显示；`finished_at` 为空但失败数 > 0 → 显示「进行中(失败未重试)」，否则「进行中」 |
| `steps[].step` | 步序号，显示成「第 N 步」 |
| `steps[].name` | 步骤名 |
| `steps[].description` | 一句话描述，可缺省 |
| `steps[].status` | 只认 `done`／`failed`／`pending`（缺省按 `pending`） |
| `steps[].result` | 成功那步的结果文案，缺省显「完成」 |
| `steps[].error` | 失败原因，缺省显「未知错误」 |
| `steps[].retry_command` | 失败那步的重试命令，会以代码块样式显示，并原样进「复制继续」的 prompt |
| `steps[].started_at` / `finished_at` | 时间列；两者都空则整列不渲染；只有开始时间时右侧显「⏳ 待执行」 |

**一行 step 是什么**：流程里的一个步骤——序号 + 名称 + 描述 + 状态 + 起止时间 + 结果或错误 + 重试命令，共 4 行（脚本注释和 mock 都是 4 步，`tests/fixtures/mock/mock_process_progress.json`）。

### 4. 可交互的东西

这一页的按钮**不走 Base 复制按钮那套**，是模板里的三颗自建按钮，各自现拼一段 prompt 再调 `window.copyText(...)`：

| 按钮 | 拼接函数 | 复制的内容 |
|---|---|---|
| 「↻ 复制继续指令」`#btnContinue` | `buildContinuePrompt()`（420-449 行） | 从**失败步骤**开始重试的 prompt：逐条列失败步骤的「第 N 步 名称(失败) / 错误 / 重试命令」，加一句上下文（已完成 X/总 Y、失败 Z、待办 W），再列三条执行要求，末尾附「数据来源: 4 步流程进度 · render_process_progress.py · 当天日期」。**无失败步骤时这颗按钮不复制继续 prompt，直接改调 `buildAdoptPrompt()`**，并且按钮文案变「✓ 全部完成 · 无需继续」、置灰禁用（371-383 行） |
| 「✓ 采纳现状」`#btnAdopt` | `buildAdoptPrompt()`（451-469 行） | 收工 prompt：一句「<流程名>已结束(X/Y 完成,Z 失败)」+ 结果汇总三行 + 每步一行的详情（完成(结果)／失败(错误)／待办），末尾同样带数据来源 |
| 「📋 完整日志」`#btnFullLog` | `buildFullLogPrompt()`（471-493 行） | 全量日志：每步一段，含「第 N 步 名称 [中文状态]」、描述、开始、结束、结果、错误、重试命令（有哪项出哪项），最后一段汇总四项计数 + 数据来源 |
| 「复制数据」 | Base `actionBar()` | 读 snapshot 的 title/summary/sections；这一页的 section 由 `_base_render.envelope` 从 `summary` + `steps` 自动提炼（`_auto_sections` 的 `_SECTION_LIST_KEYS` 里有 `series`／`list`／`rows` 等，不含 `steps`，所以「步骤」段在这一页的复制数据里出不来——要留意） |
| 「复制日志」 | Base `actionBar()` | 六段排障日志 |

三颗自建按钮的复制预览区 `#copyPreview` 是静态占位文案「预览将复制给 AI 的内容」，本身不随按钮刷新。

### 5. 空态／缺失态

- 数据整个没注入：整页替换成 `window.errorReceipt({message:'数据加载失败'})`（318 行）。
- `summary`／`steps` 全空：渲染器兜底成 `summary = default_summary()`（名称「(空)」、四项计数 0）+ `steps = []`（`render_process_progress.py:62-98`）。
- 总步数为 0：进度条三段宽度全不写（344-345 行，`innerHTML = ''`），页面不会报错但也看不出进度。
- 无失败步骤：进度条红色段宽度 0；「复制继续」按钮降级为禁用态（见上）。
- 步骤没有时间：时间列整列不渲染（400 行）。
- 缺 `retry_command`：失败红条里不出代码行，继续 prompt 里出「(无具体重试命令)」（427-428 行）。

### 6. 照抄时要注意的

- **三颗按钮的 prompt 是页面主要交付物**，不是装饰：它们把「失败步骤 + 重试命令 + 上下文」按固定句式拼出来。重写时句式、分节顺序、末尾「数据来源:」那一行都要保留——这正是用户要粘回对话框的东西。
- **计数三处现算，三处口径要一致**：待办数在头图徽章（336 行）、进度条（349 行）、图例（368 行）、三段 prompt（441／457／490 行）各算一遍，口径都是「总 − 完成 − 失败」，而不是读 `pending_steps`。
- **状态只认三类**：`done`／`failed`／其他一律当 `pending`（387-388 行）。加上渲染器的 `sum(pending or 'pending')`，未识别的状态会被算进待办。
- **时间要按空格取末段**：`trimTime()` 取 `s.split(' ').pop()`，因为真实数据里的时间可能是「2026-07-23 18:00:05」这种带日期的串，而 mock 里直接就是「18:00:05」。照抄时别改成直接显示，否则头图会多出日期。
- **待办圈的序号是 CSS 计数器出的**（`.step{counter-increment:step}` + `.step.pending .icon::after{content:counter(step,decimal)}`，142-143 行）。重写成组件时若把序号改成显式数字，要保持「按流程顺序、不因失败重试而错位」。
- **「复制继续」按钮的无失败降级是行为的一部分**（371-383 行），不只是视觉：禁用后点击不再复制任何东西。
- **顺序即数据顺序**：步骤列表直接 `STEPS.map(...)`，没有排序、没有补齐缺口。重写要做排序的话先确认「步骤序号 `step` 是否一定连续」。当前 page 不校验连续性。
- **这一页目前没有生产端的落地脚本**：除渲染器自身和 mock 之外，仓库里没有任何调用 `render_process_progress.py` 的地方（`sync_plan.py` 不产出这个 JSON）。重写时先确认真实调用链，别照抄注释里的「理论数据源」。

---

## 三、`exercise_review.html`（计划复盘页，21742 字节）

### 1. 它是什么

这是把「定的计划」和「实际练的」摆在一起看的那一页：一个时间范围里，哪几天练了、哪几天该练没练、完成率多少、哪些天算异常（漏做或超额）、每周总容量（公斤×次数）和计划差多少、几个主项动作的负荷走势。用户看到的是七格一行的日历热力图 + 四张数字卡 + 两张图 + 一张逐日明细表。唤醒词三个：计划复盘（本周）／（本月）／（全部），默认范围最近 7 天。

数据不是渲染器自己算的：`render_exercise_review_html.py` 用 `subprocess` 调 `exercise_review.py --start --end --format json`（`render_exercise_review_html.py:85-94`），后者再调 `analysis.exercise.exercise_analysis(..., 'review', as_dict=True)`。

### 2. 版块

1. **头图区**（`.hero`，模板 202-205 行）— 固定标题「🏋️ 训练复盘」+ `#subtitle` 显示「起始 ~ 结束 · N 天」。
2. **数字卡条**（`.stats`，207 行）— 四张卡（426-447 行动态渲染）：训练天数（含「X 天休息」附注）、平均完成率（含「✓ 稳定／需加强／需调整」）、异常天（含「漏做 / 超额」）、实做总组数（含「计划 N 组」附注）。
3. **每日完成率热力图**（209-218 行）— 七列网格，每格「日期 周X」+ 完成率百分比 + 可选备注；配色四档：100% 绿、50-99% 橙、<50% 红、休息日灰；周末格加粗。
4. **周训练容量 · 计划 vs 实做**（220-224 行）— 调 Base `charts.combo`，柱=实做吨位、线=计划吨位；下面是 `#volumeNote` 一句话注（本周实做/计划/百分比 + 累计）。
5. **主项动作负荷趋势**（226-231 行）— 调 Base `charts.line` 多序列，每个主项动作两条同色线（实线实做、虚线计划），下挂图例（动作名 + 实做/计划吨位与百分比）和 `#movementNote` 说明。
6. **每日明细卡 + 表**（233-241 行）— 七列表头：日期／周次／计划／计划组数／实做组数／完成率／异常；异常列用小标签列出当天所有异常文案。
7. **复制回 AI 卡**（243-250 行）— 标题「📤 复制回 AI」+ `.copy-actions`（空的）+ `#copyExt` 扩展按钮区（相关场景按钮由脚本填）。
8. **两个隐藏文本仓**（251-252 行）— `#copyDataStore`、`#copyLogStore`。
9. **页脚**（254-257 行）— 「卡路里 Skill · 训练复盘 · 数据来源 exercise_review.py --format json / 模板：templates/exercise_review.html」。
10. **回到顶部**（260 行）+ **动作条**（549-550 行，Base 注入）。

### 3. 它吃的数据

顶层是 `analysis.exercise.exercise_analysis` 的 `as_dict=True` 返回（`analysis/exercise.py:446-451`）：

```json
{ "status": "ok",
  "data": { "2026-07-20": { …一天… }, "2026-07-21": { … },
            "__meta__": { …汇总与容量… } },
  "message": "训练复盘 N 天" }
```

**一天一条**（`analysis/exercise.py:361-372`，日期就是条目的标识）：

| 字段 | 含义 |
|---|---|
| `date` | 日期本身 |
| `plan_week` | 计划周次，表里显示成 `W<值>`，缺省出 `W?` |
| `sessions` | 当天的计划时段名数组，表里用「 / 」连起来；空数组出「—」 |
| `plan_total_sets` | 计划组数 |
| `actual_total_sets` | 实做组数 |
| `calories_burned` | 当天消耗（当前模板**没显示**） |
| `completion_rate` | 完成率 = 实做组数 ÷ 计划组数 × 100，**可能是 null** |
| `anomalies` | 异常数组，每项 `{type, msg}`；四种 type：`low_completion`／`over_completion`／`no_actual`／`rest_but_done` |
| `note` | 一句话说明，如「休息日 / 无计划无实绩」「计划有训练但完全未做」「计划尚未开始(起始 X)」 |
| `is_rest_day` | 休息日布尔，`plan_total_sets == 0 且 actual_total_sets == 0` 时为真 |

**汇总与容量**（`data.__meta__`，`analysis/exercise.py:431-444`）：

| 字段 | 含义 |
|---|---|
| `by_severity_count` | 四类异常各多少条（模板未用） |
| `total_days` / `train_days` / `rest_days` | 总天数／训练天／休息天（模板自己又数了一遍，没用这三个） |
| `total_calories` | 范围总消耗（模板未用） |
| `volume.weeks[]` | 每周 `{week, label, plan, actual, actual_sets}`；`label` 形如「7/20~26」，`plan`／`actual` 是该周 Σ(kg×次数) 四舍五入 |
| `volume.movements[]` | 主项 TOP4，每项 `{name, plan_total, actual_total, weeks[]}`；`weeks[]` 是同结构的逐周 `{week, label, plan, actual}` |
| `volume.total_plan` / `total_actual` | 范围累计吨位 |
| `volume.has_actual` | 范围内有没有带重量的实绩；为假时两张图都改走「实做数据不足」提示 |

**渲染器额外塞进去的 `__meta__`**（`render_exercise_review_html.py:97-105`）：`scene_name`／`prompt_template`（当前场景的 prompt）／`related_scenes`（同组另外两个复盘场景的 `{name, prompt}`）。

注意 `__meta__` 的落点：它在 `data` 下面（和日期条目平级），模板读的是 `window.__P__.__meta__`（496 行）；`injector.inject` 注入的是整个 payload，所以 `__meta__` 在拼出来的 HTML 里是 `__P__.data.__meta__`，模板先做了一次解包（`root`）才读它。

**一行明细是什么**：表格一行 = 一天，七列全部来自那一天的字段，没有跨天聚合。

**热力图一格是什么**：一天。显示「月/日 周X」+ 完成率（null 时休息日显「休」、否则「—」）+ `note`。

### 4. 可交互的东西

| 控件 | 在哪 | 干了什么 |
|---|---|---|
| 扩展场景按钮（如「计划复盘（本月）」「计划复盘（全部）」） | `#copyExt`，模板 528-536 行 + `copyRelated()` 279-288 行 | 点一下把该场景的 `prompt_template` 复制走。prompt 来源是 `_triggers.py` 里的 `TRIGGERS`（`render_exercise_review_html.py:58-82`），和 HELP 页的复制按钮同源 |
| 「复制数据」 | Base `actionBar()` | 读 `data.scene.snapshot`；这一页的 snapshot 由 `envelope()` 从**逐日结构**自动提炼——`_auto_sections` 不认「日期 → 对象」这种形状，所以复制出来的主要是标题与时间，容量/明细进不去 |
| 「复制日志」 | Base `actionBar()` | 六段排障日志 |

**已经失效／没接线的东西（重写时不要照抄）**：

- `#copyDataStore` / `#copyLogStore` 两个隐藏 div 里的文本（507／526 行拼出来的「训练复盘 (范围) … 每日明细 …」）**没有任何按钮读它们**。这是 Base 接管复制按钮之前的老做法，现在留着但没人消费。
- `.copy-actions` 里那颗「📤 复制回 AI」的按钮容器是**空的**——脚本没有往里面插按钮。
- `copyRelated()` 调的是 `_copyNow(...)`，而 `_copyNow` 在 `公共组件/assets/base.js` 和整个 SKILLS 目录里**都不存在**（全仓只有 exercise_review.html:287 这一处引用）。也就是说这些扩展场景按钮现在点下去会 ReferenceError。重写要接 Base 的 `window.copyText(...)`。
- 模板 323-324 行算出来的 `yMax` 变量没有传进 `charts.combo`，柱图的实际 Y 轴上限被忽略（源码注释已记为「Y 刻度文字缺失(记偏离)」）；下面折线图是传了 `yMax` 的。

### 5. 空态／缺失态

- 数据没注入：整页替换成 `window.errorReceipt({message:'数据加载失败'})`（399-401 行）。
- 一天都没有（`dates.length === 0`）：`#subtitle` 改成「暂无数据」并 `return`——**四张数字卡、热力图、两张图、明细表全是空的**，没有补位文案（409-412 行）。
- 主项动作数据为空：折线图容器改出 `<p class="chart-note">暂无主项动作数据</p>`（348-350 行），图例仍是空。
- 周容量数据为空：柱图容器改出「暂无容量数据」（314-316 行）。
- 范围内没有带重量的实绩（`has_actual` 假）：柱图和折线图的说明行都换成 `window.emptyState({text:'⚠️ 实做数据不足：当前范围无带重量实绩，仅显示计划容量' / '…仅显示计划参考线'})`（331-337、391-395 行）。
- 单日缺数据：完成率 null 时热力图显「休」或「—」、表里显「休」；`plan_week` 缺省显 `W?`；`sessions` 为空显「—」。

### 6. 照抄时要注意的

- **范围是现算的，不是数据带的**：`--days` 默认 7，起点 = 今天 − (N−1)，终点 = 今天；只给 `--start` 时起止同一天（`render_exercise_review_html.py:111-118`）。头图那行「起始 ~ 结束」直接取排序后日期标识的首尾，不读任何范围字段。
- **完成率是派生列，不是存量**：等于「实做组数 ÷ 计划组数 × 100」，null 表示「不该算」而不是 0（计划未开始／计划与实绩都为空／计划休息但实做了）。四张卡里的平均完成率**只对非休息且有完成率的天求平均**（417-423 行）。重写时要把 null 当「排除」而不是「按 0 参与平均」。
- **四档配色阈值写死在模板**：热力图 `>=100` 绿／`>=50` 橙／其余红／null 灰（290-295 行）；表里同理（297-302 行）；异常标签里只有 `low_completion`／`over_completion` 算 warn，其余算 bad（481 行）。
- **周标签是从 ISO 周现推的**：`'2026-W30' → '7/20~26'`，跨月时变 `'7/27~8/2'`，推不出来就原样返回（`analysis/exercise.py:389-398`）。照抄要保留「周一为一周之始」这条。
- **XSS 面按现状保留**：`note`、`sessions`、动作名走 `escapeHTML`；四张数字卡里的数字和 `plan_total_sets`／`actual_total_sets` 是数字直插。别把安全边界扩到数字列上（会改视觉），也别把 `note` 的手工转义去掉。
- **图表已经换成 Base charts 组件**，模板自己不再画 SVG；柱状是「双柱近似成 柱+线」的将就方案（310 行注释），重写时若 Base 出了分组双柱接口可以直接换，但排序与配色（`MOV_COLORS` 四色循环）要保持。
- **`__meta__.volume` 和日期条目同层**：这是这张模板最容易读错的一处。既不是 `meta` 也不是 `scene.snapshot`，而是分析层直接写进 `data` 的一个下划线前缀字段。重写时如果改放进 `meta`，模板的取值路径、`dates` 过滤白名单（407 行显式排掉 `__meta__`／`meta`／`scene`／`copy_log`）都得跟着改。

---

## 四、三张之间的关系

三张都是「注入一份 JSON → 页面自己渲染」的纯前端页，都用 Base 管线（`<!--SHARED-CSS-->` + `<!--SHARED-HELPERS-->` + `<!--INJECT-DATA-->` 三个占位符各一次，由 `_base_render.render_template` 走 `公共组件/injector.py`）。除此之外，它们的骨架基本不重叠。

### 共享的与对位不等的（同一块版块在三张里的对应形态）

| 版块 | crud_receipt | process_progress | exercise_review |
|---|---|---|---|
| Base「复制数据 / 复制日志」动作条（`#actionbar-zone`） | ✅ | ✅ | ✅ |
| Base 状态徽章／空态／错误回执（`statusBadge`／`emptyState`／`errorReceipt`） | ✅ | ✅ | ✅ |
| 页脚来源行 | ✅ | ✅ | ✅ |
| 「回到顶部」悬浮 | ❌ | ✅ | ✅ |
| 顶部名称区 | 大标题 + 副标题 | `.hero` 头图 | `.hero` 头图 |
| 数字卡条 | `.kpi-grid`（4 列，可有可无） | 头图徽章组（不是卡） | `.stats`（固定 4 张） |
| 复制区 | Base 注入 | **自己一套三颗按钮 + 预览区** | 只剩扩展场景按钮 |

三张都从 `_base_render.envelope()` 拿到 Base 信封（`data.meta.command_cn`／`occurred_at`、`data.scene.snapshot`、`data.copy_log`），所以复制数据／复制日志的行为是同一套。区别在于 `crud_receipt` 和 `exercise_review` 的页面主体跟 `scene.snapshot` **没有关系**——主体各自读自己的领域字段，snapshot 只服务于复制按钮。

### 各自独有的

- **只有 `crud_receipt.html` 有**：`op` 驱动的三态身份卡与配色、字段变更卡（新增/修改/删除三种形态）、字段影响行、今日累计卡、明细卡、撤销按钮、约 60 项的字段中文名表。
- **只有 `process_progress.html` 有**：三段进度条、步骤列表（图标 + 时间列 + 结果条/错误条）、三颗自建复制按钮（继续／采纳／完整日志）与配套的三段 prompt 拼装、进度预览区。
- **只有 `exercise_review.html` 有**：四张数字卡、七日热力图、Base 图表两张（周容量、主项负荷）、逐日明细表、扩展场景按钮、按 `__meta__.volume` 走的两套「实做数据不足」空态。

### 归属层怎么看

- `crud_receipt.html` 是**跨场景共享页**，6 个场景组 49 个唤醒词在用，背后有 **4 个不同的 Python 渲染器**（`render_crud_receipt.py`／`render_exercise_receipt.py`／`render_plan_receipt.py`／`render_body_delete_receipt.py`）。它的字段中文名表在模板里一份、在 `render_crud_receipt.py` 里一份、在 `render_plan_receipt.py` 里第三份——三份平行。
- `process_progress.html` 与 `exercise_review.html` 都是**单渲染器独占**（分别只被 `render_process_progress.py`、`render_exercise_review_html.py` 引用），改写面比 `crud_receipt` 小一个量级。

## 五、不确定

1. **场景组编号与分类名的对应是推断的，计数是实算的**：49 的总数与 02:15 / 03:5 / 04:13 / 05:11 / 07:2 / 08:3 的拆分，是按 `_triggers.py` 的 `category` 现算出来的（与任务书给的 49 与「05:11」完全吻合）；但「02 = 饮食、03 = 体重、08 = 基础信息」这层编号对应是根据 `_triggers.py` 文件头列出的分类清单（主页 9 / 饮食 68 / 体重 58 / 运动 39 / 健身计划 32 / 基础信息 4 / 身体细节 13）推断的，没有读 `.scratch/scene_data/` 下那些编号 JSON 去逐一核对编号本身。
2. **`crud_receipt.html` 全部 49 个调用点没有逐一跑过**：本文的实体字段表来自 4 个渲染器的关键分支（`build_live_profile_*`、`build_live_diet_*`、`build_live_water_add`、`build_live_product_*`、`_weight_delete_receipt`、`render_exercise_receipt._receipt`、`render_plan_receipt._receipt`）。个别单场景（如 `render_body_delete_receipt.py` 的体脂/围度两条）只确认了模板路径，没读取它的 `new_record`／`old_record` 字段集合。
3. **`process_progress.html` 的真实生产端没找到**：全仓只有 `render_process_progress.py` 自己、mock fixture，和文件头注释里说的「理论上由 `sync_plan.py` / 落地流程的 `--json-output` 提供」。`sync_plan.py` 里没有任何 `render_process_progress` 或同构 JSON 的产出。落地训练这三个唤醒词当前是谁在生成这份 JSON，未确认。
4. **`exercise_review.html` 的两处疑似失效没法从静态代码定死**：
   - `_copyNow()` 在全仓（`公共组件/assets/base.js` + `SKILLS/`）没有任何定义，只有 `exercise_review.html:287` 一处调用——按静态阅读这些扩展按钮会抛 ReferenceError；但可能依赖运行时注入的动态脚本（未验证）。
   - `#copyDataStore`／`#copyLogStore` 里拼好的文本没有任何按钮读取；`__meta__.volume` 是否通过别的路径进了 Base 的 snapshot 也没验证。按 `envelope()` 的 `_auto_sections` 不认「日期 → 对象」形状来判断，这两段是**未接线的老做法**，但未实跑确认。
5. **`crud_receipt.html` 里 `payloadData()` 是死代码的判断基于静态阅读**：函数定义了、没被调用，尾部还多出一个 `})();`。没有实跑页面确认浏览器不报错（若报错，那一段后面的代码都受影响）。
6. **`charts.combo` 的具体契约没读**：本文只按调用点描述「柱=实做、线=计划」，以及 `yMax` 未传导致 Y 轴上限被忽略（模板 320-330 行）。Base 图表组件的完整参数与默认行为在 `公共组件/assets/charts.js`（67 KB），未展开。
7. **`exercise_review.py --format json` 的输出没有实跑**：`data` 里除逐日条目外还有没有别的字段、`by_severity_count` 等是否会出现在页面上，按 `analysis/exercise.py:446-451` 的返回结构推断为没有。真实 DB 的返回未验证。
