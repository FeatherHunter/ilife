/** step-flow · **标记契约**（渲染与调用方共用的唯一事实：类名／槽名／形态闭集／状态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 A「竖排带说明」**——做到第几步了：已完成／当前／未开始三态，
 *  每一步带估时与实耗，当前那一步带说明。做菜步骤（私家大厨）与落地训练（卡路里）都用它。
 *
 *  **三态靠「字 ＋ 形 ＋ 色」三样一起给**：节点是实心圆带 ✓ ／ 双环带内点 ／ 虚线空圈带序号，
 *  状态字是底线／实底块／虚线框，连线是实线／虚线。色只是第三样。
 */
export const STEP_FLOW_CLASS = 'ilife-block-step-flow';

/** 槽位闭集（数组里带注释 ⇒ 不会被当成"形态闭集"）。 */
export const STEP_FLOW_SLOTS = [
  'head',
  'title',
  'count',
  'list',
  'step',
  'node',
  'body',
  'title-row',
  'name',
  'state',
  'time',
  'estimate',
  'actual',
  'desc',
  'note',
  'foot',
  'absent',
] as const;
export type StepFlowSlot = (typeof STEP_FLOW_SLOTS)[number];

/** 类名根。 */
export function stepFlowClass(prefix = 'ilife-'): string {
  return prefix + 'block-step-flow';
}

/** 槽类的唯一拼法。 */
export function stepFlowSlot(slot: StepFlowSlot, prefix = 'ilife-'): string {
  return stepFlowClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「竖排带说明」。 */
export const STEP_FLOW_FORMS = ['vertical'] as const;
export type StepFlowForm = (typeof STEP_FLOW_FORMS)[number];

/** 状态闭集（三步态；闭集外的值一律 `badInput`——不静默当成"未开始"）。 */
export const STEP_STATES = ['done', 'now', 'todo'] as const;
export type StepState = (typeof STEP_STATES)[number];

/** 状态字（三态各有自己的形状，见 `style.ts`；要换说法就在 `steps[].stateWord` 上覆盖）。 */
export const STEP_STATE_WORDS: Readonly<Record<StepState, string>> = Object.freeze({
  done: '已完成',
  now: '正在做',
  todo: '未开始',
});

/** 已完成那一步节点里的记号（字：它让"实心圆"这一形状带上了可读的语意）。 */
export const STEP_FLOW_MARK_DONE = '✓';

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const STEP_FLOW_MISSING = '—';

/** 一步一步。 */
export interface StepFlowStep {
  /** 这一步做什么（`备料`／`下肉煸炒`）。必填非空。 */
  readonly title: string;
  /** 三态之一。**必填**——状态是这一件的主轴，缺了它画出来就是一团没有主次的清单。 */
  readonly state: StepState;
  /** 覆盖默认状态字（`STEP_STATE_WORDS`）；不给＝用默认那三个词。 */
  readonly stateWord?: string;
  /** 估时（`估 6 分`）。 */
  readonly estimate?: string;
  /** 实耗（`实 7 分`）：已完成／当前的步才有。 */
  readonly actual?: string;
  /** 说明（可以很长；当前那一步尤其要有）。 */
  readonly description?: string;
  /** 一句强调（`比预计多用了 2 分钟`）。 */
  readonly note?: string;
  /** 强调的语气：`plain`（缺省，弱文字）／`warn`（提醒档）。 */
  readonly noteTone?: 'plain' | 'warn';
}

export interface StepFlowInput {
  /** 逐步；空数组且无 `absentLine` ⇒ 空串（与"没内容不留空块"同口径）。 */
  readonly steps: readonly StepFlowStep[];
  /** 小标题（`辣椒炒肉 · 第 3 / 5 步`）。 */
  readonly title?: string;
  /** 右侧读数（`预计还要 6 分钟`）。 */
  readonly count?: string;
  /** 脚注（`总估时 16 分`／`已用 9 分`）：串＝一句；数组＝逐段一枚。 */
  readonly foot?: string | readonly string[];
  /** 空态那一句（`这道菜还没有步骤`）——**这是"没什么"，不是一步**，所以住独立槽位、不进 `steps`。 */
  readonly absentLine?: string;
  /** 形态键（闭集，缺省 `vertical`）。 */
  readonly form?: StepFlowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
