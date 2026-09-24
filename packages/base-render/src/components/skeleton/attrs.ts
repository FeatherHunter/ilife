/** skeleton · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位／`data-*`／闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/parts-09-选择与反馈.mjs` 里 48 加载骨架的
 *  **形态 A「读数 ＋ 明细行骨架」**（2026-09 用户裁定落地的那一形态），按层规重写
 *  （原型是一次性代码：无判据、无错误处理、读的是墙稿变量）。
 *
 *  这一件替掉两种错法：
 *   · 一排等宽灰杠 —— 读的人看不出「等来的是什么版式」，加载完那一下「啪」地换掉；
 *   · 转圈圈 —— 说不出「在等什么、还要多久」，还把版面撑成一个没有形状的方块。
 *  所以本件的骨架**照真版式排**：一条读数用的**大字位**＋ 若干条**明细行**（时间槽／两行名称位／值位），
 *  行与行之间是发丝线 —— 与 `entry-rows`（明细行）同一副盒子，真数据进来时**不跳版**。
 *
 *  形态键住 `SKELETON_FORMS` 闭集（今天只有 `reading-list` 一格）：加第二形态是往闭集里加一格，
 *  不是新开一件。闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *
 *  **本件没有运行时段**：骨架不接事件、不点不动（它是"正在读"的样子，不是控件）。
 */

/** 本件的类名根：全部槽位类名都是 `SKELETON_CLASS + '-' + 槽名`。 */
export const SKELETON_CLASS = 'ilife-block-skeleton';

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都读这里的名字拼类名，不各抄一份字面量）。 */
export const SKELETON_SLOTS = [
  /** 排头那句人话（正在读什么 ＋ 还要多久），`role="status"`。 */
  'cap',
  /** 正在读什么。 */
  'cap-text',
  /** 还要多久／读多少。 */
  'cap-eta',
  /** 纸面（骨架落在它上面，占位块与真件的盒模型在这一层对齐）。 */
  'card',
  /** 读数位：真件这里是页头的主读数（大字）。 */
  'reading',
  /** 读数的大字占位块（高度＝主读数字号，**与 `page-head` 的主读数同尺度**）。 */
  'reading-value',
  /** 读数下的副行占位块（真件这里是「已吃目标的 46%」这类一句话）。 */
  'reading-sub',
  /** 明细行组（`rows` 条）。 */
  'list',
  /** 一条明细行的占位（三列：时间／名称／值）。 */
  'row',
  /** 时间槽占位（与 `entry-rows` 的时间槽同宽）。 */
  'row-time',
  /** 名称位：两行（真件是名称 ＋ 一行旁证）。 */
  'row-lines',
  /** 名称位的第一行（长）。 */
  'line',
  /** 名称位的第二行（短）。 */
  'line-short',
  /** 值位占位（右对齐）。 */
  'row-value',
] as const;
export type SkeletonSlot = (typeof SKELETON_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SKELETON_CLASS + '-' + …`）。 */
export function skeletonSlot(slot: SkeletonSlot, prefix = 'ilife-'): string {
  return prefix + 'block-skeleton-' + slot;
}

/** 形态键属性（值＝`SkeletonForm`）。 */
export const SKELETON_FORM_ATTR = 'data-ilife-skeleton-form';
/** 行数（机器读数：版面高度＝关于它的线性式，页面据此预留空间）。 */
export const SKELETON_ROWS_ATTR = 'data-ilife-skeleton-rows';

/** 形态闭集：本件只落地形态 A「读数 ＋ 明细行骨架」。 */
export const SKELETON_FORMS = ['reading-list'] as const;
export type SkeletonForm = (typeof SKELETON_FORMS)[number];

/** 占位行数的上限（防呆）：一行不留的把戏没人看，几百行的骨架是 bug（真数据该分页）。 */
export const SKELETON_MAX_ROWS = 12;

/** 加载骨架入参。 */
export interface SkeletonInput {
  /** 正在读什么（人话，如「正在读取今日饮食…」）：非空，**必填**。 */
  readonly label: string;
  /** 明细行占位几条（整数 1..`SKELETON_MAX_ROWS`）：与真件的行数一致，加载完才不跳版。 */
  readonly rows: number;
  /** 还要多久／读多少（如「通常 1 秒」「共 8 条」）：不给＝排头只有那句人话。 */
  readonly eta?: string;
  /** 形态键（闭集，缺省 `reading-list`）。 */
  readonly form?: SkeletonForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
