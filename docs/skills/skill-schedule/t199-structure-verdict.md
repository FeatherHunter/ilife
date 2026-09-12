# t199 结构裁定：5 个能力目录 ＋ 共用位 ＋ 边界门 ＋ 就地摆正范围

> 票：[#199](https://github.com/FeatherHunter/ilife/issues/199)（作息管家HELP 2/10，`wayfinder:grilling`）· 2026-09-12
> 本文是**必报五步第一步（影响清单）与第二步（结构设计）**的成文。本票只出决定、不动代码；改动由序 3 `#200`／序 5 `#202`／序 6 `#203` 照着做。
> 事实出处一律指 `docs/skills/skill-schedule/t199-evidence.md`（下称「证据」）的章节号或 `文件:行号`；查不到的写「查不到」。判据 `docs/agents/structure.md`，用词 `docs/agents/wording.md`。

## 一句话结论

HELP 这一件事（速查、内容资产、渲染接线、命名落盘）住既有的 `src/help/`（技能级入口），它要用的一份共用件搬进 `src/shared/`；五个能力目录 `write`／`query`／`plan`／`analyze`／`admin` 的**名字与各自装什么今天定死**，但**目录与该目录的第一件东西同时建** —— 实测今天这五个目录里一件属于自己的代码都没有（全在 `cli/`／`policy/`／`fetch/`／`render/` 的存量里，按用户 Q15=A 属「未定」），所以本图不建只有目录名的占位，只建 `src/shared/` 与 `src/help/` 里的新件。

## 影响清单（必报五步·第一步）

| 目录／文件 | 本图处置 | 一句话理由 |
| --- | --- | --- |
| `write`（写入与同步） | 不建目录、不搬码 | 该能力的代码＝`schedule.record.write` 的分派（`cmd_read.ts:92-107`）＋写前校验与写库（`policy/record.ts`／`fetch/db.ts`），全属「未定」；证据 `:47` 那 13 件里没有一件属于它 |
| `query`（查询与浏览） | 不建目录、不搬码 | 代码＝`schedule.record.today/range/detail`（`cmd_read.ts:70-91`）、`schedule.plan.today`（`:148-166`）与四个页装配（`views.ts:26/39/56/153`），属「未定」 |
| `plan`（日程与计划） | 不建目录、不搬码 | 代码＝`schedule.plan.write`（`cmd_read.ts:167-238`）＋`views.ts:157`＋飞书同步（`fetch/feishu.ts`），属「未定」 |
| `analyze`（分析与洞察） | 不建目录、不搬码 | 代码＝`schedule.record.compare`（`cmd_read.ts:108-147`）＋`views.ts:72/109/122`＋`policy/category.ts`，属「未定」 |
| `admin`（辅助与管理） | 不建目录、不搬码（今天最空） | 旧 HELP 三条子功能在新仓没有独立命令：飞书探测在 `schedule.plan.write` 的 `op=sync`，初始化在开库时自动（`fetch/db.ts`），首次使用无代码 |
| `src/help/` 新增 `helpFile.ts`（`#202`）／`helpPaths.ts`＋`output.ts`（`#203`） | 新增 | 理由：HELP 横跨全部五个能力（85 场景覆盖五组），塞进任一个能力目录会让其余四组反向依赖它；它今天已是既有目录（`src/index.ts:5` 的转发） |
| `src/shared/` 搬入 `templateFill.ts`（`#200`） | 新增＋改 `render/html.ts` | 理由：属共用件 —— `write` 的回执页与 `query` 的查询页都经 `cli/cmd_read.ts:286` 用它，见 §② |
| `src/cli/cmd_read.ts` | 改 help 分支与 `--html` 落盘（`#202`／`#203`） | 理由：出口只有一条、服务 8 条命令，不属任何单一能力 |
| `package.json` | `dependencies` 加 `base-paint: ^0.3.0`（`#202`） | 理由：依赖声明不是能力目录里的件 |
| `tooling/check-boundaries.mjs` | 本图不改（名单已在位） | 理由见 §③ |

对账口径（`structure.md:80-83`）：前五行每行只指向一个能力目录；后五行各写了理由（技能级入口／共用件／出口／依赖声明／工具）。五个能力目录本图一行都不碰，故第五步对账的偏差为零。

## 结构设计（必报五步·第二步）

```
packages/skill-schedule/
├─ src/
│  ├─ index.ts                    包入口（不动；四条 export * 里 help 一条保持不变）
│  ├─ help/                       ← 技能级入口：HELP 这一件事
│  │  ├─ index.ts                 门（今天 2 行，只转发 lookup.ts；今天不加导出行）
│  │  ├─ lookup.ts                速查：唤醒词表 → HELP 行
│  │  ├─ scenes/help-assets.ts    #201 内容资产（生成物，单源单份，禁手改词）
│  │  ├─ helpFile.ts              #202 新增：零 IO，内容资产 → 共享 help 模板全页
│  │  ├─ helpPaths.ts             #203 新增：零 IO，落点通式
│  │  └─ output.ts                #203 新增：独占创建 ＋ 同秒递补 ＋ 交付回执
│  ├─ shared/                     ← 共用位（与能力目录并列，里面不出现任何能力名）
│  │  └─ templateFill.ts          #200 搬入：标记填充 ＋ 共享样式／脚本（字节零改）
│  ├─ write/  query/  plan/  analyze/  admin/     能力目录（本图不建占位目录，见 §①）
│  ├─ cli/cmd_read.ts             唯一出口（本图改两处）
│  ├─ fetch/  policy/  render/    旧工种目录：内容不重排，进「未定」
│  └─ templates/*.html            页面模板（不在结构纪律管辖内，`structure.md:9`）
```

| 文件 | 职责（一句） | 对外给什么（个数／各一句） |
| --- | --- | --- |
| `src/help/index.ts` | HELP 目录的门 | 3：`buildHelpLookup`／`lookupHelp`／`HelpHit`（今天不动） |
| `src/help/lookup.ts` | 唤醒词表 → 速查行 | 3：同门（今天不动） |
| `src/help/scenes/help-assets.ts` | 内容资产（机器生成） | 10：5 类型／1 联合／4 常量，`HELP_GROUPS` 就是模板要的 `groups`（今天不开出口，触发条件见后文） |
| `src/help/helpFile.ts`（新） | 内容 → 全页 HTML，零 IO | 计划 3：① 文件名主体常量；② 五个必需项 ＋ 三块可选的内容装配；③ 转发共享模板的渲染（`#202` 第一步报实数，上限 5） |
| `src/help/helpPaths.ts`（新） | 落点通式，零 IO | 计划 2：① `schedule_html/help/` 子目录名；② 文件名与目标路径的初候选 |
| `src/help/output.ts`（新） | 把页交付成文件 | 计划 2：① 独占创建 ＋ 同名递补；② 交付回执（绝对路径） |
| `src/shared/templateFill.ts`（新） | 共享标记填充 | 3：`SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`（三个标记常量改为文件内自用，全仓零外部消费者） |
| `src/render/html.ts`（改） | envelope 片段渲染与体积门 | 5：`SCHEDULE_HTML_MAX_BYTES`／`escapeHtml`／`renderEnvelopeHtml`／`estimateBytes`／`assertHtmlSize`（减完正好到线内） |
| `src/render/index.ts`（改） | 目录门 | 照旧转发，其中 3 条改指 `../shared/templateFill.js`；理由：快照门读 `dist/render/index.js`（`tooling/skill-html-snapshot.mjs:134`） |
| `src/cli/cmd_read.ts` | 唯一出口 | 0（可执行文件，`bin` 入口） |

共用件被哪两个能力用（`structure.md:67`）：`shared/templateFill.ts` 被**写入与同步（`write`）**的记作息回执页与**查询与浏览（`query`）**的查询页在用 —— 两页走同一个调用点 `cmd_read.ts:286`（8 条命令一视同仁，`templates/*.html` 各 16 行同形，证据 `:35`）。

## 六件事逐条裁定

### ① 五个能力目录各装什么、文件怎么分、每个文件对外给什么

**裁定：名字与「装什么」今天定死；目录与该目录的第一件东西同时建。** 每个目录的第一件东西＝该能力的命令代码（分派 ＋ 校验 ＋ 取数 ＋ 页装配 ＋ 模板映射），今天散在 `cli/`／`policy/`／`fetch/`／`render/`／`templates/` 里；文件名取自**现成说法**：命令段与它下面的操作码（`today`／`range`／`detail`／`write`／`compare`／`plan.today`／`plan.write` 与 `add`／`amend`／`summary`／`preview`／`upsert`／`ensure`／`update`／`deactivate`／`review`／`sync`／`months`／`ranges`／`category`／`anomaly`），不许自创（铁律四）。每目录上限 5 个导出，随各票第一步报。

**代价（可见）**：本图与用户 Q13=A 的字面差一步 —— A 要的是「一次把形状定全、后续域有位置」，这一条本文达成了（名字、每目录装什么、文件名取哪一级的话都定死）；但「今天就把五个目录建出来」做不到，因为建空目录在 git 里留不下，也不服务任何交付。要照字面今天就看见五个目录，代价＝往每个目录塞一件今天没有消费者的件（实测无源可塞）→ 列进待确认项第 1 条。

**一条留给后面裁的**：命令命名空间（`record.*`／`plan.*`）与旧 HELP 的五个一级分组**不是同一刀** —— `plan.today` 那三条子功能（查日程／24h 概览／查多日计划）在旧 HELP 里归「查询与浏览」，命令名却带 `plan`（`help-assets.ts:773` 的 `#12 查日程` 落在 `query` 组里；分派在 `cmd_read.ts:148`）。按 HELP 分组切这批代码会得出一批念不顺的文件名，故本图不切。这条留给「整包重排」那张票裁，本图只记事实。

文件怎么分，用现成的命令名与操作码说得出来（下表就是每目录将来第一件东西的骨架；每目录 ≤5 个导出，实数随各票第一步报）：

| 能力目录 | 归它的命令（`render/envelope.ts:5-14`） | 文件按操作码分（现成类型名：`RecordWriteOp`／`PlanWriteOp`／`CompareKind`） |
| --- | --- | --- |
| `write` | `schedule.record.write` | `add`／`amend`／`summary` |
| `query` | `schedule.record.today`／`record.range`／`record.detail`／`plan.today` | `today`／`range`／`detail`／`plan-today` |
| `plan` | `schedule.plan.write` | `preview`／`upsert`／`ensure`／`update`／`deactivate`／`review`／`sync` |
| `analyze` | `schedule.record.compare` | `months`／`ranges`／`category`／`anomaly` |
| `admin` | 今天没有自己的命令（旧三条子功能被别的命令吸收） | 一个文件都还没有；将来按旧子功能（飞书探测／初始化数据库／首次使用）分 |

### ② 共用位摆哪、被哪两个能力用

**裁定**：共用位＝`packages/skill-schedule/src/shared/`（与能力目录并列，里面不出现任何一个能力的名字）。第一件共用件＝`shared/templateFill.ts`，从 `src/render/html.ts:62-78` 原样搬入**（字节零改）**：三个标记常量 ＋ `SHARED_CSS` ＋ `SHARED_HELPERS` ＋ `fillTemplate`。用它的两个能力：`write`（记作息的回执页）与 `query`（查作息／查日程的页），调用点 `cmd_read.ts:286`。

**代价**：一次搬运 ＋ `render/index.ts` 三条转发改指向；`dist/render/index.js` 的公开面**少 3 个标记常量名**（`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`CONTENT_MARKER`，与结构设计表「三个标记常量改为文件内自用」一致），其余不变，快照门仍逐件绿。**实测依据**：这三个名字在 `packages/skill-schedule` 包内**零消费者**（grep 只命中 `src/shared/templateFill.ts:5-7` 的定义与同文件 `:13`／`:19-21` 的自用），全仓其它技能（`skill-bill`／`skill-chef`／`skill-home`／`skill-memo-ilife`）各自在自家 `src/render/html.ts` 定义同名常量、**不引用本包**，`dist/render/index.js` 源面 **36 → 33**、**少且仅少这 3 名**（无新增），且**无门依赖它们**（`tooling/skill-html-snapshot.mjs:179-187` 只读 `SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`，边界门不读本包导出，包内测试只读 `fillTemplate`）。**副作用（已核实）**：快照里 `schedule/shared-css`／`shared-helpers` 两条的 `src` 标签写字面量 `src/render/html.ts`（`tooling/skill-html-snapshot.mjs:136`），搬完这个标签会陈旧 —— 比对面只吃文本 sha256（同文件 `:258-272`），不读 `src`，所以门不受影响，属人看的一句话陈旧，随该文件下一次改动一并更正。

### ③ `tooling/check-boundaries.mjs` 的名单怎么改（含注释出处）

**裁定：保留工作树里那处改动，`#200` 不再重复改它。** 现状（`git diff -- tooling/check-boundaries.mjs`）：注释块 `:30-40` 改写、`:41` 的名单由 4 名变 3 名 `['skill-chef','skill-home','skill-memo-ilife']`；断言实现一行未动（证据 `:158`），脚本跑出 11 行 OK、`boundaries: PASS`、退出码 0（证据 `:164-179`），行为面兜底仍在（`:20` 记快照门仍逐件钉 schedule 的 185 件）。

**注释出处已由本文件写出来**：`tooling/check-boundaries.mjs:38` 引的 `docs/skills/skill-schedule/t199-structure-verdict.md` 今天**已经存在**（就是本文），此前那条悬空引用（审查 C 缺陷 5）到此解除；`#200` 只需把它与本文一起提交，不要为它再写第二句。

**代价**：移出后被放宽的是总覆盖面（少扫一个包：`skill-schedule` 的源码与 `templates/*.html` 不再查 base-*），其余三名的判据与覆盖目录一字未改；今天 `skill-schedule` 里本来也没有任何 `base-paint`／`base-render` 的 import（证据 `:160`），真正接上要等 `#202`。

### ④ `src/render/html.ts` 的第二份 `SHARED_CSS`／`SHARED_HELPERS` 怎么处置

**事实先摆正**（证据 `:124-138`）：这份 419 字符的小样式表与 `skill-home` **逐字符相同**，`bill`／`chef` 各是 440 字符（只差一条 `.amt`），四家都**不是** base 层正本（base 层的 `buildStyleSheet().css` 是 21286 字符的另一套）；`SHARED_HELPERS`（145 字符）四家逐字相同。它是老家离线页面那份小样式表的**四份拷贝**，跨技能合并的正主在公共层。

**裁定：字节不动、使用点不动、只把定义地收进共用位。** 即 `SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`／三个标记常量签进 `shared/templateFill.ts`；`render/html.ts` 只留 envelope 片段渲染与体积门（5 件）。**不删、不换**成公共层的 `buildStyleSheet()` —— 那份是另一套（21286 字符、给新页面格式用），换它要改 8 条命令 `--html` 页的外观，触发 185 件快照门重写，与本次交付无关。

**一件事必须写清（防后来人误连）**：这份拷贝服务的是 8 条命令的**技能页面**（`--html` 那个 `templates/*.html` 支路）；**HELP 页不读它** —— HELP 交付走 `base-paint/help-shell` 的完整模板，两者不是同一件东西。

**代价**：四份拷贝今天仍各自存在，跨技能去重出本图（登记为「未定」，正主应落公共层：`packages/base-render/src/` 今天**查不到**这份小样式表）；本图只保证它在本包内是「一处定义、共用位住」。

### ⑤ 就地摆正的边界：本图摆正 13 件，其余进「未定」

13 件＝证据 `:47` 那一行（判据甲「内容属 HELP 这件事」／乙「在 `schedule.help.lookup` 这条出口的调用链上」）。

| 件 | 本图处置 | 一句理由 |
| --- | --- | --- |
| `src/help/index.ts` | 不动 | 今天 2 行、只转发 `lookup.ts`；加导出行的事见「内容资产与出口的落位」 |
| `src/help/lookup.ts` | 不动 | 速查唯一上游，出口链上原样可用 |
| `src/policy/wakewords.ts` | 不动 | HELP 四条唤醒词与全表同住一处；按能力切会与命令命名空间打架（见 §①） |
| `src/policy/index.ts` | 不动 | `lookup.ts:2` 从它取 `WAKE_TABLE`，是目录门 |
| `src/render/views.ts` | 不动 | `HelpItem`／`HELP_EMPTY_HINT`／`buildHelpItems`（`:163-169`）今天够用；同文件的其余装配属「未定」 |
| `src/render/templates.ts` | 不动 | `help` 一条映射（`:15`／`:29`）留在原处；模板映射的重排随整包 |
| `src/render/html.ts` | **改** | 共用件签出（§④）：11 件减到 5 件，落回铁律五的 5 件以内 |
| `src/render/envelope.ts` | 不动 | `'schedule.help.lookup': 'list'`（`:13`）一条即可 |
| `src/render/index.ts` | **改** | 三条转发改指 `shared/templateFill.js`，其余照旧 |
| `src/render/errors.ts` | 不动 | `html.ts:3` 引它；错误类型一处定义 |
| `src/cli/cmd_read.ts` | **改** | help 分支（`:239-243`）与 `--html` 落盘（`:284-294`）是出口该管的 |
| `src/index.ts` | 不动 | 四条转发照旧；HELP 面的门是 `help/index.ts` |
| `templates/help.html` | 不动（本图不裁） | 页面模板不在结构纪律管辖；缺省出口改走共享模板后这条支路要不要留，由 `#203` 裁 |

**进「未定」的**（本图不重排）：`fetch/` 5 件、`policy/` 的 `record.ts`／`plan.ts`／`category.ts`／`routing.ts` 4 件、`templates/` 除 `help.html` 外 7 件（证据 `:49`）。另记一条候选：`src/fetch/paths.ts` 今天两条判据都不满足，但目的地的落点根 `<SKILLS_DB_PATH>` 要用它取（证据 `:49` 末句）—— 若 `#203` 从它取，它进「相邻」不进「存量」。

### ⑥ 旧实体目录的去留与本图的关系

| 目录 | 本图关系 | 去留 |
| --- | --- | --- |
| `cli/` | 改 `cmd_read.ts` 的 help 分支与落盘那一段 | 留。出口职责（argv／环境变量／stdout envelope／落盘）不属任何单一能力；306 行未超线（证据 `:253`）。要不要拆或改名＝「未定」 |
| `fetch/` | 不碰 | 留、未定（5 件）。`feishu.ts` 的飞书探测与 `db.ts` 的开库建表是 `admin` 与 `plan` 将来的件，随整包搬 |
| `policy/` | 不碰 | 留、未定（4 件）。`wakewords.ts` 与 `index.ts` 属「相邻」，见 §⑤ |
| `render/` | 只把 `html.ts` 的共用件签出 | 留、未定。`views.ts`／`envelope.ts`／`templates.ts`／`errors.ts`／`index.ts` 原地不动；`render/` 整体何时按域重排＝「未定」 |
| `templates/` | 不碰 | 不在结构纪律管辖（`structure.md:9`）；`help.html` 的归宿由 `#203` 定 |
| `src/help/scenes/` | 不动 | `help/` 目录内部的一层，不出目录的不必对外给（`structure.md:96`） |

### ⑦ 五个能力目录「与第一件东西同时建」怎么判定

维护者已认可这条：`write`／`query`／`plan`／`analyze`／`admin` 五个能力目录**不在空的时候建**（今天它们一件属于自己的代码都没有，git 也留不下空目录），而是在写新代码时**直接落进目标目录**；HELP 相邻的存量随签出归位。写成可判定的三条：

| 判据 | 内容 | 怎么查 |
| --- | --- | --- |
| 甲 · 同时建 | 某个能力目录的**第一次出现**，必须与它的**第一件真实代码**在**同一次提交**里 | 取该目录第一次出现的提交（`git log --diff-filter=A -- packages/skill-schedule/src/<能力名>/`），看这一次提交里有没有该能力的本业代码，即命令分派／校验／取数／页装配／模板映射那一类；只有目录本身也算不成立 |
| 乙 · 禁占位 | 不许建空目录，也不许建只放 `.gitkeep` 或占位文件的目录 | `git ls-tree -r HEAD -- packages/skill-schedule/src/<能力名>/` 的输出里，除本业代码外不许只有 `.gitkeep`／占位件 |
| 丙 · 不预建 | 不为「先把形状摆出来」预建任一能力目录 | 直接看甲、乙两条的查询结果 |

不成立的样子：先建 `src/write/` 空目录再等代码来；用 `.gitkeep` 把目录钉住；把不属于该能力的存量先搬进去凑数。

**由哪张票落地**：结构就位票 `#200` **已交付**（`t200-structure-build.md`，工作树未提交），它按裁定**未建**这五个目录，第五步对账「五个能力目录不建」一行偏差为零；后续**新增代码落进目标目录**的活归渲染接线票 `#202`（`help/helpFile.ts` 一类新件）与出口票 `#203`（`help/helpPaths.ts`／`help/output.ts`）。今天这五个目录**一件都没有**，所以第一条判据今天无从违反，只有真去建目录的时候才生效。

## 消费共享 help 模板的技术路线

**照 bill 的成熟先例（逐字同构）**，四步（证据 `:98-118`）：

1. **依赖**：`packages/skill-schedule/package.json` 的 `dependencies` 加 `base-paint: ^0.3.0`（bill `:24-27`、calorie `:21-23` 同款）。
2. **新代码住哪**：`src/help/helpFile.ts`（技能级入口，零 IO 纯函数）；`import { renderHelpShellHtml } from 'base-paint/help-shell';` —— 与 bill `src/render/helpFile.ts:19` 同一行形状，只传自家五个必需项（`skill_name`／`title`／`subtitle`／`contact`／`groups`）＋ 三块可选（`meta_blocks`／`version`／`init_banner`）。
3. **不自持模板副本**：模板源恒在 `packages/base-render/assets/help-template.html`（不进包：base 的 `files` 只有 `dist`），**模板资产不随本包分发**；构建脚本无复制步骤（bill／calorie 的 `scripts/build-help.mjs` 只重写 `SKILL.md` 标记块）。
4. **落盘另建管线**：`help/helpPaths.ts` ＋ `help/output.ts`（照 bill 的 `render/helpPaths.ts` ＋ `output.ts` 最小管线，`#203` 落）。

**已知风险（实测，不是推测）**：只吃发布态的 `exports`，**构建后才可用**（消费 `dist/helpShell.js`）；registry 上的 `base-paint@0.3.0`（2026-09-10 14:06 发布）**不含** `./help-shell`，该子路径是同日 17:33 的 `21ef322` 才登记的 → 真安装态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`。这条已在地图 #197 的 Out of scope 登记为「发布到 npm」那张票（抬版本 ＋ 真装验证），本图不处理。

## 内容资产与出口的落位

- **归属与职责**：`#201` 的资产住 `src/help/scenes/help-assets.ts`（2185 行，机器生成，5 分组／34 唤醒词／85 场景，禁手改词），归属 `src/help/` 这个技能级入口，职责＝HELP 页唯一内容源；`HELP_GROUPS` 就是共享模板要的 `groups` 参数（三层：分组 → 唤醒词 → 场景）。**单源单份，不按五个能力目录拆**（拆成五份会让每份各自带样板与摘要锁，更繁琐）。
- **出口的触发条件（今天不加导出行）**：今天全仓零消费者，包内消费者一律走相对路径（bill 先例 `src/render/helpFile.ts:20` 直接 `../triggers/wake-assets.js`，同包 0 行改动）；加 `src/help/index.ts` 一行会经 `src/index.ts:5` 的 `export *` 顶到包根公开面，违反铁律五（接口小）。**何时才加**：出现跨包消费者时（最可能是插件侧 `#206` 或分发面 `#205`）由那张票加，并**连 `package.json` 的 `exports` 一起做**（今天 `exports` 里没有 `./help` 子路径，只加门那一行，包外仍取不到）。
- **`#202` 将来怎么消费**：同包相对路径 `import { HELP_GROUPS, HELP_TOTALS } from './scenes/help-assets.js';`（同目录内的下一层），不经任何门；`HELP_SCENE_RESULTS`（85 条）与 `HELP_GROUP_NOTES`（5 条）这两张伴随表今天没有任何出口，`#202` 要么把它们接进 `meta_blocks`，要么由用户明确裁定不显示 —— 审查 B 已把它标成「不许就此收工」的下游风险。

## 标准提改建议（待维护者裁决）

工作树里 `docs/agents/structure.md` 被加过两条（现 `:68`／`:69`），审查 C 判**越界 ＋ 无据**（票面写明「只出决定，不动代码」，票零评论、裁定文档不存在）。**本图不替它改那份文档**，把两条收在这里，逐条改完再报维护者。

**维护者裁定：撤回。** 那两条新条款（「技能级入口」「共用位的名字」）**已从 `docs/agents/structure.md` 删除**，该文件已回到 `HEAD` 的那份内容（`git diff -- docs/agents/structure.md` 为空）；它们的内容以**本文件的建议稿**形式保留，`docs/agents/structure.md` 今天不含这两条；若要进全仓标准，须由维护者另行裁决（分层表 `docs/agents/structure.md:115-117`：结构标准＝维护者，AI 报理由后可提改）。下面五项是相应修正：

1. **技能级入口条（原 `:68`）**：删掉误引句（原文「`src/` 根上放共用文件会让『第一层必须是有名字的东西』这条查不动」——文档里没有这句；`:64` 原文是「`src/` 下第一层必须是能力名，不能是工种名」）；删掉无据例子（「HELP 数据里自成一类，例：`help`」——旧 HELP 一级分组实测是 `write`／`query`／`plan`／`analyze`／`admin` 五个，`help` 不在其中，全仓 grep `id: "help"` 命中 0）。
2. **四张图撞同一问**：如实写「**部分有据**」——居家 `docs/skills/skill-home/t195-body.md:14` 与备忘 `docs/skills/skill-memo-ilife/t225-body.md:8` 是票面原话的同一问；作息只有决策页 `docs/skills/skill-schedule/决策待确认-作息管家HELP.html:179` 的相邻表述；私家大厨只有 `docs/skills/skill-chef/t3-template-contract.md:680`（其表格 `:682-686`）的相邻表述。**逐条复核过**：大厨那张图的真出处是 `t3-template-contract.md:678`（票 6 第一／二步「必须先报…拿用户点头」）与 `:680`「新增件该住哪几个目录（候选＋代价，不定案）」；`t3-template-contract.md:682` 只是那张候选表的表头行，原稿引它不对；原稿引的 `map-chef-body.md:50` 讲的是「私家大厨是全库唯一没迁过通用模板的技能」，与这一问无关，大厨地图里对应的记录是 `map-chef-body.md:26`（结构设计闸门票 `#236`）与 `:141`（共用件的包名与落点）。
3. **`shared/` 的效力来源**：来自「用户裁定代码目录一律用英文名 ＋ 与能力目录并列」，**不来自铁律四** —— 铁律四禁的 `common` 与 `shared` 同类，且 `docs/skills/skill-calorie/t179-180-structure-design.md:32` 自己记着「`docs/agents/structure.md:44-49` 待同批改」，那句**今天没做**。故 `shared/` 定为全仓名字这件事要维护者裁；本包今天只按「与能力目录并列、里面不出现能力名、写得出哪两个能力在用」用它。
4. **明确标注待维护者裁决**：`docs/agents/structure.md:115-117` 的分层表写着「结构标准＝维护者；AI 报理由后可提改」。这两条属结构标准，不是 AI 能自己写进去的。
5. **本图另提一条**（同属待裁，不写进文档）：HELP 这类横跨全部能力的件（本包 `src/help/`）今天**没有**条文可依 —— 铁律四只把能力目录名锚在 HELP 一级分组上，而 `help` 不是那五组里的词。仓内现成依据只有卡路里先例（`t179-180-structure-design.md:96`：技能级查找入口不挪）。这条要么进结构标准，要么由维护者另裁。

## 待用户确认项

1. **五个能力目录的建法**：本图只定名字与内容，**目录与该目录的第一件东西同时建**（可判定判据见 §⑦）；不建占位目录（空目录 git 留不下）——与 Q13=A 的字面差一步；要照字面今天就建，请说明（代价见 §①）。
2. **结构形状**：HELP 这一件事住 `src/help/`（技能级入口），共用件住 `src/shared/`，其余四个工种目录的存量进「未定」。
3. **共用位的第一件**：把 `SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate` 搬进 `shared/templateFill.ts`（字节零改、页面外观零变、快照门不变）。
4. **`structure.md` 那两条**：维护者已裁定**撤回**——那两条新条款已从 `docs/agents/structure.md` 删除，该文件回到 `HEAD`；内容以本文件的建议稿保留，进全仓标准须维护者另行裁决（见「标准提改建议」）。
5. **边界门**：保留工作树里已做的名单改动（移出 `skill-schedule`，剩 3 名），注释引的那份文档已由本文写出。

## 已知风险与不做的事

- **二级组 id 位置派生**：`HELP_GROUPS` 的二级组 id 是「一级组 id ＋ 序号」（`gen-help-assets.mjs:205` 的 `c.key + '_' + (i + 1)`，产物里 `write_1` … `admin_3`），与 `skill-calorie/src/render/helpCenter.ts:206` 同约定。**重排分组或唤醒词次序会让 id 错位**；今天全仓没有读它的地方（渲染只读 `label`／`scenes`），故本图不改，只记事实：将来谁要动次序，先看这一条。
- **`pnpm -C packages/skill-schedule test` 今天红**：跑的是 `../../test/scaffold.test.mjs` 的快照用例，失败输入只有三件（`packages/ilife-skills/package.json` 的 version、`base-combos/combos.yaml`、`base-combos/src/present.ts`，`tooling/write-snapshot.mjs:13-18`）；本图任何文件都不在里面，归因是**别的会话在途改动**（`git status` 里那两件开工前就是 `M`）。同文件里管边界门的那条用例是**通过**的（证据 `:272-290`）。本图不修这条红。
- **包内没有 `gen:help-assets` 入口，`test` script 只指向 `../../test/scaffold.test.mjs`**：`pnpm -C packages/skill-schedule test` 因此跑不到包内新用例（证据 `:261`；今天要用 `node --test packages/skill-schedule/test/*.test.mjs`，42／42 绿）。归 `#201` 整改，不在本图。（成稿时工作树里这条已被别的会话临时补上 `test/*.test.mjs`，未提交；`gen:help-assets` 入口仍缺。）
- **本包没有文件行数告警线**（`packages/` 下 `AGENTS.md` 数量＝0，`package.json`／`SKILL.md` 都没有该字段，证据 `:243-255`）。要不要按兄弟图取 350＋LF、写在哪，本图不定；只报事实：若取 350，存量里只有 `src/fetch/db.ts`（440 行）超线（生成的资产与 `scripts/` 不在此列）。
- **不做的事**：不拆内容资产、不改 `src/help/index.ts` 的导出行、不删 `SHARED_CSS`／`SHARED_HELPERS`、不重排 `fetch/`＋`policy/`＋`render/` 的其余存量、不碰 `docs/agents/structure.md`（维护者已裁定撤回其工作树里的两条新增，该文件已回到 `HEAD`）、不 commit／push／add。
