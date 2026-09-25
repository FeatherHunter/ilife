/** kanban-columns · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 88 件，2026-09 用户裁定）
 *  里的**两档骨架**：
 *   · **`status`「按状态分列」**（原型 A 档）——列＝状态（想做／在做／做过了），多列并排、列头带计数与「＋」，
 *     卡片能在列之间移动（4/4/4）；
 *   · **`grouped`「按位置分列 ＋ 列内二级组」**（原型 B 档，优化后 4/4/4 补落）——列＝位置
 *     （玄关／厨房／卧室），列里再挂一层二级组（出门要带／调料柜），最小单位是一行物件
 *     （`雨伞` ／ `1 把`）。
 *
 *  形态键写在 `KANBAN_COLUMNS_FORMS` 闭集里：档键取**骨架的名字**（`status`＝按状态分列／
 *  `grouped`＝列内二级组），原型墙上的格号（A／B）不是接口名（同批 `drag-sort` 的 `lift` 同此口径）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *
 *  **触屏地板**（触屏优先法条）：整张卡／整个物件行就是那颗按钮（点它＝选中）；挪动**不走拖拽**——
 *  选中一行、再点目标列那枚看得见的收纳按钮，手机上同一套标记走得通；
 *  取消也在状态句旁边（看得见、点得到）；`:focus-visible` 留给真实键盘用户。
 *  列名与计数**永不截断**（样式段里没有省略手段），状态靠「形 ＋ 字 ＋ 色」三样。
 *
 *  **一屏只留一层话**（用户 2026-09-26 的硬口径：原型里那些旁白／口径句一句都别上屏）：
 *  两档骨架上屏的都只有读数——列名＋列计数、组名＋组计数、行名＋行值、状态句、脚注。
 *  原型 B 档那一段 `c-kan-cap` 长口径、以及列头第二级字（「进门这一块」那类旁白）**一个字节都不搬**：
 *  `grouped` 档的列头根本没有 `purpose` 那一格（给了就 `badInput`，不静默吞掉）。
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
  /* ── `grouped` 档的**二级组**与**物件行**（只有这一档画它们；`status` 档一个字节都不出） ── */
  /** 二级组（组名行 ＋ 组里的物件行；这一列里的一「格」）。 */
  'group',
  /** 组名行（组名 ＋ 组计数；组名底下压一道发丝线，把这一层与物件行分开）。 */
  'ghead',
  /** 组名（如「出门要带」；**永不截断**）。 */
  'gname',
  /** 组计数（如「2 件」；**永不截断**，同一列里几个组各报各的数）。 */
  'gcount',
  /** 一行物件（**整行就是那颗按钮**：点它＝选中／再点＝取消；行上**没有**自己的竖边）。 */
  'row',
  /** 物件的名字（如「雨伞」；**永不截断**）。 */
  'label',
  /** 物件的量（如「1 把」「30 g」；不给就不出这一格）。 */
  'value',
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

/** 形态闭集：本件落地**两档骨架**——
 *   `status`＝列按状态分列（列里的最小单位是一张卡）；
 *   `grouped`＝列按位置分列 ＋ **列里再挂一层二级组**（列里的最小单位是一行物件）。
 *  两档共用同一套交互（点一行拿起 ＋ 点目标列的收纳键挪过去）与同一段运行时段。 */
export const KANBAN_COLUMNS_FORMS = ['status', 'grouped'] as const;
export type KanbanColumnsForm = (typeof KANBAN_COLUMNS_FORMS)[number];

/** 形态类名（挂在本件类名根上）：`status` → `is-status`、`grouped` → `is-grouped`。
 *  **渲染期与运行时段读同一个助手**：运行时段靠它认「这一块是哪一档」（落点线／空槽／组计数／
 *  状态句四处都按形态走）；两处各写一个字面量就会走散——`style-grouped.ts` 里每一条也钉在它上面。 */
export function kanbanColumnsFormClass(form: KanbanColumnsForm): string {
  return 'is-' + form;
}

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
/** 相邻触控目标的缝（px）：卡与卡之间、卡与收纳键之间。**地板口径**见后一枚常量。 */
export const KANBAN_COLUMNS_GAP_PX = 8;
/** 拿起的卡「站起来」往上挪多少（px）。**这是全件唯一允许压掉卡间缝的量**。
 *
 *  **地板口径（三条，判据按这两枚常量算，不写死数字）**：
 *   1. 拿起的卡与它上一张之间那道缝＝`KANBAN_COLUMNS_GAP_PX − KANBAN_COLUMNS_LIFT_PX`（8−2＝6）——
 *      那是这道形自己占的，**全件只此一处**；
 *   2. 其余每一道缝（含拿起的卡与它下一张之间）一律 ≥ `KANBAN_COLUMNS_GAP_PX`；
 *   3. `KANBAN_COLUMNS_LIFT_PX` 只许大于 0 且小于 `KANBAN_COLUMNS_GAP_PX`（否则两道缝会叠在一起）。
 *
 *  样式段只读这里，不另写 2。 */
export const KANBAN_COLUMNS_LIFT_PX = 2;
/** `grouped` 档**二级组**那道竖边的宽度（px）。**全档唯一一道层次边**：物件行自己不带竖边
 *  （原型那里一根组边里再嵌五根行边，左沿六条边在读，层次反而糊）。
 *  组名行底下那一道发丝线（1px）是这一层的另一半——「边准」＝一道 3px 的组边 ＋ 一道 1px 的发丝线。 */
export const KANBAN_COLUMNS_GROUP_EDGE_PX = 3;
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
/** 一列的卡数上限（张）：`status` 档按卡数、`grouped` 档按**全列行数**算（再多请调用方先分组）。 */
export const KANBAN_COLUMNS_MAX_CARDS = 20;
/** 每列的记号（形：列名之外的另一重状态——色 ＋ 字 ＋ 形至少两样才算数）。 */
export const KANBAN_COLUMNS_MARKS = ['●', '▸', '✓', '◆'] as const;

/* ── 文案（缺省的那几句；调用方换列名与卡名，状态句的语义别换） ───────── */

export const KANBAN_COLUMNS_TEXT = Object.freeze({
  /** 脚注：这一件的拿法（只说看得见的通路，不提拖拽那一路）。`status` 档：最小单位是一张卡。 */
  hint: '点一张卡选中，再点目标列的收纳按钮挪过去。',
  /** `grouped` 档的脚注：那一档的最小单位是**一行物件**，字面照实写「一行物件」——
   *  同一句话在两档里指的不是同一样东西，术语不许含糊。 */
  rowHint: '点一行物件选中，再点目标列的收纳按钮挪过去。',
  /** 取消键上的字。 */
  cancel: '取消选中',
  /** 空槽两句：空着也保留列头与计数（空列不许消失）。 */
  emptyTitle: '这一列现在是空的',
  /* 两句话之间不写 `；`：那枚分隔符会撞仓库那把尺子（`test/separator-probe.mjs` 的 R2：
     可见文本里出现 `；` 就是「用符号简化了 UI 展示」的设计债）。 */
  emptyNote: '卡片挪过来就有内容。空着也保留列头与计数',
  /** 没选中时状态句写的那一句（真读数，不是占位）。 */
  idle: '还没选中卡片。',
  /** `grouped` 档没选中那一句（同样是读数：那一档的最小单位是行）。 */
  rowIdle: '还没选中物件。',
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

/** 选中那一句的**模板**（两档同一句语义，只住这一处）：`已选中「X」，点目标列的收纳按钮挪过去。` */
function pickedText(name: string): string {
  return '已选中「' + name + '」，点目标列的收纳按钮挪过去。';
}

/** 状态句（真读数：没选中写一句，选中了写清选的是谁、下一步点哪儿）。
 *  **没选中那一句不再接脚注**：脚注（`hint`）本来就写在同一块看板底下，
 *  两句一模一样的话连着出现两遍是看得到的重复（2026-09-25 看图读出来的）。 */
export function kanbanStatusText(pickedTitle: string | null): string {
  if (pickedTitle === null) return KANBAN_COLUMNS_TEXT.idle;
  return pickedText(pickedTitle);
}

/** 形态 `grouped` 的状态句：选中那一句与 `status` 档**逐字节同一句**（模板只住上面一处）；
 *  差别只在没拿起的那一句与脚注——那一档的最小单位是**一行物件**，字面照实写。 */
export function kanbanRowStatusText(pickedLabel: string | null): string {
  if (pickedLabel === null) return KANBAN_COLUMNS_TEXT.rowIdle;
  return pickedText(pickedLabel);
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

/** 看板里的一列：一个状态。`status` 档的列用 `cards` 装东西（列头带计数与「＋」）。 */
export interface KanbanColumn {
  /** 机器键（事件 `detail.from`／`to` 就是它）。**非空、看板内唯一**。 */
  readonly key: string;
  /** 列名（如「想做」／`grouped` 档如「玄关」）。**非空；永不截断**。 */
  readonly name: string;
  /** `status` 档专用：这一列是干什么的（如「待做的菜」；列头的第二级字）。不给＝列头只剩「列名 ＋ 计数」**两行**。
   *  **`grouped` 档不许给**（那一档列头只留读数：列名＋计数；旁白不上屏）。 */
  readonly purpose?: string;
  /** 计数单位（如「道」；缺省 `件`）。屏上写「2 道」。**两档共用一个单位**（组计数也用它）。 */
  readonly unit?: string;
  /** `status` 档专用：这一列的卡（顺序就是列身里的顺序；**给空数组 ＝ 设计过的空槽**，不是空白）。
   *  **`grouped` 档不许给**（那一档拿 `groups` 装东西）。 */
  readonly cards?: readonly KanbanCard[];
  /** `grouped` 档专用：这一列的二级组（**至少一组**，顺序就是屏上的顺序）。`status` 档不许给。 */
  readonly groups?: readonly KanbanGroup[];
}

/** `grouped` 档的一行物件：一件东西 ＋ 它的量（如「雨伞 ／ 1 把」）。**整行就是那颗按钮**。 */
export interface KanbanGroupItem {
  /** 机器键（事件 `detail.key` 原样送出，卡落过去之后靠它认人）。**非空、整份看板内唯一**（与列键也不许撞）。 */
  readonly key: string;
  /** 物件的名字（如「雨伞」）。**非空；永不截断**。 */
  readonly label: string;
  /** 物件的量（如「1 把」「30 g」；不给＝这一行只有名字）。给了就不能只有空白。 */
  readonly value?: string;
}

/** `grouped` 档的一个二级组：这一列里的一「格」（如「出门要带」「调料柜」）。
 *  组名自己一行并压一道发丝线，组里的行挂在它下面（缩进）；组**没有机器键**——本件不拿它当数据（落点由结构定）。 */
export interface KanbanGroup {
  /** 组名（如「出门要带」）。**非空；永不截断**。 */
  readonly name: string;
  /** 组里的物件行（**给空数组 ＝ 设计过的空格**：组名与计数照常在，屏上不写旁白）。 */
  readonly items: readonly KanbanGroupItem[];
}

/** 看板列入参。`id`／`columns` 两样必填。 */
export interface KanbanColumnsInput {
  /** 看板 `id`（同页唯一；事件 `detail.id` 就是它）。**只许标识符字符**。 */
  readonly id: string;
  /** 各列（**2–4 列**，顺序就是屏上的顺序）。 */
  readonly columns: readonly KanbanColumn[];
  /** 选中态：被拿起那一行的机器键（`status` 档＝一张卡的键、`grouped` 档＝一行物件的键；
   *  须命中看板里真有的那一行）。不给＝谁也没拿起。 */
  readonly pickedKey?: string;
  /** 窄档当前列（1 起，≤列数；缺省 1）。**宽档下它不画出来**（三列本来就并排）。 */
  readonly activeCol?: number;
  /** 形态键（闭集，缺省 `status`）。 */
  readonly form?: KanbanColumnsForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
