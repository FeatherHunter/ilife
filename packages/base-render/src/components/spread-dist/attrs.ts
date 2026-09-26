/** spread-dist · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **65 分布与分位**的
 *  **三档**（用户逐格打分：B 档 4/4/4、C 档 4/4/4；A 档箱线第一轮 3/3/3，**砍过文字之后**这一轮复看
 *  改口全认可 ⇒ 补落）：
 *   · A `box` 箱线（多组并排，横排）：一行一组，**同一把尺子横着量**；
 *     箱体＝P25 到 P75、箱里的粗线＝中位、须＝两端、圈＝离群点，样本不足的组只把每一笔点在尺子上；
 *   · B `range` 逐日范围柱（中位＋区间，时间轴）：每天一根从最低到最高的竖条，
 *     中间的粗块是当天读数的中位数，横轴是日子，纵轴是同一个读数；
 *   · C `quantile` 分位尺（P10/P25/P50/P75/P90 各是多少）：**结论一句话在上、读数在下**，
 *     正中那一档（中位）带选中面。
 *  三档问的是**同一个问题**——「这一批读数摊开是什么形状、分位在哪」——只是读法不同
 *  （沿分组并排看一遍／沿时间逐日看一遍／沿分位一次读完），所以是**一件的三个形态**，不是三件。
 *
 *  A 档那一档的落地口径＝**用户打 4 分的那一版原型（砍过文字的那版）**，逐条：
 *   · 单位只印一次（卡头右端一个 `元`），故**刻度值不带单位**；
 *   · 图例只有三项（`P25–P75`／`离群`／`单笔`）——「中位数」那条**删掉**（行头已各印一次「中位 NN」）；
 *   · **行头一行一档字号**（组名／笔数／中位同行同字号），不是「灰字组名＋大号中位」两行。
 *
 *  它替掉的两种错法（原型那一件的 `p` 那两句）：**只给平均值**（把离群点抹平）与
 *  **用一张条形图硬扛分布**（一根柱只表示一个数，读不出「中间那批人落在哪」）。
 *
 *  形态键写在 `SPREAD_DIST_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。**旧两档的键一个字都不许改**（那是契约），
 *  新档是往这个闭集后面**加一格**，不是新开一件（「形态是骨架，不是地址」）。
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
  /** 卡头右端那句**从数据算出来**的话（`区间最宽的是周三（1,000 到 8,200 卡）`）；A 档那一位是**单位**
   *  （单位只印一次：刻度值不再逐枚带单位），没有单位就不出这一槽。 */
  'tail',
  /* ── A 箱线 ── */
  /** 行区（`role="img"`；一组一行，组数＝调用方给的行数）。 */
  'groups',
  /** 贯穿整个行区的竖向网格线（**每一枚刻度一根**：位置与尺子上那枚刻度出自同一个值）。 */
  'grid',
  /** 一根网格线（位置是算出来的百分比，`absolute ＋ left`）。 */
  'grid-line',
  /** 一行（一行一组：行头 ＋ 轨道）。 */
  'group',
  /** 行头（组名 ＋ 笔数 ＋ 中位）：**一行一档字号**，三样同行同号。 */
  'group-hd',
  /** 组名（`餐饮`）。 */
  'group-name',
  /** 这一组的笔数（`18 笔`）。 */
  'group-count',
  /** 行头里的「中位 NN」（与组名／笔数同字号；**不是**另起一行的大号数）。 */
  'group-median',
  /** 一行的那把轨道（竖向网格线穿过它；须／箱体／中位／点都在这上面，位置全由值算出来）。 */
  'track',
  /** 贯穿的底线（每行一条通栏发丝线：四行叠起来读成一把尺子）。 */
  'rail',
  /** 须（最低到最高：1px 线 ＋ 两端封口）。 */
  'whisker',
  /** 箱体（P25 到 P75：发丝边 ＋ 一档淡洗面）。 */
  'box',
  /** 中位那条粗线（全图唯一的重焦点：3px 实底）。 */
  'median',
  /** 一枚离群点（空心圈：**在须之外**的读数）。 */
  'outlier',
  /** 一枚单笔读数（样本不足的组：每一笔直接点在尺子上）。 */
  'point',
  /** 尺子（一根通栏线 ＋ 刻度）：全档共用这一把，四行按它读数。 */
  'ruler',
  /** 一枚刻度（1px 竖线：**它的中心落在它那个值的位置上**）。 */
  'tick',
  /** 一枚刻度的值（贴在刻度上；首末两枚贴端，末端那枚不再逐枚带单位）。 */
  'tick-value',
  /* ── B 逐日范围柱 ── */
  /** 坐标框（纵轴刻度列 ‖ 逐日柱区，横轴日子行在下）。 */
  'plotbox',
  /** 纵轴刻度列（每枚**绝对定位**在它自己那个值的位置上——位置与刻度文字出自同一份轴域）。 */
  'yticks',
  /** 一枚纵轴刻度（只有最高那一枚带单位）。 */
  'ytick',
  /** 刻度列的隐形撑子（与刻度同字，逐行一份：各枚刻度绝对定位后列里没有在流内容，列宽由它撑住）。 */
  'yticks-sizer',
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
  /* ── 各档共用 ── */
  /** 图例（每一项：形 ＋ 字）——A 档与 B 档有（C 档的档名本身就是坐标）。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例里那枚形（`is-box`／`is-outlier`／`is-point`／`is-range`／`is-median`）。 */
  'legend-mark',
  /** 脚注一句人话（口径）。 */
  'note',
] as const;
export type SpreadDistSlot = (typeof SPREAD_DIST_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SPREAD_DIST_CLASS + '-' + …`）。 */
export function spreadDistSlot(slot: SpreadDistSlot, prefix = 'ilife-'): string {
  return prefix + 'block-spread-dist-' + slot;
}

/** 形态闭集：A 箱线（`box`）／B 逐日范围柱（`range`）／C 分位尺（`quantile`）。
 *  档键取**骨架的名字**，原型墙上的格号（A／B／C）不是接口名（同批 `cash-waterline`／`small-multiples` 同此口径）。
 *  **旧两档的键一个字都不许改**（已上线的那两档是契约）；新档（A 箱线）追加在**后面**，故不启用它时
 *  前两档的产物逐字节不变（加法式）。 */
export const SPREAD_DIST_FORMS = ['range', 'quantile', 'box'] as const;
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

/** A 档的组数上下限：一组也画得出（那是「这一批读数摊开成什么形状」）；**多于 8 组**，一屏读不完，
 *  请调用方先按大类归并（那是件外的事，件里不替它归）。 */
export const SPREAD_DIST_MIN_BOXES = 1;
export const SPREAD_DIST_MAX_BOXES = 8;

/** A 档**画箱**的样本量地板：不到 5 笔，箱体（P25 到 P75）的形状是估计出来的，样本太少就是假的
 *  ⇒ 那一组只把每一笔点在尺子上（原型那一版的口径：4 笔的组只点四笔、不画箱）。 */
export const SPREAD_DIST_BOX_MIN_COUNT = 5;

/** A 档一行轨道的高度（px）：箱体、须、中位线与点都按它居中。**只有一个来源**（`style-box.ts` 读它）。 */
export const SPREAD_DIST_TRACK_PX = 30;

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

/** A 档的一组读数（一行）：**两种读法二选一**——给五数概括（画箱）／给单笔读数（样本不足，只点）。 */
export interface SpreadDistBox {
  /** 组名（`餐饮`／`日用`）：上屏在行头，**永不 `…` 截断**（长了换行）。**与别的组同名一律报错**。 */
  readonly label: string;
  /** 这一组有几笔（正整数）：上屏在行头（`18 笔`），也进无障碍名。
   *  **画箱那一支要求 ≥ `SPREAD_DIST_BOX_MIN_COUNT`**（样本不足时箱体的形状是假的）。 */
  readonly count: number;
  /** 这一组读数的中位数（有限数）：上屏在行头（`中位 58`）与那条粗线上。 */
  readonly median: number;
  /** 五数概括的下端（须的左端）；**与 `q1`／`q3`／`high` 要么全给、要么全不给**。 */
  readonly low?: number;
  /** 下四分位（P25）：箱体的左端。 */
  readonly q1?: number;
  /** 上四分位（P75）：箱体的右端。 */
  readonly q3?: number;
  /** 五数概括的上端（须的右端）。 */
  readonly high?: number;
  /** 离群点（**只在画箱那一支许给**；每一个都必须落在 `low` 与 `high` 之外——落在须里的点不是离群点）。 */
  readonly outliers?: readonly number[];
  /** 单笔读数（**只在样本不足那一支许给**：**每一笔都点在尺子上**，个数必须正好等于 `count`）。 */
  readonly points?: readonly number[];
}

/** 分布与分位件入参。`title` 恒必填——没有标题说不出这一张是什么读数。 */
export interface SpreadDistInput {
  /** 卡头标题（`七天摄入波动`／`单笔金额分位`／`本月单笔金额分布`）。 */
  readonly title: string;
  /** 形态键（闭集，缺省 `range`）：`range` 逐日范围柱／`quantile` 分位尺／`box` 箱线。 */
  readonly form?: SpreadDistForm;
  /** 形态 `range` 必填：逐日读数（**3–12 天**，顺序就是横轴上的顺序）。 */
  readonly days?: readonly SpreadDistDay[];
  /** 形态 `quantile` 必填：分位各档（**3／5／7 档**，偶数档报错）。 */
  readonly stops?: readonly SpreadDistStop[];
  /** 形态 `box` 必填：各组读数（**1–8 组**，顺序就是屏上的顺序；一组一行）。 */
  readonly boxes?: readonly SpreadDistBox[];
  /** 读数单位（`卡`／`元`）：`range`／`quantile` 写进刻度与每一档的读数里；
   *  **`box` 只印在卡头右端一次**（单位只印一次，刻度值不再逐枚带单位）。**建议写中文**。 */
  readonly unit?: string;
  /** 卡头里那枚口径（`每日 3 餐`／`38 笔`）；不给＝不出。 */
  readonly stamp?: string;
  /** 脚注一句人话；**不给＝用本形态的口径句**（那几句是本件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
