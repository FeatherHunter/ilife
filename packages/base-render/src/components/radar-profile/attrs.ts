/** radar-profile · **标记契约**（渲染与运行时/调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 62 件
 *  **多维画像雷达**（工单表里写作「雷达画像」）——2026-09 用户三套皮肤给三个形态全打 4 分，
 *  故三档一起落：
 *   · `polygon` 多边形雷达（本期／上期两条轮廓）：一条轮廓是一个对象在六根轴上的形状；
 *   · `wedge`   极区扇图（半径＝得分，达标环）：半径比例于得分，达标线画成虚线圆环；
 *   · `rail`    展平成轴表（基准带＋我的位置）：把轴摊平成一列，每行色带＝基准区间、竖线＝当前值。
 *  三档问的是**同一个问题**——「一个对象在几根互不同单位的轴上偏成什么形状」——只是读法不同
 *  （围一圈读形状／半径读强弱／摊平读单根），所以是**一件的三个形态**，不是三件。
 *
 *  它替掉的三种错法（原型那一件的 `p` 逐字）：把「六个指标各自好不好」合成总分抹平偏科；
 *  六条进度条各读各的、看不出偏科；拿其中一根轴的绝对值当整体结论。
 *
 *  与同族件的分工（别拿这一件当它们用）：
 *   · `compare-columns`／`rank-list` 都是一个指标上多个对象／多个期间的对照；雷达是**一个对象 × 多根轴**，
 *     而且几根轴之间没有大小关系（围成一圈才读得出来）；
 *   · `progress-list` 每行是「已达到 ÷ 目标」的两数之比，没有形状、没有上期对照、也没有基准区间；
 *   · `scatter-fit` 问的是两个读数之间的关系，本件问的是一组读数各自的位置。
 *
 *  形态键写在 `RADAR_PROFILE_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `RADAR_PROFILE_CLASS + '-' + 槽名`。 */
export const RADAR_PROFILE_CLASS = 'ilife-block-radar-profile';

/** 槽位闭集（`render.ts`／`style.ts`／`style-forms.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const RADAR_PROFILE_SLOTS = [
  /** 卡头那一排：标题 ＋ 时间窗 ＋ 本件算出来的那一句。 */
  'hd',
  /** 卡头标题（如「体测画像」）。 */
  'title',
  /** 卡头那枚时间窗（如「09-24」）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句**从读数算出来**的（平均分／达标几根轴／出带几根轴）。 */
  'tail',
  /** 形态 `polygon`：图与读数表并排的那一层（窄档收成一列）。 */
  'body',
  /** 图那一格（内距里留给轴名——轴名浮在图的**四周外侧**）。 */
  'stage',
  /** 图与轴名共用的定位框（正方形；轴名按同一份映射取百分比坐标）。 */
  'plot',
  /** 内联 SVG（网格与数据；**它不带文字**：字一律走 HTML，字号不随 SVG 缩放）。 */
  'svg',
  /** 一格网格环（三级：里／中／外；外圈＝满分）。 */
  'ring',
  /** 一根辐条（从圆心到外圈）。 */
  'spoke',
  /** 形态 `polygon`／`wedge`：上期那条轮廓（虚线，弱色）。 */
  'past',
  /** 本期那条轮廓（实线，强调色）。 */
  'now',
  /** 一个顶点上的点（本期值落在它那根轴上的位置，纯装饰）。 */
  'dot',
  /** 形态 `wedge`：一根扇区（半径＝得分；达标走 `ok`，未达标走 `warn`）。 */
  'wedge',
  /** 扇区外沿那道弧（进深一档，把半径的读数钉住）。 */
  'warc',
  /** 达标线（虚线圆环，半径＝达标分）。 */
  'goal',
  /** 轴名那一块（绝对定位在图的四周外侧；名字一行、读数一行）。 */
  'axlabel',
  /** 轴名。 */
  'axname',
  /** 轴上的读数（缺测写 `—`）。 */
  'axvalue',
  /** 形态 `wedge`：圆心的平均分那一块。 */
  'hub',
  /** 平均分那个数（大字）。 */
  'hub-value',
  /** 「平均分」那三个字。 */
  'hub-label',
  /** 形态 `polygon`：网格三级刻度那一条（**印出来的刻度**：里圈／中圈／外圈各是多少分）。 */
  'scale',
  /** 刻度条里的一项（`里圈 33 分`）。 */
  'scale-item',
  /** 形态 `polygon`：读数表（轴 ｜ 本期 ｜ 上期 ｜ 差）。 */
  'table',
  /** 表的一行（第一行是表头）。 */
  'trow',
  /** 一行里的轴名。 */
  'tname',
  /** 一行里的一个数（本期／上期）。 */
  'tnum',
  /** 一行里的差（带方向字形与正负号；`—` 表示有一期缺测）。 */
  'tdelta',
  /** 图例（形 ＋ 字）。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例里那枚色块（`is-ok`／`is-warn`）。 */
  'swatch',
  /** 图例里那枚线段（`is-now` 实线／`is-past` 虚线）。 */
  'axline',
  /** 图例里**印出来的达标分**（`…达标 80 分及以上`）。 */
  'goal-num',
  /** 形态 `wedge`：未达标那几根轴的点名清单。 */
  'gaps',
  /** 点名清单的一行（一根轴）。 */
  'gap',
  /** 一行里的轴名。 */
  'gap-name',
  /** 一行里的得分。 */
  'gap-num',
  /** 一行里差的分数。 */
  'gap-diff',
  /** 形态 `rail`：几根轴摊平后的那一叠行。 */
  'rows',
  /** 一行（一根轴）。 */
  'row',
  /** 行里的轴名（下面挂一行小字＝调用方给的说明）。 */
  'rname',
  /** 轴名下面那行小字（如 `BMI 18.5–24`）；不给＝不出。 */
  'rsub',
  /** 行里的轨道（基准带 ＋ 当前位置竖线 ＋ 读数）。 */
  'track',
  /** 轨道底下那条基线。 */
  'base',
  /** 轨道上的基准区间色带（左端 `--radar-profile-b1`、右端 `--radar-profile-b2`）。 */
  'band',
  /** 轨道上「我的位置」那根竖线（`--radar-profile-at`）。 */
  'mark',
  /** 贴在竖线旁边的读数（**永不截断**：它是这一行的答案）。 */
  'rval',
  /** 行右端的判定（`✓ 在带内`／`▼ 低于带 16 分`／`— 未给基准带`）。 */
  'verdict',
  /** 判定下面那行小字：这一根的基准带是多少（`带 40–100 分`）。 */
  'rband',
  /** 口径行（这一张图怎么读）。 */
  'note',
] as const;
export type RadarProfileSlot = (typeof RADAR_PROFILE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `RADAR_PROFILE_CLASS + '-' + …`）。 */
export function radarProfileSlot(slot: RadarProfileSlot, prefix = 'ilife-'): string {
  return prefix + 'block-radar-profile-' + slot;
}

/** 形态闭集：`polygon` 多边形雷达（本期／上期）／`wedge` 极区扇图（半径＋达标环）／`rail` 展平成轴表（基准带）。 */
export const RADAR_PROFILE_FORMS = ['polygon', 'wedge', 'rail'] as const;
export type RadarProfileForm = (typeof RADAR_PROFILE_FORMS)[number];

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（缺测的轴不当 0 分算，全仓同一条地板）。 */
export const RADAR_PROFILE_MISSING = '—';

/** 轴的枚数上下限（3–8）：少于三根围不成一个形状；九根以上窄档上轴名与读数挤在一起。 */
export const RADAR_PROFILE_MIN_AXES = 3;
export const RADAR_PROFILE_MAX_AXES = 8;

/** 打分的满分（轴与轴不是同一个单位，所以只能比形状——每根轴各自映射到 0…100 这一段）。 */
export const RADAR_PROFILE_MAX_SCORE = 100;

/** 达标线的缺省值（形态 `wedge`）：**80 分**——与原型墙上那一件同值。 */
export const RADAR_PROFILE_DEFAULT_GOAL = 80;

/** 网格三级（形态 `polygon` 画三圈、也是**印在刻度条上的那三个数**）：里／中／外。
 *  轴域与刻度是同一份真值：三圈半径都由 `radiusOfScore()` 从这三个数算出来。 */
export const RADAR_PROFILE_RINGS = [33, 66, 100] as const;

/** 轴名的字符数上限（**超出当场拒**：轴名浮在图的四周外侧，"再长一点"就会顶宽容器或压到隔壁）。
 *  6 个汉字＝外面那圈留给轴名的内距（`style.ts` 按这个常量拼），两侧都留得下。 */
export const RADAR_PROFILE_MAX_LABEL_CHARS = 6;

/* ── 几何：内联 SVG 的 user unit（**坐标只有一个来源**，见 `scale.ts`） ────────── */

/** SVG 画布边长（正方形 viewBox `0 0 200 200`）。 */
export const RADAR_PROFILE_VIEW = 200;
/** 圆心（画布正中）。 */
export const RADAR_PROFILE_CENTER = 100;
/** 满分（100 分）对应的半径——外圈画在这儿。 */
export const RADAR_PROFILE_RADIUS = 88;
/** 轴名锚点的半径（比外圈再让开一点：名字压在网格上就不好读）。 */
export const RADAR_PROFILE_LABEL_RADIUS = 96;

/* ── 两处响应式阈值（px，容器宽）：两份样式文件读同一份常量 ───────────────────── */

/** 窄容器阈值：低于它，读数表收一档、轴表收成两行（轴名与判定一行、轨道整条第二行）。 */
export const RADAR_PROFILE_NARROW_PX = 460;
/** 宽容器阈值：到它，形态 `polygon` 的图与读数表并排。
 *  为什么是 760 而不是更小：并排时图那一列要放得下"满宽的图 ＋ 两侧轴名内距"（约 450px），
 *  更早并排会让图**比窄容器里还小**（620 档实测 165px < 390 档的 238px）。 */
export const RADAR_PROFILE_WIDE_PX = 760;
/** 图的最大边长（px）：雷达是标尺不是主角，宽容器里也不许无限长大。 */
export const RADAR_PROFILE_MAX_PLOT_PX = 300;

/* ── 行内自定义属性（**本件自己的名字**，不占 `--ilife-*` 那个命名空间） ──────────
 *  为什么不用 `--ilife-*`：那是皮肤 token 的空间（名单住 `skin/contract.ts`），件里塞私有名
 *  会在皮肤矩阵判据里读成「名单外的 token」。先例 `photo-compare` 的 `--photo-compare-split`。 */

/** 形态 `rail`：这一根的位置（轨道宽度的百分数）。 */
export const RADAR_PROFILE_AT_VAR = '--radar-profile-at';
/** 形态 `rail`：基准带的左端（百分数）。 */
export const RADAR_PROFILE_B1_VAR = '--radar-profile-b1';
/** 形态 `rail`：基准带的右端（百分数）。 */
export const RADAR_PROFILE_B2_VAR = '--radar-profile-b2';

/** 一根轴的基准区间（形态 `rail` 用哪个区间算「在带内」）。两端都在 0…100 分之间，且 `low ≤ high`。 */
export interface RadarProfileBand {
  /** 区间下界（0…100 的有限数）。 */
  readonly low: number;
  /** 区间上界（0…100 的有限数）。 */
  readonly high: number;
}

/** 一根轴：名字 ＋ 本期读数（＋ 可选的上一期、说明、基准带）。 */
export interface RadarProfileAxis {
  /** 轴名（**至多 `RADAR_PROFILE_MAX_LABEL_CHARS` 个字**，**永不 `…` 截断**：它短，就该短）。 */
  readonly label: string;
  /** 本期得分（0…100 的有限数）；`null` ＝ **缺测**——整根不画、表里写 `—`，**不当 0 分算**。 */
  readonly score: number | null;
  /** **形态 `polygon` 可选**：上一期的得分（同上，可缺测）；不给＝这一根没有上期轮廓与差值。 */
  readonly past?: number | null;
  /** **形态 `rail` 可选**：这一根的口径说明（如 `BMI 18.5–24`），写在轴名下面一行小字里。 */
  readonly note?: string;
  /** **形态 `rail` 可选**：这一根的基准区间；不给＝这一行只画基线与自己那根竖线，判定写「未给基准带」。 */
  readonly band?: RadarProfileBand;
}

/** 多维画像雷达的入参。三形态共用一份 `axes`——**给别的形态才认的字段一律拒**（不静默挑一个丢掉）。 */
export interface RadarProfileInput {
  /** 卡头标题（如「体测画像」）。 */
  readonly title: string;
  /** 几根轴（3–8 根）。顺序即从正中开始**顺时针**的次序。 */
  readonly axes: readonly RadarProfileAxis[];
  /** 形态键（闭集，缺省 `polygon`）。 */
  readonly form?: RadarProfileForm;
  /** 卡头那枚时间窗（本期，如 `09-24`）；不给＝不出。 */
  readonly stamp?: string;
  /** **形态 `polygon` 可选**：上一期的时间窗（如 `08-24`）：图例里用；不给＝图例只写「上期」。 */
  readonly pastStamp?: string;
  /** **形态 `wedge` 可选**：达标线（0…100 的有限数）；缺省 `RADAR_PROFILE_DEFAULT_GOAL`（80）。 */
  readonly goal?: number;
  /** 口径行（这一张图怎么读）；不给＝本件按形态写一句自己的口径。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
