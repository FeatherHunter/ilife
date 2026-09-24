/** photo-grid · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／比例闭集／入参类型）。
 *
 *  这一件是**重做件**（原型墙 3/3/3，`.scratch/ui-组件墙/重做设计口径.md` §3）：原型拿渐变块当照片，
 *  三套皮肤下都只是「一块灰」——读者看不出那是相片位。重做后一格由三样定形：
 *   **定形框**（`aspect-ratio`，加载不跳版）＋ **四角取景角标**（取景器的样子）＋ **底部题注条**（日期／位置）。
 *  末尾一格是虚线框「加一张」，与内容格在**边框样式**上就分得开（不靠颜色）。
 *
 *  成组两件事：同一天多张时格上带**张数角标**；按月分组时组头写**月份与张数**。
 */

/** 本件的类名根。 */
export const PHOTO_GRID_CLASS = 'ilife-block-photo-grid';

/** 槽位闭集。 */
export const PHOTO_GRID_SLOTS = [
  /** 按月分组时的一个月（组头 ＋ 一行格）。 */
  'group',
  /** 组头那一排（月份 ＋ 计数 ＋ 可选补充）。 */
  'group-head',
  /** 月份（「2026 年 9 月」）。 */
  'month',
  /** 组计数（「3 天 · 6 张」，由本件算）。 */
  'group-count',
  /** 格子的容器（一行，列数随容器变）。 */
  'grid',
  /** 一格（`<figure>`）；带 `is-photo` 或 `is-stack`。 */
  'cell',
  /** **定形框**：`aspect-ratio` 在它身上，图与占位共用同一个框。 */
  'frame',
  /** 四角取景角标（纯装饰，`aria-hidden`）。 */
  'marks',
  /** 中央那枚相机记号（只有占位时才出：一眼看出「这里放一张照片」）。 */
  'lens',
  /** 占位时写在框里的那句话（＝这一格该放什么照片）。 */
  'alt',
  /** 真图的 `<img>`（比例由框定，`object-fit: cover`）。 */
  'img',
  /** 张数角标（同一天多张时出：「3 张」）。 */
  'stack',
  /** 题注条：底部那一行（日期 ＋ 说明）。 */
  'caption',
  /** 题注条里的日期。 */
  'date',
  /** 题注条里的说明（位置／朝向）。 */
  'text',
  /** 末尾那一格「加一张」（虚线框＋加号；**内容格**，不是按钮）。 */
  'add',
  /** 加号（纯装饰）。 */
  'add-mark',
  /** 「加一张」四个字。 */
  'add-label',
  /** 末尾那格的一句补充（「支持 JPG／PNG」）；不给＝不出。 */
  'add-hint',
  /** 一格都没有时的空态。 */
  'empty',
  /** 脚注：共几张 ＋ 调用方给的口径。 */
  'foot',
  /** 脚注里的张数（由本件算）。 */
  'count',
  /** 脚注里的口径行。 */
  'note',
] as const;
export type PhotoGridSlot = (typeof PHOTO_GRID_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function photoGridSlot(slot: PhotoGridSlot, prefix = 'ilife-'): string {
  return prefix + 'block-photo-grid-' + slot;
}

/** 形态闭集：本件只落地了形态 A「网格 ＋ 加一张」。 */
export const PHOTO_GRID_FORMS = ['grid'] as const;
export type PhotoGridForm = (typeof PHOTO_GRID_FORMS)[number];

/** 定形框的比例闭集（骨相档：竖版人像／方照／横版）。**真图与占位共用同一个框**，换档只换这一格。 */
export const PHOTO_GRID_RATIOS = ['4-5', '1-1', '3-4', '4-3'] as const;
export type PhotoGridRatio = (typeof PHOTO_GRID_RATIOS)[number];

/** 张数角标的下限：到几张才值得标（1 张就是 1 张，标了是噪音）。 */
export const PHOTO_GRID_MIN_STACK = 2;

/** 末尾那一格的加号与字。 */
export const PHOTO_GRID_ADD_MARK = '＋';
export const PHOTO_GRID_ADD_LABEL = '加一张';

/** 一格都没有时那句话（**是空态，不是错误**：新账本／新物品本来就没有照片）。 */
export const PHOTO_GRID_EMPTY_TEXT = '还没有照片';

/** 缺值那一栏的写法（日期拿不到时不再编一个）——**本件用不到，留作同族口径**：
 *  一格照片宁可只写题注（没有日期那一栏就不出），也不要写一个假的 `—`。 */
export const PHOTO_GRID_MISSING = '—';

/** 一格照片。 */
export interface PhotoGridItem {
  /** 图源（`data:` 内嵌串或文件名）。不给＝占位格（读者看到的是「这里放一张照片」）。 */
  readonly src?: string;
  /** 这一格该放什么照片（「正面 · 晨起」）。**必填**——它是占位格上唯一说得清「放什么」的那句话。 */
  readonly alt: string;
  /** 日期（「09-25」）。进题注条，也进分组的「几天」计数。 */
  readonly date?: string;
  /** 题注说明（位置／朝向：「侧面」「沙发 · 修复前」）。 */
  readonly caption?: string;
  /** 这一格是**几张叠着**（同一天多张）；`>= PHOTO_GRID_MIN_STACK` 才出角标。 */
  readonly count?: number;
  /** 脚注用的一行读数（「1120×1480 · 1.8 MB」）；不给＝不出。 */
  readonly size?: string;
}

/** 一个月一组（按月分组的形态）。 */
export interface PhotoGridGroup {
  /** 组头（「2026 年 9 月」）。**非空**。 */
  readonly month: string;
  /** 组的补充（「共 4.2 MB」）；不给＝组头只有月份与计数。 */
  readonly note?: string;
  /** 这一组的格（组内顺序即入参顺序）。 */
  readonly photos: readonly PhotoGridItem[];
}

/** 照片网格的入参。`photos` 与 `groups` **恰好给一个**（两个都给＝说不清按不按月分，一律 `badInput`）。 */
export interface PhotoGridInput {
  /** 平铺的格（不按月分组时用这个）。 */
  readonly photos?: readonly PhotoGridItem[];
  /** 按月分组（给了它就按组分块；组头写月份与张数）。 */
  readonly groups?: readonly PhotoGridGroup[];
  /** 定形框的比例（闭集，缺省 `4-5`：照片墙本来就是竖版居多）。整墙同一个比例——那才是「网格」。 */
  readonly ratio?: PhotoGridRatio;
  /** 末尾那格的字（缺省「加一张」）。 */
  readonly addLabel?: string;
  /** 末尾那格的一句补充（「支持 JPG／PNG，单张 ≤ 10 MB」）；不给＝只有加号与字。 */
  readonly addHint?: string;
  /** 脚注口径（「按拍摄日期分组」之类）。串＝一句话；数组＝分段。 */
  readonly note?: string | readonly string[];
  /** 一页不显示末尾那格时给 `false`（如只读的归档页）。 */
  readonly add?: boolean;
  /** 形态键（闭集，缺省 `grid`）。 */
  readonly form?: PhotoGridForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
