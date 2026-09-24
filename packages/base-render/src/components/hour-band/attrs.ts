/** hour-band · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-05-时间与分组.mjs`）里的
 *  **形态 A「单带＋整点刻度尺（0–23）＋下方明细行」**：一天 24 小时摊成**一条带**，
 *  哪几段在做什么、每段多长一眼看得出；下面逐段列明细行。
 *
 *  它替掉的三种错法：
 *   · 用一句摘要说"今天很忙"——读不出哪几段忙、忙了多久；
 *   · 把一天写成 24 行"每小时记了多少分钟"——那是**复盘**的形状（住 `packages/skill-schedule` 的本地件
 *     `renderHourBand`），不是"一段时间在做什么"的概览；
 *   · 只画带的形状不给起止——带上的段读得出长度，读不出"从几点到几点"（明细行补这一半）。
 *
 *  **与 `packages/skill-schedule/src/shared/pageParts.ts` 的本地件 `renderHourBand` 的关系**（要写清的 `dup`）：
 *  那个本地件画的是 **24 根柱子**（柱高＝该小时已记录的分钟数、柱色＝该小时主键、空数组出空串），
 *  问的是"每小时记了多少"；本件画的是 **一条带上的若干区间**，问的是"几段时间在做什么"。
 *  两者概念相邻、结构不同（柱 vs 带），且那个件**不在公共层**（住在技能包里）——
 *  本件落地**不替代**它：复盘柱状图仍归技能包自己的形状，概览带收上来当公共件。
 *
 *  形态键写在 `HOUR_BAND_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `HOUR_BAND_CLASS + '-' + 槽名`。 */
export const HOUR_BAND_CLASS = 'ilife-block-hour-band';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const HOUR_BAND_SLOTS = [
  /** 头部那一排：标题 ＋ 用途 ＋ 合计（窄档自己折行）。 */
  'hd',
  /** 标题（如「5 月 14 日 周四」）。 */
  'title',
  /** 用途说明（如「作息管家 · 全天概览」）。 */
  'use',
  /** 头部右端的合计位。 */
  'sum',
  /** 合计位的标签（如「已记录」）。 */
  'sum-label',
  /** 合计位的值（已经是给人看的样子）。 */
  'sum-value',
  /** 那条 24 小时的带（纯形状，`aria-hidden`：语义在明细行里）。 */
  'band',
  /** 带上的一个时段（位置与长度就是它的起止与时长）。 */
  'sg',
  /** 时段里那枚时长字（**只在段够宽时才上屏**；时长永远另有明细行的读数兜底）。 */
  'sg-text',
  /** 整点刻度尺（24 格，`aria-hidden`：轴线不是读数）。 */
  'ruler',
  /** 刻度尺上的一格（0..23；窄档只留偶数点）。 */
  'ruler-hour',
  /** 深浅图例那一排（时段色 ↔ 类别名）。 */
  'lgs',
  /** 图例里的色块。 */
  'sw',
  /** 明细行区（逐段一行：起止／名称／时长／补充读数）。 */
  'rows',
  /** 一条明细行。 */
  'r',
  /** 起止时间（`HH:MM – HH:MM`；未记录那一行写 `—`）。 */
  't',
  /** 这一段在做什么。 */
  'n',
  /** 时长（**读得出"多久"**）。 */
  'v',
  /** 补充读数（如 `320 kcal`）；不给＝不出。 */
  'meta',
  /** 脚注（弱文字，可很长、必须能换行）。 */
  'note',
] as const;
export type HourBandSlot = (typeof HOUR_BAND_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `HOUR_BAND_CLASS + '-' + …`）。 */
export function hourBandSlot(slot: HourBandSlot, prefix = 'ilife-'): string {
  return prefix + 'block-hour-band-' + slot;
}

/** 形态闭集：本件只落地了形态 A「单带＋整点刻度尺＋下方明细行」。 */
export const HOUR_BAND_FORMS = ['band'] as const;
export type HourBandForm = (typeof HOUR_BAND_FORMS)[number];

/** 深浅档闭集（1 最浅、4 最深）：时段是**非文本**色块，用强调色的四档。 */
export const HOUR_BAND_TONES = [1, 2, 3, 4] as const;
export type HourBandTone = (typeof HOUR_BAND_TONES)[number];

/** 时段的缺省深浅档。 */
export const HOUR_BAND_DEFAULT_TONE: HourBandTone = 2;

/** 一天有多少分钟：**本件的轴长**（时刻一律用"当天第几分钟"当机器值）。 */
export const HOUR_BAND_MINUTES_PER_DAY = 1440;

/** 刻度尺上有几个整点（0..23）。 */
export const HOUR_BAND_HOURS = 24;

/** **段内时长字上屏的最小占比**：段窄于轴全长的这个比例时，带上不写时长字
 *  （写了必然挤成一团或被裁），时长仍由明细行的读数给出——语义一个字都不丢。 */
export const HOUR_BAND_TEXT_MIN_FRACTION = 0.2;

/** 窄容器阈值（px）：整点刻度尺只留偶数点（每 2 小时一格）。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
export const HOUR_BAND_RULER_NARROW_PX = 700;

/** 未记录那一行的写法：`— ／ 其余时间未记录 ／ 时长`（缺值一律 `—`）。 */
export const HOUR_BAND_UNRECORDED_LABEL = '其余时间未记录';
export const HOUR_BAND_MISSING = '\u2014';

/** 一段时间在做什么（时刻＝当天第几分钟，0..1440）。 */
export interface HourBandIntervalInput {
  /** 起点（当天第几分钟，闭区间）。 */
  readonly from: number;
  /** 终点（当天第几分钟；必须大于起点）。 */
  readonly to: number;
  /** 这一段在做什么（如「工作 · 上午」）。 */
  readonly label: string;
  /** 深浅档（1..4，缺省 2）。 */
  readonly tone?: HourBandTone;
  /** 行末的补充读数（如 `320 kcal`）；不给＝不出。 */
  readonly meta?: string;
}

/** 图例的一条（时段色 ↔ 类别名）。 */
export interface HourBandLegendItem {
  /** 色块对应的档（1..4）。 */
  readonly tone: HourBandTone;
  /** 色块的说明（如「工作」）。 */
  readonly label: string;
}

/** 头部右端的合计位。 */
export interface HourBandSummary {
  /** 标签（如「已记录」）。 */
  readonly label: string;
  /** 值（如 `19h40m`）。 */
  readonly value: string;
}

/** 时段带入参。`title` 与 `intervals` 必填——**没有时段就不走本件**（本件只有形态 A 一种骨架）。 */
export interface HourBandInput {
  /** 标题（如「5 月 14 日 周四」）；**不许 `…` 截断**，长了就换行。 */
  readonly title: string;
  /** 时段（顺序＝阅读顺序；**跨午夜请调用方拆成两段**：本件不做跨界推断）。0 条＝空串。 */
  readonly intervals: readonly HourBandIntervalInput[];
  /** 用途说明（如「作息管家 · 全天概览」）；不给＝不出。 */
  readonly use?: string;
  /** 头部右端的合计位；不给＝不出。 */
  readonly summary?: HourBandSummary;
  /** 深浅图例（0 条＝不出）。 */
  readonly legend?: readonly HourBandLegendItem[];
  /** 脚注；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `band`）。 */
  readonly form?: HourBandForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
