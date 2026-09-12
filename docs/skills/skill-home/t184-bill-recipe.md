# t184 · 饼干记账 HELP 交付实现逐件读懂 → 居家照抄清单

> 票：`#184`（地图 `#143`→`#183` 票 1，research）。
> 只读调查：**未改任何源码**、未 `git add`／未提交、未动 GitHub issue。
> 事实出处一律「仓内路径:行号」，写法照 `docs/agents/wording.md`（共享 help 模板，不写「壳」；`home.help.lookup` 这类叫「命令」，不叫「键」）。
> 本票**不出决定**：命名落盘管线的归属（自持还是收成共用位）是票 4（`#187`）的事；内容骨架与英文域名的定案在票 2（`#185`）。

## 0. 样板地图（bill 侧的八个件是哪些提交落的）

`git show --stat` 实测（本仓 `git log`）：

| 票 | 提交 | 落的件 |
|---|---|---|
| `#146` | `848b7a4` | `skills-bill/scripts/gen-wake-assets.mjs`、`src/triggers/wake-assets.ts`、`test/wake-assets.test.mjs` |
| `#145` | `f312f88` | `src/render/helpFile.ts`、`src/render/index.ts`、`src/render/errors.ts`、`package.json`（＋`base-render/src/helpShell.ts` 与生成器、`tooling/check-boundaries.mjs` 两处小改） |
| `#144` | `bfc51bf` | `src/output.ts`、`src/render/helpPaths.ts`、`src/cli/cmd_read.ts`（`dispatchHelp` 抬到开库之前）、`test/help-delivery-144.test.mjs` |
| `#148` | `1f86e7b` | `test/help-exit-148.test.mjs`（真 spawn 出口锁） |
| `#149` | `0364326` | `SKILL.md`「HELP 交付」节 |
| `#150` | `fe1117e` | `plugin-bill-ilife` 技能提供方＋真机接线 |
| `#147`／`#151` | 无提交 | `#147` 是归属裁决（只在源码注释里留话，见 `src/render/helpPaths.ts:3-6`、`src/output.ts:3-6`「(b) bill 自持一份最小管线」）；`#151` 是真机＋肉眼终审 |

## 1. 逐件一行表

| # | 仓内路径 | 它干什么（一句话） | 居家 | 理由／要改什么 |
|---|---|---|---|---|
| 1 | `packages/skill-bill/src/render/helpFile.ts`（182 行） | 内容资产＋派生 → 五个必填字段＋三块可选内容的全量 HELP JSON → `base-paint/help-shell` 全页 HTML（零 IO、零落盘） | **照抄形状，改常量与文案** | 接线做法照抄：`import { renderHelpShellHtml } from 'base-paint/help-shell'`（:19）；派生而不是写死数字的做法照抄（`deriveSummaryLine` :100-103、`buildMetaBlocks` :106-111、`buildHelpIndex` :172-181）。必须换的常量：`HELP_FILE_STEM`（:24）、`HELP_FILE_SKILL_NAME`（:26）、`HELP_FILE_TITLE`（:27）、`HELP_FILE_VERSION`（:29，语义是技能数据世代不是 npm 版本）、`HELP_INIT_SCENE_ID`（:31）、`HELP_CONTACT` 三项（:46-53）
| 2 | `packages/skill-bill/src/render/helpPaths.ts`（55 行） | 命名与落点通式（零 IO，只出初候选）：目录名／文件名主体／本地时间戳／`_N` 递补式 | **照抄通式，换常量** | `HELP_HTML_DIR_NAME`（:22）＝居家的 `home_manager_html`（老口径，见 `docs/skills/skill-home/map-183-body.md:3`、`:22`）；文件名主体换成 `居家管家_HELP`；时间戳与通式（:31-49）逐字照抄。`LOOKUP_FILE_STEM`（:28）是 bill 自造的速查支名字（老技能没有这一支），居家要不要分名、叫什么是票 4 的事 |
| 3 | `packages/skill-bill/src/output.ts`（86 行） | HTML 产物唯一落盘点：`flag:'wx'` 独占创建 ＋ `EEXIST` 递补 `_N` ＋ 绝对路径回执；`explicit` 覆盖写 | **照抄** | 这是 `#128` 的修法（:8-14 的因果）：判存＋写两步没有独占性，多进程同秒会交叉覆盖。`nextExclusiveCandidate`（:27-39）／`writeFileExclusiveWithRetry`（:42-58）／`deliverHtml`（:72-86）三块可直接照抄，只把注释里的技能名改掉 |
| 4 | `packages/skill-bill/src/triggers/wake-assets.ts`（986 行，**生成物**） | 内容资产 typed const：域→二级组→场景三层，74 场景逐字；并派生扁平表、id 索引、4 条 HELP 短语 | **内容全换；落点不照抄** | 派生段照抄（`WAKE_ASSETS` :968-970、`SCENE_BY_ID` :973-975、`WAKE_ASSET_TOTAL` :978、`HELP_WAKE_WORDS` 从口径层 `WAKE_TABLE` 派生 :984-986）。落点 `src/triggers/` 是**工种名**，且这份早于 `docs/agents/structure.md` 立规（该文件晚于 `fe1117e` 才提交）——居家不该照搬这个目录名（铁律四，见第 2 节） |
| 5 | `packages/skill-bill/scripts/gen-wake-assets.mjs`（254 行） | 机器生成资产：读仓外事实源 → 逐字 `JSON.stringify` → 落盘；`--check` 只比对；形状断言 fail-closed | **做法照抄，读取段要重写** | 照抄：`--check` 分支（:243-249）、形状断言（:99-118）、新增条目段（:34-84）、`renderFile` 的「头＋JSON 中段＋尾」（:136-222）、用法注释（:7-13）。**要重写**：bill 的事实源是老实物 HTML 里的 `<script id="help-data">` payload（:25-31 的 `DEFAULT_SRC`／`DATA_OPEN`）；居家老家的事实源是 `references/scenarios.yaml`（`map-183-body.md:23`），读取与形状断言都得按 YAML 重写 |
| 6 | `packages/skill-bill/src/cli/cmd_read.ts`（526 行） | 唯一出口。`bill.help.lookup` 的三个分支：缺省＝HELP 文件、`mode:"lookup"`＝速查表、`q`＝现找；**全部在开库之前分派** | **必须照抄这段形状** | `dispatchHelp`（:69-111）、`helpInitialized`（:84-86，用「DB 文件是否存在」判初始化）、main 里的路由（:493-495「HELP 在开库之前分派」）、交付分支（:498-510：本键产物 vs 其它命令的收据页）、退出码映射（:512-521 渲染失败 exit 5）、回执顶层追加 `delivery`（:522-523）。**居家现状相反**：`home.help.lookup` 是 `dispatch` 里的一个 `case`（`packages/skill-home/src/cli/cmd_read.ts:674-678`），而 `dispatch` 第一行就 `openHomeDb`（:56）→ `new DatabaseSync` ＋ `CREATE TABLE IF NOT EXISTS`（`src/fetch/db.ts:54-70`）＝看帮助会把库建出来并跑 DDL |
| 7 | `packages/skill-bill/SKILL.md`（126 行） | 说明面：「HELP 交付」节（:112-120）＋ 构建期注入的联动速查块（:26-110）＋ frontmatter description（:3） | **照抄节的结构，文字全换** | 居家的注入块已有（`packages/skill-home/SKILL.md:24-120`，由 `scripts/build-help.mjs` 重写）；缺的是「HELP 交付」这一节（缺省即交付物／完成标准＝`delivery.path` 真存在且字节相符／两支显式参数的语义／`--html` 语义／边界）。另注意居家 frontmatter：`packages/skill-home/SKILL.md:1` **没有 YAML 头**（无 `name:`／`description:`），而插件提供方要解析 frontmatter（见第 9 行）——票 10 会撞上 |
| 8 | `packages/skill-bill/test/help-delivery-144.test.mjs`（146 行） | 模块级锁：命名通式／独占递补／`explicit` 覆盖／端到端冒烟／落盘失败 exit 5 | **照抄用例形状** | :22-28 通式、:30-38 初候选不建目录、:48-58 同秒三写不被覆盖、:60-74 `explicit` 优先且覆盖写、:77-96 真 spawn 拿文件且**目录里 0 个 `.db`**、:134-145 父级是文件 → exit 5 |
| 9 | `packages/skill-bill/test/help-exit-148.test.mjs`（171 行） | 真 spawn 出口锁（`#148`）：5 例——名字通式与回执、help 模板前后缀逐字、并发 6 次独占递补、两支产物互不串、参数与退出码矩阵 | **照抄用例形状，换常量与计数** | 从 `base-paint/help-shell` 直接取 `HELP_SHELL_PREFIX/SUFFIX/DATA_OPEN/TITLE_SLOT` 做逐字断言（:14、:95-97）；并发用异步 `spawn`（:35-46，注释写明 `spawnSync` 会把并发串成串行）；:79 断言回执五字段序；:123-129 只断言「同秒各次占不同槽位且必有一次拿本体名」，**不**把进程调度当契约 |
| 10 | `packages/skill-bill/test/wake-assets.test.mjs`（93 行） | 资产锁：三层计数／域顺序／字段／老条目 SHA-256 摘要／与口径层 `WAKE_TABLE` 双向对账 | **照抄锁法** | 摘要锁（:14、:50-55）比逐字抄一份更耐改；双向对账（:68-84：现表功能短语条条有场景、场景唤醒词条条在现表、HELP 短语不进场景目录防自指）——居家要同形，对着 `home` 的 91 条唤醒词／21 条命令做 |
| 11 | `packages/base-render/src/helpShell.ts`（83 行）＋ `assets/help-template.html`＋`scripts/gen-help-shell.cjs` | 通用 help 模板的出口与真相源（`base-paint/help-shell`） | **不抄、不改，只 import** | 直连 `renderHelpShellHtml(data)`（`helpShell.ts:73-80`、:83）；五键＋可选键的运行时读取在模板里（`help-template.html:1650-1654`：`subtitle`／`meta_blocks`／`init_banner`／`contact`／`version`）。改模板＝改公共层，走生成器与门，见第 3 节陷阱 1 |
| 12 | `tooling/check-boundaries.mjs:37` | `SKILLS_BASE_FROZEN` 名单：这 4 个技能的依赖闭包与源码都不许出现 `base-*`；`skill-home` 在名单里 | **必改（一行）** | 不把 `skill-home` 移出名单，一 import `base-paint` 就 `FAIL`（:39-44 查依赖闭包、:45-60 扫源码与模板）。`#145` 对 bill 就是这么做的，:34-37 有先例与同批补的注释 |
| 13 | `tooling/skill-html-snapshot.mjs:43-48` | 五个技能页面产物的逐件 sha256 快照（含 `home`） | **不抄，注意别被误伤** | 本图只**新增** HELP 文件、不动居家的 `templates/*.html`，`pnpm snapshot:html:check` 应保持绿；一旦变红说明误改了页面 |
| 14 | `packages/skill-calorie/src/output.ts` | 卡路里那一套：`chineseCommandFor`(:58)／`htmlFileName`(:88)／`LEGACY_COMMAND_OVERRIDES`(:257)／`dynamicSegmentFor`(:272)／`writeSuffixFor`(:284)／回执落点(:239)／三态 `HtmlDelivery`(:189)／只读回退(:184) | **不抄** | bill 有意只取两小块，理由写在 `src/output.ts:1-22` 与 `helpPaths.ts:1-18`：卡路里的「命令名→中文段落映射」「动态段」「写不进去就换形态的兜底」是它自己的产物模型；本线的目的地是「明确拿到文件」，写不进去就是真失败（exit 5） |
| 15 | `packages/skill-calorie/src/render/helpShell.ts` | 卡路里侧的转发件（标 deprecated，转发到 `base-paint/help-shell`） | **不抄** | 新技能直连公共层出口，不再多一层转发（铁律五） |
| 16 | `packages/skill-home/src/help/lookup.ts` ＋ `src/render/views.ts:buildHelpItems` | 居家现有的速查表数据源与渲染（`home.help.lookup` 唯一出口 `packages/skill-home/src/help/index.ts:1`） | **照用不改** | bill 的 `mode:"lookup"`／`q` 两支也是调自己的 `buildHelpLookup()`（`cmd_read.ts:96`、:100）；居家同形，不必重写 |
| 17 | `packages/skill-bill/package.json:24-27` | 依赖闭包加 `base-paint`（`^0.3.0`）＋ `gen:wake-assets` 脚本（:33） | **照抄** | 居家的 `package.json` 的 `dependencies` 今天只有 `base-link-core`；`base-paint` 的包名与目录名不同（目录 `base-render`／包名 `base-paint`，`packages/base-render/package.json:2`） |
| 18 | `packages/plugin-bill-ilife/src/skill-provider.ts`（128 行） | 插件侧最小装机：按包名 resolve 技能包的 `SKILL.md`、最小 frontmatter 解析、注册提供方（rank 600／`bundled`） | **照抄（票 10 的活）** | 居家侧**还没有**这个文件：`packages/plugin-home-ilife/src/` 只有 `bridge.ts`／`client.ts`／`index.ts`／`settings.ts`／`slot.ts`（且没有 `dsh-ctx.ts`）。要照抄的不止这一份：还有 `inject: ['skills']` ＋ `apply` 里 `registerProvider` ＋「已注册即退让」的写法（`plugin-bill-ilife/src/index.ts:10-35`）与 `test/skills-provider.test.mjs` |
| 19 | `packages/skill-bill/scripts/build-help.mjs`（42 行） | 构建期把唤醒词速查块注入 `SKILL.md`（只重写标记块） | **居家已有同形件，补一处** | `packages/skill-home/scripts/build-help.mjs` 已是同形（:13-20、:22-31），但**不保换行**：bill 那份 `:34-37` 按检出换行写回（CRLF 检出仍 CRLF），居家那份 `:28` 直接拼 `'\n'` |

## 2. 居家要新建哪些件（候选清单＋建议落点，**不定案**）

铁律四要求「能力目录名取自 HELP 的一级分组，目录里的文件名与公开接口名取自下一级」（`docs/agents/structure.md:44-49`）；地图已裁「新增／改动的 HELP 相关件，目录名取自那 9 个域（写成英文名）」（`docs/skills/skill-home/map-183-body.md:28`）。那 9 个域的英文名在票 2（`#185`）的对账表里定（`#185` 票面给的现有名字是 `items／space／outfit／stats／express／receipt／family／setup／link`）。

| 建议新建／改动的件 | 建议落点 | 建议理由 |
|---|---|---|
| 内容资产（typed const，机器生成） | `src/help/assets.ts`（**或**票 2 给 HELP 短语定的那个域目录下） | 居家的 `home.help.lookup` 出口已经住在 `src/help/`（`src/help/index.ts:1`），HELP 交付与它同属一件事；**不照抄** bill 的 `src/triggers/`（工种名，见第 1 节第 4 行）。若票 2 把 3 条 HELP 唤醒词判给某个域（例如「开始使用／初始化运维」），则该目录名以票 2 的对照表为准 |
| 内容资产生成器 | `packages/skill-home/scripts/gen-wake-assets.mjs` | 一次性脚本住包内 `scripts/`（`structure.md:69`），与既有的 `scripts/build-help.mjs` 并列 |
| 渲染接线（资产＋派生 → 全量 HELP JSON → 通用 help 模板） | `src/help/fileData.ts`（bill 叫 `helpFile.ts`） | 与资产同目录；bill 的这份是零 IO 纯函数（`helpFile.ts:1-3`） |
| 命名与落点通式（零 IO） | `src/help/paths.ts`（bill 叫 `render/helpPaths.ts`） | 与上面两件同属「HELP 交付」这一件事 |
| 落盘点（独占创建＋递补＋file 态交付） | `src/help/output.ts`（bill 放在 `src/output.ts` 根位） | bill 的 `src/output.ts` 是**存量位**（同根还有 `src/index.ts`）；新件按铁律摆进能力目录更合规矩 |
| 出口分派 | 改 `src/cli/cmd_read.ts`（bill 把 `dispatchHelp` 内联在 `cmd_read.ts:69-111`） | 照抄 bill 的形状最省事；`cmd_read.ts` 现 741 行，是否顺手抽件属票 7（`#190`）的取舍 |
| 口径层唤醒词 | 改 `src/policy/wakewords.ts`（已有 91 条）；HELP 短语 3 条已在 `SKILL.md:27-29` | 唤醒词的单一事实源在口径层（bill 的 `HELP_WAKE_WORDS` 就是从 `WAKE_TABLE` 派生，`wake-assets.ts:984-986`）。**注意居家是 3 条不是 4 条** |
| 测试两套 | `packages/skill-home/test/help-delivery-*.test.mjs`（模块级）＋ `help-exit-*.test.mjs`（真 spawn）＋ 资产锁（可挂 `test/wake-assets.test.mjs`） | 照 bill 的分工：`#144` 那套锁命名与落盘，`#148` 那套只经真 spawn 锁出口 |
| 包依赖与边界断言 | `packages/skill-home/package.json` 加 `base-paint`；`tooling/check-boundaries.mjs` 移出 `skill-home` | 两处同批改，否则 `pnpm boundaries` 红 |
| 说明面 | `packages/skill-home/SKILL.md` 补「HELP 交付」节；frontmatter 是否需要 `name`／`description` 与票 10 一起定 | 插件提供方按 frontmatter 解析（`plugin-bill-ilife/src/skill-provider.ts:49-70`） |
| 插件侧最小装机 | `packages/plugin-home-ilife/src/skill-provider.ts` ＋ `dsh-ctx.ts` ＋ `index.ts` 的注册 ＋ `test/skills-provider.test.mjs` | 归票 10（`#193`），本图唯一的无阻塞实施票 |
| 三份调查／设计文档 | `docs/skills/skill-home/` | 文档归属纪律（`AGENTS.md`：技能文档落 `docs/skills/<件名>/`）；地图里已存了各子票票面（`t187-body.md`／`t190-body.md`／`t194-body.md` 等） |

## 3. 照抄的陷阱

1. **`packages/base-render/src/helpShell.ts` 是生成物，禁手改**：真相源是 `packages/base-render/assets/help-template.html`，生成器 `scripts/gen-help-shell.cjs`；改模板要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`（`helpShell.ts:1-12`；`packages/base-render/package.json:25-26`）。
2. **内容资产也是生成物，禁手改词**：`wake-assets.ts:8-10` 与生成器头注释（`gen-wake-assets.mjs:144-146`）都写明「改内容＝改事实源或改生成器里的新增条目段，再跑生成器」。居家同样要留 `--check`。
3. **变异自证／改源后必须 `tsc -b --force` 干净重建**：`#148` 票面留痕——`Copy-Item` 保留旧 mtime 会让增量编译认为源未变，`dist` 仍带变异产物，于是「还原后仍红」（陈旧 `dist` 假红）。
4. **测试跑的是 `dist`**：模块级用例从 `../dist/...` 导入（`help-delivery-144.test.mjs:11-12`），出口用例 spawn `dist/cli/cmd_read.js`（`help-exit-148.test.mjs:17`）。改完源码不重建＝测的是旧产物。
5. **换行与编码**：源码与文档 UTF-8 无 BOM；`HELP_SHELL_PREFIX`／`SUFFIX` 字面量内含 CRLF（`helpShell.ts:42`、:45），逐字断言别按 LF 硬编码。`SKILL.md` 注入件要保检出换行——bill 那份做了（`scripts/build-help.mjs:34-37`），居家那份没做（`scripts/build-help.mjs:28`）。
6. **命名通式**：本地时区、零填充秒、同秒递补从 `_2` 起（`helpPaths.ts:31-49`；用例 `help-delivery-144.test.mjs:22-28`）。**判存＋写入两步没有独占性**——多进程同秒会交叉覆盖，必须 `wx` ＋ `EEXIST` 递补（`output.ts:8-14`）。
7. **回执路径必须 `resolve()` 成绝对路径**：`SKILLS_DB_PATH` 本身可以是相对路径，回传相对串会让下游打开到别处的同名文件（`output.ts:16-18`）。
8. **递补只认 `EEXIST`**：其余错误原样抛（`output.ts:14`），别把权限／路径错伪装成「换个名再写一次」；`nextExclusiveCandidate` 的正则只认 `_\d{8}_\d{6}` 前缀（`output.ts:27-39`），换命名通式必须同批改它。
9. **失败＝exit 5 ＋ stdout 空**：`cmd_read.ts:512-521`；用例 `help-exit-148.test.mjs:152-171`。bill 有意不引入「写不进去就换形态」的兜底（`output.ts:19-21`）。
10. **看帮助不许把库建出来**：bill 靠「在开库之前分派」（`cmd_read.ts:493-495`）＋「用 DB 文件是否存在判初始化」（:84-86），用例断言产物目录里 0 个 `.db`（`help-delivery-144.test.mjs:94-95`）。居家现状会建库（`skill-home/src/cli/cmd_read.ts:56` ＋ `src/fetch/db.ts:54-70`），且 `resolveDbPath` 自己会 `mkdirSync`（`skill-home/src/fetch/paths.ts:20-23`）——照抄前先把这条摆正。
11. **计数一律派生，不写第二份数字**：`helpFile.ts:99-103`（域数／场景数／版本一处算、两处用）、:172-181（域级索引计数）；`wake-assets.ts:977-978` 注释写明「单源不复写第二遍数」。
12. **三块可选内容的字段一律带着、显隐走 `hidden`**：`helpFile.ts:11-17`、:115-130；模板运行时读 `meta_blocks`／`init_banner`／`version`（`help-template.html:1650-1654`），横幅显隐判 `INIT_BANNER.hidden`（:1775）。payload 形状不随状态变，下游才敢断言同一组字段。
13. **徽章类型词只认 5 个**：`采集／查看／选择／向导／回执`（`help-template.html:1698` 的 `TYPE_DEFAULT`；生成器断言同表，`gen-wake-assets.mjs:109-115`）。居家若要用表外的词＝要改共享模板（公共层变更，另立票）。
14. **`tooling/check-boundaries.mjs` 不改就红**：`skill-home` 现在 `SKILLS_BASE_FROZEN` 名单里（:37），一 import `base-paint` 就被依赖闭包与源码两道断言拦下（:39-60）。
15. **根 `pnpm test` 会顺手改写其他技能的 `SKILL.md`**：地图已记这条已知问题（`map-183-body.md:33`），跑完 `git checkout` 还原，别把别人的文件混进提交。
16. **包内 `test` 脚本盖不到新用例**：`packages/skill-home/package.json` 的 `scripts.test` 只跑 `../../test/scaffold.test.mjs`，而 bill 是 `node --test test/*.test.mjs`。根 `pnpm test` 的 glob 已含 `packages/skill-home/test/*.test.mjs`，但「包里绿」不能当门用——要么改包内脚本，要么把门写成根命令。
17. **快照别被误伤**：`tooling/skill-html-snapshot.mjs:43-48` 的清单含 `home`；本图只新增 HELP 文件、不动页面模板，`pnpm snapshot:html:check` 应保持绿。
18. **旧 `dist` 假红**：见陷阱 3、4；另外仓内既有 `dist` 是提交进来的，改源码后要重跑构建再跑测试。

## 4. 没读透／拿不准的

1. **bill 的 `resolveDbPath`／`resolveDbDir` 未逐行读**（`packages/skill-bill/src/fetch/paths.ts`）。`cmd_read.ts:85` 用 `existsSync(resolveDbPath())` 判初始化，所以它大概率不建目录；而居家的同名函数会 `mkdirSync`（`skill-home/src/fetch/paths.ts:20-23`）。「判初始化」到底怎么实现，要读 bill 那份才能照抄。
2. **`#147` 的裁决全文没读到**：只见源码注释「走 (b) bill 自持一份最小管线，不上移 `base-paint`」（`helpPaths.ts:3-6`、`output.ts:3-6`）。它是否还有别的约束（例如是否要求卡路里／记账两份将来合并）本票没有依据。
3. **卡路里侧的 `helpFile.ts`／`helpCenter.ts`／`help.ts` 只读了头注释与出口引用**，没逐行读。若票 4 判「收成共用位」，这三份要一起看（bill 的注释已声明它与卡路里的差异）。
4. **居家 HELP 那五个字段的具体取值没有仓内依据**：`title`／`contact` 三项／`version`（技能数据世代）／首次使用横幅文案，bill 是逐字照老实物（`helpFile.ts:5-9`、:45-53、:123-126），而居家的老实物（`D:\2Study\StudyNotes\SKILLS\居家管家\居家管家.html`）不在仓内、本席未读。归票 3（`#186`）与票 6（`#189`）。
5. **老家 `templates/help_center.html` 的注入契约未读**：属票 3（`#186`）范围。
6. **3 条带 `(HTML)` 的唤醒词与 4 条 HELP 短语的去留／归属域未定**：属票 2（`#185`）。这直接决定第 2 节里内容资产与交付件的目录名。
7. **居家的 `init_banner` 显隐口径未定**：老家是「DB 文件存在＝已初始化」（`map-183-body.md:66` 把它列为 Not yet specified），本票只摆出 bill 的实现与其取舍（误显的代价小于误藏，`helpFile.ts:85-86`）。
8. **`plugin-bill-ilife` 的 `dsh-ctx.ts`／`bridge.ts` 只读了 `index.ts` 与 `skill-provider.ts`**；票 10 动手前要把 `plugin-home-ilife` 与 `plugin-bill-ilife` 逐件对差（居家侧缺 `dsh-ctx.ts`）。
9. **本票没跑任何门**（`pnpm boundaries`／`pnpm test`／`pnpm snapshot:html:check`）：只读调查，故「检查器当前是否已能过」没有实测证据，第 2／3 节里的相关判断来自源码逐行阅读。
