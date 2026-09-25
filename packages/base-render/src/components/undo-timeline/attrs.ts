/** undo-timeline · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 85 件，2026-09 用户裁定）
 *  里**两档都过**的两个形态：
 *   · **形态 `track`「一条轨」**：一列改动按时间往下排，每条写三样——**谁的改动**（动作句）、
 *     **动了什么读数**（前后两个数）、**能不能撤**（按钮 ＋ 状态片）；撤过的划掉并写清"已撤销"。
 *   · **形态 `impact`「一次改动的回滚单」**：针对**一次**改动的**影响面清单**——
 *     逐项写清「撤这一项会连带什么」，勾哪几项就撤哪几项（默认全勾，个别项默认不勾）。
 *  两档共用同一条回滚单骨架：`track` 的每一行可以把回滚单**就地摊开**（一次只开一块），
 *  `impact` 就是这张回滚单单独成件。
 *
 *  它替掉的两种错法（原型墙那一格的原文）：①「改错了只能凭记忆手动改回去」；
 *  ②「撤销了不知道会连带动到哪几张报表、哪条预算」。
 *
 *  **零键盘通路**：撤销这种动作**必须能用手点做完**——每一枚动作都是看得见的 `<button>`，
 *  标记与文案里没有一处键帽／键名／方向键（`:focus-visible` 只留给真实键盘用户，是地板不是通路）。
 *
 *  **形态键写在 `UNDO_TIMELINE_FORMS` 闭集**（`track`／`impact`，两个都是英文键）；
 *  **三态写在 `UNDO_TIMELINE_STATES` 闭集**（`undoable` 能撤／`undone` 已撤／`locked` 不能撤）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `UNDO_TIMELINE_CLASS + '-' + 槽名`。 */
export const UNDO_TIMELINE_CLASS = 'ilife-block-undo-timeline';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。 */
export const UNDO_TIMELINE_SLOTS = [
  /** 卡头那一排：标题 ＋ 右端那句读数。 */
  'head',
  /** 卡头标题（如「改动记录」）。 */
  'title',
  /** 卡头右端那句（如「只留 30 天，共 12 条」）——**永不 `…` 截断**。 */
  'cap',
  /** 条目那一列（`track` 形态）。 */
  'list',
  /** 一条改动（挂 `is-undoable`／`is-undone`／`is-locked` 三态之一）。 */
  'row',
  /** 时刻（等宽数字；**永不 `…` 截断**）。 */
  'time',
  /** 竖轨（纯装饰：一根通的线，`aria-hidden`）。 */
  'rail',
  /** 轨上的圆点（三态各一种形：实心／空心／带斜杠）。 */
  'dot',
  /** 三行文字那一格。 */
  'body',
  /** 动作句：**谁改了什么**。 */
  'say',
  /** 读数那一行：**动了什么读数**（逐条一枚 `rdg`，段间靠列距不写分隔符）。 */
  'eff',
  /** 一条读数（读数名 ＋ 改前 ＋ 箭头 ＋ 改后）。 */
  'rdg',
  /** 读数名（如「本月餐饮」）。 */
  'rlabel',
  /** 改前的值（带删除线——**形**的一重）。 */
  'from',
  /** 改前到改后之间的那支箭头（纯装饰）。 */
  'arrow',
  /** 改后的值（强调字重——**字**的一重）。 */
  'to',
  /** 读数下面那句补充（如「不动任何合计」）。 */
  'note',
  /** 状态片／影响片（「已撤销，读数已还原」／「不可撤：超出 30 天」／调用方给的影响面一句）。 */
  'tag',
  /** 行右端那一格（放按钮）。 */
  'act',
  /** 一枚按钮的视觉件（本件四枚按钮都带它，写一次长相）。 */
  'bt',
  /** 按钮上正常态那枚字。 */
  'label',
  /** 同一枚按钮忙碌态的字——**住在 `label` 里面**、绝对定位在它这块上（两枚字落在同一处）。 */
  'busy',
  /** 行里那枚主按钮（撤销这次改动／恢复这笔／已不可撤）。 */
  'go',
  /** 错态那句字（写在那一行按钮旁边，`aria-describedby` 指它）。 */
  'error',
  /** 空态（这一段时间里没有改动时出来，`role="status"`）。 */
  'empty',
  /** 就地回滚单（一次改动的影响面清单；一次只开一块）。 */
  'pick',
  /** 回滚单的头（标题 ＋ 那句交代）。 */
  'pkh',
  /** 回滚单标题（如「13:58 的那次改动」）。 */
  'pkt',
  /** 回滚单那句交代（在哪个页上改的、用什么改的）。 */
  'pkn',
  /** 回滚单里的行容器。 */
  'picks',
  /** 回滚单里的一行（**整行是 `<label>`**＝命中区）。 */
  'item',
  /** 勾选框的命中盒（44×44，视觉盒只有 24×24）。 */
  'check',
  /** 勾选框的视觉盒（纯装饰：真状态在原生 `<input>` 上）。 */
  'box',
  /** 一行的文字格（一句话后果 ＋ 副语）。 */
  'ibody',
  /** 一行的一句话后果。 */
  'ititle',
  /** 一行的副语（如「餐饮 → 外卖，09-24 晚餐 88.00」）。 */
  'inote',
  /** 行右端读数（`3 条`）——**永不 `…` 截断**。 */
  'count',
  /** 这一行为什么勾不动（写出来，不只染色）。 */
  'why',
  /** 页脚（结论句 ＋ 动作）。 */
  'foot',
  /** 页脚那句结论（按勾了几项现算）。 */
  'sum',
  /** 整段回滚那枚（`track` 的页脚：回到某个时刻）。 */
  'roll',
  /** 取消那枚（回滚单的页脚）。 */
  'cancel',
  /** 主按钮那枚（撤销这 N 项）。 */
  'submit',
  /** 卡底那句提示（也是"按不动"的说明）。 */
  'hint',
] as const;
export type UndoTimelineSlot = (typeof UNDO_TIMELINE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `UNDO_TIMELINE_CLASS + '-' + …`）。 */
export function undoTimelineSlot(slot: UndoTimelineSlot, prefix = 'ilife-'): string {
  return prefix + 'block-undo-timeline-' + slot;
}

/** 形态闭集：`track`「一条轨」／`impact`「一次改动的回滚单（影响面清单）」。 */
export const UNDO_TIMELINE_FORMS = ['track', 'impact'] as const;
export type UndoTimelineForm = (typeof UNDO_TIMELINE_FORMS)[number];

/** 三态闭集：`undoable` 能撤／`undone` 已撤／`locked` 不能撤。
 *  **三态不许只靠颜色**：色之外至少还有两重——片上的字（已撤销／不可撤）＋ 圆点的形（实心／空心／带斜杠）
 *  ＋ 动作句的删除线＋按钮上的字。 */
export const UNDO_TIMELINE_STATES = ['undoable', 'undone', 'locked'] as const;
export type UndoTimelineState = (typeof UNDO_TIMELINE_STATES)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝机器键 `name`）。 */
export const UNDO_TIMELINE_ATTR = 'data-ilife-undo-timeline';
/** 形态（值是闭集内的那一个键，照实写进标记）。 */
export const UNDO_TIMELINE_FORM_ATTR = 'data-ilife-undo-form';
/** 一条改动的机器键（值＝`entries[].key`）。 */
export const UNDO_TIMELINE_KEY_ATTR = 'data-ilife-undo-key';
/** 一条改动的三态（值＝`UNDO_TIMELINE_STATES` 之一）。 */
export const UNDO_TIMELINE_STATE_ATTR = 'data-ilife-undo-state';
/** 行里那枚主按钮（值＝`entries[].key`；带 `aria-controls` 的那一枚按下去就摊开回滚单）。 */
export const UNDO_TIMELINE_GO_ATTR = 'data-ilife-undo-go';
/** 就地回滚单（值＝`entries[].key`）。 */
export const UNDO_TIMELINE_PICK_ATTR = 'data-ilife-undo-pick';
/** 回滚单里的一行（值＝这一行的机器键；原生 `<input value>` 也写同一份）。 */
export const UNDO_TIMELINE_ITEM_ATTR = 'data-ilife-undo-item';
/** **渲染时就勾上**的那一行（选择一变，页脚那句结论就按新选择重算）。 */
export const UNDO_TIMELINE_ON_ATTR = 'data-ilife-undo-on';
/** 回滚单脚上那句结论的落点（运行时原地改写的就是它）。 */
export const UNDO_TIMELINE_SUM_ATTR = 'data-ilife-undo-sum';
/** 结论句后半段那句**注**（前半段「勾了 N 项」是按勾了几项现算的，运行时要拿它把整句重拼）。 */
export const UNDO_TIMELINE_NOTE_ATTR = 'data-ilife-undo-note';
/** 主按钮（值＝`entries[].key`，`impact` 形态下值＝`change.key`）。 */
export const UNDO_TIMELINE_SUBMIT_ATTR = 'data-ilife-undo-submit';
/** 收起就地回滚单的那枚（`track` 的回滚单页脚；收起后焦点还给按它的那一枚按钮）。 */
export const UNDO_TIMELINE_CLOSE_ATTR = 'data-ilife-undo-close';
/** 取消（`impact` 形态的页脚；没有就地可收的块，故它只派发事件）。 */
export const UNDO_TIMELINE_CANCEL_ATTR = 'data-ilife-undo-cancel';
/** 恢复那枚（值＝`entries[].key`）。 */
export const UNDO_TIMELINE_RESTORE_ATTR = 'data-ilife-undo-restore';
/** 整段回滚那枚（值＝它的字）。 */
export const UNDO_TIMELINE_ROLL_ATTR = 'data-ilife-undo-roll';
/** 忙碌标记（`1`＝这一枚正在跑：字原地换掉、宽度锁住、按钮按不动）。 */
export const UNDO_TIMELINE_BUSY_ATTR = 'data-ilife-undo-busy';
/** 记账：这根根已被运行时段接管（幂等读数，不是开关）。 */
export const UNDO_TIMELINE_BOUND_ATTR = 'data-ilife-undo-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const UNDO_TIMELINE_RUNTIME_ATTR = 'data-ilife-undo-runtime';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 撤销：`detail={name,key,items}`（`items`＝勾上的那几项影响面的键；没有影响面时是空数组）。 */
export const UNDO_TIMELINE_EVENT_UNDO = 'ilife:undo-timeline-undo';
/** 恢复：`detail={name,key}`（把一条**已撤销**的改动重新做一遍——逆操作本身也是一条新记录）。 */
export const UNDO_TIMELINE_EVENT_RESTORE = 'ilife:undo-timeline-restore';
/** 整段回滚：`detail={name,label}`（`track` 页脚那枚；要不要二次确认归调用方）。 */
export const UNDO_TIMELINE_EVENT_ROLLBACK = 'ilife:undo-timeline-rollback';
/** 勾选变化报一次真读数：`detail={name,key,items,count}`（`count`＝现在勾着几项）。 */
export const UNDO_TIMELINE_EVENT_PICK = 'ilife:undo-timeline-pick';
/** 取消：`detail={name}`（`impact` 形态的页脚那枚）。 */
export const UNDO_TIMELINE_EVENT_CANCEL = 'ilife:undo-timeline-cancel';

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：命中盒不小于这个数（px）。 */
export const UNDO_TIMELINE_TOUCH_PX = 44;
/** 一条改动的高度下限（px）：整行是竖向的节奏，窄档也不许压字。 */
export const UNDO_TIMELINE_ROW_MIN_PX = 56;
/** 相邻触控目标的缝（px）。 */
export const UNDO_TIMELINE_GAP_PX = 8;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const UNDO_TIMELINE_CONTAINER = 'ilife-undo-timeline';
/** 窄档断点（px）：**本件自己**窄于它就把时刻排到动作句上面、按钮占满整行。这是容器断点。 */
export const UNDO_TIMELINE_NARROW_PX = 560;
/** 按下那一刻的色阶／缩放的时长（ms；≤80ms，只碰 `transform` 与 `opacity`）。 */
export const UNDO_TIMELINE_PRESS_MS = 80;
/** 悬停只许是增强：这一段能力查询**样式段与运行时读同一个串**（两边必须说同一件事）。 */
export const UNDO_TIMELINE_HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/* ── 文案 ───────────────────────────────────────────────────────── */

/** 缺省文案住同目录 `text.ts`（本文件已经装到告警线边上，而文案不是标记形状）。
 *  取值一个字节都没动；用法与判据按同一个入口读。 */
export {
  UNDO_TIMELINE_BUSY_PRE,
  UNDO_TIMELINE_CANCEL_TEXT,
  UNDO_TIMELINE_EMPTY_TEXT,
  UNDO_TIMELINE_GO_TEXT,
  UNDO_TIMELINE_LOCKED_SEP,
  UNDO_TIMELINE_MISSING,
  UNDO_TIMELINE_STATE_TAG,
  UNDO_TIMELINE_SUBMIT_POST,
  UNDO_TIMELINE_SUBMIT_PRE,
  UNDO_TIMELINE_SUBMIT_ZERO,
  UNDO_TIMELINE_SUM_MID,
  UNDO_TIMELINE_SUM_NOTE,
  UNDO_TIMELINE_SUM_PRE,
  UNDO_TIMELINE_SUM_ZERO,
  UNDO_TIMELINE_TITLE,
  UNDO_TIMELINE_WHY_TEXT,
} from './text.js';

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 一条读数：**改前是什么、改后是什么**（如「本月餐饮 1,284.00 → 1,096.00」）。
 *  值一律是**已经是给人看的样子**的串（取整与千分位归调用方）——本件只负责摆开。 */
export interface UndoTimelineReading {
  /** 读数名（如「本月餐饮」）；不给＝这一条只有两个数。 */
  readonly label?: string;
  /** 改前的值。**非空**；带上删除线（**形**的一重，不是只靠颜色）。 */
  readonly from: string;
  /** 改后的值。**非空**；加粗（**字**的一重）。 */
  readonly to: string;
}

/** 回滚单里的一行：撤这一项会连带什么。 */
export interface UndoTimelineImpactRow {
  /** 机器键（原生 `<input value>` 与事件 `detail.items`）。**非空、清单内唯一**。 */
  readonly key: string;
  /** 一句话后果（如「3 条记录的「分类」」）。**非空**；许换行、不许 `…` 截断。 */
  readonly title: string;
  /** 副语（如「餐饮 → 外卖，09-24 晚餐 88.00」）。 */
  readonly note?: string;
  /** 行右端读数（`3 条`／`2 处`，**已是给人看的样子**）。**永不 `…` 截断**。 */
  readonly count?: string;
  /** 一开始就勾上（缺省 `true`：撤销＝回到改动前，默认都撤；个别项默认不勾时显式给 `false`）。
   *  **勾不动的那一行相反**（缺省不勾，且不许给 `true`）——它撤不了，数进去只会让页脚那句话骗人。 */
  readonly checked?: boolean;
  /** 勾不动：`<input disabled>` ＋ `cursor: not-allowed`（"看着能勾、勾了不算"是不许留的中间档）。 */
  readonly locked?: boolean;
  /** 勾不动的原因（**写出来**，不只染色；只在 `locked: true` 时给）。 */
  readonly lockedReason?: string;
}

/** 一次改动的回滚单（`impact` 形态的主体；也是 `track` 每一行就地摊开的那一块）。 */
export interface UndoTimelineImpact {
  /** 回滚单标题（如「13:58 的那次改动」）。**非空**。 */
  readonly title: string;
  /** 那句交代（在哪个页上改的、用什么改的）。 */
  readonly note?: string;
  /** 影响面逐项（**至少一项**；顺序＝调用方给的顺序）。 */
  readonly rows: readonly UndoTimelineImpactRow[];
  /** 页脚那句结论的**注**（前半段「勾了 N 项」是按勾了几项现算的，不归调用方）。 */
  readonly sumNote?: string;
  /** 取消那枚的字（缺省 `取消`）。 */
  readonly cancelLabel?: string;
}

/** 一条改动（`track` 形态的一行）。 */
export interface UndoTimelineEntry {
  /** 机器键（事件 `detail.key`；行内 `id` 拼它）。**非空、清单内唯一**。 */
  readonly key: string;
  /** 时刻（`13:58`，照原样上屏）。**非空**；**永不 `…` 截断**。 */
  readonly time: string;
  /** 动作句：**谁改了什么**（如「批量改分类：3 条 餐饮 → 外卖」）。**非空**。 */
  readonly say: string;
  /** 三态（闭集，缺省 `undoable`）。 */
  readonly state?: UndoTimelineState;
  /** 动了什么读数（逐条摆开；不给＝这一条不动任何读数，那时用 `note` 说明）。 */
  readonly readings?: readonly UndoTimelineReading[];
  /** 读数下面那句补充（如「不动任何合计，只动两个账户的余额分摊」）。 */
  readonly note?: string;
  /** 状态片上那句话（不给＝按三态取缺省；`undoable` 的缺省是不出片）。 */
  readonly tag?: string;
  /** **不可撤的原因**（`state: 'locked'` 时必填：那一枚按钮按不动，必须写得清为什么）。 */
  readonly lockedReason?: string;
  /** 影响面清单（给了 ⇒ 那枚按钮按下去**先就地摊开这张回滚单**；不给 ⇒ 按下去直接派发撤销事件）。 */
  readonly impact?: UndoTimelineImpact;
  /** 那枚按钮的字（缺省按三态算：「撤销这次改动」／「恢复这笔」／「已不可撤」）。 */
  readonly go?: string;
  /** 正在跑：字**原地换掉**（`正在` ＋ 按钮字）、宽度锁住不跳版、按钮按不动。 */
  readonly busy?: boolean;
  /** 这一条的错态那句字（**写在按钮旁边** ＋ `aria-describedby` 指它）。 */
  readonly error?: string;
}

/** 整段回滚（`track` 页脚那枚）：回到某个时刻的样子。
 *  它**不就地摊开**（那是 `impact` 形态的活）：按下去直接派发 `ilife:undo-timeline-rollback`，
 *  要二次确认就由调用方接事件后自走确认流程，或直接用 `impact` 形态把影响面摊开。 */
export interface UndoTimelineRollback {
  /** 那枚按钮上的字（如「回到 09-22 18:00」）。**非空**。 */
  readonly label: string;
  /** 按钮旁边那句（如「想退回到某一天的样子就整段回滚，回滚也是一次改动」）。 */
  readonly note?: string;
}

/** 撤销时间线入参。`name` 必填——事件、行内 `id` 与运行时幂等都拿它拼。 */
export interface UndoTimelineInput {
  /** 机器键（事件 `detail.name`；行内 `id` 拿它拼）。**非空、同页唯一**。 */
  readonly name: string;
  /** 形态键（闭集，缺省 `track`）。 */
  readonly form?: UndoTimelineForm;
  /* ── 形态 `track` ── */
  /** 改动记录（空数组 ＝ 出**设计过的空态**，不是留白）。 */
  readonly entries?: readonly UndoTimelineEntry[];
  /** 卡头标题（缺省 `改动记录`）。 */
  readonly title?: string;
  /** 卡头右端那句（如「只留 30 天，共 12 条」）。 */
  readonly cap?: string;
  /** 页脚那枚整段回滚（不给＝页脚只有结论句）。 */
  readonly rollback?: UndoTimelineRollback;
  /** 渲染时就摊开哪一条的回滚单（**必须命中一条带 `impact` 的改动**；不给＝都收起）。 */
  readonly openKey?: string;
  /** 空态那句字（缺省 `这一段时间里没有改动`）。 */
  readonly emptyText?: string;
  /** 卡底那句提示（如「撤销会按反向算回去，不是重新统计」）。 */
  readonly hint?: string;
  /* ── 形态 `impact` ── */
  /** 一次改动的回滚单（形态 `impact` 必填）。 */
  readonly change?: UndoTimelineImpact;
  /** 这一块的机器键（事件 `detail.key`；不给＝用 `name` 拼行内 `id`）。 */
  readonly changeKey?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
