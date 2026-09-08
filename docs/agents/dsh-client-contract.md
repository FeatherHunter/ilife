# DSH client 契约 cookbook（portable kit 之 physics）

本文件是“单技能双路”复用套件的物理底座：每条 API 断言都附 DSH 源码出处（路径+行）。
**铁律：新增用法先在本文件落出处，再进 `dsh-ctx.ts` 镜像，再写业务代码。**
`ASAR` = `D:\0Tools\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai`（只读消费，不 import）。

## 1 加载物理：整批 classic script，错一包死一批

- 插件 client 经 `<script src="组合 URL">` 以 classic 语义执行（`defaultLoadBundle`，`dsh-client-modules/lib/client.js:146`）。
- 执行只做一件事：`window.__ModuleLoader__.load({id, factory})` 注册工厂；副作用全在 factory 内，物化（首次 import/require）时才跑（同文件 `:16-23`）。
- batch 到达后校验：`if (!this.factories.has(id)) throw ... loaded without registering "${id}"`（同文件 `:248`）——**这就是 #48 整批 crash 的逐字报错**。裸 ESM（顶层 import）在 classic 下是 SyntaxError，整批零注册。
- 物化期 `require` 只认三处：seed 短语、已物化记录、已注册工厂；其他一律 loud throw（同文件 `:300-310`）。`node:` 在浏览器不存在，client 传递闭包禁 `node:`、禁 ESM 语法。
- 回路镜像：`test/client-bundle-48.test.mjs`（vm classic 执行 + 注册断言 + 物化断言 + 静态纯度扫描）。

## 2 产物配方：loader 工厂包（逐项抄自 dsh-im-companion/tsdown.config.ts）

`entry:{client:'src/client/index.ts'}` / `outDir` 包内（host 用 `lib`，本仓用 `dist`，见下）/
`format:'cjs'` / `platform:'browser'` / `dts:false` / `sourcemap:true` / `clean:false` /
`define process.env.NODE_ENV` / `neverBundle=CLIENT_EXTERNALS` + `alwaysBundle=(id)=>!includes(id)` /
`entryFileNames:'client.js'` / banner `window.__ModuleLoader__.load({ id: "<插件名>", factory: (require) => {` /
footer `return module.exports; } });` / intro `var module = { exports: {} }; var exports = module.exports;` /
`codeSplitting:false`。
externals：`react react/jsx-runtime react-dom react-dom/client cordis
@deepseek-ai/dsh-client-ui-slots`——其余一律打进包。（`dsh-client-runtime/client` 曾随抄，
映射不明且本仓无 import，已删；见 §4。）

## 3 manifest 语义（宿主 `dsh-client-modules/lib/index.js`）

- `dsh.client` 须为对象，`platform` 须为 string（`:144`）；`platform!=="web"` 整包忽略（`:631`）。
- 声明了 `dsh.client` 却无 `exports["./client"]` 直接抛（`:635`）；有则按该相对路径取包。
- `inject/external` 可选 string 数组，`immediately` 可选 boolean（`:145`），透传进图（`:641`）。
- 宿主文档原话：“浏览器插件包在其 package.json 中以 platform: 'web' 声明 dsh.client，
  导出 ./client bundle”（`dsh-client-modules/README.zh.md:32`）。
- **inject 是两层**（`dsh-client-ui-workspace/lib/client.js:2627` 注释）：
  manifest 的包名只管加载边（loading/prefetch），从不决定 apply 顺序；
  代码里的短名才是 cordis 服务注入。跨包顺序一律靠 `slots.inject()` 声明。

## 4 短名映射（代码用短名，manifest 写包名）

- `"@deepseek-ai/dsh-client-ui-slots" => "slots"`（服务由 ui-renderer 提供 `super(ctx,"slots")`，
  `dsh-client-ui-renderer/lib/client.js:995`）。
- `"@deepseek-ai/dsh-client-connection" => "connection"`（该包以 `ctx.provide("connection", handle)` 挂载，
  `dsh-client-connection/lib/client.js:4825`；其 client 自身 inject 为空，即 wire root）。
- `"@deepseek-ai/dsh-client-ui-workspace" => "uiWorkspace"`（`dsh-client-ui-workspace/lib/client.js:37`；
  惰性可选读取可不声明——im-companion 注释，宿主未证实，按“用了就声明”从严）。
- `"@deepseek-ai/dsh-client-runtime"` 映射不明（三方来源均无该包源码，P1 open question）——**本仓不用它**。

## 5 slots 菜谱

- `register` 按 kind 约束（`dsh-client-ui-slots/lib/index.js:72`）：
  single 只需 `{name}`；keyed 必 `{key}`；**list 必 `{id}`**；chain 必 `{select}`。
  options 全形：`{name,key?,id?,order?,label?(string|thunk),priority?,select?,locale?,inject?,children?,store?}`
  （`dsh-client-ui-renderer/lib/client.js:1388`）。注册经 caller fiber 的 effect 安装，卸载自动撤回。
- `inject(key, cb)`：声明已存在同步跑，否则等声明；cb 返回单个 disposer 或一组（事务性，逆序 dispose）；
  返回 disposer 幂等（同文件 `:1015`）。
- `settings.section`（kind list，id 必填）：三例——agent-preset `{id:'agent-presets',order:20,
  label:()=>bind('nav'),locale,inject}`（`dsh-client-ui-agent-preset/lib/client.js:1516`）；
  settings-plugins 带 children 声明（`:1769`）；im-companion `{id:'dsh-im-companion',order:22,
  label:()=>'IM机器人辅助',inject:()=>({})}`（`src/client/index.ts:114`，静态 label 有先例，
  组件须返回 React 元素）。
- `sidebar.footer.action`（kind list，scope root；ownerProps 仅 `{wide}`；id 必填，order/label 可选）：
  唯一真实注册 cordis-panel（无 order 无 label，`dsh-client-ui-cordis/lib/client.js:1339`）；
  外壳 `renderSlot('sidebar.footer.action', {wide})`（`dsh-client-ui-sidebar/lib/client.js:246`）；
  官方示例形态 `{name,id:'my-entry',order:100,label:'My entry'}` + `() => React.createElement(...)`
  （`dsh-cordis-client-runner/lib/client.js:3885`）。
- 只读面：`entries/getVersion/subscribe`（uSES 配对，`renderer:1188`）；`ctx.get` miss 返回 undefined，
  一律先判空（`cordis-client-runner:4083`）。
- `settings.section` order 分配表（单卡方案后只剩总管一条；单品独立 section 已删）：
  settings-plugins 15 / agent-presets 20 / dsh-life-pack 21（爱生活卡）/ dsh-im-companion 22。
  爱生活页签槽内 tab 顺序复用 SLOT_ORDER（memo 70 / calorie 75 / schedule 80 / home 85 / chef 90 / bill 95）。
  sidebar槽 order 各技能自定（memo 60 / calorie 61，避开 deck:map 的 60 并列则取 61）。

## 6 RPC 菜谱

- `call(channel, endpoint, payload, signal?)`（`dsh-client-connection/lib/client.js:4609`）：
  channel 须 match `/^\/[A-Za-z0-9._~-]+$/`——**单段**，即 `/ilife-calorie` 合法、`/ilife/calorie` 非法；
  endpoint 每段 match `/^[A-Za-z0-9_$.-]+$/`；signal undefined 时不带 signal 发 fetch。
- 返回的是 **result 信封**，不是业务值：`{ok:true,value}|{ok:false,error:{code,message,details}}`
  （同文件 `:4640-4660`），调用方须判 ok。`payload:{args}` 包裹是 `/api` 网关惯例
  （`dsh-api-gateway/lib/client.js:1601`），**自有通道直接放业务载荷**。
- `handle(channel, handler)`（`dsh-client-connection/lib/index.js:517`）：
  handler 签名 `(endpoint, payload, signal) => Promise<...>`（同文件 `:625`）；
  endpoint 由 channel 后路径切分（空段/`..` 在 handler 之前 404/400）；
  handler 抛错被包成 500（`:627-629`），与业务 `fail('internal')` 是两层。
- 自有通道返回 companion 同形信封：`ok(v)=>({ok:true,value:v})` / `fail(c,m)=>({ok:false,error:{code:c,message:m,details:{}}})`
  （`dsh-im-companion/src/host/rpc.ts:10,16-17`）；顶层 try/catch 兜底 `fail('internal',...)`（`:184-186`）。
- 未知端点 `fail('bad-request',...)`（`:181-182`）；载荷先 `?? {}`（`:46`）。
- 通道是宿主共享单例：重复 `handle` 抛 `webserver: duplicate prefix route`（`dsh-host-webserver/lib/index.js:176`）；
  插件侧标准退让：catch 认到该字样 warn 后 return（不挂 cleanup、不 provide），他错重抛
  （`dsh-im-companion/src/index.ts:20-30`）。`const dispose = handle(...)` + 
  `ctx.effect(() => () => dispose(), '<插件>: rpc channel cleanup')`（`:18-19`）。
- host `apply(ctx, config)`，`inject=['connection']`；logger 窄化
  `typeof ctx?.logger==='function' ? ctx.logger(name) : (ctx?.logger ?? console)`（`:11`）；
  `ctx.provide?.(...)` 包 try/catch（`:32`)；host 侧无 `ctx.get` 用例（P1 实证）。

## 7 effect 与组件

- `ctx.effect(cb, label?)`：cb 可返回 disposer；label 可选但官方必带（`cordis-client-runner:4086`）。
- 组件：React 函数组件（`React.createElement` 手写，不引入 JSX 构建复杂度）；
  挂载期 RPC（`useEffect` 一次），**无轮询**；三态渲染：loading / 数据 / 缺席或错误（hint 文案，
  不返空冒充）。
- `extractRpc` 标准取用：`ctx?.connection?.rpc?.call` 非函数即 null（`dsh-im-companion/src/client/data/rpc.ts:5`）。

## 8 发布清单（#48 血换来的）

- `exports` 三项：`"."`、`"./client"`、`"./package.json"`；`files` 含 `dist` + `cordis.patch.yml`。
- `dependencies` 无 `workspace:`（发前 `npm pack --dry-run` 目检 + smoke「无 workspace」断言）。
- 单技能双包单命令安装（用户侧，2026-09-08 实证定稿，缺一不可）：
  `dsh plugin --profile <name> add dsh-<x>@<a> dsh-life-pack@<b> --config.minimumReleaseAge=0 --registry=https://registry.npmjs.org`
  ——显式版本（绕 24h 新版本保护，裸包名会被回退旧版）；`minimumReleaseAge=0`（松 DSH 装机前安检，
  它连锁文件里的旧条目都拦）；官方源（镜像源 npmmirror 同步滞后，新版本 `NO_MATCHING_VERSION`）。
  護欄：只装双包（余包坏的同批会炸整批）；装完先验落盘版本（`node_modules/<包>/package.json`）
  再重启 DSH。
- 版本对应：`dsh-<x>@a` 依赖 `skill-<x>@^b` 且注册表 `skill-<x>@b` 的 deps 干净（`npm view` 复核）。

## 9 失败表

- **#48 整批 crash**：因=裸 ESM client + 顶层 import（+传递闭包 `node:`）；果=整批零注册，
  `loaded without registering`；修=工厂包 + 纯度门；回路=`test/client-bundle-48.test.mjs`。
- **0.1.0 workspace 泄露**：因=`workspace:` 随包发布；果=用户侧 `WORKSPACE_PKG_NOT_FOUND`；
  修=本地 `^` 声明 + `linkWorkspacePackages`（见 `pnpm-workspace.yaml` 注释）+ 发前审计。
- **24h 门 + 安检 + 镜像滞后三连**：因=新包 24h 内、DSH 安检拦锁文件新条目、npmmirror 未同步；
  果=旧版回退 / `MINIMUM_RELEASE_AGE_VIOLATION` / `NO_MATCHING_VERSION`；
  修=§8 安装命令三件套（显式版本 + 松政策 + 官方源）。
- **client 读 connection 却只声明 slots**：因=client 代码短名缺 `connection`（manifest 包名层的 `@deepseek-ai/dsh-client-connection` 是对的），真机 loader 按短名守卫 ctx，effect 期 `ctx.connection` 抛 `cannot get property "connection" without inject`；果=双面板无限“加载中”（0.1.6 的 20s race 救不了：抛错在 race 之外，还成了不可见 rejection）；修=短名加 `connection`（对照 im-companion `['slots','connection','uiWorkspace']`）+ effect 外圈兜底落字；回路=loader 回路「用了就声明」断言（缺声明版必红）。
- **Electron 宿主 spawn hang**：因=桥直拿 `process.execPath` 当 node，Desktop 宿主它是 Electron 二进制，
  spawn 起 GUI 子进程永不退出（POST 通道 15s 超时实证；CLI 本体 0.09s 即回、handler 直驱 100ms 回，凶手锁定传输层 spawn）；
  果=双面板无限“加载中”；修=`resolveNodeBin`（node 直用 / Electron 加 `ELECTRON_RUN_AS_NODE`）+
  20s spawn 超时杀 + client `AbortSignal.timeout`（UI 最多转 20s 即报超时错）；回路=`smoke` 超时双断言。

## 10 新技能 6 常量（模板 `template/plugin-single/`）

`skill` / `slotId`（`ilife:` 命名空间）/ `title` / `order` / `channel`（单段 `/ilife-<skill>`）/
`configTabId`（=`dsh-<skill>` 插件包名，即爱生活页签槽注册 id，也是总管 ledger 缺席判定的 join 键）。
填完跑门：`tsc` → `node --test`（含 loader 回路）→ `boundaries` → `publish:pre`。

## 11 爱生活单卡方案（grill 定案，术语见 `CONTEXT.md`）

- 设置面只留一条 DSH设置面板槽：`{name:'settings.section', id:'dsh-life-pack', order:21,
  label:()=>'爱生活'}`；单品独立 section（如 dsh-calorie 0.1.2 的 `id:'dsh-calorie'`）与
  `sidebar.footer.action` 旧注册一律删除（破坏性变更，发版说明写清）。
- 总管 section 声明 children 爱生活页签槽：`children:{'ilife.config-tab':{kind:'list',scope:'root'}}`
  （children 声明形见 `dsh-client-ui-settings-plugins/lib/client.js:1776-1779`；
  options 全形见 `dsh-client-ui-renderer/lib/client.js:1388`）。
- 各技能往爱生活页签槽注册自家技能设置页：
  `{name:'ilife.config-tab', id:'dsh-<skill>', order:<SLOT_ORDER>, label:<title>, inject:()=>({})}`
  （跨插件注册先例：skills-deck 往 settings-plugins 声明的 `settings.plugins.tab` 注册，
  见 `dsh-mattpocock-skills-deck/src/client/panelAssembly.js:86-87`）。
- 爱生活页签条走 ledger 投影（settings-plugins:1744-1767/428-513 同形）：
  tab 行=`entries('ilife.config-tab')` 取 `{id,order,label}` 按 order 排；
  面板=`renderSlot('ilife.config-tab', {}, {only: activeTab})`（一次只挂载一个，
  settings-general 同形）+ visited 缓存；`renderSlot` 面仅声明过 children 的条目才有
  （`dsh-client-ui-renderer/lib/client.js:613-614`），调用形 `(key, owner, opts)`
  （同文件 `:283-293`）；`hooks.tabs` 源出组件 `useTabs`（`use<Name>` 命名见
  `dsh-client-ui-slots/lib/index.js:7-9`，调用形见 renderer `:203-210`）；
  标签解析与 `resolveSlotLabel` 同形（thunk 跟活，slots lib `:27-29`）。
- 缺席=ledger 无该 `id`：显示 `未安装[<包名>]，请补装：dsh plugin add dsh-life-pack <包名>`
  只读文本（recoFor 同文）；总管零 import 技能代码。
- DSH右侧槽（`details`）本项目明确不用；技能功能页唯一入口是 sidebar槽
 （`betterSidebar.registerTab`，软依赖：`ctx.get('betterSidebar')` 判空，没装就不注册，不断链）。
