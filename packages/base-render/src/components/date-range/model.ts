/** date-range · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型），
 *  外加本件要用的**日期算术**（ISO 解析／区间天数／月格 —— 全部按 UTC 算，不受时区影响）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——日期串写错、两端倒置、快捷档重复键都在渲染期拦下；
 *   2. **未选与缺席**：`from`／`to` 各自可以 `null`（未选，屏上写 `—`）；**只要缺一端，整段就算未选**
 *      （"只有起点"不是一段区间，不假装它是）；
 *   3. **今天由调用方给**：渲染是纯函数，不许读机器时钟——`today` 不给就不标"今天"那一格。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DATE_RANGE_CELLS,
  DATE_RANGE_FORMS,
  type DateRangeForm,
  type DateRangeInput,
  type DateRangePreset,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface DateRangeModel {
  readonly form: DateRangeForm;
  readonly name: string;
  /** 起点（`YYYY-MM-DD`）；`undefined` ＝ 未选。 */
  readonly from?: string;
  /** 终点（`YYYY-MM-DD`，含这一天）；`undefined` ＝ 未选。 */
  readonly to?: string;
  /** 两端都在时：共几天（**含首尾**）；否则 `0`。 */
  readonly days: number;
  /** 当前按的是哪一档：快捷档的 `key`／`custom`（自己填的两端）／`none`（未选）。 */
  readonly preset: string;
  /** 命中的那一档的文字（上屏用）；`custom`／`none` 时是「自定义区间」／「还未选」。 */
  readonly presetLabel: string;
  readonly label?: string;
  readonly presets: readonly NormalizedPreset[];
  /** 日历正显示哪个月（`YYYY-MM`）；两端与 `today` 都没有时是 `undefined`（此时不出日历那一块）。 */
  readonly month?: string;
  /** 42 格的日期（周一打头、6 行 × 7 列，含相邻月的补齐格）；没有锚月时是空数组。 */
  readonly cells: readonly string[];
  readonly today?: string;
  readonly caliber?: string;
  readonly error?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly loading: boolean;
  readonly extraClass?: string;
}

/** 归一后的快捷档：天数已经算好（含首尾）。 */
export interface NormalizedPreset {
  readonly key: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly days: number;
}

const DAY_MS = 86400000;

/** ISO 日期（`YYYY-MM-DD`）且**真实存在**——`Date` 会把 `2026-02-31` 静默滚成 3 月 3 日，回读比对才拦得住。
 *  返回的是**类型谓词**（`value is string`）：调用方靠它把 `unknown` 收成 `string`，不用再写一次断言。 */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(value + 'T00:00:00Z');
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString().slice(0, 10) === value;
}

/** ISO → UTC 毫秒（只在内部用；`isIsoDate` 已经把非法串拦在外面）。 */
function utcOf(iso: string): number {
  return Date.parse(iso + 'T00:00:00Z');
}

/** ISO → 天序（1970-01-01 起的天数）。 */
function dayNumber(iso: string): number {
  return Math.round(utcOf(iso) / DAY_MS);
}

/** 天序 → ISO。 */
function isoOfDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** 区间天数（**含首尾**：`09-19 到 09-19` 是 1 天）。 */
export function rangeDays(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from) + 1;
}

/** 某天是星期几（0＝周日 … 6＝周六）。 */
function weekdayOf(iso: string): number {
  return new Date(utcOf(iso)).getUTCDay();
}

/** ISO → `YYYY-MM`。 */
function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** 锚月 → 42 格（**周一打头**；首格是本月 1 号所在那一周的周一，末格补齐 6 行）。 */
export function monthCells(month: string): readonly string[] {
  const first = month + '-01';
  const offset = (weekdayOf(first) + 6) % 7;
  const start = dayNumber(first) - offset;
  const out: string[] = [];
  for (let i = 0; i < DATE_RANGE_CELLS; i += 1) out.push(isoOfDay(start + i));
  return out;
}

/** 锚月 ± 1 个月（跨年由 `Date` 自己进位）。 */
export function shiftMonth(month: string, delta: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 7);
}

/** 可选 ISO 日期：`null`／不给 ＝ 未选；写错就报错（不静默当作未选）。 */
function optIso(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isIsoDate(value)) badInput(field + ' 必须是 YYYY-MM-DD（真实存在的日期）：' + String(value));
  return value;
}

/** 可选的布尔（给了就必须是布尔）。 */
function optBool(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 一枚快捷档：键／文字非空，两端是真实日期且不倒置。 */
function reqPreset(value: unknown, index: number): NormalizedPreset {
  const field = 'date-range: input.presets[' + String(index) + ']';
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    badInput(field + ' 必须是 { key, label, from, to }');
  }
  const raw = value as DateRangePreset;
  const key = reqText(raw.key, field + '.key');
  const label = reqText(raw.label, field + '.label');
  const from = optIso(raw.from, field + '.from');
  const to = optIso(raw.to, field + '.to');
  if (from === undefined || to === undefined) badInput(field + ' 必须同时给 from 与 to');
  if (dayNumber(from) > dayNumber(to)) {
    badInput(field + ' 的 from 不得晚于 to（' + from + ' > ' + to + '）');
  }
  return { key, label, from, to, days: rangeDays(from, to) };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `DateRangeModel`。 */
export function normalizeDateRange(input: unknown): DateRangeModel {
  assertPlainObject(input, 'renderDateRange: input');
  const raw = input as DateRangeInput & Record<string, unknown>;

  const form = raw.form === undefined ? DATE_RANGE_FORMS[0] : raw.form;
  if (!(DATE_RANGE_FORMS as readonly unknown[]).includes(form)) {
    badInput('date-range: input.form 必须是 ' + DATE_RANGE_FORMS.join('／') + ' 之一（本件只落地形态 B「日历缩略」）');
  }

  const name = reqText(raw.name, 'date-range: input.name');
  const from = optIso(raw.from, 'date-range: input.from');
  const to = optIso(raw.to, 'date-range: input.to');
  if (from !== undefined && to !== undefined && dayNumber(from) > dayNumber(to)) {
    badInput('date-range: input.from 不得晚于 input.to（' + from + ' > ' + to + '）');
  }

  let presets: NormalizedPreset[] = [];
  if (raw.presets !== undefined) {
    if (!Array.isArray(raw.presets)) badInput('date-range: input.presets 必须是数组');
    presets = raw.presets.map((item, i) => reqPreset(item, i));
    const keys = new Set<string>();
    for (const p of presets) {
      if (keys.has(p.key)) badInput('date-range: input.presets 里有两个一样的 key：' + p.key);
      keys.add(p.key);
    }
  }

  /* 当前按哪一档：两端齐全才谈得上"命中"；命中不了就是自己填的两端（自定义）。 */
  const both = from !== undefined && to !== undefined;
  const hit = both ? presets.find((p) => p.from === from && p.to === to) : undefined;
  const preset = hit !== undefined ? hit.key : (both ? 'custom' : 'none');
  const presetLabel = hit !== undefined ? hit.label : (both ? '自定义区间' : '还未选');

  const today = optIso(raw.today, 'date-range: input.today');
  /* 锚月：调用方点的月 → 起点 → 终点 → 今天；都没有就不出日历那一块（设计过的空态）。 */
  const monthRaw = optIso(raw.month, 'date-range: input.month');
  const anchorIso = monthRaw ?? from ?? to ?? today;
  const month = anchorIso === undefined ? undefined : monthOf(anchorIso);
  const cells = month === undefined ? [] : monthCells(month);

  const disabled = optBool(raw.disabled, 'date-range: input.disabled');
  const disabledReason = optText(raw.disabledReason, 'date-range: input.disabledReason');
  if (disabled && disabledReason === undefined) {
    badInput('date-range: disabled=true 时必须给 disabledReason（说不出为什么不能改＝读者只能猜）');
  }

  return {
    form: form as DateRangeForm,
    name,
    from,
    to,
    days: both ? rangeDays(from as string, to as string) : 0,
    preset,
    presetLabel,
    label: optText(raw.label, 'date-range: input.label'),
    presets,
    month,
    cells,
    today,
    caliber: optText(raw.caliber, 'date-range: input.caliber'),
    error: optText(raw.error, 'date-range: input.error'),
    disabled,
    disabledReason,
    loading: optBool(raw.loading, 'date-range: input.loading'),
    extraClass: optExtraClass(raw.extraClass, 'date-range: input.extraClass'),
  };
}
