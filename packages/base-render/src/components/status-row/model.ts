/** status-row · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与组件层其余件同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：猜出来的台账会在页面上
 *      长成另一种东西，而调用方以为拿到了本件；
 *   2. **"没给"与"给了空串"是两件事**：可选串给空串＝按"未给"处理（与区块层同口径）；
 *   3. 归一化只做**形状**：金额换算、计数、日期格式**归调用方**（本件只收"已经是给人看的样子"的串）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  STATUS_ROW_FORMS,
  STATUS_ROW_TONES,
  type StatusRowForm,
  type StatusRowItem,
  type StatusRowTone,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成"不给"或空数组）。 */
export interface StatusRowModel {
  readonly form: StatusRowForm;
  readonly heading?: string;
  readonly count?: string;
  readonly rows: readonly NormalizedStatusRow[];
  readonly absentLine?: string;
  readonly foot: readonly string[];
  readonly extraClass?: string;
}

export interface NormalizedStatusRow {
  readonly name: string;
  readonly phase: string;
  readonly tone: StatusRowTone;
  readonly amount?: string;
  readonly amountUnit?: string;
  readonly meta: readonly string[];
  readonly due?: string;
  readonly dueNote?: string;
  readonly dueTone: StatusRowTone;
}

/** 串或串数组 → 段数组（`''` 与 `[]` 都按"不出这一段"处理）。 */
function textList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], field + '[' + i + ']'));
  return out;
}

/** 档位：缺省 `neutral`；闭集外的值一律拒（**不静默降级成 neutral**——那会让"逾期"看着像"待办"）。 */
function toneOf(value: unknown, field: string, fallback: StatusRowTone): StatusRowTone {
  if (value === undefined) return fallback;
  if (!(STATUS_ROW_TONES as readonly unknown[]).includes(value)) {
    badInput(field + ' 必须是 ' + STATUS_ROW_TONES.join('／') + ' 之一，收到：' + String(value));
  }
  return value as StatusRowTone;
}

/** 一行：`name`／`phase` 必填（状态必须带字），其余逐项校验。 */
function rowOf(raw: unknown, field: string): NormalizedStatusRow {
  assertPlainObject(raw, field);
  const item = raw as StatusRowItem;
  const tone = toneOf(item.tone, field + '.tone', 'neutral');
  const due = optText(item.due, field + '.due');
  const dueNote = optText(item.dueNote, field + '.dueNote');
  if (dueNote !== undefined && due === undefined) {
    badInput(field + '.dueNote 是那一天的注脚，必须同时给 ' + field + '.due');
  }
  return {
    name: reqText(item.name, field + '.name'),
    phase: reqText(item.phase, field + '.phase'),
    tone,
    amount: optText(item.amount, field + '.amount'),
    amountUnit: optText(item.amountUnit, field + '.amountUnit'),
    meta: textList(item.meta, field + '.meta'),
    due,
    dueNote,
    dueTone: toneOf(item.dueTone, field + '.dueTone', tone),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `StatusRowModel`，不再自己碰 `any`。 */
export function normalizeStatusRows(input: unknown): StatusRowModel {
  assertPlainObject(input, 'renderStatusRows: input');
  const raw = input as Record<string, unknown>;
  const form = raw.form === undefined ? STATUS_ROW_FORMS[0] : raw.form;
  if (!(STATUS_ROW_FORMS as readonly unknown[]).includes(form)) {
    badInput('status-row: input.form 必须是 ' + STATUS_ROW_FORMS.join('／') + ' 之一（本件只落地形态 A「单行台账」）');
  }
  if (!Array.isArray(raw.rows)) badInput('status-row: input.rows 必须是数组');
  const rows: NormalizedStatusRow[] = [];
  for (let i = 0; i < raw.rows.length; i += 1) rows.push(rowOf(raw.rows[i], 'status-row: input.rows[' + i + ']'));
  return {
    form: form as StatusRowForm,
    heading: optText(raw.heading, 'status-row: input.heading'),
    count: optText(raw.count, 'status-row: input.count'),
    rows,
    absentLine: optText(raw.absentLine, 'status-row: input.absentLine'),
    foot: textList(raw.foot, 'status-row: input.foot'),
    extraClass: optExtraClass(raw.extraClass, 'status-row: input.extraClass'),
  };
}
