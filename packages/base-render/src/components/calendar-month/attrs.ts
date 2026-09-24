/** calendar-month · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-05-时间与分组.mjs`，2026-09 用户裁定）
 *  里的**形态 A「格内数字＋小计＋底部水量条（带星期表头）」**：一格一天、七列一周，
 *  格里的深浅与底部那条小柱一起表示**当天的量**；今天靠「墨圈 ＋ 今字」认出来。
 *
 *  它替掉的三种错法：
 *   · 把一个月的读数写成 31 行文字 —— 读者要的是"哪几天多、哪几天少"，句子给不出分布；
 *   · 只标"哪天有记录"不给量 —— 空/满两态读不出量差（那是 `punch-strip` 的活）；
 *   · 拿折线画 30~31 个日级读数 —— 格宽被点挤爆，窄档成一条毛刺。
 *
 *  形态键写在 `CALENDAR_MONTH_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `CALENDAR_MONTH_CLASS + '-' + 槽名`。 */
export const CALENDAR_MONTH_CLASS = 'ilife-block-calendar-month';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const CALENDAR_MONTH_SLOTS = [
  /** 头部那一排：标题 ＋ 用途 ＋ 合计（窄档自己折行）。 */
  'hd',
  /** 月份标题（如「2026 年 5 月」）。 */
  'title',
  /** 用途说明（如「记账 · 每日支出」）。 */
  'use',
  /** 头部右端的合计位。 */
  'sum',
  /** 合计位的标签（如「本月合计」）。 */
  'sum-label',
  /** 合计位的值（已经是给人看的样子）。 */
  'sum-value',
  /** 星期表头那一排（七格）。 */
  'wk',
  /** 星期表头的一格。 */
  'wd',
  /** 月历格盘（七列）。 */
  'grid',
  /** 一格一天。 */
  'c',
  /** 格里的日期字。 */
  'd',
  /** 今天那一枚「今」字（与墨圈一起，保证不只靠颜色认今天）。 */
  'today-mark',
  /** 格里的当天读数（缺值写 `—`）。 */
  'v',
  /** 底部那条小柱（量的深浅与高度一起变）。 */
  'bar',
  /** 小柱的填充段（纯装饰，`aria-hidden`）。 */
  'bar-fill',
  /** 月首月尾的空位（有格无日）。 */
  'blank',
  /** 深浅图例那一排。 */
  'lg',
  /** 图例里的色块。 */
  'sw',
  /** 脚注（弱文字，可很长、必须能换行）。 */
  'note',
] as const;
export type CalendarMonthSlot = (typeof CALENDAR_MONTH_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `CALENDAR_MONTH_CLASS + '-' + …`）。 */
export function calendarMonthSlot(slot: CalendarMonthSlot, prefix = 'ilife-'): string {
  return prefix + 'block-calendar-month-' + slot;
}

/** 形态闭集：本件只落地了形态 A「格内数字＋小计＋底部水量条（带星期表头）」。 */
export const CALENDAR_MONTH_FORMS = ['grid'] as const;
export type CalendarMonthForm = (typeof CALENDAR_MONTH_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const CALENDAR_MONTH_MISSING = '\u2014';

/** 今天那一格上的「今」字（今天是**形＋字**两路可认，色不是唯一信息）。 */
export const CALENDAR_MONTH_TODAY_MARK = '今';

/** 一周七格。 */
export const CALENDAR_MONTH_WEEK_LENGTH = 7;

/** 一个月最多六行（6 × 7 ＝ 42 格；再多就不是一个月了）。 */
export const CALENDAR_MONTH_MAX_WEEKS = 6;

/** 缺省星期表头（周一起首列，与原型一致）。 */
export const CALENDAR_MONTH_WEEKDAYS: readonly string[] = ['一', '二', '三', '四', '五', '六', '日'];

/** 深浅档闭集：0＝没有量（空档），4＝最多。5 档是"格内还能读出字"的上限。 */
export const CALENDAR_MONTH_LEVELS = [0, 1, 2, 3, 4] as const;
export type CalendarMonthLevel = (typeof CALENDAR_MONTH_LEVELS)[number];

/** 一格一天。 */
export interface CalendarMonthDayInput {
  /** 格里的日期字（如 `14`；「今天」二字带不带由调用方定）。 */
  readonly day: string;
  /** 那天的读数（**已是给人看的样子**：取整、千分位、单位归调用方）；**必填**，`null` ＝ 缺值（写 `—`）。 */
  readonly value: string | null;
  /** 深浅档（0..4，缺省 `0`）；`value` 为 `null` 时一律按 `0` 处理（没有量就没有深浅）。 */
  readonly level?: CalendarMonthLevel;
  /** 今天那一格：套墨圈 ＋ 写「今」字；一个月至多一格。 */
  readonly today?: boolean;
}

/** 头部右端的合计位。 */
export interface CalendarMonthSummary {
  /** 标签（如「本月合计」）。 */
  readonly label: string;
  /** 值（如 `¥12,345`）。 */
  readonly value: string;
}

/** 深浅图例的一条。 */
export interface CalendarMonthLegendItem {
  /** 色块对应的档（0..4）。 */
  readonly level: CalendarMonthLevel;
  /** 色块的说明（如「≤¥100」）。 */
  readonly label: string;
}

/** 月历格入参。`title` 与 `cells` 必填——**没有格盘就不走本件**（本件只有形态 A 一种骨架）。 */
export interface CalendarMonthInput {
  /** 月份标题（如「2026 年 5 月」）；**不许 `…` 截断**，长了就换行。 */
  readonly title: string;
  /** 逐格（**按行排满**：长度必须是 7 的倍数，最多 6 行）；`null` ＝ 月首月尾的空位。 */
  readonly cells: readonly (CalendarMonthDayInput | null)[];
  /** 用途说明（如「记账 · 每日支出」）；不给＝不出。 */
  readonly use?: string;
  /** 星期表头（七枚）；不给＝周一至周日。 */
  readonly weekdays?: readonly string[];
  /** 头部右端的合计位；不给＝不出。 */
  readonly summary?: CalendarMonthSummary;
  /** 深浅图例（0..5 条）；不给＝不出。 */
  readonly legend?: readonly CalendarMonthLegendItem[];
  /** 脚注（如「今天 14 日 · 3 笔 · ¥92」）；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `grid`）。 */
  readonly form?: CalendarMonthForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
