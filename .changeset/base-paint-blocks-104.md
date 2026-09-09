---
'base-paint': minor
---

#104（map #63）B1 区块组件整合：12 区块落地，108–113 的执行前置。**冻结面零改动**（`SPEC_FROZEN_SURFACE` 条目数／值不变，`src/spec/` 一行未碰，`docs/base-paint-contract.md` 一字未动——§4.1 防火墙：区块是可演进组合层，不是冻结签名）。

**新增组合层**（`packages/base-render/src/blocks.ts`，子路径 `base-paint/blocks`；`src/index.ts` 出口面不动）：`renderPageShell`／`renderKpiCard`（＋`renderKpiGrid`）／`renderDataTable`／`renderChartBlock`（8 kind 分发给冻结 `charts`）／`renderListRows`／`renderPreBlock`／`renderDetailSection`／`renderDisclosure`（原生 `details`）／`renderParamForm`（静态 `label＋input`，零 JS）／`renderEmptyBlock`／`renderCopyBlock`／`renderFeedbackBlock`——全纯函数产 HTML 字符串，组合冻结控件（逐字内嵌，不断言第二份语义），`BlocksError`（`bad-input`，缺失阻断不返空）。

**DB-1／DB-2 落定**：12 清单取 `docs/visual-spec-blocks.md` §1 为终版；新增 `BLOCK_STYLE_SECTIONS` 12 区闭集（**不改** `CONTROL_STYLE_SECTIONS`），CSS 唯一产出者 `blocksCss()`（只读冻结 token＋局部常量：圆角 `{8,14,20,999}`、`--line` 派生软线，不新增 token 名；调用方拼进 `sharedCssText` 再交 `fillTemplate`，不走 `extraCss`）。

**红线**：B7 五禁名零导出；模块代码零 `document.`／`window.`／`navigator.`；零运行时依赖（`pnpm boundaries` PASS）；`base.js`／`charts.js` 全局零引入。

**测试**：`test/blocks.test.mjs` **41 用例全绿**（12 区块结构／锚点／状态＋组合逐字性＋CSS 纪律＋红线＋确定性＋**端到端**：12 区组装内容页走 `fillTemplate`，零标记残留）；`packages/base-render` 全量 **458 用例全绿**（含冻结签名测试）；全仓 `pnpm test` 新增失败 = 0（22 基线失败逐名吻合＋2 例 `db-readonly-93` 全量并行抖动、单跑 8/8 绿）。主证据 `docs/research/t104-blocks-evidence.md`。
