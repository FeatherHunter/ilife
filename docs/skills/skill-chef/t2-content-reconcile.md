# t2 调查：内容资产对账（老 10 域／33 组／48 场景 ↔ 新表 37 条唤醒词／8 条命令）

> 票：**#210**（地图 #208 第 2 张子票）｜类型：调查。**只做事实对账，不做设计决定**，逐条给出「哪一处证据的哪一行」。
> 老技能真身（只读）：`D:\2Study\StudyNotes\SKILLS\私家大厨\`
> 老内容层的权威机器可读真相源：`.scratch/chef-help/legacy-chef-help-payload.json`（74,581 B，从老 HELP 产物抽出的 `window.__HELP__`）
> 新表真相源：`packages/skill-chef/src/policy/wakewords.ts` 的 `WAKE_TABLE`（**L12 声明、L50 闭合、L13–L49 共 37 条**）＋ `packages/skill-chef/SKILL.md` 的 HELP-AUTO 区
> 计数一律走 `JSON.parse`／`yaml.safe_load` 解析后数，不用 grep 数。

## 整改记录（2026-09-12，对抗式审查后）

> 本记录只记**改了什么、依据哪条判定**；原有**正确**内容一律保留（三源一致性、48/48 唯一、成因机制、10 域中英名附表、33 组归域、第七节草案雏形）。
> 依据：主审查 `docs/skills/skill-chef/t2-review-B.md`（23,605 B，判 **6.3/10**，硬伤 5 条）；另一席 `docs/skills/skill-chef/t2-review-A.md`（39,835 B／314 行，判 **6/10**，证伪 7 条）——**A 席报告已就位**，其 7 条证伪与 6 处须修正**一并纳入**（见下「二」）。
> 用户裁定（本报告照此改写，未另立口径）：**老 33 个组名与 48 张卡逐字保留**；13 个老组名不在新表属**老新既有漂移**（与地图 Notes 已记的 6 条载荷独有词同类），**不得为了「让新表认得出」而改写老组名**——那是改骨架，越界；新表 17 条无同名组的词**分两类落位**，不许一律当新卡片。
> 本次只改本文件；复核脚本留在 `.scratch/chef-help/t2/`（`chip-check.cjs`／`newwords-check.cjs`／`t2-fix-apply.mjs`）。**第二轮（验证判决后）的整改见文末「附 · 本轮（第二轮）整改记录」**——放在文末是为了不扰动正文行号（兄弟件 t3 按行号引本文件）。

### 一、B 席 5 条硬伤逐条

| # | 硬伤 | 怎么修的 | 落在哪 |
| --- | --- | --- | --- |
| H1 | 14 张卡的 chip 不在新表，用户照页面说即无命中；报告只按「命令层有没有分支」分类，缺第二列 | 第三节表**加第 9 列「chip 新表认不认」**（48 行逐张标 ✓ 认／✗ 不认 ※，实测 **34 认／14 不认**）；补 **3.1** 37 词页面覆盖账（**20/37** ＋ 17 词分两类）与 **3.2** 14 张卡的三选一＋代价，逐条标注**需用户裁**，并挂到**结构设计闸门票**（票 6 第一／二步，`docs/agents/structure.md:78-90`）与本记录「三、用户拍板清单」 | 第三节表末列、3.1、3.2 |
| H2 | `dimensions`（46/48 卡有内容、80 条、42 键，含畸形键 `默认不含)`）全篇零字 → 票 5 会静默丢 | 补 **`dimensions` → `editable_fields` 落法**：对应位、逐键归位四类规则、畸形键与 2 条空对象的处置、指派票与「不做的后果」，与兄弟件 `t3-template-contract.md` §3.5 口子 1 **逐条同口径**；映射口径表补该行 | 第七节（映射口径表 ＋「`dimensions` 落法」段） |
| H3 | `result`（48/48、1,970 字）全篇零字；契约 6 键没有它的位置 | 开 **「不迁清单」**：`result`／`variants`／`html.*`／`aliases_expanded_count=37`／4 条别名／`domain` 逐项写「不迁 ＋ 理由 ＋ 将来要显示该动谁」 | 第七节「不迁清单」 |
| H4 | 12 条「新表多出」只到「补进哪个组」，没有 `title`／`prompt`／`types`，约 8 条老件无可搬文案；bill 先例没引 | 补 **「新表多出条目的内容来源表」**：13 条逐条给「老卡近义触发／真新条目／参数升格不造卡」的判据与结论，并给 `title`／`prompt_template`／`types` 来源；引 `packages/skill-bill/src/triggers/wake-assets.ts:54`（「新增 3 条接在对应二级组末尾」）＋ 同文件 `:12-16`（`prompt` 按老实样重写）立规矩 | 5.1 |
| H5 | 票 6 的 5 项入参只覆盖 3 项（`subtitle`／`contact` 零字），三块可选内容零字 | 补 **「票 6 入参取值来源表」**：5 项必填 ＋ `version` ＋ 三块可选（`meta_blocks`／`init_banner`／`recommendations`）各写「取值来源／谁供／A 路是否渲染」 | 第八节（给票 6 的输入） |

**B 席 10 问逐条对号**（本记录只写「处置落在哪」，结论原文不重述）：

| # | 审查问题 | 本次处置 |
| --- | --- | --- |
| 1 | 33 组→10 域完整且互斥？ | 保留原判（33/33 硬证据）；A 席独立复核零不一致 |
| 2 | 12 条无落点卡怎么处理？ | 报告不丢卡（草案 48 张全在）；**chip 去向**由 3.2 三选一交用户裁；`status` 后果补进第八节第 3 条 |
| 3 | 12 条「新表多出」补进的位置合理吗？ | 位置保留（全落老件已有的组，33 组不被撑大）；**内容来源**由 5.1 补齐 |
| 4 | 内容不丢总账 | 第七节「不迁清单」＋ `dimensions` 落法补齐；本记录另补 `domain` 与 `html` 的口径 |
| 5 | 33 组→`subgroups` 换算交代了吗？ | 换算来源保留；补记共享模板的子组是 `<details open>` 默认全展开（`help-template.html:1784`），与老域文件另一套 `sub` 的取舍归票 6 |
| 6 | 「体检」归属冲突的可裁性 | 除归属冲突外**语义也不同**（老＝完整度评分／新 `kind=quality`＝评分口碑）→ 6.4 第 1 条给页面措辞 |
| 7 | 12 条无落点卡的 `status` 后果 | 第八节第 3 条补：标 `''` 与可用卡**外观完全相同**，只有 `【待开发】` 出徽章；老件 `status` 全空是源资产 bug，不能照抄 |
| 8 | `filter` 槽位冲突会不会教错用户？ | 6.4 第 4 条：三条筛选词实际打到菜系维度，页面措辞与归属票写明 |
| 9 | 拿它当票 5 施工图够不够？ | 5.1／第七节／第八节 三处补齐内容与取值；仍缺的机器可读项见「四、仍未闭合项」 |
| 10 | 与票 6 的接口 | 第八节「票 6 入参取值来源表」 |

### 二、行号与计数改正（就地改，不另立说法）

| 项 | 原文 | 改正后 | 依据 |
| --- | --- | --- | --- |
| `scenes/*.yaml` **文件级**引用 | 标的是 `key:` 行（真 `domain:` 行 = 该值 −1） | **78 处 −1**：第一节附表 10（脚本 `t2-fix-apply.mjs` 的 R1）＋第二节 33（R2A）＋第四节 35（R2B）；改写后同时给出键值行位置，例：`scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`） | A 席 F3 前半；用户亲手复核（`scenes/做菜.yaml`：L36 = `domain:`、L37 = `key: cook`、L38 = `name: 做菜`） |
| `scenes/*.yaml` **场景级**引用 | 原文的值**本来就是真值** | **96 处撤回误改、恢复原值**（第二节表 33 行／第三节清单 33 行／第四节 35 行；脚本 `t2-fix-scene-lines.mjs`，恢复后断言「场景级引用不合 = 0」）。**与 A 席判定不同处（本席实测推翻）**：本次亲手用 node 按 `\n` 读十份域文件（做菜 132 行／查看 172／搜索筛选 267／修改 138／历史 126／采购 90／录入 139／派生 119／开始使用 49／数据管理 107），场景级 `domain:` 真行与原报告**逐字相同**（做菜 44／62／80／98／116、查看 30／48／66／84／102／120／138／156、搜索筛选 35／53／71／89／107／125／143／161／179／197／215／233／251、修改 49／72／96／119、历史 48／74／92／110、采购 66、录入 33／51／69／87／105／123、派生 53／79／97、开始使用 33、数据管理 49／68／90）；A 席给的「−1」值在做菜上落到 `- id: "cook-1"`（L43），故判定该半条不成立 | 证据脚本 `.scratch/chef-help/t2/t2-linecheck.mjs`（逐份实测）＋ `t2-fix-scene-lines.mjs`（0 处不合） |
| 另两处硬编码引用 | `scenes/采购.yaml:8`、`scenes/修改.yaml:12` | 改为 **`:9`／`:13`**（这两处方向与上条**相反**：报告值比真值小 1） | A 席 F3 末段 |
| 第四节 35／13 | 「35＋13＝48」读起来像两个清单相加 | 改为「**同一批 48 条按有无 `domain` 拆成 35＋13**」 | A 席 F4 |
| 没有内置配色的类型值 | 5 个（含 `下载`） | **4 个**（`勾选`／`对比`／`确认`／`转移`）；`下载` 被 `转移(下载) → ['转移']` 丢掉，从不进入草案 | A 席 F6 |
| `wake_word_variants.md` 分节数 | 正文写 9 个、自检写 14 个 | 统一为 **14 个 `###` 分节** | A 席 W2 |
| 草案自检第 5 条 | 「场景 id 集合与载荷 `$.scenarios` 全等」——载荷 48 张卡**没有 `id` 键**（键名是 `scenario_id`），该断言是空集对空集恒真 | 改成**真断言**：载荷 48 条的 `scenario_id` 集合 ／ 映射后的草案 `id` 集合 ／ 两组集合两两全等 | A 席 F7 |
| 载荷 SHA-256 | `AC18FB3C87039AC7` | 实测 **`C09F11D9FFA49E6B`**（本次亲手复算，同时补实测 mtime） | A 席 §六 |
| 总账 `domain` 值域 | 未点明 | 补：聚合总账那 13 条存的是**中文名**（如 `搜索筛选`），十份域文件的场景级 `domain:` 存的是**英文 key**（如 `search`）——**两种值域不同**，下游不要当成同一种东西 | A 席 W6 |
| 映射口径表只有 7 行 | 「契约无字段位，草案不含」那行只针对别名，读者会以为被排除的只有别名 | **补齐为 13 行**：新增 `dimensions`（→`editable_fields`）／`result`／`html`／`variants`／`domain` 五行，末行改成「老件 4 条别名、`aliases_expanded_count=37`」 | A 席 W5 |

**A 席确认「不必改」而本次确实未动的**：`domain.key` 十份值 10/10 全对；「48/48 覆盖 vs 总账 13 次」的成因已说清（`场景合并.py:29-30` 的 `PATCH_FIELDS` 不含 `domain`、命中只打 9 个字段、追加才写 `domain=domain.name`，那 13 条实测全在各自组尾）；12 条无落点与 12 条多出无重复无漏；JSON 草案可解析、10／33／48、三类 id 无冲突、无 `name`／`key` 残留、复数 `types` 48/48、48 条文案对载荷零差异。

### 三、用户拍板清单（本报告只摆事实与代价，不替用户决定）

1. **14 张卡的 chip 三选一**（3.2）——挂**结构设计闸门票**（票 6 第一／二步，`docs/agents/structure.md:78-90`）与用户拍板，**需用户裁**。
2. **17 条无同名组词的落位**（3.1）：4 条 HELP 触发面变形**不造卡**；13 条按 5.1 的判据落位，其中判为「真新条目」的若干条要**新写文案**。
3. **`dimensions` 整体进不进契约**（第七节）——跨票归属（决定票 5 的资产形状、票 6 的渲染接线、本草案要不要从 6 键扩到 7 键），需由**结构设计闸门票**统一裁定。
4. **12 条无落点卡的 `status` 标法**（第八节第 3 条）：标 `【待开发】` 出徽章／标 `''` 与可用卡同貌。
5. **`体检` 的域归属与语义**、**`备份` 的口径差**、**`排除可选` 要不要补卡**（6.4 前三条）。
6. **`filter` 槽位**（6.4 第 4 条）：三条筛选词实际打到菜系维度，页面怎么写才不误导用户。
7. 4 条别名去留（6.1）、`{{菜名}}` 转不转（兄弟件 `t3-template-contract.md` §3.5 口子 2）。

### 四、仍未闭合项（诚实标注）

1. **机器可读性**：草案 JSON 仍是 6 键、不含 `editable_fields`，也没有 t185 那样的溯源字段（`prompt_source`／`origin` 等）；本报告只给**归位规则**，入库形状归票 5。
2. **`html.command_cn`／`data_source`**：本次判「不迁」（第七节不迁清单），与兄弟件 t1 整改口径一致；将来若要显示，须另立公共层票。
3. **`sub` 这一套二级分组**只在老域文件里有（48/48），本草案用的是老 33 组；两套的取舍归票 6。
4. **A 席两处未核**：`help` 是否仓里唯一现成的一级目录名、calorie 映射表格式一致性——本次未独立复核，原文的「未验」性质保留。

## 结论摘要

- **老 48 张场景卡全部能在 10 个域里定位**。三份老内容源——十份域文件 `scenes/<域>.yaml`、聚合总账 `references/scenarios.yaml`、老 HELP 产物载荷——的 `scenario_id` 集合**逐 id 相同、48/48 唯一**；卡级字段（`scenario_title`／`wake_word`／`status`）**零漂移**。老 48 条与 10 个域不是「反推」出来的猜测，**老件自己写着**。
- **「域层只写了一半」有确切的机制成因**：`scripts/场景合并.py:29` 的 `PATCH_FIELDS` 是 `(wake_word, scenario_title, dimensions, type, status, prompt, result, html, variants)`——**不含 `domain`**。命中已有卡时只打这几个补丁（`:61`），只有新追加的卡才写 `domain`（`:74`）。所以聚合总账里带 `domain:` 的恰好是**合并器追加过的那 13 条**，被合并器改写的 35 条永远拿不到域，而载荷又是从聚合总账直接展开的。
- **那 10 个域有 5 处独立出处**，且**英文名不是我起的**：它写在十份域文件的文件级 `domain.key` 里（`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`），逐条行号见第一节附表。
- 48 条对新表：**有落点 36 条**（有 20／改名 1／合并 15），**无落点 12 条**。
- 新表 37 条：**载荷有 22 条**、**仅老文档有 3 条**（`菜谱HELP`／`能做什么`／`排除可选`）、**新表多出 12 条**。
- 域内条数：做菜 5／查看 8／搜索筛选 13／修改 4／历史 4／采购 1／录入 6／派生 3／开始使用 1／数据管理 3 ＝ **48**。
- **最大的三处不确定**：① 12 条「无落点」老卡在新表里既没唤醒词也没命令分支承接，它们进 HELP 时怎么标状态——老件 `status` **48/48 全为空串**、页面恒显「✓ 可用」，而新契约只认 `''`／`【待开发】`；② `体检` 一条**域归属自相矛盾**：老骨架归「数据管理」，新命令 `chef.history.query kind=quality` 挂在「历史」下；③ 老件的 4 条别名与老件的 11 型 `type`，在通用 help 模板契约里**都没有字段位**。
- **整改后新增的三条账**（详见各节）：① 48 张卡的 chip **34 认／14 不认**，新表 37 词的页面覆盖 **20/37**（补上 13 条「老卡近义触发／真新条目」到 33/37，余 4 条是 HELP 自身触发词）——14 张不认的处置是**三选一＋代价，需用户裁**（3.2）；② `dimensions`（46/48 卡有内容、80 条、42 键）的对应位是 **`editable_fields`**（不是 chip），逐键归位四类规则见第七节；③ `result`（48/48、1,970 字）／`variants`／`html.*`／`aliases_expanded_count`／4 条别名／载荷侧 `domain` **明写「不迁」**，理由与将来去处见第七节「不迁清单」。

## 一、10 域中英名对照表（票 5／6 的能力目录名来源）

**这张表的中文列**取自用户 2026-09-12 定案的那 10 个域（老 HELP 内容资产里的一级分组说法）；**英文列不是自创**，出处是老内容资产十份域文件的文件级 `domain.key`（行号见附表 ⑤ 列）。铁律四要的「名字只许从 HELP 的现成说法里取」，两列都满足。

| 域序 | 中文域（HELP 现成说法） | 英文目录名 | 场景数 | 三处佐证（模板目录名／render_*.py／wake_word_variants.md 分节） |
| --- | --- | --- | --- | --- |
| 1 | 做菜 | `cook` | 5 | 模板目录名 无 `templates/做菜/`；`render_*.py` cooking_render.py:27 主体不同；`wake_word_variants.md` wake_word_variants.md:127 |
| 2 | 查看 | `view` | 8 | 模板目录名 无 `templates/查看/`；`render_*.py` recipe_render.py:29 主体不同；`wake_word_variants.md` wake_word_variants.md:128 |
| 3 | 搜索筛选 | `search` | 13 | 模板目录名 `templates/搜索筛选/`；`render_*.py` render_搜索筛选.py:30；`wake_word_variants.md` wake_word_variants.md:134 |
| 4 | 修改 | `update` | 4 | 模板目录名 `templates/修改/`；`render_*.py` render_修改.py:41；`wake_word_variants.md` wake_word_variants.md:144 |
| 5 | 历史 | `history` | 4 | 模板目录名 `templates/历史/`；`render_*.py` render_历史.py:41；`wake_word_variants.md` wake_word_variants.md:152 |
| 6 | 采购 | `shopping` | 1 | 模板目录名 无 `templates/采购/`；`render_*.py` shopping_render.py:30 主体不同；`wake_word_variants.md` wake_word_variants.md:156 |
| 7 | 录入 | `add` | 6 | 模板目录名 `templates/录入/`；`render_*.py` render_add.py:41；`wake_word_variants.md` wake_word_variants.md:123 |
| 8 | 派生 | `relation` | 3 | 模板目录名 `templates/派生/`；`render_*.py` render_派生.py:46；`wake_word_variants.md` wake_word_variants.md:119 |
| 9 | 开始使用 | `setup` | 1 | 模板目录名 `templates/开始使用/`；`render_*.py` render_开始使用.py:28；`wake_word_variants.md` 无分节 |
| 10 | 数据管理 | `data` | 3 | 模板目录名 无 `templates/数据管理/`；`render_*.py` render_data.py:33／render_batch_edit.py:34／render_quality_report.py:16／export_backup.py:39；`wake_word_variants.md` 无分节 |

### 附表 · 五处出处（含行号）

| 域 | ①`templates/<域>/` | ②`html.template` 路径前缀 | ③`render_*.py` | ④`wake_word_variants.md` 分节 | ⑤`scenes/<域>.yaml` 文件级 `domain.key` |
| --- | --- | --- | --- | --- | --- |
| 做菜 | 无 `templates/做菜/` | ✓ `做菜/`（48/48 卡零矛盾） | cooking_render.py:27 主体不同 | wake_word_variants.md:127 | ✓ `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`，`:38` = `name: 做菜`，`G5`） |
| 查看 | 无 `templates/查看/` | ✓ `查看/`（48/48 卡零矛盾） | recipe_render.py:29 主体不同 | wake_word_variants.md:128 | ✓ `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`，`:24` = `name: 查看`，`G3`） |
| 搜索筛选 | `templates/搜索筛选/` | ✓ `搜索筛选/`（48/48 卡零矛盾） | render_搜索筛选.py:30 | wake_word_variants.md:134 | ✓ `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`，`:29` = `name: 搜索筛选`，`G4`） |
| 修改 | `templates/修改/` | ✓ `修改/`（48/48 卡零矛盾） | render_修改.py:41 | wake_word_variants.md:144 | ✓ `scenes/修改.yaml:41` 文件级 `domain:`（`:42` = `key: update`，`:43` = `name: 修改`，`G8`） |
| 历史 | `templates/历史/` | ✓ `历史/`（48/48 卡零矛盾） | render_历史.py:41 | wake_word_variants.md:152 | ✓ `scenes/历史.yaml:40` 文件级 `domain:`（`:41` = `key: history`，`:42` = `name: 历史`，`G7`） |
| 采购 | 无 `templates/采购/` | ✓ `采购/`（48/48 卡零矛盾） | shopping_render.py:30 主体不同 | wake_word_variants.md:156 | ✓ `scenes/采购.yaml:58` 文件级 `domain:`（`:59` = `key: shopping`，`:60` = `name: 采购`，`G6`） |
| 录入 | `templates/录入/` | ✓ `录入/`（48/48 卡零矛盾） | render_add.py:41 | wake_word_variants.md:123 | ✓ `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`，`:27` = `name: 录入`，`G2`） |
| 派生 | `templates/派生/` | ✓ `派生/`（48/48 卡零矛盾） | render_派生.py:46 | wake_word_variants.md:119 | ✓ `scenes/派生.yaml:45` 文件级 `domain:`（`:46` = `key: relation`，`:47` = `name: 派生`，`G9`） |
| 开始使用 | `templates/开始使用/` | ✓ `开始使用/`（48/48 卡零矛盾） | render_开始使用.py:28 | 无分节 | ✓ `scenes/开始使用.yaml:25` 文件级 `domain:`（`:26` = `key: setup`，`:27` = `name: 开始使用`，`G1`） |
| 数据管理 | 无 `templates/数据管理/` | ✓ `数据管理/`（48/48 卡零矛盾） | render_data.py:33／render_batch_edit.py:34／render_quality_report.py:16／export_backup.py:39 | 无分节 | ✓ `scenes/数据管理.yaml:41` 文件级 `domain:`（`:42` = `key: data`，`:43` = `name: 数据管理`，`G10`） |

**读法提醒（供票 5／6 用）**：
- 这 10 个英文名与仓里现成的 8 条命令的**段名不同构**——仓里只有 5 个命令段（`recipe`／`cooking`／`shopping`／`history`／`help`），**凑不出 10 个域**。所以能力目录名只能取自域文件，不能取自命令段。
- 英文名的词形与老脚本名的词形**不完全一致**：老件用 `cooking_render.py` 而域 key 是 `cook`；`recipe_render.py` 而域 key 是 `view`；`render_add.py`／`render_data.py`／`shopping_render.py` 则与域 key 逐字相同（`add`／`data`／`shopping`）。**以域文件的 `domain.key` 为准**，这三处不一致已在附表标成「主体不同」。

## 二、老 33 组 → 10 域归属表

这 33 组就是老 HELP 页面真渲染的一级手风琴（载荷 `$.wake_words[]`，`name` 字段）。**每个组整体落在一个域里，无一组跨域**（脚本 `03-reconcile.py` 的 CHK8 断言，33/33 通过）。

| 组名（唤醒词组） | 归到哪个域 | 场景卡数 | 归属依据（逐条写出证据） |
| --- | --- | --- | --- |
| 做菜模式 | 做菜（`cook`） | 5 | `scenes/做菜.yaml:36`（文件级 `domain:`，其下 `:37` = `key: cook`）；该组 5 卡的场景级 `domain:` 行 = L44／L62／L80／L98／L116；载荷 `html.template` 前缀全部为 `做菜/` |
| 查看食谱 | 查看（`view`） | 3 | `scenes/查看.yaml:22`（文件级 `domain:`，其下 `:23` = `key: view`）；该组 3 卡的场景级 `domain:` 行 = L30／L48／L66；载荷 `html.template` 前缀全部为 `查看/` |
| 查看食材 | 查看（`view`） | 2 | `scenes/查看.yaml:22`（文件级 `domain:`，其下 `:23` = `key: view`）；该组 2 卡的场景级 `domain:` 行 = L84／L102；载荷 `html.template` 前缀全部为 `查看/` |
| 查看步骤 | 查看（`view`） | 1 | `scenes/查看.yaml:22`（文件级 `domain:`，其下 `:23` = `key: view`）；该组 1 卡的场景级 `domain:` 行 = L120；载荷 `html.template` 前缀全部为 `查看/` |
| 查看营养 | 查看（`view`） | 1 | `scenes/查看.yaml:22`（文件级 `domain:`，其下 `:23` = `key: view`）；该组 1 卡的场景级 `domain:` 行 = L138；载荷 `html.template` 前缀全部为 `查看/` |
| 查看背景 | 查看（`view`） | 1 | `scenes/查看.yaml:22`（文件级 `domain:`，其下 `:23` = `key: view`）；该组 1 卡的场景级 `domain:` 行 = L156；载荷 `html.template` 前缀全部为 `查看/` |
| 搜索食谱 | 搜索筛选（`search`） | 2 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 2 卡的场景级 `domain:` 行 = L35／L53；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选菜系 | 搜索筛选（`search`） | 2 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 2 卡的场景级 `domain:` 行 = L71／L89；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选食材 | 搜索筛选（`search`） | 2 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 2 卡的场景级 `domain:` 行 = L107／L125；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选难度 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L143；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选时间 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L161；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选炊具 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L179；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选口味 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L197；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选季节 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L215；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 筛选状态 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L233；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 查看全部 | 搜索筛选（`search`） | 1 | `scenes/搜索筛选.yaml:27`（文件级 `domain:`，其下 `:28` = `key: search`）；该组 1 卡的场景级 `domain:` 行 = L251；载荷 `html.template` 前缀全部为 `搜索筛选/` |
| 修改食谱 | 修改（`update`） | 1 | `scenes/修改.yaml:41`（文件级 `domain:`，其下 `:42` = `key: update`）；该组 1 卡的场景级 `domain:` 行 = L49；载荷 `html.template` 前缀全部为 `修改/` |
| 修改步骤 | 修改（`update`） | 1 | `scenes/修改.yaml:41`（文件级 `domain:`，其下 `:42` = `key: update`）；该组 1 卡的场景级 `domain:` 行 = L72；载荷 `html.template` 前缀全部为 `修改/` |
| 修改食材 | 修改（`update`） | 1 | `scenes/修改.yaml:41`（文件级 `domain:`，其下 `:42` = `key: update`）；该组 1 卡的场景级 `domain:` 行 = L96；载荷 `html.template` 前缀全部为 `修改/` |
| 废弃食谱 | 修改（`update`） | 1 | `scenes/修改.yaml:41`（文件级 `domain:`，其下 `:42` = `key: update`）；该组 1 卡的场景级 `domain:` 行 = L119；载荷 `html.template` 前缀全部为 `修改/` |
| 记录做菜 | 历史（`history`） | 1 | `scenes/历史.yaml:40`（文件级 `domain:`，其下 `:41` = `key: history`）；该组 1 卡的场景级 `domain:` 行 = L48；载荷 `html.template` 前缀全部为 `历史/` |
| 查看历史 | 历史（`history`） | 1 | `scenes/历史.yaml:40`（文件级 `domain:`，其下 `:41` = `key: history`）；该组 1 卡的场景级 `domain:` 行 = L74；载荷 `html.template` 前缀全部为 `历史/` |
| 查看统计 | 历史（`history`） | 2 | `scenes/历史.yaml:40`（文件级 `domain:`，其下 `:41` = `key: history`）；该组 2 卡的场景级 `domain:` 行 = L92／L110；载荷 `html.template` 前缀全部为 `历史/` |
| 生成清单 | 采购（`shopping`） | 1 | `scenes/采购.yaml:58`（文件级 `domain:`，其下 `:59` = `key: shopping`）；该组 1 卡的场景级 `domain:` 行 = L66；载荷 `html.template` 前缀全部为 `采购/` |
| 录入食谱 | 录入（`add`） | 4 | `scenes/录入.yaml:25`（文件级 `domain:`，其下 `:26` = `key: add`）；该组 4 卡的场景级 `domain:` 行 = L51／L69／L33／L87；载荷 `html.template` 前缀全部为 `录入/` |
| 导入食谱 | 录入（`add`） | 2 | `scenes/录入.yaml:25`（文件级 `domain:`，其下 `:26` = `key: add`）；该组 2 卡的场景级 `domain:` 行 = L105／L123；载荷 `html.template` 前缀全部为 `录入/` |
| 添加派生关系 | 派生（`relation`） | 1 | `scenes/派生.yaml:45`（文件级 `domain:`，其下 `:46` = `key: relation`）；该组 1 卡的场景级 `domain:` 行 = L53；载荷 `html.template` 前缀全部为 `派生/` |
| 查看派生关系 | 派生（`relation`） | 1 | `scenes/派生.yaml:45`（文件级 `domain:`，其下 `:46` = `key: relation`）；该组 1 卡的场景级 `domain:` 行 = L79；载荷 `html.template` 前缀全部为 `派生/` |
| 首次使用 | 开始使用（`setup`） | 1 | `scenes/开始使用.yaml:25`（文件级 `domain:`，其下 `:26` = `key: setup`）；该组 1 卡的场景级 `domain:` 行 = L33；载荷 `html.template` 前缀全部为 `开始使用/` |
| 体检 | 数据管理（`data`） | 1 | `scenes/数据管理.yaml:41`（文件级 `domain:`，其下 `:42` = `key: data`）；该组 1 卡的场景级 `domain:` 行 = L49；载荷 `html.template` 前缀全部为 `数据管理/` |
| 批量改 | 数据管理（`data`） | 1 | `scenes/数据管理.yaml:41`（文件级 `domain:`，其下 `:42` = `key: data`）；该组 1 卡的场景级 `domain:` 行 = L68；载荷 `html.template` 前缀全部为 `数据管理/` |
| 备份 | 数据管理（`data`） | 1 | `scenes/数据管理.yaml:41`（文件级 `domain:`，其下 `:42` = `key: data`）；该组 1 卡的场景级 `domain:` 行 = L90；载荷 `html.template` 前缀全部为 `数据管理/` |
| 从已有派生新菜 | 派生（`relation`） | 1 | `scenes/派生.yaml:45`（文件级 `domain:`，其下 `:46` = `key: relation`）；该组 1 卡的场景级 `domain:` 行 = L97；载荷 `html.template` 前缀全部为 `派生/` |

33 组逐组的场景级 `domain:` 行号：
  - `做菜模式` → `scenes/做菜.yaml` L44／L62／L80／L98／L116
  - `查看食谱` → `scenes/查看.yaml` L30／L48／L66
  - `查看食材` → `scenes/查看.yaml` L84／L102
  - `查看步骤` → `scenes/查看.yaml` L120
  - `查看营养` → `scenes/查看.yaml` L138
  - `查看背景` → `scenes/查看.yaml` L156
  - `搜索食谱` → `scenes/搜索筛选.yaml` L35／L53
  - `筛选菜系` → `scenes/搜索筛选.yaml` L71／L89
  - `筛选食材` → `scenes/搜索筛选.yaml` L107／L125
  - `筛选难度` → `scenes/搜索筛选.yaml` L143
  - `筛选时间` → `scenes/搜索筛选.yaml` L161
  - `筛选炊具` → `scenes/搜索筛选.yaml` L179
  - `筛选口味` → `scenes/搜索筛选.yaml` L197
  - `筛选季节` → `scenes/搜索筛选.yaml` L215
  - `筛选状态` → `scenes/搜索筛选.yaml` L233
  - `查看全部` → `scenes/搜索筛选.yaml` L251
  - `修改食谱` → `scenes/修改.yaml` L49
  - `修改步骤` → `scenes/修改.yaml` L72
  - `修改食材` → `scenes/修改.yaml` L96
  - `废弃食谱` → `scenes/修改.yaml` L119
  - `记录做菜` → `scenes/历史.yaml` L48
  - `查看历史` → `scenes/历史.yaml` L74
  - `查看统计` → `scenes/历史.yaml` L92／L110
  - `生成清单` → `scenes/采购.yaml` L66
  - `录入食谱` → `scenes/录入.yaml` L51／L69／L33／L87
  - `导入食谱` → `scenes/录入.yaml` L105／L123
  - `添加派生关系` → `scenes/派生.yaml` L53
  - `查看派生关系` → `scenes/派生.yaml` L79
  - `首次使用` → `scenes/开始使用.yaml` L33
  - `体检` → `scenes/数据管理.yaml` L49
  - `批量改` → `scenes/数据管理.yaml` L68
  - `备份` → `scenes/数据管理.yaml` L90
  - `从已有派生新菜` → `scenes/派生.yaml` L97

## 三、老 48 条场景逐条对账表

判定口径（本节数字按此口径算，可复算）：

- **有** = 新表里有一条唤醒词与这张卡一一对应（这张卡就是那条唤醒词的主要场景）；
- **改名** = 这张卡的能力在新表里有专属唤醒词，但名字与老件不同；
- **合并** = 这张卡在新表里没有专属唤醒词，功能被并进另一条唤醒词的参数／`op`／`kind`；
- **无** = 新表里既没有专属唤醒词，命令层也没有承接它的参数／`op`／`kind`。

第 8 列是判定依据的源码行（新仓 `packages/skill-chef/src/`，2026-09-07 版本，mtime 未变）。

**第 9 列「chip 新表认不认」是本次整改补的第二条账**（主审查 H1）。卡面的 chip 取的就是 `s.wake_word`（`packages/base-render/assets/help-template.html:1665` `chip: s.wake_word`），而本草案把**老一级组名**填进了 `wake_word`（样本：`{"id":"cooking_start_fresh", …, "wake_word":"做菜模式", …}`、`{"id":"view_full_recipe", …, "wake_word":"查看食谱", …}`）——所以「这张卡的 chip 认不认」＝「这张卡所属的老组名在不在新表 37 词里」。判据是**逐字比较**（`packages/skill-chef/src/policy/wakewords.ts` 的 `WAKE_TABLE`；脚本 `.scratch/chef-help/t2/chip-check.cjs`），不是语义相似。

- `✓ 认` = 该组名逐字在新表 37 词内，用户照页面说这个词，新表的最长匹配接得住；
- `✗ 不认 ※` = 该组名**不在**新表 37 词内，用户照页面说这个词**无命中**。带 ※ 的 **14 张**卡的处置（甲／乙／丙三选一＋代价）见 3.2，**需用户裁**；**本报告不擅自改写这 13 个老组名**（改＝改骨架，与用户裁定的「老骨架为准」相抵）。

| # | scenario_id | 场景名 | 组 | 域 | 新表落点（有／无／改名／合并→新名） | 新表对应唤醒词或命令 | 依据（源码行） | chip 新表认不认 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `cooking_start_fresh` | 全新开始(含每步内联 + 完结闭环) | 做菜模式 | 做菜（`cook`） | 有 | 做菜模式、开始做菜 → chef.cooking.run | wakewords.ts:36-37；cmd_read.ts:231-250 | ✓ 认 |
| 2 | `cooking_start_with_history` | 含上次经验(历史驱动再开做) | 做菜模式 | 做菜（`cook`） | 合并 | 并进 做菜模式 → chef.cooking.run（历史为输入，无独立词） | wakewords.ts:36；views.ts:78-80 historyHint | ✓ 认 |
| 3 | `cooking_start_double_servings` | 双份份量 | 做菜模式 | 做菜（`cook`） | 合并 | 并进 做菜模式 的 servings 参数 | wakewords.ts:36；cmd_read.ts:232-235 | ✓ 认 |
| 4 | `cooking_resume_after_pause` | 断点续做(AI 会话记忆) | 做菜模式 | 做菜（`cook`） | 改名 | 继续做菜 → chef.cooking.run | wakewords.ts:38 | ✓ 认 |
| 5 | `cooking_during_waiting_step` | 等待步骤中并行做其他 | 做菜模式 | 做菜（`cook`） | 合并 | 并进 做菜模式 → chef.cooking.run | wakewords.ts:36 | ✓ 认 |
| 6 | `view_full_recipe` | 完整食谱 | 查看食谱 | 查看（`view`） | 有 | 查看食谱 → chef.recipe.view | wakewords.ts:17 | ✓ 认 |
| 7 | `view_for_beginner` | 新手强调(关键成功点) | 查看食谱 | 查看（`view`） | 合并 | 并进 查看食谱 → chef.recipe.view | wakewords.ts:17 | ✓ 认 |
| 8 | `view_recipe_with_substitution` | 替换食材预览(临时假设) | 查看食谱 | 查看（`view`） | 合并 | 并进 查看食谱 → chef.recipe.view（替换预览无独立词） | wakewords.ts:17 | ✓ 认 |
| 9 | `view_ingredients_only` | 只看食材 | 查看食材 | 查看（`view`） | 有 | 查看食材 → chef.recipe.view | wakewords.ts:18 | ✓ 认 |
| 10 | `view_ingredients_grouped` | 食材分组(11 大类) | 查看食材 | 查看（`view`） | 合并 | 并进 查看食材 → chef.recipe.view | wakewords.ts:18 | ✓ 认 |
| 11 | `view_steps_only` | 只看步骤 | 查看步骤 | 查看（`view`） | 有 | 查看步骤 → chef.recipe.view | wakewords.ts:19 | ✓ 认 |
| 12 | `view_nutrition_only` | 只看营养 | 查看营养 | 查看（`view`） | 有 | 查看营养 → chef.recipe.view（营养一期占位） | wakewords.ts:20；views.ts:43 | ✓ 认 |
| 13 | `view_background_only` | 只看背景文化 | 查看背景 | 查看（`view`） | 有 | 查看背景 → chef.recipe.view | wakewords.ts:21 | ✓ 认 |
| 14 | `search_by_name_keyword` | 关键词搜索(菜名/食材) | 搜索食谱 | 搜索筛选（`search`） | 有 | 搜索食谱、搜菜 → chef.recipe.search q | wakewords.ts:25-26 | ✓ 认 |
| 15 | `search_fuzzy_match` | 错字模糊匹配(纠错提示) | 搜索食谱 | 搜索筛选（`search`） | 合并 | 并进 搜索食谱（错字纠错为 AI 行为，无独立词） | wakewords.ts:25 | ✓ 认 |
| 16 | `filter_cuisine_basic` | 按菜系筛选 | 筛选菜系 | 搜索筛选（`search`） | 有 | 筛选菜系 → chef.recipe.search filter | wakewords.ts:28 | ✓ 认 |
| 17 | `filter_combined` | 多维组合筛选(≤3 维) | 筛选菜系 | 搜索筛选（`search`） | 合并 | 并进 筛选菜系/筛选食材（多维组合无独立词） | wakewords.ts:28-29；cmd_read.ts:33 FILTER_KEYS 11 键 | ✓ 认 |
| 18 | `filter_by_ingredient_basic` | 按食材筛选 | 筛选食材 | 搜索筛选（`search`） | 有 | 筛选食材 → chef.recipe.search filter | wakewords.ts:29 | ✓ 认 |
| 19 | `filter_exclude_ingredient` | 排除食材(忌口) | 筛选食材 | 搜索筛选（`search`） | 合并 | 并进 筛选食材 的 filter 槽位 | wakewords.ts:29 | ✓ 认 |
| 20 | `filter_difficulty_easy` | 按难度筛选 | 筛选难度 | 搜索筛选（`search`） | 无 | 无唤醒词；命令层可承接：difficulty | cmd_read.ts:33,120 | ✗ **不认** ※ |
| 21 | `filter_time_quick` | 按时间筛选(30 分钟内) | 筛选时间 | 搜索筛选（`search`） | 无 | 无唤醒词；命令层可承接：maxTime／time_max／time | cmd_read.ts:33,126-127 | ✗ **不认** ※ |
| 22 | `filter_by_cookware` | 按炊具筛选 | 筛选炊具 | 搜索筛选（`search`） | 无 | 无唤醒词；命令层可承接：cookware | cmd_read.ts:33,120 | ✗ **不认** ※ |
| 23 | `filter_by_flavor` | 按口味筛选 | 筛选口味 | 搜索筛选（`search`） | 有 | 筛选口味 → chef.recipe.search filter | wakewords.ts:30 | ✓ 认 |
| 24 | `filter_by_season` | 按季节筛选 | 筛选季节 | 搜索筛选（`search`） | 有 | 筛选季节 → chef.recipe.search filter | wakewords.ts:31 | ✓ 认 |
| 25 | `filter_by_status` | 按状态筛选 | 筛选状态 | 搜索筛选（`search`） | 无 | 无唤醒词；命令层可承接：status | cmd_read.ts:33,120 | ✗ **不认** ※ |
| 26 | `list_all_recipes` | 列出所有食谱 | 查看全部 | 搜索筛选（`search`） | 有 | 查看全部 → chef.recipe.search kind=all | wakewords.ts:24 | ✓ 认 |
| 27 | `update_main_fields` | 修改食谱主信息 | 修改食谱 | 修改（`update`） | 有 | 修改食谱 → chef.recipe.write op=update | wakewords.ts:33 | ✓ 认 |
| 28 | `update_step_content` | 修改步骤(内容/重排) | 修改步骤 | 修改（`update`） | 合并 | 并进 chef.recipe.write op=add-step（无独立唤醒词） | cmd_read.ts:71,212-227 | ✗ **不认** ※ |
| 29 | `update_ingredient` | 修改食材(用量/添加/关联步骤) | 修改食材 | 修改（`update`） | 合并 | 并进 chef.recipe.write op=add-ingredient（无独立唤醒词） | cmd_read.ts:71,194-211 | ✗ **不认** ※ |
| 30 | `discard_recipe` | 废弃食谱(只增不删) | 废弃食谱 | 修改（`update`） | 有 | 废弃食谱 → chef.recipe.write op=deprecate | wakewords.ts:34 | ✓ 认 |
| 31 | `record_cook` | 记录做菜(完整 + 快速 + 补录) | 记录做菜 | 历史（`history`） | 有 | 记录做菜、补录做菜 → chef.history.record | wakewords.ts:44-45 | ✓ 认 |
| 32 | `view_history_list` | 历史时间线 | 查看历史 | 历史（`history`） | 有 | 查看历史 → chef.history.query kind=timeline | wakewords.ts:47 | ✓ 认 |
| 33 | `view_stats_dashboard` | 单菜统计 | 查看统计 | 历史（`history`） | 有 | 查看统计（带 name）→ chef.history.query kind=stats | wakewords.ts:48；cmd_read.ts:285-291 | ✓ 认 |
| 34 | `view_stats_global` | 全局统计(整体画像) | 查看统计 | 历史（`history`） | 合并 | 并进 查看统计（无 name）→ kind=stats 全局 | cmd_read.ts:292-297 | ✓ 认 |
| 35 | `shopping_generate` | 生成采购清单 | 生成清单 | 采购（`shopping`） | 有 | 生成清单 → chef.shopping.query | wakewords.ts:40 | ✓ 认 |
| 36 | `add_from_image` | 图片录入(识别图片) | 录入食谱 | 录入（`add`） | 合并 | 并进 录入食谱/加菜 op=add（图片识别新仓无路径） | wakewords.ts:32,35 | ✓ 认 |
| 37 | `add_from_markdown` | MD 文件录入 | 录入食谱 | 录入（`add`） | 合并 | 并进 录入食谱/加菜 op=add（无文件解析路径） | wakewords.ts:32,35 | ✓ 认 |
| 38 | `add_from_conversation` | 对话录入(逐步收集) | 录入食谱 | 录入（`add`） | 合并 | 并进 录入食谱/加菜 op=add | wakewords.ts:32,35 | ✓ 认 |
| 39 | `add_from_template` | 结构化模板录入(表单) | 录入食谱 | 录入（`add`） | 有 | 录入食谱 → chef.recipe.write op=add（params 为结构化表单） | wakewords.ts:32 | ✓ 认 |
| 40 | `import_from_json` | JSON 文件导入 | 导入食谱 | 录入（`add`） | 无 | 无唤醒词；op 仅 add/update/discard/add-ingredient/add-step | cmd_read.ts:69-73 | ✗ **不认** ※ |
| 41 | `import_validation_failed` | 导入校验失败(补齐后重试) | 导入食谱 | 录入（`add`） | 无 | 无唤醒词；无导入校验路径 | cmd_read.ts:69-73 | ✗ **不认** ※ |
| 42 | `add_relation` | 添加派生关系 | 添加派生关系 | 派生（`relation`） | 无 | 无唤醒词；fetch 未导出关系函数（表在 schema 里） | fetch/index.ts:3；db.ts:89 | ✗ **不认** ※ |
| 43 | `view_relation_tree` | 查看派生关系(家族树) | 查看派生关系 | 派生（`relation`） | 无 | 无唤醒词；fetch 未导出关系函数 | fetch/index.ts:3；db.ts:89 | ✗ **不认** ※ |
| 44 | `first_use` | 首次使用(初始化工作流) | 首次使用 | 开始使用（`setup`） | 无 | 无唤醒词；命令层无 init 分支（initialized 仅 NOTE） | cmd_read.ts:101 | ✗ **不认** ※ |
| 45 | `data_quality_report` | 数据质量报告 | 体检 | 数据管理（`data`） | 有 | 体检 → chef.history.query kind=quality（域从 data 改挂 history） | wakewords.ts:49；cmd_read.ts:299-317 | ✓ 认 |
| 46 | `data_batch_edit` | 批量编辑 | 批量改 | 数据管理（`data`） | 无 | 无唤醒词；命令层无批量 op | cmd_read.ts:69-73 | ✗ **不认** ※ |
| 47 | `data_export_backup` | 导出备份 | 备份 | 数据管理（`data`） | 无 | 无唤醒词；命令层可承接：chef.history.query kind=backup | cmd_read.ts:318-323 | ✗ **不认** ※ |
| 48 | `derive_from_existing` | 从已有派生新菜 | 从已有派生新菜 | 派生（`relation`） | 无 | 无唤醒词；fetch 未导出派生函数 | fetch/index.ts:3 | ✗ **不认** ※ |

**合计：有 20 ＋ 改名 1 ＋ 合并 15 ＝ 有落点 36 条；无落点 12 条。**

无落点的 12 条（老卡 → 新表缺什么）：

| # | scenario_id | 老卡 | 缺什么 |
| --- | --- | --- | --- |
| 1 | `filter_difficulty_easy` | 按难度筛选 | 缺唤醒词；**命令层有** `difficulty`（`cmd_read.ts:33` `FILTER_KEYS`、`:120` 过滤构造） |
| 2 | `filter_time_quick` | 按时间筛选(30 分钟内) | 缺唤醒词；**命令层有** `maxTime`／`time_max`／`time`（`cmd_read.ts:33`、`:126-127`） |
| 3 | `filter_by_cookware` | 按炊具筛选 | 缺唤醒词；**命令层有** `cookware`（`cmd_read.ts:33`、`:120`） |
| 4 | `filter_by_status` | 按状态筛选 | 缺唤醒词；**命令层有** `status`（`cmd_read.ts:33`、`:120`） |
| 5 | `import_from_json` | JSON 文件导入 | 唤醒词与命令分支都没有；`chef.recipe.write` 的 `op` 只有 `add/update/discard/deprecate/add-ingredient/add-step`（`cmd_read.ts:71`） |
| 6 | `import_validation_failed` | 导入校验失败(补齐后重试) | 同上；仓里无导入校验路径 |
| 7 | `add_relation` | 添加派生关系 | 唤醒词无；`src/fetch/index.ts:3` 导出的 16 个函数**无关系函数**（DB 表 `recipe_relations` 在 `src/fetch/db.ts:89-91` 建了，但没有读写入入口） |
| 8 | `view_relation_tree` | 查看派生关系(家族树) | 同上 |
| 9 | `derive_from_existing` | 从已有派生新菜 | 同上 |
| 10 | `first_use` | 首次使用(初始化工作流) | 唤醒词无；命令层无 init 分支，`cmd_read.ts:101` 只把 `handle.initialized` 打一条 NOTE |
| 11 | `data_batch_edit` | 批量编辑 | 唤醒词无；`chef.recipe.write` 无批量 `op`（`cmd_read.ts:69-73`） |
| 12 | `data_export_backup` | 导出备份 | 缺唤醒词；**命令层有** `chef.history.query kind=backup`（`cmd_read.ts:318-323`，走 `healthCheck`） |

> 这 12 条里，第 1–4、12 条**命令层能承接**（只缺唤醒词）；第 5–11 条**命令层也承接不了**。

### 3.1 新表 37 词的页面覆盖账（覆盖 20/37）与 17 条无同名组词的分两类（整改补，H1）

三张账并列（逐字比较，脚本 `.scratch/chef-help/t2/chip-check.cjs`／`newwords-check.cjs`）：

| 类 | 数 | 是哪些 | 结论 |
| --- | --- | --- | --- |
| 老组名与新表词**逐字同名** | **20** | 查看食谱／查看食材／查看步骤／查看营养／查看背景／查看全部／搜索食谱／筛选菜系／筛选食材／筛选口味／筛选季节／录入食谱／修改食谱／废弃食谱／做菜模式／生成清单／记录做菜／查看历史／查看统计／体检 | 这一格**直接可用**：20 个词既是老的一级组名、又是新表的唤醒词，chip 认（覆盖 34 张卡） |
| 老组名**不在**新表 | **13** | 筛选难度／筛选时间／筛选炊具／筛选状态／修改步骤／修改食材／导入食谱／添加派生关系／查看派生关系／首次使用／批量改／备份／从已有派生新菜 | **老新既有漂移**（与地图 Notes 已记的 6 条载荷独有词同类）：**不改老组名**，chip 后果与三选一见 3.2；覆盖 **14 张卡** |
| 新表有、老骨架**无同名组** | **17** | 4 条 HELP 触发面变形 ＋ 13 条待判（见下） | 分两类落位，**不许一律当新卡片**；逐条判据与内容来源见 5.1 |

**页面覆盖账**：新表 37 词里，草案 48 张卡的 chip 覆盖 **20/37**。把 5.1 判为「老卡近义触发／真新条目」的 13 条补进来，覆盖到 **33/37**；余下 **4 条是 HELP 自身的触发词**（`私家大厨HELP`／`菜谱HELP`／`查帮助`／`能做什么`），按老件立规**不出现在它自己生成的页里**（老 `SKILL.md:183`、老 `scripts/render_help.py:82`）。

**17 条分两类（本次整改的关键裁定）**：

**甲类 · 4 条 ＝ HELP 自身触发面的变形，不造第 49 张卡、不占域**

| 新表词 | 为什么不是新卡片 |
| --- | --- |
| `私家大厨HELP` | 老技能的唯一触发词是 `私家大厨 HELP`（**带空格**，老 `SKILL.md`）；新表写成不带空格的同形词，属**同一触发面的写法差异**，不是新的场景 |
| `菜谱HELP` | 老文档级变体（老 `SKILL.md:181` 的「✓ 菜谱 HELP/能做什么」），同属 HELP 触发面 |
| `查帮助` | 同族近义触发词（新表新写法） |
| `能做什么` | 同族近义触发词（老 `SKILL.md:181`） |

⇒ 这 4 条**不新造卡片**，去处是 `SKILL.md` 的触发面说明（HELP-AUTO 区已有这 4 行）。若用户要它们在 HELP 页上露出来，那是改老件「HELP 词不出现在自己生成的页里」这条规矩，**需用户单独裁**。

**乙类 · 13 条 ＝ 逐条判「老卡近义触发」还是「真新条目」**：判据、结论与 `title`／`prompt_template`／`types` 来源见 **5.1**。

### 3.2 14 张卡的 chip 三条路与代价（**需用户裁**）

这 14 张卡的 `wake_word`（＝卡面 chip）逐字取自老一级组名，而该组名不在新表 37 词内。**本报告不静默改写这 13 个老组名**（用户裁定「老骨架为准」，改＝改骨架，越界），只摆三条路与代价：

| 路 | 做法 | 代价 |
| --- | --- | --- |
| **甲** | **保留老组名当 chip**，照老骨架逐字 | 用户照页面说这 14 张卡的词，**AI 答不出**（新表无此词 → `POLICY_NO_MATCH`）；维护者肉眼终审会问「这条怎么说了没反应」。好处是零改动、与「老骨架为准」完全一致 |
| **乙** | chip 落新表里**语义最近且可路由**的词 | **改了老骨架的显示词**，与「老骨架为准」**相抵**，需用户点头；且其中 4 个词（筛选难度／筛选时间／筛选炊具／筛选状态）在新表**连语义最近的词都没有**，乙路对它们无解（只能退回甲或走丙） |
| **丙** | chip **保留老组名**，卡上**另加一个「可路由说法」提示位** | 多出一个契约位（现契约 `Scene` 只有**单个** `wake_word`，`packages/base-render/src/spec/help.ts:38-46`），**需票 6 配合改契约与模板**，本图内做不成；代价最小但要动公共层 |

**另有一条与甲／乙／丙正交的标注手段**（只让维护者看得出，不解决路由）：把这 14 张卡标 `status: 【待开发】`，卡上会出「待开发」徽章（`help-template.html:1667`／`:1726`），外观上与可用卡区分开——但它**不改变**「说出去无命中」这件事。标 `''` 则卡面与可用卡**完全一样**（详见第八节第 3 条）。

14 张卡 × 对应老组名（逐条，与第三节表末列的 ✗ 一一对应）：

| 老组名（chip） | 张数 | 卡 `scenario_id` |
| --- | --- | --- |
| 筛选难度 | 1 | `filter_difficulty_easy` |
| 筛选时间 | 1 | `filter_time_quick` |
| 筛选炊具 | 1 | `filter_by_cookware` |
| 筛选状态 | 1 | `filter_by_status` |
| 修改步骤 | 1 | `update_step_content` |
| 修改食材 | 1 | `update_ingredient` |
| 导入食谱 | **2** | `import_from_json`／`import_validation_failed` |
| 添加派生关系 | 1 | `add_relation` |
| 查看派生关系 | 1 | `view_relation_tree` |
| 首次使用 | 1 | `first_use` |
| 批量改 | 1 | `data_batch_edit` |
| 备份 | 1 | `data_export_backup` |
| 从已有派生新菜 | 1 | `derive_from_existing` |

**挂载点**：这条属**结构设计闸门票**的待定项（票 6 的第一／二步「影响清单／结构设计」，`docs/agents/structure.md:78-90`），与本文件「整改记录 · 三、用户拍板清单」第 1 条同号；**本报告不替用户裁**。

## 四、缺域归属的两半：35 条主表 ＋ 13 条附表（**同一批 48 条按有无 `domain` 拆开**，不是两个清单相加）

**读法（整改改正，A 席 F4）**：老 48 条按「聚合总账 `references/scenarios.yaml` 里有没有 `domain:` 字段」**拆成两半**——**没有**的 35 条见本节主表（它们在**域文件**里全部有场景级 `domain:`，所以归属不需要猜），**有**的 13 条见本节附表。两半**无交集、并集恰是 48 条**（实测：主表 35 条逐 id 等于「载荷 48 条减去附表 13 条」），所以原文那句「35＋13＝48」不是加法而是拆分，已改正。
**另一处值域差异（A 席 W6）**：聚合总账那 13 条存的是 `domain:` 的**中文名**（如 `搜索筛选`），十份域文件的**场景级** `domain:` 存的是**英文 key**（如 `search`）——**两种值域不同**，下游不要把两处 `domain` 当成同一种东西（本节主表用的是域文件的英文 key 对应的中文域名）。

| # | scenario_id | 归到哪个域 | 依据（文件:行，三处佐证对得上吗） |
| --- | --- | --- | --- |
| 1 | `cooking_start_fresh` | 做菜（`cook`） | ① 模板路径前缀 `做菜/`；② `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`）＋ 本卡场景级 `domain:` 在 `:44`；③ `render_*.py` 见第一节附表（cooking_render.py:27 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:127。三处一致。 |
| 2 | `cooking_start_with_history` | 做菜（`cook`） | ① 模板路径前缀 `做菜/`；② `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`）＋ 本卡场景级 `domain:` 在 `:62`；③ `render_*.py` 见第一节附表（cooking_render.py:27 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:127。三处一致。 |
| 3 | `cooking_start_double_servings` | 做菜（`cook`） | ① 模板路径前缀 `做菜/`；② `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`）＋ 本卡场景级 `domain:` 在 `:80`；③ `render_*.py` 见第一节附表（cooking_render.py:27 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:127。三处一致。 |
| 4 | `cooking_resume_after_pause` | 做菜（`cook`） | ① 模板路径前缀 `做菜/`；② `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`）＋ 本卡场景级 `domain:` 在 `:98`；③ `render_*.py` 见第一节附表（cooking_render.py:27 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:127。三处一致。 |
| 5 | `cooking_during_waiting_step` | 做菜（`cook`） | ① 模板路径前缀 `做菜/`；② `scenes/做菜.yaml:36` 文件级 `domain:`（`:37` = `key: cook`）＋ 本卡场景级 `domain:` 在 `:116`；③ `render_*.py` 见第一节附表（cooking_render.py:27 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:127。三处一致。 |
| 6 | `view_full_recipe` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:30`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 7 | `view_for_beginner` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:48`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 8 | `view_recipe_with_substitution` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:66`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 9 | `view_ingredients_only` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:84`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 10 | `view_ingredients_grouped` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:102`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 11 | `view_steps_only` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:120`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 12 | `view_nutrition_only` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:138`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 13 | `view_background_only` | 查看（`view`） | ① 模板路径前缀 `查看/`；② `scenes/查看.yaml:22` 文件级 `domain:`（`:23` = `key: view`）＋ 本卡场景级 `domain:` 在 `:156`；③ `render_*.py` 见第一节附表（recipe_render.py:29 主体不同）；④ `wake_word_variants.md` wake_word_variants.md:128。三处一致。 |
| 14 | `search_by_name_keyword` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:35`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 15 | `search_fuzzy_match` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:53`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 16 | `filter_cuisine_basic` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:71`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 17 | `filter_by_ingredient_basic` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:107`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 18 | `filter_exclude_ingredient` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:125`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 19 | `filter_difficulty_easy` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:143`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 20 | `filter_time_quick` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:161`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 21 | `filter_by_cookware` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:179`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 22 | `filter_by_flavor` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:197`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 23 | `filter_by_season` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:215`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 24 | `filter_by_status` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:233`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 25 | `list_all_recipes` | 搜索筛选（`search`） | ① 模板路径前缀 `搜索筛选/`；② `scenes/搜索筛选.yaml:27` 文件级 `domain:`（`:28` = `key: search`）＋ 本卡场景级 `domain:` 在 `:251`；③ `render_*.py` 见第一节附表（render_搜索筛选.py:30）；④ `wake_word_variants.md` wake_word_variants.md:134。三处一致。 |
| 26 | `update_step_content` | 修改（`update`） | ① 模板路径前缀 `修改/`；② `scenes/修改.yaml:41` 文件级 `domain:`（`:42` = `key: update`）＋ 本卡场景级 `domain:` 在 `:72`；③ `render_*.py` 见第一节附表（render_修改.py:41）；④ `wake_word_variants.md` wake_word_variants.md:144。三处一致。 |
| 27 | `discard_recipe` | 修改（`update`） | ① 模板路径前缀 `修改/`；② `scenes/修改.yaml:41` 文件级 `domain:`（`:42` = `key: update`）＋ 本卡场景级 `domain:` 在 `:119`；③ `render_*.py` 见第一节附表（render_修改.py:41）；④ `wake_word_variants.md` wake_word_variants.md:144。三处一致。 |
| 28 | `view_history_list` | 历史（`history`） | ① 模板路径前缀 `历史/`；② `scenes/历史.yaml:40` 文件级 `domain:`（`:41` = `key: history`）＋ 本卡场景级 `domain:` 在 `:74`；③ `render_*.py` 见第一节附表（render_历史.py:41）；④ `wake_word_variants.md` wake_word_variants.md:152。三处一致。 |
| 29 | `view_stats_dashboard` | 历史（`history`） | ① 模板路径前缀 `历史/`；② `scenes/历史.yaml:40` 文件级 `domain:`（`:41` = `key: history`）＋ 本卡场景级 `domain:` 在 `:92`；③ `render_*.py` 见第一节附表（render_历史.py:41）；④ `wake_word_variants.md` wake_word_variants.md:152。三处一致。 |
| 30 | `view_stats_global` | 历史（`history`） | ① 模板路径前缀 `历史/`；② `scenes/历史.yaml:40` 文件级 `domain:`（`:41` = `key: history`）＋ 本卡场景级 `domain:` 在 `:110`；③ `render_*.py` 见第一节附表（render_历史.py:41）；④ `wake_word_variants.md` wake_word_variants.md:152。三处一致。 |
| 31 | `add_from_image` | 录入（`add`） | ① 模板路径前缀 `录入/`；② `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`）＋ 本卡场景级 `domain:` 在 `:51`；③ `render_*.py` 见第一节附表（render_add.py:41）；④ `wake_word_variants.md` wake_word_variants.md:123。三处一致。 |
| 32 | `add_from_markdown` | 录入（`add`） | ① 模板路径前缀 `录入/`；② `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`）＋ 本卡场景级 `domain:` 在 `:69`；③ `render_*.py` 见第一节附表（render_add.py:41）；④ `wake_word_variants.md` wake_word_variants.md:123。三处一致。 |
| 33 | `add_from_conversation` | 录入（`add`） | ① 模板路径前缀 `录入/`；② `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`）＋ 本卡场景级 `domain:` 在 `:33`；③ `render_*.py` 见第一节附表（render_add.py:41）；④ `wake_word_variants.md` wake_word_variants.md:123。三处一致。 |
| 34 | `import_from_json` | 录入（`add`） | ① 模板路径前缀 `录入/`；② `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`）＋ 本卡场景级 `domain:` 在 `:105`；③ `render_*.py` 见第一节附表（render_add.py:41）；④ `wake_word_variants.md` wake_word_variants.md:123。三处一致。 |
| 35 | `import_validation_failed` | 录入（`add`） | ① 模板路径前缀 `录入/`；② `scenes/录入.yaml:25` 文件级 `domain:`（`:26` = `key: add`）＋ 本卡场景级 `domain:` 在 `:123`；③ `render_*.py` 见第一节附表（render_add.py:41）；④ `wake_word_variants.md` wake_word_variants.md:123。三处一致。 |

> 缺域条数 = **35**（应 35）。

### 附表 · 聚合总账里本来就带 `domain:` 的 13 条（剩下 35 条见上表）

| # | scenario_id | 聚合 `references/scenarios.yaml` 的 `domain:` 所在行 | 域 | 与域文件一致吗 |
| --- | --- | --- | --- | --- |
| 1 | `filter_combined` | L295 | 搜索筛选（`search`） | ✓ |
| 2 | `update_main_fields` | L455 | 修改（`update`） | ✓ |
| 3 | `update_ingredient` | L502 | 修改（`update`） | ✓ |
| 4 | `record_cook` | L544 | 历史（`history`） | ✓ |
| 5 | `shopping_generate` | L618 | 采购（`shopping`） | ✓ |
| 6 | `add_from_template` | L689 | 录入（`add`） | ✓ |
| 7 | `add_relation` | L736 | 派生（`relation`） | ✓ |
| 8 | `view_relation_tree` | L764 | 派生（`relation`） | ✓ |
| 9 | `first_use` | L781 | 开始使用（`setup`） | ✓ |
| 10 | `data_quality_report` | L797 | 数据管理（`data`） | ✓ |
| 11 | `data_batch_edit` | L816 | 数据管理（`data`） | ✓ |
| 12 | `data_export_backup` | L839 | 数据管理（`data`） | ✓ |
| 13 | `derive_from_existing` | L860 | 派生（`relation`） | ✓ |


> 带域条数 = **13**（应 13）。
**三处佐证对得上的情况（照实说）**：

- 35 条**全部**同时满足：① 载荷 `html.template` 的目录名前缀 = 该域中文名（48/48 零矛盾）；② 域文件场景级 `domain:` = 域文件文件级 `domain.key` 对应的中文名；③ 域文件文件级 `domain.key` 与 `name` 成对。
- 但**票面点名的「三处」并不对每个域都齐**：`wake_word_variants.md` 有分节的只有 8 个域（`派生关系`／`录入食谱`／`做菜模式`／`查看食谱`／`搜索筛选`／`修改食谱`／`烹饪历史`／`采购清单`），**开始使用**与**数据管理**两域在该文档里**没有任何分节**——它们只有「仅一处佐证」（域文件本身）＋载荷模板前缀一处。`render_*.py` 同理只覆盖 5 个域的中文脚本名（`render_修改`／`render_历史`／`render_开始使用`／`render_搜索筛选`／`render_派生`），其余 5 个域靠英文脚本名（`cooking_`／`recipe_`／`shopping_`／`render_add`／`render_data`／`render_batch_edit`／`render_quality_report`／`export_backup`）间接对上，其中 `cooking`≠`cook`、`recipe`≠`view` 属于「主体不同」。逐域明细见第一节附表。

## 五、新表多出的条目 → 补进哪个域／哪个组

先给 37 条的分类计数（脚本 `03-reconcile.py` 的 `NEW_TABLE` 段，短语逐字比较）：

| 分类 | 条数 | 说明 |
| --- | --- | --- |
| 载荷有 | 22 | 老 HELP 页面上已有同名组或同名别名 |
| 仅老文档有 | 3 | `菜谱HELP`（老 `SKILL.md:181` 写的是 `菜谱 HELP`）／`能做什么`（同处）／`排除可选`（`wake_word_variants.md:157`） |
| 新表多出 | 12 | 载荷与老文档都没有 |
| **合计** | **37** | |

37 条逐条清单（行号 = `wakewords.ts`）：

```text
13	私家大厨HELP	chef.help.lookup	载荷有
14	菜谱HELP	chef.help.lookup	仅文档有
15	查帮助	chef.help.lookup	新表多出
16	能做什么	chef.help.lookup	仅文档有
17	查看食谱	chef.recipe.view	载荷有
18	查看食材	chef.recipe.view	载荷有
19	查看步骤	chef.recipe.view	载荷有
20	查看营养	chef.recipe.view	载荷有
21	查看背景	chef.recipe.view	载荷有
22	看菜谱	chef.recipe.view	新表多出
23	看菜	chef.recipe.view	新表多出
24	查看全部	chef.recipe.search	载荷有
25	搜索食谱	chef.recipe.search	载荷有
26	搜菜	chef.recipe.search	新表多出
27	查食材	chef.recipe.search	新表多出
28	筛选菜系	chef.recipe.search	载荷有
29	筛选食材	chef.recipe.search	载荷有
30	筛选口味	chef.recipe.search	载荷有
31	筛选季节	chef.recipe.search	载荷有
32	录入食谱	chef.recipe.write	载荷有
33	修改食谱	chef.recipe.write	载荷有
34	废弃食谱	chef.recipe.write	载荷有
35	加菜	chef.recipe.write	新表多出
36	做菜模式	chef.cooking.run	载荷有
37	开始做菜	chef.cooking.run	载荷有
38	继续做菜	chef.cooking.run	新表多出
39	完成做菜	chef.cooking.run	新表多出
40	生成清单	chef.shopping.query	载荷有
41	排除可选	chef.shopping.query	仅文档有
42	查清单	chef.shopping.query	新表多出
43	清空清单	chef.shopping.query	新表多出
44	记录做菜	chef.history.record	载荷有
45	补录做菜	chef.history.record	新表多出
46	改评分	chef.history.record	新表多出
47	查看历史	chef.history.query	载荷有
48	查看统计	chef.history.query	载荷有
49	体检	chef.history.query	载荷有
COUNTS	载荷有=22	仅文档有=3	新表多出=12
TOTAL	37
```

**「载荷无」的 15 条各自补进哪里**（3 条仅文档有 ＋ 12 条真多出；不含 `私家大厨HELP`——它载荷里有，只是老写 `私家大厨 HELP`、新表没空格，属于同一词的写法差异）：

| 新表条目（唤醒词或命令） | 落在哪条命令 | 补进域 | 补进组 | 依据 |
| --- | --- | --- | --- | --- |
| 菜谱HELP | help.lookup | — | — | 老文档级变体（老 SKILL.md:181「✓ 菜谱 HELP/能做什么」）；HELP 词本身不出现在它自己生成的页里（老 SKILL.md:183、render_help.py:82） |
| 查帮助 | help.lookup | — | — | 载荷与老文档都没有；新增的 HELP 触发词 |
| 能做什么 | help.lookup | — | — | 老文档级变体（老 SKILL.md:181）；载荷无 |
| 看菜谱 | recipe.view | 查看 | 查看食谱 | wakewords.ts:2 头注 #43 F1「看菜/看菜谱→view」 |
| 看菜 | recipe.view | 查看 | 查看食谱 | wakewords.ts:2 头注 #43 F1 |
| 搜菜 | recipe.search | 搜索筛选 | 搜索食谱 | wakewords.ts:26 → recipe.search（槽位 q） |
| 查食材 | recipe.search | 搜索筛选 | 搜索食谱 | wakewords.ts:27 → recipe.search（槽位 q）；老「筛选食材」是维度筛选卡，口径不同（见八） |
| 加菜 | recipe.write | 录入 | 录入食谱 | wakewords.ts:35 → recipe.write preset op=add |
| 继续做菜 | cooking.run | 做菜 | 做菜模式 | wakewords.ts:38；老件对应卡 cooking_resume_after_pause「断点续做」 |
| 完成做菜 | cooking.run | 做菜 | 做菜模式 | wakewords.ts:39；命令层无「完结」分支，仍走 buildCookingRun |
| 排除可选 | shopping.query | 采购 | 生成清单 | wakewords.ts:41；老文档 wake_word_variants.md:157 已把它写在「采购清单」分节下；老 scenes/采购.yaml:9 明写它是「生成清单」的参数旋钮 |
| 查清单 | shopping.query | 采购 | 生成清单 | wakewords.ts:42；命令层需 names（cmd_read.ts:252） |
| 清空清单 | shopping.query | 采购 | 生成清单 | wakewords.ts:43；命令层无「清空」分支（cmd_read.ts:251-262） |
| 补录做菜 | history.record | 历史 | 记录做菜 | wakewords.ts:45；命令层 date 参数承接补录（cmd_read.ts:272） |
| 改评分 | history.record | 历史 | 记录做菜 | wakewords.ts:46；命令层 rating 参数（cmd_read.ts:267-270） |

**4 条 HELP 触发词（`私家大厨HELP`／`菜谱HELP`／`查帮助`／`能做什么`）不归任何域**：老件明写 HELP 词**不出现在它自己生成的页里**（老 `SKILL.md:183`、`scripts/render_help.py:82` 注释）。怎么显示由票 5 裁，事实先摆在这里。

### 5.1 新表多出条目的内容来源表（整改补，H4）

**先立规矩（仓里现成的先例，照抄即可）**：`packages/skill-bill/src/triggers/wake-assets.ts:54` —— 新条目**接在对应二级组末尾**（该行原文：「7 域／20 二级组／74 场景（老 71 逐字 ＋ **新增 3 条接在对应二级组末尾**）」）；`prompt` **按老实样重写**（同一组既有条目怎么起句、怎么写「唤醒词:xxx」与填写位，新条目照那个样子写）的规矩在同文件 `:12-16`（`:15` 原文「`prompt_template` 按老实样重写（`____` 空槽 ＋ `(唤醒词:…)` 尾注）」），不另创文体。**本轮改正**：原文把两半都记在 `:12-16`，而「接在二级组末尾」的真出处是 `:54`。上面那张表只写到「补进哪个组」，本节把**「谁写内容、从哪来」**补上。

**判据三条**（对下面 13 条逐条用；「13 条」＝ 3.1 乙类那 13 条）：

| 判据 | 怎么看 |
| --- | --- |
| **A · 命令落点** | 新词落到哪条命令／哪个槽位。与某张老卡**同命令、同槽位、同语义** → 判「老卡近义触发」；落点语义与任何老卡都不同 → 判「真新条目」 |
| **B · 老文案可搬性** | 老 48 张卡里能不能**逐字搬**出 `title`／`prompt`。实测：这 13 个词面在老 48 卡文案里**命中 0 条**（脚本 `newwords-check.cjs`）；但「语义对应到某张老卡」时，**那张卡的** `title`／`prompt` 可以复用 |
| **C · 老骨架有无线索** | 老组名／老文档有没有已经把它写成某组下的词（如 `排除可选` 在 `wake_word_variants.md:157` 属「采购清单」分节，老域文件 `scenes/采购.yaml:9` 说它是「生成清单」的参数旋钮） |

**13 条逐条**（`types` 一律照同组既有卡在第七节草案里的取值，不另设新类型；真新条目的 `types` 由票 5 照同组复核）：

| 新表词 | 命令落点 | 老线索（判据 C） | 判据 A／B | 结论 | `title` 来源 | `prompt_template` 来源 |
| --- | --- | --- | --- | --- | --- | --- |
| `看菜谱` | `chef.recipe.view` | 无同名组；新表头注明写「看菜/看菜谱→view」（`wakewords.ts:2`，#43 F1） | 与老卡 `view_full_recipe`（查看食谱组）同命令同语义；词面命中 0 | **老卡近义触发**（不新造卡） | 复用 `view_full_recipe` 的 `完整食谱` | 复用该卡 prompt（`看看{{菜名}}怎么做。`） |
| `看菜` | `chef.recipe.view` | 同上 | 同上 | **老卡近义触发** | 同上 | 同上 |
| `搜菜` | `chef.recipe.search`（槽位 `q`） | 无同名组 | 与老卡 `search_by_name_keyword`（搜索食谱组）同命令同槽位；词面命中 0 | **老卡近义触发** | 复用 `关键词搜索(菜名/食材)` | 复用该卡 prompt |
| `查食材` | `chef.recipe.search`（槽位 `q`） | 无同名组；老件有**两个不同组**：查看域的「查看食材」（走 `recipe.view`）与搜索筛选域的「筛选食材」（走 filter 维度） | **与上一行 `搜菜` 同命令、同槽位 `q`**——老卡 `search_by_name_keyword` 的标题逐字写着「关键词搜索(**菜名/食材**)」，本条正是它「食材」那一半；老「查看食材」卡与老「筛选食材」卡跟它**都不同事**（那两张的事不由本词承担，也不被本词顶掉） | **老卡近义触发**（**本轮改正**：原文另判一类，与同表 `搜菜` 的判据 A 相抵——同命令同槽位就该同判） | 复用 `search_by_name_keyword`（`关键词搜索(菜名/食材)`，与 `搜菜` 同一张卡；同例：`看菜谱`／`看菜` 共用 `view_full_recipe`） | 复用该卡 prompt |
| `加菜` | `chef.recipe.write`（`preset op=add`） | 无同名组 | 与老卡 `add_from_template`（录入食谱组）同命令同 op；词面命中 0 | **老卡近义触发** | 复用 `结构化模板录入(表单)` | 复用该卡 prompt |
| `开始做菜` | `chef.cooking.run` | **老件别名**（`$.wake_words[0].alias_names[0]`，挂「做菜模式」组） | 新表已把它升成独立唤醒词（`wakewords.ts:37`）；与老卡 `cooking_start_fresh` 同命令同语义 | **老卡改名／别名升格**（同组第 2 条词） | 复用 `全新开始(含每步内联 + 完结闭环)` | 复用该卡 prompt |
| `继续做菜` | `chef.cooking.run` | 无同名组 | 与老卡 `cooking_resume_after_pause`（断点续做）同命令同语义 | **老卡改名（同一张卡换词）** | 复用 `断点续做(AI 会话记忆)` | 复用该卡 prompt（`我刚才做到第 {{N}} 步,继续帮我做完。`） |
| `完成做菜` | `chef.cooking.run` | 无同名组 | 命令层**没有「完结」分支**（`cmd_read.ts:231-250` 只渲染步骤页），与任何老卡都不同事；词面命中 0 | **真新条目（新卡）**（先补命令分支，否则说了没效果） | **新写**（如「做完收尾」） | **新写**，照「做菜模式」组老实样 |
| `排除可选` | `chef.shopping.query`（槽位 `names`） | **有线索**：老文档 `wake_word_variants.md:157` 写在「采购清单」分节下；老域文件 `scenes/采购.yaml:9` 写它是「生成清单」的参数旋钮 | 老件里它**不是卡**（是参数旋钮）；词面命中 1 条（`shopping_generate`） | **参数升格为独立词：不新造卡**（作「生成清单」组的词与参数提示）；若用户要它成为可点击的独立条目，那是**新卡**，**需用户裁** | —（不造卡） | —（并进「生成清单」卡的参数说明） |
| `查清单` | `chef.shopping.query`（需 `names`，`cmd_read.ts:252`） | 无同名组 | 老卡 `shopping_generate` 是「生成」，与「查」不同事；词面命中 0 | **真新条目（新卡）** | **新写**（如「看现有清单」） | **新写**，照「生成清单」组老实样 |
| `清空清单` | `chef.shopping.query` | 无同名组 | 命令层**没有「清空」分支**（`cmd_read.ts:251-262` 只按 `names` 合并）；词面命中 0 | **真新条目（新卡）**（先补命令分支） | **新写** | **新写**，照「生成清单」组老实样 |
| `补录做菜` | `chef.history.record`（`date` 参数承接，`cmd_read.ts:272`） | 无同名组 | 与老卡 `record_cook`（记录做菜，标题已含「完整 + 快速 + 补录」）同命令同语义；词面命中 0 | **老卡近义触发** | 复用 `记录做菜(完整 + 快速 + 补录)` | 复用该卡 prompt |
| `改评分` | `chef.history.record`（`rating` 参数，`cmd_read.ts:267-270`） | 无同名组 | 评分是该命令的参数，与老卡 `record_cook` 同命令 | **老卡近义触发／参数升格** | 复用 `record_cook` | 复用该卡 prompt |

**13 条的汇总**：判「**老卡近义触发／改名**」（内容可复用某张老卡）**9 条**——看菜谱／看菜／搜菜／查食材／加菜／开始做菜／继续做菜／补录做菜／改评分；判「**真新条目**」（`title` 与 `prompt` 必须**新写**）**3 条**——完成做菜／查清单／清空清单；判「**不造卡**（参数升格）」**1 条**——排除可选。（**本轮改正**：上一段 `查食材` 一行原判「真新条目」，与同表 `搜菜` 的判据 A 相抵，已按判据 A 统一改判「老卡近义触发」；本条只影响票 5 少写一条文案，不丢内容。）

**落位一律照 bill 规矩**：新条目（无论「老卡换词」还是「真新条目」）都接在**对应二级组的末尾**（查看食谱／搜索食谱／录入食谱／做菜模式／生成清单／记录做菜），`prompt` 按该组老实样重写；**不新开组、不把 33 组撑大**（与 3.1 的「33 组逐字保留」一致）。

## 六、别名与载荷/文档漂移的落法（票面第 4、5 问）

**只给事实与依据，不替票 4／票 5 做决定。**

### 6.1 那 4 条别名

载荷里别名一共 4 条，挂在 2 个组下（`$.wake_words[0].alias_names` 与 `$.wake_words[19].alias_names`）；`$.aliases_expanded_count = 37` 就是「33 组 ＋ 4 别名」。

| 别名 | 老件挂在哪 | 载荷证据 | 新表 37 条里有吗 | 命令层能承接吗 | 事实结论 |
| --- | --- | --- | --- | --- | --- |
| `开始做菜` | `做菜模式` 组 | `$.wake_words[0].alias_names[0]` | **有**（`wakewords.ts:37` → `chef.cooking.run`） | 能（`cmd_read.ts:231-250`） | 老件是别名，**新表把它升成了独立唤醒词**；若按老骨架的「做菜模式」组渲染，它是该组下的第 2 条词 |
| `不想要` | `废弃食谱` 组 | `$.wake_words[19].alias_names[0]` | **无** | 能（`op=deprecate`，`cmd_read.ts:188-193`） | 新表没有这条词 |
| `删掉` | `废弃食谱` 组 | `$.wake_words[19].alias_names[1]` | **无** | 能（同上） | 新表没有这条词 |
| `废弃` | `废弃食谱` 组 | `$.wake_words[19].alias_names[2]` | **无**（`wakewords.ts:34` 的 `废弃食谱` 只是包含这两个字，不是同一短语） | 能（同上） | 新表没有这条词 |

**契约层的硬事实（决定「写在哪」有没有位置）**：通用 help 模板的场景契约里 `Scene` 只有**单个** `wake_word: string`，`SceneGroup`／`SceneSubgroup` 也**没有**任何别名字段（`packages/base-render/src/spec/help.ts:38-46`、`:48-59`）；`SCENE_DATA_SCHEMA` 是 `additionalProperties: false`（同文件 `:106-112`）。所以**老件那 4 条别名在契约里没有字段位**；`aliases_expanded_count` 同样没有。要么把别名并进 `wake_word` 文案，要么它们进不了 HELP——这是票 4／票 5 要裁的。

### 6.2 载荷有、老文档没有的 6 条

「老文档没有」指 `references/wake_word_variants.md` 的分节里查不到（该文件共 **14 个 `###` 分节**，见自检 2d 的逐行清单）。**改正（A 席 W2）**：原文这里写「9 个」，与自检 2d 的 14 个自相矛盾；实测 **14 个**（`L19`／`L38`／`L58`／`L77`／`L96`／`L119`／`L123`／`L127`／`L128`／`L134`／`L144`／`L152`／`L156`／`L159`）。

| 载荷条目 | 载荷证据 | 新表 37 条里有吗 | 新仓命令层 | 事实结论（进／不进 HELP，进了写在哪） |
| --- | --- | --- | --- | --- |
| `查看全部` | `$.wake_words[15].name`；卡 `list_all_recipes` | **有**（`wakewords.ts:24` → `chef.recipe.search` `preset {kind:'all'}`） | 能（`cmd_read.ts:113-115`） | 老骨架就有这一组，新表也有词 → 写进**搜索筛选**域 的「查看全部」组（老域文件 `scenes/搜索筛选.yaml` 给这张卡的 `sub` 也是「查看全部」） |
| `首次使用` | `$.wake_words[28].name`；卡 `first_use` | **无** | **不能**（无 init 分支） | 老骨架有这一组（开始使用域唯一一张卡）→ 按「老骨架为准」进 HELP，写进**开始使用**域 的「首次使用」组；新表无落点这一事实由票 5 决定怎么标 |
| `体检` | `$.wake_words[29].name`；卡 `data_quality_report` | **有**（`wakewords.ts:49` → `chef.history.query` `preset {kind:'quality'}`） | 能（`cmd_read.ts:299-317`） | **域归属冲突**：老骨架把它放在**数据管理**域（`scenes/数据管理.yaml`），新命令把它挂在 `history.query` 下。两条事实并列，「按老骨架还是按新命令」由票 5 裁 |
| `批量改` | `$.wake_words[30].name`；卡 `data_batch_edit` | **无** | **不能** | 老骨架有这一组 → 进 HELP，写进**数据管理**域 的「批量改」组；新表无落点 |
| `备份` | `$.wake_words[31].name`；卡 `data_export_backup` | **无**（全包搜「备份」只在 `src/help/lookup.ts:23` 的一句描述里，不在 `WAKE_TABLE`） | **能**：`chef.history.query kind=backup`（`cmd_read.ts:318-323`） | 老骨架有这一组 → 进 HELP，写进**数据管理**域 的「备份」组；新表缺的只是唤醒词 |
| `从已有派生新菜` | `$.wake_words[32].name`；卡 `derive_from_existing` | **无** | **不能** | 老骨架有这一组 → 进 HELP，写进**派生**域 的「从已有派生新菜」组；新表无落点 |

### 6.3 文档有、载荷没有的 3 条

| 文档条目 | 文档证据 | 载荷里有吗 | 新表 37 条里有吗 | 新仓命令层 | 事实结论 |
| --- | --- | --- | --- | --- | --- |
| `修改难度` | `wake_word_variants.md:148`，写在 `### 修改食谱(5 词,4 入口经 aliases 共享)` 分节下 | **无** | **无** | 能：`chef.recipe.write op=update` 的 `difficulty` 补丁字段（`cmd_read.ts:173`） | 老域文件 `scenes/修改.yaml:13` 明写「难度/份量/多字段 = **修改食谱的参数特例,不占独立卡**」——它老件里就不是一张卡，48 张里没有对应卡 |
| `修改份量` | `wake_word_variants.md:149`，同一分节下 | **无** | **无** | 能：同上 `servings` 补丁字段（`cmd_read.ts:173`） | 同上，参数特例不占卡 |
| `排除可选` | `wake_word_variants.md:157`，写在 `### 采购清单(详见上面)` 分节下 | **无** | **有**（`wakewords.ts:41` → `chef.shopping.query`，槽位 `names`） | 能：`excludeOptional`（`cmd_read.ts:254`、`:258`） | 老件里它是「生成清单」的参数旋钮、不是卡（老域文件 `scenes/采购.yaml:9` 明写「单菜/多菜合并/不同份数/**排除可选** = 生成清单的 4 个参数旋钮,不是独立场景」）；**新表把它升成了独立唤醒词**。老骨架下它无卡可挂，新表下它有词——「要不要为它补一张卡」由票 5 裁 |

### 6.4 三条「同名不同事」＋一条「槽位打偏」：页面怎么写才不误导用户（整改补）

老件与新表有四个词属于「名字一样／看着一样，指的却是两件事」。按「老骨架为准」时，**页面上的写法必须让用户知道说的是哪一件事**，否则用户说完发现拿到的不是他要的。

**① `体检`** —— 不只是归属冲突，**语义也不同**

| | 老骨架（`数据管理` 域，卡 `data_quality_report`） | 新表（`wakewords.ts:49` → `chef.history.query`，`preset {kind:'quality'}`） |
| --- | --- | --- |
| 算什么 | **菜谱库完整度评分**：每道菜的食材／步骤／贴士／技法／背景各 20 分 | **评分口碑统计**：做过几次／平均评分／低分次数 |
| 依据 | 老域文件 `scenes/数据管理.yaml:49`（该卡场景级 `domain: data`；`L48` 是 `- id: "data-1"`，不是 `domain:` 行）；老卡 `scenario_title`＝「数据质量报告」 | `cmd_read.ts:299-317` |

**页面措辞（防误导）**：卡面标题照老卡写「数据质量报告」、chip 仍是「体检」；**卡片正文必须写明这一张是「菜谱完整度体检（食材/步骤/贴士/技法/背景各 20 分）」**——因为用户对 AI 说「体检」时，新命令给的是口碑统计。归属与语义两头都冲突，二者只能选一，**需用户裁**（票 5／结构设计闸门票）。

**② `备份`** —— 做的事完全不同

| | 老骨架（卡 `data_export_backup`） | 新表（`chef.history.query kind=backup`） |
| --- | --- | --- |
| 做什么 | **打包下载**：全量 17 表 JSON ＋ 照片目录 ZIP（**有文件产出**） | 走 `healthCheck` **自检**，**不导出文件** |
| 依据 | 老卡 `result`（「打包下载：全量 17 表 JSON ＋ 照片目录 ZIP…」，1,970 字里的一条）；老卡 `html.template`＝`数据管理/backup_receipt.html` | `cmd_read.ts:318-323` |

**页面措辞（防误导）**：卡面写「导出备份」，正文写清**老件的备份＝打包下载 17 表 JSON ＋ 照片 ZIP**；同时标注「新命令 `kind=backup` 只做自检、不产出文件」。用户照页面说「备份」只拿到自检结论，就是这句话的后果——**页面写哪个口径需用户裁**（票 5）。

**③ `排除可选`** —— 老件是旋钮，新表是独立词

| | 老骨架 | 新表 |
| --- | --- | --- |
| 是什么 | 「生成清单」的**参数旋钮**（不是场景卡；老域文件 `scenes/采购.yaml:9`） | **独立唤醒词**（`wakewords.ts:41`） |
| 依据 | 老文档 `wake_word_variants.md:157` 属「采购清单」分节 | `cmd_read.ts:254`／`:258` 的 `excludeOptional` |

**页面措辞（防误导）**：**不要在「生成清单」组下把它单列成一张卡**（老骨架没有这张卡）；正确位置是「生成清单」卡的**参数说明**（例：「可选参数 排除可选＝不含选填食材」）。要它成为可点击的独立条目，那是 5.1 判的「新卡」，**需用户裁**。

**④ 附 · `filter` 槽位打偏（B 席第 8 问，中高）** —— 不是同名不同事，是**同一个词在新命令层指另一个维度**

- 事实：`筛选食材`／`筛选口味`／`筛选季节` 三条新词的 `needs` 都是 `['filter']`（`wakewords.ts:29-31`），而命令层把 `filter` **别名成菜系**——`cmd_read.ts:125` `if (f.cuisine === undefined && typeof params.filter === 'string') f.cuisine = params.filter.trim()`；`src/help/lookup.ts:18` 也自述「`filter`＝菜系别名」。
- 后果：用户照「筛选口味」卡复制出去的指令，打到的是**菜系**维度（说「筛选口味 辣」→ 变成找川菜）。
- **页面措辞（防误导）**：这三张卡上**不要**写「按口味／季节／食材筛」这类承诺，写成**「按菜系筛（当前 `filter` 走菜系）」**，或把这三张卡标 `【待开发】`；**不能装作它能筛口味**。归票：票 5（页面文案）＋票 6（命令接线）；原报告把它推给票 3（只读调查票）接不住，已改指。

## 七、可入库骨架的机器可读清单草案

**这只是给票 5 的输入，不是最终资产。** 形状照通用 help 模板契约的三层 `groups → subgroups → scenes`（`packages/base-render/src/spec/help.ts:54-59`）；字段名照契约用**复数 `types` 数组**，不用老代的单数 `type` 字符串（同文件 `:22` `SCENE_TYPE_FIELD = 'types'`，`:8-9` 明写不提供单数别名）。场景 6 键 = `id`／`title`／`wake_word`／`types`／`status`／`prompt_template`。

**映射口径（本草案用的）**：

| 老字段 | 契约字段 | 说明 |
| --- | --- | --- |
| `$.scenarios[].scenario_id` | `scenes[].id` | 逐字 |
| `$.scenarios[].scenario_title` | `scenes[].title` | 逐字 |
| `$.scenarios[].wake_word` | `scenes[].wake_word` | 逐字（＝老 `$.wake_words[].name`） |
| `$.scenarios[].type`（单数，11 型字符串） | `scenes[].types`（数组） | 按 `+` 拆开、去掉「(过程型)」这类括号注 |
| `$.scenarios[].status`（48/48 空串） | `scenes[].status` | 逐字 |
| `$.scenarios[].prompt` | `scenes[].prompt_template` | 逐字（含 `{{菜名}}` 这类填写位） |
| `$.wake_words[].name`（33 组） | `subgroups[].id` 与 `subgroups[].label` | 老 HELP 的一级手风琴降为第二层；`id` 用老件原词，不自造 |
| 老 10 域 | `groups[].id`／`label`／`icon` | `id` 取域文件 `domain.key`；`label` 取 `domain.name`；`icon` 取 `domain.icon` |
| `$.scenarios[].dimensions`（46/48 卡有内容、80 条、42 键） | `scenes[].editable_fields`（数组） | **本次整改补的映射**（原文此格零字）：键→`name`、值→`hint`、另补 `label`／`required`；逐键归位四类规则见本节「`dimensions` 的落法」 |
| `$.scenarios[].result`（48/48、1,970 字） | — | **不迁**（契约 6 键无此位）；理由与将来去处见本节「不迁清单」 |
| `$.scenarios[].html`（48/48，子键 `template`／`command_cn`／`data_source`） | — | **不迁**；只迁 `dirname(template)` 反推域这一用；理由见「不迁清单」 |
| `$.scenarios[].variants`（48/48，**`$.scenarios[]` 下 48 处**全空数组；整份载荷里 96 处 ＝ 48 顶层 ＋ 48 `$.wake_words[].scenarios[]` 嵌套视图） | — | **不迁**（零内容损失）；见「不迁清单」 |
| `$.scenarios[].domain`（13/48，值为**中文名**） | `groups[].id`（域层已由组归属取代） | **不迁**；只作域归属的交叉校验；且与域文件场景级的**英文 key** 值域不同 |
| 老件 4 条别名、`aliases_expanded_count=37` | — | **契约无字段位**，草案不含（详见 6.1 与「不迁清单」） |

**`dimensions` 的落法（整改补，H2／A 席 F1；与兄弟件 `t3-template-contract.md` §3.5 口子 1 同口径）**

**对应位＝`editable_fields`，不是 chip。** 契约侧逐条依据：

- 字段类型：`packages/base-render/src/spec/help.ts:30-36` 的 `SceneEditableField { name; label; value; hint?; required? }`；场景形状同文件 `:38-46`，第 7 键 `editable_fields?` 可选。
- 模板读法：`packages/base-render/assets/help-template.html:1669-1671` —— `params: (s.editable_fields||[]).map(f => ({key:f.name, label:f.label, value:f.value||'', req:!!f.required, hint:f.hint||''}))`；`params` 非空则卡片抽屉里**逐条出参数输入框**（`:1919-1924`，`p.hint` 作 placeholder、`p.req` 为假时标「选填」），必填未填会拦住复制（`:1766`），且每个填了的参数在**复制出去的指令正文**里追加一行 `label: value`（`buildPrompt` `:1753-1764`）。
- ⚠️ **一处不能混**：卡面 chip **只取 `s.wake_word`**（`:1665` `chip: s.wake_word`），`dimensions` 的任何一键**都不进 chip**。落 `editable_fields` 之后，卡面的识别信息仍只有唤醒词 chip 与类型徽章；`dimensions` 的两样东西分别落在**抽屉表单**（键／值／label／required）与**复制正文的追加行**上，**不上卡面**。

**实测（本次复核）**：48/48 张卡**都有** `dimensions` 这个键，其中 **46/48 非空**（共 **80 条**键值对）、键并集 **42 个**（合法 41 ＋ 畸形 1）；**2 张空对象**是 `list_all_recipes`／`first_use`；高频键 `recipe` 23／`input` 6／`focus` 4／`scope` 3（其后 `action`／`cuisine`／`ingredient`／`keyword`／`time_max`／`servings` 各 2）。

**逐键归位规则（四类，票 5 按此裁）**：

| 类 | 键 | 归位 |
| --- | --- | --- |
| **甲 · 直接成 `editable_fields` 条目** | `recipe`(23)／`ingredient`(2)／`focus`(4)／`servings`／`backdate`／`rating`／`feedback`／`keyword`／`cuisine`／`flavor`／`season`／`status`／`confirm`／`exclude_optional`／`stock_check`／`include_archived`／`step`／`field`／`new_value`／`source`／`target`／`differences`／`child`／`parent`／`relation_type`／`change_summary`／`action`／`tab`／**`cookware`／`difficulty`／`group_by`／`ingredient_exclude`／`ingredient_swap`／`progress`／`time_max`(2)／`user_state`**（后 8 键为本轮补，逐键见下表） | 键 → `name`（英文原词）；值（中文示例值文案，如 `recipe: 指定菜名`）→ `hint`；另补 `label`（中文，可沿用老 33 组名／域名词表）与 `required`（老件的值里带「必填／选填」字样，可据此派生） |
| **乙 · 语义是「对象范围」而非填写位** | `scope`(3)（值恒为「全部食谱」）／**`extra`／`history`／`step_type`**（后 3 键为本轮补，逐键见下表） | 建议**降为 `hint` 文案或直接不迁**；若迁，`scope` 作 `name`、`全部食谱` 作 `value` 预填 |
| **丙 · 语义是「输入载体」而非可写参数** | `input`(6)（值形如 `图片`／`MD 文件`／`JSON 文件`／`表单`／`对话逐步补充`） | 建议**不迁为表单字段**，改写进 `prompt_template` 文案（这些卡本来就写 `[发送图片] 录入这道菜。`）；若要留，`input` 作 `name`、载体名作 `hint` |
| **丁 · 畸形键** | `默认不含)`（1 张卡 `data_export_backup`，值 `null`） | **丢弃，不迁**；同时把同卡 `include_archived` 的 `hint` 补全——老件那句「是否含已废弃(选填,默认不含)」被 YAML 折行劈成了两个键，畸形键就是这么来的（补齐后为「是否含已废弃(选填，默认不含)」） |
| **四类合计（本轮闭合自检）** | **甲 36 键／67 条 ＋ 乙 4 键／6 条 ＋ 丙 1 键／6 条 ＋ 丁 1 键／1 条 ＝ 42 键／80 条** | 36 ＋ 4 ＋ 1 ＋ 1 = **42 键**（＝键并集 42，不漏不重）；67 ＋ 6 ＋ 6 ＋ 1 = **80 条**（＝键值对总数 80） |

**本轮补：原四类漏掉的 11 键逐键归位（原版只覆盖 31/42 键）**。漏的是 `cookware`／`difficulty`／`extra`／`group_by`／`history`／`ingredient_exclude`／`ingredient_swap`／`progress`／`step_type`／`time_max`／`user_state`，共 **11 键、12 条键值对**（`time_max` 2 条）。下表逐键给**实测出现卡与老值原文**（`JSON.parse` 老载荷后按 `$.scenarios[]` 数）与归位理由；甲／乙／丙／丁 四类框架同上一张表。

| 键 | 出现卡（`scenario_id`，条数） | 老值原文 | 归位 | 值长什么样、为什么这么归 |
| --- | --- | --- | --- | --- |
| `cookware` | `filter_by_cookware`（1 条） | `"砂锅/高压锅等"` | **甲** | 值是**用户要填的炊具名**——该卡 prompt 逐字写「用砂锅做的菜。」，值就是这句话里的「砂锅」；与已归甲的 `cuisine`（值 `川`）同类：都是「按某一维筛选」的那一维取值 ⇒ 直接成 `editable_fields` 条目。 |
| `difficulty` | `filter_difficulty_easy`（1 条） | `"简单/快手菜"` | **甲** | 值是**难度档**——prompt「来个简单的。」；用户可改（简单／中等／复杂），属可写参数 ⇒ 直接成条目，`hint` 沿用老值当示例。 |
| `extra` | `filter_combined`（1 条） | `"可加第 3 维"` | **乙** | 值**不是用户填的内容，是这张卡的能力说明**（组合筛选最多三维）；用户不会在参数框里填「可加第 3 维」⇒ 与 `scope` 同属「不是填写位」的一类，建议并进同卡 `cuisine`／`time_max` 条目的 `hint` 文案或不迁。 |
| `group_by` | `view_ingredients_grouped`（1 条） | `"分类"` | **甲** | 值是**分组方式**——该卡 prompt 逐字写「{{菜名}}的食材按肉/菜/调料分组给我。」；用户可改（按分类／按品类）⇒ 真填写位，直接成条目。 |
| `history` | `cooking_start_with_history`（1 条） | `"之前做过"` | **乙** | 值是**取哪一批记录的范围**，不是可写内容——该卡用户真正要填的是同卡 `recipe`（老值 `指定菜名`，落在 prompt 的 `{{菜名}}`）；与 `scope`（恒为「全部食谱」）同类 ⇒ 降为 `hint` 文案（「之前做过」）或不迁。 |
| `ingredient_exclude` | `filter_exclude_ingredient`（1 条） | `"不吃某食材"` | **甲** | 值是**排除条件**——prompt「不吃辣,有什么菜？」，「辣」就是要填的那个食材；`result` 亦写「AI 解析「不吃/不要/忌 X」为排除条件(NOT 查询)」⇒ 用户必须填才有内容，直接成条目。 |
| `ingredient_swap` | `view_recipe_with_substitution`（1 条） | `"替换某食材"` | **甲** | 值是**替换对象**——prompt「{{菜名}}里没有 X,能用 Y 代替吗？」，X／Y 两个空都在这一条上 ⇒ 真填写位，直接成条目。 |
| `progress` | `cooking_resume_after_pause`（1 条） | `"已做 N 步"` | **甲** | 值是**做到第几步**——同卡 prompt 里就是 `{{N}}`（「我刚才做到第 {{N}} 步,继续帮我做完。」）⇒ 真填写位，成 `name: progress`、`hint: 已做 N 步`；与 `{{菜名}}` 同例：prompt 里的填写位与 `dimensions` 的填写位是同一件事的两种写法，**不重复造第二个位**（`recipe` 同理）。 |
| `step_type` | `cooking_during_waiting_step`（1 条） | `"等待型(炖/烤/腌)"` | **乙** | 值是**步骤分类**（卡名「等待步骤中并行做其他」），描述这张卡针对哪一类步骤，不是用户填的内容——用户说的是「正在炖」，那句落在 prompt 与 `recipe` 上 ⇒ 与 `scope` 同类，降为同卡 `recipe` 条目的 `hint` 说明或不迁。 |
| `time_max` | `filter_combined`／`filter_time_quick`（**2 条**） | 两处都是 `"30 分钟"` | **甲** | 值是**时间上限**——两条 prompt 分别写「川菜里 30 分钟内能搞定的。」「30 分钟内的菜。」；用户可改（20 分钟／1 小时）⇒ 真筛选条件，直接成条目（**两张卡各出 1 条，共 2 条键值对**）。 |
| `user_state` | `view_for_beginner`（1 条） | `"新手"` | **甲** | 值是**用户自述状态**——prompt「我是新手,{{菜名}}的关键点是什么？」；用户会填（新手／老手）⇒ 与 `difficulty` 同属「按菜品/用户档位」的可写位，直接成条目。 |

**闭合自检（42 键全有归属）**：甲 **36 键／67 条**（原 28 键 58 条 ＋ 本轮 8 键 9 条）＋ 乙 **4 键／6 条**（`scope` 3 ＋ `extra`／`history`／`step_type` 各 1）＋ 丙 **1 键／6 条**（`input`）＋ 丁 **1 键／1 条**（畸形键 `默认不含)`）⇒ **36＋4＋1＋1 = 42 键** ✓、**67＋6＋6＋1 = 80 条** ✓，与本节上面「实测」那行的「键并集 42／共 80 条」逐数对上，**不漏不重**（11 键里 8 键进甲、3 键进乙，丙／丁不增键）。

**最终进 `editable_fields` 的键值对数 = 67 条（36 键）**：甲类全部进；乙类 6 条按建议降为 `hint` 文案或不迁（若用户裁「乙类也要成条目」，另加 6 条，但那与本节建议相抵）；丙类 6 条改写进 `prompt_template`、丁类 1 条丢弃——三类都不进 `editable_fields`。**2 张空对象卡不进**（见下段）。

**2 条空对象卡（`list_all_recipes`／`first_use`）的处置**：`dimensions` 是空对象 → **不出 `editable_fields`**（写空数组 `[]` 与「无此键」在模板侧等价：`(s.editable_fields||[])` → 无参数区）。**不要为它们凭空造参数**。`first_use` 老 prompt 里的「范 围: ______」属它自己 `prompt` 文本里的填写位（与 `{{菜名}}` 同类话题），**不由 `dimensions` 承担**。

**归属票**：转换本身属**票 5（内容资产入库）**；但「`dimensions` 要不要整体进契约」是**跨票归属**——它同时决定票 5 的资产形状、票 6 的渲染接线、以及**本草案要不要从 6 键扩到 7 键**。⇒ **需由结构设计闸门票（票 6 第一／二步）统一裁定后再定**，不能只在票 5 单方面决定。

**不做的后果**：`recipe`(23)／`input`(6)／`focus`(4)／`scope`(3) 等**静默消失**——页面不报错、快照不断言、肉眼也未必一眼看出，但维护者打开卡片抽屉会看到**老件里有的参数输入框全没了**，复制出去的指令从「帮我做一道 ___」退化成一句没有槽位的死文案。

**不迁清单（整改补，H3／A 席 F2）**

| 项 | 量（实测） | 不迁的理由 | 将来若要显示，该动谁 |
| --- | --- | --- | --- |
| `result` | **48/48 有值，合计 1,970 字**（老页面每卡渲染「→ 结果说明」一行；是这 48 张卡**唯一的一句话内容说明**） | 契约场景 6 键里**没有这个位**（`help.ts:38-46`，`additionalProperties: false`），模板全文不读它；与 `prompt_template`（复制正文）语义不重叠，无处塞；并入 `title` 会把卡名撑成两句（卡名是一行，`:1789`） | **公共层**：要给卡片加「结果说明」行，得改共享 help 模板与 `Scene` 契约——**另立票**，不在本图内 |
| `variants` | 48/48 键都在，**48 处（`$.scenarios[]` 下）全是空数组**；整份载荷 96 处 ＝ 48 顶层 ＋ 48 `$.wake_words[].scenarios[]` 嵌套视图（同一批卡的两份视图，不是两倍的量；同一陷阱见第八节第 11 条前身的数法） | 零内容损失（空数组不带信息） | 不需要；写在这里只为票 11 别把它当缺项 |
| `html.*` | 48/48；子键固定 `template`（**18 个**路径）／`command_cn`／`data_source`；合计 4,301 字 | `template` 的**目录名**已用于反推 10 域（第四节），反推完这个字段在契约里没有位；`command_cn`／`data_source` 是**老渲染管线的实现细节**（交给老 `render_*.py`），新契约的对应物是新仓 `chef.*` 的 8 条命令，不是老脚本名。**口径与兄弟件 t1 整改一致：只迁 `dirname(template)` 反推域这一用** | **公共层**（模板加位＋**另立票**） |
| `aliases_expanded_count=37` | 1 个顶层数 | 契约无此位；且老页面 hero 的 37 是**唤醒词**计数，新模板 hero 一律＝**场景卡总数 48**（`help-template.html:1772`），照抄就是假数 | 不需要；页面计数写「48 场景」（详 6.1） |
| 4 条别名（`开始做菜`／`不想要`／`删掉`／`废弃`） | 4 条，挂 2 组 | 契约 `Scene.wake_word` 是**单个**字符串，无别名字段位（详 6.1） | **公共层**（契约加位＋**另立票**）；其中 `开始做菜` 已在新表升为独立唤醒词，见 5.1 |
| `domain`（载荷侧） | 13/48（值为**中文名**） | 域层已由 `groups[].id` 取代；只作反推域的**交叉校验**用（值域差异见第四节） | 不需要 |

**一句话**：这张清单的作用是让票 5 与维护者一眼看到**「丢了什么、为什么丢、要显示该找谁」**——任何一项都不许静默消失（主审查 H3 的原话：`result` 属于「必须明写不迁或另想办法」的一项）。

```json
{
  "skill_name": "私家大厨",
  "title": "私家大厨 · 能力速查",
  "version": "0.1.0",
  "groups": [
    {
      "id": "cook",
      "icon": "🍳",
      "label": "做菜",
      "subgroups": [
        {
          "id": "做菜模式",
          "label": "做菜模式",
          "scenes": [
            {"id": "cooking_start_fresh", "title": "全新开始(含每步内联 + 完结闭环)", "wake_word": "做菜模式", "types": ["向导", "选择", "回执"], "status": "", "prompt_template": "帮我做一道{{菜名}},我要按步骤来。"},
            {"id": "cooking_start_with_history", "title": "含上次经验(历史驱动再开做)", "wake_word": "做菜模式", "types": ["向导", "选择", "回执"], "status": "", "prompt_template": "再做一次{{菜名}},上次做得不错但想改进。"},
            {"id": "cooking_start_double_servings", "title": "双份份量", "wake_word": "做菜模式", "types": ["向导", "选择", "回执"], "status": "", "prompt_template": "做{{菜名}},今晚来客人,做两人份。"},
            {"id": "cooking_resume_after_pause", "title": "断点续做(AI 会话记忆)", "wake_word": "做菜模式", "types": ["向导", "选择", "回执"], "status": "", "prompt_template": "我刚才做到第 {{N}} 步,继续帮我做完。"},
            {"id": "cooking_during_waiting_step", "title": "等待步骤中并行做其他", "wake_word": "做菜模式", "types": ["向导", "选择", "回执"], "status": "", "prompt_template": "{{菜名}}正在炖,我能去干别的吗？"}
          ]
        }
      ]
    },
    {
      "id": "view",
      "icon": "👀",
      "label": "查看",
      "subgroups": [
        {
          "id": "查看食谱",
          "label": "查看食谱",
          "scenes": [
            {"id": "view_full_recipe", "title": "完整食谱", "wake_word": "查看食谱", "types": ["查看"], "status": "", "prompt_template": "看看{{菜名}}怎么做。"},
            {"id": "view_for_beginner", "title": "新手强调(关键成功点)", "wake_word": "查看食谱", "types": ["查看"], "status": "", "prompt_template": "我是新手,{{菜名}}的关键点是什么？"},
            {"id": "view_recipe_with_substitution", "title": "替换食材预览(临时假设)", "wake_word": "查看食谱", "types": ["查看", "选择"], "status": "", "prompt_template": "{{菜名}}里没有 X,能用 Y 代替吗？"}
          ]
        },
        {
          "id": "查看食材",
          "label": "查看食材",
          "scenes": [
            {"id": "view_ingredients_only", "title": "只看食材", "wake_word": "查看食材", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}需要哪些食材？"},
            {"id": "view_ingredients_grouped", "title": "食材分组(11 大类)", "wake_word": "查看食材", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}的食材按肉/菜/调料分组给我。"}
          ]
        },
        {
          "id": "查看步骤",
          "label": "查看步骤",
          "scenes": [
            {"id": "view_steps_only", "title": "只看步骤", "wake_word": "查看步骤", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}怎么做？详细步骤。"}
          ]
        },
        {
          "id": "查看营养",
          "label": "查看营养",
          "scenes": [
            {"id": "view_nutrition_only", "title": "只看营养", "wake_word": "查看营养", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}的热量和蛋白质多少？"}
          ]
        },
        {
          "id": "查看背景",
          "label": "查看背景",
          "scenes": [
            {"id": "view_background_only", "title": "只看背景文化", "wake_word": "查看背景", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}有什么历史典故？"}
          ]
        }
      ]
    },
    {
      "id": "search",
      "icon": "🔍",
      "label": "搜索筛选",
      "subgroups": [
        {
          "id": "搜索食谱",
          "label": "搜索食谱",
          "scenes": [
            {"id": "search_by_name_keyword", "title": "关键词搜索(菜名/食材)", "wake_word": "搜索食谱", "types": ["查看"], "status": "", "prompt_template": "搜索排骨。"},
            {"id": "search_fuzzy_match", "title": "错字模糊匹配(纠错提示)", "wake_word": "搜索食谱", "types": ["查看"], "status": "", "prompt_template": "搜索宫暴鸡丁(应为宫保)。"}
          ]
        },
        {
          "id": "筛选菜系",
          "label": "筛选菜系",
          "scenes": [
            {"id": "filter_cuisine_basic", "title": "按菜系筛选", "wake_word": "筛选菜系", "types": ["查看"], "status": "", "prompt_template": "川菜有哪些？"},
            {"id": "filter_combined", "title": "多维组合筛选(≤3 维)", "wake_word": "筛选菜系", "types": ["查看"], "status": "", "prompt_template": "川菜里 30 分钟内能搞定的。"}
          ]
        },
        {
          "id": "筛选食材",
          "label": "筛选食材",
          "scenes": [
            {"id": "filter_by_ingredient_basic", "title": "按食材筛选", "wake_word": "筛选食材", "types": ["查看"], "status": "", "prompt_template": "哪些菜里有虾。"},
            {"id": "filter_exclude_ingredient", "title": "排除食材(忌口)", "wake_word": "筛选食材", "types": ["查看"], "status": "", "prompt_template": "不吃辣,有什么菜？"}
          ]
        },
        {
          "id": "筛选难度",
          "label": "筛选难度",
          "scenes": [
            {"id": "filter_difficulty_easy", "title": "按难度筛选", "wake_word": "筛选难度", "types": ["查看"], "status": "", "prompt_template": "来个简单的。"}
          ]
        },
        {
          "id": "筛选时间",
          "label": "筛选时间",
          "scenes": [
            {"id": "filter_time_quick", "title": "按时间筛选(30 分钟内)", "wake_word": "筛选时间", "types": ["查看"], "status": "", "prompt_template": "30 分钟内的菜。"}
          ]
        },
        {
          "id": "筛选炊具",
          "label": "筛选炊具",
          "scenes": [
            {"id": "filter_by_cookware", "title": "按炊具筛选", "wake_word": "筛选炊具", "types": ["查看"], "status": "", "prompt_template": "用砂锅做的菜。"}
          ]
        },
        {
          "id": "筛选口味",
          "label": "筛选口味",
          "scenes": [
            {"id": "filter_by_flavor", "title": "按口味筛选", "wake_word": "筛选口味", "types": ["查看"], "status": "", "prompt_template": "辣的菜有哪些。"}
          ]
        },
        {
          "id": "筛选季节",
          "label": "筛选季节",
          "scenes": [
            {"id": "filter_by_season", "title": "按季节筛选", "wake_word": "筛选季节", "types": ["查看"], "status": "", "prompt_template": "夏天适合吃什么。"}
          ]
        },
        {
          "id": "筛选状态",
          "label": "筛选状态",
          "scenes": [
            {"id": "filter_by_status", "title": "按状态筛选", "wake_word": "筛选状态", "types": ["查看"], "status": "", "prompt_template": "已做的菜。"}
          ]
        },
        {
          "id": "查看全部",
          "label": "查看全部",
          "scenes": [
            {"id": "list_all_recipes", "title": "列出所有食谱", "wake_word": "查看全部", "types": ["查看"], "status": "", "prompt_template": "查看全部。"}
          ]
        }
      ]
    },
    {
      "id": "update",
      "icon": "✏️",
      "label": "修改",
      "subgroups": [
        {
          "id": "修改食谱",
          "label": "修改食谱",
          "scenes": [
            {"id": "update_main_fields", "title": "修改食谱主信息", "wake_word": "修改食谱", "types": ["对比", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我修改食谱(唤醒词:修改食谱):\n菜  名: _____________\n要改什么: _____________ (如: 难度改简单 / 份量改 4 人份 / 总时间改 30 分钟)"}
          ]
        },
        {
          "id": "修改步骤",
          "label": "修改步骤",
          "scenes": [
            {"id": "update_step_content", "title": "修改步骤(内容/重排)", "wake_word": "修改步骤", "types": ["对比", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我修改步骤(唤醒词:修改步骤):\n菜  名: _____________\n改哪个步骤: _____________ (如: 第 2 步)\n改成什么: _____________ (内容,或「把第 2 步和第 3 步换一下」)"}
          ]
        },
        {
          "id": "修改食材",
          "label": "修改食材",
          "scenes": [
            {"id": "update_ingredient", "title": "修改食材(用量/添加/关联步骤)", "wake_word": "修改食材", "types": ["对比", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我修改食材(唤醒词:修改食材):\n菜  名: _____________\n改什么食材: _____________ (如: 虾仁用量改 300g / 加一味生抽 / 生抽关联到第 2 步)"}
          ]
        },
        {
          "id": "废弃食谱",
          "label": "废弃食谱",
          "scenes": [
            {"id": "discard_recipe", "title": "废弃食谱(只增不删)", "wake_word": "废弃食谱", "types": ["确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我废弃食谱(唤醒词:废弃食谱):\n菜  名: _____________"}
          ]
        }
      ]
    },
    {
      "id": "history",
      "icon": "📜",
      "label": "历史",
      "subgroups": [
        {
          "id": "记录做菜",
          "label": "记录做菜",
          "scenes": [
            {"id": "record_cook", "title": "记录做菜(完整 + 快速 + 补录)", "wake_word": "记录做菜", "types": ["采集", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我记录做菜(唤醒词:记录做菜):\n菜  名: _____________\n评  分: _____________ (选填,0-5 可带小数)\n反  馈: _____________ (必填,一句话真实反馈,如「虾很Q弹,下次少放盐」)\n日  期: _____________ (选填,补录填昨天日期,默认今天)"}
          ]
        },
        {
          "id": "查看历史",
          "label": "查看历史",
          "scenes": [
            {"id": "view_history_list", "title": "历史时间线", "wake_word": "查看历史", "types": ["查看"], "status": "", "prompt_template": "看看{{菜名}}的烹饪历史。"}
          ]
        },
        {
          "id": "查看统计",
          "label": "查看统计",
          "scenes": [
            {"id": "view_stats_dashboard", "title": "单菜统计", "wake_word": "查看统计", "types": ["查看"], "status": "", "prompt_template": "{{菜名}}的平均评分是多少?做过几次?"},
            {"id": "view_stats_global", "title": "全局统计(整体画像)", "wake_word": "查看统计", "types": ["查看"], "status": "", "prompt_template": "帮我看看我最近的厨艺整体情况。"}
          ]
        }
      ]
    },
    {
      "id": "shopping",
      "icon": "🛒",
      "label": "采购",
      "subgroups": [
        {
          "id": "生成清单",
          "label": "生成清单",
          "scenes": [
            {"id": "shopping_generate", "title": "生成采购清单", "wake_word": "生成清单", "types": ["查看", "勾选"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我生成采购清单(唤醒词:生成清单):\n菜  名: _____________ (1 个或多个,如: 宫保虾球,辣炒虾球)\n份  数: _____________ (选填,如 2 表示双份;多菜可用 2,1 分别指定)\n排除可选: _____________ (选填,填「排除」则不含可选食材)\n核对家里库存: _____________ (选填,默认核对;不需要填「不核对」;核对由 AI 联动「居家管家」查询,你无需操作)"}
          ]
        }
      ]
    },
    {
      "id": "add",
      "icon": "📝",
      "label": "录入",
      "subgroups": [
        {
          "id": "录入食谱",
          "label": "录入食谱",
          "scenes": [
            {"id": "add_from_image", "title": "图片录入(识别图片)", "wake_word": "录入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "[发送图片] 录入这道菜。"},
            {"id": "add_from_markdown", "title": "MD 文件录入", "wake_word": "录入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "[发送 MD 文件] 录入。"},
            {"id": "add_from_conversation", "title": "对话录入(逐步收集)", "wake_word": "录入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我录入一道新菜(唤醒词:录入食谱):"},
            {"id": "add_from_template", "title": "结构化模板录入(表单)", "wake_word": "录入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "用表单方式录入这道菜。"}
          ]
        },
        {
          "id": "导入食谱",
          "label": "导入食谱",
          "scenes": [
            {"id": "import_from_json", "title": "JSON 文件导入", "wake_word": "导入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "导入食谱 [JSON 文件]。"},
            {"id": "import_validation_failed", "title": "导入校验失败(补齐后重试)", "wake_word": "导入食谱", "types": ["采集", "回执"], "status": "", "prompt_template": "导入这个 JSON。"}
          ]
        }
      ]
    },
    {
      "id": "relation",
      "icon": "🌿",
      "label": "派生",
      "subgroups": [
        {
          "id": "添加派生关系",
          "label": "添加派生关系",
          "scenes": [
            {"id": "add_relation", "title": "添加派生关系", "wake_word": "添加派生关系", "types": ["采集", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我添加派生关系(唤醒词:添加派生关系):\n子  菜: _____________ (如: 宫保虾球)\n父  菜: _____________ (如: 宫保鸡丁)\n关系类型: _____________ (派生 / 变体 / 改良)\n改动说明: _____________ (必填,如「鸡丁换虾球,减辣」)"}
          ]
        },
        {
          "id": "查看派生关系",
          "label": "查看派生关系",
          "scenes": [
            {"id": "view_relation_tree", "title": "查看派生关系(家族树)", "wake_word": "查看派生关系", "types": ["查看"], "status": "", "prompt_template": "看看{{菜名}}的家族关系。"}
          ]
        },
        {
          "id": "从已有派生新菜",
          "label": "从已有派生新菜",
          "scenes": [
            {"id": "derive_from_existing", "title": "从已有派生新菜", "wake_word": "从已有派生新菜", "types": ["采集", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我从已有菜谱派生新菜(唤醒词:从已有派生新菜):\n母  本: _____________ (如: 咖喱牛腩)\n新菜名: _____________ (如: 咖喱鸡)\n差  异: _____________ (如: 牛腩换鸡,咖喱少放,加椰浆)"}
          ]
        }
      ]
    },
    {
      "id": "setup",
      "icon": "🚀",
      "label": "开始使用",
      "subgroups": [
        {
          "id": "首次使用",
          "label": "首次使用",
          "scenes": [
            {"id": "first_use", "title": "首次使用(初始化工作流)", "wake_word": "首次使用", "types": ["向导", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我完成首次使用初始化(唤醒词:首次使用):"}
          ]
        }
      ]
    },
    {
      "id": "data",
      "icon": "🗄️",
      "label": "数据管理",
      "subgroups": [
        {
          "id": "体检",
          "label": "体检",
          "scenes": [
            {"id": "data_quality_report", "title": "数据质量报告", "wake_word": "体检", "types": ["查看"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我做一次菜谱库体检(唤醒词:体检):\n范  围: _____________ (选填,默认全部食谱)"}
          ]
        },
        {
          "id": "批量改",
          "label": "批量改",
          "scenes": [
            {"id": "data_batch_edit", "title": "批量编辑", "wake_word": "批量改", "types": ["采集", "确认", "回执"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我批量编辑菜谱(唤醒词:批量改):\n菜  名: _____________ (如: 宫保虾球)\n改哪个部分: _____________ (食材 / 步骤 / 标签)"}
          ]
        },
        {
          "id": "备份",
          "label": "备份",
          "scenes": [
            {"id": "data_export_backup", "title": "导出备份", "wake_word": "备份", "types": ["转移"], "status": "", "prompt_template": "请加载「私家大厨」技能,帮我备份菜谱库(唤醒词:备份):\n范  围: _____________ (选填,默认全部;要含已废弃的填「含废弃」)"}
          ]
        }
      ]
    }
  ]
}

```

草案自检（脚本 `05-emit-blocks.py` 与 `08-doc-check.py`）：`json.loads` 可解析；三层计数 = **10 组／33 子组／48 场景**；10 个英文组 id、33 个中文子组 id、48 个蛇形场景 id 两两不冲突；每场景恰好契约 6 键、用复数 `types`、无单数 `type`。逐项见文末「自检 5」。

**一处自检改正（A 席 F7）**：原文那句「场景 id 集合与载荷 `$.scenarios` 全等」是**空集对空集的恒真断言**——载荷 48 张卡**根本没有 `id` 键**（它的键名是 `scenario_id`），拿 `scenario_id` 当 `id` 才让那句成立。已改成**真断言**：载荷 48 条的 `scenario_id` 集合 ＝ 映射后的草案 `id` 集合（**48/48 全等**），且两侧各自 48 个唯一（文案见文末「自检 5」D6 行）。

## 八、不确定项与给票 5／票 6 的输入

**给票 5（内容资产入库）的输入**

1. **第一节的 10 个英文名直接可用**：`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`，出处是老件自己的 `domain.key`，不是自创。
2. **第七节的 JSON 草案可直接当起点**，但三处要票 5 拍：
   - `types` 数组的配色：模板内置的 `TYPE_DEFAULT` 只有 10 个键（`采集`／`查看`／`结果`／`向导`／`批量`／`校验`／`选择`／`过程`／`回执`／`录入`，`packages/base-render/assets/help-template.html:1698-1709`）。老件 11 型拆出来，**草案实际用到且没有内置配色**的值是 **4 个**：`勾选`／`对比`／`确认`／`转移`。**改正（A 席 F6）**：原文写「5 个」（多算了 `下载`），但 `下载` 在 `转移(下载) → ['转移']` 那一步就被丢掉、**从不进入草案**。这 4 个要么走 `{text,bg,fg}` 对象形态，要么补进 `TYPE_DEFAULT`（补配色表属**公共层**改动，须另立票）。
   - `转移(下载)` 拆成 `['转移']` 会丢掉「下载」这个信息；`对比+确认+回执(过程型)` 拆成 `['对比','确认','回执']` 会丢掉「过程型」。括号注怎么处理要票 5 定。
   - `subgroups[].id` 草案用了老件的中文组名（`做菜模式` 等 33 个）。契约只要求 `type: string` 且**组 id 与场景 id 全局唯一**（`help.ts:132`／`:141`／`:155`）；草案的 10 个英文组 id、33 个中文子组 id、48 个蛇形场景 id **两两不冲突**（`03-reconcile.py` CHK9 通过）。要不要改成英文由票 5 定。
3. **12 条「无落点」卡的状态怎么标**：老件 `status` 48/48 空串、页面恒显「✓ 可用」（地图 Notes 已记为老件死代码／源资产 bug——**不能照抄**；旧卡一条 `【待开发】` 都没标过，`references/scenarios.yaml:20`／`:26` 与 `派生.yaml:40` 那 3 处出现的是**规则注释**、不是卡数据）。新契约 `status` 只允许 `''` 或 `【待开发】`（`help.ts:17`、`:172`）。
   **后果（整改补，B 席第 7 问）**：共享模板**只在 `status === '【待开发】'` 时加「待开发」徽章**（`help-template.html:1667`／`:1726`）——标 `''` 的卡**什么都不显示**，外观与可用卡**完全一样**。所以这 12 张承接不了的卡若保持 `''`，维护者在页面上分不出「哪些说了有反应、哪些没有」。**与 3.2 的 chip 三选一联读**：标 `【待开发】` 是唯一「不改老组名也让人看得出」的手段，但它**不解决路由**。哪些卡标 `【待开发】`，票 5 定。
4. **`体检` 的域归属与语义**：老骨架归「数据管理」（`scenes/数据管理.yaml:49` 场景级 `domain: data`；`L48` = `- id: "data-1"`），新命令挂 `chef.history.query kind=quality`；**并且语义也不同**——老卡是「菜谱完整度评分（食材/步骤/贴士/技法/背景各 20 分）」，新命令算的是「做过几次／平均评分／低分次数」的口碑统计（`cmd_read.ts:299-317`）。归属与语义两头都冲突，二者只能选一；**页面措辞见 6.4 第 1 条**，票 5 定。
5. **老件 4 条别名与 3 条文档级子词**（`修改难度`／`修改份量`／`排除可选`）在 HELP 里的去留：契约没有别名字段位（6.1 节）；`排除可选` 在新表已经是独立唤醒词，要不要在「生成清单」组下补一张卡，票 5 定（判据见 5.1）。
6. **本报告只给「老骨架 ＋ 新表多出」的并集，草案 JSON 里不含新表多出的条目**：草案 JSON 是**老 48 张卡的逐字搬运**。按用户定案「新表多出的补进对应域」，票 5 要把第五节那 15 条追加进对应组——**内容从哪来、逐条要不要新写，已在 5.1 给全**（9 条可复用老卡文案／3 条必须新写／1 条不造卡）；**落位步长照 bill 规矩：接在对应二级组的末尾**，不新开组、不把 33 组撑大。

**给票 6（渲染接线）的输入**

7. 能力目录名取第一节那 10 个英文名——但注意**只有 `help` 是仓里现成的一级目录名**，其余 9 个都要新建，且整包重排不在本图内（地图已立票）。
8. `subgroups` 的第二层用哪一套，票 6 要跟着票 5 走：老 33 个唤醒词组（本草案用的）是一种；老域文件里还有一套**更粗的 `sub` 字段**（`scenes/<域>.yaml` 每张卡都带 `sub`，10 域各 1–3 个值，例：查看域 `全览`×3／`局部聚焦`×5，搜索筛选域 `关键词搜索`×2／`维度筛选`×10／`查看全部`×1）。两套都能填满 `subgroups`，本报告不给结论。
   **版面提示（整改补，B 席第 5 问）**：共享模板的子组是 `<details open>`（`help-template.html:1784`）——搜索筛选域那一页的 10 个子组会**同时全展开**。票 6 若要收窄版面，得在模板侧或 `subgroups` 层想办法，本报告只报事实。
9. **卡面会照原样渲染 chip 与徽章**：chip＝`s.wake_word`（`:1665`）；只有 `status === '【待开发】'` 才出「待开发」徽章（`:1667`／`:1726`）。所以第三节表末列那 14 个 ✗ 会**照原样上页面**（除非用户按 3.2 裁了别的路）。

**票 6 入参取值来源表（整改补，H5）**

票 6 的入口是 5 项必填 ＋ 若干可选（`packages/base-render/src/helpShell.ts:16` 的接入示例、`:22-28` 的接口）。本报告原先只覆盖 3 项（`skill_name`／`title`／`groups`），下表补齐；**「A 路是否渲染」是读共享 help 模板实测的结果**，不是推测：

| 入参 | 形状 | 取值来源（老件里能从哪拿） | 谁供 | A 路是否渲染（实测） |
| --- | --- | --- | --- | --- |
| `skill_name` | string | 老件叫法「私家大厨」（老 `SKILL.md`） | 票 5／票 6 | **渲染**：hero 的 eyebrow（`:1772`）与「关于」页版本段的技能名（`:1817`） |
| `title` | string | 老件叫法「能力速查」（草案取「私家大厨 · 能力速查」） | 票 5／票 6 | **渲染**：hero 的 `<h1>`（`:1772`） |
| `subtitle` | string | **原文零字**。老件里**没有等价字段**：老 hero 那行是唤醒词计数文案，新模板该行已改成「`{48} 场景 · 点击卡片查看详情并复制指令`」（`:1772`） | **票 6 供**（老件无源可搬） | ⚠️ **读了不渲染**：`:1650` 只把它收进变量 `SUBTITLE`，模板全文**再无第二处使用**——填了它页面不会多一行 |
| `contact` | 对象 `{items:[{label,value,url?}], copy_all?}`（**不是字符串**） | **原文零字**。老件 `meta` 里没有；要填只能问用户（作者署名／主页） | **需用户给值**（本报告无源可搬，不自造） | ⚠️ **有值才渲染**：`:1801` 起渲染「关于」页的「联系作者」块，条件是 `CONTACT.items.length`；为空则**整块不渲染**，「关于」页只剩版本行——这正是 H5 点名的后果 |
| `groups` | 数组（本草案 10 组／33 子组／48 场景） | 第七节草案；组 `id`／`label`／`icon` 取十份域文件的 `domain.key`／`name`／`icon` | **票 5 供** | **渲染**：Tab（`:1830`）与手风琴主体；`groups` 为空会抛 `HelpShellError('missing-data')`（`helpShell.ts:17`） |
| `version` | string | 老载荷 `meta.version = 0.1.0`（实测） | 票 5 照抄 | **渲染**：「关于」页版本段 `私家大厨` ＋ `v0.1.0 · HELP 模板 v4`（`:1817`） |
| `meta_blocks` | 数组（可选块） | **原文零字**。老件 `meta` 只有 `version` 与 `help_wake_word`（实测），**没有等价块** | 票 6 供，或本图不做 | ⚠️ **读了不渲染**：`:1651` 收进 `META_BLOCKS`，模板全文**无第二处使用**（与 `subtitle` 同一种情况） |
| `init_banner` | 对象 `{title,subtitle,prompt,button_text,steps[],closable?,hidden?}`（可选块） | 老件无；本技能要不要顶部提示由用户定 | 票 6 供，或本图不做 | ✅ **真渲染**：`:1775-1776` 渲染顶部横幅（条件 `INIT_BANNER && !INIT_BANNER.hidden`），`steps` 逐条出步骤，`closable === false` 时不带关闭键 |
| `recommendations` | 数组 `[{name,desc,wake}]`（可选块） | 老件无；可列同图兄弟技能（记账／卡路里／居家／备忘录） | 票 6 供，或本图不做 | ✅ **真渲染**：`:1819-1823` 渲染「关于」页的「其他技能」块。⚠️ **字段名与契约不一致**：模板读 `r.name`／`r.desc`／`r.wake`，而 `packages/base-render/src/spec/help.ts:86-90` 的契约写 `reason`／`wake_word`——照契约填会渲染出**空描述**（B 席第 5 问附注，票 6 先核） |
| `about_extra` | — | 模板里有 `var ABOUT_EXTRA = {}`（`:1655`）但**全文未被使用**，也不是 `HelpShellData` 的键 | — | **不渲染**（写这一行只为票 6 别去猜它） |

**一句话**：5 项必填里 `subtitle`／`contact` 是**本报告无源可搬的两项**（H5 的缺口）；三块可选里 `meta_blocks` 和 `subtitle` 一样**填了也不显示**，`init_banner` 与 `recommendations` **会显示**——票 6 填表前照这张表核一遍，别把「填了没反应」当成缺陷。

**本报告自己没定死的地方（明写）**

9. 「有／改名／合并」三条的边界带判断成分（判定口径写在第三节开头）。最可争的是 4 条 `search` 维度卡（`filter_difficulty_easy`／`filter_time_quick`／`filter_by_cookware`／`filter_by_status`）：它们**命令层能承接**，只是没有专属唤醒词，本报告按口径算作「无落点」。若票 5 认为「命令层能承接就算有落点」，无落点条数会从 12 变成 7。
10. **`筛选食材`／`筛选口味`／`筛选季节` 三个新表唤醒词的槽位口径存疑**（事实，不是判断）：三条的 `needs` 都是 `['filter']`（`wakewords.ts:29-31`），而命令层把 `filter` 别名成**菜系**——`cmd_read.ts:125` `if (f.cuisine === undefined && typeof params.filter === 'string') f.cuisine = params.filter.trim()`；`src/help/lookup.ts:18` 也自述「`filter`＝菜系别名」。所以「筛选食材/口味/季节」这三条词实际打到的维度是 `cuisine`。**页面措辞见 6.4 第 4 条**；归票 **票 5（页面文案）＋票 6（命令接线）**——原报告写「归票 3」接不住这个决定（票 3 是只读调查票），已改指。
11. **`查食材` 的定位**：`wakewords.ts:27` 把它指到 `chef.recipe.search` 的 `q` 槽位（关键词搜索），而老件有两个不同的组——「查看食材」（查看域）与「筛选食材」（搜索筛选域）。本报告按命令槽位把它归到**搜索筛选／搜索食谱**组，票 5 可改。**内容来源见 5.1**：它与 `搜菜` 同命令同槽位，**判「老卡近义触发」、复用老卡 `search_by_name_keyword`**（标题逐字含「关键词搜索(菜名/食材)」）——两个词共用一张老卡，与 `看菜谱`／`看菜` 共用 `view_full_recipe` 同例。
12. **`清空清单` 与 `完成做菜` 在命令层没有对应分支**：`chef.shopping.query` 只做「按 names 合并清单」（`cmd_read.ts:251-262`），没有清空；`chef.cooking.run` 只做「渲染步骤页」（`cmd_read.ts:231-250`），没有「完结」。两条词在 `WAKE_TABLE` 里，但落到命令层是同一段逻辑。
13. **`SKILL.md` 的 HELP-AUTO 区行号会漂**：本次调查期间（读到的是 2026-09-12 11:25 的版本；本轮复核时该文件 mtime 已是 **11:43**，见 9.3 指纹表）另一个会话（票 #218 插件侧装机）给 `SKILL.md` 加了 frontmatter，文件从 74 行变成 78 行，HELP-AUTO 区从 L27–L69 移到 **L31–L73**。37 行内容逐字未变、顺序与 `WAKE_TABLE` 全等。引 `SKILL.md` 行号时请以当次文件为准。

## 九、证据目录

实验件全部在 `D:\ilife\.scratch\chef-help\t2\`。**只读**：没改 `packages/` 下任何文件，没动老技能目录，没跑仓级 build／test／snapshot。

### 9.1 跑过的命令与中间件

| 序 | 脚本／命令 | 输出件 | 干什么 |
| --- | --- | --- | --- |
| 1 | `node 01-dump-payload.mjs` | `01-dump-payload.out.txt`（206 行） | 从载荷解出 33 组／48 卡／10 域，做两份视图全等校验 |
| 2 | `python 02-parse-legacy-sources.py` | `02-parse-legacy-sources.out.txt`（131 行） | 三份老内容源（`scenes/*.yaml`／`references/scenarios.yaml`／载荷）三向对账 |
| 3 | `python 03-reconcile.py` | `03-reconcile.out.txt`（160 行） | 48 条逐条对新表落点 ＋ 9 项闭合校验 ＋ 契约草案 |
| 4 | `python 04-selfcheck.py` | `04-selfcheck.out.txt` | 自检四项全文 |
| 5 | `python 05-emit-blocks.py` | `05-emit-blocks.out.txt` | 紧凑版契约 JSON（第七节）＋ 第五节表行 |
| 6 | `python 06-assemble.py` | `06-assemble.out.txt` | 第一／二／四节的逐条表块（含行号） |
| 7 | `python 07-write-doc.py` | 本文件 | 拼装（所有表块从上面六份里取，不手抄） |

### 9.2 关键输出

三份老内容源对账（`02-parse-legacy-sources.out.txt`）：

```text
== D) THREE-WAY scenario_id SET DIFF ==
len(scenes/*.yaml)=48 unique=48
len(references/scenarios.yaml)=48 unique=48
len(payload.scenarios)=48 unique=48
agg == payload (order+content)? True
scenes-set == payload-set? True
only in scenes NOT in payload: []
only in payload NOT in scenes: []

== E) CARD-LEVEL DRIFT scenes/*.yaml  vs  payload ==
cards with drift = 0/48

== F) template dirname (payload)  vs  scenes-domain Chinese name ==
mismatch count = 0/48
```

十份域文件的文件级 `domain` 块（同文件 A 段）：

```text
修改.yaml     key=update    name=修改      icon='✏️'  g=G8   scenes=4
做菜.yaml     key=cook      name=做菜      icon='🍳'  g=G5   scenes=5
历史.yaml     key=history   name=历史      icon='📜'  g=G7   scenes=4
开始使用.yaml  key=setup     name=开始使用   icon='🚀'  g=G1   scenes=1
录入.yaml     key=add       name=录入      icon='📝'  g=G2   scenes=6
搜索筛选.yaml  key=search    name=搜索筛选   icon='🔍'  g=G4   scenes=13
数据管理.yaml  key=data      name=数据管理   icon='🗄️'  g=G10  scenes=3
查看.yaml     key=view      name=查看      icon='👀'  g=G3   scenes=8
派生.yaml     key=relation  name=派生      icon='🌿'  g=G9   scenes=3
采购.yaml     key=shopping  name=采购      icon='🛒'  g=G6   scenes=1
TOTAL cards in scenes/*.yaml = 48
domain count = 10
```

9 项闭合校验（`03-reconcile.out.txt`）：

```text
CHK1 rows=48 unique_ids=48 -> PASS
CHK2 domains=10 sum=48 per={'做菜': 5, '查看': 8, '搜索筛选': 13, '修改': 4, '历史': 4, '采购': 1, '录入': 6, '派生': 3, '开始使用': 1, '数据管理': 3} -> PASS
CHK3 LAND keys=48 cards=48 missing=[] extra=[] -> PASS
CHK4 WAKE_TABLE parsed=37 (expect 37)  ChefKeys=8 (expect 8) -> PASS
CHK5 SKILL.md HELP-AUTO rows=37 (expect 37) -> PASS
CHK6 tmpl-dir vs scenes-domain mismatch=0 -> PASS
CHK7 scenes ids==payload ids: True -> PASS
CHK8 groups spanning >1 domain = [] -> PASS
CHK9 id collisions group/subgroup/scene = [] -> PASS
OVERALL = PASS
```

老 11 型 `type` → 契约 `types` 数组（`03-reconcile.out.txt` TYPE_MAP 段）：

```text
向导+选择+回执        -> ["向导","选择","回执"]            cards=5
查看                 -> ["查看"]                        cards=25
查看+选择            -> ["查看","选择"]                  cards=1
对比+确认+回执(过程型)  -> ["对比","确认","回执"]            cards=3
确认+回执            -> ["确认","回执"]                  cards=1
采集+回执            -> ["采集","回执"]                  cards=7
查看+勾选(过程型)      -> ["查看","勾选"]                  cards=1
采集+确认+回执         -> ["采集","确认","回执"]            cards=1
向导+回执            -> ["向导","回执"]                  cards=1
采集+确认+回执(过程型)  -> ["采集","确认","回执"]            cards=2
转移(下载)            -> ["转移"]                        cards=1
distinct type strings = 11
```

### 9.3 文件指纹（调查时点）

| 文件 | 字节 | mtime | SHA-256（前 16 位） |
| --- | --- | --- | --- |
| `.scratch/chef-help/legacy-chef-help-payload.json` | 74,581 | 2026-09-12 10:11（整改时实测补上） | `C09F11D9FFA49E6B`（整改时亲手复算；**改正**：原文写 `AC18FB3C87039AC7`，与实测不符——A 席 §六） |
| `packages/skill-chef/src/policy/wakewords.ts` | 4,809 | 2026-09-07 08:23 | — |
| `packages/skill-chef/src/cli/cmd_read.ts` | 22,335 | 2026-09-07 08:23 | — |
| `packages/skill-chef/src/help/lookup.ts` | 2,998 | 2026-09-07 08:23 | — |
| `packages/skill-chef/src/fetch/index.ts` | 570 | 2026-09-07 00:19 | — |
| `packages/skill-chef/SKILL.md` | 7,756（78 行） | 2026-09-12 11:43（本轮实测；原文写 11:25，是票 #218 加 frontmatter 那一次的读数。**该文件正被票 #218 会话反复改写**：本轮复核后半程再测已到 12:00，故这一列只作「时点记录」——字节 7,756／78 行两次测量相同） | — |

git：`master` @ `60ba041a043ff60129f92094c3d45032c630b7da`。

## 自检（交付前必须做完，结果写进文件末尾）

以下为 `python 04-selfcheck.py` 的完整输出（脚本全文见 `.scratch/chef-help/t2/04-selfcheck.py`）：

```text
########## 自检 1 · 闭合校验 ##########
脚本：D:\ilife\.scratch\chef-help\t2\04-selfcheck.py（本文件）

[1a] 第三节表行数 = len($.scenarios) = 48；唯一 scenario_id = 48
     去重后集合大小 == 行数 ? True
     重复 id = []

[1b] 第一节 10 域 × 场景数：
     做菜 = 5
     查看 = 8
     搜索筛选 = 13
     修改 = 4
     历史 = 4
     采购 = 1
     录入 = 6
     派生 = 3
     开始使用 = 1
     数据管理 = 3
     域行数 = 10（应 10）  合计 = 48（应 48）

[1c] 第二节表行数 = len($.wake_words) = 33（应 33）
     第二节各域场景数合计 = sum(len(g["scenarios"])) = 48（应 48）
     按域汇总 = {'做菜': 5, '查看': 8, '搜索筛选': 13, '修改': 4, '历史': 4, '采购': 1, '录入': 6, '派生': 3, '开始使用': 1, '数据管理': 3}
     与第一节一致 ? True

########## 自检 2 · 每个域归属的三处佐证 ##########
[2a] 模板子目录（templates/<域>/）= ['修改', '历史', '开始使用', '录入', '搜索筛选', '派生']
[2b] 技能根 scripts/ 下的中文子目录 = ['__pycache__', 'migrations', '开始使用', '搜索筛选', '派生']
[2c] render_*.py = ['render_add.py', 'render_batch_edit.py', 'render_data.py', 'render_help.py', 'render_quality_report.py', 'render_修改.py', 'render_历史.py', 'render_开始使用.py', 'render_搜索筛选.py', 'render_派生.py']
[2d] wake_word_variants.md 分节标题（### ）=
       L19: ### 1 · 开始做菜
       L38: ### 2 · 查看食谱
       L58: ### 3 · 搜索食谱
       L77: ### 4 · 生成清单(采购)
       L96: ### 5 · 记录做菜
       L119: ### 派生关系(2 词)
       L123: ### 录入食谱(2 词)
       L127: ### 做菜模式/开始做菜(详见上面)
       L128: ### 查看食谱(5 词,详见上面)
       L134: ### 搜索筛选(8 词)
       L144: ### 修改食谱(5 词,4 入口经 aliases 共享)
       L152: ### 烹饪历史(2 词)
       L156: ### 采购清单(详见上面)
       L159: ### 帮助(1 词)

    逐域对表（✓=该处含此域的名字；✗=不含；~=含但主体不同，注明）：
    | 域 | ①模板目录名 templates/<域>/ | ②模板路径前缀 html.template 的目录名 | ③render_*.py 脚本名 | ④wake_word_variants.md 分节 | ⑤scenes/<域>.yaml 文件名 + 文件级 domain.key |
    | 做菜 | ✗ 无 | ✓ 做菜/ | ~ cooking_render.py:27 → templates/cooking_mode.html | L127「### 做菜模式/开始做菜(详见上面)」 | ✓ 做菜.yaml（key=cook，G5） |
    | 查看 | ✗ 无 | ✓ 查看/ | ~ recipe_render.py:29 → templates/recipe_view.html | L128「### 查看食谱(5 词,详见上面)」 | ✓ 查看.yaml（key=view，G3） |
    | 搜索筛选 | ✓ | ✓ 搜索筛选/ | ✓ render_搜索筛选.py:30 | L134「### 搜索筛选(8 词)」 | ✓ 搜索筛选.yaml（key=search，G4） |
    | 修改 | ✓ | ✓ 修改/ | ✓ render_修改.py:41 | L144「### 修改食谱(5 词,4 入口经 aliases 共享)」 | ✓ 修改.yaml（key=update，G8） |
    | 历史 | ✓ | ✓ 历史/ | ✓ render_历史.py:41 | L152「### 烹饪历史(2 词)」 | ✓ 历史.yaml（key=history，G7） |
    | 采购 | ✗ 无 | ✓ 采购/ | ~ shopping_render.py → templates/shopping_view.html | L156「### 采购清单(详见上面)」 | ✓ 采购.yaml（key=shopping，G6） |
    | 录入 | ✓ | ✓ 录入/ | ✓ render_add.py:41（+ scripts/录入/） | L123「### 录入食谱(2 词)」 | ✓ 录入.yaml（key=add，G2） |
    | 派生 | ✓ | ✓ 派生/ | ✓ render_派生.py:46（+ scripts/派生/） | L119「### 派生关系(2 词)」 | ✓ 派生.yaml（key=relation，G9） |
    | 开始使用 | ✓ | ✓ 开始使用/ | ✓ render_开始使用.py:28（+ scripts/开始使用/） | ✗ 无分节 | ✓ 开始使用.yaml（key=setup，G1） |
    | 数据管理 | ✗ 无 | ✓ 数据管理/ | ~ render_data.py:33 / render_batch_edit.py:34 / render_quality_report.py:16 / export_backup.py:39 | ✗ 无分节 | ✓ 数据管理.yaml（key=data，G10） |

########## 自检 3 · 抽查 5 条（拿原始 payload 文本逐字复核）##########
  [cooking_resume_after_pause] 在原始 payload 文本中可定位 ? True
     原文片段（截断 320 字，空白已折叠）：{ "scenario_id": "cooking_resume_after_pause", "scenario_title": "断点续做(AI 会话记忆)", "dimensions": { "recipe": "指定菜名", "progress": "已做 N 步" }, "prompt": "我刚才做到第 {{N}} 步,继续帮我做完。", "status": "", "result": "AI 凭会话记忆生成从第 N 步开始的做菜页(不依赖浏览器本地存储);页面顶部进度条显示位置。", "wake_word": "做菜模式", "type": "向导+选择+回执", "html": { "template": "做菜/co
     JSON.parse 后：title='断点续做(AI 会话记忆)' wake_word='做菜模式' type='向导+选择+回执' status='' tmpl='做菜/cooking_mode.html'
     scenes/*.yaml 域 = 做菜

  [filter_combined] 在原始 payload 文本中可定位 ? True
     原文片段（截断 320 字，空白已折叠）：{ "scenario_id": "filter_combined", "domain": "搜索筛选", "wake_word": "筛选菜系", "scenario_title": "多维组合筛选(≤3 维)", "dimensions": { "cuisine": "川", "time_max": "30 分钟", "extra": "可加第 3 维" }, "type": "查看", "status": "", "prompt": "川菜里 30 分钟内能搞定的。", "result": "AI 解析多维组合条件(≤3 维,§07 rule_2),展示交集结果;组合能力为所有筛选场景共享。", "html": { "temp
     JSON.parse 后：title='多维组合筛选(≤3 维)' wake_word='筛选菜系' type='查看' status='' tmpl='搜索筛选/data_view.html'
     scenes/*.yaml 域 = 搜索筛选

  [import_from_json] 在原始 payload 文本中可定位 ? True
     原文片段（截断 320 字，空白已折叠）：{ "scenario_id": "import_from_json", "scenario_title": "JSON 文件导入", "dimensions": { "input": "JSON 文件" }, "prompt": "导入食谱 [JSON 文件]。", "status": "", "result": "校验数据完整性;缺失字段列给你补齐,确认后写入并返回回执。", "wake_word": "导入食谱", "type": "采集+回执", "html": { "template": "录入/采集.html", "command_cn": "导入食谱", "data_source": "recipes" }, "var
     JSON.parse 后：title='JSON 文件导入' wake_word='导入食谱' type='采集+回执' status='' tmpl='录入/采集.html'
     scenes/*.yaml 域 = 录入

  [data_export_backup] 在原始 payload 文本中可定位 ? True
     原文片段（截断 320 字，空白已折叠）：{ "scenario_id": "data_export_backup", "domain": "数据管理", "wake_word": "备份", "scenario_title": "导出备份", "dimensions": { "scope": "全部食谱", "include_archived": "是否含已废弃(选填", "默认不含)": null }, "type": "转移(下载)", "status": "", "prompt": "请加载「私家大厨」技能,帮我备份菜谱库(唤醒词:备份):\n范 围: _____________ (选填,默认全部;要含已废弃的填「含废弃」)", "result": "打包下载:全量
     JSON.parse 后：title='导出备份' wake_word='备份' type='转移(下载)' status='' tmpl='数据管理/backup_receipt.html'
     scenes/*.yaml 域 = 数据管理

  [discard_recipe] 在原始 payload 文本中可定位 ? True
     原文片段（截断 320 字，空白已折叠）：{ "scenario_id": "discard_recipe", "scenario_title": "废弃食谱(只增不删)", "dimensions": { "recipe": "指定菜名", "confirm": "确认废弃(口语词「删掉/不要/废弃」经 AI 确认后执行)" }, "prompt": "请加载「私家大厨」技能,帮我废弃食谱(唤醒词:废弃食谱):\n菜 名: _____________", "status": "", "result": "确认「废弃 = 标记不用,不物理删除」后写库 status=已废弃,列表/搜索自动过滤;回执=结果+撤销(恢复可用)。", "wake_word": "废弃食谱", "t
     JSON.parse 后：title='废弃食谱(只增不删)' wake_word='废弃食谱' type='确认+回执' status='' tmpl='修改/discard_receipt.html'
     scenes/*.yaml 域 = 修改

  另：计数陷阱复核
     原始文本里 "scenario_id" 出现次数 = 96（含 wake_words 内嵌视图）
     JSON.parse 后 $.scenarios 场景对象数 = 48
     sum($.wake_words[].scenarios.length) = 48
     $.scenarios 与展开视图 JSON 全等 ? True

########## 自检 4 · 新表 37 条唤醒词／8 条命令（读源码数）##########
文件：packages/skill-chef/src/policy/wakewords.ts（共 73 行）
  WAKE_TABLE 声明在 L12，数组闭合在 L50
  L13..L49 内 { phrase: ... } 条目数 = 37（应 37）
  头注 L2 自述：「37 条 = help4 + view7 + search8 (#43 F1 看菜/看菜谱→view) + write4 + cooking4 + shopping4 + record3 + query3」
     4+7+8+4+4+4+3+3 = 37
  ChefKey 联合类型在 L5..L7，成员 8 条（应 8）：
     chef.recipe.view
     chef.recipe.search
     chef.recipe.write
     chef.cooking.run
     chef.shopping.query
     chef.history.record
     chef.history.query
     chef.help.lookup

  逐命令的唤醒词条数：
     chef.recipe.view = 7
     chef.recipe.search = 8
     chef.recipe.write = 4
     chef.cooking.run = 4
     chef.shopping.query = 4
     chef.history.record = 3
     chef.history.query = 3
     chef.help.lookup = 4
     合计 = 37

  SKILL.md HELP-AUTO 区 L31..L73，表格数据行 L34..L70，行数 = 37（应 37）
  与 WAKE_TABLE 的短语顺序全等 ? True
```

**四项自检结论**：

1. **闭合校验 —— 通过**。第三节表恰好 **48 行**、去重后 `scenario_id` 恰好 **48 个**（重复 id = 空）；第二节 **33 行**、各域场景数合计 **48**；第一节 **10 行**、域内场景数合计 **48**。三处计数两两一致（脚本 `[1a]`／`[1b]`／`[1c]`）。
2. **每个域归属的证据行 —— 部分只有一处佐证，已明写**。35 条缺域卡全部有「载荷模板前缀 ＋ 域文件文件级 `domain.key` ＋ 域文件场景级 `domain:`」三处同行号证据（第四节表内逐条给出）；但票面点名的 `wake_word_variants.md` 分节**只覆盖 8/10 域**（缺 `开始使用`、`数据管理`），`render_*.py` 的中文脚本名**只覆盖 5/10 域**（其余 5 个靠英文脚本名间接对上，其中 `cooking`≠`cook`、`recipe`≠`view`）。这两个域的「三处佐证」并不齐，第一节附表和第四节正文都已逐条标注，没有糊过去。
3. **抽查 5 条 —— 通过**。`cooking_resume_after_pause`／`filter_combined`／`import_from_json`／`data_export_backup`／`discard_recipe` 五条都在**原始 payload 文本**里逐字定位到，解析后的字段与 `scenes/*.yaml` 的域归属一一对上（自检 3 段贴出了每条的原文片段）。计数陷阱复核：原始文本 `"scenario_id"` 出现 **96** 次，解析后 `$.scenarios` 是 **48** 个对象，`sum($.wake_words[].scenarios.length)` 也是 **48**，两份视图 JSON 全等。
4. **新表侧 —— 通过**。`wakewords.ts` 共 73 行，`WAKE_TABLE` 声明在 **L12**、数组闭合在 **L50**，**L13–L49 共 37 条** `{ phrase: ... }`；头注 L2 自述的分段计数 `4+7+8+4+4+4+3+3 = 37` 与解析结果一致。`ChefKey` 联合类型在 **L5–L7**，成员 **8 条**。`SKILL.md` 的 HELP-AUTO 区（引用时点 L31–L73）表格数据行 **37 行**，短语顺序与 `WAKE_TABLE` 全等。

### 自检 5 · 交付文件本体校验（`python 08-doc-check.py`，直接读本文件、不依赖中间件）

```text
[D1] 第一节 10 域表行数 = 10（应 10）
     1=做菜/`cook`/5；2=查看/`view`/8；3=搜索筛选/`search`/13；4=修改/`update`/4；5=历史/`history`/4；6=采购/`shopping`/1；7=录入/`add`/6；8=派生/`relation`/3；9=开始使用/`setup`/1；10=数据管理/`data`/3
     域内场景数合计 = 48（应 48）
[D2] 第二节 33 组表行数 = 33（应 33）；场景卡数合计 = 48（应 48）
[D3] 第三节 48 条表行数 = 48（应 48）；去重 scenario_id = 48（应 48）
     落点分类 = {'有': 20, '合并': 15, '改名': 1, '无': 12}；有落点(有+改名+合并) = 36；无落点 = 12
     每行 9 列 ? True（**整改后**加了第 9 列「chip 新表认不认」；不合的行 = []）
     chip 列：认 = 34（应 34）；不认 = 14（应 14）；涉及不认词 13 个（应 13）
[D4] 第四节 主表 35 条 ＋ 附表 13 条 = **同一批 48 条按「有无 domain」拆开**（**不是相加**，A 席 F4 改正）
     两表交集 = 0（应 0）；并集 = 48（应 48）；主表逐 id == 载荷 48 条减附表 13 条 ? True
[D5] 第五节表行数 = 15（应 15）；每行 5 列 ? True
     5.1 内容来源表行数 = 13（应 13）；判「可复用老卡」= 9；判「真新条目」= 3；判「不造卡」= 1
[D6] 第七节 JSON 可解析 ? True；三层 = 10 组 / 33 子组 / 48 场景（应 10/33/48）
     组 id = ['cook', 'view', 'search', 'update', 'history', 'shopping', 'add', 'relation', 'setup', 'data']
     三类 id 两两冲突 = []（应空）
     **改正后的真断言**：载荷 48 条的 scenario_id 集合 == 映射后的草案 id 集合 ? True
       （旧写法「场景 id 集合与载荷 $.scenarios 全等」是**空集对空集恒真**——载荷 48 张卡里带 `id` 键的 = 0/48，它的键名是 `scenario_id`；A 席 F7）
     每场景恰好契约 6 键 ? True
     用复数 types、无单数 type ? True
     JSON 块行数 = 324；块内无调试尾巴 ? True
[D7] 残留占位符/调试痕迹 = []（应空）

DOC-CHECK OVERALL = PASS
```

结论行 `DOC-CHECK OVERALL = PASS`（**整改后的重跑见下面「自检 6」**；本段是调查时点的输出，其中 D3 的列数与 D4／D6 的三句已就地改正，并在「自检 6」里以「读交付文件本身」的方式复算过一次）。逐项：第一节 **10 行／合计 48**；第二节 **33 行／合计 48**；第三节恰好 **48 行**、去重 `scenario_id` **恰好 48 个**、每行 **9 列**（含 chip 路由核对列：34 认／14 不认／13 词）；第四节 **48 条按有无 `domain` 拆成 35＋13**；第五节 **15 行**、每行 5 列；第七节 JSON 可 `json.loads`、三层 **10／33／48**、三类 id 两两不冲突、**载荷 `scenario_id` 集合与映射后 `id` 集合全等（真断言）**、每场景恰好契约 6 键、用复数 `types`；无残留占位符与调试痕迹。

### 自检 6 · 整改后重跑（本次新增；直接读交付文件本身，不依赖中间件）

脚本 `.scratch/chef-help/t2/t2-selfcheck-after-fix.mjs`（只读交付文件、老载荷与十份老域文件）——**本块是同一套判据在本轮（换行已由编排方归一为 LF 之后）的重跑读数**。原件第 11 行按 CRLF 两个字符切行读文件，LF 归一后的文件会被读成单行、直接报错（`未找到块起点: | 域序 | 中文域`）；按「只改这两个文件」的边界，本席**未动脚本**，改用等价的只读复核件（判据逐条相同，切行方式改为「CRLF 或无」）重跑；其中 [D6] 的两处「应」值（随本轮 5.1 改判由 8／4 改成 9／3）、[D8] 的「非『文件级』语境」一行、[D9] 的计数口径与 [D10] 的读数**按本轮实测改写**（[D10] 的「行数」按换行符计数；原件同名数字是切行后的段数、含文末空段，故比它多 1），其余各行与原件逐字相同。输出全文：

```text
[D1] 第一节 10 域表行数 = 10（应 10）；域内场景数合计 = 48（应 48）
     逐域 = 做菜/5；查看/8；搜索筛选/13；修改/4；历史/4；采购/1；录入/6；派生/3；开始使用/1；数据管理/3
[D2] 第二节 33 组表行数 = 33（应 33）；场景卡数合计 = 48（应 48）
[D3] 第三节 48 条表行数 = 48（应 48）；去重 scenario_id = 48（应 48）
     落点分类 = {"有":20,"合并":15,"改名":1,"无":12}；有落点 = 36；无落点 = 12
     每行 9 列 ? true（实到列数 = 9）
     chip 新表认不认：认 = 34（应 34）；不认 = 14（应 14）；涉及不认词 13 个（应 13）
     不认词明细 = 筛选难度／筛选时间／筛选炊具／筛选状态／修改步骤／修改食材／导入食谱／添加派生关系／查看派生关系／首次使用／批量改／备份／从已有派生新菜
     不认词逐字不在 WAKE_TABLE ? true
     认词逐字都在 WAKE_TABLE ? true（认词 20 个）
[D4] 第四节主表 = 35（应 35）；附表 = 13（应 13）
     两表交集 = 0（应 0）；并集 = 48（应 48）；并集 == 载荷 48 条 ? true
     主表 == 载荷 48 条减附表 13 条（**拆分**，不是相加）? true
[D5] 第五节「补进域／补进组」表行数 = 15（应 15）；每行 5 列 ? true
[D6] 5.1 内容来源表行数 = 13（应 13）；判「可复用老卡」= 9（应 9）；判「真新条目」= 3（应 3）；判「不造卡」= 1（应 1）
[D7] 第七节 JSON 可解析 ? True；三层 = 10 组 / 33 子组 / 48 场景（应 10/33/48）
     id 唯一：组 10／子组 33／场景 48
     场景键形状 = id,prompt_template,status,title,types,wake_word（应恰好契约 6 键）
     真断言：载荷 scenario_id 集合（48）== 映射后草案 id 集合（48）? true
     （旧断言的空集成因复核：载荷卡里带 "id" 键的 = 0/48 —— 所以旧的「id 集合全等」是空集对空集）
     JSON 块行数 = 324
[D8] 文件级引用（scenes/X.yaml:NN 指向 domain: 行）核对 79 处；不合 = 0
     同行二级引用（:NN = key/name 行）核对 89 处；不合 = 0
     非「文件级」语境的 scenes 引用（注释行／整改说明里引用的旧值等）：9 处；其中写作「场景级 scenes/X.yaml:NN」的 2 处（6.4① 与第八节第 4 条）本轮逐条回核，改后都指向该卡卡内 domain: 行 ? true（上一版把这 2 处也归进「不判对错」，所以漏判了；旧值 `:48` 落在 `- id: "data-1"` 行），其余 7 处是注释行与整改记录里的旧值，不判对错
     场景级引用（L NN 是卡内 domain: 行）核对 96 处；不合 = 0
     十份域文件均存在且可读 ? true
[D9] 整改新增节存在性：缺 = 无（应无）
     应已消失的旧表述：残留 = 无（应无）
     旧 SHA 值 AC18FB3C87039AC7 出现 3 处（`:52` 与 9.3 指纹表两处「改正」说明 ＋ 本行自身）；前 2 处都只与实测新值同现 ? true（原件的计数把本行排除，故它报 2 处）
[D10] 文件：165303 字节；行数 = 1389（按换行符计数，文末带一个换行）；CRLF = 0；BOM = false
SELF-CHECK-6 OVERALL = PASS
```

**自检 6 结论（6 条）**：

1. **计数与形状全部保持**：第一节 10 行／48；第二节 33 行／48；第三节 48 行／48 个唯一 `scenario_id`／**9 列**；第四节 35＋13（**拆分**：交集 0、并集 48）；第五节 15 行；5.1 表 13 行（9 条可复用老卡／3 条真新条目／1 条不造卡）；第七节 JSON 10／33／48、契约 6 键、块 324 行。
2. **chip 路由核对列成立**：48 张卡里 **34 认／14 不认**，不认词恰 **13 个**；13 个不认词**逐字都不在**新表 `WAKE_TABLE`、20 个认词**逐字都在**（双向校验，不是单向）。
3. **行号全部落在真行上**：文件级引用 **79 处**指向各域文件的 `domain:` 行、同行二级引用 **89 处**指向 `key:`／`name:` 行、场景级引用 **96 处**指向卡内 `domain:` 行——**三处不合均为 0**（这是撤回场景级误改、恢复原值之后重算的结果，见「整改记录 · 二」第二行）。**本轮补上上一版漏判的形态**：写作「场景级 `scenes/X.yaml:NN`」的 2 处（6.4① 与第八节第 4 条）上一版落在 `- id: "data-1"` 行，已由 `:48` 改 **`:49`**；改后逐条回核，全文行号引用**都指向正确对象**，也没有同一对象两处行号不同的自相矛盾（本轮逐条重扫）。
4. **旧表述已清**：`35＋13＝48`、「9 个 `###` 分节」、「五个没有内置配色」在文件里**零命中**；旧 SHA 值出现 **3 处**——`:52` 与 9.3 指纹表两处属「改正」说明（与实测新值同现），第 3 处是 [D9] 自己那行输出。
5. **文件本体（本轮实测）**：见 [D10] 行——**全 LF、CRLF = 0、无 BOM**。**换成 LF 是编排方在验证前做的归一**（CRLF→LF、内容零改动），所以字节数／行数与整改当时的读数（150970 B／1348 行／CRLF = 1347）不同；按「只改这两个文件」的边界，本席未动脚本、未动老件。
6. **`dimensions` 四类已闭合（本轮补）**：42 键**全有归属**——甲 36 键／67 条 ＋ 乙 4 键／6 条 ＋ 丙 1 键／6 条 ＋ 丁 1 键／1 条（36＋4＋1＋1 = **42 键**、67＋6＋6＋1 = **80 条**）；上一版漏掉的 **11 键／12 条**（`cookware`／`difficulty`／`extra`／`group_by`／`history`／`ingredient_exclude`／`ingredient_swap`／`progress`／`step_type`／`time_max`(2)／`user_state`）已逐键补进第七节「本轮补」表（8 键进甲、3 键进乙）；**最终进 `editable_fields` 的键值对数 = 67 条（36 键）**。兄弟件 `t3-template-contract.md` §3.5 口子 1 已同步为同一口径。

## 附 · 本轮（第二轮）整改记录（2026-09-12，验证判决后）

**为什么放在文末**：兄弟件 `t3-template-contract.md` 是按**行号**引本文件的（不是按节号），在正文中间插内容会把它的引用整体推后；本记录因此挂在文末，正文（第一节～自检 6）的行号不受它影响。（本文件引 t3 一律用节号，故反向不受影响。）

| # | 性质 | 本轮改了什么 | 落在哪 |
| --- | --- | --- | --- |
| 1 | **实质（内容不丢）** | `dimensions` 四类规则原只覆盖 **31/42 键**，本轮补上漏掉的 **11 键／12 条键值对**（`cookware`／`difficulty`／`extra`／`group_by`／`history`／`ingredient_exclude`／`ingredient_swap`／`progress`／`step_type`／`time_max`(2)／`user_state`）：逐键给实测取值（老值原文）、出现卡与归位理由，并补**闭合自检**（36＋4＋1＋1 = **42 键**、67＋6＋6＋1 = **80 条**、**最终进 `editable_fields` = 67 条（36 键）**） | 第七节（四类表 ＋「本轮补」逐键表 ＋ 闭合自检）；兄弟件 `t3-template-contract.md` §3.5 口子 1 同步（只动该段） |
| 2 | **实质（行号）** | `scenes/数据管理.yaml` 里「体检」那一卡的场景级 `domain:` 行号由旧值 `:48` 改 **`:49`**——旧值落在 `- id: "data-1"` 行，且与本文件第二节写的 L49 自相矛盾 | 6.4①（`:572`）与第八节第 4 条（`:1024`，本轮第七节新增表把它从 `:1003` 推后 21 行） |
| 3 | **记录（自洽）** | 自检 6 的 [D10] 与结论第 5 条改成本轮**实测**的字节／行数／CRLF／BOM；并写明换行由编排方归一（CRLF→LF、内容零改动），故与整改当时的读数不同 | 自检 6 |
| 低危 1 | 口径 | `variants` 的「96 处」改成 **`$.scenarios[]` 下 48 处**（96 ＝ 48 顶层 ＋ 48 `$.wake_words[].scenarios[]` 嵌套视图） | 第七节映射口径表、不迁清单 |
| 低危 2 | 引用 | bill 先例「接在对应二级组末尾」的出处补 **`wake-assets.ts:54`**（原写的 `:12-16` 只管「`prompt` 按老实样重写」那半条） | 整改记录 · 一（H4 行）、5.1 开头 |
| 低危 3 | 判据 | 5.1 的 `查食材` 与同表 `搜菜` 同命令同槽位 `q`，按判据 A **统一改判「老卡近义触发」**（复用 `search_by_name_keyword`）；汇总由 8／4／1 改 **9／3／1** | 5.1 表与汇总、第八节第 11 条、自检 5 与自检 6 的 D6 行 |
| 低危 4 | 引用 | `docs/agents/structure.md` 的行段由旧值 `:72-88` 改 **`:78-90`**（「第一步 · 影响清单」标题在 `:78`、「第二步 · 结构设计」到 `:90` 止） | 整改记录 · 一（H1 行）、整改记录 · 三第 1 条、3.2 挂载点 |
| 低危 5 | 时点 | 9.3 指纹表 `SKILL.md` mtime 由 `11:25` 改本轮实测 **`11:43`**（第八节第 13 条同步点明两个时点） | 9.3、第八节第 13 条 |
| 低危 6 | 自指 | 旧 SHA 值的出现数由「2 处」改 **3 处**（`:52`、9.3 指纹表，与 [D9] 自己那行输出）；`:52`／9.3 两处必须保留旧值，否则「改正说明」不成立 | 自检 6 的 [D9] 行 |

**本轮明确未纳入**（不在验证席给的 6 条低危内，原文一字未动，两条都不挡关票）：① 整改记录 · 二里「映射口径表补齐为 13 行」与实际 **14 数据行**差 1——要改得连「新增五行＋末行改写」的算术一起说清，属另一处记录口径（验证报告「五、3」）；② 第七节 `{{菜名}}`／`{{N}}` 没给「16 条」这个量——该量已在兄弟件 `t3-template-contract.md` §3.5 口子 2 写明 **16/48**（验证报告「七、7」）。

**跨票行号提醒（本轮实测，未越界修）**：`t3-template-contract.md` 有 **11 处**按行号引本文件（`:32` 的 `:77`／`:412`、`:255-257` 的 `:612`、`:259` 的 `:87-97`、`:261`／`:263` 的 `:102`、`:304` 的 `:605`／`:403-413`、`:356` 的 `:613`、`:364`／`:649` 的 `:608`／`:673-677`、`:373` 的 `:639`）。本轮实测两点：① **这些引用在整改前就已与本节内容对不上**——「`id` 取域文件 `domain.key`」那一行（本轮未动它）是 **`:615`**，不是 t3 写的 `:612`；「10 域中英名对照表」表头是 **`:90`**，不是 `:87`；t3 写的 `:403-413`（映射口径表）实际在 **`:606-621`**。② 本轮把 `dimensions` 的 11 键逐键表插进第七节（**`:642-662`**），**该表之后的正文整体推后 21 行**——t3 引 JSON 草案的两处（`:673-677`，原落在草案的 `做菜模式` 子组一带）现应读作 **`:694-698`**；该表之前的正文行号与本轮整改前**完全相同**（本轮记录因此挂在文末，不再额外推动中间正文）。⇒ 按「只改 t3 §3.5 口子 1」的边界，本轮**未动 t3 的其他部分**；建议下一轮把 t3 那 11 处改为**节号**引用（本文件引 t3 已是节号，反向照办即不再漂）。
