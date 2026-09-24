/** searchField · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 搜索框（形态 B：范围分段 ＋ 下划线输入 ＋ 命中读数）——
 *
 *  一句话：**先圈定在哪找，再真打字，页上写着命中几处**——命中数是数出来的，不是编的。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 页面上有一批已经渲染好的条目（菜谱／食品／笔记／物品…），要按词找 → 用它；
 *     **命中计数、清空、回车跳下一处都是真行为**（`buildSearchFieldJs()`）。
 *   · 要「筛一批记录」（不是找词，而是按属性取子集）→ 用 `filter-chips`；
 *   · 要「换一段窗口看读数」→ 用 `window-picker`；
 *   · HELP 页里那个搜索框（`controls` 的共享 helper）**不是本件**：它绑死在 HELP 模板的固定 id 上，
 *     随模板注入、不可当积木拼；本件是能拼的公共件（结果区与它只通过 `data-*` 约定相接）。
 *
 *  与结果区的接线（三段，全走 `data-*`）：
 *   1. 结果区挂 `data-ilife-search-region="<键>"`；搜索框给 `target: '<键>'`（不给＝整页找）；
 *   2. 每条结果挂 `data-ilife-search-item`（`renderResultRow` 已自带），可选 `data-ilife-search-tags="范围1 范围2"`；
 *   3. 运行时给命中词打 `<mark data-ilife-search-hit>`，并派发 `ilife:search` / `ilife:search-jump`。
 *
 *  三件出口：
 *   · `renderSearchField(input)` —— 产标记（纯函数，零 DOM；命中数写 `—`，运行时填真数）；
 *   · `searchFieldCss()` —— 该组件的样式段（页面按需注入；住 `.<prefix>page-ui` 之下）；
 *   · `buildSearchFieldJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的重算（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:search', (e) => {
 *    const { name, query, scope, hits, items } = e.detail;   // hits／items 都是数出来的
 *  });
 *  document.dispatchEvent(new CustomEvent('ilife:search-loading', { detail: { name: 'main', on: true } }));
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  SEARCH_AT_ATTR, SEARCH_BOUND_ATTR, SEARCH_CLEAR_ATTR, SEARCH_COUNT_ATTR, SEARCH_CURRENT_ATTR,
  SEARCH_DEFAULTS, SEARCH_DISABLED_ATTR, SEARCH_EMPTY_ATTR, SEARCH_ERROR_ATTR, SEARCH_EVENT_JUMP,
  SEARCH_EVENT_LOADING, SEARCH_EVENT_QUERY, SEARCH_FORM_ATTR, SEARCH_FORMS, SEARCH_HIT_ATTR,
  SEARCH_INPUT_ATTR, SEARCH_INVALID_ATTR, SEARCH_ITEM_ATTR, SEARCH_LOADING_ATTR,
  SEARCH_LOADING_TEXT_ATTR, SEARCH_NAME_ATTR, SEARCH_NEXT_ATTR, SEARCH_N_ATTR, SEARCH_POS_ATTR,
  SEARCH_PREV_ATTR, SEARCH_READOUT_ATTR, SEARCH_REGION_ATTR, SEARCH_ROOT_CLASS, SEARCH_RUNTIME_ATTR,
  SEARCH_SCOPE_ATTR, SEARCH_SCOPE_NAME_ATTR, SEARCH_STATUS_ATTR, SEARCH_TAGS_ATTR, SEARCH_TARGET_ATTR,
} from './attrs.js';
export type { SearchFieldForm, SearchFieldInput, SearchScopeInput } from './attrs.js';
export { searchErrorId, renderSearchField } from './render.js';
export { searchFieldCss, SEARCH_MAX_WIDTH_PX, SEARCH_STATUS_MIN_CH, SEARCH_TOUCH_MIN_PX } from './style.js';
export { buildSearchFieldJs } from './runtime.js';
