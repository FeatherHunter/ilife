/** timer-card · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：时长给错若不报，
 *      卡上会显示一个永远不动的钟；
 *   2. **时长是这一件唯一"真算"的东西**（要倒计时），所以它必须是有限数；
 *      "还剩多少"由 `total - elapsed` 现算，而 `elapsed` 不许超过 `total`；
 *   3. 状态与时长要对得上：`totalSeconds = 0`（还没设时长）时只许 `idle`。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  TIMER_CARD_FORMS,
  TIMER_STATES,
  type TimerCardForm,
  type TimerCardInput,
  type TimerState,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface TimerCardModel {
  readonly form: TimerCardForm;
  readonly key: string;
  readonly title: string;
  readonly totalSeconds: number;
  readonly elapsedSeconds: number;
  readonly state: TimerState;
  readonly hint?: string;
  readonly error?: string;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly absentLine?: string;
  readonly extraClass?: string;
}

/** 必须是非负有限数（秒）。 */
function seconds(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    badInput(field + ' 必须是 ≥0 的有限数（秒），收到：' + String(value));
  }
  return value as number;
}

/** 可选布尔：给了必须是布尔。 */
function optFlag(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `TimerCardModel`。 */
export function normalizeTimerCard(input: unknown): TimerCardModel {
  assertPlainObject(input, 'renderTimerCard: input');
  const raw = input as TimerCardInput;
  const form = raw.form === undefined ? TIMER_CARD_FORMS[0] : raw.form;
  if (!(TIMER_CARD_FORMS as readonly unknown[]).includes(form)) {
    badInput('timer-card: input.form 必须是 ' + TIMER_CARD_FORMS.join('／') + ' 之一（本件只落地形态 A「卡式大数字」）');
  }
  const total = seconds(raw.totalSeconds, 'timer-card: input.totalSeconds');
  const elapsed = raw.elapsedSeconds === undefined
    ? 0
    : seconds(raw.elapsedSeconds, 'timer-card: input.elapsedSeconds');
  if (elapsed > total) {
    badInput('timer-card: input.elapsedSeconds 不得大于 totalSeconds（' + elapsed + ' > ' + total + '）');
  }
  const state: TimerState = raw.state === undefined ? 'idle' : raw.state;
  if (!(TIMER_STATES as readonly unknown[]).includes(state)) {
    badInput('timer-card: input.state 必须是 ' + TIMER_STATES.join('／') + ' 之一，收到：' + String(raw.state));
  }
  if (total === 0 && state !== 'idle') {
    badInput('timer-card: totalSeconds 为 0（还没设时长）时 state 只能是 idle，收到：' + state);
  }
  return {
    form: form as TimerCardForm,
    key: reqText(raw.key, 'timer-card: input.key'),
    title: reqText(raw.title, 'timer-card: input.title'),
    totalSeconds: total,
    elapsedSeconds: elapsed,
    state,
    hint: optText(raw.hint, 'timer-card: input.hint'),
    error: optText(raw.error, 'timer-card: input.error'),
    loading: optFlag(raw.loading, 'timer-card: input.loading', false),
    disabled: optFlag(raw.disabled, 'timer-card: input.disabled', false),
    absentLine: optText(raw.absentLine, 'timer-card: input.absentLine'),
    extraClass: optExtraClass(raw.extraClass, 'timer-card: input.extraClass'),
  };
}
