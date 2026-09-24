/** stat-inline · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-02-读数与账目.mjs`，2026-09 用户裁定）
 *  里的**形态 A「分隔点行内串（可折行）」**——一句话里嵌几个数：
 *  「餐费 12 笔 · 合计 ¥2,140.00 · 占 49.9% · 较上月 +15.1%」。
 *
 *  形态键写在 `STAT_INLINE_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级）。
 */

/** 本件的类名根：全部槽位类名都是 `STAT_INLINE_CLASS + '-' + 槽名`。 */
export const STAT_INLINE_CLASS = 'ilife-block-stat-inline';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const STAT_INLINE_SLOTS = [
  /** 每一项（`inline-flex` ＋ `nowrap`）：值与其标签**不许分家**。 */
  'item',
  /** 项里的文字（值前后的那两个字，如「合计」）。 */
  'label',
  /** 项里的数（`¥2,140.00`／`12 笔`）：主色 ＋ 等宽 ＋ `tabular-nums`。 */
  'value',
  /** 项与项之间的分隔点（`aria-hidden`；`interpunct: false` 时整槽不出）。 */
  'sep',
  /** 形态类（形态 A「分隔点行内串」）：`<prefix>block-stat-inline-form-dots`。 */
  'form-dots',
] as const;
export type StatInlineSlot = (typeof STAT_INLINE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `STAT_INLINE_CLASS + '-' + …`）。 */
export function statInlineSlot(slot: StatInlineSlot, prefix = 'ilife-'): string {
  return prefix + 'block-stat-inline-' + slot;
}

/** 形态闭集：本件只落地了形态 A「分隔点行内串」。 */
export const STAT_INLINE_FORMS = ['dots'] as const;
export type StatInlineForm = (typeof STAT_INLINE_FORMS)[number];

/** 分隔点的字形（U+00B7 MIDDLE DOT）：闭集外的写法不许出现（`・`／`•`／`、` 各有各的语义）。 */
export const STAT_INLINE_SEP = '\u00B7';

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const STAT_INLINE_MISSING = '—';

/** 一项读数：值（必填）＋ 前后可各带一段标签。 */
export interface StatInlineItem {
  /** 值（**已是给人看的样子**：取整、千分位、单位口径归调用方）。**非空**；缺值写 `—`。 */
  readonly value: string;
  /** 值**前**的标签（`合计`／`餐费`）：同一项内与值不许分家（项恒 `nowrap`）。 */
  readonly label?: string;
  /** 值**后**的字（`笔`／`元`／`天`）：量词或单位。 */
  readonly unit?: string;
}

/** 行内读数入参。`items` 必填（空数组＝空串）。 */
export interface StatInlineInput {
  /** 逐项读数。空数组＝本件一个字都不出。 */
  readonly items: readonly StatInlineItem[];
  /** 项与项之间出不出分隔点；缺省出（原型那一档）。整行只一项时出不出都一样。 */
  readonly interpunct?: boolean;
  /** 形态键（闭集，缺省 `dots`）。 */
  readonly form?: StatInlineForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
