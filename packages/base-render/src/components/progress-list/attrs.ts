/** progress-list · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／状态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-11-加量池.mjs`，2026-09 用户裁定）
 *  里的**形态 A「四行清单」**：一页上三四个目标各自走到哪儿。每行给齐
 *  「目标名（＋状态字）／当前 / 目标（＋单位）／条／一句还差多少」。
 *
 *  与既有两件的分工：`metric-grid`（读数格）只列读数、不带目标；`scale-bar`（刻度条）只是一条条
 *  —— 本件是「目标名 ＋ 当前/目标 ＋ 条 ＋ 还差多少」**整行**，且一页可以有多行。
 *
 *  形态键写在 `PROGRESS_LIST_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `<前缀>block-progress-list-<槽名>`。 */
export const PROGRESS_LIST_CLASS = 'ilife-block-progress-list';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const PROGRESS_LIST_SLOTS = [
  /** 小标题（如「今天四个目标」）；不给＝不出这一行。 */
  'heading',
  /** 四行清单的容器。 */
  'list',
  /** 一行（一个目标）；带 `is-<状态>` 与 `data-ilife-progress-state` 两样状态标记。 */
  'row',
  /** 行首那一排：目标名 ＋ 状态字。 */
  'top',
  /** 目标名（非关键长名，允许换行）。 */
  'label',
  /** 状态字（**色之外的第二样**：未记录／进行中／已达标／已超）；调用方可用 `state` 覆盖成自己的话。 */
  'state',
  /** 当前 / 目标 那一排。 */
  'meta',
  /** 当前值（大字档，等宽数字）。 */
  'value',
  /** 目标值（`/ 1,800`，不加单位）。 */
  'goal',
  /** 单位（跟在目标值后，比值小一号）。 */
  'unit',
  /** 进度条轨（`role="progressbar"`；缺值时**不出** `aria-valuenow`）。 */
  'track',
  /** 进度条填充（宽度落内联 `style`，比例由本件算）。 */
  'fill',
  /** 「还差多少」那句（已达标写「刚好达标」，超了写「已超 …」，缺值不出这一行）。 */
  'remain',
  /** 口径行：这批目标怎么算的（弱文字，可很长、必须能换行）。 */
  'note',
] as const;
export type ProgressListSlot = (typeof PROGRESS_LIST_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `block-progress-list-` ＋ 槽名）。 */
export function progressListSlot(slot: ProgressListSlot, prefix = 'ilife-'): string {
  return prefix + 'block-progress-list-' + slot;
}

/** 形态闭集：本件只落地了形态 A「四行清单」。 */
export const PROGRESS_LIST_FORMS = ['rows'] as const;
export type ProgressListForm = (typeof PROGRESS_LIST_FORMS)[number];

/** 状态闭集（**机器键**）：每一行必落其中一档，`render` 只认闭集内的值。
 *  它是「色不是唯一信息」那条地板的落点：每档都自己带一句**状态字**（见 `PROGRESS_LIST_STATE_WORDS`）。 */
export const PROGRESS_LIST_STATES = ['blank', 'on-track', 'done', 'over'] as const;
export type ProgressListState = (typeof PROGRESS_LIST_STATES)[number];

/** 状态字（状态闭集 → 屏上那句话；唯一出处，判据从这里取，不抄字面量）。 */
export const PROGRESS_LIST_STATE_WORDS: Readonly<Record<ProgressListState, string>> = Object.freeze({
  blank: '未记录',
  'on-track': '进行中',
  done: '已达标',
  over: '已超',
});

/** 语气闭集（只改**视觉**档，不改语义）：`none` ＝ 不上语气色（走强调色）。 */
export const PROGRESS_LIST_TONES = ['none', 'ok', 'warn', 'danger'] as const;
export type ProgressListTone = (typeof PROGRESS_LIST_TONES)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const PROGRESS_LIST_MISSING = '—';

/** 「还差」那句的左端词：句子的形状住这里，`model.ts` 只按它拼。 */
export const PROGRESS_LIST_REMAIN_WORD = '还差';
/** 刚好走到目标的写法（与「已超」区分：一个是到点，一个是过点）。 */
export const PROGRESS_LIST_EXACT_WORD = '刚好达标';
/** 过目标时的左端词。 */
export const PROGRESS_LIST_OVER_WORD = '已超';

/** 一行（一个目标）。数字是**机器值**（要算比例），屏上的字由本件按 `formatNumber` 一律排出来。 */
export interface ProgressListRow {
  /** 目标名（如「热量」「饮水」）。**非空**；长了换行，不许 `…` 截断。 */
  readonly label: string;
  /** 当前值。`null` ＝ **未记录**（屏上写 `—`，条不出 `aria-valuenow`，与「0」区分）；空串不是缺值，是错。 */
  readonly current: number | null;
  /** 目标值。**有限数且 > 0**（分母为 0 算不出比例，一律 `badInput`）。 */
  readonly goal: number;
  /** 单位（`卡`／`毫升`／`分钟`／`千克`）：跟在目标值后，也接在「还差多少」那句尾上。 */
  readonly unit?: string;
  /** 当前值的显示字（千分位之类）；不给＝本件按机器值排（`1,189`）。 */
  readonly display?: string;
  /** 目标值的显示字；不给＝按机器值排。 */
  readonly goalDisplay?: string;
  /** 「还差多少」整句（如「还差 611 卡」）；不给＝本件按状态算。 */
  readonly remainText?: string;
  /** 状态字（覆盖闭集算出来的那句，如「落后 1 天」）；**给了它，`tone` 才有承担语义的第二样**。 */
  readonly state?: string;
  /** 语气档（只改条的色，不改语义）；不给＝按状态取缺省档。 */
  readonly tone?: ProgressListTone;
}

/** 四行清单的入参。`rows` 必填——没有行的「进度清单」是空容器。 */
export interface ProgressListInput {
  /** 目标行（一页通常三到四条）。空数组 ⇒ 只出 `emptyLine`（给了的话）。 */
  readonly rows: readonly ProgressListRow[];
  /** 小标题（如「今天四个目标」）。 */
  readonly heading?: string;
  /** 口径行：这批目标怎么算的。串＝一句话；数组＝分段。 */
  readonly note?: string | readonly string[];
  /** 一行都没有时出的人话（「这个账本还没定目标」）；不给＝一个字都不出。 */
  readonly emptyLine?: string;
  /** 形态键（闭集，缺省 `rows`）。 */
  readonly form?: ProgressListForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
