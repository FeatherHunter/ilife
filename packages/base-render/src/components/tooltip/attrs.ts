/** tooltip · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-10-容器与浮层.mjs`，2026-09 用户裁定）
 *  里的**形态 B「宽气泡：一行『为什么重要』＋小标题」**——正文里一个**看不懂的词**，
 *  点它／聚焦它／悬停它，弹出一条**宽气泡**：眉标（口径／字段说明）＋ 小标题 ＋ 解释 ＋
 *  **「为什么重要」那一段**。用在哪：六个技能的口径解释、字段说明。
 *
 *  落地路线（票面钉死）：**`popover` 属性**——
 *   · 开／关／`Esc`／点外面关，浏览器白送（触发键带 `popovertarget`，**一行脚本都没有也开得出来**）；
 *   · 定位：`@supports (anchor-name: --a)` **之内**才用 CSS 锚定定位——**竖轴贴着那个词**
 *     （`anchor(bottom)`），**横轴夹在容器里**（宽气泡不跟词对齐，否则窄屏上必然越界）；
 *     贴不下就 `position-try-fallbacks` 翻到词的上方。之外按普通定位元素排，运行时算 `top`。
 *   · 三条通路都要能出：**悬停**（`hover:hover` 的设备）／**聚焦**（键盘）／**点击**（原生 `popovertarget`）。
 */

/** 本件的类名根（挂在包住「词 ＋ 气泡」的那层容器上）。 */
export const TOOLTIP_CLASS = 'ilife-block-tooltip';

/** 类名根（带前缀）。 */
export function tooltipClass(prefix = 'ilife-'): string {
  return prefix + 'block-tooltip';
}

/** 槽位闭集。 */
export const TOOLTIP_SLOTS = [
  /** 被解释的那个词（页面正文里的真 `<button>`；整词可点）。 */
  'word',
  /** 词后那枚问号记号（纯装饰，`aria-hidden`）。 */
  'mark',
  /** 气泡（`popover` ＋ `role=tooltip`）。 */
  'bubble',
  /** 气泡头部那一排（眉标 ＋ 小标题 ＋ 关掉的提示）。 */
  'head',
  /** 眉标（「口径」「字段说明」）。 */
  'badge',
  /** 小标题（如「「均摊」是怎么算的」）。 */
  'title',
  /** 关掉的提示（如「点别处关掉」）。**不写键盘键名**：法条是"控件同时在手机与电脑用、不存在方向键一类键盘相关的东西"；
   *  `Esc` 关掉浏览器仍白送，但那是增强，不摆到用户面前当通路。 */
  'hint',
  /** 解释那一段。 */
  'text',
  /** 「为什么重要」那一段（形态 B 的识别特征）。 */
  'why',
] as const;
export type TooltipSlot = (typeof TOOLTIP_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function tooltipSlot(slot: TooltipSlot, prefix = 'ilife-'): string {
  return tooltipClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 B「宽气泡（带『为什么重要』）」。 */
export const TOOLTIP_FORMS = ['wide'] as const;
export type TooltipForm = (typeof TOOLTIP_FORMS)[number];

/** 眉标闭集（这一条说明是「怎么算的」还是「这个字段是什么」）。 */
export const TOOLTIP_BADGES = ['caliber', 'field'] as const;
export type TooltipBadge = (typeof TOOLTIP_BADGES)[number];

/** 眉标上的字（闭集 → 字，一一对应；调用方要别的说法就自己给 `badgeText`）。 */
export const TOOLTIP_BADGE_TEXT: Readonly<Record<TooltipBadge, string>> = Object.freeze({
  caliber: '口径',
  field: '字段说明',
});

/* ── `data-*` 名 ─────────────────────────────────────────────────── */

/** 容器的发现锚：值＝气泡 `id`。 */
export const TOOLTIP_ATTR = 'data-ilife-tooltip';
/** 被解释的那个词：值＝气泡 `id`（运行时按它认词）。 */
export const TOOLTIP_WORD_ATTR = 'data-ilife-tooltip-word';
/** 气泡：值＝气泡 `id`。 */
export const TOOLTIP_BUBBLE_ATTR = 'data-ilife-tooltip-bubble';
/** 绑定完成标记（幂等）。 */
export const TOOLTIP_BOUND_ATTR = 'data-ilife-tooltip-bound';

/** 锚定定位的两条能力查询：**CSS 与运行时读同一个串**。 */
export const TOOLTIP_ANCHOR_QUERY = 'anchor-name: --a';
/** 逐实例锚名的前缀（完整名＝`--tooltip-<id>`；词与气泡**写同一个名字**）。
 *  **不带 `ilife-`**：`--ilife-*` 是**皮肤 token 的命名空间**（名单住 `skin/contract.ts`），
 *  而锚名是**结构**不是语言——占了那个前缀，横切判据（`test/皮肤矩阵.test.mjs`）会把它当"拼错的 token"抓出来，
 *  日后真加一条同名 token 也会撞车。 */
export const TOOLTIP_ANCHOR_PREFIX = '--tooltip-';

/** 词后那枚问号（纯装饰；「这是个可以问一句的词」的记号）。 */
export const TOOLTIP_MARK = '?';
/** 「为什么重要」那一段的行首标签（形态 B 的识别特征：**这一段必须有**）。 */
export const TOOLTIP_WHY_LABEL = '为什么重要';
/** 关掉的提示（写在气泡头右端）。**不写键盘键名**：法条是"控件同时在手机与电脑用、不存在方向键一类键盘相关的东西"——
 *  `Esc` 关掉浏览器仍然白送，但那是**增强**，不许摆到用户面前当唯一通路。 */
export const TOOLTIP_HINT = '点别处关掉';

/** 几何口径：气泡宽上限／离容器边至少留多少／与词之间那道缝／词的最小命中边长。 */
export const TOOLTIP_WIDTH_PX = 560;
export const TOOLTIP_EDGE_PX = 12;
export const TOOLTIP_OFFSET_PX = 8;
export const TOOLTIP_HIT_PX = 44;
/** 词周围那圈**看不见的命中扩展**（词本身在行里，命中盒靠 `::after` 往外撑到 44）。 */
export const TOOLTIP_HIT_INSET_Y_PX = 12;

/** 宽气泡入参（形态 B）。`id`／`word`／`title`／`text`／`why` 必填。 */
export interface TooltipInput {
  /** 气泡 `id`（也是词 `popovertarget` 指的那个 id）。同页唯一；只许标识符字符。 */
  readonly id: string;
  /** 被解释的那个词（页面正文里那两个字；整词是命中区）。 */
  readonly word: string;
  /** 小标题（如「「均摊」是怎么算的」）。 */
  readonly title: string;
  /** 解释那一段（一句话说清怎么算的／这个字段是什么）。 */
  readonly text: string;
  /** 「为什么重要」：不这么算会读错什么。**形态 B 的识别特征，必填**。 */
  readonly why: string;
  /** 眉标档（缺省 `caliber`）。 */
  readonly badge?: TooltipBadge;
  /** 眉标上的字（不给＝按 `badge` 档取现成话）。 */
  readonly badgeText?: string;
  /** 关掉的提示（不给＝「点别处关掉」；给了空串＝不出这一格）。 */
  readonly hint?: string;
  /** 形态键（闭集，缺省 `wide`）。 */
  readonly form?: TooltipForm;
  /** 附加类名。 */
  readonly extraClass?: string;
}
