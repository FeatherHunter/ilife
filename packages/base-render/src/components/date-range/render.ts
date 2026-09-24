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

/** 星期几的中文名（0＝周日 … 6＝周六）——日格的读屏名用它。 */
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** ISO → `09-19`（口径句里用的短记法，与原型同）。 */
function shortDate(iso: string): string {
  return iso.slice(5);
}

/** 锚月 → `2026 年 9 月`。 */
function monthLabel(month: string): string {
  return String(Number(month.slice(0, 4))) + ' 年 ' + String(Number(month.slice(5, 7))) + ' 月';
}

/** 一句口径：**点名当前按的是哪一档**（这是"快档按了看得见"的落点之一）。 */
export function sentenceOf(presetLabel: string, from: string | undefined, to: string | undefined, days: number): string {
  if (from === undefined || to === undefined) {
    return DATE_RANGE_UNSET + '：按一档、填起止两格，或在日历里点两天';
  }
  return presetLabel + '：' + shortDate(from) + ' 到 ' + shortDate(to) + '，共 ' + String(days) + ' 天'
    + DATE_RANGE_DAYS_SUFFIX;
}

/** 错误说明的锚（控件 `aria-describedby` 指向它）。 */
function errorId(name: string): string {
  return DATE_RANGE_CLASS + '-' + name + '-error';
}

/** 可点区的「不能按」口径（与另两件同一条：禁用是真禁用，更新中只挂 `aria-disabled`）。 */
function hitState(m: DateRangeModel): string {
  if (m.disabled) return ' disabled aria-disabled="true"';
  if (m.loading) return ' aria-disabled="true" tabindex="-1"';
  return '';
}

/** 第一行：名字 ＋ 状态字（`当前按 本周`／`自定义区间`／`还未选`／`更新中`）。 */
function headHtml(m: DateRangeModel): string {
  const state = m.loading ? DATE_RANGE_LOADING : DATE_RANGE_PRESET_PREFIX + m.presetLabel;
  const parts: string[] = ['<div class="' + dateRangeSlot('head') + '">'];
  if (m.label !== undefined) {
    parts.push('<span class="' + dateRangeSlot('label') + '">' + esc(m.label) + '</span>');
  }
  parts.push('<span class="' + dateRangeSlot('state') + '" ' + DATE_RANGE_STATE_ATTR + '="">'
    + esc(state) + '</span>');
  parts.push('</div>');
  return parts.join('');
}

/** 起止两格：键盘与精确输入走这里（`input[type=date]` 的原生语义照拿）。 */
function endsHtml(m: DateRangeModel): string {
  const described = m.error === undefined && m.disabledReason === undefined
    ? '' : ' aria-describedby="' + esc(errorId(m.name)) + '"';
  const off = m.disabled ? ' disabled aria-disabled="true"'
    : (m.loading ? ' aria-disabled="true" tabindex="-1"' : '');
  const one = (slot: 'from' | 'to', label: string, value: string | undefined): string => {
    const shown = value === undefined ? '' : ' value="' + esc(value) + '"';
    const who = (m.label === undefined ? '' : m.label + '：') + (slot === 'from' ? '起点' : '终点');
    return '<label class="' + dateRangeSlot(slot) + '">'
      + '<span class="' + dateRangeSlot('endLabel') + '">' + esc(label) + '</span>'
      + '<input class="' + dateRangeSlot('input') + '"'
      + ' ' + DATE_RANGE_HIT_ATTR + '="' + slot + '" ' + DATE_RANGE_END_ATTR + '="' + slot + '" type="date"'
      + shown + ' aria-label="' + esc(who) + '"' + described + off + '></label>';
  };
  return '<div class="' + dateRangeSlot('ends') + '">' + one('from', DATE_RANGE_FROM_LABEL, m.from)
    + one('to', DATE_RANGE_TO_LABEL, m.to) + '</div>';
}

/** 快捷档那一排：命中的一枚带 ✓ ＋ 实心反白（形 ＋ 字 ＋ 色三样一起给）。 */
function quickHtml(m: DateRangeModel): string {
  if (m.presets.length === 0) return '';
  const state = hitState(m);
  const parts: string[] = ['<div class="' + dateRangeSlot('quick') + '">'];
  for (const preset of m.presets) {
    const pressed = preset.key === m.preset;
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
function dayHtml(m: DateRangeModel, iso: string): string {
  const cls = [dateRangeSlot('day')];
  const isEnd = iso === m.from || iso === m.to;
  const inRange = m.from !== undefined && m.to !== undefined && iso >= m.from && iso <= m.to;
  if (isEnd) cls.push('is-end');
  else if (inRange) cls.push('is-in');
  if (m.month !== undefined && iso.slice(0, 7) !== m.month) cls.push('is-adj');
  if (m.today !== undefined && iso === m.today) cls.push('is-today');
  const weekday = WEEKDAY_NAMES[new Date(Date.parse(iso + 'T00:00:00Z')).getUTCDay()];
  const label = iso + ' ' + weekday + (m.today !== undefined && iso === m.today ? '（今天）' : '')
    + (isEnd ? '：这一段的一端' : (inRange ? '：这一段里的一天' : ''));
  /* 焦点锚（roving tabindex）：起点那一格 → 今天那一格 → 本屏第一格；**整块里恰有一枚 `tabindex="0"`**
     （42 个可点格全进 Tab 序会把键盘用户困在日历里；方向键由运行时段接管）。 */
  const focusAnchor = m.from ?? m.today ?? m.cells[0];
  const state = m.disabled ? ' disabled aria-disabled="true"' : (m.loading ? ' aria-disabled="true"' : '');
  return '<button type="button" class="' + esc(cls.join(' ')) + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="day" ' + DATE_RANGE_ACT_ATTR + '="day"'
    + ' ' + DATE_RANGE_DAY_ATTR + '="' + esc(iso) + '"'
    + ' aria-pressed="' + (isEnd ? 'true' : 'false') + '"'
    + ' aria-label="' + esc(label) + '"'
    + ' tabindex="' + (iso === focusAnchor ? '0' : '-1') + '"' + state + '>'
    + esc(String(Number(iso.slice(8, 10)))) + '</button>';
}

/** 日历缩略那一块：翻月键 ＋ 月份 ＋ 星期表头 ＋ 42 格（**固定 42 格**：换月不跳版）。 */
function calendarHtml(m: DateRangeModel): string {
  if (m.month === undefined) return '';
  const state = hitState(m);
  const parts: string[] = ['<div class="' + dateRangeSlot('calendar') + '">'];
  parts.push('<div class="' + dateRangeSlot('calHead') + '">');
  parts.push('<button type="button" class="' + dateRangeSlot('nav') + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="nav" ' + DATE_RANGE_ACT_ATTR + '="prev" aria-label="上一个月"' + state + '>‹</button>');
  parts.push('<span class="' + dateRangeSlot('month') + '" ' + DATE_RANGE_MONTH_LABEL_ATTR + '="">'
    + esc(monthLabel(m.month)) + '</span>');
  parts.push('<button type="button" class="' + dateRangeSlot('nav') + '"'
    + ' ' + DATE_RANGE_HIT_ATTR + '="nav" ' + DATE_RANGE_ACT_ATTR + '="next" aria-label="下一个月"' + state + '>›</button>');
  parts.push('</div>');
  parts.push('<div class="' + dateRangeSlot('week') + '" aria-hidden="true">'
    + DATE_RANGE_WEEK_LABELS.map((w) => '<span>' + esc(w) + '</span>').join('') + '</div>');
  parts.push('<div class="' + dateRangeSlot('days') + '" ' + DATE_RANGE_DAYS_ATTR_ANCHOR + '="">'
    + m.cells.map((iso) => dayHtml(m, iso)).join('') + '</div>');
  parts.push('</div>');
  return parts.join('');
}

/** 一句口径（运行时段按同一个写法重写它）＋ 调用方补的那句 ＋ 错误／禁用原因。 */
function notesHtml(m: DateRangeModel): string {
  const parts: string[] = ['<p class="' + dateRangeSlot('caliber') + '">'
    + '<span class="' + dateRangeSlot('sentence') + '" ' + DATE_RANGE_SENTENCE_ATTR + '="">'
    + esc(sentenceOf(m.presetLabel, m.from, m.to, m.days)) + '</span>'];
  if (m.caliber !== undefined) {
    parts.push('<span class="' + dateRangeSlot('extra') + '">' + esc(m.caliber) + '</span>');
  }
  parts.push('</p>');
  if (m.error !== undefined) {
    parts.push('<p class="' + dateRangeSlot('error') + '" id="' + esc(errorId(m.name)) + '" role="alert">'
      + esc(m.error) + '</p>');
  } else if (m.disabled && m.disabledReason !== undefined) {
    parts.push('<p class="' + dateRangeSlot('error') + '" id="' + esc(errorId(m.name)) + '">'
      + esc(m.disabledReason) + '</p>');
  }
  return parts.join('');
}

/** 形态 B 的骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
function renderCalendar(m: DateRangeModel): string {
  return headHtml(m) + endsHtml(m) + quickHtml(m) + calendarHtml(m) + notesHtml(m);
}

const SKELETONS: Readonly<Record<DateRangeForm, (m: DateRangeModel) => string>> = {
  calendar: renderCalendar,
};

/** 渲染日期范围（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderDateRange(input: unknown): string {
  const m = normalizeDateRange(input);
  const cls = [DATE_RANGE_CLASS, 'is-' + m.form];
  if (m.from === undefined && m.to === undefined) cls.push('is-unset');
  if (m.preset === 'custom') cls.push('is-custom');
  if (m.disabled) cls.push('is-disabled');
  if (m.loading) cls.push('is-loading');
  if (m.error !== undefined) cls.push('is-invalid');
  if (m.extraClass !== undefined) cls.push(m.extraClass);

  const attrs: string[] = [
    'class="' + esc(cls.join(' ')) + '"',
    DATE_RANGE_NAME_ATTR + '="' + esc(m.name) + '"',
    DATE_RANGE_DAYS_ATTR + '="' + esc(String(m.days)) + '"',
    DATE_RANGE_PRESET_ATTR + '="' + esc(m.preset) + '"',
  ];
  if (m.from !== undefined) attrs.push(DATE_RANGE_FROM_ATTR + '="' + esc(m.from) + '"');
  if (m.to !== undefined) attrs.push(DATE_RANGE_TO_ATTR + '="' + esc(m.to) + '"');
  if (m.month !== undefined) attrs.push(DATE_RANGE_MONTH_ATTR + '="' + esc(m.month) + '"');
  if (m.today !== undefined) attrs.push(DATE_RANGE_TODAY_ATTR + '="' + esc(m.today) + '"');
  if (m.label !== undefined) attrs.push(DATE_RANGE_LABEL_ATTR + '="' + esc(m.label) + '"');
  if (m.disabled) attrs.push(DATE_RANGE_DISABLED_ATTR + '="1"');
  if (m.loading) attrs.push(DATE_RANGE_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
