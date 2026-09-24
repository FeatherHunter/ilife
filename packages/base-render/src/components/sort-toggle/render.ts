/** sortToggle · **渲染**（纯函数：一份入参 → 一段标记；零 DOM、零副作用）。
 *
 *  形态 C：视图条（每档带自己的条数）→ 口径句 → 脚（反向键 ＋ 当前视图里几条）。
 *  条数与「几条」渲染期只写初值或 `—`：真数由运行时段按页面上的条目算。
 */
import { esc } from '../shared/escape.js';
import {
  SORT_BOUND_ATTR, SORT_CALIBER_ATTR, SORT_CALIBER_LINE_ATTR, SORT_CALIBER_TEXT_ATTR, SORT_DEFAULTS,
  SORT_DIR_ATTR, SORT_DISABLED_ATTR, SORT_EMPTY_ATTR, SORT_ERROR_ATTR, SORT_FIELD_ATTR,
  SORT_FLIP_ATTR, SORT_FLIP_LABEL_ATTR, SORT_FORM_ATTR, SORT_INK_ATTR, SORT_INVALID_ATTR,
  SORT_LOADING_ATTR, SORT_NAME_ATTR, SORT_N_ATTR, SORT_ROOT_CLASS, SORT_SHOWN_ATTR, SORT_STATUS_ATTR,
  SORT_TARGET_ATTR, SORT_VIEW_ATTR, SORT_VIEW_LABEL_ATTR,
} from './attrs.js';
import { normalizeSortToggle } from './model.js';
import type { SortToggleModel, SortView } from './model.js';

/** 错态行的 id（`aria-describedby` 复用）。 */
export function sortErrorId(name: string): string {
  return 'ilife-sort-err-' + name;
}

/** 反向键的字：「反过来（从少到多）」——说的是**按下去会变成什么**。 */
function flipText(m: SortToggleModel, dir: string): string {
  const to = dir === 'asc' ? SORT_DEFAULTS.toDesc : SORT_DEFAULTS.toAsc;
  return m.flipLabel + '（' + to + '）';
}

/** 渲染一个视图条。入参不合规一律 `bad-input`。 */
export function renderSortToggle(input: unknown): string {
  const m = normalizeSortToggle(input);
  const c = SORT_ROOT_CLASS;
  const cur = m.views.find((v) => v.value === m.view) as SortView;

  const rootAttrs: string[] = [
    'class="' + esc(m.extraClass === undefined ? c : c + ' ' + m.extraClass) + '"',
    SORT_NAME_ATTR + '="' + esc(m.name) + '"',
    SORT_FORM_ATTR + '="' + esc(m.form) + '"',
    SORT_BOUND_ATTR + '=""',
  ];
  if (m.target !== undefined) rootAttrs.push(SORT_TARGET_ATTR + '="' + esc(m.target) + '"');
  rootAttrs.push(SORT_FLIP_LABEL_ATTR + '="' + esc(m.flipLabel) + '"');
  if (m.loading) rootAttrs.push(SORT_LOADING_ATTR + '="1"');
  if (m.disabled) rootAttrs.push(SORT_DISABLED_ATTR + '="1"');
  if (m.error !== undefined) rootAttrs.push(SORT_INVALID_ATTR + '="1"');

  const views = m.views.map((v) => {
    const on = v.value === m.view;
    return '<button type="button" class="' + c + '-view" ' + SORT_VIEW_ATTR + '="' + esc(v.value) + '"'
      + ' ' + SORT_FIELD_ATTR + '="' + esc(v.field ?? '') + '"'
      + ' ' + SORT_DIR_ATTR + '="' + esc(v.dir) + '"'
      + ' ' + SORT_CALIBER_ATTR + '="' + esc(v.caliber) + '"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (m.disabled ? ' disabled' : '') + '>'
      + '<span class="' + c + '-view-lab" ' + SORT_VIEW_LABEL_ATTR + '="">' + esc(v.label) + '</span>'
      + '<span class="' + c + '-n" ' + SORT_N_ATTR + '="">'
      + esc(v.count === undefined ? SORT_DEFAULTS.unset : v.count) + '</span></button>';
  }).join('');

  const caliber = '<p class="' + c + '-caliber" ' + SORT_CALIBER_LINE_ATTR + '="">'
    + '<span class="' + c + '-ink" ' + SORT_INK_ATTR + '="">'
    + esc(SORT_DEFAULTS.inkText.split('{label}').join(cur.label)) + '</span>'
    + '<span class="' + c + '-dim" ' + SORT_CALIBER_TEXT_ATTR + '="">'
    + esc(cur.caliber === ''
      ? SORT_DEFAULTS.noCaliberText
      : SORT_DEFAULTS.caliberText.split('{caliber}').join(cur.caliber))
    + '</span></p>';

  const foot = '<div class="' + c + '-foot">'
    + '<button type="button" class="' + c + '-flip" ' + SORT_FLIP_ATTR + '="" aria-pressed="false"'
    + (m.disabled ? ' disabled' : '') + '>' + esc(flipText(m, cur.dir)) + '</button>'
    + '<span class="' + c + '-status" role="status" ' + SORT_STATUS_ATTR + '="">'
    + '<span class="' + c + '-status-text"><b ' + SORT_SHOWN_ATTR + '="">' + SORT_DEFAULTS.unset + '</b> '
    + esc(m.unit) + '</span>'
    + '<span class="' + c + '-loading">' + esc(m.loadingText) + '</span></span>'
    + '</div>';

  return '<div ' + rootAttrs.join(' ') + '>'
    + '<div class="' + c + '-viewbar" role="group" aria-label="' + esc(m.label) + '">' + views + '</div>'
    + caliber + foot
    + '<p class="' + c + '-empty" ' + SORT_EMPTY_ATTR + '="" hidden>' + esc(SORT_DEFAULTS.emptyText) + '</p>'
    + '<p class="' + c + '-err" id="' + esc(sortErrorId(m.name)) + '" ' + SORT_ERROR_ATTR + '="" role="alert"'
    + (m.error === undefined ? ' hidden' : '') + '>' + esc(m.error ?? '') + '</p>'
    + '</div>';
}
