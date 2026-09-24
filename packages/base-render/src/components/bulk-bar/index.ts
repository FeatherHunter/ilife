/** bulk-bar · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderBulkBar(input)`（产标记，零 DOM）／`bulkBarCss()`（样式段，含就地确认面那一段）／
 *  `buildBulkBarJs()`（运行时，产出 JS 文本）／形态闭集 `BULK_BAR_FORMS`（本件只落地形态 A）／
 *  类名根 `BULK_BAR_CLASS`。加入参面类型与三条几何事实（触控地板／行高／窄档阈值）。
 *
 *  页面怎么接自己的逻辑（不引入任何全局；本件不写库）：
 *  ```js
 *  document.addEventListener('ilife:bulk-change', (e) => { rerender(e.detail.keys); });
 *  document.addEventListener('ilife:bulk-action', (e) => {
 *    const { action, keys, value } = e.detail;   // 「改这 N 条」或一枚不带预演的动作
 *    if (action === 'cat') bulkSetCategory(keys, value);
 *  });
 *  ```
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  BULK_BAR_ACTION_ATTR,
  BULK_BAR_CLASS,
  BULK_BAR_EMPTY_TEXT,
  BULK_BAR_EVENT_ACTION,
  BULK_BAR_EVENT_CHANGE,
  BULK_BAR_FORMS,
  BULK_BAR_ITEM_ATTR,
  BULK_BAR_MISSING,
  BULK_BAR_NAME_ATTR,
  BULK_BAR_SLOTS,
  BULK_BAR_TONES,
  bulkBarSlot,
} from './attrs.js';
export type {
  BulkBarAction,
  BulkBarForm,
  BulkBarInput,
  BulkBarItem,
  BulkBarPreview,
  BulkBarPreviewRow,
  BulkBarSlot,
  BulkBarTone,
} from './attrs.js';
export { renderBulkBar } from './render.js';
export { BULK_BAR_MIN_TARGET_PX, BULK_BAR_NARROW_PX, BULK_BAR_ROW_MIN_HEIGHT_PX, bulkBarCss } from './style.js';
export { buildBulkBarJs } from './runtime.js';
