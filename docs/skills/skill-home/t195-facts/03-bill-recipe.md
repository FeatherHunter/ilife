# t195 取证 · t184「饼干记账 HELP 交付实现逐件读懂」事实归集（bill recipe）

- 唯一证据源：`docs/skills/skill-home/t184-bill-recipe.md`（96 行）。所有 `文件:行号` 均指该文件，除第 6 节里明确标注「t184 原文引的仓内路径」的那些。
- 本件只写事实，不写设计结论。`packages/**` 未改，未 `git add`、未 commit。t184:1-6 自述「只读调查：未改任何源码、未 git add／未提交」。

## 0. 一句话回答「照抄哪三件、每个导出什么」

- t184 的逐件表（t184:24-44）中共 19 行；标记栏**逐字等于「照抄」**的只有 3 行：表行 3／2／1（t184:28／27／26，即 `output.ts`／`helpPaths.ts`／`helpFile.ts`）。
- 其余标记为「照抄形状／做法／用例」7 行（t184:26、29、30、31、33、34、35）、「必改」1 行（:37）、「不抄」6 行（:36、39、40、41、43 行内、:38 行内）。
- 取材边界：t184 全篇没有列出任何一个源码件的 `export` 名字；逐件表只给了**函数名与常量名**（t184:26-28、:31-34）。所以本件只能记函数名／常量名，导出名缺失记为事实缺口（第 7 节）。

## 1. 要照抄的是哪几件（bill 侧确切路径）

### 1.1 照抄件 A · `packages/skill-bill/src/render/helpPaths.ts`（55 行）

- 它干什么：命名与落点通式，零 IO，只出初候选（t184:27）。
- 报告给出的内部名（未标 export）：`HELP_HTML_DIR_NAME`（:22）、`LOOKUP_FILE_STEM`（:28）、时间戳与通式（:31-49）逐字照抄；居家要换的常量：目录名＝`home_manager_html`（老口径）、文件名主体＝`居家管家_HELP`（t184:27）。
- 依赖什么：报告只写「零 IO，只出初候选」（t184:27）；第 1 节全行未提它 import 任何 `base-*`（t184:27）。
- 命名通式细节：本地时区、零填充秒、同秒递补从 `_2` 起（t184:72）；判存＋写入两步没有独占性，多进程同秒会交叉覆盖（t184:72）。

### 1.2 照抄件 B · `packages/skill-bill/src/output.ts`（86 行）

- 它干什么：HTML 产物唯一落盘点；`flag:'wx'` 独占创建 ＋ `EEXIST` 递补 `_N` ＋ 绝对路径回执；`explicit` 覆盖写（t184:28）。
- 报告给出的函数名（未标 export）：`nextExclusiveCandidate`（:27-39）、`writeFileExclusiveWithRetry`（:42-58）、`deliverHtml`（:72-86）；三块可直接照抄，只把注释里的技能名改掉（t184:28）。
- 依赖什么：报告未写 import；它靠 `EEXIST` 判递补（t184:74）。
- 成因（要照抄的理由）：这是 `#128` 的修法（:8-14 的因果），判存＋写两步没有独占性，多进程同秒会交叉覆盖（t184:28）。注释里写明「(b) bill 自持一份最小管线，不上移 `base-paint`」（t184:20）。

### 1.3 照抄件 C · `packages/skill-bill/src/render/helpFile.ts`（182 行）

- 它干什么：内容资产＋派生 → 五必填字段＋三块可选内容的**全量 HELP JSON** → `base-paint/help-shell` 全页 HTML；零 IO、零落盘（t184:26）。
- 依赖什么：`import { renderHelpShellHtml } from 'base-paint/help-shell'`（t184:26 记在 :19）；即依赖包名 `base-paint`（目录 `base-render`，见 t184:42、:67）。
- 报告给出的内部名（未标 export）：`deriveSummaryLine`（:100-103）、`buildMetaBlocks`（:106-111）、`buildHelpIndex`（:172-181）；:99-103 域数／场景数／版本一处算、两处用（计数一律派生）（t184:77）。
- 要换的常量：`HELP_FILE_STEM`（:24）、`HELP_FILE_SKILL_NAME`（:26）、`HELP_FILE_TITLE`（:27）、`HELP_FILE_VERSION`（:29，语义是技能数据世代不是 npm 版本）、`HELP_INIT_SCENE_ID`（:31）、`HELP_CONTACT` 三项（:46-53）（t184:26）。
- payload 形状：三块可选内容的字段一律带着、显隐走 `hidden`（:11-17、:115-130）；下游才敢断言同一组字段（t184:78）。首次横幅文案逐字照老实物（:123-126）（t184:91）。

## 2. 明确不要抄的是哪几件、为什么

- 逐件表 `§1` 第 14／15／16 行：`packages/skill-calorie/src/output.ts`（标记「不抄」）——bill 有意只取两小块，卡路里的「命令名→中文段落映射」「动态段」「写不进去就换形态的兜底」是它自己的产物模型；本线目的地是「明确拿到文件」，写不进去就是真失败（exit 5）（t184:39）。
- 同上：`packages/skill-calorie/src/render/helpShell.ts`——卡路里侧转发件（标 deprecated）；新技能直连公共层出口，不再多一层转发（铁律五）（t184:40）。
- 逐件表第 11 行：`packages/base-render/src/helpShell.ts`＋`assets/help-template.html`＋`scripts/gen-help-shell.cjs`（标记「不抄、不改，只 import」）——通用 help 模板的出口与真相源；改模板＝改公共层，走生成器与门（t184:36、:67）。
- 逐件表第 13 行：`tooling/skill-html-snapshot.mjs:43-48`（标记「不抄，注意别被误伤」）——本图只新增 HELP 文件、不动居家 `templates/*.html`，`pnpm snapshot:html:check` 应保持绿（t184:38）。
- 逐件表第 16 行：`packages/skill-home/src/help/lookup.ts`＋`src/render/views.ts:buildHelpItems`（标记「照用不改」）——居家速查表数据源与渲染不必重写；bill 的 `mode:"lookup"`／`q` 两支也是调自己的 `buildHelpLookup()`（`cmd_read.ts:96`、:100）（t184:41）。
- 第 4 行 `src/triggers/wake-assets.ts` 的**落点**不照抄：`src/triggers/` 是工种名，且这份早于 `docs/agents/structure.md` 立规；居家不该照搬这个目录名（铁律四）（t184:29）。第 5 行 `gen-wake-assets.mjs` 的**读取段**要重写（事实源从老实物 HTML payload 换成 `references/scenarios.yaml`）（t184:30）。
- 第 6 行 `src/cli/cmd_read.ts` 是「必须照抄这段形状」，但它同时点名居家现状相反（`dispatch` 里一个 `case` → `openHomeDb`）（t184:31），即：形状抄、居家的开库顺序不能抄。

## 3. 逐件表里「居家要接的东西」列全（每条一句话＋归属哪个新件）

- 渲染入口：`import { renderHelpShellHtml } from 'base-paint/help-shell'`（t184:26）→ 归新件 03-01（内容资产＋派生 → 全量 HELP JSON → 全页 HTML）。
- 模板五键＋可选键的运行时读取在模板里（`help-template.html:1650-1654`：`subtitle`／`meta_blocks`／`init_banner`／`contact`／`version`）；横幅显隐判 `INIT_BANNER.hidden`（:1775）（t184:78）→ 归 03-01（顺着同一入口，不改模板）。
- 徽章类型词只认 5 个：`采集／查看／选择／向导／回执`；居家若要用表外的词＝要改共享模板（公共层变更，另立票）（t184:79）→ 归 03-01 的内容侧选择。
- 命名通式：本地时区、零填充秒、同秒递补从 `_2` 起（`helpPaths.ts:31-49`）（t184:72）→ 归新件命名与落点通式（零 IO）。
- 文件名主体：换成 `居家管家_HELP`；目录名常量换成 `home_manager_html`（老口径）（t184:27）→ 归命名与落点通式件。
- `LOOKUP_FILE_STEM`（bill 自造的速查支名字，老技能没有这一支）；居家要不要分名、叫什么是票 4 的事（t184:27）→ 归命名与落点通式件（待票 4）。
- 落盘点：`flag:'wx'` 独占创建 ＋ `EEXIST` 递补 `_N` ＋ `explicit` 覆盖写；递补只认 `EEXIST`，其余错误原样抛；`nextExclusiveCandidate` 的正则只认 `_\d{8}_\d{6}` 前缀，换命名通式必须同批改它（t184:28、:74）→ 归新件落盘点（独占创建＋递补＋file 态交付）。
- 回执形态：回执路径必须 `resolve()` 成绝对路径（`SKILLS_DB_PATH` 本身可以是相对路径，回传相对串会让下游打开到别处的同名文件）（t184:73）→ 归落盘点件。
- 回执五字段序：用例断言回执五字段序（`help-exit-148.test.mjs:79`）（t184:34）→ 归落盘点件／出口。
- 回执顶层追加 `delivery`（`cmd_read.ts:522-523`）（t184:31）→ 归出口分派（改 `src/cli/cmd_read.ts`）。
- 退出码：渲染失败 exit 5，失败＝exit 5 ＋ stdout 空（`cmd_read.ts:512-521`；用例 `help-exit-148.test.mjs:152-171`）（t184:31、:75）→ 归出口分派件。
- 出口分派形状：`dispatchHelp`（`cmd_read.ts:69-111`）、`helpInitialized`（:84-86，用「DB 文件是否存在」判初始化）、main 里「HELP 在开库之前分派」（:493-495）、交付两分支（:498-510：本键产物 vs 其它命令的收据页）（t184:31）→ 归出口分派件（改 `src/cli/cmd_read.ts`）。
- 开的库／路径解析：居家现状相反——`home.help.lookup` 是 `dispatch` 里的一个 `case`（`packages/skill-home/src/cli/cmd_read.ts:674-678`），而 `dispatch` 第一行就 `openHomeDb`（:56）→ `new DatabaseSync` ＋ `CREATE TABLE IF NOT EXISTS`（`src/fetch/db.ts:54-70`）＝看帮助会把库建出来并跑 DDL（t184:31）；且 `resolveDbPath` 自己会 `mkdirSync`（`skill-home/src/fetch/paths.ts:20-23`）（t184:76）→ 归出口分派件要摆正的既有件顺序。
- 包依赖：依赖闭包加 `base-paint`（`^0.3.0`）（`packages/skill-bill/package.json:24-27`）；居家 `dependencies` 今天只有 `base-link-core`；`base-paint` 的包名与目录名不同（目录 `base-render`／包名 `base-paint`，`packages/base-render/package.json:2`）（t184:42）→ 归 `packages/skill-home/package.json`。
- 构建脚本：`gen:wake-assets` 脚本（`packages/skill-bill/package.json:33`）（t184:42）→ 归 `packages/skill-home/package.json`＋包内 `scripts/gen-wake-assets.mjs`。
- 边界断言：`tooling/check-boundaries.mjs:37` 必须把 `skill-home` 移出 `SKILLS_BASE_FROZEN` 一行，否则 `pnpm boundaries` 红（t184:37、:60、:80）→ 归公共层工具件（不在 `packages/skill-home` 内）。
- 说明面：`packages/skill-home/SKILL.md` 补「HELP 交付」节（节的结构照抄，文字全换）；居家的注入块已有（`packages/skill-home/SKILL.md:24-120`，由 `scripts/build-help.mjs` 重写）；居家 frontmatter `SKILL.md:1` 没有 YAML 头，而插件提供方要解析 frontmatter（t184:32）。

## 4. 报告点名的两处生成物禁手改

### 4.1 `packages/base-render/src/helpShell.ts`（含 `assets/help-template.html`、`scripts/gen-help-shell.cjs`）

- 禁手改原文：「**`packages/base-render/src/helpShell.ts` 是生成物，禁手改**：真相源是 `packages/base-render/assets/help-template.html`，生成器 `scripts/gen-help-shell.cjs`」（t184:67）。
- 为什么禁：它是通用 help 模板的出口与真相源，改模板＝改公共层；Bill 侧只 import，不抄、不改（t184:36、:67）。
- 改源命令原文：「改模板要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`」（t184:67）。

### 4.2 `packages/skill-bill/src/triggers/wake-assets.ts`（986 行，生成物）

- 禁手改原文：「**内容资产也是生成物，禁手改词**：`wake-assets.ts:8-10` 与生成器头注释（`gen-wake-assets.mjs:144-146`）都写明『改内容＝改事实源或改生成器里的新增条目段，再跑生成器』」（t184:68）；该文件在逐件表里被标为「**生成物**」（t184:29）。
- 为什么禁：同上原文；生成器另有 `--check` 只比对分支（t184:30、:68）。
- 改源命（t184 原文只给到脚本名与 `--check`，未给完整命令行；代码块内三处均记为事实缺口）：跑 `packages/skill-bill/scripts/gen-wake-assets.mjs`（t184:30）；`--check` 分支（:243-249）；用法注释（:7-13）（t184:30）；居家同样要留 `--check`（t184:68）。

## 5. 边界／门禁／构建脚本事实（逐条：确切路径 ＋ 行号 ＋ 原文片段）

- 05-01 冻结名单：`tooling/check-boundaries.mjs:37`「`SKILLS_BASE_FROZEN` 名单：这 4 个技能的依赖闭包与源码都不许出现 `base-*`；`skill-home` 在名单里」；不改就红（t184:37、:80）。
- 05-02 两道断言：`tooling/check-boundaries.mjs:39-44` 查依赖闭包、`:45-60` 扫源码与模板；`#145` 对 bill 就是这么做的，`:34-37` 有先例与同批补的注释（t184:37）。
- 05-03 页面快照：`tooling/skill-html-snapshot.mjs:43-48`「五个技能页面产物的逐件 sha256 快照（含 `home`）」；本图只新增 HELP 文件、不动 `templates/*.html`，`pnpm snapshot:html:check` 应保持绿（t184:38、:83）。
- 05-04 资产生成器：`packages/skill-bill/scripts/gen-wake-assets.mjs`（254 行）「`--check` 分支（:243-249）、形状断言（:99-118）、新增条目段（:34-84）、`renderFile` 的『头＋JSON 中段＋尾』（:136-222）、用法注释（:7-13）」；形状断言 fail-closed（t184:30）。事实源是老实物 HTML 里的 `<script id="help-data">` payload（:25-31 的 `DEFAULT_SRC`／`DATA_OPEN`）（t184:30）。
- 05-05 家居注入脚本：`packages/skill-home/scripts/build-help.mjs`（42 行）「构建期把唤醒词速查块注入 `SKILL.md`（只重写标记块）」；居家已同形（:13-20、:22-31），但**不保换行**：bill 那份 `:34-37` 按检出换行写回，居家那份 `:28` 直接拼 `'\n'`（t184:44、:71）。
- 05-06 bill 侧注入脚本：`packages/skill-bill/scripts/build-help.mjs`（42 行）同款，`SKILL.md` 注入件要保检出换行——bill 那份做了（`scripts/build-help.mjs:34-37`）（t184:44、:71）。
- 05-07 边界文件名另一处：`docs/agents/structure.md:44-49`「铁律四要求『能力目录名取自 HELP 的一级分组，目录里的文件名与公开接口名取自下一级』」；映射目录名取自那 9 个域（写成英文名）（t184:48）。
- 05-08 门未实测：「本票**没跑任何门**（`pnpm boundaries`／`pnpm test`／`pnpm snapshot:html:check`）：只读调查……第 2／3 节里的相关判断来自源码逐行阅读」（t184:97）。
- 05-09 包内脚本门缺口：`packages/skill-home/package.json` 的 `scripts.test` 只跑 `../../test/scaffold.test.mjs`，而 bill 是 `node --test test/*.test.mjs`；根 `pnpm test` 的 glob 已含 `packages/skill-home/test/*.test.mjs`，但「包里绿」不能当门用（t184:82）。
- 05-10 快照二次点名：`tooling/skill-html-snapshot.mjs:43-48` 的清单含 `home`（t184:83）。
- 05-11 全局测试会改别的文件：根 `pnpm test` 会顺手改写其他技能的 `SKILL.md`，跑完 `git checkout` 还原（t184:81）。
- 05-12 构建纪律：变异自证／改源后必须 `tsc -b --force` 干净重建（`Copy-Item` 保留旧 mtime 会让增量编译认为源未变，陈旧 `dist` 假红）（t184:69）。
- 05-13 测试跑的是 `dist`：模块级用例从 `../dist/...` 导入（`help-delivery-144.test.mjs:11-12`），出口用例 spawn `dist/cli/cmd_read.js`（`help-exit-148.test.mjs:17`）；仓内既有 `dist` 是提交进来的（t184:70、:84）。
- 05-14 编码与换行：源码与文档 UTF-8 无 BOM；`HELP_SHELL_PREFIX`／`SUFFIX` 字面量内含 CRLF（`helpShell.ts:42`、:45），逐字断言别按 LF 硬编码（t184:71）。

## 6. 其它被点名的测试件（供下一棒复核，非照抄主件）

- `packages/skill-bill/test/help-delivery-144.test.mjs`（146 行）模块级锁：:22-28 通式、:30-38 初候选不建目录、:48-58 同秒三写不被覆盖、:60-74 `explicit` 优先且覆盖写、:77-96 真 spawn 拿文件且目录里 0 个 `.db`、:134-145 父级是文件 → exit 5（t184:33）。
- `packages/skill-bill/test/help-exit-148.test.mjs`（171 行）真 spawn 出口锁：从 `base-paint/help-shell` 直接取 `HELP_SHELL_PREFIX/SUFFIX/DATA_OPEN/TITLE_SLOT` 做逐字断言（:14、:95-97）；并发用异步 `spawn`（:35-46）；:123-129 只断言「同秒各次占不同槽位且必有一次拿本体名」，不把进程调度当契约（t184:34）。
- `packages/skill-bill/test/wake-assets.test.mjs`（93 行）资产锁：摘要锁（:14、:50-55）比逐字抄一份更耐改；双向对账（:68-84）——居家要同形，对着 `home` 的 91 条唤醒词／21 条命令做（t184:35）。
- 居家测试建议落点：`packages/skill-home/test/help-delivery-*.test.mjs`（模块级）＋`help-exit-*.test.mjs`（真 spawn）＋资产锁（t184:59）。

## 7. 证据缺口（t184 未写、下一棒需实地复核）

- 07-01 全篇未给任何源码件的 `export` 名（逐件表只有函数名／常量名，见第 0、1 节）——「导出名」这一项在 t184 里无仓内依据。
- 07-02 4.2 的完整改源命令行未给；t184 只给到脚本名与 `--check`／`:243-249`／`:7-13`（t184:30、:68）。
- 07-03 bill 的 `resolveDbPath`／`resolveDbDir` 未逐行读（`packages/skill-bill/src/fetch/paths.ts`）；「判初始化」怎么实现要读 bill 那份才能照抄（t184:88）。
- 07-04 `#147` 裁决只见注释「走 (b) bill 自持一份最小管线，不上移 `base-paint`」（`helpPaths.ts:3-6`、`output.ts:3-6`）；是否还有别的约束无依据（t184:89）。
- 07-05 居家 HELP 五字段取值无仓内依据（`title`／`contact` 三项／`version`／首次使用横幅文案）（t184:91）；老家 `templates/help_center.html` 注入契约未读（t184:92）；3 条带 `(HTML)` 唤醒词与 4 条 HELP 短语归属未定（t184:93）；居家 `init_banner` 显隐口径未定（t184:94）。

---

- 补一句给 t184 主人：本件第 1.1／1.2／1.3 三节只记下函数名与常量名，三件的 `export` 名单请补一行（写清每份导出的名字），否则「照抄三件的导出名」这一项在证据链上是空的。
