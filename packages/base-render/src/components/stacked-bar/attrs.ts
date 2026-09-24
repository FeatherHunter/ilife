/** stacked-bar · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-04-形状与比例.mjs`，2026-09 用户裁定）
 *  里的**形态 A「100% 堆叠 ＋ 图例」**——一整块按占比切成几段：段宽＝占比，
 *  够宽的段里直接写读数（名字 ＋ 百分数或只剩百分数），**窄段让位图例**，图例必带数值。
 *
 *  形态键写在 `STACKED_BAR_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `STACKED_BAR_CLASS + '-' + 槽名`。 */
export const STACKED_BAR_CLASS = 'ilife-block-stacked-bar';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const STACKED_BAR_SLOTS = [
  /** 卡头那一排：标题 ＋ 右侧口径。 */
  'hd',
  /** 卡头标题（如「3 月消费结构」）。 */
  'title',
  /** 卡头右端那句（合计／单位），可换行。 */
  'stamp',
  /** 那根构成条本身（`role="img"`，段宽＝占比）。 */
  'bar',
  /** 构成条里的一段（**宽 ＝ 这一段的占比**，由行内 `flex` 给出）。 */
  'seg',
  /** 段里那行读数（够宽才出：≥ 名字档连名字一起写，≥ 数值档只写百分数）。 */
  'seg-text',
  /** 图例（**必带数值**：名字 ｜ 百分数 ｜ 数量）。 */
  'legend',
  /** 图例的一行。 */
  'legend-item',
  /** 图例左端那枚色块（纯装饰：色只是第二次提醒，数字在右边）。 */
  'swatch',
  /** 图例里的名字（可换行，**允许截断的只有它**）。 */
  'name',
  /** 图例里的百分数（数字，永不换行、永不截断）。 */
  'pct',
  /** 图例里的数量（数字，永不换行、永不截断）。 */
  'amount',
  /** 脚注一句人话。 */
  'note',
] as const;
export type StackedBarSlot = (typeof STACKED_BAR_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `STACKED_BAR_CLASS + '-' + …`）。 */
export function stackedBarSlot(slot: StackedBarSlot, prefix = 'ilife-'): string {
  return prefix + 'block-stacked-bar-' + slot;
}

/** 形态闭集：本件只落地了形态 A「100% 堆叠 ＋ 图例」。 */
export const STACKED_BAR_FORMS = ['stack'] as const;
export type StackedBarForm = (typeof STACKED_BAR_FORMS)[number];

/** 数据色档数（`is-k1`…`is-k6`）：段数上限就是它——**色序只有这么长，超了必然重色**。
 *  原型的口径是「段数收在 5 段以内才看得清」，尾巴并成「其他」是**调用方的聚合**，不是本件的形状。 */
export const STACKED_BAR_SERIES = 6;

/** 段数上限（＝ 色档数）。 */
export const STACKED_BAR_MAX_SEGMENTS = STACKED_BAR_SERIES;

/** 段里连名字一起写的最低占比（%）。低于它就只写百分数、或整段让位图例。 */
export const STACKED_BAR_NAME_MIN_PCT = 20;

/** 段里写百分数的最低占比（%）。低于它 ⇒ 段里一个字都不写，**数字退回图例**（图例必带数值）。 */
export const STACKED_BAR_VALUE_MIN_PCT = 12;

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const STACKED_BAR_MISSING = '—';

/** 构成条的一段：名字 ＋ 数量（**数量必须 > 0**：零段看不见、也不该占一格图例）。 */
export interface StackedBarSegment {
  /** 名字（如「餐饮」）；**允许换行，但不许被 `…` 截断**——图例里那一列是它。 */
  readonly name: string;
  /** 数量（与同批其它段同单位）。必须 > 0；占比由本件按各段之和算，**调用方不给占比**。 */
  readonly value: number;
}

/** 构成条入参。`title`／`segments` 必填——**没有分段就没有「构成」**（一个数一根条走 `scale-bar`）。 */
export interface StackedBarInput {
  /** 卡头标题（如「3 月消费结构」）。 */
  readonly title: string;
  /** 卡头右端那句（如「合计 ¥7 000」）；不给＝不出。 */
  readonly stamp?: string;
  /** 各分段（**至少一段、至多 `STACKED_BAR_MAX_SEGMENTS` 段**；占比按各段之和算）。 */
  readonly segments: readonly StackedBarSegment[];
  /** 数量单位（`元`／`克`／`条`）：跟在图例的数量后面，不参与占比口径。 */
  readonly unit?: string;
  /** 脚注一句人话（这张图读出来的结论）；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `stack`）。 */
  readonly form?: StackedBarForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
