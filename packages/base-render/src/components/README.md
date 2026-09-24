# components/ · 公共层组件（可演进的组合层）

这一层住**组件**：一个组件一个目录、目录内自足。它**不进**冻结签名面（`SPEC_FROZEN_SURFACE`）、
**不从根出口**（`src/index.ts`）导出；消费方走 `base-paint/blocks`（`src/blocks.ts` 末尾一行
`export * from './components/index.js'`）。

**件清单（权威）＝ `清单.ts`**：由 `scripts/gen-components.mjs` 从**源码派生**（每件的中文名／形态闭集／
导出名／渲染与样式函数／有没有运行时段／示例入参），并有对账判据 `test/组件清单.test.mjs`。
**别手工维护件表**——要加件就落目录 ＋ 出口一行，再跑一次派生器：

```
node packages/base-render/scripts/gen-components.mjs          # 重派生（快照滞后只报读数）
node packages/base-render/scripts/gen-components.mjs --check  # 逐行事实对账（挂门用这条）
```

## 目录长什么样
```
src/components/
  index.ts                 ← 组件层总出口：**每新增一个组件只在这里加一行**（只加行、不重排）
  README.md                ← 本文件
  清单.ts                   ← 派生快照：件名／中文名／形态／导出名／示例（机器读它）
  shared/                  ← 组件之间共用的小件（转义／入参校验／排版栈；**不放组件本身**）
  <组件名>/
    index.ts               ← 该组件对外的唯一出口（名字面）
    attrs.ts               ← 标记契约：类名／data-* 属性／事件名／闭集／入参类型（渲染与运行时共用的唯一事实）
    model.ts               ← 入参归一化与校验（`badInput()` 抛错；闭集外的值一律拒）
    render.ts              ← 渲染（纯函数产 HTML 字符串）
    style.ts               ← 样式段（该组件唯一的样式来源）
    runtime.ts             ← 运行时（**产出 JS 文本**；DOM 只允许出现在产出文本里）
    README.md              ← 说明书（给别的 AI 用）：何时用／入参表／契约／不变量／错法
```

## 现有组件（按族；逐件看 `清单.ts` 或各目录 README）
| 族 | 件 |
|---|---|
| 前置件（第一批） | `editable-value`／`sheet-frame`／`summary-head`／`scale-bar`／`ledger-rows`／`entry-rows`／`punch-strip` |
| 纸面与页头 | `page-head`／`section-head` |
| 读数 | `key-value-list`／`stat-inline` |
| 对照与榜单 | `compare-columns`／`rank-list` |
| 形状与比例 | `progress-ring`／`stacked-bar`／`heat-grid` |
| 时间与分组 | `calendar-month`／`range-bar`／`sub-list`／`hour-band` |
| 状态与台账 | `status-row`／`task-list`／`streak-badge`／`due-row`／`step-flow`／`timer-card` |
| 搜索与筛选 | `search-field`／`filter-chips`／`sort-toggle`／`result-row`／`window-picker` |
| 表与输入 | `number-stepper`／`slider-row`／`switch-row`／`date-range` |
| 选择与打分 | `radio-cards`／`multi-checks`／`rating-row` |
| 动作与反馈 | `confirm-strip`／`skeleton` ＋（冻结面既有）`action-bar`／`copy-button`／`toast`／`empty-state`／`error-receipt` |
| 容器与浮层 | `dialog`／`drawer-sheet`／`popover-menu`／`tooltip` |
| 加量池 | `progress-list`／`sync-status`／`photo-grid`／`photo-compare`／`note-block`／`invoice-lines` |

**皮肤**：三套语言（`paper` 小票纸／`broadsheet` 大字报刊／`neutral` 中性）住 `components/skin/**`。
件**只读 token 名**（经 `skinVar()`，带兜底链），换皮只换取值、不换结构；页面挂一次
`skinCss()` ＋ 祖先上一个 `ilife-skin-<名>` 类即可。

## 加一个新组件（照这五步）
1. **先定形状，再定名字**：写清楚它替掉的是哪几种错法（各组件 README 的"常见错法"），
   以及它和既有件的关系（复用谁、不复用谁）。**形态从用户认可的那一档取**，不要自己加第二形态。
2. 建目录：`attrs.ts`／`model.ts`／`render.ts`／`style.ts`／（要 DOM 才有）`runtime.ts`／`index.ts`／`README.md`。
3. **样式只读皮肤 token**：颜色／圆角／阴影／字面／字号一律经 `skinVar()` 读；**不新增 token 名**、
   不写 `:root`／`!important`；全部规则 scope 在 `.<prefix>page-ui` 之下。
4. **加法式**：不用它的页产物**逐字节不变**——挂载一律 opt-in（页面显式调它的 `xxCss()`／运行时）。
5. **判据**（`test/<组件名>.test.mjs`）：渲染契约（含转义与全部 `bad-input` 分支）／样式与零 DOM 纪律／
   加法式（不开＝零变化）／**真机两档**（390／1280 容器几何不变量与交互，headless Chrome ＋ CDP）。

## 红线（违反即红）
- **一条选择器里作用域只许出现一次**：组合器（`>`／`+`／`~`／后代空格）右边再拼一次
  `.ilife-page-ui` ⇒ 那条规则要求"件里再套一层 page-ui"，**永远命中不到**（死规则）。
  件内要备一个**裸槽类**助手供嵌套用，选择器**开头一次 scope**、后代段用裸的。
- **宽度只许听容器**：`container-type: inline-size` ＋ `@container`；**零 `@media (min-width|max-width: …)`**
  （件会被嵌进侧栏／面板／卡片，视口宽 ≠ 件宽）。媒体查询只判设备能力（hover／pointer／reduced-motion）。
  用了 `@container` 就**必须**在件里声明容器，否则那条查询同样永不生效。
- 模块代码零 DOM：`dist/components/**` 剥离字面量与注释后不得出现 `document.`／`window.`／`navigator.`。
- 零内联脚本／零内联事件处理器：标记只带 `data-*`，激活走各自运行时（事件委派）。
- 不得反向被 `controls.ts` 依赖；不得改 `CONTROLS_*`／`STATUS_*`／`COPY_*` 冻结常量。
- 动到冻结签名面（`src/spec/**`／根出口）的改动**不属本层**，另开票走契约三处同步。

## 横切判据（单件判据看不见的那一类，改本层必跑）
| 判据 | 断什么 |
|---|---|
| `test/组件样式纪律.test.mjs` | 串味（纯字面量选择器）／`!important`／视口分档／死容器查询／**作用域拼两遍**（从**产物**数）；范围**从层出口读**，名册外既有件单列豁免并注明原因 |
| `test/皮肤矩阵.test.mjs` | 全部件 × 三套皮肤 × 两档：换皮不换结构、样式段纪律、零 DOM、两档溢出真机读数 |
| `test/组件清单.test.mjs` | 清单快照与磁盘对账（件名／形态／导出名／缺目录／跨件公开名撞车） |
