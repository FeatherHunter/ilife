/** invoice-lines · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／行类闭集／入参类型）。
 *
 *  这一件是**重做件**（原型墙 3/3/3，`.scratch/ui-组件墙/重做设计口径.md` §6）：原型读起来像一摞普通账目行，
 *  每行只有一个金额、说不出「为什么」。重做两件事：
 *   ① **每行读得出「为什么」**：减项与加项**必带原因**（「满 2000 减 200」「平台红包」），说不出原因的行一律拒；
 *   ② **从原价到实付是一条链**：缩进逐级 ＋ 底下一条重线收口，最后一行实付**加粗放大**，
 *      均摊写进实付那一行的**副语**（不另开一块）。
 *  另一形态给**纯 CSS 瀑布条**：条长从原价走到实付，「省了多少」在形状上看得见。
 *
 *  与账目行的分工：`ledger-rows`／`entry-rows` 是**平铺读数**（一列标签对一列值）；
 *  本件讲的是**一笔钱怎么拆的**（一条减法链 ＋ 一个收口），两件不做同一件事。
 */

/** 本件的类名根。 */
export const INVOICE_LINES_CLASS = 'ilife-block-invoice-lines';

/** 槽位闭集。 */
export const INVOICE_LINES_SLOTS = [
  /** 链的容器（`<ol>`：原价 → 各减项／加项 → 实付，顺序就是入参顺序）。 */
  'list',
  /** 一行（`is-base`／`is-cut`／`is-add`／`is-total`）。 */
  'line',
  /** 行左端的名字（「原价 · 超市买菜」「店铺满减」）。 */
  'label',
  /** 行右端的金额（带符号与千分位：`−¥12.00`）。 */
  'amount',
  /** 这一行的「为什么」（减项／加项**必出**；左端一枚标签说清是「为什么减」还是「为什么加」）。 */
  'why',
  /** 实付那一行的副语（均摊 ／ 合几折）。 */
  'share',
  /** 瀑布条（纯 CSS：段宽与金额等比）。 */
  'bar',
  /** 条里的一段。 */
  'seg',
  /** 条下面那行口径（条长以什么为满分）。 */
  'foot',
  /** 图例（条下逐行对上：原价 ／ 各减项 ／ 实付）。 */
  'legend',
  /** 图例里的一行。 */
  'legend-row',
  /** 图例里的一行。 */
  'legend-swatch',
  /** 图例行左端的色块（纯装饰：图例本身也带金额）。 */
  'legend-label',
  /** 图例行右端的金额。 */
  'legend-amount',
  /** 口径行。 */
  'note',
] as const;
export type InvoiceLinesSlot = (typeof INVOICE_LINES_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function invoiceLinesSlot(slot: InvoiceLinesSlot, prefix = 'ilife-'): string {
  return prefix + 'block-invoice-lines-' + slot;
}

/** 形态闭集：`chain`（逐行分解 ＋ 收口）与 `waterfall`（纯 CSS 瀑布条）。 */
export const INVOICE_LINES_FORMS = ['chain', 'waterfall'] as const;
export type InvoiceLinesForm = (typeof INVOICE_LINES_FORMS)[number];

/** 行类闭集（**第一行必须是 `base`**；`base` 只能出现在第一行）。 */
export const INVOICE_LINE_KINDS = ['base', 'cut', 'add'] as const;
export type InvoiceLineKind = (typeof INVOICE_LINE_KINDS)[number];

/** 行类 → 金额前那个记号（`base` 不带记号：原价就是那一笔钱本身）。 */
export const INVOICE_LINES_KIND_MARKS: Readonly<Record<InvoiceLineKind, string>> = Object.freeze({
  base: '',
  cut: '−',
  add: '＋',
});

/** 减项／加项那行左端的两枚标签：**每行读得出「为什么」**就靠它们把原因点出来。 */
export const INVOICE_LINES_WHY_CUT = '为什么减';
export const INVOICE_LINES_WHY_ADD = '为什么加';

/** 缺省的钱符号与实付行的名字。 */
export const INVOICE_LINES_SYMBOL = '¥';
export const INVOICE_LINES_TOTAL_LABEL = '实付';

/** 金额的小数位（钱按两位排：`168.00`）。 */
export const INVOICE_LINES_DECIMALS = 2;

/** 实付那一行的字号倍数（**加粗放大**：收口那一行是全件的读数）。 */
export const INVOICE_LINES_TOTAL_SCALE = 1.6;

/** 瀑布条里：段窄到什么程度就不再往段里写字（**金额仍然在图例里逐行出**，一个字都不丢）。 */
export const INVOICE_LINES_SEGMENT_MIN_PCT = 12;

/** 均摊那句的左端词（「均摊 2 人，每人 ¥67.00」）。 */
export const INVOICE_LINES_SHARE_WORD = '均摊';

/** 一笔钱里的一行。`amount` 是**正的量**（符号由 `kind` 定：减项前面挂 `−`）。 */
export interface InvoiceLine {
  /** 这一行是什么（「原价 · 超市买菜」「店铺满减」「拆单运费」）。**非空**。 */
  readonly label: string;
  /** 金额（**正的量**，有限数且 > 0）。 */
  readonly amount: number;
  /** 行类（闭集）：`base` 原价（只许第一行）／`cut` 减项／`add` 加项。 */
  readonly kind: InvoiceLineKind;
  /** **为什么**：减项与加项**必填**（「满 100 减 12，已达标」「拆成两单发，第二单没到免运费门槛」）。 */
  readonly why?: string;
}

/** 均摊（写进实付那一行的副语里，不另开一块）。 */
export interface InvoiceShare {
  /** 几个人（整数 ≥ 2）。 */
  readonly people: number;
  /** 除不尽时那句补充；不给＝本件按「除不尽」算一句。 */
  readonly note?: string;
}

/** 金额分解的入参。`lines` 必填且**第一行必须是原价**（没有原价就没有「拆」这件事）。 */
export interface InvoiceLinesInput {
  /** 分行（第一行 `kind: 'base'`，其余 `cut`／`add`）。 */
  readonly lines: readonly InvoiceLine[];
  /** 钱符号（缺省 `¥`）。 */
  readonly symbol?: string;
  /** 实付那一行的名字（缺省「实付」）。 */
  readonly totalLabel?: string;
  /** 均摊到几人（写进实付行的副语）。 */
  readonly share?: InvoiceShare;
  /** 口径行（这一笔怎么拆的）。串＝一句话；数组＝分段。 */
  readonly note?: string | readonly string[];
  /** 形态键（闭集，缺省 `chain`）：`chain` 逐行分解 ／ `waterfall` 瀑布条。 */
  readonly form?: InvoiceLinesForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
