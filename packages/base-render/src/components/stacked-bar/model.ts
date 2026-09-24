/** stacked-bar · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      零段与负段画出来是"少了一段"，而调用方以为自己给了完整构成。
 *   2. **占比由本件算、只算一次**：段宽（`flex`）、段内读数、图例百分数、无障碍名全部从
 *      同一个 `value / sum` 出——三处各算一次必然走散（四舍五入到 100.1% 就是这么来的）。
 *   3. 归一化只做「形状」与「算数」：**千分位由本件做**（这是排版），单位与聚合归调用方。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  STACKED_BAR_FORMS,
  STACKED_BAR_MAX_SEGMENTS,
  STACKED_BAR_NAME_MIN_PCT,
  STACKED_BAR_SERIES,
  STACKED_BAR_VALUE_MIN_PCT,
  type StackedBarForm,
  type StackedBarSegment,
} from './attrs.js';

/** 段里那行读数怎么写：`name`＝连名字一起（宽段）／`value`＝只写百分数（窄段）／`none`＝让位图例。 */
export type StackedBarLabelKind = 'name' | 'value' | 'none';

/** 一段的归一化结果（段宽、百分数、段内读数、色档都已定）。 */
export interface StackedBarSegmentModel {
  readonly name: string;
  readonly value: number;
  /** 数量（千分位空格分隔）。 */
  readonly valueText: string;
  /** 占比（%，一位小数）。 */
  readonly pct: number;
  /** 占比的显示串（整数不写 `.0`）。 */
  readonly pctText: string;
  /** 段宽：千分比整数，**各段之和恰好 1000**（末段吃下舍入的余数）。 */
  readonly flex: number;
  /** 色档（1…`STACKED_BAR_SERIES`）＝ `is-k<n>` 的 n，按段序发。 */
  readonly series: number;
  readonly labelKind: StackedBarLabelKind;
  /** 段内那行字（`labelKind` 为 `none` 时是空串）。 */
  readonly label: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好（`render.ts` 只负责拼标记）。 */
export interface StackedBarModel {
  readonly form: StackedBarForm;
  readonly title: string;
  readonly stamp?: string;
  readonly unit?: string;
  readonly segments: readonly StackedBarSegmentModel[];
  readonly note?: string;
  /** 无障碍名（写给读屏的那一句：标题 ＋ 逐段名字与百分数）。 */
  readonly ariaLabel: string;
  readonly extraClass?: string;
}

/** 必须是有限数（本件唯一的数值校验；第三处要用时提为 `shared/` 件，同 `scale-bar` 的口径）。 */
function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数');
  }
  return value;
}

/** 千分位：每三位插一个空格（与原型墙同款；读数一律 `tabular-nums`，空格不参与对位）。 */
function group(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ' ';
    out += body[i];
  }
  return (neg ? '-' : '') + out;
}

/** 数量 → 给人看的串：整数走千分位；小数最多两位（末尾的 0 去掉）。 */
function fmtQty(n: number): string {
  if (Number.isInteger(n)) return group(String(n));
  const rounded = Math.round(n * 100) / 100;
  const s = String(rounded);
  const dot = s.indexOf('.');
  return group(s.slice(0, dot)) + s.slice(dot);
}

/** 百分数 → 一位小数；整数不写 `.0`。 */
function fmtPct(pct: number): string {
  return String(Number.isInteger(pct) ? pct : pct.toFixed(1));
}

/** 各分段：逐段校验（段必须是对象；名字非空串；数量是**正**有限数）。 */
function reqSegments(value: unknown): readonly StackedBarSegment[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput('stacked-bar: input.segments 必须是非空数组（≥1 段；一个数一根条请用 scale-bar）');
  }
  if (value.length > STACKED_BAR_MAX_SEGMENTS) {
    badInput('stacked-bar: input.segments 最多 ' + STACKED_BAR_MAX_SEGMENTS
      + ' 段（数据色档只有 ' + STACKED_BAR_SERIES + ' 档，再多必然重色；尾巴请调用方并成「其他」）');
  }
  return value.map((item, i) => {
    assertPlainObject(item, 'stacked-bar: input.segments[' + i + ']');
    const seg = item as Record<string, unknown>;
    const one = reqFinite(seg.value, 'stacked-bar: input.segments[' + i + '].value');
    if (one <= 0) {
      badInput('stacked-bar: input.segments[' + i + '].value 必须大于 0（零段看不见，也不该占一格图例）');
    }
    return { name: reqText(seg.name, 'stacked-bar: input.segments[' + i + '].name'), value: one };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `StackedBarModel`，不再自己碰 `any`。 */
export function normalizeStackedBar(input: unknown): StackedBarModel {
  assertPlainObject(input, 'renderStackedBar: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? STACKED_BAR_FORMS[0] : raw.form;
  if (!(STACKED_BAR_FORMS as readonly unknown[]).includes(form)) {
    badInput('stacked-bar: input.form 必须是 ' + STACKED_BAR_FORMS.join('／')
      + ' 之一（本件只落地形态 A「100% 堆叠 ＋ 图例」）');
  }

  const segments = reqSegments(raw.segments);
  const sum = segments.reduce((acc, seg) => acc + seg.value, 0);

  let used = 0;
  const built: StackedBarSegmentModel[] = segments.map((seg, i) => {
    const pct = Math.round((seg.value / sum) * 1000) / 10;
    /* 段宽走千分比整数：末段吃下舍入余数 ⇒ 各段之和恰好 1000，条永远填满整宽。 */
    const flex = i === segments.length - 1 ? 1000 - used : Math.round((seg.value / sum) * 1000);
    used += flex;
    const labelKind: StackedBarLabelKind = pct >= STACKED_BAR_NAME_MIN_PCT ? 'name'
      : pct >= STACKED_BAR_VALUE_MIN_PCT ? 'value' : 'none';
    const pctText = fmtPct(pct) + '%';
    return {
      name: seg.name,
      value: seg.value,
      valueText: fmtQty(seg.value),
      pct,
      pctText,
      flex,
      series: i + 1,
      labelKind,
      label: labelKind === 'name' ? seg.name + ' ' + pctText : labelKind === 'value' ? pctText : '',
    };
  });

  const title = reqText(raw.title, 'stacked-bar: input.title');
  return {
    form: form as StackedBarForm,
    title,
    stamp: optText(raw.stamp, 'stacked-bar: input.stamp'),
    unit: optText(raw.unit, 'stacked-bar: input.unit'),
    segments: built,
    note: optText(raw.note, 'stacked-bar: input.note'),
    ariaLabel: title + '：' + built.map((s) => s.name + ' ' + s.pctText).join('、'),
    extraClass: optExtraClass(raw.extraClass, 'stacked-bar: input.extraClass'),
  };
}
