/** flow-ribbon · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙 `.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 67 件「流向带」的三个形态
 *  （用户在墙上逐格打分：A 桑基带 4/4/4、C 两条构成轨 4/4/4，B 交叉矩阵为上一轮 4/4/4）：
 *   · `sankey` 桑基带（左来源／右用途，带宽＝金额）；
 *   · `matrix` 交叉矩阵（行＝来源，列＝用途）；
 *   · `rails`  两条构成轨＋中间汇合读数。
 *  三个形态问的是**同一个问题**——「两张名单之间谁养谁」——只是样本形状不同（带／格／轨），
 *  所以是**一件的三个形态**，不是三件（契约 §一：形态是骨架，不是地址）。
 *
 *  它替掉的错法（原型那一件的 `p` 逐字）：
 *   · 只给一张来源占比 ＋ 一张用途占比 —— 看不出谁养谁；
 *   · 拿 `invoice-lines` 那种一条链（总额一路加减到明细）表达多对多 —— 链式表达不了「三笔来源养四类用途」；
 *   · 拿 `stacked-bar` 那种单层构成条表达两层对应 —— 一条轨说不出「谁汇进谁」。
 *
 *  **本件的头号硬口径：两侧同一把尺子。** 原型阶段审查席实测出过两种尺度不统一（历史缺陷，两种都不许再犯）：
 *   ① 左右两列各自归一（8 000 画 68%、4 460 画 27%）⇒「带宽＝金额」只在自己那一列成立；
 *   ② 格宽按文字宽度排（`flex: 0 0 auto`）⇒ 占比根本没画出来。
 *  落地的口径：**一个总额（＝所有流量的和）、一把尺子（每 1% 高／宽＝同一个钱数）、三处几何全从它算**
 *  （桑基的节点高与带子两端高、矩阵的条长、两条轨的格宽），判据从**印出来的读数**反推带宽比。
 *
 *  形态键写在 `FLOW_RIBBON_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `FLOW_RIBBON_CLASS + '-' + 槽名`。 */
export const FLOW_RIBBON_CLASS = 'ilife-block-flow-ribbon';

/** 槽位闭集（`render.ts`／`style.ts` 与判据都从这里取名字，不各抄一份字面量）。 */
export const FLOW_RIBBON_SLOTS = [
  /** 卡头那一排：标题 ＋ 时间窗 ＋ 总额。 */
  'hd',
  /** 卡头标题（`钱从哪来、花到哪去`）。 */
  'title',
  /** 卡头里那枚时间窗（`09-01 – 09-24`）；不给＝不出。 */
  'stamp',
  /** 卡头右端那句**本件算出来**的总额（`共 11 600 元`）。 */
  'tail',
  /* ── 形态 `sankey` ── */
  /** 桑基画布（`role="img"`；节点与带子都是绝对定位，坐标是算出来的百分比）。 */
  'plot',
  /** 一条带子（**无文字的图形**：色走强调色系淡洗，`clip-path` 多边形由 `model.ts` 算）。 */
  'lane',
  /** 一个节点（左列来源／右列用途；高＝金额，两列同一把尺子）。 */
  'node',
  /** 节点里的名字。 */
  'nd-name',
  /** 节点里的金额（读数字面，`tabular-nums`）。 */
  'nd-amount',
  /* ── 三形态共用的「读数名单」── */
  'readout',
  /** 名单的小标题（`装不进格里的读数 · 2 条`）——**只在真有读数搬下来时才出**。 */
  'readout-hd',
  /** 名单的一行（名字 ＋ 金额 ＋ 占比）。 */
  'readout-row',
  /** 名单行里的名字（左列那个色块由 `swatch` 给）。 */
  'readout-name',
  /** 名单行里的金额（**永不 `…` 截断**）。 */
  'readout-amount',
  /** 名单行里的占比。 */
  'readout-share',
  /* ── 形态 `matrix` ── */
  /** 矩阵的表（`role="img"`，无障碍名逐格读出）。 */
  'matrix',
  /** 表头行（`<thead>`）。 */
  'mat-head',
  /** 表体（`<tbody>`）。 */
  'mat-body',
  /** 合计行（`<tfoot>`）。 */
  'mat-foot',
  /** 矩阵的一行。 */
  'mat-row',
  /** 行头（`<th>`：来源名 ＋ 本行合计）。 */
  'mat-rowhd',
  /** 一格（`<td>`）。 */
  'mat-cell',
  /** 格里的条（**无文字的图形**：宽＝这一格 ÷ 全表最大格）。 */
  'cell-bar',
  /** 格里的金额。 */
  'cell-num',
  /** 格里的百分数（这一格占总额）。 */
  'cell-pct',
  /** 合计行里的一格（`<td>`）。 */
  'mat-total',
  /* ── 形态 `rails` ── */
  /** 两条构成轨那一块（`role="img"`）。 */
  'rails',
  /** 一条轨（满宽＝总额）。 */
  'rail',
  /** 轨里的一格（**宽＝这一格占总额的比例**，同一总额、两条轨各自拉满 100%）。 */
  'seg',
  /** 格里的百分数（**算得出放得下才出**；放不下的那几格的读数在下面名单里）。 */
  'seg-pct',
  /** 轨下那两栏名单（来源／用途各一栏）。 */
  'rails-list',
  /** 名单的一栏。 */
  'rails-col',
  /** 一栏的小标题（`钱从哪来 · 3 股`）。 */
  'rails-hd',
  /** 两轨中间那块汇合读数（进 ＝ 出）。 */
  'hub',
  /** 汇合那块里的等式（`进 11 600 ＝ 出 11 600`）。 */
  'hub-eq',
  /** 汇合那块里的净额（`净 +0`）。 */
  'hub-net',
  /* ── 三形态共用 ── */
  /** 图例（形 ＋ 字）。 */
  'legend',
  /** 图例的一项。 */
  'legend-item',
  /** 图例左端那枚色块（纯装饰；`is-s1`…`is-s6` 给来源那一档深浅）。 */
  'legend-mark',
  /** 点名的色块（名单行左端那枚，与图例同一档）。 */
  'swatch',
  /** 脚注一句人话（口径）。 */
  'note',
] as const;
export type FlowRibbonSlot = (typeof FLOW_RIBBON_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `FLOW_RIBBON_CLASS + '-' + …`）。 */
export function flowRibbonSlot(slot: FlowRibbonSlot, prefix = 'ilife-'): string {
  return prefix + 'block-flow-ribbon-' + slot;
}

/** 形态闭集：`sankey` 桑基带 ／ `matrix` 交叉矩阵 ／ `rails` 两条构成轨＋汇合读数。 */
export const FLOW_RIBBON_FORMS = ['sankey', 'matrix', 'rails'] as const;
export type FlowRibbonForm = (typeof FLOW_RIBBON_FORMS)[number];

/** 缺值的写法：**写成 `—`，不许写 0、不许留空**（全仓同一条地板）。矩阵的空格用它。 */
export const FLOW_RIBBON_MISSING = '—';

/** 钱的缺省单位（不给 `unit` 时用它）。 */
export const FLOW_RIBBON_DEFAULT_UNIT = '元';

/** 节点之间那条缝（占画布高的百分比）：**只为分得开，不代表任何金额**（口径行照实写这一句）。 */
export const FLOW_RIBBON_GAP_PCT = 2;

/** 窄容器阈值（px）：**这是本件自己的宽度**（`@container` 判，不判视口）。 */
export const FLOW_RIBBON_NARROW_PX = 620;

/** 名单上限：来源 1–6 股、用途 1–4 类。 */
export const FLOW_RIBBON_MAX_SOURCES = 6;
/** 用途那一列的上限（**窄档的约束**：320 档一格只有 60 出头，再多就放不下金额）。 */
export const FLOW_RIBBON_MAX_USES = 4;
/** 流量条数上限（`来源 × 用途` 的稀疏上界；再多请调用方先归并）。 */
export const FLOW_RIBBON_MAX_LINKS = 24;
/** 名字长度上限（字符）：名单与控制条一个字都不许被压——长了会在窄档折成好几行。 */
export const FLOW_RIBBON_MAX_NAME_CHARS = 12;

/** 桑基节点列的最小宽度（px）：两个中文名字 ＋ 一行金额要在里面站得住。 */
export const FLOW_RIBBON_NODE_COL_PX = 112;
/** 节点列在 320 档的**内宽**（px）：读数能不能放进节点里，按它算（`112 − 内距 12 − 边框 2`）。 */
export const FLOW_RIBBON_NODE_INNER_PX = 98;
/** 节点读数的字面大小（px）＝`fs-xs` 那一档：估文字宽度按它算（**估宽只许用这一个数**）。 */
export const FLOW_RIBBON_FONT_PX = 12;

/** 画布的可用高度（px）：数据算出来的那一档被夹在这个区间里。 */
export const FLOW_RIBBON_PLOT_MIN_PX = 200;
export const FLOW_RIBBON_PLOT_MAX_PX = 420;
/** 一个节点框**放下两行读数**（名字一行 ＋ 金额一行）所需的最小高度（px）：12 × 1.3 × 2 ＋ 内距 6 ≈ 38。 */
export const FLOW_RIBBON_LABEL_MIN_PX = 38;

/** 构成轨上放得下百分数所需的最小格宽（占总额的百分比）：320 档一格 ≥14% 时约 45px，够写 `100%`。 */
export const FLOW_RIBBON_SEG_MIN_PCT = 14;

/* ── 行内自定义属性（**本件自己的名字**，不占 `--ilife-*` 那个皮肤命名空间）────────────
 *  为什么不用 `--ilife-*`：那是皮肤 token 的空间（名单住 `skin/contract.ts`），件里塞私有名
 *  会在皮肤矩阵判据里读成「名单外的 token」。先例：`cash-waterline` 的 `--cash-waterline-*`。 */

/** 桑基画布的高度（px）：由 `model.ts` 按「最小的一股也要放得下两行读数」算出来，写在画布的行内样式上。 */
export const FLOW_RIBBON_PLOT_VAR = '--flow-ribbon-plot-h';
/** 一个节点在画布上的顶边（占画布高的百分比）。 */
export const FLOW_RIBBON_TOP_VAR = '--flow-ribbon-t';
/** 一个节点／一条带子的高（占画布高的百分比）。 */
export const FLOW_RIBBON_HEIGHT_VAR = '--flow-ribbon-h';
/** 一条带子在左端（来源那一侧）的上下沿。 */
export const FLOW_RIBBON_LANE_L1_VAR = '--flow-ribbon-l1';
/** 一条带子在左端的下沿。 */
export const FLOW_RIBBON_LANE_L2_VAR = '--flow-ribbon-l2';
/** 一条带子在右端（用途那一侧）的上沿。 */
export const FLOW_RIBBON_LANE_R1_VAR = '--flow-ribbon-r1';
/** 一条带子在右端的下沿。 */
export const FLOW_RIBBON_LANE_R2_VAR = '--flow-ribbon-r2';
/** 矩阵格里的条宽／构成轨里的一格宽（占满格的百分比）。 */
export const FLOW_RIBBON_WIDTH_VAR = '--flow-ribbon-w';
/** 矩阵格底色往强调色掺的权重（百分比）：**从 token 算出来**，不写死色值。 */
export const FLOW_RIBBON_MIX_VAR = '--flow-ribbon-mix';

/** 一格在窄档把列名顶在数字前的那个 `data-*`（窄档表转成行，列名靠 `content: attr(...)` 补回）。 */
export const FLOW_RIBBON_USE_ATTR = 'data-use';

/** 一股来源（`sources` 的一项）／一类用途（`uses` 的一项）。 */
export interface FlowRibbonNode {
  /** 名字（`工资`／`餐饮`）；**非空**，且至多 `FLOW_RIBBON_MAX_NAME_CHARS` 个字符。 */
  readonly name: string;
}

/** 一笔流量（`links` 的一项）：**它才是这份数据的唯一事实**——来源与用途两边的金额都由它汇总出来。
 *  「进 ＝ 出」不是调用方要保证的事，是这里算出来的结构事实（同一条链的两端）。 */
export interface FlowRibbonLink {
  /** 来源名（必须是 `sources` 里的一个）。 */
  readonly from: string;
  /** 用途名（必须是 `uses` 里的一个）。 */
  readonly to: string;
  /** 这一笔的金额（**正**的有限数；零金额的那一笔不该上屏——它画出来是一条看不见的带子）。 */
  readonly amount: number;
}

/** 流向带的入参。**三个形态吃同一份数据**（同一条链的三种看法），形态只换骨架、不换口径。 */
export interface FlowRibbonInput {
  /** 卡头标题（`钱从哪来、花到哪去`）。 */
  readonly title: string;
  /** 来源名单（左列／矩阵行），1–`FLOW_RIBBON_MAX_SOURCES` 股，**顺序＝显示顺序**。 */
  readonly sources: readonly FlowRibbonNode[];
  /** 用途名单（右列／矩阵列），1–`FLOW_RIBBON_MAX_USES` 类，**顺序＝显示顺序**。 */
  readonly uses: readonly FlowRibbonNode[];
  /** 流量（一笔一项）：两边名单里的名字都要在这里至少出现一次——没流量的名单项画不出高度。 */
  readonly links: readonly FlowRibbonLink[];
  /** 卡头里那枚时间窗（`09-01 – 09-24`）；不给＝不出。 */
  readonly stamp?: string;
  /** 形态键（闭集，缺省 `sankey`）。 */
  readonly form?: FlowRibbonForm;
  /** 钱的单位（缺省 `元`）：只上屏，不参与算数。 */
  readonly unit?: string;
  /** 口径行（这一张图怎么读）；不给＝本件按形态写一句自己的口径（那句话里带**同一把尺子的换算**）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
