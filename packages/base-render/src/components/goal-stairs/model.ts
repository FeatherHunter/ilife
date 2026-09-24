/** goal-stairs · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      段数不对、位置越界、窗口两端一样宽，画出来都是一幅**看着像样、其实说错话**的图。
 *   2. **件里不猜业务口径**：哪一段算进行中、今天算哪天、轴从哪天到哪天，都由调用方给
 *      （`state` 与百分数）。件里只做两件能机械判的事：算段数的字（`四段`）与判**过期**
 *      （窗口整段落在今天左边、这一段又没达成 ⇒ 点名「来不及」）。
 *   3. **能算的都算出来**：段名、窗口句、状态字、标签落轴的哪半边，都在这里算好；
 *      `render.ts` 只负责拼标记，算术与判断一个字都不写。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  GOAL_STAIRS_COUNT_UNIT,
  GOAL_STAIRS_DUE_LEAD,
  GOAL_STAIRS_FORMS,
  GOAL_STAIRS_MAX_STEPS,
  GOAL_STAIRS_MIN_STEPS,
  GOAL_STAIRS_STATES,
  GOAL_STAIRS_STATE_WORDS,
  GOAL_STAIRS_WINDOW_LEAD,
  GOAL_STAIRS_WINDOW_TAIL,
  type GoalStairsForm,
  type GoalStairsState,
  type GoalStairsStep,
} from './attrs.js';

/** 中文小数目字：卡头那枚段数写成「四段」（1–8 段都取得到；超出闭集由段数上下限先拦下）。 */
const COUNT_WORDS = ['一', '二', '三', '四', '五', '六', '七', '八'];

/** 标签改贴右缘的分界（百分数）：标记落在这条线**右边**时，标签从标记往左长。
 *
 *  为什么要有这一刀：标签是绝对定位的，`left: 标记位` 时它只能往右长——可用宽度只剩
 *  `100 − 标记位`，标记靠近右端（宽档下段数多时就是）会被压成一列孤字。翻到右缘之后，
 *  可用宽度变成 `标记位`，两种情况下都够一整句「最晚 09-01」站在一行里。 */
export const GOAL_STAIRS_DUE_FLIP_PCT = 50;

/** 本形态的缺省口径句。**从句里不出现 `·` 与 `；`，也不并列三段以上**——仓库的分隔符门
 *  对可见文本零豁免（口径见 `test/separator-probe.mjs`）。 */
export const GOAL_STAIRS_DEFAULT_NOTE =
  '口径：从目标日往回倒推每一段的最晚动手日（这一段要走的量除以还能用的天数）。'
  + '竖线是今天，整段落在竖线左边的窗口已经过期，会点名写「来不及」。'
  + '已达成的那段再写一个 ✓，不只靠颜色。';

/** 一段（内部类型：每个字段都已校验、已归一）。 */
export interface GoalStairsRowModel {
  /** 段序号（1 起）：上屏在段名里。 */
  readonly index: number;
  /** 段名与两端读数（`第 1 段 12 万 → 8 万`）。 */
  readonly name: string;
  /** 窗口句（`窗口 09-01 起`）。 */
  readonly windowWord: string;
  /** 状态字（`已达成 ✓`）。 */
  readonly stateWord: string;
  /** 状态档名（`done`／`now`／`plan`）：换成 `is-*` 类名与轨道色。 */
  readonly state: GoalStairsState;
  /** **过期点名**：窗口整段落在今天左边、这一段又没达成 ⇒ 行里写「来不及 ✕」。 */
  readonly late: boolean;
  /** 最晚动手日在整轴上的位置（0–100）。 */
  readonly startPct: number;
  /** 窗口右端在整轴上的位置（0–100）。 */
  readonly endPct: number;
  /** 轨道上那枚标签（`最晚 09-01`）。 */
  readonly dueWord: string;
  /** 标签是从标记往左长吗（标记落在轴的右半边时）。 */
  readonly dueFlip: boolean;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface GoalStairsModel {
  readonly form: GoalStairsForm;
  readonly title: string;
  readonly today: string;
  readonly todayPct: number;
  /** 卡头那枚段数（`四段`）。 */
  readonly countWord: string;
  readonly rows: readonly GoalStairsRowModel[];
  readonly note: string;
  readonly extraClass?: string;
}

/** 段数 → 卡头那枚字（`四段`）。1–8 取中文小数目字，超出闭集由段数上下限先拦下。 */
function countWordOf(count: number): string {
  const word = COUNT_WORDS[count - 1];
  return (word === undefined ? String(count) : word) + GOAL_STAIRS_COUNT_UNIT;
}

/** 百分数：0–100 的有限数。**越界与缺位是两条不同的错**，各报各的（调用方一眼知道缺什么）。 */
function reqPct(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是 0…100 的有限数（这一段在整轴上的位置）');
  }
  if (value < 0 || value > 100) {
    badInput(field + ' 必须是 0…100 的有限数（整轴左端 0、右端 100），收到 ' + String(value));
  }
  return value;
}

/** 一段的四个读数 ＋ 两个位置 ＋ 一个状态，逐条过。
 *  **次序**：先把「字段在不在、是不是那个类型」断完，再断两个位置的前后关系——
 *  位置反了报的是关系，不是类型（调用方一眼看得出该改哪一个）。 */
function reqStep(value: unknown, index: number): GoalStairsStep {
  const at = 'goal-stairs: input.steps[' + String(index) + ']';
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  const from = reqText(raw.from, at + '.from');
  const to = reqText(raw.to, at + '.to');
  const start = reqText(raw.start, at + '.start');
  const startPct = reqPct(raw.startPct, at + '.startPct');
  const endPct = reqPct(raw.endPct, at + '.endPct');
  if (!(endPct > startPct)) {
    badInput(at + '.endPct 必须大于 input.steps[' + String(index) + '].startPct'
      + '（窗口右端要落在左端右边：两端一样宽，这一段占了多久就读不出来了）');
  }
  const state: unknown = raw.state;
  if (!(GOAL_STAIRS_STATES as readonly unknown[]).includes(state)) {
    badInput(at + '.state 必须是 ' + GOAL_STAIRS_STATES.join('／')
      + ' 之一（这一段到哪一步了：已达成／进行中／还没开始）');
  }
  return { from, to, start, startPct, endPct, state: state as GoalStairsState };
}

/** 分段：2–8 段。**段数不是「尽量」，是形状的一部分**：一段没有先后，九段窄屏读不出窗口。 */
function reqSteps(value: unknown): readonly GoalStairsStep[] {
  if (!Array.isArray(value) || value.length < GOAL_STAIRS_MIN_STEPS) {
    badInput('goal-stairs: input.steps 至少 ' + String(GOAL_STAIRS_MIN_STEPS)
      + ' 个分段（一段读不出先后，也就倒推不出来）');
  }
  if (value.length > GOAL_STAIRS_MAX_STEPS) {
    badInput('goal-stairs: input.steps 最多 ' + String(GOAL_STAIRS_MAX_STEPS)
      + ' 个分段（再多窄容器里每一段的窗口读不出位置，请调用方先并段）');
  }
  return value.map((item, i) => reqStep(item, i));
}

/** 一段 → 一行（算术都在这里：段名、窗口句、标签落轴的哪半边、过期点名）。 */
function rowOf(step: GoalStairsStep, index: number, todayPct: number): GoalStairsRowModel {
  const no = String(index + 1);
  return {
    index: index + 1,
    name: '第 ' + no + ' 段 ' + step.from + ' → ' + step.to,
    windowWord: GOAL_STAIRS_WINDOW_LEAD + ' ' + step.start + ' ' + GOAL_STAIRS_WINDOW_TAIL,
    stateWord: GOAL_STAIRS_STATE_WORDS[step.state],
    state: step.state,
    /* 过期＝窗口**整段**落在竖线左边（右端也strictly在左边），且这一段还没达成。
       已达成的那段即使窗口过去了也不算迟到——那是走完的段。 */
    late: step.state !== 'done' && step.endPct < todayPct,
    startPct: step.startPct,
    endPct: step.endPct,
    dueWord: GOAL_STAIRS_DUE_LEAD + ' ' + step.start,
    dueFlip: step.startPct > GOAL_STAIRS_DUE_FLIP_PCT,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `GoalStairsModel`。 */
export function normalizeGoalStairs(input: unknown): GoalStairsModel {
  assertPlainObject(input, 'renderGoalStairs: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? GOAL_STAIRS_FORMS[0] : raw.form;
  if (!(GOAL_STAIRS_FORMS as readonly unknown[]).includes(form)) {
    badInput('goal-stairs: input.form 必须是 ' + GOAL_STAIRS_FORMS.join('／')
      + ' 之一（本件只落地形态 C「倒推日程：每段最晚何时动手」）');
  }

  const today = reqText(raw.today, 'goal-stairs: input.today');
  const todayPct = reqPct(raw.todayPct, 'goal-stairs: input.todayPct');
  const steps = reqSteps(raw.steps);
  const note = optText(raw.note, 'goal-stairs: input.note');
  return {
    form: form as GoalStairsForm,
    title: reqText(raw.title, 'goal-stairs: input.title'),
    today,
    todayPct,
    countWord: countWordOf(steps.length),
    rows: steps.map((step, i) => rowOf(step, i, todayPct)),
    note: note === undefined ? GOAL_STAIRS_DEFAULT_NOTE : note,
    extraClass: optExtraClass(raw.extraClass, 'goal-stairs: input.extraClass'),
  };
}
