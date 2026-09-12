# t227 侦察报告 · 对抗式复审 D（覆盖度与可执行性）

- 复审席位：复审员 D（只读）。被审对象 `docs/skills/skill-memo-ilife/t227-datasource-recon.md`
- 本席产物：本文件（唯一新建文件；另有一次误建 `_probe_d.py`，已当场删除，见末尾「只读声明」）
- 分工声明：**数字打假归复审员 C**，本席不重算条数；本席只判「这份施工图够不够让 `#227` 一次做对」＋「有哪些它没说的坑」
- 老侧全程只读：`D:\2Study\StudyNotes\SKILLS\备忘录\**`

---

## 1. 总评与评分

**结论：这是一份「考古质量高、施工可用性中」的报告。** 它对**老侧**的勘察几乎无可指摘（转换层、行号、字段形状、别名出处大多逐条可核，我抽查的引用基本全对），
但它有一个系统性的盲区：**它把「老侧事实源」当成了「新仓落地面」的全部**。新仓一侧（包规、依赖、tsconfig、测试管线、schema 闭集细节、兄弟票归属）几乎没被读，
而这些恰恰是 `#227` 一开工就会撞上的东西。

| 维度 | 得分 | 扣分点名 |
|---|---|---|
| **覆盖度** | **62 / 100** | ① 漏掉包内 `AGENTS.md` 的 **350 行告警线**（本包最大风险，产物必然超线）；②「只有 4 处源、没有第五处」被证伪，至少 **6 处**事实源被漏；③ `prompt`/`result` 的影子强制门 `validate_scenarios.py` 全篇未提；④ `types` 白名单契约（老侧 `schema.md:14`／`validate_scenarios.py:22-25` 七值）全篇未提；⑤ 未读「已裁完的兄弟票」`t223-template-contract.md`／`t234-cli-inventory.md`／`t224-decision-draft.md`，而票面点名要消费它们；⑥ 老 `SKILL.md:1135-1141`「HELP HTML 必须 5 条」页面级验收清单未列；⑦ `memo_render.py:583-597` 的 6 个顶层键只取其值，未列行号 |
| **可执行性** | **58 / 100** | ① **`aliases` 无落点**：报告自己承认（B.6／E.19／F.10）「全仓三个先例都没有这个位」，`#227` 拿不到决定就无法落第一名字段；② **场景数没有唯一确定答案**：E4 断言 `scenes: 30`、E11 建议把批量场景改主词为 `批量改分类`，两件事放一起就是「29 唯一唤醒词 vs 30 场景」直接冲突，而 C.1 说「追认前不要默选」；③ 「三处合一」在 E8 只剩「照 A.7」四个字，而 A.7 的出处栏与「三处」自相矛盾；④ **E6 只点名 10 条要补中文名**，与硬规矩 5 的「22 条补正确中文名」对不上（E9 的「10」是剔除后的归一化计数，不是补名清单）；⑤ 三条关键行号偏差（`memo_render.py:527-597` 实为 `:527-599`；`wakewords.ts:16` 实为 `:13`；一个关键结论只写在 F 区、没进 E） |
| **与硬规矩一致性** | **72 / 100** | 规矩 1／2／3／7／8 落得干净（明确、可执行、有反例）；规矩 4／5 落了但落错了颗粒度；**规矩 6「三处合一」实质未落**（老 `SKILL.md` 独有的 3 条别名在 A.7 里被归到「新表」那一处，不是「SKILL.md 两张表」）；规矩 8 落对了（E5「别按场景出现顺序重建组」正是 UI 层不逐字比对的正面表述） |

**一句话给编排会话**：报告可以当**老侧事实的字典**用，**不能当 `#227` 的开工简报**用。必须补三件决定（`aliases` 落点、`备忘改分类` 归属、超线拆法）＋ 一份新仓落地前置清单，才够一次做对。

---

## 2. 作业 1–8 逐条作答

### 作业 1：8 条硬规矩有没有逐条落进 §6（`:579` 起）？

逐条点名（**结论都在这一行里，不含糊**）：

| # | 硬规矩 | §6 落点 | 判定 |
|---|---|---|---|
| 1 | HELP 是完整体、不许写缺失标记 | E12（`:592`） | **够**。「别为『新表暂无唤醒词』写任何缺失标记」＋「老 30/30 空串」可直接执行，还额外给了 `status` 枚举只有 `''`／`'【待开发】'`（E20） |
| 2 | 命令不上页面 | E6（`:586`）＋ E7（`:587`） | **够但有边界没钉**。E6 说「逐字搬 `prompt`，然后按 A.5.1 的 8 条改」，做法清楚；但**没说这 8 条是穷举**。报告自己的 A.5.2（`:180-194`）另列 7 条实现细节（`notes.due`／`note`／`task_guid`／`tasklist GUID`／`Cron`），F.3（`:613`）承认「U6 只立了『命令不上页面』，没立『实现细节不上页面』」，却只在 F 区留了一句「建议票 8 一并追认」。`#227` 读 E 区会以为 8 条就是全部 → **会漏清** |
| 3 | HELP 自身唤醒词不上页面 | E13（`:593`）＋ E8 后半（`:588`） | **够**。「老 30 条里本来就没有，资产也不许新加」＋「`aliases` 里同样不放」两头都堵了，且与 `SKILL.md:1141` 同向 |
| 4 | 一场景一唤醒词、4 条情绪孪生不各占一行 | E8（`:588`）间接 | **不够**。E 区**一个字都没写「4 条情绪孪生不各占一行」**，只在 §2 C.3（`:517-521`）和 A.7 表格里隐含。更要命的是**没裁主词方向**：`票 6 U4` 的原话是「**老词为主名、新词进 `aliases`**」，落到这 4 条就是「`wake_word` ＝ `记情绪`／`查情绪`／`改情绪`／`删情绪`，`…情绪日记` 进 `aliases`」；但报告 A.7 表（`:250`）的「那处独有信息」栏只写「SKILL.md 正文用新名，yaml 主词是 `记情绪`」——**没给出「主词取哪个」的祈使句**。`#227` 若照 `SKILL.md:302`（「分类子唤醒词…情绪日记」）把主词设成 `记情绪日记`，就违反了规矩 4 |
| 5 | `editable_fields` 清洗后进资产 | E9（`:589`）＋ E20（`:600`） | **一半**。E9 的算式对（`76 − 12 = 64`、「别按 35 条找」、布尔条有硬门），**但补中文名的清单只点名 10 条**。规矩 5 与票面 `t227-body.md:26` 都写「**22 条补正确中文名**」。E9 的「10 条」是「去重后非 `html` 的回落条数」，**不是**要补名的条数。24 条不补名的场景在 E 区**没有清单指向**（只有 §2 A.8 的 76 行表） |
| 6 | `aliases` 源头＝三处合起来 | E8（`:588`） | **不够，且实质未落**。E8 只有「`aliases` 12 条照 A.7 落」。而 A.7 的「出处」栏里 **5 条（#8–#12）写的是「新表 `wakewords.ts`」**，不是「21 条 CLI 子命令」；另 7 条来自老 yaml＋老 `SKILL.md`。**「三处」里的「21 条子命令」这一处，在别名表里贡献 0 条**（详见作业 2）。`#227` 照 A.7 落，结论上不会错 12 条，但**会以为自己已经做了「三处合一」**，从而漏掉真正的第三处 |
| 7 | 二级组 id 通式 1 起 | E4（`:584`） | **够**。「照 A.9 的 13 行表」＋「不要照抄 `memo_render.py:559` 的 0 起」＋ fail-closed 的 `EXPECT` 四元组，可直接抄进生成器 |
| 8 | UI 层不与老 HELP 逐字比对 | E5（`:585`） | **够**。E5「二级组按 `label` 认身份、按书写序定组内序；别按场景出现顺序重建组」，正是「资产侧逐字对齐、页面侧不逐字对齐」的可操作表述；报告中反复强调的「30 场景／13 二级组／76 字段」也都是 UI 层断言，与规矩 8 相容，**不冲突** |

**一句话**：8 条里 **3 条够（1／3／7／8 中的四条）**、**2 条半够（2／5）**、**2 条不够（4／6）**。

---

### 作业 2：`aliases` 三处合一真的做全了吗？

**答：没有。「三处」的表述与「三处」的实际贡献不一致，且漏了两类来源。**

**A. 那 5 条不是来自「21 子命令」——已核实。**

A.7（`:254-258`）的 #8–#12 五条，出处栏逐条写的是：
- #8 `批量改分类` → `wakewords.ts:16`
- #9 `改子分类` → `wakewords.ts:17`
- #10 `查提醒` → `wakewords.ts:22`
- #11 `记一条` → `wakewords.ts:28`
- #12 `添加笔记` → `wakewords.ts:29`

`memo_cli.py` 的 21 条子命令（`:1544-1694`）里**没有任何一条叫 `批量改分类`／`查提醒`／`记一条`／`添加笔记`**，也没有 `alias=` 机制。我实测（grep `^def cmd_help|HELP_|alias|aliases`）：`memo_cli.py` 里 **`alias`／`aliases`／`HELP_` 零命中**。所以「21 条子命令」这一处在别名表里**贡献 0 条**。

于是票面那句因果（`t227-body.md:28`：「Init 类有唤醒词、有场景卡、有 CLI 却不在两张表里 ⇒ 资产源头必须是 yaml ＋ 三张表 ＋ 21 条子命令」）**被报告静默改写了**，而且改写后没有一句说明。

**B. Init 类「首次使用」的唤醒词进没进别名表？—— 进是进了，但报告把出处标错了。**

`完成打卡`／`初始化`／`新手` 三条在 A.7 里确实在（#1–#3），但出处栏写的是 `SKILL.md:262`／`:300`／`:700`——**都是 SKILL.md**，不是子命令。我核了 `:300`，逐字：`**首次使用**(v1.2.0 加 · **别名:初始化 / 新手** · 触发层在 SKILL.md,scenarios.yaml 只存主词 #31 Q1)`；`:320` 另有「AI 收到「首次使用 / 初始化 / 新手」均走同一初始化流程」。**结论：这三条的真正来源是「老 SKILL.md 的 yaml 外文字」，CLI 子命令只是让 Init 类被发现的线索（`init-report:1673`），不是别名的来源。** A.7 的 12 条结论本身对了，**对「三处合一」这句话是错证**。

**C. 有没有漏掉老 `SKILL.md:300` 那些 yaml 外别名（`完成打卡`／`初始化`／`新手`）？—— 没漏，但只在 A.7 里没漏，在 E 区是「照 A.7」四个字。**

E8（`:588`）逐字：「**`aliases` 12 条照 A.7 落**；HELP 自身 9 条短语一律不进；`查备忘` 不进 `aliases`」——**它点名了两条排除，却没有点出「必须包含 `完成打卡`／`初始化`／`新手`」**。这一条恰恰是票面 `:28` 明写的「只按两表建别名表会漏掉它」的高危项。E8 把这条风险交给了「照 A.7」——**对一个 12 行的表来说，这已经是可接受的**，但如果 A.7 表被下游简写成「情绪 4 条 ＋ 新表 5 条」，`初始化`／`新手`／`完成打卡` 就会整体消失。**判定：够（结论正确）／不够（没有把票面点名的风险显式复述）**。

**D. 还漏了两类来源（报告完全没提）：**

1. **`SKILL.md:302-305` 的「分类子唤醒词」块**。报告 B.2 有这一行（`:432` 引用 `:302-305`），但 A.7 的别名表里**只用到了情绪那 4 条**。`:302-305` 逐字列出 **12 条**子唤醒词：心愿 4（记/删/改/查心愿）、打卡 4（记/删/改/查打卡）、情绪 4（记/删/改/查情绪）。这一块与 A.7 表里的 `查心愿`／`查打卡`／`查情绪` 场景同形，**必须回答「它们是同一词的重复书写，还是别名」**——报告没回答。
2. **`references/examples.md`（63 行）** 有 12 条对话级用户原话→命令映射（如 `“上次记的那个关于旅行愿望的笔记是什么来着？” → search "旅行" -c wish`）。这是与 `SKILL.md:147-172` 同类但**不重叠**的样例源，`#227` 若按 F.1 的判断把口语样例排除，也应当知道还有这一份。报告未提。

**判定：作业 2 = 不够。** 12 条结论可用，但「三处合一」这个 claim 在报告里是错证的（第三处贡献 0），并且把票面点名的 Init 风险从 E 区降级成了「照 A.7」。

---

### 作业 3：情绪孪生 4 条的处理，与硬规矩 4 一致吗？最终场景卡数有没有唯一确定答案？

**A. `§C.3`（`:517-521`）怎么说的 —— 说得对，且与 U4 一致。**

逐字要点：老骨架 30 条里这 4 条**各自占一行**（实测 yaml `:238`／`:497`／`:511`／`:524`）；U4 针对的是**新表的 4 条新词**，它们**不许各占一行新场景**，应成为老 4 行的 `aliases`；结论「资产仍应是 **30 条场景**，不是 34 条」。我核过 `t222-content-reconcile.md:169-171` 逐字：「入库时这 4 条要和老场景合并成一条（一场景一唤醒词，别名进 aliases），不能各占一行」——**报告引对了**。

**B. 会不会导致 30 场景变多／变少？—— 处理本身不会；但报告的 C.1 建议会让它变成 31。**

4 条孪生合并进老 4 行 → 场景数不变（30）。**但** C.1（`:509`）建议「批量场景主词改用新表词 `批量改分类`，并把 `备忘改分类` 放进它的 `aliases`」，而 E4（`:584`）写死 `EXPECT = {..., scenes: 30, uniqueWakeWords: 29}`。老 yaml 里 `备忘改分类` 一词对两场景（我实测：`SAME_WORD_ROWS [(4, 'memo_change_category_single', '分类调整', 'memo'), (19, 'memo_batch_change_category', '分类调整', 'memo')]`，`UNIQ_WW 29`、`TOTAL_SCENES 30`）。**若采纳 C.1 的「单条保留 `备忘改分类` ＋ 批量改主词 `批量改分类`」，场景数仍是 30、唯一唤醒词升到 30** → E4 的 `uniqueWakeWords: 29` 失败；**若「把 `备忘改分类` 放进批量的 `aliases`」而单条仍留 `备忘改分类`，则同一个词同时是 A 场景的 `wake_word` 和 B 场景的别名** —— 这正是「唤醒词 → 场景」反查一对二，C.1（`:508`）自己说这会让「照账单型测试必红」。

**C. 最终资产应该有多少个场景卡？报告有没有给出唯一确定的答案？—— 给了 `30`，但它是「有条件的目标」，不是「确定值」。**

报告给 30 的地方：C.3（`:521`）「资产仍应是 30 条场景，不是 34 条」、E4（`:584`）`scenes: 30`、A.9 表（`:390-404`）逐组相加 3+3+3+1+3+2+2+2+3+3+3+1+1 = 30。**三处一致，`30` 是本报告的唯一答案。**

**但这个 30 只有在「`备忘改分类` 一词两场景的归属先被裁掉」之后才成立**，而 C.1（`:509`）自己写「落地前需票 6/票 8 追认，见 F.2」、F.2（`:611`）写「这一格是空的」。所以对 `#227` 来说：**数有了（30），但它依赖一个未裁的口径**；报告没有把「在归属未裁前，`scenes: 30` 这个断言不能写死」这句话说出来。

**判定：作业 3 = 半够。**「4 条孪生不各占一行」处理正确、数给到了；**但「主词取老词」这个祈使句缺失（作业 1 规矩 4），且 30 与 `uniqueWakeWords: 29` 在 C.1 建议下会互相打架而报告没预警**。

---

### 作业 4：`prompt_template` 去命令化 —— 8 条改写逐条判

**A. 逐条判「是否保住原意」（含「可选参数」语义）：**

| # | 场景 | 原文（逐字） | 建议改写 | 原意保住？ |
|---|---|---|---|---|
| 1 | `memo_search_keyword` | `带 --html 时生成可视化搜索结果页。` | `并生成可视化搜索结果页。` | **保住但语义收紧**。原文是**条件式**（「带 `--html` 时」＝可选），改写后变成**无条件**（「并生成…」）——用户会以为一定会出页面。**这是 8 条里的通病：把「可选开关」写成了「必然行为」** |
| 2 | `memo_get_detail` | `带 --html 时生成详情页。` | `并生成详情页。` | 同上 |
| 3 | `memo_search_wish` | `AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。` | `AI 自动按"心愿"分类过滤。` | **保住，且是 8 条里最干净的一条**：删掉的半句本就是命令对照，删后语义完整（且它顺带消掉了一处**跨场景唤醒词引用**「搜备忘」） |
| 4 | `memo_reminders_active` | `带 --html 时生成可筛选的可视化页。` | `并生成可筛选的可视化页。` | 同 #1 |
| 5 | `memo_complete_wish` | `批量场景:先 wish-complete --html 生成向导,你在 HTML 勾选 + 填打卡内容。` | `批量场景:先出一份完成向导页,你在 HTML 勾选 + 填打卡内容。` | **保住**。「你在 HTML 勾选」保留（HTML 是页面本身，不是命令） |
| 6 | `memo_wish_schedule` | `批量场景:先 wish-batch-plan --suggest-due X --html 生成向导,你在 HTML 微调。` | `批量场景:先出一份排期向导页(可带建议日期),你在 HTML 微调。` | **保住**，而且是 8 条里唯一**主动补语义**的（「可带建议日期」＝把 `--suggest-due X` 翻成人话）。**但这一条同时把三个 token 换成一个词，风险最高**，改写后 `向导` 仍与 `types` 里的 `向导` 原子同形，可接受 |
| 7 | `memo_batch_change_category` | `采纳复制 → 调多条 update-category。` | `采纳复制 → AI 逐条改分类。` | **保住**。`改分类` 与 `SKILL.md:265`／新表 `批量改分类` 是**近似词但不相同**，不构成命令 token |
| 8 | `memo_sync_feishu` | `2. 反向同步 done(飞书已完成 → 本地 complete-wish)` ＋ `带 --html 时生成同步报告页(含 11 统计字段)。` | `2. 反向同步完成状态(飞书已完成 → 本地标记完成)` ＋ `并生成同步报告页(含 11 统计字段)。` | **保住，且是必须的一条**：原文 `done` 既是 CLI 参数值也是英文状态词，改写后消歧 |

**B. 改写后是否 100% 不含命令名／`--html`／脚本路径？—— 是，我逐条扫过。**

8 条建议改写文本里没有 `memo_cli.py`、`script/`、`templates/`、任何 `--` 开关、任何 `memo.` 点号命令、任何 21 条子命令名。

**C. 改写建议本身有没有引入新命令 token？—— 没有。**

唯一的「新 token」是 #7 的 `AI`——**它是原文其他地方已用的散文词**（如 `:171` 原文就有 `AI 自动按…`），不是命令名。`向导页`／`排期向导页`／`完成向导页` 是名词短语，不是 `memo.*`。

**D. 真正的缺口不在 8 条的质量，而在「8 条是不是穷举」。**

我的实测（扫 30 条 `prompt` 的 token）命中 **8 个场景**：
`memo_search_keyword[--html]`、`memo_get_detail[--html]`、`memo_search_wish[ -c ]`、`memo_reminders_active[--html, dismiss]`、
`memo_complete_wish[--html, wish-complete]`、`memo_wish_schedule[--html, wish-batch-plan, due]`、
`memo_batch_change_category[update-category]`、`memo_sync_feishu[--html, complete-wish, due]`。

与 A.5.1 的 8 条**逐条对上**——**这 8 条对「命令 token」是穷举的。**

**但**另外三个 token 是**词形巧合**，报告没解释，`#227` 会犹豫：
- `memo_reminders_active` 命中 `dismiss`——是英文词 `dismissed` 的子串（`提醒状态`）；
- `memo_wish_schedule`／`memo_sync_feishu` 命中 `due`——是 `notes.due` 的列名（A.5.2 已列为待清项）。

**判定：作业 4 = 改写质量够（8/8 保意、0 新 token），但「可选参数」语义在 4 条（#1/#2/#4/#8 半句）里被改丢了**；`#227` 若只清 token 不看条件式，页面文案会比老 HELP 更绝对。

---

### 作业 5：`types` 的 4 原子 —— 模板行号范围是否真的覆盖？

**答：覆盖，`1656`／`1665` 都核对了，行号**逐字准确**。**

我逐行读了 `packages/base-render/assets/help-template.html`（总 2053 行）：
- `:1698` `var TYPE_DEFAULT = {` → `:1709` `};` —— **12 行，10 个词**：`采集`(1699)／`查看`(1700)／`结果`(1701)／`向导`(1702)／`批量`(1703)／`校验`(1704)／`选择`(1705)／`过程`(1706)／`回执`(1707)／`录入`(1708)。
- 报告 A.6 结尾（`:237`）说的 4 个原子 **`回执`／`采集`／`查看`／`向导` 全在其中**，**行号范围 `:1698-1709` 完全准确**。
- 报告说的「`选择` 在配色表里本来就有（`:1705`）」——**逐字对**。
- 我还核了报告 B.5 引的消费端 `:1660-1673`、`:1669-1671`：`:1669-1671` 确实是 `params: (s.editable_fields||[]).map(f => ({key:f.name, label:f.label, ...}))`，**字段名 `name/label/value/hint/required` 逐字对**。

**但报告漏了一件同源的事（这是作业 5 的真实缺口）：**

`types` 在**老侧有两道白名单**，报告一道都没提：
1. `references/schema.md:14` 逐字：「`type` …**白名单 7 值**（`采集+回执`／`查看`／`查看+选择`／`查看+选择+回执`／`向导+采集+回执`／`向导+回执`／`选择+回执`）」；
2. `script/validate_scenarios.py:22-25` `TYPE_WHITELIST` —— **8 个字面量**（比 `schema.md` 多一条 `查看+回执`），且 `:98-101` 对每个场景硬校验。我实跑 `python validate_scenarios.py` → `OK · scenarios.yaml 校验通过`，说明**这 30 条的 `type` 是守在两套白名单下的**。

新仓侧则**没有白名单**：`base-render/src/spec/help.ts:158-171` 的 `types.items` 是 `oneOf[string, {text,bg,fg}]`，**任意字符串都过**。
兄弟先例是把白名单**写在生成器里**：`gen-wake-assets.mjs:109` `const words = new Set(['采集','查看','选择','向导','回执'])` ＋ `:115` 逐条 `bad(...)`；`skill-bill/test/wake-assets.test.mjs:22` 同一份 `TYPE_WORDS` 再写一遍。

**所以 `#227` 必须自己决定：备忘录的 `types` 白名单是哪几个字、写在哪。** 报告给了「原子只有 4 个」的**事实**（对），没给**新仓该编码哪 4 个、放哪个文件**（缺）。

**判定：作业 5 = 半够。** 行号核对了，模板零改动成立；**types 白名单从老侧到新仓的迁移缺一整个环节**。

---

### 作业 6：「只有 4 处源、没有第五处」站得住吗？

**答：完全站不住。我找到至少 6 处。**

| # | 第五处（本席实测） | 它对 `#227` 的具体影响 |
|---|---|---|
| **1** | **`references/schema.md:3-32`「场景资产契约」** | ① `:5` 逐字：「场景资产 `references/scenarios.yaml` ＝ **HELP HTML 唯一事实源**(总纲 §07)」——这是「yaml 是 HELP 唯一事实源」这条原则的**正式契约出处**，报告全篇没引；② `:30` 逐字：「**禁字段**：`order`／`aliases`／`wake_words`／`wake_word_index`」——**直接与 U4=A「新词进 `aliases`」对冲**：老侧明文把 `aliases` 定义为**禁止字段**，新侧要落 `aliases`，这是一次**有意的契约反转**，必须在生成器头注里声明；报告没提。③ `:31` 逐字：「`wake_word` 允许多对一（`备忘改分类` 单条+批量）」——`#227` 若把「唯一唤醒词」当硬约束，会在这里被证伪 |
| **2** | **`script/validate_scenarios.py`（161 行）** | 影子强制门（`test_help.py` 与 `memo_render.py` 渲染前共用）。它强制 `#227` 必须处理的四件事：① `FORBIDDEN_FIELDS`（`:28`）禁 `aliases` 等 4 键；② `PROMPT_FORBIDDEN`（`:31-32`）＝ `["memo_cli.py","memo.db","templates/","script/","SELECT ","INSERT ","UPDATE ",".py","ERR_"]`，**校验对象是 `prompt + result`**（`:124`）——即老侧对 `prompt` 的**实门比对 `SKILL.md:1128` 的口头契约更严**；③ `:129-131` 禁 `<中文占位符>`（我实测当前 30 条 `CN_ANGLE []`，是干净的，但 `SKILL.md:416` 有 `<实际路径>` 写法，若有人把 SKILL.md 的话搬进新 prompt 就会踩中）；④ `:117-118` `subfunction` 必须 ≤24 字、`dependencies` 存在则非空。**报告一字未提这个文件**，而它决定了「逐字搬 `prompt` 到底要满足什么」 |
| **3** | **`SKILL.md:1135-1141`「HELP HTML 必须（§07 §5）」5 条** | 逐字：展示除 HELP 自身外**全部 29 个业务唤醒词**／每场景独立复制按钮／**5 状态 fallback**／移动端＋PC 适配／**不展示 HELP 唤醒词自身**。这是**页面级验收清单**，`#227` 的完成判据「与老骨架逐字对得上」**盖不到它**。报告 B.2 有这一行段（`:435`）但没列进「独有信息」的效力层级 |
| **4** | **`references/scenarios.yaml` 的 `skill:`／`version:` 顶层键** | 我实测 `GLOBALS {'skill': '备忘录', 'version': '1.3.0'}`。**yaml 自己就带 `version: 1.3.0`** —— 这直接影响 U11／V3「`version` 取 `1.3.0`」：报告 A.0／B.4 把这个值归到 `memo_render.py:583-589` 的硬编码，**没指出 yaml 顶层也有一份**。三处同值（`_meta.json:3`／yaml 顶层／`memo_render.py`）＋ `docs/adr/0001-version-sot.md` 已裁「**SKILL.md 是版本号单一事实源**，`_meta.json` 是镜像」——`#227` 若在生成器里硬编码 `1.3.0`，就是落了第四份 |
| **5** | **`tests/`（33 个 `test_*.py`）** | 硬断言表。`tests/test_help.py:5` 逐字：「场景数量 ＝ SKILL.md 唤醒词数（**28 ＋ 备忘改分类批量重复 ＝ 29**）」；`:120-134` `test_29_wake_words_minimum`＋`assert len(counter) == 29`；`:139-150` 唤醒词表与 scenarios 双向一致；`:163-171` 每个合法唤醒词都能扫到场景。**这组断言与 `#227` 要写的新断言应该同源**，报告没引用任何一条。另：`SKILL.md:290-292` 逐字声称的守护文件 **`tests/test_html_trigger_coverage.py` 在盘上不存在**（实测同名文件 0 个，`html`/`help` 相关只有 `test_help.py`／`test_html_delivery.py`／`test_html_delivery_checklist.py`／`test_html_user_manual.py`／`test_memo_html_surrogates.py`）——**老侧的「防文档裂缝守护」已经断了**，报告 B.2（`:431`）引了这句话却没发现文件不存在 |
| **6** | **`references/examples.md`（63 行）** | 12 条对话级「用户原话 → 命令」样例（含「上次记的那个关于旅行愿望的笔记是什么来着？」这类长句）。与 `SKILL.md:147-172` 的 42 条**不重叠**，是别名/口语样例的第二来源。报告未提 |
| **6b** | **仓内已裁票的产物（同图兄弟）**：`t223-template-contract.md`（38 235 B）／`t234-cli-inventory.md`（48 421 B）／`t224-decision-draft.md`（25 171 B）／`t225-structure-design.md`（37 567 B）／`t226-decisions.html`（32 487 B） | 票面 `t227-body.md:11／:28` **明写**「并入票 3（`#223`）的实测，逐字出处见 `t223-template-contract.md`」「子命令全集见 `t234-cli-inventory.md`」。报告引用票面结论却**从不引这三份文件**，等于让 `#227` 少读三份已裁定的上游件 |

**判定：作业 6 = 报告的核心 claim 被证伪。** 「没有第五处」应改写为「老技能目录里至少还有 6 处会影响本资产内容／别名／白名单／版本的事实源」，且其中 **`schema.md:30` 的「禁 `aliases`」与 `validate_scenarios.py` 是必须先看的**。

---

### 作业 7：`t222-content-reconcile.md` 当验收基准可用性 —— §5「一半能，一半不能」对不对？

**A. 行号范围我逐段核过，D.1 的表基本准确。**

实测（`Select-String '^#{1,3} '`＋逐段读）：

| 报告说 | 实测 | 判定 |
|---|---|---|
| `:100-125`（表体 `:102-121`，18 数据行） | §2.1 标题 `:100`；表头 `:102-103`；数据 `:104-121`（**18 行**）；`:123-125` 歧义注 | **对** |
| `:127-149`（表体 `:132-145`，12 数据行） | §2.2 标题 `:127`；`:129-130` 口径声明；表头 `:132-133`；数据 `:134-145`（**12 行**）；`:147-149` 小结 | **对** |
| `:151-174`（表体 `:153-164`，10 数据行；`:166-171` 拆两类） | §2.3 标题 `:151`；表头 `:153-154`；数据 `:155-164`（**10 行**）；`:166-171` 拆分 | **对** |
| §3.1 `:189-201`（8 域 ＋ 合计行） | 标题 `:189`；表头 `:191-192`；数据 `:193-200`（8 行）＋ `:201` 合计 | **对** |
| §3.1 13 二级组 `:203-223`（13 行；`:221-223` 兜底说明） | 标题 `:203`；表头 `:205-206`；数据 `:207-219`（**13 行**）；`:221-223` 说明 | **对** |
| §4C `:263-294`（表体 `:268-274` ＋ `:278-289`） | 标题 `:263`；三层表头 `:268`；**数据 `:270-274`（5 行）**；命令表 `:278-289`（10 行）；`:291-294` 注 | **范围对，但「表体 `:268-274`」把表头 `:268-269` 算进去了**（数据是 `:270-274`）。小瑕疵，不影响使用 |

**B. 「一半能、一半不能」这个判断对不对？—— 方向对，但「能」的那一半估高了。**

D.2（`:562-575`）列的「不能」四条我复核后**全部成立且更严重**：
- 「不比对仓内资产」——**是**，三张核心表两侧都是「老骨架 ↔ 新表」，**零个资产列**；
- 「非机器可读」——**是**，`:100-174`／`:189-294` 全是 Markdown 表格 ＋ 散文；
- 「四样东西没有对应列」——**是**，我在 D.1 里逐段确认：无 `prompt_template` 文本列、无 76 条明细（只有 `n_dims`）、无 `aliases` 清单（只有 `old_aliases_not_in_yaml` 原始串）、无二级组 `id`（只有 `sub_cn` 名字）；
- 「`:138` 有一格是空的」——**是**，逐字「…老 `备忘改分类` 该归单条还是批量，**票 6 裁**」；票 6 `U3=A` 只答「不额外标记无唤醒词」，**没补这一格**。

**但它漏了第一条「不能」，而这条是最要命的：**

**D.1 的计数表是「老骨架现状」的快照，它与 C.1 的建议不相容。** `:191-201` 的「场景数」列合计 30、`:205-219` 每组场景数（基础记录 3／分类调整 3／…），都建立在「`备忘改分类` 一词两场景、`memo_batch_change_category` 在 `分类调整` 组末尾」这个现状上。C.1 一旦改主词、或 `#228` 按「新表 28 条」把某一场景并走/新开，**这两张表的每一格都要重算**——而 `t222-content-reconcile.md` 是**已关票的冻结文档**，不能改（`#222` 已关）。**所以它不是「一半能用」，而是「能用作方向性核对清单，不能用作任何计数断言的上游」。**

**C. 若 `#227` 要机器断言「与票 2 的对账表双向对齐」，具体该断言什么、用哪个行号范围？**

**可断言的（建议直接写成测试）：**
1. **老侧方向**：`WAKE_ASSETS.length === 30`（`:201` 合计 30）、`new Set(wake_word).size === 29`（`:147` 小结／`test_help.py:134`）；
2. **逐字命中集合**：`:104-121`（18 行）逐行取「老唤醒词」列，断言这 18 个词在资产 `wake_word ∪ aliases` 里**逐个命中**；
3. **无落点集合**：`:134-145`（12 行）逐行取「老唤醒词」列，断言这 12 个词**也逐个存在**（`U1/U2/U3=A` 明确不标缺失 ⇒ 资产里必须有），并断言 `status` 全为 `''`；
4. **结构计数**：`:193-200` 的 8 行域顺序 ＋「二级组数」列 8 个值（2/3/2/2/1/1/1/1）断言 `WAKE_GROUPS` 逐域对齐；`:207-219` 的 13 行断言 13 个二级组 `label` 与组内场景 id **逐序**一致；
5. **兜底 4 处**：`:216-219` 断言 `subgroups[].label === '基础'` 恰好 4 处（sync/checkin/mood/init）；
6. **新表方向**：`:155-164`（10 行）断言这 10 条新表短语**都能在资产 `wake_word ∪ aliases` 里找到**；`:166-168` 的「真新增 6」与 `:169-171` 的「改名孪生 4」分别断言两类归属；
7. **行号范围**：方向 1–3 用 **`:104-145`**，结构计数用 **`:193-219`**，归属用 **`:270-289`**，新表反向用 **`:155-171`**。**不要**用 `:191-201` 的「合计」行做断言源（见上，会随 C.1 漂移）。

**判定：作业 7 = 半够。** D.1 的行号与 D.2 的四条「不能」都对；**「一半能」高估了**——`t222-content-reconcile.md` 只能当**方向性核对清单**，所有**计数**必须由 `#227` 自己从老 yaml 现算（`SKILL.md:1113` 的老流程本来就是每次现读 yaml）。

---

### 作业 8：报告没写、但 `#227` 一定会撞上的坑（找 6 条，每条给证据）

**坑 1（最大）：本包有 350 行告警线，而这份产物必然超线，兄弟包没有这条约束。**

- 证据：`packages/skill-memo-ilife/AGENTS.md` 逐字：「**告警线＝350 行。数法：LF 口径，只数 `\n`。**」「范围：本包 `src/**/*.ts` 与包内 `scripts/*.mjs`。不算：`templates/*.html`（页面模板）、`SKILL.md`、`test/*.mjs`、`dist/`」。超线触发 `structure.md` 必报五步的**第四步**（当场报「已超线，需要根据规则进行重构。」＋ 拆法）。
- 我实测：`packages/skill-memo-ilife/src/**` 当前**最大文件 63 行**（`render/html.ts`；`help/lookup.ts` 43、`policy/wakewords.ts` 59）。
- 兄弟包的产物规模：`packages/skill-schedule/src/help/scenes/help-assets.ts` = **2198 行**；`packages/skill-bill/src/triggers/wake-assets.ts` = **986 行**。备忘录 30 场景 ＋ 76 字段 ⇒ 乐观估计 **600–900 行**，**必然超线 2 倍以上**。
- 我扫了全仓：**只有 `packages/skill-memo-ilife/AGENTS.md` 和 `packages/skill-chef/AGENTS.md` 有「告警线」这条**（`Select-String '告警线' packages\*\AGENTS.md` 只命中这两个），bill／schedule／calorie 的 AGENTS.md 里没有。
- **报告 B.5／B.7 只照 `skill-schedule` 的先例建议「产物照 `src/help/scenes/help-assets.ts`」，一句话没提本包这条规矩。** `#227` 照抄先例会当场触发必报五步第四步，且**没有任何拆法指引**。

**坑 2：`base-paint` 不是本包依赖，出口层第一行 import 就编译失败。**

- 证据：`packages/skill-memo-ilife/package.json` 的 `dependencies` **只有** `{"base-link-core": "^0.3.0"}`；兄弟包都是两份：`skill-bill` = `{base-link-core, base-paint}`、`skill-schedule` = `{base-link-core, base-paint}`。
- `packages/skill-memo-ilife/node_modules/` 里只有 `base-link-core` 一个 junction（实测 `Get-ChildItem … | Where Name -like 'base-*'` → 只有 `base-link-core`）。
- `tsconfig.base.json` **没有 `paths` 映射**（实测只有 `target/module/moduleResolution/strict/...`），`packages/skill-memo-ilife/tsconfig.json` 只 extends 它 ⇒ 模块解析走 node_modules ⇒ **`import { renderHelpShellHtml } from 'base-paint/help-shell'` 会 `TS2307 Cannot find module`**。
- **报告 B.5（`:466`）把 `renderHelpShellHtml` 当既有出口引用，D 区／F 区都没提依赖缺失。** `#227` 必须先改 `package.json` ＋ 跑 `pnpm install` ＋ 提交 lockfile。

**坑 3：包级 `pnpm test` 只跑一个 scaffold 文件；新用例必须靠根 `pnpm test` 才被发现。**

- 证据：`packages/skill-memo-ilife/package.json` `"test": "node --test ../../test/scaffold.test.mjs"`——**只跑仓根那一个文件**，`packages/skill-memo-ilife/test/*.test.mjs` 一个都不跑。
- 仓根 `package.json` `"test"` 的 glob **包含** `"packages/skill-memo-ilife/test/*.test.mjs"` ⇒ 根 `pnpm test` 能跑到。
- 我实测 `packages/skill-memo-ilife/test/` **目录不存在**（`src` 全树 19 个文件，无 `test/`）。
- **报告 E16（`:596`）说「照 `skill-bill/test/wake-assets.test.mjs` 的形」造三份对账，E17 说产物入仓，但没说新测试要落在哪、由哪个命令跑。** `#227` 若在本包 `test/` 建文件后只跑 `pnpm -C packages/skill-memo-ilife test`，会误以为「测试全绿」（其实一个都没跑）。

**坑 4：生成器的「非纯搬运」机制报告只提了两处，实际是 `#227` 的成败关键。**

- 证据：`packages/skill-bill/scripts/gen-wake-assets.mjs:15-18` 文件头逐字列**三处非纯搬运**：① `ADDED_SCENES`＝现 `WAKE_TABLE` 比老 HELP 多出的 3 条；② 形状断言 fail-closed；③ 4 条 HELP 短语由 `HELP_WAKE_WORDS` 从口径层 `WAKE_TABLE` 派生。`:120-133` `withAddedScenes()` 把新增场景**接到既有二级组末尾**（`sub.scenes.push`），`:125` 撞名即 throw。
- 而 `skill-bill/test/wake-assets.test.mjs:5` 逐字：「**本票新增的 3 条**」、`:27` `const ADDED_IDS = new Set(['write_record','query_bills','query_bill_detail'])`、`:38` `legacy = WAKE_ASSETS.filter(s => !ADDED_IDS.has(s.id))`、`:44` **`LEGACY_DIGEST`（SHA-256）只锁老条目**，注释逐字：「摘要只覆盖老条目：新增 3 条不在其中（改新增条不隐瞒老条目漂移）」。
- **备忘录这侧，票 2 认定「新表 28 条里 10 条老骨架没有」（`t222-content-reconcile.md:151-164`），其中「真新增 6」。** `#227` 若照 bill 先例，就必须有 `ADDED_SCENES` 等价物 —— **但报告全篇没有这个词**，只在 E11 处理了其中一条（`备忘改分类`），F.4（`:615-616`）把另一条（`废弃提醒`）挂起、F.8（`:622`）把 `help_only` 9 条挂起、E15（`:595`）说 `memo.stats` 不展。
- 后果：**`#227` 两条路都会错**——(a) 只搬老 yaml ⇒ 新表多出的词整体消失，票面「与票 2 对账表双向对齐」必红；(b) 把 10 条都塞进去 ⇒ 场景数 ≠ 30，`EXPECT` 与 `E4` 自相矛盾。**报告必须给出「新增条目清单 ＋ 落点 ＋ 摘要是否覆盖它们」这三件事。**

**坑 5：老 yaml 有两个顶层键（`skill`／`version`），且版本号有 ADR 已裁。**

- 证据：我实测 `yaml.safe_load` 的顶层键 = `['categories','scenarios','skill','version']`，值 `{'skill': '备忘录', 'version': '1.3.0'}`。
- `docs/adr/0001-version-sot.md` 逐字：「备忘录 skill 当前在 `_meta.json`、`SKILL.md`、`CHANGELOG.md` 三处记录版本号…**决定以 `SKILL.md` 为 SoT，`_meta.json` 为镜像**」。
- 三处同值：`_meta.json:3` `"version": "1.3.0"`／yaml 顶层 `version: 1.3.0`／`memo_render.py:583-589` 硬编码。
- **报告 A.0／B.4／E15 只把 `1.3.0` 归到 `memo_render.py` 硬编码**，`SKILL.md` 的代码块也写 `version:1.3.0`。`#227` 若在生成器里写死 `1.3.0`，等于在已裁「SKILL.md 是 SoT」的前提下**新落第四份副本**，且未来 `SKILL.md` 升版时资产不跟。

**坑 6：报告「没有第五处」的直接后果——老侧有一条**已断的守护**，`#227` 会以为自己继承了它。**

- 证据：`SKILL.md:290-292` 逐字：「`tests/test_html_trigger_coverage.py` 扫描 SKILL.md + 本表,确保所有 29 个唤醒词(含 HELP)在本表出现。改 SKILL.md 时自动验证。」
- 实测 `D:\2Study\StudyNotes\SKILLS\备忘录\tests\` 下**无此文件**（`Get-ChildItem -Filter '*.py' | Where Name -match 'cov|trigger|html|help'` → 只有 `test_help.py`／`test_html_delivery.py`／`test_html_delivery_checklist.py`／`test_html_user_manual.py`／`test_memo_html_surrogates.py`）。
- 也就是说：**「29 个词在本表出现」这条守护在老侧已经不存在**，`test_help.py:5`／`:134` 的 29 是另一条链。报告 B.2（`:431`）原样引了 `:290-292` 却当作有效守护 —— `#227` 若照它写「与老守护对等」的断言，会锚在一个不存在的文件上。

---

## 3. 缺口清单（最重要产出）

**格式：缺什么 → 会害 `#227` 怎么错 → 证据**

1. **缺本包 350 行告警线** → 产物 600–900 行，当场触发 `structure.md` 必报五步第四步，且无拆法指引，`#227` 会照抄 2198 行的 schedule 产物 → `packages/skill-memo-ilife/AGENTS.md`「告警线＝350 行」；本包最大源文件 63 行；schedule 产物 2198 行／bill 产物 986 行
2. **缺 `base-paint` 依赖前置** → 出口层 `import 'base-paint/help-shell'` 编译失败（TS2307），`#227` 会以为只是写资产，实际要先改 `package.json` ＋ `pnpm install` → `packages/skill-memo-ilife/package.json` 只有 `base-link-core`；node_modules 只有该 junction；`tsconfig.base.json` 无 `paths`
3. **缺「包级 test 只跑 scaffold」提示** → 新对账测试跑不到，`#227` 误判绿灯 → `package.json` `"test": "node --test ../../test/scaffold.test.mjs"`；仓根 `test` glob 才含本包 `test/*.test.mjs`；本包 `test/` 目录不存在
4. **缺新增条目（`ADDED_SCENES` 等价物）施工口径** → 要么新表 10 条整体消失（票面双向对齐必红），要么场景数 ≠ 30（`EXPECT` 自相矛盾） → `gen-wake-assets.mjs:15-18`／`:120-133`；`skill-bill/test/wake-assets.test.mjs:5`／`:27`／`:38`／`:44`（`LEGACY_DIGEST` 只锁老条目）；`t222-content-reconcile.md:151-164`
5. **缺 `aliases` 落点的裁决** → 第一名字段无处可放。报告自己说全仓三个先例都没有这个位 → 报告 B.6（`:469-483`）／E.19（`:599`）／F.10（`:624-625`）；`base-render/src/spec/help.ts:111`／`:130`／`:152` 三层 `additionalProperties:false` 且 `scenes[]` 只 7 键
6. **`E4` 的 `scenes: 30`／`uniqueWakeWords: 29` 与 `C.1` 的建议互相矛盾且未预警** → `#227` 二选一必错一个 → E4 `:584`；C.1 `:509`（改主词 `批量改分类`）；yaml 实测 `备忘改分类` 对 2 场景、`UNIQ_WW 29`／`TOTAL_SCENES 30`
7. **缺「4 条情绪孪生的主词取老词」这句祈使句** → `#227` 照 `SKILL.md:302` 把主词设成 `记情绪日记`，违反硬规矩 4（老词为主名） → `t226-body.md:42`（U4=A 原话「老词为主名、新词进 `aliases`」）；报告 A.7 `:250` 只陈述事实、无祈使句；E8 `:588` 未提
8. **`E9` 只点名 10 条补中文名，与规矩 5「22 条补正确中文名」对不上** → `#227` 只补 10 条，剩 12 条 `html` 之外的回落条留 ASCII 名上页面 → 报告 E9 `:589`（「10 条落回补中文名」）；`t227-body.md:26`／`t226-body.md:53`（V7=A「22 条补正确中文名」）；A.8 表 `:322`／`:325` 等
9. **`aliases`「三处合一」实质未落** → `#227` 以为自己做了三处，实际第三处（子命令）贡献 0 条 → A.7 出处栏 `:254-258` 五条全写「新表 `wakewords.ts`」；`memo_cli.py` 里 `alias|aliases|HELP_` **零命中**（实测）；票面 `t227-body.md:28` 说的是「21 条子命令」
10. **缺 `SKILL.md:302-305`「分类子唤醒词」12 条的处置** → 心愿/打卡/情绪三族子唤醒词与 `wake_word` 的关系不明，`#227` 可能重复建卡或漏建 → `SKILL.md:302-305` 逐字；报告 B.2 `:432` 引了行号但 A.7 只用情绪 4 条
11. **缺 `validate_scenarios.py` 这道影子门** → `#227` 不知道「逐字搬 `prompt`」还要过 `PROMPT_FORBIDDEN`（含 `result`）与 `<中文占位符>` 禁则 → `script/validate_scenarios.py:31-32`／`:124`／`:129-131`；实跑 `python validate_scenarios.py` → `OK`（当前干净）
12. **缺 `types` 白名单从老侧到新仓的迁移** → 新 schema **不校验** `types` 词表，任何字符串都过；老侧两套白名单（7 值／8 字面量）无人继承 → `base-render/src/spec/help.ts:158-171`（`oneOf[string, obj]`，无 enum）；`references/schema.md:14`；`validate_scenarios.py:22-25`；兄弟做法 `gen-wake-assets.mjs:109`／`:115` ＋ `wake-assets.test.mjs:22`
13. **缺 `schema.md:30`「禁字段 `aliases`」的对冲声明** → 老契约明文把 `aliases` 定为**禁止字段**，U4=A 要落它；不声明就是静默违反一份仍生效的契约 → `references/schema.md:30` 逐字「禁字段:order/aliases/wake_words/wake_word_index」；`validate_scenarios.py:28` `FORBIDDEN_FIELDS`
14. **缺「老守护文件已不存在」的提示** → `#227` 会锚一个不存在的守护写「对等断言」 → `SKILL.md:290-292` 声称 `tests/test_html_trigger_coverage.py`；实测该文件不存在
15. **缺 `SKILL.md:1135-1141` 的页面级验收 5 条** → 「与老骨架逐字对得上」盖不到「29 词全展示／5 状态 fallback／复制按钮／不展示 HELP 自身」 → `SKILL.md:1135-1141` 逐字
16. **缺版本号三处／四处的处置** → 生成器硬编码 `1.3.0` ＝在已裁 SoT 之外新落副本 → yaml 顶层 `version: 1.3.0`（实测 `GLOBALS`）；`_meta.json:3`；`docs/adr/0001-version-sot.md`「以 `SKILL.md` 为 SoT」
17. **`B.6` 顶层闭集表把 `meta_blocks` 漏了** → `#227` 若按该表把顶层键当 6 键处理会漏判；`meta_blocks` 恰恰是 U9 的争点 → 报告 B.6 表 `:475` 写「`skill_name`/`title`/`subtitle`/`version`/`init_banner`/`contact`/`groups`」；`help.ts:117-125` 确有 `meta_blocks`
18. **三处行号偏差** → 逐字核对会被卡 → `memo_render.py:527-597` 实为 `:527-599`（报告 `:12`／`:458` 自己写对过 `-599`）；`wakewords.ts:16` 实为 `:13`（报告 A.7 `:254`）；A.9 `:388` 引 `gen-wake-assets.mjs:37` 而 `:37` 是 `subgroup: 'write_1'` 之外的内容
19. **`E3` 的「33 个场景组」是错数** → 与同段「30 场景」冲突，`#227` 抄进注释会制造矛盾 → E3 `:583`「33 个场景组里 27 条两原子、3 条三原子」；A.6 表 `:200-231` 只有 30 行（27＋3 ＝ 30）
20. **缺「事实源在仓外 ⇒ `--check` 不可复现」的施工闭环** → CI 跑不了 `--check`，`#227` 需要一个不依赖仓外文件的替代锁（如 `LEGACY_DIGEST`） → 报告 E17／E22（`:597`／`:602`）说了事实，**没给替代方案**；兄弟用 `wake-assets.test.mjs:44` 的 SHA-256 摘要锁 + 注释「事实源在仓外，故『逐字』用摘要钉死」

---

## 4. 给 `#227` 的补充施工要点（8 条，可直接贴进开工简报）

1. **先过本包结构线，再谈产物形状。** 本包 `AGENTS.md` 告警线 ＝ **350 行**（LF 口径，管 `src/**/*.ts` 与包内 `scripts/*.mjs`；`test/*.mjs` 不算）。产物乐观 600–900 行 ⇒ **开工第一件事是定拆法**，并在交付时按 `structure.md` 必报五步第四步报一句「已超线，需要根据规则进行重构」＋理由与拆法。可选拆法：产物只导出数据常量、形状类型从 `src/render/envelope.ts` 侧导出；`editable_fields` 拆独立文件；或生成器同时产 `assets.json` ＋ 薄 `.ts`。
2. **落地前置四件（缺一件就编译不过或测试空跑）**：① `package.json` 的 `dependencies` 补 `base-paint`（照 `skill-bill`／`skill-schedule`），跑 `pnpm install` 并提交 lockfile；② 新建 `packages/skill-memo-ilife/test/` 目录；③ 新对账用例必须**同时**能被仓根 `pnpm test` 的 glob `packages/skill-memo-ilife/test/*.test.mjs` 跑到——**别只跑包级 `pnpm -C packages/skill-memo-ilife test`**（它只跑 `../../test/scaffold.test.mjs`）；④ 确认 `tsc -b` 后产物在 `dist/` 且被 `package.json` `exports` 覆盖。
3. **`aliases` 落点必须先有裁决才动手**。`SCENE_DATA_SCHEMA` 三层 `additionalProperties:false`，`scenes[]` 只 7 键（`id/title/wake_word/types/status/prompt_template/editable_fields`），**没有 `aliases`**。两条候选：(a) 资产侧 TS 接口带 `aliases`，**出口层剥离后**再传 `groups`（照 `skill-bill/src/render/helpFile.ts:151-153` 只传 schema 认识的键）；(b) 另建伴随表（照 `skill-schedule` 的 `HELP_SCENE_RESULTS`／`HELP_GROUP_NOTES` 形）。**别把 `aliases` 直接塞进 `WAKE_GROUPS` 当 `HELP_GROUPS` 用。**
4. **先在票 6／票 8 追认两件事，再写死形状断言**：① `备忘改分类` 归单条还是批量；② 4 条情绪孪生的 `wake_word` 取老词（`记情绪`／`查情绪`／`改情绪`／`删情绪`），`…情绪日记` 进 `aliases`。两件未裁前，**`EXPECT` 里的 `scenes`／`uniqueWakeWords` 不要写死**（`30 / 29` 与「主词改 `批量改分类`」不相容）。
5. **新增条目要有正式的 `ADDED_SCENES` 等价物 ＋ 单独的摘要锁。** 票 2 认定新表 28 条里 **10 条老骨架没有**（真新增 6 ＋ 改名孪生 4）。照 `gen-wake-assets.mjs:15-18` 的三处「非纯搬运」写进生成器头注；照 `skill-bill/test/wake-assets.test.mjs:27`／`:38`／`:44` 把**老 30 条**单独做 SHA-256 摘要锁、新增条**不进摘要**（否则改新增条会隐瞒老条漂移）。
6. **`prompt_template` 的清理要分两层落，并按层给清单**：① 命令/token 层 —— A.5.1 的 8 条（我已复核：**对命令 token 是穷举的**）；② 实现细节层 —— A.5.2 的 7 条（`notes.due`／`note`／`task_guid`／`tasklist GUID`／`Cron`），**这一层票 6 未裁，须追认后才清**。改写时**保住「可选」语义**（A.5.1 的 #1／#2／#4 把「带 `--html` 时」写成「并…」会把可选写成必选）；`memo_init_setup` 里的 `Python` 是给用户的安装指引，**留**。
7. **新仓必须自己编码 `types` 白名单**（新 schema 不校验）。照兄弟先例把白名单写**两处**：生成器 `assertShape` 里 fail-closed（`gen-wake-assets.mjs:109`／`:115` 的形）＋ 测试里再写一遍（`wake-assets.test.mjs:22` 的形）。备忘录白名单 ＝ 实际用到的 4 个原子 `采集`／`查看`／`向导`／`回执`；`选择` **模板认得但数据没有**，可选纳入以求与模板一致（纳入要与「票 3 说没有『选择』」的语义区分：票 3 说的是**数据**没有）。
8. **验收断言分三组，各锚各的源**：① **老侧**（老 yaml 现算，不锚冻结文档）：30 场景／29 唯一唤醒词／8 域顺序／13 二级组／4 处「基础」／76 → 64 条 `editable_fields`；② **新表**（`src/policy/wakewords.ts` 的 `WAKE_TABLE`，**注意 `WAKE_TOPS` 在 `:32-37` 动态展开，静态 16 条 ＋ 展开 12 条 ＝ 28**）：双向对账；③ **票 2 对账表**：方向性逐行核对用 `t222-content-reconcile.md:104-145` ＋ `:193-219` ＋ `:270-289`，**不要**锚 `:191-201` 的合计行（`C.1` 一改就漂）。另外**别忘页面级 5 条**（`SKILL.md:1135-1141`：29 词全展示／复制按钮／5 状态 fallback／移动端适配／不展示 HELP 自身）。

---

## 5. 给编排会话的整改清单

### 必须改（不改 `#227` 会做错）

| # | 改什么 | 为什么必须 |
|---|---|---|
| M1 | 在 §6 增一条**本包结构线**要点：告警线 350 行、产物必然超线、交付要报必报五步第四步，并给拆法 | 现报告零字提及；`#227` 照抄 2198 行的 schedule 产物会当场违规 |
| M2 | 在 §6 增**落地前置清单**：`base-paint` 依赖 ＋ `pnpm install` ＋ 新建本包 `test/` ＋ 「包级 test 只跑 scaffold、要跑根 `pnpm test`」 | 缺了第一行 import 就编译失败；缺了测试会空跑误判绿灯 |
| M3 | 在 §6 增**新增条目（`ADDED_SCENES` 等价物）**要点：新表 10 条老骨架没有，必须指定落点与摘要覆盖范围 | 不指定则「双向对齐」与「场景数 30」二者必错一个 |
| M4 | **把 A.7 的「三处合一」改写成实际的三处**：老 yaml ＋ 老 `SKILL.md` 两张表 ＋ **新表 `wakewords.ts`**；并说明 21 条子命令的**作用是「发现 Init 类」而不是「产出别名」** | 现表述与自己的出处栏矛盾，会让 `#227` 漏做真正的第三处 |
| M5 | 在 §6 增**一句祈使句**：「4 条情绪孪生的 `wake_word` ＝ 老词，`…情绪日记` 进 `aliases`」 | 硬规矩 4 的核心，现只在 §2 陈述、E 区无祈使句，照 `SKILL.md:302` 会写反 |
| M6 | **修正 `E9` 的补名口径**：明确「22 条补正确中文名」是原集合、`html` 的 12 条剔除后不补；给「剔除 12 条后仍需补名的 10 条 ＋ 布尔 1 条」的**条目清单或指向 A.8 表的读法** | 现「10 条落回补中文名」与规矩 5「22 条」字面冲突 |
| M7 | **改标题 claim**：「只有 4 处源、**没有第五处**」→ 改为「**至少 10 处**」，并补 `references/schema.md`／`validate_scenarios.py`／`tests/`／`references/examples.md`／yaml 顶层 `version`／`SKILL.md:1135-1141`／同图兄弟三份已裁票 | 该 claim 已被证伪；它是 `#227` 会据以停止搜索的唯一理由 |
| M8 | 在 §6 增**`aliases` 落点未裁 ⇒ 不要开工写形状断言**的硬阻断，并写明「两件未裁（`备忘改分类` 归属、情绪主词）前 `EXPECT` 不要写死」 | 现 E4 写死了 `scenes: 30 / uniqueWakeWords: 29`，与 C.1 建议不相容 |

### 建议改（不改也能做，但会增加返工）

| # | 改什么 | 理由 |
|---|---|---|
| S1 | 修正三处行号：`memo_render.py:527-599`（一处写 `-597`）、`wakewords.ts:13`（A.7 写 `:16`）、A.9 的 `gen-wake-assets.mjs:37` | 逐字核对会被卡 |
| S2 | 修正 `E3`「33 个场景组」→「30 个场景（27 条两原子 ＋ 3 条三原子）」 | 同段自相矛盾 |
| S3 | 修正 `B.6` 顶层闭集表：补 `meta_blocks`（`help.ts:117-125`），并注明它与 U9 的关系 | 该表被当作顶层的权威闭集传播 |
| S4 | 把 `F` 区里会影响 `#227` 正文的 3 条（`废弃提醒` 处置、`help_only` 9 条处置、42 条口语样例）**上提为 E 区的显式待办**，各带「未裁前不要自行处置」 | 现在它们埋在「查不到」区，容易被当情报而不是待办 |
| S5 | 补一句「`validate_scenarios.py` 的 `PROMPT_FORBIDDEN` 也管 `result`，但 `result` 不进资产」（`:118` 与 `:124` 的差别） | 避免 `#227` 误清 `result` 或误以为不用管 |
| S6 | 在 `§5` 补第一条「不能」：`t222-content-reconcile.md` 是**已关票的冻结快照**，计数会随 C.1 漂移，**不可作计数断言的上游** | 现「一半能」高估了可用性 |
| S7 | 补 `references/examples.md`（63 行／12 条对话样例）进 §B 事实源清单 | 与 `SKILL.md:147-172` 不重叠的第二样例源 |
| S8 | 补 `t224-decision-draft.md` 里「命名与落盘的管线归属**仍未裁**（问 1 待负责人）」这一状态 | B.5／E21 把「照 schedule 走 `src/help/scenes/help-assets.ts`」写成建议，读者可能当成已定 |

---

## 6. 只读声明

- 未改 `packages/**`、未改任何 issue、未 commit、未 `git add`、未跑任何写盘脚本。
- 老技能目录 `D:\2Study\StudyNotes\SKILLS\备忘录\` 全程只读；读过的：`SKILL.md`（分段）／`references/scenarios.yaml`（分段 ＋ `yaml.safe_load` 只读）／`references/schema.md`／`references/examples.md`／`CONTEXT.md`／`_meta.json`／`script/validate_scenarios.py`／`docs/adr/0001-version-sot.md`／`tests/` 目录清单。
- 例外如实记：本席为跑一次 `yaml` 探针，**误在仓内新建了 `docs/skills/skill-memo-ilife/_probe_d.py`**，随后**当场删除**（实测 `Test-Path` → `False`）。除本报告外**无第二处落盘**。
- 只跑过一条老侧脚本作只读校验：`cd script; python validate_scenarios.py` → `OK · scenarios.yaml 校验通过`（该脚本只读 yaml、只打印，无写盘分支）。
- 工作树里别的会话的未提交改动（`packages/skill-chef/**`、`packages/skill-schedule/**`、`packages/skill-memo-ilife/package.json`、`tooling/check-boundaries.mjs`、`pnpm-lock.yaml`、`docs/skills/**` 若干）**全程未触碰**。
- 被审报告的实测尺寸与票面记载不一致，如实记：票面称 59 209 B／610 行，本席实测 **65 717 B／647 行**（`[System.IO.File]::ReadAllBytes` ＋ `ReadAllLines`），LF 无 BOM（首 3 字节 `35,32,116` ＝ `# t`），`git status --porcelain` 显示其为 **untracked**（`??`）。本报告按**实测在盘的这一版**复审。
