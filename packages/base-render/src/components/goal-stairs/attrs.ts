/** goal-stairs · **标记契约**（渲染与调用方共用的唯一事实：类名／槽位闭集／形态闭集／状态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 66 件「目标阶梯」）里
 *  用户裁定落地的那一档：**形态 C「倒推日程（每段最晚何时动手）」**。
 *  同一件的另外两档（A 分段台阶／B 里程碑轴）还没全过，故不落——「形态是骨架，不是地址」：
 *  日后它们过了，是在 `GOAL_STAIRS_FORMS` 这个闭集里加一格，不是新开一件。
 *
 *  这一档问的是**次序与期限**：目标日往回倒推，每一段各有一段窗口，窗口开的那天就是这一段
 *  **最晚动手**的那天；轨道上那根竖线是今天，整段落在竖线左边的窗口已经过期。
 *  它替掉的两种错法（原型那一件的 `p` 与 `dup` 逐条对齐）：
 *   · 只有一个总进度条 —— 看不出分几段、也看不出每段最晚什么时候动手；
 *   · 只写目标日、不写每段的最晚动手日 —— 到期那天才发现来不及。
 *
 *  与同族件的分工（别拿这一件当它们用）：
 *   · `progress-list`（多目标进度）每一行是「已达到 ÷ 目标」两个数之比，读的是比例，没有先后、没有期限；
 *   · `step-flow`（步骤条）的步骤没有数量刻度、没有期限、没有「这一段最晚哪天动手」；
 *   · `scale-bar`（刻度条）画的是一个值在刻度上的格子，没有段、没有窗口、没有倒推。
 *
 *  形态键写在 `GOAL_STAIRS_FORMS`（闭集）：闭集外的值一律 `badInput`（不静默降级——
 *  降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `GOAL_STAIRS_CLASS + '-' + 槽名`。 */
export const GOAL_STAIRS_CLASS = 'ilife-block-goal-stairs';

/** 槽位闭集（`render.ts`／`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const GOAL_STAIRS_SLOTS = [
  /** 卡头那一排：标题 ＋ 段数 ＋ 右端那句（竖线是哪一天）。 */
  'hd',
  /** 卡头标题（`倒推到 12-07 还清`）。 */
  'title',
  /** 卡头那枚段数（`四段`）：**由段数算出来**，不由调用方给（给了就会与真的段数走散）。 */
  'count',
  /** 卡头右端那句（`竖线＝今天 09-24`）：前两个字是固定的，只有日期那一段是调用方的。 */
  'tail',
  /** 卡头右端那句里固定下来的前两个字（`竖线＝今天`）。 */
  'tail-lead',
  /** 卡头右端那句里的日期（`09-24`）。 */
  'tail-day',
  /** 逐段那张表（`<ol>`：段的先后是这件事本身，故用有序表）。 */
  'rows',
  /** 一段（一行：行头 ＋ 轨道）。 */
  'row',
  /** 行头那一排：段名与两端读数 ＋ 窗口起 ＋ 过期点名 ＋ 状态字。 */
  'head',
  /** 段名与这一段两端的读数（`第 1 段 12 万 → 8 万`）。 */
  'name',
  /** 窗口开的那天（`窗口 09-01 起`）。 */
  'window',
  /** 过期点名（`来不及 ✕`）：**只在**窗口整段落在今天左边、这一段又没达成时出。 */
  'late',
  /** 状态字（`已达成 ✓`／`进行中 ▶`／`还没开始 ○`）——**状态不只靠颜色**，这里是字那一份。 */
  'state',
  /** 这一段的轨道（窗口带 ＋ 今天的竖线 ＋ 最晚动手日那枚标签）。 */
  'track',
  /** 轨道上的窗口带（**无文字的条**：纯装饰，窗口开在哪天由行头的字说）。 */
  'band',
  /** 轨道上今天那根竖线（**纯装饰**：今天是哪天由卡头的字说）。 */
  'today',
  /** 轨道上「最晚动手日」那枚标签（**有字**：`最晚 09-01`）。 */
  'due',
  /** 口径行（这一张图怎么读、倒推是怎么推的）。 */
  'note',
] as const;
export type GoalStairsSlot = (typeof GOAL_STAIRS_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `GOAL_STAIRS_CLASS + '-' + …`）。 */
export function goalStairsSlot(slot: GoalStairsSlot, prefix = 'ilife-'): string {
  return prefix + 'block-goal-stairs-' + slot;
}

/** 形态闭集：本件只落地形态 C「倒推日程（每段最晚何时动手）」。 */
export const GOAL_STAIRS_FORMS = ['C'] as const;
export type GoalStairsForm = (typeof GOAL_STAIRS_FORMS)[number];

/** 分段状态闭集：这一段走到哪一步了。**由调用方给**——「哪一段算进行中」是业务口径，件里说了不算。 */
export const GOAL_STAIRS_STATES = ['done', 'now', 'plan'] as const;
export type GoalStairsState = (typeof GOAL_STAIRS_STATES)[number];

/** 三种状态上屏的字（**形与字都在这里**：✓ 已达成／▶ 进行中／○ 还没开始）。
 *  三枚形各不相同（色盲下也分得出），换皮只换颜色取值、不动这三枚字。 */
export const GOAL_STAIRS_STATE_WORDS: Readonly<Record<GoalStairsState, string>> = Object.freeze({
  done: '已达成 ✓',
  now: '进行中 ▶',
  plan: '还没开始 ○',
});

/** 过期点名那枚字：窗口整段落在今天左边、这一段又没达成时，行里写它（**点名，不只靠颜色**）。 */
export const GOAL_STAIRS_LATE_WORD = '来不及 ✕';

/** 段数上下限：一段读不出先后（也就没有「阶梯」），九段以上窄容器里每一段的窗口读不出位置。 */
export const GOAL_STAIRS_MIN_STEPS = 2;
export const GOAL_STAIRS_MAX_STEPS = 8;

/** **标签翻边的分界**（百分数）：最晚动手日那枚标签挂在标记上，标记落在这条线**右边**时
 *  从标记往左长（`is-right`）。它是**标记契约的一部分**（决定根上加不加 `is-right` 那个类名），
 *  故住在这里，与槽位闭集同源。
 *
 *  为什么要有这一刀：可用宽度只有一边——不翻边时是 `100 − 标记位`，标记靠近右端会被压成一列孤字；
 *  翻边后是 `标记位`，两种情况下都够一整句「最晚 09-01」站在一行里。 */
export const GOAL_STAIRS_DUE_FLIP_PCT = 50;

/** 卡头那枚段数的后缀（`四段` 的那个「段」）。 */
export const GOAL_STAIRS_COUNT_UNIT = '段';

/** 卡头右端那两句的固定前缀（「竖线是哪一天」与「最晚动手日」：日期那一段才是调用方的）。 */
export const GOAL_STAIRS_TODAY_LEAD = '竖线＝今天';
export const GOAL_STAIRS_WINDOW_LEAD = '窗口';
export const GOAL_STAIRS_WINDOW_TAIL = '起';
export const GOAL_STAIRS_DUE_LEAD = '最晚';

/** 本件自己的行内自定义属性名（**不占 `--ilife-*`**：那是皮肤 token 的空间，名单住 `skin/contract.ts`）。
 *  先例 `photo-compare` 的 `--photo-compare-split`、`cash-waterline` 的 `--cash-waterline-h`。 */
export const GOAL_STAIRS_START_VAR = '--goal-stairs-start';
export const GOAL_STAIRS_END_VAR = '--goal-stairs-end';
export const GOAL_STAIRS_NOW_VAR = '--goal-stairs-now';

/** 一段（`steps` 的每一个元素）：**读数与位置都在这里，件里只负责画**。
 *
 *  三条口径：
 *   1. `start` 是**给人看的日期串**（`09-01`）：取整、补零、写不写年份都归调用方；
 *   2. 位置是**百分数**（整轴左端 0、右端 100）：轴怎么定、跨不跨年，是调用方的口径，件里不猜；
 *   3. `start` 那枚日期**同时**是「窗口开的那天」与「这一段最晚动手的那天」——
 *      倒推就是这么推的：这一段最晚动手的那一刻，就是它的窗口开的那一刻。两处都写它。 */
export interface GoalStairsStep {
  /** 这一段两端的读数：起点（`12 万`）。**非空**。 */
  readonly from: string;
  /** 这一段两端的读数：终点（`8 万`）。**非空**。 */
  readonly to: string;
  /** 这一段最晚动手的那天（`09-01`），也就是它的窗口开的那天：行头写「窗口 09-01 起」、轨道上写「最晚 09-01」。 */
  readonly start: string;
  /** 最晚动手日在整轴上的位置（0–100 的有限数）：轨道上那枚标签落在这儿。 */
  readonly startPct: number;
  /** 窗口右端在整轴上的位置（0–100 的有限数，**严格大于** `startPct`）：这一段占多久看它。 */
  readonly endPct: number;
  /** 这一段到哪一步了（闭集 `done`／`now`／`plan`）。 */
  readonly state: GoalStairsState;
}

/** 目标阶梯入参。`title`／`today`／`todayPct`／`steps` 必填——没有今天就没有那根竖线，没有分段就没有倒推。 */
export interface GoalStairsInput {
  /** 卡头标题（`倒推到 12-07 还清`）。 */
  readonly title: string;
  /** 今天（`09-24`）：卡头那句「竖线＝今天 09-24」用它，上屏的样子由调用方定。 */
  readonly today: string;
  /** 今天在整轴上的位置（0–100 的有限数）：轨道上那根竖线落在这儿。 */
  readonly todayPct: number;
  /** 分段（`GOAL_STAIRS_MIN_STEPS`–`GOAL_STAIRS_MAX_STEPS` 段，**按先后的次序给**）。 */
  readonly steps: readonly GoalStairsStep[];
  /** 形态键（闭集，缺省 `C`）。 */
  readonly form?: GoalStairsForm;
  /** 口径行；**不给＝用本形态的口径句**（那一句是本件的读数纪律，不是装饰）。 */
  readonly note?: string;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
