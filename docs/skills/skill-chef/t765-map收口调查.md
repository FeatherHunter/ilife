# 私家大厨本体图（#765）收口调查：为什么 100% 却仍 open

调查时间：2026-09-22（本机时区 UTC+8）。调查方式：只读。**本席没有关票、没有改地图正文、没有改任何 issue。**

地图：[#765 [wayfinder] 私家大厨本体图：按 HELP 十域 parity 并做到极致](https://github.com/FeatherHunter/ilife/issues/765)

---

## 一、为什么会显示 100% 却没关

**「100%」不是「地图完成」的判定，而是 GitHub 的子议题完成率读数。**

`gh api repos/FeatherHunter/ilife/issues/765 --jq .sub_issues_summary` 给出：

```
{"completed": 23, "percent_completed": 100, "total": 23}
```

这个数只等于「已关子议题 ÷ 子议题总数」。GitHub **不会**因为子议题全关而自动关父议题，本图也一直没有人执行 `gh issue close 765`。地图正文最后一次更新是 `2026-09-22T11:58:50Z`，正文写的是「**图完成**」而不是「关票」，正文与评论里都没有 close 动作。

⇒ 100% 与「该不该关」是两件事。该不该关，要看目的地两条判据与地图台账本身。

---

## 二、100% 这个数是真的，但地图台账与它对不上

**真的部分**：23 张子议题全部 `CLOSED`、`state_reason = COMPLETED`；没有 `NOT_PLANNED`，没有「关成别的理由」。逐张三件套（票面进度行／下一步行／解决评论）见本文件末的审计命令输出。

**对不上的部分**：地图自己记的是 **22 张**，实际挂了 **23 张**。

| 落点 | 记的是 | 实际 |
|---|---|---|
| 地图正文「任务清单」表 | 22 行（序 1–22） | 23 张子议题 |
| `docs/skills/skill-chef/t765-tickets.json` | 22 条 | 同上 |
| `docs/skills/skill-chef/t765-verify.mjs` 的 `BLOCKED_BY` | 22 个键 | 同上 |

多出来的是 **[#853 【规格】818 写侧缺值处置：三列必填拦下补齐（9 卡执行件）](https://github.com/FeatherHunter/ilife/issues/853)**。它**不是**漏挂——时间线显示它是第 23 个 `sub_issue_added`，挂载时间 `2026-09-22T07:32:10Z`；而 [#873](https://github.com/FeatherHunter/ilife/issues/873) 在 `2026-09-22T05:08:37Z` 记录的校验输出还是：

```
⑦ 地图正文：23460 字符，计划表 22 行；子议题 22／22，closed/total = 21/22
PASS：全图 22 张票的形状、边、拓扑、地图正文逐项一致。        exit 0
```

**今天重跑地图自己的校验命令，结果是失败**：

```
$ node docs/skills/skill-chef/t765-verify.mjs --map 765
① 拓扑：22 张票的阻塞关系无环
②③④⑤⑥ 逐票：22 张，阻塞边 75 条
⑦ 地图正文：24684 字符，计划表 22 行
   子议题 23／22，closed/total = 23/23
⑧ frontier（0 张）：
FAIL：
  - 子议题 23 ≠ 22
[exit code: 1]
```

其余八项（拓扑无环／75 条阻塞边逐票对账／22 张票面形状／无残留占位／无字面 `\n`／frontier 为 0）全部通过。**唯一红的就是这一条计数。**

同时，正文「进度：100%（两条达成）」段自称「**22 张票逐张收口**」，与实际的 23 张也不一致。

---

## 三、目的地两条判据的逐条读数

### 判据① 48 卡逐卡有可点开的双端 HTML ＋ 链路总表 50 行无死链

| 子判据 | 读数 | 结论 |
|---|---|---|
| 48 卡在册 | `.scratch/t777/manifest.json` 48 条；`test/scene-data.test.mjs` 钉死 10 域／33 组／48 卡 | ✅ |
| 双端墙逐格渲染 | `手机墙-390.html` 与 `桌面墙-1280.html` 各 **48 个 `<iframe>`，`src` 缺失 0** | ✅ |
| 墙自检（今天重跑） | `node docs/skills/skill-chef/t778-验收墙.mjs --check .scratch/t778` → `48 格；链接 245 条；缺失 0 -> 可发`，**退出码 0**；质量门六列红 0 | ✅ |
| 链路总表 50 行无死链 | 50 个数据行、50 条 `file:///` 绝对链接、**逐条指向的文件都存在，死链 0** | ✅ |
| 链路总表 `prompt` 段 | **31/50 行是空单元格，17/50 行填的是说明文字，只有 2 行是真 prompt** | ❌ |

`prompt` 列的实测：只有第 38 行（加菜）与第 40 行（继续做菜）是真 prompt（「用表单方式录入这道菜。」／「我刚才做到第 {{N}} 步,继续帮我做完。」）。第 1／2／3／7／8／9… 这类行填的是「本行代表首卡，组内共 N 卡（见卡归属列）」，第 4／5／6／10–16／18／20–26／28–37／39／45／46 行**整格是空的**。

**成因（可复现）**：生成器 `docs/skills/skill-chef/t777-链路总表.mjs:72` 的取数正则

```js
/\{\s*id:\s*'([^']+)'[\s\S]*?prompt_template:\s*'((?:[^'\\]|\\.)*)'/g
```

用 `[\s\S]*?` 横跨了对象边界，捕获到的 key 常是**域 id／组 id**而不是卡 id。事实源 `packages/skill-chef/src/help/sceneData.ts` 里 **48 条 `prompt_template` 一条不缺**；生成器建出来的映射表**恰好也是 48 个键**，但其中**只有 15 个是卡 id**，另 **33 个是域 id／组名**（`cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`／`查看食材`／`筛选菜系`…）。

⇒ **取不到 prompt 的卡是 33 张**（不是 23——本文件 2026-09-22 首版此处记的 23 是错的，经对抗审查席复核后按实测改正）：

```
cooking_start_fresh　view_full_recipe　view_ingredients_only　view_steps_only　view_nutrition_only
view_background_only　search_by_name_keyword　filter_cuisine_basic　filter_by_ingredient_basic
filter_difficulty_easy　filter_time_quick　filter_by_cookware　filter_by_flavor　filter_by_season
filter_by_status　list_all_recipes　update_main_fields　update_step_content　update_ingredient
discard_recipe　record_cook　view_history_list　view_stats_dashboard　shopping_generate
add_from_image　import_from_json　add_relation　view_relation_tree　derive_from_existing
first_use　data_quality_report　data_batch_edit　data_export_backup
```

**自洽校验（这两条互相印证，可复跑）**：50 条词里 46 条有卡归属，其中 **44 条的首卡取不到 prompt**（只有 `加菜 → add_from_template` 与 `继续做菜 → cooking_resume_after_pause` 取得到）——**页面上仅存的那 2 行真 prompt，正是这两条**。页面表现：**31 个整格空 ＋ 9 行只剩「本行代表首卡」的行注 ＋ 4 条 HELP 行与 4 条变体行装的是说明文字 ＋ 2 行真 prompt**。

**修法的层次（对抗审查席纠正，已复核）**：不要"补写新词 prompt"——**口径早就在资产里**。`packages/skill-chef/src/triggers/chef-scenes.ts:20` 声明 `promptKind`／`promptRef`，50 条词逐条给值：**33 `group` ＋ 9 `reuse`（`promptRef`＝卡 id）＋ 3 `new`（`promptRef`＝新写样本原文）＋ 1 `param` ＋ 4 `help`**（实测 `promptKind` 出现 50 次，分布逐项如上）。该件由 `scripts/gen-chef-scenes.mjs` 生成、`--check` 守字节一致。而 `t777-链路总表.mjs:75-79` 的 `NEW_PROMPT` 与 `:100-101` 的 `VARIANT_WORDS`／`VARIANT_HOST` **是这份口径的第二份抄本**。⇒ 正确修法＝收掉硬编码、按 `promptKind` 五类分派，**零新文案**，也就**不需要维护者再做内容裁定**。

取不到就静默写空串（`:124`／`:135` 的 `promptOf.get(host) || ''`）。生成器自己的判据（`:241`）是：

```js
if (missing !== 0 || A.wakes.length !== EXPECT_WORDS || coveredCards.size !== EXPECT_CARDS) process.exit(1);
```

只判「缺失 0／词 50／卡 48」，**不判 prompt 列**，所以空列一路是绿的。

这条正好压在地图 `Not yet specified` 里一直没毕业的那条读数上：「13 条新表多出词的 prompt 示例：新表只有短语、无场景资产，示例怎么写…待②对账表交出后定」。

**为什么它没被自己的验收拦住（2026-09-22 复核）**：

1. **[#777](https://github.com/FeatherHunter/ilife/issues/777) 的「目标」要求每行带 prompt，「验收命令」不查**。票面「目标」第 2 条逐字写「50 行，每行 prompt／唤醒词／命令／参数／产物绝对路径（可点）」；而「验收命令」只有四条：正例 `词 50／卡 48／链接 N 条／缺失 0`、两条反例（改坏 manifest／删一条词）、点击实测 `可打开 N／死链 0`。**没有一条读 prompt 列**。⇒ 这是「承诺有、读数无」的典型：票按自己的验收命令是绿的，按自己的目标是欠的。
2. **[#778](https://github.com/FeatherHunter/ilife/issues/778) 的终审扫描有两处盲区**（`docs/skills/skill-chef/t778-终审扫描.mjs:33-38`）：**① 只扫子目录里的 `.html`**——只遍历批目录下的**子目录**，顶层 4 页（链路总表／两面墙／总索引）一件都没扫；**② 三类针里没有这一族**（针是 `本票|另立票|立票|域 票|票 \d+|本期…`／`本地菜谱库|副本库|真库`／`AI 补|(AI:`），所以 `t767-命名 §三.1` 这种工单号引用、`产物复用宿主卡内容` 这种实现语**结构上不可能被它发现**。它报的「53 件命中 0」是真的，但覆盖不到这一族。
3. **这一族只落在 2 张顶层页上，48 件产物与两面墙是干净的**（本席实测）：把三层针打到批里全部 57 件（子目录 53 ＋ 顶层 4），**剥掉全部标签只看上屏文本**——旧针命中 0；扩展针（工单号／`§`／内部说明语）命中 55 处，**只涉 2 件**：`t777-链路总表.html` 48 处、`总索引.html` 7 处。⚠️ 若**不剥标签**会误报：产物里 24 件会命中 `/t\d{3}-/`，但那全是 `data-action-id="t772-…"` 这类**属性值**，不是上屏文本。
4. **修的代价很小**：`t777-链路总表.mjs` 全程零 DB、只读三个事实源（唤醒词与卡资产／`sceneData.ts`／`manifest.json`），**只写一个文件**（`.scratch/t777/t777-链路总表.html`，`:194`；另动态 import `t768-质量门.mjs` 只为 `--open-check` 开浏览器）。重出**不会连带重跑 48 件产物**，而总表也不是墙的一格（手机墙不引用它，总索引引用它）⇒ **不动人已经看过并认可的两面墙**。
5. **内容口径不必新裁**：48 条 `prompt_template` 里 35 条是干净单行（例：`帮我做一道{{菜名}},我要按步骤来。`），13 条是老件的**填空式表单**（含 `_____________` 与「请加载「私家大厨」技能…」样板）。按维护者 2026-09-21 已裁的 Q5（**内容以老件为权威，视觉走新共享渲染层重做**）：内容照登原文，把填空渲成设计了的样子（不许把下划线原样贴上屏——这正是用户第 5 条要求点名的那类偷懒）。

### 判据② 墙 ＋ 逐格缺陷清单 ＋ 自检正反例退出码三样齐，且 vision_router 终审 ≥90 分

| 子判据 | 读数 | 结论 |
|---|---|---|
| 双端墙 | 见上，退出码 0 | ✅ |
| 逐格缺陷清单 | `docs/skills/skill-chef/t778-逐格缺陷清单.md` 在册 | ✅ |
| 自检正例 | `48 格；链接 245 条；缺失 0 -> 可发`，退出码 0 | ✅ |
| 自检反例 | 点名缺失件 → `47 格；缺失 1 -> 不可发`，退出码 1（`resolve-778.md` 留痕） | ✅ |
| 终审 ≥90 分 | **未按原文达成**，由维护者裁定改写口径 | ⚠️ |

[#873](https://github.com/FeatherHunter/ilife/issues/873) 自己的关票评论逐字写着：「**逐页 ≥90 未全达**…按「两跑都 ≥90」口径**过线 6 页**（13／17／21／28／42／45），**42 页未达**」。改写依据记在两处：`#873` 的解决评论「**#873 关闭（维护者裁定路 A，2026-09-22）**：库内正文不动；门槛两条口径并行——过线的页按「同会话两跑都 ≥90」认（6 页）；没过的 42 页按『缺陷清零 ＋ 批级全绿』认」，以及 `docs/skills/skill-chef/t778-终审打分.md` §七.5 ＋ `.scratch/t778/resolve-778.md` §一.1（器具自身摆幅 68–93 大于均值与 90 的差 3.56）。

⇒ 这是**留了痕的阈值改写**，不是偷偷跳过；但**地图正文 Destination 仍写着「vision_router 终审 ≥90 分」原文**，地图的两处口径此刻不一致。

---

## 四、Not yet specified 七条，一条未清

逐条查证，除第 4 条外都已被已关票解决，却仍挂在地图上：

| # | 条目 | 查证结果 |
|---|---|---|
| 1 | 过程型页面「确认页／进度页／回执页」的具体形态 | 已由 [#768](https://github.com/FeatherHunter/ilife/issues/768)（三族）＋ [#772](https://github.com/FeatherHunter/ilife/issues/772)（五页）交清：`docs/skills/skill-chef/t768-页面族设计.md` |
| 2 | 老件 20 模板 → 新页面族的最终页型表 | 已由 #768 交清（同件的「老件 20 模板对照」一节） |
| 3 | 采购域与居家管家的联动细节 | 已由 [#776](https://github.com/FeatherHunter/ilife/issues/776) 裁定：零 import ＋ 调用契约，拿不到库存就显式降级（`docs/skills/skill-chef/t776-小域.md:47-51`） |
| 4 | **13 条新表多出词的 prompt 示例** | **至今没定**；且已变成判据①的 prompt 空列（见上） |
| 5 | 数据管理域备份／导入产物落点与命名 | 已由 #776 交清（`backup.json` 全量导出；定时／增量另立票） |
| 6 | 新技能缺省库目录不接老库 | 该行自己写着「已由票 17 认领——**不再挂在这里**」，却还留在章节里 |
| 7 | 收口时墙按几个页族拆几张 | 已由 [#778](https://github.com/FeatherHunter/ilife/issues/778) 定：双端各 48 格、单批 |

---

## 五、一条挂在别人名下、本图无人认领的交回

〔[六家技能交付面对齐](https://github.com/FeatherHunter/ilife/issues/902)〕的席在 **`2026-09-22T11:36:14Z`** 给本图留了一条评论，三件事：

1. 本图 Notes 里那两条 ⚠️（非 HELP 命令只吐一个裸 `<section>` 段、且写盘后**不回 `delivery`**）**复核后仍在**；
2. 缺的那一段定位到 `packages/skill-chef/src/cli/cmd_read.ts:225-230`；
3. 按 `docs/agents/编排纪律.md` 第十条第二问，**不在对齐图另开票，把「大厨那一行」留在本图名下**，并明确问：「要不要把「交付接线」显式写进你的计划表（第 12／13 票那一带，或另立一票），由这张图的人裁定；对齐图这边不替你排期」。

对照子票〔[交付面探针：六家技能缺省落点与回执的常驻判据](https://github.com/FeatherHunter/ilife/issues/904)〕（**OPEN**）正文的「遗留出口」，逐字是：

> 饼干那一行归本图〔饼干记账：非 HELP 命令缺省落点与回执〕；**大厨那一行归本体图〔私家大厨本体图〕（#765，不在本图另建票）**

本图正文在 **`11:58:50Z`** 被更新（就是「图完成／100%」那一版），**对这条评论一字未答**，也没有为它建子票。而它说的不是空话——`cmd_read.ts:225-230` 今天仍是「非 HELP 键 → `renderEnvelopeHtml(env)` 写盘、不回 `delivery`」。

⇒ 这是本轮最容易被漏掉的一条：**图自称完成，但一张外部票正把一段活留在它名下，且没人认领。**

---

## 六、记账层面的另几处不一致

1. **`Decisions so far` 缺 4 张已关票的一行 gist**：#775（历史域）、#818（三条 NOT NULL 裁定）、#819（数据库层两处全局缺口）、#777（收口 A）。其中 **#777 的那行被塞进了「任务清单」表格中间**（第 18 行与第 19 行之间），把 Markdown 表格截断成两段。
2. **#769 的正文还停在 `## 进度：0%`**，而票已 `CLOSED/COMPLETED`，解决评论是一份完整研究报告（`docs/skills/skill-chef/t769-写侧字段对账.md`）——属**票面漏改**，不是漏关。
3. **#778 的正文是 `## 进度：95%`**，地图正文却写「100%（两条达成）」——父票与子票读数不一致。
4. **`resolve-778.md` §一.3 与事实矛盾**：该件自称「#871 不接进地图 #765 的子议题／阻塞边」，但 #871 **就是**子议题（`2026-09-21T11:48:26Z` 挂上）、在计划表第 21 行、也在校验脚本的阻塞表里。
5. **地图 Decision 8 的措辞与产物不符**：Decision 8 写「链路总表 50 行 = **50 个不重复路径**」，实测 50 行指向 **40 个**不重复文件。但执行票 [#767](https://github.com/FeatherHunter/ilife/issues/767) 的 `docs/skills/skill-chef/t767-命名.md` §三.2 是**允许复用**的：「**参数与 canonical 相同的词复用 canonical 文件**；参数不同的词另出文件」。实测复用集中在 5 组（做菜模式↔开始做菜；查看食谱↔看菜谱↔看菜；搜索食谱↔搜菜↔查食材；记录做菜↔补录做菜↔改评分；4 条 HELP 词共用 HELP 文件），**全部落在 §三.2 的许可内**。⇒ 这是**地图上位的措辞比执行规则严**，产物本身合规，建议改措辞而不是改产物。
6. **地图「进度」段那处如实记的边界数字不准**：地图写「链路总表内的 **40 条**绝对路径仍指 .scratch/t777/」，实测 t778 版里指 t777 的是 **42 条**（另 8 条指 t778：完成做菜那份 ＋ 三份采购变体 ＋ 4 条 HELP）。40 是「不重复路径数」，不是「指向 t777 的链接数」。

---

## 七、与地图相关但未计入 23/23 的其它工作

- 搜「765」命中的其它 issue：#796（属地图 #745）、#736（缺陷，设置页目录行）、#729（analysis 域，别的地图）、#745（六家设置页收窄地图，已关）、#333／#154（卡路里线）——**都不属本图目的地**。
- 地图 Out of scope 里承诺的「发版另立收口票」= [#755 【实施】发版与装机收口](https://github.com/FeatherHunter/ilife/issues/755)，**已关**。
- [#852 【出图·schema】老库补 recipes.name 唯一索引](https://github.com/FeatherHunter/ilife/issues/852)（承接 #819 G1）**已关**，票面标注「parity 图外」。
- 工作树无本图相关未提交改动（`git status --porcelain` 只有备忘录线 10 个件，属别席）。

⇒ **除第五节那一条交回外，没有别的漏网工作。**

---

## 八、建议与待定夺的四个决定

目的地两条判据，我的判定是：**判据①的「无死链」与判据②的「三样齐」都成立；判据①的 prompt 段未达成；判据②的「终审 ≥90」已由维护者裁定改口径**。加上台账对不上、七条雾未清、一条交回没人认领，**此刻不宜直接关图**。

四个决定请维护者定：

**决定 1：prompt 空列算不算未达成？**
- 算（我的读数支持这一看法：目的地原文点名了 `prompt → 唤醒词 → 命令 → HTML` 这条链）：修法＝改 `t777-链路总表.mjs:72` 的取数（按卡对象边界取 `id`，不用跨对象的 `[\s\S]*?`）＋把「prompt 列非空」写进 `:241` 的自检 ＋ 重出总表与墙批。这是**一张新票**（或重开 #777）。
- 不算（认「链路可点开」是主诉求）：则地图 Destination 的措辞要改，把 prompt 段降为「可选列」，并把这条记进 `Out of scope`。

**决定 2：判据②的「终审 ≥90 分」怎么记？**
- 认「路 A」裁定仍然算数 ⇒ 只改地图 Destination 的措辞（写成「按路 A 口径：批级全绿 ＋ 缺陷清零；过线 6 页按两跑都 ≥90」）。
- 不认 ⇒ 地图不能关，#873 里那 42 页要另开票继续推。

**决定 3：第五节那条交回（非 HELP 命令的页面装配 ＋ `delivery` 回执）归谁？**
- 认领：在本图开一张「交付接线」子票（地图保持 open，frontier 变成 1 张）。
- 不认领：写进地图 `Out of scope` 一节，注明归 #902／#904 那条线，本图不接。

**决定 4：记账三件套要不要现在补？**
- 把 #853 补进计划表＋`t765-tickets.json`＋校验脚本（或把它从子议题里摘掉）；
- 补 4 行 Decisions gist（#775／#777／#818／#819），并把「任务清单」里那行 #777 挪回 `Decisions so far`、修复被截断的表格；
- 清掉 `Not yet specified` 里已毕业／已失效的条目（第 1／2／3／5／6／7 条）；
- 顺带把 #769 票面补到 100%、把 Decision 8 的「50 个不重复路径」改成与 `t767-命名.md` §三.2 一致的措辞。

**我的最小可关路径建议**（供参考，不是替你定）：先做决定 4（纯记账，不动源码）→ 重跑 `t765-verify.mjs` 转绿 → 决定 1／3 各按你选的路线立票或写 Out of scope → 决定 2 的措辞对齐 → 然后关图，并在 `Decisions so far` 补齐每个已关票一行 gist。

---

**2026-09-22 修订（对抗审查后）**：本节两条建议已改——**决定 1** 的修法不再是「补写新词 prompt」（那会造出第二份文案），而是按资产里已有的 `promptKind`／`promptRef` 五类分派、零新文案；缺陷规模按 **33 张卡／44 条词**计。**决定 3** 由「划出图」改判为「**默认认领**」：#902 与 #904 逐字声明「大厨那一行归本体图 #765」，且按 `docs/agents/编排纪律.md` 第十条三问（能复现／有票或地图可认领／是已承诺的目标）全部通过。**决定 2** 的写法也要收：在维护者确认之前，不得把「路 A」写进 Destination，只能引出处并注「待确认」。

## 九、对抗审查（2026-09-22 独立审查席）补出的读数

以下六条由独立审查席提出、本席逐条复核：

1. **交付件里有一句与产物相反的待办自述**：`docs/skills/skill-chef/t777-收口A.md:51` 写「变体 4 词的内容目前复用宿主卡产物（命令分支待实现，**链路页 prompt 列已逐行注明**）」——**「已逐行注明」与实测的 31 空／17 说明／2 真不符**。这一行在被收口 B 引用的证据件里。
2. **另一条假待办**：`docs/skills/skill-chef/t778-收口B.md:109` 还挂着「**待维护者裁**：① #871 是否接进地图 #765 的子议题／阻塞边」——而 #871 **早已挂上**（时间线 `2026-09-21T11:48:26Z`、计划表第 21 行、`t765-verify.mjs` 的 `BLOCKED_BY` 现为 `13: [12, 21, 22]`），地图正文自己也写了「三处同步」。
3. **#853 的票面体例与地图不同族，光补「进度／下一步」不足以让校验转绿**：#853 正文起手是「Part of #765／## Problem Statement／## Solution／## User Stories」，而 `t765-verify.mjs:42` 要求六段（`## Question`／`## 目标`／`## 验收命令`／`## 不许动的东西`／`## 交付物路径`／`## 遗留出口`）＋ `## 进度：N%` ＋ `下一步：`。照仓库既有先例（`:40-41` 的 `SHAPE_EXEMPT = new Set([19])`，注释逐字「票面照那条线自己的体例写；本图只校它的边与状态」）——**应把 23 加进 `SHAPE_EXEMPT`**，而不是改它正文。
4. **别重跑 `t777-run-all.mjs`**：`t777-run-all.mjs:138 buildChefHelpFileData(new Date())` 让 HELP 产物带墙钟时间戳（实测 HELP 页写「更新于 2026-09-22 13:48」），每次重跑字节都变；「重 stage 墙批」是 `t778-收口B.md:74` 的五步级联，还会让人已认可的两面墙重出。**修 prompt 列只需改 `t777-链路总表.mjs` 并跑它一次**（`:194` 是它唯一的写点）。
5. **「把 t778 那份总表里的链接理成全指 t778」不可干净达成**：`.scratch/t778/manifest.json` 是 t777 那份的**逐字节副本**（两件 sha256 相同），而 manifest 里存的是**绝对路径**；要真清得改 `t777-run-all.mjs:34` 写死的 `BATCH`（那是已关票 #777 的器械）。⇒ 保留地图已写的边界说明即可，别动。
6. **判据①与交付位置都在仓外**：`.gitignore:5` 忽略 `.scratch/`，所以「48 卡逐卡可点开」「链路总表 50 行」「批内 55 件逐字节相同」这些读数**只存在于本机**。地图该记一行：换机器要重跑 7 张域票的驱动器才复现。
7. **三份历史脚本从此一律 FAIL**：往 `t765-tickets.json` 写入的只有 `t765-build-map.mjs`／`t765-add-tickets.mjs`／`t765-v3.mjs`，三者都自带前置门（遇已有文件／票已存在即 `exit 1`），它们的 `--push-map` 今天全部走不到。⇒ 手改安全且不会被反向覆盖；代价是这三份从此不可再跑，该记一行「真相源＝`t765-tickets.json` ＋ `t765-verify.mjs`；其余是 13／15／18 票时代的快照，已冻结」。



## 附：本轮用到的读数命令与证据件

```sh
# ① 地图与自己台账的计数
gh api repos/FeatherHunter/ilife/issues/765 --jq '{sub_issues_summary, issue_dependencies_summary}'
gh api "repos/FeatherHunter/ilife/issues/765/sub_issues?per_page=100" --jq 'length'
node docs/skills/skill-chef/t765-verify.mjs --map 765          # 今天：FAIL 子议题 23 ≠ 22，退出码 1
gh api "repos/FeatherHunter/ilife/issues/765/timeline?per_page=100" --paginate   # 23 条 sub_issue_added，末条 #853 @ 2026-09-22T07:32:10Z

# ② 墙
node docs/skills/skill-chef/t778-验收墙.mjs --check .scratch/t778   # 48 格；链接 245 条；缺失 0 -> 可发，退出码 0

# ③ 链路总表（prompt 列）
node .scratch/t765-map收口调查/link-audit.mjs      # 50 行 / 50 链接 / 存在 40 个不重复文件 / prompt 空 31 行
node .scratch/t765-map收口调查/prompt-audit.mjs    # sceneData 48 条 prompt_template 与生成器取数的差（该脚本首版算出的「缺 23 张卡」有误，正确读数见下一条）
node .scratch/t765-map收口调查/verify-attacks.mjs  # 正确读数：生成器 48 个键里只有 15 个是卡 id ⇒ 33 张卡取不到；44 条词的首卡取不到

# ④ 子票逐个核对（状态／关闭理由／票面进度／解决评论）
node .scratch/t765-map收口调查/close-audit.mjs     # 输出 .scratch/t765-map收口调查/close-audit.txt
```

证据件（本席新造，均为只读脚本）：

- `.scratch/t765-map收口调查/close-audit.mjs` ＋ `close-audit.txt`：23 张子票的状态、关闭理由、票面进度、末条评论
- `.scratch/t765-map收口调查/link-audit.mjs`：链路总表逐行拆解（行数／链接／重复路径／未链接产物）
- `.scratch/t765-map收口调查/prompt-audit.mjs`：prompt 列的取数缺口与失配位置
- `.scratch/t765-map收口调查/disk-audit.mjs`：册子 48 条、批内 55 件逐字节对比
- `.scratch/t765-map收口调查/wall-audit.mjs`：双端墙的格数与每个 `<iframe src>` 是否存在
- `.scratch/t765-map收口调查/jargon-audit.mjs`：链路总表 `prompt` 列的 50 行分类（空／工单号／实现语／真 prompt）
- `.scratch/t765-map收口调查/needle-text-only.mjs`：把三层针打到批里全部 57 件、**只看上屏文本**（结论：旧针 0，扩展针 55 处只涉 2 张顶层页）
- `.scratch/t765-map收口调查/needle-detail-含误报.mjs`：**不剥标签**时的读法——24 件产物会命中 `/t\d{3}-/`，但那全是 `data-action-id` 属性值；留作「别把属性值当上屏文本」的反例
- `.scratch/t765-map收口调查/needle-radius.mjs`：顶层 4 页与子目录 53 件的分件命中数
- `.scratch/t765-map收口调查/map-timeline.json`：地图时间线原始件（23 条 `sub_issue_added` 的挂载顺序与时刻）
- `.scratch/t765-map收口调查/live-body.md`：拉回的地图正文快照。**与 `.scratch/t778/map765-body2.md` 同内容**——把它按 CRLF→LF 归一、去掉首部 BOM 与尾部空行后，两件逐字符相等；差异全部来自 `gh api` 经 PowerShell 写文件时的 BOM 与行尾转换，不是正文内容有变
