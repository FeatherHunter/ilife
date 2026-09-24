/** timer-card · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 A「卡式大数字」**——剩余时间当卡上的主读数（大数字 ＋ 进度条 ＋ 已过／还剩），
 *  底下开始／暂停／重置，并写明"这一锅在等什么"。等的那几分钟（私家大厨）与运动计时（卡路里）都用它。
 *
 *  **它是交互件（真计时）**：状态机（待开始 → 计时中 ⇄ 已暂停 → 到点了）走 `runtime.ts` 产出的 JS 文本，
 *  按 `Date.now()` 记账（不是数 tick 次数 ⇒ 标签页被节流也不漂）。标记与运行时只通过本文件的名字耦合。
 *
 *  状态一样是「字 ＋ 形 ＋ 色」：状态字（待开始／计时中／已暂停／到点了）＋ 标签形状（底线／实底／描边／双线框）。
 */
export const TIMER_CARD_CLASS = 'ilife-block-timer-card';

/** 槽位闭集（数组里带注释 ⇒ 不会被当成"形态闭集"）。 */
export const TIMER_CARD_SLOTS = [
  'head',
  'title',
  'tag',
  'display',
  'display-value',
  'display-unit',
  'bar',
  'bar-fill',
  'readouts',
  'hint',
  'acts',
  'button',
  'error',
  'absent',
] as const;
export type TimerCardSlot = (typeof TIMER_CARD_SLOTS)[number];

/** 类名根。 */
export function timerCardClass(prefix = 'ilife-'): string {
  return prefix + 'block-timer-card';
}

/** 槽类的唯一拼法。 */
export function timerCardSlot(slot: TimerCardSlot, prefix = 'ilife-'): string {
  return timerCardClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「卡式大数字」。 */
export const TIMER_CARD_FORMS = ['card'] as const;
export type TimerCardForm = (typeof TIMER_CARD_FORMS)[number];

/** 状态闭集：待开始 → 计时中 ⇄ 已暂停 → 到点了。闭集外的值一律 `badInput`。 */
export const TIMER_STATES = ['idle', 'running', 'paused', 'done'] as const;
export type TimerState = (typeof TIMER_STATES)[number];

/** 状态字（四态各有自己的标签形状，见 `style.ts`；也是运行时换的那个词）。 */
export const TIMER_STATE_WORDS: Readonly<Record<TimerState, string>> = Object.freeze({
  idle: '待开始',
  running: '计时中',
  paused: '已暂停',
  done: '到点了',
});

/** 主按钮在各状态下的字（**同一个按钮原地换字**；宽度由 `TIMER_CARD_BUTTON_MIN_WIDTH_PX` 锁住）。 */
export const TIMER_PRIMARY_LABELS: Readonly<Record<TimerState, string>> = Object.freeze({
  idle: '开始',
  running: '暂停',
  paused: '继续',
  done: '重新开始',
});

/** 第二个按钮的字。 */
export const TIMER_RESET_LABEL = '重置';
/** 正在处理时主按钮上的字（原地换字，宽度不跳）。 */
export const TIMER_LOADING_LABEL = '开始中…';
/** 还没设时长时显示的那个记号（缺值写法：写 `—`，不写 0、不留空）。 */
export const TIMER_CARD_MISSING = '—';
/** 还没设时长时那句话（调用方可以覆盖）。 */
export const TIMER_CARD_EMPTY_LINE = '还没设时长：先定一个再计时';

/** 行的机器键（**运行时的发现锚**：`[data-ilife-timer]` 即一张计时卡）。 */
export const TIMER_KEY_ATTR = 'data-ilife-timer';
/** 状态（`idle`／`running`／`paused`／`done`）：**运行时写的唯一事实**，页面按它判断。 */
export const TIMER_STATE_ATTR = 'data-ilife-timer-state';
/** 剩余毫秒（运行时每次心跳写它；暂停时它就是冻结的那个值）。 */
export const TIMER_REMAIN_ATTR = 'data-ilife-timer-remaining-ms';
/** 总毫秒（渲染时定下，从不改）。 */
export const TIMER_TOTAL_ATTR = 'data-ilife-timer-total-ms';
/** 大数字节点（运行时按它换字）。 */
export const TIMER_DISPLAY_ATTR = 'data-ilife-timer-display';
/** 进度条填充（运行时只动它的 `transform: scaleX()`）。 */
export const TIMER_BAR_ATTR = 'data-ilife-timer-bar';
/** 状态标签节点（运行时按它换字与换形状类）。 */
export const TIMER_TAG_ATTR = 'data-ilife-timer-tag';
/** 已过读数节点（运行时按它换字）。 */
export const TIMER_ELAPSED_ATTR = 'data-ilife-timer-elapsed';
/** 还剩读数节点（运行时按它换字）。 */
export const TIMER_REST_ATTR = 'data-ilife-timer-rest';
/** 动作按钮（值＝动作键：`toggle`／`reset`）。 */
export const TIMER_ACT_ATTR = 'data-ilife-timer-act';
/** 整卡禁用（按钮按不动，`cursor:not-allowed`；为什么写在卡上）。 */
export const TIMER_DISABLED_ATTR = 'data-ilife-timer-disabled';
/** 正在处理（主按钮换成 `TIMER_LOADING_LABEL` ＋ `aria-busy`）。 */
export const TIMER_BUSY_ATTR = 'data-ilife-timer-busy';
/** 绑定完成标记（运行时幂等：重复注入只绑一次）。 */
export const TIMER_BOUND_ATTR = 'data-ilife-timer-bound';

/** 动作键闭集：主按钮（开始／暂停／继续／重新开始按状态定）与重置。 */
export const TIMER_ACTS = ['toggle', 'reset'] as const;
export type TimerAct = (typeof TIMER_ACTS)[number];

/** 心跳（毫秒）：运行时的驱动间隔，也是判据里的读数。 */
export const TIMER_CARD_TICK_MS = 250;

/** 状态变化事件（冒泡 `CustomEvent`，`detail = { key, state, remainingMs, totalMs }`）。 */
export const TIMER_EVENT_STATE = 'ilife:timer-state';
/** 到点了事件（冒泡 `CustomEvent`，`detail` 同上，`state = 'done'`）。 */
export const TIMER_EVENT_DONE = 'ilife:timer-done';

export interface TimerCardInput {
  /** 机器键（同页唯一；运行时按它派发）。必填非空。 */
  readonly key: string;
  /** 这一锅／这一组是什么（`第 3 步 · 煸炒五花肉`）。必填非空。 */
  readonly title: string;
  /** 总时长（秒）。**必填**：`0` ＝ 还没设时长（走空态：大数字写 `—`、按钮按不动）。 */
  readonly totalSeconds: number;
  /** 已过（秒）：缺省 0；必须 ≥0 且 ≤ `totalSeconds`。 */
  readonly elapsedSeconds?: number;
  /** 初始状态（缺省 `idle`）；`totalSeconds` 为 0 时只许 `idle`。 */
  readonly state?: TimerState;
  /** 一句人话提示（`这一步结束后紧接着下豆豉`）。 */
  readonly hint?: string;
  /** 错态（`没连上：再试一次`）：写在按钮旁边 ＋ `aria-describedby` 指过去。 */
  readonly error?: string;
  /** 正在处理（主按钮原地换字，宽度锁住）。 */
  readonly loading?: boolean;
  /** 整卡禁用（按钮按不动；为什么写在卡上）。 */
  readonly disabled?: boolean;
  /** 空态（`totalSeconds` 为 0）时那句话；缺省 `TIMER_CARD_EMPTY_LINE`。 */
  readonly absentLine?: string;
  /** 形态键（闭集，缺省 `card`）。 */
  readonly form?: TimerCardForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
