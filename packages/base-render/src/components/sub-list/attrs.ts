/** sub-list · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-05-时间与分组.mjs`）里的
 *  **形态 A「折叠组＋组级小计＋备货进度（原生 details）」**：一组一份、**能折叠**——
 *  组名 ＋ 计数 ＋ 组级小计 ＋ 进度条在折页头上，展开是子项。
 *
 *  它替掉的两种错法：
 *   · 一个大列表靠缩进假装分组 —— 读者数不出"这一组有几项、备齐了没有"；
 *   · 分组标题只是加粗的一行 —— 组多时滚动条拉不到底，收起来的组又看不出进度。
 *
 *  **零脚本**：折叠用浏览器原生的 `<details>`／`<summary>`（不是自己写的运行时）——
 *  本件因此没有 `runtime.ts`，"展开／收起"是原生行为，键盘与读屏器天生就支持。
 *
 *  形态键写在 `SUB_LIST_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `SUB_LIST_CLASS + '-' + 槽名`。 */
export const SUB_LIST_CLASS = 'ilife-block-sub-list';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const SUB_LIST_SLOTS = [
  /** 头部那一排：标题 ＋ 用途 ＋ 合计（窄档自己折行）。 */
  'hd',
  /** 标题（如「买菜清单」）。 */
  'title',
  /** 用途说明（如「私家大厨 · 按类分组」）。 */
  'use',
  /** 头部右端的合计位。 */
  'sum',
  /** 合计位的标签。 */
  'sum-label',
  /** 合计位的值（已经是给人看的样子）。 */
  'sum-value',
  /** 分组序列（一组一枚 `<details>`）。 */
  'list',
  /** 一个分组（`<details>`；展开状态是**原生**的）。 */
  'g',
  /** 折页头（`<summary>`：可点、可聚焦、键盘可开合）。 */
  'head',
  /** 折页头左端那枚方向标（纯装饰，`aria-hidden`；`▸`／`▾` 由样式画）。 */
  'ar',
  /** 折页头的组名与计数。 */
  'h',
  /** 组名。 */
  'label',
  /** 组内项数（如「6 项」；由子项条数算出，不由调用方给）。 */
  'count',
  /** 组级小计（如 `¥23.5`）。 */
  'sub',
  /** 进度槽（组内**有子项带 `done`** 时才出）。 */
  'pg',
  /** 进度填充段（宽度是百分比，纯装饰，`aria-hidden`）。 */
  'pg-fill',
  /** 进度读数（如「6/6 已备」；这是状态的**文字**通路）。 */
  'st',
  /** 展开后的子项区。 */
  'body',
  /** 一条子项。 */
  'r',
  /** 子项左端那枚勾（**形状通路**：勾 ＋ 名字转弱，不只靠颜色）。 */
  'ck',
  /** 子项名。 */
  'n',
  /** 子项数量／规格（如 `300 g`）。 */
  'q',
  /** 子项值（如 `¥4.5`）。 */
  'v',
  /** 设计过的空态（0 组时出，`emptyText` 给才出）。 */
  'empty',
  /** 脚注（弱文字，可很长、必须能换行）。 */
  'note',
] as const;
export type SubListSlot = (typeof SUB_LIST_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SUB_LIST_CLASS + '-' + …`）。 */
export function subListSlot(slot: SubListSlot, prefix = 'ilife-'): string {
  return prefix + 'block-sub-list-' + slot;
}

/** 形态闭集：本件只落地了形态 A「折叠组＋组级小计＋备货进度（原生 details）」。 */
export const SUB_LIST_FORMS = ['fold'] as const;
export type SubListForm = (typeof SUB_LIST_FORMS)[number];

/** 组内项数的单位（如「6 项」）：由子项条数算出，不由调用方给——同一个事实不出两个来源。 */
export const SUB_LIST_COUNT_UNIT = '项';

/** 进度读数的单位（如「6/6 已备」）：**状态的文字通路**（色与勾是其余两路）。 */
export const SUB_LIST_DONE_LABEL = '已备';

/** 一条子项。 */
export interface SubListItemInput {
  /** 子项名（如「小油菜」）。 */
  readonly label: string;
  /** 数量／规格（如 `300 g`）；不给＝不出。 */
  readonly measure?: string;
  /** 值（如 `¥4.5`）；不给＝不出。 */
  readonly value?: string;
  /** 这一项备好了没有；**给了它，这一组才出进度槽**（不给＝这组不讲进度，如按分类列的备忘录）。 */
  readonly done?: boolean;
}

/** 一个分组。 */
export interface SubListGroupInput {
  /** 组名（如「叶菜」／「支付宝」）。 */
  readonly label: string;
  /** 组内子项（0 项＝这一组出「0 项」的折页头，没有子项区）。 */
  readonly items: readonly SubListItemInput[];
  /** 组级小计（如 `¥23.5`）；不给＝不出。 */
  readonly sum?: string;
  /** 一开始就展开；缺省 `false`（全收起＝一屏放得下，谁要展开谁点）。 */
  readonly open?: boolean;
}

/** 头部右端的合计位。 */
export interface SubListSummary {
  /** 标签（如「已备 12/22」）。 */
  readonly label: string;
  /** 值（如 `¥183.0`）。 */
  readonly value: string;
}

/** 分组清单入参。`groups` 必填——**没有分组就不走本件**（本件只有形态 A 一种骨架）。 */
export interface SubListInput {
  /** 分组（0 组＝空串；给了 `emptyText` 时改出空态）。 */
  readonly groups: readonly SubListGroupInput[];
  /** 标题（如「买菜清单」）；不给＝不出。 */
  readonly title?: string;
  /** 用途说明（如「私家大厨 · 按类分组」）；不给＝不出。 */
  readonly use?: string;
  /** 头部右端的合计位；不给＝不出。 */
  readonly summary?: SubListSummary;
  /** 空态文案（0 组时出；不给＝0 组出空串，与"没内容不留空块"同口径）。 */
  readonly emptyText?: string;
  /** 脚注；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `fold`）。 */
  readonly form?: SubListForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
