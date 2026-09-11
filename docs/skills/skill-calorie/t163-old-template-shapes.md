# 老技能四张实物页面：形状与数据

来源：`D:\2Study\StudyNotes\SKILLS\卡路里\`（`templates\` 74 张实物、`scripts\` 渲染脚本）。
只记录形状与数据：区块有哪些、注入什么字段、关键交互是什么。不含样式与视觉设计。
证据优先级：渲染脚本与 mock 数据（字段名级、可核对）＞ HTML 结构标记行附近的小片段。HTML 一律不整份读。凡未直接看到的，一律写「未证实」。

## 总表

| 优先 | 实物 | 渲染脚本 | 类型 | 老技能落盘名 | 结论状态 |
|---|---|---|---|---|---|
| P0 | `templates\profile_setup.html` | `scripts\render_profile_setup.py`（4.5 KB） | 过程型 · **写前** | `设置档案_过程_<TS>.html` | 已查清 |
| P0 | `templates\crud_view.html` | `scripts\render_crud_view.py`（9.2 KB） | 结果型 · 写后 | `查档案_结果_<TS>.html` | 已查清 |
| P1 | `templates\crud_receipt.html` | `scripts\render_crud_receipt.py`（68 KB，未整读） | 回执型 · 写后 | 按命令名落盘（未证实，见待确认） | 区块与数据契约已查清 |
| P2 | `templates\batch_import_preview.html` | `scripts\render_batch_import.py` | 过程型 · 写前 | 未证实 | 区块与数据契约已查清 |

## 一、共有区块横表（4 张 × 结构标记实测）

标记在 74 张模板里的出现张数，用来判断「值得抽公共组件」还是「只此一处」：

| 结构标记 | 4 张命中情况 | 74 张中张数 | 判断 |
|---|---|---|---|
| `<!--INJECT-DATA-->` ／ `<!--SHARED-HELPERS-->` ／ `#actionbar-zone` ／ `.kpi-grid` | 4 张全有 | **72 / 72 / 71 / 43** | 公共层四件套，最值得抽 |
| `#metaLeft` ＋ `#sub` | 3 张有（batch 页例外） | 31 / 32 | 公共层，但 batch 页换了名字 |
| `#srcLine` ／ `#eyebrow` ／ `#backTop` | 各仅 1–0 张 | 30 / 16 / 10 | 公共层候选或小众 |
| `.prompt-box`（＋ `#configForm`） | 仅 profile_setup | 7（`#configForm` 2） | **配置型过程页族**：另 5 张是 `cron_setup`、4 张 `*_wizard`、`body_photo_gif_planner` |
| `.diff-card` ／ `.items-card` ／ `.id-card` | 仅 crud_receipt | 2 / 2 / 3 | **回执型族**：另 1 张是 `body_photo_receipt.html` |
| `.ctx-card` | 仅 crud_receipt | **1** | **只此一处**，全 74 张仅此一张 |
| `.progress-bar` ／ `#pageFooter` | 仅 batch_import_preview | 2 / 2 | **过程进度族**：另 1 张是 `process_progress.html` |
| `.copy-preview` | 仅 batch_import_preview | 8 | 复制区形态之一（另一形态是 `.prompt-box`） |

**读法**：四个公共层位置在 72/72/71/43 张里反复出现，是最值得抽的。`.ctx-card`（今日累计）全库只出现 1 次，抽出来没人复用。

## 二、P0-1 `profile_setup.html` ＋ `render_profile_setup.py`：设置档案（写前配置页）

老技能落盘名 `设置档案_过程_<TS>.html`，由 `html_scene_path(SKILL_DIR, '设置档案', 'process')` 生成（脚本第 108 行）。
### 这是**写前**页 —— 六条证据

1. 场景参数写死为 `'process'`，落盘名带「过程」（脚本第 108 行）。
2. 数据里带 `exec_cmd_template`：页面交给用户的是一条**待执行的命令模板**，不是执行结果 —— `calorie_tracker.py profile set {age} {gender} --height {height} --activity {activity} # optional: --note {note}`。
3. 脚本只有读路径：live 分支只调 `profile.get_profile()` 取当前值；**全脚本没有任何写档案的调用**。
4. 交互按钮是「🔄 生成 prompt」／「📋 复制 prompt」；复制区初始文案 `// 先填写参数 → 点击"生成 prompt"`。
5. live 分支副标题（已有档案时）：`修改年龄/性别/身高/活动量,当前值已预填,改完复制 prompt 给 AI`。
6. 结论语义：页面产物是「给 AI 的参数 prompt」，写动作发生在用户把 prompt 交回 AI **之后**。
### 数据契约（字段名级）

```
status: "ok"
data:
  fields: [ {key, label, type, required?, placeholder?, hint?, options?[{value,label}]}, ... ]
  defaults: { <key>: <默认值> }        # live 读 user_profile 预填；无档案用兜底值
  exec_cmd_template: "<带 {占位符} 的命令模板>"
  exec_cmd_optional: "note"            # 标记哪个占位符是可选参数
  meta: { fetched_at, subtitle }
message: "已生成设置档案 配置"
```

`fields[]` 五项，顺序即表单顺序：`age` 年龄 number 必填（placeholder 30，hint 用于 BMR）／`gender` 性别 select 必填（`male`=男、`female`=女）／`height` 身高(cm) number 必填（placeholder 177，hint 用于 BMI）／`activity` 活动量 select **非必填**（5 档 sedentary/light/moderate/active/very_active）／`note` 备注 textarea 非必填。

`defaults` 兜底 `{age:30, gender:"male", height:177, activity:"moderate", note:""}`；live 预填来源是 `profile.get_profile()` 的 `age / gender / height_cm / activity_level / note`。注意**两套名字**：读进来是 `height_cm`、`activity_level`，发出去是 `height`、`activity`。
### 区块清单（可填位置）

| # | 区块 | 模板锚点 | 注入来源 |
|---|---|---|---|
| 1 | 数据载荷 ＋ 公共脚本位 | `<script id="payload">` 里的 `<!--INJECT-DATA-->` ＋ `<!--SHARED-HELPERS-->` | 整个 `data`（前端读 `window.__P__`）＋ 渲染基座 |
| 2 | 元信息左栏 ／ 标题 ／ 副标题 | `#metaLeft` ／ `<h1>👤 设置档案</h1>` ／ `#sub` | `meta.fetched_at` ／ **写死** ／ `meta.subtitle`（有档案、无档案两套文案） |
| 3 | 「用户基础信息」表单 | `<h2>` ＋ `<form id="configForm"></form>` | `fields[]` ＋ `defaults` |
| 4 | 「📋 复制 prompt 给 AI」 | `<h2>` ＋ `div#promptBox` | `exec_cmd_template` |
| 5 | 操作按钮 ／ 页脚 | `#genBtn`「生成 prompt」／`#copyPromptBtn`「复制 prompt」／ `#srcLine` | — ／ 版本号（写死 `v2.1.3`） |
| 6 | 底部操作条 | `#actionbar-zone` ＋ `window.actionBar(window.__P__)` | 通用扩展位 |
| — | KPI 卡片区 | `.kpi-grid` 存在 | 本页未用（`kpis` 不在数据契约里） |
### 关键交互

- **表单按描述生成**：前端读 `fields[]` 的 `type` 分派 —— `select` 用 `f.options` 且用 `defaults[f.key]` 选中；`textarea` 预填 `defaults[f.key]`；其余按 `input type`（脚本第 120–123 行）。加字段不用改 HTML。
- **复制区两步**：先「生成 prompt」把字段值替换进 `exec_cmd_template`，再「复制 prompt」。必填校验交给浏览器（`f.required` 直接落到 `required` 属性）。
### 照搬价值：高

- 可照：① `fields[]` 描述表 ＋ `defaults` 预填，页面按描述生成表单；② 数据里带命令模板 ＋ 可选参数标记，复制区直接出可交给 AI 的字符串；③ 有档案时副标题自动切成「当前值已预填，改完复制」。
- 需换：老页把模板拼成 CLI 文本。新仓若不再以 CLI 为唯一出口，这一层要换成新仓的执行入口；`fields[] / defaults / 复制区` 三层结构本身可以照搬。
- 同形状家人：`cron_setup.html` 也有 `#configForm` ＋ `.prompt-box`，说明「填参数 → 生成 prompt → 复制」不只服务设置档案。

## 三、P0-2 `crud_view.html` ＋ `render_crud_view.py`：结果页（报告型）

落盘由 `html_scene_path(SKILL_DIR, '查档案', 'result')` 生成 → 结果型。一张模板服务两个唤醒词：**查档案**、查定时复盘。
### 数据契约（字段名级）

```
status: "ok"
data:
  entity: { type, title, subtitle, section_title }   # 抬头四件套
  kpis:   [ {label, value, extra} ]                  # 顶部卡片，3–4 个
  fields: [ {key, value} ]                           # 明细行，key 带库列名（如 年龄(AGE)）
  raw:    { <库中原样字段> }                          # 原始数据，前端默认不显示
  meta:   { fetched_at, source, wake_word, chain?, render_cmd }
message: "已生成查档案 报告"
```
### 区块清单

| # | 区块 | 注入来源 |
|---|---|---|
| 1 | 数据载荷 `#payload` ＋ 公共脚本位 `<!--SHARED-HELPERS-->` | 整个 `data` ＋ 渲染基座 |
| 2 | 实体抬头（`entity.title/subtitle/type`，title 自带 emoji `👤 查档案`）＋ 分区标题 `entity.section_title` | `entity` |
| 3 | KPI 卡片区 `.kpi-grid` | `kpis[]` |
| 4 | 明细字段区 | `fields[]` |
| 5 | 原始数据区 ／ 思考链 | `raw` ／ `meta.chain` —— **界面隐藏**，只进「复制日志」；live 模式 `chain` 必传 |
| 6 | 底部操作条 `#actionbar-zone` | `window.actionBar` |
### 身高／年龄／性别／活动量／活动系数／体重／BMI／BMR／TDEE 怎么摆（查档案）

**KPI 区 4 张**（只放最该一眼看到的）：`年龄`（extra＝性别）／`身高`（extra＝`BMR/TDEE 计算`）／`当前体重`（extra＝记录日期）／`当前 BMI`（extra＝档位文字）。

**明细字段区 12 行，顺序固定**（key → value 形态）：`年龄(AGE)`→`30`；`性别(GENDER)`→`male`；`身高(HEIGHT_CM)`→`177 cm`；`活动量(ACTIVITY_LEVEL)`→`中度(每周 3-5 次中等强度运动) (moderate)`；`活动系数`→`× 1.55（中度档）`；`最近体重`→`87.85 kg (2026-07-24 08:53)`；`最近 BMI`→`28.0 (超重)`；`BMR(Mifflin-St Jeor)`→`1,869 卡/天`；`TDEE(BMR × 活动系数)`→`2,617 卡/天`；`档案创建`→`2026-07-16 09:44`；`档案更新`→`2026-07-20 10:20`；`备注`→`(空)`。

三个要点：

- **活动量和活动系数是分开的两行**（第 4、5 行）。系数由 `analysis._utils.get_activity_factor(activity_level)` 取，档位文字由 `ACTIVITY_LEVEL_LABELS` 取，所以系数随档位变。mock 样本里 TDEE 那行写 `× 1.4`，而字段区写 `× 1.55（中度档）`，两处对不上 —— 判断是 mock 文案陈旧，live 走系数表。
- BMI 档位文字只有两分支：`18.5 ≤ bmi ≤ 24 → (正常)`，`bmi > 24 → (超重)`，**没有偏瘦分支**，取不到值时是 `—`。
- 明细行的 `key` 是展示字符串，**把库列名塞进括号**（`年龄(AGE)`、`身高(HEIGHT_CM)`），不是纯字段名。属于老技能写法，新仓要不要沿用是个决定点。
### 关键交互 / 调试位

- `--chain` 在 live 模式下**必传且校验**：太短、不含步骤特征（`→` / `->` / `1.` / `第一步` 等）、或等于 `x/xx/xxx/无/none`，都判无效并拒绝渲染（第 131–158 行）。这是「AI 有没有按流程做」的强制位。
- `meta.render_cmd`：渲染器把自己被调用的完整命令回填进数据，供「复制日志」复现，含空格的参数自动加引号。`meta.wake_word`：页面自述在服务哪个唤醒词，可被 `--wake-word` 覆盖。
- **界面隐藏、复制才带出**：`raw`、`source`、`fetched_at`、`chain`。意图写在文件头注释里：「用户视图干净，「复制日志」含 原始数据/来源/时间/思考链」。
### 照搬价值：高

- `entity 四件套 ＋ kpis[] ＋ fields[] ＋ raw ＋ meta` 是结果页可直接照的骨架。`kpis` 管一眼结论、`fields` 管明细、`raw` 管排查，三者分开很值得照。
- `render_cmd`／`wake_word`／`chain` 三个调试位：新仓若要「复制日志」值得照，不要这层也不影响页面。需改：明细行 key 混入库列名读起来偏工程，新仓可只留中文名。

## 四、P1 `crud_receipt.html` ＋ `render_crud_receipt.py`：写后回执页

脚本 68 KB（1331 行），**未整读**；区块取自 HTML 结构标记，数据契约取自脚本内组装函数片段与 mock。
### 数据契约（字段名级）

```
status: "ok"
data:
  op: "create" | "update" | "delete"          # 三个动作，实测只有这三种
  record_id: <int>                            # 档案单行表默认 1
  old_record: { 改前字段 }                     # 新建类为空 {}
  new_record: { 改后字段 }                     # 删除类为空 {}
  context: { kpis: [...], totals: [...] }
  summary: "<一句话摘要，可为空>"
  meta: { action_at, entity_type, undo_cli? }
message: "已生成<实体标签> 回执"
```

- `meta.entity_type` 是中文实体标签，实测取值例：`设置档案`、`设活动量`、`改档案`、`体重记录`、`记一餐`、`批量补记饮食`、`记一餐(同餐合并)`、`复制昨日饮食`、`改饮食记录`、`删饮食记录`、`记喝水`、`存食品`。
- `meta.undo_cli`：可撤销的动作带撤销命令（mock 例 `calorie_tracker.py undo-record 182`），对应「↩ 撤销」按钮。
- `old_record`／`new_record` 传的是**给用户看的子集**（脚本内叫 `new_disp` 呈现字段），不是库里的整行。
### 区块清单（模板结构标记实测）

| # | 区块 | 模板锚点 | 注入来源 | 默认可见 |
|---|---|---|---|---|
| 1 | 数据载荷 ＋ 公共脚本位 | `<!--INJECT-DATA-->` ＋ `<!--SHARED-HELPERS-->` | 整个 `data` ＋ 渲染基座 | — |
| 2 | 元信息左栏 ／ 标题 ／ 副标题 | `#metaLeft` ／ `<h1 id="h1Title">✅ 操作回执</h1>` ／ `#sub` | `meta.action_at` ／ 写死 ／ — | 是 |
| 3 | 身份卡 | `#idCard`：`#icon`(✓)／`#opTitle`／`#recordId`（形如 `#182`）／`#recordMeta`／`#summaryLine` | `op`、`record_id`、`meta`、`summary` | `#summaryLine` **默认隐藏** |
| 4 | KPI 卡片区 | `.kpi-grid` `#kpiGrid` | `context.kpis[]` | 是 |
| 5 | **「📋 字段变更」卡** | `.diff-card` `#diffCard` ＋ `#diffList` | `old_record` 与 `new_record` 对比 | **默认隐藏** |
| 6 | 「📊 今日累计」卡 | `.ctx-card` `#ctxCard` ＋ `#ctxList` | `context.totals[]` | 是 |
| 7 | 「📋 复制明细」卡 | `.items-card` `#itemsCard` ＋ `#itemsTitle` ＋ `#itemList` | 批量场景的行明细 | **默认隐藏** |
| 8 | 撤销按钮 | `#undoBtn`「↩ 撤销」 | `meta.undo_cli` | 是 |
### 关键交互

- **改前 → 改后对比卡确实存在**（`#diffCard` ＋ `<h2>📋 字段变更</h2>`）。有英文库列名到中文标签的映射表 `FIELD_LABELS`（25 条，覆盖档案／体重／饮食／食品库四类），脚本注释写明理由：「diff 卡必须中文，用户看不懂英文键名」（2026-08-02 用户拍板）。未在映射表里的列名原样显示。
- 卡片按场景**条件显示**：没有变更就不出对比卡，不是批量就不出复制明细卡。「复制明细」服务批量类场景；「今日累计」给出写动作对当天累计的影响。
### 共用范围（实测，与「6 个场景」的说法对不上）

- 脚本里 `build_live_*` 组装函数 **19 个**：设置档案／设活动量／改档案／改体重／删体重／记一餐／批量补记／同餐合并／复制昨日／改饮食／改某天饮食／删饮食／删一餐／删某天／删区间／记喝水／存食品／改食品／下架食品。
- 汇总助手只有 3 个：`_profile_receipt`、`_diet_receipt`、`_weight_delete_receipt`，全部产出同一套 `data` 形状。
- 结论：**共用的是数据契约与模板，不是场景数**。若「6 个场景共用」出自别处文档，本文不支持这个数字，实测是 19 个组装函数共用一个模板。
### 照搬价值：高（新仓当前缺口在这里）

- **新仓今天的回执只有摘要，老回执有 `#diffCard` 改前→改后对比卡＋中文标签映射。这是可直接补的一块。**
- 可照：① `op` 三值 ＋ `old_record`/`new_record` 双记录 ＋ `context.kpis/totals` 的数据契约；② 卡片按场景条件显示；③ `entity_type` 用中文实体标签进回执标题；④ 带撤销命令时给「↩ 撤销」按钮。
- 只此一处、不必照：`#ctxCard`「📊 今日累计」全库 1/74，属于老技能饮食记账的私有需求。

## 五、P2 `batch_import_preview.html` ＋ `render_batch_import.py`：批量导入预览（过程型）
### 数据契约（字段名级）

```
data:
  summary: { total, added, updated, skipped, failed, jsonl_path, passed?, is_validate?, scene?, _data_consistent }
  runs: [ { row|line, status, product_name|name, brand?, reason? } ]
  meta: { chain }
```

`runs[].status` 有两套取值，靠 `is_validate` 区分：导入形态是 `added`/`updated`/`skipped`/`failed`；校验形态（行上 `status` 只有 `ok`/`failed` 时判定）只算 `passed` 与 `failed` 两个数。`jsonl_path` 兜底 `"foods.jsonl"`。

渲染脚本在 `normalize()` 里做了四项兜底（这张页最值钱的部分）：① `name` → `product_name`、② `line` → `row` 两处改名，否则明细行显示「(无名)」；③ 缺 `jsonl_path` 时补默认值，注释写明「避免 prompt 中出现 undefined」；④ 若 `total ≠ added+updated+skipped+failed` 或 `total ≠ len(runs)`，置 `_data_consistent = false`。
### 区块清单（模板结构标记实测）

| # | 区块 | 模板锚点 | 注入来源 |
|---|---|---|---|
| 1 | 抬头小标 ／ 标题 ／ 副标题 | `.eyebrow#eyebrow` ／ `<h1 id="title">` ／ `#subtitle` | 写死「批量导入预览」／ 源文件名 `foods_2026-07.jsonl` ／「50 条 · 3 条失败 · 请核对」 |
| 2 | 药丸条 `#pills` | — | 状态计数小标签 |
| 3 | **「导入概览」** | `<h2>` ＋ `.kpi-grid#kpiGrid` | `summary` |
| 4 | **「处理进度」** | `<h2>` ＋ `.progress-bar#progressBar` ＋ `#progressRate` ＋ `#progressDetail` | 进度比例与明细 |
| 5 | **「明细」** | `<h2>` ＋ `#consistencyWarn` ＋ `.tabs#tabs` ＋ `#list` | `runs[]`，按状态分页签 |
| 6 | **「确认后操作」** | `<h2>` ＋ 三按钮 ＋ `.copy-preview#copyPreview` | 复制区 |
| 7 | 页脚 ＋ 回到顶部 ＋ 数据载荷 ＋ 公共脚本位 | `#pageFooter` ＋ `#backTop` ＋ `<!--INJECT-DATA-->` ＋ `<!--SHARED-HELPERS-->` | 与其余 3 张同一个位置 |
### 关键交互（过程型页面的共同形状，这张最完整）

- **确认后三个出口按钮**，各自对应一条复制内容：`#btnAdopt`「✓ 采纳(全部导入)」／`#btnModify`「📋 复制修改指令」／`#btnSkipFailed`「⚠️ 跳过失败行导入」。复制区初始文案 `点击上方按钮,指令将复制到剪贴板` —— 先给出口，再给落点。
- `#consistencyWarn`：数据自相矛盾时先警告，不静默展示。
- 命名与其余 3 张**不一致**：这里用 `#eyebrow` ＋ `#subtitle`，其余 3 张用 `#metaLeft` ＋ `#sub`；这里用 `.copy-preview`，profile_setup 用 `.prompt-box`。同一件事两套名字。
### 照搬价值：高（作为过程型页面的模板）

要收集什么／将要写什么／确认与复制区，这三段在这张页里齐了，是四张里结构最完整的过程型实物。

- 可照：① 「概览 KPI → 进度 → 明细（带页签）→ 确认后操作」四段式；② **多个出口按钮各自对应一条待复制指令**，比单一复制按钮更贴合「确认后要干什么」；③ 一致性警告位；④ 渲染前先做字段改名与缺值兜底。
- 需改：抬头与复制区的锚点名字要统一（别复制 `eyebrow`/`subtitle` 与 `metaLeft`/`sub` 并存的两套命名）。
- 与 profile_setup 的差别：profile_setup 是「填参数 → 出一条指令」，这张是「已处理完 → 出三条指令让用户选」。两者都是过程型，但一个是**输入前**、一个是**写入前**。

## 六、三个独立结论
### 1. `profile_setup.html` 是**写前**还是写后？

**写前。** 最硬的一条证据：脚本第 108 行落盘用 `html_scene_path(SKILL_DIR, '设置档案', 'process')`，场景参数是 `process`（过程型）；且数据里带的是 `exec_cmd_template` —— 一条**待执行的命令模板**，页面产物是「交给 AI 的参数 prompt」，而脚本本身只有 `profile.get_profile()` 的读路径，没有任何写档案调用。按钮文案「生成 prompt／复制 prompt」与复制区初始句「先填写参数 → 点击"生成 prompt"」也都指向「还没写」。
### 2. 哪些区块多张共有（＝值得抽公共组件），哪些只此一处？

- **四张全有（公共层四件套）**：`<!--INJECT-DATA-->`（72/74）、`<!--SHARED-HELPERS-->`（72/74）、`#actionbar-zone`（71/74）、`.kpi-grid`（43/74）。`#metaLeft` ＋ `#sub` 在 3 张里有（31/32），但 batch_import_preview 换成了 `#eyebrow` ＋ `#subtitle`，属于**同一位置的两套命名**。
- **分别成族、不是只此一处**：`#configForm` ＋ `.prompt-box` → 配置型过程页族；`.id-card` ＋ `.diff-card` ＋ `.items-card` → 回执型族；`.progress-bar` ＋ `#pageFooter` → 过程进度族。
- **真正的只此一处**：`.ctx-card`「📊 今日累计」全库 **1/74**，只在 `crud_receipt.html` 里，是饮食记账私有需求，不值得抽。`#metaLeft` 与 `.tabs` 只出现在少数页（31/74、4/74），抽取价值中等。
### 3. 老回执页有没有「改前 → 改后」对比卡？

**有。** `crud_receipt.html` 第 155–157 行：

```html
<div class="diff-card" id="diffCard" style="display:none">
  <h2>📋 字段变更</h2>
  <div id="diffList"></div>
```

数据侧由 `old_record` 与 `new_record` 双记录支撑，标签走 `FIELD_LABELS` 中文映射表（25 条），脚本注释写明理由「diff 卡必须中文,用户看不懂英文键名」（2026-08-02 用户拍板）；没有变更时该卡默认不显示。**新仓今天的回执只有摘要，缺的就是这一块。**

## 待确认

1. **`crud_receipt` 的落盘名规则未证实**：脚本第 1320 行是 `html_scene_path(SKILL_DIR, cmd_name, ot, suffix=file_suffix) if ot else html_path(...)`，带条件分支与后缀参数，我只看到这一行，没读分支上下文，因此「回执页落盘名形如 `X_回执_<TS>.html`」仍属推断。
2. **卡片可见性的判定逻辑未证实**：已知 `#diffCard`／`#itemsCard`／`#summaryLine` 默认 `display:none`，但「什么条件下前端把它显示出来」的判定在 HTML 的脚本段里，未读。
3. **回执共用范围两个口径对不上**：实测 `build_live_*` 组装函数 19 个、汇总助手 3 个；任务书说「被 6 个场景共用」，19 与 6 的差在哪未证实。
4. **`crud_view` 的 mock 与 live 有一处不一致**：mock 明细里 TDEE 行写 `× 1.4`，字段区活动系数写 `× 1.55（中度档）`。判断是 mock 文案陈旧（live 走 `get_activity_factor` 系数表），未执行验证。
5. **落盘名的通用拼法未验证**：只在 `profile_setup` 见到 `'设置档案'+'process'`、在 `crud_view` 见到 `'查档案'+'result'`；`render_batch_import.py` 的 `main()` 尾部未读，另两类的 `html_scene_path` 实调未取到。
6. **`plan_builder_wizard.html`（38 KB）完全未查**（四张指定实物里已完成 `batch_import_preview`，该张作为备选未动）。
