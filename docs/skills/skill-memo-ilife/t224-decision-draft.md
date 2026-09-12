# 票 4（`#224`）决策草案：命名落盘管线的归属 ＋ 缺省出口口径

本票**不出裁决**。下面是「题目摆好」：每题给选项、证据（文件:行号）、推荐答案、推荐理由、选错的代价。
本票只出决定，不写业务代码——起草时未改 `packages/` 任何文件、未 commit、未动任何 issue。

**一句话总览**：目的地（Destination）已经用户认可，其中**落盘目录、`help/` 那一层、文件名主体、时间戳通式、缺省＝HELP 文件**五件事**已被用户原话 ＋ 磁盘实测定案**（第二节，逐条引原话与出处行），本项目不必再问；真正还要负责人裁的只有**两条**（第三节：管线归属／速查支的名字与参数名）。

**并行会话的一份同题证据已并入本文**：`docs/skills/skill-memo-ilife/t224-delivery-path-evidence.md`（编排会话 2026-09-12 落，独立得出同一结论：不加 `help/`），与本文第二节第 1／2 条、第五节 C 的磁盘实测互为独立佐证。

---

## 第一节 · 题目总览

### ① 命名与落盘的管线归属

**题目**：备忘录的「文件名通式 ＋ 独占落盘 ＋ 绝对路径回执」这一小块，走哪条路？

| 选项 | 内容 | 证据 |
|---|---|---|
| **甲** | 照 `#143` 裁决 (b)：备忘录**自持一份最小管线**，只抄通式那一小块 | `docs/skills/skill-memo-ilife/t221-resolution.md:13`（可整块照抄三块 `skill-bill/src/output.ts:27-39`／`:42-58`／`:72-86` ＋ 常量换 `skill-bill/src/render/helpPaths.ts:22`） |
| **乙** | 收成**共用位**，由已开的共用件票 `#237` 的 `saveHtmlFile` 落地，备忘录直接消费 | `#208` 地图正文 `## 进度` 段「**Q7 已裁（2026-09-12）**：维护者取 **乙**」；`#237` 票面第一节函数签名 `saveHtmlFile({ dir, stem, html, onExists? })` |
| **丙** | 本图自持 ＋ 另立合流票（与 `#147` 的合流触发点绑定，等共用件到位再迁） | `docs/skills/skill-chef/t1-bill-recipe.md:606-607`（甲／乙／丙三条路与代价） |

**推荐：乙（消费 `#237` 已裁的共用件），并把「等它」写进票 9 的阻塞边；同时把备忘录的路径自持项（`memo_html` ＋ `备忘录_HELP`）压到最小。**

推荐理由（三条，都可核）：

1. **同一个问题用户在隔壁已经裁过乙，且是最新原话**：`#208` 采访区 Q7 第三轮逐字「`saveHelpFile -- 这个名字不好。叫 saveHtmlFile 感觉更好。我们用乙（建共用件，推荐）`」。备忘录与私家大厨是同一张流水线的第 6／第 7 家，用户在同一轮的判法没有只为一家改的理由。
2. **`#147` 的三条合流触发点第 1 条今天已命中，甲在新规下就是留违规**：`structure.md:23` 铁律一「**把对方那份抄一遍放进自己目录，不算走了接口**——抄的那份迟早和原份走散」；`structure.md:67`「**共用位是从第二个用法里长出来的**」。落盘管线在代码里的消费者今天实测 **2 家**（卡路里 `packages/skill-calorie/src/output.ts:159-229`；记账 `packages/skill-bill/src/output.ts:42-86`），第 3 家（大厨）已由 `#237` 承接 ⇒ 备忘录是第 4 家。
3. **`#147` 当时的三条理由今天全部仍成立，但它们推不出「备忘录自持」，只推出「别塞进 `base-paint`」**：`base-paint` 仍是被 `#96` 主动冻结的**零依赖纯渲染包**（`tooling/check-boundaries.mjs:12-16` 断言 `base-render` 零运行时依赖、且不得含 `base-combos`），落盘仍是 IO。`#237` 的解法正是**新建独立包**，没有破这三条——所以乙与 `#147` 不冲突。

**选错的代价**：

- 选甲（自持）：仓库里第 4 份同逻辑；`saveHtmlFile` 一旦落地把 `_N` 起步数改成 `_1`（`#237` 票面第三节建议，照老家 `align_08.py`），备忘录那份要**再改一次**；铁律一在新规下记录在案。
- 选乙但**不排票**：备忘录的出口票（`#229`）被 `#237` 硬阻塞，而 `#237` 今天还没写第一步影响清单 ⇒ 本图 5/14 会卡在出口票上，目的地到不了。
- 选丙（自持＋另立票）：短期最顺，但「另立的合流票」没人接就是**第二处留违规**（`#147` 那轮之所以写合流触发点，就是因为当时假定「再来一家就合流」）。

### ② 缺省出口口径

**题目**：对 AI 说「备忘录 help」时，缺省交什么？

| 选项 | 内容 | 证据 |
|---|---|---|
| **甲** | **缺省＝HELP 文件**（落盘 ＋ 回执绝对路径），速查走显式参数 | 地图 `## Destination` 逐字；`t229-body.md:3`；先例 `skill-bill/src/cli/cmd_read.ts:70-78` 头注释「缺省（不给任何参数）＝ 老实物同款 HELP 文件」 |
| **乙** | 保留别的缺省（例如缺省只回速查 JSON、落盘要显式参数） | 今天 `memo.help.lookup` **根本不存在**（`src/render/envelope.ts:5-16` 只登记 10 条命令；地图 Notes 实测 `ERR 3: 未知联动 key`）⇒ 甲乙之间**没有既有行为可保** |

**推荐：甲。** 理由：这不是「要不要改缺省」，而是「**新键的缺省设成什么**」——今天零缺省，没有兼容包袱；而目的地是用户逐字认可的（第二节第 4 条引原话），且与三家先例同形（账单／居家／卡路里同判法）。

**选错的代价**：选乙＝备忘录的 HELP 交付与三家不同形，`#233` 的真机验收与维护者肉眼终审都要按另一套口径重新解释；且用户 Q2 原话把这份 HELP HTML 定为「**官方源**」，缺省不给文件等于官方源还是要人记参数才拿得到。

### ③ 产物名与落点（本票产出项）

| 项 | 推荐值 | 依据 |
|---|---|---|
| 落盘目录 | `<SKILLS_DB_PATH>/memo_html/`（**不加** `help/`） | 用户原话（第二节第 1 条）＋ 磁盘实测 |
| HELP 文件名主体 | `备忘录_HELP` | 老 `script/memo_render.py:602`（`def render_help(payload=None, name="备忘录_HELP", …)`） |
| HELP 文件名通式 | `备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`，同秒 `_N` **从 `_2` 起** | 老 `memo_render.py:124-142`（`n = 2` 起递增）；实物 `D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260810_093619_2.html` 等 |
| 时间戳 | **本地**时区秒；`SKILLS_DB_PATH` 递归创建 | 老 `:131` `datetime.now().strftime("%Y%m%d_%H%M%S")`；bill `skill-bill/src/render/helpPaths.ts:31-38` 同口径 |
| 速查支产物名 | `备忘录_速查表`（与 HELP **分名**） | 记账 `LOOKUP_FILE_STEM = '饼干记账_速查表'`（`skill-bill/src/render/helpPaths.ts:28`）＋ `:26-27` 的判法「别让用户按一个名字打开到另一个东西」 |
| 速查支显式参数名 | `mode:"lookup"`（速查表文件）／`q`（只回命中、不落盘）／`--html <路径>`（逐字覆盖写） | 账单三支同形：`skill-bill/src/cli/cmd_read.ts:88-111`（`mode`／`q` 互斥、只认 `lookup`）＋ `:503-510` |
| `combo` 侧 | **不同步登记**（不加进 `base-combos`） | 见下 |

**`combo` 侧为什么不动**（本题要的产出之一）：

- `packages/base-combos/combos.yaml:506-551` 与 `:578-614` 两块今天登记了 `memo.*` 的 **10 条**，`present.ts:104-113` 同步生成；`memo.help.lookup` 不在其中。
- 先例一致：`combos.yaml` 全文 **0 处** `bill.`（实测 grep 无命中），而账单的 `bill.help.lookup` 是完整可用的（`skill-bill/src/cli/cmd_read.ts:494`）；居家 `/` 作息 `/` 大厨同样没登记。
- 唯一登记过 HELP 的是卡路里 `calorie.help.lookup`（`combos.yaml:116`／`present.ts:26`），但那一条的产物是**速查台页面**（`#139` 那轮的模型），不是本图的文件交付。
- 结论：`memo.help.lookup` **只登进备忘录自己的命令形状表** `packages/skill-memo-ilife/src/render/envelope.ts:5-16`（现在 10 条，要变 11 条）。`PRESENT_KEYS` 的消费方只有 `base-combos/src/index.ts:2-6` 的 `createRegistry`，与「面板／侧栏的 HELP 入口」同属 `#61` 那条线（地图 Out of scope 已写明）。

---

## 第二节 · 已被用户原话定案的条目（本项目不必再问用户）

> 效力顺序照地图 `## Notes`：「本图一切决策的源头在文末『用户原话采访区』；执行中与采访区冲突的，以采访区为准。」

| # | 条目 | 定案 | 用户原话（逐字） | 出处 |
|---|---|---|---|---|
| 1 | **落盘目录** | `<SKILLS_DB_PATH>/memo_html/`（**不加** `help/` 子层） | 「产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径」 | `docs/skills/skill-memo-ilife/map-220-body.md:3`（`## Destination`，用户已认可） |
| 2 | **文档与产出落点（含 `help/` 那一层）** | 交付 HTML 落老目录 `<SKILLS_DB_PATH>/memo_html/`，**扁平、无子层** | 「交付 HTML 落老目录 `<SKILLS_DB_PATH>/memo_html/`」（Q3=A） | `map-220-body.md:83`（Notes「文档与产出落点（用户 Q3=A）」）＋ `:45`（接手须知「产物落点」） |
| 3 | **文件名主体 ＋ 时间戳** | `备忘录_HELP_<YYYYMMDD_HHMMSS>` | 同上第 1 条原话逐字（目的地是唯一口径来源；票面也记「命名**不必改老名**」，`t224-body.md:25`） | `map-220-body.md:3`；老名出处老 `script/memo_render.py:602` |
| 4 | **缺省口径** | 缺省＝HELP 文件（落盘 ＋ 绝对路径回执） | 「在 DSH 真机对 AI 说『备忘录 help』→ **明确拿到 help HTML 文件**（落盘＋可打开）」 | `map-220-body.md:3`（Destination 第一句） |
| 5 | **不写固定名镜像** | 老那条「覆盖技能根 `备忘录.html`」不做；时间戳件只留一份 | 「老技能那条『覆盖技能根 `备忘录.html`』**不做**（`#131`／`#143` 已裁『不写固定名镜像』），老技能目录全程只读」 | `map-220-body.md:83`；老侧三份机制出处老 `memo_render.py:602-641` |
| 6 | **HELP 入口只认 1 条** | `备忘录 HELP`，不分大小写；其余 8 变体不做 | 「就 备忘录 HELP 不分大小写，其他的不需要，太复杂了」 | `map-220-body.md:41`（三条硬规矩段，用户 2026-09-12 裁定） |
| 7 | **内容口径（连带）** | HELP＝完整体，不标缺失；命令不上页面；HELP 自身唤醒词不上页面 | 「不标出 无唤醒词可以路由。我们开发help html就是那个最终功能全部实现的完整体！」／「HELP HTML的prompt中不应该出现具体的命令硬编码，只有唤醒词」／「HELP HTML 中不包括 HELP 的唤醒词场景」 | `map-220-body.md:65-66`；`t226-resolution.md:7-9` |

**结论**：`help/` 那一层、落盘目录、文件名主体这三条**都不需要再问负责人**——第 1／2 条原话已经把「落盘目录」钉在 `memo_html/`（无子层）；且磁盘实测四家已完工的兄弟目录全是扁平（第五节 C），另有并行会话的同题证据件 `t224-delivery-path-evidence.md` 独立给出同一结论。本票只需把结论写回票面。

---

## 第三节 · 真的还需要用户裁的条目（一页纸提问稿）

> 给项目负责人的**一页纸**，两条，30 秒可答完。**推荐项已写在每题里**，答「照推荐」或「要另一条」即可。
> 提交者：本票（`#224`）。答完这两条，本票即可关票，出口票（`#229`）开工。

```
【问 1／2 · 管线归属】
问：备忘录的「文件名通式＋独占落盘＋回执」这一小块，是继续各家自抄一份，还是改成走共用件？
推荐：共用件。理由：隔壁私家大厨那张图，你 2026-09-12 已经裁过同一题——原话「我们用乙（建共用件，推荐）」，
      共用件票已经开着（#237 saveHtmlFile）。备忘录是同一张流水线的第 4 家，跟着走最省事。
影响：选共用件 → 备忘录的出口票要等 #237（共用件）先落地，本图完工时间往后压一段；
      继续自抄 → 本图最快，但仓库里会留下第 4 份同样的代码，以后改命名要改四处。

【问 2／2 · 速查支的名字与参数名（小事，可照推荐）】
问：除了 HELP 文件，是否需要第二份「速查表」文件？它叫什么、用什么参数调？
推荐：要；叫「备忘录_速查表」；用参数 mode:"lookup" 调（与饼干记账一字不差）。缺省（不给参数）永远只出 HELP 文件。
影响：只影响「想一次看全部唤醒词」时的调用方式，不影响缺省交付。
```

**排序与理由**：

1. **问 1（管线归属）** 是唯一会影响本图**完工时间**与**代码质量账**的题——它是「先等共用件，还是先自抄」的取舍。
2. **问 2（速查支名字／参数名）** 纯命名与调用面，有账单先例可一字照抄；排在第二，答「照推荐」即可。

**已从「需要裁」里移出、不再问的**（理由见第二节）：落盘目录、`help/` 那一层、文件名主体、时间戳通式、缺省＝HELP 文件、固定名镜像不做。

---

## 第四节 · 出口方向相反的修法（含归票）

**症状**（票 1 实测，本席复核源码确认）：

- `packages/skill-memo-ilife/src/cli/cmd_read.ts:129`：`const db = openMemoDb(join(dbPath, 'memo'));` **在 `dispatch` 之前无条件执行**。
- `packages/skill-memo-ilife/src/fetch/db.ts:21-29`：目录不存在即 `throw new MemoFetchError('MEMO_DB_MISSING', …)`。
- ⇒ 今天**没有库就看不了帮助**（真机实测 `memo.search` 退出码 4）；「缺省＝HELP 文件」要成立，分派必须先于开库。
- 账单的对照实现：`packages/skill-bill/src/cli/cmd_read.ts:493-495`——`const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;` **在开库之前**；`:449-451` 另有一条内部断言，防 `bill.help.lookup` 走回开库分支。

**修法草案**（写给出口票 `#229`，本席只出形状，不写码）：

```
async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, …);
  const dbPath = preflight();                       // 只读环境变量，不开库（现状 :116）
  … // params 解析、memoShapeFor(key)（现状 :117-124，位置不动）

  // 新增：HELP 键在开库之前分派（照 skill-bill/src/cli/cmd_read.ts:493-495 的位置）
  //   dispatchHelp(params) 只做三件事：读 WAKE_TABLE / 渲染 HELP 全页 / 算落点初候选；
  //   它**不需要 MemoDb**——初始化横幅要的「库目录存在与否」用 statSync 直接判，不开库。
  const help = o.key === 'memo.help.lookup' ? dispatchHelp(params, dbPath) : null;

  try {
    const db = help ? null : openMemoDb(join(dbPath, 'memo'));   // 其余 10 键行为一字不变
    const data = help ? help.data : dispatch(o.key, params, db);
    …
  }
}
```

配套三点：

1. `memo.help.lookup` 登进 `src/render/envelope.ts:5-16` 的形状表（`'list'`；照 `skill-bill/src/render/envelope.ts:21`）。
2. 加一条**内部断言**（照 `skill-bill/src/cli/cmd_read.ts:449-451`）：`memo.help.lookup` 若走到 `dispatch()` 即 `fail(1, '内部错误：…须走 dispatchHelp（开库之前）')`。
3. 初始化横幅口径照 `t223-resolution.md:30`／`t226-resolution.md:8`：**「memo 库目录存在」＝已初始化**（老判法在本机实测判错——`memo.db` 是 0 字节空壳、真目录不在）。判据只用 `statSync`，不用 `openMemoDb`。

**归票**：

- **主归票 9（`#229` 出口与命名落盘）**——它的票面 `t229-body.md:23` 已把这一条列为「本票的第一件事」，且它的完成判据「真跑一次 `memo-cmd-read memo.help.lookup` 拿到落盘文件与绝对路径回执，且跑完**不建库**」（`t229-body.md:19`）**必须**靠这个顺序才能达成。
- **兼记票 8（`#228` 渲染接线）**——`#228` 出渲染入口（`renderHelpFileHtml` ＋ 落点通式件），`#229` 出分派顺序；两票的接缝就是 `dispatchHelp` 放哪。建议把「分派先于开库」这一句同时写进两张票面，避免互相等。
- **票 10（`#230` CLI 级用例）** 用它做回归锁：真 spawn、跑完断言**目录里 0 个 `.db`／`memo` 库目录**（照 `skill-bill/test/help-delivery-144.test.mjs:77-96` 的形状）。
- 地图 Notes 已把这条记成「归票 4／票 9」（`map-220-body.md:68`），本票在此**只写形状、不改地图**。

---

## 第五节 · 证据附录（文件:行号）

### A. 代码地面真相（本席只读实测）

| 断言 | 出处 |
|---|---|
| 备忘录出口在分派前无条件开库 | `packages/skill-memo-ilife/src/cli/cmd_read.ts:129` |
| 缺目录即抛 | `packages/skill-memo-ilife/src/fetch/db.ts:21-29` |
| 只有 10 条命令登记 | `packages/skill-memo-ilife/src/render/envelope.ts:5-16` |
| **`memo.help.lookup` 今天不会有形状** | `packages/skill-memo-ilife/src/render/envelope.ts:18-22`（`memoShapeFor` 未知 key 即抛） |
| 速查实现只喂构建期注入 SKILL.md 的 28 行表 | `packages/skill-memo-ilife/src/help/lookup.ts:29-38`（票面写的 `src/help/lookup.ts`；**没有** `src/render/help/lookup.ts` 这一份） |
| 备忘录**没有**落盘件（无 `output.ts`／无 `helpPaths.ts`） | `packages/skill-memo-ilife/src/` 全树实测 19 个文件，`src/help/` 只有 `index.ts`／`lookup.ts` |
| 备忘录未依赖 `base-paint` | `packages/skill-memo-ilife/package.json:23-25`（只有 `base-link-core`） |
| 账单在开库前分派 | `packages/skill-bill/src/cli/cmd_read.ts:493-495`；内部断言 `:449-451` |
| 账单三块可整块照抄 | `packages/skill-bill/src/output.ts:27-39`（`nextExclusiveCandidate`，`_N` 无则从 `_2`）／`:42-58`（`writeFileExclusiveWithRetry`，`wx` ＋ `EEXIST`）／`:72-86`（`deliverHtml`，`resolve` 绝对路径） |
| 账单落点常量 | `packages/skill-bill/src/render/helpPaths.ts:22`（`biscuit_accountant_html`）／`:28`（`LOOKUP_FILE_STEM`）／`:31-38`（本地时间戳）／`:53-54`（初候选、零 IO） |
| 账单三支显式口径 | `packages/skill-bill/src/cli/cmd_read.ts:70-78`（头注释）／`:88-111`（`mode`／`q` 互斥）／`:503-510`（`deliverHtml`） |
| 卡路里是第 1 家、自有整套 | `packages/skill-calorie/src/output.ts:27`（`HTML_DIR_NAME`）／`:159-229`（独占写＋三态交付） |
| `base-paint` 是独立包、导出 `./help-shell` | `packages/base-render/package.json`（`exports` 含 `"./help-shell": "./dist/helpShell.js"`） |
| 冻结断言现状与**行号漂移** | `tooling/check-boundaries.mjs:41`（`SKILLS_BASE_FROZEN` 含 `'skill-memo-ilife'`）——票面／报告写的 `:37` 是**上一版行号**；工作树里这张文件被**别的会话**改过（未提交，`git diff` 实测 `-4 ＋8` 行，`skill-schedule` 被移出）。本席**未修改**该文件 |
| `combo` 侧现状 | `packages/base-combos/combos.yaml:506-551`＋`:578-614`（`memo.*` 10 条）／`:116`（`calorie.help.lookup`）／全文 **0 处** `bill.`；`packages/base-combos/src/present.ts:104-113` |
| 卡路里场景页的落盘机制（内部惯例，未成文） | `packages/skill-calorie/src/cli/cmd_read.ts:827`（HELP）／`:845`（速查）——`join(SKILLS_DB_PATH,'calorie_html')`，**无** `help/` |

### B. 老技能真相源（只读）

| 断言 | 出处 |
|---|---|
| 文件名主体默认值 | 老 `D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:602`（`name="备忘录_HELP"`） |
| 老目录＝`f"{SKILL_HTML_NAME}_html"`＝`memo_html`，只有一层 | 同文件 `:25`（`SKILL_HTML_NAME = "memo"`）／`:114-121` |
| 同秒 `_N` **从 `_2` 起**、check-then-write（非原子） | 同文件 `:124-142`（`:133-140`，`n = 2` 递补） |
| 老一次出三份 | 同文件 `:622-641`（时间戳副本 `:623` ＋ 覆盖技能根 `:625-630` ＋ `--output` `:632-641`） |
| 老实物在盘文件名与递补实证 | `D:\2Study\StudyNotes\.db\memo_html\`：`备忘录_HELP_20260810_093619.html` ＋ `_2`／`_3`／`_4` |

### C. 磁盘实测（2026-09-12 本席只读列目录）

| 目录 | 文件数 | 子目录 |
|---|---|---|
| `.db\memo_html` | 190＋ | **无**（没有 `help/`） |
| `.db\schedule_html` | 3 | `help/`／`plan/`／`record/`／`replay/` |
| `.db\calorie_html` | 323 | **无** |
| `.db\biscuit_accountant_html` | 76 | **无** |
| `.db\home_manager_html` | 18 | **无** |
| `.db\CookHub` | — | 含 `help/`（`#208` 据此保留 `help/` 层） |

⇒ **`memo_html/` 今天没有 `help/` 子目录，这是硬事实**（与地图 Notes 一致）。

### D. 兄弟图既有裁决（只读）

| 断言 | 出处 |
|---|---|
| 用户在隔壁裁「乙 ＋ `saveHtmlFile`」 | `#208` 地图正文 `## 进度`「Q7 已裁（2026-09-12）」段；`#208` 采访区 Q7 第三轮逐字 |
| 共用件的形状与四态、三家迁移表、`_N` 建议从 `_1` 起 | `#237` 票面第一／二／三／四节 |
| 落盘管线在代码里实测 **2 家**（不是 3 家） | `#208` Notes「⚠️ 落盘管线的消费者实测 2 家不是 3 家（跨技能 import 0 处）」段 |
| 落盘位置改判理由（「同形」一句） | `#208` Notes「本次落盘位置已改判（用户 2026-09-12 明确）」段；`docs/skills/skill-chef/map-chef-body.md:55` |
| 作息图自己写的落点是 `schedule_html/help/` | `#197` `## Destination` 第 1 行 |
| `#147` 三条合流触发点 | `docs/skills/skill-chef/t1-bill-recipe.md:556-562`（verbatim）＋`:606-607`（甲／乙／丙三条路与代价） |

---

## 第六节 · 事实不清／矛盾（如实列，请负责人一眼判）

1. **「同形」那句话读起来自相矛盾（但结论已有独立证据，不影响判）**。
   `#208` Notes 记的理由是「与 `calorie_html/`／`biscuit_accountant_html/`／`home_manager_html/`／`memo_html/`／`schedule_html/` **同形**」，而**这五个目录里有四个今天没有 `help/` 子目录**（见第五节 C 的磁盘实测）；真正有 `help/` 的只有 `schedule_html/`（老作息自己的三层结构）与老 `CookHub/`。
   ⇒ 按这句话的字面，正确的动作是**不加** `help/`（与四个同形）；而按它的结论，是**加**。
   **但**该段同句还写着「`help/` 子目录保留」——**老 `CookHub/help/` 确实存在**（磁盘实测），所以对**大厨**而言「保留老结构 ＋ 换成 `cook_html/`」是自洽的，矛盾只出在**理由句**上。
   本席**无法从仓内证据判定**用户当时指的是「与那五个目录同形」还是「保留各技能老结构」；**这条理由句的事实归属＝事实不清**。
   **对备忘录的判不受影响**：备忘录有不依赖这句话的三条独立证据——① 本图 Destination 与 Q3=A 的用户原话逐字写扁平；② 老 `memo_render.py:114-121` 只建一层，磁盘无 `help/`；③ 四家已完工兄弟目录全扁平（并行会话证据件 `t224-delivery-path-evidence.md` 与本文第五节 C 各测一遍，结论一致）。**故本票判「不加 `help/`」，并把「同形」这句理由的矛盾如实上报备查。**

2. **票面引的 `check-boundaries.mjs:37` 今天已漂到 `:41`**，且该文件带别的会话未提交的改动（`skill-schedule` 移出）。移出 `'skill-memo-ilife'` 是**更新断言**不是解禁（地图 Notes 已写明）；本图只改这一项，`'skill-home'` 归 `#183`。本席未改该文件。

3. **`_N` 起步数有两套口径**：老备忘录实测**从 `_2` 起**（`memo_render.py:133-140` ＋ 实物），而 `#237` 建议共用件统一**从 `_1` 起**（照老家大厨 `align_08.py`）。若走乙，备忘录的产物名会从 `_2` 变 `_1`——属**行为变化**，需在出口票里明写（本席推荐：跟共用件走 `_1`，并在票面记一句「与老备忘录不同，理由＝共用件统一」）。

4. **上游事实源的一处笔误**：地图 Notes 与票面写「`src/help/lookup.ts`」时票面第 24 行写作 `src/render/envelope.ts`（对），但地图 Notes `:73` 把 `buildHelpLookup()` 的落点写成 `src/help/lookup.ts`（对）——两处都对，**唯票面 `t224-body.md:24` 未写路径**，下游照抄时注意别建成 `src/render/help/lookup.ts`（该目录不存在）。

---

## 写回票面的结论（供关票时照抄）

- **① 命名与落盘的管线归属**：推荐乙（消费共用件 `saveHtmlFile`），**待负责人裁**（第三节问 1）。
- **② 缺省出口口径**：**缺省＝HELP 文件**（用户原话已定案，第二节第 4 条），速查走显式参数 `mode:"lookup"`／`q`／`--html`。
- **落盘目录**：`<SKILLS_DB_PATH>/memo_html/`，**不加** `help/` 层（用户原话已定案，第二节第 1／2 条）。
- **文件名主体**：`备忘录_HELP`；通式 `备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`。
- **速查支产物名**：`备忘录_速查表`；**显式参数名**：`mode:"lookup"`（速查表文件）／`q`（现找不落盘）／`--html`（覆盖写）。
- **`combo` 侧**：**不登记**（先例：账单／居家／作息／大厨全都没登记）。
- **出口方向相反**：分派先于开库，**归票 9（`#229`）**，兼记票 8；把形状写进两张票面（第四节）。
