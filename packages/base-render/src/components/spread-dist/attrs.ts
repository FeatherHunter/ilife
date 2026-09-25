/** spread-dist · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **65 分布与分位**的
 *  **两档**（用户逐格打分：B 档 4/4/4、C 档 4/4/4；A 档箱线只拿到 3/3/3，**不落**）：
 *   · B `range` 逐日范围柱（中位＋区间，时间轴）：每天一根从最低到最高的竖条，
 *     中间的粗块是当天读数的中位数，横轴是日子，纵轴是同一个读数；
 *   · C `quantile` 分位尺（P10/P25/P50/P75/P90 各是多少）：**结论一句话在上、读数在下**，
 *     正中那一档（中位）带选中面。
 *  两档问的是**同一个问题**——「这一批读数摊开是什么形状、分位在哪」——只是读法不同
 *  （沿时间逐日看一遍／沿分位一次读完），所以是**一件的两个形态**，不是两件。
 *
 *  它替掉的两种错法（原型那一件的 `p` 那两句）：**只给平均值**（把离群点抹平）与
 *  **用一张条形图硬扛分布**（一根柱只表示一个数，读不出「中间那批人落在哪」）。
 *
 *  形态键写在 `SPREAD_DIST_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。日后 A 档复看过了线，是在这个闭集里加一格，
 *  不是新开一件（「形态是骨架，不是地址」）。
 */

/** 本件的类名根：全部槽位类名都是 `SPREAD_DIST_CLASS + '-' + 槽名`。 */
export const SPREAD_DIST_CLASS = 'ilife-block-spread-dist';

/** 槽位闭集（`render.ts`、`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const SPREAD_DIST_SLOTS = [
  /** 卡头那一排：标题 ＋ 口径那枚时间窗 ＋ 算出来的那句话。 */
  'hd',
  /** 卡头标题（`七天摄入波动`）。 */
  'title',
  /** 卡头里那枚口径（`每日 3 餐`／`38 笔`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句**从数据算出来**的话（`区间最宽的是周三（1,000 到 8,200 卡）`）。 */
  'tail',
  /* ── B 逐日范围柱 ── */
  /** 坐标框（纵轴刻度列 ‖ 逐日柱区，横轴日子行在下）。 */
  'plotbox',
  /** 纵轴刻度列（每枚**绝对定位**在它自己那个值的位置上——位置与刻度文字出自同一份轴域）。 */
  'yticks',
  /** 一枚纵轴刻度（只有最高那一枚带单位）。 */
  'ytick',
  /** 逐日柱区（`role="img"`；列数＝天数，一列一天）。 */
  'days',
  /** 一天一列（竖向：范围条 ＋ 中位块）。 */
  'day',
  /** 当天最低到最高那根范围条（纯装饰；强调色的淡洗面）。 */
  'day-range',
  /** 当天中位数那个粗块（纯装饰；强调色实底——**无文字的图形**那一档）。 */
  'day-median',
  /** 横轴日子行（与柱区同一份列数与同一份间距 ⇒ 永远对着它那一列）。 */
  'xax',
  /** 一枚日子（`周一`／`09-15`）。 */
  'xlabel',
  /* ── C 分位尺 ── */
  /** 结论一句话（**在读数上面**：先给答案，再给读数）。 */
  'lead',
  /** 分位读数区（`role="img"`；一档一格，正中那一格是中位）。 */
  'stops',
  /** 一档（分位名 ＋ 说明句 ＋ 那个数）；正中那一档另带 `is-median`（选中面）。 */
  'stop',
  /** 一档的分位名（`P10`／`P25`／`中位`）。 */
  'stop-name',
  /** 一档的说明句（`不超过它的读数占 25%`）；档名不是 `P<数字>` 时＝空串（不出这一槽）。 */
  'stop-label',
  /** 一档那个数（数字，等宽数字位；**永不 `…` 截断**）。 */
  'stop-value',
  /* ── 两档共用 ── */
  /** 图例（每一项：形 ＋ 字）——只有 B 档有（C 档的档名本身就是坐标）。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例里那枚形（`is-range`／`is-median`）。 */
  'legend-mark',
  /** 脚注一句人话（口径）。 */
  'note',
] as const;
export type SpreadDistSlot = (typeof SPREAD_DIST_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SPREAD_DIST_CLASS + '-' + …`）。 */
export function spreadDistSlot(slot: SpreadDistSlot, prefix = 'ilife-'): string {
  return prefix + 'block-spread-dist-' + slot;
}

/** 形态闭集：B 逐日范围柱（`range`）／C 分位尺（`quantile`）。
 *  档键取**骨架的名字**，原型墙上的格号（B／C）不是接口名（同批 `cash-waterline`／`small-multiples` 同此口径）。 */
export const SPREAD_DIST_FORMS = ['range', 'quantile'] as const;
export type SpreadDistForm = (typeof SPREAD_DIST_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const SPREAD_DIST_MISSING = '—';

/** 纵轴**目标**刻度数（4）：实际枚数由轴域整档后定，落在 3…6 之间（见 `scale.ts` 的 `niceAxis`）。
 *  刻度文字与刻度位置都由**同一份轴域**算出来 —— 读者按刻度读出的值必须与柱子的位置对得上。 */
export const SPREAD_DIST_AXIS_TICKS = 4;

/** 枚数上限（自证用）：`niceStep` 取的是「不小于目标间隔的最小整档」，故 (上界−下界) ≤ (目标+1)×步长。 */
export const SPREAD_DIST_MAX_TICKS = SPREAD_DIST_AXIS_TICKS + 2;

/** B 档的天数上下限：**一天谈不上逐日波动**（最少 3）；**超过 12 天**，窄容器（390）里一列不到 24px，
 *  日子名只能一个字一行地折 —— 再多请调用方先按周聚合（那是 `small-multiples` 的活）。 */
export const SPREAD_DIST_MIN_DAYS = 3;
export const SPREAD_DIST_MAX_DAYS = 12;

/** C 档的档数上下限：**3／5／7**（必须是奇数——正中那一档就是中位，偶数档没有正中）。
 *  少于 3 档读不出「摊开」；多于 7 档，窄容器里每一格都要折行，一屏读不完。 */
export const SPREAD_DIST_MIN_STOPS = 3;
export const SPREAD_DIST_MAX_STOPS = 7;

/** 窄容器阈值（px）：柱区矮一档、刻度距收一档。**只有一个来源** —— `style.ts` 读它。 */
export const SPREAD_DIST_NARROW_PX = 460;

/** B 档的一天：日子 ＋ 当天读数的区间 ＋（可选）中位数。 */
export interface SpreadDistDay {
  /** 日子（`周一`／`09-15`）：上屏在横轴，**永不 `…` 截断**（长了换行）。 */
  readonly label: string;
  /** 当天最低那个读数（有限数）。 */
  readonly low: number;
  /** 当天最高那个读数（有限数）；须满足 `low ≤ high`。 */
  readonly high: number;
  /** 当天读数的中位数；**不给＝那一天只画区间**（中位块不出，`title` 里写 `—`，
   *  绝不拿最低或最高顶替——那会把「今天中间那批落在哪」这件事编出来）。 */
  readonly median?: number;
}

/** C 档的一档：分位名 ＋ 那个数。 */
export interface SpreadDistStop {
  /** 分位名（`P10`／`P25`／`P50`／`P75`／`P90`；也接受 `中位` 这类没有百分位的写法）。
   *  **与别的档同名一律报错**：档名是这一格的坐标（写在格上、也进无障碍名）。 */
  readonly name: string;
  /** 这一档的数（有限数）。**必须随档名递减而递增**（分位本来就是单调的）。 */
  readonly value: number;
}

/** 分布与分位件入参。`title` 恒必填——没有标题说不出这一张是什么读数。 */
export interface SpreadDistInput {
  /** 卡头标题（`七天摄入波动`／`单笔金额分位`）。 */
  readonly title: string;
  /** 形态键（闭集，缺省 `range`）：`range` 逐日范围柱／`quantile` 分位尺。 */
  readonly form?: SpreadDistForm;
  /** 形态 `range` 必填：逐日读数（**3–12 天**，顺序就是横轴上的顺序）。 */
  readonly days?: readonly SpreadDistDay[];
  /** 形态 `quantile` 必填：分位各档（**3／5／7 档**，偶数档报错）。 */
  readonly stops?: readonly SpreadDistStop[];
  /** 读数单位（`卡`／`元`）：写在**最高那一枚**纵轴刻度、每一档的读数与无障碍名里。**建议写中文**。 */
  readonly unit?: string;
  /** 卡头里那枚口径（`每日 3 餐`／`38 笔`）；不给＝不出。 */
  readonly stamp?: string;
  /** 脚注一句人话；**不给＝用本形态的口径句**（那几句是本件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
