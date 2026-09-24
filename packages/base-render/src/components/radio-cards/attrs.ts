/** radio-cards · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-09-选择与反馈.mjs`，2026-09 用户裁定）里的
 *  **形态 A「竖排卡（图标位 ＋ 标题 ＋ 读数 ＋ 卡里一行说明）」**——一列单选卡，每张卡里是：
 *  标记（圆点／对钩）＋ 1–2 字图标位 ＋ 标题 ＋ 可选读数 ＋ 一行说明。
 *
 *  选型（对照既有件想清楚再选）：
 *   · 每个选项**有话说**（一句说明、一个读数，如账户余额）→ 用本件；
 *   · 选项只是几个短词（≤6 字、无须说明，如「按食材记／按成品记」）→ 用分段控件那一族（`filter-chips`／`sort-toggle`）；
 *   · 选项是一长串同构条目（几十条里挑一条）→ 用 `drawer-sheet`（底部弹层）。
 *
 *  **选中态至少两重标记**（判据钉住，不许只靠颜色）：
 *   ① 形状：选中卡的左端出现一道 4px 竖条（`box-shadow: inset`），标记位从空圆环变成实心圆 ＋ 对钩 `✓`；
 *   ② 字：对钩本身是字（读得出、不是色块）；卡片边框与底色只是第三重（颜色档）。
 *  为什么必须两重：皮肤「大字报刊」下强调色＝墨黑（`--ilife-accent` 与 `ink` 同值），
 *  只染色的选中态与未选中卡的黑字边线几乎同色 ⇒ 换皮就塌。
 */

/** 本件的类名根：全部槽位类名都是 `RADIO_CARDS_CLASS + '-' + 槽名`。 */
export const RADIO_CARDS_CLASS = 'ilife-block-radio-cards';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const RADIO_CARDS_SLOTS = [
  /** 组名行（这组单选是选什么的）。 */
  'legend',
  /** 组名行主段（人类可读的组名）。 */
  'legend-title',
  /** 组名行次段（补充说明：这一笔记到哪儿）。 */
  'legend-hint',
  /** 选项列（`role="radiogroup"`）。 */
  'list',
  /** 一张卡（`<label>`：整卡是命中区）。 */
  'card',
  /** 标记位（空圆环／实心圆＋对钩；纯装饰，`aria-hidden`）。 */
  'mk',
  /** 图标位（1–2 字，如「现／卡／微」；纯装饰，`aria-hidden`）。 */
  'lead',
  /** 标题与读数并成的那一排。 */
  'line',
  /** 选项标题。 */
  'title',
  /** 读数（如余额 `¥1,286.40`）。 */
  'reading',
  /** 读数前的小标签（如「余额」）。 */
  'reading-label',
  /** 卡里那行说明（形态 A 的识别特征）。 */
  'desc',
  /** 禁用原因（写在卡里，不只染色）。 */
  'why',
  /** 空态（设计过的，不是空白）。 */
  'empty',
  /** 错态（写在控件旁边，`aria-describedby` 指它）。 */
  'error',
  /** 加载态那一句（原地换字）。 */
  'loading',
] as const;
export type RadioCardsSlot = (typeof RADIO_CARDS_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RADIO_CARDS_CLASS + '-' + …`）。 */
export function radioCardsSlot(slot: RadioCardsSlot, prefix = 'ilife-'): string {
  return prefix + 'block-radio-cards-' + slot;
}

/** 形态闭集：本件只落地名册点名的**形态 A「竖排卡」**。加第二形态是在闭集里加一格，不是新开一件。 */
export const RADIO_CARDS_FORMS = ['cards'] as const;
export type RadioCardsForm = (typeof RADIO_CARDS_FORMS)[number];

/** 机器键：值＝`RadioCardsInput.name`（运行时的发现锚 `[data-ilife-radio-name]`）。 */
export const RADIO_CARDS_NAME_ATTR = 'data-ilife-radio-name';
/** 形态键（闭集内的值）。 */
export const RADIO_CARDS_FORM_ATTR = 'data-ilife-radio-form';
/** 机器值（选中项的 `value`；未选＝这个属性不出现，不是空串）。 */
export const RADIO_CARDS_VALUE_ATTR = 'data-ilife-radio-value';
/** 一个选项（`<label>`）的标记：值＝选项机器值。 */
export const RADIO_CARDS_OPTION_ATTR = 'data-ilife-radio-option';
/** 必填标记（`1`＝必选）。 */
export const RADIO_CARDS_REQUIRED_ATTR = 'data-ilife-radio-required';
/** 加载标记（`1`＝这一组在等读数回来）。 */
export const RADIO_CARDS_LOADING_ATTR = 'data-ilife-radio-loading';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const RADIO_CARDS_BOUND_ATTR = 'data-ilife-radio-bound';
/** 运行时装在文档根上的幂等键。 */
export const RADIO_CARDS_RUNTIME_ATTR = 'data-ilife-radio-runtime';

/** 选中事件（冒泡 `CustomEvent`，`detail = { name, value, title, prev }`）。
 *  页面用 `root.addEventListener(RADIO_CARDS_EVENT_CHANGE, …)` 接自己的联动——**不引入任何全局**。 */
export const RADIO_CARDS_EVENT_CHANGE = 'ilife:radio-change';

/** 加载态那句话说什么是缺省的（**不带省略号**：`…` 在本仓只许表示「被截断」）。 */
export const RADIO_CARDS_LOADING_TEXT = '正在读取';
/** 空态的缺省写法（设计过的空态，不是留白）。 */
export const RADIO_CARDS_EMPTY_TEXT = '没有可选项';
/** 图标位最长的字数（1–2 个汉字：它是记号位，不是第二个标题）。 */
export const RADIO_CARDS_LEAD_MAX = 2;

/** 一个选项。`value` 与 `title` 必填：机器值与屏上字是两码事（`cash` / `现金`）。 */
export interface RadioCardsOption {
  /** 机器值（`<input value>` 与事件 `detail.value`）。**非空、组内唯一**。 */
  readonly value: string;
  /** 选项标题（卡上主字）。**非空**。 */
  readonly title: string;
  /** 卡里那行说明（形态 A 的识别特征；不给＝这一行不出）。 */
  readonly desc?: string;
  /** 读数（如 `¥1,286.40`）：右端等宽数字，随容器窄了自己换行。 */
  readonly reading?: string;
  /** 读数前的小标签（如「余额」）。 */
  readonly readingLabel?: string;
  /** 图标位（1–2 个字，如「现／卡／微」）。**只许 1–2 字**：它占的是记号位。 */
  readonly lead?: string;
  /** 禁用：`<input disabled>` ＋ `cursor: not-allowed`（"看着能点、点了没反应"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 禁用原因（**写出来**，不只染色；只在 `disabled` 时给）。 */
  readonly disabledReason?: string;
}

/** 单选卡组入参。 */
export interface RadioCardsInput {
  /** 机器键（`<input name>` 与事件 `detail.name`；同一页内应唯一）。**非空**。 */
  readonly name: string;
  /** 组名（这一组在选什么，如「账户」）。**非空**：没有组名的单选组读不出"在选什么"。 */
  readonly label: string;
  /** 候选项。不给或空数组 ⇒ 出**设计过的空态**（不是空白）。 */
  readonly options?: readonly RadioCardsOption[];
  /** 选中项机器值；`null` ＝ 显式未选（一个都不勾）。给了串就必须命中某一项。 */
  readonly value?: string | null;
  /** 组名的次段（如「这一笔记到哪儿」）。 */
  readonly hint?: string;
  /** 必选（`aria-required` ＋ `data-ilife-radio-required`）。 */
  readonly required?: boolean;
  /** 加载态：选项照出、读数原地换成 `loadingText`、全部不可点（`aria-busy`）。 */
  readonly loading?: boolean;
  /** 加载态那句字（缺省 `正在读取`；只在 `loading` 时给）。 */
  readonly loadingText?: string;
  /** 错态那句字（写在控件旁边 ＋ `aria-describedby`）。 */
  readonly error?: string;
  /** 空态那句字（缺省 `没有可选项`）。 */
  readonly emptyText?: string;
  /** 形态键（闭集，缺省 `cards`）。 */
  readonly form?: RadioCardsForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
