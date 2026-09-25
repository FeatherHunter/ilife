/** gap-band · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **70 差值带**的
 *  **两档**（用户逐格打分：A 档本轮 4/4/4、C…B 档上轮 4/4/4）：
 *   · `band` 连续差值带（窄档不断裂）：实际线是一根 2px 真折线，计划线是一根穿通整块的
 *     2px 虚线，两线之间的那块面积就是差（带子越宽差越大）；最深与最高两处各挂一枚图内锚点，
 *     底部一行是本周净差；
 *   · `deviation` 每日偏差柱（零位为轴，正负各自向上／下）：零位线就是目标，一天的柱朝上
 *     ＝超了目标，朝下＝还差，柱上数字一律带正负号，底部一行是累计净差。
 *  两档问的是**同一个问题**——「计划和实际之间差多少、差在哪几天」——只是读法不同
 *  （沿时间看一条连续的差／一天一根柱看超差方向），所以是**一件的两个形态**，不是两件。
 *
 *  它替掉的两种错法（原型那一件的 `p` 那两句）：**把两根线画在一起、要靠眼睛量间距**与
 *  **只报一个总达成率**（说不出哪几天超了）。
 *
 *  形态键写在 `GAP_BAND_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。`A`／`B` 是原型墙的格号，不是接口名。
 */

 /** 本件的类名根：全部槽位类名都是 `GAP_BAND_CLASS + '-' + 槽名`。 */
export const GAP_BAND_CLASS = 'ilife-block-gap-band';

/** 槽位闭集（`render.ts`、`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const GAP_BAND_SLOTS = [
  /** 卡头那一排：标题 ＋ 口径那枚 ＋ 计划／朝向那句。 */
  'hd',
  /** 卡头标题（`本周睡眠计划和实际`）。 */
  'title',
  /** 卡头里那枚口径（`本周`／`目标 1,800 卡`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句（`band` 是计划值，`deviation` 是朝向说明）。 */
  'tail',
  /* ── band 连续差值带 ── */
  /** 坐标框（纵轴刻度列 ‖ 差值图区，横轴日子行在下）。 */
  'plotbox',
  /** 纵轴刻度列（与差值图区**同高**：刻度列的高度就是尺子本身）。 */
  'yticks',
  /** 一枚纵轴刻度（只有最高那一枚带单位；首末两枚把中心对到轴顶与轴底）。 */
  'ytick',
  /** 差值图区（`role="img"`；整块一张 SVG：面积＋折线，**不按天切**）。 */
  'plot',
  /** 带子那块面积（SVG 多边形：实际折线去、计划线回，两端连成一片）。 */
  'band',
  /** 实际线（SVG 折线，2px 真线宽，不随容器拉伸变粗）。 */
  'line',
  /** 计划线（穿通整块的 2px 虚线，位置＝算出来的百分比）。 */
  'plan',
  /** 计划线右端那枚标注（`计划 7.5 h`：线型之外的第二样信息）。 */
  'planlabel',
  /** 图内锚点（最深与最高两处各一枚：哪天一档字、差多少一档字）。 */
  'anchor',
  /** 横轴日子行（与差值图区同一份等分 ⇒ 每枚的日子对着折线上它那个点）。 */
  'xax',
  /** 一枚日子（上面是日子名，下面是那天的绝对读数）。 */
  'xlabel',
  /** 一枚日子里的日子名（**永不 `…` 截断**：它是横轴的坐标）。 */
  'xday',
  /** 一枚日子里的绝对读数（数字，等宽数字位；单位不进这一行，轴顶刻度里有）。 */
  'xvalue',
  /* ── deviation 每日偏差柱 ── */
  /** 偏差柱区（`role="img"`；零位线横贯，一列一天）。 */
  'cols',
  /** 一天一列（竖向：柱 ＋ 柱上那个带符号的数）。 */
  'col',
  /** 一天的偏差柱（`is-up` 朝上超了，`is-down` 朝下还差；高度是算出来的百分比）。 */
  'bar',
  /** 柱上那个数（一律带正负号：`+400`／`−700`；**永不 `…` 截断**）。 */
  'barvalue',
  /** 零位线（就是目标，不是 0 卡；1px 实线，横贯整块）。 */
  'zero',
  /* ── 两档共用 ── */
  /** 净差行（主值一档大字、说明一档灰字：`−1.1 h` ＋ 几句话）。 */
  'sum',
  /** 净差那个数（带符号 ＋ 单位，等宽数字位）。 */
  'sumvalue',
  /** 净差那句说明（几天合起来比计划多还是少、几天没达计划）。 */
  'sumdesc',
  /** 图例（每一项：形 ＋ 字）——形不是唯一信息，字说清线型与方向。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例里那枚形（`is-line`／`is-plan`／`is-band`／`is-up`／`is-down`／`is-zero`）。 */
  'legend-mark',
  /** 脚注一句人话（口径）。 */
  'note',
] as const;
export type GapBandSlot = (typeof GAP_BAND_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `GAP_BAND_CLASS + '-' + …`）。 */
export function gapBandSlot(slot: GapBandSlot, prefix = 'ilife-'): string {
  return prefix + 'block-gap-band-' + slot;
}

/** 形态闭集：A 连续差值带（`band`）／B 每日偏差柱（`deviation`）。
 *  档键取**骨架的名字**，原型墙上的格号（A／B）不是接口名（同批 `spread-dist` 同此口径）。 */
export const GAP_BAND_FORMS = ['band', 'deviation'] as const;
export type GapBandForm = (typeof GAP_BAND_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const GAP_BAND_MISSING = '—';

/** 纵轴**目标**刻度数（3）：实际枚数由轴域整档后定（见 `scale.ts` 的 `niceAxis`）。
 *  刻度文字与计划线位置都由**同一份轴域**算出来 —— 读者按刻度读线，读到的是线真正的数。 */
export const GAP_BAND_AXIS_TICKS = 3;

/** 天数上下限：**一两天谈不上随时间的差**（最少 3）；**超过 12 天**，窄容器里一列不到 24px，
 *  日子名只能一个字一行地折 —— 再多请调用方先按周聚合。两档同一条。 */
export const GAP_BAND_MIN_DAYS = 3;
export const GAP_BAND_MAX_DAYS = 12;

/** 偏差柱高的映射上限（百分比）：零位在 50%，最高的柱画到 50% ∓ 34%。
 *  上下各留 16% 给柱上那个数 —— 最高的柱顶上那枚标注也在图区里。**这个数是 B 档唯一的坐标事实**。 */
export const GAP_BAND_DEV_MAX_PCT = 34;

/** 窄容器阈值（px）：图区矮一档。**只有一个来源** —— `style.ts` 读它。 */
export const GAP_BAND_NARROW_PX = 460;

/** 一天：日子 ＋ 那天的绝对读数。两档共用这一个形状（B 档的偏差是算出来的，不是输入的）。 */
export interface GapBandDay {
  /** 日子（`周一`／`09-15`）：上屏在横轴，**永不 `…` 截断**（长了换行）。 */
  readonly label: string;
  /** 那天的绝对读数（有限数）。B 档里拿它减目标，差就是柱。 */
  readonly value: number;
}

/** 差值带件入参。`title`／`days` 恒必填——没有标题说不出这一张是什么读数，没有天数谈不上随时间。 */
export interface GapBandInput {
  /** 卡头标题（`本周睡眠计划和实际`／`目标和摄入对比：每日偏差`）。 */
  readonly title: string;
  /** 形态键（闭集，缺省 `band`）：`band` 连续差值带／`deviation` 每日偏差柱。 */
  readonly form?: GapBandForm;
  /** 形态 `band` 必填：计划值（那根虚线画在哪；有限数）。 */
  readonly plan?: number;
  /** 形态 `deviation` 必填：目标值（零位线就是它；有限数）。 */
  readonly target?: number;
  /** 逐日读数（**3–12 天**，顺序就是横轴上的顺序）。 */
  readonly days: readonly GapBandDay[];
  /** 读数单位（`h`／`卡`）：写在**最高那一枚**纵轴刻度、锚点、净差与无障碍名里。**建议写中文**。 */
  readonly unit?: string;
  /** 卡头里那枚口径（`本周`／`目标 1,800 卡`）；不给＝不出。 */
  readonly stamp?: string;
  /** 脚注一句人话；**不给＝用本形态的口径句**（那几句是本件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
