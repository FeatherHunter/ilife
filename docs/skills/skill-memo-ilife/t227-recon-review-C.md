# t227 侦察报告 · 对抗式复审（复审员 C · 数字打假）

- 被审对象：`docs/skills/skill-memo-ilife/t227-datasource-recon.md`
- **审计冻结版**：SHA256 `A645AEC213083AC7C912884A6030EA0A82E1135F271BAA46EEFCEBB7990027CA`，**65 717 B**，末行 LF 收尾，**647 行**，**无 BOM**，**无字面反斜杠-n**（首字节 `23-20-74` ＝ `#`＋空格＋`t`，不是 BOM；`LF=647 / CR=0`，全用真实换行）
- ⚠️ **审计对象在审计开始时仍在被写入**：首次列目录时为 65 386 B @13:12:41，随后变为 65 717 B @13:12:49。本报告所有行号一律按**冻结版**（647 行）计。
- ⚠️ **派单元数据与实物不符**：派单书写「59 209 B，610 行，自证断言汇总在 `:610`」；实物是 65 717 B／647 行，**自证断言汇总在 `:647`**。以下的「报告写 X」均按冻结版原文引用，行号已重标。
- 本席纪律：**只读**。未改 `packages/**`、未改任何 issue、未 `git add`／`commit`、未触碰工作树里别的会话的未提交改动、未改老技能目录 `D:\2Study\StudyNotes\SKILLS\备忘录\**`（含 `references/scenarios.yaml`／`SKILL.md`／`script/memo_render.py`／`script/memo_cli.py`，全部只读）。唯一新建文件＝本报告。
- 复算脚本落在**仓外**临时目录 `%TEMP%\t227c\`（`a1_yaml.py`…`a13_last.py`），只读上述三处事实源。**未运行报告附录 G 的任何脚本，也未运行 `t222-extract.mjs`**（它会写 `t222-evidence/`）。
- 独立复算声明：我先读完附录 G 的方法，再**自己实现**（自己 replay 分组／自己从源码里解析 `DIM_LABEL_MAP`／自己解析报告正文表格再与我的结果对差）。凡与报告不符处，一律以我重跑的输出为准并原样贴出。

---

## 1. 总评 ＋ 评分

### 一句话

**这份报告的“骨架数字”经得起打：`:647` 的 15 条自证断言，我逐条重算，15 条全对；#227 建资产要用的那几个数（30 场景／8 域／13 二级组／4 兜底／76 字段／29 场景／30 行 type 表／13 行 id 对照／两者缺 3 子命令／skeleton mismatch=0）**全部复现成功**。**打掉的是它的“派生数与子断言”**：清洗并集（23→22）、`--html` 条数（4→6）、老文档统计行改口（✅10/🟡3→✅11/🟡2）、E.3 的“33 组 27＋3”、一处源码行号（`memo_cli.py:117`→`:1575`）、B.6 顶层闭集（7→9 键，漏 `meta_blocks`/`recommendations`）。

### 评分

| 维度 | 得分 | 扣分点名 |
|---|---|---|
| 数字准确 | **31 / 40** | 扣 9：`:297`「① ∪ ② = 23」错（真值 22，且与它自己 A.8 表的标记数矛盾）；`:590`「清洗 23 条（1 ＋ 10 非 html 落回 ＋ 12）」错（真值 1 ＋ 9 ＋ 12 = 22，布尔行被重复计入）；`:179`「`--html` 4 条」错（真值 6，且同句括号里自己列了 6 个行号）；`:432`／`:599` 老文档统计行改口「✅10 / 🟡3（未编号则 4）」错（真值 编号行 ✅11 / 🟡2，含未编号行位 🟡3；老文档的 ✅10 本身也错，报告照抄未纠）；`:584`（E.3）「33 个场景组里 27 条两原子、3 条三原子」错（真值 30 场景 ＝ 26 两原子 ＋ 4 三原子）；`:449`「`memo_cli.py:117`」错（真值 `:1575`）；`:476` 顶层允许键 7 个错（真值 9 个）；`:255` 的 `SKILL.md:265／:732` 出处标错（那两行是「备忘改分类(批量)」，非逐字 `批量改分类`）。**未扣**的是 15 条自证断言与全部资产承重数——它们一条不错。 |
| 方法可复现 | **24 / 30** | 扣 6：附录 G 的方法基本可跑（我按它描述的口径能独立复现 13 项），但两处方法本身产不出它写的数：①「6 个 prompt 命令 token 命中场景 = 8」这一行的 token 集合与 `:179` 的「`--html` 4 条」互斥（按列出的 token 扫，`--html` 必得 6）；②老文档统计行用「emoji 计数」还是「行位计数」没定义，导致 `:432` 与 `:599` 自相矛盾（3 vs 4）。另扣：报告在审计期间仍在被重写（13:12:41→13:12:49 两次落盘），复现基准不稳定。 |
| 结论可靠 | **25 / 30** | 扣 5：核心结论（权威形状＝`memo_render.py:527-599`；skeleton 形状不对但内容对；只有 4 处源；二级组 id 必须偏离老家 0 起；`aliases` 在 schema 里无位）我逐条核过，**全部成立且是承重结论**。扣分在：① E.9 把「清洗 23 条」写进施工要点，会把错数传成施工量；② B.6 顶层闭集漏 `meta_blocks`／`recommendations`，而 `meta_blocks` 恰是老实物装 HELP 自身唤醒词的那一格（`wake-assets.ts:980` 逐字承认），F.8「`help_only` 9 条无源可派生／处置待票 8」因此**漏报了一个现成的合规落点**；③ E.18 给出的替代数字本身是错的，等于用一个错数去纠另一个错数。 |
| **合计** | **80 / 100** | 结论：**可用，但施工前必须按第 5 节改 6 处；照抄 E.9／E.18 会带错基准。** |

---

## 2. 打假 1–10 逐条作答

### 打假 1 —— 场景/域/二级组/兜底/dims/涉及场景

**核实＝通过（6/6 全对）。**

命令：`python %TEMP%\t227c\a1_yaml.py`（自己 `yaml.safe_load` 老 yaml，按 `category` → `subfunction or "基础"` 首次出现序 replay，不跑报告脚本）

原始输出（节选）：

```
categories: 8 ['memo', 'search', 'remind', 'wish', 'checkin', 'mood', 'sync', 'init']
scenarios : 30
subgroups total: 13
fallback(基础) subgroups: ['checkin_0', 'mood_0', 'sync_0', 'init_0']
scenes landing in fallback: 8
scenarios with no subfunction: 8 [...]
total rows          : 76
scenarios involved  : 29
scenarios with none : ['memo_init_setup']
```

逐项：`场景=30` ✓／`域=8` ✓／`二级组=13` ✓／`兜底=4` ✓／`editable_fields=76` ✓／`涉及场景=29` ✓（`memo_init_setup` 是唯一 `dimensions` 为空的场景）。报告 `:109`「30 条全进（`available = 30`）」也由 `status` 实测 `Counter({"''": 30})` 佐证 ✓。

### 打假 2 —— ①布尔 / ②ASCII 回落 / ③html / ②非③

**核实＝四数全通过；但由它们派生出的「并集」不通过（见错数 1、2）。**

命令：`python %TEMP%\t227c\a1_yaml.py`（`DIM_LABEL_MAP` 从 `memo_render.py:49-69` **正则解析出来**，不是我手抄的）

原始输出：

```
class(1) bool name/label : 1 [('memo_delete_basic', True, True)]
class(2) label==raw key  : 21
   keys: {'html': 12, 'start': 1, 'end': 1, 'remind_at': 2, 'repeat_rule': 2, 'status': 1, 'tasklist_guid': 1, 'reminder_id': 1}
html-key rows: 12  (memo_search_keyword ... memo_sync_feishu)
distinct raw dim keys (23): ['True','bulk_indicator',...,'with_reminders']
keys NOT in MAP: ['True','end','html','remind_at','reminder_id','repeat_rule','start','status','tasklist_guid']
```

- `① = 1` ✓：`dimensions` 的 `true:` 键被 PyYAML 解析成布尔 `True`，`MAP.get(True, True)` 返回**布尔** `True`（`True != "true"`），故 `name` 与 `label` 都成 `True`——报告 `:292` 的判断逐字正确。
- `③ = 12` ✓：`html` 键出现在 12 个场景，清单与报告 `:294` 逐字一致。
- `② = 22` ✓：`label == 原始键名` 的**非布尔**行 21 条（`html`×12／`start`×1／`end`×1／`remind_at`×2／`repeat_rule`×2／`status`×1／`tasklist_guid`×1／`reminder_id`×1）＋布尔行 1 条 ＝ 22；去重 9 键 ✓（8 个 ASCII 键 ＋ `True`）。
- `② 非 ③ = 10` ✓（22 − 12）。
- 我另外把**报告自己的 A.8 76 行表**解析出来数它的缺陷列：`rows=76 ①=1 ②=22 ③=12 ②且非③=10 union(①|②)=22`——**表是对的，正文 `:297`／`:590` 的 23 是错的**。

### 打假 3 —— `aliases=12`（3 ＋ 4 ＋ 5，唯一 12 无重复）

**核实＝通过。**

命令：`python %TEMP%\t227c\a9_final.py`／`a6_misc.py`（把 A.7 的 12 条硬编码后与 30 个 `wake_word` 全枚举，并逐条 grep 出处行）

原始输出：

```
alias count: 12 unique: 12
alias that equals some wake_word: []
alias == own scene wake_word: []
total substring pairs: 6
   搜备忘 ⊂ 按时间搜备忘        wake:memo_search_keyword -> wake:memo_search_by_date same_scene=False
   查情绪 ⊂ 查情绪日记         same_scene=True
   记情绪 ⊂ 记情绪日记         same_scene=True
   删情绪 ⊂ 删情绪日记         same_scene=True
   改情绪 ⊂ 改情绪日记         same_scene=True
   改子分类 ⊂ 备忘改子分类      alias -> wake  same_scene=True
```

- 12 条全部唯一、且**没有任何一条等于某个 `wake_word`**（报告 C.4「别名与别场景/本场景 `wake_word` 重名：0 处」✓）。
- C.4 的「子串包含对 ＝ 6 对／跨场景只有 1 对」我独立枚举 `{30 主词} ∪ {12 别名}` 全部子串关系，**正好 6 对，跨场景正好 1 对**（`搜备忘 ⊂ 按时间搜备忘`）✓，连 5 对的同场景归属也对。
- 出处逐条核（`wakewords.ts` 行号我直接读了仓内文件）：`:16`＝`批量改分类` ✓／`:17`＝`改子分类` ✓／`:22`＝`查提醒` ✓／`:28`＝`记一条` ✓／`:29`＝`添加笔记` ✓ **五处行号全中**；`SKILL.md` 的 `:262`／`:300`／`:479`／`:525`／`:536`／`:540`／`:547`／`:563`／`:477` 逐条命中 ✓。
- **唯一出处标错**见错数 8（`:255` 的 `SKILL.md:265／:732`）。

### 打假 4 —— `prompt 需改=8`

**核实＝总数通过；`--html` 子断言不通过；另有 2 处 token 漏列（不改总数）。**

命令：`python %TEMP%\t227c\a2_prompts.py`（对 30 条 `prompt` 全文扫：`--\w+`、短开关 `-[a-zA-Z]`、`memo\.\w+`、`memo_cli.py`、`script/`、21 个子命令名作为独立词）

原始输出：

```
scenes with ANY command-ish token: 8 ['memo_search_keyword','memo_get_detail','memo_search_wish',
  'memo_reminders_active','memo_complete_wish','memo_wish_schedule','memo_batch_change_category','memo_sync_feishu']
scenes with --html : ['memo_search_keyword','memo_get_detail','memo_reminders_active',
  'memo_complete_wish','memo_wish_schedule','memo_sync_feishu']  6
scenes with memo.   : []
scenes with memo_cli.py : []      scenes with script/ : []
   complete-wish  ['memo_sync_feishu']
   update-category ['memo_batch_change_category']
   wish-batch-plan ['memo_wish_schedule']
   wish-complete  ['memo_complete_wish']
   due ['memo_wish_schedule','memo_sync_feishu']
   -c 出现在 memo_search_wish 的 '...等同搜备忘 -c 心愿。'（1 处）
```

逐条核它列出的 8 行（我把 8 行的「原文片段」逐字回查 prompt，全部命中）：1 `memo_search_keyword`(yaml 150-151) ✓、2 `memo_get_detail`(180) ✓、3 `memo_search_wish`(215) ✓、4 `memo_reminders_active`(299) ✓、5 `memo_complete_wish`(332) ✓、6 `memo_wish_schedule`(351-352) ✓、7 `memo_batch_change_category`(372) ✓、8 `memo_sync_feishu`(388-389) ✓（第 8 行的片段是 388 与 389 两行的联接，两半都逐字存在，属表达方式而非错引）。

判定：

- **没有多算**：8 个命中场景与我的独立扫描**集合完全相同**；`memo.`／`memo_cli.py`／`script/` 形态实测 0 条，报告 `:163` 的「0 条」✓。
- **没有漏场景，但漏 token**：① `memo_wish_schedule` 的 `--suggest-due`（yaml:351，真实 CLI 开关，`memo_cli.py:1618`）没进「命中 token」列；② `memo_sync_feishu` 的 `反向同步 due(飞书 due 改 → 本地 notes.due 跟)`（yaml:389）里的**裸词 `due`** 就是 `memo_cli.py:1653` 的子命令名，报告只列 `complete-wish`＋`--html`（它在 A.5.2 另立一行记了 `notes.due`，算部分覆盖）。
- **`--html` 4 条 —— 不通过**：真值 **6 条**；而且报告自己的括号「（1/2/4 各 1 处 ＋ 5/6/8）」列的正是这 6 行。`4 + 4 = 8` 也不可能成立，因为第 5/6/8 行**同时**含子命令名与 `--html`。正确分解：`--html` 6 ＋ 子命令名 4（`wish-complete`／`wish-batch-plan`／`update-category`／`complete-wish`）＋ `-c` 1，并集 8。

### 打假 5 —— `type→types 表=30 行` ＋ 原子计数

**核实＝完全通过（表逐行零误差，`选择` 确认不出现）。**

命令：`python %TEMP%\t227c\a11_diff.py`（把报告 A.6 表**逐行解析**，用 `scenario_id` 与老 yaml 的 `type`／拆分结果／原子数三项对差）

原始输出：

```
== A.6 type table diff ==
  data rows: 31   mismatches: 0
  ids covered == 30 unique: 30 30
  ids missing from table: []
== types ==
type values  : Counter({'采集+回执': 16, '查看+回执': 10, '向导+采集+回执': 4})
atom counter: {'采集': 20, '回执': 30, '查看': 10, '向导': 4} sum: 64
"选择" present: False
```

`{回执:30, 采集:20, 查看:10, 向导:4}` 合计 64 **逐字复现** ✓；30 行覆盖 30 个唯一场景、无重无漏 ✓；`选择` 不在数据里 ✓（同时确认模板 `TYPE_DEFAULT` 的 10 词里**有** `选择`（`help-template.html:1705`），报告 `:237` 的「模板零改动」说法成立）。

**但同一议题在 E.3 的散文里是错的**：`:584` 写「33 个场景组里 27 条两原子、3 条三原子」。实测 **30 场景 ＝ 26 条两原子 ＋ 4 条三原子**（三原子＝`memo_complete_wish`／`memo_wish_schedule`／`memo_batch_change_category`／`memo_init_setup`）。该句自带「以 A.6 全表为准」的免责，但数字本身不成立。

### 打假 6 —— `二级组 id 对照=13 行`（老 0 起 → 新 1 起）

**核实＝完全通过（13 行零误差，4 处兜底标对）。**

命令：`python %TEMP%\t227c\a12_diff2.py`（解析报告 A.9 表 8 列：域 key／老 id／新 id／label／场景数／兜底／组内场景序，逐格对差）

原始输出：

```
== A.9 subgroup table (8 cols) ==
  data rows: 13  mine: 13  match: True
  mismatched rows: 0
  fallback rows flagged: 4
  scenes total in table: 30
```

我的独立 replay（老 id ＝ `f"{cat_key}_{len(g['subgroups'])}"`，label 认身份、书写序定组内序）：

```
  memo 📝 备忘类 : memo_0 基础记录(3) / memo_1 分类调整(3)
  search 🔍 查找类: search_0 基础查找(3) / search_1 时间查找(1) / search_2 分类查找(3)
  remind ⏰ 提醒类: remind_0 创建提醒(2) / remind_1 查看提醒(2)
  wish 🎯 心愿类  : wish_0 心愿推进(2) / wish_1 心愿管理(3)
  checkin ✅ 打卡类: checkin_0 基础(3)   mood 💭 情绪类: mood_0 基础(3)
  sync 🔄 同步类  : sync_0 基础(1)      init 🚀 初始化类: init_0 基础(1)
```

与报告 A.9 的 13 行**逐格一致**（含 `memo_batch_change_category` 虽在 yaml 第 19 条却落在第 2 个二级组末尾、`search` 组的 3／1／3 分布、4 处「基础」兜底＝`checkin`／`mood`／`sync`／`init`）。报告 `:408`「8 条无 `subfunction` 落成 4 个基础组」也实测吻合（`scenarios with no subfunction: 8`，且正好分布在这 4 个域）✓。

### 打假 7 —— `21 子命令中两表缺=3`

**核实＝通过（票面说 2，报告说 3，报告对）。**

命令：`python %TEMP%\t227c\a3_skill.py` ＋ `a4_rows.py`（正则扫 `memo_cli.py` 的 `add_parser(`；再对 `SKILL.md:147-172` 与 `:226-292` 逐行以 `(?<![\w-])CMD(?![\w-])` 匹配并打印命中上下文，人工确认无散文误命中）

原始输出：

```
subparsers @1541: sub = parser.add_subparsers(dest="command")
raw 'add_parser(' occurrences: 21     add_parser count: 21
  add@1544 search@1553 update@1562 delete@1571 complete-wish@1579 get@1587 search-date@1592
  update-category@1600 update-sub-category@1605 set-due@1610 wish-batch-plan@1615 wish-complete@1622
  batch-update-category@1635 sync-from-feishu@1641 remind@1645 due@1653 dismiss@1657 reminders@1661
  completed@1666 init-report@1673 help@1687
-- T1 147-172  present 16  missing 5: ['completed','dismiss','due','init-report','update-sub-category']
-- T2 226-292 present 16  missing 5: ['complete-wish','dismiss','due','init-report','set-due']
  union: 18   missing from both: ['dismiss', 'due', 'init-report']
```

- 21 条 ✓，**报告列的 21 个行号逐个命中**（我全部核过，无一错）✓；`:1541` 单一 `add_subparsers` ✓；`:1696+` 是 dispatch（实测 `1696 args = parser.parse_args()`）✓。
- 覆盖度 16／16／并集 18／两表缺 **3**（`dismiss`／`due`／`init-report`）✓——报告比票面多抓的 `dismiss` 是真的：`SKILL.md:839-840` 只有「### 废弃提醒 / 命令:`script/memo_cli.py dismiss <id>`」一行，两张表确实都没有它 ✓。
- `complete-wish`(1579) 与 `wish-complete`(1622) 确为两条不同子命令 ✓（报告该提醒成立）。
- ⚠️ 我在确认命中上下文时专门排掉了误命中（`help` 在 T1 命中 `:172` 的 `` `help` `` 与用户原话 `"help"` 两处，均为真实命令列；`update` 在 T2 命中 `:240/:252/:256/:260` 的 `` `update` ``，非 `update-sub-category` 的子串）——结论不受影响。

### 打假 8 —— 形状断言复算（skeleton vs 老 yaml，mismatch=0）

**核实＝通过（0 就是 0）。**

先读附录 G 写的口径（`30 条 × 9 字段与 t222-skeleton.json.old_scenes 逐字段 ==`），再**自己实现**：字段对＝`scenario_id↔id`、`scenario_title↔title`、`type↔type`、`status↔status`、`category↔category`、`wake_word↔wake[0]`、`subfunction↔subfunction`、`len(dimensions)↔n_dims`、**书写序↔数组下标**；另**单独复跑它 G 表里写的第 9 项**（`yaml 行 m['line'] 内容含 id 或唤醒词`）。

命令：`python %TEMP%\t227c\a5_skeleton.py` ＋ `a9_final.py`

原始输出：

```
comparisons run per field: {'scenario_id<->id': 30, 'scenario_title<->title': 30, 'type<->type': 30,
 'status<->status': 30, 'category<->category': 30, 'wake_word<->wake[0]': 30,
 'subfunction<->subfunction': 30, 'len(dimensions)<->n_dims': 30, 'index/order': 30} total: 270
MISMATCH COUNT: 0
  line-content fails: [] count: 0
  landing=none -> keys==[] : True
  wake length histogram: Counter({1: 30})   sk ids not in yaml: []   yaml ids not in sk: []
```

附带复核了它引用 skeleton 的其它数：顶层键 **12 个且集合逐字相同** ✓；`counts` **27 键** ✓；`old_dims_total=76` ✓；`old_domains=8`／`old_subs=13`／`old_sub_fallback=4`／`old_unique_wake=29`／`old_none=12`／`old_hit=18`／`old_ambiguous_routes=1` ✓；`wake` 长度直方图 `{1:30}` ✓（无一条把多词包成数组）；`keys` 为 `[]` 的场景 ＝ `landing=none` 的场景 ＝ 12 条，一一对应 ✓（报告 A.8「`keys` 与老 `dimensions` 无关」的判断因此成立）。

### 打假 9 —— 权威转换层 claim ＋ `subgroups[].id` 到底几起？

**核实＝通过（引用逐字对得上；0 起判断正确；与票 6 V8=A 不打架，报告自己已显式标注偏离）。**

命令：直接 `read` `memo_render.py:520-609`、`:36-75`；`python %TEMP%\t227c\a7_repo.py` 核仓内先例与 t226 决议。

逐条对源码（**它贴的行号与实际文件逐一对上了**）：

| 报告写 | 实际文件 | 判定 |
|---|---|---|
| `:527-599` `_scenarios_to_contract_data()` | `527 def _scenarios_to_contract_data(scenarios_data):` … `599` 收 `}` | ✓ |
| `:569-581` scene 组装（粘贴的 `scene = {...}` 6 行） | `569`-`581` 逐字相同 | ✓ |
| `:556-560` 二级组 id（粘贴 4 行） | `556`-`560` 逐字相同 | ✓ |
| `:559` `f"{cat_key}_{len(g['subgroups'])}"` | `559` 逐字相同 | ✓ |
| `:562-567` `editable_fields` 列表推导 | `562`-`567` 逐字相同 | ✓ |
| `scenario_id→id`／`scenario_title→title`／`wake_word→wake_word`／`status→status`／`prompt→prompt_template` | `570`／`571`／`572`／`573`／`574` | ✓ |
| `type` 按 `+` 拆 | `576 [t.strip() for t in str(s.get("type","")).split("+") if t.strip()]` | ✓ |
| `dimensions→editable_fields`（`name/label/value/hint/required`） | `563-567` | ✓ |
| `:584` `available = sum(...)` | `584` 逐字相同 | ✓ |
| `:535` `result / dependencies 不展示` | `535` 逐字相同 | ✓ |
| `:544` categories 序 ＝ groups 序 ／ `:557` 按 `label` 认身份 | `544`／`557` | ✓ |
| `:49-69` `DIM_LABEL_MAP` **19 键** | `49`-`69`，我解析出恰好 19 键且键名列表逐字相同 | ✓ |
| `:602-661` `render_help()`／`:606` 时间戳路径形态 | `602` 定义、文件 661 行、`606` 是时间戳副本行 | ✓ |
| `memo_cli.py:1541`／`21 条 add_parser`／`:1696+` dispatch | 全部命中 | ✓ |
| `:449` `memo_cli.py:117` `p_del.add_argument("-y","--yes",...)` | **实际在 `1575`**（`117` 是 `_rel_media_path` 里的空行） | **✗ 错数 6** |

**`subgroups[].id` 的通式＝0 起**：`f"{cat_key}_{len(g['subgroups'])}"` 在 `append` **之前**求值——第一个二级组拿到 `_0`。我 replay 出的老 id 就是 `memo_0`／`search_0`… ✓。报告 `:387` 的判断正确。

**会不会和「新资产 1 起」打架？——不会，而且报告自己已经把这处偏离挑明了**（`:68` ⚠️、`:386-388`、`:585` E.4）。我核了票面原文：

```
t226-body.md:31| 16. **二级组 `id` 序数从 0 还是 1 起**：老 `subgroups[].id` 是 `memo_0`／`memo_1`…（**0 起**），与记账／居家（1 起）不同。
t226-body.md:46| | U8 | A | 照老写「基础」，保持 13 个二级组 |
t226-body.md:54| | V8 | A | 二级组 id 从 1 起 |
```

即：**老家 0 起（事实）**、**票 6 V8=A 裁新资产 1 起（裁决）**，两件事分属事实与裁决，不冲突；报告要求「不要照抄 `:559` 的生成式」是正确施工口径。仓内先例也支持 1 起：`gen-wake-assets.mjs:37 subgroup: 'write_1'` ✓；`EXPECT = {groups: 7, subgroups: 20, scenes: 71, uniqueWakeWords: 70}`（`:30`）✓、`assertShape` 函数体 `:99-118` ✓、新增条目挂位 `:120-130`（`withAddedScenes`）✓——报告的引用全对（唯一瑕疵：它把 `--check` 标在 `:10`，实际 `--check` 出现在 `:9`／`:12`／`:146`／`:231`／`:246`；`:12-13` 的「事实源在仓外／CI 不跑」引用 ✓）。

### 打假 10 —— 它自报的「老文档统计表算错」

**核实＝不通过（主要发现对，但它的“更正数”自己也错，且漏掉一处更大的错）。**

命令：`python %TEMP%\t227c\a4_rows.py`（逐行解析 `SKILL.md:235-266` 的 `#` 列与 `HTML?` 列，按“编号行／未编号行／全部行位”三种口径分别计数）

原始输出：

```
237| #=1   HTML=❌ 记备忘        ...        264| #=28  HTML=✅ 备忘录同步
262| #=26  HTML=🟡 完成心愿(别名:完成打卡)   265| #=-   HTML=🟡 **备忘改分类(批量)**
263| #=27  HTML=🟡 心愿排期              266| #=29  HTML=✅ **备忘录 HELP**
numbered rows: n=29 {'❌': 16, '✅': 11, '🟡': 2}
all row-positions: n=30 {'❌': 16, '✅': 11, '🟡': 3}
rows where HTML col == ✅: ['2','3','6','7','12','13','17','21','25','28','29']
rows where HTML col == 🟡: ['26','27','-']      ❌: 16 行
270| | HTML? | 数量 | 唤醒词 |
272| | ✅ 必须生成 HTML | 10 | 搜备忘/查备忘/看备忘/按时间搜备忘/看提醒/查已提醒备忘/查心愿/查打卡/查情绪/备忘录 HELP |
273| | 🟡 过程型 HTML | 4 | 完成心愿(完成打卡)/心愿排期/备忘改分类(批量)/(批量场景) |
274| | ❌ 不生成 HTML | 15 | 记备忘/改备忘/删备忘/备忘改分类(单条)/备忘改子分类/记提醒/设提醒/记心愿/删心愿/改心愿/记打卡/删打卡/改打卡/记情绪/删情绪/改情绪 |
275| | **合计** | **29** | (含 12 个子唤醒词) |
首次使用/初始化 inside 226-292: []
```

- 报告说对了的：**❌ 统计行写 15，实际清单列了 16 个词** ✓（我数 `:274` 得 16 个字：记备忘/改备忘/删备忘/备忘改分类(单条)/备忘改子分类/记提醒/设提醒/记心愿/删心愿/改心愿/记打卡/删打卡/改打卡/记情绪/删情绪/改情绪）。
- 报告说错了的：它称「实测编号行 `✅10 / 🟡3（含未编号批量行则 4 行位）/ ❌16`，`10+16+3 = 29` ✓」。真值：**编号行 1–29 ＝ ✅11 / 🟡2 / ❌16**（＝29 ✓）；**含未编号批量行则 🟡3 个行位**（不是 4）。它的 `{10,3,16}` 只在「**去掉 HELP 行但补进未编号批量行**」这种混口径下才凑得出 29，而这个口径它从没写明，且与它自己的括号（🟡 4 行位）互相矛盾。
- **它还漏了一处**：统计行的 `✅ = 10` **本身也是错的**——`:272` 的 10 词清单漏了 `:264` 的 **备忘录同步（#28，✅）**，表里 ✅ 行实为 **11 行**。报告把老文档的 10 原样当成“实测”值抄了下来。
- 其余引用（`:268-275` 是统计表、`:290-292` 是防裂缝守护、`:265` 是唯一未编号行＝「备忘改分类(批量)」🟡、**此表没有「首次使用」行**）**全部命中** ✓——最后一条我用全文 grep 证实 `226-292` 区间内 `首次使用`／`初始化` 出现 0 次 ✓。

---

## 3. 错数清单（一条一行）

1. **报告写** `:297`「实测 **① ∪ ② = 23 条**（…「1 ＋ 10（非 html 回落）＋ 12」= 23）」「按 23 条去清」 → **实际是 22 条**（①⊂②，布尔行被同时算进 ① 和「10 非 html 回落」；正确的互斥分解是 **1 布尔 ＋ 9 非 html 非布尔落回 ＋ 12 html ＝ 22**） → 证据：`a1_yaml.py` 的 `class(1)=1`、`class(2)=21`、`html rows=12`；`a12_diff2.py` 解析它自己的 A.8 表得 `union(①|②)=22`（表对、正文错）。
2. **报告写** `:590`（E.9）「先清洗 **23** 条（1 布尔 ＋ **10 非 html 落回** ＋ 12 html 剔除）」「**10 条落回**补中文名」 → **实际 22 条**（1 ＋ 9 ＋ 12）；需补中文名的非布尔落回行是 **9 条**（`remind_at`×2／`repeat_rule`×2／`start`／`end`／`status`／`tasklist_guid`／`reminder_id`），布尔行另有 1 条（它自身 `name`/`label` 都要改） → 证据：同上；`html` 之外、且非布尔的落回键计数 ＝ 9。
3. **报告写** `:179`「**`--html` 4 条**（1/2/4 各 1 处 ＋ 5/6/8）」 → **实际 6 个场景含 `--html`**（`memo_search_keyword`／`memo_get_detail`／`memo_reminders_active`／`memo_complete_wish`／`memo_wish_schedule`／`memo_sync_feishu`） → 证据：`a2_prompts.py` 的 `scenes with --html : [...] 6`；且该句自身的括号就列了 6 个行号，`4 + 4 = 8` 与「5/6/8 同时含子命令名」也不相容（正确分解：`--html` 6 ＋ 子命令名 4 ＋ `-c` 1，并集 8）。
4. **报告写** `:432`／`:599`（E.18）「实测编号行 **✅10 / 🟡3**（含未编号批量行则 **4 行位**）／❌16，`10+16+3=29` ✓」 → **实际 编号行 1–29 是 ✅11 / 🟡2 / ❌16（＝29），含未编号行则 🟡3 个行位** → 证据：`a4_rows.py` 逐行解析 `SKILL.md:237-266`：`✅` 行 ＝ `#2,3,6,7,12,13,17,21,25,28,29`（11 行），`🟡` 行 ＝ `#26,#27`（＋未编号 `:265`）＝ 2（3 行位），`❌` ＝ 16 行。
5. **报告写** `:432`（B.2）「老文档统计表写 `✅10 / 🟡4 / ❌15`，**实测 ✅10** / 🟡3 / ❌16」 → **老文档的 ✅10 也是错的，实测表内 ✅ 行是 11 行**（`:272` 的清单漏了 `:264` 的「备忘录同步」#28） → 证据：`a4_rows.py` 输出 `rows where HTML col == ✅: ['2','3','6','7','12','13','17','21','25','28','29']`，而 `:272` 列的 10 个词里没有「备忘录同步」。
6. **报告写** `:584`（E.3）「**33 个场景组**里 **27** 条两原子、**3** 条三原子」 → **实际 30 个场景：26 条两原子 ＋ 4 条三原子** → 证据：`a1_yaml.py` 的 `type values: Counter({'采集+回执': 16, '查看+回执': 10, '向导+采集+回执': 4})`，`len3 = 4`，`multi-atom = 30`。
7. **报告写** `:449`（B.3）「**`:117`** `p_del.add_argument("-y","--yes",...)`」 → **实际在 `memo_cli.py:1575`**（`117` 是 `_rel_media_path` 里的空行） → 证据：`a10_doc.py` 打印 `'--yes' lines: [1575]`、`'"-y"' lines: [1575]`，且 `1571 p_del = sub.add_parser("delete")`／`1575-1576` 的 help 文本「跳过二次确认（QQbot 自动化用）」正对应 yaml 的 `true: 跳过二次确认(自动化用)`。
8. **报告写** `:476`（B.6）顶层允许键「`skill_name` / `title` / `subtitle` / `version` / `init_banner` / `contact` / `groups`（7 个）」／行号 `:106-135` → **实际顶层闭集是 9 个键**：上列 7 个 **＋ `meta_blocks` ＋ `recommendations`**（`help.ts:113-237`，顶层对象到 `:238` 才闭合） → 证据：`a8_source.py` 解析 `help.ts:112-238` 得 `top-level keys found: ['skill_name','title','subtitle','meta_blocks','groups','init_banner','contact','version','recommendations']`。（`scenes[]` 7 键、`subgroups[]` 3 键、`editable_fields[]` 5 键、`required` 三处、`status` enum `:172`、`name`/`label` string `:181-182` 这些**都对**，只有顶层这一行错。）
9. **报告写** `:255`（A.7 第 8 行）`批量改分类` 的出处「`SKILL.md:265`／`:732`」 → **这两行是「备忘改分类(批量)」写法，不含逐字 `批量改分类`**；逐字出现处是 `SKILL.md:169`／`:644`／`:731`（`### 批量改分类向导`）／`:754` → 证据：`a6_misc.py` 全文字符串检索 `批量改分类 SKILL.md lines: [169, 216, 638, 644, 731, 754]`（`638` 是章节标题「避免与『批量改分类向导』歧义」）。（同一表第 10 行 `查提醒` 也有出处缺口：`SKILL.md` 里 0 次正确 ✓，但仓内 `memo_render.py:45` 的 `COMMAND_CN_MAP` 里就有 `"reminders": "查提醒"`，报告未列。）
10. **审计元数据**（不是报告内容，但影响派单）：派单写「59 209 B／610 行／断言汇总裁 `:610`」 → **实物 65 717 B／647 行／断言汇总裁 `:647`**，且审计开始后 8 秒内仍被改写一次（65 386 B@13:12:41 → 65 717 B@13:12:49） → 证据：`Get-FileHash` `A645AEC2…`；三次连读 `len=65717 mtime=13:12:49.305 lines=647 sha=A645AEC21308` 稳定。

---

## 4. 对 #227 的杀伤评估（按严重度排序）

**先说结论：#227 的「逐字对得上（条数／名称／顺序）」判据本身没被这些错数伤到。**我把 #227 建资产真正要用的每一个基准量都重算过——30 场景、8 域、13 二级组（含老 id 与 1 起新 id 的逐行映射）、4 处兜底、30 行 `type→types`（原子 20/30/10/4）、76 条 `editable_fields`（含 ①1/②22/③12 分类与 12 条 html 的完整清单）、29 个涉及场景、mismatch=0 的 skeleton 校验、两表缺 3 子命令——**全部与报告一致，无一条错**。所以杀伤集中在「施工量口径」和「会变成机器断言的那些子数字」上。

| 排序 | 错数 | 直接杀伤 | 严重度 |
|---|---|---|---|
| 1 | 错数 1／2（清洗 **23** 条、「**10** 条非 html 落回」） | 这是 E.9 里**唯一被写成施工量**的数字。照 `gen-wake-assets.mjs` 那套 fail-closed 纪律（报告自己在 E.4 要求写死 `EXPECT`），若 #227 把「脏条 = 23」「非 html 落回 = 10」写进生成器断言 → **构建必红**；若人工清洗，会去找第 10 条并不存在的非 html 落回，或漏判“布尔行同时属于两个缺陷类”。**注意：`清洗后 76 − 12 = 64` 是对的，字段条数不受影响。** | **高** |
| 2 | 错数 8（B.6 顶层闭集漏 `meta_blocks`／`recommendations`） | 这是**方向性误导**：报告拿“三层闭集”论证 `aliases` 无处可放（该结论仍成立），但同时把顶层说成 7 键闭集 → 会**误挡一个合法落点**。老实物里 HELP 自身唤醒词就是装在 `meta_blocks.help_wake_words`（`wake-assets.ts:980` 逐字：「老实物 `meta_blocks.help_wake_words` 那一块」），而 `help.ts:117-124` 明确允许顶层 `meta_blocks: [{id,title,html}]`。因此报告 F.8「`help_only` 9 条**无源可派生**、处置待票 8」**漏报了这条现成合规路径**，可能让 #227/#8 白白多开一轮裁决。 | **高** |
| 3 | 错数 3（`--html` 4 条） | 8 条待改 `prompt` 的**清单是对的**，资产内容不会被改错；杀伤在于这条子断言一旦被搬进 `--check` 类校验（“`--html` 命中 4 条”）就直接失败，也会让复审者对报告的信任打折（同句括号与它自相矛盾）。 | **中** |
| 4 | 错数 4／5（老文档统计行改口 ✅10/🟡3，漏 ✅ 应为 11） | E.18 明确要求「引用该表做逐字对上时不要信它的统计行，只信编号行」——**这条纪律是对的、有价值**；但它给出的替代数字同样错，等于“用一个错数纠另一个错数”。若 #227 把 `{✅10,🟡3,❌16}` 固化成断言 → 必红（真值编号行 `{✅11,🟡2,❌16}`）。对资产本身无影响（该表不进资产）。 | **中** |
| 5 | 错数 6（E.3「33 组／27 两原子／3 三原子」） | 同一段的原子计数 `{回执:30,采集:20,查看:10,向导:4}` 是对的、A.6 全表逐行零误差，所以 `types` 资产安全；但“27 条两原子／3 条三原子”若被抄成生成器断言即红（真值 26／4），也会让施工者怀疑 A.6 表本身。 | **中低** |
| 6 | 错数 7（`memo_cli.py:117`） | 纯引用行号错，指向的是空行；#227 不从这行建资产（它只用于说明布尔脏键的来源）。**但它证明该报告的行号引用不是 100% 可机器复核**——建议 #227 凡引用源码行号一律回读确认。 | **低** |
| 7 | 错数 9（`SKILL.md:265／:732` 出处标错） | 影响“别名出处可核”这一说法；`批量改分类` 本身确实在新表 `wakewords.ts:16` 且 12 条别名集合正确，资产不受影响。 | **低** |
| 8 | 错数 10（派单元数据 vs 实物） | 不影响 #227 内容，但**复审基准必须钉版本**：报告在审计期间被改写两次，若不冻结 sha，任何“逐字对上”都可能对着不同修订版。 | **低（流程）** |

**没有杀伤的（已证清白，值得明确写进结论）**：场景／域／二级组／兜底／dims／涉及场景六数（打假 1）、①②③ 三类分类数与 html 12 条清单（打假 2）、12 条别名与 6 对子串（打假 3 主体）、30 行 type 表与 4 原子计数（打假 5 主体）、13 行 id 对照表与 4 处兜底（打假 6）、21 子命令与两表缺 3（打假 7）、skeleton mismatch=0（打假 8）、转换层逐字映射与“老 id 0 起／新 id 1 起”这一对看似打架实则不打架的裁决（打假 9）。

---

## 5. 给编排会话的整改清单

### 必须改（不改会带错基准进 #227）

1. **`:297` ＋ `:590`：把「① ∪ ② = 23 条」「清洗 23 条（1 ＋ 10 非 html 落回 ＋ 12）」「10 条落回补中文名」改为「**① ∪ ② = 22 条 ＝ 1 布尔 ＋ 9 非 html 非布尔落回 ＋ 12 html**」「落回补中文名的非布尔行 **9** 条 ＋ 布尔行 1 条」**，并保留「清洗后 = `76 − 12 = 64`」这半句（它是对的）。
2. **`:179`：把「`--html` 4 条」改为「`--html` **6** 条」，并改成不重不漏的分解：`--html` 6 ＋ 子命令名 4（`wish-complete`／`wish-batch-plan`／`update-category`／`complete-wish`）＋ 短开关 `-c` 1，**并集 8**（6 与 4 有交集：第 5/6/8 行）。
3. **`:432` ＋ `:599`：把老文档统计行的核对结论改为**：老文档写 `✅10 / 🟡4 / ❌15 / 合计29`；实际**编号行 1–29 ＝ ✅11 / 🟡2 / ❌16**（`✅` 行 `#2,3,6,7,12,13,17,21,25,28,29`；`🟡` 行 `#26,#27`；含未编号的 `:265` 批量行则 `🟡` 3 个行位、全表 30 个行位）；**老文档三处数字都错**（✅ 漏「备忘录同步」、🟡 把 2 写成 4 且清单里混进 `/(批量场景)` 残片、❌ 15 对清单 16）。
4. **`:476`（B.6 顶层行）：允许键改为 9 个**（补 `meta_blocks`／`recommendations`），行号区间改为 `:106-238`；同时**补一句更正**：`meta_blocks` 恰是老实物装 HELP 自身唤醒词的合法格位（`wake-assets.ts:980`），故 F.8 的「`help_only` 9 条无源可派生」应改为「**有现成合规落点（`meta_blocks`），是否采用待票 8 裁**」。
5. **`:584`（E.3）：删掉「33 个场景组里 27 条两原子、3 条三原子」**，改为「**30 个场景：26 条两原子 ＋ 4 条三原子**；原子计数 `{回执:30, 采集:20, 查看:10, 向导:4}`（以 A.6 全表为准）」。
6. **`:449`：`memo_cli.py:117` → `memo_cli.py:1575`**（`p_del.add_argument("-y","--yes",...)`，delete 解析器 `:1571`）。

### 建议改

7. **`:255`**：`批量改分类` 的 SKILL.md 出处改为 `:644`／`:731`（并注明 `:265`／`:732` 是「备忘改分类(批量)」的老写法）；顺手给 A.7 第 10 行 `查提醒` 补出处 `memo_render.py:45`（`COMMAND_CN_MAP`，非 HELP 面）。
8. **A.5.1 的 token 列补全**：第 6 行补 `--suggest-due`（yaml:351，真实开关 `memo_cli.py:1618`）；第 8 行补裸词 `due` ×2（yaml:389，子命令 `memo_cli.py:1653`）或显式声明「裸英文词 `due` 按 DB 列名处理、不计命令 token」——**二选一写清楚**，否则附录 G 的「6 个 token 命中 8 场景」仍然自相矛盾。
9. **附录 G 补一条口径定义**：老文档 HTML 对照表计数到底按「编号行」还是「行位」，把本次的三种口径写进去（我这次就是被这个坑到才发现 `:432` 与 `:599` 互相矛盾）。
10. **在报告头部钉版本**：写清「本报告对应修订 sha256／字节／行数」，并说明「审计期间被改写两次」这件事——#227 与后续复审都应按 sha 引用，而不是按行号引用。
11. **报告自身的行号引用**：建议凡引用源码/老文档行号，在交付前用脚本回读校验一次（本次 100+ 处引用里错了 2 处：`memo_cli.py:117`、`SKILL.md:265／:732`；其余全部命中，说明这个成本很低、收益很高）。

---

## 附：本席复算用到的命令清单（全部只读）

| 脚本 | 干什么 |
|---|---|
| `%TEMP%\t227c\a1_yaml.py` | 老 yaml 全量 replay：8 域/30 场景/13 二级组/4 兜底/76 dims/① ② ③ 分类/原子计数（`DIM_LABEL_MAP` 从源码解析） |
| `a2_prompts.py` | 30 条 `prompt` 的 token 全扫（`--flag`／短开关／`memo.`／`memo_cli.py`／`script/`／21 子命令名）＋ 每场景 yaml 行段定位 |
| `a3_skill.py` `a4_rows.py` | `memo_cli.py` 的 21 条 `add_parser` 行号；`SKILL.md:147-172`／`:226-292` 两表覆盖度；`:235-266` 逐行 emoji 计数（三种口径）；`:1082-1095` HELP 短语计数；别名出处行 |
| `a5_skeleton.py` `a9_final.py` | yaml ↔ `t222-skeleton.json` 的 30×9 字段比对（我自己实现）；skeleton 顶层键/`counts` 27 键/`wake` 直方图/`keys↔landing` 相关；别名唯一性与子串全枚举 |
| `a6_misc.py` `a7_repo.py` `a8_source.py` `a10_doc.py` `a13_last.py` | 仓内与票据侧引用核对：`t226-body.md` V8/U8 原文；`gen-wake-assets.mjs`／`wakewords.ts`／`help.ts`／`help-template.html`／`wake-assets.ts` 行号与闭集；`t222-content-reconcile.md` 行段与 `t222-evidence/` 尺寸 |
| `a11_diff.py` `a12_diff2.py` | **把报告自己的 A.5.1／A.6／A.8／A.9 四张表解析出来，与我的独立重算逐行对差** |

未跑（如实声明）：报告附录 G 的任何脚本、`t222-extract.mjs`（会写 `t222-evidence/`）、任何 `git` 写操作。查不到/未覆盖：`t222-extract.mjs` 内部的证据生成逻辑我只读未跑；`skill-schedule` 的 `gen-help-assets.mjs` 与 `help-assets.ts`（B.7 的“两处别照抄”）我未逐行复核（超出打假清单 1–10 范围，且不影响上述任何结论）。
