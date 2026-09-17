# 事实：DSH 插件配置能落在哪

调查范围：`D:\0Tools\DSH Desktop\resources\app\`（DSH 本体，只读）、`D:\dsh-plugin\dsh-mattpocock-skills-deck\packages\dsh-plugin-update`（只读）、本机 `$DSH_HOME`（`C:\Users\辰辰洋洋\.dsh`，只读查看）。全程未改任何源码、未切分支、未提交。

一句话总答案：**官方给 cordis 插件准备了通用配置服务，但没有「每插件一个配置目录」的约定；插件自留配置的既有形状是「家目录下按插件标识派生一个目录」或「profile 目录下按插件名派生一个点目录」，两者都不在 DSH 的覆写清单里。**

## 一、目录布局与「哪块会被覆写」

### 1.1 DSH_HOME 是什么、在哪

- 家目录解析规则：显式配置 > 非空白环境变量 `DSH_HOME` > `join(homedir(), '.dsh')`。出处 `@deepseek-ai/dsh-home-paths/lib/index.js:8-10`（`defaultDshHome()`）、`:23-29`（`resolveDshHome(configured, env)`）。变量名常量 `DSH_HOME_ENV` 由同包导出（被 `dsh-shell-env` 引用，见 `@deepseek-ai/dsh-shell-env/lib/index.js:4`）。
- 本机实测：`$env:DSH_HOME` = `C:\Users\辰辰洋洋\.dsh`。

### 1.2 `$DSH_HOME` 下面有什么（本机实测，非推测）

顶层目录：`agents-anywhere/`、`attachments/`、`cache/`、`dsh-im/`、`integrations/`、`llm-deepseek/`、`logs/`、`profiles/`、`sessions/`、`storages/`、`updates/`。

顶层文件：`.anonymous-user-id`、`.credentials.yaml`、`settings.yaml`（另有 4 个 `settings.yaml.bak.*`）。

其中 `settings.yaml` 是**用户设置文档**，见第三节；`storages/`、`updates/`、`integrations/`、`logs/`、`cache/` 都是**插件自己的状态目录**，分别来自官方存储后端与第三方插件（见第二节）。

### 1.3 profile 在哪、里面有什么

- profile 目录 = `join(home, 'profiles', name)`。出处 `@deepseek-ai/dsh-app-boot/lib/index.js:312`（`PROFILES_DIR = "profiles"`）、`:323-326`（`resolveProfileDir`）。
- 本机 `$DSH_HOME/profiles/` 下有：`desktop/`、`dsh-build/`、`empty/`、`headless/`、`node_modules/`、`visionreview/`、`web/`。
- 一个 profile 目录里 DSH 拥有的东西（实测 `profiles/desktop/`，并用源码核对）：`package.json`、`cordis.patch.yml`、`cordis.yml`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`node_modules/`、`.dsh-module-fallback/`。
- **除了上面这些，profile 目录里没有任何官方「插件设置」文件**。`profiles/desktop/` 与 `profiles/empty/` 下的 `.dsh-market/` 是第三方市场自己建的（见第二节），不是 DSH 的约定。

### 1.4 哪块会被 DSH 覆写／清理（本节是关键）

| profile 内路径 | 谁动它、什么时候 | 出处 | 判断 |
|---|---|---|---|
| `cordis.yml` | Desktop 每次准备 profile 时**无条件覆写**成 `[]\n` | `lib/profile-pZhrTizp.js:173`（`DESKTOP_PROFILE_ROOT = "cordis.yml"`）、`:691-693` | **绝对不能放配置**，每次启动清零 |
| `package.json` | 只在缺失时由 `initProfile` 创建；漂移时由 `writeProfileManifest` 整体重写（Desktop 侧按 bundles/patchReload 漂移触发；boot 侧按发布的 profile 模板归一化） | `dsh-app-boot/lib/index.js:379-398`、`:780-782`、`:793-814`；`lib/profile-pZhrTizp.js:317-338` | DSH 拥有；重写是 spread 原 manifest，未知键会保留，但**你不该往这里塞配置** |
| `pnpm-workspace.yaml` | 缺失即创建；每次启动 reconcile 三个键（`packages`/`nodeLinker`/`autoInstallPeers`） | `dsh-app-boot/lib/index.js:396-397`；`lib/profile-pZhrTizp.js:351-373` | DSH 拥有，会被改写 |
| `cordis.patch.yml` | `initProfile` 缺失即写模板；之后由 loader 与第三方市场各写自己的一段 | `dsh-app-boot/lib/index.js:394-395`；`dshmarket/lib/patch.js:393,404,410,436,472,518` | **多方共写的用户 patch 层**，不是插件私有文件 |
| `node_modules/`、`pnpm-lock.yaml`、`node_modules/.modules.yaml`、`.pnpm-workspace-state-v1.json`、`.package-map.json` | pnpm 拥有，会被重装/清理 | 实测目录；`lib/profile-pZhrTizp.js:388-406` | 不能放配置 |
| `.dsh-module-fallback/` | DSH 生成的安装回退代理/软链；旧代会被主动删除 | `dsh-app-boot/lib/index.js:316`（`PROFILE_MODULE_FALLBACK_DIR`）、`:657-683`；`lib/profile-pZhrTizp.js:935-1029`（`removeObsoleteDesktopSharedModuleFallback`，只删它认得的代理，见 `:989-992` 注释） | DSH 拥有 |
| `.dsh-market/state.json` | 被 Desktop 的「健康启动检查点」纳入统一回滚清单 | `lib/profile-channel-admission-CVuyDpHt.js:960-966`、`:978` | 第三方文件被官方纳管，会随检查点回滚 |

**Desktop 健康检查点（health checkpoint）的准确边界**——这是回答「会不会被覆盖或删除」的关键机制：

- 三槽轮转（`slot-1`/`slot-2`/`slot-3`）。出处 `lib/profile-channel-admission-CVuyDpHt.js:955-959`。
- 恢复时**只动固定 7 个文件**：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`cordis.patch.yml`、`.dsh-market/state.json`，加上 `home/settings.yaml`、`home/cordis.patch.yml`（后两个指向 `$DSH_HOME` 顶层，见 `:1192-1196`）。清单出处 `:960-981`（`LEGACY_PROFILE_CHECKPOINT_FILES` / `DESKTOP_PROFILE_CHECKPOINT_FILES` / `FILE_LIMITS`）。
- 恢复实现逐个文件「有则写回、记录为 absent 则 `unlinkSync`」，**只遍历这 7 个名字**。出处 `:1373-1389`。文件头注释也写死了这个范围：`:932-940`（「it only restores the fixed declarative Profile and Harness-home files listed below」）。
- 捕获是自动的（每次健康启动）：`lib/main.js:4628 profileCheckpoint?.captureHealthy()`。恢复是用户触发的：`lib/main.js:1127 this.options.checkpoints.restoreSlot(preview.slotId)`。
- 因此：**不在这 7 个名字里的文件，检查点恢复不读、不写、不删。**

**整个 profile 目录被删掉的情况只有一条**：用户在 Desktop 里删除一个未激活的 profile。出处 `lib/profile-manager-SYprTE_H.js:244-267`（`deleteDesktopProfile`，注释原文「Remove one inactive user profile」）。

**没找到**任何「启动时清扫 profile 目录里未知文件」的代码。`initProfile` 的文档注释明确：`dsh-app-boot/lib/index.js:373-374`「Existing files are never touched, so re-running is a no-op on an initialized profile」。

### 1.5 结论（一句）

**把插件自己的配置写成 `<profile>/` 下一个以插件名派生的文件或点目录，DSH 不会覆盖也不会删除**；唯一硬禁区是 `cordis.yml`（每次启动清成 `[]`），其次不要指望 `package.json`、`pnpm-workspace.yaml`、`cordis.patch.yml` 保持你的内容。若想再稳一档，就放到 `$DSH_HOME` 顶层（`updates/`、`storages/`、`integrations/`、`logs/`、`cache/` 都是既有的同类落点），完全不进 profile 目录。

## 二、既有先例（逐个插件：路径形状 + 出处文件:行）

### 2.1 `D:\dsh-plugin\dsh-mattpocock-skills-deck\packages\dsh-plugin-update`

形状：**家目录下按插件标识派生的目录 + 三个固定文件名**。不在 profile 目录里。

- 路径规则：`join(家目录, 'updates', 插件标识, 使用范围短指纹)`。出处 `src/store.ts:5-7`（头注释规则 1）、`src/store.ts:56-60`（`pathsForUpdate(homeDir, pluginId, profileDir)`，`:59` 就是 `join(homeDir, LEGACY_SEGMENT, pluginId, shortHash(profileDir))`）。
- 旧路径特例（永久冻结）：`src/store.ts:27-28`（`LEGACY_SEGMENT = 'updates'`）、`:64-67`（`legacyPathsForUpdate`，第三段固定 `dsh-mattpocock-skills-deck`）、`src/config.ts:21-25`（`LEGACY_PLUGIN_ID`、`LEGACY_DIR_SEGMENT`）。同文件 `:21` 注释原话：「落盘目录按插件标识派生时，取该值即回到旧路径（永久冻结特例）」。
- 三个文件名：`state.json`、`install.lock`、`before.json`。出处 `src/config.ts:27-29`（`STATE_FILE` / `LOCK_FILE` / `BACKUP_FILE`）。
- 家目录推导：配置项 `homeDir`，默认走「环境变量 `DSH_HOME` 优先，否则家目录下 `.dsh`」。出处 `src/config.ts:51-52`（`homeDir` 字段注释）、README.md:121。
- README 第 4 节原文（`README.md:127`）：「落盘目录按标识派生：家目录下 `updates` 加插件标识加使用范围短指纹，三文件名保持 `state.json`、`install.lock`、`before.json` 不变。标识取旧值时路径与旧原文一字不差（永久冻结）。读走双读（先新后旧），写只写新，旧路径只读保留。」
- 隔离维度：同机多插件靠 `pluginId` 分一级目录，同插件多 profile 靠 `shortHash(profileDir)` 分二级目录。README.md:161 记录了「第二家同机隔离自查」的断言（电话名、目录、锁互不串）。
- 本机实测落地：`C:\Users\辰辰洋洋\.dsh\updates\dsh-mattpocock-skills-deck\673e0ed90d45ec65705231c3\` 下有 `state.json`、`before.json`。同层还有 `dsh-im`、`dsh-im-companion`、`dsh-prompt` 三家同构目录——**这已经是本机的事实惯例**。

### 2.2 `D:\0Tools\DSH Desktop\resources\app\node_modules\dshmarket`（第三方插件，最有参考价值）

形状：**profile 目录内的点目录 `.dsh-market/` + 若干 JSON/NDJSON 文件**。它把状态写在 **profile 目录里**。

- 目录常量：`'.dsh-market'`。出处 `lib/hot.js:32`（`HOT_DIR = '.dsh-market'`）、`lib/presets.js:9`、`lib/snapshot.js:7` 与 `:23`（`SNAPSHOT_DIR = join('.dsh-market', 'snapshots')`）、`lib/routes.js:152`。
- 具体文件（本机实测 `C:\Users\辰辰洋洋\.dsh\profiles\desktop\.dsh-market\`：`discovery-compatibility-v1.json`、`log.ndjson`、`state.json`；`profiles\empty\.dsh-market\`：`log.ndjson`、`state.json`）：
  - `state.json` —— 禁用列表 + 自定义分组，**持久**。出处 `lib/hot.js:11-12`（注释「`state.json` in the same directory is the market's own durable state (disable list + custom groups) and deliberately survives the wipe」）、`:147-149`（`stateFile(profileDir)`）、`:131`。
  - `presets.json` —— 命名预设，上限 50 个。出处 `lib/presets.js:9-11`、`:60-62`（`presetsFile`）、`:77-80`（`writePresets` 先 mkdir 后原子替换）、`:31`（`MAX_PRESETS = 50`）。
  - `snapshots/` —— profile 快照目录。出处 `lib/snapshot.js:23`；快照内容清单 `lib/snapshot.js:37`（`['package.json', 'cordis.patch.yml', '.dsh-market/state.json']`）。
  - `log.ndjson` —— 可导出的日志。出处 `lib/routes.js:152`；`lib/log.js:93`（注释「Called once per mount with `<profile>/.dsh-market/log.ndjson`」）。
  - `discovery-compatibility-v1.json` —— 本机实测存在，未逐行定位到写入点（明说：查不到写入点，不猜）。
- 它的清理边界非常克制，值得抄：每次启动调 `cleanHotDir`，**只删 `hot-<n>.yml` 这种一次性挂载输入**，`state.json` 明确保留。出处 `lib/hot.js:129-146`（正则 `/^hot-\d+\.yml$/` 与 `:143`）；语义注释 `:11-12`、`:450-453`。整目录删除只在「用户卸载市场」时发生（`purgeMarketState`，`lib/hot.js:456-465`，注释「只有用户要求时才删」）。
- 它对「共写文件」的态度：市场会往 `<profile>/cordis.patch.yml` 写自己名下的 patch 行块（`lib/patch.js:393,404,410,436,472,518`；路径解析 `:92-114`），但状态本体一律放 `.dsh-market/`。
- 它被官方纳管的程度：`.dsh-market/state.json` 出现在 Desktop 检查点清单里（`lib/profile-channel-admission-CVuyDpHt.js:965,978`）。另有市场自己的备份逻辑跳过 `node_modules`、`.dsh-market`、`.git`、`pnpm-lock.yaml` 与 `*.bak`（`dshmarket/lib/backup.js:18`、`:40`）。

**它落在 `$DSH_HOME/profiles/<名字>/.dsh-market/`，不是 `$DSH_HOME` 顶层。** 这是「第三方插件把配置留在 profile 目录里」的活样本，且已在本机跑通。

### 2.3 DSH 本体有没有「插件设置」的官方落盘点

有服务，没有「每插件一个目录/文件」的约定——落点就是下面两个通用服务（详见第三节）。

- `settings` 服务落盘文件是 `$DSH_HOME/settings.yaml`，不是 profile 里的文件。出处 `@deepseek-ai/dsh-settings-file/lib/index.js:27`（注释「otherwise the document lives at `<harness home>/settings.yaml`」）、`:32`（`resolve(config.path ?? join(resolveDshHome(config.dshHome), "settings.yaml"))`）。
- 本机 `settings.yaml` 里已经躺着两个第三方插件的 namespace：`dsh-better-sidebar:`（第 125 行起，`agentOpenTools`/`titleBarScheme`/`browserNoSandbox` 等）与 `vision-router:`（第 134 行起，`onboardingSeen`/`desktopScreenshot`/`providers`/`routingMode` 等）。这**就是本机既有插件「把用户配置写在哪」的现行答案**。
  - vision-router 的注册点：`C:\Users\辰辰洋洋\.dsh\profiles\desktop\node_modules\dsh-vision-router\index.js:7257`（`sctx.settings.register('vision-router', Config, {...})`）。
  - 同文件 `:337-343` 另有注释说明「写进 profile settings file 而不是 origin-scoped localStorage」，以及默认 `artifactsDir: '.dsh-vision-router/artifacts'`（那是工作区相对路径，不是配置落点）。
- `dsh-usage-statistics-panel` 用另一个服务把状态写进 `$DSH_HOME/storages/usage_history.json`（出处见 3.2）。
- `dsh-im-companion` 走的是**家目录顶层按插件名派生目录**的自留路线：`~/.dsh/integrations/dsh-im-companion/meta.json`（出处 `C:\Users\辰辰洋洋\.dsh\profiles\desktop\node_modules\dsh-im-companion\lib\host\meta-store.js:1` 头注释）。本机实测 `$DSH_HOME/integrations/` 下有 `dsh-feishu/`（`config.json`、`workspaces.json`、`bots/`）、`dsh-im/`（`interface-language.json`）、`dsh-im-companion/`（`meta.json`）、`dsh-weixin/`（`config.json`、`workspaces.json`、`accounts/`）。
- `$DSH_HOME/cache/vision-router/live-models.json`、`$DSH_HOME/logs/vision-router/vision-router.log`、`$DSH_HOME/dsh-im/mappings.json` 同理——都是插件自留的家目录顶层目录，各带插件名。

### 2.4 三类形状对照

| 形状 | 代表 | 路径 | 代价 |
|---|---|---|---|
| 家目录顶层 + 插件标识目录 | `dsh-plugin-update`、`dsh-im-companion`、`dsh-feishu`、`dsh-vision-router`（cache/logs） | `$DSH_HOME/<用途或插件名>/<插件标识>/...` | 天然多插件隔离、天然多 profile 隔离（需自己加 profile 维度）；不享受 profile 的搬迁/快照语义 |
| profile 内点目录 | `dshmarket` | `<profile>/.dsh-market/<文件>` | 跟着 profile 走；但 `.dsh-market/state.json` 被官方检查点纳管会回滚，其他文件不会 |
| 官方 settings namespace | `dsh-better-sidebar`、`vision-router` | `$DSH_HOME/settings.yaml` 的 `<ns>:` 段 | 无需自建文件与并发写；但只适合「用户可见可改的配置」，且要有 schema 与 owner 作用域 |

## 三、有没有官方配置存储服务（结论 + 出处）

**有。三个，都挂在 `ctx` 上，都是 `extends Service` 的 cordis 服务，且本机组合里都已挂载。**

先把 `D:\0Tools\DSH Desktop\resources\app\node_modules\@deepseek-ai\` 下所有 cordis 服务名列一遍（按 `super(ctx, "<名>")` 搜出的服务名，去重）：

`agentDefaultModel`、`agentLoop`、`agentPresets`、`agents`、`approval`、`attachments`、`authorization`、`clientModules`、`codeRuntime`、`commands`、`commandUi`、`compaction`、`connection`、`conversation`、`cordisInspect`、`credentials`、`credentialsController`、`deepseekLlmApiExtensions`、`directoryPicker`、`directoryPickerController`、`dynamicCordisRunner`、`fileReferences`、`fileUpload`、`fileUploads`、`fs`、`goals`、`hmr`、`inputTriggers`、`invariants`、`jobs`、`llm`、`messageFeedback`、`modelDirectories`、`permissionPresets`、`planMode`、`pluginInventory`、`remote`、`sandbox`、`sandboxPolicy`、`sessionController`、`sessionFeedback`、`sessionFileReferences`、`sessionPersistence`、`sessionProjectionCache`、`sessionProjections`、`sessionQuery`、`sessionReferenceResolver`、`sessions`、`sessionSkillCatalog`、`sessionTelemetry`、`sessionTitle`、`settings`、`settingsController`、`settingsSchema`、`settingsScope`、`shell`、`shellEnv`、`skills`、`slots`、`spillStore`、`storage`、`subagentModelSelection`、`subagents`、`subprocess`、`systemPrompt`、`terminals`、`timer`、`tokenMeter`、`toolResultPruner`、`tools`、`typert`、`typertGateway`、`uiConversation`、`uiSession`、`uiWorkspace`、`userQuestions`、`web`、`webhookRuntime`、`webServer`、`workflowEngine`、`workspaceController`、`workspaceFiles`、`workspaceRegistry`、`workspaces`。

其中与「持久化配置」直接相关的只有下面三个。

### 3.1 `ctx.settings` —— 用户设置服务（最贴「配置持久化」）

- 服务定义：`@deepseek-ai/dsh-settings/lib/index.js:230`（`var SettingsProvider = class extends Service`）。文档注释 `:76`：「Service Definition for the user-settings capability seam (`ctx.settings`)」。
- 落盘位置：`<harness home>/settings.yaml`，即本机 `C:\Users\辰辰洋洋\.dsh\settings.yaml`。证据 `@deepseek-ai/dsh-settings-file/lib/index.js:27`、`:32`、`:171`（`await writeFileAtomic(this.spec.filename, output, ...)`，带写锁与原子替换：`:7` `withFileLock, writeFileAtomic`）。
- 本机已挂载：`@deepseek-ai/dsh-base/cordis.patch.yml:87-91`——注释「User-settings document (`$DSH_HOME/settings.yaml`, hot-reloaded)」，`id: settings` / `name: '@deepseek-ai/dsh-settings-file'`。
- 用法（README）：插件用 schemastery schema 注册自己的 namespace，可把组合配置作为 `base` 层传入；`scope.get()` 拿深冻结解析值，`scope.update(patch)` 只写用户层并持久化。出处 `@deepseek-ai/dsh-settings/README.zh.md:48-56`、`:66-68`。
- 第三方实证：`dshmarket/lib/settings.js:96-108`——`ctx.inject(['settings'], (scopedCtx) => { const scope = scopedCtx.settings.register(MARKET_SETTINGS_NS, MarketSettings, { base: entry }); ... scope.watch(apply) })`；namespace 常量 `:63`（`MARKET_SETTINGS_NS = 'dsh-market'`）。
- namespace 命名规则：`/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`。证据 `dshmarket/lib/settings.js:61`。
- **注意一个已发生的上游破坏**：dsh 0.1.2-alpha.1 删掉了 `installSettingsSection` 与 `settingsNamespace` 两个具名导出，第三方的具名 import 会变成模块求值期的 SyntaxError、宿主直接 exit 1。`dshmarket/lib/settings.js:36-53` 完整记录了这个坑与修法（只依赖 service 本身，不依赖包装导出）。写新插件时应照此办理。
- 优雅降级：服务本身不存储任何内容；没有挂载提供方时 `ctx.settings` 不存在，插件回退到组合配置。出处 `@deepseek-ai/dsh-settings/README.zh.md:36`、`:12`、`:32`。
- 写入约束：拒绝 JSON 不兼容的值（`Date`/`Map`/`BigInt`/非有限数/循环引用），支持 `expectedRevision` 拒绝陈旧写入。出处 `README.zh.md:68`。
- 客户面口径：`ctx.settings` 是宿主的服务，客户端半要经宿主电话取数——这与任务描述的前提一致。

### 3.2 `ctx.storage` / `ctx.storageDomain` —— 类型化应用数据

- 服务定义：`@deepseek-ai/dsh-storage/lib/index.js:104`（`var Storage = class extends Service`）、`:108-110`（`super(ctx, "storage")`）。
- 本机已挂载（三行齐备）：`@deepseek-ai/dsh-base/cordis.patch.yml:145-156`——`id: storage` / `@deepseek-ai/dsh-storage`，`id: storage-json` 且 `config.root: !!js dshHomePath('storages')`，`id: storage-domain` 且 `config.backend: json`。
- 落盘形状：单一布局是 `$DSH_HOME/storages/<单位名>.json`；逐记录布局是 `$DSH_HOME/storages/<单位名>/<表>/<键>.json` 加 `global.json`。出处 `@deepseek-ai/dsh-storage-json/lib/index.js:171-179`（`join(root, \`${descriptor.name}.json\`)`）、`:304-313`（`join(root, descriptor.name)`）；配置面 `:551`（`Config = z.object({ root: z.string().required() })`）。
- 名字约束：单位名与表名须匹配 `UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/`。出处 `@deepseek-ai/dsh-storage/lib/index.js:80`、`:590-591`。
- 第三方实证：`dsh-usage-statistics-panel` 用 `ctx.storageDomain` 开一个 `usage_history` 域写用量历史。出处 `dsh-usage-statistics-panel/lib/index.js:155-161`（注释点明落盘 `$DSH_HOME/storages/usage_history.json`）、`:1028-1065`（`storageDomain.open()` / `sharedStore(ctx.storageDomain)`）。
- 本机实测：`$DSH_HOME/storages/` 存在，含 `usage_history.json`、`dsh_automation.json`、`dsh_prompt.json`、`workspace.json` 与 `session_projcache/`。其中 `usage_history.json` 就是上面那个第三方插件的域文件——**单文件布局已在本机跑通**。

### 3.3 `ctx.shellEnv` —— 不是配置存储，是「给子进程塞环境变量」的登记处

见第四节 4.2。

### 3.4 明说：没有的东西

- **没有**「每插件一个 settings 文件/目录」的官方约定。搜遍 `resources\app\` 未发现 `profiles/<名字>/plugins/<插件名>/settings.json` 这类路径，也没发现任何按插件名分文件的 DSH 自留配置。
- **没有**把 profile 目录里某个固定文件当作「所有插件的配置汇总」的机制。
- **没有**给插件用的 `ctx.profile` 之类「拿我的 profile 目录」的服务（`resolveProfileDir` 是 `dsh-app-boot` 的普通导出，不走服务面）。

## 四、环境变量这条路的判断（能不能改、怎么改、证据）

### 4.1 插件改 `process.env` 能不能让后续 spawn 的子进程看到

**能，但会被两道筛子过滤掉一部分名字；判据在 `scrubbedParentEnv()`。**

- 每个 harness 子进程的环境起点是它：父进程环境**减去**凭据形状的名字（`SENSITIVE_ENV_PATTERN = /KEY|PASSWORD|SECRET|TOKEN/i`）**再减去**所有 `DSH_*`（不区分大小写）。出处 `@deepseek-ai/dsh-subprocess/lib/index.js:32`（正则）、`:50-56`（实现，`:52` 是那句过滤）。同一处的文档注释 `:33-44` 明确说明这是「the canonical base every harness child starts from」，并且**故意转发**某个值时走 spec 的显式 `env`（在筛子之后合并）。
- 显式 env 层在筛子之后合并：`@deepseek-ai/dsh-subprocess-local/lib/runner-launch-COYGu0Dl.js:649-662`（`childEnv(extra)` = `scrubbedParentEnv()` 上覆盖 `...extra`，Windows 下还把同名键折叠成一条）；最终环境 `:1618-1629`（`targetEnvironment(spec)` = `childEnv(spec.env)` 过滤 undefined）。
- 所以两条路：
  1. 插件直接 `process.env.FOO = 'x'` → **在同一个进程内生效**；随后 harness 用 `ctx.subprocess` 起的子进程会看到 `FOO`，条件是 `FOO` 既不匹配 `/KEY|PASSWORD|SECRET|TOKEN/i` 也不以 `DSH_` 开头（大小写不敏感）。名字撞上这两条就被静默丢掉。
  2. 插件自己 `spawn(..., { env: ... })`（或走 `ctx.subprocess.spawn({..., env})`）→ 显式 env 在筛子之后合并，**任何名字都能过，包括 `DSH_*`**。
- 也就是说，任务描述里的判断（「不改环境变量，只能在 spawn 时把额外变量并进子进程 env」）**方向对但不是全部事实**：改 `process.env` 确实能传染给后续子进程（因为子进程环境是 spawn 那一刻从父进程 `process.env` 快照里抄的），只是抄的时候会按上面两条规则剔除；而「spawn 时并进子进程 env」是唯一能带着 `DSH_*` 与凭据名穿过去的路。

### 4.2 `DSH_*` 这条路的官方口子：`ctx.shellEnv`

- 服务定义：`@deepseek-ai/dsh-shell-env/lib/index.js:35`（`var ShellEnvRegistry = class extends Service`）、`:45`（`super(ctx, "shellEnv")`）。
- 本机已挂载：`@deepseek-ai/dsh-base/cordis.patch.yml:243-244`（`id: shell-env` / `name: '@deepseek-ai/dsh-shell-env'`）。
- 能力：插件用 `ctx.shellEnv.register({ name, variables: { DSH_XXX: { description, resolve } } })` 登记自己的 `DSH_*` 变量，`collect(execution)` 为每次 shell 工具调用生成一份冻结快照。出处 `:48-74`（`register`）、`:75-96`（`collect`）。
- 硬约束（都在 `register` 里逐条检查）：键必须以 `DSH_` 开头、后缀匹配 `/^[A-Z][A-Z0-9_]*$/`、不得占用保留键 `DSH_HOME`/`DSH_SHELL`/`DSH_SESSION_ID`、键唯一、描述非空。出处 `:19-25`（保留键）、`:26`（后缀正则）、`:60-64`（检查）。
- 语义边界（重要）：`ShellEnvRegistry` 的服务面注释写明「**The namespace is rebuilt for every model shell call: ambient `DSH_*` values are discarded by the executor, then the registry's current snapshot is injected**」（`:27-33`）。也就是说，这条路喂的是**模型可见的 shell 工具调用**，不是任意宿主 spawn 的普通子进程。
- 消费点（仅两处）：`@deepseek-ai/dsh-tool-bash/lib/index.js:395`（`const dshEnv = ctx.shellEnv.collect(exec)`）、`@deepseek-ai/dsh-tool-pwsh/lib/index.js:373`（`dshEnv: ctx.shellEnv.collect(exec)`）。

### 4.3 宿主读到的环境不是 `process.env`，是启动快照

- Desktop 在启动时构造**不可变快照**并在 boot 回调里 provide 一次：`lib/host-process-entry.js:63`（`hostCtx.provide(DSH_LAUNCH_ENVIRONMENT_KEY, desktopLaunchEnvironment)`）；快照在 `:235` 由 `createLaunchEnvironmentSnapshot(wire.launchEnvironmentLayers)` 生成，层数据来自 `lib/main.js:3922`（`withDesktopDshHome(environment, homeDir)`）。
- 快照类型本身带「哪一层提供了这个值」的信息，层序 `process` > `project-env` > `user-env`。出处 `@deepseek-ai/dsh-launch-environment/lib/index.js:9-14`、`:30-54`。
- 消费方通过 `launchEnvironmentOf(ctx)` 解析，**不读扁平的 `process.env`**；只有宿主完全没提供快照时才退化成「拿当前 `process.env` 当唯一样本层」。出处 `:55-68`（关键在 `:64-67`）。模块头注释 `:2-7` 原话：「Harness consumers resolve through it instead of a flattened `process.env`; launchers may still materialize accepted values for config expressions and third-party libraries」。
- 推论：**插件运行时改 `process.env` 改不动已经建好的 `launchEnvironment` 快照**，因为它是启动期产物、且是服务槽位里的一份值。只有当宿主没提供快照时，消费方才会实时看 `process.env` —— 那是退化路径，不是可依赖的行为。

### 4.4 引导期把变量塞进进程环境的官方机制（供对照）

- `dsh-app-boot/lib/index.js:1091-1115`（`loadLayeredEnv`）：读 cwd 与家目录的 `.env` 层，对每层 `:1098`「`if (process.env[name] === void 0) process.env[name] = value`」——**只在原有值为空时才写**，并把 `process`/`project-env`/`user-env` 三层原样交给快照构造（`:1100-1115`）。
- 这是「启动期由宿主写 `process.env`」的唯一官方路径，属于引导而不是插件运行期能力；`.env` 的位置来自 `resolveDshHome()`（`:1092-1095`）。
- 全局搜 `process.env[...] = ...` 只命中两处包：`dsh-app-boot`（上面这条）与 `dsh-http-proxy`（`lib/index.js:369,373`，代理变量物化）。**没有任何地方提供「插件改进程环境变量」的服务。**

### 4.5 结论（一句）

宿主的运行期环境事实是**启动时定格的快照**，插件改不动它；插件改 `process.env` 只能影响「之后由它自己 spawn 的子进程」，且会被 `scrubbedParentEnv()` 剔除 `DSH_*` 与 `/KEY|PASSWORD|SECRET|TOKEN/i` 两类名字；要带 `DSH_*` 或凭据名给子进程，唯一的正路是 spawn 时把显式 `env` 并进去（`ctx.subprocess` 的 spec 支持），或对「模型可见的 shell 调用」用 `ctx.shellEnv.register` 登记。

## 五、给「配置存在哪」这个决定的可行落点清单（3 条以内，每条一句代价）

1. **优先用官方服务，不自己造文件：用户可见可改的配置走 `ctx.settings`（namespace 形如插件名，落 `$DSH_HOME/settings.yaml`）**；代价是必须给 schemastery schema、按 owner 作用域注册、且不能依赖 `installSettingsSection` 这类已被上游删掉的包装导出（要自己 `ctx.inject(['settings'], ...)`）。

2. **若配置是插件私有状态（缓存、游标、本地开关），写 `<profile>/.<插件名>/` 点目录，形状照 `dshmarket` 的 `.dsh-market/`（一个 `state.json` 扛状态）**；代价是 profile 目录里除 `.dsh-market/state.json` 之外的文件不享受官方检查点回滚，profile 被删除时一起没，且要学会自己克制清理边界（只清一次性文件）。

3. **若配置必须跨 profile 共享或与 profile 生命周期脱钩，写 `$DSH_HOME/<用途或插件名>/<插件标识>/`，形状照 `dsh-plugin-update` 的 `updates/<pluginId>/<profileDir 短指纹>/`**；代价是要自己加 profile 维度（否则多 profile 串状态）、自己处理读写锁与原子替换，并自己保证 DSH 升级时不被 concurrency 撞坏。
