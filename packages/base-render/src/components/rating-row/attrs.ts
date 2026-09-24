/** rating-row · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-09-选择与反馈.mjs`，2026-09 用户裁定）里
 *  **「星级 ＋ 数字读数」**那一支（原型里它的键是 `C`；工单把本件的落地形态写作**形态 A「星级＋分数」**，
 *  故形态键取 `stars`，见 `RATING_ROW_FORMS`）。
 *
 *  **星星之外必须给数字读数**（判据钉住）：星星读得出「大约四颗」，读不出「4 分还是 4.5 分」
 *  —— 所以读数是一枚 `tabular-nums` 的大数字，且**选中态不只靠颜色**：
 *   ① 形状：空心星 `☆` → 实心星 `★`（字形本身换了），小数位另出半颗（左半实心）；
 *   ② 字：那枚大数字（`4`／`4.5`／缺值 `—`）本身就是第二重信息；
 *   ③ 颜色只是第三重。皮肤「大字报刊」下强调色＝墨黑 ⇒ 前两重是换皮不塌的那两重。
 *
 *  选型（对照既有件想清楚再选）：
 *   · 给一次记录打分（给菜打分、满意度、优先级）→ 用本件；
 *   · 一整段自由文字（咸淡、火候、下次还做不做）→ 用 `field-row`（字段行）；
 *   · 五个档位各带一句词（「很差／一般／还行／好吃／很棒」）→ 那是单选卡组（`radio-cards`）。
 */

/** 本件的类名根：全部槽位类名都是 `RATING_ROW_CLASS + '-' + 槽名`。 */
export const RATING_ROW_CLASS = 'ilife-block-rating-row';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名）。 */
export const RATING_ROW_SLOTS = [
  /** 标题行（给什么打分 ＋ 上次对照）。 */
  'label',
  /** 标题主段（给什么打分）。 */
  'label-title',
  /** 上次对照那句（`上次 09-18 给了 7 分`）。 */
  'prev',
  /** 星与读数并成的那一排。 */
  'body',
  /** 星组（`role="radiogroup"`）。 */
  'stars',
  /** 一颗星（`<button role="radio">`：可聚焦、带 `aria-label`）。 */
  'star',
  /** 星字形（纯装饰：`☆`／`★`／半颗）。 */
  'glyph',
  /** 数字读数那一排。 */
  'score',
  /** 那枚大数字（本形态的识别特征：星星之外**必须**有这个数）。 */
  'num',
  /** 读数里的分母（`/ 5 星`）。 */
  'den',
  /** 读数后的一句补充（如「折合 8 分」）。 */
  'hint',
  /** 禁用原因（写出来，不只染色）。 */
  'why',
  /** 加载态那一句（原地换字）。 */
  'loading',
  /** 错态（写在控件旁边，`aria-describedby` 指它）。 */
  'error',
] as const;
export type RatingRowSlot = (typeof RATING_ROW_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RATING_ROW_CLASS + '-' + …`）。 */
export function ratingRowSlot(slot: RatingRowSlot, prefix = 'ilife-'): string {
  return prefix + 'block-rating-row-' + slot;
}

/** 形态闭集：本件只落地工单点名的**形态 A「星级＋分数」**。 */
export const RATING_ROW_FORMS = ['stars'] as const;
export type RatingRowForm = (typeof RATING_ROW_FORMS)[number];

/** 机器键：值＝`RatingRowInput.name`（运行时的发现锚 `[data-ilife-rating-name]`）。 */
export const RATING_ROW_NAME_ATTR = 'data-ilife-rating-name';
/** 形态键（闭集内的值）。 */
export const RATING_ROW_FORM_ATTR = 'data-ilife-rating-form';
/** 机器值（分数；未评分＝这个属性不出现，不是空串）。 */
export const RATING_ROW_VALUE_ATTR = 'data-ilife-rating-value';
/** 满档（几颗星）。 */
export const RATING_ROW_MAX_ATTR = 'data-ilife-rating-max';
/** 一颗星的机器值（`data-ilife-rating-star="4"`；运行时按它定位与取值）。 */
export const RATING_ROW_STAR_ATTR = 'data-ilife-rating-star';
/** 半颗标记（`1`＝这颗只填左半边，小数分值那种）。**不挂 `is-half` 这类修饰类**：
 *  两三个字母的类名是全仓共享的拼写空间，重名就会被别件的选择器命中（判据「跨件零交集」会红）。
 *  整颗实心与否不另挂标记：那是 `aria-checked="true"`（每颗星本来就必须带的无障碍事实）。 */
export const RATING_ROW_HALF_ATTR = 'data-ilife-rating-half';
/** 加载标记（`1`＝这一件在等分数回来）。 */
export const RATING_ROW_LOADING_ATTR = 'data-ilife-rating-loading';
/** 禁用标记（`1`＝不可评）。 */
export const RATING_ROW_DISABLED_ATTR = 'data-ilife-rating-disabled';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const RATING_ROW_BOUND_ATTR = 'data-ilife-rating-bound';
/** 运行时装在文档根上的幂等键。 */
export const RATING_ROW_RUNTIME_ATTR = 'data-ilife-rating-runtime';

/** 分数变化事件（冒泡 `CustomEvent`，`detail = { name, value, prev }`）。 */
export const RATING_ROW_EVENT_CHANGE = 'ilife:rating-change';

/** 满档的缺省值（五颗星：最常用的一档）。 */
export const RATING_ROW_DEFAULT_MAX = 5;
/** 满档上限（再多就不是"一眼扫过去读得出几颗"了）。 */
export const RATING_ROW_MAX_MAX = 10;
/** 缺值的写法：**缺值写成 `—`，不许写 0**（0 分与"没评过"是两件事）。 */
export const RATING_ROW_MISSING = '—';
/** 加载态那句话说什么是缺省的（**不带省略号**）。 */
export const RATING_ROW_LOADING_TEXT = '正在读取';
/** 一颗星的无障碍名字的后缀（`aria-label="4 分"`）。 */
export const RATING_ROW_STAR_LABEL_SUFFIX = ' 分';

/** 评分行入参。 */
export interface RatingRowInput {
  /** 机器键（事件 `detail.name`；同一页内应唯一）。**非空**。 */
  readonly name: string;
  /** 给什么打分（如「给番茄炒蛋打分」）。**非空**：没有这句，星星读不出在评什么。 */
  readonly label: string;
  /** 分数。`null` ＝ 还没评过（读数写 `—`）；给了数就必须落在 0–`max` 之间。
   *  可以是小数（`4.5`：平均分那种），**小数只影响显示**——点／键盘选的是整星。 */
  readonly value?: number | null;
  /** 满档（几颗星），缺省 5，闭区间 1–10。 */
  readonly max?: number;
  /** 上次对照那一句（`上次 09-18 给了 7 分`）。 */
  readonly prevNote?: string;
  /** 读数后的补充（如「折合 8 分」）。 */
  readonly hint?: string;
  /** 必评（`aria-required`）。 */
  readonly required?: boolean;
  /** 禁用：星不可点、`cursor: not-allowed`（"看着能点、点了没反应"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 禁用原因（**写出来**，不只染色；只在 `disabled` 时给）。 */
  readonly disabledReason?: string;
  /** 加载态：读数**原地换字**、星不可点。 */
  readonly loading?: boolean;
  /** 加载态那句字（缺省 `正在读取`；只在 `loading` 时给）。 */
  readonly loadingText?: string;
  /** 错态那句字（写在控件旁边 ＋ `aria-describedby` 指它）。 */
  readonly error?: string;
  /** 形态键（闭集，缺省 `stars`）。 */
  readonly form?: RatingRowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
