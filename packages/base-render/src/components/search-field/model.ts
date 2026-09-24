/** searchField · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外）。
 *
 *  口径（与 `editable-value/model` 一族同）：**不静默降级**——非法入参一律 `badInput()` 抛 `BlocksError`。
 *  静默降级最坏的后果是调用方以为自己拿到了过滤（"范围分段没生效只是没显示"），
 *  而页面上没人能看出这件事。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { SEARCH_DEFAULTS, SEARCH_FORMS } from './attrs.js';
import type { SearchFieldForm, SearchScopeInput } from './attrs.js';

/** 归一后的范围档：`count` 一律是串（渲染期只上屏，不做算术）。 */
export interface SearchScope {
  readonly value: string;
  readonly label: string;
  readonly count?: string;
}

export interface SearchFieldModel {
  readonly form: SearchFieldForm;
  readonly name: string;
  readonly label: string;
  readonly placeholder: string | undefined;
  readonly query: string;
  readonly scopes: readonly SearchScope[];
  readonly scope: string | undefined;
  readonly target: string | undefined;
  readonly noun: string;
  readonly emptyText: string;
  readonly loadingText: string;
  readonly error: string | undefined;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly extraClass: string | undefined;
}

/** 范围档：字符串项＝机器值与上屏字同值；对象项＝`value` 走机器值、`label` 走上屏字。 */
function normalizeScope(raw: unknown, at: number): SearchScope {
  if (typeof raw === 'string') {
    if (raw === '') badInput('renderSearchField: scopes[' + at + '] 不得为空串');
    return { value: raw, label: raw };
  }
  assertPlainObject(raw, 'renderSearchField: scopes[' + at + ']');
  const o = raw as SearchScopeInput;
  const value = reqText(o.value, 'renderSearchField: scopes[' + at + '].value');
  const label = reqText(o.label, 'renderSearchField: scopes[' + at + '].label');
  if (o.count === undefined) return { value, label };
  if (typeof o.count === 'number') {
    if (!Number.isFinite(o.count)) badInput('renderSearchField: scopes[' + at + '].count 必须是有限数字');
    return { value, label, count: String(o.count) };
  }
  if (typeof o.count === 'string' && o.count !== '') return { value, label, count: o.count };
  badInput('renderSearchField: scopes[' + at + '].count 必须是非空字符串或有限数字');
}

/** 归一 ＋ 校验。任何一条不成立都当场抛 `BlocksError`。 */
export function normalizeSearchField(raw: unknown): SearchFieldModel {
  assertPlainObject(raw, 'renderSearchField: input');
  const input = raw as SearchFieldInputShape;

  const name = reqText(input.name, 'renderSearchField: input.name');
  if (input.query !== undefined && typeof input.query !== 'string') {
    badInput('renderSearchField: input.query 必须是字符串');
  }
  const query = input.query === undefined ? '' : input.query;

  const rawScopes: unknown = input.scopes;
  if (rawScopes !== undefined && !Array.isArray(rawScopes)) {
    badInput('renderSearchField: input.scopes 必须是数组');
  }
  const scopes: SearchScope[] = Array.isArray(rawScopes)
    ? rawScopes.map((item, i) => normalizeScope(item, i)) : [];
  if (scopes.length === 1) {
    badInput('renderSearchField: input.scopes 要么不给，要么至少两档（一档不成分段）');
  }
  const seen = new Set<string>();
  for (const s of scopes) {
    if (seen.has(s.value)) badInput('renderSearchField: scopes 的机器值重复：' + s.value);
    seen.add(s.value);
  }
  if (scopes.length > 0 && scopes[0] !== undefined && scopes[0].value === SEARCH_DEFAULTS.scopeAll) {
    badInput('renderSearchField: 「' + SEARCH_DEFAULTS.scopeAll + '」是内置的不过滤档，scopes 里不必再给一遍');
  }

  const scope = optText(input.scope, 'renderSearchField: input.scope');
  if (scope !== undefined && scopes.length === 0) {
    badInput('renderSearchField: 没给 scopes 时 input.scope 无处可落');
  }
  if (scope !== undefined && scope !== SEARCH_DEFAULTS.scopeAll && !seen.has(scope)) {
    badInput('renderSearchField: input.scope 不在 scopes 里：' + scope);
  }

  const form: SearchFieldForm = 'B';
  if (input.form !== undefined && !(SEARCH_FORMS as readonly string[]).includes(String(input.form))) {
    badInput('renderSearchField: 形态闭集只有 ' + SEARCH_FORMS.join('／') + '：' + String(input.form));
  }
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    badInput('renderSearchField: input.disabled 必须是布尔');
  }
  if (input.loading !== undefined && typeof input.loading !== 'boolean') {
    badInput('renderSearchField: input.loading 必须是布尔');
  }

  return Object.freeze({
    form,
    name,
    label: optText(input.label, 'renderSearchField: input.label') ?? SEARCH_DEFAULTS.label,
    placeholder: optText(input.placeholder, 'renderSearchField: input.placeholder'),
    query,
    scopes: Object.freeze(scopes),
    scope,
    target: optText(input.target, 'renderSearchField: input.target'),
    noun: optText(input.noun, 'renderSearchField: input.noun') ?? SEARCH_DEFAULTS.noun,
    emptyText: optText(input.emptyText, 'renderSearchField: input.emptyText') ?? SEARCH_DEFAULTS.emptyText,
    loadingText: optText(input.loadingText, 'renderSearchField: input.loadingText') ?? SEARCH_DEFAULTS.loadingText,
    error: optText(input.error, 'renderSearchField: input.error'),
    loading: input.loading === true,
    disabled: input.disabled === true,
    extraClass: optExtraClass(input.extraClass, 'renderSearchField: input.extraClass'),
  });
}

/** 入参面（校验前的形状）。`as` 只在这里用一次，往后全是归一类型。 */
interface SearchFieldInputShape {
  readonly name?: unknown;
  readonly label?: unknown;
  readonly placeholder?: unknown;
  readonly query?: unknown;
  readonly scopes?: unknown;
  readonly scope?: unknown;
  readonly target?: unknown;
  readonly noun?: unknown;
  readonly emptyText?: unknown;
  readonly loadingText?: unknown;
  readonly error?: unknown;
  readonly loading?: unknown;
  readonly disabled?: unknown;
  readonly extraClass?: unknown;
  readonly form?: unknown;
}
