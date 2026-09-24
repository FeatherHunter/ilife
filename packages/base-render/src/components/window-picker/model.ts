/** windowPicker · **入参归一化与校验**（非法入参一律 `bad-input`）。
 *
 *  日期一律 `YYYY-MM-DD` 且**真实存在**：`2026-02-31` 会被 `Date` 静默滚成 3 月 3 日，
 *  回读比对才拦得住（窗口口径错一天，整页读数就是另一批）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { WINDOW_CUSTOM, WINDOW_DEFAULTS, WINDOW_FORMS } from './attrs.js';
import type { WindowPickerForm, WindowPresetInput } from './attrs.js';

export interface WindowPreset {
  readonly value: string;
  readonly label: string;
  /** 「最近 N 天（到今天）」的 N；固定起止时为 `undefined`。 */
  readonly days: number | undefined;
  readonly from: string | undefined;
  readonly to: string | undefined;
}

export interface WindowPickerModel {
  readonly form: WindowPickerForm;
  readonly name: string;
  readonly label: string;
  readonly presets: readonly WindowPreset[];
  readonly preset: string;
  readonly from: string | undefined;
  readonly to: string | undefined;
  readonly today: string | undefined;
  readonly loadingText: string;
  readonly error: string | undefined;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly extraClass: string | undefined;
}

/** ISO 日期（`YYYY-MM-DD`）且**真实存在**。 */
export function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** ISO 日期 ± N 天（返回 ISO；只做整日加减，UTC 计算，不受时区与夏令时影响）。 */
export function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 两个 ISO 日期之间的**含头含尾**天数（今天到今天 ＝ 1 天）。 */
export function isoDayCount(from: string, to: string): number {
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(to + 'T00:00:00Z');
  return Math.round((b - a) / 86400000) + 1;
}

function isoDate(raw: unknown, field: string): string {
  const v = reqText(raw, field);
  if (!isIsoDate(v)) badInput(field + ' 必须是真实存在的 YYYY-MM-DD：' + v);
  return v;
}

function normalizePreset(raw: unknown, at: number): WindowPreset {
  if (typeof raw === 'string') {
    if (raw === '') badInput('renderWindowPicker: presets[' + at + '] 不得为空串');
    if (raw === WINDOW_CUSTOM) return { value: raw, label: '自定义', days: undefined, from: undefined, to: undefined };
    badInput('renderWindowPicker: presets[' + at + '] 若是字符串只许「' + WINDOW_CUSTOM + '」（要天数请给对象）');
  }
  assertPlainObject(raw, 'renderWindowPicker: presets[' + at + ']');
  const o = raw as WindowPresetInput;
  const value = reqText(o.value, 'renderWindowPicker: presets[' + at + '].value');
  const label = reqText(o.label, 'renderWindowPicker: presets[' + at + '].label');
  const hasDays = o.days !== undefined;
  const hasRange = o.from !== undefined || o.to !== undefined;
  if (hasDays && hasRange) {
    badInput('renderWindowPicker: presets[' + at + '] 的 days 与 from／to 只能给一个');
  }
  if (hasDays) {
    if (typeof o.days !== 'number' || !Number.isFinite(o.days) || o.days < 1 || Math.floor(o.days) !== o.days) {
      badInput('renderWindowPicker: presets[' + at + '].days 必须是 ≥1 的整数');
    }
    return { value, label, days: o.days, from: undefined, to: undefined };
  }
  /* 「自定义」档本来就没有固定的天数或起止（起止由用户手填）——它不该被「要么给 days、要么给起止」拦住。 */
  if (value === WINDOW_CUSTOM && !hasRange) {
    return { value, label, days: undefined, from: undefined, to: undefined };
  }
  if (hasRange) {
    if (o.from === undefined || o.to === undefined) {
      badInput('renderWindowPicker: presets[' + at + '] 的 from／to 必须成对给');
    }
    const from = isoDate(o.from, 'renderWindowPicker: presets[' + at + '].from');
    const to = isoDate(o.to, 'renderWindowPicker: presets[' + at + '].to');
    if (from > to) badInput('renderWindowPicker: presets[' + at + '] 的 from 不得晚于 to');
    return { value, label, days: undefined, from, to };
  }
  badInput('renderWindowPicker: presets[' + at + '] 要么给 days，要么给 from／to');
}

/** 归一 ＋ 校验。 */
export function normalizeWindowPicker(raw: unknown): WindowPickerModel {
  assertPlainObject(raw, 'renderWindowPicker: input');
  const input = raw as WindowPickerInputShape;
  const name = reqText(input.name, 'renderWindowPicker: input.name');
  if (input.form !== undefined && !(WINDOW_FORMS as readonly string[]).includes(String(input.form))) {
    badInput('renderWindowPicker: 形态闭集只有 ' + WINDOW_FORMS.join('／') + '：' + String(input.form));
  }

  const rawPresets: unknown = input.presets;
  if (rawPresets !== undefined && !Array.isArray(rawPresets)) {
    badInput('renderWindowPicker: input.presets 必须是数组');
  }
  const presets: WindowPreset[] = (Array.isArray(rawPresets) ? rawPresets : [...WINDOW_DEFAULTS.presets])
    .map((p, i) => normalizePreset(p, i));
  if (presets.length === 0) badInput('renderWindowPicker: presets 不得为空数组（至少一档）');
  const known = new Set<string>();
  for (const p of presets) {
    if (known.has(p.value)) badInput('renderWindowPicker: presets 的机器值重复：' + p.value);
    known.add(p.value);
  }
  if (!known.has(WINDOW_CUSTOM)) {
    /* `custom` 档是内置的：起止被手改时要有一档能落。没有它的话「手改起止」无处安放。 */
    presets.push({ value: WINDOW_CUSTOM, label: '自定义', days: undefined, from: undefined, to: undefined });
    known.add(WINDOW_CUSTOM);
  }

  const presetRaw = optText(input.preset, 'renderWindowPicker: input.preset');
  const fromRaw = input.from === undefined ? undefined : isoDate(input.from, 'renderWindowPicker: input.from');
  const toRaw = input.to === undefined ? undefined : isoDate(input.to, 'renderWindowPicker: input.to');
  if ((fromRaw === undefined) !== (toRaw === undefined)) {
    badInput('renderWindowPicker: input.from 与 input.to 必须成对给（半个窗口读不出天数）');
  }
  if (fromRaw !== undefined && toRaw !== undefined && fromRaw > toRaw) {
    badInput('renderWindowPicker: input.from 不得晚于 input.to（' + fromRaw + ' > ' + toRaw + '）');
  }
  const today = input.today === undefined ? undefined : isoDate(input.today, 'renderWindowPicker: input.today');

  /* 初始档的三条口径（顺序即优先级）：
     ① 给了起止 → 用起止；没给 preset 就落到「自定义」（起止被手改时就是要这一档）；
     ② 只给了今天 → 按初始档的天数从今天往回推；
     ③ 都没有 → 起止留空（渲染 `—`，运行时按浏览器当天算）——窗口由运行时补上，不是编一个。 */
  const preset = presetRaw ?? (fromRaw !== undefined ? WINDOW_CUSTOM : presets[0]!.value);
  if (!known.has(preset)) badInput('renderWindowPicker: input.preset 不在 presets 里：' + preset);
  let from = fromRaw;
  let to = toRaw;
  if (from === undefined && today !== undefined) {
    const p = presets.find((x) => x.value === preset);
    if (p !== undefined && p.days !== undefined) {
      to = today;
      from = shiftIso(today, -(p.days - 1));
    } else if (p !== undefined && p.from !== undefined && p.to !== undefined) {
      from = p.from;
      to = p.to;
    }
  }
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    badInput('renderWindowPicker: input.disabled 必须是布尔');
  }
  if (input.loading !== undefined && typeof input.loading !== 'boolean') {
    badInput('renderWindowPicker: input.loading 必须是布尔');
  }

  return Object.freeze({
    form: 'A' as WindowPickerForm,
    name,
    label: optText(input.label, 'renderWindowPicker: input.label') ?? WINDOW_DEFAULTS.label,
    presets: Object.freeze(presets),
    preset,
    from,
    to,
    today,
    loadingText: optText(input.loadingText, 'renderWindowPicker: input.loadingText') ?? WINDOW_DEFAULTS.loadingText,
    error: optText(input.error, 'renderWindowPicker: input.error'),
    loading: input.loading === true,
    disabled: input.disabled === true,
    extraClass: optExtraClass(input.extraClass, 'renderWindowPicker: input.extraClass'),
  });
}

interface WindowPickerInputShape {
  readonly form?: unknown;
  readonly name?: unknown;
  readonly label?: unknown;
  readonly presets?: unknown;
  readonly preset?: unknown;
  readonly from?: unknown;
  readonly to?: unknown;
  readonly today?: unknown;
  readonly loadingText?: unknown;
  readonly error?: unknown;
  readonly loading?: unknown;
  readonly disabled?: unknown;
  readonly extraClass?: unknown;
}
