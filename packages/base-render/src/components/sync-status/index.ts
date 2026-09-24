/** sync-status · **组件出口**（本组件对外的唯一名字面）。
 *
 *  七个运行名：`renderSyncStatus(input)`（产标记，零 DOM）／`buildSyncStatusJs()`（运行时段，产 JS 文本）／
 *  `syncStatusCss()`（样式段）／形态闭集 `SYNC_STATUS_FORMS`／结果闭集 `SYNC_STATUS_RESULTS`
 *  与结果字表 `SYNC_STATUS_RESULT_WORDS`／两个事件名（`SYNC_STATUS_EVENT_RUN`／`_DONE`）／
 *  类名根 `SYNC_STATUS_CLASS`。另出两个几何事实与四个类型名（入参面）。
 *
 *  调用时序：页面挂 `syncStatusCss()` ＋ 把 `buildSyncStatusJs()` 拼进共享 helpers 槽；
 *  调用方监听 `SYNC_STATUS_EVENT_RUN` 去真的同步，跑完在**同一个根元素**上派发 `SYNC_STATUS_EVENT_DONE`
 *  （`detail = { ok, message? }`）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SYNC_STATUS_ACTION_ATTR,
  SYNC_STATUS_ACTIONS,
  SYNC_STATUS_ATTR,
  SYNC_STATUS_BOUND_ATTR,
  SYNC_STATUS_CLASS,
  SYNC_STATUS_ERROR_ATTR,
  SYNC_STATUS_EVENT_DONE,
  SYNC_STATUS_EVENT_RUN,
  SYNC_STATUS_FAILED_TEXT,
  SYNC_STATUS_FORMS,
  SYNC_STATUS_RESULTS,
  SYNC_STATUS_RESULT_WORDS,
  SYNC_STATUS_RUNNING_LABEL,
  SYNC_STATUS_RUN_TIMEOUT_MS,
  SYNC_STATUS_STATES,
  SYNC_STATUS_STATE_ATTR,
  SYNC_STATUS_TIMEOUT_TEXT,
} from './attrs.js';
export type {
  SyncStatusForm,
  SyncStatusInput,
  SyncStatusResult,
  SyncStatusState,
  SyncStatusTarget,
} from './attrs.js';
export { renderSyncStatus } from './render.js';
export { buildSyncStatusJs } from './runtime.js';
export { SYNC_STATUS_NARROW_PX, SYNC_STATUS_TOUCH_PX, syncStatusCss } from './style.js';
