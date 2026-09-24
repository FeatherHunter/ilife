/** stat-inline · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与同族其余件同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. 必填缺、类型错、闭集外各点各的名（报错文案里带字段路径，逐项带下标）；
 *   3. 归一化只做「形状」：取整、千分位、单位口径**归调用方**——本件只收「已经是给人看的样子」的串。
 *
 *  **缺值写成 `—`**（`STAT_INLINE_MISSING`）：空串不是缺值，是错（说不出「这一项到底有没有数」）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  STAT_INLINE_FORMS,
  type StatInlineForm,
  type StatInlineItem,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」）。 */
export interface StatInlineModel {
  readonly form: StatInlineForm;
  readonly interpunct: boolean;
  readonly items: readonly {
    readonly value: string;
    readonly label?: string;
    readonly unit?: string;
  }[];
  readonly extraClass?: string;
}

/** 一项：`value` 必填非空（且不许全是空白）；`label`／`unit` 可省。 */
function normalizeItem(value: unknown, index: number): StatInlineModel['items'][number] {
  const at = 'stat-inline: input.items[' + String(index) + ']';
  assertPlainObject(value, at);
  const raw = value as StatInlineItem;

  const shown = reqText(raw.value, at + '.value');
  if (shown.trim() === '') badInput(at + '.value 不许全是空白');

  return {
    value: shown,
    label: optText(raw.label, at + '.label'),
    unit: optText(raw.unit, at + '.unit'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `StatInlineModel`，不再自己碰 `any`。 */
export function normalizeStatInline(input: unknown): StatInlineModel {
  assertPlainObject(input, 'renderStatInline: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? STAT_INLINE_FORMS[0] : raw.form;
  if (!(STAT_INLINE_FORMS as readonly unknown[]).includes(form)) {
    badInput('stat-inline: input.form 必须是 ' + STAT_INLINE_FORMS.join('／')
      + ' 之一（本件只落地形态 A「分隔点行内串」）');
  }

  const interpunct: unknown = raw.interpunct;
  if (interpunct !== undefined && typeof interpunct !== 'boolean') {
    badInput('stat-inline: input.interpunct 必须是布尔值');
  }

  const list: unknown = raw.items;
  if (!Array.isArray(list)) badInput('stat-inline: input.items 必须是数组');
  const items = list.map((item, i) => normalizeItem(item, i));

  return {
    form: form as StatInlineForm,
    interpunct: interpunct !== false,
    items,
    extraClass: optExtraClass(raw.extraClass, 'stat-inline: input.extraClass'),
  };
}
