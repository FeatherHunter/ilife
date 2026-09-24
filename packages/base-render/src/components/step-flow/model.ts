/** step-flow · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：状态给错若不报，
 *      "正在做的那一步"会被画成"未开始"，整条步骤条就废了；
 *   2. **同一条步骤条里同时只能有一个"当前步"**（两个 `now` 会让读者不知道现在该做哪一步）；
 *   3. 归一化只做**形状**：估时／实耗／时分换算**归调用方**（本件只收"已经是给人看的样子"的串）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  STEP_FLOW_FORMS,
  STEP_STATES,
  type StepFlowForm,
  type StepFlowStep,
  type StepState,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface StepFlowModel {
  readonly form: StepFlowForm;
  readonly title?: string;
  readonly count?: string;
  readonly steps: readonly NormalizedStep[];
  readonly foot: readonly string[];
  readonly absentLine?: string;
  readonly extraClass?: string;
}

export interface NormalizedStep {
  readonly title: string;
  readonly state: StepState;
  readonly stateWord?: string;
  readonly estimate?: string;
  readonly actual?: string;
  readonly description?: string;
  readonly note?: string;
  readonly noteTone: 'plain' | 'warn';
}

/** 串或串数组 → 段数组（`''` 与 `[]` 都按"不出这一段"处理）。 */
function textList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], field + '[' + i + ']'));
  return out;
}

function stepOf(raw: unknown, field: string): NormalizedStep {
  assertPlainObject(raw, field);
  const step = raw as StepFlowStep;
  if (!(STEP_STATES as readonly unknown[]).includes(step.state)) {
    badInput(field + '.state 必须是 ' + STEP_STATES.join('／') + ' 之一，收到：' + String(step.state));
  }
  const tone = step.noteTone;
  if (tone !== undefined && tone !== 'plain' && tone !== 'warn') {
    badInput(field + '.noteTone 只许 plain／warn：' + String(tone));
  }
  return {
    title: reqText(step.title, field + '.title'),
    state: step.state as StepState,
    stateWord: optText(step.stateWord, field + '.stateWord'),
    estimate: optText(step.estimate, field + '.estimate'),
    actual: optText(step.actual, field + '.actual'),
    description: optText(step.description, field + '.description'),
    note: optText(step.note, field + '.note'),
    noteTone: tone === undefined ? 'plain' : tone,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `StepFlowModel`。 */
export function normalizeStepFlow(input: unknown): StepFlowModel {
  assertPlainObject(input, 'renderStepFlow: input');
  const raw = input as Record<string, unknown>;
  const form = raw.form === undefined ? STEP_FLOW_FORMS[0] : raw.form;
  if (!(STEP_FLOW_FORMS as readonly unknown[]).includes(form)) {
    badInput('step-flow: input.form 必须是 ' + STEP_FLOW_FORMS.join('／') + ' 之一（本件只落地形态 A「竖排带说明」）');
  }
  if (!Array.isArray(raw.steps)) badInput('step-flow: input.steps 必须是数组');
  const steps: NormalizedStep[] = [];
  let now = -1;
  for (let i = 0; i < raw.steps.length; i += 1) {
    const step = stepOf(raw.steps[i], 'step-flow: input.steps[' + i + ']');
    if (step.state === 'now') {
      if (now >= 0) badInput('step-flow: 同时只能有一个"当前步"（第 ' + now + ' 步与第 ' + i + ' 步都标了 now）');
      now = i;
    }
    steps.push(step);
  }
  return {
    form: form as StepFlowForm,
    title: optText(raw.title, 'step-flow: input.title'),
    count: optText(raw.count, 'step-flow: input.count'),
    steps,
    foot: textList(raw.foot, 'step-flow: input.foot'),
    absentLine: optText(raw.absentLine, 'step-flow: input.absentLine'),
    extraClass: optExtraClass(raw.extraClass, 'step-flow: input.extraClass'),
  };
}
