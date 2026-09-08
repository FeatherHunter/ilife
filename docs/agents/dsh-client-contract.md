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
externals（`tsdown.config.ts:6`）：`react react/jsx-runtime react-dom react-dom/client cordis
@deepseek-ai/dsh-client-ui-slots @deepseek-ai/dsh-client-runtime/client`——其余一律打进包。

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
- `settings.section` order 分配表（人工错开，新技能取未用值）：
  settings-plugins 15 / agent-presets 20 / dsh-memo-ilife 20（与前者并列由排序消化，P6 实证无冲突；
  新增优先取空位）/ dsh-life-pack 21 / dsh-im-companion 22 / dsh-calorie 23。
  sidebar 侧 order 直接复用 SLOT_ORDER（memo 70 / calorie 75），天然有序。

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
- 单技能双包单命令安装；新版本 24h 保护期用 `--config.minimumReleaseAge=0` 绕行（显式版本不受限）。
- 版本对应：`dsh-<x>@a` 依赖 `skill-<x>@^b` 且注册表 `skill-<x>@b` 的 deps 干净（`npm view` 复核）。

## 9 失败表

- **#48 整批 crash**：因=裸 ESM client + 顶层 import（+传递闭包 `node:`）；果=整批零注册，
  `loaded without registering`；修=工厂包 + 纯度门；回路=`test/client-bundle-48.test.mjs`。
- **0.1.0 workspace 泄露**：因=`workspace:` 随包发布；果=用户侧 `WORKSPACE_PKG_NOT_FOUND`；
  修=本地 `^` 声明 + `linkWorkspacePackages`（见 `pnpm-workspace.yaml` 注释）+ 发前审计。

## 10 新技能 5 常量（模板 `template/plugin-single/`）

`skill` / `slotId`（`ilife:` 命名空间）/ `title` / `order` / `channel`（单段 `/ilife-<skill>`）。
填完跑门：`tsc` → `node --test`（含 loader 回路）→ `boundaries` → `publish:pre`。
