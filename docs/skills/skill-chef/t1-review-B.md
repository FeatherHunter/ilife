# t1 对抗式审查（B：目标契合度与风险）

> 被审对象：`docs/skills/skill-chef/t1-bill-recipe.md`（68,790 字节／601 行，票 `#209`）。
> 基准：地图 `#208` 正文（`docs/skills/skill-chef/map-chef-body.md`）的 Destination 与两条判定口径；尺子：`docs/agents/structure.md` 五条铁律 ＋ 必报五步。
> 本席只核**能不能把私家大厨送到目的地**与**会不会把下游带进沟里**；数字与路径的准确性归 A 席。
> 只读：未改任何 `packages/` 下文件、未 `git add`／`commit`／`checkout`／`stash`、未跑仓级 `pnpm build`／`pnpm test`。跑过的只读命令只有 `Test-Path`／`Get-Content`／`Select-String`／`node tooling/skill-html-snapshot.mjs --check` 与读 `.scratch/chef-help/legacy-chef-help-payload.json` 的只读解析。未访问网络。
> 本席的原始证据：`.scratch/chef-help/t1-review-B/evidence-core.txt`。

---

## 判定

- **总分：6.5/10**（到达目的地 40%／新规合规 25%／下游可直接使用 20%／风险揭示 15%）
  - 到达目的地：7.0 —— 主路（5 件 ＋ 3 件收尾）铺得全、顺序对，三处 chef 现状（开库后分派／frontmatter／冻结名单）点得准；但**新件的落点**这一格是空的，且票 7 票面里的落点与地图正文冲突没有点出来。
  - 新规合规：5.0 —— 只查到铁律一／二／四各一处命中（照抄一份不算走接口／8 联动两份拷贝／`src/triggers/` 是工种名）；**必报五步一个字没有**，告警线口径（350 ＋ LF）与它的落点（`packages/skill-chef/AGENTS.md`）一个字没有，铁律三与铁律五没有落到件上。
  - 下游可直接使用：5.5 —— 件级清单可用；**三层换算、字段映射、落点**三件交给票 5／6 的活都没落到「改哪个件、改成什么」。
  - 风险揭示：7.0 —— 消费者计数纠正（3 家 → 实测 2 家）、居家并行线、建库副作用都是真收获；两份定义的真实代价（含锁与门）低估。
- **一句话结论**：这是一份合格偏上的「bill 交付线逐件解剖 ＋ 件级照抄清单」，但它把**本图与邻居地图唯一的那点差异（四条新规）**留在了原地——抄哪几件说得清，**抄到 chef 的哪个目录、中间那层从哪来、超线了报不报**都说不清，因此它可以当票 5／6／7 的**开工输入**，不能当它们的**开工依据**。
- **硬伤条数：6**。

---

## 一、逐条审查结果（对应上面 10 问）

| # | 审查问题 | 结论 | 依据（路径:行号／命令输出） | 严重度 |
|---|---|---|---|---|
| 1 | 照抄清单能不能真的产出目的地第 1 条 | **基本合格，三处断点**：①`src/output.ts` 归属未定（报告自己标「不抄，或另裁」），而它是落盘的唯一入口；②`helpInitialized()` 不能用 `resolveDbPath()`（那件自带建目录副作用）；③新增三件（`helpFile.ts`／`helpPaths.ts`／`output.ts`）在 chef 侧住哪个目录，报告没写 | `t1-bill-recipe.md:130`（output.ts 标「不抄，或另裁」）；`packages/skill-chef/src/fetch/paths.ts:20-22`（`resolveDbPath` 先 `mkdirSync(dir,{recursive:true})`，报告引用了 `:21` 但没说出「库还没建、目录先被建出来」这层意思，`t1-bill-recipe.md:155`）；落点缺口见硬伤 1 | 中 |
| 2 | 照抄清单能不能满足目的地第 2 条 | **合格**。通用 help 模板这条链指得清：`base-paint/help-shell` 的 `renderHelpShellHtml(data)`（`:146` 标「不抄、不改，只 import」）、移出 `SKILLS_BASE_FROZEN`（`:140`，:`15` 摘要第 ③ 条）、生成物禁手改（`:146` 的 `gen-help-shell.cjs` ＋ `gen-help-shell:check`）。**老件 `templates/help.html`（自持壳）没被当成可抄对象**：`:147` 明确「不抄、不要」，`:601` 又把「chef 自带的『现找』页模板」与「共享 help 模板」单列为易混点 | `t1-bill-recipe.md:146`／`:147`／`:601`；`packages/skill-chef/templates/help.html` 实测仅 266 B（`templates/` 下 8 个 HTML，252–281 B，都是收据页模板） | 无 |
| 3 | 「抄」的尺度是否合乎新规（**本图与邻居地图唯一的差异点**） | **有硬伤**。报告点到了铁律四却只点到一件：`src/triggers/wake-assets.ts` 的落点不能照抄（`:131`／`:156`），另外拿居家同类判断当先例。但清单里建议「改」的三件——`helpFile.ts`（原住 `src/render/`）、`helpPaths.ts`（原住 `src/render/`）、`output.ts`（原住 `src/` 根）——**都没有写 chef 侧该住哪**。`src/render/` 与 `src/cli/` 是工种名；把落盘件放在 `src/` 根更直接违反结构标准「`src/` 下第一层必须是能力名」（`docs/agents/structure.md:64`，卡路里结构设计里就为这一条否掉了 `src/render/docPage.ts` 这个落点）。**同题先例写得更细**：居家的照抄清单单列一节「居家要新建哪些件（候选清单＋建议落点，不定案）」，逐件给建议落点与理由，并明说「不照抄 `src/triggers/`」（`docs/skills/skill-home/t184-bill-recipe.md:46-54`） | `t1-bill-recipe.md:131`／`:144`／`:156`；`docs/agents/structure.md:44-49`／`:64`；先例 `docs/skills/skill-calorie/t179-180-structure-design.md:72`（「把新文件放在 `src/` 根上，第一层就多了一个非能力名的条目」）；`docs/skills/skill-home/t184-bill-recipe.md:46-54` | **高** |
| 4 | 两层→三层这道坎，报告有没有摆清 | **不合格**。报告通篇把 `10 域／33 组／48 场景` 当一个既成事实的数字串用（`:13`／`:128`／`:132`／`:364`／`:370`／`:599`），**没有一处说明这三个数分别落到模板契约的哪一层**。模板契约是三层的：`groups[{id,icon,label,subgroups[{label,scenes[]}]}]`，于是 `10 域＝groups`、**`33 组＝subgroups`（模板要求的新中间层）**、`48 场景＝scenes`。而老件压根没有这一层：老载荷的 33 个 `wake_words[]` 是一级分组，48 条 `scenarios[]` 是它的叶子——即老件是两层。谁提供中间层、按什么规则把 33 个老一级组挂到 10 个域下，报告没有答案（`§6.1` 第 6 条只问「`wake-assets.ts` 那 6 个字段够不够装老厨的 10 键」，问的是字段不是层） | 模板：`packages/base-render/assets/help-template.html:1658-1682`（`normalizeScenes` 读 `s.title`／`s.wake_word`／`s.types`／`s.status`／`s.prompt_template`；`GROUPS` 读 `g.id`／`g.label`／`g.subgroups[].label`／`sg.scenes`）；老件实测（本席只读解析 `.scratch/chef-help/legacy-chef-help-payload.json`）：`wake_words=33`、叶子 `scenarios=48`、`wake_words[].scenarios` 里 48 个 `scenario_id` **与叶子 48 条一一对应、无重复、无遗漏**，且**每个老一级组只落一个域**——即中间层的换算是**可以机械做出来的**，缺的只是有人在清单里把它写死。报告 `t1-bill-recipe.md:128`／`:132`／`:364`／`:370`／`:383` | **高** |
| 5 | 字段两代不兼容，报告有没有落到「哪些件要改、改成什么」 | **有硬伤，且报告自己写错了两处字段名**。报告只在 `§6.1` 第 6 条（`:383`）承认有这回事，然后推给票 2／票 5，没有给出「哪个件、改成什么」的表；对照表那一条（`scenario_title→name`、`scenario_id→key`）抄的是地图正文里**通用模板内部归一化**的说法，而仓内模板实际读的是 `s.title`（`scenario_title→title`）与 `s.id`（`scenario_id→id`）。本席实测老载荷场景的键是 `scenario_id, scenario_title, dimensions, prompt, status, result, wake_word, type, html, variants`（10 键），**没有 `prompt_template`、没有 `types`**；模板要的 `prompt_template` 与 `types` 老件都没有，`type`（单数、如「查看」）在模板里**没有任何读取点**，不换就整批徽章消失（模板只在 `:1727` 渲染 `s.types`） | 老载荷键名与 `wake_word`／`type`／`status` 取值：`.scratch/chef-help/t1-review-B/evidence-core.txt`；模板读取点：`packages/base-render/assets/help-template.html:1660-1674`／`:1727`／`:1698-1699`（`TYPE_DEFAULT` 只给 5 个词配色，照 bill 的 `WakeSceneType`＝`采集／查看／选择／向导／回执`）；老模板也读 `prompt`：`D:\2Study\StudyNotes\SKILLS\私家大厨\templates\help.html:373`（`sc.scenario_title`、`sc.prompt`、`sc.result`、`sc.wake_word`）——两代**连老件内部都不自洽**；报告 `t1-bill-recipe.md:383`／`:599` | **高** |
| 6 | 「不抄」的 6 件对不对 | **每件不抄都对，只有一件的写法会把票 4 的手绑住**。逐件核：卡路里 `output.ts`（不抄，正确：三态交付／命令名→中文段落映射是卡路里自己的产物模型）、卡路里 `render/helpPaths.ts`（不抄，正确）、卡路里 `render/helpShell.ts`（不抄，正确：多一层转发＝白占一层）、卡路里 `helpCenter.ts`／`helpFile.ts`（不抄，正确）、`base-render` 那三件（不抄、不改、只 import，正确）、`skill-chef/templates/help.html`（不抄、不要，正确）。**唯一问题**：卡路里 `render/helpPaths.ts` 不是「永远不用管」——票 4 若判「收成共用位」，它就是必须一起改的第二个现存调用点（结构标准的「就地摆正」）。报告把它标成纯「不抄」，等于把就地摆正那半句藏起来了（`:143` 只补了一句「它的存在本身就是票 4 的输入」） | `t1-bill-recipe.md:142-147`；`docs/agents/structure.md:68`（就地摆正）；同题更全的写法见 `t1-bill-recipe.md:309`（乙路已提到「三家一起改成走它」） | 低 |
| 7 | 报告有没有越界做决定 | **没有越界**。票 4 的三条路只列不选（`:302-312`，并注明「该页的推荐，不是裁决」）；票 5／6 的活归票 5／6（`:128`／`:131`／`:383`）；速查支名字归票 4（`:129`／`:390`）；`version` 归票 3／6（`:153`）；初始化判据归票 3／6（`:379`）。唯一**接近**越界的是一句可读成结论的路由建议（`:14`「所以 (b) 对本图不再自然适用」），但它紧跟「这正是票 4 要裁的」，且 `§6.2` 第 1 条再次声明「本票不出答案」 | `t1-bill-recipe.md:6`（票面口径）／`:14`／`:302-312`／`:388` | 无 |
| 8 | 风险与腐化：会不会变成两份／三份定义 | **有硬伤（低估代价）**。报告把「三份同逻辑」的代价写成「以后改命名要改三处」（`:308` 甲路），漏了**机械代价**：第三份还要配一份自己的锁（bill 那两份测试的用例与常量都要复制一遍），并且「哪个目录名常量算这份管线的消费者」这件事要靠人肉判断——这正是 `§4.3` 用来数消费者的口径。反过来说，报告在「两次定义」上有一条真收获：`build-help.mjs:17` 的「8 联动」是同一数字的第二份拷贝（`:133`，铁律二），并点出 `HELP_WAKE_WORDS` 该从口径层派生而不是落第二份字面量（`:77`）。**报告没有说**的是：chef 侧这份口径层已经在 `src/policy/wakewords.ts`（73 行，`WAKE_TABLE`），内容资产与它必须双向对账——这条只在 `:138`／`:348`／`:370` 作为「锁的形状」出现，没写成「不许两处定义」 | `t1-bill-recipe.md:130`／`:247`／`:308`／`:133`／`:138`；`packages/skill-chef/src/help/lookup.ts:1`（`WAKE_TABLE` 唯一上游）／`:27`（37 短语的构成写死在注释里） | 中 |
| 9 | 告警线：有没有指认哪些被改的件会超 350 行 | **不合格**。报告给出了两处**已经**超线的数（`src/cli/cmd_read.ts` LF=388、`src/fetch/db.ts` LF=451，`:448`／`:53`／`:15` —— 本席复核数值一致），但**全文没有出现「350」，没有出现「AGENTS.md」**，也没写出必报五步第四步那句「已超线，需要根据规则进行重构。」。于是三件事悬空：①口径（350 ＋ LF）没有落到任何一张票的清单里；②落点 `packages/skill-chef/AGENTS.md` 至今不存在（本席实测 `packages/` 下 AGENTS.md 数量＝0）；③票 7 要在 `cmd_read.ts` 里加 HELP 分支（该文件 388 行），报告没说这一笔会让超线更长 | 本席实测：`cmd_read.ts` LF=388／`db.ts` LF=451／`packages/skill-chef/AGENTS.md` 不存在（`.scratch/chef-help/t1-review-B/evidence-core.txt`）；用户原话 Q4b「350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md」（`map-chef-body.md:141`／`:156`）；`docs/agents/structure.md:70`／`:97-101`；报告 `:448` 只有数字、没有口径 | **高** |
| 10 | 公开测试／门：有没有说清哪道门会红、哪道必须绿 | **不合格**。报到的只有两道：`boundaries`（`:140`，必改名单一行）与 `check-publish.mjs:63`（`:227`／`:384`，只改行为不改命令名应当不红）。`snapshot:html:check`／`snapshot:check` 只在 `§6.1` 第 4 条当「不确定项」写（`:381`），没有当成「必须绿」的门，也没有写成票 6 的关票条件（票 6 票面倒是写了：`t6-body.md:9` 要求移出名单后跑这两道门并注意 `tooling/test/skill-html-snapshot.test.mjs:57`／`:103-104` 把 chef 的命令数与模板数写死成 8——**报告一个字没提这条硬断言**）。`client-bundle-48` 全文零命中（`:381` 引的是 `client-bundle-48` 之外的快照件）；而邻居复盘里最硬的一条配方点恰恰是它：「装任何插件进 profile 之前，先跑 `test/client-bundle-48.test.mjs`——它是这条契约的门；『预存失败』不等于『与本次无关』」（`.scratch/chef-help/B2-recipe-bill-map143.md:389`）。本席实测 `node tooling/skill-html-snapshot.mjs --check` → `changed=0 added=0 removed=0`（185 件产物），这本来是一条可以写进报告的**实测绿**，报告却只写了「应当」 | 本席实测门：`node tooling/skill-html-snapshot.mjs --check` → `OK: 5 技能 HTML 快照 == 实际（185 件产物）`；硬断言：`tooling/test/skill-html-snapshot.test.mjs:103`（`EXPECT_KEYS = { bill:16, chef:8, … }`）／`:104`（`EXPECT_TPL = { … chef:8 … }`）／`:110-111`／`:123`；报告 `:381`／`:384`／`:568`（如实声明未跑门） | **高** |

---

## 二、硬伤（会直接妨碍达到目的地或违反新规）

### 硬伤 1 · 新增三件在 chef 侧住哪个目录没定，而这一格是四条新规压在本图上的唯一落点

- **问题**：清单只写「照抄／改」（`t1-bill-recipe.md:128-134` 的「照抄／改／不抄」列），没有一列写 chef 侧的落点。三件新增件的原住址分别是 `src/render/helpFile.ts`、`src/render/helpPaths.ts`、`src/output.ts`——`render` 是工种名，`src/` 根更不是能力名。报告只在 `wake-assets.ts` 那一行提了「落点 `src/triggers/` 是工种名……chef 侧应落 HELP 域目录下（票 6 结构设计定）」（`:131`／`:156`）。
- **证据**：`docs/agents/structure.md:44-49`（铁律四）／`:64`（`src/` 下第一层必须是能力名）；同题先例 `docs/skills/skill-home/t184-bill-recipe.md:46-54` 有一整节「要新建哪些件（候选清单＋建议落点，**不定案**）」，逐件给建议落点；卡路里先例 `t179-180-structure-design.md:72` 为「新文件不能放 `src/` 根」写过理由。chef 侧已有一条现成的 HELP 目录：`packages/skill-chef/src/help/`（`lookup.ts` 49 行 ＋ `index.ts` 1 行），本席实测存在。
- **妨碍**：妨碍目的地第 ①②条落地（票 6／7 的第三步没有起点），并直接把票 6／7 的**第一步影响清单**变成猜谜——而第一步判据要求「每行指向一个能力目录」（`structure.md:80`）。若有人图省事在 `src/` 根建 `output.ts`，就地摆正时还要再搬一次（卡路里在同一坑里踩过）。
- **最小修法**：在清单里加一列「chef 侧建议落点（不定案）」，三件逐件写，并加一句：若票 2 判某域承载内容资产，则内容资产住该域目录或 `src/help/`，**不新开 10 个域目录**（10 个域各开目录＝声明 10 个能力，各自要有公开接口，属铁律五与第二步的范围）。

### 硬伤 2 · 三层的中间层没有事实源、也没有归属

- **问题**：`10 域／33 组／48 场景` 被当数字串使用，没有一处说明它们分别落到 `groups`／`subgroups`／`scenes` 哪一层，也没说中间层由谁造。
- **证据**：模板契约 `packages/base-render/assets/help-template.html:1658-1682`（`subgroups[].label` ＋ 非空 `scenes`；这与地图 Notes `:39` 记的注入器硬校验一致）；老件两层、33 个一级组＝`wake_words[]`：本席只读解析实测（`evidence-core.txt`）33 个老一级组挂到 10 个域上、组内场景数与 48 条一一对应、无重复无遗漏，**且每个老一级组只落一个域** → 中间层可机械产出；报告 `t1-bill-recipe.md:128`／`:132`／`:364`／`:370` 只写「10 域／33 组／48 场景」。
- **妨碍**：妨碍目的地第 ③ 条（内容是私家大厨自己的）与票 5 入库。没有这张表，票 5 最可能的错法是**把 33 个老一级组按原样塞进 `scenes` 位**（数字看起来对得上），结果 48 张场景卡降到 33 张、每张卡的唤醒词与 `prompt_template` 全错位——这正是「抄错对象」最贵的一种。
- **最小修法**：报告补一张三列表（`域 → 老一级组（＝中间层 label）→ 场景 id`），并写明：**由票 2 的对账表定，票 5 照填**。本席已把这张表的主体算好，可直接抄：做菜 ← 做菜模式；查看 ← 查看食谱／查看食材／查看步骤／查看营养／查看背景；搜索筛选 ← 搜索食谱／筛选菜系／筛选食材／筛选难度／筛选时间／筛选炊具／筛选口味／筛选季节／筛选状态／查看全部；修改 ← 修改食谱／修改步骤／修改食材／废弃食谱；历史 ← 记录做菜／查看历史／查看统计；采购 ← 生成清单；录入 ← 录入食谱／导入食谱；派生 ← 添加派生关系／查看派生关系／从已有派生新菜；开始使用 ← 首次使用；数据管理 ← 体检／批量改／备份（合 33 个）。

### 硬伤 3 · 告警线口径与落点全文缺失，且已超线的两件没有当场报

- **问题**：全文无「350」、无「AGENTS.md」、无第四步报警句式。报告只给了两处已超线的**数字**。
- **证据**：本席实测（`evidence-core.txt`）：`src/cli/cmd_read.ts` LF=388、`src/fetch/db.ts` LF=451、`packages/skill-chef/AGENTS.md` 不存在、`packages/` 下 AGENTS.md 数量＝0。用户原话 Q4b 把口径与落点都点死了（`map-chef-body.md:141`／`:156`），`docs/agents/structure.md:70` 要求告警线数字「写在各包自己的地方」、`:97-101` 要求超线当场报警。
- **妨碍**：妨碍四条新规的落地与票 7（票 7 要在 388 行的文件里加 HELP 分支，超线会继续变长）；也让票 5／6／7 的第四步无据可依。
- **最小修法**：报告加一段「告警线」：口径 350 ＋ LF；落点 `packages/skill-chef/AGENTS.md`（今天不存在，需新写，谁写要在票面上点名——本图的票面里没有任何一张票认领它）；已超线两件当场报「已超线，需要根据规则进行重构。」；并注明票 7 碰 `cmd_read.ts` 会让它更长，须在票 7 的第四步里给拆法或说明这次先不拆。

### 硬伤 4 · 必报五步不在清单里，四条新规只落了一条

- **问题**：报告只有铁律四被点到（`:131`／`:156`），铁律一的「抄一份不算走接口」被点到（`:14`／`:130`／`:308`），铁律二的「8 联动两份拷贝」被点到（`:133`）。**必报五步（第一步影响清单、第二步结构设计、第五步交付对账）全文零命中**，铁律三／铁律五也没有落到件上。
- **证据**：本席对报告全文检索「铁律／五条／能力目录／影响清单／结构设计／第五步／就地摆正」只有 8 处命中，全部指向铁律一／二／四（见第一节第 3／8 行的引文）。用户裁定「四条，照居家」＝四条新规全取（`map-chef-body.md:45-49`／`:155`）；票 5／6／7 票面各自写着「第一步与第二步先报用户点头；交付时报第五步」（`t5-body.md:14`／`t6-body.md:15`／`t7-body.md:11`）；`structure.md:107` 说第五步是**唯一机械验收点**。
- **妨碍**：不妨碍拿到文件，但妨碍「按新规完成」——本图与邻居地图唯一的差异就在这里，清单里不提，等于把差异留给下游各自记忆。
- **最小修法**：在清单表下加一列／一节「新规动作」：票 5／6／7 各自要报的第一步（逐行指向一个能力目录）与第二步（新目录树 ＋ 每件对外给几个）；交付时报第五步对账；并把「一行里出现两个能力名要写理由」（`structure.md:81`）这句抄给票 4 的三条路（若合流到共用位，那份件要写得出哪两个能力在用）。

### 硬伤 5 · 字段两代不兼容没有落到件上，且报告里两处字段名与仓内模板不符

- **问题**：报告把字段问题整段塞进 `§6.1` 不确定项（`:383`），用地图正文的归一化说法（`scenario_title→name`、`scenario_id→key`）当映射表，而仓内模板实际读 `s.title`／`s.id`；`prompt→prompt_template` 这条最要命的改名完全没出现；`type`（单数）→`types`（数组）被提到，但没写清「模板里 `type` 没有任何读取点，不换就整批徽章消失」。
- **证据**：老载荷场景键实测＝`scenario_id, scenario_title, dimensions, prompt, status, result, wake_word, type, html, variants`（无 `prompt_template`／无 `types`）；模板读取点 `packages/base-render/assets/help-template.html:1660-1674`（`s.title`／`s.wake_word`／`s.types`／`s.status`／`s.prompt_template`／`s.editable_fields`）与 `:1727`（只渲染 `s.types`）、`:1698-1699`（`TYPE_DEFAULT` 只有 5 个词的配色，与 bill `WakeSceneType`＝`采集／查看／选择／向导／回执` 同表）；老模板读的是 `sc.prompt`（`D:\2Study\StudyNotes\SKILLS\私家大厨\templates\help.html:373`）。
- **妨碍**：妨碍目的地第 ①（文件能打开但内容错）与第 ③（内容是自己的）；票 5 按错的映射表入库，会得到「页面能开、徽章空、抽屉里的 prompt 空白」的产物——最像完成、最难发现的一种失败。
- **最小修法**：把 `§6.1` 第 6 条提升为清单里的一行「字段换算」，给出四行映射：`scenario_id→id`、`scenario_title→title`、`prompt→prompt_template`、`type`（老 11 型字符串）→`types`（数组，词表须收进模板 `TYPE_DEFAULT` 的 5 个词或明写为自定义配色对象）；`status` 照传（老件 48/48 空串，模板按 `【待开发】` 判，空串即「可用」，与老页恒显「✓ 可用」一致）。

### 硬伤 6 · 公开测试面没报全：会红的那条硬断言与「装插件前必跑」的那道门都没提

- **问题**：`client-bundle-48` 全文零命中；`tooling/test/skill-html-snapshot.test.mjs` 里把 chef 命令数与模板数写死成 8 的三条断言没提；`snapshot:html:check` 与 `snapshot:check` 只当「不确定项」，没当「必须绿」。
- **证据**：`tooling/test/skill-html-snapshot.test.mjs:103`／`:104`／`:110-111`／`:123`（新增联动命令或模板页即红）；`.scratch/chef-help/B2-recipe-bill-map143.md:389`（「装任何插件进 profile 之前，先跑 `test/client-bundle-48.test.mjs`……『预存失败』不等于『与本次无关』」——这条配方点正是 bill 那张图踩出来的事故）；本席实测 `node tooling/skill-html-snapshot.mjs --check` → `changed=0`（185 件产物），即这一道今天**实测绿**。
- **妨碍**：妨碍目的地第 5 条（插件侧与真机装机）——票 10／11 是装插件的那两张票，恰恰是这道门守的面；也让票 6／7 关票时把「红了的那条」当成「预存失败」放过。
- **最小修法**：报告加一节「门」：必绿＝`boundaries`（须先移出名单）、`snapshot:html:check`（本席实测 changed=0）、`snapshot:check`、`pnpm --filter skill-chef test`；**会被本图碰红**＝`tooling/test/skill-html-snapshot.test.mjs` 的固定数字（新增命令或模板页就要同批改）；**装插件前先跑**＝`test/client-bundle-48.test.mjs`（并把当前 pass/fail 记成开工基线）。

---

## 三、纸面推演：照报告走能不能落出目的地那份文件

按报告列的件与顺序走一遍（不写代码，只看清单与顺序）：

1. **内容资产**：老骨架 10 域／33 组／48 场景 → typed const ＋生成器（报告 `:132`）。**断点 ①**：报告没说 33 组落到 `subgroups` 位，也没给域—组—场景的对照表；照它走，入库形状由实施者临场决定 → 大概率把 33 个老一级组当场景。此处**不断则走不下去**（资产是渲染的上游）。
2. **渲染接线**：资产＋派生 → `base-paint/help-shell` 的 `renderHelpShellHtml`，零 IO（报告 `:128`／`:146`）。**断点 ②**：新件住哪个目录没写（硬伤 1）；字段换算没写（硬伤 5）。语义上这一步是通的：`HELP_FILE_STEM`＝`私家大厨_HELP`、落点常量换 `cook_html/help`（两段）、时间戳通式照抄（`:129`）。**5 键 ＋ 三块可选键**都有来源（`skill_name`／`title`／`subtitle`／`contact`／`groups` ＋ `meta_blocks`／`version`／`init_banner`），其中 `version` 与 `HELP_CONTACT` 明确标为待票 3／6。
3. **命名与落点通式**：`resolveStemTarget(dbDir, '私家大厨_HELP', now)` → `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<YYYYMMDD_HHMMSS>.html`。报告正确指出 **`HELP_HTML_DIR_NAME` 一个常量不够（两段）**，并正确要求保留 `resolve(dbDir)` 归一（`:151`／`:152`）。destination 第 1 条的路径形状在这一步**能对上**。
4. **独占落盘点**：`wx` 独占 ＋ `EEXIST` 递补 ＋ `resolve()` 绝对路径 ＋ 仅 `EEXIST` 重试（报告 `:69`／`:71`）。**断点 ③**：这一件报告自己标「**不抄，或另裁**」（`:130`），归属在票 4 手里 → 票 4 未裁之前，第 4 步没有件。这是**真断点**：独占写是「同秒不互相覆盖」的唯一机械保证，缺了它，回执给的路径可能不是本次产物（`#128` 的因果）。
5. **出口分派**：把 HELP 分支抬到 `main` 里、`dispatch` 之外（`:134`／`:155`）→ 跑完不建 `chef_data.db`。判「已初始化」不能用 `resolveDbPath()`（它 `mkdirSync`，`fetch/paths.ts:20-22`），只能用只读的 `existsSync` 一类。报告说出了「要绕开它」（`:155`），但没把「绕开谁、用什么替」写死。**这一步能走通，但落笔点靠实施者自己找。**
6. **回执**：`delivery{mode:'file', path, bytes}` 顶层追加、五字段不动（`:181`）。chef 今天是 `process.stdout.write(JSON.stringify(env) + '\n')`（`src/cli/cmd_read.ts:385`），追加方式与 bill 同形 → **能对上**；destination 第 1 条的「回执给绝对路径」在这一步能达成。
7. **收尾三件**：真 spawn 锁（归票 8）、`SKILL.md`「HELP 交付」节（票 9；报告正确点出当前 frontmatter 的 description 写的是「查怎么办」＝旧口径，改行为时要同批改，`:158`／`:300`）、插件侧最小装机（票 10；报告正确标出并发会话已在做，`:141`）。
8. **过门**：`boundaries` 必须先移出 `SKILLS_BASE_FROZEN`（报告 `:140` 在清单里）；`snapshot:html:check`／`snapshot:check` 报告只写「应当绿」（`:381`，本席实测确实绿）；`client-bundle-48` 没提。

**推演结论**：**照报告走，能落出 `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<TS>.html` 这份文件的外形（名字、落点、回执都对得上），但落出来的内容很可能不是目的地要的那份**——因为第 1 步没有层对照表（33 组会被当成 33 张卡）、第 4 步的落盘件还没归属、第 5 步的初始化判据没有替手。三处断点里，**第 4 步是真断点（票 4 未裁），第 1 步与第 5 步是清单缺项（本报告改一行就能补上）**。

---

## 四、越界与漏项

**越界：0 条。** 报告对票 4／5／6／7 的归属守得住（详见第一节第 7 行）；三条路与代价只列不选，并两次声明「本票不出答案」（`:6`／`:388`），对说明页的推荐也明确标了「这是该页的推荐，不是裁决」（`:312`）。

**漏项：6 条**

1. **新件落点**（硬伤 1）：三件新增件在 chef 侧住哪，全文没有建议落点。
2. **三层换算的对照表**（硬伤 2）：`10 域／33 组／48 场景` 落到哪一层，没有一句话交代。
3. **告警线口径与落点**（硬伤 3）：无「350」、无 `AGENTS.md`、无第四步报警句。
4. **必报五步**（硬伤 4）：四条规定动作整节缺席。
5. **会红的门与要跑的门**（硬伤 6）：`tooling/test/skill-html-snapshot.test.mjs` 的固定数字、`test/client-bundle-48.test.mjs` 都不在报告里。
6. **票 7 票面里的落点与地图正文冲突**：`t7-body.md:5` 写的是 `<SKILLS_DB_PATH>/CookHub/help/私家大厨_HELP_<stamp>.html`，而地图 `Decisions`／用户原话已改判为 `<SKILLS_DB_PATH>/cook_html/help/`（`map-chef-body.md:31`／`:170`）。报告在 `§2.1` 第 1 条把「cook_html/help」讲清了，但**没有点出票 7 票面这份陈旧路径需要同批改**——票 7 的实施者若照自己票面落盘，产物会落到老目录 `CookHub/help/`，destination 第 1 条当场不成立。（另：票 7 票面用的是老通式说明；这正是报告该接住的一棒。）

另记两条「近乎漏项」的观察，供下游参考（本席实测，报告未记）：

- **老载荷与两代契约的字段关系比报告说的干净**：48 条场景的 `wake_word` 字段已经存在、`html.template` 已有值，模板的 `chip` 位不需要新造词；缺的只有 `prompt→prompt_template`、`title`、`types` 三处改名与一个类型词表。
- **`types` 的词表有硬约束**：模板的 `TYPE_DEFAULT`（`help-template.html:1698-1699`）只给 5 个词配色，与 bill 的 `WakeSceneType`（`采集／查看／选择／向导／回执`）同表；老 chef 的 `type` 取值是「查看」「向导+选择+回执」这一类，直接搬进 `types` 会出现没有配色的徽章（模板会退回默认色，不报错）——票 5 要么收词表，要么改成 `{text,bg,fg}` 形式。

---

## 五、给票 4／6／7／10 的风险提示

**给票 4（`#212`，命名落盘管线归属＋缺省出口口径）**

- 报告摆上桌的三条实测都成立且有用：消费者按**落盘／命名管线**算是 2 家（`calorie_html`／`biscuit_accountant_html` 两处常量、跨技能 import 0 处）、居家 `#187` 与大厨 `#212` 同时等这一道裁、`chef.help.lookup` 今天会建库。这三条都建议原样带进票 4。
- **要补的代价**：甲路（自持第三份）的真实代价不止「改命名要改三处」——还要**多一份自己的锁**（bill 那两份测试的形状与常量都得再抄一遍），并且「谁算这份管线的消费者」这件事以后要靠人肉判断（报告的 `§4.3` 就是这么数的）。乙路的代价报告量得挺准（边界门一行 ＋ 发布门四个数组），但要提醒：**乙路同时要改卡路里那份 `render/helpPaths.ts` 与 `output.ts`**（就地摆正），工作量不是「只多一张票」。
- **本席实测补充**：`node tooling/skill-html-snapshot.mjs --check` 今天绿（`changed=0`），所以票 4 若判乙路，风险不在快照面，而在卡路里那条已收口的技能线。

**给票 6（`#214`，渲染接线）**

- 票 1 交不出「第一步影响清单」与「第二步结构设计」——新件落点这一格是空的。开工前**必须**先把落点定下（建议落 `src/help/`，chef 已有这条 HELP 目录；不要新开 10 个域目录）。
- 三层中间层的来源必须在第二步里写死由票 5 提供（否则渲染层的 `groups` 类型对不上）。报告 `:128` 只说「`groups` 类型要接 chef 自己的 10 域／33 组／48 场景资产」，没说这串数字的三层归属。
- 票 6 关票时**别把这条当预存失败**：`tooling/test/skill-html-snapshot.test.mjs:103-104` 把 chef 写死成 8／8，新增命令或模板页会红，须同批改（票 6 票面已写，报告没有）。
- 移出 `SKILLS_BASE_FROZEN` 是票 6 的活（报告 `:140` 在清单里、`:15` 也点了），顺带提醒 `tooling/check-boundaries.mjs:34-36` 的注释要照 bill 先例补理由。

**给票 7（`#215`，出口与命名落盘）**

- **票面路径是陈旧的**：`t7-body.md:5` 仍写 `CookHub/help/`，以地图 `Decisions` 与用户原话的 `cook_html/help/` 为准——这一条要在票 7 开工前改票面，否则照票面落盘就落错目录。
- `cmd_read.ts` 现 388 行（超 350），本票还要加 HELP 分支与交付分支；第四步报警与拆法要当场给（报告没有提这一格）。
- 判「已初始化」不许调 `resolveDbPath()`（`fetch/paths.ts:20-22` 会 `mkdirSync`）；只读判据要写死，并保持「读失败照显」的 fail-open 口径。
- 回执要顶层追加 `delivery`、既有五字段一字不改（`src/cli/cmd_read.ts:385` 现在就是一行 `JSON.stringify(env)`），`path` 必须是 `resolve()` 后的绝对路径；`data` 换成域级索引时 `chef.help.lookup` 的 `shape` 仍是 `list`（`src/render/envelope.ts:13`），载荷要带 `items`／`total`，否则 `createEnvelope` 会抛形状不符。
- `tooling/check-publish.mjs:63` 钉的是命令名 `chef.help.lookup`：只改缺省产物、不改命令名，这道门不动；若票 4 要改名，这道门与 `base-combos` 的登记要同批改。

**给票 10（`#218`，插件侧最小装机）**

- 该目录今天已出现 `skill-provider.ts`（5,074 B）／`dsh-ctx.ts`（2,281 B）／`test/skills-provider.test.mjs`（6,539 B）／`tsconfig.client.json`／`tsdown.config.ts`（本席实测）。**开工前先落一份基线**（`git status` ＋ 这三件的哈希），否则票 10 的对账说不清哪些是自己改的。
- `plugin-chef/src/skill-provider.ts` 的存在让 `SKILLS_BASE_FROZEN` 的源码扫描范围本身没变（那只扫技能包），但插件侧的真机可见性归 `test/skills-provider.test.mjs` 与 `test/client-bundle-48.test.mjs` 两道；**装进 profile 之前先跑 `client-bundle-48`**，并把当前 pass/fail 记成基线（邻居复盘 `.scratch/chef-help/B2-recipe-bill-map143.md:389` 的教训）。
- `SKILL.md` 的 frontmatter 已由并发会话补上，description 写的是「`chef.help.lookup` 查怎么办」——票 4 若改缺省口径，这一行要跟票 9 同批改（报告 `:158`／`:300` 已点）。

---

## 六、最小整改清单（按性价比排序，≤6 条）

1. **补一张「域 → 中间层 → 场景」对照表**，写明 `10 域＝groups`、`33 组＝subgroups`、`48 场景＝scenes`，并注明「由票 2 的对账表定、票 5 照填」。第一节第 4 行已给可直接抄的表体。**（改一处，救票 5 与票 6）**
2. **在清单里加一列「chef 侧建议落点（不定案）」**，逐件给建议（`helpFile.ts`／`helpPaths.ts` ／落盘件建议落 `src/help/`），并写明不许放 `src/` 根、不要新开 10 个域目录。**（改一处，救票 6／7 的第一步）**
3. **把字段换算从 `§6.1` 提升进清单**，给四行：`scenario_id→id`、`scenario_title→title`、`prompt→prompt_template`、`type→types`（附「模板只渲染 `types`，不换徽章全空」＋ 5 词配色表），并顺手改掉报告里 `scenario_title→name`／`scenario_id→key` 这两处与仓内模板不符的写法。**（改一处，挡住「页面能开但内容错」）**
4. **加一节「门」**：必绿（`boundaries` 移出名单后跑通、`snapshot:html:check` 实测 changed=0、`snapshot:check`、`pnpm --filter skill-chef test`）／会红（`tooling/test/skill-html-snapshot.test.mjs` 的 8／8 固定数字）／装插件前先跑（`test/client-bundle-48.test.mjs` 并记基线）。
5. **加一段「告警线＋必报五步」**：350 ＋ LF；落点 `packages/skill-chef/AGENTS.md`（今天不存在，需在票面上点名由谁写）；`cmd_read.ts`（388）与 `fetch/db.ts`（451）当场报「已超线，需要根据规则进行重构。」；并写明票 5／6／7 各自要报第一步／第二步／第五步。
6. **点出票 7 票面的陈旧落点**：`t7-body.md:5` 的 `CookHub/help/` 与地图定案的 `cook_html/help/` 冲突，需在票 7 开工前改票面（并在报告里留一句「以地图 Decisions 与用户原话为准」）。

---

## 附：本席实测复核清单（供 A 席与下游交叉核对）

| 项 | 本席实测 | 报告写法 | 是否一致 |
|---|---|---|---|
| `packages/skill-chef/src/cli/cmd_read.ts` 行数 | LF=388 | 388（`:448`） | 一致 |
| `packages/skill-chef/src/fetch/db.ts` 行数 | LF=451 | 433（`:53`，地图口径）＋451（本席） | 报告未列此值；地图写「约 433」，本席实测 451（两者都可读作「远超线」，但票 6／7 写对账时应取实测） |
| `packages/skill-chef/AGENTS.md` | 不存在；`packages/` 下 AGENTS.md 数量＝0 | 全文未提 | 报告缺失 |
| `packages/skill-chef/src/output.ts` / `render/helpFile.ts` / `render/helpPaths.ts` | 三件都不存在 | 「chef 今天没有落盘点」（`:296`） | 一致 |
| `packages/skill-chef/src/help/` | 存在（`lookup.ts` 49 行 ＋ `index.ts` 1 行） | 作为「速查数据源」提到（`:226`） | 一致，但未作为落点候选使用 |
| `tooling/check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN` | `:37`，断言 `:39-44`＋`:45-60` | `:37`／`:39-44`／`:45-60`（`:140`） | 一致 |
| `node tooling/skill-html-snapshot.mjs --check` | `changed=0 added=0 removed=0`（185 件产物） | 「应当绿，未跑」（`:381`） | 报告保守，实测绿 |
| `tooling/test/skill-html-snapshot.test.mjs` 固定数字 | `:103` `chef:8`／`:104` `chef:8`／`:110-123` 总数断言 | 全文未提 | 报告缺失 |
| 老载荷三件事 | 33 个 `wake_words`（老一级组）／48 条叶子场景／33 组各自只落一个域 | 只重复「10 域／33 组／48 场景」 | 报告未把关系写清 |
| 老场景键名 | `scenario_id, scenario_title, dimensions, prompt, status, result, wake_word, type, html, variants`（无 `prompt_template`／`types`） | 「老场景 10 键」（`:383`） | 数目一致，改名清单缺失 |
