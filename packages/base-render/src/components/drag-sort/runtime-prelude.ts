/** drag-sort · **运行时段的地基**（产出 JS 文本的头一段：常量 ＋ 定位小件 ＋ 全列重写 ＋ 空槽／落点线）。
 *
 *  为什么有这一件：本件一次落两档骨架，`runtime.ts` 一度到 379 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）。按先例先拆再写（兄弟件 `runtime-text.ts` 同一口径）：
 *  · `runtime-text.ts`＝**文案烘法**（模板 → 产出 JS 里那几句函数）；
 *  · 本件＝**两档共用的地基**（常量、`root`／`list`／`row` 定位、序号与位置读数重写、空槽与落点线的建出）；
 *  · `runtime-lift.ts`＝**旧档（`lift` 拿起态）那一支**；`runtime-buttons.ts`＝**新档（`buttons` 按钮排序）那一支**；
 *  · `runtime.ts`＝外壳（幂等、分派、委派、指针手势、首次挂载）＋ 把上面几段拼成一段 IIFE。
 *
 *  **契约**：这里返回的是**几段文本**，不是几个函数——产出的 JS 天然自足（注入页面后模块作用域不在，
 *  形参名与模板串都不在），所以每一段自己带自己的闭合括号；拼法只允许「按顺序相接」。
 *  `PRELUDE_CONSTS`／`PRELUDE_FNS` 报的是**这一支在产出文本里声明了哪些名字**（判据按它对账：
 *  各支用到的名字必须有人声明，漏一个注入页面后就是 `ReferenceError`，而它只在真机那一瞬露头）。
 *  **旧档那一段的字节一个都不改**：搬的只是「住哪个文件」。
 */
import {
  DRAG_SORT_ATTR,
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_BOUND_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_EVENT_CANCEL,
  DRAG_SORT_EVENT_DROP,
  DRAG_SORT_EVENT_PICK,
  DRAG_SORT_FORM_ATTR,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_MOVE_ATTR,
  DRAG_SORT_MOVE_DOWN,
  DRAG_SORT_MOVE_UP,
  DRAG_SORT_RUNTIME_ATTR,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  dragSortSlot,
} from './attrs.js';
import { dragSortTextFnLines, TEXT_FNS } from './runtime-text.js';
import { m } from '../../entries/index.js';

/** 产出 JS 里的换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** JSON 引号：产出文本里的字符串字面量一律经它。 */
const q = (s: string): string => JSON.stringify(s);

/** 地基声明的**常量名**（产出 JS 里的 `var 名=`）。 */
export const PRELUDE_CONSTS = [
  'A_ROOT', 'A_LIST', 'A_KEY', 'A_HANDLE', 'A_SLOT', 'A_LINE', 'A_STATUS', 'A_CANCEL', 'A_LIFT',
  'A_AT', 'A_BOUND', 'A_RT', 'A_FORM', 'A_MOVE', 'MV_UP', 'MV_DOWN', 'EV_PICK', 'EV_DROP',
  'EV_CANCEL', 'C_ROW', 'C_HANDLE', 'C_INDEX', 'C_NAME', 'C_POS', 'C_SLOT', 'C_DROP', 'C_TEXT',
  'C_MV', 'C_MVUP', 'C_MVDN', 'T_CANCEL', 'doc', 'docEl', 'suppressClick', 'press', 'drag',
] as const;

/** 地基声明的**函数名**（产出 JS 里的 `function 名(`）。 */
export const PRELUDE_FNS = [
  'runtimeOn', 'isButtons', 'fire', 'rootOf', 'listOf', 'rowsOf', 'rowOf', 'handleOf', 'labelOf',
  'statusOf', 'cancelOf', 'slotOf', 'lineOf', 'pointOf', 'atPointer', 'rowAt', 'replaceGrips',
  'repaint', 'buildSlot', 'buildLine', 'placeLine', 'maybeCancel',
] as const;

/** 地基里声明的名字（常量 ＋ 函数）。 */
export const PRELUDE_NAMES = [...PRELUDE_CONSTS, ...PRELUDE_FNS] as const;

/** 各支用到的名字的**登记表类型**：地基声明的 ＋ 本件其余各支声明的。
 *  为什么要一张全表：产出的 JS 是一整段 IIFE，一支里可以直呼另一支的名字（`runtime-lift.ts` 的 `drop`
 *  直呼 `runtime-buttons.ts` 的 `buttonsDrop`）。**谁声明**由各自报（`PRELUDE_NAMES`／`TEXT_FNS`
 *  ／各支自己的表），**谁用到**由各支的 DEPS 报；判据拿两张表对账（漏声明＝注入页面后 `ReferenceError`，
 *  而它只在真机那一瞬露头）。类型住在这一件（最底那一件）是为了不让各支互相 import 成运行时环。 */
export type DeclaredName<Extra extends string = never> =
  | (typeof PRELUDE_NAMES)[number]
  | (typeof TEXT_FNS)[number]['name']
  | 'pick' | 'drop'
  | Extra;

/** 地基那一段：常量 ＋ 幂等闸 ＋ 文案 ＋ 定位小件 ＋ 重写 ＋ 空槽／落点线 ＋ 取消。
 *  两档共用（**这段里只有一处问「哪一档」**：`repaint` 要按档写位置读数与把手名；形态差异其余全在
 *  `runtime-lift.ts`／`runtime-buttons.ts` 与 `runtime.ts` 的分派里）。 */
export function dragSortPreludeJs(): string {
  return m('base-render.components-drag-sort-runtime-prelude.c001', {
    p0: String(q(DRAG_SORT_ATTR)),
    p1: String(q(DRAG_SORT_LIST_ATTR)),
    p2: String(q(DRAG_SORT_KEY_ATTR)),
    p3: String(q(DRAG_SORT_HANDLE_ATTR)),
    p4: String(LF),
    p5: String(q(DRAG_SORT_SLOT_ATTR)),
    p6: String(q(DRAG_SORT_LINE_ATTR)),
    p7: String(q(DRAG_SORT_STATUS_ATTR)),
    p8: String(q(DRAG_SORT_CANCEL_ATTR)),
    p9: String(LF),
    p10: String(q(DRAG_SORT_LIFT_ATTR)),
    p11: String(q(DRAG_SORT_AT_ATTR)),
    p12: String(q(DRAG_SORT_BOUND_ATTR)),
    p13: String(q(DRAG_SORT_RUNTIME_ATTR)),
    p14: String(LF),
    p15: String(q(DRAG_SORT_FORM_ATTR)),
    p16: String(q(DRAG_SORT_MOVE_ATTR)),
    p17: String(q(DRAG_SORT_MOVE_UP)),
    p18: String(q(DRAG_SORT_MOVE_DOWN)),
    p19: String(LF),
    p20: String(q(DRAG_SORT_EVENT_PICK)),
    p21: String(q(DRAG_SORT_EVENT_DROP)),
    p22: String(q(DRAG_SORT_EVENT_CANCEL)),
    p23: String(LF),
    p24: String(q(dragSortSlot('row'))),
    p25: String(q(dragSortSlot('handle'))),
    p26: String(q(dragSortSlot('index'))),
    p27: String(q(dragSortSlot('name'))),
    p28: String(LF),
    p29: String(q(dragSortSlot('pos'))),
    p30: String(q(dragSortSlot('slot'))),
    p31: String(q(dragSortSlot('drop'))),
    p32: String(q(dragSortSlot('text'))),
    p33: String(LF),
    p34: String(q(dragSortSlot('move'))),
    p35: String(q(dragSortSlot('move-up'))),
    p36: String(q(dragSortSlot('move-down'))),
    p37: String(LF),
    p38: String(q(DRAG_SORT_TEXT.cancel)),
    p39: String(LF),
    p40: String(LF),
    p41: String(LF),
    p42: String(LF),
    p43: String(LF),
    p44: String(dragSortTextFnLines()),
    p45: String(LF),
  });
}
