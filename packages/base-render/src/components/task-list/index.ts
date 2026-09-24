/** task-list · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 勾选清单 ——
 *
 *  一句话：**一条一行、整行是命中区**，勾上的划掉变灰并沉到组里；组头与表头现数「勾了几样」。
 *  买菜清单（私家大厨）／盘点（居家管家）／待办（备忘录）都用它。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 一行一条、要能勾（且勾了什么要当场看得出来）⇒ 用本件；
 *   · 只是读一串行、不给勾 ⇒ 用 `entry-rows`（明细行）；
 *   · 多选一次、勾完再确认（批量改分类）⇒ 用 `multi-checks`（多选清单）。
 *
 *  四件出口：
 *   · `renderTaskList(input)` —— 产标记（纯函数，零 DOM）；
 *   · `taskListCss()` —— 样式段（页面按需注入）；
 *   · `buildTaskListJs()` —— 运行时（产出 JS 文本：`change` 委派 ＋ 当场重数 ＋ 忙态挡写）；
 *   · 契约常量与入参类型（`TASK_KEY_ATTR`／`TASK_DONE_ATTR`／`TASK_EVENT_TOGGLE` …）。
 *
 *  页面怎么接自己的存盘逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:task-toggle', (e) => {
 *    const { list, key, done, doneCount, totalCount } = e.detail;   // 界面已就地更新完毕
 *    // 存盘、改脚注、重排…
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  TASK_BAR_ATTR,
  TASK_BOUND_ATTR,
  TASK_BUSY_ATTR,
  TASK_CHECK_CLASS,
  TASK_COUNTS_ATTR,
  TASK_COUNTS_SEPARATOR,
  TASK_DONE_ATTR,
  TASK_EVENT_TOGGLE,
  TASK_GROUP_ATTR,
  TASK_HIT_CLASS,
  TASK_KEY_ATTR,
  TASK_LABEL_ATTR,
  TASK_LABEL_CLASS,
  TASK_LIST_ATTR,
  TASK_LIST_CLASS,
  TASK_LIST_DEFAULT_KEY,
  TASK_LIST_FORMS,
  TASK_LIST_SLOTS,
  TASK_OF_ATTR,
  TASK_ROW_CLASS,
  TASK_ROW_DONE_CLASS,
  taskListClass,
  taskListSlot,
} from './attrs.js';
export type { TaskListForm, TaskListInput, TaskListRow, TaskListSlot } from './attrs.js';
export { renderTaskList } from './render.js';
export {
  TASK_LIST_BAR_HEIGHT_PX,
  TASK_LIST_CHECK_SIZE_PX,
  TASK_LIST_CONTAINER,
  TASK_LIST_HIT_MIN_HEIGHT_PX,
  TASK_LIST_NARROW_MAX_PX,
  taskListCss,
} from './style.js';
export { buildTaskListJs } from './runtime.js';
