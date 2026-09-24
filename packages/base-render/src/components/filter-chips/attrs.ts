/** filterChips · **标记契约**（渲染与运行时共用的唯一事实）。
 *
 *  形态：**A**（常用一行 ＋「更多」可展开）——`#950` 打分台账里三形态 A/B/C ＝ 3/4/4、3/4/4、3/4/4，
 *  并列取先者 ⇒ A 胜出。A 的骨架＝「常点的那几档摆在外头，其余收在一处可展开的组里，
 *  底下永远写着已选几档、共几条、合计多少」。
 *
 *  与既有件的关系（名册点名的 `dup`）：仓里已有 `renderChipRow`（`blocks.ts`）——它**只显示、不可点**，
 *  是「一串胶囊标签」的排版件。本件是它的**可点版**：chip 全是原生 `<button>`、`aria-pressed` 表达选中、
 *  带计数与合计。扩张 `renderChipRow` 会把 HELP 与既有调用点一起卷进来（它们不需要选中态），
 *  故另立一件（与名册的判法一致）。
 */

/** 本件的类名根。 */
export const CHIPS_ROOT_CLASS = 'ilife-block-filter-chips';

/** 形态闭集：本件只落裁定胜出的那一档。 */
export const CHIPS_FORMS = ['A'] as const;
export type FilterChipsForm = (typeof CHIPS_FORMS)[number];

/* ── 根 ────────────────────────────────────────────────────────────── */
/** 根：值＝机器键。运行时的发现锚。 */
export const CHIPS_NAME_ATTR = 'data-ilife-chips';
export const CHIPS_FORM_ATTR = 'data-ilife-chips-form';
/** 记录区键（对应记录区的 `data-ilife-chips-region`）；不给＝整页找记录。 */
export const CHIPS_TARGET_ATTR = 'data-ilife-chips-target';
export const CHIPS_BOUND_ATTR = 'data-ilife-chips-bound';
export const CHIPS_RUNTIME_ATTR = 'data-ilife-chips-runtime';
export const CHIPS_LOADING_ATTR = 'data-ilife-chips-loading';
export const CHIPS_DISABLED_ATTR = 'data-ilife-chips-disabled';
export const CHIPS_INVALID_ATTR = 'data-ilife-chips-invalid';

/* ── 控件 ──────────────────────────────────────────────────────────── */
/** 一颗 chip 的机器值（chip 本体是原生 `<button>`，选中态住 `aria-pressed`）。 */
export const CHIP_ATTR = 'data-ilife-chip';
/** chip 里的计数位（运行时按真实记录数写它）。 */
export const CHIP_N_ATTR = 'data-ilife-chip-n';
/** 行（换行的容器）标记：窄档靠 `flex-wrap` 折行，**不许**横滑、不许硬截断。 */
export const CHIPS_ROW_ATTR = 'data-ilife-chips-row';
/** 「更多」那一段（原生 `<details>`：零脚本可展开）。 */
export const CHIPS_MORE_ATTR = 'data-ilife-chips-more';
export const CHIPS_CLEAR_ATTR = 'data-ilife-chips-clear';
/** 状态行（`role="status"`；载入态在原地换字）。 */
export const CHIPS_STATUS_ATTR = 'data-ilife-chips-status';
/** 已选档数位。 */
export const CHIPS_PICKED_ATTR = 'data-ilife-chips-picked';
/** 命中记录数位。 */
export const CHIPS_ROWS_ATTR = 'data-ilife-chips-rows';
/** 合计数位（金额一类）。 */
export const CHIPS_TOTAL_ATTR = 'data-ilife-chips-total';
export const CHIPS_EMPTY_ATTR = 'data-ilife-chips-empty';
export const CHIPS_ERROR_ATTR = 'data-ilife-chips-error';

/* ── 记录区（本件算计数与合计的**唯一**事实来源）──────────────────── */
/** 记录区。 */
export const CHIPS_REGION_ATTR = 'data-ilife-chips-region';
/** 一条记录：它的 `data-ilife-chip-tags` 决定它落在哪些档里。 */
export const CHIP_ITEM_ATTR = 'data-ilife-chip-item';
/** 一条记录所属的档（空格分隔的机器值）。 */
export const CHIP_ITEM_TAGS_ATTR = 'data-ilife-chip-tags';
/** 一条记录的数值（合计用它；读不出来的那几条会被点名，不静默当 0）。 */
export const CHIP_ITEM_VALUE_ATTR = 'data-ilife-chip-value';

/* ── 事件 ──────────────────────────────────────────────────────────── */
/** 选中集变化：`detail = { name, selected, rows, total }`。 */
export const CHIPS_EVENT_CHANGE = 'ilife:filter-change';
/** 载入态开关（页面派发）：`detail = { name, on }`。 */
export const CHIPS_EVENT_LOADING = 'ilife:chips-loading';

export const CHIPS_DEFAULTS = Object.freeze({
  label: '筛选',
  commonLabel: '常用',
  moreLabel: '更多',
  clearLabel: '清除',
  /** 状态行的量词：档数用「类」，记录数用「笔」。 */
  pickedUnit: '类',
  rowsUnit: '笔',
  /** 状态行的两个接头词（「已选 N 类 · 共 M 笔 · ¥X」）。 */
  pickedBefore: '已选',
  rowsBefore: '共',
  /** 没选中任何档时的说法（＝不筛，全部记录）。 */
  allText: '全部',
  emptyText: '这里还没有可筛的档',
  noRowsText: '这组筛选没有命中记录',
  /** 金额读不出来时的点名句（错态；`{n}` 由运行时替换成条数）。 */
  badValueText: '有 {n} 条的金额读不出来，合计只算了能读的那些',
  /** 记录区没接上时那句（错态）。 */
  unwiredText: '这组筛选没接上记录区：页面上找不到可筛的记录',
  loadingText: '正在筛…',
  /** 缺值写法（工艺书：缺值写成 `—`）。 */
  unset: '—',
} as const);

export interface FilterChipOption {
  /** 机器值（`aria-pressed` 的载荷与记录的 `data-ilife-chip-tags` 按它对号）。 */
  readonly value: string;
  /** 上屏字。 */
  readonly label: string;
  /** 计数位初值（渲染期给；运行时按真实记录重算并覆盖）。 */
  readonly count?: number | string;
  /** 归到「常用」那一行（缺省 `false` ＝落在「更多」里）。 */
  readonly common?: boolean;
}

export interface FilterChipsInput {
  readonly form?: FilterChipsForm;
  /** 机器键（事件 `detail.name` 按它定位；同一页内应唯一）。 */
  readonly name: string;
  /** 这一组筛的是什么（`aria-label` 与「更多」那一句）。 */
  readonly label?: string;
  /** 「常用」那一行的标头。 */
  readonly commonLabel?: string;
  /** 「更多」那一句的开头（如「更多分类」）。 */
  readonly moreLabel?: string;
  /** 「更多」默认展开（缺省 `true`：集合默认**全在页上**，收起是用户主动）。 */
  readonly moreOpen?: boolean;
  /** 档位（可以为空数组＝没得筛，渲染成设计过的空态）。 */
  readonly options: readonly FilterChipOption[];
  /** 初始选中（必须是 `options` 里的机器值；空数组＝不筛＝全部）。 */
  readonly selected?: readonly string[];
  readonly target?: string;
  readonly clearLabel?: string;
  readonly pickedUnit?: string;
  readonly rowsUnit?: string;
  readonly emptyText?: string;
  readonly loadingText?: string;
  /** 初始错态（写在控件旁边 ＋ `aria-describedby`）。 */
  readonly error?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly extraClass?: string;
}
