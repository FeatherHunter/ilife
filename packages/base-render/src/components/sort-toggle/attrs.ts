/** sortToggle · **标记契约**（渲染与运行时共用的唯一事实）。
 *
 *  形态：**C**（并进「视图」条：筛选＋排序一套 ＋ 口径句）——`#950` 打分台账里三形态 A/B/C ＝ 3/3/3、
 *  2/3/3、4/4/4 ⇒ C 胜出。C 的骨架＝「一排视图按钮（每个带自己的条数）＋ 一句把当前视图的口径说清的话
 *  ＋ 一颗反向键 ＋ 当前视图里几条」。
 *
 *  为什么把排序并进「视图」条：用户说得出的是「按常做排」这种**视图**，而不是
 *  「字段字段＋方向」两个旋钮。字段与方向是视图的**内部**（`field`／`dir`），
 *  页面上要写的是口径句——「「常做」＝用过几次从多到少，只看做过 ≥2 次的」。
 */

/** 本件的类名根。 */
export const SORT_ROOT_CLASS = 'ilife-block-sort-toggle';

/** 形态闭集。 */
export const SORT_FORMS = ['C'] as const;
export type SortToggleForm = (typeof SORT_FORMS)[number];

/** 方向闭集：`desc`（从多到少／从大到小）｜`asc`。 */
export const SORT_DIRECTIONS = ['desc', 'asc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/* ── 根 ────────────────────────────────────────────────────────────── */
/** 根：值＝机器键。运行时的发现锚。 */
export const SORT_NAME_ATTR = 'data-ilife-sort';
export const SORT_FORM_ATTR = 'data-ilife-sort-form';
/** 条目区键（对应条目区的 `data-ilife-sort-region`）；不给＝整页找条目。 */
export const SORT_TARGET_ATTR = 'data-ilife-sort-target';
export const SORT_BOUND_ATTR = 'data-ilife-sort-bound';
export const SORT_RUNTIME_ATTR = 'data-ilife-sort-runtime';
export const SORT_LOADING_ATTR = 'data-ilife-sort-loading';
export const SORT_DISABLED_ATTR = 'data-ilife-sort-disabled';
export const SORT_INVALID_ATTR = 'data-ilife-sort-invalid';

/* ── 视图条 ────────────────────────────────────────────────────────── */
/** 一颗视图键：值＝该视图的 `value`；`aria-pressed` 表达当前视图。 */
export const SORT_VIEW_ATTR = 'data-ilife-sort-view';
/** 视图键里的字面（运行时按它重写口径句里的视图名，不去切 `textContent`）。 */
export const SORT_VIEW_LABEL_ATTR = 'data-ilife-sort-view-label';
/** 视图键里的条数位（运行时按真实条目数写它）。 */
export const SORT_N_ATTR = 'data-ilife-sort-n';
/** 当前视图的排序字段（运行时按它排；渲染期就写上，判据读得到）。 */
export const SORT_FIELD_ATTR = 'data-ilife-sort-field';
/** 当前方向（`desc`／`asc`；反向键改的就是它）。 */
export const SORT_DIR_ATTR = 'data-ilife-sort-dir';
/** 这一档的口径句（写在**视图键**上：换档时运行时把它搬到口径行）。 */
export const SORT_CALIBER_ATTR = 'data-ilife-sort-caliber';
/** 口径行（整句的容器）。 */
export const SORT_CALIBER_LINE_ATTR = 'data-ilife-sort-caliber-line';
/** 口径行里的视图名那一处（加粗）。 */
export const SORT_INK_ATTR = 'data-ilife-sort-ink';
/** 口径行里的口径那一处。 */
export const SORT_CALIBER_TEXT_ATTR = 'data-ilife-sort-caliber-text';
/** 反向键。 */
export const SORT_FLIP_ATTR = 'data-ilife-sort-flip';
/** 反向键的字面根（「反过来」；运行时换方向时按它重写键面：根 ＋（会变成什么））。 */
export const SORT_FLIP_LABEL_ATTR = 'data-ilife-sort-flip-label';
/** 当前视图里几条（数位）。 */
export const SORT_SHOWN_ATTR = 'data-ilife-sort-shown';
/** 状态行（`role="status"`；载入态原地换字）。 */
export const SORT_STATUS_ATTR = 'data-ilife-sort-status';
export const SORT_EMPTY_ATTR = 'data-ilife-sort-empty';
export const SORT_ERROR_ATTR = 'data-ilife-sort-error';

/* ── 条目区（计数与排序的**唯一**事实来源）────────────────────────── */
export const SORT_REGION_ATTR = 'data-ilife-sort-region';
/** 一条条目：`data-ilife-sort-tags` 决定它属于哪些视图，`data-ilife-sort-<字段>` 是排序键。 */
export const SORT_ITEM_ATTR = 'data-ilife-sort-item';
/** 条目所属的视图（空格分隔）。 */
export const SORT_ITEM_TAGS_ATTR = 'data-ilife-sort-tags';

/* ── 事件 ──────────────────────────────────────────────────────────── */
/** 视图或方向变化：`detail = { name, view, field, dir, flipped, shown }`。 */
export const SORT_EVENT_CHANGE = 'ilife:sort-change';
/** 载入态开关（页面派发）：`detail = { name, on }`。 */
export const SORT_EVENT_LOADING = 'ilife:sort-loading';

export const SORT_DEFAULTS = Object.freeze({
  label: '视图',
  /** 反向键的默认字：键面写的是「反过来会变成什么」。 */
  flipLabel: '反过来',
  toDesc: '从多到少',
  toAsc: '从少到多',
  loadingText: '正在排…',
  emptyText: '这个视图里没有记录',
  /** 排序键在条目上一条都读不到时那句（错态）。 */
  noKeyText: '这个视图按「{field}」排，但条目上没有这个键（data-ilife-sort-{field}）',
  /** 条目区没接上时那句（错态）。 */
  unwiredText: '这个排序没接上条目区：页面上找不到可排的条目',
  /** 口径行的两块模板（`{label}`／`{caliber}` 由运行时替换；标点也住这里，运行时不许自造字面量）。 */
  inkText: '「{label}」',
  caliberText: '＝{caliber}',
  noCaliberText: '（这一档没写口径句）',
  unset: '—',
} as const);

export interface SortViewInput {
  /** 机器值（`aria-pressed` 的载荷与条目的 `data-ilife-sort-tags` 按它对号）。 */
  readonly value: string;
  /** 上屏字（如「常做」）。 */
  readonly label: string;
  /** 条数初值（渲染期给；运行时按真实条目重算并覆盖）。 */
  readonly count?: number | string;
  /** 这一档的口径句（换到这一档时上屏；如「用过几次从多到少，只看做过 ≥2 次的」）。 */
  readonly caliber?: string;
  /** 排序字段：条目上的 `data-ilife-sort-<field>`（不给＝这一档不重排，只筛）。 */
  readonly field?: string;
  /** 方向（缺省 `desc`）。 */
  readonly dir?: SortDirection;
}

export interface SortToggleInput {
  readonly form?: SortToggleForm;
  readonly name: string;
  readonly label?: string;
  /** 视图（至少一档）。 */
  readonly views: readonly SortViewInput[];
  /** 初始选中（必须是 `views` 里的机器值；缺省第一档）。 */
  readonly view?: string;
  readonly target?: string;
  /** 条数的单位（「46 道」「60 笔」）。 */
  readonly unit?: string;
  readonly flipLabel?: string;
  readonly loadingText?: string;
  readonly error?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly extraClass?: string;
}
