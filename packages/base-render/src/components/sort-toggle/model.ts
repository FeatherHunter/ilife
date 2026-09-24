/** sortToggle · **入参归一化与校验**（非法入参一律 `bad-input`）。
 *
 *  这里的两条口径：
 *   1. `views` 至少一档，`view` 必须在 `views` 里（点了没反应＝坏的中间档，不许留）；
 *   2. 排序字段名只许 `[A-Za-z][A-Za-z0-9_-]*`——它要被拼进 `data-ilife-sort-<字段>`，
 *      不校验就等于把任意属性名从入参带进标记。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { SORT_DEFAULTS, SORT_DIRECTIONS, SORT_FORMS } from './attrs.js';
import type { SortDirection, SortToggleForm, SortViewInput } from './attrs.js';

export interface SortView {
  readonly value: string;
  readonly label: string;
  readonly count?: string;
  readonly caliber: string;
  readonly field: string | undefined;
  readonly dir: SortDirection;
}

export interface SortToggleModel {
  readonly form: SortToggleForm;
  readonly name: string;
  readonly label: string;
  readonly views: readonly SortView[];
  readonly view: string;
  readonly target: string | undefined;
  readonly unit: string;
  readonly flipLabel: string;
  readonly loadingText: string;
  readonly error: string | undefined;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly extraClass: string | undefined;
}

/** 排序字段名闭集（字母开头，字母／数字／下划线／连字符）。 */
/** 排序字段名闭集（小写字母开头）：它要被拼进 `data-ilife-sort-<字段>`，而 HTML 属性名会被折成小写，
 *  收大写字母等于埋一个「看起来配上了、其实读不到」的坑。 */
const FIELD_RE = /^[a-z][a-z0-9-]*$/;

function normalizeView(raw: unknown, at: number): SortView {
  if (typeof raw === 'string') {
    if (raw === '') badInput('renderSortToggle: views[' + at + '] 不得为空串');
    return { value: raw, label: raw, caliber: '', field: undefined, dir: 'desc' };
  }
  assertPlainObject(raw, 'renderSortToggle: views[' + at + ']');
  const o = raw as SortViewInput;
  const value = reqText(o.value, 'renderSortToggle: views[' + at + '].value');
  const label = reqText(o.label, 'renderSortToggle: views[' + at + '].label');
  const caliber = optText(o.caliber, 'renderSortToggle: views[' + at + '].caliber') ?? '';
  const field = optText(o.field, 'renderSortToggle: views[' + at + '].field');
  if (field !== undefined && !FIELD_RE.test(field)) {
    badInput('renderSortToggle: views[' + at + '].field 只许小写字母开头（[a-z][a-z0-9-]*）：' + field);
  }
  const dirRaw = o.dir === undefined ? 'desc' : o.dir;
  if (!(SORT_DIRECTIONS as readonly string[]).includes(dirRaw as string)) {
    badInput('renderSortToggle: views[' + at + '].dir 只许 ' + SORT_DIRECTIONS.join('／') + '：' + String(o.dir));
  }
  if (o.count === undefined) return { value, label, caliber, field, dir: dirRaw as SortDirection };
  if (typeof o.count === 'number') {
    if (!Number.isFinite(o.count)) badInput('renderSortToggle: views[' + at + '].count 必须是有限数字');
    return { value, label, count: String(o.count), caliber, field, dir: dirRaw as SortDirection };
  }
  if (typeof o.count === 'string' && o.count !== '') {
    return { value, label, count: o.count, caliber, field, dir: dirRaw as SortDirection };
  }
  badInput('renderSortToggle: views[' + at + '].count 必须是非空字符串或有限数字');
}

/** 归一 ＋ 校验。 */
export function normalizeSortToggle(raw: unknown): SortToggleModel {
  assertPlainObject(raw, 'renderSortToggle: input');
  const input = raw as SortToggleInputShape;

  const name = reqText(input.name, 'renderSortToggle: input.name');
  if (input.form !== undefined && !(SORT_FORMS as readonly string[]).includes(String(input.form))) {
    badInput('renderSortToggle: 形态闭集只有 ' + SORT_FORMS.join('／') + '：' + String(input.form));
  }
  if (!Array.isArray(input.views) || (input.views as unknown[]).length === 0) {
    badInput('renderSortToggle: input.views 必须是非空数组');
  }
  const views = (input.views as unknown[]).map((v, i) => normalizeView(v, i));
  const known = new Set<string>();
  for (const v of views) {
    if (known.has(v.value)) badInput('renderSortToggle: views 的机器值重复：' + v.value);
    known.add(v.value);
  }
  const view = optText(input.view, 'renderSortToggle: input.view') ?? views[0]!.value;
  if (!known.has(view)) badInput('renderSortToggle: input.view 不在 views 里：' + view);

  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    badInput('renderSortToggle: input.disabled 必须是布尔');
  }
  if (input.loading !== undefined && typeof input.loading !== 'boolean') {
    badInput('renderSortToggle: input.loading 必须是布尔');
  }

  return Object.freeze({
    form: 'C' as SortToggleForm,
    name,
    label: optText(input.label, 'renderSortToggle: input.label') ?? SORT_DEFAULTS.label,
    views: Object.freeze(views),
    view,
    target: optText(input.target, 'renderSortToggle: input.target'),
    unit: optText(input.unit, 'renderSortToggle: input.unit') ?? '',
    flipLabel: optText(input.flipLabel, 'renderSortToggle: input.flipLabel') ?? SORT_DEFAULTS.flipLabel,
    loadingText: optText(input.loadingText, 'renderSortToggle: input.loadingText') ?? SORT_DEFAULTS.loadingText,
    error: optText(input.error, 'renderSortToggle: input.error'),
    loading: input.loading === true,
    disabled: input.disabled === true,
    extraClass: optExtraClass(input.extraClass, 'renderSortToggle: input.extraClass'),
  });
}

interface SortToggleInputShape {
  readonly form?: unknown;
  readonly name?: unknown;
  readonly label?: unknown;
  readonly views?: unknown;
  readonly view?: unknown;
  readonly target?: unknown;
  readonly unit?: unknown;
  readonly flipLabel?: unknown;
  readonly loadingText?: unknown;
  readonly error?: unknown;
  readonly loading?: unknown;
  readonly disabled?: unknown;
  readonly extraClass?: unknown;
}
