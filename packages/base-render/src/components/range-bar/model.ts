/** range-bar · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head/model.ts` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **出界不是"顺手指一下"**：区间落在轴外 ⇒ `badInput`（本件不裁剪、也不做跨午夜推断——
 *      裁剪出来的长度是假的，读者会把它当成真时长）。
 *   3. 归一化只做「形状」：把起点终点换成轴上的**百分比**（几何），时长字、日期写法归调用方。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  RANGE_BAR_DEFAULT_TONE,
  RANGE_BAR_FORMS,
  RANGE_BAR_TEXT_MIN_FRACTION,
  RANGE_BAR_TONES,
  type RangeBarForm,
  type RangeBarTone,
} from './attrs.js';

/** 归一后的一个区间（`left`／`width` 已是上屏的百分比串）。 */
export interface RangeBarIntervalModel {
  readonly from: number;
  readonly to: number;
  readonly tone: RangeBarTone;
  /** 轴上的起点（百分比，如 `12.5`）。 */
  readonly left: number;
  /** 轴上的长度（百分比，如 `8.3333`）。 */
  readonly width: number;
  /** 段内时长字：**只在段够宽时**才有值（否则 `undefined`）。 */
  readonly text?: string;
}

/** 归一后的一条泳道。 */
export interface RangeBarLaneModel {
  readonly label: string;
  readonly mark?: string;
  readonly total?: string;
  readonly intervals: readonly RangeBarIntervalModel[];
}

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface RangeBarModel {
  readonly form: RangeBarForm;
  readonly title: string;
  readonly use?: string;
  readonly summary?: { readonly label: string; readonly value: string };
  readonly axis: readonly string[];
  readonly lanes: readonly RangeBarLaneModel[];
  readonly note?: string;
  readonly extraClass?: string;
}

/** 有限数字（区间端点与轴端点都走它）。 */
function reqNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数字');
  return value;
}

/** 轴的起止：`min < max`（相等的轴画不出长度）。 */
function reqDomain(value: unknown): { min: number; max: number } {
  assertPlainObject(value, 'range-bar: input.domain');
  const raw = value as { min?: unknown; max?: unknown };
  const min = reqNumber(raw.min, 'range-bar: input.domain.min');
  const max = reqNumber(raw.max, 'range-bar: input.domain.max');
  if (!(min < max)) badInput('range-bar: input.domain 必须 min < max（轴没有长度就画不出"多久"）');
  return { min, max };
}

/** 深浅档：闭集外的数字／非数字一律拒。 */
function reqTone(value: unknown, field: string): RangeBarTone {
  if (typeof value !== 'number' || !(RANGE_BAR_TONES as readonly number[]).includes(value)) {
    badInput(field + ' 必须是 ' + RANGE_BAR_TONES.join('／') + ' 之一');
  }
  return value as RangeBarTone;
}

/** 一条泳道的区间：逐条校验落在轴内，并算出轴上的位置与长度。 */
function reqIntervals(value: unknown, domain: { min: number; max: number }, laneField: string): readonly RangeBarIntervalModel[] {
  if (!Array.isArray(value)) badInput(laneField + '.intervals 必须是数组');
  const span = domain.max - domain.min;
  const out: RangeBarIntervalModel[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const field = laneField + '.intervals[' + i + ']';
    const item = value[i];
    assertPlainObject(item, field);
    const raw = item as { from?: unknown; to?: unknown; text?: unknown; tone?: unknown };
    const from = reqNumber(raw.from, field + '.from');
    const to = reqNumber(raw.to, field + '.to');
    if (!(from < to)) badInput(field + ' 必须 from < to（起止相同就没有长度）');
    if (from < domain.min || to > domain.max) {
      badInput(field + ' 落在轴外（[' + String(domain.min) + ', ' + String(domain.max)
        + ']）：跨午夜／跨月请调用方拆成两段，本件不裁剪');
    }
    const left = ((from - domain.min) / span) * 100;
    const width = ((to - from) / span) * 100;
    const text = optText(raw.text, field + '.text');
    out.push({
      from,
      to,
      tone: raw.tone === undefined ? RANGE_BAR_DEFAULT_TONE : reqTone(raw.tone, field + '.tone'),
      left,
      width,
      /* 段太窄就不写时长字（写了必然挤成一团或被裁）；时长另有行尾合计兜底。 */
      text: text !== undefined && width >= RANGE_BAR_TEXT_MIN_FRACTION * 100 ? text : undefined,
    });
  }
  return out;
}

/** 一条泳道：类别名必填、区间逐条校验、行尾合计可选。 */
function reqLane(value: unknown, domain: { min: number; max: number }, index: number): RangeBarLaneModel {
  const field = 'range-bar: input.lanes[' + String(index) + ']';
  assertPlainObject(value, field);
  const raw = value as { label?: unknown; mark?: unknown; intervals?: unknown; total?: unknown };
  const label = reqText(raw.label, field + '.label');
  if (raw.intervals === undefined) badInput(field + '.intervals 必填（一条泳道没有区间就不该占一行）');
  return {
    label,
    mark: optText(raw.mark, field + '.mark'),
    total: optText(raw.total, field + '.total'),
    intervals: reqIntervals(raw.intervals, domain, field),
  };
}

/** 轴刻度：0 枚＝不出（写法归调用方，本件不猜时间与日期的格式）。 */
function optAxis(value: unknown): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) badInput('range-bar: input.axis 必须是字符串数组');
  if (value.length === 1) badInput('range-bar: input.axis 至少 2 枚（一枚刻度指不出范围）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], 'range-bar: input.axis[' + i + ']'));
  return out;
}

/** 头部合计位：两枚都要（只有值的合计读不出"这是什么合计"）。 */
function optSummary(value: unknown): RangeBarModel['summary'] {
  if (value === undefined) return undefined;
  assertPlainObject(value, 'range-bar: input.summary');
  const raw = value as { label?: unknown; value?: unknown };
  return {
    label: reqText(raw.label, 'range-bar: input.summary.label'),
    value: reqText(raw.value, 'range-bar: input.summary.value'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RangeBarModel`，不再自己碰 `any`。 */
export function normalizeRangeBar(input: unknown): RangeBarModel {
  assertPlainObject(input, 'renderRangeBar: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? RANGE_BAR_FORMS[0] : raw.form;
  if (!(RANGE_BAR_FORMS as readonly unknown[]).includes(form)) {
    badInput('range-bar: input.form 必须是 ' + RANGE_BAR_FORMS.join('／')
      + ' 之一（本件只落地形态 A「四类泳道＋行尾合计＋整点刻度」）');
  }

  const domain = reqDomain(raw.domain);
  const lanes = raw.lanes;
  if (!Array.isArray(lanes)) badInput('range-bar: input.lanes 必须是数组');
  const laneModels: RangeBarLaneModel[] = [];
  for (let i = 0; i < lanes.length; i += 1) laneModels.push(reqLane(lanes[i], domain, i));

  return {
    form: form as RangeBarForm,
    title: reqText(raw.title, 'range-bar: input.title'),
    use: optText(raw.use, 'range-bar: input.use'),
    summary: optSummary(raw.summary),
    axis: optAxis(raw.axis),
    lanes: laneModels,
    note: optText(raw.note, 'range-bar: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'range-bar: input.extraClass'),
  };
}

/** 轴上的百分比串（**几何是形状事实**：渲染只读它，判据也读它）。 */
export function rangeBarPercent(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded) + '%';
}
