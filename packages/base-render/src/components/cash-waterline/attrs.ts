/** cash-waterline · **标记契约**（渲染与调用方共用的唯一事实：类名／形态闭集／槽位闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 里 **64 现金水位**的三个形态
 *  （2026-09 用户逐格打分 A／B／C **全 4 分**——三个形态都被认可，故一并落进同一件）：
 *   · `waterline` 逐日水位柱（底线 ＋ 告急日点名）：柱高＝当天结束时「预算 − 已花」占预算的百分比；
 *   · `bullet`    每周子弹图（实际 ＋ 底线刻度）：横条＝本周结束时累计已用掉的比例，竖线＝跌破底线的位置；
 *   · `flow`      进出水三栏（构成 ＋ 够不够撑到月底）：进／出／余各一栏，判定写成字。
 *
 *  它替掉的三种错法（原型那一件的 `p` 逐字）：
 *   · 只给一个本月结余数字 —— 看不出是哪几天花超了；
 *   · 用一条满格的进度条冒充时间轴 —— 存量与消耗混成一个数；
 *   · 把「跌破底线」只染成红色 —— 说不出是哪几天、那天花了多少。
 *
 *  与同族件的分工（别拿这一件当它们用）：
 *   · `invoice-lines`（金额分解）沿的是**科目**（总额一路加减到明细）；水位沿的是**时间**，读的是「存量还在不在底线之上」；
 *   · `stacked-bar`（构成条）是一条横条里的占比，没有时间轴、也没有阈值线；
 *   · `progress-list`（多目标进度）是「已达到 ÷ 目标」的两数之比，没有逐日余量形状，也答不出「几号会跌破底线」。
 *
 *  形态键写在 `CASH_WATERLINE_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `CASH_WATERLINE_CLASS + '-' + 槽名`。 */
export const CASH_WATERLINE_CLASS = 'ilife-block-cash-waterline';

/** 槽位闭集（`render.ts`、`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const CASH_WATERLINE_SLOTS = [
  /** 卡头那一排：标题 ＋ 右端口径。 */
  'hd',
  /** 卡头标题（如「本月可用余量 · 逐日」）。 */
  'title',
  /** 卡头右端那一组（本件算出来的那句 ＋ 调用方给的那句）。 */
  'hd-tail',
  /** 卡头**第三格**：本件按形态算出来的那一句（水位的「底线 1 800 元（30%）」／子弹图的「竖线＝底线 30%」／
   *  三栏的「还剩 6 天」）。原型那一格就是它——少了它，读者读不出底线是多少钱、还剩几天。 */
  'head-extra',
  /** 卡头右端那句（预算／区间／周数），可换行。 */
  'stamp',
  /** 形态 `waterline`：逐日水位柱的画布（`role="img"`）。 */
  'plot',
  /** 底线那条虚线（绝对定位，**纯装饰**：字在 `thr-text` 里）。 */
  'thr',
  /** 底线那一枚标签（**有字**：`底线 30%`）。 */
  'thr-text',
  /** 画布里的一格（一天）。 */
  'col',
  /** 那一格里的水位柱（**无文字的条**：色走 `accent`，跌破底线走 `danger`）。 */
  'fill',
  /** 横轴那一排：**一格一天**（与画布同列数、同间距，刻度逐格对齐）。 */
  'xax',
  /** 横轴的一格：有刻度字的那几格写字（今天那一格写「今天」），其余格是空的但**位置照留**。 */
  'xax-cell',
  /** 形态 `bullet`：分周子弹图的行容器。 */
  'bullet',
  /** 子弹图的一行（一周）。 */
  'brow',
  /** 行头那一排：名字 ｜ 进 ｜ 出 ｜ 净 ｜ 越过底线的读数。 */
  'bhd',
  /** 行头里的名字（「第 3 周」）。 */
  'bhd-name',
  /** 行头里的进／出读数。 */
  'bhd-num',
  /** 行头右端的净额（带正负号）。 */
  'net',
  /** 越过底线时的读数点名（`已用 136%`）：**条形画到满格，读数里照实写**。 */
  'over',
  /** 子弹图的轨道（满宽＝整月预算）。 */
  'rail',
  /** 轨道里的填充（本周结束时累计已用掉的比例）。 */
  'rail-fill',
  /** 轨道上的底线刻度（竖线，**纯装饰**：位置由 `usedThreshold` 给）。 */
  'rail-thr',
  /** 形态 `flow`：进出水三栏。 */
  'three',
  /** 三栏里的一栏。 */
  'card',
  /** 栏头那一排：栏名 ｜ 笔数或占比 ｜ 合计。 */
  'card-hd',
  /** 栏名（进／出／余）。 */
  'card-name',
  /** 栏头中间那枚（笔数／占预算）。 */
  'card-count',
  /** 栏头右端的合计（大字读数）。 */
  'card-total',
  /** 栏里的一行（名字 ＋ 条）。 */
  'line',
  /** 一行的轨道。 */
  'line-bar',
  /** 轨道里的填充（同行内与该栏合计之比）。 */
  'line-fill',
  /** 那一行的读数（名字 ＋ 钱数）。 */
  'line-text',
  /** 余栏里那块判定（撑得住／撑不住）。 */
  'verdict',
  /** 判定那两个字（**结论写成字**，不只靠颜色）。 */
  'verdict-word',
  /** 图例（色块 ｜ 一句话；**数字另在点名那块里**）。 */
  'legend',
  /** 图例的一行。 */
  'legend-item',
  /** 图例左端那枚色块（纯装饰）。 */
  'swatch',
  /** 告急日点名那块（**逐日点名**：日期 ＋ 那天花了多少 ＋ 余量）。 */
  'lowlist',
  /** 点名那块的小标题（`跌破底线的日子 · 4 天`）。 */
  'low-title',
  /** 点名那块的行容器（`<ul>`）。 */
  'low-rows',
  /** 点名的一行。 */
  'low-row',
  /** 点名行里的日期。 */
  'low-day',
  /** 点名行里的「那天花了多少」。 */
  'low-spend',
  /** 点名行里的余量。 */
  'low-pct',
  /** 口径行（这一张图怎么读）。 */
  'note',
] as const;
export type CashWaterlineSlot = (typeof CASH_WATERLINE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `CASH_WATERLINE_CLASS + '-' + …`）。 */
export function cashWaterlineSlot(slot: CashWaterlineSlot, prefix = 'ilife-'): string {
  return prefix + 'block-cash-waterline-' + slot;
}

/** 形态闭集：`waterline` 逐日水位柱 ／ `bullet` 每周子弹图 ／ `flow` 进出水三栏。 */
export const CASH_WATERLINE_FORMS = ['waterline', 'bullet', 'flow'] as const;
export type CashWaterlineForm = (typeof CASH_WATERLINE_FORMS)[number];

/** 底线的缺省值（占预算的百分比）：**30%**——与原型墙上那一件同值。 */
export const CASH_WATERLINE_DEFAULT_THRESHOLD_PCT = 30;

/** 逐日水位柱最多几天（一个月）：再多的日子在窄容器里柱子细到看不见，请调用方先归并到周（换形态 `bullet`）。 */
export const CASH_WATERLINE_MAX_DAYS = 31;

/** 逐格刻度最多几列（＝最多几天）：再多，一格只有几个像素宽——**一个汉字都站不下**
 *  （31 天在 320 档，格子 5.5px、一个汉字 12px），刻度字必然越格或越出根。
 *  超过它就改出**一行区间读数**（`09-01 – 09-31` ＋今天那一格），照实说清这一段是哪几天。 */
export const CASH_WATERLINE_MAX_AXIS_COLUMNS = 14;

/** 横轴逐格刻度最多出几枚（**算出来的**：多了挤在一起＝压字；日期本身在点名那块里一个不少）。
 *  三条不变量（判据逐长度断）：**① 枚数 ≤ 这个数**（14 天以内逐格刻度的长度全都成立）；
 *  **② 第一列必出**；**③ 今天必占一枚**（今天落在哪一列都写得出「今天」）。 */
export const CASH_WATERLINE_MAX_AXIS_LABELS = 6;

/** 横轴刻度字的长度上限（字符）：那一格只有一根柱子那么宽，长标签会折成好几行、压到隔壁的刻度。
 *  **日期写法都在范围内**（`09-21` 五个字、`2026-09-24` 十个字）；更长的请调用方自己截短（本件不替你猜）。 */
export const CASH_WATERLINE_MAX_LABEL_CHARS = 10;

/** 子弹图最多几周（一个月最多 6 周，留一点余量）。 */
export const CASH_WATERLINE_MAX_WEEKS = 8;

/** 进出水三栏每栏最多几行（多余的尾巴请调用方自己并成「其他」）。 */
export const CASH_WATERLINE_MAX_LINES = 8;

/** 缺值的写法：**写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const CASH_WATERLINE_MISSING = '—';

/** 钱的缺省单位（不给 `unit` 时用它）。 */
export const CASH_WATERLINE_DEFAULT_UNIT = '元';

/* ── 行内自定义属性（**本件自己的名字**，不占 `--ilife-*` 那个命名空间） ──────────
 *  为什么不用 `--ilife-*`：那是皮肤 token 的空间（名单住 `skin/contract.ts`），件里塞私有名
 *  会在皮肤矩阵判据里读成「名单外的 token」。先例 `photo-compare` 的 `--photo-compare-split`。 */

/** 一根水位柱的高度（百分数）。 */
export const CASH_WATERLINE_HEIGHT_VAR = '--cash-waterline-h';
/** 一条填充的宽度（百分数）。 */
export const CASH_WATERLINE_WIDTH_VAR = '--cash-waterline-w';
/** 底线在画布上的位置（从底往上，百分数）。 */
export const CASH_WATERLINE_THRESHOLD_VAR = '--cash-waterline-thr';
/** 底线换算成「已用掉多少」时在轨道上的位置（从右壁往左，百分数）＝ `100 − 底线`。 */
export const CASH_WATERLINE_USED_THRESHOLD_VAR = '--cash-waterline-used-thr';

/** 逐日水位柱的一天：**当天结束时**的余量 ＋ 那天花了多少。 */
export interface CashWaterlineDay {
  /** 日期（「09-21」）：上屏在**告急日点名**与无障碍名里；**非空**，且**至多 `CASH_WATERLINE_MAX_LABEL_CHARS` 个字符**。 */
  readonly label: string;
  /** **轴上那枚刻度字**（缺省＝`label`）：一个月 31 天时给短日期（`15`）才能一行一枚；
   *  不给而 `label` 又比那一格宽时，刻度字在**自己那一格里折行**（不越格、不压隔壁）。同样至多 10 个字符。 */
  readonly axisLabel?: string;
  /** 当天结束时「预算 − 已花」占预算的百分比（0–100 的有限数）。 */
  readonly pct: number;
  /** 那天花了多少（**≥ 0** 的有限数；花了负数是不存在的账，一律拒）；不给＝点名行里写 `—`（**不猜**）。 */
  readonly spend?: number;
}

/** 子弹图的一周：进 ／ 出（**净与累计已用由本件算**，调用方不给）。 */
export interface CashWaterlineWeek {
  /** 周的名字（「第 1 周」）；**非空**。 */
  readonly label: string;
  /** 这一周进的钱（≥0 的有限数）。 */
  readonly inflow: number;
  /** 这一周花的钱（≥0 的有限数）。 */
  readonly outflow: number;
}

/** 进出水三栏里的一行（名字 ＋ 金额；金额是**正的量**，方向由它落在「进」栏还是「出」栏定）。 */
export interface CashWaterlineFlowLine {
  /** 行名（「工资」「餐饮」）；**非空**。 */
  readonly name: string;
  /** 金额（**正**的有限数：> 0；零金额的行不该上屏）。 */
  readonly amount: number;
}

/** 现金水位的入参。三形态各吃自己那份读数——**给了别的形态的读数一律拒**（不静默挑一个）。 */
export interface CashWaterlineInput {
  /** 卡头标题（如「本月可用余量 · 逐日」）。 */
  readonly title: string;
  /** 卡头右端那句（如「预算 6 000 元」「4 周」）；不给＝不出。 */
  readonly stamp?: string;
  /** 形态键（闭集，缺省 `waterline`）。 */
  readonly form?: CashWaterlineForm;
  /** 底线（占预算的百分比，0–100）；缺省 `CASH_WATERLINE_DEFAULT_THRESHOLD_PCT`（30）。 */
  readonly thresholdPct?: number;
  /** **形态 `waterline` 必填**：逐日读数（1–`CASH_WATERLINE_MAX_DAYS` 天）。 */
  readonly days?: readonly CashWaterlineDay[];
  /** **形态 `waterline` 可选**：今天那一格的下标（0 起；不给＝不标今天）。 */
  readonly todayIndex?: number;
  /** **形态 `bullet` 必填**：逐周读数（1–`CASH_WATERLINE_MAX_WEEKS` 周）。 */
  readonly weeks?: readonly CashWaterlineWeek[];
  /** **形态 `bullet`／`flow` 必填**：总预算（**正**的有限数）——子弹图的满格、进出水三栏占比都按它算；
   *  形态 `waterline` 也收它（可选）：收下就用来把底线写成钱数（卡头第三格「底线 1 800 元（30%）」）。 */
  readonly budget?: number;
  /** **形态 `flow` 必填**：进项明细（1–`CASH_WATERLINE_MAX_LINES` 行）。 */
  readonly inflow?: readonly CashWaterlineFlowLine[];
  /** **形态 `flow` 必填**：出项明细（1–`CASH_WATERLINE_MAX_LINES` 行）。 */
  readonly outflow?: readonly CashWaterlineFlowLine[];
  /** **形态 `flow` 可选**：进项那一栏的**真笔数**（整数 ≥ 1）。
   *  不给＝那一格写「N 项」（＝明细行数，照实叫它「项」）——**明细行数不许冒名「笔数」**：
   *  原型那一格是「38 笔」，而屏上只列得出 5 行明细。 */
  readonly inflowCount?: number;
  /** **形态 `flow` 可选**：出项那一栏的真笔数（整数 ≥ 1）；不给＝写「N 项」。 */
  readonly outflowCount?: number;
  /** **形态 `flow` 必填**：已经过了几天（整数 ≥ 1）——日均消耗的分母。 */
  readonly elapsedDays?: number;
  /** **形态 `flow` 必填**：距这一段还剩几天（整数 ≥ 0）——判定「撑不撑得住」要乘它。 */
  readonly remainDays?: number;
  /** 钱的单位（缺省 `元`）：只上屏，不参与算数。 */
  readonly unit?: string;
  /** 口径行（这一张图怎么读）；不给＝本件按形态写一句自己的口径。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
