---
'base-paint': minor
---

#76（map #63）base- 控件层落地：`SPEC_FROZEN_SURFACE` 13 条 `pending` → `implemented`（10 runtime ＋ 3 type），**签名值零改动**（三处同步：清单 ↔ 契约 §3.3 标记区 ↔ `test-d/contract-signatures.ts`），`implemented 119／pending 11`（余下 11 条 = #75 2／#77 4／#78 5）。

**新增运行时出口 10 个**（`packages/base-render/src/controls.ts`）：`copyText`／`createCopyRuntime`／`bindCopyAction`／`buildSharedHelpersJs`／`renderToast`／`createToastController`／`renderActionBar`／`renderStatusBadge`／`renderEmptyState`／`renderErrorReceipt`。`ControlsError` **不导出**（冻结面 44 条内无该运行时条目，与 `TemplateError` 同口径，调用方按 `name`／`code` 判定）。**未实现** #75／#77／#78 的行为。

**无宿主（纯 HTML）可用**：模块代码零浏览器全局（DOM 只出现在 `buildSharedHelpersJs` 的**产出文本**里），能力一律经显式端口注入——`CopyPorts`（双通道 ＋ `toast?` 反馈）／`ToastHostPort`／`CopyActionHostPort`（含 `listActionIds()` 发现机制）。可执行证据：**主证据** `docs/research/t76-nohost-evidence.md`（自包含 `file://` 页面：零 `import`／零服务／零宿主注入，headless Chrome 回读，44 断言全绿）；**补充** `packages/base-render/test/controls.test.mjs` 的 HTTP 夹具（`renderX` 产出 ＋ helpers JS，`--headless=new --dump-dom` 回读：双通道／接线／`flush`／幂等注入两次／≤820px 视口收窄为 3）。

**零内联脚本**：渲染出的按钮只带 `ACTION_ID_ATTR`（`data-action-id`）与 `DEFAULT_DATA_ATTR`（`data-t`），激活一律走 `bindCopyAction` 事件委派；helpers JS 恒为**经典 script** 作用域可跑的 IIFE，幂等判据**只落 DOM**（标记属性 ＋ `querySelector` 早退，无 `window` 哨兵）。

**与旧基线的偏离（显式记账，契约 §4.6）**：旧层把 toast 样式内联在 `base.js:75` 并自注入 `document.head`；本契约把 toast 样式**并入 #75 的共享样式区**（`CONTROL_STYLE_SECTIONS` 闭集已含 `toast`），`renderToast` 只产 HTML 字符串、不产样式常量——代价是「缺 `base.css` 时 toast 视觉不再完整」，功能面（结构／文案／无障碍／计时／堆叠）不受影响。

**测试**：`test/controls.test.mjs` **64 用例**（对齐旧层 31 个控件用例行为面 ＋ 补 `actionBar`；含 headless 无宿主夹具与 ≤820px 视口收窄）／`test/contract-signatures.test.mjs` 新增「#76 追加验收」（dist 剥字面量与注释后代码零 `document.`／`window.`／`navigator.`，共 47 用例）／既有断言一条未删、未放宽。门禁：`pnpm build`／`pnpm boundaries`／`pnpm test:types` 退出 0，`pnpm test` 新增失败 = 0（判据 `docs/research/t92-baseline-failures.md`）。

**返修（FX-76-1…FX-76-7）**：① `ports.fallback` 同步抛错改为 `{ ok:false, channel:null, reason:'fallback-threw' }` 且失败徽章照挂（补两条路径用例）；② 「≤820px 收窄 3」按总架构师裁定归**页面运行时**（模块保持宿主无关，AC-7 不变），契约 §3.3 显式记录分工 ＋ 补 ≤820px headless 证据；③ 清掉 2 处无鉴别力断言、台账计数改实测、无浏览器从 `t.skip` 改**显式失败**；④ 无宿主证据改为**自包含 `file://` 页面**（脚本 ＋ 快照入仓）；⑤ `findBrowser()` 补 macOS／Linux 候选路径；⑥ `void copyText(...)` 接住 rejection（断言零 `unhandledRejection`）；⑦ 其余低/nit 逐条修或登记（见契约 §8.9 台账 76-7／76-8／76-9）。
