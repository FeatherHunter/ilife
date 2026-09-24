/** filterChips · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 筛选条（形态 A：常用一行 ＋「更多」可展开）——
 *
 *  一句话：**按属性取子集**的一组可点 chip——已选几档、共几条、合计多少都写在页上，
 *  计数与合计是运行时按页面上的记录**数出来**的。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 页面上有一批记录（账单／菜谱／物品／笔记…），要按分类／餐别／位置一类的属性筛 → 用它；
 *   · 要「按词找条目」→ 用 `search-field`；
 *   · 只要「一串胶囊标签」的排版（不可点）→ 用 `renderChipRow`（`blocks.ts`）——本件是它的可点版，
 *     两者不是替代关系：那个是排版件，这个是交互件。
 *
 *  与记录区的接线（三段，全走 `data-*`）：
 *   1. 记录区挂 `data-ilife-chips-region="<键>"`；本件给 `target: '<键>'`（不给＝整页找记录）；
 *   2. 每条记录挂 `data-ilife-chip-item` ＋ `data-ilife-chip-tags="餐费 交通"`（空格分隔的机器值），
 *      金额一类要合计的数落 `data-ilife-chip-value`；
 *   3. 运行时按真实记录重算每档计数与合计，并派发 `ilife:filter-change`。
 *
 *  三件出口：
 *   · `renderFilterChips(input)` —— 产标记（纯函数，零 DOM）；
 *   · `filterChipsCss()` —— 该组件的样式段（住 `.<prefix>page-ui` 之下）；
 *   · `buildFilterChipsJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的重算：
 *  ```js
 *  document.addEventListener('ilife:filter-change', (e) => {
 *    const { name, selected, rows, total } = e.detail;   // rows／total 都是数出来的
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  CHIPS_BOUND_ATTR, CHIPS_CLEAR_ATTR, CHIPS_DEFAULTS, CHIPS_DISABLED_ATTR, CHIPS_EMPTY_ATTR,
  CHIPS_ERROR_ATTR, CHIPS_EVENT_CHANGE, CHIPS_EVENT_LOADING, CHIPS_FORM_ATTR, CHIPS_FORMS,
  CHIPS_INVALID_ATTR, CHIPS_LOADING_ATTR, CHIPS_MORE_ATTR, CHIPS_NAME_ATTR, CHIPS_PICKED_ATTR,
  CHIPS_REGION_ATTR, CHIPS_ROOT_CLASS, CHIPS_ROWS_ATTR, CHIPS_ROW_ATTR, CHIPS_RUNTIME_ATTR,
  CHIPS_STATUS_ATTR, CHIPS_TARGET_ATTR, CHIPS_TOTAL_ATTR, CHIP_ATTR, CHIP_ITEM_ATTR,
  CHIP_ITEM_TAGS_ATTR, CHIP_ITEM_VALUE_ATTR, CHIP_N_ATTR,
} from './attrs.js';
export type { FilterChipOption, FilterChipsForm, FilterChipsInput } from './attrs.js';
export { chipsErrorId, renderFilterChips } from './render.js';
export { filterChipsCss, CHIPS_MAX_WIDTH_PX, CHIPS_STATUS_MIN_CH, CHIPS_TOUCH_MIN_PX } from './style.js';
export { buildFilterChipsJs } from './runtime.js';
