/** portion-gauge · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **69 量感条**的
 *  **两档**（A 档先按 3/3/3 没落，用户改口后补落——见下）：
 *   · A `gauge` 量感条（占上限几成 ＋ 两条参照刻度）：一条尺子，已用那一段压在余量底上，
 *     两枚参照刻度值挂在自己那枚刻度上；**一屏只留一层话**（可见字 72 个的量级）。
 *   · B `convert` 换算三栏（菜谱单位 → 营养库单位 → 实物）：一行一样食材，
 *     第一栏是菜谱写的那一句（`2 份`），第二栏是营养库认的那一句（`700 g`），
 *     第三栏是实物占比（占一天蛋白几成）。
 *  两档替掉的两种错法（原型那一件的 `p` 那两句）：**只给克数**（人不知道这是多是少）与
 *  **单位靠人自己心算**（菜谱的份碗把与营养库的克各说各的）。
 *
 *  A 档补落的来历（2026-09）：原型打分时它只拿到 3/3/3（B 档 4/4/4）；用户改口全部认可，
 *  原话是「文本量太大了，原型里面写了好多文字，看起来就很混乱」。故照**砍过字的那一版**落：
 *  「占一天上限」那句不写（轨道右端已经写着「一天上限 2 份」），头部「1 份」那枚胶囊不写
 *  （同一份量在「≈ 350 g」与「≈ 1 个拳头 ＋ 2 汤勺」各印过一次）。
 *
 *  形态键写在 `PORTION_GAUGE_FORMS`（闭集）：档键取**骨架的名字**，原型墙上的格号（A／B）不是
 *  接口名（同批 `spread-dist` 的 `range`／`quantile` 同此口径）。闭集外的值一律 `badInput`
 *  （不静默降级——降级会让调用方以为自己拿到了另一种骨架）。**加形态是在这个闭集里加一格，
 *  不是新开一件**（「形态是骨架，不是地址」）。
 */

/** 本件的类名根：全部槽位类名都是 `PORTION_GAUGE_CLASS + '-' + 槽名`。 */
export const PORTION_GAUGE_CLASS = 'ilife-block-portion-gauge';

/** 槽位闭集（`render.ts`、`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const PORTION_GAUGE_SLOTS = [
  /** 卡头那一排：标题 ＋ 口径那枚 ＋ 换算基准。 */
  'hd',
  /** 卡头标题（`份量换算`）。 */
  'title',
  /** 卡头里那枚口径（`菜谱 → 营养库`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句换算基准（`1 份 ＝ 350 g`）；不给＝不出。 */
  'tail',
  /* ── A 档 `gauge` 量感条 ── */
  /** 这一份叫什么（`红烧肉`）：上屏在卡头标题右边。 */
  'subject',
  /** 百分比一档大字那一行（占上限几成）。 */
  'lead',
  /** 那个百分比大字（与已用那一段的长度出自**同一个数**；**永不 `…` 截断**）。 */
  'lead-value',
  /** 量感条区：两枚参照刻度值 ＋ 轨道（尺子的整块）。 */
  'gauge',
  /** 一枚参照刻度值（`一餐建议 1.2 份`／`一天上限 2 份`）：挂在自己那枚刻度上，两枚一高一低。 */
  'mark-label',
  /** 轨道（`role="img"`；无障碍名把这一条读数说成一句话）。 */
  'rail',
  /** 轨道的余量底（一根发丝线，三级重量里最轻的那一级）。 */
  'rest',
  /** 已用的那一段（宽度＝占比本身，压在余量底上；三级重量里最重的那一级）。 */
  'used',
  /** 一根刻度竖线（四等分；带 `is-major` 的是整份那一档）。 */
  'tick',
  /** 一枚参照刻度竖线（`is-ref` 一餐建议＝实线／`is-cap` 一天上限＝虚线，两种线形分开）。 */
  'mark',
  /** 实物参照那一行（`≈ 1 个拳头 ＋ 2 汤勺`）；不给＝不出那一行。 */
  'equiv',
  /* ── B 档 `convert` 换算三栏 ── */
  /** 换算行区（一行一样食材）。 */
  'conv',
  /** 一行（头 ＋ 换算 ＋ 实物占比）。 */
  'row',
  /** 行头：食材名 ＋ 那句出处 ＋ 这一行合计多少克。 */
  'head',
  /** 食材名（`红烧肉`）。 */
  'name',
  /** 出处那句（`主料，菜谱写「2 份」`，由同一份入参拼出来）。 */
  'sub',
  /** 这一行合计多少克（与换算右栏是同一份真值）。 */
  'same',
  /** 换算框（左栏菜谱单位 → 右栏营养库口径）。 */
  'eq',
  /** 换算的一栏（左／右）；右栏另带 `is-to`。 */
  'side',
  /** 一栏的那个数（`2 份`／`700 g`，数字，等宽数字位；**永不 `…` 截断**）。 */
  'side-value',
  /** 一栏的说明（`菜谱单位`／`营养库口径（1 碗 ＝ 150 g）`）。 */
  'side-label',
  /** 两栏之间那枚方向（纯装饰，`aria-hidden`）。 */
  'arrow',
  /** 实物占比（占比条 ＋ 那句占比）。 */
  'obj',
  /** 占比条的轨道（纯装饰；占比填充压在它上面）。 */
  'bar',
  /** 占比填充（纯装饰；宽度就是占比本身——**位置由值算出**）。 */
  'fill',
  /** 那句占比（`占一天蛋白 70%`，与填充宽度出自同一个数；**永不 `…` 截断**）。 */
  'share',
  /** 脚注一句人话（口径）。 */
  'note',
  /** 缺换算那一行（`还差 2 样没有换算`）；没有缺的就不出。 */
  'missing',
] as const;
export type PortionGaugeSlot = (typeof PORTION_GAUGE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `PORTION_GAUGE_CLASS + '-' + …`）。 */
export function portionGaugeSlot(slot: PortionGaugeSlot, prefix = 'ilife-'): string {
  return prefix + 'block-portion-gauge-' + slot;
}

/** 形态闭集：A 量感条（`gauge`）／B 换算三栏（`convert`）。
 *  档键取**骨架的名字**，原型墙上的格号（A／B）不是接口名。
 *  `convert` 排在最前＝**缺省形态**（先落地的那一档的产物逐字节不变，后加的档不改它）。 */
export const PORTION_GAUGE_FORMS = ['convert', 'gauge'] as const;
export type PortionGaugeForm = (typeof PORTION_GAUGE_FORMS)[number];

/** 窄容器阈值（px）：换算框与占比行改走单列。**只有一个来源** —— `style.ts` 读它。 */
export const PORTION_GAUGE_NARROW_PX = 480;

/** 行数上下限：**一行也成立**（一道菜也要换算）；**超过 8 行**，窄容器里一屏读不完，
 *  请调用方先按餐分组（那是调用方的活，不是本件的活）。 */
export const PORTION_GAUGE_MIN_ROWS = 1;
export const PORTION_GAUGE_MAX_ROWS = 8;

/** 换算的一行：一样食材从菜谱单位到营养库单位再到实物占比。 */
export interface PortionGaugeRow {
  /** 食材名（`红烧肉`／`米饭`）：上屏在行头，**永不 `…` 截断**（长了换行）。 */
  readonly name: string;
  /** 食材分档（`主料`／`主食`／`配菜`）；不给＝出处那句只有菜谱写法。 */
  readonly kind?: string;
  /** 菜谱写的那一句（`2 份`／`2 碗`／`1 把`）：**已经是给人看的样子**，本件不拆它。
   *  它同时落在行头出处句与换算左栏——两处读的是**同一个串**。 */
  readonly recipe: string;
  /** 这一行合计多少克（有限数，须大于 0）：行头那句合计与换算右栏都从它出。 */
  readonly grams: number;
  /** 换算系数那一句（`1 碗 ＝ 150 g`）；不给＝右栏说明只有口径名。 */
  readonly basis?: string;
  /** 右栏口径名（`生重`）；不给＝`营养库口径`。 */
  readonly toLabel?: string;
  /** 占一天里哪一项（`蛋白`／`碳水`／`纤维`）：占比那句写成 `占一天蛋白 70%`。 */
  readonly shareOf: string;
  /** 占一天的百分比（0…100，有限数）：占比那句的字与占比条的宽度都从它出。 */
  readonly sharePct: number;
}

/** 形态 `gauge` 的那一份量感：尺子的量程（上限）、已用几成、两枚参照刻度、换算那两句。
 *
 *  **同一个数只印一次**（用户砍字那一条的口径）：已用几成只印在那一个大字上，
 *  上限只在「一天上限 …」那枚刻度值上，克数只在卡头右端，实物参照只在最下面那一行 ——
 *  件里**没有**第二个地方再把这些数说一遍。 */
export interface PortionGaugeGauge {
  /** 这一份叫什么（`红烧肉`）：上屏在卡头标题右边，也进无障碍名。 */
  readonly name: string;
  /** 已用占上限的几成（0…100，有限数）：那个大字与已用那一段的长度**都从它出**。 */
  readonly usedPct: number;
  /** 上限那个量（`2 份`）：屏上写成「一天上限 2 份」，收在尺子右端（尺子的量程就是 0…它）。 */
  readonly capText: string;
  /** 一餐建议那个量（`1.2 份`）：屏上写成「一餐建议 1.2 份」。**与 `refPct` 成对给。** */
  readonly refText?: string;
  /** 建议那枚刻度落在尺子的几成处（0…100，有限数）：与 `refText` 成对给。 */
  readonly refPct?: number;
  /** 实物参照那一行（`≈ 1 个拳头 ＋ 2 汤勺`）；不给＝不出那一行。 */
  readonly equiv?: string;
}

/** 份量换算件入参。`title` 恒必填；`rows`（B 档）与 `gauge`（A 档）按**形态**二选一。 */
export interface PortionGaugeInput {
  /** 卡头标题（`份量换算`／`这一餐的量`）。 */
  readonly title: string;
  /** 形态键（闭集，缺省 `convert`）：`convert` 换算三栏／`gauge` 量感条。 */
  readonly form?: PortionGaugeForm;
  /** 形态 `convert` 必填：换算各行（**1–8 行**，顺序就是屏上的顺序）。 */
  readonly rows?: readonly PortionGaugeRow[];
  /** 形态 `gauge` 必填：这一份的量感（量程、已用几成、参照刻度、换算那两句）。 */
  readonly gauge?: PortionGaugeGauge;
  /** 卡头里那枚口径（`菜谱 → 营养库`）；不给＝不出。 */
  readonly stamp?: string;
  /** 卡头右端那句换算基准（`1 份 ＝ 350 g`／`≈ 350 g`）；不给＝不出。 */
  readonly tail?: string;
  /** 脚注一句人话；不给＝`convert` 用本件的口径句（那句是本件的读数纪律，不是装饰），
   *  `gauge` **不出脚注**（两条参照刻度在尺子上自己报了名，再写一遍＝同一件事印两遍）。 */
  readonly note?: string;
  /** 缺换算系数的食材有几样（非负整数；0 或不给＝不出那一行）。`convert` 用。
   *  原型口径：缺系数的那几样**整行不画**，只在这里报数。 */
  readonly missingCount?: number;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
