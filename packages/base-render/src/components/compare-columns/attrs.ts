/** compare-columns · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／枚举闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-03-对照与榜单.mjs`，2026-09 用户裁定）
 *  里的**形态 A「背靠背条形」**：两个窗口逐项并排——左侧窗口的值与条伸向中线、右侧同款，
 *  项名住在中缝那一列；**差额单独一行**压在下面。
 *
 *  它替掉的错法：两窗的读数各写成一张表（读者要自己在两处对齐同一项）；只报差额不报两侧
 *  （读者不知道差额从哪来）；把两窗拼成一张 `renderDataTable`（两列同名、表头无处放差额）。
 *
 *  形态键写在 `COMPARE_COLUMNS_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `COMPARE_COLUMNS_CLASS + '-' + 槽名`。 */
export const COMPARE_COLUMNS_CLASS = 'ilife-block-compare-columns';

/** 槽位闭集（`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const COMPARE_COLUMNS_SLOTS = [
  /** 两列的表头行：左窗名 ＋ 右窗名（中缝那一列留空）。窄容器下整行收起，改由每侧的窗口名承担。 */
  'head',
  /** 表头行左侧：**左**窗口名（如「上月」）。 */
  'head-left',
  /** 表头行右侧：**右**窗口名（如「本月」）。 */
  'head-right',
  /** 逐项并排的那一组行。 */
  'list',
  /** 一项一行。 */
  'row',
  /** 一侧（左／右）的一格：窗口名（窄档才现）／值（＋单位）／条。 */
  'side',
  /** 一侧的窗口名：**只在窄容器下出现**（宽档由表头行给，两处不重复念）。 */
  'side-name',
  /** 这一侧的读数（含单位，`<small>` 跟在同一格）。 */
  'value',
  /** 值的单位（`元`／`次`／`卡`）；差额行复用同一个槽。 */
  'unit',
  /** 条的外框（两窗共用一条刻度，长度可直接比）。 */
  'bar',
  /** 条的填充（宽度＝这一侧的值 ÷ 两窗共同的最大值）。 */
  'fill',
  /** 中缝那一列：项名（两窗都有的项才列出来，归调用方保证）。 */
  'label',
  /** 差额单独一行（**不是**脚注：它是本形态的结论位）。 */
  'diff',
  /** 差额行的标签（固定「差额合计」，见 `COMPARE_COLUMNS_DIFF_LABEL`）。 */
  'diff-label',
  /** 差额的读数（带方向字形与正负号）。 */
  'diff-value',
  /** 口径行：这两个窗口到底是什么、差额怎么算的（弱文字，可很长、必须能换行）。 */
  'caliber',
] as const;
export type CompareColumnsSlot = (typeof COMPARE_COLUMNS_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `COMPARE_COLUMNS_CLASS + '-' + …`）。 */
export function compareColumnsSlot(slot: CompareColumnsSlot, prefix = 'ilife-'): string {
  return prefix + 'block-compare-columns-' + slot;
}

/** 这一侧的状态类（**唯一拼法**）。件内的状态名一律带件内语义前缀（`is-side-`／`is-dir-`／`is-tone-`），
 *  **不许用 `is-left`／`is-up` 这类泛名**：泛名会与别的件标记里的同名状态撞上（实测 `sheet-frame`
 *  的样式段就写着自己的 `.is-left` / `.is-right`）——皮肤矩阵的「跨件零交集」按这一条守。 */
export function compareColumnsSideClass(side: 'left' | 'right'): string {
  return 'is-side-' + side;
}

/** 差额的方向状态类（`up`／`down`／`flat`）。 */
export function compareColumnsDirectionClass(direction: CompareColumnsDirection): string {
  return 'is-dir-' + direction;
}

/** 差额的语气状态类（只在 `sense` 点名时上）。 */
export function compareColumnsToneClass(tone: 'good' | 'bad'): string {
  return 'is-tone-' + tone;
}

/** 形态闭集：本件只落地了形态 A「背靠背条形」。 */
export const COMPARE_COLUMNS_FORMS = ['back-to-back'] as const;
export type CompareColumnsForm = (typeof COMPARE_COLUMNS_FORMS)[number];

/** 方向字形：**色不是唯一信息**——涨／跌／持平一律「字形 ＋ 正负号 ＋ 色阶」三样里至少两样都在。
 *  字形住 `aria-hidden` 的 `<i>` 里（`＋`／`−` 本身就是可读文本，不靠字形传达语义）。 */
export const COMPARE_COLUMNS_UP = '▲';
export const COMPARE_COLUMNS_DOWN = '▼';
export const COMPARE_COLUMNS_FLAT = '＝';

/** 差额的正负号（全角加号 ＋ 数学减号：与小票／报刊两套语言的数字宽度一致；ASCII `-` 在等宽栈里偏窄）。 */
export const COMPARE_COLUMNS_PLUS = '＋';
export const COMPARE_COLUMNS_MINUS = '−';

/** 方向闭集（`up`＝右窗比左窗大）。 */
export const COMPARE_COLUMNS_DIRECTIONS = ['up', 'down', 'flat'] as const;
export type CompareColumnsDirection = (typeof COMPARE_COLUMNS_DIRECTIONS)[number];

/** 语气闭集：**涨是好是坏由调用方定**（记账涨＝坏、作息涨＝好、卡路里涨＝坏），本件不猜。
 *  `neutral`＝只给字形与正负号、不上语义色（缺省）；另两档给差配上「好／坏」色阶。 */
export const COMPARE_COLUMNS_SENSES = ['neutral', 'up-good', 'down-good'] as const;
export type CompareColumnsSense = (typeof COMPARE_COLUMNS_SENSES)[number];

/** 差额行的标签（差额只要出，就带它：读者一眼看出这一行是「两个窗口之差」）。 */
export const COMPARE_COLUMNS_DIFF_LABEL = '差额合计';

/** 口径行左端的标签（与页头／其余件同一条写法）。 */
export const COMPARE_COLUMNS_CALIBER_LABEL = '口径';

/** 一项：两窗都有的那个项名 ＋ 两侧的**数**（不是串）。
 *  给数不给串，是因为条长按它算——条长与数字必须同源；显示串由本件按 `showNumber()` 出。 */
export interface CompareColumnsRow {
  /** 项名（「餐费」／「睡眠时长」）；中缝那一列，长了换行、不许 `…`。 */
  readonly label: string;
  /** 左窗口这一项的数值（**有限数、≥ 0**；单位由 `unit` 给一次）。 */
  readonly left: number;
  /** 右窗口这一项的数值（同上）。 */
  readonly right: number;
}

/** 双列对照入参。`leftLabel`／`rightLabel`／`rows` 必填——说不出「比的是哪两个窗口」的页不走本件。 */
export interface CompareColumnsInput {
  /** 左窗口名（「上月」／「之前 30 天」）。 */
  readonly leftLabel: string;
  /** 右窗口名（「本月」／「最近 30 天」）。 */
  readonly rightLabel: string;
  /** 逐项：**只列两窗都有的项**（交集归调用方算；本件不猜「另一边没有」该怎么写）。 */
  readonly rows: readonly CompareColumnsRow[];
  /** 单位（`元`／`次`／`卡`／`分钟`）；给了就每格与差额各跟一枚 `small`，不给就不出。 */
  readonly unit?: string;
  /** 差额的语气（闭集，缺省 `neutral`）。 */
  readonly sense?: CompareColumnsSense;
  /** 口径行：这两个窗口起止是什么、差额怎么算的（如「上月满月、本月未满月」）；不给＝不出这一行。 */
  readonly caliber?: string;
  /** 形态键（闭集，缺省 `back-to-back`）。 */
  readonly form?: CompareColumnsForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
