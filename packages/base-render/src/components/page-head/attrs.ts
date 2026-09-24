/** page-head · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-01-纸面与页头.mjs`，2026-09 用户裁定）
 *  里的**形态 B「读数当第二行」**——一页最上面那段：眉标（技能 · 域）／页标题（`<h1>`）／
 *  **主读数第二行大字**／副题（时间窗／范围／条数）／口径行／可选右上工具位。
 *
 *  形态键写在 `PAGE_HEAD_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `PAGE_HEAD_CLASS + '-' + 槽名`。 */
export const PAGE_HEAD_CLASS = 'ilife-block-page-head';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const PAGE_HEAD_SLOTS = [
  /** 第一行：眉标 ＋ 页标题（＋ 工具位）并成的那一排。 */
  'top',
  /** 眉标（技能名 · 域），可换行。 */
  'eyebrow',
  /** 眉标左端那枚方点（纯装饰，`aria-hidden`；强调色只许出现在这类非文本位上）。 */
  'mark',
  /** 眉标里的技能名。 */
  'skill',
  /** 眉标里的域（可选；它前面的细竖线由样式画，不由标记写分隔符）。 */
  'domain',
  /** 可选右上工具位：一句读数或一枚状态字（**不放按钮**）。 */
  'tool',
  /** 页标题（一页恰好一个 `<h1>`）。 */
  'title',
  /** 主读数那一行（本形态的识别特征：它是标题下面那一行大字）。 */
  'reading',
  /** 主读数的值（含单位）。 */
  'value',
  /** 单位（小一号，跟在值后）。 */
  'unit',
  /** 分母／标尺（可选，排在主读数之后）。 */
  'denominator',
  /** 主读数后的说明（可选，如「七日合计」）。 */
  'note',
  /** 副题行：时间窗／范围／条数（逐段一枚 `<span>`，段间由列距承担、不写分隔符）。 */
  'sub',
  /** 口径行：这一页的数字怎么算的（弱文字，可很长、必须能换行）。 */
  'caliber',
] as const;
export type PageHeadSlot = (typeof PAGE_HEAD_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `PAGE_HEAD_CLASS + '-' + …`）。 */
export function pageHeadSlot(slot: PageHeadSlot, prefix = 'ilife-'): string {
  return prefix + 'block-page-head-' + slot;
}

/** 形态闭集：本件只落地了形态 B「读数当第二行」。 */
export const PAGE_HEAD_FORMS = ['hero'] as const;
export type PageHeadForm = (typeof PAGE_HEAD_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const PAGE_HEAD_MISSING = '—';

/** 口径行左端那枚标签（口径行只要出，就带它：读者一眼看出这一行是「怎么算的」）。 */
export const PAGE_HEAD_CALIBER_LABEL = '口径';

/** 主读数：值 ＋ 单位 ＋ 分母 ＋ 说明。**值只收「已经是给人看的样子」的串**（取整与单位口径归调用方）。 */
export interface PageHeadReading {
  /** 主读数。`null` ＝ **缺值**（写成 `—`，与「0」区分）；空串不是缺值，是错（`badInput`）。 */
  readonly value: string | null;
  /** 单位（`卡`／`元`／`件`）：小一号跟在值后，不参与任何机器口径。 */
  readonly unit?: string;
  /** 分母／标尺（`/ 1,800 卡`），排在主读数之后。 */
  readonly denominator?: string;
  /** 值后的说明（`七日合计`）；与单位不是一回事，两枚都在时依次排开。 */
  readonly note?: string;
}

/** 页头入参。`skill`／`title`／`reading` 必填——**没有主读数的页不走本件**（本件只有形态 B 一种骨架）。 */
export interface PageHeadInput {
  /** 技能名（眉标主段，如「卡路里」）。 */
  readonly skill: string;
  /** 域（眉标次段，如「看本周饮食」）；不给＝眉标只有技能名。 */
  readonly domain?: string;
  /** 页标题（一页恰好一个；**不许 `…` 截断**，长了就换行）。 */
  readonly title: string;
  /** 主读数（形态 B 的识别特征：它是标题下面那一行大字）。 */
  readonly reading: PageHeadReading;
  /** 副题：时间窗／范围／条数。串＝一段；数组＝逐段一枚 `<span>`（不给＝不出这一行）。 */
  readonly sub?: string | readonly string[];
  /** 口径行：这一页的数字怎么算的。串＝一句话；数组＝分段（不给＝不出这一行）。 */
  readonly caliber?: string | readonly string[];
  /** 右上工具位：**只放一句读数或一枚状态字**（不放按钮——按钮归 `action-bar`）。 */
  readonly tool?: string;
  /** 形态键（闭集，缺省 `hero`）。 */
  readonly form?: PageHeadForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
