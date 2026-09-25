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
export * from './scatter-fit/index.js';
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
export * from './switch-row/index.js';
export * from './date-range/index.js';
/* 选择与打分 */
export * from './radio-cards/index.js';
export * from './multi-checks/index.js';
export * from './rating-row/index.js';
/* 动作与反馈 */
export * from './confirm-strip/index.js';
export * from './skeleton/index.js';
export * from './toast-card/index.js';
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
/* 数据与仪表（原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 那一批）的第一件：`cash-waterline`
   —— 64 现金水位，形态 A 逐日水位柱／B 每周子弹图／C 进出水三栏；用户在墙上给这三个形态逐格 4 分，
   故一并落进同一件。**只加行、不重排**（并行席位的约定）。
   注：这里**不写「族」字**——按本层的对账口径（`test/组件清单.test.mjs` 第 ④ 组），有族注记就得有族汇总
   入口；同批第二件落地后，再由先成立的那件立 `*Css()` 汇总（照 `sheetCss()` 先例）。 */
export * from './cash-waterline/index.js';
/* 数据与仪表（同一批）的第二件：`gantt-timeline` —— 61 甘特时间线，形态 C「资源泳道（灶位）× 关键路径带」；
   用户在墙上给这一档逐格 4/4/4，故只落这一档（A／B 两档还在原型里返工）。
   注：这里**不写「族」字**（同前一件的口径），也**不加汇总入口**——同批两件各自的样式段各管各的。
   **只加行、不重排**（并行席位的约定）。 */
export * from './gantt-timeline/index.js';
/* 数据与仪表（同一批）的第三件：`small-multiples` —— 68 小倍数面板，形态 C「期间并排迷你柱阵 ＋ 均值线」；
   用户在墙上给这一档 4 分（A 档面积 sparkline 网格／B 档对齐基线多线未全过，不落）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前两件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './small-multiples/index.js';
/* 数据与仪表（同一批）的第四件：`goal-stairs` —— 66 目标阶梯，形态 C「倒推日程（每段最晚何时动手）」；
   用户在墙上给这一档逐格 4/4/4（A 分段台阶／B 里程碑轴两档未全过，不落）。
   注：这里**不写汇总注记**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './goal-stairs/index.js';
/* 数据与仪表（同一批）的第五件：`spread-dist` —— 65 分布与分位，形态 **B「逐日范围柱（中位＋区间，时间轴）」
   与 C「分位尺（P10/P25/P50/P75/P90 各是多少）」两档**；用户在墙上给这两档逐格 4/4/4
   （A 档箱线只拿到 3/3/3，不落）。形态键住 `SPREAD_DIST_FORMS`（`range`／`quantile`，英文键）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './spread-dist/index.js';
/* 数据与仪表（同一批）的第六件：`flow-ribbon` —— 67 流向带，**A／B／C 三档全落**：
   `sankey` 桑基带（左来源／右用途，带宽＝金额，两侧同一把尺子）／`matrix` 交叉矩阵（行＝来源、列＝用途）／
   `rails` 两条构成轨＋中间汇合读数。用户在墙上给这三档逐格 4 分（A／C 本轮 4/4/4、B 上一轮 4/4/4）。
   形态键住 `FLOW_RIBBON_FORMS`（英文键，**不许用 A／B／C**）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './flow-ribbon/index.js';
/* 数据与仪表（同一批）的第七件：`radar-profile` —— 62 多维画像雷达（工单表里写作「雷达画像」），
   **A／B／C 三档全落**：`polygon` 多边形雷达（本期／上期两条轮廓）／`wedge` 极区扇图（半径＝得分，达标环）／
   `rail` 展平成轴表（基准带＋我的位置）。用户在墙上给这三档逐格 4/4/4，故三档一并落进同一件。
   形态键住 `RADAR_PROFILE_FORMS`（英文键，**不许用 A／B／C**）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径：件拆出的 `style-forms.ts` 只由本件的
   `radarProfileCss()` 汇总，不是族汇总）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './radar-profile/index.js';
/* 数据与仪表（同一批）的第八件：`gap-band` —— 70 差值带，**A／B 两档都落**：
   `band` 连续差值带（窄档不断裂，带子整块不断开）／`deviation` 每日偏差柱（零位为轴，正负各自向上／下）。
   用户在墙上给这两档逐格 4/4/4；形态键住 `GAP_BAND_FORMS`（英文键，**不许用 A／B 当键**）。
   实际读数画 2px 真折线，计划线与刻度同源。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './gap-band/index.js';
/* 数据与仪表（同一批）的第九件：`portion-gauge` —— 69 量感条，**只落 B 一档**：
   `convert` 换算三栏（菜谱单位 → 营养库单位 → 实物），上轮 4/4/4（A 档量感条只拿到 3/3/3，不落）。
   形态键住 `PORTION_GAUGE_FORMS`（英文键，**不许用 B 当键**）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './portion-gauge/index.js';
/* 交互与流程（原型墙 `.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 那一批）的第一件：`bulk-bar`
   —— 82 批量操作条，形态 A「选中后浮出来的操作条（底部）」；用户在墙上给这一档 4 分。
   注：这里**不写汇总入口那一行**——按本层的对账口径（`test/组件清单.test.mjs` 第 ④ 组），
   写了汇总注记就得有一个 `*Css()` 汇总入口；同批第二件落地后，再由先成立的那件立汇总（照 `sheetCss()` 先例）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './bulk-bar/index.js';
/* 交互与流程（同一批）的第二件：`wizard-shell` —— 84 分步录入壳，形态 B「一问一屏（大字问题 ＋ 一条细进度）」；
   用户在墙上给这一档 4/4/4（A 档「两栏：左步骤／右表单」未全过，不落）。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径，同族第二件之后再由先成立的那件立汇总）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './wizard-shell/index.js';
/* 交互与流程（同一批）的第三件：`command-palette` —— 81 命令面板，形态 A「单栏分组结果（动作在前／页面在后）」；
   用户在墙上给这一档逐格 4/4/4（B 档「两栏：先选技能，再看它的页面与动作」未全过，不落）。
   这一件落地的是**触屏优先**的那一版：入口＝页头一枚看得见的按钮、整行可点＝执行或打开、零键帽。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径，同族第二件之后再由先成立的那件立汇总）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './command-palette/index.js';
/* 交互与流程（同一批）的第四件：`undo-timeline` —— 85 改动时间线，**A／B 两档都落**：
   `track` 一条轨（谁的改动、动了什么读数、能不能撤）／`impact` 一次改动的回滚单（影响面清单，
   勾哪几项就撤哪几项）。用户在墙上给这两档逐格 4/4/4；形态键住 `UNDO_TIMELINE_FORMS`
   （英文键，**不许用 A／B 当键**），三态住 `UNDO_TIMELINE_STATES`（`undoable`／`undone`／`locked`）。
   零键盘通路：撤销、恢复、开合、勾选、取消全是看得见、点得到的按钮。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './undo-timeline/index.js';
/* 交互与流程（同一批）的第五件：`relation-picker` —— 90 关系选择器，**A／B 两档都落**：
   `overlay` 浮层（搜索＋最近用过＋全部＋新建）／`inline` 行内展开（先选源，选完收成一行读得出的结果）。
   用户在墙上给这两档逐格 4/4/4；形态键住 `RELATION_PICKER_FORMS`（英文键，**不许用 A／B 当键**）。
   选中项两头同时可见：字段行读当前值、列表里那一行是选中态。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './relation-picker/index.js';
/* 交互与流程（同一批）的第六件：`drag-sort` —— 83 拖拽排序清单，**只落 A 一档**：
   `status`-无关的拖起态骨架（拖起行 ＋ 原位空槽 ＋ 落点粗线），本轮 4/4/4（B 档按钮排序只 3/3/3，不落）。
   形态键住 `DRAG_SORT_FORMS`（英文键，**不许用 A 当键**）；触屏上"按住拖"不是唯一通路：拿起与放下都有可点路径。
   注：这里**不写「族」字**，也**不加汇总入口**（同前几件的口径）。
   **只加行、不重排**（并行席位的约定）。 */
export * from './drag-sort/index.js';
