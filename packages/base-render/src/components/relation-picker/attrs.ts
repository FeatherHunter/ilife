/** relation-picker · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 90 件，2026-09 用户裁定）
 *  里**两档都过**的两个形态：
 *   · **形态 `overlay`「浮层选一个」**（原型 A）：字段行一枚看得见的触发键，点开是一块顶层浮面——
 *     搜一行 ＋「最近用过」一组 ＋「全部」一组 ＋ 末行「新建」；
 *   · **形态 `inline`「行内展开选一个」**（原型 B）：不浮层，整块就在字段行下面推开——先选源
 *     （最近一排 ＋ 可搜的列表 ＋ 末行「新建」），选完收成一行读得出的结果（✓ ＋ 选了什么 ＋ 一枚真按钮「换」）。
 *  两档共用同一份选项表：`inline` 就是把 `overlay` 浮面里的那三组搬进行内。
 *
 *  它替掉的两种错法（原型墙那一格的原文）：①「下拉里几十个按拼音排，最常用的每次都得滚」；
 *  ②「库里还没有的时候只能退出去先建好再回来选」。
 *
 *  **零键盘通路**：选一个实体**必须能用手点做完**——搜索框可打字，但每一行都是整行可点的 `<button>`，
 *  不点键盘也选得完；标记与文案里没有一处键帽／键名／方向键（`:focus-visible` 只留给真实键盘用户，是地板不是通路）。
 *
 *  **形态键写在 `RELATION_PICKER_FORMS` 闭集**（`overlay`／`inline`，两个都是英文键，不许用 A/B 当键）；
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `RELATION_PICKER_CLASS + '-' + 槽名`。 */
export const RELATION_PICKER_CLASS = 'ilife-block-relation-picker';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。 */
export const RELATION_PICKER_SLOTS = [
  /** 字段行：标签 ＋ 触发键（读的是当前值）。 */
  'field',
  /** 字段标签（如「账户」，后面跟一句状态）。 */
  'label',
  /** 字段标签后面那句状态（「正在选」／「已选」）。 */
  'state',
  /** 触发键（`overlay` 下带 `popovertarget` 指浮面；`inline` 下是行内那块的开关）。 */
  'box',
  /** 触发键里读的当前值（选中的那一项的名字，没选＝还没选）。 */
  'value',
  /** 触发键右端那枚记号（纯装饰，`aria-hidden`）。 */
  'caret',
  /** 浮面本体（只在 `overlay` 下有；原生 `popover`，住顶层）。 */
  'panel',
  /** 行内展开那一块（只在 `inline` 下有；选完收起时 `hidden`）。 */
  'inline',
  /** 输入行（输入框 ＋ 清空键）。 */
  'in',
  /** 搜索输入框。 */
  'q',
  /** 清空搜索那枚键（44×44）。 */
  'clear',
  /** 列头行（`overlay` 下「 sources 名／读数名」那一行：两条列名与下面每行同一条内边距）。 */
  'colh',
  /** 列头左段（sources 名）。 */
  'col',
  /** 列头右段（读数名）。 */
  'colr',
  /** 一枚分组标题（最近用过／全部）。 */
  'grp',
  /** 一组的行容器（行与行之间留 8px 缝：相邻触控目标的地板）。 */
  'rows',
  /** 一行选项（**整行就是那颗按钮**）。 */
  'row',
  /** 行左那枚记号（✓ 选中／○ 没选；纯装饰，`aria-hidden`）。 */
  'mk',
  /** 行的文字格（名字 ＋ 副语）。 */
  'tx',
  /** 行名字（**许换行、不许 `…` 截断**）。 */
  'name',
  /** 行副语（一行一句人话：上次哪天、在哪一层）。 */
  'note',
  /** 行右端读数（余额／件数，已经是给人看的样子）——**永不 `…` 截断**。 */
  'reading',
  /** 行尾那一枚（选中的写「已选」、其余写「选它」——状态除颜色外还有字；只在 `inline` 列表里有）。 */
  'pick',
  /** 命中词（`<mark>`：形是下划线加粗，字是加粗 ⇒ 不只靠颜色）。 */
  'hit',
  /** 最近一排（`inline` 下横排换行的那一排）。 */
  'quick',
  /** 最近一排里的一枚（点它＝选中那一项）。 */
  'chip',
  /** 最近一枚上的「用过」小标（纯装饰）。 */
  'tag',
  /** 「全部」那一组的组头（组名 ＋ 几个）。 */
  'gh',
  /** 组头右端那句读数（`4 个`）。 */
  'count',
  /** 全部那一列（`inline` 下单列的列表容器）。 */
  'list',
  /** 末行「新建」那一排。 */
  'new',
  /** 新建排前面那句（「没找到？」）。 */
  'newlabel',
  /** 新建那枚键（把当前搜索词直接建成新的）。 */
  'create',
  /** 空态（一条都没命中时出来，`role="status"` 会念出来）。 */
  'empty',
  /** 脚注行（这一屏现在是什么状态：列的是常用去处／命中几条／换个词）。 */
  'foot',
  /** 错态那一行（写在输入框下边，并由输入框的 `aria-describedby` 指到它）。 */
  'err',
  /** 选完收成的那一行结果（✓ ＋ 选了什么 ＋ 一枚真按钮「换」；只在 `inline` 下有）。 */
  'chosen',
  /** 结果行左端那枚 ✓（纯装饰）。 */
  'tick',
  /** 结果行的文字格（选了什么 ＋ 底下那句交代）。 */
  'result',
  /** 结果行底下那句交代（字段行与这一行始终读的是同一个值）。 */
  'why',
  /** 「换」那枚键（44×44 真按钮：重新摊开行内那一块）。 */
  'change',
  /** 卡底那句提示。 */
  'hint',
] as const;
export type RelationPickerSlot = (typeof RELATION_PICKER_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RELATION_PICKER_CLASS + '-' + …`）。 */
export function relationPickerSlot(slot: RelationPickerSlot, prefix = 'ilife-'): string {
  return prefix + 'block-relation-picker-' + slot;
}

/** 形态闭集：`overlay`「浮层选一个」（原型 A）／`inline`「行内展开选一个」（原型 B）。 */
export const RELATION_PICKER_FORMS = ['overlay', 'inline'] as const;
export type RelationPickerForm = (typeof RELATION_PICKER_FORMS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝机器键 `id`）。 */
export const RELATION_PICKER_ATTR = 'data-ilife-relation-picker';
/** 形态（值是闭集内的那一个键，照实写进标记）。 */
export const RELATION_PICKER_FORM_ATTR = 'data-ilife-relation-form';
/** 触发键（值＝`id`）：`overlay` 下运行时按它同步 `aria-expanded`。 */
export const RELATION_PICKER_OPEN_ATTR = 'data-ilife-relation-open';
/** 浮面（值＝`id`；`overlay` 下是 `popover` 的 `id`）。 */
export const RELATION_PICKER_PANEL_ATTR = 'data-ilife-relation-panel';
/** 行内那一块（值＝`id`）。 */
export const RELATION_PICKER_INLINE_ATTR = 'data-ilife-relation-inline';
/** 搜索输入框（值＝`id`）。 */
export const RELATION_PICKER_QUERY_ATTR = 'data-ilife-relation-query';
/** 清空搜索那枚键（值＝`id`）。 */
export const RELATION_PICKER_CLEAR_ATTR = 'data-ilife-relation-clear';
/** 一行选项（值＝这一行的机器键）。 */
export const RELATION_PICKER_ITEM_ATTR = 'data-ilife-relation-item';
/** 一行的**可搜底串**（小写；输入框里打的词在它里面找子串）。 */
export const RELATION_PICKER_SEARCH_ATTR = 'data-ilife-relation-search';
/** 行的名字格（运行时按它重画命中词；它的 `textContent` 就是这一行的名字）。 */
export const RELATION_PICKER_NAME_ATTR = 'data-ilife-relation-name';
/** 「最近用过」组里的那一行（值 `1`）。 */
export const RELATION_PICKER_RECENT_ATTR = 'data-ilife-relation-recent';
/** 分组标题（值＝`recent`／`all`）。 */
export const RELATION_PICKER_GROUP_ATTR = 'data-ilife-relation-group';
/** 空态那一行（值＝`id`）。 */
export const RELATION_PICKER_EMPTY_ATTR = 'data-ilife-relation-empty';
/** 脚注行（值＝`id`）。 */
export const RELATION_PICKER_FOOT_ATTR = 'data-ilife-relation-foot';
/** 命中词（`<mark>`，值 `1`）。 */
export const RELATION_PICKER_HIT_ATTR = 'data-ilife-relation-hit';
/** 新建那枚键（值＝当前搜索词：点它就是把这个词建成新的）。 */
export const RELATION_PICKER_CREATE_ATTR = 'data-ilife-relation-create';
/** 字段行里读当前值的那一格（运行时选中一变就重写它）。 */
export const RELATION_PICKER_VALUE_ATTR = 'data-ilife-relation-value';
/** 选完那一行结果（值＝`id`；只在 `inline` 下有）。 */
export const RELATION_PICKER_CHOSEN_ATTR = 'data-ilife-relation-chosen';
/** 「换」那枚键（值＝`id`：重新摊开行内那一块）。 */
export const RELATION_PICKER_CHANGE_ATTR = 'data-ilife-relation-change';
/** 记账：这枚触发键已被运行时段接管（幂等读数，不是开关）。 */
export const RELATION_PICKER_BOUND_ATTR = 'data-ilife-relation-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const RELATION_PICKER_RUNTIME_ATTR = 'data-ilife-relation-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 选中一行：`detail={id,key,title}`；`overlay` 下浮面此时已收起，`inline` 下行内那块已收成结果行。 */
export const RELATION_PICKER_EVENT_SELECT = 'ilife:relation-picker-select';
/** 点了新建：`detail={id,value}`（`value`＝当前搜索词；本件不写库，只报「要建什么」）。 */
export const RELATION_PICKER_EVENT_CREATE = 'ilife:relation-picker-create';
/** 输入即筛之后报一次真读数：`detail={id,query,hits}`（hits＝现在露着的行数）。 */
export const RELATION_PICKER_EVENT_QUERY = 'ilife:relation-picker-query';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：命中盒不小于这个数（px）。 */
export const RELATION_PICKER_TOUCH_PX = 44;
/** 一行选项的高度下限（px）：整行是命中区，比地板再宽裕一档。 */
export const RELATION_PICKER_ROW_MIN_PX = 52;
/** 相邻触控目标的缝（px）：行与行之间、独立控件之间都按它让开。 */
export const RELATION_PICKER_GAP_PX = 8;
/** 字段行与浮面的宽上限（px）：宽档下也不铺满屏（浮面是浮面，不是整页）。 */
export const RELATION_PICKER_PANEL_MAX_PX = 460;
/** 浮面离屏边至少留多少（px）。 */
export const RELATION_PICKER_EDGE_PX = 14;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const RELATION_PICKER_CONTAINER = 'ilife-relation-picker';
/** 窄档断点（px）：**本件自己**窄于它就收行内左右内边距与那两道缝。这是容器断点，不是视口断点。 */
export const RELATION_PICKER_NARROW_PX = 560;
/** 悬停只许是增强：这一段能力查询**样式段与运行时读同一个串**（两边必须说同一件事）。 */
export const RELATION_PICKER_HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** 浮面贴触发键的两条能力查询：**样式段与运行时段读同一个串**（两边对「这个引擎支不支持」必须说同一件事）。
 *  支持 ⇒ CSS 锚定定位（`position-area` 贴触发键下沿，贴不下翻上去）；不支持 ⇒ 打开时运行时按触发键
 *  的矩形算 `left`／`top`。口径同 `popover-menu`（`MENU_ANCHOR_QUERY`／`MENU_AREA_QUERY`）。 */
export const RELATION_PICKER_ANCHOR_QUERY = 'anchor-name: --a';
export const RELATION_PICKER_AREA_QUERY = 'position-area: bottom';
/** 逐实例锚名的前缀（完整名＝前缀 ＋ 入参 `id`）：触发键写 `anchor-name`、浮面写 `position-anchor`，
 *  两处写**同一个**名字——静态 CSS 认不出逐实例的名字（同 `popover-menu` 的 `--ilife-menu-<id>`）。 */
export const RELATION_PICKER_ANCHOR_PREFIX = '--ilife-relation-picker-';

/* ── 文案（缺省的那几句；调用方可以换，但语义别换） ─────────────────── */

/** 缺省文案与状态句（渲染期与运行时段**读同一份**，免得两处各写一句）。 */
export const RELATION_PICKER_TEXT = Object.freeze({
  /** 还没选中时触发键里读的那一句。 */
  unpicked: '还没选',
  /** 字段标签后面那句状态：正在选／已选。**选中一变这一句也要跟着换**——字段行读的是同一份事实
   *  （运行时段里它跟值那一格一起重写；不然「已选的那一项」旁边还写着「正在选」）。 */
  stateLead: '— ',
  picking: '正在选',
  picked: '已选',
  /** 分组标题两枚。 */
  recentGroup: '最近用过',
  allGroup: '全部',
  /** 行尾那一枚：选中的写「已选」、其余写「选它」。 */
  pickedTag: '已选',
  pickTag: '选它',
  /** 触发键右端那枚记号。 */
  caret: '▾',
  /** 选中记号：✓ 选中／○ 没选。
   *  未选态原来写中点 `·`（U+00B7）——那正是仓库分隔符门的 R1 命中（可见文本零豁免），
   *  与 README 契约 13 自己写的「不出现 `·`」矛盾（2026-09 对抗审查读出：overlay 节点级 4 处／
   *  inline 2 处，`separator-probe` exit=1）。改成空圆环 `○`：与 `radio-cards`／`wizard-shell` 的
   *  「空圆环（未选）」、`goal-stairs` 的「还没开始 ○」同一套形语汇，且不是分隔符。 */
  tick: '✓',
  dot: '○',
  /** 清空搜索那枚键的无障碍名（键上写的是 ✕）。 */
  clear: '清空搜索',
  /** 末行新建排前面那句。 */
  newPrefix: '没找到？',
  /** 新建那枚键的字（中间夹着当前搜索词；搜索词为空时退成下一句）。 */
  createPre: '新建「',
  createPost: '」',
  createEmpty: '新建一个',
  /** 「换」那枚键的字。 */
  change: '换',
  /** 选完那一行结果的前缀（运行时重写结果行时带上它，不丢「选好了」三字）。 */
  chosenPre: '选好了',
  /** 空态：没有一条命中时写的那句话（中间夹着用户打的词）。 */
  emptyPre: '没有找到与「',
  emptyPost: '」相关的，去末行新建一个。',
  /** 脚注三档：空输入列常用去处／命中几条／一条没中。 */
  footIdle: '「最近用过」排最前，点任意一行就选好。',
  /** 没有 `recentKeys`（屏上没有「最近用过」这一组）时，空输入那一档的脚注。
   *  **脚注跟着实际分区走**：缺了这一组还写「排最前」，就是一句屏上兑不出来的空许诺
   *  （2026-09 对抗审查读出：无 `recentKeys` 的实例脚注仍写「「最近用过」排最前」，而分组只有 `all`）。 */
  footIdlePlain: '全部都在下面，点任意一行就选好。',
  footHitPre: '命中 ',
  footHitPost: ' 条，点任意一行就选好。',
  footNone: '换个短一点的词试试，搜不到就去末行新建。',
} as const);

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 一个可选的实体（库里已经存在的那一个）。 */
export interface RelationPickerOption {
  /** 机器键（点这一行时原样送出）。**非空、只许标识符字符**，表内唯一。 */
  readonly key: string;
  /** 名字（如「招行储蓄卡」）。**非空**；命中词在这里标出来；许换行、不许 `…` 截断。 */
  readonly title: string;
  /** 副语（一行一句人话，如「上次 09-24，记了 3 笔」）。**这一串由调用方给**：本件自己的记号与文案
   *  一律过仓库分隔符门（README 契约 13），调用方塞进来的 `·`／`；` 由调用方负责。 */
  readonly note?: string;
  /** 行右端读数（余额／件数，**已经是给人看的样子**：取整与千分位归调用方）。**永不 `…` 截断**。 */
  readonly reading?: string;
}

/** 关系选择器入参。`id`／`label`／`options` 三样必填——没有 `id`，浮面的 `id` 与触发键就接不上。 */
export interface RelationPickerInput {
  /** 机器键（浮面 `id`、行内 `id` 与事件 `detail.id` 都拿它拼）。**非空、同页唯一、只许标识符字符**。 */
  readonly id: string;
  /** 字段标签（如「账户」／「物品放在哪儿」）。**非空**。 */
  readonly label: string;
  /** 全部选项（顺序＝「全部」组里的顺序；**至少一项**）。 */
  readonly options: readonly RelationPickerOption[];
  /** 「最近用过」那几项的机器键（子集，**至多 6 项**；顺序＝屏上顺序）。不给＝不出这一组。 */
  readonly recentKeys?: readonly string[];
  /** 当前选中的机器键（必须命中一项；给了＝字段行读它的名字、列表里那一行是选中态）。 */
  readonly selectedKey?: string;
  /** 搜索框里的初值（渲染期就按它筛一遍；不给＝空，列出全部）。首尾空白一律去掉。 */
  readonly query?: string;
  /** 「全部」组名的字（缺省按 `label` 拼：如「全部账户」；给了就用调用方的）。 */
  readonly allLabel?: string;
  /** 读数列的列头（缺省不出列头行；如「余额」）。给了＝`overlay` 下出列头行。 */
  readonly readingLabel?: string;
  /** 末行新建排前面那句（缺省「没找到？」）。 */
  readonly newPrefix?: string;
  /** 空态那句的定制版（不给就按搜索词现拼）。 */
  readonly emptyText?: string;
  /** 卡底那句提示。 */
  readonly hint?: string;
  /** 错态（写在输入框下边的那一句；给了就出这一行）。 */
  readonly error?: string;
  /** 行内那一块渲染时就摊开（只在 `inline` 下有意义；选中有值时缺省收起，给 `true`＝硬摊开）。 */
  readonly open?: boolean;
  /** 形态键（闭集，缺省 `overlay`）。 */
  readonly form?: RelationPickerForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
