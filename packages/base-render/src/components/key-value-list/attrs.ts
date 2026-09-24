/** key-value-list · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-02-读数与账目.mjs`，2026-09 用户裁定）
 *  里的**形态 A「档案行」**——一串「字段：值」的清单：值是主角、标签是配角，**不画点线**
 *  （点线属于账目行 `ledger-rows`；值的主位靠字重与字号压住标签）。
 *
 *  形态键写在 `KEY_VALUE_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级）。
 */

/** 本件的类名根：全部槽位类名都是 `KEY_VALUE_CLASS + '-' + 槽名`。 */
export const KEY_VALUE_CLASS = 'ilife-block-key-value-list';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。
 *  **纯状态的类也算槽位**（`form-*`／`value-num` 这类）：一切挂在元素上的类名都从这一份拼出来，
 *  这样"只碰自己的类名"这条纪律才能被机器断（自造的 `is-*` 短类名会混进公共命名空间）。 */
export const KEY_VALUE_SLOTS = [
  /** 小标题（可省；不给＝整段不出标题行）。 */
  'heading',
  /** 一张档案（一个 `<dl>`；多张时逐张一枚）。 */
  'list',
  /** 一行（`<div>`，里头是 `<dt>` ＋ `<dd>`）。 */
  'row',
  /** 字段名（`<dt>`）：配角，给「值」让位。 */
  'term',
  /** 值位（`<dd>`）：主角。 */
  'value',
  /** 值的后缀说明（`还需减 3.4 kg`）：同一格下一行，随值一起右对齐。 */
  'note',
  /** 数字档（缀在值位上，不是单独的元素）：等宽字面 ＋ `tabular-nums`。 */
  'value-num',
  /** 形态类（形态 A「档案行」）：`<prefix>block-key-value-list-form-rows`。 */
  'form-rows',
] as const;
export type KeyValueSlot = (typeof KEY_VALUE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `KEY_VALUE_CLASS + '-' + …`）。 */
export function keyValueSlot(slot: KeyValueSlot, prefix = 'ilife-'): string {
  return prefix + 'block-key-value-list-' + slot;
}

/** 形态闭集：本件只落地了形态 A「档案行（两列，值右对齐）」。 */
export const KEY_VALUE_FORMS = ['rows'] as const;
export type KeyValueForm = (typeof KEY_VALUE_FORMS)[number];

/** 一行的高度下限（px）：触控目标 ≥44×44 是全宽口径（档案行常被包成"改这一项"的入口）。 */
export const KEY_VALUE_MIN_ROW_PX = 44;

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const KEY_VALUE_MISSING = '—';

/** 一行档案：字段名（必填）＋ 值（必填）。 */
export interface KeyValueRow {
  /** 字段名。**非空**（空字段名等于没有标签，读者不知道这个值是什么）。 */
  readonly label: string;
  /** 值（**已是给人看的样子**：取整、千分位、单位口径归调用方）。**非空**；缺值写 `—`。 */
  readonly value: string;
  /** 值的后缀说明（`还需减 3.4 kg`／`估算值`）：排在值后，随值一起右对齐。 */
  readonly note?: string;
  /** 值是数字串：走等宽字面 ＋ `tabular-nums`（多行值右对齐时这一档才真对齐）。 */
  readonly num?: boolean;
}

/** 档案行入参。`rows` 必填（空数组＝空串）。 */
export interface KeyValueListInput {
  /** 逐行档案。空数组＝本件一个字都不出（空清单不是档案）。 */
  readonly rows: readonly KeyValueRow[];
  /** 小标题（`用户档案`／`物品参数`）。不给＝不出标题行。 */
  readonly heading?: string;
  /** 形态键（闭集，缺省 `rows`）。 */
  readonly form?: KeyValueForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
