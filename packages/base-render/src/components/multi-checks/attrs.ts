/** multi-checks · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-09-选择与反馈.mjs`，2026-09 用户裁定）里的
 *  **形态 A「顶上全选 ＋ 按分组列的复选 ＋ 底下的操作按钮」**——批量改之前先挑：
 *  顶上「全选 ＋ 已选数」，中间一行一条（整行是命中区，可选分组头），底下才是动作按钮。
 *
 *  选型（对照既有件想清楚再选）：
 *   · 「挑几条一起改」（批量改分类／排除可选／批量改）→ 用本件；
 *   · 一条一条地做（买菜清单打完勾、盘点）→ 用 `task-list`（勾选清单，不带批量动作条）；
 *   · 只挑一条 → 用 `radio-cards`（单选卡组）。
 *
 *  **勾选态至少两重标记**（判据钉住，不许只靠颜色）：
 *   ① 形状：勾选框里出现对钩 `✓`；勾中的那一行左端出现一道 4px 竖条（`box-shadow: inset`）；
 *   ② 字：对钩本身是字；行为面另由「已选 N / M 条」这句读数承担。
 *  为什么必须两重：皮肤「大字报刊」下强调色＝墨黑（`--ilife-accent` 与 `ink` 同值），
 *  只染色的勾选态与未勾的行几乎同色 ⇒ 换皮就塌。
 *
 *  运行时（`buildMultiChecksJs()`）只管三件事：**全选／组头的三态**（勾／半勾／没勾）、
 *  **已选数与合计**、**动作按钮的可按性**——其余（行、组、文案）一律由标记给定。
 */

/** 本件的类名根：全部槽位类名都是 `MULTI_CHECKS_CLASS + '-' + 槽名`。 */
export const MULTI_CHECKS_CLASS = 'ilife-block-multi-checks';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名）。 */
export const MULTI_CHECKS_SLOTS = [
  /** 清单盒子（自带纸面；本件自己就是容器）。 */
  'box',
  /** 顶上那句「这清单是干什么的」。 */
  'label',
  /** 顶上那句的次段。 */
  'hint',
  /** 全选头那一排（全选框 ＋ 已选数）。 */
  'top',
  /** 全选那一枚（整块是命中区）。 */
  'all',
  /** 勾选框（方形，纯装饰：真状态在原生 `<input>` 上）。 */
  'cb',
  /** 已选数（`已选 3 / 8 条`）。 */
  'count',
  /** 逐条那一列（分组头与行都住这里）。 */
  'list',
  /** 一个分组（可选）。 */
  'grp',
  /** 分组头（整块是命中区：勾上＝这一组全勾）。 */
  'gh',
  /** 分组名。 */
  'gh-title',
  /** 分组尾巴那句读数（`3 条 · ¥56.00`）。 */
  'gh-note',
  /** 一行（整行是命中区）。 */
  'row',
  /** 行主字。 */
  'nm',
  /** 行副语（小字，如「早餐 · 未分类」）。 */
  'note',
  /** 行右端的金额（等宽数字）。 */
  'amt',
  /** 行禁用原因（写出来，不只染色）。 */
  'why',
  /** 底下那一排（合计 ＋ 动作按钮）。 */
  'bar',
  /** 合计／已勾那句读数。 */
  'sum',
  /** 动作按钮。 */
  'act',
  /** 空态（设计过的）。 */
  'empty',
  /** 错态（写在控件旁边，`aria-describedby` 指它）。 */
  'error',
  /** 加载态那一句（原地换字）。 */
  'loading',
] as const;
export type MultiChecksSlot = (typeof MULTI_CHECKS_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `MULTI_CHECKS_CLASS + '-' + …`）。 */
export function multiChecksSlot(slot: MultiChecksSlot, prefix = 'ilife-'): string {
  return prefix + 'block-multi-checks-' + slot;
}

/** 形态闭集：本件只落地名册点名的**形态 A「顶上全选 ＋ 分组复选 ＋ 底下动作」**。 */
export const MULTI_CHECKS_FORMS = ['grouped'] as const;
export type MultiChecksForm = (typeof MULTI_CHECKS_FORMS)[number];

/** 机器键：值＝`MultiChecksInput.name`（运行时的发现锚 `[data-ilife-checks-name]`）。 */
export const MULTI_CHECKS_NAME_ATTR = 'data-ilife-checks-name';
/** 形态键（闭集内的值）。 */
export const MULTI_CHECKS_FORM_ATTR = 'data-ilife-checks-form';
/** 一行的机器键（原生 `<input value>` 也写同一份）。 */
export const MULTI_CHECKS_ITEM_ATTR = 'data-ilife-checks-item';
/** 一行的机器金额（十进制串，参与合计；只在**全部行都有**金额时出现）。 */
export const MULTI_CHECKS_AMOUNT_ATTR = 'data-ilife-checks-amount';
/** 金额前缀（`¥`；只在全部行都有金额时出现）。 */
export const MULTI_CHECKS_MONEY_ATTR = 'data-ilife-checks-money';
/** 计数单位（`条`）。 */
export const MULTI_CHECKS_UNIT_ATTR = 'data-ilife-checks-unit';
/** 分组键：**分组头的原生框**带它；**行**也带它（运行时按它把行归到组头）。 */
export const MULTI_CHECKS_GROUP_ATTR = 'data-ilife-checks-group';
/** 全选框标记（它是"这一坨行的总开关"）。 */
export const MULTI_CHECKS_ALL_ATTR = 'data-ilife-checks-all';
/** 半勾标记（`1`＝勾了一部分）：原生 `indeterminate` 是 IDL 属性、进不了标记，
 *  SSR 面用 `aria-checked="mixed"` ＋ 这个标记表达，运行时在 init 那一趟把它落成 `indeterminate`。 */
export const MULTI_CHECKS_PARTIAL_ATTR = 'data-ilife-checks-partial';
/** 动作按钮标记：值＝动作 id。 */
export const MULTI_CHECKS_ACTION_ATTR = 'data-ilife-checks-action';
/** 加载标记（`1`＝这一坨在等数据回来）。 */
export const MULTI_CHECKS_LOADING_ATTR = 'data-ilife-checks-loading';
/** 主按钮标记（`1`＝实心那一枚；一排里至多一枚）。**不挂 `is-primary` 这类修饰类**：
 *  两三个字母的类名是全仓共享的拼写空间，重名就会被别件的选择器命中（判据「跨件零交集」会红）。 */
export const MULTI_CHECKS_PRIMARY_ATTR = 'data-ilife-checks-primary';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const MULTI_CHECKS_BOUND_ATTR = 'data-ilife-checks-bound';
/** 运行时装在文档根上的幂等键。 */
export const MULTI_CHECKS_RUNTIME_ATTR = 'data-ilife-checks-runtime';

/** 勾选变化事件（冒泡 `CustomEvent`，`detail = { name, ids, count, total }`；`total` 无金额时为 `null`）。 */
export const MULTI_CHECKS_EVENT_CHANGE = 'ilife:checks-change';
/** 动作事件（冒泡 `CustomEvent`，`detail = { name, action, ids }`）。 */
export const MULTI_CHECKS_EVENT_ACTION = 'ilife:checks-action';

/** 全选那一枚的缺省字。 */
export const MULTI_CHECKS_ALL_TEXT = '全选';
/** 加载态那句话说什么是缺省的（**不带省略号**）。 */
export const MULTI_CHECKS_LOADING_TEXT = '正在读取';
/** 空态的缺省写法（设计过的空态，不是留白）。 */
export const MULTI_CHECKS_EMPTY_TEXT = '没有可挑的条目';
/** 一条都没勾时，底下那句读数（也是「按钮为什么按不动」的那句说明）。 */
export const MULTI_CHECKS_NONE_TEXT = '一条都没勾';

/** 一行。`id`／`title` 必填：`id` 是机器键（同页唯一），`title` 是屏上主字。 */
export interface MultiChecksRow {
  /** 机器键（原生 `<input value>` 与事件 `detail.ids`）。**非空、清单内唯一**。 */
  readonly id: string;
  /** 行主字。**非空**。 */
  readonly title: string;
  /** 分组名（同值归一组；不给＝不分组，直接列在清单里）。 */
  readonly group?: string;
  /** 分组尾巴那句读数（`3 条 · ¥56.00`；同组的行给同一句，取**第一行**的那一份）。 */
  readonly groupNote?: string;
  /** 行副语（小字，如「早餐 · 未分类」）。 */
  readonly note?: string;
  /** 机器金额（十进制串，如 `-12.00`；参与合计）。**要么每行都给、要么一行都不给**。 */
  readonly amount?: string;
  /** 屏上金额写法（缺省＝`amount`；千分位／正负号归调用方）。 */
  readonly amountText?: string;
  /** 禁用：`<input disabled>` ＋ `cursor: not-allowed`（"看着能勾、勾了不算"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 禁用原因（**写出来**，不只染色；只在 `disabled` 时给）。 */
  readonly disabledReason?: string;
}

/** 一个动作按钮（底下那一排里的）。 */
export interface MultiChecksAction {
  /** 动作 id（事件 `detail.action`）。**非空**。 */
  readonly id: string;
  /** 按钮上的字。**非空**。 */
  readonly label: string;
  /** 主按钮（实心那一枚）——一排里**至多一枚**。 */
  readonly primary?: boolean;
}

/** 多选清单入参。 */
export interface MultiChecksInput {
  /** 机器键（事件 `detail.name`；同一页内应唯一）。**非空**。 */
  readonly name: string;
  /** 这清单是干什么的（如「挑几条一起改分类」）。**非空**：没有这句，勾完不知道要干什么。 */
  readonly label: string;
  /** 条目。不给或空数组 ⇒ 出**设计过的空态**（不是空白）。 */
  readonly rows?: readonly MultiChecksRow[];
  /** 预勾选的机器键（给了就必须命中行）。 */
  readonly selected?: readonly string[];
  /** 动作按钮（不给＝底下只有合计那句，不放按钮）。 */
  readonly actions?: readonly MultiChecksAction[];
  /** 顶上那句的次段（如「勾掉的不改」）。 */
  readonly hint?: string;
  /** 全选那一枚的字（缺省 `全选`）。 */
  readonly allText?: string;
  /** 金额前缀（缺省 `¥`；只在每行都有 `amount` 时有意义）。 */
  readonly moneyUnit?: string;
  /** 计数单位（缺省 `条`）。 */
  readonly countUnit?: string;
  /** 必选（至少要勾一条：`aria-required` ＋ 标记）。 */
  readonly required?: boolean;
  /** 加载态：行照出、已选数**原地换字**、按钮不可按（`aria-busy`）。 */
  readonly loading?: boolean;
  /** 加载态那句字（缺省 `正在读取`；只在 `loading` 时给）。 */
  readonly loadingText?: string;
  /** 错态那句字（写在控件旁边 ＋ `aria-describedby` 指它）。 */
  readonly error?: string;
  /** 空态那句字（缺省 `没有可挑的条目`）。 */
  readonly emptyText?: string;
  /** 形态键（闭集，缺省 `grouped`）。 */
  readonly form?: MultiChecksForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
