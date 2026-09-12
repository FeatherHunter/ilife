# t199 证据集：作息管家结构裁定（只读实测）

> 票：[#199](https://github.com/FeatherHunter/ilife/issues/199)（作息管家HELP 2/10，`wayfinder:grilling`）· 2026-09-12
> 本文只供裁定文档引用，**不出决定**。全程只读；唯一写入的文件就是这一份。
> 行数口径：数换行符（LF），与私家大厨那张图定下的「350＋LF」口径一致（`docs/skills/skill-chef/map-chef-body.md:53`）。
> 命令一律在 `D:\ilife` 下跑。

## 一、`packages/skill-schedule` 存量清单（实测）

行数＝LF。导出＝该文件 `export` 语句给出的名字与个数（类型与常量分开数）。来源：逐文件 `Select-String '^\s*export '` ＋ 逐文件通读。

| 路径 | 行数 | 对外导出（个数） | 一句话职责 |
|---|---|---|---|
| `src/index.ts` | 5 | 4 条 `export *`（fetch／policy／render／help） | 包入口，四面转发 |
| `src/cli/cmd_read.ts` | 306 | 0（可执行文件，`bin` 入口） | 唯一出口 `schedule-cmd-read`：预检、分派、envelope、`--html` 写盘 |
| `src/fetch/index.ts` | 16 | 4 组转发（错误／路径／db／feishu） | 取数层的门 |
| `src/fetch/paths.ts` | 38 | 4（`DB_FILENAME`／`resolveDbDir`／`resolveDbPath`／`assertWritablePath`） | `<SKILLS_DB_PATH>` 解析与测试隔离守卫 |
| `src/fetch/db.ts` | 440 | 26（1 常量／4 接口＋21 函数） | SQLite 开库、建表、record／plan 读写 |
| `src/fetch/errors.ts` | 24 | 2（`ScheduleFetchError`／`SchedulePolicyError`） | 两类错误（出口按类分退出码） |
| `src/fetch/feishu.ts` | 133 | 18（4 常量／4 接口＋10 函数） | 飞书四门探测与日程增删改查 |
| `src/policy/index.ts` | 23 | 9 条 export 转发 | 口径层的门 |
| `src/policy/wakewords.ts` | 99 | 5（`ScheduleKey`／`WakeRoute`／`WakeEntry`／`WAKE_TABLE`／`routeWakeword`） | 唤醒词表与最长匹配路由；HELP 速查的唯一上游 |
| `src/policy/record.ts` | 197 | 15（3 常量／2 类型＋10 函数） | 日期时间归一、相对日期、add／amend／summary／compare 校验 |
| `src/policy/plan.ts` | 145 | 11（1 常量／3 类型＋7 函数） | 计划事件校验、24h 覆盖、plan／record 操作码解析 |
| `src/policy/category.ts` | 180 | 16（3 常量／1 接口＋12 函数） | 分类白名单、健康分、异常检测、时长与百分比格式化 |
| `src/policy/routing.ts` | 69 | 6（4 函数＋2 常量） | 相对日期／区间词转日期 |
| `src/render/index.ts` | 14 | 7 条 export 转发 | 渲染层的门 |
| `src/render/envelope.ts` | 41 | 4（`SCHEDULE_KEY_SHAPES`／`scheduleShapeFor`／`buildScheduleEnvelope`／`parseScheduleEnvelope`） | 8 个命令到 6 种形状的映射与信封封装 |
| `src/render/views.ts` | 171 | 16（3 接口／1 常量＋12 函数） | envelope 的 `data` 载荷构造（含 `buildHelpItems`／`HELP_EMPTY_HINT`） |
| `src/render/html.ts` | 79 | 11（`SCHEDULE_HTML_MAX_BYTES`／`escapeHtml`／`renderEnvelopeHtml`／`estimateBytes`／`assertHtmlSize`／三个标记常量／`SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`） | envelope 转 HTML 片段、体积门、三标记填充 |
| `src/render/templates.ts` | 42 | 4（`SCHEDULE_TEMPLATES`／`ScheduleTemplate`／`templateFor`／`loadTemplate`） | 8 个模板的装载与命令到模板名的映射 |
| `src/render/errors.ts` | 8 | 1（`ScheduleRenderError`） | 渲染类错误 |
| `src/help/index.ts` | 2 | 3（`buildHelpLookup`／`lookupHelp`／`HelpHit`） | HELP 目录的门，只转发 `lookup.ts` |
| `src/help/lookup.ts` | 43 | 3（`HelpHit`／`buildHelpLookup`／`lookupHelp`） | 唤醒词表转 HELP 速查行（短语／命令／形状／一句话） |
| `templates/*.html`（8 件） | 各 16 | — | 8 个页面模板；每件 `:6` 有 `<!--SHARED-CSS-->`、`:14` 有 `<!--SHARED-HELPERS-->` |
| `package.json` | 33 | — | 包名、exports、files、bin、scripts |
| `SKILL.md` | 83 | — | 出口说明＋口径＋构建期注入的速查块（`<!-- HELP-AUTO-START/END -->`） |
| `tsconfig.json` | 8 | — | 工程引用 |
| `scripts/build-help.mjs` | 28 | 3（`START`／`END`／`buildHelpBlock`） | 构建期把速查表注入 `SKILL.md` 标记块 |

**#201 的新文件（不是存量，`git status --short` 显示为未跟踪）：`src/help/scenes/help-assets.ts`（2185 行）／`scripts/gen-help-assets.mjs`（395 行）／`test/help-assets.test.mjs`。**

### 归属标注：与 HELP 相邻，还是其余业态存量

判据两条，满足其一即「与 HELP 相邻」：**判据甲 · 该文件的内容属 HELP 这件事**；**判据乙 · 该文件在 `schedule.help.lookup` 这条出口的调用链上**。

**与 HELP 相邻（本图要就地摆正的，13 件）**：`src/help/index.ts`（只转发 `lookup.ts` `:1-2`，是 `cmd_read.ts:30` 的取用口；甲）／`src/help/lookup.ts`（`buildHelpLookup()` `:30-38`，`cmd_read.ts:241` 直接调用；甲）／`src/policy/wakewords.ts`（4 条 HELP 唤醒词 `:16-19`，`ScheduleKey` 含 `schedule.help.lookup` `:9`；甲）／`src/policy/index.ts`（`lookup.ts:2` 从它取 `WAKE_TABLE`；乙）／`src/render/views.ts`（`HelpItem`／`HELP_EMPTY_HINT`／`buildHelpItems` `:163-169`；甲）／`src/render/templates.ts`（`help` 在模板清单 `:15`，`schedule.help.lookup → 'help'` `:29`；甲）／`src/render/html.ts`（三个标记常量 `:62-64`、`SHARED_CSS`／`SHARED_HELPERS` `:66-67`、`fillTemplate` `:69-78`；甲）／`src/render/envelope.ts`（`'schedule.help.lookup': 'list'` `:13`；甲）／`src/render/index.ts`（`lookup.ts:3` 从它取 `SCHEDULE_KEY_SHAPES`；乙）／`src/cli/cmd_read.ts`（help 分支 `:239-243`，`--html` 写盘 `:284-294`；甲）／`src/index.ts`（`:5` 转发 `./help/index.js`；乙）／`templates/help.html`（`templateFor()` `:29` 指向它；甲）／`src/render/errors.ts`（`html.ts:3` 引用，help 出口失败走它 `cmd_read.ts:291`；乙）。

**其余业态存量（进地图「未定」，本图不重排，9 件）**：`src/fetch/index.ts`、`src/fetch/paths.ts`、`src/fetch/db.ts`、`src/fetch/errors.ts`、`src/fetch/feishu.ts`、`src/policy/record.ts`、`src/policy/plan.ts`、`src/policy/category.ts`、`src/policy/routing.ts`，外加 `templates/` 下除 `help.html` 外的 7 件。一处需裁定者注意：`src/fetch/paths.ts` 今天不参与 HELP 出口（两条判据都不满足），但目的地的落点 `<SKILLS_DB_PATH>/schedule_html/help/` 要用它取落盘根——若裁定把它算进来，它属「相邻」不属「存量」。

## 二、HELP 出口今天的样子（实测）

调用链（自出口往回）：

1. `src/policy/wakewords.ts:16-19` 四条短语 `作息管家 HELP`／`作息管家帮助`／`作息管家能做什么`／`作息管家使用说明` 全指向 `schedule.help.lookup`；key 字面在 `:9` 的类型联合里。
2. `src/cli/cmd_read.ts:274` 先过 `scheduleShapeFor(o.key)` 挡未知命令 → `:239-243` 的 `case 'schedule.help.lookup'`：`buildHelpLookup()`（`src/help/index.ts:1` → `src/help/lookup.ts:30`）拿全表，逐行投影成 `HelpItem`，交 `buildHelpItems(all, q)`（`src/render/views.ts:167`）。
3. `src/render/envelope.ts:13` 把该 key 定成形状 `list`；`:295` 打一行 envelope JSON 到 stdout。
4. 给了 `--html <路径>` 时（`:284-294`）才走页面：`loadTemplate(templateFor(key))`（`src/render/templates.ts:29` → `templates/help.html`）→ `renderEnvelopeHtml`（`src/render/html.ts:35`）→ `fillTemplate`（`:69`）→ `writeFileSync(o.html, html, 'utf8')`。

对外给什么：`buildHelpLookup()` 出 `HelpHit[]`（每行 `phrase`／`key`／`shape`／`cli`／`desc`，`buildHelpLookup` 恒按 `WAKE_TABLE` 逐条出），`buildHelpItems()` 出 `{items,total,hint?}`。一句话说明表在 `src/help/lookup.ts:18-27`（8 个 key 各一句）。

`lookupHelp()`（`src/help/lookup.ts:40`）**不在出口链上**：全仓实测只有测试引用（`packages/skill-schedule/test/skill.test.mjs:6,34,35`），`cmd_read.ts` 用的是 `buildHelpItems` 的 `q` 过滤。

**#201 的 `src/help/scenes/help-assets.ts` 今天能不能从包入口取到：不能。**

- 缺的那一行在 `packages/skill-schedule/src/help/index.ts`：今天整个文件只有 2 行，只转发 `lookup.js`；要让它可取出，得在这里补一条指向 `./scenes/help-assets.js` 的转发（该文件是 `src/help/` 这个技能级 HELP 目录的对外门，转发归它）。
- 为什么是它：`src/index.ts:5` 的 `export * from './help/index.js'` 只放大 `help/index.ts` 已经给的东西；`package.json:8-15` 的 `exports` 里**根本没有** `./help` 子路径，深路径 `dist/help/scenes/help-assets.js` 只能按文件系统路径走（#201 的测试就是这么取的：`test/help-assets.test.mjs:13`）。
- 补完后经入口可达，符合「只有出这个目录才算对外」（`docs/agents/structure.md:96`）——`scenes/` 是 `help/` 目录内部的一层，不出目录的不必对外给。

## 三、共享 help 模板怎么被消费（对照金标准，实测）

### 3.1 `packages/base-render/`（包名 `base-paint`）的 help 资产与出口

仓内**两套** help 渲染，先分清（依据 `docs/skills/skill-chef/t3-template-contract.md:96-101`）：

- **A · 老实物 help 模板**（HELP 文件走这条）：真相源 `assets/help-template.html`（2053 行，人可读可改）→ 生成器 `scripts/gen-help-shell.cjs`（288 行）→ 生成物 `src/helpShell.ts`（83 行，禁手改）；出口是子路径 `./help-shell` → `dist/helpShell.js`。bill／calorie 今天在走这条，schedule 要跟。
- **B · 组件式渲染**（TS 直接拼 DOM）：无生成链；出口是主入口 `base-paint` 的 `renderHelpShell`；用途是卡路里速查台（`packages/skill-calorie/src/render/helpCenter.ts:481`）——**另一个产品**，不是 HELP 文件。

A 路细节（`packages/base-render/src/helpShell.ts`）：导出 `HelpShellData` 五键接口（`:22-28`：`skill_name`／`title`／`subtitle`／`contact`／`groups`）、`HelpShellError`（`:31-39`，`code` 恒为 `'missing-data'`）、`HELP_SHELL_PREFIX`（`:42`）、`HELP_SHELL_SUFFIX`（`:45`）、`HELP_SHELL_DATA_OPEN`（`:48`）、`HELP_SHELL_TITLE_SLOT`（`:51`）、`composeDocTitle`（`:66`）、`renderHelpShellHtml(data): string`（`:73`）、别名 `renderHelpShell`（`:83`）。行为：`groups` 空即抛 `HelpShellError`，不返空页（`:74-76`）；JSON 里的小于号转成转义序列防破壳（`:77`）；文档标题＝`skill_name · title`，`title` 已含技能名时不重复前缀（`:66-70`）。

B 路细节：`packages/base-render/src/help.ts:675` `renderHelpShell(input: HelpShellInput): FillTemplateOutput`（主入口由 `src/index.ts:40` 导出）；输入类型 `HelpShellInput` 在 `src/spec/help.ts:255`。**schema 名＝`SCENE_DATA_SCHEMA`**，定义在 `packages/base-render/src/spec/help.ts:106-238`，是「唯一机读权威」（`docs/base-paint-contract.md:103`）。`additionalProperties:false` 出现在**各层**：`:111`（顶层）／`:121`／`:130`／`:140`／`:152`／`:165`／`:178`／`:200`／`:212`／`:219`／`:232`，共 11 处；顶层必填 `['skill_name','title','groups']`（`:112`），`scenes[]` 有 `minItems:1`（`:149`）。

### 3.2 `packages/base-render/package.json` 的 `exports`

原文（`:8-13`）：

```
".": "./dist/index.js",
"./blocks": "./dist/blocks.js",
"./help-shell": "./dist/helpShell.js",
"./package.json": "./package.json"
```

- `./help-shell` **今天对外**（#136 登记，提交 `21ef322`）。
- **没有条件导出**：四条都是纯字符串映射，没有 `import`／`require`／`default` 条件对象。
- `files` 只有 `dist`（`:14-16`）→ 模板源 `assets/help-template.html` **不进包**（`README.md:8` 明写「源不进包」，省约 105 KB，追溯靠仓库＋哈希锁）。

### 3.3 先例：bill 怎么拿到模板并交付 help 文件，calorie 同样查一遍

**bill（`packages/skill-bill/`）**

- 依赖：`package.json:24-27` 的 `dependencies` 含 `base-paint: ^0.3.0`（另含 `base-link-core`）。
- import：`src/render/helpFile.ts:19` `import { renderHelpShellHtml } from 'base-paint/help-shell';`；`:151-153` `renderHelpFileHtml(data)` 只转发它。
- 资产落点：**没有**把模板复制进自己包。`files`（`:16-20`）＝`dist`／`SKILL.md`／`templates/*.html`；`templates/help.html` 是**老式 16 行模板**（带 `<!--SHARED-CSS-->`／`<!--CONTENT-->`／`<!--SHARED-HELPERS-->`），**不是**共享 help 模板的副本。
- 构建：`package.json:32` `build` ＝ `tsc -b && node scripts/build-help.mjs`；`scripts/` 只有 `build-help.mjs`（只重写 `SKILL.md` 标记块）与 `gen-wake-assets.mjs`（唤醒词资产生成器），**没有**复制模板的步骤；全仓 `tsdown.config.ts` 只存在于 `plugin-*` 包，技能包无打包器配置。
- 交付落盘：`src/render/helpPaths.ts:22` 子目录名 `biscuit_accountant_html`、`:41` 文件名通式、`:53` `resolveStemTarget()` 出初候选；`src/output.ts:42` `writeFileExclusiveWithRetry()`（`wx` 独占＋`EEXIST` 递补）、`:72` `deliverHtml()` 出绝对路径回执；`src/cli/cmd_read.ts:43-44` `SKILLS_DB_PATH` 必设、`:109` 把 HELP 落点接上。
- 测试锁：`test/help-exit-148.test.mjs:14` 直接 `import ... from 'base-paint/help-shell'`，`:73-74` 断落点目录名与绝对路径。

**calorie（`packages/skill-calorie/`）**

- 依赖：`package.json:21-23` 的 `dependencies` 含 `base-paint: ^0.3.0`。
- import：`src/render/helpShell.ts:12-16` 从 `base-paint/help-shell` 转发三个常量，`:17` 引 `renderHelpShellHtml`；模块头 `:5-6` 自述「删文件须改测试锚点，故保留路径、掏空模板副本」、「本模块零模板字节」——**#136 之前它自持一份模板副本，现在掏空成垫片**。另一处 `src/render/helpFile.ts:72` 也转发到它。
- 速查台那件（不是 HELP 文件）走 B 路主入口：`src/render/helpCenter.ts:33,43` import，`:481` 调 `renderHelpShell`。
- 构建：`package.json:35` 同形 `tsc -b && node scripts/build-help.mjs`；`scripts/build-help.mjs` 全篇只算速查表与写 `SKILL.md`（`:230-236`），**无复制模板**。

**可复制的做法**（两地一致，四步）：① 包 `dependencies` 加 `base-paint: ^0.3.0`；② 源码 `import { renderHelpShellHtml } from 'base-paint/help-shell'`，只传自家 5 键 ＋ 三块可选键的 JSON；③ **不自持模板副本、构建期不复制资产**（单一真相源恒在 `packages/base-render/assets/help-template.html`，改它只能跑 `pnpm --filter base-paint gen:help-shell`）；④ 交付文件另建落盘管线（bill 自持一份最小管线，依据 #147，`src/render/helpPaths.ts:1-17`）。

**它的代价（实测，不是推测）**：只吃发布态的 `exports`，**构建后才可用**（消费的是 `dist/helpShell.js`；本机今天 `packages/base-render/dist/helpShell.js` 存在）；发布态确实缺过——registry 上 `base-paint@0.3.0` 是 2026-09-10 14:06 那次发的，**不含** `./help-shell`，`21ef322`（同日 17:33）才登记该子路径 → 真安装态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`（`docs/skills/skill-chef/t3-template-contract.md:578` 自述 git 证据三条：`3e46ab0`／`21ef322`／`7a114b3`；#197 地图把这条登记为「发布到 npm」出本图）。calorie 侧有静态门守它：`test/publish-tarball-smoke.test.mjs:97-121` 断言「dist 引用的每个 `base-paint/*` 子路径都在 `base-paint` 的 `exports` 内」。没有产生第二份真相源（模板源不进包，消费方只拿生成产物）。

### 3.4 全仓标记与重复定义比对

标记字面 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CONTENT-->` 的**定义**分散在各技能自己包里：`skill-schedule/src/render/html.ts:62-64`、`skill-home/src/render/html.ts:59-60`、`skill-bill/src/render/html.ts:53-54`、`skill-chef/src/render/html.ts:68-69`、`skill-memo-ilife/src/render/html.ts:52-53`（memo 只有两个，且只有 `fillSharedMarkers`，无 `CONTENT`）。模板侧用到它们：`skill-schedule/templates/*.html` 8 件各 `:6`／`:14`；`skill-bill/templates/help.html:6,14`。base 层的正本标记表在 `packages/base-render/src/spec/template.ts`（六标记），契约条文见 `docs/base-paint-contract.md:162-163`：`<!--SHARED-HELPERS-->` 的填充物唯一产出者是 `buildSharedHelpersJs(input?)`、`<!--SHARED-CSS-->` 的是 `buildStyleSheet().css`。

**`packages/skill-schedule/src/render/html.ts:66-67` 的 `SHARED_CSS`／`SHARED_HELPERS` 与 base 层、与其它技能是不是同一份概念的重复定义——逐字符比过，结论如下。**

比对方法：脚本读各包 `src/render/html.ts`，抠出 `export const SHARED_CSS = '<字面量>'` 的单引号内文本，逐字符比较。

| 件 | `SHARED_CSS` 长度 | 与 schedule 的关系 |
|---|---|---|
| `skill-schedule/src/render/html.ts:66` | 419 字符 | **正本（本比对基准）** |
| `skill-home/src/render/html.ts:63` | 419 字符 | **逐字符完全相同** |
| `skill-bill/src/render/html.ts:57` | 440 字符 | 差异**一处**：第 260 字符处，bill 侧在 `.badge{…}` 之后多一条 `.amt{font-weight:700}` |
| `skill-chef/src/render/html.ts:72` | 440 字符 | 与 bill 同（差异同上一行） |
| base 层正本 `buildStyleSheet().css` | 21286 字符 | **完全不同的东西**：不含 `.item-head`／`.receipt`／`.hm-empty`（脚本实测三问全 false） |

`SHARED_HELPERS`（145 字符）：`skill-schedule`／`skill-home`／`skill-bill`／`skill-chef` 四家**逐字符完全相同**（内容是一段 8 行的 `copyItem` 内联脚本）。

结论：schedule 的这两个常量是**老家离线壳那份小样式表的第 N 份拷贝**——它与 home **完全同源**，与 bill／chef 只差一条 `.amt`；而 **base 层从来没有提供过这份东西**（服务 `buildStyleSheet` 的是另一套 21286 字符的 token 化样式表）。所以：① 四份 `SHARED_CSS` 互为第二真相源（改一份不带动其余三份；bill 与 chef 就已经跟 schedule／home 走散了一条规则）；② `SHARED_HELPERS` 四份逐字相同，但也不是 base 层 `buildSharedHelpersJs()` 的产出——那是页面侧运行时，另有一套纯度规则（`packages/base-render/src/spec/controls.ts:171` 的 `SHARED_HELPERS_JS_RULE`）。

谁在用：`src/render/html.ts:69-78` 的 `fillTemplate` 是本包唯一消费点（`cmd_read.ts:286` 调用）；两个常量经 `src/render/index.ts:11` 对外；快照门把它们写进快照——`tooling/skill-html-snapshot.mjs:186-187` 对 `SHARED_CSS`／`SHARED_HELPERS` 各取一份文本入快照，**改动它们会让 `pnpm snapshot:html:check` 红**（同文件 `:185` 注释记 memo 无这两个导出，改由探针串覆盖）。

## 四、边界门改动的事实核（实测）

改动原文见 `git diff -- tooling/check-boundaries.mjs`：只动了注释与 `:41` 那一行数组字面量，`SKILLS_BASE_FROZEN` 由 4 名变 3 名 `['skill-chef','skill-home','skill-memo-ilife']`。

### 4.1 移出后每条断言实际覆盖什么

| 断言 | 位置 | 移出前覆盖 | 移出后覆盖 |
|---|---|---|---|
| 依赖闭包 | `:43-48` 的 for 循环 ＋ `:47` 的 assert | 名单 4 名逐个查 `dependencies`＋`devDependencies`＋`peerDependencies` 是否含 `base-paint`／`base-render`（`BASE_RUNTIME` 在 `:42`） | **只对 chef／home／memo-ilife 三名生效**；`skill-schedule` 的依赖闭包**不再查** |
| 源码 import | `SRC_RE` `:49` ＋ `walkSrc` `:51-59` ＋ `:60` 第一段 ＋ `:64` 的 assert | 名单 4 名的 `src/**/*.ts` 全递归扫：`from`／`import`／`require(` 三种写法后跟 `base-paint` 或 `base-render` 即命中 | 只扫这三名；`packages/skill-schedule/src/**` **不再扫** |
| templates 扫描 | `:61-62` 第二段 ＋ `:64` 的**同一条** assert | 名单 4 名的 `templates/*.html` 并入 `SRC_SCAN`，与源码共用一条断言 | 只并这三名；`packages/skill-schedule/templates/*.html` **不再扫** |

要写清楚的一点：**templates 扫描不是一条独立断言**，它和源码扫描共用 `:64` 那一条 `assert(srcHit.length === 0, …)`——所以断言总条数由「4＋1」变「3＋1」。

### 4.2 「其余技能断言一字未放宽」成立吗

**成立。** 证据：`git diff` 显示改动只有两处——`:30-40` 的注释块，与 `:41` 的数组字面量。断言实现一行未动：`:43-48`（循环与判据）、`SRC_RE:49`、`walkSrc:51-59`、`SRC_SCAN:60-63`、`:64` 的 assert 与它的报错文案全部原样；chef／home／memo-ilife 三名的名字、判据、覆盖目录一字未改。

需要如实记的一处口径差：被放宽的是**总覆盖面**（少扫一个包），不是其余三名的判据。今天 `skill-schedule` 的源码与模板里**没有任何** `base-paint`／`base-render` 的 import（脚本实测：`src/**` 与 `templates/**` 命中 0；只有 `scripts/gen-help-assets.mjs:40,261,277` 的**注释文字**提到 base-render 的路径与 schema 名，`scripts/` 不在门的扫描范围内），所以移出**今天就等于放行一个还没接上的包**——真正接上（`import 'base-paint/help-shell'`）要等序 3 的 #200。

### 4.3 跑一次该脚本（真实输出）

```
OK: link-core 零依赖
OK: render 无运行时依赖（link-core 仅 dev/typeof）
OK: render 不依赖 combos
OK: combos 强依赖 link-core
OK: present 只许字符串级引用，禁 import render
OK: link-core 源码不引用任何 workspace 包
OK: 装配 owner 归一 render（link-core/combos 无自装配）
OK: skill-chef 依赖闭包不含 base-*（实得：无）
OK: skill-home 依赖闭包不含 base-*（实得：无）
OK: skill-memo-ilife 依赖闭包不含 base-*（实得：无）
OK: 未迁移技能源码／模板不 import base-*（命中：无）
boundaries: PASS
```

退出码 **0**（`node tooling/check-boundaries.mjs`，随后 `echo $LASTEXITCODE` 得 0）。共 11 行 OK。移出后名单只剩三名，故依赖闭包断言由 4 条变 3 条。

### 4.4 注释指向的成文文档是否存在

`docs/skills/skill-schedule/t199-structure-verdict.md` **今天不存在**（`Test-Path` → `False`）。`docs/skills/skill-schedule/` 下只有两个文件：`t198-old-help-truth.md` 与 `决策待确认-作息管家HELP.html`。

→ `tooling/check-boundaries.mjs:38` 的「裁定成文见 docs/skills/skill-schedule/t199-structure-verdict.md」是**悬空引用**（指向一份尚未写出的文档）。

注释引的两条用户裁定本身查得到：`Q11=A` 在 `#197` 地图正文（「用户 2026-09-12 拍板 Q11=A」）与本地决策页 `docs/skills/skill-schedule/决策待确认-作息管家HELP.html:89`；`Q5=A` 在 `#197` 地图正文的「边界门」一条（「本图照 `#145` 把它移出（用户 Q5=A）」）。两条都出自地图 #197 的正文，本地 `决策待确认-作息管家HELP.html` 只覆盖第二轮 Q11–Q16（`:272` 的 `ids` 数组可见）。

## 五、`docs/agents/structure.md` 两条新条款的事实核

新条款原文在 `docs/agents/structure.md:68-69`（新增两行，`git diff docs/agents/structure.md` 可见；该文件今天共 127 行，除这两行外未动）。

### 5.1 「技能级入口」条：声称「私家大厨／居家／备忘／作息四张图先后撞到同一问」

**结论：部分有据。** 逐张给证据：

| 图 | 结论 | 出处 |
|---|---|---|
| 居家 | **有据** | `docs/skills/skill-home/t195-body.md:14`（#195 票面原话）：「HELP 交付算不算一个「能力」——`src/help/` 这种技能级落点违不违反铁律四（卡路里侧先例：`help-lookup` 是技能级查找入口，铁律四管不到它）」 |
| 备忘 | **有据** | `docs/skills/skill-memo-ilife/t225-body.md:8`（#225 票面原话）：与上一行**同一句**，并自行引「兄弟图 #208（私家大厨）」的判法；`gh issue view 225` 正文同 |
| 作息 | **部分有据** | 本地只有一处相邻表述：`docs/skills/skill-schedule/决策待确认-作息管家HELP.html:179`（Q13 选项 B 的弊处「若结构裁定票改判成「技能级入口」，目录名要跟着改一次」）。**#199 票面六件里没有单列这一问**（见 `gh issue view 199`：5 个能力目录／共用位／边界门／两份 `SHARED_CSS` 处置／就地摆正边界／旧实体目录去留） |
| 私家大厨 | **部分有据** | `docs/skills/skill-chef/map-chef-body.md:50`：「`packages/skill-chef/src/` 一级目录 5 个里 4 个是工种／自造层名（`cli`／`fetch`／`policy`／`render`，只有 `help/` 站得住）……全部属「整包重排」那张票」；`docs/skills/skill-chef/t3-template-contract.md:682` 同向（「`help/` 是 `src/` 一级目录里唯一站得住的能力名」）。但**全树 grep「技能级」在 `docs/skills/skill-chef/` 下 0 命中**，该图也没有对应的结构设计票 |

旁证：卡路里那张图先给出「技能级查找入口」这个判法，出处 `docs/skills/skill-calorie/t179-180-structure-design.md:96`（`src/triggers/help-lookup.ts` 不挪，理由是「它不是 10 个能力里任何一件——它装的是技能级查找入口……铁律四的『能力目录名取自一级分组』管不到它」）。

查证范围（查不到的部分明说查了什么）：`gh issue list --repo FeatherHunter/ilife --state all --limit 300 --json number,title,labels` 实测 **234 条**，四张图的地图与全部子票都在（chef #208／#209–#219、home #183／#184–#196、memo #220／#221–#234、schedule #197／#198–#207）；`gh issue list … --json body` 全文入库后按「结构设计／能力目录／共用位／整包重排／技能级」五词扫过；`git log --oneline -30` 最近 30 条里只有 `60ba041 docs(skill-schedule): #197 建图（Destination／十张子票／原生边）＋ #198 旧 HELP 查证` 与本条相关；`docs/` 全树 grep「技能级」共 6 命中，已逐条落进上表与旁证。

**不替它圆场也不判错**：四张图确实都在同一处停过（HELP 相关件不属任何能力，住哪），但只有居家与备忘把那句话写成了「技能级入口」这同一问；作息与私家大厨停在「旧目录里只有 `help/` 站得住 ＋ 归整包重排那张票」。所以按现有证据这句是**部分有据**——若裁定文档要保留它，建议改成「居家与备忘两张图已把这一问写进票面，作息与私家大厨只到相邻表述」。

### 5.2 「共用位的名字」条：声称「卡路里那张图已按 `src/shared/` 落点实施」

**结论：有据。** 三条证据：

- 目录**真实存在**：`packages/skill-calorie/src/shared/`（`git status --short` 显示为未跟踪的 `?? packages/skill-calorie/src/shared/`），里面 1 件：`docPage.ts`（69 行，4 个导出：`assembleDocPage` `:46`／`promptCopyArea` `:63`／`dataCopyArea` `:68`／`metricsOf` `:73`）。
- 决定成文：`docs/skills/skill-calorie/t179-180-structure-design.md:15`（目录树直接画出 `← 共用位（与能力目录并列，里面不出现任何能力名）`）、`:45`（职责与 4 个导出）、`:72`（放哪与理由：「把新文件放在 `src/` 根上，第一层就多了一个非能力名的条目；共用位与能力目录并列才合规」）、`:110`（落位顺序）。
- 票面同记：`gh issue view 179` 正文（原文：「定案落点是能力目录 `packages/skill-calorie/src/profile/` ＋ 共用位 `packages/skill-calorie/src/shared/docPage.ts`（用户在 2026-09-11 点头「代码目录一律用英文名」）」）。
- 时间线：`git log -S "src/shared"` 只有两笔——`c3ddf39 docs(skill-calorie): #179／#180 影响清单（结构纪律第一步）`（当时还只是候选，同文 `t179-impact-list.md:167` 自记「仓里没有先例可查（今天 `src/shared/` 目录不存在）」）与 `20bcc66 docs(skill-calorie): #179／#180 结构设计（英文能力目录 + 共用位收口）`（定案）。**这笔提交就是新条款 2 所引「已实施」的那一步。**

### 5.3 两条新条款与既有铁律四／共用件条款是否冲突

先摆既有条文（`docs/agents/structure.md`，**今天一字未改**）：

- 铁律四 `:44-49`：「能力目录名取自 **HELP 的一级分组**；目录里的文件名与公开接口名取自**下一级**（子功能）。名字只许从 HELP 的现成说法里取，不许自创。」违反的样子明列 `utils`／`helpers`／`common`／`misc`／`core`／`types`／`base`。
- 共用件 `:67`：「能力之间要共用的东西放共用位，并且写得出**哪两个能力在用**……**共用位是从第二个用法里长出来的，不是预先设计的。**」——这一条只管**怎么长出共用位**，**没有规定共用位叫什么名字**。
- 总则 `:62`：「标准随包不同，按各包自己的情况定；**与铁律冲突时铁律胜**。」

逐条核：

1. **「技能级入口」条没有放宽铁律四**：判据与铁律四同源（名字只许取 HELP 里现成的说法），并明说「铁律四管的是『能力目录』，没说这类件住哪」；它禁的层名与铁律四举的例子同批。**但「HELP 数据里自成一类，例：`help`」这句查不到支持**：旧作息管家 HELP 实测一级分组是 5 个（`write`／`query`／`plan`／`analyze`／`admin`，`docs/skills/skill-schedule/t198-old-help-truth.md:43-50`），**`help` 不在其中**；仓里现成的「help 说法」在**入口触发词**那一层——新仓 4 条唤醒词（`src/policy/wakewords.ts:16-19`）＋命令 `schedule.help.lookup`，兄弟图把它记成「HELP 自身入口」（`docs/skills/skill-home/t185-content-reconcile.md:187,313-315`；`docs/skills/skill-memo-ilife/t222-content-reconcile.md:456`）。
2. **`shared/` 不是 HELP 里现成的说法**：`git log -S "src/shared"` 追到的最早出处就是卡路里那张图的两份文档（2026-09-11）；它的上位裁定是用户的「代码目录一律用英文名」，而那份文档自己记着这笔账——`docs/skills/skill-calorie/t179-180-structure-design.md:32`「『一律用英文名』是用户的裁定，**压在铁律四之上**，`docs/agents/structure.md:44-49` **待同批改**」，**那句「待同批改」今天没做**（`structure.md:44-49` 原样）。
3. **口径不一处**：铁律四把 `common`／`helpers` 这类自造层名列违规，新条款 1 也把 `common` 列为非法层名，而新条款 2 规定共用位叫 `shared/`——两者属同一类自造层名。按 `:62`「与铁律冲突时铁律胜」，若认定冲突应当铁律胜；但卡路里已按 `src/shared/` 落地（见 5.2）。

结论：**新条款 1 与铁律四同源、不放宽**，但「自成一类」一句**无据**，建议改写成仓里查得到的说法（HELP 自身入口／`schedule.help.lookup`）；**新条款 2 与铁律四的口径未打通**（`shared/` 不是 HELP 里的词，铁律四「待同批改」那句没做）。这不影响两条作为「结构标准」的效力（`:116` 记结构标准由维护者定、AI 报理由后可提改），但裁定文档需明写一句：`shared/` 的效力来自「用户裁定英文名 ＋ 与能力目录并列」，不来自铁律四。

## 六、落盘机制与告警线现状（实测）

### 6.1 `<SKILLS_DB_PATH>` 怎么取，HELP 产物今天由谁落盘

- 取法：`packages/skill-schedule/src/fetch/paths.ts:9-18` 的 `resolveDbDir()` 读 `process.env.SKILLS_DB_PATH`，**无默认值**，缺即抛（`skill-schedule` 前缀的错误文案在 `:13-14`）；`:20-23` 的 `resolveDbPath()` 会顺手 `mkdirSync(dir, {recursive:true})`。出口层在 `src/cli/cmd_read.ts:42-44` 的 `preflight()` 里再必设校验一次（缺即 exit 1）。
- HELP 产物今天**没有默认落盘**：`src/cli/cmd_read.ts:284-294` 只在调用方给了 `--html <路径>` 时才 `writeFileSync(o.html, html, 'utf8')`。落点由调用方逐字给，**不带时间戳、不做独占创建、不做同秒递补、不落** `<SKILLS_DB_PATH>/schedule_html/help/`。
- 与最终目的地的差距：目的地要求的 `<SKILLS_DB_PATH>/schedule_html/help/作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html` 在新仓**没有任何实现**；这个目录名与文件名通式今天只记在旧件查证里（`docs/skills/skill-schedule/t198-old-help-truth.md:81`：「落盘：`<SKILLS_DB_PATH>\schedule_html\help\作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`（同名递补）」）。兄弟图的现成做法可照抄，见本文 3.3（bill 四步）。

### 6.2 本包有没有「文件行数告警线」

**没有。** 三处实测：

- `glob **/AGENTS.md` 全树只命中仓根 `AGENTS.md`，`packages/` 下 **0 个**。
- `packages/**/*.md` grep「告警线」/「AGENTS.md」→ **0 命中**。
- `packages/skill-schedule/package.json`（33 行）无该字段，`SKILL.md`（83 行）也没有。

（注：私家大厨那张图把 350＋LF 写进 `packages/skill-chef/AGENTS.md` 作为先例，`docs/skills/skill-chef/map-chef-body.md:53`；备忘 #225 也取 350＋LF 落 `packages/skill-memo-ilife/AGENTS.md`，`docs/skills/skill-memo-ilife/t225-body.md:10`。但**那两份 `AGENTS.md` 今天都还不存在**——chef 侧同 `docs/skills/skill-chef/t1-review-B.md:171` 的实测「不存在；`packages/` 下 AGENTS.md 数量＝0」。）

本包最大几件（LF，供定线参考；标「#201」的是新文件，不计存量）：`src/help/scenes/help-assets.ts` 2185（#201）／`src/fetch/db.ts` 440／`scripts/gen-help-assets.mjs` 395（#201）／`src/cli/cmd_read.ts` 306／`src/policy/record.ts` 197／`src/policy/category.ts` 180／`src/render/views.ts` 171／`src/policy/plan.ts` 145／`src/fetch/feishu.ts` 133。

若取 350＋LF：存量里超线的只有 `src/fetch/db.ts`（440）；#201 的 `help-assets.ts`（2185，生成物）与 `gen-help-assets.mjs`（395）也超，但前者是机器生成的资产，后者在 `scripts/`（`structure.md:71` 把一次性脚本与源码分开放）。

## 七、基线命令与结果（实测）

### 7.1 `packages/skill-schedule/package.json` 的 scripts

`:29-32` 只有两条：`build` ＝ `tsc -b && node scripts/build-help.mjs`；`test` ＝ `node --test ../../test/scaffold.test.mjs`。**没有** `tsc`／`lint` 之类的独立脚本。逐个跑：

| 命令 | 真实结果 |
|---|---|
| `pnpm -C packages/skill-schedule exec tsc -b` | 无输出，**exit 0** |
| `pnpm -C packages/skill-schedule build` | 一行 `HELP 已注入：D:\ilife\packages\skill-schedule\SKILL.md`，**exit 0** |
| `node --test packages/skill-schedule/test/*.test.mjs` | `tests 42`／`suites 6`／`pass 42`／`fail 0`／`duration_ms 2363`，**exit 0**（含 #201 的 `#201 作息 HELP 内容资产` 套件全绿） |
| `pnpm -C packages/skill-schedule test` | **exit 1**（失败项 1 条，原因见 7.2） |

`build` 与测试都会写 `SKILL.md`（`scripts/build-help.mjs:23-27`；`test/skill.test.mjs:7` 引它并触发注入）。实测**写入是幂等的**：`SKILL.md` 的 SHA256 在三步前后都是 `E7CC625EE9A3CD36F355536395E9091C22AABF50BAE97B1EBBC91570642203C9`，工作树没有因此变脏（`git status --short -- packages/skill-schedule` 全程只有 #201 的三个 `??`）。

### 7.2 `pnpm -C packages/skill-schedule test` 失败，失败输入是否含本次涉及的件

**失败原文**（末尾）：

```
✖ failing tests:
test at ..\..\test\scaffold.test.mjs:10:3
✖ 快照 == 实际拉取版 (98.8596ms)
  Error: Command failed: … tooling/write-snapshot.mjs --check
  FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19），请跑 pnpm snapshot 重写
[ELIFECYCLE] Test failed. See above for more details.
[exit code: 1]
```

**判断：失败输入不包含本次涉及的任何件。**

依据：那条用例跑的是 `tooling/write-snapshot.mjs --check`（`test/scaffold.test.mjs:11`），而该脚本算 sha 的输入**只有三件**——`packages/ilife-skills/package.json` 的 version、`packages/base-combos/combos.yaml`、`packages/base-combos/src/present.ts`（`tooling/write-snapshot.mjs:13-18`，**逐字读的原文**：三件归一换行后拼起来取 sha256 前 16 位）。`tooling/check-boundaries.mjs`、`docs/agents/structure.md`、`packages/skill-schedule/**` **一件都不在里面**。这份快照的时间戳与本次无关：`git status --short` 显示 `packages/base-combos/combos.yaml` 与 `packages/base-combos/src/present.ts` 都是**别的会话**的未提交改动（本席开工前它们就是 `M`，与 `docs/research/t81-exec-smoke.md`、`packages/skill-calorie/**` 等改动同批）。

同文件另一条用例（`test/scaffold.test.mjs:6`「boundaries 冻结不断言失败」，即本次改动的那一件）**通过**——本文 4.3 的直接复跑也是 PASS／exit 0。

### 7.3 #201 新文件的原样保留

`packages/skill-schedule/src/help/scenes/help-assets.ts`（2185 行）、`scripts/gen-help-assets.mjs`（395 行）、`test/help-assets.test.mjs` 三件**都是 #201 的新文件**（`git status --short` 里为 `??`），本文第一节的存量清单**不含**它们，第六节「最大几件」也已逐行标注。内容规模（生成物自报 ＋ 实测）：5 个一级分组／34 条唤醒词／85 条场景／1 条待开发；导出 10 个（5 类型／1 联合／4 常量：`HelpSceneField`／`HelpSceneStatus`／`HelpSceneAsset`／`HelpSubgroupAsset`／`HelpGroupAsset`／`HELP_GROUPS`／`HELP_ASSETS`／`HELP_SCENE_RESULTS`／`HELP_GROUP_NOTES`／`HELP_TOTALS`）。生成器与仓库内资产字节一致（`--check` 全绿，见 7.1 第 3 行）。
