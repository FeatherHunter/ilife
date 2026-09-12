# t221 · 饼干记账 HELP 交付实现逐件读懂 → 备忘录照抄清单

> 票：`#221`（地图 `#220`「备忘录HELP真标准」票 1，research）。
> 只读调查：**未改任何源码**、未 `git add`／未提交、未动 GitHub issue；唯一新建文件＝本文件。
> 事实出处一律「仓内路径:行号」；写法照 `docs/agents/wording.md`（写「共享 help 模板」不写「壳」；`memo.help.lookup` 这类一律叫「命令」）。仓外只读路径照抄原文，未改动。
> 本票**不出决定**：命名落盘管线归属与缺省出口口径归票 4（`#224`）；内容资产对账归票 2（`#222`）；通用 help 模板注入契约与备忘录专属取值归票 3（`#223`）。

## 0. 复核兄弟图报告（`#183` 票 1 的产物）＋ 本席读的是哪个文件

- **实读文件**：`docs/skills/skill-home/t184-bill-recipe.md`（96 行，**文件名未变**，与 `#221` 票面写的路径逐字一致；同目录另有 `t184-body.md`／`t184-resolution.md`，本席未读）。读的是**当前工作区内容**，且 `git status --porcelain` 实测该文件 `clean`（`git status` 输出无该路径），故行号与 HEAD 一致。
- **复核时刻**：HEAD＝`60ba041`（`master`），工作区另有 51 项并发改动，但本报告引用的**全部**仓内文件实测 `clean`（逐件查过 `git status --porcelain`：`skill-bill` 全包、`base-render` 三件、`tooling` 两件、`skill-memo-ilife` 全包、`plugin-bill-ilife/src/skill-provider.ts` 均未改动）→ 本报告的行号锚点与兄弟图的行号锚点**可比**。

### 0.1 结论仍成立的（逐条抽验，全部实测命中）

| 兄弟图原话 | 抽验结果 |
|---|---|
| `src/render/helpFile.ts` 182 行 | ✅ 实测 182 行 |
| `src/render/helpPaths.ts` 55 行 | ✅ 55 行 |
| `src/output.ts` 86 行 | ✅ 86 行 |
| `src/triggers/wake-assets.ts` 986 行 | ✅ 986 行 |
| `scripts/gen-wake-assets.mjs` 254 行 | ✅ 254 行 |
| `src/cli/cmd_read.ts` 526 行 | ✅ 526 行 |
| `base-render/src/helpShell.ts` 83 行 | ✅ 83 行 |
| `test/help-delivery-144.test.mjs` 146 行／`:22-28`／`:48-58`／`:60-74`／`:77-96`／`:94-95`／`:134-145` | ✅ 146 行，六处行号逐条命中 |
| `test/help-exit-148.test.mjs` 171 行／`:14`／`:79`／`:95-97`／`:123-129`／`:152-171` | ✅ 171 行；`:14` 确为 `import { HELP_SHELL_DATA_OPEN, … } from 'base-paint/help-shell'`；`:95-97` 前后缀逐字＋标题槽不得留占位；`:79` 断言回执六项序 `['version','skill','shape','key','data','delivery']`；`:123-129` 只断言同秒各次槽位互不相同且必有一次拿本体名；`:152-171` 参数与退出码矩阵＋失败时 stdout 空 |
| `test/wake-assets.test.mjs` 93 行 | ✅ 93 行 |
| `plugin-bill-ilife/src/skill-provider.ts` 128 行 | ✅ 128 行 |
| `skill-bill/package.json:24-27`（`base-paint ^0.3.0`）／`:33`（`gen:wake-assets`） | ✅ 逐字命中（实为 `dependencies` 在 `:24-27`、`gen:wake-assets` 在 `:33`） |
| `base-render/package.json:25-26`（`gen:help-shell`／`--check`） | ✅ 命中 |
| `helpShell.ts:73-80`／`:83`／`:42`／`:45`／`:66-70` | ✅ 全部命中 |
| `help-template.html:1650-1654`（运行时读 `subtitle`／`meta_blocks`／`init_banner`／`contact`／`version`） | ✅ 实为 `:1650 SUBTITLE`／`:1651 META_BLOCKS`／`:1652 INIT_BANNER`／`:1653 CONTACT`／`:1654 SKILL_VERSION` |
| `help-template.html:1698`（`TYPE_DEFAULT`）／`:1775`（`INIT_BANNER.hidden`） | ✅ 命中 |
| `gen-wake-assets.mjs:109-115`（徽章词五词表断言） | ✅ 命中 |
| `check-boundaries.mjs:37`（`SKILLS_BASE_FROZEN`）／`:39-60` | ✅ `:37` 名单为 `['skill-chef','skill-home','skill-schedule','skill-memo-ilife']`（含 `skill-memo-ilife`），`:39-44` 查依赖闭包、`:45-60` 扫源码与模板 |
| `skill-html-snapshot.mjs:43-48` | ✅ 实为 `:43-49` 的 `SKILLS` 清单，`memo` 条目在 `:48`（`fill: 'fillSharedMarkers'`） |
| 账单 `scripts/build-help.mjs:34-37`（保检出换行）／备忘录那份 `:28` 直接拼 `'\n'` | ✅ 两条都命中 |
| 反例行号：`skill-calorie/src/output.ts:58`／`:88`／`:184`／`:189`／`:239`／`:257`／`:272`／`:284` | ✅ 八处逐条命中 |

### 0.2 需要更正／补充的（三处）

1. **兄弟图 §0 的件清单对三笔提交漏件**（sha 本身没错，见 §4）：`#146` 漏 1 件、`#145` 漏 3 件、`#144` 漏 3 件。
2. **兄弟图陷阱 18 的后半句不成立**：「仓内既有 `dist` 是提交进来的」——实测 `.gitignore` 含 `packages/*/dist/`，且 `git ls-files '*dist*'` 返回 **0 件**。`dist` 只是**已经构建在盘上**（`packages/skill-memo-ilife/dist/` 等确实存在），不是被提交的。「改源码要重跑构建再跑测试」这条仍然成立。
3. **六笔之后还有一笔相关提交**：`c95892d`（2026-09-11 15:50:17），提交主题逐字为 `chore(wording): bill 侧「共享壳」全量改「共享 help 模板」（改生成器＋重生成；wording.md 纪律）`，改了 `gen-wake-assets.mjs`／`helpFile.ts`／`wake-assets.ts`／`help-exit-148.test.mjs`／`help-file-145.test.mjs`／`wake-assets.test.mjs` 六件，**只动注释文字、不动行数**（这也是兄弟图行号今天仍准的原因）。它顺带说明：票面与旧报告里那个已被裁掉的旧词，账单侧今天已全量改成「共享 help 模板」；本报告一律写「共享 help 模板」。

---

## 1. 逐件表（账单 → 备忘录：抄／不抄／改）

「抄」＝形状与方法照搬，只换常量与文案；「改」＝做法照搬但内容源或结构必须重写；「不抄」＝有意取反或不该进本仓。

| # | 仓内路径 | 它干什么 | 备忘录 | 一句话理由 |
|---|---|---|---|---|
| 1 | `packages/skill-bill/src/output.ts`（86 行） | HTML 产物**唯一落盘点**：`flag:'wx'` 独占创建 ＋ `EEXIST` 递补 `_N` ＋ 绝对路径回执；`explicit` 走覆盖写 | **抄** | `nextExclusiveCandidate`（`:27-39`）／`writeFileExclusiveWithRetry`（`:42-58`）／`deliverHtml`（`:72-86`）三块是 `#128` 的修法本身（判存＋写两步无独占性，多进程同秒交叉覆盖，`:8-14`），与技能无关，可整块搬；只把注释里的技能名与裁决票号换掉 |
| 2 | `packages/skill-bill/src/render/helpPaths.ts`（55 行） | 命名与落点**通式**（零 IO，只出初候选）：目录名／文件名主体／本地时间戳／`_N` 递补式 | **抄通式，换常量** | 换 `HELP_HTML_DIR_NAME`（`:22`）＝`memo_html`（见 §3.1）；文件名主体换 `备忘录_HELP`（见 §3.2）；时间戳与通式（`:31-49`）逐字照抄。`LOOKUP_FILE_STEM`（`:28`）是账单自造的速查支名字（老技能没有这一支）——备忘录要不要分名归票 4 |
| 3 | `packages/skill-bill/src/render/helpFile.ts`（182 行） | 内容资产＋派生 → 五项必填字段＋三块可选内容的**全量 HELP JSON** → 交付出口全页 HTML（零 IO、零落盘） | **改** | 接线写法照抄（`import { renderHelpShellHtml } from 'base-paint/help-shell'`，`:19`；零 IO 纯函数，`:1-3`；派生计数不写死数字，`:99-103`／`:172-181`）。必须重写的是**内容源**：账单从 `WAKE_GROUPS` 直转（`:143`），备忘录的内容资产要由老 `references/scenarios.yaml` 派生，且场景要多带 `editable_fields`（见 §3.3）；另 `HELP_FILE_VERSION`（`:29`，语义是技能数据世代）在备忘录要取 yaml 的 `version` |
| 4 | `packages/skill-bill/src/triggers/wake-assets.ts`（986 行，**生成物**） | 内容资产 typed const：域→二级组→场景三层，74 场景逐字；并派生扁平表、id 索引、HELP 短语 | **内容全换；落点不照抄** | 派生段照抄（`WAKE_ASSETS` `:968-970`、`SCENE_BY_ID` `:973-975`、`WAKE_ASSET_TOTAL` `:978`、`HELP_WAKE_WORDS` 从口径层派生 `:984-986`）。`src/triggers/` 是**工种名**（铁律四，`docs/agents/structure.md:44-49`），且该目录早于那份规矩；备忘录把资产放进 `src/help/`（出口已住那里，`src/help/index.ts:1`）更合规矩——落点归票 5 |
| 5 | `packages/skill-bill/scripts/gen-wake-assets.mjs`（254 行） | 机器生成资产：读事实源 → 逐字 `JSON.stringify` → 落盘；`--check` 只比对；形状断言 fail-closed | **做法照抄，读取段重写** | 照抄：`--check` 分支（`:243-249`）、形状断言（`:99-118`）、新增条目段（`:34-84`）、`renderFile` 的「头＋JSON 中段＋尾」（`:136-222`）、用法注释（`:7-13`）。**要重写**：账单的事实源是仓外老实物 HTML 的 `<script id="help-data">` payload（`:25-31` 的 `DEFAULT_SRC`／`DATA_OPEN`）；备忘录的事实源是 `references/scenarios.yaml`，读取与形状断言都按 YAML 重写（断言口径也要换：账单钉 7 域／20 组／71 场景／70 唯一唤醒词，`：30`） |
| 6 | `packages/skill-bill/src/cli/cmd_read.ts`（526 行）的 HELP 段 | 唯一出口。`bill.help.lookup` 三支：缺省＝HELP 文件、`mode:"lookup"`＝速查表、`q`＝现找；**全部在开库之前分派** | **必须照抄这段形状** | `dispatchHelp`（`:69-111`）、`helpInitialized`（`:84-86`，用「DB 文件是否存在」判初始化）、开库之前分派的路由（`:493-495`）、交付分支（`:498-510`）、退出码映射（`:512-521`，落盘失败 exit 5）、回执顶层追加 `delivery`（`:522-523`）。**备忘录现状相反**：`:122-124` 先过形状、`:129` 无条件 `openMemoDb(join(dbPath,'memo'))`——没有库就看不了帮助（见 §3.4） |
| 7 | `packages/skill-bill/SKILL.md`（126 行） | 说明面：「HELP 交付」节（`:112-120`）＋构建期注入的联动速查块（`:28-110`）＋frontmatter description（`:1-4`） | **照抄节的结构，文字全换** | 备忘录的注入块已有（`packages/skill-memo-ilife/SKILL.md:19-54`，由 `scripts/build-help.mjs` 重写）；缺的是「HELP 交付」这一节（缺省即交付物／完成标准＝`delivery.path` 真存在且字节相符／两支显式参数的语义／`--html` 语义／边界）。另注意备忘录 frontmatter：`packages/skill-memo-ilife/SKILL.md:1` **没有 YAML 头**（无 `name:`／`description:`），而插件提供方要解析 frontmatter（`plugin-bill-ilife/src/skill-provider.ts`）——票 12（`#232`）会撞上 |
| 8 | `packages/skill-bill/test/help-delivery-144.test.mjs`（146 行） | 模块级锁：命名通式／独占递补／`explicit` 覆盖／端到端冒烟／落盘失败 exit 5 | **照抄用例形状** | `:22-28` 通式、`:30-38` 初候选不建目录、`:48-58` 同秒三写不被覆盖、`:60-74` `explicit` 优先且覆盖写、`:77-96` 真 spawn 拿文件且**目录里 0 个 `.db`**、`:134-145` 父级是文件 → exit 5。备忘录对应常量换成 `memo_html`／`备忘录_HELP` |
| 9 | `packages/skill-bill/test/help-file-145.test.mjs`（72 行） | 渲染接线锁：五项必填字段取值／计数派生／三块可选内容／横幅状态驱动／可复现 | **照抄用例形状**（**兄弟图漏列的一件**） | `:20-29` 域数与场景数从资产派生、`:31-42` 五项必填字段取值、`:44-54` 三块可选内容（含「汇总块与 subtitle 同源」`:47`）、`:56-66` 字段集恒定、`:68-71` 可复现＋坏 Date 即抛。注意它从 `'../dist/index.js'` 与 `'../dist/triggers/wake-assets.js'` 深引构建产物（`:4-5`）→ 测试跑的是 `dist` |
| 10 | `packages/skill-bill/test/help-exit-148.test.mjs`（171 行） | 真 spawn 出口锁：五例（名字通式与回执／help 模板前后缀逐字／并发 6 次独占递补／两支产物互不串／参数与退出码矩阵） | **照抄用例形状，换常量与计数** | 从 `base-paint/help-shell` 直接取 `HELP_SHELL_PREFIX/SUFFIX/DATA_OPEN/TITLE_SLOT` 做逐字断言（`:14`）；并发用异步 `spawn`（`:35-46`，注释写明 `spawnSync` 会把并发串成串行）；`:19-20` 的两条文件名正则换成备忘录口径；`:123-129` 只断言「同秒各次占不同槽位且必有一次拿本体名」，**不**把进程调度当契约 |
| 11 | `packages/skill-bill/test/wake-assets.test.mjs`（93 行） | 资产锁：三层计数／域顺序／字段／老条目 SHA-256 摘要／与口径层 `WAKE_TABLE` 双向对账 | **照抄锁法** | 摘要锁（`:14`、`:50-55`）比逐字抄一份更耐改；双向对账（`:68-84`：现表功能短语条条有场景、场景唤醒词条条在现表、HELP 短语不进场景目录防自指）。备忘录要同形，对着 `memo` 的 28 条短语／10 条命令做 |
| 12 | `packages/skill-bill/package.json`（36 行）`:24-27`／`:33`／`:34` | 依赖闭包加 `base-paint`（`^0.3.0`）＋ `gen:wake-assets` 脚本 ＋ `test` 跑 `test/*.test.mjs` | **抄** | 备忘录 `package.json:23-25` 的 `dependencies` 今天只有 `base-link-core`；且 `:31` 的 `test` 只跑 `../../test/scaffold.test.mjs`（包内用例不被包命令盖到，根 `pnpm test` 才含 `packages/skill-memo-ilife/test/*.test.mjs`，见根 `package.json:13`）。`base-paint` 包名与目录名不同（目录 `base-render`／包名 `base-paint`，`packages/base-render/package.json:2`） |
| 13 | `packages/skill-bill/scripts/build-help.mjs`（42 行）`:34-37` | 构建期把唤醒词速查块注入 `SKILL.md`（只重写标记块） | **备忘录已有同形件，补一处** | 备忘录 `scripts/build-help.mjs` 已是同形（`:22-31`），但**不保换行**：账单那份 `:34-37` 按检出换行写回（CRLF 检出仍 CRLF），备忘录那份 `:28` 直接拼 `'\n'` |
| 14 | `packages/skill-bill/src/render/index.ts`（17 行） | 渲染层公开出口：把 HELP 三件（`helpFile`／`helpPaths`）与类型一起对外 | **抄形状，件名按票 5 定** | 一个文件对外给的东西数得出（铁律五）；HELP 相关出口集中在一处（`:13-17`）。备忘录做的时候件名与目录以票 5 的结构设计为准 |
| 15 | `packages/skill-bill/src/help/lookup.ts`（54 行） | 速查表数据源：`WAKE_TABLE` → 短语／命令／形状／可直跑示例 | **照用不改** | 备忘录已有同形件（`packages/skill-memo-ilife/src/help/lookup.ts`，42 行，`buildHelpLookup` `:30-38`）；账单的 `mode:"lookup"`／`q` 两支也是调自己的 `buildHelpLookup()`（`cmd_read.ts:96`、`:100`），备忘录同形，不必重写 |
| 16 | `packages/base-render/src/helpShell.ts`（83 行）＋ `assets/help-template.html`（106968 B）＋ `scripts/gen-help-shell.cjs`（301 行） | 通用 help 模板的出口与真相源（出口 `base-paint/help-shell`） | **不抄、不改，只 import** | 直连 `renderHelpShellHtml(data)`（`helpShell.ts:73-80`）与 `renderHelpShell`（`:83`）；改模板＝改公共层，走生成器与门（见 §2 陷阱 1） |
| 17 | `tooling/check-boundaries.mjs:37` | `SKILLS_BASE_FROZEN` 名单：这 4 个技能的依赖闭包与源码都不许出现 `base-*` | **必改（一行）** | `skill-memo-ilife` 在名单里（`:37`）。不把它移出，一 import `base-paint` 就 `FAIL`（`:39-44` 查依赖闭包、`:45-60` 扫源码与模板）。`#145` 对 bill 就是这么做的（`:34-36` 有先例与同批补的注释）。按 `map-220-body.md:39`：本图只改 `'skill-memo-ilife'` 一项，`'skill-home'` 归 `#183` |
| 18 | `tooling/skill-html-snapshot.mjs:43-49` | 五个技能页面产物的逐件 sha256 快照（含 `memo`） | **不抄，注意别被误伤** | `memo` 条目在 `:48`，且它的填充器是 `fillSharedMarkers`（与其余四件的 `fillTemplate` 不同）。本图只**新增** HELP 文件、不动备忘录的 6 个页面模板（`templates/*.html` 用的是旧的两标记契约，见陷阱 20），`pnpm snapshot:html:check` 应保持绿；一旦变红说明误改了页面 |
| 19 | 反例：`packages/skill-calorie/src/output.ts`（386 行）、`packages/skill-calorie/src/render/helpShell.ts`（31 行） | 卡路里那一套：中文命令名映射／`LEGACY_COMMAND_OVERRIDES`（`:257`）／动态段（`:272`）／内容标识段（`:284`）／三态 `HtmlDelivery`（`:189`）／只读回退（`:184`）；以及一层 deprecated 转发件 | **不抄** | 账单有意只取两小块，理由写在 `src/output.ts:1-22` 与 `helpPaths.ts:1-18`：卡路里的「命令名→中文段落映射」「动态段」「写不进去就换形态的兜底」是它自己的产物模型；本线的目的地是「明确拿到文件」，写不进去就是真失败（exit 5）。转发件违铁律五（新技能直连公共层出口），卡路里自己也在 `src/render/helpShell.ts:9-10` 标了 deprecated |
| 20 | `packages/skill-memo-ilife/src/render/html.ts`（62 行）的 `fillSharedMarkers` | 备忘录现有 6 个页面模板的共享标记填充（两标记各恰 1 次） | **HELP 不走这一件** | 备忘录 6 个模板用的是旧的两标记契约（`templates/memo_query.html:7`／`:65` 等六件都是 `<!--SHARED-CSS-->` 与 `<!--SHARED-HELPERS-->`），而 `html.ts:51` 自己写明「init/HELP 模板不在此（M6）」。HELP 全页必须经 `base-paint/help-shell` 的 `help-data` 全量页，别拿 `fillSharedMarkers` 凑 |
| 21 | `packages/plugin-bill-ilife/src/skill-provider.ts`（128 行）＋ `src/dsh-ctx.ts`（56 行）＋ `src/index.ts` 的注册 ＋ `test/skills-provider.test.mjs`（107 行） | 插件侧的技能提供方（把技能装到 agent 读得到的位置）：按包名 resolve 技能包的 `SKILL.md`、最小 frontmatter 解析、注册提供方 | **照抄（票 12 的活）** | 备忘录侧**已有** `packages/plugin-memo-ilife/src/dsh-ctx.ts`（与居家不同——居家侧没有这件），缺的是 `skill-provider.ts` 与 `test/skills-provider.test.mjs`；还要抄 `inject: ['skills']` ＋ `apply` 里 `registerProvider` ＋「已注册即退让」的写法（`plugin-bill-ilife/src/index.ts`）。**注意**：提供方要解析 `SKILL.md` 的 frontmatter，而备忘录 `SKILL.md:1` 今天没有 YAML 头 |

---

## 2. 陷阱清单（每条带「仓内路径:行号」）

1. **`packages/base-render/src/helpShell.ts` 是生成物，禁手改**：真相源是 `packages/base-render/assets/help-template.html`，生成器 `packages/base-render/scripts/gen-help-shell.cjs`；改模板要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`（`helpShell.ts:1-12`；`packages/base-render/package.json:25-26`）。源行尾须全 CRLF，孤 LF 即抛（`gen-help-shell.cjs:28`）；中段须含 3 槽注释、前缀须含标题占位（`:38-42`）。
2. **内容资产也是生成物，禁手改词**：`packages/skill-bill/src/triggers/wake-assets.ts:8-10` 与生成器头注释（`packages/skill-bill/scripts/gen-wake-assets.mjs:144-146`）都写明「改内容＝改事实源或改生成器里的新增条目段，再跑生成器」。备忘录同样要留 `--check`（`gen-wake-assets.mjs:243-249`）。
3. **形状断言要 fail-closed，且口径按自家事实源重写**：账单钉「7 域／20 组／71 场景／70 唯一唤醒词」＋字段齐＋id 唯一＋`types` 用老词（`packages/skill-bill/scripts/gen-wake-assets.mjs:29-30`、`:99-118`）。备忘录的老骨架口径是 8 域／13 二级组／30 场景／29 唯一唤醒词（本席只读实测，见 §3.3），换源就必须换这组数。
4. **变异自证／改源后必须干净重建**：`#148` 票面留痕——`Copy-Item` 保留旧 mtime 会让增量编译认为源未变，`dist` 仍带变异产物，于是「还原后仍红」（陈旧 `dist` 假红）。
5. **测试跑的是 `dist`**：模块级用例从 `../dist/...` 导入（`packages/skill-bill/test/help-delivery-144.test.mjs:11-12`，`help-file-145.test.mjs:4-5`），出口用例 spawn `dist/cli/cmd_read.js`（`help-exit-148.test.mjs:17`）。改完源码不重建＝测的是旧产物。（更正：`dist` **不是**提交进来的，`.gitignore` 有 `packages/*/dist/`，`git ls-files '*dist*'`＝0 件。）
6. **换行与编码**：源码与文档 UTF-8 无 BOM；`HELP_SHELL_PREFIX`／`HELP_SHELL_SUFFIX` 字面量内含 CRLF（`packages/base-render/src/helpShell.ts:42`、`:45`），逐字断言别按 LF 硬编码。`SKILL.md` 注入件要保检出换行——账单那份做了（`packages/skill-bill/scripts/build-help.mjs:34-37`），备忘录那份没做（`packages/skill-memo-ilife/scripts/build-help.mjs:28`）。
7. **命名通式**：本地时区、零填充秒、同秒递补从 `_2` 起（`packages/skill-bill/src/render/helpPaths.ts:31-49`；用例 `packages/skill-bill/test/help-delivery-144.test.mjs:22-28`）。**判存＋写入两步没有独占性**——多进程同秒会交叉覆盖，必须 `wx` ＋ `EEXIST` 递补（`packages/skill-bill/src/output.ts:8-14`）。老备忘录正是「判存再写」两步（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:133-140`：`if out_path.exists()` 再 `while` 找空位再 `write_text`）——照抄新线时**不要**把这个老写法带过来。
8. **回执路径必须 `resolve()` 成绝对路径**：`SKILLS_DB_PATH` 本身可以是相对路径，回传相对串会让下游打开到别处的同名文件（`packages/skill-bill/src/output.ts:16-18`、`:75`、`:83`）。
9. **递补只认 `EEXIST`**：其余错误原样抛（`packages/skill-bill/src/output.ts:14`、`:50-54`），别把权限／路径错伪装成「换个名再写一次」；`nextExclusiveCandidate` 的正则只认 `_\d{8}_\d{6}` 前缀（`:27-39`），换命名通式必须同批改它。
10. **失败＝exit 5 ＋ stdout 空**：`packages/skill-bill/src/cli/cmd_read.ts:512-521`；用例 `packages/skill-bill/test/help-exit-148.test.mjs:152-171`、`help-delivery-144.test.mjs:134-145`。账单有意不引入「写不进去就换形态」的兜底（`packages/skill-bill/src/output.ts:19-21`）。
11. **看帮助不许把库建出来**：账单靠「在开库之前分派」（`packages/skill-bill/src/cli/cmd_read.ts:493-495`）＋「用 DB 文件是否存在判初始化」（`:84-86`），用例断言产物目录里 0 个 `.db`（`packages/skill-bill/test/help-delivery-144.test.mjs:94-95`）。备忘录今天的形状不同但同样要摆正，见陷阱 12。
12. **备忘录今天「没有库就看不了帮助」，方向与账单相反**：`packages/skill-memo-ilife/src/cli/cmd_read.ts:129` 在分派之前无条件 `openMemoDb(join(dbPath,'memo'))`，而 `packages/skill-memo-ilife/src/fetch/db.ts:21-29` 对不存在的目录直接抛 `MEMO_DB_MISSING` → `cmd_read.ts:139` 走 `fail(4,'取数失败：…')`。本席只读实测：`node dist/cli/cmd_read.js memo.search` 在库目录不存在时 exit 4，**且不建库、不建目录**（`openMemoDb` 全用 `statSync`／`accessSync`，无 `mkdir`）。账单要防的是「看帮助把库建出来」，备忘录要防的是「没有库就看不了帮助」。
13. **计数一律派生，不写第二份数字**：`packages/skill-bill/src/render/helpFile.ts:99-103`（域数／场景数／版本一处算、两处用）、`:172-181`（域级索引计数）；`packages/skill-bill/src/triggers/wake-assets.ts:977-978` 注释写明「单源不复写第二遍数」。用例把这条钉住（`packages/skill-bill/test/help-file-145.test.mjs:35-36`、`:47`）。
14. **三块可选内容的字段一律带着、显隐走 `hidden`**：`packages/skill-bill/src/render/helpFile.ts:11-17`、`:115-130`；模板运行时读 `meta_blocks`／`init_banner`／`version`（`packages/base-render/assets/help-template.html:1651-1654`），横幅显隐判 `INIT_BANNER.hidden`（`:1775`）。payload 形状不随状态变，下游才敢断言同一组字段（用例 `help-file-145.test.mjs:56-66`）。**老备忘录相反**：已初始化时 `init_banner` 直接返回 `None`＝不出这个字段（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:501-502`）。
15. **徽章类型词只认 5 个**：`采集／查看／选择／向导／回执`（`packages/base-render/assets/help-template.html:1698` 的 `TYPE_DEFAULT`；生成器断言同表，`packages/skill-bill/scripts/gen-wake-assets.mjs:109-115`）。老备忘录的 `type` 写成「采集+回执」「查看+回执」「向导+采集+回执」三种组合、拆开后落在 `采集／查看／向导／回执` 四词内（本席只读实测 30/30 场景都有 `type`）→ 零模板改动；若要用表外的词＝要改共享模板（公共层变更，另立票）。
16. **`title` 含不含技能名，会改文档标题**：`packages/base-render/src/helpShell.ts:66-70` 的判据是 `title.includes(skill_name)`。账单 `title='饼干记账 · 使用手册(HELP)'`（`packages/skill-bill/src/render/helpFile.ts:27`）自带技能名 ⇒ 原样用；**老备忘录 `title='使用手册'`**（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:587`）不含技能名 ⇒ 走另一支，文档标题变 `备忘录 · 使用手册`。取值归票 3，但照抄时别把这个分支当死逻辑。
17. **`editable_fields` 是备忘录专属、账单没有的字段，别在改写时丢掉**：老备忘录由 `dimensions` 经中文标签映射生成（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:49-69` 的 `DIM_LABEL_MAP`、`:562-567`、`:579-580`）；共享 help 模板认这个字段（`packages/base-render/assets/help-template.html:1669`：`params: (s.editable_fields || []).map(...)`），账单的场景资产里没有它（`packages/skill-bill/src/triggers/wake-assets.ts:166-175` 只有 id/title/wake_word/status/prompt_template/types）。
18. **横幅的步骤卡是共享模板已支持的，不用改模板**：`packages/base-render/assets/help-template.html:1776` 读 `INIT_BANNER.steps`（`.map` 出步骤卡），样式在 `:35-37`（>4 步横向滑动）。老备忘录传了 6 条（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:516-523`）。
19. **`tooling/check-boundaries.mjs` 不改就红**：`skill-memo-ilife` 在 `SKILLS_BASE_FROZEN` 名单里（`tooling/check-boundaries.mjs:37`），一 import `base-paint` 就被依赖闭包与源码两道断言拦下（`:39-60`）。
20. **备忘录现有页面模板走的是旧的两标记契约，别混进 HELP**：6 个模板各含 `<!--SHARED-CSS-->` 与 `<!--SHARED-HELPERS-->` 恰一处（如 `packages/skill-memo-ilife/templates/memo_query.html:7`、`:65`），由 `packages/skill-memo-ilife/src/render/html.ts:55-61` 的 `fillSharedMarkers` 填充；`html.ts:51` 自述「init/HELP 模板不在此（M6）」。HELP 全页必须走 `help-data` 全量页（`packages/base-render/src/helpShell.ts:73-80`），两条管线不能混。
21. **HELP 自己不展示自己**：老备忘录要求 HELP 页不出现 HELP 自身（老 `SKILL.md:1141`、老 `tests/test_help.py:252-258`），账单同口径——4 条 HELP 短语不进场景目录，由 `HELP_WAKE_WORDS` 从口径层派生（`packages/skill-bill/scripts/gen-wake-assets.mjs:156-159`、`:212-218`；`packages/skill-bill/src/triggers/wake-assets.ts:984-986`）。
22. **根 `pnpm test` 会顺手改写其他技能的 `SKILL.md`**：地图已记这条已知问题（`map-220-body.md:42`），跑完 `git checkout` 还原，别把别人的文件混进提交。（本席只读，未跑任何门。）
23. **包内 `test` 脚本盖不到新用例**：`packages/skill-memo-ilife/package.json:31` 的 `scripts.test` 只跑 `../../test/scaffold.test.mjs`，而账单是 `node --test test/*.test.mjs`（`packages/skill-bill/package.json:34`）。根 `pnpm test` 的 glob 已含 `packages/skill-memo-ilife/test/*.test.mjs`（根 `package.json:13`），但「包里绿」不能当门用——要么改包内脚本，要么把门写成根命令。
24. **快照别被误伤，且备忘录那一行与别家不同形**：`tooling/skill-html-snapshot.mjs:48` 的 `memo` 条目填充器是 `fillSharedMarkers`（其余四件是 `fillTemplate`）；影响面标记允许清单刻意留空（`:54-55` 的 `MARKER_ALLOW = {}`）。本图只新增 HELP 文件、不动页面模板，`pnpm snapshot:html:check` 应保持绿。

---

## 3. 备忘录与居家／账单的差异点

### 3.1 老目录名：`memo_html`（与账单同族，与居家同一形状）

- 老来源：`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:25` `SKILL_HTML_NAME = "memo"`；`:114-121` `_get_html_output_dir()` → `DB_PATH.parent / f"{SKILL_HTML_NAME}_html"` ⇒ **`memo_html`**（`SKILL.md:1115` 与老测试 `tests/test_help.py:467`、`:487` 都断言这个名字）。
- 实物在盘（只读列目录）：`D:\2Study\StudyNotes\.db\memo_html\`，里面有 7 类产物：`备忘录_HELP_*`、`备忘录_初始化报告_*`、`备忘录查询_*`、`同步报告_*`、`心愿完成_*`、`心愿排期_*`、`批量改分类_*`。
- 三家互照：账单 `biscuit_accountant_html`（`packages/skill-bill/src/render/helpPaths.ts:22`）、居家 `home_manager_html`（兄弟图 `t184-bill-recipe.md:27` 引 `map-183-body.md:3`／`:22`）——同一族「ASCII 短名 ＋ `_html`」，只是短名不同。**备忘录不用改老目录名**，新件常量取 `memo_html`。

### 3.2 文件名主体：`备忘录_HELP`（也不用改老名）

- 老来源：`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:602` `def render_help(payload=None, name="备忘录_HELP", …)`；`:132` `out_dir / f"{name}_{ts}.html"`。
- 老锁（比账单多一层文字锁）：`D:\2Study\StudyNotes\SKILLS\备忘录\tests\test_help.py:224` 正则 `备忘录_HELP_\d{8}_\d{6}(_\d+)?\.html`、`:223` 断言文件名含 `备忘录_HELP_`。
- 实物在盘佐证：`D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260820_150143.html` 等 60 余个。
- 三家互照：账单 `饼干记账_HELP`（老 `COMMAND_NAMES["help"]`，`packages/skill-bill/src/render/helpPaths.ts:9-13`），居家要用 `居家管家_HELP`。**三家通式一致**（`〈主体〉_<YYYYMMDD>_<HHMMSS>[_N].html`），只有主体字面不同；备忘录与账单都是**老名直搬**。

### 3.3 事实源形态：老备忘录是 YAML＋转换层，不是老实物 HTML 的 payload

| | 账单 | 备忘录 |
|---|---|---|
| 事实源 | 仓外老实物 `D:\2Study\StudyNotes\SKILLS\饼干记账\饼干记账.html` 的 `<script id="help-data">` payload（`packages/skill-bill/scripts/gen-wake-assets.mjs:25-31`、`:87-96`） | 老技能仓内 `references/scenarios.yaml`（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:37`、`:472-483`；yaml 头注释 `:3` 与老 `SKILL.md:1072`／`:1113` 都声明它是 HELP 唯一事实源） |
| 中间层 | 无（payload 直接逐字搬，加 3 条新增场景，`gen-wake-assets.mjs:34-84`） | **有转换层** `_scenarios_to_contract_data()`（`memo_render.py:527-599`）→「scene-data 契约 v1 JSON」；声明在老 `SKILL.md:1114`、模块头 `:9-10` |
| 骨架（只读实测） | 7 域／20 二级组／71 场景（生成器钉 70 唯一唤醒词，`gen-wake-assets.mjs:30`），仓内资产 74 场景（`wake-assets.ts:190-191`） | **8 域（categories）／30 场景／29 唯一唤醒词／13 个 (域,子功能) 组／76 个 `dimensions` 字段／30 场景全带 `type`**（本席用只读解析器数出；与 `map-220-body.md:28` 记的「8 域／13 二级组／30 场景／29 唯一唤醒词／76 个 `editable_fields`」逐项相符） |
| 场景字段 | 5 个：`id`／`title`／`wake_word`／`status`／`prompt_template` ＋ `types`（`packages/skill-bill/src/triggers/wake-assets.ts:166-175`） | 多一个 **`editable_fields`**（`memo_render.py:562-567`、`:579-580`）：由 `dimensions` 经 `DIM_LABEL_MAP`（`:49-69`）映射中文标签，`required` 全 `false`；空值项被过滤，全空则整个字段不出现（`:567` 的 `or None`）；`首次使用` 场景 0 个维度 ⇒ 无此字段 |
| 组名来源 | 老实物写死的 `id`／`label` | 二级组 `label` 取 `subfunction`（`:557`），`subfunction` 缺省走 `"基础"` 兜底（`:556`），组 id 由 `f"{cat_key}_{序号}"` 现算（`:559`）——本席实测 4 个域走这个兜底（`checkin`／`init`／`mood`／`sync`，都是单子功能域），与 `map-220-body.md:28` 记的「4 处」相符 |
| 注入方式（老线） | 无（老实物本身就是全量页） | 走 `公共组件/injector.py` ＋ `公共组件/assets/help_template.html`（`memo_render.py:36`、`:100-111`：三占位符硬拦截 ＋ `validate_help_data` 校验） |
| 老模板世代 | 与仓内同源 | **老模板与仓内模板不同代**：`D:\2Study\StudyNotes\SKILLS\公共组件\assets\help_template.html`（40927 B，`<title>HELP 原型 · V4 三级目录版</title>` **写死**，无 `__HELP_TITLE__` 占位）vs 仓内 `packages/base-render/assets/help-template.html`（106968 B，标题占位 ＋ 3 槽注释，生成器 `gen-help-shell.cjs:21`／`:42` 断言占位必须在） |

**新线把这层差异抹平了**：两边都改道到 `base-paint/help-shell` 的 `renderHelpShellHtml`（`packages/base-render/src/helpShell.ts:73-80`），注入方式与模板世代不再各说各话。所以备忘录要抄的是**契约数据怎么造**，不是**页面怎么注**。

**老实物有三代，别拿错当基准**（本席只读抽了四份 `memo_html` 产物）：

| 代 | 例 | 字符数 | `<title>` | 有 `help-data` |
|---|---|---|---|---|
| 8/10 自带 help 模板世代 | `备忘录_HELP_20260810_000503.html` | 46885 | `备忘录 · HELP 使用手册` | 否 |
| **8/13 公共组件 help 模板世代** | `备忘录_HELP_20260813_155314.html` | 91706 | `HELP 原型 · V4 三级目录版` | **是** |
| 8/20 另一条产线 | `备忘录_HELP_20260820_150143.html` | 46873 | `备忘录 · HELP 使用手册` | 否 |

8/13 那一代的 `<title>` 是原型水印——因为老模板把标题写死了（老模板文件里没有占位）；仓内模板已由 `abf94f4`（`#141` 去原型水印）改成占位派生。地图 `:29` 已定「只把老实物当内容旁证，不当视觉基准（用户 Q1=A）」，本席复核成立。

### 3.4 有没有第二事实源：有三处，比账单多一层

1. **老 `SKILL.md` 里的三张表**（都在老技能仓内，只读）：
   - 「用户原话 → 唤醒词 反向指引表」（`D:\2Study\StudyNotes\SKILLS\备忘录\SKILL.md:147-181`，编号表 `:156-172` 共 15 行，含 `备忘录 HELP`／`help`／`manual`／`指南` 那一行 `:172`）；
   - 「唤醒词 → HTML 生成对照表」（`:226-292`，编号表 `:235-266` 共 29 个唤醒词，`备忘录 HELP` 是第 29 行 `:266`；合计行 `:275` 记 29 个含 12 个子唤醒词；`:292` 自述由老 `tests/test_html_trigger_coverage.py` 扫 `SKILL.md` 与本表逐条核对）；
   - 「唤醒词」总表（`:300-305`）。
2. **新仓 `packages/skill-memo-ilife/src/policy/wakewords.ts:13-30`（16 条显式）＋ `:32-37`（由 `packages/skill-memo-ilife/src/policy/category.ts:9-14` 的 `WAKE_TOPS` 派生 12 条）＝28 条短语**；`packages/skill-memo-ilife/src/help/lookup.ts:30-38` 只是它的投影（`:29` 自注「28 短语：16 显式 + 12 子唤醒词」）。
3. **老 yaml 的 29 个唯一唤醒词 ↔ 新表 28 条短语**：数量与用词都对不齐（老 yaml 有 `备忘录同步`／`搜备忘`／`备忘改子分类`／`首次使用` 等，新表按 10 条命令重排）——对账归票 2（`#222`），本票只摆事实。

=> 结论：**备忘录的「事实源」比账单多一层**。账单只有「仓外老实物 payload ↔ 仓内 `WAKE_TABLE`」两方，`packages/skill-bill/test/wake-assets.test.mjs:68-84` 就是这两方的对账锁，`gen-wake-assets.mjs:99-118` 的 fail-closed 形状断言也只钉老实物一侧。备忘录要三方对账（老 yaml ＋ 老 `SKILL.md` 三张表 ＋ 新 `policy` 表），其中老 `SKILL.md` 表与 yaml 的关系（算不算第二事实源、`(HTML)` 类兼容词去留）地图已列为 Not yet specified（`map-220-body.md:75`）。

### 3.5 缺什么件（对照账单八件 ＋ 公共层）

**今天一件都没有**——以下逐条实测：

| 缺件 | 实测证据 |
|---|---|
| 落盘点（独占创建／递补／绝对路径回执） | 无 `packages/skill-memo-ilife/src/output.ts`。最近的东西是 `src/cli/cmd_read.ts:132-137`：`assertHtmlSize` 后 `writeFileSync(o.html, html, 'utf8')`——不建父目录、不 `resolve()`、不 `wx`、不递补，失败只报「HTML 写盘失败」（`:136`） |
| 回执里的产物路径 | 无：`:144` 只打 envelope，`buildMemoEnvelope`（`src/render/envelope.ts:25-38`）不带 `delivery`；地图目的地要的「明确拿到文件 ＋ 绝对路径回执」在这一层是空的 |
| 命名落点通式 | 无（没有 `helpPaths` 那一件） |
| 渲染接线 | 无（没有 `helpFile` 那一件）；`src/render/html.ts:51` 自述「init/HELP 模板不在此（M6）」 |
| 内容资产 ＋ 生成器 | 无（没有 `triggers/wake-assets` 那一件，也没有 `scripts/gen-*-assets.mjs`）；`src/help/lookup.ts` 只有速查表 |
| `memo.help.lookup` 这条命令 | **不存在**：`src/render/envelope.ts:5-16` 的 `MEMO_KEY_SHAPES` 只有 10 条命令。本席只读实测 `node dist/cli/cmd_read.js memo.help.lookup`（`SKILLS_DB_PATH` 指向不存在的目录，未建任何文件）→ `ERR 3: 未知联动 key：memo.help.lookup`，exit 3 |
| 依赖闭包与脚本 | `package.json:23-25` 只有 `base-link-core`；无 `gen:wake-assets`；`:31` 的 `test` 只跑根 scaffold |
| 说明面 | `SKILL.md:1` 无 YAML frontmatter（账单 `:1-4` 有 `name`／`description`）；无「HELP 交付」节（账单 `:112-120`） |
| HELP 用例 | 无。`test/` 只有 `cli.test.mjs`／`fetch.test.mjs`／`policy.test.mjs`／`render.test.mjs`／`skill.test.mjs`；`test/cli.test.mjs:68-74` 的 `--html` 用例只断言落盘片段含 `<section`，**不**断言路径回执、**不**断言独占递补、**不**断言落盘失败的退出码 |
| 插件侧技能提供方 | `packages/plugin-memo-ilife/src/` 有 `bridge.ts`／`client.ts`／`contract.ts`／`dsh-ctx.ts`／`index.ts`／`settings.ts`／`slot.ts`；缺 `skill-provider.ts` 与 `test/skills-provider.test.mjs`（对照 `packages/plugin-bill-ilife/src/skill-provider.ts` 128 行 ＋ `test/skills-provider.test.mjs` 107 行）。**与居家不同**：备忘录侧 `dsh-ctx.ts` 已经有了（票 12 已并进） |
| 老 yaml 那 76 个 `dimensions`（映射后即 `editable_fields`）的对应物 | 新仓没有任何对应物（新表只有 28 条短语／10 条命令，无域、无二级组、无 `prompt_template`、无 `types`） |

### 3.6 老备忘录的三副本机制，本图只留一副本

- 老 `render_help` 一次写**三份**（`D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_render.py:602-650`）：① 时间戳副本落 `memo_html/`（`:623`）；② **覆盖技能根 `备忘录.html`**（`:625-630`，注释写「用户额外要求 · 永远写」）；③ 可选 `--output` 副本（`:632-641`）。老测试锁三份（`tests/test_help.py:219-238`、`:332-341`、`:357-366`），并锁「`help` 子命令不带 `--html`」（`:296-304`）。
- 地图已裁第 ②「覆盖技能根 `备忘录.html`」**不做**（`map-220-body.md:41`，引 `#131`／`#143` 的「不写固定名镜像」）。
- 账单只写一份：`deliverHtml` 的 `target`（通式初候选）或 `explicit`（`--html` 逐字指定），没有「固定名镜像」这一支。⇒ 备忘录照抄账单 ＝ 从三副本收成一副本 ＋ 一条显式覆盖参数。

---

## 4. 提交对账（只用只读 git 查询复核）

复核时刻：HEAD＝`60ba041`（`master`），六笔提交实测都是 HEAD 的祖先（`git merge-base --is-ancestor <sha> HEAD` 全为真）。

| 票 | sha（票面记的） | `git log -1 --format=%H` | 是否仍指向同一批文件 |
|---|---|---|---|
| `#146` | `848b7a4` | `848b7a4129f5b35f4e879f3aa1ad3832f80ef4e4` | ✅ sha 与提交都在；**件清单要补 1 件** |
| `#145` | `f312f88` | `f312f887218c8de270d0b71ce5c2e8d2a255cd4f` | ✅ sha 与提交都在；**件清单要补 3 件** |
| `#144` | `bfc51bf` | `bfc51bf747aa035a58c88f60131caf32b98711cd` | ✅ sha 与提交都在；**件清单要补 3 件** |
| `#148` | `1f86e7b` | `1f86e7b480fd248e0d9750411739258d2773f726` | ✅ 1 件 171 行，与票面一致 |
| `#149` | `0364326` | `0364326c0772c7265f2db53c76a2a5135003b3fe` | ✅ 1 件 `packages/skill-bill/SKILL.md`（＋12／−2），与票面一致 |
| `#150` | `fe1117e` | `fe1117edf3adef420de9eab97e136a7d24651b18` | ✅ 6 件；票面只写「技能提供方＋真机接线」未列件，可接受，但要补记两处 skill-bill 侧改动 |

`git show --stat` 实得（逐笔）：

- `848b7a4`（`feat(146)`，2026-09-11 15:02:39）：`packages/skill-bill/package.json` ＋1／`scripts/gen-wake-assets.mjs` ＋254／`src/triggers/wake-assets.ts` ＋986／`test/wake-assets.test.mjs` ＋93（共 4 件 1334 行）。**兄弟图列 3 件，漏 `package.json`。**
- `f312f88`（`feat(145)`，15:27:54）：`base-render/scripts/gen-help-shell.cjs` ＋26／`base-render/src/helpShell.ts` ＋16／`base-render/test/help-shell-136.test.mjs` ＋10／`skill-bill/package.json` ＋3−1／`skill-bill/src/render/errors.ts` ＋3−1／`skill-bill/src/render/helpFile.ts` ＋153／`skill-bill/src/render/index.ts` ＋5／`skill-bill/test/help-file-145.test.mjs` ＋72／`pnpm-lock.yaml` ＋3／`tooling/check-boundaries.mjs` ＋18（共 10 件）。**兄弟图列 6 件，漏 `base-render/test/help-shell-136.test.mjs`、`skill-bill/test/help-file-145.test.mjs`、`pnpm-lock.yaml`。**
- `bfc51bf`（`feat(144)`，15:41:45）：`skill-bill/src/cli/cmd_read.ts` ＋92−18／`src/output.ts` ＋86／`src/render/helpFile.ts` ＋29／`src/render/helpPaths.ts` ＋55／`src/render/index.ts` ＋7−1／`test/cli.test.mjs` ＋8−1／`test/help-delivery-144.test.mjs` ＋146（共 7 件）。**兄弟图列 4 件，漏 `src/render/helpFile.ts`、`src/render/index.ts`、`test/cli.test.mjs`。**
- `1f86e7b`（`test(148)`，15:47:24）：`test/help-exit-148.test.mjs` ＋171（1 件）。✅ 一致。
- `0364326`（`docs(149)`，15:50:17）：`packages/skill-bill/SKILL.md` ＋12−2（1 件）。✅ 一致。
- `fe1117e`（`feat(150)`，16:22:18）：`plugin-bill-ilife/src/dsh-ctx.ts` ＋56／`src/index.ts` ＋31−3／`src/skill-provider.ts` ＋128／`test/skills-provider.test.mjs` ＋107／`skill-bill/SKILL.md` ＋5／`skill-bill/package.json` ＋1（共 6 件）。**兄弟图未列件。**
- 六笔之后另有一笔相关：`c95892d`（15:50:17，与 `0364326` 同分钟）`chore(wording)`：`gen-wake-assets.mjs` ＋2−2／`helpFile.ts` ＋3−3／`wake-assets.ts` ＋2−2／`help-exit-148.test.mjs` ＋2−2／`help-file-145.test.mjs` ＋1−1／`wake-assets.test.mjs` ＋1−1，**只改注释文字不动行数**。

**逐件追改**（`git log --oneline -- <路径>`）：`src/output.ts`／`src/render/helpPaths.ts` 自 `bfc51bf` 后再无提交（工作区也 `clean`）→ 兄弟图对这两份的结论今天最新；`helpFile.ts`／`wake-assets.ts`／`help-exit-148.test.mjs`／`help-file-145.test.mjs`／`wake-assets.test.mjs`／`gen-wake-assets.mjs` 各多一笔 `c95892d`（只改注释）。

**一句话结论**：六个 sha 今天**仍指向同一批提交与同一批文件**，六件都在盘上、都在 HEAD 的祖先链上；但兄弟图的**件清单**对 `#146`／`#145`／`#144` 三笔各漏件（1／3／3 件），并且「`dist` 是提交进来的」这句不成立（`dist` 未被 git 跟踪）。本报告 §1 的逐件表按**实际件**列。

---

## 5. 没读透／拿不准的（不猜）

1. **老 yaml 的 76 个 `dimensions` 字段与老 HELP 实物里的 `editable_fields` 是否逐字相等，本席没有比对**：本席数的是 yaml 侧 76 个字段（8 域／13 组／30 场景／29 唤醒词同样出自本席的只读解析器），而 `editable_fields` 是转换层按 `DIM_LABEL_MAP`（`memo_render.py:49-69`）映射后的产物，映射表里有 `sub_category`→「子分类」这类改名，也可能有未命中而回落原字段名（`:564` 的 `DIM_LABEL_MAP.get(k, k)`）。**映射后的实际条数与中文标签要读老转换层逐件对**——属票 2（`#222`）范围。
2. **老 yaml 里有字段没进 `DIM_LABEL_MAP`**：本席实测出现 4 空格缩进的字段名里，`repeat_rule`／`remind_at`／`reminder_id`／`note_id`／`with_reminders`／`bulk_indicator`／`true`／`ids`／`from_category`／`to_category`／`media`／`tasklist_guid`／`start`／`end`／`status` 中，`DIM_LABEL_MAP` 只覆盖一部分（`remind_at`／`repeat_rule`／`tasklist_guid`／`media` 的映射表里没有）。哪些会以原字段名出现在 `editable_fields` 里、要不要补中文标签，本席未逐个核对。
3. **老 `memo_cli.py` 的 `help` 子命令入口未逐行读**：只见老 `SKILL.md:1156` 的 `python3 script/memo_cli.py help` 与老测试 `tests/test_help.py:277-296`／`:366-383` 的行为断言（含 `html_path`／`skill_root_path`／`output_path` 三字段回执）。「老出口的退出码与失败形态」本席没有一手证据，故本报告没有拿老退出码与账单的 exit 5 做对照。
4. **`HELP_INITIALIZED` 环境变量覆盖**（`memo_render.py:489-491`）在新线要不要保留，本席没有依据：账单没有这一支（`cmd_read.ts:84-86` 只判文件存在）。这是老技能为「测试／镜像可重现」加的口子，归票 4／票 3。
5. **`meta_blocks` 在备忘录要不要有**：老备忘录**没有** `meta_blocks`（本席实测转换层返回里无此字段，`memo_render.py:585-599`），账单有两块（`helpFile.ts:106-111`）。共享模板会读它（`help-template.html:1651`），缺席即空。取舍归票 3。
6. **「速查支」在备忘录要不要分名／叫什么**：老家没有这一支（`map-220-body.md:74` 已列为 Not yet specified），账单自造了 `饼干记账_速查表`（`helpPaths.ts:26-28`）。本席没有依据给建议，归票 4。
7. **老实物三代里「8/20 那条产线」是什么**：本席只测到它与 8/10 世代同名但模板不同代（`editable_fields` 字符串在、`help-data` 锚点不在），没有追它的生成脚本；地图 `:29` 也把它列为待厘清（那里记的是它与卡路里 9/2、9/5 的产物同一模板、jaccard＝1.000）。本报告不当基准用。
8. **卡路里侧的 `helpFile.ts`／`helpCenter.ts`／`help.ts` 未逐行读**：本席只读了两件反例（`packages/skill-calorie/src/output.ts` 与 `src/render/helpShell.ts`）。若票 4 判「收成共用位」，这三份要一起看。
9. **`packages/base-render/src/help.ts`（组件式 TS 渲染）未读**：地图 `:30` 提醒它「另有一套不是本图的面」。本报告的所有引用都指 `base-render/src/helpShell.ts` 与 `assets/help-template.html`，未与 `help.ts` 混。
10. **本席没跑任何门**（`pnpm boundaries`／`pnpm test`／`pnpm snapshot:html:check`）：只读调查，故「检查器当前是否已能过」没有实测证据。本席唯一跑过的可执行动作是 `node packages/skill-memo-ilife/dist/cli/cmd_read.js memo.help.lookup`（形状校验在开库之前，未落任何文件），以及只读的 `git log`／`git show`／`git status`。
11. **老 `references/scenarios.yaml` 的 `dependencies:` 块里的缩进行会被误当维度字段**：本席的只读解析器把 `首次使用` 场景的 `dependencies:` 多行文本里两行算进了 4 空格缩进统计（`SKILLS_DB_PATH`／`MEMO_MEDIA_DIR`），扣除后得 76。若别人用不同口径数会得 78；**以 76 为准的理由是转换层只读 `dimensions`**（`memo_render.py:562`）。这条口径差异写在这里，免得后来人对不上数。

---

## 附：本票的交付对账（必报五步第五步）

- 影响清单（动手前）：新建 1 份文档 `docs/skills/skill-memo-ilife/t221-bill-recipe.md`；**不碰 `packages/` 下任何源码、不碰老技能目录、不跑写 git、不动 issue**。
- 实际碰到：只有上面这一个文件。偏差为零。
- 文档不管辖：`docs/agents/structure.md:9` 明确「不管：测试文件、页面模板、构建产物、生成的资产、文档」，故本票不触发五条铁律的改动判据；但报告正文一律按 `docs/agents/wording.md` 的用词纪律写。
