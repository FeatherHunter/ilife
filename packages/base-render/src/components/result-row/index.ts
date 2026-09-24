/** resultRow · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 结果行（形态 A：单行，值在右）——
 *
 *  一句话：**一条结果一行**——左边一颗缩略格，中间标题（命中词用 `<mark>` 标出来）＋ 副语，
 *  右边是这一条的读数（金额／评分／天数）。**它自己不带运行时**：它是显示件，交互归 `search-field`。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 搜索／筛选的**结果清单**，每条要有「一眼能扫的读数」→ 用它；
 *   · 一行只有「标签 →点线→ 值」的文字账目 → 用 `ledger-rows`；
 *   · 一条记录一行但列更多（时间／类别／名称／数量／值＋备注）→ 用 `entry-rows`；
 *   · 要「按词找这一批」→ 把 `search-field` 的 `target` 对上本件的 `name`（同一次渲染就把接线做掉）。
 *
 *  与 `search-field` 的接线（本件**自动**做掉两段）：
 *   · 给了 `name` → 根上同时落 `data-ilife-result` 与 `data-ilife-search-region="<name>"`；
 *   · 每条结果落 `data-ilife-search-item`（可被搜）＋ `data-ilife-search-tags`（范围分档按它对号）；
 *   · 命中词用 `<mark data-ilife-search-hit>`——页面上没有搜索框时它是渲染期的静态高亮，
 *     挂了搜索框之后会被运行时的真高亮重算（这是有意的：高亮要说的是「用户刚打的词在哪」）。
 *
 *  两件出口：
 *   · `renderResultRow(input)` —— 产标记（纯函数，零 DOM）；
 *   · `resultRowCss()` —— 该组件的样式段（住 `.<prefix>page-ui` 之下）。
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  RESULT_DEFAULTS, RESULT_EMPTY_ATTR, RESULT_FORM_ATTR, RESULT_FORMS, RESULT_ITEM_ATTR,
  RESULT_NAME_ATTR, RESULT_ROOT_CLASS, RESULT_SEARCH_HIT_ATTR, RESULT_SEARCH_ITEM_ATTR,
  RESULT_SEARCH_REGION_ATTR, RESULT_SEARCH_TAGS_ATTR,
} from './attrs.js';
export type { ResultRowForm, ResultRowInput, ResultRowItemInput } from './attrs.js';
export { markTerms, renderResultRow } from './render.js';
export {
  resultRowCss, RESULT_MAX_WIDTH_PX, RESULT_ROW_MIN_PX, RESULT_THUMB_PX, RESULT_TOUCH_MIN_PX,
} from './style.js';
