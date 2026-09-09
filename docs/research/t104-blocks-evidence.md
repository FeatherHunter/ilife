# #104 B1 区块组件整合 · 证据（map #63）

- 范围：12 区块组件落地（接口 owner）＋ DB-1／DB-2 落定，给 108–113 可用的执行前置。
- 非范围：冻结面（`SPEC_FROZEN_SURFACE`／`src/spec/`／`docs/base-paint-contract.md`）**零改动**；
  47 页／18 项的逐页移植（108–113 各自执行）；冻结文档的 §6.6 不新增（区块接口不住冻结契约，§4.1）。
- 产物：`packages/base-render/src/blocks.ts`（子路径 `base-paint/blocks`）＋
  `packages/base-render/test/blocks.test.mjs`（41 用例）＋
  `.changeset/base-paint-blocks-104.md`＋`package.json` `./blocks` 子路径一行。

## 1. DB-1 落定：12 区块清单（取视觉尺 §1 为终版，只收敛命名）

| # | 区块 | 函数 | 组合／新建 |
|---|---|---|---|
| B-01 | 页面壳／标题区 | `renderPageShell` | 新建（标题三件套＋正文透传） |
| B-02 | KPI 卡 | `renderKpiCard`（＋`renderKpiGrid` 网格伴生） | 新建＋冻结 `renderStatusBadge` |
| B-03 | 表格 | `renderDataTable` | 新建（语义表；零行走空态） |
| B-04 | 图表 | `renderChartBlock` | 分发冻结 `charts` 8 接口 |
| B-05 | 列表 | `renderListRows` | 新建（三槽；完成态删除线） |
| B-06 | 指令块 | `renderPreBlock` | 新建（载体恒 `PRE`；复制走冻结双属性） |
| B-07 | 详情区 | `renderDetailSection` | 新建（scene 五字段；types 复数；徽章口径与 `help.ts` 一致） |
| B-08 | 折叠区 | `renderDisclosure` | 新建（原生 `details/summary`，DB-4） |
| B-09 | 表单／参数区 | `renderParamForm` | 新建（静态 `label＋input`，零 JS；行为归宿主 B7） |
| B-10 | 空态 | `renderEmptyBlock` | 冻结 `renderEmptyState` 逐字内嵌 |
| B-11 | 复制区 | `renderCopyBlock` | 冻结 `renderActionBar`（id 缺省 `COPY_ACTION_IDS.actionBar.*`） |
| B-12 | 反馈区 | `renderFeedbackBlock` | 冻结 `renderToast`／`renderErrorReceipt` |

## 2. DB-2 落定：区块样式区闭集（新增，不改控件闭集）

- `BLOCK_STYLE_SECTIONS` 12 区（`pageShell … feedbackBlock`），与 8 区控件闭集无交集；
  CSS 唯一产出者 `blocksCss()`（逐区注释头＋`ilife-block-<slug>[-<part>]` 类）。
- 取值纪律：全部 `var(--x)` ∈ 冻结 `CSS_VAR_TOKENS`（测试机读断言）；圆角局部常量
  `{8,14,20,999}`（D-5，不新增 token）；软线 `rgba(210,210,215,.6)`（`--line` 派生，DB-5）；
  待开发徽章／必填星号沿用 HELP 壳逐值（`rgba(255,149,0,.12)`／`#b25000`／`#c0392b`，有出处）。
- 接线：调用方 `sharedCssText = buildStyleSheet().css + blocksCss()` 再交 `fillTemplate`
  包裹注入；**不走** `StyleSheetInput.extraCss`（其语义被契约限死为技能作用域覆盖块）。

## 3. 防火墙（为什么冻结面一行未动）

契约 §4.1 原话：「本契约不定义任何区块组件接口；#104 也不得反向把区块接口塞进
`src/spec/`」。签名测试把 `dist/index.js` 出口与冻结清单逐字绑死，故区块层走
**子路径** `base-paint/blocks`（`package.json` exports 加一行，主入口不动）。
冻结签名测试（清单／出口面锁／文档投影／冻结口径／#118／门禁红线）**一条未改、全绿**。

## 4. 给 108–113 的用法（数据→组件→填充器）

```ts
import { blocksCss, renderDataTable, renderKpiGrid, renderPageShell } from 'base-paint/blocks';
import { buildSharedHelpersJs, buildStyleSheet, fillTemplate } from 'base-paint';

const content = renderPageShell({
  title: '饮食总览',
  content: renderKpiGrid([{ label: '今日热量', value: '1800', unit: 'kcal' }])
    + renderDataTable({ columns: [{ key: 'meal', label: '餐别' }], rows: [{ meal: '早餐' }] }),
});
const out = fillTemplate({
  template: '<html><head><!--SHARED-CSS--></head><body><!--CONTENT--><!--SHARED-HELPERS--></body></html>',
  assets: {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss(),
    sharedHelpersJs: buildSharedHelpersJs(),
  },
  content,
});
// out.html：单文件自足，零标记残留（端到端用例逐字断言）。
```

宿主分工（B7）：B-09 的实时预览／空值拦截、复制激活（`bindCopyAction`＋`listActionIds()`）、
toast 挂载一律由页面宿主（插件 client）承担，模块只留 `data-*` 约定与静态 HTML。

## 5. 验收证据（本机实测）

- `node --test packages/base-render/test/blocks.test.mjs`：**41／41 绿**
 （含端到端：12 区组装内容页走 `fillTemplate`，12 区类名齐备、`<style>`／`<script>` 已注入、零 `<!--` 残留、`report.bytes > 0`）。
- `node --test packages/base-render/test/*.test.mjs`：**458／458 绿**（冻结签名测试全绿，无一改动）。
- `pnpm build`／`pnpm boundaries`（7／7 OK）／`pnpm test:types`（= `tsc -b`）：exit 0。
- 全仓 `pnpm test`：898 pass；24 fail = 基线 22（逐名逐数吻合 `t92-baseline-failures.md`：
  SKILL 直执行 6＋面板路 4＋client-bundle 12）＋ `db-readonly-93` 2 例全量并行抖动
  （单跑 `node --test packages/skill-calorie/test/db-readonly-93.test.mjs` **8／8 绿**，
  与基线 A 组同类原因：Windows 全量并行 CLI spawn 抖动）。

## 6. 已知限制／交接

- 区块 CSS 的 computed 值类断言（如 `th` 背景透明、首行无边框）已由“CSS 文本含规则”
  覆盖，浏览器实测回读归 #89b（截图＋交互记录）。
- B-09 的宿主行为（`input` 事件重算、`required` 拦截文案）归 #88（HELP 搜索与实时预览）
  或各消费页宿主，本票只给静态结构＋`data-required` 约定。
- `renderKpiGrid` 是 B-02 的伴生布局（无独立样式区），不是第 13 区块。
