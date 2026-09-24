/** calendar-month · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head/model.ts` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **缺值与空串是两件事**：`day.value` 给 `null` ＝ 缺值（写成 `—`）；给空串 ＝ 错。
 *   3. 归一化只做「形状」：取整、千分位、单位口径**归调用方**——本件只收「已经是给人看的样子」的串。
 *
 *  两条本件自己的不变量（在这里成立，判据也在这一层断）：
 *   · **格盘必须排满**：`cells.length` 是 7 的倍数、最多 6 行 ⇒ 月首月尾的空位由调用方显式给 `null`，
 *     本件不替你按日期推算星期（那是日历口径，归调用方）；
 *   · **缺值的格一律 0 档**：深浅表示量，没有量就没有深浅（`value: null` 时 `level` 被压到 0）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  CALENDAR_MONTH_FORMS,
  CALENDAR_MONTH_LEVELS,
  CALENDAR_MONTH_MAX_WEEKS,
  CALENDAR_MONTH_MISSING,
  CALENDAR_MONTH_WEEK_LENGTH,
  CALENDAR_MONTH_WEEKDAYS,
  type CalendarMonthDayInput,
  type CalendarMonthForm,
  type CalendarMonthLevel,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface CalendarMonthModel {
  readonly form: CalendarMonthForm;
  readonly title: string;
  readonly use?: string;
  readonly weekdays: readonly string[];
  readonly cells: readonly (CalendarMonthDayModel | null)[];
  readonly summary?: { readonly label: string; readonly value: string };
  readonly legend: readonly { readonly level: CalendarMonthLevel; readonly label: string }[];
  readonly note?: string;
  readonly extraClass?: string;
}

/** 归一后的一格（`value` 已是**上屏字**：缺值＝`—`）。 */
export interface CalendarMonthDayModel {
  readonly day: string;
  readonly value: string;
  readonly level: CalendarMonthLevel;
  /** 这一格是不是"缺值"（`value` 原本是 `null`）——渲染要给它一个更弱的字色。 */
  readonly missing: boolean;
  readonly today: boolean;
}

/** 深浅档：闭集外的数字／非数字一律拒。 */
function reqLevel(value: unknown, field: string): CalendarMonthLevel {
  if (typeof value !== 'number' || !(CALENDAR_MONTH_LEVELS as readonly number[]).includes(value)) {
    badInput(field + ' 必须是 ' + CALENDAR_MONTH_LEVELS.join('／') + ' 之一');
  }
  return value as CalendarMonthLevel;
}

/** 星期表头：七枚非空串（少一枚就把七列错位，所以长度是硬约束）。 */
function reqWeekdays(value: unknown): readonly string[] {
  if (value === undefined) return CALENDAR_MONTH_WEEKDAYS;
  if (!Array.isArray(value)) badInput('calendar-month: input.weekdays 必须是字符串数组');
  if (value.length !== CALENDAR_MONTH_WEEK_LENGTH) {
    badInput('calendar-month: input.weekdays 必须恰好 ' + CALENDAR_MONTH_WEEK_LENGTH + ' 枚（一周七格）');
  }
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], 'calendar-month: input.weekdays[' + i + ']'));
  return out;
}

/** 一格一天：日期必填；读数 `null` ＝ 缺值（写成 `—`，并把深浅压到 0 档）。 */
function reqDay(raw: unknown, field: string): CalendarMonthDayModel {
  assertPlainObject(raw, field);
  const dayInput = raw as CalendarMonthDayInput;
  const given: unknown = dayInput.value;
  let shown: string;
  let missing: boolean;
  if (given === null) {
    shown = CALENDAR_MONTH_MISSING;
    missing = true;
  } else if (given === undefined) {
    badInput(field + '.value 必填（缺值请**显式**给 null：写成 ' + CALENDAR_MONTH_MISSING + '）');
  } else if (typeof given !== 'string') {
    badInput(field + '.value 必须是字符串或 null（缺值）');
  } else if (given === '') {
    badInput(field + '.value 不许给空串：缺值请给 null（写成 ' + CALENDAR_MONTH_MISSING + '）');
  } else {
    shown = given;
    missing = false;
  }
  const level = dayInput.level === undefined
    ? 0 as CalendarMonthLevel
    : reqLevel(dayInput.level, field + '.level');
  return {
    day: reqText(dayInput.day, field + '.day'),
    value: shown,
    /* 缺值的格一律 0 档：深浅表示量，没有量就没有深浅（不再要一个"缺值的深浅"概念）。 */
    level: missing ? 0 : level,
    missing,
    today: dayInput.today === true,
  };
}

/** 格盘：7 的倍数、最多 6 行（`null` ＝ 空位）。 */
function reqCells(value: unknown): readonly (CalendarMonthDayModel | null)[] {
  if (!Array.isArray(value)) badInput('calendar-month: input.cells 必须是数组（一周七格、按行排满）');
  if (value.length === 0) badInput('calendar-month: input.cells 不许是空数组（没有格盘就没有月历）');
  if (value.length % CALENDAR_MONTH_WEEK_LENGTH !== 0) {
    badInput('calendar-month: input.cells 的长度必须是 ' + CALENDAR_MONTH_WEEK_LENGTH + ' 的倍数（一周七格；空位请显式给 null）');
  }
  if (value.length > CALENDAR_MONTH_WEEK_LENGTH * CALENDAR_MONTH_MAX_WEEKS) {
    badInput('calendar-month: input.cells 最多 ' + (CALENDAR_MONTH_WEEK_LENGTH * CALENDAR_MONTH_MAX_WEEKS)
      + ' 格（' + CALENDAR_MONTH_MAX_WEEKS + ' 行）；再多就不是一个月了');
  }
  const out: (CalendarMonthDayModel | null)[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const cell = value[i];
    out.push(cell === null || cell === undefined
      ? null
      : reqDay(cell, 'calendar-month: input.cells[' + i + ']'));
  }
  return out;
}

/** 头部合计位：两枚都要（只有值的合计读不出"这是什么合计"）。 */
function optSummary(value: unknown): CalendarMonthModel['summary'] {
  if (value === undefined) return undefined;
  assertPlainObject(value, 'calendar-month: input.summary');
  const raw = value as { label?: unknown; value?: unknown };
  return {
    label: reqText(raw.label, 'calendar-month: input.summary.label'),
    value: reqText(raw.value, 'calendar-month: input.summary.value'),
  };
}

/** 图例：逐条收档位与说明（不给＝不出图例）。 */
function optLegend(value: unknown): CalendarMonthModel['legend'] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) badInput('calendar-month: input.legend 必须是数组');
  const out: { level: CalendarMonthLevel; label: string }[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const field = 'calendar-month: input.legend[' + i + ']';
    const item = value[i];
    assertPlainObject(item, field);
    const raw = item as { level?: unknown; label?: unknown };
    out.push({ level: reqLevel(raw.level, field + '.level'), label: reqText(raw.label, field + '.label') });
  }
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `CalendarMonthModel`，不再自己碰 `any`。 */
export function normalizeCalendarMonth(input: unknown): CalendarMonthModel {
  assertPlainObject(input, 'renderCalendarMonth: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? CALENDAR_MONTH_FORMS[0] : raw.form;
  if (!(CALENDAR_MONTH_FORMS as readonly unknown[]).includes(form)) {
    badInput('calendar-month: input.form 必须是 ' + CALENDAR_MONTH_FORMS.join('／')
      + ' 之一（本件只落地形态 A「格内数字＋小计＋底部水量条」）');
  }

  return {
    form: form as CalendarMonthForm,
    title: reqText(raw.title, 'calendar-month: input.title'),
    use: optText(raw.use, 'calendar-month: input.use'),
    weekdays: reqWeekdays(raw.weekdays),
    cells: reqCells(raw.cells),
    summary: optSummary(raw.summary),
    legend: optLegend(raw.legend),
    note: optText(raw.note, 'calendar-month: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'calendar-month: input.extraClass'),
  };
}
