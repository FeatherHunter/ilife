/** filterChips · **渲染**（纯函数：一份入参 → 一段标记；零 DOM、零副作用）。
 *
 *  形态 A：常用一行（换行排）→「更多」那一段（原生 `<details>`，默认展开）→ 脚（已选／记录／合计 ＋ 清除）。
 *  计数与合计**渲染期只写调用方给的初值或 `—`**：真数由运行时段按页面上的记录算（数出来才算数）。
 */
import { esc } from '../shared/escape.js';
import {
  CHIPS_BOUND_ATTR, CHIPS_CLEAR_ATTR, CHIPS_DEFAULTS, CHIPS_DISABLED_ATTR, CHIPS_EMPTY_ATTR,
  CHIPS_ERROR_ATTR, CHIPS_FORM_ATTR, CHIPS_INVALID_ATTR, CHIPS_LOADING_ATTR, CHIPS_MORE_ATTR,
  CHIPS_NAME_ATTR, CHIPS_PICKED_ATTR, CHIPS_ROWS_ATTR, CHIPS_ROOT_CLASS, CHIPS_ROW_ATTR,
  CHIPS_STATUS_ATTR, CHIPS_TARGET_ATTR, CHIPS_TOTAL_ATTR, CHIP_ATTR, CHIP_N_ATTR,
} from './attrs.js';
import { normalizeFilterChips } from './model.js';
import type { ChipOption, FilterChipsModel } from './model.js';

/** 错态行的 id（`aria-describedby` 复用）。 */
export function chipsErrorId(name: string): string {
  return 'ilife-chips-err-' + name;
}

function chipHtml(o: ChipOption, on: boolean, disabled: boolean): string {
  const c = CHIPS_ROOT_CLASS;
  return '<button type="button" class="' + c + '-chip" ' + CHIP_ATTR + '="' + esc(o.value) + '"'
    + ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') + '>'
    + '<span class="' + c + '-chip-lab">' + esc(o.label) + '</span>'
    + '<span class="' + c + '-n" ' + CHIP_N_ATTR + '="">'
    + esc(o.count === undefined ? CHIPS_DEFAULTS.unset : o.count) + '</span>'
    + '</button>';
}

function rowHtml(m: FilterChipsModel, list: readonly ChipOption[], label: string): string {
  const c = CHIPS_ROOT_CLASS;
  const chips = list.map((o) => chipHtml(o, m.selected.includes(o.value), m.disabled)).join('');
  return '<div class="' + c + '-row" role="group" aria-label="' + esc(m.label + ' · ' + label) + '" '
    + CHIPS_ROW_ATTR + '="' + esc(label) + '">' + chips + '</div>';
}

/** 渲染一组筛选 chip。入参不合规一律 `bad-input`（不静默降级）。 */
export function renderFilterChips(input: unknown): string {
  const m = normalizeFilterChips(input);
  const c = CHIPS_ROOT_CLASS;

  if (m.options.length === 0) {
    /* 空态：没有可筛的档——设计过的一句话，不是一片空白（运行时照样跑，什么都不用改）。 */
    return '<div class="' + esc(join(m.extraClass, c)) + '" ' + CHIPS_NAME_ATTR + '="' + esc(m.name) + '" '
      + CHIPS_FORM_ATTR + '="' + esc(m.form) + '" ' + CHIPS_BOUND_ATTR + '="">'
      + '<p class="' + c + '-empty" ' + CHIPS_EMPTY_ATTR + '="">' + esc(m.emptyText) + '</p>'
      + '<p class="' + c + '-err" id="' + esc(chipsErrorId(m.name)) + '" ' + CHIPS_ERROR_ATTR + '="" role="alert" hidden></p>'
      + '</div>';
  }

  const common = m.options.filter((o) => o.common);
  const more = m.options.filter((o) => !o.common);
  /** 没选中任何一档 ＝ 不筛（「全部」）；选了就报档数。 */
  const cLabel = m.selected.length === 0 ? CHIPS_DEFAULTS.allText : String(m.selected.length);

  const rootAttrs: string[] = [
    'class="' + esc(join(m.extraClass, c)) + '"',
    CHIPS_NAME_ATTR + '="' + esc(m.name) + '"',
    CHIPS_FORM_ATTR + '="' + esc(m.form) + '"',
    CHIPS_BOUND_ATTR + '=""',
  ];
  if (m.target !== undefined) rootAttrs.push(CHIPS_TARGET_ATTR + '="' + esc(m.target) + '"');
  if (m.loading) rootAttrs.push(CHIPS_LOADING_ATTR + '="1"');
  if (m.disabled) rootAttrs.push(CHIPS_DISABLED_ATTR + '="1"');
  if (m.error !== undefined) rootAttrs.push(CHIPS_INVALID_ATTR + '="1"');

  const sec = common.length === 0 ? ''
    : '<div class="' + c + '-sec">' + '<span class="' + c + '-lab">' + esc(m.commonLabel) + '</span>'
      + rowHtml(m, common, m.commonLabel) + '</div>';

  const morePart = more.length === 0 ? ''
    : '<details class="' + c + '-more"' + (m.moreOpen ? ' open' : '') + ' ' + CHIPS_MORE_ATTR + '="">'
      + '<summary class="' + c + '-more-sum">'
      + '<span class="' + c + '-more-lab">' + esc(m.moreLabel) + '</span>'
      + '<span class="' + c + '-n">' + String(more.length) + '</span>'
      + '<span class="' + c + '-caret" aria-hidden="true">▾</span></summary>'
      + '<div class="' + c + '-more-body">' + rowHtml(m, more, m.moreLabel) + '</div>'
      + '</details>';

  const sum = '<p class="' + c + '-sum" role="status" ' + CHIPS_STATUS_ATTR + '="">'
    + '<span class="' + c + '-sum-text">' + esc(CHIPS_DEFAULTS.pickedBefore) + ' <b ' + CHIPS_PICKED_ATTR + '="">'
    + esc(cLabel) + '</b> ' + esc(m.pickedUnit)
    + '<span class="' + c + '-dim"> · ' + esc(CHIPS_DEFAULTS.rowsBefore) + ' <b ' + CHIPS_ROWS_ATTR + '="">'
    + CHIPS_DEFAULTS.unset + '</b> ' + esc(m.rowsUnit) + ' · <b ' + CHIPS_TOTAL_ATTR + '="">'
    + CHIPS_DEFAULTS.unset + '</b></span></span>'
    + '<span class="' + c + '-loading">' + esc(m.loadingText) + '</span>'
    + '</p>';

  const foot = '<div class="' + c + '-foot">' + sum
    + '<button type="button" class="' + c + '-clear" ' + CHIPS_CLEAR_ATTR + '=""'
    + (m.disabled ? ' disabled' : '') + '>' + esc(m.clearLabel) + '</button>'
    + '</div>';

  return '<div ' + rootAttrs.join(' ') + '>'
    + sec + morePart + foot
    + '<p class="' + c + '-empty-row" ' + CHIPS_EMPTY_ATTR + '="" hidden>' + esc(CHIPS_DEFAULTS.noRowsText) + '</p>'
    + '<p class="' + c + '-err" id="' + esc(chipsErrorId(m.name)) + '" ' + CHIPS_ERROR_ATTR + '="" role="alert"'
    + (m.error === undefined ? ' hidden' : '') + '>' + esc(m.error ?? '') + '</p>'
    + '</div>';
}

/** 附加类名与类名根合成一个 `class` 值。 */
function join(extra: string | undefined, root: string): string {
  return extra === undefined ? root : root + ' ' + extra;
}
