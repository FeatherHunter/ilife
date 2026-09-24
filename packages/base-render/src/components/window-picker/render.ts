/** windowPicker · **渲染**（纯函数：一份入参 → 一段标记；零 DOM、零副作用）。
 *
 *  形态 A（一行工具条）：`窗口档（换行排） ｜ 起 至 止 ｜ 共 N 天`。
 *  起止与天数**在渲染期就算好**（给了 `today` 或起止时）：窗口是整页读数的口径，
 *  它不该等到脚本跑起来才出现。给了档位却没给 `today` 时，起止留空、天数写 `—`，
 *  由运行时按浏览器当天补——**不编一个看着像真的日子**。
 */
import { esc } from '../shared/escape.js';
import {
  WINDOW_BOUND_ATTR, WINDOW_CUSTOM, WINDOW_DAYS_ATTR, WINDOW_DEFAULTS, WINDOW_DISABLED_ATTR,
  WINDOW_EMPTY_ATTR, WINDOW_ERROR_ATTR, WINDOW_FORM_ATTR, WINDOW_FROM_ATTR, WINDOW_INVALID_ATTR,
  WINDOW_LOADING_ATTR, WINDOW_NAME_ATTR, WINDOW_PRESET_ATTR, WINDOW_PRESET_DAYS_ATTR,
  WINDOW_ROOT_CLASS, WINDOW_STATUS_ATTR, WINDOW_TODAY_ATTR, WINDOW_TO_ATTR,
} from './attrs.js';
import { isoDayCount, normalizeWindowPicker } from './model.js';

/** 错态行的 id（`aria-describedby` 复用）。 */
export function windowErrorId(name: string): string {
  return 'ilife-window-err-' + name;
}

/** 天数那句话的模板（`{n}` 切两半，N 那一格留成运行时能改的槽）。 */
export const DAY_TEMPLATE = WINDOW_DEFAULTS.daysText.split('{n}');

/** 渲染一个窗口选择器。入参不合规一律 `bad-input`。 */
export function renderWindowPicker(input: unknown): string {
  const m = normalizeWindowPicker(input);
  const c = WINDOW_ROOT_CLASS;
  const days = m.from === undefined || m.to === undefined ? undefined : isoDayCount(m.from, m.to);

  const rootAttrs: string[] = [
    'class="' + esc(m.extraClass === undefined ? c : c + ' ' + m.extraClass) + '"',
    WINDOW_NAME_ATTR + '="' + esc(m.name) + '"',
    WINDOW_FORM_ATTR + '="' + esc(m.form) + '"',
    WINDOW_BOUND_ATTR + '=""',
  ];
  if (m.today !== undefined) rootAttrs.push(WINDOW_TODAY_ATTR + '="' + esc(m.today) + '"');
  if (m.loading) rootAttrs.push(WINDOW_LOADING_ATTR + '="1"');
  if (m.disabled) rootAttrs.push(WINDOW_DISABLED_ATTR + '="1"');
  if (m.error !== undefined) rootAttrs.push(WINDOW_INVALID_ATTR + '="1"');

  const presets = m.presets.map((p) => {
    const on = p.value === m.preset;
    const daysAttr = p.days === undefined ? '' : ' ' + WINDOW_PRESET_DAYS_ATTR + '="' + String(p.days) + '"';
    return '<button type="button" class="' + c + '-preset" ' + WINDOW_PRESET_ATTR + '="' + esc(p.value) + '"'
      + daysAttr + ' aria-pressed="' + (on ? 'true' : 'false') + '"'
      + (m.disabled ? ' disabled' : '') + '>' + esc(p.label) + '</button>';
  }).join('');

  const fromVal = m.from === undefined ? '' : m.from;
  const toVal = m.to === undefined ? '' : m.to;
  const dateField = (attr: string, value: string, label: string, lead: string): string =>
    '<label class="' + c + '-field"><span class="' + c + '-lab">' + esc(lead) + '</span>'
    + '<input type="date" class="' + c + '-date" ' + attr + '="" value="' + esc(value) + '"'
    + ' aria-label="' + esc(label) + '"' + (m.disabled ? ' disabled' : '') + '></label>';

  const range = '<span class="' + c + '-range">'
    + dateField(WINDOW_FROM_ATTR, fromVal, WINDOW_DEFAULTS.fromLabel, '起')
    + '<span class="' + c + '-till">' + esc(WINDOW_DEFAULTS.tillText) + '</span>'
    + dateField(WINDOW_TO_ATTR, toVal, WINDOW_DEFAULTS.toLabel, '止')
    + '<span class="' + c + '-days" ' + WINDOW_STATUS_ATTR + '="">'
    + '<span class="' + c + '-days-text">'
    + esc(DAY_TEMPLATE[0]) + '<b ' + WINDOW_DAYS_ATTR + '="">'
    + (days === undefined ? WINDOW_DEFAULTS.unset : String(days)) + '</b>' + esc(DAY_TEMPLATE[1])
    + '</span>'
    + '<span class="' + c + '-loading">' + esc(m.loadingText) + '</span></span></span>';

  return '<div ' + rootAttrs.join(' ') + '>'
    + '<div class="' + c + '-bar">'
    + '<span class="' + c + '-seg" role="group" aria-label="' + esc(m.label) + '">' + presets + '</span>'
    + range + '</div>'
    + '<p class="' + c + '-empty" ' + WINDOW_EMPTY_ATTR + '=""' + (days === undefined ? '' : ' hidden') + '>'
    + esc(WINDOW_DEFAULTS.emptyText) + '</p>'
    + '<p class="' + c + '-err" id="' + esc(windowErrorId(m.name)) + '" ' + WINDOW_ERROR_ATTR + '="" role="alert"'
    + (m.error === undefined ? ' hidden' : '') + '>' + esc(m.error ?? '') + '</p>'
    + '</div>';
}

/** 「自定义」档的机器值（渲染与运行时共用；`attrs.ts` 另有一处同名转出）。 */
export { WINDOW_CUSTOM };
