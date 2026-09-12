# 票 #187 取证事实（只读；行号一律＝仓内路径:行号）

## A · 落盘／命名共用件

### A1 `base-paint/save-html` 对外导出（唯一定义地 `packages/base-render/src/output/saveHtml.ts`；出口映射 `packages/base-render/package.json:12`，包名 `base-paint`）
- `HtmlOnExists`（:58）撞名四态 `succession`／`overwrite`／`fail`／`{reuse: byDay|byContent|{byAge}}`；只表态撞名，不改名字解释。
- `HELP_REUSE_DEFAULT_HOURS`（:69）＝24；HELP 产物的缺省复用窗口（一天）。
- `HtmlLanding`（:75）落点意图 `{dir, stem}`（stem 不含扩展名）。
- `HtmlReceipt`（:81）回执 `{mode:'file', path 恒绝对, bytes 实际落盘}`。
- `reuseWindowOfHours`（:112）小时→毫秒；`undefined`／空串＝缺省（有 `defaultHours` 用它，否则 `0`＝每次新），`0`＝每次新，正有限数＝该窗口，其余抛 `RangeError`（:116／:120）。
- `helpReuseWindowOf`（:136）工厂：把 `RangeError` 交给各家 `fail(2)`（:139-146）。
- `saveHtmlFile`（:339）唯一落盘点（对外唯一函数）：两个名字口子 `stem`／`file`、四态、回执。
- 归类·命名通式：`resolveName`(:196)／`formatStamp`(:185，本地时间 `YYYYMMDD_HHMMSS`)／`ownNameRe`(:255)／`HTML_EXT`(:88)。
- 归类·独占写＋递补：`tryCreateExclusive`(:233，`flag:'wx'`)／`nextCandidate`(:217，`_N` 无则 `_2`)／`SUCCESSION_LIMIT`(:94)。
- 归类·复用：`reuseByDay`(:270)／`reuseByAge`(:302)／`reuseByContent`(:321)。归类·回执：`receiptOf`(:244)。

### A2 使用方（全部 `import … from 'base-paint/save-html'`，共 5 家）
- skill-bill：`src/output.ts:24`；`src/cli/cmd_read.ts:31`（`helpReuseWindowOf`）。调用点 `src/output.ts:49`／`:54`。
- skill-calorie：`src/output.ts:30`；`src/cli/cmd_read.ts:118`（`type HtmlLanding`）。调用点 `src/output.ts:242`／`:248`／`:259`。
- skill-chef：`src/help/output.ts:32`；`src/cli/cmd_read.ts:34`。调用点 `src/help/output.ts:57`／`:63`。
- skill-schedule：`src/help/output.ts:32`；`src/cli/cmd_read.ts:36`。调用点 `src/help/output.ts:68`／`:80`。
- skill-memo-ilife：`src/cli/cmd_read.ts:8`。调用点 `src/cli/cmd_read.ts:93`／`:98`。
- 依赖声明：bill／calorie／chef／schedule／memo 的 `package.json` 各有 `"base-paint": "^0.3.0"`（分别在 :26／:22／:26／:26／:26），目录＝`packages/base-render`。
- skill-home **不在名单**：`packages/skill-home/package.json:24-26` 只依赖 `base-link-core`；`src/` 无 `output.ts`、无 `helpPaths.ts`。

### A3 `packages/skill-bill/src/output.ts`（60 行）自持 vs 委派
- 自持·出口裁决：`explicit` 优先 `target`（:47-50）、两者都缺即抛（:51-53）；`explicit` 不吃复用、`--html`＝覆盖写不递补（:34-37）。
- 自持·不另立定义：`HtmlDelivery = HtmlReceipt`（:27）、`export type { HtmlLanding }`（:31）；写不进去＝真失败 exit 5，不引 inline 回退（:19-21）。
- 委派：`explicit` → `{dir: dirname(abs), file: basename(abs), onExists:'overwrite'}`（:49）。
- 委派：`target` → `{dir, stem}`（用共用件缺省 `succession`）；`target` ＋ `reuseMs` → `onExists:{reuse:{byAge}}`（:54-58）。
- 委派：命名通式／时间戳／`_N`（:35 注释）、绝对路径与字节回执（:26）。`reuseMs` 由出口算好，本件不调换算器（:40）。

### A4 chef／schedule 的落盘件（两家都委派）
- chef `packages/skill-chef/src/help/output.ts`（66 行）`deliverChefHelp:46`；空正文抛 `CHEF_BAD_PAYLOAD`（:52-54，自持）；`explicit`→覆盖写（:55-58）；`target` 缺即抛（:59-61）；`reuseMs`→`{reuse:{byAge}}`（:62-65）。渲染件 `src/help/helpFile.ts:252` 只出 `{dir, stem}`，不碰 fs（`output.ts:8` 自述为本包唯一碰 fs 的 HELP 件）。
- schedule `packages/skill-schedule/src/help/output.ts`（89 行）`deliverHtml:58`；`explicit`→覆盖写＋失败翻 `writeFailed`（:65-73）；缺落点抛 `SCHEDULE_HTML_TOO_LARGE`（:75-78）；`targetDir`＋`stem`→委派（:79-86）。目录由 `helpPaths.resolveHelpDir` 算（:51）。
- 两家分界与 bill 同形：自家值（目录／主体／错误类型／入参形状）自持；命名＋独占写＋递补＋回执＋换算委派。缺省窗口「各技能出口一律给缺省一天」（chef `output.ts:45`）。

### A5 结论：居家落一份 HELP 文件，哪些必须走共用件、哪些该自持
- **必须走共用件**（今天唯一定义地，且 5 家已在用）：①命名通式——扩展名、时间戳格式、同秒 `_N`（`:88`／`:185`／`:196`／`:217`）；②独占创建 `wx` 与 `overwrite`／`fail`（`:233`／`:356-374`）；③复用窗口判据＋「小时→毫秒＋坏参」口径（`:270`／`:302`／`:321`／`:112`／`:136`）；④绝对路径＋实际字节回执（`:244`）。
- **该自持**（各家互不相同、共用件里没有）：①落点目录名与文件名主体常量（bill `src/render/helpPaths.ts:16`／`:20`；calorie `src/render/helpPaths.ts:18`／`:23`、`src/render/helpFile.ts:26`）；②`explicit`／`target` 谁优先与 `--html` 语义（bill `src/output.ts:34-37`／`:47-50`）；③`reuseMs` 是否给（缺省一天）＋「哪些主体算 HELP 产物」白名单（calorie `src/output.ts:197`；bill `src/cli/cmd_read.ts:91`）；④错误翻译（chef `src/help/output.ts:53`；schedule `src/help/output.ts:76`）。
- 事实面：居家今天两样都没有——无依赖无件（A2 末两条）；`home.help.lookup` 只回 `{items, total}`（`packages/skill-home/src/cli/cmd_read.ts:674-678`，渲染 `src/render/views.ts:71-77`），无文件路径回执。

## B · 缺省出口口径的两家判法

### B6 #139／#144 判法要点（引文逐字摘自票面正文）
- #139 标题「卡路里HELP live 出口未接线：实测产 身材照HELP_*.html 而非 卡路里_HELP_*.html」；要点：①「**缺省＝老实物同款 HELP 文件**：`calorie.help.center` 不给 `mode` 时出 `卡路里_HELP_<TS>.html`……缺省必须**就是**交付物，不能靠调用方记得传参」；②「**速查台（#88）改显式**：`--params '{"mode":"file"|"inline"|"text"}'` 才出，独立命名 `卡路里_速查台_<TS>.html`（两份产物不撞名）」；③旧地图 Q9 口径「缺省＝速查台」被本图准则覆盖。
- #144 标题「饼干记账HELP（4/8）出口与命名落盘：缺省＝HELP文件，速查走显式参数」；要点：缺省（不给任何参数）＝老实物同款 HELP 文件；「速查／现找保留为**显式**参数（照 #139 的判法：一个键两种产物就分成两个名字）」；表：缺省→`饼干记账_HELP_<stamp>[_N].html`｜`mode:"lookup"`→`饼干记账_速查表_<stamp>[_N].html`｜`q`→只回 stdout 不默认落盘｜`--html`→覆盖写不递补；「`q` 与 `mode` 互斥、非法 `mode` 即 exit 2」。

### B7 今天两家的缺省出口与速查参数（逐字）
- 卡路里缺省＝**落 HELP 文件**：`src/cli/cmd_read.ts:825-837`（`mode` 未给 → `target {dir: calorie_html, stem: 卡路里_HELP}`）；目录常量 `src/render/helpPaths.ts:18`＝`calorie_html`；主体 `src/render/helpFile.ts:26`＝`卡路里_HELP`。
- 卡路里速查产物名逐字：`卡路里_速查台`（`src/render/helpPaths.ts:23` `SHEET_FILE_STEM`；产物 `卡路里_速查台_<TS>.html` 见 `cmd_read.ts:803`／`:855`）。
- 卡路里触发速查的显式参数：`mode`，取值 `file`／`inline`／`text`（`src/render/helpCenter.ts:362` `HELP_CENTER_MODES`；CLI 面 `--params '{"mode":"…"}'` 见 `cmd_read.ts:15`，判非法即 `fail(2)` `:806`／`:839-843`）。
- 账单缺省＝**落 HELP 文件**：`src/cli/cmd_read.ts:134`（stem）＋`:139`（dir）；主体 `src/render/helpFile.ts:24`＝`饼干记账_HELP`；目录 `src/render/helpPaths.ts:16`＝`biscuit_accountant_html`。
- 账单速查产物名逐字：`饼干记账_速查表`（`src/render/helpPaths.ts:20` `LOOKUP_FILE_STEM`；产出 `cmd_read.ts:74`／`:122-128`）。
- 账单触发速查的显式参数：`mode`，唯一合法值 `lookup`（`cmd_read.ts:117` 非 `lookup` 即 `fail(2)`；`:116` `mode` 与 `q` 互斥；`:120` `q`＝现找只回列表不落盘）。
- 两家相同：缺省都落文件并回执绝对路径；速查都要显式参数；参数名都叫 `mode`（账单只认 `lookup`，卡路里三态）。

### B8 老居家的落盘目录与文件名通式（出处）
- 目录 `<SKILLS_DB_PATH>/home_manager_html/` ＋ 主体 `居家管家_HELP`：`docs/skills/skill-home/map-183-body.md:3`（目的地逐字「产物落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`，回执给绝对路径」）。
- 老生产路同处 `map-183-body.md:33`：「`python3 scripts/home_manager.py help` → `scripts/help_center.py` 读 `references/scenarios.yaml` → `templates/help_center.html` → `<根>/home_manager_html/居家管家_HELP_<YYYYMMDD>_<HHMMSS>.html`」；技能根 `居家管家.html`＝最新 HELP 的精确副本。
- 通式同族互照：`docs/skills/skill-home/t184-bill-recipe.md:27`（换常量照抄 `helpPaths.ts`）／`docs/skills/skill-memo-ilife/t221-bill-recipe.md:119`（「三家通式一致」）。
- 老实物与目录实测：`map-183-body.md:35`（`.db\home_manager_html\居家管家_HELP_20260811_102414.html`，75,514 B／59 场景）；`docs/skills/skill-memo-ilife/t224-delivery-path-evidence.md:37`（该目录实测 18 文件、无子目录）。
- 时间戳口径与共用件同源：`saveHtml.ts:185` 注释「老 `strftime("%Y%m%d_%H%M%S")` 同口径」。本仓**无**老家 python 源（`**/help_center.py` 全仓 0 命中），老家在 `D:\2Study\StudyNotes\SKILLS\居家管家\`（`map-183-body.md:35`）。

## C · combo 侧登记

### C9 登记在哪、居家要不要登记
- 共享表＝`packages/base-combos/combos.yaml`（头注 `:1-4`「唯一真相源……以后每加一条只加配置」）；构建期由 `scripts/gen-present.mjs` 生成 `packages/base-combos/src/present.ts`（`:1` `@generated`，手改无效）。
- 今天 combos 段 111 条＝calorie 100 ＋ memo 11（实测 `PRESENT_KEYS.length=111`，与 yaml 逐键相等）；`home.*`／`bill.*` 均 **0 条**。
- HELP 命令的登记条目：`calorie.help.center`（combos.yaml:111-115，`title: 身材照HELP`）／`calorie.help.lookup`（:116-120，`title: 唤醒词HELP`）／`memo.help.lookup`（:556-560，`title: 备忘录HELP`）。
- 卡路里侧另有「新命令登记三处」约定：`cli/keys.ts`（`CALORIE_COMBOS`）＋`combos.yaml`＋`SKILL.md` 命令表（`docs/skills/skill-calorie/t163-reusable-inventory.md:170`）；两处同值由 `test/output-naming-87.test.mjs:124-137` 钉死（`packages/skill-calorie/src/output.ts:11` 引）。
- 账单侧今天**零登记**：combos.yaml 无 `bill.*` 条目；`packages/skill-bill/SKILL.md:127`「本技能外联动登记（`combos.yaml` 一律不碰，走后续票）」。
- 今天会红的门（只锁 memo）：`test/combos-p8.test.mjs:107-114` 逐键断言 `MEMO_KEY_SHAPES` 每键都能在 `createRegistry(PRESENT_KEYS)` 解析；`:115-120` 断言 `present.ts` 与生成输出逐字相等。针对 `HOME_KEY_SHAPES` 的同款断言在仓内 `test/` 与 `tooling/` 实测 0 命中（其引用只在 `packages/skill-home` 与其 docs）。
- 先例：备忘录 #224 裁「④ `combo` 侧＝必须登记」（`docs/skills/skill-memo-ilife/t224-resolution.md:11`）；判据与反驳见同目录 `t224-review-B.md:181`（登记与否对目的地零影响——`PRESENT_KEYS` 只喂 `createRegistry` 白名单，面板不读）。
- 另有一处**非** combos 的登记今天已存在：`tooling/check-publish.mjs:63` `CONTRACT_KEY['dsh-home-ilife']='home.help.lookup'`（发布链契约键，与共享表无关）。
