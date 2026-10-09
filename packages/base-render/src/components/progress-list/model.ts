/** progress-list · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. **缺值与空串是两件事**：`current: null` ＝ 未记录（写成 `—`）；给非有限数 ＝ 错；
 *   3. **算得出来的都不许调用方再给**：「还差多少」那句、条的比例、状态字三样都是本件算的
 *      （不给才轮到调用方覆盖），免得同一个事实在调用点与本件各写一遍。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PROGRESS_LIST_EXACT_WORD,
  PROGRESS_LIST_FORMS,
  PROGRESS_LIST_MISSING,
  PROGRESS_LIST_OVER_WORD,
  PROGRESS_LIST_REMAIN_WORD,
  PROGRESS_LIST_STATE_WORDS,
  PROGRESS_LIST_TONES,
  type ProgressListForm,
  type ProgressListRow,
  type ProgressListState,
  type ProgressListTone,
} from './attrs.js';

/** 归一化后的一行：每个字段都已校验，算得出来的（比例／状态字／还差多少）已经算好。 */
export interface ProgressListRowModel {
  readonly label: string;
  readonly valueText: string;
  readonly goalText: string;
  readonly unit?: string;
  readonly state: ProgressListState;
  readonly stateWord: string;
  readonly tone: ProgressListTone;
  /** 条填充的宽度百分比（**已夹在 0..100**）；未记录时是 0。 */
  readonly fillPct: number;
  /** 真实进度百分比（**不夹**，可以 > 100；未记录时不出）。 */
  readonly pct: number | null;
  /** 「还差多少」那句；未记录时 `undefined`（没有数就没什么可差的）。 */
  readonly remain?: string;
  /** `aria-valuetext` 那句（屏幕阅读器读的「当前 / 目标 单位」）。 */
  readonly ariaText: string;
}

/** 归一化后的入参。 */
export interface ProgressListModel {
  readonly form: ProgressListForm;
  readonly heading?: string;
  readonly rows: readonly ProgressListRowModel[];
  readonly note: readonly string[];
  readonly emptyLine?: string;
  readonly extraClass?: string;
}

/** 千分位（自算、不依赖 locale：同一入参在任何机器上排一样，判据才断得准）。 */
function groupThousands(s: string): string {
  const dot = s.indexOf('.');
  const int = dot < 0 ? s : s.slice(0, dot);
  const frac = dot < 0 ? '' : s.slice(dot);
  const sign = int.startsWith('-') ? '-' : '';
  const digits = sign === '' ? int : int.slice(1);
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) parts.unshift(digits.slice(Math.max(0, i - 3), i));
  return sign + parts.join(',') + frac;
}

/** 机器数 → 屏上的字：最多两位小数、去掉尾随 0、千分位。
 *  `1,189`／`68.4`／`66`／`−2.4`（负号用 ASCII `-`：数字串只做展示，不做运算输入）。 */
export function formatProgressNumber(value: number): string {
  if (!Number.isFinite(value)) badInput('progress-list: 要排的数字必须是有限数');
  const abs = Math.abs(value);
  const fixed = (Math.round(abs * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return (value < 0 ? '-' : '') + groupThousands(fixed);
}

/** 有限数（必填）。 */
function reqNum(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数字');
  return value;
}

/** 有限数或 `null`（`null` ＝ 未记录）。 */
function optNumOrNull(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (value === undefined) badInput(field + ' 必填（未记录请显式给 null）');
  return reqNum(value, field);
}

/** 一行：校验 ＋ 算比例、状态、状态字、还差多少。 */
function rowModel(value: unknown, index: number): ProgressListRowModel {
  assertPlainObject(value, 'progress-list: input.rows[' + index + ']');
  const raw = value as ProgressListRow;
  const label = reqText(raw.label, 'progress-list: input.rows[' + index + '].label');
  const goal = reqNum(raw.goal, 'progress-list: input.rows[' + index + '].goal');
  if (goal <= 0) badInput('progress-list: input.rows[' + index + '].goal 必须 > 0（分母为 0 算不出比例）');
  const current = optNumOrNull(raw.current, 'progress-list: input.rows[' + index + '].current');
  const unit = optText(raw.unit, 'progress-list: input.rows[' + index + '].unit');

  let state: ProgressListState;
  if (current === null) state = 'blank';
  else if (current > goal) state = 'over';
  else if (current >= goal) state = 'done';
  else state = 'on-track';

  const stateWord = optText(raw.state, 'progress-list: input.rows[' + index + '].state')
    ?? PROGRESS_LIST_STATE_WORDS[state];

  const toneGiven = raw.tone;
  if (toneGiven !== undefined && !(PROGRESS_LIST_TONES as readonly unknown[]).includes(toneGiven)) {
    badInput('progress-list: input.rows[' + index + '].tone 必须是 ' + PROGRESS_LIST_TONES.join('／') + ' 之一');
  }
  const tone: ProgressListTone = toneGiven !== undefined
    ? (toneGiven as ProgressListTone)
    : (state === 'done' ? 'ok' : (state === 'over' ? 'warn' : 'none'));

  const pct = current === null ? null : Math.round((current / goal) * 1000) / 10;
  const fillPct = pct === null ? 0 : Math.min(100, Math.max(0, pct));

  const valueText = current === null
    ? PROGRESS_LIST_MISSING
    : (optText(raw.display, 'progress-list: input.rows[' + index + '].display') ?? formatProgressNumber(current));
  const goalText = optText(raw.goalDisplay, 'progress-list: input.rows[' + index + '].goalDisplay')
    ?? formatProgressNumber(goal);
  const unitTail = unit === undefined ? '' : ' ' + unit;
  const ariaText = valueText + ' / ' + goalText + unitTail;

  let remain = optText(raw.remainText, 'progress-list: input.rows[' + index + '].remainText');
  if (remain === undefined && current !== null) {
    if (state === 'done') remain = PROGRESS_LIST_EXACT_WORD;
    else if (state === 'over') remain = PROGRESS_LIST_OVER_WORD + ' ' + formatProgressNumber(current - goal) + unitTail;
    else remain = PROGRESS_LIST_REMAIN_WORD + ' ' + formatProgressNumber(goal - current) + unitTail;
  }

  return { label, valueText, goalText, unit, state, stateWord, tone, fillPct, pct, remain, ariaText };
}

/** 串或串数组 → 段数组（与 `page-head` 同口径：`''` 与 `[]` 都按「不出这一行」处理）。 */
function textList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const one = optText(value[i], field + '[' + i + ']');
    if (one !== undefined) out.push(one);
  }
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ProgressListModel`，不再自己碰 `any`。 */
export function normalizeProgressList(input: unknown): ProgressListModel {
  assertPlainObject(input, 'renderProgressList: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PROGRESS_LIST_FORMS[0] : raw.form;
  if (!(PROGRESS_LIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('progress-list: input.form 必须是 ' + PROGRESS_LIST_FORMS.join('／') + ' 之一（本件只落地形态 A「四行清单」）');
  }

  const rowsGiven: unknown = raw.rows;
  if (!Array.isArray(rowsGiven)) badInput('progress-list: input.rows 必须是数组');
  const rows = rowsGiven.map((r, i) => rowModel(r, i));

  return {
    form: form as ProgressListForm,
    heading: optText(raw.heading, 'progress-list: input.heading'),
    rows,
    note: textList(raw.note, 'progress-list: input.note'),
    emptyLine: optText(raw.emptyLine, 'progress-list: input.emptyLine'),
    extraClass: optExtraClass(raw.extraClass, 'progress-list: input.extraClass'),
  };
}
