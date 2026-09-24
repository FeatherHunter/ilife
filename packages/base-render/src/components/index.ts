/** base-render/components · 组件层（可演进的组合层，**不属冻结签名面**）。
 *
 * 这一层怎么组织（本文件是它的目录说明，也是它唯一的"总入口"）：
 *
 * ```
 * src/components/
 *   index.ts              ← 组件层总出口（**每新增一个组件只在这里加一行**，别改别处）
 *   README.md             ← 这一层自己的规矩（组件怎么写、怎么加、怎么测）
 *   shared/               ← 组件之间共用的小件（转义／入参校验；**不**放组件本身）
 *     escape.ts
 *     validate.ts
 *   <组件名>/              ← 一个组件一个目录，目录内自足
 *     index.ts            ← 该组件对外的唯一出口
 *     attrs.ts            ← 标记契约：类名／`data-*` 属性／事件名／闭集（渲染与运行时共用这一份事实）
 *     render.ts           ← 渲染（纯函数产 HTML 字符串）
 *     style.ts            ← 样式段（该组件唯一的样式来源）
 *     runtime.ts          ← 运行时（**产出 JS 文本**；DOM 只允许出现在产出文本里）
 *     README.md           ← 这个组件怎么用（给别的 AI 看的说明书）
 * ```
 *
 * 为什么按目录分家（而不是都堆进 `blocks.ts`）：公共层由多个席位并行改，
 * 一个组件一个目录 ⇒ 新增组件只碰"自己目录 ＋ 本文件一行"，不会跟别人的改动在同一段代码里打结。
 *
 * 与既有两族的关系：
 *  - `src/blocks.ts`（12 区块）与 `src/controls.ts`（控件与运行时）是**冻结面**（进 `SPEC_FROZEN_SURFACE`、
 *    根出口逐名绑死）；本层**不进**冻结面、**不从根导出**，走子路径 `base-paint/blocks` 薄转出
 *    （见 `src/blocks.ts` 末尾那一行）。要动冻结面签名的组件不属本层。
 *  - 本层可以用 `src/spec/**`（只读冻结常量）与 `src/components/shared/**`；
 *    **不得**反向被 `controls.ts` 依赖，也不得新增 `CSS_VAR_TOKENS`（样式只读冻结 token）。
 */
export * from './editable-value/index.js';
/** 单据族（纸面 ＋ 主数字头 ＋ 刻度条 ＋ 账目行 ＋ 明细行 ＋ 打孔格带）：一族六件，样式由 `sheetCss()` 汇总。
 *  出处＝原型 `.scratch/diet-ui-proto/v2-小票.html`／`v2-大字.html`（用户认可的两套设计语言），
 *  抽取记录见 `docs/base/base-render/单据族组件.md`。**只加行、不重排**（并行席位的约定）。 */
export * from './sheet-frame/index.js';
export * from './summary-head/index.js';
export * from './scale-bar/index.js';
export * from './ledger-rows/index.js';
export * from './entry-rows/index.js';
export * from './punch-strip/index.js';
/** 皮肤层（三套语言＝三份取值表；组件只读 token 名，走 `skinVar()`）：见 `skin/contract.ts` 与
 *  `docs/base/base-render/公共组件契约.md`。**只加行、不重排**（并行席位的约定）。 */
export * from './skin/index.js';
/** 以下按名册（`.scratch/ui-组件墙/落地名册.md`）的族次转入 43 个新建组件；**只加行、不重排**。
 *  形态（A／B／C）取自用户在组件墙上的打分记录：一件只落用户认可的那个形态。
 *  行内只写「中文名／形态」，详细用法看各目录自己的 `README.md`。 */
/* 纸面与页头 */
export * from './page-head/index.js';
export * from './section-head/index.js';
/* 读数 */
export * from './key-value-list/index.js';
export * from './stat-inline/index.js';
/* 对照与榜单 */
export * from './compare-columns/index.js';
export * from './rank-list/index.js';
/* 形状与比例 */
export * from './progress-ring/index.js';
export * from './stacked-bar/index.js';
export * from './heat-grid/index.js';
/* 时间与分组 */
export * from './calendar-month/index.js';
export * from './range-bar/index.js';
export * from './sub-list/index.js';
export * from './hour-band/index.js';
/* 状态与台账 */
export * from './status-row/index.js';
export * from './task-list/index.js';
export * from './streak-badge/index.js';
export * from './due-row/index.js';
export * from './step-flow/index.js';
export * from './timer-card/index.js';
/* 搜索与筛选 */
export * from './search-field/index.js';
export * from './filter-chips/index.js';
export * from './sort-toggle/index.js';
export * from './result-row/index.js';
export * from './window-picker/index.js';
/* 表与输入 */
export * from './number-stepper/index.js';
export * from './slider-row/index.js';
export * from './date-range/index.js';
/* 选择与打分 */
export * from './radio-cards/index.js';
export * from './multi-checks/index.js';
export * from './rating-row/index.js';
/* 动作与反馈 */
export * from './confirm-strip/index.js';
export * from './skeleton/index.js';
/* 容器与浮层 */
export * from './dialog/index.js';
export * from './drawer-sheet/index.js';
export * from './popover-menu/index.js';
export * from './tooltip/index.js';
/* 加量池 */
export * from './progress-list/index.js';
export * from './sync-status/index.js';
export * from './photo-grid/index.js';
export * from './photo-compare/index.js';
export * from './note-block/index.js';
export * from './invoice-lines/index.js';
