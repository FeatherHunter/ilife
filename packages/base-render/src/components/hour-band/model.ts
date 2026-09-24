/** hour-band · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head/model.ts` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **机器值是分钟，显示串算出来**：时刻收"当天第几分钟"（几何与去重都要它），
 *      `HH:MM`、`6h40m` 这类**给人看的写法由本件算**（同一件事不出两个来源，调用方也不可能写歪）。
 *   3. **带上的空档要显形**：时段没盖到的时间由本件**算出来**并出最后一行
 *      「— ／ 其余时间未记录 ／ 时长」——它是形状的一部分（没有它，带上的空白读不出来）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  HOUR_BAND_DEFAULT_TONE,
  HOUR_BAND_FORMS,
  HOUR_BAND_MINUTES_PER_DAY,
  HOUR_BAND_TEXT_MIN_FRACTION,
  HOUR_BAND_TONES,
  type HourBandForm,
  type HourBandIntervalInput,
  type HourBandTone,
} from './attrs.js';

/** 归一后的一个时段（`left`／`width` 已是上屏的百分比串）。 */
export interface HourBandIntervalModel {
  readonly from: number;
  readonly to: number;
  readonly label: string;
  readonly tone: HourBandTone;
  readonly meta?: string;
  /** 轴上的起点（百分比）。 */
  readonly left: number;
  /** 轴上的长度（百分比）。 */
  readonly width: number;
  /** 时长读数（如 `6h40m`）。 */
  readonly duration: string;
  /** 起止读数（如 `00:00 – 06:40`）。 */
  readonly clock: string;
  /** 带上那枚时长字：**只在段够宽时**才有值（否则 `undefined`）。 */
  readonly bandText?: string;
}

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface HourBandModel {
  readonly form: HourBandForm;
  readonly title: string;
  readonly use?: string;
  readonly summary?: { readonly label: string; readonly value: string };
  readonly intervals: readonly HourBandIntervalModel[];
  readonly legend: readonly { readonly tone: HourBandTone; readonly label: string }[];
  /** 带上没盖到的分钟数（0 ＝ 一天被时段盖满）。 */
  readonly unrecordedMinutes: number;
  /** 未记录那一行的时长读数（`unrecordedMinutes` 为 0 时是空串）。 */
  readonly unrecordedText: string;
  readonly note?: string;
  readonly extraClass?: string;
}

/** 当天第几分钟 → 轴上的百分比（**几何是形状事实**：渲染只读它，判据也读它）。
 *  口径与 `range-bar` 的 `rangeBarPercent` 同一条：**百分比**（0..100）四舍五入到 4 位小数。
 *  （2026-09 现场：这里曾漏乘 100，段被画成 0.2778% 的发丝——判据正是量它才抓住的。） */
export function hourBandPercent(minute: number): string {
  const rounded = Math.round((minute / HOUR_BAND_MINUTES_PER_DAY) * 100 * 10000) / 10000;
  return String(rounded) + '%';
}

/** 分钟 → 时长读数（`50m`／`6h40m`／`24h00m`）。**口径只在这里写一遍**。 */
export function hourBandDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return String(m) + 'm';
  return String(h) + 'h' + (m < 10 ? '0' : '') + String(m) + 'm';
}

/** 分钟 → 钟点读数（`00:00`／`06:40`／`24:00`）。 */
export function hourBandClock(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (h < 10 ? '0' : '') + String(h) + ':' + (m < 10 ? '0' : '') + String(m);
}

/** 有限数字（时刻端点走它）。 */
function reqMinute(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数字');
  if (value < min || value > max) {
    badInput(field + ' 必须在 ' + String(min) + '..' + String(max) + ' 之间（当天第几分钟）');
  }
  return value;
}

/** 深浅档：闭集外的数字／非数字一律拒。 */
function reqTone(value: unknown, field: string): HourBandTone {
  if (typeof value !== 'number' || !(HOUR_BAND_TONES as readonly number[]).includes(value)) {
    badInput(field + ' 必须是 ' + HOUR_BAND_TONES.join('／') + ' 之一');
  }
  return value as HourBandTone;
}

/** 逐段收：端点落在 [0, 1440]、`from < to`（**不裁剪**：裁剪出来的时长是假的）。 */
function reqIntervals(value: unknown): readonly HourBandIntervalModel[] {
  if (!Array.isArray(value)) badInput('hour-band: input.intervals 必须是数组');
  const out: HourBandIntervalModel[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const field = 'hour-band: input.intervals[' + String(i) + ']';
    const item = value[i];
    assertPlainObject(item, field);
    const raw = item as HourBandIntervalInput;
    const from = reqMinute(raw.from, field + '.from', 0, HOUR_BAND_MINUTES_PER_DAY);
    const to = reqMinute(raw.to, field + '.to', 0, HOUR_BAND_MINUTES_PER_DAY);
    if (!(from < to)) badInput(field + ' 必须 from < to（起止相同就没有长度）');
    const span = to - from;
    const width = (span / HOUR_BAND_MINUTES_PER_DAY) * 100;
    out.push({
      from,
      to,
      label: reqText(raw.label, field + '.label'),
      tone: raw.tone === undefined ? HOUR_BAND_DEFAULT_TONE : reqTone(raw.tone, field + '.tone'),
      meta: optText(raw.meta, field + '.meta'),
      left: (from / HOUR_BAND_MINUTES_PER_DAY) * 100,
      width,
      duration: hourBandDuration(span),
      clock: hourBandClock(from) + ' \u2013 ' + hourBandClock(to),
      /* 段太窄就不写时长字（写了必然挤成一团或被裁）；时长另有明细行的读数兜底。 */
      bandText: width >= HOUR_BAND_TEXT_MIN_FRACTION * 100 ? hourBandDuration(span) : undefined,
    });
  }
  return out;
}

/** 时段并集之外还剩多少分钟（**带上的空档**；一天 1440 分钟减去盖到的分钟）。 */
function unrecordedMinutes(intervals: readonly HourBandIntervalModel[]): number {
  const spans = intervals.map((iv) => [iv.from, iv.to] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let cursor = 0;
  for (const [from, to] of spans) {
    const start = from < cursor ? cursor : from;
    if (to > start) {
      covered += to - start;
      cursor = to;
    }
  }
  return Math.round(HOUR_BAND_MINUTES_PER_DAY - covered);
}

/** 图例：逐条收档位与说明（不给＝不出图例）。 */
function optLegend(value: unknown): HourBandModel['legend'] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) badInput('hour-band: input.legend 必须是数组');
  const out: { tone: HourBandTone; label: string }[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const field = 'hour-band: input.legend[' + String(i) + ']';
    const item = value[i];
    assertPlainObject(item, field);
    const raw = item as { tone?: unknown; label?: unknown };
    out.push({ tone: reqTone(raw.tone, field + '.tone'), label: reqText(raw.label, field + '.label') });
  }
  return out;
}

/** 头部合计位：两枚都要（只有值的合计读不出"这是什么合计"）。 */
function optSummary(value: unknown): HourBandModel['summary'] {
  if (value === undefined) return undefined;
  assertPlainObject(value, 'hour-band: input.summary');
  const raw = value as { label?: unknown; value?: unknown };
  return {
    label: reqText(raw.label, 'hour-band: input.summary.label'),
    value: reqText(raw.value, 'hour-band: input.summary.value'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `HourBandModel`，不再自己碰 `any`。 */
export function normalizeHourBand(input: unknown): HourBandModel {
  assertPlainObject(input, 'renderHourBand: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? HOUR_BAND_FORMS[0] : raw.form;
  if (!(HOUR_BAND_FORMS as readonly unknown[]).includes(form)) {
    badInput('hour-band: input.form 必须是 ' + HOUR_BAND_FORMS.join('／')
      + ' 之一（本件只落地形态 A「单带＋整点刻度尺＋下方明细行」）');
  }

  const intervals = reqIntervals(raw.intervals);
  const missing = unrecordedMinutes(intervals);
  return {
    form: form as HourBandForm,
    title: reqText(raw.title, 'hour-band: input.title'),
    use: optText(raw.use, 'hour-band: input.use'),
    summary: optSummary(raw.summary),
    intervals,
    legend: optLegend(raw.legend),
    unrecordedMinutes: missing,
    unrecordedText: missing > 0 ? hourBandDuration(missing) : '',
    note: optText(raw.note, 'hour-band: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'hour-band: input.extraClass'),
  };
}
