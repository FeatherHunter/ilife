/** section-head · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-01-纸面与页头.mjs`，2026-09 用户裁定）
 *  里的**形态 C「可折叠小节（原生 `details`，零脚本）」**——一段内容的开头一行：
 *  序号 ＋ 小节标题 ＋ 计数 ＋ 展开指示，正文原生开合。
 *
 *  形态键写在 `SECTION_HEAD_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `SECTION_HEAD_CLASS + '-' + 槽名`。 */
export const SECTION_HEAD_CLASS = 'ilife-block-section-head';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。
 *  **纯状态的类也算槽位**（`form-*`／`value-num` 这类）：一切挂在元素上的类名都从这一份拼出来，
 *  这样"只碰自己的类名"这条纪律才能被机器断（自造的 `is-*` 短类名会混进公共命名空间）。 */
export const SECTION_HEAD_SLOTS = [
  /** 标题行（`<summary>`）：序号 ＋ 标题 ＋ 计数 ＋ 展开指示并成的那一排。 */
  'sum',
  /** 序号（`1`／`2`…）：多小节文档里的一、二、三。不给＝不出这一槽。 */
  'ordinal',
  /** 小节标题（`<h4>`，一节一个）。 */
  'title',
  /** 计数（`6 步`／`11 味`）：**恒不换行**，窄档只换行、不掉字。 */
  'count',
  /** 展开指示：文本随 `details[open]` 换（**不靠脚本**），箭头随开合旋转。 */
  'more',
  /** 正文容器（受信透传的 `body` 落这里；本件不再给它加壳）。 */
  'body',
  /** 形态类（形态 C「可折叠小节」）：`<prefix>block-section-head-form-fd`。 */
  'form-fd',
] as const;
export type SectionHeadSlot = (typeof SECTION_HEAD_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SECTION_HEAD_CLASS + '-' + …`）。 */
export function sectionHeadSlot(slot: SectionHeadSlot, prefix = 'ilife-'): string {
  return prefix + 'block-section-head-' + slot;
}

/** 形态闭集：本件只落地了形态 C「可折叠小节（原生 `details`，零脚本）」。 */
export const SECTION_HEAD_FORMS = ['fd'] as const;
export type SectionHeadForm = (typeof SECTION_HEAD_FORMS)[number];

/** 序号的取值范围（`1`–`999`）：整数、正数；出界即 `badInput`。 */
export const SECTION_HEAD_SEQ_MIN = 1;
export const SECTION_HEAD_SEQ_MAX = 999;

/** 展开／收起两枚字**写在样式里**（`::before` 按 `[open]` 换）：标记里只有一枚空 `<span class="…-more">`。
 *  这两枚串是**呈现事实**、不是入参，故住这里一处，判据按它对账。 */
export const SECTION_HEAD_MORE_TEXTS = Object.freeze({ folded: '展开', open: '收起' });

/** 展开指示的箭头字形（转义前的码位；样式里拼成 CSS 的 `content`）。 */
export const SECTION_HEAD_CARET_CODE = '\\203A';

/** 小节头入参。`title`／`body` 必填——**没有正文的"小节头"不是小节**（那是一条标题行）。 */
export interface SectionHeadInput {
  /** 小节标题（人话短标题，如「步骤」「食材」）。必填非空。 */
  readonly title: string;
  /** 正文（**已渲染好的标记**，受信透传、不转义；与 `sheet-frame.content` 同口径）。想要空小节给空串。 */
  readonly body: string;
  /** 序号（`1`–`999` 的整数）：多小节文档里的一、二、三。不给＝不出这一槽。 */
  readonly seq?: number;
  /** 计数（`6 步`／`11 味`／`3 件`）：恒不换行，窄档只换行、不掉字。 */
  readonly count?: string;
  /** 起始展开；缺省折叠（一页里展开多节＝读者先要滚动）。 */
  readonly open?: boolean;
  /** 形态键（闭集，缺省 `fd`）。 */
  readonly form?: SectionHeadForm;
  /** 锚点 id（页内导航指到这一节用）。 */
  readonly id?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
