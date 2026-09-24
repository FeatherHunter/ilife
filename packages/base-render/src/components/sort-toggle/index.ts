/** sortToggle · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 排序切换（形态 C：并进「视图」条）——
 *
 *  一句话：**把「排序」写成几个用户认得的视图**（全部／常做／高分／最近），
 *  每个视图带自己的条数，底下一句口径句说清这一档在按什么排——字段与方向是视图的内部。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 用户说的是「按常做排」「从大到小」这种**视图**，不是「字段＋方向」两个旋钮 → 用它；
 *   · 要「按属性取子集」（多选）→ 用 `filter-chips`（本件是单选档）；
 *   · 要「按词找条目」→ 用 `search-field`；
 *   · 只是「一行读数」→ 用 `stat-inline` 一类排版件。
 *
 *  与条目区的接线（三段，全走 `data-*`）：
 *   1. 条目区挂 `data-ilife-sort-region="<键>"`；本件给 `target: '<键>'`（不给＝整页找条目）；
 *   2. 每条条目挂 `data-ilife-sort-item`，`data-ilife-sort-tags="all 常做"`（属于哪些视图；
 *      **没有这个属性**的条目视为属于每一档），排序键落 `data-ilife-sort-<字段>`（如 `data-ilife-sort-used="6"`）；
 *   3. 运行时按真实条目算每档条数，并按当前视图的字段**真的重排**这些条目。
 *
 *  三件出口：
 *   · `renderSortToggle(input)` —— 产标记（纯函数，零 DOM）；
 *   · `sortToggleCss()` —— 该组件的样式段（住 `.<prefix>page-ui` 之下）；
 *   · `buildSortToggleJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的重算：
 *  ```js
 *  document.addEventListener('ilife:sort-change', (e) => {
 *    const { name, view, field, dir, shown } = e.detail;   // 顺序已就地重排完毕
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  SORT_BOUND_ATTR, SORT_CALIBER_ATTR, SORT_CALIBER_LINE_ATTR, SORT_CALIBER_TEXT_ATTR,
  SORT_DEFAULTS, SORT_DIRECTIONS, SORT_DIR_ATTR, SORT_DISABLED_ATTR, SORT_EMPTY_ATTR,
  SORT_ERROR_ATTR, SORT_EVENT_CHANGE, SORT_EVENT_LOADING, SORT_FIELD_ATTR, SORT_FLIP_ATTR,
  SORT_FLIP_LABEL_ATTR, SORT_FORM_ATTR, SORT_FORMS, SORT_INK_ATTR, SORT_INVALID_ATTR,
  SORT_ITEM_ATTR, SORT_ITEM_TAGS_ATTR, SORT_LOADING_ATTR, SORT_NAME_ATTR, SORT_N_ATTR,
  SORT_REGION_ATTR, SORT_ROOT_CLASS, SORT_RUNTIME_ATTR, SORT_SHOWN_ATTR, SORT_STATUS_ATTR,
  SORT_TARGET_ATTR, SORT_VIEW_ATTR, SORT_VIEW_LABEL_ATTR,
} from './attrs.js';
export type { SortDirection, SortToggleForm, SortToggleInput, SortViewInput } from './attrs.js';
export { sortErrorId, renderSortToggle } from './render.js';
export { sortToggleCss, SORT_MAX_WIDTH_PX, SORT_STATUS_MIN_CH, SORT_TOUCH_MIN_PX } from './style.js';
export { buildSortToggleJs } from './runtime.js';
