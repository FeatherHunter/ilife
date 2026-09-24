/** gantt-timeline · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 61 件，2026-09
 *  用户三套皮肤逐格 4/4/4）里**形态 C「资源泳道（灶位）× 关键路径带」**那一档：
 *  · **一行＝一条资源**（灶位／设备／台面），问的是「这条资源什么时候空」——不是「这道菜什么时候做」；
 *  · **关键路径单独一条**（不能并行的那几段，带 1 起的顺序号），它的总长就是这一餐的下限；
 *  · 段有四档状态（已完成／进行中／等待前置／未开始），**空档段画成点线块并写分钟数**，不装作占用；
 *  · 里程碑是零时长的点（`◆`），单独一行排在泳道之后；
 *  · 横轴是**格**（一格 N 分钟），刻度数字由轴域算出来，不由调用方给。
 *
 *  它替掉的两种错法（原型那一件的 `p` 逐字）：**只列时间点的清单**（看不出并行的时候哪条资源被占住）
 *  与**用一条 24 小时的连续占比表达并行的多件事**（那是 `hour-band`：无行、无依赖、无「哪条空着」）。
 *
 *  与同族件的分工（别拿这一件当它们用）：
 *  · `hour-band`（时段带）是单日 24h 一条的连续占比：无行、无状态、无刻度数字；
 *  · `range-bar`（区间条）是同一条量程上比长短的多泳道区间：没有开始／时长／结束三列读数、
 *    没有里程碑、没有空档段、没有跨行依赖、没有「现在」游标、没有格刻度。
 *
 *  形态键写在 `GANTT_TIMELINE_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」，日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `GANTT_TIMELINE_CLASS + '-' + 槽名`。 */
export const GANTT_TIMELINE_CLASS = 'ilife-block-gantt-timeline';

/** 槽位闭集（`render.ts`／`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const GANTT_TIMELINE_SLOTS = [
  /** 卡头那一排：标题 ＋ 泳道数那枚 ＋ 右端读数。 */
  'hd',
  /** 卡头标题（`红烧肉套餐 90 分钟`）。 */
  'title',
  /** 卡头中间那枚（缺省 `<泳道数> 条泳道`，可换字）。 */
  'stamp',
  /** 卡头右端那句读数（`上桌 21:25`）；不给＝不出。 */
  'tail',
  /* ── 刻度行（左侧量名 ‖ 格刻度） ── */
  /** 刻度行（与每一行同一套列宽，所以数字与条天然对齐）。 */
  'axrow',
  /** 刻度行左端那枚量名（`分钟`）：宽档占左侧标签列，窄档折到刻度之上。 */
  'lbh',
  /** 刻度区（`aria-hidden`；格数由轴域算出来）。 */
  'ax',
  /** 一格（有数字的那几格另带 `is-num`，数字在右半区时改右对齐，免得跑出刻度区）。 */
  'tick',
  /** 那一格的数字（`0`／`15`／…；一枚格子最多一枚）。 */
  'tick-label',
  /* ── 泳道区 ── */
  /** 泳道区（`role="img"` ＋ 一句无障碍名；「现在」游标也住在这里）。 */
  'body',
  /** 「现在」游标（绝对定位的竖线，位置由行内自定义属性给）。 */
  'now',
  /** 游标上那枚字（`14:20`／`上桌`）；靠右半区时改到线的左侧。 */
  'now-label',
  /** 一行（关键路径／一条泳道／一个里程碑）。 */
  'row',
  /** 行左端那块标签（宽档在左侧列，窄档折到轨迹之上）。 */
  'row-label',
  /** 标签里的名字（`关键路径`／`灶 炒锅`）。 */
  'row-name',
  /** 标签里的读数（`占用 65 分`／`不能并行的 4 段`）。 */
  'row-note',
  /** 轨迹（格网；段／空档块／里程碑点都按 `grid-column` 落位）。 */
  'track',
  /** 一条段（带状态类 `is-done`／`is-doing`／`is-wait`／`is-plan`／`is-crit`；
   *  带短字时另带 `is-labelled`——这块面上有正文级的字，样式段据此改走软底那一档）。 */
  'bar',
  /** 段里那枚字形（`✓`／`▶`／`⋯`／`▷`／关键路径的顺序号）——**不是正文，是图形**。 */
  'mark',
  /** 段里那枚短字（可选）；空档块里放的是分钟数（`30′`）。 */
  'text',
  /** 空档段（点线块，块里写分钟数）。 */
  'idle',
  /** 里程碑（零时长的点）：元素铺到一侧、那枚 `◆` 压在格线上，名字写在行左端。 */
  'milestone',
  /** 里程碑那枚 `◆`。 */
  'ms-mark',
  /** 里程碑的名字（写在 `◆` 旁边，长了换行、不截断）。 */
  'ms-text',
  /* ── 图例与口径 ── */
  /** 图例（逐枚：形 ＋ 字；**只列这一段实际出现过的档**）。 */
  'legend',
  /** 图例的一枚。 */
  'legend-item',
  /** 图例左端那枚形（`1-4`／`✓`／`▶`／`⋯`／`▷`／`30′`）。 */
  'swatch',
  /** 图例里这一档叫什么（`进行中`）。 */
  'legend-word',
  /** 口径行（这一张图怎么读；可很长、必须能换行）。 */
  'note',
] as const;
export type GanttTimelineSlot = (typeof GANTT_TIMELINE_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `GANTT_TIMELINE_CLASS + '-' + …`）。 */
export function ganttTimelineSlot(slot: GanttTimelineSlot, prefix = 'ilife-'): string {
  return prefix + 'block-gantt-timeline-' + slot;
}

/** 形态闭集：本件只落地原型形态 **C「资源泳道（灶位）× 关键路径带」**。 */
export const GANTT_TIMELINE_FORMS = ['C'] as const;
export type GanttTimelineForm = (typeof GANTT_TIMELINE_FORMS)[number];

/** 段的状态闭集（四档 ＋ 空档段）。**字形是形、图例是字、底色是色**——三样一起给，色不是唯一信息。 */
export const GANTT_TIMELINE_STATES = ['done', 'doing', 'wait', 'plan', 'idle'] as const;
export type GanttTimelineState = (typeof GANTT_TIMELINE_STATES)[number];

/** 标记里那一档的键：段的状态四档 ＋ 关键路径段（`crit`）＋ 里程碑（`milestone`）。
 *  这三样走**同一套** `is-*` 类名（条与图例那枚形都用），故类型也合成一支。 */
export type GanttTimelineStateKey = GanttTimelineState | 'crit' | 'milestone';

/** 那一档在标记里的类名（`is-` ＋ 档名，与 `is-C` 同一套写法）。**唯一拼法**：
 *  条（`render.ts`）与图例那枚形都调它——自己再拼一次 `' is-' + state` 就是同一事实两处写。 */
export function ganttTimelineStateClass(state: GanttTimelineStateKey): string {
  return 'is-' + state;
}

/** 缺省每格分钟数（与原型的 90 分钟 ÷ 18 格同档）。 */
export const GANTT_TIMELINE_DEFAULT_CELL_MINUTES = 5;

/** 格数上下限：少到 6 格以下刻度字比格还密；多到 24 格以上窄容器里一格放不下一个字。 */
export const GANTT_TIMELINE_MIN_CELLS = 6;
export const GANTT_TIMELINE_MAX_CELLS = 24;

/** 刻度数字最多出几枚（**算出来的**：多了挤在一起＝压字）。 */
export const GANTT_TIMELINE_MAX_TICK_LABELS = 6;

/** 泳道条数上限（再多请调用方分页：一屏十条以上读不出「哪条空着」）。 */
export const GANTT_TIMELINE_MAX_LANES = 8;

/** 关键路径的段数上下限（一段不是"路径"；九段以上读数写不下）。 */
export const GANTT_TIMELINE_MIN_KEY_STEPS = 2;
export const GANTT_TIMELINE_MAX_KEY_STEPS = 8;

/** 里程碑最多几个（每个占一行）。 */
export const GANTT_TIMELINE_MAX_MILESTONES = 4;

/** 空档段最少占几格：再短的空档块，块里的分钟数要拆成好几行才放得下。 */
export const GANTT_TIMELINE_IDLE_MIN_CELLS = 2;

/** 行内自定义属性（**本件自己的名字**，不占 `--ilife-*` 那个命名空间——那是皮肤 token 的空间）。 */
export const GANTT_TIMELINE_AT_VAR = '--gantt-timeline-at';

/** 一条段：从第几分钟起、持续几分钟、什么状态。 */
export interface GanttTimelineSegment {
  /** 起始分钟（≥ 0，**落在格线上**：必须是 `cellMinutes` 的整数倍）。 */
  readonly from: number;
  /** 时长（**正数，且是整数格**）：`from + minutes` 也必须落在格线上。 */
  readonly minutes: number;
  /** 状态（闭集，缺省 `plan`）；`idle` ＝ 空档段（画点线块并写分钟数，不装作占用）。 */
  readonly state?: GanttTimelineState;
  /** 段里的短字（可选）：条上除了状态字形还能写一枚短字（如菜名）；不给＝只有字形。
   *  给了短字 ＝ 这块面上有正文级的字 ⇒ 与关键路径段同档（软底 ＋ 主色字 ＋ 主色描边）：
   *  实底上的 `accent-ink` 在 neutral 皮肤下只有 4.02，过不了 4.5 的文本地板。 */
  readonly label?: string;
}

/** 一条泳道＝一条资源（灶位／设备／台面）。 */
export interface GanttTimelineLane {
  /** 资源名（`灶 炒锅`）；**非空**，长了换行、不截断。 */
  readonly label: string;
  /** 行左端的读数（`占用 65 分`）；不给＝本件按这一条被占用的分钟数写一句。 */
  readonly note?: string;
  /** 这条资源被占用的段（**可以是空数组** ＝ 整段时间都空着）。 */
  readonly segments: readonly GanttTimelineSegment[];
}

/** 关键路径的一段：起点由前一段的长度推出来（不能并行，所以段段相接）。 */
export interface GanttTimelineStep {
  /** 这一段的动作名（`切配`）。 */
  readonly name: string;
  /** 这一段的时长（**正数，且是整数格**）。 */
  readonly minutes: number;
}

/** 关键路径：单独一条泳道，标 1 起的顺序号，总长＝各段之和。 */
export interface GanttTimelineKeyPath {
  /** 这条泳道的名字（缺省 `关键路径`）。 */
  readonly label?: string;
  /** 行左端的读数（缺省 `不能并行的 <段数> 段`）。 */
  readonly note?: string;
  /** 各段（按先后次序给；`GANTT_TIMELINE_MIN_KEY_STEPS`–`GANTT_TIMELINE_MAX_KEY_STEPS` 段）。 */
  readonly steps: readonly GanttTimelineStep[];
}

/** 里程碑：零时长的点。**每个里程碑占一行**（排在泳道之后）。 */
export interface GanttTimelineMilestone {
  /** 落在第几分钟（≥ 0，**落在格线上**）。 */
  readonly at: number;
  /** 名字（`上桌`）——写在行左端，不写进轨迹（轨迹里只有那枚 `◆`）。 */
  readonly label: string;
  /** 行左端的读数；不给＝本件写 `<分钟数> 分 里程碑`。 */
  readonly note?: string;
}

/** 「现在」游标：一条竖线 ＋ 线上那枚字。 */
export interface GanttTimelineCursor {
  /** 落在第几分钟（≥ 0；超出数据末端时时间跨度跟着它延长）。 */
  readonly at: number;
  /** 线上那枚字（`14:20`／`上桌`）；**非空**，长了换行、不截断。 */
  readonly label: string;
}

/** 甘特时间线的入参。`title`／`lanes` 两样恒必填——没有资源泳道就没有这一档骨架。 */
export interface GanttTimelineInput {
  /** 卡头标题（`红烧肉套餐 90 分钟`）。 */
  readonly title: string;
  /** 资源泳道（1–`GANTT_TIMELINE_MAX_LANES` 条；行序＝给的次序）。 */
  readonly lanes: readonly GanttTimelineLane[];
  /** 关键路径带；不给＝不出这一行。 */
  readonly keyPath?: GanttTimelineKeyPath;
  /** 里程碑（`GANTT_TIMELINE_MAX_MILESTONES` 个以内，每个占一行）。 */
  readonly milestones?: readonly GanttTimelineMilestone[];
  /** 「现在」游标；不给＝不画。 */
  readonly cursor?: GanttTimelineCursor;
  /** 每格几分钟（缺省 `GANTT_TIMELINE_DEFAULT_CELL_MINUTES`）：格数 ＝ 时间跨度 ÷ 它。 */
  readonly cellMinutes?: number;
  /** 时间跨度（分钟）；不给＝按落在最晚的那一处算（段末／里程碑／游标），再向上补满整格。 */
  readonly spanMinutes?: number;
  /** 刻度文字（逐枚一枚，**枚数 ＝ 算出来的刻度数**）；不给＝写分钟数（`0`／`15`／…）。 */
  readonly tickText?: readonly string[];
  /** 刻度行左端那枚量名（缺省 `分钟`）：给了 `tickText` 时它照旧写单位。 */
  readonly axisName?: string;
  /** 卡头中间那枚（缺省 `<泳道数> 条泳道`）。 */
  readonly stamp?: string;
  /** 卡头右端那句读数（`上桌 21:25`）；不给＝不出。 */
  readonly tail?: string;
  /** 口径行；不给＝本件写一句自己的口径（那一句是这一件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 形态键（闭集，缺省 `C`）。 */
  readonly form?: GanttTimelineForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
