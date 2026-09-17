# t672 装与更新的现状调查

调查范围：更新包 `D:\dsh-plugin\dsh-mattpocock-skills-deck\packages\dsh-plugin-update`（只读）、本仓 `packages/plugin-manager` 与六个单品插件、本机 DSH 桌面端的 `dsh plugin` 实现与两个插件市场实现。
本文件只做记录，不改任何源码、不切分支、不提交、不碰 issue。

缩写约定：下文「更新包」＝ `dsh-plugin-update`；「总管」＝ `packages/plugin-manager`（包名 `dsh-life-pack`）；「六单品」＝ `packages/plugin-calorie`、`plugin-bill-ilife`、`plugin-chef`、`plugin-home-ilife`、`plugin-memo-ilife`、`plugin-schedule-ilife`（包名 `dsh-calorie`、`dsh-bill-ilife`、`dsh-chef`、`dsh-home-ilife`、`dsh-memo-ilife`、`dsh-schedule-ilife`）。
所有出处写成 `路径:行号`；外部目录写全路径。Windows 路径一律用反斜杠原文。

---

## 一、逐项对账表

### 1.1 更新包：三个电话、两套回包、六字段快照、八个原因码

| 项目 | 现状 | 能不能用 | 出处（文件:行） |
|---|---|---|---|
| 包根宿主入口 | `createHostUpdate(deps, configInput)` 返回 `{ phoneNames, handlers }`；宿主自己把 `handlers` 按键注册进自家电话表 | 能 | `D:\dsh-plugin\dsh-mattpocock-skills-deck\packages\dsh-plugin-update\src\host.ts:317-320`、`:326-367` |
| 电话名拼法 | 前缀 + `.` + 动作名；动作名集合恰三个 `updateStatus` / `updateCheck` / `updateInstall`；默认前缀 `wf` | 能 | `...\src\config.ts:14-15`、`:137-145`（`buildPhoneNames`） |
| 电话 1 `<prefix>.updateStatus` | 入参：`{}`，可选 `{ profileDir }`；回包 `{ ok, snapshot, manual, receipt }`（`receipt` 恒 null） | 能 | `...\src\host.ts:336-342`、`:307` |
| 电话 2 `<prefix>.updateCheck` | 入参同上；回包 `{ ok, snapshot, manual, receipt }`，`receipt = { checkId, checkedAt, expiresAt }`，只有 `snapshot.canInstall` 为真时才非 null | 能 | `...\src\host.ts:343-351`、`...\src\service.ts:361-364`、`:333`、`:350` |
| 电话 3 `<prefix>.updateInstall` | 入参 `{ checkId, requestId }`（可选 `profileDir`）；回包 `{ ok, snapshot, manual, receipt }` | 能 | `...\src\host.ts:352-360`；面板侧调用形见 `...\README.md:76-79` |
| 失败回包 | `{ ok:false, error, errorKind }`；`error` 取 13 个已知码之一（5 个过程码 + 8 个原因码），不认识的码统一降为 `check-failed` / `errorKind:'internal'` | 能 | `...\src\host.ts:226-242`、`:308-313` |
| 快照六字段 | 恰好六个：`runningVersion`（宿主清单里的运行版本）、`installedVersion`（磁盘已装版本，读不到 null）、`latestVersion`（最近一次查新版拿到的远端版本，没查过 null）、`canInstall`（能不能装）、`blockedReason`（装不了的原因，能装为 null）、`job`（当前任务，只读半程恒 null） | 能 | `...\src\ports.ts:43-57`、`...\src\service.ts:311-318` |
| 八种装不了原因码 | `unknown-profile`、`source-install`、`invalid-installation`、`installation-changed`、`pending-restart`、`registry-conflict`、`incompatible-node`、`recovery-required` —— **恰好八种**，与 README 第 8 节逐项一致 | 能 | `...\src\ports.ts:15-24`；中文含义与处置见 `...\README.md:189-204` |
| 手工兜底命令字段 | 每次查状态/查新版都顺带回 `manual`；形状 `dsh plugin --profile <范围名> add --save-exact <包>@<版本> --registry=<源>`；源码安装与认不出范围两种情形返回 null | 能 | `...\src\commands.ts:98-121`、`:105`；`...\src\host.ts:245-277`；文档 `...\README.md:207-222` |
| 宿主侧调用形状 | `createHostUpdate({ ctx, logCtx }, { pluginId, prefix, targetPackageName })`；`deps.ctx` 用来探测宿主种类（有 `desktopProfiles` 即 desktop）与拿 `desktopPnpm` / `subprocess`；`logCtx` 只收 `{ fire(level, event, fields) }` | 能 | `...\src\host.ts:326-334`、`:66-88`、`:279-287`；文档 `...\README.md:40-57` |
| 客户端要派生的常量 | 五个：`UPD_STATUS` / `UPD_CHECK` / `UPD_INSTALL`（三个电话名）、`UPD_POLL`（面板轮询，默认 1000ms）、`UPD_POLL_MIN`（下限 250ms）；工具 `derive-client-values.mjs --prefix <前缀> --out <文件>` | 能 | `...\derive-client-values.mjs:22-26`、`:150-157`；客户端入口常量 `...\src\client.ts:28-31`、`:34-36`、`:39-44`；文档 `...\README.md:62-101` |
| 单例复用 | 读器缓存键含 `pluginId + prefix + runningVersion + profileDir + profileName + homeDir + environmentKind + targetPackageName`，多插件不串内存状态与锁 | 能 | `...\src\host.ts:173-174` |
| 待重启判定 | 只看快照：`blockedReason === 'pending-restart'`；此期间 `canInstall` 已为假，必须给显眼横幅且不再给安装按钮 | 能 | `...\src\service.ts:295-296`、`:301-310`；文档 `...\README.md:224-233` |

### 1.2 两条安装路由与 `dsh plugin` 真相

| 项目 | 现状 | 能不能用 | 出处（文件:行） |
|---|---|---|---|
| 路由取值 | 只有两条：`'desktop-service'` / `'cli-process'`；由核心 `installRecipe()` 按 `environmentKind` 选，适配器不许自己按系统分支 | 能 | `...\src\ports.ts:94-98`、`:117-122`；`...\src\commands.ts:60-96` |
| 配方五键 | `route`、`profileName`、`version`、`pluginArgs`、`timeoutMs`；`pluginArgs` 固定 `['add','--save-exact','<包>@<版本>','--registry=<源>']`（带官方源、精确版本，不改源） | 能 | `...\src\ports.ts:100-115`；`...\src\commands.ts:88-95` |
| 路由 A：桌面宿主 | `environmentKind === 'desktop'` 时走 `desktopPnpm.runPlugin(参数数组, 使用范围目录)`，插件不碰 `.cmd` 垫片、不经 shell | 能（有前置条件） | `...\src\commands.ts:63-64`、`:89`；`...\src\store.ts:399-418` |
| 路由 A 的前置条件 | **桌面端当前激活的使用范围目录必须就是本插件所在的那个**；对不上宁可不装（代码原话：装错范围比装不上更糟），抛 `install-failed` 交回核心转手工命令 | 前置条件不满足即诚实失败 | `...\src\store.ts:406-411`；文档 `...\README.md:220`、`:279` |
| 路由 B：普通宿主 | `subprocess.spawn({ argv: [运行时, …运行时参数, CLI 入口, 'plugin', '--profile', 名, …pluginArgs] })`；不经 shell、不用 PATH 上的 `dsh` 命令名、不按系统分支；15 分钟时限，终止宽限 3 秒 | 能 | `...\src\store.ts:420-446`、`:448-455`；`...\src\ports.ts:188-194` |
| 路由 B 的运行时取值 | `runtimeExecutable` 未注入时回落到 `process.execPath`；`cliEntry` 由 `resolveCliEntry()` 从宿主 argv 反推 | 能（见遗留 4 的观察） | `...\src\store.ts:425-430`；`...\src\host.ts:182-186` |
| `dsh plugin` 到底是什么 | **证实** `packages/plugin-manager/src/install.ts` 的注释：`dsh plugin --profile <name> <args...>` 是 **pnpm 薄转发**——先在需要时初始化 profile，再在 profile 目录里跑 `pnpm <args...>`，然后按「已装状态」归并 `dsh.profile.bundles`。原话：`profile plugin management as a thin pnpm forwarder` | 能 | `D:\0Tools\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh\lib\plugin-Ddi42qoW.js:7-17`（注释）、`:101-114`（`spawnSync("pnpm", args)`，`cwd = profile 目录`）；被证实的注释在 `packages/plugin-manager/src/install.ts:2-5` |
| `dsh plugin add` 后的激活语义 | **证实**「只扫直接 dependencies」：`reconcilePlugins` 遍历 `after.dependencies` 的键，逐个判断该包是否声明 `dsh.bundle.patch`，是则追加进 `dsh.profile.bundles`；传递依赖不出现，故不进 bundles | 能 | `@deepseek-ai\dsh\lib\plugin-Ddi42qoW.js:34-78`（尤其 `:46-59`）；被证实的注释在 `packages/plugin-manager/src/install.ts:1-12`、`packages/plugin-manager/src/nav.ts:7-9` |
| 桌面端 `dsh plugin` 的实际转发链 | Desktop 的 `desktopPnpm.runPlugin` 拼 `[appExecutable, '--expose-internals', dshBootstrapPath, 'plugin', '--profile', <激活范围名>, …参数]`，`cwd = 调用方目录`；`dshBootstrapPath` 指向 `desktop-cli.js`，最终进 `@deepseek-ai/dsh/lib/bin.js` 的 CLI | 能 | `D:\0Tools\DSH Desktop\resources\app\lib\pnpm.js:81-102`、`:169-175`；`...\lib\electron-runtime-C0DyXlWq.js:2786`；`...\lib\desktop-cli.js:13`、`:72-94` |

### 1.3 总管（`packages/plugin-manager`）现状

| 项目 | 现状 | 能不能用 | 出处（文件:行） |
|---|---|---|---|
| 宿主半 | **是空实现**：`export const name = 'dsh-life-pack'`、`export const inject: readonly string[] = []`、`export function apply(_ctx){ void _ctx; }` | 不能（宿主侧零能力、零电话） | `packages/plugin-manager/src/index.ts:9-14` |
| 对外导出 | 只有纯数据口径 `MANAGER_TABS`/`tabsForPresence` 与安装口径 `MANAGER_PACKAGE`/`SINGLE_PLUGINS`/`reconcileBundles`/`assertDualBundles`/`assertNegativeSingleOnly` | 能（纯函数） | `packages/plugin-manager/src/index.ts:16-17` |
| 六个页签表 | `MANAGER_TABS` 六行，`order` 70/75/80/85/90/95，`slotId` 依次 `ilife:memo`/`ilife:calorie`/`ilife:schedule`/`ilife:home`/`ilife:chef`/`ilife:cookie`，`plugin` 字段是单品**包名**且只做文档级引用 | 能 | `packages/plugin-manager/src/nav.ts:38-46` |
| `recoFor` | 由 `tab` 生成 `{ kind:'reco', installCmd, hint }`；`installCmd = 'dsh plugin add dsh-life-pack ' + tab.plugin`（单命令双包口径）；`hint = '未安装[<包>]，请补装后使用：<命令>'` | 能 | `packages/plugin-manager/src/nav.ts:20-25`、`:32-36`、`:48-56` |
| `tabsForPresence` | 纯条件渲染：`present` 有该 `slotId` 就是原 tab，否则回 `recoFor(tab)`；不轮询 | 能 | `packages/plugin-manager/src/nav.ts:58-62` |
| `AbsentCard` 需要的数据 | 只需要 `ManagerTab`（`skill`/`slotId`/`order`/`title`/`plugin`）；卡内自算 `recoFor(tab)` | 能 | `packages/plugin-manager/src/client.ts:73-82`、`:18` |
| 缺席卡现在渲染什么 | 一个虚线框 div ＋ 一行 `reco.hint` 文本 ＋ 一个 `<code>` 块展示 `reco.installCmd`。**没有按钮、没有安装动作、没有检查更新**；`<code>` 只给了 `userSelect:'all'`（靠手选复制），**没有复制按钮**。子页签按钮上只有 `●`/`○` 前缀（`●` 有、`○` 无） | 不能（只读文本） | `packages/plugin-manager/src/client.ts:52-71`、`:74-82`、`:161`、`:176-179` |
| 总管 inject 了哪些服务 | 客户端 `inject = ['slots']`，只有一处注册：`settings.section` 槽 `id:'dsh-life-pack'`，`order:21`，`children: { 'ilife.config-tab': { kind:'list', scope:'root' } }` | 能 | `packages/plugin-manager/src/client.ts:27`、`:210-222` |
| 有没有 RPC 通道 | **没有**。源码头注释原话：「总管机制范围无 RPC，不声明 connection，不碰 sidebar」；全包搜 `connection`/`rpc` 只在 `dsh-ctx.ts` 的类型镜像里出现，无任何运行时使用 | 不能 | `packages/plugin-manager/src/client.ts:7`；`packages/plugin-manager/src/dsh-ctx.ts:72-93` |
| `dsh-ctx.ts` 客户端能拿到哪些上下文成员 | `ClientCtx = { slots: SlotsFace; connection?: { rpc?: { call: RpcCallFace } }; effect(cb,label?); get?(name) }`；`SlotsFace = { inject, register, entries, getVersion, subscribe }`；`LifePackSectionProps = { renderSlot, useTabs }`；另有宿主侧 `HostCtx = { connection.rpc.handle, effect, logger? }`——**都只是类型镜像（type-only，构建期擦除）**，不代表今天真在用 | 能（类型）／不能（运行时未接） | `packages/plugin-manager/src/dsh-ctx.ts:80-93`、`:32-38`、`:65-70` |
| 总管依赖 | `package.json` **没有 `dependencies` 字段**（只有 dev 依赖 react/tsdown/@types/react）；`packages/plugin-manager/node_modules` 实得只有 `.bin`、`@types`、`react`、`tsdown` | — | `packages/plugin-manager/package.json:45-49`；目录读数 |
| 版本号 | `MANAGER_VERSION = '0.2.0'`（与 package.json 同步） | 能 | `packages/plugin-manager/src/nav.ts:29-30`；`packages/plugin-manager/package.json:3` |

### 1.4 「总管不许做什么」硬约束（逐条含断言原文）

出处一：`test/plugin-p10-boundaries.test.mjs`（全文件 141 行）。以下每条给行号与断言原文。

| # | 约束 | 断言原文 | 行号 |
|---|---|---|---|
| B1 | 总管不许依赖单品（含 dev/peer） | `assert.ok(!depBlob.includes(n), '总管不许依赖单品：' + n)`，`n` 遍历 `['dsh-calorie','dsh-memo-ilife','dsh-schedule-ilife','dsh-home-ilife','dsh-chef','dsh-bill-ilife']` | `:26-29`（`SINGLE_NPMS` 在 `:15`） |
| B2 | **总管不 import 单品（源码级）** | `assert.ok(!/from\s+['"]dsh-(calorie\|memo\|schedule\|home\|chef\|bill)/.test(t), '总管源码禁 import 单品包')` | `:44` |
| B3 | 总管禁相对 import 单品 | `assert.ok(!/from\s+['"]\.\.\/plugin-/.test(t), '总管源码禁相对 import 单品')` | `:45` |
| B4 | 总管禁 require 单品 | `assert.ok(!/require\(\s*['"]dsh-/.test(t), '总管源码禁 require 单品')` | `:46` |
| B5 | 总管禁动态 import | `assert.ok(!/import\s*\(/.test(t), d + ' 禁动态 import')` | `:75` |
| B6 | 总管禁外嵌页 | `assert.ok(!/iframe/i.test(t), d + ' 禁外嵌页')` | `:76` |
| B7 | 定时器三件套（清理 ＋ 次数上限 ＋ 「有界重试」注释），否则禁 | `assert.ok(/clearInterval\|clearTimeout/.test(t), d + ' 定时器须有清理')`；`assert.ok(/tries\s*>=/.test(t), d + ' 定时器须有次数上限')`；`assert.ok(/有界重试/.test(t), d + ' 定时器须注例外依据')` | `:77-84` |
| B8 | 导航表恰好 6 行且不含子页 | `assert.equal(nav.MANAGER_TABS.length, 6)`；`assert.ok(!nav.MANAGER_TABS.some(...':diet'...':goal'))` | `:87-91` |
| B9 | 设置页不许住总管 | `assert.ok(!existsSync(join(root, 'packages/plugin-manager/src/settings.ts')), '设置页不许住总管')` | `:97`（对应 `:95-96` 要求六家各自有 `src/settings.ts`） |
| B10 | 总管只导航 | `assert.ok(t.includes('openTab'), '总管须含 openTab 导航')`；`assert.ok(!/renderPage\|renderReco/.test(t), '总管禁直调内容渲染（内容单品自注册）')`；`assert.ok(!/from\s+['"]skill-/.test(t), '总管禁 import 技能实现')` | `:99-104` |
| B11 | 缺席 tab 带补装命令与提示 | `assert.match(r.installCmd, /dsh plugin add dsh-life-pack dsh-/)`；`assert.match(r.hint, /补装/)` | `:105-114` |
| B12 | `engines>=22.13` | `assert.equal(pkg(d).engines?.node, '>=22.13', d)` | `:118-122` |
| B13 | `dsh.bundle.patch` ＋ `./package.json` 出口 ＋ `files` 含 patch | `assert.ok(j.dsh?.bundle?.patch, d + ' 缺 dsh.bundle.patch')`；`assert.ok(j.exports?.['./package.json'], ...)`；`assert.ok(j.files?.includes('cordis.patch.yml'), ...)` | `:123-130` |
| B14 | 单品→总管单向、版本线口径 | `assert.equal(j.dependencies?.['dsh-life-pack'], '^' + packVer, ...)`；`assert.equal(j.dependencies?.[SKILL_OF[d]], pkg(SKILL_OF[d]).version, ...)` | `:34-40` |
| B15 | 单品面板链路须经 `host.call`、取数须经 `spawn`、出口须为 `cmd_read` | `assert.ok(t.includes('host.call'), d + ' 面板链路须经 host.call')`；`assert.ok(t.includes('spawn'), ...)`；`assert.ok(t.includes('cmd_read'), ...)` | `:53-55`（见遗留 3：这条今天空转） |

出处二：`test/plugin-p10-install.test.mjs`（全文件 66 行）。

| # | 约束 | 断言原文 | 行号 |
|---|---|---|---|
| I1 | 单命令双包：双含 | `const bundles = reconcileBundles(['dsh-life-pack', single])`；`assert.ok(bundles.includes('dsh-life-pack'), single + ' 双包缺总管')`；`assert.ok(bundles.includes(single), ...)`；`assertDualBundles(bundles, single)` | `:23-30` |
| I2 | 单 add 单品：bundles 无总管（负向） | `assert.ok(!bundles.includes('dsh-life-pack'), single + ' 单加不应含总管（传递不激活）')`；`assertNegativeSingleOnly(bundles)`；`assert.throws(() => assertDualBundles(bundles, single), /缺总管/)` | `:31-38` |
| I3 | 单品必须 dependencies 硬依赖总管，不许走 peer，不许外泄 `workspace:` | `assert.equal(j.dependencies?.['dsh-life-pack'], '^' + packVer, ...)`；`assert.ok(!(j.peerDependencies?.['dsh-life-pack']), ...)`；`assert.ok(!JSON.stringify(j.dependencies).includes('workspace:'), ...)` | `:39-50` |
| I4 | 装配行双含：`cordis.patch.yml` 的 `id`/`name` 与包名一致（七包逐一） | `assert.match(text, new RegExp('id: ' + single))`；`assert.match(text, new RegExp("name: '" + single + "'"))` | `:51-59` |
| I5 | 首验文档写单命令双包（6 单品逐一可查） | `assert.ok(doc.includes('dsh plugin add dsh-life-pack ' + single), single + ' 缺双包命令文档')` | `:60-65`（本轮实测六条全在 `docs/p10-scaffold.md`） |

出处三：`test/client-bundle-48.test.mjs`（总管客户端要加 RPC 时会撞上）。

| # | 约束 | 断言原文 | 行号 |
|---|---|---|---|
| C1 | 客户端产物允许的外部 require 白名单 | `ALLOWED_EXTERNALS = Set(['react','react/jsx-runtime','react-dom','react-dom/client','cordis','@deepseek-ai/dsh-client-runtime','@deepseek-ai/dsh-client-runtime/client','@deepseek-ai/dsh-client-ui-slots','@deepseek-ai/dsh-client-connection','@deepseek-ai/dsh-client-ui-workspace'])`；`throw new Error('client purity：不允许的外部 require("${spec}")')` | `:36-44`、`:79-83`、`:96-101` |
| C2 | 产物里出现 `.connection` 就必须在 `inject` 里声明 `'connection'` | `if (/\.connection\b/.test(code)) { assert.ok(exp.inject.includes('connection'), \`${pkg} client 读了 ctx.connection，必须在 inject 短名里声明 'connection'\`) }` | `:87-95` |
| C3 | 产物禁 ESM 语法、禁 `node:` 导入 | `assert.doesNotMatch(code, /(^\|\n)\s*import\s[^'"]*from\s['"]/m, ...)`；`assert.doesNotMatch(code, /(^\|\n)\s*export\s+(default\|const\|function\|class\|\{\|\*)/m, ...)`；`assert.doesNotMatch(code, /from\s+['"]node:[^'"]+['"]/, ...)` | `:104-111` |
| C4 | 自动发现范围：凡 `dsh.client.platform === 'web'` 的包都被看门 | `.filter((e) => e.json?.dsh?.client?.platform === 'web')` | `:23-34` |

出处四：`tooling/check-boundaries.mjs`（全文件 130 行）——**不管总管**，它管的是 `base-*` 与六家 skill 的 help 模板归属。

| # | 约束 | 断言原文 | 行号 |
|---|---|---|---|
| G1 | `base-link-core` 零依赖 | `assert(Object.keys(core.dependencies ?? {}).length === 0, 'link-core 零依赖')` | `:13` |
| G2 | `base-render` 无运行时依赖、不依赖 combos | `assert(Object.keys(render.dependencies ?? {}).length === 0, ...)`；`assert(!JSON.stringify(render).includes('base-combos'), ...)` | `:15-16` |
| G3 | `base-combos` 强依赖 link-core；`present` 禁 import render | `assert(combos.dependencies?.['base-link-core'] !== undefined, ...)`；`assert(!present.includes('base-paint') && !/from\s+['"].*(?:render\|paint)/.test(present), ...)` | `:18-20` |
| G4 | link-core 源码不引用任何 workspace 包 | `assert(!/from\s+['"](?:@[A-Za-z_]+\/\|base-\|skill-\|plugin-\|dsh-)/.test(coreSrc), ...)` | `:23` |
| G5 | 装配 owner 归一 render | `assert(!grepHit, '装配 owner 归一 render（link-core/combos 无自装配）')` | `:25-28` |
| G6 | 六家迁移消费方必须真的依赖并 import `base-paint` | `assert(deps['base-paint'] !== undefined, ...)`；`assert(hits.length > 0, ...)` | `:109-127` |

补充说明（B2 的适用范围）：断言 B2 的正则是 `dsh-(calorie|memo|schedule|home|chef|bill)`，它拦的是六个**单品包名前缀**；`dsh-plugin-update`、`dshmarket` 这类名字**不在**这条正则的命中集合里，总管 import 更新包不会触发 B2。同理 B1 的 `depBlob.includes(n)` 只查六个单品 npm 名。**但** `:44` 的那条正则没有词边界，任何以 `dsh-calorie…` 开头的模块说明符都会被拦下。

### 1.5 六单品现状

| 项目 | 现状 | 能不能用 | 出处（文件:行） |
|---|---|---|---|
| 宿主半电话表——卡路里 | **有**：`inject = ['connection','skills','webServer']`，`apply` 里 `ctx.connection.fetch.register({ path:'/api'+RPC_CHANNEL, methods:['POST'], requestBody:'buffered', fetch(request){…} })`，JSON-RPC 风格自解包（`type:'client-request'` / `rpcId` / `method` / `payload`） | 能 | `packages/plugin-calorie/src/index.ts:12`、`:51-88`；通道常量 `packages/plugin-calorie/src/contract.ts:7-8`（`RPC_CHANNEL='/ilife-calorie'`，`RPC_ENDPOINT_READ='read'`） |
| 宿主半电话表——备忘录 | **有**，同上形 | 能 | `packages/plugin-memo-ilife/src/index.ts:12`、`:54-90`；`packages/plugin-memo-ilife/src/contract.ts:7-8`（`/ilife-memo`） |
| 宿主半电话表——记账／大厨／居家／作息 | **没有**。四家 `index.ts` 都只有 `export const inject: readonly string[] = ['skills'];`，`apply` 里只做 `ctx.skills.registerProvider(() => skillProvider)`；全文件无 `connection`、无 `fetch.register`、无 `webServer` | 不能（连电话表都没有） | `packages/plugin-bill-ilife/src/index.ts:8`、`:16-28`；`packages/plugin-chef/src/index.ts:8`、`:16-28`；`packages/plugin-home-ilife/src/index.ts:8`、`:16-28`；`packages/plugin-schedule-ilife/src/index.ts:8`、`:16-28` |
| 四家的客户端取数 | 四家 `client.ts` 都是**静态注册版**：`inject = ['slots']`，只往 `ilife.config-tab` 槽注册一个只读设置页；文件头注释原话「不取数、不加定时器、无数据轮询」 | 不能 | `packages/plugin-bill-ilife/src/client.ts:1-11`、`:18`、`:60-73`；另三家同名文件同形（`plugin-chef`/`plugin-home-ilife`/`plugin-schedule-ilife` 各自 `client.ts:18`、`:63`） |
| 电话名怎么拼 | **不是**更新包那套「前缀+点+动作名」。六家的读方法是 `HOST_CALL_METHOD = 'ilife.<skill>.read'`，配客户端 `connection.rpc.call('/api', RPC_CHANNEL.slice(1), { method:'read', payload:{key,params} })`；桥内还有一个 `requestViaHost(host, key, params) → host.call(HOST_CALL_METHOD, {key,params})` 的封装 | 能（读），但与更新包电话无关 | `packages/plugin-calorie/src/bridge.ts:17`、`:158-166`；`packages/plugin-calorie/src/client.ts:169`；六家 `bridge.ts:17`（bill/chef/home/memo/schedule 同名同形） |
| 已经能用的「安装／更新」入口 | **一家都没有**。对 `packages/plugin-*/src/*.ts` 全量检索 `dsh-plugin-update` / `updateStatus` / `updateCheck` / `updateInstall` / `检查更新` / `装更新` / `安装能力` —— **零命中** | 不能 | 检索命令与读数见遗留下方的复现说明；管理器侧只有 `installCmd` 文本常量（`packages/plugin-manager/src/nav.ts:49-54`） |
| 版本显示能力 | 只有卡路里（以及样板复制过去的）有：#130 版本通道，宿主侧读自身与 skill 的 `package.json.version`，经 `readViaCli` 的魔键 `dsh-calorie.version` 走既有 RPC 端点，客户端读不到显示 `unknown` | 能（仅读版本，不是查更新） | `packages/plugin-calorie/src/bridge.ts:23-33`、`:40-52`、`:73-114`、`:181-183`；`packages/plugin-calorie/src/client.ts:84-90`、`:163-169` |

### 1.6 两个「插件市场」现状（补充调查对象）

| 项目 | 现状 | 能不能用 | 出处（文件:行） |
|---|---|---|---|
| 内置市场 `dsh-community-market` 的插件名 | `export const name = 'community-market'`；`inject = ['webServer','settings']` | — | `D:\0Tools\DSH Desktop\resources\app\node_modules\dsh-community-market\src\index.ts:17-18` |
| 它是不是可被别的插件取到的服务 | **不是**。全包检索 `extends Service` / `ctx.provide` —— 零命中（只有 `new MarketInstallService(...)` 这类内部类）；它对外只有 HTTP 路由 | **不可通过 cordis 服务调用** | `...\dsh-community-market\src\index.ts:34-85`（`apply` 全程只 `registerMarketRoutes` + `ctx.inject`）；检索读数见复现说明 |
| 它对外暴露的路由 | 10 条，前缀 `/api/community-market/`：`state`、`sources`、`catalog`、`installable`、`assets`、`installations`、`desktop/open-terminal`、`desktop/request-restart`、`operations/preview`、`operations/execute` | 技术上可 fetch（见下条） | `...\dsh-community-market\src\host\routes.ts:71-80`、`:717-1130` |
| 路由的访问门槛 | 读：必须回环地址 + 期望端口 + 非跨站（`sec-fetch-site !== 'cross-site'`）；写：还要 `Origin` 与 authority 同源且 `pathname === '/'` | 同源面板可以调，第三方站点不行 | `...\dsh-community-market\src\host\routes.ts:326-345`（`marketRequestAllowed`）、`:347-356`（`marketMutationAllowed`） |
| 它怎么装/卸 | `MarketInstallService` 的安装分支：`this.runPnpm(['add', ...(source 为空 ? installOptions(name) : ['--save-exact']), target], signal)`；`runPnpm` 调 `this.pnpm.run(args, signal)`，即 Desktop 的 `desktopPnpm` 服务；装完自己 `setProfileBundle(profile, name, true)` 并校验装出来的版本 | 能（桌面宿主内） | `...\dsh-community-market\src\install\service.ts:640-663`、`:843-847`、`:693-736`（卸载 `['remove', name]`） |
| `desktopPnpm.run` 实际干什么 | 直接执行 pnpm：`[appExecutable, '--import', <清环境脚本>, pnpmBinPath, ...args]`，`cwd = 激活的 profile 目录`；并前置强制 `--config.minimumReleaseAge=0` | **不是** `dsh plugin add` 转发 | `D:\0Tools\DSH Desktop\resources\app\lib\pnpm.js:67-80`；`...\lib\pnpm-policy-Dj9BWmx3.js:7-12` |
| 第三方市场 `dshmarket` 的插件名 | `export const name = 'dsh-market'` | — | `D:\0Tools\DSH Desktop\resources\app\node_modules\dshmarket\lib\index.js:8` |
| `dshmarket` 有没有给第三方的公开接口 | **有**：`UPDATE-API-V1.md` 定义的 `dsh-market/update-api/v1`，路径前缀 `/dsh-market/api/v1/`；文档原话：让它「show its own update button without spawning a package manager, copying the Market installation algorithm」 | 能（beta 状态） | `...\dshmarket\UPDATE-API-V1.md:14-17`、`:36-44`（`GET /dsh-market/api/v1/updates?name=<包>&force=1`）、`:46-67`（`POST .../updates` → 202 + `operationId`，轮询 `GET .../operations`）、`:98-124`（rollback / restart）、`:126-132`（兼容政策，含「发现不可用时退回打开 Market」） |
| API v1 的实现与守卫 | `capabilities` / `updates` / `operations` / `rollback` / `restart` 五条路由；`capabilities` 报 `stability/marketVersion/profile/runtime/features/restart/endpoints`；写操作一律 `method === 'POST'` + `sameOrigin(request)`，否则 403 `untrusted origin`；桌面宿主 `restart.supported=false`，`managedBy` 取 `'desktop-host'` 或 `'operator'` | 能 | `...\dshmarket\lib\routes.js:786-831`（`/dsh-market/api/v1/capabilities`）、`:832-850`（updates GET）、`:953-1000` 区段（updates POST / operations）、`:1010-1020` 附近与 `:1120-1130` 附近（rollback / restart 守卫）；枚举码 `...\dshmarket\lib\update-api-v1.js:8`、`:21-39` |
| `dshmarket` 怎么装/卸/更新 | `runDshPlugin()` 拼 `[file, ...args, 'plugin', '--profile', profile, ...pluginArgs]` 起子进程（`env = spawnEnv()`，`cwd` 为 dsh 入口目录）；桌面宿主另有 `desktopPnpm` 分支 | 走 `dsh plugin`（＝pnpm 转发），桌面分支走 desktopPnpm | `...\dshmarket\lib\dsh-cli.js:669-702`（尤其 `:686`）、`:765-800`；`pnpm-workspace` 兼容改写 `...\dshmarket\lib\pnpm-compat.js:pluginArgsFor` |
| 本机是否装了市场 | `web` profile（当前 GUI 所在 profile）`dshmarket@1.47.0` 且已进 `dsh.profile.bundles`；`desktop` profile `dshmarket@1.44.0` 亦已进 bundles。`dsh-community-market` **不在任何 profile 的 dependencies 里**，它在 App 自带的 `app\node_modules` 下 | 两个市场都在 | `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json`、`...\profiles\desktop\package.json`（实读） |

---

## 二、候选接法（三条 ＋ 补充第四条 d）

三条老候选都写清三样：**要改哪些包** / **碰不碰「总管不 import 单品」这条已冻结边界** / **桌面宿主下会不会诚实失败**。

### (a) 总管统管

**要改哪些包**：只改 `packages/plugin-manager` 一个包（外加它 `package.json` 里新加一条 `dependencies: { "dsh-plugin-update": "^0.1.1" }`）。六单品零改动。

具体形状：
1. 总管 `src/index.ts` 的宿主半从空实现（`packages/plugin-manager/src/index.ts:9-14`）改成真注册：`inject` 至少要加 `connection`（今天 `inject: readonly string[] = []`，`:10`）；`apply` 里对**六个包名各调一次** `createHostUpdate`，拿回六套 `{ phoneNames, handlers }`（更新包的 `targetPackageName` 是建能力时的配置项，`...\src\config.ts:18`、README `:119`；单例缓存键含 `pluginId+prefix`，六套不会互串，`...\src\host.ts:173-174`），再照卡路里的样板把 `handlers` 挂到 `connection.fetch.register` 的一条通道上（样板 `packages/plugin-calorie/src/index.ts:51-61`）。
2. 总管客户端 `src/client.ts` 从 `inject = ['slots']` 扩成 `['slots','connection']`（`:27`，C2 断言 `test/client-bundle-48.test.mjs:87-95` 要求读了 `.connection` 就必须声明），`AbsentCard`（`:73-82`）里加「安装」「检查更新」按钮，电话名走**构建期派生**出来的常量（README `:62-101`）。
3. 构建期加一步 `node node_modules/dsh-plugin-update/derive-client-values.mjs --prefix lifepack --out src/generated/updateClient.derived.js`，面板只引 `UPD_STATUS/UPD_CHECK/UPD_INSTALL/UPD_POLL`，不写死字符串与 1000。

**碰不碰已冻结边界**：**不碰**。逐条对：
- B2 原文 `assert.ok(!/from\s+['"]dsh-(calorie|memo|schedule|home|chef|bill)/.test(t), '总管源码禁 import 单品包')`（`test/plugin-p10-boundaries.test.mjs:44`）—— `dsh-plugin-update` 不在这条正则的候选集里，`import 'dsh-plugin-update'` 通过。
- B1 原文 `assert.ok(!depBlob.includes(n), '总管不许依赖单品：' + n)`（`:26-29`），`n` 只遍历六个单品 npm 名 —— 加 `dsh-plugin-update` 依赖通过。
- B5 原文 `assert.ok(!/import\s*\(/.test(t), d + ' 禁动态 import')`（`:75`）—— 用静态 `import` 即通过；**不能用** `await import('dsh-plugin-update')`。
- C1 外部 require 白名单（`test/client-bundle-48.test.mjs:36-44`、`:96-101`）—— 面板里**不能** require 更新包，必须走构建期派生（这正是 README 第 3 节第 3 步给出的唯一被验证过的消费方式，`...\src\client.ts:7-13`）。
- B15 原文 `assert.ok(t.includes('host.call'), d + ' 面板链路须经 host.call')`（`:53`）—— 只管六单品，不管总管，但总管的取数方式与它今天描述的模型已经不一致（见遗留 3）。

**桌面宿主下会不会诚实失败**：**会，但只在「激活范围对不上」这一种**。走路由 A 时断言 `desktopProfiles.current.dir` 必须与插件所在 `profileDir` 同一，否则抛 `install-failed` 并转手工命令（`...\src\store.ts:406-411`；README `:220`、`:279`）。本机 ilife 七件都装在 `web` profile（实读 `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json`），而 DSH Desktop 当前激活的可能是 `desktop` profile —— 那一刻自动装会诚实失败、退回 `dsh plugin --profile web add --save-exact <包>@<版本> --registry=https://registry.npmjs.org/` 这条给人复制的命令（`...\src\commands.ts:121`）。除这一种之外没有别的诚实失败点（路由 B 在非桌面宿主走 `process.execPath + CLI 入口`，三系统同形）。

**成本判断**：最省事。一个包、一个 PR、一个构建步骤；六家一行不改；`dsh plugin add` 的单命令双包口径天然满足（新装包只发一张电话，装哪个发哪个）。

### (b) 单品自管

**要改哪些包**：`packages/plugin-manager`（只放「安装／检查更新」入口按钮）＋ 六家 `packages/plugin-calorie`、`plugin-bill-ilife`、`plugin-chef`、`plugin-home-ilife`、`plugin-memo-ilife`、`plugin-schedule-ilife` 各自加：宿主电话表、客户端面板、`dsh-plugin-update` 依赖、构建期派生文件。

具体形状：每家照更新包 README 第 3 节三步接线（`...\README.md:27-101`）：装包 → 宿主 `createHostUpdate({ctx,logCtx},{pluginId,prefix,targetPackageName})` 并把 `handlers` 注册进自家电话表 → 构建期派生三个电话名与轮询常量，面板引常量。

**实际工作量比「三步」大得多**：六家里只有卡路里与备忘录今天有宿主电话表（`packages/plugin-calorie/src/index.ts:51-88`、`packages/plugin-memo-ilife/src/index.ts:54-90`）；**记账／大厨／居家／作息四家的宿主半只有 `inject=['skills']`**（各自 `index.ts:8`、`:16-28`），要先补 `connection`/`webServer` 注入与 `connection.fetch.register` 通道，才算有地方挂 `update.handlers`。此外六家的客户端里，四家是「不取数」的静态注册版（`packages/plugin-bill-ilife/src/client.ts:1-11`），要新接一整套 RPC 调用。

**碰不碰已冻结边界**：**不碰**，而且是「一行都不碰」——总管连按钮都只是纯数据/纯导航，六家各自 import 更新包与自带依赖，总管 import 集合零变化（B1/B2/B3/B4 全部维持）。代价是**同样的接法写六遍**，且六份之间没有任何机制保证同步；日后更新包换前缀或换轮询间隔，要六家各重跑一次 `derive-client-values.mjs`。

**桌面宿主下会不会诚实失败**：**会，而且会「六家各自独立地失败」**。每家各自判断自家所在范围与桌面激活范围是否同一（`...\src\store.ts:406-411`）；本机七件同住 `web` profile，所以对六家是**同一个**判断结论，要么六家一起成功、要么六家一起诚实失败转手工命令——但失败现场是六个互相独立的面板各自报错，用户要复制六条命令。

### (c) 混合：总管只查「缺不缺」，装的动作交各家或交人

**要改哪些包**：只改 `packages/plugin-manager`（可选地再改六家）。总管今天已经有「缺不缺」的判定：`present = new Set(rows.map(r => r.id))`（`packages/plugin-manager/src/client.ts:94-95`）与 `tabsForPresence`（`packages/plugin-manager/src/nav.ts:58-62`），改的只是 `AbsentCard` 的渲染（`:73-82`）：从「一行只读 `<code>`」改成「一行说明 ＋ 可复制命令 ＋ 一个『打开插件市场』按钮」（见 (d)）；真装的动作交给人复制命令、或交给插件市场。

**碰不碰已冻结边界**：**不碰**，改动面最小 —— B2/B3/B4 零影响，B11（`assert.match(r.installCmd, /dsh plugin add dsh-life-pack dsh-/)`，`test/plugin-p10-boundaries.test.mjs:105-114`）要求 `installCmd` 仍是那条单命令双包命令，所以 `recoFor` 的 `installCmd` 与 `hint` 一个字都不能改，只能在外层加按钮。

**桌面宿主下会不会诚实失败**：**这条路根本不发起自动装，所以不存在诚实失败**；代价是**它也不提供安装能力**，用户仍然必须离开面板去终端（或去插件市场），与用户「提供安装能力」的要求只满足一半。

### (d) 补充候选：借第三方插件市场 `dshmarket` 的公开更新 API

**先给结论**：本机确实有两个「插件市场」，但只有 `dshmarket` 提供可被第三方面板调用的公开接口；内置的 `dsh-community-market` **不可通过 cordis 服务调用**，也没有公开给第三方的安装/更新 API。

**(d1) 对外接口是什么**

- 内置 `dsh-community-market`：插件名 `community-market`（`D:\0Tools\DSH Desktop\resources\app\node_modules\dsh-community-market\src\index.ts:17`），`inject = ['webServer','settings']`（`:18`），`apply` 里只做 `registerMarketRoutes` 与几个 `ctx.inject`（`:34-85`）。全包检索 `extends Service` / `ctx.provide` **零命中**（只有 `new MarketInstallService(...)` 这种内部类）——它**不是 cordis 服务**，`ctx.get('community-market')` 取不到东西。它对外只有 10 条 HTTP 路由，前缀 `/api/community-market/`（`...\src\host\routes.ts:71-80`），读路由要求回环 + 期望端口 + 非跨站（`:326-345`），写路由还要同源 `Origin`（`:347-356`）。面板与它同源，所以**技术上可以 `fetch`**（它自己的客户端就是这么干的，`...\src\client\api.ts:42`、`:101`、`:135`、`:147`）。
- 第三方 `dshmarket`（`web` profile 已装 `1.47.0` 且已进 bundles；`desktop` profile `1.44.0`）：插件名 `dsh-market`（`...\dshmarket\lib\index.js:8`），**有正式的公开 API**：`dsh-market/update-api/v1`，路径前缀 `/dsh-market/api/v1/`（`...\dshmarket\UPDATE-API-V1.md:14-17`）。文档明说这条 API 的用途就是「让插件显示自己的更新按钮，而**不必自己去起包管理器**、不必抄市场算法」。三条主要接口：
  - `GET /dsh-market/api/v1/capabilities` —— 发现接口（含 `runtime: 'web'|'desktop'`、`features.{check,update,progress,rollback,restart}`、`restart.supported/managedBy`、`operationLimit`、`endpoints`），第一件事就该读它（`...\lib\routes.js:786-831`；文档 `:25-34`）。
  - `GET /dsh-market/api/v1/updates?name=<包>&force=1` —— 查单个已装包的更新（文档 `:36-44`）。
  - `POST /dsh-market/api/v1/updates` body `{"packageName":"<包>"}` → 立刻 202 + `operationId`；再 `GET /dsh-market/api/v1/operations?operationId=<id>` 轮询（文档 `:46-96`）。另有 `POST .../rollback`、`POST .../restart`（文档 `:98-124`）。写操作一律 `method==='POST'` + `sameOrigin(request)`，否则 403 `untrusted origin`（`...\lib\routes.js:871-877`、`:956-962`）。
  - 状态字段与失败码在 `...\lib\update-api-v1.js:8`（schema 常量）、`:21-39`（`DOWNGRADE_DETECTED` / `RESOLVED_VERSION_MISMATCH` / `AGENTS_RUNNING` / `OPERATION_BUSY` / `RELEASE_TOO_FRESH` / `VERSION_UNCHANGED` / `UPDATE_TIMEOUT` / `UPDATE_FORBIDDEN` / `UPDATE_REJECTED` / `UPDATE_FAILED`）。

**(d2) 它的安装/卸载走哪条路**

- `dsh-community-market`：**不走 `dsh plugin add`**。安装分支直接 `runPnpm(['add', ...])`（`...\src\install\service.ts:647-651`），`runPnpm` 调 `this.pnpm.run(args, signal)`（`:843-847`），即 Desktop 的 `desktopPnpm` 服务；`DesktopPnpmService.run` 直接执行 pnpm（`D:\0Tools\DSH Desktop\resources\app\lib\pnpm.js:67-80`，并前置 `--config.minimumReleaseAge=0`，`...\lib\pnpm-policy-Dj9BWmx3.js:7-12`），装完自己写 `dsh.profile.bundles`（`...\src\install\service.ts:653`）。卸载是 `['remove', name]`（`:727`）。
- `dshmarket`：**走 `dsh plugin`**。`runDshPlugin()` 起子进程跑 `[...dsh 入口参数, 'plugin', '--profile', profile, ...pluginArgs]`（`...\dshmarket\lib\dsh-cli.js:686`），而 `dsh plugin` 已证实是 pnpm 薄转发（`@deepseek-ai\dsh\lib\plugin-Ddi42qoW.js:101-114`）；桌面宿主下改走 `desktopPnpm` 分支（`...\dshmarket\lib\dsh-cli.js:765-800`）。

**(d3) 第三方设置面板能不能「打开插件市场并跳到某个包」**

- **跳到某个包：不能。** 市场的打开状态是一个 `defineStore` 句柄，状态只有 `{ open: boolean }`，动作只有 `open`/`close`（`...\dsh-community-market\src\client\market-view-store.ts:3-19`）——**没有「目标包」这一维**。它只在 `sidebar.footer.action` 槽注册时作为 `store` 传出（`...\src\client\index.ts:40-47`），`slots.entries(key)` 确实会把 `store` 字段原样交出来（`...\@deepseek-ai\dsh-client-ui-slots\lib\index.js:113-131`、`:172-173`），所以理论上能 `entries('sidebar.footer.action')` 捞到句柄再触发 `open`——但这是**未文档化的内部手法**，且即使打开也停在小部件视图，不能定位到某个包。设置里的市场 tab 也一样：`MarketSettingsTab` 的 `initialView` 只到视图级（`'installable'`，`...\src\client\MarketSettingsTab.tsx:244`、`:1114`），没有包名参数；插件设置页 tab 条选中态是组件内 `useState`，外部改不了（`...\@deepseek-ai\dsh-client-ui-settings-plugins\lib\client.js:430-433`、`:473-475`）。`dshmarket` 的 API v1 文档也把兜底写成「退回**打开**市场」（`...\UPDATE-API-V1.md:131-132`），不是「跳到某包」。
- **只能给用户一句话指引：能。** 市场在设置面板里的位置与文案是稳定的：市场作为 `settings.plugins.tab` 的一个 tab 注册，id `'community-market'`、`order: 20`（`...\dsh-community-market\src\client\index.ts:32-39`），tab 文案取自它自己的字典 `tab: '插件市场'`、`title: '社区插件市场'`（`...\src\client\locales.ts:2-3`）。所以缺席卡里可以写「去 设置 → 插件 → 插件市场 里装 <包>」，这是**唯一稳的**做法。

**(d) 三样**

- **要改哪些包**：只改 `packages/plugin-manager`（客户端加同源 `fetch` 调 `/dsh-market/api/v1/*`，或退一步只加一句指引文案）。六单品零改动。**硬前提**：目标环境必须装了 `dshmarket`；内置的 `dsh-community-market` 没有公开的更新/安装 API，帮不上。
- **碰不碰「总管不 import 单品」这条已冻结边界**：**不碰**。走 HTTP 与 `UPD_*` 常量都不涉及 import；若走浏览器 `fetch`，总管客户端 `inject` 不必加 `connection`（`fetch` 是全局的），C2 那条 `.connection` 断言也不会触发；若走 `connection.rpc.call`，则按 C2 必须把 `'connection'` 加进 `inject`（`test/client-bundle-48.test.mjs:87-95`）。
- **桌面宿主下会不会诚实失败**：**分两面看**。① 更新/安装本身：`capabilities` 里 `runtime` 会报 `'desktop'`，`features.update` 仍为真，桌面分支照样有执行路径（`...\dshmarket\lib\dsh-cli.js:765-800`），所以不是「必然诚实失败」。② 重启：桌面宿主下 `restart.supported` 恒为假、`managedBy` 报 `'desktop-host'` 或 `'operator'`（`...\lib\routes.js:796`、`:816-820`；文档 `:31-34`：客户端必须隐藏重启按钮）——**待重启提示要落到「重启 DSH Desktop」上，不能自己给重启按钮**。③ 失败码由 API 自己表达（`UPDATE_FORBIDDEN` / `UPDATE_REJECTED` / `RELEASE_TOO_FRESH` 等，`...\lib\update-api-v1.js:21-39`），不落回本仓那套「诚实失败转手工命令」的语义。
- **另有一条风险**：`dshmarket` 是**第三方**插件（`repository: github.com/dsh-market/dsh-market`，`...\dshmarket\package.json`），不是 DSH 自带；本机两个 profile 都装了它，但换一台机器就不一定在。这条路的使用寿命绑在别人的发布节奏上。

---

## 三、遗留

> 每条给复现命令与读数。凡「未复现」都明说。

**1. 更新包 checkout 与已发布/已装版本漂移**

- 复现：`npm view dsh-plugin-update version` → 读数 `0.1.1`。
- 复现：`Get-Content packages/dsh-plugin-update/README.md | Select-String '当前版本'` → 外部目录里写的是「当前版本 `0.1.0`」（`...\dsh-plugin-update\README.md:16`）。
- 复现：读已装清单 `C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-plugin-update\package.json` → 读数 `"version": "0.1.1"`，且 `exports` 只有两项：`"." → "./dist/host.js"` 与 `"./package.json"`——**没有 `./client` 子路径出口**（客户端入口靠 `derive-client-values.mjs` 直接按文件路径吃 `dist/client.js`，见 `...\derive-client-values.mjs:86-87`）。
- 影响：文档与包不同步，按 README「当前版本 0.1.0」去 `npm view` 查重名会得到不一致的结论；任何想 `import 'dsh-plugin-update/client'` 的写法都会失败（只能走构建期派生）。

**2. `dsh-plugin-update` 在本机是「传递依赖」，总管今天解析不到它**

- 复现：读 `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json` → 读数 `dependencies` 里**没有** `dsh-plugin-update`（只有 `dsh-life-pack`、六个单品、`dshmarket` 等）；但 `Get-ChildItem ...\profiles\web\node_modules` 里**有** `dsh-plugin-update`（随 `dsh-mattpocock-skills-deck` 带进来的传递依赖）。
- 后果：按 `dsh plugin` 的归并语义（只扫**直接** dependencies，`@deepseek-ai\dsh\lib\plugin-Ddi42qoW.js:46-59`）它不进 `dsh.profile.bundles`；且 pnpm 隔离布局下总管自己的 `packages/plugin-manager/node_modules` 里实得只有 `.bin`、`@types`、`react`、`tsdown`（读数），无 `dsh-plugin-update`。
- 影响：候选 (a)/(b) 都必须先给总管/六家显式加 `dsh-plugin-update` 依赖并安装；「已经在本机 node_modules 里了」不等于「能 import」。

**3. `plugin-p10-boundaries` 的「面板链路须经 host.call」这条断言今天空转**

- 断言原文：`assert.ok(t.includes('host.call'), d + ' 面板链路须经 host.call')`（`D:\ilife\test\plugin-p10-boundaries.test.mjs:53`）。
- 复现：`Get-ChildItem packages/plugin-*/src -Filter *.ts | Select-String 'requestViaHost|host\.call'` → 读数：六家**都只有** `bridge.ts:72`（卡路里在 `bridge.ts:165`）这一处，都在 `requestViaHost()` 的函数体里，而 `requestViaHost` 只被各家 `index.ts` 重导出（如 `packages/plugin-bill-ilife/src/index.ts:41`），**没有任何调用方**。
- 真链路是另一套：卡路里/备忘录的面板走 `connection.rpc.call('/api', RPC_CHANNEL.slice(1), {method,payload})`（`packages/plugin-calorie/src/client.ts:169`）；另外四家的面板**根本不取数**（`packages/plugin-bill-ilife/src/client.ts:1-11` 头注释「不取数」，`:60-73` 只注册静态页）。
- 影响：这条断言今天被一段死代码满足，等于在「六家面板都真的经由 host.call 取数」这个命题上**什么都没证明**。与 `tooling/check-boundaries.mjs:60-63` 里作者自己警告过的「名单清空＝断言空转」是同一类问题。

**4. 更新包 `cli-process` 路由的运行时取值可能不适用于 Electron 宿主（未复现）**

- 静态读数：`runCliProcess` 在 `runtimeExecutable` 未注入时回落到 `process.execPath`（`...\dsh-plugin-update\src\store.ts:425`），且起进程时只传 `argv`/`cwd`/`stdio`/`graceMs`（`:436-441`），**没有设置 `ELECTRON_RUN_AS_NODE`**；`deps.runtimeExecutable` 默认恒为 `undefined`（`...\src\host.ts:185`）。
- 对照：本仓卡路里桥踩过同一个坑并专门加了处理——文件原话「Desktop 宿主的 `process.execPath` 是 Electron 二进制，直 spawn 会起 GUI 子进程永不退出」，对策是 `resolveNodeBin()` 在非 node 的 execPath 上加 `ELECTRON_RUN_AS_NODE=1`（`packages/plugin-calorie/src/bridge.ts:168-177`）。
- **未复现**：本轮没有在 Electron 宿主上实跑这条路由（桌面宿主下 `detectEnvironmentKind` 会先判成 `'desktop'` 走路由 A，所以触发条件本身也窄：需要「宿主是 Electron 但探测不到 `desktopProfiles`」）。仅作为静态观察记录，不作为结论。

**5. 本机同时存在两个「插件市场」，且都叫「市场」**

- 读数：内置的 `dsh-community-market` 在 `D:\0Tools\DSH Desktop\resources\app\node_modules\` 下（不进任何 profile 的 dependencies，且 `package.json` 标 `"private": true`、`dsh` 字段只有 `client` 没有 `bundle.patch`）；第三方 `dshmarket` 在 `C:\Users\辰辰洋洋\.dsh\profiles\{web,desktop}\package.json` 的 `dependencies` 与 `dsh.profile.bundles` 里（`web` 为 `1.47.0`，`desktop` 为 `1.44.0`）。
- 影响：写面板指引文案时「插件市场」四个字指谁不明确；两者能力也不同（前者只有同源 HTTP 路由且不公开给第三方，后者有公开 API v1）。留给方案阶段拍板。

**6. 未发现缺陷的项（写明「查不到」的部分）**

- 更新包 `src/` 下被点名的文件里，**没有 `gate.ts`／`store.ts` 的「门禁模板自查」实现在 host/client 之外另作调用**的部分需要单独说明——`gate.ts`（11365 字节）只承载 README 第 6 节的清单校验器（`parseEventListManifest` / `checkEventFields` / `checkEventCounts`，README `:149-159`），与安装/更新主链路并行、不参与三个电话。**本调查未逐行读完 `gate.ts` 全文**（只按 README 第 6 节与包根导出核对），若需要门禁细节要另起一轮。
- 本调查**未**验证 `dsh plugin --help` 的实际输出（改用源码取证，见 1.2 表最后三行）；也**未**在本机实跑任何安装/更新动作（不越权、不改环境）。
