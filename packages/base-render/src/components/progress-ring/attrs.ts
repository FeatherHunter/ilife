/** progress-ring · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-04-形状与比例.mjs`，2026-09 用户裁定）
 *  里的**形态 A「半环（180°）＋ 环下大字 ＋ 右侧读数」**——一块「已完成／目标」的环，
 *  环下是主读数与分母，右侧一列键值读数（还能吃多少／还差多少／照此收尾）。
 *
 *  形态键写在 `PROGRESS_RING_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `PROGRESS_RING_CLASS + '-' + 槽名`。 */
export const PROGRESS_RING_CLASS = 'ilife-block-progress-ring';

/** 槽位闭集（标记契约的一部分：`render.ts`、`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const PROGRESS_RING_SLOTS = [
  /** 卡头那一排：标题 ＋ 右侧口径。 */
  'hd',
  /** 卡头标题（如「今日热量预算」）。 */
  'title',
  /** 卡头右端那句（时间窗／期数），可换行。 */
  'stamp',
  /** 环与右侧读数并成的那一排（容器窄时自己折行）。 */
  'split',
  /** 环那一格：`svg` ＋ `hero` 一起。 */
  'gauge',
  /** 内联 SVG 本身。 */
  'svg',
  /** 环的底轨（整条 180° 弧）。 */
  'trk',
  /** 环的填充弧（`stroke-dasharray` 按弧长真值算）。 */
  'fil',
  /** 环下那行主读数（值 ＋ 单位 ＋ 分母）。 */
  'hero',
  /** 主读数的值（本件的第二识别特征：它是环下那一行大字）。 */
  'value',
  /** 单位（小一号，跟在值后）。 */
  'unit',
  /** 分母／目标（如「／1 680 千卡」）。 */
  'denom',
  /** 已完成百分数（如「75%」）：**它就是那条弧的读数**——弧长与它同出一份真值。 */
  'pct',
  /** 右侧读数列（`auto-fit`：宽容器多列、窄容器一列）。 */
  'kvs',
  /** 右侧读数里的一行。 */
  'kv',
  /** 读数行的名字（可换行）。 */
  'kv-label',
  /** 读数行的值（数字，永不换行、永不截断）。 */
  'kv-value',
  /** 脚注：一句人话（超目标时换色，见 `is-over`）。 */
  'note',
] as const;
export type ProgressRingSlot = (typeof PROGRESS_RING_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `PROGRESS_RING_CLASS + '-' + …`）。 */
export function progressRingSlot(slot: ProgressRingSlot, prefix = 'ilife-'): string {
  return prefix + 'block-progress-ring-' + slot;
}

/** 形态闭集：本件只落地了形态 A「半环 ＋ 环下大字 ＋ 右侧读数」。 */
export const PROGRESS_RING_FORMS = ['arc'] as const;
export type ProgressRingForm = (typeof PROGRESS_RING_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const PROGRESS_RING_MISSING = '—';

/** 半环的几何真值（px）：半径 70、描边 16、圆心 (90, 90)，弧从 (20, 90) 到 (160, 90)。
 *  弧长 ＝ πr（半圆）＝ `PROGRESS_RING_ARC_LEN`；填充弧的 `stroke-dasharray` 由它算出，
 *  **画出来的弧长与读出来的百分数对得上**（判据断的就是这条等式）。 */
export const PROGRESS_RING_RADIUS_PX = 70;
export const PROGRESS_RING_STROKE_PX = 16;
export const PROGRESS_RING_ARC_LEN = Math.round(Math.PI * PROGRESS_RING_RADIUS_PX * 100) / 100;

/** 右侧读数的一行：名字 ＋ 已经是给人看的样子的值（取整与单位口径归调用方）。 */
export interface ProgressRingRow {
  /** 名字（如「还能吃」）。 */
  readonly label: string;
  /** 值（如「420 千卡」）；缺值写成 `—`（`PROGRESS_RING_MISSING`）。 */
  readonly value: string;
}

/** 进度环入参。`title`／`value`／`goal` 必填——**没有分母的进度不走本件**（那是一条 `scale-bar`）。 */
export interface ProgressRingInput {
  /** 卡头标题（如「今日热量预算」）。 */
  readonly title: string;
  /** 卡头右端那句（如「3 月 14 日 · 周六」）；不给＝不出。 */
  readonly stamp?: string;
  /** 已完成量（与 `goal` 同单位）。必须 ≥ 0；**可以大于 `goal`**（那是「超目标」态，不算错）。 */
  readonly value: number;
  /** 目标量（**必须 > 0**，作比例的分母与弧长的标尺）。 */
  readonly goal: number;
  /** 单位（`千卡`／`元`／`件`）：跟在读数与分母后面，不参与任何机器口径。 */
  readonly unit?: string;
  /** 右侧那列读数（如「还能吃 420 千卡」）；不给＝环独占整排。 */
  readonly rows?: readonly ProgressRingRow[];
  /** 脚注那句人话（未超目标时用）。不给＝本件按读数自己算一句。 */
  readonly note?: string;
  /** 脚注那句人话（**超目标时**用）。不给＝本件按差额与超出百分比自己算一句。 */
  readonly overNote?: string;
  /** 形态键（闭集，缺省 `arc`）。 */
  readonly form?: ProgressRingForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
