# 备忘录HELP 结构设计（必报五步 · 第一／二步）

> ⚠️ **订正说明（2026-09-12，编排会话）**：本文件写于票 7 施工前，其中 **`editable_fields` 的「清洗后 64 条／29 场景」是错的口径**——**正确值是 64 条／27 场景**。根因：76 条里那 **12 条 `html` CLI 开关**中，有 **2 个场景只剩这一个维度**（`memo_completed_reminders`／`memo_sync_feishu`），剔除后归零 ⇒ **29 − 2 = 27**。**29 是清洗前的老口径**。订正出处：`t220-orchestrator-decisions.md` **裁决 6**（由复审员 C 打假、编排会话复核产物侧 30 个场景清单后落定）。**本文件其余内容不受影响。**

> **票**：[`#225` 结构设计：新件住哪 ＋ 文件行数告警线](https://github.com/FeatherHunter/ilife/issues/225)（关票条件＝**拿到项目负责人点头**）。
> **本文件只报形状**，不动源码、不建目录——它是「第一步 影响清单 ＋ 第二步 结构设计」的正本。
> **判据**：`docs/agents/structure.md`。**用词**：`docs/agents/wording.md`（说「help 模板」，不说「壳」）。
> **行数口径**：LF（只数 `\n`）——与本图内定、用户答复（私家大厨那张图）同口径。
> **上游**：`t221-resolution.md`／`t222-resolution.md`／`t223-resolution.md`／`t224-resolution.md`（管线归属＝甲）／`t226-resolution.md` ＋ `t226-amendment.md`／**编排裁决正本 `t220-orchestrator-decisions.md`**（裁决 3–19）／`t224-delivery-path-evidence.md`（扁平落盘的三条独立证据）／`t222-content-reconcile.md` §三–§四（8 域计数与中英名对照）／`t223-template-contract.md`（备忘录取值 8 项）。
> **先例**：`docs/skills/skill-chef/t236-structure-design.md`（同一条流水线最近的一张闸门票）／`docs/skills/skill-calorie/t179-180-structure-design.md` 第五节（技能级落点与铁律四的关系）／`docs/skills/skill-schedule/t199-structure-verdict.md`。
> **复审**：`t225-review-G.md`（对抗式闸门复审，裁定「有条件放行」）——本版已按其第四节 1–10 条与第五节逐条整改，整改记录见文末 §十二。
> **成文**：2026-09-12（逐条只读实测后写）。**本版为整改版**：甲／乙归属、B3 取消、资产形状三处、四处数字、D4 归票等已按编排裁决与复审意见订正。

---

## 零、这一票在解什么

`structure.md` 的必报五步要求**第一步「影响清单」与第二步「结构设计」先报用户点头**再动手。**票 7（内容资产入库 `#227`）与票 8（渲染接线 `#228`）都被本票挡着**——本票点头，两票解冻、可立刻开工。

---

## 一、第一步 · 影响清单

**判据**（`structure.md:80`）：每行指向**一个**能力；一行要给两个能力时，写明走的是哪个公开接口。本次全部改动只落**一个包**（`packages/skill-memo-ilife`）＋ 一处仓级工具，**没有一行跨两个能力**。

### 1.1 先定一条基准：HELP 交付算不算一个「能力」

铁律四（`structure.md:44-49`）：**能力目录名取自 HELP 的一级分组**；判据是「把目录名念给用户听，他能在 HELP 里指出这是哪一组」。

**`help`（帮助）不在备忘录的那 8 个域里**（域＝`memo`／`search`／`remind`／`wish`／`checkin`／`mood`／`sync`／`init`，`t222-content-reconcile.md:193-200`）。**所以 `src/help/` 不是能力目录**，它是**技能级入口**——同题先例是卡路里的 `help-lookup`：

> 「它不是 10 个能力里任何一件——它装的是**技能级查找入口**（唯一出口是 `src/cli/cmd_read.ts:839-852` 的 `calorie.help.lookup`），**铁律四的「能力目录名取自一级分组」管不到它**」——`docs/skills/skill-calorie/t179-180-structure-design.md:96`

**本席取三条推论**：

1. **`src/help/` 不违反铁律四**：它今天已是既有目录（`lookup.ts` 42 LF ＋ `index.ts` 2 LF），装的是技能级的「帮助」这件事的两半——**给构建期注入 `SKILL.md` 的速查表**（今天有）＋ **给用户的 HELP 文件交付**（本图新增）。两者是同一件事的两面，不是两个能力。
2. **HELP 交付本身不算一个能力**（不进 `src/` 第一层）。理由：它不是用户能在 HELP 里指出的一组，而是一条**技能级出口**；把它升成能力目录就会自造一个 HELP 里没有的词，正是铁律四点名的「自造一个 HELP 里没有的词」。
3. **本次新增件按「域」取名——但只取文件名，不新建能力目录**。8 个域是备忘 HELP 的**一级分组**，按铁律四正好是「文件名与公开接口名取自下一级（子功能）」的合法来源：内容资产是按域装的数据，**域就是那一级**。这样既让铁律四落在件上（8 个域文件逐一对得上用户能指出的一组），又不新建任何目录层级。

**英文名一律照仓内既有说法取，不自创**（`t222-content-reconcile.md:193-200` 的「本席英文标识」列与 `:270`）：

| HELP 一级分组（域） | 数据集分组 `id` | 英文名（文件名） | 依据 |
| --- | --- | --- | --- |
| 备忘类 | 1 | `memo.ts` | 老域 `memo`（`t222-content-reconcile.md:193`） |
| 查找类 | 2 | `search.ts` | 老域 `search`（`:194`） |
| 提醒类 | 3 | `remind.ts` | 老域 `remind`（`:195`） |
| 心愿类 | 4 | `wish.ts` | 老域 `wish`（`:196`） |
| 打卡类 | 5 | `checkin.ts` | 老域 `checkin`（`:197`） |
| 情绪类 | 6 | `mood.ts` | 老域 `mood`（`:198`，票 6 U4 已裁情绪族改名对齐） |
| 同步类 | 7 | `sync.ts` | 老域 `sync`（`:199`） |
| 初始化类 | 8 | `init.ts` | 老域 `init`（`:200`） |

> ⚠️ 数据集分组 `id` 是 `1`～`8`（票 6 **V8 定案**：二级组 id 从 1 起），而老侧是 `memo_0`／`memo_1`…（**0 起**，`t223-resolution.md:39`）。**两套数都对，含义不同**：老 `memo_0` 是**老产物里的字符串 id**，`1`～`8` 是**新数据集里逐域的顺序号**。资产票照 V8 落，不在本票改。

**出口只有一个（技能级）**：命令 `memo.help.lookup`，唯一落地处 `src/cli/cmd_read.ts`——与卡路里／大厨同形。`src/help/` 里新增的件**不对外开第二个门**。

### 1.2 逐行影响清单

**A 组 · 新增（9 个源码件 ＋ 1 个脚本，全部落既有的 `src/help/` 下）**

| # | 新增件 | 一句话职责 | 碰它的理由 | 归票 |
| --- | --- | --- | --- | --- |
| A1 | `src/help/scenes/memo.ts` … `init.ts`（**8 个文件**） | 域级内容资产：一个域一个文件，各出一组 `groups[]` 条目 | 8 个域＝备忘 HELP 的一级分组，铁律四下**文件名取自这一级**；老骨架逐字搬（`t222-content-reconcile.md` §三） | #227 |
| A2 | `src/help/sceneData.ts` | 把 8 个域级数组合成全量 `groups` ＋ 提供场景查表与计数 | 数据集只有一个定义地（铁律二）；域文件的**唯一组装点** | #227 |
| A3 | `scripts/gen-help-assets.mjs` | 一次性脚本：老骨架（yaml ＋ 老 `SKILL.md` 三张表 ＋ 21 条子命令）→ A1／A2 的 typed const；`--check` 只比对不落盘 | 结构标准逐字「一次性脚本住包内 `scripts/`」（`structure.md:69`）；同目录已有 `build-help.mjs` | #227 |
| A4 | `src/help/helpFile.ts` | 内容资产 ＋ 派生 → 通用 help 模板全页 HTML（零 IO）；另出域级索引载荷 | 票 3 的备忘录取值 8 项落成一件；与 `skill-bill/src/render/helpFile.ts` 同形 | #228 |
| A5 | `src/help/manifest.ts` | 命名与落点的**值**：子目录 `memo_html` ＋ 文件名主体 `备忘录_HELP` ＋ 速查支产物名 | 出口票要的三个值；**落盘那一小块自持**（甲，见 §1.3） | #229 |

> **新件计数（全文只有这一处数，四处旧算法已删）**：**源码 11 个**（8 个域文件 ＋ `sceneData.ts` ＋ `helpFile.ts` ＋ `manifest.ts`）＋ **脚本 1 个**（`gen-help-assets.mjs`）＋ **说明面 1 个**（`packages/skill-memo-ilife/AGENTS.md`）＝ **13 个新文件**。

> **A1／A2 为什么拆成 8 个域文件 ＋ 1 个组装件，而不是单文件**：8 域／13 二级组／30 场景的 typed const 落成单文件，按同形先例的**实测密度**折算 ≈ **759 LF**（`packages/skill-schedule/src/help/scenes/help-assets.ts` 实测 **2198 LF／87 场景 ＝ 25.3 LF／场景**；30 × 25.3 ≈ 759），**一落地就超 350 线（超两倍以上）**——这不是推断，是同族实测数据的折算，编排裁决 9／10 也已用同一组数判过（`t220-orchestrator-decisions.md:126-133`）。拆到域级后每件预计 **40～220 LF**（按密度均分 ≈ 95 LF／域，最大域约 8 场景 ≈ 205 LF），**告警线在本包第一次就是活的**（见 §四）。
>
> 补一条更有说服力的实测：同形先例那个单文件里 `scenes[]` 容器实测 **34 个**，也就是说「一域一容器」的粒度**在单文件里就做到了**；本设计要拆的**只是跨文件**（把机器生成的资产与手写件分居两处），不是改变内容粒度。

**B 组 · 就地摆正（改既有件，不搬目录）**

| # | 改动件 | 改什么 | 触发的规则 | 归票 |
| --- | --- | --- | --- | --- |
| B1 | `src/cli/cmd_read.ts`（**LF 147，不超线**） | ①`memo.help.lookup` **抬到开库之前**分派（今天 `:129` 无条件 `openMemoDb`）；②新增 `dispatchHelp`（命名值 ＋ 建 HTML ＋ 交付）；③`switch` 里补一条 `case` 兜底 fail(1) | 票 1 实测：**今天没有库就看不了帮助**（`fetch/db.ts:21-29` 缺目录即抛）；账单是先分派后开库（`skill-bill/src/cli/cmd_read.ts:493-495`） | #229 |
| B2 | `src/render/envelope.ts`（**LF 43，不超线**） | 命令表 `MEMO_KEY_SHAPES` 补一条 `'memo.help.lookup': 'list'`（10 → 11 条） | 新命令不走这张表就没有形状；票 9 票面已点名（`t229-body.md:24`） | #229 |
| B3 | **（已取消，编排裁决 16）** | 新件**不进** `src/help/index.ts` 的转发，**不扩包根出口**（维持 49）。包内消费者（`cmd_read.ts`）**直接 import**；今天真正需要的对外面是**零** | `structure.md:58` 明列「一层只做转发的包装」为违反样子；引 `structure.md:94` 给它开豁免是**引反了**（`:94` 是缩小接口用的）。本报告首版把 B3 写成「转发 7 个」＋「#227／#228／#229 三票共改」——**两处都撤** | **无（取消）** |
| B4 | `package.json`（**LF 34，不超线**） | 加 `base-paint` 依赖；`test` 脚本的取舍见 §三 3.1 | 票 3 实测今天**无** `base-paint` 依赖（`t223-resolution.md:37`）。⚠️ 加依赖**只做最小改动**：手工在 `dependencies` 里加一行 `"base-paint": "^0.3.0"`（与 `skill-bill` 同值），**不跑全量 `pnpm install`**（锁文件正被作息／大厨会话改写）；若确实要跑 `pnpm install`，**只对本包**（`pnpm install --filter skill-memo-ilife`，必要时 `--lockfile-only`），写完**核锁里各家条目都在**、只增不减 | #228（依赖半）／#230（`scripts.test` 那半）——**同一文件两票各改一行**，落地窗口可能重叠，见 §三 3.1 |
| B5 | `tooling/check-boundaries.mjs`（**LF ？，非本包**） | `SKILLS_BASE_FROZEN` 里删掉 `'skill-memo-ilife'` 一项（实测今天 `:41`） | 一 import `base-paint` 这道门就红；**本票只改这一项，`'skill-home'` 归 `#183`** | #228 |

**C 组 · 本票自己（形状报告 ＋ 告警线数字）**

| # | 件 | 说明 |
| --- | --- | --- |
| C1 | `docs/skills/skill-memo-ilife/t225-structure-design.md` | 本文件（第一步＋第二步正本） |
| C2 | `packages/skill-memo-ilife/AGENTS.md` | **新建**：只写 350 ＋ LF 告警线这一条与口径。全仓今天只有仓根一份 `AGENTS.md`，`packages/` 下**只有本包这一份**（实测）⇒ 这是**新建文件、不是新建能力目录**，不触发第二步的点头条件，本票一并报出 |
| C3 | `docs/skills/skill-memo-ilife/t225-body.md` | 票面进度写 90%（关票要负责人点头，本票只能到 90%） |

**D 组 · 同批必修的既有断言（含各自「配套的另一半」）**

| # | 件 | 为什么必须同批 | 配套的另一半（缺了白改） | 归票 |
| --- | --- | --- | --- | --- |
| D1 | `test/memo-split.test.mjs:15`（仓根） | `assert.equal(rows.length, 10)` 把 key 表钉死在 10 条；新增第 11 条命令即红 | **`docs/memo-migration-split.md:19-28` 那十行 key 表要补第 11 行**——测试读的就是它（`:9-11`），只改计数照样红 | #229 |
| D2 | `packages/skill-memo-ilife/test/render.test.mjs:20` | `assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 10)`；B2 一改即红 | **`GOOD` 常量（`:5-16`）补一条 `memo.help.lookup` 的载荷**，否则新用例在 `:23` 取到 `undefined` | #229 |
| D3 | `test/combos-p8.test.mjs:107-114` | 逐条断言 `MEMO_KEY_SHAPES` 每个 key 都在 `createRegistry(PRESENT_KEYS)` 里；**已裁：登记**，不是待裁 | **`packages/base-combos/combos.yaml` 的 `combos:` 段补一条 ＋ 重跑 `packages/base-combos/scripts/gen-present.mjs`**（`:115-120` 断言 `present.ts` 与生成输出逐字相等 ⇒ **不许手改 `present.ts`**） | #229 |
| D4 | `packages/plugin-memo-ilife/test/skills-provider.test.mjs:90` | 反向断言 `!def.content.includes('memo.help.lookup')`；**今天绿，是明天才红**（只有 `SKILL.md` 正文写进该命令之后才翻） | 翻正的那天把 `:90` 改成正向断言 | **#231（兼记 #229）**——编排裁决 19；`:88` 原注释逐字即「归 #231／#229」，该断言锁的是 **`SKILL.md` 正文**，正文归 `#231` |

### 1.3 共用件：本图**不新建**，落盘那一小块自持（编排裁决 3「判甲」）

- **本图不新建任何共用件。** 命名值（子目录／文件名主体）是备忘录自己的东西，住 `src/help/manifest.ts`，不上移公共层。
- **落盘那一小块（`wx` 独占创建 ＋ `EEXIST` 递补 ＋ `resolve` 绝对路径 ＋ 本地时间戳）由备忘录自持**（编排裁决 3「判甲」，`t224-resolution.md:3`）。三条硬条件：①只抄通式那一小块，**不搬**卡路里的命令名→中文段落映射／动态段／三态回退；②`_N` **从 `_2` 起**（照三家现役行为与老实物 `备忘录_HELP_20260820_150143_2.html`）；③自持件**头注释**写明「这是第 4 份同逻辑实现；共用件＝`#237` 的 `saveHtmlFile`；备忘录迁入见 `#240`」。**函数名照抄来源件**（`packages/skill-bill/src/output.ts` 的 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`），**不新造 `saveHtmlFile` 这个名字**——仓内今天没有这个符号（全仓 grep 命中全在文档，代码里 0 处定义），造它等于同时欠一个不存在的依赖和一次将来的重命名。`#229` **不挂** `#237` 阻塞边；欠债由 `#240`（`blocked_by = #237`）单独偿还。
  - **「哪两个能力在用」这句在本图怎么写**：共用件（`#237` 的 `saveHtmlFile`）**今天还不存在**，故本图**不宣称有共用件**——本图这一件是**第 4 份同逻辑实现**（在它之前已有卡路里／记账／居家三家现役）。这正是 `#240` 那张迁移票存在的理由：结构纪律 `structure.md:23` 铁律一确实命中，故留可查的偿还记录。
  - **为什么不预置「同名同签名临时件」**（本报告首版写法，**已撤**）：①`saveHtmlFile` 全仓无定义，写 `import { saveHtmlFile } from …` 会 TS2307；②`#237` 定的签名是 `{dir,stem,html,onExists?} → {mode,path,bytes}`，与「同名同签名」这句本身对不上；③真共用件落地后本包那个同名件会与它同名不同源，而「先删后建」的时序没有任何机制保证。⇒ **要抄就连来源件的真名一起抄**，不另造符号。
- **help 模板**（`base-render` 的 `assets/help-template.html` → `base-paint/help-shell` 的 `renderHelpShellHtml`）：跨 5 个技能共用的**公共层**件，本图**只消费不修改**（谁在用：卡路里／记账／居家／作息／大厨／备忘录，第 6 家）。

---

## 二、第二步 · 结构设计

### 2.1 目录树（新增部分）

```
packages/skill-memo-ilife/
├─ AGENTS.md                    ← 新建：350 ＋ LF 告警线口径（C2）
├─ package.json                 （存量，改：加 base-paint 依赖 ＋ test 脚本，B4）
├─ scripts/
│  ├─ build-help.mjs            （存量，不动：它喂的是 SKILL.md 的速查表）
│  └─ gen-help-assets.mjs       ← 新建：老骨架 → 8 个域文件 ＋ 组装件（A3）
├─ src/
│  ├─ help/                     ← 沿用既有目录（技能级入口，非能力目录；见 §1.1）
│  │  ├─ lookup.ts              （存量，不动：SKILL.md 28 行速查表）
│  │  ├─ index.ts               （存量，**不动**：不转发新件，B3 已取消）
│  │  ├─ sceneData.ts           ← 新建（A2）：8 域 → 全量 groups ＋ 域级索引载荷
│  │  ├─ scenes/                ← 新建子目录（域级资产的唯一去处）
│  │  │  ├─ memo.ts             ← 新建（A1，机器生成，禁手改）
│  │  │  ├─ search.ts           ← 新建（A1）
│  │  │  ├─ remind.ts           ← 新建（A1）
│  │  │  ├─ wish.ts             ← 新建（A1）
│  │  │  ├─ checkin.ts          ← 新建（A1）
│  │  │  ├─ mood.ts             ← 新建（A1）
│  │  │  ├─ sync.ts             ← 新建（A1）
│  │  │  └─ init.ts             ← 新建（A1）
│  │  ├─ helpFile.ts            ← 新建（A4）：资产 ＋ 派生 → 全页 HTML ＋ 域级索引装配
│  │  └─ manifest.ts            ← 新建（A5）：命名与落点的值
│  ├─ cli/cmd_read.ts           （存量，改：分派先于开库 ＋ HELP 分支，B1）
│  └─ render/envelope.ts        （存量，改：命令表补一条，B2）
```

**新文件数**：源码 11 个（8 个域文件 ＋ `sceneData.ts` ＋ `helpFile.ts` ＋ `manifest.ts`）＋ 脚本 1 个 ＋ 说明面 1 个 ＝ **13**。
**新建目录层级**：**1 个**（`src/help/scenes/`）。

> **形状对比·为什么不是「8 个域文件平铺进 `src/help/`」（合规但更省的那条路）**：复审员 G 指出，把 8 个域文件**平铺**在既有的 `src/help/` 里**同样合铁律四**（文件名仍取自一级分组），而且**不新建任何目录层级** ⇒ 直接消掉 `structure.md:88` 的唯一触发条件（`t225-review-G.md:104-114`）。**编排裁决 17 仍取 `scenes/`**（`t220-orchestrator-decisions.md:176-180`），理由是内容资产（机器生成、禁手改）与机器件（手写）分居两处；平铺会让 `src/help/` 变成 13 个文件混放，伤 AI 可导航性。
>
> ⚠️ **点头条件因此这样结**：本票**技术上仍触发**「新建目录层级」（`structure.md:88`），但**这一条的点头已由编排会话以项目负责人授权授予**（裁决 17）。⇒ 本报告 §十 那张表里「新建目录层级＝触发」照旧如实写，**只是不必再等一次点头**；本票剩的点头理由只有一条：它是票 7／票 8 的前置门。

> ⚠️ **沿袭缺口（本次明确不摆正、留给整包重排那张票）**：本包 `src/` 第一层今天是 `cli/`／`fetch/`／`policy/`／`render/`／`help/` **五个工种名**（`structure.md:64` 要求第一层必须是能力名）。本次**一个都不摆正**——票 4 已裁「不做整包重排，那是另立的票」（用户 Q4=A），本图只做「新增／改动的 HELP 相关件合规」。此处如实登记，供后来的复审有据可查。

### 2.2 每个文件对外给什么

**判据**（`structure.md:85`）：导出数数得出、各 ≤5。

| 文件 | 对外给几个 | 各一句 | 归票 |
| --- | --- | --- | --- |
| `src/help/scenes/<域>.ts`（8 个，各 1 个导出） | **1** | `MEMO_HELP_<域>`：该域的 `groups[]` 条目（`id`／`icon`／`label`／`subgroups[].scenes[]`）。机器生成，禁手改。**场景条目里带 `aliases`**（别名位，见下） | #227 |
| `src/help/sceneData.ts` | **2** | ① `MEMO_HELP_GROUPS`：8 域合成后的全量 `groups`（给 `renderHelpShellHtml` 直接吃）；② `buildHelpSceneIndex()`：域级索引载荷（`items`〔域一行，含 `id`／`icon`／`label`／`subgroupCount`／`sceneCount`〕＋ `total`／`subgroupTotal`／`sceneTotal`，全部派生不写死）。**消费者＝`helpFile.ts` 的 `buildMemoHelpFileData`**（它就是 `memo.help.lookup` 的 envelope `data`；与记账 `buildHelpIndex` 同角色，`skill-bill/src/render/helpFile.ts:172-182`） | #227 |
| `src/help/helpFile.ts` | **运行时 3 个 ＋ 类型 0 个** | ① `buildMemoHelpFileData(now, opts)`：资产 ＋ 派生 → 全量 HELP JSON（5 必需键 ＋ 三块可选键，`init_banner` 键常在、显隐走 `hidden`）；**组装时剥离 `aliases`**（裁决 5）；② `renderMemoHelpHtml(data)`：转调 `renderHelpShellHtml`（本包不新写页面）；③ `formatHelpMinute(now)`：`%Y-%m-%d %H:%M` 等价物。**类型出口 0 个**：需要类型的地方一律转引公共层契约，不在本包复制一份（先例 `skill-bill/src/render/helpFile.ts` 自带 8 个类型出口、`skill-schedule/src/help/helpFile.ts` 19 个导出——**本图不照抄这两个数**） | #228 |
| `src/help/manifest.ts` | **3** | ① `HELP_HTML_DIR_NAME`：`'memo_html'`；② `HELP_FILE_STEM`：`'备忘录_HELP'`；③ `LOOKUP_FILE_STEM`：速查支产物名（`t224-resolution.md:9` 已裁＝`'备忘录_速查表'`） | #229 |
| `src/help/index.ts` | **不动** | 维持今天的 2 个（`buildHelpLookup`／`lookupWake`）。**新件不进它、包根出口维持 49**（裁决 16） | **无** |
| `scripts/gen-help-assets.mjs` | **脚本**（不对外开接口） | 读老骨架 → 写 8 个域文件与组装件；`--check` 只比对不落盘 | #227 |
| `packages/skill-memo-ilife/AGENTS.md` | **说明面**（不是代码接口） | 只写 350 ＋ LF 这一条 | 本票 |

**核对**：8 个域文件各 1 个导出、`sceneData.ts` 2 个、`helpFile.ts` 运行时 3 个、`manifest.ts` 3 个，**全部 ≤5**（铁律五）。`src/help/index.ts` **一个新增都不转发**（原 B3 已取消）——**包内消费者直接 import**（`cmd_read.ts` 引 `./help/manifest.js` 与 `./help/helpFile.js`），测试按既有方式从 `dist/` 取；今天真正需要的对外面是**零**。

**类型不新造**：`groups` 的形状就是公共层契约的形状（`packages/base-render/src/spec/help.ts` 的 `SceneSubgroup:39-43`／`SceneGroup:45-50`，字段 3／4 个，都 ≤8），由域文件的数据形状直接满足，接线上**不做二次转换**，**不在本包再声明一套同名字段**（铁律二）。

**资产形状的三处补齐（#227 的输入，缺了要返工）**：

1. **`aliases` 位**（裁决 5，`t220-orchestrator-decisions.md:57-62`）：别名（老唤醒词）**留在技能侧资产**，`buildMemoHelpFileData` 组装渲染载荷时**剥离**——因为 `packages/base-render/src/spec/help.ts` 的 `scenes[]` 是 `additionalProperties: false` 的**闭集 7 键**（`id`／`title`／`wake_word`／`status`／`prompt_template` ＋ 可选 `types`／`editable_fields`），**没有 `aliases` 位**；**不改公共层 schema**（改它牵动三家已完工技能）。收词规则＝只收**老侧会路由的词**（42 条口语样例不进）；真实来源三处＝老 `references/scenarios.yaml` ＋ 老 `SKILL.md` 两张表与 `:300`／`:302-305`（12 条子唤醒词）＋ `references/examples.md`；**老 `script/memo_cli.py` 那一处贡献 0 条**，不要去找。
2. **`version` 从老 yaml 顶层读**（裁决 9，`:124-127`）：老 yaml 顶层实测 `{skill:'备忘录', version:'1.3.0'}` ⇒ 生成器**读它**，**不许写死成第四份副本**；生成物加 **SHA-256 摘要锁 ＋ `--check`**（照记账的生成器纪律，不照抄作息的单文件资产）。
3. **`editable_fields` 清洗后是 64 条／27 场景**（裁决 6，`:64-73`；**老口径 29**——见文首订正说明）：老侧 76 条 − **12 条 `html` CLI 开关** ＝ **64 条**；**要清的共 22 条**（1 条布尔 ＋ 9 条非布尔 ASCII label 落回 ＋ 12 条 `html`，**不是 23 条**——布尔行被重复计入了）；落完**断言涉及场景 = 29**（`memo_init_setup` 无字段），`name` 全部是字符串。⚠️ 本报告首版写的「76 条／29 场景」是**清洗前**的数。

**只在目录内用、不对外给的**（`structure.md:94`「只有出这个目录才算对外」）：

- `helpFile.ts` 里算 `subtitle` 与 `meta_blocks[0]` 的那一句（**同源派生、一处算两处用**）——目录内自用，不进对外清单。
- `cmd_read.ts` 里的 `helpInitialized()`（判「`<SKILLS_DB_PATH>/memo` 目录是否存在」，**不建库、不 mkdir**）——技能级出口的自用件，不进 `src/help/`。

### 2.3 依赖方向与唯一出口

```
外部（DSH 真机 / 插件 / skilllink）
   └─> src/cli/cmd_read.ts          ← 唯一出口：命令 memo.help.lookup
          ├─> src/help/manifest.ts     命名与落点的值（零 IO）
          ├─> src/help/helpFile.ts     资产 ＋ 派生 → 全页 HTML ＋ 域级索引装配
          │      └─> src/help/sceneData.ts  ← 8 个域文件的唯一组装点
          │             └─> src/help/scenes/*.ts
          ├─> base-paint/help-shell    公共层（help 模板，只读消费）
          └─> 落盘那一小块             甲（定案）＝自持最小管线
                                       （照 packages/skill-bill/src/output.ts:17／:42）
```

- **单向**：`cli` → `help` → 公共层；`src/help/` 不反向被 `fetch`／`policy`／`render` 引用（`render/envelope.ts` 只多一条命令表行，不 import `help`）。**`src/help/index.ts` 不在任何引用链上**（裁决 16 取消 B3）。
- **`src/help/` 里不出现任何一个能力名**：8 个域文件的名字是**数据的分组名**，不是「能力」；`manifest.ts` 的入参／常量里没有一处提到别的技能。
- **`memo.help.lookup` 是技能级命令，不是第 11 个能力**：它的形状用现成的 `'list'`，不新增形状、不改公共层。

### 2.4 「分派先于开库」写进形状（本票的硬要求）

**今天的事实**（票 1 实测）：`src/cli/cmd_read.ts:129` 在建 envelope 之前**无条件** `openMemoDb(join(dbPath,'memo'))`，而 `src/fetch/db.ts:21-29` 只有 `statSync`／`accessSync`、缺目录即抛 ⇒ **没有库就走不到帮助**。账单是先分派后开库（`packages/skill-bill/src/cli/cmd_read.ts:493-495`）。

**形状怎么改（写死在 `cmd_read.ts`）**：

1. `parseArgs` → `preflight()`（仍要求 `SKILLS_DB_PATH`）→ 解 `--params` → **此处先判 `o.key === 'memo.help.lookup'`**：
   - 命中 → 走 `dispatchHelp(params)`——**不碰 `openMemoDb`**，只做命名值 ＋ `buildMemoHelpFileData` ＋ `renderMemoHelpHtml` ＋ 交付；
   - 未命中 → 照旧 `openMemoDb` 再 `dispatch`。
2. `dispatch()` 的 `switch` 里补一条 `case 'memo.help.lookup': fail(1, '内部错误：memo.help.lookup 须走 dispatchHelp（开库之前）')`——**把路由改坏这件事变成大声失败**，照账单 `:449-451` 同形。
3. `env` 与 `delivery` 的顶层形状照账单：`delivery {mode:'file', path, bytes}` 顶层追加，既有五字段（`version`／`skill`／`shape`／`key`／`data`）一字不改、序不变。
4. **初始化的判据用「库目录是否存在」**（票 6 V4 定案）：`existsSync(join(dbPath,'memo'))`，异常取 `false`（横幅照显，误显的代价小于误藏）。**整个分支不 mkdir、不建库件**——本技能天然过关（`openMemoDb` 实测只有 stat／access），仍要在分派顺序上证一遍。

**归票**：这一条**整体归票 9（`#229`）**；**票 8（`#228`）只做接缝**（`helpFile.ts` ＋ `manifest.ts` 就位，让 `dispatchHelp` 有东西可调），**不改分派顺序**。票 10（`#230`）做回归锁：跑完断言目录里 **0 个库件**。

### 2.5 取值的落点（票 3 已定，本票只记落点）

| 取值 | 值 | 落哪 |
| --- | --- | --- |
| `skill_name` | `'备忘录'` | `helpFile.ts` 常量 |
| `title` | `'使用手册'`（新线文档标题＝`备忘录 · 使用手册`） | `helpFile.ts` 常量 |
| `subtitle` | `'8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0'`（派生） | `helpFile.ts` 一处算，`meta_blocks[0]` 同源 |
| `version` | `'1.3.0'`（技能数据世代，**不是** npm 包版本 `0.1.0`）——**由生成器从老 yaml 顶层读**（实测顶层 `{skill:'备忘录', version:'1.3.0'}`），**不许写死**（裁决 9） | 生成器 → `helpFile.ts` 从资产取 |
| `contact` | 两项，**V6=B 补 `url`** 使其可点 | `helpFile.ts` 常量 |
| `init_banner` | 标题／正文／按钮文案照老 6 步；`prompt` 取 `memo_init_setup` 场景；`hidden=已初始化` | `helpFile.ts` 派生（键常在、显隐走 `hidden`） |
| `meta_blocks` | `[0]` 与 `subtitle` 同源；**`[1]` 不传**（V1：HELP 自身唤醒词不上页面）。⚠️ 措辞更正：`meta_blocks` 是**合规落点**，只是**用户 V1 已裁不用**（裁决 15）——不是「无源可派生」 | `helpFile.ts` |
| `recommendations` | **不传** | — |
| `groups` | 8 域／13 二级组／30 场景 | `scenes/*.ts` → `sceneData.ts` |
| `aliases` | 进**技能侧资产**，**不进渲染载荷**（组装时剥离） | `scenes/*.ts`（资产侧） |
| `editable_fields` | **进**（V7）：**清洗后 64 条／27 场景**（老口径 29；76 − 12 条 `html` 后有 2 个场景只剩这一个维度 ⇒ 归零，29−2＝27。**订正见下**） | `scenes/*.ts`（资产侧） |

**两条硬规矩落在数据形状上**：① HELP 是**完整体**不是现状快照——资产里**不许**为「新表暂无唤醒词」写缺失标记；② **命令不上页面**——`prompt_template` 里只出现唤醒词，`memo.*` 不进页面。

---

## 三、逐件归属表

| 文件 | 票号 | 一句话职责 |
| --- | --- | --- |
| `src/help/scenes/{memo,search,remind,wish,checkin,mood,sync,init}.ts` | **#227** | 8 个域的内容资产（机器生成，禁手改） |
| `src/help/sceneData.ts` | **#227** | 8 域 → 全量 `groups` ＋ 域级索引载荷 |
| `scripts/gen-help-assets.mjs` | **#227** | 老骨架 → 上面两类的生成器（含 `--check`） |
| `src/help/helpFile.ts` | **#228** | 资产 ＋ 派生 → 通用 help 模板全页 HTML |
| `src/help/manifest.ts` | **#229** | 命名与落点的三个值 |
| `package.json`（`base-paint` 依赖） | **#228** | 让 `helpFile.ts` import 得到公共层 |
| `tooling/check-boundaries.mjs`（删 `'skill-memo-ilife'`） | **#228** | 冻结名单少一个名字，`pnpm boundaries` 才绿 |
| `src/help/index.ts` | **无（不动）** | 新件不进它、包根出口维持 49（裁决 16）；包内消费者直接 import |
| `src/cli/cmd_read.ts` | **#229** | 分派先于开库 ＋ `dispatchHelp` ＋ `case` 兜底 |
| `src/render/envelope.ts` | **#229** | 命令表补 `'memo.help.lookup': 'list'`（10 → 11） |
| `docs/memo-migration-split.md:19-28` | **#229** | key 表补第 11 行（D1 的**配套另一半**，不补则 D1 白改） |
| `test/memo-split.test.mjs`（仓根） | **#229** | `:15` 的 10 → 11 条固定计数 |
| `packages/base-combos/combos.yaml` ＋ `src/present.ts`（重生成） | **#229** | 裁决 4：**必须登记** `memo.help.lookup` 并**重跑** `packages/base-combos/scripts/gen-present.mjs`（不许手改 `present.ts`） |
| `packages/skill-memo-ilife/test/render.test.mjs` | **#229** | `:20` 的计数 ＋ `GOOD`（`:5-16`）补一条载荷（D2 的**配套另一半**） |
| `test/combos-p8.test.mjs`（仓根） | **#229** | 不改测试：改 `combos.yaml` ＋ 重跑生成器（裁决 4／13） |
| `packages/plugin-memo-ilife/test/skills-provider.test.mjs` | **#231（兼记 #229）** | 反向断言改正向（`SKILL.md` 正文写进 `memo.help.lookup` 之后才翻；裁决 19） |
| `package.json`（`test` 脚本） | **#230** | 包内 `test` 盖不到包内用例，见下 |
| `packages/plugin-memo-ilife/**` | **#232／#233** | 装机与真机端到端 |
| `packages/skill-memo-ilife/AGENTS.md` | **本票** | 350 ＋ LF 告警线 |
| `docs/skills/skill-memo-ilife/t225-structure-design.md` | **本票** | 本文件 |

### 3.1 「包内 `test` 脚本盖不到新用例」要不要同批修

**实测**（六个技能逐包比 `package.json` 的 `scripts.test`）：

| 包 | 包内 `test` 脚本 | 盖到包内自己的用例吗 |
| --- | --- | --- |
| `skill-bill` | `node --test test/*.test.mjs` | ✅ 盖到 |
| `skill-chef` | `node --test test/*.test.mjs` | ✅ 盖到 |
| `skill-schedule` | `node --test ../../test/scaffold.test.mjs test/*.test.mjs` | ✅ 盖到 |
| `skill-calorie` | `node --test ../../test/scaffold.test.mjs ../../test/calorie-triggers.test.mjs test/fetch-t6.test.mjs` | ⚠️ 只挂 1 个 |
| `skill-home` | `node --test ../../test/scaffold.test.mjs` | ❌ 挂 0 个 |
| **`skill-memo-ilife`** | `node --test ../../test/scaffold.test.mjs` | ❌ **挂 0 个** |

**实测佐证**：包内 5 个用例文件（`test/{cli,fetch,policy,render,skill}.test.mjs`）今天**全部通过**（`node --test packages/skill-memo-ilife/test/*.test.mjs` → `tests 22 / pass 22 / fail 0`），但**一个都不在包内 `test` 脚本里**；仓根 `pnpm test` 是显式列目录的，所以仓级门盖得到它们。

**本席判：同批修，但只改一行、只加新用例，不用通配。**
- **改法**：`#230` 在自己那一票里把包内 `test` 脚本从
  `node --test ../../test/scaffold.test.mjs`
  改成
  `node --test ../../test/scaffold.test.mjs test/*.test.mjs`
  —— 这一改**同时把既有的 5 个旧用例挂上**（它们今天已实测全绿），**净风险低**。
- **理由**：①告警线／五步的整套纪律靠「包内一条命令能自证」；②「真 spawn 出口」的变异自证（票 10 要求的红→绿）必须在包内跑得动；③改法是本包自己一行的局部改动，不碰别的包、不碰仓根脚本。
- ⚠️ **但包内 `npm test` 今天已经是红的，加这一行也不会变绿**（裁决 18，`t220-orchestrator-decisions.md:182-185`）：`test/scaffold.test.mjs:10` 那个用例跑 `node tooling/write-snapshot.mjs --check`，实测报「快照过期（文件 `0.1.0@932e7b25…` ≠ 实际 `0.1.0@ef9b1647…`）」。⇒ **`#230` 的完成判据必须写成「新用例真 spawn 全绿 ＋ 变异自证」，不许写成「包内 `npm test` 绿」**；那条快照红是本图**之外**的既有状态，与本图的账分开记。（`pnpm boundaries` 基线实测 **PASS**，不在此列。）
- **两票各改一行的纪律**：`package.json` 这一个文件上有**两处互不相干的改动**——`dependencies` 那半归 `#228`、`scripts.test` 那半归 `#230`（`t230-body.md:11` 逐字点名票 9）。两票的落地窗口会重叠（`#228` 只等票 5），**各改各的一行、不整文件重写**。

---

## 四、第四节 · 文件行数告警线（实测表）

### 4.1 数字与口径

**告警线＝350 行，LF 口径（只数 `\n`）**，写进 `packages/skill-memo-ilife/AGENTS.md`（`structure.md:70` 要求这条数字写在各包自己的地方，**不落 `docs/`**）。与私家大厨那张图的用户答复同口径、同落点。

**口径边界**（逐条说明，免得日后各算各的）：

- **算**：本包 `src/` 下的全部 `.ts` ＋ 包内 `scripts/*.mjs`。
- **不算**：`templates/*.html`（页面模板，`structure.md:9` 明写「不管：测试文件、页面模板、构建产物、生成的资产、文档」）、`SKILL.md`（说明面／文档）、`test/*.mjs`（测试文件，同上）、`dist/`（构建产物）、`tsconfig.tsbuildinfo`。
- **`src/help/scenes/*.ts` 算不算「生成的资产」**：**算源码，要数**（**已判，不是待确认**）。`structure.md:9` 的「生成的资产」指的是页面素材那一类；`structure.md:7` 的管辖是「`packages/` 下全部源码」，而这里是**编译进 `dist` 的 `.ts` 源码**（同形先例：`packages/skill-schedule/src/help/scenes/help-assets.ts` 实测活在 `src/` 里被 `tsc` 编译）。判据见复审 `t225-review-G.md:69-71`。
- **口径文件自身不入表**：本票新建的 `packages/skill-memo-ilife/AGENTS.md`（实测 **13 LF**）**就是这条口径的正本**，不登记进下面那张表（登记它等于用被定义的东西定义自己）。

### 4.2 数法与命令

```
# LF 口径逐件数（排除 node_modules 与 dist）
node -e "const fs=require('fs'),p=require('path');const root='D:/ilife/packages/skill-memo-ilife';const out=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','dist'].includes(e.name))continue;
const f=p.join(d,e.name);if(e.isDirectory())walk(f);else{const t=fs.readFileSync(f,'utf8');
out.push([p.relative(root,f).replace(/\\/g,'/'),(t.match(/\n/g)||[]).length]);}}}
walk(root);out.sort((a,b)=>b[1]-a[1]);for(const [f,lf] of out)console.log(String(lf).padStart(5),f);"

# 复现（清点法，会少 2～8 行：随件而变）
(Get-Content 'packages/skill-memo-ilife/src/cli/cmd_read.ts').Count
```

**两种数法实测同件不同值**：`src/cli/cmd_read.ts` LF＝**147**／`Get-Content`＝**143**（少 4）；`src/render/envelope.ts` 少 2；`src/help/lookup.ts` 少 2；**`src/fetch/db.ts` 少 8**（108 → 100）——`Get-Content` 不数结尾空行、按行切分口径不同，**差值随件而变，不是固定 2～4 行**。**本图一律取 LF**（与卡路里那张结构设计的差异记法一致，`t179-180-structure-design.md:123` 记过同样的偏差，本席与复审员 G 同法复现）。

### 4.3 逐件行数表（实测，2026-09-12）

| 件 | LF | 超 350？ |
| --- | --- | --- |
| `src/cli/cmd_read.ts` | **147** | — |
| `src/fetch/db.ts` | 108 | — |
| `src/fetch/feishu.ts` | 100 | — |
| `src/render/html.ts` | 62 | — |
| `src/policy/wakewords.ts` | 58 | — |
| `src/render/envelope.ts` | 43 | — |
| `src/help/lookup.ts` | 42 | — |
| `scripts/build-help.mjs` | 37 | — |
| `package.json` | **34** | — |
| `src/policy/category.ts` | 30 | — |
| `src/policy/reminder.ts` | 25 | — |
| `src/render/templates.ts` | 25 | — |
| `src/policy/crud.ts` | 24 | — |
| `src/fetch/errors.ts` | 23 | — |
| `src/policy/wish.ts` | 14 | — |
| `src/render/errors.ts` | 11 | — |
| `src/policy/index.ts` | 9 | — |
| `tsconfig.json` | 8 | — |
| `src/fetch/index.ts` | 5 | — |
| `src/index.ts` | 5 | — |
| `src/render/index.ts` | 5 | — |
| `src/help/index.ts` | 2 | — |

**不在表内的件（按口径边界不算，说明理由）**：`templates/*.html` 六件（页面模板，最大 `sync_report.html` 512 LF）；`SKILL.md` **63 LF**（说明面／文档，票 12 会话补过 frontmatter）；`test/*.mjs` 五件（测试文件，最大 `fetch.test.mjs` 76 LF）；`packages/skill-memo-ilife/AGENTS.md` **13 LF**（**本票新建的口径文件自身**，见 §4.1）；`dist/` 与 `tsconfig.tsbuildinfo`（构建产物）。

**结论：本包今天按此口径 0 件超线**，最大的 `src/cli/cmd_read.ts` 也只用掉 42% 的额度。**这条告警线在备忘录是第一次立，立完当场是绿的**——不像私家大厨（`cmd_read.ts` 388／`db.ts` 451 两件已超线）。

**第四步预登记（`structure.md:97-101`）**：本次新增件按本设计**预计全部 ≤350**——单文件方案会到 **≈759 LF**（同族实测密度折算，见 §1.2 A 组注），拆到 8 个域文件后每件预计 **40～220 LF**（按 25.3 LF／场景均分 ≈ 95，最大域若占 8 场景 ≈ 205，均在线内）。**资产票落地时若哪一件实测超线，当场报「已超线，需要根据规则进行重构。」并给拆法**（拆法已备：域文件再按二级组切）。

---

## 五、给项目负责人点头用的一页纸

> 本节 **11 行正文**（不超 15 行），给不看技术细节的人 30 秒判「该不该点头」。

**要办的事**：让「备忘录 help」在 DSH 真机上明确拿到一份 help HTML 文件（落盘＋回执绝对路径），内容是备忘录自己的老骨架，页面用仓里那套通用 help 模板（与卡路里／记账／居家同一套）。

1. **目录名一个都不改**：新增件全落**已经有的** `packages/skill-memo-ilife/src/help/` 下。`src/help/` 是「帮助」这件事的**技能级**落点，不是 HELP 里的一个分组，因此不算能力目录、不违反铁律四（同题先例：卡路里的 `help-lookup`）。
2. **新增 13 个文件**（源码 11 ＋ 脚本 1 ＋ 说明面 1）：`src/help/scenes/` 下 8 个域文件（备忘／查找／提醒／心愿／打卡／情绪／同步／初始化，各 1 个导出）＋ `sceneData.ts`（合成 8 域 ＋ 域级索引）＋ `helpFile.ts`（出整页 HTML）＋ `manifest.ts`（文件名与落点三个值）＋ `scripts/gen-help-assets.mjs` ＋ `packages/skill-memo-ilife/AGENTS.md`。
3. **会改动 5 个旧件**：`src/cli/cmd_read.ts`（**分派先挪到开库之前**——今天没有库就看不了帮助）／`src/render/envelope.ts`（命令表 10 → 11 条）／`package.json`（加 `base-paint` 依赖 ＋ 挂包内用例，**两票各改一行**）／仓根 `tooling/check-boundaries.mjs`（冻结名单删 `'skill-memo-ilife'` 一项）／`combos.yaml`（登记新命令 ＋ 重跑生成器，**已裁：必须登记**）。`src/help/index.ts` **不动**（不转发新件、包根出口维持 49）。
4. **告警线数字：350 行，LF 口径（只数换行符）**，写进 `packages/skill-memo-ilife/AGENTS.md`（不写 `docs/`）。**本包今天实测 0 件超线**（最大 `src/cli/cmd_read.ts` 147）。
5. **不新开能力目录、不做整包重排**（那是另立的票）；`src/` 第一层那五个工种名本次**一个都不摆正**，其余工种目录一件都不碰。
6. **落盘那一小块本包自持**（第 4 份同逻辑实现，照饼干记账 `output.ts` 的 `wx` ＋ `EEXIST` ＋ `resolve`，`_N` 从 `_2` 起）；件头注释指向共用件票 `#237` 与本图迁移票 `#240`。**不预置任何同名临时件，也不依赖 `#237` 先落地**（`#229` 不挂 `#237` 阻塞边）。
7. **请你裁一条**：包内 `npm test` 今天**盖不到包内任何用例**（5 个用例文件只在仓根跑，实测 22 项全绿），而且它**今天本身就是红的**（`write-snapshot --check` 报「快照过期」，属本图之外的既有状态）⇒ 建议 `#230` 顺手加一行 `test/*.test.mjs`，但**完成判据要写成「新用例真 spawn 全绿 ＋ 变异自证」**，别写成「包内 npm test 绿」。
8. **本票只写形状、不写业务代码**；你点头后票 7／票 8 立刻开工，票 9 接出口。

---

## 六、开工前置与风险

1. ✅ **`combos.yaml` 登记（已裁，不再是风险）**：编排裁决 4／`t224-resolution.md:11` 已定「**必须登记**」——`memo.help.lookup` 进 `packages/base-combos/combos.yaml` 的 `combos:` 段（今天该段有 10 条 `memo.*`，`PRESENT_KEYS` 共 87 ＝ calorie 77 ＋ memo 10），并**重跑** `packages/base-combos/scripts/gen-present.mjs`。**不许手改 `present.ts`**：`test/combos-p8.test.mjs:115-120` 断言它与生成输出逐字相等。本席原判「需负责人裁」，该状态**已作废**。佐证：复审员 G 用探针独立证实不加就红——`createRegistry(PRESENT_KEYS).resolve('memo.help.lookup')` → `THROWS: 未知 registry key`。
2. ⚠️ **同批必修的四处（含各自的配套另一半，缺一半就白改）**：①`docs/memo-migration-split.md:19-28` 补第 11 行 ＋ `test/memo-split.test.mjs:15` 的 10 → 11；②`packages/skill-memo-ilife/test/render.test.mjs` 的 `:20` 计数 ＋ `GOOD`（`:5-16`）补一条载荷；③`packages/base-combos/combos.yaml` ＋ 重跑生成器（D3，机制见上一条）；④`packages/plugin-memo-ilife/test/skills-provider.test.mjs:90` 的反向断言——**它今天绿、是明天才红**（只有 `SKILL.md` 正文写进该命令之后才翻）。①②③ 归 `#229`，④ 归 `#231`（兼记 `#229`）。
3. ⚠️ **`pnpm-lock.yaml` 正被别的会话改写（作息／大厨那条线）**：`#228` 加 `base-paint` 依赖时**只做最小改动**——手工在 `package.json` 的 `dependencies` 里加一行（与 `skill-bill` 同值 `^0.3.0`），**避开全量 `pnpm install`**；非跑不可时只对本包过滤（`--filter skill-memo-ilife`），写完**核锁里各家条目都在、只增不减**，并把这次是否动过锁文件写进 `#228` 的第五步对账。
4. **票据交接件与线上不一致的三处**（如实登记，供负责人一眼判；本席**未改**其中任何一件）：
   - 票面 `t225-body.md:10` 写「落点…写进 `packages/skill-memo-ilife/AGENTS.md`」（正确），而**地图 Notes `map-220-body.md:80` 的同一条写「写进 `docs/skills/skill-memo-ilife/`」**——两处相反。本报告按票面 ＋ 最新先例落 `packages/`，**并把地图那条记在这里备更正**（本票不动地图正文）。
   - 票面引的 `tooling/check-boundaries.mjs:37` 今天已漂到 **`:41`**（该文件带别的会话未提交改动，`skill-schedule` 已移出该名单）。
   - **⚠️ 一处已被并行会话改掉、本报告不重复列为待办**：票 12（`#232`）会话**已就地摆正**两件事——`packages/skill-memo-ilife/SKILL.md` **已有 frontmatter**（`:1-4`，`name: skill-memo-ilife` ＋ description 里已写「memo.help.lookup 出备忘录自己的 HELP 文件」）、`package.json` 的 `files` **已含 `"SKILL.md"`**（实测 `["dist","SKILL.md","templates/*.html"]`）。本席复跑 `packages/plugin-memo-ilife/test/skills-provider.test.mjs` **8/8 绿**佐证。⇒ 这两条**不再是待办**。
5. ✅ **「生成的资产」那条口径已判，不再是待确认**：`src/help/scenes/*.ts` 是编译进 `dist` 的 `.ts` 源码 ⇒ **要数行数**，并写进 `packages/skill-memo-ilife/AGENTS.md` 的「范围」一行（判据见复审 `t225-review-G.md:69-71`，本席采纳）。
6. **开工顺序**（`#227` → `#228` → `#229`，卡路里那张结构设计同法），四步：

   1. `#227` 先落 `scenes/*.ts` ＋ `sceneData.ts` ＋ 生成器 → 期望零测试红（此时无人消费）；
   2. `#228` 落 `helpFile.ts` ＋ `manifest.ts` ＋ 依赖与边界名单 → 那几处固定计数**不**动，测试仍绿；
   3. `#229` 改分派顺序 ＋ 命令表 ＋ 四处配套件（含 `combos.yaml` ＋ 重跑生成器）＋ 落盘自持件 → 端到端跑通；
   4. `#230` 真 spawn 锁 ＋ 包内 `test` 脚本一行；`#231` 说明面（写进 `memo.help.lookup`）；`#232`／`#233` 装机与真机终审；欠债 `#240` 迁共用件。
7. **边界纪律**：`tooling/check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN` 那一行**有三张兄弟图同时在动**（居家 `#183`／作息 `#197`／大厨 `#208`）——本图**只删 `'skill-memo-ilife'` 一项**，别人的名字一个都不碰；工作树里已有的别人改动（`skill-chef`／`skill-schedule`／`skill-calorie`／`pnpm-lock.yaml`／该工具）**只读**，绝不按 `HEAD` 重写整个文件（裁决「并发纪律」第 2 条）。
8. **本票的雾**：无「拿不准到影响形状」的条目。首版列的两条「待确认」（生成物算不算源码、`combos.yaml` 登不登记）**都已由裁决落定**（见第 1／5 条）；`t224-resolution.md:9` 也已把速查支产物名裁成 `备忘录_速查表`。**本报告不再留任何会翻的边界。**

---

## 九、已被上游定案的条目（本报告只采用，不再问负责人）

| 条目 | 定案 | 出处 | 它在本报告里落在哪 |
| --- | --- | --- | --- |
| 落盘目录 | **扁平** `<SKILLS_DB_PATH>/memo_html/`，**不加 `help/` 层** | 地图 `Destination` ＋ Notes「文档与产出落点（用户 Q3=A）」；票 4 独立复核；证据件 `t224-delivery-path-evidence.md`（三条独立证据） | `src/help/manifest.ts` 的 `HELP_HTML_DIR_NAME`（A5） |
| 文件名主体与通式 | `备忘录_HELP` ＋ `备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`（**不必改老名**） | 票 4 定案段；老出处 `memo_render.py:602` | `src/help/manifest.ts` 的 `HELP_FILE_STEM`（A5） |
| 缺省出口 | **缺省＝HELP 文件**（落盘 ＋ 回执绝对路径）；速查走显式参数 | 地图 `Destination`；票 9 票面 | §2.4 的分派形状 |
| 固定名镜像 | **不做**（不覆盖技能根 `备忘录.html`） | `#131`／`#143` 已裁 | §2.4 第 3 条（只写时间戳件） |
| 管线归属 | **甲：自持最小管线**（`_N` 从 `_2` 起；件头注释指向 `#237`／`#240`；`#229` **不挂** `#237`） | 编排裁决 3 ＋ `t224-resolution.md:3-7` | §1.3（含三条硬条件） |
| `combo` 侧 | **必须登记**：`memo.help.lookup` 进 `packages/base-combos/combos.yaml` ＋ 重跑 `scripts/gen-present.mjs`（不许手改 `present.ts`） | 编排裁决 4 ＋ `t224-resolution.md:11` | §1.2 D3、§六 风险 1 |
| `aliases` | **留在技能侧资产，渲染时剥离**（不进渲染载荷、不改公共层 schema） | 编排裁决 5 | §2.2 资产形状、§2.5 |
| `editable_fields` | 清洗后 **64 条／27 场景**（老口径 29，见文首订正；76 − 12 条 `html`；要清的共 22 条） | 编排裁决 6 ＋ `t226-resolution.md`（V7） | §2.2、§2.5 |
| `version` | **从老 yaml 顶层读**，不许写死；生成物加 SHA-256 摘要锁 ＋ `--check` | 编排裁决 9 | §2.2、§2.5 |
| 资产形状 `src/help/scenes/` | 维持 `scenes/`（与「平铺进 `src/help/`」那条更省的路对比后仍取它）；**新建目录层级的点头由编排会话授予** | 编排裁决 17 | §2.1 对比段、§十 |
| `src/help/index.ts` | **不动**，不转发新件、包根出口维持 49 | 编排裁决 16 | §1.2 B3、§2.2、§2.3 |
| 包内 `npm test` | 今天**已经是红的**（快照过期，属本图之外的既有状态）⇒ `#230` 完成判据＝「新用例真 spawn 全绿 ＋ 变异自证」 | 编排裁决 18 | §三 3.1、§五 第 7 条 |
| 告警线 | **350 ＋ LF 口径（只数 `\n`）**，写进 `packages/skill-memo-ilife/AGENTS.md`（**不是** `docs/`） | 用户答复（`docs/skills/skill-chef/map-chef-body.md:197`／`:212`）；`structure.md:70` | §四 与 `AGENTS.md`（C2） |
| `SKILL.md` frontmatter 与 `package.json` 的 `files` | **已由票 12 会话就地摆正**（实测 frontmatter 在 `:1-4`、`files` 含 `"SKILL.md"`；插件提供方用例 8/8 绿） | 编排会话 2026-09-12 ＋ 本席复跑 | §六 风险 4 第 3 条（**不再列为待办**） |

---

## 十、第二步的点头条件（`structure.md:88` 逐条对）

| 触发条件 | 本票 | 依据 |
| --- | --- | --- |
| 新建目录层级 | **触发**（`src/help/scenes/`）——但**这一条的点头已由编排会话以项目负责人授权授予**（编排裁决 17） | §2.1 |
| 要碰三个以上能力 | **不触发**（只落 `skill-memo-ilife` 一个包） | §2.1 注 |

**⇒ 本票剩的点头理由只有一条**：它是票 7／票 8 的前置门。（技术上触发的「新建目录层级」那一半已由裁决 17 结清。）**不是因为它越界。**

---

## 十一、第五步 · 交付对账（施工时填，定位用）

| 第一步的行 | 归票 | 实际碰到的 | 偏差 |
| --- | --- | --- | --- |
| A1 `src/help/scenes/*.ts`（8） | #227 | 待填 | — |
| A2 `src/help/sceneData.ts` | #227 | 待填 | — |
| A3 `scripts/gen-help-assets.mjs` | #227 | 待填 | — |
| A4 `src/help/helpFile.ts` | #228 | 待填 | — |
| A5 `src/help/manifest.ts` | #229 | 待填 | — |
| B1 `src/cli/cmd_read.ts` | #229 | 待填 | — |
| B2 `src/render/envelope.ts` | #229 | 待填 | — |
| B3 `src/help/index.ts` | **无（不动）** | 待填（预期：0 改动） | — |
| B4 `package.json` | #228（依赖）／#230（`scripts.test`） | 待填 | — |
| B5 `tooling/check-boundaries.mjs` | #228 | 待填 | — |
| C1 本文件 | 本票 | ✅ 已落 | 0 |
| C2 `packages/skill-memo-ilife/AGENTS.md` | 本票 | ✅ 已落 | 0 |
| C3 `docs/skills/skill-memo-ilife/t225-body.md` | 本票 | ✅ 已改（进度 90%） | 0 |
| D1 `docs/memo-migration-split.md` ＋ `test/memo-split.test.mjs` | #229 | 待填 | — |
| D2 `packages/skill-memo-ilife/test/render.test.mjs`（计数 ＋ `GOOD`） | #229 | 待填 | — |
| D3 `packages/base-combos/combos.yaml` ＋ `src/present.ts`（重生成） | #229（**已裁：登记**） | 待填 | — |
| D4 `packages/plugin-memo-ilife/test/skills-provider.test.mjs` | #231（兼记 #229） | 待填 | — |

**本票（只写形状）的自对账**：第一步 C 组三行全部有着落，**偏差 0**；A／B／D 三组的实际施工分属票 7／8／9／10／11，本票**不动 `packages/` 下任何代码文件**（唯一的 `packages/` 写入是新建说明面 `AGENTS.md`）。

---

## 十二、整改记录（首版 → 本版；对照复审 `t225-review-G.md` 与编排裁决）

**首版被复审判「有条件放行」68/100。** 四条阻塞项来自「文档里还留着甲／乙裁决之前的旧快照」。逐条整改如下（**每条都指得出裁决出处**）：

| # | 首版写的 | 本版改成 | 依据 |
| --- | --- | --- | --- |
| 1 | 管线归属＝**乙**（消费 `#237` 的 `saveHtmlFile`）＋「同名同签名临时件」降级写法 | **甲：自持最小管线** ＋ 三条硬条件（只抄通式那一小块／`_N` 从 `_2` 起／件头注释指向 `#237`／`#240`）＋ **函数名照抄 `packages/skill-bill/src/output.ts` 的 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`** ＋ **不新造 `saveHtmlFile`** ＋ `#229` **不挂** `#237` 阻塞边 | 编排裁决 3；`t224-resolution.md:3-7`；复审 §三「撞名判定」 |
| 2 | `B3`：`src/help/index.ts` 转发 7 个新名字，三票共改 | **B3 取消**：新件不进 `index.ts`、**不扩包根出口（维持 49）**，包内消费者直接 import | 编排裁决 16；`structure.md:58` |
| 3 | 资产形状缺 `aliases` 位；`version` 写成 `helpFile.ts` 常量；`editable_fields` 写「76 条」 | 补 **`aliases` 留在技能侧资产、渲染时剥离**；`version` **从老 yaml 顶层读**（禁写死）＋ 生成物加 SHA-256 摘要锁；`editable_fields` 改 **64 条／27 场景**（老口径 29，见文首订正；要清的共 22 条） | 编排裁决 5／6／9；`t220-orchestrator-decisions.md:57-73`、`:124-127` |
| 4 | `D4` 归 `#231` 且写成「不改就红」 | 归 **#231（兼记 #229）**，并标明它是**明天才红**（只有 `SKILL.md` 正文写进该命令之后才翻） | 编排裁决 19 正本逐字「`D4` 归 **#231**（兼记 #229）」（`t220-orchestrator-decisions.md:187`）；`:88` 原注释「归 #231／#229」；复审 §三作业 3① |
| 5 | `D3` 标「**需负责人裁**」；§五 第 7 条把它列成待裁项 | **已裁：必须登记**——`combos.yaml` 的 `combos:` 段补一条 ＋ **重跑** `gen-present.mjs`（不许手改 `present.ts`）；待裁状态删除 | 编排裁决 4；`t224-resolution.md:11` |
| 6 | D1／D2 只写「改计数」 | 各补**配套的另一半**：D1 ＝ `docs/memo-migration-split.md:19-28` 补第 11 行；D2 ＝ `render.test.mjs` 的 `GOOD`（`:5-16`）补一条载荷 | 复审 §三作业 3④／⑤、作业 4 |
| 7 | 新件数在四处各写一个（9／11／12／13） | 全文统一：**源码 11 ＋ 脚本 1 ＋ 说明面 1 ＝ 13 个新文件**（只写一次，其余引用它）；删掉 §1.2 的空行 A6 | 复审 §三作业 3⑥ |
| 8 | 「单文件必超线」标**推断**；先例写「5 域 85 场景」；每件预计 40～150 LF | 改用**实测密度**：先例 **2198 LF／87 场景 ＝ 25.3 LF／场景** ⇒ 30 场景 ≈ **759 LF**（超两倍以上）；每件预计改 **40～220 LF**；补「一域一容器在单文件里本来就有（`scenes[]` 34 个），本设计拆的只是跨文件」 | 复审 §三作业 2；编排裁决 9／10 |
| 9 | 未比较「8 域文件平铺 `src/help/`」这条更省的路 | **补对比段**（§2.1）：平铺同样合铁律四且**不新建目录层级**；裁决 17 仍取 `scenes/`（资产与机器件分居、13 个文件混放伤可导航性），**新建目录层级的点头由编排会话授予** | 编排裁决 17；复审 §三作业 2③ |
| 10 | `package.json` 33｜`SKILL.md` 59｜「清点法会少 2～4 行」；`AGENTS.md` 未登记；`sceneData.buildHelpSceneIndex()` 无消费者；`src/` 沿袭缺口未登记 | 数字改 **34**／**63**／「少 2～8 行（随件而变）」；`AGENTS.md`（13 LF）声明为口径文件自身不入表；`buildHelpSceneIndex()` **点名消费者＝`helpFile.ts` 的 `buildMemoHelpFileData`**（即 `memo.help.lookup` 的 envelope `data`）；§2.1 补**沿袭缺口**一行（`src/` 第一层五个工种名本次一个都不摆正） | 复审 §三作业 3／5、作业 5；`structure.md:68` |
| 11 | §三 3.1 只写「建议加一行 `test/*.test.mjs`」 | 补**如实提示**：包内 `npm test` **今天已经是红的**（`write-snapshot --check` 报快照过期，属本图之外的既有状态），加这一行也**不会变绿** ⇒ `#230` 的完成判据＝「新用例真 spawn 全绿 ＋ 变异自证」 | 编排裁决 18 |
| 12 | 类型出口未交代；类型出处引 `spec/help.ts:48-59`（落在两类型中间） | `helpFile.ts` 写明「**运行时 3 个 ＋ 类型 0 个**（全部转引公共层契约）」；出处改 `SceneSubgroup:39-43`／`SceneGroup:45-50` | 复审 §三作业 1-C；第五节 2 |
| 13 | `packages/skill-memo-ilife/AGENTS.md` 末行引 `packages/skill-chef/AGENTS.md`（**该文件不存在**） | 改成真出处：**用户答复**（`docs/skills/skill-chef/map-chef-body.md:197`／`:212`），并注明兄弟件尚未落盘 | 复审 第五节 1 |

**本席未照改的条目：无。** 复审 G 的第四节 10 条与第五节 8 条，**逐条回原始出处核过**（`t220-orchestrator-decisions.md`／`t224-resolution.md`／`structure.md`／被指的测试文件与 `combos.yaml`／`packages/base-render/src/spec/help.ts`），**全部成立**，本版全数采纳。

> ✅ **两处措辞冲突，本席已回原始出处判过，结论一致**（记下来免得下游再问一次）：
> 1. **`D4` 的主责票**：编排会话的转述曾写「主归 #229，`#231` 只是复核方」（引复审 G 作业 3①），而**裁决正本第 19 条**逐字写「`D4` 归 **#231**（兼记 #229）」、被改的那行注释原文也写「归 #231／#229」。**本报告取 #231（兼记 #229）**，依据三条：①裁决正本；②注释原文；③该断言锁的是 **`SKILL.md` 正文**，而正文归 `#231`（票 12 的分界注释自己写了「本票只动正文」）——`#229` 改的是命令表与出口，**它落地时这条断言仍绿**，只有 `#231` 动正文那一刻才翻。**把主责记到 #229 会让「谁去翻正断言」落空。**
> 2. **`package.json` 的「5 个旧件」里它算不算一件**：`combos.yaml` 也是旧件，但它在 `base-combos` 包、不属本包——本报告 §五 第 3 条按「本包 4 件 ＋ 仓根/跨包 2 件」表述（`check-boundaries.mjs` 已是跨包件），不改变任何一行的归属。
