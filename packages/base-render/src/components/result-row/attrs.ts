/** resultRow · **标记契约**（渲染与运行时共用的唯一事实；本件是**显示件**，无运行时段）。
 *
 *  形态：**A**（单行，值在右）——`#950` 打分台账里三形态 A/B/C ＝ 4/4/4、3/3/3、4/4/4，并列取先者 ⇒ A。
 *  A 的骨架＝「缩略格 ＋（标题／副语）＋ 右侧读数」，标题里的命中词用 `<mark>` 标出来。
 *
 *  **与 `search-field` 是同一套标记**（本件从这里引它的三个属性名，不另抄一份）：
 * 条目挂 `data-ilife-search-item`（可被搜）、标签进 `data-ilife-search-tags`（范围分段按它分档）、
 * 命中词用 `<mark data-ilife-search-hit>`。这样「渲染一排行 → 接一个搜索框」不用再写接线代码。
 * 高亮**不靠色块**：`<mark>` 是语义标签，视觉走「下划线 ＋ 加粗」（形与字重两样）。
 */
import { SEARCH_HIT_ATTR, SEARCH_ITEM_ATTR, SEARCH_REGION_ATTR, SEARCH_TAGS_ATTR } from '../search-field/index.js';

/** 本件的类名根。 */
export const RESULT_ROOT_CLASS = 'ilife-block-result-row';

/** 形态闭集。 */
export const RESULT_FORMS = ['A'] as const;
export type ResultRowForm = (typeof RESULT_FORMS)[number];

/** 根：值＝机器键（可选）。给了就同时当搜索框的结果区键（`data-ilife-search-region`）。 */
export const RESULT_NAME_ATTR = 'data-ilife-result';
export const RESULT_FORM_ATTR = 'data-ilife-result-form';
/** 一条结果（本件自己的锚；`search-field` 用 `data-ilife-search-item` 找同一批元素）。 */
export const RESULT_ITEM_ATTR = 'data-ilife-result-item';
export const RESULT_EMPTY_ATTR = 'data-ilife-result-empty';

/** 与 `search-field` 共用的三个名字（转出即契约，别处不许再抄一份字面量）。 */
export const RESULT_SEARCH_ITEM_ATTR = SEARCH_ITEM_ATTR;
export const RESULT_SEARCH_TAGS_ATTR = SEARCH_TAGS_ATTR;
export const RESULT_SEARCH_HIT_ATTR = SEARCH_HIT_ATTR;
export const RESULT_SEARCH_REGION_ATTR = SEARCH_REGION_ATTR;

export const RESULT_DEFAULTS = Object.freeze({
  /** 缺值写法（工艺书：缺值写成 `—`）。 */
  unset: '—',
  emptyText: '没有结果',
} as const);

export interface ResultRowItemInput {
  /** 标题（**必填**）：命中词在这里被标出来。 */
  readonly title: string;
  /** 命中词（渲染期在标题与副语里逐处标 `<mark>`；大小写不敏感）。 */
  readonly highlights?: readonly string[];
  /** 副语（时间／口味／次数一类；命中词同样会被标出来）。 */
  readonly subtitle?: string;
  /** 小标签（上屏；同时进 `data-ilife-search-tags`，供搜索框按范围分档）。 */
  readonly tags?: readonly string[];
  /** 右侧读数（金额／评分／天数…）。**不给＝缺值**：写 `—` 并弱化（不许拿 0 冒充）。 */
  readonly value?: string;
  /** 读数下面那行小字（「评分」「未评分」）。 */
  readonly valueLabel?: string;
  /** 缩略格里的字（一到两个字，如「菜」「汤」）；不给就不出缩略格。 */
  readonly thumb?: string;
  readonly extraClass?: string;
}

export interface ResultRowInput {
  readonly form?: ResultRowForm;
  /** 机器键（可选）：给了就同时当搜索框能圈定的结果区键。 */
  readonly name?: string;
  /** 这一批结果的 `aria-label`。 */
  readonly label?: string;
  /** 结果（可以为空数组＝设计过的空态）。 */
  readonly items: readonly ResultRowItemInput[];
  readonly emptyText?: string;
  readonly extraClass?: string;
}
