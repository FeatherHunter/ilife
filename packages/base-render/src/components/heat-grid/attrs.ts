/** heat-grid · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-04-形状与比例.mjs`，2026-09 用户裁定）
 *  里的**形态 A「行时段 × 列星期 ＋ 峰值符号」**——每一格是一个（行 × 列）的读数，
 *  格子的深浅表示量的大小，**带一档色键**（深浅不是唯一信息：色键给数字区间、峰值格带 ▲、
 *  右侧读数给数字）。
 *
 *  形态键写在 `HEAT_GRID_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `HEAT_GRID_CLASS + '-' + 槽名`。 */
export const HEAT_GRID_CLASS = 'ilife-block-heat-grid';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const HEAT_GRID_SLOTS = [
  /** 卡头那一排：标题 ＋ 右侧口径。 */
  'hd',
  /** 卡头标题（如「作息 · 一周」）。 */
  'title',
  /** 卡头右端那句（时间窗／单位），可换行。 */
  'stamp',
  /** 网格与右侧读数并成的那一排（容器窄时自己折行）。 */
  'gridbox',
  /** 二维网格本身（`role="img"`，行 × 列）。 */
  'grid',
  /** 左上角那格（列头之前的位置，空着）。 */
  'corner',
  /** 列头（星期）。 */
  'col-head',
  /** 行标签（时段／周次／月份）——**永不换行、永不截断**（它是这一行的坐标）。 */
  'row-label',
  /** 一格（深浅由 `is-l0`…`is-l4` 给）。 */
  'cell',
  /** 峰值格里那枚符号（▲）：深浅之外的第二条信息。 */
  'peak-mark',
  /** 右侧读数（数字：合计／峰值／最忙那一格）。 */
  'rank',
  /** 右侧读数的一行。 */
  'rank-item',
  /** 读数行的名字（可换行）。 */
  'rank-label',
  /** 读数行的值（数字，永不换行、永不截断）。 */
  'rank-value',
  /** 读数行的脚注（那一格怎么算的）。 */
  'rank-sub',
  /** 色键（**必带**：深浅不能是唯一信息）。 */
  'key',
  /** 色键两端那两个字（少／多）。 */
  'key-end',
  /** 色键的一项（色块 ＋ 数字区间）。 */
  'key-item',
  /** 色键里的色块（纯装饰：区间文字就在右边）。 */
  'swatch',
  /** 脚注一句人话。 */
  'note',
] as const;
export type HeatGridSlot = (typeof HEAT_GRID_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `HEAT_GRID_CLASS + '-' + …`）。 */
export function heatGridSlot(slot: HeatGridSlot, prefix = 'ilife-'): string {
  return prefix + 'block-heat-grid-' + slot;
}

/** 形态闭集：本件只落地了形态 A「行时段 × 列星期」。 */
export const HEAT_GRID_FORMS = ['matrix'] as const;
export type HeatGridForm = (typeof HEAT_GRID_FORMS)[number];

/** 列维度永远是**一周七天**（「列星期」是这一件的形状，不是配置项）。 */
export const HEAT_GRID_COLUMNS = 7;

/** 缺省列头（周一…周日）。 */
export const HEAT_GRID_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

/** 色阶档数：`is-l0`…`is-l4`（5 档）。 */
export const HEAT_GRID_LEVEL_COUNT = 5;

/** 缺省分档（**上界闭区间**）：0 ⇒ `l0`；1–2 ⇒ `l1`；3–4 ⇒ `l2`；5–6 ⇒ `l3`；7 以上 ⇒ `l4`。
 *  色键上那几段数字区间就是从这里算出来的 —— 色键与实际着色**同一份真值**。 */
export const HEAT_GRID_LEVEL_STOPS = [2, 4, 6] as const;

/** 峰值格里那枚符号（纯装饰的第二次提醒：颜色／深浅之外还有形）。 */
export const HEAT_GRID_PEAK_MARK = '▲';

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const HEAT_GRID_MISSING = '—';

/** 一行：行标签 ＋ 恰好七个数（一周七天，顺序与 `weekdays` 对齐）。 */
export interface HeatGridRow {
  /** 行标签（如「00–04」「第 1 周」）；**永不换行、永不截断**。 */
  readonly label: string;
  /** 这一行七格的读数（与 `weekdays` 逐列对齐）；必须都是 ≥ 0 的有限数。 */
  readonly values: readonly number[];
}

/** 右侧读数的一行：名字 ＋ 值（已经是给人看的样子的串）＋ 可选脚注。 */
export interface HeatGridFact {
  readonly label: string;
  readonly value: string;
  /** 这一格怎么算的（弱文字，可换行）；不给＝不出。 */
  readonly sub?: string;
}

/** 热力格入参。`title`／`rows` 必填——**没有二维就没有热力格**（一行量级走 `scale-bar`）。 */
export interface HeatGridInput {
  /** 卡头标题（如「作息 · 一周」）。 */
  readonly title: string;
  /** 卡头右端那句（如「3 月 9–15 日」「单位：条」）；不给＝不出。 */
  readonly stamp?: string;
  /** 读数单位（`条`／`千卡`／`次`）：色键的数字区间要用它；不给＝区间只有数字。 */
  readonly unit?: string;
  /** 各行（至少一行、至多 12 行；每行恰好 7 个数）。 */
  readonly rows: readonly HeatGridRow[];
  /** 列头（**恰好七枚**，顺序对齐周一…周日）；不给＝缺省「周一…周日」。 */
  readonly weekdays?: readonly string[];
  /** 分档上界（**恰好三个**、严格递增的非负整数）：改它就把色键的区间一起改了。 */
  readonly levelStops?: readonly number[];
  /** 右侧读数（合计／峰值／最忙那一格）；不给＝不出那一列。 */
  readonly facts?: readonly HeatGridFact[];
  /** 脚注一句人话；不给＝不出。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `matrix`）。 */
  readonly form?: HeatGridForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
