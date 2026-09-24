/** range-bar · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-05-时间与分组.mjs`）里的
 *  **形态 A「四类泳道（每类一行）＋行尾合计＋整点刻度」**：一条轴上摆起止区间，**长度就是「多久」**。
 *
 *  它替掉的三种错法：
 *   · 只写开始时间（`09:30 开始工作`）——读不出"多长"；
 *   · 用柱子画单点（9 点一根柱）——柱子没有长度，长短差被画成高度差；
 *   · 把区间写成一句「上午工作、下午运动」——两段的起止与时长都得读者自己算。
 *
 *  形态键写在 `RANGE_BAR_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `RANGE_BAR_CLASS + '-' + 槽名`。 */
export const RANGE_BAR_CLASS = 'ilife-block-range-bar';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const RANGE_BAR_SLOTS = [
  /** 头部那一排：标题 ＋ 用途 ＋ 合计（窄档自己折行）。 */
  'hd',
  /** 标题（如「5 月 14 日 周四」／「5 月区间」）。 */
  'title',
  /** 用途说明（如「作息管家 · 一天里的区间」）。 */
  'use',
  /** 头部右端的合计位。 */
  'sum',
  /** 合计位的标签。 */
  'sum-label',
  /** 合计位的值（已经是给人看的样子）。 */
  'sum-value',
  /** 轴刻度那一排（与泳道共用同一张网格 ⇒ 刻度永远对得上轨道两端）。 */
  'ax',
  /** 轴刻度的五个位置（两端与中间三点）。 */
  'ax-ticks',
  /** 泳道与轴刻度共用的那张网格（`display:contents` 的泳道直接落进它的三条轨道）。 */
  'lanes',
  /** 一条泳道（＝一个类别一行）。 */
  'lane',
  /** 泳道左端的类别名。 */
  'key',
  /** 类别名前那枚记号（纯装饰，`aria-hidden`；它是"不只靠颜色"的第二路）。 */
  'mark',
  /** 泳道右端的合计（这一类的总时长／总天数）。 */
  'total',
  /** 轨道（区间的坐标系，两端各一条发丝线）。 */
  'rail',
  /** 一个区间（在轨道上的位置与长度就是它的起止与时长）。 */
  'iv',
  /** 区间里那枚时长字（**只在区间够宽时才上屏**；时长永远另有行尾合计兜底）。 */
  'iv-text',
  /** 脚注（弱文字，可很长、必须能换行）。 */
  'note',
] as const;
export type RangeBarSlot = (typeof RANGE_BAR_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RANGE_BAR_CLASS + '-' + …`）。 */
export function rangeBarSlot(slot: RangeBarSlot, prefix = 'ilife-'): string {
  return prefix + 'block-range-bar-' + slot;
}

/** 形态闭集：本件只落地了形态 A「四类泳道＋行尾合计＋整点刻度」。 */
export const RANGE_BAR_FORMS = ['lanes'] as const;
export type RangeBarForm = (typeof RANGE_BAR_FORMS)[number];

/** 深浅档闭集（1 最浅、4 最深）：区间是**非文本**色块，用强调色的四档。 */
export const RANGE_BAR_TONES = [1, 2, 3, 4] as const;
export type RangeBarTone = (typeof RANGE_BAR_TONES)[number];

/** 区间的缺省深浅档（1／2 是最常用的两档：一类一行时相邻两类不撞色）。 */
export const RANGE_BAR_DEFAULT_TONE: RangeBarTone = 2;

/** **段内时长字上屏的最小占比**：区间窄于轴全长的这个比例时，段里不写时长字
 *  （写了会挤成一团、或溢出被裁），时长仍由行尾合计给出——语义一个字都不丢。 */
export const RANGE_BAR_TEXT_MIN_FRACTION = 0.22;

/** 窄容器阈值（px）：左右两栏（类别名／合计）收一档，好让轨道在 390 档仍有足够长度。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
export const RANGE_BAR_NARROW_PX = 460;

/** 段内时长字的**下线宽度**（px）：容器窄过它，时长字一律不上屏（轨道太短，放不下就必然压字）。 */
export const RANGE_BAR_TEXT_HIDE_BELOW_PX = 320;

/** 一个区间（轴上的起止，单位由调用方定：作息＝分钟）。 */
export interface RangeBarIntervalInput {
  /** 起点（闭区间）。 */
  readonly from: number;
  /** 终点（开区间；必须大于起点）。 */
  readonly to: number;
  /** 段里的时长字（如 `7h20m`）；**只在段占到轴长 `RANGE_BAR_TEXT_MIN_FRACTION` 以上时才上屏**。 */
  readonly text?: string;
  /** 深浅档（1..4，缺省 2）。 */
  readonly tone?: RangeBarTone;
}

/** 一条泳道（一个类别一行）。 */
export interface RangeBarLaneInput {
  /** 类别名（如「睡眠」）。 */
  readonly label: string;
  /** 类别名前那枚记号（如 `●`；纯装饰，是"不只靠颜色"的第二路）。 */
  readonly mark?: string;
  /** 这一类的区间（**跨午夜／跨月请调用方拆成两段**：本件不做跨界推断）。 */
  readonly intervals: readonly RangeBarIntervalInput[];
  /** 行尾合计（如 `7h30m`／`15 天`）；不给＝不出。 */
  readonly total?: string;
}

/** 轴的范围（区间都落在这个区间内）。 */
export interface RangeBarDomain {
  /** 起点（如一天的第 0 分钟、某月 1 日）。 */
  readonly min: number;
  /** 终点（如一天的第 1440 分钟、某月最后一日）。 */
  readonly max: number;
}

/** 头部右端的合计位。 */
export interface RangeBarSummary {
  /** 标签（如「非空闲」）。 */
  readonly label: string;
  /** 值（如 `16h00m`）。 */
  readonly value: string;
}

/** 区间条入参。`title`／`domain`／`lanes` 必填——**没有轴与泳道就不走本件**（本件只有形态 A 一种骨架）。 */
export interface RangeBarInput {
  /** 标题（如「5 月 14 日 周四」）；**不许 `…` 截断**，长了就换行。 */
  readonly title: string;
  /** 轴的范围（区间必须落在它里面，出界一律 `badInput`——本件不做出界裁剪）。 */
  readonly domain: RangeBarDomain;
  /** 泳道（0 条＝空串；顺序＝阅读顺序）。 */
  readonly lanes: readonly RangeBarLaneInput[];
  /** 用途说明（如「作息管家 · 一天里的区间」）；不给＝不出。 */
  readonly use?: string;
  /** 轴刻度（如 `['0','6','12','18','24']`／`['5/1','5/8','5/31']`）：**写法归调用方**，本件不猜时间与日期的格式；
   *  不给＝不出刻度（泳道照旧）。 */
  readonly axis?: readonly string[];
  /** 头部右端的合计位；不给＝不出。 */
  readonly summary?: RangeBarSummary;
  /** 脚注（如「手柄是静态样张」那句口径）；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `lanes`）。 */
  readonly form?: RangeBarForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
