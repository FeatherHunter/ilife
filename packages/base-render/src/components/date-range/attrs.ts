/** date-range · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-08-表与输入.mjs`，2026-09 用户裁定）里的
 *  **形态 B「日历缩略」**——一个月的格子铺在页上，**两枚端点用实心底标出、中间那段浅底**，
 *  底下写清「已选哪一段、几天」；再加上**起止两格**（键盘／精确输入）与**一排快捷档**
 *  （按下哪一档，那一档带 ✓、实心反白，并且口径句里点名说「当前按 本周」）。
 *  它替掉的是「快档点了没反应、不知道现在算的是哪一段」。
 *
 *  形态键写在 `DATE_RANGE_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」：日后加第二形态是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `dateRangeSlot(槽名)` 拼出来的。 */
export const DATE_RANGE_CLASS = 'ilife-block-date-range';

/** 形态闭集：本件只落地形态 B「日历缩略」。 */
export const DATE_RANGE_FORMS = ['calendar'] as const;
export type DateRangeForm = (typeof DATE_RANGE_FORMS)[number];

/** 槽位闭集。 */
export const DATE_RANGE_SLOTS = [
  /** 第一行：名字（左）＋ 状态字（右）。 */
  'head',
  /** 这一条在选哪一段的名字（`看哪一段`）。 */
  'label',
  /** 状态字（`当前按 本周`／`自定义区间`／`未选`／`更新中`）——**字**这一档的落点。 */
  'state',
  /** 起止两格那一排（精确输入；键盘用户走这里）。 */
  'ends',
  /** 起点那一格（标签 ＋ `input[type=date]`）。 */
  'from',
  /** 终点那一格。 */
  'to',
  /** 起点／终点的名字（`从`／`到`）。 */
  'endLabel',
  /** 起止两格里的那个 `input[type=date]`（触区 ≥44 高）。 */
  'input',
  /** 快捷档那一排。 */
  'quick',
  /** 一枚快捷档；按下的那一枚带 ✓ 与实心反白（**形 ＋ 字 ＋ 色三样**）。 */
  'preset',
  /** 快捷档左端那枚 ✓（未按下的档里也有，但由样式藏起来——运行时段只管翻 `aria-pressed`）。 */
  'mark',
  /** 快捷档的文字。 */
  'word',
  /** 日历缩略那一块。 */
  'calendar',
  /** 日历的头：上一月／下一月 ＋ 月份。 */
  'calHead',
  /** 翻月键（触区 ≥44×44）。 */
  'nav',
  /** 月份（`2026 年 9 月`）。 */
  'month',
  /** 星期表头（一 … 日）。 */
  'week',
  /** 日格那一块（6 行 × 7 列）。 */
  'days',
  /** 一格天（按钮；两端 `is-end`、区间内 `is-in`、非本月的相邻天 `is-adj`、今天 `is-today`）。 */
  'day',
  /** 一句口径：`本周：09-19 到 09-25，共 7 天（含首尾）`。 */
  'caliber',
  /** 口径句本体（运行时段重写它）。 */
  'sentence',
  /** 调用方补的那句口径（可选，原样挂在后头）。 */
  'extra',
  /** 错误说明（写在控件旁边；控件 `aria-describedby` 指向它）。 */
  'error',
] as const;
export type DateRangeSlot = (typeof DATE_RANGE_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function dateRangeSlot(slot: DateRangeSlot, prefix = 'ilife-'): string {
  return prefix + 'block-date-range-' + slot;
}

/** 机器键属性：值＝`DateRangeInput.name`。**运行时的发现锚**。 */
export const DATE_RANGE_NAME_ATTR = 'data-ilife-range';
/** 起点／终点（`YYYY-MM-DD`；未选时属性缺席）。 */
export const DATE_RANGE_FROM_ATTR = 'data-ilife-range-from';
export const DATE_RANGE_TO_ATTR = 'data-ilife-range-to';
/** 这一段共几天（含首尾；未选时写 `0`）。 */
export const DATE_RANGE_DAYS_ATTR = 'data-ilife-range-days';
/** 当前按的是哪一档（快捷档的 `key`；不在任何一档上时写 `custom`，未选写 `none`）。 */
export const DATE_RANGE_PRESET_ATTR = 'data-ilife-range-preset';
/** 日历正显示哪个月（`YYYY-MM`，挂在件根上）。 */
export const DATE_RANGE_MONTH_ATTR = 'data-ilife-range-month';
/** 月份那一枚文本的锚（运行时段翻月时重写它；与件根上的"锚月"不是一回事，故两个名字）。 */
export const DATE_RANGE_MONTH_LABEL_ATTR = 'data-ilife-range-month-label';
/** 状态字（`当前按 本周`…）那一枚的锚（运行时段重写它）。 */
export const DATE_RANGE_STATE_ATTR = 'data-ilife-range-state';
/** 今天（`YYYY-MM-DD`；判据与运行时段都用它，不从机器时钟取——渲染必须是纯函数）。 */
export const DATE_RANGE_TODAY_ATTR = 'data-ilife-range-today';
/** 人类可读字段名（`aria-label` 与事件 `detail.label`）。 */
export const DATE_RANGE_LABEL_ATTR = 'data-ilife-range-label';
/** 禁用／更新中标记。 */
export const DATE_RANGE_DISABLED_ATTR = 'data-ilife-range-disabled';
export const DATE_RANGE_LOADING_ATTR = 'data-ilife-range-loading';
/** 动作标记（`preset`｜`day`｜`prev`｜`next`）。 */
export const DATE_RANGE_ACT_ATTR = 'data-ilife-range-act';
/** 一枚快捷档带的键与两端（点是点它＝把这一段填进起止两格）。 */
export const DATE_RANGE_KEY_ATTR = 'data-ilife-range-key';
export const DATE_RANGE_PRESET_FROM_ATTR = 'data-ilife-range-preset-from';
export const DATE_RANGE_PRESET_TO_ATTR = 'data-ilife-range-preset-to';
/** 一格天带的日期（`YYYY-MM-DD`）。 */
export const DATE_RANGE_DAY_ATTR = 'data-ilife-range-day';
/** 起止两格分别是哪一端（`from`／`to`）。 */
export const DATE_RANGE_END_ATTR = 'data-ilife-range-end';
/** 口径句的锚（运行时段重写这一枚的文本）。 */
export const DATE_RANGE_SENTENCE_ATTR = 'data-ilife-range-sentence';
/** 日历那一块的锚（运行时段按它重铺日格）。 */
export const DATE_RANGE_DAYS_ATTR_ANCHOR = 'data-ilife-range-days-anchor';
/** 命中区标记（**每一枚都 ≥44×44**）。 */
export const DATE_RANGE_HIT_ATTR = 'data-ilife-range-hit';
/** 绑定完成标记（运行时幂等）。 */
export const DATE_RANGE_BOUND_ATTR = 'data-ilife-range-bound';

/** 动作闭集。 */
export const DATE_RANGE_ACTIONS = ['preset', 'day', 'prev', 'next'] as const;
export type DateRangeAction = (typeof DATE_RANGE_ACTIONS)[number];

/** 变更事件名（冒泡 `CustomEvent`，`detail = { name, label, from, to, days, preset }`）。
 *  **翻月不派发**（换的只是"看哪个月"，没有换窗口）；`preset` 是当前命中的快捷档 key，自定义时为 `custom`。 */
export const DATE_RANGE_EVENT_CHANGE = 'ilife:range-change';

/** 触控目标（px）：翻月键、快捷档、每一格天、起止两格都不小于它。
 *  判据量的是**有效命中区**（±26px 格点扫描、逐点归属回同一控件的包围盒），不是元素盒。 */
export const DATE_RANGE_TOUCH_PX = 44;
/** 相邻**独立控件**之间的最小间距（px）：翻月键之间、快捷档之间、起止两格之间。
 *  日历格之间不走它——那一条是 `0`（**矩阵缝并进格子**）：7 列 × 44px 已是硬约束，缝留在格子之间
 *  会把每格的有效命中区再削一份（320 档实测只剩 34–36px）。见 `style-calendar.ts`。 */
export const DATE_RANGE_GAP_PX = 8;
/** 块体左右内距（px）：**唯一出处**。块体的内距（`style.ts`）与窄档满幅的外扩量（`style-calendar.ts`）
 *  取同一个值——写两份就会走散，走散后日历吃不满内距，窄档的格子又掉回 44 以下。 */
export const DATE_RANGE_BOX_PAD_X_PX = 14;
/** 窄档满幅（full-bleed）阈值（px，**本件自己的内宽**）：容器内宽到这一档以下时，日历一栏吃满块体的
 *  左右内距、自己左右内距归零，好让 7 列 × 44px 在 320 档成立。 */
export const DATE_RANGE_FULL_BLEED_MAX_PX = 340;

/** 未选时的写法：**缺值写成 `—`**（与「今天」区分）。 */
export const DATE_RANGE_MISSING = '—';
/** 未选那一段的口径句里的说法。 */
export const DATE_RANGE_UNSET = '还未选';
/** 不在任何一档上时的说法（按的是自己填的两端）。 */
export const DATE_RANGE_CUSTOM = '自定义区间';
/** 更新中。 */
export const DATE_RANGE_LOADING = '更新中';
/** 起点／终点两格的名字。 */
export const DATE_RANGE_FROM_LABEL = '从';
export const DATE_RANGE_TO_LABEL = '到';
/** 日历里「今天」那一格的读屏名后缀与星期表头。 */
export const DATE_RANGE_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;
/** 一句口径里的固定说法。 */
export const DATE_RANGE_DAYS_SUFFIX = '（含首尾）';
export const DATE_RANGE_PRESET_PREFIX = '当前按 ';
/** 一屏日历恒铺 6 行 × 7 列（整月 ＋ 两端补齐），**固定 42 格**：换月不跳版。 */
export const DATE_RANGE_CELLS = 42;
export const DATE_RANGE_COLUMNS = 7;

/** 一枚快捷档：`key` 是机器键（事件 `detail.preset` 用它），`label` 上屏，`from`／`to` 是它代表的那一段。 */
export interface DateRangePreset {
  /** 机器键（同一件里唯一）。 */
  readonly key: string;
  /** 上屏的文字（`本周`／`近 7 天`）。 */
  readonly label: string;
  /** 这一段从哪天起（`YYYY-MM-DD`，真实存在的日期）。 */
  readonly from: string;
  /** 到哪天止（含；必须 ≥ `from`）。 */
  readonly to: string;
}

/** 日期范围入参。`name` 必填；两端各自可以缺席（＝未选，写成 `—`）。 */
export interface DateRangeInput {
  /** 机器键（变更事件与载荷按它定位）。非空字符串。 */
  readonly name: string;
  /** 起点（`YYYY-MM-DD`）；`null`／不给 ＝ 未选。 */
  readonly from?: string | null;
  /** 终点（`YYYY-MM-DD`，含这一天）；`null`／不给 ＝ 未选。两端都给时必须 `from ≤ to`。 */
  readonly to?: string | null;
  /** 这一段的名字（`看哪一段`），进 `aria-label` 与事件 `detail.label`。 */
  readonly label?: string;
  /** 快捷档（`本周`／`本月`／`近 7 天`…）：**按的是哪一档要看得出来**——命中的那一枚带 ✓、实心反白，
   *  并且口径句里点名（`当前按 本周`）。 */
  readonly presets?: readonly DateRangePreset[];
  /** 日历正显示哪个月（`YYYY-MM` 或 `YYYY-MM-DD`，取所在月）；缺省＝起点所在月，再缺省＝今天所在月。 */
  readonly month?: string;
  /** 今天（`YYYY-MM-DD`）：**由调用方给**（渲染是纯函数，不从机器时钟取）；缺省＝不标"今天"那一格。 */
  readonly today?: string;
  /** 补的一句口径（可选，挂在组件自己那句后面）。 */
  readonly caliber?: string;
  /** 错误说明：写在控件旁边，控件 `aria-describedby` 指向它（**不只染色**）。 */
  readonly error?: string;
  /** 禁用；`disabledReason` 写清**为什么**不能改。 */
  readonly disabled?: boolean;
  /** 禁用原因（禁用时必填）。 */
  readonly disabledReason?: string;
  /** 更新中：状态字换成「更新中」，起止两格与日格期间不接输入。 */
  readonly loading?: boolean;
  /** 形态键（闭集，缺省 `calendar`）。 */
  readonly form?: DateRangeForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
