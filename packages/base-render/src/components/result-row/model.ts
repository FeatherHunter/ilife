/** resultRow · **入参归一化与校验**（非法入参一律 `bad-input`，不静默降级）。 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { RESULT_DEFAULTS, RESULT_FORMS } from './attrs.js';
import type { ResultRowForm, ResultRowItemInput } from './attrs.js';

export interface ResultItem {
  readonly title: string;
  readonly highlights: readonly string[];
  readonly subtitle: string | undefined;
  readonly tags: readonly string[];
  readonly value: string | undefined;
  readonly valueLabel: string | undefined;
  readonly thumb: string | undefined;
  readonly extraClass: string | undefined;
}

export interface ResultRowModel {
  readonly form: ResultRowForm;
  readonly name: string | undefined;
  readonly label: string | undefined;
  readonly items: readonly ResultItem[];
  readonly emptyText: string;
  readonly extraClass: string | undefined;
}

/** 字符串数组（逐项非空串；空数组＝没给）。 */
function textList(raw: unknown, field: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) badInput(field + ' 必须是数组');
  const out: string[] = [];
  for (const v of raw as unknown[]) {
    if (typeof v !== 'string' || v === '') badInput(field + ' 的每一项必须是非空字符串');
    out.push(v);
  }
  return out;
}

function normalizeItem(raw: unknown, at: number): ResultItem {
  assertPlainObject(raw, 'renderResultRow: items[' + at + ']');
  const o = raw as ResultRowItemInput;
  const title = reqText(o.title, 'renderResultRow: items[' + at + '].title');
  const thumb = optText(o.thumb, 'renderResultRow: items[' + at + '].thumb');
  const value = optText(o.value, 'renderResultRow: items[' + at + '].value');
  return Object.freeze({
    title,
    highlights: Object.freeze(textList(o.highlights, 'renderResultRow: items[' + at + '].highlights')),
    subtitle: optText(o.subtitle, 'renderResultRow: items[' + at + '].subtitle'),
    tags: Object.freeze(textList(o.tags, 'renderResultRow: items[' + at + '].tags')),
    value,
    valueLabel: optText(o.valueLabel, 'renderResultRow: items[' + at + '].valueLabel'),
    thumb,
    extraClass: optExtraClass(o.extraClass, 'renderResultRow: items[' + at + '].extraClass'),
  });
}

/** 归一 ＋ 校验。 */
export function normalizeResultRow(raw: unknown): ResultRowModel {
  assertPlainObject(raw, 'renderResultRow: input');
  const input = raw as ResultRowInputShape;
  if (input.form !== undefined && !(RESULT_FORMS as readonly string[]).includes(String(input.form))) {
    badInput('renderResultRow: 形态闭集只有 ' + RESULT_FORMS.join('／') + '：' + String(input.form));
  }
  if (!Array.isArray(input.items)) badInput('renderResultRow: input.items 必须是数组（可以是空数组）');
  const items = (input.items as unknown[]).map((it, i) => normalizeItem(it, i));
  return Object.freeze({
    form: 'A' as ResultRowForm,
    name: optText(input.name, 'renderResultRow: input.name'),
    label: optText(input.label, 'renderResultRow: input.label'),
    items: Object.freeze(items),
    emptyText: optText(input.emptyText, 'renderResultRow: input.emptyText') ?? RESULT_DEFAULTS.emptyText,
    extraClass: optExtraClass(input.extraClass, 'renderResultRow: input.extraClass'),
  });
}

interface ResultRowInputShape {
  readonly form?: unknown;
  readonly name?: unknown;
  readonly label?: unknown;
  readonly items?: unknown;
  readonly emptyText?: unknown;
  readonly extraClass?: unknown;
}
