/** date-range · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 B「日历缩略」——
 *
 *  一个月的 42 格铺在页上（**周一打头**，含相邻月补齐格），**两端实心底、中间浅底、今天一圈发丝线**；
 *  上面是起止两格（键盘与精确输入走这里），再上面是一排快捷档（命中的那一枚带 ✓ ＋ 实心反白），
 *  最下面是一句口径：`本周：09-19 到 09-25，共 7 天（含首尾）`——**这句话点名了当前按的是哪一档**，
 *  所以「快档点了没反应、不知道现在算的是哪一段」这个错法在本件里读不出来。
 *
 *  零脚本降级：这段不跑时日历照样能读（两端实心、中间浅底、口径句都在标记里），只是点不动。
 */
import { esc } from '../shared/escape.js';
import {
  DATE_RANGE_ACT_ATTR,
  DATE_RANGE_CLASS,
  DATE_RANGE_COLUMNS,
  DATE_RANGE_DAY_ATTR,
  DATE_RANGE_DAYS_ATTR,
  DATE_RANGE_DAYS_ATTR_ANCHOR,
  DATE_RANGE_DAYS_SUFFIX,
  DATE_RANGE_DISABLED_ATTR,
  DATE_RANGE_END_ATTR,
  DATE_RANGE_FORMS,
  DATE_RANGE_FROM_ATTR,
  DATE_RANGE_FROM_LABEL,
  DATE_RANGE_HIT_ATTR,
  DATE_RANGE_KEY_ATTR,
  DATE_RANGE_LABEL_ATTR,
  DATE_RANGE_LOADING,
  DATE_RANGE_LOADING_ATTR,
  DATE_RANGE_MISSING,
  DATE_RANGE_MONTH_ATTR,
  DATE_RANGE_MONTH_LABEL_ATTR,
  DATE_RANGE_NAME_ATTR,
  DATE_RANGE_PRESET_ATTR,
  DATE_RANGE_PRESET_FROM_ATTR,
  DATE_RANGE_PRESET_PREFIX,
  DATE_RANGE_PRESET_TO_ATTR,
  DATE_RANGE_SENTENCE_ATTR,
  DATE_RANGE_STATE_ATTR,
  DATE_RANGE_TODAY_ATTR,
  DATE_RANGE_TO_ATTR,
  DATE_RANGE_TO_LABEL,
  DATE_RANGE_UNSET,
  DATE_RANGE_WEEK_LABELS,
  dateRangeSlot,
  type DateRangeForm,
} from './attrs.js';
import { normalizeDateRange, type DateRangeModel } from './model.js';
import { m } from '../../entries/index.js';

/** 星期几的中文名（0＝周日 … 6＝周六）——日格的读屏名用它。 */
function WEEKDAY_NAMES(): readonly string[] { return [m('base-render.components-date-range-render.c001'), m('base-render.components-date-range-render.c002'), m('base-render.components-date-range-render.c003'), m('base-render.components-date-range-render.c004'), m('base-render.components-date-range-render.c005'), m('base-render.components-date-range-render.c006'), m('base-render.components-date-range-render.c007')]; }

/** ISO → `09-19`（口径句里用的短记法，与原型同）。 */
function shortDate(iso: string): string {
  return iso.slice(5);
}

/** 锚月 → `2026 年 9 月`。 */
function monthLabel(month: string): string {
  return m('base-render.components-date-range-render.c008', {
    p0: String(String(Number(month.slice(0, 4)))),
    p1: String(String(Number(month.slice(5, 7)))),
  });
}

/** 一句口径：**点名当前按的是哪一档**（这是"快档按了看得见"的落点之一）。 */
export function sentenceOf(presetLabel: string, from: string | undefined, to: string | undefined, days: number): string {
  if (from === undefined || to === undefined) {
    return m('base-render.components-date-range-render.c009', { p0: String(DATE_RANGE_UNSET()) });
  }
  return m('base-render.components-date-range-render.c010', {
    p0: String(presetLabel),
    p1: String(shortDate(from)),
    p2: String(shortDate(to)),
    p3: String(String(days)),
    p4: String(DATE_RANGE_DAYS_SUFFIX()),
  });
}

/** 错误说明的锚（控件 `aria-describedby` 指向它）。 */
function errorId(name: string): string {
  return DATE_RANGE_CLASS + '-' + name + '-error';
}

/** 可点区的「不能按」口径（与另两件同一条：禁用是真禁用，更新中只挂 `aria-disabled`）。 */
function hitState(model: DateRangeModel): string {
  if (model.disabled) return ' disabled aria-disabled="true"';
  if (model.loading) return ' aria-disabled="true" tabindex="-1"';
  return '';
}

/** 第一行：名字 ＋ 状态字（`当前按 本周`／`自定义区间`／`还未选`／`更新中`）。 */
function headHtml(model: DateRangeModel): string {
  const state = model.loading ? DATE_RANGE_LOADING() : DATE_RANGE_PRESET_PREFIX() + model.presetLabel;
  const parts: string[] = ['<div class="' + dateRangeSlot('head') + '">'];
  if (model.label !== undefined) {
    parts.push('<span class="' + dateRangeSlot('label') + '">' + esc(model.label) + '</span>');
  }
  parts.push('<span class="' + dateRangeSlot('state') + '" ' + DATE_RANGE_STATE_ATTR + '="">'
    + esc(state) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 起止两格：键盘与精确输入走这里（`input[type=date]` 的原生语义照拿）。 */
function endsHtml(model: DateRangeModel): string {
  const described = model.error === undefined && model.disabledReason === undefined
    ? '' : ' aria-describedby="' + esc(errorId(model.name)) + '"';
  const off = model.disabled ? ' disabled aria-disabled="true"'
    : (model.loading ? ' aria-disabled="true" tabindex="-1"' : '');
  const one = (slot: 'from' | 'to', label: string, value: string | undefined): string => {
    const shown = value === undefined ? '' : ' value="' + esc(value) + '"';
    const who = (model.label === undefined ? '' : model.label + '：') + (slot === 'from' ? m('base-render.components-date-range-render.c011') : m('base-render.components-date-range-render.c012'));
    return '<label class="' + dateRangeSlot(slot) + '">'
      + '<span class="' + dateRangeSlot('endLabel') + '">' + esc(label) + '</span>'
      + '<input class="' + dateRangeSlot('input') + '"'
      + ' ' + DATE_RANGE_HIT_ATTR + '="' + slot + '" ' + DATE_RANGE_END_ATTR + '="' + slot + '" type="date"'
      + shown + ' aria-label="' + esc(who) + '"' + described + off + '></label>';
  };
  return '<div class="' + dateRangeSlot('ends') + '">' + one('from', DATE_RANGE_FROM_LABEL(), model.from)
    + one('to', DATE_RANGE_TO_LABEL(), model.to) + '</div>';
}

/** 快捷档那一排：命中的一枚带 ✓ ＋ 实心反白（形 ＋ 字 ＋ 色三样一起给）。 */
function quickHtml(model: DateRangeModel): string {
  if (model.presets.length === 0) return '';
  const state = hitState(model);
  const parts: string[] = ['<div class="' + dateRangeSlot('quick') + '">'];
  for (const preset of model.presets) {
    const pressed = preset.key === model.preset;
    parts.push('<button type="button" class="' + dateRangeSlot('preset') + '"'
      + ' ' + DATE_RANGE_HIT_ATTR + '="preset" ' + DATE_RANGE_ACT_ATTR + '="preset"'
      + ' ' + DATE_RANGE_KEY_ATTR + '="' + esc(preset.key) + '"'
      + ' ' + DATE_RANGE_PRESET_FROM_ATTR + '="' + esc(preset.from) + '"'
      + ' ' + DATE_RANGE_PRESET_TO_ATTR + '="' + esc(preset.to) + '"'
      + ' aria-pressed="' + (pressed ? 'true' : 'false') + '"' + state + '>'
      + '<span class="' + dateRangeSlot('mark') + '" aria-hidden="true">✓</span>'
      + '<span class="' + dateRangeSlot('word') + '">' + esc(preset.label) + '</span>'
      + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 一格天：`is-end`（两端，实心）、`is-in`（区间内，浅底）、`is-adj`（相邻月）、`is-today`（今天）。 */
function dayHtml(model: DateRangeModel, iso: string): string {
  const cls = [dateRangeSlot('day')];
  const isEnd = iso === model.from || iso === model.to;
  const inRange = model.from !== undefined && model.to !== undefined && iso >= model.from && iso <= model.to;
  if (isEnd) cls.push('is-end');
  else if (inRange) cls.push('is-in');
  if (model.month !== undefined && iso.slice(0, 7) !== model.month) cls.push('is-adj');
  if (model.today !== undefined && iso === model.today) cls.push('is-today');
  const weekday = WEEKDAY_NAMES()[new Date(Date.parse(iso + 'T00:00:00Z')).getUTCDay()];
  const label = iso + ' ' + weekday + (model.today !== undefined && iso === model.today ? m('base-render.components-date-range-render.c013') : '')
    + (isEnd ? m('base-render.components-date-range-render.c014') : (inRange ? m('base-render.components-date-range-render.c015') : ''));
  /* 焦点锚（roving tabindex）：起点那一格 → 今天那一格 → 本屏第一格；**整块里恰有一枚 `tabindex="0"`**
     （42 个可点格全进 Tab 序会把键盘用户困在日历里；方向键由运行时段接管）。 */
  const focusAnchor = model.from ?? model.today ?? model.cells[0];
  const state = model.disabled ? ' disabled aria-disabled="true"' : (model.loading ? ' aria-disabled="true"' : '');
  return '<button type="button" class="' + esc(cls.join(' ')) + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="day" ' + DATE_RANGE_ACT_ATTR + '="day"'
    + ' ' + DATE_RANGE_DAY_ATTR + '="' + esc(iso) + '"'
    + ' aria-pressed="' + (isEnd ? 'true' : 'false') + '"'
    + ' aria-label="' + esc(label) + '"'
    + ' tabindex="' + (iso === focusAnchor ? '0' : '-1') + '"' + state + '>'
    + esc(String(Number(iso.slice(8, 10)))) + '</button>';
}

/** 日历缩略那一块：翻月键 ＋ 月份 ＋ 星期表头 ＋ 42 格（**固定 42 格**：换月不跳版）。 */
function calendarHtml(model: DateRangeModel): string {
  if (model.month === undefined) return '';
  const state = hitState(model);
  const parts: string[] = ['<div class="' + dateRangeSlot('calendar') + '">'];
  parts.push('<div class="' + dateRangeSlot('calHead') + '">');
  parts.push('<button type="button" class="' + dateRangeSlot('nav') + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="nav" ' + DATE_RANGE_ACT_ATTR + '="prev" aria-label="' + m('base-render.components-date-range-render.c016') + '"' + state + '>‹</button>');
  parts.push('<span class="' + dateRangeSlot('month') + '" ' + DATE_RANGE_MONTH_LABEL_ATTR + '="">'
    + esc(monthLabel(model.month)) + '</span>');
  parts.push('<button type="button" class="' + dateRangeSlot('nav') + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="nav" ' + DATE_RANGE_ACT_ATTR + '="next" aria-label="' + m('base-render.components-date-range-render.c017') + '"' + state + '>›</button>');
  parts.push('</div>');
  parts.push('<div class="' + dateRangeSlot('week') + '" aria-hidden="true">'
    + DATE_RANGE_WEEK_LABELS().map((w) => '<span>' + esc(w) + '</span>').join('') + '</div>');
  parts.push('<div class="' + dateRangeSlot('days') + '" ' + DATE_RANGE_DAYS_ATTR_ANCHOR + '="">'
    + model.cells.map((iso) => dayHtml(model, iso)).join('') + '</div>');
  parts.push('</div>');
  return parts.join('');
}

/** 一句口径（运行时段按同一个写法重写它）＋ 调用方补的那句 ＋ 错误／禁用原因。 */
function notesHtml(model: DateRangeModel): string {
  const parts: string[] = ['<p class="' + dateRangeSlot('caliber') + '">'
    + '<span class="' + dateRangeSlot('sentence') + '" ' + DATE_RANGE_SENTENCE_ATTR + '="">'
    + esc(sentenceOf(model.presetLabel, model.from, model.to, model.days)) + '</span>'];
  if (model.caliber !== undefined) {
    parts.push('<span class="' + dateRangeSlot('extra') + '">' + esc(model.caliber) + '</span>');
  }
  parts.push('</p>');
  if (model.error !== undefined) {
    parts.push('<p class="' + dateRangeSlot('error') + '" id="' + esc(errorId(model.name)) + '" role="alert">'
      + esc(model.error) + '</p>');
  } else if (model.disabled && model.disabledReason !== undefined) {
    parts.push('<p class="' + dateRangeSlot('error') + '" id="' + esc(errorId(model.name)) + '">'
      + esc(model.disabledReason) + '</p>');
  }
  return parts.join('');
}

/** 形态 B 的骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
function renderCalendar(model: DateRangeModel): string {
  return headHtml(model) + endsHtml(model) + quickHtml(model) + calendarHtml(model) + notesHtml(model);
}

const SKELETONS: Readonly<Record<DateRangeForm, (m: DateRangeModel) => string>> = {
  calendar: renderCalendar,
};

/** 渲染日期范围（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDateRange(input: unknown): string {
  const model = normalizeDateRange(input);
  const cls = [DATE_RANGE_CLASS, 'is-' + model.form];
  if (model.from === undefined && model.to === undefined) cls.push('is-unset');
  if (model.preset === 'custom') cls.push('is-custom');
  if (model.disabled) cls.push('is-disabled');
  if (model.loading) cls.push('is-loading');
  if (model.error !== undefined) cls.push('is-invalid');
  if (model.extraClass !== undefined) cls.push(model.extraClass);

  const attrs: string[] = [
    'class="' + esc(cls.join(' ')) + '"',
    DATE_RANGE_NAME_ATTR + '="' + esc(model.name) + '"',
    DATE_RANGE_DAYS_ATTR + '="' + esc(String(model.days)) + '"',
    DATE_RANGE_PRESET_ATTR + '="' + esc(model.preset) + '"',
  ];
  if (model.from !== undefined) attrs.push(DATE_RANGE_FROM_ATTR + '="' + esc(model.from) + '"');
  if (model.to !== undefined) attrs.push(DATE_RANGE_TO_ATTR + '="' + esc(model.to) + '"');
  if (model.month !== undefined) attrs.push(DATE_RANGE_MONTH_ATTR + '="' + esc(model.month) + '"');
  if (model.today !== undefined) attrs.push(DATE_RANGE_TODAY_ATTR + '="' + esc(model.today) + '"');
  if (model.label !== undefined) attrs.push(DATE_RANGE_LABEL_ATTR + '="' + esc(model.label) + '"');
  if (model.disabled) attrs.push(DATE_RANGE_DISABLED_ATTR + '="1"');
  if (model.loading) attrs.push(DATE_RANGE_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[model.form](model) + '</div>';
}
