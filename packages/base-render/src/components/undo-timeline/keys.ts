/** undo-timeline · **入参键表与「入参表以外的键一律拒」**（本文件已经贴着告警线，见 `model.ts` 件头；
 *  与 `ids.ts`／`text.ts` 同样的拆法：形状是形状，文案是文案，键表是键表）。
 *
 *  三块口径：
 *   1. **键表照 `attrs.ts` 的入参面逐字段列全**（必填与可选都列）：顶层、一条改动、一条读数、
 *      一张回滚单、影响面里的一行、整段回滚那枚——**每个对象层各一张**，不共用一张大表
 *      （共用会让某一层的键在另一层静默过关）。
 *   2. **自有属性 ＋ 原型链双查**（先例 `relation-picker/model.ts`／`kanban-columns/model.ts`）：
 *      `Object.getOwnPropertyNames` 看得见不可枚举的自有键，`for…in` 走得到继承来的键——
 *      只走 `Object.keys` 会漏掉这两类，写错的名字照样静默吞。
 *   3. **形态错配的键不在本文件的活里**：形态 `impact` 给了 `entries`／`openKey`／`rollback`，
 *      本文件只按**顶层那张表**收下（这三个键在表里），要不要按形态再收一档是另一件事。
 */
import { badInput } from '../shared/validate.js';

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *  收 `object`（不是 `Record<string, unknown>`）：各层的入参类型各有各的字段，直接传进来即可，
 *  调用处不必为了过类型先把它断言成一张索引表。 */
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

/** `UndoTimelineInput` 的键（顶层入参表；两形态的键都在这一张里，故两个形态下 `form` 之外的那些键照收）。 */
export const INPUT_KEYS = ['name', 'form', 'entries', 'title', 'cap', 'rollback', 'openKey', 'emptyText',
  'hint', 'change', 'changeKey', 'extraClass'] as const;

/** `UndoTimelineEntry` 的键（一条改动的入参表；`entries` 的每个元素）。 */
export const ENTRY_KEYS = ['key', 'time', 'say', 'state', 'readings', 'note', 'tag', 'lockedReason',
  'impact', 'go', 'busy', 'error'] as const;

/** `UndoTimelineReading` 的键（一条读数的入参表；`readings` 的每个元素）。 */
export const READING_KEYS = ['label', 'from', 'to'] as const;

/** `UndoTimelineImpact` 的键（一张回滚单的入参表：`change` 与 `entries[].impact` 都走它）。 */
export const IMPACT_KEYS = ['title', 'note', 'rows', 'sumNote', 'cancelLabel'] as const;

/** `UndoTimelineImpactRow` 的键（影响面里的一行；`impact.rows` 的每个元素）。 */
export const IMPACT_ROW_KEYS = ['key', 'title', 'note', 'count', 'checked', 'locked', 'lockedReason'] as const;

/** `UndoTimelineRollback` 的键（整段回滚那枚的入参表）。 */
export const ROLLBACK_KEYS = ['label', 'note'] as const;
