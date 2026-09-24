/** small-multiples · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **68 小倍数面板**的
 *  **C 档「期间并排迷你柱阵 ＋ 均值线」**（2026-09 用户在墙上给这一格打 4 分；同一件的 A 档
 *  「每格一张面积 sparkline」与 B 档「对齐基线的多条 sparkline」没全过，故不落）。
 *  C 档是：同一个读数的若干**期间并排**成一根一根迷你柱（同一套归一化刻度），横着比相对高低，
 *  一条虚线给出这几期的均值，每根柱下面写着那一期的绝对读数。
 *
 *  它替掉的两种错法（原型那一件的 `p` 那两句）：
 *   · 把 N 段拼成一张多线图 —— 线全缠在一起，谁是谁看不出来；
 *   · 只给最后一期 —— 看不出这一段是涨还是跌。
 *  与同族件的分工：
 *   · `heat-grid`（热力格）的格是**色阶**（同一种量、只看浓淡、格内没有形状、读不出数）；
 *     小倍数每一格是一根**有高度的柱**，且每格下面写着它自己的读数；
 *   · `calendar-month`（月历格）按**日子**排，小倍数是**任意期间轴**（哪几周／哪几段由调用方给）；
 *   · `rank-list`（榜单）是**一期之内**的名次；小倍数问的是**同一个读数跨期**怎么变。
 *
 *  形态键写在 `SMALL_MULTIPLES_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。日后 A／B 两档复看过了线，是在这个闭集里加一格，
 *  不是新开一件（「形态是骨架，不是地址」）。
 */

/** 本件的类名根：全部槽位类名都是 `SMALL_MULTIPLES_CLASS + '-' + 槽名`。 */
export const SMALL_MULTIPLES_CLASS = 'ilife-block-small-multiples';

/** 槽位闭集（`render.ts`、`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const SMALL_MULTIPLES_SLOTS = [
  /** 卡头那一排：标题 ＋ 期间范围 ＋ 算出来的那句（虚线是什么）。 */
  'hd',
  /** 卡头标题（`日均摄入 · 六周并排`）。 */
  'title',
  /** 卡头里那枚期间范围（`W35 – W40`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句**从数据算出来**的话（`虚线＝6 期均值`）——它就是均值线的「字」，不靠颜色认线。 */
  'tail',
  /** 柱阵区（`role="img"`；一行并排的期间列，**含**那条均值线）。 */
  'cols',
  /** 均值线（纯装饰：`border-top` 虚线，位置＝算出来的百分比；字在 `mean-label`）。 */
  'mean',
  /** 均值那一枚标注（**有字**：`均值 1,810 卡`）——线型（虚线）之外的第二样「非色」信息。 */
  'mean-label',
  /** 一列（一个期间）；本期那一列另带 `is-now`（竖标＝形）。 */
  'col',
  /** 一列里的那根柱（**无文字的条 ⇒ `accent` 实底**；高度是算出来的百分比）。 */
  'bar',
  /** 横轴标签行（`<ul>`：与柱阵同一份列数与同一份间距 ⇒ 永远对着它那一根柱）。 */
  'xax',
  /** 一枚标签（一个期间：上面是期间名，下面是那一期的绝对读数）。 */
  'xlabel',
  /** 一枚标签里的期间名（**永不 `…` 截断**：它是这一列的坐标）。 */
  'xperiod',
  /** 一枚标签里的绝对读数（数字，等宽数字位）。 */
  'xvalue',
  /** 本期那一枚字（`本期`）——本期那一列的第三样信息（形 ＋ 字 ＋ 色）。 */
  'nowmark',
  /** 脚注一句人话（口径：柱高怎么归一化的、均值不是目标）。 */
  'note',
] as const;
export type SmallMultiplesSlot = (typeof SMALL_MULTIPLES_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SMALL_MULTIPLES_CLASS + '-' + …`）。 */
export function smallMultiplesSlot(slot: SmallMultiplesSlot, prefix = 'ilife-'): string {
  return prefix + 'block-small-multiples-' + slot;
}

/** 形态闭集：本件只落地**原型墙 no.68 的 C 档**「期间并排迷你柱阵 ＋ 均值线」。
 *  档键取骨架的名字（`columns`＝一行并排的期间列），`C` 是原型墙那一格的格号、不是接口名
 *  （同批 `cash-waterline` 同此口径：档键写骨架，格号写注记）。 */
export const SMALL_MULTIPLES_FORMS = ['columns'] as const;
export type SmallMultiplesForm = (typeof SMALL_MULTIPLES_FORMS)[number];

/** 期间数的上下限：**一期看不出跨期怎么变**（最少 2）；**超过 8 期**，窄容器（390）里
 *  每列不到 42px，期间名与读数只能压字——再多请调用方先合并期间（先例同族 `scatter-fit` 的分箱上限 8）。 */
export const SMALL_MULTIPLES_MIN_PERIODS = 2;
export const SMALL_MULTIPLES_MAX_PERIODS = 8;

/** 柱高的映射区间（百分比）：**不做 0 起点**——最低那一根画在 20%、最高那一根画在 84%。
 *  0 起点会让几根读数相近的柱子看起来一样高（原型那一档的口径原话：「柱高在最低与最高之间归一化」）；
 *  上下留白给均值线的那枚标注与柱顶的余量。**这两个数是本件唯一的坐标事实**（映射函数住 `scale.ts`）。 */
export const SMALL_MULTIPLES_BAR_FLOOR_PCT = 20;
export const SMALL_MULTIPLES_BAR_CEIL_PCT = 84;

/** 本期那一列轴上的那枚字：本期那一列**不靠颜色**（形＝贯穿柱阵的竖标，字＝这枚词，色＝强调色）。 */
export const SMALL_MULTIPLES_NOW_LABEL = '本期';

/** 一个期间：期间名 ＋ 那一期的读数（＋ 是不是本期）。 */
export interface SmallMultiplesPeriod {
  /** 期间名（`第 35 周`／`W35`／`上午`）——上屏在横轴，**永不 `…` 截断**（长了换行）。 */
  readonly label: string;
  /** 这一期的读数（**有限数**）。本件**不认缺值**：某一期没数就别给这一期（见 README 常见错法）。 */
  readonly value: number;
  /** 是不是「本期」那一列（缺省＝不是）。**最多标一期**——本期只有一期，标两期当场报错。 */
  readonly now?: boolean;
}

/** 小倍数件入参。`title`／`periods` 两样恒必填——没有标题说不出这一张是什么读数，
 *  没有期间谈不上「并排着比」。 */
export interface SmallMultiplesInput {
  /** 卡头标题（`日均摄入 · 六周并排`）。 */
  readonly title: string;
  /** 期间与读数（**2–8 期**，顺序就是横轴上的顺序）。 */
  readonly periods: readonly SmallMultiplesPeriod[];
  /** 读数单位（`卡`／`小时`）；**建议写中文**（写「卡」而不是 `kcal`）：会进可见文本与无障碍名。 */
  readonly unit?: string;
  /** 卡头里那枚期间范围（`W35 – W40`）；不给＝不出。 */
  readonly stamp?: string;
  /** 形态键（闭集，缺省 `columns`）：本件只有「期间并排迷你柱阵 ＋ 均值线」这一档。 */
  readonly form?: SmallMultiplesForm;
  /** 脚注一句人话；**不给＝用本件算出来的口径句**（那句里写着归一化的上下界与「均值不是目标」）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
