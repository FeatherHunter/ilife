/** scatter-fit · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 63 件，2026-09
 *  用户三个形态全打 4 分）——**三个形态一起落**：
 *   · A `scatter` 散点＋拟合线＋概率带（一批成对的读数）；
 *   · B `bin` 分箱趋势带（按横轴分箱，每箱给中位与四分位区间）；
 *   · C `lag` 滞后相关（同一个关系错开几天，逐档给 r）。
 *  三个形态问的是**同一个问题**——「两个读数之间是什么关系」——只是样本形状不同（点／箱／逐档），
 *  所以是**一件的三个形态**，不是三件（「形态是骨架，不是地址」）。
 *
 *  形态键写在 `SCATTER_FIT_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `SCATTER_FIT_CLASS + '-' + 槽名`。 */
export const SCATTER_FIT_CLASS = 'ilife-block-scatter-fit';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const SCATTER_FIT_SLOTS = [
  /** 卡头那一排：标题 ＋ 口径 ＋ 算出来的那句统计。 */
  'hd',
  /** 卡头标题（`体重 vs 每日摄入`）。 */
  'title',
  /** 卡头里那枚时间窗（`近 30 天`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句**从数据算出来**的统计（`r ＝ +0.62 · 中等相关`／`最强在错开 2 天`）。 */
  'tail',
  /* ── A／B 共用的坐标框（纵轴刻度列 ＋ 图区 ＋ 横轴刻度行） ── */
  /** 坐标框（纵轴刻度列 ‖ 图区，横轴刻度行在下）。 */
  'plotbox',
  /** 纵轴刻度列（三档：上／中／下，与图区同高对齐）。 */
  'yticks',
  /** 一枚纵轴刻度（只有第一枚带单位）。 */
  'ytick',
  /** 横轴刻度行（等分，第一枚带单位）。 */
  'xticks',
  /** 一枚横轴刻度。 */
  'xtick',
  /* ── A 散点 ── */
  /** 点阵区（`role="img"`；坐标是百分比，写在行内 `left`／`bottom`）。 */
  'plot',
  /** 80% 概率带（纯装饰；形状是行内 `clip-path` 的多边形）。 */
  'band',
  /** 最小二乘拟合线（纯装饰；同上）。 */
  'fitline',
  /** 一个读数（成对的 x／y）；被点名的离群点另带 `is-outlier`。 */
  'dot',
  /* ── B 分箱 ── */
  /** 分箱区（`role="img"`；列数＝箱数，一行一箱）。 */
  'bins',
  /** 一箱（竖向：区间条 ＋ 中位线）。 */
  'bincol',
  /** 箱里的 P25–P75 区间条（纯装饰；淡洗）。 */
  'bin-range',
  /** 箱里的中位数线（纯装饰；实底）。 */
  'bin-median',
  /** 一枚箱标签（`＜5.5h`）。 */
  'bintick',
  /* ── C 滞后相关 ── */
  /** 表头那一行（错开 ｜ 相关强度 ｜ r）。 */
  'laghead',
  /** 逐档的表（`role="img"`）。 */
  'lag',
  /** 一档（一行；负相关带 `is-negative`）。 */
  'lagrow',
  /** 一档的标签（`当天`／`错 2 天`）。 */
  'lag-label',
  /** 一档的轨道（中线往左右各半 ＝ ±1）。 */
  'lag-track',
  /** 轨道里那根条（纯装饰：从中线往左或往右，长度＝ |r|）。 */
  'lag-bar',
  /** 一档的 r（数字，永不换行）。 */
  'lag-value',
  /** 最强那一档里再写一遍的字（`−0.71 最强`）——**不靠颜色**。 */
  'lag-strong',
  /* ── 三形态共用 ── */
  /** 图例（每一项：形 ＋ 字）。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例里那枚形（`is-dot`／`is-ring`／`is-median`／`is-range`）。 */
  'legend-mark',
  /** 脚注一句人话（口径）。 */
  'note',
] as const;
export type ScatterFitSlot = (typeof SCATTER_FIT_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `SCATTER_FIT_CLASS + '-' + …`）。 */
export function scatterFitSlot(slot: ScatterFitSlot, prefix = 'ilife-'): string {
  return prefix + 'block-scatter-fit-' + slot;
}

/** 形态闭集：A 散点／B 分箱／C 滞后（用户三个形态全打 4 分，三个一起落）。 */
export const SCATTER_FIT_FORMS = ['scatter', 'bin', 'lag'] as const;
export type ScatterFitForm = (typeof SCATTER_FIT_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const SCATTER_FIT_MISSING = '—';

/** 点阵的轴内距（百分比）：读数不许压在轴上、更不许跑出框 —— 数据极值映射到 3%／97%。 */
export const SCATTER_FIT_AXIS_INSET = 3;

/** 横轴刻度数（5）与纵轴刻度数（3）：刻度文字由**轴域**算出来，不由调用方给。 */
export const SCATTER_FIT_X_TICKS = 5;
export const SCATTER_FIT_Y_TICKS = 3;

/** 窄容器阈值（px）：图矮一档、点小一档、刻度距收一档。**只有一个来源**——
 *  `style.ts` 与 `style-forms.ts` 两份样式文件都读它（写在两处必然走散：改了常量而查询里的字面量不跟）。 */
export const SCATTER_FIT_NARROW_PX = 460;

/** 散点的点数上下限：**1 条也照画**（只画点、不画趋势线，脚注说明为什么没有线），0 条才是非法；
 *  上百个点该先聚（再多样本画进一屏就是一团墨）。 */
export const SCATTER_FIT_MIN_POINTS = 1;
export const SCATTER_FIT_MAX_POINTS = 120;

/** 分箱的箱数上下限（2–8）：一箱没有"趋势"，九箱以上窄屏读不出标签。 */
export const SCATTER_FIT_BIN_MIN = 2;
export const SCATTER_FIT_BIN_MAX = 8;

/** **每箱最少样本数**（原型口径：每箱至少 5 天才画）：样本太薄的箱画出来说明不了任何事。 */
export const SCATTER_FIT_BIN_MIN_SAMPLE = 5;

/** 滞后档数上下限（2–6）与最大错开天数（5）：错开更多天，样本会薄到说明不了任何事。 */
export const SCATTER_FIT_LAG_MIN = 2;
export const SCATTER_FIT_LAG_MAX = 6;
export const SCATTER_FIT_MAX_LAG_DAYS = 5;

/** 散点形态的一个读数（成对的横／纵值）。 */
export interface ScatterFitPoint {
  /** 横轴值（有限数）。 */
  readonly x: number;
  /** 纵轴值（有限数）。 */
  readonly y: number;
  /** 点名（如 `08-30`）：写进这一点的 `title` 与无障碍名；不给＝只有数值。 */
  readonly label?: string;
  /** **离群点的原因**（如 `08-30 聚餐：一餐 1,400 卡`）——给了就画成圈（形）并写进图例（字）。
   *  离群点由**调用方点名**：本件不自己判"哪个点算离群"（那是统计口径，件里说了不算）。 */
  readonly outlier?: string;
}

/** 分箱形态的一箱：区间（P25–P75）＋ 中位数 ＋ 样本数。 */
export interface ScatterFitBin {
  /** 箱标签（`＜5.5h`／`6–6.5h`），**永不换行**（它是这一箱的坐标）。 */
  readonly label: string;
  /** 下四分位（P25）。 */
  readonly low: number;
  /** 中位数。 */
  readonly median: number;
  /** 上四分位（P75）。 */
  readonly high: number;
  /** 这一箱的样本数：**至少 5**（原型口径见 `SCATTER_FIT_BIN_MIN_SAMPLE`）。 */
  readonly count: number;
}

/** 滞后形态的一档：错开几天（step）与那一天的相关系数（r）。 */
export interface ScatterFitLag {
  /** 错开的天数（0＝当天，整数，≤ `SCATTER_FIT_MAX_LAG_DAYS`）。 */
  readonly step: number;
  /** 这一档的相关系数（−1…1；负号＝方向相反，条从中线往左画）。 */
  readonly r: number;
}

/** 散点件入参。`title`／`xName`／`yName` 三样恒必填——没有两个**有名有姓**的读数就没有相关性。 */
export interface ScatterFitInput {
  /** 卡头标题（`体重 vs 每日摄入`）。 */
  readonly title: string;
  /** 横轴那个读数的名字（`每日摄入`）：刻度、图例与无障碍名都要用它。 */
  readonly xName: string;
  /** 纵轴那个读数的名字（`体重`）。 */
  readonly yName: string;
  /** 横轴单位（`卡`／`小时`）：只写在**第一枚**刻度上；不给＝刻度只有数字。 */
  readonly xUnit?: string;
  /** 纵轴单位（`kg`／`元`）。 */
  readonly yUnit?: string;
  /** 卡头里那枚时间窗（`近 30 天`）；不给＝不出。 */
  readonly stamp?: string;
  /** 形态键（闭集，缺省 `scatter`）：`scatter`／`bin`／`lag`。 */
  readonly form?: ScatterFitForm;
  /** 形态 A 必填：成对的读数（1–120 条；**只有一条也照画**，只是画不出趋势线）。 */
  readonly points?: readonly ScatterFitPoint[];
  /** 形态 B 必填：分箱（2–8 箱，每箱至少 5 个样本）。 */
  readonly bins?: readonly ScatterFitBin[];
  /** 形态 C 必填：滞后各档（2–6 档，错开天数严格递增、最大 5 天）。 */
  readonly lags?: readonly ScatterFitLag[];
  /** 脚注一句人话；**不给＝用本形态的口径句**（那几句是本件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
