/** number-stepper · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      猜出来的形状会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **缺值与空串是两件事**：`value: null` ＝ 缺值（写成 `—`）；`value` 缺席 ＝ 错（说不清"到底有没有数"）。
 *   3. **数字必须落在格子上**：`value`／每一枚常用值都要能从 `min` 走整数步到（`min + k × step`），
 *      否则按一次 ＋ 就会把 1.7 悄悄改成 2.0 —— 静默改数是本件最不许出现的行为。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  NUMBER_STEPPER_FORMS,
  type NumberStepperForm,
  type NumberStepperInput,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface NumberStepperModel {
  readonly form: NumberStepperForm;
  readonly name: string;
  /** 当前值；`null` ＝ 缺值（写成 `—`）。 */
  readonly value: number | null;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** 由 `step` 推出来的显示小数位（`0.5` ⇒ 1；`1` ⇒ 0；`0.25` ⇒ 2）。 */
  readonly decimals: number;
  readonly unit?: string;
  readonly label?: string;
  readonly presets: readonly number[];
  readonly caliber?: string;
  readonly error?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly loading: boolean;
  readonly extraClass?: string;
}

/** 浮点容差：`0.1 + 0.2` 这类误差不许被判成"不在格子上"，也不许悄悄放过 1e-9 级的偏移。 */
const EPS = 1e-9;

/** 必填有限数字（`string` 数字串也收，与 `shared/validate.ts` 的 `optNumeric` 同口径）。 */
function reqNumber(value: unknown, field: string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) badInput(field + ' 必须是有限数字');
    return value;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '' || !Number.isFinite(Number(s))) badInput(field + ' 必须是数字或数字串');
    return Number(s);
  }
  badInput(field + ' 必须是数字');
}

/** 可选的布尔（`undefined` 透传；给了就必须是布尔——`"1"`／`0` 这类"真值"一律拒）。 */
function optBool(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 步长的小数位：连乘 10 直到成为整数（最多 6 位，再多就不是"能加减的数"了）。 */
function decimalsOf(step: number): number {
  for (let d = 0; d <= 6; d += 1) {
    const scaled = step * Math.pow(10, d);
    if (Math.abs(scaled - Math.round(scaled)) < EPS) return d;
  }
  badInput('number-stepper: input.step 的小数位超过 6 位（这个步长没法按格子加减）：' + String(step));
}

/** 是不是从 `min` 走整数步到得了的值（容差 1e-9：只放过浮点噪声，不放过真偏移）。 */
function onGrid(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < EPS;
}

/** 一枚常用值：必须是落在 `[min, max]` 里的格上值。 */
function reqPreset(value: unknown, index: number, min: number, max: number, step: number): number {
  const field = 'number-stepper: input.presets[' + index + ']';
  const n = reqNumber(value, field);
  if (n < min - EPS || n > max + EPS) {
    badInput(field + ' 必须落在 [' + String(min) + ', ' + String(max) + '] 里：' + String(n));
  }
  if (!onGrid(n, min, step)) {
    badInput(field + ' 不在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：' + String(n));
  }
  return n;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `NumberStepperModel`，不再自己碰 `any`。 */
export function normalizeNumberStepper(input: unknown): NumberStepperModel {
  assertPlainObject(input, 'renderNumberStepper: input');
  const raw = input as NumberStepperInput & Record<string, unknown>;

  const form = raw.form === undefined ? NUMBER_STEPPER_FORMS[0] : raw.form;
  if (!(NUMBER_STEPPER_FORMS as readonly unknown[]).includes(form)) {
    badInput('number-stepper: input.form 必须是 ' + NUMBER_STEPPER_FORMS.join('／')
      + ' 之一（本件只落地形态 A「标准：加减＋常用值排」）');
  }

  const name = reqText(raw.name, 'number-stepper: input.name');
  const min = reqNumber(raw.min, 'number-stepper: input.min');
  const max = reqNumber(raw.max, 'number-stepper: input.max');
  const step = reqNumber(raw.step, 'number-stepper: input.step');
  if (step <= 0) badInput('number-stepper: input.step 必须大于 0');
  if (max <= min) badInput('number-stepper: input.max 必须大于 input.min（' + String(min) + ' ≥ ' + String(max) + '）');
  if (!onGrid(max, min, step)) {
    badInput('number-stepper: input.max 必须在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：'
      + String(max));
  }

  /* 值：`null` ＝ 缺值；缺席／非数／越界／不在格子上都是错。 */
  const given: unknown = raw.value;
  let value: number | null;
  if (given === null) {
    value = null;
  } else if (given === undefined) {
    badInput('number-stepper: input.value 必填（缺值请显式给 null）');
  } else {
    const n = reqNumber(given, 'number-stepper: input.value');
    if (n < min - EPS || n > max + EPS) {
      badInput('number-stepper: input.value 必须落在 [' + String(min) + ', ' + String(max) + '] 里：' + String(n));
    }
    if (!onGrid(n, min, step)) {
      badInput('number-stepper: input.value 不在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：'
        + String(n));
    }
    value = n;
  }

  /* 常用值：不给＝不出这一排；给了就必须是非空数组，逐枚校验，不许重复。 */
  let presets: number[] = [];
  if (raw.presets !== undefined) {
    if (!Array.isArray(raw.presets)) badInput('number-stepper: input.presets 必须是数字数组');
    presets = raw.presets.map((item, i) => reqPreset(item, i, min, max, step));
    const seen = new Set<number>();
    for (const p of presets) {
      if (seen.has(p)) badInput('number-stepper: input.presets 里有两枚一样的值：' + String(p));
      seen.add(p);
    }
  }

  const disabled = optBool(raw.disabled, 'number-stepper: input.disabled');
  const disabledReason = optText(raw.disabledReason, 'number-stepper: input.disabledReason');
  if (disabled && disabledReason === undefined) {
    /* 说不出"为什么不能动"的禁用态＝读者只能猜（形态 C 的错法：`disabled` 了一枚 −，正文却不说为何）。 */
    badInput('number-stepper: disabled=true 时必须给 disabledReason（写清为什么不能动）');
  }

  return {
    form: form as NumberStepperForm,
    name,
    value,
    min,
    max,
    step,
    decimals: decimalsOf(step),
    unit: optText(raw.unit, 'number-stepper: input.unit'),
    label: optText(raw.label, 'number-stepper: input.label'),
    presets,
    caliber: optText(raw.caliber, 'number-stepper: input.caliber'),
    error: optText(raw.error, 'number-stepper: input.error'),
    disabled,
    disabledReason,
    loading: optBool(raw.loading, 'number-stepper: input.loading'),
    extraClass: optExtraClass(raw.extraClass, 'number-stepper: input.extraClass'),
  };
}
