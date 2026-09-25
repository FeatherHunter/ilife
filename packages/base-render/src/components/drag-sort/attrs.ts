/** drag-sort · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 83 件，2026-09 用户裁定）
 *  的**两档骨架**：
 *   · `lift`「拖拽中：拖起行 ＋ 原位空槽 ＋ 落点粗线」——清单里一行被拿起时，三样东西同时在屏上：
 *     拿起的那一行自己站起来、原位留一个虚线空槽、落点画一条粗线并写出第几位；
 *   · `buttons`「按钮排序：选中一行，用两半控件挪位」——选中行自己站起来（投影＋强调描边），
 *     行尾一颗**两半控件**（「上移」｜「下移」，各 58×44）点哪半边就哪半边生效，落点那一位上停一条
 *     **贯穿行宽的虚线预告**。拖拽那条路两档都在（按钮**不是**唯一通路）。
 *
 *  形态键写在 `DRAG_SORT_FORMS` 闭集里：档键取**骨架的名字**（`lift`＝拿起态／`buttons`＝按钮排序），
 *  原型墙上的格号（A／B）不是接口名（同批 `spread-dist` 的 `range`／`quantile` 同此口径）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *  **闭集顺序是契约**：第一格 `lift` 是已落地那一档，只许往后加（它的标记逐字节不变）。
 *
 *  **触屏地板**（触屏优先法条）：把手是 44×44 的真按钮、两半控件的半边是 58×44 的真按钮；
 *  「按住拖」**不是**唯一通路——点一下把手拿起、再点另一行放下（按钮档：再用两半控件挪位），
 *  手机上同一套标记走得通；`:focus-visible` 留给真实键盘用户。
 *  序号与名称**永不截断**（样式段里没有省略手段）；位置读数每行都写。
 *
 *  **一屏只留一层话**（2026-09 用户口径：原型上的旁白与口径句不许搬进屏面）：按钮档**不画空槽、
 *  不写状态句、不搬原型的旁白**——总数只说一处（卡头那句）、同一个数每行只印一次（只有位置读数那一处），
 *  落点那句话就是那枚虚线预告自己（它同时是 `role="status"` 的活读数）。
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
  /** 两半控件（`buttons` 档才有：一个外框两半，点哪半边就哪半边生效；只挂在被选中那一行上）。 */
  'move',
  /** 两半控件里的「上移」半边（58×44 的真按钮）。 */
  'move-up',
  /** 两半控件里的「下移」半边（58×44 的真按钮）。 */
  'move-down',
] as const;
export type DragSortSlot = (typeof DRAG_SORT_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `DRAG_SORT_CLASS + '-' + …`）。 */
export function dragSortSlot(slot: DragSortSlot, prefix = 'ilife-'): string {
  return prefix + 'block-drag-sort-' + slot;
}

/** 形态闭集：**两档**，键名取骨架的名字。
 *  · `lift`＝旧档（已落地那一档，键**不许改**、标记逐字节不变）：拖起行 ＋ 原位空槽 ＋ 落点粗线；
 *  · `buttons`＝新档：选中行站起來 ＋ 两半控件（上移／下移）＋ 贯穿行宽的虚线落点预告。
 *  **顺序是契约**：第一格是旧档，加档只许往后加。 */
export const DRAG_SORT_FORMS = ['lift', 'buttons'] as const;
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
/** 形态读数（**只有 `buttons` 档写**；值＝形态键）。
 *  为什么只在新档写：旧档的标记是已落地的契约（判据逐字节断），形态读数不给它多加一个字节。 */
export const DRAG_SORT_FORM_ATTR = 'data-ilife-drag-form';
/** 两半控件的一半（值＝`up`／`down`；运行时按它认「点的是哪半边」）。 */
export const DRAG_SORT_MOVE_ATTR = 'data-ilife-drag-move';
/** 两半控件里「上移」那半边的值（与 `DRAG_SORT_MOVE_ATTR` 配对使）。 */
export const DRAG_SORT_MOVE_UP = 'up';
/** 两半控件里「下移」那半边的值。 */
export const DRAG_SORT_MOVE_DOWN = 'down';
/** 两半控件那两半的值的闭集。 */
export type DragSortMove = typeof DRAG_SORT_MOVE_UP | typeof DRAG_SORT_MOVE_DOWN;
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
/** 两半控件每半边的宽下限（px）：`buttons` 档「上移」「下移」各 58×44。 */
export const DRAG_SORT_MOVE_MIN_PX = 58;
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

/* ── 文案（全部整句／整段；调用方换标题与副语，状态句的语义别换） ─────
 *
 *  **本件的每一句会过屏的字都在这一处定义**（铁律二）：`model.ts` 渲染期读它算出状态句／空槽句／
 *  落点句／把手名，`runtime.ts` 把它烘成产出 JS 里同名同形的函数（不是另写一份——两处各写一句，
 *  改一句漏一句，屏上同一件事就有了两个说法）。
 */

/** 文案段（**整句定义地**：渲染期与运行时段读的就是这一份）。 */
export const DRAG_SORT_TEXT = Object.freeze({
  /** 卡头右端那句拿法：只说看得见的通路（不提长按／双击／方向键那一路）。 */
  hint: '点把手拿起一行。放下时点另一行。',
  /** 取消键上的字。 */
  cancel: '取消放回',
  /** 锁定前缀（原因写在名称格那一位）。 */
  lockedPrefix: '不可移：',
  /** plain 态的状态句：`{n}`＝共几步。 */
  idleStatus: '共 {n} 步。点把手拿起一行。放下时点另一行。',
  /** lifted 态的状态句：`{from}`／`{to}`＝第几位（1 起），`{label}`＝被拿起那一行的名称。 */
  liftStatus: '已拿起第 {from} 步「{label}」，将放到第 {to} 位。点另一行放下，或点取消放回原位。',
  /** 空槽句：写出哪一步空着、被拿起的是谁。 */
  slotText: '第 {from} 步原位空着，被拿起的是{label}',
  /** 落点句：写出放第几位。 */
  lineText: '放这里（第 {to} 位）',
  /** 可拿起那两行的把手名：`{p}`＝第几位，`{label}`＝名称。 */
  gripPick: '拿起第 {p} 步：{label}',
  /** 已拿起那一行的把手名（再点＝放回原位）。 */
  gripLift: '已拿起第 {p} 步：{label}，再点放回原位',
  /** 锁定那一行的把手名：`{p}`＝第几位，`{why}`＝锁定原因。 */
  gripLock: '第 {p} 步不可移，{why}',
  /* ── `buttons` 档（第二形态）那几句 ────────────────────────────────
   *  **旁白与口径句一个都不搬**（原型上的「选中了这一条 · 点右边的按钮」那种句子不进屏面）：
   *  一屏只留一层话，同一个数只印一次。 */
  /** 卡头那句拿法（`buttons` 档的缺省）：总数只在这一处说。 */
  buttonsHint: '共 {n} 步。点一行选中，再点「上移」或「下移」。',
  /** 每行的位置读数：只印自己那一位（总数在卡头那句里说过一次）。 */
  posOne: '第 {p} 位',
  /** 虚线落点预告那一句：写出会落到第几位（`{to}`＝1 起的位）。 */
  previewText: '落到第 {to} 位',
  /** 两半控件「上移」半边上的两个字。 */
  moveUp: '上移',
  /** 两半控件「下移」半边上的两个字。 */
  moveDown: '下移',
  /** 「上移」半边的无障碍名：`{label}`＝这一行的名称。 */
  moveUpName: '上移：{label}',
  /** 「下移」半边的无障碍名。 */
  moveDownName: '下移：{label}',
  /** `buttons` 档的把手名：点它＝选中这一行。 */
  gripSelect: '选中第 {p} 步：{label}',
  /** `buttons` 档已选中那一行的把手名（再点＝取消选中）。 */
  gripSelected: '已选中第 {p} 步：{label}，再点取消',
} as const);

/** 文案段里占位符的值：字符串原样、数走十进制（渲染期与产出的 JS 用同一个口径）。 */
export type DragSortTextValue = string | number;

/** 占位符（`{名}`，名字只许小写字母）。**带 `g` 的正则是有状态的**（`lastIndex` 跨调用留着），
 *  所以每次取句子前先把它拨回 0——不拨的话第二次调用会从上次停的地方接着找，模板原样漏出去。 */
const PLACEHOLDER = /\{([a-z]+)\}/g;

/** 取那一句整句文本（占位符 `{名}` 会被 `values` 里的值替换）。
 *
 *  **`runtime.ts` 读的也是这一个函数**：它把「函数怎么写」烘成产出的 JS（逐段来自同一句模板），
 *  渲染期与运行时段于是**同源同形**——不是两处各写一句。 */
export function dragSortText(key: keyof typeof DRAG_SORT_TEXT,
  values?: Readonly<Record<string, DragSortTextValue>>): string {
  const tpl: string = DRAG_SORT_TEXT[key];
  PLACEHOLDER.lastIndex = 0;
  return tpl.replace(PLACEHOLDER, (whole, name: string) => {
    const v = values === undefined ? undefined : values[name];
    return typeof v === 'string' || typeof v === 'number' ? String(v) : whole;
  });
}

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
  /** 卡头右端那句拿法（缺省见 `DRAG_SORT_TEXT.hint`／`buttonsHint`：两档各一句）。空串＝未给。 */
  readonly hint?: string;
  /** 清单各行（**2–30 行**，顺序就是屏上的顺序）。 */
  readonly items: readonly DragSortItem[];
  /** 拿着的那一行：`lift` 档＝被**拿起**的、`buttons` 档＝被**选中**的（都须命中一行没锁定的）。
   *  不给＝谁也没拿着（两档各自的 plain 态）。 */
  readonly liftedKey?: string;
  /** 落点位（1 起，≤行数）。`lift` 档：缺省＝被拿起的那一位。**`buttons` 档不许给**——那一档的落点
   *  是**算出来的**（选中行能不能再往上挪：能就预告上移的落点，到头了就预告下移的落点）。
   *  **不给 `liftedKey` 时不许给**。 */
  readonly dropAt?: number;
  /** 形态键（闭集，缺省 `lift`；`buttons` 是按钮排序那一档）。 */
  readonly form?: DragSortForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
