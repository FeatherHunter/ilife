/** searchField · **标记契约**（渲染与运行时共用的唯一事实）。
 *
 *  形态：**B**（范围分段 ＋ 下划线输入 ＋ 命中读数）。
 *  为什么是 B：`#950` 打分台账里 search-field 三形态 A/B/C ＝ 1/3/3、4/4/4、4/4/4，
 *  并列取先者 ⇒ B 胜出。B 的骨架＝「先圈定在哪找（分段）→ 真打字 → 页上写着命中几处」。
 *  下划线（印刷风）是 B 的**视觉**档（原型 B 的框换成下划线），骨架一档没少。
 *
 *  运行时的发现锚一律是 `data-*`：类名只管长相，属性管行为——改样式不动行为。
 *  **命中计数是真数**：运行时按结果区里真实存在的条目与真实出现的词数出来，渲染期只写「—」。
 */

/** 本件的类名根（`ilife-block-<件名>`）。所有槽位类名都由它派生出 `-<槽>`。 */
export const SEARCH_ROOT_CLASS = 'ilife-block-search-field';

/** 形态闭集：本件只落裁定胜出的那一档（闭集外的值 → `bad-input`，不静默降级）。 */
export const SEARCH_FORMS = ['B'] as const;
export type SearchFieldForm = (typeof SEARCH_FORMS)[number];

/* ── 根 ────────────────────────────────────────────────────────────── */
/** 根：值＝机器键（`SearchFieldInput.name`）。运行时的发现锚。 */
export const SEARCH_NAME_ATTR = 'data-ilife-search';
/** 形态键（闭集见 `SEARCH_FORMS`）。 */
export const SEARCH_FORM_ATTR = 'data-ilife-search-form';
/** 结果区键：值＝结果区自己挂的 `data-ilife-search-region` 值。不给＝整页找。 */
export const SEARCH_TARGET_ATTR = 'data-ilife-search-target';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const SEARCH_BOUND_ATTR = 'data-ilife-search-bound';
/** 运行时挂载标记（挂在 `<html>` 上：同一页注入多份运行时也只绑一次）。 */
export const SEARCH_RUNTIME_ATTR = 'data-ilife-search-runtime';
/** 载入态标记（`1` ＝正在找）。 */
export const SEARCH_LOADING_ATTR = 'data-ilife-search-loading';
/** 载入态文案（原地换字用；不给取 `SEARCH_DEFAULTS.loadingText`）。 */
export const SEARCH_LOADING_TEXT_ATTR = 'data-ilife-search-loading-text';
/** 错态标记（`1` ＝控件旁边那句错在生效）。 */
export const SEARCH_INVALID_ATTR = 'data-ilife-search-invalid';
/** 禁用标记（输入框与三颗键一起禁用）。 */
export const SEARCH_DISABLED_ATTR = 'data-ilife-search-disabled';

/* ── 结果区 ────────────────────────────────────────────────────────── */
/** 结果区（一段可以整体被某个搜索框圈定的区域）。 */
export const SEARCH_REGION_ATTR = 'data-ilife-search-region';
/** 结果条目（被搜、被过滤、被标命中词的单元）。 `result-row` 的每一条也带它。 */
export const SEARCH_ITEM_ATTR = 'data-ilife-search-item';
/** 条目的范围标签（空格分隔；范围分段按它对号入座）。没有标签的条目只算进「全部」。 */
export const SEARCH_TAGS_ATTR = 'data-ilife-search-tags';

/* ── 控件槽 ────────────────────────────────────────────────────────── */
export const SEARCH_INPUT_ATTR = 'data-ilife-search-input';
export const SEARCH_CLEAR_ATTR = 'data-ilife-search-clear';
/** 范围分段键：值＝该档的 `value`。 */
export const SEARCH_SCOPE_ATTR = 'data-ilife-search-scope';
/** 范围键里的计数位（运行时按真实命中数写它）。 */
export const SEARCH_N_ATTR = 'data-ilife-search-n';
/** 读数里的当前范围名。 */
export const SEARCH_SCOPE_NAME_ATTR = 'data-ilife-search-scope-name';
/** 读数节点（`role="status"`；载入态在原地换字）。 */
export const SEARCH_STATUS_ATTR = 'data-ilife-search-status';
/** 读数整行（状态 ＋ 前后跳；窄档换行时整行一起换）。 */
export const SEARCH_READOUT_ATTR = 'data-ilife-search-readout';
/** 位置节点（「第 i 处 / 共 n 处」整句；`i`／`n` 分住在两个 `SEARCH_AT_ATTR`／`SEARCH_COUNT_ATTR` 位里）。 */
export const SEARCH_POS_ATTR = 'data-ilife-search-pos';
/** 命中数位（「N 处命中」里的 N；两处共用同一个属性名，运行时一起写）。 */
export const SEARCH_COUNT_ATTR = 'data-ilife-search-count';
/** 当前第几处（「第 i 处 / 共 n 处」里的 i）。 */
export const SEARCH_AT_ATTR = 'data-ilife-search-at';
export const SEARCH_PREV_ATTR = 'data-ilife-search-prev';
export const SEARCH_NEXT_ATTR = 'data-ilife-search-next';
/** 运行时打上的命中词标签（`<mark>`；**卸载时逐字还原原文**）。 */
export const SEARCH_HIT_ATTR = 'data-ilife-search-hit';
/** 当前那一处命中（跳转落点）。 */
export const SEARCH_CURRENT_ATTR = 'data-ilife-search-current';
/** 空态行（设计过的空态句；词为空或有命中时收起）。 */
export const SEARCH_EMPTY_ATTR = 'data-ilife-search-empty';
/** 错态行（写在控件旁边的那句；`aria-describedby` 指向它的 id）。 */
export const SEARCH_ERROR_ATTR = 'data-ilife-search-error';

/* ── 事件（冒泡 `CustomEvent`，页面按 `detail` 接自己的重算，**不引入全局**）── */
/** 每次查询变化（打字／清空／换范围）：`detail = { name, query, scope, hits, items }`。 */
export const SEARCH_EVENT_QUERY = 'ilife:search';
/** 跳转：`detail = { name, index, total }`。 */
export const SEARCH_EVENT_JUMP = 'ilife:search-jump';
/** 载入态开关（页面驱动）：`detail = { name, on, text? }`。 */
export const SEARCH_EVENT_LOADING = 'ilife:search-loading';

/** 缺省文案与量词（渲染与运行时共用这一份，判据也从这里取，不抄字面量）。 */
export const SEARCH_DEFAULTS = Object.freeze({
  /** 输入框的 `aria-label`（没给字段名时的兜底）。 */
  label: '搜索',
  clearLabel: '清空',
  prevLabel: '上一处',
  nextLabel: '下一处',
  /** 空态句：命中 0 处时写在读数下面（**设计过的空态**，不是一片空白）。 */
  emptyText: '没有命中，换个词或放宽范围',
  /** 载入态原地换的那句。 */
  loadingText: '正在找…',
  /** 没接上结果区时那句（错态，写在控件旁边）。 */
  unwiredText: '这个搜索框没接上结果区：页面上找不到可搜的条目',
  /** 「全部」档的机器值（范围分段里代表不过滤）。 */
  scopeAll: 'all',
  /** 命中数的量词：「N 处命中」的「处」。 */
  noun: '处',
  /** 缺值写法（工艺书：缺值写成 `—`）。 */
  unset: '—',
  /** 结果区条目一个字都没有时的报错文案。 */
  emptyRegionText: '结果区里没有可搜的条目',
} as const);

/** 范围分段的一档。 */
export interface SearchScopeInput {
  /** 机器值（`detail.scope` 与条目的 `data-ilife-search-tags` 按它对号）。 */
  readonly value: string;
  /** 上屏字。 */
  readonly label: string;
  /** 计数位（渲染期的初值；运行时按真实命中重写）。 */
  readonly count?: number | string;
}

export interface SearchFieldInput {
  /** 形态键（本件只有 `B`；给了闭集外的值就 `bad-input`，不静默换档）。 */
  readonly form?: SearchFieldForm;
  /** 机器键（事件 `detail.name` 按它定位；同一页内应唯一）。非空字符串。 */
  readonly name: string;
  /** 人类可读字段名（`aria-label` 用它；缺省 `搜索`）。 */
  readonly label?: string;
  readonly placeholder?: string;
  /** 初始查询串（可为空串＝没有查询）。 */
  readonly query?: string;
  /** 范围分段：不给／空数组＝不渲染分段；给就至少两档（一档不成分段）。 */
  readonly scopes?: readonly SearchScopeInput[];
  /** 初始选中的范围（`scopes` 的某一个 `value`；缺省 `all`）。 */
  readonly scope?: string;
  /** 结果区键（对应结果区的 `data-ilife-search-region`）；不给＝整页找。 */
  readonly target?: string;
  /** 量词（「N 处命中」的「处」；如「道」「条」）。 */
  readonly noun?: string;
  /** 空态句（命中 0 处时上屏）。 */
  readonly emptyText?: string;
  /** 载入态文案。 */
  readonly loadingText?: string;
  /** 初始错态：给了就在控件旁边写这一句（`aria-describedby` 指过去）。 */
  readonly error?: string;
  /** 初始载入态。 */
  readonly loading?: boolean;
  /** 禁用：输入框与三颗键一起禁用（"看着能用、用了没反应"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
