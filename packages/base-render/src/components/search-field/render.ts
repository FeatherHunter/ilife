/** searchField · **渲染**（纯函数：一份入参 → 一段标记；零 DOM、零副作用）。
 *
 *  形态 B：范围分段（可选）→ 下划线输入行 → 读数行（命中数 ＋ 第几处 ＋ 前后跳）。
 *  渲染期**不写命中数**（写 `—`）：命中数是运行时的真读数（数出来的），渲染期不知道结果区有几条。
 *  这条是这一件的要害：计数若是渲染期编的，页面上就有一个看着像读数、其实是文案的数。
 */
import { esc } from '../shared/escape.js';
import {
  SEARCH_AT_ATTR, SEARCH_BOUND_ATTR, SEARCH_CLEAR_ATTR, SEARCH_COUNT_ATTR, SEARCH_DEFAULTS,
  SEARCH_DISABLED_ATTR, SEARCH_EMPTY_ATTR, SEARCH_ERROR_ATTR, SEARCH_FORM_ATTR, SEARCH_HIT_ATTR,
  SEARCH_INPUT_ATTR, SEARCH_INVALID_ATTR, SEARCH_LOADING_ATTR, SEARCH_LOADING_TEXT_ATTR,
  SEARCH_NAME_ATTR, SEARCH_NEXT_ATTR, SEARCH_N_ATTR, SEARCH_POS_ATTR, SEARCH_PREV_ATTR,
  SEARCH_READOUT_ATTR, SEARCH_ROOT_CLASS, SEARCH_SCOPE_ATTR, SEARCH_SCOPE_NAME_ATTR,
  SEARCH_STATUS_ATTR, SEARCH_TARGET_ATTR,
} from './attrs.js';
import { normalizeSearchField } from './model.js';
import type { SearchFieldModel } from './model.js';

/** 放大镜字形（公共层自产标记；`aria-hidden`，不参与朗读）。 */
const ICON = '<span class="' + SEARCH_ROOT_CLASS + '-ico" aria-hidden="true">⌕</span>';

/** 错态行的 id（`aria-describedby` 复用；同一页两个搜索框按机器键区分）。 */
export function searchErrorId(name: string): string {
  return 'ilife-search-err-' + name;
}

/** 范围分段：内置「全部」打头 ＋ 调用方给的档；每档都是原生 `<button>` ＋ `aria-pressed`。 */
function scopeHtml(m: SearchFieldModel): string {
  if (m.scopes.length === 0) return '';
  const c = SEARCH_ROOT_CLASS;
  const picked = m.scope === undefined ? SEARCH_DEFAULTS.scopeAll : m.scope;
  const button = (value: string, label: string, count: string | undefined): string => {
    const on = value === picked;
    return '<button type="button" class="' + c + '-scope-btn" ' + SEARCH_SCOPE_ATTR + '="' + esc(value) + '"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (m.disabled ? ' disabled' : '') + '>'
      + '<span class="' + c + '-scope-lab">' + esc(label) + '</span>'
      + '<span class="' + c + '-n" ' + SEARCH_N_ATTR + '="">' + esc(count === undefined ? SEARCH_DEFAULTS.unset : count) + '</span>'
      + '</button>';
  };
  const parts = [button(SEARCH_DEFAULTS.scopeAll, '全部', undefined)];
  for (const s of m.scopes) parts.push(button(s.value, s.label, s.count));
  return '<div class="' + c + '-scope" role="group" aria-label="搜索范围">' + parts.join('') + '</div>';
}

/** 读数行：命中数（`—`，运行时写实）＋ 当前范围 ＋ 第几处／共几处 ＋ 前后跳。
 *  真读数与载入字各占一个 `span`（同一行、原地换字）：换字时**不动**版面，也不重造计数位。 */
function readoutHtml(m: SearchFieldModel): string {
  const c = SEARCH_ROOT_CLASS;
  const picked = m.scope === undefined ? SEARCH_DEFAULTS.scopeAll : m.scope;
  const pickedLabel = m.scopes.length === 0 ? ''
    : (m.scopes.find((s) => s.value === picked) ?? { label: '全部' }).label;
  const status = '<p class="' + c + '-status" role="status" ' + SEARCH_STATUS_ATTR + '="">'
    + '<span class="' + c + '-status-text"><b ' + SEARCH_COUNT_ATTR + '="">' + SEARCH_DEFAULTS.unset + '</b> '
    + esc(m.noun) + '命中'
    + (pickedLabel === '' ? '' : '<span class="' + c + '-dim"> · 范围 <span ' + SEARCH_SCOPE_NAME_ATTR + '="">'
      + esc(pickedLabel) + '</span></span>')
    + '</span>'
    + '<span class="' + c + '-status-loading">' + esc(m.loadingText) + '</span>'
    + '</p>';
  const nav = '<span class="' + c + '-nav">'
    + '<button type="button" class="' + c + '-step" ' + SEARCH_PREV_ATTR + '="" aria-label="' + SEARCH_DEFAULTS.prevLabel + '"'
    + (m.disabled || m.loading ? ' disabled' : '') + '>‹</button>'
    + '<span class="' + c + '-pos" ' + SEARCH_POS_ATTR + '="">第 <b ' + SEARCH_AT_ATTR + '="">' + SEARCH_DEFAULTS.unset
    + '</b> ' + esc(m.noun) + ' / 共 <b ' + SEARCH_COUNT_ATTR + '="">' + SEARCH_DEFAULTS.unset + '</b> ' + esc(m.noun) + '</span>'
    + '<button type="button" class="' + c + '-step" ' + SEARCH_NEXT_ATTR + '="" aria-label="' + SEARCH_DEFAULTS.nextLabel + '"'
    + (m.disabled || m.loading ? ' disabled' : '') + '>›</button>'
    + '</span>';
  return '<div class="' + c + '-readout" ' + SEARCH_READOUT_ATTR + '="">' + status + nav + '</div>';
}

/** 渲染一个搜索框。入参不合规一律 `bad-input`（不静默降级）。 */
export function renderSearchField(input: unknown): string {
  const m = normalizeSearchField(input);
  const c = SEARCH_ROOT_CLASS;

  const rootAttrs: string[] = [
    'class="' + esc(m.extraClass === undefined ? c : c + ' ' + m.extraClass) + '"',
    SEARCH_NAME_ATTR + '="' + esc(m.name) + '"',
    SEARCH_FORM_ATTR + '="' + esc(m.form) + '"',
    SEARCH_BOUND_ATTR + '=""',
  ];
  if (m.target !== undefined) rootAttrs.push(SEARCH_TARGET_ATTR + '="' + esc(m.target) + '"');
  if (m.loading) rootAttrs.push(SEARCH_LOADING_ATTR + '="1"');
  if (m.disabled) rootAttrs.push(SEARCH_DISABLED_ATTR + '="1"');
  if (m.error !== undefined) rootAttrs.push(SEARCH_INVALID_ATTR + '="1"');

  const inputAttrs: string[] = [
    'type="search"',
    'class="' + c + '-input"',
    SEARCH_INPUT_ATTR + '=""',
    'value="' + esc(m.query) + '"',
    'aria-label="' + esc(m.label) + '"',
    'aria-describedby="' + esc(searchErrorId(m.name)) + '"',
    'autocomplete="off"',
  ];
  if (m.placeholder !== undefined) inputAttrs.push('placeholder="' + esc(m.placeholder) + '"');
  if (m.disabled) inputAttrs.push('disabled', 'aria-disabled="true"');
  if (m.error !== undefined) inputAttrs.push('aria-invalid="true"');

  const box = '<div class="' + c + '-box">' + ICON + '<input ' + inputAttrs.join(' ') + '>'
    + '<button type="button" class="' + c + '-clear" ' + SEARCH_CLEAR_ATTR + '="" aria-label="' + SEARCH_DEFAULTS.clearLabel + '"'
    + (m.disabled ? ' disabled' : '') + '>✕</button>'
    + '</div>';

  return '<div ' + rootAttrs.join(' ') + '>'
    + scopeHtml(m)
    + box
    + readoutHtml(m)
    + '<p class="' + c + '-empty" ' + SEARCH_EMPTY_ATTR + '="" hidden>' + esc(m.emptyText) + '</p>'
    + '<p class="' + c + '-err" id="' + esc(searchErrorId(m.name)) + '" ' + SEARCH_ERROR_ATTR + '="" role="alert"'
    + (m.error === undefined ? ' hidden' : '') + '>' + esc(m.error ?? '') + '</p>'
    + '</div>';
}

/** 命中词标签的开标签（`result-row` 渲染期高亮也用它——同一个记号，两个件只读这一份事实）。 */
export const SEARCH_HIT_TAG = '<mark ' + SEARCH_HIT_ATTR + '="">';
