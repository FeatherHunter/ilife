/** windowPicker · **标记契约**（渲染与运行时共用的唯一事实）。
 *
 *  形态：**A**（一行工具条：段 ＋ 起止 ＋ 天数）——`#950` 打分台账里三形态 A/B/C ＝ 4/4/4、4/4/4、2/2/2，
 *  并列取先者 ⇒ A。A 的骨架＝「窗口档（今日／本周／…）摆在一行，紧跟着起止两个日期与「共 N 天」」。
 *
 *  为什么窗口必须显式写在页上：**窗口是一整页读数的口径**（同一批数换一窗就是另一批数）。
 *  只留一个下拉、不显示起止，读的人分不出「本月」是从 1 号算还是从今天往前推 30 天。
 */

/** 本件的类名根。 */
export const WINDOW_ROOT_CLASS = 'ilife-block-window-picker';

/** 形态闭集。 */
export const WINDOW_FORMS = ['A'] as const;
export type WindowPickerForm = (typeof WINDOW_FORMS)[number];

/* ── 根 ────────────────────────────────────────────────────────────── */
/** 根：值＝机器键。运行时的发现锚。 */
export const WINDOW_NAME_ATTR = 'data-ilife-window';
export const WINDOW_FORM_ATTR = 'data-ilife-window-form';
export const WINDOW_BOUND_ATTR = 'data-ilife-window-bound';
export const WINDOW_RUNTIME_ATTR = 'data-ilife-window-runtime';
/** 今天（`YYYY-MM-DD`）。**由页面给**：给了就是确定的，判据不必跟真实日期赛跑。 */
export const WINDOW_TODAY_ATTR = 'data-ilife-window-today';
/** 最近一次派发出去的窗口（`from|to`）：同一个窗口不重复派发（改日期时 `input` 与 `change` 都会来）。 */
export const WINDOW_LAST_ATTR = 'data-ilife-window-last';
export const WINDOW_LOADING_ATTR = 'data-ilife-window-loading';
export const WINDOW_DISABLED_ATTR = 'data-ilife-window-disabled';
export const WINDOW_INVALID_ATTR = 'data-ilife-window-invalid';

/* ── 控件 ──────────────────────────────────────────────────────────── */
/** 窗口档（今日／本周／自定义…）：值＝该档的 `value`；`aria-pressed` 表达当前档。 */
export const WINDOW_PRESET_ATTR = 'data-ilife-window-preset';
/** 这一档有几天的机器面（运行时按它算起止；`custom` 档不带它）。 */
export const WINDOW_PRESET_DAYS_ATTR = 'data-ilife-window-preset-days';
/** 起止两个日期输入。 */
export const WINDOW_FROM_ATTR = 'data-ilife-window-from';
export const WINDOW_TO_ATTR = 'data-ilife-window-to';
/** 「共 N 天」里的 N（运行时按两个日期真算）。 */
export const WINDOW_DAYS_ATTR = 'data-ilife-window-days';
/** 状态行（`role="status"`；载入态原地换字）。 */
export const WINDOW_STATUS_ATTR = 'data-ilife-window-status';
export const WINDOW_EMPTY_ATTR = 'data-ilife-window-empty';
export const WINDOW_ERROR_ATTR = 'data-ilife-window-error';

/* ── 事件 ──────────────────────────────────────────────────────────── */
/** 窗口变化：`detail = { name, preset, from, to, days }`。 */
export const WINDOW_EVENT_CHANGE = 'ilife:window-change';
/** 载入态开关（页面派发）：`detail = { name, on }`。 */
export const WINDOW_EVENT_LOADING = 'ilife:window-loading';

/** `custom` 档的机器值（起止被手改时自动落到这一档；渲染期也用它找自定义档）。 */
export const WINDOW_CUSTOM = 'custom';

export const WINDOW_DEFAULTS = Object.freeze({
  label: '窗口',
  fromLabel: '窗口起始日',
  toLabel: '窗口结束日',
  /** 起止之间的连接词（「至」）。 */
  tillText: '至',
  /** 天数的写法（`{n}` 由运行时替换）。 */
  daysText: '共 {n} 天',
  /** 缺省档：说得出口的窗口（「近 30 天」不是「本月」——起止天天在变，标签必须诚实）。 */
  presets: Object.freeze([
    Object.freeze({ value: 'today', label: '今日', days: 1 }),
    Object.freeze({ value: 'week', label: '本周', days: 7 }),
    Object.freeze({ value: 'month', label: '近 30 天', days: 30 }),
    Object.freeze({ value: WINDOW_CUSTOM, label: '自定义' }),
  ]),
  loadingText: '正在换…',
  /** 起止没定完时那句（空态）。 */
  emptyText: '窗口未定：先选一段',
  /** 结束日早于起始日（错态）。 */
  badRangeText: '结束日早于起始日：窗口得从头到尾',
  /** 日期读不出来（错态；`{date}` 由运行时替换成读到的那个值）。 */
  badDateText: '日期读不出来：起止必须是 YYYY-MM-DD（读到「{date}」）',
  unset: '—',
} as const);

export interface WindowPresetInput {
  /** 机器值（`aria-pressed` 的载荷；`custom` 是内置档，调用方不必再给）。 */
  readonly value: string;
  /** 上屏字。 */
  readonly label: string;
  /** 「最近 N 天（到今天）」：与 `from`／`to` 二选一。 */
  readonly days?: number;
  /** 固定起止（`YYYY-MM-DD`）：与 `days` 二选一。 */
  readonly from?: string;
  readonly to?: string;
}

export interface WindowPickerInput {
  readonly form?: WindowPickerForm;
  readonly name: string;
  readonly label?: string;
  /** 窗口档（缺省 `今日／本周／近 30 天／自定义`）。 */
  readonly presets?: readonly WindowPresetInput[];
  /** 初始档（必须是某一档的 `value`；缺省第一档）。 */
  readonly preset?: string;
  /** 初始起止（`YYYY-MM-DD`）；不给＝按初始档算。 */
  readonly from?: string;
  readonly to?: string;
  /** 今天（`YYYY-MM-DD`）。给了就完全确定；不给＝用浏览器当天的日期。 */
  readonly today?: string;
  readonly loadingText?: string;
  readonly error?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly extraClass?: string;
}
