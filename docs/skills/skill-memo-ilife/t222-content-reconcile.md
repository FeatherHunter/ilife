# t222 内容资产对账：老骨架 ↔ 新表（地图 `#220` 备忘录HELP真标准 · 票 2 / issue `#222`）

> 本报告的每个数字都由 `t222-extract.mjs` 数出，原始输出落在 `t222-evidence/`。方法照抄兄弟地图 `#183` 票 2 的产物
> `docs/skills/skill-home/t185-extract.mjs`（＋`t185-skeleton.json`／`t185-content-reconcile.md`）：脚本抽取 ＋ 机器可读骨架 ＋ 原始输出落盘。
> ⚠️ **本席实际读到的文件名就是这三个，未被并发改名**（`#183` 那个会话此刻在跑，文件名没变）。
>
> 全程只读：老技能目录 `D:\2Study\StudyNotes\SKILLS\备忘录\` 与 `D:\ilife\packages\skill-memo-ilife\` 一个字节没写。无 git 写、无 gh 写。

---

## 零、三组计数（本席自己数出来的）＋一条关键发现

### 0.1 三组数（复现命令：`node docs/skills/skill-memo-ilife/t222-extract.mjs`）

| # | 要交的数 | 值 | 由哪条命令数出 |
|---|---|---|---|
| 1a | 老 30 场景里**无落点**（新表里没有逐字同名的唤醒词） | **12** | `… extract.mjs` → `old.scenes=30 old.hit=18 old.none=12`；逐条见 `t222-evidence/join.txt` |
| 1b | 其中**逐字命中**新表的 | **18** | 同上（`old.hit=18`） |
| 1c | 12 条无落点里，按居家口径记 `deprecated` 候选的 | **1**（`memo_init_setup` 首次使用，初始化类） | `… extract.mjs join` → `old.none.route=no_route=11` 的名单里含 `memo_init_setup`；脚本 `counts.old_deprecated_candidates=1` |
| 2 | 新表 28 条里**老骨架没有的** | **10** | `… extract.mjs` → `new.entries=28 new.carried=18 new.extra=10`；逐条见 `t222-evidence/extract-full.txt` 的 `X` 行 |
| 3 | 域／二级组／场景逐级计数 | **8 域 / 13 二级组 / 30 场景**；29 个唯一唤醒词；76 个 `editable_fields`；4 处「基础」兜底 | `… extract.mjs names` → 含 `D`／`S` 行的那张逐级清单；`… extract.mjs` → `old.domains=8 old.subs=13`／`old.dims.total=76`／`old.sub_fallback=4` |

### 0.2 关键发现（本席认为这一条比上面三组数更该先看）

**新表的核心动词 `记`／`改`／`删` 加「备忘」，一条都不在表里。** 而新表的现行词表里换成的是
`添加笔记`（wakewords.ts:29）与 `记一条`（:28）。用新表的口径复算
（`routeWakeword` 是 `text.includes(phrase)` ＋ 最长匹配，wakewords.ts:40-52）：

| 老唤醒词（单句） | 新表路由结果 | 命令有无出处 |
|---|---|---|
| `记备忘` | `POLICY_NO_MATCH`（抛错，无候选） | ✗ |
| `改备忘` | `POLICY_NO_MATCH` | ✗ |
| `删备忘` | `POLICY_NO_MATCH` | ✗ |
| `备忘改分类` | `POLICY_NO_MATCH`（新表只有 `批量改分类`，是**另一个词**） | ✗ |
| `备忘改子分类` | `改子分类:memo.update`（子串路由，唯一一条救回来的） | ✓（借道） |
| `备忘录同步` | `POLICY_NO_MATCH`（`memo.sync` 这个命令在任何一张表里都没有唤醒词） | ✗ |
| `记情绪`/`删情绪`/`改情绪` | `POLICY_NO_MATCH`（新表把顶层分类名对齐成「情绪日记」：`记情绪日记` 等） | ✗ |
| `首次使用` | `POLICY_NO_MATCH`（新表 10 命令无 init） | ✗ |

**量化：老 29 个唯一唤醒词 → 逐字命中 18 ／ 仅子串可路由 1 ／ 完全不可路由 10。**
复现：`node …/t222-extract.mjs` 的 `=== 老唯一唤醒词三态：exact=18 substring=1 none=10 ===` 与
`=== 路由口径复算（最长匹配，老词单独成句）===`（本席另用独立的一次性 node 复算过同一张表，结果一致）。

这与地图用户的原话对上了（`map-220-body.md` 用户原话 Q2）：「之前AI重构为新技能偷工减料少了很多底层的唤醒词、命令」——
**这份对账表就是「少掉的那一张清单」**，票 6 的裁决对象、票 7 的入库对象都从这里取。

**另外两条附带的：**

- **新仓测试对这批老词几乎没有覆盖**：10 个不可路由的老词里，只有 `查情绪` 在 `test/` 里出现过字节
  （`phrase.no_match_in_test=1 / 10`；`查情绪` 命中的还是 `查情绪日记`（:15 用例）里的子串）。
  `记提醒`／`心愿排期`／`删心愿`／`改心愿`／`记打卡`／`删打卡`／`改打卡` 虽是逐字命中，也不在测试里点名。
  复现：`t222-evidence/extract-full.txt` 的 `=== 新仓 test/ 对老唯一唤醒词的覆盖 ===`（`C` 行）。
- **老 HELP 触发词实际是 9 条，不是票面记的「8 条（1 字面 ＋ 7 变体）」**：老 `SKILL.md:1088-1095` 的表有 8 行，
  其中 `备忘录 manual` / `备忘录 guide` 写在同一行（两个词），故 8 行 = 9 个短语，其中 1 个是字面。
  逐条见 `t222-evidence/routes.txt` 的 `A` 节；骨架 `help_only` 有 9 条。**这条请用户拍板（U7）。**

---

## 一、方法与事实源（先读，别跳）

### 1.1 老侧：4 份事实源，全都读了

| # | 文件 | 读出来的东西 | 单据/证据 |
|---|---|---|---|
| S1 | `references/scenarios.yaml`（v1.3.0） | 8 `categories` ／ 30 `scenarios`（29 唯一唤醒词）／ 每条 7 必填 ＋ `category`／`subfunction`／`dependencies` | `t222-evidence/lines.txt`（30 行逐条） |
| S2 | `SKILL.md` 的 `## 备忘录 HELP` 全节（1076-1174） | **9 条 HELP 短语**（1 字面 ＋ 8 变体）；「不展示 HELP 唤醒词自身」的硬口径；三副本落盘机制 | `t222-evidence/routes.txt` `A`／`F` 节 |
| S3 | `SKILL.md:147-172` 用户原话 → 唤醒词 → **CLI 反向指引表** | 15 行；**这是老家的「老路由表」**，居家那边的先例就是靠它查全的 | `t222-evidence/routes.txt` `C` 节 |
| S4 | `SKILL.md:226-292` 唤醒词 → **HTML 生成对照表** | 29 行（含 HELP 行与 `-` 号的批量改分类行）＋ 自报统计「29 ＝ ✅10 ＋ 🟡4 ＋ ❌15」＋ 一张别名表 | `t222-evidence/routes.txt` `D`／`E` 节 |
| S5 | `script/memo_render.py` 转换层 | `COMMAND_CN_MAP:40`（5 条查询命令 → 中文名）／`DIM_LABEL_MAP:49`（19 个维度键 → 中文标签）／`_scenarios_to_contract_data:527`（`categories→groups`、`subfunction→subgroups`、空 subfunction → `"基础"`） | `t222-evidence/names.txt` `F` 节 |

### 1.2 老侧**第二事实源**的判定（地图把这道题留给票 2）

地图原文（`map-220-body.md` 第 32 行）问：「老 `SKILL.md` 还带一份唤醒词总表，是否算第二事实源由票 2 判」。
本席判定：**算，而且是必须并读的第二事实源**，依据三条（都可复现）：

1. `SKILL.md:300` 的唤醒词总表**载有 yaml 里没有的词**：`完成心愿` 的别名 **`完成打卡`**、`首次使用` 的别名 **`初始化` / `新手`**。
   yaml 头注自己写明「别名只在 SKILL.md 匹配层，scenarios.yaml 只存主词（#31 Q1）」——**别名是老家对外生效的触发词，只是不落在 yaml 里**。
   证据：`t222-evidence/routes.txt` `B` 节 4 条别名（行 262／300×2／700）。
2. `SKILL.md:156-172` 的反向指引表把口语化原话直接映射到唤醒词 ＋ CLI 命令，**是唯一一份「口语 → 命令」的对照**（yaml 里只有 `prompt` 里的自含锚点）。
3. `SKILL.md:235-266` 的 HTML 对照表**逐词列出 29 个唤醒词的命令名**，比 yaml 的 `scenario_id` 更贴近新表的 `memo.*` 键。

**因此：老侧唤醒词总数 ＝ 29（yaml 唯一） ＋ 2 个别名词（`完成打卡`、`初始化`／`新手` 算一组） ＋ 9 条 HELP 短语。**
这就是「照居家思路查全」的结果——**只看 yaml 会漏掉别名与 HELP 两族**。

### 1.3 新侧：4 份事实源

| # | 文件 | 读出来的东西 |
|---|---|---|
| N1 | `src/policy/wakewords.ts` | `WAKE_TABLE`：**字面 16 条（:14-29）＋ `WAKE_TOPS` 展开 12 条（:32-37）＝ 28 条**；`MemoKey` 10 个；无 `DEPRECATED_PHRASES` |
| N2 | `src/policy/category.ts` | `MEMO_TOPS` 4 个顶层（备忘／心愿／打卡／情绪日记）；`WAKE_TOPS` 12 条 |
| N3 | `src/render/envelope.ts` | `MEMO_KEY_SHAPES` 10 个 key → shape（list/detail/receipt/stat） |
| N4 | `SKILL.md:21-54` | 构建期注入的 HELP-AUTO 速查表：28 行 ＋ 每行的现成 CLI 例（含 preset 全参） |

**新表覆盖率自检：28 条里有 8 个不同的 key；10 条命令里 `memo.sync`／`memo.batch`／`memo.stats` 有 key 但老骨架对不上（见第三节）。**

---

## 二、逐条对账（第一组数 ＋ 归属）

### 2.1 老 30 场景 → 新表（18 逐字命中）

| 老场景 id | 行 | 老域 | 二级组 | 老唤醒词 | → 新表短语 | 新 key | shape | 老 CLI（HTML 对照表） |
|---|---|---|---|---|---|---|---|---|
| `memo_search_keyword` | 138 | 查找类 | 基础查找 | 搜备忘 | 搜备忘 | `memo.search` | list | `search --html` |
| `memo_search_alias` | 158 | 查找类 | 基础查找 | 查备忘 | 查备忘 | `memo.search` | list | 同上（别名同命令） |
| `memo_get_detail` | 172 | 查找类 | 基础查找 | 看备忘 | 看备忘 | `memo.detail` | detail | `get --html` |
| `memo_search_by_date` | 187 | 查找类 | 时间查找 | 按时间搜备忘 | 按时间搜备忘 | `memo.search` | list | `search-date --html` |
| `memo_search_wish` | 205 | 查找类 | 分类查找 | 查心愿 | 查心愿 | `memo.wish` | list | `search -c 心愿 --html` |
| `memo_search_checkin` | 222 | 查找类 | 分类查找 | 查打卡 | 查打卡 | `memo.search` | list | `search -c 打卡 --html` |
| `memo_remind_with_note` | 252 | 提醒类 | 创建提醒 | 记提醒 | 记提醒 | `memo.create`（needs `remindAt`） | receipt | `add` + `remind` |
| `memo_remind_existing` | 271 | 提醒类 | 创建提醒 | 设提醒 | 设提醒 | `memo.create`（needs `remindAt`） | receipt | `remind` |
| `memo_reminders_active` | 291 | 提醒类 | 查看提醒 | 看提醒 | 看提醒 | `memo.remind` | list | `reminders --html` |
| `memo_completed_reminders` | 306 | 提醒类 | 查看提醒 | 查已提醒备忘 | 查已提醒备忘 | `memo.remind`（preset `done:false`） | list | `completed --html` |
| `memo_complete_wish` | 322 | 心愿类 | 心愿推进 | 完成心愿 | 完成心愿 | `memo.update`（preset `done:true`） | receipt | `wish-complete --html` 🟡 |
| `memo_wish_schedule` | 341 | 心愿类 | 心愿推进 | 心愿排期 | 心愿排期 | `memo.wish` | list | `wish-batch-plan --html` 🟡 |
| `memo_add_wish` | 403 | 心愿类 | 心愿管理 | 记心愿 | 记心愿 | `memo.create`（preset `category:心愿`） | receipt | `add -c 心愿` |
| `memo_delete_wish` | 424 | 心愿类 | 心愿管理 | 删心愿 | 删心愿 | `memo.update`（needs `id`） | receipt | `delete` |
| `memo_update_wish` | 438 | 心愿类 | 心愿管理 | 改心愿 | 改心愿 | `memo.update`（needs `id`） | receipt | `update` |
| `memo_add_checkin` | 453 | 打卡类 | （基础兜底） | 记打卡 | 记打卡 | `memo.create`（preset `category:打卡`） | receipt | `add -c 打卡` |
| `memo_delete_checkin` | 469 | 打卡类 | （基础兜底） | 删打卡 | 删打卡 | `memo.update`（needs `id`） | receipt | `delete` |
| `memo_update_checkin` | 482 | 打卡类 | （基础兜底） | 改打卡 | 改打卡 | `memo.update`（needs `id`） | receipt | `update` |

⚠️ 逐字命中的 18 条里有 **1 条真假歧义**：`按时间搜备忘` 同时含 `按时间搜备忘` 与 `搜备忘` 两个新短语，
最长匹配取前者，结果正确但**依赖短语长度顺序**（`old.ambiguous_routes=1`，见 `extract-full.txt` 的 `route=…/歧义:`）。
`搜备忘` 本身也是 `按时间搜备忘` 的子串——**这是新表最长匹配规则在扛的活，票 5／票 7 别改坏它。**

### 2.2 老 30 场景 → 新表（12 无逐字落点；这是「无落点」的口径本体）

**口径声明**：居家口径的 `deprecated` ＝ 老场景在新表**没有任何承接**。题面要求「老 30 场景里几条无落点」，
本席按**新表无逐字同名唤醒词**数（＝12），再把 12 条逐条给出路，避免把「能救」的和「救不了」的混成一个数。

| # | 老场景 id | 行 | 老域 | 二级组 | 老唤醒词 | 新表出路 | 裁定归属 |
|---|---|---|---|---|---|---|---|
| 1 | `memo_add_basic` | 52 | 备忘类 | 基础记录 | 记备忘 | `POLICY_NO_MATCH` | **补唤**：挂 `memo.create`／新表现有词 `添加笔记`(:29) 只是别名 |
| 2 | `memo_update_basic` | 71 | 备忘类 | 基础记录 | 改备忘 | `POLICY_NO_MATCH` | **补唤**：挂 `memo.update` |
| 3 | `memo_delete_basic` | 89 | 备忘类 | 基础记录 | 删备忘 | `POLICY_NO_MATCH` | **补唤**：挂 `memo.remove` |
| 4 | `memo_change_category_single` | 105 | 备忘类 | 分类调整 | 备忘改分类 | `POLICY_NO_MATCH` | **补唤**：挂 `memo.update` |
| 5 | `memo_batch_change_category` | 361 | 备忘类 | 分类调整 | 备忘改分类 | 逐字无；新表有 **`批量改分类`**（:16） | **改名对**：老单条／批量共用一个词，新表拆成两词 → 老 `备忘改分类` 该归单条还是批量，票 6 裁 |
| 6 | `memo_change_subcategory` | 123 | 备忘类 | 分类调整 | 备忘改子分类 | 子串路由 → `改子分类`（:17） | **改名**：`备忘改子分类` → `改子分类`（唯一一条被子串救回的） |
| 7 | `memo_search_mood` | 237 | 查找类 | 分类查找 | 查情绪 | `POLICY_NO_MATCH` | **改名**：→ `查情绪日记`（:22） |
| 8 | `memo_add_mood` | 496 | 情绪类 | （基础兜底） | 记情绪 | `POLICY_NO_MATCH` | **改名**：→ `记情绪日记`（:19） |
| 9 | `memo_delete_mood` | 510 | 情绪类 | （基础兜底） | 删情绪 | `POLICY_NO_MATCH` | **改名**：→ `删情绪日记`（:27） |
| 10 | `memo_update_mood` | 523 | 情绪类 | （基础兜底） | 改情绪 | `POLICY_NO_MATCH` | **改名**：→ `改情绪日记`（:25） |
| 11 | `memo_sync_feishu` | 381 | 同步类 | （基础兜底） | 备忘录同步 | `POLICY_NO_MATCH` | **补唤**：`memo.sync` 有 key 无词（新表最大的洞） |
| 12 | `memo_init_setup` | 535 | 初始化类 | （基础兜底） | 首次使用 | `POLICY_NO_MATCH` | **`deprecated` 候选**（与居家 link 域同型：功能不在新表 10 命令里） |

**小结（第一组数）：** 无逐字落点 **12** 条 ＝ 逐字命中 18 ／ 30。
12 条里：**可子串路由 1**（备忘改子分类）、**可用于改名对齐 4**（情绪族）、**需补唤 6**（记/改/删备忘、备忘改分类、备忘录同步 = 5 条 ＋ 首次使用 1 条 deprecated）。
复现：`node …/t222-extract.mjs join` → `old.none.route=substring=1`／`old.none.route=no_route=11` 两行名单。

### 2.3 新表 28 条 → 老骨架（第二组数：10 条老骨架没有的）

| # | 新表短语 | 行 | key | 出处 | 老骨架有没有 | 归属（挂哪个老场景） |
|---|---|---|---|---|---|---|
| 1 | 批量改分类 | :16 | `memo.batch` | 字面 | 无逐字（老把它与单条并在 `备忘改分类` 一个词里） | `memo_batch_change_category`（老 SKILL.md:169 的 `batch-update-category`） |
| 2 | 改子分类 | :17 | `memo.update` | 字面 | 无逐字（老名 `备忘改子分类`，可子串路由） | `memo_change_subcategory` |
| 3 | 查提醒 | :22 | `memo.remind` | 字面 | 无（老只有 `看提醒`） | `memo_reminders_active`（同义词并列收录） |
| 4 | 废弃提醒 | :25 | `memo.remove`（preset `mode:abandon`） | 字面 | 无（老 SKILL.md:839 只有章节「### 废弃提醒」，**没进 yaml、也没进 HTML 对照表 29 词**） | **无承接场景**：`cmd_read.ts:65-69` 有 `mode:'abandon'` 实现，老 yaml 里没有对应场景 → 要新开场景还是当 `废弃` 语义并入删除，票 6 裁 |
| 5 | 记一条 | :28 | `memo.create` | 字面 | 无 | `memo_add_basic`（口语化） |
| 6 | 添加笔记 | :29 | `memo.create` | 字面 | 无唤醒词（老 SKILL.md:477 章节名「### 添加笔记」是**功能名**，不是唤醒词） | `memo_add_basic` |
| 7 | 记情绪日记 | :19（`WAKE_TOPS` 展开） | `memo.create`（preset `category:情绪日记`） | `WAKE_TOPS` | 无逐字（老名 `记情绪`） | `memo_add_mood` |
| 8 | 查情绪日记 | :22（展开） | `memo.search`（preset `category:情绪日记`） | `WAKE_TOPS` | 无逐字（老名 `查情绪`） | `memo_search_mood` |
| 9 | 改情绪日记 | :25（展开） | `memo.update`（needs `id`） | `WAKE_TOPS` | 无逐字（老名 `改情绪`） | `memo_update_mood` |
| 10 | 删情绪日记 | :27（展开） | `memo.update`（needs `id`） | `WAKE_TOPS` | 无逐字（老名 `删情绪`） | `memo_delete_mood` |

**10 条拆两类**（这条拆分对票 7 入库很关键）：

- **真新增 6 条**：批量改分类／改子分类／查提醒／废弃提醒／记一条／添加笔记（老骨架 + 老 SKILL.md 两张表都没有对应词）。
- **改名孪生 4 条**：记/查/改/删**情绪日记**——老骨子里是「情绪」族四个词，只是名字没对齐顶层分类名。
  **入库时这 4 条要和老场景合并成一条（一场景一唤醒词，别名进 aliases），不能各占一行。**
  改名对清单（脚本 `N` 行）：`备忘改子分类→改子分类`、`查情绪→查情绪日记`、`记情绪→记情绪日记`、`改情绪→改情绪日记`、`删情绪→删情绪日记`。

**两边并集（脚本 `=== 两边并集 ===`）：union=39，两边都有 18，只在老侧 11，只在新侧 10。**
29 ＋ 28 － 18 ＝ 39 ✓（自洽校验）。

### 2.4 老骨架里新表**根本没内容**的地方（反向缺口，票 7 必须知道）

新表 10 条命令里，**`memo.stats` 在老骨架上没有任何场景**：老 30 场景里没有一条的场景 id／唤醒词／HTML 对照表行指向统计命令
（最近的是 `memo_render.py:40` `COMMAND_CN_MAP` 的 5 条查询命令，全是 search/get/remind 族）。
**即：`memo.stats` 是「有新命令、无老内容」的空壳。** 复现：`t222-evidence/extract-full.txt` 的 `X` 行里没有 stats；
`t222-evidence/routes.txt` `C`／`D` 两节 15 行 CLI 与 29 行 HTML 里也没有统计命令。

其余 9 个 key 都有老场景承接（分配见第四节 4A）。

---

## 三、老目录逐级计数 ＋ 名称清单（第三组数）

### 3.1 逐级计数（复现：`node …/t222-extract.mjs names` 的 `C` 节）

| 老域（`category`） | 中文名 | 本席英文标识 | 二级组数 | 场景数 | 逐字命中 | 无落点 | 新表 key（归属） |
|---|---|---|---|---|---|---|---|
| `memo` | 备忘类 | memo | 2 | **6** | 0 | 6 | `memo.create`＋`update`＋`remove`＋`batch` |
| `search` | 查找类 | search | 3 | **7** | 6 | 1 | `memo.search`＋`detail`＋`wish`＋`remind` |
| `remind` | 提醒类 | remind | 2 | **4** | 4 | 0 | `memo.remind`＋`create` |
| `wish` | 心愿类 | wish | 2 | **5** | 5 | 0 | `memo.wish`＋`update` |
| `checkin` | 打卡类 | checkin | 1 | **3** | 3 | 0 | `memo.create`＋`update`＋`remove` |
| `mood` | 情绪类 | mood | 1 | **3** | 0 | 3 | `memo.create`＋`update`＋`remove` |
| `sync` | 同步类 | sync | 1 | **1** | 0 | 1 | `memo.sync` |
| `init` | 初始化类 | init | 1 | **1** | 0 | 1 | **（无 key）** |
| **合计** | | | **13** | **30** | **18** | **12** | 10 条命令全覆盖（`memo.stats` 除外） |

**13 个二级组（`subfunction`）—— 含 4 处「基础」兜底：**

| 老域 | 二级组 | 场景数 | 兜底? | 场景 id |
|---|---|---|---|---|
| memo | 基础记录 | 3 | | `memo_add_basic` / `memo_update_basic` / `memo_delete_basic` |
| memo | 分类调整 | 3 | | `memo_change_category_single` / `memo_change_subcategory` / `memo_batch_change_category` |
| search | 基础查找 | 3 | | `memo_search_keyword` / `memo_search_alias` / `memo_get_detail` |
| search | 时间查找 | 1 | | `memo_search_by_date` |
| search | 分类查找 | 3 | | `memo_search_wish` / `memo_search_checkin` / `memo_search_mood` |
| remind | 创建提醒 | 2 | | `memo_remind_with_note` / `memo_remind_existing` |
| remind | 查看提醒 | 2 | | `memo_reminders_active` / `memo_completed_reminders` |
| wish | 心愿推进 | 2 | | `memo_complete_wish` / `memo_wish_schedule` |
| wish | 心愿管理 | 3 | | `memo_add_wish` / `memo_delete_wish` / `memo_update_wish` |
| **sync** | （空 → 「基础」） | 1 | ✅ | `memo_sync_feishu`（行 381） |
| **checkin** | （空 → 「基础」） | 3 | ✅ | `memo_add_checkin`(453) / `memo_delete_checkin`(469) / `memo_update_checkin`(482) |
| **mood** | （空 → 「基础」） | 3 | ✅ | `memo_add_mood`(496) / `memo_delete_mood`(510) / `memo_update_mood`(523) |
| **init** | （空 → 「基础」） | 1 | ✅ | `memo_init_setup`（行 535） |

**4 处兜底正好是「分类下只有一个子功能」的那 4 个域**（sync／checkin／mood／init），与地图地面真相记的
「4 处分类下只有一个子功能 → 走『基础』兜底」逐一对上；转换层落点 `memo_render.py:556`（`sub_key = s.get("subfunction") or "基础"`）。
**票 5／票 6 要裁的正是这 4 处：通用 help 模板下要不要真建一个叫「基础」的二级组。**

---

## 四、归属（第二张可执行表：老骨架 ＋ 新词怎么落位）

### 4A. 域级：老 8 域 ↔ 新 4 顶层 ＋ 10 命令

**老域不是新表的分区**：新表的顶层分区是 `MEMO_TOPS` 4 个（`category.ts:4`），老域是 8 个。
两套要接起来，只能靠「命令」这一层。逐域归属如下：

| 老域（中文） | 老英文 | 本席英文标识（可用作目录名） | 新表顶层分类 | 新表命令（10 条里的） |
|---|---|---|---|---|
| 备忘类 | `memo` | memo | 备忘 | `memo.create` `memo.update` `memo.remove` `memo.batch` |
| 查找类 | `search` | search | 全 4 类（跨分类查） | `memo.search` `memo.detail` `memo.wish` `memo.remind` |
| 提醒类 | `remind` | remind | 跨类（提醒是笔记的属性） | `memo.remind`（查）＋ `memo.create`（设） |
| 心愿类 | `wish` | wish | 心愿 | `memo.wish`＋`memo.update`（完成/排期） |
| 打卡类 | `checkin` | checkin | 打卡 | `memo.create` `memo.update` `memo.remove` |
| 情绪类 | `mood` | mood | 情绪日记 | `memo.create` `memo.update` `memo.remove` |
| 同步类 | `sync` | sync | 跨类（飞书对账） | `memo.sync` |
| 初始化类 | `init` | init | — | **无**（新表 10 命令无 init） |

### 4B. 10 条命令 → 中文名 ＋ 老内容存量（结构设计票与资产票直接消费）

| 命令 | 本席给的中文名 | shape | 老骨架承接数 | 老侧来源动作 |
|---|---|---|---|---|
| `memo.search` | 查（列表／全文／按时间／按分类过滤） | list | **5** | 搜备忘／查备忘／按时间搜备忘／查打卡／（改名后）查情绪日记 |
| `memo.detail` | 看单条详情 | detail | 1 | 看备忘 |
| `memo.create` | 新建笔记（含设提醒） | receipt | **6** | 记备忘／记提醒／设提醒／记心愿／记打卡／（改名后）记情绪日记 |
| `memo.update` | 改（内容／分类／子分类／排期／完成） | receipt | **9** | 改备忘／备忘改分类／备忘改子分类／完成心愿／删心愿／改心愿／删打卡／改打卡／（改名后）改情绪日记 |
| `memo.remove` | 删／废弃提醒 | receipt | 5 | 删备忘／删心愿／删打卡／（改名后）删情绪日记／＋新词「废弃提醒」（无老场景） |
| `memo.remind` | 提醒查询（有效／已触发） | list | 3 | 看提醒／查已提醒备忘／＋新词「查提醒」 |
| `memo.wish` | 心愿（查心愿／心愿排期） | list | 3 | 查心愿／心愿排期／＋新词「查心愿」preset |
| `memo.sync` | 飞书双向对账 | receipt | 1 | 备忘录同步（**无唤醒词**） |
| `memo.batch` | 批量改分类向导 | receipt | 1 | `memo_batch_change_category`（老词与单条共用） |
| `memo.stats` | 统计总览 | stat | **0** | **老骨架无任何内容** |

> 注：「承接数」按**老场景归属**算（含改名对齐的 4 条情绪族），不等同于「逐字命中 18」；
> 逐字命中 18 的名单在第二节 2.1。`memo.update` 之所以最重（9），是因为老表把「删」也走 update（`删心愿` 的 key 就是 `memo.update`）。

### 4C. 中英名对照（域名／二级组名／场景名三层）

**第三层（场景级）的「老英文」不存在**——老家只有 `scenario_id`（下划线命名）与 `memo_cli.py` 的子命令名（`add`／`update-category`／`sync-from-feishu` …）。
本席把三层对齐成一张表，**新表侧一律用仓内既有的冻结字符串，未造新名**：

| 层 | 老中文名 | 老标识（yaml／SKILL.md） | 新表英文名（仓内既有） | 出处 |
|---|---|---|---|---|
| 域 | 备忘类／查找类／提醒类／心愿类／打卡类／情绪类／同步类／初始化类 | `memo`／`search`／`remind`／`wish`／`checkin`／`mood`／`sync`／`init` | 4 顶层：备忘／心愿／打卡／情绪日记；10 命令前缀 `memo.*` | `category.ts:4`／`wakewords.ts:5-7` |
| 域 | （同上） | 同上 | `MEMO_TOPS`＝`['备忘','心愿','打卡','情绪日记']` | `category.ts:4` |
| 二级组 | 基础记录／分类调整／基础查找／时间查找／分类查找／创建提醒／查看提醒／心愿推进／心愿管理 | 同名 `subfunction` 字符串 | 无独立英文名（新表不建二级组；命令名即功能名） | `scenarios.yaml` `subfunction` 字段 |
| 二级组 | （空 → 「基础」）×4：sync／checkin／mood／init | 字段缺省 | — | `memo_render.py:556` |
| 场景 | 记备忘／搜备忘／…／备忘改分类（批量） | `scenario_id`：`memo_add_basic`／… | 唤醒词 × key：见 2.1／2.2／2.3 三张表 | 本报告 |

**命令级中英对照（10 条，仓内冻结名 → 中文名）：**

| 英文（冻结） | 中文 |
|---|---|
| `memo.search` | 查 |
| `memo.detail` | 看（单条详情） |
| `memo.create` | 记／新建 |
| `memo.update` | 改 |
| `memo.remove` | 删／废弃 |
| `memo.remind` | 提醒（查询） |
| `memo.wish` | 心愿 |
| `memo.sync` | 同步（飞书对账） |
| `memo.batch` | 批量（改分类向导） |
| `memo.stats` | 统计 |

⚠️ **老中文动词与新英文动词的对应不是一对一的**：「改备忘」的 key 是 `memo.update`，而「删心愿」的 key **也是** `memo.update`
（新表把「删」当 update 的一种，`wakewords.ts:36`），真正的删除命令 `memo.remove` 只接 `废弃提醒`。
**这就是新表 28 条里 `memo.remove` 只有 1 个词（废弃提醒）而 `memo.update` 占了 12 个词的原因。**
票 6 需要裁：老「删 X」语义（老 4 条：删备忘／删心愿／删打卡／删情绪）在新表里到底走 `memo.remove` 还是 `memo.update`。

---

## 五、「要用户拍板」的条目（U 清单，本席不猜）

> 每一条都给出证据行号，用户拍板后由票 6（内容裁决）／票 7（资产入库）消费。

| U | 条目 | 本席发现的实际情况 | 要拍什么 |
|---|---|---|---|
| **U1** | `记备忘`／`改备忘`／`删备忘` 三词（老备忘类「基础记录」组的全部内容） | 新表 `POLICY_NO_MATCH`（无候选）；新表同功能写成 `添加笔记`(:29)／`记一条`(:28) | 是**补唤**（把这三个词登记进 `WAKE_TABLE`）还是**改名换叫法**（老词弃用、HELP 只展新词）？这是「偷工减料」清单的头三条 |
| **U2** | `备忘录同步`（同步类唯一场景） | `memo.sync` 有 key、`MEMO_KEY_SHAPES:13` 有 shape、`cmd_read.ts:84-87` 有实现，**但 28 条词表里没有任何词指向它** | 用哪个词触发 `memo.sync`：老 `备忘录同步`？还是新造（`同步`／`对账`）？ |
| **U3** | `备忘改分类`（老 yaml 里**单条 `memo_change_category_single` 与批量 `memo_batch_change_category` 共用同一个词**） | 新表把批量拆成独立短语 `批量改分类`(:16)，单条只剩 `改分类`？→ **新表里没有「改分类」这个词**，单条改分类无词可用 | 单条改分类的唤醒词定成什么（老词 `备忘改分类` 复用／新造 `改分类`）？批量与单条如何消歧（老家的消歧规则在 SKILL.md:648-651：含「都/全部/多个 id」走批量）？ |
| **U4** | 情绪族 5 条：`备忘改子分类`／`查情绪`／`记情绪`／`删情绪`／`改情绪` | `备忘改子分类` 能子串路由到 `改子分类`；`查/记/改/删情绪` **全部不可路由**（新表叫 `…情绪日记`） | 认不认这批**改名**：入库时把老词收成**别名**（一场景一唤醒词），还是让老词彻底作废？ |
| **U5** | `memo.stats`（统计总览） | 新表有 shape（`stat`），**老骨架 30 场景里 0 条内容**（见 2.4） | HELP 里要不要展示 `memo.stats`？要展示就得先给它内容（场景／唤醒词），这活算在本图还是另立图 |
| **U6** | `废弃提醒`（新词，:`25`）＋ 新表把「删」挂在 `memo.update` 上 | `cmd_read.ts:65-69` 有 `mode:'abandon'` 实现；老骨架**只有章节名**、没进 yaml／没进 29 词对照表 | 要不要为「废弃提醒」**新开一条场景**？老「删 X」四条的语义归 `memo.remove` 还是 `memo.update`（见 4C 末注） |
| **U7** | 老 HELP 触发短语到底是几条 | 老 `SKILL.md:1088-1095` 的 8 行 ＝ **9 个短语**（`备忘录 manual` 与 `备忘录 guide` 同行），其中 1 条字面 ＋ 8 条变体；票面／地图记的是「1 ＋ 7」 | 确认口径：算 9 条（本席按逐词数）还是算 8 条（按表行数）？影响票 7 的别名表条数与 HELP 的「不展示自身」判定 |
| **U8** | 4 处「基础」兜底（sync／checkin／mood／init） | 老转换层 `memo_render.py:556` 把空 `subfunction` 兜成 `"基础"` | 通用 help 模板下**要不要真建「基础」二级组**（建＝多 4 个组标题，不建＝场景直接挂域下）？ |

---

## 六、「没读透」与本次的边界（明确列，不猜）

1. **老实物 HTML 没读**：`.db\memo_html\` 与技能根 `备忘录.html`（57500 B）**本席一个字节没读**。
   地图第 33 行已裁「老实物只当内容旁证、不当视觉基准（用户 Q1=A）」，而本票只对**内容骨架**，故未纳入。
   若要拿老 HELP 的**分组标题文字**当二级组名的旁证，需要另派一票（本席不用它，二级组名一律取 yaml 原文）。
2. **`CHANGELOG.md`（53300 B）与老 `tests/`（test_help.py 等）没读**：可能载有已废弃唤醒词的历史（尤其「别名：完成打卡」这类后来居上的词）。
   本席只读了 `SKILL.md`／`scenarios.yaml`／`memo_render.py`／`validate_scenarios.py` 的路径引用（未读实现），**历史废弃词可能有漏**。
3. **`validate_scenarios.py` 没读实现**：只从 yaml 头注得知它「测试 + 渲染前双触发」。若它有额外白名单（如 `type` 徽章白名单），本席没取到。
4. **`script/memo_cli.py`（78635 B）没读**：CLI 子命令全集只从老 `SKILL.md` 的对照表取得（15 行反向指引 ＋ 29 行 HTML 对照）。
   **可能存在表里没列的子命令**（例如统计类），这会让 2.4 的「`memo.stats` 无老内容」结论有反转风险。**这是本报告最大的未验证点。**
5. **`feishu_sync.py`／`reminder_scheduler.py`／`templates/*.html` 没读**：与「内容骨架」不直接相关，未纳入。
6. **新仓侧只读了 policy／render 的 4 个文件**：`src/fetch/*`、`src/cli/cmd_read.ts` 只读了分发分支（用于核对 `memo.stats`／`memo.sync`／`mode:'abandon'` 的实现有无），未审别的行为。
7. **`#183` 那个会话的产物未做版本核对**：本席读到的 `t185-extract.mjs` 是 2026/9/12 10:29 那版（未改名、未变化）；若该会话之后又改，方法可能有更新版。
8. **同名唤醒词的多场景共用**：老 yaml 里 `备忘改分类` 一词两场景（`memo_change_category_single` 行 105 ＋ `memo_batch_change_category` 行 361），
   本席按「29 唯一唤醒词」口径计数（不重复计），因此**场景数 30 ≠ 唤醒词数 29**，两份数别混用。

---

## 附录 A：脚本、产物与自查

### A.1 产物清单

| 产物 | 说明 |
|---|---|
| `docs/skills/skill-memo-ilife/t222-content-reconcile.md` | 本报告 |
| `docs/skills/skill-memo-ilife/t222-skeleton.json` | 机器可读骨架（`JSON.parse` 通过；与报告附录 B 逐字相同） |
| `docs/skills/skill-memo-ilife/t222-extract.mjs` | 只读抽取脚本，可重跑，模式：无参（全量证据）／`join`／`skeleton`／`lines`／`names`／`routes`／`evidence` |
| `docs/skills/skill-memo-ilife/t222-evidence/` | 脚本原始输出：`extract-full.txt`／`join.txt`／`lines.txt`／`names.txt`／`routes.txt`／`skeleton.json` |

### A.2 复现命令（每条数字对应哪条命令）

```bash
# 全量证据（O/W/J/X/COUNT ＋ 三态表 ＋ 路由复算 ＋ 测试覆盖 ＋ 并集）
node docs/skills/skill-memo-ilife/t222-extract.mjs

# 三组数的最短路径
node docs/skills/skill-memo-ilife/t222-extract.mjs join      # old.scenes/hit/none、new.entries/carried/extra
node docs/skills/skill-memo-ilife/t222-extract.mjs lines     # 30 场景逐条（含 yaml 行号）
node docs/skills/skill-memo-ilife/t222-extract.mjs names     # 域／二级组逐级计数 ＋ 老 SKILL.md 转换层证据
node docs/skills/skill-memo-ilife/t222-extract.mjs routes    # HELP 9 条／别名／CLI 反向表／HTML 对照表
node docs/skills/skill-memo-ilife/t222-extract.mjs skeleton  # 打印骨架 JSON（stdout，JSON.parse 已自检）

# 重刷证据目录（唯一会写文件的那条；只写 t222-evidence/）
node docs/skills/skill-memo-ilife/t222-extract.mjs evidence

# 骨架与报告副本一致性 + JSON 合法性
node -e "const fs=require('fs');const a=fs.readFileSync('docs/skills/skill-memo-ilife/t222-skeleton.json','utf8');JSON.parse(a);const r=fs.readFileSync('docs/skills/skill-memo-ilife/t222-content-reconcile.md','utf8');const i=r.indexOf('{\n  \"schema\"');const j=r.lastIndexOf('\n```');console.log('report_copy_identical='+(r.slice(i,j).trim()===a.trim()));"
```

### A.3 数字溯源表（每个数 → 哪条命令）

| 数 | 值 | 出处（脚本输出文本） |
|---|---|---|
| 老场景数 | 30 | `old.scenes=30` |
| 老唯一唤醒词 | 29 | `old.unique_wake=29`（＝ yaml 头注自报值，交叉验证通过） |
| 老域数／二级组数 | 8 / 13 | `old.domains=8 old.subs=13` |
| 老 `editable_fields` 总数 | 76 | `old.dims.total=76`（＝ `dimensions` 非空键计数，`memo_render.py` 的 `editable_fields` 生成口径） |
| 「基础」兜底处数 | 4 | `old.sub_fallback=4` |
| 逐字命中／无落点 | 18 / 12 | `old.hit=18 old.none=12` |
| 其中可子串路由／完全不可路由 | 1 / 11 | `old.none.route=substring=1`／`old.none.route=no_route=11` |
| 老唯一唤醒词三态 | 18 / 1 / 10 | `old_unique_wake_exact/substring/none` |
| 新表条数 | 28 | `new.entries=28`（字面 16 ＋ `WAKE_TOPS` 展开 12） |
| 新表有老承接／老骨架没有 | 18 / 10 | `new.carried=18 new.extra=10` |
| 两边并集 | 39（both 18） | `=== 两边并集 ===` |
| 老 HELP 短语 | 9 | `routes.txt` `H.count=9`；骨架 `help_only` 9 条 |
| 新表 `DEPRECATED_PHRASES` | 0（该常量不存在） | `new_deprecated_phrases=0` |
| 新仓测试对 10 个不可路由老词的覆盖 | 1 / 10 | `phrase.no_match_in_test=1 / 10` |

### A.4 自查记录

- 骨架 `JSON.parse` 通过（`wrote skeleton.json … json_valid=true`），文件 57989 B。
- 报告附录 B 的骨架副本与 `t222-skeleton.json` **逐字相同**（一致性命令见 A.2）。
- 老侧文件全部只读（无 `writeFileSync` 指向老目录）；脚本唯一的写操作在 `evidence` 模式，落 `t222-evidence/`。
- 未执行任何 git 写、未执行任何 `gh` 写。

---

## 附录 B：机器可读骨架（与 `t222-skeleton.json` 逐字相同）

```json
{
  "schema": "skill-memo-ilife/scene-skeleton@1",
  "for_ticket": "#222",
  "map": "#220",
  "sources": {
    "old_yaml": "D:/2Study/StudyNotes/SKILLS/备忘录/references/scenarios.yaml（v1.3.0，8 域／13 二级组／30 场景）",
    "old_skill_md": "D:/2Study/StudyNotes/SKILLS/备忘录/SKILL.md（HELP 变体行 1082 起；别名行 300；用户原话→CLI 行 156 起；HTML 对照行 235 起）",
    "old_render": "D:/2Study/StudyNotes/SKILLS/备忘录/script/memo_render.py（_scenarios_to_contract_data:527／DIM_LABEL_MAP:49／COMMAND_CN_MAP:40）",
    "new_wake": "packages/skill-memo-ilife/src/policy/wakewords.ts（WAKE_TABLE 字面 16 条 + WAKE_TOPS 展开 12 条 = 28 条）",
    "new_category": "packages/skill-memo-ilife/src/policy/category.ts（WAKE_TOPS 12 条／MEMO_TOPS 4 顶层）",
    "new_shapes": "packages/skill-memo-ilife/src/render/envelope.ts（MEMO_KEY_SHAPES 10 key）",
    "new_md": "packages/skill-memo-ilife/SKILL.md:21-54（HELP-AUTO 构建期注入）",
    "method": "docs/skills/skill-home/t185-extract.mjs（兄弟地图 #183 票 2 产物，本席实际读的就是该文件名）",
    "reconcile": "docs/skills/skill-memo-ilife/t222-content-reconcile.md"
  },
  "counts": {
    "old_scenes": 30,
    "old_unique_wake": 29,
    "old_domains": 8,
    "old_subs": 13,
    "old_sub_fallback": 4,
    "old_dims_total": 76,
    "old_none": 12,
    "old_hit": 18,
    "old_none_route_substring": 1,
    "old_none_route_no_route": 11,
    "old_ambiguous_routes": 1,
    "old_deprecated_candidates": 1,
    "old_other_no_landing": 11,
    "old_route_no_match_scenes": 11,
    "new_entries": 28,
    "new_literal": 16,
    "new_from_wake_tops": 12,
    "new_carried": 18,
    "new_extra": 10,
    "new_keys": 8,
    "new_help_rows": 28,
    "new_deprecated_phrases": 0,
    "old_unique_wake_exact": 18,
    "old_unique_wake_substring": 1,
    "old_unique_wake_none": 10,
    "phrase_no_match": 10,
    "phrase_no_match_list": [
      "记备忘",
      "改备忘",
      "删备忘",
      "备忘改分类",
      "查情绪",
      "备忘录同步",
      "记情绪",
      "删情绪",
      "改情绪",
      "首次使用"
    ]
  },
  "help_only": [
    {
      "phrase": "备忘录 HELP",
      "kind": "字面",
      "old_line": 1088,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "备忘录 help",
      "kind": "大小写变体",
      "old_line": 1089,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "备忘 HELP",
      "kind": "缩字变体",
      "old_line": 1090,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "备忘录的help在哪",
      "kind": "口语化 + 略错",
      "old_line": 1091,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "帮我看下备忘录的使用说明",
      "kind": "口语 + 同义(\"使用说明\"=\"HELP\")",
      "old_line": 1092,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "/备忘录-help",
      "kind": "slash command 风格",
      "old_line": 1093,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "/备忘录 help",
      "kind": "slash + 空格",
      "old_line": 1094,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "备忘录 manual",
      "kind": "英文同义词",
      "old_line": 1095,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    },
    {
      "phrase": "备忘录 guide",
      "kind": "英文同义词",
      "old_line": 1095,
      "key": null,
      "note": "HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key"
    }
  ],
  "old_aliases_not_in_yaml": [
    {
      "line": 262,
      "raw": "别名:完成打卡",
      "note": "别名只在老 SKILL.md 匹配层，scenarios.yaml 只存主词（yaml 头注 #31 Q1）"
    },
    {
      "line": 300,
      "raw": "别名:完成打卡",
      "note": "别名只在老 SKILL.md 匹配层，scenarios.yaml 只存主词（yaml 头注 #31 Q1）"
    },
    {
      "line": 300,
      "raw": "别名:初始化 / 新手",
      "note": "别名只在老 SKILL.md 匹配层，scenarios.yaml 只存主词（yaml 头注 #31 Q1）"
    },
    {
      "line": 700,
      "raw": "别名:完成打卡",
      "note": "别名只在老 SKILL.md 匹配层，scenarios.yaml 只存主词（yaml 头注 #31 Q1）"
    }
  ],
  "key_cn": {
    "memo.search": "查（列表/全文/按时间/按分类过滤）",
    "memo.detail": "看单条详情",
    "memo.create": "新建笔记（含设提醒）",
    "memo.update": "改（内容/分类/子分类/排期/完成）",
    "memo.remove": "删/废弃提醒",
    "memo.remind": "提醒查询（有效/已触发）",
    "memo.wish": "心愿（查心愿/心愿排期）",
    "memo.sync": "飞书双向对账",
    "memo.batch": "批量改分类向导",
    "memo.stats": "统计总览"
  },
  "wake_map": [
    {
      "wake": "记备忘",
      "scene": "memo_add_basic",
      "category": "memo",
      "subfunction": "基础记录",
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "改备忘",
      "scene": "memo_update_basic",
      "category": "memo",
      "subfunction": "基础记录",
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "删备忘",
      "scene": "memo_delete_basic",
      "category": "memo",
      "subfunction": "基础记录",
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "备忘改分类",
      "scene": "memo_change_category_single",
      "category": "memo",
      "subfunction": "分类调整",
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "备忘改子分类",
      "scene": "memo_change_subcategory",
      "category": "memo",
      "subfunction": "分类调整",
      "state": "substring",
      "new_phrase": "改子分类",
      "key": "memo.update",
      "candidates": [
        "改子分类"
      ]
    },
    {
      "wake": "搜备忘",
      "scene": "memo_search_keyword",
      "category": "search",
      "subfunction": "基础查找",
      "state": "exact",
      "new_phrase": "搜备忘",
      "key": "memo.search",
      "candidates": [
        "搜备忘"
      ]
    },
    {
      "wake": "查备忘",
      "scene": "memo_search_alias",
      "category": "search",
      "subfunction": "基础查找",
      "state": "exact",
      "new_phrase": "查备忘",
      "key": "memo.search",
      "candidates": [
        "查备忘"
      ]
    },
    {
      "wake": "看备忘",
      "scene": "memo_get_detail",
      "category": "search",
      "subfunction": "基础查找",
      "state": "exact",
      "new_phrase": "看备忘",
      "key": "memo.detail",
      "candidates": [
        "看备忘"
      ]
    },
    {
      "wake": "按时间搜备忘",
      "scene": "memo_search_by_date",
      "category": "search",
      "subfunction": "时间查找",
      "state": "exact",
      "new_phrase": "按时间搜备忘",
      "key": "memo.search",
      "candidates": [
        "按时间搜备忘",
        "搜备忘"
      ]
    },
    {
      "wake": "查心愿",
      "scene": "memo_search_wish",
      "category": "search",
      "subfunction": "分类查找",
      "state": "exact",
      "new_phrase": "查心愿",
      "key": "memo.wish",
      "candidates": [
        "查心愿"
      ]
    },
    {
      "wake": "查打卡",
      "scene": "memo_search_checkin",
      "category": "search",
      "subfunction": "分类查找",
      "state": "exact",
      "new_phrase": "查打卡",
      "key": "memo.search",
      "candidates": [
        "查打卡"
      ]
    },
    {
      "wake": "查情绪",
      "scene": "memo_search_mood",
      "category": "search",
      "subfunction": "分类查找",
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "记提醒",
      "scene": "memo_remind_with_note",
      "category": "remind",
      "subfunction": "创建提醒",
      "state": "exact",
      "new_phrase": "记提醒",
      "key": "memo.create",
      "candidates": [
        "记提醒"
      ]
    },
    {
      "wake": "设提醒",
      "scene": "memo_remind_existing",
      "category": "remind",
      "subfunction": "创建提醒",
      "state": "exact",
      "new_phrase": "设提醒",
      "key": "memo.create",
      "candidates": [
        "设提醒"
      ]
    },
    {
      "wake": "看提醒",
      "scene": "memo_reminders_active",
      "category": "remind",
      "subfunction": "查看提醒",
      "state": "exact",
      "new_phrase": "看提醒",
      "key": "memo.remind",
      "candidates": [
        "看提醒"
      ]
    },
    {
      "wake": "查已提醒备忘",
      "scene": "memo_completed_reminders",
      "category": "remind",
      "subfunction": "查看提醒",
      "state": "exact",
      "new_phrase": "查已提醒备忘",
      "key": "memo.remind",
      "candidates": [
        "查已提醒备忘"
      ]
    },
    {
      "wake": "完成心愿",
      "scene": "memo_complete_wish",
      "category": "wish",
      "subfunction": "心愿推进",
      "state": "exact",
      "new_phrase": "完成心愿",
      "key": "memo.update",
      "candidates": [
        "完成心愿"
      ]
    },
    {
      "wake": "心愿排期",
      "scene": "memo_wish_schedule",
      "category": "wish",
      "subfunction": "心愿推进",
      "state": "exact",
      "new_phrase": "心愿排期",
      "key": "memo.wish",
      "candidates": [
        "心愿排期"
      ]
    },
    {
      "wake": "备忘录同步",
      "scene": "memo_sync_feishu",
      "category": "sync",
      "subfunction": null,
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "记心愿",
      "scene": "memo_add_wish",
      "category": "wish",
      "subfunction": "心愿管理",
      "state": "exact",
      "new_phrase": "记心愿",
      "key": "memo.create",
      "candidates": [
        "记心愿"
      ]
    },
    {
      "wake": "删心愿",
      "scene": "memo_delete_wish",
      "category": "wish",
      "subfunction": "心愿管理",
      "state": "exact",
      "new_phrase": "删心愿",
      "key": "memo.update",
      "candidates": [
        "删心愿"
      ]
    },
    {
      "wake": "改心愿",
      "scene": "memo_update_wish",
      "category": "wish",
      "subfunction": "心愿管理",
      "state": "exact",
      "new_phrase": "改心愿",
      "key": "memo.update",
      "candidates": [
        "改心愿"
      ]
    },
    {
      "wake": "记打卡",
      "scene": "memo_add_checkin",
      "category": "checkin",
      "subfunction": null,
      "state": "exact",
      "new_phrase": "记打卡",
      "key": "memo.create",
      "candidates": [
        "记打卡"
      ]
    },
    {
      "wake": "删打卡",
      "scene": "memo_delete_checkin",
      "category": "checkin",
      "subfunction": null,
      "state": "exact",
      "new_phrase": "删打卡",
      "key": "memo.update",
      "candidates": [
        "删打卡"
      ]
    },
    {
      "wake": "改打卡",
      "scene": "memo_update_checkin",
      "category": "checkin",
      "subfunction": null,
      "state": "exact",
      "new_phrase": "改打卡",
      "key": "memo.update",
      "candidates": [
        "改打卡"
      ]
    },
    {
      "wake": "记情绪",
      "scene": "memo_add_mood",
      "category": "mood",
      "subfunction": null,
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "删情绪",
      "scene": "memo_delete_mood",
      "category": "mood",
      "subfunction": null,
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "改情绪",
      "scene": "memo_update_mood",
      "category": "mood",
      "subfunction": null,
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    },
    {
      "wake": "首次使用",
      "scene": "memo_init_setup",
      "category": "init",
      "subfunction": null,
      "state": "none",
      "new_phrase": null,
      "key": null,
      "candidates": []
    }
  ],
  "domains": [
    {
      "key": "memo",
      "name_cn": "备忘类",
      "name_en": "memo",
      "subs": [
        {
          "sub_cn": "基础记录",
          "sub_fallback": false,
          "name": "create",
          "scenes": [
            {
              "id": "memo_add_basic",
              "wake": [
                "记备忘"
              ],
              "title": "添加一条备忘笔记",
              "type": "采集+回执",
              "status": "",
              "line": 52,
              "n_dims": 4
            },
            {
              "id": "memo_update_basic",
              "wake": [
                "改备忘"
              ],
              "title": "修改已有笔记",
              "type": "采集+回执",
              "status": "",
              "line": 71,
              "n_dims": 4
            },
            {
              "id": "memo_delete_basic",
              "wake": [
                "删备忘"
              ],
              "title": "删除笔记",
              "type": "采集+回执",
              "status": "",
              "line": 89,
              "n_dims": 3
            }
          ]
        },
        {
          "sub_cn": "分类调整",
          "sub_fallback": false,
          "name": "batch(单条走 update)",
          "scenes": [
            {
              "id": "memo_change_category_single",
              "wake": [
                "备忘改分类"
              ],
              "title": "修改单条笔记的顶层分类",
              "type": "采集+回执",
              "status": "",
              "line": 105,
              "n_dims": 3
            },
            {
              "id": "memo_change_subcategory",
              "wake": [
                "备忘改子分类"
              ],
              "title": "修改单条笔记的子分类",
              "type": "采集+回执",
              "status": "",
              "line": 123,
              "n_dims": 2
            },
            {
              "id": "memo_batch_change_category",
              "wake": [
                "备忘改分类"
              ],
              "title": "批量改分类(过程型 HTML 向导)",
              "type": "向导+采集+回执",
              "status": "",
              "line": 361,
              "n_dims": 4
            }
          ]
        }
      ],
      "map": {
        "old_key": "memo",
        "old_name_cn": "备忘类",
        "new_keys": [
          "memo.create",
          "memo.update",
          "memo.remove",
          "memo.batch"
        ],
        "new_keys_cn": [
          "memo.create（新建笔记（含设提醒））",
          "memo.update（改（内容/分类/子分类/排期/完成））",
          "memo.remove（删/废弃提醒）",
          "memo.batch（批量改分类向导）"
        ],
        "scenes": 6,
        "subs": 2,
        "note": ""
      }
    },
    {
      "key": "search",
      "name_cn": "查找类",
      "name_en": "search",
      "subs": [
        {
          "sub_cn": "基础查找",
          "sub_fallback": false,
          "name": "search",
          "scenes": [
            {
              "id": "memo_search_keyword",
              "wake": [
                "搜备忘"
              ],
              "title": "按关键词搜索笔记",
              "type": "查看+回执",
              "status": "",
              "line": 138,
              "n_dims": 5
            },
            {
              "id": "memo_search_alias",
              "wake": [
                "查备忘"
              ],
              "title": "搜备忘的别名(同义触发)",
              "type": "查看+回执",
              "status": "",
              "line": 158,
              "n_dims": 1
            },
            {
              "id": "memo_get_detail",
              "wake": [
                "看备忘"
              ],
              "title": "查看单条笔记详情",
              "type": "查看+回执",
              "status": "",
              "line": 172,
              "n_dims": 2
            }
          ]
        },
        {
          "sub_cn": "时间查找",
          "sub_fallback": false,
          "name": "search(timeRange)",
          "scenes": [
            {
              "id": "memo_search_by_date",
              "wake": [
                "按时间搜备忘"
              ],
              "title": "按日期范围搜索笔记",
              "type": "查看+回执",
              "status": "",
              "line": 187,
              "n_dims": 4
            }
          ]
        },
        {
          "sub_cn": "分类查找",
          "sub_fallback": false,
          "name": "search(category)",
          "scenes": [
            {
              "id": "memo_search_wish",
              "wake": [
                "查心愿"
              ],
              "title": "查所有心愿(自动带分类过滤)",
              "type": "查看+回执",
              "status": "",
              "line": 205,
              "n_dims": 3
            },
            {
              "id": "memo_search_checkin",
              "wake": [
                "查打卡"
              ],
              "title": "查所有打卡记录",
              "type": "查看+回执",
              "status": "",
              "line": 222,
              "n_dims": 2
            },
            {
              "id": "memo_search_mood",
              "wake": [
                "查情绪"
              ],
              "title": "查所有情绪日记",
              "type": "查看+回执",
              "status": "",
              "line": 237,
              "n_dims": 2
            }
          ]
        }
      ],
      "map": {
        "old_key": "search",
        "old_name_cn": "查找类",
        "new_keys": [
          "memo.search",
          "memo.detail",
          "memo.wish",
          "memo.remind"
        ],
        "new_keys_cn": [
          "memo.search（查（列表/全文/按时间/按分类过滤））",
          "memo.detail（看单条详情）",
          "memo.wish（心愿（查心愿/心愿排期））",
          "memo.remind（提醒查询（有效/已触发））"
        ],
        "scenes": 7,
        "subs": 3,
        "note": ""
      }
    },
    {
      "key": "remind",
      "name_cn": "提醒类",
      "name_en": "remind",
      "subs": [
        {
          "sub_cn": "创建提醒",
          "sub_fallback": false,
          "name": "create(remindAt)",
          "scenes": [
            {
              "id": "memo_remind_with_note",
              "wake": [
                "记提醒"
              ],
              "title": "添加笔记 + 设置提醒(两步合一)",
              "type": "采集+回执",
              "status": "",
              "line": 252,
              "n_dims": 4
            },
            {
              "id": "memo_remind_existing",
              "wake": [
                "设提醒"
              ],
              "title": "给已有笔记加提醒",
              "type": "采集+回执",
              "status": "",
              "line": 271,
              "n_dims": 5
            }
          ]
        },
        {
          "sub_cn": "查看提醒",
          "sub_fallback": false,
          "name": "remind",
          "scenes": [
            {
              "id": "memo_reminders_active",
              "wake": [
                "看提醒"
              ],
              "title": "查看所有有效提醒",
              "type": "查看+回执",
              "status": "",
              "line": 291,
              "n_dims": 2
            },
            {
              "id": "memo_completed_reminders",
              "wake": [
                "查已提醒备忘"
              ],
              "title": "查询已触发的提醒与对应打卡",
              "type": "查看+回执",
              "status": "",
              "line": 306,
              "n_dims": 1
            }
          ]
        }
      ],
      "map": {
        "old_key": "remind",
        "old_name_cn": "提醒类",
        "new_keys": [
          "memo.remind",
          "memo.create"
        ],
        "new_keys_cn": [
          "memo.remind（提醒查询（有效/已触发））",
          "memo.create（新建笔记（含设提醒））"
        ],
        "scenes": 4,
        "subs": 2,
        "note": "老 提醒类 同时喂 memo.remind（查询）与 memo.create（设提醒）"
      }
    },
    {
      "key": "wish",
      "name_cn": "心愿类",
      "name_en": "wish",
      "subs": [
        {
          "sub_cn": "心愿推进",
          "sub_fallback": false,
          "name": "wish+update(done)",
          "scenes": [
            {
              "id": "memo_complete_wish",
              "wake": [
                "完成心愿"
              ],
              "title": "把心愿标记为已完成(原子操作)",
              "type": "向导+采集+回执",
              "status": "",
              "line": 322,
              "n_dims": 3
            },
            {
              "id": "memo_wish_schedule",
              "wake": [
                "心愿排期"
              ],
              "title": "给心愿设排期日期(同步飞书 due)",
              "type": "向导+采集+回执",
              "status": "",
              "line": 341,
              "n_dims": 3
            }
          ]
        },
        {
          "sub_cn": "心愿管理",
          "sub_fallback": false,
          "name": "wish",
          "scenes": [
            {
              "id": "memo_add_wish",
              "wake": [
                "记心愿"
              ],
              "title": "快速添加心愿(自动心愿分类)",
              "type": "采集+回执",
              "status": "",
              "line": 403,
              "n_dims": 4
            },
            {
              "id": "memo_delete_wish",
              "wake": [
                "删心愿"
              ],
              "title": "删心愿(自动心愿分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 424,
              "n_dims": 1
            },
            {
              "id": "memo_update_wish",
              "wake": [
                "改心愿"
              ],
              "title": "改心愿(自动心愿分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 438,
              "n_dims": 2
            }
          ]
        }
      ],
      "map": {
        "old_key": "wish",
        "old_name_cn": "心愿类",
        "new_keys": [
          "memo.wish",
          "memo.update"
        ],
        "new_keys_cn": [
          "memo.wish（心愿（查心愿/心愿排期））",
          "memo.update（改（内容/分类/子分类/排期/完成））"
        ],
        "scenes": 5,
        "subs": 2,
        "note": ""
      }
    },
    {
      "key": "sync",
      "name_cn": "同步类",
      "name_en": "sync",
      "subs": [
        {
          "sub_cn": "（空 → 「基础」兜底）",
          "sub_fallback": true,
          "name": "sync",
          "scenes": [
            {
              "id": "memo_sync_feishu",
              "wake": [
                "备忘录同步"
              ],
              "title": "备忘录 ↔ 飞书双向对账",
              "type": "查看+回执",
              "status": "",
              "line": 381,
              "n_dims": 1
            }
          ]
        }
      ],
      "map": {
        "old_key": "sync",
        "old_name_cn": "同步类",
        "new_keys": [
          "memo.sync"
        ],
        "new_keys_cn": [
          "memo.sync（飞书双向对账）"
        ],
        "scenes": 1,
        "subs": 1,
        "note": ""
      }
    },
    {
      "key": "checkin",
      "name_cn": "打卡类",
      "name_en": "checkin",
      "subs": [
        {
          "sub_cn": "（空 → 「基础」兜底）",
          "sub_fallback": true,
          "name": "create/update(category=打卡)",
          "scenes": [
            {
              "id": "memo_add_checkin",
              "wake": [
                "记打卡"
              ],
              "title": "快速添加打卡(自动打卡分类)",
              "type": "采集+回执",
              "status": "",
              "line": 453,
              "n_dims": 3
            },
            {
              "id": "memo_delete_checkin",
              "wake": [
                "删打卡"
              ],
              "title": "删打卡(自动打卡分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 469,
              "n_dims": 1
            },
            {
              "id": "memo_update_checkin",
              "wake": [
                "改打卡"
              ],
              "title": "改打卡(自动打卡分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 482,
              "n_dims": 2
            }
          ]
        }
      ],
      "map": {
        "old_key": "checkin",
        "old_name_cn": "打卡类",
        "new_keys": [
          "memo.create",
          "memo.update",
          "memo.remove"
        ],
        "new_keys_cn": [
          "memo.create（新建笔记（含设提醒））",
          "memo.update（改（内容/分类/子分类/排期/完成））",
          "memo.remove（删/废弃提醒）"
        ],
        "scenes": 3,
        "subs": 1,
        "note": ""
      }
    },
    {
      "key": "mood",
      "name_cn": "情绪类",
      "name_en": "mood",
      "subs": [
        {
          "sub_cn": "（空 → 「基础」兜底）",
          "sub_fallback": true,
          "name": "create/update(category=情绪日记)",
          "scenes": [
            {
              "id": "memo_add_mood",
              "wake": [
                "记情绪"
              ],
              "title": "快速添加情绪日记(自动情绪日记分类)",
              "type": "采集+回执",
              "status": "",
              "line": 496,
              "n_dims": 2
            },
            {
              "id": "memo_delete_mood",
              "wake": [
                "删情绪"
              ],
              "title": "删情绪(自动情绪日记分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 510,
              "n_dims": 1
            },
            {
              "id": "memo_update_mood",
              "wake": [
                "改情绪"
              ],
              "title": "改情绪(自动情绪日记分类过滤)",
              "type": "采集+回执",
              "status": "",
              "line": 523,
              "n_dims": 2
            }
          ]
        }
      ],
      "map": {
        "old_key": "mood",
        "old_name_cn": "情绪类",
        "new_keys": [
          "memo.create",
          "memo.update",
          "memo.remove"
        ],
        "new_keys_cn": [
          "memo.create（新建笔记（含设提醒））",
          "memo.update（改（内容/分类/子分类/排期/完成））",
          "memo.remove（删/废弃提醒）"
        ],
        "scenes": 3,
        "subs": 1,
        "note": ""
      }
    },
    {
      "key": "init",
      "name_cn": "初始化类",
      "name_en": "init",
      "subs": [
        {
          "sub_cn": "（空 → 「基础」兜底）",
          "sub_fallback": true,
          "name": "init(新表无 init key)",
          "scenes": [
            {
              "id": "memo_init_setup",
              "wake": [
                "首次使用"
              ],
              "title": "初始化备忘录(首次使用引导)",
              "type": "向导+采集+回执",
              "status": "",
              "line": 535,
              "n_dims": 0
            }
          ]
        }
      ],
      "map": {
        "old_key": "init",
        "old_name_cn": "初始化类",
        "new_keys": [],
        "new_keys_cn": [],
        "scenes": 1,
        "subs": 1,
        "note": "新表 10 命令无 init key（初始化落在技能安装层）"
      }
    }
  ],
  "new_table": [
    {
      "phrase": "按时间搜备忘",
      "key": "memo.search",
      "needs": [
        "timeRange"
      ],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.search --params '{\"timeRange\":\"2026-09\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "查已提醒备忘",
      "key": "memo.remind",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.remind --params '{\"done\":false}'",
      "landing": "old_scene"
    },
    {
      "phrase": "批量改分类",
      "key": "memo.batch",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.batch",
      "landing": "no_old_scene",
      "host_scene": "memo_batch_change_category",
      "note": "老 yaml 里与单条共用 wake_word 备忘改分类；新表拆成独立短语"
    },
    {
      "phrase": "改子分类",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"id\":\"<id>\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_change_subcategory",
      "note": "老名 备忘改子分类 → 新名 改子分类（同一 scenario_id）"
    },
    {
      "phrase": "搜备忘",
      "key": "memo.search",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.search",
      "landing": "old_scene"
    },
    {
      "phrase": "查备忘",
      "key": "memo.search",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.search",
      "landing": "old_scene",
      "host_scene": "memo_search_alias",
      "note": "老 yaml 有 查备忘(别名)、SKILL.md 表 3 又写「查备忘(搜备忘别名)」→ 同一 scenario_id memo_search_alias"
    },
    {
      "phrase": "看备忘",
      "key": "memo.detail",
      "needs": [
        "id"
      ],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.detail --params '{\"id\":\"<id>\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "看提醒",
      "key": "memo.remind",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.remind",
      "landing": "old_scene"
    },
    {
      "phrase": "查提醒",
      "key": "memo.remind",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.remind",
      "landing": "no_old_scene",
      "host_scene": "memo_reminders_active",
      "note": "老 yaml 的 看提醒 同义词，新表并列收录"
    },
    {
      "phrase": "设提醒",
      "key": "memo.create",
      "needs": [
        "remindAt"
      ],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.create --params '{\"remindAt\":\"2026-10-01\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "记提醒",
      "key": "memo.create",
      "needs": [
        "remindAt"
      ],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.create --params '{\"remindAt\":\"2026-10-01\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "废弃提醒",
      "key": "memo.remove",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.remove --params '{\"mode\":\"abandon\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_completed_reminders",
      "note": "U2 待裁：新词 废弃提醒 对应 cmd_read 的 memo.remove mode=abandon；老 yaml 无此场景，暂挂「已完成提醒」"
    },
    {
      "phrase": "完成心愿",
      "key": "memo.update",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"done\":true}'",
      "landing": "old_scene"
    },
    {
      "phrase": "心愿排期",
      "key": "memo.wish",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.wish",
      "landing": "old_scene"
    },
    {
      "phrase": "记一条",
      "key": "memo.create",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.create",
      "landing": "no_old_scene",
      "host_scene": "memo_add_basic",
      "note": "口语化，同 添加笔记"
    },
    {
      "phrase": "添加笔记",
      "key": "memo.create",
      "needs": [],
      "preset": null,
      "origin": "literal",
      "in_help": true,
      "cli": "memo-cmd-read memo.create",
      "landing": "no_old_scene",
      "host_scene": "memo_add_basic",
      "note": "老 SKILL.md 章节标题「### 添加笔记」= 记备忘 的功能名"
    },
    {
      "phrase": "记心愿",
      "key": "memo.create",
      "needs": [],
      "preset": "category:心愿",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.create --params '{\"category\":\"心愿\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "记打卡",
      "key": "memo.create",
      "needs": [],
      "preset": "category:打卡",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.create --params '{\"category\":\"打卡\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "记情绪日记",
      "key": "memo.create",
      "needs": [],
      "preset": "category:情绪日记",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.create --params '{\"category\":\"情绪日记\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_add_mood",
      "note": "老子唤醒词叫 记情绪，新表按顶层分类名对齐为 记情绪日记"
    },
    {
      "phrase": "查心愿",
      "key": "memo.wish",
      "needs": [],
      "preset": "category:心愿",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.wish --params '{\"category\":\"心愿\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "查打卡",
      "key": "memo.search",
      "needs": [],
      "preset": "category:打卡",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.search --params '{\"category\":\"打卡\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "查情绪日记",
      "key": "memo.search",
      "needs": [],
      "preset": "category:情绪日记",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.search --params '{\"category\":\"情绪日记\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_search_mood",
      "note": "老名 查情绪 → 新名 查情绪日记"
    },
    {
      "phrase": "改心愿",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:心愿",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"心愿\",\"id\":\"<id>\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "改打卡",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:打卡",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"打卡\",\"id\":\"<id>\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "改情绪日记",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:情绪日记",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"情绪日记\",\"id\":\"<id>\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_update_mood",
      "note": "老名 改情绪 → 新名 改情绪日记"
    },
    {
      "phrase": "删心愿",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:心愿",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"心愿\",\"id\":\"<id>\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "删打卡",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:打卡",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"打卡\",\"id\":\"<id>\"}'",
      "landing": "old_scene"
    },
    {
      "phrase": "删情绪日记",
      "key": "memo.update",
      "needs": [
        "id"
      ],
      "preset": "category:情绪日记",
      "origin": "wake_tops",
      "in_help": true,
      "cli": "memo-cmd-read memo.update --params '{\"category\":\"情绪日记\",\"id\":\"<id>\"}'",
      "landing": "no_old_scene",
      "host_scene": "memo_delete_mood",
      "note": "老名 删情绪 → 新名 删情绪日记"
    }
  ],
  "old_scenes": [
    {
      "id": "memo_add_basic",
      "line": 52,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "基础记录",
      "wake": [
        "记备忘"
      ],
      "title": "添加一条备忘笔记",
      "type": "采集+回执",
      "status": "",
      "n_dims": 4,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_update_basic",
      "line": 71,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "基础记录",
      "wake": [
        "改备忘"
      ],
      "title": "修改已有笔记",
      "type": "采集+回执",
      "status": "",
      "n_dims": 4,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_delete_basic",
      "line": 89,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "基础记录",
      "wake": [
        "删备忘"
      ],
      "title": "删除笔记",
      "type": "采集+回执",
      "status": "",
      "n_dims": 3,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_change_category_single",
      "line": 105,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "分类调整",
      "wake": [
        "备忘改分类"
      ],
      "title": "修改单条笔记的顶层分类",
      "type": "采集+回执",
      "status": "",
      "n_dims": 3,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_change_subcategory",
      "line": 123,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "分类调整",
      "wake": [
        "备忘改子分类"
      ],
      "title": "修改单条笔记的子分类",
      "type": "采集+回执",
      "status": "",
      "n_dims": 2,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": "改子分类",
        "key": "memo.update",
        "kind": "substring",
        "candidates": [
          "改子分类"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_search_keyword",
      "line": 138,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "基础查找",
      "wake": [
        "搜备忘"
      ],
      "title": "按关键词搜索笔记",
      "type": "查看+回执",
      "status": "",
      "n_dims": 5,
      "landing": "hit",
      "keys": [
        "memo.search"
      ],
      "new_phrase": [
        "搜备忘"
      ],
      "partial": [
        "搜备忘 ⊂ 按时间搜备忘"
      ],
      "route": {
        "phrase": "搜备忘",
        "key": "memo.search",
        "kind": "exact",
        "candidates": [
          "搜备忘"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_search_alias",
      "line": 158,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "基础查找",
      "wake": [
        "查备忘"
      ],
      "title": "搜备忘的别名(同义触发)",
      "type": "查看+回执",
      "status": "",
      "n_dims": 1,
      "landing": "hit",
      "keys": [
        "memo.search"
      ],
      "new_phrase": [
        "查备忘"
      ],
      "partial": [],
      "route": {
        "phrase": "查备忘",
        "key": "memo.search",
        "kind": "exact",
        "candidates": [
          "查备忘"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_get_detail",
      "line": 172,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "基础查找",
      "wake": [
        "看备忘"
      ],
      "title": "查看单条笔记详情",
      "type": "查看+回执",
      "status": "",
      "n_dims": 2,
      "landing": "hit",
      "keys": [
        "memo.detail"
      ],
      "new_phrase": [
        "看备忘"
      ],
      "partial": [],
      "route": {
        "phrase": "看备忘",
        "key": "memo.detail",
        "kind": "exact",
        "candidates": [
          "看备忘"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_search_by_date",
      "line": 187,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "时间查找",
      "wake": [
        "按时间搜备忘"
      ],
      "title": "按日期范围搜索笔记",
      "type": "查看+回执",
      "status": "",
      "n_dims": 4,
      "landing": "hit",
      "keys": [
        "memo.search"
      ],
      "new_phrase": [
        "按时间搜备忘"
      ],
      "partial": [],
      "route": {
        "phrase": "按时间搜备忘",
        "key": "memo.search",
        "kind": "exact",
        "candidates": [
          "按时间搜备忘",
          "搜备忘"
        ],
        "ambiguous": true
      }
    },
    {
      "id": "memo_search_wish",
      "line": 205,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "分类查找",
      "wake": [
        "查心愿"
      ],
      "title": "查所有心愿(自动带分类过滤)",
      "type": "查看+回执",
      "status": "",
      "n_dims": 3,
      "landing": "hit",
      "keys": [
        "memo.wish"
      ],
      "new_phrase": [
        "查心愿"
      ],
      "partial": [],
      "route": {
        "phrase": "查心愿",
        "key": "memo.wish",
        "kind": "exact",
        "candidates": [
          "查心愿"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_search_checkin",
      "line": 222,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "分类查找",
      "wake": [
        "查打卡"
      ],
      "title": "查所有打卡记录",
      "type": "查看+回执",
      "status": "",
      "n_dims": 2,
      "landing": "hit",
      "keys": [
        "memo.search"
      ],
      "new_phrase": [
        "查打卡"
      ],
      "partial": [],
      "route": {
        "phrase": "查打卡",
        "key": "memo.search",
        "kind": "exact",
        "candidates": [
          "查打卡"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_search_mood",
      "line": 237,
      "category": "search",
      "name_cn": "查找类",
      "subfunction": "分类查找",
      "wake": [
        "查情绪"
      ],
      "title": "查所有情绪日记",
      "type": "查看+回执",
      "status": "",
      "n_dims": 2,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [
        "查情绪 ⊂ 查情绪日记"
      ],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_remind_with_note",
      "line": 252,
      "category": "remind",
      "name_cn": "提醒类",
      "subfunction": "创建提醒",
      "wake": [
        "记提醒"
      ],
      "title": "添加笔记 + 设置提醒(两步合一)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 4,
      "landing": "hit",
      "keys": [
        "memo.create"
      ],
      "new_phrase": [
        "记提醒"
      ],
      "partial": [],
      "route": {
        "phrase": "记提醒",
        "key": "memo.create",
        "kind": "exact",
        "candidates": [
          "记提醒"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_remind_existing",
      "line": 271,
      "category": "remind",
      "name_cn": "提醒类",
      "subfunction": "创建提醒",
      "wake": [
        "设提醒"
      ],
      "title": "给已有笔记加提醒",
      "type": "采集+回执",
      "status": "",
      "n_dims": 5,
      "landing": "hit",
      "keys": [
        "memo.create"
      ],
      "new_phrase": [
        "设提醒"
      ],
      "partial": [],
      "route": {
        "phrase": "设提醒",
        "key": "memo.create",
        "kind": "exact",
        "candidates": [
          "设提醒"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_reminders_active",
      "line": 291,
      "category": "remind",
      "name_cn": "提醒类",
      "subfunction": "查看提醒",
      "wake": [
        "看提醒"
      ],
      "title": "查看所有有效提醒",
      "type": "查看+回执",
      "status": "",
      "n_dims": 2,
      "landing": "hit",
      "keys": [
        "memo.remind"
      ],
      "new_phrase": [
        "看提醒"
      ],
      "partial": [],
      "route": {
        "phrase": "看提醒",
        "key": "memo.remind",
        "kind": "exact",
        "candidates": [
          "看提醒"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_completed_reminders",
      "line": 306,
      "category": "remind",
      "name_cn": "提醒类",
      "subfunction": "查看提醒",
      "wake": [
        "查已提醒备忘"
      ],
      "title": "查询已触发的提醒与对应打卡",
      "type": "查看+回执",
      "status": "",
      "n_dims": 1,
      "landing": "hit",
      "keys": [
        "memo.remind"
      ],
      "new_phrase": [
        "查已提醒备忘"
      ],
      "partial": [],
      "route": {
        "phrase": "查已提醒备忘",
        "key": "memo.remind",
        "kind": "exact",
        "candidates": [
          "查已提醒备忘"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_complete_wish",
      "line": 322,
      "category": "wish",
      "name_cn": "心愿类",
      "subfunction": "心愿推进",
      "wake": [
        "完成心愿"
      ],
      "title": "把心愿标记为已完成(原子操作)",
      "type": "向导+采集+回执",
      "status": "",
      "n_dims": 3,
      "landing": "hit",
      "keys": [
        "memo.update"
      ],
      "new_phrase": [
        "完成心愿"
      ],
      "partial": [],
      "route": {
        "phrase": "完成心愿",
        "key": "memo.update",
        "kind": "exact",
        "candidates": [
          "完成心愿"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_wish_schedule",
      "line": 341,
      "category": "wish",
      "name_cn": "心愿类",
      "subfunction": "心愿推进",
      "wake": [
        "心愿排期"
      ],
      "title": "给心愿设排期日期(同步飞书 due)",
      "type": "向导+采集+回执",
      "status": "",
      "n_dims": 3,
      "landing": "hit",
      "keys": [
        "memo.wish"
      ],
      "new_phrase": [
        "心愿排期"
      ],
      "partial": [],
      "route": {
        "phrase": "心愿排期",
        "key": "memo.wish",
        "kind": "exact",
        "candidates": [
          "心愿排期"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_batch_change_category",
      "line": 361,
      "category": "memo",
      "name_cn": "备忘类",
      "subfunction": "分类调整",
      "wake": [
        "备忘改分类"
      ],
      "title": "批量改分类(过程型 HTML 向导)",
      "type": "向导+采集+回执",
      "status": "",
      "n_dims": 4,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_sync_feishu",
      "line": 381,
      "category": "sync",
      "name_cn": "同步类",
      "subfunction": null,
      "wake": [
        "备忘录同步"
      ],
      "title": "备忘录 ↔ 飞书双向对账",
      "type": "查看+回执",
      "status": "",
      "n_dims": 1,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_add_wish",
      "line": 403,
      "category": "wish",
      "name_cn": "心愿类",
      "subfunction": "心愿管理",
      "wake": [
        "记心愿"
      ],
      "title": "快速添加心愿(自动心愿分类)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 4,
      "landing": "hit",
      "keys": [
        "memo.create"
      ],
      "new_phrase": [
        "记心愿"
      ],
      "partial": [],
      "route": {
        "phrase": "记心愿",
        "key": "memo.create",
        "kind": "exact",
        "candidates": [
          "记心愿"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_delete_wish",
      "line": 424,
      "category": "wish",
      "name_cn": "心愿类",
      "subfunction": "心愿管理",
      "wake": [
        "删心愿"
      ],
      "title": "删心愿(自动心愿分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 1,
      "landing": "hit",
      "keys": [
        "memo.update"
      ],
      "new_phrase": [
        "删心愿"
      ],
      "partial": [],
      "route": {
        "phrase": "删心愿",
        "key": "memo.update",
        "kind": "exact",
        "candidates": [
          "删心愿"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_update_wish",
      "line": 438,
      "category": "wish",
      "name_cn": "心愿类",
      "subfunction": "心愿管理",
      "wake": [
        "改心愿"
      ],
      "title": "改心愿(自动心愿分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 2,
      "landing": "hit",
      "keys": [
        "memo.update"
      ],
      "new_phrase": [
        "改心愿"
      ],
      "partial": [],
      "route": {
        "phrase": "改心愿",
        "key": "memo.update",
        "kind": "exact",
        "candidates": [
          "改心愿"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_add_checkin",
      "line": 453,
      "category": "checkin",
      "name_cn": "打卡类",
      "subfunction": null,
      "wake": [
        "记打卡"
      ],
      "title": "快速添加打卡(自动打卡分类)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 3,
      "landing": "hit",
      "keys": [
        "memo.create"
      ],
      "new_phrase": [
        "记打卡"
      ],
      "partial": [],
      "route": {
        "phrase": "记打卡",
        "key": "memo.create",
        "kind": "exact",
        "candidates": [
          "记打卡"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_delete_checkin",
      "line": 469,
      "category": "checkin",
      "name_cn": "打卡类",
      "subfunction": null,
      "wake": [
        "删打卡"
      ],
      "title": "删打卡(自动打卡分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 1,
      "landing": "hit",
      "keys": [
        "memo.update"
      ],
      "new_phrase": [
        "删打卡"
      ],
      "partial": [],
      "route": {
        "phrase": "删打卡",
        "key": "memo.update",
        "kind": "exact",
        "candidates": [
          "删打卡"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_update_checkin",
      "line": 482,
      "category": "checkin",
      "name_cn": "打卡类",
      "subfunction": null,
      "wake": [
        "改打卡"
      ],
      "title": "改打卡(自动打卡分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 2,
      "landing": "hit",
      "keys": [
        "memo.update"
      ],
      "new_phrase": [
        "改打卡"
      ],
      "partial": [],
      "route": {
        "phrase": "改打卡",
        "key": "memo.update",
        "kind": "exact",
        "candidates": [
          "改打卡"
        ],
        "ambiguous": false
      }
    },
    {
      "id": "memo_add_mood",
      "line": 496,
      "category": "mood",
      "name_cn": "情绪类",
      "subfunction": null,
      "wake": [
        "记情绪"
      ],
      "title": "快速添加情绪日记(自动情绪日记分类)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 2,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [
        "记情绪 ⊂ 记情绪日记"
      ],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_delete_mood",
      "line": 510,
      "category": "mood",
      "name_cn": "情绪类",
      "subfunction": null,
      "wake": [
        "删情绪"
      ],
      "title": "删情绪(自动情绪日记分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 1,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [
        "删情绪 ⊂ 删情绪日记"
      ],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_update_mood",
      "line": 523,
      "category": "mood",
      "name_cn": "情绪类",
      "subfunction": null,
      "wake": [
        "改情绪"
      ],
      "title": "改情绪(自动情绪日记分类过滤)",
      "type": "采集+回执",
      "status": "",
      "n_dims": 2,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [
        "改情绪 ⊂ 改情绪日记"
      ],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    },
    {
      "id": "memo_init_setup",
      "line": 535,
      "category": "init",
      "name_cn": "初始化类",
      "subfunction": null,
      "wake": [
        "首次使用"
      ],
      "title": "初始化备忘录(首次使用引导)",
      "type": "向导+采集+回执",
      "status": "",
      "n_dims": 0,
      "landing": "none",
      "keys": [],
      "new_phrase": [],
      "partial": [],
      "route": {
        "phrase": null,
        "key": null,
        "kind": "no_route",
        "candidates": [],
        "ambiguous": false
      }
    }
  ]
}
```
