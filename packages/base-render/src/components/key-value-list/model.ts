/** key-value-list · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head`／`section-head` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. 必填缺、类型错、闭集外各点各的名（报错文案里带字段路径，逐行带下标）；
 *   3. 归一化只做「形状」：取整、千分位、单位口径**归调用方**——本件只收「已经是给人看的样子」的串。
 *
 *  **缺值写成 `—`**（`KEY_VALUE_MISSING`）：空串不是缺值，是错——它说不清「这一项到底有没有值」。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  KEY_VALUE_FORMS,
  type KeyValueForm,
  type KeyValueRow,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」）。 */
export interface KeyValueModel {
  readonly form: KeyValueForm;
  readonly heading?: string;
  readonly rows: readonly {
    readonly label: string;
    readonly value: string;
    readonly note?: string;
    readonly num: boolean;
  }[];
  readonly extraClass?: string;
}

/** 一行：`label`／`value` 必填非空；`note` 可省；`num` 是布尔开关。 */
function normalizeRow(value: unknown, index: number): KeyValueModel['rows'][number] {
  const at = 'key-value-list: input.rows[' + String(index) + ']';
  assertPlainObject(value, at);
  const raw = value as KeyValueRow;

  const shown = reqText(raw.value, at + '.value');
  if (shown.trim() === '') badInput(at + '.value 不许全是空白');

  const num: unknown = raw.num;
  if (num !== undefined && typeof num !== 'boolean') badInput(at + '.num 必须是布尔值');

  return {
    label: reqText(raw.label, at + '.label'),
    value: shown,
    note: optText(raw.note, at + '.note'),
    num: num === true,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `KeyValueModel`，不再自己碰 `any`。 */
export function normalizeKeyValueList(input: unknown): KeyValueModel {
  assertPlainObject(input, 'renderKeyValueList: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? KEY_VALUE_FORMS[0] : raw.form;
  if (!(KEY_VALUE_FORMS as readonly unknown[]).includes(form)) {
    badInput('key-value-list: input.form 必须是 ' + KEY_VALUE_FORMS.join('／')
      + ' 之一（本件只落地形态 A「档案行」）');
  }

  const list: unknown = raw.rows;
  if (!Array.isArray(list)) badInput('key-value-list: input.rows 必须是数组');
  const rows = list.map((row, i) => normalizeRow(row, i));

  return {
    form: form as KeyValueForm,
    heading: optText(raw.heading, 'key-value-list: input.heading'),
    rows,
    extraClass: optExtraClass(raw.extraClass, 'key-value-list: input.extraClass'),
  };
}
