/** switch-row · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  这一件（重做件）的校验口径比别人严两条，都是有理由的：
 *   · **`note` 必填**：说明句要写清"打开会怎样"。原型墙里这一件丢分正是"开关旁边只有名字"；
 *     没有后果说明的开关，读者只能一个个试出来；
 *   · **`checked` 必填且必须是布尔**：开关没有"未设置"这种中间档——说不出开还是关，屏上就只该有一枚叉。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { SWITCH_ROW_FORMS, type SwitchRowForm, type SwitchRowInput } from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface SwitchRowModel {
  readonly form: SwitchRowForm;
  readonly name: string;
  readonly checked: boolean;
  readonly label: string;
  readonly note: string;
  readonly caliber?: string;
  readonly error?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly loading: boolean;
  readonly extraClass?: string;
}

/** 可选的布尔（给了就必须是布尔——`"1"`／`1` 这类"真值"一律拒：开关的语义只有两个值）。 */
function optBool(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SwitchRowModel`。 */
export function normalizeSwitchRow(input: unknown): SwitchRowModel {
  assertPlainObject(input, 'renderSwitchRow: input');
  const raw = input as SwitchRowInput & Record<string, unknown>;

  const form = raw.form === undefined ? SWITCH_ROW_FORMS[0] : raw.form;
  if (!(SWITCH_ROW_FORMS as readonly unknown[]).includes(form)) {
    badInput('switch-row: input.form 必须是 ' + SWITCH_ROW_FORMS.join('／') + ' 之一（本件只落地形态「设置页的一行」）');
  }

  const name = reqText(raw.name, 'switch-row: input.name');
  const label = reqText(raw.label, 'switch-row: input.label');
  const note = reqText(raw.note, 'switch-row: input.note（说明句要写清「打开会怎样」）');
  if (typeof raw.checked !== 'boolean') {
    badInput('switch-row: input.checked 必填且必须是布尔（开关没有"未设置"这一档：说不出开还是关就别上屏）');
  }

  const disabled = optBool(raw.disabled, 'switch-row: input.disabled');
  const disabledReason = optText(raw.disabledReason, 'switch-row: input.disabledReason');
  if (disabled && disabledReason === undefined) {
    badInput('switch-row: disabled=true 时必须给 disabledReason（写清为什么不能开）');
  }

  return {
    form: form as SwitchRowForm,
    name,
    checked: raw.checked,
    label,
    note,
    caliber: optText(raw.caliber, 'switch-row: input.caliber'),
    error: optText(raw.error, 'switch-row: input.error'),
    disabled,
    disabledReason,
    loading: optBool(raw.loading, 'switch-row: input.loading'),
    extraClass: optExtraClass(raw.extraClass, 'switch-row: input.extraClass'),
  };
}
