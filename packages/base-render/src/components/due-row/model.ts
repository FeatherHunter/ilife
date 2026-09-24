/** due-row · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：档位给错若不报，
 *      "已过期"会被画成"正常"，读者会漏掉那一件；
 *   2. **两条本件特有的不变量**：禁用的动作**必须**给 `note`（为什么不许按要写在按钮旁）；
 *      同一页里行键不许重复（重复键会让页面对不上是哪一件）；
 *   3. 归一化只做**形状**：还剩几天、日期格式**归调用方**（本件不读日历、不换算）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DUE_ROW_FORMS,
  DUE_ROW_TONES,
  type DueRowAction,
  type DueRowForm,
  type DueRowItem,
  type DueRowTone,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface DueRowModel {
  readonly form: DueRowForm;
  readonly heading?: string;
  readonly count?: string;
  readonly rows: readonly NormalizedDueRow[];
  readonly absentLine?: string;
  readonly foot: readonly string[];
  readonly extraClass?: string;
}

export interface NormalizedDueRow {
  readonly key: string;
  readonly name: string;
  readonly tone: DueRowTone;
  readonly tag: string;
  readonly countdown: string;
  readonly countdownLabel?: string;
  readonly countUnit?: string;
  readonly due?: string;
  readonly meta: readonly string[];
  readonly note?: string;
  readonly action?: NormalizedDueAction;
  readonly error?: string;
}

export interface NormalizedDueAction {
  readonly key: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly note?: string;
  readonly loading: boolean;
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

/** 可选布尔：给了必须是布尔（`'1'`／1 这类"看着像"的一律拒）。 */
function optFlag(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

function actionOf(raw: unknown, field: string): NormalizedDueAction {
  assertPlainObject(raw, field);
  const action = raw as DueRowAction;
  const disabled = optFlag(action.disabled, field + '.disabled', false);
  const note = optText(action.note, field + '.note');
  if (disabled && note === undefined) {
    badInput(field + '.disabled 为真时必须给 ' + field + '.note：禁用要写清为什么（含糊地禁掉是不许留的中间档）');
  }
  return {
    key: reqText(action.key, field + '.key'),
    label: reqText(action.label, field + '.label'),
    disabled,
    note,
    loading: optFlag(action.loading, field + '.loading', false),
  };
}

function rowOf(raw: unknown, field: string): NormalizedDueRow {
  assertPlainObject(raw, field);
  const row = raw as DueRowItem;
  if (!(DUE_ROW_TONES as readonly unknown[]).includes(row.tone)) {
    badInput(field + '.tone 必须是 ' + DUE_ROW_TONES.join('／') + ' 之一（正常／临近／已过期），收到：' + String(row.tone));
  }
  return {
    key: reqText(row.key, field + '.key'),
    name: reqText(row.name, field + '.name'),
    tone: row.tone as DueRowTone,
    tag: reqText(row.tag, field + '.tag'),
    countdown: reqText(row.countdown, field + '.countdown'),
    countdownLabel: optText(row.countdownLabel, field + '.countdownLabel'),
    countUnit: optText(row.countUnit, field + '.countUnit'),
    due: optText(row.due, field + '.due'),
    meta: textList(row.meta, field + '.meta'),
    note: optText(row.note, field + '.note'),
    action: row.action === undefined ? undefined : actionOf(row.action, field + '.action'),
    error: optText(row.error, field + '.error'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `DueRowModel`，不再自己碰 `any`。 */
export function normalizeDueRows(input: unknown): DueRowModel {
  assertPlainObject(input, 'renderDueRows: input');
  const raw = input as Record<string, unknown>;
  const form = raw.form === undefined ? DUE_ROW_FORMS[0] : raw.form;
  if (!(DUE_ROW_FORMS as readonly unknown[]).includes(form)) {
    badInput('due-row: input.form 必须是 ' + DUE_ROW_FORMS.join('／') + ' 之一（本件只落地形态 B「倒计时放大 ＋ 动作」）');
  }
  if (!Array.isArray(raw.rows)) badInput('due-row: input.rows 必须是数组');
  const rows: NormalizedDueRow[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.rows.length; i += 1) {
    const row = rowOf(raw.rows[i], 'due-row: input.rows[' + i + ']');
    if (seen.has(row.key)) badInput('due-row: input.rows[' + i + '].key 与前面重复：' + row.key);
    seen.add(row.key);
    rows.push(row);
  }
  return {
    form: form as DueRowForm,
    heading: optText(raw.heading, 'due-row: input.heading'),
    count: optText(raw.count, 'due-row: input.count'),
    rows,
    absentLine: optText(raw.absentLine, 'due-row: input.absentLine'),
    foot: textList(raw.foot, 'due-row: input.foot'),
    extraClass: optExtraClass(raw.extraClass, 'due-row: input.extraClass'),
  };
}
