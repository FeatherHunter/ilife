/** due-row · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 B「倒计时放大 ＋ 动作」**——"还剩多少天"**放大成读数**，每行配一个动作：
 *  保修／证件（居家管家）· 还款日（记账）· 提醒（备忘录）都用它。
 *
 *  **三档（正常／临近／已过期）也是「字 ＋ 形 ＋ 色」**：
 *  左竖条实线／点线／双线，档位字带底线／描边实底／双线框，点圆／方／菱——色只是第三样。
 *
 *  **它是交互件**：动作走真运行时（`runtime.ts` 产出 JS 文本）——点一下翻译成一条冒泡事件，
 *  本件不自己决定动作语义。按钮标记与运行时只通过本文件的名字耦合。
 */
export const DUE_ROW_CLASS = 'ilife-block-due-row';

/** 槽位闭集（数组里带注释 ⇒ 不会被当成"形态闭集"）。 */
export const DUE_ROW_SLOTS = [
  'head',
  'heading',
  'count',
  'list',
  'item',
  'body',
  'line1',
  'tag',
  'dot',
  'name',
  'meta',
  'note',
  'side',
  'countdown',
  'countdown-label',
  'count-value',
  'count-unit',
  'due',
  'act',
  'button',
  'act-note',
  'err',
  'foot',
  'absent',
] as const;
export type DueRowSlot = (typeof DUE_ROW_SLOTS)[number];

/** 类名根。 */
export function dueRowClass(prefix = 'ilife-'): string {
  return prefix + 'block-due-row';
}

/** 槽类的唯一拼法。 */
export function dueRowSlot(slot: DueRowSlot, prefix = 'ilife-'): string {
  return dueRowClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 B「倒计时放大 ＋ 动作」。 */
export const DUE_ROW_FORMS = ['countdown'] as const;
export type DueRowForm = (typeof DUE_ROW_FORMS)[number];

/** 三档闭集（正常／临近／已过期）。档位决定左竖条、档位字与点的**形状**。 */
export const DUE_ROW_TONES = ['ok', 'warn', 'danger'] as const;
export type DueRowTone = (typeof DUE_ROW_TONES)[number];

/** 行的机器键（**运行时的发现锚**：`[data-ilife-due]` 即一行）。 */
export const DUE_KEY_ATTR = 'data-ilife-due';
/** 行的人类可读名（事件 `detail.name` 用它）。 */
export const DUE_LABEL_ATTR = 'data-ilife-due-label';
/** 行的档位（事件 `detail.tone` 带回来；也给页面当 CSS 钩子）。 */
export const DUE_TONE_ATTR = 'data-ilife-due-tone';
/** 动作按钮的发现锚：值＝动作键。 */
export const DUE_ACT_ATTR = 'data-ilife-due-act';
/** 动作按钮的人类可读名（事件 `detail.actionLabel` 用它）。 */
export const DUE_ACT_LABEL_ATTR = 'data-ilife-due-act-label';
/** 动作进行中（原地换字，宽度锁住不跳版）。 */
export const DUE_LOADING_ATTR = 'data-ilife-due-loading';
/** 禁用标记（按不动；"看着能点、点了没反应"是不许留的中间档）。 */
export const DUE_DISABLED_ATTR = 'data-ilife-due-disabled';
/** 绑定完成标记（运行时幂等：重复注入只绑一次）。 */
export const DUE_BOUND_ATTR = 'data-ilife-due-bound';

/** 动作事件（冒泡 `CustomEvent`，`detail = { key, name, tone, action, actionLabel }`）。
 *  页面用 `root.addEventListener(DUE_EVENT_ACTION, …)` 接自己的动作逻辑——**不引入任何全局**。 */
export const DUE_EVENT_ACTION = 'ilife:due-action';

/** 动作进行中按钮上的字（原地换字；宽度由 `DUE_ROW_BUTTON_MIN_WIDTH_PX` 锁住）。 */
export const DUE_LOADING_LABEL = '处理中…';

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const DUE_ROW_MISSING = '—';

/** 一行的动作（"去派出所"／"设提醒"）。**它是真 `<button>`**，不是扮成按钮的 `<span>`。 */
export interface DueRowAction {
  /** 动作键（事件 `detail.action` 原样带回；同一页内按行键＋动作键定位）。非空字符串。 */
  readonly key: string;
  /** 按钮上的字（`去派出所`）。非空字符串。 */
  readonly label: string;
  /** 按不动：**必须同时给 `note` 说明为什么**（含糊地禁掉是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 按钮下面那句说明（为什么不能按／按下去会怎样）。 */
  readonly note?: string;
  /** 正在处理：原地换成 `DUE_LOADING_LABEL`（宽度锁住，不跳版）。 */
  readonly loading?: boolean;
}

/** 一行：一笔快到／已过期的事。 */
export interface DueRowItem {
  /** 机器键（同页唯一；运行时按它派发）。必填非空。 */
  readonly key: string;
  /** 这一笔是什么（`身份证换领`）。必填非空。 */
  readonly name: string;
  /** 档位（正常／临近／已过期）。**必填**——三档是本件的主轴，缺了它左竖条与档位字就没有形状。 */
  readonly tone: DueRowTone;
  /** 档位字（`正常`／`临近`／`已过期`）。**必填**——状态必须带字，只给色等于没给。 */
  readonly tag: string;
  /** 放大的那个数（`18`／`0`／`12`）。必填非空；等宽数字、**永不截断**。 */
  readonly countdown: string;
  /** 数的前词（`还剩`／`已逾期`）。 */
  readonly countdownLabel?: string;
  /** 数的量词（`天`）。 */
  readonly countUnit?: string;
  /** 到期那一天（`2026-10-13 到期`）：等宽、**永不截断**。 */
  readonly due?: string;
  /** 补充（`招商信用卡 · 自动扣款`）。串＝一段；数组＝逐段一枚 `<span>`（分隔由列距承担）。 */
  readonly meta?: string | readonly string[];
  /** 该做什么（`18 天内报修，工时费全免`）：一行大白话。 */
  readonly note?: string;
  /** 这一行的动作；不给＝这一行没有动作（如"不用管"）。 */
  readonly action?: DueRowAction;
  /** 动作没成的错（`没连上：再试一次`）：写在按钮旁边 ＋ `aria-describedby` 指过去。 */
  readonly error?: string;
}

export interface DueRowInput {
  /** 逐行；空数组且无 `absentLine` ⇒ 空串（与"没内容不留空块"同口径）。 */
  readonly rows: readonly DueRowItem[];
  /** 小标题（`最该先办的`）。 */
  readonly heading?: string;
  /** 右侧计数（`按紧急度排 · 今天 09-25`）：**本件不排序、不数数**，口径由调用方给。 */
  readonly count?: string;
  /** 空态那一句（`没有快到期的`）——**这是"没什么"，不是一行**，所以住独立槽位、不进 `rows`。 */
  readonly absentLine?: string;
  /** 脚注（`共 4 件`／`最近的 10-13`）：串＝一句；数组＝逐段一枚。 */
  readonly foot?: string | readonly string[];
  /** 形态键（闭集，缺省 `countdown`）。 */
  readonly form?: DueRowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
