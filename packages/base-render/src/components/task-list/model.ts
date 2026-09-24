/** task-list · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **两条本件特有的不变量**：
 *      · `disabled` 的行**必须**给 `note`（"为什么不许勾"要写在行上，不留含糊的禁用）；
 *      · 同一张清单里 `key` 不许重复（重复键会让运行时分不清勾的是哪一条）；
 *   3. 归组是**显示**（按各行的 `group` 现分），不做业务判断；数也是现数（`done / total`）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  TASK_LIST_DEFAULT_KEY,
  TASK_LIST_FORMS,
  type TaskListForm,
  type TaskListRow,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface TaskListModel {
  readonly form: TaskListForm;
  readonly key: string;
  readonly title?: string;
  readonly progressLabel?: string;
  readonly progressUnit?: string;
  readonly rows: readonly NormalizedTaskRow[];
  readonly groups: readonly TaskGroupModel[];
  readonly absentLine?: string;
  readonly foot: readonly string[];
  readonly busy: boolean;
  readonly extraClass?: string;
}

export interface NormalizedTaskRow {
  readonly key: string;
  readonly label: string;
  readonly group?: string;
  readonly note?: string;
  readonly amount?: string;
  readonly done: boolean;
  readonly disabled: boolean;
  readonly error?: string;
}

/** 一组：`title` 缺省＝无组那一档（不出组头）。 */
export interface TaskGroupModel {
  readonly title: string;
  readonly rows: readonly NormalizedTaskRow[];
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

/** 一行：`key`／`label` 必填；`disabled` 必须带 `note`（说明为什么）。 */
function rowOf(raw: unknown, field: string): NormalizedTaskRow {
  assertPlainObject(raw, field);
  const item = raw as TaskListRow;
  const note = optText(item.note, field + '.note');
  const disabled = optFlag(item.disabled, field + '.disabled', false);
  if (disabled && note === undefined) {
    badInput(field + '.disabled 为真时必须给 ' + field + '.note：禁用要写清为什么（含糊地禁掉是不许留的中间档）');
  }
  return {
    key: reqText(item.key, field + '.key'),
    label: reqText(item.label, field + '.label'),
    group: optText(item.group, field + '.group'),
    note,
    amount: optText(item.amount, field + '.amount'),
    done: optFlag(item.done, field + '.done', false),
    disabled,
    error: optText(item.error, field + '.error'),
  };
}

/** 按 `group` 现分（**首次出现的顺序**就是组的顺序；无组的行成一组、`title` 为空 ⇒ 不出组头）。 */
function groupOf(rows: readonly NormalizedTaskRow[]): readonly TaskGroupModel[] {
  const out: TaskGroupModel[] = [];
  const byTitle = new Map<string, NormalizedTaskRow[]>();
  for (const row of rows) {
    const title = row.group === undefined ? '' : row.group;
    const bag = byTitle.get(title);
    if (bag === undefined) { byTitle.set(title, [row]); out.push({ title, rows: byTitle.get(title) as NormalizedTaskRow[] }); } else bag.push(row);
  }
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `TaskListModel`，不再自己碰 `any`。 */
export function normalizeTaskList(input: unknown): TaskListModel {
  assertPlainObject(input, 'renderTaskList: input');
  const raw = input as Record<string, unknown>;
  const form = raw.form === undefined ? TASK_LIST_FORMS[0] : raw.form;
  if (!(TASK_LIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('task-list: input.form 必须是 ' + TASK_LIST_FORMS.join('／') + ' 之一（本件只落地形态 A「纯勾选 ＋ 组内进度」）');
  }
  if (!Array.isArray(raw.rows)) badInput('task-list: input.rows 必须是数组');
  const rows: NormalizedTaskRow[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.rows.length; i += 1) {
    const row = rowOf(raw.rows[i], 'task-list: input.rows[' + i + ']');
    if (seen.has(row.key)) badInput('task-list: input.rows[' + i + '].key 与前面重复：' + row.key);
    seen.add(row.key);
    rows.push(row);
  }
  const key = optText(raw.key, 'task-list: input.key');
  const foot = textList(raw.foot, 'task-list: input.foot');
  return {
    form: form as TaskListForm,
    key: key === undefined ? TASK_LIST_DEFAULT_KEY : key,
    title: optText(raw.title, 'task-list: input.title'),
    progressLabel: optText(raw.progressLabel, 'task-list: input.progressLabel'),
    progressUnit: optText(raw.progressUnit, 'task-list: input.progressUnit'),
    rows,
    groups: groupOf(rows),
    absentLine: optText(raw.absentLine, 'task-list: input.absentLine'),
    foot,
    busy: optFlag(raw.busy, 'task-list: input.busy', false),
    extraClass: optExtraClass(raw.extraClass, 'task-list: input.extraClass'),
  };
}
