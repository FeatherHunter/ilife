/** bulk-bar · **入参键表 ＋ 「未知键一律拒」**（`model.ts` 的入参入口逐层调 `assertKeys`）。
 *
 *  为什么独立成件：键表与这份实现加进 `model.ts` 之后那个文件就过本包的**行数告警线**
 *  （350 行／LF 口径，见 `packages/base-render/AGENTS.md`）。挪出来之后 `model.ts` 只留
 *  「入口 ＋ 调用点」，本文件只依赖 `shared/validate.js`——单向，没有环。
 *
 *  键表的唯一来源是**本件的入参面**：`attrs.ts` 里 `BulkBarInput`／`BulkBarItem`／`BulkBarAction`／
 *  `BulkBarPreview`／`BulkBarPreviewRow` 五个接口。**必填与可选一起列**——只列必填会把可选键误拒，
 *  那比静默吞键更坏（合法的调用方当场被打回）。
 *
 *  两层含义分开：**键在不在表里**由本文件管（写错键名＝拒）；**值合不合法**仍归 `model.ts`
 *  各处的 `reqText`／`optBool` 那一批。
 */
import { badInput } from '../shared/validate.js';

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  为什么必须查：写错的键名（`titel`／`reding`）被吞掉时，屏上只是**静静地少一块**，
 *  调用方却以为自己设上了——「看着像对、其实是别的面」正是本件不产出的东西。
 *
 *  **两条路都要走**（只走 `Object.keys` 会漏掉一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的（`Object.keys` 看不见它）；
 *   · `for…in` —— 走**整条原型链**（`Object.create({bogus:1})` 那种继承来的键就是这一路）。
 *
 *  先例：`kanban-columns/model.ts` 与 `relation-picker/model.ts` 的同名小件。
 */
export function assertKeys(raw: object, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** `BulkBarInput` 的键（顶层入参表）。 */
export const BULK_BAR_INPUT_KEYS = ['name', 'items', 'actions', 'countUnit', 'tail', 'hint',
  'emptyText', 'openAction', 'form', 'extraClass'] as const;

/** `BulkBarItem` 的键（一行条目的入参表）。 */
export const BULK_BAR_ITEM_KEYS = ['key', 'title', 'note', 'reading', 'selected', 'disabled',
  'disabledReason'] as const;

/** `BulkBarAction` 的键（一枚动作的入参表）。 */
export const BULK_BAR_ACTION_KEYS = ['key', 'label', 'tone', 'preview', 'disabled', 'busy',
  'error'] as const;

/** `BulkBarPreview` 的键（一份预演的入参表）。 */
export const BULK_BAR_PREVIEW_KEYS = ['title', 'cap', 'valueLabel', 'value', 'recent', 'rows',
  'summary', 'submitLabel', 'cancelLabel'] as const;

/** `BulkBarPreviewRow` 的键（预演里一行的入参表）。 */
export const BULK_BAR_PREVIEW_ROW_KEYS = ['keep', 'to', 'from', 'note'] as const;
