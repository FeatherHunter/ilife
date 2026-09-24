/** slider-row · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `number-stepper` 同一条地板，两件都做"数字控件"就该有一份一样的规矩）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"；
 *   2. **未设置与缺席是两件事**：`value: null` ＝ 未设置（写成 `—`）；`value` 缺席 ＝ 错；
 *   3. **数字必须落在格子上**：`value`／`max`／每一枚常用档都要能从 `min` 走整数步到，
 *      否则拖动一次就会把 1.7 悄悄吸附成 2.0（而右侧那个大数字还写着 1.7）——静默改数不许出现。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { SLIDER_ROW_FORMS, type SliderRowForm, type SliderRowInput } from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface SliderRowModel {
  readonly form: SliderRowForm;
  readonly name: string;
  readonly value: number | null;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly decimals: number;
  /** 已填比例（千分之一为单位：`333` ＝ 33.3%）——固定点数，判据能逐值对账，不受浮点打印影响。 */
  readonly fillPermille: number;
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

/** 浮点容差（只放过浮点噪声，不放过真偏移）。 */
const EPS = 1e-9;

/** 必填有限数字（数字串也收，与 `shared/validate.ts` 的 `optNumeric` 同口径）。 */
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

/** 可选的布尔（给了就必须是布尔）。 */
function optBool(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 步长的小数位（最多 6 位）。 */
function decimalsOf(step: number): number {
  for (let d = 0; d <= 6; d += 1) {
    const scaled = step * Math.pow(10, d);
    if (Math.abs(scaled - Math.round(scaled)) < EPS) return d;
  }
  badInput('slider-row: input.step 的小数位超过 6 位（这个步长没法按格子吸附）：' + String(step));
}

/** 是不是从 `min` 走整数步到得了的值。 */
function onGrid(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < EPS;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SliderRowModel`。 */
export function normalizeSliderRow(input: unknown): SliderRowModel {
  assertPlainObject(input, 'renderSliderRow: input');
  const raw = input as SliderRowInput & Record<string, unknown>;

  const form = raw.form === undefined ? SLIDER_ROW_FORMS[0] : raw.form;
  if (!(SLIDER_ROW_FORMS as readonly unknown[]).includes(form)) {
    badInput('slider-row: input.form 必须是 ' + SLIDER_ROW_FORMS.join('／') + ' 之一（本件只落地形态 A「滑块＋常用档」）');
  }

  const name = reqText(raw.name, 'slider-row: input.name');
  const min = reqNumber(raw.min, 'slider-row: input.min');
  const max = reqNumber(raw.max, 'slider-row: input.max');
  const step = reqNumber(raw.step, 'slider-row: input.step');
  if (step <= 0) badInput('slider-row: input.step 必须大于 0');
  if (max <= min) badInput('slider-row: input.max 必须大于 input.min（' + String(min) + ' ≥ ' + String(max) + '）');
  if (!onGrid(max, min, step)) {
    badInput('slider-row: input.max 必须在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：' + String(max));
  }

  /* 值：`null` ＝ 未设置；缺席／非数／越界／不在格子上都是错。 */
  const given: unknown = raw.value;
  let value: number | null;
  if (given === null) {
    value = null;
  } else if (given === undefined) {
    badInput('slider-row: input.value 必填（未设置请显式给 null）');
  } else {
    const n = reqNumber(given, 'slider-row: input.value');
    if (n < min - EPS || n > max + EPS) {
      badInput('slider-row: input.value 必须落在 [' + String(min) + ', ' + String(max) + '] 里：' + String(n));
    }
    if (!onGrid(n, min, step)) {
      badInput('slider-row: input.value 不在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：' + String(n));
    }
    value = n;
  }

  /* 常用档：不给＝不出这一排；给了就必须是非空数组，逐枚校验，不许重复。 */
  let presets: number[] = [];
  if (raw.presets !== undefined) {
    if (!Array.isArray(raw.presets)) badInput('slider-row: input.presets 必须是数字数组');
    presets = raw.presets.map((item, i) => {
      const field = 'slider-row: input.presets[' + String(i) + ']';
      const n = reqNumber(item, field);
      if (n < min - EPS || n > max + EPS) {
        badInput(field + ' 必须落在 [' + String(min) + ', ' + String(max) + '] 里：' + String(n));
      }
      if (!onGrid(n, min, step)) {
        badInput(field + ' 不在步长格子上（' + String(min) + ' ＋ k × ' + String(step) + '）：' + String(n));
      }
      return n;
    });
    const seen = new Set<number>();
    for (const p of presets) {
      if (seen.has(p)) badInput('slider-row: input.presets 里有两枚一样的值：' + String(p));
      seen.add(p);
    }
  }

  const disabled = optBool(raw.disabled, 'slider-row: input.disabled');
  const disabledReason = optText(raw.disabledReason, 'slider-row: input.disabledReason');
  if (disabled && disabledReason === undefined) {
    badInput('slider-row: disabled=true 时必须给 disabledReason（说不出为什么不能拖＝读者只能猜）');
  }

  const fillPermille = value === null ? 0 : Math.round(((value - min) / (max - min)) * 1000);

  return {
    form: form as SliderRowForm,
    name,
    value,
    min,
    max,
    step,
    decimals: decimalsOf(step),
    fillPermille,
    unit: optText(raw.unit, 'slider-row: input.unit'),
    label: optText(raw.label, 'slider-row: input.label'),
    presets,
    caliber: optText(raw.caliber, 'slider-row: input.caliber'),
    error: optText(raw.error, 'slider-row: input.error'),
    disabled,
    disabledReason,
    loading: optBool(raw.loading, 'slider-row: input.loading'),
    extraClass: optExtraClass(raw.extraClass, 'slider-row: input.extraClass'),
  };
}
