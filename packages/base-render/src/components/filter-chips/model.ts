/** filterChips · **入参归一化与校验**（非法入参一律 `bad-input`，不静默降级）。
 *
 *  这里最重要的一条：`selected` 里的每个值**必须在 `options` 里**。
 *  静默丢掉一个不认识的值，页面上就是「点了没反应」——调用方还以为筛了。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { CHIPS_DEFAULTS, CHIPS_FORMS } from './attrs.js';
import type { FilterChipOption, FilterChipsForm } from './attrs.js';

export interface ChipOption {
  readonly value: string;
  readonly label: string;
  readonly count?: string;
  readonly common: boolean;
}

export interface FilterChipsModel {
  readonly form: FilterChipsForm;
  readonly name: string;
  readonly label: string;
  readonly commonLabel: string;
  readonly moreLabel: string;
  readonly moreOpen: boolean;
  readonly options: readonly ChipOption[];
  readonly selected: readonly string[];
  readonly target: string | undefined;
  readonly clearLabel: string;
  readonly pickedUnit: string;
  readonly rowsUnit: string;
  readonly emptyText: string;
  readonly loadingText: string;
  readonly error: string | undefined;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly extraClass: string | undefined;
}

function normalizeOption(raw: unknown, at: number): ChipOption {
  if (typeof raw === 'string') {
    if (raw === '') badInput('renderFilterChips: options[' + at + '] 不得为空串');
    return { value: raw, label: raw, common: false };
  }
  assertPlainObject(raw, 'renderFilterChips: options[' + at + ']');
  const o = raw as FilterChipOption;
  const value = reqText(o.value, 'renderFilterChips: options[' + at + '].value');
  const label = reqText(o.label, 'renderFilterChips: options[' + at + '].label');
  if (o.common !== undefined && typeof o.common !== 'boolean') {
    badInput('renderFilterChips: options[' + at + '].common 必须是布尔');
  }
  if (o.count === undefined) return { value, label, common: o.common === true };
  if (typeof o.count === 'number') {
    if (!Number.isFinite(o.count)) badInput('renderFilterChips: options[' + at + '].count 必须是有限数字');
    return { value, label, count: String(o.count), common: o.common === true };
  }
  if (typeof o.count === 'string' && o.count !== '') return { value, label, count: o.count, common: o.common === true };
  badInput('renderFilterChips: options[' + at + '].count 必须是非空字符串或有限数字');
}

/** 归一 ＋ 校验。 */
export function normalizeFilterChips(raw: unknown): FilterChipsModel {
  assertPlainObject(raw, 'renderFilterChips: input');
  const input = raw as FilterChipsInputShape;

  const name = reqText(input.name, 'renderFilterChips: input.name');
  if (input.form !== undefined && !(CHIPS_FORMS as readonly string[]).includes(String(input.form))) {
    badInput('renderFilterChips: 形态闭集只有 ' + CHIPS_FORMS.join('／') + '：' + String(input.form));
  }
  if (!Array.isArray(input.options)) badInput('renderFilterChips: input.options 必须是数组（可以是空数组）');
  const options = (input.options as unknown[]).map((o, i) => normalizeOption(o, i));
  const known = new Set<string>();
  for (const o of options) {
    if (known.has(o.value)) badInput('renderFilterChips: options 的机器值重复：' + o.value);
    known.add(o.value);
  }

  const rawSelected: unknown = input.selected;
  if (rawSelected !== undefined && !Array.isArray(rawSelected)) {
    badInput('renderFilterChips: input.selected 必须是数组');
  }
  const selected: string[] = [];
  for (const v of Array.isArray(rawSelected) ? rawSelected : []) {
    const value = reqText(v, 'renderFilterChips: input.selected 的每一项');
    if (!known.has(value)) badInput('renderFilterChips: input.selected 里有 options 外的值：' + value);
    if (selected.includes(value)) badInput('renderFilterChips: input.selected 重复：' + value);
    selected.push(value);
  }

  if (input.moreOpen !== undefined && typeof input.moreOpen !== 'boolean') {
    badInput('renderFilterChips: input.moreOpen 必须是布尔');
  }
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    badInput('renderFilterChips: input.disabled 必须是布尔');
  }
  if (input.loading !== undefined && typeof input.loading !== 'boolean') {
    badInput('renderFilterChips: input.loading 必须是布尔');
  }

  return Object.freeze({
    form: 'A' as FilterChipsForm,
    name,
    label: optText(input.label, 'renderFilterChips: input.label') ?? CHIPS_DEFAULTS.label,
    commonLabel: optText(input.commonLabel, 'renderFilterChips: input.commonLabel') ?? CHIPS_DEFAULTS.commonLabel,
    moreLabel: optText(input.moreLabel, 'renderFilterChips: input.moreLabel') ?? CHIPS_DEFAULTS.moreLabel,
    moreOpen: input.moreOpen !== false,
    options: Object.freeze(options),
    selected: Object.freeze(selected),
    target: optText(input.target, 'renderFilterChips: input.target'),
    clearLabel: optText(input.clearLabel, 'renderFilterChips: input.clearLabel') ?? CHIPS_DEFAULTS.clearLabel,
    pickedUnit: optText(input.pickedUnit, 'renderFilterChips: input.pickedUnit') ?? CHIPS_DEFAULTS.pickedUnit,
    rowsUnit: optText(input.rowsUnit, 'renderFilterChips: input.rowsUnit') ?? CHIPS_DEFAULTS.rowsUnit,
    emptyText: optText(input.emptyText, 'renderFilterChips: input.emptyText') ?? CHIPS_DEFAULTS.emptyText,
    loadingText: optText(input.loadingText, 'renderFilterChips: input.loadingText') ?? CHIPS_DEFAULTS.loadingText,
    error: optText(input.error, 'renderFilterChips: input.error'),
    loading: input.loading === true,
    disabled: input.disabled === true,
    extraClass: optExtraClass(input.extraClass, 'renderFilterChips: input.extraClass'),
  });
}

interface FilterChipsInputShape {
  readonly form?: unknown;
  readonly name?: unknown;
  readonly label?: unknown;
  readonly commonLabel?: unknown;
  readonly moreLabel?: unknown;
  readonly moreOpen?: unknown;
  readonly options?: unknown;
  readonly selected?: unknown;
  readonly target?: unknown;
  readonly clearLabel?: unknown;
  readonly pickedUnit?: unknown;
  readonly rowsUnit?: unknown;
  readonly emptyText?: unknown;
  readonly loadingText?: unknown;
  readonly error?: unknown;
  readonly loading?: unknown;
  readonly disabled?: unknown;
  readonly extraClass?: unknown;
}
