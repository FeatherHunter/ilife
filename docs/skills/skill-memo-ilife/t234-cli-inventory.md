# t234 CLI 子命令全集复核：老 `memo_cli.py` 逐行读（地图 `#220` 备忘录HELP真标准 · 票 14 / issue `#234`）

> 本票的唯一目的：补掉票 2（`#222`）留下的最大未验证点——「老 `script/memo_cli.py`（78635 B）未逐行读，
> CLI 子命令全集只取自老 `SKILL.md` 的两张表，**可能存在表里没列的子命令**」，并据此裁定 U5 是否反转。

**本票结论（先说结果，不埋）**

| # | 结论 | 一句话 |
|---|---|---|
| 1 | **子命令全集 = 21 个** | `memo_cli.py:1541` 的 `subparsers` 下 `add_parser` 恰 21 处（`1544`–`1687`），`if args.command ==` 恰 21 个分支（`1698`–`1788`），两套计数一一对应 |
| 2 | **表里有、代码里没有：0 条** | 两张表共提到 20 个唯一命令，全部在代码里存在 |
| 3 | **代码里有、表里没有：2 条** | `due`（`:1653`）、`init-report`（`:1673`） |
| 4 | **U5 不反转** | 老技能**没有** `stats` 子命令，也**没有任何统计类场景卡**；`memo.stats` 在老侧承接数确实是 **0**。`memo_cli.py` 里 `stats`／`统计`／`汇总`／`总览`／`overview`／`kpi` 命中数 = **0** |
| 5 | **U6 的直接答复** | 老「删 X」走**独立子命令 `delete`**（`1571`／`1704`），**不是** `update`；老代码里连 `remove` 这个名字都不存在。另有两个不同的「废弃」子命令：`dismiss`（提醒，`:1657`）与 `complete-wish`（心愿，`:1579`） |
| 6 | **顺带发现的文档裂缝** | `SKILL.md:292` 把守门测试写成 `tests/test_html_trigger_coverage.py`，该文件**已不存在**（`pyc` 残留）；`SKILL.md:1145` 写「`test_help.py` 22 用例」，实际 **52 个** |

本报告所有结论都带「老仓路径:行号」。**没有改 `t222-skeleton.json`**（票面明令），U5 要的骨架形状在 §4 以「可直接追加」的姿态给出。

---

## 一、方法与读到的范围（先读，别跳）

### 1.1 本票实际逐行读完的老侧文件

| 文件 | 体量 | 读法 | 用途 |
|---|---|---|---|
| `script/memo_cli.py` | 1816 行 / 78635 B | **全文读完**（票 2 的空白点） | 子命令全集、分派、HTML 开关、孤儿函数 |
| `script/memo_render.py` | 661 行 | 全文读完 | `COMMAND_CN_MAP`／`DIM_LABEL_MAP`／`_scenarios_to_contract_data`／`render_help` |
| `script/validate_scenarios.py` | 161 行 | 全文读完 | 「什么算合法场景」的门 |
| `references/scenarios.yaml` | 560 行 / 26145 B | 逐字段抽取（票 2 只读了汇总） | 场景卡本体：`scenario_id`／`wake_word`／`scenario_title`／`type`／`dimensions`／`category`／`subfunction` |
| `SKILL.md` | 1174 行 | 读 `:147-172`、`:226-306`、`:453-475`、`:839-863`、`:1076-1174` ＋ 全文关键词扫描 | 两张对账表、唤醒词表、HELP 契约 |
| `tests/test_help.py` | 681 行 | 全文读完 | HELP／场景门（11 类 52 用例） |
| `tests/test_skill_structure.py`／`test_validators.py`／`test_payloads.py`／`test_cleanup.py`／`test_base_pipeline.py` | 小 | 全文读完 | 结构／契约／命令名门 |
| `CHANGELOG.md` | 53300 B | 只读 `test_html_trigger_coverage` 相关行 | 追查已删测试 |

### 1.2 计数复查命令（可复现，只读）

```powershell
# add_parser 恰 21 处
Select-String -Path "D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_cli.py" -Pattern 'add_parser' -SimpleMatch | Measure-Object
# 分派分支恰 21 个
Select-String -Path "D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_cli.py" -Pattern 'args\.command ==' | Measure-Object
# 老侧「统计」类词命中（期望 0）
Select-String -Path "D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_cli.py" -Pattern 'stats|统计|总数|overview|kpi|汇总|图表|chart'
```

> 注：`Select-String` 用 `-SimpleMatch` 匹配含 `--` 的字符串会误判（见 §3.2 注），本票所有计数已用 regex 模式复算过。

---

## 二、子命令全集：21 条（名字 ＋ 一句话 ＋ 出处）

**分派真身**：`memo_cli.py:1539-1541`

```python
def main():
    parser = argparse.ArgumentParser(description="备忘录 CLI")
    sub = parser.add_subparsers(dest="command")
```

**全集表**（出处列 = `memo_cli.py` 行号）：

| # | 名字 | 一句话 | `add_parser` | `if cmd` 分支 | 实现函数 | HTML |
|---|---|---|---|---|---|---|
| 1 | `add` | 新建笔记（可带顶层／子分类、附件、心愿的 tasklist/due） | `:1544` | `:1698` | `add_note` `:118` | ❌ |
| 2 | `search` | 关键词＋分类／子分类／due 过滤查笔记 | `:1553` | `:1700` | `search_notes` `:196` | ✅ `:1559` |
| 3 | `update` | 改已有笔记的内容／分类／子分类／附件／关联提醒 | `:1562` | `:1702` | `update_note` `:257` | ❌ |
| 4 | `delete` | 删笔记（可多个 id；`--with-reminders` 级联、`-y` 跳确认） | `:1571` | `:1704` | `delete_note` `:323` | ❌ |
| 5 | `complete-wish` | 完成心愿：原子「删心愿 ＋ 新建打卡 note」 | `:1579` | `:1706` | `complete_wish` `:463` | ❌ |
| 6 | `get` | 按 id 看单条笔记详情 | `:1587` | `:1708` | `get_note` `:551` | ✅ `:1589` |
| 7 | `search-date` | 按日期区间 `start…end` 查笔记 | `:1592` | `:1710` | `search_by_date` `:577` | ✅ `:1597` |
| 8 | `update-category` | 改单条笔记的**顶层**分类 | `:1600` | `:1712` | `update_category` `:608` | ❌ |
| 9 | `update-sub-category` | 改单条笔记的**子**分类 | `:1605` | `:1714` | `update_sub_category` `:633` | ❌ |
| 10 | `set-due` | 批量设心愿 `due` 日期，并同步飞书 task due | `:1610` | `:1716` | `set_due` `:660` | ❌ |
| 11 | `wish-batch-plan` | 心愿排期**向导**：收集待排期心愿列表（过程型 HTML 前置） | `:1615` | `:1718` | `wish_batch_plan` `:763` | ✅ `:1619` |
| 12 | `wish-complete` | 心愿完成**向导**：收集可完成的心愿列表（过程型 HTML 前置） | `:1622` | `:1720` | `wish_complete` `:857` | ✅ `:1631` |
| 13 | `batch-update-category` | 批量改分类**向导**：按原分类收集笔记（过程型 HTML 前置） | `:1635` | `:1722` | `batch_update_category` `:968` | ✅ `:1638` |
| 14 | `sync-from-feishu` | 飞书双向对账：本地补建 ＋ done 反向 ＋ due 反向 | `:1641` | `:1724` | 内联，调 `feishu_sync.sync_from_feishu` `:1726` | ✅ `:1642` |
| 15 | `remind` | 给笔记加提醒（时间／内容／重复类型／规则） | `:1645` | `:1758` | `add_reminder` `:1113` | ❌ |
| 16 | **`due`** | **列出「当前该提醒」的提醒项（cron 用；可 `--db` 覆盖库路径）** | **`:1653`** | **`:1760`** | `list_due_reminders` `:1148` | ❌ |
| 17 | `dismiss` | 把一条提醒置为 `dismissed`（废弃提醒） | `:1657` | `:1766` | `dismiss_reminder` `:1371` | ❌ |
| 18 | `reminders` | 列提醒（`--status active/dismissed`） | `:1661` | `:1768` | `list_reminders` `:1512` | ✅ `:1663` |
| 19 | `completed` | 查已触发的提醒与对应打卡（一次性／每天／每周／每月／每年匹配） | `:1666` | `:1770` | `completed_reminders` `:1390` | ✅ `:1667` |
| 20 | **`init-report`** | **首次使用：按 `--data` 诊断 JSON 生成初始化报告页（过程型 HTML）** | **`:1673`** | **`:1772`** | 内联，调 `memo_render.render_init_report` `:1783` | 必生成 |
| 21 | `help` | 备忘录 HELP：必生成 HELP HTML ＋ 覆盖 skill 根 `备忘录.html` | `:1687` | `:1788` | 内联，调 `memo_render.render_help` `:1795` | 必生成 |

**兜底分支**：`memo_cli.py:1811-1813` —— 未知命令 → `parser.print_help()` ＋ `error_json("未知命令")`。

### 2.1 计数交叉验证（两套独立计数同值）

| 计数口径 | 命令 | 结果 |
|---|---|---|
| `sub.add_parser(` 出现次数 | `memo_cli.py:1544,1553,1562,1571,1579,1587,1592,1600,1605,1610,1615,1622,1635,1641,1645,1653,1657,1661,1666,1673,1687` | **21** |
| `if args.command ==` 分支数 | `memo_cli.py:1698…1788` | **21** |
| 两者差集 | — | **空**（21 ↔ 21 一一对应，无孤儿 parser，无孤儿分支） |

### 2.2 代码里**不是**子命令、但容易被误当子命令的名字

| 名字 | 真身 | 出处 |
|---|---|---|
| `memo_cli.py due` 的**实现函数** | `list_due_reminders()` 无 `args` 参数，是 `due` 分支调它，**不是**第二个命令 | `memo_cli.py:1148` |
| `feishu_sync.sync_from_feishu` | 被 `sync-from-feishu` 分支 import 调用，是模块函数 | `memo_cli.py:1726` |
| `render_query` / `render_sync_report` / `render_wish_plan` / `render_wish_complete` / `render_change_category` / `render_init_report` / `render_help` | `memo_render.py` 的渲染函数（7 个），非 CLI 入口 | `memo_render.py:197,270,302,338,373,447,602` |
| `memo_render.py` 的 `main()` | 读 stdin JSON → `render_query`，**不是**用户面命令 | `memo_render.py:653-657` |

### 2.3 一处**名不符实**（票 6／票 7 必读）

`SKILL.md:165`（反向表）把「完成心愿」的 CLI 命令写成 **`` `wish-complete` 或 `complete-wish` ``**（一词两命令，看似等价），
但两者**不是同一个东西**：

| 命令 | 语义 | 出处 |
|---|---|---|
| `wish-complete` | **向导**：收集可完成的心愿列表（供 HTML 勾选），**不改库** | `memo_cli.py:1622`／`857` |
| `complete-wish` | **执行**：对单个 id 原子「删心愿 ＋ 建打卡」 | `memo_cli.py:1579`／`463` |

即：老侧「完成心愿」是**一个逻辑动作 ＋ 两个 CLI 入口的两步流程**（向导 → 执行）。这是表把两步压成一格造成的表述压缩，**不是两个可互换别名**。
同一压缩也出现在 `SKILL.md:166`（`set-due` 或 `wish-batch-plan`：前者执行、后者向导，`memo_cli.py:1610`／`1615`）。

---

## 三、与老 `SKILL.md` 两张表的双向对账

### 3.1 表的边界（先把口径钉死）

| 表 | 范围 | 去重后提到的唯一命令 |
|---|---|---|
| 反向指引表 `SKILL.md:156-172`（15 行） | 用户原话 → 唤醒词 → CLI | 15 个唯一 |
| HTML 生成对照表 `SKILL.md:235-266`（29 行 ＋1 批量行） | 唤醒词 → 是否生成 HTML → 命令 | 17 个唯一 |
| **两表并集** | — | **20 个唯一** |

两表提到的 20 个唯一命令，逐个点名（供核对）：
`add`（`:158`／`:237`／`:246`／`:250`／`:254`／`:258`）、`search`（`:159`／`:238`／`:253`／`:257`／`:261`）、`update`（`:160`／`:240`／`:252`／`:256`／`:260`）、
`delete`（`:161`／`:241`／`:251`／`:255`／`:259`）、`get`（`:162`／`:242`）、`search-date`（`:163`／`:243`）、`wish-complete`（`:165`／`:262`）、`complete-wish`（`:165`）、
`set-due`（`:166`）、`wish-batch-plan`（`:166`／`:263`）、`remind`（`:167`／`:246`／`:247`）、`reminders`（`:168`／`:248`）、`batch-update-category`（`:169`／`:265`）、
`update-category`（`:170`／`:244`）、`sync-from-feishu`（`:171`／`:264`）、`help`（`:172`／`:266`）、`update-sub-category`（`:245`）、`completed`（`:249`）、
`store` 不存在、`due` 不存在。

> 注：票 2 报告 §A.3 记「15 行反向指引 ＋ 29 行 HTML 对照」= 两表**行数**，与本节「20 个唯一命令」是**不同口径**（行 ≠ 去重命令数），两者不矛盾。

### 3.2 方向 A：**表里有、代码里没有** → **0 条**

| 表里的命令 | 表出处 | 代码核实 |
|---|---|---|
| （无） | — | 20 个唯一命令**全部**在 `memo_cli.py` 有 `add_parser` ＋ 分派分支 |

**结论：零缺口。** 票 2 用表推的命令集，在「表里列出的命令是否真实存在」这个方向上没有任何错。

### 3.3 方向 B：**代码里有、表里没有** → **2 条**

| 代码命令 | 出处 | 两张表内是否有 | 老 `SKILL.md` 别处是否有 | 性质 |
|---|---|---|---|---|
| **`due`** | `memo_cli.py:1653`（`add_parser`）／`:1760`（分派）／`:1148`（实现） | **两表都没有** | **全文也没有**（`memo_cli.py due`／`` `due` `` 独立词形命中 = 0） | 只被 cron 用（`SKILL.md:1029`「有待提醒时」／`references/cron.md`） |
| **`init-report`** | `memo_cli.py:1673`／`:1772`／`:447` | **两表都没有** | **有**：`SKILL.md:343`、`:427`（「首次使用行为规范」段） | 属"一次性初始化"类，天然不进「唤醒词 ↔ HTML」两表 |

**这就是票 2 风险点的实测答案：漏列 2 条，且都不触及 U5。**

- `due` 漏列的原因：它**没有唤醒词**（用户永远不会说「列出该提醒的提醒」），是 cron／调度侧的内部入口，故两张「唤醒词」表结构上装不下它。
- `init-report` 漏列的原因：它的唤醒词是「首次使用」（`SKILL.md:300`、`scenarios.yaml:535`），但**两张表的行里都没有「首次使用」这一行**——
  即老侧存在「有唤醒词、有场景卡、有 CLI、却不在两张表里」的第三类：**Init 类**。票 7 若按两表建别名表，会漏掉 Init 入口。

### 3.4 方向 C（本票加做）：表没覆盖、但**代码＋场景卡**都有的命令

| 命令 | 场景卡 | 唤醒词 | 判定 |
|---|---|---|---|
| `init-report` | `scenarios.yaml:535-560`（`memo_init_setup`） | `首次使用`（别名「初始化／新手」在 `SKILL.md:300` 触发层） | **有资产、缺表行** |

**其余 19 条命令**都能在两张表里找到落点（`add`/`search`/`update`/`delete`/`get`/`search-date`/`update-category`/`update-sub-category`/`set-due`/`wish-batch-plan`/`wish-complete`/`complete-wish`/`batch-update-category`/`sync-from-feishu`/`remind`/`reminders`/`completed`/`help`，加 1 条只作函数出现的 `due` 的实现）。

### 3.5 对账用的 `->` 归属复核：老命令 → 新表 10 key（票 2 §4B 的独立复算）

| 老命令 | 票 2 判的归属 | 本票复核 | 依据 |
|---|---|---|---|
| `add` | `memo.create` | ✅ 一致 | `add` 写库新建（`memo_cli.py:118`） |
| `search`／`search-date`／`reminders`／`completed` | `memo.search`／`memo.remind` | ✅ 一致 | 4 个都是只读查询；`COMMAND_CN_MAP` 把 `search`/`get`/`search-date`/`completed`/`reminders` 都归「查」（`memo_render.py:40-46`） |
| `get` | `memo.detail` | ✅ 一致 | 单条详情（`:551`） |
| `update`／`update-category`／`update-sub-category` | `memo.update` | ✅ 一致 | 三者的实现都在改已有行（`:257`／`:608`／`:633`） |
| `delete`／`dismiss`／`complete-wish` | `memo.remove`（＋`memo.update`） | ⚠️ **见 §5（U6）** | 代码里 `delete` 是独立子命令，新表把它挂 `memo.update` |
| `set-due`／`wish-complete`／`wish-batch-plan` | `memo.wish`／`memo.batch` | ✅ 一致 | `set_due:660`／`wish_complete:857`／`wish_batch_plan:763` |
| `sync-from-feishu` | `memo.sync` | ✅ 一致 | `:1641` |
| `help` | —（HELP 自身不展示） | ✅ 一致 | `SKILL.md:1141` |
| **`due`** | **票 2 没提**（表里没有 → 无归属） | ➕ 本票补：**无新表 key 对应** | 只读调度入口，新表 10 key 无 `due`；若强行归属则最近 `memo.remind`（查询类），但它是**系统入口而非用户场景**，建议**不入 HELP** |
| **`init-report`** | **票 2 没提** | ➕ 本票补：**无新表 key 对应** | 新表 10 key 无 init；老侧有场景卡 `memo_init_setup`，新侧由 `init_banner`（`memo_render.py:496-524`）承担，**不是命令** |

---

## 四、专答 U5：老技能到底有没有 `stats`／统计类内容？

### 4.0 一句话答复

> **没有 `stats` 子命令，也没有任何统计类场景卡。**
> `memo.stats` 在老骨架的承接数确实是 **0**，票 2 §2.4／§4B 的结论**成立、不反转**。
> 唯一的「统计」是 `sync-from-feishu --html` 这一条**已有场景**的报告页内部指标（11 个对账字段），**不是**新表 `memo.stats` 意义上的「统计总览」。

### 4.1 证据链（读遍这 8 处，一处都没有）

| # | 读的地方 | 找什么 | 结果 |
|---|---|---|---|
| 1 | `memo_cli.py` **全文 1816 行**（子命令分派 `1539-1813`） | 任何 `stats`／统计类 `add_parser` | `add_parser` 恰 21 个（`1544`–`1687`），**无 `stats`** |
| 2 | `memo_cli.py` 全文 regex `stats\|统计\|总数\|overview\|kpi\|汇总\|图表\|chart` | 统计类标识符 | **命中 0**（`No matches found`） |
| 3 | `memo_cli.py:1698-1813` 的 21 个 `elif args.command ==` 分支 | 统计分支 | **无**；未知命令走 `:1811` 兜底 |
| 4 | `references/scenarios.yaml` **全文 560 行**，30 条场景（`52`–`560`） | 统计类 `scenario_id`／`wake_word`／`scenario_title` | 30 条**逐条**核过，**无** `memo_stats_*`，**无**「统计／总览／汇总」字样 |
| 5 | `memo_render.py:40-46` `COMMAND_CN_MAP` | 统计的命令名映射 | 只有 **5** 个 key：`search`／`get`／`search-date`／`completed`／`reminders` —— **无 stats** |
| 6 | `memo_render.py:49-69` `DIM_LABEL_MAP` | 统计维度标签 | **19** 个键，全是记录字段（id／content／category／due…），**无任何统计维度** |
| 7 | `memo_render.py:527-599` `_scenarios_to_contract_data` | 统计分组／场景 | 纯透传 yaml（`562-581`），**不新增**场景；故无 stats 卡 |
| 8 | 老仓关键词全域扫描 `统计\|stats\|汇总\|总览\|概览` | 任何统计资产 | 老 `SKILL.md` 4 处：`:268`（是**图例计数表标题**「### 统计」，数的是唤醒词条数，不是统计命令）、`:905`／`:906`／`:967`（**全是** `sync_report.html` 的 11 个对账字段）。老 `tests/` 1 处：`test_payloads.py:99`（`sync-from-feishu` 的统计字段契约）。**无一处是"统计总览"场景** |

### 4.2 「统计」的老含义到底是哪一个（防误判）

| 老侧出现的「统计」 | 实质 | 出处 |
|---|---|---|
| `SKILL.md:268` `### 统计` | 图例的**计数汇总**（✅10／🟡4／❌15／合计 29） | `SKILL.md:270-275` |
| `SKILL.md:905-906`「首屏徽章总览＋4 个 KPI 卡」 | **`sync_report.html` 报告页**的内部指标（本地补建／扫 done／同步完成／扫 pending） | `SKILL.md:864-908`（备忘录同步段） |
| `SKILL.md:967`「11 统计字段」 | 同上，`sync-from-feishu --html` 的输出字段 | `memo_render.py:223-268` `_sync_snapshot` |
| `scenarios.yaml:381-402` `memo_sync_feishu` | 上两者的场景卡（`wake_word: 备忘录同步`） | `scenarios.yaml:381-390` |

**判定**：这些全归 `memo.sync`（新表），**不是** `memo.stats`。
若票 6 想给 `memo.stats` 找老承接，**唯一可用的是 `memo_sync_feishu` 的报告页指标**，但那是「对账结果」，语义上是 `memo.sync` 的产物 —— 拿它填 `memo.stats` 属于**张冠李戴**，本席不建议。

### 4.3 给票 6 的 U5 裁定输入（本席不拍板，只给事实）

| 选项 | 老侧依据 | 代价 |
|---|---|---|
| **A. `memo.stats` 不进 HELP** | 老骨架 0 条内容（本票 4.1 证据链）；票 2 §2.4 已列「新表有形状、老骨架没内容」 | 新表 10 key 里将有 1 个 key 不出现在 HELP；需确认 HELP 是否允许「有 key 无场景」 |
| **B. `memo.stats` 进 HELP，但内容另立图** | 老侧无内容 → 必须**新造**场景卡（唤醒词／prompt／dimensions 全无老参照） | 造出的卡无老资产背书；唤醒词（「看统计」？「统计总览」？）需用户拍板 |
| **C. `memo.stats` 进 HELP，借 `memo_sync_feishu` 的指标当内容** | 唯一可借的老资产（`SKILL.md:905` 的 4 KPI ＋ 11 字段） | 与 `memo.sync` 语义重叠，可能出现两个场景展示同一份数据 |

### 4.4 假如 U5 裁成「有」：照票 2 骨架形状的 `memo.stats` 场景卡（**本席构造，非老侧原文**）

> ⚠️ **这张卡在老仓不存在**。老侧没有任何字节能支撑它，以下是**按票 2 骨架字段形状**（`t222-skeleton.json` 的 `old_scenes[]` 元素形状：`id/line/category/name_cn/subfunction/wake/title/type/status/n_dims/landing/keys/new_phrase/partial/route`）
> 造的**空壳**，`line` 只能填 `null`（老 yaml 无此行）。**本席不把它当真资产**，仅作为「若要展示，形状长这样」的接口占位，供票 6 拍板后由票 7 决定要不要建。

```jsonc
// ⚠️ 构造物，非老侧读取结果。不可加进 t222-skeleton.json 的 old_scenes[]（会污染「老骨架 30 条」计数）。
// 若要入库，应放在新侧（票 7 的资产表），不是骨架的老侧数组。
{
  "id": "memo_stats_overview",          // 无老出处（scenarios.yaml 无此 id）
  "line": null,                          // 老 yaml 无此行 —— 这就是「0 条内容」的证据本体
  "category": null,                      // 老 8 域无归属（memo/search/remind/wish/checkin/mood/sync/init 都不合适）
  "name_cn": null,
  "subfunction": null,
  "wake": [],                            // 老 29 个唯一唤醒词里没有统计类词
  "title": "（待定）统计总览",
  "type": "查看+回执",                    // 票 2 §2.1~2.2 的老 type 白名单内取值（validate_scenarios.py:22-25）
  "status": "【待开发】",                  // test_help.py:152-156 当前禁止此值；若新建必配 AI 停步逻辑
  "n_dims": 0,
  "landing": "none",
  "keys": ["memo.stats"],                // 新表侧：MEMO_KEY_SHAPES 有 stat 形状（票 2 §4B）
  "new_phrase": [],
  "partial": [],
  "route": { "phrase": null, "key": null, "kind": "no_route", "candidates": [], "ambiguous": false }
}
```

**若票 6 裁「要展示」，票 7 需要用户先拍的三件事**（本席不猜）：
1. **唤醒词**定什么（老侧无参照，新造）；
2. **dimensions** 放什么（`DIM_LABEL_MAP` 19 个键里没有任何统计维度，需新增键 ＋ 中文标签）；
3. 归**哪个二级组**（老 8 域无归属；`memo_render.py:556` 的「基础」兜底会把它挂到某域下当「基础」）。

### 4.5 对票 2 §六.4 那条「最大未验证点」的正式关闭

票 2 §六.4 写：

> `script/memo_cli.py`（78635 B）没读：CLI 子命令全集只从老 `SKILL.md` 的对照表取得（15 行反向指引 ＋ 29 行 HTML 对照）。
> **可能存在表里没列的子命令**（例如统计类），这会让 2.4 的「`memo.stats` 无老内容」结论有反转风险。**这是本报告最大的未验证点。**

**本票的关闭结论**：
- 「可能存在表里没列的子命令」→ **成立，实际有 2 条**：`due`（`:1653`）、`init-report`（`:1673`）。**两条都不是统计类。**
- 「会让 2.4 的 `memo.stats` 无老内容结论有反转风险」→ **不成立，无反转**。原因：新命令的发现路径与场景卡发现路径**相互独立**——即便 `due`／`init-report` 真被漏掉，
  `scenarios.yaml` 的 30 条卡（`52`–`560`）与 `memo_render.py:40-46` 的 5 键 `COMMAND_CN_MAP` 都**不依赖** CLI 命令表，两条独立路径都指向「无统计」。
- 教训（给后续票）：**「命令全集」与「场景卡全集」是两个独立事实源**，漏命令**不必然**导致漏场景；票 2 把这两个风险绑成一条，耦合过强。

---

## 五、顺带核 U6：老「删 X」命令在代码里归哪个子命令？

### 5.1 直接答复

> **归独立子命令 `delete`（`memo_cli.py:1571` 定义／`:1704` 分派／`:323` 实现），既不是 `remove` 也不是 `update`。**
> 老代码里**根本没有 `remove` 这个子命令名**（21 个 `add_parser` 里无 `remove`）；而 `update`（`:1562`／`:257`）的参数表里**没有任何删除／废弃能力**。

### 5.2 证据

| 问题 | 老代码事实 | 出处 |
|---|---|---|
| 「删 X」走哪个子命令？ | `delete`，两张表**也**这么写（`SKILL.md:161`／`:241`／`:251`／`:255`／`:259` 都写 `delete`） | `memo_cli.py:1571,1704,323` |
| 老代码有 `remove` 吗？ | **没有**。21 个 parser 名里无 `remove` | `memo_cli.py:1544-1687` 全表 |
| 老代码有「废弃」类子命令吗？ | **有，2 个，且都不是 `update`**：`dismiss`（废弃**提醒**）、`complete-wish`（完成心愿＝删心愿＋建打卡） | `:1657`／`:1579` |
| `update` 能删吗？ | **不能**。参数只有 `id`／`--content`／`--category`／`--sub-category`／`--media`／`--reminder-id`，**无任何 status／delete 开关** | `memo_cli.py:1562-1568` |
| 「删 X」如何区分 X？ | **靠 `id`，不靠分类**。`delete` 接 `id`（`nargs="+"` 可多个），**没有 `-c` 分类参数**；「删心愿／删打卡／删情绪」是**唤醒词层**自动带分类过滤（AI 先 `search -c 心愿` 拿 id，再 `delete <id>`） | `memo_cli.py:1571-1576`；`SKILL.md:561`（删除笔记段）、`scenarios.yaml:424-436`／`469-481`／`510-522` |
| 删心愿的副带动作 | `delete_wish` 语义在 SKILL 层：自动标飞书 task 完成（飞书无 delete 概念） | `SKILL.md:871` |

### 5.3 与票 2 §4C 末注的关系（U6 的第二问）

票 2 §4C 末注问：「老『删 X』语义在新表里到底走 `memo.remove` 还是 `memo.update`」。
**本票提供的代码侧事实**：

- 老侧「删」是一个**语义单一的独立动作**（`delete` → `notes` 行删除，`memo_cli.py:323`），**不是**「改」的子类。
- 老侧「废弃」（`dismiss`）作用对象是**提醒**（`reminders` 表），不是笔记 —— 与新表 `wakewords.ts:36` 把「删」当 `update` 的一种、`cmd_read.ts:65-69` 的 `mode:'abandon'` **不是**同一层概念。
- 故：**老侧代码不支持「删＝改」的读法**；新表把「删」挂 `memo.update` 后，`memo.remove` 只剩 `废弃提醒` 一词（票 2 §4B 已记），
  这在老侧**没有任何语义依据**——老侧 `delete` 与 `update` 是两个不同命令、两组不同参数、两个不同数据库动作。
- **建议票 6 的裁定输入**：若「一场景一唤醒词」要保 `memo.remove` 的独立性，老侧 **4 条「删 X」场景（`scenarios.yaml:89`／`424`／`469`／`510`）应整体归 `memo.remove`**，而非 `memo.update`。

---

## 六、老 `validate_scenarios.py` 与老 `tests/` 里与 HELP／场景相关的门（逐条）

### 6.1 `script/validate_scenarios.py` —— 「什么算合法场景」的单一真相

> 该文件被**测试与生产双触发**（`memo_render.py:616-619` 在 `render_help` 前调它，坏数据直接 `raise ValueError` 进不了 HELP HTML；`test_help.py:66-70` 也调它）。
> 共 **14 类门**：

| # | 门（判什么合法） | 出处 | 反例会被拒成什么 |
|---|---|---|---|
| G01 | 顶层必是 `dict` | `validate_scenarios.py:58-60` | `顶层必须是 dict` |
| G02 | `skill` 必须字面 `"备忘录"` | `:63-64` | `skill 应为 备忘录` |
| G03 | `version` 必须非空 | `:65-66` | `缺少 version` |
| G04 | `categories` 必须是**非空 list** | `:69-72` | `缺少 categories 列表` |
| G05 | `categories` 元素必须含 `key` ＋ `name` | `:74-78` | `categories 元素缺 key/name` |
| G06 | `categories` 的 `key` **不可重复** | `:79-80` | `categories key 重复` |
| G07 | `scenarios` 必须是**非空 list**，元素必须是 dict | `:83-91` | `缺少 scenarios 列表`／`场景非 dict` |
| G08 | **8 个必填字段**齐全：`wake_word`／`scenario_id`／`scenario_title`／`type`／`dimensions`／`prompt`／`status`／`result` | `:16-19`＋`:95-97` | `[id] 缺必填字段 X` |
| G09 | `type` 必须在 **8 值白名单**：`采集+回执`／`查看`／`查看+回执`／`查看+选择`／`查看+选择+回执`／`向导+采集+回执`／`向导+回执`／`选择+回执` | `:22-25`＋`:99-101` | `type=... 不在白名单` |
| G10 | `scenario_id` 跨场景**唯一** | `:104`＋`:133-135` | `scenario_id 重复` |
| G11 | **禁字段**不可出现：`order`／`aliases`／`wake_words`／`wake_word_index` | `:28`＋`:106-108` | `不应含字段 X(#31 决策禁止)` |
| G12 | `category` **必填**且在 `categories` 白名单内 | `:110-114` | `缺 category`／`category=... 不在白名单` |
| G13 | `subfunction` 若存在须是 **≤24 字符串** | `:116-118` | `subfunction 非法` |
| G14 | `dependencies` 若存在**须非空**（不许空串） | `:120-122` | `dependencies 存在但为空` |
| G15 | `prompt`／`result` **不得泄露实现**：`memo_cli.py`／`memo.db`／`templates/`／`script/`／`SELECT `／`INSERT `／`UPDATE `／`.py`／`ERR_` | `:31-32`＋`:124-127` | `prompt/result 暴露实现细节` |
| G16 | `prompt` **不得含 `<中文占位符>`** | `:129-131` | `prompt 含 <中文占位符>` |

> ⚠️ **「`wake_word` 允许多对一」是显式设计**，不是漏洞：`validate_scenarios.py:102-103` 注释明写「唯一性(scenario_id 跨场景唯一；`wake_word` 允许多对一：备忘改分类 单条+批量 共用唤醒词,#33 归类确认)」。
> **本文件不检查 `wake_word` 唯一性，也不检查「场景命令是否真实存在」** —— 即 **`validate_scenarios.py` 与 CLI 子命令全集无任何耦合**。这正面支持 §4.5 的「两个独立事实源」判定。

### 6.2 `tests/test_help.py` —— HELP／场景的**守门测试**（11 类 52 用例）

> 票面／老 `SKILL.md:1145` 写「22 用例」，**实测 52 个**（`^\s+def test_` 计数）。以下按类列出**门的内容**（不是逐用例，但覆盖面等价）。

| 类 | 用例数 | 门（定义了什么算合法） | 行 |
|---|---|---|---|
| `TestScenariosSchema` | 13 | ① 共享校验器可导入且对当前 yaml 判过；② 缺 `category` 必被拒；③ 含 `order` 必被拒；④ 空 `dependencies` 必被拒；⑤ `skill=="备忘录"`／`version=="1.3.0"`；⑥ **唯一唤醒词 ≥29**；⑦ **30 场景 = 29 唯一唤醒词，且唯一「多对一」只准是 `备忘改分类`×2**；⑧ **唤醒词集合 ⊇ 28 词硬清单**（防文档裂缝）；⑨ 本期**不许有** `【待开发】`；⑩ 全表扫描模拟：每个唤醒词都能扫到 ≥1 场景、无匹配词返回空；⑪ `备忘改分类` 恰映射 `{memo_change_category_single, memo_batch_change_category}`；⑫ `记备忘` 恰映射 `["memo_add_basic"]`；⑬ Init 唯一主词必须是 `首次使用` 且在 `init` 分类 ＋ 必含 `dependencies` | `:59-193` |
| `TestHelpTemplate` | 3 | ① Base 模板存在；② 3 个占位符**各恰 1 个**（`<!--INJECT-DATA-->`／`<!--SHARED-HELPERS-->`／`<!--SHARED-CSS-->`）；③ 模板**不得含**技能私有词（`备忘录 HELP`／`memo_init_setup`） | `:202-213` |
| `TestRenderHelp` | 8 | ① 时间戳副本名为 `备忘录_HELP_<8位>_<6位>[_N].html`；② skill 根 `备忘录.html` 必被覆盖且 >1000 B；③ 两份内容**逐字节相同**；④ HTML 含 `help-data` 注入点；⑤ HTML 含 8 个抽样唤醒词；⑥ HTML **不展示 HELP 自身**；⑦ 含错误态／空态；⑧ 含复制按钮 ＋ 剪贴板降级 | `:219-271` |
| `TestHelpCLI` | 2 | ① CLI `help` 可执行 ＋ 返回 `html_path`／`skill_root_path`；② **`help` 不得有 `--html` flag** | `:277-305` |
| `TestOldManualDeprecated` | 1 | 软声明：不再手工维护第二份 `备忘录.html`（`pass`，靠 git 历史守护） | `:311-318` |
| `TestHelpOutputFlag` | 8 | `--output`／`-o` B 方案：① 额外副本写入；② 不传时为 `None`；③ 父目录自动建；④ **加 `--output` 时 `备忘录.html` 仍被覆盖**；⑤⑥⑦ CLI 三种调用；⑧ 无 `--output` 时 JSON 字段为 `null` | `:332-420` |
| `TestHelpWakeWordFlexibility` | 2 | SKILL.md 必含「唤醒词灵活匹配」段 ＋ ≥3 种变体示例（口语化／slash／缩字／大小写／manual） | `:432-451` |
| `TestHelpHtmlPathEnvVar` | 2 | ① SKILL.md 必明示 `SKILLS_DB_PATH` ＋ `memo_html`；② 设 `SKILLS_DB_PATH` 后 HTML 真落到 `custom_dir/memo_html/` | `:463-487` |
| `TestReverseLookupTable` | 2 | SKILL.md 必含「用户原话 → 唤醒词 反向指引」段 ＋ ≥5 个核心唤醒词 | `:499-512` |
| `TestHelpThreeLevelCollapse` | 5 | ① Base 模板含 `subgroup` 折叠 ＋ `id="tabBar"` ＋ `copy-btn`；② **禁** `categoryChips`／`id="toc"` 残留；③ 转换层：**恰 8 分组 ＋ 恰 30 场景**，`init` 组恰 1 场景 `memo_init_setup`；④ Playwright 真渲染快照：零 JS 错误／复制按钮 ≥8／已初始化时 init 横幅隐藏／8 个分类中文名全渲染；⑤ 未初始化时 init 横幅显示 ＋ 恰 1 个复制按钮 ＋ prompt 含 `首次使用` | `:524-607` |
| `TestPromptFillInFormat` | 6 | prompt 写法门：① 无 `<中文占位符>`；② **每条场景 prompt 必含「唤醒词:」锚点**；③ 必含「期望效果」段；④ **必有 `_____________` 填空线或显式「无需参数」**；⑤ prompt／result 不暴露 CLI／DB；⑥ 填空线行括号内须有格式示例（允许 <5 条例外） | `:625-681` |

### 6.3 其余测试里的相关门（结构／契约／命令名）

| 门 | 内容 | 出处 |
|---|---|---|
| 场景数硬编码 **30** | 转换层必须映射 30 场景（改 yaml 必同步改此测试） | `test_help.py:547` |
| 分组数硬编码 **8** | `_scenarios_to_contract_data` 必须产出 8 分组 | `test_help.py:545` |
| SKILL.md frontmatter **5 字段**全非空 | `name`／`version`／`status`／`description`／`last_updated` | `test_skill_structure.py:46-50` |
| `_meta.json.version` == SKILL.md frontmatter | 版本 SoT 一致性 | `test_skill_structure.py:52-57` |
| `docs/adr/0001..0007` 存在 | ADR 齐全 | `test_skill_structure.py:59-63` |
| `pytest.ini` 6 配置项 ＋ `--strict-markers` | 测试基建 | `test_skill_structure.py:68-81` |
| `AGENTS.md` 含「跨设备随手记录」＋「29」「唤醒词」 | 定位与计数一致 | `test_skill_structure.py:83-87` |
| **5 个查询命令**契约（`search`／`get`／`search-date`／`reminders`／`completed`） | 参数名契约 | `test_payloads.py:5`＋`:83-86` |
| `sync-from-feishu` 统计字段契约 | `SKILL.md:905` 的 11 字段 | `test_payloads.py:99-105` |
| `sync_report.html` 不得有 `CMD_CN` 单键对象 | 反「投机性通用化」；改 inline 映射 | `test_cleanup.py:56-70` |
| `--help` 可跑：`search-date`／`reminders`／`completed`／`sync-from-feishu` | 子命令参数表可解析 | `test_payloads.py:91` |
| 过程型向导页门：`wish-batch-plan`／`wish-complete`／`batch-update-category` | 各自 `--html` 端到端 ＋ 复制指令**不得暴露** `memo_cli.py` | `test_wish_plan.py`／`test_wish_complete.py`／`test_change_category.py` |
| `init-report --data` CLI 门 | 诊断 JSON → 报告页；prompt 不得含 `memo_cli.py`／`init.sql`／`memo.db`／`.py`／`templates/` | `test_init_report.py:96-146` |
| skill 根 `备忘录.html` 无 GBK 误解码字符 ＋ 含 `help-data` | 镜像干净 | `test_memo_html_surrogates.py:37,51` |

### 6.4 测试覆盖不到的命令（本票实测）

| 命令 | 测试覆盖 |
|---|---|
| `add`／`search`／`search-date`／`reminders`／`completed`／`sync-from-feishu`／`wish-complete`／`wish-batch-plan`／`set-due`／`batch-update-category`／`remind`／`help`／`init-report` | **有**（见 6.3） |
| **`due`** | **无任何测试**（全 `tests/` 无 `"due"` 子命令调用） |
| **`dismiss`** | **无任何测试**（全 `tests/` 无 `"dismiss"` 调用） |
| `update`／`delete`／`get`／`update-category`／`update-sub-category`／`complete-wish` | 未见独立子命令调用（`get` 仅在 `COMMAND_CN_MAP` 相关断言间接出现） |

> 即：21 条命令里，**至少 `due` 与 `dismiss` 是零测试覆盖**。这与「两张表都没有 `due`」互为印证 —— `due` 是老侧最边缘的一条命令。

---

## 七、「没读透」清单（明确列，不猜）

1. **`feishu_sync.py`（39585 B）未逐行读**：只读了 `memo_cli.py:1726` 的调用点与它返回的 11 个字段名（`backfilled`／`scanned_done`／`synced`／`skipped_no_local_note`／`scanned_pending`／`due_added`／`due_overridden`／`due_removed`／`errors` 等）。
   **未核**：`sync_from_feishu()` 内部是否还会触发别的笔记动作（例如隐式删／建），若有，§5 的「删只走 `delete`」结论需补一条例外。
2. **`reminder_scheduler.py`（1019 B）未读**：推测与 `due` 子命令配套（cron 入口），但**未核实**它是否 import／调用 `memo_cli.py due`，也未核它是否调用其它子命令。
3. **`references/cron.md`（715 B）未读**：`due` 的实际调用方应在其中，未核。
4. **`templates/*.html` 7 个未读**：`memo_query`／`sync_report`／`wish_plan`／`wish_complete`／`change_category`／`init_report` 只从 `memo_render.py` 的渲染函数反推契约，**未读模板本体**；故「过程型／结果型」的分类只依据票 2 与 SKILL.md，未在模板层验证。
5. **`CHANGELOG.md`（53300 B）未通读**：只按关键词定位到 `test_html_trigger_coverage` 与「统计」相关行。**可能载有已删除子命令的历史**（例如曾存在而后被删的 `stats`／`remove`）。若要 100% 排除「老技能曾经有 stats」，需另派一票通读 CHANGELOG ＋ `memo_cli.py.bak.20260701`（54980 B，**未读**）。
6. **`memo_cli.py.bak.20260701`（54980 B）未读**：这是**备份版本**，可能含更早的子命令集（含已删命令）。本票只核**当前工作版**（78635 B）。
7. **`feishu_sync.py.bak.20260701`（22897 B）／`script/tmp_add_4wishes.py`（941 B）／`output/.trash/_run_init_report_20260202.py`（1923 B）未读**：疑似一次性脚本，未核是否定义过额外子命令。
8. **`scripts/feishu_auth_helper.py`（8061 B）未读**：目录名是 `scripts/`（复数），与 `script/`（单数）不同，未核它是否也是 CLI 入口。
9. **`.scratch/` 下多个 spec 未读**（`grilling-alignment`／`memo-help-4level-init-map`／`templates-hardening`）：其中 `memo-help-4level-init-map/04-help-render-rewrite.md` 等可能记录 HELP 设计的中间决策与**曾考虑过但未实现**的统计场景。本票未读，**不能据此断言「历史上从未计划过 stats」**。
10. **老实物 HTML 未读**：`备忘录.html`（57500 B，**已是 `memo_cli.py help` 的产物**，见 `test_memo_html_surrogates.py:9`）与 `.db\memo_html\`。若其中含**统计卡片**，则「老 HELP 无统计内容」需修正。
    —— 但按本票证据链，`scenarios.yaml` 无 stats 场景 → `render_help` 不可能渲染出 stats 分区，故风险低；**仍标为未验证**。
11. **老 `SKILL.md:1-146` 与 `:306-452`、`:476-838`、`:863-1075` 未逐行读**：本票读的是定点区间 ＋ 关键词全域扫描。
    **未核**：这些段落里是否有「统计」类命令的行内提及（关键词扫描只覆盖了「统计／stats／汇总／总览／概览」5 个词，若有别名如「数据看板」「报表」，会漏）。
12. **`test_html_delivery.py`／`test_html_delivery_checklist.py`／`test_4_state_fallback.py`／`test_copy_button.py`／`test_copy_prompt_toast.py`／`test_kpi_unified.py`／`test_render.py`／`test_base_pipeline.py`／`test_html_user_manual.py`／`test_memo_query_decision4.py`／`test_memo_query_visual.py`／`test_sync_report_ui.py`／`test_lint_zero_false_positive.py`／`test_db_fallback.py`／`test_fts_cjk.py`／`test_feishu_sync.py`／`test_change_category_neutral.py`／`test_wish_*`（共 18 个文件）未逐行读**：本票用 grep 定位到与 HELP／场景／命令名相关的断言后按需读片段。**§6.3 的表可能不全**。
13. **`test_kpi_unified.py`（154 行）只从文件名推断与 `sync_report.html` 的 KPI 卡有关，未读**：若它测的是别的统计页，§4.2 的「统计只属于 sync」需修正。
14. **新仓侧（`D:\ilife`）本票只读了票 2 的产物**（`t222-content-reconcile.md` 的 §4B／§4C／§五／§六 ＋ `t222-skeleton.json` 的 schema 与取样元素），**未读** `packages/skill-memo-ilife/` 的任何源码。
    故 §3.5 的「老命令 → 新表 10 key」归属**全部沿用票 2 的判断**，本票只做「代码侧是否有独立命令」的复核，**没有独立复查新表的 `wakewords.ts`／`envelope.ts`**。U5／U6 的裁定输入以票 2 的新侧事实为准。
15. **「21 个」的边界口径**：本票把 `help` 也计入（它确实是 `add_parser` 的第 21 个）。若票 6 认为「HELP 自身不算业务子命令」，则应读作 **20 个业务 ＋ 1 个 HELP**。两种口径都已给出，**未替票 6 拍板**。

---

## 附录 A：数字溯源表（每个数 → 哪条命令／哪一行）

| 数 | 值 | 出处 |
|---|---|---|
| `memo_cli.py` 行数／字节 | 1816 行 / 78635 B | `read` 工具末行 ＋ 文件属性 |
| `add_parser` 总数 | **21** | `memo_cli.py:1544,1553,1562,1571,1579,1587,1592,1600,1605,1610,1615,1622,1635,1641,1645,1653,1657,1661,1666,1673,1687` |
| `if args.command ==` 分支数 | **21** | `memo_cli.py:1698,1700,1702,1704,1706,1708,1710,1712,1714,1716,1718,1720,1722,1724,1758,1760,1766,1768,1770,1772,1788` |
| 两套计数差集 | **0** | 上两行逐项配对 |
| 带 `--html` 的可选开关子命令 | **9** | `memo_cli.py:1559`(`search`)／`:1589`(`get`)／`:1597`(`search-date`)／`:1619`(`wish-batch-plan`)／`:1631`(`wish-complete`)／`:1638`(`batch-update-category`)／`:1642`(`sync-from-feishu`)／`:1663`(`reminders`)／`:1667`(`completed`) —— 共 **9 处** `add_argument("--html", action="store_true")` |
| 必生成 HTML（无 `--html`）的子命令 | **2** | `help`（`:1684` 注释「不暴露 `--html` flag」）／`init-report`（`:1673`，`--data` 必传，必出页） |
| 无任何 HTML 的子命令 | **10** | `add`／`update`／`delete`／`complete-wish`／`update-category`／`update-sub-category`／`set-due`／`remind`／`due`／`dismiss` |
| 三者合计 | **21** | 9 ＋ 2 ＋ 10 = 21 ✅ |
| 两张表提到的唯一命令 | **20** | `SKILL.md:158-172`（15 行）＋`:237-266`（30 行），去重后 20 |
| 表有码无 | **0** | §3.2 |
| 码有表无 | **2**（`due`／`init-report`） | §3.3 |
| `memo_cli.py` 统计类词命中 | **0** | regex `stats\|统计\|总数\|overview\|kpi\|汇总\|图表\|chart` |
| `scenarios.yaml` 场景数 | **30**（`52`–`560`） | 逐条抽取 `scenario_id` |
| `scenarios.yaml` 统计场景数 | **0** | 同上，无 `memo_stats_*` |
| `COMMAND_CN_MAP` 键数 | **5** | `memo_render.py:40-46` |
| `DIM_LABEL_MAP` 键数 | **19** | `memo_render.py:49-69` |
| `validate_scenarios.py` 门数 | **16**（G01–G16） | §6.1 |
| `test_help.py` 用例数 | **52**（老 SKILL.md 写 22） | `^\s+def test_` 计数 |
| `test_help.py` 类数 | **11** | §6.2 |
| 零测试覆盖的命令 | **≥2**（`due`／`dismiss`） | §6.4 |
| 老侧「统计」命中处 | **5**（`SKILL.md:268,905,906,967` ＋ `test_payloads.py:99`） | §4.2 |

## 附录 B：对票 2 的**增补块**（可直接并入 `t222-skeleton.json` 的形状说明，本票未改该文件）

> 票 2 的骨架有 13 个顶层键（`schema/for_ticket/map/sources/counts/help_only/old_aliases_not_in_yaml/key_cn/wake_map/domains/new_table/old_scenes`），**没有任何键记录 CLI 子命令全集**。
> 以下是本票补的机器可读块，**建议票 7 作为第 14 个顶层键 `cli` 加入**（本票不代改文件）：

```jsonc
{
  "cli": {
    "source": "D:/2Study/StudyNotes/SKILLS/备忘录/script/memo_cli.py（1816 行 / 78635 B，本票逐行读）",
    "dispatch": "memo_cli.py:1539-1541（argparse.ArgumentParser + add_subparsers）；分支 1698-1788；未知命令兜底 1811-1813",
    "total": 21,
    "count_crosscheck": { "add_parser": 21, "if_cmd_branches": 21, "diff": 0 },
    "commands": [
      { "name": "add",                   "line": 1544, "impl": 118,  "html": false, "one_line": "新建笔记（顶层/子分类/附件/心愿 tasklist+due）" },
      { "name": "search",                "line": 1553, "impl": 196,  "html": true,  "one_line": "关键词+分类/子分类/due 过滤查笔记" },
      { "name": "update",                "line": 1562, "impl": 257,  "html": false, "one_line": "改笔记内容/分类/子分类/附件/关联提醒（无删除能力）" },
      { "name": "delete",                "line": 1571, "impl": 323,  "html": false, "one_line": "删笔记，可多 id，--with-reminders 级联，-y 跳确认" },
      { "name": "complete-wish",         "line": 1579, "impl": 463,  "html": false, "one_line": "完成心愿：原子删心愿+建打卡" },
      { "name": "get",                   "line": 1587, "impl": 551,  "html": true,  "one_line": "按 id 看单条详情" },
      { "name": "search-date",           "line": 1592, "impl": 577,  "html": true,  "one_line": "按日期区间查笔记" },
      { "name": "update-category",       "line": 1600, "impl": 608,  "html": false, "one_line": "改单条顶层分类" },
      { "name": "update-sub-category",   "line": 1605, "impl": 633,  "html": false, "one_line": "改单条子分类" },
      { "name": "set-due",               "line": 1610, "impl": 660,  "html": false, "one_line": "批量设心愿 due，同步飞书 task due" },
      { "name": "wish-batch-plan",       "line": 1615, "impl": 763,  "html": true,  "one_line": "心愿排期向导（收集列表）" },
      { "name": "wish-complete",         "line": 1622, "impl": 857,  "html": true,  "one_line": "心愿完成向导（收集列表，不改库）" },
      { "name": "batch-update-category", "line": 1635, "impl": 968,  "html": true,  "one_line": "批量改分类向导（按原分类收集）" },
      { "name": "sync-from-feishu",      "line": 1641, "impl": 1726, "html": true,  "one_line": "飞书双向对账：本地补建+done 反向+due 反向" },
      { "name": "remind",                "line": 1645, "impl": 1113, "html": false, "one_line": "给笔记加提醒（时间/内容/重复类型/规则）" },
      { "name": "due",                   "line": 1653, "impl": 1148, "html": false, "one_line": "列当前该提醒项（cron 用，--db 可覆盖库路径）", "in_old_tables": false, "wake_word": null },
      { "name": "dismiss",               "line": 1657, "impl": 1371, "html": false, "one_line": "把提醒置为 dismissed（废弃提醒）" },
      { "name": "reminders",             "line": 1661, "impl": 1512, "html": true,  "one_line": "列提醒（--status active/dismissed）" },
      { "name": "completed",             "line": 1666, "impl": 1390, "html": true,  "one_line": "查已触发提醒与对应打卡" },
      { "name": "init-report",           "line": 1673, "impl": 1783, "html": true,  "one_line": "首次使用：按 --data 诊断 JSON 生成初始化报告页", "in_old_tables": false, "wake_word": "首次使用" },
      { "name": "help",                  "line": 1687, "impl": 1795, "html": true,  "one_line": "HELP：必生成 HTML + 覆盖 skill 根 备忘录.html" }
    ],
    "in_old_tables_missing_in_code": [],
    "in_code_missing_in_old_tables": ["due", "init-report"],
    "one_command_two_steps": [
      { "wake_word": "完成心愿", "wizard": "wish-complete", "exec": "complete-wish", "skill_md": "SKILL.md:165" },
      { "wake_word": "心愿排期", "wizard": "wish-batch-plan", "exec": "set-due", "skill_md": "SKILL.md:166" }
    ],
    "no_test_coverage": ["due", "dismiss"],
    "stats_answer": {
      "has_stats_subcommand": false,
      "has_stats_scene": false,
      "stats_keyword_hits_in_cli": 0,
      "old_stats_hits": ["SKILL.md:268 (图例计数表标题)", "SKILL.md:905", "SKILL.md:906", "SKILL.md:967", "tests/test_payloads.py:99"],
      "old_stats_belongs_to_key": "memo.sync",
      "u5_reversed": false
    }
  }
}
```

---

## 附录 C：自查记录

- 老侧目录**全程只读**：本票对 `D:\2Study\StudyNotes\SKILLS\备忘录\` 只有 `read`／`grep`／`Glob`／`Select-String`／`Get-Content`（只读 cmdlet），**无任何写操作**。
- 本票**只写了 1 个文件**：`D:\ilife\docs\skills\skill-memo-ilife\t234-cli-inventory.md`（票面指定的唯一产物）。**未改 `t222-skeleton.json`**、**未改 `t222-content-reconcile.md`**、**未写 `.scratch/`**。
- **未执行任何 git 写操作**（未 `git add`／`commit`／`push`／`checkout`）；**未执行任何 `gh` 写操作**。
- 「拿不准的」已全部进 §七「没读透」清单（15 条），**未用猜测填补**。
- 计数类结论（21／0／2／52／30／5／19）均给出可复现命令或行号清单，见 §1.2 与附录 A。
- 已知不精确处：§6.3 的测试门表基于 grep 定位 ＋ 按需读片段（18 个测试文件未逐行读），**可能不全**，已列入 §七.12。
