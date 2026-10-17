# t1282 · 缺席面板第 2 步"一键安装"版本检查 UI 归属考证

> 复核（上游升到 0.18.6 后）：`dist/install-button.js`（29147 字节）与 `dist/install-button.d.ts`（3035 字节）在 0.18.5→0.18.6 逐字节一致，变的只有 `panel.js`／`bilingual.js`（新增 8 个文案键），本文结论不变。

## 0. 结论（一句话）

第 2 步里用户看到的**状态文本"正在读取更新状态…"与"检查更新"按钮（含点击后的先查后装流程）全部由上游 `dsh-plugin-update@0.18.5` 的安装控件渲染与驱动**；本仓只提供挂载容器、传参（`pluginId`/`prefix` 取更新目标表同源）、三步序号外壳与容器级样式覆盖，不写一字文案、不碰流程。

## 一、证据链

### 1. 两串文字的确切出处：都在上游文案字典里，本仓全仓零命中

- 上游 `node_modules/.pnpm/dsh-plugin-update@0.18.5/node_modules/dsh-plugin-update/dist/bilingual.js:71`：
  `"panel.banner.loading": { en: "Loading update status…", zh: "正在读取更新状态…" }`
- 上游 `dist/bilingual.js:113`：
  `"panel.action.check": { en: "Check for updates", zh: "检查更新" }`
- 本仓 `packages/` 全仓 grep `检查更新|正在读取更新状态|正在查询版本信息`：命中只在注释与 README 描述行（`packages/plugin-manager/src/client.ts:322,881,1176`、`src/nav.ts:112`、`README.md:22-23`），**渲染路径上零字面量**——本仓没有这两串文字的任何渲染代码。

### 2. 状态文本谁渲染：上游 `panelViewModel` loading 分支 → 安装控件原样透传 → 上游 HTML

- 上游 `dist/panel.js:520-528`（`if (!snapshot)` 分支）：
  `banner: { kind: "loading", title: copyText("panel.banner.loading", l), action: "" }`（`dist/panel.js:521`）
- 上游 `dist/install-button.js:110-122`：`installButtonViewModel` 把快照等输入直接交给 `panelViewModel`，`statusTitle: view.banner.title` 在**所有**分支原样取 banner 标题。
- 上游 `dist/install-button.js:216-218`（`renderInstallButtonHTML`）：
  `'<div class="dsh-upd-ib-status dsh-upd-ib-kind-' + … + '">' + escapeHtml(view.statusTitle) + "</div>"`
  即状态文本落在 `.dsh-upd-ib-status`，首包未回时就是"正在读取更新状态…"。

### 3. 按钮谁渲染：上游视图模型 `role: "check"` 分支，启用态

- 上游 `dist/install-button.js:169-182`（无快照/无远端版本分支）：
  `role: "check", buttonLabel: copyText("panel.action.check", l), buttonEnabled: true, buttonBusy: false, showButton: true`
- 上游 `dist/install-button.js:224,228`：按钮按 `role` 打 `data-action="check"`、`data-primary="1"`；`buttonEnabled` 为真时**不**加 `disabled`。
- 与 README 口径一致，上游 `README.md:398`："还没查到远端版本时按钮退回「检查更新」。"
- 注意区分另一串形近文字：点击后按钮忙态文案是 `panel.action.checking-busy`（上游 `dist/bilingual.js:115`，zh "正在查询版本信息…"），由 `dist/install-button.js:141` 在 `busyAct === "check"` 时选用——**与初始状态文本"正在读取更新状态…"不是同一 key**。

### 4. 点击后的检查-安装流程谁驱动：上游 `mountInstallButton`，先查后装；忙态按钮禁用

- 签名与挂载（上游 `dist/install-button.js:247`）：`function mountInstallButton(container, options)`；`pluginId` 必填（`install-button.js:272-276`）、`call` 为宿主唯一通道（`:277-280`）、`autoCheck: 'mount' | 'never'`（`:302-306`）。
- 挂载即首查（上游 `install-button.js:870-872`）：`if (autoCheck === "mount") { void refresh(); }`；挂载瞬间先 `paint()`（`:849`）画出 loading 态。
- `refresh()`（上游 `install-button.js:562-587`）：先调 `phoneNames.updateStatus`（`:565`）；若已有快照但无 `latestVersion` 则自动再调 `updateCheck`（`:573-585`）——"先读状态、无远端版本再查"。
- `doInstall()`（上游 `install-button.js:623-662`）：无 `receipt` 先调 `updateCheck`（`:628`），拿到 `checkId` 再调 `updateInstall`（`:669-673`），过期凭证重查一次（`:705-708`）——"一次点击内先查后装"。README 原话见上游 `README.md:398`："点下后先查后装（一次点击内自动衔接…）"。
- 状态机（上游 `install-button.js:110-210` 的 `installButtonViewModel` 分支，按 `role` 计）：`check`（可点重查）／`install`（`:155-168`，可装即装）／`none`（无动作：忙态 `:140-154` 或终态 `:197-209`，终态仅 `done` 留字禁按）；另有轮询封顶转重查态（`:126-139`，`pollCapped`，上限 `INSTALL_BUTTON_MAX_POLLS = 300`，`:27`）。
- 忙态禁用（上游 `install-button.js:140-154` + `:224-229`）：`busyAct` 为 `check`/`install` 或 job 在装时，`buttonEnabled: false, buttonBusy: true`，渲染为 `disabled` + `aria-busy="true"`。**初始 loading（首包未回、非忙）按钮是可用态**；点下进入 busy 才禁用并换文案（`runAction` 的 `"check"` 分支 `:756-768` 置 `busyAct`、刷 `panel.toast.checking`、调 `doCheck`）。
- 轮询只在装中进行且有界（上游 `install-button.js:855-869`；README `README.md:398` 末句）。

### 5. 上游向宿主暴露的回调/事件：只有控制器三件套，无 `onManual` 回调

- 上游 `dist/install-button.d.ts:26-36`：`InstallButtonController { state(); refresh(); unmount(); }`；`state()` 形状（`:27-33`）含 `snapshot / manual / queue / failedCode / busy`。
- 上游 `dist/install-button.d.ts:7-20`：`InstallButtonOptions` 为 `{ pluginId; call; prefix?; pollMs?; autoCheck?; showOthers?; profileName?; locale?; theme?; themeTokens?; copyText?; clientLog? }`——**没有 `onManual` 这类推送回调**，`manual` 只能靠宿主轮读 `state()`。
- 本仓正是这样消费的：`packages/plugin-manager/src/client.ts:939-951` 每秒读一次 `button.state().manual`、读到交 `onManualRef`、最多 10 次；`onManual` 是本仓 `TabInstallSlot` 自己的 prop（`:921-925`），只在本仓内部流向步骤 ③。

### 6. 本仓的挂载点与传参：只占位、只传参，不渲染

- 挂载位：`packages/plugin-manager/src/client.ts:270-274`（`S.installSlot`，注释"容器只占位，按钮本体由上游安装控件渲染"）；DOM 落点在步骤 ② 托盘内（`:1088-1096`），上方标题"一键安装"（`:1087`）与步骤 ①③标题（`:1081,1101`）是本仓仅有的三处自家文字。
- 挂载：`packages/plugin-manager/src/client.ts:935`：`mountLifeInstallButton(mount, managerCallAdapter(props.getCall()), props.tab)`；`TabInstallSlot` 定义 `:921-966`，卸载调 `button.unmount()`（`:960`）。
- 薄包装：`packages/plugin-manager/src/update-dialog.ts:78-99`（`mountLifeInstallButton`）：`targetFor(tab.plugin)` 取表（`:83`，表外回 `null`，调用方不渲染挂载位）；`pluginId: BATCH_PREFIX + '-' + tab.skill`（`:93`）、`prefix: target.phonePrefix`（`:95`）、`theme: 'archive'`（`:96`）、`autoCheck: 'mount'`（`:97`）；回包收敛在包装内（`:87-91`）。
- 全仓调用链：`mountInstallButton` 的引用只有 `update-dialog.ts:9`（import）、`:92`（调用）与测试；`mountLifeInstallButton` 的引用只有 `update-dialog.ts:78`（定义）、`client.ts:27,935` 与测试（grep 全仓 `D:\ilife` 验证）。

### 7. 测试锁的是哪一侧

- `packages/plugin-manager/test/update-install-button-1282.test.mjs:22-37`：锁本仓侧——首查即单包电话 `ilife-bill.updateStatus`、不碰 `life.batch*`；`:38-45` 锁目标表外回 `null`。
- `packages/plugin-manager/test/absent-steps-1282.test.mjs`：全部锁本仓侧——不传 `themeTokens`（`:16-18`，上游只校验不生效，见 `update-dialog.ts:74-77` 注释与上游 `install-button.js:312-317` 的丢弃式校验）；三步标题（`:19-24`）；复制按钮文案与 Toast（`:25-29`）；容器级主按钮覆盖（`:30-34`）；上游自带手工行仅条件隐藏（`:35-40`）。

## 二、本仓负责 vs 上游负责对照表

| 部位 | 本仓负责 | 上游（dsh-plugin-update@0.18.5）负责 |
|---|---|---|
| 步骤 ①②③序号圆点、标题、托盘、命令组、复制按钮、Toast | 是（`client.ts:978-1005` `absentStepsCss`；标题 `:1081,1087,1101`） | 否 |
| 挂载容器 `div[data-ilife-install="slot"]` 与空槽隐藏 | 是（`client.ts:271-274,965,988`） | 否（只往里写 `innerHTML`，`install-button.js:546`） |
| `pluginId`/`prefix` 取值（与批量侧同源、不手拼） | 是（`update-dialog.ts:83,93,95`） | 否（只消费传入值，`install-button.js:272-288` 校验） |
| 宿主通道适配（`managerCallAdapter`、回包收敛） | 是（`update-dialog.ts:25-49,87-91`） | 否（只认 `call(name, args)`，`install-button.js:277-280`） |
| 步骤 ③精确命令的轮读与 `data-manual` 条件位 | 是（`client.ts:939-951,1076`） | 否（`manual` 只躺在 `state()` 里供读） |
| 状态文本"正在读取更新状态…" | 否 | 是（文案 `bilingual.js:71` → `panel.js:521` → `install-button.js:110-122,216-218`） |
| 按钮本体（`.dsh-upd-ib*` DOM、"检查更新"文案、`data-action`/`data-primary`/`disabled`/`aria-busy`） | 否 | 是（视图模型 `install-button.js:110-210`；渲染 `:211-246`） |
| 先查后装流程、忙态禁用、有界轮询 | 否 | 是（`install-button.js:562-587,623-711,855-872`；README §2.8 `README.md:383-400`） |
| 主按钮换色（常态橙底/悬停深橙/按下/禁用/聚焦） | 是，容器 CSS 覆盖（`client.ts:989-994`；不传 `themeTokens`，测试 `:16-18` 锁定） | 否（包内主按钮零内联样式，见 `update-dialog.ts:74-77`） |
| 上游自带折叠手工行的隐藏 | 是，但仅 `data-manual="ready"` 条件隐藏（`client.ts:990`），取不到时留作兜底 | 行本体仍由上游渲染（`install-button.js:236-240`） |

## 三、未确定项

1. 本仓注释与测试头 universal 写"上游 0.18.0"（`update-dialog.ts:74` "`install-button.js` 全文件零 `var(--dsh-update-*)` 引用"、测试 `update-install-button-1282.test.mjs:1` "上游 0.18.0 安装控件"），而本次按任务要求考证的是实际安装产物 `0.18.5`（`packages/plugin-manager/package.json:55` 声明 `^0.18.5`；`node_modules/.pnpm` 下另有 `0.18.2`/`0.18.3` 残留，实际生效版本以 lockfile 为准）。已逐行复核 0.18.5 产物：`themeTokens` 丢弃式校验（`install-button.js:312-317`）、主按钮零内联样式（`INSTALL_BUTTON_CSS`，`:28-39`）两条注释依据在 0.18.5 依然成立，结论不受影响。
2. 上游 `README.md` 第 2.8 节（`:383-400`）存在且与产物行为一致，可作旁证；正文断言全部以 `dist/` 产物行号为准，README 未作为唯一依据。
