/** drag-sort · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 83 件，2026-09 用户裁定）
 *  里的 **A 一档「拖拽中：拖起行 ＋ 原位空槽 ＋ 落点粗线」**——清单里一行被拿起时，
 *  三样东西同时在屏上：拿起的那一行自己站起来、原位留一个虚线空槽、落点画一条粗线并写出第几位。
 *  同一件里的 B 档「按钮排序」打分未过、**不落**（它的类与规则一个都不搬）。
 *
 *  形态键写在 `DRAG_SORT_FORMS` 闭集里：档键取**骨架的名字**（`lift`＝拿起态），
 *  原型墙上的格号（A）不是接口名（同批 `spread-dist` 的 `range`／`quantile` 同此口径）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *
 *  **触屏地板**（触屏优先法条）：把手是 44×44 的真按钮；「按住拖」**不是**唯一通路——
 *  点一下把手拿起、再点另一行放下，手机上同一套标记走得通；`:focus-visible` 留给真实键盘用户。
 *  序号与名称**永不截断**（样式段里没有省略手段），位置读数每行都写（第 n／m 位）。
 */

 /** 本件的类名根：全部槽位类名都是 `DRAG_SORT_CLASS + '-' + 槽名`。 */
export const DRAG_SORT_CLASS = 'ilife-block-drag-sort';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。 */
export const DRAG_SORT_SLOTS = [
  /** 卡头那一排：标题 ＋ 右端那句拿法说明。 */
  'hd',
  /** 卡头标题（如「做菜步骤」）。 */
  'title',
  /** 卡头右端那句拿法（点把手拿起一行。放下时点另一行。） */
  'hint',
  /** 行区（一行接一行，行间 8px 缝）。 */
  'list',
  /** 一行（把手 ＋ 序号 ＋ 名称格 ＋ 右端读数；拿起时挂 `is-up`，锁定时挂 `is-locked`）。 */
  'row',
  /** 拖起把手（44×44 的真按钮；拿起态挂 `aria-pressed="true"`，锁定时 `disabled`）。 */
  'handle',
  /** 序号（第几步那个数；**永不截断**）。 */
  'index',
  /** 名称格（名称 ＋ 副语 ＋ 锁定原因）。 */
  'text',
  /** 名称（如「五花肉切块」；**永不截断**，长了换行）。 */
  'name',
  /** 副语（一行一句人话，如「约 5 分钟，主料」）。 */
  'note',
  /** 锁定原因（只在 `locked` 的行出：写出来，不只染色）。 */
  'why',
  /** 右端读数（如「5 分」，已经是给人看的样子）。 */
  'meta',
  /** 位置读数（第 n／m 位；**永不截断**）。 */
  'pos',
  /** 原位空槽（拿起态才出：虚线框 ＋ 写出哪一步空着）。 */
  'slot',
  /** 落点粗线（拿起态才出：3px 实线 ＋ 写出放第几位）。 */
  'drop',
  /** 状态句（现在是 plain 还是 lifted 的真读数；`role="status"`）。 */
  'status',
  /** 取消放回（拿起态才露出来：看得见、点得到的按钮）。 */
  'cancel',
] as const;
export type DragSortSlot = (typeof DRAG_SORT_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `DRAG_SORT_CLASS + '-' + …`）。 */
export function dragSortSlot(slot: DragSortSlot, prefix = 'ilife-'): string {
  return prefix + 'block-drag-sort-' + slot;
}

/** 形态闭集：本件只落地 A 一档「拖拽中」（键名 `lift`＝拿起态：拖起行＋原位空槽＋落点粗线三样齐）。 */
export const DRAG_SORT_FORMS = ['lift'] as const;
export type DragSortForm = (typeof DRAG_SORT_FORMS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝清单 `id`）。 */
export const DRAG_SORT_ATTR = 'data-ilife-drag-sort';
/** 行区（值＝清单 `id`）。 */
export const DRAG_SORT_LIST_ATTR = 'data-ilife-drag-list';
/** 一行（值＝这一行的机器键）。 */
export const DRAG_SORT_KEY_ATTR = 'data-ilife-drag-key';
/** 把手（值＝这一行的机器键；运行时按它认「点的是哪一行」）。 */
export const DRAG_SORT_HANDLE_ATTR = 'data-ilife-drag-handle';
/** 原位空槽（值＝被拿起那一行的机器键）。 */
export const DRAG_SORT_SLOT_ATTR = 'data-ilife-drag-slot';
/** 落点粗线（值＝将要放到的位，1 起）。 */
export const DRAG_SORT_LINE_ATTR = 'data-ilife-drag-line';
/** 状态句（值＝清单 `id`）。 */
export const DRAG_SORT_STATUS_ATTR = 'data-ilife-drag-status';
/** 取消键（值＝清单 `id`）。 */
export const DRAG_SORT_CANCEL_ATTR = 'data-ilife-drag-cancel';
/** 拿起态（挂在根上；值＝被拿起那一行的机器键）。 */
export const DRAG_SORT_LIFT_ATTR = 'data-ilife-drag-lift';
/** 落点位（挂在根上；值＝将要放到的位，1 起）。 */
export const DRAG_SORT_AT_ATTR = 'data-ilife-drag-at';
/** 记账：这份清单已被运行时段接管（幂等读数，不是开关）。 */
export const DRAG_SORT_BOUND_ATTR = 'data-ilife-drag-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const DRAG_SORT_RUNTIME_ATTR = 'data-ilife-drag-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 拿起一行：`detail={id,key,from}`（from＝拿起前第几位，1 起）。 */
export const DRAG_SORT_EVENT_PICK = 'ilife:drag-sort-pick';
/** 放下一行：`detail={id,keys,from,to}`（keys＝放下后的全序机器键；from／to 都是 1 起的位）。 */
export const DRAG_SORT_EVENT_DROP = 'ilife:drag-sort-drop';
/** 取消拿起：`detail={id,key}`（顺序原样不动）。 */
export const DRAG_SORT_EVENT_CANCEL = 'ilife:drag-sort-cancel';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：把手与取消键的命中盒不小于这个数（px）。 */
export const DRAG_SORT_TOUCH_PX = 44;
/** 行高下限（px）：整行比地板再宽裕一档。 */
export const DRAG_SORT_ROW_MIN_PX = 56;
/** 相邻触控目标的缝（px）：行与行之间。 */
export const DRAG_SORT_GAP_PX = 8;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const DRAG_SORT_CONTAINER = 'ilife-drag-sort';
/** 窄档断点（px）：**本件自己**窄于它就把右端读数折到下一行。这是容器断点，不是视口断点。 */
export const DRAG_SORT_NARROW_PX = 480;
/** 悬停只许是增强：这一段能力查询**样式段与运行时读同一个串**的样式半边（运行时不抢焦点，不读它）。 */
export const DRAG_SORT_HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** 行数下限（条）：1 条谈不上排序。 */
export const DRAG_SORT_MIN_ITEMS = 2;
/** 行数上限（条）：再多请调用方先分组（那是调用方的活，不是本件的活）。 */
export const DRAG_SORT_MAX_ITEMS = 30;

/* ── 文案（缺省的那几句；调用方换标题与副语，状态句的语义别换） ───────── */

/** 缺省文案与状态句（渲染期与运行时段**读同一份**，免得两处各写一句）。 */
export const DRAG_SORT_TEXT = Object.freeze({
  /** 卡头右端那句拿法：只说看得见的通路（不提长按／双击／方向键那一路）。 */
  hint: '点把手拿起一行。放下时点另一行。',
  /** 取消键上的字。 */
  cancel: '取消放回',
  /** 锁定前缀（原因写在名称格那一位）。 */
  lockedPrefix: '不可移：',
} as const);

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 清单里的一行：一步／一项，顺序就是屏上的顺序。 */
export interface DragSortItem {
  /** 机器键（事件 `detail` 原样送出）。**非空、清单内唯一**。 */
  readonly key: string;
  /** 名称（如「五花肉切 3 cm 方块」）。**非空；永不截断**，长了换行。 */
  readonly label: string;
  /** 副语（一行一句人话，如「约 5 分钟，主料」）。 */
  readonly note?: string;
  /** 右端读数（如「5 分」，已经是给人看的样子）。 */
  readonly meta?: string;
  /** 锁定时这一行拿不起来（把手 `disabled`）。**必须同时给 `why`**。 */
  readonly locked?: boolean;
  /** 锁定的原因（一行一句人话，写在名称格那一位）。`locked` 为真时必填。 */
  readonly why?: string;
}

/** 拖拽排序清单入参。`id`／`title`／`items` 三样必填。 */
export interface DragSortInput {
  /** 清单 `id`（同页唯一；事件 `detail.id` 就是它）。**只许标识符字符**。 */
  readonly id: string;
  /** 卡头标题（如「做菜步骤」）。 */
  readonly title: string;
  /** 卡头右端那句拿法（缺省见 `DRAG_SORT_TEXT.hint`）。空串＝未给。 */
  readonly hint?: string;
  /** 清单各行（**2–30 行**，顺序就是屏上的顺序）。 */
  readonly items: readonly DragSortItem[];
  /** 拿起态：被拿起那一行的机器键（须命中一行没锁定的）。不给＝plain（谁也没拿起）。 */
  readonly liftedKey?: string;
  /** 落点位（1 起，≤行数；缺省＝被拿起的那一位）。**不给 `liftedKey` 时不许给**。 */
  readonly dropAt?: number;
  /** 形态键（闭集，缺省 `lift`）。 */
  readonly form?: DragSortForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
