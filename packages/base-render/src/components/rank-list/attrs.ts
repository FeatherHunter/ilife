/** rank-list · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／枚举闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-03-对照与榜单.mjs`，2026-09 用户裁定）
 *  里的**形态 A「领奖台」**：前三名各占一张卡（第 1 名在中间、大一号），其余名次逐行排在下面；
 *  **每一行都给条**（条比长度、数字读准值、占比读精确份额）。
 *
 *  它替掉的错法：只给名次与数值（读者读不出差多少）；只给条不给数（读者读不出准值）；
 *  榜首与第 20 名同形同字号（读者一眼看不出谁在榜首）。
 *
 *  形态键写在 `RANK_LIST_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `RANK_LIST_CLASS + '-' + 槽名`。 */
export const RANK_LIST_CLASS = 'ilife-block-rank-list';

/** 槽位闭集（`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const RANK_LIST_SLOTS = [
  /** 领奖台那一区（前三名并排的三张卡）。 */
  'podium',
  /** 领奖台上的一张卡（名次／名称／值＋单位／占比／条）。 */
  'card',
  /** 名次（领奖台档写「第 N 名」，其余行写序号）。**放行首**：扫读榜单先看名次。 */
  'rank',
  /** 名称（榜单的主角：条与值都从它派生）。 */
  'name',
  /** 名称下的副语（「早餐 · 1 个」／「3 次 · 晚餐为主」）；不给＝不出这一行。 */
  'note',
  /** 值的单位（`元`／`次`／`卡`）：小一号跟在数字后。 */
  'unit',
  /** 这一名的读数（含单位）。 */
  'value',
  /** 占比（`31.7%`）：份额的精确读法，口径归调用方。 */
  'share',
  /** 第 4 名及以后的那一组行。 */
  'list',
  /** 第 4 名及以后的一行。 */
  'row',
  /** 行里「名称 ＋ 条」合成的那一格（**条在名称下面另起一行**：窄档也不挤名字）。 */
  'mid',
  /** 条的外框（全榜共用一条刻度：长度＝这一名的值 ÷ 榜首的值）。 */
  'bar',
  /** 条的填充。 */
  'fill',
  /** 口径行：这条榜单的数怎么算的、占比按什么合计（弱文字，可很长、必须能换行）。 */
  'caliber',
] as const;
export type RankListSlot = (typeof RANK_LIST_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RANK_LIST_CLASS + '-' + …`）。 */
export function rankListSlot(slot: RankListSlot, prefix = 'ilife-'): string {
  return prefix + 'block-rank-list-' + slot;
}

/** 形态闭集：本件只落地了形态 A「领奖台」。 */
export const RANK_LIST_FORMS = ['podium'] as const;
export type RankListForm = (typeof RANK_LIST_FORMS)[number];

/** 领奖台的位数：前三名进卡，第 4 名起进逐行区。**改这个数就是改形态**，故住标记契约。 */
export const RANK_LIST_PODIUM_SIZE = 3;

/** 领奖台上某一张卡的位次类名（**唯一拼法**）。件内的状态名一律带件内语义前缀（`is-place-`），
 *  **不许用 `is-first`／`is-second` 这类泛名**：泛名会与别的件标记里的同名状态撞上——
 *  皮肤矩阵的「跨件零交集」按「一件的样式段不许提到另一件标记里的类名」守这一条。 */
export function rankListPlaceClass(rank: number): string {
  return 'is-place-' + String(rank);
}

/** 口径行左端的标签（与页头／其余件同一条写法）。 */
export const RANK_LIST_CALIBER_LABEL = '口径';

/** 一名：名称 ＋ 值 ＋ 占比（值给数不给串：条长与数字必须同源）。 */
export interface RankListRow {
  /** 名称（「超市买菜」／「鸡蛋灌饼」）；长了换行、不许 `…`。 */
  readonly name: string;
  /** 名称下的副语（「早餐 · 1 个」）；不给＝不出。 */
  readonly note?: string;
  /** 这一名的值（**有限数、≥ 0**）：条长与数字都按它算。 */
  readonly value: number;
  /** 占比（0–100 的有限数）：**口径归调用方**——窗内合计可能大于本表之和（例如末尾是「其他 N 笔」聚合行）。 */
  readonly share: number;
}

/** 榜单入参。`rows` 必填且**按名次排好**（第 1 项＝第 1 名）：排名归调用方，本件不排序。 */
export interface RankListInput {
  /** 逐名：第 1 项是第 1 名。`[]` ⇒ 空串。 */
  readonly rows: readonly RankListRow[];
  /** 单位（`元`／`次`／`卡`）：给了就每格跟一枚 `small`，不给就不出。 */
  readonly unit?: string;
  /** 口径行：数怎么算的、占比按什么合计（如「占比按窗内 530.50 元合计」）；不给＝不出这一行。 */
  readonly caliber?: string;
  /** 形态键（闭集，缺省 `podium`）。 */
  readonly form?: RankListForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
