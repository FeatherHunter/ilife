# 先例地图与既有台账（切图前必读）

本件是「私家大厨 parity（对齐老技能）」切图前的只读调查留痕。全部事实来自 `gh` CLI 读到的
issue 正文／评论／原生子票清单，与 `read` 读到的仓内文件；**未改任何 issue、未写仓内其他文件**。

调查时刻：2026-09-20（会话当刻）。仓库 `FeatherHunter/ilife`，工作区 `D:\ilife`。

---

## 1. 先例地图 #681「[wayfinder] 饼干记账本体图：与老技能 parity 并做到极致」

`#681` 当刻 `CLOSED`（收口 2026-09-20）。**零评论**（`gh api .../issues/681/comments` 返回 `[]`；
#682 的 C1-0 条目亦记「该票**零评论**」）。原生子票 **18 张**，全部 `CLOSED`／`COMPLETED`。

### 1.1 Destination（逐字）

```markdown
## Destination

`packages/skill-bill` 承接老技能（`D:\2Study\StudyNotes\SKILLS\饼干记账`，Python 实现）的**全部功能与 UI**：
7 个域（write / query / analysis / goal / account / link / setup）各成一个能力目录，
新仓 HELP 里说得出口的每一件事（7 域／20 二级组／74 场景 ＝ 老 71 条逐字 ＋ 新仓多 3 条）
都能在新仓走通、事实正确、页面等价；老技能退休为**只读对照**。

七个域的起点不同、终点相同：
- **write（16 场景）与 query（17 场景）** 已重做过一轮，但它们是在「简陋」标准下完成的
  （纲领 #62 判「既有完成一律按简陋对待」）⇒ 这两域走**优化／重构票**。
- **analysis（25）／setup（6）／goal（4）／account（4）／link（2）** 共 41 个场景
  从「数据能跑 ＋ 16 行空壳页」起步 ⇒ 这五域走**搬迁票**。
```

**Destination 的四要素（可照抄的结构）**：① 落点包名；② 老技能绝对路径；③ 全量刻度（域数／二级组数／
场景数，并写明「老 N 条逐字 ＋ 新仓多 M 条」）；④ 老技能终局（退休为**只读对照**）＋ **分域的起点差异**
（哪几域走优化票、哪几域走搬迁票）。

### 1.2 Notes（八条「本次努力的标准偏好」＋两条护栏，逐字要点）

Notes 原文以「**本次努力的标准偏好**（每一票都照此办）」开 8 条，另有「覆盖条款」与「两条护栏」：

1. **目录与命名**：一级目录 ＝ HELP 一级分组（7 个域）；共用位照 `packages/skill-calorie`；
   非域目录（`help`）按 `xunji/` 那种显式例外立（`src/xunji/index.ts:10-11` 是先例）。
2. **真相源**：老技能的行为是**默认真相**；允许改，但**每次改动逐条留痕**
   （每域一张差异表：老行为／新行为／为什么改／谁批的）。
3. **UI 判定尺**：**信息等价**——同一批事实与块都在；版式可以全新设计；
   走 `base-paint`（＝`packages/base-render`，包名与目录名不同）＋ 手机/电脑自适应。
4. **视觉方向已在仓里锁定，不要重新发明**：视觉标杆 ＝ **B1**（老侧 `templates\临时样例\统一主面板_视觉标杆.html`）；
   `docs/base-paint-contract.md:291`「`--blue:#007aff` 与 Q12 锁定的 B1 主色一致 → **主色口径按 B1，不得改**」；
   `:292`「**Q14 禁入**：`STYLE_FORBIDDEN_TOKENS = ['--r-xl','--pink']`；同时**不得**引入深色区」
   （唯一例外 ＝ B-12 toast 深色毛玻璃，2026-09-12 用户裁定）；要治的病：
   「35 个文件模仿的是**4 个不同时期的 Apple**……**这不是"设计系统"，是"设计联邦"**」；
   **视觉不做脚本化判定**（`t166:115` 明文）；**脚本只守可判形式**，好不好看由用户说。
5. **清单权威**：场景／唤醒词清单一律以老仓 `scenes/*.yaml` 为准（七处副本里只有它有机器校验：
   `merge_scenarios.py:226-249` 三重全局唯一）。老仓 HELP payload 只作对账物。
6. **对照工艺（卡路里已跑通，可复制）**：每波一份**「融合基准」**（形状见 `t425-融合基准.md` 九节）；
   它同时是**强制对照基准**——每票自证时必须**逐条比对**五张表并写出「对上了／没对上＋读数」；
   口径是**双向**的：老侧长板要吸收、新侧长板要保留，成品由用户肉眼看。
   「舍」的写法：表 `| 块 | 档 | 理由 |`，档 ∈ 留／舍／改；判据「纯渲染机制一律舍／用户真要看的留／
   版式有公共层可替则改」。
7. **参照实现**：`skill-calorie` 的**命令面**可照抄（三件套 ＋ 生成器派生 ＋ 两条棘轮 ＋ 一行数门）；
   它的**内容面不要照抄**——它的 HELP 资产同样是仓外生成的大扁平件，且已漂移过一次。
8. **每张票的固定骨架**（缺一不算齐）——原样引用：

   ```
   背景     老技能有什么 / 新仓现状 / 为什么现在做
   对照物   老侧文件、老样 HTML、老测试件、老 ADR 的行号锚点
   产出     本票产出的决定或改动
   判据     怎么算做完（机器可验的优先）
   参照物   同形的已有实现（让执行者照抄而不是重设计）
   不在本票内  划清边界
   ```

**覆盖条款**：先前 issue 里的裁决与**本图对齐的意图**冲突时，**以本图为准**。执行方式：
**不改写已关票**（历史留档），但在本图逐条记「旧裁决 / 新意图 / 覆盖理由」。

**两条护栏（照抄卡路里时必须补的洞，都是卡路里实测踩过的假绿灯）**：

- **墙生成器有假绿灯**：`docs/agents/视觉验收墙.md` §6.4 逐字——复制 `t154-mobile-wall.mjs` 时
  「它有个假绿灯——先按「盘上有没有」过滤清单、再只查页面引用，于是缺件被静默剔掉、自检照样报「缺失 0」；
  **照抄时把 §6.2 的 `dropped` 判据补上**」。
- **响应式量法有盲区**：`t516 §7.1:245`「**`measure-responsive.mjs` 的盲区：`overflow` 看不到 `clip`**」
  ⇒ 必须**同时读 `clippedCount`**。

**本图另有三条已定口径（住 Notes）**：`link` 域按 `non-exec` 收口（词保留路由 ＋ HELP，不产 `link` 页、
不写他库、不计缺口）；**parity 清单权威 ＝ 老仓 `scenes/*.yaml`**；**老技能退休＝现状即达标**
（新仓零 py、老仓只被只读引，不另做下线动作）。

### 1.3 子票清单（18 张，逐一列出：编号 状态 标签 标题）

| # | 状态 | 标签 | 标题 |
|---|---|---|---|
| 682 | closed | `wayfinder:research` | 已否决与已延后的结构决定台账 |
| 683 | closed | `wayfinder:grilling` | 目标 src/ 形状：7 个域目录与共用位 |
| 684 | closed | `wayfinder:grilling` | 域声明的形状与事实源 |
| 685 | closed | `wayfinder:grilling` | 页面装配深模块的接口与 7 域页型清单 |
| 686 | closed | `wayfinder:task` | 机器面照卡路里装齐（生成物／棘轮／行数门） |
| 687 | closed | `wayfinder:task` | bill parity 审计清单（三张表） |
| 688 | closed | `wayfinder:task` | bill 融合基准 |
| 689 | closed | `wayfinder:task` | write 域：形状重构与 parity 优化 |
| 690 | closed | `wayfinder:task` | query 域：parity 优化 |
| 691 | closed | `wayfinder:task` | account 域：端到端搬迁（样板二） |
| 720 | closed | `wayfinder:task,ready-for-agent` | [规格] 目标 src/ 形状：7 个域目录与共用位 |
| 721 | closed | `wayfinder:task` | [规格] 域声明的形状与事实源 |
| 724 | closed | `ready-for-agent` | [规格] 页面装配骨架与按域页型表 |
| 725 | closed | `wayfinder:task` | [公共层] 文档骨架件：docShell 抽取，两侧 docPage 缩成薄页头件 |
| 728 | closed | `enhancement,wayfinder:task,ready-for-human` | 写入域页面视觉整改：32 张成品按「简约大气」重做样式（功能已齐、样式被判不好看） |
| 729 | closed | `wayfinder:task` | analysis 域：端到端搬迁（25 场景／5 个形态族） |
| 730 | closed | `wayfinder:task` | goal 域：端到端搬迁（4 场景／2 片） |
| 731 | closed | `wayfinder:task` | setup 域：端到端搬迁（6 场景／3 片） |

**计数口径的事实注记（#681 收口时自己写下）**：`#733` 标题带「Part of #681，来自 #728」，却**没有注册成子票**
（`parent: null`）⇒ 18/18 是**注册子票**的关闭率，真实关联票为 **19 张**。按覆盖条款不改写已关票正文，此记留档。

### 1.4 切票规律（粒度、命名、类型标签分布）

**粒度＝两层，不按场景切**：

- **横向先行票（把「形状」一次定死）**：`#683` 目标 `src/` 形状 ＋ `#684` 域声明形状 ＋ `#685` 页面装配接口与
  页型清单 ＋ `#686` 机器面（生成物／棘轮／行数门）＋ `#687` parity 审计清单（三张表）＋ `#688` 融合基准 ＋
  `#682` 已否决台账。**7 张横向票先行**，各自出规格或基准，之后域票才动手。
- **纵向域票（一域一张，端到端）**：`#689` write（优化／重构）／`#690` query（优化）／`#691` account（**样板二**）／
  `#729` analysis（25 场景／5 个形态族）／`#730` goal（4 场景／2 片）／`#731` setup（6 场景／3 片）。
  **六个域 ＝ 六张票**（`link` 域按 `non-exec` 收口，单独立口径、不单独开域票）。
- **规格归档票**：`#720`／`#721`／`#724`（把讨论票的结论落成可执行规格，本身**零源码改动**）。
- **公共层票**：`#725`（docShell 抽取）。
- **收口／视觉票**：`#728`（写域 32 页视觉整改，带双端墙）。

**命名规律**：域票标题 ＝ `<域 key> 域：<工作性质>（<场景数>／<片数>）`，例
「account 域：端到端搬迁（样板二）」「analysis 域：端到端搬迁（25 场景／5 个形态族）」
「goal 域：端到端搬迁（4 场景／2 片）」。规格票标题统一加 `[规格]` 前缀；公共层票加 `[公共层]` 前缀。
**首张域票自立为「样板」，其余票标题写明「照…铺开」**（`#691` 是「样板二」——`#689` 是样板一）。

**类型标签分布**（`wayfinder:*` 五值里本图用了四个）：

| 标签 | 张数 | 用在哪类票 |
|---|---|---|
| `wayfinder:research` | 1 | 只登记结论、不裁不做的台账（`#682`） |
| `wayfinder:grilling` | 3 | 需要与维护者多轮问答才能定的形状问题（`#683`／`#684`／`#685`） |
| `wayfinder:task` | 13 | 一切要动手的票（策略／实施／规格／公共层／视觉整改） |
| `wayfinder:prototype` | 0 | 本图未用 |
| — | 1 | `#724` 只挂 `ready-for-agent`，**没挂任何 `wayfinder:*`**（本图的标签纪律有一处漏挂） |

**另挂的推进标签**：`ready-for-agent` 2 张（`#720`／`#724`）；`ready-for-human` 1 张（`#728`，视觉要人眼判）；
`enhancement` 1 张（`#728`）。

**为什么 `#724` 没挂 `wayfinder:task`**：仓内无法从票面读出原因；照实登记，不编。

### 1.5 「HTML／视觉验收墙」怎么进票面

**仓规正本 `docs/agents/视觉验收墙.md` §2「切票：墙怎么进票面」（逐字）**：

```markdown
地图设计者（`docs/agents/编排纪律.md`）照下面四条做：

1. **留一张收口票**：最后一张专门收口，票面的**验收命令**就是墙生成器的自检命令（`node <生成器> <产物目录> <输出名>`，绿＝退出码 0）。
2. **其余票各自加一条产出判据**：该票的产物必须在册子里、能被墙读到（跑生成器时它那格在）。
3. **先验形状**：形状没定的页（新交互、新控件）先切一张**原型票**，形状由人裁过再铺开 —— 别拿墙去验收一个还没定形的页。
4. **票面五段照旧**（`编排纪律.md`：目标、验收命令、不许动的东西、交付物路径、遗留出口），只加本图口径：交付物路径那一段写清本图产物落在哪个**产物目录**（墙与发布都从那份清单读）。

> **一条词义说明（别把两件事混成一件）**：票面「验收命令」是可跑的机器命令 —— 墙那条命令跑的是**生成器的自检**（exit 0／1）。**墙本身不是命令，是给人看的证据**：同一张收口票里，「自检 exit 0」进第 2 段，「墙 ＋ 逐格缺陷清单」进第 4 段交付物路径。
```

**#681 里的带墙收口票 ＝ `#728`**（写域 32 页视觉整改）。它把墙写进了两处：
**产出第 4 条**与**判据第 8／9 条**，并在结尾多出 `## 验收要求（维护者 2026-09-19 追加，逐字六条）` 与
「收尾口径」一句「**所有完成的 HTML 用 `docs/agents/视觉验收墙.md` 的视觉验收墙交维护者验收**」。

`#728` 票面里与墙直接相关的逐字节选：

```markdown
## 产出

4. **双端视觉验收墙**：32 格手机墙（390 宽）＋ 32 格桌面墙（1280 宽）＋ 总索引，按 `docs/agents/视觉验收墙.md` 的形制出（生成器复用／扩写 `docs/skills/skill-bill/t410-验收墙.mjs`；清单不带签名、不加 `loading="lazy"`、`dropped` 与 `dead` 一起判）。

## 判据

4. **视觉由维护者肉眼判**：墙重出后维护者复看，一句话给真或假。**判据只在这一处终止**。
8. **交付三样一起交**：双端墙 ＋ 逐格缺陷清单 ＋ 生成器自检退出码（正例 exit 0／反例 exit 1 逐个点名，照 `docs/agents/视觉验收墙.md` §4）。

## 遗留出口

- **HELP 页自己缺 `viewport-fit=cover`**：`src/helpShell.ts` 的模板串里没有它，而 `assets/help-template.html` 里有 4 处 `env(safe-area-inset-*)` ⇒ 在 iOS 上那 4 处恒取 0。这是本票诊断新发现，属 HELP 侧；动它要改烤制资产并跑 `pnpm --filter base-paint gen:help-shell`，**另开一张票**，不在本票写集。
- **其它域的页面外观会随公共层改动而变**：本票只担保「不倒退」（判据 10 的读数）；它们「变好看」另立跨域票，或按 `#681` 的组票办法（公共层 ＋ 各域）切。
- **两套分隔符口径的并轨**：本票把分隔符那一列并到公共层 t508 门上；本包机审 `t407-v8-style-audit.mjs` 里那行位置白名单随并轨删掉，别在仓里留第二份定义。
- **`RADIUS_LG = 20` 死常量与圆角闭集缺一档**（`packages/base-render/src/blocks.ts`）：按裁定归入「同一语义多名值」档；若实测找不到合适档位就直接删常量，别让它继续挂在那里。
- **审计发现的非样式缺陷（另开票承接）**：① 16 张采集页那颗实心蓝钮与退出口红钮**点了无动作**（既无 `data-action-id` 也无 `data-t`）；② `pageUi` ⑩ 的状态词只活在 CSS `content:` 里（不可选、不可搜、屏读器读不到）；③ 16 张采集页折叠区里的 `口令原文` 仍印 CLI 命令行。三条都不是样式问题（功能／无障碍／文案），证据在 `docs/skills/skill-bill/t728-逐页/` 的对应报告里。
```

### 1.6 代表票的票面（逐字抄）

> **一处必须先说清的体例事实**：`#681` 的子票**不使用**「目标／验收命令／不许动的东西／交付物路径／遗留出口」
> 这五段。`#681` Notes 偏好 8 定的骨架是**六段**：`背景`／`对照物`／`产出`／`判据`／`参照物`／`不在本票内`
> （票首另起一行 `Part of #681`）。五段体例属于 **#745 那一代**（见 §5），两代并存。
> 下表把两代都逐字抄下，供新图选体例时对照。

#### 1.6.1 `#689`「write 域：形状重构与 parity 优化」（六段，逐字）

```markdown
Part of #681

## 背景

write 域是**两个已完成域里形状走错的那一个**：

- 15 件场景件 ≈4,000 行（**其中 67% 在别件里逐字重复**），每场景成本 **319 行**
  （vs query 域 43 行/场景）
- **不先修它，后面 4 个域会照抄错的形状**
- 它同时是**最好的验证场景**：16 个场景、13 种型、**并且判据现成**

维护者已拍：本域走**优化／重构票**（不是从零迁）。

## 对照物

- 老侧 `templates\写入\` 5 张模板：`expense_form` 225 · `flow_confirm` 271 ·
  `batch_confirm` 170 · `installment_confirm` 144 · `update_confirm` 136
- 老侧 `render_write.py` **13 种 form_type**（`:579-581`）；`write.yaml`（254 行／15 场景）
- 老侧重量级流：分期 `compute_installments()`（`:423-463`：每期 `round(总价÷期数,2)`、
  首期补差额、**月末回退 `min(日, monthrange)`**）／退款·收回·偿还·报销到账的**两步复合 ＋ 候选定位**
  （`:358-380`：`--candidates` 优先 → `--search-hint` 子串 → 最近 5 条兜底）／批量录入（`:232-277`）
- 新仓：`docs/skills/skill-bill/t407-页面块清单-16词.md`、13 张 `t407-老样-*.html`、
  `t406-写入域-老模板逐块清单.md`、三路对照、`t407-机审读数.md`、三份终审打分
- **回归判据（现成）**：`test/t410-lock.test.mjs`（16 条真出口锁）· `t410-验收墙.mjs` · `t403-验收墙.mjs`

## 产出

按 T4 的接口重写 write 域：**场景退成差异声明**；
16 条页面产出与今天**信息等价**；本域一张差异表（老行为／新行为／为什么改／谁批的）。

## 判据

1. `test/t410-lock.test.mjs` 的 **16 条真出口锁全绿**（一条不删、一条不放宽）。
2. 16 张页面经**双端墙**对照，信息等价（同批事实与块都在）；**视觉由用户肉眼判**。
3. write 域总行数显著下降：目标**每场景 ≤ 20 行差异声明** ＋ 一份域内装配件。
4. **机审六列 0 命中**（双端自适应／触摸目标／触屏三件／分隔符懒政／英文裸词／重复句）。
5. 按 T6 清单里属 write 的项逐条给「对上了／没对上」；按 T7 融合基准逐条自证。

## 参照物

`src/query/{read,list,detail}.ts`——**同包内已跑通的「页型 ＋ 参数化」形状**。

## 不在本票内

其余 6 个域；老侧写侧的一次性个人脚本（`_split_sam_order.py` 等，已在 out of scope）。
```

#### 1.6.2 `#690`「query 域：parity 优化」（六段，逐字）

```markdown
Part of #681

## 背景

query 域（17 场景）是**形状走对的那一个**：5 件 727 行、**43 行/场景**，页型立件 ＋ 参数化差异。
但它是**在「简陋」标准下**完成的（纲领 #62 判「既有完成一律按简陋对待」），
所以本域的工作是**优化**，不是重构。

已知待办方向（最终范围以 T6 清单为准）：

- 老侧 `query_view.html`（**503 行**）里的 11 个渲染器覆盖 13 种 type 键——逐块对照，看留／舍／改
- 老侧查询页有、新仓查询页**没有**的块：分类聚合卡（`categoryBar` 前 8 类）、过滤芯片
  ——`t411-查询域-老模板逐块清单.md` 判过一轮，本票复核
- 老侧记录列表的 **200 条显示上限**（`query_view.html:524` `slice(0,200)` ＋ `:533` 追一行提示）：
  新仓不截断、也不分页——这条口径要重新拍
- **是否符合 B1 ＋ 主色锁（`--blue:#007aff`）＋ Q14 禁入**：从未审过

## 对照物

- 老侧 `templates\query_view.html`（549 行；CSS `:7-109`／骨架 `:113-119`／JS `:124-547`）
  ＋ `bill_inject.py`（482 行：`QUERY_META` `:152-188`、`LIST_META` `:225-248`）
- 老侧 `query\cli.py`（446 行）
- 新仓 `src/query/{read,list,detail,commands,index}.ts`（727 行）
- 新仓：`docs/skills/skill-bill/t411-查询域-老模板逐块清单.md`（留／舍／改 表）、
  `t412–t417-实施与对账.md`、`t417-墙收口.md`、`test/t417-query-lock.test.mjs`

## 产出

query 域到达 parity 的**优化清单 ＋ 实施**；本域一张差异表。

## 判据

- 按 **T6 清单里属 query 的项逐条**给「对上了／没对上＋读数」；没对上的**不许写成对上**。
- 按 **T7 融合基准**逐条自证（含骨架表块序）。
- **B1 符合性**：主色 `--blue:#007aff` 未被改写；无 `--r-xl`／`--pink`／深色区；机审六列 0 命中。
- 17 条真出口锁（`t417-query-lock.test.mjs`）**不放松**。
- 双端墙重出一次，产物格数对得上清单。

## 参照物

- 同域既有实现：`src/query/list.ts`（列定义 `:114-122`、页型轴心 `queryListDoc:145`）
- 视觉尺：`docs/visual-spec-blocks.md`（12 区块的锚点与数值规格）、`docs/visual-spec-help.md`

## 不在本票内

查询的**新场景**（老侧 15 场景 vs 新仓 17 场景已覆盖）；write 域（T8）。
```

#### 1.6.3 `#691`「account 域：端到端搬迁（样板二）」（六段，逐字）

```markdown
Part of #681

## 背景

T8 验证的是**「在新仓内改形状」**；本票验证另一半——**「从老技能往下搬」的完整链路**
（老 YAML → 域声明 → 命令 → 页面 → 判据 → 对账）。

**选 `account` 的理由**：只 4 个场景，却覆盖**采集／选择／查看三型**
（老侧 `type` 分布：采集 2 ＋ 选择 1 ＋ 查看 1），
且**转账是真双写**（转出支出 ＋ 转入收入，账本＝转账，备注 `#转账`）。
**规模最小、覆盖面最广**（`setup` 是向导／回执两型的唯一出处，排第三）。

## 对照物

- `scenes\account.yaml`（67 行／4 场景／1 二级组）
- 老侧 `scripts\account\cli.py`（382 行，含转账 `:200-236`、账户增改停用 `:91-199`）
- 老侧 `scripts\account\render.py`（315 行）
- 老侧 4 张模板：`账户\account_form.html` 155 · `confirm.html` 147 ·
  `transfer_confirm.html` 171 · `account_view.html` 288
- 口径出处：`references\categories.md`（支出 12 L1／收入 7 L1）· `references\软删契约.md`

## 产出

- `src/account/` 三件套（`commands.ts`／`routes.ts`／`index.ts`）＋ 子件 ＋ **域声明**
- 4 个场景在新仓端到端走通（读 ＋ 写 ＋ **转账双写**）
- 本域一张差异表

## 判据

- 4 条唤醒词（新增账户／改账户／账户转账／看账户汇总）逐条真跑：exit 0、产物落盘、字段正确。
- 转账落**两笔**（转出负数 ＋ 转入正数），账本＝转账，且**不入收支统计**。
- 与老侧逐条对照出一张差异表（老行为／新行为／为什么改／谁批的）。
- **路径从零走完**：域声明 → 命令 → 页面 → 测试，**过程中不需要再决定任何横向事情**
  ——这条就是 T2／T3／T4／T5 四票的验收。

## 参照物

- `src/query/`（域目录三件套的最佳样本）
- 卡路里 `t425-融合基准.md §二`（老→新移植清单的列形状）
- 卡路里 `docs/skills/skill-calorie/t154:193`（验收勾选表的列）

## 不在本票内

其余 4 个域；`link` 的变更（已按 `non-exec` 收口，见地图 Notes）。
```

#### 1.6.4 `#728`「写入域页面视觉整改」（带墙的收口票；录它的 `## 现状` 至 `## 不在本票内`，逐字）

```markdown
## 现状（样式从哪来，改要从哪改）

| 层 | 件 | 今天的角色 |
|---|---|---|
| 公共层 | `packages/base-render/src/blocks.ts` 的 `blocksCss()`（`:2407`）＋ `buildStyleSheet` | **样式资产的唯一住处**：12 区块的间距／字号／色值／断点都在这里 |
| 本包页装配 | `packages/skill-bill/src/shared/docPage.ts` 的四段补丁（`DESKTOP_CSS`／`TOAST_CSS`／`KV_CSS`／`EXIT_CSS`）＋ `src/shared/pageShell.ts` 的页头语义 | 本包自己的补丁样式与页头（眉标／标题／副题／页标记） |
| 各块形状件 | `base-paint/blocks` 的 `renderKpiGrid`／`renderDataTable`／`renderChips`／`renderCopyBlock`… | 页面只**选块**，不写样式 |

**两条仓规约束（不是可选项）**：
- **页面本地不许写 CSS／色值／断点**；一个形状只许一处定义（`688-融合基准.md` 裁定 7）。
- **视觉不做脚本化判定**；脚本只守可判形式，好不好看由维护者肉眼判（同件裁定 12）。

⇒ 所以「更好看」这条**必然**是「公共层形状件 ＋ 本包页装配」两处的改动，**不在任何一张域票的写集里**——这正是它要单独开票的理由。

## 产出
（见 §1.5 逐字节选）

## 判据
（共 10 条；第 4、8、9、10 条见 §1.5 逐字节选，其余 6 条照 `#728` 原文）

## 参照物

- 视觉标杆 B1：老侧 `templates\临时样例\统一主面板_视觉标杆.html`（`#681` 偏好 4）；主色口径 `docs/base-paint-contract.md:291`。
- 公共层形状件现状：`docs/visual-spec-blocks.md`（12 区块的锚点与数值规格）。
- 同族已跑通的样式改动先例：卡路里 `docs/skills/skill-calorie/t516-场景10-视觉整改基准.md`（六列读数 ＋ 版式判据脚本，但**判定仍归人眼**）。
- 同形已跑通的先例（照抄而不是重新设计）：`#523`（17 页）、`#543`（13 页）、`#544`（9 页）——同一套六条要求、同一套机器判据与视觉席跑法；改前读数成文 `#579`；视觉终审 `#520`／`#605`（100 分制 ≥90）。
- 本仓的墙做法与坑：`docs/agents/视觉验收墙.md`（§3 收口七步、§4 正反例判据、§6.4 的假绿灯、§7 的坑表）。

## 遗留出口
（见 §1.5 逐字）

## 验收要求（维护者 2026-09-19 追加，逐字六条）

> 1. 需要自适应桌面端和手机端
> 2. 手机端的适配能力参考help html
> 3. UI上代码层面审查下是否符合UI设计师审美
> 4. 里面的文字不能出现冗余和不合理
> 5. 展示的信息要生动形象，当一个内容需要通过「；」「|」「·」分割时代表需要进行UI上的设计，该问题是用这些符号简化了UI展示的设计
> 6. 使用vision_router相关能力在视觉上进行仔细的审查，找到设计不合理之处，并进行优化

**收尾口径（同次追加）**：全部优化落地后，最后一次用 vision_router 做终审打分，100 分制要 ≥90；**所有完成的 HTML 用 `docs/agents/视觉验收墙.md` 的视觉验收墙交维护者验收**。

## 不在本票内

- **页面事实与块的增减**（信息等价那一面）——那是 parity 票的面，本票只改样式。
- 其它 6 个域的页面视觉（若维护者要一并做，另开一张跨域票或把它提成公共层＋各域的组票）。
- 发版与插件面。
- **HELP 模板资产本身**（`packages/base-render/assets/help-template.html` 及其生成器）不在本票写集：本票只把它的移动端能力落在公共层配方上（见「诊断」第 2 条）。
- **页面事实与复制载荷文本不变**：改版式引起的页高变化不算事实变化。
```

#### 1.6.5 五段体例的现成样板：`#749`（属 #745 那张图，逐字全抄）

```markdown
Part of #745

## 目标

照【裁定·已关】记账设置页收窄：8 项逐项定稿（样板）把记账一条链改完，成为六家的样板：

1. 技能侧 `packages/skill-bill`：`bill.config.read` 回执新增一组**解析后绝对路径**（库文件、第二份库、HTML 产物目录、备份目录、备份文件名示例），落点算式只许有一处定义地（`src/fetch/paths.ts` 一族）。
2. 插件侧 `packages/plugin-bill-ilife`：设置页从 8 行改成 6 行——可改 1（数据目录，显示生效绝对路径、非法回落默认）＋ 只读 5（库文件名／预算账户文件名／HELP 产物目录／备份目录／备份文件名前缀）；只读目录行的浏览按钮**保留 ＋ 不可点击**；删掉两个产物名主体行。
3. 控件文案**不得出现省略号**（`选择文件夹…`／`浏览…`／`配置读取中…`／`处理中…`／`正在读取…` 等，记账这一家的份）。

## 验收命令

- 技能侧门禁：`node tooling/run-locked.mjs --ticket <本票号> -- node --test packages/skill-bill/test/*.test.mjs`
- 一条真跑（回执形状）：`node packages/skill-bill/dist/cli/cmd_read.js bill.config.read --params '{}'`，断言信封 `data` 含新增的绝对路径组、且与 `~/.ilife/bill.yaml` 的取值一致。
- 插件侧门禁：`node tooling/run-locked.mjs --ticket <本票号> -- node --test packages/plugin-bill-ilife/test/*.test.mjs`（含渲染台自查与跨包锁 `test/panel-copy-743.test.mjs`）。
- 自证：把回执那一组打掉一处 ⇒ 用例必红；还原 ⇒ 必绿（两行机器读数随证据入仓）。

## 不许动的东西

- `packages/base-link-core/**`（本票不改公共层读写口径）。
- 其余五家技能与插件包（他们照本票铺开，另立实施票）。
- `packages/plugin-manager/**` 与总管面板。
- 面板侧不许新增"自己算默认值／自己拼路径"的代码（#677 冻结的边界）。
- 技能功能页（sidebar 槽）与 `test/plugin-p10-boundaries.test.mjs` 的既有断言。

## 交付物路径

- 源码：`packages/skill-bill/src/**`、`packages/plugin-bill-ilife/src/**`。
- 证据件：`docs/skills/skill-bill/`（技能侧读数）、`docs/plugins/plugin-bill-ilife/`（页面读数与用例）。
- 用例：`packages/skill-bill/test/`、`packages/plugin-bill-ilife/test/`。

## 遗留出口

- 删 `html.helpStem`／`html.quickRefStem` 两键的**过渡方案**：见【裁定】删键过渡方案（另票）。
- 测试隔离口子：见【研究】测试缝与 0 环境变量（另票）。
- 打开本票前先确认 **#743／#744** 的状态（同一批文件，工作区有 #744 未提交改动）。
```

> 同形五段的还有 `#754`／`#755`／`#757`／`#758`／`#760`（六张，`#745` 子票里带五段的全部）。
> 五段的固定顺序是：**目标 → 验收命令 → 不许动的东西 → 交付物路径 → 遗留出口**
> （`#745` 的「讨论纪律」第 2 条逐字：「票面**五段缺一不可**（目标／验收命令／不许动的东西／交付物路径／遗留出口）」）。

---

## 2. `#208`「[wayfinder] 私家大厨HELP真标准」

状态：`CLOSED`（`## 进度：100%（目的地达成，待关地图）`）。**零评论**。原生子票 **13 张**，全部 `closed`：

| # | 标签 | 标题 |
|---|---|---|
| 209 | `wayfinder:research` | 私家大厨HELP（1/11）调查：饼干记账的 HELP 交付实现逐件读懂 → 私家大厨照抄清单 |
| 210 | `wayfinder:research` | 私家大厨HELP（2/11）调查：内容资产对账（老 10 域／33 组／48 场景 ↔ 新表 37 条唤醒词／8 条命令） |
| 211 | `wayfinder:research` | 私家大厨HELP（3/11）调查：通用 help 模板的注入契约＋私家大厨专属取值 |
| 212 | `wayfinder:grilling` | 私家大厨HELP（4/11）决策：命名落盘管线的归属＋缺省出口口径 |
| 213 | `wayfinder:task` | 私家大厨HELP（5/11）内容资产入库：老骨架 → 仓内 typed const |
| 214 | `wayfinder:task` | 私家大厨HELP（6/11）渲染接线：5 项＋三块可选内容 → 通用 help 模板 |
| 215 | `wayfinder:task` | 私家大厨HELP（7/11）出口与命名落盘：缺省＝HELP 文件，速查走显式参数 |
| 216 | `wayfinder:task` | 私家大厨HELP（8/11）锁：CLI 级用例（真 spawn 出口） |
| 217 | `wayfinder:task` | 私家大厨HELP（9/11）SKILL.md 说明面 |
| 218 | `wayfinder:task` | 私家大厨HELP（10/11）插件侧最小装机（技能提供方＋DSH profile；收窄 #57） |
| 219 | `wayfinder:task` | 私家大厨HELP（11/11）真机端到端＋肉眼终审 |
| 236 | `wayfinder:task` | 私家大厨HELP 结构设计：新件住哪（必报五步第一／二步，先报用户点头） |
| 237 | `wayfinder:task` | 私家大厨HELP（13/13）共用件 saveHtmlFile：新建包 ＋ 卡路里／记账／大厨三家改成走它 |

**切票规律（照抄）**：票号写进标题当序号（`（1/11）`…`（11/11）`，另有 `（13/13）` 与闸门票 `#236` 编号不在序列内）；
**先 3 张 research 摸清老技能与模板契约，再 1 张 grilling 定决策，再 task 顺序铺开**；
**闸门票 #236 的关票条件是「拿到用户点头」**，它挂成票 5／6／7 的阻塞边。

### 2.1 已定结论（HELP 交付形态 ＋ 通用模板）

**Destination（逐字，第一段）**：

```markdown
## Destination

在 DSH 对 AI 说「私家大厨help」→ **明确拿到 help HTML 文件**（落盘＋可打开）：产物落 `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`，回执给绝对路径。文件由**已经开发好的通用 help 模板**渲染（仓内真相源 `packages/base-render/assets/help-template.html` → 出口 `base-paint/help-shell`，与卡路里／饼干记账／居家管家同一套 UI），内容是私家大厨自己的（老骨架 10 域／33 组／48 场景，新表多出的条目补进对应域）；**UI 层不与老 HELP 逐字比对**（老件自持壳，全库唯一没迁过通用模板的技能）。技能侧（`skill-chef`）与插件侧（`dsh-chef` ＋ DSH 真机装机）都要跑通，并由维护者肉眼终审「过」。两条同时达成即本图完成。
```

**判定口径（2026-09-12 与维护者一轮对齐定案，逐字）**：**①明确拿到 help HTML 文件 ②用现成通用 help 模板渲染（不看老 HELP 的 UI）**，
外加维护者肉眼终审「过」。

**结论清单（每条都有读数背书）**：

1. **交付形态 ＝ 落盘一份 HELP HTML ＋ 回执绝对路径**；缺省支落
   `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<本地 YYYYMMDD_HHMMSS>[_N].html`，
   stdout 顶层追加第六键 `delivery{mode,path,bytes}`（既有五字段一字不改）；速查支走显式参数
   `mode:"lookup"`、产物主体 `私家大厨_速查表`（与 HELP **分名**）。
2. **通用模板 ＝ 仓内唯一渲染路**：`packages/base-render/assets/help-template.html`（**生成物**）
   → `src/helpShell.ts`；改渲染必须改生成器 `gen-help-shell.cjs` 再跑
   `pnpm --filter base-paint gen:help-shell`，手改生成物会被 `gen:help-shell:check` 判红；
   出口 `base-paint@0.3.0` 的 `./help-shell`（`renderHelpShellHtml`）。
   注：模板文件是**共享 help 模板**，与「页面族」的 `buildStyleSheet()`／`blocksCss()` 不是同一套资产。
3. **落盘管线收成共用位**（维护者 2026-09-12 裁 **乙**）：对外函数名 **`saveHtmlFile`**
   （用户原话「saveHelpFile 这个名字不好。叫 saveHtmlFile 感觉更好」）；
   参数只给三项 `dir`／`stem`／`html`；时间戳格式与「绝不静默覆盖」由共用件自己钉死；
   `onExists` 四态 `succession`（缺省）／`reuse`／`overwrite`／`fail`；
   落点＝`packages/base-render/src/output/saveHtml.ts` ＋ 子路径出口 `./save-html`
   （**不新建包、不新建目录层级**）。**`_N` 从 1 起步**（照老家 `align_08.py:52-65`，不照抄 bill 的 `_2`）；
   **不写固定名镜像**（与 #131／#143「镜像默认关」口径一致）。
4. **页面级取值**：`title` 照老家产物原文「**私家大厨 HELP · 能力速查**」；hero 计数**＝场景卡总数**
   （新模板 `ALL.length` 一律＝场景卡数，「48 场景」，**不是 37 唤醒词、也不是 33 组**）；
   `subtitle` 与 HELP 汇总块同源派生；页面骨架预期 ＝ **11 个底部 Tab**（10 域 ＋「关于」）。
5. **内容规则**：老骨架为准、新表多出的补进对应域；不可路由的 14 张卡**保留老组名 ＋ 卡上打「【待开发】」徽章**
   （机械事实：`status === '【待开发】'` 是唯一触发徽章的通道）；老件 48/48 的 `result` **删掉**；
   `html.command_cn`／`html.template`／`html.data_source`／`variants` **一律不迁**；
   `dimensions` → `editable_fields`（chip 只取 `wake_word`，不上卡面）。
6. **架构尺度**：新增／改动的 HELP 相关件，目录名取自 **HELP 一级分组**（本技能 ＝ 10 个域的英文名
   `cook`／`view`／`search`／`update`／`history`／`shopping`／`add`／`relation`／`setup`／`data`）；
   告警线 **350 ＋ LF 口径**写进 `packages/skill-chef/AGENTS.md`；**整包按 HELP 一级分组重排不在本图内**。

### 2.2 该图留下的、对「parity 新图」直接有用的事实

- **私家大厨是全库唯一没迁过通用模板的技能**：全量扫老仓 `D:\2Study\StudyNotes\` 下 5,187 个 HTML，
  走通用模板的 92 个里**含厨师标识的 0 个**。⇒ **不要拿老 HELP 当视觉基准。**
- **老件「域」这一层在源头只写了一半**：`$.scenarios[].domain` 只覆盖 13/48（源 `scenarios.yaml` 里 `domain:` 恰好 13 次），
  页面完全不渲染它；完整 10 域①是**由 `html.template` 的目录名反推**出来的，名字有三处独立佐证
  （模板目录名、技能自带脚本名、`references/wake_word_variants.md` 分节标题）。
- **老文档不可当数据源**（三处实证）：老 `SKILL.md` 说 render_help.py 是单次覆盖（实为 `_N`）、
  说「35 业务唤醒词 + 61 场景」（实测 33 组／48 场景）；`wake_word_variants.md` 与载荷有实质漂移。
- **计数陷阱**：payload 里字符串 `scenario_id` 出现 96 次，但 JSON 解析后只有 48 个场景对象
  （`$.scenarios` 与 `$.wake_words[].scenarios` 是同一批的两份视图）。**以 `JSON.parse` 为准，不许用 grep 数。**
- **字段名两代不兼容**：老 chef 用单数 `type`（字符串），通用 help 模板契约用复数 `types`（数组）；
  正确换算 `scenario_id→id`、`scenario_title→title`、`prompt→prompt_template`。
- **chef 还额外注入了一份 `window.__A08__`**（底部复制动作栏），calorie／bill 产物实测 0。
- **「域 key」的权威出处**＝老件十份域文件的文件级 `domain.key`。

---

## 3. `#18`「私家大厨 TS 迁移（一期）」

状态：`CLOSED`。**原件正文很短（22 行），是一张只写了 Destination／Notes 的骨架图**，
`## Decisions so far` 与 `## Not yet specified` 基本上没有实质内容：

```markdown
## Destination

私家大厨 TS 迁移重构为全 TS 并纯 SKILL 可用：唯一出口 cmd_read，envelope 全字段，HELP 现找可执行。体量：py 73 个约 19.0k 行，SKILL.md 782 行，无 DB，联动 6 处。

## Notes

- 遵循一期总图 Destination 与铁律（真相唯一 B、纯 CLI、engines>=22.13、缺失阻断不返空）。
- 老家只读对照，Python 当天删；真实数据禁迁，测试 tmp 隔离。
- 每 session 按票调 research / prototype / grilling / domain-modeling。

## Decisions so far

- （空）

## Not yet specified

- 取数 / 口径 / 渲染拆分待首票毕业。

## Out of scope

- 面板（二期单 MAP）；定时任务；本技能外联动。
```

**它对「已迁移了什么」的声明（逐字摘）**：唯一出口 **`cmd_read`**；envelope **全字段**；
HELP **现找可执行**；体量记账 —— **py 73 个约 19.0k 行**、`SKILL.md` 782 行、**无 DB**、联动 **6 处**。
「取数／口径／渲染拆分」在票面里明确写着**待首票毕业**（即本图当时并未声明渲染面已迁）。

**唯一一条评论（2026-09-06，维护者，逐字）**：

```text
finale复检 PASS，master CI 已绿，收尾关票。

- 合流commit: 8763222ac0b5837bf241ad76d7802959040811e7 (Merge feat/chef-ts-migration #18)
- 分支CI run: 34044202370 success (feat/chef-ts-migration @ 78afeb3)
- 复检: PASS
- 本地: 336/336
- master run: 34045154273 success (master @ 8763222)
- 本地tip == origin/master == 8763222 已verify，未再push
```

> **切图时要用的推论**：#18 的「已迁移」只覆盖到**命令出口 ＋ envelope ＋ HELP 现找**这一层；
> 后面 `#208` 的调查逐字记着「`chef.help.lookup` 只回一份速查列表（零 IO）」「**证实 chef 今天没有任何 HELP 文件交付**」，
> 且 `#208` 的 Out of scope 逐字写着「`packages/skill-chef/src` 整包按 HELP 一级分组重排（4 个工种目录名 ＋ 11 个文件名）：
> 出本图目的地，另立票」。⇒ **新 parity 图要背的，是「整包按域重排 ＋ 页面族（结果页／过程页／回执页）的 parity」，
> 而 HELP 交付面已由 #208／#237 收口。**

---

## 4. `#682`「已否决与已延后的结构决定台账」

状态：`CLOSED`。**零评论**。正本落 `docs/skills/skill-bill/t682-已否决与已延后的结构决定台账.md`（408 行）＋
判据脚本 `docs/skills/skill-bill/t682-落点核对.mjs`。

**票面自陈的规模（逐字）**：

```markdown
- `docs/skills/skill-bill/t682-已否决与已延后的结构决定台账.md`（408 行）
  - **A 组结构决定 74 条**：`textOf` 三样口径 8 ／ 形状表 8 ／ 模板路 8 ／ 页面粒度 12 ／ 公共层归属 14 ／ 其他 24
  - **B 组旧址与债务 42 条**：超线件 8 ／ 深路径直引 6 ／ `TRANSITIONAL_KEY_SHAPES` 8 ／ 其他 20；
    另 **出 scope 16 行**（与 `docs/bill-migration-split.md:39-44` 逐条对账，不重造）
  - **C 组覆盖与过时 26 条**：#681 覆盖条款 10 ／ 已过时文档 4 ／ 被覆盖的旧裁决 12
  - §5 未决项 11 条 ＋ 3 处「文档标待裁、当刻已闭环」的陈化留痕 ＋ §7.3 存疑 12 条（不替它们编出处）
```

**票面判据（逐字）**：「本图后续每一票的『背景』段都要引用它；台账里已判『不做』的，新票**不许无理由重提**。」
**引用方式（逐字）**：「本图后续每一票的「背景」段引用本台账时**按条目号引**（如「判『不做』的见 `t682` 的 A1-1」
「未决项见 `t682` §5 的 D-3」）。」

### 4.1 与「技能包重构成对」的已否决项（新图不得无理由重提）

| 条目号 | 已否决／已定的结论 | 为什么（逐字理由摘要） | 对新图的意思 |
|---|---|---|---|
| **A3-1** | **老模板不像素复刻**（用户裁定 Q1–Q5，2026-09-14）；新模板取「老 HTML ＋ 现新 HTML ＋ 外界优秀 UI」三源之长；饼干级通用提饼干层、可 base 通用提 base（**第二个用法长出来才提**） | 写入图与查询图 Notes 逐字同句 | 大厨 parity 也**不许**按像素复刻老侧 HTML |
| **A3-3** | 页面模板**落技能包内、一 key 一模板**（`templates/16`，老 7 域子目录 → 16 合并） | `bill-migration-split.md:11` ＋ `src/render/templates.ts:27` | 「一 key 一模板」是已否决不了的先例；但 `#724` 后来把块序收成**按形态族的模板**（见 §1.4 域票读数），两代口径要在新图里显式选一个 |
| **A3-4** | 老模板逐块判：**纯渲染机制一律舍**；用户真要看的留；版式有公共层可替则改 | `t411-查询域-老模板逐块清单.md:79` 逐字 | 差异表「留／舍／改」三档表照抄 |
| **A4-10** | 「截图审美类」判据**机检不了**，走「墙＋人」；机审判据与视觉墙**互不替代** | `视觉验收墙.md:24`「**墙不产出判据**」 | 分数不许当判据 |
| **A4-11** | 墙**每格一件真产物**（iframe 跑真 HTML），**不塞缩略图** | `视觉验收墙.md:162` 逐字 | 同上 |
| **A5-3** | **#433「回执页共用件提升到公共层」已废弃、不做**；承载它的 MAP **#634 整图废弃关闭** | 理由逐字：「卡路里套件红基线（复测 1746 题挂 88）＋两边已是同名不同物，合并等于形状统一而非搬家；条件满足后重开新票，不重开本票。」 | **不许**把「把 bill 的回执共用件提到公共层」当待办重提 |
| **A5-5** | `commandSpec.ts` **不上移** | 「`CommandSpec` 是『命令事实的唯一定义地』，而命令事实按仓规住各能力目录」 | 命令事实只住各能力目录 |
| **A5-6** | 提升逐件判定里判「**不搬**」的四件：`writeParts`（机制）／`commandSpec.ts`／`F`／`COL_CLI` 字段表／`DB_FILENAME` | 「写不出第二个用法的留在原处」 | 同上 |
| **A5-7** | `saveHtmlFile` **上移公共层**（#237 改判 #147）：落 `base-render/src/output/`，走**子路径出口** `./save-html`，**不从包根开** | 用户 2026-09-12 裁决 8 | 大厨若要落 HTML，走 `base-paint/save-html` |
| **A5-10** | `esc`（**三字符**转义）**不得与公共层 `escapeHtml`（五字符）互换** | #433 内核逐字 | 别顺手「统一」 |
| **A5-13** | 公共层补丁 CSS **只能落本包**：四个补丁拼在 `docPage.ts` 的 `sharedCssText` 这一处 | 「公共层样式不许动，本页 body 后也不加样式块」 | ⚠️ 该条已被 `#728` 的裁定 D1 **实质性推翻**（公共层允许改，按「选择器归属 ＋ 影响面」排三档）——引它要带覆盖说明 |
| **A6-2** | 其余五域（分析 25／目标 4／账户 4／联动 2／开始使用 6）**只留雾区**，毕业成各自 map 是后事（Q2 裁定） | 「避免一次建 7 张返工」 | **新 parity 图同样不该一次铺满所有域** |
| **A6-8** | 两件超线件**挂号不拆** | 「按域拆分派，属『读命令迁移』那条后票；**本票只搬不拆**」 | 超线件不许在 parity 票里顺手拆 |
| **A6-21** | **技能包之间零依赖是本仓的分界**：不复用 `skill-calorie` 的模块，也不让它依赖 `skill-bill` | 「省下的代码量（45 行）远小于代价」 | 大厨不许 import 别家技能 |
| **A6-22** | 归口纪律：本图新增或搬动的一切源码**一律落能力目录**；`commands.ts` 唯一事实、派生由 gen 重写 | `#411` 交棒逐字「**别动 `commands.ts` 的声明形状（形状是契约）**」 | 同上 |
| **A1-1** | `textOf` 三样口径**保留差异、不统一**（同名三处三种语义，`src` 零改） | #469 逐字「任一方向硬并都改页面可见行为，触红线」 | 别重提「统一 `textOf`」 |
| **C1-1** | 清单／内容源权威从「老仓 HELP payload」**改为「老仓 `scenes/*.yaml`」** | yaml 有机器校验（`merge_scenarios.py:226-249` 三重全局唯一），payload 没有 | 大厨的清单权威同样取 `scenes/*.yaml` |
| **C1-2** | 「20 二级组」只在**仓内 HELP 侧**成立；**老侧 parity 计数是 14 个二级组** | 两源数不同，**不得互当对方的证据** | 计数前先问「问的是老侧 parity 还是仓内 HELP」 |
| **C2-1／C2-2** | 两份文档已被源码推翻：`t425:305`「`renderDataTable` 不发行内标签属性」（现 `blocks.ts:736` 写 `data-label`）；`t161:345-348`「不要新做『塌成卡片』」（已被行卡化推翻） | 当刻真相在 `blocks.ts:736`／`blocks.ts:1909-1919`＋`pageUi.ts:120-158` | **引这两条前先读源码** |
| **C3-12** | 视觉模型报的缺陷串**必须回产物 grep 核对**，产物里没有的一律丢弃 | #410 逐字「**不许照幻觉改代码**」 | vision 分数只作参考 |

### 4.2 未决项（**不可当已生效裁定引用**，引时带「（未决，见 #682 §5）」）

登记 11 条（D-1…D-11）。与重构直接相关的两条：**D-1** 本包告警线数字 350「**待维护者确认**」
（兄弟包 `skill-calorie`／`skill-chef` 的 350 有用户答复背书——`docs/skills/skill-chef/map-chef-body.md:197`／`:212`）；
**D-6** 「候选单选件要不要按 base 新件做」当刻真相是**绕开了**（自建 `src/shared/candidatePick.ts`，未提 base）。

---

## 5. `#745`（当前唯一 OPEN 的 map）的正文形状 —— 新图体例参照

标题：**`[wayfinder] 六家技能设置页收窄：数据目录一处可改，其余落点只读展示`**。
状态：`OPEN`，标签 `wayfinder:map`（实测：`gh issue list --state open --label "wayfinder:map"` 只返回它一张）。
**它是「新图正文」的最新体例**。章节骨架（逐字，含它自带的两处 HTML 注释）：

```markdown
## Destination

（本图要交什么货；含「本图要交货：决定 ＋ 实施 ＋ 发版装机收口（不是只出决定）」这类边界句，
以及「…不是本图的雾——六家一起做就是本图的范围（用户 2026-09-20 裁）」的**范围裁定句**）

## Notes

（分三条写：**开工前每个会话都读**的必读清单／**不许破的既有口径**＋**不许破的边界**（各带出处）／
六家同形面与在途冲突／并发纪律／**本图的证据落点**／定稿来源）

## Decisions so far

<!-- 每关一张票追加一行：票名 ＋ 链接 ＋ 一句话结论 -->
（逐条一行：`- [票名](链接) — 一句话结论`）

## Not yet specified

<!-- 看得出要来、还说不成票的（in scope，只是不够尖） -->
（逐条 bullet）

## Out of scope

<!-- 越过目的地的活：不毕业，目的地重画才回来，且算新的一次努力 -->
（逐条 bullet，**每条都写明为什么它不属于本图**）

## 任务清单

**切法（2026-09-20 第一性原理整改）**：主循环＝**一家一条链一张票**（技能侧回执 ＋ 插件侧页面 ＋ 删键 ＋ 体检 ＋ 用例 ＋ 证据，一次窗口做得完、判据独立）；跨家的事只在三处各一张：删环境变量、同形面收口、发版装机。

- [x] 【裁定·已关】配置面板收窄总口径：范围、环境变量、只读与删键的九问 — [#746](…)
- [ ] 【裁定】删键过渡：老配置文件遇到已删键怎么办 — [#751](…)（**各家实施票的共同前置**）
- [ ] 【实施·样板】记账设置页收窄：… — [#749](…)（blocked_by #751）
（每行＝`- [x]/[ ] 【票型】票名 — #链接（阻塞说明）`）

## 讨论进度（会话交接 · 2026-09-20）

**这一节的用途**：主会话即将 compact，新会话读这一节即可接上「逐家讨论 ＋ 一家一开票」这条线。**逐项定稿一律住各家的裁定票**，本节只记进度、纪律与下一步。

### 逐家进度
（一张表：| 家 | 定稿票 | 实施票 | 状态 |）

### 讨论纪律（维护者定的，新会话照办）
（5 条编号；第 2 条逐字：「讨论完一家就开两张票：定稿票（`wayfinder:grilling`，把逐项定稿写进解决评论后**关**）＋ 实施票（`wayfinder:task`，`blocked_by #749／#751`）；票面**五段缺一不可**（目标／验收命令／不许动的东西／交付物路径／遗留出口）。」）

### 已裁定的总口径（详见 #746，此处只留指针）

### 还在维护者手上的两张裁定（答完实施面才能开窗）

### 下一步
```

**两处体例要点（与 #681 那张图的差别）**：

1. **#745 没有 `## 进度：N%` 一节**；进度改用 `## 任务清单` 的勾选态 ＋「下一步」小节表达。
   （#681／#208 用的是 `## 进度：N%（＋`下一步：…`）`。）
2. **票面五段**（目标／验收命令／不许动的东西／交付物路径／遗留出口）是本图「讨论纪律」第 2 条明文钉住的票面体例；
   `#681` 那一代用的是六段（背景／对照物／产出／判据／参照物／不在本票内）。

**仓内关于 issue 正文格式的硬口径（`#208` 正文的「## 正文格式」，逐字）**：

```text
- [ ] 用真实换行书写：每个 `## 章节` 独占一行，段落间留空行
- [ ] 禁止字面 \n 转义（不要把换行写成 \n 两个字符）、禁止正文以 BOM（\ufeff）开头
- [ ] 写回 issue 正文时以文件方式提交（文件内为真实换行），不要内联转义字符串
- [ ] 正例：`## 进度：90%` 独占一行，空行后接 `下一步：xxx`（反例：`## 进度：90%\n下一步：xxx`）
```

---

## 6. 仓内现成的「唤醒词 → 命令 → HTML 绝对路径」索引页与验收墙生成器

**结论先说**：仓里**已有**这类链路索引页与验收墙生成器，而且不止一套 —— 但**全部住在文档目录
`docs/skills/<件名>/` 下，`packages/skill-*/` 里一个都没有**；**`skill-chef`（私家大厨）名下既有 0 个墙生成器、
也 0 个链路索引页**。

检索范围与做法：`docs/skills/**` 与 `packages/**`（排除 `node_modules`／`dist`），逐个模式做**文件级**命中列举
（`视觉验收墙`／`-mobile-wall`／`slug`），再读命中件的件头注释定用途。

### 6.1 验收墙生成器（`docs/skills/`，按推荐度排）

| 路径 | 一句话用途 |
|---|---|
| `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs` | **推荐起手件**：仓内唯一把收口四件事做在一个文件里的墙件（造册复制 `--stage` ＋ 出墙 ＋ 出索引（含「有意不出产物及其原因」与「本批机器读数」两节）＋ 自检 `--check`）；`dropped` 与 `dead` 一起判 |
| `docs/skills/skill-calorie/scene01-验收墙/gen-wall.mjs` | 与 scene02 同源；仅索引页少一段「本批机器读数」 |
| `docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs`、`scene06-验收墙/gen-wall.mjs` | 同族场景墙生成器（`dropped`＋`dead` 一起判、不加惰性加载、清单不带签名） |
| `docs/skills/skill-calorie/t541-墙生成器.mjs` | 最贴仓规 §6.2 骨架的**极简版**（181 行）；已有一份清单、只想出墙时用；**不含索引生成器** |
| `docs/skills/skill-calorie/t532-wall.mjs`（配 `t532-清单.mjs`／`t532-gen-索引.mjs`） | 产物由真跑脚本产生、清单从 `results.json` 派生；**多一条字节校验**（盘上字节与清单 `bytes` 不符也算 `dropped`） |
| `docs/skills/skill-calorie/t155-墙生成器.mjs` | 把判据分三态：`dropped`（点名却没盘）／`absent`（从头记着没交出）／`dead`（页上引用落不到）；墙尾单列「没交出也得有交代」一节 |
| `docs/skills/skill-calorie/t530-墙生成器.mjs` | 清单**内嵌在脚本里**（`ROWS` 常量）：十几件量级、一次性批次用 |
| `docs/skills/skill-calorie/t351-v13-editor-wall.mjs` | 计划编辑器专用；手机＋桌面两页同件出，带 `dropped` |
| `docs/skills/skill-calorie/t369-验收/t369-墙.mjs` | 墙＋索引（含门禁卡片），带 `dropped` |
| `docs/skills/skill-calorie/t154-mobile-wall.mjs` | **反面教材**：件头自陈三个坑（不加 `loading="lazy"`／`fullPage` 截图只栅格化靠前行／视觉模型会编页名）；**缺 `dropped`** —— 这正是仓规 §6.4 点名的假绿灯。它的好素材是 `auto-fill` 自适应列与页族分组排序两处写法 |
| `docs/skills/skill-calorie/t351-v11-mobile-wall.mjs` | 「最朴素的形制」；也是 `slug` 命名函数的先例（`'v11-' + order + '-' + kind + '-' + wake.replace(...)`） |
| `docs/skills/skill-bill/t403-验收墙.mjs` | 记账**查询域**墙生成器；件头写「索引按 `prompt→唤醒词→命令→绝对路径` 成表，file 列用绝对路径 URL 可点」 |
| `docs/skills/skill-bill/t410-验收墙.mjs` | 记账**写入域**墙生成器；同上口径。`#728` 判据第 8 条点名要「复用／扩写」的就是它 |
| `docs/skills/skill-bill/t407-手机墙.mjs` | 写域手机墙＋页族分组；件头把「不用惰性加载」写进常量注释；附一条可复跑的版面约束（末条媒体查询必须 `minmax(0,1fr)`） |

**墙生成器的调用形（仓规 §4，逐字）**：正例 `node <生成器> <产物目录> <输出名>` → 打印
「N 格；链接 M 条；缺失 0 -> 可发」并 **exit 0**；反例（清单里写一个不存在的文件名）**必须 exit 1 且点名那份**。

### 6.2 链路索引页（唤醒词／prompt → 命令 → HTML 绝对路径）

| 路径 | 一句话用途 |
|---|---|
| **`docs/skills/skill-calorie/t369-链路总表.mjs`** | **最省的一件**（94 行）：件头逐字「链路总表生成器：**prompt → 唤醒词 → 命令 → HTML 绝对路径（一页可点）**」；只读两处真源（唤醒词 prompt 取 `src/triggers/scene-08-body.ts`，产物映射取同目录 `manifest.json`）；自检缺链 exit 1 |
| `docs/skills/skill-calorie/t268-链路总览.build.mjs`（＋ `t268-链路清单.json` → `t268-链路总览.html`） | **最全的一件**（594 行）；字节数的唯一来源是生成当刻 `statSync` 页里链接指向的那个文件（链接与数字同源） |
| `docs/skills/skill-calorie/scene02-验收墙/链路总表.html` | 场景墙那一族里的成品链路页 |
| `docs/skills/skill-calorie/t155-链路导航.html` | 成品页；**仓内无生成器**（唯一一份手工件） |
| `docs/skills/skill-bill/t403-链路总览.html`＋`t403-链路总览-证据.md` | 记账查询域链路总览与其对账证据；证据件逐字「口径：唤醒词／命令／`kind`／`op` 逐字抄 `src/policy/wakewords.ts` 的 `WAKE_TABLE` 与 `t407-场景落点清单.md`；文件名与字节数按盘上实物读，不猜。」 |
| `docs/skills/skill-bill/t407-链路总览.html`＋`t407-链路总览-证据.md` | 记账写入域链路总览与其对账证据（16 行 × 唤醒词／命令／`kind`／`op`／两张页文件名／字节数／href 实测） |
| `docs/skills/skill-memo-ilife/research/wall-and-linkage-reference.md` | **横向盘点件**（405 行）：「视觉验收墙 与 链路导航页 · 现成件盘点」——一张主表逐列比对 7 件墙生成器（产物目录参数／格子宽高／列数／缩放／页族分组／链接自检／`dropped` 判据／`loading="lazy"`／适合场景），另给链路页现成件与 vision 打分先例；**新技能要出墙时先读它** |
| `docs/skills/skill-home/html-scenes-precedents.md` | 居家技能那一侧的同类先例盘点 |

### 6.3 `slug` 的命中（命名函数的先例）

| 路径 | 用途 |
|---|---|
| `docs/skills/skill-calorie/t351-v11-mobile-wall.mjs` | `slug(s)` ＝ `'v11-' + order + '-' + kind + '-' + wake.replace(/[\\/:*?"<>|（）\s]/g, '')`，保证墙上每张都能点开成整页；发布器 `t351-v11-publish-preview.mjs` 与它**共用同一套 slug 规则** |
| `docs/skills/skill-calorie/t155-墙-证据.md`、`t351-redesign-184-spec.md`、`t351-v5-oldlook-evidence.md` | 记录 slug 命名规则与其演变 |
| `docs/skills/skill-bill/t683-目标src形状.md`、`t683-待裁五问-第二轮.html` | `slug` 出现在「域 key／目录名」讨论里（与墙无关） |
| `packages/base-render/src/blocks.ts`、`controls.ts`、`help.ts`、`style.ts`、`test/blocks.test.mjs`、`packages/skill-calorie/src/render/workoutMovementTable.ts`、`workoutPlanCss.ts` | 公共层／卡路里源码里的 `slug`（属性名或 `data-*` 值，**不是**墙件） |

### 6.4 与本次新图直接相关的一条缺口

**`packages/skill-chef/` 与 `docs/skills/skill-chef/` 名下：墙生成器 0 个、链路索引页 0 个。**
现盘上 `docs/skills/skill-chef/` 只有 41 件，全是 HELP 那一期的调查／证据／修订件
（`t1-*`…`t13-*`、`t2*-review-*`、`t236-structure-design.md`、`t6-render-wiring.md`、`t11-evidence/`、`map-chef-*`、`t695-证据.md`）。
⇒ 新 parity 图若要出墙，**必须新造一个生成器**；照 §6.1 的推荐起手件（`scene02-验收墙/gen-wall.mjs`）起，
**并把 `dropped` 判据一起带上**（仓规 §6.4 明文点名的假绿灯）。
同理，`t369-链路总表.mjs` 那类「prompt → 唤醒词 → 命令 → HTML 绝对路径」索引页，大厨侧也是空白。

---

## 7. wayfinder 标签（`gh label list --limit 100` 的确切名字）

仓内 `wayfinder:*` **五个**标签，逐字：

| 标签名（逐字） | 描述 | 颜色 |
|---|---|---|
| `wayfinder:map` | `Wayfinder map` | `#0E8A16` |
| `wayfinder:task` | `wayfinder:task` | `#1D76DB` |
| `wayfinder:grilling` | `wayfinder:grilling` | `#1D76DB` |
| `wayfinder:research` | `wayfinder:research` | `#1D76DB` |
| `wayfinder:prototype` | `wayfinder:prototype` | `#1D76DB` |

**同一份清单里另有（本次切图会用到）**：`ready-for-agent`（`Fully specified, ready for an AFK agent`）、
`ready-for-human`（`Requires human implementation`）、`needs-triage`、`needs-info`、
以及 GitHub 默认集 `bug`／`enhancement`／`documentation`／`duplicate`／`help wanted`／
`good first issue`／`invalid`／`question`／`wontfix`／`accessibility`。

**用法实证**：`#681` 这张 map 本身挂 `wayfinder:map`；它的 18 张子票按 §1.3 分布挂
`wayfinder:research`／`wayfinder:grilling`／`wayfinder:task`（`wayfinder:prototype` 本图未用）；
`ready-for-agent` 用于「规格已定、可直接派」的票，`ready-for-human` 用于必须人眼判的票（`#728`）。
