/** kanban-columns · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 88 件，2026-09 用户裁定）
 *  里的 **A 一档「按状态分列（含一次挪动与一个空列）」**——多列并排、列头带计数与「＋」，
 *  卡片能在列之间移动；同一件里的 B 档「按位置分列 ＋ 列内二级组」打分未过、**不落**
 *  （它的类与规则一个都不搬）。
 *
 *  形态键写在 `KANBAN_COLUMNS_FORMS` 闭集里：档键取**骨架的名字**（`status`＝按状态分列），
 *  原型墙上的格号（A）不是接口名（同批 `drag-sort` 的 `lift` 同此口径）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *
 *  **触屏地板**（触屏优先法条）：整张卡就是那颗按钮（点卡＝选中）；挪动**不走拖拽**——
 *  选中一张卡、再点目标列那枚看得见的收纳按钮，手机上同一套标记走得通；
 *  取消也在状态句旁边（看得见、点得到）；`:focus-visible` 留给真实键盘用户。
 *  列名与计数**永不截断**（样式段里没有省略手段），状态靠「形 ＋ 字 ＋ 色」三样。
 */

/** 本件的类名根：全部槽位类名都是 `KANBAN_COLUMNS_CLASS + '-' + 槽名`。 */
export const KANBAN_COLUMNS_CLASS = 'ilife-block-kanban-columns';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。 */
export const KANBAN_COLUMNS_SLOTS = [
  /** 宿主（分段切换 ＋ 列区 ＋ 状态句住这里；它自己就是容器）。 */
  'host',
  /** 窄档的分段切换（N 枚真按钮；宽档整条 `hidden`）。 */
  'switch',
  /** 分段里的一段（一列对应一段；当前列挂 `aria-pressed="true"`）。 */
  'seg',
  /** 列区（宽档并排 N 列；窄档一次只留一列）。 */
  'cols',
  /** 一列（列头 ＋ 列身；空列也一直在，不消失）。 */
  'col',
  /** 列头（两级字 ＋ 收纳键并成的那一块）。 */
  'head',
  /** 列名（如「想做」；**永不截断**，长了换行）。 */
  'name',
  /** 计数（如「2 道」；**永不截断**）。 */
  'count',
  /** 这一列是干什么的（如「待做的菜」；列头的第二级字）。 */
  'purpose',
  /** 往这一列加一张的键（44×44；只派发事件，不写库）。 */
  'add',
  /** 列身（卡 ＋ 收纳键 ＋ 空槽住这里；空列撑到同高）。 */
  'body',
  /** 一张卡（**整卡就是那颗按钮**：点它＝选中／再点＝取消）。 */
  'card',
  /** 卡标题（如「葱油饼」；**永不截断**）。 */
  'title',
  /** 卡副语（一行一句人话，如「30 分钟 · 面点」）。 */
  'meta',
  /** 卡上那枚状态（形 ＋ 字：记号 ＋ 它在哪一列，不只靠列位置）。 */
  'badge',
  /** 状态里的记号（每列一形：●／▸／✓／◆）。 */
  'mark',
  /** 落点线（选中态才出：3px 实线 ＋ 写出放这里＝标记为哪一列）。 */
  'drop',
  /** 收纳键（每列一枚：选中后点它＝把卡收到这一列；没选中时 `disabled`）。 */
  'receive',
  /** 空槽（这一列空时出来：虚线框 ＋ 写出空着也保留列头与计数）。 */
  'slot',
  /** 状态句（现在选中了谁／点收纳按钮挪过去；`role="status"`）。 */
  'status',
  /** 取消选中（选中态才露出来：看得见、点得到的按钮）。 */
  'cancel',
  /** 脚注（这一件的拿法，一句话）。 */
  'hint',
] as const;
export type KanbanColumnsSlot = (typeof KANBAN_COLUMNS_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `KANBAN_COLUMNS_CLASS + '-' + …`）。 */
export function kanbanColumnsSlot(slot: KanbanColumnsSlot, prefix = 'ilife-'): string {
  return prefix + 'block-kanban-columns-' + slot;
}

/** 形态闭集：本件只落地 A 一档「按状态分列」（键名 `status`：列＝状态，卡在列之间挪就是改状态）。 */
export const KANBAN_COLUMNS_FORMS = ['status'] as const;
export type KanbanColumnsForm = (typeof KANBAN_COLUMNS_FORMS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝看板 `id`）。 */
export const KANBAN_COLUMNS_ATTR = 'data-ilife-kanban';
/** 一列（值＝这一列的机器键）。 */
export const KANBAN_COLUMNS_COL_ATTR = 'data-ilife-kanban-col';
/** 一张卡（值＝这一张卡的机器键）。 */
export const KANBAN_COLUMNS_CARD_ATTR = 'data-ilife-kanban-card';
/** 卡现在在哪一列（值＝列的机器键；挪动时运行时段改这一位 ＋ 计数 ＋ 卡上那枚状态）。 */
export const KANBAN_COLUMNS_STATE_ATTR = 'data-ilife-kanban-state';
/** 选中态（挂在根上；值＝被选中那一张卡的机器键；没选中时整条属性不在）。 */
export const KANBAN_COLUMNS_PICK_ATTR = 'data-ilife-kanban-pick';
/** 窄档当前列（挂在根上；值＝第几列，1 起）。 */
export const KANBAN_COLUMNS_SHOW_ATTR = 'data-ilife-kanban-show';
/** 分段里的一段（值＝第几列，1 起；运行时按它认「点的是哪一段」）。 */
export const KANBAN_COLUMNS_SEG_ATTR = 'data-ilife-kanban-seg';
/** 收纳键（值＝这一列的机器键；运行时按它认「收到哪一列」）。 */
export const KANBAN_COLUMNS_RECEIVE_ATTR = 'data-ilife-kanban-receive';
/** 往这一列加一张的键（值＝这一列的机器键）。 */
export const KANBAN_COLUMNS_ADD_ATTR = 'data-ilife-kanban-add';
/** 状态句（值＝看板 `id`）。 */
export const KANBAN_COLUMNS_STATUS_ATTR = 'data-ilife-kanban-status';
/** 取消键（值＝看板 `id`）。 */
export const KANBAN_COLUMNS_CANCEL_ATTR = 'data-ilife-kanban-cancel';
/** 记账：这份看板已被运行时段接管（幂等读数，不是开关）。 */
export const KANBAN_COLUMNS_BOUND_ATTR = 'data-ilife-kanban-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const KANBAN_COLUMNS_RUNTIME_ATTR = 'data-ilife-kanban-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 选中一张卡：`detail={id,key,from}`（from＝它现在在哪一列）。 */
export const KANBAN_COLUMNS_EVENT_PICK = 'ilife:kanban-pick';
/** 卡被收到另一列：`detail={id,key,from,to}`（from／to 都是列的机器键）。 */
export const KANBAN_COLUMNS_EVENT_MOVE = 'ilife:kanban-move';
/** 取消选中：`detail={id,key}`（卡原样不动）。 */
export const KANBAN_COLUMNS_EVENT_CANCEL = 'ilife:kanban-cancel';
/** 往一列加一张：`detail={id,column}`（本件不写库，只报「往哪一列加」）。 */
export const KANBAN_COLUMNS_EVENT_ADD = 'ilife:kanban-add';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：卡／收纳键／加键／分段的命中盒不小于这个数（px）。 */
export const KANBAN_COLUMNS_TOUCH_PX = 44;
/** 卡高下限（px）：卡里三行字，比地板再宽裕一档。 */
export const KANBAN_COLUMNS_CARD_MIN_PX = 56;
/** 相邻触控目标的缝（px）：卡与卡之间、卡与收纳键之间。 */
export const KANBAN_COLUMNS_GAP_PX = 8;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const KANBAN_COLUMNS_CONTAINER = 'ilife-kanban-columns';
/** 窄档断点（px）：**本件自己**窄于它就一列一屏 ＋ 分段切换。这是容器断点，不是视口断点。 */
export const KANBAN_COLUMNS_NARROW_PX = 600;
/** 悬停只许是增强：这一段能力查询**样式段读它**（运行时不抢焦点，不读它）。 */
export const KANBAN_COLUMNS_HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** 列数下限（列）：1 列谈不上看板。 */
export const KANBAN_COLUMNS_MIN_COLS = 2;
/** 列数上限（列）：再多请调用方先分组（那是调用方的活，不是本件的活）。 */
export const KANBAN_COLUMNS_MAX_COLS = 4;
/** 一列的卡数上限（张）：再多请调用方先分组。 */
export const KANBAN_COLUMNS_MAX_CARDS = 20;
/** 每列的记号（形：列名之外的另一重状态——色 ＋ 字 ＋ 形至少两样才算数）。 */
export const KANBAN_COLUMNS_MARKS = ['●', '▸', '✓', '◆'] as const;

/* ── 文案（缺省的那几句；调用方换列名与卡名，状态句的语义别换） ───────── */

export const KANBAN_COLUMNS_TEXT = Object.freeze({
  /** 脚注：这一件的拿法（只说看得见的通路，不提拖拽那一路）。 */
  hint: '点一张卡选中，再点目标列的收纳按钮挪过去。',
  /** 取消键上的字。 */
  cancel: '取消选中',
  /** 空槽两句：空着也保留列头与计数（空列不许消失）。 */
  emptyTitle: '这一列现在是空的',
  /* 两句话之间不写 `；`：那枚分隔符会撞仓库那把尺子（`test/separator-probe.mjs` 的 R2：
     可见文本里出现 `；` 就是「用符号简化了 UI 展示」的设计债）。 */
  emptyNote: '卡片挪过来就有内容。空着也保留列头与计数',
  /** 没选中时状态句写的那一句（真读数，不是占位）。 */
  idle: '还没选中卡片。',
  /** 收纳键的字（中间夹列名）：`放到「做过了」`。 */
  receivePre: '放到「',
  receivePost: '」',
  /** 落点线上的字：`放这里＝标记为「做过了」`。 */
  dropPre: '放这里＝标记为「',
  dropPost: '」',
  /** 加键的字（`＋`，无障碍名另拼）。 */
  add: '＋',
  /** 加键无障碍名的两半：`往「想做」里加一张`。 */
  addPre: '往「',
  addPost: '」里加一张',
  /** 计数单位（列不给 `unit` 时的缺省）。 */
  unit: '件',
} as const);

/** 收纳键上的字（`放到「做过了」`）。 */
export function kanbanReceiveText(name: string): string {
  return KANBAN_COLUMNS_TEXT.receivePre + name + KANBAN_COLUMNS_TEXT.receivePost;
}

/** 落点线上的字（`放这里＝标记为「做过了」`）。 */
export function kanbanDropText(name: string): string {
  return KANBAN_COLUMNS_TEXT.dropPre + name + KANBAN_COLUMNS_TEXT.dropPost;
}

/** 加键的无障碍名（`往「想做」里加一张`）。 */
export function kanbanAddLabel(name: string): string {
  return KANBAN_COLUMNS_TEXT.addPre + name + KANBAN_COLUMNS_TEXT.addPost;
}

/** 计数那一句（`2 道`：数 ＋ 单位，两样都写，不只染色）。 */
export function kanbanCountText(count: number, unit: string): string {
  return String(count) + ' ' + unit;
}

/** 状态句（真读数：没选中写一句，选中了写清选的是谁、下一步点哪儿）。
 *  **没选中那一句不再接脚注**：脚注（`hint`）本来就写在同一块看板底下，
 *  两句一模一样的话连着出现两遍是看得到的重复（2026-09-25 看图读出来的）。 */
export function kanbanStatusText(pickedTitle: string | null): string {
  if (pickedTitle === null) return KANBAN_COLUMNS_TEXT.idle;
  return '已选中「' + pickedTitle + '」，点目标列的收纳按钮挪过去。';
}

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 看板里的一张卡：一件事，住在某一列里。 */
export interface KanbanCard {
  /** 机器键（事件 `detail` 原样送出）。**非空、整份看板内唯一**。 */
  readonly key: string;
  /** 卡标题（如「葱油饼」）。**非空；永不截断**，长了换行。 */
  readonly title: string;
  /** 卡副语（一行一句人话，如「30 分钟 · 面点 · 主料 3 样」）。 */
  readonly meta?: string;
}

/** 看板里的一列：一个状态，列里住着卡。 */
export interface KanbanColumn {
  /** 机器键（事件 `detail.from`／`to` 就是它）。**非空、看板内唯一**。 */
  readonly key: string;
  /** 列名（如「想做」）。**非空；永不截断**。 */
  readonly name: string;
  /** 这一列是干什么的（如「待做的菜」；列头的第二级字）。不给＝列头只有一行。 */
  readonly purpose?: string;
  /** 计数单位（如「道」；缺省 `件`）。屏上写「2 道」。 */
  readonly unit?: string;
  /** 这一列的卡（顺序就是列身里的顺序；**给空数组 ＝ 设计过的空槽**，不是空白）。 */
  readonly cards: readonly KanbanCard[];
}

/** 看板列入参。`id`／`columns` 两样必填。 */
export interface KanbanColumnsInput {
  /** 看板 `id`（同页唯一；事件 `detail.id` 就是它）。**只许标识符字符**。 */
  readonly id: string;
  /** 各列（**2–4 列**，顺序就是屏上的顺序）。 */
  readonly columns: readonly KanbanColumn[];
  /** 选中态：被选中那一张卡的机器键（须命中一张卡）。不给＝谁也没选中。 */
  readonly pickedKey?: string;
  /** 窄档当前列（1 起，≤列数；缺省 1）。**宽档下它不画出来**（三列本来就并排）。 */
  readonly activeCol?: number;
  /** 形态键（闭集，缺省 `status`）。 */
  readonly form?: KanbanColumnsForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
